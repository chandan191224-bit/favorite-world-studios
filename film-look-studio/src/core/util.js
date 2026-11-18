// Shared math, seeded noise, easing and canvas helpers. Nothing here uses Math.random or the clock,
// so every frame of a look renders the same in the preview, the export and the command-line renderer.
var FL = (typeof window !== 'undefined' ? (window.FL = window.FL || {}) : (globalThis.FL = globalThis.FL || {}));
FL.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  // 0 -> 1 -> 0 hump, peak at m
  const bell = (p, m = 0.5) => (p < m ? smooth(p / m) : smooth((1 - p) / (1 - m)));

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

  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    expoOut: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    expoIn: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };

  function hexRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const mix = (h1x, h2x, t) => { const a = hexRgb(h1x), b = hexRgb(h2x); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`; };

  function canvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  // reusable scratch canvases, keyed
  const pool = {};
  function tmp(key, w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let c = pool[key];
    if (!c || c.width !== w || c.height !== h) c = pool[key] = canvas(w, h);
    return c;
  }
  function ctx2(c, reset = true) {
    const g = c.getContext('2d');
    if (reset) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.imageSmoothingEnabled = true; g.clearRect(0, 0, c.width, c.height); }
    return g;
  }
  // memo for heavy, deterministic things (noise tiles, burn fields, paper textures)
  const memo = new Map();
  function cache(key, fn) {
    if (memo.has(key)) return memo.get(key);
    const v = fn();
    if (memo.size > 220) memo.delete(memo.keys().next().value);
    memo.set(key, v);
    return v;
  }
  // cheap soft blur without ctx.filter (works on Safari): shrink in halves, then scale back up
  function blurInto(dst, src, px, key = 'blur') {
    const W = dst.width, H = dst.height, g = dst.getContext('2d');
    const f = Math.max(1, px / 1.6);
    if (f <= 1.05) { g.drawImage(src, 0, 0, W, H); return dst; }
    let cur = src, cw = src.width, ch = src.height, step = 0;
    const tw = Math.max(2, Math.round(W / f)), th = Math.max(2, Math.round(H / f));
    while (cw / 2 > tw) {
      const n = tmp(`${key}_d${step++}`, Math.max(tw, Math.round(cw / 2)), Math.max(th, Math.round(ch / 2)));
      const ng = ctx2(n); ng.drawImage(cur, 0, 0, n.width, n.height);
      cur = n; cw = n.width; ch = n.height;
    }
    const last = tmp(`${key}_last`, tw, th), lg = ctx2(last);
    lg.drawImage(cur, 0, 0, tw, th);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(last, 0, 0, W, H);
    return dst;
  }
  // one colour channel of a picture (multiply by pure red/green/blue)
  function channel(src, ch, key) {
    const c = tmp(key || 'ch' + ch, src.width, src.height), g = ctx2(c);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = ['#ff0000', '#00ff00', '#0000ff'][ch];
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(src, 0, 0);
    return c;
  }
  const uid = () => (typeof crypto !== 'undefined' && crypto.getRandomValues ? Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(36)).join('').slice(0, 8) : String(Date.now() % 1e8));
  const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };

  return { clamp, lerp, range, smooth, sstep, bell, rng, h1, h2, noise1, fbm1, noise2, fbm2, ease, hexRgb, rgba, mix, canvas, tmp, ctx2, cache, blurInto, channel, uid, fmt };
})();
