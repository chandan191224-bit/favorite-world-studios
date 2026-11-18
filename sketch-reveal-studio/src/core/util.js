// Shared math, seeded noise, easing and canvas helpers. Everything is deterministic per seed,
// so a frame looks the same in the preview, in every export and in the pipeline render.
// No Math.random / Date inside any drawing code — only ui ids use random.
window.SK = window.SK || {};
SK.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : clamp((p - a) / (b - a)));
  const smooth = t => t * t * (3 - 2 * t);

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
  function fbm2(x, y, seed, oct = 4) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise2(x * f, y * f, seed + o * 977); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  // fractal noise sampled along a line — the hand wobble
  const wob = (x, y, seed, oct = 3) => fbm2(x * 0.09, y * 0.09, seed, oct);

  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: t => { const c = 1.7; const v = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); return v < 0 ? 0 : v; },
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    // artist's hand: very soft start, quick middle, long settle
    cine: t => 1 - Math.pow(1 - smooth(t), 2.2),
    // almost-linear with soft ends — how a pen stroke actually moves
    pen: t => smooth(smooth(clamp(t))),
  };
  const EASES = [['out', 'Smooth stop'], ['outQuart', 'Snappy'], ['outExpo', 'Very snappy'], ['inOut', 'In-out'], ['cine', 'Cinematic slow'], ['pen', 'Pen stroke'], ['linear', 'Linear']];

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
  function mix(c1, c2, t) {
    const a = hexRgb(c1), b = hexRgb(c2);
    return '#' + a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))).toString(16).padStart(2, '0')).join('');
  }
  const lum = hex => { const [r, g, b] = hexRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
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
  // Indian digit grouping for numbers shown to the user (1,25,00,000)
  function groupIndian(n) {
    let s = String(Math.round(n)).split('.');
    let i = s[0], neg = i.startsWith('-') ? '-' : '';
    if (neg) i = i.slice(1);
    if (i.length > 3) i = i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + i.slice(-3);
    return neg + i + (s[1] ? '.' + s[1] : '');
  }

  // tiny cooperative job runner: heavy work (photo analysis) is cut into slices so the
  // page never freezes — the studio answers in a few ms even while analysing.
  const jobs = [];
  let running = false;
  function tick() {
    const start = performance.now();
    while (jobs.length && performance.now() - start < 24) {
      const j = jobs[0];
      try { j.step(); } catch (e) { console.error('job', e); jobs.shift(); j.done(e); continue; }
      if (j.finished()) { jobs.shift(); j.done(); }
    }
    running = jobs.length > 0;
    if (running) setTimeout(tick, 0);
  }
  function runJob(step, finished, done) {
    jobs.push({ step, finished, done });
    if (!running) { running = true; tick(); }
    return () => { const i = jobs.findIndex(j => j.step === step); if (i >= 0) jobs.splice(i, 1); };
  }

  return { clamp, lerp, range, smooth, h1, h2, rng, noise1, noise2, fbm2, wob, ease, EASES, hexRgb, rgba, shade, mix, lum, canvas, rrect, uid, groupIndian, runJob };
})();
