// Engine: project model + timeline + deterministic renderer.
// A project = { name, width, height, fps, lang, bg, shots[] }. Shots play one after another with a
// small transition at each start (cut / fade / dip-to-black / wipe). Every shot is one diagram
// element (BD.fx) started from a preset (BD.presets). Design space: 1080 design px = short side.
BD.engine = (() => {
  const U = BD.util;
  BD.media = BD.media || {};

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'],
    ['3840x2160', '4K 16:9'],
    ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'],
    ['1080x1080', '1080 square'],
  ];
  const TRANSITIONS = [['cut', 'Cut'], ['fade', 'Crossfade'], ['black', 'Dip to black'], ['wipe', 'Wipe']];

  // ---------------- shot helpers ----------------
  function paramsOf(shot) {
    const el = BD.fx.byId[shot.el], out = {};
    if (!el) return out;
    for (const p of el.params) out[p.k] = p.def;
    if (shot.preset && BD.presets.byId[shot.preset]) Object.assign(out, BD.presets.byId[shot.preset].p);
    Object.assign(out, shot.p || {});
    return out;
  }
  function fieldsOf(shot) {
    const el = BD.fx.byId[shot.el], out = {};
    if (!el) return out;
    for (const f of el.fields) out[f.k] = f.def != null ? f.def : '';
    if (shot.preset && BD.presets.byId[shot.preset]) Object.assign(out, BD.presets.byId[shot.preset].f);
    Object.assign(out, shot.f || {});
    return out;
  }
  function newShot(presetId, over = {}) {
    const pr = presetId && BD.presets.byId[presetId];
    if (!pr) throw new Error('unknown preset ' + presetId);
    const el = BD.fx.byId[pr.el];
    return {
      id: over.id || U.uid(),
      el: pr.el,
      preset: pr.id,
      dur: over.dur != null ? +over.dur : (pr.dur != null ? pr.dur : (el && el.dur) || 6),
      x: over.x != null ? over.x : (pr.x != null ? pr.x : (el && el.x != null ? el.x : 0.5)),
      y: over.y != null ? over.y : (pr.y != null ? pr.y : (el && el.y != null ? el.y : 0.5)),
      seed: over.seed != null ? +over.seed : 7,
      trans: over.trans != null ? over.trans : 'cut',
      f: Object.assign({}, pr.f, over.f || {}),
      p: Object.assign({}, over.p || {}),
    };
  }
  function applyPreset(shot, presetId, keep = {}) {
    const pr = BD.presets.byId[presetId];
    if (!pr) return shot;
    shot.el = pr.el;
    shot.preset = pr.id;
    shot.f = Object.assign({}, pr.f, keep.f || {});
    shot.p = {};
    if (!keep.dur) shot.dur = pr.dur != null ? pr.dur : (BD.fx.byId[pr.el] || {}).dur || 6;
    if (!keep.pos) { const el = BD.fx.byId[pr.el]; shot.x = pr.x != null ? pr.x : (el && el.x != null ? el.x : 0.5); shot.y = pr.y != null ? pr.y : (el && el.y != null ? el.y : 0.5); }
    return shot;
  }

  function defaultProject() {
    return {
      version: 1,
      name: 'ब्लूप्रिंट डेमो',
      width: 1920, height: 1080, fps: 30, lang: 'hi',
      bg: { type: 'none', color: '#0b0d11', media: null, fit: 'cover', zoom: 0, start: 0, loop: true },
      shots: [
        newShot('bp-fort-blueprint', { dur: 7 }),
        newShot('ex-rocket-exploded', { dur: 6, trans: 'fade' }),
        newShot('sc-height-lineup', { dur: 6, trans: 'fade' }),
        newShot('pr-steps-sequence', { dur: 6, trans: 'fade' }),
        newShot('tr-dynasty-tree', { dur: 7, trans: 'fade' }),
      ],
    };
  }

  // ---------------- timeline ----------------
  function timeline(proj) {
    const segs = [];
    let t = 0;
    (proj.shots || []).forEach((shot, i) => {
      const d = Math.max(0.1, +shot.dur || 1);
      segs.push({ shot, i, t0: t, t1: t + d, dur: d });
      t += d;
    });
    return { segs, total: t };
  }
  function segAt(tl, t) {
    if (!tl.segs.length) return null;
    for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s;
    return tl.segs[tl.segs.length - 1];
  }

  // ---------------- backgrounds ----------------
  // procedural demo photo (a dusk fort on a ridge) so the labelled-diagram family works with no files
  const photos = {};
  function demoPhoto(W, H) {
    const key = W + 'x' + H;
    if (photos[key]) return photos[key];
    const LW = 420, LH = Math.max(2, Math.round(420 * H / W));
    const c = U.canvas(LW, LH), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, LH);
    gr.addColorStop(0, '#31405c'); gr.addColorStop(0.45, '#8a7a6a'); gr.addColorStop(0.62, '#c99e63'); gr.addColorStop(1, '#4e463c');
    g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
    // sun haze
    const rg = g.createRadialGradient(LW * 0.7, LH * 0.4, 0, LW * 0.7, LH * 0.4, LH * 0.5);
    rg.addColorStop(0, 'rgba(255,214,140,.85)'); rg.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
    // far ridge
    g.fillStyle = 'rgba(58,54,48,.9)';
    g.beginPath(); g.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 6) g.lineTo(x, LH * (0.55 + 0.1 * (U.noise1(x / 60, 11) * 0.5 + 0.5)));
    g.lineTo(LW, LH); g.closePath(); g.fill();
    // a fort silhouette on the ridge (with visible gate + flanking towers so call-outs have real targets)
    g.fillStyle = 'rgba(30,27,24,.96)';
    const bx = LW * 0.42, by = LH * 0.56, bw = LW * 0.2, bh = LH * 0.22;
    g.fillRect(bx, by, bw, bh);
    for (let i = 0; i < 8; i++) g.fillRect(bx + i * bw / 8, by - bh * 0.09, bw / 16, bh * 0.09);
    g.fillRect(bx - bw * 0.12, by - bh * 0.18, bw * 0.14, bh * 1.18);
    g.fillRect(bx + bw * 0.98, by - bh * 0.18, bw * 0.14, bh * 1.18);
    for (let i = 0; i < 4; i++) g.fillRect(bx - bw * 0.12 + i * bw * 0.045, by - bh * 0.24, bw * 0.02, bh * 0.07);
    for (let i = 0; i < 4; i++) g.fillRect(bx + bw * 0.98 + i * bw * 0.045, by - bh * 0.24, bw * 0.02, bh * 0.07);
    // arched main gate in the curtain wall (a lighter opening so it clearly reads)
    g.fillStyle = 'rgba(200,160,110,.95)';
    const gx = bx + bw * 0.5, gw2 = bw * 0.1, gh2 = bh * 0.34;
    g.beginPath();
    g.moveTo(gx - gw2, by + bh);
    g.lineTo(gx - gw2, by + bh - gh2);
    g.arc(gx, by + bh - gh2, gw2, Math.PI, Math.PI * 2);
    g.lineTo(gx + gw2, by + bh);
    g.closePath();
    g.fill();
    // foreground scrub
    g.fillStyle = 'rgba(24,22,19,.98)';
    g.beginPath(); g.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 5) g.lineTo(x, LH * (0.88 + 0.07 * (U.noise1(x / 34, 31) * 0.5 + 0.5)));
    g.lineTo(LW, LH); g.closePath(); g.fill();
    const out = U.canvas(W, H);
    out.getContext('2d').drawImage(c, 0, 0, W, H);
    return (photos[key] = out);
  }

  function drawMedia(g, m, W, H, bg, t, total) {
    const el = m && m.el;
    if (!el) return;
    const ew = el.videoWidth || el.naturalWidth || el.width, eh = el.videoHeight || el.naturalHeight || el.height;
    if (!ew || !eh) return;
    const cover = (bg.fit || 'cover') === 'cover';
    const zoom = 1 + (bg.zoom || 0) * (total > 0 ? U.clamp(t / total) : 0);
    // cover zoom is computed exactly so a pan/zoom can never expose an edge
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
  // Draw one shot at local time lt onto a W×H canvas. opts: { lang, mode }
  function drawShot(g, shot, lt, W, H, lang = 'hi', mode = 'composite') {
    const el = BD.fx.byId[shot.el];
    if (!el) return;
    const k = Math.min(W, H) / 1080;        // design px → device px
    const fw = W / k, fh = H / k;           // design frame (short side = 1080)
    const x = shot.x != null ? shot.x : 0.5, y = shot.y != null ? shot.y : 0.5;
    const ox = x * fw, oy = y * fh;
    g.save();
    g.setTransform(k, 0, 0, k, ox * k, oy * k);
    const F = fieldsOf(shot);
    const P = paramsOf(shot);
    const env = {
      dur: Math.max(0.1, +shot.dur || 1), seed: shot.seed || 7, fw, fh, ox, oy,
      lang: lang === 'en' ? 'en' : 'hi', W, H, t: lt, mode,
      media: BD.media[F.photo || P.photo] || null,
    };
    try { el.draw(g, { f: F, p: P, x, y }, lt, env); }
    catch (e) { if (window.__HEADLESS || !window.console) throw e; console.error('draw ' + shot.el, e); }
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
      const m = bg.type === 'media' && bg.media ? BD.media[bg.media] : null;
      if (m && m.el && !m.missing) drawMedia(ctx, m, W, H, bg, t, tl.total);
      else if (bg.type === 'demo') ctx.drawImage(demoPhoto(W, H), 0, 0);
      else if (bg.type === 'color') { ctx.fillStyle = bg.color || '#0b0d11'; ctx.fillRect(0, 0, W, H); }
      else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (!seg) return;
    const lt = Math.max(0, Math.min(t - seg.t0, seg.dur - 1e-4));
    if (mode === 'matte') {
      const tc = tmp('matte', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      drawShot(tg, seg.shot, lt, W, H, proj.lang, mode);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = '#fff'; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(tc, 0, 0);
      return;
    }
    // transition at the start of this shot (composite only)
    const tr = seg.shot.trans || 'cut';
    const trDur = Math.min(0.5, seg.dur * 0.3);
    if (mode === 'composite' && tr !== 'cut' && seg.i > 0 && lt < trDur) {
      const k = U.ease.inOut(U.clamp(lt / trDur));
      const prev = tl.segs[seg.i - 1];
      const tc = tmp('trans', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      if (tr === 'black') { tg.fillStyle = '#000'; tg.fillRect(0, 0, W, H); }
      else drawShot(tg, prev.shot, Math.max(0, prev.dur - 1e-3), W, H, proj.lang, mode);
      if (tr === 'wipe') {
        ctx.drawImage(tc, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * k, H); ctx.clip();
        drawShot(ctx, seg.shot, lt, W, H, proj.lang, mode);
        ctx.restore();
        // soft edge line
        if (k > 0.01 && k < 0.99) { ctx.fillStyle = 'rgba(229,169,60,.8)'; ctx.fillRect(W * k - 2, 0, 4, H); }
      } else {
        ctx.drawImage(tc, 0, 0);
        ctx.save(); ctx.globalAlpha = k;
        drawShot(ctx, seg.shot, lt, W, H, proj.lang, mode);
        ctx.restore();
      }
      return;
    }
    drawShot(ctx, seg.shot, lt, W, H, proj.lang, mode);
  }

  // ---------------- media sync ----------------
  function usedVideos(proj, t, tl) {
    const out = [];
    const bg = proj.bg || {};
    if (bg.type === 'media' && bg.media && BD.media[bg.media] && BD.media[bg.media].kind === 'video') out.push([BD.media[bg.media], bg, t]);
    const seg = segAt(tl || timeline(proj), Math.max(0, Math.min(t, timeline(proj).total - 1e-6)));
    if (seg) {
      const F = fieldsOf(seg.shot);
      for (const key of Object.keys(F)) {
        const m = BD.media[F[key]];
        if (m && m.kind === 'video' && m.el) out.push([m, null, Math.max(0, t - seg.t0)]);
      }
    }
    return out;
  }
  // export: seek every video to its exact frame
  async function prepare(proj, t) {
    for (const [m, bg, tt] of usedVideos(proj, t)) {
      const el = m.el;
      const d = el.duration || 1;
      const want = bg ? ((bg.start || 0) + Math.max(0, tt)) % d : Math.min(tt, d - 0.04);
      if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) continue;
      await new Promise(res => {
        const done = () => { el.removeEventListener('seeked', done); res(); };
        el.addEventListener('seeked', done);
        el.currentTime = want;
        setTimeout(done, 3000);
      });
    }
  }
  // preview: keep videos roughly in sync
  function syncVideos(proj, t, playing) {
    for (const [m, bg, tt] of usedVideos(proj, t)) {
      const el = m.el, d = el.duration || 1;
      const want = bg ? ((bg.start || 0) + Math.max(0, tt)) % d : Math.min(tt, d - 0.04);
      if (Math.abs(el.currentTime - want) > 0.3) { try { el.currentTime = want; } catch (e) {} }
      if (playing && el.paused) el.play().catch(() => {});
      if (!playing && !el.paused) el.pause();
    }
  }

  return { SIZES, TRANSITIONS, paramsOf, fieldsOf, newShot, applyPreset, defaultProject, timeline, segAt, demoPhoto, drawMedia, drawShot, render, prepare, syncVideos, tmp };
})();
