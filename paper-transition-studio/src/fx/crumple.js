// Crumple-to-ball (mesh warp with faceted shading) and origami fold.
(() => {
  const U = PT.util, D = PT.draw, M = PT.materials, { range, select } = PT.fx.P;
  const avg = (() => {
    const c = U.canvas(1, 1), g = c.getContext('2d', { willReadFrequently: true });
    return img => { g.clearRect(0, 0, 1, 1); g.drawImage(img, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
  })();

  PT.fx.register({
    id: 'crumple', name: 'Crumple into a ball', family: 'Crumple', sfx: 'crumple', dur: 1.6, ease: 'inOut', reversible: true,
    desc: 'The page scrunches into a lumpy paper ball (edges first), then the ball is tossed, dropped or shrinks away.',
    params: [
      select('exit', 'Then the ball', [['toss', 'Is tossed away'], ['fall', 'Falls down'], ['shrink', 'Shrinks to nothing'], ['away', 'Flies into the distance'], ['stay', 'Stays (no exit)']], 'toss'),
      range('ball', 'Ball size', 0.08, 0.4, 0.01, 0.17),
      range('wrinkle', 'Wrinkles', 0, 1, 0.01, 0.7),
      range('crumpleEnd', 'Crumple / exit split', 0.35, 0.9, 0.01, 0.6),
      range('cx', 'Ball X', 0.1, 0.9, 0.01, 0.5),
      range('cy', 'Ball Y', 0.1, 0.9, 0.01, 0.5),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, nx = W >= H ? 18 : 10, ny = W >= H ? 10 : 18;
      const c = env.E(U.range(p, 0, P.crumpleEnd)), m = U.ease.in(U.range(p, P.crumpleEnd * 0.92, 1));
      const ballR = S * P.ball, bx = P.cx * W, by = P.cy * H, seed = env.seed;
      // exit motion of the ball
      let ox = 0, oy = 0, rot = 0, sc = 1;
      if (P.exit === 'toss') { ox = m * W * 0.85; oy = -m * H * 0.25 - Math.sin(m * Math.PI) * H * 0.35 + m * m * H * 0.2; rot = m * 5; sc = 1 - 0.35 * m; }
      else if (P.exit === 'fall') { oy = m * m * H * 1.35; ox = m * W * 0.08; rot = m * 3; }
      else if (P.exit === 'shrink') { sc = 1 - m; rot = m * 2.5; }
      else if (P.exit === 'away') { sc = Math.pow(1 - m, 2.2); oy = -m * H * 0.15; rot = m * 3.5; }
      const cosr = Math.cos(rot), sinr = Math.sin(rot);
      const V = [], CI = [];
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const u = i / nx * 2 - 1, v = j / ny * 2 - 1, rx = i / nx * W, ry = j / ny * H;
        const delay = (1 - Math.max(Math.abs(u), Math.abs(v))) * 0.5;
        const ci = U.smooth(U.range(c, delay * 0.8, 1));
        const dux = u * Math.sqrt(1 - v * v / 2), dvy = v * Math.sqrt(1 - u * u / 2);
        const jx = U.fbm2(u * 1.6, v * 1.6, seed, 3) * 0.75, jy = U.fbm2(u * 1.6 + 9, v * 1.6, seed, 3) * 0.75;
        const tx = bx + (dux + jx) * ballR, ty = by + (dvy + jy) * ballR;
        const buck = Math.sin(ci * Math.PI) * S * 0.035 * P.wrinkle;
        let x = U.lerp(rx, tx, ci) + U.noise2(u * 3, v * 3, seed + 4) * buck;
        let y = U.lerp(ry, ty, ci) + U.noise2(u * 3, v * 3, seed + 8) * buck;
        x -= bx; y -= by;
        V.push([bx + (x * cosr - y * sinr) * sc + ox, by + (x * sinr + y * cosr) * sc + oy]);
        CI.push(ci);
      }
      ctx.drawImage(B, 0, 0);
      if (sc <= 0.003) return;
      const at = (i, j) => j * (nx + 1) + i;
      const hull = [];
      for (let i = 0; i <= nx; i++) hull.push(V[at(i, 0)]);
      for (let j = 1; j <= ny; j++) hull.push(V[at(nx, j)]);
      for (let i = nx - 1; i >= 0; i--) hull.push(V[at(i, ny)]);
      for (let j = ny - 1; j > 0; j--) hull.push(V[at(0, j)]);
      D.shadowFill(ctx, U.pathFrom(hull), env, 0.6 + c * 0.6);
      if (env.matte) { ctx.fillStyle = env.matteA; ctx.fill(U.pathFrom(hull)); }
      if (c > 0.75 && !env.matte) {
        const r = ballR * sc * 1.05, spr = M.ballSprite(avg(A), 256, seed);
        ctx.save(); ctx.globalAlpha = U.range(c, 0.75, 0.95);
        ctx.translate(bx + ox, by + oy); ctx.rotate(rot); ctx.drawImage(spr, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4); ctx.restore();
      }
      if (env.matte) return;
      const sw = W / nx, sh = H / ny, k = 0.55 * (0.3 + P.wrinkle);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const s00 = [i * sw, j * sh], s10 = [(i + 1) * sw, j * sh], s11 = [(i + 1) * sw, (j + 1) * sh], s01 = [i * sw, (j + 1) * sh];
        const d00 = V[at(i, j)], d10 = V[at(i + 1, j)], d11 = V[at(i + 1, j + 1)], d01 = V[at(i, j + 1)];
        const ci = (CI[at(i, j)] + CI[at(i + 1, j + 1)]) / 2;
        const sh1 = (U.h2(i, j, seed) - 0.5) * 2 * ci * k, sh2 = (U.h2(i, j, seed + 1) - 0.5) * 2 * ci * k;
        D.tri(ctx, A, s00, s10, s11, d00, d10, d11, sh1);
        D.tri(ctx, A, s00, s11, s01, d00, d11, d01, sh2);
      }
    },
  });

  // ---------- origami fold: fold in half, fold again, fly off ----------
  PT.fx.register({
    id: 'fold', name: 'Origami fold', family: 'Roll & fold', sfx: 'fold', dur: 1.8, ease: 'inOut', reversible: true,
    desc: 'The sheet folds in half, folds again into a small packet, then flies or drops away.',
    params: [
      select('first', 'First fold', [['up', 'Bottom half folds up'], ['down', 'Top half folds down']], 'up'),
      select('exit', 'Then the packet', [['fly', 'Flies away'], ['fall', 'Drops'], ['shrink', 'Shrinks']], 'fly'),
      range('persp', '3D depth', 0, 1, 0.01, 0.6),
    ],
    draw(ctx, p, A, B, P, env) {
      const { W, H, S } = env, flip = P.first === 'down';
      ctx.drawImage(B, 0, 0);
      const s1 = env.E(U.range(p, 0, 0.34)), s2 = env.E(U.range(p, 0.3, 0.62)), s3 = U.ease.in(U.range(p, 0.6, 1));
      const F = W * (2.6 - 1.6 * P.persp), cx = W / 2, cy = H / 2;
      // canonical "up" frame; flipY mirrors for "down"
      const Y = y => (flip ? H - y : y);
      const proj = (x, y, z) => { const k = F / (F - z); return [cx + (x - cx) * k, cy + (Y(y) - cy) * k]; };
      const back = env.matte ? null : env.backA;
      const pack = env.tmp('fold', W, H), g = pack.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      const th = Math.PI * s1;
      const fillQuad = (img, sx, sy, sw, sh_, q, shade, mirror) => {
        if (env.matte) { g.fillStyle = env.matteA; g.beginPath(); q.forEach((v, i) => (i ? g.lineTo(...v) : g.moveTo(...v))); g.fill(); return; }
        const qq = mirror ? [q[1], q[0], q[3], q[2]] : q;
        D.quad(g, img, sx, sy, sw, sh_, qq, 5, () => shade);
      };
      // source rows flipped for "down": we just sample A with Y()
      const srcY = (y0, h) => (flip ? H - y0 - h : y0);
      if (s2 <= 0) {
        // static top half
        fillQuad(A, 0, srcY(0, H / 2), W, H / 2, [proj(0, 0, 0), proj(W, 0, 0), proj(W, H / 2, 0), proj(0, H / 2, 0)].map(v => v), -0.25 * Math.sin(th) * (th > Math.PI / 2 ? 1 : 0.4), false);
        const ct = Math.cos(th), st = Math.sin(th) * S * 0.0 + Math.sin(th);
        const q = [proj(0, H / 2, 0), proj(W, H / 2, 0), proj(W, H / 2 + (H / 2) * ct, (H / 2) * st), proj(0, H / 2 + (H / 2) * ct, (H / 2) * st)];
        if (th < Math.PI / 2) fillQuad(A, 0, srcY(H / 2, H / 2), W, H / 2, flip ? [q[3], q[2], q[1], q[0]] : q, -0.35 * Math.sin(th), false);
        else fillQuad(back || A, 0, 0, W, H / 2, flip ? [q[3], q[2], q[1], q[0]] : q, 0.12 - 0.3 * Math.sin(th), false);
      } else {
        // packet = top half (now white back on top); fold right half over left
        const ph = Math.PI * s2, cp = Math.cos(ph), spn = Math.sin(ph);
        fillQuad(back || A, 0, 0, W / 2, H / 2, [proj(0, 0, 0), proj(W / 2, 0, 0), proj(W / 2, H / 2, 0), proj(0, H / 2, 0)], -0.22 * spn, false);
        const xr = W / 2 + (W / 2) * cp, z = (W / 2) * spn;
        const q = [proj(W / 2, 0, 0), proj(xr, 0, z), proj(xr, H / 2, z), proj(W / 2, H / 2, 0)];
        if (ph < Math.PI / 2) fillQuad(back || A, W / 2, 0, W / 2, H / 2, q, -0.3 * spn, false);
        else fillQuad(A, W / 2, srcY(0, H / 2), W / 2, H / 2, flip ? [q[3], q[2], q[1], q[0]] : q, 0.05 - 0.25 * spn, true);
      }
      // packet bounds for the shadow + exit motion
      const qx = s2 > 0 ? W / 4 : W / 2, qy = Y(s1 > 0.5 ? H / 4 : H / 2);
      let tx = 0, ty = 0, rot = 0, sc = 1;
      if (P.exit === 'fly') { tx = -s3 * W * 0.9; ty = -s3 * H * 0.6; rot = -s3 * 1.6; sc = 1 - s3 * 0.5; }
      else if (P.exit === 'fall') { ty = s3 * s3 * H * 1.4; rot = s3 * 1.2; }
      else { sc = 1 - s3; rot = s3 * 2; }
      ctx.save();
      if (!env.matte && env.shadow > 0) { ctx.shadowColor = `rgba(0,0,0,${0.45 * env.shadow})`; ctx.shadowBlur = S * 0.03; ctx.shadowOffsetY = S * 0.012 * (1 + s3 * 3); ctx.shadowOffsetX = S * 0.006; }
      ctx.translate(qx + tx, qy + ty); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-qx, -qy);
      ctx.drawImage(pack, 0, 0);
      ctx.restore();
    },
  });

  const pr = PT.fx.preset;
  pr('crumple-toss', 'Crumple & toss', 'crumple', { exit: 'toss' }, 1.6, 'Page scrunches into a ball and is thrown away');
  pr('crumple-shrink', 'Crumple & shrink', 'crumple', { exit: 'shrink' }, 1.5);
  pr('crumple-fall', 'Crumple & drop', 'crumple', { exit: 'fall' }, 1.6);
  pr('uncrumple', 'Paper ball opens into the new scene', 'crumple', { exit: 'stay', reverse: true, crumpleEnd: 0.9 }, 1.4, 'Reverse: a ball unfolds into a full sheet');
  pr('fold', 'Origami fold & fly', 'fold', {}, 1.8);
  pr('fold-drop', 'Fold & drop', 'fold', { first: 'down', exit: 'fall' }, 1.8);
  pr('unroll', 'Unroll in (reverse roll)', 'roll', { angle: '0', reverse: true }, 1.4);
})();
