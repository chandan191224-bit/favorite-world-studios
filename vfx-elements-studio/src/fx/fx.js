// Effect registry. Every element registers itself here once:
//   VFX.fx.register({ id, name, fam, note, dur, params, fields, draw(g, P, E) })
// P = merged params (element defaults <- preset <- layer tweaks, plus x/y from the layer).
// E = { t (layer-local seconds), dur, seed, fw, fh (design frame, short side = 1080),
//       W, H (device px), k (design->device scale), bd (backdrop canvas, device px, may be
//       null in element modes), mode ('composite'|'green'|'blue'|'alpha'|'matte') }.
// Rules: deterministic (seeded only), no Math.random/Date, no ctx.filter, draw in design px.
VFX.fx = (() => {
  const byId = {}, list = [];
  function register(e) {
    if (byId[e.id]) console.warn('duplicate effect', e.id);
    byId[e.id] = e; list.push(e);
  }
  // soft clip for the standard "area" param; particles test inArea() instead
  const AREAS = [['full', 'Whole frame'], ['lower', 'Lower half'], ['upper', 'Upper half'], ['band', 'Middle band'], ['left', 'Left side'], ['right', 'Right side'], ['center', 'Centre circle']];
  function clipArea(g, area, fw, fh) {
    if (!area || area === 'full') return;
    g.beginPath();
    if (area === 'lower') g.rect(-fw, fh * 0.5, fw * 3, fh);
    else if (area === 'upper') g.rect(-fw, -fh, fw * 3, fh * 0.5);
    else if (area === 'band') g.rect(-fw, fh * 0.32, fw * 3, fh * 0.36);
    else if (area === 'left') g.rect(0, -fh, fw * 0.5, fh * 3);
    else if (area === 'right') g.rect(fw * 0.5, -fh, fw * 0.5, fh * 3);
    else if (area === 'center') { g.arc(fw / 2, fh / 2, Math.min(fw, fh) * 0.36, 0, VFX.util.TAU); g.rect(-fw, -fh, fw * 3, fh * 3); }
    g.clip();
  }
  function inArea(x, y, area, fw, fh) {
    if (!area || area === 'full') return true;
    if (area === 'lower') return y > fh * 0.45;
    if (area === 'upper') return y < fh * 0.55;
    if (area === 'band') return y > fh * 0.3 && y < fh * 0.7;
    if (area === 'left') return x < fw * 0.55;
    if (area === 'right') return x > fw * 0.45;
    if (area === 'center') { const dx = x - fw / 2, dy = y - fh / 2; return dx * dx + dy * dy < Math.pow(Math.min(fw, fh) * 0.38, 2); }
    return true;
  }
  return { register, byId, list, AREAS, clipArea, inArea };
})();
