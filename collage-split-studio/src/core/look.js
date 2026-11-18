// Backgrounds, paper textures, grain and vignette. All procedural, cached per size + seed.
CS.look = (() => {
  const U = CS.util;
  const BGS = [
    ['kraft', 'Kraft / brown paper'], ['paper', 'Off-white paper'], ['newsprint', 'Newsprint grey'], ['grid', 'Graph paper'],
    ['dark', 'Dark charcoal'], ['black', 'Black'], ['white', 'White'], ['color', 'Plain colour'], ['blur', 'Blurred photo 1'], ['cream', 'Old cream paper'],
  ];
  const cache = new Map();
  const remember = (k, make) => { if (!cache.has(k)) { if (cache.size > 40) cache.delete(cache.keys().next().value); cache.set(k, make()); } return cache.get(k); };

  // fibrous paper texture at 1/2 resolution
  function paper(base, W, H, seed, fibres = 1, spots = 0.5) {
    return remember(`p${base}${W}x${H}:${seed}:${fibres}`, () => {
      const w = Math.ceil(W / 2), h = Math.ceil(H / 2), c = U.canvas(w, h), g = c.getContext('2d');
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const img = g.getImageData(0, 0, w, h), d = img.data, r = U.rng(seed);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const n = U.fbm2(x / 90, y / 90, seed, 4) * 14 + U.noise2(x / 3, y / 3, seed + 5) * 6 * fibres + (r() - 0.5) * 8;
        const k = (y * w + x) * 4; d[k] += n; d[k + 1] += n; d[k + 2] += n * 0.9;
      }
      g.putImageData(img, 0, 0);
      g.globalAlpha = 0.05 * fibres; g.strokeStyle = '#000'; g.lineWidth = 0.6;
      for (let i = 0; i < 260 * fibres; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, L = 4 + r() * 16; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * L / 2, y + Math.sin(a + 0.6) * L / 2, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      g.globalAlpha = 0.07 * spots; g.fillStyle = '#5a3a14';
      for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 60, 0, 7); g.fill(); }
      const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,0.22)');
      g.globalAlpha = 1; g.fillStyle = v; g.fillRect(0, 0, w, h);
      return c;
    });
  }
  function newsprint(W, H, seed) {
    return remember(`n${W}x${H}:${seed}`, () => {
      const c = U.canvas(W / 2, H / 2), g = c.getContext('2d'), w = c.width, h = c.height, r = U.rng(seed);
      g.drawImage(paper('#d9d6cc', W, H, seed, 0.6, 0.2), 0, 0);
      g.fillStyle = 'rgba(30,30,30,.13)';
      const cols = 6, cw = w / cols;
      for (let ci = 0; ci < cols; ci++) for (let y = 12; y < h - 8; y += 6) {
        if (r() < 0.06) { y += 10; continue; }
        const L = cw * (0.6 + r() * 0.3); g.fillRect(ci * cw + 8, y, L, 2.2);
      }
      return c;
    });
  }
  function grid(W, H, seed) {
    return remember(`g${W}x${H}:${seed}`, () => {
      const c = U.canvas(W, H), g = c.getContext('2d');
      g.drawImage(paper('#f2f0e8', W, H, seed, 0.4, 0.15), 0, 0, W, H);
      const s = Math.min(W, H) / 27;
      g.strokeStyle = 'rgba(70,120,190,.20)'; g.lineWidth = Math.max(1, s / 30);
      for (let x = 0; x < W; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = 'rgba(70,120,190,.32)'; g.lineWidth = Math.max(1, s / 16);
      for (let x = 0; x < W; x += s * 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += s * 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      return c;
    });
  }
  function dark(W, H, seed) {
    return remember(`d${W}x${H}:${seed}`, () => {
      const c = U.canvas(W, H), g = c.getContext('2d');
      g.drawImage(paper('#24252a', W, H, seed, 0.5, 0), 0, 0, W, H);
      const v = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.2, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      v.addColorStop(0, 'rgba(255,255,255,.05)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      return c;
    });
  }

  // background of a scene (skipped in element / matte exports: those keep only the photos)
  function background(ctx, env) {
    if (env.mode !== 'composite') return;
    const { W, H, P } = env, seed = 11 + (env.seed % 5);
    const kind = P.bg || 'kraft';
    switch (kind) {
      case 'kraft': ctx.drawImage(paper('#b88b5a', W, H, seed, 1.2, 0.8), 0, 0, W, H); break;
      case 'paper': ctx.drawImage(paper('#efeadf', W, H, seed, 0.7, 0.3), 0, 0, W, H); break;
      case 'cream': ctx.drawImage(paper('#e3d3ac', W, H, seed, 1, 1), 0, 0, W, H); break;
      case 'newsprint': ctx.drawImage(newsprint(W, H, seed), 0, 0, W, H); break;
      case 'grid': ctx.drawImage(grid(W, H, seed), 0, 0); break;
      case 'dark': ctx.drawImage(dark(W, H, seed), 0, 0); break;
      case 'black': ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); break;
      case 'white': ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); break;
      case 'blur': {
        const src = env.src(0), b = U.tmp('bgblur', 48, 27), bg = b.getContext('2d');
        CS.draw.coverInto(bg, src, 0, 0, 48, 27, 0.5, 0.5, 0.1);
        ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(b, -W * 0.05, -H * 0.05, W * 1.1, H * 1.1);
        ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(0, 0, W, H); ctx.restore();
        break;
      }
      default: ctx.fillStyle = P.bgColor || '#1d3557'; ctx.fillRect(0, 0, W, H);
    }
  }

  // film grain: a cached noise tile, moved every stop-motion step (or every frame)
  let grainTile = null;
  function grain(ctx, env, amount) {
    if (amount <= 0 || env.mode !== 'composite') return; // element exports stay clean (add grain in CapCut if needed)
    if (!grainTile) {
      grainTile = U.canvas(256, 256);
      const g = grainTile.getContext('2d'), img = g.createImageData(256, 256), r = U.rng(77);
      for (let k = 0; k < img.data.length; k += 4) { const v = 128 + (r() - 0.5) * 255; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0);
    }
    const step = env.step, ox = Math.floor(U.h1(step, 3) * 256), oy = Math.floor(U.h1(step, 9) * 256);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, amount * 0.35);
    const pat = ctx.createPattern(grainTile, 'repeat');
    ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(ox, oy, env.W, env.H);
    ctx.restore();
  }
  function vignette(ctx, env, amount) {
    if (amount <= 0 || env.mode !== 'composite') return;
    const { W, H } = env, v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.58);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.6 * amount})`);
    ctx.save(); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function clear() { cache.clear(); }
  return { BGS, background, paper, newsprint, grain, vignette, clear };
})();
