// Photo walls: a cached wall canvas + own camera. Zoom into one photo, pan across, shuffle tiles.
// Cover math: the wall always covers the frame at scale >= 1; zoom target ends as an exact full-frame cover.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  // wall plan: grid that covers W x H (extra cells filled with wrapped photos)
  const planCache = new Map();
  function plan(n, W, H, seed, colsMode) {
    const key = [n, W, H, seed, colsMode].join('|');
    let pl = planCache.get(key);
    if (pl) return pl;
    let cols = colsMode === 'auto' ? (n >= 8 ? 4 : 3) : +colsMode;
    let rows = Math.ceil(n / cols);
    // extend until the wall covers the frame aspect
    const extend = () => {
      while (cols * 1 < (W / H) * rows * 0.98 && rows * cols < n + cols) cols++;
      while (rows < (H / W) * cols * 0.98 && rows * cols < n + cols) rows++;
    };
    extend();
    const tiles = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tiles.push({ r, c, k: (r * cols + c) % n, i: r * cols + c });
    pl = { rows, cols, tiles };
    if (planCache.size > 40) planCache.delete(planCache.keys().next().value);
    planCache.set(key, pl);
    return pl;
  }

  // draw one tile of the wall (photo + border + tilt) into ctx
  function tile(g, env, tl, x, y, w, h, P, S, seed) {
    const rot = (+P.tilt || 0) * Math.PI / 180 * U.sh(tl.i * 7 + 1, seed);
    const bw = +P.border * S;
    g.save();
    g.translate(x + w / 2, y + h / 2); g.rotate(rot);
    if (bw > 0.5) { D.setShadow(g, env, 0.5); U.roundRect(g, -w / 2 - bw, -h / 2 - bw, w + bw * 2, h + bw * 2, +P.radius * S); g.fillStyle = env.mode === 'matte' ? '#fff' : '#fff'; g.fill(); D.noShadow(g); }
    g.save();
    U.roundRect(g, -w / 2, -h / 2, w, h, +P.radius * S); g.clip();
    D.photo(g, env, tl.k, -w / 2, -h / 2, w, h, { shadow: 0, radius: 0 });
    g.restore();
    g.restore();
  }

  function wallGeometry(env, P) {
    const { W, H, S, seed, n: slotN } = env;
    const n = Math.max(4, Math.min(slotN, 12));
    const pl = plan(n, W, H, seed, String(P.cols || 'auto'));
    const gap = +P.gap * S, m = S * 0.03;
    const cw = (W - 2 * m - gap * (pl.cols - 1)) / pl.cols, ch = (H - 2 * m - gap * (pl.rows - 1)) / pl.rows;
    return { n, pl, gap, m, cw, ch };
  }

  CS.fx.register({
    id: 'wall', name: 'Photo wall – zoom in', family: 'wall', slots: 9, minSlots: 4, maxSlots: 12, dur: 6,
    ownCamera: true,
    desc: 'A wall of photos builds, then the camera zooms into one photo until it fills the frame.',
    params: [
      select('cols', 'Columns', [['auto', 'Auto'], ['3', '3'], ['4', '4'], ['5', '5']], 'auto'),
      select('build', 'Build in', [['pop', 'Pop in (random order)'], ['cascade', 'Cascade'], ['none', 'Already there']], 'pop'),
      range('tilt', 'Photo tilt (deg)', 0, 6, 0.5, 1.5),
      range('border', 'White border', 0, 0.02, 0.001, 0.006),
      range('gap', 'Gap', 0.002, 0.02, 0.001, 0.006),
      range('radius', 'Corner radius', 0, 0.04, 0.005, 0.008),
      range('zoomTo', 'Zoom into photo #', 0, 11, 1, 0),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed } = env;
      env.bg();
      const { n, pl, gap, m, cw, ch } = wallGeometry(env, P);
      const tiles = pl.tiles;
      // arrival
      let order = tiles.map(tl => tl.i);
      if (P.build === 'pop') order.sort((a, b) => U.h1(a, seed * 13) - U.h1(b, seed * 13));
      else if (P.build === 'cascade') order.sort((a, b) => ((a % pl.cols) + Math.floor(a / pl.cols)) - ((b % pl.cols) + Math.floor(b / pl.cols)));
      const rank = new Map(); order.forEach((v, i) => rank.set(v, i));
      const count = Math.max(1, tiles.length - 1);
      // camera: zoom from 1 into tile zoomTo (exact cover at the end)
      const zt = tiles[Math.max(0, Math.min(tiles.length - 1, Math.round(+P.zoomTo)))];
      const zq = E.inOut(U.range(p, 0.42, 0.93));
      const tw = cw, thh = ch;
      const endScale = Math.max(W / tw, H / thh);
      const txc = m + zt.c * (cw + gap) + cw / 2, tyc = m + zt.r * (ch + gap) + ch / 2;
      const scale = U.lerp(1, endScale, zq);
      // translate: keep the wall covering while zooming toward the tile centre
      const wallW = pl.cols * cw + (pl.cols - 1) * gap + 2 * m, wallH = pl.rows * ch + (pl.rows - 1) * gap + 2 * m;
      // camera centres: start at frame centre in wall coords, end at tile centre
      let cx = U.lerp(W / 2, txc, zq), cy = U.lerp(H / 2, tyc, zq);
      // clamp so the scaled wall still covers the viewport
      const vw = W / scale, vh = H / scale;
      cx = U.clamp(cx, vw / 2, wallW - vw / 2); cy = U.clamp(cy, vh / 2, wallH - vh / 2);
      // hold zoom drift at the very end
      const hold = 1 + 0.02 * U.range(p, 0.93, 1);
      const s2 = scale * hold;
      g.save();
      g.translate(W / 2, H / 2); g.scale(s2, s2); g.translate(-cx, -cy);
      for (const tl of tiles) {
        const i = rank.get(tl.i), s0 = 0.06 + (i / count) * env.dur * 0.34;
        const e = P.build === 'none' ? 1 : E.outBack(U.range(t, s0, s0 + 0.5));
        if (e <= 0) continue;
        const x = m + tl.c * (cw + gap), y = m + tl.r * (ch + gap);
        if (e < 1) {
          g.save(); g.translate(x + cw / 2, y + ch / 2); g.scale(Math.max(0.001, e), Math.max(0.001, e)); g.translate(-x - cw / 2, -y - ch / 2);
          tile(g, env, tl, x, y, cw, ch, P, S, seed);
          g.restore();
        } else tile(g, env, tl, x, y, cw, ch, P, S, seed);
      }
      g.restore();
    },
  });

  CS.fx.register({
    id: 'wallpan', name: 'Photo wall – pan across', family: 'wall', slots: 9, minSlots: 4, maxSlots: 12, dur: 6,
    ownCamera: true,
    desc: 'The camera drifts across a photo wall and settles in the middle.',
    params: [
      select('cols', 'Columns', [['auto', 'Auto'], ['3', '3'], ['4', '4'], ['5', '5']], 'auto'),
      select('dir', 'Pan direction', [['lr', 'Left to right'], ['rl', 'Right to left'], ['down', 'Top to bottom']], 'lr'),
      range('tilt', 'Photo tilt (deg)', 0, 6, 0.5, 1.5),
      range('border', 'White border', 0, 0.02, 0.001, 0.006),
      range('gap', 'Gap', 0.002, 0.02, 0.001, 0.006),
      range('radius', 'Corner radius', 0, 0.04, 0.005, 0.008),
      range('zoom', 'Zoom while panning', 1, 1.6, 0.05, 1.22),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, p, P, seed } = env;
      env.bg();
      const { pl, gap, m, cw, ch } = wallGeometry(env, P);
      const wallW = pl.cols * cw + (pl.cols - 1) * gap + 2 * m, wallH = pl.rows * ch + (pl.rows - 1) * gap + 2 * m;
      const q = E.inOut(U.range(p, 0.04, 0.9));
      const scale = +P.zoom;
      const vw = W / scale, vh = H / scale;
      let cx, cy;
      if (P.dir === 'down') { cx = U.lerp(vw / 2 + (wallW - vw) * 0.5, wallW / 2, q); cy = U.lerp(vh / 2, wallH / 2, q); }
      else {
        const fromLeft = P.dir !== 'rl';
        cx = U.lerp(fromLeft ? vw / 2 : wallW - vw / 2, wallW / 2, q);
        cy = wallH / 2;
      }
      cx = U.clamp(cx, vw / 2, wallW - vw / 2); cy = U.clamp(cy, vh / 2, wallH - vh / 2);
      g.save();
      g.translate(W / 2, H / 2); g.scale(scale, scale); g.translate(-cx, -cy);
      for (const tl of pl.tiles) tile(g, env, tl, m + tl.c * (cw + gap), m + tl.r * (ch + gap), cw, ch, P, S, seed);
      g.restore();
    },
  });

  CS.fx.register({
    id: 'wallshuffle', name: 'Photo wall – shuffle', family: 'wall', slots: 9, minSlots: 4, maxSlots: 12, dur: 6,
    ownCamera: true,
    desc: 'The tiles of a photo wall reshuffle into new places.',
    params: [
      select('cols', 'Columns', [['auto', 'Auto'], ['3', '3'], ['4', '4'], ['5', '5']], 'auto'),
      select('build', 'Build in', [['pop', 'Pop in (random order)'], ['cascade', 'Cascade'], ['none', 'Already there']], 'cascade'),
      range('tilt', 'Photo tilt (deg)', 0, 6, 0.5, 1.5),
      range('border', 'White border', 0, 0.02, 0.001, 0.006),
      range('gap', 'Gap', 0.002, 0.02, 0.001, 0.006),
      range('radius', 'Corner radius', 0, 0.04, 0.005, 0.008),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed } = env;
      env.bg();
      const { n, pl, gap, m, cw, ch } = wallGeometry(env, P);
      const tiles = pl.tiles;
      let order = tiles.map(tl => tl.i);
      if (P.build === 'pop') order.sort((a, b) => U.h1(a, seed * 13) - U.h1(b, seed * 13));
      else if (P.build === 'cascade') order.sort((a, b) => ((a % pl.cols) + Math.floor(a / pl.cols)) - ((b % pl.cols) + Math.floor(b / pl.cols)));
      const rank = new Map(); order.forEach((v, i) => rank.set(v, i));
      const count = Math.max(1, tiles.length - 1);
      // permutation of tile indices (photos move to other cells)
      const permKey = [tiles.length, seed].join('|');
      let perm = planCache.get(permKey);
      if (!perm) {
        const rnd = U.rng(seed * 29 + tiles.length); perm = tiles.map((_, i) => i);
        for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
        if (planCache.size > 40) planCache.delete(planCache.keys().next().value);
        planCache.set(permKey, perm);
      }
      const rq = E.inOut(U.range(p, 0.48, 0.88));
      const z2 = 1 + 0.06 * E.inOut(U.range(p, 0.88, 1));
      g.save();
      g.translate(W / 2, H / 2); g.scale(z2, z2); g.translate(-W / 2, -H / 2);
      for (const tl of tiles) {
        const i = rank.get(tl.i), s0 = 0.06 + (i / count) * env.dur * 0.34;
        const e = P.build === 'none' ? 1 : E.outBack(U.range(t, s0, s0 + 0.5));
        if (e <= 0) continue;
        const x0 = m + tl.c * (cw + gap), y0 = m + tl.r * (ch + gap);
        const tgt = tiles[perm[tl.i]];
        const x1 = m + tgt.c * (cw + gap), y1 = m + tgt.r * (ch + gap);
        const x = U.lerp(x0, x1, rq), y = U.lerp(y0, y1, rq);
        const mid = Math.sin(Math.PI * rq) * 0.06;
        g.save();
        g.translate(x + cw / 2, y + ch / 2);
        g.rotate(U.sh(tl.i * 11 + 3, seed) * mid);
        g.scale(1 + mid * 0.5, 1 + mid * 0.5);
        if (e < 1) g.scale(Math.max(0.001, e), Math.max(0.001, e));
        g.translate(-x - cw / 2, -y - ch / 2);
        tile(g, env, tl, x, y, cw, ch, P, S, seed);
        g.restore();
      }
      g.restore();
    },
  });

  const pr = CS.fx.preset;
  pr('wall-zoom-in', 'Photo wall – zoom in', 'wall', {}, 6, 'A wall of photos builds, then the camera zooms into one.', 9);
  pr('wall-pan-across', 'Photo wall – pan across', 'wallpan', {}, 6, 'Camera drifts across the wall and settles.', 9);
  pr('wall-shuffle', 'Photo wall – shuffle', 'wallshuffle', {}, 6, 'The tiles reshuffle into new places.', 9);
  pr('wall-gallery', 'Photo wall – gallery', 'wall', { build: 'cascade', zoomTo: 4 }, 6, 'A plain gallery wall, tiles cascade in and hold.', 12);
})();
