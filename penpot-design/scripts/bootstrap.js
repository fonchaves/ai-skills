// penpot-design · bootstrap.js
//
// Paste this ENTIRE file as the `code` argument of ONE `execute_code` call.
// It is a function body, not a module: the top-level `return` at the end is intentional.
// Safe to re-run (it just refreshes the helpers). Everything lands in `storage`, which
// persists across execute_code calls for as long as the plugin stays connected.
//
// Guardrails baked in (each cost a failed call to discover; see references/api-gotchas.md):
//   - letterSpacing is clamped to >= 0 (Penpot rejects negatives with "Value not valid")
//   - text: font applied before size; resize() before growType (resize() forces "fixed")
//   - shapes are appended to their parent BEFORE x/y is set; x/y are absolute page coords
//   - SVG stroke attrs go on each <path>, never on <svg> (root attrs leak into a visible box)
//   - icon recolouring skips the transparent "base-background" rect that keeps bounds square
//   - boards get NO fill unless asked (Penpot's own default is opaque white)
//   - colours are upper-cased (the API expects "#RRGGBB")

storage.cfg = Object.assign({ font: "Inter", textColor: "#111111" }, storage.cfg || {});
const h = {};

h.sleep = ms => new Promise(r => setTimeout(r, ms));
h.hex = c => String(c || "").toUpperCase();

// ---------- fonts ----------
h.font = name => {
  const n = name || storage.cfg.font;
  const f = penpot.fonts.findByName(n);
  if (!f) throw new Error(`Font not found: "${n}". Check penpot.fonts.findByName, or set storage.cfg.font.`);
  return f;
};
// Nearest available weight, so a missing 900 degrades to 800 instead of failing.
h.variant = (font, weight, style) => {
  const want = Number(weight || 400), st = style || "normal";
  const same = font.variants.filter(v => (v.fontStyle || "normal") === st);
  const pool = same.length ? same : font.variants;
  return pool.reduce((best, v) =>
    Math.abs(Number(v.fontWeight) - want) < Math.abs(Number(best.fontWeight) - want) ? v : best, pool[0]);
};

// ---------- styling values ----------
h.fills = o => {
  if (o.gradient) return [{ fillColorGradient: o.gradient, fillOpacity: o.fillOpacity == null ? 1 : o.fillOpacity }];
  if (o.fill == null) return [];
  return [{ fillColor: h.hex(o.fill), fillOpacity: o.fillOpacity == null ? 1 : o.fillOpacity }];
};
h.strokes = o => o.stroke ? [{
  strokeColor: h.hex(o.stroke), strokeOpacity: o.strokeOpacity == null ? 1 : o.strokeOpacity,
  strokeWidth: o.strokeWidth || 1, strokeAlignment: o.strokeAlignment || "inner"
}] : [];

// Gradient coords are normalised to the shape box: [0,0] top-left, [1,1] bottom-right.
// stops: [["#HEX", offset, opacity?], ...]
h.grad = (stops, from = [0, 0], to = [0, 1], type = "linear") => ({
  type, startX: from[0], startY: from[1], endX: to[0], endY: to[1], width: 1,
  stops: stops.map(s => Array.isArray(s) ? { color: h.hex(s[0]), offset: s[1], opacity: s[2] == null ? 1 : s[2] } : s)
});

h.shadow = (blur, y, opacity, o = {}) => [{
  style: o.inner ? "inner-shadow" : "drop-shadow", offsetX: o.x || 0, offsetY: y, blur,
  spread: o.spread || 0, color: { color: h.hex(o.color || "#000000"), opacity }
}];

// Alpha-composite fg over bg: what a translucent fill actually looks like on its backdrop.
// This is how a translucent look gets into a colour token (tokens cannot carry alpha).
h.mix = (fg, bg, a) => {
  const p = x => [1, 3, 5].map(i => parseInt(h.hex(x).slice(i, i + 2), 16));
  const f = p(fg), b = p(bg);
  return "#" + f.map((c, i) => Math.round(c * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join("").toUpperCase();
};

// ---------- shapes ----------
// parent may be null (page root). x/y are ABSOLUTE page coordinates.
// o: fill, fillOpacity, gradient, stroke, strokeOpacity, strokeWidth, strokeAlignment,
//    radius, shadows, blur ({ type: "layer-blur", value }), opacity, name
const place = (shape, parent, x, y, w, hh, o) => {
  if (o.name) shape.name = o.name;
  if (parent) parent.appendChild(shape);
  if (w != null) shape.resize(w, hh);
  shape.x = x; shape.y = y;
  shape.fills = h.fills(o);
  const st = h.strokes(o); if (st.length) shape.strokes = st;
  if (o.radius != null) shape.borderRadius = o.radius;
  if (o.shadows) shape.shadows = o.shadows;
  if (o.blur) shape.blur = o.blur;
  if (o.opacity != null) shape.opacity = o.opacity;
  return shape;
};

h.board = (parent, x, y, w, hh, o = {}) => {
  const b = place(penpot.createBoard(), parent, x, y, w, hh, Object.assign({ name: "Board" }, o));
  if (o.clip === false) b.clipContent = false;
  return b;
};
h.rect = (parent, x, y, w, hh, o = {}) => place(penpot.createRectangle(), parent, x, y, w, hh, Object.assign({ name: "Rectangle" }, o));
h.ellipse = (parent, x, y, w, hh, o = {}) => place(penpot.createEllipse(), parent, x, y, w, hh, Object.assign({ name: "Ellipse" }, o));

// Text. Without o.w: one line, auto-width. With o.w: wraps inside that width, auto-height.
// o: size, weight, style, family, color, opacity, lh, ls, align, valign, transform, w, h, grow, name
h.txt = (parent, x, y, chars, o = {}) => {
  const t = penpot.createText(String(chars));
  if (!t) throw new Error("createText returned null (empty string?)");
  t.name = o.name || String(chars).slice(0, 32);
  if (parent) parent.appendChild(t);
  const font = h.font(o.family);
  font.applyToText(t, h.variant(font, o.weight, o.style));
  t.fontSize = String(o.size == null ? 14 : o.size);
  t.lineHeight = String(o.lh == null ? 1.35 : o.lh);
  t.letterSpacing = String(Math.max(0, o.ls || 0));
  t.fills = [{ fillColor: h.hex(o.color || storage.cfg.textColor), fillOpacity: o.opacity == null ? 1 : o.opacity }];
  if (o.transform) t.textTransform = o.transform;
  t.align = o.align || "left";
  t.verticalAlign = o.valign || "top";
  if (o.w) {
    t.resize(o.w, o.h || Math.ceil((o.size || 14) * (o.lh || 1.35)));
    t.growType = o.grow || "auto-height";
  } else t.growType = "auto-width";
  t.x = x; t.y = y;
  return t;
};

// ---------- icons ----------
// paths: "d" strings (stroked), { c: [cx, cy, r] } circles (stroked), add solid: true to fill.
// Authored on a 24x24 grid (Lucide-compatible). references/icons.js fills storage.I.
h.svg = (paths, sw = 1.8) => {
  const S = `stroke="#FFFFFF" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  const body = paths.map(p => {
    if (typeof p === "string") return `<path d="${p}" fill="none" ${S}/>`;
    if (p.c) return p.solid
      ? `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}" fill="#FFFFFF"/>`
      : `<circle cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}" fill="none" ${S}/>`;
    return p.solid ? `<path d="${p.d}" fill="#FFFFFF"/>` : `<path d="${p.d}" fill="none" ${S}/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
};

h.paint = (group, color) => {
  const c = h.hex(color);
  penpotUtils.findShapes(s => s.type !== "group" && s.name !== "base-background", group).forEach(s => {
    if (s.strokes && s.strokes.length) s.strokes = s.strokes.map(st => ({
      strokeColor: c, strokeOpacity: 1, strokeWidth: st.strokeWidth, strokeStyle: st.strokeStyle,
      strokeAlignment: st.strokeAlignment, strokeCapStart: st.strokeCapStart, strokeCapEnd: st.strokeCapEnd
    }));
    if (s.fills && s.fills !== "mixed" && s.fills.length) s.fills = [{ fillColor: c, fillOpacity: 1 }];
  });
  return group;
};

// icon: a name from storage.I, or a raw paths array. o.sw overrides the stroke width (px).
h.icon = (parent, x, y, size, icon, color, o = {}) => {
  const paths = typeof icon === "string" ? (storage.I || {})[icon] : icon;
  if (!paths) throw new Error(`Unknown icon "${icon}". Load references/icons.js or pass a paths array.`);
  // Stroke width is absolute and does NOT scale when the icon is resized, so a fixed width
  // looks spindly at 48px and blobby at 14px. Default to Lucide-like proportions instead.
  const sw = o.sw == null ? Math.max(1, Math.round(size / 13 * 100) / 100) : o.sw;
  const g = penpot.createShapeFromSvg(h.svg(paths, sw));
  if (parent) parent.appendChild(g);
  g.resize(size, size);
  g.x = x; g.y = y;
  h.paint(g, color);
  g.name = o.name || (typeof icon === "string" ? `Icon · ${icon}` : "Icon");
  return g;
};

// ---------- QA ----------
// Final pass over a board. Reports text overflowing its parent, text boxes overlapping inside
// the same parent, and shapes escaping the root. Shapes whose name matches /glow|bleed|decor/i
// may bleed on purpose and are skipped. Returns [] when clean. Run it in its OWN call after
// building: geometry of text created in the same call may not have settled yet.
h.validate = (rootOrId, opts = {}) => {
  const root = typeof rootOrId === "string" ? penpotUtils.findShapeById(rootOrId) : rootOrId;
  const bleed = opts.allowBleed || /glow|bleed|decor/i;
  const issues = [];
  const texts = penpotUtils.findShapes(s => s.type === "text", root);
  // Text geometry settles asynchronously. Right after a big build, textBounds can still sit at
  // the origin and every text looks like it overflows by its parent's y. Detect that instead of
  // reporting nonsense: a text's rendered box always lies close to its own box.
  const stale = texts.filter(t => {
    const b = t.textBounds;
    return Math.abs(b.x - t.x) > t.width + 40 || Math.abs(b.y - t.y) > t.height + 40;
  });
  if (stale.length) return [{ kind: "not-settled", texts: stale.length,
    hint: "Text layout hasn't settled. Run h.validate in its own execute_code call after the build." }];
  texts.forEach(t => {
    const p = t.parent, b = t.textBounds;
    const over = Math.round(Math.max(b.x + b.width - (p.x + p.width), b.y + b.height - (p.y + p.height), p.x - b.x, p.y - b.y));
    if (over > 0) issues.push({ kind: "text-overflow", text: t.characters.slice(0, 30), parent: p.name, px: over });
  });
  const byParent = {};
  texts.forEach(t => (byParent[t.parent.id] = byParent[t.parent.id] || []).push(t));
  Object.values(byParent).forEach(list => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i].textBounds, b = list[j].textBounds;
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height)
        issues.push({ kind: "text-collision", a: list[i].characters.slice(0, 24), b: list[j].characters.slice(0, 24) });
    }
  });
  penpotUtils.analyzeDescendants(root, (r, s) => (!penpotUtils.isContainedIn(s, r) && !bleed.test(s.name)) ? s.name : null)
    .forEach(x => issues.push({ kind: "outside-root", name: x.result }));
  return issues;
};

storage.h = h;
const f = penpot.fonts.findByName(storage.cfg.font);
return {
  ready: true,
  font: storage.cfg.font + (f ? "" : "  <-- NOT FOUND, set storage.cfg.font"),
  weights: f ? [...new Set(f.variants.map(v => v.fontWeight))] : [],
  icons: storage.I ? Object.keys(storage.I).length : "not loaded (references/icons.js)",
  bulk: !!storage.bulk
};
