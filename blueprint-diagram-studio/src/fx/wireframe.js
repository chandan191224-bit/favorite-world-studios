// FAMILY 2 — Rotating wireframe: a 3D wireframe model (box, cylinder, or an extrusion of any
// built-in silhouette) that draws its edges, then rotates slowly on a turntable with a tilt and
// hidden-line fade (far edges dimmed), then labels pop on.
BD.fx.register({
  id: 'wireframe', name: 'Rotating wireframe', fam: 'Rotating wireframe',
  note: '3D तार-खाका जो धीरे-धीरे घूमता है — दूर की लाइनें हल्की, पास की गहरी। लेबल अंत में आते हैं। A 3D wireframe that spins slowly with hidden-line fade; labels pop on at the end.',
  dur: 8,
  fields: [
    { k: 'title', label: 'Title', def: 'लंबी दीवार' },
    { k: 'labels', label: 'Labels (one per line)', multi: true, def: 'खंभा\nगुंबद' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'neon', sec: 'style' },
    { k: 'model', label: 'Model', type: 'select', options: () => [['box', 'Box'], ['cyl', 'Cylinder'], ['gear', 'Gear disc']].concat(BD.shapes.list.filter(s => s.outline).map(s => [s.id, s.name])), def: 'tower', sec: 'style' },
    { k: 'scale', label: 'Size', type: 'range', min: 0.5, max: 1.6, step: 0.05, def: 1, sec: 'style' },
    { k: 'tilt', label: 'Tilt (deg)', type: 'range', min: -35, max: 35, step: 1, def: 16, sec: 'style' },
    { k: 'rotStart', label: 'Start angle (deg)', type: 'range', min: -180, max: 180, step: 5, def: -28, sec: 'style' },
    { k: 'rotSpeed', label: 'Turntable (deg/s)', type: 'range', min: 3, max: 40, step: 1, def: 14, sec: 'anim' },
    { k: 'spinDir', label: 'Direction', type: 'select', options: [['1', 'Clockwise'], ['-1', 'Counter-clockwise']], def: '1', sec: 'anim' },
    { k: 'fade', label: 'Hidden-line fade', type: 'range', min: 0.05, max: 0.7, step: 0.05, def: 0.3, sec: 'style' },
    { k: 'persp', label: 'Perspective', type: 'range', min: 700, max: 2600, step: 50, def: 1500, sec: 'style' },
    { k: 'dots', label: 'Show vertices', type: 'check', def: true, sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'drawFrac', label: 'Draw-on portion', type: 'range', min: 0.2, max: 0.7, step: 0.05, def: 0.45, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.5, sec: 'anim' },
    { k: 'labelsOn', label: 'Labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 44, step: 1, def: 28, sec: 'labels' },
  ],
  layers(f, p, dur) {
    const end = BD.util.clamp(1 - (p.hold || 1.5) / dur, 0.5, 0.97);
    return [
      { name: 'Edges', start: 0.05 * dur * end, dur: (p.drawFrac || 0.45) * dur * end },
      { name: 'Spin', start: (p.drawFrac || 0.45) * dur * end * 0.6, dur: dur - (p.drawFrac || 0.45) * dur * end * 0.6 },
      { name: 'Labels', start: 0.68 * dur * end, dur: 0.3 * dur * end },
    ];
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, WIRE = BD.wire;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp(1 - (p.hold || 1.5) / dur, 0.5, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;

    // paper
    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.1), minor: 72, major: 360 });
    }

    // model
    let mesh;
    if (p.model === 'box') mesh = WIRE.box(420, 260, 300);
    else if (p.model === 'cyl') mesh = WIRE.cylinder(180, 380, 20);
    else if (p.model === 'gear') mesh = WIRE.disc(210, 70);
    else {
      const sh = BD.shapes.byId[p.model];
      mesh = WIRE.lathe(sh.outline || [[300, 200], [700, 200], [700, 400], [300, 400]], 16, 20);
    }
    // spin ramps in only after the edges have drawn
    const spinStart = (p.drawFrac || 0.45) * 0.6;
    const spinK = U.range(pr, spinStart, spinStart + 0.15);
    const rotY = ((p.rotStart || -28) + (p.spinDir || 1) * (p.rotSpeed || 14) * lt * spinK) * Math.PI / 180;
    const rotX = (p.tilt || 16) * Math.PI / 180;
    const scale = (p.scale || 1) * Math.min(fw, fh) * 0.0016;

    const pts = WIRE.draw(g, mesh, rotY, rotX, 0, -fh * 0.03, scale, {
      color: th.ink, w: (p.lineW || 1) * 2.6, prog: U.range(pr, 0.05, p.drawFrac || 0.45),
      fade: p.fade == null ? 0.3 : +p.fade, dots: p.dots !== false, glow: th.glow ? 0.9 : 0,
      order: 'spin', persp: p.persp || 1500,
    });

    // ground ellipse (turntable disc) under the model's real extent
    const gp = U.range(pr, 0.1, 0.4);
    let groundY = fh * 0.38;
    if (pts) {
      let maxY = -1e9, maxX = 0;
      for (const pt of pts) { if (pt[1] > maxY) maxY = pt[1]; if (Math.abs(pt[0]) > maxX) maxX = Math.abs(pt[0]); }
      groundY = Math.min(fh * 0.44, maxY + 58);
      if (gp > 0) {
        g.save(); g.globalAlpha *= gp * 0.7;
        const ry = 26, rx = Math.max(maxX * 0.9, 130);
        D.stroke(g, D.curvePts([[-rx, groundY], [0, groundY + ry], [rx, groundY], [0, groundY - ry], [-rx, groundY]]), { w: 1.4 * (p.lineW || 1), color: th.ink2, dash: [14, 9], prog: U.range(pr, 0.1, 0.5) });
        g.restore();
      }
    }

    // title
    if (f.title) {
      const tp = U.range(pr, 0.55, 0.8);
      if (tp > 0) D.text(g, -fw / 2 + 90, -fh / 2 + 120, f.title, { font: th.fonts.head, fs: 58, color: th.ink, weight: 'bold', alpha: tp, prog: U.range(tp, 0.1, 1) });
    }
    // labels pop around the model, anchored to REAL projected vertices so the dots always touch geometry
    if (p.labelsOn !== false && pts) {
      const list = BD.text.lines(f.labels);
      const n = list.length;
      // pick anchor vertices: the topmost, then evenly around by height
      const order = pts.map((pt, i) => ({ i, y: pt[1], x: pt[0] })).sort((a, b) => a.y - b.y);
      list.forEach((s, i) => {
        const lp = D.stagger(U.range(pr, 0.68, 0.98), i, n, 0.5);
        if (lp <= 0) return;
      const anchor = order[Math.min(order.length - 1, Math.round(order.length * (i === 0 ? 0.1 : (i + 0.5) / n)))].i;
        const A = pts[anchor];
        const side = A[0] >= 0 ? 'right' : 'left';
        const bx = side === 'right' ? fw / 2 - 80 : -fw / 2 + 80;
        const by = U.clamp(A[1], -fh / 2 + 150, fh / 2 - 140);
        D.leader(g, A[0], A[1], bx, by, {
          text: s, prog: lp, th, fs: p.labelSize || 28, side,
          color: th.dim, marker: 'dot', seed: env.seed + i, t: lt,
        });
      });
    }
    g.restore();
  },
});
