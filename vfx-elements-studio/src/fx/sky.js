// Family: Sky & light. Time-lapse clouds, storm clouds, god rays, sun glare,
// moving cloud shadows over the ground, night sky with stars, subtle aurora.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  // cloud field layer. o: { cover, churn, ramp, band (0..1 sky height), gamma }
  function clouds(g, p, E, o) {
    const { fw, fh } = E, t = E.t, seed = E.seed | 0;
    const sp = (p.speed || 1), wind = (p.wind == null ? 1 : p.wind);
    const H = fh * (o.band || 0.62) * (p.size || 1);
    const long = 170, fW = long, fH = Math.max(10, Math.round(long * H / fw * 0.7));
    const drift = (0.05 + 0.3 * sp) * (wind >= 0 ? 1 : -1);
    const amt = p.amount == null ? 1 : p.amount;
    const d = F.density(fW, fH, (u, v) => {
      const q = U.fbm3(u * 1.7 + t * drift, v * 1.7, t * 0.05 * o.churn, seed + 5, 2);
      const n = U.fbm3(u * 2.4 + q * 1.2 + t * drift, v * 2.6 + q, t * 0.08 * o.churn, seed + 9, 4) * 0.5 + 0.5;
      const band = Math.pow(Math.sin(Math.PI * U.clamp(v * 0.92 + 0.04)), 0.55);
      return U.clamp((n * (1.55 + o.cover) - 0.62) * band * 1.7 * U.clamp(0.4 + amt * 0.65));
    });
    const ramp = p.tint ? F.tintRamp(o.ramp, p.tint) : o.ramp;
    const c = F.sprite(d, fW, fH, ramp, 1 - (p.soft || 0) * 0.35);
    g.save();
    g.globalAlpha = o.alpha || 1;
    g.imageSmoothingEnabled = true;
    g.drawImage(c, 0, 0, fW, fH, -fw * 0.02, -fh * 0.02, fw * 1.04, H + fh * 0.02);
    g.restore();
  }

  X.register({
    id: 'sk-clouds-timelapse', name: 'Passing clouds (time-lapse)', fam: 'Sky & light',
    note: 'Big soft clouds sailing overhead at time-lapse speed — two parallax layers.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(2.4), P.wind(1), P.tint(null), P.soft(0.6)],
    fields: [],
    draw(g, p, E) {
      clouds(g, p, E, { cover: 0.25, churn: 1, ramp: F.R.cloud, band: 0.66, alpha: 0.95 });
      clouds(g, Object.assign({}, p, { speed: (p.speed || 2.4) * 1.5, size: (p.size || 1) * 0.8, amount: (p.amount || 1) * 0.7 }),
        Object.assign({}, E, { seed: E.seed + 411 }), { cover: 0.05, churn: 1.4, ramp: F.R.stormCloud, band: 0.5, alpha: 0.5 });
    },
  });

  X.register({
    id: 'sk-storm-clouds', name: 'Storm clouds', fam: 'Sky & light',
    note: 'Low dark storm clouds churning fast, with a bruised green-grey light.',
    dur: 12,
    params: [P.amount(1.3), P.size(1.1), P.speed(2), P.wind(1), P.tint(null), P.soft(0.7), P.glow(0.35, 'Inner lightning glow')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      clouds(g, p, E, { cover: 0.45, churn: 2.2, ramp: F.R.stormCloud, band: 0.58, alpha: 0.98 });
      // occasional glow inside the cloud mass (lightning behind the clouds)
      const gl = p.glow == null ? 0.35 : p.glow;
      if (gl > 0.02) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const cyc = Math.floor(t / 3.5 + i * 0.33);
          const w = t - cyc * 3.5 - U.h1(cyc * 7 + i, seed) * 3;
          if (w < 0 || w > 0.4) continue;
          const env = Math.max(0, 1 - w / 0.4) * (0.4 + 0.6 * U.h1(cyc + i, seed + 3));
          const x = (0.15 + U.h1(cyc * 13 + i, seed + 5) * 0.7) * fw, y = fh * (0.12 + U.h1(cyc, seed + 7) * 0.2);
          const s = fw * 0.16;
          g.globalAlpha = env * gl;
          const gs = F.glow('#cdd7e8', s);
          g.drawImage(gs, x - s, y - s, s * 2, s * 2);
        }
        g.restore();
      }
    },
  });

  X.register({
    id: 'sk-god-rays', name: 'God rays / light shafts', fam: 'Sky & light',
    note: 'Volumetric light shafts breaking through smoke or a window — soft wedges fanning from a point, slowly breathing.',
    dur: 12, x: 0.5, y: 0.16,
    params: [P.amount(1), P.size(1), P.speed(0.5), P.wind(0), P.tint('#ffe7b0'), P.glow(0.5), { k: 'spread', label: 'Fan width', sec: 'Look', type: 'range', min: 0.2, max: 1, step: 0.01, def: 0.7 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.16 : p.y) * fh;
      const amt = p.amount || 1, sp = p.speed || 0.5;
      const spread = (p.spread == null ? 0.7 : p.spread) * Math.PI;
      const col = p.tint || '#ffe7b0';
      g.save();
      g.globalCompositeOperation = 'lighter';
      // broad glow at the source
      const gs = fw * 0.3 * (p.size || 1);
      g.globalAlpha = 0.55 * (p.glow == null ? 0.5 : p.glow) * 2;
      const gl = F.glow(col, gs);
      g.drawImage(gl, ax - gs, ay - gs, gs * 2, gs * 2);
      // shafts: stretched soft glow sprites (feathered everywhere -> volumetric, never clip-art)
      const n = 12;
      const len = Math.hypot(fw, fh) * 1.25;
      const spr = F.glow(col, 64);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5;
        const sway = U.noise1(t * 0.24 * sp + i * 3.7, seed) * 0.16;
        const ang = Math.PI / 2 + u * spread + sway + (p.wind || 0) * 0.3;   // pointing down
        const wLen = len * (0.5 + 0.5 * (U.noise1(t * 0.18 * sp + i * 5.1, seed + 3) * 0.5 + 0.5));
        const wWid = fw * (0.02 + 0.05 * (U.noise1(t * 0.3 * sp + i * 7.1, seed + 5) * 0.5 + 0.5));
        const a = (0.1 + 0.16 * (U.noise1(t * 0.35 * sp + i * 11.3, seed + 9) * 0.5 + 0.5)) * amt * (p.glow == null ? 0.5 : p.glow);
        if (a <= 0.004) continue;
        g.save();
        g.translate(ax, ay);
        g.rotate(ang);
        g.globalAlpha = U.clamp(a);
        g.drawImage(spr, -wLen * 0.06, -wWid / 2, wLen, wWid);
        g.restore();
      }
      g.restore();
    },
  });

  X.register({
    id: 'sk-sun-glare', name: 'Sun glare', fam: 'Sky & light',
    note: 'Camera glare into the sun — hot core, halo ring, anamorphic streak and warm bloom over the shot.',
    dur: 10, x: 0.68, y: 0.3,
    params: [P.amount(1), P.size(1), P.speed(0.4), P.tint('#ffd98f'), P.glow(0.7), { k: 'streak', label: 'Anamorphic streak', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const ax = (p.x == null ? 0.68 : p.x) * fw, ay = (p.y == null ? 0.3 : p.y) * fh;
      const col = p.tint || '#ffd98f';
      const amt = p.amount || 1, gl = p.glow == null ? 0.7 : p.glow;
      const breathe = 0.9 + 0.1 * (U.noise1(t * 0.8 * (p.speed || 1), seed) * 0.5 + 0.5);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const s = fw * 0.1 * (p.size || 1) * breathe;
      // halo ring
      g.globalAlpha = 0.5 * gl * amt;
      const halo = g.createRadialGradient(ax, ay, s * 0.7, ax, ay, s * 2.6);
      halo.addColorStop(0, U.rgba(col, 0));
      halo.addColorStop(0.55, U.rgba(col, 0.5 * gl));
      halo.addColorStop(0.8, U.rgba(col, 0.12 * gl));
      halo.addColorStop(1, U.rgba(col, 0));
      g.fillStyle = halo;
      g.fillRect(ax - s * 3, ay - s * 3, s * 6, s * 6);
      // core
      g.globalAlpha = Math.min(1, 1.1 * gl * amt);
      const gl2 = F.glow('#ffffff', s);
      g.drawImage(gl2, ax - s, ay - s, s * 2, s * 2);
      // anamorphic streak
      const st = p.streak == null ? 0.6 : p.streak;
      if (st > 0.02) {
        const w = s * 0.16 * st, l = fw * 0.42 * st * breathe;
        const gr = g.createLinearGradient(ax - l, 0, ax + l, 0);
        gr.addColorStop(0, U.rgba(col, 0));
        gr.addColorStop(0.5, U.rgba(col, 0.85 * st));
        gr.addColorStop(1, U.rgba(col, 0));
        g.fillStyle = gr;
        g.fillRect(ax - l, ay - w / 2, l * 2, w);
      }
      // warm bloom over everything
      g.globalAlpha = 0.16 * gl * amt;
      const bloom = F.glow(col, Math.max(fw, fh) * 0.7);
      g.drawImage(bloom, -fw * 0.2, -fh * 0.2, fw * 1.4, fh * 1.4);
      g.restore();
    },
  });

  X.register({
    id: 'sk-cloud-shadows', name: 'Moving cloud shadows', fam: 'Sky & light',
    note: 'Big soft shadows of passing clouds sweeping over the ground — multiplies the footage underneath.',
    dur: 12,
    params: [P.amount(1), P.size(1.2), P.speed(1.6), P.wind(1), P.soft(0.85), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const sp = p.speed || 1.6, wind = p.wind == null ? 1 : p.wind;
      const amt = p.amount || 1;
      const long = 150, fW = long, fH = Math.max(10, Math.round(long * fh / fw * 0.85));
      const drift = (0.06 + 0.3 * sp) * (wind >= 0 ? 1 : -1);
      const d = F.density(fW, fH, (u, v) => {
        const n = U.fbm3(u * 1.5 + t * drift, v * 1.5, t * 0.04, seed + 5, 3) * 0.5 + 0.5;
        return U.clamp((n - 0.42) * 2.6 * amt);
      });
      const c = F.sprite(d, fW, fH, [[0, [30, 32, 40, 0]], [1, [24, 26, 34, 120]]], 1.2 - (p.soft || 0) * 0.4);
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.imageSmoothingEnabled = true;
      g.drawImage(c, 0, 0, fW, fH, 0, 0, fw, fh);
      g.restore();
    },
  });

  X.register({
    id: 'sk-night-stars', name: 'Night sky with stars', fam: 'Sky & light',
    note: 'A star field with twinkle and a faint band of the galaxy; can dim the shot to night first.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.5), P.wind(0), P.tint('#e8eeff'), P.glow(0.4, 'Milky-way band'), { k: 'dim', label: 'Dim to night', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.45 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const amt = p.amount || 1, dim = p.dim == null ? 0.45 : p.dim;
      g.save();
      if (dim > 0.01) {
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = dim;
        const gr = g.createLinearGradient(0, 0, 0, fh);
        gr.addColorStop(0, '#5a6d96'); gr.addColorStop(0.7, '#93a0ba'); gr.addColorStop(1, '#c9cfdc');
        g.fillStyle = gr;
        g.fillRect(0, 0, fw, fh);
      }
      g.globalCompositeOperation = 'lighter';
      // milky way band
      const mw = p.glow == null ? 0.4 : p.glow;
      if (mw > 0.02) {
        const long = 140, fW = long, fH = Math.max(10, Math.round(long * fh / fw * 0.8));
        const d = F.density(fW, fH, (u, v) => {
          const bandY = 0.55 + U.fbm2(u * 2.2, 3.3, seed, 2) * 0.18;
          const dist = Math.abs(v - bandY);
          const n = U.fbm3(u * 3 + t * 0.008, v * 3, t * 0.02, seed + 5, 3) * 0.5 + 0.5;
          return U.clamp(Math.max(0, 1 - dist * 7) * n * 1.3);
        });
        const c = F.sprite(d, fW, fH, [[0, [180, 195, 235, 0]], [1, [205, 215, 245, 70]]], 1.4);
        g.globalAlpha = mw;
        g.imageSmoothingEnabled = true;
        g.drawImage(c, 0, 0, fW, fH, 0, 0, fw, fh);
      }
      // stars: only a quarter twinkle (real skies don't blink in unison)
      const col = p.tint || '#e8eeff';
      const n = Math.round(240 * amt);
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37);
        const x = r0 * fw, y = r1 * fh * 0.96;
        const s = fw * 0.0009 * (0.5 + r2 * 1.6) * (p.size || 1);
        const tw = r3 < 0.28 ? (0.45 + 0.55 * Math.pow(Math.sin(t * (0.9 + r2 * 2.4) * (p.speed || 0.5) + r0 * 9) * 0.5 + 0.5, 1.6)) : 0.9;
        g.globalAlpha = (0.35 + 0.65 * r2) * tw;
        if (s > fw * 0.0016) {
          const gl = F.glow(col, s * 6);
          g.drawImage(gl, x - s * 3, y - s * 3, s * 6, s * 6);
        } else {
          g.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      g.restore();
    },
  });

  X.register({
    id: 'sk-aurora', name: 'Aurora (subtle)', fam: 'Sky & light',
    note: 'Green-teal curtains waving in the upper sky — kept quiet so it never looks like a sci-fi frame.',
    dur: 14,
    params: [P.amount(0.8), P.size(1), P.speed(0.5), P.wind(0.2), P.tint('#5fe39a'), P.glow(0.45), P.area('upper')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const amt = p.amount == null ? 0.8 : p.amount;
      const sp = p.speed || 0.5;
      const c1 = p.tint || '#5fe39a';
      const c2 = U.mix(c1, '#2f6fd0', 0.5), c3 = U.mix(c1, '#b06fd8', 0.65);
      // vertical curtains: distinct wavy bands, brighter at the bottom edge, violet tips
      const nC = 7;
      g.save();
      X.clipArea(g, p.area || 'upper', fw, fh);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < nC; i++) {
        const u = (i + 0.5) / nC;
        // the curtain's bottom edge wanders
        const edge = 0.42 + U.fbm2(u * 2.2 + t * 0.07 * sp + i * 0.61, seed, 2) * 0.16 + (p.wind || 0) * t * 0.008;
        const height = 0.34 + U.h1(i, seed + 3) * 0.22;
        const bright = (0.4 + 0.6 * (U.noise1(t * 0.24 * sp + i * 3.3, seed + 7) * 0.5 + 0.5)) * amt * (1 - i * 0.06);
        if (bright < 0.03) continue;
        const x0 = u * fw, w = fw / nC * 1.9;
        const gr = g.createLinearGradient(0, edge * fh, 0, (edge - height) * fh);
        gr.addColorStop(0, U.rgba(c1, 0.34 * bright));
        gr.addColorStop(0.45, U.rgba(c2, 0.2 * bright));
        gr.addColorStop(1, U.rgba(c3, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x0 - w * 0.35, edge * fh);
        // wavy bottom edge (the curtain hem)
        for (let s = 0; s <= 8; s++) {
          const sx = x0 - w * 0.35 + (w * 0.7) * s / 8;
          const sy = (edge + U.noise2(s * 0.8 + i * 9, t * 0.5 * sp, seed + 11) * 0.035) * fh;
          g.lineTo(sx, sy);
        }
        g.lineTo(x0 + w * 0.35, (edge - height) * fh);
        g.lineTo(x0 - w * 0.35, (edge - height) * fh);
        g.closePath();
        g.fill();
      }
      g.restore();
    },
  });
})();
