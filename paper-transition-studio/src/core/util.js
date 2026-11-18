// Shared math, noise, easing and canvas helpers. Everything is deterministic per seed,
// so a torn edge looks the same on every frame and in every export.
window.PT = window.PT || {};
PT.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));
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

  // Torn-paper edge profile: big meanders + medium wobble + sharp fibre teeth.
  // Returns an offset (in px) for a position u (in px) along the tear.
  function tornProfile(seed, rough, S) {
    const big = rough * 0.03 * S, mid = rough * 0.011 * S, tooth = (0.25 + rough) * 0.0042 * S;
    const fb = 1 / (0.22 * S), fm = 1 / (0.045 * S), ft = 1 / (0.0065 * S);
    return u => {
      const ti = u * ft, i = Math.floor(ti), f = ti - i;
      const t0 = h1(i, seed + 7) - 0.5, t1 = h1(i + 1, seed + 7) - 0.5;
      // saw-like teeth: sharp but continuous
      const teeth = (f < 0.5 ? lerp(t0, (t0 + t1) / 2 + (h1(i, seed + 9) - 0.5) * 0.9, f * 2) : lerp((t0 + t1) / 2 + (h1(i, seed + 9) - 0.5) * 0.9, t1, (f - 0.5) * 2));
      return big * fbm1(u * fb, seed, 3) + mid * fbm1(u * fm, seed + 3, 2) + tooth * teeth * 2;
    };
  }
  // Points along a line from (ax,ay) to (bx,by), displaced sideways by a torn profile.
  function tornLine(ax, ay, bx, by, prof, step, u0 = 0) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, n = Math.max(2, Math.ceil(L / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, o = prof ? prof(u0 + t * L) : 0;
      pts.push([ax + dx * t + nx * o, ay + dy * t + ny * o]);
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
  function centroid(pts) {
    let x = 0, y = 0;
    for (const q of pts) { x += q[0]; y += q[1]; }
    return [x / pts.length, y / pts.length];
  }
  function xform(pts, cx, cy, ang, tx, ty, sx = 1, sy = 1) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map(([x, y]) => {
      const X = (x - cx) * sx, Y = (y - cy) * sy;
      return [cx + X * c - Y * s + tx, cy + X * s + Y * c + ty];
    });
  }

  const ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    // slow nick, then a fast rip, then a soft stop: the look of a real tear
    rip: t => (t < 0.2 ? 0.06 * smooth(t / 0.2) : 0.06 + 0.94 * (0.5 - 0.5 * Math.cos(Math.PI * clamp((t - 0.2) / 0.8)))),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    inQuad: t => t * t,
    outBack: t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    expoIn: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  };
  const EASE_NAMES = { rip: 'Real tear (slow nick → fast rip)', inOut: 'Smooth in-out', out: 'Fast start, soft stop', in: 'Slow start, fast end', linear: 'Linear', outQuart: 'Snappy', outBack: 'Overshoot' };

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
  // corners of the frame projected on direction d=(dx,dy) and its normal, from the centre
  function frameSpan(W, H, dx, dy) {
    const cs = [[0, 0], [W, 0], [0, H], [W, H]];
    let smin = 1e9, smax = -1e9, umin = 1e9, umax = -1e9;
    for (const [x, y] of cs) {
      const X = x - W / 2, Y = y - H / 2, s = X * dx + Y * dy, u = -X * dy + Y * dx;
      smin = Math.min(smin, s); smax = Math.max(smax, s); umin = Math.min(umin, u); umax = Math.max(umax, u);
    }
    return { smin, smax, umin, umax };
  }
  const uid = () => Math.random().toString(36).slice(2, 9);

  return { clamp, lerp, range, smooth, rng, h1, h2, noise1, fbm1, noise2, fbm2, tornProfile, tornLine, pathFrom, centroid, xform, ease, EASE_NAMES, hexRgb, rgba, shade, canvas, frameSpan, uid };
})();
