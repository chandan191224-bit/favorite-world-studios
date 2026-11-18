// Family: Weather. Rain (light/heavy/angled/with splashes), snow (gentle/blizzard),
// lightning with branching + sky flash, hail, dust storm, wind-blown leaves.
// Particle systems are closed-form deterministic: position = f(t) with wrap, so they loop
// perfectly at the loop length and preview == export exactly.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  // rain core. o: { n, len (seconds of travel the streak covers), speed (design fall px/s ÷1080),
  //                  angle (deg from vertical), layers, splash, color, thick }
  function rain(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const sp = (p.speed || 1), wind = (p.wind || 0);
    const angle = ((o.angle || 0) + wind * 26) * Math.PI / 180;  // wind tilts the fall
    const amt = p.amount == null ? 1 : p.amount;
    const area = p.area || 'full';
    const pad = fh * 0.35;
    g.save();
    g.lineCap = 'round';
    for (let l = 0; l < o.layers; l++) {
      const depth = l / Math.max(1, o.layers - 1);                          // 0 far, 1 near
      const n = Math.round(o.n * amt * (l === 0 ? 0.55 : 0.45) * 2.4);
      const fall = o.speed * sp * 1080 * (0.55 + depth * 0.7);              // design px/s
      const vx = Math.sin(angle) * fall, vy = Math.cos(angle) * fall;
      const len = o.len * (0.55 + depth * 0.8);                             // s of travel -> streak length
      const a = U.clamp(0.24 + depth * 0.34) * (o.alpha || 1);
      g.strokeStyle = U.rgba(o.color || '#cdd8e4', a);
      g.lineWidth = Math.max(1, o.thick * fw * 0.0011 * (0.5 + depth));
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed + l * 97), r1 = U.h1(i, seed + l * 97 + 11), r2 = U.h1(i, seed + l * 97 + 23);
        const vmod = 0.8 + r2 * 0.4;
        const x = F.wrap(r0 * (fw + pad * 2) + t * vx * vmod, fw + pad * 2) - pad;
        const y = F.wrap(r1 * (fh + pad * 2) + t * vy * vmod, fh + pad * 2) - pad;
        if (!X.inArea(x, y, area, fw, fh)) continue;
        g.moveTo(x, y);
        g.lineTo(x - vx * len, y - vy * len);
      }
      g.stroke();
    }
    // splashes at the ground line
    if (o.splash) {
      const ground = fh * (p.area === 'upper' ? 0.55 : 0.985);
      const n = Math.round(90 * amt);
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed + 501), r1 = U.h1(i, seed + 511), r2 = U.h1(i, seed + 521);
        const x = r0 * fw;
        if (!X.inArea(x, ground, area, fw, fh)) continue;
        const period = 0.45 + r1 * 0.6;
        const ph = F.wrap(t / period + r2, 1);
        if (ph > 0.24) continue;
        const pr = ph / 0.24;
        const s = fw * (0.012 + r2 * 0.016) * (0.55 + pr);
        g.strokeStyle = U.rgba('#dce9f5', (1 - pr) * 0.8);
        g.lineWidth = Math.max(1.6, fw * 0.0024);
        g.beginPath(); g.ellipse(x, ground, s, s * 0.32, 0, Math.PI, U.TAU); g.stroke();
        // up-splash speck
        g.fillStyle = U.rgba('#e8f0f8', (1 - pr) * 0.85);
        g.beginPath(); g.arc(x + (r0 - 0.5) * s * 2.6, ground - s * (1 - pr) * 3.2, Math.max(1.4, s * 0.2), 0, U.TAU); g.fill();
      }
    }
    g.restore();
  }

  // snow core. o: { n, speed, sway, size, layers, streak, fog }
  function snow(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const sp = (p.speed || 1), wind = (p.wind || 0), amt = p.amount == null ? 1 : p.amount;
    const area = p.area || 'full';
    const pad = fh * 0.15;
    g.save();
    for (let l = 0; l < 3; l++) {
      const depth = l / 2;
      const n = Math.round(o.n * amt * [0.5, 0.3, 0.2][l]);
      const speed = o.speed * sp * (0.5 + depth * 0.8);
      const s = (o.size * (0.4 + depth * 0.9)) * fw * 0.001;
      g.fillStyle = U.rgba(o.color || '#eef3f8', 0.35 + depth * 0.45);
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed + l * 131), r1 = U.h1(i, seed + l * 131 + 17), r2 = U.h1(i, seed + l * 131 + 29), r3 = U.h1(i, seed + l * 131 + 41);
        const fall = speed * (0.8 + r3 * 0.4);
        const windX = wind * speed * 3.2;                                       // blizzard drives flakes sideways
        const y = F.wrap(r1 * (fh + pad * 2) + t * fall, fh + pad * 2) - pad;
        const x = F.wrap(r0 * (fw + pad * 2) + t * windX + Math.sin(t * (0.7 + r2 * 1.3) + r0 * 9) * o.sway * fw * 0.02, fw + pad * 2) - pad;
        if (!X.inArea(x, y, area, fw, fh)) continue;
        if (o.streak && depth > 0.5) {
          g.save();
          g.translate(x, y);
          const ang = Math.atan2(windX, fall);
          g.rotate(-ang);
          g.fillRect(-s * 0.4, -s * 2.6, s * 0.8, s * 5.2);
          g.restore();
        } else {
          g.beginPath(); g.arc(x, y, s * (0.7 + r2 * 0.5), 0, U.TAU); g.fill();
        }
      }
    }
    if (o.fog) {
      VFX.fx.byId['sm-ground-fog'].draw(g, { x: 0.5, y: 1, size: 0.5, amount: 0.5 * amt, speed: 0.8 + sp, wind, soft: 0.8, loop: 0, tint: null, area: 'full' }, E);
    }
    g.restore();
  }

  // lightning bolt: jagged but smoothed (quadratic midpoints) + branches
  function bolt(g, x0, y0, x1, y1, seed, width, depth) {
    const segs = 12 + (depth > 0 ? 4 : 6);
    const pts = [[x0, y0]];
    for (let i = 1; i < segs; i++) {
      const u = i / segs;
      const jitter = U.h1(i * 7 + depth * 131, seed) - 0.5;
      pts.push([U.lerp(x0, x1, u) + jitter * (x1 - x0) * 0.4 * (1 - u * 0.3), U.lerp(y0, y1, u)]);
    }
    pts.push([x1, y1]);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    g.stroke();
    // branches
    if (depth < 2) {
      for (let i = 3; i < segs - 2; i += 2) {
        if (U.h1(i * 13 + depth, seed + 7) < 0.55) continue;
        const [bx, by] = pts[i];
        const dir = U.h1(i, seed + 11) > 0.5 ? 1 : -1;
        const len = (x1 - x0) * 0.25 * (0.4 + U.h1(i, seed + 13) * 0.6);
        bolt(g, bx, by, bx + dir * len, by + (y1 - y0) * 0.3, seed + i * 17, width * 0.4, depth + 1);
      }
    }
  }

  // ================= effects =================
  X.register({
    id: 'we-rain', name: 'Light rain', fam: 'Weather',
    note: 'Thin drifting rain, two depth layers — readable over interviews and archive shots without taking over.',
    dur: 10,
    params: [P.amount(0.7), P.size(1), P.speed(1), P.wind(0.15), P.tint('#cdd8e4'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { rain(g, p, E, { n: 260, len: 0.02, angle: 5, layers: 2, splash: false, color: p.tint || '#cdd8e4', thick: 1.1, alpha: 0.85, speed: 1.05 }); },
  });
  X.register({
    id: 'we-rain-heavy', name: 'Heavy rain', fam: 'Weather',
    note: 'A proper downpour — long streaks, three depth layers, strong wind drag.',
    dur: 10,
    params: [P.amount(1.3), P.size(1), P.speed(1.2), P.wind(0.3), P.tint('#c9d6e2'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { rain(g, p, E, { n: 430, len: 0.042, angle: 11, layers: 3, splash: false, color: p.tint || '#c9d6e2', thick: 1.4, alpha: 1, speed: 1.3 }); },
  });
  X.register({
    id: 'we-rain-angled', name: 'Angled storm rain', fam: 'Weather',
    note: 'Hard slanted rain driven by wind — storm and cyclone shots.',
    dur: 10,
    params: [P.amount(1.4), P.size(1), P.speed(1.4), P.wind(0.65), P.tint('#c4d2e0'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { rain(g, p, E, { n: 470, len: 0.058, angle: 24, layers: 3, splash: false, color: p.tint || '#c4d2e0', thick: 1.6, alpha: 1, speed: 1.55 }); },
  });
  X.register({
    id: 'we-rain-splash', name: 'Rain with splashes', fam: 'Weather',
    note: 'Rain that lands: bounce rings and specks along the ground line, drops above.',
    dur: 10, y: 1,
    params: [P.amount(1.1), P.size(1), P.speed(1.15), P.wind(0.25), P.tint('#cdd8e4'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { rain(g, p, E, { n: 340, len: 0.034, angle: 9, layers: 3, splash: true, color: p.tint || '#cdd8e4', thick: 1.3, alpha: 1, speed: 1.25 }); },
  });

  X.register({
    id: 'we-snow-gentle', name: 'Gentle snow', fam: 'Weather',
    note: 'Slow drifting snowflakes with natural sway — memorial and winter-history mood.',
    dur: 12,
    params: [P.amount(0.8), P.size(1), P.speed(0.6), P.wind(0.12), P.tint('#eef3f8'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) { snow(g, p, E, { n: 160, speed: 0.17, sway: 1.6, size: 3.1, color: p.tint || '#eef3f8' }); },
  });
  X.register({
    id: 'we-snow-blizzard', name: 'Blizzard', fam: 'Weather',
    note: 'White-out blizzard — horizontal streaks, ground spindrift and a haze veil that flattens the shot.',
    dur: 10,
    params: [P.amount(1.5), P.size(1), P.speed(1.6), P.wind(0.85), P.tint('#e8eef4'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      snow(g, p, E, { n: 340, speed: 0.34, sway: 0.8, size: 2.8, streak: true, fog: true, color: p.tint || '#e8eef4' });
      // white-out veil + fat near-camera flakes so it really whites out
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.14 * (p.amount || 1.5) / 1.5;
      g.fillStyle = p.tint || '#e8eef4';
      g.fillRect(0, 0, fw, fh);
      g.globalAlpha = 1;
      g.strokeStyle = U.rgba(p.tint || '#eef4f9', 0.5);
      g.lineCap = 'round';
      const pad = fw * 0.25;
      g.beginPath();
      for (let i = 0; i < 60; i++) {
        const r0 = U.h1(i, seed + 901), r1 = U.h1(i, seed + 911), r2 = U.h1(i, seed + 921);
        const spd = (fw * 1.1 + r2 * fw * 0.8) * (p.speed || 1.6) * (p.wind == null ? 0.85 : Math.abs(p.wind) + 0.3);
        const x = F.wrap(r0 * (fw + pad * 2) + t * spd, fw + pad * 2) - pad;
        const y = r1 * fh + Math.sin(t * 2 + i) * fh * 0.02;
        const len = fw * (0.05 + r2 * 0.06);
        g.lineWidth = fw * (0.002 + r2 * 0.003);
        g.moveTo(x, y); g.lineTo(x - len, y + len * 0.1);
      }
      g.stroke();
      g.restore();
    },
  });

  X.register({
    id: 'we-lightning', name: 'Lightning strike', fam: 'Weather',
    note: 'A forking bolt with a 2-3 frame core flash, sky flash and restrikes at seeded times.',
    dur: 8,
    params: [P.amount(1), P.size(1), P.speed(1), P.tint(null), P.area('full'), P.loop(0), { k: 'sky', label: 'Sky flash strength', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.max(1, Math.round(3 * (p.amount || 1)));
      const tint = p.tint ? U.hexRgb(p.tint) : [235, 240, 255];
      const skyS = p.sky == null ? 0.5 : p.sky;
      // charged sky: a faint pulsing illumination so the effect is never fully absent
      const pulse = 0.5 + 0.5 * (U.noise1(t * 1.7, seed + 91) * 0.5 + 0.5);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.05 * pulse * skyS * (p.amount || 1);
      const pgr = g.createLinearGradient(0, 0, 0, fh);
      pgr.addColorStop(0, 'rgba(200,212,240,1)');
      pgr.addColorStop(1, 'rgba(200,212,240,0.3)');
      g.fillStyle = pgr;
      g.fillRect(0, 0, fw, fh);
      g.restore();
      g.save();
      for (let i = 0; i < n; i++) {
        const period = E.dur / n;
        const t0 = E.dur * (0.12 + i * 0.28 + U.h1(i, seed) * 0.1);
        const w = (t - t0) * (p.speed || 1);
        if (w < 0 || w > 1.4) continue;
        // pulse train on the same channel: real lightning flickers 2-4 times over ~0.5 s
        const pulses = [0, 0.2 + U.h1(i, seed + 17) * 0.06, 0.4 + U.h1(i, seed + 23) * 0.1];
        let env = 0;
        for (let k = 0; k < pulses.length; k++) {
          const pw = w - pulses[k];
          if (pw >= 0 && pw < 0.14) env = Math.max(env, P.flashEnv(pw, seed + i * 37 + k * 5) * (k ? 0.75 : 1));
        }
        const after = U.range(w, pulses[2] + 0.14, pulses[2] + 0.6);          // residual glow after the last pulse
        const xTop = (0.15 + U.h1(i, seed + 3) * 0.7) * fw;
        const xHit = xTop + (U.h1(i, seed + 5) - 0.5) * fw * 0.3;
        const yHit = fh * (0.72 + U.h1(i, seed + 7) * 0.2);
        // residual glow at the strike point (keeps later columns alive)
        if (env <= 0.02 && after > 0 && after < 1) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          const gs = fw * 0.09 * (1 - after * 0.6);
          g.globalAlpha = (1 - after) * 0.5;
          const gl2 = F.glow('#c9d8ff', gs);
          g.drawImage(gl2, xHit - gs, yHit - gs, gs * 2, gs * 2);
          g.restore();
        }
        if (env <= 0.02) continue;
        // bolt: wide soft halo + mid glow + hot core (3 passes, curved)
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.22 * env})`;
        g.lineWidth = fw * 0.045 * (p.size || 1);
        bolt(g, xTop, -fh * 0.04, xHit, yHit, seed + i * 101, fw * 0.004, 0);
        g.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${0.5 * env})`;
        g.lineWidth = fw * 0.014 * (p.size || 1);
        bolt(g, xTop, -fh * 0.04, xHit, yHit, seed + i * 101, fw * 0.004, 0);
        g.strokeStyle = `rgba(255,255,255,${0.95 * env})`;
        g.lineWidth = Math.max(1.6, fw * 0.005 * (p.size || 1));
        bolt(g, xTop, -fh * 0.04, xHit, yHit, seed + i * 101, fw * 0.004, 0);
        // ground impact flash + splash of light (lingers briefly after the last pulse)
        const imp = Math.max(env, w > pulses[2] ? Math.max(0, 1 - (w - pulses[2]) / 0.95) * 0.85 : 0);
        if (imp > 0.05) {
          const s = fw * 0.14 * (p.size || 1);
          g.globalAlpha = imp;
          const gl = F.glow('#eaf2ff', s);
          g.drawImage(gl, xHit - s, yHit - s * 0.7, s * 2, s * 1.4);
          g.globalAlpha = imp * 0.8;
          const gs2 = fw * 0.26 * (p.size || 1);
          const gl2 = F.glow('#c9d8ff', gs2);
          g.drawImage(gl2, xHit - gs2, yHit - gs2 * 0.5, gs2 * 2, gs2);
        }
        // sky flash (whole frame lift)
        if (skyS > 0.01 && env > 0.01) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = env * skyS * 0.5;
          const gr = g.createLinearGradient(0, 0, 0, fh);
          gr.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},1)`);
          gr.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0.35)`);
          g.fillStyle = gr;
          g.fillRect(0, 0, fw, fh);
        }
      }
      g.restore();
    },
  });

  X.register({
    id: 'we-hail', name: 'Hail', fam: 'Weather',
    note: 'Fast white hail streaks with hard bounce splashes at the ground — sharper and faster than rain.',
    dur: 8, y: 1,
    params: [P.amount(1), P.size(1), P.speed(1.3), P.wind(0.2), P.tint('#eaf2f8'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      rain(g, p, E, { n: 280, len: 0.016, angle: 7, layers: 2, splash: true, color: p.tint || '#eef5fb', thick: 2.4, alpha: 1.1, speed: 1.85 });
    },
  });

  X.register({
    id: 'we-dust-storm', name: 'Dust / sand storm', fam: 'Weather',
    note: 'A wall of dust rolling through — sepia fog banks, streaking grit and a darkened sky.',
    dur: 10, y: 0.8,
    params: [P.amount(1.2), P.size(1.1), P.speed(1.4), P.wind(0.85), P.tint('#c8a86e'), P.soft(0.75), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const amt = p.amount || 1, sp = p.speed || 1, wind = p.wind == null ? 0.85 : p.wind;
      // two travelling dust banks (fast horizontal drift)
      g.save();
      for (let l = 0; l < 2; l++) {
        const H = fh * (0.6 - l * 0.14) * (p.size || 1);
        const yC = fh * (0.86 - l * 0.2);
        const long = 150, fW = long, fH = Math.max(10, Math.round(long * H / fw * 0.8));
        const drift = (0.3 + Math.abs(wind) * 0.8) * sp * (1 - l * 0.3) * (wind >= 0 ? 1 : -1);
        const d = F.density(fW, fH, (u, v) => {
          const q = U.fbm3(u * 1.6 + t * drift, v * 1.8, t * 0.13, seed + l * 61 + 5, 2);
          const n = U.fbm3(u * 2.3 + q * 1.5 + t * drift, v * 2.6 + q, t * 0.17, seed + l * 61 + 9, 3) * 0.5 + 0.5;
          const band = Math.pow(Math.sin(Math.PI * U.clamp(v * 0.8 + 0.1)), 0.7);
          return U.clamp(band * n * (1.1 - l * 0.25) * (0.45 + 0.55 * amt) - 0.07);
        });
        const ramp = p.tint ? F.tintRamp(F.R.dust, p.tint) : F.R.dust;
        const c = F.sprite(d, fW, fH, ramp, 1.1 - (p.soft || 0) * 0.35);
        g.globalAlpha = 0.85 - l * 0.15;
        g.imageSmoothingEnabled = true;
        g.drawImage(c, 0, 0, fW, fH, -fw * 0.03, yC - H, fw * 1.06, H);
      }
      // streaking grit (bright against the darkened wall)
      const n = Math.round(190 * amt);
      g.strokeStyle = U.rgba(p.tint ? U.shade(p.tint, 0.35) : '#e8cf9e', 0.55);
      g.lineWidth = Math.max(1.4, fw * 0.0018);
      g.beginPath();
      const pad = fw * 0.2;
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed + 301), r1 = U.h1(i, seed + 311), r2 = U.h1(i, seed + 321);
        const y = r1 * fh;
        const spd = (0.6 + r2 * 0.8) * fw * (0.5 + Math.abs(wind)) * sp;
        const x = F.wrap(r0 * (fw + pad * 2) + t * spd * (wind >= 0 ? 1 : -1), fw + pad * 2) - pad;
        const sl = spd * 0.05 * (0.5 + r2 * 0.8);
        g.moveTo(x, y); g.lineTo(x - sl * (wind >= 0 ? 1 : -1), y + U.noise1(i, seed) * fh * 0.006);
      }
      g.stroke();
      // dark sky veil
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = U.clamp(0.25 * amt);
      g.fillStyle = p.tint ? p.tint : '#8a7146';
      g.fillRect(0, 0, fw, fh);
      g.restore();
    },
  });

  // leaf sprite cache: small leaf drawn once per variant
  const leaves = new Map();
  function leafSprite(seed, hue) {
    const key = seed + '|' + hue;
    let c = leaves.get(key);
    if (c) return c;
    c = U.canvas(28, 28);
    const g = c.getContext('2d');
    const col = U.mix(hue, '#6d5a28', U.h1(seed, 9) * 0.5);
    g.translate(14, 14); g.rotate(U.h1(seed, 3) * U.TAU);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, -11);
    g.quadraticCurveTo(8, -6, 6, 4);
    g.quadraticCurveTo(3, 10, 0, 11);
    g.quadraticCurveTo(-3, 10, -6, 4);
    g.quadraticCurveTo(-8, -6, 0, -11);
    g.closePath(); g.fill();
    g.strokeStyle = U.shade(col, -0.35); g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke();
    if (leaves.size > 60) { const k = leaves.keys().next().value; leaves.delete(k); }
    leaves.set(key, c);
    return c;
  }

  X.register({
    id: 'we-wind-leaves', name: 'Wind-blown leaves', fam: 'Weather',
    note: 'Dry leaves tumbling across the frame in gusts — autumn, drought and ruin shots.',
    dur: 10,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0.8), P.tint('#b98a3a'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(72 * (p.amount || 1));
      const sp = p.speed || 1, wind = p.wind == null ? 0.8 : p.wind;
      const hue = p.tint || '#b98a3a';
      const pad = fw * 0.2, dir = wind >= 0 ? 1 : -1;
      g.save();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37), r4 = U.h1(i, seed + 51);
        const gust = 0.55 + 0.45 * (U.noise1(t * 0.7 + i * 3.1, seed + 5) * 0.5 + 0.5);
        const spd = (0.35 + r2 * 0.75) * sp * gust * fw * (0.35 + Math.abs(wind)) * dir;
        const x = F.wrap(r0 * (fw + pad * 2) + t * spd, fw + pad * 2) - pad;
        const y = r1 * fh + Math.sin(t * (1.4 + r3 * 1.8) + r0 * 7) * fh * 0.035 + t * fh * 0.012 * (r4 - 0.35) * 2;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.02 * (p.size || 1) * (0.6 + r3 * 0.9);
        const spr = leafSprite(seed + (i % 6), hue);
        g.save();
        g.translate(x, y);
        g.rotate(t * (2 + r4 * 5) * (r0 > 0.5 ? 1 : -1) + r1 * U.TAU);
        g.transform(1, 0, Math.sin(t * 6 + i) * 0.55, 1, 0, 0);                // flutter
        g.globalAlpha = 0.75 + 0.25 * U.h1(i, seed + 7);
        g.drawImage(spr, -s / 2, -s / 2, s, s);
        g.restore();
      }
      g.restore();
    },
  });
})();
