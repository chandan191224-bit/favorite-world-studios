// FAMILY 9 — Mechanisms: simple looping machines — meshing gears (true ratio), piston/crank
// (true slider-crank kinematics), conveyor, pulley, pendulum, valve, turbine — so a "how it
// works" line can be shown. Strokes draw on first, then the machine runs in a seamless loop.
BD.fx.register({
  id: 'mech', name: 'Mechanism loop', fam: 'Mechanisms',
  note: 'गियर, पिस्टन, कन्वेयर, पुली, पेंडुलम, वाल्व, टर्बाइन — पहले खिचते हैं, फिर बिना रुके घूमते हैं। Gears, piston, conveyor, pulley, pendulum, valve, turbine: draw on, then loop seamlessly.',
  dur: 9,
  fields: [
    { k: 'title', label: 'Title', def: 'यह कैसे काम करता है' },
    { k: 'sub', label: 'Sub note', def: 'MECHANISM' },
    { k: 'labels', label: 'Labels (one per line)', multi: true, def: 'संचालित गियर | DRIVER\nअनुगामी गियर | DRIVEN' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'chalk', sec: 'style' },
    { k: 'kind', label: 'Machine', type: 'select', options: () => [
      ['gears', 'Meshing gears'], ['piston', 'Piston / crank'], ['conveyor', 'Conveyor belt'], ['pulley', 'Pulley'],
      ['pendulum', 'Pendulum'], ['valve', 'Valve'], ['turbine', 'Turbine'],
    ], def: 'gears', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'speed', label: 'Run speed', type: 'range', min: 0.3, max: 2.5, step: 0.05, def: 1, sec: 'anim' },
    { k: 'drawFrac', label: 'Draw-on portion', type: 'range', min: 0.15, max: 0.6, step: 0.05, def: 0.3, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.5, sec: 'anim' },
    { k: 'labelsOn', label: 'Labels', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 38, step: 1, def: 26, sec: 'labels' },
    { k: 'arrowsOn', label: 'Rotation arrows', type: 'check', def: true, sec: 'labels' },
  ],
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text, SH = BD.shapes;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp(1 - (p.hold || 1.5) / dur, 0.5, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const fs = p.labelSize || 26;
    const drawP = U.range(pr, 0.05, p.drawFrac || 0.3); // machine drawn
    const run = U.range(pr, (p.drawFrac || 0.3) * 0.6, (p.drawFrac || 0.3)); // motion ramped in
    const spd = (p.speed || 1);
    const t = lt * run; // motion time (frozen until drawn)

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.08), minor: 96, major: 480 });
    }

    const labels = T.lines(f.labels);
    const ink = th.ink, ink2 = th.ink2;
    const st = (pts, prog, w, color, dash) => D.stroke(g, pts, { w: (w || 2.6) * LW, color: color || ink, prog, dash, boil: th.wobble, seed: env.seed, t: lt, glow: th.glow ? 0.5 : 0 });

    if (p.kind === 'gears') {
      // two meshing gears, correct ratio: wA * rA = -wB * rB
      const rA = 170, rB = 116, cx = -60, cy = fh * 0.02;
      const nA = 14, nB = 10; // teeth
      const ax = cx - rA - 14, ay = cy;      // driver centre
      const bx = cx + rB + 14, by = cy;      // driven centre
      const wA = 0.9 * spd * (drawP >= 1 ? 1 : 0); // start still while drawing
      const angA = t * 0.9 * spd, angB = -angA * nA / nB;
      const gear = (gx, gy, r, n, ang, prog) => {
        const pts = SH.gearTeeth(0, 0, r, n, 20).map(q => [gx + Math.cos(ang) * q[0] - Math.sin(ang) * q[1], gy + Math.sin(ang) * q[0] + Math.cos(ang) * q[1]]);
        st(pts, prog, 2.8);
        // rim + hub + spokes rotate too
        const rot = (pts0, rr) => SH.circ(0, 0, rr).map(q => [gx + Math.cos(ang) * q[0] - Math.sin(ang) * q[1], gy + Math.sin(ang) * q[0] + Math.cos(ang) * q[1]]);
        st(rot(0, r * 0.82), U.range(prog, 0.4, 0.9), 1.6, ink2);
        st(rot(0, r * 0.3), prog, 2);
        for (let k = 0; k < 4; k++) {
          const a = ang + k * Math.PI / 2;
          st([[gx + Math.cos(a) * r * 0.3, gy + Math.sin(a) * r * 0.3], [gx + Math.cos(a) * r * 0.8, gy + Math.sin(a) * r * 0.8]], U.range(prog, 0.5, 1), 1.4, ink2);
        }
        // centre cross (fixed)
        st([[gx - 30, gy], [gx + 30, gy]], prog, 1.2, ink2, [12, 6, 3, 6]);
        st([[gx, gy - 30], [gx, gy + 30]], prog, 1.2, ink2, [12, 6, 3, 6]);
      };
      gear(ax, ay, rA, nA, angA, drawP);
      gear(bx, by, rB, nB, angB, U.range(pr, 0.15, p.drawFrac + 0.12));
      // rotation arrows
      if (p.arrowsOn !== false) {
        const ap = U.range(pr, 0.45, 0.7);
        const arcArrow = (gx, gy, r, a0, a1, ccw) => {
          const pts = [];
          for (let k = 0; k <= 20; k++) { const a = U.lerp(a0, a1, k / 20); pts.push([gx + Math.cos(a) * r, gy + Math.sin(a) * r]); }
          D.arrowCurve(g, pts, { w: 2.6 * LW, color: th.accent, prog: ap, headS: 16 * LW, trim: 14 });
        };
        arcArrow(ax, ay, rA + 74, -2.2, -1.4);
        arcArrow(bx, by, rB + 74, 1.0, 1.8);
      }
      if (p.labelsOn !== false && labels.length >= 2) {
        const lp = U.range(pr, 0.5, 0.8);
        D.leader(g, ax, ay - rA * 0.5, -fw / 2 + 80, ay - rA - 40, { text: labels[0], sub: labels[1], prog: lp, th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
        if (labels.length >= 4) D.leader(g, bx, by - rB * 0.5, fw / 2 - 80, by - rB - 40, { text: labels[2], sub: labels[3], prog: U.range(pr, 0.58, 0.88), th, fs, side: 'right', color: th.dim, marker: 'dot', seed: env.seed + 5, t: lt });
      }
    } else if (p.kind === 'piston') {
      // true slider-crank: piston x = r cos θ + sqrt(l² − r² sin²θ)
      const cx = -fw * 0.05, cy = fh * 0.06, r = 110, l = 300, th2 = t * 2.2 * spd;
      const px = cx + r * Math.cos(th2) + Math.sqrt(Math.max(0, l * l - r * r * Math.sin(th2) ** 2));
      const py = cy;
      // cylinder
      st([[cx + l - 60, cy - 90], [cx + l + 250, cy - 90]], drawP, 2.8);
      st([[cx + l - 60, cy + 90], [cx + l + 250, cy + 90]], U.range(pr, 0.08, p.drawFrac + 0.05), 2.8);
      // crank circle + web
      st(SH.circ(cx, cy, r).map(q => [q[0], q[1]]), drawP, 2, ink2, [16, 10]);
      const crankEnd = [cx + r * Math.cos(th2), cy + r * Math.sin(th2)];
      st([[cx - r * 0.32, cy - r * 0.32], crankEnd, [cx + r * 0.32, cy + r * 0.32]], 1, 3, ink);
      // connecting rod
      st([crankEnd, [px - 60, py]], 1, 3);
      // piston (box that moves)
      st([[px - 60, py - 66], [px + 60, py - 66], [px + 60, py + 66], [px - 60, py + 66], [px - 60, py - 66]], 1, 3);
      for (let k = 0; k < 3; k++) st([[px - 44 + k * 44, py - 66], [px - 44 + k * 44, py + 66]], 1, 1.6, ink2);
      // spark/valve hint at top
      st([[cx + l + 90, cy - 90], [cx + l + 90, cy - 140], [cx + l + 150, cy - 140], [cx + l + 150, cy - 90]], U.range(pr, 0.2, p.drawFrac + 0.1), 2.2);
      // labels
      if (p.labelsOn !== false && labels.length >= 2) {
        const lp = U.range(pr, 0.5, 0.8);
        D.leader(g, px, py, fw / 2 - 80, cy - 160, { text: labels[0], sub: labels[1], prog: lp, th, fs, side: 'right', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
        if (labels.length >= 4) D.leader(g, cx, cy, -fw / 2 + 80, cy + 150, { text: labels[2], sub: labels[3], prog: U.range(pr, 0.58, 0.88), th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 7, t: lt });
      }
    } else if (p.kind === 'conveyor') {
      const y = fh * 0.06, x0 = -fw * 0.3, x1 = fw * 0.3, r = 56;
      // belt loop
      st([[x0, y - r], [x1, y - r], [x1 + r * 0.0, y - r]], 0);
      st([[x0 + r, y - r], [x1 - r, y - r]], drawP, 3);
      st([[x0 - r, y], [x1 + r, y]], U.range(pr, 0.1, p.drawFrac + 0.1), 3);
      st(SH.arc(x1, y - r + 0, r, r, -Math.PI / 2, Math.PI / 2).map(q => [q[0], q[1] + r]), U.range(pr, 0.2, p.drawFrac + 0.15), 3);
      st(SH.arc(x0, y, r, r, Math.PI / 2, Math.PI * 1.5), U.range(pr, 0.25, p.drawFrac + 0.2), 3);
      // rollers
      [x0, x1].forEach((rx, i) => {
        const ang = t * 2 * spd * (i === 0 ? 1 : 1);
        st(SH.circ(rx, y - r + r, r * 0.35).map(q => [rx + Math.cos(ang) * (q[0] - rx) - Math.sin(ang) * (q[1] - (y)), (y) + Math.sin(ang) * (q[0] - rx) + Math.cos(ang) * (q[1] - (y))]), 1, 2);
      });
      // items on the belt
      const beltLen = (x1 - x0 - 2 * r) + Math.PI * r;
      for (let i = 0; i < 4; i++) {
        const d = ((t * 170 * spd + i * (beltLen / 4)) % beltLen + beltLen) % beltLen;
        const flat = x1 - x0 - 2 * r;
        let ix, iy;
        if (d < flat) { ix = x0 + r + d; iy = y - r - 34; }
        else { const a = -Math.PI / 2 + (d - flat) / r; ix = x1 + Math.cos(a) * r; iy = y + Math.sin(a) * r - 34 - 0; }
        st([[ix - 26, iy], [ix + 26, iy], [ix + 26, iy + 34], [ix - 26, iy + 34], [ix - 26, iy]], 1, 2.4, th.accent);
      }
      // legs
      st([[x0 + r, y], [x0 + r - 26, y + 190]], U.range(pr, 0.2, p.drawFrac + 0.1), 2.2, ink2);
      st([[x1 - r, y], [x1 - r + 26, y + 190]], U.range(pr, 0.22, p.drawFrac + 0.12), 2.2, ink2);
      st([[x0 + r - 44, y + 190], [x1 - r + 44, y + 190]], U.range(pr, 0.24, p.drawFrac + 0.14), 2.6);
      if (p.labelsOn !== false && labels.length >= 2) {
        D.leader(g, x0 + r + 120, y - r, -fw / 2 + 80, y - 190, { text: labels[0], sub: labels[1], prog: U.range(pr, 0.5, 0.8), th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
      }
    } else if (p.kind === 'pulley') {
      const r1 = 90, r2 = 60, x0 = -fw * 0.16, x1 = fw * 0.2, y1 = -fh * 0.14, y2 = fh * 0.1;
      const ang1 = t * 1.1 * spd, ang2 = -ang1 * r1 / r2;
      const wheel = (cx2, cy2, r, ang, prog) => {
        st(SH.circ(cx2, cy2, r).map(q => [cx2 + Math.cos(ang) * (q[0] - cx2) - Math.sin(ang) * (q[1] - cy2), cy2 + Math.sin(ang) * (q[0] - cx2) + Math.cos(ang) * (q[1] - cy2)]), prog, 3);
        st(SH.circ(cx2, cy2, r * 0.22).map(q => [cx2 + q[0], cy2 + q[1]]), prog, 2);
        const a = ang;
        st([[cx2 + Math.cos(a) * r * 0.24, cy2 + Math.sin(a) * r * 0.24], [cx2 + Math.cos(a) * r * 0.92, cy2 + Math.sin(a) * r * 0.92]], 1, 1.6, ink2);
      };
      wheel(x0, y1, r1, ang1, drawP);
      wheel(x1, y2, r2, ang2, U.range(pr, 0.15, p.drawFrac + 0.1));
      // belt (tangent lines)
      const dx = x1 - x0, dy = y2 - y1, D2 = Math.hypot(dx, dy), rD = r1 - r2;
      const a = Math.acos(U.clamp(rD / D2, -1, 1));
      const base = Math.atan2(dy, dx);
      const t1 = base + a + Math.PI / 2, t2 = base - a + Math.PI / 2;
      st([[x0 + Math.cos(t1) * r1, y1 + Math.sin(t1) * r1], [x1 + Math.cos(t1) * r2, y2 + Math.sin(t1) * r2]], drawP, 2.4, ink);
      st([[x0 + Math.cos(t2) * r1, y1 + Math.sin(t2) * r1], [x1 + Math.cos(t2) * r2, y2 + Math.sin(t2) * r2]], U.range(pr, 0.12, p.drawFrac + 0.08), 2.4, ink);
      // moving dots on the belt
      const belt = [[x0 + Math.cos(t1) * r1, y1 + Math.sin(t1) * r1], [x1 + Math.cos(t1) * r2, y2 + Math.sin(t1) * r2]];
      D.dots(g, belt, { speed: 150 * spd, r: 7, color: th.accent, gap: 90, t: lt, prog: U.range(pr, 0.35, 0.55) });
      // hanging weight on the big wheel rope
      const ra = ang1 + Math.PI / 2;
      const wxx = x0 + Math.cos(ra) * (r1 + 20), wyy = y1 + Math.sin(ra) * (r1 + 20);
      if (run > 0.5) {
        st([[wxx, wyy], [wxx, wyy + 120]], 1, 1.6, ink2);
        st([[wxx - 34, wyy + 120], [wxx + 34, wyy + 120], [wxx + 34, wyy + 170], [wxx - 34, wyy + 170], [wxx - 34, wyy + 120]], 1, 2.4, th.accent);
      }
      if (p.labelsOn !== false && labels.length >= 2) {
        D.leader(g, x0, y1, -fw / 2 + 80, y1 - 90, { text: labels[0], sub: labels[1], prog: U.range(pr, 0.5, 0.8), th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
      }
    } else if (p.kind === 'pendulum') {
      const cx = 0, cy = -fh * 0.26, L = fh * 0.56;
      const amp = 0.42, T = 2.6 / spd;
      const ang = amp * Math.sin(U.TAU * t / T);
      const bx = cx + Math.sin(ang) * L, by = cy + Math.cos(ang) * L;
      // mount
      st([[cx - 90, cy], [cx + 90, cy]], drawP, 3.4);
      st(SH.circ(cx, cy, 16).map(q => [cx + q[0], cy + q[1]]), drawP, 2);
      for (let k = 0; k < 5; k++) st([[cx - 70 + k * 35, cy], [cx - 84 + k * 35, cy - 26]], U.range(pr, 0.1 + k * 0.02, p.drawFrac + 0.1), 1.8, ink2);
      // rod + bob
      st([[cx, cy], [bx, by]], 1, 2.6);
      st(SH.circ(bx, by, 54).map(q => [bx + q[0], by + q[1]]), 1, 3, th.accent);
      st(SH.circ(bx, by, 10).map(q => [bx + q[0], by + q[1]]), 1, 1.6, ink2);
      // arc guide
      st(SH.arc(cx, cy, L, L, Math.PI / 2 - amp, Math.PI / 2 + amp, 30).map(q => [cx + q[0] - cx + cx, q[1]]).map(q => [q[0], q[1]]), U.range(pr, 0.3, p.drawFrac + 0.2), 1.6, ink2, [14, 10]);
      if (p.labelsOn !== false && labels.length >= 2) {
        D.leader(g, bx, by, fw / 2 - 80, by, { text: labels[0], sub: labels[1], prog: U.range(pr, 0.5, 0.8), th, fs, side: 'right', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
      }
    } else if (p.kind === 'valve') {
      // globe valve: seat opens/closes with a sinusoidal lift; flow dots pass when open
      const cx = 0, cy = fh * 0.05, bw = 200;
      const lift = 0.5 + 0.5 * Math.sin(t * 1.6 * spd); // 0..1
      const open = U.clamp(lift * 2 - 0.4);
      // pipe flanges
      st([[-fw * 0.36, cy - 60], [-bw / 2, cy - 60]], drawP, 3);
      st([[-fw * 0.36, cy + 60], [-bw / 2, cy + 60]], U.range(pr, 0.08, p.drawFrac + 0.05), 3);
      st([[bw / 2, cy - 60], [fw * 0.36, cy - 60]], U.range(pr, 0.1, p.drawFrac + 0.08), 3);
      st([[bw / 2, cy + 60], [fw * 0.36, cy + 60]], U.range(pr, 0.12, p.drawFrac + 0.1), 3);
      st([[-bw / 2 - 16, cy - 84], [-bw / 2 - 16, cy + 84]], drawP, 2.2);
      st([[bw / 2 + 16, cy - 84], [bw / 2 + 16, cy + 84]], U.range(pr, 0.12, p.drawFrac + 0.1), 2.2);
      // body
      st([[-bw / 2, cy - 60], [-bw * 0.28, cy - 130], [bw * 0.28, cy - 130], [bw / 2, cy - 60]], drawP, 3);
      st([[-bw / 2, cy + 60], [bw / 2, cy + 60]], U.range(pr, 0.15, p.drawFrac + 0.12), 3);
      // stem + handwheel moves up/down with the lift
      const stemY = cy - 130 - 90 - lift * 60;
      st([[0, stemY], [0, cy - 20 - lift * 60]], 1, 2.6);
      st([[-70, stemY], [70, stemY]], 1, 3.2, th.accent);
      st(SH.circ(0, stemY, 74).map(q => [q[0], q[1]]), 1, 2.2, ink2);
      // plug (disc)
      st([[-34, cy - 24 - lift * 60], [34, cy - 24 - lift * 60], [22, cy + 14 - lift * 60], [-22, cy + 14 - lift * 60], [-34, cy - 24 - lift * 60]], 1, 2.6);
      // flow dots (only when open)
      D.dots(g, [[-fw * 0.34, cy], [fw * 0.34, cy]], { speed: 190 * spd * (0.25 + open * 0.75), r: 8, color: th.accent, gap: 120, t: lt, prog: U.range(pr, 0.35, 0.6) * (0.3 + open * 0.7) });
      if (p.labelsOn !== false && labels.length >= 2) {
        D.leader(g, 0, stemY, -fw / 2 + 80, cy - 220, { text: labels[0], sub: labels[1], prog: U.range(pr, 0.5, 0.8), th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
      }
    } else { // turbine
      const cx = 0, cy = fh * 0.04, R = 190;
      const ang = t * 1.6 * spd;
      // casing
      st(SH.circ(cx, cy, R + 40).map(q => [cx + q[0], cy + q[1]]), drawP, 3.4);
      st(SH.circ(cx, cy, R).map(q => [cx + q[0], cy + q[1]]), U.range(pr, 0.1, p.drawFrac + 0.08), 2.4, ink2);
      // blades rotate
      for (let k = 0; k < 9; k++) {
        const a = ang + k * U.TAU / 9;
        const blade = [[cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3],
          [cx + Math.cos(a + 0.24) * R * 0.94, cy + Math.sin(a + 0.24) * R * 0.94],
          [cx + Math.cos(a + 0.38) * R * 0.94, cy + Math.sin(a + 0.38) * R * 0.94],
          [cx + Math.cos(a + 0.14) * R * 0.3, cy + Math.sin(a + 0.14) * R * 0.3]];
        st(blade, 1, 2.6);
      }
      st(SH.circ(cx, cy, R * 0.22).map(q => [cx + q[0], cy + q[1]]), drawP, 3);
      // shaft out to the right
      st([[cx + R + 40, cy], [cx + R + 200, cy]], U.range(pr, 0.2, p.drawFrac + 0.15), 3.4);
      // flow dots into the casing
      D.dots(g, [[-fw * 0.34, cy], [cx - R - 44, cy]], { speed: 240 * spd, r: 7, color: th.accent, gap: 100, t: lt, prog: U.range(pr, 0.35, 0.6) });
      if (p.labelsOn !== false && labels.length >= 2) {
        D.leader(g, cx + Math.cos(2.2) * R, cy + Math.sin(2.2) * R, -fw / 2 + 80, cy + 180, { text: labels[0], sub: labels[1], prog: U.range(pr, 0.5, 0.8), th, fs, side: 'left', color: th.dim, marker: 'dot', seed: env.seed + 3, t: lt });
      }
    }

    // title
    if (f.title) {
      const tp = U.range(pr, 0.55, 0.8);
      if (tp > 0) D.text(g, 0, -fh / 2 + 108, f.title, { font: th.fonts.head, fs: 50, color: th.ink, weight: 'bold', align: 'center', alpha: tp, prog: U.range(tp, 0.1, 1) });
    }
    if (f.sub) D.text(g, 0, -fh / 2 + 146, f.sub, { font: th.fonts.mono, fs: 22, color: th.ink2, align: 'center', alpha: U.range(pr, 0.6, 0.8) });
    g.restore();
  },
});
