// Reveals & transitions: how a drawing appears stroke by stroke, how the real photo
// bleeds into the sketch (and dries back), and how one shot turns into the next.
// Masks are all seeded-noise shapes drawn into a temp canvas and applied with
// destination-in, so preview == export, every time.
SK.reveals = (() => {
  const U = SK.util;

  // phase helper: map local time into [a..a+d] → 0..1 with easing
  const ph = (t, a, d, ease = 'cine') => (d <= 0 ? (t >= a ? 1 : 0) : U.ease[ease](U.range(t, a, a + d)));

  // ---------------- masks (drawn white-on-transparent, used with destination-in) ----------------
  // q: 0..1 reveal progress. focus: [0..1] in image space (device px here).
  function mask(g, W, H, type, q, seed, fx, fy) {
    const cx = fx * W, cy = fy * H;
    if (type === 'radial') {
      const R = Math.hypot(W, H) * 0.62 * q;
      g.save();
      g.beginPath();
      const steps = 44;
      for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2;
        const rr = R * (1 + U.noise1(a * 2.2 + seed, seed) * 0.09);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
      g.fillStyle = '#fff'; g.fill();
      // soft wet edge
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = 0.4;
      g.lineWidth = Math.max(6, W * 0.008); g.strokeStyle = '#000';
      g.stroke();
      g.restore();
    } else if (type === 'bleed') {
      // ink drops spreading from the focus
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = U.h1(i, seed) * Math.PI * 2;
        const dist = U.h1(i, seed + 3) ** 0.7 * Math.hypot(W, H) * 0.55;
        const grow = U.clamp(q * 1.5 - i / n * 0.45);
        if (grow <= 0) continue;
        const x = cx + Math.cos(a) * dist * grow, y = cy + Math.sin(a) * dist * grow;
        const r = (W * 0.16 + U.h1(i, seed + 7) * W * 0.16) * grow;
        const rg = g.createRadialGradient(x, y, r * 0.55, x, y, r);
        rg.addColorStop(0, 'rgba(255,255,255,1)');
        rg.addColorStop(0.8, 'rgba(255,255,255,0.85)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // the core drop is always on
      const cr = Math.hypot(W, H) * 0.5 * q * 1.2;
      const rg = g.createRadialGradient(cx, cy, cr * 0.3, cx, cy, cr);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.75, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill();
    } else if (type === 'wash') {
      // watercolour band sweeping diagonally; what's behind it stays
      const ang = -0.32;
      const diag = Math.hypot(W, H);
      const px = U.lerp(-diag * 0.3, diag * 1.15, q);
      const band = W * 0.3;
      g.save();
      g.translate(W / 2, H / 2); g.rotate(ang); g.translate(-W / 2, -H / 2);
      const gr = g.createLinearGradient(px - band, 0, px, 0);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.82, 'rgba(255,255,255,0.94)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(-diag, -diag, px + band + diag, diag * 3);
      // wobbly wet leading edge
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = band * 0.35;
      g.beginPath();
      for (let y = -diag / 2; y < diag / 2; y += 18) g.lineTo(px + U.noise1(y / 90 + seed, seed) * band * 0.22, y);
      g.stroke();
      g.restore();
    } else if (type === 'brush') {
      // wide parallel brush strokes sweeping across, staggered
      const rows = 5, ang = 0.18;
      g.save();
      g.translate(W / 2, H / 2); g.rotate(ang); g.translate(-W / 2, -H / 2);
      for (let i = 0; i < rows; i++) {
        const y = (i + 0.5) / rows * H + U.noise1(i * 3.1 + seed, seed) * H * 0.06;
        const dq = U.clamp(q * rows * 1.35 - i * 0.5);
        if (dq <= 0) continue;
        const x1 = U.lerp(-W * 0.15, W * 1.12, dq);
        g.strokeStyle = 'rgba(255,255,255,1)';
        g.lineCap = 'round';
        g.lineWidth = H / rows * 1.02;
        g.beginPath();
        g.moveTo(-W * 0.16, y + U.noise1(i * 7 + seed, seed + 1) * 8);
        for (let x = -W * 0.16; x < x1; x += W * 0.06) g.lineTo(x, y + U.noise1(x / (W * 0.05) + i * 9, seed) * H * 0.035);
        g.lineTo(x1, y + U.noise1(x1 / (W * 0.05) + i * 9, seed) * H * 0.035);
        g.stroke();
      }
      g.restore();
    } else if (type === 'pour') {
      // colour pouring in from the top: noisy descending fill with drips
      const yEdge = H * 1.05 * q;
      g.save();
      g.beginPath();
      g.moveTo(0, -H);
      g.lineTo(W, -H);
      for (let x = W; x >= 0; x -= W / 42) g.lineTo(x, yEdge + U.noise1(x / (W * 0.06) + seed, seed) * H * 0.05);
      g.closePath();
      g.fillStyle = '#fff'; g.fill();
      // drips running ahead of the fill: thin streaks of colour reaching further down
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 7; i++) {
        const x = U.h1(i, seed + 21) * W;
        const drop = U.clamp(q * 1.8 - U.h1(i, seed + 23)) * H * 0.24;
        if (drop < 4) continue;
        g.strokeStyle = '#fff'; g.lineWidth = W * 0.013 * (0.45 + U.h1(i, seed + 25) * 0.6); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, yEdge - H * 0.03); g.lineTo(x + U.noise1(i * 4 + seed, seed) * 8, yEdge + drop); g.stroke();
      }
      g.restore();
    } else if (type === 'split' || type === 'splitHold') {
      // vertical wobbly divider; left = revealed
      const xs = type === 'splitHold' ? W * (fx || 0.5) : U.lerp(0, W * 1.05, q);
      g.save();
      g.beginPath();
      g.moveTo(0, -2); g.lineTo(xs, -2);
      const step = H / 30;
      for (let y = 0; y <= H + step; y += step) g.lineTo(xs + U.noise1(y / (H * 0.05) + seed, seed) * W * 0.014, y);
      g.lineTo(0, H + 2);
      g.closePath();
      g.fillStyle = '#fff'; g.fill();
      g.restore();
    } else { // fade / dissolve
      g.fillStyle = `rgba(255,255,255,${U.clamp(q)})`;
      g.fillRect(0, 0, W, H);
    }
  }

  // apply a mask to a drawn canvas and stamp it over the current context.
  // The mask shapes are built on their OWN canvas with normal compositing first —
  // destination-in applies to the whole canvas on every fill, so multi-shape masks
  // (ink drops, brush strokes) would erase everything outside each shape.
  function stampMasked(g, src, W, H, type, q, seed, fx, fy, opts = {}) {
    const tc = SK.gfx.tmp('mask', W, H), tg = tc.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.clearRect(0, 0, W, H);
    tg.drawImage(src, 0, 0);
    const mc = SK.gfx.tmp('maskShape', W, H), mg = mc.getContext('2d');
    mg.setTransform(1, 0, 0, 1, 0, 0);
    mg.clearRect(0, 0, W, H);
    mask(mg, W, H, type, q, seed, fx, fy);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(mc, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    if (opts.soft !== false && (type === 'bleed' || type === 'radial')) {
      // soften the mask edge once more for a wet look
      g.save();
      g.globalAlpha = 0.96;
      g.drawImage(tc, 0, 0);
      g.globalAlpha = 0.04 * (1 - q);
      g.drawImage(tc, Math.max(2, W * 0.003), 0);
      g.restore();
    } else {
      g.drawImage(tc, 0, 0);
    }
    return tc;
  }

  // ---------------- sketch -> photo inside one shot ----------------
  // env: {W,H,media el,mediaKey,P,seed,mode}; q 0..1 reveal progress; layerFn draws the
  // sketch state (called with an alpha override for the 'fade' mode under the photo).
  function photo(g, q, type, env, drawSketch) {
    if (q <= 0.001) return;
    const { W, H, P } = env;
    const fx = (env.focus && env.focus[0]) || 0.5, fy = (env.focus && env.focus[1]) || 0.42;
    const aged = SK.gfx.aged(env.media.el, env.mediaKey, W, H, {
      aged: P.photoAge == null ? 0.55 : P.photoAge, desat: P.photoDesat || 0,
      vig: P.photoVig == null ? 0.5 : P.photoVig, grain: 0.6, border: P.photoBorder || 0,
      fx: P.fx == null ? 0.5 : P.fx, fy: P.fy == null ? 0.5 : P.fy, zoom: 1,
    });
    if (type === 'fade') {
      g.save();
      g.globalAlpha = U.clamp(q);
      g.drawImage(aged, 0, 0);
      g.restore();
      return;
    }
    if (type === 'dry') { // photo drying back into a sketch (reverse)
      g.save();
      g.globalAlpha = 1 - U.clamp(q);
      g.drawImage(aged, 0, 0);
      g.restore();
      return;
    }
    if (type === 'pour' || type === 'split' || type === 'splitHold') {
      // ink lines stay ON TOP of the arriving photo
      stampMasked(g, aged, W, H, type, q, env.seed, fx, fy);
      if (drawSketch) drawSketch(1);
      return;
    }
    stampMasked(g, aged, W, H, type, q, env.seed, fx, fy);
  }

  // ---------------- transitions between shots ----------------
  const TR = [
    { id: 'cut', name: 'Cut', dur: 0, note: 'Hard cut — no transition time.' },
    { id: 'dissolve', name: 'Cross-dissolve', dur: 0.7, note: 'Soft crossfade through the paper.' },
    { id: 'bleed', name: 'Ink bleed', dur: 1.1, note: 'The next shot bleeds through like wet ink.' },
    { id: 'wash', name: 'Watercolour wipe', dur: 1.1, note: 'A wash band sweeps across, carrying the next shot in.' },
    { id: 'radial', name: 'Radial reveal', dur: 0.9, note: 'Grows out of the subject as a wobbling circle.' },
    { id: 'brush', name: 'Brush strokes', dur: 1.0, note: 'Broad brush strokes wipe the new shot in.' },
    { id: 'pour', name: 'Colour pour', dur: 1.0, note: 'The new shot pours in from the top.' },
    { id: 'split', name: 'Split sweep', dur: 0.9, note: 'A wobbly line sweeps: old right, new left.' },
    { id: 'dip', name: 'Dip to paper', dur: 0.8, note: 'Fades to bare paper, then the new shot.' },
    { id: 'dry', name: 'Photo dries to sketch', dur: 1.2, note: 'The photo dries back into a sketch, then cuts.' },
  ];
  const trById = {};
  TR.forEach(t => (trById[t.id] = t));

  // drawShotA/drawShotB: callbacks that render shot A (at its end state) and shot B (at
  // content time u) onto a fresh canvas. The transition composites them.
  function transition(g, type, q, seed, W, H, drawA, drawB, focus) {
    const e = U.ease.inOut(U.clamp(q));
    if (type === 'dissolve' || type === 'dip') {
      if (type === 'dip') { // through bare paper: A→paper→B
        const qa = U.clamp(q / 0.45), qb = U.clamp((q - 0.4) / 0.5);
        const tc = SK.gfx.tmp('tA', W, H), tg = tc.getContext('2d');
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        drawA(tg);
        g.save();
        g.fillStyle = '#e8e0cc'; // the paper both shots sit on
        g.globalAlpha = Math.pow(1 - Math.abs(1 - 2 * U.clamp(q)), 1.6);
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1 - qa;
        g.drawImage(tc, 0, 0);
        g.restore();
        const tb = SK.gfx.tmp('tB', W, H), bg = tb.getContext('2d');
        bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
        drawB(bg);
        g.save();
        g.globalAlpha = qb;
        g.drawImage(tb, 0, 0);
        g.restore();
        return;
      }
      const tc = SK.gfx.tmp('tA', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      drawA(tg);
      g.drawImage(tc, 0, 0);
      const tb = SK.gfx.tmp('tB', W, H), bg = tb.getContext('2d');
      bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
      drawB(bg);
      g.save();
      g.globalAlpha = e;
      g.drawImage(tb, 0, 0);
      g.restore();
      return;
    }
    if (type === 'dry') {
      // shot A end state with its photo fading away (the drying), then B fades in
      const tc = SK.gfx.tmp('tA', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      drawA(tg, 1 - U.clamp(q / 0.45)); // photoMix override going to 0 (dries fast)
      g.drawImage(tc, 0, 0);
      if (q > 0.45) {
        const tb = SK.gfx.tmp('tB', W, H), bg = tb.getContext('2d');
        bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
        drawB(bg);
        g.save();
        g.globalAlpha = U.ease.out((q - 0.45) / 0.55);
        g.drawImage(tb, 0, 0);
        g.restore();
      }
      return;
    }
    // masked reveals: A below, B masked on top
    const tc = SK.gfx.tmp('tA', W, H), tg = tc.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
    drawA(tg);
    g.drawImage(tc, 0, 0);
    const tb = SK.gfx.tmp('tB', W, H), bg = tb.getContext('2d');
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
    drawB(bg);
    stampMasked(g, tb, W, H, type, e, seed, (focus && focus[0]) || 0.5, (focus && focus[1]) || 0.42);
    // the wash band itself is visible while sweeping
    if (type === 'wash' && q < 1) {
      g.save();
      g.translate(W / 2, H / 2); g.rotate(-0.32); g.translate(-W / 2, -H / 2);
      const px = U.lerp(-W * 0.3, W * 1.15, e);
      const gr = g.createLinearGradient(px - W * 0.26, 0, px, 0);
      gr.addColorStop(0, 'rgba(90,80,60,0)');
      gr.addColorStop(0.8, 'rgba(90,80,60,0.16)');
      gr.addColorStop(1, 'rgba(70,60,44,0.34)');
      g.fillStyle = gr;
      g.fillRect(-W, -H, px + W * 0.3 + W, H * 3);
      g.restore();
    }
  }

  return { ph, mask, stampMasked, photo, TR, trById, transition };
})();
