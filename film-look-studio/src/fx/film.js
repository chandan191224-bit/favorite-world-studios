// Film & damage: grain, dust & hair, line scratches, projector gates, gate weave, frame slips and lamp flicker.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;

  const TAU = Math.PI * 2;
  const MONO = '"JetBrains Mono", ui-monospace, Consolas, "Noto Sans Devanagari", "Mukta", monospace';
  const single = v => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, 40);

  // Bounded content-addressed caches for per-film-frame tiles and gate artwork. These must NOT go into
  // the shared U.cache: a long export would park one canvas per film frame there. A handful of entries,
  // evicted to a small canvas pool, keeps memory flat and every result deterministic.
  const tilePool = [];
  function shelf(max) {
    const m = new Map();
    return {
      get(key, make) {
        if (m.has(key)) { const v = m.get(key); m.delete(key); m.set(key, v); return v; }
        const v = make();
        m.set(key, v);
        while (m.size > max) {
          const oldest = m.keys().next().value, evicted = m.get(oldest);
          m.delete(oldest);
          if (evicted && evicted.width !== undefined && tilePool.length < 4) tilePool.push(evicted);
        }
        return v;
      },
    };
  }
  const tiles = shelf(8), art = shelf(8);
  function tileCanvas(w, h) {
    const c = tilePool.pop() || U.canvas(w, h);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  }

  // ---------- grain ----------
  function monoTile(tw, th, seed, exc) {
    const c = tileCanvas(tw, th), g = c.getContext('2d'), img = g.createImageData(tw, th), d = img.data;
    for (let y = 0, i = 0; y < th; y++) for (let x = 0; x < tw; x++, i += 4) {
      // two hashes summed = cheap triangular noise: bell-shaped like real silver grain
      const v = 128 + (U.h2(x, y, seed) + U.h2(x, y, seed + 1657) - 1) * exc;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function chromaTile(tw, th, seed, exc) {
    const c = tileCanvas(tw, th), g = c.getContext('2d'), img = g.createImageData(tw, th), d = img.data;
    for (let y = 0, i = 0; y < th; y++) for (let x = 0; x < tw; x++, i += 4) {
      d[i] = 128 + (U.h2(x, y, seed + 71) + U.h2(x, y, seed + 937) - 1) * exc;
      d[i + 1] = 128;  // green stays neutral, so the overlay blend only wobbles colour
      d[i + 2] = 128 + (U.h2(x, y, seed + 313) + U.h2(x, y, seed + 1543) - 1) * exc;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // grain lives in the mids: weight the tile by 4·l·(1−l) sampled from the picture at low resolution
  function grainMask(P, e) {
    const { W, H } = e, mw = 176, mh = Math.max(2, Math.round(176 * H / W));
    const c = U.tmp('film:grainMask', mw, mh), g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.imageSmoothingEnabled = true;
    g.clearRect(0, 0, mw, mh); g.drawImage(e.src(), 0, 0, mw, mh);
    const img = g.getImageData(0, 0, mw, mh), d = img.data, k = U.clamp(P.midweight);
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = (255 * (1 + (4 * l * (1 - l) - 1) * k)) | 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  register({
    id: 'grain', name: 'Film grain', family: 'film', kind: 'process',
    desc: 'Per-frame silver grain. A low grain rate holds the noise for the 8 mm feel; colour grain adds emulsion speckle.',
    params: [
      P.range('amount', 'Amount', 0, 0.25, 0.005, 0.08),
      P.range('size', 'Grain size (px at 1080)', 0.5, 3, 0.1, 1.2),
      P.range('filmFps', 'Grain rate (fps)', 6, 30, 1, 24),
      P.range('chroma', 'Colour grain', 0, 1, 0.05, 0),
      P.range('midweight', 'Mids only (clean blacks & whites)', 0, 1, 0.05, 1),
    ],
    process(g, P, e) {
      if (P.amount <= 0.004 && P.chroma <= 0.004) return;
      const { W, H, S } = e, fi = e.film(Math.max(6, P.filmFps));
      // one noise sample per grain cell; the tile is capped near half resolution and upscaled
      let cell = Math.max(1, Math.round(P.size * S));
      let tw = Math.ceil(W / cell), th = Math.ceil(H / cell);
      if (tw * th > 700000) { cell = Math.ceil(cell * Math.sqrt(tw * th / 700000)); tw = Math.ceil(W / cell); th = Math.ceil(H / cell); }
      const soft = P.size < 1.5;  // fine stock reads slightly soft, coarse 8 mm reads as crisp blocks
      const mask = P.midweight > 0.004 ? grainMask(P, e) : null;
      if (P.amount > 0.004) {
        const luma = tiles.get(`gm|${e.seed}|${fi}|${cell}|${tw}x${th}|${Math.round(P.amount * 200)}`,
          () => monoTile(tw, th, (e.seed + fi * 131) | 0, Math.min(118, P.amount * 230)));
        const full = U.tmp('film:grainFull', W, H), fg = U.ctx2(full);
        fg.imageSmoothingEnabled = soft; if (soft) fg.imageSmoothingQuality = 'high';
        fg.drawImage(luma, 0, 0, W, H);
        if (mask) {
          fg.globalCompositeOperation = 'destination-in';
          fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high';
          fg.drawImage(mask, 0, 0, W, H);
          fg.globalCompositeOperation = 'source-over';
        }
        g.globalCompositeOperation = 'overlay';
        g.drawImage(full, 0, 0);
      }
      if (P.chroma > 0.004) {
        const chr = tiles.get(`gc|${e.seed}|${fi}|${cell}|${tw}x${th}|${Math.round(P.chroma * 20)}`,
          () => chromaTile(tw, th, (e.seed + fi * 131 + 7777) | 0, 60));
        const cf = U.tmp('film:grainChroma', W, H), cg = U.ctx2(cf);
        cg.imageSmoothingEnabled = soft; if (soft) cg.imageSmoothingQuality = 'high';
        cg.drawImage(chr, 0, 0, W, H);
        if (mask) {
          cg.globalCompositeOperation = 'destination-in';
          cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
          cg.drawImage(mask, 0, 0, W, H);
          cg.globalCompositeOperation = 'source-over';
        }
        g.globalCompositeOperation = 'overlay';
        g.globalAlpha = Math.min(1, P.chroma * 0.16);
        g.drawImage(cf, 0, 0);
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
    },
  });
  preset('grain-fine', 'Grain: fine 35 mm', 'grain', { amount: 0.05, size: 0.9 });
  preset('grain-classic', 'Grain: classic', 'grain', {});
  preset('grain-16mm', 'Grain: 16 mm', 'grain', { amount: 0.12, size: 1.6 });
  preset('grain-8mm', 'Grain: 8 mm held frames', 'grain', { amount: 0.16, size: 2.2, filmFps: 12, midweight: 0.8 });
  preset('grain-colour', 'Grain: colour speckle', 'grain', { amount: 0.07, chroma: 0.7 });

  // ---------- dust, hair & stains ----------
  register({
    id: 'dust', name: 'Dust, hair & stains', family: 'film', kind: 'overlay', blend: 'source-over',
    desc: 'Projector dirt: dark specks and white negative sparkle re-rolled every film frame, wandering hairs, soft emulsion stains.',
    params: [
      P.range('density', 'Specks per frame', 0, 12, 0.5, 3),
      P.range('size', 'Speck size (% of frame)', 0.1, 2, 0.05, 0.6),
      P.range('white', 'White sparkle share', 0, 1, 0.05, 0.2),
      P.range('hair', 'Hair frequency', 0, 1, 0.05, 0.35),
      P.range('stain', 'Stains', 0, 1, 0.05, 0.3),
      P.range('filmFps', 'Dust rate (fps)', 6, 30, 1, 24),
    ],
    draw(g, P, e) {
      const { W, H, S, seed } = e, ff = Math.max(6, P.filmFps), fi = e.film(ff);
      const maxD = P.size / 100 * Math.min(W, H);
      // stains: soft dark ellipses living 0.5–2 s, spawned from the recent film frames
      if (P.stain > 0.01) {
        const pS = P.stain * 1.2 / ff, look = Math.ceil(2 * ff) + 3;
        for (let fj = Math.max(0, fi - look); fj <= fi; fj++) {
          if (U.h1(fj, seed + 201) >= pS) continue;
          const life = Math.max(3, Math.round((0.5 + 1.5 * U.h1(fj, seed + 202)) * ff));
          if (fi - fj >= life) continue;
          const age = (fi - fj) / life;
          const env = Math.min(U.smooth(U.clamp(age / 0.18)), U.smooth(U.clamp((1 - age) / 0.3)));
          const rd = U.rng((seed + fj * 104729) | 0);
          const dia = (0.05 + 0.1 * rd()) * H, x = rd() * W, y = rd() * H;
          const a = (0.1 + 0.15 * rd()) * env;
          if (a <= 0.004) continue;
          g.save(); g.translate(x, y); g.rotate(rd() * Math.PI); g.scale(1, 0.55 + 0.8 * rd());
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, dia / 2);
          gr.addColorStop(0, `rgba(12,10,6,${a})`);
          gr.addColorStop(0.65, `rgba(12,10,6,${a * 0.5})`);
          gr.addColorStop(1, 'rgba(12,10,6,0)');
          g.fillStyle = gr; g.fillRect(-dia / 2, -dia / 2, dia, dia); g.restore();
        }
      }
      // specks: one film frame of life (two at low film rates)
      const hold = ff < 14 ? 2 : 1, set = Math.floor(fi / hold);
      const rng = U.rng((seed + set * 7919) | 0);
      let n = P.density * (0.55 + 0.9 * rng());
      if (U.h1(set, seed + 7) < 0.05) n *= 2.2;  // a clump of dirt crossing the gate
      n = Math.floor(n + rng());
      for (let i = 0; i < n; i++) {
        const x = rng() * W, y = rng() * H, r1 = rng(), r2 = rng(), r3 = rng();
        let d = (0.12 + 0.88 * r1 * r1) * maxD;  // mostly small, occasionally the full size
        const white = r2 < P.white;
        if (white) d *= 0.62;
        const a = white ? 0.5 + 0.25 * r3 : 0.55 + 0.25 * r3;
        g.fillStyle = white ? `rgba(244,240,231,${a})` : `rgba(6,6,7,${a})`;
        const asp = 0.5 + 0.7 * rng(), rot = rng() * Math.PI;
        g.beginPath(); g.ellipse(x, y, d / 2, d / 2 * asp, rot, 0, TAU); g.fill();
        if (d > maxD * 0.4 && rng() < 0.65) {  // irregular blob: a second lobe
          g.beginPath();
          g.ellipse(x + (rng() - 0.5) * d, y + (rng() - 0.5) * d, d * 0.42, d * 0.3 * asp, rot + 1.2, 0, TAU);
          g.fill();
        }
        if (white && rng() < 0.3) {  // bright core on the biggest sparkle
          g.fillStyle = 'rgba(255,255,252,0.85)';
          g.beginPath(); g.ellipse(x, y, d * 0.22, d * 0.22 * asp, rot, 0, TAU); g.fill();
        }
      }
      // hairs: bezier squiggles living 1–4 film frames, mostly near the edges
      if (P.hair > 0.01) {
        const p = P.hair * 0.5 / ff;  // hair = 1 → about one hair every 2 s
        for (let fj = Math.max(0, fi - 4); fj <= fi; fj++) {
          if (U.h1(fj, seed + 101) >= p) continue;
          const life = 1 + Math.floor(U.h1(fj, seed + 102) * 4);
          if (fi - fj >= life) continue;
          const rh = U.rng((seed + fj * 1543) | 0);
          let x, y;
          if (rh() < 0.6) {
            const side = (rh() * 4) | 0, m = rh() * 0.08;
            if (side === 0) { x = rh() * W; y = m * H; }
            else if (side === 1) { x = (1 - m) * W; y = rh() * H; }
            else if (side === 2) { x = rh() * W; y = (1 - m) * H; }
            else { x = m * W; y = rh() * H; }
          } else { x = rh() * W; y = rh() * H; }
          const len = (0.08 + 0.1 * rh()) * W, segs = 3;
          let dir = rh() * TAU;
          g.strokeStyle = `rgba(8,8,10,${0.5 + 0.25 * rh()})`;
          g.lineWidth = Math.max(0.6, (1.3 + 1.3 * rh()) * S);
          g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s < segs; s++) {
            dir += (rh() - 0.5) * 1.7;
            const sl = len / segs, nx = x + Math.cos(dir) * sl, ny = y + Math.sin(dir) * sl;
            g.quadraticCurveTo(x + Math.cos(dir - 0.6) * sl * 0.7, y + Math.sin(dir - 0.6) * sl * 0.7, nx, ny);
            x = nx; y = ny;
          }
          g.stroke();
        }
      }
    },
  });
  preset('dust-clean', 'Dust: clean 8 mm', 'dust', { density: 1.2, size: 0.5, white: 0.18, hair: 0.18, stain: 0.1, filmFps: 12 });
  preset('dust-damaged', 'Dust: damaged print', 'dust', { density: 9, size: 0.9, white: 0.35, hair: 0.7, stain: 0.65 });
  preset('dust-sparkle', 'Dust: negative sparkle', 'dust', { density: 5, size: 0.55, white: 0.92, hair: 0.08, stain: 0.05 });
  preset('dust-hairs', 'Dust: hairs', 'dust', { density: 1.6, hair: 1, white: 0.1, stain: 0.12 });
  preset('dust-stains', 'Dust: stains', 'dust', { density: 1.2, stain: 1, hair: 0.2, white: 0.1 });

  // ---------- line scratches ----------
  register({
    id: 'scratch', name: 'Line scratches', family: 'film', kind: 'overlay', blend: 'source-over',
    desc: 'Vertical scratches through the emulsion (bright) or the film base (dark) that wander, flicker and pop in and out.',
    params: [
      P.range('count', 'Lines', 1, 3, 1, 1),
      P.select('mode', 'Type', [['white', 'White (emulsion)'], ['dark', 'Dark (base)'], ['both', 'Mixed']], 'white'),
      P.range('width', 'Width (% of frame)', 0.15, 0.8, 0.05, 0.32),
      P.range('wander', 'Wander (% of frame)', 0, 3, 0.1, 0.8),
      P.range('flicker', 'Opacity flicker', 0, 1, 0.05, 0.5),
      P.range('pop', 'Pop in / out', 0, 1, 0.05, 0.5),
    ],
    draw(g, P, e) {
      const { W, H, lt, seed } = e, fi = e.film(24), n = Math.round(P.count);
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed + 1), r1 = U.h1(i, seed + 2), r2 = U.h1(i, seed + 3), r3 = U.h1(i, seed + 4);
        if (P.pop > 0.01) {  // each line has its own on/off schedule, popping every 0.5–2 s
          const cyc = 0.5 + 1.5 * r1, duty = 1 - 0.55 * P.pop;
          const phase = ((lt / cyc + r2) % 1 + 1) % 1;
          if (phase > duty) continue;
        }
        const x = (0.3 + 0.4 * r0) * W + U.fbm1(lt * 1.1 + i * 9.7, seed + 41 + i) * P.wander / 100 * W;
        const w = P.width / 100 * W * (0.7 + 0.6 * r3);
        const fl = 0.3 + 0.5 * U.h1(fi + i * 977, seed + 51);  // opacity 0.3–0.8 per film frame
        const a = U.lerp(0.66, fl, P.flicker);
        const white = P.mode === 'white' || (P.mode === 'both' && U.h1(i, seed + 5) < 0.5);
        const col = white ? '#fbf9f1' : '#050507';
        const gr = g.createLinearGradient(x - w, 0, x + w, 0);
        gr.addColorStop(0, U.rgba(col, 0));
        gr.addColorStop(0.3, U.rgba(col, a * 0.8));
        gr.addColorStop(0.5, U.rgba(col, a));
        gr.addColorStop(0.7, U.rgba(col, a * 0.8));
        gr.addColorStop(1, U.rgba(col, 0));
        g.fillStyle = gr;
        g.fillRect(x - w, 0, w * 2, H);
        // dirt caught in the scratch for a frame or two
        if (U.h1(fi, seed + 61 + i) < 0.22) {
          g.fillStyle = U.rgba(col, Math.min(1, a + 0.3));
          const by = U.h1(fi, seed + 71 + i) * H, bh = (0.03 + 0.05 * U.h1(fi, seed + 81 + i)) * H;
          g.fillRect(x - w * 0.9, by, w * 1.8, bh);
        }
      }
    },
  });
  preset('scratch-emulsion', 'Scratch: white emulsion', 'scratch', {});
  preset('scratch-double-dark', 'Scratch: double dark', 'scratch', { count: 2, mode: 'dark', width: 0.42, flicker: 0.6 });
  preset('scratch-flicker', 'Scratch: flickering pair', 'scratch', { count: 2, mode: 'both', flicker: 1, pop: 0.85, wander: 1.2 });
  preset('scratch-triple', 'Scratch: triple', 'scratch', { count: 3, mode: 'both', width: 0.28, wander: 1.4 });

  // ---------- film gate ----------
  const GATES = {
    '8mm': { win: [0.165, 0.055, 0.67, 0.89], r: 0.04, base: '#141410', halo: '#2a2a22', spr: null, edgeX: 0.07, edgeSize: 0.028 },
    'super8': { win: [0.17, 0.035, 0.71, 0.93], r: 0.03, base: '#08080f', halo: '#26241e', spr: 'single', edgeX: 0.94, edgeSize: 0.028 },
    '16mm': { win: [0.11, 0.04, 0.78, 0.92], r: 0.035, base: '#0b0b10', halo: '#2a281f', spr: 'pair', edgeX: 0.021, edgeSize: 0.026 },
    '35mm': { win: [0.08, 0.12, 0.84, 0.76], r: 0.04, base: '#0a0a10', halo: '#2a2820', spr: 'quad', edgeX: 0.011, edgeSize: 0.017 },
    'rough': { win: [0.031, 0.1205, 0.938, 0.759], r: 0.02, base: '#060609', halo: '#221f18', spr: null, edgeX: 0.984, edgeSize: 0.015, rough: true },
  };
  function rrect(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // rounded-rect window edge displaced by fractal noise; re-rolled by the caller at 2 Hz
  function roughPath(g, wx, wy, wW, wH, r, gw, seed) {
    const rc = Math.min(r, wW / 2, wH / 2);
    const a = [[wx + rc, wy], [wx + wW - rc, wy], [wx + wW, wy + rc], [wx + wW, wy + wH - rc],
      [wx + wW - rc, wy + wH], [wx + rc, wy + wH], [wx, wy + wH - rc], [wx, wy + rc]];
    const pts = [], step = Math.max(6, gw * 0.014);
    for (let k = 0; k < 8; k++) {
      const [ax, ay] = a[k], [bx, by] = a[(k + 1) % 8];
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
    }
    const amp = 0.0045 * gw, f = 5.5 / gw, m = pts.length;
    g.beginPath();
    for (let i = 0; i < m; i++) {
      const p = pts[i], q = pts[(i + 1) % m], o = pts[(i + m - 1) % m];
      const tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
      const d = amp * (U.fbm2(p[0] * f, p[1] * f, seed, 2) * 0.75 + U.fbm2(p[0] * f * 3.1, p[1] * f * 3.1, seed + 977, 2) * 0.35);
      const x = p[0] + ty / tl * d, y = p[1] - tx / tl * d;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
  }
  // the whole gate (surround, halo, punched window, tint, sprockets, edge print) cached at half
  // resolution — only the rough edge boils and the cue dots blink, and both stay out of this cache
  function gateArt(P, e, boil) {
    const spec = GATES[P.format] || GATES['8mm'];
    const key = ['film:gate', P.format, e.W, e.H, e.seed, P.sprockets ? 1 : 0, P.edgeprint ? 1 : 0,
      P.tint, (+P.hotspot).toFixed(3), boil, single(P.edgeText)].join('|');
    return art.get(key, () => {
      const gw = Math.max(8, Math.round(e.W / 2)), gh = Math.max(8, Math.round(e.H / 2));
      const c = U.canvas(gw, gh), g = U.ctx2(c);
      const [fx, fy, fw, fh] = spec.win;
      const wx = fx * gw, wy = fy * gh, wW = fw * gw, wH = fh * gh, r = spec.r * gw;
      const cx = wx + wW / 2, cy = wy + wH / 2, eseed = (e.seed + boil * 1013) | 0;
      // surround with darker corners
      g.fillStyle = spec.base; g.fillRect(0, 0, gw, gh);
      const vg = g.createRadialGradient(cx, cy, Math.min(gw, gh) * 0.3, cx, cy, Math.hypot(gw, gh) / 2);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = vg; g.fillRect(0, 0, gw, gh);
      // light-spill halo hugging the window, a 3% W two-step ramp
      if (spec.rough) {
        g.strokeStyle = U.rgba(spec.halo, 0.4); g.lineWidth = 0.035 * gw;
        roughPath(g, wx, wy, wW, wH, r, gw, eseed); g.stroke();
      } else {
        g.fillStyle = U.rgba(spec.halo, 0.35);
        rrect(g, wx - 0.03 * gw, wy - 0.03 * gw, wW + 0.06 * gw, wH + 0.06 * gw, r + 0.03 * gw); g.fill();
        g.fillStyle = U.rgba(spec.halo, 0.5);
        rrect(g, wx - 0.015 * gw, wy - 0.015 * gw, wW + 0.03 * gw, wH + 0.03 * gw, r + 0.015 * gw); g.fill();
      }
      // punch the window: the footage shows through it.
      // The fill here must be OPAQUE: destination-out erases in proportion to the fill alpha,
      // and the previous fillStyle (the vignette gradient, or the 0.5 halo) would leave the
      // artwork half-present inside the window — the gate-rough window went almost black.
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      if (spec.rough) roughPath(g, wx, wy, wW, wH, r, gw, eseed);
      else rrect(g, wx, wy, wW, wH, r);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      // inside the window: warm tint, centre hotspot, soft edge falloff
      g.save();
      if (spec.rough) roughPath(g, wx, wy, wW, wH, r, gw, eseed);
      else rrect(g, wx, wy, wW, wH, r);
      g.clip();
      const tint = U.hexRgb(P.tint || '#dcd8d4');
      g.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.1)`; g.fillRect(0, 0, gw, gh);
      const hs = 0.16 * U.clamp(P.hotspot);
      const hg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(gw, gh) * 0.4);
      hg.addColorStop(0, `rgba(255,246,228,${hs})`);
      hg.addColorStop(0.6, `rgba(255,246,228,${hs * 0.45})`);
      hg.addColorStop(1, 'rgba(255,246,228,0)');
      g.fillStyle = hg; g.fillRect(0, 0, gw, gh);
      if (spec.rough) {
        // feathered edge (2–3% W) and the inner broken line inset 3%
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.05 * gw;
        roughPath(g, wx, wy, wW, wH, r, gw, eseed); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.02 * gw;
        roughPath(g, wx, wy, wW, wH, r, gw, eseed); g.stroke();
        const ins = 0.03 * gw;
        g.setLineDash([0.014 * gw, 0.01 * gw]);
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = Math.max(1, 0.002 * gw);
        rrect(g, wx + ins, wy + ins, wW - ins * 2, wH - ins * 2, Math.max(0.004 * gw, r - ins)); g.stroke();
        g.setLineDash([]);
      } else {
        g.strokeStyle = 'rgba(0,0,0,0.26)'; g.lineWidth = 0.017 * gw;
        rrect(g, wx + 0.008 * gw, wy + 0.008 * gw, wW - 0.016 * gw, wH - 0.016 * gw, Math.max(0.004 * gw, r - 0.008 * gw)); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.007 * gw;
        rrect(g, wx + 0.004 * gw, wy + 0.004 * gw, wW - 0.008 * gw, wH - 0.008 * gw, Math.max(0.004 * gw, r - 0.004 * gw)); g.stroke();
      }
      g.restore();
      // sprocket holes on the surround
      if (P.sprockets && spec.spr) {
        g.fillStyle = '#030309';
        if (spec.spr === 'single') {
          const hx = 0.045 * gw, hw = 0.125 * gw, hh = 0.28 * gh, hy = (gh - hh) / 2;
          rrect(g, hx, hy, hw, hh, 0.012 * gw); g.fill();
          g.strokeStyle = 'rgba(122,90,72,0.85)'; g.lineWidth = Math.max(1, 0.004 * gw); g.stroke();
        } else {
          const cols = spec.spr === 'pair' ? [0.06, 0.94] : [0.045, 0.955];
          const hw = (spec.spr === 'pair' ? 0.032 : 0.05) * gw;
          const hh = (spec.spr === 'pair' ? 0.082 : 0.12) * gh;
          for (const cc of cols) for (let k = 0; k < 4; k++) {
            rrect(g, cc * gw - hw / 2, (0.135 + k * 0.27) * gh - hh / 2, hw, hh, 0.006 * gw); g.fill();
          }
        }
      }
      // edge print: amber mono text running along the margin, with edge-code numbers
      if (P.edgeprint) {
        const txt = single(P.edgeText) || 'FL 47 A';
        const fs = Math.max(5, spec.edgeSize * gw);
        g.fillStyle = 'rgba(224,160,64,0.85)';
        g.font = `${fs}px ${MONO}`;
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.save(); g.translate(spec.edgeX * gw, gh - 0.05 * gh); g.rotate(-Math.PI / 2);
        for (let k = 0, y = 0; y < gh * 0.88; y += 0.34 * gh, k++) {
          const num = 1000 + ((e.seed * 7 + k * 131) % 9000);
          g.fillText(k % 2 ? `${txt} ${num}` : `${num} ${txt}`, y, 0);
        }
        g.restore();
      }
      return c;
    });
  }
  register({
    id: 'gate', name: 'Film gate', family: 'film', kind: 'overlay', blend: 'source-over',
    desc: 'Projector gate matte: dark surround, tinted picture window with hotspot, sprocket holes, amber edge print and cue dots.',
    params: [
      P.select('format', 'Format', [['8mm', '8 mm'], ['super8', 'Super 8'], ['16mm', '16 mm'], ['35mm', '35 mm'], ['rough', 'Rough matte (boiling edge)']], '16mm'),
      P.bool('sprockets', 'Sprocket holes', true),
      P.bool('edgeprint', 'Edge print', true),
      P.bool('cueDots', 'Reel-change cue dots', false),
      P.color('tint', 'Window tint', '#dcd8d4'),
      P.range('hotspot', 'Centre hotspot', 0, 1, 0.05, 0.5),
      P.text('edgeText', 'Edge print text', 'FL 47 A'),
    ],
    draw(g, P, e) {
      const boil = P.format === 'rough' ? e.film(2) : 0;  // the rough edge re-rolls at 2 Hz
      const c = gateArt(P, e, boil);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(c, 0, 0, e.W, e.H);
      if (P.cueDots) {  // reel-change mark: a black disc for 4–8 frames every few seconds
        const period = 4 + 3 * U.h1(2, e.seed + 90);
        const ph = ((e.lt + U.h1(3, e.seed + 91) * period * 0.6) % period + period) % period;
        const frames = 4 + 4 * U.h1(4, e.seed + 92);
        if (ph < frames / 24) {
          const d = (0.05 + 0.02 * U.h1(5, e.seed + 93)) * e.H;
          g.fillStyle = 'rgba(0,0,0,0.92)';
          g.beginPath(); g.arc(0.85 * e.W, 0.12 * e.H, d / 2, 0, TAU); g.fill();
        }
      }
    },
  });
  preset('gate-8mm', 'Gate: 8 mm', 'gate', { format: '8mm' });
  preset('gate-super8', 'Gate: Super 8', 'gate', { format: 'super8' });
  preset('gate-16mm', 'Gate: 16 mm', 'gate', { format: '16mm' });
  preset('gate-35mm', 'Gate: 35 mm', 'gate', { format: '35mm' });
  preset('gate-rough', 'Gate: rough matte', 'gate', { format: 'rough' });
  preset('gate-super8-cue', 'Gate: Super 8 + cue dots', 'gate', { format: 'super8', cueDots: true });

  // ---------- gate weave ----------
  register({
    id: 'weave', name: 'Gate weave', family: 'film', kind: 'camera',
    desc: 'The film wobbling in the gate: smooth drift, or a fresh registration error on every film frame. Margins are constant, so no edge ever shows.',
    params: [
      P.range('ampH', 'Horizontal (%)', 0, 1, 0.05, 0.35),
      P.range('ampV', 'Vertical (%)', 0, 1.5, 0.05, 0.6),
      P.range('rot', 'Rotation (degrees)', 0, 0.4, 0.01, 0.08),
      P.range('rate', 'Speed (Hz)', 0.5, 6, 0.1, 2),
      P.bool('jumpy', 'Registration jumps (per frame)', false),
    ],
    camera(P, e) {
      const Wb = e.W / e.S, Hb = e.H / e.S;
      const ax = P.ampH / 100 * Wb, ay = P.ampV / 100 * Hb, ra = P.rot * Math.PI / 180;
      let x, y, r;
      if (P.jumpy) {
        const fi = e.film(24);
        x = (U.h1(fi, e.seed + 11) * 2 - 1) * ax;
        y = (U.h1(fi, e.seed + 13) * 2 - 1) * ay;
        r = (U.h1(fi, e.seed + 17) * 2 - 1) * ra;
      } else {
        const k = P.rate * 1.6;
        x = U.fbm1(e.lt * k, e.seed + 1) * ax;
        y = U.fbm1(e.lt * k * 1.13 + 5.2, e.seed + 2) * ay;
        r = U.fbm1(e.lt * k * 0.71 + 9.7, e.seed + 3) * ra;
      }
      // worst-case margins from the params alone: the engine's cover zoom stays perfectly steady
      return { x, y, rot: r, mx: ax * 1.02 + 0.6, my: ay * 1.02 + 0.6, mr: ra };
    },
  });
  preset('weave-subtle', 'Weave: subtle', 'weave', { ampH: 0.16, ampV: 0.3, rot: 0.04, rate: 1.2 });
  preset('weave-16mm', 'Weave: 16 mm gate', 'weave', { ampH: 0.3, ampV: 0.8, rot: 0.1, rate: 2.4 });
  preset('weave-jumpy', 'Weave: jumpy registration', 'weave', { jumpy: true, ampH: 0.35, ampV: 0.85, rate: 3 });
  preset('weave-8mm', 'Weave: 8 mm gate', 'weave', { ampH: 0.65, ampV: 1.2, rot: 0.2, rate: 3.2 });

  // ---------- frame slip ----------
  // One slip = jump (2–3 film frames of proportion), hang (2–4), snap back (1–2). The seeded frame
  // counts set the rhythm; the envelope is stretched to finish by p ≈ 0.9 so the layer is never dead.
  function slipOffsets(P, e) {
    const Wb = e.W / e.S, Hb = e.H / e.S, n = Math.round(P.count);
    let y = 0, x = 0;
    for (let k = 0; k < n; k++) {
      const r0 = U.h1(k, e.seed + 61), r1 = U.h1(k, e.seed + 62), r2 = U.h1(k, e.seed + 63);
      const dir = P.dir === 'up' ? -1 : P.dir === 'down' ? 1 : (r0 < 0.5 ? -1 : 1);
      const amt = P.drop / 100 * Hb * (0.85 + 0.3 * r1);
      const jf = 2 + Math.floor(r1 * 2.999), hf = 2 + Math.floor(r2 * 2.999), sf = 1 + Math.floor(U.h1(k, e.seed + 64) * 1.999);
      const T = jf + hf + sf, q1 = jf / T, q2 = (jf + hf) / T;
      const span = n === 1 ? 0.72 + 0.08 * r2 : 0.24;
      const ps = n === 1 ? 0.07 + 0.05 * U.h1(k, e.seed + 65) : (k === 0 ? 0.29 : 0.69) + 0.02 * U.h1(k, e.seed + 65);
      const q = (e.p - ps) / span;
      if (q <= 0 || q >= 1) continue;
      let kk;
      if (q < q1) kk = Math.pow(q / q1, 1.3);              // the drop: fast, accelerating
      else if (q < q2) kk = 1;                              // hanging out of the gate
      else kk = 1 - U.ease.inOut((q - q2) / (1 - q2));      // the snap back
      y += dir * amt * kk;
      x += (r2 - 0.5) * 0.003 * Wb * kk;                    // a touch of horizontal drift
    }
    return { x, y };
  }
  register({
    id: 'slip', name: 'Frame slip', family: 'film', kind: 'camera', event: true, dur: 0.8,
    desc: 'The projector loses the loop: the frame jumps out of the gate, hangs, then snaps back with the frame line showing.',
    params: [
      P.select('dir', 'Direction', [['auto', 'Seeded'], ['down', 'Drops down'], ['up', 'Jumps up']], 'auto'),
      P.range('drop', 'Slip size (% of frame)', 15, 45, 1, 28),
      P.range('count', 'Slips', 1, 2, 1, 1),
    ],
    camera(P, e) {
      const { x, y } = slipOffsets(P, e);
      // wrapY follows the slip: the engine draws the next frame's picture beyond the frame line,
      // so the exposed edge is covered for every offset; margins only cover the horizontal drift
      const m = 0.002 * (e.W / e.S) + 0.6;
      return { x, y, wrapY: y, mx: m, my: m };
    },
  });
  preset('slip-drop', 'Slip: frame drop', 'slip', { dir: 'down' }, { dur: 0.8 });
  preset('slip-rise', 'Slip: frame rise', 'slip', { dir: 'up' }, { dur: 0.8 });
  preset('slip-double', 'Slip: double slip', 'slip', { count: 2 }, { dur: 1.6 });

  // ---------- exposure flicker ----------
  register({
    id: 'flicker', name: 'Exposure flicker', family: 'film', kind: 'process',
    desc: 'Lamp flicker: seeded darker frames every film frame or two, optional warm/cool wobble, or a projector dying toward 70% over the clip.',
    params: [
      P.range('amount', 'Depth', 0, 1, 0.05, 0.35),
      P.range('wobble', 'Colour wobble', 0, 1, 0.05, 0),
      P.range('filmFps', 'Flicker rate (fps)', 6, 30, 1, 24),
      P.bool('decay', 'Dying projector (fades over the clip)', false),
    ],
    process(g, P, e) {
      const { W, H, seed } = e, fi = e.film(Math.max(6, P.filmFps));
      const slot = Math.floor(fi / 2);
      const idx = U.h1(slot, seed + 31) < 0.22 ? fi : slot;  // re-rolls every 1–2 film frames
      const depth = 0.06 + 0.09 * P.amount;                  // 6% subtle → 15% heavy
      let v = 1 - depth * U.h1(idx, seed + 47);              // dark frames only, never brighter
      if (P.decay) v *= 1 - 0.3 * U.smooth(U.clamp(e.p));    // the one variant allowed to see p
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(0,0,0,${U.clamp(1 - v)})`;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      if (P.wobble > 0.01) {
        const a = 0.13 * P.wobble * U.clamp((1 - v) * 7);    // the cast deepens on the dark dips
        if (a > 0.004) {
          g.globalCompositeOperation = 'soft-light';
          g.fillStyle = U.h1(idx, seed + 61) < 0.5 ? `rgba(255,176,96,${a})` : `rgba(120,168,255,${a})`;
          g.fillRect(0, 0, W, H);
          g.globalCompositeOperation = 'source-over';
        }
      }
    },
  });
  preset('flicker-subtle', 'Flicker: subtle', 'flicker', { amount: 0.15 });
  preset('flicker-lamp', 'Flicker: lamp', 'flicker', { amount: 0.4, wobble: 0.35 });
  preset('flicker-unstable', 'Flicker: unstable', 'flicker', { amount: 0.85, wobble: 0.55 });
  preset('flicker-end', 'Flicker: dying projector', 'flicker', { amount: 0.75, wobble: 0.4, decay: true });
})();
