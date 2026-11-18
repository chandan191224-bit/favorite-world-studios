// Split screens (2/3/4-way, diagonal), split-push (full frame splits into panels), compare A vs B, before/after slider.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  const LAYOUTS = {
    v2: [[[0, 0], [0.5, 0], [0.5, 1], [0, 1]], [[0.5, 0], [1, 0], [1, 1], [0.5, 1]]],
    h2: [[[0, 0], [1, 0], [1, 0.5], [0, 0.5]], [[0, 0.5], [1, 0.5], [1, 1], [0, 1]]],
    diag2: [[[0, 0], [0.6, 0], [0.4, 1], [0, 1]], [[0.6, 0], [1, 0], [1, 1], [0.4, 1]]],
    v3: [0, 1, 2].map(k => [[k / 3, 0], [(k + 1) / 3, 0], [(k + 1) / 3, 1], [k / 3, 1]]),
    h3: [0, 1, 2].map(k => [[0, k / 3], [1, k / 3], [1, (k + 1) / 3], [0, (k + 1) / 3]]),
    diag3: [[[0, 0], [0.4, 0], [0.27, 1], [0, 1]], [[0.4, 0], [0.73, 0], [0.6, 1], [0.27, 1]], [[0.73, 0], [1, 0], [1, 1], [0.6, 1]]],
    grid4: [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]].map(([x, y]) => [[x, y], [x + 0.5, y], [x + 0.5, y + 0.5], [x, y + 0.5]]),
    l3: [[[0, 0], [0.6, 0], [0.6, 1], [0, 1]], [[0.6, 0], [1, 0], [1, 0.5], [0.6, 0.5]], [[0.6, 0.5], [1, 0.5], [1, 1], [0.6, 1]]],
  };
  const LAYOUT_NAMES = [['v2', '2 side by side'], ['h2', '2 top / bottom'], ['diag2', '2 diagonal'], ['v3', '3 columns'], ['h3', '3 rows'], ['diag3', '3 diagonal'], ['grid4', '4 (2 × 2)'], ['l3', '1 big + 2 small']];

  function bboxOf(poly) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0, y0, x1, y1];
  }
  function vsBadge(g, env, x, y, r, s) {
    if (s <= 0) return;
    g.save(); g.translate(x, y); g.scale(s, s);
    D.setShadow(g, env, 1);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = env.mode === 'matte' ? '#fff' : '#e5a93c'; g.fill();
    D.noShadow(g);
    g.lineWidth = r * 0.12; g.strokeStyle = '#fff'; g.stroke();
    if (env.mode !== 'matte') { g.fillStyle = '#15120a'; g.font = `900 ${r * 0.9}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(env.P.vsText || 'VS', 0, r * 0.06); }
    g.restore();
  }

  CS.fx.register({
    id: 'split', name: 'Split screen', family: 'split', slots: 2, maxSlots: 4, dur: 5,
    desc: '2, 3 or 4 panels (side by side, rows, diagonal, 2×2) that slide, grow or wipe in. Labels and a VS badge optional.',
    params: [
      select('layout', 'Layout', LAYOUT_NAMES, 'v2'),
      select('enter', 'Panels come in', [['slide', 'Slide in from the sides'], ['grow', 'Grow from centre'], ['wipe', 'Wipe open'], ['none', 'Already there']], 'slide'),
      range('enterDur', 'Entrance length (s)', 0.2, 2, 0.05, 0.7),
      range('stagger', 'Delay between panels (s)', 0, 1, 0.05, 0.18),
      range('gap', 'Gap / divider', 0, 0.03, 0.001, 0.006),
      color('gapColor', 'Divider colour', '#ffffff'),
      select('badge', 'Centre badge', [['none', 'None'], ['vs', 'VS badge']], 'none'),
      bool('labels', 'Show labels', true),
      range('kb', 'Slow zoom inside panels', 0, 0.3, 0.01, 0.06),
      select('ease', 'Motion', Object.entries(U.EASE_NAMES), 'outQuart'),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, P, t } = env, polys = LAYOUTS[P.layout] || LAYOUTS.v2, ez = E[P.ease] || E.outQuart;
      env.bg();
      const n = polys.length, d = +P.enterDur || 0.7;
      polys.forEach((poly, k) => {
        const e = P.enter === 'none' ? 1 : ez(U.clamp((t - 0.05 - k * (+P.stagger || 0)) / d));
        if (e <= 0) return;
        const [x0, y0, x1, y1] = bboxOf(poly), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        let dx = cx - 0.5, dy = cy - 0.5;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) { dy = k % 2 ? -0.5 : 0.5; dx = 0; }
        const horiz = Math.abs(dx) >= Math.abs(dy);
        g.save();
        let ox = 0, oy = 0, sc = 1;
        if (P.enter === 'slide') { if (horiz) ox = Math.sign(dx) * (1 - e) * W * (x1 - x0 + 0.1); else oy = Math.sign(dy) * (1 - e) * H * (y1 - y0 + 0.1); }
        if (P.enter === 'grow') sc = e;
        const [jx, jy] = env.jit(k);
        g.translate(cx * W + ox + jx, cy * H + oy + jy); g.scale(sc, sc); g.translate(-cx * W, -cy * H);
        g.beginPath();
        if (P.enter === 'wipe') {
          // reveal along the panel's long axis
          const wx0 = x0 * W, wy0 = y0 * H, ww = (x1 - x0) * W, hh = (y1 - y0) * H;
          if (horiz) g.rect(dx < 0 ? wx0 + ww * (1 - e) : wx0, wy0, ww * e, hh); else g.rect(wx0, dy < 0 ? wy0 + hh * (1 - e) : wy0, ww, hh * e);
          g.clip(); g.beginPath();
        }
        poly.forEach(([x, y], j) => (j ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
        g.closePath(); g.save(); g.clip();
        D.photo(g, env, k, x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H, { zoom: (+P.kb || 0) * env.p });
        g.restore();
        if (+P.gap > 0) { g.lineWidth = +P.gap * S * 2; g.strokeStyle = env.mode === 'matte' ? '#fff' : P.gapColor; g.stroke(); }
        g.restore();
        if (P.labels && env.label(k)) {
          const le = U.clamp((t - 0.25 - k * (+P.stagger || 0) - d * 0.6) / 0.35);
          if (le > 0) D.label(g, env, env.label(k), cx * W, Math.min(y1 * H - S * 0.09, (y0 + (y1 - y0) * 0.86) * H), { scale: E.outBack(le), alpha: le, size: 0.048 * env.labelSize });
        }
      });
      if (P.badge === 'vs') vsBadge(g, env, W / 2, H / 2, S * 0.085, E.pop(U.clamp((t - 0.25 - n * (+P.stagger || 0) - d) / 0.6)));
    },
  });

  // Full frame splits into panels: each new panel pushes in and the others make room (the classic explainer "split push")
  CS.fx.register({
    id: 'splitpush', name: 'Split push (full → panels)', family: 'split', slots: 3, minSlots: 2, maxSlots: 4, dur: 6,
    desc: 'Starts full screen, then each next photo pushes in from the side and the frame splits to make room.',
    params: [
      select('dir', 'Direction', [['h', 'Side by side'], ['v', 'Top to bottom']], 'h'),
      range('every', 'New panel every (s)', 0.4, 4, 0.05, 1.3),
      range('move', 'Push length (s)', 0.2, 2, 0.05, 0.7),
      range('gap', 'Gap / divider', 0, 0.03, 0.001, 0.005),
      color('gapColor', 'Divider colour', '#ffffff'),
      bool('labels', 'Show labels', true),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, P, t } = env, n = Math.max(2, env.n), horiz = P.dir !== 'v';
      env.bg();
      const wts = Array.from({ length: n }, (_, k) => (k === 0 ? 1 : E.inOut(U.clamp((t - 0.3 - (k - 1) * P.every) / P.move))));
      const sum = wts.reduce((a, b) => a + b, 0);
      let acc = 0;
      wts.forEach((w, k) => {
        const f = w / sum, a = acc; acc += f;
        if (f < 0.002) return;
        const x = horiz ? a * W : 0, y = horiz ? 0 : a * H, ww = horiz ? f * W : W, hh = horiz ? H : f * H;
        D.photo(g, env, k, x, y, ww, hh, { zoom: 0.04 * env.p });
        if (k && +P.gap > 0 && env.mode !== 'matte') { g.fillStyle = P.gapColor; if (horiz) g.fillRect(x - P.gap * S, 0, P.gap * S * 2, H); else g.fillRect(0, y - P.gap * S, W, P.gap * S * 2); }
        if (P.labels && env.label(k) && w > 0.6) D.label(g, env, env.label(k), x + ww / 2, y + hh - S * 0.09, { alpha: U.range(w, 0.6, 1), size: 0.045 * env.labelSize });
      });
    },
  });

  // Before / after slider
  CS.fx.register({
    id: 'beforeafter', name: 'Before / after slider', family: 'compare', slots: 2, dur: 5,
    desc: 'Photo 1 (before) and photo 2 (after) in the same frame, a handle slides across to compare. Use two pictures with the same framing.',
    params: [
      select('motion', 'Handle moves', [['sweep', 'Sweep across (reveal after)'], ['pingpong', 'Middle → left → right → middle'], ['half', 'Slide to the middle and hold']], 'pingpong'),
      select('dir', 'Direction', [['h', 'Left / right'], ['v', 'Top / bottom']], 'h'),
      select('handle', 'Handle', [['circle', 'Line + round handle'], ['line', 'Line only']], 'circle'),
      color('lineColor', 'Line colour', '#ffffff'),
      bool('labels', 'Show BEFORE / AFTER labels', true),
    ],
    look: { bg: 'black', drift: 0 },
    draw(g, env) {
      const { W, H, S, P, p } = env, horiz = P.dir !== 'v';
      const keys = { sweep: [[0, 0.02], [0.12, 0.02], [0.8, 0.98], [1, 0.98]], pingpong: [[0, 0.5], [0.1, 0.5], [0.32, 0.12], [0.62, 0.88], [0.82, 0.5], [1, 0.5]], half: [[0, 0.98], [0.12, 0.98], [0.5, 0.5], [1, 0.5]] }[P.motion] || [[0, 0.5], [1, 0.5]];
      let pos = keys[keys.length - 1][1];
      for (let k = 0; k < keys.length - 1; k++) if (p >= keys[k][0] && p <= keys[k + 1][0]) { pos = U.lerp(keys[k][1], keys[k + 1][1], E.inOut(U.range(p, keys[k][0], keys[k + 1][0]))); break; }
      // "before" = slot 0 on the left/top, "after" = slot 1
      D.photo(g, env, 1, 0, 0, W, H);
      g.save(); g.beginPath(); if (horiz) g.rect(0, 0, pos * W, H); else g.rect(0, 0, W, pos * H); g.clip();
      D.photo(g, env, 0, 0, 0, W, H); g.restore();
      const lc = env.mode === 'matte' ? '#fff' : P.lineColor, lw = S * 0.006;
      g.save(); D.setShadow(g, env, 0.6); g.fillStyle = lc;
      if (horiz) g.fillRect(pos * W - lw / 2, 0, lw, H); else g.fillRect(0, pos * H - lw / 2, W, lw);
      if (P.handle === 'circle') {
        const hx = horiz ? pos * W : W / 2, hy = horiz ? H / 2 : pos * H, r = S * 0.045;
        g.beginPath(); g.arc(hx, hy, r, 0, 7); g.fillStyle = lc; g.fill(); D.noShadow(g);
        g.fillStyle = env.mode === 'matte' ? '#fff' : '#1a1c22';
        g.save(); g.translate(hx, hy); if (!horiz) g.rotate(Math.PI / 2);
        for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(sgn * r * 0.62, 0); g.lineTo(sgn * r * 0.2, -r * 0.32); g.lineTo(sgn * r * 0.2, r * 0.32); g.closePath(); g.fill(); }
        g.restore();
      }
      g.restore();
      if (P.labels) {
        const a = U.clamp(p / 0.08), m = S * 0.05;
        const la = env.label(0) || 'BEFORE', lb = env.label(1) || 'AFTER';
        if (horiz) { if (pos > 0.12) D.label(g, env, la, m, m * 1.4, { align: 'left', alpha: a * U.range(pos, 0.12, 0.2), size: 0.04 * env.labelSize }); if (pos < 0.88) D.label(g, env, lb, W - m, m * 1.4, { align: 'right', alpha: a * U.range(1 - pos, 0.12, 0.2), size: 0.04 * env.labelSize }); }
        else { if (pos > 0.12) D.label(g, env, la, W / 2, m * 1.4, { alpha: a, size: 0.04 * env.labelSize }); if (pos < 0.88) D.label(g, env, lb, W / 2, H - m * 1.4, { alpha: a, size: 0.04 * env.labelSize }); }
      }
    },
  });

  const pr = CS.fx.preset;
  pr('split-2-slide', 'Split 2 – slide in', 'split', { layout: 'v2', enterDur: 1.1, kb: 0.12 }, 5, 'Two photos side by side, sliding in from left and right.');
  pr('split-2-diagonal', 'Split 2 – diagonal', 'split', { layout: 'diag2', enter: 'slide', gap: 0.007 }, 5, 'Angled divider, panels slide in.');
  pr('split-2-rows', 'Split 2 – top / bottom', 'split', { layout: 'h2', enter: 'wipe', enterDur: 1.3, stagger: 0.3, kb: 0.12 }, 5, 'Rows that wipe open.');
  pr('split-3-columns', 'Split 3 – columns', 'split', { layout: 'v3', enter: 'slide', stagger: 0.22 }, 5, 'Three columns, one after another.', 3);
  pr('split-3-diagonal', 'Split 3 – diagonal', 'split', { layout: 'diag3', enter: 'wipe', stagger: 0.2, gap: 0.006 }, 5, 'Three slanted panels.', 3);
  pr('split-big-small', 'Split – 1 big + 2 small', 'split', { layout: 'l3', enter: 'grow', stagger: 0.2 }, 5, 'Main photo plus two supporting ones.', 3);
  pr('split-4-grid', 'Split 4 – 2 × 2', 'split', { layout: 'grid4', enter: 'grow', enterDur: 1.1, stagger: 0.22, gap: 0.005, kb: 0.1 }, 5, 'Four panels growing in.', 4);
  pr('vs-compare', 'Compare A vs B (VS badge)', 'split', { layout: 'v2', enter: 'slide', badge: 'vs', labelStyle: 'tag', gap: 0.004 }, 5, 'A vs B with labels (type them in each photo slot) and a VS badge.');
  pr('vs-diagonal', 'Compare – diagonal VS', 'split', { layout: 'diag2', enter: 'slide', badge: 'vs', labelStyle: 'pill', gap: 0.006, gapColor: '#e5a93c' }, 5, 'Diagonal A vs B with an amber divider.');
  pr('split-push-3', 'Split push – full → 3', 'splitpush', { dir: 'h', every: 1.5, move: 0.9 }, 6, 'Starts full screen, next photos push in and split the frame.', 3);
  pr('split-push-2v', 'Split push – full → 2 rows', 'splitpush', { dir: 'v', every: 2.2, move: 1.0 }, 5, 'Second photo pushes up from below.', 2);
  pr('before-after', 'Before / after – slider', 'beforeafter', { motion: 'pingpong' }, 5, 'Handle goes left, right, back to the middle.');
  pr('before-after-sweep', 'Before / after – one sweep', 'beforeafter', { motion: 'sweep', handle: 'line' }, 4, 'A clean line sweeps across to reveal the after picture.');
  pr('before-after-vertical', 'Before / after – vertical', 'beforeafter', { motion: 'half', dir: 'v' }, 4, 'Top/bottom compare, settles in the middle.');
})();
