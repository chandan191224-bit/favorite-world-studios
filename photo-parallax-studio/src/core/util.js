// Shared math, noise, easing and canvas helpers. Everything is seeded so preview == export.
window.PP = window.PP || {};
PP.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  function rng(seed) {
    let a = (seed | 0) ^ 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function h2(ix, iy, seed) {
    let x = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function noise2(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(ix, iy, seed), h2(ix + 1, iy, seed), ux), lerp(h2(ix, iy + 1, seed), h2(ix + 1, iy + 1, seed), ux), uy) * 2 - 1;
  }
  function fbm2(x, y, seed, oct = 4) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise2(x * f, y * f, seed + o * 977); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  const ease = {
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: t => 0.5 - 0.5 * Math.cos(Math.PI * t),
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    crash: t => 1 - Math.pow(1 - clamp(t / 0.55), 4),
  };
  const EASE_NAMES = { sine: 'Gentle (documentary)', inOut: 'Smooth in-out', linear: 'Constant speed', out: 'Fast start, soft stop', in: 'Slow start, fast end', crash: 'Crash (fast then hold)' };
  function hexRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  // separable box blur x3 (≈ gaussian) on a Float32 field
  function blurField(f, w, h, r) {
    r = Math.max(1, Math.round(r));
    const tmp = new Float32Array(f.length);
    const pass = (src, dst, horiz) => {
      const n = horiz ? w : h, m = horiz ? h : w;
      for (let j = 0; j < m; j++) {
        let acc = 0;
        const at = i => src[horiz ? j * w + clampI(i, n) : clampI(i, n) * w + j];
        for (let i = -r; i <= r; i++) acc += at(i);
        for (let i = 0; i < n; i++) {
          dst[horiz ? j * w + i : i * w + j] = acc / (2 * r + 1);
          acc += at(i + r + 1) - at(i - r);
        }
      }
    };
    for (let k = 0; k < 3; k++) { pass(f, tmp, true); pass(tmp, f, false); }
    return f;
  }
  const clampI = (i, n) => (i < 0 ? 0 : i >= n ? n - 1 : i);
  // blur an RGBA canvas (premultiplied by working on a downscaled copy and upscaling = cheap soft blur)
  function blurCanvas(src, r) {
    const k = Math.max(1, r / 3), w = Math.max(1, Math.round(src.width / k)), h = Math.max(1, Math.round(src.height / k));
    const a = canvas(w, h), g = a.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    const id = g.getImageData(0, 0, w, h), d = id.data, n = w * h;
    for (let c = 0; c < 4; c++) {
      const f = new Float32Array(n);
      for (let i = 0; i < n; i++) f[i] = c < 3 ? d[i * 4 + c] * d[i * 4 + 3] / 255 : d[i * 4 + 3];
      blurField(f, w, h, 1.6);
      for (let i = 0; i < n; i++) d[i * 4 + c] = f[i];
    }
    for (let i = 0; i < n; i++) { const al = d[i * 4 + 3]; if (al > 0) for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.min(255, d[i * 4 + c] * 255 / al); }
    g.putImageData(id, 0, 0);
    return a;
  }
  const uid = () => Math.random().toString(36).slice(2, 9);
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image failed to load')); im.src = src; });
  }
  return { clamp, lerp, smooth, sstep, rng, h2, noise2, fbm2, ease, EASE_NAMES, hexRgb, rgba, canvas, blurField, blurCanvas, uid, loadImage };
})();
