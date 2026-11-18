// Chart registry. A chart = { id, name, family, shape ('table'|'series'|'points'|'single'), params:[...], dur,
//   draw(ctx, env) } where env carries W,H,k, t (scene seconds), dur, box (plot area), theme, lang, data, P (params),
//   fmt(v, ref), axis(v), hl (highlight name), anchors (draw() fills name -> {x,y} for call-outs and the camera).
// Presets = named looks with sample data: preset({ id, name, chart, csv, title, ..., params, format }).
DC.charts = (() => {
  const list = [], byId = {}, presets = [], presetById = {};
  // shared parameters every chart gets in the inspector
  const COMMON = [
    { key: 'intro', label: 'Axis / intro time (s)', type: 'range', min: 0, max: 3, step: 0.1, def: 0.6 },
    { key: 'build', label: 'Build time (s)', type: 'range', min: 0.3, max: 20, step: 0.1, def: 2.4 },
    { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 0.35 },
    { key: 'ease', label: 'Easing', type: 'select', options: ['out', 'expo', 'quint', 'inOut', 'back', 'elastic', 'linear'], def: 'out' },
  ];
  function register(c) {
    c.params = (c.params || []).concat(COMMON.filter(p => !(c.params || []).some(q => q.key === p.key)));
    c.defaults = Object.fromEntries(c.params.map(p => [p.key, p.def]));
    list.push(c); byId[c.id] = c;
    return c;
  }
  function preset(p) { presets.push(p); presetById[p.id] = p; return p; }
  return { register, preset, list, byId, presets, presetById };
})();
