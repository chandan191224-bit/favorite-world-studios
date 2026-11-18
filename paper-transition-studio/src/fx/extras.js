// Extra paper transitions. Geometry is reconstructed from progress and seed, so seeks
// and reverse playback never depend on the order in which frames were rendered.
(() => {
  const U = PT.util, D = PT.draw, { range, select, bool } = PT.fx.P;
  const TAU = Math.PI * 2;

  function endpoint(ctx, p, A, B) {
    if (p <= 0) { ctx.drawImage(A, 0, 0); return true; }
    if (p >= 1) { ctx.drawImage(B, 0, 0); return true; }
    return false;
  }

  // draw.quad uses absolute device coordinates. Apply perspective and camera
  // motion to the vertices, never to the context around a texture-mapped quad.
  function texture(ctx, src, rect, q, env, side, n = 2, shade = 0) {
    if (env.matte) {
      ctx.fillStyle = side === 'A' ? env.matteA : (env.matteA === '#fff' ? '#000' : env.matteB);
      ctx.fill(U.pathFrom(q));
    } else D.quad(ctx, src, ...rect, q, n, shade ? () => shade : null);
  }

  function wash(ctx, q, a, b, stops) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) return;
    ctx.save(); ctx.clip(U.pathFrom(q));
    const gr = ctx.createLinearGradient(...a, ...b);
    for (const [t, color] of stops) gr.addColorStop(t, color);
    ctx.fillStyle = gr; ctx.fill(U.pathFrom(q)); ctx.restore();
  }

  function edge(ctx, points, env, strength = 1) {
    if (env.matte || env.rim <= 0 || strength <= 0) return;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(255,253,246,${0.85 * strength})`;
    ctx.lineWidth = Math.max(0.5, env.S * 0.0012 * env.rim);
    ctx.stroke(U.pathFrom(points, false)); ctx.restore();
  }

  PT.fx.register({
    id: 'pageflip', name: 'Book page turn', family: 'Paper extras', sfx: 'fold', dur: 1.6,
    ease: 'inOut', reversible: true,
    desc: 'A gently bowed book page turns in perspective, showing its shaded paper back.',
    params: [
      select('edge', 'Book spine', [['left', 'Left'], ['right', 'Right'], ['top', 'Top']], 'left'),
      range('curve', 'Page bend', 0, 1, 0.01, 0.6),
      range('depth', 'Perspective depth', 0, 1, 0.01, 0.55),
    ],
    draw(ctx, p, A, B, P, env) {
      if (endpoint(ctx, p, A, B)) return;
      const { W, H, S } = env, top = P.edge === 'top', right = P.edge === 'right';
      const e = U.clamp(env.E(p)), theta = Math.PI * e;
      const length = top ? H : W, across = top ? W : H;
      const focal = Math.max(W, H) * (3.4 - 1.55 * P.depth);
      const bend = P.curve * 0.72 * Math.sin(theta);
      const vertices = [], angles = [];
      let x = 0, z = 0;
      for (let j = 0; j <= 3; j++) {
        const project = v => {
          const k = focal / (focal - z);
          const X = x * k, Y = across / 2 + (v - across / 2) * k;
          return top ? [Y, X] : [right ? W - X : X, Y];
        };
        vertices.push([project(0), project(across)]);
        if (j < 3) {
          const angle = theta + bend * (j / 2 - 0.5);
          angles.push(angle);
          x += length / 3 * Math.cos(angle); z += length / 3 * Math.sin(angle);
        }
      }
      ctx.drawImage(B, 0, 0);
      const outline = vertices.map(v => v[0]).concat(vertices.slice().reverse().map(v => v[1]));
      // The shadow follows the raised free edge across the receiving page.
      D.shadowFill(ctx, U.pathFrom(outline), env, Math.sin(theta) * 1.1,
        'nonzero', [top ? S * 0.012 : (right ? -1 : 1) * S * 0.05 * Math.sin(theta),
          top ? S * 0.05 * Math.sin(theta) : S * 0.018]);
      // Far panels first when the page folds back across the spine.
      const order = e > 0.5 ? [2, 1, 0] : [0, 1, 2];
      for (const j of order) {
        const q = top
          ? [vertices[j][0], vertices[j][1], vertices[j + 1][1], vertices[j + 1][0]]
          : [vertices[j][0], vertices[j + 1][0], vertices[j + 1][1], vertices[j][1]];
        const front = Math.cos(angles[j]) >= 0;
        const rect = top ? [0, H * j / 3, W, H / 3] : [W * j / 3, 0, W / 3, H];
        // Right-bound pages have their source strips in the opposite spatial order.
        if (right) {
          rect[0] = W * (2 - j) / 3;
          [q[0], q[1], q[2], q[3]] = [q[1], q[0], q[3], q[2]];
        }
        texture(ctx, front ? A : env.backA, rect, q, env, 'A', 4,
          front ? -0.38 * (1 - Math.max(0, Math.cos(angles[j]))) : 0);
        if (!env.matte && !front) {
          const a = vertices[j][0], b = vertices[j + 1][0];
          wash(ctx, q, a, b, [[0, 'rgba(0,0,0,0.24)'], [0.38, 'rgba(255,255,255,0.18)'],
            [0.7, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.13)']]);
        }
      }
      edge(ctx, outline.concat([outline[0]]), env);
    },
  });

  PT.fx.register({
    id: 'shred', name: 'Paper shredder', family: 'Paper extras', sfx: 'rip', dur: 1.9,
    ease: 'linear', reversible: true,
    desc: 'Narrow cut ribbons drop in a wave, curling and twisting as gravity takes over.',
    params: [
      range('strips', 'Shredder strips', 10, 60, 1, 32),
      select('from', 'Cut wave starts', [['left', 'Left'], ['right', 'Right'], ['center', 'Centre']], 'left'),
    ],
    draw(ctx, p, A, B, P, env) {
      if (endpoint(ctx, p, A, B)) return;
      const { W, H, S, seed } = env, count = U.clamp(Math.round(P.strips), 10, 60), width = W / count;
      ctx.drawImage(B, 0, 0);
      for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        const rank = P.from === 'center' ? Math.abs(2 * u - 1) : P.from === 'right' ? 1 - u : u;
        const delay = 0.24 * rank + U.h1(i, seed + 31) * 0.025;
        const raw = U.range(p, delay, delay + 0.7), q = U.clamp(env.E(raw));
        const x0 = i * width;
        if (q <= 0) {
          ctx.drawImage(A, x0, 0, width, H, x0, 0, width, H);
          continue;
        }
        if (raw >= 1) continue;
        const sg = U.h1(i, seed + 7) < 0.5 ? -1 : 1;
        const fall = H * (1.95 * q * q + 0.09 * q);
        const drift = sg * S * 0.032 * q * q;
        const rotation = sg * q * q * (0.025 + U.h1(i, seed + 9) * 0.085);
        const spin = sg * q * (2.6 + U.h1(i, seed + 15) * 3.2);
        const c = Math.cos(rotation), s = Math.sin(rotation), centre = x0 + width / 2;
        const rows = [], fronts = [];
        for (let j = 0; j <= 3; j++) {
          const v = j / 3, twist = spin + q * Math.sin(v * Math.PI) * 0.85;
          const curl = sg * S * 0.023 * q * v * v;
          const yy = H * v * (1 - 0.055 * q * Math.sin(q * Math.PI));
          const pair = [-1, 1].map(sign => {
            const xx = sign * width / 2 * Math.cos(twist) + curl;
            return [centre + drift + xx * c - (yy - H / 2) * s,
              H / 2 + fall + xx * s + (yy - H / 2) * c];
          });
          rows.push(pair); fronts.push(Math.cos(twist));
        }
        const outline = rows.map(r => r[0]).concat(rows.slice().reverse().map(r => r[1]));
        D.shadowFill(ctx, U.pathFrom(outline), env, 0.36 + q * 0.3);
        for (let j = 0; j < 3; j++) {
          const face = (fronts[j] + fronts[j + 1]) / 2;
          texture(ctx, face >= 0 ? A : env.backA, [x0, H * j / 3, width, H / 3],
            [rows[j][0], rows[j][1], rows[j + 1][1], rows[j + 1][0]], env, 'A', 1,
            -0.22 * (1 - Math.abs(face)));
        }
        const cut = U.smooth(U.range(raw, 0, 0.12));
        edge(ctx, rows.map(r => r[0]), env, cut);
        edge(ctx, rows.map(r => r[1]), env, cut);
      }
    },
  });

  // A falling sheet approaches the desk in perspective, then settles to a small
  // inset. The last push removes that inset continuously and ends on exact B.
  function dropQuad(p, P, env, index, shakeX, shakeY) {
    const { W, H, S } = env, start = index < 0 ? 0 : 0.07 + index * 0.07;
    const land = index < 0 ? 0.64 : 0.43 + index * 0.075;
    const t = U.range(p, start, land), lift = 1 - t * t;
    const after = Math.max(0, p - land), settle = U.smooth(U.range(p, 0.82, 1));
    const bounce = after > 0 ? 0.035 * Math.exp(-after * 22) * Math.sin(after * 48) : 0;
    const dir = { top: [0, -1], left: [-1, 0], right: [1, 0], bottom: [0, 1] }[P.from] || [0, -1];
    const size = U.lerp(0.92 + 0.7 * lift + bounce, 1, settle);
    const offset = index < 0 ? 0 : (index === 0 ? -1 : 1) * 0.008 * (1 - settle);
    const cx = W / 2 + dir[0] * W * 2.3 * lift + shakeX + offset * S;
    const cy = H / 2 + dir[1] * H * 2.3 * lift + shakeY + offset * S;
    const angle = (P.tilt * Math.PI / 180 * lift + offset * 0.7) * (1 - settle);
    const tilt = lift * 0.42 * (1 - settle), focal = Math.max(W, H) * 2.5;
    const c = Math.cos(angle), s = Math.sin(angle);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * W / 2 * size, y = sy * H / 2 * size;
      const z = (dir[0] * x + dir[1] * y) * tilt;
      const k = focal / (focal - z);
      return [cx + (x * c - y * s) * k, cy + (x * s + y * c) * k];
    });
  }

  PT.fx.register({
    id: 'slap', name: 'Paper drop / slap-on', family: 'Paper extras', sfx: 'whoosh', dur: 1.4,
    ease: 'linear', reversible: true,
    desc: 'A loose sheet drops onto the desk, lands with a restrained bounce, then fills the frame.',
    params: [
      select('from', 'Drop from', [['top', 'Top'], ['left', 'Left'], ['right', 'Right'], ['bottom', 'Bottom']], 'top'),
      range('tilt', 'Tilt (degrees)', -35, 35, 1, -12),
      range('shake', 'Impact shake', 0, 1, 0.01, 0.25),
      bool('stack', 'Two blank sheets land first', false),
    ],
    draw(ctx, p, A, B, P, env) {
      if (endpoint(ctx, p, A, B)) return;
      const { W, H, S } = env, e = U.clamp(env.E(p));
      const impact = Math.max(0, e - 0.64), active = e > 0.64 ? Math.exp(-impact * 30) : 0;
      const shakeX = Math.sin(impact * 119) * active * S * 0.0035 * P.shake;
      const shakeY = Math.sin(impact * 153) * active * S * 0.0025 * P.shake;
      ctx.save();
      // Overscan the desk during the tiny camera impulse so no transparent border appears.
      const m = active * S * 0.006 * P.shake;
      ctx.drawImage(A, shakeX - m, shakeY - m, W + m * 2, H + m * 2); ctx.restore();
      const layers = P.stack ? [0, 1, -1] : [-1];
      for (const index of layers) {
        const q = dropQuad(e, P, env, index, shakeX, shakeY);
        const land = index < 0 ? 0.64 : 0.43 + index * 0.075;
        const lift = 1 - Math.pow(U.range(e, index < 0 ? 0 : 0.07 + index * 0.07, land), 2);
        const path = U.pathFrom(q);
        if (!env.matte && env.shadow > 0) {
          ctx.save(); ctx.shadowColor = `rgba(0,0,0,${env.shadow * (0.15 + 0.2 * (1 - lift))})`;
          ctx.shadowBlur = S * (0.007 + 0.065 * lift);
          ctx.shadowOffsetX = S * (0.002 + 0.018 * lift);
          ctx.shadowOffsetY = S * (0.005 + 0.04 * lift);
          ctx.fillStyle = '#000'; ctx.fill(path); ctx.restore();
        }
        texture(ctx, index < 0 ? B : env.backB, [0, 0, W, H], q, env, 'B', 4, -0.12 * lift);
        edge(ctx, q.concat([q[0]]), env, 1 - U.smooth(U.range(e, 0.88, 1)));
      }
    },
  });

  // Cache only unit-radius tear geometry: no full-frame scratch textures, and
  // no new noise generation for the faint camera-smear copies.
  const holes = new Map();
  function holeGeometry(P, env) {
    const count = U.clamp(Math.round(P.petals), 4, 12), key = `${env.seed}|${count}`;
    if (holes.has(key)) return holes.get(key);
    const vertices = [], segments = [], random = U.rng(env.seed + 701);
    const phase = random() * TAU;
    for (let i = 0; i < count; i++) {
      const angle = phase + TAU * (i + (random() - 0.5) * 0.22) / count;
      const radius = 0.9 + random() * 0.17;
      vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
    for (let i = 0; i < count; i++) {
      const a = vertices[i], b = vertices[(i + 1) % count];
      segments.push(U.tornLine(...a, ...b, U.tornProfile(env.seed + i * 19, 0.52, 2), 0.012));
    }
    const points = [].concat(...segments);
    // Actual inradius includes the ragged edge and the wider gaps between four
    // petals. It guarantees clearance even for a hole at a frame corner.
    let inner = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy;
      const t = d2 > 0 ? U.clamp(-(a[0] * dx + a[1] * dy) / d2) : 0;
      inner = Math.min(inner, Math.hypot(a[0] + t * dx, a[1] + t * dy));
    }
    const value = { segments, points, inner: Math.max(0.1, inner) };
    holes.set(key, value);
    if (holes.size > 12) holes.delete(holes.keys().next().value);
    return value;
  }

  PT.fx.register({
    id: 'zoomhole', name: 'Zoom through a torn hole', family: 'Paper extras', sfx: 'whoosh', dur: 1.65,
    ease: 'in', reversible: true,
    desc: 'A ragged opening tears into curled petals before the camera rushes through the page.',
    params: [
      range('cx', 'Hole centre X', 0, 1, 0.01, 0.5),
      range('cy', 'Hole centre Y', 0, 1, 0.01, 0.48),
      range('petals', 'Curled petals', 4, 12, 1, 7),
      range('push', 'Camera push', 0, 1, 0.01, 0.8),
    ],
    draw(ctx, p, A, B, P, env) {
      if (endpoint(ctx, p, A, B)) return;
      const { W, H, S } = env, cx = P.cx * W, cy = P.cy * H;
      const geom = holeGeometry(P, env);
      const open = U.smooth(U.range(p, 0, 0.42));
      const rush = U.clamp(env.E(U.range(p, 0.28, 1)));
      // Even at push=0 the hole clears the most distant corner before p=1.
      // Higher push puts more of that travel into camera magnification.
      const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy),
        Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
      const scale = 1 + (5 + 25 * P.push) * Math.pow(rush, 2.1);
      const clearance = far * 1.22 / geom.inner;
      const base = S * 0.14 * open + clearance * Math.pow(rush, 2) / (6 + 25 * P.push);
      const radius = base * scale;
      ctx.drawImage(B, 0, 0);
      if (radius * geom.inner * 0.86 > far + S * 0.08) return;
      const at = (v, r) => [cx + v[0] * r, cy + v[1] * r];

      function page(r, sc, ghost) {
        const points = geom.points.map(v => at(v, r));
        const path = new Path2D(); path.rect(0, 0, W, H); path.addPath(U.pathFrom(points));
        const tf = [sc, 0, 0, sc, cx * (1 - sc), cy * (1 - sc)];
        if (!ghost) D.shadowFill(ctx, path, env, 0.6, 'evenodd');
        ctx.save(); ctx.clip(path, 'evenodd'); ctx.transform(...tf); ctx.drawImage(A, 0, 0); ctx.restore();
        if (!ghost && !env.matte) {
          ctx.save(); ctx.clip(path, 'evenodd'); D.rim(ctx, U.pathFrom(points), env, 0.55);
          ctx.restore(); D.fibres(ctx, points, env, env.seed + 773, 0.55);
        }
      }

      // Only outgoing paper is smeared; B stays sharp and matte exports stay binary.
      if (!env.matte && rush > 0.05) {
        const smear = U.clamp(rush * 2) * 0.07;
        for (const k of [2, 1]) {
          ctx.save(); ctx.globalAlpha = k === 2 ? 0.055 : 0.11;
          page(radius * (1 - smear * k), Math.max(1, scale * (1 - smear * k)), true); ctx.restore();
        }
      }
      page(radius, scale, false);
      const petalLength = Math.min(S * 0.065 * scale, radius * 0.3);
      for (let i = 0; i < geom.segments.length; i++) {
        const seg = geom.segments[i].map(v => at(v, radius));
        const a = seg[0], b = seg[seg.length - 1], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const dx = mid[0] - cx, dy = mid[1] - cy, len = Math.hypot(dx, dy) || 1;
        const length = petalLength * (0.65 + U.h1(i, env.seed + 5) * 0.45);
        const tip = [mid[0] + dx / len * length, mid[1] + dy / len * length];
        // A curved ridge and fine torn edge replace a flat triangular cartoon flap.
        const outer = seg.map(([x, y], j) => {
          const t = j / (seg.length - 1), bow = Math.pow(Math.sin(Math.PI * t), 1.3) * length;
          return [x + dx / len * bow, y + dy / len * bow];
        });
        D.flap(ctx, seg.concat(outer.reverse()), env, mid, tip, { shadow: 0.35 });
      }
    },
  });

  const pr = PT.fx.preset;
  pr('pageflip-book', 'Book page: left spine', 'pageflip', { edge: 'left', curve: 0.6, depth: 0.55 }, 1.6);
  pr('pageflip-right', 'Book page: right spine', 'pageflip', { edge: 'right', curve: 0.8, depth: 0.65 }, 1.7);
  pr('pageflip-top', 'Calendar page turn', 'pageflip', { edge: 'top', curve: 0.45, depth: 0.5 }, 1.5);
  pr('shred-wave', 'Fine shredder wave', 'shred', { strips: 40, from: 'left' }, 1.9);
  pr('shred-center', 'Shred from the centre', 'shred', { strips: 28, from: 'center' }, 1.8);
  pr('slap-single', 'Single paper slap', 'slap', { from: 'top', tilt: -12, shake: 0.25, stack: false }, 1.4);
  pr('slap-stack', 'Paper stack lands', 'slap', { from: 'right', tilt: 18, shake: 0.35, stack: true }, 1.65);
  pr('zoomhole-push', 'Rush through torn paper', 'zoomhole', { cx: 0.5, cy: 0.48, petals: 7, push: 0.8 }, 1.65);
  pr('zoomhole-offset', 'Off-centre torn portal', 'zoomhole', { cx: 0.32, cy: 0.42, petals: 9, push: 1 }, 1.8);
})();
