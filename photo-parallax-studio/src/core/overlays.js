// Text elements that sit INSIDE the depth stack (can be partially hidden behind the subject):
// documentary captions with a year chip, stacked name tags, place label with pulsing marker,
// typewriter lines and big shrinking titles. Hindi (Devanagari) renders with the bundled fonts.
window.PP = window.PP || {};
PP.overlays = (() => {
  const U = PP.util;

  const F = {
    range: (key, label, min, max, step, def) => ({ key, label, type: 'range', min, max, step, def }),
    select: (key, label, options, def) => ({ key, label, type: 'select', options, def }),
    color: (key, label, def) => ({ key, label, type: 'color', def }),
    text: (key, label, def, area) => ({ key, label, type: 'text', def, area }),
  };
  const FONTS = [['sans', 'Mukta (clean sans)'], ['serif', 'Tiro Devanagari (serif)'], ['mono', 'Monospace']];
  const fontOf = (f, w) => f === 'serif' ? `${w} 'Tiro Devanagari Hindi', 'Mukta', serif` : f === 'mono' ? `${w} 'Mukta', ui-monospace, monospace` : `${w} 'Mukta', sans-serif`;

  // word-wrap that keeps combining marks with their base glyph (split on spaces only)
  function wrap(g, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (g.measureText(t).width > maxW && line) { out.push(line); line = w; }
        else line = t;
      }
      out.push(line);
    }
    return out;
  }

  const LIST = [
    {
      id: 'caption', name: 'Caption + year chip', group: 'Titles', fields: [
        F.text('text', 'Text', 'यह कहानी यहीं से शुरू हुई', true),
        F.text('year', 'Year / chip', '1947'),
        F.color('chipColor', 'Chip colour', '#c2402e'),
        F.select('reveal', 'Reveal', [['fade', 'Fade in'], ['type', 'Typewriter'], ['stamp', 'Stamp (blur-in)'], ['up', 'Slide up']], 'fade'),
        F.range('x', 'Position X', 0, 1, 0.01, 0.055), F.range('y', 'Position Y', 0, 1, 0.01, 0.80),
        F.select('font', 'Font', FONTS, 'sans'), F.range('size', 'Size', 0.02, 0.14, 0.005, 0.052),
        F.color('color', 'Text colour', '#f5f1e6'), F.range('maxW', 'Max width', 0.2, 1, 0.01, 0.62),
        F.range('depth', 'Sits at depth', 0, 1, 0.01, 0.95), F.range('start', 'Appears at (s)', 0, 20, 0.1, 0.35),
        F.range('length', 'Lasts (0 = to end)', 0, 20, 0.1, 0),
      ],
      draw(g, o, lt, ld, W, H) {
        const t0 = o.start || 0, t1 = t0 + (o.length || ld || 1);
        if (lt < t0 - 0.01 || lt > t1) return;
        const size = (o.size == null ? 0.052 : o.size) * H;
        const weight = 800;
        g.save();
        g.font = fontOf(o.font || 'sans', `${weight} ${Math.round(size)}px`);
        g.textBaseline = 'alphabetic';
        const lines = wrap(g, o.text, (o.maxW == null ? 0.62 : o.maxW) * W);
        const x = (o.x == null ? 0.055 : o.x) * W, y = (o.y == null ? 0.8 : o.y) * H;
        const lh = size * 1.24;
        // reveal progress
        const rt = U.clamp((lt - t0) / Math.min(0.8, (t1 - t0) * 0.5 || 0.8));
        let alpha = U.clamp((lt - t0) / 0.5) * U.clamp((t1 - lt) / 0.4 + 0.0001);
        if ((o.reveal || 'fade') === 'fade') { /* alpha alone */ }
        else if (o.reveal === 'type') { alpha = U.clamp((t1 - lt) / 0.4) * U.clamp((lt - t0) / 0.12); }
        else alpha = alpha;
        const settle = U.ease.out(rt);
        const stampBlur = o.reveal === 'stamp' ? (1 - settle) : 0;
        // year chip
        let textLines = lines;
        if (o.reveal === 'type') {
          const total = lines.join(' ').length;
          const n = Math.max(0, Math.round(total * U.clamp((lt - t0) / 1.1)));
          let used = 0, part = [];
          for (const ln of lines) {
            const take = U.clamp(n - used, 0, ln.length);
            part.push(ln.slice(0, take)); used += ln.length;
            if (take < ln.length) break;
          }
          textLines = part;
        }
        g.globalAlpha = alpha;
        g.translate(x, y + (o.reveal === 'up' ? (1 - settle) * H * 0.05 : 0));
        if (o.reveal === 'stamp') {
          const s = 1 + (1 - settle) * 0.35;
          g.translate(x * 0, 0);
          g.scale(s, s);
        }
        if (o.year) {
          g.font = fontOf(o.font || 'sans', `800 ${Math.round(size * 0.78)}px`);
          const yw = g.measureText(o.year).width + size * 0.5;
          const yh = size * 1.08;
          const [r, gg, b] = U.hexRgb(o.chipColor || '#c2402e');
          g.fillStyle = `rgb(${r},${gg},${b})`;
          g.fillRect(0, -yh, yw, yh);
          g.fillStyle = '#fff';
          g.fillText(o.year, size * 0.25, -size * 0.32);
          g.translate(0, yh * 0.5 + size * 0.28);
          g.font = fontOf(o.font || 'sans', `800 ${Math.round(size)}px`);
        }
        // soft shadow for readability
        g.fillStyle = 'rgba(0,0,0,.55)';
        textLines.forEach((ln, i) => {
          if (o.reveal === 'type' && i === textLines.length - 1) {
            const cursor = Math.floor(lt * 2.6) % 2 === 0;
            g.fillText(ln + (cursor ? '▌' : ''), 2, 2 + i * lh);
          } else g.fillText(ln, 2, 2 + i * lh);
        });
        g.fillStyle = o.color || '#f5f1e6';
        textLines.forEach((ln, i) => {
          if (o.reveal === 'type' && i === textLines.length - 1) {
            const cursor = Math.floor(lt * 2.6) % 2 === 0;
            g.fillText(ln + (cursor ? '▌' : ''), 0, i * lh);
          } else g.fillText(ln, 0, i * lh);
        });
        g.restore();
      },
    },
    {
      id: 'nametag', name: 'Name tag (stacked)', group: 'Lower thirds', fields: [
        F.text('text', 'Name', 'एक महान इंसान'),
        F.text('sub', 'Second line', '1952 – 2020'),
        F.color('bg', 'Tag colour', '#2a1c14'), F.color('fg', 'Text colour', '#f5e9d2'),
        F.range('x', 'Position X', 0, 1, 0.01, 0.0), F.range('y', 'Position Y', 0, 1, 0.01, 0.78),
        F.range('size', 'Size', 0.02, 0.1, 0.005, 0.042), F.range('depth', 'Sits at depth', 0, 1, 0.01, 0.95),
        F.range('start', 'Appears at (s)', 0, 20, 0.1, 0.3), F.range('length', 'Lasts (0 = to end)', 0, 20, 0.1, 0),
      ],
      draw(g, o, lt, ld, W, H) {
        const t0 = o.start || 0, t1 = t0 + (o.length || ld || 1);
        if (lt < t0 - 0.01 || lt > t1) return;
        const size = (o.size == null ? 0.042 : o.size) * H;
        const x = (o.x == null ? 0 : o.x) * W, y = (o.y == null ? 0.78 : o.y) * H;
        const rt = U.clamp((lt - t0) / 0.55), settle = U.ease.out(rt);
        const alpha = U.clamp((lt - t0) / 0.3) * U.clamp((t1 - lt) / 0.3 + 0.001);
        g.save();
        g.globalAlpha = alpha;
        g.translate(x - (1 - settle) * W * 0.06, y);
        g.font = fontOf('sans', `800 ${Math.round(size)}px`);
        const w1 = g.measureText(o.text || '').width + size * 0.8;
        g.fillStyle = o.bg || '#2a1c14';
        g.fillRect(0, 0, w1, size * 1.5);
        g.fillStyle = o.fg || '#f5e9d2';
        g.textBaseline = 'middle';
        g.fillText(o.text || '', size * 0.4, size * 0.78);
        if (o.sub) {
          g.font = fontOf('sans', `600 ${Math.round(size * 0.72)}px`);
          const w2 = g.measureText(o.sub).width + size * 0.8;
          g.translate((1 - U.clamp((lt - t0 - 0.18) / 0.5)) * -W * 0.04, size * 1.62);
          g.fillStyle = o.bg || '#2a1c14';
          g.globalAlpha = alpha * U.clamp((lt - t0 - 0.15) / 0.3);
          g.fillRect(0, 0, w2, size * 1.06);
          g.fillStyle = o.fg || '#f5e9d2';
          g.fillText(o.sub, size * 0.4, size * 0.56);
        }
        g.restore();
      },
    },
    {
      id: 'place', name: 'Place label + marker', group: 'Maps & places', fields: [
        F.text('text', 'Place name', 'रामेश्वरम्'),
        F.color('ring', 'Ring colour', '#e5492e'), F.color('fg', 'Text colour', '#ffffff'),
        F.range('x', 'Marker X', 0, 1, 0.01, 0.5), F.range('y', 'Marker Y', 0, 1, 0.01, 0.45),
        F.range('size', 'Size', 0.02, 0.1, 0.005, 0.038), F.range('depth', 'Sits at depth', 0, 1, 0.01, 0.9),
        F.range('start', 'Appears at (s)', 0, 20, 0.1, 0.4), F.range('length', 'Lasts (0 = to end)', 0, 20, 0.1, 0),
      ],
      draw(g, o, lt, ld, W, H) {
        const t0 = o.start || 0, t1 = t0 + (o.length || ld || 1);
        if (lt < t0 - 0.01 || lt > t1) return;
        const size = (o.size == null ? 0.038 : o.size) * H;
        const x = (o.x == null ? 0.5 : o.x) * W, y = (o.y == null ? 0.45 : o.y) * H;
        const rt = U.clamp((lt - t0) / 0.6);
        const pulse = (Math.sin((lt - t0) * 4.2) + 1) / 2;
        const [r, gg, b] = U.hexRgb(o.ring || '#e5492e');
        const alpha = U.clamp((lt - t0) / 0.3) * U.clamp((t1 - lt) / 0.3 + 0.001);
        g.save();
        g.globalAlpha = alpha;
        // pin dot
        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.beginPath(); g.arc(x, y, size * 0.32, 0, 7); g.fill();
        // pulsing rings
        for (let i = 0; i < 2; i++) {
          const pr = (pulse * 0.5 + i * 0.5) % 1;
          g.globalAlpha = alpha * (1 - pr) * 0.8;
          g.strokeStyle = `rgb(${r},${gg},${b})`;
          g.lineWidth = Math.max(2, size * 0.06);
          g.beginPath(); g.arc(x, y, size * (0.5 + pr * 1.7), 0, 7); g.stroke();
        }
        g.globalAlpha = alpha;
        // label pill
        g.font = fontOf('sans', `800 ${Math.round(size)}px`);
        const tw = g.measureText(o.text || '').width;
        const pw = tw + size * 0.9, ph = size * 1.3;
        const px = x + size * 0.8, py = y - ph / 2;
        g.fillStyle = 'rgba(16,14,12,.85)';
        g.beginPath();
        const rr = ph * 0.24;
        g.moveTo(px + rr, py); g.arcTo(px + pw, py, px + pw, py + ph, rr); g.arcTo(px + pw, py + ph, px, py + ph, rr);
        g.arcTo(px, py + ph, px, py, rr); g.arcTo(px, py, px + pw, py, rr); g.closePath(); g.fill();
        g.fillStyle = o.fg || '#ffffff';
        g.textBaseline = 'middle';
        g.fillText(o.text || '', px + size * 0.45, py + ph / 2 + size * 0.06);
        g.restore();
      },
    },
    {
      id: 'bigtitle', name: 'Big title → corner', group: 'Titles', fields: [
        F.text('text', 'Text', 'सच्ची कहानी'),
        F.select('font', 'Font', FONTS, 'sans'),
        F.range('size', 'Big size', 0.05, 0.4, 0.005, 0.22), F.color('color', 'Colour', '#f2ede1'),
        F.range('endX', 'Ends at X', 0, 1, 0.01, 0.05), F.range('endY', 'Ends at Y', 0, 1, 0.01, 0.88),
        F.range('endSize', 'Ends at size', 0.02, 0.2, 0.005, 0.05),
        F.range('depth', 'Sits at depth', 0, 1, 0.01, 0.9), F.range('start', 'Appears at (s)', 0, 20, 0.1, 0.2),
        F.range('length', 'Lasts (0 = to end)', 0, 20, 0.1, 0),
      ],
      draw(g, o, lt, ld, W, H) {
        const t0 = o.start || 0, t1 = t0 + (o.length || ld || 1);
        if (lt < t0 - 0.01 || lt > t1) return;
        const rt = U.clamp((lt - t0) / 2.2);
        const settle = U.ease.inOut(rt);
        const size = U.lerp((o.size == null ? 0.22 : o.size), (o.endSize == null ? 0.05 : o.endSize), settle) * H;
        const x = U.lerp(0.5, o.endX == null ? 0.05 : o.endX, settle) * W;
        const y = U.lerp(0.5, o.endY == null ? 0.88 : o.endY, settle) * H;
        const alpha = U.clamp((lt - t0) / 0.4) * U.clamp((t1 - lt) / 0.4 + 0.001);
        g.save();
        g.globalAlpha = alpha;
        g.font = fontOf(o.font || 'sans', `800 ${Math.round(size)}px`);
        g.textBaseline = 'middle';
        const lines = wrap(g, o.text, W * 0.92);
        const lh = size * 1.15;
        const y0 = y - (lines.length - 1) * lh / 2;
        // soft shadow
        g.fillStyle = 'rgba(0,0,0,.5)';
        lines.forEach((ln, i) => g.fillText(ln, W / 2 - g.measureText(ln).width / 2 + size * 0.04, y0 + i * lh + size * 0.04));
        g.fillStyle = o.color || '#f2ede1';
        lines.forEach((ln, i) => g.fillText(ln, W / 2 - g.measureText(ln).width / 2, y0 + i * lh));
        g.restore();
      },
    },
    {
      // Nitish-style distressed stencil name / Dhruv-style giant title. Default depth 0.6 = BEHIND the subject
      // when the shot uses subject cut-out mode (Depth & layers -> Subject cut-out).
      id: 'stencil', name: 'Stencil name / title behind subject', group: 'Titles', fields: [
        F.text('text', 'Text (new line = second line)', 'SHAUL\nCOHEN', true),
        F.select('style', 'Style', [['stencil', 'Distressed stencil + red shadow (Nitish)'], ['clean', 'Giant clean title (Dhruv)']], 'stencil'),
        F.select('align', 'Align', [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], 'left'),
        F.select('reveal', 'Reveal', [['punch', 'Punch in'], ['slide', 'Slide in'], ['fade', 'Fade in']], 'punch'),
        F.range('x', 'Position X', 0, 1, 0.01, 0.07), F.range('y', 'Position Y (top)', 0, 1, 0.01, 0.30),
        F.range('size', 'Size', 0.04, 0.4, 0.005, 0.13), F.range('maxW', 'Max width (shrinks to fit)', 0.1, 1, 0.01, 0.32),
        F.range('grit', 'Worn / grit', 0, 1, 0.01, 0.4),
        F.color('color', 'Text colour', '#f2eee6'), F.color('shadow', 'Shadow colour', '#7c1d12'),
        F.range('depth', 'Sits at depth', 0, 1, 0.01, 0.6), F.range('start', 'Appears at (s)', 0, 20, 0.1, 0.35),
        F.range('length', 'Lasts (0 = to end)', 0, 20, 0.1, 0),
      ],
      draw(g, o, lt, ld, W, H) {
        const t0 = o.start || 0, t1 = t0 + (o.length || ld || 1);
        if (lt < t0 - 0.01 || lt > t1) return;
        const art = stencilArt(o, W, H);
        if (!art) return;
        const rt = U.clamp((lt - t0) / 0.6), settle = U.ease.out(rt);
        const alpha = U.clamp((lt - t0) / 0.35) * U.clamp((t1 - lt) / 0.4 + 0.001);
        const align = o.align || 'left';
        let x = (o.x == null ? 0.07 : o.x) * W;
        if (align === 'center') x -= art.w / 2; else if (align === 'right') x -= art.w;
        const y = (o.y == null ? 0.3 : o.y) * H;
        g.save();
        g.globalAlpha = alpha;
        const rev = o.reveal || 'punch';
        if (rev === 'punch') {
          const s = 1 + (1 - settle) * 0.22;
          g.translate(x + art.w / 2, y + art.h / 2); g.scale(s, s); g.translate(-art.w / 2, -art.h / 2);
        } else if (rev === 'slide') g.translate(x - (1 - settle) * W * 0.05, y);
        else g.translate(x, y);
        // slow drift so the title lives with the camera
        const drift = 1 + 0.025 * U.clamp((lt - t0) / Math.max(0.5, t1 - t0));
        g.translate(art.w / 2, art.h / 2); g.scale(drift, drift); g.translate(-art.w / 2, -art.h / 2);
        g.drawImage(art.c, -art.pad, -art.pad);
        g.restore();
      },
    },
  ];

  // stencil title art: built once per text/look/frame size (worn edges are seeded, so preview == export)
  const artCache = new Map();
  function stencilArt(o, W, H) {
    const style = o.style || 'stencil';
    const key = [o.text, style, o.size, o.maxW, o.grit, o.color, o.shadow, o.align, W, H].join('|');
    if (artCache.has(key)) return artCache.get(key);
    const lines = String(o.text || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return null;
    let size = Math.round((o.size == null ? 0.13 : o.size) * H);
    const meas = U.canvas(8, 8).getContext('2d');
    const maxW = (o.maxW == null ? (style === 'clean' ? 0.92 : 0.32) : +o.maxW) * W;
    meas.font = `800 ${size}px 'Mukta', sans-serif`;
    const widest = Math.max(...lines.map(l => meas.measureText(l).width));
    if (widest > maxW) size = Math.max(8, Math.floor(size * maxW / widest));   // shrink to fit, never overflow
    const fnt = `800 ${size}px 'Mukta', sans-serif`;
    meas.font = fnt;
    if ('letterSpacing' in meas) meas.letterSpacing = style === 'clean' ? `${Math.round(size * 0.03)}px` : '0px';
    const lh = size * (style === 'clean' ? 0.98 : 0.92);
    const widths = lines.map(l => meas.measureText(l).width);
    const w = Math.ceil(Math.max(...widths)), h = Math.ceil(lh * lines.length + size * 0.25);
    const pad = Math.ceil(size * 0.25);
    const c = U.canvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
    const align = o.align || 'left';
    const lx = i => pad + (align === 'center' ? (w - widths[i]) / 2 : align === 'right' ? w - widths[i] : 0);
    const text = (ctx, dx, dy, fill) => {
      ctx.font = fnt; if ('letterSpacing' in ctx) ctx.letterSpacing = meas.letterSpacing;
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = fill;
      lines.forEach((l, i) => ctx.fillText(l, lx(i) + dx, pad + size * 0.88 + i * lh + dy));
    };
    if (style === 'clean') {
      g.save(); g.filter = `blur(${Math.max(2, size * 0.06).toFixed(1)}px)`; text(g, 0, size * 0.04, 'rgba(0,0,0,.55)'); g.restore();
      text(g, 0, 0, o.color || '#f2eee6');
    } else {
      // letters: worn white face on a hard offset shadow, both eaten by the same grit
      const off = Math.max(2, size * 0.045);
      text(g, off, off, o.shadow || '#7c1d12');
      text(g, 0, 0, o.color || '#f2eee6');
      const grit = U.clamp(o.grit == null ? 0.4 : +o.grit, 0, 1);
      if (grit > 0.01) {
        const r = U.rng(7 + lines.join('').length);
        g.globalCompositeOperation = 'destination-out';
        // fine speckle everywhere + a few clustered chips (worn spray-paint stencil, not polka dots)
        const n = Math.round((c.width * c.height) / (size * size) * 900 * grit);
        for (let i = 0; i < n; i++) {
          const x = r() * c.width, y = r() * c.height, rad = size * (0.0025 + Math.pow(r(), 4) * 0.022);
          g.globalAlpha = 0.25 + r() * 0.75;
          g.beginPath(); g.ellipse(x, y, rad * (1 + r() * 1.8), rad, r() * 3.14, 0, 6.283); g.fill();
        }
        const clusters = Math.round((c.width * c.height) / (size * size) * 3 * grit);
        for (let k = 0; k < clusters; k++) {
          const cx = r() * c.width, cy = r() * c.height, spread = size * (0.05 + r() * 0.12);
          for (let i = 0; i < 40; i++) {
            const a = r() * 6.283, d = Math.pow(r(), 1.7) * spread, rad = size * (0.003 + r() * 0.01);
            g.globalAlpha = 0.5 + r() * 0.5;
            g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rad, 0, 6.283); g.fill();
          }
        }
        // a few dry-brush scratches
        g.lineCap = 'round';
        for (let i = 0; i < Math.round(14 * grit); i++) {
          const x = r() * c.width, y = r() * c.height, len = size * (0.2 + r() * 0.9);
          g.globalAlpha = 0.25 + r() * 0.5; g.lineWidth = Math.max(1, size * (0.004 + r() * 0.01));
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (r() - 0.5) * size * 0.08); g.stroke();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
    }
    const out = { c, w, h, pad };
    if (artCache.size > 30) artCache.clear();
    artCache.set(key, out);
    return out;
  }

  const byId = {};
  for (const a of LIST) byId[a.id] = a;
  function defaults(a) { const d = {}; for (const f of a.fields || []) d[f.key] = f.def; return d; }
  function create(id) { const a = byId[id]; return a ? Object.assign({ kind: id, start: 0.3, length: 0 }, defaults(a)) : null; }
  function of(shot) { if (!Array.isArray(shot.overlays)) shot.overlays = []; return shot.overlays; }
  function drawAll(g, shot, lt, W, H, S, env) {
    for (const o of of(shot)) {
      const a = byId[o.kind];
      if (!a) continue;
      try { a.draw(g, o, lt, shot.duration || 1, W, H); } catch (e) { /* keep rendering */ }
    }
  }

  return { LIST, byId, create, of, drawAll };
})();
