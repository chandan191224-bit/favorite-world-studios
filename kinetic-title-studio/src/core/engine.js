// Engine: project model + timeline + deterministic renderer.
// A project = { name, width, height, fps, lang, bg, clips[] }. Clips play one after another.
// Every clip is one animated text element (from KT.el) started from a preset (KT.presets).
// Design space: 1080 design px = short side of the frame, so every size renders identically.
KT.engine = (() => {
  const U = KT.util;
  KT.media = KT.media || {};

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'],
    ['3840x2160', '4K 16:9'],
    ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'],
    ['1080x1080', '1080 square'],
  ];

  // ---------------- clip helpers ----------------
  function paramsOf(clip) {
    const el = KT.el.byId[clip.el], out = {};
    if (!el) return out;
    for (const p of el.params) out[p.k] = p.def;
    if (clip.preset && KT.presets.byId[clip.preset]) Object.assign(out, KT.presets.byId[clip.preset].p);
    Object.assign(out, clip.p || {});
    return out;
  }
  function fieldsOf(clip) {
    const el = KT.el.byId[clip.el], out = {};
    if (!el) return out;
    for (const f of el.fields) out[f.k] = '';
    if (clip.preset && KT.presets.byId[clip.preset]) Object.assign(out, KT.presets.byId[clip.preset].f);
    Object.assign(out, clip.f || {});
    return out;
  }
  function newClip(presetId, over = {}) {
    const pr = presetId && KT.presets.byId[presetId];
    if (!pr) throw new Error('unknown preset ' + presetId);
    const el = KT.el.byId[pr.el];
    return {
      id: over.id || U.uid(),
      el: pr.el,
      preset: pr.id,
      dur: over.dur != null ? +over.dur : (pr.dur != null ? pr.dur : (el && el.dur) || 4),
      x: over.x != null ? over.x : (pr.x != null ? pr.x : (el && el.x != null ? el.x : 0.5)),
      y: over.y != null ? over.y : (pr.y != null ? pr.y : (el && el.y != null ? el.y : 0.5)),
      seed: over.seed != null ? +over.seed : 7,
      f: Object.assign({}, pr.f, over.f || {}),
      p: Object.assign({}, over.p || {}),
    };
  }
  // replace what a clip shows, keeping timing/seed/position when asked
  function applyPreset(clip, presetId, keep = {}) {
    const pr = KT.presets.byId[presetId];
    if (!pr) return clip;
    clip.el = pr.el;
    clip.preset = pr.id;
    clip.f = Object.assign({}, pr.f, keep.f || {});
    clip.p = {};
    if (!keep.dur) clip.dur = pr.dur != null ? pr.dur : (KT.el.byId[pr.el] || {}).dur || 4;
    if (!keep.pos) { const el = KT.el.byId[pr.el]; clip.x = pr.x != null ? pr.x : (el && el.x != null ? el.x : 0.5); clip.y = pr.y != null ? pr.y : (el && el.y != null ? el.y : 0.5); }
    return clip;
  }

  function defaultProject() {
    return {
      version: 1,
      name: 'कीनेटिक टाइटल डेमो',
      width: 1920, height: 1080, fps: 30, lang: 'hi',
      bg: { type: 'demo', color: '#101014', media: null, fit: 'cover', zoom: 0, start: 0, loop: true },
      clips: [
        newClip('mt-hindi-display'),
        newClip('mt-gold', { dur: 3.6 }),
        newClip('kt-word-rise', { dur: 3.4 }),
        newClip('nm-crore', { dur: 4 }),
        newClip('co-label', { dur: 4, x: 0.6, y: 0.46 }),
        newClip('lt-doc', { dur: 4 }),
        newClip('cap-karaoke', { dur: 5 }),
        newClip('qc-marks', { dur: 6 }),
        newClip('mc-headline', { dur: 4 }),
        newClip('kt-punch', { dur: 2.6 }),
      ],
    };
  }

  // ---------------- timeline ----------------
  function timeline(proj) {
    const segs = [];
    let t = 0;
    (proj.clips || []).forEach((clip, i) => {
      const d = Math.max(0.1, +clip.dur || 1);
      segs.push({ clip, i, t0: t, t1: t + d, dur: d });
      t += d;
    });
    return { segs, total: t };
  }
  function segAt(tl, t) {
    if (!tl.segs.length) return null;
    for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s;
    return tl.segs[tl.segs.length - 1];
  }
  function clipWindow(tl, i) {
    const s = tl.segs[i];
    return s ? [s.t0, s.t1] : [0, 0];
  }

  // ---------------- backgrounds ----------------
  // deterministic "footage-like" demo backdrop (dusk cityscape), computed once per size
  const bgs = {};
  function backdrop(W, H) {
    const key = W + 'x' + H;
    if (bgs[key]) return bgs[key];
    const LW = 480, LH = Math.max(2, Math.round(480 * H / W));
    const c = U.canvas(LW, LH), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, LH);
    gr.addColorStop(0, '#2c3844'); gr.addColorStop(0.5, '#67655a'); gr.addColorStop(0.74, '#ad8f62'); gr.addColorStop(1, '#413d35');
    g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
    const sx = LW * 0.66, sy = LH * 0.62;
    const rg = g.createRadialGradient(sx, sy, 0, sx, sy, LH * 0.6);
    rg.addColorStop(0, 'rgba(255,206,128,.95)'); rg.addColorStop(0.3, 'rgba(255,175,88,.32)'); rg.addColorStop(1, 'rgba(255,175,88,0)');
    g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
    // far hills
    g.fillStyle = 'rgba(38,36,30,.85)';
    g.beginPath(); g.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 6) g.lineTo(x, LH * (0.68 + 0.08 * (U.noise1(x / 55, 11) * 0.5 + 0.5)));
    g.lineTo(LW, LH); g.closePath(); g.fill();
    // city blocks with a few lit windows (deterministic)
    let x = 0, i = 0;
    while (x < LW) {
      const w = 12 + U.h1(i, 21) * 26, h = LH * (0.08 + U.h1(i, 33) * 0.2);
      g.fillStyle = 'rgba(17,16,14,.95)'; g.fillRect(x, LH * 0.84 - h, w, h + LH * 0.2);
      g.fillStyle = 'rgba(255,196,110,.8)';
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 2; wx++)
        if (U.h1(i * 17 + wy * 3 + wx, 55) < 0.3) g.fillRect(x + 3 + wx * (w / 2 - 1), LH * 0.84 - h + 3 + wy * h / 4.5, 2, 2);
      x += w + 2 + U.h1(i, 44) * 7; i++;
    }
    const out = U.canvas(W, H);
    out.getContext('2d').drawImage(c, 0, 0, W, H);
    return (bgs[key] = out);
  }

  function drawMedia(g, m, W, H, bg, t, total) {
    const el = m && m.el;
    if (!el) return;
    const ew = el.videoWidth || el.width, eh = el.videoHeight || el.height;
    if (!ew || !eh) return;
    const cover = (bg.fit || 'cover') === 'cover';
    const zoom = 1 + (bg.zoom || 0) * (total > 0 ? U.clamp(t / total) : 0);
    const k = (cover ? Math.max(W / ew, H / eh) : Math.min(W / ew, H / eh)) * zoom;
    const dw = ew * k, dh = eh * k;
    const fx = bg.fx == null ? 0.5 : bg.fx, fy = bg.fy == null ? 0.5 : bg.fy;
    g.drawImage(el, (W - dw) * fx, (H - dh) * fy, dw, dh);
  }

  const tmps = {};
  function tmp(key, W, H) {
    let c = tmps[key];
    if (!c || c.width !== W || c.height !== H) c = tmps[key] = U.canvas(W, H);
    return c;
  }

  // ---------------- render ----------------
  // Draw one clip at local time lt onto a W×H canvas (identity transform assumed).
  // opts: { lang, mode } — mode only affects nothing here (the clip is always drawn the same way).
  function drawClip(g, clip, lt, W, H, lang = 'hi') {
    const el = KT.el.byId[clip.el];
    if (!el) return;
    const k = Math.min(W, H) / 1080;        // design px → device px
    const fw = W / k, fh = H / k;           // design frame size (short side = 1080)
    const x = clip.x != null ? clip.x : (el.x != null ? el.x : 0.5);
    const y = clip.y != null ? clip.y : (el.y != null ? el.y : 0.5);
    const ox = x * fw, oy = y * fh;         // anchor point in design coords
    g.save();
    g.setTransform(k, 0, 0, k, ox * k, oy * k);
    const env = { dur: Math.max(0.1, +clip.dur || 1), seed: clip.seed || 7, fw, fh, ox, oy, lang: lang === 'en' ? 'en' : 'hi', W, H };
    try { el.draw(g, { f: fieldsOf(clip), p: paramsOf(clip), x, y }, lt, env); }
    catch (e) { if (window.__HEADLESS || !window.console) throw e; console.error('draw ' + clip.el, e); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // Full frame at project time t. opts: { mode: composite|green|blue|alpha|matte, W, H, tl }
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height;
    const tl = opts.tl || timeline(proj);
    const mode = opts.mode || 'composite';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!tl.segs.length) { ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, W, H); return; }
    if (mode === 'green' || mode === 'blue') {
      ctx.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff';
      ctx.fillRect(0, 0, W, H);
    } else if (mode === 'composite') {
      const bg = proj.bg || { type: 'none' };
      const m = bg.type === 'media' && bg.media ? KT.media[bg.media] : null;
      if (m && m.el && !m.missing) drawMedia(ctx, m, W, H, bg, t, tl.total);
      else if (bg.type === 'demo') ctx.drawImage(backdrop(W, H), 0, 0);
      else if (bg.type === 'color') { ctx.fillStyle = bg.color || '#101014'; ctx.fillRect(0, 0, W, H); }
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (!seg) return;
    const lt = Math.max(0, Math.min(t - seg.t0, seg.dur - 1e-4));
    if (mode === 'matte') {
      const tc = tmp('matte', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      drawClip(tg, seg.clip, lt, W, H, proj.lang);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = '#fff'; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(tc, 0, 0);
    } else {
      drawClip(ctx, seg.clip, lt, W, H, proj.lang);
    }
  }

  // ---------------- background media sync ----------------
  function bgVideo(proj) {
    const bg = proj.bg || {};
    if (bg.type === 'media' && bg.media && KT.media[bg.media] && KT.media[bg.media].kind === 'video') return [KT.media[bg.media], bg];
    return null;
  }
  function bgVideoTime(proj, t) {
    const [, bg] = bgVideo(proj);
    const el = KT.media[bg.media].el;
    const d = el.duration || 1, local = (bg.start || 0) + Math.max(0, t);
    return bg.loop === false ? Math.min(local, d - 0.04) : local % d;
  }
  // export: seek the background video to its exact frame
  async function prepare(proj, t) {
    const vb = bgVideo(proj);
    if (!vb) return;
    const [m] = vb, el = m.el, want = bgVideoTime(proj, t);
    if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) return;
    await new Promise(res => {
      const done = () => { el.removeEventListener('seeked', done); res(); };
      el.addEventListener('seeked', done);
      el.currentTime = want;
      setTimeout(done, 3000);
    });
  }
  // preview: keep it roughly in sync
  function syncVideos(proj, t, playing) {
    const vb = bgVideo(proj);
    if (!vb) return;
    const [m, ] = vb, el = m.el, want = bgVideoTime(proj, t);
    if (Math.abs(el.currentTime - want) > 0.25) { try { el.currentTime = want; } catch (e) {} }
    if (playing && el.paused) el.play().catch(() => {});
    if (!playing && !el.paused) el.pause();
  }

  return { SIZES, paramsOf, fieldsOf, newClip, applyPreset, defaultProject, timeline, segAt, clipWindow, backdrop, drawMedia, drawClip, render, prepare, syncVideos, tmp };
})();
