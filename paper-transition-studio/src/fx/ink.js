// Ink transitions: one organic mask engine, 15 styles (drops, bleeds, watercolour, brush strokes, splashes, plumes,
// drips, ensō, blots, halftone, hatching, splatter, corner leaks, spirals). Ink spreads first in its own colour, the new
// scene blooms inside it (the "lag"), with watercolour edge darkening and pigment grain. User request 2026-10-29:
// "add many more varients of ink effects atleast 50 types, for everykind of videos".
(() => {
  const U = PT.util, { range, select, bool, color } = PT.fx.P;
  const fields = new Map();

  // ---- scalar "arrival time" field per style, normalised to 0..1 (cached at low resolution) ----
  function buildField(P, w, h, seed) {
    const S = Math.min(w, h), F = new Float32Array(w * h), R = U.rng(seed);
    const style = P.style, warp = P.warp, n = Math.max(1, Math.round(P.count));
    const a = (+P.dir || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    const cx = P.cx * w, cy = P.cy * h, diag = Math.hypot(w, h);
    // drop / splat centres
    const pts = [];
    if (style === 'drop' || style === 'splatter') {
      const k = style === 'splatter' ? n * 6 : n;
      for (let i = 0; i < k; i++) {
        const first = i === 0 && style === 'drop';
        pts.push({ x: first ? cx : (0.08 + R() * 0.84) * w, y: first ? cy : (0.08 + R() * 0.84) * h,
          t: style === 'splatter' ? R() * 0.55 : (i / k) * 0.35 * (n > 1 ? 1 : 0), r: S * (style === 'splatter' ? 0.04 + R() * 0.16 : 1) });
      }
    }
    const spikes = [];
    for (let i = 0; i < 64; i++) spikes.push(Math.pow(R(), 3));
    const drops = [];
    if (style === 'splash') for (let i = 0; i < 26; i++) { const an = R() * Math.PI * 2, rr = S * (0.15 + R() * 0.55); drops.push({ x: cx + Math.cos(an) * rr, y: cy + Math.sin(an) * rr, r: S * (0.008 + R() * 0.03), t: rr / S * 0.55 }); }
    const corners = n >= 4 ? [[0, 0], [w, 0], [0, h], [w, h]] : n >= 2 ? [[0, 0], [w, h]] : [[0, h]];
    const k = n, stg = k > 1 ? 0.55 / k : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const qx = x + warp * S * U.fbm2(x / S * 1.6, y / S * 1.6, seed, 3);
      const qy = y + warp * S * U.fbm2(x / S * 1.6 + 7, y / S * 1.6, seed + 5, 3);
      let v;
      switch (style) {
        case 'drop': { v = 9; for (const d of pts) v = Math.min(v, d.t + Math.hypot(qx - d.x, qy - d.y) / diag); break; }
        case 'splatter': {
          v = 0.62 + Math.hypot(qx - w / 2, qy - h / 2) / diag * 0.5;
          for (const d of pts) { const an = Math.atan2(qy - d.y, qx - d.x), sp = 1 + 0.35 * U.noise1(an * 2.2 + d.x, seed); v = Math.min(v, d.t + Math.hypot(qx - d.x, qy - d.y) / (d.r * sp) * 0.22); }
          break;
        }
        case 'edges': v = Math.min(qx, qy, w - qx, h - qy) / (S / 2); break; // edges first, closing in on the centre
        case 'side': case 'wash': {
          const s = ((qx - w / 2) * dx + (qy - h / 2) * dy) / diag, u = (-(qx - w / 2) * dy + (qy - h / 2) * dx) / S;
          v = s;
          if (P.tendril > 0) v -= P.tendril * 0.18 * Math.pow(1 - Math.abs(U.noise2(s * 3, u * 14, seed + 9)), 6);
          break;
        }
        case 'strokes': {
          const vert = P.orient === 'v', diagO = P.orient === 'd';
          let uu, ww;
          if (diagO) { uu = (qx / w + qy / h) / 2; ww = (qx / w - qy / h + 1) / 2; } else { uu = vert ? qy / h : qx / w; ww = vert ? qx / w : qy / h; }
          v = 1.05;
          for (let j = 0; j < k; j++) {
            const c = (j + 0.5) / k, hw = 0.5 / k * 1.45 * (1 + 0.22 * U.noise1(uu * 26 + j * 7, seed + j));
            if (Math.abs(ww - c) > hw) continue;
            const along = (j % 2 && P.alt) ? 1 - uu : uu;
            let t = j * stg + along * (1 - stg * (k - 1)) * 0.92;
            const s = U.noise2(uu * 4, ww * 140, seed + 31);
            t += 0.12 * P.dry * Math.max(0, s);
            const edge = Math.abs(ww - c) / hw;
            t += edge > 0.8 ? (edge - 0.8) * 0.4 : 0;
            v = Math.min(v, t);
          }
          break;
        }
        case 'splash': {
          const an = Math.atan2(qy - cy, qx - cx), fi = (an / (Math.PI * 2) + 0.5) * 64, i0 = Math.floor(fi) % 64, f = fi - Math.floor(fi);
          const sp = U.lerp(spikes[i0], spikes[(i0 + 1) % 64], f * f * (3 - 2 * f));
          v = Math.hypot(qx - cx, qy - cy) / S / (0.55 + 1.6 * sp);
          for (const d of drops) v = Math.min(v, d.t + Math.hypot(qx - d.x, qy - d.y) / d.r * 0.05);
          break;
        }
        case 'plume': {
          const up = (+P.dir || 270) === 270 ? 1 - qy / h : qy / h;
          const t1 = U.fbm2(qx / S * 2.2, qy / S * 2.2 - 0.0, seed + 3, 4), t2 = U.fbm2(qx / S * 2.2 + t1 * 1.8, qy / S * 2.2 + t1 * 1.8, seed + 11, 4);
          v = up * 0.7 + t2 * 0.4;
          break;
        }
        case 'drips': {
          const top = (+P.dir || 90) === 90;
          const yy = top ? qy / h : 1 - qy / h;
          const L = Math.pow((U.noise1(qx / S * 9, seed) + 1) / 2, 3) * 0.75 + 0.05 * U.noise1(qx / S * 45, seed + 2);
          v = yy - L;
          break;
        }
        case 'enso': {
          const r = Math.hypot(qx - cx, qy - cy), R0 = S * 0.32, th = Math.atan2(qy - cy, qx - cx);
          const a01 = ((th + Math.PI / 2) / (Math.PI * 2) + 1) % 1;
          v = a01 * 0.42 + Math.abs(r - R0) / S * 1.6;
          break;
        }
        case 'blot': { const ddx = Math.abs(qx - cx); v = Math.hypot(ddx, qy - cy) / S - 0.42 * U.fbm2(ddx / S * 2.6, qy / S * 2.6, seed + 4, 4); break; }
        case 'halftone': {
          const c = S / (8 + n * 3), gx = Math.floor(x / c), gy = Math.floor(y / c);
          const ccx = (gx + 0.5) * c, ccy = (gy + 0.5) * c;
          const ct = (((ccx - w / 2) * dx + (ccy - h / 2) * dy) / diag + 0.5) * 0.75 + U.h2(gx, gy, seed) * 0.08;
          v = ct + Math.hypot(x - ccx, y - ccy) / c * 0.22;
          break;
        }
        case 'hatch': {
          const s = (((qx - w / 2) * dx + (qy - h / 2) * dy) / diag + 0.5), per = S / (14 + n * 4);
          v = s * 0.8 + 0.22 * Math.abs(Math.sin(Math.PI * (qx + qy) / per)) + 0.06 * Math.abs(Math.sin(Math.PI * (qx - qy) / (per * 1.7)));
          break;
        }
        case 'corners': { v = 9; for (const [ox, oy] of corners) v = Math.min(v, Math.hypot(qx - ox, qy - oy) / diag); break; }
        case 'spiral': {
          const r = Math.hypot(qx - cx, qy - cy) / (diag / 2), th = Math.atan2(qy - cy, qx - cx) / (Math.PI * 2);
          v = r * 0.6 + (((th + r * 1.6 * n * 0.5) % 1) + 1) % 1 * 0.4;
          break;
        }
        default: v = qx / w;
      }
      F[y * w + x] = v + P.rough * 0.05 * U.fbm2(x / S * 14, y / S * 14, seed + 21, 2);
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < F.length; i++) { if (F[i] < lo) lo = F[i]; if (F[i] > hi) hi = F[i]; }
    const sc = 1 / Math.max(1e-6, hi - lo);
    for (let i = 0; i < F.length; i++) F[i] = (F[i] - lo) * sc;
    // pigment grain, used for watercolour granulation and edge break-up
    const G = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) G[y * w + x] = U.noise2(x * 0.45, y * 0.45, seed + 77) * 0.6 + (U.h2(x, y, seed) - 0.5) * 0.8;
    return { F, G, w, h };
  }
  function field(P, W, H, seed) {
    const lw = W >= H ? Math.min(640, W) : Math.round(Math.min(640, H) * W / H), lh = Math.max(2, Math.round(lw * H / W));
    const key = [lw, lh, seed, P.style, P.warp, P.count, P.dir, P.cx, P.cy, P.tendril, P.orient, P.alt, P.dry, P.rough].join('|');
    let f = fields.get(key);
    if (!f) { f = buildField(P, lw, lh, seed); fields.set(key, f); if (fields.size > 10) fields.delete(fields.keys().next().value); }
    return f;
  }
  const smoothEdge = (e0, e1, x) => { const t = U.clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

  PT.fx.register({
    id: 'inkfx', name: 'Ink transition', family: 'Ink', sfx: 'brush', dur: 1.6, ease: 'linear',
    desc: 'Ink spreads across the frame and the next scene blooms inside it — drops, bleeds, watercolour, brush, splashes, plumes, drips, ensō and more.',
    params: [
      select('style', 'Ink style', [['drop', 'Ink drop bloom'], ['edges', 'Bleed in from the edges'], ['side', 'Ink wave from one side'], ['wash', 'Watercolour wash'],
        ['strokes', 'Brush strokes'], ['splash', 'Ink splash'], ['splatter', 'Splatter burst'], ['plume', 'Ink in water (plume)'], ['drips', 'Ink drips'],
        ['enso', 'Ensō circle'], ['blot', 'Ink blot (mirror)'], ['halftone', 'Halftone dots'], ['hatch', 'Pen hatching'], ['corners', 'Corner leaks'], ['spiral', 'Ink swirl']], 'drop'),
      color('ink', 'Ink colour', '#0e0e12'),
      range('lag', 'Ink before the new scene (0 = clean)', 0, 0.6, 0.01, 0), // user rule 2026-10-29: always 0 by default
      range('inkEdge', 'Ink edge on the new scene', 0, 1, 0.01, 0.9),
      range('opacity', 'Ink strength', 0.2, 1, 0.01, 0.95),
      bool('watercolor', 'Watercolour edges + grain', false),
      range('count', 'Drops / strokes / density', 1, 8, 1, 1),
      select('dir', 'Direction', [['0', '→'], ['45', '↘'], ['90', '↓'], ['135', '↙'], ['180', '←'], ['225', '↖'], ['270', '↑'], ['315', '↗']], '0'),
      range('cx', 'Centre X', 0, 1, 0.01, 0.5),
      range('cy', 'Centre Y', 0, 1, 0.01, 0.5),
      range('warp', 'Organic wobble', 0, 0.35, 0.005, 0.12),
      range('rough', 'Edge detail', 0, 1, 0.01, 0.5),
      range('feather', 'Edge softness', 0, 1, 0.01, 0.3),
      range('tendril', 'Tendrils (wave / wash)', 0, 1, 0.01, 0.4),
      select('orient', 'Strokes run', [['h', 'Horizontal'], ['v', 'Vertical'], ['d', 'Diagonal']], 'h'),
      bool('alt', 'Strokes alternate direction', true),
      range('dry', 'Dry-brush gaps', 0, 1, 0.01, 0.5),
      bool('blood', 'Blood look (dark dried rim + wet sheen)', false),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H } = env, f = field(P, W, H, env.seed), { F, G, w, h } = f;
      const lag = env.matte ? 0 : P.lag, e = env.E(p);
      const Ti = U.lerp(-0.03, 1.04, U.clamp(e / Math.max(0.01, 1 - lag)));
      const Tb = U.lerp(-0.03, 1.06, U.clamp((e - lag) / Math.max(0.01, 1 - lag)));
      const fe = 0.004 + P.feather * 0.03, wc = P.watercolor && !env.matte, blood = P.blood && !env.matte;
      const mc = env.tmp('inkMask', w, h), mg = mc.getContext('2d'), md = mg.createImageData(w, h), M = md.data;
      const ic = env.tmp('inkLayer', w, h), ig = ic.getContext('2d'), id = ig.createImageData(w, h), I = id.data;
      const [r0, g0, b0] = U.hexRgb(P.ink), op = P.opacity, rough = 0.012 * (0.4 + P.rough);
      for (let i = 0, n = w * h; i < n; i++) {
        const v = F[i] + G[i] * rough, o = i * 4;
        const bIn = smoothEdge(Tb + fe, Tb - fe, v);
        M[o + 3] = bIn * 255;
        // solid inked border (core w0) that fades into the new scene over w1
        const dIn = Math.max(0, Tb - v), w0 = blood ? 0.012 : wc ? 0.006 : 0.009, w1 = blood ? 0.03 : wc ? 0.04 : 0.022;
        const edge = P.inkEdge > 0 && !env.matte && bIn > 0.002 ? bIn * P.inkEdge * (dIn < w0 ? 1 : Math.exp(-(dIn - w0) / w1)) : 0;
        if (edge > 0.004) {
          // inked border just inside the new scene: keeps the ink colour visible even with no ink before the scene
          const k = Math.min(1, edge * (blood ? 1.15 : wc ? 0.75 + 0.35 * G[i] : 1)), dk = blood ? (dIn < w0 ? 0.45 : 0.15) + 0.2 * Math.max(0, G[i]) : 0;
          I[o] = r0 * (1 - dk); I[o + 1] = g0 * (1 - dk); I[o + 2] = b0 * (1 - dk); I[o + 3] = Math.min(1, k * P.opacity) * 255;
        }
        if (lag > 0) {
          const iIn = smoothEdge(Ti + fe, Ti - fe, v) * (1 - bIn);
          if (iIn > 0.002) {
            const d = Ti - v; // distance behind the ink front
            let a = iIn * op, dark = 0, spec = 0;
            if (blood) {
              // blood stain: thick, almost opaque, a darker dried rim, a darker clotted core, and a wet sheen just inside the rim
              const rim = Math.exp(-Math.max(0, d) / 0.01), inner = Math.exp(-Math.max(0, d) / 0.045);
              dark = 0.5 * rim + 0.18 * (1 - inner) + 0.12 * Math.max(0, G[i]);
              spec = Math.max(0, G[i] - 0.3) * inner * (1 - rim) * 0.7;
              a = iIn; // blood is opaque
            } else if (wc) { const edgeK = Math.exp(-Math.max(0, d) / 0.018); a *= 0.62 + 0.38 * edgeK + 0.12 * G[i]; dark = 0.35 * edgeK; }
            else a *= 0.92 + 0.08 * G[i];
            I[o] = r0 * (1 - dark) + 255 * spec; I[o + 1] = g0 * (1 - dark) + 200 * spec; I[o + 2] = b0 * (1 - dark) + 200 * spec; I[o + 3] = U.clamp(a) * 255;
          }
        }
      }
      mg.putImageData(md, 0, 0);
      ctx.drawImage(A, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const t = env.tmp('inkB', W, H), tg = t.getContext('2d');
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(B, 0, 0);
      tg.globalCompositeOperation = 'destination-in'; tg.imageSmoothingQuality = 'high'; tg.drawImage(mc, 0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      ctx.drawImage(t, 0, 0);
      // ink layer (the ink ahead of the scene + the inked border) never overlaps itself, so one pass on top
      if (!env.matte && (lag > 0 || P.inkEdge > 0)) { ig.putImageData(id, 0, 0); ctx.drawImage(ic, 0, 0, W, H); }
    },
  });

  // ---- 54 named looks ----
  const INK = { black: '#0e0e12', red: '#8e0d14', crimson: '#b3122a', indigo: '#1c2a5e', gold: '#b8892a', white: '#f4f1ea', sepia: '#3b2412', teal: '#0f4c5c', purple: '#4a1d5e', orange: '#d4621a', blue: '#1d5fa8', green: '#1f5c3a' };
  const pr = (id, name, params, dur, note) => PT.fx.preset('ink-' + id, name, 'inkfx', params, dur, note);
  // drops
  pr('drop', 'Ink drop', { style: 'drop', ink: INK.black }, 1.6, 'A black ink drop blooms open');
  pr('drop-red', 'Red ink drop', { style: 'drop', ink: INK.red, cx: 0.4, cy: 0.45 }, 1.6, 'Crime, war, danger');
  pr('drops-3', 'Three ink drops', { style: 'drop', count: 3 }, 1.8);
  pr('rain', 'Ink rain (many drops)', { style: 'drop', count: 8, warp: 0.08 }, 1.8);
  pr('drop-white', 'White ink drop (dark scenes)', { style: 'drop', ink: INK.white }, 1.6);
  pr('drop-gold', 'Gold ink drop', { style: 'drop', ink: INK.gold, cx: 0.55, watercolor: true }, 1.7, 'History, royalty, wealth');
  pr('drop-clean', 'Clean organic bloom', { style: 'drop', warp: 0.16 }, 1.4, 'No ink colour, just an organic reveal');
  pr('drop-cover', 'Big ink bloom', { style: 'drop', warp: 0.22, inkEdge: 1 }, 1.8, 'Raise "Ink before the new scene" for a full ink flood');
  // bleeds and waves
  pr('edges', 'Ink bleeds in from the edges', { style: 'edges', warp: 0.14 }, 1.6);
  pr('edges-sepia', 'Sepia bleed (old times)', { style: 'edges', ink: INK.sepia, watercolor: true }, 1.7);
  pr('wave-left', 'Ink wave from the left', { style: 'side', dir: '0' }, 1.4);
  pr('wave-down', 'Ink wave from the top', { style: 'side', dir: '90', tendril: 0.6 }, 1.4);
  pr('wave-diag', 'Indigo ink wave (diagonal)', { style: 'side', dir: '45', ink: INK.indigo }, 1.5);
  pr('tendrils', 'Ink tendrils', { style: 'side', dir: '180', tendril: 1, warp: 0.2 }, 1.6);
  // watercolour
  pr('wc-teal', 'Watercolour wash – teal', { style: 'wash', watercolor: true, ink: INK.teal, warp: 0.25, dir: '0' }, 1.8);
  pr('wc-blue', 'Watercolour wash – blue', { style: 'wash', watercolor: true, ink: INK.blue, warp: 0.25, dir: '315' }, 1.8);
  pr('wc-warm', 'Watercolour wash – warm', { style: 'wash', watercolor: true, ink: INK.orange, warp: 0.25, dir: '180' }, 1.8);
  pr('wc-bloom', 'Watercolour bloom – purple', { style: 'drop', watercolor: true, ink: INK.purple, warp: 0.2, count: 2 }, 1.8);
  pr('wc-edges', 'Watercolour frame bleed', { style: 'edges', watercolor: true, ink: INK.green, warp: 0.2 }, 1.8);
  pr('wc-clean', 'Watercolour edge reveal', { style: 'wash', watercolor: true, ink: INK.sepia, warp: 0.22, inkEdge: 0.35 }, 1.6, 'Only a thin pigment edge');
  // brush
  pr('brush-3', 'Three brush strokes', { style: 'strokes', count: 3 }, 1.6);
  pr('brush-5', 'Five fast strokes', { style: 'strokes', count: 5, dry: 0.4 }, 1.5);
  pr('brush-v', 'Vertical brush strokes', { style: 'strokes', count: 4, orient: 'v' }, 1.6);
  pr('brush-diag', 'Diagonal brush strokes', { style: 'strokes', count: 3, orient: 'd' }, 1.6);
  pr('brush-1', 'One big brush swipe', { style: 'strokes', count: 1, dry: 0.7 }, 1.2);
  pr('brush-red', 'Red brush strokes', { style: 'strokes', count: 3, ink: INK.crimson }, 1.6);
  pr('brush-dry', 'Dry brush (scratchy)', { style: 'strokes', count: 4, dry: 1, rough: 0.9 }, 1.6);
  pr('brush-white', 'White brush strokes', { style: 'strokes', count: 3, ink: INK.white }, 1.6);
  // splash and splatter
  pr('splash', 'Ink splash', { style: 'splash', warp: 0.06 }, 1.4);
  pr('splash-red', 'Red ink splash', { style: 'splash', ink: INK.red, cx: 0.45 }, 1.4, 'Shock, violence');
  pr('splatter', 'Splatter burst', { style: 'splatter', count: 3 }, 1.6);
  pr('splatter-gold', 'Gold splatter', { style: 'splatter', count: 3, ink: INK.gold, watercolor: true }, 1.6, 'Celebration, wealth');
  pr('splash-corner', 'Ink splash from a corner', { style: 'splash', cx: 0.1, cy: 0.88 }, 1.5);
  pr('splatter-dense', 'Dense splatter', { style: 'splatter', count: 7 }, 1.7);
  // plumes and drips
  pr('plume', 'Ink in water (rising)', { style: 'plume', dir: '270', warp: 0.05 }, 2.0, 'Calm, mysterious');
  pr('plume-indigo', 'Indigo ink in water', { style: 'plume', dir: '270', ink: INK.indigo, watercolor: true }, 2.0);
  pr('plume-down', 'Ink sinking from the top', { style: 'plume', dir: '90' }, 2.0);
  pr('plume-white', 'White smoke-ink (dark scenes)', { style: 'plume', dir: '270', ink: INK.white }, 2.0);
  pr('drips', 'Ink drips down', { style: 'drips', dir: '90' }, 1.7);
  pr('drips-red', 'Red drips (horror / crime)', { style: 'drips', dir: '90', ink: INK.red }, 1.7);
  pr('drips-up', 'Ink rising up', { style: 'drips', dir: '270' }, 1.7);
  pr('drips-gold', 'Gold drips', { style: 'drips', dir: '90', ink: INK.gold }, 1.7);
  // symbolic and graphic
  pr('enso', 'Ensō circle (Zen brush)', { style: 'enso', warp: 0.04, rough: 0.8 }, 1.8, 'Philosophy, Asia, calm');
  pr('enso-red', 'Red ensō', { style: 'enso', ink: INK.crimson, warp: 0.04 }, 1.8);
  pr('blot', 'Ink blot (mirror)', { style: 'blot' }, 1.6, 'Psychology, mystery');
  pr('blot-indigo', 'Indigo ink blot', { style: 'blot', ink: INK.indigo, watercolor: true }, 1.6);
  pr('halftone', 'Halftone dots', { style: 'halftone', count: 3, dir: '0', warp: 0, rough: 0 }, 1.5, 'Comics, print, retro');
  pr('halftone-red', 'Red halftone (diagonal)', { style: 'halftone', count: 4, dir: '45', ink: INK.red, warp: 0, rough: 0 }, 1.5);
  pr('hatch', 'Pen hatching', { style: 'hatch', count: 2, dir: '45', warp: 0.03 }, 1.6, 'Sketch, documents, plans');
  pr('hatch-blue', 'Blue pen scribble', { style: 'hatch', count: 3, dir: '0', ink: INK.blue, warp: 0.05 }, 1.6, 'School, notes');
  pr('corners', 'Ink leaks from four corners', { style: 'corners', count: 4, warp: 0.15 }, 1.6);
  pr('corners-2', 'Ink leaks from two corners', { style: 'corners', count: 2, warp: 0.15, ink: INK.sepia }, 1.6);
  pr('swirl', 'Ink swirl', { style: 'spiral', count: 2, warp: 0.06 }, 1.8);
  pr('swirl-gold', 'Gold ink swirl', { style: 'spiral', count: 3, ink: INK.gold, watercolor: true }, 1.8);
  // blood stains (user request 2026-10-29: "blood stanis types ink animations") — crime, war, violence, medical
  const BLOOD = '#7a0306', DRIED = '#4a0d08';
  pr('blood-drop', 'Blood drop', { style: 'drop', ink: BLOOD, blood: true, warp: 0.09, rough: 0.7, cx: 0.48, cy: 0.42 }, 1.6, 'Crime, war, violence');
  pr('blood-pool', 'Blood pool spreading', { style: 'drop', ink: BLOOD, blood: true, warp: 0.13, feather: 0.15 }, 2.2, 'A pool spreads over the frame, the next scene opens in it');
  pr('blood-splatter', 'Blood splatter', { style: 'splatter', ink: BLOOD, blood: true, count: 3, rough: 0.8 }, 1.6);
  pr('blood-spray', 'Blood spray (fine)', { style: 'splatter', ink: BLOOD, blood: true, count: 8, rough: 0.9 }, 1.7);
  pr('blood-splash', 'Blood splash', { style: 'splash', ink: BLOOD, blood: true, cx: 0.55, cy: 0.45, warp: 0.05 }, 1.4);
  pr('blood-splash-corner', 'Blood splash from a corner', { style: 'splash', ink: BLOOD, blood: true, cx: 0.9, cy: 0.12 }, 1.5);
  pr('blood-drips', 'Blood drips down', { style: 'drips', dir: '90', ink: BLOOD, blood: true, rough: 0.7 }, 1.8);
  pr('blood-drips-heavy', 'Heavy blood run', { style: 'drips', dir: '90', ink: BLOOD, blood: true, warp: 0.06 }, 2.0);
  pr('blood-smear', 'Blood smear (swipe)', { style: 'strokes', count: 2, orient: 'h', alt: false, dry: 1, rough: 0.9, ink: BLOOD, blood: true }, 1.4);
  pr('blood-smear-diag', 'Blood smear (diagonal)', { style: 'strokes', count: 1, orient: 'd', dry: 1, rough: 0.9, ink: BLOOD, blood: true }, 1.3);
  pr('blood-edges', 'Blood seeping in from the edges', { style: 'edges', ink: BLOOD, blood: true, warp: 0.15 }, 1.8);
  pr('blood-stain-dried', 'Dried blood stain', { style: 'drop', count: 2, ink: DRIED, blood: true, watercolor: true, warp: 0.16 }, 1.8, 'Old crime / archive evidence');
  pr('blood-cover', 'Screen floods with blood', { style: 'side', dir: '90', tendril: 0.8, ink: BLOOD, blood: true }, 2.0, 'Shock moments');
})();
