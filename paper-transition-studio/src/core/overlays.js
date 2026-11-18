// Paper titles on top of a shot: a torn-paper lower third, or a crumpled ball that unfurls into a strip.
// Elements are a registry, like effects: PT.overlays.register({ id, name, group, fields, defaults, draw(ctx, o, lt, ld, W, H) }).
// A shot holds a list of elements (shot.overlays); each runs from o.start for o.length seconds of the shot.
PT.overlays = (() => {
  const U = PT.util, M = PT.materials;
  const POS = [['bottom', 'Lower third'], ['top', 'Top'], ['center', 'Centre']];
  const list = [], byId = {};
  function register(def) {
    def.fields = def.fields || [];
    def.defaults = Object.assign({}, def.defaults);
    for (const f of def.fields) if (!(f.key in def.defaults)) def.defaults[f.key] = f.def;
    list.push(def); byId[def.id] = def;
  }
  const F = PT.fx.P;

  function layout(o, W, H) {
    const S = Math.min(W, H), size = S * 0.082 * (o.size || 1);
    const font = M.FONTS[o.font || 'sans'] || M.FONTS.sans;
    const g = U.canvas(4, 4).getContext('2d');
    g.font = `800 ${size}px ${font}`;
    const tw = g.measureText(o.text || '').width;
    g.font = `600 ${size * 0.5}px ${M.FONTS.sans}`;
    const sw = o.sub ? g.measureText(o.sub).width : 0;
    const w = Math.min(W * 0.9, Math.max(tw, sw) + size * 1.6), h = size * (o.sub ? 2.15 : 1.55);
    const x = o.pos === 'center' ? (W - w) / 2 : W * 0.06;
    const y = o.pos === 'top' ? H * 0.08 : o.pos === 'center' ? (H - h) / 2 : H * 0.88 - h;
    return { x, y, w, h, size, font };
  }
  function textOn(ctx, o, L, reveal) {
    ctx.save();
    ctx.beginPath(); ctx.rect(L.x, L.y - L.h, (L.w) * reveal + 1, L.h * 3); ctx.clip();
    ctx.fillStyle = o.textColor || '#1c1a17'; ctx.textBaseline = 'middle';
    const cy = o.sub ? L.y + L.h * 0.38 : L.y + L.h / 2;
    ctx.font = `800 ${L.size}px ${L.font}`;
    ctx.fillText(o.text || '', L.x + L.size * 0.8, cy, L.w - L.size * 1.6);
    if (o.sub) { ctx.globalAlpha = 0.78; ctx.font = `600 ${L.size * 0.5}px ${M.FONTS.sans}`; ctx.fillText(o.sub, L.x + L.size * 0.8, L.y + L.h * 0.76, L.w - L.size * 1.6); }
    ctx.restore();
  }
  function shadow(ctx, S, k = 1) {
    ctx.shadowColor = `rgba(0,0,0,${0.45 * k})`; ctx.shadowBlur = S * 0.02; ctx.shadowOffsetX = S * 0.004; ctx.shadowOffsetY = S * 0.009;
  }

  function drawTitle(ctx, o, lt, ld, W, H) {
    if (!o.text) return;
    const S = Math.min(W, H), L = layout(o, W, H), seed = o.seed || 7;
    const inD = Math.min(0.7, ld * 0.3), outD = Math.min(0.55, ld * 0.25);
    // 12 fps steps give the hand-made stop-motion feel of the reference packs
    const step = q => Math.floor(q * 12) / 12;
    const tIn = U.clamp(step(lt) / inD), tOut = U.clamp(step(lt - (ld - outD)) / outD);
    if (tIn <= 0 || tOut >= 1) return;
    const sheet = M.sheet({ type: 'paper', material: o.material || 'white', color: o.color, crumple: 0.55, seed }, Math.ceil(L.w), Math.ceil(L.h));
    const jit = (U.h1(Math.floor(lt * 12), seed) - 0.5) * S * 0.002;
    ctx.save();
    ctx.translate(L.x + L.w / 2, L.y + L.h / 2); ctx.rotate(-0.018 + jit * 0.002); ctx.translate(-(L.x + L.w / 2), -(L.y + L.h / 2) + jit);
    if (o.kind === 'unfurl') {
      const open = U.ease.outBack(U.clamp(tIn * 1.15)) * (1 - U.ease.in(tOut));
      const cx = L.x + L.w / 2, cy = L.y + L.h / 2, N = 48, ballR = L.h * 0.55;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const rb = ballR * (0.82 + 0.25 * U.h1(i, seed));
        const k = Math.min(Math.abs((L.w / 2) / (ca || 1e-6)), Math.abs((L.h / 2) / (sa || 1e-6)));
        const torn = 1 + 0.02 * U.noise1(i * 0.9, seed);
        const r = U.lerp(rb, k * torn, U.clamp(open));
        pts.push([cx + ca * r * (1 + (1 - Math.abs(open - 0.5) * 2) * 0.15 * ca * ca), cy + sa * r]);
      }
      const path = U.pathFrom(pts);
      ctx.save(); shadow(ctx, S); ctx.fillStyle = '#ddd'; ctx.fill(path); ctx.restore();
      ctx.save(); ctx.clip(path);
      ctx.drawImage(sheet, L.x, L.y, L.w, L.h);
      const squeeze = 1 - U.clamp(open);
      if (squeeze > 0.02) { ctx.globalAlpha = squeeze; ctx.drawImage(M.ballSprite(o.color && o.material === 'color' ? o.color : '#efede8', 256, seed), cx - ballR * 1.3, cy - ballR * 1.3, ballR * 2.6, ballR * 2.6); ctx.globalAlpha = 1; }
      ctx.restore();
      if (open > 0.85) textOn(ctx, o, L, U.clamp((open - 0.85) / 0.15) * (1 - tOut));
    } else {
      // torn label: a tear edge reveals the strip left→right, then tears away to the right
      const r1 = U.ease.out(tIn), r0 = U.ease.in(tOut);
      const x0 = L.x + L.w * r0, x1 = L.x + L.w * r1;
      const prof = U.tornProfile(seed, 0.5, L.h * 2.5);
      const top = U.tornLine(x0, L.y, x1, L.y, U.tornProfile(seed + 1, 0.25, L.h * 2), L.h / 14);
      const right = U.tornLine(x1, L.y, x1, L.y + L.h, prof, L.h / 14);
      const bot = U.tornLine(x1, L.y + L.h, x0, L.y + L.h, U.tornProfile(seed + 2, 0.25, L.h * 2), L.h / 14);
      const left = U.tornLine(x0, L.y + L.h, x0, L.y, U.tornProfile(seed + 3, 0.5, L.h * 2.5), L.h / 14);
      const poly = top.concat(right, bot, left), path = U.pathFrom(poly);
      ctx.save(); shadow(ctx, S); ctx.fillStyle = '#ddd'; ctx.fill(path); ctx.restore();
      ctx.save(); ctx.clip(path); ctx.drawImage(sheet, L.x, L.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = S * 0.006; ctx.stroke(U.pathFrom(right, false)); ctx.stroke(U.pathFrom(left, false));
      textOn(ctx, o, L, U.clamp((tIn - 0.35) / 0.65));
      ctx.restore();
    }
    ctx.restore();
  }

  const titleFields = [
    { key: 'text', label: 'Text', type: 'text', def: 'Your title' },
    { key: 'sub', label: 'Second line', type: 'text', def: '' },
    F.select('pos', 'Where', POS, 'bottom'),
    F.select('material', 'Paper', M.MATERIALS.filter(m => !['newspaper', 'notebook', 'giftwrap'].includes(m[0])), 'white'),
    F.color('color', 'Paper colour (coloured paper)', '#f0c43c'),
    F.select('font', 'Font', [['sans', 'Clean sans'], ['serif', 'Headline serif'], ['hand', 'Handwritten']], 'sans'),
    F.color('textColor', 'Text colour', '#1c1a17'),
    F.range('size', 'Size', 0.5, 2, 0.05, 1),
  ];
  register({ id: 'label', name: 'Torn paper label', group: 'Titles', fields: titleFields, draw: (ctx, o, lt, ld, W, H) => drawTitle(ctx, Object.assign({}, o, { kind: 'label' }), lt, ld, W, H) });
  register({ id: 'unfurl', name: 'Crumpled ball → paper strip', group: 'Titles', fields: titleFields, draw: (ctx, o, lt, ld, W, H) => drawTitle(ctx, Object.assign({}, o, { kind: 'unfurl' }), lt, ld, W, H) });

  // shot.overlay (old single title) -> shot.overlays list
  function of(shot) {
    if (!shot.overlays) {
      shot.overlays = [];
      if (shot.overlay && shot.overlay.kind && shot.overlay.kind !== 'none') shot.overlays.push(Object.assign({ start: 0, length: 0 }, shot.overlay));
      delete shot.overlay;
    }
    return shot.overlays;
  }
  function create(kind) {
    const def = byId[kind];
    return Object.assign({ kind, start: 0, length: 0, seed: Math.floor(Math.random() * 9999) + 1 }, def ? JSON.parse(JSON.stringify(def.defaults)) : {});
  }
  // draw every element of a shot; lt = seconds into the shot's hold, ld = hold length
  function draw(ctx, shot, lt, ld, W, H) {
    for (const o of of(shot)) {
      const def = byId[o.kind];
      if (!def) continue;
      const st = Math.max(0, +o.start || 0), len = +o.length > 0 ? Math.min(+o.length, ld - st) : ld - st;
      if (len <= 0 || lt < st || lt > st + len) continue;
      const P = Object.assign({}, def.defaults, o);
      ctx.save();
      try { def.draw(ctx, P, lt - st, len, W, H); } catch (e) { console.warn('element', o.kind, e); }
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  return { POS, list, byId, register, of, create, draw };
})();
