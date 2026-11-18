// Timeline: scene → scene → … Each scene is one layout (split, grid, collage…) filled with the user's photos/videos.
// A scene-to-scene transition overlaps the start of the next scene. Renders any time t, frame-exact.
CS.engine = (() => {
  const U = CS.util, L = CS.lib;

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square'],
  ];
  const TRANSITIONS = [
    ['cut', 'Cut'], ['fade', 'Cross-fade'], ['push-left', 'Push left'], ['push-up', 'Push up'], ['slide-over', 'Slide over'],
    ['zoom', 'Zoom through'], ['flash', 'White flash'],
  ];

  function newScene(presetOrFx, dur) {
    const pr = CS.fx.presets.find(p => p.id === presetOrFx);
    const fxId = pr ? pr.fx : presetOrFx, fx = CS.fx.byId[fxId];
    const n = (pr && pr.slots) || (fx && fx.slots) || 2;
    return {
      id: U.uid(), fx: fxId, preset: pr ? pr.id : null, dur: dur || (pr && pr.dur) || (fx && fx.dur) || 5,
      params: Object.assign({}, pr ? pr.params : {}), seed: Math.floor(Math.random() * 9000) + 1,
      slots: Array.from({ length: n }, () => ({ m: null, label: '' })), trans: { type: 'fade', dur: 0.5 },
    };
  }
  function defaultProject() {
    const p = { version: 1, name: 'Untitled collage video', width: 1920, height: 1080, fps: 30, scenes: [] };
    const s1 = newScene('jh-bw-collage', 6); s1.trans = { type: 'cut', dur: 0 };
    const s2 = newScene('vs-compare', 5); s2.slots[0].label = 'भारत'; s2.slots[1].label = 'चीन';
    const s3 = newScene('grid-3x3-cascade', 5);
    const s4 = newScene('wall-zoom-in', 6);
    p.scenes.push(s1, s2, s3, s4);
    return p;
  }

  function timeline(proj) {
    const segs = []; let t = 0;
    proj.scenes.forEach((s, i) => { const d = Math.max(0.2, +s.dur || 1); segs.push({ i, t0: t, t1: t + d }); t += d; });
    return { segs, total: t };
  }
  function segAt(tl, t) {
    for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s;
    return tl.segs[tl.segs.length - 1];
  }
  function transOf(proj, i) {
    const s = proj.scenes[i], tr = s && s.trans;
    if (!i || !tr || tr.type === 'cut' || !(tr.dur > 0)) return null;
    return { type: tr.type, dur: Math.min(+tr.dur, (+s.dur || 1) * 0.6) };
  }

  function params(scene) {
    const fx = CS.fx.byId[scene.fx];
    return Object.assign({}, fx ? fx.defaults : {}, scene.params || {});
  }

  // one frame of one scene at local time lt (seconds) into ctx (W x H). mode: composite | element | matte
  function drawScene(ctx, scene, lt, W, H, mode = 'composite', fps = 30) {
    const fx = CS.fx.byId[scene.fx];
    ctx.save();
    if (!fx) { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
    const P = params(scene), dur = Math.max(0.2, +scene.dur || 1), sfps = +P.stop || 0;
    const tq = sfps ? Math.floor(lt * sfps + 1e-6) / sfps : lt;
    const step = sfps ? Math.floor(lt * sfps + 1e-6) : Math.floor(lt * fps + 1e-6);
    const S = Math.min(W, H), seed = scene.seed || 1, srcs = {};
    const env = {
      W, H, S, t: tq, dur, p: U.clamp(tq / dur), seed, P, mode, step, fps,
      n: (scene.slots || []).length || fx.slots,
      src: i => srcs[i] || (srcs[i] = L.slotSource(scene, i)),
      label: i => ((scene.slots || [])[i] || {}).label || '',
      // stop-motion "boil": each element shifts a little every step (only when stop-motion + jitter are on)
      jit: (k, amt = 1) => {
        const a = (+P.jitter || 0) * amt * (sfps ? 1 : 0);
        if (!a) return [0, 0, 0];
        return [U.sh(step * 7 + k, seed + 1) * S * 0.0035 * a, U.sh(step * 7 + k, seed + 2) * S * 0.0035 * a, U.sh(step * 7 + k, seed + 3) * 0.006 * a];
      },
      bg: () => CS.look.background(ctx, env),
      labelSize: +P.labelSize || 1,
    };
    // gentle camera push for the whole scene (layouts with their own camera opt out)
    const drift = +P.drift || 0;
    if (drift && !fx.ownCamera) {
      const z = 1 + 0.05 * drift * U.ease.inOut(env.p);
      const ox = U.sh(seed, 41) * 0.012 * drift * env.p * W, oy = U.sh(seed, 43) * 0.008 * drift * env.p * H;
      ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    }
    try { fx.draw(ctx, env); } catch (e) { if (!drawScene.warned) { console.error('layout', scene.fx, e); drawScene.warned = true; } }
    ctx.restore();
    ctx.save();
    CS.look.vignette(ctx, env, +P.vignette || 0);
    CS.look.grain(ctx, env, +P.grain || 0);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function tmp(key, W, H) { return U.tmp('eng' + key, W, H); }

  // composite two scene frames for a scene-to-scene transition (q = 0..1)
  function blend(ctx, A, B, type, q, W, H, mode) {
    const e = U.ease.inOut(q);
    switch (type) {
      case 'push-left': ctx.drawImage(A, -e * W, 0); ctx.drawImage(B, W - e * W, 0); break;
      case 'push-up': ctx.drawImage(A, 0, -e * H); ctx.drawImage(B, 0, H - e * H); break;
      case 'slide-over': {
        ctx.drawImage(A, -e * W * 0.25, 0);
        ctx.save(); if (mode === 'composite') { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = W * 0.03; }
        ctx.drawImage(B, W - U.ease.outQuart(q) * W, 0); ctx.restore(); break;
      }
      case 'zoom': {
        const za = 1 + e * 0.6, zb = 0.85 + 0.15 * e;
        ctx.save(); ctx.globalAlpha = 1 - U.range(q, 0.3, 0.8); ctx.translate(W / 2, H / 2); ctx.scale(za, za); ctx.drawImage(A, -W / 2, -H / 2); ctx.restore();
        ctx.save(); ctx.globalAlpha = U.range(q, 0.3, 0.8); ctx.translate(W / 2, H / 2); ctx.scale(zb, zb); ctx.drawImage(B, -W / 2, -H / 2); ctx.restore();
        break;
      }
      case 'flash': {
        ctx.drawImage(q < 0.5 ? A : B, 0, 0);
        if (mode === 'composite') { ctx.save(); ctx.globalAlpha = 1 - Math.abs(q - 0.5) * 2; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        break;
      }
      default: ctx.drawImage(A, 0, 0); ctx.save(); ctx.globalAlpha = e; ctx.drawImage(B, 0, 0); ctx.restore();
    }
  }

  // Draw time t of the project. opts: { mode: composite|element|matte, W, H, tl }
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height, mode = opts.mode || 'composite', fps = proj.fps || 30;
    const tl = opts.tl || timeline(proj);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!proj.scenes.length) { if (mode === 'composite') { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); } return; }
    const tt = Math.max(0, Math.min(t, tl.total - 1e-6)), seg = segAt(tl, tt), lt = tt - seg.t0;
    const sub = mode === 'composite' ? 'composite' : 'matte' === mode ? 'matte' : 'element';
    const out = mode === 'matte' ? tmp('M', W, H) : null, g = out ? out.getContext('2d') : ctx;
    const tr = transOf(proj, seg.i);
    if (tr && lt < tr.dur) {
      const prev = proj.scenes[seg.i - 1], A = tmp('A', W, H), B = tmp('B', W, H);
      drawScene(A.getContext('2d'), prev, (+prev.dur || 1) + lt, W, H, sub, fps);
      drawScene(B.getContext('2d'), proj.scenes[seg.i], lt, W, H, sub, fps);
      blend(g, A, B, tr.type, lt / tr.dur, W, H, sub);
    } else drawScene(g, proj.scenes[seg.i], lt, W, H, sub, fps);
    if (out) {
      // B/W track matte: white wherever the collage has pixels
      const wct = tmp('W', W, H), wg = wct.getContext('2d');
      wg.drawImage(out, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, W, H);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(wct, 0, 0);
    }
  }

  // a preset frame for the library thumbnails and QA sheets (placeholder photos unless slots are given)
  function drawPreset(ctx, presetId, p, W, H, opts = {}) {
    const pr = CS.fx.presets.find(x => x.id === presetId);
    if (!pr) return;
    const sc = { fx: pr.fx, dur: pr.dur, params: Object.assign({}, pr.params, opts.params || {}), seed: opts.seed || 7,
      slots: opts.slots || Array.from({ length: pr.slots || (CS.fx.byId[pr.fx] || {}).slots || 2 }, (_, i) => ({ m: null, label: (pr.labels || [])[i] || '' })) };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    drawScene(ctx, sc, p * pr.dur, W, H, opts.mode || 'composite', 30);
  }

  // ---------- video sources ----------
  function visibleScenes(proj, t, tl) {
    tl = tl || timeline(proj);
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6))), lt = t - seg.t0, out = [[seg.i, lt]];
    const tr = transOf(proj, seg.i);
    if (tr && lt < tr.dur) out.push([seg.i - 1, (+proj.scenes[seg.i - 1].dur || 1) + lt]);
    return out;
  }
  // which time each visible video should show
  function videoWants(proj, t, tl) {
    const want = new Map();
    for (const [i, lt] of visibleScenes(proj, t, tl)) {
      for (const s of proj.scenes[i].slots || []) {
        const m = s && CS.media[s.m];
        if (!m || m.kind !== 'video' || !m.el || want.has(m)) continue;
        const d = m.el.duration || 1, local = (+s.start || 0) + Math.max(0, lt);
        want.set(m, s.loop === false ? Math.min(local, d - 0.04) : local % d);
      }
    }
    return want;
  }
  async function prepare(proj, t, tl) {
    const jobs = [];
    for (const [m, want] of videoWants(proj, t, tl)) {
      const el = m.el;
      if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) continue;
      jobs.push(new Promise(res => {
        const done = () => { el.removeEventListener('seeked', done); res(); };
        el.addEventListener('seeked', done);
        el.currentTime = want;
        setTimeout(done, 3000);
      }));
    }
    await Promise.all(jobs);
  }
  function syncVideos(proj, t, playing) {
    const want = videoWants(proj, t);
    for (const m of Object.values(CS.media)) {
      if (m.kind !== 'video' || !m.el) continue;
      if (!want.has(m)) { if (!m.el.paused) m.el.pause(); continue; }
      const w = want.get(m);
      if (Math.abs(m.el.currentTime - w) > 0.25) m.el.currentTime = w;
      if (playing && m.el.paused) m.el.play().catch(() => {});
      if (!playing && !m.el.paused) m.el.pause();
    }
  }

  return { SIZES, TRANSITIONS, newScene, defaultProject, timeline, segAt, params, drawScene, render, drawPreset, prepare, syncVideos, visibleScenes };
})();
