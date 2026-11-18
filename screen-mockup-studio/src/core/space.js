// Tiny deterministic 3D for Canvas 2D: a look-at camera, convex extruded slabs (device bodies) with backface culling and
// lambert + specular shading, and a perspective-correct-enough textured quad (subdivided affine triangles) for screens.
SM.space = (() => {
  const U = SM.util;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const D = Math.PI / 180;

  // 3x3 rotation matrices, row-major
  const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function mm(A, B) {
    const C = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return C;
  }
  const ap = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
  // model transform {R, T}: world = R * local + T
  const xf = (R = I3, T = [0, 0, 0]) => ({ R, T });
  const chain = (P, C) => ({ R: mm(P.R, C.R), T: add(ap(P.R, C.T), P.T) });
  const tp = (M, p) => add(ap(M.R, p), M.T);

  // look-at camera. o: { W, H, fov (deg, vertical), target, dist, yaw, pitch, roll (deg), shiftX, shiftY (px) }
  function camera(o) {
    const yaw = (o.yaw || 0) * D, pitch = (o.pitch || 0) * D, roll = (o.roll || 0) * D;
    const T = o.target || [0, 0, 0], d = o.dist;
    const pos = add(T, [Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d]);
    const f = norm(sub(T, pos));
    let r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll); [r, u] = [add(mul(r, c), mul(u, s)), add(mul(u, c), mul(r, -s))]; }
    const focal = (o.H / 2) / Math.tan((o.fov || 30) * D / 2);
    const cx = o.W / 2 + (o.shiftX || 0), cy = o.H / 2 + (o.shiftY || 0);
    const project = p => {
      const q = sub(p, pos), z = Math.max(1e-3, dot(q, f));
      return [cx + dot(q, r) * focal / z, cy - dot(q, u) * focal / z, z];
    };
    return { pos, f, r, u, focal, W: o.W, H: o.H, project };
  }

  // rounded-rectangle outline (local xy, y up), counter-clockwise seen from +z
  function outline(w, h, r, seg = 6, cx = 0, cy = 0) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const pts = [], corners = [[w / 2 - r, -h / 2 + r, -90], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180]];
    for (const [x, y, a0] of corners) {
      if (r <= 0) { pts.push([cx + x, cy + y]); continue; }
      for (let i = 0; i <= seg; i++) { const a = (a0 + 90 * i / seg) * D; pts.push([cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r]); }
    }
    return pts;
  }
  function circle(rad, n = 18, cx = 0, cy = 0) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } return p; }

  const LIGHT = norm([-0.45, 0.75, 0.55]);
  // shade a base colour for a world normal n seen from direction v (towards the camera)
  function shadeColor(base, n, v, mat) {
    const lam = Math.max(0, dot(n, LIGHT));
    let c = U.mix('#000000', base, (mat.amb == null ? 0.38 : mat.amb) + (1 - (mat.amb == null ? 0.38 : mat.amb)) * lam);
    const gl = mat.gloss || 0;
    if (gl > 0) {
      const h = norm(add(LIGHT, v)), sp = Math.pow(Math.max(0, dot(n, h)), 6 + gl * 40) * gl;
      c = U.mix(c, '#ffffff', U.clamp(sp * 0.85));
    }
    return c;
  }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }

  // Draw a convex extruded slab. part = { M, pts (outline), z0, z1, mat: { front, back, side, gloss, amb, rim } }
  // Returns the projected front outline when the front is visible (for screens / decals).
  function slab(g, cam, part) {
    const { M, pts, z0, z1, mat } = part;
    const F = pts.map(p => tp(M, [p[0], p[1], z1])), B = pts.map(p => tp(M, [p[0], p[1], z0]));
    const PF = F.map(cam.project), PB = B.map(cam.project);
    const nF = ap(M.R, [0, 0, 1]), nB = mul(nF, -1);
    const vis = (n, q) => dot(n, sub(cam.pos, q)) > 0;
    const view = q => norm(sub(cam.pos, q));
    const out = {};
    if (z1 > z0 && vis(nB, B[0])) { g.fillStyle = shadeColor(mat.back || mat.side, nB, view(B[0]), mat); poly(g, PB); g.fill(); out.back = PB; }
    if (z1 > z0) {
      const n = pts.length;
      g.lineJoin = 'round'; g.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1];
        const nl = norm([ey, -ex, 0]), nw = ap(M.R, nl);
        if (!vis(nw, F[i])) continue;
        const c = shadeColor(mat.side, nw, view(F[i]), mat);
        g.fillStyle = c; g.strokeStyle = c;
        poly(g, [PF[i], PF[j], PB[j], PB[i]]); g.fill(); g.stroke();
      }
    }
    if (vis(nF, F[0])) {
      g.fillStyle = shadeColor(mat.front, nF, view(F[0]), mat); poly(g, PF); g.fill();
      if (mat.rim) { g.strokeStyle = mat.rim; g.lineWidth = Math.max(0.6, (mat.rimW || 1) * cam.focal / dot(sub(F[0], cam.pos), cam.f) * 0.9); poly(g, PF); g.stroke(); }
      out.front = PF;
    }
    return out;
  }
  // flat decal polygon on a plane (only if facing camera)
  function decal(g, cam, M, pts, z, fill, faceN = [0, 0, 1]) {
    const W = pts.map(p => tp(M, [p[0], p[1], z])), n = ap(M.R, faceN);
    if (dot(n, sub(cam.pos, W[0])) <= 0) return null;
    const P = W.map(cam.project);
    g.fillStyle = fill; poly(g, P); g.fill();
    return P;
  }
  const depthOf = (cam, M, p = [0, 0, 0]) => dot(sub(tp(M, p), cam.pos), cam.f);

  // affine-textured triangle: source points s0..s2 (image px) -> dest d0..d2 (canvas px)
  function texTri(g, img, s0, s1, s2, d0, d1, d2) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const ex = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; };
    const a0 = ex(d0), a1 = ex(d1), a2 = ex(d2);
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (Math.abs(den) < 1e-9) return;
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
    g.save();
    g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.closePath(); g.clip();
    g.transform(a, b, c, d, e, f);
    const iw = img.width, ih = img.height;
    const x0 = Math.max(0, Math.floor(Math.min(s0[0], s1[0], s2[0]) - 2)), y0 = Math.max(0, Math.floor(Math.min(s0[1], s1[1], s2[1]) - 2));
    const x1 = Math.min(iw, Math.ceil(Math.max(s0[0], s1[0], s2[0]) + 2)), y1 = Math.min(ih, Math.ceil(Math.max(s0[1], s1[1], s2[1]) + 2));
    if (x1 > x0 && y1 > y0) g.drawImage(img, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    g.restore();
  }

  // Map an image onto a surface. map(u, v) -> world point (u, v in 0..1, v down). n x m cells chosen from perspective.
  function texSurface(g, cam, img, map, cells) {
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => cam.project(map(u, v)));
    let n = cells;
    if (!n) {
      const zs = corners.map(c => c[2]), ratio = Math.max(...zs) / Math.min(...zs);
      n = U.clamp(Math.round(1 + (ratio - 1) * 60), 1, 14);
    }
    const m = n, iw = img.width, ih = img.height;
    const grid = [];
    for (let j = 0; j <= m; j++) { const row = []; for (let i = 0; i <= n; i++) row.push(cam.project(map(i / n, j / m))); grid.push(row); }
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const s00 = [i / n * iw, j / m * ih], s10 = [(i + 1) / n * iw, j / m * ih], s11 = [(i + 1) / n * iw, (j + 1) / m * ih], s01 = [i / n * iw, (j + 1) / m * ih];
      texTri(g, img, s00, s10, s11, grid[j][i], grid[j][i + 1], grid[j + 1][i + 1]);
      texTri(g, img, s00, s11, s01, grid[j][i], grid[j + 1][i + 1], grid[j + 1][i]);
    }
    return { corners, grid };
  }

  return { add, sub, mul, dot, cross, norm, D, rotX, rotY, rotZ, I3, mm, ap, xf, chain, tp, camera, outline, circle, slab, decal, poly, depthOf, texSurface, shadeColor, LIGHT };
})();
