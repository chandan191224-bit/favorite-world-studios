// Picture-in-picture: full photo base, corner PiP windows (pop / slide, move, grow-to-full), news side panels.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  CS.fx.register({
    id: 'photo', name: 'Full photo / video', family: 'pip', slots: 1, minSlots: 1, maxSlots: 1, dur: 4,
    desc: 'One photo or video fills the frame with a slow Ken Burns zoom. The plain building block.',
    params: [
      select('kbDir', 'Ken Burns', [['in', 'Zoom in'], ['out', 'Zoom out'], ['none', 'None']], 'in'),
      range('kb', 'Zoom amount', 0, 0.25, 0.01, 0.07),
      select('fit', 'Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture']], 'cover'),
      bool('labels', 'Show label', true),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, p, P } = env;
      env.bg();
      const kb = +P.kb || 0;
      let zoom = 0, fx = 0.5, fy = 0.42;
      if (kb) {
        const q = E.inOut(p);
        zoom = P.kbDir === 'out' ? kb * (1 - q) : P.kbDir === 'in' ? kb * q : 0;
      }
      if (P.fit === 'contain') D.photo(g, env, 0, 0, 0, W, H, { fit: 'contain' });
      else D.photo(g, env, 0, 0, 0, W, H, { zoom });
      const lb = env.label(0);
      if (P.labels && lb) {
        const a = U.clamp(p / 0.1);
        D.label(g, env, lb, S * 0.06, H - S * 0.06, { align: 'left', alpha: a, size: 0.042 * env.labelSize });
      }
    },
  });

  // pick distinct corners for k windows (seeded)
  function cornersFor(k, seed) {
    const base = [[0, 0], [1, 1], [0, 1], [1, 0]];
    const rnd = U.rng(seed * 17 + k), order = base.map((c, i) => [c, U.h1(i, seed * 31 + k)]);
    order.sort((a, b) => a[1] - b[1]);
    return order.slice(0, k).map(o => o[0]);
  }

  CS.fx.register({
    id: 'pip', name: 'Picture in picture', family: 'pip', slots: 2, minSlots: 2, maxSlots: 4, dur: 5,
    desc: 'A base photo with corner PiP windows that pop in, can swap corners, and can grow to take over the frame.',
    params: [
      select('enter', 'Windows come in', [['pop', 'Pop'], ['slide', 'Slide from the edge']], 'pop'),
      range('pipSize', 'Window size', 0.14, 0.4, 0.01, 0.26),
      select('shape', 'Window shape', [['rect', 'Rectangle'], ['rounded', 'Rounded'], ['circle', 'Circle']], 'rounded'),
      select('style', 'Window border', [['white', 'White'], ['black', 'Black'], ['shadow', 'Shadow only']], 'white'),
      bool('move', 'Swap corners mid-scene', false),
      bool('grow', 'First window grows to full', false),
      bool('labels', 'Window labels', true),
      range('kb', 'Slow zoom on the base', 0, 0.2, 0.01, 0.04),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      D.base(g, env, 0, { zoom: (+P.kb || 0) * p });
      const n = Math.max(1, Math.min(slotN - 1, 3));
      const size = +P.pipSize * S, inset = S * 0.04;
      const matte = env.mode === 'matte';
      const bcol = P.style === 'black' ? '#0b0d11' : '#fff';
      const bw = P.style === 'shadow' ? 0 : Math.max(2, S * 0.007);
      const grow = P.grow ? E.inOut(U.range(p, 0.68, 0.95)) : 0;
      const move = P.move ? E.inOut(U.range(p, 0.48, 0.75)) : 0;
      const base = cornersFor(n, seed), swapped = base.map(c => [1 - c[0], 1 - c[1]]);
      for (let k = 0; k < n; k++) {
        const slot = k + 1;
        const d0 = 0.22 + k * 0.3;
        const e = E.pop(U.range(t, d0, d0 + 0.55));
        if (P.enter === 'slide') var es = E.outQuart(U.range(t, d0, d0 + 0.55));
        const ee = P.enter === 'slide' ? es : e;
        if (ee <= 0) continue;
        // window rect (growing first window takes over the frame)
        let wx, wy, ww = size * (0.75 + 0.25 * U.h1(k, seed + 9)), wh = ww * 0.62;
        if (P.shape === 'circle') wh = ww;
        let cur = base[k];
        if (move > 0) {
          const tgt = swapped[k];
          cur = [U.lerp(base[k][0], tgt[0], move), U.lerp(base[k][1], tgt[1], move)];
        }
        if (grow > 0 && k === 0) {
          const sx = cur[0] ? W - inset - ww : inset, sy = cur[1] ? H - inset - wh : inset;
          ww = U.lerp(ww, W, grow); wh = U.lerp(wh, H, grow);
          wx = U.lerp(sx, 0, grow); wy = U.lerp(sy, 0, grow);
        } else {
          wx = cur[0] ? W - inset - ww : inset; wy = cur[1] ? H - inset - wh : inset;
          if (P.enter === 'slide') {
            const dx = cur[0] ? 1 : -1;
            wx += dx * (1 - ee) * (ww + S * 0.08);
          }
        }
        const [jx, jy] = env.jit(k + 1);
        const othersFade = (grow > 0 && k > 0) ? 1 - U.range(grow, 0.15, 0.6) : 1;
        const sc = P.enter === 'pop' && !(grow > 0 && k === 0) ? ee : 1;
        g.save();
        g.globalAlpha *= U.clamp(othersFade);
        if (sc !== 1) { g.translate(wx + ww / 2, wy + wh / 2); g.scale(Math.max(0.001, sc), Math.max(0.001, sc)); g.translate(-wx - ww / 2, -wy - wh / 2); }
        // border card behind
        const r = P.shape === 'rect' ? 0 : P.shape === 'circle' ? wh / 2 : S * 0.018;
        if (bw > 0 || matte) {
          g.save(); D.setShadow(g, env, 1.1);
          g.beginPath();
          if (P.shape === 'circle') g.arc(wx + ww / 2, wy + wh / 2, ww / 2, 0, 7);
          else U.roundRect(g, wx - bw, wy - bw, ww + bw * 2, wh + bw * 2, r + bw * 0.5);
          g.fillStyle = matte ? '#fff' : bcol; g.fill(); g.restore();
        } else { g.save(); D.setShadow(g, env, 1.1); g.fillStyle = 'rgba(0,0,0,0)'; g.restore(); }
        // photo clipped to the window
        g.save();
        g.beginPath();
        if (P.shape === 'circle') g.arc(wx + ww / 2, wy + wh / 2, ww / 2 - bw, 0, 7);
        else U.roundRect(g, wx, wy, ww, wh, Math.max(0, r - bw * 0.4));
        g.clip();
        D.photo(g, env, slot, wx, wy, ww, wh, { zoom: 0.05 * p, shadow: 0 });
        g.restore();
        g.restore();
        // label (below the window when it sits too close to the top edge)
        if (P.labels && env.label(slot) && !(grow > 0.4 && k === 0)) {
          const le = U.clamp((t - (d0 + 0.35)) / 0.3) * othersFade;
          if (le > 0) {
            let ly = wy - S * 0.026;
            if (wy < S * 0.08) ly = Math.min(H - S * 0.03, wy + wh + S * 0.028);
            D.label(g, env, env.label(slot), wx + ww / 2 + jx, ly, { alpha: le, size: 0.032 * env.labelSize });
          }
        }
      }
    },
  });

  CS.fx.register({
    id: 'panels', name: 'Side panels (news style)', family: 'pip', slots: 3, minSlots: 2, maxSlots: 4, dur: 5,
    desc: 'Base photo with narrow panels sliding in from one side, one after another.',
    params: [
      select('side', 'Panels come from', [['right', 'Right'], ['left', 'Left']], 'right'),
      range('panelW', 'Panel width', 0.16, 0.34, 0.01, 0.24),
      range('gap', 'Gap', 0.004, 0.03, 0.001, 0.008),
      bool('labels', 'Label bars', true),
      range('kb', 'Slow zoom on the base', 0, 0.2, 0.01, 0.04),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P, n: slotN } = env;
      D.base(g, env, 0, { zoom: (+P.kb || 0) * p });
      const n = Math.max(1, Math.min(slotN - 1, 3));
      const right = P.side !== 'left';
      const pw = +P.panelW * W, gap = +P.gap * S, inset = S * 0.035;
      const areaH = H - 2 * inset, ph = (areaH - gap * (n - 1)) / n;
      for (let k = 0; k < n; k++) {
        const slot = k + 1;
        const e = E.outQuart(U.range(t, 0.25 + k * 0.32, 0.25 + k * 0.32 + 0.6));
        if (e <= 0) continue;
        const py = inset + k * (ph + gap);
        let px = right ? W - inset - pw + (1 - e) * (pw + inset) : inset - (1 - e) * (pw + inset);
        const [jx, jy] = env.jit(k + 1);
        g.save();
        D.setShadow(g, env, 1.2);
        U.roundRect(g, px + jx, py + jy, pw, ph, S * 0.012);
        g.fillStyle = env.mode === 'matte' ? '#fff' : '#fff'; g.fill();
        D.noShadow(g);
        g.restore();
        D.photo(g, env, slot, px + 2 + jx, py + 2 + jy, pw - 4, ph - 4, { radius: S * 0.01, shadow: 0, zoom: 0.04 * p });
        if (P.labels && env.label(slot)) {
          const le = U.clamp((t - (0.25 + k * 0.32 + 0.5)) / 0.3);
          if (le > 0) {
            g.save(); g.globalAlpha *= le;
            const bh = S * 0.042;
            g.fillStyle = env.mode === 'matte' ? '#fff' : 'rgba(12,13,17,.82)';
            U.roundRect(g, px + jx, py + ph - bh - S * 0.012 + jy, pw, bh, S * 0.008); g.fill();
            if (env.mode !== 'matte') {
              g.fillStyle = '#fff'; g.font = `700 ${bh * 0.5}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle';
              const lab = env.label(slot); const maxw = pw - 10;
              let fs = bh * 0.5;
              g.font = `700 ${fs}px ${D.FONTS.bold}`;
              while (g.measureText(lab).width > maxw && fs > 7) { fs -= 1; g.font = `700 ${fs}px ${D.FONTS.bold}`; }
              g.fillText(lab, px + pw / 2 + jx, py + ph - bh / 2 - S * 0.012 + jy);
            }
            g.restore();
          }
        }
      }
    },
  });

  const pr = CS.fx.preset;
  pr('photo-full', 'Full photo', 'photo', {}, 4, 'One photo or video fills the frame with a slow zoom.', 1);
  pr('pip-corner-pop', 'PiP – corner pop', 'pip', {}, 5, 'A photo pops in over the corner of the main photo.', 2);
  pr('pip-grow-full', 'PiP – grows to full', 'pip', { grow: true, move: true }, 5.5, 'Corner window takes over the frame at the end.', 2);
  pr('pip-circle', 'PiP – circle window', 'pip', { shape: 'circle', style: 'white' }, 5, 'Round window pinned on the base photo.', 2);
  pr('pip-panels-news', 'PiP – side panels', 'panels', {}, 5, 'Narrow panels slide in from the right, news style.', 3);
})();
