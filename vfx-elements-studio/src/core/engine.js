// Engine: project model + shots + layers + transitions + deterministic renderer.
// A project = { name, width, height, fps, lang, media{}, shots[] }.
// A shot = one piece of background (demo scene / colour / your photo / your video) with a
// stack of effect layers on it; shots play one after another with cut / cross-fade / dip
// transitions. A layer = { fx, preset, on, seed, start, dur, opacity, x, y, p, f }.
// Design space: 1080 design px = short side, so every export size renders identically.
VFX.engine = (() => {
  const U = VFX.util;
  VFX.media = VFX.media || {};

  const SIZES = [
    ['1920x1080', '1080p 16:9 (YouTube)'],
    ['3840x2160', '4K 16:9'],
    ['1280x720', '720p 16:9'],
    ['1080x1920', '1080×1920 vertical (Shorts / Reels)'],
    ['1080x1080', '1080 square'],
  ];

  // ---------------- layer / shot helpers ----------------
  function paramsOf(layer) {
    const fx = VFX.fx.byId[layer.fx], out = {};
    if (fx) for (const p of fx.params || []) out[p.k] = p.def;
    const pr = layer.preset && VFX.presets.byId[layer.preset];
    if (pr) Object.assign(out, pr.p || {});
    Object.assign(out, layer.p || {});
    out.x = layer.x == null ? (pr && pr.x != null ? pr.x : 0.5) : layer.x;
    out.y = layer.y == null ? (pr && pr.y != null ? pr.y : 0.5) : layer.y;
    return out;
  }
  function fieldsOf(layer) {
    const fx = VFX.fx.byId[layer.fx], out = {};
    if (fx) for (const f of fx.fields || []) out[f.k] = f.def || '';
    const pr = layer.preset && VFX.presets.byId[layer.preset];
    if (pr) Object.assign(out, pr.f || {});
    Object.assign(out, layer.f || {});
    return out;
  }
  function newLayer(presetId, over = {}) {
    const pr = presetId && VFX.presets.byId[presetId];
    if (!pr) throw new Error('unknown preset ' + presetId);
    return {
      id: over.id || U.uid(),
      fx: pr.el,
      preset: pr.id,
      on: over.on != null ? over.on : true,
      seed: over.seed != null ? +over.seed : 7,
      start: over.start != null ? +over.start : 0,
      dur: over.dur != null ? +over.dur : (pr.dur != null ? pr.dur : 6),
      opacity: over.opacity != null ? +over.opacity : 1,
      x: over.x != null ? over.x : (pr.x != null ? pr.x : 0.5),
      y: over.y != null ? over.y : (pr.y != null ? pr.y : 0.5),
      f: Object.assign({}, over.f || {}),
      p: Object.assign({}, over.p || {}),
    };
  }
  // replace what a layer shows, keeping timing/position when asked
  function applyPreset(layer, presetId, keep = {}) {
    const pr = VFX.presets.byId[presetId];
    if (!pr) return layer;
    layer.fx = pr.el;
    layer.preset = pr.id;
    layer.f = Object.assign({}, keep.f || {});
    layer.p = {};
    if (!keep.dur) layer.dur = pr.dur != null ? pr.dur : 6;
    if (!keep.pos) { layer.x = pr.x != null ? pr.x : 0.5; layer.y = pr.y != null ? pr.y : 0.5; }
    return layer;
  }
  function newShot(over = {}) {
    return {
      id: over.id || U.uid(),
      name: over.name || '',
      dur: over.dur != null ? +over.dur : 6,
      seed: over.seed != null ? +over.seed : 7,
      bg: Object.assign({ type: over.media ? 'media' : 'demo', backdrop: 'city', color: '#101014', media: null, fit: 'cover', zoom: 0, fx: 0.5, fy: 0.5, start: 0, loop: true }, over.bg || {}),
      trans: over.trans ? { type: over.trans.type || 'fade', dur: over.trans.dur != null ? +over.trans.dur : 0.6 } : { type: 'cut', dur: 0 },
      layers: (over.layers || []).map(l => l.preset ? newLayer(l.preset, l) : normLayer(l)),
    };
  }
  // normalise a hand-written layer: ids, on, seed, start, opacity, params always present
  function normLayer(l) {
    const fx = VFX.fx.byId[l.fx || l.el];
    if (!fx) throw new Error('unknown effect ' + (l.fx || l.el));
    return {
      id: l.id || U.uid(),
      fx: fx.id,
      preset: l.preset && VFX.presets.byId[l.preset] ? l.preset : (VFX.presets.byId[fx.id] ? fx.id : null),
      on: l.on != null ? l.on : true,
      seed: l.seed != null ? +l.seed : 7,
      start: l.start != null ? +l.start : 0,
      dur: l.dur != null ? +l.dur : (fx.dur || 6),
      opacity: l.opacity != null ? +l.opacity : 1,
      x: l.x != null ? l.x : (fx.x != null ? fx.x : 0.5),
      y: l.y != null ? l.y : (fx.y != null ? fx.y : 0.5),
      f: Object.assign({}, l.f || {}),
      p: Object.assign({}, l.p || {}),
    };
  }
  // normalise a hand-written shot; supports the pipeline shorthand:
  //   { preset: '<id>', media: {path:...}|'<id>', fields: {...}, dur }
  function normShot(s) {
    if (s.preset && VFX.presets.byId[s.preset]) {
      const lyr = newLayer(s.preset, { f: Object.assign({}, s.fields || {}, s.f || {}), p: s.p || {}, dur: s.dur, x: s.x, y: s.y, seed: s.seed });
      let bg = s.bg;
      let media = null;
      if (s.media) {
        media = typeof s.media === 'string' ? s.media : normMediaObj(s.media);
        bg = Object.assign({ type: 'media', backdrop: 'city', color: '#101014', fit: 'cover', zoom: 0, fx: 0.5, fy: 0.5, start: 0, loop: true }, s.bg || {}, { media });
      } else if (bg && bg.media && typeof bg.media === 'object') {
        bg = Object.assign({}, bg, { media: normMediaObj(bg.media) });
      }
      const shot = newShot({ name: s.name, dur: s.dur, seed: s.seed, bg: bg || { type: 'demo' }, trans: s.trans, layers: [lyr] });
      return shot;
    }
    if (s.layers) {
      const bg = s.bg && s.bg.media && typeof s.bg.media === 'object' ? Object.assign({}, s.bg, { media: normMediaObj(s.bg.media) }) : s.bg;
      return newShot({ name: s.name, dur: s.dur, seed: s.seed, bg, trans: s.trans, layers: s.layers.map(l => l.preset ? newLayer(l.preset, l) : normLayer(l)) });
    }
    if (s.fx || s.el) return newShot({ name: s.name, dur: s.dur, seed: s.seed, bg: s.bg, trans: s.trans, layers: [normLayer(s)] });
    return newShot({ name: s.name, dur: s.dur, seed: s.seed, bg: s.bg, trans: s.trans, layers: [] });
  }
  // inline media object -> an id in the media table (path/dataUrl kept for the pipeline).
  // The element is attached right away: pipeline projects must show the user's media.
  function normMediaObj(m) {
    const id = m.id || ('m' + U.uid());
    if (!VFX.media[id] || (!VFX.media[id].el && (m.dataUrl || m.url))) {
      const rec = {
        kind: m.kind || (/\.mp4|\.mov|\.webm|\.m4v/i.test(m.name || m.path || '') ? 'video' : 'image'),
        name: m.name || (m.path || '').split(/[\\/]/).pop() || 'media',
        path: m.path, dataUrl: m.dataUrl, url: m.url, el: null,
      };
      if (rec.kind === 'image' && (rec.dataUrl || rec.url)) {
        const el = new Image();
        el.onload = () => { if (VFX.media[id]) VFX.media[id]._loaded = true; };
        el.src = rec.dataUrl || rec.url;
        rec.el = el;
      } else if (rec.kind === 'video' && rec.url) {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = rec.url;
        v.addEventListener('loadeddata', () => { if (VFX.media[id]) VFX.media[id]._loaded = true; });
        v.addEventListener('seeked', () => { if (VFX.media[id]) VFX.media[id]._seeked = true; });
        rec.el = v;
      }
      VFX.media[id] = rec;
    }
    return id;
  }
  function normProject(p) {
    const out = Object.assign({
      version: 1, name: 'VFX डेमो', width: 1920, height: 1080, fps: 30, lang: 'hi',
      media: {}, shots: [],
    }, p || {});
    // bring media entries into the runtime registry (path resolution happens in render.mjs / app)
    for (const [id, m] of Object.entries(out.media || {})) {
      if (!VFX.media[id]) VFX.media[id] = { kind: m.kind, name: m.name, path: m.path, dataUrl: m.dataUrl, url: m.url, el: null };
    }
    out.shots = (out.shots || out.clips || []).map(normShot);
    if (!out.shots.length) out.shots = [newShot({})];
    return out;
  }

  function defaultProject() {
    return {
      version: 1,
      name: 'VFX डेमो',
      width: 1920, height: 1080, fps: 30, lang: 'hi',
      media: {},
      shots: [
        newShot({ name: 'युद्ध का माहौल', dur: 8, bg: { type: 'demo', backdrop: 'ruins' }, layers: [newLayer('cb-war-city')] }),
        newShot({ name: 'आग की रात', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: { type: 'demo', backdrop: 'city' }, layers: [newLayer('cb-partition-night')] }),
        newShot({ name: 'तूफ़ान आया', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: { type: 'demo', backdrop: 'field' }, layers: [newLayer('cb-storm-arrives')] }),
        newShot({ name: 'बारिश और शीशा', dur: 8, trans: { type: 'dip', dur: 0.6 }, bg: { type: 'demo', backdrop: 'city' }, layers: [newLayer('wa-rain-window')] }),
        newShot({ name: 'जलता अभिलेख', dur: 7, trans: { type: 'fade', dur: 0.6 }, bg: { type: 'demo', backdrop: 'ruins' }, layers: [newLayer('cb-burning-archive')] }),
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
  // which shots are visible at t (transition windows can show two), with blend alpha
  function activeAt(tl, t) {
    const out = [];
    if (!tl.segs.length) return out;
    const idx = tl.segs.findIndex(s => t >= s.t0 && t < s.t1);
    const i = idx < 0 ? tl.segs.length - 1 : idx;
    const seg = tl.segs[i];
    const tr = seg.shot.trans || { type: 'cut', dur: 0 };
    const d = Math.min(+tr.dur || 0, seg.dur * 0.9, i > 0 ? tl.segs[i - 1].dur * 0.9 : 0);
    if (tr.type !== 'cut' && d > 0.02 && i > 0) {
      const prev = tl.segs[i - 1];
      if (tr.type === 'fade' && t < seg.t0 + d / 2) {
        const w = U.clamp((t - (seg.t0 - d / 2)) / d);
        out.push({ seg: prev, local: Math.min(prev.dur - 1e-4, t - prev.t0), alpha: 1 - w });
        out.push({ seg, local: Math.max(0, t - seg.t0), alpha: w });
        return out;
      }
      if (tr.type === 'dip' && t < seg.t0 + d / 2) {
        const w = U.clamp((t - (seg.t0 - d / 2)) / d);                      // 0..1 over the dip
        if (w < 0.5) out.push({ seg: prev, local: Math.min(prev.dur - 1e-4, t - prev.t0), alpha: 1, dip: w * 2 });
        else out.push({ seg, local: Math.max(0, t - seg.t0), alpha: 1, dip: (1 - w) * 2 });
        return out;
      }
    }
    out.push({ seg, local: Math.max(0, Math.min(t - seg.t0, seg.dur - 1e-4)), alpha: 1 });
    return out;
  }

  // ---------------- procedural demo backdrops ----------------
  const bgs = {};
  function backdrop(kind, W, H) {
    const key = kind + W + 'x' + H;
    if (bgs[key]) return bgs[key];
    const LW = 480, LH = Math.max(2, Math.round(480 * H / W));
    const c = U.canvas(LW, LH), g = c.getContext('2d');
    if (kind === 'ruins') {
      // hazy war-morning: pale sky, broken blocks, rubble
      const gr = g.createLinearGradient(0, 0, 0, LH);
      gr.addColorStop(0, '#8f9488'); gr.addColorStop(0.45, '#b9b4a2'); gr.addColorStop(0.75, '#8d8271'); gr.addColorStop(1, '#57503f');
      g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
      const sg = g.createRadialGradient(LW * 0.7, LH * 0.4, 0, LW * 0.7, LH * 0.4, LH * 0.7);
      sg.addColorStop(0, 'rgba(240,236,214,.55)'); sg.addColorStop(1, 'rgba(240,236,214,0)');
      g.fillStyle = sg; g.fillRect(0, 0, LW, LH);
      // far broken skyline
      let x = 0, i = 0;
      while (x < LW) {
        const w = 22 + U.h1(i, 21) * 42, h = LH * (0.12 + U.h1(i, 33) * 0.3);
        const top = LH * 0.78 - h;
        g.fillStyle = 'rgba(84,80,70,.9)';
        g.fillRect(x, top, w, h + LH * 0.3);
        // broken top edge
        g.fillStyle = 'rgba(60,56,48,.95)';
        for (let k = 0; k < 4; k++) if (U.h1(i * 13 + k, 7) < 0.6) g.fillRect(x + k * w / 4, top - U.h1(i + k, 11) * h * 0.22, w / 4 + 1, h * 0.25);
        // dark empty windows
        g.fillStyle = 'rgba(28,26,22,.85)';
        for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 3; wx++)
          if (U.h1(i * 31 + wy * 5 + wx, 55) < 0.55) g.fillRect(x + 3 + wx * (w / 3 - 1), top + 4 + wy * h / 5.2, w / 5, h / 9);
        x += w + 3 + U.h1(i, 44) * 10; i++;
      }
      // rubble mounds
      for (let m = 0; m < 3; m++) {
        g.fillStyle = ['rgba(96,86,68,.95)', 'rgba(72,64,52,.95)', 'rgba(58,52,42,.98)'][m];
        g.beginPath(); g.moveTo(-20, LH);
        for (let px = 0; px <= LW + 20; px += 8) g.lineTo(px, LH * (0.86 + m * 0.045) + U.fbm2(px / 60 + m * 9, m * 5, 12, 3) * LH * 0.035);
        g.lineTo(LW, LH); g.closePath(); g.fill();
      }
    } else if (kind === 'field') {
      // open field under a heavy sky
      const gr = g.createLinearGradient(0, 0, 0, LH);
      gr.addColorStop(0, '#5d6a72'); gr.addColorStop(0.42, '#8d958f'); gr.addColorStop(0.62, '#a8a48d'); gr.addColorStop(0.7, '#7d7a5f'); gr.addColorStop(1, '#4c4a37');
      g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
      // cloud streaks
      for (let i = 0; i < 14; i++) {
        g.fillStyle = `rgba(${190 + U.h1(i, 3) * 30},${190 + U.h1(i, 5) * 25},${185 + U.h1(i, 7) * 25},${0.1 + U.h1(i, 9) * 0.16})`;
        const y = LH * 0.08 + U.h1(i, 11) * LH * 0.45, w = LW * (0.2 + U.h1(i, 13) * 0.5), h = LH * (0.02 + U.h1(i, 15) * 0.05);
        g.beginPath(); g.ellipse(U.h1(i, 17) * LW, y, w, h, 0, 0, U.TAU); g.fill();
      }
      // distant tree line
      g.fillStyle = 'rgba(60,62,48,.8)';
      g.beginPath(); g.moveTo(0, LH);
      for (let px = 0; px <= LW; px += 5) g.lineTo(px, LH * (0.7 + U.noise1(px / 30, 21) * 0.035));
      g.lineTo(LW, LH); g.closePath(); g.fill();
      // grass field with furrows
      for (let f = 0; f < 5; f++) {
        g.fillStyle = `rgba(${72 + f * 6},${70 + f * 5},${50 + f * 4},.85)`;
        g.beginPath(); g.moveTo(-20, LH);
        for (let px = 0; px <= LW + 20; px += 10) g.lineTo(px, LH * (0.74 + f * 0.05) + U.fbm2(px / 45 + f * 7, f * 3, 31, 3) * LH * 0.03);
        g.lineTo(LW, LH); g.closePath(); g.fill();
      }
    } else {
      // city at dusk (default): warm sky, lit windows — the house look
      const gr = g.createLinearGradient(0, 0, 0, LH);
      gr.addColorStop(0, '#2c3844'); gr.addColorStop(0.5, '#67655a'); gr.addColorStop(0.74, '#ad8f62'); gr.addColorStop(1, '#413d35');
      g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
      const sx = LW * 0.66, sy = LH * 0.62;
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, LH * 0.6);
      rg.addColorStop(0, 'rgba(255,206,128,.95)'); rg.addColorStop(0.3, 'rgba(255,175,88,.32)'); rg.addColorStop(1, 'rgba(255,175,88,0)');
      g.fillStyle = rg; g.fillRect(0, 0, LW, LH);
      g.fillStyle = 'rgba(38,36,30,.85)';
      g.beginPath(); g.moveTo(0, LH);
      for (let x = 0; x <= LW; x += 6) g.lineTo(x, LH * (0.68 + 0.08 * (U.noise1(x / 55, 11) * 0.5 + 0.5)));
      g.lineTo(LW, LH); g.closePath(); g.fill();
      let x = 0, i = 0;
      while (x < LW) {
        const w = 12 + U.h1(i, 21) * 26, h = LH * (0.08 + U.h1(i, 33) * 0.2);
        g.fillStyle = 'rgba(17,16,14,.95)'; g.fillRect(x, LH * 0.84 - h, w, h + LH * 0.2);
        g.fillStyle = 'rgba(255,196,110,.8)';
        for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 2; wx++)
          if (U.h1(i * 17 + wy * 3 + wx, 55) < 0.3) g.fillRect(x + 3 + wx * (w / 2 - 1), LH * 0.84 - h + 3 + wy * h / 4.5, 2, 2);
        x += w + 2 + U.h1(i, 44) * 7; i++;
      }
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
    // cover zoom computed exactly: the scaled image always still covers the frame (never exposes an edge)
    const zoom = 1 + (bg.zoom || 0) * (total > 0 ? U.clamp(t / total) : 0);
    const k = (cover ? Math.max(W / ew, H / eh) : Math.min(W / ew, H / eh)) * zoom;
    const dw = ew * k, dh = eh * k;
    const fx = bg.fx == null ? 0.5 : U.clamp(bg.fx, 0, 1), fy = bg.fy == null ? 0.5 : U.clamp(bg.fy, 0, 1);
    g.drawImage(el, (W - dw) * fx, (H - dh) * fy, dw, dh);
  }

  // ---------------- scratch canvases ----------------
  const tmps = {};
  function tmp(key, W, H) {
    let c = tmps[key];
    if (!c || c.width !== W || c.height !== H) c = tmps[key] = U.canvas(W, H);
    return c;
  }

  // ---------------- background canvas (bd) for effects that sample the footage ----------------
  const bdCache = new Map();
  function bgCanvas(shot, W, H, mode, t, total) {
    if (mode === 'green' || mode === 'blue') {
      const k2 = mode + W + 'x' + H;
      if (bdCache.has(k2)) return bdCache.get(k2);
      const c = U.canvas(W, H), g = c.getContext('2d');
      g.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff';
      g.fillRect(0, 0, W, H);
      bdCache.set(k2, c);
      return c;
    }
    if (mode === 'alpha' || mode === 'matte') return null;
    const bg = shot.bg || {};
    if (bg.type === 'media') {
      const m = VFX.media[bg.media];
      const c = tmp('bd', W, H), g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      if (m && m.el && !m.missing) {
        drawMedia(g, m, W, H, bg, t, total);
        return c;
      }
      g.fillStyle = '#101216'; g.fillRect(0, 0, W, H);
      return c;
    }
    if (bg.type === 'color') {
      const k2 = 'c' + (bg.color || '') + W + 'x' + H;
      if (bdCache.has(k2)) return bdCache.get(k2);
      const c = U.canvas(W, H), g = c.getContext('2d');
      g.fillStyle = bg.color || '#101014'; g.fillRect(0, 0, W, H);
      bdCache.set(k2, c);
      return c;
    }
    if (bg.type === 'none') return null;
    // demo scene (cached: static)
    const kind = bg.backdrop || 'city';
    const k2 = 'd' + kind + W + 'x' + H;
    if (bdCache.has(k2)) return bdCache.get(k2);
    const c = backdrop(kind, W, H);
    bdCache.set(k2, c);
    return c;
  }

  // ---------------- layer draw ----------------
  function drawLayer(g, layer, lt, W, H, mode, bd) {
    const fx = VFX.fx.byId[layer.fx];
    if (!fx || layer.on === false) return;
    const llt = U.clamp(lt - (+layer.start || 0), 0, +layer.dur || 1);
    if (lt < (+layer.start || 0) || lt > (+layer.start || 0) + (+layer.dur || 1)) return;
    const k = Math.min(W, H) / 1080, fw = W / k, fh = H / k;
    const P = paramsOf(layer);
    P.headline = P.headline; // (fields merged below)
    const Fv = fieldsOf(layer);
    Object.assign(P, Fv);                                                    // fields also arrive as params for draw()
    const E = { t: llt, dur: +layer.dur || 1, seed: layer.seed || 7, fw, fh, W, H, k, bd, mode };
    g.save();
    g.setTransform(k, 0, 0, k, 0, 0);
    g.globalAlpha = U.clamp(layer.opacity == null ? 1 : layer.opacity);
    try { fx.draw(g, P, E); }
    catch (e) { if (window.__HEADLESS || !window.console) throw e; console.error('draw ' + layer.fx, e); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // draw one shot (bg + layers) at local time lt into a W×H context
  function renderShot(g, shot, lt, W, H, mode) {
    const bd = bgCanvas(shot, W, H, mode, lt, shot.dur);
    if (mode === 'green' || mode === 'blue') {
      g.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff';
      g.fillRect(0, 0, W, H);
    } else if (mode === 'composite') {
      if (bd) g.drawImage(bd, 0, 0);
      else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    } // alpha / matte: leave transparent
    for (const layer of shot.layers || []) drawLayer(g, layer, lt, W, H, mode, bd);
  }

  // ---------------- full frame ----------------
  // opts: { mode: composite|green|blue|alpha|matte, W, H, tl }
  function render(ctx, proj, t, opts = {}) {
    const W = opts.W || proj.width, H = opts.H || proj.height;
    const tl = opts.tl || timeline(proj);
    const mode = opts.mode || 'composite';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (!tl.segs.length) { ctx.fillStyle = '#101216'; ctx.fillRect(0, 0, W, H); return; }
    const acts = activeAt(tl, Math.max(0, Math.min(t, tl.total - 1e-6)));
    if (!acts.length) return;
    if (mode === 'matte') {
      const tc = tmp('matte', W, H), tg = tc.getContext('2d');
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.clearRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      for (const a of acts) for (const layer of a.seg.shot.layers || []) {
        const fx = VFX.fx.byId[layer.fx];
        if (!fx) continue;
        drawLayer(tg, layer, a.local, W, H, 'matte', null);
      }
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = '#fff'; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(tc, 0, 0);
      return;
    }
    for (const a of acts) {
      if (a.alpha >= 0.999) {
        renderShot(ctx, a.seg.shot, a.local, W, H, mode);
      } else {
        const tc = tmp('blend', W, H), tg = tc.getContext('2d');
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, W, H);
        renderShot(tg, a.seg.shot, a.local, W, H, mode);
        ctx.globalAlpha = a.alpha;
        ctx.drawImage(tc, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    // dip-to-black veil
    const dip = acts.find(a => a.dip != null && a.dip > 0.001);
    if (dip) { ctx.fillStyle = `rgba(0,0,0,${U.clamp(dip.dip)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------- background video sync ----------------
  function shotVideos(proj) {
    const out = [];
    for (const s of proj.shots || []) {
      const bg = s.bg || {};
      if (bg.type === 'media' && bg.media && VFX.media[bg.media] && VFX.media[bg.media].kind === 'video') out.push([VFX.media[bg.media], bg, s]);
    }
    return out;
  }
  function videoTime(bg, s, t, tl) {
    const el = VFX.media[bg.media].el;
    const d = (el && el.duration) || 1;
    // shot-local time mapped into the video, honouring shot start offset within the project
    const seg = tl.segs.find(x => x.shot === s);
    const local = (bg.start || 0) + Math.max(0, t - (seg ? seg.t0 : 0));
    return bg.loop === false ? Math.min(local, d - 0.04) : local % d;
  }
  async function prepare(proj, t) {
    const tl = timeline(proj);
    for (const [m, bg, s] of shotVideos(proj)) {
      const el = m.el;
      if (!el) continue;
      const want = videoTime(bg, s, t, tl);
      if (Math.abs(el.currentTime - want) < 0.001 && el.readyState >= 2) continue;
      await new Promise(res => {
        const done = () => { el.removeEventListener('seeked', done); res(); };
        el.addEventListener('seeked', done);
        el.currentTime = want;
        setTimeout(done, 3000);
      });
    }
  }
  function syncVideos(proj, t, playing) {
    const tl = timeline(proj);
    for (const [m, bg, s] of shotVideos(proj)) {
      const el = m.el;
      if (!el) continue;
      const want = videoTime(bg, s, t, tl);
      if (Math.abs(el.currentTime - want) > 0.3) { try { el.currentTime = want; } catch (e) {} }
      if (playing && el.paused) el.play().catch(() => {});
      if (!playing && !el.paused) el.pause();
    }
  }

  return { SIZES, paramsOf, fieldsOf, newLayer, applyPreset, newShot, normLayer, normShot, normProject, defaultProject, timeline, segAt, activeAt, backdrop, drawMedia, drawLayer, renderShot, render, prepare, syncVideos, tmp };
})();
