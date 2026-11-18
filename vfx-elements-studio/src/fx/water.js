// Family: Water. Ripples, rain running down a window pane (with refractive drops),
// underwater caustics (ridged-noise light web), and a splash crown.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  X.register({
    id: 'wa-ripples', name: 'Water ripples', fam: 'Water',
    note: 'Rings of ripples expanding from a point (or the whole frame) — pond surface, riverbank, rain on water.',
    dur: 10, x: 0.5, y: 0.6,
    params: [P.amount(1), P.size(1), P.speed(1), P.tint(null), P.loop(0), { k: 'rings', label: 'Rings at once', sec: 'Look', type: 'range', min: 1, max: 10, step: 1, def: 4 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const cx = (p.x == null ? 0.5 : p.x) * fw, cy = (p.y == null ? 0.6 : p.y) * fh;
      const n = Math.max(1, Math.round((p.rings || 4) * (p.amount || 1)));
      const sp = p.speed || 1;
      const period = 1.8 / sp;
      const squish = 0.36;                                                 // seen at an angle: ellipse, not circle
      g.save();
      for (let i = 0; i < n; i++) {
        const phase = (((t / period) + i / n) % 1 + 1) % 1;
        const r = fw * 0.03 + U.ease.outQuad(phase) * fw * 0.26 * (p.size || 1);
        const fade = Math.pow(1 - phase, 1.4);
        const lw = Math.max(1.4, fw * 0.005 * (1 - phase * 0.4));
        // paired highlight (upper rim) + shadow (lower rim) bands = a refracting water ring
        g.strokeStyle = p.tint ? U.rgba(p.tint, 0.55 * fade) : `rgba(238,245,252,${0.55 * fade})`;
        g.lineWidth = lw;
        g.beginPath(); g.ellipse(cx, cy, r, r * squish, 0, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
        g.strokeStyle = p.tint ? U.rgba(p.tint, 0.3 * fade) : `rgba(22,34,50,${0.34 * fade})`;
        g.beginPath(); g.ellipse(cx, cy, r + lw * 0.8, r * squish + lw * 0.8, 0, -Math.PI * 0.1, Math.PI * 0.9); g.stroke();
        // faint inner sheen
        if (phase < 0.85) {
          g.fillStyle = `rgba(222,234,246,${0.06 * fade})`;
          g.beginPath(); g.ellipse(cx, cy, r * 0.96, r * 0.96 * squish, 0, 0, U.TAU); g.fill();
        }
      }
      g.restore();
    },
  });

  X.register({
    id: 'wa-rain-window', name: 'Rain on window', fam: 'Water',
    note: 'The shot seen through a wet pane: misted glass, static droplets, and runners that grow, slide and leave trails. Refracts the footage under it.',
    dur: 12, y: 1,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0.15), P.tint(null), { k: 'mist', label: 'Glass mist', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.72 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh, bd, k } = E, t = E.t, seed = E.seed | 0;
      const amt = p.amount || 1, sp = p.speed || 1, wind = p.wind || 0;
      const size = p.size || 1;
      g.save();
      // misted pane (soft noise veil + slight blur of the footage via downscaled bd)
      const mist = p.mist == null ? 0.72 : p.mist;
      if (mist > 0.02 && bd && E.mode === 'composite') {
        const sf = F.soften(bd, 7);
        g.globalAlpha = mist * 0.95;
        g.imageSmoothingEnabled = true;
        g.drawImage(sf, 0, 0, sf.width, sf.height, 0, 0, fw, fh);
        g.globalAlpha = 1;
      }
      // frosted corners: the pane reads strongest at the edges
      if (mist > 0.05) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = mist * 0.3;
        for (const [cx2, cy2] of [[0, 0], [fw, 0], [0, fh], [fw, fh]]) {
          const fr = g.createRadialGradient(cx2, cy2, 0, cx2, cy2, fw * 0.42);
          fr.addColorStop(0, 'rgba(225,232,240,0.5)');
          fr.addColorStop(1, 'rgba(225,232,240,0)');
          g.fillStyle = fr;
          g.fillRect(0, 0, fw, fh);
        }
        g.restore();
      }
      if (mist > 0.02) {
        // visible frost texture: even on soft footage the pane reads
        const long = 150, fW = long, fH = Math.max(10, Math.round(long * fh / fw * 0.85));
        const d = F.density(fW, fH, (u, v) => {
          const n = U.fbm3(u * 2.6, v * 2.6, t * 0.05, seed + 5, 3) * 0.5 + 0.5;
          return U.clamp(n * mist * 1.15);
        });
        const c = F.sprite(d, fW, fH, [[0, [198, 208, 220, 0]], [0.55, [212, 220, 230, 70]], [1, [226, 232, 240, 130]]], 1.15);
        g.globalAlpha = 0.85;
        g.imageSmoothingEnabled = true;
        g.drawImage(c, 0, 0, fW, fH, 0, 0, fw, fh);
        g.globalAlpha = 1;
        // glass is never perfectly clear: faint lift over the whole pane
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.1 * mist;
        g.fillStyle = '#d2dee8';
        g.fillRect(0, 0, fw, fh);
        g.restore();
      }
      // static droplets
      const nS = Math.round(170 * amt);
      for (let i = 0; i < nS; i++) {
        const r0 = U.h1(i, seed + 101), r1 = U.h1(i, seed + 111), r2 = U.h1(i, seed + 121);
        const x = r0 * fw, y = r1 * fh;
        const s = fw * 0.0048 * size * (0.4 + r2 * 1.5);
        g.fillStyle = 'rgba(190,205,220,0.16)';
        g.beginPath(); g.arc(x, y, s, 0, U.TAU); g.fill();
        g.fillStyle = 'rgba(240,248,255,0.5)';
        g.beginPath(); g.arc(x - s * 0.25, y - s * 0.3, s * 0.3, 0, U.TAU); g.fill();
      }
      // runners: grow, then slide down with wobble, leaving micro-trail droplets
      const nR = Math.round(16 * amt);
      for (let i = 0; i < nR; i++) {
        const r0 = U.h1(i, seed + 301), r1 = U.h1(i, seed + 311), r2 = U.h1(i, seed + 321), r3 = U.h1(i, seed + 331);
        const life = 5 + r2 * 6;
        const age = (((t / life) + r3) % 1 + 1) % 1;
        const x0 = r0 * fw;
        const growT = 0.22;                                                   // sits and grows first
        const runP = U.clamp((age - growT) / (1 - growT));
        const speed = (30 + r1 * 120) * sp * runP + 8;                        // accelerates as it runs
        const y = r1 * fh * 0.4 + Math.pow(runP, 1.35) * fh * 1.1;
        const x = x0 + Math.sin(t * (1.2 + r2 * 2) + i * 2) * fw * (0.004 + wind * 0.02) + wind * runP * fw * 0.03;
        const s = fw * 0.0068 * size * (0.7 + r2 * 0.9) * (0.6 + age * 0.7);
        const a = U.clamp(Math.min(age * 8, (1 - age) * 5));
        // trail of micro droplets + a wet streak down the pane
        g.strokeStyle = `rgba(205,220,235,${0.28 * a})`;
        g.lineWidth = Math.max(1, s * 0.5);
        g.beginPath(); g.moveTo(x, y - s * 1.5); g.lineTo(x, y - s * 9); g.stroke();
        g.fillStyle = `rgba(200,214,228,${0.34 * a})`;
        for (let j = 1; j <= 9; j++) {
          const ty = y - s * (1.5 + j * 0.85);
          if (ty < 0) break;
          g.beginPath(); g.arc(x + Math.sin(j * 1.7 + i) * s * 0.32, ty, s * Math.max(0.16, 0.55 - j * 0.055), 0, U.TAU); g.fill();
        }
        // the drop itself: dark rim + refracted footage inside (bd zoomed) + highlight
        g.save();
        g.beginPath();
        g.ellipse(x, y, s * 0.75, s * 1.5, 0, 0, U.TAU);
        g.clip();
        if (bd && E.mode === 'composite') {
          const rx = x * k, ry = y * k, rw = s * 0.75 * k * 2, rh = s * 1.5 * k * 2;
          g.globalAlpha = a;
          g.drawImage(bd, rx - rw * 0.18, ry - rh * 0.18, rw * 1.8, rh * 1.8, x - s * 0.75, y - s * 1.5, s * 1.5, s * 3);
          g.globalAlpha = 1;
        } else {
          g.fillStyle = `rgba(180,196,214,${0.3 * a})`;
          g.fillRect(x - s, y - s * 2, s * 2, s * 4);
        }
        g.restore();
        g.strokeStyle = `rgba(232,242,252,${0.62 * a})`;
        g.lineWidth = Math.max(1, s * 0.16);
        g.beginPath(); g.ellipse(x, y, s * 0.75, s * 1.5, 0, 0, U.TAU); g.stroke();
        g.fillStyle = `rgba(252,254,255,${0.75 * a})`;
        g.beginPath(); g.arc(x - s * 0.28, y - s * 0.55, s * 0.26, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(x + s * 0.2, y + s * 0.5, s * 0.16, 0, U.TAU); g.fill();
      }
      g.restore();
    },
  });

  X.register({
    id: 'wa-caustics', name: 'Underwater caustics', fam: 'Water',
    note: 'The shifting light-web of water — ridged noise lines dancing over the frame, with a gentle blue grade.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.8), P.wind(0), P.tint('#bfe8ff'), P.glow(0.55), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const sp = p.speed || 0.8, amt = p.amount || 1;
      const col = p.tint || '#bfe8ff';
      // two ridged-noise webs layered
      for (let l = 0; l < 2; l++) {
        const long = 160, fW = long, fH = Math.max(10, Math.round(long * fh / fw * 0.85));
        const breathe = 1 + Math.sin(t * 0.5 * sp) * 0.04;
        const d = F.density(fW, fH, (u, v) => {
          const su = (u - 0.5) / breathe + 0.5, sv = (v - 0.5) / breathe + 0.5;
          const r = U.ridge3(su * (3 + l) + t * 0.1 * sp * (l ? -0.7 : 1) + l * 9.1, sv * (3 + l) - t * 0.06 * sp, t * 0.22 * sp, seed + l * 61, 3);
          return U.clamp(Math.pow(Math.max(0, r - 0.72) / 0.28, 1.6) * (l ? 0.7 : 1));
        });
        const c = F.sprite(d, fW, fH, [[0, [200, 236, 255, 0]], [0.6, [215, 240, 255, 60]], [1, [235, 248, 255, 150]]], 1);
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (0.5 + 0.5 * (p.glow == null ? 0.55 : p.glow)) * U.clamp(amt);
        g.imageSmoothingEnabled = true;
        g.drawImage(c, 0, 0, fW, fH, 0, 0, fw, fh);
        g.restore();
      }
      // gentle blue grade
      g.save();
      g.globalCompositeOperation = 'soft-light';
      if (g.globalCompositeOperation !== 'soft-light') g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.18 * U.clamp(amt);
      g.fillStyle = '#3d7fa6';
      g.fillRect(0, 0, fw, fh);
      g.restore();
    },
  });

  X.register({
    id: 'wa-splash', name: 'Splash crown', fam: 'Water',
    note: 'A drop hits water: crown of droplets flying out, foam burst and an expanding surface ring. One-shot.',
    dur: 3, x: 0.5, y: 0.72,
    params: [P.amount(1), P.size(1), P.speed(1), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const cx = (p.x == null ? 0.5 : p.x) * fw, cy = (p.y == null ? 0.72 : p.y) * fh;
      const T = t * (p.speed || 1) * 0.55;                                 // slowed: the crown is clearly visible
      const size = p.size || 1, amt = p.amount || 1;
      g.save();
      g.globalCompositeOperation = 'lighter';
      // crown droplets: ballistic from a ring
      const n = Math.round(26 * amt);
      for (let i = 0; i < n; i++) {
        const a0 = U.h1(i, seed) * U.TAU;
        const v0 = (0.17 + U.h1(i, seed + 5) * 0.24) * fw * 1.0 * size;
        const tt = T;
        const x = cx + Math.cos(a0) * v0 * tt * 1.6;
        const y = cy - Math.abs(Math.sin(a0)) * v0 * tt + fw * 0.5 * tt * tt;
        const fade = Math.max(0, 1 - tt / 1.15);
        if (fade <= 0.02) continue;
        const s = fw * 0.003 * size * (0.6 + U.h1(i, seed + 9) * 1.2);
        g.fillStyle = `rgba(225,240,252,${0.8 * fade})`;
        g.beginPath(); g.arc(x, y, s, 0, U.TAU); g.fill();
        // streak
        const py = cy - Math.abs(Math.sin(a0)) * v0 * (tt - 0.03) + fw * 0.5 * Math.pow(tt - 0.03, 2);
        g.strokeStyle = `rgba(225,240,252,${0.4 * fade})`;
        g.lineWidth = Math.max(0.8, s * 0.8);
        g.beginPath(); g.moveTo(x, py); g.lineTo(x, y); g.stroke();
      }
      // foam burst
      if (T < 0.8) {
        const pr = T / 0.8;
        const s = fw * 0.06 * size * (0.4 + U.ease.outQuart(pr) * 0.9);
        const gl = F.glow('#dceefc', s);
        g.globalAlpha = (1 - pr) * 0.75;
        g.drawImage(gl, cx - s, cy - s * 0.6, s * 2, s * 1.2);
      }
      g.restore();
      // expanding surface rings (slow, after the crown; still visible late)
      if (T > 0.12) {
        const pr = U.clamp((T - 0.12) / 2.6);
        const r = fw * 0.015 + U.ease.outQuad(pr) * fw * 0.14 * size;
        g.save();
        g.strokeStyle = `rgba(228,240,250,${0.6 * (1 - pr)})`;
        g.lineWidth = Math.max(1.2, fw * 0.0036 * (1 - pr * 0.5));
        g.beginPath(); g.ellipse(cx, cy, r, r * 0.36, 0, 0, U.TAU); g.stroke();
        g.strokeStyle = `rgba(228,240,250,${0.32 * (1 - pr)})`;
        g.beginPath(); g.ellipse(cx, cy, r * 0.62, r * 0.22, 0, 0, U.TAU); g.stroke();
        g.restore();
      }
    },
  });
})();
