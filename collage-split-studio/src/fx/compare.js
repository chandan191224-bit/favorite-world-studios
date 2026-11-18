// Compare A vs B: cut-out duels with a VS badge, side-panel before/after, angled wipe swap, labelled cards.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color, text } = CS.fx.P, E = U.ease;

  function badge(g, env, x, y, r, s, col, txt) {
    if (s <= 0) return;
    const matte = env.mode === 'matte';
    g.save(); g.translate(x, y); g.scale(s, s);
    D.setShadow(g, env, 1);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = matte ? '#fff' : col; g.fill();
    D.noShadow(g);
    g.lineWidth = Math.max(1.5, r * 0.12); g.strokeStyle = '#fff'; g.stroke();
    if (!matte) { g.fillStyle = '#15120a'; g.font = `900 ${r * 0.92}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt || 'VS', 0, r * 0.06); }
    g.restore();
  }

  CS.fx.register({
    id: 'vsduel', name: 'A vs B duel', family: 'compare', slots: 2, minSlots: 2, maxSlots: 2, dur: 5,
    desc: 'Two cut-outs (or framed photos) slide in from the sides, a VS badge pops between, names underneath.',
    params: [
      select('mode', 'Figures', [['cutout', 'Cut-out stickers'], ['photo', 'Framed photos']], 'cutout'),
      select('enter', 'Come in', [['slide', 'Slide from the sides'], ['pop', 'Pop in place']], 'slide'),
      bool('badge', 'VS badge', true),
      text('badgeText', 'Badge text', 'VS'),
      color('badgeColor', 'Badge colour', '#e5a93c'),
      range('gap', 'Gap between', 0.1, 0.5, 0.01, 0.3),
      bool('labels', 'Show name labels', true),
      range('bw', 'Black & white', 0, 1, 0.05, 0),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, P } = env;
      env.bg();
      const matte = env.mode === 'matte';
      const gapX = W * (0.5 - +P.gap / 2), n = 2, hgt = H * 0.62;
      const startY = [H * 0.16, H * 0.24];
      for (let k = 0; k < n; k++) {
        const sgn = k ? 1 : -1, cx = W / 2 + sgn * gapX;
        const d0 = 0.08 + k * 0.18, d1 = 0.55;
        const e = E.outQuart(U.range(t, d0, d1));
        if (e <= 0) continue;
        let x = cx, sc = 1, a = 1;
        if (P.enter === 'slide') x = cx + sgn * (1 - e) * W * 0.62;
        else { sc = 0.2 + 0.8 * E.outBack(U.range(t, d0, d1)); a = U.range(t, d0, d0 + 0.12); }
        const [jx, jy, jr] = env.jit(k);
        const src = env.src(k), asp = D.cutAspect(src);
        const hh = Math.min(hgt, W * (0.5 - +P.gap / 2) * 2 * 0.92 / Math.max(0.7, asp));
        const rot = (k ? -0.05 : 0.05) + jr;
        if (P.mode === 'photo') {
          const w = hh * 1.18;
          D.photo(g, env, k, x - w / 2 + jx, H * 0.2 + jy, w, hh, { rot, scale: sc, alpha: a, border: S * 0.008, shadow: 1.1, bw: +P.bw, fit: 'contain' });
        } else {
          D.cutout(g, env, k, x + jx, H * 0.5 + jy, hh, { rot, scale: sc, alpha: a, shadow: 1.15, bw: +P.bw, rough: 0, flip: k === 1, outline: 0.03 });
        }
        const le = U.range(t, d0 + 0.35, d0 + 0.6);
        if (P.labels !== false && le > 0) D.label(g, env, env.label(k) || (k ? 'B' : 'A'), cx, H * 0.87, { scale: E.outBack(le), alpha: le, size: 0.05 * env.labelSize, style: env.P.labelStyle });
      }
      if (P.badge !== false) {
        const bs = E.pop(U.range(t, 0.55, 1.05));
        badge(g, env, W / 2, H * 0.5, S * 0.085, bs, P.badgeColor, P.badgeText || 'VS');
      }
    },
  });

  CS.fx.register({
    id: 'abpanel', name: 'Side panel compare', family: 'compare', slots: 2, minSlots: 2, maxSlots: 2, dur: 5,
    desc: 'Photo A full frame; photo B slides over as a side panel. Tab labels BEFORE / AFTER at the top.',
    params: [
      select('side', 'Panel comes from', [['left', 'Left'], ['right', 'Right (default)']], 'right'),
      range('width', 'Panel width', 0.3, 0.7, 0.01, 0.45),
      select('edge', 'Panel edge', [['straight', 'Straight'], ['slant', 'Slanted']], 'slant'),
      select('enter', 'Entrance', [['slide', 'Slide in'], ['wipe', 'Wipe open']], 'slide'),
      bool('labels', 'Show labels', true),
      range('zoom', 'Slow zoom', 0, 0.15, 0.01, 0.05),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P } = env, right = P.side !== 'left';
      D.base(g, env, 0, { zoom: +P.zoom * p });
      const wq = +P.width, e = E.outQuart(U.range(t, 0.15, 0.85));
      const slant = P.edge === 'slant' ? S * 0.07 : 0;
      let x0;
      if (P.enter === 'slide') x0 = right ? W - wq * W * e : W * wq * (e - 1); // eased position
      else x0 = right ? W - wq * W : 0; // wipe: panel anchored, revealed by a growing clip
      const pw = wq * W, full = P.enter === 'slide' ? e : 1;
      if (full <= 0.002) return;
      g.save();
      g.beginPath();
      const ax = P.enter === 'wipe' ? (right ? W - pw * e : 0) : x0;
      const bx = ax + pw * (P.enter === 'wipe' ? (right ? 1 : e) : 1);
      if (right) { g.moveTo(ax + slant, 0); g.lineTo(bx, 0); g.lineTo(bx, H); g.lineTo(ax - slant, H); }
      else { g.moveTo(ax, 0); g.lineTo(bx - slant, 0); g.lineTo(bx + slant, H); g.lineTo(ax, H); }
      g.closePath();
      if (env.mode !== 'matte' && e > 0.02 && e < 0.99) { g.save(); D.setShadow(g, env, 1.4); g.fillStyle = '#000'; g.fill(); g.restore(); }
      g.clip();
      D.photo(g, env, 1, ax - slant, 0, pw + slant * 2, H, { zoom: +P.zoom * p });
      g.restore();
      if (P.labels) {
        const la = env.label(0) || 'BEFORE', lb = env.label(1) || 'AFTER';
        const a0 = U.range(t, 0.05, 0.3);
        if (a0 > 0) {
          const lx = right ? S * 0.05 : W - S * 0.05;
          D.label(g, env, la, lx, S * 0.07, { align: right ? 'left' : 'right', alpha: a0, size: 0.04 * env.labelSize });
        }
        const a1 = U.range(t, 0.75, 1.0);
        if (a1 > 0 && e > 0.6) {
          const cx = right ? W - pw / 2 : pw / 2;
          D.label(g, env, lb, cx, S * 0.07, { alpha: a1 * U.range(e, 0.6, 0.85), size: 0.04 * env.labelSize });
        }
      }
    },
  });

  CS.fx.register({
    id: 'abswap', name: 'Angled wipe compare', family: 'compare', slots: 2, minSlots: 2, maxSlots: 2, dur: 4.5,
    desc: 'Photo B wipes over photo A along an angled line, a bright edge line rides the sweep.',
    params: [
      range('edgeAngle', 'Edge slant', -0.15, 0.15, 0.01, 0.06),
      bool('swapBack', 'Sweep back at the end', false),
      bool('labels', 'Show labels', true),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, p, t, P } = env;
      D.base(g, env, 0, { zoom: 0.04 * p });
      let q;
      if (P.swapBack) q = p < 0.55 ? E.inOut(U.range(p, 0.1, 0.5)) : 1 - E.inOut(U.range(p, 0.68, 0.93));
      else q = E.inOut(U.range(p, 0.1, 0.55));
      const sl = +P.edgeAngle * W;
      g.save();
      g.beginPath(); g.moveTo(q * W - sl, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(q * W + sl, H); g.closePath(); g.clip();
      D.photo(g, env, 1, 0, 0, W, H, { zoom: 0.04 * p });
      g.restore();
      if (q > 0.02 && q < 0.98 && p < 0.97) {
        g.save(); D.setShadow(g, env, 0.8);
        g.fillStyle = env.mode === 'matte' ? '#fff' : '#fff';
        g.beginPath(); g.moveTo(q * W - sl, 0); g.lineTo(q * W + sl, H);
        g.lineWidth = S * 0.005; g.strokeStyle = g.fillStyle; g.stroke(); g.restore();
      }
      if (P.labels) {
        const a = U.clamp(p / 0.08);
        const la = env.label(0) || 'BEFORE', lb = env.label(1) || 'AFTER';
        if (q > 0.14) D.label(g, env, la, S * 0.05, S * 0.07, { align: 'left', alpha: a * U.range(q, 0.14, 0.24), size: 0.04 * env.labelSize });
        if (q < 0.86) D.label(g, env, lb, W - S * 0.05, S * 0.07, { align: 'right', alpha: a * U.range(1 - q, 0.14, 0.24), size: 0.04 * env.labelSize });
      }
    },
  });

  CS.fx.register({
    id: 'comparecards', name: 'Compare cards', family: 'compare', slots: 2, minSlots: 2, maxSlots: 2, dur: 4.5,
    desc: 'Two labelled white cards drop onto paper, one photo in each.',
    params: [
      select('arrange', 'Arrangement', [['side', 'Side by side'], ['stacked', 'Stacked']], 'side'),
      range('cardGap', 'Gap', 0.02, 0.12, 0.005, 0.05),
      range('photo', 'Photo height', 0.4, 0.75, 0.05, 0.58),
    ],
    look: { bg: 'kraft', drift: 0.3 },
    draw(g, env) {
      const { W, H, S, t, p, P } = env, matte = env.mode === 'matte';
      env.bg();
      const side = P.arrange !== 'stacked';
      const cw = side ? W * (0.5 - +P.cardGap / 2) * 0.82 : W * 0.56, ch = H * (side ? 0.66 : 0.4);
      const gq = 1 + 0.045 * E.inOut(p); // gentle group push after the cards land
      g.save();
      g.translate(W / 2, H / 2); g.scale(gq, gq); g.translate(-W / 2, -H / 2);
      for (let k = 0; k < 2; k++) {
        const e = E.outBack(U.range(t, 0.1 + k * env.dur * 0.22, 0.1 + k * env.dur * 0.22 + env.dur * 0.26));
        if (e <= 0) continue;
        const rot = (k ? 1 : -1) * 0.035;
        const cx = side ? W * (k ? 0.75 - +P.cardGap / 2 : 0.25 + +P.cardGap / 2) : W * 0.5;
        const cy = side ? H * 0.5 : H * (k ? 0.72 : 0.28);
        const [jx, jy] = env.jit(k);
        const sc = 0.4 + 0.6 * e;
        g.save();
        g.translate(cx + jx, cy + jy + (1 - e) * -H * 0.25); g.rotate(rot); g.scale(sc, sc);
        D.setShadow(g, env, 1.2);
        U.roundRect(g, -cw / 2, -ch / 2, cw, ch, S * 0.02);
        g.fillStyle = matte ? '#fff' : '#fdfcf7'; g.fill(); D.noShadow(g);
        if (!matte) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.stroke(); }
        const ph = ch * +P.photo, py = -ch / 2 + (ch - ph) * 0.42;
        D.photo(g, env, k, -cw / 2 + S * 0.02, py, cw - S * 0.04, ph, { radius: S * 0.012, shadow: 0 });
        if (!matte) {
          const lab = env.label(k) || (k ? 'B' : 'A');
          g.fillStyle = '#26241f'; g.font = `800 ${S * 0.042}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(lab, 0, py + ph + (ch / 2 - (py + ph)) / 2);
        }
        g.restore();
      }
      g.restore();
    },
  });

  const pr = CS.fx.preset;
  pr('vs-duel', 'A vs B – cut-out duel', 'vsduel', { mode: 'cutout' }, 5, 'Two cut-outs face off with a VS badge — type the two names in the photo slots.', 2);
  pr('vs-duel-photos', 'A vs B – photos', 'vsduel', { mode: 'photo', gap: 0.36 }, 5, 'Same duel with framed photos.', 2);
  pr('ab-panel', 'Before / after – side panel', 'abpanel', {}, 5, 'The after photo slides over as a side panel with tab labels.', 2);
  pr('ab-swap', 'Compare – angled wipe', 'abswap', {}, 4.5, 'B wipes over A along an angled line.', 2);
  pr('compare-cards', 'Compare – two cards', 'comparecards', {}, 4.5, 'Two labelled cards drop onto paper.', 2);
})();
