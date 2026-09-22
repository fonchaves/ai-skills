// penpot-design · bulk.js — heavy operations. Each call does ONE SLICE of work and returns.
//
// Paste this ENTIRE file as the `code` of ONE execute_code call (after bootstrap.js).
// Drive the slices from SEPARATE execute_code calls. Never loop them with `await` inside one
// call: an awaited 10-step loop of applyToShapes hung the plugin for 18 minutes and dropped the
// MCP connection. A timed-out call is rolled back whole, so re-running a slice is safe.

const bulk = {};

// Clone top-level children of one board into another, a few per call. Cloning a ~200-shape
// board in one go times out; about 60 shapes per call is safe. Clones land on top of their
// source, so dx/dy move them into the destination. Clone from a PLAIN board: cloning a
// component main instance produces linked copies, not free shapes.
bulk.cloneSections = (srcId, dstId, names, dx = 0, dy = 0) => {
  const src = penpotUtils.findShapeById(srcId), dst = penpotUtils.findShapeById(dstId);
  return names.map(n => {
    const s = src.children.find(c => c.name === n);
    if (!s) return `${n}: missing`;
    const cp = s.clone();
    dst.appendChild(cp);
    cp.x = cp.x + dx; cp.y = cp.y + dy;
    return `${n}: ${penpotUtils.findShapes(() => true, cp).length + 1} shapes`;
  });
};

// Snapshot every id under a root (root included) into storage[key]; returns the count.
bulk.collect = (rootId, key) => {
  const root = penpotUtils.findShapeById(rootId);
  storage[key] = [root.id].concat(penpotUtils.findShapes(() => true, root).map(s => s.id));
  return storage[key].length;
};

// Remap solid fill/stroke colours for storage[key].slice(from, to). About 60 ids per call.
// mapFn(hex, opacity, shape, kind: "fill" | "stroke") -> null (keep) | "#HEX" | { color, opacity }
// Gradients and images are left alone; stroke width/alignment/caps are preserved.
bulk.remapColors = (key, from, to, mapFn) => {
  let touched = 0;
  const norm = (r, op) => r == null ? null
    : typeof r === "string" ? { color: r.toUpperCase(), opacity: op }
    : { color: String(r.color).toUpperCase(), opacity: r.opacity == null ? op : r.opacity };
  storage[key].slice(from, to).forEach(id => {
    const s = penpotUtils.findShapeById(id);
    if (!s) return;
    if (s.fills && s.fills !== "mixed" && s.fills.length) {
      let changed = false;
      const next = s.fills.map(f => {
        if (!f.fillColor || f.fillColorGradient || f.fillImage) return f;
        const op = f.fillOpacity == null ? 1 : f.fillOpacity;
        const r = norm(mapFn(f.fillColor.toUpperCase(), op, s, "fill"), op);
        if (!r) return f;
        changed = true;
        return { fillColor: r.color, fillOpacity: r.opacity };
      });
      if (changed) { s.fills = next; touched++; }
    }
    if (s.strokes && s.strokes.length) {
      let changed = false;
      const next = s.strokes.map(st => {
        const op = st.strokeOpacity == null ? 1 : st.strokeOpacity;
        const r = st.strokeColor ? norm(mapFn(st.strokeColor.toUpperCase(), op, s, "stroke"), op) : null;
        if (r) changed = true;
        return {
          strokeColor: r ? r.color : st.strokeColor, strokeOpacity: r ? r.opacity : op,
          strokeWidth: st.strokeWidth, strokeStyle: st.strokeStyle, strokeAlignment: st.strokeAlignment,
          strokeCapStart: st.strokeCapStart, strokeCapEnd: st.strokeCapEnd
        };
      });
      if (changed) { s.strokes = next; touched++; }
    }
  });
  return touched;
};

// Link a library typography to a text. applyToText() wipes the text's fills, so restore them.
bulk.applyTypography = (text, typo) => { const f = text.fills; typo.applyToText(text); text.fills = f; return text; };

// Link shapes in storage[key].slice(from, to) to library colours via colorMap { "#HEX": colorId }.
// Slices of ~60 shapes per call avoid timeouts.
bulk.linkLibraryColors = (key, from, to, colorMap) => {
  let linkedFills = 0, linkedStrokes = 0;
  (storage[key] || []).slice(from, to).forEach(id => {
    const s = penpotUtils.findShapeById(id);
    if (!s) return;
    if (s.fills && Array.isArray(s.fills)) {
      let changed = false;
      const next = s.fills.map(f => {
        if (f.fillColor && !f.fillColorGradient && !f.fillImage) {
          const ref = colorMap[f.fillColor.toUpperCase()];
          if (ref && f.fillColorRefId !== ref) {
            changed = true;
            linkedFills++;
            return Object.assign({}, f, { fillColorRefId: ref, fillColorRefFile: null });
          }
        }
        return f;
      });
      if (changed) s.fills = next;
    }
    if (s.strokes && Array.isArray(s.strokes)) {
      let changed = false;
      const next = s.strokes.map(st => {
        if (st.strokeColor && !st.strokeColorGradient) {
          const ref = colorMap[st.strokeColor.toUpperCase()];
          if (ref && st.strokeColorRefId !== ref) {
            changed = true;
            linkedStrokes++;
            return Object.assign({}, st, { strokeColorRefId: ref, strokeColorRefFile: null });
          }
        }
        return st;
      });
      if (changed) s.strokes = next;
    }
  });
  return { linkedFills, linkedStrokes };
};

// Group a plan [{ id, token, prop }] into (token, prop) batches -> storage[key]; returns count.
// prop may be any TokenProperty ("fill", "strokeColor", "rowGap", ...) or "radius" (all 4 corners).
bulk.groupPlan = (plan, key = "tokenGroups") => {
  const m = {};
  plan.forEach(p => { const k = p.token + "|" + p.prop; (m[k] = m[k] || []).push(p.id); });
  storage[key] = Object.entries(m).map(([k, ids]) => ({ token: k.split("|")[0], prop: k.split("|")[1], ids }));
  return storage[key].length;
};

// Apply storage[key].slice(from, to): about 5 groups per call (each applyToShapes costs 0.7-2 s).
// Tokens are looked up by name in setName, but the binding is BY NAME: it resolves against
// whichever set is active later, which is what makes a theme switch work.
bulk.applyTokenGroups = (key, from, to, setName) => {
  const set = penpot.library.local.tokens.sets.find(s => s.name === setName);
  if (!set) throw new Error(`Token set not found: ${setName}`);
  const byName = {};
  set.tokens.forEach(t => { byName[t.name] = t; });
  const CORNERS = ["borderRadiusTopLeft", "borderRadiusTopRight", "borderRadiusBottomRight", "borderRadiusBottomLeft"];
  return storage[key].slice(from, to).map(g => {
    const tok = byName[g.token];
    if (!tok) return `${g.token}: missing in ${setName}`;
    const shapes = g.ids.map(id => penpotUtils.findShapeById(id)).filter(Boolean);
    tok.applyToShapes(shapes, g.prop === "radius" ? CORNERS : [g.prop]);
    return `${g.token}/${g.prop} x${shapes.length}`;
  });
};

storage.bulk = bulk;
return { ready: true, ops: Object.keys(bulk) };
