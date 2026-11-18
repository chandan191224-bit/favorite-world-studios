// Engine: project model + timeline + deterministic renderer.
// A project = { name, width, height, fps, lang, shots[], transitions[] }.
// Shots play one after another; transitions[i] sits between shot i and i+1 and EATS
// into shot i+1's head (the new drawing is already starting under the transition).
// Design space: 1080 design px = short side of the frame.
SK.engine = (() => {
  const U = SK.util;

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'],
    ['3840x2160', '4K 16:9'],
    ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'],
    ['1080x1080', '1080 square'],
  ];

  // ---------------- normalisation (hand-written pipeline projects omit fields) ----------------
  function normLayer(l) {
    l = Object.assign({}, l);
    l.id = l.id || U.uid();
    l.kind = l.kind === 'mark' ? 'mark' : 'label';
    l.on = l.on !== false;
    l.start = +l.start || 0.8;
    l.dur = +l.dur || 1.2;
    l.x = l.x == null ? 0.5 : +l.x;
    l.y = l.y == null ? 0.5 : +l.y;
    l.size = l.size == null ? 52 : +l.size;
    l.seed = l.seed == null ? 3 : +l.seed;
    if (l.kind === 'label' && l.text == null) l.text = '';
    if (l.kind === 'mark' && !l.mark) l.mark = 'circle';
    return l;
  }
  function paramsOf(shot) {
    const el = SK.el.byId[shot.el], out = {};
    if (!el) return out;
    for (const p of el.params) if (p.def !== null && p.def !== undefined) out[p.k] = p.def;
    if (shot.preset && SK.presets.byId[shot.preset]) Object.assign(out, SK.presets.byId[shot.preset].p || {});
    Object.assign(out, shot.p || {});
    return out;
  }
  function fieldsOf(shot) {
    const el = SK.el.byId[shot.el], out = {};
    if (!el) return out;
    for (const f of el.fields) out[f.k] = '';
    if (shot.preset && SK.presets.byId[shot.preset]) Object.assign(out, SK.presets.byId[shot.preset].f || {});
    Object.assign(out, shot.f || {});
    return out;
  }
  function mediaKeyOf(shot) {
    if (shot.media && /^demo:/.test(shot.media)) return shot.media;
    if (shot.media) return 'u:' + shot.media;
    return 'demo:' + (shot.demo || (SK.presets.byId[shot.preset] || {}).demo || 'portrait');
  }
  function resolveMedia(shot) {
    const key = mediaKeyOf(shot);
    if (shot.media && !/^demo:/.test(shot.media)) {
      const m = SK.media[shot.media];
      if (m) return m;
      return { kind: 'image', name: shot.media, missing: true };
    }
    const demoId = key.slice('demo:'.length);
    return SK.media.demo(demoId);
  }
  function newShot(presetId, over = {}) {
    const pr = presetId && SK.presets.byId[presetId];
    if (!pr || pr.kind !== 'shot') throw new Error('unknown shot preset ' + presetId);
    const el = SK.el.byId[pr.el];
    const shot = {
      id: over.id || U.uid(),
      el: pr.el,
      preset: pr.id,
      dur: over.dur != null ? +over.dur : (pr.dur != null ? pr.dur : (el && el.dur) || 5),
      seed: over.seed != null ? +over.seed : 7,
      media: over.media != null ? over.media : null,
      demo: over.demo != null ? over.demo : pr.demo || null,
      f: Object.assign({}, pr.f, over.f || {}),
      p: Object.assign({}, over.p || {}),
      layers: (pr.layers || []).map(normLayer).concat((over.layers || []).map(normLayer)),
    };
    if (over.on != null) shot.on = over.on;
    return shot;
  }
  function applyPreset(shot, presetId, keep = {}) {
    const pr = SK.presets.byId[presetId];
    if (!pr) return shot;
    shot.el = pr.el;
    shot.preset = pr.id;
    shot.f = Object.assign({}, pr.f, keep.f || {});
    shot.p = {};
    shot.demo = pr.demo || null;
    if (!keep.dur) shot.dur = pr.dur != null ? pr.dur : (SK.el.byId[pr.el] || {}).dur || 5;
    if (!keep.layers) shot.layers = (pr.layers || []).map(normLayer);
    return shot;
  }
  function newTrans(presetId, over = {}) {
    const pr = presetId && SK.presets.byId[presetId];
    if (pr && pr.kind === 'trans') {
      return { id: U.uid(), type: pr.p.type, dur: over.dur != null ? +over.dur : (pr.dur != null ? pr.dur : 0.9), seed: over.seed != null ? +over.seed : 5, p: Object.assign({}, over.p || {}) };
    }
    return { id: U.uid(), type: over.type || 'cut', dur: +over.dur || 0, seed: over.seed != null ? +over.seed : 5, p: Object.assign({}, over.p || {}) };
  }
  function normTrans(t) {
    t = Object.assign({}, t);
    t.id = t.id || U.uid();
    t.type = t.type || 'cut';
    t.dur = t.dur == null ? 0.9 : +t.dur;
    if (t.type === 'cut') t.dur = 0;
    t.seed = t.seed == null ? 5 : +t.seed;
    t.p = t.p || {};
    return t;
  }

  function defaultProject() {
    const shots = [
      newShot('story-portrait-historical'),
      newShot('story-place'),
      newShot('sty-stipple', { demo: 'object' }),
      newShot('roto-ink-boil'),
      newShot('story-manuscript'),
    ];
    return {
      version: 1,
      name: 'स्केच और स्याही डेमो',
      width: 1920, height: 1080, fps: 30, lang: 'hi',
      shots,
      transitions: [newTrans('tr-bleed'), newTrans('tr-wash'), newTrans('tr-radial'), newTrans('tr-brush')],
      media: {},
    };
  }

  // ---------------- timeline ----------------
  function timeline(proj) {
    const segs = [];
    let cursor = 0;
    const shots = proj.shots || [];
    shots.forEach((shot, i) => {
      const shotDur = Math.max(0.2, +shot.dur || 2);
      const trIn = i > 0 ? proj.transitions[i - 1] : null;
      const tdIn = trIn && trIn.type !== 'cut' ? Math.min(+trIn.dur || 0, shotDur - 0.35) : 0;
      const eaten = Math.max(0, tdIn);
      const win0 = cursor - eaten;                    // content clock starts under the transition
      const t1 = win0 + shotDur;                      // content end
      segs.push({ kind: 'shot', i, t0: cursor, t1, win0, dur: shotDur, eaten });
      cursor = t1;
      if (i < shots.length - 1) {
        const tr = proj.transitions[i];
        const next = shots[i + 1];
        let td = tr && tr.type !== 'cut' ? Math.min(+tr.dur || 0.8, Math.max(0, (+next.dur || 2) - 0.35)) : 0;
        if (td > 0.05) {
          const eatenB = td;
          segs.push({ kind: 'trans', i, t0: cursor, t1: cursor + td, dur: td, bWin0: cursor + td - eatenB });
          cursor += td;
        }
      }
    });
    return { segs, total: cursor };
  }
  function segAt(tl, t) {
    if (!tl.segs.length) return null;
    for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s;
    return t < 0 ? tl.segs[0] : tl.segs[tl.segs.length - 1];
  }
  function shotLt(seg, t) {
    return Math.max(0, Math.min(t - seg.win0, seg.dur - 1e-4));
  }
  function clipWindow(tl, i) {
    const s = tl.segs.find(x => x.kind === 'shot' && x.i === i);
    return s ? [s.t0, s.t1] : [0, 0];
  }

  // ---------------- media + analysis ----------------
  function videoReady(m) { return m && m.el && m.el.readyState >= 2; }
  function videoTime(shot, lt) {
    const m = resolveMedia(shot);
    if (!m || m.kind !== 'video' || !m.el || !isFinite(m.el.duration)) return null;
    const start = +((shot.p && shot.p.videoStart) || 0);
    const d = m.el.duration;
    const local = start + Math.max(0, lt);
    return (shot.p && shot.p.videoLoop === false) ? Math.min(local, d - 0.05) : (local % d);
  }
  function getAnalysis(shot, P) {
    const m = resolveMedia(shot);
    if (!m || m.missing || m.kind === 'video' || m.kind === 'demovideo') return null;
    const el = m.kind === 'image' ? m.el : null;
    if (!el || !(el.complete !== false) || !(el.videoWidth || el.naturalWidth || el.width)) return null;
    const styleId = P.style || 'pencil';
    const cfg = SK.styles.byId[styleId] || SK.styles.byId.pencil;
    const opts = SK.styles.analysisOpts(cfg, P);
    const key = mediaKeyOf(shot) + (shot.media && !/^demo:/.test(shot.media) ? ':v' + (el.naturalWidth || el.width) : '');
    return SK.proc.analyze(el, key, opts, null);
  }
  // progress of the analyses the last render touched (for the stage note)
  const active = new Map();
  function progress() {
    let n = 0, sum = 0, any = false;
    for (const [, h] of active) {
      if (h.ready) continue;
      any = true; n++;
      sum += h.progress || 0;
    }
    return { active: n, any, pct: n ? sum / n : 1 };
  }

  // ---------------- render ----------------
  // drawShot: resolves media + analysis, builds env, calls the element.
  // overrides: { photoMix } (used by the dry-back transition)
  function drawShot(g, shot, lt, W, H, proj, mode = 'composite', overrides = {}) {
    const el = SK.el.byId[shot.el];
    if (!el) return;
    const k = Math.min(W, H) / 1080;
    const fw = W / k, fh = H / k;
    const P = paramsOf(shot);
    if (overrides.photoMix != null) P.photoMix = overrides.photoMix;
    const F = fieldsOf(shot);
    const media = resolveMedia(shot);
    const mediaOk = media && !media.missing && (media.kind !== 'image' || (media.el && (media.el.complete !== false)));
    let ana = null, focus = [0.5, 0.42];
    if (shot.el === 'roto') {
      // per-frame analysis happens inside SK.roto
    } else if (mediaOk && (media.kind === 'image')) {
      ana = getAnalysis(shot, P);
      active.set(shot.id, ana);
      if (ana && ana.data && ana.data.focus) focus = ana.data.focus.slice();
      if (ana && ana.data && ana.data.W) {
        // map image-space focus to frame-space (cover fit)
        const f = SK.gfx.fit(ana.data.W, ana.data.H, W, H, 'cover', P.fx == null ? 0.5 : P.fx, P.fy == null ? 0.5 : P.fy, 1);
        focus = [U.clamp((focus[0] * f.dw + f.dx) / W, 0.05, 0.95), U.clamp((focus[1] * f.dh + f.dy) / H, 0.05, 0.95)];
      }
    }
    const env = {
      W, H, k, fw, fh, dur: Math.max(0.2, +shot.dur || 2), seed: shot.seed || 7,
      lang: proj.lang === 'en' ? 'en' : 'hi', media: mediaOk ? media : null, mediaKey: mediaKeyOf(shot),
      ana, focus, P, F, t: lt, mode, proj,
    };
    try { el.draw(g, shot, lt, env); }
    catch (e) { if (window.__HEADLESS || !window.console) throw e; console.error('draw ' + shot.el, e); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  function drawTransition(g, proj, seg, t, W, H, mode) {
    const tr = normTrans(proj.transitions[seg.i]);
    const A = proj.shots[seg.i], B = proj.shots[seg.i + 1];
    const q = U.clamp((t - seg.t0) / Math.max(0.001, seg.dur));
    const ltB = Math.max(0, t - seg.bWin0);
    const drawA = (gg, mixOverride) => drawShot(gg, A, Math.max(0, (+A.dur || 2) - 1e-3), W, H, proj, mode, mixOverride != null ? { photoMix: mixOverride } : {});
    const drawB = (gg) => drawShot(gg, B, ltB, W, H, proj, mode);
    SK.reveals.transition(g, tr.type, q, tr.seed || 5, W, H, drawA, drawB, null);
  }

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
      ctx.fillStyle = '#0c0d10';
      ctx.fillRect(0, 0, W, H);
    }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (!seg) return;
    if (seg.kind === 'trans') {
      if (mode === 'matte') {
        const tc = SK.gfx.tmp('matte', W, H), tg = tc.getContext('2d');
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        drawTransition(tg, proj, seg, Math.max(seg.t0, Math.min(t, seg.t1 - 1e-3)), W, H, 'alpha');
        tg.globalCompositeOperation = 'source-in';
        tg.fillStyle = '#fff'; tg.fillRect(0, 0, W, H);
        tg.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(tc, 0, 0);
      } else {
        drawTransition(ctx, proj, seg, Math.max(seg.t0, Math.min(t, seg.t1 - 1e-3)), W, H, mode);
      }
      return;
    }
    const lt = shotLt(seg, t);
    if (mode === 'matte') {
      const tc = SK.gfx.tmp('matte', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
      drawShot(tg, proj.shots[seg.i], lt, W, H, proj, 'alpha');
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = '#fff'; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(tc, 0, 0);
    } else {
      drawShot(ctx, proj.shots[seg.i], lt, W, H, proj, mode);
    }
  }

  // ---------------- video sync (preview + frame-exact export) ----------------
  function prepare(proj, t) {
    const tl = timeline(proj);
    const seg = segAt(tl, t);
    if (!seg) return Promise.resolve();
    const jobs = [];
    const seek = (shot, lt) => {
      const m = resolveMedia(shot);
      if (!m || m.kind !== 'video' || !m.el || !isFinite(m.el.duration)) return;
      const want = videoTime(shot, lt);
      if (want == null) return;
      if (Math.abs(m.el.currentTime - want) < 0.001 && m.el.readyState >= 2) return;
      jobs.push(new Promise(res => {
        const done = () => { m.el.removeEventListener('seeked', done); res(); };
        m.el.addEventListener('seeked', done);
        m.el.currentTime = want;
        setTimeout(done, 3000);
      }));
    };
    if (seg.kind === 'shot') {
      seek(proj.shots[seg.i], shotLt(seg, t));
    } else {
      seek(proj.shots[seg.i], +proj.shots[seg.i].dur || 2);
      seek(proj.shots[seg.i + 1], Math.max(0, t - seg.bWin0));
    }
    return Promise.all(jobs);
  }
  function syncVideos(proj, t, playing) {
    const tl = timeline(proj);
    const seg = segAt(tl, t);
    if (!seg) return;
    const sync = (shot, lt) => {
      const m = resolveMedia(shot);
      if (!m || m.kind !== 'video' || !m.el) return;
      const want = videoTime(shot, lt);
      if (want != null && Math.abs(m.el.currentTime - want) > 0.3) { try { m.el.currentTime = want; } catch (e) {} }
      if (playing && m.el.paused) m.el.play().catch(() => {});
      if (!playing && !m.el.paused) m.el.pause();
    };
    // keep every other video paused
    for (const [id, m] of Object.entries(SK.media)) {
      if (m && m.kind === 'video' && m.el && !m.el.paused) {
        const used = seg.kind === 'shot' ? [proj.shots[seg.i]] : [proj.shots[seg.i], proj.shots[seg.i + 1]];
        if (!used.some(s => s && s.media === id)) m.el.pause();
      }
    }
    if (seg.kind === 'shot') sync(proj.shots[seg.i], shotLt(seg, t));
    else { sync(proj.shots[seg.i], +proj.shots[seg.i].dur || 2); sync(proj.shots[seg.i + 1], Math.max(0, t - seg.bWin0)); }
  }

  return {
    SIZES, paramsOf, fieldsOf, newShot, applyPreset, newTrans, normTrans, normLayer,
    defaultProject, timeline, segAt, shotLt, clipWindow, resolveMedia, mediaKeyOf,
    getAnalysis, progress, drawShot, render, prepare, syncVideos, videoTime, active,
  };
})();
