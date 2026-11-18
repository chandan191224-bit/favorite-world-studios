// Deterministic compositor & timeline engine for Hook Editor Studio Pro.
HES.engine = (() => {
  const U = HES.util, A = HES.audio, M = HES.motions, TR = HES.transitions, OV = HES.overlays;

  const media = Object.create(null); // id -> { id, kind, name, img, video, w, h, dur, dataUrl, path, url }

  function registerMedia(id, entry) {
    media[id] = Object.assign({ id }, entry);
    return media[id];
  }

  function getMedia(id) { return id ? media[id] || null : null; }
  function allMedia() { return Object.values(media); }

  function loadImageUrl(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Image load failed'));
      img.src = url;
    });
  }

  function loadVideoUrl(url) {
    return new Promise((res, rej) => {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      const done = () => {
        v.removeEventListener('loadeddata', done);
        v.removeEventListener('error', fail);
        res(v);
      };
      const fail = () => {
        v.removeEventListener('loadeddata', done);
        v.removeEventListener('error', fail);
        rej(new Error('Video load failed'));
      };
      v.addEventListener('loadeddata', done);
      v.addEventListener('error', fail);
      v.src = url;
      v.load();
    });
  }

  async function ingestProjectMedia(proj, reset = false) {
    if (reset) {
      for (const k of Object.keys(media)) {
        const m = media[k];
        if (m && m.video) { try { m.video.pause(); m.video.removeAttribute('src'); m.video.load(); } catch {} }
        delete media[k];
      }
      activeVidLru.length = 0;
    }
    const map = proj.media || {};
    const jobs = [];
    let vidCount = 0;
    for (const [id, m] of Object.entries(map)) {
      if (m.kind === 'video') vidCount++;
    }
    for (const [id, m] of Object.entries(map)) {
      if (media[id] && (media[id].img || media[id].video) && (!m.dataUrl || media[id].dataUrl === m.dataUrl)) continue;
      if (m.kind === 'video' && (m.url || m.dataUrl)) {
        // When >4 videos exist in headless render, lazy-load active/next videos via LRU pool so Chromium never starves decoders
        if (window.__HEADLESS && vidCount > 4) {
          registerMedia(id, { ...m, kind: 'video', video: null, w: 1920, h: 1080, dur: m.dur || 6 });
        } else {
          jobs.push(loadVideoUrl(m.url || m.dataUrl).then(v => {
            registerMedia(id, { ...m, kind: 'video', video: v, w: v.videoWidth || 1920, h: v.videoHeight || 1080, dur: v.duration || m.dur || 5 });
          }).catch(() => registerMedia(id, { ...m, kind: 'video', video: null, w: 1920, h: 1080, dur: m.dur || 5 })));
        }
      } else if (m.dataUrl || m.url) {
        jobs.push(loadImageUrl(m.dataUrl || m.url).then(img => {
          registerMedia(id, { ...m, kind: 'image', img, w: img.naturalWidth || 1920, h: img.naturalHeight || 1080, dur: m.dur || 4 });
        }).catch(() => registerMedia(id, { ...m, kind: 'image', w: 1920, h: 1080, dur: m.dur || 4 })));
      }
    }
    await Promise.all(jobs);
  }

  const activeVidLru = [];
  async function ensureVideoLoaded(m) {
    if (!m || m.kind !== 'video') return null;
    if (m.video && m.video.readyState >= 2) {
      const idx = activeVidLru.indexOf(m.id);
      if (idx >= 0) activeVidLru.splice(idx, 1);
      activeVidLru.push(m.id);
      return m.video;
    }
    const srcUrl = m.url || m.dataUrl;
    if (!srcUrl) return null;
    // Evict oldest decoders if >3 open in headless mode
    while (window.__HEADLESS && activeVidLru.length >= 3) {
      const oldId = activeVidLru.shift();
      const om = media[oldId];
      if (om && om.video) {
        try { om.video.pause(); om.video.removeAttribute('src'); om.video.load(); } catch {}
        om.video = null;
      }
    }
    try {
      const v = await loadVideoUrl(srcUrl);
      m.video = v;
      m.w = v.videoWidth || m.w || 1920;
      m.h = v.videoHeight || m.h || 1080;
      m.dur = v.duration || m.dur || 6;
      activeVidLru.push(m.id);
      return v;
    } catch { return null; }
  }

  function resolveTimeline(proj) {
    const shots = proj.shots || [];
    const items = [];
    let t = 0;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const dur = Math.max(0.35, Number(s.dur) || 2.0);
      const ov = (i > 0 && s.trIn && s.trIn !== 'cut') ? Math.min(dur * 0.45, Math.max(0.08, Number(s.trDur) || 0.32)) : 0;
      const start = Math.max(0, t - ov * 0.5);
      const end = start + dur;
      items.push({ shot: s, idx: i, start, end, dur, trDur: ov });
      t = end;
    }
    const maxOv = (proj.overlays || []).reduce((m, o) => Math.max(m, (Number(o.start) || 0) + (Number(o.dur) || 0)), 0);
    const totalDur = Math.max(1.0, t || 0, proj.durationLock ? Number(proj.duration) || t : Math.max(t, maxOv));
    return { items, totalDur };
  }

  async function seekVideosForTime(proj, t) {
    const { items } = resolveTimeline(proj);
    const activeIds = new Set();
    for (const it of items) {
      if (t >= it.start - 0.12 && t <= it.end + 0.12) activeIds.add(it);
    }
    for (const it of activeIds) {
      const m = getMedia(it.shot.mediaId);
      if (m && m.kind === 'video') {
        const v = await ensureVideoLoaded(m);
        if (v && v.readyState >= 1) {
          const sp = Number(it.shot.speed) || 1;
          const rawT = (Number(it.shot.mediaOffset) || 0) + Math.max(0, t - it.start) * sp;
          const target = Math.min(Math.max(0.04, (m.dur || 6) - 0.04), rawT % Math.max(0.2, m.dur || 6));
          if (Math.abs(v.currentTime - target) > 0.025) {
            await new Promise(r => {
              const onS = () => { v.removeEventListener('seeked', onS); r(); };
              v.addEventListener('seeked', onS);
              try { v.currentTime = target; } catch { v.removeEventListener('seeked', onS); r(); }
              setTimeout(r, 450);
            });
          }
        }
      }
    }
  }

  let grainTile = null;
  function getGrainTile() {
    if (grainTile) return grainTile;
    const c = U.canvas(160, 160), x = c.getContext('2d');
    const id = x.createImageData(160, 160), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.floor(U.h1(i * 0.25) * 255);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 28;
    }
    x.putImageData(id, 0, 0);
    grainTile = c;
    return grainTile;
  }

  function renderAt(ctx, proj, t, opt = {}) {
    const W = opt.W || proj.w || 1920, H = opt.H || proj.h || 1080;
    const mode = opt.mode || 'composite';
    const { items, totalDur } = resolveTimeline(proj);
    const tc = U.clamp(t, 0, Math.max(0.01, totalDur));
    const beat = A.stateAt(proj, tc);
    const sync = proj.beatSync == null ? 1 : Number(proj.beatSync);

    ctx.clearRect(0, 0, W, H);
    if (mode === 'green') { ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 0, W, H); }
    else if (mode === 'blue') { ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 0, W, H); }
    else if (mode === 'composite') { ctx.fillStyle = proj.bg || '#07090d'; ctx.fillRect(0, 0, W, H); }

    if (mode === 'composite' || mode === 'matte') {
      // Find active shot & possible incoming transition
      let curr = items[0] || null;
      let prev = null;
      for (let i = 0; i < items.length; i++) {
        if (tc >= items[i].start) { prev = curr; curr = items[i]; }
      }
      if (curr) {
        const lt = Math.max(0, tc - curr.start);
        const inTr = prev && prev !== curr && curr.trDur > 0 && lt < curr.trDur;
        if (inTr) {
          const p = U.clamp(lt / curr.trDur, 0, 1);
          const prevLt = Math.max(0, tc - prev.start);
          TR.render(
            ctx,
            curr.shot.trIn || 'cut',
            p,
            () => M.renderShot(ctx, prev.shot, prevLt, prev.dur, W, H, beat, getMedia(prev.shot.mediaId), sync),
            () => M.renderShot(ctx, curr.shot, lt, curr.dur, W, H, beat, getMedia(curr.shot.mediaId), sync),
            W, H
          );
        } else {
          M.renderShot(ctx, curr.shot, lt, curr.dur, W, H, beat, getMedia(curr.shot.mediaId), sync);
        }
      }
    }

    // Subtle film grain + beat vignette on composite
    if (mode === 'composite') {
      const grain = proj.grain == null ? 0.14 : Number(proj.grain);
      if (grain > 0.01) {
        const tile = getGrainTile();
        const fidx = Math.floor(tc * 24);
        const ox = -Math.floor(U.h1(fidx * 7.3) * 160);
        const oy = -Math.floor(U.h1(fidx * 13.7 + 19) * 160);
        ctx.save();
        ctx.globalAlpha = U.clamp(grain, 0, 0.45);
        ctx.globalCompositeOperation = 'overlay';
        for (let y = oy; y < H; y += 160) for (let x = ox; x < W; x += 160) ctx.drawImage(tile, x, y);
        ctx.restore();
      }
      // Subtle beat edge pulse
      if (beat.downbeatPulse > 0.05 && sync > 0.05) {
        ctx.save();
        const g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.34, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${(0.28 + beat.downbeatPulse * 0.18 * sync).toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // Overlays stack (rendered in composite, alpha, green, blue!)
    const ovs = proj.overlays || [];
    for (const ov of ovs) {
      if (ov.hidden) continue;
      const st = Number(ov.start) || 0, d = Math.max(0.2, Number(ov.dur) || 2.5);
      if (tc >= st && tc <= st + d) {
        OV.drawOverlay(ctx, ov, tc - st, d, W, H, beat, sync);
      }
    }

    // Optional cinema letterbox bars (drawn over shots & subtle overlays, skipped on raw disclaimer shot)
    const activeShotObj = items.find(it => tc >= it.start && tc <= it.end);
    if (proj.cinemaBars && mode === 'composite' && !(activeShotObj && activeShotObj.shot.raw)) {
      const barH = Math.round(H * (138 / 1080));
      ctx.fillStyle = '#040507';
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);
    }

    if (mode === 'matte') {
      // Matte uses overlays alpha / shot luminance
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Editor-only safe guides
    if (opt.guides) {
      const barH = Math.round(H * (138 / 1080));
      ctx.save();
      ctx.strokeStyle = 'rgba(229,169,60,0.45)';
      ctx.lineWidth = Math.max(1, W / 960);
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(W * 0.05, barH + 12, W * 0.9, H - barH * 2 - 24);
      ctx.restore();
    }
  }

  return { registerMedia, getMedia, allMedia, ingestProjectMedia, resolveTimeline, seekVideosForTime, renderAt };
})();
