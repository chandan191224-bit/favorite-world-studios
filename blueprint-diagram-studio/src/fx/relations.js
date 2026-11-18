// FAMILY 10 — Relationship diagrams: Venn (2/3 circles sliding together with an overlap
// highlight), 2x2 matrix, hub-and-spoke, and a comparison table that builds row by row.
// (Conspiracy boards live in the Detective Board Studio, charts in the Data Chart Studio,
// maps in the Map Studio — deliberately not duplicated here.)
BD.fx.register({
  id: 'relations', name: 'Relationship diagram', fam: 'Relationship diagrams',
  note: 'वेन आरेख (2/3 घेरे जुड़ते हैं, बीच का हिस्सा हाइलाइट), 2×2 मैट्रिक्स, हब-एंड-स्पोक, और तुलना तालिका जो पंक्ति-दर-पंक्ति बनती है। Venn diagrams, 2x2 matrix, hub-and-spoke, comparison table building row by row.',
  dur: 6,
  fields: [
    { k: 'title', label: 'Title', def: 'दो धाराएँ' },
    { k: 'items', label: 'Items (one per line)', multi: true, def: 'सेना\nनौसेना\nसंयुक्त अभियान' },
    { k: 'rows', label: 'Table rows (col | col | col …)', multi: true, def: 'विषय | विकल्प A | विकल्प B\nलागत | कम | अधिक\nगति | धीमी | तेज़\nजोखिम | उच्च | कम' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'clean', sec: 'style' },
    { k: 'kind', label: 'Kind', type: 'select', options: () => [['venn2', 'Venn (2 circles)'], ['venn3', 'Venn (3 circles)'], ['matrix', '2×2 matrix'], ['hub', 'Hub & spoke'], ['table', 'Comparison table']], def: 'venn2', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.6, sec: 'anim' },
    { k: 'labelsOn', label: 'Labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 40, step: 1, def: 28, sec: 'labels' },
  ],
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text, SH = BD.shapes;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 1.6) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const fs = p.labelSize || 28;
    const items = T.lines(f.items);
    const rows = T.lines(f.rows).map(s => s.split('|').map(x => (x || '').trim()));

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.08), minor: 96, major: 480 });
    }

    const circle = (cx, cy, r, prog, color, dash) => D.stroke(g, SH.circ(cx, cy, r).map(q => [cx + q[0], cy + q[1]]), { w: 3 * LW, color: color || th.ink, prog, dash, glow: th.glow ? 0.5 : 0, boil: th.wobble, seed: env.seed, t: lt });

    if (p.kind === 'venn2' || p.kind === 'venn3') {
      const three = p.kind === 'venn3';
      const R = three ? Math.min(fw, fh) * 0.21 : Math.min(fw, fh) * 0.26;
      const cy = fh * 0.05;
      // circles slide together from apart
      const slide = U.ease.inOut(U.range(pr, 0.1, 0.5));
      const sep = U.lerp(R * (three ? 2.1 : 1.7), R * (three ? 0.92 : 0.62), slide);
      const A = items[0] || 'A', B = items[1] || 'B', C = items[2] || (three ? 'C' : '');
      // overlap highlight (drawn under the strokes) once they meet
      const meet = U.range(pr, 0.4, 0.62);
      if (meet > 0 && !three) {
        g.save(); g.globalAlpha *= 0.2 * meet;
        g.beginPath();
        const x1 = -sep / 2, x2 = sep / 2;
        // lens intersection of two circles distance sep apart
        const a = (sep / 2 + R * R - R * R) / (2 * R) + R / 2 - R / 2; // midpoint based
        const d = sep;
        const aa = (d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, R * R - aa * aa));
        const mx = x1 + aa;
        g.arc(x1, cy, R, Math.atan2(h, mx - x1), Math.atan2(-h, mx - x1));
        g.arc(x2, cy, R, Math.atan2(-h, mx - x2), Math.atan2(h, mx - x2), true);
        g.closePath();
        g.fillStyle = th.accent; g.fill();
        g.restore();
      }
      if (meet > 0 && three) {
        g.save(); g.globalAlpha *= 0.18 * meet;
        g.beginPath();
        // approximate: highlight the centre triangle-ish region with clipped arcs
        g.arc(-sep / 2, cy - R * 0.34, R, 0, U.TAU); g.clip();
        g.beginPath(); g.arc(sep / 2, cy - R * 0.34, R, 0, U.TAU); g.clip();
        g.beginPath(); g.arc(0, cy + R * 0.4, R, 0, U.TAU); g.clip();
        g.fillStyle = th.accent;
        g.fillRect(-fw, -fh, fw * 2, fh * 2);
        g.restore();
      }
      // the circles
      if (!three) {
        circle(-sep / 2, cy, R, U.range(pr, 0.05, 0.4));
        circle(sep / 2, cy, R, U.range(pr, 0.12, 0.5));
      } else {
        circle(-sep / 2, cy - R * 0.34, R, U.range(pr, 0.05, 0.4));
        circle(sep / 2, cy - R * 0.34, R, U.range(pr, 0.1, 0.46));
        circle(0, cy + R * 0.4, R, U.range(pr, 0.16, 0.52));
      }
      // labels
      if (p.labelsOn !== false) {
        const lp = U.range(pr, 0.3, 0.6);
        if (!three) {
          D.text(g, -sep / 2 - R * 0.55, cy, A, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.1, 0.9) });
          D.text(g, sep / 2 + R * 0.55, cy, B, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.1, 0.9) });
        } else {
          D.text(g, -sep / 2 - R * 0.5, cy - R * 0.5, A, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.1, 0.9) });
          D.text(g, sep / 2 + R * 0.5, cy - R * 0.5, B, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.1, 0.9) });
          D.text(g, 0, cy + R * 1.15, C, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.1, 0.9) });
        }
        // overlap label
        const op = U.range(pr, 0.55, 0.85);
        if (op > 0) {
          const overlap = three ? (items[3] || 'सहयोग') : (items[2] || '');
          if (overlap) D.text(g, 0, three ? cy - R * 0.12 : cy, overlap, { font: th.fonts.label, fs: fs * 0.85, color: th.dark ? '#ffd84a' : th.pal.dim, weight: 'bold', align: 'center', alpha: op, prog: U.range(op, 0.1, 1) });
        }
      }
    } else if (p.kind === 'matrix') {
      // 2x2 quadrant grid with axis labels
      const w = fw * 0.44, h = fh * 0.5, x0 = -w / 2 - fw * 0.06, y0 = -h / 2 - fh * 0.02;
      const gp = U.range(pr, 0.05, 0.4);
      // axes cross
      D.line(g, x0 + w / 2, y0, x0 + w / 2, y0 + h, { w: 3 * LW, color: th.ink, prog: gp });
      D.line(g, x0, y0 + h / 2, x0 + w, y0 + h / 2, { w: 3 * LW, color: th.ink, prog: U.range(pr, 0.08, 0.45) });
      // quadrant tints + labels pop
      const quads = [
        [x0, y0, items[0] || '', 'TL'], [x0 + w / 2, y0, items[1] || '', 'TR'],
        [x0, y0 + h / 2, items[2] || '', 'BL'], [x0 + w / 2, y0 + h / 2, items[3] || '', 'BR'],
      ];
      quads.forEach((q, i) => {
        const qp = D.stagger(U.range(pr, 0.3, 0.85), i, 4, 0.5);
        if (qp <= 0) return;
        const pop = U.ease.outBack(U.range(qp, 0, 0.5));
        g.save();
        g.globalAlpha *= 0.14 * U.range(qp, 0, 0.4) * pop;
        g.fillStyle = i === 3 ? th.accent : th.ink;
        g.fillRect(q[0] + 8, q[1] + 8, w / 2 - 16, h / 2 - 16);
        g.restore();
        D.text(g, q[0] + w / 4, q[1] + h / 4 + fs * 0.3, q[2], { font: th.fonts.label, fs: fs * 0.9, color: i === 3 ? th.accent : th.ink, weight: 'bold', align: 'center', alpha: U.range(qp, 0.2, 0.8), prog: U.range(qp, 0.3, 0.9) });
      });
      // axis labels
      if (p.labelsOn !== false) {
        const ap = U.range(pr, 0.45, 0.7);
        const ax = items[4] || (env.lang === 'hi' ? 'कम' : 'LOW'), ax2 = items[5] || (env.lang === 'hi' ? 'अधिक' : 'HIGH');
        D.text(g, x0 - 30, y0 + h + 46, ax, { font: th.fonts.mono, fs: fs * 0.6, color: th.ink2, align: 'left', alpha: ap });
        D.text(g, x0 + w + 30, y0 + h + 46, ax2, { font: th.fonts.mono, fs: fs * 0.6, color: th.ink2, align: 'right', alpha: ap });
        D.text(g, x0 + w / 2, y0 - 34, (items[6] || '→'), { font: th.fonts.mono, fs: fs * 0.6, color: th.ink2, align: 'center', alpha: ap });
        D.leader(g, x0 + w / 2, y0 + h / 2, -fw / 2 + 80, y0 + h / 2 - 130, { text: f.title || '', prog: U.range(pr, 0.5, 0.8), th, fs: fs * 0.9, side: 'left', color: th.dim, marker: 'none', run: 30, seed: env.seed + 9, t: lt });
      }
    } else if (p.kind === 'hub') {
      // hub circle + spokes out to satellites
      const cx = 0, cy = fh * 0.04, R = Math.min(fw, fh) * 0.3;
      const hubR = R * 0.34;
      const sat = items.slice(0, 6);
      const m = Math.max(1, sat.length);
      circle(cx, cy, hubR, U.range(pr, 0.05, 0.35), th.accent);
      // spokes draw outward, then satellite nodes pop
      sat.forEach((s, i) => {
        const a = -Math.PI / 2 + i * U.TAU / m;
        const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
        const sp = D.stagger(U.range(pr, 0.2, 0.7), i, m, 0.5);
        if (sp <= 0) return;
        D.line(g, cx + Math.cos(a) * hubR, cy + Math.sin(a) * hubR, sx, sy, { w: 2.4 * LW, color: th.ink2, prog: sp, dash: [12, 8] });
        circle(sx, sy, 62, U.range(sp, 0.5, 1), th.ink);
        if (p.labelsOn !== false) D.text(g, sx, sy + fs * 0.3, s, { font: th.fonts.label, fs: fs * 0.72, color: th.ink, weight: 'bold', align: 'center', alpha: U.range(sp, 0.6, 1), prog: U.range(sp, 0.6, 1) });
      });
      // hub label
      if (p.labelsOn !== false) D.text(g, cx, cy + fs * 0.3, f.title || '', { font: th.fonts.label, fs: fs * 0.9, color: th.dark ? '#ffd84a' : th.pal.dim, weight: 'bold', align: 'center', alpha: U.range(pr, 0.25, 0.5), prog: U.range(pr, 0.3, 0.6) });
    } else { // table
      // comparison table that builds row by row
      const cols = Math.max(2, ...rows.map(r => r.length));
      const tw = fw * 0.5, x0 = -tw / 2;
      const rh = Math.min(fh * 0.1, 86);
      const th2 = rows.length * rh;
      const y0 = -th2 / 2 + fh * 0.04;
      rows.forEach((r, i) => {
        const rp = D.stagger(U.range(pr, 0.08, 0.85), i, rows.length, 0.5);
        if (rp <= 0) return;
        const y = y0 + i * rh;
        // header row accent
        const header = i === 0;
        if (header) {
          g.save(); g.globalAlpha *= 0.16 * U.range(rp, 0, 0.4);
          g.fillStyle = th.accent; g.fillRect(x0, y, tw, rh); g.restore();
        }
        // row lines
        D.line(g, x0, y, x0 + tw, y, { w: 2.4 * LW, color: th.ink, prog: U.range(rp, 0, 0.5) });
        if (i === rows.length - 1) D.line(g, x0, y + rh, x0 + tw, y + rh, { w: 2.4 * LW, color: th.ink, prog: U.range(rp, 0.4, 0.8) });
        // column separators
        for (let c = 1; c < cols; c++) D.line(g, x0 + tw * c / cols, y, x0 + tw * c / cols, y + rh, { w: 1.4 * LW, color: th.ink2, prog: U.range(rp, 0.2, 0.6), alpha: 0.7 });
        // cells type in
        r.slice(0, cols).forEach((cell, c) => {
          if (!cell) return;
          D.text(g, x0 + tw * (c + 0.5) / cols, y + rh / 2 + fs * 0.32, cell, {
            font: header ? th.fonts.label : th.fonts.label, fs: fs * (header ? 0.8 : 0.74),
            color: header ? th.ink : (c === 0 ? th.ink : th.ink2), weight: header ? 'bold' : 'normal',
            align: 'center', alpha: U.range(rp, 0.25, 0.7), prog: U.range(rp, 0.3, 0.95),
          });
        });
      });
    }

    // title (not for hub — it uses the hub label)
    if (f.title && p.kind !== 'hub' && p.kind !== 'matrix') {
      const tp = U.range(pr, 0.6, 0.85);
      if (tp > 0) D.text(g, 0, -fh / 2 + 82, f.title, { font: th.fonts.head, fs: 52, color: th.ink, weight: 'bold', align: 'center', alpha: tp, prog: U.range(tp, 0.1, 1) });
    }
    g.restore();
  },
});
