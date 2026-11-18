// Studio UI: library, live preview, timeline with shot cards + layer bars, inspector,
// templates, save/open, undo/redo, export. Also exposes the pipeline hooks on window.VFX.
(() => {
  const U = VFX.util, ENG = VFX.engine, T = VFX.text, $ = id => document.getElementById(id);
  const STORE = 'vfx-elements-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'shot', i: 0, li: -1 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null;            // [a,b] audition window for one shot
  let family = 'All', query = '';
  const stage = $('stage'), sctx = stage.getContext('2d');

  // ---------------- undo / redo ----------------
  let undoStack = [], redoStack = [], preState = null, committed = null;
  const snap = () => JSON.stringify({ name: proj.name, width: proj.width, height: proj.height, fps: proj.fps, lang: proj.lang, shots: proj.shots });
  function pushUndo(state) {
    const s = state != null ? state : committed;
    if (s == null) return;
    if (undoStack.length && undoStack[undoStack.length - 1] === s) return;
    undoStack.push(s);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }
  function commit() { committed = snap(); }
  function armUndo(el) {                       // call at interaction start (stores pre-state once)
    const arm = () => { if (preState == null) preState = committed; };
    el.addEventListener('pointerdown', arm, { passive: true });
    el.addEventListener('focus', arm, { passive: true });
  }
  function settle() {                          // call on 'change' (interaction end)
    if (preState != null) { pushUndo(preState); preState = null; }
    commit();
  }
  function undo() { if (!undoStack.length) return; redoStack.push(snap()); applyState(undoStack.pop()); }
  function redo() { if (!redoStack.length) return; undoStack.push(snap()); applyState(redoStack.pop()); }
  function applyState(s) {
    const p = JSON.parse(s);
    proj = Object.assign(ENG.defaultProject(), p);
    sel = { kind: 'shot', i: 0, li: -1 };
    if (!proj.shots.length) proj.shots = [ENG.newShot({})];
    t = 0; range = null; pause(); applySize(); refreshAll(); commit();
  }

  // ---------------- media ----------------
  let mediaSeq = 1;
  function addMedia(file) {
    const kind = file.type.startsWith('video') ? 'video' : 'image';
    const id = 'm' + Date.now().toString(36) + (mediaSeq++);
    const url = URL.createObjectURL(file);
    const m = { kind, name: file.name, url };
    if (kind === 'image') {
      m.el = new Image(); m.el.onload = () => { dirty = true; }; m.el.src = url;
      if (file.size < 4e6) { const r = new FileReader(); r.onload = () => { m.dataUrl = r.result; queueSave(); }; r.readAsDataURL(file); }
    } else {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
      v.addEventListener('loadeddata', () => { dirty = true; });
      v.addEventListener('seeked', () => { dirty = true; });
      m.el = v;
    }
    VFX.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (VFX.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; }; el.src = m.dataUrl || m.url;
        VFX.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, url: m.url, el };
      } else if (m.kind === 'video' && m.url) {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; });
        v.addEventListener('seeked', () => { dirty = true; });
        VFX.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else VFX.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 4e6;
    if (withMedia) for (const [id, m] of Object.entries(VFX.media)) {
      if (!proj.shots.some(s => (s.bg || {}).media === id)) continue;
      const e = { kind: m.kind, name: m.name };
      if (withMedia === 'all') { if (m.dataUrl) e.dataUrl = m.dataUrl; if (m.url) e.url = m.url; }
      else if (m.dataUrl && m.dataUrl.length < budget) { e.dataUrl = m.dataUrl; budget -= m.dataUrl.length; }
      media[id] = e;
    }
    return JSON.stringify({ version: 1, name: proj.name, width: proj.width, height: proj.height, fps: proj.fps, lang: proj.lang, media, shots: proj.shots });
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.shots) && !Array.isArray(p.clips)) throw new Error('Not an Atmosphere & VFX Studio project');
    restoreMedia(p.media);
    proj = ENG.normProject(p);
    if (!proj.shots.length) proj.shots = [ENG.newShot({})];
    sel = { kind: 'shot', i: 0, li: -1 };
    t = 0; range = null; pause();
    applySize(); refreshAll(); commit();
  }
  function changed(structure = false) { dirty = true; queueSave(); commit(); if (structure) { renderTimeline(); renderLayers(); } else updateTimelineLabels(); }

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
      t += Math.min(0.1, (now - last) / 1000);               // never step backwards, clamp dt
      if (t >= end) {
        if ($('chkLoop').checked) t = range ? range[0] : 0;
        else { t = end - 1e-3; pause(); }
      }
    }
    last = now;
    if (playing || dirty) {
      ENG.syncVideos(proj, t, playing);
      try { ENG.render(sctx, proj, t, { W: stage.width, H: stage.height, tl }); } catch (e) { console.error(e); }
      if ($('chkGuides').checked) drawGuides(sctx, stage.width, stage.height);
      $('timeLabel').textContent = `${fmt(t)} / ${fmt(tl.total)}`;
      $('scrub').value = tl.total ? Math.round(t / tl.total * 1000) : 0;
      markLive(tl); movePlayhead();
      dirty = false;
    }
    requestAnimationFrame(loop);
  }
  function drawGuides(g, W, H) {
    g.save();
    g.strokeStyle = 'rgba(229,169,60,.5)'; g.lineWidth = Math.max(1, W / 900);
    g.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
    g.strokeStyle = 'rgba(229,169,60,.25)';
    for (let i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(W * i / 3, 0); g.lineTo(W * i / 3, H); g.stroke();
      g.beginPath(); g.moveTo(0, H * i / 3); g.lineTo(W, H * i / 3); g.stroke();
    }
    g.restore();
  }
  function markLive(tl) {
    const seg = ENG.segAt(tl, t);
    document.querySelectorAll('.timeline .live').forEach(e => e.classList.remove('live'));
    if (seg) { const el = document.querySelector(`.clip[data-i="${seg.i}"]`); if (el) el.classList.add('live'); }
  }
  function movePlayhead() {
    const ph = $('playhead'); if (!ph) return;
    const seg = ENG.segAt(ENG.timeline(proj), t);
    const shot = sel.kind === 'layer' || sel.kind === 'shot' ? proj.shots[sel.i] : seg && seg.shot;
    if (!shot) { ph.style.display = 'none'; return; }
    const seg2 = ENG.timeline(proj).segs.find(s => s.shot === shot);
    const lt = U.clamp(t - seg2.t0, 0, seg2.dur);
    ph.style.display = 'block';
    ph.style.left = (lt / seg2.dur * 100) + '%';
  }
  function audition(i) {
    const tl = ENG.timeline(proj), seg = tl.segs[i];
    if (!seg) return;
    range = [seg.t0, seg.t1];
    play(range[0]);
  }

  // ---------------- preset library ----------------
  const famRank = f => { const i = VFX.presets.FAMS.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => VFX.presets.list.slice().sort((a, b) => famRank(a.fam) - famRank(b.fam));
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    try {
      g.drawImage(ENG.backdrop('ruins', W, H), 0, 0);
      const layer = ENG.newLayer(pr.id);
      ENG.drawLayer(g, layer, p * layer.dur, W, H, 'composite', ENG.backdrop('ruins', W, H));
    } catch (e) { console.warn(pr.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat(VFX.presets.FAMS.filter(f => VFX.presets.list.some(p => p.fam === f)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || p.fam === family) && (!ql || (p.name + ' ' + p.id + ' ' + p.fam + ' ' + (p.note || '')).toLowerCase().includes(ql)));
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard'; card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || '';
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const fam = document.createElement('span'); fam.className = 'fam'; fam.textContent = pr.fam;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add this element as a new layer on the selected shot';
      card.append(cv, nm, fam, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.55));
      let raf = 0, t0 = 0;
      const anim = now => { const d = pr.dur + 0.5, x = ((now - t0) / 1000) % d; drawPresetThumb(cv, pr, U.clamp(x / pr.dur)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.55); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addLayerWith(pr); };
    }
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  function markCurrentPreset() {
    const cur = currentLayer();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentLayer() {
    return sel.kind === 'layer' && proj.shots[sel.i] && proj.shots[sel.i].layers[sel.li] ? proj.shots[sel.i].layers[sel.li] : null;
  }
  function applyPreset(pr) {
    // click a card: replace the selected layer, or add to the selected shot
    if (sel.kind === 'layer') {
      const layer = proj.shots[sel.i].layers[sel.li];
      pushUndo();
      const keepDur = layer.dur;
      ENG.applyPreset(layer, pr.id, { f: {}, dur: false, pos: false });
      layer.dur = keepDur;
      changed(true); renderInspector(); markCurrentPreset();
      toast(`${pr.name} → लेयर`);
    } else if (sel.kind === 'shot' && proj.shots[sel.i]) {
      addLayerWith(pr);
    } else addLayerWith(pr);
  }
  function addLayerWith(pr) {
    const shot = proj.shots[sel.i] || proj.shots[0];
    if (!shot) return;
    pushUndo();
    const layer = ENG.newLayer(pr ? pr.id : 'sm-column');
    shot.layers.push(layer);
    sel = { kind: 'layer', i: proj.shots.indexOf(shot), li: shot.layers.length - 1 };
    changed(true); renderInspector(); markCurrentPreset();
    toast(`${pr.name} जुड़ गया`);
  }

  // ---------------- timeline (shot cards + transitions) ----------------
  const TRANS = [['cut', 'कट'], ['fade', 'क्रॉस-फ़ेड'], ['dip', 'डिप टू ब्लैक']];
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((s, i) => {
      if (i > 0) {
        const tr = s.trans || { type: 'cut', dur: 0 };
        const chip = document.createElement('button');
        chip.className = 'tchip';
        chip.title = 'Transition into this shot — click to change';
        chip.innerHTML = `<b>⇄</b> ${TRANS.find(x => x[0] === tr.type)[1]}${tr.type !== 'cut' ? ' · ' + U.num(tr.dur || 0.6) + 's' : ''}`;
        chip.onclick = () => {
          pushUndo();
          const idx = TRANS.findIndex(x => x[0] === (s.trans || {}).type);
          const nx = TRANS[(idx + 1) % TRANS.length];
          s.trans = { type: nx[0], dur: (s.trans || {}).dur || 0.6 };
          changed(true); renderInspector();
        };
        el.appendChild(chip);
      }
      const b = document.createElement('button');
      b.className = 'clip' + (sel.i === i && sel.kind !== 'project' ? ' sel' : ''); b.dataset.i = i;
      b.draggable = true;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      b.append(cv, meta);
      b.onclick = () => { sel = { kind: 'shot', i, li: -1 }; afterSelect(); audition(i); };
      b.ondragstart = e => { e.dataTransfer.setData('text/shot', String(i)); };
      b.ondragover = e => e.preventDefault();
      b.ondrop = e => {
        const from = +e.dataTransfer.getData('text/shot');
        if (isNaN(from) || from === i) return;
        pushUndo();
        const [shot] = proj.shots.splice(from, 1);
        proj.shots.splice(i, 0, shot);
        sel = { kind: 'shot', i, li: -1 };
        changed(true); renderInspector();
      };
      el.appendChild(b);
    });
    const add = document.createElement('button'); add.className = 'tadd'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => { pushUndo(); proj.shots.splice(sel.i + 1, 0, ENG.newShot({ name: `शॉट ${proj.shots.length + 1}` })); sel = { kind: 'shot', i: sel.i + 1, li: -1 }; changed(true); renderInspector(); };
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs();
  }
  function presetLabel(layer) {
    if (layer.preset && VFX.presets.byId[layer.preset]) return VFX.presets.byId[layer.preset].name;
    const fx = VFX.fx.byId[layer.fx];
    return fx ? fx.name : layer.fx;
  }
  function shotLabel(s, i) { return `${i + 1}. ${s.name || presetLabel(s.layers[0] || {})}`; }
  function updateTimelineLabels() {
    proj.shots.forEach((s, i) => {
      const b = document.querySelector(`.clip[data-i="${i}"] .meta`);
      if (b) b.innerHTML = `<b></b><span>${(+s.dur).toFixed(1)}s</span>`, b.querySelector('b').textContent = shotLabel(s, i).slice(0, 22);
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((s, i) => {
      const cv = document.querySelector(`.clip[data-i="${i}"] canvas`); if (!cv) return;
      try {
        const g = cv.getContext('2d'), W = cv.width, H = cv.height;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        ENG.renderShot(g, s, s.dur * 0.55, W, H, 'composite');
      } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderLayers(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- layer bars (timing) ----------------
  function renderLayers() {
    const box = $('layers'); if (!box) return;
    box.innerHTML = '';
    const shot = proj.shots[sel.i] || proj.shots[0];
    const head = $('layersHead');
    if (head) head.textContent = `लेयरें — ${shot ? (shot.name || 'शॉट ' + (sel.i + 1)) : ''}`;
    if (!shot) return;
    const dur = shot.dur;
    // ruler
    const ruler = document.createElement('div'); ruler.className = 'lruler';
    const nT = Math.min(12, Math.ceil(dur));
    for (let i = 0; i <= nT; i++) {
      const tick = document.createElement('span');
      tick.style.left = (Math.min(1, i / nT) * 100) + '%';
      tick.textContent = U.num(Math.round(i / nT * dur * 10) / 10);
      ruler.appendChild(tick);
    }
    box.appendChild(ruler);
    const track = document.createElement('div'); track.className = 'ltrack'; box.appendChild(track);
    const ph = document.createElement('div'); ph.id = 'playhead'; track.appendChild(ph);
    if (!shot.layers.length) {
      const empty = document.createElement('p'); empty.className = 'hint'; empty.textContent = 'इस शॉट पर कोई लेयर नहीं — लाइब्रेरी से कोई एलिमेंट जोड़ें (＋ बटन)।';
      box.appendChild(empty);
      return;
    }
    shot.layers.forEach((layer, li) => {
      const bar = document.createElement('div');
      bar.className = 'lbar' + (sel.kind === 'layer' && sel.li === li ? ' sel' : '') + (layer.on === false ? ' off' : '');
      bar.style.left = (U.clamp(layer.start / dur, 0, 1) * 100) + '%';
      bar.style.width = (U.clamp(layer.dur / dur, 0, 1 - layer.start / dur) * 100) + '%';
      const name = document.createElement('span'); name.className = 'lname'; name.textContent = presetLabel(layer);
      const gl = document.createElement('div'); gl.className = 'grip gl'; gl.title = 'Drag to change start';
      const gr = document.createElement('div'); gr.className = 'grip gr'; gr.title = 'Drag to change length';
      bar.append(gl, name, gr);
      bar.onclick = e => {
        if (e.target === gl || e.target === gr) return;
        sel = { kind: 'layer', i: sel.i, li };
        renderLayers(); renderInspector(); markCurrentPreset(); dirty = true;
        if (mobile()) showTab('insp');
      };
      // dragging: move bar / resize with grips (pointer events, works on touch)
      const drag = (grip, mode) => {
        grip.addEventListener('pointerdown', e => {
          e.preventDefault(); e.stopPropagation();
          pushUndo();
          const x0 = e.clientX, s0 = layer.start, d0 = layer.dur;
          const rect = track.getBoundingClientRect();
          const move = ev => {
            const dt = (ev.clientX - x0) / rect.width * dur;
            if (mode === 'move') layer.start = U.clamp(Math.round((s0 + dt) * 10) / 10, 0, Math.max(0, dur - 0.3));
            else if (mode === 'l') {
              const ns = U.clamp(Math.round((s0 + dt) * 10) / 10, 0, s0 + d0 - 0.3);
              layer.dur = Math.round((d0 - (ns - s0)) * 10) / 10; layer.start = ns;
            } else layer.dur = U.clamp(Math.round((d0 + dt) * 10) / 10, 0.3, dur - layer.start);
            bar.style.left = (U.clamp(layer.start / dur, 0, 1) * 100) + '%';
            bar.style.width = (U.clamp(layer.dur / dur, 0, 1 - layer.start / dur) * 100) + '%';
            dirty = true; queueSave();
          };
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); commit(); renderInspector(); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        });
      };
      drag(gl, 'l'); drag(gr, 'r');
      bar.addEventListener('pointerdown', e => {
        if (e.target === gl || e.target === gr) return;
        pushUndo();
        const x0 = e.clientX, s0 = layer.start;
        const rect = track.getBoundingClientRect();
        const move = ev => {
          const dt = (ev.clientX - x0) / rect.width * dur;
          layer.start = U.clamp(Math.round((s0 + dt) * 10) / 10, 0, Math.max(0, dur - 0.3));
          bar.style.left = (U.clamp(layer.start / dur, 0, 1) * 100) + '%';
          dirty = true; queueSave();
        };
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); commit(); renderInspector(); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
      track.appendChild(bar);
    });
  }

  // ---------------- inspector ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function section(title, right) { const s = h('div', 'sec'), t3 = h('h3'); t3.append(title); if (right) t3.append(right); s.append(t3); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const val = h('i', null, (step < 1 ? U.num(v) : String(Math.round(v))) + unit);
    i.oninput = () => { val.textContent = (step < 1 ? U.num(+i.value) : String(Math.round(+i.value))) + unit; on(+i.value); };
    armUndo(i); i.onchange = () => settle();
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) {
    const s = h('select'); for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); } s.value = v;
    armUndo(s); s.onchange = () => { pushUndo(); on(s.value); settle(); };
    return field(label, s);
  }
  function fText(label, v, on, area) {
    const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; i.value = v || '';
    armUndo(i); i.oninput = () => on(i.value); i.onchange = () => settle();
    return field(label, i);
  }
  function fColor(label, v, on) {
    const i = h('input'); i.type = 'color'; i.value = v || '#000000';
    armUndo(i); i.oninput = () => on(i.value); i.onchange = () => settle();
    return field(label, i);
  }
  function fCheck(label, v, on) {
    const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v;
    armUndo(i); i.onchange = () => { pushUndo(); on(i.checked); settle(); };
    l.append(i, label); return l;
  }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.shots.length) return projectInspector(box);
    if (sel.kind === 'layer' && proj.shots[sel.i] && proj.shots[sel.i].layers[sel.li]) return layerInspector(box, proj.shots[sel.i], proj.shots[sel.i].layers[sel.li], sel.li);
    shotInspector(box, proj.shots[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; changed(); }));
    sec.append(fSelect('Language (labels)', [['hi', 'हिन्दी'], ['en', 'English']], proj.lang || 'hi', v => { proj.lang = v; changed(true); }));
    box.append(sec);

    const help = section('How it works');
    help.append(h('p', 'desc', 'एक वीडियो = शॉट्स की कतार। हर शॉट में एक बैकग्राउंड (डेमो दृश्य, रंग या आपकी फ़ोटो/वीडियो) और उसके ऊपर लेयरें हैं — धुआँ, आग, बारिश, बिजली… लाइब्रेरी से प्रीसेट चुनें, टाइमलाइन में लेयर की टाइमिंग खींचें, और Export से पूरा वीडियो या ग्रीन-स्क्रीन/ट्रांसपेरेंट एलिमेंट निकालें। एक्सपोर्ट हमेशा साइलेंट है।'));
    box.append(help);
  }

  function shotInspector(box, s, i) {
    const sec = section(`Shot ${i + 1}`, btn('✕ Delete shot', () => {
      pushUndo();
      proj.shots.splice(i, 1);
      if (!proj.shots.length) proj.shots = [ENG.newShot({})];
      sel = { kind: 'shot', i: Math.max(0, i - 1), li: -1 };
      changed(true); renderInspector();
    }, 'btn sm danger'));
    sec.append(fText('Shot name', s.name, v => { s.name = v; changed(); }));
    sec.append(fRange('On screen for (s)', s.dur, 0.5, 30, 0.1, v => { s.dur = v; changed(); }, 's'));
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = s.seed || 7; seedIn.style.width = '90px';
    seedIn.oninput = () => { s.seed = +seedIn.value || 1; changed(); };
    armUndo(seedIn); seedIn.onchange = () => settle();
    const seedRow = h('div', 'row gap'); seedRow.append(h('span', 'desc', 'Seed'), seedIn);
    sec.append(seedRow);
    // transition into this shot
    if (i > 0) {
      const tr = s.trans || (s.trans = { type: 'cut', dur: 0 });
      sec.append(fSelect('Transition in', TRANS, tr.type, v => { tr.type = v; changed(true); }));
      if (tr.type !== 'cut') sec.append(fRange('Transition length (s)', tr.dur || 0.6, 0.2, 2, 0.1, v => { tr.dur = v; changed(); }, 's'));
    }
    const row = h('div', 'row gap wrap');
    row.append(
      btn('◀ Move', () => { if (i > 0) { pushUndo(); [proj.shots[i - 1], proj.shots[i]] = [proj.shots[i], proj.shots[i - 1]]; sel.i = i - 1; changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) { pushUndo(); [proj.shots[i + 1], proj.shots[i]] = [proj.shots[i], proj.shots[i + 1]]; sel.i = i + 1; changed(true); renderInspector(); } }),
      btn('Duplicate', () => { pushUndo(); const cp = JSON.parse(JSON.stringify(s)); cp.id = U.uid(); cp.layers.forEach(l => l.id = U.uid()); proj.shots.splice(i + 1, 0, cp); sel.i = i + 1; changed(true); renderInspector(); }),
    );
    sec.append(row);
    box.append(sec);

    // background
    const bg = s.bg || (s.bg = { type: 'demo', backdrop: 'city', color: '#101014', media: null, fit: 'cover', zoom: 0, fx: 0.5, fy: 0.5, start: 0, loop: true });
    const bgSec = section('Background');
    const up = (k, v, re) => { bg[k] = v; changed(); if (re) { renderInspector(); drawTimelineThumbs(); } else drawTimelineThumbs(); };
    bgSec.append(fSelect('Shows', [['none', 'Black'], ['color', 'Colour'], ['demo', 'Demo scene (procedural)'], ['media', 'Photo / video (your footage)']], bg.type || 'none', v => { up('type', v, true); }));
    if (bg.type === 'demo') bgSec.append(fSelect('Scene', [['city', 'City at dusk'], ['ruins', 'War ruins'], ['field', 'Open field']], bg.backdrop || 'city', v => { up('backdrop', v, true); }));
    if (bg.type === 'color') bgSec.append(fColor('Colour', bg.color || '#101014', v => up('color', v)));
    if (bg.type === 'media') {
      const opts = [['', '— choose —']].concat(Object.entries(VFX.media).filter(([, m]) => m.kind === 'image' || m.kind === 'video').map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
      bgSec.append(fSelect('File', opts, bg.media || '', v => { up('media', v || null); }));
      bgSec.append(btn('＋ Add photo / video…', async () => { const fs = await pickFiles(); if (fs[0]) { pushUndo(); bg.media = addMedia(fs[0]); changed(); renderInspector(); drawTimelineThumbs(); } }));
      if (bg.media && VFX.media[bg.media] && VFX.media[bg.media].missing) bgSec.append(h('p', 'desc', 'This file is not stored in the project. Add it again to re-link.'));
      bgSec.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture']], bg.fit || 'cover', v => up('fit', v)));
      bgSec.append(fRange('Slow zoom (Ken Burns)', bg.zoom || 0, 0, 0.3, 0.01, v => up('zoom', v)));
      const two = h('div', 'two');
      two.append(fRange('Focus X', bg.fx == null ? 0.5 : bg.fx, 0, 1, 0.01, v => up('fx', v)), fRange('Focus Y', bg.fy == null ? 0.5 : bg.fy, 0, 1, 0.01, v => up('fy', v)));
      bgSec.append(two);
      if ((VFX.media[bg.media] || {}).kind === 'video') {
        bgSec.append(fRange('Start at (s)', bg.start || 0, 0, 120, 0.1, v => up('start', v)));
        bgSec.append(fCheck('Loop the clip', bg.loop !== false, v => up('loop', v)));
      }
    }
    box.append(bgSec);

    // layers list
    const lay = section(`Layers (${s.layers.length})`, btn('＋ Add layer', () => { showTab('lib'); toast('लाइब्रेरी से एलिमेंट चुनें — ＋ से जुड़ेगा'); }, 'btn sm'));
    if (!s.layers.length) lay.append(h('p', 'desc', 'कोई लेयर नहीं। लाइब्रेरी से ＋ दबाकर एलिमेंट जोड़ें।'));
    s.layers.forEach((layer, li) => {
      const rowEl = h('div', 'lrow' + (sel.kind === 'layer' && sel.li === li ? ' sel' : ''));
      const on = h('input'); on.type = 'checkbox'; on.checked = layer.on !== false;
      armUndo(on); on.onchange = () => { pushUndo(); layer.on = on.checked; settle(); changed(true); };
      const nm = h('span', 'lnm', presetLabel(layer));
      nm.onclick = () => { sel = { kind: 'layer', i, li }; renderLayers(); renderInspector(); markCurrentPreset(); if (mobile()) showTab('insp'); };
      rowEl.append(on, nm);
      rowEl.append(btn('↑', () => { if (li > 0) { pushUndo(); [s.layers[li - 1], s.layers[li]] = [s.layers[li], s.layers[li - 1]]; sel.li = li - 1; changed(true); renderInspector(); } }));
      rowEl.append(btn('↓', () => { if (li < s.layers.length - 1) { pushUndo(); [s.layers[li + 1], s.layers[li]] = [s.layers[li], s.layers[li + 1]]; sel.li = li + 1; changed(true); renderInspector(); } }));
      rowEl.append(btn('✕', () => { pushUndo(); s.layers.splice(li, 1); sel = { kind: 'shot', i, li: -1 }; changed(true); renderInspector(); }, 'btn sm danger'));
      lay.append(rowEl);
    });
    box.append(lay);
  }

  function layerInspector(box, s, layer, li) {
    const fx = VFX.fx.byId[layer.fx];
    if (!fx) { box.append(h('p', 'desc', `Element "${layer.fx}" is not available in this build.`)); return; }
    const P = ENG.paramsOf(layer), Fv = ENG.fieldsOf(layer);
    const head = section(`${li + 1}. ${fx.name}`, btn('✕ Delete layer', () => { pushUndo(); s.layers.splice(li, 1); sel = { kind: 'shot', i: sel.i, li: -1 }; changed(true); renderInspector(); }, 'btn sm danger'));
    if (fx.note) head.append(h('p', 'desc', fx.note));
    head.append(fCheck('On', layer.on !== false, v => { layer.on = v; changed(true); }));
    box.append(head);

    // text fields first
    if ((fx.fields || []).length) {
      const fsec = section('Text');
      for (const f of fx.fields) fsec.append(fText(f.label, Fv[f.k], v => { layer.f[f.k] = v; changed(); }, f.multi));
      box.append(fsec);
    }

    const set = (key, v, re) => { layer.p[key] = v; changed(); drawTimelineThumbs(); if (re) renderInspector(); };
    // group params by sec
    const groups = [];
    for (const pd of fx.params || []) {
      let g = groups.find(x => x.name === (pd.sec || 'Settings'));
      if (!g) groups.push(g = { name: pd.sec || 'Settings', items: [] });
      g.items.push(pd);
    }
    for (const grp of groups) {
      const sec = section(grp.name === 'Look' ? 'Look' : grp.name, btn('↺ Reset tweaks', () => { pushUndo(); layer.p = {}; changed(true); renderInspector(); }));
      for (const pd of grp.items) {
        const v = P[pd.k];
        if (pd.type === 'range') sec.append(fRange(pd.label, v, pd.min, pd.max, pd.step, x => set(pd.k, x)));
        else if (pd.type === 'select') sec.append(fSelect(pd.label, pd.options, String(v), x => set(pd.k, x, true)));
        else if (pd.type === 'check') sec.append(fCheck(pd.label, v, x => set(pd.k, x)));
        else if (pd.type === 'color') sec.append(fColor(pd.label, v, x => set(pd.k, x)));
      }
      box.append(sec);
    }

    const tim = section('Timing & place');
    tim.append(fRange('Start (s)', layer.start, 0, Math.max(1, s.dur - 0.3), 0.1, v => { layer.start = v; changed(); renderLayers(); }, 's'));
    tim.append(fRange('On for (s)', layer.dur, 0.3, Math.max(1, s.dur), 0.1, v => { layer.dur = v; changed(); renderLayers(); }, 's'));
    const two = h('div', 'two');
    two.append(fRange('Position X', layer.x == null ? 0.5 : layer.x, 0, 1, 0.01, v => { layer.x = v; changed(); }), fRange('Position Y', layer.y == null ? 0.5 : layer.y, 0, 1, 0.01, v => { layer.y = v; changed(); }));
    tim.append(two);
    tim.append(fRange('Opacity', layer.opacity == null ? 1 : layer.opacity, 0, 1, 0.01, v => { layer.opacity = v; changed(); }));
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = layer.seed || 7; seedIn.style.width = '90px';
    seedIn.oninput = () => { layer.seed = +seedIn.value || 1; changed(); };
    armUndo(seedIn); seedIn.onchange = () => settle();
    const seedRow = h('div', 'row gap'); seedRow.append(h('span', 'desc', 'Detail seed'), seedIn, btn('🎲 New detail', () => { pushUndo(); layer.seed = Math.floor(Math.random() * 9999) + 1; seedIn.value = layer.seed; changed(); }));
    tim.append(seedRow);
    tim.append(btn('▶ Play this shot', () => audition(sel.i), 'btn sm'));
    box.append(tim);

    const act = section('Layer');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { pushUndo(); const cp = JSON.parse(JSON.stringify(layer)); cp.id = U.uid(); s.layers.splice(li + 1, 0, cp); sel.li = li + 1; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (li > 0) { pushUndo(); [s.layers[li - 1], s.layers[li]] = [s.layers[li], s.layers[li - 1]]; sel.li = li - 1; changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (li < s.layers.length - 1) { pushUndo(); [s.layers[li + 1], s.layers[li]] = [s.layers[li], s.layers[li + 1]]; sel.li = li + 1; changed(true); renderInspector(); } }),
    );
    act.append(row); box.append(act);
    const ex = section('Use it');
    const row2 = h('div', 'row gap wrap');
    row2.append(
      btn('Export green-screen element', () => openExport({ mode: 'green', shot: sel.i }), 'btn sm'),
      btn('Export transparent WebM', () => openExport({ mode: 'alpha', shot: sel.i }), 'btn sm'),
    );
    ex.append(row2); box.append(ex);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of VFX.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    tl.segs.forEach(s => { const o = h('option', null, `Only shot ${s.i + 1}: ${shotLabel(s.shot, s.i).slice(0, 30)}`); o.value = String(s.i); rg.append(o); });
    const oc = h('option', null, 'Custom in–out…'); oc.value = 'custom'; rg.append(oc);
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.shot != null ? String(pre.shot) : 'all';
    const hint = () => {
      const m = mode.value;
      $('exHint').textContent = {
        composite: 'बैकग्राउंड + सारे एलिमेंट, एक MP4 (H.264) में। हमेशा साइलेंट।',
        green: 'शुद्ध #00FF00 पर सिर्फ़ एलिमेंट — CapCut / Premiere में Chroma key लगाएँ। आमतौर पर एक शॉट चुनें।',
        blue: 'ग्रीन की जगह #0000FF — जब शॉट में हरा रंग हो।',
        alpha: 'असली ट्रांसपेरेंसी (WebM VP9 alpha) — Premiere, DaVinci और ब्राउज़र में चलता है। CapCut: ग्रीन स्क्रीन बेहतर।',
        matte: 'सफ़ेद = एलिमेंट, काला = बाकी। Track matte / luma mask के लिए।',
      }[m];
      $('exCustom').style.display = rg.value === 'custom' ? 'flex' : 'none';
      if (m !== 'composite' && rg.value === 'all' && rg.options.length > 2) rg.value = rg.options[1].value;
    };
    mode.onchange = hint; rg.onchange = hint; hint();
    $('exIn').value = '0'; $('exOut').value = tl.total.toFixed(1);
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') {
      if (r === 'custom') { o.from = Math.max(0, +$('exIn').value || 0); o.to = Math.min(tl.total, +$('exOut').value || tl.total); }
      else { o.from = tl.segs[+r].t0; o.to = tl.segs[+r].t1; }
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await VFX.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        VFX.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of VFX.templates.LIST) {
      const b = h('button', 'tpl'); b.type = 'button';
      b.append(h('b', null, tp.name), h('span', null, tp.note));
      b.onclick = () => { pushUndo(); load(tp.make()); $('dlgTemplates').close(); toast(`Started: ${tp.name}`); };
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

  function refreshAll() { renderLibrary(); renderTimeline(); renderLayers(); renderInspector(); dirty = true; }

  // ---------------- wiring ----------------
  function wire() {
    $('btnPlay').onclick = () => (playing ? pause() : play());
    stage.onclick = () => (playing ? pause() : play());
    $('scrub').oninput = () => { range = null; const tl = ENG.timeline(proj); t = $('scrub').value / 1000 * tl.total; dirty = true; };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('chkGuides').onchange = () => { dirty = true; };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); commit(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { VFX.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'vfx-project').replace(/[\\/:*?"<>|]+/g, '') + '.vfx.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { pushUndo(); load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddPhoto').onclick = async () => {
      const fs = await pickFiles();
      if (!fs.length) return;
      pushUndo();
      const i = Math.min(proj.shots.length, sel.i + 1);
      const shot = ENG.newShot({ name: fs[0].name.replace(/\.[^.]+$/, '').slice(0, 18), dur: 6, bg: { type: 'media', media: addMedia(fs[0]), fit: 'cover', zoom: 0.06 } });
      proj.shots.splice(i, 0, shot);
      sel = { kind: 'shot', i, li: -1 };
      changed(true); renderInspector();
      toast('Photo added as a new shot');
    };
    $('btnAddDemo').onclick = () => {
      pushUndo();
      const i = Math.min(proj.shots.length, sel.i + 1);
      proj.shots.splice(i, 0, ENG.newShot({ name: `शॉट ${proj.shots.length + 1}`, dur: 6, bg: { type: 'demo', backdrop: 'city' } }));
      sel = { kind: 'shot', i, li: -1 };
      changed(true); renderInspector();
    };
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { pushUndo(); f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        const shot = proj.shots[sel.i] || proj.shots[0];
        pushUndo();
        shot.bg = Object.assign(shot.bg || {}, { type: 'media', media: addMedia(f), fit: 'cover', zoom: 0 });
        changed(); renderInspector(); drawTimelineThumbs();
        toast('Background set to ' + f.name);
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { range = null; t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  Object.assign(VFX, {
    async load(p) {
      load(p);
      await Promise.all(Object.values(VFX.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(tSec, mode = 'composite', quality = 0.92) {
      const c = window.__vfxCanvas || (window.__vfxCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, tSec);
      ENG.render(g, proj, tSec, { W: proj.width, H: proj.height, mode });
      if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      // always PNG for the pipeline: lossless, and #00FF00 stays exactly #00FF00 with no
      // colour-range shift (JPEG piping would need in_range=pc:out_range=tv compensation)
      return c.toDataURL('image/png');
    },
    // contact sheet of presets at several progress points (QA)
    sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 480, H = 270, show = true) {
      const pres = (ids || VFX.presets.list.map(p => p.id)).map(id => VFX.presets.byId[id]).filter(p => p);
      const c = document.getElementById('vfxSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'vfxSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d'), back = ENG.backdrop('ruins', W, H);
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      const errs = [];
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try {
          tg.drawImage(back, 0, 0);
          ENG.drawLayer(tg, ENG.newLayer(pr.id), p * (pr.dur || 6), W, H, 'composite', back);
        } catch (e) { errs.push(pr.id + ': ' + e.message); }
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, 190, 18);
        g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${pr.id}  p=${p}`, k * W + 4, r * H + 13);
      }));
      return { ms: Math.round(performance.now() - t0), rows: pres.length, errors: errs };
    },
  });

  // ---------------- start ----------------
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.normProject(ENG.defaultProject()); applySize(); commit(); }
  wire(); refreshAll();
  requestAnimationFrame(loop);
  T.ready().then(() => { dirty = true; renderLibrary(); drawTimelineThumbs(); });

  window.__MAS_BRIDGE_STATE = {
    id: 'vfx-elements-studio',
    engine: ENG,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { range = null; movePlayhead(U.clamp(+v || 0, 0, ENG.timeline(proj).total)); dirty = true; },
    isPlaying: () => playing,
    play: () => play(),
    pause: () => pause(),
    getDuration: () => ENG.timeline(proj).total,
    selectLayer: idx => { if (proj.shots[idx]) { sel = { kind: 'shot', i: idx, li: 0 }; refreshAll(); } },
    addLayer: (id) => { const pr = VFX.presets.byId[id] || VFX.presets.list[0]; addLayerWith(pr); },
    getAddableTypes: () => VFX.presets.list.slice(0, 24).map(p => ({ id: p.id, name: p.name, desc: p.fam, group: p.fam, icon: '≋' })),
    getMediaList: () => Object.entries(VFX.media || {}).map(([id, m]) => ({ id, name: m.name || id, kind: m.kind || 'image', src: m.dataUrl || m.url || '' })),
    uploadMedia: async files => { for (const f of files) { const id = addMedia(f); const sh = proj.shots[sel.i] || proj.shots[0]; if (sh) sh.bg = { type: 'media', media: id }; } changed(true); refreshAll(); },
    useMedia: (id) => { const sh = proj.shots[sel.i] || proj.shots[0]; if (sh) { sh.bg = { type: 'media', media: id }; changed(true); refreshAll(); } },
    changed: (full) => { changed(Boolean(full)); if (full) refreshAll(); },
  };

})();
