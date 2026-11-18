// Studio UI: preset library, live preview, timeline, inspector, save/open, export.
(() => {
  const U = KT.util, ENG = KT.engine, T = KT.text, $ = id => document.getElementById(id);
  const STORE = 'kinetic-title-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'clip', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null; // [a, b] preview window while auditioning one clip
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
    KT.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (KT.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; }; el.src = m.dataUrl || m.url;
        KT.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        // pipeline renders pass clips as file URLs (render.mjs: media.<id>.path)
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; });
        v.addEventListener('seeked', () => { dirty = true; });
        KT.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else KT.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    const bg = proj.bg || {};
    const id = bg.type === 'media' && bg.media, m = id && KT.media[id];
    if (m) {
      media[id] = { kind: m.kind, name: m.name };
      if (withMedia === 'all' || (withMedia && m.dataUrl && m.dataUrl.length < 3.5e6)) media[id].dataUrl = m.dataUrl;
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.clips)) throw new Error('Not a Kinetic Title Studio project');
    restoreMedia(p.media); delete p.media;
    // pipeline shorthand: a clip can be just {preset, f, p, dur} or {el, ...}
    p.clips = (p.clips || []).map(c => {
      if (c.el && KT.el.byId[c.el]) return Object.assign(ENG.newClip(c.preset || defaultPresetFor(c.el)), { preset: c.preset || null, f: c.f || {}, p: c.p || {}, dur: c.dur, x: c.x, y: c.y, seed: c.seed, id: c.id }, {});
      if (c.preset && KT.presets.byId[c.preset]) return ENG.newClip(c.preset, c);
      return ENG.newClip('kt-word-rise');
    });
    proj = Object.assign(ENG.defaultProject(), p);
    if (!proj.bg) proj.bg = { type: 'demo', color: '#101014', media: null, fit: 'cover', zoom: 0, start: 0, loop: true };
    sel = proj.clips.length ? { kind: 'clip', i: 0 } : { kind: 'project' };
    t = 0; range = null; pause();
    applySize(); refreshAll();
  }
  function defaultPresetFor(elId) {
    const pr = KT.presets.list.find(p => p.el === elId);
    return pr ? pr.id : 'kt-word-rise';
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
      t += Math.min(0.1, (now - last) / 1000);
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
  const famRank = f => { const i = KT.presets.FAMS.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => KT.presets.list.slice().sort((a, b) => famRank(a.fam) - famRank(b.fam));
  const thumbProj = { bg: { type: 'demo' } };
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    let clip;
    try { clip = ENG.newClip(pr.id); } catch (e) { return; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try {
      g.drawImage(ENG.backdrop(W, H), 0, 0);
      ENG.drawClip(g, clip, p * clip.dur, W, H, 'hi');
    } catch (e) { console.warn(pr.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat(KT.presets.FAMS.filter(f => KT.presets.list.some(p => p.fam === f)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || p.fam === family) && (!ql || (p.name + ' ' + p.id + ' ' + p.fam + ' ' + (p.note || '')).toLowerCase().includes(ql)));
    const cur = currentClip();
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard' + (cur && cur.preset === pr.id ? ' cur' : ''); card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || '';
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const fam = document.createElement('span'); fam.className = 'fam'; fam.textContent = pr.fam;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new clip with this preset';
      card.append(cv, nm, fam, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.5));
      let raf = 0, t0 = 0;
      const anim = now => { const d = pr.dur + 0.5, x = ((now - t0) / 1000) % d; drawPresetThumb(cv, pr, U.clamp(x / pr.dur)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.5); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addClipWith(pr); };
    }
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  function markCurrentPreset() {
    const cur = currentClip();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentClip() { return sel.kind === 'clip' && proj.clips[sel.i] ? proj.clips[sel.i] : null; }
  function applyPreset(pr) {
    if (sel.kind !== 'clip' || !proj.clips[sel.i]) return addClipWith(pr);
    const clip = proj.clips[sel.i];
    const oldDur = clip.dur;
    ENG.applyPreset(clip, pr.id, { f: {}, dur: false, pos: false });
    clip.dur = oldDur; // auditioning looks keeps the user's timing
    changed(true); renderInspector(); markCurrentPreset();
    audition(sel.i);
    toast(`${pr.name} → clip ${sel.i + 1}`);
  }
  function addClipWith(pr, at) {
    const i = at != null ? at : (sel.kind === 'clip' ? Math.min(proj.clips.length, sel.i + 1) : proj.clips.length);
    const clip = ENG.newClip(pr ? pr.id : 'kt-word-rise');
    proj.clips.splice(i, 0, clip);
    sel = { kind: 'clip', i };
    changed(true); renderInspector(); markCurrentPreset();
    audition(i);
  }

  // ---------------- timeline ----------------
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.clips.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'clip' + (sel.kind === 'clip' && sel.i === i ? ' sel' : ''); b.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      b.append(cv, meta);
      b.onclick = () => { sel = { kind: 'clip', i }; afterSelect(); audition(i); };
      el.appendChild(b);
    });
    const add = document.createElement('button'); add.className = 'tadd'; add.innerHTML = '<span class="ic">＋</span>Add clip';
    add.onclick = () => addClipWith(null);
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs();
  }
  function presetLabel(clip) {
    if (clip.preset && KT.presets.byId[clip.preset]) return KT.presets.byId[clip.preset].name;
    const el = KT.el.byId[clip.el];
    return el ? el.name : clip.el;
  }
  function updateTimelineLabels() {
    proj.clips.forEach((c, i) => {
      const b = document.querySelector(`.clip[data-i="${i}"] .meta`);
      if (b) b.innerHTML = `<b></b><span>${(+c.dur).toFixed(1)}s</span>`, b.querySelector('b').textContent = `${i + 1}. ${presetLabel(c)}`;
    });
  }
  function drawTimelineThumbs() {
    proj.clips.forEach((c, i) => {
      const cv = document.querySelector(`.clip[data-i="${i}"] canvas`); if (!cv) return;
      try {
        const g = cv.getContext('2d'), W = cv.width, H = cv.height;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        const bg = proj.bg || {};
        if (bg.type === 'demo') g.drawImage(ENG.backdrop(W, H), 0, 0);
        else if (bg.type === 'color') { g.fillStyle = bg.color || '#101014'; g.fillRect(0, 0, W, H); }
        else if (bg.type === 'media' && KT.media[bg.media] && KT.media[bg.media].el && !KT.media[bg.media].missing) ENG.drawMedia(g, KT.media[bg.media], W, H, bg, 0.5, 1);
        else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
        ENG.drawClip(g, c, c.dur * 0.55, W, H, proj.lang);
      } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

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
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.clips.length && sel.kind !== 'clip') return projectInspector(box);
    if (sel.kind === 'clip' && !proj.clips[sel.i]) { sel = { kind: 'project' }; return projectInspector(box); }
    if (sel.kind === 'project') return projectInspector(box);
    clipInspector(box, proj.clips[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    sec.append(fSelect('Language (labels)', [['hi', 'हिन्दी'], ['en', 'English']], proj.lang || 'hi', v => { proj.lang = v; changed(); }));
    box.append(sec);

    const bg = proj.bg || (proj.bg = { type: 'demo', color: '#101014', media: null, fit: 'cover', zoom: 0, start: 0, loop: true });
    const bgSec = section('Background');
    const up = (k, v, re) => { bg[k] = v; changed(); if (re) { renderInspector(); drawTimelineThumbs(); } };
    bgSec.append(fSelect('Shows', [['none', 'Black'], ['color', 'Colour'], ['demo', 'Demo backdrop (city dusk)'], ['media', 'Photo / video (your footage)']], bg.type || 'none', v => { up('type', v, true); }));
    if (bg.type === 'color') bgSec.append(fColor('Colour', bg.color || '#101014', v => up('color', v)));
    if (bg.type === 'media') {
      const opts = [['', '— choose —']].concat(Object.entries(KT.media).filter(([, m]) => m.kind === 'image' || m.kind === 'video').map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
      bgSec.append(fSelect('File', opts, bg.media || '', v => { up('media', v || null); drawTimelineThumbs(); }));
      bgSec.append(btn('＋ Add photo / video file…', async () => { const fs = await pickFiles(); if (fs[0]) { bg.media = addMedia(fs[0]); changed(); renderInspector(); drawTimelineThumbs(); } }));
      if (bg.media && KT.media[bg.media] && KT.media[bg.media].missing) bgSec.append(h('p', 'desc', 'This file is not stored in the project. Add it again to re-link.'));
      bgSec.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture']], bg.fit || 'cover', v => up('fit', v)));
      bgSec.append(fRange('Slow zoom (Ken Burns)', bg.zoom || 0, 0, 0.3, 0.01, v => up('zoom', v)));
      const two = h('div', 'two');
      two.append(fRange('Focus X', bg.fx == null ? 0.5 : bg.fx, 0, 1, 0.01, v => up('fx', v)), fRange('Focus Y', bg.fy == null ? 0.5 : bg.fy, 0, 1, 0.01, v => up('fy', v)));
      bgSec.append(two);
      if ((KT.media[bg.media] || {}).kind === 'video') {
        bgSec.append(fRange('Start at (s)', bg.start || 0, 0, 120, 0.1, v => up('start', v)));
        bgSec.append(fCheck('Loop the clip', bg.loop !== false, v => up('loop', v)));
      }
    }
    box.append(bgSec);

    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of clips, each one animated text (titles, lower thirds, call-outs, quotes, numbers, highlights, match cuts, social cards, captions). Pick a preset in the library, edit the text and settings here, then Export: the full video, or one clip as a green-screen / transparent element for your editor. Exports are always silent.'));
    box.append(help);
  }

  function clipInspector(box, c, i) {
    const el = KT.el.byId[c.el];
    if (!el) { box.append(h('p', 'desc', `Element "${c.el}" is not available in this build.`)); return; }
    const F = ENG.fieldsOf(c), P = ENG.paramsOf(c);

    const txt = section(`${i + 1}. ${el.name}`, btn('✕', () => { proj.clips.splice(i, 1); sel = { kind: 'clip', i: Math.max(0, i - 1) }; if (!proj.clips.length) sel = { kind: 'project' }; changed(true); renderInspector(); }, 'btn sm danger'));
    for (const f of el.fields) txt.append(fText(f.label, F[f.k], v => { c.f[f.k] = v; changed(); drawTimelineThumbs(); }, f.multi));
    box.append(txt);

    const set = (key, v, re) => { c.p[key] = v; changed(); drawTimelineThumbs(); if (re) renderInspector(); };
    const look = section('Look', btn('↺ Reset tweaks', () => { c.p = {}; changed(); renderInspector(); }));
    for (const pd of el.params) {
      const v = P[pd.k];
      if (pd.type === 'range') look.append(fRange(pd.label, v, pd.min, pd.max, pd.step, x => set(pd.k, x)));
      else if (pd.type === 'select') look.append(fSelect(pd.label, pd.options, String(v), x => set(pd.k, x, true)));
      else if (pd.type === 'check') look.append(fCheck(pd.label, v, x => set(pd.k, x)));
      else if (pd.type === 'color') look.append(fColor(pd.label, v, x => set(pd.k, x)));
    }
    box.append(look);

    const tim = section('Timing & place');
    tim.append(fRange('On screen for (s)', c.dur, 0.5, 15, 0.1, v => { c.dur = v; changed(); }, 's'));
    const two = h('div', 'two');
    two.append(fRange('Anchor X', c.x == null ? 0.5 : c.x, 0, 1, 0.01, v => { c.x = v; changed(); }), fRange('Anchor Y', c.y == null ? 0.5 : c.y, 0, 1, 0.01, v => { c.y = v; changed(); }));
    tim.append(two);
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = c.seed || 7; seedIn.style.width = '90px'; seedIn.oninput = () => { c.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Detail seed'), seedIn, btn('🎲 New detail', () => { c.seed = Math.floor(Math.random() * 9999) + 1; seedIn.value = c.seed; changed(); }));
    tim.append(seedRow);
    tim.append(btn('▶ Play this clip', () => audition(i), 'btn sm'));
    box.append(tim);

    const act = section('Clip');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { const cp = JSON.parse(JSON.stringify(c)); cp.id = U.uid(); proj.clips.splice(i + 1, 0, cp); sel = { kind: 'clip', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) { [proj.clips[i - 1], proj.clips[i]] = [proj.clips[i], proj.clips[i - 1]]; sel.i = i - 1; changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.clips.length - 1) { [proj.clips[i + 1], proj.clips[i]] = [proj.clips[i], proj.clips[i + 1]]; sel.i = i + 1; changed(true); renderInspector(); } }),
    );
    act.append(row); box.append(act);
    const ex = section('Use it');
    const row2 = h('div', 'row gap wrap');
    row2.append(
      btn('Export green-screen element', () => openExport({ mode: 'green', clip: i }), 'btn sm'),
      btn('Export transparent WebM', () => openExport({ mode: 'alpha', clip: i }), 'btn sm'),
    );
    ex.append(row2); box.append(ex);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of KT.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    tl.segs.forEach(s => { const o = h('option', null, `Only clip ${s.i + 1}: ${presetLabel(s.clip)}`); o.value = String(s.i); rg.append(o); });
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.clip != null ? String(pre.clip) : 'all';
    const hint = () => {
      const m = mode.value;
      $('exHint').textContent = {
        composite: 'Your background + the text, as one MP4 (H.264). Always silent.',
        green: 'Text on pure #00FF00 — drop it over your clip in CapCut / Premiere and use Chroma key. Pick one clip as the range.',
        blue: 'Same as green screen but on #0000FF, for shots that contain green.',
        alpha: 'Text with real transparency (WebM VP9 alpha) — works in Premiere, DaVinci and browsers. CapCut: prefer green screen.',
        matte: 'White = text, black = background. Use as a track matte / luma mask.',
      }[m];
      if (m !== 'composite' && rg.value === 'all' && rg.options.length > 1) rg.value = rg.options[1].value;
    };
    mode.onchange = hint; rg.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') { o.from = tl.segs[+r].t0; o.to = tl.segs[+r].t1; }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await KT.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        KT.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of KT.templates.LIST) {
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
    $('btnSave').onclick = () => { KT.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'kinetic-project').replace(/[\\/:*?"<>|]+/g, '') + '.kinetic.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddClip').onclick = () => addClipWith(null);
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        proj.bg = Object.assign(proj.bg || {}, { type: 'media', media: addMedia(f), fit: 'cover', zoom: 0 });
        changed(); renderInspector(); drawTimelineThumbs();
        toast('Background set to ' + f.name);
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { range = null; t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.KTS = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(KT.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(tSec, mode = 'composite', quality = 0.92) {
      const c = window.__ktsCanvas || (window.__ktsCanvas = U.canvas(proj.width, proj.height));
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
      const pres = (ids || KT.presets.list.map(p => p.id)).map(id => KT.presets.byId[id]).filter(p => p);
      const c = document.getElementById('ktsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'ktsSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d'), back = ENG.backdrop(W, H);
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      const errs = [];
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try {
          tg.drawImage(back, 0, 0);
          ENG.drawClip(tg, ENG.newClip(pr.id), p * (pr.dur || 4), W, H, 'hi');
        } catch (e) { errs.push(pr.id + ': ' + e.message); }
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, 170, 18);
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

  window.__MAS_BRIDGE_STATE = {
    id: 'kinetic-title-studio',
    engine: ENG,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { range = null; t = U.clamp(+v || 0, 0, ENG.timeline(proj).total); dirty = true; },
    isPlaying: () => playing,
    play: () => play(),
    pause: () => pause(),
    getDuration: () => ENG.timeline(proj).total,
    selectLayer: idx => { if (proj.clips[idx]) { sel = { kind: 'clip', i: idx }; afterSelect(); } },
    addLayer: (id) => { const pr = KT.presets.byId[id] || KT.presets.list[0]; addClipWith(pr); },
    getAddableTypes: () => KT.presets.list.slice(0, 24).map(p => ({ id: p.id, name: p.name, desc: p.fam, group: p.fam, icon: 'अ' })),
    getMediaList: () => Object.entries(KT.media || {}).map(([id, m]) => ({ id, name: m.name || id, kind: m.kind || 'image', src: m.dataUrl || m.url || '' })),
    uploadMedia: async files => { for (const f of files) { const id = addMedia(f); proj.bg = Object.assign(proj.bg || {}, { type: 'media', media: id }); } changed(true); renderInspector(); drawTimelineThumbs(); },
    useMedia: (id) => { proj.bg = Object.assign(proj.bg || {}, { type: 'media', media: id }); changed(true); renderInspector(); drawTimelineThumbs(); },
    changed: (full) => { changed(Boolean(full)); if (full) refreshAll(); },
  };

})();
