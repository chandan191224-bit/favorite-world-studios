// Effect registry. Four kinds of effect, all drawn at any time t, deterministically from the layer seed:
//   overlay  draw(g, P, e)     paints marks on a cleared layer canvas; the engine blends it (screen, multiply...)
//   process  process(g, P, e)  changes the current picture in place (VHS, RGB split, halftone, glitch...)
//   grade    grade(P, e)       returns colour settings for FL.grade (also exportable as a .cube LUT)
//   camera   camera(P, e)      returns a move {x, y, zoom, rot, bx, by, zb} applied to the source footage
// e = { W, H, S (=short side/1080), t, lt (time in layer), p (0..1 in layer), dur, seed, fps, frame,
//       film(fps) -> film-frame index, amt (fade x opacity), mode, src() -> snapshot canvas of the picture }
FL.fx = (() => {
  const list = [], byId = {};
  const range = (key, label, min, max, step, def, hint) => ({ key, label, type: 'range', min, max, step, def, hint });
  const select = (key, label, options, def) => ({ key, label, type: 'select', options, def });
  const bool = (key, label, def) => ({ key, label, type: 'bool', def });
  const color = (key, label, def) => ({ key, label, type: 'color', def });
  const text = (key, label, def) => ({ key, label, type: 'text', def });
  const FAMILIES = [
    ['light', 'Light & burns'], ['film', 'Film & damage'], ['archive', 'Archival'], ['video', 'VHS / CRT / glitch'],
    ['camera', 'Camera moves'], ['frame', 'Frame & grade'], ['docs', 'Classified & docs'],
  ];
  const BLENDS = [['source-over', 'Normal'], ['screen', 'Screen'], ['lighter', 'Add'], ['multiply', 'Multiply'], ['overlay', 'Overlay'], ['soft-light', 'Soft light'], ['color-dodge', 'Colour dodge'], ['darken', 'Darken'], ['lighten', 'Lighten']];
  function register(def) {
    def.params = def.params || [];
    def.kind = def.kind || 'overlay';
    def.blend = def.blend || (def.light ? 'screen' : 'source-over');
    def.defaults = {};
    for (const p of def.params) def.defaults[p.key] = p.def;
    if (byId[def.id]) list.splice(list.indexOf(byId[def.id]), 1);
    list.push(def); byId[def.id] = def;
  }
  // named variants shown in the library: effect + settings (+ suggested length for one-shot effects)
  const presets = [], presetById = {};
  const preset = (id, name, fx, params, opts) => { const o = Object.assign({ id, name, fx, params: params || {} }, opts || {}); presets.push(o); presetById[id] = o; };
  return { list, byId, register, presets, presetById, preset, FAMILIES, BLENDS, P: { range, select, bool, color, text } };
})();
