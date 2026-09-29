# Penpot MCP: API traps

Observed against the Penpot build of September 2026. Every entry cost at least one failed call
to discover. If Penpot now behaves differently, trust a fresh probe over this page, and update it.

Format: **symptom**: cause. Fix.

## Contents
- Connection, parallelism, timeouts
- Text
- Shapes, boards, layouts
- SVG and icons
- Export
- Pages
- Cloning, components, library
- Tokens (summary; full treatment in theming.md)

## Connection, parallelism, timeouts

- **`No Penpot instance connected for user token`**: HTTP/SSE endpoint returned 200, but no active WebSocket bridge from the Penpot browser plugin exists for this user token. The user must open the file and launch the MCP plugin in Penpot.
- **`Duplicate connection for given user token; rejecting new connection`**: A stale or duplicate client connection exists with the same token. Clear orphaned sessions by restarting the MCP container (`docker restart penpot-penpot-mcp-1`) or waiting for heartbeat timeout.
- **Workspace URLs carry exact targets**: URLs containing `page-id=<UUID>` and `board-id=<UUID>` allow pinpointing the target page and shape instantly without traversal.
- **Every call times out, even `return "ping"`**: the plugin is hung. Only the user can fix it, by
  reopening the Penpot MCP plugin in the Penpot tab. Tell them plainly and keep doing work that
  doesn't need Penpot. After reconnecting, the document and the token catalog are intact, and a
  failed call is rolled back whole, never half-applied (seen three times), so re-running a slice
  is safe. **`storage` is not reliable across a reconnect**: one reconnect kept it, a later one
  wiped it and reset the UI to the first page. Re-check `storage.h` and reload the scripts.
- **A single timeout isn't a hang.** The first `export_shape` after a plugin reload timed out and
  succeeded on retry (cold renderer). Ping first; retry once if the ping answers.
- **Never call Penpot tools in parallel.** The plugin serves one request at a time. The one time two
  Penpot calls were issued together (`execute_code` + an `export_shape` that was itself slow) the
  plugin hung until the user reconnected it.
- **Never pass a guessed shape id.** `export_shape` with a made-up id fails with
  `Cannot read properties of null (reading 'export')`. Get ids back from `execute_code` first.
- **Never `await` between API calls inside a loop in one call.** A 10-step loop of
  `applyToShapes` with a 90 ms sleep between steps hung the plugin for 18 minutes and dropped the
  MCP connection. Drive slices from separate calls instead.
- **Per-call budgets that proved safe**: cloning ~60 shapes; writing fills/strokes on ~60 shapes;
  ~24 icons with labels (~330 ms each); ~5 `applyToShapes` groups (0.7–2 s each). A clone of a
  ~200-shape board timed out and was rolled back.

## Text

- **`Value not valid: -0.1. Code: :letterSpacing`**: negative tracking is rejected. Clamp to ≥ 0
  (`h.txt` does). Tight display type needs a typeface that is tight by design.
- **Wrong `textBounds` right after creating text**: layout settles asynchronously. For widths,
  `await h.sleep(150–300)` in the same call is enough. **Positions** of text created in a busy
  call can still read as the origin after 500 ms, which makes every text look like it overflows
  by its parent's `y`. Run QA (`h.validate`) in its own call after the build; it now detects the
  unsettled state and says so.
- **`resize()` makes a text stop growing**: `resize()` forces `growType: "fixed"`. Set `growType`
  again after every resize.
- **`fontSize`, `lineHeight`, `letterSpacing`, `fontWeight` are strings.** Pass `String(n)`.
- **A text's `width` is its box, not its ink**: use `textBounds` for what is actually drawn. For a
  wrapping (auto-height) text, `textBounds.width` is the box width, not the longest line.
- **`typography.applyToText(t)` turns the text black**: it wipes the fills. Save `t.fills` before,
  restore after (`bulk.applyTypography` does).
- **Font variants have no usable `id`**: select by `fontWeight` + `fontStyle`, apply with
  `font.applyToText(t, variant)`. `h.variant` picks the nearest weight (950 → 900).

## Shapes, boards, layouts

- **A new board is opaque white**: that is Penpot's default fill. Containers need `fills = []`
  (`h.board` defaults to no fill).
- **Children land in the wrong place**: `appendChild` preserves absolute position. Append first,
  then set `x/y`, which are absolute page coordinates. `parentX/parentY` are read-only.
- **A badge that pokes out of its button gets cut off**: boards clip their content by default. Set
  `clipContent = false` on the board whose children should overflow (`h.board(…, { clip: false })`;
  verified: the badge renders whole). Every board up the chain clips too, so the overflow must stay
  inside the grandparent, or the decoration goes on the grandparent instead.
- **Moving a board moves its children; resizing it does not.** After changing a card's height, its
  absolutely-placed contents stay put. Rebuild them (remove children, re-add) instead of nudging.
- **Grid layout**: `const g = board.addGridLayout(); g.addRow("fixed", 62); g.addColumn("flex", 1);
  g.appendChild(child, row, col)` (1-based). Children snap into their cells exactly.
- **Flex layout**: `board.addFlexLayout()` then `dir`, `rowGap`, `columnGap`; on each sized child set
  `layoutChild.horizontalSizing = "fix"` and `verticalSizing = "fix"`. Append in visual order.
- **`penpotUtils.isContainedIn` flags blur glows**: decorative shapes that bleed on purpose. Name them
  `… Glow` / `… Bleed` / `… Decor` and `h.validate` skips them.

## SVG and icons

- **Every icon has a box drawn around it**: stroke/fill attributes on the root `<svg>` are applied
  to the imported `base-background` rect. Put attributes on each `<path>` / `<circle>` only.
- **Recolouring an icon paints its bounding box**: skip the child named `base-background` (a
  transparent rect that keeps icon bounds square; keep it, it makes alignment exact).
- **Setting `fills` on the icon group does nothing**: groups hold no fills. Recolour descendants
  (`h.paint`).
- **Icons look spindly when big and blobby when small**: stroke width is absolute and does not scale
  when the icon is resized. `h.icon` defaults to `size / 13`; override with `{ sw }`.
- **`<rect>` imports as a separate rect shape**: convert it to a rounded-rect path to keep icons
  all-path. `M…h.01` dot segments (the dot in ⓘ, ⚠, list bullets) render fine.

## Export

- **First export after creating text shows no text, or shows it in a serif fallback**: the web
  font isn't in the renderer yet. Export again before concluding anything. Never debug text
  from a single export.
- `export_shape` takes `shapeId` (camelCase).

## Pages

- `penpot.createPage()` does **not** switch to the new page. `await penpot.openPage(pageOrId)`
  does, and new shapes go to `penpot.currentPage`. `storage` survives a page switch.
- **`Cannot modify a page that is not currently active. Code: :appendChild`**: only the page shown
  in the UI can be mutated, and the user can switch pages between two of your calls (it happened
  twice in a row during testing). Put `await penpot.openPage(id)` at the top of the **same** call
  that mutates, and check `penpot.currentPage.name` before building. Reads (`findShapeById`) work
  across pages.
- `page.remove()` deletes a page (used to clean up scratch pages).

## Cloning, components, library

- **Cloning a big board times out**: clone its top-level sections, a few per call, into a new
  board (`bulk.cloneSections`).
- **A clone of a component main instance is a linked copy**, not a free shape. Make theme variants
  and other copies *before* creating components, or clone from a board that has no mains.
- **`library.local.createComponent([shape])`** keeps the main instance where it is (inside its
  layout, same position), renames the shape to `path / name`, and can reorder the parent's
  `children`. Harmless in a grid (explicit cells); recheck order in a flex layout.
- **A component should own all its parts**: shapes that merely sit on top of a board as siblings are
  left out of the component. Reparent them into the board first.
- **`penpot.createVariantFromComponents` / `penpotUtils.createVariantContainer` move the mains into
  a new container on the canvas**: do not use them on shapes that live inside a screen layout.
- **Removing a shape inside a component instance only hides it**: instances that need a different
  icon or structure are better as independent copies.
- **Library colours and typographies cannot be deleted from the plugin API**: rename or repurpose
  instead of creating strays. Group them with `path` (`c.path = "Brand / Dark"`).
- **Creating a library colour does not link existing shapes**: raw hex shapes keep their literal
  values. Connect them explicitly using `fillColorRefId: color.id` / `strokeColorRefId: color.id`
  (with `fillColorRefFile: null`). Otherwise the Penpot UI shows them as unlinked and library edits
  won't propagate.

## Tokens (summary)

- Colour tokens drop alpha (`#RRGGBBAA`, `rgba()`), and applying one forces `fillOpacity: 1`.
- Colour tokens cannot drive a gradient fill.
- A token name cannot be a prefix of another (`bg.surface` + `bg.surface.raised` fails).
- `TokenSet.remove()` is async: re-adding the same name in the same call fails.
- `addTheme({ group, name })` takes an object, not two strings.
- Themes in one group are mutually exclusive and swap their sets; toggling a set by hand
  deactivates every theme.

Full treatment, with the architecture this forces: `theming.md`.
