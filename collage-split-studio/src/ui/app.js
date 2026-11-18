// Studio UI: effects library, live preview, timeline, inspector, slots, cut-out editor, save/open, export.
(() => {
  const U = CS.util, D = CS.draw, ENG = CS.engine, LIB = CS.lib, XPT = CS.exporter, $ = id => document.getElementById(id);
  const STORE = 'collage-split-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;
  const COMMON_KEYS = ['bg', 'bgColor', 'stop', 'jitter', 'drift', 'grain', 'vignette', 'labelStyle', 'labelSize'];

  let proj, sel = { kind: 'scene', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
  let family = 'All', query = '';
  const stage = $('stage'), sctx = stage.getContext('2d');

  // ---------------- elements ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  let toastT = 0;
  function toast(msg) { const e = $('toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2600); }

  // ---------------- media ----------------
  function addMedia(file) { return LIB.addFile(file); }
  function restoreMedia(saved) {
    for (const [id, e] of Object.entries(saved || {})) {
      if (CS.media[id]) continue;
      try { LIB.restore(id, e); } catch (err) {}
    }
  }
  function serialise(withMedia) {
    const media = {};
    if (withMedia) for (const [id, m] of Object.entries(CS.media)) {
      const e = { kind: m.kind, name: m.name, cut: m.cut };
      if (m.dataUrl) e.dataUrl = m.dataUrl;
      else if (m.url && !m.url.startsWith('blob:')) e.url = m.url;
      if (m.path) e.path = m.path;
      media[id] = e;
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() {
    if (window.__HEADLESS) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} }
    }, 600);
  }
  function changed(structure) { dirty = true; queueSave(); bumpScene(); if (structure) renderTimeline(); else updateTimelineLabels(); }

  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.scenes)) throw new Error('Not a Collage & Split Studio project');
    restoreMedia(p.media); delete p.media;
    for (const s of p.scenes) {
      // pipeline shorthand: { preset: 'vs-duel' } -> the preset's layout, settings and length
      if (s.preset && !s.fx) {
        const pr = CS.fx.presets.find(x => x.id === s.preset);
        if (pr) Object.assign(s, { fx: pr.fx, params: Object.assign({}, pr.params, s.params), dur: s.dur || pr.dur });
      }
      s.slots = (s.slots || []).map(sl => Object.assign({ m: null, label: '' }, sl));
    }
    proj = Object.assign(ENG.defaultProject(), p);
    proj.scenes = p.scenes;
    sel = { kind: 'scene', i: 0 }; t = 0; pause();
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
    if (t >= tl.total - 0.01) t = 0;
    playing = true; last = performance.now(); $('btnPlay').textContent = '❚❚';
  }
  function pause() { playing = false; $('btnPlay').textContent = '▶'; ENG.syncVideos(proj, t, false); dirty = true; }
  function loop(now) {
    const tl = ENG.timeline(proj);
    if (playing) {
      t += U.clamp((now - last) / 1000, 0, 0.1); // never step backwards / huge jumps
      if (t >= tl.total) { if ($('chkLoop').checked) t = 0; else { t = tl.total - 1e-3; pause(); } }
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
    const el = document.querySelector(`.shot[data-i="${seg.i}"]`);
    if (el) el.classList.add('live');
  }
  function seekTo(time, andPause) {
    const tl = ENG.timeline(proj);
    t = Math.max(0, Math.min(time, tl.total - 1e-3));
    if (andPause) pause();
    dirty = true;
  }

  // ---------------- effects library ----------------
  const famName = f => (CS.fx.FAMILIES.find(x => x[0] === f) || [0, f])[1];
  const famRank = f => { const i = CS.fx.FAMILIES.findIndex(x => x[0] === f); return i < 0 ? 99 : i; };
  const presets = () => CS.fx.presets.filter(p => CS.fx.byId[p.fx]).map((p, i) => [p, i])
    .sort((a, b) => famRank(CS.fx.byId[a[0].fx].family) - famRank(CS.fx.byId[b[0].fx].family) || a[1] - b[1]).map(x => x[0]);

  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    try { ENG.drawPreset(g, pr.id, p, cv.width, cv.height); } catch (e) { console.warn(pr.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat([...new Set(presets().map(p => CS.fx.byId[p.fx].family))].sort((a, b) => famRank(a) - famRank(b)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = h('button', 'chip' + (f === family ? ' on' : ''), famName(f));
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || CS.fx.byId[p.fx].family === family) &&
      (!ql || (p.name + ' ' + p.fx + ' ' + (p.note || '') + ' ' + famName(CS.fx.byId[p.fx].family)).toLowerCase().includes(ql)));
    const cur = currentScene();
    const jobs = [];
    for (const pr of list) {
      const card = h('div', 'fxcard' + (cur && cur.preset === pr.id ? ' cur' : ''));
      card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || (CS.fx.byId[pr.fx] || {}).desc || '';
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = h('span', 'nm', pr.name);
      const fam = h('span', 'fam', famName(CS.fx.byId[pr.fx].family));
      const add = h('button', 'add', '+'); add.title = 'Add a new scene with this effect';
      card.append(cv, nm, fam, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.5));
      let raf = 0, t0 = 0;
      const anim = now => { const x = ((now - t0) / 1000) % (pr.dur + 0.4); drawPresetThumb(cv, pr, U.clamp(x / pr.dur)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.5); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addSceneWith(pr); };
    }
    // light on the page thread: chunked jobs (startup lesson)
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 10) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  function markCurrentPreset() {
    const cur = currentScene();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function currentScene() { return sel.kind !== 'trans' && proj.scenes[sel.i] ? proj.scenes[sel.i] : null; }

  function applyPreset(pr) {
    const i = sel.kind === 'trans' ? Math.min(proj.scenes.length - 1, sel.i) : sel.i;
    const s = proj.scenes[i];
    if (!s) return addSceneWith(pr);
    const keep = s.slots.slice();
    s.fx = pr.fx; s.preset = pr.id;
    s.params = Object.assign({}, pr.params);
    const want = pr.slots || (CS.fx.byId[pr.fx] || {}).slots || 2;
    s.slots = Array.from({ length: want }, (_, k) => keep[k] || { m: null, label: '' });
    sel = { kind: 'scene', i };
    changed(true); renderInspector(); markCurrentPreset();
    const tl = ENG.timeline(proj), seg = tl.segs[i];
    if (seg) seekTo(seg.t0 + 0.2, true);
    toast(`${pr.name} → scene ${i + 1}`);
  }
  function addSceneWith(pr, at) {
    const s = ENG.newScene(pr ? pr.id : 'photo-full');
    s.preset = pr ? pr.id : 'photo-full';
    const pos = at != null ? at : (sel.kind === 'scene' || sel.kind === 'trans' ? Math.min(proj.scenes.length, sel.i + 1) : proj.scenes.length);
    if (pr && pr.params && Object.keys(pr.params).length) s.params = Object.assign({}, pr.params);
    proj.scenes.splice(pos, 0, s);
    if (!s.trans || !s.trans.type) s.trans = { type: 'fade', dur: 0.5 };
    sel = { kind: 'scene', i: pos };
    changed(true); renderInspector(); markCurrentPreset();
    const tl = ENG.timeline(proj), seg = tl.segs[pos];
    if (seg) seekTo(seg.t0 + 0.2, true);
  }

  // ---------------- timeline ----------------
  let tlRev = 0;
  function bumpScene() { tlRev++; }
  function sceneName(s) {
    const pr = s.preset && CS.fx.presets.find(p => p.id === s.preset);
    const fx = CS.fx.byId[s.fx];
    return (pr ? pr.name : fx ? fx.name : s.fx) || 'Scene';
  }
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.scenes.forEach((s, i) => {
      if (i > 0) {
        const b = h('button', 'tr has' + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''));
        b.dataset.i = i; b.title = 'Transition into scene ' + (i + 1);
        b.innerHTML = `<span class="ic">⇒</span><span></span>`;
        b.lastChild.textContent = (ENG.TRANSITIONS.find(x => x[0] === (s.trans || {}).type) || [0, 'Cut'])[1].replace(/ \(.*\)/, '');
        b.onclick = () => { sel = { kind: 'trans', i }; afterSelect(); };
        el.appendChild(b);
      }
      const c = h('button', 'shot' + (sel.kind === 'scene' && sel.i === i ? ' sel' : ''));
      c.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.max(60, Math.round(160 * proj.height / proj.width));
      const meta = h('div', 'meta');
      c.append(cv, meta);
      c.onclick = () => {
        sel = { kind: 'scene', i }; range0();
        const seg = ENG.timeline(proj).segs[i];
        if (seg) seekTo(seg.t0 + Math.min(0.5, (seg.t1 - seg.t0) * 0.4), true);
        afterSelect();
      };
      el.appendChild(c);
    });
    const add = h('button', 'tr', ''); add.innerHTML = '<span class="ic">＋</span>Add scene';
    add.onclick = () => addSceneWith(CS.fx.presets.find(p => p.id === 'photo-full'));
    el.appendChild(add);
    updateTimelineLabels(); queueTimelineThumbs();
  }
  function range0() {}
  function updateTimelineLabels() {
    proj.scenes.forEach((s, i) => {
      const c = document.querySelector(`.shot[data-i="${i}"] .meta`);
      if (c) { c.innerHTML = `<b></b><span>${(+s.dur).toFixed(1)}s</span>`; c.querySelector('b').textContent = `${i + 1}. ${sceneName(s)}`; }
      const b = document.querySelector(`.tr[data-i="${i}"]`);
      if (b) b.classList.toggle('sel', sel.kind === 'trans' && sel.i === i);
      const sh = document.querySelector(`.shot[data-i="${i}"]`);
      if (sh) sh.classList.toggle('sel', sel.kind === 'scene' && sel.i === i);
    });
  }
  // scene thumbnails: cached by scene revision, drawn off the hot path
  const thumbCache = new Map();
  function queueTimelineThumbs() {
    const jobs = [];
    proj.scenes.forEach((s, i) => {
      const cv = document.querySelector(`.shot[data-i="${i}"] canvas`);
      if (!cv) return;
      jobs.push(() => {
        const key = s.id + ':' + (s._rev || 0) + ':' + cv.width + 'x' + cv.height;
        let c = thumbCache.get(key);
        if (!c) {
          c = U.canvas(cv.width, cv.height);
          try { ENG.drawScene(c.getContext('2d'), s, (+s.dur || 1) * 0.72, cv.width, cv.height, 'composite', 30); } catch (e) {}
          if (thumbCache.size > 90) thumbCache.delete(thumbCache.keys().next().value);
          thumbCache.set(key, c);
        }
        const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(c, 0, 0);
      });
    });
    const run = () => { const s0 = performance.now(); while (jobs.length && performance.now() - s0 < 10) jobs.shift()(); if (jobs.length) setTimeout(run, 0); };
    run();
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- inspector ----------------
  function section(title, right) { const s = h('div', 'sec'), t = h('h3'); t.append(title); if (right) t.append(right); s.append(t); return s; }
  function field(label, input, val) { const f = h('label', 'fld'), sp = h('span'); sp.append(label); if (val) sp.append(val); f.append(sp, input); return f; }
  const dec = step => step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  function fRange(label, v, min, max, step, on, unit = '') {
    const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const val = h('i', null, (+v).toFixed(dec(step)) + unit);
    i.oninput = () => { val.textContent = (+i.value).toFixed(dec(step)) + unit; on(+i.value); };
    return field(label, i, val);
  }
  function fSelect(label, opts, v, on) { const s = h('select'); for (const [k, n] of opts) { const o = h('option', null, n); o.value = k; s.append(o); } s.value = v; s.onchange = () => on(s.value); return field(label, s); }
  function fText(label, v, on, area) { const i = h(area ? 'textarea' : 'input'); if (!area) i.type = 'text'; i.value = v || ''; i.oninput = () => on(i.value); return field(label, i); }
  function fColor(label, v, on) { const i = h('input'); i.type = 'color'; i.value = v || '#000000'; i.oninput = () => on(i.value); return field(label, i); }
  function fCheck(label, v, on) { const l = h('label', 'tog'), i = h('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = () => on(i.checked); l.append(i, label); return l; }
  function btn(label, on, cls = 'btn sm ghost') { const b = h('button', cls, label); b.type = 'button'; b.onclick = on; return b; }

  function paramInput(p, v, on) {
    if (p.type === 'range') return fRange(p.label, v, p.min, p.max, p.step, on);
    if (p.type === 'select') return fSelect(p.label, p.options, v, on);
    if (p.type === 'bool') return fCheck(p.label, v, on);
    if (p.type === 'color') return fColor(p.label, v, on);
    return fText(p.label, v, on, false);
  }

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.scenes.length) return projectInspector(box);
    if (sel.kind === 'trans') return transInspector(box);
    sceneInspector(box, proj.scenes[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    box.append(sec);
    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of scenes. Each scene is one layout (split screen, grid, scrapbook collage…) filled with your photos and videos — drop them on the stage or pick them per slot below. Click a card in the Effects library to change the selected scene\'s layout. Exports are always silent.'));
    box.append(help);
  }

  function sceneInspector(box, s, i) {
    if (!s) { sel = { kind: 'project' }; return projectInspector(box); }
    const fx = CS.fx.byId[s.fx];
    // scene section
    const sec = section(`Scene ${i + 1}`, btn('🎲', () => { s.seed = Math.floor(Math.random() * 9000) + 1; s._rev = (s._rev || 0) + 1; changed(true); toast('New arrangement'); }));
    if (fx) sec.append(h('p', 'desc', fx.desc));
    sec.append(fRange('On screen for (s)', s.dur, 1, 15, 0.1, v => { s.dur = v; changed(); }, 's'));
    box.append(sec);

    if (!fx) return;
    const P = ENG.params(s);
    const own = (fx.params || []).filter(p => !COMMON_KEYS.includes(p.key));
    const look = (fx.params || []).filter(p => COMMON_KEYS.includes(p.key));
    // layout settings
    if (own.length) {
      const secL = section('Layout settings');
      for (const p of own) secL.append(paramInput(p, P[p.key], v => { s.params[p.key] = v; s._rev = (s._rev || 0) + 1; changed(); }));
      box.append(secL);
    }
    // photos & videos (slots)
    const secS = section('Photos & videos', btn('＋ Slot', () => {
      const max = fx.maxSlots || 8;
      if (s.slots.length >= max) return toast(`This layout holds at most ${max} photos`);
      s.slots.push({ m: null, label: '' }); s._rev = (s._rev || 0) + 1; changed(true); renderInspector();
    }));
    s.slots.forEach((sl, k) => secS.append(slotRow(s, sl, k, fx)));
    if (s.slots.length > 1) secS.append(h('p', 'hint', 'Use ▲▼ on a slot to reorder it.'));
    box.append(secS);
    // look
    const secLook = section('Look & feel');
    for (const p of look) secLook.append(paramInput(p, P[p.key], v => { s.params[p.key] = v; s._rev = (s._rev || 0) + 1; changed(); }));
    box.append(secLook);
  }

  function slotRow(s, sl, k, fx) {
    const row = h('div', 'slot');
    const head = h('div', 's-head');
    head.append(h('b', null, `Photo ${k + 1}`), h('span', 'sp'));
    const up = h('button', 'up', '▲'); up.type = 'button'; up.title = 'Move up';
    const dn = h('button', 'dn', '▼'); dn.type = 'button'; dn.title = 'Move down';
    const rm = h('button', 'dn', '×'); rm.type = 'button'; rm.title = 'Remove this slot';
    up.onclick = () => { if (k > 0) { [s.slots[k - 1], s.slots[k]] = [s.slots[k], s.slots[k - 1]]; s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); } };
    dn.onclick = () => { if (k < s.slots.length - 1) { [s.slots[k + 1], s.slots[k]] = [s.slots[k], s.slots[k + 1]]; s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); } };
    rm.onclick = () => { if (s.slots.length > (fx.minSlots || 1)) { s.slots.splice(k, 1); s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); } else toast('This layout needs at least ' + (fx.minSlots || 1) + ' photos'); };
    head.append(up, dn, rm);
    row.append(head);

    const opts = [['', '— demo photo —']].concat(Object.entries(CS.media).filter(([, m]) => !m.missing).map(([id, m]) => [id, m.name]));
    row.append(fSelect('Shows', opts, sl.m || '', v => { sl.m = v || null; s._rev = (s._rev || 0) + 1; changed(); renderMediaTray(); }));
    const addB = btn('＋ Add photo / video file…', async () => {
      const fs = await pickFiles(); if (!fs.length) return;
      sl.m = addMedia(fs[0]); s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); renderMediaTray();
    });
    addB.style.alignSelf = 'flex-start';
    row.append(addB);
    const m = sl.m && CS.media[sl.m];
    if (m && m.kind === 'image') {
      const cutB = btn('✂ Cut-out / lasso…', () => openCutEditor(sl.m));
      cutB.style.alignSelf = 'flex-start';
      row.append(cutB);
    }
    row.append(fText('Label (Hindi OK)', sl.label, v => { sl.label = v; changed(); }));
    const mini = h('div', 'mini');
    mini.append(fRange('Focus X', sl.fx == null ? 0.5 : sl.fx, 0, 1, 0.01, v => { sl.fx = v; changed(); }));
    mini.append(fRange('Focus Y', sl.fy == null ? 0.42 : sl.fy, 0, 1, 0.01, v => { sl.fy = v; changed(); }));
    mini.append(fRange('Zoom', sl.zoom || 0, 0, 0.5, 0.01, v => { sl.zoom = v; changed(); }));
    if (m && m.kind === 'video') {
      mini.append(fRange('Start at (s)', sl.start || 0, 0, 120, 0.1, v => { sl.start = v; changed(); }));
      const l = fCheck('Loop the clip', sl.loop !== false, v => { sl.loop = v; changed(); });
      l.style.gridColumn = '1 / -1'; mini.append(l);
    }
    row.append(mini);
    return row;
  }

  function transInspector(box) {
    const i = sel.i, s = proj.scenes[i];
    if (!s) { sel = { kind: 'project' }; return projectInspector(box); }
    const sec = section(`Transition into scene ${i + 1}`);
    const tr = s.trans = s.trans || { type: 'fade', dur: 0.5 };
    sec.append(fSelect('Type', ENG.TRANSITIONS, tr.type || 'fade', v => { tr.type = v; changed(true); }));
    if (tr.type !== 'cut') sec.append(fRange('Length (s)', tr.dur == null ? 0.5 : tr.dur, 0.1, 2, 0.05, v => { tr.dur = v; changed(); }, 's'));
    box.append(sec);
    const back = btn('← Back to scene ' + i, () => { sel = { kind: 'scene', i }; afterSelect(); });
    box.append(back);
  }

  // ---------------- media tray ----------------
  function renderMediaTray() {
    const tray = $('mediaTray'); tray.innerHTML = '';
    const entries = Object.entries(CS.media);
    $('mediaTrayWrap').style.display = entries.length ? '' : 'none';
    for (const [id, m] of entries) {
      const b = h('button', 'mthumb'); b.title = m.name + ' — click to fill the next empty slot';
      const cv = document.createElement('canvas'); cv.width = 74; cv.height = 44;
      const nm = h('span', 'nm', m.name);
      const x = h('button', 'x', '×'); x.title = 'Remove from the project';
      if (m.cut && m.cut.mode !== 'none') b.append(h('span', 'cutdot'));
      b.append(cv, nm, x);
      const draw = () => {
        try {
          const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 74, 44);
          const [w, hh] = LIB.size(m), sc = Math.max(74 / w, 44 / hh);
          g.drawImage(m.el, (74 - w * sc) / 2, (44 - hh * sc) / 2, w * sc, hh * sc);
        } catch (e) {}
      };
      if (LIB.isReady(m)) draw(); else { const ev = m.kind === 'image' ? 'load' : 'loadeddata'; m.el.addEventListener(ev, () => { draw(); dirty = true; }, { once: true }); }
      b.onclick = e => {
        if (e.target === x) { removeMedia(id); return; }
        const s = currentScene();
        if (!s) return toast('Select a scene first');
        const empty = s.slots.find(sl => !sl.m);
        if (empty) { empty.m = id; s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); toast(`${m.name} → next empty slot`); }
        else { const last = s.slots[s.slots.length - 1]; if (last) { last.m = id; s._rev = (s._rev || 0) + 1; changed(true); renderInspector(); toast(`${m.name} → last slot`); } }
      };
      tray.appendChild(b);
    }
  }
  function removeMedia(id) {
    delete CS.media[id];
    for (const s of proj.scenes) for (const sl of s.slots || []) if (sl.m === id) sl.m = null;
    changed(true); renderInspector(); renderMediaTray();
  }
  function pickFiles(accept) {
    return new Promise(res => {
      const f = $('fileMedia'); f.value = '';
      f.accept = accept || 'image/*,video/*';
      f.onchange = () => res([...f.files]);
      f.click();
    });
  }
  function dropFiles(files) {
    let added = 0, firstIds = [];
    for (const f of files) {
      if (f.name.endsWith('.json')) { f.text().then(txt => { try { load(txt); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }).catch(() => {}); continue; }
      if (!/^(image|video)\//.test(f.type)) continue;
      firstIds.push(addMedia(f)); added++;
    }
    if (!added) return;
    const s = currentScene();
    let rest = firstIds;
    if (s) {
      for (const sl of s.slots) { if (!rest.length) break; if (!sl.m) { sl.m = rest.shift(); s._rev = (s._rev || 0) + 1; } }
    }
    if (rest.length) {
      // group the leftovers into one good layout
      const n = rest.length;
      const presetId = n === 1 ? 'photo-full' : n === 2 ? 'split-2-slide' : n === 3 ? 'split-3-columns' : n === 4 ? 'split-4-grid'
        : n <= 6 ? 'grid-3x2-cascade' : n <= 9 ? 'grid-3x3-cascade' : 'grid-4x3-wall';
      const pr = CS.fx.presets.find(p => p.id === presetId);
      const ns = ENG.newScene(presetId);
      ns.preset = presetId;
      ns.slots.forEach((sl, k) => { if (rest[k]) sl.m = rest[k]; });
      const at = sel.kind === 'scene' || sel.kind === 'trans' ? Math.min(proj.scenes.length, sel.i + 1) : proj.scenes.length;
      proj.scenes.splice(at, 0, ns);
      sel = { kind: 'scene', i: at };
      toast(`${n} added as “${pr ? pr.name : presetId}”`);
    } else toast(`${added} added to the selected scene`);
    changed(true); renderInspector(); renderMediaTray();
    const seg = ENG.timeline(proj).segs[sel.i]; if (seg) seekTo(seg.t0 + 0.3, true);
  }

  // ---------------- cut-out editor ----------------
  let cut = null; // { id, mode, pts, tol, feather, cx, cy, rx, ry }
  function openCutEditor(mediaId) {
    const m = CS.media[mediaId];
    if (!m || m.kind !== 'image') return toast('Cut-outs work on photos (videos use the whole frame)');
    const cur = m.cut || { mode: 'none' };
    cut = { id: mediaId, mode: cur.mode === 'none' ? 'auto' : cur.mode, pts: (cur.pts || []).slice(), tol: cur.tol == null ? 0.22 : cur.tol, feather: cur.feather == null ? 1 : cur.feather, cx: cur.cx == null ? 0.5 : cur.cx, cy: cur.cy == null ? 0.45 : cur.cy, rx: cur.rx == null ? 0.34 : cur.rx, ry: cur.ry == null ? 0.42 : cur.ry };
    $('cutName').textContent = m.name;
    $('dlgCut').showModal();
    cutDraw();
    renderCutControls();
  }
  function renderCutControls() {
    const box = $('cutControls'); box.innerHTML = '';
    document.querySelectorAll('[data-cut]').forEach(b => {
      b.classList.toggle('on', b.dataset.cut === cut.mode);
      b.onclick = () => { cut.mode = b.dataset.cut; if (cut.mode === 'lasso' && !cut.pts.length) cut.pts = [[0.3, 0.2], [0.7, 0.2], [0.7, 0.8], [0.3, 0.8]]; renderCutControls(); cutDraw(); };
    });
    if (cut.mode === 'auto') box.append(fRange('Tolerance', cut.tol, 0.05, 0.6, 0.01, v => { cut.tol = v; cutDraw(); }));
    if (cut.mode === 'ellipse') {
      box.append(fRange('Centre X', cut.cx, 0, 1, 0.01, v => { cut.cx = v; cutDraw(); }));
      box.append(fRange('Centre Y', cut.cy, 0, 1, 0.01, v => { cut.cy = v; cutDraw(); }));
      box.append(fRange('Width', cut.rx, 0.05, 0.6, 0.01, v => { cut.rx = v; cutDraw(); }));
      box.append(fRange('Height', cut.ry, 0.05, 0.6, 0.01, v => { cut.ry = v; cutDraw(); }));
    }
    box.append(fRange('Edge softness', cut.feather, 0, 6, 0.5, v => { cut.feather = v; cutDraw(); }));
  }
  function cutDraw() {
    const cv = $('cutCanvas'), g = cv.getContext('2d'), m = CS.media[cut.id];
    if (!m) return;
    const [iw, ih] = LIB.size(m);
    const cw = Math.min(720, cv.width), ch = Math.round(cw * ih / iw);
    cv.width = cw; cv.height = ch;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    // preview: mask in red overlay + dimmed removed area
    g.drawImage(m.el, 0, 0, cw, ch);
    const mask = U.canvas(cw, ch), mg = mask.getContext('2d');
    mg.fillStyle = '#fff';
    if (cut.mode === 'auto') {
      const auto = LIB.autoMask(m, cut.tol, cut.feather);
      mg.drawImage(auto, 0, 0, cw, ch);
    } else if (cut.mode === 'ellipse') {
      mg.beginPath(); mg.ellipse(cut.cx * cw, cut.cy * ch, cut.rx * cw, cut.ry * ch, 0, 0, Math.PI * 2); mg.fill();
      if (cut.feather > 0) { /* soft edge preview via blurCanvas */ const b = LIB.blurCanvas(mask, cut.feather); mg.clearRect(0, 0, cw, ch); mg.drawImage(b, 0, 0); }
    } else if (cut.mode === 'lasso' && cut.pts.length > 2) {
      mg.beginPath(); cut.pts.forEach(([x, y], k) => (k ? mg.lineTo(x * cw, y * ch) : mg.moveTo(x * cw, y * ch))); mg.closePath(); mg.fill();
      if (cut.feather > 0) { const b = LIB.blurCanvas(mask, cut.feather); mg.clearRect(0, 0, cw, ch); mg.drawImage(b, 0, 0); }
    } else { mg.fillRect(0, 0, cw, ch); }
    // dim outside the mask
    const ov = U.canvas(cw, ch), og = ov.getContext('2d');
    og.drawImage(mask, 0, 0);
    og.globalCompositeOperation = 'source-in'; og.fillStyle = 'rgba(229,169,60,.28)'; og.fillRect(0, 0, cw, ch);
    og.globalCompositeOperation = 'source-over';
    // outside = dark
    g.save(); g.globalAlpha = 0.55; g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'multiply'; g.restore();
    // simpler: draw dark veil where mask is empty
    const veil = U.canvas(cw, ch), vg = veil.getContext('2d');
    vg.fillStyle = 'rgba(8,9,12,.72)'; vg.fillRect(0, 0, cw, ch);
    vg.globalCompositeOperation = 'destination-out'; vg.drawImage(mask, 0, 0);
    g.drawImage(veil, 0, 0);
    g.drawImage(ov, 0, 0);
    if (cut.mode === 'lasso') {
      g.strokeStyle = '#e5a93c'; g.lineWidth = 2; g.setLineDash([6, 4]);
      g.beginPath();
      cut.pts.forEach(([x, y], k) => (k ? g.lineTo(x * cw, y * ch) : g.moveTo(x * cw, y * ch)));
      if (cut.pts.length > 2) g.closePath();
      g.stroke(); g.setLineDash([]);
      for (const [x, y] of cut.pts) { g.beginPath(); g.arc(x * cw, y * ch, 4, 0, 7); g.fillStyle = '#e5a93c'; g.fill(); }
    }
    if (cut.mode === 'ellipse') {
      g.strokeStyle = '#e5a93c'; g.lineWidth = 2; g.setLineDash([6, 4]);
      g.beginPath(); g.ellipse(cut.cx * cw, cut.cy * ch, cut.rx * cw, cut.ry * ch, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
  }
  function wireCut() {
    const cv = $('cutCanvas');
    const pos = e => { const r = cv.getBoundingClientRect(); const k = Math.min(r.width / cv.width, r.height / cv.height); const ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2; return [(e.clientX - r.left - ox) / k / cv.width, (e.clientY - r.top - oy) / k / cv.height]; };
    cv.addEventListener('pointerdown', e => {
      if (!cut || cut.mode !== 'lasso') return;
      const [x, y] = pos(e);
      cut.pts.push([U.clamp(x, 0, 1), U.clamp(y, 0, 1)]);
      cutDraw();
    });
    $('cutUndo').onclick = () => { if (cut) { cut.pts.pop(); cutDraw(); } };
    $('cutClose').onclick = () => { if (cut && cut.pts.length > 2) cutDraw(); };
    $('cutApply').onclick = () => {
      const m = CS.media[cut.id];
      if (m) {
        const nc = { mode: cut.mode };
        if (cut.mode === 'auto') { nc.tol = cut.tol; nc.feather = cut.feather; }
        if (cut.mode === 'ellipse') Object.assign(nc, { cx: cut.cx, cy: cut.cy, rx: cut.rx, ry: cut.ry, feather: cut.feather });
        if (cut.mode === 'lasso') { if (cut.pts.length < 3) return toast('Draw at least 3 lasso points first'); nc.pts = cut.pts.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]); nc.feather = cut.feather; }
        m.cut = nc; m.cutVer = (m.cutVer || 1) + 1; m._alpha = undefined;
        for (const s of proj.scenes) s._rev = (s._rev || 0) + 1;
        changed(true); renderMediaTray(); renderInspector();
        toast(cut.mode === 'none' ? 'Whole photo again' : 'Cut-out applied');
      }
      $('dlgCut').close();
    };
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport() {
    const selM = $('exMode');
    selM.innerHTML = '';
    for (const [k, n] of XPT.MODES) { const o = h('option', null, n); o.value = k; selM.append(o); }
    const selR = $('exRange'); selR.innerHTML = '';
    const oA = h('option', null, 'Whole project'); oA.value = 'all'; selR.append(oA);
    ENG.timeline(proj).segs.forEach((sg, i) => { const o = h('option', null, `Scene ${i + 1} only`); o.value = String(i); selR.append(o); });
    const selS = $('exSize'); selS.innerHTML = '';
    const oP = h('option', null, `Same as project (${proj.width}×${proj.height})`); oP.value = `${proj.width}x${proj.height}`; selS.append(oP);
    for (const [k, n] of ENG.SIZES) { if (k !== `${proj.width}x${proj.height}`) { const o = h('option', null, n); o.value = k; selS.append(o); } }
    $('dlgExport').showModal();
    selM.onchange = updateExHint; updateExHint();
  }
  function updateExHint() {
    const mode = $('exMode').value;
    $('exHint').textContent = {
      composite: 'Your scenes exactly as previewed — backgrounds, labels, everything. Silent MP4.',
      green: 'Only the photos/labels (no background) on pure #00FF00 — chroma key it in CapCut. Silent MP4.',
      blue: 'Same, on pure #0000FF. Silent MP4.',
      alpha: 'Photos with real transparency — overlay directly in CapCut/CapCut-style editors. Silent WebM.',
      matte: 'White where the photos are, black elsewhere — use as a track matte. Silent MP4.',
    }[mode] || '';
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value };
    if (r !== 'all') { const sg = tl.segs[+r]; o.from = sg.t0; o.to = sg.t1; }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await XPT.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) $('exStatus').textContent = 'Cancelled.';
      else {
        XPT.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB (silent)`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- templates, tabs ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of CS.templates.LIST) {
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

  function refreshAll() { renderLibrary(); renderTimeline(); renderInspector(); renderMediaTray(); dirty = true; }

  // ---------------- wiring ----------------
  function wire() {
    $('btnPlay').onclick = () => (playing ? pause() : play());
    stage.onclick = () => (playing ? pause() : play());
    $('scrub').oninput = () => { const tl = ENG.timeline(proj); seekTo($('scrub').value / 1000 * tl.total, false); if (playing) pause(); };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { XPT.download(new Blob([serialise(true)], { type: 'application/json' }), (proj.name || 'collage-project').replace(/[\\/:*?"<>|]+/g, '') + '.collage.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; renderInspector(); markCurrentPreset(); };
    $('btnAddScene').onclick = () => addSceneWith(CS.fx.presets.find(p => p.id === 'photo-full'));
    $('btnAddMedia').onclick = async () => dropFiles(await pickFiles());
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    for (const wrap of [$('stageWrap'), $('panelTimeline')]) {
      ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); $('stageWrap').classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); $('stageWrap').classList.remove('drag'); }));
      wrap.addEventListener('drop', e => dropFiles([...e.dataTransfer.files]));
    }
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { seekTo(t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30), true); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSave').click(); }
    });
    addEventListener('resize', () => { if (!mobile()) document.querySelectorAll('.panel').forEach(p => p.classList.remove('show')); else if (!document.querySelector('.panel.show')) showTab('lib'); });
    if (mobile()) showTab('lib');
    wireCut();
    LIB.onReady = () => { dirty = true; renderMediaTray(); queueTimelineThumbs(); };
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.CSAPI = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(CS.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      const tl = ENG.timeline(proj);
      return { duration: tl.total, w: proj.width, h: proj.height, scenes: proj.scenes.length };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    presets: () => CS.fx.presets.map(p => ({ id: p.id, name: p.name, fx: p.fx, family: (CS.fx.byId[p.fx] || {}).family, dur: p.dur, slots: p.slots || (CS.fx.byId[p.fx] || {}).slots })),
    async frame(t, mode = 'composite', quality = 0.92) {
      const c = window.__csCanvas || (window.__csCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, t);
      const rm = mode === 'matte' ? 'matte' : mode === 'composite' ? 'composite' : 'element';
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      ENG.render(g, proj, t, { W: proj.width, H: proj.height, mode: rm });
      if (mode === 'green' || mode === 'blue') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      else if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      return c.toDataURL('image/png'); // PNG always: frame-exact, exact key colours, feeds render.mjs's PNG pipe
    },
    // contact sheet of presets at several progress points (QA)
    sheet(ids, ps = [0.25, 0.5, 0.75, 0.9], W = 480, H = 270, show = true) {
      const pres = (ids || CS.fx.presets.map(p => p.id)).map(id => CS.fx.presets.find(p => p.id === id)).filter(p => p && CS.fx.byId[p.fx]);
      const c = document.getElementById('csSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'csSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d');
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        try { ENG.drawPreset(tg, pr.id, p, W, H); } catch (e) { console.error(pr.id, e); }
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.68)'; g.fillRect(k * W, r * H + H - 20, W, 20);
        g.fillStyle = '#fff'; g.font = '12px monospace';
        g.fillText(`${pr.id}  p=${p}`, k * W + 6, r * H + H - 7);
      }));
      return { ms: Math.round(performance.now() - t0), rows: pres.length };
    },
  };

  // ---------------- start ----------------
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.defaultProject(); applySize(); }
  wire(); refreshAll();
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { D.clear(); CS.look.clear(); dirty = true; renderLibrary(); queueTimelineThumbs(); });
})();
