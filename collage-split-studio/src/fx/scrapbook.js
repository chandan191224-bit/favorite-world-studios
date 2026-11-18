// The Johnny Harris / Vox scrapbook collage: cut-out photos with white outlines on kraft paper, scraps,
// halftone print dots, 12 fps stop-motion jitter, physical slide-in entrances, chaos-to-order.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  // deterministic scatter arrangement: loose grid + jittered centres, sorted big-first (behind)
  const layoutCache = new Map();
  function scatter(n, W, H, seed, spread, maxRot) {
    const key = [n, W, H, seed, spread, maxRot].join('|');
    let L = layoutCache.get(key);
    if (L) return L;
    const rnd = U.rng(seed * 31 + n * 7);
    const [rows, cols] = U.gridFor(n, W * 0.86, H * 0.8);
    const items = [];
    for (let k = 0; k < n; k++) {
      const r = Math.floor(k / cols), c = k % cols;
      const cw = (W * 0.86) / cols, chh = (H * 0.8) / rows;
      const cx = W * 0.07 + cw * (c + 0.5) + (rnd() - 0.5) * cw * 0.55 * spread;
      const cy = H * 0.1 + chh * (r + 0.5) + (rnd() - 0.5) * chh * 0.5 * spread;
      const sc = 0.85 + rnd() * 0.35;
      const rot = (rnd() - 0.5) * 2 * maxRot * Math.PI / 180;
      const h = chh * 0.92 * sc * (rows > 1 ? 1.02 : 1.15);
      const d = Math.hypot(cx - W / 2, cy - H / 2);
      items.push({ k, cx, cy, sc, rot, h, d });
    }
    // the most central photo gets a boost (hero)
    items.sort((a, b) => a.d - b.d);
    if (items.length) { items[0].h *= 1.16; items[0].sc *= 1.1; }
    items.sort((a, b) => b.h - a.h); // big ones draw first (behind)
    if (layoutCache.size > 50) layoutCache.delete(layoutCache.keys().next().value);
    layoutCache.set(key, items);
    return items;
  }

  // tidy target row(s): equal heights, even spacing, no rotation
  function tidyRow(n, W, H) {
    const rows = n > 5 ? 2 : 1, per = Math.ceil(n / rows);
    const h = (rows === 1 ? H * 0.42 : H * 0.34);
    return Array.from({ length: n }, (_, k) => {
      const r = Math.floor(k / per), c = k % per, inRow = Math.min(per, n - r * per);
      return { cx: W * (0.5 + (c - (inRow - 1) / 2) * (0.82 / Math.max(3, inRow - 1 || 1)) * (inRow / per)), cy: rows === 1 ? H * 0.48 : H * (r === 0 ? 0.33 : 0.72), h, rot: 0 };
    });
  }

  CS.fx.register({
    id: 'scrap', name: 'Scrapbook collage', family: 'scrapbook', slots: 5, minSlots: 2, maxSlots: 8, dur: 6,
    desc: 'Cut-out photos with white outlines fly onto kraft paper one by one — the classic explainer opener.',
    params: [
      select('style', 'Photo style', [['cutout', 'Cut-outs with white outline'], ['rough', 'Hand-cut photos'], ['photo', 'Plain photos']], 'cutout'),
      range('spread', 'Scatter', 0, 1, 0.05, 0.7),
      range('rot', 'Max tilt (deg)', 0, 10, 0.5, 5),
      range('bw', 'Black & white', 0, 1, 0.05, 0),
      range('stagger', 'Delay between photos (s)', 0.1, 0.5, 0.05, 0.22),
      bool('scraps', 'Paper scraps behind', true),
      bool('halftone', 'Halftone print dots', false),
      bool('labels', 'Hand-written labels', true),
      range('outline', 'Outline width', 0.012, 0.05, 0.002, 0.028),
    ],
    look: { bg: 'kraft', stop: 12, jitter: 0.55, drift: 0.6, labelStyle: 'hand' },
    draw(g, env) {
      const { W, H, S, t, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 8));
      const items = scatter(n, W, H, seed, +P.spread, +P.rot);
      const matte = env.mode === 'matte';
      // scraps + halftone appear first
      if (P.scraps) {
        const sn = 2 + Math.floor(n / 2);
        for (let q = 0; q < sn; q++) {
          const e = E.outQuart(U.range(t, 0.02 + q * 0.06, 0.02 + q * 0.06 + 0.4));
          if (e <= 0) continue;
          const rx = W * (0.12 + U.h1(q * 3 + 1, seed + 5) * 0.76), ry = H * (0.12 + U.h1(q * 3 + 2, seed + 8) * 0.76);
          const rw = S * (0.16 + U.h1(q * 3 + 3, seed + 9) * 0.2), rh = rw * (0.55 + U.h1(q, seed + 4) * 0.5);
          const rr = (U.h1(q * 7, seed + 2) - 0.5) * 0.9;
          g.save(); g.translate(rx, ry); g.rotate(rr); const sc2 = 0.6 + 0.4 * e; g.scale(sc2, sc2); g.translate(-rx, -ry);
          D.scrap(g, env, q, rx, ry, rw, rh, { shadow: 0.5 });
          g.restore();
        }
      }
      if (P.halftone) {
        const e = U.range(t, 0.05, 0.5);
        if (e > 0) {
          const hx = W * (0.16 + U.h1(21, seed) * 0.3), hy = H * (0.72 + U.h1(22, seed) * 0.2);
          g.save(); g.globalAlpha *= e;
          D.halftone(g, env, hx, hy, S * 0.14, {});
          D.halftone(g, env, W - hx, H * 0.22, S * 0.09, {});
          g.restore();
        }
      }
      // photos fly in one by one
      items.forEach((it, q) => {
        const d0 = 0.14 + q * (+P.stagger || 0.22);
        const e = E.outQuart(U.range(t, d0, d0 + 0.62));
        if (e <= 0) return;
        const side = q % 2 ? 1 : -1;
        const fromX = it.cx + side * (W * 0.7) * (1 - e);
        const rot0 = it.rot + side * 0.35 * (1 - E.outBack(Math.min(1, e * 1.15)));
        const [jx, jy, jr] = env.jit(it.k + 1);
        const cx = U.lerp(fromX, it.cx, 1) + jx, cy = it.cy + jy;
        const rot = rot0 + jr;
        const hh = it.h;
        if (P.style === 'cutout') {
          D.cutout(g, env, it.k, cx, cy, hh, { rot, alpha: 1, shadow: 1.15, bw: +P.bw, rough: 0, outline: +P.outline, scale: 0.94 + 0.06 * e });
        } else {
          const src = env.src(it.k), asp = D.cutAspect(src);
          const w = Math.min(W * 0.62, hh * asp);
          D.photo(g, env, it.k, cx - w / 2, cy - hh / 2, w, hh, {
            rot, shadow: 1.1, bw: +P.bw, scale: 0.94 + 0.06 * e,
            border: S * 0.004, rough: P.style === 'rough' ? 1.7 : 0, seed: seed + it.k * 13,
          });
        }
        // label near the photo, slightly below-right, rotated with it
        if (P.labels && env.label(it.k)) {
          const le = U.range(t, d0 + 0.75, d0 + 1.0);
          if (le > 0) {
            const src = env.src(it.k), asp = D.cutAspect(src);
            const w = Math.min(W * 0.62, hh * asp);
            const lx = cx + w * 0.18, ly = cy + hh * 0.62;
            D.label(g, env, env.label(it.k), lx, ly, { alpha: le, scale: E.pop(le), rot: rot * 0.7, size: 0.042 * env.labelSize, style: env.P.labelStyle });
          }
        }
      });
    },
  });

  CS.fx.register({
    id: 'scraptidy', name: 'Scrapbook – chaos to order', family: 'scrapbook', slots: 5, minSlots: 3, maxSlots: 8, dur: 6,
    desc: 'The scattered collage flies into a neat labelled row.',
    params: [
      select('style', 'Photo style', [['cutout', 'Cut-outs with white outline'], ['rough', 'Hand-cut photos'], ['photo', 'Plain photos']], 'cutout'),
      range('spread', 'Scatter', 0, 1, 0.05, 0.7),
      range('rot', 'Max tilt (deg)', 0, 10, 0.5, 5),
      range('bw', 'Black & white', 0, 1, 0.05, 0),
      range('stagger', 'Delay between photos (s)', 0.1, 0.5, 0.05, 0.16),
      bool('scraps', 'Paper scraps behind', true),
      bool('labels', 'Labels in the tidy row', true),
      range('outline', 'Outline width', 0.012, 0.05, 0.002, 0.028),
    ],
    look: { bg: 'kraft', stop: 12, jitter: 0.5, drift: 0.4, labelStyle: 'tag' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(3, Math.min(slotN, 8));
      const items = scatter(n, W, H, seed, +P.spread, +P.rot);
      const tidy = tidyRow(n, W, H);
      const rq = E.inOut(U.range(p, 0.52, 0.9));
      if (P.scraps && rq < 0.5) {
        for (let q = 0; q < 2 + Math.floor(n / 2); q++) {
          const e = E.outQuart(U.range(t, 0.02 + q * 0.06, 0.4 + q * 0.06));
          if (e <= 0) continue;
          const rx = W * (0.12 + U.h1(q * 3 + 1, seed + 5) * 0.76), ry = H * (0.12 + U.h1(q * 3 + 2, seed + 8) * 0.76);
          const rw = S * (0.16 + U.h1(q * 3 + 3, seed + 9) * 0.2), rh = rw * (0.55 + U.h1(q, seed + 4) * 0.5);
          g.save(); g.globalAlpha *= 1 - rq;
          D.scrap(g, env, q, rx, ry, rw, rh, { shadow: 0.5, rot: (U.h1(q * 7, seed + 2) - 0.5) * 0.9 });
          g.restore();
        }
      }
      items.forEach((it, q) => {
        const d0 = 0.12 + q * (+P.stagger || 0.16);
        const e = E.outQuart(U.range(t, d0, d0 + 0.55));
        if (e <= 0) return;
        const side = q % 2 ? 1 : -1;
        const fromX = it.cx + side * (W * 0.7) * (1 - e);
        const [jx, jy, jr] = env.jit(it.k + 1);
        const tgt = tidy[it.k] || tidy[0];
        const cx = U.lerp(fromX, tgt.cx, rq) + jx * (1 - rq), cy = U.lerp(it.cy, tgt.cy, rq) + jy * (1 - rq);
        const rot = U.lerp(it.rot + side * 0.35 * (1 - E.outBack(Math.min(1, e * 1.15))) + jr, 0, rq);
        const hh = U.lerp(it.h, tgt.h, rq);
        const scale = 0.94 + 0.06 * e;
        if (P.style === 'cutout') D.cutout(g, env, it.k, cx, cy, hh, { rot, shadow: 1.1, bw: +P.bw, rough: 0, outline: +P.outline, scale });
        else {
          const src = env.src(it.k), asp = D.cutAspect(src);
          const w = Math.min(W * 0.62, hh * asp);
          D.photo(g, env, it.k, cx - w / 2, cy - hh / 2, w, hh, { rot, shadow: 1.05, bw: +P.bw, scale, border: S * 0.004, rough: P.style === 'rough' ? 1.7 : 0, seed: seed + it.k * 13 });
        }
        if (P.labels && env.label(it.k)) {
          const le = rq > 0.6 ? U.range(rq, 0.6, 0.95) : 0;
          if (le > 0) D.label(g, env, env.label(it.k), cx, cy + tgt.h * 0.66, { alpha: le, scale: E.pop(le), size: 0.04 * env.labelSize, style: env.P.labelStyle });
        }
      });
    },
  });

  const pr = CS.fx.preset;
  pr('jh-bw-collage', 'Scrapbook – B&W on kraft', 'scrap', { style: 'cutout', bw: 1 }, 6, 'The classic explainer opener: B&W cut-outs, white outlines, kraft paper, 12 fps jitter.', 5);
  pr('scrapbook-pop-in', 'Scrapbook – colour pop-in', 'scrap', { style: 'cutout', bw: 0 }, 6, 'Colour cut-outs fly onto the paper one by one.', 5);
  pr('scrapbook-chaos-order', 'Scrapbook – chaos to order', 'scraptidy', {}, 6, 'The scatter flies into a neat labelled row.', 5);
  pr('scrap-annotated', 'Scrapbook – annotated', 'scrap', { style: 'rough', bw: 0.55, halftone: true, scraps: true }, 6, 'Hand-cut photos with scraps and halftone print dots.', 4);
  pr('vox-halftone', 'Scrapbook – print look', 'scrap', { style: 'photo', bw: 0.7, halftone: true }, 6, 'Halftone-heavy newsprint look.', 4);
})();
