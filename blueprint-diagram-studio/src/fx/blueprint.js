// FAMILY 1 — Blueprint draw-on: a technical line drawing that draws itself stroke by stroke on one
// of six papers, then dimensions count up, leader-line labels pop on and a generic title block
// finishes the sheet. The drawing can be one of 16 built-in parametric shapes, the user's own SVG,
// or a trace of the user's photo (edge detection -> vectorised strokes).
BD.fx.register({
  id: 'blueprint', name: 'Blueprint draw-on', fam: 'Blueprint draw-on',
  note: 'एक तकनीकी रेखाचित्र जो ख़ुद ख़ुद की खिंचता है — पहले रूपरेखा, फिर विवरण, फिर माप और लेबल। A technical drawing that draws itself: outline, details, dimensions with counting measurements, leader labels, title block.',
  dur: 7, x: 0.5, y: 0.5,
  fields: [
    { k: 'title', label: 'Title (title block)', def: 'किले की दीवार' },
    { k: 'sub', label: 'Sheet note', def: 'ELEVATION · SHEET 01' },
    { k: 'labels', label: 'Labels (हिंदी|ENGLISH per line, blank = auto)', multi: true, def: '' },
    { k: 'layerTimes', label: 'Layer timing (auto)', def: '' },
  ],
  params: [
    { k: 'theme', label: 'Paper theme', type: 'select', options: () => BD.themes.LIST, def: 'bp', sec: 'style' },
    { k: 'drawing', label: 'Drawing', type: 'select', options: () => [['photo', 'Trace my photo'], ['svg', 'My SVG file']].concat(BD.shapes.list.map(s => [s.id, s.name])), def: 'fort', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'zoom', label: 'Slow push-in', type: 'range', min: 0, max: 0.08, step: 0.005, def: 0.015, sec: 'style' },
    { k: 'speed', label: 'Draw speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'spread', label: 'Stroke stagger', type: 'range', min: 0.15, max: 1, step: 0.05, def: 0.62, sec: 'anim' },
    { k: 'order', label: 'Draw order', type: 'select', options: [['natural', 'Natural (drafting order)'], ['center', 'Centre-out'], ['random', 'Random (seeded)']], def: 'natural', sec: 'anim' },
    { k: 'ease', label: 'Ease', type: 'select', options: () => BD.util.EASES, def: 'linear', sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.6, sec: 'anim' },
    { k: 'gridOn', label: 'Grid', type: 'check', def: true, sec: 'style' },
    { k: 'hatchOn', label: 'Hatch the body', type: 'check', def: false, sec: 'style' },
    { k: 'dimsOn', label: 'Dimensions + counts', type: 'check', def: true, sec: 'labels' },
    { k: 'labelsOn', label: 'Labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 48, step: 1, def: 30, sec: 'labels' },
    { k: 'blockOn', label: 'Title block', type: 'check', def: true, sec: 'labels' },
    { k: 'photo', label: 'Photo (for trace)', type: 'media', def: '', sec: 'media' },
    { k: 'thresh', label: 'Trace detail (%)', type: 'range', min: 4, max: 40, step: 1, def: 14, sec: 'media' },
    { k: 'svg', label: 'SVG file', type: 'media', def: '', sec: 'media' },
  ],

  // phase windows as fractions of the master animation window
  _win(f) {
    const def = { grid: [0, 0.13], outline: [0.07, 0.58], details: [0.3, 0.72], centres: [0.44, 0.78], dims: [0.52, 0.82], labels: [0.64, 0.94], block: [0.74, 0.97] };
    let ov = {};
    try { ov = JSON.parse((f && f.layerTimes) || '{}'); } catch (e) {}
    const out = {};
    for (const k of Object.keys(def)) out[k] = Array.isArray(ov[k]) && ov[k].length === 2 ? [Math.max(0, +ov[k][0]), Math.min(1, +ov[k][1])] : def[k];
    return out;
  },
  layers(f, p, dur) {
    const end = BD.util.clamp((1 - (p.hold == null ? 1.6 : +p.hold) / dur) / (p.speed || 1), 0.3, 0.97);
    const sec = dur * end, win = this._win(f);
    return [
      { name: 'Grid', start: win.grid[0] * sec, dur: (win.grid[1] - win.grid[0]) * sec },
      { name: 'Outline', start: win.outline[0] * sec, dur: (win.outline[1] - win.outline[0]) * sec },
      { name: 'Details', start: win.details[0] * sec, dur: (win.details[1] - win.details[0]) * sec },
      { name: 'Centre lines', start: win.centres[0] * sec, dur: (win.centres[1] - win.centres[0]) * sec },
      { name: 'Dimensions', start: win.dims[0] * sec, dur: (win.dims[1] - win.dims[0]) * sec },
      { name: 'Labels', start: win.labels[0] * sec, dur: (win.labels[1] - win.labels[0]) * sec },
      { name: 'Title block', start: win.block[0] * sec, dur: (win.block[1] - win.block[0]) * sec },
    ];
  },

  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold == null ? 1.6 : +p.hold) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const win = this._win(f);
    const W = U.range(pr, 0, 0.06); // paper fades up instantly-ish

    // ---- paper + camera push ----
    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const zm = 1 + (p.zoom || 0) * U.clamp(lt / dur);
    g.scale(zm, zm);
    const fw = env.fw, fh = env.fh;
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    if (p.gridOn !== false) D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, win.grid[0], win.grid[1]) });
    D.sheet(g, -fw / 2 + 10, -fh / 2 + 10, fw - 20, fh - 20, { color: th.ink2, prog: U.range(pr, 0.02, 0.2), alpha: 0.7, w: 2 });
    }

    // ---- resolve the drawing source ----
    let strokes = [], dims = [], labels = [], outline = null, vb = [1000, 600];
    if (p.drawing === 'photo') {
      const m = env.media && env.media.kind !== 'svg' ? env.media : null;
      const img = m && m.el && !m.missing ? m.el : BD.engine.demoPhoto(640, 360);
      const tr = BD.trace.photo(img, { thresh: p.thresh == null ? 14 : +p.thresh, maxStrokes: 170 });
      strokes = tr.strokes.map(sp => ({ p: sp.map(pt => [pt[0] * 1000, pt[1] * (1000 / (tr.ar || 16 / 9))]), w: 1, g: 0 }));
      vb = [1000, Math.round(1000 / (tr.ar || 16 / 9))];
      // ghost of the photo under the trace
      const gp = elem ? 0 : U.range(pr, 0, 0.1);
      if (gp > 0) {
        const rw = Math.min(fw * 0.62, fh * (vb[0] / vb[1]) * 0.86), rh = rw * (vb[1] / vb[0]);
        g.save(); g.globalAlpha *= 0.22 * gp;
        g.drawImage(img, -rw / 2, -rh / 2, rw, rh);
        g.restore();
      }
    } else if (p.drawing === 'svg') {
      const m = BD.media[p.svg];
      if (m && m.text) {
        const sv = BD.svgimp.parse(m.text);
        strokes = sv.strokes; vb = sv.vb; labels = [];
      } else {
        // friendly placeholder until the user picks an SVG in the Media panel
        vb = [1000, 600];
        strokes = [];
        labels = [];
        const pp = U.range(pr, 0.1, 0.5);
        if (pp > 0) {
          g.save(); g.setLineDash([16, 12]);
          D.stroke(g, [[-fw * 0.36, -fh * 0.3], [fw * 0.36, -fh * 0.3], [fw * 0.36, fh * 0.3], [-fw * 0.36, fh * 0.3], [-fw * 0.36, -fh * 0.3]], { w: 2, color: th.ink2, prog: pp, alpha: 0.7 });
          g.restore();
        }
        const tp2 = U.range(pr, 0.25, 0.7);
        if (tp2 > 0) {
          D.text(g, 0, -fh * 0.18, 'अपनी SVG फ़ाइल चुनें', { font: th.fonts.label, fs: 54, color: th.ink, weight: 'bold', align: 'center', alpha: tp2, prog: U.range(tp2, 0.2, 0.9) });
          D.text(g, 0, -fh * 0.18 + 74, 'Pick your .svg file in the Media panel', { font: th.fonts.mono, fs: 26, color: th.ink2, align: 'center', alpha: tp2 * 0.8, prog: U.range(tp2, 0.3, 1) });
        }
      }
    } else {
      const sh = BD.shapes.byId[p.drawing] || BD.shapes.byId.fort;
      strokes = sh.strokes; dims = sh.dims || []; labels = sh.labels || []; outline = sh.outline; vb = sh.vb;
    }
    // user label overrides
    const ul = T.lines(f.labels);
    if (ul.length) labels = ul.map(s => { const [t, sub] = s.split('|'); return { x: 500, y: 300, t: (t || '').trim(), sub: (sub || '').trim() }; });

    // ---- fit into the frame ----
    const arS = vb[0] / vb[1];
    let rw = Math.min(fw * 0.58, fh * 0.62 * arS), rh = rw / arS;
    if (rh > fh * 0.66) { rh = fh * 0.66; rw = rh * arS; }
    const RX = -rw / 2, RY = -rh / 2 - fh * 0.02;
    const k = rw / vb[0];
    const map = pt => [RX + pt[0] * k, RY + pt[1] * k];

    // ---- strokes by group ----
    const ease = U.ease[p.ease] || U.ease.linear;
    const groups = [0, 1, 2];
    const gw = [win.outline, win.details, win.centres];
    for (const gr of groups) {
      let list = strokes.map((s, i) => ({ s, i })).filter(x => (x.s.g || 0) === gr);
      if (!list.length) continue;
      if (p.order === 'center') {
        const cx = vb[0] / 2, cy = vb[1] / 2;
        list.sort((a, b) => {
          const ca = a.s.p.reduce((m, q) => m + Math.hypot(q[0] - cx, q[1] - cy), 0) / a.s.p.length;
          const cb = b.s.p.reduce((m, q) => m + Math.hypot(q[0] - cx, q[1] - cy), 0) / b.s.p.length;
          return ca - cb;
        });
      } else if (p.order === 'random') {
        list.sort((a, b) => U.h1(a.i, env.seed + 5) - U.h1(b.i, env.seed + 5));
      }
      const [a, b] = gw[gr];
      const n = list.length;
      list.forEach((x, j) => {
        const sp = D.stagger(U.range(pr, a, b), j, n, p.spread == null ? 0.5 : +p.spread);
        if (sp <= 0) return;
        D.stroke(g, x.s.p.map(map), {
          w: (x.s.w == null ? 1 : x.s.w) * (p.lineW || 1) * (gr === 0 ? 4 : gr === 1 ? 2.4 : 1.6),
          color: gr === 2 ? th.ink2 : th.ink, prog: ease ? ease(sp) : sp,
          glow: th.glow ? 0.7 : 0, boil: th.wobble, seed: env.seed + x.i, t: lt,
          dash: x.s.dash ? [16, 10] : null, alpha: gr === 2 ? 0.8 : 1,
        });
      });
    }

    // ---- hatching on the body ----
    if (p.hatchOn && outline) {
      D.hatch(g, { poly: outline.map(map), angle: 45, sp: 26, prog: U.range(pr, win.details[0] + 0.1, win.centres[1]), color: th.ink2, alpha: 0.4, w: 1.4 });
    }

    // ---- dimensions (count up) ----
    if (p.dimsOn !== false && dims.length) {
      dims.forEach((d, i) => {
        const dp = D.stagger(U.range(pr, win.dims[0], win.dims[1]), i, dims.length, 0.7);
        if (dp <= 0) return;
        const A = map([d.x1, d.y1]), B = map([d.x2, d.y2]);
        const dec = Math.abs(d.to) < 10 ? 1 : 0;
        D.dim(g, A[0], A[1], B[0], B[1], {
          th, off: (d.off == null ? 70 : d.off) * k * 1.2, prog: dp,
          to: d.to, unit: d.unit || ' m', fmt: 'plain', dec, lang: env.lang,
          w: 2 * (p.lineW || 1), color: th.dim, textAng: d.ang, fs: 24 * (p.lineW || 1) + 4,
          boil: th.wobble ? 0.3 : 0, seed: env.seed + 90 + i, t: lt,
        });
      });
    }

    // ---- labels on leader lines ----
    if (p.labelsOn !== false && labels.length) {
      labels.forEach((L, i) => {
        const lp = D.stagger(U.range(pr, win.labels[0], win.labels[1]), i, labels.length, 0.55);
        if (lp <= 0) return;
        const [px, py] = map([L.x, L.y]);
        const side = px < 0 ? 'left' : 'right';
        const bx = side === 'left' ? -fw / 2 + 70 : fw / 2 - 70;
        const by = U.clamp(py, -fh / 2 + 90, fh / 2 - 180);
        D.leader(g, px, py, bx, by, {
          text: L.t, sub: L.sub, prog: lp, th, fs: p.labelSize || 30,
          side, color: th.dim, badge: labels.length > 3 ? i + 1 : null, seed: env.seed + i * 3, t: lt,
        });
      });
    }

    // ---- title block ----
    if (p.blockOn !== false) {
      const bw = Math.min(470, fw * 0.27), bh = 36 * 5.4;
      const rows = [
        ['TITLE', f.title || ''],
        ['SHEET', f.sub || ''],
        ['SCALE', '1 : 200'],
        ['DWG NO.', 'BD-' + String(1000 + (env.seed * 7) % 900)],
        ['DRAWN', env.lang === 'hi' ? 'ड्रॉइंग विभाग' : 'DRAWING DEPT'],
      ];
      D.titleBlock(g, fw / 2 - 34 - bw, fh / 2 - 34 - bh, bw, bh, rows, { prog: U.range(pr, win.block[0], win.block[1]), th, fs: 21 });
    }
    g.restore();
  },
});
