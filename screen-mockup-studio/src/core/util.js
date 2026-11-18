// Shared math, noise, easing, text and canvas helpers. Everything is deterministic (seeded, driven only by t),
// so the preview, the browser export and the headless pipeline render are the same picture.
window.SM = window.SM || {};
SM.util = (() => {
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a || 1e-6));
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
  function fbm1(x, seed, oct = 3) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += a * noise1(x * f, seed + o * 131); n += a; a *= 0.5; f *= 2.07; }
    return s / n;
  }

  // easing (all 0..1 -> 0..1)
  const ease = {
    linear: t => t,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    expo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    spring: t => (t >= 1 ? 1 : 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6.5)),
    smooth,
  };
  const EASE_NAMES = { inOut: 'Smooth (cinematic)', out: 'Fast start, soft stop', expo: 'Snappy (expo)', back: 'Overshoot', spring: 'Spring', linear: 'Linear' };

  let uidN = 0;
  const uid = () => 's' + Date.now().toString(36).slice(-4) + (uidN++).toString(36);
  const canvas = (W, H) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H));
    return c;
  };

  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // greedy word wrap (works for Hindi too: splits on spaces)
  function wrap(g, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  // first n visible characters of a string, counting grapheme clusters so Devanagari matras never split
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('hi', { granularity: 'grapheme' }) : null;
  function graphemes(s) { s = String(s || ''); return seg ? Array.from(seg.segment(s), x => x.segment) : Array.from(s); }
  function typed(s, n) { const g = graphemes(s); return g.slice(0, Math.max(0, Math.floor(n))).join(''); }
  function glen(s) { return graphemes(s).length; }

  function hex(c) {
    c = String(c || '#000').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (c, a = 1) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
  }
  const shade = (c, k) => (k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k));

  const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
  // "HH:MM:SS" from a start clock "21:47:05" plus seconds
  function clock(start, sec) {
    const [h, m, s] = String(start || '00:00:00').split(':').map(x => +x || 0);
    let tot = Math.floor(h * 3600 + m * 60 + s + sec);
    tot = ((tot % 86400) + 86400) % 86400;
    return `${pad(tot / 3600)}:${pad((tot % 3600) / 60)}:${pad(tot % 60)}`;
  }
  const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;

  // a stack of keyed scratch canvases (re-used every frame, never reallocated unless size changes)
  const tmps = {};
  function tmp(key, W, H) {
    W = Math.max(1, Math.round(W)); H = Math.max(1, Math.round(H));
    let c = tmps[key];
    if (!c || c.width !== W || c.height !== H) c = tmps[key] = canvas(W, H);
    return c;
  }

  return { clamp, lerp, range, smooth, rng, h1, h2, noise1, fbm1, ease, EASE_NAMES, uid, canvas, rr, wrap, graphemes, typed, glen, hex, rgba, mix, shade, pad, clock, mmss, tmp };
})();

// Bundled fonts (inlined by build.mjs, OFL): SMSans = Inter (Latin) + Mukta (Devanagari); SMSerif = Noto Serif + Mukta;
// SMMono = JetBrains Mono + Mukta. Hindi text works everywhere.
SM.FONT = { sans: "'SMSans', system-ui, sans-serif", serif: "'SMSerif', Georgia, serif", mono: "'SMMono', ui-monospace, monospace" };
SM.font = (w, px, kind = 'sans') => `${w} ${Math.max(1, px).toFixed(2)}px ${SM.FONT[kind] || SM.FONT.sans}`;
