# Light/dark themes and design tokens

Two ways to give a design a second colour scheme. They are not exclusive; for a presentation,
the strongest deliverable is both.

| | Static variant | Token-driven |
|---|---|---|
| Result | A second board, side by side | One board that flips when the theme changes |
| Good for | Showing both modes at once, reviews | A real design system, handoff to code |
| Cost | ~6 clone calls + ~4 recolour calls | Token catalog + ~8–10 apply calls |
| Gradients | Kept | Must become solid surfaces |

Build the static variant first if you want both: the token-driven board is then a clone of the
static one, and cloning must happen before anything becomes a component.

## Contents
1. Designing the second palette
2. Static variant: clone + remap
3. Token-driven: the alpha problem
4. Token architecture
5. Building the catalog (working code)
6. Binding shapes to tokens
7. Verify by flipping

## 1. Designing the second palette

A light mode is not an inverted dark mode. What changes, role by role:

- **Neutrals map 1:1 by role**: canvas, surface, raised surface, nav, border, strong border,
  primary/secondary/tertiary text. In light mode several of these become the same `#FFFFFF`,
  which is why every later mapping step keys on the shape's *role or name*, never on its colour.
- **Every accent splits in two.** An accent bright enough to glow on dark (`#35E0A1`) is illegible
  as text on white. Give each accent an **ink** (darker; text, icons, solid bars; meets contrast
  on white) and a **tint** (brighter; washes and tinted borders). Rule of thumb when remapping:
  a text, or anything at opacity 1, takes the ink; anything translucent takes the tint.
- **Lift the tertiary text.** A mid-grey that reads fine on near-black washes out on a pale
  canvas; darken it until captions and inactive tabs still read.
- **Elevation moves from colour to shadow.** Dark UIs separate layers with lighter surfaces; on
  light, surfaces are all white, so cards need a soft shadow
  (`h.shadow(14, 4, 0.07, { spread: -3, color: "#0D1420" })`) plus a hairline border.
- **Ambient glows get weaker.** A 10% colour blur that adds depth on dark tints a whole light page.
- **Ink on accent flips**: dark ink on a bright accent button in dark mode often becomes white on
  a deeper accent in light mode.
- **Keep fixed-contrast pairs fixed**: white on a red notification badge, a brand-gradient avatar.

## 2. Static variant: clone + remap

1. Create the destination board next to the source (same size, the new canvas colour).
2. `bulk.cloneSections(srcId, dstId, [names…], dx)` a few top-level sections per call (about 60
   shapes per call; a whole-board clone of ~200 shapes times out).
3. `bulk.collect(dstId, "ids")`, then `bulk.remapColors("ids", from, to, mapFn)` in slices of 50–60.
   A good `mapFn` has a neutral table and an accent table:

   ```js
   const NEUTRAL = { "#070A0E": "#F2F5F9", "#111720": "#FFFFFF", "#ECF1F7": "#0D1420", /* … */ };
   const ACCENT  = { "#35E0A1": ["#00A06B", "#10B981"] /* [ink, tint] */, /* … */ };
   const KEEP = ["Badge Count", "Avatar", "Avatar Initials"];
   const mapFn = (hex, op, shape) => {
     if (KEEP.includes(shape.name)) return null;
     if (NEUTRAL[hex]) return NEUTRAL[hex];
     if (ACCENT[hex]) return (shape.type === "text" || op === 1) ? ACCENT[hex][0] : ACCENT[hex][1];
     return null;
   };
   ```
4. Then the special cases by name: gradients (hero, FAB), shadows, ambient glows, ink on accent.
5. Export (twice, for the font race), fix contrast, export again.

## 3. Token-driven: the alpha problem

Probe before designing the catalog, because this changes everything:

- A colour token **cannot carry alpha**. `#35E0A124` and `rgba(53,224,161,0.14)` are accepted and
  both resolve to `#35E0A1`.
- **Applying a colour token to a fill forces `fillOpacity: 1`.** Every translucent wash in the
  design (icon chips, status pills, tinted alert boxes, active-tab indicators, tinted borders)
  collapses into a solid slab of accent colour.

So translucency has to be **pre-composited**: compute what the wash looks like on its backdrop and
ship that solid colour as the token, per theme.

```js
h.mix("#35E0A1", "#111720", 0.14)  // "#163332"  wash.mint on a dark card
h.mix("#10B981", "#FFFFFF", 0.14)  // "#DEF5ED"  wash.mint on a light card
```

Consequences to design around:

- **Normalise the alpha scale first.** Ad-hoc 0.10 / 0.15 / 0.16 washes each become a separate
  token per backdrop. Collapse them into two levels: `wash` (≈14%, fills) and `edge` (≈28%, tinted
  borders). Visually indistinguishable, and the catalog stays small.
- **A wash is tied to its backdrop.** The same 14% mint on a card and on the nav bar are two tokens
  (`wash.mint`, `wash.nav.mint`) if those surfaces differ.
- **Washes are raw hex, not references.** Changing `color.mint.400` won't propagate into
  `wash.mint`; recompute with `h.mix`. Keep the recipe in the token set's documentation.
- **Gradients can't be tokenized.** A gradient surface stays frozen in whatever theme it was
  authored in (on the first flip the gradient hero stayed white with light text on it). Turn it into
  a solid token surface (`bg.hero`), or leave it out knowingly.
- Shadows aren't colour tokens either. Pick one that reads in both themes (black at ~0.2) or accept
  a per-theme mismatch.

## 4. Token architecture

```
primitives   always on   color.slate.900 … color.slate.000, color.mint.400/600/700, …
scale        always on   radius.xs … radius.circle, space.2xs … space.2xl
theme-dark   Dark        bg.canvas = {color.slate.900}, …, wash.mint = #163332, …
theme-light  Light       the SAME names, light values
Themes (group "Color scheme"):  Dark  = primitives + scale + theme-dark
                                Light = primitives + scale + theme-light
```

The two theme sets must define exactly the same token names; the binding on a shape is by name.

A semantic vocabulary that covered a full mobile dashboard (adapt names to the project):

- `bg.canvas`, `bg.surface`, `bg.raised`, `bg.nav`, `bg.hero`
- `border.subtle`, `border.strong`, `border.nav`
- `text.primary`, `text.secondary`, `text.tertiary`, `text.onAccent`
- `accent.<hue>` for each accent (ink value in light)
- `wash.<hue>` (14% over surface), `wash.nav.<hue>` (over nav)
- `edge.<hue>` (28% over surface, tinted borders)
- `chrome.dim`, `chrome.home` (status-bar glyphs, home indicator, pre-composited)

Naming rules Penpot enforces: names are a path tree, so **a token can't be a prefix of another**
(`bg.surface` and `bg.surface.raised` fail with "A token already exists at the path … or at a
prefix thereof"). Use siblings: `bg.surface` + `bg.raised`.

## 5. Building the catalog (working code)

Each block is its own `execute_code` call.

```js
// (a) primitives + scale
const cat = penpot.library.local.tokens;
const prim = cat.addSet({ name: "primitives", active: true });
Object.entries({ "color.slate.900": "#070A0E", /* … */ })
  .forEach(([name, value]) => prim.addToken({ type: "color", name, value }));
const scale = cat.addSet({ name: "scale", active: true });
[["radius.lg", 11], ["radius.2xl", 16] /* … */].forEach(([n, v]) => scale.addToken({ type: "borderRadius", name: n, value: String(v) }));
[["space.xs", 8], ["space.sm", 10] /* … */].forEach(([n, v]) => scale.addToken({ type: "spacing", name: n, value: String(v) }));
```

```js
// (b) theme sets: same names, references for solids, h.mix for washes
const h = storage.h, cat = penpot.library.local.tokens;
const dark = cat.addSet({ name: "theme-dark", active: false });
dark.addToken({ type: "color", name: "bg.surface", value: "{color.slate.800}" });
dark.addToken({ type: "color", name: "wash.mint", value: h.mix("#35E0A1", "#111720", 0.14) });
// … and the same names in theme-light
```

```js
// (c) themes in ONE group, so they are mutually exclusive
const cat = penpot.library.local.tokens, set = n => cat.sets.find(s => s.name === n);
const tDark = cat.addTheme({ group: "Color scheme", name: "Dark" });      // object, not (group, name)
["primitives", "scale", "theme-dark"].forEach(n => tDark.addSet(set(n)));
const tLight = cat.addTheme({ group: "Color scheme", name: "Light" });
["primitives", "scale", "theme-light"].forEach(n => tLight.addSet(set(n)));
tLight.toggleActive();   // activating one theme deactivates the other AND its sets
```

Behaviour to expect:

- `resolvedValue` is `null` while a token's set is inactive. That's normal.
- **Toggling or creating a set as active deactivates every theme** (Penpot calls the state
  "custom"). Re-activate the intended theme afterwards.
- **`TokenSet.remove()` is async.** Removing and re-adding a set with the same name in one call
  fails with "A set with the same name already exists". Split into two calls.
- The interface doc says a theme never deactivates sets outside itself; in practice, themes in the
  same group swap their sets cleanly. Group Dark/Light and the switch just works.

## 6. Binding shapes to tokens

1. Activate the theme that matches the board's **current** colours, so binding causes no visual
   jump.
2. Build a plan of `{ id, token, prop }` by walking the board and mapping by **shape name**, with
   the ancestor card deciding per-accent tokens (`Icon Chip` inside `Quick · Fuel` → `wash.blue`).
   Colour can't be the key: in light mode surface, raised and nav are all `#FFFFFF`.
   - `prop` is `"fill"` or `"strokeColor"` for colours, `"radius"` (bulk shorthand for all four
     corners) for radii, `"rowGap"` / `"columnGap"` / `"paddingLeft"`… for layout spacing.
   - Icons are groups: bind `strokeColor` on the **paths inside**, not the group.
   - Leave out knowingly: brand gradients, decorative blurs, fixed-contrast text. Report them.
3. Check coverage before applying: list non-group shapes the plan doesn't touch. The leftovers
   should be exactly the ones you meant to leave out.
4. `bulk.groupPlan(plan)`, then `bulk.applyTokenGroups("tokenGroups", i, i + 5, "theme-light")`,
   one call per five groups. **No `await` loop inside a call.** 157 bindings in 40 groups took
   8 calls of 3–12 s each.
5. Confirm: count shapes whose `shape.tokens` is non-empty and compare with the plan size.

## 7. Verify by flipping

```js
const cat = penpot.library.local.tokens;
cat.themes.find(t => t.name === "Dark").toggleActive();
await storage.h.sleep(900);
return cat.sets.map(s => s.name + ":" + s.active);
```

Export the board, flip back, export again. Anything that didn't flip is either a gradient, a
shadow, or a shape the plan missed. A typical first-flip failure: the gradient hero stays light
while its text (tokenized) turns light too, and becomes unreadable.

Leave the file on the theme that matches the primary art direction, and tell the user where the
switch is (Tokens panel → Themes).
