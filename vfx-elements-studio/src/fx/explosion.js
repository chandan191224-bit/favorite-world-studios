// Family: Explosions & impacts. Seeded, physically plausible timing:
// muzzle flash 2-3 frames, fireball ~0.5 s, shockwave ring, ballistic debris, and smoke
// that keeps drifting long after the flash. One-shots finish near p≈0.92 and hold.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  // ballistic helper: position + previous position of a chunk launched at t0
  function ball(t0, t, x0, y0, vx, vy, grav) {
    const tt = Math.max(0, t - t0);
    return [x0 + vx * tt, y0 + vy * tt + grav * tt * tt, tt];
  }

  // ================= effects =================
  X.register({
    id: 'ex-muzzle', name: 'Muzzle flash', fam: 'Explosions & impacts',
    note: 'A 2-3 frame weapon muzzle flash with a star core, hot glow and a smoke wisp — repeats every couple of seconds on the loop.',
    dur: 6, x: 0.3, y: 0.62,
    params: [P.amount(1), P.size(1), P.speed(1), P.loop(1.5), { k: 'dir', label: 'Pointing (°, 0 = right)', sec: 'Area', type: 'range', min: -180, max: 180, step: 1, def: 0 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const L = +p.loop || 2;
      const bx = (p.x == null ? 0.5 : p.x) * fw, by = (p.y == null ? 0.6 : p.y) * fh;
      const ang = ((p.dir || 0) - 8) * Math.PI / 180;
      const size = (p.size == null ? 1 : p.size);
      const w = ((t % L) + L) % L;
      const sp = p.speed || 1;
      const ft = w * sp;                                                     // flash time 0..L
      g.save();
      if (ft < 0.12) {
        const env = P.flashEnv(ft, seed);
        const grow = 0.7 + U.clamp(ft / 0.05) * 0.5;
        const s = fw * 0.17 * size * (p.amount || 1) * grow;
        g.translate(bx, by); g.rotate(ang);
        g.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        // soft spikes: round glow sprites stretched into streaks (feathered at every end)
        const rays = 6;
        const raySpr = F.glow('#ffd9a0', 32);
        for (let k = 0; k < rays; k++) {
          const a2 = (k / rays) * U.TAU + U.h1(k, seed + 3) * 0.6;
          const len = s * (1.1 + U.h1(k, seed + 5) * 1.3);
          const wid = s * (0.3 + U.h1(k, seed + 7) * 0.22);
          g.save();
          g.rotate(a2);
          g.globalAlpha = U.clamp(env * 0.85);
          g.drawImage(raySpr, -s * 0.1, -wid / 2, len, wid);
          g.restore();
        }
        // hot core + bloom
        g.globalAlpha = U.clamp(env);
        const cg = F.glow('#fff1c8', s * 0.8);
        g.drawImage(cg, -s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
      }
      g.restore();
      // smoke after the flash: a dense gunsmoke puff train (clearly visible)
      if (ft > 0.05 && ft < 2.6) {
        const age = (ft - 0.05) / 2.55;
        g.save();
        for (let k = 0; k < 3; k++) {
          const a2 = U.clamp(age - k * 0.1);
          if (a2 <= 0) continue;
          const al = Math.pow(Math.max(0, 1 - a2), 0.85) * (p.amount || 1);
          const spr = F.puff(seed + 5 + k * 37, 'soft');
          const s2 = fw * (0.13 + a2 * 0.36) * size * (1 + k * 0.3);
          const wx = bx + Math.cos(ang) * s2 * 0.5 + (p.wind || 0) * a2 * fw * 0.1 + Math.sin(t * 2.2 + seed + k) * fw * 0.008;
          const wy = by + Math.sin(ang) * s2 * 0.5 - a2 * fh * 0.09 - k * fh * 0.02;
          const rot = U.h1(seed + k, 3) * U.TAU + t * 0.4;
          g.translate(wx, wy); g.rotate(rot);
          g.globalAlpha = U.clamp(al * 0.9);                                // two passes stack to near-full density
          g.drawImage(spr, -s2 / 2, -s2 / 2, s2, s2);
          g.drawImage(spr, -s2 * 0.42, -s2 * 0.42, s2 * 0.84, s2 * 0.84);
          g.rotate(-rot); g.translate(-wx, -wy);
        }
        g.restore();
      }
    },
  });

  X.register({
    id: 'ex-artillery', name: 'Distant artillery flashes', fam: 'Explosions & impacts',
    note: 'Flashes booming on the horizon — distant guns at random seeded times, each with a light pillar, sky flash and slow smoke after.',
    dur: 12, y: 0.74,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const hy = (p.y == null ? 0.74 : p.y) * fh;
      const n = Math.max(2, Math.round(5 * (p.amount || 1)));
      g.save();
      for (let i = 0; i < n; i++) {
        const period = 1.1 + U.h1(i, seed + 3) * 1.6;                         // frequent enough to always be alive
        const off = i === 0 ? 0.35 : U.h1(i, seed + 7) * period;              // first boom lands early, deterministically
        const cyc = Math.floor((t - off) / period);
        for (const c of [cyc, cyc + 1]) {
          const t0 = c * period + off;
          const w = t - t0;
          if (w < -0.05 || w > 7) continue;
          const x = (0.06 + U.h1(i * 31 + c * 17, seed + 5) * 0.88) * fw;
          const big = 0.6 + U.h1(i * 11 + c * 7, seed + 9) * 0.8;
          if (w >= 0 && w < 0.5) {
            const env = P.flashEnv(w, seed + i) * big;
            if (env > 0.01) {
              g.globalCompositeOperation = 'lighter';
              const s = fw * 0.05 * (p.size || 1) * big;
              g.globalAlpha = U.clamp(env);
              const gl = F.glow('#ffd9a0', s * 1.6);
              g.drawImage(gl, x - s * 1.6, hy - s * 1.6, s * 3.2, s * 3.2);
              // light pillar: a stretched soft glow, no rectangle edges
              const pw = s * 2.6, ph = fh * 0.5;
              g.globalAlpha = U.clamp(env * 0.7);
              const pg = F.glow('#ffd9a0', pw);
              g.drawImage(pg, x - pw, hy - ph, pw * 2, ph * 2);
              g.globalAlpha = U.clamp(env);
              // sky light-up
              g.globalAlpha = U.clamp(env * 0.16);
              g.fillStyle = '#ffca8a';
              g.fillRect(0, 0, fw, fh);
            }
          }
          // smoke after the flash
          if (w > 0.2 && w < 7) {
            const age = (w - 0.2) / 6.8;
            g.globalCompositeOperation = 'source-over';
            g.globalAlpha = Math.pow(Math.max(0, 1 - age), 1.5) * 0.6;
            const spr = F.puff(seed + i * 17, 'dark');
            const s2 = fw * (0.06 + age * 0.22) * (p.size || 1) * big;
            g.drawImage(spr, x - s2 / 2, hy - s2 * 0.65 - age * fh * 0.08, s2, s2);
          }
        }
      }
      g.restore();
    },
  });

  X.register({
    id: 'ex-fireball', name: 'Explosion fireball', fam: 'Explosions & impacts',
    note: 'The full blast: light flash, expanding fireball, shockwave ring, flying debris with fire trails, then black smoke that keeps rising. One-shot.',
    dur: 5, x: 0.5, y: 0.68,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.glow(0.8)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const bx = (p.x == null ? 0.5 : p.x) * fw, by = (p.y == null ? 0.68 : p.y) * fh;
      const size = (p.size || 1), amt = p.amount || 1, sp = p.speed || 1;
      const T = t * sp;
      const R = fw * 0.16 * size;                                            // fireball radius
      g.save();
      // 1) light flash (first 3 frames) + scene light
      if (T < 0.2) {
        const env = P.flashEnv(T, seed);
        if (env > 0.01) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = U.clamp(env);
          const s = R * 3.4;
          const gl = F.glow('#fff3cf', s);
          g.drawImage(gl, bx - s, by - s, s * 2, s * 2);
          g.globalAlpha = U.clamp(env * 0.22 * (p.glow == null ? 1 : p.glow));
          g.fillStyle = '#ffd9a0';
          g.fillRect(0, 0, fw, fh);
        }
      }
      // 2) fireball: expanding noise-distorted sphere that turns to smoke (stretched: visible across p)
      if (T > 0.02 && T < 3.4) {
        const grow = U.clamp(T / 1.15);
        const r = R * (0.25 + 0.85 * U.ease.outExpo(grow));
        const smokeMix = U.range(T, 1.5, 3.0);                              // fire -> dark smoke (fire lingers)
        const rise = U.range(T, 0.6, 3.4) * fh * 0.14;
        const long = 96, fW = long, fH = long;
        const d = F.density(fW, fH, (u, v) => {
          const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
          const rr = Math.sqrt(dx * dx + dy * dy * 1.15);
          const q = U.fbm3(u * 3 + t * 0.2, v * 3, t * 0.5, seed + 5, 2);
          const n = U.fbm3(u * 3.4 + q, v * 3.4, t * 0.6, seed + 9, 3) * 0.5 + 0.5;
          let edge = U.clamp(1.05 - rr / (0.48 + n * 0.42));
          edge = edge * edge * (3 - 2 * edge);
          return U.clamp(edge * (0.75 + 0.45 * n) * amt);
        });
        const fireRamp = p.tint ? F.tintRamp(F.R.fireball, p.tint) : F.R.fireball;
        const ramp = smokeMix > 0 ? fireRamp.map(([tt, c]) => {
          const sc = F.R.warBlackGlow.find(([tt2]) => tt2 >= tt) || F.R.warBlackGlow[F.R.warBlackGlow.length - 1];
          const k = smokeMix;
          return [tt, [U.lerp(c[0], sc[1][0], k), U.lerp(c[1], sc[1][1], k), U.lerp(c[2], sc[1][2], k), U.lerp(c[3], sc[1][3], k)]];
        }) : fireRamp;
        const c = F.sprite(d, fW, fH, ramp, 0.9);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = U.clamp(1 - U.range(T, 2.8, 3.6));
        g.imageSmoothingEnabled = true;
        g.drawImage(c, bx - r * 1.7, by - r * 1.7 - rise, r * 3.4, r * 3.0);
        // fire still glowing inside the smoke as it dies
        const ember = Math.max(0, 1 - U.range(T, 1.2, 3.2));
        if (ember > 0.02) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = ember * 0.55 * amt;
          const es = r * 1.5 * (0.6 + 0.4 * (U.noise2(t * 7, 3.3, seed) * 0.5 + 0.5));
          const eg = F.glow('#ff7a1a', es);
          g.drawImage(eg, bx - es, by - es * 0.9 - rise * 0.7, es * 2, es * 1.8);
        }
      }
      // 3) shockwave ring
      if (T > 0.08 && T < 1.1) {
        const pr = U.ease.outExpo(U.clamp((T - 0.08) / 1.0));
        const rr = R * (0.4 + pr * 4.2);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (1 - pr) * 0.55 * amt;
        g.strokeStyle = 'rgba(255,236,200,0.9)';
        g.lineWidth = fw * 0.006 * (1 - pr * 0.6);
        g.beginPath(); g.ellipse(bx, by, rr, rr * 0.38, 0, 0, U.TAU); g.stroke();
        g.globalAlpha = (1 - pr) * 0.3 * amt;
        g.lineWidth = fw * 0.016 * (1 - pr);
        g.strokeStyle = 'rgba(255,220,160,0.4)';
        g.stroke();
      }
      // 4) debris: ballistic chunks with fire trails
      const nd = Math.round(18 * amt);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < nd; i++) {
        const a0 = -Math.PI * (0.08 + U.h1(i, seed + 13) * 0.84);
        const v0 = (0.35 + U.h1(i, seed + 17) * 0.65) * fw * 0.9 * sp;
        const [x, y, tt] = ball(0.05, T, bx, by, Math.cos(a0) * v0, Math.sin(a0) * v0 * 0.75, fw * 0.75);
        if (tt > 2.4) continue;
        const fade = Math.max(0, 1 - tt / 2.4);
        if (fade <= 0) continue;
        const [px, py] = ball(0.05, T - 0.045, bx, by, Math.cos(a0) * v0, Math.sin(a0) * v0 * 0.75, fw * 0.75);
        const col = U.mix('#ffd9a0', '#5a2a10', U.clamp(tt * 1.5));
        g.strokeStyle = col;
        g.globalAlpha = fade * 0.85;
        g.lineWidth = Math.max(1.2, fw * 0.004 * size * fade);
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
      }
      g.restore();
      // 5) lingering black smoke (keeps drifting — the "smoke lingers" rule)
      if (T > 0.3) {
        const pk = { x: p.x, y: (p.y || 0.68) - 0.05, size: size * 1.15, amount: amt * 0.8, speed: sp * 0.7, wind: p.wind || 0, soft: 0.65, loop: 0, tint: p.tint };
        VFX.fx.byId['sm-war-black'].draw(g, pk, Object.assign({}, E, { t: Math.max(0, E.t - 0.3), seed: seed + 555 }));
      }
    },
  });

  X.register({
    id: 'ex-dust-impact', name: 'Dust impact', fam: 'Explosions & impacts',
    note: 'A ground hit throwing a wide flat burst of dust and dirt chunks, then a hanging brown cloud. One-shot.',
    dur: 3.5, x: 0.5, y: 0.78,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const bx = (p.x == null ? 0.5 : p.x) * fw, by = (p.y == null ? 0.78 : p.y) * fh;
      const size = p.size || 1, amt = p.amount || 1, sp = p.speed || 1;
      const T = t * sp;
      g.save();
      // dust burst: tan puffs exploding out, then hanging (soft, no box)
      g.restore();
      const base = { x: p.x == null ? 0.5 : p.x, y: p.y == null ? 0.78 : p.y, size: size * 1.25, amount: amt, speed: sp * 0.7, wind: p.wind || 0, soft: 0.6, loop: 0, tint: p.tint };
      P.puffs(g, base, Object.assign({}, E, { seed: seed + 13 }), { count: 14, life: 2.4, rise: 0.22, size0: 0.07, size1: 0.4, spread: 0.16, style: 'dust', alpha: 0.62, wobble: 2.4, rot: 0.5, once: true, stagger: 0.4 });
      P.puffs(g, Object.assign({}, base, { seed: (E.seed | 0) + 77 }), Object.assign({}, E, { seed: seed + 77 }), { count: 7, life: 3, rise: 0.12, size0: 0.1, size1: 0.55, spread: 0.22, style: 'dust', alpha: 0.45, wobble: 2, rot: 0.3, once: true, stagger: 0.6 });
      g.save();
      // dirt chunks
      g.save();
      g.lineCap = 'round';
      const nd = Math.round(12 * amt);
      for (let i = 0; i < nd; i++) {
        const a0 = -Math.PI * (0.05 + U.h1(i, seed + 21) * 0.9);
        const v0 = (0.3 + U.h1(i, seed + 25) * 0.7) * fw * 0.8 * sp;
        const [x, y, tt] = ball(0.02, T, bx, by, Math.cos(a0) * v0, Math.sin(a0) * v0 * 0.85, fw * 0.9);
        const fade = Math.max(0, 1 - tt / 1.3);
        if (fade <= 0) continue;
        g.fillStyle = '#4a3a26';
        g.globalAlpha = fade * 0.9;
        const s = fw * 0.0035 * size * (0.6 + U.h1(i, seed + 27) * 0.9);
        g.save(); g.translate(x, y); g.rotate(tt * 9 + i);
        g.fillRect(-s, -s * 0.7, s * 2, s * 1.4); g.restore();
      }
      g.restore();
      // hanging dust
      if (T > 0.5) {
        VFX.fx.byId['sm-impact-puff'].draw(g, Object.assign({}, p, { size: size * 0.8, amount: amt * 0.7, speed: sp * 0.6 }),
          Object.assign({}, E, { t: Math.max(0, E.t - 0.5), seed: seed + 77, dur: E.dur }));
      }
    },
  });

  X.register({
    id: 'ex-bullet-hits', name: 'Bullet ground hits', fam: 'Explosions & impacts',
    note: 'A string of bullet hits kicking up small dust puffs along a line — walk the position across the ground.',
    dur: 6, x: 0.5, y: 0.8,
    params: [P.amount(1), P.size(0.6), P.speed(1), P.wind(0), { k: 'dir', label: 'Line angle (°)', sec: 'Area', type: 'range', min: -30, max: 30, step: 1, def: 0 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const x0 = (p.x == null ? 0.5 : p.x) * fw, y0 = (p.y == null ? 0.8 : p.y) * fh;
      const ang = (p.dir || 0) * Math.PI / 180;
      const n = Math.max(2, Math.round(6 * (p.amount || 1)));
      const dur = E.dur * 0.88;
      for (let i = 0; i < n; i++) {
        const ti = (i + 0.4) / n * dur * (0.9 + U.h1(i, seed) * 0.2);
        if (t < ti) continue;
        const u = (i + 0.5) / n - 0.5;
        const px = x0 + Math.cos(ang) * u * fw * 0.5, py = y0 + Math.sin(ang) * u * fw * 0.5;
        // dust puff + bright impact flash + dirt specks at the hit point
        const hAge = t - ti;
        const pk = { x: px / fw, y: py / fh, size: (p.size || 0.6) * (0.8 + U.h1(i, seed + 3) * 0.6), amount: 0.85, speed: (p.speed || 1) * 1.2, wind: p.wind || 0, soft: 0.6 };
        VFX.fx.byId['sm-impact-puff'].draw(g, pk, Object.assign({}, E, { t: hAge, seed: seed + i * 71, dur: 2.5 }));
        if (hAge < 0.22) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = (1 - hAge / 0.22) * 0.95;
          const fs = fw * 0.032 * (p.size || 1);
          const fl = F.glow('#ffd9a0', fs * 2);
          g.drawImage(fl, px - fs * 2, py - fs * 2, fs * 4, fs * 4);
          g.restore();
        }
        g.save();
        g.lineCap = 'round';
        for (let j = 0; j < 4; j++) {
          const a0 = -Math.PI * (0.1 + U.h1(i * 9 + j, seed + 5) * 0.8);
          const v0 = (0.25 + U.h1(i * 9 + j, seed + 7) * 0.45) * fw * 0.4 * (p.speed || 1);
          const [x, y, tt] = ball(0, t - ti, px, py, Math.cos(a0) * v0, Math.sin(a0) * v0 * 0.9, fw * 1.1);
          const fade = Math.max(0, 1 - tt / 0.5);
          if (fade <= 0) continue;
          g.strokeStyle = '#584832'; g.globalAlpha = fade * 0.8; g.lineWidth = Math.max(1, fw * 0.002);
          const [qx, qy] = ball(0, t - ti - 0.03, px, py, Math.cos(a0) * v0, Math.sin(a0) * v0 * 0.9, fw * 1.1);
          g.beginPath(); g.moveTo(qx, qy); g.lineTo(x, y); g.stroke();
        }
        g.restore();
      }
    },
  });

  X.register({
    id: 'ex-flare', name: 'Flare / rocket trail', fam: 'Explosions & impacts',
    note: 'A bright flare or rocket climbing on an arc, spitting sparks and leaving a hanging smoke trail that drifts with the wind.',
    dur: 6, x: 0.5, y: 0.95,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0), P.tint(null), P.glow(0.9)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const x0 = (p.x == null ? 0.5 : p.x) * fw, y0 = (p.y == null ? 0.95 : p.y) * fh;
      const size = p.size || 1, amt = p.amount || 1, sp = p.speed || 1;
      const T = t * sp;
      const flight = 3.4;                                                    // seconds of climb (exits the top)
      const tc = Math.min(T, flight);
      const vx = (U.h1(seed, 3) - 0.5) * fw * 0.22 + (p.wind || 0) * fw * 0.18;
      const vy = -fh * 0.42;
      const x = x0 + vx * (tc / flight), y = y0 + vy * (tc / flight);
      g.save();
      // smoke trail (puffs along the path, older = bigger and more drifted; keeps dissipating after burnout)
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 24; i++) {
        const ti = flight * (1 - (i + 0.5) / 24);
        if (tc < ti) continue;
        const age = (T - ti) / (flight * 2.2);
        const sxs = x0 + vx * (ti / flight), sys = y0 + vy * (ti / flight);
        const drift = (p.wind || 0) * age * fw * 0.12;
        const s2 = fw * (0.02 + age * 0.12) * size;
        const a = Math.pow(Math.max(0, 1 - age), 1.2) * 0.55 * amt;
        if (a <= 0.01) continue;
        const spr = F.puff(seed + i * 13, 'wispy');
        g.globalAlpha = a;
        g.drawImage(spr, sxs + drift - s2 / 2, sys - s2 / 2 + age * fh * 0.03, s2, s2);
      }
      // the flare itself (while flying)
      if (T <= flight) {
        g.globalCompositeOperation = 'lighter';
        const flick = 0.75 + 0.25 * (U.noise2(t * 11, 5, seed) * 0.5 + 0.5);
        const s = fw * 0.028 * size * flick;
        const gl = F.glow(p.tint || '#ffd9a0', s * 2.2);
        g.globalAlpha = U.clamp((p.glow == null ? 0.9 : p.glow)) * amt;
        g.drawImage(gl, x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4);
        g.globalAlpha = 1;
        g.fillStyle = '#fff6dc';
        g.beginPath(); g.arc(x, y, s * 0.55, 0, U.TAU); g.fill();
        // sparks falling off
        g.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const tt = (t * 3 + i * 0.7) % 1;
          const px = x - vx * (tt * 0.12) + (U.h1(i, seed + 9) - 0.5) * fw * 0.02;
          const py = y - vy * (tt * 0.12) + tt * tt * fh * 0.09;
          g.strokeStyle = '#ffca7a';
          g.globalAlpha = (1 - tt) * 0.7;
          g.lineWidth = Math.max(1, fw * 0.0022);
          g.beginPath(); g.moveTo(px, py - fh * 0.012 * tt); g.lineTo(px, py); g.stroke();
        }
      } else if (T < flight + 2.2) {
        // burnout flash, then a dim ember that fades (never a hard pop-out)
        const w = T - flight;
        g.globalCompositeOperation = 'lighter';
        const env = w < 0.3 ? P.flashEnv(w, seed) : 0;
        if (env > 0.01) {
          const s = fw * 0.06 * size;
          g.globalAlpha = env * amt;
          const gl = F.glow('#ffe0a0', s * 2);
          g.drawImage(gl, x - s * 2, y - s * 2, s * 4, s * 4);
        }
        const emb = Math.max(0, 1 - w / 2.2);
        if (emb > 0.01) {
          const s = fw * 0.02 * size;
          g.globalAlpha = emb * 0.55 * amt;
          const gl = F.glow(p.tint || '#ffc98a', s * 1.6);
          g.drawImage(gl, x - s * 1.6, y - s * 1.6, s * 3.2, s * 3.2);
        }
      }
      g.restore();
    },
  });
})();
