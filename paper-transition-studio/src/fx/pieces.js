// Roll, strips, shards, paper sweeps and flying crumpled chunks.
(() => {
  const U = PT.util, D = PT.draw, M = PT.materials, { range, select, bool, color } = PT.fx.P;
  const DIRS8 = [['0', '→ right'], ['45', '↘ down-right'], ['90', '↓ down'], ['135', '↙ down-left'], ['180', '← left'], ['225', '↖ up-left'], ['270', '↑ up'], ['315', '↗ up-right']];

  // ---------- roll: the sheet rolls up into a tube that travels across ----------
  PT.fx.register({
    id: 'roll', name: 'Scroll roll', family: 'Roll & fold', sfx: 'roll', dur: 1.5, ease: 'inOut', reversible: true,
    desc: 'The paper curls into a tight tube that rolls across the frame.',
    params: [
      select('angle', 'Rolls toward', DIRS8, '180'),
      range('radius', 'Tube thickness', 0, 1, 0.01, 0.45),
      range('tilt', 'Tilt while rolling (°)', -25, 25, 1, 8),
      range('rough', 'Torn edge', 0, 1, 0.01, 0.25),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, e = env.E(p);
      const a = (+P.angle + P.tilt * (e - 0.5)) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const sp = U.frameSpan(W, H, dx, dy), cx = W / 2, cy = H / 2;
      const rMax = S * (0.025 + 0.075 * P.radius);
      const f0 = sp.smin - rMax * 2, f = f0 + e * (sp.smax - sp.smin + rMax * 4);
      const r = rMax * (0.45 + 0.55 * Math.sqrt(U.clamp((f - sp.smin) / (sp.smax - sp.smin))));
      const half = (sp.umax - sp.umin) / 2 + S * 0.2, step = S / 160;
      const prof = U.tornProfile(env.seed, P.rough, S);
      const front = [], c0 = [], c1 = [];
      for (let u = -half; u <= half; u += step) {
        const o = prof(u + half);
        const X = cx + nx * u, Y = cy + ny * u;
        front.push([X + dx * (f + o), Y + dy * (f + o)]);
        const w = 0.15 * U.noise1(u / (S * 0.15), env.seed + 3) * r;
        c0.push([X + dx * (f - r * 0.75 + w), Y + dy * (f - r * 0.75 + w)]);
        c1.push([X + dx * (f + r * 1.25 + w), Y + dy * (f + r * 1.25 + w)]);
      }
      const far = sp.smax + S;
      const polyA = front.concat([[cx + nx * half + dx * far, cy + ny * half + dy * far], [cx - nx * half + dx * far, cy - ny * half + dy * far]]);
      ctx.drawImage(B, 0, 0);
      D.sheet(ctx, A, [polyA], env, { edges: [front], seed: env.seed });
      const tube = c0.concat(c1.slice().reverse());
      const g0 = [cx + dx * (f - r * 0.75), cy + dy * (f - r * 0.75)], g1 = [cx + dx * (f + r * 1.25), cy + dy * (f + r * 1.25)];
      D.flap(ctx, tube, env, g0, g1, {
        shadow: 1.1,
        stops: [[0, 'rgba(0,0,0,0.5)'], [0.12, 'rgba(0,0,0,0.18)'], [0.4, 'rgba(255,255,255,0.55)'], [0.52, 'rgba(255,255,255,0.18)'], [0.82, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0.55)']],
      });
      if (!env.matte) {
        ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = Math.max(1, S * 0.0015);
        for (const k of [0.68, 0.84]) {
          ctx.beginPath();
          c0.forEach((q, i) => { const x = U.lerp(q[0], c1[i][0], k), y = U.lerp(q[1], c1[i][1], k); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        }
        ctx.restore();
      }
    },
  });

  // ---------- strips: the sheet tears into bands that slide away ----------
  PT.fx.register({
    id: 'strips', name: 'Torn strips', family: 'Strips & shards', sfx: 'rip', dur: 1.5, ease: 'in',
    desc: 'The page tears into ragged bands that slide off in different directions.',
    params: [
      select('dir', 'Bands', [['h', 'Horizontal bands'], ['v', 'Vertical bands']], 'h'),
      range('count', 'Number of strips', 2, 14, 1, 7),
      range('stagger', 'Stagger', 0, 1, 0.01, 0.6),
      range('rough', 'Tear roughness', 0, 1, 0.01, 0.55),
      range('drop', 'Fall / tumble', 0, 1, 0.01, 0.35),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, vert = P.dir === 'v', k = Math.round(P.count), Rn = U.rng(env.seed);
      const len = vert ? H : W, across = vert ? W : H, m = S * 0.3;
      const P2 = (a, b) => (vert ? [b, a] : [a, b]); // (along, across) -> (x, y)
      const lines = [];
      for (let j = 0; j <= k; j++) {
        if (j === 0 || j === k) { const c = j === 0 ? -m : across + m; lines.push([P2(-m, c), P2(len + m, c)]); continue; }
        const c = across * (j + (Rn() - 0.5) * 0.5) / k;
        const pts = U.tornLine(...P2(-m, c), ...P2(len + m, c), U.tornProfile(env.seed + j * 7, P.rough, S), S / 150);
        lines.push(pts);
      }
      ctx.drawImage(B, 0, 0);
      const order = [];
      for (let i = 0; i < k; i++) order.push(i);
      order.sort(() => Rn() - 0.5);
      order.forEach((i, rank) => {
        const sg = U.h1(i, env.seed) > 0.5 ? 1 : -1, delay = P.stagger * 0.5 * (rank / Math.max(1, k - 1));
        const q = env.E(U.range(p, delay, delay + 1 - P.stagger * 0.5));
        const along = sg * q * (len + S * 0.5) * 1.05, fall = q * q * across * 0.25 * P.drop * U.h1(i, env.seed + 4), rot = sg * q * 0.12 * P.drop * (U.h1(i, env.seed + 8) - 0.3);
        const [tx, ty] = P2(along, fall);
        const top = lines[i], bot = lines[i + 1];
        const poly = top.concat(bot.slice().reverse());
        const [pcx, pcy] = U.centroid(poly);
        const tf = D.moveTf(pcx, pcy, rot, tx, ty);
        const dest = U.xform(poly, pcx, pcy, rot, tx, ty);
        const edges = [i > 0 ? U.xform(top, pcx, pcy, rot, tx, ty) : null, i < k - 1 ? U.xform(bot, pcx, pcy, rot, tx, ty) : null].filter(Boolean);
        D.sheet(ctx, A, [dest], env, { tf, edges, seed: env.seed + i * 3, shadow: 0.8 });
      });
    },
  });

  // ---------- shards: the page cracks and flies apart in spiky pieces ----------
  PT.fx.register({
    id: 'shards', name: 'Paper shards', family: 'Strips & shards', sfx: 'crumple', dur: 1.4, ease: 'in',
    desc: 'Torn white cracks appear, then triangular shards fly out from the impact point.',
    params: [
      range('cx', 'Impact X', 0, 1, 0.01, 0.5),
      range('cy', 'Impact Y', 0, 1, 0.01, 0.5),
      range('pieces', 'Pieces', 6, 40, 1, 18),
      range('spin', 'Spin', 0, 1, 0.01, 0.5),
      range('gravity', 'Gravity', 0, 1, 0.01, 0.5),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, Rn = U.rng(env.seed), n = Math.round(P.pieces);
      const cols = Math.max(2, Math.round(Math.sqrt(n / 2 * W / H))), rows = Math.max(1, Math.round(n / 2 / cols));
      const ix = P.cx * W, iy = P.cy * H, diag = Math.hypot(W, H), m = S * 0.05;
      const V = [];
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
        const x = -m + (W + 2 * m) * i / cols + (edgeX ? 0 : (Rn() - 0.5) * W / cols * 0.8);
        const y = -m + (H + 2 * m) * j / rows + (edgeY ? 0 : (Rn() - 0.5) * H / rows * 0.8);
        V.push([x, y]);
      }
      const at = (i, j) => V[j * (cols + 1) + i];
      const tris = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
        if (Rn() > 0.5) { tris.push([a, b, c]); tris.push([a, c, d]); } else { tris.push([a, b, d]); tris.push([b, c, d]); }
      }
      ctx.drawImage(B, 0, 0);
      const crack = U.clamp(p * 6);
      const shards = tris.map((t, i) => {
        const [gx, gy] = U.centroid(t), dist = Math.hypot(gx - ix, gy - iy) / diag;
        const delay = 0.12 + dist * 0.35, q = U.clamp((p - delay) / (1 - delay)), qe = q * q;
        return { t, gx, gy, q, qe, i, dist };
      }).sort((a, b) => b.dist - a.dist);
      for (const s of shards) {
        const vx = s.gx - ix, vy = s.gy - iy, L = Math.hypot(vx, vy) || 1, sp = diag * (0.7 + U.h1(s.i, env.seed) * 0.7);
        const tx = vx / L * s.qe * sp, ty = vy / L * s.qe * sp + s.qe * H * 0.6 * P.gravity;
        const rot = (U.h1(s.i, env.seed + 1) - 0.5) * P.spin * 5 * s.qe, sc = 1 - 0.25 * s.qe;
        const dest = U.xform(s.t, s.gx, s.gy, rot, tx, ty, sc, sc);
        const tf = D.moveTf(s.gx, s.gy, rot, tx, ty, sc);
        const tint = s.q > 0 ? `rgba(0,0,0,${0.15 * Math.abs(Math.sin(s.q * 6 + s.i))})` : null;
        D.sheet(ctx, A, [dest], env, { tf, rim: crack * 0.7, fibres: false, shadow: s.q > 0 ? 0.7 : 0.15, tint });
      }
    },
  });

  // ---------- sweep: a paper band (newspaper / notebook / gift wrap...) wipes across ----------
  const sweepParams = [
    select('angle', 'Sweeps toward', DIRS8, '0'),
    select('material', 'Paper', M.MATERIALS, 'notebook'),
    select('pattern', 'Gift-wrap pattern', M.GIFT_PATTERNS.map(x => [x, x]), 'trees'),
    color('color', 'Paper colour', '#f0c43c'),
    range('band', 'Band width (≥1 covers all)', 0.12, 1.2, 0.01, 0.55),
    range('layers', 'Layers', 1, 3, 1, 1),
    range('rough', 'Edge roughness', 0, 1, 0.01, 0.6),
    range('crumple', 'Paper crumple', 0, 1, 0.01, 0.35),
  ];
  PT.fx.register({
    id: 'sweep', name: 'Paper sweep', family: 'Sweeps', sfx: 'whoosh', dur: 1.1, ease: 'inOut',
    desc: 'A torn sheet of newspaper, notebook, gift wrap or coloured paper wipes across; the new scene is behind it.',
    params: sweepParams,
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, e = env.E(p);
      const a = +P.angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const sp = U.frameSpan(W, H, dx, dy), span = sp.smax - sp.smin, cx = W / 2, cy = H / 2;
      const bandW = P.band * span, nl = Math.round(P.layers), gap = bandW * 0.35, amp = S * 0.05 * P.rough;
      const total = bandW + gap * (nl - 1);
      const lead0 = sp.smin - amp + e * (span + total + 2 * amp);
      const half = (sp.umax - sp.umin) / 2 + S * 0.2, step = S / 160;
      const lineAt = (s, seed) => {
        const prof = U.tornProfile(seed, P.rough, S), pts = [];
        for (let u = -half; u <= half; u += step) { const o = prof(u + half); pts.push([cx + nx * u + dx * (s + o), cy + ny * u + dy * (s + o)]); }
        return pts;
      };
      const farB = sp.smin - S, farA = sp.smax + S;
      ctx.drawImage(A, 0, 0);
      const lastTrail = lineAt(lead0 - total, env.seed + 99);
      const behind = lastTrail.concat([[cx + nx * half + dx * farB, cy + ny * half + dy * farB], [cx - nx * half + dx * farB, cy - ny * half + dy * farB]]);
      ctx.save(); ctx.clip(U.pathFrom(behind)); ctx.drawImage(B, 0, 0); ctx.restore();
      const D2 = Math.ceil(Math.hypot(W, H));
      const palette = [P.color, '#e2457a', '#3a7bd5'];
      for (let l = nl - 1; l >= 0; l--) {
        const lead = lead0 - l * gap, trail = l === nl - 1 ? lead0 - total : lead - bandW;
        const L1 = lineAt(lead, env.seed + l * 13), L2 = l === nl - 1 ? lastTrail : lineAt(trail, env.seed + l * 13 + 5);
        const poly = L1.concat(L2.slice().reverse());
        const spec = { type: 'paper', material: P.material, color: palette[l] || P.color, pattern: P.pattern, crumple: P.crumple, seed: env.seed + l };
        const tex = env.matte ? null : M.sheet(spec, D2, D2);
        const path = U.pathFrom(poly);
        D.shadowFill(ctx, path, env, 1);
        ctx.save(); ctx.clip(path);
        if (env.matte) { ctx.fillStyle = l === nl - 1 && nl > 1 ? env.matteA : env.matteA; ctx.fillRect(0, 0, W, H); }
        else { ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2 * (P.material === 'notebook' ? 0 : 1)); ctx.drawImage(tex, -D2 / 2, -D2 / 2); ctx.setTransform(1, 0, 0, 1, 0, 0); }
        const ep = new Path2D(); ep.addPath(U.pathFrom(L1, false)); ep.addPath(U.pathFrom(L2, false));
        D.rim(ctx, ep, env, 1);
        ctx.restore();
        D.fibres(ctx, L1, env, env.seed + l); D.fibres(ctx, L2, env, env.seed + l + 7);
      }
    },
  });

  // ---------- scatter: big crumpled chunks fly past the camera ----------
  PT.fx.register({
    id: 'scatter', name: 'Crumpled chunks fly past', family: 'Crumple', sfx: 'whoosh', dur: 1.3, ease: 'linear',
    desc: 'Big crumpled paper chunks tumble across the camera; the scene changes behind them.',
    params: [
      select('angle', 'Fly toward', DIRS8, '180'),
      range('count', 'Chunks', 4, 22, 1, 11),
      range('size', 'Chunk size', 0.3, 1.5, 0.01, 0.85),
      select('material', 'Paper', M.MATERIALS, 'white'),
      color('color', 'Paper colour', '#f0c43c'),
      bool('blur', 'Motion blur', true),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, Rn = U.rng(env.seed), n = Math.round(P.count);
      const a = +P.angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const sp = U.frameSpan(W, H, dx, dy), cx = W / 2, cy = H / 2;
      ctx.drawImage(p < 0.5 ? A : B, 0, 0);
      const tex = env.matte ? null : M.sheet({ type: 'paper', material: P.material, color: P.color, crumple: 1, seed: env.seed + 3 }, W, H);
      const chunks = [];
      for (let i = 0; i < n; i++) {
        const big = i < 3;
        const size = S * P.size * (big ? 0.9 + Rn() * 0.4 : 0.25 + Rn() * 0.45);
        const t0 = big ? 0.12 + i * 0.07 : Rn() * 0.5, t1 = t0 + (big ? 0.62 : 0.35 + Rn() * 0.4);
        const u = big ? (i - 1) * S * 0.35 : (Rn() - 0.5) * (sp.umax - sp.umin) * 1.1;
        const pts = [], k = 9 + Math.floor(Rn() * 4);
        for (let j = 0; j < k; j++) { const an = j / k * Math.PI * 2, r = size / 2 * (0.6 + Rn() * 0.45); pts.push([Math.cos(an) * r, Math.sin(an) * r]); }
        chunks.push({ size, t0, t1, u, pts, spin: (Rn() - 0.5) * 4, ox: Rn() * W * 0.5, oy: Rn() * H * 0.5, z: big ? 2 : Rn() });
      }
      chunks.sort((x, y) => x.z - y.z);
      for (const c of chunks) {
        const q = U.range(p, c.t0, c.t1);
        if (q <= 0 || q >= 1) continue;
        const ghosts = P.blur && !env.matte ? [0.06, 0.03, 0] : [0];
        ghosts.forEach((lag, gi) => {
          const qq = Math.max(0, q - lag);
          const s = sp.smin - c.size + qq * (sp.smax - sp.smin + c.size * 2), sc = 0.8 + 0.4 * qq;
          const X = cx + nx * c.u + dx * s, Y = cy + ny * c.u + dy * s, rot = c.spin * qq;
          const dest = U.xform(c.pts.map(([x, y]) => [x + X, y + Y]), X, Y, rot, 0, 0, sc, sc);
          ctx.save(); ctx.globalAlpha = gi === ghosts.length - 1 ? 1 : 0.22;
          const path = U.pathFrom(dest);
          if (gi === ghosts.length - 1) D.shadowFill(ctx, path, env, 1.3);
          ctx.clip(path);
          if (env.matte) { ctx.fillStyle = env.matteA; ctx.fillRect(0, 0, W, H); }
          else { ctx.translate(X, Y); ctx.rotate(rot); ctx.drawImage(tex, -c.ox - c.size, -c.oy - c.size); }
          ctx.restore();
        });
      }
    },
  });

  const pr = PT.fx.preset;
  pr('roll-left', 'Scroll roll (side)', 'roll', { angle: '180' }, 1.5, 'Paper rolls up into a tube');
  pr('roll-up', 'Roll up from the bottom', 'roll', { angle: '270', tilt: 4 }, 1.4);
  pr('strips-h', 'Torn horizontal strips', 'strips', { dir: 'h', count: 8 }, 1.5);
  pr('strips-v', 'Torn vertical strips', 'strips', { dir: 'v', count: 6, drop: 0.6 }, 1.5);
  pr('shards', 'Newsprint shards', 'shards', {}, 1.4);
  pr('sweep-notebook', 'Notebook page swipe', 'sweep', { material: 'notebook', angle: '135', band: 0.7 }, 1.1, 'School / education look');
  pr('sweep-news', 'Newspaper sweep', 'sweep', { material: 'newspaper', angle: '0', band: 0.6 }, 1.1);
  pr('sweep-gift', 'Gift-wrap wipe', 'sweep', { material: 'giftwrap', pattern: 'trees', angle: '0', band: 1.1 }, 1.3, 'Festival / Christmas look');
  pr('sweep-kraft', 'Kraft paper band', 'sweep', { material: 'kraft', angle: '45', band: 0.4 }, 1.0);
  pr('sweep-slabs', 'Colour slab curtain', 'sweep', { material: 'color', color: '#f0c43c', layers: 3, band: 0.5, angle: '0' }, 1.4, 'Three coloured torn slabs');
  pr('scatter', 'Crumpled chunks fly past', 'scatter', {}, 1.3);
})();
