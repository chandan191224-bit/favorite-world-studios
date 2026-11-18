// What a shot shows: paper sheets, photos, videos, plain colours, chroma key or transparency.
PT.media = PT.media || {}; // id -> { kind:'image'|'video', name, el, url, dataUrl? }
PT.sources = (() => {
  const U = PT.util, M = PT.materials;
  const pool = {};
  const slot = (k, W, H) => {
    let c = pool[k];
    if (!c || c.width !== W || c.height !== H) c = pool[k] = U.canvas(W, H);
    return c;
  };

  const TYPES = [
    ['paper', 'Paper sheet'], ['image', 'Photo'], ['video', 'Video clip'], ['color', 'Plain colour'],
    ['key', 'Green / blue screen'], ['transparent', 'Transparent (alpha export)'],
  ];

  function drawCover(g, el, W, H, fit, zoom, fx = 0.5, fy = 0.5) {
    const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return;
    const s = (fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih)) * (1 + zoom);
    const dw = iw * s, dh = ih * s;
    g.drawImage(el, (W - dw) * fx, (H - dh) * fy, dw, dh);
  }

  function drawTitle(g, sp, W, H) {
    if (!sp.title && !sp.subtitle) return;
    const S = Math.min(W, H), font = M.FONTS[sp.font || 'serif'] || M.FONTS.serif;
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = sp.textColor || '#1c1a17';
    const size = S * (sp.titleSize || 0.12);
    g.font = `800 ${size}px ${font}`;
    const lines = M.wrap(g, sp.title || '', W * 0.84);
    const subSize = size * 0.36;
    const total = lines.length * size * 1.12 + (sp.subtitle ? subSize * 2 : 0);
    let y = H / 2 - total / 2 + size * 0.56;
    for (const l of lines) { g.fillText(l, W / 2, y); y += size * 1.12; }
    if (sp.subtitle) {
      g.font = `600 ${subSize}px ${M.FONTS.sans}`; g.globalAlpha = 0.8;
      g.fillText(sp.subtitle, W / 2, y + subSize * 0.4, W * 0.84);
    }
    g.restore();
  }

  // Render a source into a reusable canvas. lt = time inside the shot, ld = shot length.
  function render(sp, slotKey, W, H, lt = 0, ld = 1) {
    sp = sp || { type: 'color', color: '#000' };
    if (sp.type === 'paper' && !sp.title && !sp.subtitle) return M.sheet(sp, W, H);
    const c = slot(slotKey, W, H), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    switch (sp.type) {
      case 'paper':
        g.drawImage(M.sheet(sp, W, H), 0, 0);
        drawTitle(g, sp, W, H);
        break;
      case 'image':
      case 'video': {
        g.fillStyle = sp.bg || '#000'; g.fillRect(0, 0, W, H);
        const m = PT.media[sp.media];
        if (m && m.el) {
          const z = (sp.zoom || 0) * U.clamp(lt / Math.max(0.01, ld));
          drawCover(g, m.el, W, H, sp.fit || 'cover', z, sp.fx == null ? 0.5 : sp.fx, sp.fy == null ? 0.5 : sp.fy);
        } else {
          g.fillStyle = '#2a2d36'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#9198a8'; g.font = `600 ${Math.min(W, H) * 0.05}px ${M.FONTS.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(sp.type === 'video' ? 'Add a video clip' : 'Add a photo', W / 2, H / 2);
        }
        if (sp.print) M.applyPaperLook(g, W, H, sp.seed || 4, sp.print, 0.35);
        drawTitle(g, sp, W, H);
        break;
      }
      case 'key': g.fillStyle = sp.color || '#00ff00'; g.fillRect(0, 0, W, H); break;
      case 'transparent': break;
      default: g.fillStyle = sp.color || '#000'; g.fillRect(0, 0, W, H);
    }
    return c;
  }
  const isFlat = sp => sp && (sp.type === 'key' || sp.type === 'transparent' || sp.type === 'color');

  return { TYPES, render, drawCover, isFlat };
})();
