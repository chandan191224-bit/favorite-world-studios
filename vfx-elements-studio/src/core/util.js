// Shared math, seeded noise, easing and canvas helpers. Everything is deterministic per seed,
// so a frame looks the same in the preview, in every export and in the pipeline render.
// No Math.random / Date inside effects — ever.
window.VFX = window.VFX || {};
VFX.util = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : clamp((p - a) / (b - a)));
  const smooth = t => t * t * (3 - 2 * t);

  // ---- seeded hashes ----
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
  function h3(ix, iy, iz, seed) {
    let x = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(iz | 0, 1103515245) ^ Math.imul(seed | 0, 2246822519);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  // seeded RNG stream (mulberry-style) — for building particle tables, never per frame
  function rng(seed) {
    let a = (seed | 0) ^ 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- value noise (smooth, -1..1) ----
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(h1(i, seed), h1(i + 1, seed), u) * 2 - 1;
  }
  function noise2(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h2(ix, iy, seed), b = h2(ix + 1, iy, seed), c = h2(ix, iy + 1, seed), d = h2(ix + 1, iy + 1, seed);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function noise3(x, y, z, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const a = h3(ix, iy, iz, seed), b = h3(ix + 1, iy, iz, seed), c = h3(ix, iy + 1, iz, seed), d = h3(ix + 1, iy + 1, iz, seed);
    const e = h3(ix, iy, iz + 1, seed), f = h3(ix + 1, iy, iz + 1, seed), g = h3(ix, iy + 1, iz + 1, seed), q = h3(ix + 1, iy + 1, iz + 1, seed);
    return lerp(lerp(lerp(a, b, ux), lerp(c, d, ux), uy), lerp(lerp(e, f, ux), lerp(g, q, ux), uy), uz) * 2 - 1;
  }
  function fbm2(x, y, seed, oct = 4) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise2(x * f, y * f, seed + o * 977); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  function fbm3(x, y, z, seed, oct = 3) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise3(x * f, y * f, z * f, seed + o * 977); n += a; a *= 0.55; f *= 2.11; }
    return s / n;
  }
  // ridged noise (sharp crests, 0..1) — caustics, cloud edges
  function ridge3(x, y, z, seed, oct = 3) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * (1 - Math.abs(noise3(x * f, y * f, z * f, seed + o * 977))); n += a; a *= 0.55; f *= 2.11; }
    return s / n;
  }
  // curl of a noise field at (x,y) — perpendicular flow that never converges (fluid-looking advection)
  function curl2(x, y, seed, e = 0.35) {
    const n1 = fbm2(x, y + e, seed, 2), n2 = fbm2(x, y - e, seed, 2);
    const n3 = fbm2(x + e, y, seed + 131, 2), n4 = fbm2(x - e, y, seed + 131, 2);
    return [(n1 - n2) / (2 * e), -(n3 - n4) / (2 * e)];
  }
  // time-looping sample: two phases cross-faded so t=0 and t=L match exactly
  function loopNoise3(x, y, z, L, seed, oct) {
    if (!L || L <= 0) return fbm3(x, y, z, seed, oct);
    const m = ((z % L) + L) % L, w = m / L;
    return lerp(fbm3(x, y, m, seed, oct), fbm3(x, y, m - L, seed, oct), w);
  }

  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    outQuad: t => 1 - (1 - t) * (1 - t),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: t => { const c = 1.7; const v = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); return v < 0 ? 0 : v; },
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    cine: t => 1 - Math.pow(1 - smooth(t), 2.2),
  };
  const EASES = [['out', 'Smooth stop'], ['outQuart', 'Snappy'], ['outExpo', 'Very snappy'], ['outBack', 'Overshoot'], ['inOut', 'In-out'], ['cine', 'Cinematic slow'], ['linear', 'Linear']];

  // ---- colour ----
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
  function mix(h1c, h2c, t) {
    const a = hexRgb(h1c), b = hexRgb(h2c);
    return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))).toString(16).padStart(2, '0')).join('');
  }
  const lum = hex => { const [r, g, b] = hexRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

  // ---- canvas ----
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
  const uid = () => Math.random().toString(36).slice(2, 9); // ids only, never used in drawing
  // small numbers as whole numbers in the UI ("362", never "362.0")
  const num = v => {
    const a = Math.abs(v);
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
    return (Math.round(v * 100) / 100).toString().replace(/\.0[0]?$/, '').replace(/(\.\d)0$/, '$1');
  };

  return { TAU, clamp, lerp, range, smooth, h1, h2, h3, rng, noise1, noise2, noise3, fbm2, fbm3, ridge3, curl2, loopNoise3, ease, EASES, hexRgb, rgba, shade, mix, lum, canvas, rrect, uid, num };
})();
