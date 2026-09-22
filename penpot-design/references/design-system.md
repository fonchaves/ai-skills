# Library, typography, components, documentation board

Order matters. The safe sequence for a file that will have theme variants and components:

1. Build the screen(s).
2. Make any copies you need (theme variants, a board for tokens): copies of a component main
   instance become linked instances, so copy **before** step 4.
3. Library colours and typographies; link the typographies to the texts.
4. Components.
5. Documentation board.
6. Tokens (theming.md), if the user wants a switchable theme.

## Library colours

```js
const lib = penpot.library.local;
[["Dark", "Surface", "#111720"], ["Light", "Surface", "#FFFFFF"] /* … */].forEach(([group, name, hex]) => {
  const c = lib.createColor();
  c.name = name; c.color = hex; c.path = "Brand / " + group;
});
```

Name colours by **role** (Surface, Text Secondary, Accent Mint · Ink), not by hue number: the
asset panel is read by designers choosing a colour for a job. Group by theme with `path`. There
is no delete in the plugin API, so a mistake is fixed by renaming.

### Linking shapes to library colours

Creating colours in `penpot.library.local` does **not** automatically link existing shapes.
Unlinked shapes keep raw hex values and do not appear as connected in the UI palette or update
when the library colour changes.

To link shapes to library colours, set `fillColorRefId` and/or `strokeColorRefId` to the colour's `id`:

```js
// Link fill
shape.fills = shape.fills.map(f => {
  if (f.fillColor && !f.fillColorGradient && !f.fillImage) {
    const libColor = lib.colors.find(c => c.color.toUpperCase() === f.fillColor.toUpperCase());
    if (libColor) return Object.assign({}, f, { fillColorRefId: libColor.id, fillColorRefFile: null });
  }
  return f;
});

// Link stroke
shape.strokes = shape.strokes.map(st => {
  if (st.strokeColor && !st.strokeColorGradient) {
    const libColor = lib.colors.find(c => c.color.toUpperCase() === st.strokeColor.toUpperCase());
    if (libColor) return Object.assign({}, st, { strokeColorRefId: libColor.id, strokeColorRefFile: null });
  }
  return st;
});
```
Or use `bulk.linkLibraryColors(ids, colorMap)` in slices of ~60 shapes per call.

## Typographies

Define the scale as **roles** taken from the design you actually drew, not a generic ramp:

```js
const lib = penpot.library.local, font = penpot.fonts.findByName("Plus Jakarta Sans");
const V = w => font.variants.find(v => v.fontWeight === String(w) && v.fontStyle === "normal");
[["Heading", "Item Title", 12.5, 700, 1.35, 0, null],
 ["Label", "Kicker", 8.5, 800, 1.35, 1.1, "uppercase"] /* … */].forEach(([group, name, size, weight, lh, ls, tt]) => {
  const t = lib.createTypography();
  t.name = name; t.path = "Brand / " + group;
  t.setFont(font, V(weight));
  t.fontSize = String(size); t.lineHeight = String(lh); t.letterSpacing = String(ls);
  if (tt) t.textTransform = tt;
});
```

**Link each text by its shape name**, not by matching size and weight: two roles often share
metrics (a 9.5/800 uppercase eyebrow and a 9.5/800 active nav label) and a metric match silently
picks the wrong one. Keep a `{ shapeName: typographyName }` map, and leave chrome one-offs (status
bar clock, avatar initials, badge count) unlinked on purpose.

`typography.applyToText(text)` **wipes the text's fills**. Use `bulk.applyTypography(text, typo)`,
which saves and restores them. Linking ~40 texts per call is fine.

After linking, re-run `h.validate`: a typography's letter-spacing or line-height can differ
slightly from what was hand-set and push a tight line over.

## Components

Worth componentizing: units that repeat or will be reused across screens (cards, list items,
buttons, chips, inputs, pills, badges, navigation bars, status bar, FAB). Not worth it: one-off
hero compositions.

```js
const c = penpot.library.local.createComponent([shape]);
c.name = "Insight Card · Urgent"; c.path = "Brand / Cards";
```

What happens and what to watch:

- The shape becomes the **main instance, in place**: same parent, same layout cell, same position.
  Penpot renames the shape to `path / name`, and may reorder the parent's `children` (harmless in a
  grid with explicit cells; recheck a flex layout's order).
- **Everything the component needs must be a child of the shape.** Texts that were siblings
  floating over a badge board are left out; `badge.appendChild(text)` each one first (absolute
  position is kept).
- **Don't build variant sets out of shapes inside a screen**: `createVariantFromComponents` and
  `penpotUtils.createVariantContainer` move the mains into a new container board, tearing them out
  of the layout. Build variant sets on a separate components page instead.
- Four quick-action tiles with different icons are four copies, not one component + overrides:
  removing a shape inside an instance only hides it, so swapping icons in instances leaves
  invisible debris.
- Create ~4 components per call.

## Documentation board

A board next to the screens that makes the system legible to the next designer:

- **Colour swatches**: a 60 px rounded square per colour, role name below (wrapping text, width
  ~84), hex below that. Give every swatch a hairline border, or white swatches vanish on light and
  near-black ones on dark.
- **Type specimen**: for each typography, a spec line (`Heading / Item Title · 12.5/700`) and a
  sample string from the real design with the actual typography **applied** (not hand-styled), so
  the specimen proves the link works. Order from largest to smallest.
- **Component instances**: `component.instance()`, then `board.appendChild(inst)` and position it,
  with a small label above. Place small components side by side to keep the board compact.
  Instances are live; editing the main updates them.

Split the board over several calls: roughly swatches (1), type scale (1), components (3–4).
