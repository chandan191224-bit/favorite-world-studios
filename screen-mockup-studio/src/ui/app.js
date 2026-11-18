// Studio UI: preset library with live thumbnails, preview stage + transport, timeline,
// auto-built inspector, templates, save/open + autosave, drag-drop media, export.
// window.SMS is the headless pipeline API (load / frame / sheet).
(() => {
  const U = SM.util, ENG = SM.engine, PRE = SM.presets, $ = id => document.getElementById(id);
  const STORE = 'screen-mockup-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'shot', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
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
      m.el = new Image(); m.el.onload = () => { dirty = true; drawTimelineThumbs(); }; m.el.src = url;
      if (file.size < 12e6) { const r = new FileReader(); r.onload = () => { m.dataUrl = r.result; queueSave(); }; r.readAsDataURL(file); }
    } else {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
      v.addEventListener('loadeddata', () => { dirty = true; drawTimelineThumbs(); });
      v.addEventListener('seeked', () => { dirty = true; });
      m.el = v;
    }
    SM.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (SM.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; drawTimelineThumbs(); }; el.src = m.dataUrl || m.url;
        SM.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        // pipeline renders pass clips as file URLs (render.mjs: media.<id>.path)
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; drawTimelineThumbs(); });
        v.addEventListener('seeked', () => { dirty = true; });
        SM.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else SM.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 3.5e6;
    const seen = new Set();
    for (const s of proj.shots) {
      for (const [k, v] of Object.entries(s.content || {})) {
        if (!/^media\d*$/.test(k) || !v) continue;
        const m = SM.media[v]; if (!m || seen.has(v)) continue; seen.add(v);
        media[v] = { kind: m.kind, name: m.name };
        if (withMedia && m.kind === 'image' && m.dataUrl && (withMedia === 'all' || m.dataUrl.length < budget)) {
          media[v].dataUrl = m.dataUrl; budget -= m.dataUrl.length;
        }
      }
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  // pipeline shorthand: {"preset": id, "mediaSlots": {media: id, ...}, "dur", "seed", "name"}
  // expands to the preset's full spec so hand-written projects stay tiny.
  function expandShorthand(s) {
    if (!s || !s.preset || !SM.presets || !SM.presets.byId[s.preset]) return s;
    const spec = JSON.parse(JSON.stringify(SM.presets.byId[s.preset].spec));
    if (s.mediaSlots) for (const [slot, id] of Object.entries(s.mediaSlots)) if (id) spec.content[slot] = id;
    if (s.dur) spec.dur = +s.dur;
    if (s.seed) spec.seed = +s.seed;
    if (s.name) spec.name = s.name;
    if (s.transition) spec.transition = s.transition;
    return spec;
  }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.shots)) throw new Error('Not a Screen Mockup Studio project');
    restoreMedia(p.media); delete p.media;
    p.shots = p.shots.map(expandShorthand);
    proj = Object.assign(ENG.defaultProject(), p);
    proj.shots = (p.shots || []).map(s => { const n = ENG.newShot(s); n.preset = s.preset; return n; });
    sel = { kind: 'shot', i: 0 };
    t = 0; pause();
    applySize(); refreshAll();
  }
  function changed(structure = false) { dirty = true; queueSave(); drawTimelineThumbs(); if (structure) renderTimeline(); else updateTimelineLabels(); }

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
    if (t >= tl.total - 0.01) t = 0;
    playing = true; last = performance.now(); $('btnPlay').textContent = '❚❚';
  }
  function pause() { playing = false; $('btnPlay').textContent = '▶'; ENG.syncVideos(proj, t, false); dirty = true; }
  function loop(now) {
    const tl = ENG.timeline(proj);
    if (playing) {
      t += U.clamp((now - last) / 1000, 0, 0.1); // never step backwards, never more than 0.1 s
      if (t >= tl.total) { if ($('chkLoop').checked) t = 0; else { t = tl.total - 1e-3; pause(); } }
    }
    last = now;
    if (playing || dirty) {
      ENG.syncVideos(proj, t, playing);
      try { ENG.render(sctx, proj, t, { W: stage.width, H: stage.height, tl, quality: q }); } catch (e) { console.error(e); }
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
    const el = document.querySelector(`.shot[data-i="${seg.i}"]`);
    if (el) el.classList.add('live');
  }
  function seekToShot(i, offset = 0.3) {
    const tl = ENG.timeline(proj), seg = tl.segs[i];
    if (!seg) return;
    t = seg.t0 + Math.min(offset, Math.max(0.05, (seg.t1 - seg.t0) / 2));
    if (playing) pause();
    dirty = true;
  }

  // ---------------- preset library ----------------
  const thumbCache = new Map();
  function presetShot(pr) { const s = ENG.newShot(pr.spec); s.__fps = proj ? proj.fps || 30 : 30; return s; }
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const shot = presetShot(pr);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try { ENG.renderShot(g, shot, p * shot.dur, W, H, 'composite', 'T', 0.62); }
    catch (e) { console.warn(pr.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat(PRE.FAMILIES.filter(f => PRE.list.some(p => p.family === f)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = PRE.list.filter(p => (family === 'All' || p.family === family) && (!ql || (p.name + ' ' + p.family + ' ' + (p.note || '')).toLowerCase().includes(ql)));
    const cur = currentShot();
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard'; card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || pr.name;
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new shot with this preset';
      card.append(cv, nm, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.55));
      let raf = 0, t0 = 0, lastDraw = 0;
      const anim = now => {
        if (now - lastDraw < 33) { raf = requestAnimationFrame(anim); return; }
        lastDraw = now;
        const x = ((now - t0) / 1000) % (pr.spec.dur + 0.45);
        drawPresetThumb(cv, pr, U.clamp(x / pr.spec.dur));
        raf = requestAnimationFrame(anim);
      };
      card.onmouseenter = () => { t0 = performance.now() - 300; lastDraw = 0; raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.55); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addShotWith(pr); };
    }
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); else markCurrentPreset(); };
    runJobs();
    markCurrentPreset();
  }
  function markCurrentPreset() {
    const s = currentShot();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!s && s.preset === c.dataset.preset));
  }
  function applyPreset(pr) {
    const s = currentShot();
    if (!s) return addShotWith(pr);
    const seed = s.seed;
    const fresh = ENG.newShot(pr.spec);
    for (const k of ['device', 'content', 'camera', 'bg', 'focus', 'glare', 'shadow', 'dur', 'name']) s[k] = fresh[k];
    s.seed = seed || 7; // keep the user's seed so their look survives re-applying
    s.preset = pr.id;
    changed(true); renderInspector(); markCurrentPreset();
    seekToShot(sel.i, 0.4);
    toast(`${pr.name} → shot ${sel.i + 1}`);
  }
  function addShotWith(pr, at) {
    if (at == null) at = sel.kind === 'shot' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
    const s = ENG.newShot(pr ? pr.spec : { name: 'Shot', dur: 5, device: { id: 'phone' }, content: { id: 'media' }, camera: { move: 'push' }, bg: { id: 'studio' } });
    if (pr) { s.name = pr.name; s.preset = pr.id; }
    proj.shots.splice(at, 0, s);
    sel = { kind: 'shot', i: at };
    changed(true); renderInspector(); markCurrentPreset();
    seekToShot(at, 0.4);
  }

  // ---------------- timeline ----------------
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((s, i) => {
      if (i > 0) {
        const b = document.createElement('button'); b.className = 'tr' + (s.transition && s.transition.type !== 'cut' ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''); b.dataset.i = i;
        b.onclick = () => { sel = { kind: 'trans', i }; afterSelect(); };
        el.appendChild(b);
      }
      const c = document.createElement('button'); c.className = 'shot' + (sel.kind === 'shot' && sel.i === i ? ' sel' : ''); c.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 176; cv.height = Math.round(176 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      c.append(cv, meta);
      c.onclick = () => { sel = { kind: 'shot', i }; seekToShot(i); afterSelect(); };
      el.appendChild(c);
    });
    const add = document.createElement('button'); add.className = 'tr'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => addShotWith(null, proj.shots.length);
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs();
  }
  function updateTimelineLabels() {
    proj.shots.forEach((s, i) => {
      const c = document.querySelector(`.shot[data-i="${i}"] .meta`);
      if (c) c.innerHTML = `<b></b><span>${(+s.dur).toFixed(1)}s</span>`, c.querySelector('b').textContent = `${i + 1}. ${s.name || 'Shot'}`;
      const b = document.querySelector(`.tr[data-i="${i}"]`);
      if (b) {
        const tr = s.transition || {};
        const type = tr.type || 'cut';
        b.className = 'tr' + (type !== 'cut' ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : '');
        b.innerHTML = `<span class="ic">${{ cut: '｜', fade: '⇄', dip: '◐', zoom: '⤢', slide: '⇥', whip: '»' }[type] || '｜'}</span><span></span>`;
        b.lastChild.textContent = `${(ENG.TRANS[type] || 'Cut')} · ${(tr.dur || 0.5).toFixed(1)}s`;
      }
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((s, i) => {
      const cv = document.querySelector(`.shot[data-i="${i}"] canvas`); if (!cv) return;
      try {
        const g = cv.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        s.__fps = proj.fps || 30;
        ENG.renderShot(g, s, Math.min(s.dur * 0.55, s.dur - 0.01), cv.width, cv.height, 'composite', 'L', 0.6);
      } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile() && sel.kind !== 'trans') showTab('insp'); }

  // ---------------- inspector ----------------
  function h(tag, attrs, txt) {
    const e = document.createElement(tag);
    if (attrs && typeof attrs === 'object' && !(attrs instanceof Node)) { for (const [k, val] of Object.entries(attrs)) { if (k === 'value') e.value = val; else if (k === 'name') continue; else e.setAttribute(k, val); } if (attrs.name != null) e.textContent = attrs.name; }
    else if (attrs && typeof attrs === 'string') e.className = attrs;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function section(title, right) { const s = h('div', 'sec'), t = h('h3'); t.append(title); if (right) t.append(right); s.append(t); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  const decimals = step => Math.min(5, Math.max(0, Math.ceil(-Math.log10(step)) ));
  function fmtNum(v, step) {
    let s = (+v).toFixed(decimals(step));
    if (decimals(step) > 0) s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return s;
  }
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const val = h('i', null, fmtNum(v, step) + unit);
    i.oninput = () => { val.textContent = fmtNum(+i.value, step) + unit; on(+i.value); };
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) {
    // accepts: object {key:name}, array of [key,name] pairs, or array of {value,name,group}
    const items = (Array.isArray(opts) ? opts : Object.entries(opts || {}))
      .map(o => Array.isArray(o) ? { value: o[0], name: o[1] } : o)
      .map(o => (o && o.value != null) ? o : { value: String(o), name: String(o) });
    const s = h('select');
    const groups = new Map();
    for (const o of items) {
      if (o.group) { if (!groups.has(o.group)) { const og = h('optgroup'); og.label = o.group; groups.set(o.group, og); s.append(og); } groups.get(o.group).append(h('option', { value: o.value, name: o.name })); }
      else s.append(h('option', { value: o.value, name: o.name }));
    }
    s.value = v; s.onchange = () => on(s.value);
    return field(label, s);
  }
  function fText(label, v, on, area) { const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; i.value = v || ''; i.oninput = () => on(i.value); return field(label, i); }
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }
  function fMedia(label, v, on) {
    const box = h('div', 'fld');
    const sp = h('span'); sp.append(label); box.append(sp);
    const row = h('div', 'row gap');
    const s = h('select');
    const opts = [['', '— none —']].concat(Object.entries(SM.media).map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + (m.name || id)]));
    for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); }
    s.value = v || ''; s.onchange = () => on(s.value);
    const add = btn('＋ File…', async () => { const fs = await pickFiles(); if (fs[0]) { const id = addMedia(fs[0]); s.value = id; on(id); changed(); } });
    row.append(s, add); box.append(row);
    const m = v && SM.media[v];
    if (m && m.missing) box.append(h('p', 'desc', 'Not stored in the project. Add the file again to re-link.'));
    return box;
  }
  function paramField(sec, pdef, value, set) {
    if (pdef.type === 'range') sec.append(fRange(pdef.label, value, pdef.min, pdef.max, pdef.step, set));
    else if (pdef.type === 'select') {
      const o = pdef.options;
      const entries = Array.isArray(o) ? o.map(x => [x, x]) : Object.entries(o).map(([k, n]) => [k, n]);
      sec.append(fSelect(pdef.label, entries, String(value), x => set(x)));
    }
    else if (pdef.type === 'bool') sec.append(fCheck(pdef.label, value, x => set(x)));
    else if (pdef.type === 'color') sec.append(fColor(pdef.label, value, x => set(x)));
    else if (pdef.type === 'text') sec.append(fText(pdef.label, value, x => set(x)));
    else if (pdef.type === 'textarea') sec.append(fText(pdef.label, value, x => set(x), true));
    else if (pdef.type === 'media') sec.append(fMedia(pdef.label, value, x => { set(x); changed(); }));
  }

  function currentShot() { return sel.kind === 'shot' && proj.shots[sel.i] ? proj.shots[sel.i] : null; }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project') return projectInspector(box);
    if (sel.kind === 'trans') return transInspector(box);
    const s = proj.shots[sel.i];
    if (!s) { sel = { kind: 'project' }; return projectInspector(box); }
    shotInspector(box, s, sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; changed(); }));
    box.append(sec);
    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of shots. Each shot = a device (phone, laptop, monitor, TV, CRT, cinema screen, floating window…) × what is on its screen (your photo/video, a search, an article, a player, a HUD…) × a 3D camera move × a background. Pick a preset in the library, tune everything here, then Export — the full video, or one shot as a green / blue / transparent element for your editor.'));
    box.append(help);
  }

  function shotInspector(box, s, i) {
    const isLast = i === proj.shots.length - 1;
    // ---- device ----
    const dd = SM.devices.byId[s.device.id] || SM.devices.byId.phone;
    const dsec = section(`Shot ${i + 1} · Device`);
    dsec.append(fSelect('Device', SM.devices.list.map(d => ({ value: d.id, name: `${d.icon} ${d.name}` })), s.device.id, v => { s.device = { id: v }; s.preset = null; changed(true); renderInspector(); }));
    for (const p of dd.params) {
      const v = s.device[p.key] == null ? p.def : s.device[p.key];
      paramField(dsec, p, v, x => { s.device[p.key] = x; s.preset = null; changed(); if (p.key === 'orient' || p.key === 'stand' || p.key === 'body' || p.key === 'ratio' || p.key === 'layout') renderInspector(); });
    }
    box.append(dsec);

    // ---- content ----
    const cd = SM.content.byId[s.content.id] || SM.content.byId.media;
    const csec = section('Screen content');
    const cdefs = SM.content.list.map(c => ({ value: c.id, name: `${c.icon} ${c.name}`, group: c.family }));
    csec.append(fSelect('Shows', cdefs, s.content.id, v => { s.content = { id: v }; s.preset = null; changed(true); renderInspector(); }));
    for (const p of cd.params) {
      const v = s.content[p.key] == null ? p.def : s.content[p.key];
      paramField(csec, p, v, x => { s.content[p.key] = x; s.preset = null; changed(); });
    }
    // video timing when any slot holds a video
    const videoSlots = Object.entries(s.content).filter(([k, v]) => /^media\d*$/.test(k) && v && SM.media[v] && SM.media[v].kind === 'video' && !SM.media[v].missing);
    if (videoSlots.length) {
      csec.append(fRange('Video start at (s)', +(s.content.mediaStart || 0), 0, 300, 0.1, x => { s.content.mediaStart = x; changed(); }, 's'));
      csec.append(fCheck('Loop video clips', s.content.mediaLoop !== false, x => { s.content.mediaLoop = x; changed(); }));
    }
    box.append(csec);

    // ---- camera ----
    const mv = s.camera || {};
    const cam = section('Camera');
    cam.append(fSelect('Move', Object.entries(ENG.MOVES).map(([k, m]) => [k, m.name]), mv.move || 'swing', v => { s.camera.move = v; changed(true); renderInspector(); }));
    cam.append(fRange('Amount', mv.amount == null ? 1 : +mv.amount, 0, 2, 0.05, x => { s.camera.amount = x; changed(); }));
    cam.append(fSelect('Easing', [['inOut', 'Smooth (cinematic)'], ['out', 'Fast start, soft stop'], ['in', 'Slow start'], ['expo', 'Snappy (expo)'], ['outExpo', 'Fast stop (expo out)'], ['back', 'Overshoot'], ['spring', 'Spring'], ['linear', 'Linear']], mv.ease || 'inOut', v => { s.camera.ease = v; changed(); }));
    const two = h('div', 'two');
    two.append(fRange('Starts at', (mv.from || 0) * 100, 0, 100, 1, x => { s.camera.from = x / 100; changed(); }, '%'), fRange('Ends at', (mv.to == null ? 1 : +mv.to) * 100, 0, 100, 1, x => { s.camera.to = x / 100; changed(); }, '%'));
    cam.append(two);
    const adv = section('Camera (manual)');
    const t2 = h('div', 'two');
    t2.append(fRange('Yaw', mv.yaw || 0, -60, 60, 1, x => { s.camera.yaw = x; changed(); }, '°'), fRange('Pitch', mv.pitch || 0, -60, 60, 1, x => { s.camera.pitch = x; changed(); }, '°'));
    const t3 = h('div', 'two');
    t3.append(fRange('Roll', mv.roll || 0, -45, 45, 1, x => { s.camera.roll = x; changed(); }, '°'), fRange('Zoom', mv.zoom || 1, 0.5, 2, 0.01, x => { s.camera.zoom = x; changed(); }));
    const t4 = h('div', 'two');
    t4.append(fRange('Shift X', (mv.x || 0) * 100, -30, 30, 0.5, x => { s.camera.x = x / 100; changed(); }, '%'), fRange('Shift Y', (mv.y || 0) * 100, -30, 30, 0.5, x => { s.camera.y = x / 100; changed(); }, '%'));
    adv.append(t2, t3, fRange('Field of view', mv.fov || 30, 15, 70, 1, x => { s.camera.fov = x; changed(); }, '°'), t4);
    box.append(cam, adv);

    // ---- background ----
    const b = s.bg || {};
    const bgsec = section('Background');
    bgsec.append(fSelect('Background', Object.entries(ENG.BGS).map(([k, n]) => [k, n]), b.id || 'studio', v => { s.bg = { id: v }; changed(true); renderInspector(); }));
    if ((b.id || 'studio') === 'color') bgsec.append(fColor('Colour', b.color || '#101216', v => { s.bg.color = v; changed(); }));
    if (b.id === 'blur') {
      bgsec.append(fRange('Darken', b.dim == null ? 0.45 : +b.dim, 0, 1, 0.05, x => { s.bg.dim = x; changed(); }));
      bgsec.append(h('p', 'desc', "Blurred copy of the shot's own photo/video. If the content has no media, a neutral placeholder scene is blurred instead."));
    }
    box.append(bgsec);

    // ---- focus & finish ----
    const f = s.focus || {};
    const hasFocusMove = ['focus', 'focusOut'].includes((mv.move || ''));
    const fsec = section(hasFocusMove ? 'Focus zoom (this move uses it)' : 'Focus & finish');
    if (hasFocusMove) {
      fsec.append(fCheck("Use the content's own hotspot", f.auto !== false, x => { s.focus.auto = x; changed(true); renderInspector(); }));
      if (f.auto === false) {
        const fr = h('div', 'two');
        fr.append(fRange('X', (f.x || 0.3) * 100, 0, 100, 1, x => { s.focus.x = x / 100; changed(); }, '%'), fRange('Y', (f.y || 0.3) * 100, 0, 100, 1, x => { s.focus.y = x / 100; changed(); }, '%'));
        const fr2 = h('div', 'two');
        fr2.append(fRange('Width', (f.w || 0.4) * 100, 2, 100, 1, x => { s.focus.w = x / 100; changed(); }, '%'), fRange('Height', (f.h || 0.25) * 100, 2, 100, 1, x => { s.focus.h = x / 100; changed(); }, '%'));
        fsec.append(fr, fr2);
      }
      fsec.append(fRange('Zoom closeness', f.zoom == null ? 0.72 : +f.zoom, 0.25, 0.95, 0.01, x => { s.focus.zoom = x; changed(); }));
      fsec.append(fRange('Blur outside', f.blur == null ? 0.8 : +f.blur, 0, 1.6, 0.05, x => { s.focus.blur = x; changed(); }));
      fsec.append(fRange('Darken outside', f.dim == null ? 0.45 : +f.dim, 0, 1, 0.05, x => { s.focus.dim = x; changed(); }));
      fsec.append(fColor('Frame colour', f.color || '#e5a93c', x => { s.focus.color = x; changed(); }));
    }
    fsec.append(fRange('Screen glare', s.glare == null ? 0.6 : +s.glare, 0, 1, 0.05, x => { s.glare = x; changed(); }));
    fsec.append(fRange('Shadow', s.shadow == null ? 0.7 : +s.shadow, 0, 1, 0.05, x => { s.shadow = x; changed(); }));
    box.append(fsec);

    // ---- transition out of this shot ----
    if (!isLast) {
      const nshot = proj.shots[i + 1];
      const tr = nshot.transition || { type: 'fade', dur: 0.5 };
      const tsec = section(`After this shot → ${i + 2}`);
      tsec.append(fSelect('Transition', Object.entries(ENG.TRANS).map(([k, n]) => [k, n]), tr.type || 'fade', v => { nshot.transition.type = v; nshot.transition.dur = nshot.transition.dur || 0.5; changed(true); }));
      if ((tr.type || 'fade') !== 'cut') tsec.append(fRange('Length', tr.dur || 0.5, 0.2, 2, 0.05, x => { nshot.transition.dur = x; changed(); }, 's'));
      box.append(tsec);
    }

    // ---- shot row ----
    const act = section('Shot');
    act.append(fText('Name', s.name, v => { s.name = v; changed(); }));
    act.append(fRange('On screen for', s.dur, 0.5, 20, 0.1, x => { s.dur = x; changed(); }, 's'));
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = s.seed || 7; seedIn.style.width = '90px'; seedIn.oninput = () => { s.seed = +seedIn.value || 7; changed(); };
    seedRow.append(h('span', 'desc', 'Look seed'), seedIn, btn('🎲 New look', () => { s.seed = Math.floor(Math.random() * 9999) + 1; seedIn.value = s.seed; changed(); }));
    act.append(seedRow);
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { const c = JSON.parse(JSON.stringify(s)); c.id = U.uid(); delete c.preset; proj.shots.splice(i + 1, 0, c); sel = { kind: 'shot', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) { [proj.shots[i - 1], proj.shots[i]] = [proj.shots[i], proj.shots[i - 1]]; sel.i = i - 1; changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) { [proj.shots[i + 1], proj.shots[i]] = [proj.shots[i], proj.shots[i + 1]]; sel.i = i + 1; changed(true); renderInspector(); } }),
      btn('Delete', () => { proj.shots.splice(i, 1); if (!proj.shots.length) proj.shots.push(ENG.newShot()); sel = { kind: 'shot', i: Math.max(0, i - 1) }; changed(true); renderInspector(); }, 'btn sm danger'),
    );
    act.append(row);
    box.append(act);
  }

  function transInspector(box) {
    const i = sel.i, s = proj.shots[i];
    if (!s) { sel = { kind: 'project' }; return projectInspector(box); }
    const tr = s.transition || { type: 'fade', dur: 0.5 };
    const sec = section(`Between shot ${i} and ${i + 1}`);
    sec.append(fSelect('Transition', Object.entries(ENG.TRANS).map(([k, n]) => [k, n]), tr.type || 'fade', v => { s.transition = s.transition || {}; s.transition.type = v; s.transition.dur = s.transition.dur || 0.5; changed(true); renderInspector(); }));
    if ((tr.type || 'fade') !== 'cut') sec.append(fRange('Length', tr.dur || 0.5, 0.2, 2, 0.05, x => { s.transition = s.transition || {}; s.transition.dur = x; changed(); }, 's'));
    sec.append(h('p', 'desc', `Plays at the start of shot ${i + 1} — at most 60% of its length.`));
    box.append(sec);
    const sec2 = section('Go to');
    const row = h('div', 'row gap wrap');
    row.append(
      btn(`◀ Shot ${i}`, () => { sel = { kind: 'shot', i: i - 1 }; afterSelect(); }),
      btn(`Shot ${i + 1} ▶`, () => { sel = { kind: 'shot', i }; afterSelect(); }),
    );
    sec2.append(row);
    box.append(sec2);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of SM.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    proj.shots.forEach((s, i) => { const o = h('option', null, `Only shot ${i + 1}: ${s.name || 'Shot'} (${(+s.dur).toFixed(1)} s)`); o.value = String(i); rg.append(o); });
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.shot != null ? String(pre.shot) : 'all';
    const hint = () => {
      const m = mode.value;
      $('exHint').textContent = {
        composite: 'The whole video exactly as in the preview (silent MP4, H.264).',
        green: 'The device + screen on pure #00FF00. In CapCut / Premiere: Chroma key green. Pick one shot as the range.',
        blue: 'Same as green but on #0000FF — for shots that contain green.',
        alpha: 'The element with real transparency (VP9 + alpha). Works in Premiere, DaVinci, browsers; CapCut prefers green.',
        matte: 'White = the element, black = everything else. Use as a track matte.',
        screenkey: 'The screen area filled with #00FF00 (device drawn normally) — key any clip on top of it later.',
        screenmatte: 'White screen area, black device — a matte just for the screen picture.',
      }[m];
    };
    mode.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') {
      const i = +r, seg = tl.segs[i];
      const pad = mode === 'composite' ? [0.15, 0.35] : [0, 0];
      o.from = Math.max(0, seg.t0 - pad[0]); o.to = Math.min(tl.total, seg.t1 + pad[1]);
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await SM.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) $('exStatus').textContent = 'Cancelled.';
      else {
        SM.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB` +
          (res.fallback ? (mode === 'alpha' ? ' · this browser fell back to MediaRecorder and could not keep transparency — use Chrome for real alpha' : ' · MediaRecorder fallback (slightly softer)') : '');
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of SM.templates.LIST) {
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
    $('scrub').oninput = () => { const tl = ENG.timeline(proj); t = $('scrub').value / 1000 * tl.total; if (playing) pause(); dirty = true; };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { SM.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'screen-project').replace(/[\\/:*?"<>|]+/g, '') + '.sms.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; renderInspector(); markCurrentPreset(); if (mobile()) showTab('insp'); };
    $('btnAddShot').onclick = () => addShotWith(null, proj.shots.length);
    $('btnAddMedia').onclick = async () => {
      const dev = currentShot() ? { ...currentShot().device } : { id: 'phone' };
      for (const f of await pickFiles()) { const id = addMedia(f); addShotWith({ spec: { name: f.name, dur: 5.5, device: dev, content: { id: 'media', media: id, fit: 'cover', kb: 0.05 }, camera: { move: 'swing', ease: 'outExpo' }, bg: { id: 'blur', dim: 0.5 } } }, proj.shots.length); }
    };
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      const dev = currentShot() ? { ...currentShot().device } : { id: 'phone' };
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        const id = addMedia(f);
        addShotWith({ spec: { name: f.name, dur: 5.5, device: dev, content: { id: 'media', media: id, fit: 'cover', kb: 0.05 }, camera: { move: 'swing', ease: 'outExpo' }, bg: { id: 'blur', dim: 0.5 } } }, proj.shots.length);
      }
    });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); if (playing) pause(); dirty = true; }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
    });
    addEventListener('resize', () => { dirty = true; if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.SMS = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(SM.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(t, mode = 'composite', format = 'png', quality = 0.95) {
      const c = window.__smsCanvas || (window.__smsCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, t);
      ENG.render(g, proj, t, { W: proj.width, H: proj.height, mode, quality: 1 });
      if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      return c.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
    },
    // contact sheet of presets at several progress points (QA): shows it full-screen, returns ms
    sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 400, H = 225, show = false) {
      const presets = (ids && ids.length ? ids : PRE.list.map(p => p.id)).map(id => PRE.byId[id]).filter(Boolean);
      const c = document.getElementById('smsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'smsSheet' }));
      c.width = W * ps.length; c.height = H * presets.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d');
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      presets.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try { const shot = presetShot(pr); ENG.renderShot(tg, shot, p * shot.dur, W, H, 'composite', 'S', 0.7); } catch (e) { console.error(pr.id, e); }
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.68)'; g.fillRect(k * W, r * H, 205, 18);
        g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${pr.id}  p=${p}`, k * W + 5, r * H + 13);
      }));
      return { ms: Math.round(performance.now() - t0), rows: presets.length, cols: ps.length };
    },
  };

  // ---------------- start ----------------
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.defaultProject(); applySize(); refreshAll(); }
  wire();
  if (proj) { renderTimeline(); renderInspector(); }
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { thumbCache.clear(); dirty = true; renderLibrary(); drawTimelineThumbs(); });
})();
