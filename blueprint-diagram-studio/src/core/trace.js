// Photo -> line art: downscale, Sobel edges, coarse-grid quantise, marching-squares contour
// tracing, RDP simplify. Deterministic; result cached per image + options. The output strokes
// draw on like any other blueprint drawing ("trace your photo and draw THAT on").
BD.trace = (() => {
  const U = BD.util;
  const cache = new Map(); // key -> {strokes, ar}

  function sobel(gray, w, h) {
    const out = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] + gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      out[i] = Math.hypot(gx, gy);
    }
    return out;
  }

  // marching squares segments on a padded binary grid; returns chained polylines in cell units
  function contours(bin, gw, gh) {
    // edge midpoints per cell: 0 top, 1 right, 2 bottom, 3 left
    const EP = c => [[c[0] + 0.5, c[1]], [c[0] + 1, c[1] + 0.5], [c[0] + 0.5, c[1] + 1], [c[0], c[1] + 0.5]];
    const segs = [];
    for (let y = 0; y < gh - 1; y++) for (let x = 0; x < gw - 1; x++) {
      const TL = bin[y * gw + x], TR = bin[y * gw + x + 1], BR = bin[(y + 1) * gw + x + 1], BL = bin[(y + 1) * gw + x];
      const c = (TL ? 1 : 0) | (TR ? 2 : 0) | (BR ? 4 : 0) | (BL ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const ep = EP([x, y]);
      const add = (a, b) => segs.push([ep[a], ep[b]]);
      switch (c) {
        case 1: add(3, 0); break;   case 2: add(0, 1); break;   case 3: add(3, 1); break;   case 4: add(1, 2); break;
        case 6: add(0, 2); break;   case 7: add(3, 2); break;   case 8: add(2, 3); break;   case 9: add(0, 2); break;
        case 11: add(1, 2); break;  case 12: add(3, 1); break;  case 13: add(0, 1); break;  case 14: add(3, 0); break;
        case 5: case 10: {
          // saddle: connect through the cell centre value
          const centre = (bin[y * gw + x] + bin[y * gw + x + 1] + bin[(y + 1) * gw + x + 1] + bin[(y + 1) * gw + x]) > 2;
          if ((c === 5) === centre) { add(3, 2); add(0, 1); } else { add(3, 0); add(1, 2); }
          break;
        }
      }
    }
    // chain segments into polylines (grid contours are closed loops because the border is padded)
    const key = p => p[0].toFixed(2) + ',' + p[1].toFixed(2);
    const map = new Map();
    segs.forEach((s, i) => { for (const p of s) { const k = key(p); if (!map.has(k)) map.set(k, []); map.get(k).push(i); } });
    const used = new Array(segs.length).fill(false);
    const lines = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const pts = [segs[i][0], segs[i][1]];
      // extend forward then backward
      for (let dir = 0; dir < 2; dir++) {
        for (let guard = 0; guard < 100000; guard++) {
          const end = dir === 0 ? pts[pts.length - 1] : pts[0];
          const cand = (map.get(key(end)) || []).filter(j => !used[j]);
          if (!cand.length) break;
          const j = cand[0];
          used[j] = true;
          const s = segs[j];
          const nxt = key(s[0]) === key(end) ? s[1] : s[0];
          const closed = key(nxt) === key(dir === 0 ? pts[0] : pts[pts.length - 1]);
          if (dir === 0) pts.push(nxt); else pts.unshift(nxt);
          if (closed) break; // loop closed
        }
      }
      lines.push(pts);
    }
    return lines;
  }

  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      let maxD = -1, maxI = -1;
      for (let i = a + 1; i < b; i++) {
        // closed contours have pts[0] == pts[last] (zero-length chord): fall back to point distance
        const d = L < 1e-9 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
        if (d > maxD) { maxD = d; maxI = i; }
      }
      if (maxD > eps && maxI > 0) { keep[maxI] = true; stack.push([a, maxI], [maxI, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  // img: HTMLImageElement or Canvas. o: {maxW=360, cell=5, thresh=80, eps=1.6, minLen=12, maxStrokes=240}
  const idMap = new WeakMap(); let idSeq = 1;
  function photo(img, o = {}) {
    if (img && !idMap.has(img)) idMap.set(img, idSeq++);
    const key = JSON.stringify([o.maxW || 360, o.cell || 5, o.thresh || 80, o.eps || 1.6, o.minLen || 12, o.maxStrokes || 240, img ? idMap.get(img) : 0]);
    if (cache.has(key)) return cache.get(key);
    const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height;
    if (!iw || !ih) return { strokes: [], ar: 16 / 9 };
    const maxW = o.maxW || 360, k = Math.min(1, maxW / iw);
    const w = Math.max(16, Math.round(iw * k)), h = Math.max(16, Math.round(ih * k));
    const c = U.canvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
    const edge = sobel(gray, w, h);
    // adaptive threshold: keep the top `thresh`% of gradient magnitudes (robust across photos —
    // a fixed absolute cut is too dark/light dependent). Exact quantile from a fixed-stride sample.
    const pct = U.clamp((o.thresh == null ? 12 : o.thresh) / 100, 0.02, 0.6);
    const sample = [];
    const stepS = Math.max(1, Math.floor(edge.length / 2000));
    for (let i = 0; i < edge.length; i += stepS) sample.push(edge[i]);
    sample.sort((a, b) => a - b);
    const thr = Math.max(20, sample[Math.min(sample.length - 1, Math.floor(sample.length * (1 - pct)))] || 40);
    // coarse grid: max edge per cell, padded border
    const cell = o.cell || 5;
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const bin = new Uint8Array(gw * gh);
    for (let y = 0; y < gh - 2; y++) for (let x = 0; x < gw - 2; x++) {
      let m = 0;
      for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) {
        const px = x * cell + xx, py = y * cell + yy;
        if (px < w && py < h) { const v = edge[py * w + px]; if (v > m) m = v; }
      }
      bin[(y + 1) * gw + (x + 1)] = m >= thr ? 1 : 0;
    }
    let lines = contours(bin, gw, gh);
    // to image px, simplify, filter, sort big-first
    const eps = o.eps == null ? 1.6 : o.eps, minLen = o.minLen == null ? 12 : o.minLen;
    const strokes = [];
    for (let raw of lines) {
      const pts = raw.map(p => [(p[0] - 1) * cell, (p[1] - 1) * cell]);
      const sp = rdp(pts, eps);
      if (sp.length >= 4 && U.polyLen(sp) >= minLen) strokes.push(sp);
    }
    strokes.sort((a, b) => U.polyLen(b) - U.polyLen(a));
    const out = strokes.slice(0, o.maxStrokes || 240).map(sp => sp.map(p => [p[0] / w, p[1] / h]));
    const res = { strokes: out, ar: w / h };
    if (cache.size > 12) cache.clear();
    cache.set(key, res);
    return res;
  }
  return { photo };
})();
