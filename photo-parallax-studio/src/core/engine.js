// Timeline: shot → transition → shot → … Every shot is one photo brought alive by a camera move.
// Renders any time t frame-exact; preview == export (seeded, no clock, no Math.random).
PP.engine = (() => {
  const U = PP.util;

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'], ['3840x2160', '4K 16:9'], ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'], ['1080x1080', '1080 square'],
  ];

  function newShot(source, dur = 5) {
    return {
      id: U.uid(), duration: dur, source,
      move: { fx: 'push', params: {}, seed: 3 },
      depth: { mode: 'auto', bands: 4, parallax: 0.65, strength: 1, focus: [0.5, 0.55], renderer: 'auto', strokes: [] },
      overlays: [], atmos: [], grade: { look: 'warm', vignette: 0.45, grain: 0.12, letterbox: 0, frame: 0, dof: 0 },
      transition: null, seed: 3,
    };
  }
  function newTransition(fxId, dur) {
    const fx = PP.transitions.byId[fxId];
    return { fx: fxId, duration: dur || (fx && fx.dur) || 0.6, params: {}, seed: Math.floor(Math.random() * 9999) + 1 };
  }
  function defaultProject() {
    const p = { version: 1, name: 'Untitled parallax video', width: 1920, height: 1080, fps: 30, shots: [] };
    const s1 = newShot({ type: 'demo', demo: 'ridge' }, 4.5);
    s1.move = { fx: 'push', params: { amount: 0.2 }, seed: 3 };
    s1.grade = { look: 'warm', vignette: 0.4, grain: 0.1, letterbox: 0, frame: 0, dof: 0 };
    const s2 = newShot({ type: 'demo', demo: 'horseman' }, 5);
    s2.move = { fx: 'push', params: { amount: 0.3 }, seed: 5 };
    s2.grade = { look: 'bw2', vignette: 0.55, grain: 0.28, letterbox: 0, frame: 0, dof: 0 };
    s2.overlays = [Object.assign(PP.overlays.create('caption'), { text: 'एक तस्वीर, एक पूरी कहानी', year: '1947', start: 0.4 })];
    s2.transition = newTransition('dip', 0.6);
    const s3 = newShot({ type: 'demo', demo: 'room' }, 5);
    s3.move = { fx: 'push-soft', params: { amount: 0.17 }, seed: 8 };
    s3.atmos = [PP.atmos.create('rays'), PP.atmos.create('dust')];
    s3.grade = { look: 'warm', vignette: 0.5, grain: 0.14, letterbox: 0, frame: 0, dof: 0 };
    s3.transition = newTransition('defocus', 0.7);
    const s4 = newShot({ type: 'demo', demo: 'desert' }, 5);
    s4.move = { fx: 'push', params: { amount: 0.22 }, seed: 11 };
    s4.atmos = [PP.atmos.create('embers')];
    s4.grade = { look: 'teal', vignette: 0.55, grain: 0.12, letterbox: 2.39, frame: 0, dof: 0 };
    s4.transition = newTransition('zoom', 0.8);
    p.shots.push(s1, s2, s3, s4);
    return p;
  }

  // segments: incoming transition of shot i (i>0), then its hold — same convention as the house studio
  function timeline(proj) {
    const segs = [];
    let t = 0;
    proj.shots.forEach((s, i) => {
      if (i > 0 && s.transition) {
        const d = Math.max(0.05, +s.transition.duration || 0.6);
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

  const tmps = {};
  function tmp(key, W, H) {
    let c = tmps[key];
    if (!c || c.width !== W || c.height !== H) c = tmps[key] = U.canvas(W, H);
    return c;
  }
  function clearTmps() { for (const k of Object.keys(tmps)) delete tmps[k]; }

  function mediaKey(shot) {
    const s = shot.source || {};
    return (s.type === 'demo' ? 'demo:' + s.demo : s.type === 'image' ? 'media:' + s.media : 'solid:' + (s.color || '')) + '|' + (s.fit || 'cover');
  }

  // ---------- auto depth bookkeeping ----------
  function autoFor(shot, plate) {
    const dep = shot.depth || {};
    if (dep.mode !== 'auto' || !PP.depth.hasAuto()) return null;
    const r = PP.depth.autoForPlate(shot.source, plate);   // starts the job if needed; cached when done
    return r === 'pending' ? null : r;
  }
  async function ensureAuto(shot) {
    let plate;
    try { plate = PP.sources.plate(shot.source, 1920, 1080); } catch (e) { return; }
    if ((shot.depth || {}).mode !== 'auto' || !PP.depth.hasAuto()) return;
    let r = PP.depth.autoForPlate(shot.source, plate);
    if (r === 'pending') {
      const pr = PP.depth.autoForPlate(shot.source, plate, true); // the running promise
      if (pr && pr.then) {
        await pr.then(() => { PP.onAutoDepth && PP.onAutoDepth(); })
          .catch(e => { if (PP.onAutoDepthErr) PP.onAutoDepthErr(e); });
      }
    }
  }

  // ---------- shot render ----------
  // mid layers (atmosphere + text) sorted with the depth stack
  function midLayers(shot, lt, W, H, S) {
    const mids = [];
    for (const o of shot.atmos || []) {
      const a = PP.atmos.byId[o.kind];
      mids.push({ depth: a && a.depth != null ? a.depth : 0.6, draw: g => PP.atmos.draw(g, o, lt, W, H, S, {}) });
    }
    for (const o of shot.overlays || []) {
      const d = PP.overlays.byId[o.kind];
      const od = o.depth != null ? o.depth : (d && d.fields.find(f => f.key === 'depth') || {}).def;
      mids.push({ depth: od == null ? 0.95 : od, overlay: o, draw: g => PP.overlays.drawAll(g, { overlays: [o], duration: shot.duration }, lt, W, H, S, {}) });
    }
    mids.sort((a, b) => a.depth - b.depth);
    return mids;
  }

  function bandBlurred(band, amount) {
    const q = Math.round(amount * 8) / 8;
    if (q <= 0.01) return band.canvas;
    if (band._bq === q && band._bc) return band._bc;
    band._bq = q; band._bc = PP.inpaint.blurred(band.canvas, q * 0.55);
    return band._bc;
  }

  // Smallest extra zoom (around the frame centre) that keeps the moved photo covering the whole frame.
  // The shift itself is scaled by that zoom too, so solve per edge: over * (0.5 - edge) >= 0.5.
  // K = layer parallax (checks the nearest and farthest layer); null = one flat plane.
  function coverScale(cam, focus, W, H, K) {
    const ms = K == null ? [1] : [PP.moves.layerMul(0, K), PP.moves.layerMul(1, K)];
    const q = v => (v > 1e-4 ? 0.5 / v : 50);
    let need = 1, mMax = 1;
    for (const m of ms) {
      mMax = Math.max(mMax, m);
      const z = 1 + (cam.zoom - 1) * m, x = cam.x * m, y = cam.y * m;
      const L = focus[0] + x - focus[0] * z, R = focus[0] + x + (1 - focus[0]) * z;
      const T = focus[1] + y - focus[1] * z, B = focus[1] + y + (1 - focus[1]) * z;
      need = Math.max(need, q(0.5 - L), q(R - 0.5), q(0.5 - T), q(B - 0.5));
    }
    const r = Math.abs(cam.rot || 0) * mMax;
    if (r) need *= Math.cos(r) + Math.sin(r) * Math.max(W / H, H / W);
    return need;
  }

  function drawShot(g, shot, lt, W, H, proj, opts = {}) {
    const S = Math.min(W, H);
    const plate = PP.sources.plate(shot.source, W, H);
    const dep = shot.depth || {};
    const mk = mediaKey(shot) + '|' + plate.width + 'x' + plate.height;
    const field = PP.depth.field(shot, plate, { mediaKey: mk, auto: autoFor(shot, plate, false) });
    const dur = Math.max(0.05, shot.duration || 1);
    const p = U.clamp(lt / dur);
    const cam = PP.moves.cam(shot.move || { fx: 'push', params: {} }, p);
    const focus = dep.focus || [0.5, 0.55];
    const K = dep.parallax == null ? 0.65 : dep.parallax;
    const moveDef = PP.fx.byId[(shot.move || {}).fx] || {};
    const moveP = Object.assign({}, moveDef.defaults, (shot.move || {}).params || {});
    const wantMesh = dep.renderer === 'mesh' || (dep.renderer !== 'cutout' && moveDef.renderer === 'mesh');
    const mids = midLayers(shot, lt, W, H, S);
    const focusD = PP.depth.sampleAt(field, focus[0], focus[1]);
    g.__focusD = focusD;

    if (PP.subject && PP.subject.on(shot)) {
      // subject cut-out mode: clean background plate + rim-lit cut-out subject (+ text between them)
      const Kp = Math.max(0.35, K);
      const over = Math.max(cam.zoom >= 1 ? 1 : 1 / Math.max(0.05, cam.zoom), 1 + 2.2 * Math.abs(cam.x) + 2.2 * Math.abs(cam.y), coverScale(cam, focus, W, H, Kp));
      PP.subject.draw(g, shot, plate, field, cam, focus, K, W, H, mids, mk, p, focusD, over);
    } else if (K <= 0.001 && !wantMesh) {
      // flat Ken Burns: single plane, with an overscan margin so pans never expose the edge
      const over = Math.max(cam.zoom >= 1 ? 1 : 1 / Math.max(0.05, cam.zoom), 1 + 2.2 * Math.abs(cam.x) + 2.2 * Math.abs(cam.y), coverScale(cam, focus, W, H, null));
      g.save();
      g.translate(W / 2, H / 2); g.scale(over, over); g.translate(-W / 2, -H / 2);
      g.translate(focus[0] * W + cam.x * W, focus[1] * H + cam.y * H);
      g.rotate(cam.rot); g.scale(cam.zoom, cam.zoom);
      g.translate(-focus[0] * W, -focus[1] * H);
      g.drawImage(plate, 0, 0, W, H);
      g.restore();
      for (const m of mids) m.draw(g);
    } else if (wantMesh && PP.mesh.available()) {
      const glc = PP.mesh.render(plate, PP.depth.smoothForMesh(field), cam, {
        W, H, focus,
        depthZ: moveP.depthZ == null ? 1.05 : moveP.depthZ,
        overscan: moveP.overscan == null ? 0.22 : moveP.overscan,
        gridKey: mk + '|' + dep.mode + '|' + (dep.strength == null ? 1 : dep.strength) + '|' + (dep.seed || 1) + '|' + (dep.focus || []).join(',') + '|' + JSON.stringify(dep.strokes || []).length,
        texKey: mk,
      });
      g.save();
      if (cam.rot) {
        g.translate(W / 2, H / 2); g.rotate(cam.rot); g.translate(-W / 2, -H / 2);
        const s = 1 + Math.abs(cam.rot) * 0.6;
        g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-W / 2, -H / 2);
      }
      g.drawImage(glc, 0, 0, W, H);
      g.restore();
      // atmosphere/text in front of the single displaced surface
      for (const m of mids) m.draw(g);
    } else {
      // layered cut-outs (the classic effect) — far first, near on top.
      // A global overscan margin (extra zoom around the frame centre) keeps lateral/vertical
      // camera shifts and pull-outs from exposing the edge of the farthest layer.
      const bands = PP.inpaint.bands(shot, plate, field, mk);
      const dof = (shot.grade && shot.grade.dof) || 0;
      const over = Math.max(cam.zoom >= 1 ? 1 : 1 / Math.max(0.05, cam.zoom), 1 + 2.2 * Math.abs(cam.x) + 2.2 * Math.abs(cam.y), coverScale(cam, focus, W, H, K));
      g.save();
      g.translate(W / 2, H / 2); g.scale(over, over); g.translate(-W / 2, -H / 2);
      let mi = 0;
      for (let i = 0; i < bands.list.length; i++) {
        const b = bands.list[i];
        // atmosphere behind this band
        while (mi < mids.length && mids[mi].depth <= b.depth) { mids[mi++].draw(g); }
        g.save();
        PP.moves.applyLayer(g, cam, b.depth, K, focus, W, H);
        let img = b.canvas;
        if (dof > 0.02) {
          const blurAmt = U.clamp(dof * (focusD - b.depth) * 1.6);
          if (blurAmt > 0.03) img = bandBlurred(b, blurAmt);
        }
        g.drawImage(img, 0, 0, W, H);
        g.restore();
      }
      while (mi < mids.length) mids[mi++].draw(g);
      g.restore();
    }
    PP.grade.apply(g, shot, W, H, { t: lt, fps: (proj && proj.fps) || 30, seed: shot.seed || 1 });
  }

  // draw one shot at time lt into ctx (clears it first)
  function renderShot(g, shot, lt, W, H, proj, opts) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0a0c10';
    g.fillRect(0, 0, W, H);
    try { drawShot(g, shot, lt, W, H, proj, opts); }
    catch (e) {
      g.fillStyle = '#141821'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#5b6472'; g.font = `${Math.round(H / 24)}px Mukta, sans-serif`;
      g.textAlign = 'center';
      g.fillText(e && e.message ? e.message : 'loading…', W / 2, H / 2);
      g.textAlign = 'left';
    }
  }

  // draw time t of the whole project
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height;
    const tl = opts.tl || timeline(proj);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!proj.shots.length) { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); return; }
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (seg.kind === 'hold') {
      renderShot(ctx, proj.shots[seg.shot], t - seg.t0, W, H, proj, opts);
      return;
    }
    const tr = proj.shots[seg.to].transition;
    const A = tmp('A', W, H), B = tmp('B', W, H);
    const [wa0, wa1] = shotWindow(tl, seg.from), [wb0, wb1] = shotWindow(tl, seg.to);
    renderShot(A.getContext('2d'), proj.shots[seg.from], t - wa0, W, H, proj, opts);
    renderShot(B.getContext('2d'), proj.shots[seg.to], t - wb0, W, H, proj, opts);
    const dur = seg.t1 - seg.t0;
    const p = U.clamp((t - seg.t0) / dur);
    PP.transitions.draw(ctx, tr ? tr.fx : 'fade', p, A, B, W, H, {
      params: tr && tr.params, seed: tr && tr.seed,
      focus: (proj.shots[seg.from].depth || {}).focus,
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // async: make sure photos are decoded and auto depth is ready for the shots visible at t
  async function prepare(proj, t) {
    const tl = timeline(proj);
    const seg = segAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    const idx = seg.kind === 'hold' ? [seg.shot] : [seg.from, seg.to];
    const jobs = [];
    for (const i of idx) {
      const s = proj.shots[i];
      if (!s) continue;
      jobs.push(PP.sources.ensure(s.source).catch(() => {}));
      jobs.push(ensureAuto(s));
    }
    await Promise.all(jobs);
  }
  async function prepareAll(proj) {
    const jobs = [];
    for (const s of proj.shots) {
      jobs.push(PP.sources.ensure(s.source).catch(() => {}));
      jobs.push(ensureAuto(s));
    }
    await Promise.all(jobs);
  }

  return {
    SIZES, newShot, newTransition, defaultProject, timeline, segAt, shotWindow,
    render, renderShot, drawShot, prepare, prepareAll, tmp, clearTmps, mediaKey,
    autoForShot: (shot, plate) => autoFor(shot, plate, false),
  };
})();
