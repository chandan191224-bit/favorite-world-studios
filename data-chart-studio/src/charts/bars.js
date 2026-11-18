// Bar families: growing horizontal bars, columns (grouped, negatives), stacked / 100% bars, butterfly comparison,
// versus columns (India vs China), ranking leaderboard, flag + value rows.
(() => {
  const U = DC.util, D = DC.draw, R = DC.charts;
  const key = s => String(s).trim().toLowerCase();
  const sortCats = (cats, how) => how === 'desc' ? cats.slice().sort((a, b) => b.value - a.value) : how === 'asc' ? cats.slice().sort((a, b) => a.value - b.value) : cats;

  // ---------- horizontal bars ----------
  R.register({
    id: 'bars', name: 'Growing bars', family: 'Bars', shape: 'table', dur: 6,
    params: [
      { key: 'sort', label: 'Sort', type: 'select', options: ['none', 'desc', 'asc'], def: 'desc' },
      { key: 'col', label: 'Value column (0 = first)', type: 'number', min: 0, max: 20, def: 0 },
      { key: 'labels', label: 'Labels', type: 'select', options: ['left', 'above'], def: 'left' },
      { key: 'gap', label: 'Gap between bars', type: 'range', min: 0.1, max: 0.7, step: 0.02, def: 0.34 },
      { key: 'showGrid', label: 'Grid lines', type: 'check', def: true },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const cats = sortCats(DC.data.categories(env.data, P.col), P.sort).filter(c => !isNaN(c.value));
      const n = cats.length; if (!n) return;
      const max = U.niceMax(Math.max(...cats.map(c => c.value), 0) * 1.0, 4);
      const hasFlag = cats.some(c => c.flag), rowH = box.h / n, barH = Math.min(rowH * (1 - P.gap), 90 * k);
      const above = P.labels === 'above';
      const lsize = Math.min(30 * k, rowH * 0.42);
      const labW = above ? 0 : Math.min(box.w * 0.3, Math.max(...cats.map(c => D.measure(ctx, env, c.label, lsize, 'body', 700))) + 20 * k);
      const flagW = hasFlag ? Math.min(barH, 56 * k) + 14 * k : 0;
      const x0 = box.x + labW + flagW, valW = 200 * k, bw = box.w - labW - flagW - valW;
      const gA = env.introP;
      if (P.showGrid) D.xGrid(ctx, env, { x: x0, y: box.y, w: bw, h: box.h }, U.ticks(0, max, 4), v => x0 + (v / max) * bw, v => env.axis(v, max), gA);
      D.axisLine(ctx, env, x0, box.y, x0, box.y + box.h, gA);
      cats.forEach((c, i) => {
        const p = env.item(i, n), cy = box.y + rowH * (i + 0.5) + (above ? lsize * 0.5 : 0), al = D.dimAlpha(env, c.label);
        const col = D.color(env, c.i, c.color), w = (Math.max(0, c.value) / max) * bw * p;
        const appear = U.clamp(env.itemRaw(i, n) * 4);
        ctx.save(); ctx.globalAlpha *= al;
        if (above) D.text(ctx, env, c.label, x0, cy - barH / 2 - 10 * k, { size: lsize, weight: 700, alpha: appear });
        else D.text(ctx, env, c.label, x0 - flagW - 16 * k, cy, { size: lsize, weight: 700, align: 'right', base: 'middle', alpha: appear, maxW: labW - 20 * k });
        if (hasFlag && c.flag) { ctx.save(); ctx.globalAlpha *= appear; const f = Math.min(barH, 56 * k); D.flag(ctx, env, c.flag, x0 - flagW + 2 * k, cy - f / 2, f, f, 'circle'); ctx.restore(); }
        D.bar(ctx, env, x0, cy - barH / 2, w, barH, col, { radius: Math.min(env.theme.radius, 0.3) });
        D.num(ctx, env, env.fmt(c.value * p, c.value, c), x0 + w + 14 * k, cy, { size: Math.min(34 * k, barH * 0.75), base: 'middle', alpha: appear, color: env.theme.ink, maxW: valW - 16 * k });
        ctx.restore();
        env.anchors[key(c.label)] = { x: x0 + (c.value / max) * bw, y: cy };
      });
    },
  });

  // ---------- vertical columns (grouped if several value columns) ----------
  R.register({
    id: 'columns', name: 'Growing columns', family: 'Bars', shape: 'table', dur: 6,
    params: [
      { key: 'gap', label: 'Gap between groups', type: 'range', min: 0.1, max: 0.7, step: 0.02, def: 0.32 },
      { key: 'values', label: 'Value labels', type: 'check', def: true },
      { key: 'legend', label: 'Legend (several series)', type: 'check', def: true },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const S = DC.data.series(env.data), cats = S.x, ser = S.series; if (!cats.length || !ser.length) return;
      const all = ser.flatMap(s => s.values).filter(v => !isNaN(v));
      const max = U.niceMax(Math.max(0, ...all), 5), min = Math.min(0, ...all) < 0 ? -U.niceMax(-Math.min(...all), 3) : 0;
      const multi = ser.length > 1, top = box.y + (multi && P.legend ? 50 * k : 0);
      const plot = { x: box.x + 90 * k, y: top + 50 * k, w: box.w - 90 * k, h: box.y + box.h - top - 50 * k - 50 * k };
      const yOf = v => plot.y + plot.h * (1 - (v - min) / (max - min));
      D.yGrid(ctx, env, plot, U.ticks(min, max, 5), yOf, v => env.axis(v, max), env.introP);
      if (multi && P.legend) D.legend(ctx, env, ser.map(s => ({ name: s.name, color: D.color(env, s.i, s.color) })), plot.x, box.y + 24 * k, env.introP);
      const n = cats.length, gw = plot.w / n, cw = (gw * (1 - P.gap)) / ser.length, base = yOf(0);
      const items = n * ser.length;
      cats.forEach((cat, ci) => {
        const gx = plot.x + gw * ci + gw * P.gap / 2;
        const lab = U.clamp(env.itemRaw(ci * ser.length, items) * 3);
        D.text(ctx, env, cat, gx + (gw * (1 - P.gap)) / 2, plot.y + plot.h + 38 * k, { size: Math.min(24 * k, gw * 0.28), weight: 700, align: 'center', color: env.theme.sub, alpha: lab, maxW: gw * 0.98 });
        ser.forEach((s, si) => {
          const v = s.values[ci]; if (isNaN(v)) return;
          const idx = ci * ser.length + si, p = env.item(idx, items), name = multi ? s.name : cat;
          const c = D.color(env, multi ? s.i : ci, multi ? s.color : (env.data.rows[ci] && env.data.metaCol.color != null ? env.data.rows[ci][env.data.metaCol.color] : '')), x = gx + cw * si;
          const h = (yOf(v) - base) * p, al = D.dimAlpha(env, multi ? s.name : cat);
          ctx.save(); ctx.globalAlpha *= al;
          D.bar(ctx, env, x + cw * 0.06, base, cw * 0.88, h, c, { radius: Math.min(env.theme.radius, 0.25) });
          if (P.values) {
            // negative labels track the bar tip but never sink into the x-label row (or off the frame)
            const yLab = v >= 0 ? base + h - 12 * k : Math.min(Math.max(base + h + 34 * k, plot.y + plot.h + 82 * k), env.H - 64 * k);
            D.num(ctx, env, env.fmt(v * p, v), x + cw / 2, yLab, { size: Math.min(28 * k, cw * 0.42), align: 'center', alpha: U.clamp(p * 3), maxW: Math.max(cw, gw * 0.5) * 1.05 });
          }
          ctx.restore();
          env.anchors[key(multi ? s.name + '@' + cat : cat)] = { x: x + cw / 2, y: yOf(v) };
          if (!multi) env.anchors[key(cat)] = { x: x + cw / 2, y: yOf(v) };
        });
      });
      D.axisLine(ctx, env, plot.x, base, plot.x + plot.w, base, env.introP);
    },
  });

  // ---------- stacked / 100 % bars ----------
  R.register({
    id: 'stacked', name: 'Stacked / 100% bars', family: 'Bars', shape: 'table', dur: 7,
    params: [
      { key: 'percent', label: '100% (share) mode', type: 'check', def: false },
      { key: 'orient', label: 'Direction', type: 'select', options: ['horizontal', 'vertical'], def: 'horizontal' },
      { key: 'segLabels', label: 'Labels inside segments', type: 'check', def: true },
      { key: 'gap', label: 'Gap', type: 'range', min: 0.1, max: 0.7, step: 0.02, def: 0.36 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const S = DC.data.series(env.data), cats = S.x, ser = S.series; if (!cats.length || !ser.length) return;
      const totals = cats.map((_, ci) => ser.reduce((a, s) => a + Math.max(0, s.values[ci] || 0), 0));
      const max = P.percent ? 100 : U.niceMax(Math.max(...totals), 4);
      D.legend(ctx, env, ser.map(s => ({ name: s.name, color: D.color(env, s.i, s.color) })), box.x, box.y + 24 * k, env.introP);
      const horiz = P.orient !== 'vertical', n = cats.length, items = n * ser.length;
      const area = { x: box.x, y: box.y + 60 * k, w: box.w, h: box.h - 60 * k };
      const lsize = 26 * k;
      const labW = horiz ? Math.min(area.w * 0.25, Math.max(...cats.map(c => D.measure(ctx, env, c, lsize, 'body', 700))) + 24 * k) : 0;
      const plot = horiz ? { x: area.x + labW, y: area.y, w: area.w - labW - 30 * k, h: area.h } : { x: area.x + 80 * k, y: area.y + 20 * k, w: area.w - 80 * k, h: area.h - 70 * k };
      const band = (horiz ? plot.h : plot.w) / n, th = Math.min(band * (1 - P.gap), 110 * k);
      if (horiz) D.xGrid(ctx, env, plot, U.ticks(0, max, 4), v => plot.x + (v / max) * plot.w, v => P.percent ? v + '%' : env.axis(v, max), env.introP);
      else D.yGrid(ctx, env, plot, U.ticks(0, max, 4), v => plot.y + plot.h * (1 - v / max), v => P.percent ? v + '%' : env.axis(v, max), env.introP);
      cats.forEach((cat, ci) => {
        const mid = (horiz ? plot.y : plot.x) + band * (ci + 0.5);
        if (horiz) D.text(ctx, env, cat, plot.x - 16 * k, mid, { size: lsize, weight: 700, align: 'right', base: 'middle', maxW: labW - 24 * k, alpha: env.introP });
        else D.text(ctx, env, cat, mid, plot.y + plot.h + 36 * k, { size: Math.min(lsize, band * 0.3), weight: 700, align: 'center', alpha: env.introP, maxW: band });
        let acc = 0;
        ser.forEach((s, si) => {
          const raw = Math.max(0, s.values[ci] || 0), v = P.percent ? (raw / (totals[ci] || 1)) * 100 : raw;
          const p = env.item(ci * ser.length + si, items), len = (v / max) * (horiz ? plot.w : plot.h);
          const c = D.color(env, s.i, s.color), al = D.dimAlpha(env, s.name);
          ctx.save(); ctx.globalAlpha *= al;
          let cx, cy;
          if (horiz) { const x = plot.x + (acc / max) * plot.w; D.bar(ctx, env, x, mid - th / 2, len * p, th, c, { radius: 0.06 }); cx = x + (len * p) / 2; cy = mid; }
          else { const y = plot.y + plot.h - (acc / max) * plot.h; D.bar(ctx, env, mid - th / 2, y, th, -len * p, c, { radius: 0.06 }); cx = mid; cy = y - (len * p) / 2; }
          const lab = P.percent ? Math.round(v) + '%' : env.fmt(raw, raw);
          if (P.segLabels && len * p > D.measure(ctx, env, lab, 24 * k, 'num', 800) + 14 * k && (horiz || th > 60 * k))
            D.num(ctx, env, lab, cx, cy, { size: Math.min(24 * k, th * 0.4), align: 'center', base: 'middle', color: U.lum(c) > 0.6 ? '#111' : '#fff', alpha: U.clamp(p * 2 - 0.6), glow: false });
          ctx.restore();
          env.anchors[key(s.name + '@' + cat)] = { x: cx, y: cy };
          acc += v;
        });
        env.anchors[key(cat)] = horiz ? { x: plot.x + (acc / max) * plot.w, y: mid } : { x: mid, y: plot.y + plot.h - (acc / max) * plot.h };
      });
    },
  });

  // ---------- butterfly comparison: metric rows, two entities left / right ----------
  R.register({
    id: 'compare', name: 'Comparison (A vs B bars)', family: 'Compare', shape: 'table', dur: 7,
    params: [
      { key: 'scale', label: 'Scale', type: 'select', options: ['per row', 'shared'], def: 'per row' },
      { key: 'winner', label: 'Highlight the bigger value', type: 'check', def: true },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const S = DC.data.series(env.data), ser = S.series.slice(0, 2), rows = DC.data.categories(env.data, 0);
      if (ser.length < 2 || !rows.length) return;
      const headH = 120 * k, n = rows.length, rowH = (box.h - headH) / n, bh = Math.min(rowH * 0.5, 64 * k);
      const cx = box.x + box.w / 2, midW = Math.min(box.w * 0.26, 330 * k), half = box.w / 2 - midW / 2 - 150 * k;
      const shared = P.scale === 'shared' ? Math.max(...ser.flatMap(s => s.values.filter(v => !isNaN(v)))) : 0;
      // headers with flags
      ser.forEach((s, si) => {
        const dir = si ? 1 : -1, hx = cx + dir * (midW / 2 + half * 0.5), a = env.introP, c = D.color(env, s.i, s.color);
        const f = 74 * k;
        ctx.save(); ctx.globalAlpha *= a;
        const hasF = s.flag && D.flag(ctx, env, s.flag, hx - f / 2, box.y + 4 * k, f, f, 'circle');
        D.text(ctx, env, s.name, hx, box.y + (hasF ? f + 40 * k : 50 * k), { size: 40 * k, weight: 800, role: 'head', align: 'center', color: c, glow: true });
        ctx.restore();
      });
      rows.forEach((r, ri) => {
        const cy = box.y + headH + rowH * (ri + 0.5), raw = rows[ri];
        const vals = ser.map(s => s.values[ri]), m = shared || Math.max(...vals.map(v => Math.abs(v || 0)), 1e-9);
        const app = U.clamp(env.itemRaw(ri * 2, n * 2) * 4);
        D.text(ctx, env, r.label, cx, cy, { size: Math.min(28 * k, rowH * 0.4), weight: 700, align: 'center', base: 'middle', alpha: app, maxW: midW - 20 * k });
        ser.forEach((s, si) => {
          const v = vals[si]; if (isNaN(v)) return;
          const p = env.item(ri * 2 + si, n * 2), dir = si ? 1 : -1, len = (Math.abs(v) / m) * half * p;
          const x = cx + dir * midW / 2, c = D.color(env, s.i, s.color);
          const win = P.winner && Math.abs(v) >= Math.abs(vals[1 - si] || 0);
          ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, s.name) * (P.winner && !win ? 0.55 : 1);
          D.bar(ctx, env, x, cy - bh / 2, dir * len, bh, c, { radius: 0.2 });
          D.num(ctx, env, env.fmt(v * p, v, r), x + dir * (len + 14 * k), cy, { size: Math.min(32 * k, bh * 0.8), base: 'middle', align: si ? 'left' : 'right', alpha: U.clamp(p * 3), weight: win ? 800 : 600 });
          ctx.restore();
          env.anchors[key(s.name + '@' + r.label)] = { x: x + dir * (Math.abs(v) / m) * half, y: cy };
        });
        env.anchors[key(r.label)] = { x: cx, y: cy };
      });
    },
  });

  // ---------- versus: 2-4 big columns with flags and counters ----------
  R.register({
    id: 'versus', name: 'Versus columns', family: 'Compare', shape: 'table', dur: 6,
    params: [
      { key: 'ratio', label: 'Show "× times" badge', type: 'check', def: true },
      { key: 'col', label: 'Value column (0 = first)', type: 'number', min: 0, max: 20, def: 0 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const cats = DC.data.categories(env.data, P.col).filter(c => !isNaN(c.value)).slice(0, 4), n = cats.length; if (!n) return;
      const max = Math.max(...cats.map(c => c.value));
      const footH = 150 * k, topH = 90 * k, colW = Math.min(box.w / n * 0.42, 260 * k), base = box.y + box.h - footH, hMax = box.h - footH - topH;
      D.axisLine(ctx, env, box.x + box.w * 0.08, base, box.x + box.w * 0.92, base, env.introP);
      cats.forEach((c, i) => {
        const cx = box.x + box.w * (i + 0.5) / n, p = env.item(i, n), h = (c.value / max) * hMax * p, col = D.color(env, c.i, c.color);
        const app = U.clamp(env.itemRaw(i, n) * 4);
        ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label);
        D.bar(ctx, env, cx - colW / 2, base, colW, -h, col, { radius: Math.min(env.theme.radius, 0.12) });
        D.num(ctx, env, env.fmt(c.value * p, c.value, c), cx, base - h - 20 * k, { size: 56 * k, align: 'center', alpha: app, maxW: box.w / n * 0.95 });
        const f = 64 * k;
        ctx.save(); ctx.globalAlpha *= app;
        const hasF = !!c.flag && D.flag(ctx, env, c.flag, cx - f * 0.75, base + 22 * k, f * 1.5, f, 'round');
        ctx.restore();
        D.text(ctx, env, c.label, cx, base + (hasF ? f + 66 * k : 60 * k), { size: 36 * k, weight: 800, role: 'head', align: 'center', alpha: app, maxW: box.w / n * 0.92 });
        ctx.restore();
        env.anchors[key(c.label)] = { x: cx, y: base - h };
      });
      if (P.ratio && n === 2) {
        const [a, b] = cats, big = Math.max(a.value, b.value), small = Math.min(a.value, b.value);
        const pr = U.ease.back(U.prog(env.t, env.intro + env.P.build, 0.6));
        if (small > 0 && pr > 0) {
          const r = big / small, txt = (r >= 10 ? Math.round(r) : r.toFixed(1)) + '×';
          const cx = box.x + box.w / 2, cy = box.y + topH + hMax * 0.35, R0 = 74 * k * pr;
          ctx.save(); ctx.fillStyle = env.theme.accent; D.glow(ctx, env, env.theme.accent);
          ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          D.num(ctx, env, txt, cx, cy + 2 * k, { size: 54 * k * pr, align: 'center', base: 'middle', color: env.theme.hiInk, glow: false });
        }
      }
    },
  });

  // ---------- ranking leaderboard ----------
  R.register({
    id: 'ranking', name: 'Ranking leaderboard', family: 'Rankings', shape: 'table', dur: 7,
    params: [
      { key: 'order', label: 'Reveal order', type: 'select', options: ['top first', 'countdown (last first)'], def: 'countdown (last first)' },
      { key: 'max', label: 'Rows shown', type: 'number', min: 3, max: 15, def: 10 },
      { key: 'bars', label: 'Value bars', type: 'check', def: true },
      { key: 'col', label: 'Value column (0 = first)', type: 'number', min: 0, max: 20, def: 0 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const cats = sortCats(DC.data.categories(env.data, P.col).filter(c => !isNaN(c.value)), 'desc').slice(0, P.max), n = cats.length; if (!n) return;
      const rowH = box.h / n, h = Math.min(rowH * 0.82, 96 * k), max = cats[0].value || 1, th = env.theme;
      cats.forEach((c, i) => {
        const order = P.order.startsWith('count') ? n - 1 - i : i;
        const p = env.item(order, n), raw = env.itemRaw(order, n);
        const y = box.y + rowH * i + (rowH - h) / 2, slide = (1 - U.ease.out(U.clamp(raw * 1.6))) * box.w * 0.25;
        const isHl = env.hl && key(c.label) === env.hl && env.hlOn > 0;
        ctx.save(); ctx.globalAlpha *= U.clamp(raw * 2.5) * D.dimAlpha(env, c.label); ctx.translate(slide, 0);
        ctx.fillStyle = isHl ? U.rgba(th.accent, th.paper ? 0.18 : 0.22) : th.card; U.rr(ctx, box.x, y, box.w, h, Math.min(h * 0.22, 16 * k)); ctx.fill();
        ctx.strokeStyle = isHl ? th.accent : th.cardLine; ctx.lineWidth = (isHl ? 3 : 1.5) * k; ctx.stroke();
        // rank badge
        const bx = box.x + h * 0.62, col = i < 3 ? ['#f5c542', '#c9d1db', '#d39158'][i] : th.faint;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, y + h / 2, h * 0.34, 0, Math.PI * 2); ctx.fill();
        D.num(ctx, env, String(i + 1), bx, y + h / 2 + h * 0.02, { size: h * 0.4, align: 'center', base: 'middle', color: '#14110b', glow: false });
        let x = bx + h * 0.6;
        if (c.flag) { D.flag(ctx, env, c.flag, x, y + h * 0.18, h * 0.96, h * 0.64, 'round'); x += h * 1.14; }
        const nameW = box.w * 0.34;
        D.text(ctx, env, c.label, x, y + h / 2, { size: h * 0.36, weight: 700, base: 'middle', maxW: nameW });
        const vx = box.x + box.w - 24 * k;
        if (P.bars) {
          const bx0 = x + nameW + 20 * k, bw = vx - 230 * k - bx0;
          if (bw > 40 * k) D.bar(ctx, env, bx0, y + h * 0.36, (c.value / max) * bw * p, h * 0.28, D.color(env, c.i, c.color || (isHl ? th.accent : '')), { radius: 0.5 });
        }
        D.num(ctx, env, env.fmt(c.value * p, c.value, c), vx, y + h / 2, { size: h * 0.38, align: 'right', base: 'middle', maxW: 210 * k });
        ctx.restore();
        env.anchors[key(c.label)] = { x: box.x + box.w * 0.5, y: y + h / 2 };
      });
    },
  });

  // ---------- flag + value rows ----------
  R.register({
    id: 'flagrows', name: 'Flag + value rows', family: 'Rankings', shape: 'table', dur: 6,
    params: [
      { key: 'col', label: 'Value column (0 = first)', type: 'number', min: 0, max: 20, def: 0 },
      { key: 'sort', label: 'Sort', type: 'select', options: ['none', 'desc', 'asc'], def: 'none' },
      { key: 'bars', label: 'Thin value bar', type: 'check', def: true },
    ],
    draw(ctx, env) {
      const { box, k, P } = env;
      const cats = sortCats(DC.data.categories(env.data, P.col).filter(c => !isNaN(c.value)), P.sort).slice(0, 8), n = cats.length; if (!n) return;
      const rowH = box.h / n, fh = Math.min(rowH * 0.66, 110 * k), fw = fh * 1.5, max = Math.max(...cats.map(c => Math.abs(c.value))) || 1;
      cats.forEach((c, i) => {
        const p = env.item(i, n), raw = env.itemRaw(i, n), cy = box.y + rowH * (i + 0.5);
        const a = U.clamp(raw * 3), col = D.color(env, c.i, c.color);
        ctx.save(); ctx.globalAlpha *= a * D.dimAlpha(env, c.label);
        const fx = box.x + (1 - U.ease.back(U.clamp(raw * 2))) * -60 * k;
        if (!D.flag(ctx, env, c.flag || c.label, fx, cy - fh / 2, fw, fh, 'round')) { ctx.fillStyle = col; U.rr(ctx, fx, cy - fh / 2, fw, fh, 10 * k); ctx.fill(); }
        const tx = box.x + fw + 34 * k;
        D.text(ctx, env, c.label, tx, cy - fh * 0.08, { size: fh * 0.4, weight: 800, role: 'head', maxW: box.w * 0.4 });
        if (c.note) D.text(ctx, env, c.note, tx, cy + fh * 0.32, { size: fh * 0.24, weight: 500, color: env.theme.sub, maxW: box.w * 0.4 });
        D.num(ctx, env, env.fmt(c.value * p, c.value, c), box.x + box.w, cy + fh * 0.16, { size: fh * 0.5, align: 'right', color: col, maxW: box.w * 0.3 });
        if (P.bars) { const bx = box.x + box.w * 0.52, bw = box.w * 0.48 * (Math.abs(c.value) / max) * p; ctx.globalAlpha *= 0.5; D.bar(ctx, env, bx, cy + fh * 0.36, bw, 6 * k, col, { radius: 0.5, flat: true }); }
        ctx.restore();
        env.anchors[key(c.label)] = { x: box.x + fw / 2, y: cy };
      });
    },
  });
})();
