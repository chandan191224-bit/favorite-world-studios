// Text: bundled fonts, Devanagari-safe grapheme clusters, line layout, *emphasis* markup, Indian number formats.
// Rule: a Devanagari cluster (consonant + virama + consonant ... + matras/nukta/anusvara) is NEVER split, so
// per-letter animations move whole akshar like क्ष, त्रि, र्म, हिं — no dotted circles, no broken matras.
KT.text = (() => {
  const U = KT.util;
  // id -> [label, CSS family, has Devanagari, weights, Devanagari partner used for Hindi glyphs in Latin-only fonts]
  const FONTS = {
    notoSans: ['Noto Sans (हिंदी)', 'Noto Sans Devanagari', true, [500, 800]],
    notoSerif: ['Noto Serif (हिंदी)', 'Noto Serif Devanagari', true, [600, 800]],
    hind: ['Hind (हिंदी)', 'Hind', true, [500, 700]],
    mukta: ['Mukta (हिंदी)', 'Mukta', true, [500, 800]],
    tiro: ['Tiro Hindi serif (हिंदी)', 'Tiro Devanagari Hindi', true, [400]],
    rozha: ['Rozha One display (हिंदी)', 'Rozha One', true, [400]],
    khand: ['Khand condensed (हिंदी)', 'Khand', true, [600]],
    teko: ['Teko condensed (हिंदी)', 'Teko', true, [600]],
    yatra: ['Yatra One brush (हिंदी)', 'Yatra One', true, [400]],
    kalam: ['Kalam handwriting (हिंदी)', 'Kalam', true, [400, 700]],
    bebas: ['Bebas Neue', 'Bebas Neue', false, [400], 'teko'],
    cinzel: ['Cinzel (movie)', 'Cinzel', false, [600, 800], 'notoSerif'],
    anton: ['Anton', 'Anton', false, [400], 'khand'],
    playfair: ['Playfair Display', 'Playfair Display', false, [700], 'notoSerif'],
    montserrat: ['Montserrat', 'Montserrat', false, [600, 800], 'mukta'],
    inter: ['Inter', 'Inter', false, [500, 700], 'notoSans'],
    oswald: ['Oswald', 'Oswald', false, [600], 'khand'],
    elite: ['Special Elite typewriter', 'Special Elite', false, [400], 'hind'],
    mono: ['Roboto Mono', 'Roboto Mono', false, [500], 'hind'],
  };
  const FONT_OPTIONS = Object.entries(FONTS).map(([k, v]) => [k, v[0]]);
  // CSS font string. weight 'bold' picks the heaviest bundled weight, 'normal' the lightest (no faux bold).
  function font(id, size, weight = 'bold', italic = false) {
    const f = FONTS[id] || FONTS.notoSans, ws = f[3];
    const w = weight === 'bold' ? ws[ws.length - 1] : weight === 'normal' ? ws[0] : weight;
    const partner = f[2] ? '' : `"${FONTS[f[4] || 'notoSans'][1]}", `;
    const it = italic && (id === 'playfair' || id === 'tiro') ? 'italic ' : '';
    return `${it}${w} ${Math.max(1, size).toFixed(2)}px "${f[1]}", ${partner}"Noto Sans Devanagari", sans-serif`;
  }
  // wait for every bundled face (Latin + Devanagari) so canvas never draws with a fallback font
  let readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (!document.fonts || !document.fonts.load) return (readyP = Promise.resolve());
    const jobs = [];
    for (const [, f] of Object.entries(FONTS)) for (const w of f[3]) {
      jobs.push(document.fonts.load(`${w} 40px "${f[1]}"`, 'AaZz09₹ क्षत्रिय हिंदी'));
      if (f[1] === 'Playfair Display' || f[1] === 'Tiro Devanagari Hindi') jobs.push(document.fonts.load(`italic ${w} 40px "${f[1]}"`, 'Aa हिं'));
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
    else { // old browsers: code points + attach combining marks
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

  // ---------- markup ----------
  // "*word*" = emphasis (accent colour / highlight / circle…). "\n" or " / " forces a line break.
  function parse(text) {
    const words = [];
    let emph = false, line = 0;
    const src = String(text == null ? '' : text).replace(/\r/g, '').replace(/\s+\/\s+/g, '\n');
    for (const rawLine of src.split('\n')) {
      for (let w of rawLine.split(/[ \t]+/)) {
        if (!w) continue;
        let e0 = emph;
        if (w.startsWith('*')) { w = w.slice(1); e0 = emph = true; }
        let closes = false;
        if (w.endsWith('*')) { w = w.slice(0, -1); closes = true; }
        if (w) words.push({ text: w, emph: e0, br: line });
        if (closes) emph = false;
      }
      line++;
    }
    return words;
  }
  const plain = text => parse(text).map(w => w.text).join(' ');
  const upperLatin = s => s.replace(/[a-zà-ÿ]+/g, m => m.toUpperCase());

  // ---------- layout ----------
  // Returns lines of words with clusters, all in design px relative to the block origin.
  // o: {font, size, weight, italic, maxW, lineH, align, valign, tracking (em, Latin only), upper, wordGap}
  const cache = new Map();
  let mctx = null;
  function layout(text, o) {
    const key = JSON.stringify([text, o.font, o.size, o.weight, o.italic, o.maxW, o.lineH, o.align, o.valign, o.tracking, o.upper, o.wordGap]);
    let L = cache.get(key);
    if (L) return L;
    if (!mctx) mctx = U.canvas(8, 8).getContext('2d');
    const g = mctx, size = o.size || 80, track = (o.tracking || 0) * size;
    g.font = font(o.font, size, o.weight, o.italic);
    // with wide tracking, widen the word gap too so words never visually merge into one
    const sp = g.measureText(' ').width * (o.wordGap || 1) + track * 1.35;
    const m = g.measureText('Hgकि्षुै');
    const asc = m.fontBoundingBoxAscent || size * 0.92, desc = m.fontBoundingBoxDescent || size * 0.3;
    const words = parse(text).map(w => {
      const t = o.upper ? upperLatin(w.text) : w.text;
      const cl = clusters(t), deva = isDeva(t);
      const xs = [];
      let acc = '';
      for (let i = 0; i < cl.length; i++) {
        // prefix measuring keeps shaping/kerning identical to drawing the whole word
        xs.push(g.measureText(acc).width + (deva ? 0 : track * i));
        acc += cl[i];
      }
      const w0 = g.measureText(t).width + (deva ? 0 : track * Math.max(0, cl.length - 1));
      return { text: t, emph: w.emph, br: w.br, deva, cl: cl.map((c, i) => ({ text: c, x: xs[i], w: (i + 1 < cl.length ? xs[i + 1] : w0) - xs[i] })), w: w0 };
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
        w.i = units.word.length; units.word.push(w);
        w.cl.forEach(c => { c.ax = x + c.x; c.base = l.base; c.line = l; c.word = w; c.emph = w.emph; c.i = units.cluster.length; units.cluster.push(c); });
        x += w.w + sp;
      });
      units.line.push(l);
    });
    L = { lines, units, W, H, top, asc, desc, lh, size, space: sp, fontStr: g.font, left: Math.min(0, ...lines.map(l => l.x)), o };
    if (cache.size > 400) cache.clear();
    cache.set(key, L);
    return L;
  }
  // fit: shrink the size until the block fits maxW x maxH (titles never overflow the frame)
  function fit(text, o, maxH) {
    let L = layout(text, o);
    let s = o.size, guard = 0;
    while ((L.W > (o.maxW || 1e9) * 1.001 || (maxH && L.H > maxH)) && guard++ < 14) {
      s *= 0.9; L = layout(text, Object.assign({}, o, { size: s }));
    }
    return L;
  }

  // ---------- numbers ----------
  const DEVA_DIGITS = '०१२३४५६७८९';
  const toDeva = s => String(s).replace(/[0-9]/g, d => DEVA_DIGITS[+d]);
  function groupIndian(intStr) {
    const neg = intStr.startsWith('-'); if (neg) intStr = intStr.slice(1);
    if (intStr.length <= 3) return (neg ? '-' : '') + intStr;
    const last3 = intStr.slice(-3), rest = intStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return (neg ? '-' : '') + rest + ',' + last3;
  }
  const groupIntl = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // fmt: indian | intl | plain | lakhcrore | compact ; lang 'hi' uses लाख/करोड़ and optional Devanagari digits
  function formatNumber(v, fmt = 'indian', dec = 0, lang = 'en', devaDigits = false) {
    let s;
    const fixed = (x, d) => { const r = Math.abs(x).toFixed(d); return (x < 0 ? '-' : '') + r; };
    if (fmt === 'lakhcrore') {
      const a = Math.abs(v);
      const W = lang === 'hi' ? { cr: 'करोड़', lk: 'लाख', lc: 'लाख करोड़', h: 'हज़ार' } : { cr: 'crore', lk: 'lakh', lc: 'lakh crore', h: 'thousand' };
      if (a >= 1e12) s = fixed(v / 1e12, dec) + ' ' + W.lc;
      else if (a >= 1e7) s = fixed(v / 1e7, dec) + ' ' + W.cr;
      else if (a >= 1e5) s = fixed(v / 1e5, dec) + ' ' + W.lk;
      else s = groupIndian(fixed(v, 0));
    } else if (fmt === 'compact') {
      const a = Math.abs(v);
      s = a >= 1e9 ? fixed(v / 1e9, dec) + 'B' : a >= 1e6 ? fixed(v / 1e6, dec) + 'M' : a >= 1e3 ? fixed(v / 1e3, dec) + 'K' : fixed(v, dec);
    } else {
      const r = fixed(v, dec), [i, f] = r.split('.');
      const gi = fmt === 'indian' ? groupIndian(i) : fmt === 'intl' ? groupIntl(i) : i;
      s = f ? gi + '.' + f : gi;
    }
    return devaDigits ? toDeva(s) : s;
  }

  return { FONTS, FONT_OPTIONS, font, ready, clusters, isDeva, parse, plain, upperLatin, layout, fit, formatNumber, toDeva, groupIndian };
})();
