// Shared math, seeded noise, easing and canvas helpers. Everything is deterministic per seed,
// so every frame looks identical in real-time preview, MP4 export, and pipeline headless render.
// Never use Math.random() or Date.now() inside visual effect drawing.
window.HES = window.HES || {};
HES.util = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : clamp((p - a) / (b - a)));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

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
  function rng(seed) {
    let a = (seed | 0) ^ 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(x, seed = 7) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(h1(i, seed), h1(i + 1, seed), u) * 2 - 1;
  }
  function noise2(x, y, seed = 7) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(ix, iy, seed), h2(ix + 1, iy, seed), ux), lerp(h2(ix, iy + 1, seed), h2(ix + 1, iy + 1, seed), ux), uy) * 2 - 1;
  }
  function fbm2(x, y, seed = 7, oct = 3) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise2(x * f, y * f, seed + o * 977); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }

  const ease = {
    linear: t => clamp(t),
    out: t => 1 - Math.pow(1 - clamp(t), 3),
    outQuart: t => 1 - Math.pow(1 - clamp(t), 4),
    outExpo: t => { t = clamp(t); return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    outBack: t => { t = clamp(t); const c = 1.7; return Math.max(0, 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)); },
    inOut: t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    cine: t => 1 - Math.pow(1 - smooth(t), 2.2),
    beat: t => { t = clamp(t); return Math.exp(-7 * t); },
  };
  const EASES = [
    ['out', 'Smooth stop'], ['outQuart', 'Snappy'], ['outExpo', 'Very snappy'],
    ['outBack', 'Overshoot'], ['inOut', 'In-out'], ['cine', 'Cinematic'], ['linear', 'Linear'],
  ];

  function hexRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${clamp(a)})`; };
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  const uid = () => Math.random().toString(36).slice(2, 9);
  const num = v => {
    const a = Math.abs(v);
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
    return (Math.round(v * 100) / 100).toString().replace(/\.0[0]?$/, '').replace(/(\.\d)0$/, '$1');
  };
  const dbToGain = db => Math.pow(10, clamp(db, -60, 12) / 20);
  const fmtTime = s => `${Math.floor(Math.max(0, s) / 60)}:${(Math.max(0, s) % 60).toFixed(1).padStart(4, '0')}`;

  return { TAU, clamp, lerp, range, smooth, h1, h2, rng, noise1, noise2, fbm2, ease, EASES, hexRgb, rgba, canvas, rrect, uid, num, dbToGain, fmtTime };
})();
