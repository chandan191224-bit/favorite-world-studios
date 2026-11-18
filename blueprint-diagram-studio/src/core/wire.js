// Minimal 3D wireframe: meshes (box, cylinder, extrusion of any 2D silhouette) rotated on a
// turntable with tilt, perspective projection, and a hidden-line fade (far edges dimmed).
// Deterministic; no WebGL needed — this is a drawing look, not a renderer.
BD.wire = (() => {
  const U = BD.util;

  function mesh(v, e) { return { v, e }; } // v: [[x,y,z]], e: [[i,j]]

  function box(w, h, d) {
    const x = w / 2, y = h / 2, z = d / 2;
    const v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    return mesh(v, e);
  }
  function cylinder(r, h, n = 18) {
    const v = [], e = [], hy = h / 2;
    for (let i = 0; i < n; i++) {
      const a = i / n * U.TAU;
      v.push([Math.cos(a) * r, -hy, Math.sin(a) * r]);
    }
    for (let i = 0; i < n; i++) {
      const a = i / n * U.TAU;
      v.push([Math.cos(a) * r, hy, Math.sin(a) * r]);
    }
    v.push([0, -hy, 0], [0, hy, 0]); // centres
    for (let i = 0; i < n; i++) { e.push([i, (i + 1) % n], [n + i, n + (i + 1) % n], [i, n + i]); }
    e.push([2 * n, (2 * n + 1)]);
    return mesh(v, e);
  }
  // extrude a closed 2D profile (points in XY, 0..1000-ish) along Z by depth; profile is centred.
  // Long profiles get subsampled connectors so dense arcs don't turn into a "blur band".
  function extrude(profile, depth) {
    // centre + scale the profile to a sensible size
    let mx = 0, my = 0;
    profile.forEach(p => { mx += p[0]; my += p[1]; });
    mx /= profile.length; my /= profile.length;
    let R = 0;
    profile.forEach(p => { R = Math.max(R, Math.hypot(p[0] - mx, p[1] - my)); });
    const k = R > 0 ? 250 / R : 1;
    const pts = profile.map(p => [(p[0] - mx) * k, (p[1] - my) * k]);
    const dz = depth / 2;
    const v = pts.map(p => [p[0], p[1], -dz]).concat(pts.map(p => [p[0], p[1], dz]));
    const n = pts.length, e = [];
    for (let i = 0; i < n; i++) {
      e.push([i, (i + 1) % n], [n + i, n + (i + 1) % n]);
    }
    // connectors only every few vertices (plus the ends) so curves stay readable
    const step = Math.max(1, Math.round(n / 10));
    for (let i = 0; i < n; i += step) e.push([i, n + i]);
    if ((n - 1) % step !== 0) e.push([n - 1, 2 * n - 1]);
    return mesh(v, e);
  }
  // gear-ish disc with a hub ring for the mechanism look
  function disc(r, h) { return cylinder(r, h, 22); }

  // lathe: revolve a silhouette outline around its vertical centre axis -> a real 3D wireframe
  // (rings at several heights + vertical connectors) so domes/towers/rockets read as volumes.
  function lathe(outline, rings = 16, seg = 20) {
    let minY = 1e9, maxY = -1e9, cx = 0;
    outline.forEach(p => { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; cx += p[0]; });
    cx /= outline.length;
    // radius per height (max horizontal extent of the outline crossing that height)
    const prof = [];
    for (let i = 0; i < rings; i++) {
      const y = minY + (maxY - minY) * i / (rings - 1);
      let r = 0;
      for (let j = 0; j < outline.length; j++) {
        const a = outline[j], b = outline[(j + 1) % outline.length];
        if ((a[1] <= y) !== (b[1] <= y)) {
          const t = (y - a[1]) / (b[1] - a[1]);
          const x = a[0] + t * (b[0] - a[0]);
          r = Math.max(r, Math.abs(x - cx));
        }
      }
      prof.push([r, y]);
    }
    const H = maxY - minY || 1;
    const ky = 480 / H; // world height ~480
    const kx = 480 / H; // keep proportions from the outline (x in the same units)
    const v = [], e = [];
    for (let i = 0; i < rings; i++) {
      const y = (prof[i][1] - (minY + maxY) / 2) * ky, r = Math.max(6, prof[i][0] * kx);
      for (let j = 0; j < seg; j++) {
        const a = j / seg * U.TAU;
        v.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) e.push([i * seg + j, i * seg + (j + 1) % seg]);
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j += 2) e.push([i * seg + j, (i + 1) * seg + j]);
    return mesh(v, e);
  }

  // rotate Y then X; returns projected points + per-edge depth
  function project(m, rotY, rotX, cx, cy, scale, persp = 1400) {
    const cy1 = Math.cos(rotY), sy1 = Math.sin(rotY), cx1 = Math.cos(rotX), sx1 = Math.sin(rotX);
    const pts = m.v.map(([x, y, z]) => {
      // rotate around Y
      let X = x * cy1 + z * sy1, Z = -x * sy1 + z * cy1, Y = y;
      // rotate around X
      const Y2 = Y * cx1 - Z * sx1; Z = Y * sx1 + Z * cx1; Y = Y2;
      const f = persp / Math.max(120, persp + Z);
      return [cx + X * scale * f, cy + Y * scale * f, Z];
    });
    return pts;
  }

  // o: {color, w, prog (1 = all edges), fade=0.28, dots=false, glow, seed, t, boil, order ('spin' sorts edges by angle)}
  function draw(g, m, rotY, rotX, cx, cy, scale, o = {}) {
    const prog = U.clamp(o.prog == null ? 1 : o.prog);
    if (prog <= 0) return;
    const pts = project(m, rotY, rotX, cx, cy, scale, o.persp);
    // depth range for the fade
    let zmin = 1e9, zmax = -1e9;
    for (const p of pts) { if (p[2] < zmin) zmin = p[2]; if (p[2] > zmax) zmax = p[2]; }
    const zr = Math.max(1e-6, zmax - zmin);
    let edges = m.e;
    if (o.order === 'spin') edges = m.e.slice().sort((a, b) => ((pts[a[0]][0] + pts[a[1]][0]) - (pts[b[0]][0] + pts[b[1]][0])));
    const n = edges.length;
    for (let i = 0; i < n; i++) {
      const ep = BD.draw.stagger(prog, i, n, o.spin == null ? 0.9 : o.spin);
      if (ep <= 0) continue;
      const [a, b] = edges[i];
      const A = pts[a], B = pts[b];
      const z = (A[2] + B[2]) / 2;
      const fadeK = U.lerp(1, o.fade == null ? 0.28 : o.fade, U.clamp((z - zmin) / zr));
      const w = (o.w == null ? 2.4 : o.w) * U.lerp(0.65, 1, 1 - U.clamp((z - zmin) / zr));
      BD.draw.stroke(g, [[A[0], A[1]], [B[0], B[1]]], { w, color: o.color, alpha: fadeK, prog: ep, glow: o.glow ? 0.8 : 0 });
    }
    if (o.dots) {
      const dp = U.range(prog, 0.75, 1);
      if (dp > 0) {
        g.save(); g.globalAlpha *= dp;
        g.fillStyle = o.color || '#fff';
        if (o.glow) { g.shadowColor = o.color || '#fff'; g.shadowBlur = 6; }
        for (const p of pts) { const fadeK = U.lerp(1, (o.fade == null ? 0.28 : o.fade) + 0.15, U.clamp((p[2] - zmin) / zr)); g.globalAlpha = dp * fadeK; g.beginPath(); g.arc(p[0], p[1], Math.max(1.6, (o.w || 2.4) * 0.9), 0, U.TAU); g.fill(); }
        g.restore();
      }
    }
    return pts;
  }

  return { mesh, box, cylinder, extrude, disc, lathe, project, draw };
})();
