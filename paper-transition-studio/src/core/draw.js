// Drawing primitives every effect shares: torn sheets with white fibre rims and soft shadows,
// curled flaps showing the paper's back, and texture-mapped triangles / quads.
PT.draw = (() => {
  const U = PT.util;

  function shadowFill(ctx, path, env, k = 1, rule = 'nonzero', off = null) {
    if (env.matte || env.shadow <= 0 || k <= 0) return;
    const S = env.S, FAR = 30000;
    // fill the shape far off-canvas and throw only its shadow back on screen,
    // so nothing dark shows where the paper itself is transparent or moved
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.5 * env.shadow * k})`;
    ctx.shadowBlur = S * 0.028 * Math.max(0.4, k);
    ctx.shadowOffsetX = (off ? off[0] : S * 0.006 * k) + FAR;
    ctx.shadowOffsetY = off ? off[1] : S * 0.011 * k;
    ctx.translate(-FAR, 0);
    ctx.fillStyle = '#000';
    ctx.fill(path, rule);
    ctx.restore();
  }

  // white torn core + darker contact line, drawn inside the sheet's clip
  function rim(ctx, path, env, k = 1) {
    if (env.matte || env.rim <= 0 || k <= 0) return;
    const w = env.S * 0.0042 * env.rim * k;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = (w + env.S * 0.0018) * 2; ctx.stroke(path);
    ctx.strokeStyle = env.rimColor || '#fbfaf7'; ctx.lineWidth = w * 2; ctx.stroke(path);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = w * 0.8; ctx.stroke(path);
  }
  // loose paper fibres poking out of a torn edge
  function fibres(ctx, pts, env, seed = 1, k = 1) {
    if (env.matte || env.rim <= 0 || pts.length < 3) return;
    const S = env.S, step = Math.max(1, Math.floor(pts.length / 260));
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(0.7, S * 0.0011);
    ctx.beginPath();
    for (let i = 1; i < pts.length - 1; i += step) {
      if (U.h1(i, seed) > 0.55) continue;
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i + 1], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L, len = S * 0.006 * env.rim * k * (0.3 + U.h1(i, seed + 3)), sgn = U.h1(i, seed + 5) > 0.5 ? 1 : -1;
      const [x, y] = pts[i];
      ctx.moveTo(x - nx * len * 0.3 * sgn, y - ny * len * 0.3 * sgn);
      ctx.lineTo(x + nx * len * sgn + dx / L * len * 0.3, y + ny * len * sgn + dy / L * len * 0.3);
    }
    ctx.stroke(); ctx.restore();
  }

  // A torn sheet: shadow onto what's below, the sheet's picture, then the torn rim.
  // polys: array of point lists (even-odd, so holes work). tf: optional source->dest matrix.
  function sheet(ctx, src, polys, env, o = {}) {
    const path = new Path2D();
    for (const pts of polys) path.addPath(U.pathFrom(pts));
    const rule = o.rule || 'evenodd';
    shadowFill(ctx, path, env, o.shadow == null ? 1 : o.shadow, rule, o.shadowOff);
    ctx.save();
    ctx.clip(path, rule);
    if (o.tf) ctx.transform(...o.tf);
    ctx.drawImage(src, 0, 0);
    if (o.tint) { ctx.fillStyle = o.tint; ctx.fillRect(-env.W, -env.H, env.W * 3, env.H * 3); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const edges = o.edges || polys;
    if (o.rim !== 0) {
      const ep = new Path2D();
      for (const e of edges) ep.addPath(U.pathFrom(e, o.closedEdges !== false && !o.edges));
      rim(ctx, ep, env, o.rim == null ? 1 : o.rim);
    }
    ctx.restore();
    if (o.fibres !== false && o.rim !== 0) edges.forEach((e, i) => fibres(ctx, e, env, (o.seed || 1) + i * 13, o.rim == null ? 1 : o.rim));
    return path;
  }

  // Curled flap showing the back of the paper. g0->g1 is the shading axis (fold -> free end).
  function flap(ctx, pts, env, g0, g1, o = {}) {
    if (pts.length < 3) return;
    const path = U.pathFrom(pts);
    if (env.matte) { ctx.fillStyle = env.matteA; ctx.fill(path); return; }
    shadowFill(ctx, path, env, o.shadow == null ? 0.8 : o.shadow);
    ctx.save(); ctx.clip(path);
    ctx.drawImage(o.back || env.backA, 0, 0);
    const gr = ctx.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
    const st = o.stops || [[0, 'rgba(0,0,0,0.30)'], [0.12, 'rgba(0,0,0,0.06)'], [0.38, 'rgba(255,255,255,0.28)'], [0.75, 'rgba(0,0,0,0.04)'], [1, 'rgba(0,0,0,0.20)']];
    for (const [s, c] of st) gr.addColorStop(U.clamp(s), c);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, env.W, env.H);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.max(1, env.S * 0.0012); ctx.stroke(path);
    ctx.restore();
  }

  // affine matrix mapping source triangle -> dest triangle
  function affine(s0, s1, s2, d0, d1, d2) {
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (Math.abs(den) < 1e-9) return null;
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    return [a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]];
  }
  function tri(ctx, img, s0, s1, s2, d0, d1, d2, shade = 0) {
    const m = affine(s0, s1, s2, d0, d1, d2);
    if (!m) return;
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = p => { const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * 0.8, p[1] + dy / L * 0.8]; };
    const e0 = grow(d0), e1 = grow(d1), e2 = grow(d2);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    if (shade) { ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${Math.min(0.6, shade)})` : `rgba(0,0,0,${Math.min(0.7, -shade)})`; }
    const minX = Math.max(0, Math.min(s0[0], s1[0], s2[0]) - 2), minY = Math.max(0, Math.min(s0[1], s1[1], s2[1]) - 2);
    const maxX = Math.min(img.width, Math.max(s0[0], s1[0], s2[0]) + 2), maxY = Math.min(img.height, Math.max(s0[1], s1[1], s2[1]) + 2);
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (maxX > minX && maxY > minY) ctx.drawImage(img, minX, minY, maxX - minX, maxY - minY, minX, minY, maxX - minX, maxY - minY);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (shade) ctx.fillRect(Math.min(e0[0], e1[0], e2[0]) - 2, Math.min(e0[1], e1[1], e2[1]) - 2, Math.max(e0[0], e1[0], e2[0]) - Math.min(e0[0], e1[0], e2[0]) + 4, Math.max(e0[1], e1[1], e2[1]) - Math.min(e0[1], e1[1], e2[1]) + 4);
    ctx.restore();
  }
  // texture a (projected) quad by subdividing; q = [tl, tr, br, bl]
  function quad(ctx, img, sx, sy, sw, sh, q, n = 6, shadeFn = null) {
    const P = (u, v) => {
      const top = [U.lerp(q[0][0], q[1][0], u), U.lerp(q[0][1], q[1][1], u)];
      const bot = [U.lerp(q[3][0], q[2][0], u), U.lerp(q[3][1], q[2][1], u)];
      return [U.lerp(top[0], bot[0], v), U.lerp(top[1], bot[1], v)];
    };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const s00 = [sx + sw * u0, sy + sh * v0], s10 = [sx + sw * u1, sy + sh * v0], s11 = [sx + sw * u1, sy + sh * v1], s01 = [sx + sw * u0, sy + sh * v1];
      const sh_ = shadeFn ? shadeFn((u0 + u1) / 2, (v0 + v1) / 2) : 0;
      tri(ctx, img, s00, s10, s11, P(u0, v0), P(u1, v0), P(u1, v1), sh_);
      tri(ctx, img, s00, s11, s01, P(u0, v0), P(u1, v1), P(u0, v1), sh_);
    }
  }
  // matrix for: rotate `ang` and translate (tx,ty) around (cx,cy) -> used to move torn pieces
  function moveTf(cx, cy, ang, tx, ty, sc = 1) {
    const c = Math.cos(ang) * sc, s = Math.sin(ang) * sc;
    return [c, s, -s, c, cx + tx - c * cx + s * cy, cy + ty - s * cx - c * cy];
  }
  // polygon covering the whole frame with margin
  const frame = (W, H, m = 0.2) => [[-W * m, -H * m], [W * (1 + m), -H * m], [W * (1 + m), H * (1 + m)], [-W * m, H * (1 + m)]];

  return { shadowFill, rim, fibres, sheet, flap, tri, quad, affine, moveTf, frame };
})();
