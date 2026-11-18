// Studio UI: look library with live thumbnails, preview stage + transport, layer timeline,
// auto-built inspector, templates, Save/Open + autosave, drag-drop media, export.
// Deterministic everywhere: the preview and every export render the same frame at the same t.
(() => {
  const U = FL.util, ENG = FL.engine, SRC = FL.sources, FX = FL.fx, $ = id => document.getElementById(id);
  const STORE = 'film-look-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'project' }, t = 0, playing = false, last = 0, dirty = true;
  let range = null;   // [a, b] preview window while auditioning one look
  let solo = null;    // layer index being auditioned alone
  let family = 'All', query = '';
  const stage = $('stage'), sctx = stage.getContext('2d');

  // ---------------- media ----------------
  let mediaSeq = 1;
  function addMedia(file) {
    const kind = file.type.startsWith('video') ? 'video' : 'image';
    const id = 'm' + Date.now().toString(36) + (mediaSeq++);
    const url = URL.createObjectURL(file);
    const m = { kind, name: file.name, url };
    if (kind === 'image') {
      m.el = new Image(); m.el.onload = () => { dirty = true; }; m.el.src = url;
      if (file.size < 12e6) { const r = new FileReader(); r.onload = () => { m.dataUrl = r.result; queueSave(); }; r.readAsDataURL(file); }
    } else {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
      v.addEventListener('loadeddata', () => { dirty = true; });
      v.addEventListener('seeked', () => { dirty = true; });
      m.el = v;
    }
    FL.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (FL.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; }; el.src = m.dataUrl || m.url;
        FL.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        // pipeline renders pass clips as file URLs (render.mjs: media.<id>.path)
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; });
        v.addEventListener('seeked', () => { dirty = true; });
        FL.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else FL.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 3.5e6;
    const sid = proj.source && proj.source.media, sm = sid && FL.media[sid];
    if (sm) {
      media[sid] = { kind: sm.kind, name: sm.name };
      if (withMedia && sm.dataUrl && (withMedia === 'all' || sm.dataUrl.length < budget)) { media[sid].dataUrl = sm.dataUrl; budget -= sm.dataUrl.length; }
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.layers)) throw new Error('Not a Film Look Studio project');
    restoreMedia(p.media); delete p.media;
    // pipeline shorthand: { fx: 'preset-id' } -> the preset's effect, settings and length
    for (const L of p.layers) {
      if (L && !FX.byId[L.fx] && FX.presetById[L.fx]) {
        const pr = FX.presetById[L.fx];
        L.fx = pr.fx;
        L.params = Object.assign({}, pr.params, L.params || {});
        if (L.dur == null && (pr.dur || FX.byId[pr.fx].dur)) L.dur = pr.dur || FX.byId[pr.fx].dur;
        if (L.name == null) L.name = pr.name;
        if (L.opacity == null && pr.opacity != null) L.opacity = pr.opacity;
      }
      // hand-written pipeline projects (render.mjs / filmlook_fx.py) may omit fields the
      // engine needs present: a layer without on:true is skipped entirely
      if (L) {
        if (L.on == null) L.on = true;
        if (L.seed == null) L.seed = 1;
        if (L.start == null) L.start = 0;
        if (L.opacity == null) L.opacity = 1;
        if (L.params == null) L.params = {};
        if (L.blend == null) L.blend = null;
      }
    }
    proj = Object.assign(ENG.defaultProject(), p);
    proj.source = Object.assign(ENG.defaultProject().source, p.source || {});
    sel = proj.layers.length ? { kind: 'layer', i: 0 } : { kind: 'project' };
    t = 0; range = null; solo = null; pause();
    applySize(); refreshAll();
  }
  function changed(structure = false) { dirty = true; queueSave(); if (structure) renderTimeline(); else updateTimelineLabels(); }

  // ---------------- stage ----------------
  let q = mobile() ? 0.5 : 1;
  function applySize() {
    stage.width = Math.max(2, Math.round(proj.width * q)); stage.height = Math.max(2, Math.round(proj.height * q));
    stage.style.aspectRatio = `${proj.width} / ${proj.height}`;
    $('projName').value = proj.name || '';
    dirty = true;
  }
  function play(from) {
    if (from != null) t = from;
    if (t >= (range ? range[1] : proj.duration) - 0.01) t = range ? range[0] : 0;
    playing = true; last = performance.now(); $('btnPlay').textContent = '❚❚';
  }
  function pause() { playing = false; $('btnPlay').textContent = '▶'; ENG.syncVideo(proj, t, false); dirty = true; }
  function loop(now) {
    if (playing) {
      t += Math.min(0.1, Math.max(0, (now - last) / 1000));   // never step backwards, never more than 0.1 s
      const end = range ? range[1] : proj.duration;
      if (t >= end) {
        if ($('chkLoop').checked) { t = range ? range[0] : 0; }
        else { t = end - 1e-3; pause(); }
      }
    }
    last = now;
    if (playing || dirty) {
      ENG.syncVideo(proj, t, playing);
      try {
        const layers = solo != null && proj.layers[solo] ? [proj.layers[solo]] : undefined;
        ENG.render(sctx, proj, t, { W: stage.width, H: stage.height, layers });
      } catch (e) { console.error(e); }
      $('timeLabel').textContent = `${U.fmt(t)} / ${U.fmt(proj.duration)}`;
      $('scrub').value = proj.duration ? Math.round(t / proj.duration * 1000) : 0;
      updateTLPh(); markLive();
      dirty = false;
    }
    requestAnimationFrame(loop);
  }
  function markLive() {
    document.querySelectorAll('.tlrow.live').forEach(e => e.classList.remove('live'));
    for (let i = 0; i < proj.layers.length; i++) {
      if (!ENG.active(proj.layers[i], proj, t)) continue;
      const el = document.querySelector(`.tlrow[data-i="${i}"]`);
      if (el) el.classList.add('live');
    }
  }
  function audition(i) {
    const L = proj.layers[i];
    if (!L) return;
    const [s, e] = ENG.span(L, proj);
    range = [Math.max(0, s - 0.35), Math.min(proj.duration, e + 0.45)];
    solo = i;
    play(range[0]);
  }

  // ---------------- look library ----------------
  const famRank = f => { const i = FX.FAMILIES.findIndex(x => x[0] === f); return i < 0 ? 99 : i; };
  const presets = () => FX.presets.filter(p => FX.byId[p.fx]).map((p, i) => [p, i])
    .sort((a, b) => famRank(FX.byId[a[0].fx].family) - famRank(FX.byId[b[0].fx].family) || a[1] - b[1]).map(x => x[0]);
  // thumbnails render big and downscale, so pixel-unit looks (grain, halftone, scanlines) stay honest
  const TW = 960, TH = 540;
  function renderLook(pr, p, tOverride) {
    try {
      const fx = FX.byId[pr.fx];
      const fam = fx.family;
      const tp = { app: 'film-look-studio', version: 1, name: 'thumb', width: TW, height: TH, fps: 24,
        duration: pr.dur || 6, source: { media: null, demo: (fam === 'light' || fam === 'docs') ? 'fort' : 'chart', fit: 'cover', start: 0, speed: 1, loop: true, bg: '#000000' }, layers: [] };
      const L = ENG.layerFromPreset(pr.id, 0, 7);
      if (!L) return null;
      tp.layers = [L];
      // sample t inside the layer's REAL span (event presets may get a different length from the
      // effect than from the preset — sampling past it would switch the layer off mid-preview)
      const [s0, e0] = ENG.span(L, tp);
      const t = tOverride != null ? tOverride : s0 + p * (e0 - s0);
      const c = U.tmp('lookthumb', TW, TH), g = U.ctx2(c);
      ENG.render(g, tp, Math.max(s0, Math.min(t, e0 - 1e-4)), { W: TW, H: TH, layers: [L] });
      return c;
    } catch (e) { console.warn('thumb failed', pr.id, e); return null; }
  }
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const big = renderLook(pr, p);
    if (big) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, W, H); }
  }
  function renderLibrary() {
    const fams = ['All'].concat(FX.FAMILIES.map(x => x[1]));
    $('libChips').innerHTML = '';
    for (const fl of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (fl === family ? ' on' : ''); b.textContent = fl;
      b.onclick = () => { family = fl; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const famId = FX.FAMILIES.find(x => x[1] === family);
    const list = presets().filter(p => (family === 'All' || (famId && FX.byId[p.fx].family === famId[0])) &&
      (!ql || (p.name + ' ' + p.fx + ' ' + (FX.byId[p.fx].desc || '') + ' ' + (FX.byId[p.fx].family || '')).toLowerCase().includes(ql)));
    const cur = currentLayer();
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard' + (cur && cur.preset === pr.id ? ' cur' : ''); card.dataset.preset = pr.id; card.tabIndex = 0;
      card.title = FX.byId[pr.fx].desc || '';
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add as a new layer on top';
      card.append(cv, nm, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.5));
      let raf = 0, t0 = 0;
      const anim = now => {
        const cycle = pr.dur ? pr.dur + 0.45 : 5;
        const x = ((now - t0) / 1000) % cycle;
        drawPresetThumb(cv, pr, pr.dur ? U.clamp(x / pr.dur) : x / tpDur(pr));
        raf = requestAnimationFrame(anim);
      };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.5); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addLook(pr); };
    }
    // draw the thumbnails a slice at a time so the page never freezes
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  const tpDur = pr => pr.dur || 6;
  function markCurrentPreset() {
    const cur = currentLayer();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentLayer() { return sel.kind === 'layer' && proj.layers[sel.i] ? proj.layers[sel.i] : null; }
  function applyPreset(pr) {
    let i = sel.kind === 'layer' ? sel.i : -1;
    if (!(i >= 0 && proj.layers[i])) i = -1;
    if (i < 0) return addLook(pr);
    const L = proj.layers[i], old = { seed: L.seed, start: L.start, dur: L.dur, opacity: L.opacity, blend: L.blend, fadeIn: L.fadeIn, fadeOut: L.fadeOut };
    const nl = ENG.layerFromPreset(pr.id, 0);
    Object.assign(L, {
      fx: nl.fx, name: nl.name, params: nl.params, preset: pr.id,
      dur: pr.dur || (FX.byId[pr.fx].event ? FX.byId[pr.fx].dur : old.dur),
    });
    L.seed = old.seed; L.start = old.start; L.opacity = old.opacity; L.blend = old.blend; L.fadeIn = old.fadeIn; L.fadeOut = old.fadeOut;
    changed(true); renderInspector(); markCurrentPreset();
    audition(i);
    toast(`${pr.name} → layer ${i + 1}`);
  }
  function addLook(pr, at) {
    const L = ENG.layerFromPreset(pr.id, at == null ? t : at, 1 + Math.floor(U.h1(Math.floor(t * 1000) % 99999, 13) * 9998));
    if (!L) return;
    if (!pr.dur && !(FX.byId[pr.fx] && FX.byId[pr.fx].event)) L.dur = null; // continuous look: to the end
    proj.layers.push(L);
    sel = { kind: 'layer', i: proj.layers.length - 1 };
    changed(true); renderInspector(); markCurrentPreset();
    audition(sel.i);
  }

  // ---------------- timeline ----------------
  function updateTLPh() {
    const ph = $('tlPh');
    if (!ph) return;
    ph.style.left = (proj.duration ? U.clamp(t / proj.duration) * 100 : 0) + '%';
  }
  function renderTimeline() {
    const body = $('tlBody'); body.innerHTML = '';
    if (!proj.layers.length) {
      const e = document.createElement('p'); e.className = 'tl-empty';
      e.textContent = 'No looks yet. Click a look in the library, or press “+ Look”.';
      body.appendChild(e);
      updateTLPh();
      return;
    }
    // top of the stack draws last (in front), so display rows bottom-of-stack first
    for (let k = proj.layers.length - 1; k >= 0; k--) {
      const i = k, L = proj.layers[i];
      const fx = FX.byId[L.fx];
      const row = document.createElement('div'); row.className = 'tlrow' + (sel.kind === 'layer' && sel.i === i ? ' sel' : ''); row.dataset.i = i;
      const eye = document.createElement('button'); eye.className = 'eye' + (L.on ? '' : ' off');
      eye.title = L.on ? 'Hide this look' : 'Show this look';
      eye.textContent = L.on ? '◉' : '○';
      eye.onclick = e => { e.stopPropagation(); L.on = !L.on; changed(); renderTimeline(); };
      const nm = document.createElement('div'); nm.className = 'lname';
      const b = document.createElement('b'); b.textContent = L.name || (fx && fx.name) || L.fx;
      const sp = document.createElement('span'); sp.textContent = fx ? `${fx.name} · seed ${L.seed}` : L.fx;
      nm.append(b, sp);
      const zone = document.createElement('div'); zone.className = 'lzone';
      const bar = document.createElement('div'); bar.className = 'tlbar' + (sel.kind === 'layer' && sel.i === i ? ' sel' : '');
      const [s0, e0] = ENG.span(L, proj);
      bar.style.left = (s0 / proj.duration * 100) + '%';
      bar.style.width = (Math.max(0.4, (e0 - s0) / proj.duration * 100)) + '%';
      const grip = document.createElement('div'); grip.className = 'grip';
      bar.appendChild(grip); zone.appendChild(bar);
      row.append(eye, nm, zone);
      row.onclick = () => { if (sel.kind === 'layer' && sel.i === i) return; selectLayer(i); };
      bar.onclick = e => { e.stopPropagation(); selectLayer(i); };
      bar.ondblclick = e => { e.stopPropagation(); selectLayer(i); audition(i); };
      wireBarDrag(row, bar, grip, zone, i);
      body.appendChild(row);
    }
    updateTimelineLabels();
  }
  function selectLayer(i) {
    sel = { kind: 'layer', i };
    range = null; solo = null;
    const [s] = ENG.span(proj.layers[i], proj);
    t = s + 0.05; if (playing) pause();
    afterSelect();
  }
  function wireBarDrag(row, bar, grip, zone, i) {
    let drag = null;
    const zoneTime = px => {
      const r = zone.getBoundingClientRect();
      return U.clamp((px - r.left) / Math.max(1, r.width), 0, 1) * proj.duration;
    };
    void zoneTime;
    bar.addEventListener('pointerdown', e => {
      if (e.target === grip) return;
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      const L = proj.layers[i];
      const [s0, e0] = ENG.span(L, proj);
      drag = { kind: 'move', x: e.clientX, start: +L.start || 0, len: e0 - s0, id: e.pointerId };
      bar.classList.add('dragging');
    });
    grip.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      grip.setPointerCapture ? grip.setPointerCapture(e.pointerId) : bar.setPointerCapture(e.pointerId);
      const L = proj.layers[i];
      const [s0, e0] = ENG.span(L, proj);
      drag = { kind: 'size', x: e.clientX, start: +L.start || 0, len: e0 - s0, id: e.pointerId };
      bar.classList.add('dragging');
    });
    const move = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const L = proj.layers[i];
      if (drag.kind === 'move') {
        const dx = (e.clientX - drag.x);
        const r = zone.getBoundingClientRect();
        const dt = dx / Math.max(1, r.width) * proj.duration;
        const maxStart = Math.max(0, proj.duration - drag.len - 0.05);
        L.start = Math.round(U.clamp(drag.start + dt, 0, maxStart) * 20) / 20;
      } else {
        const r = zone.getBoundingClientRect();
        const dt = (e.clientX - drag.x) / Math.max(1, r.width) * proj.duration;
        const maxDur = Math.max(0.2, proj.duration - (drag.start) - 0.05);
        L.dur = Math.round(U.clamp(drag.len + dt, 0.2, maxDur) * 20) / 20;
      }
      dirty = true; updateTimelineLabels(); updateBarGeometry();
    };
    const up = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; bar.classList.remove('dragging');
      changed(true); renderInspector();
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
    function updateBarGeometry() {
      const L = proj.layers[i];
      const [s0, e0] = ENG.span(L, proj);
      bar.style.left = (s0 / proj.duration * 100) + '%';
      bar.style.width = (Math.max(0.4, (e0 - s0) / proj.duration * 100)) + '%';
    }
  }
  function updateTimelineLabels() {
    for (let i = 0; i < proj.layers.length; i++) {
      const L = proj.layers[i];
      const row = document.querySelector(`.tlrow[data-i="${i}"]`);
      if (!row) continue;
      row.classList.toggle('sel', sel.kind === 'layer' && sel.i === i);
      const bar = row.querySelector('.tlbar');
      if (bar) {
        bar.classList.toggle('sel', sel.kind === 'layer' && sel.i === i);
        const [s0, e0] = ENG.span(L, proj);
        bar.style.left = (s0 / proj.duration * 100) + '%';
        bar.style.width = (Math.max(0.4, (e0 - s0) / proj.duration * 100)) + '%';
      }
    }
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile() && sel.kind !== 'project') showTab('insp'); }

  // ---------------- inspector ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function section(title, right) { const s = h('div', 'sec'), t3 = h('h3'); t3.append(title); if (right) t3.append(right); s.append(t3); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const dec = step < 1 ? (step < 0.1 ? (step < 0.01 ? 3 : 2) : 1) : 0;
    const val = h('i', null, (+v).toFixed(dec) + unit);
    i.oninput = () => { val.textContent = (+i.value).toFixed(dec) + unit; on(+i.value); };
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) { const s = h('select'); for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); } s.value = v; s.onchange = () => on(s.value); return field(label, s); }
  function fText(label, v, on, area) { const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; i.value = v || ''; i.oninput = () => on(i.value); return field(label, i); }
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.layers[sel.i]) return projectInspector(box);
    layerInspector(box, proj.layers[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    sec.append(fRange('Length (s)', proj.duration, 1, 60, 0.5, v => { proj.duration = v; changed(true); }, 's'));
    box.append(sec);

    const src = section('Picture under the look');
    const s = proj.source;
    const up = (k, v, structure) => { s[k] = v; changed(structure); };
    const mediaOpts = [['', '— choose a file —']].concat(Object.entries(FL.media).map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + (m.name || id)]));
    src.append(fSelect('Shows', [['fort', 'Demo: sunset fort'], ['valley', 'Demo: river valley'], ['street', 'Demo: old street'], ['chart', 'Demo: colour chart']].concat(Object.entries(FL.media).length ? [['media', 'My photo / video']] : []), s.media ? 'media' : (s.demo || 'fort'), v => {
      if (v === 'media') { s.media = Object.keys(FL.media)[0] || null; } else { s.media = null; s.demo = v; }
      changed(true); renderInspector();
    }));
    if (s.media && !FL.media[s.media]) { s.media = null; }
    src.append(fSelect('File', mediaOpts, s.media || '', v => { up('media', v || null, true); if (v) { if (FL.media[v].kind === 'video' && s.start == null) s.start = 0; } renderInspector(); }));
    src.append(btn('＋ Add photo or video…', async () => {
      const fs = await pickFiles();
      if (!fs.length) return;
      const id = addMedia(fs[0]);
      proj.source.media = id;
      if (fs[0].type.startsWith('video')) { proj.source.start = proj.source.start || 0; }
      changed(true); renderInspector(); toast(`Added ${fs[0].name}`);
    }));
    if (s.media && FL.media[s.media] && FL.media[s.media].missing) src.append(h('p', 'desc', 'This file is not stored in project files. Add it again to re-link it.'));
    src.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture'], ['stretch', 'Stretch']], s.fit || 'cover', v => up('fit', v, true)));
    const isVid = !!(s.media && FL.media[s.media] && FL.media[s.media].kind === 'video');
    if (isVid) {
      src.append(fRange('Clip starts at (s)', +s.start || 0, 0, 300, 0.1, v => up('start', v)));
      src.append(fRange('Speed', +s.speed || 1, 0.25, 4, 0.05, v => up('speed', v)));
      src.append(fCheck('Loop the clip', s.loop !== false, v => up('loop', v)));
    }
    src.append(fColor('Letterbox colour (behind a contained picture)', s.bg || '#000000', v => up('bg', v, true)));
    box.append(src);

    const help = section('How it works');
    help.append(h('p', 'desc', 'Drop a photo or video on the stage (or set it here), then stack looks from the library. Each layer is a look with its own time span, fades, blend and seed — the stack draws bottom to top. Export the full picture, or just the light elements as an overlay (screen-blend on black, transparent WebM, green screen). Colour grades can go out as a .cube LUT for CapCut / Premiere / Resolve.'));
    box.append(help);
  }

  function layerInspector(box, L, i) {
    const fx = FX.byId[L.fx];
    if (!fx) { box.append(h('p', 'desc', `Look "${L.fx}" is not available in this build.`)); return; }
    const P = ENG.params(L);

    const sec = section(`Layer ${i + 1} — ${fx.name}`, btn('✕', () => { proj.layers.splice(i, 1); sel = { kind: 'project' }; changed(true); renderInspector(); }, 'btn sm danger'));
    sec.append(fText('Name', L.name, v => { L.name = v; changed(); }));
    sec.append(fCheck('On', L.on, v => { L.on = v; changed(); renderTimeline(); }));
    const two = h('div', 'two');
    two.append(fRange('Starts at (s)', +L.start || 0, 0, Math.max(1, proj.duration), 0.05, v => { L.start = v; changed(); }, 's'),
      fRange('Lasts (0 = to end)', L.dur == null ? 0 : L.dur, 0, Math.max(1, proj.duration), 0.05, v => { L.dur = v > 0.01 ? v : null; changed(); }, 's'));
    sec.append(two);
    const fades = h('div', 'two');
    fades.append(fRange('Fade in', +L.fadeIn || 0, 0, 5, 0.05, v => { L.fadeIn = v; changed(); }, 's'),
      fRange('Fade out', +L.fadeOut || 0, 0, 5, 0.05, v => { L.fadeOut = v; changed(); }, 's'));
    sec.append(fades);
    const op = h('div', 'two');
    op.append(fRange('Opacity', L.opacity == null ? 1 : +L.opacity, 0, 1, 0.01, v => { L.opacity = v; changed(); }),
      fSelect('Blend', [['', 'Effect default']].concat(FX.BLENDS), L.blend || '', v => { L.blend = v || null; changed(); }));
    sec.append(op);
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = L.seed; seedIn.style.width = '90px'; seedIn.oninput = () => { L.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Seed'), seedIn, btn('🎲 New variant', () => { L.seed = 1 + Math.floor(U.h1(Date.now() % 99999, 5) * 9998); seedIn.value = L.seed; changed(); audition(i); }));
    sec.append(seedRow);
    box.append(sec);

    const look = section('Settings', btn('▶ Play', () => audition(i)));
    const groups = {};
    for (const f of FX.list) (groups[f.family] = groups[f.family] || []).push(f);
    const famName = id => (FX.FAMILIES.find(x => x[0] === id) || [0, id])[1];
    const pick = h('select');
    for (const [g, ds] of Object.entries(groups)) { const og = h('optgroup'); og.label = famName(g); for (const d of ds) { const o = h('option', null, d.name); o.value = d.id; og.append(o); } pick.append(og); }
    pick.value = L.fx;
    pick.onchange = () => { L.fx = pick.value; L.params = {}; L.preset = null; L.name = FX.byId[pick.value].name; if (FX.byId[pick.value].event) L.dur = FX.byId[pick.value].dur || L.dur; changed(true); renderInspector(); markCurrentPreset(); audition(i); };
    const f = h('label', 'fld');
    const sp = h('span', null, 'Look (any family)'); sp.style.color = 'var(--muted)'; sp.style.fontSize = '11.5px';
    f.append(sp, pick);
    look.append(f);
    look.append(h('p', 'desc', fx.desc || ''));
    for (const pdef of fx.params) {
      const v = P[pdef.key], set = val => { L.params[pdef.key] = val; L.preset = null; changed(); };
      if (pdef.type === 'range') look.append(fRange(pdef.label, v, pdef.min, pdef.max, pdef.step, set));
      else if (pdef.type === 'select') look.append(fSelect(pdef.label, pdef.options, String(v), set));
      else if (pdef.type === 'bool') look.append(fCheck(pdef.label, v, set));
      else if (pdef.type === 'color') look.append(fColor(pdef.label, v, set));
      else if (pdef.type === 'text') look.append(fText(pdef.label, v, set));
    }
    box.append(look);

    const act = section('Use it');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { const c = JSON.parse(JSON.stringify(L)); c.id = U.uid(); c.seed = 1 + Math.floor(U.h1(Date.now() % 99999, 3) * 9998); proj.layers.splice(i + 1, 0, c); sel = { kind: 'layer', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Earlier (under)', () => { if (i > 0) { [proj.layers[i - 1], proj.layers[i]] = [proj.layers[i], proj.layers[i - 1]]; sel.i = i - 1; changed(true); renderInspector(); } }),
      btn('Later (in front) ▶', () => { if (i < proj.layers.length - 1) { [proj.layers[i + 1], proj.layers[i]] = [proj.layers[i], proj.layers[i + 1]]; sel.i = i + 1; changed(true); renderInspector(); } }),
      btn('Export this look', () => openExport({ layer: i }), 'btn sm'),
    );
    act.append(row); box.append(act);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of FL.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${(+proj.duration).toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    proj.layers.forEach((L, i) => { const [s, e] = ENG.span(L, proj); const o = h('option', null, `Only ${L.name || L.fx}: ${s.toFixed(1)}–${e.toFixed(1)} s`); o.value = String(i); rg.append(o); });
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.layer != null ? String(pre.layer) : 'all';
    const hint = () => {
      $('exHint').textContent = {
        composite: 'Your picture with every look on top, as one MP4 (H.264). Silent.',
        screen: 'Just the light elements (leaks, burns, scratches…) on black. Put it above your clip and blend Screen or Add.',
        alpha: 'The overlay with real transparency (WebM VP9 with alpha). Works in Premiere, DaVinci and browsers; in CapCut prefer the green screen.',
        green: 'The overlay on pure #00FF00 — chroma-key it in CapCut.',
        blue: 'The overlay on pure #0000FF, for scenes that contain green.',
        matte: 'White = look, black = empty. Use as a track matte / luma mask.',
        source: 'The picture with no look at all (before/after split, or grading elsewhere).',
      }[mode.value] || '';
    };
    mode.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') {
      const L = proj.layers[+r];
      if (L) { const [s, e] = ENG.span(L, proj); o.from = Math.max(0, s - 0.2); o.to = Math.min(proj.duration, e + 0.6); }
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await FL.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        FL.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB · silent`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }
  function saveStill() {
    stage.toBlob(b => {
      if (!b) return;
      FL.exporter.download(b, `${(proj.name || 'film-look').replace(/[\\/:*?"<>|]+/g, '')}_${t.toFixed(2)}s.png`);
      toast('Frame saved as PNG');
    }, 'image/png');
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of FL.templates.LIST) {
      const b = h('button', 'tpl'); b.type = 'button';
      b.append(h('b', null, tp.name), h('span', null, tp.note));
      b.onclick = () => { load(tp.make()); $('dlgTemplates').close(); toast(`Started: ${tp.name}`); };
      g.append(b);
    }
    $('dlgTemplates').showModal();
  }
  function showTab(tab) {
    if (tab === 'export') return openExport();
    document.querySelectorAll('.mtabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.panel[data-panel]').forEach(p => p.classList.toggle('show', p.dataset.panel === tab));
  }
  let toastT = 0;
  function toast(msg) { const e = $('toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2200); }

  function refreshAll() { renderLibrary(); renderTimeline(); renderInspector(); dirty = true; }

  // ---------------- wiring ----------------
  function wire() {
    $('btnPlay').onclick = () => { range = null; solo = null; (playing ? pause() : play()); };
    stage.onclick = () => { if (playing) pause(); else play(); };
    $('scrub').oninput = () => { range = null; solo = null; t = $('scrub').value / 1000 * proj.duration; dirty = true; };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('exCube').onclick = () => {
      const txt = FL.exporter.cube(proj);
      if (!txt) return toast('No colour-grade layers to export — add one from Frame & grade or Archival');
      FL.exporter.download(new Blob([txt], { type: 'text/plain' }), `${(proj.name || 'film-look').replace(/[\\/:*?"<>|]+/g, '')}.cube`);
      toast('.cube LUT downloaded');
    };
    $('btnStill').onclick = saveStill;
    $('btnSave').onclick = () => { FL.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'film-look-project').replace(/[\\/:*?"<>|]+/g, '') + '.look.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddLook').onclick = () => {
      const pr = FX.presets.find(p => p.id === 'leak-warm') || FX.presets[0];
      if (pr) addLook(pr); else showTab('lib');
      if (mobile()) showTab('timeline');
    };
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        const id = addMedia(f);
        proj.source.media = id;
        changed(true); renderInspector();
        toast(`${f.name} → picture under the look`);
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { range = null; solo = null; t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  const alphaPost = (g, W, H, mode) => {
    if (mode === 'green' || mode === 'blue') {
      g.globalCompositeOperation = 'destination-over';
      g.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    } else if (mode === 'matte') {
      const m = U.tmp('flsMatte', W, H), mg = U.ctx2(m);
      mg.fillStyle = '#fff'; mg.fillRect(0, 0, W, H);
      mg.globalCompositeOperation = 'source-in'; mg.drawImage(g.canvas, 0, 0);
      mg.globalCompositeOperation = 'destination-over'; mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.drawImage(m, 0, 0);
    }
  };
  window.FLS = {
    async load(p) {
      load(p);
      const m = proj.source && proj.source.media && FL.media[proj.source.media];
      if (m && m.el) {
        if (m.kind === 'image') await (m.el.decode ? m.el.decode().catch(() => {}) : Promise.resolve());
        else await new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); });
      }
      await document.fonts.ready.catch(() => {});
      return { duration: proj.duration, w: proj.width, h: proj.height, fps: proj.fps };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => proj.duration,
    async frame(tReq, mode = 'composite', quality = 0.92, format) {
      const c = window.__flsCanvas || (window.__flsCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, tReq);
      const emode = FL.exporter.engineMode(mode);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, c.width, c.height);
      ENG.render(g, proj, tReq, { W: c.width, H: c.height, mode: emode });
      alphaPost(g, c.width, c.height, mode);
      if (emode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : (mode === 'alpha' ? 'image/png' : 'image/jpeg');
      return c.toDataURL(mime, quality);
    },
    cube() { return FL.exporter.cube(proj); },
    // contact sheet of presets at several progress points (QA): shows it full-screen, returns ms
    sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 640, H = 360, show = true) {
      const pres = (ids || FX.presets.map(p => p.id)).map(id => FX.presetById[id]).filter(p => p && FX.byId[p.fx]);
      const c = document.getElementById('flsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'flsSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d');
      const RW = 1280, RH = 720;   // render big, downscale into the sheet (honest pixel-unit looks)
      const t0 = performance.now();
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        const big = renderLook(pr, p);
        g.drawImage(big, k * W, r * H, W, H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, Math.min(W, 230), 18);
        g.fillStyle = '#fff'; g.font = '12px monospace';
        g.fillText(`${pr.id}  p=${p}`, k * W + 4, r * H + 13);
      }));
      return { ms: Math.round(performance.now() - t0), rows: pres.length };
    },
  };

  // ---------------- start ----------------
  function fresh() {
    const p = ENG.defaultProject();
    p.name = 'Untitled film look';
    const a = ENG.layerFromPreset('leak-warm', 0, 7);
    if (a) { a.start = 0.4; a.dur = 4; a.fadeIn = 0.4; a.fadeOut = 0.6; p.layers.push(a); }
    const b = ENG.layerFromPreset('grain-fine', 0, 11);
    if (b) p.layers.push(b);
    return p;
  }
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = fresh(); sel = { kind: 'layer', i: 0 }; applySize(); }
  wire(); refreshAll();
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; renderLibrary(); });

  window.__MAS_BRIDGE_STATE = {
    id: 'film-look-studio',
    engine: ENG,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { range = null; t = U.clamp(+v || 0, 0, proj.duration || 8); dirty = true; },
    isPlaying: () => playing,
    play: () => play(),
    pause: () => pause(),
    getDuration: () => +proj.duration || 8,
    selectLayer: idx => { if (proj.layers[idx]) selectLayer(idx); },
    addLayer: (id) => { const pr = FX.presetById[id] || FX.presets[0]; if (pr) { const L = ENG.layerFromPreset(pr.id, t); if (L) { proj.layers.push(L); selectLayer(proj.layers.length - 1); changed(true); } } },
    getAddableTypes: () => FX.presets.slice(0, 24).map(p => ({ id: p.id, name: p.name, desc: p.fx, group: p.family || 'Look', icon: 'FL' })),
    getMediaList: () => Object.entries(FL.media || {}).map(([id, m]) => ({ id, name: m.name || id, kind: m.kind || 'image', src: m.dataUrl || m.url || '' })),
    uploadMedia: async files => { for (const f of files) { const id = addMedia(f); proj.source.media = id; } changed(true); refreshAll(); },
    useMedia: (id) => { proj.source.media = id; changed(true); refreshAll(); },
    changed: (full) => { changed(Boolean(full)); if (full) refreshAll(); },
  };

})();
