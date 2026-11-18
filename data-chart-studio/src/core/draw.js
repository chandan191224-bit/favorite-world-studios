// Drawing primitives shared by every chart: fitted text, tabular numbers, animated grid/axes, bars, call-outs,
// highlight rings, flags/icons (with fallbacks), glow for the neon look.
DC.draw = (() => {
  const U = DC.util;

  function font(env, role, px, weight = 700) {
    const th = env.theme;
    const fam = role === 'num' ? th.num : role === 'head' ? (env.lang === 'hi' && th.hiFont !== th.head && th.id !== 'neon' ? th.hiFont : th.head) : th.body;
    return `${weight} ${Math.max(1, px).toFixed(1)}px ${fam}`;
  }
  // text with optional shrink-to-fit. o: { role, size, weight, color, align, base, maxW, alpha }
  function text(ctx, env, s, x, y, o = {}) {
    s = s == null ? '' : String(s);
    if (!s) return 0;
    let size = o.size || 30 * env.k;
    ctx.font = font(env, o.role || 'body', size, o.weight || 600);
    let w = ctx.measureText(s).width;
    if (o.maxW && w > o.maxW) { size *= o.maxW / w; ctx.font = font(env, o.role || 'body', size, o.weight || 600); w = o.maxW; }
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= U.clamp(o.alpha);
    ctx.fillStyle = o.color || env.theme.ink;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.glow && env.theme.glow) { ctx.shadowColor = o.glowColor || ctx.fillStyle; ctx.shadowBlur = size * 0.16; }
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = size * 0.16; ctx.strokeText(s, x, y); }
    ctx.fillText(s, x, y);
    ctx.restore();
    return w;
  }
  function measure(ctx, env, s, size, role = 'body', weight = 600) { ctx.font = font(env, role, size, weight); return ctx.measureText(String(s || '')).width; }

  // number with tabular (fixed-width) digits so counting values don't wobble
  function num(ctx, env, s, x, y, o = {}) {
    s = String(s);
    let size = o.size || 40 * env.k;
    const role = o.role || 'num', weight = o.weight || 800;
    ctx.font = font(env, role, size, weight);
    const dw = ctx.measureText('0').width;
    const adv = ch => (/[0-9०-९]/.test(ch) ? dw : ctx.measureText(ch).width);
    let total = 0; for (const ch of s) total += adv(ch);
    if (o.maxW && total > o.maxW) { const f = o.maxW / total; size *= f; return num(ctx, env, s, x, y, Object.assign({}, o, { size, maxW: 0 })); }
    // non-digit runs (unit words in Devanagari) must be drawn as whole strings so the shaping stays right
    const runs = []; let cur = '', isD = null;
    for (const ch of s) { const d = /[0-9०-९.,]/.test(ch); if (isD === null || d === isD) cur += ch; else { runs.push([cur, isD]); cur = ch; } isD = d; }
    if (cur) runs.push([cur, isD]);
    total = 0; for (const [r, d] of runs) total += d ? [...r].reduce((a, ch) => a + adv(ch), 0) : ctx.measureText(r).width;
    let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= U.clamp(o.alpha);
    ctx.fillStyle = o.color || env.theme.ink; ctx.textAlign = 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (env.theme.glow && o.glow !== false) { ctx.shadowColor = o.glowColor || ctx.fillStyle; ctx.shadowBlur = size * 0.18; }
    for (const [r, d] of runs) {
      if (!d) { ctx.fillText(r, cx, y); cx += ctx.measureText(r).width; continue; }
      for (const ch of r) { const a = adv(ch); ctx.fillText(ch, cx + (a - ctx.measureText(ch).width) / 2, y); cx += a; }
    }
    ctx.restore();
    return total;
  }

  // colours: data colour > theme palette; highlight dims the others
  function color(env, i, explicit) { return explicit && /^#|^rgb/.test(explicit) ? explicit : env.theme.palette[((i % env.theme.palette.length) + env.theme.palette.length) % env.theme.palette.length]; }
  function isDim(env, name) { return !!env.hl && env.hlOn > 0 && String(name).trim().toLowerCase() !== env.hl; }
  function dimAlpha(env, name) { return isDim(env, name) ? U.lerp(1, 0.45, env.hlOn) : 1; }

  function glow(ctx, env, c, amt = 1) { if (env.theme.glow) { ctx.shadowColor = c; ctx.shadowBlur = 18 * env.k * amt; } }
  function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

  function bar(ctx, env, x, y, w, h, c, o = {}) {
    if (Math.abs(w) < 0.5 || Math.abs(h) < 0.5) return;
    const r = (o.radius != null ? o.radius : env.theme.radius) * Math.min(Math.abs(w), Math.abs(h));
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    glow(ctx, env, c, 0.8);
    if (env.theme.paper && !o.flat) {
      ctx.fillStyle = c; U.rr(ctx, x, y, w, h, r); ctx.fill(); noGlow(ctx);
      // printed ink: slightly darker edge + hatch texture
      ctx.clip(); ctx.globalAlpha *= 0.13; ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(1, 2 * env.k);
      const step = 9 * env.k, x0 = Math.min(x, x + w), y0 = Math.min(y, y + h), aw = Math.abs(w), ah = Math.abs(h);
      ctx.beginPath(); for (let d = -ah; d < aw; d += step) { ctx.moveTo(x0 + d, y0 + ah); ctx.lineTo(x0 + d + ah, y0); } ctx.stroke();
    } else if (env.theme.id === 'neon' && !o.flat) {
      const g = h > w ? ctx.createLinearGradient(0, y + h, 0, y) : ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, U.rgba(c, 0.25)); g.addColorStop(1, U.rgba(c, 0.95));
      ctx.fillStyle = g; U.rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2 * env.k; ctx.stroke();
    } else {
      ctx.fillStyle = c; U.rr(ctx, x, y, w, h, r); ctx.fill();
    }
    ctx.restore();
  }

  // horizontal grid lines + value labels growing in from the left. a = 0..1 appear progress
  function yGrid(ctx, env, box, tks, yOf, label, a) {
    ctx.save();
    tks.forEach((v, i) => {
      const p = U.ease.out(U.clamp(a * 1.6 - i * 0.12)); if (p <= 0) return;
      const y = yOf(v);
      ctx.strokeStyle = v === 0 ? env.theme.axis : env.theme.grid; ctx.lineWidth = Math.max(1, (v === 0 ? 2.2 : 1.4) * env.k);
      if (env.theme.paper && v !== 0) ctx.setLineDash([4 * env.k, 5 * env.k]);
      ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w * p, y); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, env, label(v), box.x - 14 * env.k, y, { size: 22 * env.k, weight: 600, color: env.theme.sub, align: 'right', base: 'middle', alpha: p, role: 'body', maxW: Math.max(60, box.x - 14 * env.k - 12) });
    });
    ctx.restore();
  }
  function xGrid(ctx, env, box, tks, xOf, label, a) {
    ctx.save();
    tks.forEach((v, i) => {
      const p = U.ease.out(U.clamp(a * 1.6 - i * 0.1)); if (p <= 0) return;
      const x = xOf(v);
      ctx.strokeStyle = v === 0 ? env.theme.axis : env.theme.grid; ctx.lineWidth = Math.max(1, 1.4 * env.k);
      if (env.theme.paper && v !== 0) ctx.setLineDash([4 * env.k, 5 * env.k]);
      ctx.beginPath(); ctx.moveTo(x, box.y + box.h); ctx.lineTo(x, box.y + box.h - box.h * p); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, env, label(v), x, box.y + box.h + 34 * env.k, { size: 22 * env.k, weight: 600, color: env.theme.sub, align: 'center', alpha: p });
    });
    ctx.restore();
  }
  function axisLine(ctx, env, x1, y1, x2, y2, a) {
    if (a <= 0) return;
    ctx.save(); ctx.strokeStyle = env.theme.axis; ctx.lineWidth = Math.max(1, 2.4 * env.k); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(U.lerp(x1, x2, U.ease.out(a)), U.lerp(y1, y2, U.ease.out(a))); ctx.stroke(); ctx.restore();
  }

  function flag(ctx, env, code, x, y, w, h, shape = 'circle') {
    if (!code) return false;
    if (DC.flags && DC.flags.has(code)) return DC.flags.draw(ctx, DC.flags.resolve(code), x, y, w, h, { shape, border: env.theme.paper ? 'rgba(40,30,20,0.5)' : 'rgba(255,255,255,0.55)' });
    // fallback: initials disc
    const r = Math.min(w, h) / 2;
    ctx.save(); ctx.fillStyle = env.theme.card; ctx.strokeStyle = env.theme.cardLine; ctx.lineWidth = 2 * env.k;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    text(ctx, env, String(code).slice(0, 2).toUpperCase(), x + w / 2, y + h / 2 + r * 0.05, { size: r * 0.9, weight: 800, align: 'center', base: 'middle', color: env.theme.sub });
    return true;
  }
  function icon(ctx, env, id, cx, cy, size, c, o = {}) {
    if (DC.icons && DC.icons.has(id || 'person')) return DC.icons.draw(ctx, id || 'person', cx, cy, size, c, o);
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.fillStyle = c;
    const s = size;
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.25, s * 0.17, 0, Math.PI * 2); ctx.fill();
    U.rr(ctx, cx - s * 0.22, cy - s * 0.04, s * 0.44, s * 0.46, s * 0.12); ctx.fill(); ctx.restore();
    return true;
  }

  // call-out: dot ring on the anchor, leader line, label card. a = appear progress (0..1)
  function callout(ctx, env, ax, ay, label, a, o = {}) {
    if (a <= 0 || !label) return;
    const k = env.k, th = env.theme, W = env.W, H = env.H;
    const size = (o.size || 30) * k, padX = 18 * k, padY = 12 * k;
    const lines = String(label).split('\\n').join('\n').split('\n');
    ctx.font = font(env, 'head', size, 700);
    const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), bw = tw + padX * 2, bh = lines.length * size * 1.25 + padY * 2 - size * 0.25;
    // place up-right by default, flip to stay inside the frame
    const dist = (o.dist || 110) * k;
    let dx = o.side === 'left' ? -1 : 1, dy = o.below ? 1 : -1;
    let bx = ax + dx * dist * 0.75, by = ay + dy * dist;
    if (bx + bw > W - 30 * k || o.side === 'left') { dx = -1; bx = ax - dist * 0.75 - bw; }
    if (bx < 30 * k) { dx = 1; bx = ax + dist * 0.75; }
    if (by - bh < 30 * k) { dy = 1; by = ay + dist; }
    if (by + (dy > 0 ? bh : 0) > H - 30 * k) { dy = -1; by = ay - dist; }
    const boxY = dy < 0 ? by - bh : by;
    const ex = dx > 0 ? bx : bx + bw, ey = dy < 0 ? by - bh / 2 : by + bh / 2;
    const pLine = U.ease.out(U.clamp(a * 2)), pBox = U.ease.back(U.clamp(a * 2 - 0.5));
    const c = o.color || th.accent;
    ctx.save();
    // anchor ring pulse
    const pr = (9 + 5 * Math.sin(env.t * 5)) * k;
    ctx.strokeStyle = c; ctx.lineWidth = 3 * k; glow(ctx, env, c);
    ctx.beginPath(); ctx.arc(ax, ay, pr * pLine + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ax, ay, 5 * k * pLine, 0, Math.PI * 2); ctx.fill();
    // leader (elbow)
    ctx.beginPath(); ctx.moveTo(ax, ay);
    const mx = U.lerp(ax, ex, 0.55), seg1 = Math.hypot(mx - ax, ey - ay), seg2 = Math.abs(ex - mx), L = seg1 + seg2, d = L * pLine;
    if (d <= seg1) ctx.lineTo(U.lerp(ax, mx, d / seg1), U.lerp(ay, ey, d / seg1));
    else { ctx.lineTo(mx, ey); ctx.lineTo(U.lerp(mx, ex, (d - seg1) / Math.max(1, seg2)), ey); }
    ctx.stroke(); noGlow(ctx);
    if (pBox > 0) {
      const cx = bx + bw / 2, cy = boxY + bh / 2;
      ctx.translate(cx, cy); ctx.scale(pBox, pBox); ctx.translate(-cx, -cy);
      ctx.fillStyle = th.paper ? '#fff8ea' : c;
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18 * k; ctx.shadowOffsetY = 6 * k;
      U.rr(ctx, bx, boxY, bw, bh, 10 * k); ctx.fill();
      ctx.shadowColor = 'transparent';
      if (th.paper) { ctx.strokeStyle = c; ctx.lineWidth = 3 * k; ctx.stroke(); }
      lines.forEach((l, i) => text(ctx, env, l, bx + padX, boxY + padY + size * 0.85 + i * size * 1.25, { size, weight: 700, role: 'head', color: th.paper ? th.ink : th.hiInk }));
    }
    ctx.restore();
  }
  function ring(ctx, env, x, y, r, a, c) {
    if (a <= 0) return;
    ctx.save(); ctx.strokeStyle = c || env.theme.accent; ctx.lineWidth = 4 * env.k; glow(ctx, env, ctx.strokeStyle);
    ctx.globalAlpha *= U.clamp(a);
    ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.06 * Math.sin(env.t * 4)), 0, Math.PI * 2 * U.ease.out(a)); ctx.stroke(); ctx.restore();
  }
  // legend row (top-left of the plot box)
  function legend(ctx, env, items, x, y, a, maxW) {
    let cx = x;
    const size = 22 * env.k;
    items.forEach((it, i) => {
      const p = U.ease.out(U.clamp(a * 2 - i * 0.15)); if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p * dimAlpha(env, it.name);
      ctx.fillStyle = it.color; U.rr(ctx, cx, y - size * 0.75, size * 0.9, size * 0.9, size * 0.2); ctx.fill(); ctx.restore();
      const w = text(ctx, env, it.name, cx + size * 1.3, y, { size, weight: 600, color: env.theme.sub, alpha: p * dimAlpha(env, it.name) });
      cx += size * 1.3 + w + size * 1.4;
      if (maxW && cx > x + maxW) return;
    });
  }
  return { font, text, measure, num, color, isDim, dimAlpha, glow, noGlow, bar, yGrid, xGrid, axisLine, flag, icon, callout, ring, legend };
})();
