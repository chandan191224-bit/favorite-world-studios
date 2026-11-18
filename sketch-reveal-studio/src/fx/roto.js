// Rotoscope: line-art treatment of a video clip (or the built-in demo clip). Stable mode
// keeps the wobble seed fixed (clean, no flicker); boil mode re-seeds at 8-12 fps for the
// deliberate hand-drawn "boiling line". Frame-exact: export seeks each frame, analysis is
// cached per (media, frame step).
SK.roto = (() => {
  const U = SK.util, I = SK.ink;

  const MODES = [
    ['ink', 'Ink line art'], ['pencil', 'Pencil'], ['charcoal', 'Charcoal'],
    ['blueprint', 'Blueprint white line'], ['cel', 'Posterised cel colour'], ['chalk', 'Chalk on board'],
  ];
  const INKS = {
    ink: { color: '#141210', style: 'ink', width: 1.3, wobble: 0.35, pressure: 0.6 },
    pencil: { color: '#33322f', style: 'pencil', width: 1.6, wobble: 0.55, pressure: 0.85 },
    charcoal: { color: '#1e1c1a', style: 'charcoal', width: 2.6, wobble: 0.7, pressure: 1 },
    blueprint: { color: '#eef4ff', style: 'ink', width: 1.1, wobble: 0.2, pressure: 0.45 },
    chalk: { color: '#f2efe6', style: 'chalk', width: 2.1, wobble: 0.6, pressure: 0.9 },
    cel: { color: '#111111', style: 'ink', width: 2.2, wobble: 0.22, pressure: 0.35 },
  };

  // draw the treated frame. env: {W,H,media,mediaKey,t,P,mode}
  function render(g, env) {
    const { W, H, P, media } = env;
    const mode = P.roto || 'ink';
    const boilFps = P.boil == null ? 0 : P.boil; // 0 = stable
    const seed = P.seed || 7;
    // source frame into a work canvas
    const src = SK.gfx.tmp('rotoSrc', 960, 540), sg = src.getContext('2d', { willReadFrequently: true });
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.fillStyle = '#fff'; sg.fillRect(0, 0, src.width, src.height);
    const el = media.kind === 'demovideo' ? media.draw(env.t) : media.el;
    if (!el) return;
    const iw = el.videoWidth || el.width, ih = el.videoHeight || el.height;
    if (!iw || !ih) return;
    const f = SK.gfx.fit(iw, ih, src.width, src.height, 'cover');
    sg.drawImage(el, f.dx, f.dy, f.dw, f.dh);
    // analysis (cached per quantised frame step)
    const step = boilFps > 0 ? boilFps : 12; // stable shares one 12fps grid → cache hits
    const fIdx = Math.max(0, Math.round(env.t * step));
    const a = SK.proc.frame(src, env.mediaKey + '/' + mode, fIdx, {
      detail: P.detail == null ? 0.58 : P.detail,
      smooth: 2, maxDim: 360,
    });
    if (!a.strokes) return;
    const k = W / a.W;
    // paper (not for cel — cel sits directly on the colour)
    if (env.mode === 'composite' && mode !== 'cel' && P.paper !== 'none') {
      g.drawImage(SK.paper.get(mode === 'blueprint' ? 'blueprint' : mode === 'chalk' ? 'board' : 'cream', seed, W, H, { stains: 0.3 }), 0, 0);
    }
    // cel: posterised colour under the lines
    if (mode === 'cel') {
      const key = [env.mediaKey, fIdx, P.celLevels || 4].join('|');
      let cc = celCache.get(key);
      if (!cc) {
        cc = SK.proc.quantize(src.getContext('2d', { willReadFrequently: true }), src.width, src.height, P.celLevels || 4, 31 + fIdx);
        celCache.set(key, cc);
        if (celCache.size > 90) { const ks = celCache.keys(); for (let i = 0; i < 30; i++) celCache.delete(ks.next().value); }
      }
      g.drawImage(cc.canvas, 0, 0, W, H);
    }
    // strokes — boil changes the wobble seed per step, stable keeps it fixed
    const ink = INKS[mode] || INKS.ink;
    const wSeed = boilFps > 0 ? seed + fIdx * 2654435761 : seed;
    g.save();
    g.fillStyle = ink.color;
    const idx = I.orderStrokes(a.strokes, 'big', wSeed, a.focus);
    for (const si of idx) {
      const s = a.strokes[si];
      I.stroke(g, s.p, k, {
        width: ink.width * (P.lineWeight || 1), wobble: ink.wobble, pressure: ink.pressure,
        seed: (wSeed * 31 + si) | 0, color: ink.color, style: ink.style, alpha: ink.alpha || 1,
      });
    }
    g.restore();
  }
  const celCache = new Map();

  return { MODES, render };
})();
