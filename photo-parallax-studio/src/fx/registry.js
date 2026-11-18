// Move registry. Each camera move: { id, name, family, desc, params[], cam(P, ep, p, ctx) }
// where P = resolved params, ep = eased progress, p = raw progress. Registered looks/presets
// combine a move with atmosphere, grade, depth settings and a demo photo (for the library card).
PP.fx = (() => {
  const list = [], byId = {};
  const range = (key, label, min, max, step, def) => ({ key, label, type: 'range', min, max, step, def });
  const select = (key, label, options, def) => ({ key, label, type: 'select', options, def });
  const bool = (key, label, def) => ({ key, label, type: 'bool', def });
  const COMMON = [
    select('ease', 'Motion', Object.entries(PP.util.EASE_NAMES), null),
  ];
  function register(def) {
    def.params = (def.params || []).concat(COMMON);
    def.defaults = {};
    for (const p of def.params) def.defaults[p.key] = p.def;
    def.defaults.ease = def.ease || 'sine';
    list.push(def); byId[def.id] = def;
  }
  /* PRESETS-START */
  const presets = [];
  const preset = (id, name, family, note, move, dur, extra) =>
    presets.push(Object.assign({ id, name, family, note, move, dur }, extra || {}));
  /* PRESETS-END */
  return { list, byId, register, presets, preset, P: { range, select, bool } };
})();
