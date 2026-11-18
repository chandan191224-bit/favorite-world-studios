// Polaroids: dealt from a deck then fanned, one slamming down with a self-writing caption, fan spreads.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  // draw a polaroid card centred at cx,cy with photo w x ph and a thick bottom band
  function polaroid(g, env, i, cx, cy, w, ph, o = {}) {
    const matte = env.mode === 'matte', S = env.S;
    const band = ph * 0.26, bw = w * 0.055;
    const hh = ph + band + bw, ww = w + bw * 2;
    g.save();
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    g.translate(cx, cy);
    if (o.rot) g.rotate(o.rot);
    if (o.scale != null && o.scale !== 1) g.scale(o.scale, o.scale);
    D.setShadow(g, env, o.shadow != null ? o.shadow : 1.2);
    U.roundRect(g, -ww / 2, -hh / 2, ww, hh, S * 0.008);
    g.fillStyle = matte ? '#fff' : '#f8f7f2'; g.fill();
    D.noShadow(g);
    if (!matte) { g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; g.stroke(); }
    D.photo(g, env, i, -w / 2, -hh / 2 + bw, w, ph, { shadow: 0, bw: o.bw || 0 });
    // caption in the bottom band
    const cap = env.label(i);
    if (cap && !matte) {
      let fs = band * 0.42;
      g.font = `600 ${fs}px ${D.FONTS.hand}`;
      while (g.measureText(cap).width > w * 0.94 && fs > 8) { fs -= 1; g.font = `600 ${fs}px ${D.FONTS.hand}`; }
      g.fillStyle = '#232323'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(cap, 0, ph + bw + band * 0.52);
    }
    g.restore();
    return { w: ww, h: hh };
  }

  // seeded target spots for dealt cards (small scatter, controlled overlap)
  const dealCache = new Map();
  function dealSpots(n, W, H, seed) {
    const key = [n, W, H, seed].join('|');
    let s = dealCache.get(key);
    if (s) return s;
    const rnd = U.rng(seed * 41 + n);
    s = Array.from({ length: n }, (_, k) => {
      const cx = W * (0.5 + (rnd() - 0.5) * 0.34), cy = H * (0.48 + (rnd() - 0.5) * 0.22);
      return { cx, cy, rot: (rnd() - 0.5) * 0.34 };
    });
    if (dealCache.size > 40) dealCache.delete(dealCache.keys().next().value);
    dealCache.set(key, s);
    return s;
  }

  CS.fx.register({
    id: 'deal', name: 'Polaroids – deal + fan', family: 'polaroid', slots: 4, minSlots: 2, maxSlots: 6, dur: 6,
    desc: 'Polaroids are dealt from a deck in the corner one by one, then the stack fans out.',
    params: [
      range('stagger', 'Delay between cards (s)', 0.15, 0.6, 0.05, 0.28),
      bool('fan', 'Fan out at the end', true),
      range('bw', 'Black & white photos', 0, 1, 0.05, 0),
      range('size', 'Card size', 0.3, 0.6, 0.02, 0.44),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 6));
      const spots = dealSpots(n, W, H, seed);
      const ph = H * (+P.size) * 0.62, pw = ph * 0.98;
      const deckX = W * 0.9, deckY = H * 1.02;
      const dealt = Math.min(n, Math.max(0, Math.floor(U.range(t, 0.1, 0.1 + n * (+P.stagger || 0.28)) * n) + (U.range(t, 0.1, 0.1 + n * (+P.stagger || 0.28)) > 0 ? 1 : 0)));
      // the deck in the corner
      const deckLeft = Math.max(0, n - 1 - Math.floor(U.range(t, 0.1, 0.1 + n * (+P.stagger || 0.28)) * n));
      if (deckLeft > 0 && p < 0.7) {
        for (let q = deckLeft - 1; q >= 0; q--) {
          g.save(); g.globalAlpha *= 0.9;
          U.roundRect(g, deckX - pw / 2 - q * 2, deckY - ph * 0.75 - q * 2, pw + pw * 0.11 * 2, ph * 1.28 + ph * 0.26, S * 0.008);
          g.fillStyle = env.mode === 'matte' ? '#fff' : '#efece3'; g.fill(); g.restore();
        }
      }
      const fq = P.fan ? E.inOut(U.range(p, 0.72, 0.93)) : 0;
      for (let k = 0; k < n; k++) {
        const d0 = 0.14 + k * (+P.stagger || 0.28);
        const e = E.outQuart(U.range(t, d0, d0 + 0.5));
        if (e <= 0) break; // dealt in order
        const sp = spots[k];
        const x = U.lerp(deckX, sp.cx, e), y = U.lerp(deckY, sp.cy, e);
        const rot = U.lerp(-0.14, sp.rot, E.outBack(Math.min(1, e * 1.2)));
        // fan target
        let fx = sp.cx, fy = sp.cy, frot = sp.rot;
        if (fq > 0) {
          const spread = (k - (n - 1) / 2);
          fx = W / 2 + spread * W * 0.16 * (n > 3 ? 1 : 0.7);
          fy = H * 0.5 + Math.abs(spread) * H * 0.04;
          frot = spread * 0.16;
        }
        polaroid(g, env, k, U.lerp(x, fx, fq), U.lerp(y, fy, fq), pw, ph, {
          rot: U.lerp(rot, frot, fq), shadow: 1.2, bw: +P.bw, scale: 0.92 + 0.08 * e,
        });
      }
    },
  });

  CS.fx.register({
    id: 'slam', name: 'Polaroid slam', family: 'polaroid', slots: 1, minSlots: 1, maxSlots: 2, dur: 3.5,
    desc: 'A polaroid slams down and the caption writes itself.',
    params: [
      range('bw', 'Black & white photo', 0, 1, 0.05, 0),
      range('size', 'Card size', 0.4, 0.8, 0.02, 0.62),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed } = env;
      env.bg();
      const n = Math.min(env.n, 2);
      for (let k = 0; k < n; k++) {
        const d0 = k === 0 ? 0.05 : 0.55;
        const e = E.slam(U.range(t, d0, d0 + 0.5));
        if (e <= 0) continue;
        const ph = H * (+P.size) * 0.6, pw = ph * 0.98;
        const cx = W * (k ? 0.68 : 0.44), cy = H * (k ? 0.6 : 0.48);
        const rot0 = k ? 0.22 : -0.16;
        polaroid(g, env, k, cx, cy, pw, ph, { rot: U.lerp(rot0 * 3, rot0, e), scale: U.lerp(2.3, 1, e), shadow: 0.4 + 1 * e, bw: +P.bw });
        // caption writes itself after the slam
        const cap = env.label(k);
        if (cap && e >= 1) {
          const wq = U.range(t, d0 + 0.55, d0 + 1.35);
          if (wq > 0) {
            const chars = Math.max(1, Math.round(cap.length * wq));
            const shown = cap.slice(0, chars);
            const band = ph * 0.26, bw = pw * 0.055;
            g.save();
            g.translate(cx, cy); g.rotate(rot0);
            let fs = band * 0.42;
            g.font = `600 ${fs}px ${D.FONTS.hand}`;
            while (g.measureText(shown).width > pw * 0.94 && fs > 8) { fs -= 1; g.font = `600 ${fs}px ${D.FONTS.hand}`; }
            g.fillStyle = '#232323'; g.textAlign = 'center'; g.textBaseline = 'middle';
            if (env.mode !== 'matte') g.fillText(shown, 0, ph * 0.3 + band * 0.52);
            // underline grows with the writing
            if (env.mode !== 'matte') { g.strokeStyle = 'rgba(35,35,35,.55)'; g.lineWidth = Math.max(1, S * 0.002); g.beginPath(); g.moveTo(-pw * 0.42 * wq, ph * 0.3 + band * 0.88); g.lineTo(pw * 0.42 * wq, ph * 0.3 + band * 0.88); g.stroke(); }
            g.restore();
          }
        }
      }
    },
  });

  CS.fx.register({
    id: 'fan', name: 'Polaroids – fan spread', family: 'polaroid', slots: 4, minSlots: 3, maxSlots: 6, dur: 6,
    desc: 'A stack of polaroids fans out across the lower half; one card lifts forward.',
    params: [
      range('pick', 'Card that lifts forward', 1, 6, 1, 1),
      range('bw', 'Black & white photos', 0, 1, 0.05, 0),
      range('size', 'Card size', 0.3, 0.55, 0.02, 0.4),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(3, Math.min(slotN, 6));
      const ph = H * (+P.size) * 0.62, pw = ph * 0.98;
      const pick = Math.max(0, Math.min(n - 1, Math.round(+P.pick) - 1));
      const fq = E.inOut(U.range(p, 0.06, 0.55));
      const lift = E.inOut(U.range(p, 0.68, 0.93));
      // arc pivot above the frame centre
      const px = W * 0.5, py = -H * 0.55, R = H * 1.18;
      for (let k = 0; k < n; k++) {
        // stacked start fully off-frame at the bottom-left
        const sx = W * 0.1, sy = H * 1.25, srot = -0.32;
        const ang = U.lerp(-0.62, 0.62, n === 1 ? 0.5 : k / (n - 1));
        let tx = px + Math.sin(ang) * R * 0.55, ty = py + Math.cos(-ang * 0.9) * 0 + Math.cos(ang) * R;
        ty = Math.min(H * 0.62, ty);
        tx = U.clamp(tx, W * 0.12, W * 0.88);
        const trot = ang * 0.42;
        let cx = U.lerp(sx, tx, fq), cy = U.lerp(sy, ty, fq), rot = U.lerp(srot, trot, fq), sc = 1, shadow = 1.15;
        if (k === pick && lift > 0) {
          cx = U.lerp(cx, W * 0.5, lift); cy = U.lerp(cy, H * 0.46, lift);
          rot = U.lerp(rot, 0, lift); sc = 1 + 0.55 * lift; shadow = 1.15 + 0.5 * lift;
        }
        polaroid(g, env, k, cx, cy, pw, ph, { rot, scale: sc, shadow, bw: +P.bw, alpha: 1 });
      }
    },
  });

  const pr = CS.fx.preset;
  pr('polaroid-deal-fan', 'Polaroids – deal + fan', 'deal', {}, 6, 'Polaroids dealt from the deck, then fanned out.', 4);
  pr('polaroid-slam', 'Polaroid – slam', 'slam', {}, 3.5, 'One polaroid slams down, caption writes itself.', 1);
  pr('polaroid-fan-spread', 'Polaroids – fan spread', 'fan', {}, 6, 'A stack fans out; one card lifts forward.', 4);
})();
