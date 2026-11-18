// Grids that build and rearrange: even grids (pop / cascade / slide / flip), optional rearrange, masonry.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  const GRID_LAYOUTS = { auto: null, '2x2': [2, 2], '3x2': [2, 3], '3x3': [3, 3], '4x3': [3, 4], '4x4': [4, 4] };

  // deterministic arrangement cache: cells + a seeded permutation, keyed by everything that matters
  const arrangeCache = new Map();
  function arrange(n, W, H, seed, layout, perm) {
    const key = [n, W, H, seed, layout, perm ? 1 : 0].join('|');
    let a = arrangeCache.get(key);
    if (a) return a;
    const rc = GRID_LAYOUTS[layout] || U.gridFor(n, W, H);
    const [rows, cols] = rc, cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (k < n) cells.push({ r, c, k, diag: r + c });
    }
    const rnd = U.rng(seed * 7 + n);
    let order = cells.map(c => c.k);
    if (perm) { // seeded shuffle (Fisher–Yates on the seeded PRNG)
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    }
    a = { rows, cols, cells, permMap: order };
    if (arrangeCache.size > 60) arrangeCache.delete(arrangeCache.keys().next().value);
    arrangeCache.set(key, a);
    return a;
  }

  CS.fx.register({
    id: 'grid', name: 'Photo grid', family: 'grid', slots: 6, minSlots: 2, maxSlots: 12, dur: 5,
    desc: 'A grid of photos that pops, cascades, slides or flips in — and can rearrange itself mid-scene.',
    params: [
      select('layout', 'Grid', [['auto', 'Auto (fits the count)'], ['2x2', '2 × 2'], ['3x2', '3 × 2'], ['3x3', '3 × 3'], ['4x3', '4 × 3'], ['4x4', '4 × 4']], 'auto'),
      select('build', 'Build in', [['pop', 'Pop'], ['cascade', 'Cascade (diagonal)'], ['slide', 'Slide in'], ['flip', 'Flip in'], ['none', 'Already there']], 'cascade'),
      range('stagger', 'Stagger', 0, 0.5, 0.01, 0.25),
      bool('rearrange', 'Rearrange mid-scene', false),
      range('margin', 'Margin', 0.01, 0.12, 0.005, 0.06),
      range('gap', 'Gap', 0, 0.02, 0.001, 0.006),
      select('frame', 'Cell frame', [['white', 'White'], ['dark', 'Dark'], ['none', 'None']], 'white'),
      range('radius', 'Corner radius', 0, 0.05, 0.005, 0.01),
      bool('labels', 'Labels under cells', false),
      bool('numbers', 'Number badges', false),
      range('kb', 'Slow zoom inside cells', 0, 0.2, 0.01, 0.04),
    ],
    look: { bg: 'dark' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 12));
      const A = arrange(n, W, H, seed, P.layout, true);
      const m = +P.margin * S, gap = +P.gap * S;
      const gw = W - 2 * m, gh = H - 2 * m - (P.labels ? S * 0.05 : 0);
      const cw = (gw - gap * (A.cols - 1)) / A.cols, ch = (gh - gap * (A.rows - 1)) / A.rows;
      // arrival order
      let order = A.cells.slice();
      if (P.build === 'cascade') order.sort((a, b) => a.diag - b.diag || a.c - b.c);
      else if (P.build === 'pop' || P.build === 'flip') order.sort((a, b) => A.permMap.indexOf(a.k) - A.permMap.indexOf(b.k));
      const seq = new Map(); order.forEach((c, i) => seq.set(c.k, i));
      const count = Math.max(1, order.length - 1);
      const spread = env.dur * 0.42, buildDur = Math.max(0.35, env.dur * 0.28);
      const startOf = i => 0.08 + (i / count) * spread;
      // rearrange progress
      const rq = P.rearrange ? E.inOut(U.range(p, 0.5, 0.9)) : 0;
      const matte = env.mode === 'matte';
      const frameCol = P.frame === 'dark' ? '#0c0e13' : '#fff';
      for (const c of A.cells) {
        const from = c, to = P.rearrange ? A.cells[A.permMap[c.k]] : c;
        const s0 = startOf(seq.get(c.k));
        const e = P.build === 'none' ? 1 : E.outQuart(U.range(t, s0, s0 + buildDur));
        if (e <= 0) continue;
        const stag = P.rearrange ? U.clamp((U.sh(c.k * 3 + 1, seed) * 0.5 - 0.5) * 0.12, -0.06, 0.02) : 0;
        const rqk = P.rearrange ? E.inOut(U.clamp((p - 0.5 - stag) / 0.4)) : 0;
        let x = m + from.c * (cw + gap), y = m + from.r * (ch + gap);
        if (rqk > 0) { // interpolate cell rect to its target cell
          const tx = m + to.c * (cw + gap), ty = m + to.r * (ch + gap);
          x = U.lerp(x, tx, rqk); y = U.lerp(y, ty, rqk);
        }
        const lift = Math.sin(Math.PI * rqk); // 0 at rest, 1 mid-flight
        const [jx, jy] = env.jit(c.k);
        x += jx * 0.5; y += jy * 0.5;
        g.save();
        let sc = 1;
        if (P.build === 'pop' || P.build === 'cascade') sc = 0.55 + 0.45 * E.outBack(e);
        else if (P.build === 'flip') sc = e;
        else if (P.build === 'slide') { y += (c.c % 2 ? 1 : -1) * (1 - e) * H * 0.35; }
        sc *= 1 + lift * 0.09;
        g.translate(x + cw / 2, y + ch / 2);
        if (P.build === 'flip' && lift <= 0) { const fx = -0.35 + 1.35 * e; g.scale(fx, 1); }
        else g.scale(sc, sc);
        if (P.frame !== 'none' && !matte) { g.fillStyle = frameCol; U.roundRect(g, -cw / 2, -ch / 2, cw, ch, +P.radius * S); g.fill(); }
        D.photo(g, env, c.k, -cw / 2, -ch / 2, cw, ch, { radius: +P.radius * S, shadow: lift * 1.1, zoom: (+P.kb || 0) * p, border: 0 });
        g.restore();
        if (P.numbers) {
          const ne = U.range(e, 0.7, 1);
          if (ne > 0) {
            const r = S * 0.026;
            g.save(); g.translate(x + r * 0.9, y + r * 0.9); g.scale(E.outBack(ne), E.outBack(ne));
            g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = matte ? '#fff' : '#e5a93c'; g.fill();
            if (!matte) { g.fillStyle = '#15120a'; g.font = `800 ${r}px ${D.FONTS.bold}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(c.k + 1), 0, r * 0.06); }
            g.restore();
          }
        }
        if (P.labels && env.label(c.k)) {
          const le = U.clamp((e - 0.8) / 0.2);
          if (le > 0) D.label(g, env, env.label(c.k), x + cw / 2, y + ch + S * 0.028, { alpha: le, size: 0.03 * env.labelSize });
        }
      }
    },
  });

  CS.fx.register({
    id: 'masonry', name: 'Masonry grid', family: 'grid', slots: 6, minSlots: 3, maxSlots: 8, dur: 5,
    desc: 'Editorial mixed-size grid: some photos wide, some tall, building in on the diagonal.',
    params: [
      range('margin', 'Margin', 0.01, 0.12, 0.005, 0.05),
      range('gap', 'Gap', 0, 0.02, 0.001, 0.005),
      select('frame', 'Cell frame', [['white', 'White'], ['dark', 'Dark'], ['none', 'None']], 'none'),
      bool('labels', 'Labels under cells', false),
      range('kb', 'Slow zoom inside cells', 0, 0.2, 0.01, 0.05),
    ],
    look: { bg: 'paper' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(3, Math.min(slotN, 8));
      const m = +P.margin * S, gap = +P.gap * S;
      // deterministic masonry plan: horizontal bands stacked, each band splits the 12-unit width
      // (fills the whole frame — no gaps, mixed cell sizes)
      const planKey = n + ':' + seed;
      let plan = planCache.get(planKey);
      if (!plan) {
        const rnd = U.rng(seed * 13 + n), cells = [];
        const SPLITS = { 1: [[12]], 2: [[6, 6], [4, 8], [8, 4], [5, 7], [7, 5]], 3: [[4, 4, 4], [3, 4, 5], [5, 4, 3], [6, 3, 3], [3, 3, 6], [5, 5, 2], [2, 5, 5], [2, 4, 6], [6, 4, 2]] };
        const bands = Math.min(3, Math.max(1, Math.ceil(n / 3)));
        let left = n, x = 0;
        for (let b = 0; b < bands; b++) {
          const bandsLeft = bands - b - 1;
          const inBand = b === bands - 1 ? left : Math.max(1, Math.min(3, left - bandsLeft));
          const pat = SPLITS[Math.min(3, Math.max(1, inBand))];
          const split = pat[Math.floor(rnd() * pat.length)];
          for (let c = 0; c < inBand; c++) cells.push({ k: x + c, i: c, c: split.slice(0, inBand).reduce((a, _, j) => a + (j < c ? split[j] : 0), 0), wc: split[c], r: b, hr: 1 });
          x += inBand; left -= inBand;
        }
        plan = { cells, bands };
        if (planCache.size > 40) planCache.delete(planCache.keys().next().value);
        planCache.set(planKey, plan);
      }
      const bandH = (H - 2 * m - gap * (plan.bands - 1)) / plan.bands;
      const unitW = (W - 2 * m - gap * 2) / 12; // 12 units per band, gaps between cells inside a band
      const matte = env.mode === 'matte';
      const frameCol = P.frame === 'dark' ? '#0c0e13' : '#fff';
      const cells = plan.cells.slice().sort((a, b) => (a.r + a.c / 12) - (b.r + b.c / 12) || a.k - b.k);
      cells.forEach((c, i) => {
        const s0 = 0.08 + (i / Math.max(1, cells.length - 1)) * env.dur * 0.45;
        const e = E.outQuart(U.range(t, s0, s0 + Math.max(0.35, env.dur * 0.3)));
        if (e <= 0) return;
        const wpx = c.wc * unitW, hpx = bandH;
        const x = m + c.c * unitW + c.i * gap, y = m + c.r * (bandH + gap);
        const [jx, jy] = env.jit(c.k);
        g.save();
        g.translate(x + wpx / 2 + jx * 0.5, y + hpx / 2 + jy * 0.5 + (1 - e) * H * 0.06);
        const sc = 0.94 + 0.06 * e; g.scale(sc, sc);
        if (P.frame !== 'none' && !matte) { g.fillStyle = frameCol; U.roundRect(g, -wpx / 2, -hpx / 2, wpx, hpx, S * 0.008); g.fill(); }
        D.photo(g, env, c.k, -wpx / 2, -hpx / 2, wpx, hpx, { radius: S * 0.008, shadow: 0, zoom: (+P.kb || 0) * p, border: 0 });
        g.restore();
        if (P.labels && env.label(c.k)) {
          const le = U.clamp((e - 0.75) / 0.25);
          if (le > 0) D.label(g, env, env.label(c.k), x + wpx / 2, y + hpx + S * 0.026, { alpha: le, size: 0.03 * env.labelSize });
        }
      });
    },
  });
  const planCache = new Map();

  const pr = CS.fx.preset;
  pr('grid-2x2-pop', 'Grid 2 × 2 – pop', 'grid', { layout: '2x2', build: 'pop' }, 5, 'Four photos pop in.', 4);
  pr('grid-3x2-cascade', 'Grid 3 × 2 – cascade', 'grid', { layout: '3x2', build: 'cascade' }, 5, 'Six photos cascade in diagonally.', 6);
  pr('grid-3x3-cascade', 'Grid 3 × 3 – cascade', 'grid', { layout: '3x3', build: 'cascade', stagger: 0.3 }, 5.5, 'Nine photos build diagonally.', 9);
  pr('grid-4x3-wall', 'Grid 4 × 3 – wall', 'grid', { layout: '4x3', build: 'cascade', frame: 'none', gap: 0.002 }, 5.5, 'Twelve photos tile the frame edge to edge.', 12);
  pr('grid-rearrange', 'Grid – rearrange', 'grid', { layout: '3x2', build: 'pop', rearrange: true }, 6, 'Photos build, then fly to new places.', 6);
  pr('grid-masonry', 'Masonry – mixed grid', 'masonry', {}, 5, 'Editorial mixed-size grid.', 6);
})();
