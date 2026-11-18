// Family: Smoke & fog. Rising columns (thin / thick black war / white chimney), drifting
// ground fog, rolling fog bank, impact puff, battlefield smoke wall.
// Method A "column field": a small density grid computed with domain-warped fBm advected
// upward (the noise scrolls up while the plume meanders) -> colour ramp -> smooth upscale.
// Method B "puff soup": cached noise-modulated puff sprites, born/dying on a loop — the
// look of real filmed smoke elements. Both are seeded and time-looping.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx;
  const P = VFX.pars = VFX.pars || {};

  // ---- shared param builders (used across families) ----
  P.amount = (def = 1, max = 2) => ({ k: 'amount', label: 'Amount / density', sec: 'Look', type: 'range', min: 0, max, step: 0.01, def });
  P.size = (def = 1, max = 3) => ({ k: 'size', label: 'Size', sec: 'Look', type: 'range', min: 0.2, max, step: 0.01, def });
  P.speed = (def = 1, max = 4) => ({ k: 'speed', label: 'Speed', sec: 'Motion', type: 'range', min: 0, max, step: 0.01, def });
  P.wind = (def = 0) => ({ k: 'wind', label: 'Wind (left ↔ right)', sec: 'Motion', type: 'range', min: -1, max: 1, step: 0.01, def });
  P.tint = (def) => ({ k: 'tint', label: 'Tint', sec: 'Look', type: 'color', def });
  P.soft = (def = 0.5) => ({ k: 'soft', label: 'Softness', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def });
  P.loop = (def = 0) => ({ k: 'loop', label: 'Loop length (s, 0 = free run)', sec: 'Motion', type: 'range', min: 0, max: 24, step: 0.5, def });
  P.area = (def = 'full') => ({ k: 'area', label: 'Where it shows', sec: 'Area', type: 'select', options: X.AREAS, def });
  P.glow = (def = 0.4, label = 'Glow / brightness') => ({ k: 'glow', label, sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def });
  // flash envelope with restrikes (flicker curve for muzzle / artillery / lightning light)
  P.flashEnv = (w, seed) => {
    const key = Math.floor(w * 60);                                        // per-frame flicker
    const seq = [1, 0.35, 0.85, 0.25, 0.55, 0.12, 0.3, 0];
    const i = Math.min(seq.length - 1, Math.floor(w * 46));
    const jitter = 0.75 + 0.25 * U.h1(key, seed);
    return (seq[i] || 0) * jitter;
  };

  // loop-time helper
  const zt = (t, L) => L > 0 ? { m: ((t % L) + L) % L, w: (((t % L) + L) % L) / L } : null;
  P.puffs = puffs;   // shared with other families (dust impacts etc.)

  // ================= rising column (field method) =================
  // o: { w0, w1 (fractions of fw at base/top), ramp, rise (design px/s), warp, scroll, soot, meander, turbulent }
  function column(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.86 : p.y) * fh;
    const size = p.size == null ? 1 : p.size;
    const H = Math.max(fh * 0.5, (ay + fh * 0.35)) * 1.02;                 // reach past the top edge
    const Wmax = Math.max(o.w0, o.w1) * fw * size * 1.9 + fw * 0.02;
    const x0 = Math.max(-Wmax, ax - Wmax), x1 = Math.min(fw + Wmax, ax + Wmax);
    const bw = x1 - x0;
    const long = 132;                                                       // fixed field budget -> preview == export
    const fW = long, fH = Math.max(8, Math.round(long * H / bw));
    const L = +p.loop || 0;
    const rise = o.rise * (p.speed == null ? 1 : p.speed);
    const d = F.density(fW, fH, (u, v) => {
      const hgt = v;                                                        // 0 at source, 1 at top
      const bend = (p.wind || 0) * hgt * hgt * 1.35
        + U.fbm2(hgt * 2.3, seed * 0.13 + 3, seed + 21, 2) * o.meander * (0.15 + hgt) * 2.2;
      const spine = 0.5 + bend * (bw / H) * 0.62;                           // keep bend in box units
      const wid = U.lerp(o.w0, o.w1, U.smooth(U.clamp(hgt * 1.15))) * fw * size / bw;
      const du = u - spine;
      let dens = U.clamp(1 - Math.abs(du) / wid);
      dens = dens * dens * (3 - 2 * dens);
      // rising, domain-warped turbulence (scrolls upward -> the plume boils); time loops if asked
      const q = U.loopNoise3(u * 2.4, v * 1.9 - t * rise * 0.0022, t * 0.1, L, seed + 5, 2);
      const n = U.loopNoise3(u * 3.1 + q * o.warp, v * 2.1 - t * rise * 0.0026 + q * 0.7, t * 0.14, L, seed + 9, 3);
      dens *= (o.laminar0 + (1 - o.laminar0) * hgt) * (0.5 + 0.5 * Math.pow(n * 0.5 + 0.5, 1.5)) * (o.turb + (1 - o.turb) * hgt);
      dens *= U.smooth(U.range(1 - hgt, 0.01, 0.22));                        // fully soft at the base (no hard bottom edge)
      return U.clamp(dens * (p.amount == null ? 1 : p.amount) * 1.25);
    });
    const ramp = p.tint ? F.tintRamp(o.ramp, p.tint) : o.ramp;
    const c = F.sprite(d, fW, fH, ramp, 1.05 - (p.soft || 0) * 0.35);
    g.save();
    g.imageSmoothingEnabled = true;
    // one continuous pass (no second overlay pass: it left visible rectangle seams)
    g.drawImage(c, 0, 0, fW, fH, x0, ay - H, bw, H);
    g.restore();
  }

  // ================= puff soup (sprite method) =================
  // o: { count, life, rise, size0, size1, spread, style, ramp, rot, fade }
  function puffs(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.8 : p.y) * fh;
    const size = (p.size == null ? 1 : p.size), speed = (p.speed == null ? 1 : p.speed);
    const life = o.life / speed;
    const n = Math.round(o.count * (p.amount == null ? 1 : p.amount));
    const one = !!o.once;                                                   // one-shot (impact puff)
    const hold = one ? E.dur * 0.9 : 0;
    g.save();
    for (let i = 0; i < n; i++) {
      const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 101), r2 = U.h1(i, seed + 202), r3 = U.h1(i, seed + 303), r4 = U.h1(i, seed + 404), r5 = U.h1(i, seed + 505);
      let age;
      if (one) {
        const t0 = r0 * o.stagger;
        age = U.clamp((t - t0) / (life * 1.6), 0, 1.35);
        if (t < t0) continue;
      } else age = (((t / life) + r0) % 1 + 1) % 1;
      const tc = one ? Math.min(age, hold / (life * 1.6)) : age;             // finish near p≈0.9, then hold size/alpha
      const drift = one ? U.clamp(age, 0, 1.15) : age;
      const rise = o.rise * size * speed * (0.7 + r1 * 0.6);
      const wob = U.noise2(drift * 2 + i * 3.7, seed * 0.1, seed + 7) * o.wobble * fw * 0.04;
      const x = ax + (r2 - 0.5) * o.spread * fw * size + (p.wind || 0) * drift * fh * 0.35 + wob + U.noise1(t * 0.5 + i, seed + 31) * fw * 0.006 * (one ? 0 : 1);
      const y = ay - rise * drift * fh + (r3 - 0.5) * o.spread * 0.3 * fh * size * (one ? drift : age);
      const s = U.lerp(o.size0, o.size1, tc) * fw * size * (0.8 + r4 * 0.5);
      let a = Math.pow(Math.sin(Math.PI * U.clamp(tc, 0, 1)), 0.72) * o.alpha;
      if (one) a = Math.pow(Math.max(0, 1 - tc * 0.92), 0.8) * o.alpha * U.range(age, 0, 0.06);
      if (a <= 0.004) continue;
      const spr = F.puff(seed + (i % 5) * 77, o.style);
      g.globalAlpha = U.clamp(a) * (p.amount == null ? 1 : 0.7 + 0.3 * Math.min(1, p.amount));
      const rot = r5 * U.TAU + t * (o.rot || 0.12) * (r1 > 0.5 ? 1 : -1);
      g.translate(x, y); g.rotate(rot);
      g.drawImage(spr, -s / 2, -s / 2, s, s);
      g.rotate(-rot); g.translate(-x, -y);
    }
    g.restore();
  }

  // ================= effects =================
  X.register({
    id: 'sm-column', name: 'Rising smoke column', fam: 'Smoke & fog',
    note: 'A single smoke column rising from one point — thin and laminar at the base, breaking into turbulence as it climbs. Set the position on the source (chimney, wreck, pyre).',
    dur: 8, x: 0.5, y: 0.88,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.soft(0.5), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      column(g, p, E, { w0: 0.017, w1: 0.17, ramp: F.R.smokeGrey, rise: 300, warp: 1.8, scroll: 1, meander: 0.19, laminar0: 0.62, turb: 0.42 });
      // billow puffs riding up the plume (breaks the smooth 'light shaft' read)
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const ax = (p.x == null ? 0.5 : p.x) * fw, size = p.size || 1;
      g.save();
      for (let i = 0; i < 12; i++) {
        const r0 = U.h1(i, seed + 61), r1 = U.h1(i, seed + 71), r2 = U.h1(i, seed + 81);
        const life = 4.5 / (p.speed || 1);
        const age = (((t / life) + r0) % 1 + 1) % 1;
        const hgt = age;
        const bend = (p.wind || 0) * hgt * hgt * fh * 0.55 + U.fbm2(hgt * 2.3, seed * 0.13 + 3, seed + 21, 2) * fh * 0.12 * (0.15 + hgt);
        const x = ax + bend + (r1 - 0.5) * fw * (0.02 + hgt * 0.12) * size;
        const y = (p.y == null ? 0.88 : p.y) * fh - hgt * fh * 0.82;
        const s2 = fw * U.lerp(0.025, 0.15, U.smooth(hgt)) * size * (0.8 + r2 * 0.5);
        g.globalAlpha = Math.pow(Math.sin(Math.PI * U.clamp(age, 0.03, 0.97)), 0.8) * 0.42 * (p.amount == null ? 1 : p.amount);
        const spr = F.puff(seed + i * 13, 'wispy');
        g.translate(x, y); g.rotate(r1 * U.TAU + t * 0.3);
        g.drawImage(spr, -s2 / 2, -s2 / 2, s2, s2);
        g.translate(-x, -y); g.rotate(-(r1 * U.TAU + t * 0.3));
      }
      g.restore();
    },
  });

  X.register({
    id: 'sm-war-black', name: 'Thick black war smoke', fam: 'Smoke & fog',
    note: 'Heavy black smoke of burning oil and rubble — the war-footage column. Dense dark core, cold grey rim, slow billowing climb.',
    dur: 10, x: 0.5, y: 0.92,
    params: [P.amount(1.15), P.size(1.2), P.speed(0.75), P.wind(0), P.tint(null), P.soft(0.6), P.loop(0)],
    fields: [],
    draw(g, p, E) { column(g, p, E, { w0: 0.05, w1: 0.3, ramp: F.R.warBlack, rise: 170, warp: 2.1, scroll: 0.8, meander: 0.1, laminar0: 0.8, turb: 0.15 }); },
  });

  X.register({
    id: 'sm-chimney', name: 'White chimney smoke', fam: 'Smoke & fog',
    note: 'Light grey-white smoke from a chimney or stove, puffs detaching and dissolving as they rise.',
    dur: 8, x: 0.5, y: 0.85,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.soft(0.55), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      puffs(g, p, E, { count: 30, life: 7.5, rise: 0.8, size0: 0.05, size1: 0.34, spread: 0.04, style: 'soft', alpha: 0.5, wobble: 2.4, rot: 0.3 });
      puffs(g, Object.assign({}, p, { seed: (E.seed | 0) + 911 }), E, { count: 10, life: 9, rise: 0.62, size0: 0.1, size1: 0.5, spread: 0.03, style: 'wispy', alpha: 0.32, wobble: 3, rot: 0.2 });
    },
  });

  X.register({
    id: 'sm-ground-fog', name: 'Drifting ground fog', fam: 'Smoke & fog',
    note: 'A low fog layer lying on the ground, drifting sideways. Loops seamlessly at the loop length.',
    dur: 10, y: 0.95,
    params: [P.amount(0.9), P.size(1), P.speed(0.6), P.wind(0.25), P.tint(null), P.soft(0.75), P.loop(8), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const base = (p.y == null ? 0.95 : p.y) * fh;
      const H = fh * 0.55 * (p.size || 1);
      const long = 160, fW = long, fH = Math.max(10, Math.round(long * H / fw * 0.75));
      const L = +p.loop || 0, sp = (p.speed || 0.6);
      const drift = (p.wind || 0) * sp * 0.9 + 0.22;
      const d = F.density(fW, fH, (u, v) => {
        const q = U.loopNoise3(u * 1.8 + t * drift, v * 1.6, t * 0.1, L, seed + 5, 2);
        const n = U.loopNoise3(u * 1.9 + q * 1.5 - t * drift, v * 2.0 + q, t * 0.13, L, seed + 9, 3);
        const n01 = n * 0.5 + 0.5;
        // big defined billows: contrast-boosted noise, dense on the ground, irregular feathered top
        const billow = Math.pow(n01, 1.6) * 1.9;
        const band = U.smooth(U.range(v, 0.06, 0.42));
        return U.clamp(band * billow * U.clamp(0.4 + (p.amount || 1) * 0.75) - 0.05);
      });
      const ramp = p.tint ? F.tintRamp(F.R.groundFog, p.tint) : F.R.groundFog;
      const c = F.sprite(d, fW, fH, ramp, 1 - (p.soft || 0) * 0.3);
      g.save(); g.imageSmoothingEnabled = true;
      g.drawImage(c, 0, 0, fW, fH, -fw * 0.02, base - H, fw * 1.04, H * 1.35);
      g.restore();
    },
  });

  X.register({
    id: 'sm-fog-bank', name: 'Rolling fog bank', fam: 'Smoke & fog',
    note: 'A whole bank of fog rolling through the frame — big soft masses moving with the wind, several deep layers.',
    dur: 12, y: 0.8,
    params: [P.amount(1), P.size(1.1), P.speed(0.8), P.wind(0.5), P.tint(null), P.soft(0.8), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const sp = (p.speed || 0.8), wind = (p.wind || 0);
      g.save();
      for (let l = 0; l < 3; l++) {
        const depth = l / 2, dir = wind >= 0 ? 1 : -1;
        const drift = (0.1 + 0.16 * sp + Math.abs(wind) * 0.5) * (1 - depth * 0.35) * dir;
        const yC = fh * (0.9 - l * 0.16), H = fh * (0.42 - l * 0.06) * (p.size || 1);
        const long = 150, fW = long, fH = Math.max(10, Math.round(long * H / fw * 0.8));
        const d = F.density(fW, fH, (u, v) => {
          const q = U.fbm3(u * 1.6 + t * drift, v * 1.6, t * 0.07, seed + l * 37 + 5, 2);
          const n = U.fbm3(u * 2.1 + q * 1.4 + t * drift, v * 2.2 + q, t * 0.1, seed + l * 37 + 9, 3) * 0.5 + 0.5;
          const band = Math.pow(Math.sin(Math.PI * U.clamp(v * 0.9 + 0.05)), 0.6);
          return U.clamp(band * n * (1.05 - depth * 0.3) * (0.5 + 0.5 * (p.amount || 1)) - 0.08);
        });
        const ramp = p.tint ? F.tintRamp(F.R.groundFog, p.tint) : F.R.groundFog;
        const c = F.sprite(d, fW, fH, ramp, 1.15 - (p.soft || 0) * 0.4);
        g.globalAlpha = 0.8 - depth * 0.15;
        g.imageSmoothingEnabled = true;
        g.drawImage(c, 0, 0, fW, fH, -fw * 0.03, yC - H, fw * 1.06, H);
      }
      g.restore();
    },
  });

  X.register({
    id: 'sm-impact-puff', name: 'Impact smoke puff', fam: 'Smoke & fog',
    note: 'The burst of smoke that follows a hit — puffs explode outward, then drift and dissolve. One-shot: it finishes and holds.',
    dur: 3, x: 0.5, y: 0.72,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.soft(0.6)],
    fields: [],
    draw(g, p, E) {
      // quick initial ring of dust + the rising puffs
      puffs(g, p, E, { count: 16, life: 2.2, rise: 0.32, size0: 0.06, size1: 0.42, spread: 0.16, style: 'wispy', alpha: 0.62, wobble: 2.2, rot: 0.5, once: true, stagger: 0.34 });
      const pr = U.clamp(E.t / (E.dur * 0.28));
      if (pr < 1) {
        // low, flat ground-burst skirt of dust (no outline ring: it read like a UI ellipse)
        const { fw, fh } = E, ax = (p.x || 0.5) * fw, ay = (p.y || 0.72) * fh;
        g.save();
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 0.4 * (1 - pr) * (p.amount || 1);
        const rr = fw * 0.03 + pr * fw * 0.15;
        const gr = g.createRadialGradient(ax, ay, 0, ax, ay, rr);
        gr.addColorStop(0, U.rgba(p.tint || '#a49c8e', 0.5));
        gr.addColorStop(0.7, U.rgba(p.tint || '#a49c8e', 0.2));
        gr.addColorStop(1, 'rgba(160,150,130,0)');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(ax, ay, rr, rr * 0.34, 0, 0, U.TAU); g.fill();
        g.restore();
      }
    },
  });

  X.register({
    id: 'sm-battlefield-wall', name: 'Battlefield smoke wall', fam: 'Smoke & fog',
    note: 'A long wall of smoke lying along the horizon — burning armour line, artillery barrage backdrop. Drifts slowly with the wind.',
    dur: 12, y: 0.8,
    params: [P.amount(1.05), P.size(1), P.speed(0.5), P.wind(0.3), P.tint(null), P.soft(0.7), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const yC = (p.y == null ? 0.8 : p.y) * fh;
      const H = fh * 0.4 * (p.size || 1);
      const long = 168, fW = long, fH = Math.max(10, Math.round(long * H / fw * 0.62));
      const L = +p.loop || 0, sp = p.speed || 0.5, drift = (p.wind || 0) * sp * 0.6 + 0.08;
      const d = F.density(fW, fH, (u, v) => {
        const q = U.fbm3(u * 1.5 + t * drift, v * 2.0, t * 0.08, seed + 5, 2);
        const n = U.fbm3(u * 2.6 + q * 2.1 + t * drift * 1.3, v * 3.2 + q * 1.6, L > 0 ? ((t * 0.12) % L) : t * 0.12, seed + 9, 3) * 0.5 + 0.5;
        // columns along the line: heavier sources, churning silhouette
        const src = 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(u * Math.PI * (2.2 + U.h1(seed, 3) * 3)) * 0.5 + 0.5), 1.4);
        const band = U.smooth(U.range(v, 0.02, 0.38)) * U.smooth(U.range(1 - v, -0.15, 0.42));   // feathered both ends
        return U.clamp(band * n * src * (0.55 + 0.5 * (p.amount || 1)) - 0.07);
      });
      const ramp = p.tint ? F.tintRamp(F.R.warBlack, p.tint) : F.R.warBlack;
      const c = F.sprite(d, fW, fH, ramp, 1.1 - (p.soft || 0) * 0.35);
      g.save(); g.imageSmoothingEnabled = true;
      g.drawImage(c, 0, 0, fW, fH, -fw * 0.02, yC - H, fw * 1.04, H * 1.2);
      g.restore();
    },
  });
})();
