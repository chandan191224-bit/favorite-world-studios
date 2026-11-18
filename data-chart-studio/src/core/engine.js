// Project = scenes in a row (each scene = one chart + its data + text + highlight / call-outs / camera push).
// render(ctx, proj, t, opts) draws any time t frame-exactly; the same code drives preview, export, render.mjs.
DC.engine = (() => {
  const U = DC.util, D = DC.draw;

  const SIZES = [['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'], ['1080x1920', '1080×1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square']];
  const SCENE_DEFAULTS = {
    chart: 'bars', duration: 6, theme: 'dark', lang: 'en', csv: 'label,value\nA,10\nB,20', title: '', subtitle: '', source: '',
    format: {}, params: {}, highlight: '', highlightAt: 0, callouts: [], camera: null, outro: false, bgImage: '', seed: 1,
    titleAlign: 'left',
  };
  function newScene(o = {}) { return Object.assign({ id: U.uid() }, JSON.parse(JSON.stringify(SCENE_DEFAULTS)), JSON.parse(JSON.stringify(o))); }
  function fromPreset(id, over = {}) {
    const pr = DC.charts.presetById[id]; if (!pr) throw new Error('unknown preset ' + id);
    const s = newScene(Object.assign({}, pr, { preset: id }));
    delete s.id; s.id = U.uid(); delete s.name;
    s.duration = pr.duration || (DC.charts.byId[pr.chart] || {}).dur || 6;
    return Object.assign(s, over);
  }
  function defaultProject() {
    return { version: 1, name: 'Untitled chart video', width: 1920, height: 1080, fps: 30, transition: { type: 'fade', duration: 0.5 },
      scenes: [fromPreset('race-gdp'), fromPreset('line-gdp-india'), fromPreset('counter-budget-hi')] };
  }
  // scenes play back to back; with a fade/slide transition the next scene starts while the previous one finishes
  function timeline(proj) {
    const segs = []; let t = 0;
    const tr = proj.transition || { type: 'cut', duration: 0 }, td = tr.type === 'cut' ? 0 : Math.max(0, +tr.duration || 0);
    proj.scenes.forEach((s, i) => { const d = Math.max(0.2, +s.duration || 1); segs.push({ i, t0: t, t1: t + d }); t += d - (i < proj.scenes.length - 1 ? Math.min(td, d * 0.4) : 0); });
    return { segs, total: segs.length ? segs[segs.length - 1].t1 : 0, tr, td };
  }

  const dsCache = new Map();
  function dataset(csv) { let d = dsCache.get(csv); if (!d) { d = DC.data.parse(csv); if (dsCache.size > 200) dsCache.clear(); dsCache.set(csv, d); } return d; }
  let measureCtx = null;
  function mctx() { if (!measureCtx) measureCtx = U.canvas(4, 4).getContext('2d'); return measureCtx; }

  function makeEnv(scene, t, W, H) {
    const chart = DC.charts.byId[scene.chart] || DC.charts.byId.bars;
    const theme = DC.themes.byId[scene.theme] || DC.themes.byId.dark;
    const P = Object.assign({}, chart.defaults, scene.params || {});
    const k = Math.min(W, H) / 1080, lang = scene.lang === 'hi' ? 'hi' : 'en';
    const ease = U.ease[P.ease] || U.ease.out;
    const fmtSpec = scene.format || {};
    const intro = +P.intro || 0;
    // per-item timing: n items share `build` seconds, overlapping by (1 - stagger)
    const win = n => { const L = P.build / (1 + P.stagger * Math.max(0, n - 1)); return L; };
    const env = {
      W, H, k, t, dur: +scene.duration || 6, theme, lang, P, chart, intro, seed: scene.seed || 1, anchors: {},
      data: dataset(scene.csv || ''), ease,
      introP: U.ease.out(U.prog(t, 0, Math.max(0.05, intro || 0.3))),
      itemRaw(i, n) { const L = win(n); return U.prog(t, intro + i * P.stagger * L, L); },
      item(i, n) { return ease(env.itemRaw(i, n)); },
      itemEnd(i, n) { const L = win(n); return intro + i * P.stagger * L + L; },
      fmt(v, ref, row) {
        const spec = row && (row.unit || row.prefix || row.suffix) ? Object.assign({}, fmtSpec, row.unit ? { unit: row.unit } : {}, row.prefix ? { prefix: row.prefix } : {}, row.suffix ? { suffix: row.suffix } : {}) : fmtSpec;
        return DC.format.fmt(v, spec, ref == null ? v : ref, lang);
      },
      axis(v, maxRef) { return DC.format.axis(v, fmtSpec, lang, maxRef); },
      hl: String(scene.highlight || '').trim().toLowerCase(),
      hlOn: scene.highlight ? U.ease.out(U.prog(t, +scene.highlightAt || 0, 0.5)) : 0,
    };
    // layout: title block on top, source line at the bottom, chart in between
    const side = W * (W > H ? 0.075 : 0.07), titleH = scene.title ? (scene.subtitle ? 150 : 104) * k : 30 * k, foot = scene.source ? 64 * k : 34 * k;
    env.box = { x: side, y: (W > H ? 46 : 160) * k + titleH, w: W - side * 2, h: H - ((W > H ? 46 : 160) * k + titleH) - foot - (W > H ? 30 : 160) * k };
    return env;
  }

  function cameraXf(scene, env) {
    const cam = scene.camera;
    if (!cam || !cam.target) return null;
    const a = env.anchors[String(cam.target).trim().toLowerCase()]; if (!a) return null;
    const pin = U.ease.inOut(U.prog(env.t, +cam.at || 0, +cam.dur || 1.2));
    const pout = cam.hold === false ? U.ease.inOut(U.prog(env.t, (+cam.at || 0) + (+cam.dur || 1.2) + (+cam.holdFor || 1.5), +cam.dur || 1.2)) : 0;
    const p = pin * (1 - pout); if (p <= 0) return null;
    const z = U.lerp(1, +cam.zoom || 1.6, p);
    // move the target toward the centre (not all the way, so context stays)
    const cx = U.lerp(env.W / 2, a.x, p), cy = U.lerp(env.H / 2, a.y, p);
    const fx = U.lerp(env.W / 2, env.W / 2 + (a.x - env.W / 2) * 0.15, p), fy = U.lerp(env.H / 2, env.H / 2 + (a.y - env.H / 2) * 0.1, p);
    return { z, cx, cy, fx, fy, p };
  }

  // draw one scene at local time t (opts.transparent: no background)
  function renderScene(ctx, scene, t, W, H, opts = {}) {
    const env = makeEnv(scene, t, W, H), th = env.theme;
    ctx.save();
    if (!opts.transparent) {
      DC.themes.background(ctx, th, W, H, scene.seed || 1);
      const img = scene.bgImage && DC.media && DC.media[scene.bgImage];
      if (img && img.el && (img.el.naturalWidth || img.el.videoWidth)) {
        const iw = img.el.naturalWidth || img.el.videoWidth, ih = img.el.naturalHeight || img.el.videoHeight, s = Math.max(W / iw, H / ih);
        ctx.globalAlpha = +scene.bgOpacity || 0.35; ctx.drawImage(img.el, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s); ctx.globalAlpha = 1;
      }
    }
    const needAnchors = (scene.camera && scene.camera.target) || (scene.callouts && scene.callouts.length);
    if (needAnchors) { const m = mctx(); m.setTransform(1, 0, 0, 1, 0, 0); env.chart.draw(m, env); }
    const cam = cameraXf(scene, env);
    ctx.save();
    const anchors = env.anchors; env.anchors = {};
    if (cam) {
      // the chart goes through a masked layer: a soft focus around the target, so the push reads as
      // a deliberate camera move (edges fall away) instead of a crop that cuts labels mid-glyph
      const layer = tmp('cam', W, H), lc = layer.getContext('2d');
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H);
      lc.save();
      lc.translate(cam.fx, cam.fy); lc.scale(cam.z, cam.z); lc.translate(-cam.cx, -cam.cy);
      env.chart.draw(lc, env);
      lc.restore();
      lc.globalCompositeOperation = 'destination-in';
      const r0 = Math.min(W, H) * 0.26, r1 = Math.max(r0 + 50, Math.max(W, H) * 0.5 / cam.z);
      const g = lc.createRadialGradient(cam.fx, cam.fy, r0, cam.fx, cam.fy, r1);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.4, `rgba(0,0,0,${Math.max(0.3, 1 - 0.55 * cam.p).toFixed(3)})`);
      g.addColorStop(1, `rgba(0,0,0,${Math.max(0.12, 1 - 0.88 * cam.p).toFixed(3)})`);
      lc.fillStyle = g; lc.fillRect(0, 0, W, H);
      lc.globalCompositeOperation = 'source-over';
      ctx.drawImage(layer, 0, 0);
    } else {
      env.chart.draw(ctx, env);
    }
    env.anchors = Object.assign(anchors, env.anchors);
    // call-outs live in chart space so they ride the camera push; they stay unmasked and readable
    ctx.save();
    if (cam) { ctx.translate(cam.fx, cam.fy); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy); }
    for (const c of scene.callouts || []) {
      const a = env.anchors[String(c.target || '').trim().toLowerCase()];
      if (!a) continue;
      const p = U.prog(t, +c.at || 0, +c.dur || 0.8), out = c.until ? 1 - U.prog(t, +c.until, 0.35) : 1;
      if (p * out > 0) { ctx.save(); ctx.globalAlpha *= out; D.callout(ctx, env, a.x, a.y, c.text, p, { side: c.side, below: c.below, color: c.color, size: (c.size || 30) / (cam ? cam.z : 1) * (cam ? Math.max(1, cam.z * 0.75) : 1) }); ctx.restore(); }
    }
    ctx.restore();
    ctx.restore();
    drawTitles(ctx, scene, env);
    ctx.restore();
    // scene outro (fade everything) for clips that should end clean
    if (scene.outro) {
      const o = U.prog(t, env.dur - 0.6, 0.6);
      if (o > 0) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = o; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    return env;
  }

  function drawTitles(ctx, scene, env) {
    const { k, W, H, theme: th } = env, t = env.t, x = env.box.x, center = scene.titleAlign === 'center';
    const ax = center ? W / 2 : x, align = center ? 'center' : 'left', top = (W > H ? 46 : 160) * k;
    if (scene.title) {
      const p = U.ease.out(U.prog(t, 0, 0.6)), dy = (1 - p) * 26 * k;
      D.text(ctx, env, scene.title, ax, top + 58 * k + dy, { size: 58 * k, weight: 800, role: 'head', align, alpha: p, maxW: W - x * 2, glow: true });
      if (th.paper || th.id === 'light') { const lw = Math.min(D.measure(ctx, env, scene.title, 58 * k, 'head', 800), W - x * 2) * p; ctx.fillStyle = th.accent; ctx.fillRect(center ? ax - lw / 2 : ax, top + 76 * k + dy, lw, 5 * k); }
      if (scene.subtitle) D.text(ctx, env, scene.subtitle, ax, top + 122 * k + dy, { size: 30 * k, weight: 500, color: th.sub, align, alpha: U.ease.out(U.prog(t, 0.15, 0.6)), maxW: W - x * 2 });
    }
    if (scene.source) {
      const p = U.prog(t, 0.4, 0.6);
      D.text(ctx, env, scene.source, x, H - (W > H ? 34 : 170) * k, { size: 21 * k, weight: 500, color: th.faint, alpha: p, maxW: W - x * 2 });
    }
  }

  const tmps = {};
  function tmp(key, W, H) { let c = tmps[key]; if (!c || c.width !== W || c.height !== H) c = tmps[key] = U.canvas(W, H); return c; }

  // modes: composite (themed background), green / blue (key colour behind the chart), alpha (transparent), matte (white on black)
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height, mode = opts.mode || 'composite';
    const tl = opts.tl || timeline(proj);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!proj.scenes.length) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); return; }
    const transparent = mode !== 'composite';
    const layer = transparent ? tmp('layer', W, H) : null, lctx = layer ? layer.getContext('2d') : ctx;
    if (layer) { lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H); }
    const active = tl.segs.filter(s => t >= s.t0 && t < s.t1 + (s === tl.segs[tl.segs.length - 1] ? 1e9 : 0));
    const list = active.length ? active : [tl.segs[0]];
    list.forEach((seg, j) => {
      const sc = proj.scenes[seg.i], lt = t - seg.t0;
      if (list.length > 1 && j === 1 && tl.td > 0) {
        // incoming scene during a fade / slide
        const p = U.ease.inOut(U.clamp((t - seg.t0) / tl.td));
        const c2 = tmp('in', W, H), g2 = c2.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
        renderScene(g2, sc, lt, W, H, { transparent });
        lctx.save();
        if (tl.tr.type === 'slide') { lctx.translate((1 - p) * W, 0); }
        else lctx.globalAlpha = p;
        lctx.drawImage(c2, 0, 0); lctx.restore();
      } else renderScene(lctx, sc, lt, W, H, { transparent });
    });
    if (!layer) return;
    if (mode === 'green' || mode === 'blue') { ctx.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(layer, 0, 0); }
    else if (mode === 'matte') {
      lctx.globalCompositeOperation = 'source-in'; lctx.fillStyle = '#fff'; lctx.fillRect(0, 0, W, H); lctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(layer, 0, 0);
    } else ctx.drawImage(layer, 0, 0);
  }
  return { SIZES, SCENE_DEFAULTS, newScene, fromPreset, defaultProject, timeline, renderScene, render, makeEnv, dataset, tmp };
})();
