// Studio UI: preset library, live preview, timeline (+ transitions + layer bars), inspector,
// save/open, undo/redo, export. Matches the house layout of the other studios exactly.
(() => {
  const U = BD.util, ENG = BD.engine, T = BD.text, $ = id => document.getElementById(id);
  const STORE = 'blueprint-diagram-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'shot', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null; // [a, b] preview window while auditioning one shot
  let family = 'All', query = '';
  const stage = $('stage'), sctx = stage.getContext('2d');
  const undoStack = [], redoStack = [];

  // ---------------- media ----------------
  let mediaSeq = 1;
  function addMedia(file) {
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const id = 'm' + Date.now().toString(36) + (mediaSeq++);
    const url = URL.createObjectURL(file);
    if (isSvg) {
      const m = { kind: 'svg', name: file.name, url, text: null };
      file.text().then(tx => { m.text = tx; dirty = true; renderLibrary(); drawTimelineThumbs(); }).catch(() => {});
      BD.media[id] = m;
      return id;
    }
    const kind = file.type.startsWith('video') ? 'video' : 'image';
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
    BD.media[id] = m;
    return id;
  }
  // register a media entry from a pipeline spec: {path} | {url} | {dataUrl} | {text} (+ name, kind)
  function resolveMediaSpec(spec) {
    if (spec == null) return '';
    if (typeof spec === 'string') spec = { url: spec };
    const id = 'm' + Date.now().toString(36) + (mediaSeq++);
    let kind = spec.kind;
    if (!kind) {
      if (spec.text || /\.svg$/i.test(spec.path || spec.url || '')) kind = 'svg';
      else if (/^data:image\//.test(spec.dataUrl || '') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(spec.path || spec.url || '')) kind = 'image';
      else if (spec.url && /\.(mp4|webm|mov|mkv)$/i.test(spec.url)) kind = 'video';
      else if (spec.dataUrl && /^data:video\//.test(spec.dataUrl)) kind = 'video';
      else kind = 'image';
    }
    const m = { kind, name: spec.name || spec.path || spec.url || 'media' };
    if (kind === 'svg') {
      m.text = spec.text != null ? spec.text : (spec.dataUrl ? decodeURIComponent(escape(atob(spec.dataUrl.split(',')[1] || ''))) : null);
      BD.media[id] = m;
      if (!m.text && spec.url) { fetch(spec.url).then(r => r.text()).then(tx => { m.text = tx; dirty = true; }).catch(() => {}); }
      return id;
    }
    const src = spec.dataUrl || spec.url;
    if (!src) { m.missing = true; BD.media[id] = m; return id; }
    m.url = src;
    if (kind === 'image') { m.el = new Image(); m.el.onload = () => { dirty = true; }; m.el.src = src; if (spec.dataUrl) m.dataUrl = spec.dataUrl; }
    else { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = src; v.addEventListener('loadeddata', () => { dirty = true; }); m.el = v; }
    BD.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (BD.media[id]) continue;
      if (m.kind === 'svg' && m.text != null) BD.media[id] = { kind: 'svg', name: m.name, text: m.text };
      else if (m.kind === 'svg' && m.url) { const e = { kind: 'svg', name: m.name, text: null, url: m.url }; fetch(m.url).then(r => r.text()).then(tx => { e.text = tx; dirty = true; }).catch(() => { e.missing = true; }); BD.media[id] = e; }
      else if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; }; el.src = m.dataUrl || m.url;
        BD.media[id] = { kind: 'image', name: m.name, url: m.url, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; });
        BD.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else BD.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence + undo ----------------
  function serialise(withMedia = true) {
    const media = {};
    for (const [id, m] of Object.entries(BD.media)) {
      const used = JSON.stringify(proj.shots).includes('"' + id + '"') || (proj.bg && proj.bg.media === id);
      if (!used) continue;
      media[id] = { kind: m.kind, name: m.name };
      if (m.kind === 'svg') { if (m.text && m.text.length < 2.5e6) media[id].text = m.text; if (m.url) media[id].url = m.url; }
      else if (withMedia === 'all' || (withMedia && m.dataUrl && m.dataUrl.length < 3.5e6)) media[id].dataUrl = m.dataUrl;
      else if (m.url && (m.url.startsWith('data:') || m.url.startsWith('blob:')) === false) media[id].url = m.url;
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }

  function load(data, opts = {}) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || (!Array.isArray(p.shots) && !Array.isArray(p.clips))) throw new Error('Not a Blueprint & Diagram Studio project');
    restoreMedia(p.media); delete p.media;
    // pipeline shorthand: {"shots":[{"preset":..., "media":{slot:spec}, "fields":{...}, "params":{...}}]}
    p.shots = (p.shots || p.clips || []).map(s => {
      if (s.preset && BD.presets.byId[s.preset]) {
        const over = { dur: s.dur, x: s.x, y: s.y, seed: s.seed, trans: s.trans, f: Object.assign({}, s.fields || {}, s.f || {}), p: Object.assign({}, s.params || {}, s.p || {}) };
        if (s.media) for (const [slot, spec] of Object.entries(s.media)) over.p[slot] = resolveMediaSpec(spec);
        return ENG.newShot(s.preset, over);
      }
      if (s.el && BD.fx.byId[s.el]) {
        const pr = BD.presets.list.find(x => x.el === s.el);
        const shot = ENG.newShot(pr ? pr.id : BD.presets.list[0].id, { dur: s.dur, x: s.x, y: s.y, seed: s.seed, trans: s.trans, f: s.f || {}, p: s.p || {} });
        shot.el = s.el; shot.preset = s.preset || null;
        if (s.media) for (const [slot, spec] of Object.entries(s.media)) shot.p[slot] = resolveMediaSpec(spec);
        return shot;
      }
      return ENG.newShot('bp-fort-blueprint');
    });
    proj = Object.assign(ENG.defaultProject(), p);
    if (!proj.bg) proj.bg = { type: 'none', color: '#0b0d11', media: null, fit: 'cover', zoom: 0, start: 0, loop: true };
    if (!opts.keepSel) { sel = proj.shots.length ? { kind: 'shot', i: 0 } : { kind: 'project' }; t = 0; range = null; pause(); }
    applySize(); refreshAll();
  }
  function pushUndo() {
    undoStack.push(JSON.stringify(proj));
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
  }
  function undo() {
    if (!undoStack.length) return toast('Nothing to undo');
    redoStack.push(JSON.stringify(proj));
    const snap = undoStack.pop();
    try { load(snap, { keepSel: true }); toast('Undo'); } catch (e) { console.error(e); }
  }
  function redo() {
    if (!redoStack.length) return toast('Nothing to redo');
    undoStack.push(JSON.stringify(proj));
    const snap = redoStack.pop();
    try { load(snap, { keepSel: true }); toast('Redo'); } catch (e) { console.error(e); }
  }
  function changed(structure = false) { dirty = true; queueSave(); if (structure) renderTimeline(); else updateTimelineLabels(); }

  // ---------------- stage ----------------
  let q = mobile() ? 0.5 : 1;
  function applySize() {
    stage.width = Math.round(proj.width * q); stage.height = Math.round(proj.height * q);
    stage.style.aspectRatio = `${proj.width} / ${proj.height}`;
    $('projName').value = proj.name || '';
    dirty = true;
  }
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  function play(from) {
    const tl = ENG.timeline(proj);
    if (from != null) t = from;
    if (t >= (range ? range[1] : tl.total) - 0.01) t = range ? range[0] : 0;
    playing = true; last = performance.now(); $('btnPlay').textContent = '❚❚';
  }
  function pause() { playing = false; $('btnPlay').textContent = '▶'; ENG.syncVideos(proj, t, false); dirty = true; }
  function loop(now) {
    const tl = ENG.timeline(proj), end = range ? range[1] : tl.total;
    if (playing) {
      t += Math.min(0.1, (now - last) / 1000); // never step backwards
      if (t >= end) {
        if ($('chkLoop').checked) t = range ? range[0] : 0;
        else { t = end - 1e-3; pause(); }
      }
    }
    last = now;
    if (playing || dirty) {
      ENG.syncVideos(proj, t, playing);
      try { ENG.render(sctx, proj, t, { W: stage.width, H: stage.height, tl }); } catch (e) { console.error(e); }
      $('timeLabel').textContent = `${fmt(t)} / ${fmt(tl.total)}`;
      $('scrub').value = tl.total ? Math.round(t / tl.total * 1000) : 0;
      markLive(tl);
      updateLayerPlayhead();
      dirty = false;
    }
    requestAnimationFrame(loop);
  }
  function markLive(tl) {
    const seg = ENG.segAt(tl, t);
    document.querySelectorAll('.timeline .live').forEach(e => e.classList.remove('live'));
    if (seg) { const el = document.querySelector(`.clip[data-i="${seg.i}"]`); if (el) el.classList.add('live'); }
  }
  function audition(i) {
    const tl = ENG.timeline(proj), seg = tl.segs[i];
    if (!seg) return;
    range = [seg.t0, seg.t1];
    play(range[0]);
  }

  // ---------------- preset library ----------------
  const famRank = f => { const i = BD.presets.FAMS.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => BD.presets.list.slice().sort((a, b) => famRank(a.fam) - famRank(b.fam));
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    let shot;
    try { shot = ENG.newShot(pr.id); } catch (e) { return; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try { ENG.drawShot(g, shot, p * shot.dur, W, H, 'hi'); } catch (e) { console.warn(pr.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat(BD.presets.FAMS.filter(f => BD.presets.list.some(p => p.fam === f)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || p.fam === family) && (!ql || (p.name + ' ' + p.id + ' ' + p.fam + ' ' + (p.note || '')).toLowerCase().includes(ql)));
    const cur = currentShot();
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard' + (cur && cur.preset === pr.id ? ' cur' : ''); card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || '';
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const fam = document.createElement('span'); fam.className = 'fam'; fam.textContent = pr.fam;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new shot with this preset';
      card.append(cv, nm, fam, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.55));
      let raf = 0, t0 = 0;
      const anim = now => { const d = pr.dur + 0.5, x = ((now - t0) / 1000) % d; drawPresetThumb(cv, pr, U.clamp(x / pr.dur)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.55); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addShotWith(pr); };
    }
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  function markCurrentPreset() {
    const cur = currentShot();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentShot() { return sel.kind === 'shot' && proj.shots[sel.i] ? proj.shots[sel.i] : null; }
  function applyPreset(pr) {
    if (sel.kind !== 'shot' || !proj.shots[sel.i]) return addShotWith(pr);
    pushUndo();
    const shot = proj.shots[sel.i];
    const oldDur = shot.dur;
    ENG.applyPreset(shot, pr.id, { f: {}, dur: false, pos: false });
    shot.dur = oldDur; // auditioning looks keeps the user's timing
    changed(true); renderInspector(); markCurrentPreset();
    audition(sel.i);
    toast(`${pr.name} → shot ${sel.i + 1}`);
  }
  function addShotWith(pr, at) {
    pushUndo();
    const i = at != null ? at : (sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length);
    const shot = ENG.newShot(pr ? pr.id : 'bp-fort-blueprint');
    proj.shots.splice(i, 0, shot);
    sel = { kind: 'shot', i };
    changed(true); renderInspector(); markCurrentPreset();
    audition(i);
  }

  // ---------------- timeline ----------------
  const TRANS_LABELS = { cut: '—', fade: 'fade', black: 'black', wipe: 'wipe' };
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((c, i) => {
      if (i > 0) {
        const tr = document.createElement('button');
        tr.className = 'trans' + (c.trans !== 'cut' ? ' on' : '');
        tr.textContent = TRANS_LABELS[c.trans] || '—';
        tr.title = 'Transition into this shot: ' + c.trans;
        tr.onclick = () => {
          pushUndo();
          const order = ['cut', 'fade', 'black', 'wipe'];
          c.trans = order[(order.indexOf(c.trans || 'cut') + 1) % order.length];
          changed(); renderTimeline(); renderLayers();
        };
        el.appendChild(tr);
      }
      const b = document.createElement('button'); b.className = 'clip' + (sel.kind === 'shot' && sel.i === i ? ' sel' : ''); b.dataset.i = i; b.draggable = true;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      b.append(cv, meta);
      b.onclick = () => { sel = { kind: 'shot', i }; afterSelect(); audition(i); };
      b.ondragstart = e => { e.dataTransfer.setData('text/shot', String(i)); e.dataTransfer.effectAllowed = 'move'; };
      b.ondragover = e => { e.preventDefault(); b.classList.add('dragover'); };
      b.ondragleave = () => b.classList.remove('dragover');
      b.ondrop = e => {
        e.preventDefault(); b.classList.remove('dragover');
        const from = +e.dataTransfer.getData('text/shot');
        if (!isFinite(from) || from === i) return;
        pushUndo();
        const [moved] = proj.shots.splice(from, 1);
        let to = i; if (from < i) to = i - 1;
        proj.shots.splice(to, 0, moved);
        sel = { kind: 'shot', i: to };
        changed(true); renderInspector(); markCurrentPreset();
      };
      el.appendChild(b);
    });
    const add = document.createElement('button'); add.className = 'tadd'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => addShotWith(null);
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs(); renderLayers();
  }
  function presetLabel(shot) {
    if (shot.preset && BD.presets.byId[shot.preset]) return BD.presets.byId[shot.preset].name;
    const el = BD.fx.byId[shot.el];
    return el ? el.name : shot.el;
  }
  function updateTimelineLabels() {
    proj.shots.forEach((c, i) => {
      const b = document.querySelector(`.clip[data-i="${i}"] .meta`);
      if (b) b.innerHTML = `<b></b><span>${(+c.dur).toFixed(1)}s</span>`, b.querySelector('b').textContent = `${i + 1}. ${presetLabel(c)}`;
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((c, i) => {
      const cv = document.querySelector(`.clip[data-i="${i}"] canvas`); if (!cv) return;
      try {
        const g = cv.getContext('2d'), W = cv.width, H = cv.height;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        ENG.drawShot(g, c, c.dur * 0.6, W, H, proj.lang);
      } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- layers (timing bars for the selected shot) ----------------
  function layerOverrides(shot) {
    try { return JSON.parse((shot.f && shot.f.layerTimes) || '{}'); } catch (e) { return {}; }
  }
  function renderLayers() {
    const box = $('layerTracks'); box.innerHTML = '';
    const shot = currentShot();
    if (!shot) { $('layersHint').textContent = ''; return; }
    const el = BD.fx.byId[shot.el];
    if (!el || !el.layers) { $('layersHint').textContent = ''; return; }
    let lays = [];
    try { lays = el.layers(ENG.fieldsOf(shot), ENG.paramsOf(shot), shot.dur) || []; } catch (e) { return; }
    const editable = el.fields.some(f => f.k === 'layerTimes');
    $('layersHint').textContent = editable ? 'drag a bar to move it · grips resize' : 'timing preview';
    lays.forEach((lay, idx) => {
      const row = document.createElement('div'); row.className = 'lrow';
      const name = document.createElement('span'); name.className = 'lname'; name.textContent = lay.name;
      const track = document.createElement('div'); track.className = 'ltrack';
      const bar = document.createElement('div'); bar.className = 'lbar' + (editable ? ' editable' : '');
      const setBar = () => {
        bar.style.left = (U.clamp(lay.start / shot.dur, 0, 0.98) * 100) + '%';
        bar.style.width = (U.clamp(lay.dur / shot.dur, 0.02, 1) * 100) + '%';
      };
      setBar();
      bar.appendChild(Object.assign(document.createElement('div'), { className: 'grip l' }));
      bar.appendChild(Object.assign(document.createElement('div'), { className: 'grip r' }));
      track.appendChild(bar);
      row.append(name, track);
      box.appendChild(row);
      if (!editable) return;
      const write = () => {
        const ov = layerOverrides(shot);
        ov[lay.name] = [+lay.start.toFixed(2), +lay.dur.toFixed(2)];
        shot.f.layerTimes = JSON.stringify(ov);
        setBar(); changed(); dirty = true;
      };
      const drag = (e, mode) => {
        e.preventDefault(); e.stopPropagation();
        pushUndo();
        const startX = e.clientX, s0 = lay.start, d0 = lay.dur;
        const trackW = track.getBoundingClientRect().width;
        const move = ev => {
          const dx = (ev.clientX - startX) / Math.max(1, trackW) * shot.dur;
          if (mode === 'move') { lay.start = U.clamp(s0 + dx, 0, shot.dur - lay.dur); }
          else if (mode === 'l') { const ns = U.clamp(s0 + dx, 0, s0 + d0 - 0.2); lay.dur = d0 - (ns - s0); lay.start = ns; }
          else { lay.dur = U.clamp(d0 + dx, 0.2, shot.dur - lay.start); }
          setBar();
        };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); write(); };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      };
      bar.addEventListener('pointerdown', e => drag(e, 'move'));
      bar.querySelector('.grip.l').addEventListener('pointerdown', e => drag(e, 'l'));
      bar.querySelector('.grip.r').addEventListener('pointerdown', e => drag(e, 'r'));
    });
    updateLayerPlayhead();
  }
  function updateLayerPlayhead() {
    const shot = currentShot();
    if (!shot) return;
    const seg = ENG.segAt(ENG.timeline(proj), Math.max(0, t));
    if (!seg || seg.shot !== shot) return;
    const frac = U.clamp((t - seg.t0) / seg.dur);
    document.querySelectorAll('.ltrack').forEach(tr => {
      let ph = tr.querySelector('.lplay');
      if (!ph) { ph = document.createElement('div'); ph.className = 'lplay'; tr.appendChild(ph); }
      ph.style.left = (frac * 100) + '%';
    });
  }

  // ---------------- inspector ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function section(title, right) { const s = h('div', 'sec'), t3 = h('h3'); t3.append(title); if (right) t3.append(right); s.append(t3); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const val = h('i', null, (+v).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + unit);
    i.oninput = () => { val.textContent = (+i.value).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + unit; on(+i.value); };
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) { const s = h('select'); for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); } s.value = v; s.onchange = () => on(s.value); return field(label, s); }
  function fText(label, v, on, area) { const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; i.value = v || ''; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }
  const optsOf = o => (typeof o === 'function' ? o() : o);

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.shots.length && sel.kind !== 'shot') return projectInspector(box);
    if (sel.kind === 'shot' && !proj.shots[sel.i]) { sel = { kind: 'project' }; return projectInspector(box); }
    if (sel.kind === 'project') return projectInspector(box);
    shotInspector(box, proj.shots[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    sec.append(fSelect('Language (labels)', [['hi', 'हिन्दी'], ['en', 'English']], proj.lang || 'hi', v => { proj.lang = v; changed(); }));
    box.append(sec);

    const bg = proj.bg || (proj.bg = { type: 'none', color: '#0b0d11', media: null, fit: 'cover', zoom: 0, start: 0, loop: true });
    const bgSec = section('Background (behind the diagrams)');
    const up = (k, v, re) => { bg[k] = v; changed(); if (re) { renderInspector(); drawTimelineThumbs(); } };
    bgSec.append(fSelect('Shows', [['none', 'Black'], ['color', 'Colour'], ['demo', 'Demo photo (fort dusk)'], ['media', 'Photo / video (your footage)']], bg.type || 'none', v => { up('type', v, true); }));
    if (bg.type === 'color') bgSec.append(fColor('Colour', bg.color || '#0b0d11', v => up('color', v)));
    if (bg.type === 'media') {
      const opts = [['', '— choose —']].concat(Object.entries(BD.media).filter(([, m]) => m.kind === 'image' || m.kind === 'video').map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
      bgSec.append(fSelect('File', opts, bg.media || '', v => { up('media', v || null); drawTimelineThumbs(); }));
      bgSec.append(btn('＋ Add photo / video file…', async () => { const fs = await pickFiles(); if (fs[0]) { bg.media = addMedia(fs[0]); changed(); renderInspector(); drawTimelineThumbs(); } }));
      if (bg.media && BD.media[bg.media] && BD.media[bg.media].missing) bgSec.append(h('p', 'desc', 'This file is not stored in the project. Add it again to re-link.'));
      bgSec.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture']], bg.fit || 'cover', v => up('fit', v)));
      bgSec.append(fRange('Slow zoom (Ken Burns)', bg.zoom || 0, 0, 0.3, 0.01, v => up('zoom', v)));
      const two = h('div', 'two');
      two.append(fRange('Focus X', bg.fx == null ? 0.5 : bg.fx, 0, 1, 0.01, v => up('fx', v)), fRange('Focus Y', bg.fy == null ? 0.5 : bg.fy, 0, 1, 0.01, v => up('fy', v)));
      bgSec.append(two);
      if ((BD.media[bg.media] || {}).kind === 'video') {
        bgSec.append(fRange('Start at (s)', bg.start || 0, 0, 120, 0.1, v => up('start', v)));
        bgSec.append(fCheck('Loop the clip', bg.loop !== false, v => up('loop', v)));
      }
    }
    box.append(bgSec);

    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of shots, each one animated diagram (blueprint draw-ons, wireframes, exploded views, labelled photos, process flows, trees, scale comparisons, cross-sections, mechanisms, relationship diagrams). Pick a preset in the library, edit the text and settings here, then Export: the full video, or one shot as a green-screen / transparent element for your editor. Exports are always silent.'));
    box.append(help);
  }
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }

  function shotInspector(box, c, i) {
    const el = BD.fx.byId[c.el];
    if (!el) { box.append(h('p', 'desc', `Element "${c.el}" is not available in this build.`)); return; }
    const F = ENG.fieldsOf(c), P = ENG.paramsOf(c);

    const txt = section(`SHOT ${i + 1} · ${el.name}`, btn('✕', () => { pushUndo(); proj.shots.splice(i, 1); sel = { kind: 'shot', i: Math.max(0, i - 1) }; if (!proj.shots.length) sel = { kind: 'project' }; changed(true); renderInspector(); }, 'btn sm danger'));
    if (el.note) txt.append(h('p', 'desc', el.note));
    for (const f of el.fields) {
      if (f.k === 'layerTimes') continue; // edited on the timeline bars
      txt.append(fText(f.label, F[f.k], v => { c.f[f.k] = v; changed(); drawTimelineThumbs(); }, f.multi));
    }
    box.append(txt);

    const set = (key, v, re) => { c.p[key] = v; changed(); drawTimelineThumbs(); if (re) renderInspector(); };
    const groups = { style: section('Style', btn('↺ Reset tweaks', () => { pushUndo(); c.p = {}; changed(); renderInspector(); })), anim: section('Animation'), labels: section('Labels'), media: section('Media') };
    for (const pd of el.params) {
      const v = P[pd.k];
      const g = groups[pd.sec] || groups.style;
      if (pd.type === 'range') g.append(fRange(pd.label, v, pd.min, pd.max, pd.step, x => set(pd.k, x)));
      else if (pd.type === 'select') g.append(fSelect(pd.label, optsOf(pd.options), String(v), x => set(pd.k, x, true)));
      else if (pd.type === 'check') g.append(fCheck(pd.label, v, x => set(pd.k, x)));
      else if (pd.type === 'color') g.append(fColor(pd.label, v, x => set(pd.k, x)));
      else if (pd.type === 'text') g.append(fText(pd.label, v, x => set(pd.k, x)));
      else if (pd.type === 'media') {
        const wrap = h('div');
        const kinds = pd.k === 'svg' ? ['svg'] : ['image', 'video'];
        const refresh = () => {
          wrap.innerHTML = '';
          const opts = [['', '— none —']].concat(Object.entries(BD.media).filter(([, m]) => kinds.includes(m.kind)).map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
          wrap.append(fSelect(pd.label, opts, String(v), x => { set(pd.k, x); }));
          wrap.append(btn(kinds[0] === 'svg' ? '＋ Add SVG file…' : '＋ Add photo / video…', async () => {
            const fs = await pickFiles();
            if (fs[0]) { pushUndo(); set(pd.k, addMedia(fs[0]), true); toast('Added ' + fs[0].name); }
          }));
        };
        refresh();
        g.append(wrap);
      }
    }
    if (groups.style.childNodes.length > 1) box.append(groups.style);
    if (groups.anim.childNodes.length > 1) box.append(groups.anim);
    if (groups.labels.childNodes.length > 1) box.append(groups.labels);
    if (groups.media.childNodes.length > 1) box.append(groups.media);

    const tim = section('Timing & place');
    tim.append(fRange('On screen for (s)', c.dur, 0.5, 20, 0.1, v => { c.dur = v; changed(); renderLayers(); }, 's'));
    const two = h('div', 'two');
    two.append(fRange('Anchor X', c.x == null ? 0.5 : c.x, 0, 1, 0.01, v => { c.x = v; changed(); }), fRange('Anchor Y', c.y == null ? 0.5 : c.y, 0, 1, 0.01, v => { c.y = v; changed(); }));
    tim.append(two);
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = c.seed || 7; seedIn.style.width = '90px'; seedIn.oninput = () => { c.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Detail seed'), seedIn, btn('🎲 New detail', () => { pushUndo(); c.seed = Math.floor(Math.random() * 9999) + 1; seedIn.value = c.seed; changed(); }));
    tim.append(seedRow);
    tim.append(fSelect('Transition in', ENG.TRANSITIONS, c.trans || 'cut', v => { c.trans = v; changed(); renderTimeline(); }));
    tim.append(btn('▶ Play this shot', () => audition(i), 'btn sm'));
    box.append(tim);

    const act = section('Shot');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { pushUndo(); const cp = JSON.parse(JSON.stringify(c)); cp.id = U.uid(); proj.shots.splice(i + 1, 0, cp); sel = { kind: 'shot', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) { pushUndo(); [proj.shots[i - 1], proj.shots[i]] = [proj.shots[i], proj.shots[i - 1]]; sel.i = i - 1; changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) { pushUndo(); [proj.shots[i + 1], proj.shots[i]] = [proj.shots[i], proj.shots[i + 1]]; sel.i = i + 1; changed(true); renderInspector(); } }),
    );
    act.append(row); box.append(act);
    const ex = section('Use it');
    const row2 = h('div', 'row gap wrap');
    row2.append(
      btn('Export green-screen element', () => openExport({ mode: 'green', shot: i }), 'btn sm'),
      btn('Export transparent WebM', () => openExport({ mode: 'alpha', shot: i }), 'btn sm'),
    );
    ex.append(row2); box.append(ex);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of BD.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    tl.segs.forEach(s => { const o = h('option', null, `Only shot ${s.i + 1}: ${presetLabel(s.shot)}`); o.value = String(s.i); rg.append(o); });
    const oc = h('option', null, 'Custom in → out'); oc.value = 'custom'; rg.append(oc);
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.shot != null ? String(pre.shot) : 'all';
    $('exFrom').value = '0'; $('exTo').value = tl.total.toFixed(1);
    const hint = () => {
      const m = mode.value;
      $('exCustom').style.display = rg.value === 'custom' ? '' : 'none';
      $('exHint').textContent = {
        composite: 'Your background + the diagrams, as one MP4 (H.264). Always silent.',
        green: 'Diagram on pure #00FF00 — drop it over your clip in CapCut / Premiere and use Chroma key. Pick one shot as the range.',
        blue: 'Same as green screen but on #0000FF, for shots that contain green.',
        alpha: 'Diagram with real transparency (WebM VP9 alpha) — works in Premiere, DaVinci and browsers. CapCut: prefer green screen.',
        matte: 'White = diagram, black = background. Use as a track matte / luma mask.',
      }[m];
      if (m !== 'composite' && rg.value === 'all' && rg.options.length > 2) rg.value = rg.options[1].value;
    };
    mode.onchange = hint; rg.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') o.from = +$('exFrom').value, o.to = +$('exTo').value;
    if (/^\d+$/.test(r)) { o.from = tl.segs[+r].t0; o.to = tl.segs[+r].t1; }
    if (o.from == null || isNaN(o.from)) o.from = 0;
    if (o.to == null || isNaN(o.to)) o.to = tl.total;
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await BD.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        BD.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of BD.templates.LIST) {
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
    $('btnPlay').onclick = () => (playing ? pause() : play());
    stage.onclick = () => (playing ? pause() : play());
    $('scrub').oninput = () => { range = null; const tl = ENG.timeline(proj); t = $('scrub').value / 1000 * tl.total; dirty = true; };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { BD.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'diagram-project').replace(/[\\/:*?"<>|]+/g, '') + '.blueprint.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddDemo').onclick = () => addShotWith(BD.presets.byId['bp-fort-blueprint']);
    $('btnAddPhoto').onclick = async () => {
      const fs = await pickFiles();
      if (!fs[0]) return;
      const id = addMedia(fs[0]);
      pushUndo();
      const shot = currentShot();
      if (shot) {
        const el = BD.fx.byId[shot.el];
        // put the file into the first media param of the selected shot, else start a labelled shot with it
        const mp = el && el.params.find(pd => pd.type === 'media');
        if (mp) { shot.p[mp.k] = id; changed(true); renderInspector(); audition(sel.i); toast(fs[0].name + ' → ' + mp.label); return; }
      }
      const sh = ENG.newShot('la-photo-labels');
      sh.p.photo = id;
      proj.shots.push(sh);
      sel = { kind: 'shot', i: proj.shots.length - 1 };
      changed(true); renderInspector(); audition(sel.i);
      toast('Labelled diagram with ' + fs[0].name);
    };
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);
        if (!/^(image|video)\//.test(f.type) && !isSvg) continue;
        pushUndo();
        const id = addMedia(f);
        const shot = currentShot();
        if (shot) {
          const el = BD.fx.byId[shot.el];
          const want = isSvg ? el && el.params.find(pd => pd.type === 'media' && pd.k === 'svg') : el && el.params.find(pd => pd.type === 'media' && pd.k !== 'svg');
          if (want) { shot.p[want.k] = id; changed(true); renderInspector(); toast(f.name + ' → ' + want.label); continue; }
        }
        if (isSvg) {
          const sh = ENG.newShot('bp-svg-import'); sh.p.svg = id;
          proj.shots.push(sh); sel = { kind: 'shot', i: proj.shots.length - 1 };
          changed(true); renderInspector(); toast('SVG draw-on added');
        } else {
          const sh = ENG.newShot('la-photo-labels'); sh.p.photo = id;
          proj.shots.push(sh); sel = { kind: 'shot', i: proj.shots.length - 1 };
          changed(true); renderInspector(); toast('Labelled diagram with ' + f.name);
        }
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { range = null; t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) { e.preventDefault(); redo(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel.kind === 'shot' && proj.shots[sel.i]) { pushUndo(); proj.shots.splice(sel.i, 1); sel = { kind: 'shot', i: Math.max(0, sel.i - 1) }; if (!proj.shots.length) sel = { kind: 'project' }; changed(true); renderInspector(); } }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.BDS = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(BD.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(tSec, mode = 'composite', quality = 0.92) {
      const c = window.__bdsCanvas || (window.__bdsCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, tSec);
      ENG.render(g, proj, tSec, { W: proj.width, H: proj.height, mode });
      if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      // element modes (green/blue/matte) render losslessly so #00FF00 stays exactly #00FF00
      const lossless = mode !== 'composite';
      return c.toDataURL(lossless ? 'image/png' : 'image/jpeg', quality);
    },
    // contact sheet of presets at several progress points (QA)
    sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 480, H = 270, show = true) {
      const pres = (ids || BD.presets.list.map(p => p.id)).map(id => BD.presets.byId[id]).filter(p => p);
      const c = document.getElementById('bdsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'bdsSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d');
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      const errs = [];
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try { ENG.drawShot(tg, ENG.newShot(pr.id), p * (pr.dur || 4), W, H, 'hi'); }
        catch (e) { errs.push(pr.id + ': ' + e.message); }
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, 190, 18);
        g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${pr.id}  p=${p}`, k * W + 4, r * H + 13);
      }));
      return { ms: Math.round(performance.now() - t0), rows: pres.length, errors: errs };
    },
  };

  // ---------------- start ----------------
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.defaultProject(); applySize(); }
  wire(); refreshAll();
  requestAnimationFrame(loop);
  T.ready().then(() => { dirty = true; renderLibrary(); drawTimelineThumbs(); });
})();
