// Family: Particles & debris. Dust motes in light, falling ash, falling debris,
// flying paper/documents (with real Hindi text), bokeh, falling petals, crowd camera flashes.
(() => {
  const U = VFX.util, F = VFX.field, X = VFX.fx, P = VFX.pars;

  // cached paper/document texture (seeded headline + scribble lines)
  const papers = new Map();
  function paperSprite(seed, headline, scribble) {
    const key = seed + '|' + headline + '|' + scribble;
    let c = papers.get(key);
    if (c) return c;
    const W = 150, H = 200;
    c = U.canvas(W, H);
    const g = c.getContext('2d');
    // aged paper
    g.fillStyle = '#e8e0c8';
    g.fillRect(0, 0, W, H);
    const aged = g.createLinearGradient(0, 0, W, H);
    aged.addColorStop(0, 'rgba(160,140,100,0.18)');
    aged.addColorStop(0.5, 'rgba(120,100,70,0.05)');
    aged.addColorStop(1, 'rgba(150,130,90,0.22)');
    g.fillStyle = aged;
    g.fillRect(0, 0, W, H);
    // stamp
    g.strokeStyle = 'rgba(150,60,40,0.5)'; g.lineWidth = 2;
    g.save(); g.translate(W - 34, 30); g.rotate(-0.3);
    U.rrect(g, -22, -12, 44, 24, 4); g.stroke();
    g.fillStyle = 'rgba(150,60,40,0.55)';
    g.font = VFX.text.font('khand', 13, 'bold'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('गोपनीय', 0, 1);
    g.restore();
    // headline (Hindi-safe)
    let y = 26;
    if (headline) {
      g.fillStyle = '#26221c';
      const lines = String(headline).split('\n').slice(0, 3);
      for (const ln of lines) {
        g.font = VFX.text.font('khand', 17, 'bold');
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillText(ln.slice(0, 18), 14, y + 12);
        y += 24;
      }
    } else y = 34;
    // typewriter lines
    g.font = VFX.text.font('kalam', 10, 'normal');
    g.fillStyle = 'rgba(60,52,40,0.8)';
    for (let i = 0; i < 12 && y < H - 20; i++) {
      const segs = 1 + Math.floor(U.h1(i * 3 + seed, 77) * 3);
      let x = 14;
      for (let s = 0; s < segs && x < W - 16; s++) {
        const w = 14 + U.h1(i * 17 + s * 7 + seed, 91) * 42;
        g.fillText(scribble || 'यादृच्छिक पंक्ति', x, y + 10, Math.min(w, W - 16 - x));
        x += w + 8;
      }
      y += 15;
    }
    if (papers.size > 40) { const k = papers.keys().next().value; papers.delete(k); }
    papers.set(key, c);
    return c;
  }

  // ================= effects =================
  X.register({
    id: 'pa-dust-motes', name: 'Dust motes in light', fam: 'Particles & debris',
    note: 'Tiny specks drifting inside a light beam — archive rooms, god-ray shots, projector light.',
    dur: 12, x: 0.5, y: 0.45,
    params: [P.amount(1), P.size(1), P.speed(0.5), P.wind(0.1), P.tint('#ffe9c0'), P.area('center'), P.loop(0), { k: 'spread', label: 'Beam width', sec: 'Area', type: 'range', min: 0.15, max: 1, step: 0.01, def: 0.5 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(220 * (p.amount || 1));
      const sp = p.speed || 0.5, beam = p.spread == null ? 0.5 : p.spread;
      const ax = (p.x == null ? 0.5 : p.x) * fw, ay = (p.y == null ? 0.45 : p.y) * fh;
      const col = p.tint || '#ffe9c0';
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37);
        // position inside a widening beam region around the anchor
        const depth = r1;
        const halfW = beam * fw * 0.55 * (0.25 + depth * 1.05);
        const drift = t * sp * 14 * (0.4 + r2 * 0.8);
        const x = ax + (r0 - 0.5) * 2 * halfW + Math.sin(t * 0.5 * (0.5 + r3) + r0 * 9) * fw * 0.012 + (p.wind || 0) * drift;
        const y = ay + (depth - 0.5) * fh * 1.05 + Math.sin(t * 0.35 * (0.5 + r2) + r1 * 7) * fh * 0.016;
        const s = fw * 0.0012 * (0.5 + r2 * 1.7) * (p.size || 1);
        const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + r3 * 1.8) + r0 * 11);
        g.globalAlpha = (0.2 + 0.55 * r2) * (0.35 + 0.65 * tw);
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-ash-fall', name: 'Falling ash', fam: 'Particles & debris',
    note: 'Grey ash flakes drifting down after a fire — slow, swaying, with a few large soft flakes near camera.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.7), P.wind(0.2), P.tint('#b7b3ae'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(190 * (p.amount || 1));
      const sp = p.speed || 0.7;
      const col = p.tint || '#b7b3ae';
      const pad = fh * 0.15;
      g.save();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37), r4 = U.h1(i, seed + 51);
        const big = r4 > 0.82;
        const fall = (0.05 + r2 * 0.09) * sp * (big ? 1.6 : 1);
        const y = F.wrap(r1 * (fh + pad * 2) + t * fall * fh, fh + pad * 2) - pad;
        const x = F.wrap(r0 * (fw + pad * 2) + t * (p.wind || 0) * fh * 0.06 + Math.sin(t * (0.5 + r3) + r0 * 8) * fw * 0.018, fw + pad * 2) - pad;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.0028 * (p.size || 1) * (big ? 6.5 : 1.1 + r2 * 2.4);
        g.save();
        g.translate(x, y); g.rotate(t * (0.4 + r3) + r0 * U.TAU);
        g.fillStyle = U.rgba(col, big ? 0.42 : 0.6 + r2 * 0.35);
        g.fillRect(-s / 2, -s / 3, s, s / 1.5);
        g.restore();
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-debris-fall', name: 'Falling debris', fam: 'Particles & debris',
    note: 'Chunks of rubble falling through frame after a collapse or blast — faster than ash, tumbling.',
    dur: 8,
    params: [P.amount(1), P.size(1), P.speed(1.4), P.wind(0.1), P.tint('#6a625a'), P.area('full')],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(34 * (p.amount || 1));
      const sp = p.speed || 1.4;
      const col = p.tint || '#6a625a';
      const pad = fh * 0.25;
      g.save();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37);
        const fall = (0.35 + r2 * 0.5) * sp;
        const y = F.wrap(r1 * (fh + pad * 2) + t * fall * fh, fh + pad * 2) - pad;   // loops: chunks keep coming
        const x = r0 * fw + Math.sin(t * 1.2 + i) * fw * 0.006 + t * (p.wind || 0) * fh * 0.08;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.009 * (p.size || 1) * (0.5 + r3 * 1.3);
        g.save();
        g.translate(x, y);
        g.rotate(t * (2 + r2 * 6) * (r0 > 0.5 ? 1 : -1));
        g.fillStyle = U.rgba(col, 0.9);
        g.beginPath();
        g.moveTo(-s * 0.5, -s * 0.3); g.lineTo(s * 0.4, -s * 0.5); g.lineTo(s * 0.55, s * 0.35); g.lineTo(-s * 0.3, s * 0.5);
        g.closePath(); g.fill();
        g.fillStyle = U.rgba('#000000', 0.25);
        g.fillRect(-s * 0.2, -s * 0.15, s * 0.3, s * 0.25);
        g.restore();
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-paper-fly', name: 'Flying paper / documents', fam: 'Particles & debris',
    note: 'Papers and files blowing across the frame — offices being emptied, archives, partition columns. Each sheet carries Hindi text.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(1.2), P.wind(1), P.tint(null), P.area('full'), P.loop(0)],
    fields: [{ k: 'headline', label: 'Paper headline (हिंदी ok)', multi: false }, { k: 'scribble', label: 'Scribble line (कालम hand text)', multi: false }],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(14 * (p.amount || 1));
      const sp = p.speed || 1.2, wind = p.wind == null ? 1 : p.wind;
      const pad = fw * 0.3, dir = wind >= 0 ? 1 : -1;
      const headline = p.headline || 'फ़ाइल नंबर 47';
      const scribble = p.scribble || 'विवरण पंक्ति';
      g.save();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37), r4 = U.h1(i, seed + 51);
        const gust = 0.6 + 0.4 * (U.noise1(t * 0.6 + i * 2.3, seed + 5) * 0.5 + 0.5);
        const spd = (0.28 + r2 * 0.5) * sp * gust;
        const x = F.wrap(r0 * (fw + pad * 2) + t * spd * fw * (0.35 + Math.abs(wind)) * dir, fw + pad * 2) - pad;
        const y = r1 * fh + Math.sin(t * (0.9 + r3 * 1.1) + r0 * 7) * fh * (0.04 + r4 * 0.05) - Math.pow(F.wrap(t * spd + r0, 1), 2) * fh * 0.06;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.045 * (p.size || 1) * (0.7 + r4 * 0.6);
        const spr = paperSprite(seed + (i % 5), i % 2 ? headline : '', i % 2 ? scribble : '');
        g.save();
        g.translate(x, y);
        g.rotate(Math.sin(t * (1.3 + r3) + i) * 0.5 + (r0 - 0.5) * 0.6);
        g.transform(1, Math.sin(t * 5 + i * 2) * 0.18, Math.cos(t * 4 + i) * 0.22, 1, 0, 0);  // flutter
        g.globalAlpha = 0.92;
        g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = s * 0.1; g.shadowOffsetY = s * 0.05;
        g.drawImage(spr, -s / 2, -s * 0.66, s, s * 1.33);
        g.restore();
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-bokeh', name: 'Bokeh lights', fam: 'Particles & debris',
    note: 'Soft out-of-focus light circles drifting — night city, festival, memory sequences.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.35), P.wind(0.25), P.tint('#ffce7a'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(26 * (p.amount || 1));
      const sp = p.speed || 0.35;
      const col = p.tint || '#ffce7a';
      const pad = fw * 0.15;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37);
        const x = F.wrap(r0 * (fw + pad * 2) + t * (p.wind || 0) * sp * fw * 0.5, fw + pad * 2) - pad;
        const y = F.wrap(r1 * (fh + pad * 2) + t * sp * fh * 0.1, fh + pad * 2) - pad + Math.sin(t * 0.5 + r0 * 8) * fh * 0.01;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.02 * (p.size || 1) * (0.4 + r2 * 1.8);
        const spr = F.glow(col, s);
        g.globalAlpha = 0.16 + 0.3 * r3 * (0.6 + 0.4 * Math.sin(t * 0.8 + i));
        g.drawImage(spr, x - s, y - s, s * 2, s * 2);
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-petals', name: 'Falling petals', fam: 'Particles & debris',
    note: 'Pale pink petals fluttering down — spring, weddings, gentle memory shots.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.55), P.wind(0.3), P.tint('#f2b8c6'), P.area('full'), P.loop(0)],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const n = Math.round(46 * (p.amount || 1));
      const sp = p.speed || 0.55;
      const col = p.tint || '#f2b8c6';
      const pad = fh * 0.15;
      g.save();
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 11), r2 = U.h1(i, seed + 23), r3 = U.h1(i, seed + 37);
        const fall = (0.08 + r2 * 0.1) * sp;
        const y = F.wrap(r1 * (fh + pad * 2) + t * fall * fh, fh + pad * 2) - pad;
        const x = F.wrap(r0 * (fw + pad * 2) + t * (p.wind || 0) * fh * 0.08 + Math.sin(t * (0.8 + r3 * 1.2) + r0 * 9) * fw * 0.03, fw + pad * 2) - pad;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.011 * (p.size || 1) * (0.6 + r2 * 0.9);
        g.save();
        g.translate(x, y);
        g.rotate(t * (1.2 + r3 * 2) * (r0 > 0.5 ? 1 : -1) + Math.sin(t * 3 + i) * 0.4);
        g.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2 + i)));                  // tumbling flip
        g.fillStyle = U.rgba(col, 0.75 + r3 * 0.25);
        g.beginPath();
        g.moveTo(0, -s);
        g.quadraticCurveTo(s * 1.05, -s * 0.4, s * 0.6, s * 0.6);
        g.quadraticCurveTo(s * 0.25, s * 1.05, 0, s * 0.8);
        g.quadraticCurveTo(-s * 0.25, s * 1.05, -s * 0.6, s * 0.6);
        g.quadraticCurveTo(-s * 1.05, -s * 0.4, 0, -s);
        g.closePath(); g.fill();
        g.restore();
      }
      g.restore();
    },
  });

  X.register({
    id: 'pa-crowd-flashes', name: 'Crowd camera flashes', fam: 'Particles & debris',
    note: 'Press-flash bursts popping across a crowd at seeded moments, each a point flash plus a brief whole-frame lift.',
    dur: 10,
    params: [P.amount(1), P.size(1), P.tint('#eef2ff'), P.area('full'), { k: 'rate', label: 'Flashes per second', sec: 'Motion', type: 'range', min: 0.5, max: 8, step: 0.5, def: 3 }, { k: 'lift', label: 'Frame lift', sec: 'Look', type: 'range', min: 0, max: 1, step: 0.01, def: 0.4 }],
    fields: [],
    draw(g, p, E) {
      const { fw, fh } = E, t = E.t, seed = E.seed | 0;
      const rate = p.rate || 3, amt = p.amount || 1;
      const col = p.tint || '#eef2ff';
      // flash events in a repeating table (deterministic per cycle index)
      const cyc = Math.floor(t * rate), n = Math.max(1, Math.round(rate));
      g.save();
      g.globalCompositeOperation = 'lighter';
      let lift = 0;
      for (let c = Math.floor((t - 0.4) * rate); c <= cyc; c++) {
        const r0 = U.h1(c * 7, seed), r1 = U.h1(c * 7 + 1, seed + 3), r2 = U.h1(c * 7 + 2, seed + 7);
        const t0 = (c + 0.15 + r0 * 0.7) / rate;
        const w = t - t0;
        if (w < 0 || w > 0.3) continue;
        if (r2 > Math.min(1, 0.45 + amt * 0.55)) continue;
        const env = Math.max(0, 1 - w / 0.22);
        const x = (0.08 + r1 * 0.84) * fw, y = (0.18 + U.h1(c * 7 + 3, seed + 11) * 0.66) * fh;
        if (!X.inArea(x, y, p.area || 'full', fw, fh)) continue;
        const s = fw * 0.018 * (p.size || 1) * (0.7 + r0 * 0.8);
        const gl = F.glow(col, s * 2.6);
        g.globalAlpha = env;
        g.drawImage(gl, x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
        g.fillStyle = '#fff';
        g.globalAlpha = Math.min(1, env * 1.6);
        g.beginPath(); g.arc(x, y, s * 0.3, 0, U.TAU); g.fill();
        lift = Math.max(lift, env);
      }
      // subtle whole-frame lift
      const lp = p.lift == null ? 0.35 : p.lift;
      if (lift > 0.01 && lp > 0.01) {
        g.globalAlpha = lift * lp * 0.35;
        g.fillStyle = col;
        g.fillRect(0, 0, fw, fh);
      }
      g.restore();
    },
  });
})();
