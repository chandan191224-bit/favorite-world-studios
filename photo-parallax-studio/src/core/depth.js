// Depth fields: automatic (Depth Anything V2 Small, int8 ONNX, runs locally), heuristic fallback,
// manual painted strokes on top. d(x,y) in [0..1], 1 = nearest to camera.
window.PP = window.PP || {};
PP.depth = (() => {
  const U = PP.util;
  const FIELD_MAX = 288;            // working resolution of the depth field
  const photoCache = new Map();     // sourceKey -> {f,w,h} auto depth in PHOTO space (ONNX, once per photo)
  const plateCache = new Map();     // sourceKey|plateDims -> {f,w,h} auto depth in plate space (cheap resample)
  const plateJobs = new Map();
  const fieldCache = new Map();

  // ---------- heuristic depth (no model): bottom-near, focus subject bump, gentle noise ----------
  function heuristic(w, h, focus, seed) {
    const f = new Float32Array(w * h);
    const [fx, fy] = focus || [0.5, 0.55];
    const s = seed || 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / (w - 1), v = y / (h - 1);
      const dx = (u - fx) / 0.34, dy = (v - fy) / 0.42;
      const subj = Math.exp(-(dx * dx + dy * dy));          // subject blob at the focus point
      const ground = 0.62 - 0.5 * v;                        // lower in frame = nearer
      const n = 0.10 * U.fbm2(u * 3.4, v * 2.6, s);
      f[y * w + x] = U.clamp(0.16 + 0.36 * Math.max(0, ground) + 0.5 * subj + n, 0, 1);
    }
    // soften
    return U.blurField(f, w, h, 2);
  }

  // ---------- auto depth via ONNX (Depth Anything V2 Small q8) ----------
  // Runs ONCE per photo in photo space; plates of any size just resample the cached result
  // through their cover-crop mapping.
  async function autoPhoto(img, sourceKey) {
    if (photoCache.has(sourceKey)) return photoCache.get(sourceKey);
    const A = PP.assets;
    if (!A.ortAvailable()) throw new Error('Auto depth files not found (models/depth-model.js, vendor/ort/ort-assets.js)');
    const session = await A.getSession();
    const SIZE = 518;
    // preprocess: resize to 518x518, normalize with ImageNet mean/std, NCHW float32
    const c = U.canvas(SIZE, SIZE), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, SIZE, SIZE);
    const id = g.getImageData(0, 0, SIZE, SIZE).data;
    const px = new Float32Array(1 * 3 * SIZE * SIZE);
    const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
    for (let i = 0; i < SIZE * SIZE; i++) {
      for (let ch = 0; ch < 3; ch++) px[ch * SIZE * SIZE + i] = (id[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
    }
    const ort = window.ort;
    const inName = session.inputNames[0], outName = session.outputNames[0];
    const res = await session.run({ [inName]: new ort.Tensor('float32', px, [1, 3, SIZE, SIZE]) });
    const out = res[outName];
    const od = out.data, dims = out.dims; // [1, H, W]
    const oh = dims[dims.length - 2], ow = dims[dims.length - 1];
    // upsample to a photo-space grid (bilinear), min-max normalise; Depth Anything: larger = nearer
    const w = 384, h = Math.max(8, Math.round(384 * img.height / img.width));
    const f = new Float32Array(w * h);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < od.length; i++) { const v = od[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const span = (mx - mn) || 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = (x + 0.5) / w * ow - 0.5, sy = (y + 0.5) / h * oh - 0.5;
      const x0 = Math.max(0, Math.min(ow - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(oh - 1, Math.floor(sy)));
      const x1 = Math.min(ow - 1, x0 + 1), y1 = Math.min(oh - 1, y0 + 1);
      const tx = sx - x0, ty = sy - y0;
      const v = U.lerp(U.lerp(od[y0 * ow + x0], od[y0 * ow + x1], tx), U.lerp(od[y1 * ow + x0], od[y1 * ow + x1], tx), ty);
      f[y * w + x] = (v - mn) / span;
    }
    const r = { f, w, h };
    photoCache.set(sourceKey, r);
    return r;
  }

  // cover-crop mapping of a photo into WxH (same math as sources.drawCover)
  function coverMap(img, W, H) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    return { dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh };
  }

  // plate-space auto depth for a shot source: resamples the photo-space result through the
  // cover crop. Sync result: {f,w,h} plate-space, or 'pending'. With wantPromise, returns the
  // running promise so callers can await the model exactly once per photo.
  function autoForPlate(source, plate, wantPromise) {
    const fw = FIELD_MAX, fh = Math.max(8, Math.round(FIELD_MAX * plate.height / plate.width));
    const sourceKey = source.type === 'demo' ? 'demo:' + source.demo : source.type === 'image' ? 'media:' + source.media : 'x';
    const key = sourceKey + '|' + fw + 'x' + fh;
    if (plateCache.has(key)) return plateCache.get(key);
    if (plateJobs.has(key)) return wantPromise ? plateJobs.get(key) : 'pending';
    const img = plate.__img;
    // The model runs on the page thread (several seconds per photo), so it only runs for real photos —
    // drawn demo scenes use the estimate — and never from library thumbnails (noStart).
    if (!img || (api.noStart && !wantPromise)) return null;
    const run = (async () => {
      const base = await autoPhoto(img, sourceKey);
      // map plate pixels -> photo pixels -> sample base
      const m = coverMap(img, plate.width, plate.height);
      const f = new Float32Array(fw * fh);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const px = ((x + 0.5) / fw * plate.width - m.dx) / m.dw;   // 0..1 in photo space
        const py = ((y + 0.5) / fh * plate.height - m.dy) / m.dh;
        f[y * fw + x] = sample(base, U.clamp(px, 0, 1), U.clamp(py, 0, 1));
      }
      const r = { f, w: fw, h: fh };
      plateCache.set(key, r);
      return r;
    })().then(r => {
      plateJobs.delete(key);
      dispatchEvent(new Event('pp-depth-ready'));   // the editor redraws with the model depth
      return r;
    }).catch(e => { plateJobs.delete(key); throw e; });
    plateJobs.set(key, run);
    return 'pending';
  }
  function sample(field, u, v) {
    const sw = field.w, sh = field.h;
    const sx = u * sw - 0.5, sy = v * sh - 0.5;
    const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
    const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
    const tx = sx - x0, ty = sy - y0;
    return U.lerp(U.lerp(field.f[y0 * sw + x0], field.f[y0 * sw + x1], tx), U.lerp(field.f[y1 * sw + x0], field.f[y1 * sw + x1], tx), ty);
  }

  // ---------- manual strokes ----------
  // strokes: [{ pts: [[x,y],..] normalised, w: width frac, depth: 0..1, op: 'add'|'sub' }]
  // applied in order; 'sub' erases earlier strokes back to the base depth.
  function rasterStrokes(strokes, w, h) {
    if (!strokes || !strokes.length) return null;
    const cov = new Float32Array(w * h);   // coverage 0..1
    const val = new Float32Array(w * h);   // painted depth value
    const tmp = U.canvas(w, h), g = tmp.getContext('2d');
    for (const st of strokes) {
      if (!st.pts || !st.pts.length) continue;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      g.lineCap = g.lineJoin = 'round';
      const col = Math.round(U.clamp(st.depth == null ? 1 : st.depth) * 255);
      g.strokeStyle = g.fillStyle = `rgb(${col},${col},${col})`;
      g.lineWidth = Math.max(1, (st.w || 0.06) * w);
      if (st.pts.length === 1) {
        g.beginPath(); g.arc(st.pts[0][0] * w, st.pts[0][1] * h, g.lineWidth / 2, 0, 7); g.fill();
      } else {
        g.beginPath(); g.moveTo(st.pts[0][0] * w, st.pts[0][1] * h);
        for (let i = 1; i < st.pts.length; i++) g.lineTo(st.pts[i][0] * w, st.pts[i][1] * h);
        g.stroke();
      }
      const d = g.getImageData(0, 0, w, h).data;
      const erase = st.op === 'sub';
      for (let i = 0; i < w * h; i++) {
        const a = d[i * 4 + 3] / 255;
        if (a <= 0.003) continue;
        if (erase) cov[i] *= (1 - a);
        else { cov[i] = Math.min(1, cov[i] + a * (1 - cov[i])); val[i] = d[i * 4] / 255; }
      }
    }
    let any = false;
    for (let i = 0; i < cov.length; i++) if (cov[i] > 0.003) { any = true; break; }
    if (!any) return null;
    return { cov, val, w, h };
  }

  function strokesHash(strokes) {
    if (!strokes || !strokes.length) return 0;
    let s = 2166136261;
    const str = JSON.stringify(strokes);
    for (let i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619); }
    return (s >>> 0).toString(36);
  }

  // ---------- combined field for a shot ----------
  // opts.auto: precomputed raw auto depth for this media (or null)
  function field(shot, plateCanvas, opts = {}) {
    const dep = shot.depth || {};
    const w = FIELD_MAX, h = Math.max(8, Math.round(FIELD_MAX * plateCanvas.height / plateCanvas.width));
    const mediaKey = opts.mediaKey || 'x';
    const mode = dep.mode || 'auto';
    // 'A' = model depth, 'H' = estimate: a frame drawn while the model was still running must not
    // pin the estimate in the cache once the model result arrives
    const tag = mode === 'auto' && opts.auto ? 'A' : 'H';
    const key = [mediaKey, mode, tag, (dep.focus || []).join(','), dep.strength == null ? 1 : dep.strength, dep.seed || 1, strokesHash(dep.strokes), w + 'x' + h].join('|');
    if (fieldCache.has(key)) return fieldCache.get(key);

    const focusPhoto = opts.focusPhoto || dep.focus || [0.5, 0.55];
    let f = new Float32Array(w * h);
    const auto = opts.auto;
    if (mode === 'auto' && auto) {
      // resample auto (photo space) to field grid (already same space — field grid uses plate aspect)
      resampleInto(f, w, h, auto);
    } else if (mode === 'flat') {
      f.fill(0.5);
    } else {
      f.set(heuristic(w, h, focusPhoto, dep.seed || 1));
    }
    // manual strokes override (in order)
    const st = rasterStrokes(dep.strokes, w, h);
    if (st) {
      for (let i = 0; i < w * h; i++) {
        const c = st.cov[i];
        if (c > 0.003) f[i] = U.lerp(f[i], st.val[i], c);
      }
    }
    // strength: 0 = flat, 1 = full contrast
    const str = dep.strength == null ? 1 : U.clamp(dep.strength);
    if (str < 1) { for (let i = 0; i < f.length; i++) f[i] = 0.5 + (f[i] - 0.5) * str; }
    // stretch to the full 0..1 range (2%/98% percentiles) so parallax strength is consistent
    // whatever the model's raw output range was
    if (mode !== 'flat') {
      const sorted = Float32Array.from(f).sort();
      const lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)];
      if (hi > lo + 0.02) {
        const span = hi - lo;
        for (let i = 0; i < f.length; i++) f[i] = U.clamp((f[i] - lo) / span);
      }
    }
    // slight smoothing keeps bands/mesh clean
    U.blurField(f, w, h, 1);
    const out = { d: f, w, h, mode, auto: !!auto, tag };
    if (fieldCache.size > 40) fieldCache.clear();
    fieldCache.set(key, out);
    return out;
  }

  function resampleInto(dst, w, h, src) {
    // src: {f,w,h} — bilinear resample
    const sw = src.w, sh = src.h, sf = src.f;
    if (sw === w && sh === h) { dst.set(sf); return; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = (x + 0.5) / w * sw - 0.5, sy = (y + 0.5) / h * sh - 0.5;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
      const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
      const tx = sx - x0, ty = sy - y0;
      dst[y * w + x] = U.lerp(U.lerp(sf[y0 * sw + x0], sf[y0 * sw + x1], tx), U.lerp(sf[y1 * sw + x0], sf[y1 * sw + x1], tx), ty);
    }
  }

  // inferno-style colormap preview (like the research depth tools)
  function colormap(field) {
    const { d, w, h } = field;
    const cv = U.canvas(w, h), g = cv.getContext('2d');
    const id = g.createImageData(w, h), px = id.data;
    for (let i = 0; i < w * h; i++) {
      const t = U.clamp(d[i]);
      const r = Math.round(255 * U.clamp(1.6 * t - 0.15));
      const gch = Math.round(255 * U.clamp(1.7 * Math.sin(Math.PI * U.clamp(t * 1.15 - 0.05))));
      const b = Math.round(255 * U.clamp(1.0 - 2.4 * t + 0.55 * Math.sin(t * 3)));
      px[i * 4] = r; px[i * 4 + 1] = gch; px[i * 4 + 2] = b; px[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return cv;
  }

  // sample depth at a photo point
  function sampleAt(field, px, py) {
    const x = Math.max(0, Math.min(field.w - 1, Math.round(px * field.w)));
    const y = Math.max(0, Math.min(field.h - 1, Math.round(py * field.h)));
    return field.d[y * field.w + x];
  }

  // extra-smoothed copy of a field for the displacement mesh (avoids noisy ripples)
  function smoothForMesh(field) {
    if (field._mesh) return field._mesh;
    const d = new Float32Array(field.d);
    U.blurField(d, field.w, field.h, 4);
    field._mesh = { d, w: field.w, h: field.h };
    return field._mesh;
  }

  function hasAuto() { return PP.assets.ortAvailable(); }
  function clearAuto() { photoCache.clear(); plateCache.clear(); }

  const api = { field, autoForPlate, colormap, sampleAt, smoothForMesh, hasAuto, clearAuto, heuristic, FIELD_MAX, noStart: false };
  return api;
})();
