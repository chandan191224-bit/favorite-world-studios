// Tear & peel family: corner peel, wedge bites (spear / mountain / V-notch), splits, holes, torn windows.
(() => {
  const U = PT.util, D = PT.draw, { range, select, bool } = PT.fx.P;
  const DIRS8 = [['0', '→ right'], ['45', '↘ down-right'], ['90', '↓ down'], ['135', '↙ down-left'], ['180', '← left'], ['225', '↖ up-left'], ['270', '↑ up'], ['315', '↗ up-right']];

  // ---------- corner peel / diagonal tear with a curled flap ----------
  PT.fx.register({
    id: 'peel', name: 'Peel / diagonal tear', family: 'Tear & peel', sfx: 'rip', dur: 1.3,
    desc: 'A tear line sweeps across with a curled white flap riding on it.',
    params: [
      select('angle', 'Tear moves', DIRS8, '135'),
      range('rough', 'Tear roughness', 0, 1, 0.01, 0.65),
      range('curl', 'Curl size', 0, 1, 0.01, 0.5),
      range('curlAt', 'Curl position', 0, 1, 0.01, 0.75),
      range('bend', 'Tear bend', -1, 1, 0.01, 0.25),
      range('bites', 'Bites (steps)', 1, 4, 1, 1),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, a = +P.angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const sp = U.frameSpan(W, H, dx, dy), cx = W / 2, cy = H / 2;
      const curlW = S * (0.04 + 0.26 * P.curl), bendA = P.bend * S * 0.28;
      const amp = S * 0.05 * P.rough + Math.abs(bendA) + S * 0.01;
      const k = Math.max(1, Math.round(P.bites));
      let e = env.E(p);
      if (k > 1) { const seg = p * k, i = Math.min(k - 1, Math.floor(seg)); e = (i + env.E(seg - i)) / k; }
      const f0 = sp.smin - amp - curlW, f = f0 + e * (sp.smax - sp.smin + 2 * amp + curlW * 2.2);
      const prof = U.tornProfile(env.seed, P.rough, S), prof2 = U.tornProfile(env.seed + 11, P.rough * 0.8, S);
      const half = (sp.umax - sp.umin) / 2 + S * 0.1, step = S / 180;
      const front = [], flapEdge = [];
      const uc = (P.curlAt * 2 - 1) * half * 0.85, sig = half * 0.55;
      for (let u = -half; u <= half; u += step) {
        const un = u / half, off = prof(u + half) + bendA * (un * un - 0.33);
        const x = cx + nx * u + dx * (f + off), y = cy + ny * u + dy * (f + off);
        front.push([x, y]);
        const bump = Math.exp(-((u - uc) * (u - uc)) / (2 * sig * sig));
        let w = curlW * (0.12 + 0.88 * bump) * (0.85 + 0.15 * U.noise1(u / (S * 0.2), env.seed));
        w = Math.max(0, Math.min(w, f - f0 - curlW * 0.2));
        const o2 = w > 1 ? prof2(u + half) * Math.min(1, w / curlW) * 0.6 : 0;
        flapEdge.push([x + dx * (w + o2), y + dy * (w + o2)]);
      }
      const far = sp.smax + S;
      const polyA = front.concat([[cx + nx * half + dx * far, cy + ny * half + dy * far], [cx - nx * half + dx * far, cy - ny * half + dy * far]]);
      ctx.drawImage(B, 0, 0);
      D.sheet(ctx, A, [polyA], env, { edges: [front], seed: env.seed });
      const flapPoly = front.concat(flapEdge.slice().reverse());
      const gw = Math.max(1, curlW);
      const stops = P.rough < 0.08 ? [[0, 'rgba(0,0,0,0.28)'], [0.2, 'rgba(255,255,255,0.5)'], [0.45, 'rgba(255,255,255,0.1)'], [0.8, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.3)']] : null;
      D.flap(ctx, flapPoly, env, [cx + dx * f, cy + dy * f], [cx + dx * (f + gw), cy + dy * (f + gw)], { stops });
    },
  });

  // ---------- wedge: spear / mountain / V-notch bitten in from an edge ----------
  PT.fx.register({
    id: 'wedge', name: 'Spear / mountain / V bite', family: 'Tear & peel', sfx: 'rip', dur: 1.0,
    desc: 'A torn wedge bites in from one edge and grows until the new scene fills the frame.',
    params: [
      select('edge', 'From edge', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']], 'left'),
      range('pos', 'Position on edge', 0, 1, 0.01, 0.5),
      range('spread', 'Width (spear → mountain)', 0.02, 1, 0.01, 0.08),
      range('tilt', 'Tilt', -1, 1, 0.01, 0.1),
      range('rough', 'Tear roughness', 0, 1, 0.01, 0.6),
      range('curls', 'Curled flaps', 0, 1, 0.01, 0.6),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, e = env.E(p), diag = Math.hypot(W, H);
      const E = { left: [0, P.pos * H, 1, 0], right: [W, P.pos * H, -1, 0], top: [P.pos * W, 0, 0, 1], bottom: [P.pos * W, H, 0, -1] }[P.edge];
      const [bx, by, dx, dy] = E, nx = -dy, ny = dx;
      const L = S * 0.04 + e * diag * 1.35;
      const e3 = Math.pow(e, 3);
      const hw = Math.pow(e, 0.8) * (S * 0.12 + P.spread * diag) * (1 - e3) + e3 * 2.1 * Math.max(W, H) + S * 0.01;
      const tip = [bx + dx * L + nx * P.tilt * L * 0.35, by + dy * L + ny * P.tilt * L * 0.35];
      const b1 = [bx - dx * S * 0.05 + nx * hw, by - dy * S * 0.05 + ny * hw], b2 = [bx - dx * S * 0.05 - nx * hw, by - dy * S * 0.05 - ny * hw];
      const rough = P.rough * U.clamp(L / (S * 0.5), 0.25, 1);
      const side1 = U.tornLine(b1[0], b1[1], tip[0], tip[1], U.tornProfile(env.seed, rough, S), S / 160);
      const side2 = U.tornLine(tip[0], tip[1], b2[0], b2[1], U.tornProfile(env.seed + 5, rough, S), S / 160);
      const hole = side1.concat(side2.slice(1));
      ctx.drawImage(B, 0, 0);
      D.sheet(ctx, A, [D.frame(W, H), hole], env, { edges: [side1, side2], seed: env.seed });
      if (P.curls > 0 && e < 0.995) {
        [[side1, 1], [side2, -1]].forEach(([side, sg], si) => {
          const n = side.length, seg = side.slice(si ? Math.floor(n * 0.55) : 0, si ? n : Math.ceil(n * 0.45));
          if (seg.length < 3) return;
          const out = seg.map(([x, y], i) => {
            const t = i / (seg.length - 1), w = S * 0.07 * P.curls * Math.sin(Math.PI * t) * (0.7 + 0.3 * U.noise1(i * 0.2, env.seed + si)) * U.clamp(1.4 - e);
            return [x + nx * sg * w, y + ny * sg * w];
          });
          const m = seg[Math.floor(seg.length / 2)], mo = out[Math.floor(out.length / 2)];
          D.flap(ctx, seg.concat(out.reverse()), env, m, mo);
        });
      }
    },
  });

  // ---------- split: rip in two / curtain split / lips ----------
  PT.fx.register({
    id: 'split', name: 'Rip in two / curtain split', family: 'Tear & peel', sfx: 'rip', dur: 1.2,
    desc: 'The sheet tears along a line: halves fly apart, or the tear opens like curtains with curled lips.',
    params: [
      select('mode', 'Style', [['apart', 'Halves fly apart'], ['lips', 'Opens like curtains (curled lips)']], 'apart'),
      range('angle', 'Tear angle (°)', -90, 90, 1, 90),
      range('offset', 'Tear position', -0.4, 0.4, 0.01, 0),
      range('rough', 'Tear roughness', 0, 1, 0.01, 0.6),
      range('twist', 'Twist', 0, 1, 0.01, 0.4),
      range('taper', 'Lens shape (lips)', 0, 1, 0.01, 0.7),
      range('curl', 'Curled lips', 0, 1, 0.01, 0.6),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, e = env.E(p), diag = Math.hypot(W, H);
      const a = P.angle * Math.PI / 180, tx = Math.cos(a), ty = Math.sin(a), nx = -ty, ny = tx;
      const cx = W / 2 + nx * P.offset * S, cy = H / 2 + ny * P.offset * S, L = diag * 0.75, step = S / 170;
      ctx.drawImage(B, 0, 0);
      if (P.mode === 'lips') {
        const prof1 = U.tornProfile(env.seed, P.rough, S), prof2 = U.tornProfile(env.seed + 7, P.rough, S);
        const vis = Math.abs(W * tx) / 2 + Math.abs(H * ty) / 2 + 1, acrossHalf = Math.abs(W * nx) / 2 + Math.abs(H * ny) / 2 + Math.abs(P.offset) * S;
        const G = Math.pow(e, 1.8) * (acrossHalf / Math.max(0.1, 1 - P.taper * 0.2) + S * 0.06) + S * 0.004 * U.clamp(p * 20);
        const e1 = [], e2 = [];
        for (let u = -L; u <= L; u += step) {
          const g = G * Math.max(0.12, 1 - P.taper * Math.pow(u / vis, 2) * (1 - e * 0.8));
          e1.push([cx + tx * u + nx * (g + prof1(u + L) * U.clamp(G / (S * 0.05))), cy + ty * u + ny * (g + prof1(u + L) * U.clamp(G / (S * 0.05)))]);
          e2.push([cx + tx * u - nx * (g + prof2(u + L) * U.clamp(G / (S * 0.05))), cy + ty * u - ny * (g + prof2(u + L) * U.clamp(G / (S * 0.05)))]);
        }
        const hole = e1.concat(e2.slice().reverse());
        D.sheet(ctx, A, [D.frame(W, H), hole], env, { edges: [e1, e2], seed: env.seed });
        if (P.curl > 0) {
          const w = S * 0.06 * P.curl * Math.sin(Math.PI * U.clamp(e * 1.1));
          [[e1, 1], [e2, -1]].forEach(([edge, sg], i) => {
            const out = edge.map(([x, y], j) => { const k = 0.6 + 0.4 * U.noise1(j * 0.05, env.seed + i * 3); return [x + nx * sg * w * k, y + ny * sg * w * k]; });
            const m = edge[edge.length >> 1];
            D.flap(ctx, edge.concat(out.reverse()), env, m, [m[0] + nx * sg * w, m[1] + ny * sg * w]);
          });
        }
        return;
      }
      const prof = U.tornProfile(env.seed, P.rough, S);
      const line = [];
      for (let u = -L; u <= L; u += step) line.push([cx + tx * u + nx * prof(u + L), cy + ty * u + ny * prof(u + L)]);
      const far = diag;
      const half1 = line.concat([[cx + tx * L + nx * far, cy + ty * L + ny * far], [cx - tx * L + nx * far, cy - ty * L + ny * far]]);
      const half2 = line.concat([[cx + tx * L - nx * far, cy + ty * L - ny * far], [cx - tx * L - nx * far, cy - ty * L - ny * far]]);
      const dist = e * diag * 0.62 + S * 0.006 * U.clamp(p * 15), rot = P.twist * 0.32 * e;
      [[half1, 1], [half2, -1]].forEach(([poly, sg], i) => {
        const pivX = cx - tx * L * 0.6 * sg, pivY = cy - ty * L * 0.6 * sg;
        const ang = rot * sg, mx = nx * sg * dist, my = ny * sg * dist;
        const tf = D.moveTf(pivX, pivY, ang, mx, my);
        const dest = U.xform(poly, pivX, pivY, ang, mx, my), edge = U.xform(line, pivX, pivY, ang, mx, my);
        D.sheet(ctx, A, [dest], env, { tf, edges: [edge], seed: env.seed + i * 17 });
      });
    },
  });

  // ---------- hole: ragged hole with curled petals ----------
  PT.fx.register({
    id: 'hole', name: 'Hole rip with petals', family: 'Holes', sfx: 'rip', dur: 1.3,
    desc: 'A small nick grows into a ragged hole; triangular flaps fold back like petals.',
    params: [
      range('cx', 'Centre X', 0, 1, 0.01, 0.55),
      range('cy', 'Centre Y', 0, 1, 0.01, 0.45),
      range('petals', 'Petals', 4, 12, 1, 7),
      range('petal', 'Petal length', 0, 1, 0.01, 0.55),
      range('rough', 'Edge roughness', 0, 1, 0.01, 0.6),
      bool('keyhole', 'Pause half-open (keyhole)', false),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, cx = P.cx * W, cy = P.cy * H;
      const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
      let e;
      if (P.keyhole) e = p < 0.4 ? 0.36 * env.E(p / 0.4) : p < 0.62 ? 0.36 + 0.02 * (p - 0.4) / 0.22 : 0.38 + 0.62 * env.E((p - 0.62) / 0.38);
      else e = env.E(p);
      // smallest vertex is 0.78 R, so R = far/0.76 just clears the farthest corner at e = 1
      const R = Math.pow(e, 1.5) * (far / 0.76 + S * 0.02) + S * 0.012 * U.clamp(p * 12);
      const k = Math.round(P.petals), Rn = U.rng(env.seed);
      const verts = [];
      for (let i = 0; i < k; i++) {
        const ang = (i + (Rn() - 0.5) * 0.55) / k * Math.PI * 2 + env.seed;
        const r = R * (0.78 + Rn() * 0.36);
        verts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, ang]);
      }
      const rough = P.rough * U.clamp(R / (S * 0.35), 0.15, 1);
      const segs = [];
      for (let i = 0; i < k; i++) {
        const v0 = verts[i], v1 = verts[(i + 1) % k];
        segs.push(U.tornLine(v0[0], v0[1], v1[0], v1[1], U.tornProfile(env.seed + i * 3, rough, S), Math.max(2, S / 200)));
      }
      const hole = [].concat(...segs);
      ctx.drawImage(B, 0, 0);
      D.sheet(ctx, A, [D.frame(W, H), hole], env, { edges: [hole.concat([hole[0]])], seed: env.seed });
      if (P.petal <= 0) return;
      const plen = Math.min(S * 0.42, R * 0.6) * P.petal;
      for (let i = 0; i < k; i++) {
        const seg = segs[i], v0 = verts[i], v1 = verts[(i + 1) % k];
        let am = Math.atan2((v0[1] + v1[1]) / 2 - cy, (v0[0] + v1[0]) / 2 - cx);
        const mid = [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2];
        const len = plen * (0.65 + 0.7 * U.h1(i, env.seed + 2));
        const tip = [mid[0] + Math.cos(am) * len + Math.cos(am + 1.57) * len * 0.25 * (U.h1(i, env.seed) - 0.5), mid[1] + Math.sin(am) * len + Math.sin(am + 1.57) * len * 0.25 * (U.h1(i, env.seed) - 0.5)];
        const pr = U.tornProfile(env.seed + 50 + i, 0.5, S * 0.6);
        const s1 = U.tornLine(seg[seg.length - 1][0], seg[seg.length - 1][1], tip[0], tip[1], pr, S / 120);
        const s2 = U.tornLine(tip[0], tip[1], seg[0][0], seg[0][1], pr, S / 120, 999);
        D.flap(ctx, seg.concat(s1.slice(1), s2.slice(1)), env, mid, tip);
      }
    },
  });

  // ---------- torn window: a rectangle torn open from a thin sliver ----------
  PT.fx.register({
    id: 'window', name: 'Torn window', family: 'Holes', sfx: 'rip', dur: 1.6,
    desc: 'A thin torn slit opens, widens into a ragged rectangle, then fills the frame.',
    params: [
      select('first', 'Opens', [['v', 'Tall slit first'], ['h', 'Wide slit first']], 'v'),
      range('hold', 'Hold the window', 0, 0.6, 0.01, 0.25),
      range('size', 'Window size', 0.3, 0.95, 0.01, 0.72),
      range('rough', 'Edge roughness', 0, 1, 0.01, 0.45),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, hold = P.hold, a = (1 - hold) * 0.55, b = a + hold;
      const g1 = env.E(U.range(p, 0, a * 0.45)), g2 = env.E(U.range(p, a * 0.35, a)), g3 = env.E(U.range(p, b, 1));
      let hw, hh;
      const big = 0.5 * P.size;
      if (P.first === 'v') { hh = H * (0.05 + g1 * (big - 0.05)); hw = W * (0.004 + g2 * (big - 0.004)); }
      else { hw = W * (0.05 + g1 * (big - 0.05)); hh = H * (0.004 + g2 * (big - 0.004)); }
      hw += g3 * W * 0.8; hh += g3 * H * 0.8;
      const cx = W / 2, cy = H / 2, st = S / 170;
      const c = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
      const edges = [0, 1, 2, 3].map(i => U.tornLine(c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], U.tornProfile(env.seed + i * 5, P.rough * U.clamp(Math.min(hw, hh) / (S * 0.08), 0.2, 1), S), st));
      const hole = [].concat(...edges);
      ctx.drawImage(B, 0, 0);
      D.sheet(ctx, A, [D.frame(W, H), hole], env, { edges: [hole.concat([hole[0]])], seed: env.seed });
    },
  });

  const pr = PT.fx.preset;
  pr('peel-diag', 'Diagonal tear peel', 'peel', { angle: '135', rough: 0.65 }, 1.3, 'Tear sweeps corner to corner with a white curl');
  pr('peel-down', 'Top-down tear', 'peel', { angle: '90', rough: 0.6, bend: 0.1, curlAt: 0.15 }, 1.2);
  pr('peel-up', 'Bottom-up tear', 'peel', { angle: '270', rough: 0.6, bend: -0.2 }, 1.2);
  pr('peel-bites', 'Peel in three bites', 'peel', { angle: '180', rough: 0.75, bites: 3, curl: 0.45 }, 2.2, 'Paper comes away in separate bites');
  pr('page-curl', 'Clean page curl', 'peel', { angle: '225', rough: 0, curl: 0.85, bend: 0, curlAt: 0.5, rim: 0 }, 1.4, 'Smooth page-turn, no tearing');
  pr('spear', 'Spear from the left', 'wedge', { edge: 'left', spread: 0.06 }, 0.9);
  pr('mountain', 'Mountain from the bottom', 'wedge', { edge: 'bottom', spread: 0.55, pos: 0.45, tilt: 0 }, 1.0);
  pr('v-notch', 'V-notch from the top', 'wedge', { edge: 'top', spread: 0.32, pos: 0.4, tilt: 0.15 }, 1.0);
  pr('rip-two', 'Rip in two', 'split', { mode: 'apart', angle: 80 }, 1.2);
  pr('rip-two-h', 'Rip in two (horizontal)', 'split', { mode: 'apart', angle: 0, twist: 0.3 }, 1.2);
  pr('curtain', 'Curtain split', 'split', { mode: 'lips', angle: 90, taper: 0.8 }, 1.2, 'Vertical crack opens with curled lips');
  pr('lips', 'Horizontal crack (lips)', 'split', { mode: 'lips', angle: 0, taper: 0.9 }, 1.1);
  pr('strip-pull', 'Diagonal strip pull', 'split', { mode: 'lips', angle: -32, taper: 0.1, curl: 0.5 }, 1.0, 'Two parallel diagonal tears');
  pr('hole', 'Hole rip', 'hole', {}, 1.3, 'Most common look in the playlist');
  pr('hole-keyhole', 'Hole rip – keyhole pause', 'hole', { keyhole: true, cx: 0.5, cy: 0.5 }, 2.6);
  pr('hole-corner', 'Hole from a corner', 'hole', { cx: 0.85, cy: 0.2, petals: 6 }, 1.2);
  pr('window', 'Torn window', 'window', {}, 1.8);
})();
