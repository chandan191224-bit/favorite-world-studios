// FAMILY 3 — Exploded & cutaway views: an object splits into parts along an axis (parts slide out
// with leader-line labels), or a cutaway reveals the inside layer by layer, with an X-ray look
// (ghost solid + dashed outline over the real structure).
BD.fx.register({
  id: 'exploded', name: 'Exploded / cutaway', fam: 'Exploded & cutaway',
  note: 'वस्तु के हिस्से अलग-अलग खिसकते हैं और हर हिस्से का लेबल लगता है — या अंदर की परतें एक-एक करके खुलती हैं। Parts slide apart with labels, or the inside reveals layer by layer.',
  dur: 7,
  fields: [
    { k: 'title', label: 'Title', def: 'रॉकेट के हिस्से' },
    { k: 'sub', label: 'Sub note', def: 'CUTAWAY VIEW' },
  ],
  params: [
    { k: 'theme', label: 'Paper theme', type: 'select', options: () => BD.themes.LIST, def: 'bp', sec: 'style' },
    { k: 'model', label: 'Object', type: 'select', options: () => [
      ['rocket', 'Rocket stages'], ['wall', 'Wall layers'], ['floors', 'Building floors'], ['pipe', 'Pipe jacket'], ['dam', 'Dam body'],
    ], def: 'rocket', sec: 'style' },
    { k: 'mode', label: 'Mode', type: 'select', options: () => [['explode', 'Exploded view'], ['cutaway', 'Cutaway (layer by layer)'], ['xray', 'X-ray (ghost + outline)']], def: 'explode', sec: 'style' },
    { k: 'axis', label: 'Split axis', type: 'select', options: () => [['y', 'Vertical'], ['x', 'Horizontal']], def: 'y', sec: 'style' },
    { k: 'explode', label: 'Explode distance', type: 'range', min: 0.2, max: 1.6, step: 0.05, def: 0.8, sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'zoom', label: 'Slow push-in', type: 'range', min: 0, max: 0.08, step: 0.005, def: 0.015, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.6, sec: 'anim' },
    { k: 'ease', label: 'Ease', type: 'select', options: () => BD.util.EASES, def: 'outQuart', sec: 'anim' },
    { k: 'labelsOn', label: 'Part labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 42, step: 1, def: 27, sec: 'labels' },
    { k: 'hatchOn', label: 'Hatch cut faces', type: 'check', def: true, sec: 'style' },
  ],
  layers(f, p, dur) {
    const end = BD.util.clamp((1 - (p.hold || 1.6) / dur) / (p.speed || 1), 0.3, 0.97);
    return [
      { name: 'Outline', start: 0.04 * dur * end, dur: 0.3 * dur * end },
      { name: 'Parts', start: 0.28 * dur * end, dur: 0.5 * dur * end },
      { name: 'Labels', start: 0.55 * dur * end, dur: 0.42 * dur * end },
    ];
  },
  // part definitions: each part = { name, sub, poly (closed, in object space), hatch }
  _parts(model) {
    switch (model) {
      case 'wall': return [
        { name: 'बाहरी परत', sub: 'OUTER FACE', poly: [[340, 240], [660, 240], [660, 290], [340, 290]], hatch: true },
        { name: 'गुहा', sub: 'CAVITY', poly: [[340, 300], [660, 300], [660, 350], [340, 350]] },
        { name: 'भीतरी परत', sub: 'INNER LEAF', poly: [[340, 360], [660, 360], [660, 410], [340, 410]], hatch: true },
        { name: 'नींव', sub: 'FOUNDATION', poly: [[320, 420], [680, 420], [680, 520], [320, 520]], hatch: true },
      ];
      case 'floors': return [
        { name: 'छत', sub: 'ROOF', poly: [[360, 160], [640, 160], [640, 210], [360, 210]], hatch: true },
        { name: 'तीसरी मंज़िल', sub: 'FLOOR 3', poly: [[360, 220], [640, 220], [640, 300], [360, 300]] },
        { name: 'दूसरी मंज़िल', sub: 'FLOOR 2', poly: [[360, 310], [640, 310], [640, 390], [360, 390]] },
        { name: 'ज़मीन मंज़िल', sub: 'GROUND', poly: [[360, 400], [640, 400], [640, 480], [360, 480]] },
        { name: 'नींव', sub: 'BASEMENT', poly: [[380, 490], [620, 490], [620, 540], [380, 540]], hatch: true },
      ];
      case 'pipe': return [
        { name: 'बाहरी खोल', sub: 'JACKET', poly: [[220, 260], [780, 260], [780, 340], [220, 340]], hatch: true },
        { name: 'इन्सुलेशन', sub: 'INSULATION', poly: [[240, 275], [760, 275], [760, 325], [240, 325]] },
        { name: 'मुख्य पाइप', sub: 'CORE PIPE', poly: [[260, 288], [740, 288], [740, 312], [260, 312]], hatch: true },
      ];
      case 'dam': return [
        { name: 'शीर्ष', sub: 'CREST', poly: [[430, 200], [570, 200], [570, 250], [430, 250]], hatch: true },
        { name: 'ऊपरी पिंड', sub: 'UPPER BLOCK', poly: [[410, 260], [590, 260], [620, 350], [380, 350]], hatch: true },
        { name: 'निचला पिंड', sub: 'LOWER BLOCK', poly: [[380, 360], [620, 360], [660, 480], [340, 480]], hatch: true },
        { name: 'नींव चट्टान', sub: 'ROCK BASE', poly: [[320, 490], [680, 490], [680, 540], [320, 540]], hatch: true },
      ];
      default: return [ // rocket
        { name: 'नोज़ कोन', sub: 'NOSE CONE', poly: [[460, 120], [540, 120], [500, 60]], hatch: false },
        { name: 'चरण 2', sub: 'STAGE 2', poly: [[460, 130], [540, 130], [540, 300], [460, 300]] },
        { name: 'चरण 1', sub: 'STAGE 1', poly: [[460, 310], [540, 310], [540, 450], [460, 450]] },
        { name: 'इंजन', sub: 'ENGINE', poly: [[468, 460], [532, 460], [516, 510], [484, 510]], hatch: true },
        { name: 'फिन', sub: 'FINS', poly: [[420, 430], [460, 430], [460, 510], [420, 510]], hatch: true },
      ];
    }
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 1.6) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const ease = U.ease[p.ease] || U.ease.outQuart;
    const fw = env.fw, fh = env.fh;
    const vert = p.axis !== 'x';

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const zm = 1 + (p.zoom || 0) * U.clamp(lt / dur);
    g.scale(zm, zm);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.12) });
    }

    const parts = this._parts(p.model);
    const n = parts.length;
    const LW = (p.lineW || 1);
    // object -> frame transform (object space 1000x600); exploded stacks sit lower so the top part clears the title
    const k = Math.min(fw * 0.42 / 1000, fh * 0.52 / 600) * 1.35;
    const yOff = p.mode === 'explode' ? fh * 0.06 : -fh * 0.02;
    const map = pt => [(pt[0] - 500) * k, (pt[1] - 300) * k + yOff];

    // total explode travel per part (stacked further for outer parts)
    const travel = i => (i - (n - 1) / 2) * 150 * (p.explode == null ? 0.8 : +p.explode);

    if (p.mode === 'xray') {
      // ghost solid silhouette + dashed outline over the full object, then parts outlined one by one
      const all = parts.map(pt => pt.poly).flat();
      const minX = Math.min(...all.map(q => q[0])), maxX = Math.max(...all.map(q => q[0]));
      const minY = Math.min(...all.map(q => q[1])), maxY = Math.max(...all.map(q => q[1]));
      const ghost = U.range(pr, 0.05, 0.35);
      if (ghost > 0) {
        g.save(); g.globalAlpha *= 0.16 * ghost;
        g.fillStyle = th.ink;
        g.beginPath();
        parts.forEach((pt, i) => { pt.poly.forEach((q, j) => { const [x, y] = map(q); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); });
        g.fill(); g.restore();
      }
      parts.forEach((pt, i) => {
        const sp = D.stagger(U.range(pr, 0.2, 0.75), i, n, 0.6);
        if (sp <= 0) return;
        D.stroke(g, pt.poly.concat([pt.poly[0]]).map(map), { w: 2.4 * LW, color: th.ink, prog: sp, dash: sp < 1 ? [18, 10] : null, glow: th.glow ? 0.6 : 0, boil: th.wobble, seed: env.seed + i, t: lt });
      });
    } else if (p.mode === 'cutaway') {
      // outer outline draws, then a sweeping cut plane reveals inner layers (each hatch + draw)
      const all = parts.map(pt => pt.poly).flat();
      const minX = Math.min(...all.map(q => q[0])), maxX = Math.max(...all.map(q => q[0]));
      const minY = Math.min(...all.map(q => q[1])), maxY = Math.max(...all.map(q => q[1]));
      const outer = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
      D.stroke(g, outer.map(map), { w: 3.4 * LW, color: th.ink, prog: U.range(pr, 0.05, 0.3), glow: th.glow ? 0.6 : 0 });
      // ghost fill
      const gp = U.range(pr, 0.08, 0.3);
      if (gp > 0) {
        g.save(); g.globalAlpha *= 0.12 * gp; g.fillStyle = th.ink;
        g.beginPath(); outer.forEach((q, j) => { const [x, y] = map(q); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.restore();
      }
      // cut sweep (vertical scan line for vertical axis)
      const sweep = U.range(pr, 0.25, 0.6);
      const [sx0, sy0] = map([minX, minY]), [sx1, sy1] = map([maxX, maxY]);
      if (sweep > 0 && sweep < 1) {
        const cx = vert ? U.lerp(sx0, sx1, sweep) : 0;
        const cy = vert ? 0 : U.lerp(sy0, sy1, sweep);
        g.save();
        g.strokeStyle = th.accent; g.lineWidth = 2.4 * LW; g.setLineDash([16, 8]);
        g.beginPath();
        if (vert) { g.moveTo(cx, sy0); g.lineTo(cx, sy1); } else { g.moveTo(sx0, cy); g.lineTo(sx1, cy); }
        g.stroke(); g.restore();
      }
      parts.forEach((pt, i) => {
        const layer = U.range(pr, 0.26 + i * 0.09, 0.5 + i * 0.09);
        if (layer <= 0) return;
        const lp = U.clamp(layer);
        D.stroke(g, pt.poly.concat([pt.poly[0]]).map(map), { w: 2.2 * LW, color: th.ink, prog: U.ease.out(lp), glow: th.glow ? 0.6 : 0, boil: th.wobble, seed: env.seed + i * 7, t: lt });
        if (pt.hatch && p.hatchOn !== false) D.hatch(g, { poly: pt.poly.map(map), angle: 45, sp: 20, prog: lp * 0.8, color: th.ink2, alpha: 0.45, w: 1.3 });
      });
    } else {
      // exploded: the assembled outline draws faintly as a ghost, then parts slide apart at full strength
      parts.forEach((pt, i) => {
        const op = U.range(pr, 0.06, 0.26);
        if (op <= 0) return;
        D.stroke(g, pt.poly.concat([pt.poly[0]]).map(map), { w: 2.2 * LW, color: th.ink, prog: op, glow: th.glow ? 0.6 : 0, boil: th.wobble, seed: env.seed + i, t: lt, alpha: 0.32 });
      });
      // slide apart (travel: part 0 = top for vertical stacks -> negative travel = up; y is down)
      const slide = U.range(pr, 0.28, 0.8);
      parts.forEach((pt, i) => {
        const sp = ease(D.stagger(slide, i, n, 0.45));
        if (sp <= 0) return;
        const t = vert ? [0, travel(i) * k * 0.9] : [travel(i) * k * 0.9, 0];
        g.save();
        g.translate(t[0], t[1]);
        if (pt.hatch && p.hatchOn !== false) D.hatch(g, { poly: pt.poly.map(map), angle: 45, sp: 20, prog: sp * 0.9, color: th.ink2, alpha: 0.4, w: 1.3 });
        D.stroke(g, pt.poly.concat([pt.poly[0]]).map(map), { w: 2.8 * LW, color: th.ink, prog: 1, glow: th.glow ? 0.6 : 0 });
        g.restore();
        // dashed axis line from origin to moved centre
        if (sp > 0.02) {
          const c = pt.poly.reduce((m, q) => [m[0] + q[0] / pt.poly.length, m[1] + q[1] / pt.poly.length], [0, 0]);
          const [cx, cy] = map(c);
          D.cline(g, cx, cy, cx + t[0], cy + t[1], { w: 1.6 * LW, color: th.dim, alpha: U.clamp(sp) * 0.9 });
        }
      });
    }

    // labels: leader lines to both margins, one per part — stacked per side so boxes never overlap
    if (p.labelsOn !== false) {
      const laid = { left: [], right: [] };
      const laidY = { left: [], right: [] };
      parts.forEach((pt, i) => {
        const lp = D.stagger(U.range(pr, 0.55, 0.95), i, n, 0.45);
        if (lp <= 0) return;
        const disp = (p.mode === 'explode') ? (vert ? [travel(i) * k * 0.9] : [travel(i) * k * 0.9]) : [0];
        const c = pt.poly.reduce((m, q) => [m[0] + q[0] / pt.poly.length, m[1] + q[1] / pt.poly.length], [0, 0]);
        const [cx, cy] = map(c);
        const px = cx + (vert ? 0 : disp[0] || 0), py = cy + (vert ? (disp[0] || 0) : 0);
        const side = i % 2 === 0 ? 'right' : 'left';
        const bx = side === 'right' ? fw / 2 - 70 : -fw / 2 + 70;
        // stack: keep 82 px between boxes on the same side
        let by = U.clamp(py, -fh / 2 + 120, fh / 2 - 150);
        const arr = laidY[side];
        for (let guard = 0; guard < 20; guard++) {
          const clash = arr.find(y => Math.abs(y - by) < 84);
          if (clash == null) break;
          by = clash + 84 * (by >= clash ? 1 : -1);
          by = U.clamp(by, -fh / 2 + 120, fh / 2 - 150);
        }
        arr.push(by);
        D.leader(g, px, py, bx, by, { text: pt.name, sub: pt.sub, prog: lp, th, fs: p.labelSize || 27, side, color: th.dim, marker: 'dot', badge: i + 1, seed: env.seed + i * 5, t: lt });
      });
    }

    // title
    if (f.title) {
      const tp = U.range(pr, 0.6, 0.85);
      if (tp > 0) D.text(g, 0, -fh / 2 + 90, f.title, { font: th.fonts.head, fs: 54, color: th.ink, weight: 'bold', align: 'center', alpha: tp, prog: U.range(tp, 0.1, 1) });
    }
    if (f.sub) {
      const sp = U.range(pr, 0.68, 0.9);
      if (sp > 0) D.text(g, 0, -fh / 2 + 136, f.sub, { font: th.fonts.mono, fs: 24, color: th.ink2, align: 'center', alpha: sp * 0.9, prog: U.range(sp, 0.1, 1) });
    }
    g.restore();
  },
});
