// Number-led graphics: big counters (₹ / % / crore / lakh / billion), icon (unit) arrays, scale comparisons
// (circles / squares / nested), tables that build row by row.
(() => {
  const U = DC.util, D = DC.draw, R = DC.charts;
  const key = s => String(s).trim().toLowerCase();

  // ---------- big-number counter ----------
  R.register({
    id: 'counter', name: 'Big-number counter', family: 'Numbers', shape: 'table', dur: 5,
    params: [
      { key: 'fromCol', label: 'Count from 2nd column', type: 'check', def: false },
      { key: 'layout', label: 'Several counters', type: 'select', options: ['side by side', 'stacked'], def: 'side by side' },
      { key: 'labelPos', label: 'Label', type: 'select', options: ['below', 'above'], def: 'below' },
      { key: 'underline', label: 'Accent underline', type: 'check', def: true },
      { key: 'punch', label: 'Punch at the end', type: 'check', def: true },
      { key: 'size', label: 'Number size', type: 'range', min: 0.4, max: 1.6, step: 0.02, def: 1 },
      { key: 'build', label: 'Count time (s)', type: 'range', min: 0.3, max: 20, step: 0.1, def: 2.6 },
      { key: 'ease', label: 'Easing', type: 'select', options: ['expo', 'out', 'quint', 'inOut', 'linear'], def: 'expo' },
      { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 0.25 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env, th = env.theme;
      const cats = DC.data.categories(env.data, 0).filter(c => !isNaN(c.value)).slice(0, 4), n = cats.length; if (!n) return;
      const row = P.layout === 'side by side';
      cats.forEach((c, i) => {
        const p = env.item(i, n), raw = env.itemRaw(i, n), from = P.fromCol && !isNaN(c.values[1]) ? c.values[1] : 0;
        const v = U.lerp(from, c.value, p);
        const cw = row ? box.w / n : box.w, ch = row ? box.h : box.h / n;
        const cx = row ? box.x + cw * (i + 0.5) : box.x + box.w / 2, cy = row ? box.y + box.h / 2 : box.y + ch * (i + 0.5);
        const size = Math.min(ch * 0.42, (row ? 260 / Math.sqrt(n) : 200 / Math.sqrt(n)) * k) * P.size;
        const col = D.color(env, c.i, c.color || (n === 1 ? th.accent : ''));
        const done = U.prog(env.t, env.itemEnd(i, n), 0.35);
        const punch = P.punch ? 1 + 0.07 * Math.sin(Math.PI * done) : 1;
        const app = U.ease.out(U.clamp(raw * 5));
        ctx.save(); ctx.globalAlpha *= app * D.dimAlpha(env, c.label);
        ctx.translate(cx, cy + (1 - app) * 30 * k); ctx.scale(punch, punch);
        const labY = P.labelPos === 'above' ? -size * 0.95 : size * 0.62;
        D.num(ctx, env, env.fmt(v, c.value, c), 0, size * 0.3, { size, align: 'center', color: col, weight: 800, maxW: cw * 0.94 });
        D.text(ctx, env, c.label, 0, labY, { size: size * 0.24, weight: 700, align: 'center', color: th.ink, maxW: cw * 0.9, role: 'head' });
        if (c.note) D.text(ctx, env, c.note, 0, labY + size * 0.3, { size: size * 0.17, weight: 500, align: 'center', color: th.sub, maxW: cw * 0.9 });
        if (P.underline) { const uw = Math.min(cw * 0.5, size * 2.2) * U.ease.out(U.clamp(raw * 1.5)); ctx.fillStyle = col; D.glow(ctx, env, col); U.rr(ctx, -uw / 2, size * 0.42, uw, Math.max(4, size * 0.045), 4 * k); ctx.fill(); }
        ctx.restore();
        env.anchors[key(c.label)] = { x: cx, y: cy };
      });
    },
  });

  // ---------- icon / unit array ----------
  R.register({
    id: 'units', name: 'Icon array (1 icon = N)', family: 'Numbers', shape: 'table', dur: 6,
    params: [
      { key: 'per', label: 'One icon equals', type: 'number', min: 0, max: 1e15, def: 100000 },
      { key: 'icon', label: 'Icon (if no icon column)', type: 'text', def: 'person' },
      { key: 'layout', label: 'Layout', type: 'select', options: ['one grid', 'side by side'], def: 'one grid' },
      { key: 'cols', label: 'Icons per row (0 = auto)', type: 'number', min: 0, max: 60, def: 0 },
      { key: 'legendText', label: 'Key text (blank = auto)', type: 'text', def: '' },
      { key: 'emptyGrid', label: 'Show empty slots up to', type: 'number', min: 0, max: 500, def: 0 },
      { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 1 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env, th = env.theme;
      const cats = DC.data.categories(env.data, 0).filter(c => c.value > 0), per = +P.per || 1; if (!cats.length) return;
      const groups = cats.map(c => ({ c, n: Math.min(400, c.value / per) }));
      const total = groups.reduce((a, g) => a + Math.ceil(g.n - 1e-9), 0), slots = Math.max(total, +P.emptyGrid || 0);
      const keyH = 70 * k, legH = cats.length > 1 ? 60 * k : 0;
      const area = { x: box.x, y: box.y + legH, w: box.w, h: box.h - keyH - legH };
      const side = P.layout === 'side by side' && cats.length > 1;
      const build = (ox, oy, w, h, list, count) => {
        let cols = +P.cols || Math.ceil(Math.sqrt(count * (w / h)));
        cols = Math.max(1, Math.min(cols, count)); const rows = Math.ceil(count / cols);
        const cell = Math.min(w / cols, h / rows), gx = ox + (w - cell * cols) / 2, gy = oy + (h - cell * rows) / 2;
        let idx = 0;
        const full = Math.max(1, total);
        list.forEach(g => {
          const col = D.color(env, g.c.i, g.c.color), whole = Math.floor(g.n + 1e-9), frac = g.n - whole;
          for (let j = 0; j < Math.ceil(g.n - 1e-9); j++, idx++) {
            const r = Math.floor(idx / cols), cc = idx % cols, x = gx + cell * (cc + 0.5), y = gy + cell * (r + 0.5);
            const gi = side ? idx : groups.slice(0, groups.indexOf(g)).reduce((a, q) => a + Math.ceil(q.n - 1e-9), 0) + j;
            const p = U.prog(env.t, env.intro + (gi / full) * P.build * 0.85, P.build * 0.2);
            if (p <= 0) continue;
            const s = cell * 0.82 * U.ease.back(p);
            D.icon(ctx, env, g.c.icon || P.icon, x, y, s, col, { fill: j === whole && frac > 0 ? frac : 1, alpha: D.dimAlpha(env, g.c.label) });
          }
          env.anchors[key(g.c.label)] = { x: gx + cell * ((Math.max(0, idx - 1) % cols) + 0.5), y: gy + cell * (Math.floor(Math.max(0, idx - 1) / cols) + 0.5) };
        });
        for (; idx < count; idx++) { const r = Math.floor(idx / cols), cc = idx % cols; D.icon(ctx, env, P.icon, gx + cell * (cc + 0.5), gy + cell * (r + 0.5), cell * 0.82, th.faint, { alpha: 0.35 * env.introP }); }
        return { gx, gy, cell, cols, rows };
      };
      if (side) {
        const cw = area.w / cats.length;
        groups.forEach((g, i) => {
          const cnt = Math.ceil(g.n - 1e-9), col = D.color(env, g.c.i, g.c.color);
          build(area.x + cw * i + cw * 0.06, area.y, cw * 0.88, area.h - 80 * k, [g], cnt);
          const ap = U.clamp(env.introP);
          D.text(ctx, env, g.c.label, area.x + cw * (i + 0.5), area.y + area.h - 34 * k, { size: 30 * k, weight: 800, align: 'center', role: 'head', alpha: ap, maxW: cw * 0.9 });
          D.num(ctx, env, env.fmt(g.c.value, g.c.value, g.c), area.x + cw * (i + 0.5), area.y + area.h + 4 * k, { size: 30 * k, align: 'center', color: col, alpha: ap, maxW: cw * 0.9 });
        });
      } else {
        build(area.x, area.y, area.w, area.h, groups, slots);
        if (cats.length > 1) D.legend(ctx, env, cats.map(c => ({ name: c.label + '  ' + env.fmt(c.value, c.value, c), color: D.color(env, c.i, c.color) })), box.x, box.y + 26 * k, env.introP);
      }
      // key: "[icon] = 1 lakh people"
      const kt = P.legendText || ('= ' + env.fmt(per, per));
      const ky = box.y + box.h - keyH / 2 + 8 * k;
      ctx.save(); ctx.globalAlpha *= env.introP;
      const tw = D.measure(ctx, env, kt, 28 * k, 'body', 700), kx = box.x + box.w / 2 - (tw + 50 * k) / 2;
      D.icon(ctx, env, cats[0].icon || P.icon, kx + 18 * k, ky - 9 * k, 40 * k, th.ink);
      D.text(ctx, env, kt, kx + 50 * k, ky, { size: 28 * k, weight: 700, color: th.ink });
      ctx.restore();
    },
  });

  // ---------- scale comparison ----------
  R.register({
    id: 'scale', name: 'Scale comparison (circles / blocks)', family: 'Numbers', shape: 'table', dur: 6,
    params: [
      { key: 'shape', label: 'Shape', type: 'select', options: ['circles', 'squares', 'nested circles'], def: 'circles' },
      { key: 'sort', label: 'Order', type: 'select', options: ['as typed', 'small to big', 'big to small'], def: 'as typed' },
      { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 0.7 },
      { key: 'ease', label: 'Easing', type: 'select', options: ['back', 'out', 'expo', 'elastic', 'inOut'], def: 'back' },
    ],
    draw(ctx, env) {
      const { box, k, P } = env, th = env.theme;
      let cats = DC.data.categories(env.data, 0).filter(c => c.value > 0).slice(0, 8);
      if (P.sort === 'small to big') cats = cats.slice().sort((a, b) => a.value - b.value);
      if (P.sort === 'big to small') cats = cats.slice().sort((a, b) => b.value - a.value);
      const n = cats.length; if (!n) return;
      const max = Math.max(...cats.map(c => c.value)), sq = P.shape === 'squares';
      if (P.shape === 'nested circles') {
        const order = cats.slice().sort((a, b) => b.value - a.value), Rm = Math.min(box.h * 0.48, box.w * 0.3), base = box.y + box.h - 10 * k, cx = box.x + box.w * 0.36;
        order.forEach((c, i) => {
          const p = env.item(i, n), r = Rm * Math.sqrt(c.value / max) * p, col = D.color(env, c.i, c.color);
          ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label);
          ctx.fillStyle = U.rgba(col, 0.85); D.glow(ctx, env, col); ctx.beginPath(); ctx.arc(cx, base - r, Math.max(0, r), 0, 7); ctx.fill(); D.noGlow(ctx);
          ctx.strokeStyle = th.paper ? th.bg0 : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3 * k; ctx.stroke();
          // label to the right with a leader to the circle top
          const ly = box.y + 50 * k + (box.h - 100 * k) * (i / Math.max(1, n - 1)), lx = box.x + box.w * 0.7, ap = U.clamp(env.itemRaw(i, n) * 3);
          const full = Rm * Math.sqrt(c.value / max), tx = cx + full * 0.707, ty = base - full - full * 0.707;
          ctx.globalAlpha *= ap; ctx.strokeStyle = col; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx - 16 * k, ly); ctx.stroke();
          D.text(ctx, env, c.label, lx, ly - 4 * k, { size: 28 * k, weight: 700, maxW: box.w * 0.3 });
          D.num(ctx, env, env.fmt(c.value * U.clamp(p), c.value, c), lx, ly + 34 * k, { size: 30 * k, color: col, maxW: box.w * 0.3 });
          ctx.restore();
          env.anchors[key(c.label)] = { x: tx, y: ty };
        });
        return;
      }
      // side by side, bottom aligned; sizes fitted so the biggest fills the height and all fit the width
      const labH = 110 * k, H = box.h - labH, gap = 30 * k;
      const rel = cats.map(c => Math.sqrt(c.value / max));
      const sumW = rel.reduce((a, r) => a + r, 0);
      const side = Math.min(H, (box.w - gap * (n - 1)) / sumW);
      const totalW = side * sumW + gap * (n - 1);
      let x = box.x + (box.w - totalW) / 2;
      const base = box.y + H;
      // label slots: measure the real text, spread so neighbours never collide (leader lines for the ones that move)
      const cxs = cats.map((c, i) => { const d = side * rel[i]; const cx = x + d / 2; x += d + gap; return cx; });
      const bw2 = cats.map((c, i) => Math.max(
        D.measure(ctx, env, c.label, 28 * k, 'body', 700),
        D.measure(ctx, env, env.fmt(c.value, c.value, c), 32 * k, 'num', 800)) + 12 * k);
      const need = (a, b) => (bw2[a] + bw2[b]) / 2 + 26 * k;
      const lx = cxs.slice();
      for (let it = 0; it < 6; it++) {
        for (let i = 1; i < n; i++) lx[i] = Math.max(lx[i], lx[i - 1] + need(i - 1, i));
        lx[n - 1] = Math.min(lx[n - 1], box.x + box.w - bw2[n - 1] / 2);
        for (let i = n - 2; i >= 0; i--) lx[i] = Math.min(lx[i], lx[i + 1] - need(i, i + 1));
        lx[0] = Math.max(lx[0], box.x + bw2[0] / 2);
      }
      cats.forEach((c, i) => {
        const p = env.item(i, n), d = side * rel[i], col = D.color(env, c.i, c.color), dd = d * p, cx = cxs[i];
        ctx.save(); ctx.globalAlpha *= D.dimAlpha(env, c.label);
        if (sq) D.bar(ctx, env, cx - dd / 2, base - dd, dd, dd, col, { radius: 0.04 });
        else { ctx.fillStyle = col; D.glow(ctx, env, col); ctx.beginPath(); ctx.arc(cx, base - dd / 2, Math.max(0, dd / 2), 0, 7); ctx.fill(); D.noGlow(ctx); }
        const ap = U.clamp(env.itemRaw(i, n) * 3), w = bw2[i];
        if (Math.abs(lx[i] - cx) > 40 * k && ap > 0) {
          ctx.save(); ctx.globalAlpha *= ap * 0.9; ctx.strokeStyle = env.theme.faint; ctx.lineWidth = Math.max(1, 2 * k);
          ctx.beginPath(); ctx.moveTo(cx, base + 10 * k); ctx.lineTo(lx[i], base + 30 * k); ctx.stroke(); ctx.restore();
        }
        D.text(ctx, env, c.label, lx[i], base + 42 * k, { size: 28 * k, weight: 700, align: 'center', alpha: ap, maxW: w });
        D.num(ctx, env, env.fmt(c.value * U.clamp(p), c.value, c), lx[i], base + 86 * k, { size: 32 * k, align: 'center', color: col, alpha: ap, maxW: w });
        ctx.restore();
        env.anchors[key(c.label)] = { x: cx, y: base - d / 2 };
      });
    },
  });

  // ---------- table that builds row by row ----------
  R.register({
    id: 'table', name: 'Table builds row by row', family: 'Tables', shape: 'table', dur: 7,
    params: [
      { key: 'count', label: 'Numbers count up', type: 'check', def: true },
      { key: 'zebra', label: 'Striped rows', type: 'check', def: true },
      { key: 'maxRows', label: 'Rows shown', type: 'number', min: 1, max: 14, def: 8 },
      { key: 'stagger', label: 'Stagger between items', type: 'range', min: 0, max: 1, step: 0.02, def: 0.6 },
    ],
    draw(ctx, env) {
      const { box, k, P } = env, th = env.theme, ds = env.data;
      const flagCol = ds.metaCol.flag, hidden = new Set(Object.entries(ds.metaCol).filter(([m]) => m !== 'flag').map(([, i]) => i));
      const cols = ds.headers.map((h, i) => i).filter(i => !hidden.has(i) && i !== flagCol);
      const rows = ds.rows.slice(0, P.maxRows), n = rows.length; if (!n || !cols.length) return;
      const numeric = new Set(cols.filter(i => i > 0 && ds.numCols.includes(i)));
      const headH = 76 * k, rowH = Math.min((box.h - headH) / n, 90 * k), size = Math.min(30 * k, rowH * 0.42);
      const fw = flagCol != null ? rowH * 0.9 : 0;
      // column widths from content
      const wants = cols.map(ci => Math.max(D.measure(ctx, env, ds.headers[ci], size * 0.85, 'body', 800), ...rows.map(r => D.measure(ctx, env, numeric.has(ci) ? env.fmt(U.num(r[ci]), U.num(r[ci])) : r[ci], size, 'body', 700))) + 50 * k);
      wants[0] += fw;
      const sum = wants.reduce((a, b) => a + b, 0), scale = Math.min(1.6, box.w / sum), tw = sum * scale;
      const x0 = box.x + (box.w - tw) / 2, th0 = box.y + (box.h - headH - rowH * n) / 2;
      const xs = []; let acc = x0; wants.forEach(w => { xs.push(acc); acc += w * scale; });
      const ha = env.introP;
      ctx.save(); ctx.globalAlpha *= ha;
      ctx.fillStyle = th.accent; U.rr(ctx, x0, th0, tw * U.ease.out(ha), headH, 10 * k); ctx.fill();
      cols.forEach((ci, j) => D.text(ctx, env, ds.headers[ci], numeric.has(ci) ? xs[j] + wants[j] * scale - 24 * k : xs[j] + 24 * k, th0 + headH / 2, { size: size * 0.85, weight: 800, base: 'middle', align: numeric.has(ci) ? 'right' : 'left', color: th.hiInk, maxW: wants[j] * scale - 30 * k, role: 'head' }));
      ctx.restore();
      rows.forEach((r, ri) => {
        const p = env.item(ri, n), raw = env.itemRaw(ri, n), y = th0 + headH + rowH * ri, slide = (1 - U.ease.out(U.clamp(raw * 2))) * 40 * k;
        const isHl = env.hl && key(r[0]) === env.hl && env.hlOn > 0;
        ctx.save(); ctx.globalAlpha *= U.clamp(raw * 3) * D.dimAlpha(env, r[0]); ctx.translate(0, slide);
        if (isHl) { ctx.fillStyle = U.rgba(th.accent, 0.25); ctx.fillRect(x0, y, tw, rowH); ctx.fillStyle = th.accent; ctx.fillRect(x0, y, 6 * k, rowH); }
        else if (P.zebra && ri % 2) { ctx.fillStyle = th.card; ctx.fillRect(x0, y, tw, rowH); }
        ctx.strokeStyle = th.cardLine; ctx.lineWidth = 1 * k; ctx.beginPath(); ctx.moveTo(x0, y + rowH); ctx.lineTo(x0 + tw, y + rowH); ctx.stroke();
        cols.forEach((ci, j) => {
          let x = xs[j] + 24 * k;
          if (j === 0 && fw) { D.flag(ctx, env, r[flagCol], x, y + rowH * 0.22, fw * 0.84, rowH * 0.56, 'round'); x += fw; }
          if (numeric.has(ci)) { const v = U.num(r[ci]); D.num(ctx, env, isNaN(v) ? r[ci] : env.fmt(P.count ? v * p : v, v), xs[j] + wants[j] * scale - 24 * k, y + rowH / 2, { size, align: 'right', base: 'middle', weight: j === 1 ? 800 : 700, maxW: wants[j] * scale - 30 * k, color: isHl ? th.accent : th.ink }); }
          else D.text(ctx, env, r[ci], x, y + rowH / 2, { size, weight: j === 0 ? 700 : 500, base: 'middle', maxW: wants[j] * scale - 30 * k - (j === 0 ? fw : 0), color: j === 0 ? th.ink : th.sub });
        });
        ctx.restore();
        env.anchors[key(r[0])] = { x: x0 + tw * 0.25, y: y + rowH / 2 };
      });
    },
  });
})();
