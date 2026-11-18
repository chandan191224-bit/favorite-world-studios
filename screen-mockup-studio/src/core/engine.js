// Shots on a timeline. Each shot = device x screen content x camera move x background x focus (zoom + blur-out).
// render(ctx, proj, t, opts) draws any time t frame-exact; renderShot is also used by thumbnails and QA sheets.
SM.media = SM.media || {}; // id -> { kind: 'image'|'video', name, el, url?, dataUrl?, path? }
SM.engine = (() => {
  const U = SM.util, S = SM.space, C = SM.chrome;

  const SIZES = [['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'], ['1080x1920', '1080×1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square']];

  // ---------- camera moves: deltas over the move window, k = eased progress ----------
  const MOVES = {
    static: { name: 'Static (hold)', f: () => ({}) },
    float: { name: 'Gentle float', loop: true, f: (k, a, t) => ({ yaw: 5 * a * Math.sin(t * 0.9), pitch: 2.5 * a * Math.sin(t * 0.7 + 1), y: 0.012 * a * Math.sin(t * 1.1) }) },
    push: { name: 'Slow push-in', f: (k, a) => ({ zoom: U.lerp(1 - 0.1 * a, 1 + 0.14 * a, k) }) },
    pull: { name: 'Pull back', f: (k, a) => ({ zoom: U.lerp(1 + 0.18 * a, 1 - 0.08 * a, k) }) },
    orbit: { name: 'Orbit left → right', f: (k, a) => ({ yaw: U.lerp(-32, 32, k) * a }) },
    orbitR: { name: 'Orbit right → left', f: (k, a) => ({ yaw: U.lerp(32, -32, k) * a }) },
    swing: { name: 'Swing in (hero entrance)', f: (k, a) => ({ yaw: U.lerp(68, 0, k) * a, pitch: U.lerp(14, 0, k) * a, zoom: U.lerp(0.72, 1, k), roll: U.lerp(-6, 0, k) * a }) },
    rise: { name: 'Tilt up reveal', f: (k, a) => ({ pitch: U.lerp(58, 0, k) * a, zoom: U.lerp(0.82, 1, k) }) },
    drop: { name: 'Drop in from above', f: (k, a) => ({ y: U.lerp(-0.9, 0, k) * a, roll: U.lerp(14, 0, k) * a, pitch: U.lerp(-14, 0, k) * a }) },
    spin: { name: 'Spin in', f: (k, a) => ({ roll: U.lerp(-28, 0, k) * a, yaw: U.lerp(-50, 0, k) * a, zoom: U.lerp(0.45, 1, k) }) },
    pan: { name: 'Side drift', f: (k, a) => ({ x: U.lerp(0.08, -0.08, k) * a, yaw: U.lerp(-8, 8, k) * a }) },
    handheld: { name: 'Handheld shake', loop: true, f: (k, a, t, seed) => ({ yaw: U.fbm1(t * 1.3, seed) * 2.2 * a, pitch: U.fbm1(t * 1.1, seed + 5) * 1.6 * a, roll: U.fbm1(t * 0.9, seed + 9) * 1.4 * a, x: U.fbm1(t * 2.3, seed + 2) * 0.006 * a }) },
    dive: { name: 'Dive into the screen', fill: k => k, f: () => ({}) },
    reveal: { name: 'Reveal: screen → device', fill: k => 1 - k, f: () => ({}) },
    focus: { name: 'Zoom to focus (blur rest)', focus: k => k, f: () => ({}) },
    focusOut: { name: 'Focus, then back out', focus: k => Math.sin(Math.PI * U.clamp(k)), f: () => ({}) },
  };

  // ---------- backgrounds ----------
  const BGS = { studio: 'Dark studio', amber: 'Warm amber', night: 'Night blue', paper: 'Light grey', grid: 'Tech grid', desk: 'Wooden desk', blur: 'Blurred media', color: 'Solid colour', none: 'Transparent' };
  function background(g, bg, W, H, t, env) {
    const id = bg.id || 'studio';
    if (id === 'none') return;
    if (id === 'color') { g.fillStyle = bg.color || '#101216'; g.fillRect(0, 0, W, H); return; }
    if (id === 'blur') {
      const m = env.mediaOf(bg.media || env.mainMedia);
      const s = U.tmp('bgblur', 64, 36), sg = s.getContext('2d');
      sg.imageSmoothingQuality = 'high';
      if (m) C.drawCover(sg, m, 0, 0, 64, 36); else C.placeholder(sg, 0, 0, 64, 36, { seed: 5, label: false });
      const s2 = U.tmp('bgblur2', 16, 9), s2g = s2.getContext('2d'); s2g.imageSmoothingQuality = 'high'; s2g.drawImage(s, 0, 0, 16, 9);
      g.imageSmoothingQuality = 'high'; g.drawImage(s2, 0, 0, W, H);
      g.fillStyle = `rgba(0,0,0,${bg.dim == null ? 0.45 : bg.dim})`; g.fillRect(0, 0, W, H);
      return;
    }
    const pal = { studio: ['#23262e', '#0a0b0e'], amber: ['#5a3a12', '#140c05'], night: ['#1b2a4a', '#05070d'], paper: ['#f4f5f7', '#c9ccd3'], grid: ['#0f1a24', '#04080c'], desk: ['#6a4a2e', '#24170c'] }[id] || ['#23262e', '#0a0b0e'];
    const gr = g.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
    gr.addColorStop(0, bg.color && id !== 'paper' ? U.mix(pal[0], bg.color, 0.5) : pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (id === 'grid') {
      g.strokeStyle = 'rgba(80,200,255,.09)'; g.lineWidth = 1;
      const s = H / 18, off = (t * 8) % s;
      for (let x = -s + off; x < W + s; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
    if (id === 'desk') {
      g.globalAlpha = 0.18; g.strokeStyle = '#2a1a0c';
      for (let i = 0; i < 40; i++) { const y = H * (i / 40); g.lineWidth = 1 + U.h1(i, 4) * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += W / 12) g.lineTo(x, y + U.noise1(x / W * 3 + i, 7) * H * 0.02); g.stroke(); }
      g.globalAlpha = 1;
    }
    // soft spotlight floor glow
    const fl = g.createRadialGradient(W / 2, H * 0.86, 0, W / 2, H * 0.86, W * 0.45);
    fl.addColorStop(0, id === 'paper' ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.05)'); fl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fl; g.fillRect(0, 0, W, H);
  }

  // ---------- shots ----------
  function newShot(spec = {}) {
    return {
      id: U.uid(), name: spec.name || 'Shot', dur: spec.dur || 5, seed: spec.seed || 7,
      device: Object.assign({ id: 'phone' }, spec.device), content: Object.assign({ id: 'media' }, spec.content),
      camera: Object.assign({ move: 'swing', ease: 'inOut', amount: 1, yaw: 0, pitch: 0, roll: 0, zoom: 1, fov: 30, x: 0, y: 0, from: 0, to: 1 }, spec.camera),
      bg: Object.assign({ id: 'studio' }, spec.bg), focus: Object.assign({ auto: true, x: 0.3, y: 0.3, w: 0.4, h: 0.25, zoom: 0.72, blur: 0.8, dim: 0.45 }, spec.focus),
      transition: Object.assign({ type: 'fade', dur: 0.5 }, spec.transition), glare: spec.glare == null ? 0.6 : spec.glare, shadow: spec.shadow == null ? 0.7 : spec.shadow,
    };
  }
  function defaultProject() {
    return { version: 1, name: 'Untitled screen video', width: 1920, height: 1080, fps: 30, shots: SM.presetShots ? SM.presetShots(['phone-hero-photo', 'search-laptop', 'article-zoom']) : [newShot()] };
  }
  function timeline(proj) {
    const segs = []; let t = 0;
    proj.shots.forEach((s, i) => { const d = Math.max(0.2, +s.dur || 1); segs.push({ i, t0: t, t1: t + d }); t += d; });
    return { segs, total: t };
  }
  function segAt(tl, t) { for (const s of tl.segs) if (t < s.t1) return s; return tl.segs[tl.segs.length - 1]; }

  const mediaOf = id => { const m = id && SM.media[id]; if (!m || !m.el) return null; const w = m.el.videoWidth || m.el.naturalWidth || m.el.width, h = m.el.videoHeight || m.el.naturalHeight || m.el.height; return w && h ? { el: m.el, w, h, kind: m.kind } : null; };

  // logical content size for a screen aspect
  function logical(aspect, flat) {
    if (aspect >= 1) { const w = flat ? 1600 : aspect > 2 ? 1800 : 1440; return [w, Math.round(w / aspect)]; }
    const w = flat ? 900 : aspect > 0.62 ? 760 : 440; return [w, Math.round(w / aspect)];
  }

  // Everything about a shot at local time lt that does not need pixels: model, camera, content layout.
  function plan(shot, lt, W, H) {
    const dev = SM.devices.byId[shot.device.id] || SM.devices.byId.phone;
    const DP = Object.assign({}, dev.defaults, shot.device);
    const model = dev.build(DP, { W, H });
    const scr = model.screen, flat = dev.id === 'flat';
    const [LW, LH] = logical(scr.w / scr.h, flat);
    const cdef = SM.content.byId[shot.content.id] || SM.content.byId.media;
    const CP = Object.assign({}, cdef.defaults, shot.content);
    const dur = Math.max(0.2, +shot.dur || 1), p = U.clamp(lt / dur);
    // chrome above the content
    const tall = LH > LW;
    let top = 0;
    if (scr.windowBar) top += 40;
    const wantsStatus = tall && !flat && (cdef.statusBar !== false) && CP.statusBar !== false;
    if (wantsStatus) top += 44;
    const browser = cdef.browser && CP.chrome !== false ? (CP.url || cdef.browser) : null;
    if (browser) top += tall ? 52 : 86;
    const env = { W: LW, H: LH - top, t: lt, dur, p, P: CP, seed: shot.seed || 7, tall: (LH - top) > LW, fps: shot.__fps || 30, media: k => mediaOf(CP[k]), U, F: SM.font, C };
    // camera
    const cam = shot.camera, mv = MOVES[cam.move] || MOVES.static;
    const kRaw = U.range(p, +cam.from || 0, cam.to == null ? 1 : +cam.to), k = mv.loop ? kRaw : (U.ease[cam.ease] || U.ease.inOut)(kRaw);
    const d = mv.f(k, cam.amount == null ? 1 : +cam.amount, lt, shot.seed || 7);
    const b = model.bounds, aspect = W / H, fov = +cam.fov || 30, tanH = Math.tan(fov * S.D / 2);
    const fitH = Math.max(b.h, b.w / aspect) * (b.exact ? 1 : 1.32);
    const zoom = (+cam.zoom || 1) * (d.zoom || 1);
    let dist = fitH / 2 / tanH / zoom;
    const center = S.tp(xfIdent, [b.cx, b.cy, 0]);
    let target = S.add(center, [((+cam.x || 0) + (d.x || 0)) * b.w, ((+cam.y || 0) + (d.y || 0)) * b.h, 0]);
    let yaw = (+cam.yaw || 0) + (d.yaw || 0), pitch = (+cam.pitch || 0) + (d.pitch || 0), roll = (+cam.roll || 0) + (d.roll || 0);
    // screen centre / normal in world
    const sM = scr.M, sc = S.tp(sM, [scr.cx, scr.cy, scr.z]);
    const sn = S.ap(sM.R, [0, 0, 1]);
    const blendTo = (q, tgt, dst, nAngles) => {
      target = [U.lerp(target[0], tgt[0], q), U.lerp(target[1], tgt[1], q), U.lerp(target[2], tgt[2], q)];
      dist = U.lerp(dist, dst, q);
      // face the screen head-on: yaw/pitch from the screen normal
      const fy = Math.atan2(sn[0], sn[2]) / S.D, fp = Math.asin(U.clamp(sn[1], -1, 1)) / S.D;
      yaw = U.lerp(yaw, fy + (nAngles ? nAngles[0] : 0), q); pitch = U.lerp(pitch, fp + (nAngles ? nAngles[1] : 0), q); roll = U.lerp(roll, 0, q);
    };
    let focusRect = null, focusAmt = 0;
    if (mv.fill) {
      const q = mv.fill(k), fillDist = Math.min(scr.h, scr.w / aspect) / 2 / tanH * 0.985;
      blendTo(q, sc, fillDist);
    }
    if (mv.focus) {
      const fr = focusOf(shot, cdef, env, LW, LH, top);
      focusRect = fr; focusAmt = mv.focus(k);
      const fx = scr.cx - scr.w / 2 + (fr.x + fr.w / 2) / LW * scr.w, fy = scr.cy + scr.h / 2 - (fr.y + fr.h / 2) / LH * scr.h;
      const fw = fr.w / LW * scr.w, fh = fr.h / LH * scr.h, fz = U.clamp(+shot.focus.zoom || 0.7, 0.2, 0.95);
      const fdist = Math.max(fh, fw / aspect) / fz / 2 / tanH;
      blendTo(focusAmt, S.tp(sM, [fx, fy, scr.z]), Math.min(dist, fdist));
    }
    const camera = S.camera({ W, H, fov, target, dist, yaw, pitch, roll });
    return { dev, DP, model, scr, LW, LH, top, cdef, CP, env, camera, browser, wantsStatus, flat, focusRect, focusAmt, p };
  }
  const xfIdent = S.xf();

  function focusOf(shot, cdef, env, LW, LH, top) {
    const f = shot.focus || {};
    let r = null;
    if (f.auto !== false && cdef.focus) { try { r = cdef.focus(env); } catch (e) { r = null; } }
    if (r) return { x: r.x, y: r.y + top, w: Math.max(10, r.w), h: Math.max(10, r.h) };
    return { x: (+f.x || 0) * LW, y: (+f.y || 0) * LH, w: Math.max(0.02, +f.w || 0.4) * LW, h: Math.max(0.02, +f.h || 0.25) * LH };
  }

  // screen content -> canvas at resolution k (px per logical px)
  function drawScreen(pl, shot, k, slot) {
    const { LW, LH, top, cdef, env, scr, model } = pl;
    const c = U.tmp('scr' + slot, LW * k, LH * k), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    let y = 0;
    const dark = pl.CP.dark !== false && pl.CP.theme !== 'light';
    if (scr.windowBar) y += C.windowBar(g, LW, { theme: scr.windowBar, title: pl.CP.windowTitle || cdef.name });
    if (pl.wantsStatus) {
      g.fillStyle = pl.CP.statusBg || (cdef.lightStatus ? '#ffffff' : '#000000'); g.fillRect(0, y, LW, 44);
      C.statusBar(g, LW, { color: cdef.lightStatus ? '#111' : '#fff', time: pl.CP.phoneTime || '9:41' }); y += 44;
    }
    if (pl.browser) {
      if (LH > LW) y += C.mobileUrl(g, LW, y, { url: pl.browser, dark: pl.CP.browserDark });
      else { g.save(); g.translate(0, y); y += C.browserBar(g, LW, { url: pl.browser, title: pl.CP.tabTitle || pl.CP.siteName || cdef.name, dark: pl.CP.browserDark }); g.restore(); }
    }
    g.save(); g.translate(0, top); g.beginPath(); g.rect(0, 0, LW, LH - top); g.clip();
    try { cdef.draw(g, env); } catch (e) { g.fillStyle = '#400'; g.fillRect(0, 0, LW, LH); g.fillStyle = '#fff'; g.font = SM.font(600, 20); g.fillText('content error: ' + e.message, 20, 40); if (!window.__HEADLESS) console.error(e); }
    g.restore();
    if (model.screenFx) { g.save(); model.screenFx(g, LW, LH, env.t); g.restore(); }
    return c;
  }

  // blur by down/up-sampling (no ctx.filter: works on phones too)
  function softBlur(src, W, H, amount, key = 'blur') {
    const f = U.lerp(4, 22, U.clamp(amount));
    const a = U.tmp(key + 'a', W / f, H / f), ag = a.getContext('2d'); ag.imageSmoothingQuality = 'high'; ag.clearRect(0, 0, a.width, a.height); ag.drawImage(src, 0, 0, a.width, a.height);
    const b = U.tmp(key + 'b', W / f * 2, H / f * 2), bg = b.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.clearRect(0, 0, b.width, b.height); bg.drawImage(a, 0, 0, b.width, b.height);
    return b;
  }

  // Draw one shot at local time lt. mode: composite|green|blue|alpha|matte|screenkey|screenmatte
  function renderShot(ctx, shot, lt, W, H, mode = 'composite', slot = 'A', quality = 1) {
    const pl = plan(shot, lt, W, H), { model, scr, camera } = pl;
    ctx.save();
    const matteScreen = mode === 'screenmatte', matte = mode === 'matte';
    // background
    if (mode === 'composite' || mode === 'screenkey') background(ctx, shot.bg || {}, W, H, lt, { mediaOf, mainMedia: shot.content.media });
    else if (mode === 'green' || mode === 'blue') { ctx.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff'; ctx.fillRect(0, 0, W, H); }
    else if (matte || matteScreen) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    // element layer (separate for matte / focus blur)
    const needLayer = matte || (pl.focusAmt > 0.001 && shot.focus.blur > 0);
    const L = needLayer ? U.tmp('layer' + slot, W, H) : null, g = L ? L.getContext('2d') : ctx;
    if (L) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); }
    if (needLayer && pl.focusAmt > 0.001 && !matte && mode !== 'alpha' && mode !== 'green' && mode !== 'blue') { g.drawImage(ctx.canvas, 0, 0); }
    // screen projection + resolution
    const sOut = S.outline(scr.w, scr.h, scr.r || 0, 5, scr.cx, scr.cy);
    const zOf = (u, v) => scr.bulge ? scr.bulge * (1 - Math.pow(2 * u - 1, 2)) * (1 - Math.pow(2 * v - 1, 2)) : 0;
    const map = (u, v) => S.tp(scr.M, [scr.cx - scr.w / 2 + u * scr.w, scr.cy + scr.h / 2 - v * scr.h, scr.z + zOf(u, v)]);
    const pc = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => camera.project(map(u, v)));
    const edge = Math.max(Math.hypot(pc[1][0] - pc[0][0], pc[1][1] - pc[0][1]), Math.hypot(pc[2][0] - pc[3][0], pc[2][1] - pc[3][1]));
    const edgeV = Math.max(Math.hypot(pc[3][0] - pc[0][0], pc[3][1] - pc[0][1]), Math.hypot(pc[2][0] - pc[1][0], pc[2][1] - pc[1][1]));
    let k = Math.max(edge / pl.LW, edgeV / pl.LH) * 1.08 * quality;
    k = U.clamp(k, 0.2, Math.min(2.4, 3000 / Math.max(pl.LW, pl.LH)));
    const needScreen = mode !== 'screenkey' && !matteScreen && !matte;
    const scrCanvas = needScreen ? drawScreen(pl, shot, k, slot) : null;
    // shadow
    if (!matteScreen && shot.shadow > 0) drawShadow(g, pl, shot.shadow);
    // parts far -> near
    const parts = model.parts.slice().map(pt => ({ pt, z: S.depthOf(camera, pt.M, centroid(pt)) })).sort((a, b) => b.z - a.z);
    for (const { pt } of parts) {
      if (pt.flat) { drawScreenOn(g, pl, sOut, map, scrCanvas, mode, shot); continue; }
      let res;
      if (matteScreen) { const m = Object.assign({}, pt.mat, { front: '#000', side: '#000', back: '#000', gloss: 0, amb: 0, rim: null }); res = S.slab(g, camera, Object.assign({}, pt, { mat: m })); }
      else res = S.slab(g, camera, pt);
      // decals (bezel rings, knobs) must sit BEHIND the screen picture - a filled bezel decal
      // (e.g. the CRT glass surround) would otherwise cover the screen content entirely.
      if (pt.decals && !matteScreen) pt.decals(g, camera);
      if (pt.host && res.front) drawScreenOn(g, pl, sOut, map, scrCanvas, mode, shot);
    }
    if (model.cinema && !matteScreen && !matte) cinemaLight(g, pl, scrCanvas);
    // focus: blur + dim everything outside the focus rectangle
    if (needLayer && pl.focusAmt > 0.001 && !matte) {
      const fr = pl.focusRect, a = pl.focusAmt;
      const q = [[fr.x, fr.y], [fr.x + fr.w, fr.y], [fr.x + fr.w, fr.y + fr.h], [fr.x, fr.y + fr.h]].map(([x, y]) => camera.project(map(x / pl.LW, y / pl.LH)));
      const sharp = U.tmp('sharp' + slot, W, H), sg = sharp.getContext('2d'); sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H); sg.drawImage(L, 0, 0);
      const bl = softBlur(L, W, H, shot.focus.blur * a, 'fb' + slot);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      g.imageSmoothingQuality = 'high'; g.globalAlpha = U.clamp(a * 1.4); g.drawImage(bl, 0, 0, W, H); g.globalAlpha = 1;
      if (a < 0.71) { g.globalAlpha = 1 - U.clamp(a * 1.4); g.drawImage(sharp, 0, 0); g.globalAlpha = 1; }
      g.fillStyle = `rgba(0,0,0,${(shot.focus.dim == null ? 0.45 : shot.focus.dim) * a})`; g.fillRect(0, 0, W, H);
      g.save(); S.poly(g, q); g.clip(); g.drawImage(sharp, 0, 0); g.restore();
      g.save(); g.strokeStyle = U.rgba(shot.focus.color || '#e5a93c', a); g.lineWidth = Math.max(2, W / 640); g.shadowColor = U.rgba(shot.focus.color || '#e5a93c', 0.8 * a); g.shadowBlur = W / 90; S.poly(g, q); g.stroke(); g.restore();
    }
    if (L) {
      if (matte) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      if (pl.focusAmt > 0.001 && !matte && (mode === 'composite' || mode === 'screenkey')) { ctx.clearRect(0, 0, W, H); }
      ctx.drawImage(L, 0, 0);
    }
    ctx.restore();
    return pl;
  }
  function centroid(pt) { let x = 0, y = 0; for (const p of pt.pts) { x += p[0]; y += p[1]; } return [x / pt.pts.length, y / pt.pts.length, (pt.z0 + pt.z1) / 2]; }

  function drawScreenOn(g, pl, sOut, map, img, mode, shot) {
    const { scr, camera } = pl;
    const P2 = sOut.map(([x, y]) => camera.project(S.tp(scr.M, [x, y, scr.z + (scr.bulge ? scr.bulge * 0.2 : 0)])));
    g.save(); S.poly(g, P2); g.clip();
    if (mode === 'screenkey') { g.fillStyle = '#00ff00'; g.fill(); g.restore(); return; }
    if (mode === 'screenmatte') { g.fillStyle = '#fff'; g.fill(); g.restore(); return; }
    if (mode === 'matte') { g.fillStyle = '#fff'; g.fill(); g.restore(); return; }
    if (img) { g.imageSmoothingQuality = 'high'; S.texSurface(g, camera, img, map); }
    // glass reflection that slides as the camera turns
    const gl = shot.glare == null ? 0.6 : +shot.glare;
    if (gl > 0 && pl.dev.id !== 'flat') {
      const xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const yawish = S.dot(camera.r, [1, 0, 0]), off = (Math.atan2(camera.f[0], -camera.f[2]) / Math.PI) * 1.4 + 0.15 * yawish;
      const gr = g.createLinearGradient(x0, y0, x1, y1), c = U.clamp(0.5 + off, 0.05, 0.95);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(U.clamp(c - 0.14, 0, 1), 'rgba(255,255,255,0)');
      gr.addColorStop(c, `rgba(255,255,255,${0.09 * gl})`); gr.addColorStop(U.clamp(c + 0.05, 0, 1), `rgba(255,255,255,${0.03 * gl})`); gr.addColorStop(U.clamp(c + 0.2, 0, 1), 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    g.restore();
  }

  function drawShadow(g, pl, amt) {
    const { model, camera } = pl, b = model.bounds;
    g.save();
    if (model.shadowCard) {
      const pts = S.outline(b.w * 0.96, b.h * 0.96, 18, 3).map(([x, y]) => camera.project(S.tp(model.screen.M, [x, y - b.h * 0.03, -10])));
      g.shadowColor = `rgba(0,0,0,${0.55 * amt})`; g.shadowBlur = camera.W / 24; g.shadowOffsetY = camera.W / 70;
      g.fillStyle = 'rgba(0,0,0,.6)'; S.poly(g, pts); g.fill();
    } else if (model.floorY != null) {
      const y = model.floorY, w = b.w * 0.62, d = Math.max(b.d * 0.6, b.w * 0.18);
      const c = camera.project([b.cx, y, 0]), ex = camera.project([b.cx + w, y, 0]), ez = camera.project([b.cx, y, d]);
      const rx = Math.max(4, Math.hypot(ex[0] - c[0], ex[1] - c[1])), ry = Math.max(3, Math.abs(ez[1] - c[1]) + rx * 0.06);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, `rgba(0,0,0,${0.55 * amt})`); gr.addColorStop(0.6, `rgba(0,0,0,${0.22 * amt})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.translate(c[0], c[1]); g.scale(rx, ry); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function cinemaLight(g, pl, img) {
    const { camera, scr, model } = pl, p = model.cinema;
    const c = camera.project(S.tp(scr.M, [0, 0, 0])), e = camera.project(S.tp(scr.M, [scr.w / 2, 0, 0]));
    const R = Math.abs(e[0] - c[0]);
    g.save(); g.globalCompositeOperation = 'lighter';
    let col = '#8090a0';
    if (img) { const s = U.tmp('avg', 1, 1), sg = s.getContext('2d'); sg.drawImage(img, 0, 0, 1, 1); try { const d = sg.getImageData(0, 0, 1, 1).data; col = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (er) {} }
    const gr = g.createRadialGradient(c[0], c[1], R * 0.6, c[0], c[1], R * 1.9);
    gr.addColorStop(0, U.rgba('#000000', 0)); gr.addColorStop(0, col.replace('rgb', 'rgba').replace(')', ',0.10)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, camera.W, camera.H);
    if (p.beam) {
      const src = [camera.W * 0.5, -camera.H * 0.08];
      const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => camera.project(S.tp(scr.M, [-scr.w / 2 + u * scr.w, scr.h / 2 - v * scr.h, 0])));
      const bg = g.createLinearGradient(src[0], src[1], c[0], c[1]); bg.addColorStop(0, 'rgba(255,250,235,.16)'); bg.addColorStop(1, 'rgba(255,250,235,0.01)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(src[0] - camera.W * 0.01, src[1]); g.lineTo(pts[3][0], pts[3][1]); g.lineTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(src[0] + camera.W * 0.01, src[1]); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ---------- transitions between shots ----------
  const TRANS = { cut: 'Cut', fade: 'Cross-fade', dip: 'Dip to black', zoom: 'Zoom through', slide: 'Slide (push)', whip: 'Whip pan' };
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height, mode = opts.mode || 'composite';
    const tl = opts.tl || timeline(proj);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
    if (!proj.shots.length) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); return; }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    const shot = proj.shots[seg.i], lt = t - seg.t0, tr = shot.transition || {};
    const td = Math.min(+tr.dur || 0, (seg.t1 - seg.t0) * 0.6);
    const fps = proj.fps || 30;
    const fix = s => { if (s && s.content) s.__fps = fps; return s; };
    fix(shot);
    if (seg.i === 0 || tr.type === 'cut' || !tr.type || td <= 0 || lt >= td) { renderShot(ctx, shot, lt, W, H, mode, 'A', opts.quality || 1); return; }
    const prev = proj.shots[seg.i - 1], pseg = tl.segs[seg.i - 1];
    const q = U.ease.inOut(U.clamp(lt / td));
    const A = U.tmp('trA', W, H), B = U.tmp('trB', W, H), ag = A.getContext('2d'), bg = B.getContext('2d');
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, W, H); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, W, H);
    renderShot(ag, prev, t - pseg.t0, W, H, mode, 'P', opts.quality || 1);
    renderShot(bg, shot, lt, W, H, mode, 'A', opts.quality || 1);
    const bgFill = mode === 'green' ? '#00ff00' : mode === 'blue' ? '#0000ff' : (mode === 'alpha' ? null : '#000');
    switch (tr.type) {
      case 'dip':
        if (bgFill) { ctx.fillStyle = bgFill; ctx.fillRect(0, 0, W, H); }
        ctx.globalAlpha = q < 0.5 ? 1 - q * 2 : 0; ctx.drawImage(A, 0, 0); ctx.globalAlpha = q >= 0.5 ? (q - 0.5) * 2 : 0; ctx.drawImage(B, 0, 0); break;
      case 'zoom': {
        const s1 = 1 + q * 0.6, s2 = 0.82 + q * 0.18;
        ctx.drawImage(A, W / 2 - W * s1 / 2, H / 2 - H * s1 / 2, W * s1, H * s1);
        ctx.globalAlpha = q; ctx.drawImage(B, W / 2 - W * s2 / 2, H / 2 - H * s2 / 2, W * s2, H * s2); break;
      }
      case 'slide': ctx.drawImage(A, -W * q, 0); ctx.drawImage(B, W * (1 - q), 0); break;
      case 'whip': {
        const off = W * q;
        for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.28; ctx.drawImage(A, -off - i * W * 0.035 * Math.sin(q * Math.PI), 0); ctx.drawImage(B, W - off - i * W * 0.035 * Math.sin(q * Math.PI), 0); }
        ctx.globalAlpha = 1; ctx.drawImage(A, -off, 0); ctx.drawImage(B, W - off, 0); break;
      }
      default: ctx.drawImage(A, 0, 0); ctx.globalAlpha = q; ctx.drawImage(B, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- video sources ----------
  function videoKeys(shot) { return Object.entries(shot.content || {}).filter(([k, v]) => /^media\d*$/.test(k) && v && SM.media[v] && SM.media[v].kind === 'video').map(([, v]) => v); }
  function activeShots(tl, t) { const s = segAt(tl, t); return [s.i, s.i - 1].filter(i => i >= 0); }
  function wantTime(proj, tl, i, id, t) {
    const el = SM.media[id].el, d = el.duration || 1, start = +(proj.shots[i].content.mediaStart || 0);
    const local = start + Math.max(0, t - tl.segs[i].t0);
    return proj.shots[i].content.mediaLoop === false ? Math.min(local, d - 0.04) : local % d;
  }
  async function prepare(proj, t, tl) {
    tl = tl || timeline(proj);
    const jobs = [];
    for (const i of activeShots(tl, t)) for (const id of videoKeys(proj.shots[i])) {
      const el = SM.media[id].el, want = wantTime(proj, tl, i, id, t);
      if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) continue;
      jobs.push(new Promise(res => { const done = () => { el.removeEventListener('seeked', done); res(); }; el.addEventListener('seeked', done); el.currentTime = want; setTimeout(done, 3000); }));
    }
    await Promise.all(jobs);
  }
  function syncVideos(proj, t, playing) {
    const tl = timeline(proj), act = activeShots(tl, t), live = new Set();
    for (const i of act) for (const id of videoKeys(proj.shots[i])) {
      live.add(id);
      const el = SM.media[id].el, want = wantTime(proj, tl, i, id, t);
      if (Math.abs(el.currentTime - want) > 0.25) el.currentTime = want;
      if (playing && el.paused) el.play().catch(() => {});
      if (!playing && !el.paused) el.pause();
    }
    for (const [id, m] of Object.entries(SM.media)) if (m.kind === 'video' && !live.has(id) && !m.el.paused) m.el.pause();
  }

  return { SIZES, MOVES, BGS, TRANS, newShot, defaultProject, timeline, segAt, render, renderShot, plan, prepare, syncVideos, mediaOf, background };
})();
