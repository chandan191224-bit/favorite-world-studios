// Preset library — every named look the studio ships with, one per library card.
// A preset points at one effect (element) with optional param/field overrides; the engine
// merges element defaults <- preset <- the user's layer tweaks. Generic names only,
// no real brands/people, never the word "AI" in anything that appears in a video.
VFX.presets = (() => {
  const L = [];
  for (const e of VFX.fx.list) {
    L.push({ id: e.id, name: e.name, note: e.note || '', fam: e.fam, el: e.id, dur: e.dur || 6, x: e.x, y: e.y, f: {}, p: {} });
  }
  const byId = {};
  L.forEach(p => (byId[p.id] = p));
  const FAMS = ['Smoke & fog', 'Fire', 'Explosions & impacts', 'Weather', 'Sky & light', 'Particles & debris', 'Water', 'Combo looks'];
  return { list: L, byId, FAMS };
})();
