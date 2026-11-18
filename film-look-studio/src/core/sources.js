// The picture under the look: a dropped photo / video, or a built-in demo scene.
FL.media = FL.media || {}; // id -> { kind:'image'|'video', name, el, dataUrl?, url?, path? }
FL.sources = (() => {
  const U = FL.util;
  const DEMOS = [['fort', 'Demo: sunset fort'], ['valley', 'Demo: river valley'], ['street', 'Demo: old street'], ['chart', 'Demo: colour chart']];

  function drawFit(g, el, W, H, fit, fx = 0.5, fy = 0.5) {
    const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return false;
    const s = fit === 'contain' ? Math.min(W / iw, H / ih) : fit === 'stretch' ? 0 : Math.max(W / iw, H / ih);
    if (!s) { g.drawImage(el, 0, 0, W, H); return true; }
    const dw = iw * s, dh = ih * s;
    g.drawImage(el, (W - dw) * fx, (H - dh) * fy, dw, dh);
    return true;
  }

  // ---- procedural demo scenes (so every effect can be judged without footage) ----
  function sky(g, W, H, top, mid, bot, horizon) {
    const gr = g.createLinearGradient(0, 0, 0, H * horizon);
    gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, W, H * horizon + 2);
  }
  function ridge(g, W, H, y0, amp, freq, seed, color) {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 160) g.lineTo(x, H * y0 - amp * H * (0.5 + 0.5 * U.fbm1(x / W * freq, seed, 4)));
    g.lineTo(W, H); g.closePath(); g.fillStyle = color; g.fill();
  }
  function fort(g, W, H) {
    const S = H / 1080;
    sky(g, W, H, '#2f5f9e', '#e9a065', '#ffd9a0', 0.62);
    const sun = g.createRadialGradient(W * 0.68, H * 0.5, 0, W * 0.68, H * 0.5, H * 0.32);
    sun.addColorStop(0, 'rgba(255,250,225,1)'); sun.addColorStop(0.12, 'rgba(255,236,170,1)'); sun.addColorStop(0.13, 'rgba(255,200,120,.55)'); sun.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    ridge(g, W, H, 0.6, 0.08, 3, 11, '#8a6a7a');
    // fort walls + domes in lit sandstone
    const base = H * 0.66, wallTop = H * 0.5;
    g.fillStyle = '#a4472e'; g.fillRect(W * 0.12, wallTop, W * 0.62, base - wallTop);
    g.fillStyle = '#c4613c';
    for (let x = W * 0.12; x < W * 0.74; x += 46 * S) g.fillRect(x, wallTop - 22 * S, 26 * S, 24 * S);
    const dome = (cx, r, y) => { g.beginPath(); g.arc(cx, y, r, Math.PI, 0); g.fill(); g.fillRect(cx - 2 * S, y - r - 26 * S, 4 * S, 28 * S); };
    g.fillStyle = '#d07a48'; dome(W * 0.43, 110 * S, wallTop - 40 * S); g.fillRect(W * 0.43 - 120 * S, wallTop - 40 * S, 240 * S, 40 * S);
    g.fillStyle = '#b8583a'; dome(W * 0.25, 60 * S, wallTop - 20 * S); dome(W * 0.61, 60 * S, wallTop - 20 * S);
    g.fillStyle = '#c86b40';
    for (const mx of [0.14, 0.72]) { g.fillRect(W * mx - 14 * S, H * 0.28, 28 * S, base - H * 0.28); dome(W * mx, 24 * S, H * 0.28); }
    g.fillStyle = '#2a1410'; g.beginPath(); g.moveTo(W * 0.43 - 50 * S, base); g.lineTo(W * 0.43 - 50 * S, base - 120 * S); g.arc(W * 0.43, base - 120 * S, 50 * S, Math.PI, 0); g.lineTo(W * 0.43 + 50 * S, base); g.fill();
    for (let i = 0; i < 7; i++) { g.fillStyle = '#3b1d14'; g.fillRect(W * (0.16 + i * 0.08), wallTop + 60 * S, 18 * S, 34 * S); }
    // water with reflection, green trees, ground
    const wg = g.createLinearGradient(0, base, 0, H);
    wg.addColorStop(0, '#5d7fa8'); wg.addColorStop(1, '#1d3550'); g.fillStyle = wg; g.fillRect(0, base, W, H - base);
    g.globalAlpha = 0.35; g.fillStyle = '#ffcf8a'; g.fillRect(W * 0.64, base, W * 0.08, H - base); g.globalAlpha = 1;
    g.fillStyle = '#2f5a2a'; for (let i = 0; i < 18; i++) { const x = U.h1(i, 5) * W, r = (30 + U.h1(i, 6) * 50) * S; g.beginPath(); g.arc(x, base + 4 * S, r, Math.PI, 0); g.fill(); }
    g.fillStyle = '#1c2a18'; g.fillRect(0, H * 0.9, W, H * 0.1);
    g.fillStyle = '#111'; for (let i = 0; i < 6; i++) { const x = W * (0.2 + i * 0.05), y = H * (0.2 + U.h1(i, 2) * 0.1); g.beginPath(); g.moveTo(x - 10 * S, y); g.quadraticCurveTo(x - 4 * S, y - 6 * S, x, y); g.quadraticCurveTo(x + 4 * S, y - 6 * S, x + 10 * S, y); g.lineWidth = 2.4 * S; g.strokeStyle = '#1a1a1a'; g.stroke(); }
  }
  function valley(g, W, H) {
    sky(g, W, H, '#4f8fd6', '#9cc6ec', '#dcecf6', 0.55);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 9; i++) { const x = U.h1(i, 31) * W, y = H * (0.08 + U.h1(i, 32) * 0.22), r = H * (0.03 + U.h1(i, 33) * 0.04); for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + j * r * 0.9, y + (j % 2) * r * 0.2, r * (1 - Math.abs(j - 1.5) * 0.2), 0, 7); g.fill(); } }
    ridge(g, W, H, 0.5, 0.22, 2.5, 3, '#7d8fb0');
    ridge(g, W, H, 0.6, 0.16, 3.5, 7, '#4f6b5a');
    ridge(g, W, H, 0.74, 0.1, 4, 9, '#5d8a3a');
    g.fillStyle = '#86b04a'; g.fillRect(0, H * 0.78, W, H * 0.22);
    g.beginPath(); g.moveTo(W * 0.42, H * 0.62);
    g.bezierCurveTo(W * 0.5, H * 0.75, W * 0.2, H * 0.85, W * 0.35, H);
    g.lineTo(W * 0.75, H); g.bezierCurveTo(W * 0.5, H * 0.85, W * 0.62, H * 0.72, W * 0.47, H * 0.62); g.closePath();
    g.fillStyle = '#3f86c4'; g.fill();
    for (let i = 0; i < 40; i++) { const x = U.h1(i, 41) * W, y = H * (0.8 + U.h1(i, 42) * 0.18), r = H * (0.012 + U.h1(i, 43) * 0.02); g.fillStyle = i % 3 ? '#2d5d24' : '#d8c25a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.fillStyle = '#c33'; g.fillRect(W * 0.7, H * 0.7, W * 0.04, H * 0.05); g.fillStyle = '#7a2a1a'; g.beginPath(); g.moveTo(W * 0.695, H * 0.7); g.lineTo(W * 0.72, H * 0.66); g.lineTo(W * 0.745, H * 0.7); g.fill();
  }
  function street(g, W, H) {
    const S = H / 1080;
    sky(g, W, H, '#a9b8c6', '#d6d9d2', '#e8e1cf', 0.5);
    const hor = H * 0.55;
    for (let i = 0; i < 9; i++) {
      const x0 = W * (i / 9), w = W / 9 + 4, top = H * (0.12 + U.h1(i, 51) * 0.25);
      g.fillStyle = ['#8b6a4f', '#a58463', '#6f5844', '#9c7759', '#7d6650'][i % 5];
      g.fillRect(x0, top, w, hor - top + H * 0.08);
      g.fillStyle = 'rgba(40,30,25,.75)';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.fillRect(x0 + w * (0.2 + c * 0.38), top + (40 + r * 90) * S, w * 0.22, 54 * S);
      g.fillStyle = '#c7b089'; g.fillRect(x0, top, w, 14 * S);
    }
    const rg = g.createLinearGradient(0, hor, 0, H); rg.addColorStop(0, '#77706a'); rg.addColorStop(1, '#3d3833');
    g.fillStyle = rg; g.beginPath(); g.moveTo(0, H); g.lineTo(W * 0.38, hor + H * 0.08); g.lineTo(W * 0.62, hor + H * 0.08); g.lineTo(W, H); g.fill();
    g.fillStyle = '#5c544c'; g.fillRect(0, hor + H * 0.08, W, 6 * S);
    // a few figures and a tram
    for (let i = 0; i < 7; i++) { const x = W * (0.12 + U.h1(i, 61) * 0.76), y = H * (0.7 + U.h1(i, 62) * 0.22), h = (90 + y / H * 160) * S; g.fillStyle = i % 2 ? '#2b2522' : '#433630'; g.fillRect(x - h * 0.12, y - h, h * 0.24, h); g.beginPath(); g.arc(x, y - h - h * 0.1, h * 0.1, 0, 7); g.fill(); }
    g.fillStyle = '#9a3c2c'; g.fillRect(W * 0.55, hor - H * 0.05, W * 0.18, H * 0.13); g.fillStyle = '#e8d9b8'; for (let i = 0; i < 4; i++) g.fillRect(W * (0.56 + i * 0.043), hor - H * 0.035, W * 0.03, H * 0.04);
  }
  function chart(g, W, H) {
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, W, H);
    const cols = ['#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa', '#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e', '#383d96', '#469449', '#af363c', '#e7c71f', '#bb5695', '#0885a1'];
    const cw = W / 7, ch = H * 0.17;
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(cw * (0.5 + (i % 6)), ch * (0.4 + Math.floor(i / 6) * 1.1), cw * 0.92, ch); });
    for (let i = 0; i < 12; i++) { const v = Math.round(i / 11 * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(W * (0.07 + i * 0.072), H * 0.7, W * 0.072, H * 0.12); }
    const gr = g.createLinearGradient(W * 0.07, 0, W * 0.93, 0); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff');
    g.fillStyle = gr; g.fillRect(W * 0.07, H * 0.85, W * 0.864, H * 0.08);
  }
  const DRAW = { fort, valley, street, chart };

  let demoVersion = 0;
  // returns a W x H canvas of the source picture at the current media time; .static is true when it never changes
  function frame(proj, W, H) {
    const s = proj.source || {}, m = s.media && FL.media[s.media];
    if (m && m.el && (m.kind === 'image' ? m.el.complete && m.el.naturalWidth : m.el.readyState >= 2)) {
      if (m.kind === 'image') {
        const key = `img|${s.media}|${W}x${H}|${s.fit}|${s.bg}`;
        return U.cache(key, () => { const c = U.canvas(W, H), g = c.getContext('2d'); g.fillStyle = s.bg || '#000'; g.fillRect(0, 0, W, H); drawFit(g, m.el, W, H, s.fit || 'cover'); c.static = key; return c; });
      }
      const c = U.tmp('srcvid', W, H), g = U.ctx2(c);
      g.fillStyle = s.bg || '#000'; g.fillRect(0, 0, W, H);
      drawFit(g, m.el, W, H, s.fit || 'cover');
      c.static = null;
      return c;
    }
    const demo = DRAW[s.demo] ? s.demo : 'fort';
    const key = `demo|${demo}|${W}x${H}|${demoVersion}`;
    return U.cache(key, () => { const c = U.canvas(W, H); DRAW[demo](c.getContext('2d'), W, H); c.static = key; return c; });
  }
  return { DEMOS, frame, drawFit };
})();
