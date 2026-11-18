// Cut-out stickers: pop-ins over a base photo, lineups sliding in from the sides, fan-out bursts.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  // scattered sticker spots that keep distance from each other
  const spotCache = new Map();
  function spots(n, W, H, seed, inset) {
    const key = [n, W, H, seed, inset].join('|');
    let s = spotCache.get(key);
    if (s) return s;
    const rnd = U.rng(seed * 37 + n);
    const out = [];
    const tooClose = (x, y) => out.some(o => Math.hypot(o.x - x, o.y - y) < Math.min(W, H) * 0.26);
    for (let guard = 0; guard < 400 && out.length < n; guard++) {
      const x = inset + rnd() * (W - 2 * inset), y = inset + rnd() * (H - 2 * inset);
      if (!tooClose(x, y) || guard > 200) out.push({ x, y });
    }
    while (out.length < n) out.push({ x: inset + (out.length % 3) * (W - 2 * inset) / 2, y: inset + Math.floor(out.length / 3) * (H - 2 * inset) / 2 });
    if (spotCache.size > 50) spotCache.delete(spotCache.keys().next().value);
    spotCache.set(key, out);
    return out;
  }

  CS.fx.register({
    id: 'stickers', name: 'Sticker pop-ins', family: 'sticker', slots: 3, minSlots: 2, maxSlots: 6, dur: 5,
    desc: 'Cut-out stickers pop in over a base photo (or plain background), one by one, each with a name label.',
    params: [
      select('base', 'Background', [['photo', 'Photo (slot 1)'], ['plain', 'Plain background']], 'photo'),
      range('stagger', 'Delay between stickers (s)', 0.15, 0.6, 0.05, 0.3),
      range('size', 'Sticker size', 0.12, 0.4, 0.01, 0.22),
      range('bw', 'Black & white stickers', 0, 1, 0.05, 0),
      bool('labels', 'Name labels', true),
      range('outline', 'Outline width', 0.015, 0.05, 0.002, 0.03),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      const n = Math.max(1, Math.min(slotN - 1, 5));
      if (P.base === 'photo') D.base(g, env, 0, { zoom: 0.05 * p });
      else env.bg();
      const inset = S * 0.16;
      const sp = spots(n, W, H, seed, inset);
      for (let q = 0; q < n; q++) {
        const slot = q + 1;
        const d0 = 0.2 + q * (+P.stagger || 0.3);
        const e = E.pop(U.range(t, d0, d0 + 0.5));
        if (e <= 0.02) continue;
        const [jx, jy, jr] = env.jit(slot);
        const hh = S * (+P.size) * (0.85 + 0.3 * U.h1(q * 5 + 2, seed + 7));
        const rot = U.sh(q * 9 + 4, seed) * 0.1 + jr;
        D.cutout(g, env, slot, sp[q].x + jx, sp[q].y + jy, hh, { rot, scale: e, shadow: 1.15, bw: +P.bw, rough: 0, outline: +P.outline });
        if (P.labels && env.label(slot)) {
          const le = U.range(t, d0 + 0.32, d0 + 0.55);
          if (le > 0) D.label(g, env, env.label(slot), sp[q].x, Math.min(H - S * 0.06, sp[q].y + hh * 0.66), { alpha: le, scale: E.pop(le), size: 0.034 * env.labelSize, style: env.P.labelStyle });
        }
      }
    },
  });

  CS.fx.register({
    id: 'lineup', name: 'Sticker lineup', family: 'sticker', slots: 4, minSlots: 2, maxSlots: 6, dur: 5,
    desc: 'Cut-outs slide in from the left and right and line up along the lower third.',
    params: [
      range('stagger', 'Delay between stickers (s)', 0.15, 0.6, 0.05, 0.26),
      range('size', 'Height', 0.2, 0.55, 0.01, 0.42),
      range('bw', 'Black & white', 0, 1, 0.05, 0),
      bool('labels', 'Name labels', true),
      range('outline', 'Outline width', 0.015, 0.05, 0.002, 0.03),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 6));
      const hh = H * (+P.size);
      const step = W / (n + 0.4);
      const push = 1 + 0.04 * E.inOut(p);
      g.save();
      g.translate(W / 2, H / 2); g.scale(push, push); g.translate(-W / 2, -H / 2);
      for (let k = 0; k < n; k++) {
        const d0 = 0.15 + k * (+P.stagger || 0.26);
        const e = E.outQuart(U.range(t, d0, d0 + 0.55));
        if (e <= 0) continue;
        const sgn = k % 2 ? 1 : -1;
        const tx = W * 0.5 + (k - (n - 1) / 2) * step;
        const x = tx + sgn * (1 - e) * W * 0.75;
        const [jx, jy, jr] = env.jit(k);
        const rot = U.sh(k * 9 + 4, seed) * 0.06 + jr;
        const wob = 1 + 0.04 * Math.sin(Math.PI * U.clamp((e - 0.75) / 0.25)) * (e > 0.75 ? 1 : 0);
        D.cutout(g, env, k, x + jx, H * 0.56 + jy, hh, { rot, scale: wob, shadow: 1.15, bw: +P.bw, rough: 0, outline: +P.outline });
        if (P.labels && env.label(k)) {
          const le = U.range(t, d0 + 0.5, d0 + 0.75);
          if (le > 0) D.label(g, env, env.label(k), x, H * 0.56 + hh * 0.62, { alpha: le, scale: E.pop(le), size: 0.036 * env.labelSize, style: env.P.labelStyle });
        }
      }
      g.restore();
    },
  });

  CS.fx.register({
    id: 'stickerfan', name: 'Sticker fan-out', family: 'sticker', slots: 4, minSlots: 3, maxSlots: 6, dur: 5,
    desc: 'Cut-outs burst from the centre into a ring, labels pop after.',
    params: [
      range('size', 'Height', 0.15, 0.4, 0.01, 0.24),
      range('bw', 'Black & white', 0, 1, 0.05, 0),
      bool('labels', 'Name labels', true),
      range('outline', 'Outline width', 0.015, 0.05, 0.002, 0.03),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(3, Math.min(slotN, 6));
      const e = E.outQuart(U.range(p, 0.1, 0.55));
      const R = Math.min(W, H) * 0.3;
      const spin = U.sh(seed, 3) * 0.06 * E.inOut(p);
      for (let k = 0; k < n; k++) {
        const a = spin + (k / n - 0.5) * Math.PI * 1.7 + U.sh(k * 13 + 1, seed) * 0.12;
        const cx = W / 2 + Math.sin(a) * R * e, cy = H / 2 - Math.cos(a) * R * e * 0.82;
        const [jx, jy, jr] = env.jit(k);
        const hh = S * (+P.size) * (0.85 + 0.3 * U.h1(k * 5, seed + 3)) * (0.5 + 0.5 * e);
        const rot = a + Math.PI / 2 + U.sh(k * 9 + 4, seed) * 0.1 + jr;
        D.cutout(g, env, k, cx + jx, cy + jy, hh, { rot, shadow: 1.1, bw: +P.bw, rough: 0, outline: +P.outline, scale: 1 });
        if (P.labels && env.label(k)) {
          const le = U.range(p, 0.5, 0.72);
          if (le > 0) {
            const lr = 1.16, lx = W / 2 + Math.sin(a) * R * lr, ly = H / 2 - Math.cos(a) * R * lr * 0.82;
            D.label(g, env, env.label(k), lx, ly, { alpha: le, scale: E.pop(le), size: 0.032 * env.labelSize, style: env.P.labelStyle });
          }
        }
      }
    },
  });

  const pr = CS.fx.preset;
  pr('sticker-pop', 'Stickers – pop-in', 'stickers', {}, 5, 'Cut-out stickers pop in over the photo.', 3);
  pr('sticker-lineup', 'Stickers – lineup', 'lineup', {}, 5, 'Cut-outs slide in and line up.', 4);
  pr('sticker-fan', 'Stickers – fan-out', 'stickerfan', {}, 5, 'Cut-outs burst from the centre into a ring.', 4);
})();
