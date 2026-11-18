// Hand-drawing renderer: takes traced strokes and draws them like a human hand —
// wobble, pressure taper, grainy pencil / charcoal / chalk / brush passes, plus the
// little pencil or nib that follows the stroke being drawn. All seeded, all canvas 2D.
SK.ink = (() => {
  const U = SK.util;

  // ---------- variable-width stroke as a filled outline ----------
  // pts: flat analysis-space [x0,y0,...]; k: device px per analysis px; opts:
  // {width, wobble, pressure, seed, color, alpha, style: ink|pencil|charcoal|chalk|brush|engrave, capRound}
  // upto: 0..1 fraction of the arc to draw (draw-on). Returns tip [x,y,angle] when partial.
  function stroke(g, pts, k, o) {
    const n = pts.length / 2;
    if (n < 2) return null;
    const upto = o.upto == null ? 1 : U.clamp(o.upto, 0.002, 1);
    const m = Math.max(2, Math.round(n * upto));
    const seed = o.seed || 0;
    const wob = (o.wobble || 0) * k * 0.85;      // wobble amplitude in device px
    const wf = 0.32;                              // wobble frequency (analysis space)
    const P = [];                                 // displaced points (device px)
    for (let i = 0; i < m; i++) {
      const x = pts[i * 2] * k, y = pts[i * 2 + 1] * k;
      if (wob > 0) {
        P.push(x + U.fbm2(pts[i * 2] * wf, pts[i * 2 + 1] * wf, seed, 3) * wob,
               y + U.fbm2(pts[i * 2] * wf + 31, pts[i * 2 + 1] * wf + 7, seed + 51, 3) * wob);
      } else P.push(x, y);
    }
    // arc lengths for taper + pressure
    const arc = [0];
    for (let i = 1; i < m; i++) arc.push(arc[i - 1] + Math.hypot(P[i * 2] - P[i * 2 - 2], P[i * 2 + 1] - P[i * 2 - 1]));
    const total = arc[m - 1] || 1;
    const pr = o.pressure == null ? 1 : o.pressure; // 0 = uniform drafting pen, 1 = full hand pressure
    const baseW = Math.max(0.75, (o.width || 2) * k * 0.75);
    const widths = [];
    for (let i = 0; i < m; i++) {
      const t = arc[i] / total;
      const taper = Math.min(1, Math.min(t, 1 - t) / 0.09 + 0.25) ** 0.8;           // ends thin
      const noise = pr > 0 ? 0.62 + 0.38 * (0.5 + 0.5 * U.noise1(t * 7.3 + seed * 0.13, seed)) : 1;
      widths.push(baseW * U.lerp(1, taper * noise, pr));
    }
    // build outline (offset by normal * width/2)
    const left = [], right = [];
    for (let i = 0; i < m; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(m - 1, i + 1);
      let dx = P[i1 * 2] - P[i0 * 2], dy = P[i1 * 2 + 1] - P[i0 * 2 + 1];
      const L = Math.hypot(dx, dy) || 1;
      dx /= L; dy /= L;
      const w = widths[i] / 2;
      left.push(P[i * 2] - dy * w, P[i * 2 + 1] + dx * w);
      right.push(P[i * 2] + dy * w, P[i * 2 + 1] - dx * w);
    }
    const style = o.style || 'ink';
    const passes = style === 'pencil' ? 2 : style === 'charcoal' ? 3 : style === 'chalk' ? 3 : style === 'brush' ? 1 : 1;
    const col = o.color || '#1c1a18';
    g.save();
    g.fillStyle = col;
    g.lineJoin = g.lineCap = 'round';
    for (let p = 0; p < passes; p++) {
      const j = passes > 1 ? (U.h1(p, seed + 5) - 0.5) * baseW * 0.8 : 0;
      const j2 = passes > 1 ? (U.h1(p, seed + 9) - 0.5) * baseW * 0.8 : 0;
      let alpha = o.alpha == null ? 1 : o.alpha;
      if (style === 'pencil') alpha *= p === 0 ? 0.72 : 0.5;
      if (style === 'charcoal') alpha *= p === 0 ? 0.62 : 0.42;
      if (style === 'chalk') alpha *= p === 0 ? 0.58 : 0.4;
      g.globalAlpha = U.clamp(alpha, 0, 1);
      g.beginPath();
      g.moveTo(left[0] + j, left[1] + j2);
      for (let i = 1; i < m; i++) g.lineTo(left[i * 2] + j, left[i * 2 + 1] + j2);
      if (style === 'brush') { // brush: rounded heel and a long taper — right side pulled toward the tip
        for (let i = m - 1; i >= 0; i--) {
          const t = i / (m - 1);
          const pull = (1 - t) * 0.15;
          g.lineTo(P[i * 2] + (right[i * 2] - P[i * 2]) * (1 - pull) + j, P[i * 2 + 1] + (right[i * 2 + 1] - P[i * 2 + 1]) * (1 - pull) + j2);
        }
      } else {
        for (let i = m - 1; i >= 0; i--) g.lineTo(right[i * 2] + j, right[i * 2 + 1] + j2);
      }
      g.closePath();
      g.fill();
      // round caps at both ends so short strokes don't look cut
      if (o.capRound !== false) {
        g.beginPath();
        g.arc(P[0], P[1], widths[0] / 2, 0, 7);
        g.arc(P[(m - 1) * 2], P[(m - 1) * 2 + 1], widths[m - 1] / 2, 0, 7);
        g.fill();
      }
    }
    g.restore();
    if (upto < 1) {
      const i = m - 1;
      const i0 = Math.max(0, i - 1);
      const ang = Math.atan2(P[i * 2 + 1] - P[i0 * 2 + 1], P[i * 2] - P[i0 * 2]);
      return [P[i * 2], P[i * 2 + 1], ang, widths[i]];
    }
    return null;
  }

  // straight hatch segments [x0,y0,x1,y1] with a wobble bend in the middle
  function seg(g, s, k, o) {
    const seed = o.seed || 0;
    const wob = (o.wobble || 0) * k * 0.9;
    const x0 = s[0] * k, y0 = s[1] * k, x1 = s[2] * k, y1 = s[3] * k;
    const mx = (x0 + x1) / 2 + U.fbm2(s[0] * 0.3, s[1] * 0.3, seed, 2) * wob;
    const my = (y0 + y1) / 2 + U.fbm2(s[0] * 0.3 + 9, s[1] * 0.3 + 4, seed + 3, 2) * wob;
    const w = Math.max(0.55, (o.width || 1.1) * k * 0.72 * U.lerp(1, 0.7 + 0.3 * U.h1(Math.round(s[0] + s[1]), seed), o.pressure == null ? 1 : o.pressure));
    g.strokeStyle = o.color || '#1c1a18';
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    g.globalAlpha = 1;
  }

  function stippleDot(g, p, k, o) {
    const wob = (o.wobble || 0) * k;
    const x = p.x * k + U.fbm2(p.x * 0.4, p.y * 0.4, o.seed || 1, 2) * wob;
    const y = p.y * k + U.fbm2(p.x * 0.4 + 5, p.y * 0.4 + 9, (o.seed || 1) + 7, 2) * wob;
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.fillStyle = o.color || '#1c1a18';
    g.beginPath(); g.arc(x, y, Math.max(0.5, p.r * k * 0.5 * (o.dotScale || 1)), 0, 7); g.fill();
    g.globalAlpha = 1;
  }

  // the pencil / pen nib that follows the current stroke
  function tool(g, x, y, ang, kind, scale, color) {
    g.save();
    g.translate(x, y); g.rotate(ang + Math.PI * 0.78); // tool leans back-left of the draw direction
    g.scale(scale, scale);
    if (kind === 'pencil') {
      g.fillStyle = '#d9a441'; U.rrect(g, -7, 3, 14, 34, 2.5); g.fill();       // hex body (yellow ochre)
      g.fillStyle = '#b9852f'; g.fillRect(-7, 8, 3.2, 29); g.fillRect(3.8, 8, 3.2, 29);
      g.fillStyle = '#e8c98d'; U.rrect(g, -7, -4, 14, 8, 2); g.fill();         // ferrule
      g.fillStyle = '#e8e4dc'; U.rrect(g, -7, 10, 14, 12, 2); g.fill();        // eraser
      g.fillStyle = '#2b241d';                                                // wood cone + tip
      g.beginPath(); g.moveTo(-7, 3); g.lineTo(7, 3); g.lineTo(1.6, -8); g.closePath(); g.fill();
      g.fillStyle = color || '#1c1a18';
      g.beginPath(); g.moveTo(-2.4, -1.5); g.lineTo(2.4, -1.5); g.lineTo(1.6, -8); g.lineTo(-1.6, -8); g.closePath(); g.fill();
    } else { // pen nib
      g.fillStyle = '#26303a'; U.rrect(g, -5, 2, 10, 30, 3); g.fill();
      g.fillStyle = '#c9ab6a';
      g.beginPath(); g.moveTo(-5, 2); g.lineTo(5, 2); g.lineTo(0.9, -9); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,45,20,.8)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(0, -7.5); g.lineTo(0, 0.5); g.stroke();
      g.fillStyle = color || '#101010';
      g.beginPath(); g.moveTo(-1.5, -3); g.lineTo(1.5, -3); g.lineTo(0.9, -9); g.lineTo(-0.9, -9); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ---------- finished-layer cache ----------
  // A fully-drawn sketch state (progress 1) is expensive; cache it by key so holds,
  // transitions and thumbnails reuse it. drawFn receives (g, W, H).
  const layers = new Map();
  function layer(key, W, H, drawFn) {
    const k = key + '|' + W + 'x' + H;
    let c = layers.get(k);
    if (c) return c;
    c = U.canvas(W, H);
    try { drawFn(c.getContext('2d'), W, H); } catch (e) { console.error('layer', key, e); }
    if (layers.size > 26) layers.clear();
    layers.set(k, c);
    return c;
  }

  // stroke orderings for the draw-on pass
  function orderStrokes(strokes, order, seed, focus) {
    const idx = strokes.map((s, i) => i);
    const fx = (focus ? focus[0] : 0.5), fy = (focus ? focus[1] : 0.5);
    if (order === 'top') idx.sort((a, b) => strokes[a].cy - strokes[b].cy);
    else if (order === 'big' || order === 'natural') idx.sort((a, b) => (strokes[b].len - strokes[a].len) || (strokes[a].cy - strokes[b].cy));
    else if (order === 'center' || order === 'subject') idx.sort((a, b) => {
      const da = Math.hypot(strokes[a].cx - fx, strokes[a].cy - fy), db = Math.hypot(strokes[b].cx - fx, strokes[b].cy - fy);
      return da - db || strokes[b].len - strokes[a].len;
    });
    else if (order === 'random') idx.sort((a, b) => (U.h1(a, seed + 3) * 0.74 + 0.26 * a / strokes.length) - (U.h1(b, seed + 3) * 0.74 + 0.26 * b / strokes.length));
    else if (order === 'left') idx.sort((a, b) => strokes[a].cx - strokes[b].cx);
    return idx;
  }
  // given a budget of "ink length" how far along the ordered stroke list we are.
  // returns {drawn: [[idx, upto], ...], tipStroke, tipUpto}
  function budget(strokes, order, q, seed, focus) {
    const idx = orderStrokes(strokes, order, seed, focus);
    const total = idx.reduce((a, i) => a + strokes[i].len, 0) || 1;
    let want = U.clamp(q) * total;
    const drawn = [];
    for (const i of idx) {
      const s = strokes[i];
      if (want <= 0) break;
      if (want >= s.len) { drawn.push([i, 1]); want -= s.len; }
      else { drawn.push([i, want / s.len]); break; }
    }
    return drawn;
  }

  return { stroke, seg, stippleDot, tool, layer, orderStrokes, budget };
})();
