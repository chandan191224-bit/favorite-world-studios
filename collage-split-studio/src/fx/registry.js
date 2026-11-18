// Layout registry. Each layout: draw(ctx, env) for one frame of a scene.
//   env: { W, H, S, t (seconds inside the scene, stepped when stop-motion is on), dur, p (= t/dur), seed, P (params),
//          mode: 'composite' | 'element' | 'matte', step, src(i), jit(k, amt), bg(), n (number of slots), label(i) }
// Layouts never call Math.random/Date: preview == export.
CS.fx = (() => {
  const list = [], byId = {};
  const range = (key, label, min, max, step, def, hint) => ({ key, label, type: 'range', min, max, step, def, hint });
  const select = (key, label, options, def) => ({ key, label, type: 'select', options, def });
  const bool = (key, label, def) => ({ key, label, type: 'bool', def });
  const color = (key, label, def) => ({ key, label, type: 'color', def });
  const text = (key, label, def) => ({ key, label, type: 'text', def });
  const LABEL_STYLES = [['pill', 'Dark pill'], ['tag', 'Amber tag'], ['white', 'White card'], ['type', 'Typewriter strip'], ['hand', 'Handwritten'], ['plain', 'Big text']];
  // shared look controls, appended to every layout
  const COMMON = [
    select('bg', 'Background', CS.look.BGS, 'dark'),
    color('bgColor', 'Background colour', '#1d3557'),
    select('stop', 'Stop-motion (frames per second)', [['0', 'Off (smooth)'], ['12', '12 fps (collage look)'], ['8', '8 fps (rough)'], ['6', '6 fps (very choppy)']], '0'),
    range('jitter', 'Hand-placed jitter', 0, 2, 0.05, 0),
    range('drift', 'Camera drift', 0, 1.5, 0.05, 0.4),
    range('grain', 'Film grain', 0, 1, 0.05, 0),
    range('vignette', 'Vignette', 0, 1, 0.05, 0),
    select('labelStyle', 'Label style', LABEL_STYLES, 'pill'),
    range('labelSize', 'Label size', 0.5, 2, 0.05, 1),
  ];
  function register(def) {
    const own = (def.params || []).map(p => p.key);
    def.params = (def.params || []).concat(COMMON.filter(c => !own.includes(c.key)));
    def.defaults = {};
    for (const p of def.params) def.defaults[p.key] = p.def;
    Object.assign(def.defaults, def.look || {}); // a layout's own default look (e.g. scrapbook = kraft + 12 fps)
    def.slots = def.slots || 2; def.maxSlots = def.maxSlots || def.slots; def.minSlots = def.minSlots || 1;
    list.push(def); byId[def.id] = def;
  }
  // named looks (the preset library): layout + settings + length
  const presets = [];
  const preset = (id, name, fx, params, dur, note, slots) => presets.push({ id, name, fx, params: params || {}, dur, note: note || '', slots });
  const FAMILIES = [
    ['split', 'Split screens'], ['compare', 'Compare A vs B'], ['grid', 'Grids'], ['pip', 'Picture-in-picture'], ['wall', 'Photo walls'],
    ['scrapbook', 'Scrapbook collage'], ['sticker', 'Cut-out stickers'], ['polaroid', 'Polaroids & stacks'], ['film', 'Film strip & contact sheet'],
    ['mosaic', 'Mosaic'],
  ];
  return { list, byId, register, presets, preset, FAMILIES, LABEL_STYLES, P: { range, select, bool, color, text } };
})();
