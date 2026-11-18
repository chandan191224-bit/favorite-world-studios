// Mosaic: tiles flip in (random / wave order) until filled, or cover a photo then fly off to reveal it.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  CS.fx.register({
    id: 'mosaic', name: 'Mosaic build', family: 'mosaic', slots: 6, minSlots: 2, maxSlots: 8, dur: 5,
    desc: 'Photo tiles flip in one by one until the whole frame is filled.',
    params: [
      select('cols', 'Columns', [['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], '4'),
      select('order', 'Order', [['random', 'Random'], ['wave', 'Diagonal wave'], ['row', 'Row by row']], 'random'),
      range('gap', 'Gap', 0, 0.02, 0.001, 0.003),
      range('stagger', 'Stagger (s)', 0.02, 0.2, 0.01, 0.07),
      bool('numbers', 'Number badges', false),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 8));
      const cols = +P.cols, rows = Math.max(1, Math.ceil((H / W) * cols - 0.001)); // tiles ~square
      const gap = +P.gap * S;
      const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
      const x0 = (W - (cols * cw + gap * (cols - 1))) / 2, y0 = (H - (rows * ch + gap * (rows - 1))) / 2; // exact centring, no rounding slivers
      const total = cols * rows;
      let order = Array.from({ length: total }, (_, i) => i);
      if (P.order === 'random') {
        const rnd = U.rng(seed * 43 + total);
        for (let i = total - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      } else if (P.order === 'wave') {
        order.sort((a, b) => ((a % cols) + Math.floor(a / cols)) - ((b % cols) + Math.floor(b / cols)));
      }
      const matte = env.mode === 'matte';
      for (let i = 0; i < total; i++) {
        const rank = order.indexOf(i);
        const s0 = 0.05 + (rank / Math.max(1, total - 1)) * env.dur * 0.5;
        const e = E.outQuart(U.range(t, s0, s0 + Math.max(0.3, env.dur * 0.22)));
        if (e <= 0) continue;
        const c = i % cols, r = Math.floor(i / cols);
        const x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
        const k = i % n;
        // flip: horizontal scale -0.2 -> 1
        const fx = -0.2 + 1.2 * e;
        const tmp = U.tmp('mos', Math.max(2, cw), Math.max(2, ch));
        const tg = tmp.getContext('2d');
        D.photo(tg, env, k, 0, 0, cw, ch, { shadow: 0, border: 0, radius: 0 });
        g.save();
        g.translate(x + cw / 2, y + ch / 2);
        g.scale(Math.max(0.01, Math.abs(fx)) * Math.sign(fx || 1), 1);
        g.drawImage(tmp, -cw / 2, -ch / 2);
        g.restore();
        if (P.numbers) {
          const ne = U.range(e, 0.6, 1);
          if (ne > 0) {
            const rr = S * 0.022;
            g.save(); g.translate(x + rr, y + rr); g.scale(E.outBack(ne), E.outBack(ne));
            g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fillStyle = matte ? '#fff' : '#e5a93c'; g.fill();
            if (!matte) { g.fillStyle = '#15120a'; g.font = `800 ${rr}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 0, rr * 0.06); }
            g.restore();
          }
        }
      }
    },
  });

  CS.fx.register({
    id: 'mosaicreveal', name: 'Mosaic reveal', family: 'mosaic', slots: 4, minSlots: 2, maxSlots: 6, dur: 6,
    desc: 'Tiles cover a photo, then fly off one by one to reveal it.',
    params: [
      select('cols', 'Columns', [['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], '4'),
      range('gap', 'Gap', 0, 0.02, 0.001, 0.003),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 6));
      // base photo (slot 0) under everything — also present in element exports
      D.photo(g, env, 0, 0, 0, W, H, { zoom: 0.04 * p });
      const cols = +P.cols, rows = Math.max(1, Math.ceil((H / W) * cols - 0.001));
      const gap = +P.gap * S;
      const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
      const x0 = (W - (cols * cw + gap * (cols - 1))) / 2, y0 = (H - (rows * ch + gap * (rows - 1))) / 2;
      const total = cols * rows;
      // fly-out order (seeded)
      const key = ['mr', total, seed].join('|');
      let order = mosaicPerm(key, total, seed);
      const flyQ = U.range(p, 0.6, 0.93);
      for (let i = 0; i < total; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
        const k = 1 + ((i) % Math.max(1, n - 1));
        // fly in: p 0.05..0.45 ; fly out by rank: p 0.6..0.93
        const eIn = E.outQuart(U.range(p, 0.05 + (i % 5) * 0.03, 0.05 + (i % 5) * 0.03 + 0.3));
        const rank = order.indexOf(i);
        const sOut = 0.56 + (rank / total) * 0.28;
        const eOut = E.inQuad(U.range(p, sOut, sOut + 0.08));
        if (eIn <= 0) continue;
        if (eOut >= 1) continue;
        let tx = 0, ty = 0, rot = 0, sc = 1, alpha = 1;
        if (eIn < 1) { // flying in from the nearest edge
          const side = i % 2 ? 1 : -1;
          tx = side * (1 - eIn) * W * 0.7; ty = (U.sh(i * 7 + 1, seed)) * (1 - eIn) * H * 0.3;
          rot = side * (1 - eIn) * 0.4; sc = 0.8 + 0.2 * eIn;
        }
        if (eOut > 0) { // flying off to the nearest edge
          const dirx = (x + cw / 2) < W / 2 ? -1 : 1;
          tx = dirx * eOut * W * 0.85; ty = U.sh(i * 5 + 2, seed) * eOut * H * 0.4;
          rot = dirx * eOut * 0.5; sc = 1 - 0.25 * eOut; alpha = 1 - eOut * 0.3;
        }
        const tmp = U.tmp('mr' + (i % 3), Math.max(2, cw), Math.max(2, ch));
        const tg = tmp.getContext('2d');
        D.photo(tg, env, k, 0, 0, cw, ch, { shadow: 0, border: 0, radius: 0 });
        g.save();
        g.globalAlpha *= U.clamp(alpha);
        g.translate(x + cw / 2 + tx, y + ch / 2 + ty);
        g.rotate(rot); g.scale(sc, sc);
        g.drawImage(tmp, -cw / 2, -ch / 2);
        g.restore();
      }
    },
  });

  const permCache = new Map();
  function mosaicPerm(key, total, seed) {
    let o = permCache.get(key);
    if (o) return o;
    const rnd = U.rng(seed * 53 + total);
    o = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    if (permCache.size > 30) permCache.delete(permCache.keys().next().value);
    permCache.set(key, o);
    return o;
  }

  const pr = CS.fx.preset;
  pr('mosaic-build', 'Mosaic – build', 'mosaic', { order: 'random' }, 5, 'Tiles flip in one by one until filled.', 6);
  pr('mosaic-wave', 'Mosaic – wave', 'mosaic', { order: 'wave', cols: 5 }, 5, 'Tiles flip in on a diagonal wave.', 6);
  pr('mosaic-reveal', 'Mosaic – reveal', 'mosaicreveal', {}, 6, 'Tiles cover a photo, then fly off to reveal it.', 4);
})();
