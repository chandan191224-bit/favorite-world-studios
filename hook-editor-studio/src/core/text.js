// Bundled fonts (Mukta, Khand, Kalam, Bebas Neue) + Devanagari-safe text layout helper.
HES.text = (() => {
  const U = HES.util;
  const FONTS = {
    bebas: ['Bebas Neue (Impact Caps)', 'Bebas Neue', false, [400]],
    khand: ['Khand (Bold Condensed / हिंदी)', 'Khand', true, [600]],
    mukta: ['Mukta (Clean / हिंदी)', 'Mukta', true, [500, 800]],
    kalam: ['Kalam (Handwritten / हिंदी)', 'Kalam', true, [400]],
  };
  const FONT_OPTIONS = Object.entries(FONTS).map(([k, v]) => [k, v[0]]);
  function font(id, size, weight = 'bold', italic = false) {
    const f = FONTS[id] || FONTS.khand, ws = f[3];
    const w = weight === 'bold' ? ws[ws.length - 1] : weight === 'normal' ? ws[0] : weight;
    const partner = f[2] ? '' : `"Mukta", `;
    return `${italic ? 'italic ' : ''}${w} ${Math.max(1, size).toFixed(2)}px "${f[1]}", ${partner}"Mukta", sans-serif`;
  }
  let readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (!document.fonts || !document.fonts.load) return (readyP = Promise.resolve());
    const jobs = [];
    for (const [, f] of Object.entries(FONTS)) for (const w of f[3])
      jobs.push(document.fonts.load(`${w} 40px "${f[1]}"`, 'AaZz09₹ हिंदी'));
    return (readyP = Promise.all(jobs).catch(() => {}).then(() => document.fonts.ready));
  }
  const upperLatin = s => String(s || '').replace(/[a-zà-ÿ]+/g, m => m.toUpperCase());
  let mctx = null;
  function wrapLines(text, o) {
    if (!mctx) mctx = U.canvas(8, 8).getContext('2d');
    mctx.font = font(o.font, o.size || 48, o.weight || 'bold');
    const maxW = o.maxW || 9999;
    const out = [];
    for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
      const src = o.upper ? upperLatin(raw) : raw;
      if (!src.trim()) { out.push({ text: '', w: 0 }); continue; }
      const words = src.split(/\s+/);
      let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (line && mctx.measureText(t).width > maxW) {
          out.push({ text: line, w: mctx.measureText(line).width });
          line = w;
        } else line = t;
      }
      out.push({ text: line, w: mctx.measureText(line).width });
    }
    return { lines: out, fontStr: mctx.font, size: o.size || 48, lh: (o.size || 48) * (o.lineH || 1.18) };
  }
  return { FONTS, FONT_OPTIONS, font, ready, upperLatin, wrapLines };
})();
