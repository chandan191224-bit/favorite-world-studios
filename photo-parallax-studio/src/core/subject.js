// Subject cut-out mode (Favorite World, 2026-11-15 — the Nitish Rajput "3-layer" frame):
//   back  = the photo with the subject in-painted away, blurred / darkened / desaturated / tinted
//   middle= text and atmosphere that should sit BEHIND the subject (anything with depth < subject depth)
//   front = the subject cut out by depth, with a warm gold / cyan rim glow and its own slow zoom ("pop")
// Everything heavy (matte, clean plate, looks, rim) is built once per photo and cached; a frame is 3 draws.
window.PP = window.PP || {};
PP.subject = (() => {
  const U = PP.util;
  const DEF = {
    on: false,
    cut: 0,          // 0 = automatic (just under the focus point's depth); else depth 0..1 where the subject starts
    soft: 0.025,     // edge softness of the cut (depth units: small = crisp edge, no glow showing through)
    depth: 0.8,      // where the subject sits in the depth stack (text below this goes behind it)
    pop: 0.06,       // extra zoom of the subject over the shot (independent of the background)
    bgBlur: 0.35, bgDim: 0.3, bgSat: 0.55, bgTint: '#0e3a46', bgTintAmt: 0,
    fgSat: 1, fgContrast: 1.06,
    rim: '#ffb547', rimWidth: 0.35, rimGlow: 0.5, rimAmt: 0.9,
  };
  const STYLES = [
    ['gold', 'Warm gold rim, soft background'], ['bw-subject', 'B&W subject, colour background'],
    ['teal-bg', 'Teal background, colour subject'], ['clean', 'Clean cut-out (no rim)'],
  ];
  // one-click styles (also used by the presets)
  const STYLE_SET = {
    gold: { rim: '#ffb547', rimAmt: 0.9, bgSat: 0.55, bgDim: 0.3, bgBlur: 0.35, bgTintAmt: 0, fgSat: 1 },
    'bw-subject': { rim: '#ffbf5e', rimAmt: 1, fgSat: 0, fgContrast: 1.18, bgSat: 1, bgDim: 0.22, bgBlur: 0.25, bgTintAmt: 0 },
    'teal-bg': { rim: '#59e3ff', rimAmt: 0.85, bgSat: 0.15, bgDim: 0.35, bgBlur: 0.3, bgTint: '#0e3a46', bgTintAmt: 0.55, fgSat: 1.1 },
    clean: { rimAmt: 0, bgSat: 1, bgDim: 0.12, bgBlur: 0.12, bgTintAmt: 0, fgSat: 1 },
  };
  const cache = new Map();
  const put = (k, v) => { if (cache.size > 40) cache.clear(); cache.set(k, v); return v; };

  function opts(shot) { return Object.assign({}, DEF, shot.subject || {}); }
  function on(shot) { return !!(shot && shot.subject && shot.subject.on); }

  // matte (smooth contour at full resolution), cut-out and clean plate
  function layers(plate, field, focusD, o, mk) {
    const cut = o.cut > 0 ? o.cut : U.clamp(focusD - 0.1, 0.05, 0.95);
    const soft = Math.max(0.005, +o.soft || 0.025);
    const key = ['L', mk, field.w + 'x' + field.h, field.tag || '', cut.toFixed(3), soft.toFixed(3)].join('|');
    if (cache.has(key)) return cache.get(key);
    const W = plate.width, H = plate.height, fw = field.w, fh = field.h, d = field.d;
    // depth -> greyscale, upscaled with smoothing, then thresholded: the cut follows a smooth contour
    const dc = U.canvas(fw, fh), dg = dc.getContext('2d'), id = dg.createImageData(fw, fh);
    for (let i = 0; i < fw * fh; i++) { const v = Math.round(U.clamp(d[i]) * 255); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    dg.putImageData(id, 0, 0);
    const mw = Math.min(W, 1280), mh = Math.max(1, Math.round(H * mw / W));
    const mc = U.canvas(mw, mh), mg = mc.getContext('2d');
    mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high';
    mg.drawImage(dc, 0, 0, mw, mh);
    const md = mg.getImageData(0, 0, mw, mh), px = md.data;
    const lo = (cut - soft) * 255, hi = (cut + soft) * 255;
    let cov = 0;
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i];
      const a = v <= lo ? 0 : v >= hi ? 255 : Math.round(255 * U.smooth((v - lo) / (hi - lo)));
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a;
      if (a > 127) cov++;
    }
    mg.putImageData(md, 0, 0);
    const fg = U.canvas(W, H), fgc = fg.getContext('2d');
    fgc.drawImage(plate, 0, 0, W, H);
    fgc.globalCompositeOperation = 'destination-in';
    fgc.imageSmoothingQuality = 'high';
    fgc.drawImage(mc, 0, 0, W, H);
    // clean plate: in-paint a little wider than the subject so no halo stays behind it
    const hole = new Float32Array(fw * fh);
    for (let i = 0; i < fw * fh; i++) hole[i] = d[i] >= cut - soft * 2 ? 1 : 0;
    U.blurField(hole, fw, fh, Math.max(1, Math.round(fw / 110)));
    for (let i = 0; i < hole.length; i++) hole[i] = hole[i] > 0.12 ? 1 : 0;
    const bg = PP.inpaint.inpaint(plate, hole, fw, fh, 2);
    return put(key, { key, fg, bg, cut, cov: cov / (mw * mh) });
  }

  function filtered(src, filter, tint, tintAmt) {
    const c = U.canvas(src.width, src.height), g = c.getContext('2d');
    g.filter = filter || 'none';
    g.drawImage(src, 0, 0);
    g.filter = 'none';
    if (tintAmt > 0.01) {
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = tintAmt * 0.75; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);   // colour wash
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = tintAmt * 0.35; g.fillRect(0, 0, c.width, c.height);                        // deepen shadows
    }
    return c;
  }

  function looks(L, o, W) {
    const blurPx = Math.max(0, +o.bgBlur || 0) * W * 0.012;
    const bgKey = ['B', L.key, blurPx.toFixed(1), o.bgSat, o.bgDim, o.bgTint, o.bgTintAmt].join('|');
    const bg = cache.get(bgKey) || put(bgKey, filtered(L.bg,
      `blur(${blurPx.toFixed(1)}px) saturate(${U.clamp(+o.bgSat, 0, 2)}) brightness(${U.clamp(1 - (+o.bgDim || 0), 0.05, 1.5)})`,
      o.bgTint || '#0e3a46', +o.bgTintAmt || 0));
    const fgKey = ['F', L.key, o.fgSat, o.fgContrast].join('|');
    const fg = cache.get(fgKey) || put(fgKey, filtered(L.fg, `saturate(${U.clamp(+o.fgSat, 0, 2)}) contrast(${U.clamp(+o.fgContrast || 1, 0.5, 2)})`));
    let rim = null;
    if ((+o.rimAmt || 0) > 0.01) {
      const rimKey = ['R', L.key, o.rim, o.rimWidth, o.rimGlow, o.rimAmt].join('|');
      rim = cache.get(rimKey) || put(rimKey, rimLayer(L.fg, o, W));
    }
    return { bg, fg, rim };
  }

  // silhouette in the rim colour -> soft outer glow + a thin hard edge around the subject
  function rimLayer(fg, o, Wout) {
    const w = fg.width, h = fg.height, k = w / Wout;
    const sil = U.canvas(w, h), sg = sil.getContext('2d');
    sg.drawImage(fg, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = o.rim || '#ffb547'; sg.fillRect(0, 0, w, h);
    const c = U.canvas(w, h), g = c.getContext('2d');
    const glow = Math.max(0, +o.rimGlow || 0) * Wout * 0.018 * k;
    const edge = Math.max(0.5, (+o.rimWidth || 0.35) * Wout * 0.0042 * k);
    const amt = U.clamp(+o.rimAmt || 0, 0, 1.5);
    if (glow > 0.5) {
      g.filter = `blur(${glow.toFixed(1)}px)`;
      g.globalAlpha = Math.min(1, amt * 0.95);
      g.drawImage(sil, 0, 0); g.drawImage(sil, 0, 0);
      g.filter = 'none';
    }
    // keep the glow OUTSIDE the subject (soft parts of the cut must not turn gold/cyan): erase the silhouette
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(sil, 0, 0); g.drawImage(sil, 0, 0);
    g.globalCompositeOperation = 'source-over';
    // thin hard edge = silhouette grown by `edge` px minus the silhouette itself (a ring that sits outside)
    const ring = U.canvas(w, h), rg = ring.getContext('2d');
    for (let a = 0; a < 16; a++) {
      const t = a / 16 * Math.PI * 2;
      rg.drawImage(sil, Math.cos(t) * edge, Math.sin(t) * edge);
    }
    rg.globalCompositeOperation = 'destination-out';
    rg.drawImage(sil, 0, 0); rg.drawImage(sil, 0, 0);
    g.globalAlpha = Math.min(1, amt);
    g.drawImage(ring, 0, 0);
    g.globalAlpha = 1;
    return c;
  }

  // draw the whole shot in cut-out mode. `over` = the engine's overscan so moves never show an edge.
  function draw(g, shot, plate, field, cam, focus, K, W, H, mids, mk, p, focusD, over) {
    const o = opts(shot);
    const L = layers(plate, field, focusD, o, mk);
    const V = looks(L, o, W);
    const Kp = Math.max(0.35, K == null ? 0.65 : K);
    const sd = o.depth == null ? 0.8 : +o.depth;
    g.save();
    g.translate(W / 2, H / 2); g.scale(over, over); g.translate(-W / 2, -H / 2);
    g.save(); PP.moves.applyLayer(g, cam, 0.15, Kp, focus, W, H); g.drawImage(V.bg, 0, 0, W, H); g.restore();
    let mi = 0;
    while (mi < mids.length && mids[mi].depth < sd) mids[mi++].draw(g);
    g.save();
    PP.moves.applyLayer(g, cam, 1, Kp, focus, W, H);
    const pz = 1 + (+o.pop || 0) * U.ease.inOut(U.clamp(p));
    g.translate(focus[0] * W, focus[1] * H); g.scale(pz, pz); g.translate(-focus[0] * W, -focus[1] * H);
    if (V.rim) g.drawImage(V.rim, 0, 0, W, H);
    g.drawImage(V.fg, 0, 0, W, H);
    g.restore();
    while (mi < mids.length) mids[mi++].draw(g);
    g.restore();
    return L;
  }

  // share of the frame that is "subject" for a shot (UI hint: <3% or >70% means the cut needs moving)
  function coverage(shot, plate, field, focusD, mk) { return layers(plate, field, focusD, opts(shot), mk).cov; }

  return { DEF, STYLES, STYLE_SET, opts, on, draw, coverage, clear: () => cache.clear() };
})();
