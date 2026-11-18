// The drawing styles: how the traced strokes + tone passes of a photo are rendered —
// pencil, charcoal, ink line, ink wash, engraving, woodcut, stipple, cross-hatch, chalk,
// coloured pencil, watercolour, halftone, manuscript, blueprint. One parametrised
// renderer + per-style config, all deterministic, heavy fields cached per photo.
SK.gfx = (() => {
  const U = SK.util;
  const tmps = {};
  function tmp(key, W, H) {
    let c = tmps[key];
    if (!c) c = tmps[key] = U.canvas(W, H);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    return c;
  }
  // cover/contain fit that can NEVER expose an edge (zoom >= cover scale)
  function fit(iw, ih, W, H, mode = 'cover', fx = 0.5, fy = 0.5, zoom = 1) {
    const k = (mode === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih)) * Math.max(1, zoom);
    const dw = iw * k, dh = ih * k;
    return { dx: (W - dw) * fx, dy: (H - dh) * fy, dw, dh };
  }
  function drawCover(g, el, W, H, o = {}) {
    const iw = el.videoWidth || el.width, ih = el.videoHeight || el.height;
    if (!iw || !ih) return;
    const f = fit(iw, ih, W, H, o.mode || 'cover', o.fx, o.fy, o.zoom);
    g.drawImage(el, f.dx, f.dy, f.dw, f.dh);
  }
  // archival treatment of a photo (desaturate / sepia / vignette / grain / border), cached per key
  const agedCache = new Map();
  function aged(el, key, W, H, o = {}) {
    const a = o.aged == null ? 0.6 : o.aged;
    const ck = [key, W, H, a, o.desat || 0, o.vig || 0, o.border || 0, o.grain || 0, o.fx, o.fy].join('|');
    if (agedCache.has(ck)) return agedCache.get(ck);
    const c = U.canvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    drawCover(g, el, W, H, o);
    if (o.desat > 0 || a > 0.4) { // partial desaturation via a gray 'saturation' pass
      g.save();
      g.globalCompositeOperation = 'saturation';
      g.fillStyle = 'hsl(0,0%,50%)';
      g.globalAlpha = U.clamp(Math.max(o.desat || 0, (a - 0.4) * 1.2));
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    if (a > 0) {
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(233,200,150,${0.16 * a})`; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'screen';
      g.fillStyle = `rgba(110,74,32,${0.1 * a})`; g.fillRect(0, 0, W, H);
      g.restore();
    }
    if (o.vig > 0) {
      const rg = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.36, W / 2, H * 0.5, Math.hypot(W, H) * 0.6);
      rg.addColorStop(0, 'rgba(0,0,0,0)');
      rg.addColorStop(0.78, `rgba(20,12,4,${0.2 * o.vig})`);
      rg.addColorStop(1, `rgba(12,8,2,${0.66 * o.vig})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    if (o.grain > 0) {
      g.save();
      g.globalAlpha = 0.05 * o.grain;
      g.globalCompositeOperation = 'overlay';
      g.fillStyle = g.createPattern(SK.paper.grainTile(4), 'repeat');
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    if (o.border > 0) { // thin aged inner frame
      g.save();
      g.strokeStyle = `rgba(245,238,220,${0.75 * o.border})`;
      g.lineWidth = Math.max(2, W * 0.004);
      const m = Math.max(6, W * 0.018);
      g.strokeRect(m, m, W - 2 * m, H - 2 * m);
      g.globalAlpha = 0.25 * o.border;
      g.strokeStyle = 'rgba(60,40,20,.9)';
      g.strokeRect(m - 3, m - 3, W - 2 * m + 6, H - 2 * m + 6);
      g.restore();
    }
    if (agedCache.size > 18) agedCache.clear();
    agedCache.set(ck, c);
    return c;
  }
  return { tmp, fit, drawCover, aged };
})();

// ---------------------------------------------------------------------
SK.styles = (() => {
  const U = SK.util, I = SK.ink;

  // per-style configuration. analysis fields feed SK.proc.analyze (cache key!).
  const LIST = [
    {
      id: 'pencil', name: 'Pencil sketch', paper: 'cream',
      ink: { color: '#33322f', style: 'pencil', width: 1.9, wobble: 0.5, pressure: 0.85, alpha: 1 },
      iso: { color: '#4a4844', width: 0.75, alpha: 0.4, levels: [1, 2] },
      analysis: { detail: 0.55, smooth: 2, hatchGap: 8, passes: { strokes: true, hatch: true } },
      note: 'Graphite outline with soft form-following shading.',
    },
    {
      id: 'charcoal', name: 'Charcoal', paper: 'cream',
      ink: { color: '#1e1c1a', style: 'charcoal', width: 2.6, wobble: 0.75, pressure: 1, alpha: 1 },
      wash: { color: '#2a2724', levels: [1, 2], alpha: 0.3 },
      iso: { color: '#211f1c', width: 1.6, alpha: 0.4, levels: [2, 3] },
      analysis: { detail: 0.42, smooth: 3, hatchGap: 9, passes: { strokes: true, hatch: true, tone: true } },
      note: 'Thick soft charcoal with smudged darks.',
    },
    {
      id: 'inkline', name: 'Ink line art', paper: 'cream',
      ink: { color: '#141210', style: 'ink', width: 1.7, wobble: 0.32, pressure: 0.72, alpha: 1 },
      analysis: { detail: 0.62, smooth: 2, passes: { strokes: true } },
      note: 'Clean contour line art, no shading.',
    },
    {
      id: 'inkwash', name: 'Ink wash (sumi-e)', paper: 'cream',
      ink: { color: '#171412', style: 'brush', width: 2.2, wobble: 0.5, pressure: 0.9, alpha: 1 },
      wash: { color: '#26221d', levels: [0, 1, 2], alpha: 0.4 },
      analysis: { detail: 0.5, smooth: 3, passes: { strokes: true, tone: true } },
      note: 'Brush contours with layered grey washes.',
    },
    {
      id: 'engraving', name: 'Engraving / etching', paper: 'parchment',
      ink: { color: '#2b2318', style: 'ink', width: 0.95, wobble: 0.14, pressure: 0.3, alpha: 1 },
      iso: { color: '#332a1d', width: 0.75, alpha: 0.9, levels: [0, 1, 2, 3], dense: true },
      analysis: { detail: 0.68, smooth: 2, hatchGap: 6.5, passes: { strokes: true, hatch: true } },
      note: 'Banknote-style hatching that follows the forms.',
    },
    {
      id: 'woodcut', name: 'Woodcut / linocut', paper: 'cream',
      ink: { color: '#151310', style: 'ink', width: 3.6, wobble: 0.2, pressure: 0.25, alpha: 1 },
      fill: { color: '#191510', t: 0.6 },
      cuts: { color: '#e8dfc8', width: 2.4, levels: [2, 3] },
      analysis: { detail: 0.34, smooth: 3, hatchGap: 10, passes: { strokes: true, hatch: true, tone: true } },
      note: 'Bold posterised cuts — white gouges in solid black.',
    },
    {
      id: 'stipple', name: 'Stipple', paper: 'cream',
      ink: { color: '#26221c', style: 'ink', width: 1.55, wobble: 0.35, pressure: 0.4, alpha: 0.85 },
      stipple: { color: '#26221c', dotScale: 1.2 },
      analysis: { detail: 0.55, smooth: 2, stippleGap: 4.2, passes: { strokes: true, stipple: true } },
      note: 'Shading built from thousands of hand-placed dots.',
    },
    {
      id: 'crosshatch', name: 'Cross-hatch', paper: 'cream',
      ink: { color: '#1b1815', style: 'ink', width: 1.3, wobble: 0.3, pressure: 0.5, alpha: 1 },
      xhatch: { color: '#221e19', width: 0.7, alpha: 0.66, angle: 0.7 },
      analysis: { detail: 0.55, smooth: 2, hatchGap: 7.5, passes: { strokes: true, xhatch: true } },
      note: 'Classic pen cross-hatching in two directions.',
    },
    {
      id: 'chalk', name: 'Chalk on blackboard', paper: 'board',
      ink: { color: '#f2efe6', style: 'chalk', width: 2.4, wobble: 0.6, pressure: 0.9, alpha: 1 },
      stipple: { color: '#e8e4d8', dotScale: 0.9 },
      analysis: { detail: 0.56, smooth: 2, stippleGap: 6, passes: { strokes: true, stipple: true } },
      note: 'Soft white chalk with dust on a blackboard.',
    },
    {
      id: 'cpencil', name: 'Coloured pencil', paper: 'cream',
      ink: { color: '#4a3b2c', style: 'pencil', width: 1.8, wobble: 0.5, pressure: 0.8, alpha: 1 },
      colorWash: { alpha: 0.68, sat: 1.18 },
      xhatch: { color: '#5a4a36', width: 0.6, alpha: 0.3, angle: 0.7 },
      analysis: { detail: 0.55, smooth: 2, hatchGap: 8, colors: 8, passes: { strokes: true, xhatch: true, color: true } },
      note: 'Waxy colour under a graphite outline.',
    },
    {
      id: 'watercolour', name: 'Watercolour wash', paper: 'cream',
      ink: { color: '#3a3128', style: 'ink', width: 1.5, wobble: 0.35, pressure: 0.6, alpha: 0.9 },
      colorWash: { alpha: 0.85, sat: 1.25, soft: true },
      wash: { color: '#4a4136', levels: [1], alpha: 0.14 },
      analysis: { detail: 0.5, smooth: 4, colors: 6, passes: { strokes: true, color: true, tone: true } },
      note: 'Loose transparent colour pools with a light contour.',
    },
    {
      id: 'halftone', name: 'Comic halftone', paper: 'white',
      ink: { color: '#101010', style: 'ink', width: 2.8, wobble: 0.25, pressure: 0.4, alpha: 1 },
      colorWash: { alpha: 0.88, sat: 1.35, poster: true },
      dots: { color: '#181818', maxDark: 0.55 },
      analysis: { detail: 0.4, smooth: 3, colors: 4, passes: { strokes: true, color: true } },
      note: 'Posterised colour with a dot screen in the shadows.',
    },
    {
      id: 'manuscript', name: 'Manuscript illustration', paper: 'parchment',
      ink: { color: '#4a3018', style: 'ink', width: 1.7, wobble: 0.42, pressure: 0.65, alpha: 0.95 },
      iso: { color: '#5a3d20', width: 0.75, alpha: 0.55, levels: [1, 2] },
      analysis: { detail: 0.52, smooth: 2, hatchGap: 8, passes: { strokes: true, hatch: true } },
      note: 'Sepia ink on aged parchment.',
    },
    {
      id: 'blueprint', name: 'Blueprint', paper: 'blueprint',
      ink: { color: '#eef4ff', style: 'ink', width: 1.4, wobble: 0.2, pressure: 0.45, alpha: 1 },
      iso: { color: '#dce8ff', width: 0.6, alpha: 0.45, levels: [0, 1, 2] },
      analysis: { detail: 0.6, smooth: 2, hatchGap: 7, passes: { strokes: true, hatch: true } },
      note: 'White technical lines on a blue print.',
    },
  ];
  const byId = {};
  LIST.forEach(s => (byId[s.id] = s));

  // analysis options for a style + user params (this IS the cache key)
  function analysisOpts(cfg, P) {
    const density = P.hatchDensity == null ? 1 : P.hatchDensity;
    const a = Object.assign({}, cfg.analysis);
    a.passes = Object.assign({}, cfg.analysis.passes);
    if (P.detail != null) a.detail = U.lerp(0.18, 0.9, U.clamp(P.detail));
    if (P.smooth != null) a.smooth = Math.round(U.lerp(1, 4, U.clamp(P.smooth)));
    if (a.hatchGap) a.hatchGap = a.hatchGap / U.clamp(density, 0.4, 2);
    if (a.stippleGap) a.stippleGap = a.stippleGap / U.clamp(density, 0.4, 2);
    a.seed = P.seed || 7;
    return a;
  }

  // ---- one tone pass: tinted tone canvases (washes / smudge) ----
  function drawWash(g, data, cfg, P, W, H, k, q, seed) {
    if (!data.tone) return;
    const levels = cfg.wash.levels;
    const strength = P.tone == null ? 1 : U.clamp(P.tone);
    if (strength <= 0.02) return;
    levels.forEach((li, i) => {
      const lq = U.clamp(q * levels.length - i);
      if (lq <= 0 || !data.tone[li]) return;
      const tc = SK.gfx.tmp('wash' + i, W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      tg.globalAlpha = lq * cfg.wash.alpha * strength;
      tg.drawImage(data.tone[li], 0, 0, W, H);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = cfg.wash.color;
      tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      g.drawImage(tc, 0, 0);
    });
  }

  // ---- solid dark fill + white cuts (woodcut) ----
  function drawFill(g, data, cfg, P, W, H, q) {
    if (!data.tone) return;
    const strength = P.tone == null ? 1 : U.clamp(P.tone);
    // pick the tone band that matches the style's fill threshold
    const t = cfg.fill.t == null ? 0.6 : cfg.fill.t;
    const li = t < 0.52 ? 0 : t < 0.72 ? 1 : 2;
    const tc = SK.gfx.tmp('fill', W, H), tg = tc.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
    tg.globalAlpha = U.clamp(q * 1.4) * 0.94 * strength;
    tg.drawImage(data.tone[li], 0, 0, W, H);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = cfg.fill.color;
    tg.fillRect(0, 0, W, H);
    tg.globalCompositeOperation = 'source-over';
    g.drawImage(tc, 0, 0);
    // white cuts: hatch lines inside the dark areas, drawn in paper colour
    if (cfg.cuts && data.hatch) {
      const k2 = W / data.W;
      g.save();
      g.lineCap = 'round';
      cfg.cuts.levels.forEach((bi, ci) => {
        const lines = data.hatch[bi] || [];
        const lq = U.clamp(q * 1.6 - 0.3 - ci * 0.3);
        const n = Math.floor(lines.length * lq);
        for (let i = 0; i < n; i++) {
          I.seg(g, lines[i], k2, { color: cfg.cuts.color, width: cfg.cuts.width, wobble: 0.35, seed: P.seed * 3 + i, alpha: 0.9 });
        }
      });
      g.restore();
    }
  }

  // ---- colour (watercolour / coloured pencil / halftone poster) ----
  function drawColor(g, data, cfg, P, W, H, q) {
    if (!data.color) return;
    const cw = cfg.colorWash;
    const tc = SK.gfx.tmp('color', W, H), tg = tc.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
    tg.drawImage(data.color.canvas, 0, 0, W, H);
    if (cw.poster) { // flatten: boost saturation + contrast a touch
      tg.globalCompositeOperation = 'saturation';
      tg.fillStyle = `hsl(0,${Math.round(40 * cw.sat)}%,50%)`;
      tg.fillRect(0, 0, W, H);
    } else {
      tg.globalCompositeOperation = 'saturation';
      tg.fillStyle = `hsl(0,${Math.round(28 * (cw.sat - 1))}%,50%)`;
      tg.fillRect(0, 0, W, H);
    }
    if (cw.soft) { // wobbly wet edge: erase with a noisy border so pools look irregular
      tg.globalCompositeOperation = 'destination-out';
      tg.globalAlpha = 0.5;
      for (let i = 0; i < 26; i++) {
        const x = U.h1(i, P.seed + 61) * W, y = U.h1(i, P.seed + 67) * H;
        const r = W * (0.04 + U.h1(i, P.seed + 71) * 0.1);
        const rg = tg.createRadialGradient(x, y, r * 0.3, x, y, r);
        rg.addColorStop(0, 'rgba(0,0,0,0.55)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = rg;
        tg.beginPath(); tg.arc(x, y, r, 0, 7); tg.fill();
      }
      tg.globalAlpha = 1;
      tg.globalCompositeOperation = 'source-over';
    }
    tg.globalCompositeOperation = 'source-over';
    g.save();
    g.globalAlpha = cw.alpha * U.clamp(q * 1.15);
    g.drawImage(tc, 0, 0);
    g.restore();
    // halftone dots in the shadows
    if (cfg.dots && data.dark) {
      const d = data.dark, DW = data.W, DH = data.H, kd = W / DW;
      const s = Math.max(4, W / 170);
      g.save();
      g.fillStyle = cfg.dots.color;
      const md = cfg.dots.maxDark;
      for (let y = 0; y < DH; y += s / kd) {
        for (let x = ((y / (s / kd)) % 2) * s / kd / 2; x < DW; x += s / kd) {
          const xi = Math.min(DW - 1, x | 0), yi = Math.min(DH - 1, y | 0);
          const dk = d[yi * DW + xi];
          if (dk < 0.3) continue;
          const rr = U.clamp((dk - 0.28) / md) * s * 0.46;
          if (rr < 0.6) continue;
          g.beginPath(); g.arc(x * kd, y * kd, rr, 0, 7); g.fill();
        }
      }
      g.restore();
    }
  }

  // ---- stipple dots ----
  function drawStipple(g, data, cfg, P, W, H, q, k) {
    if (!data.stipple) return;
    const pts = data.stipple;
    const n = Math.floor(pts.length * U.clamp(q));
    g.save();
    g.fillStyle = cfg.stipple.color;
    g.globalAlpha = cfg.stipple.alpha == null ? 0.85 : cfg.stipple.alpha;
    for (let i = 0; i < n; i++) I.stippleDot(g, pts[i], k, { seed: P.seed, wobble: 0.35, dotScale: cfg.stipple.dotScale });
    g.restore();
  }

  // ---- hatch passes (iso = engraving / pencil shading, x = cross-hatch) ----
  function drawHatchIso(g, data, cfg, P, W, H, q, k) {
    if (!data.hatch) return;
    const strength = P.tone == null ? 1 : U.clamp(P.tone);
    const lv = cfg.iso.levels;
    lv.forEach((bi, i) => {
      const lines = data.hatch[bi] || [];
      const lq = U.clamp(q * lv.length - i);
      if (lq <= 0) return;
      const n = Math.floor(lines.length * lq);
      for (let j = 0; j < n; j++) {
        I.seg(g, lines[j], k, { color: cfg.iso.color, width: cfg.iso.width * (P.lineWeight || 1), wobble: 0.3, pressure: 0.5, seed: P.seed + bi * 97 + j, alpha: cfg.iso.alpha * strength });
      }
    });
  }
  function drawHatchX(g, data, cfg, P, W, H, q, k) {
    if (!data.xhatch) return;
    const strength = P.tone == null ? 1 : U.clamp(P.tone);
    data.xhatch.forEach((bands, gi) => {
      bands.forEach((lines, bi) => {
        const lq = U.clamp(q * 2.4 - bi * 0.55 - gi * 0.35);
        if (lq <= 0) return;
        const n = Math.floor(lines.length * lq);
        for (let j = 0; j < n; j++) {
          I.seg(g, lines[j], k, { color: cfg.xhatch.color, width: cfg.xhatch.width * (P.lineWeight || 1), wobble: 0.32, pressure: 0.4, seed: P.seed + bi * 131 + j * 7 + gi * 17, alpha: cfg.xhatch.alpha * strength });
        }
      });
    });
  }

  // ---- the outline stroke pass (the heart: draw-on with budget + optional tool) ----
  function drawStrokes(g, data, P, cfg, W, H, k, q, env) {
    if (!data.strokes || !data.strokes.length) return null;
    const order = P.order || 'natural';
    const drawn = I.budget(data.strokes, order, q, P.seed, data.focus);
    const ink = cfg.ink;
    const wMul = P.lineWeight == null ? 1 : P.lineWeight;
    let tip = null;
    g.save();
    g.fillStyle = ink.color;
    for (const [si, upto] of drawn) {
      const s = data.strokes[si];
      const t = I.stroke(g, s.p, k, {
        width: ink.width * wMul, wobble: ink.wobble, pressure: ink.pressure, seed: (P.seed * 31 + si) | 0,
        color: ink.color, alpha: ink.alpha, style: ink.style, upto,
      });
      if (t) tip = { t, s };
    }
    g.restore();
    // the pencil / nib following the stroke being drawn right now
    const tool = P.tool || 'none';
    if (tip && tool !== 'none' && env) {
      const [x, y, ang] = tip.t;
      I.tool(g, x, y, ang, tool, Math.max(10, H * 0.055) / 26, ink.color);
    }
    return tip;
  }

  // ---- paper ----
  function drawPaper(g, cfg, P, W, H, env) {
    const type = P.paper || cfg.paper || 'cream';
    const po = P.paperOpts || {};
    g.drawImage(SK.paper.get(type, P.seed || 7, W, H, {
      stains: po.stains == null ? (type === 'parchment' ? 0.7 : 0.3) : po.stains,
      burn: po.burn == null ? (type === 'parchment' ? 0.35 : 0) : po.burn,
      smudge: po.smudge || 0, eraser: po.eraser || 0, grid: po.grid || 0,
    }), 0, 0);
  }

  // ------------------------------------------------------------------
  // render one style onto g. env: {W,H,k,media,mediaKey,P,seed,mode,ph:{stroke,tone,color,fill}}
  // styleId can be a style id or a merged config object (ink colour overrides etc).
  // Returns the analysis handle (for progress UI) or null.
  function render(g, styleId, env) {
    const cfg = typeof styleId === 'object' ? styleId : (byId[styleId] || byId.pencil);
    const P = env.P || {};
    if (P.seed == null) P.seed = env.seed != null ? env.seed : 7; // shot seed → stroke wobble
    const ph = env.ph || { stroke: 1, tone: 1, color: 1, fill: 1 };
    const { W, H } = env;
    const drawInk = () => {
      if (!env.ana || !env.ana.data || !env.ana.data.W) return;
      const data = env.ana.data;
      const k = W / data.W; // analysis px -> device px
      if (cfg.fill) drawFill(g, data, cfg, P, W, H, ph.fill == null ? ph.tone : ph.fill);
      else if (cfg.wash) drawWash(g, data, cfg, P, W, H, k, ph.tone == null ? 1 : ph.tone, P.seed);
      if (cfg.colorWash) drawColor(g, data, cfg, P, W, H, ph.color == null ? 1 : ph.color);
      if (cfg.iso && !cfg.fill) drawHatchIso(g, data, cfg, P, W, H, ph.tone == null ? 1 : ph.tone, k);
      if (cfg.xhatch) drawHatchX(g, data, cfg, P, W, H, ph.tone == null ? 1 : ph.tone, k);
      if (cfg.stipple) drawStipple(g, data, cfg, P, W, H, ph.tone == null ? 1 : ph.tone, k);
      drawStrokes(g, data, P, cfg, W, H, k, ph.stroke == null ? 1 : ph.stroke, env);
    };
    // composite mode: paper under everything; element modes: ink only (element export)
    if (env.mode === 'composite' && P.paper !== 'none' && !env.noPaper) drawPaper(g, cfg, P, W, H, env);
    drawInk();
    return env.ana;
  }

  return { LIST, byId, analysisOpts, render, drawPaper };
})();
