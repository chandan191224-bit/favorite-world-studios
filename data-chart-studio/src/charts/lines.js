// Line charts that draw on with a moving end label + live value, area charts (plain / stacked), scatter & bubble.
(() => {
  const U = DC.util, D = DC.draw, R = DC.charts;
  const key = s => String(s).trim().toLowerCase();

  function pathTo(ctx, pts, smooth) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (!smooth || pts.length < 3) { ctx.lineTo(pts[i][0], pts[i][1]); continue; }
      const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2, s = 0.18;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s, p1[1] + (p2[1] - p0[1]) * s, p2[0] - (p3[0] - p1[0]) * s, p2[1] - (p3[1] - p1[1]) * s, p2[0], p2[1]);
    }
  }

  function lineLike(area) {
    return function draw(ctx, env) {
      const { box, k, P } = env;
      const S = DC.data.series(env.data), ser = S.series, nx = S.x.length; if (!ser.length || nx < 2) return;
      const stacked = area && P.stacked;
      const vals = ser.map(s => s.values.map(v => (isNaN(v) ? null : v)));
      if (stacked) for (let i = 1; i < vals.length; i++) vals[i] = vals[i].map((v, j) => (v == null ? null : v + (vals[i - 1][j] || 0)));
      const rev = env.ease(U.prog(env.t, env.intro, P.build)), fx = rev * (nx - 1);
      const flat = vals.flat().filter(v => v != null);
      const gMax = Math.max(...flat), gMin = Math.min(...flat);
      let yMax = U.niceMax(gMax, 5), yMin = P.yZero || area ? Math.min(0, gMin) : gMin - (gMax - gMin) * 0.1;
      if (!P.yZero && !area) { const st = U.niceStep(yMax - yMin, 5); yMin = Math.floor(yMin / st) * st; }
      if (P.followY) { // axis grows with the line (Johnny Harris style)
        const seen = vals.flatMap(v => v.slice(0, Math.floor(fx) + 2)).filter(v => v != null);
        const cur = Math.max(...seen, yMin + (gMax - yMin) * 0.15);
        yMax = rev >= 1 ? Math.max(cur, gMax) * 1.08 : cur * 1.12;
      }
      const multi = ser.length > 1, legendH = multi && P.legend ? 46 * k : 0;
      const plot = { x: box.x + 96 * k, y: box.y + legendH + 30 * k, w: box.w - 96 * k - (P.endLabel ? 250 * k : 40 * k), h: box.h - legendH - 30 * k - 56 * k };
      const xOf = i => plot.x + (i / (nx - 1)) * plot.w, yOf = v => plot.y + plot.h * (1 - (v - yMin) / (yMax - yMin || 1));
      const a = env.introP;
      D.yGrid(ctx, env, plot, U.ticks(yMin, yMax, 5).filter(v => v <= yMax + 1e-9), yOf, v => env.axis(v, yMax), a);
      D.axisLine(ctx, env, plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h, a);
      if (multi && P.legend) D.legend(ctx, env, ser.map(s => ({ name: s.name, color: D.color(env, s.i, s.color) })), plot.x, box.y + 24 * k, a);
      // x labels appear as the line passes them
      const every = Math.max(1, Math.ceil(nx / (P.xLabels || 8)));
      S.x.forEach((lab, i) => {
        if (i % every && i !== nx - 1) return;
        if (i === nx - 1 - (nx - 1) % every && i !== nx - 1 && nx - 1 - i < every * 0.6) return;
        const al = U.clamp((fx - i) * 2 + 1) * a;
        D.text(ctx, env, lab, xOf(i), plot.y + plot.h + 38 * k, { size: 22 * k, weight: 600, color: env.theme.sub, align: 'center', alpha: al });
      });
      const tips = [];
      // draw stacked areas back-to-front
      const order = ser.map((s, i) => i); if (stacked) order.reverse();
      order.forEach(si => {
        const s = ser[si], v = vals[si], c = D.color(env, s.i, s.color), al = D.dimAlpha(env, s.name);
        const pts = [];
        for (let i = 0; i <= Math.min(nx - 1, Math.floor(fx)); i++) if (v[i] != null) pts.push([xOf(i), yOf(v[i]), i]);
        const i0 = Math.floor(fx), u = fx - i0;
        let tipV = v[Math.min(nx - 1, i0)];
        if (u > 0 && i0 < nx - 1 && v[i0] != null && v[i0 + 1] != null) { tipV = U.lerp(v[i0], v[i0 + 1], u); pts.push([U.lerp(xOf(i0), xOf(i0 + 1), u), yOf(tipV), i0 + u]); }
        if (pts.length < 1 || rev <= 0) return;
        ctx.save(); ctx.globalAlpha *= al;
        if (area) {
          const below = stacked && si > 0 ? vals[si - 1] : null;
          ctx.beginPath(); pathTo(ctx, pts, P.smooth);
          if (below) { for (let j = pts.length - 1; j >= 0; j--) { const xi = pts[j][2], lo = Math.floor(xi), uu = xi - lo, bv = U.lerp(below[lo] || 0, below[Math.min(nx - 1, lo + 1)] || 0, uu); ctx.lineTo(pts[j][0], yOf(bv)); } }
          else { ctx.lineTo(pts[pts.length - 1][0], yOf(Math.max(yMin, 0))); ctx.lineTo(pts[0][0], yOf(Math.max(yMin, 0))); }
          ctx.closePath();
          const g = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
          g.addColorStop(0, U.rgba(c, stacked ? 0.85 : 0.55)); g.addColorStop(1, U.rgba(c, stacked ? 0.6 : 0.04));
          ctx.fillStyle = g; ctx.fill();
        }
        ctx.beginPath(); pathTo(ctx, pts, P.smooth);
        ctx.strokeStyle = c; ctx.lineWidth = (P.width || 6) * k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        D.glow(ctx, env, c, 1.2); ctx.stroke(); D.noGlow(ctx);
        if (P.dots) pts.forEach(pt => { if (Math.abs(pt[2] - Math.round(pt[2])) < 1e-6) { ctx.fillStyle = env.theme.paper ? env.theme.bg0 : env.theme.bg1; ctx.beginPath(); ctx.arc(pt[0], pt[1], 7 * k, 0, 7); ctx.fill(); ctx.lineWidth = 3.5 * k; ctx.stroke(); } });
        const tip = pts[pts.length - 1];
        ctx.fillStyle = c; D.glow(ctx, env, c, 1.5); ctx.beginPath(); ctx.arc(tip[0], tip[1], 10 * k, 0, 7); ctx.fill(); D.noGlow(ctx);
        ctx.restore();
        const raw = stacked ? ser[si].values : v;
        let shown = raw[Math.min(nx - 1, i0)];
        if (u > 0 && i0 < nx - 1 && !isNaN(raw[i0]) && !isNaN(raw[i0 + 1])) shown = U.lerp(raw[i0], raw[i0 + 1], u);
        tips.push({ s, c, x: tip[0], y: tip[1], v: shown, al, ref: Math.max(...s.values.filter(x => !isNaN(x))) });
        s.values.forEach((vv, i) => { if (!isNaN(vv) && v[i] != null) env.anchors[key(s.name + '@' + S.x[i])] = { x: xOf(i), y: yOf(v[i]) }; });
        env.anchors[key(s.name)] = { x: tip[0], y: tip[1] };
        if (!multi) S.x.forEach((lab, i) => { if (v[i] != null) env.anchors[key(lab)] = { x: xOf(i), y: yOf(v[i]) }; });
      });
      if (P.endLabel) {
        // keep end labels from overlapping: sort by y and push apart
        const gap = (multi ? 64 : 56) * k;
        tips.sort((p, q) => p.y - q.y);
        tips.forEach((tp, i) => { tp.ly = i ? Math.max(tp.y, tips[i - 1].ly + gap) : tp.y; });
        tips.forEach(tp => {
          ctx.save(); ctx.globalAlpha *= tp.al * U.clamp(rev * 6);
          const lx = tp.x + 22 * k;
          if (Math.abs(tp.ly - tp.y) > 2) { ctx.strokeStyle = tp.c; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(tp.x + 10 * k, tp.y); ctx.lineTo(lx - 4 * k, tp.ly); ctx.stroke(); }
          D.num(ctx, env, env.fmt(tp.v, tp.ref), lx, tp.ly + (multi ? 2 : 12) * k, { size: 36 * k, color: tp.c, weight: 800, maxW: 230 * k });
          if (multi) D.text(ctx, env, tp.s.name, lx, tp.ly + 30 * k, { size: 22 * k, weight: 700, color: env.theme.sub, maxW: 230 * k });
          ctx.restore();
        });
      }
    };
  }
  const lineParams = [
    { key: 'endLabel', label: 'Moving end label + value', type: 'check', def: true },
    { key: 'smooth', label: 'Smooth curve', type: 'check', def: false },
    { key: 'dots', label: 'Dots on data points', type: 'check', def: false },
    { key: 'followY', label: 'Axis grows with the line', type: 'check', def: false },
    { key: 'yZero', label: 'Axis starts at zero', type: 'check', def: true },
    { key: 'legend', label: 'Legend (several lines)', type: 'check', def: true },
    { key: 'width', label: 'Line width', type: 'range', min: 2, max: 14, step: 0.5, def: 6 },
    { key: 'xLabels', label: 'Max x labels', type: 'number', min: 2, max: 30, def: 8 },
    { key: 'build', label: 'Draw-on time (s)', type: 'range', min: 0.3, max: 20, step: 0.1, def: 4 },
    { key: 'ease', label: 'Easing', type: 'select', options: ['inOut', 'out', 'linear', 'expo', 'quint'], def: 'inOut' },
  ];
  R.register({ id: 'line', name: 'Line that draws on', family: 'Lines', shape: 'series', dur: 7, params: lineParams, draw: lineLike(false) });
  R.register({ id: 'area', name: 'Area chart', family: 'Lines', shape: 'series', dur: 7,
    params: lineParams.concat([{ key: 'stacked', label: 'Stack the series', type: 'check', def: false }]), draw: lineLike(true) });

  // ---------- scatter / bubble ----------
  R.register({
    id: 'scatter', name: 'Scatter / bubble', family: 'Scatter', shape: 'points', dur: 7,
    params: [
      { key: 'bubbles', label: 'Bubble size from 3rd column', type: 'check', def: true },
      { key: 'maxR', label: 'Biggest bubble (px)', type: 'range', min: 10, max: 160, step: 1, def: 80 },
      { key: 'labels', label: 'Labels', type: 'select', options: ['biggest 8', 'all', 'none'], def: 'biggest 8' },
      { key: 'xTitle', label: 'X axis title', type: 'text', def: '' },
      { key: 'yTitle', label: 'Y axis title', type: 'text', def: '' },
      { key: 'zero', label: 'Axes start at zero', type: 'check', def: true },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const PT = DC.data.points(env.data), pts = PT.pts, n = pts.length; if (!n) return;
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const xMax = U.niceMax(Math.max(...xs), 5), yMax = U.niceMax(Math.max(...ys), 5);
      const xMin = P.zero ? Math.min(0, ...xs) : Math.floor(Math.min(...xs) / U.niceStep(xMax - Math.min(...xs), 5)) * U.niceStep(xMax - Math.min(...xs), 5);
      const yMin = P.zero ? Math.min(0, ...ys) : Math.floor(Math.min(...ys) / U.niceStep(yMax - Math.min(...ys), 5)) * U.niceStep(yMax - Math.min(...ys), 5);
      const groups = [...new Set(pts.map(p => p.group).filter(Boolean))];
      const plot = { x: box.x + 110 * k, y: box.y + (groups.length ? 56 : 20) * k, w: box.w - 140 * k, h: box.h - (groups.length ? 56 : 20) * k - 90 * k };
      const xOf = v => plot.x + ((v - xMin) / (xMax - xMin || 1)) * plot.w, yOf = v => plot.y + plot.h * (1 - (v - yMin) / (yMax - yMin || 1));
      const a = env.introP;
      D.yGrid(ctx, env, plot, U.ticks(yMin, yMax, 5), yOf, v => env.axis(v, yMax), a);
      D.xGrid(ctx, env, plot, U.ticks(xMin, xMax, 5), xOf, v => DC.format.axis(v, {}, env.lang, xMax), a);
      D.axisLine(ctx, env, plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h, a);
      D.axisLine(ctx, env, plot.x, plot.y + plot.h, plot.x, plot.y, a);
      D.text(ctx, env, P.xTitle || PT.xName, plot.x + plot.w, plot.y + plot.h + 76 * k, { size: 24 * k, weight: 700, align: 'right', color: env.theme.sub, alpha: a });
      ctx.save(); ctx.translate(box.x + 18 * k, plot.y); ctx.rotate(-Math.PI / 2);
      D.text(ctx, env, P.yTitle || PT.yName, 0, 0, { size: 24 * k, weight: 700, align: 'right', base: 'top', color: env.theme.sub, alpha: a }); ctx.restore();
      if (groups.length) D.legend(ctx, env, groups.map((g, i) => ({ name: g, color: D.color(env, i) })), plot.x, box.y + 24 * k, a);
      const sMax = Math.max(...pts.map(p => p.size || 0)) || 1;
      const rOf = p => (P.bubbles && PT.sizeName ? Math.max(6 * k, Math.sqrt(Math.max(0, p.size) / sMax) * P.maxR * k) : 13 * k);
      const big = pts.slice().sort((p, q) => rOf(q) - rOf(p));
      const labelSet = new Set(P.labels === 'all' ? pts.map(p => p.i) : P.labels === 'none' ? [] : big.slice(0, 8).map(p => p.i));
      // draw big bubbles first so small ones stay visible
      const order = pts.slice().sort((p, q) => p.x - q.x), rank = new Map(order.map((p, i) => [p.i, i]));
      const lab = [];
      big.forEach(p => {
        const pr = env.item(rank.get(p.i), n), r = rOf(p) * pr, x = xOf(p.x), y = yOf(p.y);
        const gi = groups.indexOf(p.group), c = D.color(env, gi >= 0 ? gi : p.i, p.color);
        const isHl = env.hl && key(p.label) === env.hl;
        ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, p.label) * U.clamp(env.itemRaw(rank.get(p.i), n) * 4);
        ctx.fillStyle = U.rgba(c, P.bubbles && PT.sizeName ? 0.72 : 0.95); D.glow(ctx, env, c);
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); D.noGlow(ctx);
        ctx.strokeStyle = env.theme.paper ? 'rgba(30,20,10,0.6)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * k; ctx.stroke();
        if (isHl) D.ring(ctx, env, x, y, Math.max(0, r) + 10 * k, U.clamp(env.hlOn * pr), c);
        if (labelSet.has(p.i) || isHl) lab.push({ x, y: y - r - 10 * k, label: p.label, alpha: U.clamp(pr * 2 - 0.8) });
        ctx.restore();
        env.anchors[key(p.label)] = { x, y };
      });
      // point labels sit above their bubble; when bubbles bunch up (left edge) push them apart
      lab.sort((a, b) => a.y - b.y);
      lab.forEach((l, i) => { l.ly = i ? Math.max(l.y, lab[i - 1].ly + 46 * k) : l.y; });
      lab.forEach(l => D.text(ctx, env, l.label, l.x, l.ly, { size: 22 * k, weight: 700, align: 'center', alpha: l.alpha, stroke: env.theme.paper ? 'rgba(239,229,207,0.85)' : 'rgba(0,0,0,0.55)' }));
    },
  });
})();
