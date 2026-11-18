// Studio UI: preset library with live thumbnails, preview stage, timeline, inspector,
// depth editor, templates, save/open + autosave, export. Dark + amber, like the house studios.
(() => {
  const U = PP.util, ENG = PP.engine, $ = id => document.getElementById(id);
  const STORE = 'photo-parallax-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'shot', i: 0 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null;                    // [a, b] preview window while auditioning
  let family = 'All', query = '';
  let pickFocus = false;
  const stage = $('stage'), sctx = stage.getContext('2d');

  // ---------------- media ----------------
  let mediaSeq = 1;
  PP.media = PP.media || {};
  function addMedia(file) {
    const id = 'm' + Date.now().toString(36) + (mediaSeq++);
    const url = URL.createObjectURL(file);
    const m = { kind: 'image', name: file.name, url };
    m.el = new Image(); m.el.onload = () => { dirty = true; drawTimelineThumbs(); }; m.el.src = url;
    if (file.size < 9e6) { const r = new FileReader(); r.onload = () => { m.dataUrl = r.result; queueSave(); }; r.readAsDataURL(file); }
    PP.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (PP.media[id]) continue;
      if (m.dataUrl) {
        const el = new Image();
        el.onload = () => { dirty = true; drawTimelineThumbs(); };
        el.src = m.dataUrl;
        PP.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else PP.media[id] = { kind: 'image', name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 3.5e6;
    for (const s of proj.shots) {
      const id = s.source && s.source.media, m = id && PP.media[id];
      if (!m || media[id]) continue;
      media[id] = { kind: 'image', name: m.name };
      if (withMedia && m.dataUrl && (withMedia === 'all' || m.dataUrl.length < budget)) { media[id].dataUrl = m.dataUrl; budget -= m.dataUrl.length; }
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.shots)) throw new Error('Not a Photo Parallax Studio project');
    restoreMedia(p.media); delete p.media;
    for (const s of p.shots) {
      // pipeline shorthand (parallax_fx.py): { preset: 'push-doc' } fills whatever the shot leaves out
      const pr = s.preset && PP.fx.presets.find(x => x.id === s.preset);
      if (pr) {
        s.move = s.move || { fx: pr.move.fx, params: Object.assign({}, pr.move.params), seed: 3 };
        s.grade = s.grade || Object.assign({}, pr.grade);
        if (!s.atmos && pr.atmos) s.atmos = pr.atmos;
        if (!s.overlays && pr.overlays) s.overlays = pr.overlays;
        if (pr.depth) s.depth = Object.assign({}, pr.depth, s.depth);
        if (pr.subject) s.subject = Object.assign({}, pr.subject, s.subject);
        s.duration = s.duration || pr.dur;
      }
      if (s.atmos) s.atmos = s.atmos.map(a => Object.assign(PP.atmos.create(a.kind) || {}, a));
      if (s.overlays) s.overlays = s.overlays.map(o => Object.assign(PP.overlays.create(o.kind) || {}, o));
      s.depth = Object.assign({ mode: 'auto', bands: 4, parallax: 0.65, strength: 1, focus: [0.5, 0.55], renderer: 'auto', strokes: [] }, s.depth);
      s.overlays = s.overlays || []; s.atmos = s.atmos || [];
      s.grade = Object.assign({ look: 'none', vignette: 0, grain: 0, letterbox: 0, frame: 0, dof: 0 }, s.grade);
      s.move = s.move || { fx: 'push', params: {}, seed: 3 };
    }
    proj = Object.assign(ENG.defaultProject(), p);
    sel = { kind: 'shot', i: 0 };
    t = 0; range = null; pause();
    applySize(); refreshAll();
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
  function pause() { playing = false; $('btnPlay').textContent = '▶'; dirty = true; }
  function loop(now) {
    const tl = ENG.timeline(proj), end = range ? range[1] : tl.total;
    // rAF timestamps can be older than the performance.now() taken in play(): never step backwards
    if (playing) {
      t = Math.max(0, t + U.clamp((now - last) / 1000, 0, 0.1));
      if (t >= end) {
        if ($('chkLoop').checked) t = range ? range[0] : 0;
        else { t = end - 1e-3; pause(); }
      }
    }
    last = now;
    if (playing || dirty) {
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
    const el = seg.kind === 'hold' ? document.querySelector(`.shot[data-i="${seg.shot}"]`) : document.querySelector(`.tr[data-i="${seg.to}"]`);
    if (el) el.classList.add('live');
  }
  function audition(i) {
    const tl = ENG.timeline(proj), s = tl.segs.find(x => x.kind === 'trans' && x.to === i);
    if (!s) return;
    range = [Math.max(0, s.t0 - 0.35), Math.min(tl.total, s.t1 + 0.45)];
    play(range[0]);
  }
  function playShot(i) {
    const tl = ENG.timeline(proj), seg = tl.segs.find(x => x.kind === 'hold' && x.shot === i);
    if (!seg) return;
    range = [seg.t0, seg.t1];
    play(seg.t0);
  }

  // ---------------- library ----------------
  const FAMILY_ORDER = ['Push & pull', 'Truck & pan', 'Tilt & crane', 'Orbit & dolly-zoom', 'Sway & drift', 'Mesh 3D', 'Documentary looks', 'Weather & mood', 'Ken Burns'];
  const famRank = f => { const i = FAMILY_ORDER.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => PP.fx.presets.slice().sort((a, b) => famRank(a.family) - famRank(b.family));
  function presetShot(pr, W, H) {
    const shot = ENG.newShot({ type: 'demo', demo: pr.demo || 'horseman' }, pr.dur || 5);
    shot.move = { fx: pr.move.fx, params: Object.assign({}, pr.move.params), seed: 7 };
    shot.grade = Object.assign({ look: 'none', vignette: 0, grain: 0, letterbox: 0, frame: 0, dof: 0 }, pr.grade);
    if (pr.atmos) shot.atmos = pr.atmos.map(a => Object.assign(PP.atmos.create(a.kind) || {}, a));
    if (pr.overlays) shot.overlays = pr.overlays.map(o => Object.assign(PP.overlays.create(o.kind), o));
    if (pr.depth) shot.depth = Object.assign({}, shot.depth, pr.depth);
    if (pr.subject) shot.subject = Object.assign({}, pr.subject);
    shot.seed = 7;
    return shot;
  }
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d');
    const shot = presetShot(pr, cv.width, cv.height);
    PP.depth.noStart = true;   // thumbnails use cached model depth or the estimate; they never start the model
    try { ENG.renderShot(g, shot, p * shot.duration, cv.width, cv.height, { fps: 30 }); }
    catch (e) { g.fillStyle = '#141821'; g.fillRect(0, 0, cv.width, cv.height); }
    finally { PP.depth.noStart = false; }
  }
  function renderLibrary() {
    const fams = ['All'].concat(FAMILY_ORDER.filter(f => PP.fx.presets.some(p => p.family === f)));
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || p.family === family) && (!ql || (p.name + ' ' + p.note + ' ' + p.family + ' ' + p.move.fx).toLowerCase().includes(ql)));
    const curFx = curShot() && curShot().move && curShot().move.fx;
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div');
      card.className = 'fxcard' + (curFx === pr.move.fx ? ' cur' : '');
      card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note;
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new shot with this look';
      card.append(cv, nm, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.55));
      let raf = 0, t0 = 0;
      const anim = now => { const d = (pr.dur || 5) + 0.6, x = ((now - t0) / 1000) % d; drawPresetThumb(cv, pr, U.clamp(x / (pr.dur || 5))); raf = requestAnimationFrame(anim); };
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
    const s = curShot();
    const fx = s && s.move && s.move.fx;
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!fx && c.dataset.preset && PP.fx.presets.find(p => p.id === c.dataset.preset).move.fx === fx));
  }
  function applyPreset(pr) {
    const s = curShot();
    if (!s) return toast('Select a shot first');
    s.move = { fx: pr.move.fx, params: Object.assign({}, pr.move.params), seed: (s.move && s.move.seed) || 3 };
    s.grade = Object.assign({ look: 'none', vignette: 0, grain: 0, letterbox: 0, frame: 0, dof: 0 }, pr.grade);
    s.atmos = pr.atmos ? pr.atmos.map(a => Object.assign(PP.atmos.create(a.kind) || {}, a)) : [];
    if (pr.overlays) s.overlays = pr.overlays.map(o => Object.assign(PP.overlays.create(o.kind), o));
    if (pr.depth) s.depth = Object.assign({}, s.depth, pr.depth);
    s.subject = pr.subject ? Object.assign({}, pr.subject) : (s.subject ? Object.assign({}, s.subject, { on: false }) : undefined);
    if (pr.dur) s.duration = pr.dur;
    changed(true); renderInspector(); markCurrentPreset();
    playShot(sel.i);
    toast(`${pr.name} → shot ${sel.i + 1}`);
  }
  function nextDemo() {
    const used = proj.shots.map(s => s.source && s.source.demo).filter(Boolean);
    const all = PP.assets.DEMO_INFO.map(d => d[0]);
    for (const d of all) if (!used.includes(d)) return d;
    return all[Math.floor(Math.random() * all.length)];
  }
  function addShotWith(pr, source) {
    const at = sel.kind === 'shot' || sel.kind === 'trans' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
    const shot = ENG.newShot(source || { type: 'demo', demo: (pr && pr.demo) || nextDemo() }, pr ? (pr.dur || 5) : 5);
    if (pr) {
      shot.move = { fx: pr.move.fx, params: Object.assign({}, pr.move.params), seed: 3 };
      shot.grade = Object.assign({ look: 'none', vignette: 0, grain: 0, letterbox: 0, frame: 0, dof: 0 }, pr.grade);
      if (pr.atmos) shot.atmos = pr.atmos.map(a => Object.assign(PP.atmos.create(a.kind) || {}, a));
      if (pr.overlays) shot.overlays = pr.overlays.map(o => Object.assign(PP.overlays.create(o.kind), o));
      if (pr.depth) shot.depth = Object.assign({}, shot.depth, pr.depth);
      if (pr.subject) shot.subject = Object.assign({}, pr.subject);
    }
    if (at > 0) shot.transition = ENG.newTransition('dip');
    proj.shots.splice(at, 0, shot);
    if (proj.shots[0]) proj.shots[0].transition = null;
    sel = { kind: 'shot', i: at };
    changed(true); renderInspector(); markCurrentPreset();
    playShot(at);
  }

  // ---------------- timeline ----------------
  function curShot() { return proj.shots[sel.i]; }
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((s, i) => {
      if (i > 0) {
        const b = document.createElement('button');
        b.className = 'tr' + (s.transition ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''); b.dataset.i = i;
        b.onclick = () => { sel = { kind: 'trans', i }; afterSelect(); if (s.transition) audition(i); };
        el.appendChild(b);
      }
      const c = document.createElement('button');
      c.className = 'shot' + (sel.kind === 'shot' && sel.i === i ? ' sel' : ''); c.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      c.append(cv, meta);
      c.onclick = () => {
        sel = { kind: 'shot', i }; range = null; afterSelect();
        playShot(i); if (playing) pause();
      };
      el.appendChild(c);
    });
    const add = document.createElement('button'); add.className = 'tr'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => addShotWith(null);
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs();
  }
  function shotLabel(s) {
    const mv = PP.fx.byId[(s.move || {}).fx];
    return `${PP.sources.label(s.source)} · ${mv ? mv.name : '—'}`;
  }
  function trLabel(tr) {
    if (!tr) return 'Cut';
    const fx = PP.transitions.byId[tr.fx];
    return fx ? fx.name : tr.fx;
  }
  function updateTimelineLabels() {
    proj.shots.forEach((s, i) => {
      const c = document.querySelector(`.shot[data-i="${i}"] .meta`);
      if (c) {
        c.innerHTML = `<b></b><span>${(+s.duration).toFixed(1)}s</span>`;
        c.querySelector('b').textContent = `${i + 1}. ${shotLabel(s)}`;
      }
      const b = document.querySelector(`.tr[data-i="${i}"]`);
      if (b) {
        b.className = 'tr' + (s.transition ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : '');
        b.innerHTML = `<span class="ic">${s.transition ? '⇄' : '｜'}</span><span></span>`;
        b.lastChild.textContent = s.transition ? `${trLabel(s.transition)} · ${(+s.transition.duration).toFixed(1)}s` : 'Cut';
      }
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((s, i) => {
      const cv = document.querySelector(`.shot[data-i="${i}"] canvas`); if (!cv) return;
      try { cv.getContext('2d').drawImage(PP.sources.thumb(s.source, cv.width, cv.height), 0, 0); } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- inspector helpers ----------------
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function section(title, right) { const s = h('div', 'sec'), t = h('h3'); t.append(title); if (right) t.append(right); s.append(t); return s; }
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

  // ---------------- inspector ----------------
  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project' || !proj.shots[sel.i]) return projectInspector(box);
    if (sel.kind === 'trans') return transInspector(box, proj.shots[sel.i], sel.i);
    shotInspector(box, proj.shots[sel.i], sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    box.append(sec);
    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of shots — one photo each, brought alive with a camera move. Pick a look in the library, tune the move, depth and atmosphere here, then Export the whole video (MP4) or a single shot as a green-screen / transparent element for CapCut. Everything is silent.'));
    help.append(h('p', 'desc', PP.depth.hasAuto() ? '✓ Auto-depth model found — automatic depth estimation is available.' : '✗ Auto-depth model files not found next to the HTML (models/depth-model.js, vendor/ort/ort-assets.js). The built-in depth estimate is used instead.'));
    box.append(help);
  }

  function sourceFields(sec, s) {
    const sp = s.source;
    const up = (k, v, structure) => { sp[k] = v; changed(structure); if (k === 'demo' || k === 'media') { drawTimelineThumbs(); renderInspector(); } };
    sec.append(fSelect('Photo', [['demo', 'Built-in demo scene'], ['image', 'Your photo file']].concat(sp.type === 'color' ? [['color', 'Solid colour']] : []), sp.type, v => {
      if (v === 'demo') s.source = { type: 'demo', demo: 'horseman' };
      else if (v === 'image') s.source = { type: 'image', media: null, fit: 'cover' };
      changed(true); renderInspector(); drawTimelineThumbs();
    }));
    if (sp.type === 'demo') {
      sec.append(fSelect('Scene', PP.assets.DEMO_INFO, sp.demo, v => up('demo', v)));
    }
    if (sp.type === 'image') {
      const opts = [['', '— choose —']].concat(Object.entries(PP.media).filter(([, m]) => m.kind === 'image').map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
      sec.append(fSelect('Photo file', opts, sp.media || '', v => up('media', v || null)));
      sec.append(btn('＋ Add photo file…', async () => { const fs = await pickFiles(); if (fs[0]) { sp.media = addMedia(fs[0]); changed(true); renderInspector(); drawTimelineThumbs(); } }));
      if (sp.media && PP.media[sp.media] && PP.media[sp.media].missing) sec.append(h('p', 'desc', 'This photo is not stored in the project file. Add the file again to re-link it.'));
    }
    if (sp.type === 'image') sec.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole photo']], sp.fit || 'cover', v => up('fit', v)));
  }

  function moveFields(sec, s) {
    const mv = s.move;
    const fx = PP.fx.byId[mv.fx] || PP.fx.byId.push;
    const P = Object.assign({}, fx.defaults, mv.params || {});
    sec.append(fSelect('Camera move', PP.fx.list.map(f => [f.id, `${f.family} · ${f.name}`]), mv.fx, v => {
      s.move = { fx: v, params: {}, seed: mv.seed };
      changed(); renderInspector(); markCurrentPreset(); playShot(sel.i);
    }));
    sec.append(h('p', 'desc', fx.desc || ''));
    const set = (key, val) => { mv.params[key] = val; changed(); };
    for (const pdef of fx.params) {
      if (pdef.key === 'ease') continue;
      const v = P[pdef.key];
      if (pdef.type === 'range') sec.append(fRange(pdef.label, v, pdef.min, pdef.max, pdef.step, set));
      else if (pdef.type === 'select') sec.append(fSelect(pdef.label, pdef.options, String(v), set));
      else if (pdef.type === 'bool') sec.append(fCheck(pdef.label, v, set));
    }
    sec.append(fSelect('Motion', Object.entries(U.EASE_NAMES), P.ease, v => set('ease', v)));
  }

  function depthFields(sec, s) {
    const d = s.depth;
    const set = (k, v, re) => { d[k] = v; changed(); if (re) renderInspector(); };
    sec.append(fSelect('Depth from', [
      ['auto', 'Automatic (depth model)'], ['heuristic', 'Estimate (no model)'], ['flat', 'Flat photo (no layers)'],
    ], d.mode || 'auto', v => { set('mode', v, true); if (v === 'auto') ensureAutoDepth(s); }));
    if ((d.mode || 'auto') === 'auto') {
      const st = h('p', 'desc');
      if (PP.depth.hasAuto()) st.textContent = PP.depth.autoStatus ? PP.depth.autoStatus : 'Model ready — depth is computed once per photo.';
      else st.textContent = 'Model files not found — the built-in estimate is used. (Put models/depth-model.js and vendor/ort/ort-assets.js next to the HTML for real automatic depth.)';
      sec.append(st);
      sec.append(btn('↻ Recompute auto depth', () => { ensureAutoDepth(s, true); }));
    }
    if ((d.mode || 'auto') !== 'flat') {
      sec.append(fRange('Depth layers', d.bands == null ? 4 : d.bands, 1, 8, 1, v => set('bands', v)));
      sec.append(fRange('Parallax strength', d.parallax == null ? 0.65 : d.parallax, 0, 1.5, 0.05, v => set('parallax', v)));
      sec.append(fRange('Depth contrast', d.strength == null ? 1 : d.strength, 0.2, 1.6, 0.05, v => set('strength', v)));
      const two = h('div', 'two');
      two.append(fRange('Focus X', (d.focus || [0.5, 0.55])[0], 0, 1, 0.01, v => { d.focus = [v, (d.focus || [0.5, 0.55])[1]]; changed(); }));
      two.append(fRange('Focus Y', (d.focus || [0.5, 0.55])[1], 0, 1, 0.01, v => { d.focus = [(d.focus || [0.5, 0.55])[0], v]; changed(); }));
      sec.append(two);
      const row = h('div', 'row gap wrap');
      const pick = btn('⊙ Pick focus on stage', () => { pickFocus = true; stage.classList.add('pick'); toast('Click the subject on the stage'); });
      row.append(pick, btn('✎ Paint depth…', () => openDepthEditor(s)));
      sec.append(row);
    }
    sec.append(fSelect('Renderer', [['auto', 'Auto'], ['cutout', 'Layered cut-outs (2D)'], ['mesh', 'Displacement mesh (WebGL 3D)']], d.renderer || 'auto', v => set('renderer', v)));
    if ((d.renderer === 'mesh')) sec.append(h('p', 'desc', 'Mesh mode displaces the photo into a 3D surface from the depth map. Cut-out mode (the classic effect) is the safe fallback.'));
  }

  // Nitish/Dhruv 3-layer frame: clean background + text between + rim-lit cut-out subject
  function subjectFields(sec, s) {
    const o = Object.assign({}, PP.subject.DEF, s.subject || {});
    const set = (k, v, re) => { s.subject = Object.assign({}, PP.subject.DEF, s.subject || {}, { [k]: v }); changed(); if (re) renderInspector(); };
    sec.append(fCheck('Cut the subject out (3-layer frame)', o.on, v => set('on', v, true)));
    if (!o.on) { sec.append(h('p', 'desc', 'Separates the subject by depth: the background is cleaned, softened and tinted; the subject gets a rim glow and its own zoom. Add a "Stencil name / title" text element to put a big name BEHIND the subject. Put the focus point on the subject first.')); return; }
    sec.append(fSelect('Style', [['', '— apply a style —']].concat(PP.subject.STYLES), '', v => {
      if (!v) return; s.subject = Object.assign({}, PP.subject.DEF, s.subject || {}, PP.subject.STYLE_SET[v], { on: true }); changed(); renderInspector();
    }));
    sec.append(fRange('Subject starts at depth (0 = auto)', o.cut, 0, 1, 0.01, v => set('cut', v)));
    sec.append(fRange('Edge softness', o.soft, 0.005, 0.2, 0.005, v => set('soft', v)));
    sec.append(fRange('Subject zoom (pop)', o.pop, 0, 0.3, 0.01, v => set('pop', v)));
    sec.append(fRange('Subject colour (0 = B&W)', o.fgSat, 0, 2, 0.05, v => set('fgSat', v)));
    sec.append(fRange('Subject contrast', o.fgContrast, 0.5, 2, 0.02, v => set('fgContrast', v)));
    sec.append(fColor('Rim colour', o.rim, v => set('rim', v)));
    sec.append(fRange('Rim strength', o.rimAmt, 0, 1.5, 0.05, v => set('rimAmt', v)));
    sec.append(fRange('Rim edge width', o.rimWidth, 0, 2, 0.05, v => set('rimWidth', v)));
    sec.append(fRange('Rim glow', o.rimGlow, 0, 2, 0.05, v => set('rimGlow', v)));
    sec.append(fRange('Background blur', o.bgBlur, 0, 2, 0.05, v => set('bgBlur', v)));
    sec.append(fRange('Background darken', o.bgDim, 0, 0.9, 0.01, v => set('bgDim', v)));
    sec.append(fRange('Background colour (0 = B&W)', o.bgSat, 0, 2, 0.05, v => set('bgSat', v)));
    sec.append(fColor('Background tint', o.bgTint, v => set('bgTint', v)));
    sec.append(fRange('Tint amount', o.bgTintAmt, 0, 1, 0.01, v => set('bgTintAmt', v)));
    sec.append(fRange('Subject sits at depth', o.depth, 0.3, 1, 0.01, v => set('depth', v)));
  }

  function atmosFields(box, s) {
    const groups = {};
    for (const a of PP.atmos.LIST) (groups[a.group] = groups[a.group] || []).push(a);
    const head = section('Atmosphere');
    const pick = h('select');
    pick.append(h('option', null, '＋ Add atmosphere…'));
    for (const [g, as] of Object.entries(groups)) { const og = h('optgroup'); og.label = g; for (const a of as) { const o = h('option', null, a.name); o.value = a.id; og.append(o); } pick.append(og); }
    pick.onchange = () => { if (!pick.value || !PP.atmos.byId[pick.value]) return; s.atmos.push(PP.atmos.create(pick.value)); changed(true); renderInspector(); };
    head.append(pick);
    if (!s.atmos.length) head.append(h('p', 'desc', 'Fog, light rays, embers, rain, snow, dust, bokeh, lightning, light leak and smoke — layered into the depth of the shot.'));
    box.append(head);
    s.atmos.forEach((o, k) => {
      const def = PP.atmos.byId[o.kind];
      const sec = section(def ? def.name : o.kind, btn('✕', () => { s.atmos.splice(k, 1); changed(true); renderInspector(); }, 'btn sm danger'));
      if (!def) { sec.append(h('p', 'desc', 'Not available in this build.')); return box.append(sec); }
      const set = (key, v) => { o[key] = v; changed(); };
      for (const f of def.fields) {
        const v = o[f.key] == null ? (def.fields.find(x => x.key === f.key) || {}).def : o[f.key];
        if (f.type === 'range') sec.append(fRange(f.label, v, f.min, f.max, f.step, x => set(f.key, x)));
        else if (f.type === 'select') sec.append(fSelect(f.label, f.options, String(v), x => set(f.key, x)));
        else if (f.type === 'color') sec.append(fColor(f.label, v, x => set(f.key, x)));
      }
      if (def.depth != null) sec.append(fRange('Sits at depth', o.depth == null ? def.depth : o.depth, 0, 1, 0.01, x => set('depth', x)));
      box.append(sec);
    });
  }

  function gradeFields(sec, s) {
    const g = s.grade;
    const set = (k, v) => { g[k] = v; changed(); };
    sec.append(fSelect('Look', PP.grade.LOOKS, g.look || 'none', v => set('look', v)));
    sec.append(fRange('Vignette', g.vignette || 0, 0, 1, 0.01, v => set('vignette', v)));
    sec.append(fRange('Film grain', g.grain || 0, 0, 1, 0.01, v => set('grain', v)));
    sec.append(fSelect('Letterbox', [['0', 'None'], ['2.39', 'Cinemascope 2.39:1'], ['2', '2:1'], ['1.85', '1.85:1']], String(g.letterbox || 0), v => set('letterbox', +v)));
    sec.append(fRange('Frame border', g.frame || 0, 0, 1, 0.01, v => set('frame', v)));
    if (g.frame > 0) sec.append(fColor('Frame colour', g.frameColor || '#f2ede1', v => set('frameColor', v)));
    sec.append(fRange('Depth-of-field blur', g.dof || 0, 0, 1, 0.01, v => set('dof', v)));
    if (g.dof > 0) sec.append(h('p', 'desc', 'Layers behind the focus point blur — the further, the softer (cut-out renderer).'));
  }

  function overlayFields(box, s) {
    const groups = {};
    for (const o of PP.overlays.LIST) (groups[o.group] = groups[o.group] || []).push(o);
    const head = section('Text elements (in depth)');
    const pick = h('select');
    pick.append(h('option', null, '＋ Add an element…'));
    for (const [g, os] of Object.entries(groups)) { const og = h('optgroup'); og.label = g; for (const o of os) { const op = h('option', null, o.name); op.value = o.id; og.append(op); } pick.append(og); }
    pick.onchange = () => { if (!pick.value || !PP.overlays.byId[pick.value]) return; s.overlays.push(PP.overlays.create(pick.value)); changed(true); renderInspector(); };
    head.append(pick);
    if (!s.overlays.length) head.append(h('p', 'desc', 'Captions with a year chip, name tags, place labels and big titles — placed inside the depth so the subject can pass in front. Hindi and English both work.'));
    box.append(head);
    s.overlays.forEach((o, k) => {
      const def = PP.overlays.byId[o.kind];
      const sec = section(def ? def.name : o.kind, btn('✕', () => { s.overlays.splice(k, 1); changed(true); renderInspector(); }, 'btn sm danger'));
      if (!def) { sec.append(h('p', 'desc', 'Not available in this build.')); return box.append(sec); }
      const set = (key, v, re) => { o[key] = v; changed(); if (re) renderInspector(); };
      for (const f of def.fields) {
        const v = o[f.key] == null ? (def.fields.find(x => x.key === f.key) || {}).def : o[f.key];
        if (f.type === 'range') sec.append(fRange(f.label, v, f.min, f.max, f.step, x => set(f.key, x)));
        else if (f.type === 'select') sec.append(fSelect(f.label, f.options, String(v), x => set(f.key, x, true)));
        else if (f.type === 'color') sec.append(fColor(f.label, v, x => set(f.key, x)));
        else if (f.type === 'text') sec.append(fText(f.label, v, x => set(f.key, x), f.area));
      }
      box.append(sec);
    });
  }

  function shotInspector(box, s, i) {
    const sec = section(`Shot ${i + 1}`);
    sec.append(fRange('On screen for (s)', s.duration, 0.5, 15, 0.1, v => { s.duration = v; changed(); }, 's'));
    sourceFields(sec, s);
    box.append(sec);

    const mv = section('Camera move');
    moveFields(mv, s);
    box.append(mv);

    const dep = section('Depth & layers');
    depthFields(dep, s);
    box.append(dep);

    const sub = section('Subject cut-out');
    subjectFields(sub, s);
    box.append(sub);

    atmosFields(box, s);

    const look = section('Look');
    gradeFields(look, s);
    box.append(look);

    overlayFields(box, s);

    const act = section('Shot');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('▶ Play shot', () => playShot(i), 'btn sm'),
      btn('Duplicate', () => { const c = JSON.parse(JSON.stringify(s)); c.id = U.uid(); proj.shots.splice(i + 1, 0, c); sel = { kind: 'shot', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) { [proj.shots[i - 1], proj.shots[i]] = [proj.shots[i], proj.shots[i - 1]]; sel.i = i - 1; fixFirst(); changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) { [proj.shots[i + 1], proj.shots[i]] = [proj.shots[i], proj.shots[i + 1]]; sel.i = i + 1; fixFirst(); changed(true); renderInspector(); } }),
      btn('Delete', () => { if (proj.shots.length < 2) return toast('A project needs at least one shot'); proj.shots.splice(i, 1); fixFirst(); sel = { kind: 'shot', i: Math.max(0, i - 1) }; changed(true); renderInspector(); }, 'btn sm danger'),
    );
    act.append(row); box.append(act);
  }
  function fixFirst() { if (proj.shots[0]) proj.shots[0].transition = null; }

  function transInspector(box, s, i) {
    const tr = s.transition;
    if (!tr) {
      const sec = section(`Between shot ${i} and ${i + 1}`);
      sec.append(h('p', 'desc', 'Hard cut. Pick a transition to add one here.'));
      sec.append(btn('Add dip to black', () => { s.transition = ENG.newTransition('dip'); changed(true); renderInspector(); }, 'btn sm'));
      return box.append(sec);
    }
    const sec = section(`Transition ${i} → ${i + 1}`);
    sec.append(fSelect('Type', PP.transitions.LIST.map(t => [t.id, t.name]), tr.fx, v => { tr.fx = v; tr.duration = (PP.transitions.byId[v] || {}).dur || tr.duration; changed(); renderInspector(); }));
    sec.append(fRange('Length', tr.duration, 0.15, 3, 0.05, v => { tr.duration = v; changed(); }, 's'));
    const row = h('div', 'row gap');
    row.append(btn('▶ Play', () => audition(i), 'btn sm'), btn('🎲 New shape', () => { tr.seed = Math.floor(Math.random() * 9999) + 1; changed(); }), btn('Remove (hard cut)', () => { s.transition = null; changed(true); renderInspector(); }, 'btn sm danger'));
    sec.append(row);
    box.append(sec);
  }

  // ---------------- auto depth ----------------
  function ensureAutoDepth(s, force) {
    if (!PP.depth.hasAuto()) return;
    if (s.depth.mode !== 'auto') return;
    busy('Computing depth…');
    ENG.prepareAll(proj).then(() => {
      PP.depth.autoStatus = 'Depth model ready — last photo processed.';
      dirty = true; unbusy();
    }).catch(e => { PP.depth.autoStatus = 'Auto depth failed: ' + (e && e.message || e); dirty = true; unbusy(); });
  }
  function busy(msg) { const b = $('busyNote'); b.hidden = false; b.textContent = msg; }
  function unbusy() { $('busyNote').hidden = true; }
  PP.onAutoDepth = () => { dirty = true; };
  PP.onAutoDepthErr = e => { PP.depth.autoStatus = 'Auto depth failed: ' + (e && e.message || e); dirty = true; };

  // ---------------- depth editor ----------------
  let depthCtx = { shot: null, drawing: false, view: 'paint', erase: false, last: null };
  function openDepthEditor(s) {
    depthCtx = { shot: s, drawing: false, view: 'paint', erase: false, last: null };
    $('depthShotName').textContent = `— shot ${proj.shots.indexOf(s) + 1}`;
    $('dlgDepth').showModal();
    // warm the plate + field
    ENG.prepareAll(proj).then(() => { drawDepthEditor(); });
    drawDepthEditor();
  }
  function drawDepthEditor() {
    const s = depthCtx.shot; if (!s) return;
    const cv = $('depthCanvas'), g = cv.getContext('2d');
    let plate = null;
    try { plate = PP.sources.plate(s.source, 1280, 720); } catch (e) {}
    if (!plate) { g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height); return; }
    cv.width = plate.width; cv.height = plate.height;
    const field = PP.depth.field(s, plate, { mediaKey: ENG.mediaKey(s) + '|' + plate.width + 'x' + plate.height, auto: ENG.autoForShot(s, plate) });
    g.drawImage(plate, 0, 0);
    if (depthCtx.view === 'depth' || (s.depth.strokes || []).length) {
      g.globalAlpha = depthCtx.view === 'depth' ? 0.92 : 0.45;
      g.drawImage(PP.depth.colormap(field), 0, 0, cv.width, cv.height);
      g.globalAlpha = 1;
    }
  }
  function wireDepthEditor() {
    const cv = $('depthCanvas');
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    const down = e => {
      e.preventDefault();
      depthCtx.drawing = true;
      const [x, y] = pos(e.touches ? e.touches[0] : e);
      const s = depthCtx.shot; if (!s) return;
      const d = s.depth; d.strokes = d.strokes || [];
      d.strokes.push({ pts: [[x, y]], w: +$('brushSize').value, depth: +$('brushDepth').value, op: depthCtx.erase ? 'sub' : 'add', __live: true });
      drawDepthEditor();
    };
    const move = e => {
      if (!depthCtx.drawing) return;
      e.preventDefault();
      const [x, y] = pos(e.touches ? e.touches[0] : e);
      const s = depthCtx.shot; if (!s) return;
      const st = (s.depth.strokes || []).slice(-1)[0];
      if (st) { st.pts.push([x, y]); drawDepthEditor(); }
    };
    const up = () => {
      if (!depthCtx.drawing) return;
      depthCtx.drawing = false;
      const s = depthCtx.shot;
      if (s) { for (const st of s.depth.strokes || []) delete st.__live; changed(); dirty = true; }
      drawDepthEditor();
      updateDepthStatus();
    };
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move);
    addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false });
    cv.addEventListener('touchmove', move, { passive: false });
    cv.addEventListener('touchend', up);
    $('brushDepth').oninput = () => { $('brushDepthVal').textContent = (+$('brushDepth').value).toFixed(2); };
    $('brushSize').oninput = () => { $('brushSizeVal').textContent = (+$('brushSize').value).toFixed(3); };
    $('brushSoft').oninput = () => { $('brushSoftVal').textContent = (+$('brushSoft').value).toFixed(2); };
    $('brushDepthVal').textContent = (+$('brushDepth').value).toFixed(2);
    $('brushSizeVal').textContent = (+$('brushSize').value).toFixed(3);
    $('brushSoftVal').textContent = (+$('brushSoft').value).toFixed(2);
    $('brushErase').onclick = () => { depthCtx.erase = !depthCtx.erase; $('brushErase').textContent = 'Erase: ' + (depthCtx.erase ? 'on' : 'off'); };
    $('depthView').onclick = () => { depthCtx.view = depthCtx.view === 'paint' ? 'depth' : 'paint'; $('depthView').textContent = 'View: ' + depthCtx.view; drawDepthEditor(); };
    $('depthClear').onclick = () => { const s = depthCtx.shot; if (s) { s.depth.strokes = []; changed(); dirty = true; drawDepthEditor(); updateDepthStatus(); } };
    $('depthAuto').onclick = () => {
      const s = depthCtx.shot; if (!s) return;
      s.depth.mode = 'auto';
      if (!PP.depth.hasAuto()) { toast('Model files not found — using the built-in estimate'); return; }
      busy('Computing depth…');
      ENG.prepareAll(proj).then(() => { dirty = true; unbusy(); drawDepthEditor(); updateDepthStatus(); }).catch(e => { unbusy(); toast('Depth failed: ' + e.message); });
    };
    $('depthClose').onclick = () => { $('dlgDepth').close(); renderInspector(); dirty = true; };
  }
  function updateDepthStatus() {
    const s = depthCtx.shot;
    if (!s) return;
    const n = (s.depth.strokes || []).length;
    $('depthStatus').textContent = n ? `${n} stroke${n > 1 ? 's' : ''} painted. Close to see them move.` : 'No strokes yet — paint what is near you.';
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of PP.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    proj.shots.forEach((s, i) => { const o = h('option', null, `Shot ${i + 1} only — ${shotLabel(s)}`); o.value = String(i); rg.append(o); });
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.shot != null ? String(pre.shot) : (sel.kind === 'shot' ? String(sel.i) : 'all');
    const hint = () => {
      const m = mode.value;
      $('exCard').parentElement.style.display = m === 'composite' ? 'none' : 'flex';
      $('exHint').textContent = {
        composite: 'The whole video as one silent MP4 (H.264): your photos with their camera moves, atmosphere and looks.',
        green: 'The shot as a moving photo card on pure #00FF00 — drop it over your footage in CapCut and use Chroma key.',
        blue: 'Same, on #0000FF, for scenes that contain green.',
        alpha: 'The moving card with real transparency (WebM VP9 alpha) — for Premiere, DaVinci and browsers.',
        matte: 'White card on black — use as a track matte / luma mask.',
      }[m];
    };
    mode.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value, card: $('exCard').checked, margin: +$('exMargin').value, round: +$('exRound').value };
    if (r !== 'all') {
      const i = +r, [w0, w1] = ENG.shotWindow(tl, i);
      o.from = w0; o.to = w1;
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await PP.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        PP.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB (silent)`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of PP.templates.LIST) {
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
  function toast(msg) { const e = $('toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2400); }

  function refreshAll() { renderLibrary(); renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; }

  // ---------------- wiring ----------------
  function wire() {
    $('btnPlay').onclick = () => (playing ? pause() : play());
    stage.onclick = e => {
      if (pickFocus) {
        const r = stage.getBoundingClientRect();
        const fx = U.clamp((e.clientX - r.left) / r.width), fy = U.clamp((e.clientY - r.top) / r.height);
        const s = curShot();
        if (s) { s.depth.focus = [fx, fy]; changed(); renderInspector(); toast(`Focus set to ${fx.toFixed(2)}, ${fy.toFixed(2)}`); }
        pickFocus = false; stage.classList.remove('pick');
        return;
      }
      playing ? pause() : play();
    };
    $('scrub').oninput = () => { range = null; const tl = ENG.timeline(proj); t = $('scrub').value / 1000 * tl.total; dirty = true; };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('btnSave').onclick = () => { PP.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'parallax-project').replace(/[\\/:*?"<>|]+/g, '') + '.parallax.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddPhoto').onclick = async () => { const fs = await pickFiles(); for (const f of fs) { const id = addMedia(f); addShotWith(null, { type: 'image', media: id, fit: 'cover' }); } };
    $('btnAddDemo').onclick = () => addShotWith(null, { type: 'demo', demo: nextDemo() });
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^image\//.test(f.type)) continue;
        const id = addMedia(f);
        addShotWith(null, { type: 'image', media: id, fit: 'cover' });
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
    wireDepthEditor();
  }

  // ---------------- headless hook (pipeline rendering) ----------------
  window.PPS = {
    async load(p) {
      load(p);
      const jobs = [ENG.prepareAll(proj)];
      for (const [id, m] of Object.entries(PP.media)) if (m.el && !m.el.width) jobs.push(new Promise(r => { m.el.onload = m.el.onerror = r; }));
      jobs.push(document.fonts.ready.then(() => { PP.sources && null; }).catch(() => {}));
      await Promise.all(jobs);
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(t, mode = 'composite', quality = 0.92) {
      const c = window.__ppsCanvas || (window.__ppsCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, t);
      PP.engine.render(g, proj, t, { W: proj.width, H: proj.height });
      if (mode === 'green' || mode === 'blue' || mode === 'matte' || mode === 'alpha') {
        const el = PP.exporter.elementize(c, mode, proj.width, proj.height, { margin: 0.12, round: 0.035 });
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(el, 0, 0);
      } else {
        g.globalCompositeOperation = 'destination-over';
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        g.globalCompositeOperation = 'source-over';
      }
      return c.toDataURL(mode === 'alpha' ? 'image/png' : 'image/jpeg', quality);
    },
    // contact sheet of presets at several progress points (QA)
    sheet(ids, ps = [0.25, 0.45, 0.65, 0.85], W = 480, H = 270, show = true) {
      const pres = (ids && ids.length ? ids : PP.fx.presets.map(p => p.id)).map(id => PP.fx.presets.find(p => p.id === id)).filter(p => p && PP.fx.byId[p.move.fx]);
      const c = document.getElementById('ppsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'ppsSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d'), tc = U.canvas(W, H), tg = tc.getContext('2d');
      const t0 = performance.now();
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, W, H);
        try { ENG.renderShot(tg, presetShot(pr, W, H), p * (pr.dur || 5), W, H, { fps: 30 }); } catch (e) {}
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, 190, 18);
        g.fillStyle = '#fff'; g.font = '12px sans-serif';
        g.fillText(`${pr.id}  p=${p}`, k * W + 4, r * H + 13);
      }));
      return { ms: Math.round(performance.now() - t0), rows: pres.length };
    },
    presets: () => PP.fx.presets.map(p => ({ id: p.id, name: p.name, family: p.family, move: p.move.fx, dur: p.dur })),
  };

  // ---------------- start ----------------
  async function boot() {
    let saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) {}
    try { if (saved && !window.__HEADLESS) load(saved); else throw 0; } catch (e) { proj = ENG.defaultProject(); applySize(); }
    wire(); refreshAll();
    requestAnimationFrame(loop);
    // preload demo photos + fonts, then refresh thumbnails
    await Promise.all(PP.assets.DEMO_INFO.map(d => PP.assets.demoImage(d[0]).catch(() => {})));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    dirty = true; renderLibrary(); drawTimelineThumbs();
    addEventListener('pp-depth-ready', () => { dirty = true; });
    // model depth for the first shot only; other shots get theirs when they are shown (each run blocks the page)
    if (PP.depth.hasAuto()) {
      ENG.prepare(proj, 0).then(() => { dirty = true; }).catch(() => {});
    }
  }
  boot();

  window.__MAS_BRIDGE_STATE = {
    id: 'photo-parallax-studio',
    engine: ENG,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { range = null; t = U.clamp(+v || 0, 0, ENG.timeline(proj).total); dirty = true; },
    isPlaying: () => playing,
    play: () => play(),
    pause: () => pause(),
    getDuration: () => ENG.timeline(proj).total,
    selectLayer: idx => { if (proj.shots[idx]) { sel = { kind: 'shot', i: idx }; afterSelect(); } },
    addLayer: (id) => { const pr = PP.fx.presets.find(p => p.id === id) || PP.fx.presets[0]; addShotWith(pr); },
    getAddableTypes: () => PP.fx.presets.slice(0, 24).map(p => ({ id: p.id, name: p.name, desc: p.family, group: p.family, icon: '▣' })),
    getMediaList: () => Object.entries(PP.media || {}).map(([id, m]) => ({ id, name: m.name || id, kind: 'image', src: m.dataUrl || m.url || '' })),
    uploadMedia: async files => { for (const f of files) { const id = addMedia(f); proj.shots.push(ENG.newShot({ type: 'media', media: id }, 5)); } changed(true); refreshAll(); },
    useMedia: (id, asNew) => { if (asNew) proj.shots.push(ENG.newShot({ type: 'media', media: id }, 5)); else if (curShot()) curShot().source = { type: 'media', media: id }; changed(true); refreshAll(); },
    changed: (full) => { changed(Boolean(full)); if (full) refreshAll(); },
  };

})();
