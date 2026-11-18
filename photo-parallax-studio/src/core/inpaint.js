// Layered cut-outs: split the photo into depth bands and smear-fill ("in-paint") everything
// nearer than each band, so nearer layers can move without revealing holes.
// Deterministic onion-skin fill + masked box smoothing (the classic "stretched fill" archive look).
window.PP = window.PP || {};
PP.inpaint = (() => {
  const U = PP.util;
  const LOW_MAX = 300;              // inpaint working resolution
  const bandCache = new Map();

  function lowSize(w, h) {
    const s = Math.min(1, LOW_MAX / Math.max(w, h));
    return [Math.max(32, Math.round(w * s)), Math.max(32, Math.round(h * s))];
  }

  // fill `hole` pixels of an RGB field by onion-skin propagation from the boundary, then smooth.
  function diffuseFill(rgb, hole, w, h, passes) {
    const n = w * h;
    const known = new Uint8Array(n);
    let holesLeft = 0;
    for (let i = 0; i < n; i++) { if (hole[i]) holesLeft++; else known[i] = 1; }
    if (!holesLeft) return;
    // onion passes: new pixel = average of 8-neighbour known pixels
    for (let pass = 0; pass < 4096 && holesLeft > 0; pass++) {
      const newly = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (known[j]) { r += rgb[j * 3]; g += rgb[j * 3 + 1]; b += rgb[j * 3 + 2]; c++; }
        }
        if (c) newly.push([i, r / c, g / c, b / c]);
      }
      if (!newly.length) break;
      for (const [i, r, g, b] of newly) { rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b; known[i] = 1; holesLeft--; }
    }
    // smooth the filled area only: blur each channel, restore originals outside the hole
    for (let ch = 0; ch < 3; ch++) {
      const f = new Float32Array(n);
      for (let i = 0; i < n; i++) f[i] = rgb[i * 3 + ch];
      U.blurField(f, w, h, Math.max(1, passes));
      for (let i = 0; i < n; i++) if (hole[i]) rgb[i * 3 + ch] = f[i];
    }
  }

  // inpaint a photo canvas where mask (field-res Float32 0..1) > 0.5.
  // returns a canvas at the photo's size: original pixels outside, smooth smear inside.
  function inpaint(photo, mask, mw, mh, passes = 2) {
    const w = photo.width, h = photo.height;
    const out = U.canvas(w, h), g = out.getContext('2d');
    const holeTest = (x, y) => mask[Math.min(mh - 1, Math.round(y * mh)) * mw + Math.min(mw - 1, Math.round(x * mw))] > 0.5;
    // fast path: no hole
    let any = false;
    for (let i = 0; i < mw * mh && !any; i++) if (mask[i] > 0.5) any = true;
    if (!any) { g.drawImage(photo, 0, 0); return out; }
    const [lw, lh] = lowSize(w, h);
    const lc = U.canvas(lw, lh), lg = lc.getContext('2d');
    lg.drawImage(photo, 0, 0, lw, lh);
    const id = lg.getImageData(0, 0, lw, lh), d = id.data;
    const rgb = new Float32Array(lw * lh * 3), hole = new Uint8Array(lw * lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const i = y * lw + x;
      rgb[i * 3] = d[i * 4]; rgb[i * 3 + 1] = d[i * 4 + 1]; rgb[i * 3 + 2] = d[i * 4 + 2];
      hole[i] = holeTest(x / (lw - 1), y / (lh - 1)) ? 1 : 0;
    }
    diffuseFill(rgb, hole, lw, lh, passes);
    for (let i = 0; i < lw * lh; i++) { d[i * 4] = rgb[i * 3]; d[i * 4 + 1] = rgb[i * 3 + 1]; d[i * 4 + 2] = rgb[i * 3 + 2]; d[i * 4 + 3] = 255; }
    // paint the smear at full size, then restore the original photo where there was no hole
    g.imageSmoothingQuality = 'high';
    g.drawImage(lc, 0, 0, w, h);
    // keep-mask: opaque where NOT a hole, upscaled for a soft border
    const keep = U.canvas(mw, mh), kg = keep.getContext('2d');
    const kid = kg.createImageData(mw, mh);
    for (let i = 0; i < mw * mh; i++) kid.data[i * 4 + 3] = mask[i] > 0.5 ? 0 : 255;
    kg.putImageData(kid, 0, 0);
    const keepBig = U.canvas(Math.min(w, 720), Math.min(h, 720));
    const kb = keepBig.getContext('2d');
    kb.imageSmoothingQuality = 'high';
    kb.drawImage(keep, 0, 0, keepBig.width, keepBig.height);
    const orig = U.canvas(w, h), og = orig.getContext('2d');
    og.drawImage(photo, 0, 0);
    og.globalCompositeOperation = 'destination-in';
    og.imageSmoothingQuality = 'high';
    og.drawImage(keepBig, 0, 0, w, h);
    g.drawImage(orig, 0, 0);
    return out;
  }

  // depth -> equal-area band thresholds
  function thresholds(field, N) {
    const hist = new Array(64).fill(0);
    const n = field.d.length;
    for (let i = 0; i < n; i++) hist[Math.min(63, Math.floor(field.d[i] * 64))]++;
    const th = [0];
    let acc = 0, target = n / N;
    for (let b = 0; b < 64 && th.length < N; b++) {
      acc += hist[b];
      if (acc >= target * (th.length)) th.push((b + 1) / 64);
    }
    while (th.length < N) th.push(1.001);
    th[N] = 1.001;
    return th;
  }

  // build the band stack for a shot: list far -> near of { canvas, depth }
  function bands(shot, photo, field, mediaKey) {
    const dep = shot.depth || {};
    const N = Math.max(1, Math.min(8, Math.round(dep.bands || 4)));
    const key = [mediaKey, N, field.w + 'x' + field.h, field.tag || '', (dep.focus || []).join(','), dep.mode || 'auto',
      dep.strength == null ? 1 : dep.strength, dep.seed || 1, PP.depth ? '' : '', strokesKey(dep.strokes)].join('|');
    if (bandCache.has(key)) return bandCache.get(key);

    const fw = field.w, fh = field.h, d = field.d;
    const th = thresholds(field, N);
    const feather = Math.max(1, Math.round(fw / 160));
    const list = [];
    for (let b = 0; b < N; b++) {
      // union of masks NEARER than band b  (bands b+1 .. N-1)
      const near = new Float32Array(fw * fh);
      for (let i = 0; i < fw * fh; i++) near[i] = d[i] >= th[b + 1] ? 1 : 0;
      // feather the removal mask a little so band borders stay soft
      const nearSoft = new Float32Array(near); U.blurField(nearSoft, fw, fh, feather);
      for (let i = 0; i < nearSoft.length; i++) nearSoft[i] = U.clamp((nearSoft[i] - 0.35) / 0.3);
      const canvas = inpaint(photo, b === N - 1 ? new Float32Array(fw * fh) : nearSoft, fw, fh, 2);
      // mean depth of this band
      let sum = 0, cnt = 0;
      for (let i = 0; i < fw * fh; i++) if (d[i] >= th[b] && d[i] < th[b + 1]) { sum += d[i]; cnt++; }
      list.push({ canvas, depth: cnt ? sum / cnt : (th[b] + th[b + 1]) / 2 });
    }
    const out = { list, N, th };
    if (bandCache.size > 24) bandCache.clear();
    bandCache.set(key, out);
    return out;
  }
  function strokesKey(strokes) {
    if (!strokes || !strokes.length) return 0;
    let s = 2166136261;
    const str = JSON.stringify(strokes);
    for (let i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619); }
    return (s >>> 0).toString(36);
  }

  // cheap defocus blur without ctx.filter: downscale then upscale
  function blurred(src, radius) {
    if (radius <= 0.01) return src;
    const k = U.clamp(radius, 0.02, 0.5);
    const w = Math.max(8, Math.round(src.width * (1 - k))), h = Math.max(8, Math.round(src.height * (1 - k)));
    const c = U.canvas(src.width, src.height), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    g.drawImage(c === src ? src : c, 0, 0, w, h, 0, 0, src.width, src.height);
    // two-step for stronger blur
    if (k > 0.25) {
      const w2 = Math.max(8, Math.round(src.width * (1 - k) * 0.6)), h2 = Math.max(8, Math.round(src.height * (1 - k) * 0.6));
      const t = U.canvas(w2, h2); const tg = t.getContext('2d');
      tg.imageSmoothingQuality = 'high'; tg.drawImage(c, 0, 0, w2, h2);
      g.clearRect(0, 0, src.width, src.height);
      g.drawImage(t, 0, 0, src.width, src.height);
    }
    return c;
  }

  return { bands, inpaint, blurred, thresholds };
})();
