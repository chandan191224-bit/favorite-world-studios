// Timeline: shot → transition → shot → … Renders any time t into a canvas, frame-exact.
PT.engine = (() => {
  const U = PT.util, M = PT.materials, SRC = PT.sources;

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square'],
  ];

  function newShot(source, dur = 2) {
    return { id: U.uid(), source, duration: dur, transition: null, overlay: null };
  }
  function newTransition(fxId, presetParams, dur) {
    const fx = PT.fx.byId[fxId];
    return { fx: fxId, duration: dur || (fx && fx.dur) || 1.2, params: Object.assign({}, presetParams || {}), seed: Math.floor(Math.random() * 9999) + 1, sfx: false, // user rule 2026-10-29: no sound effects by default
      stopMotion: false };
  }
  function defaultProject() {
    const p = { version: 1, name: 'Untitled paper video', width: 1920, height: 1080, fps: 30, stopMotionFps: 12, sfxVolume: 0.8, shots: [] };
    p.shots.push(newShot({ type: 'paper', material: 'newspaper', crumple: 0.45, seed: 3, lang: 'hi' }, 1.5));
    const s2 = newShot({ type: 'paper', material: 'white', crumple: 0.7, seed: 5, title: 'Paper Transition Studio', subtitle: 'Favorite World', font: 'serif' }, 1.8);
    s2.transition = newTransition('hole', {}, 1.3);
    const s3 = newShot({ type: 'paper', material: 'color', color: '#f0c43c', crumple: 0.4, seed: 8, title: 'अब हर पेपर ट्रांज़िशन', subtitle: 'tear · burn · crumple · fold · roll', font: 'sans' }, 1.8);
    s3.transition = newTransition('peel', {}, 1.3);
    const s4 = newShot({ type: 'key', color: '#00ff00' }, 1);
    s4.transition = newTransition('crumple', {}, 1.6);
    p.shots.push(s2, s3, s4);
    return p;
  }

  // segments: hold of shot i (minus nothing), then its outgoing transition into shot i+1
  function timeline(proj) {
    const segs = [];
    let t = 0;
    proj.shots.forEach((s, i) => {
      if (i > 0 && s.transition) {
        const d = Math.max(0.1, +s.transition.duration || 1);
        segs.push({ kind: 'trans', from: i - 1, to: i, t0: t, t1: t + d });
        t += d;
      }
      const h = Math.max(0, +s.duration || 0);
      segs.push({ kind: 'hold', shot: i, t0: t, t1: t + h });
      t += h;
    });
    return { segs, total: t };
  }
  function segAt(tl, t) {
    for (const s of tl.segs) if (t >= s.t0 && t < s.t1) return s;
    return tl.segs[tl.segs.length - 1];
  }
  // where each shot's own clock starts (for video / ken burns): shot is visible from the start of its
  // incoming transition to the end of its outgoing transition
  function shotWindow(tl, i) {
    let start = null, end = 0;
    for (const s of tl.segs) {
      if ((s.kind === 'hold' && s.shot === i) || (s.kind === 'trans' && (s.from === i || s.to === i))) {
        if (start === null) start = s.t0;
        end = s.t1;
      }
    }
    return [start || 0, end];
  }

  const solids = {};
  function solid(color, W, H) {
    const k = color + W + 'x' + H;
    if (!solids[k]) { const c = U.canvas(W, H), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, W, H); solids[k] = c; }
    return solids[k];
  }
  const tmps = {};
  function tmp(key, W, H) {
    let c = tmps[key];
    if (!c || c.width !== W || c.height !== H) c = tmps[key] = U.canvas(W, H);
    return c;
  }

  function sourceFor(proj, tl, i, slot, t, opts, W, H) {
    const shot = proj.shots[i];
    let sp = shot.source;
    if (opts.matte) return solid(slot === 'A' ? '#000' : '#fff', W, H);
    // element exports: everything after the first shot becomes the key colour / transparency
    if (opts.incoming && (slot === 'B' || (opts.firstShot != null && i !== opts.firstShot))) sp = opts.incoming;
    const [ws, we] = shotWindow(tl, i);
    return SRC.render(sp, slot, W, H, t - ws, we - ws);
  }

  function fxParams(tr) {
    const fx = PT.fx.byId[tr.fx];
    return Object.assign({}, fx.defaults, tr.params || {});
  }

  // Draw time t of the project. opts: { matte, incoming (source spec forced for the incoming side), W, H }
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height, S = Math.min(W, H);
    const tl = opts.tl || timeline(proj);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!proj.shots.length) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); return; }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (seg.kind === 'hold') {
      ctx.drawImage(sourceFor(proj, tl, seg.shot, 'A', t, opts, W, H), 0, 0);
      if (!opts.matte) PT.overlays.draw(ctx, proj.shots[seg.shot], t - seg.t0, seg.t1 - seg.t0, W, H);
      return;
    }
    const tr = proj.shots[seg.to].transition, fx = PT.fx.byId[tr.fx];
    if (!fx) { ctx.drawImage(sourceFor(proj, tl, seg.to, 'B', t, opts, W, H), 0, 0); return; }
    const dur = seg.t1 - seg.t0;
    let p = U.clamp((t - seg.t0) / dur);
    if (tr.stopMotion) { const n = Math.max(1, Math.round(dur * (proj.stopMotionFps || 12))); p = Math.min(1, Math.floor(p * n + 1e-6) / n); }
    const A = sourceFor(proj, tl, seg.from, 'A', t, opts, W, H), B = sourceFor(proj, tl, seg.to, 'B', t, opts, W, H);
    drawTransition(ctx, tr, p, A, B, proj.shots[seg.from].source, proj.shots[seg.to].source, W, H, t - seg.t0, opts.matte);
  }

  // one transition frame; also used for the library thumbnails
  function drawTransition(ctx, tr, p, A, B, spA, spB, W, H, tSec = 0, matte = false) {
    const fx = PT.fx.byId[tr.fx];
    if (!fx) { ctx.drawImage(B, 0, 0); return; }
    const P = fxParams(tr), S = Math.min(W, H);
    const env = {
      W, H, S, seed: tr.seed || 1, t: tSec, dur: +tr.duration || 1, matte: !!matte, matteA: '#000', matteB: '#fff',
      shadow: P.shadow, rim: P.rim, E: U.ease[P.ease] || U.ease.rip, tmp,
      backA: M.back(M.backColor(spA), W, H), backB: M.back(M.backColor(spB), W, H),
    };
    if (matte) { env.rim = 0; env.shadow = 0; }
    if (P.reverse && fx.reversible) {
      [A, B] = [B, A]; [env.backA, env.backB] = [env.backB, env.backA];
      if (matte) env.matteA = '#fff';
      p = 1 - p;
    }
    ctx.save();
    fx.draw(ctx, p, A, B, P, env);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // ---- video sources ----
  function videoShots(proj) { return proj.shots.map((s, i) => [s, i]).filter(([s]) => s.source && s.source.type === 'video' && PT.media[s.source.media]); }
  function videoTime(proj, tl, i, t) {
    const [ws] = shotWindow(tl, i), sp = proj.shots[i].source, el = PT.media[sp.media].el;
    const d = el.duration || 1, local = (sp.start || 0) + Math.max(0, t - ws);
    return sp.loop === false ? Math.min(local, d - 0.04) : local % d;
  }
  function activeShots(tl, t) {
    const seg = segAt(tl, t);
    return seg.kind === 'hold' ? [seg.shot] : [seg.from, seg.to];
  }
  // export: seek every visible video to its exact frame
  async function prepare(proj, t, tl) {
    tl = tl || timeline(proj);
    const act = activeShots(tl, t);
    const jobs = [];
    for (const [s, i] of videoShots(proj)) {
      if (!act.includes(i)) continue;
      const el = PT.media[s.source.media].el, want = videoTime(proj, tl, i, t);
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
  // preview: keep playing videos roughly in sync
  function syncVideos(proj, t, playing) {
    const tl = timeline(proj), act = activeShots(tl, t);
    for (const [s, i] of videoShots(proj)) {
      const el = PT.media[s.source.media].el;
      if (!act.includes(i)) { if (!el.paused) el.pause(); continue; }
      const want = videoTime(proj, tl, i, t);
      if (Math.abs(el.currentTime - want) > 0.25) el.currentTime = want;
      if (playing && el.paused) el.play().catch(() => {});
      if (!playing && !el.paused) el.pause();
    }
  }

  return { SIZES, newShot, newTransition, defaultProject, timeline, segAt, render, drawTransition, prepare, syncVideos, fxParams, tmp, solid };
})();
