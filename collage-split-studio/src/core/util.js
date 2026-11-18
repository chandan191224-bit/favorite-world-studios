// Shared math, seeded noise, easing and canvas helpers. Everything is deterministic per seed,
// so a collage looks the same on every frame, in the preview and in every export.
window.CS = window.CS || {};
CS.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / ((b - a) || 1e-6));
  const smooth = t => t * t * (3 - 2 * t);

  function rng(seed) {
    let a = (seed | 0) ^ 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h1(i, seed) {
    let x = Math.imul(i | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function h2(ix, iy, seed) {
    let x = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  const sh = (i, seed) => h1(i, seed) * 2 - 1; // signed hash -1..1
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(h1(i, seed), h1(i + 1, seed), u) * 2 - 1;
  }
  function fbm1(x, seed, oct = 4) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise1(x * f, seed + o * 131); n += a; a *= 0.5; f *= 2.07; }
    return s / n;
  }
  function noise2(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h2(ix, iy, seed), b = h2(ix + 1, iy, seed), c = h2(ix, iy + 1, seed), d = h2(ix + 1, iy + 1, seed);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function fbm2(x, y, seed, oct = 4) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise2(x * f, y * f, seed + o * 977); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  // rough (hand-cut) edge offsets for scraps: big meanders + small wobble
  function roughProfile(seed, rough, S) {
    const big = rough * 0.012 * S, mid = rough * 0.004 * S, fb = 1 / (0.12 * S), fm = 1 / (0.02 * S);
    return u => big * fbm1(u * fb, seed, 3) + mid * fbm1(u * fm, seed + 3, 2);
  }
  // closed rough polygon around a rectangle (w x h centred at 0,0)
  function roughRect(w, h, seed, rough, S, step = 6) {
    const prof = roughProfile(seed, rough, S), pts = [];
    const sides = [[-w / 2, -h / 2, w / 2, -h / 2], [w / 2, -h / 2, w / 2, h / 2], [w / 2, h / 2, -w / 2, h / 2], [-w / 2, h / 2, -w / 2, -h / 2]];
    let u = 0;
    for (const [ax, ay, bx, by] of sides) {
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(L / step)), nx = (by - ay) / L, ny = -(bx - ax) / L;
      for (let i = 0; i < n; i++) { const t = i / n, o = prof(u + t * L); pts.push([ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o]); }
      u += L;
    }
    return pts;
  }
  function pathFrom(pts, close = true) {
    const p = new Path2D();
    if (!pts.length) return p;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    if (close) p.closePath();
    return p;
  }
  function roundRect(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  const c1 = 1.70158;
  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inQuad: t => t * t,
    outBack: t => 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
    // pop: overshoot then settle (stickers, cut-outs)
    pop: t => (t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(9 * t)),
    // slam: comes in big and fast, tiny bounce (stamped photos)
    slam: t => (t < 0.55 ? Math.pow(t / 0.55, 2) : 1 + Math.sin((t - 0.55) / 0.45 * Math.PI) * 0.06 * (1 - t)),
  };
  const EASE_NAMES = { outQuart: 'Snappy (default)', inOut: 'Smooth in-out', out: 'Fast start, soft stop', outBack: 'Overshoot', pop: 'Springy pop', outExpo: 'Whip', linear: 'Linear' };

  function hexRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  function shade(hex, amt) {
    const [r, g, b] = hexRgb(hex);
    const f = v => Math.round(clamp(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt), 0, 255));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  // a reusable scratch canvas per key (resized when needed)
  const pool = {};
  function tmp(key, w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let c = pool[key];
    if (!c) c = pool[key] = canvas(w, h);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    return c;
  }
  // grid cells for n items in a w x h box (rows x cols chosen to fit the aspect)
  function gridFor(n, w, h) {
    let best = [1, n], bestScore = 1e9;
    for (let r = 1; r <= n; r++) {
      const c = Math.ceil(n / r), cell = (w / c) / (h / r), score = Math.abs(Math.log(cell / (16 / 9))) + (r * c - n) * 0.3;
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
  }
  const uid = () => Math.random().toString(36).slice(2, 9); // only for ids in the UI, never in drawing

  return { clamp, lerp, range, smooth, rng, h1, h2, sh, noise1, fbm1, noise2, fbm2, roughProfile, roughRect, pathFrom, roundRect, ease, EASE_NAMES, hexRgb, rgba, shade, canvas, tmp, gridFor, uid };
})();
