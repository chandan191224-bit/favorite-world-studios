// Fields & sprites: the heavy lifting behind smoke, fog, fire and glow looks.
// A "field" is a small Float32 density grid (design-space, ~100-160 px long side, FIXED
// resolution so preview == export) computed per frame with seeded domain-warped fBm,
// then mapped through a colour ramp into a tiny canvas and upscaled with smoothing —
// that is what makes the soft, fluid, film-like look instead of flat blobs.
// Sprites (puffs, glows) are pre-rendered once per seed/colour and cached.
VFX.field = (() => {
  const U = VFX.util;

  // density grid: fn(u, v, x, y) -> 0..1  (u,v normalised 0..1; x,y integer pixels)
  function density(w, h, fn) {
    const d = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        d[y * w + x] = fn((x + 0.5) / w, v, x, y);
      }
    }
    return d;
  }

  // ramp: [[t, [r,g,b,a]], ...] sorted by t. Returns [r,g,b,a].
  function rampAt(ramp, t) {
    t = U.clamp(t);
    let i = 0;
    while (i < ramp.length - 2 && t > ramp[i + 1][0]) i++;
    const [t0, c0] = ramp[i], [t1, c1] = ramp[i + 1];
    const k = U.clamp(t1 <= t0 ? 1 : (t - t0) / (t1 - t0));
    return [U.lerp(c0[0], c1[0], k) | 0, U.lerp(c0[1], c1[1], k) | 0, U.lerp(c0[2], c1[2], k) | 0, U.lerp(c0[3], c1[3], k)];
  }
  // density grid -> tiny canvas through a ramp. gamma>1 = softer edges (favour low densities)
  function sprite(d, w, h, ramp, gamma = 1) {
    const c = U.canvas(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), px = img.data;
    for (let i = 0; i < d.length; i++) {
      const t = d[i] <= 0 ? 0 : Math.pow(U.clamp(d[i]), gamma);
      if (t <= 0.003) continue;
      const [r, gg, b, a] = rampAt(ramp, t);
      const j = i * 4;
      px[j] = r; px[j + 1] = gg; px[j + 2] = b; px[j + 3] = Math.max(px[j + 3], Math.round(a));
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // -------- cached colour ramps (density -> colour) --------
  // black war smoke: near-black core, cold grey sky-lit rim
  const R = {
    warBlack: [[0, [70, 74, 84, 0]], [0.25, [58, 62, 72, 60]], [0.55, [38, 41, 48, 165]], [1, [16, 17, 21, 255]]],
    warBlackGlow: [[0, [90, 84, 76, 0]], [0.3, [70, 62, 54, 80]], [0.6, [44, 39, 34, 190]], [1, [20, 18, 16, 255]]],
    chimney: [[0, [235, 235, 235, 0]], [0.3, [214, 213, 210, 55]], [0.6, [168, 167, 164, 130]], [1, [232, 232, 232, 210]]],
    groundFog: [[0, [220, 224, 230, 0]], [0.35, [200, 204, 212, 40]], [0.7, [178, 182, 192, 105]], [1, [214, 218, 226, 165]]],
    dust: [[0, [214, 190, 150, 0]], [0.3, [198, 172, 128, 60]], [0.65, [166, 138, 96, 150]], [1, [126, 100, 66, 215]]],
    smokeGrey: [[0, [200, 200, 200, 0]], [0.3, [176, 176, 178, 70]], [0.65, [128, 128, 132, 160]], [1, [92, 92, 98, 225]]],
    fireball: [[0, [255, 240, 170, 0]], [0.18, [255, 214, 96, 110]], [0.42, [255, 150, 40, 215]], [0.68, [214, 76, 12, 245]], [0.88, [96, 26, 10, 255]], [1, [42, 16, 10, 255]]],
    flame: [[0, [255, 236, 150, 0]], [0.22, [255, 210, 84, 150]], [0.5, [255, 138, 30, 235]], [0.78, [226, 66, 10, 250]], [1, [130, 22, 6, 255]]],
    emberGlow: [[0, [255, 170, 60, 0]], [0.5, [255, 140, 40, 110]], [1, [255, 190, 80, 220]]],
    cloud: [[0, [255, 255, 255, 0]], [0.35, [244, 244, 246, 60]], [0.7, [230, 231, 234, 145]], [1, [252, 252, 254, 215]]],
    stormCloud: [[0, [148, 152, 162, 0]], [0.3, [120, 124, 136, 70]], [0.65, [82, 86, 98, 165]], [1, [46, 48, 58, 235]]],
    char: [[0, [26, 20, 16, 0]], [0.35, [24, 17, 12, 200]], [1, [12, 8, 6, 255]]],
  };
  // tint a ramp with a hex colour (keeps alpha, multiplies rgb by tint normalised to its mean)
  function tintRamp(ramp, hex) {
    const [tr, tg, tb] = U.hexRgb(hex);
    const m = (tr + tg + tb) / 3 / 255 || 1;
    return ramp.map(([t, c]) => [t, [
      U.clamp(c[0] * (tr / 255 / m * 0.9 + 0.35) / 1.25, 0, 255),
      U.clamp(c[1] * (tg / 255 / m * 0.9 + 0.35) / 1.25, 0, 255),
      U.clamp(c[2] * (tb / 255 / m * 0.9 + 0.35) / 1.25, 0, 255),
      c[3]]]);
  }

  // -------- pre-rendered noise puff (a "smoke ball" that is not a flat circle) --------
  const puffs = new Map();
  // key: seed|style. 96x96 canvas: radial falloff * fbm - what real smoke element packs show
  function puff(seed, style = 'soft') {
    const key = seed + '|' + style;
    let c = puffs.get(key);
    if (c) return c;
    const S = 96;
    c = U.canvas(S, S);
    const d = density(S, S, (u, v, x, y) => {
      const dx = u - 0.5, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2;
      const fall = U.clamp(1 - r);
      const base = fall * fall * (3 - 2 * fall);
      const n = U.fbm2(u * 3.2 + 7.3, v * 3.2 - 2.1, seed, 4) * 0.5 + 0.5;
      const nz = style === 'wispy' ? Math.pow(n, 1.35) * 1.25 : 0.55 + n * 0.7;
      return U.clamp(base * nz - (style === 'wispy' ? 0.06 : 0));
    });
    const ramp = style === 'dark' ? R.warBlack : style === 'dust' ? R.dust : R.smokeGrey;
    c = sprite(d, S, S, ramp, 1.1);
    if (puffs.size > 80) { const k = puffs.keys().next().value; puffs.delete(k); }
    puffs.set(key, c);
    return c;
  }

  // -------- cached radial glow sprite (embers, bokeh, flashes) --------
  const glows = new Map();
  function glow(hex, r = 32, core = 0.18) {
    const key = hex + '|' + r + '|' + core;
    let c = glows.get(key);
    if (c) return c;
    const S = Math.max(8, r * 2);
    c = U.canvas(S, S);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, r);
    const [rr, gg, bb] = U.hexRgb(hex);
    gr.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.55 + core)})`);
    gr.addColorStop(core, `rgba(${rr},${gg},${bb},0.85)`);
    gr.addColorStop(0.45, `rgba(${rr},${gg},${bb},0.28)`);
    gr.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    if (glows.size > 120) { const k = glows.keys().next().value; glows.delete(k); }
    glows.set(key, c);
    return c;
  }

  // -------- Safari-safe "blur": draw small, scale up --------
  const softs = new Map();
  function soften(src, k = 4) {
    const key = src.width + 'x' + src.height + '|' + k + '|' + (src.dataset ? src.dataset.key || '' : src._key || '');
    let c = softs.get(key);
    if (c) return c;
    const w = Math.max(1, Math.round(src.width / k)), h = Math.max(1, Math.round(src.height / k));
    c = U.canvas(w, h);
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    if (softs.size > 40) { const kk = softs.keys().next().value; softs.delete(kk); }
    softs.set(key, c);
    return c;
  }

  // -------- particle helpers --------
  // deterministic particle i of n: seeded stream values in [0,1)
  const pv = (i, seed, k) => U.h1(i * 131 + k * 17, seed);
  // wrapped position for perfectly looping particle systems
  const wrap = (v, m) => ((v % m) + m) % m;

  return { density, sprite, rampAt, R, tintRamp, puff, glow, soften, pv, wrap };
})();
