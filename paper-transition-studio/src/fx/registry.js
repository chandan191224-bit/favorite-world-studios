// Effect registry. Each effect: draw(ctx, p, A, B, P, env) where p = 0..1 raw progress,
// A = outgoing picture (the paper that tears away), B = incoming picture.
PT.fx = (() => {
  const list = [], byId = {};
  const range = (key, label, min, max, step, def, hint) => ({ key, label, type: 'range', min, max, step, def, hint });
  const select = (key, label, options, def) => ({ key, label, type: 'select', options, def });
  const bool = (key, label, def) => ({ key, label, type: 'bool', def });
  const color = (key, label, def) => ({ key, label, type: 'color', def });
  // shared look controls, appended to every effect
  const COMMON = [
    select('ease', 'Motion', Object.entries(PT.util.EASE_NAMES), null),
    range('rim', 'White torn edge', 0, 2.5, 0.05, 1),
    range('shadow', 'Shadow', 0, 1.6, 0.05, 1),
  ];
  function register(def) {
    def.params = (def.params || []).concat(COMMON);
    def.defaults = {};
    for (const p of def.params) def.defaults[p.key] = p.def;
    def.defaults.ease = def.ease || 'rip';
    list.push(def); byId[def.id] = def;
  }
  // named looks from the reference playlist: effect + settings + length
  const presets = [];
  const preset = (id, name, fx, params, dur, note) => presets.push({ id, name, fx, params: params || {}, dur, note });
  return { list, byId, register, presets, preset, P: { range, select, bool, color } };
})();
