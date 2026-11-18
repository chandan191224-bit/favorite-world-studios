// Bar chart race (Flourish / BARBACHART style): rows = years, columns = competitors. Values interpolate between
// years, bars swap places smoothly, axis rescales, big year counter, optional total, flags at the bar ends.
(() => {
  const U = DC.util, D = DC.draw, R = DC.charts;
  const key = s => String(s).trim().toLowerCase();

  R.register({
    id: 'race', name: 'Bar chart race', family: 'Race', shape: 'series', dur: 14,
    params: [
      { key: 'bars', label: 'Bars shown (top N)', type: 'number', min: 3, max: 20, def: 10 },
      { key: 'hold', label: 'Hold at the end (s)', type: 'range', min: 0, max: 6, step: 0.1, def: 2 },
      { key: 'stepEase', label: 'Year-to-year motion', type: 'select', options: ['linear', 'inOut'], def: 'linear' },
      { key: 'swap', label: 'Rank swap smoothness (s)', type: 'range', min: 0, max: 1, step: 0.05, def: 0.35 },
      { key: 'labelMode', label: 'Names', type: 'select', options: ['left of bars', 'inside bars'], def: 'left of bars' },
      { key: 'flags', label: 'Flags at bar ends', type: 'check', def: true },
      { key: 'counter', label: 'Big year counter', type: 'check', def: true },
      { key: 'total', label: 'Total of all values', type: 'check', def: false },
      { key: 'totalLabel', label: 'Total label', type: 'text', def: 'Total' },
    ],
    draw(ctx, env) {
      const { box, k, P, t } = env;
      const S = DC.data.series(env.data), ser = S.series, nx = S.x.length; if (!ser.length || !nx) return;
      const run = Math.max(0.5, env.dur - env.intro - P.hold);
      const fAt = tt => U.clamp((tt - env.intro) / run) * (nx - 1);
      const valAt = (s, f) => {
        const i = Math.min(nx - 2, Math.floor(f)), u = nx < 2 ? 0 : f - Math.max(0, i), e = P.stepEase === 'inOut' ? U.ease.inOut(u) : u;
        const a = s.values[Math.max(0, i)], b = s.values[Math.min(nx - 1, Math.max(0, i) + 1)];
        return U.lerp(isNaN(a) ? 0 : a, isNaN(b) ? (isNaN(a) ? 0 : a) : b, nx < 2 ? 0 : e);
      };
      const ranksAt = f => { const order = ser.map(s => [s, valAt(s, f)]).sort((a, b) => b[1] - a[1]); const r = {}; order.forEach(([s], i) => (r[s.i] = i)); return r; };
      const f = fAt(t), N = Math.min(P.bars, ser.length);
      // smoothed rank: box filter of the rank over the last `swap` seconds (deterministic)
      const SAMPLES = 8, rs = [];
      for (let j = 0; j < SAMPLES; j++) rs.push(ranksAt(fAt(t - (P.swap * j) / (SAMPLES - 1))));
      const vals = ser.map(s => valAt(s, f));
      let mx = 0; for (let j = 0; j < SAMPLES; j++) { const ff = fAt(t - (P.swap * j) / (SAMPLES - 1)); mx += Math.max(...ser.map(s => valAt(s, ff))); }
      mx = Math.max(1e-9, (mx / SAMPLES) * 1.04);
      const ref = Math.max(...ser.flatMap(s => s.values.filter(v => !isNaN(v))));
      const top = box.y + 46 * k, rowH = (box.y + box.h - top) / N, bh = rowH * 0.72;
      const inside = P.labelMode.startsWith('inside');
      const lsize = Math.min(28 * k, bh * 0.5);
      const labW = inside ? 0 : Math.min(box.w * 0.24, Math.max(...ser.map(s => D.measure(ctx, env, s.name, lsize, 'body', 700))) + 22 * k);
      const x0 = box.x + labW, bwMax = box.w - labW - 260 * k;
      const a = env.introP;
      // ticks along the top
      const tks = U.ticks(0, mx, 4);
      ctx.save();
      tks.forEach(v => {
        const x = x0 + (v / mx) * bwMax; if (x > x0 + bwMax + 1) return;
        ctx.strokeStyle = v === 0 ? env.theme.axis : env.theme.grid; ctx.lineWidth = Math.max(1, (v ? 1.4 : 2.4) * k); ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(x, top - 8 * k); ctx.lineTo(x, box.y + box.h); ctx.stroke();
        if (v) D.text(ctx, env, env.axis(v, mx), x, top - 16 * k, { size: 20 * k, weight: 600, color: env.theme.sub, align: 'center', alpha: a });
      });
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, top - 10 * k, env.W, box.y + box.h - top + 10 * k); ctx.clip();
      // pass 1: where is every row right now (smoothed rank + live value)?
      const rows = [];
      ser.forEach((s, si) => {
        const rk = rs.reduce((acc, r) => acc + r[s.i], 0) / SAMPLES;
        if (rk > N) return;
        rows.push({ s, si, rk, y: top + rowH * (rk + 0.5), v: vals[si], w: Math.max(0, (vals[si] / mx) * bwMax) * U.ease.out(a), fade: U.clamp(N - rk) * a, col: D.color(env, s.i, s.color) });
      });
      // pass 2: while two bars cross, their end labels would print on top of each other -
      // the row behind (smaller live value) hides its name / value / flag for the crossing moment
      rows.forEach(r => { r.hide = rows.some(q => q !== r && Math.abs(q.y - r.y) < bh * 0.95 && (q.v > r.v || (q.v === r.v && q.rk < r.rk))); });
      rows.forEach(r => {
        const { s, y, v, w, fade, col: c } = r;
        ctx.save(); ctx.globalAlpha *= fade * D.dimAlpha(env, s.name);
        D.bar(ctx, env, x0, y - bh / 2, w, bh, c, { radius: Math.min(env.theme.radius, 0.22) });
        env.anchors[key(s.name)] = { x: x0 + w, y };
        if (r.hide) { ctx.restore(); return; }
        const fs = bh * 0.92, hasF = P.flags && s.flag, fIn = hasF && w > fs + 10 * k;
        let vx = x0 + w + 14 * k;
        if (hasF) { D.flag(ctx, env, s.flag, fIn ? x0 + w - fs - 4 * k : vx, y - fs / 2, fs, fs, 'circle'); if (!fIn) vx += fs + 10 * k; }
        if (inside) {
          const nw = D.measure(ctx, env, s.name, lsize, 'body', 700), room = w - (fIn ? fs + 8 * k : 0);
          if (room > nw + 30 * k) D.text(ctx, env, s.name, x0 + room - 14 * k, y, { size: lsize, weight: 700, align: 'right', base: 'middle', color: U.lum(c) > 0.62 ? '#111' : '#fff' });
          else { D.text(ctx, env, s.name, vx, y, { size: lsize, weight: 700, base: 'middle' }); vx += nw + 16 * k; }
        } else D.text(ctx, env, s.name, x0 - 14 * k, y, { size: lsize, weight: 700, align: 'right', base: 'middle', maxW: labW - 22 * k });
        D.num(ctx, env, env.fmt(v, ref), vx, y, { size: Math.min(28 * k, bh * 0.55), base: 'middle', weight: 700 });
        ctx.restore();
      });
      ctx.restore();
      if (P.counter) {
        const xn = S.xNum, i = Math.min(nx - 2, Math.floor(f)), u = f - Math.max(0, i);
        const numeric = S.x.every(v => !isNaN(U.num(v)));
        const label = numeric ? String(Math.round(nx < 2 ? xn[0] : U.lerp(xn[Math.max(0, i)], xn[Math.min(nx - 1, i + 1)], u))) : S.x[Math.round(f)];
        const cy = box.y + box.h - (P.total ? 70 * k : 14 * k);
        D.num(ctx, env, label, box.x + box.w, cy, { size: 150 * k, align: 'right', color: env.theme.id === 'neon' ? env.theme.accent : U.rgba(env.theme.ink, 0.28), weight: 800, alpha: a });
        if (P.total) {
          const tot = vals.reduce((x, y) => x + Math.max(0, y), 0);
          D.text(ctx, env, P.totalLabel + ': ' + env.fmt(tot, ref * ser.length * 0.5), box.x + box.w, box.y + box.h - 10 * k, { size: 34 * k, weight: 700, align: 'right', color: env.theme.sub, alpha: a });
        }
      }
    },
  });
})();
