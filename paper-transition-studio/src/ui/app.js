// Studio UI: effects library, live preview, timeline, inspector, save/open, export.
(() => {
  const U = PT.util, M = PT.materials, ENG = PT.engine, SRC = PT.sources, $ = id => document.getElementById(id);
  const STORE = 'paper-transition-studio:v1';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  let proj, sel = { kind: 'trans', i: 1 }, t = 0, playing = false, last = 0, dirty = true;
  let range = null; // [a, b] preview window while auditioning one transition
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
    PT.media[id] = m;
    return id;
  }
  function restoreMedia(saved) {
    for (const [id, m] of Object.entries(saved || {})) {
      if (PT.media[id]) continue;
      if (m.kind === 'image' && (m.dataUrl || m.url)) {
        const el = new Image(); el.onload = () => { dirty = true; drawTimelineThumbs(); }; el.src = m.dataUrl || m.url;
        PT.media[id] = { kind: 'image', name: m.name, dataUrl: m.dataUrl, el };
      } else if (m.kind === 'video' && m.url) {
        // pipeline renders pass clips as file URLs (render.mjs: media.<id>.path)
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = m.url;
        v.addEventListener('loadeddata', () => { dirty = true; drawTimelineThumbs(); });
        v.addEventListener('seeked', () => { dirty = true; });
        PT.media[id] = { kind: 'video', name: m.name, url: m.url, el: v };
      } else PT.media[id] = { kind: m.kind, name: m.name, missing: true };
    }
  }
  const pickFiles = () => new Promise(res => { const f = $('fileMedia'); f.value = ''; f.onchange = () => res([...f.files]); f.click(); });

  // ---------------- persistence ----------------
  function serialise(withMedia = true) {
    const media = {};
    let budget = 3.5e6;
    for (const s of proj.shots) {
      const id = s.source && s.source.media, m = id && PT.media[id];
      if (!m || media[id]) continue;
      media[id] = { kind: m.kind, name: m.name };
      if (withMedia && m.dataUrl && (withMedia === 'all' || m.dataUrl.length < budget)) { media[id].dataUrl = m.dataUrl; budget -= m.dataUrl.length; }
    }
    return JSON.stringify(Object.assign({}, proj, { media }));
  }
  let saveTimer = 0;
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, serialise(true)); } catch (e) { try { localStorage.setItem(STORE, serialise(false)); } catch (e2) {} } }, 600); }
  function load(data) {
    const p = typeof data === 'string' ? JSON.parse(data) : data;
    if (!p || !Array.isArray(p.shots)) throw new Error('Not a Paper Transition Studio project');
    restoreMedia(p.media); delete p.media;
    // pipeline shorthand: { transition: { preset: 'hole' } } -> the preset's effect, settings and length
    for (const s of p.shots) {
      const tr = s.transition, pr = tr && tr.preset && !tr.fx && PT.fx.presets.find(x => x.id === tr.preset);
      if (pr) Object.assign(tr, { fx: pr.fx, params: Object.assign({}, pr.params, tr.params), duration: tr.duration || pr.dur, seed: tr.seed || 7, sfx: false });
    }
    proj = Object.assign(ENG.defaultProject(), p);
    sel = { kind: proj.shots.length > 1 ? 'trans' : 'shot', i: proj.shots.length > 1 ? 1 : 0 };
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
    if ($('chkSfx').checked) PT.audio.play(proj, t);
  }
  function pause() { playing = false; $('btnPlay').textContent = '▶'; PT.audio.stop(); ENG.syncVideos(proj, t, false); dirty = true; }
  function loop(now) {
    const tl = ENG.timeline(proj), end = range ? range[1] : tl.total;
    if (playing) {
      t += Math.min(0.1, (now - last) / 1000);
      if (t >= end) {
        if ($('chkLoop').checked) { t = range ? range[0] : 0; if ($('chkSfx').checked) PT.audio.play(proj, t); }
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
    const el = seg.kind === 'hold' ? document.querySelector(`.shot[data-i="${seg.shot}"]`) : document.querySelector(`.tr[data-i="${seg.to}"]`);
    if (el) el.classList.add('live');
  }
  function audition(i) {
    const tl = ENG.timeline(proj), s = tl.segs.find(x => x.kind === 'trans' && x.to === i);
    if (!s) return;
    range = [Math.max(0, s.t0 - 0.35), Math.min(tl.total, s.t1 + 0.45)];
    play(range[0]);
  }

  // ---------------- effects library ----------------
  // the user's priority order for transition groups (2026-10-30): Ink, Tear & peel, Strips & shards, Rolls & folds, Crumples, others
  const FAMILY_ORDER = ['Ink', 'Tear & peel', 'Holes', 'Strips & shards', 'Roll & fold', 'Crumple', 'Burn & ink', 'Sweeps', 'Paper extras'];
  const famRank = f => { const i = FAMILY_ORDER.indexOf(f); return i < 0 ? 99 : i; };
  const presets = () => PT.fx.presets.filter(p => PT.fx.byId[p.fx]).map((p, i) => [p, i])
    .sort((a, b) => famRank(PT.fx.byId[a[0].fx].family) - famRank(PT.fx.byId[b[0].fx].family) || a[1] - b[1]).map(x => x[0]);
  const thumbA = (W, H) => M.sheet({ type: 'paper', material: 'newspaper', lang: 'en', crumple: 0.5, seed: 11 }, W, H);
  const thumbB = (W, H) => ENG.solid('#19c24a', W, H);
  function drawPresetThumb(cv, pr, p) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, fx = PT.fx.byId[pr.fx];
    const tr = { fx: pr.fx, params: pr.params, seed: 7, duration: pr.dur };
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    try { ENG.drawTransition(g, tr, p, thumbA(W, H), thumbB(W, H), { type: 'paper', material: 'newspaper' }, { type: 'key' }, W, H, p * pr.dur); }
    catch (e) { console.warn(fx && fx.id, e); }
  }
  function renderLibrary() {
    const fams = ['All'].concat([...new Set(presets().map(p => PT.fx.byId[p.fx].family))]);
    $('libChips').innerHTML = '';
    for (const f of fams) {
      const b = document.createElement('button'); b.className = 'chip' + (f === family ? ' on' : ''); b.textContent = f;
      b.onclick = () => { family = f; renderLibrary(); };
      $('libChips').appendChild(b);
    }
    const grid = $('libGrid'); grid.innerHTML = '';
    const ql = query.toLowerCase();
    const list = presets().filter(p => (family === 'All' || PT.fx.byId[p.fx].family === family) && (!ql || (p.name + ' ' + p.fx + ' ' + (p.note || '') + ' ' + PT.fx.byId[p.fx].family).toLowerCase().includes(ql)));
    const cur = currentTransition();
    const jobs = [];
    for (const pr of list) {
      const card = document.createElement('div'); card.className = 'fxcard' + (cur && cur.preset === pr.id ? ' cur' : ''); card.dataset.preset = pr.id; card.tabIndex = 0; card.title = pr.note || PT.fx.byId[pr.fx].desc;
      const cv = document.createElement('canvas'); cv.width = 192; cv.height = 108;
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = pr.name;
      const add = document.createElement('button'); add.className = 'add'; add.textContent = '+'; add.title = 'Add a new shot with this effect';
      card.append(cv, nm, add); grid.appendChild(card);
      jobs.push(() => drawPresetThumb(cv, pr, 0.5));
      let raf = 0, t0 = 0;
      const anim = now => { const d = pr.dur + 0.5, x = ((now - t0) / 1000) % d; drawPresetThumb(cv, pr, U.clamp(x / pr.dur)); raf = requestAnimationFrame(anim); };
      card.onmouseenter = () => { t0 = performance.now(); raf = requestAnimationFrame(anim); };
      card.onmouseleave = () => { cancelAnimationFrame(raf); drawPresetThumb(cv, pr, 0.5); };
      card.onclick = e => { if (e.target === add) return; applyPreset(pr); };
      card.onkeydown = e => { if (e.key === 'Enter') applyPreset(pr); };
      add.onclick = e => { e.stopPropagation(); addShotWith(pr); };
    }
    const runJobs = () => { const s = performance.now(); while (jobs.length && performance.now() - s < 12) jobs.shift()(); if (jobs.length) setTimeout(runJobs, 0); };
    runJobs();
  }
  function markCurrentPreset() {
    const cur = currentTransition();
    document.querySelectorAll('.fxcard').forEach(c => c.classList.toggle('cur', !!cur && cur.preset === c.dataset.preset));
  }
  function presetTransition(pr) {
    const tr = ENG.newTransition(pr.fx, pr.params, pr.dur);
    tr.preset = pr.id;
    return tr;
  }
  function currentTransition() { return sel.kind === 'trans' && proj.shots[sel.i] ? proj.shots[sel.i].transition : null; }
  function applyPreset(pr) {
    let i = sel.i;
    if (!(i > 0 && proj.shots[i])) i = proj.shots.length > 1 ? 1 : -1;
    if (i < 0) return addShotWith(pr);
    const old = proj.shots[i].transition;
    const tr = presetTransition(pr);
    if (old) { tr.seed = old.seed; tr.sfx = old.sfx; tr.stopMotion = old.stopMotion; }
    proj.shots[i].transition = tr;
    sel = { kind: 'trans', i };
    changed(true); renderInspector(); markCurrentPreset();
    audition(i);
    toast(`${pr.name} → transition ${i}`);
  }
  function nextSource() {
    const last = proj.shots[proj.shots.length - 1];
    if (last && last.source.type === 'key') return { type: 'paper', material: 'white', crumple: 0.65, seed: Math.floor(Math.random() * 999) };
    return { type: 'key', color: '#00ff00' };
  }
  function addShotWith(pr, source) {
    const at = sel.kind === 'shot' || sel.kind === 'trans' ? Math.min(proj.shots.length, sel.i + 1) : proj.shots.length;
    const shot = ENG.newShot(source || nextSource(), 1.2);
    if (at > 0 && pr) shot.transition = presetTransition(pr);
    proj.shots.splice(at, 0, shot);
    if (at === 0 && proj.shots[1] && !proj.shots[1].transition) proj.shots[1].transition = presetTransition(presets()[0]);
    sel = { kind: at > 0 ? 'trans' : 'shot', i: at };
    changed(true); renderInspector();
    if (at > 0) audition(at);
  }

  // ---------------- timeline ----------------
  function renderTimeline() {
    const el = $('timeline'); el.innerHTML = '';
    proj.shots.forEach((s, i) => {
      if (i > 0) {
        const b = document.createElement('button'); b.className = 'tr' + (s.transition ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''); b.dataset.i = i;
        b.onclick = () => { sel = { kind: 'trans', i }; afterSelect(); if (s.transition) audition(i); };
        el.appendChild(b);
      }
      const c = document.createElement('button'); c.className = 'shot' + (sel.kind === 'shot' && sel.i === i ? ' sel' : ''); c.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * proj.height / proj.width);
      const meta = document.createElement('div'); meta.className = 'meta';
      c.append(cv, meta);
      c.onclick = () => {
        sel = { kind: 'shot', i }; range = null;
        const seg = ENG.timeline(proj).segs.find(x => x.kind === 'hold' && x.shot === i);
        if (seg) { t = seg.t0 + Math.min(0.3, (seg.t1 - seg.t0) / 2); if (playing) pause(); }
        afterSelect();
      };
      el.appendChild(c);
    });
    const add = document.createElement('button'); add.className = 'tr'; add.innerHTML = '<span class="ic">＋</span>Add shot';
    add.onclick = () => { sel = { kind: 'shot', i: proj.shots.length - 1 }; addShotWith(PT.fx.presets.find(p => p.id === 'peel-diag')); };
    el.appendChild(add);
    updateTimelineLabels(); drawTimelineThumbs();
  }
  function srcLabel(sp) {
    if (!sp) return '';
    if (sp.type === 'paper') return (M.MATERIALS.find(m => m[0] === sp.material) || [0, 'Paper'])[1].replace(/ \(.*\)/, '');
    if (sp.type === 'image' || sp.type === 'video') { const m = PT.media[sp.media]; return m ? m.name : (sp.type === 'video' ? 'Video (add)' : 'Photo (add)'); }
    return (SRC.TYPES.find(x => x[0] === sp.type) || [0, sp.type])[1];
  }
  function trLabel(tr) {
    if (!tr) return 'Cut';
    const pr = tr.preset && PT.fx.presets.find(p => p.id === tr.preset);
    return pr ? pr.name : (PT.fx.byId[tr.fx] || { name: tr.fx }).name;
  }
  function updateTimelineLabels() {
    proj.shots.forEach((s, i) => {
      const c = document.querySelector(`.shot[data-i="${i}"] .meta`);
      if (c) c.innerHTML = `<b></b><span>${(+s.duration).toFixed(1)}s</span>`, c.querySelector('b').textContent = `${i + 1}. ${srcLabel(s.source)}`;
      const b = document.querySelector(`.tr[data-i="${i}"]`);
      if (b) { b.className = 'tr' + (s.transition ? ' has' : '') + (sel.kind === 'trans' && sel.i === i ? ' sel' : ''); b.innerHTML = `<span class="ic">${s.transition ? '✂' : '｜'}</span><span></span>`; b.lastChild.textContent = s.transition ? `${trLabel(s.transition)} · ${(+s.transition.duration).toFixed(1)}s` : 'Cut'; }
    });
  }
  function drawTimelineThumbs() {
    proj.shots.forEach((s, i) => {
      const cv = document.querySelector(`.shot[data-i="${i}"] canvas`); if (!cv) return;
      try { const src = SRC.render(s.source, 'tl', cv.width, cv.height, 0.5, 1); cv.getContext('2d').drawImage(src, 0, 0); } catch (e) {}
    });
  }
  function afterSelect() { renderTimeline(); renderInspector(); markCurrentPreset(); dirty = true; if (mobile()) showTab('insp'); }

  // ---------------- inspector ----------------
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

  function renderInspector() {
    const box = $('insp'); box.innerHTML = '';
    if (sel.kind === 'project') return projectInspector(box);
    const s = proj.shots[sel.i];
    if (!s) { sel = { kind: 'project' }; return projectInspector(box); }
    if (sel.kind === 'trans') return transInspector(box, s, sel.i);
    shotInspector(box, s, sel.i);
  }

  function projectInspector(box) {
    const sec = section('Project');
    sec.append(fText('Name', proj.name, v => { proj.name = v; $('projName').value = v; queueSave(); }));
    sec.append(fSelect('Frame size', ENG.SIZES, `${proj.width}x${proj.height}`, v => { [proj.width, proj.height] = v.split('x').map(Number); applySize(); changed(true); }));
    sec.append(fSelect('Frame rate', [['24', '24'], ['25', '25'], ['30', '30'], ['50', '50'], ['60', '60']], String(proj.fps), v => { proj.fps = +v; queueSave(); }));
    sec.append(fRange('Stop-motion speed (fps)', proj.stopMotionFps || 12, 6, 24, 1, v => { proj.stopMotionFps = v; changed(); }));
    sec.append(fRange('Sound effects volume', proj.sfxVolume, 0, 1.5, 0.05, v => { proj.sfxVolume = v; queueSave(); }));
    box.append(sec);
    const help = section('How it works');
    help.append(h('p', 'desc', 'A video is a row of shots (paper sheets, photos, videos, colours or green screen). Between two shots sits a paper transition. Pick an effect in the library, tune it here, then Export: the full video, or a single transition as a green-screen / transparent element for CapCut.'));
    box.append(help);
  }

  function sourceFields(sec, sp, s) {
    const up = (k, v, structure) => { sp[k] = v; changed(structure); if (k !== 'zoom') drawTimelineThumbs(); };
    sec.append(fSelect('Shows', SRC.TYPES, sp.type, v => {
      const keep = { paper: { material: 'white', crumple: 0.55, seed: 5 }, image: { media: null, zoom: 0.06 }, video: { media: null }, color: { color: '#202020' }, key: { color: '#00ff00' }, transparent: {} }[v];
      s.source = Object.assign({ type: v }, keep); changed(true); renderInspector();
    }));
    if (sp.type === 'paper') {
      sec.append(fSelect('Paper', M.MATERIALS, sp.material, v => { up('material', v); renderInspector(); }));
      if (sp.material === 'color') sec.append(fColor('Colour', sp.color || '#f0c43c', v => up('color', v)));
      if (sp.material === 'giftwrap') sec.append(fSelect('Pattern', M.GIFT_PATTERNS.map(x => [x, x]), sp.pattern || 'trees', v => up('pattern', v)));
      sec.append(fRange('Crumple', sp.crumple == null ? 0.5 : sp.crumple, 0, 1, 0.01, v => up('crumple', v)));
      if (sp.material === 'newspaper') {
        sec.append(fSelect('Language', [['hi', 'हिन्दी'], ['en', 'English']], sp.lang || 'en', v => up('lang', v)));
        sec.append(fText('Masthead', sp.masthead, v => up('masthead', v)));
        sec.append(fText('Headline', sp.headline, v => up('headline', v), true));
        sec.append(fText('Sub-headline', sp.sub, v => up('sub', v)));
        sec.append(fText('Date line', sp.date, v => up('date', v)));
      }
      if (sp.material === 'notebook') sec.append(fText('Handwritten line', sp.text, v => up('text', v)));
      sec.append(btn('🎲 New paper texture', () => up('seed', Math.floor(Math.random() * 9999))));
    }
    if (sp.type === 'image' || sp.type === 'video') {
      const opts = [['', '— choose —']].concat(Object.entries(PT.media).filter(([, m]) => m.kind === sp.type).map(([id, m]) => [id, (m.missing ? '⚠ ' : '') + m.name]));
      sec.append(fSelect(sp.type === 'video' ? 'Video clip' : 'Photo', opts, sp.media || '', v => { up('media', v || null); }));
      sec.append(btn(`＋ Add ${sp.type === 'video' ? 'video' : 'photo'} file…`, async () => { const fs = await pickFiles(); if (fs[0]) { sp.media = addMedia(fs[0]); changed(true); renderInspector(); } }));
      if (sp.media && PT.media[sp.media] && PT.media[sp.media].missing) sec.append(h('p', 'desc', 'This video is not stored in project files. Add the file again to re-link it.'));
      sec.append(fSelect('Fit', [['cover', 'Fill the frame'], ['contain', 'Show whole picture']], sp.fit || 'cover', v => up('fit', v)));
      sec.append(fRange('Slow zoom (Ken Burns)', sp.zoom || 0, 0, 0.3, 0.01, v => up('zoom', v)));
      const two = h('div', 'two');
      two.append(fRange('Focus X', sp.fx == null ? 0.5 : sp.fx, 0, 1, 0.01, v => up('fx', v)), fRange('Focus Y', sp.fy == null ? 0.5 : sp.fy, 0, 1, 0.01, v => up('fy', v)));
      sec.append(two);
      sec.append(fRange('Printed-on-paper look', sp.print || 0, 0, 1, 0.01, v => up('print', v)));
      if (sp.type === 'video') {
        sec.append(fRange('Start at (s)', sp.start || 0, 0, 120, 0.1, v => up('start', v)));
        sec.append(fCheck('Loop the clip', sp.loop !== false, v => up('loop', v)));
      }
    }
    if (sp.type === 'color') sec.append(fColor('Colour', sp.color, v => up('color', v)));
    if (sp.type === 'key') {
      sec.append(fSelect('Key colour', [['#00ff00', 'Green #00FF00'], ['#0000ff', 'Blue #0000FF'], ['#00b140', 'Chroma green #00B140']], sp.color || '#00ff00', v => up('color', v)));
    }
    if (sp.type === 'paper' || sp.type === 'image') {
      sec.append(fText('Title on the sheet', sp.title, v => up('title', v), true));
      if (sp.title) {
        sec.append(fText('Small line under it', sp.subtitle, v => up('subtitle', v)));
        const two = h('div', 'two');
        two.append(fSelect('Font', [['serif', 'Headline serif'], ['sans', 'Clean sans'], ['hand', 'Handwritten'], ['body', 'Book serif']], sp.font || 'serif', v => up('font', v)), fColor('Text colour', sp.textColor || '#1c1a17', v => up('textColor', v)));
        sec.append(two, fRange('Title size', sp.titleSize || 0.12, 0.05, 0.22, 0.005, v => up('titleSize', v)));
      }
    }
  }

  function shotInspector(box, s, i) {
    const sec = section(`Shot ${i + 1}`);
    sec.append(fRange('On screen for (s)', s.duration, 0, 12, 0.05, v => { s.duration = v; changed(); }, 's'));
    sourceFields(sec, s.source, s);
    box.append(sec);
    elementsInspector(box, s);
    const act = section('Shot');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Duplicate', () => { const c = JSON.parse(JSON.stringify(s)); c.id = U.uid(); proj.shots.splice(i + 1, 0, c); sel = { kind: 'shot', i: i + 1 }; changed(true); renderInspector(); }),
      btn('◀ Move', () => { if (i > 0) { [proj.shots[i - 1], proj.shots[i]] = [proj.shots[i], proj.shots[i - 1]]; sel.i = i - 1; fixFirst(); changed(true); renderInspector(); } }),
      btn('Move ▶', () => { if (i < proj.shots.length - 1) { [proj.shots[i + 1], proj.shots[i]] = [proj.shots[i], proj.shots[i + 1]]; sel.i = i + 1; fixFirst(); changed(true); renderInspector(); } }),
      btn('Delete', () => { if (proj.shots.length < 2) return toast('A project needs at least one shot'); proj.shots.splice(i, 1); fixFirst(); sel = { kind: 'shot', i: Math.max(0, i - 1) }; changed(true); renderInspector(); }, 'btn sm danger'),
    );
    act.append(row); box.append(act);
  }
  // animated paper elements on top of a shot (titles, stamps, notes, marker circles…)
  function elementsInspector(box, s) {
    const els = PT.overlays.of(s);
    const head = section('Elements on this shot');
    const groups = {};
    for (const d of PT.overlays.list) (groups[d.group || 'Elements'] = groups[d.group || 'Elements'] || []).push(d);
    const pick = h('select');
    pick.append(h('option', null, '＋ Add an element…'));
    for (const [g, ds] of Object.entries(groups)) { const og = h('optgroup'); og.label = g; for (const d of ds) { const o = h('option', null, d.name); o.value = d.id; og.append(o); } pick.append(og); }
    pick.onchange = () => { if (!pick.value || !PT.overlays.byId[pick.value]) return; els.push(PT.overlays.create(pick.value)); if (s.duration < 2) s.duration = 2.5; changed(true); renderInspector(); seekShot(s); };
    head.append(pick);
    if (!els.length) head.append(h('p', 'desc', 'Titles, stamps, sticky notes, taped photos, marker circles and more. They animate with a hand-made stop-motion feel.'));
    box.append(head);
    els.forEach((o, k) => {
      const def = PT.overlays.byId[o.kind];
      const sec = section(def ? def.name : o.kind, btn('✕', () => { els.splice(k, 1); changed(); renderInspector(); }, 'btn sm danger'));
      if (!def) { sec.append(h('p', 'desc', 'This element is not available in this build.')); return box.append(sec); }
      const set = (key, v, re) => { o[key] = v; changed(); if (re) renderInspector(); };
      for (const f of def.fields) {
        const v = o[f.key] == null ? def.defaults[f.key] : o[f.key];
        if (f.when && !f.when(o)) continue;
        if (f.type === 'range') sec.append(fRange(f.label, v, f.min, f.max, f.step, x => set(f.key, x)));
        else if (f.type === 'select') sec.append(fSelect(f.label, f.options, String(v), x => set(f.key, x, true)));
        else if (f.type === 'bool') sec.append(fCheck(f.label, v, x => set(f.key, x)));
        else if (f.type === 'color') sec.append(fColor(f.label, v, x => set(f.key, x)));
        else if (f.type === 'text') sec.append(fText(f.label, v, x => set(f.key, x), f.area));
        else if (f.type === 'media') {
          const opts = [['', '— choose photo —']].concat(Object.entries(PT.media).filter(([, m]) => m.kind === 'image').map(([id, m]) => [id, m.name]));
          sec.append(fSelect(f.label, opts, v || '', x => set(f.key, x || null)));
          sec.append(btn('＋ Add photo file…', async () => { const fs = await pickFiles(); if (fs[0]) { o[f.key] = addMedia(fs[0]); changed(); renderInspector(); } }));
        }
      }
      const two = h('div', 'two');
      two.append(fRange('Starts at (s)', o.start || 0, 0, 10, 0.05, x => set('start', x)), fRange('Lasts (0 = to end)', o.length || 0, 0, 10, 0.05, x => set('length', x)));
      sec.append(two);
      box.append(sec);
    });
  }
  function seekShot(s) {
    const i = proj.shots.indexOf(s), seg = ENG.timeline(proj).segs.find(x => x.kind === 'hold' && x.shot === i);
    if (seg) { range = [seg.t0, seg.t1]; play(seg.t0); }
  }
  function fixFirst() {
    // shot 0 never has an incoming transition; a shot moved into the middle keeps or gains one
    if (proj.shots[0]) proj.shots[0].transition = null;
  }

  function transInspector(box, s, i) {
    const tr = s.transition;
    if (!tr) {
      const sec = section(`Between shot ${i} and ${i + 1}`);
      sec.append(h('p', 'desc', 'Hard cut. Pick an effect in the library to add a paper transition here.'));
      sec.append(btn('Add a tear here', () => applyPreset(PT.fx.presets.find(p => p.id === 'peel-diag')), 'btn sm'));
      return box.append(sec);
    }
    const fx = PT.fx.byId[tr.fx];
    if (!fx) { box.append(h('p', 'desc', `Effect "${tr.fx}" is not available in this build.`)); return; }
    const P = ENG.fxParams(tr);
    const sec = section(`Transition ${i} → ${i + 1}`);
    const fxOpts = PT.fx.list.map(f => [f.id, `${f.family} · ${f.name}`]);
    sec.append(fSelect('Effect', fxOpts, tr.fx, v => { tr.fx = v; tr.params = {}; tr.preset = null; tr.duration = PT.fx.byId[v].dur; changed(); renderInspector(); markCurrentPreset(); audition(i); }));
    sec.append(h('p', 'desc', fx.desc || ''));
    sec.append(fRange('Length', tr.duration, 0.2, 6, 0.05, v => { tr.duration = v; changed(); }, 's'));
    box.append(sec);
    const look = section('Settings', btn('▶ Play', () => audition(i)));
    for (const pdef of fx.params) {
      const v = P[pdef.key], set = val => { tr.params[pdef.key] = val; tr.preset = null; changed(); };
      if (pdef.type === 'range') look.append(fRange(pdef.label, v, pdef.min, pdef.max, pdef.step, set));
      else if (pdef.type === 'select') look.append(fSelect(pdef.label, pdef.options, String(v), val => { set(val); if (pdef.key === 'material') renderInspector(); }));
      else if (pdef.type === 'bool') look.append(fCheck(pdef.label, v, set));
      else if (pdef.type === 'color') look.append(fColor(pdef.label, v, set));
    }
    if (fx.reversible) look.append(fCheck('Reverse (paper comes IN instead of going out)', P.reverse, v => { tr.params.reverse = v; changed(); }));
    look.append(fCheck('Stop-motion look (moves in 12 fps steps)', tr.stopMotion, v => { tr.stopMotion = v; changed(); }));
    const seedRow = h('div', 'row gap');
    const seedIn = h('input'); seedIn.type = 'number'; seedIn.value = tr.seed; seedIn.style.width = '90px'; seedIn.oninput = () => { tr.seed = +seedIn.value || 1; changed(); };
    seedRow.append(h('span', 'desc', 'Tear shape'), seedIn, btn('🎲 New tear', () => { tr.seed = Math.floor(Math.random() * 9999) + 1; seedIn.value = tr.seed; changed(); audition(i); }));
    look.append(seedRow);
    box.append(look);
    const snd = section('Sound');
    snd.append(fCheck('Paper sound effect', tr.sfx, v => { tr.sfx = v; queueSave(); }));
    snd.append(fSelect('Sound', PT.audio.KINDS, tr.sfxKind || fx.sfx || 'rip', v => { tr.sfxKind = v; queueSave(); }));
    snd.append(fRange('Loudness', tr.sfxGain == null ? 1 : tr.sfxGain, 0, 2, 0.05, v => { tr.sfxGain = v; queueSave(); }));
    snd.append(btn('🔊 Hear it', () => PT.audio.preview(tr.sfxKind || fx.sfx || 'rip', tr.duration)));
    box.append(snd);
    const ex = section('Use it');
    const row = h('div', 'row gap wrap');
    row.append(
      btn('Export as green-screen element', () => openExport({ mode: 'green', trans: i }), 'btn sm'),
      btn('Remove (hard cut)', () => { s.transition = null; changed(true); renderInspector(); }, 'btn sm danger'),
    );
    ex.append(row); box.append(ex);
  }

  // ---------------- export ----------------
  let exporting = false, cancelExport = false;
  function openExport(pre = {}) {
    const tl = ENG.timeline(proj);
    const mode = $('exMode'); mode.innerHTML = '';
    for (const [k, n] of PT.exporter.MODES) { const o = h('option', null, n); o.value = k; mode.append(o); }
    const rg = $('exRange'); rg.innerHTML = '';
    const o0 = h('option', null, `Whole video (${tl.total.toFixed(1)} s)`); o0.value = 'all'; rg.append(o0);
    tl.segs.filter(s => s.kind === 'trans').forEach(s => { const o = h('option', null, `Only transition ${s.to}: ${trLabel(proj.shots[s.to].transition)}`); o.value = String(s.to); rg.append(o); });
    const sz = $('exSize'); sz.innerHTML = '';
    for (const [k, n] of ENG.SIZES) { const o = h('option', null, n); o.value = k; sz.append(o); }
    sz.value = `${proj.width}x${proj.height}`;
    $('exFps').value = String(proj.fps || 30);
    mode.value = pre.mode || 'composite';
    rg.value = pre.trans != null ? String(pre.trans) : (sel.kind === 'trans' && pre.mode && pre.mode !== 'composite' ? String(sel.i) : 'all');
    const hint = () => {
      const m = mode.value;
      $('exHint').textContent = {
        composite: 'Your shots with the paper effects, as one MP4 (H.264) with sound.',
        green: 'Paper tears away to pure #00FF00 – drop it on top of your clip in CapCut and use Chroma key. Pick one transition as the range.',
        blue: 'Same as green screen but on #0000FF, for scenes that contain green.',
        alpha: 'Paper only, real transparency (WebM VP9 with alpha) – works in Premiere, DaVinci and browsers. CapCut: prefer green screen.',
        matte: 'White = new scene, black = old scene. Use as a track matte / luma mask.',
      }[m];
      if (m !== 'composite' && rg.value === 'all' && rg.options.length > 1) rg.value = rg.options[1].value;
    };
    mode.onchange = hint; hint();
    $('exBar').style.width = '0'; $('exStatus').textContent = '';
    $('dlgExport').showModal();
  }
  async function doExport() {
    if (exporting) { cancelExport = true; return; }
    const tl = ENG.timeline(proj), mode = $('exMode').value, r = $('exRange').value;
    const o = { mode, size: $('exSize').value, fps: +$('exFps').value, audio: $('exAudio').checked };
    if (r !== 'all') {
      const s = tl.segs.find(x => x.kind === 'trans' && x.to === +r);
      o.from = Math.max(0, s.t0 - (mode === 'composite' ? 0.5 : 0.2)); o.to = Math.min(tl.total, s.t1 + 0.6);
      o.firstShot = s.from;
    }
    exporting = true; cancelExport = false; pause();
    $('exGo').textContent = 'Cancel'; $('exStatus').textContent = 'Rendering frames…';
    const t0 = performance.now();
    try {
      const res = await PT.exporter.run(proj, o, f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; $('exStatus').textContent = `Rendering… ${(f * 100).toFixed(0)}%`; }, () => cancelExport);
      if (!res) { $('exStatus').textContent = 'Cancelled.'; }
      else {
        PT.exporter.download(res.blob, res.name);
        $('exStatus').textContent = `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s · ${res.name} · ${(res.blob.size / 1e6).toFixed(1)} MB${o.audio && !res.audio && mode !== 'matte' && mode !== 'alpha' ? ' · this browser could not add sound: use "Sound only (.wav)"' : ''}`;
      }
    } catch (e) { console.error(e); $('exStatus').textContent = 'Export failed: ' + e.message; }
    exporting = false; $('exGo').textContent = 'Export video'; dirty = true;
  }

  // ---------------- dialogs, mobile tabs, toast ----------------
  function openTemplates() {
    const g = $('tplGrid'); g.innerHTML = '';
    for (const tp of PT.templates.LIST) {
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
    $('scrub').oninput = () => { range = null; const tl = ENG.timeline(proj); t = $('scrub').value / 1000 * tl.total; if (playing) { PT.audio.play(proj, t); } dirty = true; };
    $('chkSfx').onchange = () => { if (!$('chkSfx').checked) PT.audio.stop(); else if (playing) PT.audio.play(proj, t); };
    $('selQuality').value = String(q);
    $('selQuality').onchange = () => { q = +$('selQuality').value; applySize(); };
    $('projName').oninput = () => { proj.name = $('projName').value; queueSave(); };
    $('libSearch').oninput = () => { query = $('libSearch').value; renderLibrary(); };
    $('btnTemplates').onclick = openTemplates;
    $('btnExport').onclick = () => openExport();
    $('exGo').onclick = doExport;
    $('exClose').onclick = () => { if (exporting) cancelExport = true; };
    $('exWav').onclick = () => { const tl = ENG.timeline(proj); PT.exporter.download(PT.audio.wav(PT.audio.mix(proj, 0, tl.total)), (proj.name || 'paper') + '_sfx.wav'); };
    $('btnSave').onclick = () => { PT.exporter.download(new Blob([serialise('all')], { type: 'application/json' }), (proj.name || 'paper-project').replace(/[\\/:*?"<>|]+/g, '') + '.paper.json'); toast('Project file downloaded'); };
    $('btnOpen').onclick = () => { const f = $('fileProject'); f.value = ''; f.onchange = async () => { try { load(await f.files[0].text()); toast('Project opened'); } catch (e) { toast('Could not open: ' + e.message); } }; f.click(); };
    $('btnProject').onclick = () => { sel = { kind: 'project' }; afterSelect(); };
    $('btnAddPaper').onclick = () => addShotWith(PT.fx.presets.find(p => p.id === 'peel-diag'), { type: 'paper', material: 'white', crumple: 0.65, seed: Math.floor(Math.random() * 999) });
    $('btnAddKey').onclick = () => addShotWith(PT.fx.presets.find(p => p.id === 'hole'), { type: 'key', color: '#00ff00' });
    $('btnAddMedia').onclick = async () => { for (const f of await pickFiles()) { const id = addMedia(f); addShotWith(PT.fx.presets.find(p => p.id === 'hole'), { type: PT.media[id].kind, media: id, zoom: 0.06 }); } };
    document.querySelectorAll('.mtabs button').forEach(b => (b.onclick = () => showTab(b.dataset.tab)));
    const wrap = $('stageWrap');
    ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
    wrap.addEventListener('drop', e => {
      for (const f of e.dataTransfer.files) {
        if (f.name.endsWith('.json')) { f.text().then(load).catch(err => toast(err.message)); return; }
        if (!/^(image|video)\//.test(f.type)) continue;
        const id = addMedia(f); addShotWith(PT.fx.presets.find(p => p.id === 'hole'), { type: PT.media[id].kind, media: id, zoom: 0.06 });
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
  window.PTS = {
    async load(p) {
      load(p);
      await Promise.all(Object.values(PT.media).filter(m => m.el).map(m => m.kind === 'image'
        ? (m.el.decode ? m.el.decode() : Promise.resolve()).catch(() => {})
        : new Promise(r => { if (m.el.readyState >= 2) return r(); m.el.addEventListener('loadeddata', r, { once: true }); m.el.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
      return { duration: ENG.timeline(proj).total, w: proj.width, h: proj.height };
    },
    project: () => JSON.parse(serialise(false)),
    duration: () => ENG.timeline(proj).total,
    async frame(t, mode = 'composite', quality = 0.92, firstShot = null) {
      const c = window.__ptsCanvas || (window.__ptsCanvas = U.canvas(proj.width, proj.height));
      c.width = proj.width; c.height = proj.height;
      const g = c.getContext('2d');
      await ENG.prepare(proj, t);
      ENG.render(g, proj, t, Object.assign({ W: proj.width, H: proj.height }, PT.exporter.renderOpts(mode, firstShot)));
      if (mode !== 'alpha') { g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
      return c.toDataURL(mode === 'alpha' ? 'image/png' : 'image/jpeg', quality);
    },
    sfxWav() { const b = PT.audio.mix(proj); return b; },
    // contact sheet of presets at several progress points (QA): shows it full-screen, returns ms
    sheet(ids, ps = [0.25, 0.5, 0.75, 0.9], W = 480, H = 270, show = true) {
      const pres = (ids || PT.fx.presets.map(p => p.id)).map(id => PT.fx.presets.find(p => p.id === id)).filter(p => p && PT.fx.byId[p.fx]);
      const c = document.getElementById('ptsSheet') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'ptsSheet' }));
      c.width = W * ps.length; c.height = H * pres.length;
      c.style.cssText = show ? 'position:fixed;left:0;top:0;z-index:9999;width:100vw;background:#000' : 'display:none';
      c.onclick = () => c.remove();
      const g = c.getContext('2d'), A = M.sheet({ type: 'paper', material: 'newspaper', lang: 'hi', crumple: 0.5, seed: 3 }, W, H);
      const B = U.canvas(W, H), bg = B.getContext('2d'), gr = bg.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, '#2b6cb0'); gr.addColorStop(1, '#68d391'); bg.fillStyle = gr; bg.fillRect(0, 0, W, H);
      bg.fillStyle = '#fff'; bg.font = `bold ${H / 7}px sans-serif`; bg.fillText('SCENE B', W * 0.06, H * 0.22);
      const t0 = performance.now(), tc = U.canvas(W, H), tg = tc.getContext('2d');
      pres.forEach((pr, r) => ps.forEach((p, k) => {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, W, H);
        ENG.drawTransition(tg, { fx: pr.fx, params: pr.params, seed: 7, duration: pr.dur }, p, A, B, { type: 'paper', material: 'newspaper' }, { type: 'image' }, W, H, p * pr.dur);
        g.drawImage(tc, k * W, r * H);
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(k * W, r * H, 150, 18); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${pr.id} ${p}`, k * W + 4, r * H + 13);
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { M.clear(); dirty = true; renderLibrary(); drawTimelineThumbs(); });
})();
