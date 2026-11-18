// FAMILY 8 — Cross-sections & layers: earth's layers, sea depth with depth markers, building
// floors, tunnel / mine shafts, a pipe or road cross-section. Layers slide in and get labelled.
BD.fx.register({
  id: 'cross', name: 'Cross-section & layers', fam: 'Cross-sections & layers',
  note: 'धरती की परतें, समुद्र की गहराई, इमारत की मंज़िलें, सुरंग या सड़क का कट — परतें एक-एक करके आती हैं और लेबल होती हैं। Earth layers, sea depth, building floors, tunnels, pipe sections — layers slide in and get labelled.',
  dur: 7,
  fields: [
    { k: 'title', label: 'Title', def: 'धरती के अंदर' },
    { k: 'sub', label: 'Sub note', def: 'CROSS-SECTION' },
    { k: 'items', label: 'Layers (नाम | value | note)', multi: true, def: 'पृथ्वी की परत | 30 | क्रस्ट\nमैंटल | 2900 | चट्टान\nबाहरी कोर | 5100 | तरल\nभीतरी कोर | 6371 | ठोस' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'aged', sec: 'style' },
    { k: 'kind', label: 'Section', type: 'select', options: () => [
      ['earth', 'Earth layers (circles)'], ['sea', 'Sea depth column'], ['floors', 'Building floors'], ['tunnel', 'Tunnel / mine shaft'], ['pipe', 'Pipe cross-section'],
    ], def: 'earth', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'hatchOn', label: 'Hatch layers', type: 'check', def: true, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.8, sec: 'anim' },
    { k: 'labelsOn', label: 'Layer labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 38, step: 1, def: 26, sec: 'labels' },
    { k: 'unit', label: 'Value unit', type: 'text', def: ' km', sec: 'labels' },
  ],
  _layers(f) {
    return BD.text.lines(f.items).map(s => {
      const [name, v, note] = s.split('|').map(x => (x || '').trim());
      return { name: name || '', v: parseFloat(v) || 0, note: note || '' };
    });
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 1.8) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const fs = p.labelSize || 26;
    const items = this._layers(f);
    const n = Math.max(1, items.length);
    const unit = p.unit == null ? ' km' : String(p.unit);

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.08), minor: 96, major: 480 });
    D.sheet(g, -fw / 2 + 10, -fh / 2 + 10, fw - 20, fh - 20, { color: th.ink2, prog: U.range(pr, 0.02, 0.2), alpha: 0.7, w: 2 });
    }

    if (p.kind === 'earth') {
      // concentric circles revealed by a sweeping radius (scan), each layer hatched + labelled
      const cx = 0, cy = fh * 0.02, R = Math.min(fw, fh) * 0.36;
      const maxV = Math.max(...items.map(it => it.v), 1);
      const radii = items.map(it => R * (it.v / maxV));
      // sweep line
      const sweep = U.range(pr, 0.08, 0.5) * U.TAU - Math.PI / 2;
      const swP = U.range(pr, 0.06, 0.5);
      if (swP > 0 && swP < 1) {
        g.save();
        g.strokeStyle = th.accent; g.lineWidth = 2.6 * LW; g.setLineDash([18, 10]);
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sweep) * R * 1.05, cy + Math.sin(sweep) * R * 1.05); g.stroke();
        g.restore();
      }
      // layers draw as arcs up to the sweep angle
      items.forEach((it, i) => {
        const rIn = i === 0 ? R : radii[i - 1];
        const rOut = radii[i];
        const a0 = -Math.PI / 2;
        const arcP = U.clamp((sweep - a0) / U.TAU * 2); // 0..2 revolutions worth
        const appear = U.range(pr, 0.08 + i * 0.06, 0.3 + i * 0.06);
        if (appear <= 0) return;
        const frac = U.clamp(arcP);
        // outer boundary arc
        D.stroke(g, BD.shapes.arc(cx, cy, rOut, rOut, a0, a0 + frac * U.TAU, 48), { w: 3 * LW, color: th.ink, prog: 1, boil: th.wobble, seed: env.seed + i, t: lt, glow: th.glow ? 0.5 : 0 });
        // inner boundary only for the first layer
        if (i === 0) D.stroke(g, BD.shapes.arc(cx, cy, rIn, rIn, a0, a0 + frac * U.TAU, 48), { w: 3 * LW, color: th.ink, prog: 1 });
        // radial hatch ticks between rIn..rOut
        if (p.hatchOn !== false) {
          g.save(); g.strokeStyle = th.ink2; g.lineWidth = 1.4 * LW; g.globalAlpha *= 0.5;
          for (let a = a0; a <= a0 + frac * U.TAU; a += 0.16) {
            g.beginPath(); g.moveTo(cx + Math.cos(a) * (rIn + 4), cy + Math.sin(a) * (rIn + 4)); g.lineTo(cx + Math.cos(a) * (rOut - 4), cy + Math.sin(a) * (rOut - 4)); g.stroke();
          }
          g.restore();
        }
      });
      // core dot
      if (pr > 0.4) { g.save(); g.globalAlpha *= U.range(pr, 0.4, 0.55); g.beginPath(); g.arc(cx, cy, Math.max(3, radii[0] * 0.06), 0, U.TAU); g.fillStyle = th.accent; g.fill(); g.restore(); }
      // labels with depth counts, staggered after the sweep
      items.forEach((it, i) => {
        const lp = D.stagger(U.range(pr, 0.42, 0.9), i, n, 0.5);
        if (lp <= 0) return;
        const rMid = (i === 0 ? radii[0] : (radii[i - 1] + radii[i]) / 2);
        const ang = -Math.PI / 2 + (i % 2 === 0 ? 0.6 : -0.6);
        const px = cx + Math.cos(ang) * rMid, py = cy + Math.sin(ang) * rMid;
        const side = px >= 0 ? 'right' : 'left';
        D.leader(g, px, py, side === 'right' ? fw / 2 - 80 : -fw / 2 + 80, U.clamp(py, -fh / 2 + 130, fh / 2 - 150), {
          text: it.name, sub: T.formatNumber(it.v * U.range(lp, 0.2, 1), 'plain', 0, 'en') + unit + (it.note ? ' · ' + it.note : ''), prog: lp, th, fs, side, color: th.dim, marker: 'dot', seed: env.seed + i * 7, t: lt,
        });
      });
    } else if (p.kind === 'sea') {
      // vertical water column with depth bands + markers
      const x0 = -fw * 0.13, w = fw * 0.4, top = -fh * 0.34, bot = fh * 0.36;
      const maxV = Math.max(...items.map(it => it.v), 1);
      // water gradient
      const wp = U.range(pr, 0.05, 0.3);
      if (wp > 0) {
        g.save(); g.globalAlpha *= wp * 0.9;
        const gr = g.createLinearGradient(0, top, 0, bot);
        gr.addColorStop(0, 'rgba(64,140,170,.55)'); gr.addColorStop(0.5, 'rgba(24,70,110,.7)'); gr.addColorStop(1, 'rgba(6,20,48,.92)');
        g.fillStyle = gr; g.fillRect(x0, top, w, bot - top);
        g.strokeStyle = th.ink; g.lineWidth = 3 * LW; g.strokeRect(x0, top, w, bot - top);
        g.restore();
      }
      // surface waves
      for (let i = 0; i < 3; i++) D.line(g, x0 + 14 + i * 26, top + 18 + i * 14, x0 + w - 20 + i * 12, top + 18 + i * 14, { w: 1.4 * LW, color: th.ink2, prog: U.range(pr, 0.12, 0.4), alpha: 0.6 });
      // depth bands + markers
      items.forEach((it, i) => {
        const lp = D.stagger(U.range(pr, 0.15, 0.85), i, n, 0.4);
        if (lp <= 0) return;
        const y = U.lerp(top, bot, it.v / maxV);
        const slide = U.ease.out(U.range(lp, 0, 0.5));
        D.line(g, x0, y, x0 + w, y, { w: 2.4 * LW, color: th.ink, prog: U.range(lp, 0, 0.5), dash: [14, 9] });
        // depth marker to the right with counting value
        const mx = x0 + w + 40 + slide * 30;
        D.leader(g, x0 + w - 6, y, mx + 130, y, {
          text: it.name, sub: T.formatNumber(it.v * U.range(lp, 0.3, 1), 'plain', 0, 'en') + unit + (it.note ? ' · ' + it.note : ''), prog: U.range(lp, 0.3, 1), th, fs: fs * 0.9, side: 'left', color: th.dim, marker: 'none', run: 24, seed: env.seed + i * 5, t: lt,
        });
      });
      // sea floor
      D.stroke(g, [[x0 - 30, bot + 26], [x0 + w * 0.35, bot + 6], [x0 + w * 0.7, bot + 34], [x0 + w + 30, bot + 10]], { w: 3 * LW, color: th.ink, prog: U.range(pr, 0.3, 0.6), boil: th.wobble, seed: env.seed + 77, t: lt });
    } else if (p.kind === 'floors') {
      // building section: floors stack up from the ground
      const x0 = -fw * 0.16, w = fw * 0.34, fh2 = (fh * 0.72) / n;
      const base = fh * 0.36;
      D.line(g, x0 - 60, base, x0 + w + 60, base, { w: 3.6 * LW, color: th.ink, prog: U.range(pr, 0.02, 0.16) });
      items.forEach((it, i) => {
        const lp = D.stagger(U.range(pr, 0.08, 0.8), i, n, 0.45);
        if (lp <= 0) return;
        const y = base - (i + 1) * fh2;
        const slide = U.ease.out(U.range(lp, 0, 0.5));
        const yy = y + (1 - slide) * fh2 * 0.6;
        // floor slab + walls
        D.line(g, x0, yy, x0 + w, yy, { w: 3 * LW, color: th.ink, prog: U.range(lp, 0.1, 0.7) });
        D.line(g, x0, yy, x0, yy + fh2, { w: 2 * LW, color: th.ink, prog: U.range(lp, 0.3, 0.8), alpha: 0.7 });
        D.line(g, x0 + w, yy, x0 + w, yy + fh2, { w: 2 * LW, color: th.ink, prog: U.range(lp, 0.3, 0.8), alpha: 0.7 });
        // windows hint
        for (let k = 0; k < 3; k++) D.stroke(g, [[x0 + 30 + k * (w - 60) / 3, yy + fh2 * 0.28], [x0 + 30 + k * (w - 60) / 3 + (w - 90) / 5, yy + fh2 * 0.28], [x0 + 30 + k * (w - 60) / 3 + (w - 90) / 5, yy + fh2 * 0.62], [x0 + 30 + k * (w - 60) / 3, yy + fh2 * 0.62], [x0 + 30 + k * (w - 60) / 3, yy + fh2 * 0.28]], { w: 1.4 * LW, color: th.ink2, prog: U.range(lp, 0.4, 0.85), alpha: 0.8 });
        // floor label to the right with height count
        D.leader(g, x0 + w - 4, yy + fh2 * 0.5, x0 + w + 170, yy + fh2 * 0.5, {
          text: it.name, sub: (it.note || '') + (it.v ? ' · ' + T.formatNumber(it.v * U.range(lp, 0.3, 1), 'plain', 0, 'en') + unit : ''), prog: U.range(lp, 0.4, 1), th, fs: fs * 0.9, side: 'left', color: th.dim, marker: 'dot', run: 26, seed: env.seed + i * 9, t: lt,
        });
      });
      // roof
      const rp = U.range(pr, 0.6, 0.85);
      if (rp > 0) D.stroke(g, [[x0 - 14, base - n * fh2], [x0 + w / 2, base - n * fh2 - fh2 * 0.55], [x0 + w + 14, base - n * fh2]], { w: 3 * LW, color: th.ink, prog: rp });
    } else if (p.kind === 'tunnel') {
      // vertical shaft with levels going down
      const cx = -fw * 0.1, top = -fh * 0.3, bot = fh * 0.36;
      const maxV = Math.max(...items.map(it => it.v), 1);
      D.line(g, cx - 30, top - 30, cx - 30, bot + 20, { w: 3 * LW, color: th.ink, prog: U.range(pr, 0.05, 0.3) });
      D.line(g, cx + 30, top - 30, cx + 30, bot + 20, { w: 3 * LW, color: th.ink, prog: U.range(pr, 0.08, 0.34) });
      // cage going down
      const cage = U.lerp(top, bot - 60, U.ease.inOut(U.range(pr, 0.15, 0.7)));
      D.stroke(g, [[cx - 22, cage], [cx + 22, cage], [cx + 22, cage + 60], [cx - 22, cage + 60], [cx - 22, cage]], { w: 2.4 * LW, color: th.accent, prog: 1 });
      D.line(g, cx, top - 30, cx, cage, { w: 1.6 * LW, color: th.ink2, prog: 1, dash: [10, 7] });
      // levels
      items.forEach((it, i) => {
        const lp = D.stagger(U.range(pr, 0.2, 0.85), i, n, 0.4);
        if (lp <= 0) return;
        const y = U.lerp(top + 40, bot, i / Math.max(1, n - 1));
        const slide = U.ease.out(U.range(lp, 0, 0.5));
        // gallery (horizontal tunnel) slides out
        D.line(g, cx + 30, y, cx + 30 + fw * 0.3 * slide, y, { w: 3 * LW, color: th.ink, prog: 1 });
        D.line(g, cx + 30, y + 26, cx + 30 + fw * 0.3 * slide, y + 26, { w: 2 * LW, color: th.ink2, prog: 1, alpha: 0.7 });
        D.leader(g, cx + 30 + fw * 0.3 * slide - 8, y + 13, cx + fw * 0.5, y + 13, {
          text: it.name, sub: T.formatNumber(it.v * U.range(lp, 0.3, 1), 'plain', 0, 'en') + unit + (it.note ? ' · ' + it.note : ''), prog: U.range(lp, 0.4, 1), th, fs: fs * 0.9, side: 'left', color: th.dim, marker: 'none', run: 24, seed: env.seed + i * 6, t: lt,
        });
      });
      // ground line + headframe
      D.line(g, cx - 160, top - 30, cx + 160, top - 30, { w: 3.4 * LW, color: th.ink, prog: U.range(pr, 0.02, 0.14) });
      D.stroke(g, [[cx - 90, top - 30], [cx, top - 130], [cx + 90, top - 30]], { w: 2.4 * LW, color: th.ink, prog: U.range(pr, 0.06, 0.3) });
    } else { // pipe cross-section (concentric rings) or road layers
      const cx = -fw * 0.12, cy = fh * 0.04, R = Math.min(fw, fh) * 0.3;
      const rings = Math.max(2, n);
      items.forEach((it, i) => {
        const lp = D.stagger(U.range(pr, 0.08, 0.8), i, n, 0.45);
        if (lp <= 0) return;
        const r = R * (1 - i / rings * 0.8);
        const c = BD.shapes.circ(0, 0, r);
        D.stroke(g, c.map(q => [cx + q[0], cy + q[1]]), { w: 3 * LW, color: th.ink, prog: U.ease.out(lp), boil: th.wobble, seed: env.seed + i * 11, t: lt, glow: th.glow ? 0.5 : 0 });
        if (p.hatchOn !== false && i < n - 1) {
          const r2 = R * (1 - (i + 1) / rings * 0.8);
          D.hatch(g, { poly: BD.shapes.circ(0, 0, (r + r2) / 2).map(q => [cx + q[0], cy + q[1]]), angle: 45, sp: 18, prog: U.range(lp, 0.5, 1), color: th.ink2, alpha: 0.4, w: 1.2 });
        }
        // label with diameter count
        const ang = -Math.PI / 4;
        const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
        D.leader(g, px, py, px + 190, py - 40 - i * 64, {
          text: it.name, sub: (it.v ? T.formatNumber(it.v * U.range(lp, 0.3, 1), 'plain', 0, 'en') + unit + (it.note ? ' · ' + it.note : '') : it.note), prog: U.range(lp, 0.4, 1), th, fs: fs * 0.9, side: 'left', color: th.dim, marker: 'dot', run: 30, seed: env.seed + i * 8, t: lt,
        });
      });
      // flow arrows inside the bore
      const fp = U.range(pr, 0.5, 0.7);
      if (fp > 0) D.dots(g, [[cx - R * 0.14, cy], [cx + R * 0.14, cy]], { speed: 90, r: 6, color: th.accent, gap: 60, t: lt, prog: fp });
    }

    // title block corner
    if (f.title) {
      const tp = U.range(pr, 0.55, 0.8);
      if (tp > 0) {
        D.text(g, -fw / 2 + 60, -fh / 2 + 80, f.title, { font: th.fonts.head, fs: 52, color: th.ink, weight: 'bold', alpha: tp, prog: U.range(tp, 0.1, 1) });
        D.line(g, -fw / 2 + 60, -fh / 2 + 100, -fw / 2 + 60 + 210 * U.range(tp, 0.4, 1), -fh / 2 + 100, { w: 4, color: th.accent });
      }
    }
    if (f.sub) D.text(g, -fw / 2 + 60, -fh / 2 + 132, f.sub, { font: th.fonts.mono, fs: 21, color: th.ink2, alpha: U.range(pr, 0.3, 0.5) });
    g.restore();
  },
});
