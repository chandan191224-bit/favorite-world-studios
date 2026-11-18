// The user's photos and video clips, demo placeholders, and cut-out masks.
// CS.media[id] = { kind:'image'|'video', name, el, url, dataUrl?, path?, cut:{ mode, pts, tol, feather, ... }, cutVer }
// Cut-out modes: 'none' (whole photo, hand-cut edge), 'alpha' (PNG with transparency), 'auto' (removes a plain background
// by flood fill from the borders, offline), 'lasso' (polygon drawn by hand), 'ellipse' (oval).
CS.media = CS.media || {};
CS.lib = (() => {
  const U = CS.util;
  const CUT_MODES = [['none', 'No cut-out (whole photo)'], ['alpha', 'Use PNG transparency'], ['auto', 'Auto: remove plain background'], ['lasso', 'Lasso (draw around it)'], ['ellipse', 'Oval']];

  const isReady = m => m && m.el && (m.kind === 'image' ? (m.el.complete && m.el.naturalWidth > 0) : m.el.readyState >= 2);
  function size(m) {
    const el = m.el;
    return [el.videoWidth || el.naturalWidth || el.width || 1, el.videoHeight || el.naturalHeight || el.height || 1];
  }

  function create(kind, name, url, extra = {}) {
    const id = 'm' + U.uid();
    const el = kind === 'image' ? new Image() : document.createElement('video');
    if (kind === 'video') { el.muted = true; el.playsInline = true; el.preload = 'auto'; el.crossOrigin = 'anonymous'; }
    const m = Object.assign({ kind, name, url, el, cut: { mode: 'none' }, cutVer: 1 }, extra);
    el.addEventListener(kind === 'image' ? 'load' : 'loadeddata', () => { m.cutVer++; CS.lib.onReady && CS.lib.onReady(id); });
    el.src = url;
    CS.media[id] = m;
    return id;
  }
  function addFile(file) {
    const kind = file.type.startsWith('video') ? 'video' : 'image';
    const id = create(kind, file.name, URL.createObjectURL(file));
    if (kind === 'image') {
      const fr = new FileReader();
      fr.onload = () => { CS.media[id].dataUrl = fr.result; };
      fr.readAsDataURL(file);
    }
    return id;
  }
  // restore from a saved project entry
  function restore(id, e) {
    const url = e.dataUrl || e.url;
    if (!url) { CS.media[id] = Object.assign({ missing: true }, e); return; }
    const nid = create(e.kind, e.name, url, { dataUrl: e.dataUrl, path: e.path });
    const m = CS.media[nid];
    delete CS.media[nid];
    m.cut = Object.assign({ mode: 'none' }, e.cut || {});
    CS.media[id] = m;
    m.el.addEventListener(m.kind === 'image' ? 'load' : 'loadeddata', () => { m.cutVer++; CS.lib.onReady && CS.lib.onReady(id); });
  }

  // ---------- demo placeholders (so every layout shows something before the user adds photos) ----------
  const PH_HUES = [[205, 60], [28, 70], [150, 40], [350, 55], [265, 40], [45, 75], [185, 50], [10, 45], [95, 35], [320, 35]];
  const phCache = {};
  function placeholder(i) {
    i = ((i % 40) + 40) % 40;
    if (phCache[i]) return phCache[i];
    const W = 960, H = 640, c = U.canvas(W, H), g = c.getContext('2d'), [hue, sat] = PH_HUES[i % PH_HUES.length];
    const r = U.rng(101 + i * 17);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `hsl(${hue},${sat}%,${62 + r() * 10}%)`); sky.addColorStop(1, `hsl(${(hue + 30) % 360},${sat - 10}%,${82}%)`);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = `hsla(50,90%,92%,.9)`; g.beginPath(); g.arc(W * (0.15 + r() * 0.7), H * (0.18 + r() * 0.15), 50 + r() * 30, 0, 7); g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = `hsl(${(hue + 160 + k * 12) % 360},${sat - 15}%,${48 - k * 12}%)`;
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, H * (0.55 + k * 0.12) + U.fbm1(x / 260 + k * 7, 200 + i * 31 + k, 3) * 70);
      g.lineTo(W, H); g.fill();
    }
    // a figure (head + shoulders) — its silhouette is the demo cut-out mask
    const mask = U.canvas(W, H), mg = mask.getContext('2d');
    const fig = new Path2D(), cx = W * (0.5 + (r() - 0.5) * 0.12), top = H * 0.2;
    fig.ellipse(cx, top + 105, 78, 96, 0, 0, Math.PI * 2);
    fig.moveTo(cx - 205, H); fig.bezierCurveTo(cx - 200, H * 0.62, cx - 120, top + 215, cx, top + 212);
    fig.bezierCurveTo(cx + 120, top + 215, cx + 200, H * 0.62, cx + 205, H); fig.closePath();
    mg.fillStyle = '#fff'; mg.fill(fig);
    g.save(); g.clip(fig);
    const body = g.createLinearGradient(0, top, 0, H);
    body.addColorStop(0, `hsl(${(hue + 200) % 360},25%,40%)`); body.addColorStop(1, `hsl(${(hue + 200) % 360},30%,18%)`);
    g.fillStyle = body; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(cx - 220, 0, 160, H);
    g.restore();
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 70, 210, 46);
    g.fillStyle = '#fff'; g.font = `700 30px 'Instrument Sans', sans-serif`; g.textBaseline = 'middle';
    g.fillText('PHOTO ' + (i + 1), 40, H - 47);
    return (phCache[i] = { el: c, w: W, h: H, mask, bbox: [cx / W - 0.22, top / H, cx / W + 0.22, 1], key: 'ph' + i, placeholder: true });
  }

  // ---------- masks ----------
  const maskCache = new Map(); // id -> { ver, canvas, bbox }
  function blurCanvas(src, amount) {
    if (amount <= 0) return src;
    const k = Math.max(1.5, amount), w = Math.max(2, Math.round(src.width / k)), h = Math.max(2, Math.round(src.height / k));
    const small = U.canvas(w, h), sg = small.getContext('2d');
    sg.imageSmoothingQuality = 'high'; sg.drawImage(src, 0, 0, w, h);
    const out = U.canvas(src.width, src.height), og = out.getContext('2d');
    og.imageSmoothingQuality = 'high'; og.drawImage(small, 0, 0, src.width, src.height);
    return out;
  }
  function bboxOf(c) {
    const w = Math.min(c.width, 256), h = Math.max(1, Math.round(c.height * w / c.width));
    const s = U.canvas(w, h), g = s.getContext('2d'); g.drawImage(c, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return [0, 0, 1, 1];
    return [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
  }
  function hasAlpha(m) {
    if (m.kind !== 'image') return false;
    if (m._alpha != null) return m._alpha;
    try {
      const s = U.canvas(64, 64), g = s.getContext('2d'); g.drawImage(m.el, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64).data; let n = 0;
      for (let k = 3; k < d.length; k += 4) if (d[k] < 200) n++;
      m._alpha = n > 40;
    } catch (e) { m._alpha = false; }
    return m._alpha;
  }
  // flood fill the plain background from the borders (tolerance 0..1)
  function autoMask(m, tol = 0.22, feather = 1) {
    const [iw, ih] = size(m), sc = Math.min(1, 640 / Math.max(iw, ih)), w = Math.round(iw * sc), h = Math.round(ih * sc);
    const s = U.canvas(w, h), g = s.getContext('2d'); g.drawImage(m.el, 0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data, bg = new Uint8Array(w * h);
    let br = 0, bgc = 0, bb = 0, n = 0;
    const edge = [];
    for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
    for (const k of edge) { br += d[k * 4]; bgc += d[k * 4 + 1]; bb += d[k * 4 + 2]; n++; }
    br /= n; bgc /= n; bb /= n;
    const T = (tol * 255) ** 2 * 3, Tn = (tol * 0.55 * 255) ** 2 * 3;
    const dist = (k, r, gg, b) => (d[k * 4] - r) ** 2 + (d[k * 4 + 1] - gg) ** 2 + (d[k * 4 + 2] - b) ** 2;
    const q = new Int32Array(w * h); let qh = 0, qt = 0;
    for (const k of edge) if (!bg[k] && (dist(k, br, bgc, bb) < T || d[k * 4 + 3] < 20)) { bg[k] = 1; q[qt++] = k; }
    while (qh < qt) {
      const k = q[qh++], x = k % w, y = (k / w) | 0, r = d[k * 4], gg = d[k * 4 + 1], b = d[k * 4 + 2];
      const nb = [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1];
      for (const j of nb) if (j >= 0 && !bg[j] && (dist(j, br, bgc, bb) < T || dist(j, r, gg, b) < Tn || d[j * 4 + 3] < 20)) { bg[j] = 1; q[qt++] = j; }
    }
    for (let k = 0; k < w * h; k++) { d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = 255; d[k * 4 + 3] = bg[k] ? 0 : 255; }
    g.putImageData(img, 0, 0);
    return blurCanvas(s, feather);
  }
  function polyMask(m, pts, feather) {
    const [iw, ih] = size(m), sc = Math.min(1, 1024 / Math.max(iw, ih)), w = Math.round(iw * sc), h = Math.round(ih * sc);
    const c = U.canvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath();
    pts.forEach(([x, y], k) => (k ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)));
    g.closePath(); g.fill();
    return blurCanvas(c, feather);
  }
  function ellipseMask(m, cut) {
    const [iw, ih] = size(m), sc = Math.min(1, 1024 / Math.max(iw, ih)), w = Math.round(iw * sc), h = Math.round(ih * sc);
    const c = U.canvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath();
    g.ellipse((cut.cx ?? 0.5) * w, (cut.cy ?? 0.45) * h, (cut.rx ?? 0.3) * w, (cut.ry ?? 0.4) * h, 0, 0, Math.PI * 2); g.fill();
    return blurCanvas(c, cut.feather || 0);
  }
  // returns { canvas|null, bbox } — null canvas = whole rectangle
  function mask(m) {
    const id = m.key || m.name;
    const cut = m.cut || { mode: 'none' };
    const mode = cut.mode === 'none' && hasAlpha(m) ? 'alpha' : cut.mode;
    const ver = m.cutVer + ':' + JSON.stringify(cut);
    const hit = maskCache.get(m);
    if (hit && hit.ver === ver) return hit;
    let canvas = null;
    try {
      if (mode === 'alpha' && m.kind === 'image') canvas = m.el;
      else if (mode === 'auto' && m.kind === 'image') canvas = autoMask(m, cut.tol ?? 0.22, cut.feather ?? 1);
      else if (mode === 'lasso' && cut.pts && cut.pts.length > 2) canvas = polyMask(m, cut.pts, cut.feather || 0);
      else if (mode === 'ellipse') canvas = ellipseMask(m, cut);
    } catch (e) { canvas = null; }
    const out = { ver, canvas, bbox: canvas ? bboxOf(canvas) : [0, 0, 1, 1], id };
    maskCache.set(m, out);
    return out;
  }

  // resolve what slot i of a scene shows: { el, w, h, mask, bbox, key, video, slot }
  function slotSource(scene, i) {
    const slots = scene.slots || [];
    let s = slots[i], m = s && CS.media[s.m];
    if (!s || !s.m) {
      if (i >= slots.length) {
        const filled = slots.filter(x => x && x.m && CS.media[x.m] && !CS.media[x.m].missing);
        if (filled.length) { s = filled[i % filled.length]; m = CS.media[s.m]; }
      }
    }
    if (!m || m.missing || !isReady(m)) {
      const ph = placeholder(i + (scene.seed || 0) % 7);
      return Object.assign({ slot: s || {}, i }, ph);
    }
    const [w, h] = size(m), mk = mask(m);
    return { el: m.el, w, h, mask: mk.canvas, bbox: mk.bbox, key: s.m + ':' + mk.ver, video: m.kind === 'video', slot: s, i, media: m };
  }

  return { CUT_MODES, create, addFile, restore, placeholder, slotSource, size, isReady, blurCanvas, mask, hasAlpha };
})();
