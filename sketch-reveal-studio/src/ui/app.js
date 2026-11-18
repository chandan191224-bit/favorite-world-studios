// Studio UI: preset library, live preview, shot timeline with transitions + layer bars,
// auto-built inspector, save/open, undo/redo, export. Same house style as the other studios.
(() => {
  const U = SK.util, ENG = SK.engine, T = SK.text, $ = id => document.getElementById(id);
  const STORE = 'sketch-reveal-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'shot', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null; // [a, b] audition window
  let family = 'All', query = '';
  const stage = $('stage'), sctx = stage.getContext('2d');

  // ---------------- undo / redo ----------------
  const undoStack = [], redoStack = [];
  let snapT = 0;
  const snap = () => JSON.stringify({ shots: proj.shots, transitions: proj.transitions, name: proj.name, width: proj.width, height: proj.height, fps: proj.fps, lang: proj.lang });
  function pushHistory(structural) {
    const s = snap();
    if (undoStack.length && undoStack[undoStack.length - 1] === s) return;
    undoStack.push(s);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }
  function applySnapshot(s) {
    const d = JSON.parse(s);
    proj.shots = d.shots; proj.transitions = d.transitions;
    proj.name = d.name; proj.width = d.width; proj.height = d.height; proj.fps = d.fps; proj.lang = d.lang;
    if (sel.kind === 'shot' && !proj.shots[sel.i]) sel = proj.shots.length ? { kind: 'shot', i: 0 } : { kind: 'project' };
    applySize(); refreshAll(); queueSave();
  }
  function undo() { if (undoStack.length > 1) { redoStack.push(undoStack.pop()); applySnapshot(undoStack[undoStack.length - 1]); toast('Undo'); } }
  function redo() { if (redoStack.length) { const s = redoStack.pop(); undoStack.push(s); applySnapshot(s); toast('Redo'); } }
  function changed(structure = false) {
    dirty = true;
    clearTimeout(snapT);
    snapT = setTimeout(pushHistory, structure ? 0 : 550);
    queueSave();
    if (structure) { renderTimeline(); } else updateTimelineLabels();
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
      if (file.size < 9e6) { const r = new FileReader(); r.onload = () => { m.dataUrl = r.result; queueSave(); }; r.readAsDataURL(file); }
    } else {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
      v.addEventListener('loadeddata', () => { dirty = true; });
      v.addEventListener('seeked', () => { dirty = true; });
      m.el = v;
    }
    SK.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (SK.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; }; el.src = m.dataUrl || m.url;
        SK.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; });
        v.addEventListener('seeked', () => { dirty = true; });
        SK.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else SK.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 3.2e6;
    if (withMedia) for (const [id, m] of Object.entries(SK.media)) {
      if (m.demo || m.missing || !m.dataUrl) continue;
      if (m.dataUrl.length < budget) { media[id] = { kind: m.kind, name: m.name, dataUrl: m.dataUrl }; budget -= m.dataUrl.length; }
      else media[id] = { kind: m.kind, name: m.name };
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 700); }

  function normalizeLoaded(p) {
    p = typeof p === 'string' ? JSON.parse(p) : p;
    if (!p || !Array.isArray(p.shots)) throw new Error('Not a Sketch & Ink Reveal Studio project');
    restoreMedia(p.media); delete p.media;
    // pipeline shorthand: {"shots":[{"preset": id, "media": {...}|id, "fields": {...}}]}
    p.shots = p.shots.map(c => {
      let media = c.media != null ? c.media : null;
      let demo = c.demo != null ? c.demo : null;
      if (media && typeof media === 'object') { // {m1: {path: ...}} style — engine render.mjs resolves paths
        const [[id, mm]] = Object.entries(media);
        media = id;
        if (mm && mm.kind) SK.media[id] = SK.media[id] || { kind: mm.kind, name: mm.name || id, missing: !(mm.dataUrl || mm.url) ? true : false, ...(mm.dataUrl ? { dataUrl: mm.dataUrl } : {}), ...(mm.url ? { url: mm.url } : {}) };
        if (mm && (mm.dataUrl || mm.url)) {
          if (mm.kind === 'video') {
            const v = document.createElement('video');
            v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = mm.url;
            v.addEventListener('loadeddata', () => { dirty = true; });
            SK.media[id] = { kind: 'video', name: mm.name || id, url: mm.url, el: v };
          } else {
            const el = new Image(); el.onload = () => { dirty = true; }; el.src = mm.dataUrl || mm.url;
            SK.media[id] = { kind: 'image', name: mm.name || id, dataUrl: mm.dataUrl, el };
          }
        }
      }
      const over = Object.assign({}, c, { media, demo });
      delete over.preset; delete over.fields; delete over.f; delete over.p;
      try {
        const shot = ENG.newShot(c.preset || 'sty-pencil', Object.assign(over, {
          f: c.fields || c.f || {},
          p: c.params || c.p || {},
        }));
        return shot;
      } catch (e) { return ENG.newShot('sty-pencil'); }
    });
    p.transitions = (p.transitions || []).map(tt => {
      if (tt && tt.preset && SK.presets.byId[tt.preset] && SK.presets.byId[tt.preset].kind === 'trans') return ENG.newTrans(tt.preset, tt);
      return ENG.normTrans(tt || {});
    });
    while (p.transitions.length > Math.max(0, p.shots.length - 1)) p.transitions.pop();
    while (p.transitions.length < Math.max(0, p.shots.length - 1)) p.transitions.push(ENG.newTrans('tr-cut'));
    p.width = +p.width || 1920; p.height = +p.height || 1080; p.fps = +p.fps || 30;
    p.lang = p.lang === 'en' ? 'en' : 'hi';
    p.name = p.name || 'नई प्रोजेक्ट';
    return Object.assign(ENG.defaultProject(), p, { shots: p.shots, transitions: p.transitions });
  }
  function load(data) {
    proj = normalizeLoaded(data);
    sel = proj.shots.length ? { kind: 'shot', i: 0 } : { kind: 'project' };
    t = 0; range = null; pause();
    undoStack.length = 0; redoStack.length = 0; pushHistory();
    applySize(); refreshAll();
  }

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
  let wasAnalysing = false, thumbsDirty = false;
  function loop(now) {
    const tl = ENG.timeline(proj), end = range ? range[1] : tl.total;
    if (playing) {
      t += Math.min(0.1, Math.max(0, (now - last) / 1000)); // never step backwards, never jump
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
      dirty = false;
    }
    // analysis progress note + thumb refresh when analyses settle
    const pr = ENG.progress();
    const note = $('procNote');
    if (pr.any) {
      note.hidden = false;
      note.innerHTML = `चित्र का विश्लेषण… <b>${Math.round(pr.pct * 100)}%</b> — रेखाएँ उतर रही हैं`;
      wasAnalysing = true; dirty = true;
    } else {
      note.hidden = true;
      if (wasAnalysing) { wasAnalysing = false; renderLibraryThumbs(); drawTimelineThumbs(); dirty = true; }
    }
    updatePlayhead();
    requestAnimationFrame(loop);
  }
  function markLive(tl) {
    const seg = ENG.segAt(tl, t);
    document.querySelectorAll('.timeline .live').forEach(e => e.classList.remove('live'));
    if (seg && seg.kind === 'shot') { const el = document.querySelector(`.clip[data-i="${seg.i}"]`); if (el) el.classList.add('live'); }
  }
  function audition(kind, i) {
    const tl = ENG.timeline(proj);
    if (kind === 'shot') { const w = ENG.clipWindow(tl, i); if (w[1] > w[0]) { range = w; play(w[0]); } }
    else { const seg = tl.segs.find(s => s.kind === 'trans' && s.i === i); if (seg) { range = [seg.t0, seg.t1]; play(seg.t0); } }
  }

  // ---------------- preset library ----------------
  const famRank = f => { const i = SK.presets.FAMS.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => SK.presets.list.slice().sort((a, b) => famRank(a.fam) - famRank(b.fam));
  const thumbCv = { w: 192, h: 108 };

  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try {
      if (pr.kind === 'trans') {
        const A = ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } });
        const B = ENG.newShot('sty-engraving', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } });
        if (pr.p.type === 'cut') {
          ENG.drawShot(g, p < 0.55 ? A : B, (p < 0.55 ? p : p - 0.55) * 1.8, W, H, proj);
        } else {
          const mini = { ...proj, shots: [A, B], transitions: [ENG.newTrans(pr.id)] };
          const tl = ENG.timeline(mini);
          const seg = tl.segs.find(x => x.kind === 'trans');
          const tt = seg ? seg.t0 + 0.04 + p * (seg.dur - 0.08) : tl.total - 1e-3;
          ENG.render(g, mini, Math.min(tt, tl.total - 1e-3), { W, H, tl });
        }
      } else if (pr.kind === 'paper') {
        const shot = ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } });
        shot.p = Object.assign(shot.p, pr.p);
        ENG.drawShot(g, shot, p * 1.6, W, H, proj);
      } else if (pr.kind === 'layer') {
        const shot = ENG.newShot('sty-pencil', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } });
        const ly = ENG.normLayer(Object.assign({}, pr.layer, { start: 0.15, dur: 2 }));
        shot.layers = [ly];
        ENG.drawShot(g, shot, p * 1.8, W, H, proj);
      } else {
        const shot = ENG.newShot(pr.id);
        ENG.drawShot(g, shot, p * shot.dur, W, H, proj);
      }
    } catch (e) { console.warn(pr.id, e); }
  }
  let thumbJobs = [];
  function renderLibrary() {
    const fams = ['All'].concat(SK.presets.FAMS.filter(f => SK.presets.list.some(p => p.fam === f)));
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
    thumbJobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard'; card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || '';
      const cv = document.createElement('canvas'); cv.width = thumbCv.w; cv.height = thumbCv.h;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const fam = document.createElement('span'); fam.className = 'fam'; fam.textContent = pr.fam;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new shot with this preset';
      card.append(cv, nm, fam, add); grid.appendChild(card);
      thumbJobs.push({ cv, pr });
      let raf = 0, t0 = 0;
      const anim = now => { const x = ((now - t0) / 1000) % (2.6); drawPresetThumb(cv, pr, U.clamp(x / 2.2)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.55); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addWithPreset(pr); };
    }
    renderLibraryThumbs();
    markCurrentPreset();
  }
  function renderLibraryThumbs() {
    const jobs = thumbJobs.slice();
    const run = () => {
      const s = performance.now();
      while (jobs.length && performance.now() - s < 10) { const j = jobs.shift(); drawPresetThumb(j.cv, j.pr, 0.55); }
      if (jobs.length) setTimeout(run, 0);
    };
    run();
  }
  function markCurrentPreset() {
    const cur = currentShot();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentShot() { return sel.kind === 'shot' && proj.shots[sel.i] ? proj.shots[sel.i] : null; }
  function currentTrans() { return sel.kind === 'trans' && proj.transitions[sel.i] ? proj.transitions[sel.i] : null; }

  function applyPreset(pr) {
    if (pr.kind === 'trans') {
      let i = sel.kind === 'trans' ? sel.i : (sel.kind === 'shot' ? Math.min(sel.i, proj.transitions.length - 1) : 0);
      if (i < 0 || i >= proj.transitions.length) { toast('Add another shot first — transitions sit between two shots'); return; }
      const old = proj.transitions[i];
      proj.transitions[i] = ENG.newTrans(pr.id, { seed: old && old.seed });
      sel = { kind: 'trans', i };
      changed(true); renderInspector();
      audition('trans', i);
      toast(`${pr.name} → transition ${i + 1}`);
      return;
    }
    if (pr.kind === 'paper') {
      const shot = currentShot();
      if (!shot) { toast('Select a shot first'); return; }
      Object.assign(shot.p, pr.p);
      changed(); renderInspector(); audition('shot', sel.i);
      toast(`${pr.name} paper → shot ${sel.i + 1}`);
      return;
    }
    if (pr.kind === 'layer') {
      const shot = currentShot();
      if (!shot) { toast('Select a shot first'); return; }
      const ly = ENG.normLayer(Object.assign({}, pr.layer, { start: Math.max(0.6, t - (ENG.clipWindow(ENG.timeline(proj), sel.i)[0] || 0)) }));
      shot.layers.push(ly);
      sel = { kind: 'layer', i: sel.i, li: shot.layers.length - 1 };
      changed(true); renderInspector(); renderLayers();
      toast(`${pr.name} added to shot ${sel.i + 1}`);
      return;
    }
    // shot preset
    if (sel.kind === 'shot' && proj.shots[sel.i]) {
      const shot = proj.shots[sel.i];
      const oldDur = shot.dur, oldMedia = shot.media, oldSeed = shot.seed, oldLayers = shot.layers.filter(l => !l.fromPreset);
      ENG.applyPreset(shot, pr.id, {});
      shot.dur = oldDur; shot.media = oldMedia; shot.seed = oldSeed; // keep the user's media + timing
      changed(true); renderInspector(); markCurrentPreset();
      audition('shot', sel.i);
      toast(`${pr.name} → shot ${sel.i + 1}`);
    } else addWithPreset(pr);
  }
  function addWithPreset(pr, at) {
    if (!pr || pr.kind !== 'shot') pr = SK.presets.byId['sty-pencil'];
    const i = at != null ? at : (sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length);
    let shot;
    try { shot = ENG.newShot(pr.id); } catch (e) { shot = ENG.newShot('sty-pencil'); }
    proj.shots.splice(i, 0, shot);
    while (proj.transitions.length < proj.shots.length - 1) proj.transitions.push(ENG.newTrans('tr-cut'));
    sel = { kind: 'shot', i };
    changed(true); renderInspector(); markCurrentPreset();
    audition('shot', i);
  }

  // ---------------- timeline ----------------
  function presetLabel(shot) {
    if (shot.preset && SK.presets.byId[shot.preset]) return SK.presets.byId[shot.preset].name;
    const el = SK.el.byId[shot.el];
    return el ? el.name : shot.el;
  }
  function trLabel(tr) {
    const p = SK.reveals.trById[tr.type];
    return p ? p.name : tr.type;
  }
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((c, i) => {
      const b = document.createElement('div'); b.className = 'clip' + (sel.kind === 'shot' && sel.i === i ? ' sel' : ''); b.dataset.i = i; b.tabIndex = 0;
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', `Shot ${i + 1}: ${presetLabel(c)}`);
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.max(60, Math.round(160 * proj.height / proj.width));
      const grip = document.createElement('div'); grip.className = 'grip'; grip.title = 'Drag to reorder';
      const meta = document.createElement('div'); meta.className = 'meta';
      b.append(cv, grip, meta);
      b.onclick = () => { sel = { kind: 'shot', i }; afterSelect(); audition('shot', i); };
      b.onkeydown = e => { if (e.key === 'Enter') b.click(); };
      // drag to reorder (desktop)
      b.draggable = true;
      b.ondragstart = e => { e.dataTransfer.setData('text/sk-shot', String(i)); b.classList.add('drag-src'); };
      b.ondragend = () => b.classList.remove('drag-src');
      b.ondragover = e => { e.preventDefault(); b.classList.add('drag-over'); };
      b.ondragleave = () => b.classList.remove('drag-over');
      b.ondrop = e => {
        e.preventDefault(); b.classList.remove('drag-over');
        const from = +e.dataTransfer.getData('text/sk-shot');
        if (isNaN(from) || from === i) return;
        moveShot(from, from < i ? i - 1 : i);
      };
      el.appendChild(b);
      // transition chip after the shot
      if (i < proj.shots.length - 1) {
        const tr = proj.transitions[i] || (proj.transitions[i] = ENG.newTrans('tr-cut'));
        const chip = document.createElement('div'); chip.className = 'trchip' + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''); chip.dataset.ti = i; chip.tabIndex = 0;
        chip.setAttribute('role', 'button');
        const dur = tr.type === 'cut' ? '' : ` · ${(+tr.dur || 0).toFixed(1)}s`;
        chip.innerHTML = `<span class="ic">⇄</span><b>${trLabel(tr)}</b><span>${dur}</span>`;
        chip.onclick = () => { sel = { kind: 'trans', i }; afterSelect(); audition('trans', i); };
        chip.onkeydown = e => { if (e.key === 'Enter') chip.click(); };
        el.appendChild(chip);
      }
    });
    const add = document.createElement('button'); add.className = 'tadd'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => addWithPreset(null);
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs(); renderLayers();
  }
  function moveShot(from, to) {
    if (to < 0 || to >= proj.shots.length || from === to) return;
    const [shot] = proj.shots.splice(from, 1);
    proj.shots.splice(to, 0, shot);
    const [tr] = proj.transitions.splice(from, 1); // transitions[from] sat between shot from and from+1
    proj.transitions.splice(to, 0, tr);
    sel = { kind: 'shot', i: to };
    changed(true); renderInspector();
    toast(`Shot moved to ${to + 1}`);
  }
  function updateTimelineLabels() {
    proj.shots.forEach((c, i) => {
      const b = document.querySelector(`.clip[data-i="${i}"] .meta`);
      if (b) b.innerHTML = `<b></b><span>${(+c.dur).toFixed(1)}s</span>`, b.querySelector('b').textContent = `${i + 1}. ${presetLabel(c)}`;
    });
    proj.transitions.forEach((tr, i) => {
      const chip = document.querySelector(`.trchip[data-ti="${i}"]`);
      if (chip) {
        const dur = tr.type === 'cut' ? '' : ` · ${(+tr.dur || 0).toFixed(1)}s`;
        chip.innerHTML = `<span class="ic">⇄</span><b>${trLabel(tr)}</b><span>${dur}</span>`;
        chip.classList.toggle('sel', sel.kind === 'trans' && sel.i === i);
      }
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((c, i) => {
      const cv = document.querySelector(`.clip[data-i="${i}"] canvas`); if (!cv) return;
      try {
        const g = cv.getContext('2d'), W = cv.width, H = cv.height;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        ENG.drawShot(g, c, c.dur * 0.8, W, H, proj);
      } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- layer bars ----------------
  function selectedShotForLayers() {
    if (sel.kind === 'shot' || sel.kind === 'layer' || sel.kind === 'trans') {
      const i = sel.kind === 'trans' ? Math.min(sel.i + 1, proj.shots.length - 1) : sel.i;
      if (proj.shots[i]) return [proj.shots[i], i];
    }
    return [null, -1];
  }
  function renderLayers() {
    const [shot, i] = selectedShotForLayers();
    const box = $('layersBox');
    if (!shot) { box.hidden = true; return; }
    box.hidden = false;
    $('layersShotNo').textContent = String(i + 1);
    const dur = Math.max(0.2, +shot.dur || 2);
    // ruler
    const ruler = $('layerRuler'); ruler.innerHTML = '';
    const step = dur <= 4 ? 1 : dur <= 9 ? 2 : 5;
    for (let s = 0; s <= dur + 1e-6; s += step) {
      const tick = document.createElement('div'); tick.className = 'tick'; tick.style.left = (s / dur * 100) + '%';
      tick.innerHTML = `<i>${s}s</i>`;
      ruler.appendChild(tick);
    }
    const ph = document.createElement('div'); ph.className = 'phead'; ruler.appendChild(ph);
    // rows
    const rows = $('layerRows'); rows.innerHTML = '';
    shot.layers.forEach((ly, li) => {
      const row = document.createElement('div'); row.className = 'lrow';
      const bar = document.createElement('div'); bar.className = 'bar' + (sel.kind === 'layer' && sel.li === li ? ' sel' : '');
      const tag = document.createElement('span'); tag.className = 'tag';
      const labelTxt = ly.kind === 'mark' ? (SK.ann.MARKS.find(m => m[0] === ly.mark) || ['', ly.mark])[1] : (ly.text || 'label');
      const txt = document.createElement('span'); txt.textContent = `${ly.kind === 'mark' ? '✏ ' : 'ऋ '}${labelTxt}`;
      txt.style.overflow = 'hidden';
      const hl = document.createElement('div'); hl.className = 'hnd l'; hl.textContent = '⋮'; hl.title = 'Drag to change the start';
      const hr = document.createElement('div'); hr.className = 'hnd r'; hr.textContent = '⋮'; hl.title = 'Drag to change how long it stays';
      const del = document.createElement('button'); del.className = 'del'; del.textContent = '✕'; del.title = 'Remove this layer';
      bar.append(tag, txt, hl, hr, del);
      bar.style.left = (ly.start / dur * 100) + '%';
      bar.style.width = (Math.min(ly.dur, dur - ly.start) / dur * 100) + '%';
      row.appendChild(bar);
      rows.appendChild(row);
      bar.onclick = e => { if (e.target === hl || e.target === hr || e.target === del) return; sel = { kind: 'layer', i, li }; renderInspector(); renderLayers(); };
      del.onclick = () => { shot.layers.splice(li, 1); sel = { kind: 'shot', i }; changed(true); renderInspector(); renderLayers(); };
      // drag move / resize (pointer events work with touch too)
      const drag = (e, mode) => {
        e.preventDefault(); e.stopPropagation();
        bar.setPointerCapture(e.pointerId);
        const x0 = e.clientX, s0 = ly.start, d0 = ly.dur;
        const wPx = row.getBoundingClientRect().width;
        const onMove = ev => {
          const dx = (ev.clientX - x0) / wPx * dur;
          if (mode === 'move') { ly.start = U.clamp(s0 + dx, 0, dur - 0.2); ly.dur = Math.max(0.2, d0); }
          else if (mode === 'l') { const ns = U.clamp(s0 + dx, 0, s0 + d0 - 0.2); ly.dur = d0 + (s0 - ns); ly.start = ns; }
          else { ly.dur = Math.max(0.2, d0 + dx); }
          bar.style.left = (ly.start / dur * 100) + '%';
          bar.style.width = (Math.min(ly.dur, dur - ly.start) / dur * 100) + '%';
          changed();
        };
        const onUp = () => { bar.removeEventListener('pointermove', onMove); bar.removeEventListener('pointerup', onUp); pushHistory(); renderInspector(); };
        bar.addEventListener('pointermove', onMove);
        bar.addEventListener('pointerup', onUp);
      };
      bar.addEventListener('pointerdown', e => { if (e.target === hl) drag(e, 'l'); else if (e.target === hr) drag(e, 'r'); else if (e.target !== del) drag(e, 'move'); });
    });
    if (!shot.layers.length) {
      const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No layers yet — add one from the Library (Annotations family) or the Edit panel.';
      rows.appendChild(p);
    }
  }
  function updatePlayhead() {
    const [shot, i] = selectedShotForLayers();
    const ph = document.querySelector('#layerRuler .phead');
    if (!shot || !ph) return;
    const w = ENG.clipWindow(ENG.timeline(proj), i);
    const local = U.clamp((t - w[0]) / Math.max(0.2, +shot.dur || 2), 0, 1);
    ph.style.left = (local * 100) + '%';
  }

  // ---------------- inspector ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function section(title, right) { const s = h('div', 'sec'), t3 = h('h3'); t3.append(title); if (right) t3.append(right); s.append(t3); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const fmtV = x => (+x).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + unit;
    const val = h('i', null, fmtV(v));
    i.oninput = () => { val.textContent = fmtV(i.value); on(+i.value); };
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) { const s = h('select'); for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); } s.value = v; s.onchange = () => on(s.value); return field(label, s); }
  function fText(label, v, on, area, ph) { const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; if (ph) i.placeholder = ph; i.value = v || ''; i.oninput = () => on(i.value); return field(label, i); }
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.shots.length && sel.kind !== 'trans') return projectInspector(box);
    if (sel.kind === 'trans' && proj.transitions[sel.i]) return transInspector(box, proj.transitions[sel.i], sel.i);
    if (sel.kind === 'layer') { const [shot, i] = selectedShotForLayers(); if (shot && shot.layers[sel.li]) return layerInspector(box, shot, i, shot.layers[sel.li], sel.li); }
    if (sel.kind === 'shot' && proj.shots[sel.i]) return shotInspector(box, proj.shots[sel.i], sel.i);
    if (proj.shots[0]) { sel = { kind: 'shot', i: 0 }; return shotInspector(box, proj.shots[0], 0); }
    projectInspector(box);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    sec.append(fSelect('Language (labels)', [['hi', 'हिन्दी'], ['en', 'English']], proj.lang || 'hi', v => { proj.lang = v; changed(); }));
    box.append(sec);
    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of shots. Each shot turns a photo (yours, or a built-in demo) into a hand drawing that draws itself on, then reveals the real photo. Transitions sit between shots; labels and marks are layers with their own timing. Pick a preset, drop a photo on the stage, then Export — always silent.'));
    box.append(help);
  }

  function mediaInspector(sec, shot) {
    // MEDIA card
    const mSec = section('Media');
    const userOpts = Object.entries(SK.media).filter(([, m]) => !m.demo).map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]);
    const demoOpts = SK.media.demoList.map(([k, n]) => ['demo:' + k, n]);
    const opts = [['', '— none —']].concat(demoOpts, userOpts);
    const cur = shot.media || (shot.demo ? 'demo:' + shot.demo : '');
    mSec.append(fSelect('Photo / clip', opts, cur, v => {
      if (!v) { shot.media = null; shot.demo = null; }
      else if (v.startsWith('demo:')) { shot.media = v; shot.demo = v.slice('demo:'.length); }
      else shot.media = v;
      changed(true); drawTimelineThumbs(); renderInspector();
    }));
    mSec.append(btn('＋ Add your photo / video…', async () => {
      const fs = await pickFiles();
      if (fs[0]) { shot.media = addMedia(fs[0]); changed(true); drawTimelineThumbs(); renderInspector(); toast('Added ' + fs[0].name); }
    }));
    if (shot.media && !String(shot.media).startsWith('demo:') && SK.media[shot.media] && SK.media[shot.media].missing) {
      mSec.append(h('p', 'desc', 'This file is not stored in the project — add it again to re-link.'));
    }
    const m = ENG.resolveMedia(shot);
    if (m && m.kind === 'video') {
      mSec.append(fRange('Clip starts at (s)', shot.p.videoStart || 0, 0, 120, 0.1, v => { shot.p.videoStart = v; changed(); }));
      mSec.append(fCheck('Loop the clip', shot.p.videoLoop !== false, v => { shot.p.videoLoop = v; changed(); }));
    }
    if (shot.el === 'roto') mSec.append(h('p', 'desc', 'For rotoscope, drop a short video clip (a few seconds works best).'));
    return mSec;
  }

  function shotInspector(box, shot, i) {
    const el = SK.el.byId[shot.el];
    if (!el) { box.append(h('p', 'desc', `Element "${shot.el}" is not available in this build.`)); return; }
    const F = ENG.fieldsOf(shot), P = ENG.paramsOf(shot);
    const set = (key, v, re) => { shot.p[key] = v; changed(); if (!re) drawTimelineThumbsSoon(); else { renderInspector(); drawTimelineThumbsSoon(); } };
    const drawTh = () => drawTimelineThumbsSoon();

    // SHOT header card
    const head = section(`Shot ${i + 1} · ${el.name}`, btn('✕', () => { proj.shots.splice(i, 1); if (proj.transitions.length > proj.shots.length - 1) proj.transitions.splice(Math.min(i, proj.transitions.length - 1), 1); sel = proj.shots.length ? { kind: 'shot', i: Math.max(0, i - 1) } : { kind: 'project' }; changed(true); renderInspector(); }, 'btn sm danger'));
    head.append(h('p', 'desc', el.desc || ''));
    head.append(fRange('On screen for (s)', shot.dur, 0.5, 20, 0.1, v => { shot.dur = v; changed(); renderLayers(); }, 's'));
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = shot.seed || 7; seedIn.style.width = '90px'; seedIn.oninput = () => { shot.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Detail seed'), seedIn, btn('🎲 New detail', () => { shot.seed = (shot.seed || 7) + 1 + Math.floor(Math.random() * 50); seedIn.value = shot.seed; changed(); drawTh(); }));
    head.append(seedRow);
    head.append(btn('▶ Play this shot', () => audition('shot', i), 'btn sm'));
    box.append(head);

    // fields (element text fields)
    if (el.fields.length) {
      const fSec = section('Text');
      for (const f of el.fields) fSec.append(fText(f.label, F[f.k], v => { shot.f[f.k] = v; changed(); drawTh(); }, f.multi, f.ph));
      box.append(fSec);
    }

    // MEDIA
    box.append(mediaInspector(section('Media'), shot));

    // params grouped by card
    const cards = {};
    for (const pd of el.params) {
      const cn = pd.card || 'STYLE';
      (cards[cn] = cards[cn] || []).push(pd);
    }
    const order = ['STYLE', 'ANIMATION', 'PAPER', 'PHOTO', 'LABELS'];
    for (const cn of order) {
      if (!cards[cn]) continue;
      const sec = section(cn === 'STYLE' ? 'Drawing style' : cn === 'ANIMATION' ? 'Animation & reveal' : cn === 'PAPER' ? 'Paper & medium' : cn === 'PHOTO' ? 'Photo treatment' : 'Name line');
      for (const pd of cards[cn]) {
        const v = P[pd.k];
        if (pd.type === 'range') sec.append(fRange(pd.label, v, pd.min, pd.max, pd.step, x => set(pd.k, x)));
        else if (pd.type === 'select') sec.append(fSelect(pd.label, pd.options, String(v), x => set(pd.k, x, true)));
        else if (pd.type === 'check') sec.append(fCheck(pd.label, v, x => set(pd.k, x)));
        else if (pd.type === 'color') sec.append(fColor(pd.label, v, x => set(pd.k, x)));
      }
      box.append(sec);
    }

    // LAYERS
    const lSec = section('Layers (labels & marks)', h('span', 'row gap', ''));
    const addRow = h('div', 'row gap wrap');
    addRow.append(
      btn('＋ Ink label', () => { shot.layers.push(ENG.normLayer({ kind: 'label', text: 'नया लेबल', start: 1, dur: 2 })); sel = { kind: 'shot', i }; changed(true); renderLayers(); renderInspector(); }),
      btn('＋ Circle', () => { shot.layers.push(ENG.normLayer({ kind: 'mark', mark: 'circle', start: 1, dur: 1 })); changed(true); renderLayers(); renderInspector(); }),
      btn('＋ Arrow', () => { shot.layers.push(ENG.normLayer({ kind: 'mark', mark: 'arrow', start: 1, dur: 1 })); changed(true); renderLayers(); renderInspector(); }),
    );
    lSec.append(addRow);
    shot.layers.forEach((ly, li) => {
      const l = h('label', 'fld');
      const nm = ly.kind === 'mark' ? `✏ ${ly.mark}` : `ऋ ${(ly.text || '').slice(0, 14)}`;
      l.append(h('span', null, `${li + 1}. ${nm} · ${(+ly.start).toFixed(1)}s +${(+ly.dur).toFixed(1)}s`));
      const row = h('div', 'row gap wrap');
      row.append(
        btn('Edit', () => { sel = { kind: 'layer', i, li }; renderInspector(); renderLayers(); }, 'btn sm'),
        btn('✕', () => { shot.layers.splice(li, 1); changed(true); renderLayers(); renderInspector(); }, 'btn sm danger'),
      );
      l.append(row);
      lSec.append(l);
    });
    box.append(lSec);

    // actions
    const act = section('Shot');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { const cp = JSON.parse(JSON.stringify(shot)); cp.id = U.uid(); proj.shots.splice(i + 1, 0, cp); while (proj.transitions.length < proj.shots.length - 1) proj.transitions.push(ENG.newTrans('tr-cut')); sel = { kind: 'shot', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) moveShot(i, i - 1); }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) moveShot(i, i + 1); }),
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
  let drawThT = 0;
  function drawTimelineThumbsSoon() { clearTimeout(drawThT); drawThT = setTimeout(drawTimelineThumbs, 350); }

  function transInspector(box, tr, i) {
    const sec = section(`Transition ${i + 1}`, null);
    sec.append(h('p', 'desc', (SK.reveals.trById[tr.type] || {}).note || ''));
    const trOpts = SK.reveals.TR.map(t => [t.id, t.name]);
    sec.append(fSelect('Type', trOpts, tr.type, v => { tr.type = v; tr.dur = (SK.reveals.trById[v] || {}).dur || 0.9; changed(true); renderInspector(); }));
    sec.append(fRange('Time (s)', tr.dur, 0, 3, 0.1, v => { tr.dur = v; changed(); }, 's'));
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = tr.seed || 5; seedIn.style.width = '90px'; seedIn.oninput = () => { tr.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Wobble seed'), seedIn);
    sec.append(seedRow);
    sec.append(btn('▶ Play this transition', () => audition('trans', i), 'btn sm'));
    box.append(sec);
    const note = section('How transitions work');
    note.append(h('p', 'desc', 'A transition sits between two shots and eats into the start of the next one — the new drawing is already coming on under the effect, so the shots flow into each other.'));
    box.append(note);
  }

  function layerInspector(box, shot, i, ly, li) {
    const sec = section(`Layer ${li + 1} on shot ${i + 1}`, btn('✕', () => { shot.layers.splice(li, 1); sel = { kind: 'shot', i }; changed(true); renderLayers(); renderInspector(); }, 'btn sm danger'));
    if (ly.kind === 'mark') {
      sec.append(fSelect('Mark', SK.ann.MARKS, ly.mark, v => { ly.mark = v; changed(true); renderLayers(); }));
    } else {
      sec.append(fText('Text (Hindi works)', ly.text, v => { ly.text = v; changed(); renderLayers(); }));
      sec.append(fSelect('Font', T.FONT_OPTIONS, ly.font || 'kalam', v => { ly.font = v; changed(); }));
      sec.append(fCheck('Underline', !!ly.underline, v => { ly.underline = v; changed(); }));
    }
    sec.append(fColor('Colour', ly.color || '#c8372d', v => { ly.color = v; changed(); }));
    const two = h('div', 'two');
    two.append(fRange('Position X', ly.x, 0, 1, 0.01, v => { ly.x = v; changed(); }), fRange('Position Y', ly.y, 0, 1, 0.01, v => { ly.y = v; changed(); }));
    sec.append(two);
    sec.append(fRange('Size', ly.size || 52, 14, 220, 1, v => { ly.size = v; changed(); }));
    if (ly.kind === 'mark') {
      const two2 = h('div', 'two');
      two2.append(fRange('Rotation', ly.rot || 0, -3.14, 3.14, 0.05, v => { ly.rot = v; changed(); }));
      sec.append(two2);
    }
    if (ly.kind === 'label' && ly.leader) {
      const twoL = h('div', 'two');
      twoL.append(fRange('Leader → X', ly.leader[0], 0, 1, 0.01, v => { ly.leader[0] = v; changed(); }), fRange('Leader → Y', ly.leader[1], 0, 1, 0.01, v => { ly.leader[1] = v; changed(); }));
      sec.append(twoL);
      sec.append(btn('Remove leader line', () => { delete ly.leader; changed(true); renderInspector(); }));
    } else if (ly.kind === 'label') {
      sec.append(btn('Add leader line (points at something)', () => { ly.leader = [0.55, 0.45]; changed(true); renderInspector(); }));
    }
    const twoT = h('div', 'two');
    twoT.append(fRange('Starts at (s)', ly.start, 0, 20, 0.1, v => { ly.start = v; changed(); renderLayers(); }, 's'));
    twoT.append(fRange('Stays for (s)', ly.dur, 0.2, 10, 0.1, v => { ly.dur = v; changed(); renderLayers(); }, 's'));
    sec.append(twoT);
    sec.append(fCheck('Visible', ly.on !== false, v => { ly.on = v; changed(); }));
    box.append(sec);
    const back = section('Back to');
    back.append(btn('← Shot ' + (i + 1), () => { sel = { kind: 'shot', i }; renderInspector(); renderLayers(); }));
    box.append(back);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of SK.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    tl.segs.forEach(s => {
      const o = h('option');
      if (s.kind === 'shot') o.textContent = `Only shot ${s.i + 1}: ${presetLabel(proj.shots[s.i])}`;
      else o.textContent = `Transition ${s.i + 1}: ${trLabel(proj.transitions[s.i])}`;
      o.value = (s.kind === 'shot' ? 's' : 't') + s.i;
      rg.append(o);
    });
    const oc = h('option', null, 'Custom in–out (seconds)'); oc.value = 'custom'; rg.append(oc);
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.shot != null ? 's' + pre.shot : 'all';
    const hint = () => {
      const m = mode.value;
      $('exHint').textContent = {
        composite: 'Paper + drawing + photo as one MP4 (H.264). Always silent.',
        green: 'Only the drawing (no paper) on pure #00FF00 — drop over your footage with Chroma key. Pick one shot as the range.',
        blue: 'Same as green screen but on #0000FF, for shots that contain green.',
        alpha: 'The drawing with real transparency (WebM VP9 alpha) — works in Premiere, DaVinci and browsers. CapCut: prefer green screen.',
        matte: 'White = drawing, black = empty. Use as a track matte / luma mask.',
      }[m];
      if (m !== 'composite' && (rg.value === 'all' || rg.value === 'custom') && rg.options.length > 2) rg.value = rg.options[1].value;
    };
    mode.onchange = hint; rg.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    const seg = tl.segs.find(s => (s.kind === 'shot' ? 's' : 't') + s.i === r);
    if (seg) { o.from = seg.t0; o.to = seg.t1; }
    else if (r === 'custom') {
      const a = parseFloat(prompt('Custom start (seconds)', '0')), b = parseFloat(prompt('Custom end (seconds)', tl.total.toFixed(1)));
      if (isNaN(a) || isNaN(b)) return;
      o.from = Math.max(0, a); o.to = Math.min(tl.total, b);
      if (o.to <= o.from) return;
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await SK.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        SK.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of SK.templates.LIST) {
      const b = h('button', 'tpl'); b.type = 'button';
      b.append(h('b', null, tp.name), h('span', null, tp.note));
      b.onclick = () => { load(tp.make()); $('dlgTemplates').close(); toast(`Started: ${tp.name}`); };
      g.append(b);
    }
    $('dlgTemplates').showModal();
  }
  function openDemoPicker() {
    const g = $('pickGrid'); g.innerHTML = '';
    $('pickTitle').textContent = 'Add a demo shot';
    for (const [k, n] of SK.media.demoList) {
      const b = h('button', 'tpl'); b.type = 'button';
      b.append(h('b', null, n), h('span', null, 'built-in, drawn procedurally'));
      b.onclick = () => {
        $('dlgPick').close();
        const i = sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
        const shot = ENG.newShot('sty-pencil', { demo: k });
        proj.shots.splice(i, 0, shot);
        while (proj.transitions.length < proj.shots.length - 1) proj.transitions.push(ENG.newTrans('tr-cut'));
        sel = { kind: 'shot', i };
        changed(true); renderInspector(); audition('shot', i);
      };
      g.append(b);
    }
    $('dlgPick').showModal();
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
    $('btnGuides').onclick = () => {
      let gd = document.getElementById('guideOverlay');
      if (!gd) {
        gd = document.createElement('div'); gd.id = 'guideOverlay';
        gd.style.cssText = 'position:absolute;inset:14px;pointer-events:none;display:none;z-index:2';
        gd.innerHTML = `<div style="position:absolute;inset:5%;border:1px dashed rgba(229,169,60,.55)"></div>
          <div style="position:absolute;left:33.3%;top:0;bottom:0;width:1px;background:rgba(229,169,60,.28)"></div>
          <div style="position:absolute;left:66.6%;top:0;bottom:0;width:1px;background:rgba(229,169,60,.28)"></div>
          <div style="position:absolute;top:33.3%;left:0;right:0;height:1px;background:rgba(229,169,60,.28)"></div>
          <div style="position:absolute;top:66.6%;left:0;right:0;height:1px;background:rgba(229,169,60,.28)"></div>`;
        $('stageWrap').appendChild(gd);
      }
      const on = gd.style.display !== 'block';
      gd.style.display = on ? 'block' : 'none';
      $('btnGuides').classList.toggle('on', on);
      $('btnGuides').style.borderColor = on ? 'var(--accent)' : '';
      $('btnGuides').style.color = on ? 'var(--accent)' : '';
    };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { SK.exporter.download(new Blob([serialise(true)], { type: 'application/json' }), (proj.name || 'sketch-project').replace(/[\\/:*?"<>|]+/g, '') + '.sketch.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddPhoto').onclick = async () => {
      const fs = await pickFiles();
      if (!fs.length) return;
      let at = sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
      for (const f of fs) {
        const shot = ENG.newShot('sty-pencil', {});
        shot.media = addMedia(f);
        proj.shots.splice(at, 0, shot);
        while (proj.transitions.length < proj.shots.length - 1) proj.transitions.push(ENG.newTrans('tr-cut'));
        sel = { kind: 'shot', i: at }; at++;
      }
      changed(true); renderInspector(); audition('shot', sel.i);
    };
    $('btnAddDemo').onclick = openDemoPicker;
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        const shot = ENG.newShot('sty-pencil', {});
        shot.media = addMedia(f);
        const at = sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
        proj.shots.splice(at, 0, shot);
        while (proj.transitions.length < proj.shots.length - 1) proj.transitions.push(ENG.newTrans('tr-cut'));
        sel = { kind: 'shot', i: at };
        changed(true); renderInspector();
        toast('Shot added: ' + f.name);
        audition('shot', at);
        return;
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { range = null; t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.SKS = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(SK.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      // wait for any pending analyses so the first frames are complete
      const t0 = Date.now();
      while (ENG.progress().any && Date.now() - t0 < 30000) await new Promise(r => setTimeout(r, 120));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(tSec, mode = 'composite', quality = 0.92) {
      const c = window.__sksCanvas || (window.__sksCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, tSec);
      ENG.render(g, proj, tSec, { W: proj.width, H: proj.height, mode });
      if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      // always lossless PNG: render.mjs pipes PNG frames, and element modes must keep
      // #00FF00 exactly / alpha exactly (no JPEG anywhere in the pipeline)
      return c.toDataURL('image/png');
    },
    // contact sheet of presets at several progress points (QA). Async: waits for each
    // preset's photo analysis so rows are never half-analysed.
    async sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 480, H = 270, show = true) {
      const pres = (ids || SK.presets.list.map(p => p.id)).map(id => SK.presets.byId[id]).filter(p => p);
      // warm every analysis the presets need (mini-projects per kind), then wait
      const warm = [];
      for (const pr of pres) {
        try {
          if (pr.kind === 'trans') {
            warm.push(ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } }));
            warm.push(ENG.newShot('sty-engraving', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } }));
          } else if (pr.kind === 'paper') {
            warm.push(ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } }));
          } else if (pr.kind === 'layer') {
            warm.push(ENG.newShot('sty-pencil', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } }));
          } else {
            warm.push(ENG.newShot(pr.id));
          }
        } catch (e) {}
      }
      const t0 = performance.now();
      const tc = U.canvas(W, H), tg = tc.getContext('2d');
      for (const shot of warm) { try { ENG.drawShot(tg, shot, 0.01, W, H, proj); } catch (e) {} } // start analyses
      const wait = async () => {
        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
          const pr = ENG.progress();
          if (!pr.any) return true;
          await new Promise(r => setTimeout(r, 120));
        }
        return false;
      };
      await wait();
      const c = document.getElementById('sksSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'sksSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d');
      const errs = [];
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try {
          if (pr.kind === 'trans') {
            const A = ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } });
            const B = ENG.newShot('sty-engraving', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2, vignette: 0.2 } });
            if (pr.p.type === 'cut') {
              ENG.drawShot(tg, p < 0.55 ? A : B, (p < 0.55 ? p : p - 0.55) * 1.8, W, H, proj);
            } else {
              const mini = { ...proj, shots: [A, B], transitions: [ENG.newTrans(pr.id)] };
              const tl = ENG.timeline(mini);
              const seg2 = tl.segs.find(x => x.kind === 'trans');
              const tt2 = seg2 ? seg2.t0 + 0.04 + p * (seg2.dur - 0.08) : tl.total - 1e-3;
              ENG.render(tg, mini, Math.min(tt2, tl.total - 1e-3), { W, H, tl });
            }
          } else if (pr.kind === 'paper') {
            const shot = ENG.newShot('sty-pencil', { demo: 'portrait', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } });
            shot.p = Object.assign(shot.p, pr.p);
            ENG.drawShot(tg, shot, p * 1.6, W, H, proj);
          } else if (pr.kind === 'layer') {
            const shot = ENG.newShot('sty-pencil', { demo: 'scene', dur: 2, p: { photoReveal: 'none', drawDur: 1.2 } });
            shot.layers = [ENG.normLayer(Object.assign({}, pr.layer, { start: 0.15, dur: 2 }))];
            ENG.drawShot(tg, shot, p * 1.8, W, H, proj);
          } else {
            const shot = ENG.newShot(pr.id);
            ENG.drawShot(tg, shot, p * shot.dur, W, H, proj);
          }
        } catch (e) { errs.push(pr.id + ': ' + e.message); }
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
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.defaultProject(); applySize(); undoStack.length = 0; pushHistory(); }
  wire(); refreshAll();
  requestAnimationFrame(loop);
  T.ready().then(() => { dirty = true; renderLibraryThumbs(); drawTimelineThumbs(); });

  window.__MAS_BRIDGE_STATE = {
    id: 'sketch-reveal-studio',
    engine: ENG,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { range = null; t = U.clamp(+v || 0, 0, ENG.timeline(proj).total); dirty = true; },
    isPlaying: () => playing,
    play: () => play(),
    pause: () => pause(),
    getDuration: () => ENG.timeline(proj).total,
    selectLayer: idx => { if (proj.shots[idx]) { sel = { kind: 'shot', i: idx }; refreshAll(); } },
    addLayer: (id) => { const pr = SK.presets.byId[id] || SK.presets.list[0]; addWithPreset(pr); },
    getAddableTypes: () => SK.presets.list.slice(0, 24).map(p => ({ id: p.id, name: p.name, desc: p.fam, group: p.fam, icon: '✎' })),
    getMediaList: () => Object.entries(SK.media || {}).map(([id, m]) => ({ id, name: m.name || id, kind: m.kind || 'image', src: m.dataUrl || m.url || '' })),
    uploadMedia: async files => { for (const f of files) addMedia(f); changed(true); refreshAll(); },
    useMedia: (id) => { const s = currentShot(); if (s) { s.media = id; changed(true); refreshAll(); } },
    changed: (full) => { changed(Boolean(full)); if (full) refreshAll(); },
  };

})();
