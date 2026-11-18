// Pipeline API (render.mjs, qa-sheet.mjs, chart_fx.py use it through headless Chrome). Same renderer as the editor.
//   DCS.ready()                       -> fonts loaded
//   DCS.load(project)                 -> { duration, scenes, width, height, fps }
//   DCS.build({ preset, csv, title, subtitle, source, theme, lang, duration, format, params, highlight, callouts,
//               camera, width, height, fps })   -> one-scene project from a preset + your CSV; returns load() info
//   DCS.frame(t, mode, type)          -> data URL (jpeg for composite/green/blue/matte, png for alpha)
//   DCS.sheet(ids, fractions, w, h, mode) -> data URL (jpeg) contact sheet of presets at fractions of their duration
//   DCS.presets()                     -> [{ id, name, chart, family, theme, lang, duration }]
window.DCS = (() => {
  let proj = null;
  const FAMS = ["'DC Inter'", "'DC Mukta'", "'DC Tiro'", "'DC Anton'"];
  async function ready() {
    const jobs = [];
    for (const f of FAMS) for (const w of [500, 700, 800]) jobs.push(document.fonts.load(`${w} 40px ${f}`, 'Aa1₹ भारत करोड़'));
    await Promise.all(jobs).catch(() => {});
    await document.fonts.ready;
    return true;
  }
  function info() { const tl = DC.engine.timeline(proj); return { duration: +tl.total.toFixed(4), scenes: proj.scenes.length, width: proj.width, height: proj.height, fps: proj.fps }; }
  function load(p) { proj = typeof p === 'string' ? JSON.parse(p) : p; proj.scenes = (proj.scenes || []).map(s => DC.engine.newScene(s)); if (window.DCApp) window.DCApp.setProject(proj, true); return info(); }
  function build(o) {
    const over = {};
    for (const k of ['csv', 'title', 'subtitle', 'source', 'theme', 'lang', 'duration', 'highlight', 'highlightAt', 'callouts', 'camera', 'outro', 'titleAlign'])
      if (o[k] !== undefined && o[k] !== null) over[k] = o[k];
    const s = DC.engine.fromPreset(o.preset, over);
    if (o.format) s.format = Object.assign({}, s.format, o.format);
    if (o.params) s.params = Object.assign({}, s.params, o.params);
    return load({ version: 1, name: o.name || s.title || o.preset, width: o.width || 1920, height: o.height || 1080, fps: o.fps || 30, transition: { type: 'cut', duration: 0 }, scenes: [s] });
  }
  let fc = null;
  function frame(t, mode = 'composite', type) {
    if (!fc || fc.width !== proj.width || fc.height !== proj.height) { fc = document.createElement('canvas'); fc.width = proj.width; fc.height = proj.height; }
    const ctx = fc.getContext('2d');
    DC.engine.render(ctx, proj, t, { W: proj.width, H: proj.height, mode });
    const png = type === 'png' || (!type && mode === 'alpha');
    return png ? fc.toDataURL('image/png') : fc.toDataURL('image/jpeg', 0.93);
  }
  function sheet(ids, fr = [0.25, 0.45, 0.65, 0.95], w = 480, h = 270, mode = 'composite') {
    const cols = fr.length, lab = 26, c = document.getElementById('dcsSheet') || document.createElement('canvas');
    c.width = cols * w; c.height = ids.length * (h + lab);
    const g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
    const tile = document.createElement('canvas'); tile.width = w; tile.height = h; const tg = tile.getContext('2d');
    ids.forEach((id, r) => {
      const sc = DC.engine.fromPreset(id), p = { width: w, height: h, scenes: [sc], transition: { type: 'cut' } };
      g.fillStyle = '#fff'; g.font = '600 16px sans-serif'; g.fillText(`${id}  ·  ${sc.chart}  ·  ${sc.theme}/${sc.lang}  ·  ${sc.duration}s`, 6, r * (h + lab) + 18);
      fr.forEach((f, ci) => {
        DC.engine.render(tg, p, f * sc.duration, { W: w, H: h, mode });
        g.drawImage(tile, ci * w, r * (h + lab) + lab);
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(ci * w, r * (h + lab) + lab, 70, 20); g.fillStyle = '#ff0'; g.font = '600 13px sans-serif';
        g.fillText((f * sc.duration).toFixed(2) + 's', ci * w + 5, r * (h + lab) + lab + 15);
      });
    });
    return c.toDataURL('image/jpeg', 0.88);
  }
  function presets() { return DC.charts.presets.map(p => ({ id: p.id, name: p.name, chart: p.chart, family: (DC.charts.byId[p.chart] || {}).family, theme: p.theme, lang: p.lang, duration: p.duration })); }
  return { ready, load, build, frame, sheet, presets, info: () => info(), get project() { return proj; } };
})();
