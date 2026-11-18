// Technical drawing primitives: draw-on strokes, arrowheads, dimension lines with counting
// measurements, centre lines, hatching, leader lines + label boxes, numbered markers, grids,
// title blocks, moving dots along paths. Everything takes 0..1 progress values so the caller
// sequences a shot; all randomness is seeded. Design px (short side of frame = 1080).
BD.draw = (() => {
  const U = BD.util, T = BD.text;

  // staggered sub-progress: item i of n, given global progress p (0..1); spread 0 = together, 1 = strict sequence
  function stagger(p, i, n, spread = 0.6) {
    if (n <= 1) return U.clamp(p);
    const ut = 1 / (1 + (n - 1) * spread), st = ut * spread;
    return U.range(p, i * st, i * st + ut);
  }

  // hand-drawn wobble for chalk/graphite themes; re-seeds at 8 fps so lines "boil" like real animation
  function wobble(pts, seed, amp, t = 0) {
    if (!amp) return pts;
    const f = Math.floor((t || 0) * 8);
    const src = pts.length > 2 && amp > 0.5 ? U.polyResample(pts, 14) : pts;
    return src.map((pt, i) => [pt[0] + U.noise1(i * 0.9 + f * 13.7, seed) * amp, pt[1] + U.noise1(i * 0.9 + 99 + f * 13.7, seed) * amp]);
  }

  // ---------- core stroke ----------
  // o: {w=3, color, prog=1, alpha=1, dash=null|[..], boil=0, seed=0, t=0, cap='round', glow=0, rev=false, min=0.02}
  function stroke(g, pts, o = {}) {
    if (!pts || pts.length < 2 || (o.alpha != null && o.alpha <= 0.004)) return;
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    let P = pts;
    if (o.boil) P = wobble(P, (o.seed || 0) + 31, o.boil, o.t || 0);
    const L = U.polyLen(P);
    const seg = o.rev ? polyTrimEnd(P, L * prog) : U.polyPartial(P, L * prog);
    g.save();
    g.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    if (o.glow) { g.shadowColor = o.color || '#21e6ff'; g.shadowBlur = o.w * 2.6 * o.glow; }
    g.strokeStyle = o.color || '#fff';
    g.lineWidth = Math.max(0.6, o.w == null ? 3 : o.w);
    g.lineJoin = 'round'; g.lineCap = o.cap || 'round';
    if (o.dash) g.setLineDash(o.dash);
    g.beginPath();
    g.moveTo(seg[0][0], seg[0][1]);
    for (let i = 1; i < seg.length; i++) g.lineTo(seg[i][0], seg[i][1]);
    g.stroke();
    g.restore();
    return { len: L };
  }
  function polyTrimEnd(pts, d) { // keep the LAST d pixels (rev draw) — polyPartial keeps the first
    if (d <= 0) return [pts[pts.length - 1], pts[pts.length - 1]];
    const L = U.polyLen(pts);
    return U.polyPartial(pts.map(p => p.slice()).reverse(), d).reverse();
  }

  const line = (g, x1, y1, x2, y2, o = {}) => stroke(g, [[x1, y1], [x2, y2]], o);

  // smooth curve through points (quadratic midpoints) — arrows, flows
  function curvePts(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      out.push([(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2], pts[i]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const curve = (g, pts, o = {}) => stroke(g, curvePts(pts), o);

  // ---------- arrowheads ----------
  // kind: 'arrow' (filled triangle), 'tick' (architectural slash), 'dot', 'hollow'
  function head(g, x, y, ang, o = {}) {
    const kind = o.kind || 'arrow', s = o.s || 18, w = o.w || 3;
    const c = o.color || '#fff';
    g.save();
    g.translate(x, y); g.rotate(ang);
    if (o.glow) { g.shadowColor = c; g.shadowBlur = w * 2.4; }
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = Math.max(1.4, w * 0.8); g.lineCap = 'round';
    if (kind === 'arrow') { g.beginPath(); g.moveTo(0, 0); g.lineTo(-s, -s * 0.34); g.lineTo(-s * 0.86, 0); g.lineTo(-s, s * 0.34); g.closePath(); g.fill(); }
    else if (kind === 'hollow') { g.beginPath(); g.moveTo(0, 0); g.lineTo(-s, -s * 0.34); g.lineTo(-s, s * 0.34); g.closePath(); g.stroke(); }
    else if (kind === 'tick') { g.beginPath(); g.moveTo(-s * 0.14, -s * 0.55); g.lineTo(s * 0.28, s * 0.55); g.stroke(); }
    else if (kind === 'dot') { g.beginPath(); g.arc(0, 0, Math.max(2.4, s * 0.22), 0, U.TAU); g.fill(); }
    g.restore();
  }

  // ---------- arrow (line + head that snaps in over the last 10%) ----------
  function arrow(g, x1, y1, x2, y2, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const tr = o.trim == null ? 10 : o.trim; // keep the line clear of the head
    const ex = x2 - Math.cos(ang) * tr, ey = y2 - Math.sin(ang) * tr;
    line(g, x1, y1, ex, ey, Object.assign({}, o, { prog: Math.min(1, prog / 0.92) }));
    // head appears in the last 10% of the draw
    const hp = U.range(prog, 0.9, 1);
    if (hp > 0) {
      g.save(); g.globalAlpha *= hp;
      head(g, x2, y2, ang, { kind: o.head || 'arrow', s: o.headS || Math.max(10, (o.w || 3) * 4.2), w: o.w || 3, color: o.color, glow: o.glow });
      g.restore();
    }
  }
  const arrowCurve = (g, pts, o = {}) => {
    const P = curvePts(pts), ang = Math.atan2(P[P.length - 1][1] - P[P.length - 2][1], P[P.length - 1][0] - P[P.length - 2][0]);
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    const x2 = P[P.length - 1][0], y2 = P[P.length - 1][1];
    const tr = o.trim == null ? 10 : o.trim;
    P[P.length - 1] = [x2 - Math.cos(ang) * tr, y2 - Math.sin(ang) * tr];
    stroke(g, P, Object.assign({}, o, { prog: Math.min(1, prog / 0.92) }));
    const hp = U.range(prog, 0.9, 1);
    if (hp > 0) { g.save(); g.globalAlpha *= hp; head(g, x2, y2, ang, { kind: o.head || 'arrow', s: o.headS || Math.max(10, (o.w || 3) * 4.2), w: o.w || 3, color: o.color, glow: o.glow }); g.restore(); }
  };

  // ---------- centre line (dash-dot) ----------
  const cline = (g, x1, y1, x2, y2, o = {}) => line(g, x1, y1, x2, y2, Object.assign({ dash: [20, 6, 5, 6], w: 2 }, o, { dash: [20, 6, 5, 6] }));

  // ---------- dimension line ----------
  // Full technical dimension: extension lines, dimension line with arrowheads, text that counts up.
  // o: {off=70 (perp offset), color=th.dim, w=2, prog, text (string) | {from,to,unit,prefix,fmt,dec},
  //     fs=26, th (theme: fonts), ext=14 (extension overshoot), out=false (arrowheads outside when short), lang, deva}
  function dim(g, x1, y1, x2, y2, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    const th = o.th, color = o.color || (th && th.dim) || '#fff';
    const w = o.w == null ? 2 : o.w, off = o.off == null ? 70 : o.off;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; // unit normal
    const ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
    const p = o.drawEase ? o.drawEase(prog) : prog;
    // extension lines (draw first)
    const e1 = Math.min(1, p / 0.3), e2 = Math.min(1, (p - 0.12) / 0.3);
    const ext = o.ext == null ? 14 : o.ext;
    if (e1 > 0) line(g, x1 + nx * 6, y1 + ny * 6, x1 + nx * (off + ext * e1), y1 + ny * (off + ext * e1), { w: Math.max(1.2, w * 0.7), color, prog: 1, alpha: 0.85, boil: o.boil, seed: o.seed, t: o.t });
    if (e2 > 0) line(g, x2 + nx * 6, y2 + ny * 6, x2 + nx * (off + ext * e2), y2 + ny * (off + ext * e2), { w: Math.max(1.2, w * 0.7), color, prog: 1, alpha: 0.85, boil: o.boil, seed: (o.seed || 0) + 3, t: o.t });
    // dimension line + heads
    const dl = U.range(p, 0.15, 0.8);
    const dAng = Math.atan2(by - ay, bx - ax);
    const outward = o.out != null ? o.out : L < 90; // short spans: heads outside
    const trim = Math.max(9, w * 4.6);
    let a2 = [bx - Math.cos(dAng) * trim, by - Math.sin(dAng) * trim], a1 = [ax + Math.cos(dAng) * trim, ay + Math.sin(dAng) * trim];
    if (outward) { a1 = [ax + Math.cos(dAng) * (trim + 26), ay + Math.sin(dAng) * (trim + 26)]; a2 = [bx - Math.cos(dAng) * (trim + 26), by - Math.sin(dAng) * (trim + 26)]; }
    line(g, a1[0], a1[1], a2[0], a2[1], { w, color, prog: dl, boil: o.boil, seed: (o.seed || 0) + 7, t: o.t });
    const hp = U.range(p, 0.62, 0.8);
    if (hp > 0) {
      g.save(); g.globalAlpha *= hp;
      head(g, ax, ay, outward ? dAng + Math.PI : dAng, { kind: o.head || 'arrow', s: Math.max(9, w * 4.4), w, color });
      head(g, bx, by, outward ? dAng : dAng + Math.PI, { kind: o.head || 'arrow', s: Math.max(9, w * 4.4), w, color });
      g.restore();
    }
    // text — counts up while the line lands; rotated with the dimension, flipped to stay readable
    const tp = U.range(p, 0.45, 0.95);
    if (tp > 0 && (o.text != null || o.to != null)) {
      let str = '';
      if (o.to != null) {
        const v = U.lerp(o.from == null ? 0 : +o.from, +o.to, o.count || tp);
        str = (o.prefix || '') + T.formatNumber(v, o.fmt || 'plain', o.dec == null ? 0 : o.dec, o.lang || 'en', o.deva) + (o.unit || '');
      } else str = String(o.text);
      const fs = o.fs == null ? 26 : o.fs;
      g.save();
      g.translate((ax + bx) / 2 + nx * (fs * 0.75), (ay + by) / 2 + ny * (fs * 0.75));
      let rot = dAng;
      if (rot > Math.PI / 2 || rot < -Math.PI / 2) rot += Math.PI;
      if (o.textAng === 'up') rot = -Math.PI / 2; else if (o.textAng === 'flat') rot = 0;
      g.rotate(rot);
      g.globalAlpha *= U.range(tp, 0, 0.3);
      text(g, 0, 0, str, { font: (th && th.fonts && th.fonts.mono) || 'mono', fs, color, align: 'center', baseline: 'middle', weight: 'normal' });
      g.restore();
    }
  }

  // ---------- hatching ----------
  // o: {poly | rect:{x,y,w,h}, angle=45deg, sp=15, prog, color, w=1.6, seed}
  function hatch(g, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    g.save();
    g.beginPath();
    if (o.poly) { g.moveTo(o.poly[0][0], o.poly[0][1]); for (let i = 1; i < o.poly.length; i++) g.lineTo(o.poly[i][0], o.poly[i][1]); g.closePath(); }
    else { const r = o.rect; g.rect(r.x, r.y, r.w, r.h); }
    g.clip();
    let cx = 0, cy = 0, R = 0;
    if (o.poly) { for (const p of o.poly) { cx += p[0]; cy += p[1]; } cx /= o.poly.length; cy /= o.poly.length; R = Math.max(...o.poly.map(p => Math.hypot(p[0] - cx, p[1] - cy))); }
    else { const r = o.rect; cx = r.x + r.w / 2; cy = r.y + r.h / 2; R = Math.hypot(r.w, r.h) / 2; }
    const sp = o.sp || 15, ang = (o.angle == null ? 45 : o.angle) * Math.PI / 180;
    const step = Math.max(4, sp);
    const lines = Math.ceil((R * 2) / step);
    g.translate(cx, cy); g.rotate(ang);
    g.strokeStyle = o.color || 'rgba(128,128,128,.7)'; g.lineWidth = o.w == null ? 1.6 : o.w; g.lineCap = 'round';
    for (let i = 0; i <= lines; i++) {
      const lp = stagger(prog, i, lines + 1, 0.85);
      if (lp <= 0) continue;
      const yy = -R + i * step, half = R * lp;
      g.globalAlpha = (o.alpha == null ? 0.8 : o.alpha);
      g.beginPath(); g.moveTo(-half, yy); g.lineTo(half, yy); g.stroke();
    }
    g.restore();
  }

  // ---------- text helper (cached measure) ----------
  // o: {font='mukta', fs=30, weight, italic, color, align='left', baseline='alphabetic', alpha, prog (typing reveal), upper, glow}
  function text(g, x, y, str, o = {}) {
    if (str == null || String(str) === '') return { w: 0, h: 0 };
    const s = String(str);
    const fontStr = T.font(o.font || 'mukta', o.fs || 30, o.weight || 'normal', o.italic);
    const m = T.measure(o.upper ? T.upperLatin(s) : s, fontStr);
    g.save();
    g.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    if (o.glow) { g.shadowColor = o.color || '#fff'; g.shadowBlur = (o.fs || 30) * 0.3 * o.glow; }
    g.font = fontStr;
    g.fillStyle = o.color || '#fff';
    g.textAlign = o.align || 'left';
    g.textBaseline = o.baseline || 'alphabetic';
    const yy = o.baseline === 'middle' ? y : y;
    let xx = x;
    if (o.prog != null && o.prog < 1) { // type-on reveal (clip width) — never splits a grapheme visually
      const w = m.w * U.clamp(o.prog);
      const bx = xx - (g.textAlign === 'center' ? w / 2 : g.textAlign === 'right' ? w : 0);
      g.beginPath(); g.rect(bx - 2, yy - m.asc - 2, w + 4, m.asc + m.desc + 4); g.clip();
    }
    g.fillText(o.upper ? T.upperLatin(s) : s, xx, yy);
    g.restore();
    return m;
  }

  // ---------- label box ----------
  // o: {prog, sub, fs=30, subFs, th, align='left' (x anchors that edge), maxW, pad, badge (number), badgeR,
  //     color/ink override, bg, border, pop=true, lang, upper}
  // Returns {w, h} (even when hidden, so callers can lay out).
  function labelBox(g, x, y, str, o = {}) {
    const th = o.th;
    const fs = o.fs == null ? 30 : o.fs, subFs = fs * 0.72;
    const ink = o.ink || (th && th.labelInk) || '#fff';
    const bg = o.bg || (th && th.labelBg) || 'rgba(10,12,18,.85)';
    const border = o.border || (th && th.labelBorder) || 'rgba(255,255,255,.35)';
    const font = o.font || (th && th.fonts && th.fonts.label) || 'mukta';
    const pad = o.pad == null ? 14 : o.pad;
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    const m = T.measure(str, T.font(font, fs, o.weight || 'bold'));
    const sm = o.sub ? T.measure(o.sub, T.font(font, subFs, 'normal')) : null;
    let w = m.w + pad * 2, h = m.asc + m.desc + pad * 1.2;
    if (sm) { w = Math.max(w, sm.w + pad * 2); h += sm.asc + sm.desc + pad * 0.55; }
    const badge = o.badge != null;
    const badgeR = o.badgeR || fs * 0.62;
    if (badge) { w += badgeR * 2 + pad * 0.7; h = Math.max(h, badgeR * 2 + pad * 1.2); }
    const align = o.align || 'left';
    const bx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    const by = y - h / 2;
    if (prog > 0) {
      const pop = o.pop === false ? 1 : U.ease.outBack(U.range(prog, 0, 0.75));
      const a = U.range(prog, 0, 0.4);
      g.save();
      g.globalAlpha *= a;
      g.translate(bx + w / 2, by + h / 2); g.scale(Math.max(0.01, pop), Math.max(0.01, pop)); g.translate(-bx - w / 2, -by - h / 2);
      U.rrect(g, bx, by, w, h, o.r == null ? 8 : o.r);
      g.fillStyle = bg; g.fill();
      g.lineWidth = Math.max(1, fs * 0.045); g.strokeStyle = border; g.stroke();
      if (badge) {
        const ccx = bx + pad * 0.9 + badgeR, ccy = by + h / 2;
        g.beginPath(); g.arc(ccx, ccy, badgeR, 0, U.TAU);
        g.fillStyle = o.badgeBg || (th && th.accent) || '#e5a93c'; g.fill();
        text(g, ccx, ccy, String(o.badge), { font: (th && th.fonts && th.fonts.mono) || 'mono', fs: badgeR, color: o.badgeInk || (th && th.dark ? '#101418' : '#fff'), align: 'center', baseline: 'middle', weight: 'normal' });
      }
      const tx = badge ? bx + pad * 0.9 + badgeR * 2 + pad * 0.7 : bx + pad;
      if (o.sub) {
        const ty = by + h / 2 - (m.asc + m.desc + sm.asc + sm.desc) / 2 + pad * 0.1;
        text(g, tx, ty + m.asc, str, { font, fs, color: ink, weight: o.weight || 'bold', align: 'left' });
        text(g, tx, ty + m.asc + m.desc + sm.asc + pad * 0.16, o.sub, { font, fs: subFs, color: ink, alpha: 0.75, align: 'left' });
      } else {
        text(g, tx, by + h / 2 + m.asc * 0.36 - (m.asc + m.desc) * 0.05, str, { font, fs, color: ink, weight: o.weight || 'bold', align: 'left' });
      }
      g.restore();
    }
    return { w, h, bx, by };
  }

  // ---------- numbered marker ----------
  // o: {r=26, prog, color (ring), ink, bg, fs, glow}
  function numbered(g, x, y, n, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    const r = o.r == null ? 26 : o.r;
    const pop = U.ease.outBack(U.range(prog, 0, 0.7));
    const a = U.range(prog, 0, 0.35);
    g.save();
    g.globalAlpha *= a;
    g.translate(x, y); g.scale(Math.max(0.01, pop), Math.max(0.01, pop));
    if (o.glow) { g.shadowColor = o.color || '#ffd84a'; g.shadowBlur = r * 0.5; }
    g.beginPath(); g.arc(0, 0, r, 0, U.TAU);
    g.fillStyle = o.bg || 'rgba(10,14,20,.9)'; g.fill();
    g.lineWidth = Math.max(2, r * 0.14); g.strokeStyle = o.color || '#ffd84a'; g.stroke();
    g.shadowBlur = 0;
    text(g, 0, 0, String(n), { font: 'mono', fs: r * 1.05, color: o.ink || '#fff', align: 'center', baseline: 'middle', weight: 'normal' });
    g.restore();
  }

  // ---------- leader line + label ----------
  // From a point (x,y) to a label anchored at (tx,ty). o: {text, sub, prog, th, fs, marker='dot'|'ring'|'none'|'cross',
  //   run=70 (horizontal shoulder), side: 'auto'|'left'|'right', color, badge, maxW, weight}
  // side 'right': tx is the label's RIGHT edge (label grows leftwards, staying inside the frame);
  // side 'left': tx is the label's LEFT edge.
  function leader(g, x, y, tx, ty, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return { w: 0, h: 0 };
    const th = o.th;
    const color = o.color || (th && th.pal && th.pal.labelBorder) || 'rgba(255,255,255,.8)';
    const side = o.side || (tx >= x ? 'right' : 'left');
    const run = o.run == null ? 64 : o.run;
    const fs = o.fs == null ? 30 : o.fs;
    // measure the label first (so the box can be anchored inside the frame and the elbow placed at its near edge)
    const align = side === 'right' ? 'right' : 'left';
    const m = labelBox(g, tx, ty, o.text || '', Object.assign({}, o, { prog: 0, align }));
    const bw = m.w;
    const boxLeft = side === 'right' ? tx - bw : tx;
    // marker at the point
    const mp = U.range(prog, 0, 0.18);
    if (mp > 0) {
      g.save(); g.globalAlpha *= mp;
      const mk = o.marker || 'dot';
      if (mk === 'dot') { g.beginPath(); g.arc(x, y, Math.max(4, fs * 0.14), 0, U.TAU); g.fillStyle = color; g.fill(); }
      else if (mk === 'ring') { g.beginPath(); g.arc(x, y, fs * 0.42, 0, U.TAU); g.lineWidth = Math.max(2, fs * 0.08); g.strokeStyle = color; g.stroke(); g.beginPath(); g.arc(x, y, Math.max(3, fs * 0.1), 0, U.TAU); g.fillStyle = color; g.fill(); }
      else if (mk === 'cross') { const s = fs * 0.34; g.strokeStyle = color; g.lineWidth = Math.max(1.6, fs * 0.05); g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); }
      g.restore();
    }
    // elbow line: point -> elbow -> shoulder at the label's near edge
    const nearEdge = side === 'right' ? boxLeft : boxLeft + bw;
    const elbow = [nearEdge + (side === 'right' ? -run : run), ty];
    const lp = U.range(prog, 0.1, 0.62);
    if (lp > 0) {
      stroke(g, [[x, y], elbow], { w: Math.max(1.6, fs * 0.055), color, prog: lp, boil: th && th.wobble, seed: (o.seed || 0) + 11, t: o.t });
      const sp = U.range(prog, 0.5, 0.75);
      if (sp > 0) line(g, elbow[0], elbow[1], nearEdge + (side === 'right' ? 4 : -4), ty, { w: Math.max(1.6, fs * 0.055), color, prog: sp, boil: th && th.wobble, seed: (o.seed || 0) + 17, t: o.t });
    }
    // label pops once the line has landed
    const bp = U.range(prog, 0.55, 1);
    if (bp > 0) labelBox(g, tx, ty, o.text || '', Object.assign({}, o, { prog: bp, align }));
    return { w: bw, h: m.h };
  }

  // ---------- blueprint grid ----------
  // o: {minor=48, major=240, color (minor), majorColor, prog, seed}
  function grid(g, x, y, w, h, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    const minor = o.minor || 48, major = o.major || (minor * 5);
    g.save();
    g.lineWidth = 1;
    const sweep = o.sweep !== false;
    for (let gx = x; gx <= x + w + 0.1; gx += minor) {
      const vis = sweep ? U.range(prog, (gx - x) / w - 0.06, (gx - x) / w + 0.12) : prog;
      if (vis <= 0) continue;
      const isMajor = Math.abs((gx - x) % major) < 0.5;
      g.strokeStyle = isMajor ? (o.majorColor || 'rgba(127,206,255,.22)') : (o.color || 'rgba(127,206,255,.13)');
      g.globalAlpha = U.clamp(vis);
      g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h * (sweep ? U.clamp(vis * 1.4) : 1)); g.stroke();
    }
    for (let gy = y; gy <= y + h + 0.1; gy += minor) {
      const vis = sweep ? U.range(prog, (gy - y) / h - 0.06, (gy - y) / h + 0.12) : prog;
      if (vis <= 0) continue;
      const isMajor = Math.abs((gy - y) % major) < 0.5;
      g.strokeStyle = isMajor ? (o.majorColor || 'rgba(127,206,255,.22)') : (o.color || 'rgba(127,206,255,.13)');
      g.globalAlpha = U.clamp(vis);
      g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w * (sweep ? U.clamp(vis * 1.4) : 1), gy); g.stroke();
    }
    g.restore();
  }

  // ---------- sheet border (drafting frame) ----------
  function sheet(g, x, y, w, h, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    const m = o.m == null ? 26 : o.m, m2 = m * 0.55;
    const per = 2 * (w + h) - 8 * (m - m2);
    // draw as one travelling pen around the rectangle (inner double border)
    const pts = [[x + m, y + m], [x + w - m, y + m], [x + w - m, y + h - m], [x + m, y + h - m], [x + m, y + m]];
    const pts2 = [[x + m2, y + m2], [x + w - m2, y + m2], [x + w - m2, y + h - m2], [x + m2, y + h - m2], [x + m2, y + m2]];
    stroke(g, pts, Object.assign({ w: 2.4 }, o, { prog }));
    stroke(g, pts2, Object.assign({ w: 1 }, o, { prog: U.range(prog, 0.25, 1), alpha: (o.alpha == null ? 1 : o.alpha) * 0.7 }));
  }

  // ---------- generic title block ----------
  // rows: [['TITLE','विषय'], ...]; drawn at (x,y) bottom-right, w×h. o: {prog, th, fs=20}
  function titleBlock(g, x, y, w, h, rows, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0 || !rows || !rows.length) return;
    const th = o.th;
    const ink = (th && th.ink) || '#fff', ink2 = (th && th.ink2) || 'rgba(255,255,255,.6)';
    const fs = o.fs == null ? 20 : o.fs;
    const nR = rows.length, rh = h / (nR + 1);
    const boxP = U.range(prog, 0, 0.4);
    if (boxP > 0) {
      g.save(); g.globalAlpha *= boxP;
      g.strokeStyle = ink; g.lineWidth = 2;
      g.strokeRect(x, y, w, h);
      g.lineWidth = 1; g.strokeStyle = ink2;
      g.beginPath();
      for (let i = 1; i <= nR; i++) { g.moveTo(x, y + i * rh); g.lineTo(x + w, y + i * rh); }
      g.moveTo(x + w * 0.34, y); g.lineTo(x + w * 0.34, y + h - rh); // label column
      g.stroke(); g.restore();
    }
    rows.forEach((row, i) => {
      const tp = stagger(U.range(prog, 0.3, 0.95), i, nR, 0.7);
      if (tp <= 0) return;
      const ry = y + h - (i + 1) * rh;
      text(g, x + 10, ry + rh * 0.62, row[0], { font: (th && th.fonts && th.fonts.mono) || 'mono', fs: fs * 0.62, color: ink2, alpha: U.range(tp, 0, 0.4), prog: U.range(tp, 0, 0.6) });
      text(g, x + w * 0.34 + 10, ry + rh * 0.62, row[1], { font: (th && th.fonts && th.fonts.label) || 'mukta', fs, color: ink, weight: 'bold', alpha: U.range(tp, 0.2, 0.6), prog: U.range(tp, 0.25, 1) });
    });
  }

  // ---------- moving dots along a path (pipelines: money/goods/water) ----------
  // o: {speed=220 px/s, r=7, color, gap=110 (px between dots), count, t (seconds), prog, maxAlpha, pulse}
  function dots(g, pts, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0 || !pts || pts.length < 2) return;
    const L = U.polyLen(pts);
    const speed = o.speed == null ? 220 : o.speed, gap = o.gap == null ? 110 : o.gap;
    const n = Math.max(1, Math.floor(L / gap));
    const t = o.t || 0;
    g.save();
    for (let i = 0; i < n; i++) {
      const d = ((t * speed + i * gap) % L + L) % L;
      const [px, py] = U.polyPoint(pts, d);
      const fade = Math.min(U.range(d, 0, 30), U.range(L - d, 0, 30), 1);
      const a = fade * (o.alpha == null ? 1 : o.alpha) * prog;
      if (a <= 0.01) continue;
      g.globalAlpha = a;
      if (o.pulse) { const k = 0.7 + 0.3 * Math.sin(t * 6 + i); g.beginPath(); g.arc(px, py, (o.r || 7) * k, 0, U.TAU); }
      else g.beginPath(); g.arc(px, py, o.r || 7, 0, U.TAU);
      if (o.glow) { g.shadowColor = o.color || '#ffd84a'; g.shadowBlur = (o.r || 7) * 2.2; }
      g.fillStyle = o.color || '#ffd84a'; g.fill(); g.shadowBlur = 0;
    }
    g.restore();
  }

  return { stagger, wobble, stroke, line, curve, curvePts, head, arrow, arrowCurve, cline, dim, hatch, text, labelBox, numbered, leader, grid, sheet, titleBlock, dots, polyTrimEnd };
})();
