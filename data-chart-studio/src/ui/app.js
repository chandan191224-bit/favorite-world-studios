// Editor UI: chart library, stage + transport, scenes strip, inspector (Data / Text / Numbers / Style / Animate), export.
(() => {
  if (window.__HEADLESS) return;
  const U = DC.util, E = DC.engine, $ = id => document.getElementById(id);
  const stage = $('stage'), sctx = stage.getContext('2d');
  DC.media = DC.media || {};
  let proj, sel = 0, t = 0, playing = false, dirty = true, tab = 'data', lastTs = 0;
  const undo = [];
  let undoTimer = 0, saveTimer = 0, thumbTimer = 0;

  // ---------- helpers ----------
  const scene = () => proj.scenes[sel];
  const tl = () => E.timeline(proj);
  const fmtT = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2600); }
  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) e.setAttribute(k, v); }
    for (const kd of kids.flat()) if (kd != null) e.append(kd.nodeType ? kd : document.createTextNode(kd));
    return e;
  }
  function snapshot() { return JSON.stringify(proj); }
  function commit(opts = {}) {
    if (!undoTimer) undo.push(commit.before || snapshot());
    if (undo.length > 60) undo.shift();
    clearTimeout(undoTimer); undoTimer = setTimeout(() => { undoTimer = 0; commit.before = snapshot(); }, 700);
    dirty = true;
    clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 800);
    clearTimeout(thumbTimer); thumbTimer = setTimeout(() => renderScenes(), opts.fast ? 50 : 500);
  }
  function autosave() { try { localStorage.setItem('dcs.autosave', JSON.stringify(serial())); } catch (e) { /* storage full / blocked: the Save button still works */ } }
  function serial() {
    const media = {};
    for (const s of proj.scenes) if (s.bgImage && DC.media[s.bgImage]) media[s.bgImage] = { kind: 'image', dataUrl: DC.media[s.bgImage].dataUrl };
    return Object.assign({}, proj, { media });
  }
  async function loadMedia(media = {}) {
    await Promise.all(Object.entries(media).map(([id, m]) => new Promise(res => {
      if (!m.dataUrl) return res();
      const img = new Image(); img.onload = img.onerror = () => res(); img.src = m.dataUrl; DC.media[id] = { el: img, dataUrl: m.dataUrl };
    })));
  }
  function setProject(p, keepTime) {
    proj = p; proj.scenes = (proj.scenes || []).map(s => E.newScene(s));
    if (!proj.scenes.length) proj.scenes.push(E.fromPreset('bars-states'));
    proj.transition = proj.transition || { type: 'fade', duration: 0.5 };
    sel = Math.min(sel, proj.scenes.length - 1); if (!keepTime) t = 0;
    commit.before = snapshot();
    $('projName').value = proj.name || '';
    $('selTrans').value = proj.transition.type;
    const wrap = $('stageWrap'); wrap.classList.toggle('vertical', proj.height > proj.width); wrap.classList.toggle('square', proj.height === proj.width);
    renderScenes(); renderInsp(); dirty = true;
  }
  window.DCApp = { setProject, get project() { return proj; } };

  // ---------- library ----------
  let famFilter = 'All';
  const libThumbs = new Map();
  function renderLib() {
    const fams = ['All', 'Hindi', ...new Set(DC.charts.presets.map(p => DC.charts.byId[p.chart].family))];
    $('libChips').replaceChildren(...fams.map(f => el('button', { class: 'chip' + (f === famFilter ? ' on' : ''), onclick: () => { famFilter = f; renderLib(); } }, f)));
    const q = $('libSearch').value.trim().toLowerCase();
    const list = DC.charts.presets.filter(p => {
      const c = DC.charts.byId[p.chart];
      if (famFilter === 'Hindi' && p.lang !== 'hi') return false;
      if (famFilter !== 'All' && famFilter !== 'Hindi' && c.family !== famFilter) return false;
      return !q || [p.name, p.id, p.chart, c.name, c.family, p.title, p.theme].join(' ').toLowerCase().includes(q);
    });
    $('libGrid').replaceChildren(...list.map(p => {
      const cv = el('canvas', { width: 256, height: 144 });
      const card = el('div', { class: 'fxcard', role: 'button', tabindex: 0, title: 'Load into the selected scene' }, cv,
        el('span', { class: 'nm' }, p.name), el('span', { class: 'fam' }, `${DC.charts.byId[p.chart].name} · ${p.theme}`),
        el('button', { class: 'add', title: 'Add as a new scene', onclick: e => { e.stopPropagation(); addScene(p.id); } }, '+'));
      card.addEventListener('click', () => usePreset(p.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') usePreset(p.id); });
      let anim = 0;
      card.addEventListener('mouseenter', () => { const t0 = performance.now(); const sc = E.fromPreset(p.id); const loop = now => { drawThumb(cv, sc, ((now - t0) / 1000) % sc.duration); anim = requestAnimationFrame(loop); }; anim = requestAnimationFrame(loop); });
      card.addEventListener('mouseleave', () => { cancelAnimationFrame(anim); drawThumb(cv, E.fromPreset(p.id), E.fromPreset(p.id).duration * 0.9); });
      libThumbs.set(cv, p.id);
      return card;
    }));
    queueThumbs();
  }
  function drawThumb(cv, sc, tt) { E.render(cv.getContext('2d'), { width: cv.width, height: cv.height, scenes: [sc], transition: { type: 'cut' } }, tt, { W: cv.width, H: cv.height }); }
  function queueThumbs() {
    const todo = [...libThumbs.entries()].filter(([cv]) => cv.isConnected && !cv.dataset.done);
    const step = () => { const job = todo.shift(); if (!job) return; const [cv, id] = job; const sc = E.fromPreset(id); drawThumb(cv, sc, sc.duration * 0.9); cv.dataset.done = 1; setTimeout(step, 0); };
    step();
  }
  function usePreset(id) {
    const old = scene(), s = E.fromPreset(id); s.id = old.id;
    proj.scenes[sel] = s; t = tl().segs[sel].t0; commit({ fast: true }); renderInsp(); playing = true; setPlay();
    toast('Loaded “' + DC.charts.presetById[id].name + '” — paste your numbers under Data');
  }
  function addScene(id) {
    proj.scenes.splice(sel + 1, 0, E.fromPreset(id)); sel++; t = tl().segs[sel].t0; commit({ fast: true }); renderInsp(); playing = true; setPlay();
  }

  // ---------- scenes strip ----------
  function renderScenes() {
    const segs = tl().segs;
    $('timeline').replaceChildren(...proj.scenes.map((s, i) => {
      const cv = el('canvas', { width: 192, height: proj.height > proj.width ? 341 : 108 });
      const c = DC.charts.byId[s.chart];
      const card = el('button', { class: 'shot scene' + (i === sel ? ' sel' : ''), title: 'Select scene', onclick: () => { sel = i; t = segs[i].t0 + 0.001; dirty = true; renderScenes(); renderInsp(); } }, cv,
        el('span', { class: 'meta' }, el('b', {}, s.title || (c ? c.name : s.chart)), el('i', {}, (+s.duration).toFixed(1) + 's')));
      setTimeout(() => E.render(cv.getContext('2d'), { width: cv.width, height: cv.height, scenes: [s], transition: { type: 'cut' } }, s.duration * 0.9, { W: cv.width, H: cv.height }), 0);
      return card;
    }));
  }
  $('btnDup').onclick = () => { const c = E.newScene(JSON.parse(JSON.stringify(scene()))); c.id = U.uid(); proj.scenes.splice(sel + 1, 0, c); sel++; commit({ fast: true }); renderInsp(); };
  $('btnDel').onclick = () => { if (proj.scenes.length < 2) return toast('A project needs at least one scene'); proj.scenes.splice(sel, 1); sel = Math.max(0, sel - 1); commit({ fast: true }); renderInsp(); };
  $('btnLeft').onclick = () => { if (sel < 1) return; [proj.scenes[sel - 1], proj.scenes[sel]] = [proj.scenes[sel], proj.scenes[sel - 1]]; sel--; commit({ fast: true }); };
  $('btnRight').onclick = () => { if (sel >= proj.scenes.length - 1) return; [proj.scenes[sel + 1], proj.scenes[sel]] = [proj.scenes[sel], proj.scenes[sel + 1]]; sel++; commit({ fast: true }); };
  $('selTrans').onchange = e => { proj.transition.type = e.target.value; if (!proj.transition.duration) proj.transition.duration = 0.5; commit(); };

  // ---------- inspector ----------
  function fld(label, input, hint) { return el('label', { class: 'fld' }, el('span', {}, label), input, hint ? el('small', { class: 'hint' }, hint) : null); }
  function sec(title, ...kids) { return el('div', { class: 'sec' }, el('h3', {}, title), ...kids); }
  // control bound to obj[key]
  function ctl(obj, key, spec, after) {
    const v = obj[key] === undefined ? spec.def : obj[key];
    const set = val => { obj[key] = val; commit(); if (after) after(val); };
    if (spec.type === 'check') { const i = el('input', { type: 'checkbox' }); i.checked = !!v; i.onchange = () => set(i.checked); return el('label', { class: 'tog' }, i, ' ' + spec.label); }
    if (spec.type === 'select') {
      const s = el('select', {}, ...spec.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; const op = el('option', { value: val }, lab); if (String(val) === String(v)) op.selected = true; return op; }));
      s.onchange = () => set(s.value); return fld(spec.label, s);
    }
    if (spec.type === 'range') {
      const out = el('i', {}, String(v)), i = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step || 0.01, value: v });
      i.oninput = () => { out.textContent = i.value; set(+i.value); };
      return el('label', { class: 'fld' }, el('span', {}, spec.label, out), i);
    }
    if (spec.type === 'number') { const i = el('input', { type: 'number', min: spec.min, max: spec.max, step: spec.step || 'any', value: v }); i.oninput = () => i.value !== '' && set(+i.value); return fld(spec.label, i); }
    if (spec.type === 'color') { const i = el('input', { type: 'color', value: v || '#f2a93b' }); i.oninput = () => set(i.value); return fld(spec.label, i); }
    if (spec.type === 'area') { const i = el('textarea', { rows: 2 }); i.value = v || ''; i.oninput = () => set(i.value); return fld(spec.label, i, spec.hint); }
    const i = el('input', { type: 'text', value: v == null ? '' : v, placeholder: spec.ph || '', list: spec.list || null }); i.oninput = () => set(i.value); return fld(spec.label, i, spec.hint);
  }
  const TIMING = new Set(['intro', 'build', 'stagger', 'ease']);
  const SHAPE_HELP = {
    table: 'First column = names (country, state, item). Next column = the number. Optional columns: flag (in, cn, us…), color (#hex), note, icon, unit, prefix.',
    series: 'First column = years (or dates). One column per line / competitor. Optional rows: #flag (in, cn…) and #color (#hex) under the header.',
    points: 'Columns: name, x, y, size (bubble), group. Optional color, flag.',
  };
  function anchorNames(s) {
    const env = E.makeEnv(s, s.duration, 1920, 1080), c = U.canvas(4, 4).getContext('2d');
    try { env.chart.draw(c, env); } catch (e) { /* bad data: no anchors */ }
    return Object.keys(env.anchors);
  }
  function renderInsp() {
    document.querySelectorAll('#inspTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const s = scene(), chart = DC.charts.byId[s.chart], box = $('insp');
    const kids = [];
    if (tab === 'data') {
      kids.push(sec('Chart', ctl(s, 'chart', { type: 'select', label: 'Chart type (keeps your data)', options: DC.charts.list.map(c => [c.id, `${c.family} · ${c.name}`]) }, () => renderInsp()),
        el('p', { class: 'desc' }, SHAPE_HELP[chart.shape] || '')));
      kids.push(sec('Data', dataGrid(s),
        el('div', { class: 'row gap wrap' },
          el('button', { class: 'btn sm ghost', type: 'button', onclick: () => editRows(s, r => r.push(r[0].map(() => ''))) }, '+ Row'),
          el('button', { class: 'btn sm ghost', type: 'button', onclick: () => editRows(s, r => r.forEach((row, i) => row.push(i ? '' : 'new'))) }, '+ Column'),
          el('button', { class: 'btn sm ghost', type: 'button', onclick: () => editRows(s, r => r[0].length > 2 && r.forEach(row => row.pop())) }, '− Column'),
          el('button', { class: 'btn sm ghost', type: 'button', onclick: () => $('fileCsv').click() }, 'Import CSV')),
        (() => { const ta = el('textarea', { class: 'csv', spellcheck: 'false', 'aria-label': 'Data as CSV' }); ta.value = s.csv; ta.oninput = () => { s.csv = ta.value; commit(); ta.dataset.dirty = 1; }; ta.onblur = () => { if (ta.dataset.dirty) renderInsp(); }; return fld('Or paste CSV / Excel / Google Sheets rows here', ta); })()));
    } else if (tab === 'text') {
      kids.push(sec('Text', ctl(s, 'title', { label: 'Title' }), ctl(s, 'subtitle', { label: 'Subtitle' }), ctl(s, 'source', { label: 'Source line (bottom)', ph: 'Source: …' }),
        ctl(s, 'titleAlign', { type: 'select', label: 'Title position', options: ['left', 'center'] }),
        ctl(s, 'lang', { type: 'select', label: 'Number words', options: [['en', 'English (crore, lakh, billion)'], ['hi', 'Hindi (करोड़, लाख, अरब)']] }),
        el('p', { class: 'desc' }, 'Type Hindi (Devanagari) or English anywhere — both fonts are built in.')));
    } else if (tab === 'numbers') {
      const f = s.format = s.format || {}, ex = el('p', { class: 'desc' });
      const upd = () => { ex.textContent = 'Example: ' + DC.format.fmt(12345678.9, f, 12345678.9, s.lang) + '  ·  ' + DC.format.fmt(0.4567, f, 0.4567, s.lang); };
      upd();
      kids.push(sec('Number format', ex,
        el('div', { class: 'two' }, ctl(f, 'prefix', { label: 'Before (₹, $)', def: '' }, upd), ctl(f, 'suffix', { label: 'After (%, ×)', def: '' }, upd)),
        ctl(f, 'unit', { label: 'Unit word (crore, करोड़, T, km²)', def: '' }, upd),
        ctl(f, 'auto', { type: 'select', label: 'Shorten big numbers', def: 'none', options: [['none', 'No'], ['indian', 'Indian: lakh / crore / lakh crore'], ['intl', 'International: thousand / million / billion / trillion']] }, upd),
        ctl(f, 'unitStyle', { type: 'select', label: 'Unit style', def: 'word', options: [['word', 'Full word'], ['short', 'Short (Cr, L, B, M)']] }, upd),
        el('div', { class: 'two' }, ctl(f, 'decimals', { type: 'select', label: 'Decimals', def: 'auto', options: ['auto', '0', '1', '2', '3'] }, upd),
          ctl(f, 'grouping', { type: 'select', label: 'Commas', def: 'in', options: [['in', '12,34,567 (Indian)'], ['intl', '1,234,567'], ['none', 'none']] }, upd)),
        el('div', { class: 'two' }, ctl(f, 'digits', { type: 'select', label: 'Digits', def: 'latin', options: [['latin', '123'], ['deva', '१२३']] }, upd),
          ctl(f, 'scale', { type: 'number', label: 'Multiply data by', def: 1 }, upd)),
        ctl(f, 'sign', { type: 'check', label: 'Show + on positive numbers', def: false }, upd)));
    } else if (tab === 'style') {
      s.params = s.params || {};
      kids.push(sec('Look', ctl(s, 'theme', { type: 'select', label: 'Theme', options: DC.themes.list.map(x => [x.id, x.name]) }),
        el('div', { class: 'row gap wrap' },
          el('button', { class: 'btn sm ghost', type: 'button', onclick: () => $('fileImg').click() }, s.bgImage ? 'Change background photo' : 'Background photo…'),
          s.bgImage ? el('button', { class: 'btn sm danger', type: 'button', onclick: () => { s.bgImage = ''; commit(); renderInsp(); } }, 'Remove') : null),
        s.bgImage ? ctl(s, 'bgOpacity', { type: 'range', label: 'Photo strength', min: 0.05, max: 1, step: 0.01, def: 0.35 }) : null));
      kids.push(sec(chart.name + ' settings', ...chart.params.filter(p => !TIMING.has(p.key)).map(p => ctl(s.params, p.key, p))));
    } else if (tab === 'animate') {
      s.params = s.params || {};
      const names = anchorNames(s), dl = el('datalist', { id: 'dlAnchors' }, ...names.map(n => el('option', { value: n })));
      kids.push(dl);
      kids.push(sec('Timing', ctl(s, 'duration', { type: 'range', label: 'Scene length (s)', min: 1, max: 60, step: 0.1 }, () => renderScenes()),
        ...chart.params.filter(p => TIMING.has(p.key)).map(p => ctl(s.params, p.key, p)),
        ctl(s, 'outro', { type: 'check', label: 'Fade out at the end' })));
      kids.push(sec('Highlight one bar / line / point', ctl(s, 'highlight', { label: 'Name to highlight (others dim)', list: 'dlAnchors', ph: 'e.g. India' }),
        ctl(s, 'highlightAt', { type: 'range', label: 'Starts at (s)', min: 0, max: Math.max(1, s.duration), step: 0.1, def: 0 })));
      const cam = s.camera = s.camera || { target: '', at: 2, zoom: 1.6, dur: 1.2, hold: true };
      kids.push(sec('Camera push to a data point', ctl(cam, 'target', { label: 'Push in to (blank = off)', list: 'dlAnchors', ph: 'e.g. 2023 or China' }),
        el('div', { class: 'two' }, ctl(cam, 'at', { type: 'number', label: 'Starts at (s)', min: 0, step: 0.1 }), ctl(cam, 'zoom', { type: 'number', label: 'Zoom', min: 1, max: 4, step: 0.05 })),
        el('div', { class: 'two' }, ctl(cam, 'dur', { type: 'number', label: 'Move time (s)', min: 0.2, step: 0.1 }), ctl(cam, 'hold', { type: 'select', label: 'Then', options: [['true', 'Stay pushed in'], ['false', 'Pull back out']] }, v => { cam.hold = v === 'true'; }))));
      s.callouts = s.callouts || [];
      kids.push(sec('Call-outs (labels on the chart)',
        ...s.callouts.map((c, i) => el('div', { class: 'co' },
          ctl(c, 'target', { label: 'Point at', list: 'dlAnchors' }), ctl(c, 'text', { label: 'Text (use \\n for a new line)' }),
          el('div', { class: 'two' }, ctl(c, 'at', { type: 'number', label: 'Appears at (s)', min: 0, step: 0.1 }), ctl(c, 'until', { type: 'number', label: 'Hide at (s, blank = never)', min: 0, step: 0.1 })),
          el('div', { class: 'row gap wrap' }, ctl(c, 'below', { type: 'check', label: 'Below' }), ctl(c, 'side', { type: 'select', label: 'Side', options: [['', 'auto'], ['left', 'left']] }),
            el('button', { class: 'btn sm danger', type: 'button', onclick: () => { s.callouts.splice(i, 1); commit(); renderInsp(); } }, 'Remove')))),
        el('button', { class: 'btn sm ghost', type: 'button', onclick: () => { s.callouts.push({ target: names[names.length - 1] || '', text: 'Look here', at: Math.min(s.duration - 1, 2) }); commit(); renderInsp(); } }, '+ Add call-out'),
        el('p', { class: 'desc' }, 'Names: a bar or row name, a year on a single line, or “Series@Year” (e.g. China@2010) on multi-line charts.')));
    }
    box.replaceChildren(...kids.filter(Boolean));
  }
  function rowsOf(s) { const r = U.parseCSV(s.csv); if (!r.length) r.push(['label', 'value']); const w = Math.max(...r.map(x => x.length)); r.forEach(x => { while (x.length < w) x.push(''); }); return r; }
  function editRows(s, fn) { const r = rowsOf(s); fn(r); s.csv = U.toCSV(r); commit(); renderInsp(); }
  function dataGrid(s) {
    const rows = rowsOf(s);
    const head = el('tr', {}, el('th', { class: 'rn' }, ''), ...rows[0].map((_, j) => el('th', {}, String.fromCharCode(65 + (j % 26)))));
    const body = rows.map((r, i) => el('tr', { class: i === 0 ? 'hdr' : r[0].startsWith('#') ? 'meta' : '' },
      el('td', { class: 'rn', title: i ? 'Delete this row' : 'Header row', onclick: () => { if (i) editRows(s, rr => rr.splice(i, 1)); } }, i ? String(i) : 'H'),
      ...r.map((v, j) => { const inp = el('input', { value: v, 'aria-label': `Row ${i} column ${j + 1}` }); inp.oninput = () => { rows[i][j] = inp.value; s.csv = U.toCSV(rows); commit(); }; return el('td', {}, inp); })));
    return el('div', { class: 'grid-wrap' }, el('table', { class: 'sheet' }, el('thead', {}, head), el('tbody', {}, ...body)));
  }
  $('inspTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; renderInsp(); } });

  // ---------- files ----------
  function readText(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); }); }
  function readURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  async function takeFile(file) {
    if (/\.(csv|tsv|txt)$/i.test(file.name) || /text\/(csv|plain|tab)/.test(file.type)) { scene().csv = (await readText(file)).trim(); commit({ fast: true }); tab = 'data'; renderInsp(); toast('Data loaded from ' + file.name); return; }
    if (/\.json$/i.test(file.name)) { const p = JSON.parse(await readText(file)); await loadMedia(p.media); sel = 0; setProject(p); toast('Opened ' + file.name); return; }
    if (file.type.startsWith('image/')) {
      const url = await readURL(file), id = 'img_' + U.hash(url.slice(0, 2000) + url.length).toString(36);
      await loadMedia({ [id]: { dataUrl: url } }); scene().bgImage = id; commit({ fast: true }); renderInsp(); toast('Background photo set');
      return;
    }
    toast('Drop a .csv for data, a photo for the background, or a .chart.json project');
  }
  $('fileCsv').onchange = e => { const f = e.target.files[0]; if (f) takeFile(f); e.target.value = ''; };
  $('fileImg').onchange = e => { const f = e.target.files[0]; if (f) takeFile(f); e.target.value = ''; };
  $('fileProject').onchange = e => { const f = e.target.files[0]; if (f) takeFile(f); e.target.value = ''; };
  $('btnOpen').onclick = () => $('fileProject').click();
  function save() {
    const name = (proj.name || 'chart').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'chart';
    DC.exporter.download(new Blob([JSON.stringify(serial(), null, 1)], { type: 'application/json' }), name + '.chart.json'); toast('Project saved');
  }
  $('btnSave').onclick = save;
  $('projName').oninput = e => { proj.name = e.target.value; commit(); };
  const wrap = $('stageWrap');
  ['dragenter', 'dragover'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => wrap.addEventListener(ev, e => { e.preventDefault(); wrap.classList.remove('drag'); }));
  wrap.addEventListener('drop', e => { for (const f of e.dataTransfer.files) takeFile(f); });
  document.addEventListener('paste', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const txt = e.clipboardData && e.clipboardData.getData('text'); if (txt && /[\t,]/.test(txt) && txt.includes('\n')) { scene().csv = txt.trim(); commit({ fast: true }); tab = 'data'; renderInsp(); toast('Pasted data into this scene'); }
  });

  // ---------- project settings ----------
  $('btnProject').onclick = () => {
    $('pjSize').replaceChildren(...E.SIZES.map(([v, l]) => el('option', { value: v }, l))); $('pjSize').value = `${proj.width}x${proj.height}`;
    $('pjFps').value = String(proj.fps || 30); $('pjTd').value = proj.transition.duration || 0.5;
    $('dlgProject').showModal();
  };
  $('dlgProject').addEventListener('close', () => {
    const [w, h] = $('pjSize').value.split('x').map(Number); proj.width = w; proj.height = h; proj.fps = +$('pjFps').value; proj.transition.duration = +$('pjTd').value;
    wrap.classList.toggle('vertical', h > w); wrap.classList.toggle('square', h === w); commit({ fast: true });
  });

  // ---------- export ----------
  let exporting = false, cancel = false;
  $('exMode').replaceChildren(...DC.exporter.MODES.map(([v, l]) => el('option', { value: v }, l)));
  function openExport() { $('exSize').replaceChildren(...E.SIZES.map(([v, l]) => el('option', { value: v }, l))); $('exSize').value = `${proj.width}x${proj.height}`; $('exStatus').textContent = ''; $('exBar').style.width = '0'; $('dlgExport').showModal(); }
  $('btnExport').onclick = openExport;
  $('exClose').onclick = () => { cancel = exporting; };
  $('exPng').onclick = () => DC.exporter.download(DC.exporter.still(proj, t, $('exMode').value === 'alpha' ? 'alpha' : $('exMode').value, $('exSize').value), (proj.name || 'chart') + `_${t.toFixed(2)}s.png`);
  $('exGo').onclick = async () => {
    if (exporting) return;
    exporting = true; cancel = false; playing = false; setPlay();
    const segs = tl().segs, range = $('exRange').value === 'scene' ? { from: segs[sel].t0, to: segs[sel].t1 } : {};
    const p = $('exRange').value === 'scene' ? Object.assign({}, proj, { scenes: [scene()] }) : proj;
    try {
      $('exStatus').textContent = 'Rendering… keep this tab open.';
      const res = await DC.exporter.run(p, Object.assign({ mode: $('exMode').value, size: $('exSize').value, fps: +$('exFps').value }, $('exRange').value === 'scene' ? {} : range),
        f => { $('exBar').style.width = (f * 100).toFixed(1) + '%'; }, () => cancel);
      if (res) { DC.exporter.download(res.blob, res.name); $('exStatus').textContent = `Done: ${res.name} (${(res.blob.size / 1048576).toFixed(1)} MB)`; }
      else $('exStatus').textContent = 'Cancelled.';
    } catch (err) { $('exStatus').textContent = 'Export failed: ' + err.message; console.error(err); }
    exporting = false;
  };

  // ---------- transport ----------
  function setPlay() { $('btnPlay').textContent = playing ? '❚❚' : '▶'; }
  $('btnPlay').onclick = () => { playing = !playing; if (playing && t >= tl().total - 0.02) t = 0; setPlay(); };
  stage.onclick = () => $('btnPlay').click();
  $('scrub').oninput = e => { const T = tl(); t = (e.target.value / 1000) * T.total; playing = false; setPlay(); dirty = true; };
  $('selQuality').onchange = () => { dirty = true; };
  $('libSearch').oninput = renderLib;
  $('btnUndo').onclick = doUndo;
  function doUndo() { if (!undo.length) return toast('Nothing to undo'); const p = JSON.parse(undo.pop()); clearTimeout(undoTimer); undoTimer = 0; proj = null; setProject(p, true); undo.pop(); toast('Undone'); }
  document.addEventListener('keydown', e => {
    const typing = e.target.closest && e.target.closest('input,textarea,select');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); doUndo(); return; }
    if (typing) return;
    if (e.code === 'Space') { e.preventDefault(); $('btnPlay').click(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { t = Math.max(0, t + (e.key === 'ArrowRight' ? 1 : -1) / (proj.fps || 30)); playing = false; setPlay(); dirty = true; }
  });
  // phone tabs
  $('mtabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab === 'export') return openExport();
    document.querySelectorAll('#mtabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('show', p.dataset.panel === b.dataset.tab));
  });
  if (matchMedia('(max-width: 900px)').matches) $('panelLib').classList.add('show');

  function frame(now) {
    const dt = lastTs ? Math.min(0.1, (now - lastTs) / 1000) : 0; lastTs = now;
    const T = tl(), solo = $('chkSolo').checked, seg = T.segs[sel];
    if (playing) {
      t += dt; dirty = true;
      const end = solo ? seg.t1 : T.total;
      if (t >= end) { if ($('chkLoop').checked) t = solo ? seg.t0 : 0; else { t = end; playing = false; setPlay(); } }
    }
    if (dirty) {
      const q = +$('selQuality').value, W = Math.round(proj.width * q), H = Math.round(proj.height * q);
      if (stage.width !== W || stage.height !== H) { stage.width = W; stage.height = H; }
      try { E.render(sctx, proj, t, { W, H, tl: T }); } catch (err) { console.error(err); }
      $('timeLabel').textContent = `${fmtT(t)} / ${fmtT(T.total)}`;
      $('scrub').value = Math.round((t / Math.max(0.001, T.total)) * 1000);
      // follow the playhead in the scenes strip
      const cur = T.segs.findIndex(s => t >= s.t0 && t < s.t1);
      document.querySelectorAll('#timeline .scene').forEach((c, i) => c.classList.toggle('live', i === cur && playing));
      dirty = playing;
    }
    requestAnimationFrame(frame);
  }

  // ---------- boot ----------
  (async () => {
    await DCS.ready();
    let p = null;
    try { const raw = localStorage.getItem('dcs.autosave'); if (raw) p = JSON.parse(raw); } catch (e) { p = null; }
    if (p && p.scenes && p.scenes.length) await loadMedia(p.media); else p = E.defaultProject();
    setProject(p);
    renderLib();
    requestAnimationFrame(frame);
  })();

  window.__MAS_BRIDGE_STATE = {
    id: 'data-chart-studio',
    engine: E,
    getProject: () => proj,
    getTime: () => t,
    setTime: v => { t = U.clamp(+v || 0, 0, tl().total); dirty = true; },
    isPlaying: () => playing,
    play: () => { playing = true; setPlay(); },
    pause: () => { playing = false; setPlay(); },
    getDuration: () => tl().total,
    selectLayer: idx => { if (proj.scenes[idx]) { sel = idx; renderScenes(); renderInsp(); dirty = true; } },
    addLayer: (id) => { const pid = DC.charts.presetById[id] ? id : 'race-gdp'; addScene(pid); },
    getAddableTypes: () => DC.charts.presets.slice(0, 24).map(p => ({ id: p.id, name: p.name || p.title || p.id, desc: p.chart, group: p.chart, icon: '▮' })),
    getMediaList: () => Object.entries(DC.media || {}).map(([id, m]) => ({ id, name: id, kind: 'image', src: m.dataUrl || '' })),
    uploadMedia: async files => { for (const f of files) await takeFile(f); commit({ fast: true }); renderScenes(); renderInsp(); },
    useMedia: (id) => { const s = scene(); if (s) { s.bgImage = id; commit({ fast: true }); renderInsp(); } },
    changed: (full) => { commit({ fast: true }); if (full) { renderScenes(); renderInsp(); } },
  };

})();
