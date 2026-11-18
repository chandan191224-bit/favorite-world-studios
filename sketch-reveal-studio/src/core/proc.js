// Photo analysis: turns a photo (or a video frame) into what an artist would draw —
// traced outline strokes, tone bands, shape-following hatch fields, stipple dots, a
// quantised colour map and soft wash canvases. Everything is seeded + cached and computed
// ONCE per photo in small time slices (U.runJob) so the page never blocks.
SK.proc = (() => {
  const U = SK.util;

  // ---------------- pure image helpers ----------------
  function toCanvas(src, maxDim) {
    const w = src.videoWidth || src.width, h = src.videoHeight || src.height;
    if (!w || !h) return null;
    const k = Math.min(1, maxDim / Math.max(w, h));
    const c = U.canvas(Math.max(8, Math.round(w * k)), Math.max(8, Math.round(h * k)));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // transparent pngs read as paper
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function grayOf(g, W, H) {
    const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0, j = 0; i < a.length; i++, j += 4) a[i] = (0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]) / 255;
    return a;
  }
  function blur(src, W, H, r) {
    if (r < 1) return src.slice();
    const a = new Float32Array(W * H), b = new Float32Array(W * H), n = 2 * r + 1;
    for (let y = 0; y < H; y++) { // horizontal, clamped edges
      const row = y * W; let acc = src[row] * (r + 1);
      for (let x = 1; x <= r; x++) acc += src[row + Math.min(x, W - 1)];
      for (let x = 0; x < W; x++) {
        a[row + x] = acc / n;
        acc += src[row + Math.min(x + r + 1, W - 1)] - src[row + Math.max(x - r, 0)];
      }
    }
    for (let x = 0; x < W; x++) { // vertical
      let acc = a[x] * (r + 1);
      for (let y = 1; y <= r; y++) acc += a[Math.min(y, H - 1) * W + x];
      for (let y = 0; y < H; y++) {
        b[y * W + x] = acc / n;
        acc += a[Math.min(y + r + 1, H - 1) * W + x] - a[Math.max(y - r, 0) * W + x];
      }
    }
    return b;
  }
  // Sobel magnitude + direction (dir = gradient angle). Returns {mag, gx, gy} on the *dark* map.
  function sobel(a, W, H) {
    const mag = new Float32Array(W * H), gx = new Float32Array(W * H), gy = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) {
      const r = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = r + x;
        const a00 = a[i - W - 1], a01 = a[i - W], a02 = a[i - W + 1], a10 = a[i - 1], a12 = a[i + 1], a20 = a[i + W - 1], a21 = a[i + W], a22 = a[i + W + 1];
        const sx = (a02 + 2 * a12 + a22) - (a00 + 2 * a10 + a20);
        const sy = (a20 + 2 * a21 + a22) - (a00 + 2 * a01 + a02);
        gx[i] = sx; gy[i] = sy;
        mag[i] = Math.sqrt(sx * sx + sy * sy); // max ~ 4*sqrt2 for dark in 0..1 → /5.657
      }
    }
    return { mag, gx, gy };
  }
  const dark = gray => gray.map(v => 1 - v);

  // ---------------- ridge tracing ----------------
  // Thin (non-max suppression) then walk the ridges into polylines with momentum, weak-link
  // hysteresis (edges half as strong still connect) and 2px gap jumps — so a soft photo edge
  // becomes one flowing line instead of confetti dashes. Deterministic: raster seed order.
  function traceRidges(mag, W, H, thr, minLen, maxPts) {
    const lo = thr * 0.45;
    const nms = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, m = mag[i];
      if (m < thr) continue;
      const horiz = Math.abs(mag[i - 1] - mag[i + 1]) < Math.abs(mag[i - W] - mag[i + W]);
      const ok = horiz ? (m >= mag[i - 1] && m >= mag[i + 1]) : (m >= mag[i - W] && m >= mag[i + W]);
      if (ok) nms[i] = 1;
    }
    const cand = new Uint8Array(W * H);
    for (let i = 0; i < cand.length; i++) cand[i] = mag[i] >= lo ? 1 : 0;
    const seeds = [];
    for (let i = 0; i < nms.length; i++) if (nms[i]) seeds.push(i);
    const visited = new Uint8Array(W * H);
    const lines = [];
    // extend from index cur in direction (dx,dy); returns appended points (device indices)
    const extend = (cur, dx, dy) => {
      const out = [];
      for (let step = 0; step < maxPts; step++) {
        const x = cur % W, y = (cur / W) | 0;
        let best = -1, bs = -1, bdx = 0, bdy = 0;
        for (let ay = -1; ay <= 1; ay++) for (let ax = -1; ax <= 1; ax++) {
          if (!ax && !ay) continue;
          const nx = x + ax, ny = y + ay;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          const j = ny * W + nx;
          if (visited[j] || !cand[j]) continue;
          let s = mag[j];
          if (dx || dy) { // momentum: keep going the same way
            const a = (dx * ax + dy * ay) / Math.hypot(ax, ay);
            s *= 1 + 0.6 * Math.max(0, a);
          }
          if (s > bs) { bs = s; best = j; bdx = ax; bdy = ay; }
        }
        if (best < 0 && (dx || dy)) { // gap jump: 2px straight ahead over a break
          const jx = x + Math.round(dx * 2), jy = y + Math.round(dy * 2);
          if (jx > 0 && jy > 0 && jx < W - 1 && jy < H - 1) {
            const j = jy * W + jx;
            if (!visited[j] && cand[j] && mag[j] >= lo * 1.3) {
              best = j;
              const L = Math.hypot(dx, dy);
              bdx = dx / L; bdy = dy / L;
            }
          }
        }
        if (best < 0) break;
        visited[best] = 1; out.push(best);
        cur = best; dx = bdx; dy = bdy;
      }
      return out;
    };
    for (const s of seeds) {
      if (visited[s]) continue;
      visited[s] = 1;
      const fwd = extend(s, 0, 0);                       // strongest neighbour first
      let dx0 = 0, dy0 = 0;
      if (fwd.length) { const x0 = s % W, y0 = (s / W) | 0, x1 = fwd[0] % W, y1 = (fwd[0] / W) | 0; dx0 = x1 - x0; dy0 = y1 - y0; }
      const bwd = extend(s, -dx0, -dy0);                 // then the other way
      const pts = bwd.reverse().concat([s], fwd);
      if (pts.length >= minLen) lines.push(pts);
    }
    return lines;
  }
  // Ramer–Douglas–Peucker on index lists -> flat [x0,y0,x1,y1,...]
  function simplify(pts, W, eps) {
    const P = pts.map(i => [i % W, (i / W) | 0]);
    const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
    const stack = [[0, P.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      if (b - a < 2) continue;
      const ax = P[a][0], ay = P[a][1], bx = P[b][0], by = P[b][1];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      let mi = -1, md = 0;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / L;
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    const out = [];
    for (let i = 0; i < P.length; i++) if (keep[i]) out.push(P[i][0], P[i][1]);
    return out;
  }
  // resample a flat polyline to (roughly) even spacing, in place-friendly
  function resample(flat, step) {
    if (flat.length <= 4) return flat.slice();
    const out = [flat[0], flat[1]];
    let ax = flat[0], ay = flat[1], carry = 0;
    for (let i = 2; i < flat.length; i += 2) {
      const bx = flat[i], by = flat[i + 1];
      const seg = Math.hypot(bx - ax, by - ay);
      let t = step - carry;
      while (t < seg) {
        const k = t / seg;
        out.push(ax + (bx - ax) * k, ay + (by - ay) * k);
        t += step;
      }
      carry = seg - (t - step);
      ax = bx; ay = by;
    }
    out.push(flat[flat.length - 2], flat[flat.length - 1]);
    return out;
  }
  function strokeProps(flat, darkA, W) {
    let len = 0, tone = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, cx = 0, cy = 0;
    const n = flat.length / 2;
    for (let i = 0; i < flat.length; i += 2) {
      const x = flat[i], y = flat[i + 1];
      if (i) len += Math.hypot(x - flat[i - 2], y - flat[i - 1]);
      const xi = U.clamp(Math.round(x), 0, W - 1), yi = U.clamp(Math.round((flat[i + 1])), 0, darkA.length / W - 1);
      tone += darkA[yi * W + xi];
      cx += x; cy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { p: flat, n, len, tone: tone / n, cx: cx / n, cy: cy / n, x0, y0, x1, y1 };
  }

  // ---------------- shape-following hatch (engraving) ----------------
  // Isophote streamlines: walk along constant-brightness contours inside each tone band,
  // so the hatching curves around forms like a banknote engraving.
  function isophoteHatch(darkA, W, H, seed, bands, maxSteps) {
    const out = bands.map(() => []);
    const grad = (x, y) => { // dark gradient (blurred map → stable)
      const xi = U.clamp(Math.round(x), 1, W - 2), yi = U.clamp(Math.round(y), 1, H - 2);
      const i = yi * W + xi;
      return [darkA[i + 1] - darkA[i - 1], darkA[i + W] - darkA[i - W]];
    };
    const at = (x, y) => {
      const xi = U.clamp(Math.round(x), 0, W - 1), yi = U.clamp(Math.round(y), 0, H - 1);
      return darkA[yi * W + xi];
    };
    const trace = (sx, sy, band, dir) => {
      const [t, w] = [band.t, band.w * 1.35]; // hysteresis: may wander a bit past the band
      let x = sx, y = sy;
      const pts = [];
      for (let s = 0; s < maxSteps; s++) {
        const [gx, gy] = grad(x, y);
        const gm = Math.hypot(gx, gy);
        if (gm < 0.02) break; // flat — nothing to engrave
        let dx = (-gy / gm) * dir, dy = (gx / gm) * dir;
        // RK2 midpoint
        const mx = x + dx * 0.5, my = y + dy * 0.5;
        const [gx2, gy2] = grad(mx, my);
        const gm2 = Math.hypot(gx2, gy2);
        if (gm2 < 0.008) break;
        dx = (-gy2 / gm2) * dir; dy = (gx2 / gm2) * dir;
        x += dx; y += dy;
        if (x < 2 || y < 2 || x > W - 3 || y > H - 3) break;
        const d = at(x, y);
        if (d < t - w || d > t + w) break;
        pts.push(x, y);
      }
      return pts;
    };
    for (let bi = 0; bi < bands.length; bi++) {
      const band = bands[bi], gap = band.gap;
      const cols = Math.ceil(W / gap), rows = Math.ceil(H / gap);
      for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < cols; rx++) {
        const jx = (U.h2(rx, ry, seed + bi * 131) - 0.5) * gap * 0.9;
        const jy = (U.h2(rx, ry, seed + bi * 977) - 0.5) * gap * 0.9;
        const x = rx * gap + gap * 0.5 + jx, y = ry * gap + gap * 0.5 + jy;
        const d = at(x, y);
        if (d < band.t - band.w || d > band.t + band.w) continue;
        const a = trace(x, y, band, 1), b = trace(x, y, band, -1);
        const pts = [];
        for (let i = b.length - 2; i >= 0; i -= 2) pts.push(b[i], b[i + 1]); // reverse as pairs
        pts.push(x, y);
        for (let i = 0; i < a.length; i += 2) pts.push(a[i], a[i + 1]);
        if (pts.length >= 8) out[bi].push(resample(pts, 2.2));
      }
    }
    return out;
  }
  // straight parallel hatch runs inside tone bands (cross-hatch): scanline along the hatch angle
  function straightHatch(darkA, W, H, angle, bands) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const diag = Math.hypot(W, H);
    const per = (x, y) => x * ca + y * sa;   // coordinate along hatch direction
    const along = (x, y) => -x * sa + y * ca;
    const out = bands.map(() => []);
    for (let bi = 0; bi < bands.length; bi++) {
      const band = bands[bi];
      for (let q = -diag / 2; q < diag / 2; q += band.gap) {
        let run = null;
        for (let s = -diag / 2; s <= diag / 2; s += 1.5) {
          // point = center + s*dir + q*perp, with dir=(ca,sa) rotated
          const x = W / 2 + s * ca - q * sa, y = H / 2 + s * sa + q * ca;
          let inside = false;
          if (x >= 0 && y >= 0 && x < W && y < H) {
            const d = darkA[(Math.min(H - 1, y | 0)) * W + (Math.min(W - 1, x | 0))];
            inside = d >= band.t - band.w && d <= band.t + band.w;
          }
          if (inside && !run) run = { s0: s };
          if ((!inside || s >= diag / 2) && run) {
            if (s - run.s0 > 4) {
              const ax = W / 2 + run.s0 * ca - q * sa, ay = H / 2 + run.s0 * sa + q * ca;
              const bx = W / 2 + s * ca - q * sa, by = H / 2 + s * sa + q * ca;
              out[bi].push([ax, ay, bx, by]);
            }
            run = null;
          }
        }
      }
    }
    return out;
  }
  // stipple dots: jittered grid, dot kept where dark enough — classic stippling
  function stipple(darkA, W, H, seed, gap) {
    const pts = [];
    for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) {
      const jx = (U.h2(x / gap | 0, y / gap | 0, seed) - 0.5) * gap;
      const jy = (U.h2(x / gap | 0, y / gap | 0, seed + 71) - 0.5) * gap;
      const px = U.clamp(x + jx, 0, W - 1), py = U.clamp(y + jy, 0, H - 1);
      const d = darkA[(py | 0) * W + (px | 0)];
      if (d > 0.3 && U.h2(x / gap | 0, y / gap | 0, seed + 913) < (d - 0.22) / 0.7) {
        pts.push({ x: px, y: py, r: 0.45 + d * 1.5, d });
      }
    }
    pts.sort((a, b) => b.d - a.d); // darkest first: shadows fill in first
    return pts;
  }
  // quantise colours (seeded k-means on a sample) -> palette + painted canvas
  function quantize(g, W, H, k, seed) {
    const d = g.getImageData(0, 0, W, H).data;
    const sample = [];
    for (let i = 0; i < W * H; i += 7) sample.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    // deterministic seeds: pick k far-ish apart samples
    const cents = [];
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(U.h1(i, seed) * sample.length);
      cents.push(sample[idx].slice());
    }
    const assign = new Uint8Array(W * H);
    for (let it = 0; it < 5; it++) {
      const acc = cents.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < sample.length; i++) {
        let bi = 0, bd = 1e9;
        for (let c = 0; c < k; c++) {
          const dd = (sample[i][0] - cents[c][0]) ** 2 + (sample[i][1] - cents[c][1]) ** 2 + (sample[i][2] - cents[c][2]) ** 2;
          if (dd < bd) { bd = dd; bi = c; }
        }
        acc[bi][0] += sample[i][0]; acc[bi][1] += sample[i][1]; acc[bi][2] += sample[i][2]; acc[bi][3]++;
      }
      for (let c = 0; c < k; c++) if (acc[c][3] > 3) cents[c] = [acc[c][0] / acc[c][3], acc[c][1] / acc[c][3], acc[c][2] / acc[c][3]];
    }
    for (let i = 0; i < W * H; i++) {
      let bi = 0, bd = 1e9;
      for (let c = 0; c < k; c++) {
        const dd = (d[i * 4] - cents[c][0]) ** 2 + (d[i * 4 + 1] - cents[c][1]) ** 2 + (d[i * 4 + 2] - cents[c][2]) ** 2;
        if (dd < bd) { bd = dd; bi = c; }
      }
      assign[i] = bi;
    }
    const c = U.canvas(W, H), cg = c.getContext('2d');
    const img = cg.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      img.data[i * 4] = cents[assign[i]][0]; img.data[i * 4 + 1] = cents[assign[i]][1];
      img.data[i * 4 + 2] = cents[assign[i]][2]; img.data[i * 4 + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    return { canvas: c, palette: cents.map(v => `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})`) };
  }
  // soft tone-band canvas: alpha follows darkness inside the band (for washes / smudge)
  function toneCanvas(darkA, W, H, t, w, gamma) {
    const c = U.canvas(W, H), g = c.getContext('2d');
    const img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const d = darkA[i];
      let a = U.clamp((d - (t - w)) / (2 * w));
      a = a * a * (3 - 2 * a);
      img.data[i * 4] = 0; img.data[i * 4 + 1] = 0; img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = Math.round(255 * Math.pow(a, gamma || 1) * 0.95);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------------- the analysis pipeline (cached, chunked) ----------------
  // opts: { detail 0..1, smooth px, hatchGap, bands: [{t,w,gap}], xangle, xgap, stippleGap,
  //         colors, passes: {strokes,hatch,xhatch,stipple,tone,color} }
  const cache = new Map();
  function analyze(src, key, opts, onProgress) {
    const o = Object.assign({ detail: 0.5, smooth: 2, maxDim: 512, hatchGap: 7, colors: 6 }, opts);
    o.passes = Object.assign({ strokes: true, hatch: false, xhatch: false, stipple: false, tone: false, color: false }, o.passes || {});
    const ck = key + '|' + JSON.stringify(o);
    if (cache.has(ck)) return cache.get(ck);
    const h = { ready: false, err: null, progress: 0, data: null, key: ck };
    cache.set(ck, h);
    if (cache.size > 40) { // drop the oldest finished entries
      for (const [k, v] of cache) { if (k !== ck && v.ready) { cache.delete(k); if (cache.size <= 30) break; } }
    }

    const data = { W: 0, H: 0, strokes: [], hatch: null, xhatch: null, stipple: null, tone: null, color: null, gray: null, dark: null, focus: [0.5, 0.5], ready: { strokes: false, all: false } };
    h.data = data;
    const S = { _lines: null, _i: 0 }; // resumable state for the trace step
    let cv, W, H, grayA, darkA, mag, gx, gy, thr;
    const prog = p => { h.progress = p; if (onProgress) onProgress(p); };

    // steps are closures run in slices by U.runJob
    const steps = [];
    let si = 0;
    const stepDefs = [
      () => { // 0: draw + grayscale + blur
        cv = toCanvas(src, o.maxDim); W = cv.width; H = cv.height; data.W = W; data.H = H;
        const g = cv.getContext('2d', { willReadFrequently: true });
        grayA = grayOf(g, W, H);
        grayA = blur(grayA, W, H, Math.max(1, Math.round(o.smooth)));
        darkA = grayA.map(v => 1 - v);
        data.dark = darkA;
        const gc = U.canvas(W, H); gc.getContext('2d').putImageData(toGrayImage(grayA, W, H), 0, 0);
        data.gray = gc;
      },
      () => { // 1: sobel on an unsharp-masked edge source (soft photo edges get amplified),
              // tone bands read the original dark map
        const sharp = new Float32Array(W * H);
        const soft = blur(darkA, W, H, 1);
        for (let i = 0; i < sharp.length; i++) sharp[i] = U.clamp(darkA[i] + (darkA[i] - soft[i]) * 1.5, 0, 1.4);
        const s = sobel(sharp, W, H);
        mag = s.mag; gx = s.gx; gy = s.gy;
        // adaptive threshold: keep the top slice of edges (detail 0 → 3.5%, 1 → 18%)
        const hist = new Uint32Array(64);
        let nz = 0;
        for (let i = 0; i < mag.length; i++) { const v = mag[i]; if (v > 0.02) { hist[Math.min(63, (v * 18) | 0)]++; nz++; } }
        const want = nz * U.lerp(0.035, 0.18, U.clamp(o.detail));
        let acc = 0; thr = 0.04;
        for (let b = 63; b >= 0; b--) { acc += hist[b]; if (acc >= want) { thr = (b + 0.5) / 18; break; } }
      },
      () => { // 2: trace ridges, then simplify+resample (self-resuming slices)
        if (!o.passes.strokes) return;
        if (!S.lines) { S.lines = traceRidges(mag, W, H, thr, 4, 700); S.i = 0; }
        const t0 = performance.now();
        while (S.i < S.lines.length && performance.now() - t0 < 16) {
          const simp = simplify(S.lines[S.i], W, 1.15);
          if (simp.length >= 4) data.strokes.push(strokeProps(resample(simp, 2.4), darkA, W));
          S.i++;
        }
        prog(0.35 + 0.4 * S.i / Math.max(1, S.lines.length));
        return S.i < S.lines.length; // true = stay on this step next slice
      },
      () => { // 3: subject focus (edge-mass centroid)
        let sx = 0, sy = 0, sw = 0;
        for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
          const m = mag[y * W + x];
          if (m < thr) continue;
          const w = m * m;
          sx += x * w; sy += y * w; sw += w;
        }
        if (sw > 0) data.focus = [sx / sw / W, sy / sw / H];
        data.ready.strokes = true;
        prog(0.8);
      },
      () => { // 4: hatch / xhatch / stipple / tone / color as requested
        if (o.passes.hatch) {
          const bands = o.bands || defaultBands(o.hatchGap);
          data.hatch = isophoteHatch(darkA, W, H, 1234 + (o.seed || 0), bands, 260);
        }
      },
      () => {
        if (o.passes.xhatch) {
          const bands = o.bands || defaultBands(o.hatchGap);
          const a = o.xangle != null ? o.xangle : Math.PI / 4;
          data.xhatch = [straightHatch(darkA, W, H, a, bands), straightHatch(darkA, W, H, a + Math.PI / 2, bands.map(b => Object.assign({}, b, { t: Math.min(0.92, b.t + 0.14), gap: b.gap * 1.1 })))];
        }
      },
      () => {
        if (o.passes.stipple) data.stipple = stipple(darkA, W, H, 77 + (o.seed || 0), o.stippleGap || 5);
      },
      () => {
        if (o.passes.tone) {
          data.tone = [toneCanvas(darkA, W, H, 0.42, 0.16, 1), toneCanvas(darkA, W, H, 0.62, 0.16, 1), toneCanvas(darkA, W, H, 0.82, 0.18, 0.8)];
        }
      },
      () => {
        if (o.passes.color) data.color = quantize(cv.getContext('2d', { willReadFrequently: true }), W, H, o.colors, 31 + (o.seed || 0));
        data.ready.all = true;
        prog(1);
      },
    ];
    const finished = () => si >= stepDefs.length;
    const step = () => {
      if (si >= stepDefs.length) return;
      const more = stepDefs[si]();
      if (more !== true) si++;
    };
    const done = err => {
      if (err) { h.err = err; console.error('analysis', key, err); }
      h.ready = true;
      h.progress = 1;
    };
    h.cancel = U.runJob(step, finished, done);
    return h;
  }
  function toGrayImage(a, W, H) {
    const c = U.canvas(W, H).getContext('2d'), img = c.createImageData(W, H);
    for (let i = 0; i < a.length; i++) {
      const v = Math.round(a[i] * 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    return img;
  }
  function defaultBands(gap) {
    return [
      { t: 0.46, w: 0.09, gap: gap * 1.15 },
      { t: 0.58, w: 0.10, gap: gap },
      { t: 0.72, w: 0.11, gap: gap * 0.85 },
      { t: 0.86, w: 0.12, gap: gap * 0.72 },
    ];
  }

  // ---------------- video frames (rotoscope) ----------------
  // Light synchronous analysis of one frame; LRU-cached per (key, frame index).
  const fcache = new Map();
  function frame(src, key, frameIdx, opts) {
    const o = Object.assign({ detail: 0.55, smooth: 2, maxDim: 360 }, opts);
    const ck = key + '|' + frameIdx + '|' + JSON.stringify(o);
    if (fcache.has(ck)) return fcache.get(ck);
    const cv = toCanvas(src, o.maxDim);
    if (!cv) return { strokes: [], W: 1, H: 1, focus: [0.5, 0.5] };
    const W = cv.width, H = cv.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    let grayA = grayOf(g, W, H);
    grayA = blur(grayA, W, H, Math.max(1, Math.round(o.smooth)));
    const darkA = grayA.map(v => 1 - v);
    // unsharp edge source (same as the photo pipeline)
    const sharp = new Float32Array(W * H);
    const soft = blur(darkA, W, H, 1);
    for (let i = 0; i < sharp.length; i++) sharp[i] = U.clamp(darkA[i] + (darkA[i] - soft[i]) * 1.5, 0, 1.4);
    const s = sobel(sharp, W, H);
    const hist = new Uint32Array(64);
    let nz = 0;
    for (let i = 0; i < s.mag.length; i++) { const v = s.mag[i]; if (v > 0.02) { hist[Math.min(63, (v * 18) | 0)]++; nz++; } }
    const want = nz * U.lerp(0.04, 0.2, U.clamp(o.detail));
    let acc = 0, thr = 0.04;
    for (let b = 63; b >= 0; b--) { acc += hist[b]; if (acc >= want) { thr = (b + 0.5) / 18; break; } }
    const lines = traceRidges(s.mag, W, H, thr, 4, 600);
    const strokes = [];
    for (const ln of lines) {
      const simp = simplify(ln, W, 1.1);
      if (simp.length >= 4) strokes.push(strokeProps(resample(simp, 2.4), darkA, W));
    }
    let sx = 0, sy = 0, sw = 0;
    for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
      const m = s.mag[y * W + x]; if (m < thr) continue;
      sx += x * m * m; sy += y * m * m; sw += m * m;
    }
    const out = { strokes, W, H, focus: sw > 0 ? [sx / sw / W, sy / sw / H] : [0.5, 0.5], dark: darkA };
    fcache.set(ck, out);
    if (fcache.size > 260) { // LRU trim
      const ks = fcache.keys();
      for (let i = 0; i < 60; i++) fcache.delete(ks.next().value);
    }
    return out;
  }

  return { analyze, frame, defaultBands, blur, sobel, toneCanvas, quantize };
})();
