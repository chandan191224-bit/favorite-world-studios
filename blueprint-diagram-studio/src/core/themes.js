// The six paper/ink themes. Each theme = palette + paper painter (texture cached at low resolution).
// Papers are drawn full-frame in DESIGN px (short side = 1080). Everything deterministic (seeded noise).
BD.themes = (() => {
  const U = BD.util;

  const LIST = [
    ['bp', 'Blueprint (navy + cyan)'],
    ['graphite', 'Tracing paper (graphite)'],
    ['chalk', 'Chalkboard (chalk white)'],
    ['neon', 'Neon line (black)'],
    ['clean', 'Clean white'],
    ['aged', 'Aged drafting paper'],
  ];

  // palette: ink (main lines), ink2 (secondary), dim (dimensions/measures), grid (minor/major),
  // accent (pop colour), labelInk / labelBg (label boxes), dark bg?, glow?, wobble? (hand feel)
  const PAL = {
    bp: { ink: '#eaf6ff', ink2: '#8fd0ff', dim: '#b7e3ff', grid: 'rgba(127,206,255,.13)', gridMajor: 'rgba(127,206,255,.22)', accent: '#ffd84a', labelInk: '#eaf6ff', labelBg: 'rgba(10,32,60,.88)', labelBorder: 'rgba(143,208,255,.55)', dark: 1, mono: 'mono', label: 'mukta', head: 'khand', wobble: 0 },
    graphite: { ink: '#2c2c31', ink2: '#63636d', dim: '#b0483b', grid: 'rgba(44,44,49,.10)', gridMajor: 'rgba(44,44,49,.17)', accent: '#b0483b', labelInk: '#26262b', labelBg: 'rgba(252,251,246,.92)', labelBorder: 'rgba(44,44,49,.35)', dark: 0, mono: 'mono', label: 'mukta', head: 'khand', wobble: 0.35 },
    chalk: { ink: '#f4f1e8', ink2: '#c9cfd6', dim: '#ffd84a', grid: 'rgba(244,241,232,.07)', gridMajor: 'rgba(244,241,232,.12)', accent: '#ffd84a', labelInk: '#f4f1e8', labelBg: 'rgba(16,18,22,.72)', labelBorder: 'rgba(244,241,232,.4)', dark: 1, mono: 'mono', label: 'kalam', head: 'kalam', wobble: 0.8 },
    neon: { ink: '#21e6ff', ink2: '#ff2a9a', dim: '#9ff5ff', grid: 'rgba(33,230,255,.07)', gridMajor: 'rgba(33,230,255,.13)', accent: '#ffe14d', labelInk: '#dffaff', labelBg: 'rgba(6,10,18,.85)', labelBorder: 'rgba(33,230,255,.6)', dark: 1, glow: 1, mono: 'mono', label: 'mukta', head: 'oswald', wobble: 0 },
    clean: { ink: '#1c2230', ink2: '#7c8494', dim: '#c2572c', grid: 'rgba(28,34,48,.065)', gridMajor: 'rgba(28,34,48,.12)', accent: '#e5a93c', labelInk: '#1c2230', labelBg: 'rgba(255,255,255,.95)', labelBorder: 'rgba(28,34,48,.28)', dark: 0, mono: 'mono', label: 'mukta', head: 'khand', wobble: 0 },
    aged: { ink: '#4a3a28', ink2: '#7a6852', dim: '#a33b2e', grid: 'rgba(74,58,40,.10)', gridMajor: 'rgba(74,58,40,.16)', accent: '#a33b2e', labelInk: '#3f3122', labelBg: 'rgba(240,228,198,.92)', labelBorder: 'rgba(74,58,40,.35)', dark: 0, mono: 'mono', label: 'tiro', head: 'khand', wobble: 0.45 },
  };

  // ---------- cached paper textures (low resolution, never on the page thread per frame) ----------
  const texCache = new Map(); // key theme:WxH -> canvas (texture only, ~1/4 scale)
  function texture(id, W, H, seed) {
    const key = id + ':' + Math.round(W) + 'x' + Math.round(H);
    let c = texCache.get(key);
    if (c) return c;
    const LW = Math.max(160, Math.round(W / 4)), LH = Math.max(90, Math.round(H / 4));
    c = U.canvas(LW, LH);
    const g = c.getContext('2d');
    if (id === 'bp') {
      const gr = g.createLinearGradient(0, 0, LW * 0.3, LH);
      gr.addColorStop(0, '#132c4e'); gr.addColorStop(0.5, '#0f2542'); gr.addColorStop(1, '#0c1e37');
      g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
      const rg = g.createRadialGradient(LW * 0.7, LH * 0.25, 0, LW * 0.7, LH * 0.25, LW * 0.75);
      rg.addColorStop(0, 'rgba(66,130,196,.18)'); rg.addColorStop(1, 'rgba(66,130,196,0)');
      g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
      // faint paper fibres
      g.fillStyle = 'rgba(160,205,255,.03)';
      for (let i = 0; i < 140; i++) g.fillRect(U.h1(i, seed) * LW, U.h1(i + 500, seed) * LH, 1.5, 1);
    } else if (id === 'graphite') {
      g.fillStyle = '#efece1'; g.fillRect(0, 0, LW, LH);
      g.fillStyle = 'rgba(120,116,104,.05)';
      for (let i = 0; i < 260; i++) g.fillRect(U.h1(i, seed + 3) * LW, U.h1(i + 900, seed) * LH, 2, 1);
      const rg = g.createRadialGradient(LW / 2, LH / 2, LW * 0.2, LW / 2, LH / 2, LW * 0.75);
      rg.addColorStop(0, 'rgba(255,255,250,0)'); rg.addColorStop(1, 'rgba(150,146,132,.10)');
      g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
    } else if (id === 'chalk') {
      g.fillStyle = '#14161a'; g.fillRect(0, 0, LW, LH);
      // chalk dust smudges
      for (let i = 0; i < 60; i++) {
        const x = U.h1(i, seed) * LW, y = U.h1(i + 77, seed) * LH, r = 4 + U.h1(i, seed + 9) * 18;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(210,214,220,${0.05 + U.h1(i, seed + 5) * 0.05})`); rg.addColorStop(1, 'rgba(210,214,220,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, LW, 2); g.fillRect(0, LH - 2, LW, 2); g.fillRect(0, 0, 2, LH); g.fillRect(LW - 2, 0, 2, LH);
    } else if (id === 'neon') {
      g.fillStyle = '#05070c'; g.fillRect(0, 0, LW, LH);
      const rg = g.createRadialGradient(LW / 2, LH / 2, 0, LW / 2, LH / 2, LW * 0.7);
      rg.addColorStop(0, 'rgba(20,40,70,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
      g.fillStyle = 'rgba(33,230,255,.02)';
      for (let i = 0; i < 120; i++) g.fillRect(U.h1(i, seed) * LW, U.h1(i + 300, seed) * LH, 1, 1);
    } else if (id === 'clean') {
      g.fillStyle = '#fcfcfd'; g.fillRect(0, 0, LW, LH);
      const rg = g.createRadialGradient(LW / 2, LH * 0.42, LW * 0.25, LW / 2, LH / 2, LW * 0.85);
      rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(180,188,200,.10)');
      g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
    } else { // aged
      g.fillStyle = '#e7d9b8'; g.fillRect(0, 0, LW, LH);
      // blotchy age stains (deterministic fbm)
      const img = g.getImageData(0, 0, LW, LH), d = img.data;
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
        const n = U.fbm2(x / 26, y / 26, seed + 11, 4), k = (y * LW + x) * 4;
        const dk = n < -0.18 ? (-n - 0.18) * 90 : 0;
        d[k] = Math.max(0, d[k] - dk * 0.9); d[k + 1] = Math.max(0, d[k + 1] - dk); d[k + 2] = Math.max(0, d[k + 2] - dk * 1.3);
      }
      g.putImageData(img, 0, 0);
      // coffee-ring style arcs
      g.strokeStyle = 'rgba(120,86,40,.16)'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        if (U.h1(i, seed + 40) < 0.5) continue;
        const x = (0.2 + U.h1(i, seed + 1) * 0.6) * LW, y = (0.2 + U.h1(i, seed + 2) * 0.6) * LH, r = 16 + U.h1(i, seed + 3) * 22;
        g.beginPath(); g.arc(x, y, r, U.h1(i, seed + 4) * U.TAU, U.h1(i, seed + 4) * U.TAU + 2.6); g.stroke();
      }
      g.fillStyle = 'rgba(90,70,40,.05)';
      for (let i = 0; i < 160; i++) g.fillRect(U.h1(i, seed + 7) * LW, U.h1(i + 800, seed) * LH, 2, 1);
    }
    if (texCache.size > 24) { const k0 = texCache.keys().next().value; texCache.delete(k0); }
    texCache.set(key, c);
    return c;
  }

  // ---------- theme object ----------
  function get(id) {
    const pal = PAL[id] || PAL.bp;
    return {
      id, pal,
      ink: pal.ink, ink2: pal.ink2, dim: pal.dim, accent: pal.accent,
      grid: pal.grid, gridMajor: pal.gridMajor, labelInk: pal.labelInk, labelBg: pal.labelBg, labelBorder: pal.labelBorder,
      dark: !!pal.dark, glow: !!pal.glow, wobble: pal.wobble,
      fonts: { mono: pal.mono, label: pal.label, head: pal.head },
      // full-frame paper (call first in every draw): texture + vignette; grid is separate (draws on with progress)
      paper(g, x, y, w, h, seed = 7) {
        const t = texture(id, w, h, seed);
        g.drawImage(t, x, y, w, h);
        if (id === 'bp' || id === 'neon') { // deep edge vignette
          const rg = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
          rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, id === 'neon' ? 'rgba(0,0,0,.55)' : 'rgba(0,10,30,.35)');
          g.fillStyle = rg; g.fillRect(x, y, w, h);
        }
      },
    };
  }
  return { LIST, PAL, get, texture };
})();
