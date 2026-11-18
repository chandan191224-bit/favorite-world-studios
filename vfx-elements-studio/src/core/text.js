// Text: the bundled OFL fonts + Devanagari-safe grapheme clusters + a small layout helper.
// Text appears in flying documents/paper and template/shot names — Hindi must shape correctly
// (a Devanagari cluster is NEVER split: क्ष, त्रि, र्म, हिं always move as one).
VFX.text = (() => {
  const U = VFX.util;
  // id -> [label, CSS family, has Devanagari, weights]
  const FONTS = {
    mukta: ['Mukta (हिंदी)', 'Mukta', true, [500, 800]],
    khand: ['Khand condensed (हिंदी)', 'Khand', true, [600]],
    kalam: ['Kalam handwriting (हिंदी)', 'Kalam', true, [400]],
    bebas: ['Bebas Neue caps', 'Bebas Neue', false, [400]],
  };
  const FONT_OPTIONS = Object.entries(FONTS).map(([k, v]) => [k, v[0]]);
  function font(id, size, weight = 'bold', italic = false) {
    const f = FONTS[id] || FONTS.mukta, ws = f[3];
    const w = weight === 'bold' ? ws[ws.length - 1] : weight === 'normal' ? ws[0] : weight;
    const partner = f[2] ? '' : `"Mukta", `;
    return `${italic ? 'italic ' : ''}${w} ${Math.max(1, size).toFixed(2)}px "${f[1]}", ${partner}"Mukta", sans-serif`;
  }
  // wait for every bundled face so canvas never draws with a fallback font
  let readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (!document.fonts || !document.fonts.load) return (readyP = Promise.resolve());
    const jobs = [];
    for (const [, f] of Object.entries(FONTS)) for (const w of f[3])
      jobs.push(document.fonts.load(`${w} 40px "${f[1]}"`, 'AaZz09₹ क्षत्रिय हिंदी'));
    return (readyP = Promise.all(jobs).catch(() => {}).then(() => document.fonts.ready));
  }

  // ---------- clusters ----------
  const DEVA = /[ऀ-ॿ꣠-ꣿ᳐-᳿]/;
  const isDeva = s => DEVA.test(s);
  const VIRAMA = '्', ZWJ = '‍', ZWNJ = '‌';
  let seg = null;
  try { seg = new Intl.Segmenter('hi', { granularity: 'grapheme' }); } catch (e) { seg = null; }
  const isMark = c => /[ऀ-ःऺ-ॏ॑-ॗॢॣ‌‍]/.test(c);
  function clusters(s) {
    let parts;
    if (seg) parts = Array.from(seg.segment(s), x => x.segment);
    else {
      parts = [];
      for (const c of Array.from(s)) { if (parts.length && isMark(c)) parts[parts.length - 1] += c; else parts.push(c); }
    }
    // older ICU splits conjuncts after the virama: merge so क्ष / त्र / र्म stay whole
    const out = [];
    for (const p of parts) {
      const last = out[out.length - 1];
      if (last && (last.endsWith(VIRAMA) || last.endsWith(ZWJ) || last.endsWith(ZWNJ) || isMark(p[0]))) out[out.length - 1] = last + p;
      else out.push(p);
    }
    return out;
  }
  const upperLatin = s => s.replace(/[a-zà-ÿ]+/g, m => m.toUpperCase());

  // ---------- layout (simple, for document text) ----------
  let mctx = null;
  const cache = new Map();
  // lines of `text` (explicit \n, optional auto-wrap at maxW), design px, left-aligned rows
  function layout(text, o) {
    const key = JSON.stringify([text, o.font, o.size, o.weight, o.maxW, o.tracking, o.upper]);
    let L = cache.get(key);
    if (L) return L;
    if (!mctx) mctx = U.canvas(8, 8).getContext('2d');
    const g = mctx, size = o.size || 40, track = (o.tracking || 0) * size;
    g.font = font(o.font, size, o.weight || 'bold');
    const lh = size * (o.lineH || 1.25);
    const rows = [];
    for (const raw of String(text == null ? '' : text).replace(/\r/g, '').split('\n')) {
      const src = o.upper ? upperLatin(raw) : raw;
      if (!src.trim()) { rows.push({ text: '', w: 0 }); continue; }
      const words = src.split(/\s+/);
      let line = '';
      const push = () => { rows.push({ text: line, w: g.measureText(line).width + track * Math.max(0, line.length - 1) }); };
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (o.maxW && line && g.measureText(t).width > o.maxW) { push(); line = w; }
        else line = t;
      }
      push();
    }
    L = { rows, lh, size, fontStr: g.font, track, H: rows.length * lh };
    if (cache.size > 300) cache.clear();
    cache.set(key, L);
    return L;
  }
  // draw left-aligned block at (x, y = top). Returns total height.
  function draw(g, text, o, x, y, color) {
    const L = layout(text, o);
    g.font = L.fontStr; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = color || '#111';
    L.rows.forEach((r, i) => g.fillText(r.text, x, y + (i + 0.78) * L.lh));
    return L.H;
  }

  return { FONTS, FONT_OPTIONS, font, ready, clusters, isDeva, upperLatin, layout, draw };
})();
