// Family: Fire. Flame shapes are scrolling domain-warped fBm masked by a flickering
// envelope, mapped through a black-body ramp (white-yellow core -> orange -> deep red).
// Embers/sparks are seeded particles with colour-over-life; the burning edge eats a photo
// inward along a noise-shaped front (char + glowing rim + flames + smoke); heat shimmer
// displaces the real footage (strip-block redraw of the backdrop).
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  // flame field at a base point. o: { w, h (fractions), freq, rise, ramp, flicker, envelope }
  function flame(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.85 : p.y) * fh;
    const size = (p.size == null ? 1 : p.size), sp = (p.speed == null ? 1 : p.speed);
    const W = o.w * fw * size, H = o.h * fh * size;
    const x0 = ax - W / 2, y1 = ay, y0 = ay - H;
    const long = 110, fW = long, fH = Math.max(10, Math.round(long * H / W));
    const L = +p.loop || 0;
    const d = F.density(fW, fH, (u, v) => {
      const vv = 1 - v;                                                     // vv: 0 at top, 1 at base
      // per-column flickering flame height
      const hgt = 0.72 + 0.28 * (U.noise2(u * o.freq + t * sp * 2.6, t * sp * 2.1, seed) * 0.5 + 0.5);
      if (vv > hgt) return 0;
      // flame envelope: narrow tip, round base, with a ragged noise-torn silhouette
      const prog = vv / hgt;
      const rag = 0.34 + 0.62 * Math.pow(U.noise2(u * 13 + t * sp * 4.8, t * sp * 3.1, seed + 31) * 0.5 + 0.5, 0.8)
        + 0.28 * (U.noise2(u * 29 - t * sp * 5.2, 7.7, seed + 41) * 0.5 + 0.5);
      const half = Math.pow(Math.sin(Math.PI * Math.pow(prog, 0.72)), 0.62) * (0.5 - prog * 0.12) * rag;
      const du = Math.abs(u - 0.5);
      if (du > half) return 0;
      let env = U.clamp(1 - du / Math.max(0.001, half));
      env = env * env * (3 - 2 * env);
      // rising fire texture
      const q = U.loopNoise3(u * 3.4, vv * 2.6 + t * sp * 0.32, t * 0.22, L, seed + 5, 2);
      const n = U.loopNoise3(u * 4.2 + q * 1.4, vv * 3.1 + t * sp * 0.4 + q, t * 0.27, L, seed + 9, 3) * 0.5 + 0.5;
      return U.clamp(env * (0.55 + 0.45 * n) * (p.amount == null ? 1 : p.amount) * 1.3 * (1 - prog * 0.18));
    });
    const ramp = p.tint ? F.tintRamp(o.ramp, p.tint) : o.ramp;
    const c = F.sprite(d, fW, fH, ramp, 0.92 - (p.soft || 0) * 0.25);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.imageSmoothingEnabled = true;
    g.drawImage(c, 0, 0, fW, fH, x0, y0, W, H);
    g.restore();
    // ground glow, flickering
    const flick = 0.72 + 0.28 * (U.noise2(t * 5.2, 7.7, seed) * 0.5 + 0.5);
    const gl = (p.glow == null ? 0.5 : p.glow) * flick;
    if (gl > 0.01) {
      const gr = F.glow('#ff7a1a', Math.max(8, W * 0.5));
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = gl * 0.5;
      const gs = W * 3.2;
      g.drawImage(gr, ax - gs / 2, ay - gs * 0.42, gs, gs * 0.84);
      g.restore();
    }
  }

  // embers: seeded rising particles with colour over life + flicker
  function embers(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const size = (p.size == null ? 1 : p.size), sp = (p.speed == null ? 1 : p.speed);
    const n = Math.round(o.count * (p.amount == null ? 1 : p.amount));
    const L = +p.loop || o.life;
    const area = p.area || 'full';
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37), r4 = U.h1(i, seed + 51), r5 = U.h1(i, seed + 67);
      const bx = (p.x == null ? 0.5 : p.x) * fw + (r0 - 0.5) * o.spread * fw * size;
      const by = (p.y == null ? 0.85 : p.y) * fh + (r1 - 0.3) * o.spread * 0.3 * fh;
      const life = o.life * (0.7 + r2 * 0.6) / sp;
      const age = (((t / life) + r3) % 1 + 1) % 1;
      const wig = U.noise1(t * 1.7 + i * 9.1, seed + 5) * o.wiggle * fw * 0.02;
      const x = bx + (p.wind || 0) * age * fh * 0.3 * sp + wig + Math.sin(t * (1.1 + r4) + i) * fw * 0.004 * size;
      const y = by - age * o.rise * fh * size * sp;
      if (!X.inArea(x, y, area, fw, fh)) continue;
      // colour over life: white-yellow -> orange -> red -> dark
      const cIdx = U.clamp(age * 3.2);
      const col = cIdx < 1 ? U.mix('#ffe9a0', '#ff9b2e', cIdx) : cIdx < 2 ? U.mix('#ff9b2e', '#e03d0c', cIdx - 1) : U.mix('#e03d0c', '#7d1a06', cIdx - 2);
      const a = (0.35 + 0.65 * (1 - Math.pow(age, 1.6))) * (0.55 + 0.45 * Math.sin(t * (9 + r5 * 7) + i * 2.4)) * o.alpha;
      if (a <= 0.01) continue;
      const s = (o.sMin + r4 * o.sVar) * fw * 0.001 * size * (1 + age * 0.3);
      const spr = F.glow(col, Math.max(6, s * 10));
      g.globalAlpha = U.clamp(a);
      g.drawImage(spr, x - s * 5, y - s * 5, s * 10, s * 10);
      g.fillStyle = col; g.globalAlpha = U.clamp(a * 0.9);
      g.fillRect(x - s * 0.5, y - s * 0.5, s, s);
    }
    g.restore();
  }

  // sparks: ballistic streaks from burst points (bursts repeat every `period`, seeded offset)
  function sparks(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const size = (p.size == null ? 1 : p.size), sp = (p.speed == null ? 1 : p.speed);
    const nb = Math.max(1, Math.round(o.bursts * (p.amount == null ? 1 : p.amount)));
    const L = +p.loop > 0 ? +p.loop : o.period;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let b = 0; b < nb; b++) {
      const off = (b / nb) * L + U.h1(b, seed) * L * 0.12;                   // evenly spread: something is always bursting
      const age = (((t - off) % L) + L) % L;                                 // seconds since the last burst
      if (age > o.life * 1.8) continue;
      const bx = (p.x == null ? 0.5 : p.x) * fw + (U.h1(b, seed + 3) - 0.5) * o.spread * fw;
      const by = (p.y == null ? 0.7 : p.y) * fh + (U.h1(b, seed + 5) - 0.5) * o.spread * 0.3 * fh;
      const nk = o.per;
      for (let i = 0; i < nk; i++) {
        const a0 = U.h1(i * 7 + b * 131, seed + 9) * U.TAU;
        const v0 = (0.35 + U.h1(i * 7 + b * 131, seed + 13) * 0.65) * o.v0 * sp * fw;
        const tt = age * (0.8 + U.h1(i, seed + b) * 0.4);
        const vx = Math.cos(a0) * v0, vy = Math.sin(a0) * v0 * 0.7;
        const x = bx + vx * tt, y = by + vy * tt + o.grav * fw * tt * tt;
        const dtp = 0.035;
        const pvx = bx + vx * (tt - dtp), pvy = by + vy * (tt - dtp) + o.grav * fw * Math.pow(Math.max(0, tt - dtp), 2);
        const fade = Math.max(0, 1 - age / (o.life * (0.7 + U.h1(i, seed + 21) * 0.5)));
        if (fade <= 0.02) continue;
        const col = U.mix('#fff3c0', '#ff7a1a', U.clamp(age * 2.4));
        g.strokeStyle = col;
        g.globalAlpha = U.clamp(fade * 0.95);
        g.lineWidth = Math.max(1.6, fw * 0.0042 * size * (0.5 + fade * 0.6));
        g.beginPath(); g.moveTo(pvx, pvy); g.lineTo(x, y); g.stroke();
      }
      // flash at burst + a hot ember glow that lingers (short-circuit / grinding metal)
      if (age < 0.2) {
        const fl = F.glow('#ffc86e', fw * 0.1);
        g.globalAlpha = Math.pow(1 - age / 0.2, 1.3) * 0.95;
        const gs = fw * 0.2 * size;
        g.drawImage(fl, bx - gs / 2, by - gs / 2, gs, gs);
      } else if (age < o.life * 1.4) {
        const emb = Math.max(0, 1 - age / (o.life * 1.4));
        g.globalAlpha = emb * 0.5;
        const gs = fw * 0.055 * size * (0.7 + 0.3 * Math.sin(t * 13 + b * 3));
        const fl = F.glow('#ff9a3a', gs);
        g.drawImage(fl, bx - gs, by - gs, gs * 2, gs * 2);
      }
    }
    g.restore();
  }

  // burning edge: noise-shaped front eats inward from the frame edges
  function burnEdge(g, p, E) {
    const { fw, fh, bd, k } = E, t = E.t, seed = E.seed | 0;
    const pr = U.ease.inOut(U.clamp(t / (E.dur * 0.88)));                    // finishes ~p0.88, then holds
    if (pr <= 0.001) return;
    const reach = (p.size == null ? 0.45 : p.size) * 0.5;                    // how far it eats in
    const long = 168, fW = long, fH = Math.max(10, Math.round(long * fh / fw));
    const amt = p.amount == null ? 1 : p.amount;
    // signed burn depth per pixel (positive = burnt)
    const d = F.density(fW, fH, (u, v) => {
      const nT = U.fbm2(u * 3.1, 17.3, seed, 3), nB = U.fbm2(u * 3.1, 91.7, seed + 3, 3);
      const nL = U.fbm2(57.1, v * 3.1, seed + 7, 3), nR = U.fbm2(133.9, v * 3.1, seed + 11, 3);
      const fT = pr * reach * (0.35 + 0.65 * (nT * 0.5 + 0.5));
      const fB = pr * reach * (0.35 + 0.65 * (nB * 0.5 + 0.5));
      const fL = pr * reach * (0.35 + 0.65 * (nL * 0.5 + 0.5));
      const fR = pr * reach * (0.35 + 0.65 * (nR * 0.5 + 0.5));
      const dep = Math.min(v - fT, (1 - v) - fB, u - fL, (1 - u) - fR);     // >0 = untouched
      return -dep;                                                          // density = burn depth
    });
    const ramp = p.tint ? F.tintRamp(F.R.char, p.tint) : F.R.char;
    const c = F.sprite(d, fW, fH, [[0, [26, 20, 16, 0]], [0.02, [24, 17, 12, 40]], [0.2, [18, 12, 8, 215]], [1, [10, 7, 5, 248]]], 0.85);
    g.save();
    g.globalAlpha = U.clamp(0.96 * Math.min(1, amt));
    g.imageSmoothingEnabled = true;
    g.drawImage(c, 0, 0, fW, fH, 0, 0, fw, fh);
    g.restore();
    // glowing rim + flame licks + smoke along the front (sampled points)
    const flick = 0.7 + 0.3 * (U.noise2(t * 6.1, 3.3, seed) * 0.5 + 0.5);
    const rimA = U.clamp(pr > 0.02 ? 1 : pr / 0.02) * (p.glow == null ? 0.85 : p.glow) * flick;
    if (rimA > 0.02) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const u = (i + 0.5) / 26, side = U.h1(i, seed + 29) * 4 | 0;
        let x, y;
        if (side === 0) { x = u * fw; y = pr * reach * (0.35 + 0.65 * (U.fbm2(u * 3.1, 17.3, seed, 3) * 0.5 + 0.5)) * fh; }
        else if (side === 1) { x = u * fw; y = fh - pr * reach * (0.35 + 0.65 * (U.fbm2(u * 3.1, 91.7, seed + 3, 3) * 0.5 + 0.5)) * fh; }
        else if (side === 2) { x = pr * reach * (0.35 + 0.65 * (U.fbm2(57.1, u * 3.1, seed + 7, 3) * 0.5 + 0.5)) * fw; y = u * fh; }
        else { x = fw - pr * reach * (0.35 + 0.65 * (U.fbm2(133.9, u * 3.1, seed + 11, 3) * 0.5 + 0.5)) * fw; y = u * fh; }
        if (U.h1(i, seed + 41) > 0.55) continue;
        const gl = F.glow('#ff8c1e', fw * 0.02);
        const gs = fw * (0.05 + U.h1(i, seed + 43) * 0.06) * (0.7 + 0.3 * Math.sin(t * 7 + i));
        g.globalAlpha = rimA * (0.35 + U.h1(i, seed + 47) * 0.4);
        g.drawImage(gl, x - gs / 2, y - gs / 2, gs, gs);
      }
      g.restore();
      // flame licks at the strongest points (drawn as tiny flames above the front)
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const u = 0.1 + U.h1(i, seed + 53) * 0.8;
        const yF = pr * reach * (0.35 + 0.65 * (U.fbm2(u * 3.1, 17.3, seed, 3) * 0.5 + 0.5)) * fh;
        const xF = u * fw + (U.h1(i, seed + 59) - 0.5) * fw * 0.1;
        const s = fw * (0.018 + U.h1(i, seed + 61) * 0.02);
        const wob = Math.sin(t * 9 + i * 2) * s * 0.25;
        const gr = g.createLinearGradient(xF, yF - s * 4, xF, yF + s);
        gr.addColorStop(0, 'rgba(255,120,20,0)');
        gr.addColorStop(0.55, U.rgba('#ff8c1e', 0.5 * rimA));
        gr.addColorStop(1, U.rgba('#ffd76a', 0.85 * rimA));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(xF - s * 0.7, yF);
        g.quadraticCurveTo(xF - s * (0.9 + wob * 0.1), yF - s * 2.2, xF + wob, yF - s * (3.4 + U.h1(i, seed + 67) * 1.6));
        g.quadraticCurveTo(xF + s * (0.9 - wob * 0.1), yF - s * 2.2, xF + s * 0.7, yF);
        g.closePath(); g.fill();
      }
      g.restore();
      // smoke rising from the rim
      VFX.fx.byId['sm-column'].draw(g, Object.assign({}, p, { x: 0.5, y: -0.2, size: (p.size || 1) * 0.8, amount: (p.amount || 1) * 0.5, speed: (p.speed || 1) * 0.8, wind: p.wind || 0, soft: 0.7, loop: 0, tint: p.tint2 || null }),
        Object.assign({}, E, { seed: seed + 777 }));
    }
  }

  // heat shimmer: strip-block displacement of the backdrop (the user's footage).
  // Strongest near the heat source (bottom), fading with height.
  function heat(g, p, E) {
    const { fw, fh, bd, k } = E, t = E.t, seed = E.seed | 0;
    if (!bd || E.mode === 'alpha' || E.mode === 'matte') return;             // needs real footage under it
    const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.98 : p.y) * fh;
    const H = fh * 0.9 * (p.size == null ? 1 : p.size);
    const amp = fw * 0.021 * (p.amount == null ? 0.8 : p.amount) * 1.8;
    const sp = (p.speed == null ? 1 : p.speed);
    const soft = p.soft == null ? 0.5 : p.soft;
    const bw = fw / 22, bh = H / 26;
    g.save();
    for (let by = 0; by < 26; by++) {
      const v = by / 26;                                                     // 0 top of zone, 1 at the source
      const prof = Math.pow(v, 1.25);                                        // strong near the source, still lively at mid height
      if (prof < 0.04) continue;
      for (let bx = 0; bx < 22; bx++) {
        const u = bx / 22;
        const dx = (U.noise2(u * (5 + soft * 7) + t * sp * 3.2, v * 7 - t * sp * 2.6, seed) * 0.7
          + U.noise2(u * 12, v * 16 - t * sp * 6.5, seed + 7) * 0.3) * amp * prof;
        const x = bx * bw, y = ay - H + v * H;
        g.drawImage(bd, x * k, y * k, bw * k + 1, bh * k + 1, x + dx, y, bw + 1.5, bh + 1.5);
        // brightness shimmer: heat also bends light up/down, so add a faint moving veil
        const sh = U.clamp(Math.abs(dx) / (amp * prof || 1)) * prof;
        if (sh > 0.06) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.07 * sh;
          g.fillStyle = '#ffe9c0';
          g.fillRect(x, y, bw + 1.5, bh + 1.5);
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1;
        }
      }
    }
    g.restore();
  }

  // ================= effects =================
  X.register({
    id: 'fi-torch', name: 'Torch flame', fam: 'Fire',
    note: 'A small torch or lamp flame with a hot flickering core and warm ground glow.',
    dur: 8, x: 0.5, y: 0.8,
    params: [P.amount(1), P.size(0.8), P.speed(1), P.wind(0), P.tint(null), P.glow(0.55), P.loop(0)],
    fields: [],
    draw(g, p, E) { flame(g, p, E, { w: 0.08, h: 0.17, freq: 5.5, ramp: F.R.flame }); embers(g, p, E, { count: 6, life: 1.6, rise: 0.12, spread: 0.014, wiggle: 2, alpha: 0.6, sMin: 1.1, sVar: 0.8 }); },
  });

  X.register({
    id: 'fi-campfire', name: 'Campfire', fam: 'Fire',
    note: 'A campfire cluster — several small flames in an arc, ember lift and a strong warm glow on the ground.',
    dur: 10, x: 0.5, y: 0.82,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.glow(0.65), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const seed = E.seed | 0;
      for (let i = 0; i < 5; i++) {
        const dx = (U.h1(i, seed + 3) - 0.5) * 0.09, sc = 0.55 + U.h1(i, seed + 5) * 0.6;
        flame(g, Object.assign({}, p, { x: (p.x == null ? 0.5 : p.x) + dx, y: p.y, size: (p.size || 1) * sc, tint: p.tint, glow: 0 }),
          Object.assign({}, E, { seed: seed + i * 101 }), { w: 0.05, h: 0.11, freq: 5, ramp: F.R.flame });
      }
      embers(g, p, E, { count: 14, life: 2.4, rise: 0.16, spread: 0.05, wiggle: 2.6, alpha: 0.7, sMin: 1, sVar: 1.2 });
    },
  });

  X.register({
    id: 'fi-building', name: 'Building fire', fam: 'Fire',
    note: 'A large building / wreck fire — a wide wall of flame with heavy dark smoke above it and embers rising.',
    dur: 12, x: 0.5, y: 0.9,
    params: [P.amount(1.1), P.size(1.25), P.speed(0.9), P.wind(0), P.tint(null), P.glow(0.75), P.soft(0.5)],
    fields: [],
    draw(g, p, E) {
      flame(g, p, E, { w: 0.34, h: 0.3, freq: 2.6, ramp: F.R.fireball });
      const seed = E.seed | 0;
      for (let i = 0; i < 4; i++) {
        flame(g, Object.assign({}, p, { x: 0.5 + (U.h1(i, seed + 9) - 0.5) * 0.3, size: (p.size || 1) * (0.5 + U.h1(i, seed + 13) * 0.5), glow: 0 }),
          Object.assign({}, E, { seed: seed + i * 211 }), { w: 0.09, h: 0.2, freq: 3.4, ramp: F.R.flame });
      }
      embers(g, p, E, { count: 26, life: 3.4, rise: 0.5, spread: 0.24, wiggle: 3, alpha: 0.7, sMin: 1.1, sVar: 1.4 });
      VFX.fx.byId['sm-war-black'].draw(g, Object.assign({}, p, { y: (p.y || 0.9) - 0.22, size: (p.size || 1) * 1.15, amount: 0.85 }), Object.assign({}, E, { seed: seed + 999 }));
    },
  });

  X.register({
    id: 'fi-line', name: 'Line of fire', fam: 'Fire',
    note: 'A horizontal line of fire — a fire front, trench or burning barricade, seen from the side.',
    dur: 10, x: 0.5, y: 0.85,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.glow(0.7), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const seed = E.seed | 0, n = 12, x0 = p.x == null ? 0.5 : p.x, y0 = p.y == null ? 0.85 : p.y;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const sc = 0.5 + U.noise2(u * 3.3, 5.5, seed) * 0.45 + 0.25;
        flame(g, Object.assign({}, p, { x: x0 + (u - 0.5) * 0.84, y: y0 + (U.h1(i, seed + 3) - 0.5) * 0.015, size: (p.size || 1) * sc, glow: 0 }),
          Object.assign({}, E, { seed: seed + i * 137 }), { w: 0.055, h: 0.115, freq: 5, ramp: F.R.flame });
      }
      embers(g, p, E, { count: 22, life: 2.6, rise: 0.24, spread: 0.44, wiggle: 2.4, alpha: 0.65, sMin: 1, sVar: 1.1 });
    },
  });

  X.register({
    id: 'fi-embers', name: 'Burning embers', fam: 'Fire',
    note: 'Embers lifting from a fire — glowing sparks that cool from yellow to dark red as they rise and flicker out.',
    dur: 10, y: 0.9,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { embers(g, p, E, { count: 60, life: 4.5, rise: 0.85, spread: 0.85, wiggle: 3.4, alpha: 0.8, sMin: 1.1, sVar: 1.7 }); },
  });

  X.register({
    id: 'fi-sparks', name: 'Spark bursts', fam: 'Fire',
    note: 'Repeated bursts of flying sparks — electrical shorts, grinding metal, embers blowing. Bursts repeat on the loop.',
    dur: 8, x: 0.5, y: 0.6,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.loop(0)],
    fields: [],
    draw(g, p, E) { sparks(g, p, E, { bursts: 3, period: 2.2, per: 40, v0: 0.38, grav: 0.62, life: 1.2, spread: 0.12 }); },
  });

  X.register({
    id: 'fi-burn-edge', name: 'Burning edge', fam: 'Fire',
    note: 'The frame itself burns: a glowing front eats inward from the edges with char, flame licks, embers and smoke. Put it over a photo (composite).',
    dur: 6,
    params: [P.amount(1), P.size(0.45), P.speed(1), P.wind(0), P.tint(null), P.glow(0.85)],
    fields: [],
    draw(g, p, E) { burnEdge(g, p, E); embers(g, Object.assign({}, p, { y: 0.5 }), E, { count: 20, life: 3, rise: 0.3, spread: 0.9, wiggle: 3, alpha: 0.55, sMin: 1, sVar: 1.2 }); },
  });

  X.register({
    id: 'fi-heat', name: 'Heat shimmer', fam: 'Fire',
    note: 'Heat haze rising from the ground — it visibly bends the footage under it (works in composite mode over your clip).',
    dur: 10, x: 0.5, y: 1,
    params: [P.amount(0.8), P.size(1), P.speed(1), { k: 'soft', label: 'Ripple width', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 }],
    fields: [],
    draw(g, p, E) { heat(g, p, E); },
  });
})();
