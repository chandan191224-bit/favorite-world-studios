// Looks: clean dark (default), paper/newsprint (sits with the Paper studios), neon, clean light. Fonts are bundled (OFL).
DC.themes = (() => {
  const U = DC.util;
  const F = {
    sans: "'DC Inter','DC Mukta',system-ui,sans-serif",
    hi: "'DC Mukta','DC Inter',system-ui,sans-serif",
    serif: "'DC Tiro','DC Mukta',Georgia,serif",
    cond: "'DC Anton','DC Mukta',Impact,sans-serif",
  };
  const list = [
    { id: 'dark', name: 'Clean dark', ink: '#f4f5f8', sub: '#a3a9b8', faint: '#5b6272', grid: 'rgba(255,255,255,0.09)', axis: 'rgba(255,255,255,0.35)',
      bg0: '#121722', bg1: '#07090e', accent: '#f2a93b', hiInk: '#15120a', card: 'rgba(255,255,255,0.06)', cardLine: 'rgba(255,255,255,0.12)',
      palette: ['#f2a93b', '#3fb6c6', '#ef6b5b', '#7c8cff', '#5cc489', '#c77dff', '#f7d154', '#ff8fb1', '#8ecae6', '#b5a48b'],
      head: F.sans, body: F.sans, num: F.sans, hiFont: F.hi, radius: 0.18, glow: 0 },
    { id: 'paper', name: 'Paper / newsprint', ink: '#1f1b16', sub: '#5d554a', faint: '#9b9182', grid: 'rgba(40,30,20,0.13)', axis: 'rgba(40,30,20,0.55)',
      bg0: '#efe5cf', bg1: '#d9cbad', accent: '#b8382c', hiInk: '#fff8ea', card: 'rgba(60,40,20,0.06)', cardLine: 'rgba(60,40,20,0.22)',
      palette: ['#b8382c', '#2c4a6e', '#c48a26', '#4d6b3c', '#6f4e7c', '#3f7f86', '#8a5a3b', '#9c6b8f', '#56606b', '#a8873f'],
      head: F.serif, body: F.hi, num: F.serif, hiFont: F.serif, radius: 0.04, glow: 0, paper: true },
    { id: 'neon', name: 'Neon', ink: '#f2f7ff', sub: '#8fa3c7', faint: '#4a5a7a', grid: 'rgba(90,160,255,0.12)', axis: 'rgba(120,190,255,0.45)',
      bg0: '#0b1030', bg1: '#02030c', accent: '#22e6ff', hiInk: '#02101a', card: 'rgba(80,140,255,0.08)', cardLine: 'rgba(80,180,255,0.3)',
      palette: ['#22e6ff', '#ff3dcf', '#b8ff3c', '#ffd23f', '#8a6bff', '#ff7a3d', '#3dffa8', '#ff5d7a', '#5db8ff', '#e3a6ff'],
      head: F.cond, body: F.hi, num: F.cond, hiFont: F.hi, radius: 0.5, glow: 1 },
    { id: 'light', name: 'Clean light', ink: '#151821', sub: '#5e6575', faint: '#a2a8b4', grid: 'rgba(20,30,50,0.08)', axis: 'rgba(20,30,50,0.4)',
      bg0: '#fbfaf7', bg1: '#ebe8e1', accent: '#e0631f', hiInk: '#ffffff', card: 'rgba(20,30,50,0.04)', cardLine: 'rgba(20,30,50,0.12)',
      palette: ['#e0631f', '#1f6fb2', '#2a9d6f', '#d43d51', '#7a4cc2', '#e3a11a', '#3aa6b9', '#9c5b3a', '#5a6170', '#c2569b'],
      head: F.sans, body: F.sans, num: F.sans, hiFont: F.hi, radius: 0.18, glow: 0 },
  ];
  const byId = Object.fromEntries(list.map(t => [t.id, t]));

  const cache = {};
  function paperTexture(W, H, seed) {
    const k = `p${W}x${H}:${seed}`;
    if (cache[k]) return cache[k];
    const c = U.canvas(W, H), g = c.getContext('2d'), th = byId.paper;
    const grd = g.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.1, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    grd.addColorStop(0, '#f3ead6'); grd.addColorStop(0.7, th.bg0); grd.addColorStop(1, th.bg1);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // grain at low resolution, scaled up (fast and soft)
    const gw = Math.max(64, Math.round(W / 3)), gh = Math.max(36, Math.round(H / 3)), gc = U.canvas(gw, gh), gg = gc.getContext('2d');
    const img = gg.createImageData(gw, gh), r = U.rng(seed * 7 + 11);
    for (let i = 0; i < img.data.length; i += 4) { const v = r(); img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0.5 ? 255 : 0; img.data[i + 3] = Math.round(Math.abs(v - 0.5) * 34); }
    gg.putImageData(img, 0, 0);
    g.globalAlpha = 0.55; g.drawImage(gc, 0, 0, W, H); g.globalAlpha = 1;
    // fibres + blotches
    const S = Math.min(W, H);
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H, len = (0.01 + r() * 0.03) * S, a = r() * Math.PI;
      g.strokeStyle = `rgba(90,70,40,${0.03 + r() * 0.05})`; g.lineWidth = Math.max(0.5, S * 0.0009);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * len * 0.3, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = r() * H, rad = (0.05 + r() * 0.12) * S, b = g.createRadialGradient(x, y, 0, x, y, rad);
      b.addColorStop(0, `rgba(150,110,60,${0.025 + r() * 0.03})`); b.addColorStop(1, 'rgba(150,110,60,0)');
      g.fillStyle = b; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return (cache[k] = c);
  }
  function background(ctx, th, W, H, seed = 1) {
    if (th.paper) { ctx.drawImage(paperTexture(W, H, seed), 0, 0); return; }
    const g = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.id === 'neon') {
      // faint perspective floor grid
      const S = Math.min(W, H);
      ctx.save(); ctx.strokeStyle = 'rgba(60,120,255,0.07)'; ctx.lineWidth = Math.max(1, S * 0.0012);
      const step = S * 0.08;
      for (let x = (W / 2) % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (H / 2) % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }
  }
  return { list, byId, background, fonts: F };
})();
