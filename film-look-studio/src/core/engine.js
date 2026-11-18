// A project is one picture (photo, video or demo) with a stack of look layers on top, each with its own
// time span, fades, blend, opacity and seed. render() draws any time t frame-exactly.
// Order: source -> colour grades (all grade layers) -> camera moves -> processes and overlays in stack order.
// Export modes: composite (finished picture), screen (light elements on black, for Screen/Add blend in an
// editor), alpha (all overlay elements with transparency), source (untouched picture).
FL.engine = (() => {
  const U = FL.util, SRC = FL.sources, GR = FL.grade;

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'],
    ['1080x1920', '1080x1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square'],
  ];
  const LIGHT_BLENDS = new Set(['screen', 'lighter', 'color-dodge', 'lighten']);

  function newLayer(fxId, params, o = {}) {
    const fx = FL.fx.byId[fxId];
    return Object.assign({
      id: U.uid(), fx: fxId, name: o.name || (fx ? fx.name : fxId), on: true, start: 0, dur: null,
      fadeIn: 0, fadeOut: 0, opacity: 1, blend: null, seed: 1 + Math.floor(U.h1(Date.now() % 100000, 7) * 9998),
      params: Object.assign({}, params || {}),
    }, o, { params: Object.assign({}, params || {}, o.params || {}) });
  }
  function layerFromPreset(pid, at = 0, seed) {
    const pr = FL.fx.presetById[pid];
    if (!pr) return null;
    const fx = FL.fx.byId[pr.fx];
    const L = newLayer(pr.fx, pr.params, { name: pr.name });
    if (seed) L.seed = seed;
    if (pr.dur || (fx && fx.event)) { L.start = Math.max(0, at); L.dur = pr.dur || fx.dur || 1; }
    if (pr.opacity != null) L.opacity = pr.opacity;
    if (pr.blend) L.blend = pr.blend;
    return L;
  }
  function defaultProject() {
    return {
      app: 'film-look-studio', version: 1, name: 'Untitled film look', width: 1920, height: 1080, fps: 30, duration: 8,
      source: { media: null, demo: 'fort', fit: 'cover', start: 0, speed: 1, loop: true, bg: '#000000' },
      media: {}, layers: [],
    };
  }
  function span(L, proj) {
    const s = Math.max(0, +L.start || 0), d = L.dur == null || L.dur === '' ? Math.max(0.01, proj.duration - s) : Math.max(0.01, +L.dur);
    return [s, s + d];
  }
  function params(L) { const fx = FL.fx.byId[L.fx]; return Object.assign({}, fx ? fx.defaults : {}, L.params || {}); }

  function envFor(L, proj, t, W, H, mode) {
    const [s, e] = span(L, proj), dur = e - s, lt = t - s;
    let amt = U.clamp(L.opacity == null ? 1 : +L.opacity);
    if (L.fadeIn > 0) amt *= U.smooth(U.clamp(lt / L.fadeIn));
    if (L.fadeOut > 0) amt *= U.smooth(U.clamp((e - t) / L.fadeOut));
    const fps = proj.fps || 30, S = Math.min(W, H) / 1080;
    return {
      W, H, S, t, lt, dur, p: U.clamp(lt / dur), seed: L.seed | 0 || 1, fps, frame: Math.floor(t * fps + 1e-6),
      film: f => Math.floor(t * (f || fps) + 1e-6), amt, mode, L,
    };
  }
  const active = (L, proj, t) => {
    if (!L.on || !FL.fx.byId[L.fx]) return false;
    const [s, e] = span(L, proj);
    return t >= s - 1e-6 && t < e + 1e-6;
  };

  // ---- grade stage (cached for still pictures) ----
  const compiled = new Map();
  function gradeList(proj, layers, t, W, H, mode) {
    const out = [];
    for (const L of layers) {
      const fx = FL.fx.byId[L.fx];
      const e = envFor(L, proj, t, W, H, mode), P = params(L);
      const settings = fx.grade(P, e), key = GR.keyOf(settings);
      let f = compiled.get(key);
      if (!f) { f = GR.compile(settings); if (compiled.size > 80) compiled.delete(compiled.keys().next().value); compiled.set(key, f); }
      out.push({ f, key, amt: e.amt * (settings.amount == null ? 1 : settings.amount) });
    }
    return out;
  }
  let gradeMemo = { key: null, canvas: null };
  function graded(src, list, W, H) {
    if (!list.length) return src;
    const key = src.static ? src.static + '|' + list.map(x => x.key + '@' + x.amt.toFixed(3)).join('|') : null;
    if (key && gradeMemo.key === key && gradeMemo.canvas.width === W) return gradeMemo.canvas;
    const c = key ? (gradeMemo.canvas && gradeMemo.canvas.width === W && gradeMemo.canvas.height === H ? gradeMemo.canvas : U.canvas(W, H)) : U.tmp('graded', W, H);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy';
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
    const img = g.getImageData(0, 0, W, H);
    GR.applyAll(img, list);
    g.putImageData(img, 0, 0);
    if (key) gradeMemo = { key, canvas: c };
    return c;
  }

  // ---- camera stage ----
  function cameraMove(proj, layers, t, W, H, mode) {
    const m = { x: 0, y: 0, zoom: 1, rot: 0, bx: 0, by: 0, zb: 0, mx: 0, my: 0, mr: 0, crop: false, wrapY: 0 };
    for (const L of layers) {
      const fx = FL.fx.byId[L.fx], e = envFor(L, proj, t, W, H, mode), P = params(L);
      const c = fx.camera(P, e) || {}, a = e.amt;
      m.x += (c.x || 0) * a * e.S; m.y += (c.y || 0) * a * e.S; m.rot += (c.rot || 0) * a;
      m.zoom *= 1 + ((c.zoom == null ? 1 : c.zoom) - 1) * a;
      m.bx += (c.bx || 0) * a * e.S; m.by += (c.by || 0) * a * e.S; m.zb += (c.zb || 0) * a;
      m.mx += (c.mx || 0) * e.S; m.my += (c.my || 0) * e.S; m.mr += c.mr || 0;
      if (c.wrapY) m.wrapY += c.wrapY * e.S;
      if (P.crop !== false && (c.mx || c.my || c.mr)) m.crop = true;
    }
    return m;
  }
  function drawWithCamera(g, pic, m, W, H) {
    let z = m.zoom;
    if (m.crop) {
      const cr = Math.abs(Math.cos(m.mr)), sr = Math.abs(Math.sin(m.mr));
      z *= Math.max(cr + (W / H) * sr, cr + (H / W) * sr) * (1 + 2 * Math.max(m.mx / W, m.my / H));
    }
    const one = (dx, dy, dz) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.translate(W / 2 + m.x + dx, H / 2 + m.y + dy);
      if (m.rot) g.rotate(m.rot);
      g.scale(z * dz, z * dz);
      g.drawImage(pic, -W / 2, -H / 2, W, H);
      if (m.wrapY) {
        // film frame slip: the next frame shows above/below, separated by a black frame line
        const gap = H * 0.06;
        g.drawImage(pic, -W / 2, -H / 2 - (H + gap) * Math.sign(m.wrapY), W, H);
      }
    };
    const blurLen = Math.hypot(m.bx, m.by), zbl = Math.abs(m.zb);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (blurLen < 1.5 && zbl < 0.004) { one(0, 0, 1); }
    else {
      const n = Math.max(3, Math.min(14, Math.ceil(Math.max(blurLen / 5, zbl * 90))));
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1 / n;
      for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; one(m.bx * f, m.by * f, 1 + m.zb * (f + 0.5)); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  function isLightLayer(L, fx) { return fx.light || LIGHT_BLENDS.has(L.blend || fx.blend); }

  // Draw time t. opts: { W, H, mode: 'composite'|'screen'|'alpha'|'source', layers (override), solo }
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height, mode = opts.mode || 'composite';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    const layers = (opts.layers || proj.layers).filter(L => active(L, proj, t));
    const kindOf = L => FL.fx.byId[L.fx].kind;
    if (mode === 'composite' || mode === 'source') {
      const src = SRC.frame(proj, W, H, t);
      if (mode === 'source') { ctx.drawImage(src, 0, 0); return; }
      const pic = graded(src, gradeList(proj, layers.filter(L => kindOf(L) === 'grade'), t, W, H, mode), W, H);
      const cams = layers.filter(L => kindOf(L) === 'camera');
      if (cams.length) drawWithCamera(ctx, pic, cameraMove(proj, cams, t, W, H, mode), W, H);
      else ctx.drawImage(pic, 0, 0, W, H);
      for (const L of layers) {
        const k = kindOf(L);
        if (k === 'process') runProcess(ctx, L, proj, t, W, H, mode);
        else if (k === 'overlay') composite(ctx, L, proj, t, W, H, mode);
      }
      return;
    }
    const overlays = layers.filter(L => kindOf(L) === 'overlay');
    if (mode === 'screen') {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (const L of overlays) if (isLightLayer(L, FL.fx.byId[L.fx])) composite(ctx, L, proj, t, W, H, mode);
      return;
    }
    // alpha: light elements are "unscreened" (colour / max channel, alpha = max channel); others drawn normally
    const light = U.tmp('alphaLight', W, H), lg = U.ctx2(light);
    lg.fillStyle = '#000'; lg.fillRect(0, 0, W, H);
    let anyLight = false;
    for (const L of overlays) if (isLightLayer(L, FL.fx.byId[L.fx])) { composite(lg, L, proj, t, W, H, mode); anyLight = true; }
    if (anyLight) {
      const img = lg.getImageData(0, 0, W, H), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = Math.max(d[i], d[i + 1], d[i + 2]);
        if (a === 0) { d[i + 3] = 0; continue; }
        const k = 255 / a;
        d[i] = d[i] * k; d[i + 1] = d[i + 1] * k; d[i + 2] = d[i + 2] * k; d[i + 3] = a;
      }
      ctx.putImageData(img, 0, 0);
    }
    for (const L of overlays) if (!isLightLayer(L, FL.fx.byId[L.fx])) composite(ctx, L, proj, t, W, H, mode, 'source-over');
  }

  function composite(ctx, L, proj, t, W, H, mode, forceBlend) {
    const fx = FL.fx.byId[L.fx], e = envFor(L, proj, t, W, H, mode);
    if (e.amt <= 0.001) return;
    const c = U.tmp('layer', W, H), g = U.ctx2(c);
    g.save(); fx.draw(g, params(L), e); g.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = e.amt;
    ctx.globalCompositeOperation = forceBlend || L.blend || fx.blend;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  function runProcess(ctx, L, proj, t, W, H, mode) {
    const fx = FL.fx.byId[L.fx], e = envFor(L, proj, t, W, H, mode);
    if (e.amt <= 0.001) return;
    const snap = () => { const c = U.tmp('snap', W, H), g = U.ctx2(c); g.drawImage(ctx.canvas, 0, 0); return c; };
    e.src = snap;
    if (e.amt >= 0.999) { ctx.save(); fx.process(ctx, params(L), e); ctx.restore(); return; }
    // partial strength: process a copy and fade it over the original
    const c = U.tmp('proc', W, H), g = U.ctx2(c);
    g.drawImage(ctx.canvas, 0, 0);
    e.src = () => { const s = U.tmp('snap', W, H), sg = U.ctx2(s); sg.drawImage(c, 0, 0); return s; };
    g.save(); fx.process(g, params(L), e); g.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = e.amt; ctx.drawImage(c, 0, 0); ctx.restore();
  }

  // grade layers of a project (or list) as one .cube LUT
  function cubeFor(proj, layers, title) {
    const gl = (layers || proj.layers).filter(L => L.on && FL.fx.byId[L.fx] && FL.fx.byId[L.fx].kind === 'grade');
    if (!gl.length) return null;
    const list = gl.map(L => {
      const P = params(L), s = FL.fx.byId[L.fx].grade(P, { amt: 1, p: 0.5, t: 0, lt: 0, S: 1 });
      return { f: GR.compile(s), key: GR.keyOf(s), amt: U.clamp(L.opacity == null ? 1 : +L.opacity) * (s.amount == null ? 1 : s.amount) };
    });
    return GR.cube(list, title || proj.name);
  }

  // ---- video sources ----
  function videoEl(proj) { const s = proj.source || {}, m = s.media && FL.media[s.media]; return m && m.kind === 'video' && m.el ? m.el : null; }
  function videoTime(proj, el, t) {
    const s = proj.source, d = el.duration || 1, local = (+s.start || 0) + Math.max(0, t) * (+s.speed || 1);
    return s.loop === false ? Math.min(local, d - 0.04) : local % d;
  }
  async function prepare(proj, t) {
    const el = videoEl(proj);
    if (!el) return;
    const want = videoTime(proj, el, t);
    if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) return;
    await new Promise(res => {
      const done = () => { el.removeEventListener('seeked', done); res(); };
      el.addEventListener('seeked', done);
      el.currentTime = want;
      setTimeout(done, 4000);
    });
  }
  function syncVideo(proj, t, playing) {
    const el = videoEl(proj);
    if (!el) return;
    const want = videoTime(proj, el, t);
    el.playbackRate = Math.max(0.25, Math.min(4, +proj.source.speed || 1));
    if (Math.abs(el.currentTime - want) > 0.3 || !playing) { if (Math.abs(el.currentTime - want) > 0.02) el.currentTime = want; }
    if (playing && el.paused) el.play().catch(() => {});
    if (!playing && !el.paused) el.pause();
  }

  return { SIZES, newLayer, layerFromPreset, defaultProject, span, params, envFor, active, render, cubeFor, prepare, syncVideo, videoEl };
})();
