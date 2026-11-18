// Text: bundled fonts, Devanagari-safe grapheme clusters, line layout.
// Rule: a Devanagari cluster (consonant + virama + consonant ... + matras/nukta/anusvara) is NEVER
// split, so ink write-on animations move whole akshar like क्ष, त्रि, र्म, हिं — no dotted circles.
SK.text = (() => {
  const U = SK.util;
  // id -> [label, CSS family, has Devanagari, weights, Devanagari partner used for Hindi glyphs in Latin-only fonts]
  const FONTS = {
    mukta: ['Mukta (हिंदी)', 'Mukta', true, [400, 600]],
    kalam: ['Kalam handwriting (हिंदी)', 'Kalam', true, [400, 700]],
    tiro: ['Tiro Hindi ink serif (हिंदी)', 'Tiro Devanagari Hindi', true, [400]],
    caveat: ['Caveat hand (Latin)', 'Caveat', false, [400, 700], 'kalam'],
  };
  const FONT_OPTIONS = Object.entries(FONTS).map(([k, v]) => [k, v[0]]);
  function font(id, size, weight = 'bold', italic = false) {
    const f = FONTS[id] || FONTS.mukta, ws = f[3];
    const w = weight === 'bold' ? ws[ws.length - 1] : weight === 'normal' ? ws[0] : weight;
    const partner = f[2] ? '' : `"${FONTS[f[4] || 'kalam'][1]}", `;
    const it = italic && id === 'tiro' ? 'italic ' : '';
    return `${it}${w} ${Math.max(1, size).toFixed(2)}px "${f[1]}", ${partner}"Kalam", "Noto Sans Devanagari", sans-serif`;
  }
  // wait for every bundled face (Latin + Devanagari) so canvas never draws with a fallback font
  let readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (!document.fonts || !document.fonts.load) return (readyP = Promise.resolve());
    const jobs = [];
    for (const [, f] of Object.entries(FONTS)) for (const w of f[3]) {
      jobs.push(document.fonts.load(`${w} 40px "${f[1]}"`, 'AaZz09₹ क्षत्रिय हिंदी'));
      if (f[1] === 'Tiro Devanagari Hindi') jobs.push(document.fonts.load(`italic ${w} 40px "${f[1]}"`, 'Aa हिं'));
    }
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

  // ---------- layout ----------
  // lines of words with clusters, in design px relative to the block origin.
  // o: {font, size, weight, italic, maxW, lineH, align, valign, tracking, upper, wordGap}
  const cache = new Map();
  let mctx = null;
  function layout(text, o) {
    const key = JSON.stringify([text, o.font, o.size, o.weight, o.italic, o.maxW, o.lineH, o.align, o.valign, o.tracking, o.upper, o.wordGap]);
    let L = cache.get(key);
    if (L) return L;
    if (!mctx) mctx = U.canvas(8, 8).getContext('2d');
    const g = mctx, size = o.size || 60, track = (o.tracking || 0) * size;
    g.font = font(o.font, size, o.weight, o.italic);
    const sp = g.measureText(' ').width * (o.wordGap || 1) + track * 1.35;
    const m = g.measureText('Hgकि्षुै');
    const asc = m.fontBoundingBoxAscent || size * 0.92, desc = m.fontBoundingBoxDescent || size * 0.3;
    const words = String(text == null ? '' : text).replace(/\r/g, '').split('\n').map((line, br) => line.split(/[ \t]+/).filter(Boolean).map(t => ({ text: t, br }))).flat()
      .map(w => {
        const t = o.upper ? w.text.replace(/[a-zà-ÿ]+/g, m => m.toUpperCase()) : w.text;
        const cl = clusters(t), deva = isDeva(t);
        const xs = [];
        let acc = '';
        for (let i = 0; i < cl.length; i++) {
          xs.push(g.measureText(acc).width + (deva ? 0 : track * i));
          acc += cl[i];
        }
        const w0 = g.measureText(t).width + (deva ? 0 : track * Math.max(0, cl.length - 1));
        return { text: t, br: w.br, deva, cl: cl.map((c, i) => ({ text: c, x: xs[i], w: (i + 1 < cl.length ? xs[i + 1] : w0) - xs[i] })), w: w0 };
      });
    const maxW = o.maxW || 1e9, lines = [];
    let cur = null;
    for (const w of words) {
      if (!cur || w.br !== cur.br || (cur.words.length && cur.w + sp + w.w > maxW)) { cur = { words: [], w: 0, br: w.br }; lines.push(cur); }
      cur.w += (cur.words.length ? sp : 0) + w.w;
      cur.words.push(w);
    }
    const lh = size * (o.lineH || 1.15);
    const H = lines.length ? (lines.length - 1) * lh + asc + desc : 0;
    const W = lines.reduce((a, l) => Math.max(a, l.w), 0);
    const top = o.valign === 'top' ? 0 : o.valign === 'bottom' ? -H : -H / 2;
    const units = { word: [], cluster: [], line: [] };
    lines.forEach((l, li) => {
      const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -l.w : -l.w / 2;
      l.x = x0; l.base = top + asc + li * lh; l.top = l.base - asc; l.bottom = l.base + desc; l.i = li;
      let x = x0;
      l.words.forEach(w => {
        w.x = x; w.base = l.base; w.line = l;
        units.word.push(w);
        w.cl.forEach(c => { c.ax = x + c.x; c.base = l.base; c.line = l; c.word = w; units.cluster.push(c); });
        x += w.w + sp;
      });
      units.line.push(l);
    });
    L = { lines, units, W, H, top, asc, desc, lh, size, space: sp, fontStr: g.font, left: Math.min(0, ...lines.map(l => l.x)), o };
    if (cache.size > 300) cache.clear();
    cache.set(key, L);
    return L;
  }
  function fit(text, o, maxH) {
    let L = layout(text, o);
    let s = o.size, guard = 0;
    while ((L.W > (o.maxW || 1e9) * 1.001 || (maxH && L.H > maxH)) && guard++ < 16) {
      s *= 0.9; L = layout(text, Object.assign({}, o, { size: s }));
    }
    return L;
  }

  return { FONTS, FONT_OPTIONS, font, ready, clusters, isDeva, layout, fit };
})();
