// Effect registry. Every diagram engine registers here: { id, name, fam, note, dur, x?, y?,
//   fields: [{k, label, multi?, def?}], params: [{k, label, type, def, min?, max?, step?, options?, sec?}],
//   draw(g, o, lt, env), layers?(F, P, dur) }
// o = { f: merged fields, p: merged params, x, y }; lt = local seconds; env = { dur, seed, fw, fh, ox, oy, lang, W, H, t, media }.
// Param sections (sec): 'style' | 'anim' | 'labels' | 'media' — the inspector groups them.
BD.fx = (() => {
  const byId = {}, list = [];
  function register(e) {
    if (!e || !e.id) throw new Error('register: missing id');
    if (byId[e.id]) throw new Error('duplicate element ' + e.id);
    e.params = (e.params || []).map(p => Object.assign({ sec: 'style' }, p));
    e.fields = e.fields || [];
    byId[e.id] = e; list.push(e);
    return e;
  }
  const FAMS = () => { const s = new Set(); list.forEach(e => s.add(e.fam)); return [...s]; };
  return { register, byId, list, FAMS };
})();
BD.el = BD.fx;
