// Procedural paper: every surface the studio draws on, generated deterministically per
// (type, seed, size). Blotches come from a low-res fbm layer (smooth when upscaled), fine
// grain from a seeded tile, stains / burn / grid / frame are drawn as vectors at full size.
SK.paper = (() => {
  const U = SK.util;
  const TYPES = [
    ['cream', 'Sketchbook cream'],
    ['parchment', 'Aged parchment'],
    ['kraft', 'Kraft paper'],
    ['board', 'Black chalkboard'],
    ['graph', 'Graph paper'],
    ['news', 'Newsprint'],
    ['white', 'Plain white'],
    ['blueprint', 'Blueprint'],
    ['dark', 'Dark charcoal'],
  ];

  const cache = new Map();
  // opts: {stains, burn, smudge, eraser, grid, seed}
  function get(type, seed, W, H, opts = {}) {
    const o = Object.assign({ stains: 0.5, burn: 0, smudge: 0, eraser: 0, grid: 0 }, opts);
    const key = [type, seed, W, H, o.stains, o.burn, o.smudge, o.eraser, o.grid].join('|');
    if (cache.has(key)) return cache.get(key);
    const c = U.canvas(W, H), g = c.getContext('2d');
    paint(g, type, seed, W, H, o);
    if (cache.size > 24) cache.clear();
    cache.set(key, c);
    return c;
  }

  function paint(g, type, seed, W, H, o) {
    const base = {
      cream: '#efe7d4', parchment: '#e7d5ac', kraft: '#c8a878', board: '#1d2422',
      graph: '#f4f1e6', news: '#ddd8c8', white: '#f7f5ef', blueprint: '#173a63', dark: '#26262a',
    }[type];
    g.fillStyle = base; g.fillRect(0, 0, W, H);

    // low-res blotch layer (aged unevenness) — fbm, upscaled smoothly
    if (type !== 'board' && type !== 'blueprint' || type === 'blueprint') {
      const LW = 96, LH = Math.max(2, Math.round(96 * H / W));
      const bc = U.canvas(LW, LH), bg = bc.getContext('2d');
      const img = bg.createImageData(LW, LH);
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
        const i = (y * LW + x) * 4;
        const n = U.fbm2(x / 9, y / 9, seed, 4) * 0.5 + 0.5;
        const n2 = U.fbm2(x / 3.5, y / 3.5, seed + 77, 3) * 0.5 + 0.5;
        if (type === 'board') {
          const v = Math.round(n2 * 14);
          img.data[i] = v; img.data[i + 1] = v + 3; img.data[i + 2] = v; img.data[i + 3] = Math.round(n * 60);
        } else if (type === 'blueprint') {
          img.data[i] = 10; img.data[i + 1] = 40; img.data[i + 2] = 76;
          img.data[i + 3] = Math.round((n - 0.35) * 60);
        } else {
          const warm = type === 'parchment' ? 1 : 0.55;
          img.data[i] = Math.round(150 * warm); img.data[i + 1] = Math.round(108 * warm); img.data[i + 2] = Math.round(48 * warm);
          img.data[i + 3] = Math.round(n * n * 46 * o.stains);
        }
      }
      bg.putImageData(img, 0, 0);
      g.save();
      g.imageSmoothingEnabled = true;
      g.drawImage(bc, 0, 0, W, H);
      g.restore();
    }

    // grain tile (fine tooth) — repeated, subtle
    g.save();
    g.globalAlpha = type === 'board' ? 0.05 : type === 'blueprint' ? 0.04 : 0.055;
    const pat = g.createPattern(grainTile(seed + (type === 'board' ? 5 : 0)), 'repeat');
    g.fillStyle = pat; g.fillRect(0, 0, W, H);
    g.globalAlpha = type === 'white' || type === 'graph' ? 0.035 : 0.06;
    g.fillStyle = pat; g.fillRect(0, 0, W, H);
    g.restore();

    // grid (graph / blueprint)
    if (type === 'graph' || o.grid > 0) {
      const step = Math.round(U.lerp(64, 16, U.clamp(o.grid)) * W / 1920) || 8;
      g.strokeStyle = type === 'blueprint' ? 'rgba(255,255,255,.10)' : 'rgba(70,110,150,.30)';
      g.lineWidth = Math.max(1, W / 1920);
      g.beginPath();
      for (let x = step; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = step; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      if (type === 'graph') { g.strokeStyle = 'rgba(200,80,80,.5)'; g.beginPath(); g.moveTo(step * 5, 0); g.lineTo(step * 5, H); g.stroke(); }
    }
    if (type === 'blueprint') { // frame + corner ticks
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(1.5, W / 900);
      const m = W * 0.035;
      g.strokeRect(m, m, W - 2 * m, H - 2 * m);
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.strokeRect(m * 0.5, m * 0.5, W - m, H - m);
    }

    // stains: soft rings + blobs (coffee, age)
    if (o.stains > 0.05 && type !== 'board' && type !== 'blueprint') {
      const n = Math.round(2 + o.stains * 5);
      for (let i = 0; i < n; i++) {
        const x = U.h1(i, seed + 11) * W, y = U.h1(i, seed + 29) * H;
        const r = U.lerp(W * 0.05, W * 0.16, U.h1(i, seed + 41));
        const a = 0.05 + 0.10 * U.h1(i, seed + 53) * o.stains;
        const rg = g.createRadialGradient(x, y, r * 0.55, x, y, r);
        rg.addColorStop(0, `rgba(120,80,30,${a * 0.4})`);
        rg.addColorStop(0.72, `rgba(120,80,30,${a})`);
        rg.addColorStop(0.86, `rgba(120,80,30,${a * 0.25})`);
        rg.addColorStop(1, 'rgba(120,80,30,0)');
        g.fillStyle = rg;
        g.beginPath(); g.ellipse(x, y, r, r * (0.7 + U.h1(i, seed + 7) * 0.5), U.h1(i, seed + 3) * 3, 0, 7); g.fill();
      }
    }

    // edge burn: dark rim via four soft gradients (noise comes from the blotch layer)
    if (o.burn > 0.03 && type !== 'board' && type !== 'blueprint') {
      const rim = (x0, y0, x1, y1) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, `rgba(80,40,10,${0.34 * o.burn})`);
        gr.addColorStop(0.6, `rgba(80,40,10,${0.12 * o.burn})`);
        gr.addColorStop(1, 'rgba(80,40,10,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      };
      rim(0, 0, 0, H * 0.16); rim(0, H, 0, H * 0.84); rim(0, 0, W * 0.16, 0); rim(W, 0, W * 0.84, 0);
    }

    // smudges: broad soft streaks of chalk / graphite dust
    if (o.smudge > 0.05) {
      const n = Math.round(2 + o.smudge * 4);
      for (let i = 0; i < n; i++) {
        const x = U.h1(i, seed + 201) * W, y = U.h1(i, seed + 211) * H;
        const w = W * (0.12 + U.h1(i, seed + 221) * 0.2), h = H * (0.05 + U.h1(i, seed + 231) * 0.1);
        const a = U.h1(i, seed + 241) * 0.1;
        g.save();
        g.translate(x, y); g.rotate((U.h1(i, seed + 251) - 0.5) * 1.2);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, w);
        const col = type === 'board' ? '255,255,255' : '90,86,80';
        rg.addColorStop(0, `rgba(${col},${a * o.smudge})`); rg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = rg;
        g.scale(1, h / w);
        g.beginPath(); g.arc(0, 0, w, 0, 7); g.fill();
        g.restore();
      }
    }
    // eraser marks: pale rough strokes
    if (o.eraser > 0.05 && type !== 'board') {
      const n = Math.round(1 + o.eraser * 3);
      g.save();
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x0 = U.h1(i, seed + 301) * W, y0 = U.h1(i, seed + 311) * H;
        const ang = (U.h1(i, seed + 321) - 0.5) * 2.4, len = W * (0.06 + U.h1(i, seed + 331) * 0.1);
        g.strokeStyle = `rgba(255,252,240,${0.25 + 0.2 * U.h1(i, seed + 341)})`;
        g.lineWidth = W * 0.014 * (0.7 + U.h1(i, seed + 351));
        g.beginPath();
        for (let s = 0; s <= 6; s++) {
          const t = s / 6;
          g.lineTo(x0 + Math.cos(ang) * len * t + (U.noise1(s * 0.8 + i, seed + 7) * 4), y0 + Math.sin(ang) * len * t + (U.noise1(s * 0.8 + i, seed + 9) * 4));
        }
        g.stroke();
      }
      g.restore();
    }
    // board frame
    if (type === 'board') {
      g.strokeStyle = 'rgba(120,90,50,.55)'; g.lineWidth = Math.max(4, W * 0.012);
      g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth);
      g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = Math.max(1, W / 1400);
      g.strokeRect(g.lineWidth * 2.6, g.lineWidth * 2.6, W - g.lineWidth * 5.2, H - g.lineWidth * 5.2);
    }
    // newsprint: light halftone dots
    if (type === 'news') {
      g.fillStyle = 'rgba(60,58,52,.16)';
      const s = Math.max(3, W / 420);
      for (let y = s / 2; y < H; y += s) for (let x = (y / s % 2) * s / 2; x < W; x += s) {
        if (U.h2(x / s | 0, y / s | 0, seed) < 0.5) { g.beginPath(); g.arc(x, y, s * 0.22, 0, 7); g.fill(); }
      }
    }
  }

  // fine grain tile (256×256, alpha speckle) — also used to texture the ink itself
  const tiles = new Map();
  function grainTile(seed) {
    if (tiles.has(seed)) return tiles.get(seed);
    const S = 256, c = U.canvas(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = U.h1(i, seed) < 0.5 ? 0 : 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = Math.round(U.h1(i, seed + 99) * 110);
    }
    g.putImageData(img, 0, 0);
    if (tiles.size > 6) tiles.clear();
    tiles.set(seed, c);
    return c;
  }

  return { TYPES, get, grainTile };
})();
