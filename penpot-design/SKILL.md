---
name: penpot-design
description: Design in Penpot through the Penpot MCP (execute_code / export_shape) — app and web screens, mockups, wireframes, dashboards, UI kits, design systems, components, colour and typography styles, light/dark themes and design tokens. Loads a pre-debugged helper library and a 70-icon set so shapes, text and icons render correctly the first time, and carries the API traps that silently break designs or hang the plugin. Use it whenever the user wants anything created, revised, themed, componentized, tokenized or inspected in Penpot, and whenever they ask to design a screen, app, layout or design system while the Penpot MCP is connected, even if they never say "Penpot". Not for designs built as HTML/CSS/React code or artifacts.
---

# Designing in Penpot through the MCP

The Penpot MCP gives you one lever, `execute_code` (Plugin-API JavaScript running inside the
user's open file), and one pair of eyes, `export_shape`. Every shape is code, and the API fails
quietly: text that exports invisible, icons with phantom boxes, tokens that discard alpha, a call
that hangs the plugin until the user reconnects it. This skill carries a tested helper library and
the working method that avoids those failures, so the effort goes into the design itself.

## Start of a session

1. Read the MCP's `high_level_overview` once (the server asks for it; it's the API primer).
2. Look before you touch:
   ```js
   return { pages: penpotUtils.getPages(), current: penpot.currentPage.name,
            boards: penpot.currentPage.root.children.map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, w: c.width, h: c.height })),
            helpers: !!storage.h, icons: storage.I ? Object.keys(storage.I).length : 0, bulk: !!storage.bulk };
   ```
3. If `helpers` is false, read `scripts/bootstrap.js` and pass its **entire contents, unmodified**,
   as the `code` of one `execute_code` call. Do the same with `references/icons.js` before drawing
   UI, and `scripts/bulk.js` before cloning, recolouring, linking typographies or applying tokens.
   They live in `storage`, which survives across calls and page switches but **not reliably a
   plugin reconnect** (one reconnect kept it, another wiped it). Re-check `storage.h` at the start
   of every session and after any hang.
4. Pick the typeface: `storage.cfg.font = "Plus Jakarta Sans"` (default `Inter`; the bootstrap's
   return value lists the weights the font has).

Put new work to the right of the existing boards, never on top of them, and don't modify the
user's existing boards unless that's the task.

You can only modify the page that is **active in the Penpot UI**, and the user can switch pages
at any moment. A call that fails with `Cannot modify a page that is not currently active` needs
`await penpot.openPage(pageId)` at the top of the same call that mutates. `penpot.createPage()`
does not switch to the new page by itself.

### Using Penpot Workspace URLs
When the user shares a Penpot URL (e.g. `http://.../#/workspace?page-id=...&board-id=...`):
- Extract `page-id` to immediately switch with `await penpot.openPage(pageId)`.
- Extract `board-id` to locate the reference shape/board directly instead of scanning the full page tree.
- Extract `file-id` and `team-id` to verify workspace context.

## Helper API

`const h = storage.h;` at the top of each call. Coordinates are **absolute page coordinates**;
`parent` may be `null` for the page root.

| Call | Notes |
|---|---|
| `h.board(parent, x, y, w, h, o)` | `o`: `fill`, `fillOpacity`, `gradient`, `stroke`, `strokeOpacity`, `strokeWidth`, `radius`, `shadows`, `blur`, `opacity`, `clip`, `name`. **No fill unless given.** |
| `h.rect(...)`, `h.ellipse(...)` | Same options. |
| `h.txt(parent, x, y, "Text", o)` | `o`: `size`, `weight`, `color`, `opacity`, `family`, `lh`, `ls`, `align`, `transform`, `w`, `name`. No `w`: one line, auto-width. With `w`: wraps, auto-height. |
| `h.icon(parent, x, y, size, "bell", color, { sw })` | Name from `storage.I` (70 icons, see `references/icons.js`) or a raw paths array. Stroke defaults to `size / 13` px. |
| `h.grad(stops, from, to)`, `h.shadow(blur, y, opacity, o)` | Values for `gradient:` / `shadows:`. |
| `h.mix(fg, bg, alpha)` | Flatten a translucent colour onto its backdrop (needed for tokens). |
| `h.sleep(ms)` | `await` it before reading `textBounds`. |
| `h.validate(board)` | QA pass; `[]` means clean. Run it in its own call. |

`storage.bulk` (after `bulk.js`): `cloneSections`, `collect`, `remapColors`, `applyTypography`,
`groupPlan`, `applyTokenGroups`. Each does one slice of work per call.

## Working method

### 1. Fix the vertical budget before drawing

Write the full stack as numbers (every block, every gap) and make it sum to the frame height
exactly, before creating a single shape. Discovering at the bottom of the screen that it doesn't
fit means re-flowing everything above, a few pixels at a time. If it doesn't fit, decide on paper
what gives. Worked example, frame presets and spacing rules: `references/layout.md`.

### 2. Probe what you haven't done before

Before building forty shapes on an unfamiliar primitive (an SVG import, a gradient, a token type,
a component operation), make one throwaway instance, read it back, export it. One probe is cheap.
The phantom icon box and the token alpha loss were both found this way, before the build, not after.

### 3. Build section by section

One `execute_code` call per section (status bar, header, hero…), each wrapped in its own named
board. Return the ids you'll need next; don't rely on finding shapes by name later, since names
repeat across boards.

Text width is unknowable until rendered: create the text, `await h.sleep(150)`, read
`t.textBounds.width`, then place its neighbour (a unit after a number, an arrow after a link, a chip
sized to its label). Never estimate character widths.

Use a grid layout for tile grids and a flex column for feeds and lists. Moving a board carries its
children; `resize()` doesn't, so after changing a card's height, rebuild its contents.

### 4. Look at it, and look twice

`export_shape` after every few sections. **The first export after new text often shows no text, or
shows it in a serif fallback**: the web font isn't loaded into the renderer yet. Export again
before concluding anything is wrong.

### 5. Validate, then hand over

In its own call after the build: `return storage.h.validate(boardId);`. It reports text
overflowing its container, overlapping text boxes, and shapes escaping the frame (shapes named
*Glow*, *Bleed* or *Decor* may bleed). It returns `not-settled` if text layout hasn't caught up;
run it again. Fix everything it reports, export once more, and tell the user what you built.

## Rules that protect the connection

The plugin serves one request at a time and cannot recover by itself. When it hangs, every call
times out, even `return "ping"`, and only the user can fix it by reopening the MCP plugin in the
Penpot tab. So:

- **Never issue two Penpot tool calls at once.** Not even an export alongside an `execute_code`.
- **Never `await` inside a loop of API calls.** Drive slices from separate calls.
- **Never pass a shape id you haven't received** from a previous call.
- **Stay inside the per-call budgets**: ~60 shapes cloned or recoloured, ~24 icons with labels,
  ~5 `applyToShapes` groups.

A single timeout is not yet a hang: the first `export_shape` after a plugin reload can time out
while the renderer warms up. Send `return "ping"`; if it answers, retry the export once.

- **`No Penpot instance connected for user token`**: The MCP HTTP/SSE transport is up, but the Penpot plugin is not currently active or connected via WebSocket (`/mcp/ws`) in the browser tab. Ask the user to verify if the file is open and reconnect the MCP plugin inside Penpot.
- **`Duplicate connection for given user token; rejecting new connection`**: An existing client or orphaned WebSocket session is holding the token. In local self-hosted environments (e.g. Docker), restarting the MCP service (`docker restart penpot-penpot-mcp-1` or compose restart) clears stale sessions immediately.

If it hangs for real: say so in a sentence, ask the user to reopen the plugin, and meanwhile keep
doing the work that doesn't need Penpot. After reconnecting, the **document** is intact and the
failed call was rolled back whole (never half-applied), so re-running it is safe. `storage` may be
gone: re-check `storage.h` and reload the scripts.

## Craft notes

- Decide the palette as **semantic roles** (canvas, surface, raised, border, text ×3, one accent
  per meaning) before drawing. Everything downstream (library, light mode, tokens) maps by role.
- A light mode isn't an inverted dark mode: accents split into an ink and a tint, tertiary text
  gets darker, and elevation moves from lighter surfaces to soft shadows. See `references/theming.md`.
- Given creative freedom, commit to an art direction and say what it is. Given a spec, follow it
  exactly and don't invent values you weren't given.
- Name layers, components, library assets and tokens in English: at handoff they become code
  identifiers. UI copy stays in the product's language.

## Working on an existing file

`penpotUtils.shapeStructure(board, 3)` first. Check `board.flex` / `board.grid` before moving
children (a layout owns their positions). If it's unclear what to change, ask the user to select
it and copy `penpot.selection` into `storage` immediately. For design-to-code, `penpot.generateStyle`
and `penpot.generateMarkup` produce CSS and HTML/SVG from shapes.

## Going further

- **Library colours, typographies, components, documentation board**: `references/design-system.md`.
- **Light/dark variants and design tokens**: `references/theming.md`. Read it before creating any
  token: colour tokens can't carry alpha, and that dictates the whole catalog.
- **Interactive prototyping, animations & overlays**: `references/prototyping.md`. Wiring flows, `addInteraction` API, modal overlays, transitions and flow audits.
- **Design-to-Code pipelines**: `references/design-to-code.md`. Turning frames into production HTML/CSS, React components, layout/token extraction and Style Dictionary mappings.
- **Design system audits & maintenance**: `references/design-system-audit.md`. Auditing palette drift, token migrations, WCAG AA compliance and component consistency.
- **Every API trap, as symptom → cause → fix**: `references/api-gotchas.md`. Skim it when
  something behaves oddly.
- **Frames, platform chrome, the budget worked example**: `references/layout.md`.

## Keeping this skill current

Everything here was observed on the Penpot build of September 2026. When Penpot behaves
differently from what these files say, trust a fresh probe, finish the task, then update the
relevant reference (and `bootstrap.js` if a guardrail is now wrong or missing). New icons go into
`references/icons.js` in the same format.
