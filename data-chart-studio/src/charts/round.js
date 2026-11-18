// Round charts: pie / donut that fill segment by segment, progress gauges (semicircle needle, ring, bar).
(() => {
  const U = DC.util, D = DC.draw, R = DC.charts;
  const key = s => String(s).trim().toLowerCase();
  const TAU = Math.PI * 2;

  function pie(donut) {
    return function draw(ctx, env) {
      const { box, k, P } = env;
      const cats = DC.data.categories(env.data, P.col).filter(c => c.value > 0), n = cats.length; if (!n) return;
      const total = cats.reduce((a, c) => a + c.value, 0);
      const legend = P.labels === 'legend';
      const Rr = Math.min(legend ? box.w * 0.27 : box.w * 0.26, box.h * (legend ? 0.46 : 0.38));
      const cx = legend ? box.x + box.w * 0.3 : box.x + box.w / 2, cy = box.y + box.h / 2, ri = donut ? Rr * P.hole : 0;
      let ang = -Math.PI / 2;
      const show = c => {
        const pc = (c.value / total) * 100;
        // keep one decimal when the number has one (95.2 stays 95.2, not 95); whole percents stay whole
        const dec = P.decimals === 0 ? Math.round(pc) : Math.abs(Math.round(pc) - pc) < 1e-9 ? Math.round(pc) : pc.toFixed(1);
        const pt = dec + '%';
        return P.show === 'value' ? env.fmt(c.value, c.value, c) : P.show === 'both' ? pt + '  ·  ' + env.fmt(c.value, c.value, c) : pt;
      };
      const outside = [];
      // track ring
      ctx.save(); ctx.strokeStyle = env.theme.card; ctx.lineWidth = Rr - ri; ctx.globalAlpha *= env.introP;
      ctx.beginPath(); ctx.arc(cx, cy, (Rr + ri) / 2, 0, TAU); ctx.stroke(); ctx.restore();
      cats.forEach((c, i) => {
        const p = env.item(i, n), sweep = (c.value / total) * TAU, a0 = ang, a1 = ang + sweep * p, mid = ang + sweep / 2;
        const col = D.color(env, c.i, c.color), isHl = env.hl && key(c.label) === env.hl, pop = isHl ? 0.07 * Rr * env.hlOn : 0;
        const ox = Math.cos(mid) * pop, oy = Math.sin(mid) * pop;
        ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label);
        if (p > 0) {
          ctx.beginPath(); ctx.arc(cx + ox, cy + oy, Rr, a0, a1); if (ri) ctx.arc(cx + ox, cy + oy, ri, a1, a0, true); else ctx.lineTo(cx + ox, cy + oy); ctx.closePath();
          ctx.fillStyle = col; D.glow(ctx, env, col, 0.7); ctx.fill(); D.noGlow(ctx);
          ctx.strokeStyle = env.theme.paper ? env.theme.bg0 : env.theme.bg1; ctx.lineWidth = 3 * k; ctx.stroke();
        }
        const la = U.clamp(env.itemRaw(i, n) * 2 - 0.6);
        if (!legend && la > 0) {
          // collected now, spread + drawn after the loop so neighbouring slices never collide
          const side = Math.cos(mid) >= 0 ? 1 : -1, x2 = cx + Math.cos(mid) * (Rr + 52 * k), y2 = cy + Math.sin(mid) * (Rr + 52 * k);
          outside.push({ mid, side, x2, y2, x3: x2 + side * 30 * k, col, c, la });
        } else if (la > 0 && sweep > 0.32 && !donut && P.inside) {
          D.text(ctx, env, show(c), cx + ox + Math.cos(mid) * Rr * 0.62, cy + oy + Math.sin(mid) * Rr * 0.62, { size: 30 * k, weight: 800, align: 'center', base: 'middle', color: U.lum(col) > 0.6 ? '#111' : '#fff', alpha: la, role: 'num' });
        }
        ctx.restore();
        if (legend) {
          const rowH = Math.min(box.h / n, 84 * k), ly = box.y + box.h / 2 - (rowH * n) / 2 + rowH * (i + 0.5), lx = box.x + box.w * 0.62;
          ctx.save(); ctx.globalAlpha *= U.clamp(env.itemRaw(i, n) * 3) * D.dimAlpha(env, c.label);
          ctx.fillStyle = col; U.rr(ctx, lx, ly - 16 * k, 32 * k, 32 * k, 8 * k); ctx.fill();
          D.text(ctx, env, c.label, lx + 50 * k, ly, { size: 28 * k, weight: 700, base: 'middle', maxW: box.w * 0.22 });
          D.num(ctx, env, show(c), box.x + box.w, ly, { size: 32 * k, align: 'right', base: 'middle', color: col, maxW: box.w * 0.14 });
          ctx.restore();
          env.anchors[key(c.label)] = { x: cx + Math.cos(mid) * (Rr + ri) / 2, y: cy + Math.sin(mid) * (Rr + ri) / 2 };
        } else env.anchors[key(c.label)] = { x: cx + Math.cos(mid) * Rr * 0.8, y: cy + Math.sin(mid) * Rr * 0.8 };
        ang += sweep;
      });
      // outside leader labels: spread each side separately by height, then draw leader + value + name
      if (outside.length) {
        for (const sideSign of [-1, 1]) {
          const list = outside.filter(l => l.side === sideSign).sort((a, b) => a.y2 - b.y2);
          list.forEach((l, i) => { l.ly = i ? Math.max(l.y2, list[i - 1].ly + 84 * k) : l.y2; });
          list.forEach(l => { l.ly = U.clamp(l.ly, box.y + 46 * k, box.y + box.h - 56 * k); });
        }
        outside.forEach(l => {
          ctx.save(); ctx.globalAlpha *= l.la; ctx.strokeStyle = l.col; ctx.lineWidth = 2.5 * k;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(l.mid) * (Rr + 12 * k), cy + Math.sin(l.mid) * (Rr + 12 * k)); ctx.lineTo(l.x2, l.ly); ctx.lineTo(l.x3, l.ly); ctx.stroke();
          D.num(ctx, env, show(l.c), l.x3 + l.side * 10 * k, l.ly - 4 * k, { size: 34 * k, align: l.side > 0 ? 'left' : 'right', color: l.col, weight: 800, maxW: box.w * 0.3 });
          D.text(ctx, env, l.c.label, l.x3 + l.side * 10 * k, l.ly + 36 * k, { size: 24 * k, weight: 600, align: l.side > 0 ? 'left' : 'right', color: env.theme.sub, maxW: box.w * 0.28 });
          ctx.restore();
        });
      }
      if (donut && P.center) {
        const hc = env.hl && env.hlOn > 0 ? cats.find(c => key(c.label) === env.hl) : null;
        const a = U.clamp(env.introP * 1.5);
        if (hc) {
          D.num(ctx, env, show(hc), cx, cy + 10 * k, { size: ri * 0.46, align: 'center', color: D.color(env, hc.i, hc.color), alpha: env.hlOn, maxW: ri * 1.6 });
          D.text(ctx, env, hc.label, cx, cy + ri * 0.42, { size: ri * 0.17, weight: 700, align: 'center', color: env.theme.sub, alpha: env.hlOn, maxW: ri * 1.6 });
        } else {
          const pr = env.ease(U.prog(env.t, env.intro, P.build));
          D.num(ctx, env, env.fmt(total * pr, total), cx, cy + 12 * k, { size: ri * 0.36, align: 'center', alpha: a, maxW: ri * 1.6 });
          D.text(ctx, env, P.centerLabel || 'Total', cx, cy + ri * 0.4, { size: ri * 0.15, weight: 700, align: 'center', color: env.theme.sub, alpha: a, maxW: ri * 1.6 });
        }
      }
    };
  }
  const pieParams = [
    { key: 'labels', label: 'Labels', type: 'select', options: ['outside', 'legend'], def: 'outside' },
    { key: 'show', label: 'Show', type: 'select', options: ['percent', 'value', 'both'], def: 'percent' },
    { key: 'col', label: 'Value column (0 = first)', type: 'number', min: 0, max: 20, def: 0 },
    { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 1 },
    { key: 'ease', label: 'Easing', type: 'select', options: ['inOut', 'out', 'linear', 'expo'], def: 'inOut' },
  ];
  R.register({ id: 'pie', name: 'Pie that fills', family: 'Pie & donut', shape: 'table', dur: 6, params: pieParams.concat([{ key: 'inside', label: 'Percent inside (legend mode)', type: 'check', def: true }]), draw: pie(false) });
  R.register({ id: 'donut', name: 'Donut that fills', family: 'Pie & donut', shape: 'table', dur: 6,
    params: pieParams.concat([
      { key: 'hole', label: 'Hole size', type: 'range', min: 0.3, max: 0.85, step: 0.01, def: 0.6 },
      { key: 'center', label: 'Total in the centre', type: 'check', def: true },
      { key: 'centerLabel', label: 'Centre label', type: 'text', def: 'Total' },
    ]), draw: pie(true) });

  // ---------- progress gauges ----------
  R.register({
    id: 'gauge', name: 'Progress gauge', family: 'Gauges', shape: 'table', dur: 5,
    params: [
      { key: 'style', label: 'Style', type: 'select', options: ['semicircle', 'ring', 'bar'], def: 'semicircle' },
      { key: 'max', label: 'Maximum (if no 2nd column)', type: 'number', min: 0, max: 1e15, def: 100 },
      { key: 'ticks', label: 'Tick marks', type: 'check', def: true },
      { key: 'zones', label: 'Red–amber–green zones', type: 'check', def: false },
      { key: 'build', label: 'Build time (s)', type: 'range', min: 0.3, max: 20, step: 0.1, def: 2.2 },
      { key: 'ease', label: 'Easing', type: 'select', options: ['out', 'expo', 'back', 'elastic', 'inOut', 'linear'], def: 'out' },
    ],
    draw(ctx, env) {
      const { box, k, P } = env, th = env.theme;
      const cats = DC.data.categories(env.data, 0).filter(c => !isNaN(c.value)).slice(0, P.style === 'bar' ? 8 : 4), n = cats.length; if (!n) return;
      const maxOf = c => (!isNaN(c.values[1]) && c.values[1] > 0 ? c.values[1] : +P.max || 100);
      if (P.style === 'bar') {
        const rowH = Math.min(box.h / n, 150 * k), h = rowH * 0.3;
        cats.forEach((c, i) => {
          const p = env.item(i, n), y = box.y + box.h / 2 - (rowH * n) / 2 + rowH * i + rowH * 0.55, mx = maxOf(c), fr = U.clamp(c.value / mx), col = D.color(env, c.i, c.color);
          const app = U.clamp(env.itemRaw(i, n) * 4);
          ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label) * app;
          D.text(ctx, env, c.label, box.x, y - h * 0.9, { size: 30 * k, weight: 700, maxW: box.w * 0.7 });
          D.num(ctx, env, env.fmt(c.value * p, c.value, c), box.x + box.w, y - h * 0.9, { size: 36 * k, align: 'right', color: col });
          ctx.fillStyle = th.card; U.rr(ctx, box.x, y, box.w, h, h / 2); ctx.fill();
          D.bar(ctx, env, box.x, y, box.w * fr * p, h, col, { radius: 0.5, flat: true });
          ctx.restore();
          env.anchors[key(c.label)] = { x: box.x + box.w * fr, y: y + h / 2 };
        });
        return;
      }
      const cw = box.w / n;
      cats.forEach((c, i) => {
        const p = env.item(i, n), mx = maxOf(c), fr = U.clamp(c.value / mx), col = D.color(env, c.i, c.color);
        const semi = P.style === 'semicircle';
        const Rr = Math.min(cw * 0.4, semi ? box.h * 0.55 : box.h * 0.36), cx = box.x + cw * (i + 0.5), cy = semi ? box.y + box.h * 0.66 : box.y + box.h * 0.46, lw = Rr * (semi ? 0.2 : 0.16);
        const a0 = semi ? Math.PI : -Math.PI / 2, span = semi ? Math.PI : TAU, a1 = a0 + span * fr * p;
        ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label) * U.clamp(env.itemRaw(i, n) * 4 + env.introP);
        ctx.lineCap = semi ? 'butt' : 'round'; ctx.lineWidth = lw;
        if (P.zones && semi) [['#d64545', 0, 0.33], ['#e6a23c', 0.33, 0.66], ['#3fae6a', 0.66, 1]].forEach(([zc, z0, z1]) => { ctx.strokeStyle = U.rgba(zc, 0.35); ctx.beginPath(); ctx.arc(cx, cy, Rr, a0 + span * z0, a0 + span * z1); ctx.stroke(); });
        else { ctx.strokeStyle = th.card; ctx.beginPath(); ctx.arc(cx, cy, Rr, a0, a0 + span); ctx.stroke(); }
        if (p > 0) { ctx.strokeStyle = col; D.glow(ctx, env, col); ctx.beginPath(); ctx.arc(cx, cy, Rr, a0, Math.max(a0 + 0.001, a1)); ctx.stroke(); D.noGlow(ctx); }
        if (P.ticks && semi) {
          for (let j = 0; j <= 10; j++) {
            const aa = a0 + span * j / 10, r0 = Rr - lw * 0.5 - 8 * k, r1 = r0 - (j % 5 ? 12 : 22) * k;
            ctx.strokeStyle = th.sub; ctx.lineWidth = (j % 5 ? 2 : 3) * k; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * r0, cy + Math.sin(aa) * r0); ctx.lineTo(cx + Math.cos(aa) * r1, cy + Math.sin(aa) * r1); ctx.stroke();
          }
          // needle
          ctx.fillStyle = th.ink; ctx.strokeStyle = th.ink;
          const na = a1, nl = Rr - lw * 0.5 - 30 * k;
          ctx.lineWidth = 6 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * nl, cy + Math.sin(na) * nl); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 14 * k, 0, TAU); ctx.fill();
        }
        const valTxt = env.fmt(c.value * p, c.value, c);
        if (semi) {
          D.num(ctx, env, valTxt, cx, cy + Rr * 0.36, { size: Rr * 0.3, align: 'center', color: col, maxW: Rr * 1.8 });
          D.text(ctx, env, c.label, cx, cy + Rr * 0.36 + Rr * 0.26, { size: Math.min(30 * k, Rr * 0.16), weight: 700, align: 'center', color: th.sub, maxW: cw * 0.9 });
        } else {
          D.num(ctx, env, valTxt, cx, cy + Rr * 0.12, { size: Rr * 0.38, align: 'center', color: th.ink, maxW: Rr * 1.5 });
          D.text(ctx, env, c.label, cx, cy + Rr + lw + 50 * k, { size: Math.min(32 * k, Rr * 0.2), weight: 700, align: 'center', color: th.sub, maxW: cw * 0.92 });
        }
        ctx.restore();
        env.anchors[key(c.label)] = { x: cx + Math.cos(a0 + span * fr) * Rr, y: cy + Math.sin(a0 + span * fr) * Rr };
      });
    },
  });
})();
