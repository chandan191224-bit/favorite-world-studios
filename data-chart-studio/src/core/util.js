// Shared helpers: maths, easing, seeded noise, colour, canvas, CSV. Everything deterministic (no Math.random in drawing).
window.DC = window.DC || {};
DC.util = (() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const prog = (t, t0, d) => clamp(d <= 0 ? (t >= t0 ? 1 : 0) : (t - t0) / d);
  const ease = {
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    quint: t => 1 - Math.pow(1 - t, 5),
    back: t => { const c = 1.45; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    elastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3.2) + 1),
    smooth: t => t * t * (3 - 2 * t),
  };
  // seeded PRNG + hash
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  let uidN = 0;
  const uid = () => 's' + Date.now().toString(36).slice(-4) + (++uidN).toString(36);

  // colour
  function hex(c) {
    if (!c) return [0, 0, 0];
    if (c[0] !== '#') { const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; }
    let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgba = (c, a = 1) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  const mix = (c1, c2, t) => { const a = hex(c1), b = hex(c2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`; };
  const lum = c => { const [r, g, b] = hex(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

  function canvas(w, h) {
    const c = typeof OffscreenCanvas !== 'undefined' && !window.__DOMCANVAS ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    c.width = w; c.height = h; return c;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // CSV / TSV (quotes, escaped quotes, multiline cells). Auto-detects tab or semicolon when pasted from Excel/Sheets.
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split('\n')[0] || '';
    const sep = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ''));
  }
  function toCSV(rows) { return rows.map(r => r.map(c => { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\n'); }
  // "₹1,23,456.7 cr", "45%", "(12)", "-3.5" -> number (NaN if not numeric). Devanagari digits accepted.
  function num(s) {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    let t = String(s).replace(/[०-९]/g, d => '0123456789'['०१२३४५६७८९'.indexOf(d)]).trim();
    const neg = /^\(.*\)$/.test(t) || /^[-−–]/.test(t);
    t = t.replace(/[^0-9.eE+-]/g, '').replace(/^[-+]/, '');
    if (!t || !/\d/.test(t)) return NaN;
    const v = parseFloat(t);
    return neg ? -v : v;
  }
  // "nice" axis ticks
  function niceStep(range, count) {
    const raw = range / Math.max(1, count), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function niceMax(v, count = 5) { if (v <= 0) return 1; const s = niceStep(v, count); return Math.ceil(v / s - 1e-9) * s; }
  function ticks(min, max, count = 5) { const s = niceStep(max - min, count), out = []; for (let v = Math.ceil(min / s - 1e-9) * s; v <= max + s * 1e-6; v += s) out.push(+v.toFixed(10)); return out; }

  return { clamp, lerp, inv, prog, ease, rng, hash, uid, hex, rgba, mix, lum, canvas, rr, parseCSV, toCSV, num, niceStep, niceMax, ticks };
})();
