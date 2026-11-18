// Main UI & Headless API for Hook Editor Studio Pro (vanilla JS, Map Animation Studio layout).
(() => {
  const U = HES.util, A = HES.audio, M = HES.motions, TR = HES.transitions, OV = HES.overlays, E = HES.engine, AE = HES.autoedit, EXP = HES.export, TPL = HES.templates;

  const LS_KEY = 'hes:proj:v1';
  const state = {
    proj: null,
    hist: [],
    histIdx: -1,
    t: 0,
    playing: false,
    loop: true,
    speed: 1,
    guides: false,
    muted: false,
    libTab: 'media',     // 'media' | 'presets' | 'overlays'
    inspTab: 'shot',     // 'shot' | 'overlay' | 'audio' | 'project'
    mobTab: 'stage',     // 'stage' | 'library' | 'inspector' | 'timeline'
    selType: 'shot',     // 'shot' | 'overlay'
    selId: null,
    tlZoom: 72,          // pixels per second
    autoStyle: 'hybrid',
    autoPace: 'medium',
    toast: null,
    exportOpen: false,
  };

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function pushHist(proj) {
    const snap = deepClone(proj);
    state.hist = state.hist.slice(0, state.histIdx + 1);
    state.hist.push(snap);
    if (state.hist.length > 35) state.hist.shift();
    state.histIdx = state.hist.length - 1;
  }

  function setProj(next, saveHist = true) {
    state.proj = next;
    if (saveHist) pushHist(next);
    try {
      const compact = { ...next, media: Object.fromEntries(Object.entries(next.media || {}).filter(([, m]) => (m.dataUrl || '').length < 180000)) };
      localStorage.setItem(LS_KEY, JSON.stringify(compact));
    } catch {}
    renderAll();
    drawStage();
  }

  function mutate(fn, saveHist = true) {
    const next = deepClone(state.proj);
    fn(next);
    setProj(next, saveHist);
  }

  function toast(msg) {
    const el = document.getElementById('hes-toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function selectedShot() {
    if (!state.proj) return null;
    if (state.selType === 'shot') {
      const s = state.proj.shots.find(x => x.id === state.selId);
      if (s) return s;
    }
    return state.proj.shots[0] || null;
  }

  function selectedOverlay() {
    if (!state.proj || !state.proj.overlays) return null;
    if (state.selType === 'overlay') {
      const o = state.proj.overlays.find(x => x.id === state.selId);
      if (o) return o;
    }
    return state.proj.overlays[0] || null;
  }

  // ---------- Audio / Media File Loaders ----------
  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('File read failed'));
      r.readAsDataURL(file);
    });
  }

  async function handleVisualFiles(files) {
    if (!files || !files.length) return;
    toast(`Loading ${files.length} visual(s)…`);
    const added = [];
    for (const f of files) {
      const id = U.uid('m');
      const isVid = f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(f.name);
      if (isVid) {
        const url = URL.createObjectURL(f);
        mutate(p => {
          p.media = p.media || {};
          p.media[id] = { id, kind: 'video', name: f.name, url, dur: 5 };
        }, false);
      } else {
        const dataUrl = await fileToDataUrl(f);
        mutate(p => {
          p.media = p.media || {};
          p.media[id] = { id, kind: 'image', name: f.name, dataUrl, dur: 4 };
        }, false);
      }
      added.push(id);
    }
    await E.ingestProjectMedia(state.proj);
    // Automatically append shots for newly uploaded visuals OR assign cleanly if shots still only use demo media
    mutate(p => {
      const onlyDemo = p.shots.every(s => String(s.mediaId || '').startsWith('m'));
      if (onlyDemo) {
        p.shots.forEach((s, idx) => { s.mediaId = added[idx % added.length]; s.label = (p.media[s.mediaId]?.name || s.label).replace(/\.[^.]+$/, ''); });
      } else {
        for (const id of added) {
          const nm = (p.media[id]?.name || 'New Shot').replace(/\.[^.]+$/, '');
          p.shots.push({ id: U.uid('shot'), mediaId: id, label: nm, dur: 2.2, motion: 'pulse-zoom', trIn: 'whip-l', trDur: 0.28, tension: 0.5, zoom: 1, panX: 0, panY: 0, seed: Math.floor(Math.random() * 999) });
        }
      }
    }, true);
    renderLibrary();
    renderTimeline();
    renderInspector();
    drawStage();
    toast(`Loaded ${files.length} file(s)! Click Auto-Edit or customize shots.`);
  }

  async function handleAudioFile(kind, file) {
    if (!file) return;
    toast(`Analyzing ${kind.toUpperCase()} audio…`);
    try {
      const buf = await A.decodeFile(file);
      const info = A.setBuffer(kind, buf, file.name);
      mutate(p => {
        p.audioMeta = p.audioMeta || {};
        p.audioMeta[kind] = info;
      }, true);
      if (kind === 'bgm' && info) toast(`BGM analyzed: ${info.bpm} BPM • ${info.downbeats.length} downbeats`);
      if (kind === 'voice' && info) toast(`Voiceover analyzed: ${info.dur.toFixed(1)}s • ${info.pauses.length} pauses`);
    } catch (err) {
      toast('Could not decode audio: ' + err.message);
    }
  }

  function loadDemoBeat(bpm = 105) {
    const tl = E.resolveTimeline(state.proj);
    const buf = A.createDemoBgmBuffer(bpm, Math.max(18, tl.totalDur + 2));
    const info = A.setBuffer('bgm', buf, `Demo Pulse (${bpm} BPM)`);
    mutate(p => {
      p.audioMeta = p.audioMeta || {};
      p.audioMeta.bgm = info;
    }, false);
    toast(`Demo BGM ready (${info.bpm} BPM)`);
  }

  // ---------- Auto-Edit Action ----------
  function runAutoEdit() {
    if (!state.proj.audioMeta || !state.proj.audioMeta.bgm) loadDemoBeat(state.autoStyle === 'dhruv' ? 84 : 105);
    const next = AE.generate(state.proj, { style: state.autoStyle, pace: state.autoPace, keepOverlays: false });
    state.selType = 'shot';
    state.selId = next.shots[0] ? next.shots[0].id : null;
    state.t = 0;
    setProj(next, true);
    toast(`Auto-Edited in ${AE.STYLES[next.style].name} style (${next.shots.length} beat-synced shots)!`);
  }

  // ---------- Transport & Playback ----------
  let rafId = 0, lastNow = 0;
  function tickPlay(now) {
    if (!state.playing) return;
    const dt = Math.min(0.1, (now - lastNow) / 1000) * state.speed;
    lastNow = now;
    const tl = E.resolveTimeline(state.proj);
    state.t += dt;
    if (state.t >= tl.totalDur) {
      if (state.loop) {
        state.t = 0;
        A.play(state.proj, 0, tl.totalDur);
      } else {
        state.t = tl.totalDur;
        togglePlay(false);
        return;
      }
    }
    updatePlayheadUI();
    drawStage();
    rafId = requestAnimationFrame(tickPlay);
  }

  function togglePlay(force) {
    const next = force != null ? force : !state.playing;
    if (next === state.playing) return;
    state.playing = next;
    const tl = E.resolveTimeline(state.proj);
    if (next) {
      if (state.t >= tl.totalDur - 0.05) state.t = 0;
      A.play(state.proj, state.t, tl.totalDur);
      lastNow = performance.now();
      rafId = requestAnimationFrame(tickPlay);
    } else {
      cancelAnimationFrame(rafId);
      A.stop();
    }
    const btn = document.getElementById('btn-play');
    if (btn) btn.textContent = next ? '⏸ Pause' : '▶ Play';
  }

  function seekTo(t) {
    const tl = E.resolveTimeline(state.proj);
    state.t = U.clamp(t, 0, tl.totalDur);
    if (state.playing) A.play(state.proj, state.t, tl.totalDur);
    E.seekVideosForTime(state.proj, state.t).then(() => drawStage());
    updatePlayheadUI();
  }

  function updatePlayheadUI() {
    const tl = E.resolveTimeline(state.proj);
    const tc = document.getElementById('hes-tc');
    if (tc) tc.textContent = `${U.fmtTime(state.t)} / ${U.fmtTime(tl.totalDur)}`;
    const sc = document.getElementById('hes-scrub');
    if (sc) { sc.max = tl.totalDur.toFixed(3); sc.value = state.t.toFixed(3); }
    const ph = document.getElementById('hes-ph');
    if (ph) ph.style.left = `${165 + state.t * state.tlZoom}px`;
  }

  // ---------- Stage Drawing & Drag-Overlay ----------
  function drawStage() {
    const canvas = document.getElementById('hes-stage');
    if (!canvas || !state.proj) return;
    const aspect = (state.proj.w || 1920) / (state.proj.h || 1080);
    const pw = aspect >= 1 ? 1280 : 720;
    const ph = Math.round(pw / aspect);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    const ctx = canvas.getContext('2d');
    E.renderAt(ctx, state.proj, state.t, { W: pw, H: ph, mode: 'composite', guides: state.guides });
  }

  // ---------- Build Skeleton DOM Once ----------
  function buildAppShell() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="app">
        <header class="top">
          <div class="brand"><i></i><span>Hook Editor Studio</span></div>
          <input id="hes-pname" class="pname" type="text" placeholder="Hook title…" />
          <span id="hes-chip-bpm" class="chip gold">105 BPM</span>
          <span id="hes-chip-dur" class="chip">14.0s</span>
          <span id="hes-chip-voice" class="chip hide-mob">NO VOICE</span>
          <div class="sp"></div>
          <select id="hes-tpl" class="qsel" title="Starter Hook Templates">
            <option value="">Templates…</option>
            ${TPL.LIST.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
          <button id="hes-auto-top" class="btn pri">⚡ Auto-Edit Hook</button>
          <button id="hes-undo" class="btn sm hide-mob" title="Undo (Ctrl+Z)">↶</button>
          <button id="hes-redo" class="btn sm hide-mob" title="Redo (Ctrl+Y)">↷</button>
          <button id="hes-load-btn" class="btn hide-mob">Open JSON</button>
          <button id="hes-save-btn" class="btn hide-mob">Save JSON</button>
          <button id="hes-export-btn" class="btn accent">Export MP4</button>
          <input id="hes-json-file" type="file" accept=".json" hidden />
        </header>

        <main class="work">
          <!-- Left Library -->
          <section id="panel-lib" class="panel">
            <div class="tabs">
              <button data-ltab="media" aria-selected="true">Media & Audio</button>
              <button data-ltab="presets">Motions (12)</button>
              <button data-ltab="overlays">Overlays (8)</button>
            </div>
            <div id="hes-lib-scroll" class="scroll"><div id="hes-lib-body" class="pad"></div></div>
          </section>

          <!-- Center Stage -->
          <section id="panel-stage" class="center">
            <div class="stagebar">
              <span class="chip" id="hes-res-chip">1920×1080</span>
              <span class="chip ok" id="hes-mix-chip">BGM -22 dB</span>
              <div class="sp"></div>
              <button id="btn-bars" class="btn sm">Cinema Bars</button>
              <button id="btn-guides" class="btn sm hide-mob">Safe Guide</button>
              <button id="btn-mute" class="btn sm">🔊 Audio</button>
            </div>
            <div class="stagewrap">
              <canvas id="hes-stage" class="stage" width="1280" height="720"></canvas>
            </div>
            <div class="transport">
              <button id="btn-start" class="btn sm" title="Jump to start">⏮</button>
              <button id="btn-play" class="btn pri sm">▶ Play</button>
              <span id="hes-tc" class="tc">00:00.00 / 00:14.00</span>
              <input id="hes-scrub" class="scrub" type="range" min="0" max="14" step="0.01" value="0" />
              <select id="hes-speed" class="qsel sm">
                <option value="0.5">0.5×</option>
                <option value="1" selected>1.0×</option>
                <option value="1.5">1.5×</option>
              </select>
              <button id="btn-loop" class="btn sm on">Loop</button>
            </div>
          </section>

          <!-- Right Inspector -->
          <section id="panel-insp" class="panel">
            <div class="tabs">
              <button data-itab="shot" aria-selected="true">Shot</button>
              <button data-itab="overlay">Overlay</button>
              <button data-itab="audio">Audio & Sync</button>
              <button data-itab="project">Project</button>
            </div>
            <div id="hes-insp-scroll" class="scroll"><div id="hes-insp-body" class="pad"></div></div>
          </section>
        </main>

        <!-- Bottom Multi-Track Timeline -->
        <section id="panel-tl" class="tl">
          <div class="tlhead">
            <span class="h3" style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase">Timeline</span>
            <button id="tl-add-shot" class="btn sm">+ Shot</button>
            <button id="tl-split-shot" class="btn sm">✂ Split</button>
            <button id="tl-add-ov" class="btn sm">+ Overlay</button>
            <div class="sp"></div>
            <span style="font-size:11px;color:var(--muted)">Zoom</span>
            <input id="tl-zoom" type="range" min="36" max="160" value="72" style="width:90px;accent-color:var(--primary)" />
          </div>
          <div id="hes-tl-body" class="tlbody"></div>
        </section>

        <!-- Mobile Tabs (< 900px) -->
        <nav id="hes-mobtabs" class="mobtabs">
          <button data-mtab="stage" class="on">Stage</button>
          <button data-mtab="library">Media & FX</button>
          <button data-mtab="inspector">Edit</button>
          <button data-mtab="timeline">Timeline</button>
        </nav>
      </div>

      <div id="hes-export-modal" class="sheet" hidden></div>
      <div id="hes-toast" class="toast" hidden></div>
    `;

    // Hidden global file pickers triggered from buttons inside library
    const fVis = Object.assign(document.createElement('input'), { id: 'pick-visuals', type: 'file', multiple: true, accept: 'image/*,video/*', hidden: true });
    const fBgm = Object.assign(document.createElement('input'), { id: 'pick-bgm', type: 'file', accept: 'audio/*', hidden: true });
    const fVoc = Object.assign(document.createElement('input'), { id: 'pick-voice', type: 'file', accept: 'audio/*', hidden: true });
    root.append(fVis, fBgm, fVoc);
    fVis.onchange = e => { handleVisualFiles([...e.target.files]); fVis.value = ''; };
    fBgm.onchange = e => { handleAudioFile('bgm', e.target.files[0]); fBgm.value = ''; };
    fVoc.onchange = e => { handleAudioFile('voice', e.target.files[0]); fVoc.value = ''; };

    wireTopBar();
    wireStageEvents();
    wireTabs();
  }

  function wireTopBar() {
    document.getElementById('hes-pname').oninput = e => {
      state.proj.title = e.target.value;
      renderInspector();
      drawStage();
    };
    document.getElementById('hes-tpl').onchange = e => {
      if (!e.target.value) return;
      const p = TPL.createProject(e.target.value);
      state.autoStyle = p.style || 'hybrid';
      state.autoPace = p.pace || 'medium';
      state.t = 0;
      E.ingestProjectMedia(p).then(() => {
        setProj(p, true);
        loadDemoBeat(p.style === 'dhruv' ? 84 : 105);
      });
      e.target.value = '';
    };
    document.getElementById('hes-auto-top').onclick = runAutoEdit;
    document.getElementById('hes-undo').onclick = () => {
      if (state.histIdx > 0) {
        state.histIdx--;
        state.proj = deepClone(state.hist[state.histIdx]);
        renderAll(); drawStage();
        toast('Undo');
      }
    };
    document.getElementById('hes-redo').onclick = () => {
      if (state.histIdx < state.hist.length - 1) {
        state.histIdx++;
        state.proj = deepClone(state.hist[state.histIdx]);
        renderAll(); drawStage();
        toast('Redo');
      }
    };
    document.getElementById('hes-save-btn').onclick = () => {
      const clean = { ...state.proj };
      const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
      const nm = (clean.title || 'hook').toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '.hook.json';
      EXP.downloadBlob(blob, nm);
      toast('Saved ' + nm);
    };
    document.getElementById('hes-load-btn').onclick = () => document.getElementById('hes-json-file').click();
    document.getElementById('hes-json-file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        await E.ingestProjectMedia(obj);
        state.t = 0;
        setProj(obj, true);
        toast('Opened ' + f.name);
      } catch (err) { toast('Invalid JSON: ' + err.message); }
      e.target.value = '';
    };
    document.getElementById('hes-export-btn').onclick = openExportModal;

    // Transport buttons
    document.getElementById('btn-play').onclick = () => togglePlay();
    document.getElementById('btn-start').onclick = () => seekTo(0);
    document.getElementById('hes-scrub').oninput = e => seekTo(Number(e.target.value));
    document.getElementById('hes-speed').onchange = e => { state.speed = Number(e.target.value) || 1; };
    document.getElementById('btn-loop').onclick = e => { state.loop = !state.loop; e.target.classList.toggle('on', state.loop); };
    document.getElementById('btn-bars').onclick = () => mutate(p => { p.cinemaBars = !p.cinemaBars; });
    document.getElementById('btn-guides').onclick = e => { state.guides = !state.guides; e.target.classList.toggle('on', state.guides); drawStage(); };
    document.getElementById('btn-mute').onclick = e => {
      state.muted = !state.muted;
      A.setMuted(state.muted);
      e.target.textContent = state.muted ? '🔇 Muted' : '🔊 Audio';
    };

    // Timeline toolbar
    document.getElementById('tl-add-shot').onclick = () => {
      mutate(p => {
        const meds = Object.keys(p.media || {});
        const s = { id: U.uid('shot'), mediaId: meds[p.shots.length % Math.max(1, meds.length)] || null, label: `Shot ${p.shots.length + 1}`, dur: 2.2, motion: 'pulse-zoom', trIn: 'flash', trDur: 0.25, tension: 0.5, zoom: 1, panX: 0, panY: 0, seed: Math.floor(Math.random() * 999) };
        p.shots.push(s);
        state.selType = 'shot'; state.selId = s.id;
      });
    };
    document.getElementById('tl-split-shot').onclick = () => {
      const tl = E.resolveTimeline(state.proj);
      const hit = tl.items.find(it => state.t > it.start + 0.3 && state.t < it.end - 0.3);
      if (!hit) { toast('Move playhead inside a shot to split'); return; }
      mutate(p => {
        const idx = p.shots.findIndex(x => x.id === hit.shot.id);
        if (idx < 0) return;
        const leftDur = Number((state.t - hit.start).toFixed(2));
        const rightDur = Number((hit.end - state.t).toFixed(2));
        p.shots[idx].dur = leftDur;
        const copy = deepClone(p.shots[idx]);
        copy.id = U.uid('shot');
        copy.dur = rightDur;
        copy.label = copy.label + ' B';
        copy.trIn = 'cut';
        p.shots.splice(idx + 1, 0, copy);
        state.selType = 'shot'; state.selId = copy.id;
      });
      toast('Split shot at playhead');
    };
    document.getElementById('tl-add-ov').onclick = () => {
      mutate(p => {
        const o = { id: U.uid('ov'), type: 'ov-impact-title', start: Number(state.t.toFixed(2)), dur: 3.0, text: 'KEY POINT', sub: 'ARCHIVE DETAIL', color: '#f0a93c', bg: '#090b10', font: 'khand', size: 74, x: 0.5, y: 0.5, animIn: 0.35 };
        p.overlays.push(o);
        state.selType = 'overlay'; state.selId = o.id; state.inspTab = 'overlay';
      });
    };
    document.getElementById('tl-zoom').oninput = e => { state.tlZoom = Number(e.target.value) || 72; renderTimeline(); };

    // Keyboard shortcuts
    window.addEventListener('keydown', ev => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (ev.code === 'Space') { ev.preventDefault(); togglePlay(); }
      else if (ev.ctrlKey && ev.key.toLowerCase() === 'z') { ev.preventDefault(); document.getElementById('hes-undo').click(); }
      else if (ev.ctrlKey && ev.key.toLowerCase() === 'y') { ev.preventDefault(); document.getElementById('hes-redo').click(); }
    });
  }

  function wireStageEvents() {
    const stage = document.getElementById('hes-stage');
    let dragOv = null;
    stage.addEventListener('pointerdown', ev => {
      const ov = selectedOverlay();
      if (!ov || state.t < ov.start || state.t > ov.start + ov.dur) return;
      const r = stage.getBoundingClientRect();
      dragOv = { id: ov.id, startX: ev.clientX, startY: ev.clientY, ox: ov.x, oy: ov.y, w: r.width, h: r.height };
      stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener('pointermove', ev => {
      if (!dragOv) return;
      const dx = (ev.clientX - dragOv.startX) / Math.max(1, dragOv.w);
      const dy = (ev.clientY - dragOv.startY) / Math.max(1, dragOv.h);
      const ov = state.proj.overlays.find(x => x.id === dragOv.id);
      if (ov) {
        ov.x = Number(U.clamp(dragOv.ox + dx, 0.05, 0.95).toFixed(3));
        ov.y = Number(U.clamp(dragOv.oy + dy, 0.08, 0.92).toFixed(3));
        drawStage();
      }
    });
    stage.addEventListener('pointerup', () => {
      if (dragOv) { dragOv = null; pushHist(state.proj); renderInspector(); }
    });
  }

  function wireTabs() {
    document.querySelectorAll('[data-ltab]').forEach(b => b.onclick = () => {
      state.libTab = b.dataset.ltab;
      document.querySelectorAll('[data-ltab]').forEach(x => x.setAttribute('aria-selected', x === b));
      renderLibrary();
    });
    document.querySelectorAll('[data-itab]').forEach(b => b.onclick = () => {
      state.inspTab = b.dataset.itab;
      document.querySelectorAll('[data-itab]').forEach(x => x.setAttribute('aria-selected', x === b));
      renderInspector();
    });
    document.querySelectorAll('[data-mtab]').forEach(b => b.onclick = () => {
      state.mobTab = b.dataset.mtab;
      document.querySelectorAll('[data-mtab]').forEach(x => x.classList.toggle('on', x === b));
      applyMobileVisibility();
    });
  }

  function applyMobileVisibility() {
    const pLib = document.getElementById('panel-lib');
    const pStg = document.getElementById('panel-stage');
    const pIns = document.getElementById('panel-insp');
    const pTl = document.getElementById('panel-tl');
    if (!pLib) return;
    pLib.classList.toggle('mobhide', state.mobTab !== 'library');
    pStg.classList.toggle('mobhide', state.mobTab !== 'stage');
    pIns.classList.toggle('mobhide', state.mobTab !== 'inspector');
    pTl.classList.toggle('mobhide', state.mobTab !== 'timeline');
  }

  // ---------- Render Panels ----------
  function renderHeaderChips() {
    const p = state.proj, tl = E.resolveTimeline(p);
    document.getElementById('hes-pname').value = p.title || '';
    const bgm = p.audioMeta?.bgm, voc = p.audioMeta?.voice;
    document.getElementById('hes-chip-bpm').textContent = bgm ? `${bgm.bpm} BPM` : 'NO BGM';
    document.getElementById('hes-chip-dur').textContent = `${tl.totalDur.toFixed(1)}s • ${p.shots.length} shots`;
    const vc = document.getElementById('hes-chip-voice');
    vc.textContent = voc ? `VOICE ${voc.dur.toFixed(1)}s` : 'NO VOICE';
    vc.className = 'chip hide-mob ' + (voc ? 'ok' : '');
    document.getElementById('hes-res-chip').textContent = `${p.w}×${p.h}`;
    document.getElementById('hes-mix-chip').textContent = `BGM ${p.bgmDb ?? -22} dB`;
    document.getElementById('btn-bars').classList.toggle('on', !!p.cinemaBars);
  }

  function renderLibrary() {
    const box = document.getElementById('hes-lib-body');
    if (!box) return;
    const p = state.proj;
    if (state.libTab === 'media') {
      const meds = Object.values(p.media || {});
      const bgm = p.audioMeta?.bgm, voc = p.audioMeta?.voice;
      box.innerHTML = `
        <div class="auto-box">
          <h4>⚡ One-Click Auto-Edit</h4>
          <div class="frow2">
            <select id="ae-style">
              ${Object.entries(AE.STYLES).map(([k, v]) => `<option value="${k}" ${state.autoStyle===k?'selected':''}>${v.name.replace('Favorite World ', 'FW ')}</option>`).join('')}
            </select>
            <select id="ae-pace">
              <option value="fast" ${state.autoPace==='fast'?'selected':''}>Fast (1.8s)</option>
              <option value="medium" ${state.autoPace==='medium'?'selected':''}>Med (2.2s)</option>
              <option value="cinematic" ${state.autoPace==='cinematic'?'selected':''}>Slow (3.0s)</option>
            </select>
          </div>
          <button id="ae-run-btn" class="btn pri">⚡ Auto-Edit to Beats & Voice</button>
        </div>

        <div class="sec">
          <h3>Audio Tracks (BGM + Voiceover)</h3>
          <div class="addgrid">
            <button id="btn-up-bgm" class="addbtn">
              <span class="ic g-map">♫</span>
              <b>${bgm ? HES.text.upperLatin(bgm.name || 'BGM Loaded') : 'Upload BGM Music'}</b>
              <small>${bgm ? `${bgm.bpm} BPM • ${bgm.downbeats.length} downbeats • ${bgm.dur.toFixed(1)}s` : 'Auto BPM + beat-grid detection (.mp3/.wav)'}</small>
            </button>
            <button id="btn-demo-bgm" class="btn sm">Generate 105 BPM Thriller Demo Beat</button>
            <button id="btn-up-voice" class="addbtn">
              <span class="ic g-audio">🎙</span>
              <b>${voc ? (voc.name || 'Voiceover Loaded') : 'Upload Voiceover'}</b>
              <small>${voc ? `${voc.dur.toFixed(1)}s • ${voc.pauses.length} pause cuts • Auto-ducked` : 'Detects pauses & auto-ducks BGM to -22 dB'}</small>
            </button>
          </div>
        </div>

        <div class="sec">
          <h3>Photos & Video Clips (${meds.length})</h3>
          <div id="vis-drop" class="dropzone">
            <b>+ Upload Photos or Flow Clips</b>
            <small style="color:var(--muted)">Click or drag JPG, PNG, MP4 here</small>
          </div>
          <div class="media-grid">
            ${meds.map(m => `
              <button class="mitem" data-mid="${m.id}" title="Click to assign to selected shot · Double-click to append new shot">
                ${m.kind === 'video'
                  ? `<div class="mthumb" style="display:flex;align-items:center;justify-content:center;color:var(--scene);font-weight:700">▶ CLIP</div>`
                  : `<img src="${m.dataUrl || m.url || ''}" alt="" />`}
                <span class="mbadge">${m.kind === 'video' ? 'MP4' : 'IMG'}</span>
                <span class="mcap">${m.name || m.id}</span>
              </button>`).join('')}
          </div>
        </div>
      `;
      document.getElementById('ae-style').onchange = e => { state.autoStyle = e.target.value; };
      document.getElementById('ae-pace').onchange = e => { state.autoPace = e.target.value; };
      document.getElementById('ae-run-btn').onclick = runAutoEdit;
      document.getElementById('btn-up-bgm').onclick = () => document.getElementById('pick-bgm').click();
      document.getElementById('btn-demo-bgm').onclick = () => loadDemoBeat(state.autoStyle === 'dhruv' ? 84 : 105);
      document.getElementById('btn-up-voice').onclick = () => document.getElementById('pick-voice').click();

      const dz = document.getElementById('vis-drop');
      dz.onclick = () => document.getElementById('pick-visuals').click();
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); };
      dz.ondragleave = () => dz.classList.remove('drag');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag'); handleVisualFiles([...e.dataTransfer.files]); };

      box.querySelectorAll('[data-mid]').forEach(btn => {
        btn.onclick = () => {
          const sh = selectedShot();
          if (sh) mutate(pr => { const s = pr.shots.find(x => x.id === sh.id); if (s) { s.mediaId = btn.dataset.mid; s.label = (pr.media[btn.dataset.mid]?.name || s.label).replace(/\.[^.]+$/, ''); } });
        };
        btn.ondblclick = () => {
          mutate(pr => {
            const nm = (pr.media[btn.dataset.mid]?.name || 'New Shot').replace(/\.[^.]+$/, '');
            const ns = { id: U.uid('shot'), mediaId: btn.dataset.mid, label: nm, dur: 2.2, motion: 'pulse-zoom', trIn: 'flash', trDur: 0.25, tension: 0.5, zoom: 1, panX: 0, panY: 0, seed: Math.floor(Math.random()*999) };
            pr.shots.push(ns); state.selType = 'shot'; state.selId = ns.id;
          });
        };
      });
    } else if (state.libTab === 'presets') {
      const sh = selectedShot();
      box.innerHTML = `
        <div class="sec">
          <h3>Shot Motion Presets (Click to Apply)</h3>
          <div class="preset-grid">
            ${M.PRESETS.map(mp => `
              <button class="pcard ${sh && sh.motion === mp.id ? 'sel' : ''}" data-preset="${mp.id}">
                <canvas width="160" height="90" data-pc="${mp.id}"></canvas>
                <b>${mp.name}</b>
                <small>${mp.fam}</small>
              </button>`).join('')}
          </div>
        </div>`;
      box.querySelectorAll('[data-pc]').forEach(c => {
        const mp = M.PRESETS.find(x => x.id === c.dataset.pc);
        const cx = c.getContext('2d');
        const med = sh ? E.getMedia(sh.mediaId) : E.allMedia()[0];
        M.renderShot(cx, { motion: mp.id, tension: 0.65, zoom: 1, panX: 0, panY: 0, seed: 25 }, 0.9, 2.2, 160, 90, { beatPulse: 0.7, downbeatPulse: 0.4, combined: 0.6, energy: 0.7, beatIndex: 2 }, med, 1);
      });
      box.querySelectorAll('[data-preset]').forEach(btn => btn.onclick = () => {
        const s = selectedShot();
        if (!s) return;
        mutate(pr => { const t = pr.shots.find(x => x.id === s.id); if (t) t.motion = btn.dataset.preset; });
        toast(`Applied motion: ${btn.dataset.preset}`);
      });
    } else {
      box.innerHTML = `
        <div class="sec">
          <h3>Add Hook Overlay at Playhead</h3>
          <div class="addgrid">
            ${OV.PRESETS.map(op => `
              <button class="addbtn" data-ovtype="${op.id}">
                <span class="ic g-screen">+</span>
                <b>${op.name}</b>
                <small>${op.desc}</small>
              </button>`).join('')}
          </div>
        </div>`;
      box.querySelectorAll('[data-ovtype]').forEach(b => b.onclick = () => {
        const op = OV.PRESETS.find(x => x.id === b.dataset.ovtype);
        const d = op.defaults();
        mutate(pr => {
          const ov = { id: U.uid('ov'), type: op.id, start: Number(state.t.toFixed(2)), dur: op.id === 'ov-coming-up' ? 5.0 : 3.2, ...d };
          pr.overlays.push(ov);
          state.selType = 'overlay'; state.selId = ov.id; state.inspTab = 'overlay';
        });
        document.querySelector('[data-itab="overlay"]').click();
        toast(`Added ${op.name}`);
      });
    }
  }

  function renderInspector() {
    const box = document.getElementById('hes-insp-body');
    if (!box) return;
    const p = state.proj;
    if (state.inspTab === 'shot') {
      const sh = selectedShot();
      if (!sh) { box.innerHTML = '<small style="color:var(--muted)">No shot selected.</small>'; return; }
      const meds = Object.values(p.media || {});
      box.innerHTML = `
        <div class="sec">
          <h3>Selected Shot Controls</h3>
          <div class="frow"><label>Label</label><input id="is-label" type="text" value="${sh.label || ''}" /></div>
          <div class="frow"><label>Visual Media</label>
            <select id="is-media">
              ${meds.map(m => `<option value="${m.id}" ${sh.mediaId===m.id?'selected':''}>${m.name || m.id}</option>`).join('')}
            </select>
          </div>
          <div class="frow"><label>Beat-Sync Motion</label>
            <select id="is-motion">
              ${M.PRESETS.map(mp => `<option value="${mp.id}" ${sh.motion===mp.id?'selected':''}>${mp.name} (${mp.fam})</option>`).join('')}
            </select>
          </div>
          <div class="frow2">
            <div class="frow"><label>Duration (s)</label><input id="is-dur" type="number" step="0.05" min="0.4" max="20" value="${sh.dur}" /></div>
            <div class="frow"><label>Transition In</label>
              <select id="is-tr">
                ${TR.LIST.map(([k, nm]) => `<option value="${k}" ${sh.trIn===k?'selected':''}>${nm}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="frow"><label>Transition Duration</label><div class="srow"><input id="is-trd" type="range" min="0.1" max="0.8" step="0.02" value="${sh.trDur ?? 0.28}" /><span class="sval">${(sh.trDur??0.28).toFixed(2)}s</span></div></div>
          <div class="frow"><label>Tension / Effect Strength</label><div class="srow"><input id="is-ten" type="range" min="0" max="1" step="0.05" value="${sh.tension ?? 0.5}" /><span class="sval">${Math.round((sh.tension??0.5)*100)}%</span></div></div>
          <div class="frow"><label>Base Zoom</label><div class="srow"><input id="is-zoom" type="range" min="0.85" max="1.6" step="0.02" value="${sh.zoom ?? 1}" /><span class="sval">${(sh.zoom??1).toFixed(2)}×</span></div></div>
          <div class="frow2">
            <div class="frow"><label>Pan X</label><input id="is-px" type="range" min="-0.3" max="0.3" step="0.01" value="${sh.panX ?? 0}" /></div>
            <div class="frow"><label>Pan Y</label><input id="is-py" type="range" min="-0.3" max="0.3" step="0.01" value="${sh.panY ?? 0}" /></div>
          </div>
          <div class="frow2" style="margin-top:4px">
            <button id="is-dup" class="btn sm">Duplicate Shot</button>
            <button id="is-del" class="btn sm danger">Delete Shot</button>
          </div>
        </div>`;
      const patch = fn => mutate(pr => { const s = pr.shots.find(x => x.id === sh.id); if (s) fn(s); });
      document.getElementById('is-label').onchange = e => patch(s => { s.label = e.target.value; });
      document.getElementById('is-media').onchange = e => patch(s => { s.mediaId = e.target.value; });
      document.getElementById('is-motion').onchange = e => patch(s => { s.motion = e.target.value; });
      document.getElementById('is-dur').onchange = e => patch(s => { s.dur = Math.max(0.4, Number(e.target.value) || 2); });
      document.getElementById('is-tr').onchange = e => patch(s => { s.trIn = e.target.value; if (s.trIn !== 'cut' && !s.trDur) s.trDur = 0.28; });
      document.getElementById('is-trd').oninput = e => { sh.trDur = Number(e.target.value); e.target.nextElementSibling.textContent = sh.trDur.toFixed(2)+'s'; drawStage(); };
      document.getElementById('is-ten').oninput = e => { sh.tension = Number(e.target.value); e.target.nextElementSibling.textContent = Math.round(sh.tension*100)+'%'; drawStage(); };
      document.getElementById('is-zoom').oninput = e => { sh.zoom = Number(e.target.value); e.target.nextElementSibling.textContent = sh.zoom.toFixed(2)+'×'; drawStage(); };
      document.getElementById('is-px').oninput = e => { sh.panX = Number(e.target.value); drawStage(); };
      document.getElementById('is-py').oninput = e => { sh.panY = Number(e.target.value); drawStage(); };
      ['is-trd','is-ten','is-zoom','is-px','is-py'].forEach(id => document.getElementById(id).onchange = e => patch(s => {
        s.trDur = Number(document.getElementById('is-trd').value);
        s.tension = Number(document.getElementById('is-ten').value);
        s.zoom = Number(document.getElementById('is-zoom').value);
        s.panX = Number(document.getElementById('is-px').value);
        s.panY = Number(document.getElementById('is-py').value);
      }));
      document.getElementById('is-dup').onclick = () => mutate(pr => {
        const idx = pr.shots.findIndex(x => x.id === sh.id);
        const cp = deepClone(pr.shots[idx]); cp.id = U.uid('shot'); cp.label += ' Copy';
        pr.shots.splice(idx + 1, 0, cp); state.selId = cp.id;
      });
      document.getElementById('is-del').onclick = () => {
        if (p.shots.length <= 1) { toast('Keep at least 1 shot'); return; }
        mutate(pr => { pr.shots = pr.shots.filter(x => x.id !== sh.id); state.selId = pr.shots[0].id; });
      };
    } else if (state.inspTab === 'overlay') {
      const ov = selectedOverlay();
      if (!ov) { box.innerHTML = '<small style="color:var(--muted)">No overlay selected. Add one from the Overlays tab!</small>'; return; }
      box.innerHTML = `
        <div class="sec">
          <h3>Selected Overlay (Drag on Stage to Move)</h3>
          <div class="frow"><label>Overlay Type</label>
            <select id="io-type">
              ${OV.PRESETS.map(op => `<option value="${op.id}" ${ov.type===op.id?'selected':''}>${op.name}</option>`).join('')}
            </select>
          </div>
          <div class="frow"><label>Text (Hindi / English)</label><textarea id="io-text" rows="2">${ov.text || ''}</textarea></div>
          <div class="frow"><label>Sub-label / Source</label><input id="io-sub" type="text" value="${ov.sub || ''}" /></div>
          <div class="frow2">
            <div class="frow"><label>Font</label>
              <select id="io-font">
                ${HES.text.FONT_OPTIONS.map(([k, nm]) => `<option value="${k}" ${ov.font===k?'selected':''}>${nm}</option>`).join('')}
              </select>
            </div>
            <div class="frow"><label>Size (px)</label><input id="io-size" type="number" min="14" max="160" value="${ov.size || 64}" /></div>
          </div>
          <div class="frow2">
            <div class="frow"><label>Start (s)</label><input id="io-start" type="number" step="0.05" min="0" value="${ov.start}" /></div>
            <div class="frow"><label>Duration (s)</label><input id="io-dur" type="number" step="0.05" min="0.3" value="${ov.dur}" /></div>
          </div>
          <div class="frow2">
            <div class="frow"><label>Accent Color</label><input id="io-col" type="color" value="${ov.color || '#f0a93c'}" style="height:32px;width:100%" /></div>
            <div class="frow"><label>Card Background</label><input id="io-bg" type="color" value="${ov.bg || '#090b10'}" style="height:32px;width:100%" /></div>
          </div>
          <div class="frow"><label>Pos X / Y</label>
            <div class="frow2">
              <input id="io-x" type="range" min="0.05" max="0.95" step="0.01" value="${ov.x ?? 0.5}" />
              <input id="io-y" type="range" min="0.08" max="0.92" step="0.01" value="${ov.y ?? 0.5}" />
            </div>
          </div>
          <div class="frow2" style="margin-top:4px">
            <button id="io-dup" class="btn sm">Duplicate</button>
            <button id="io-del" class="btn sm danger">Delete</button>
          </div>
        </div>`;
      const patchO = fn => mutate(pr => { const o = pr.overlays.find(x => x.id === ov.id); if (o) fn(o); });
      document.getElementById('io-type').onchange = e => patchO(o => { o.type = e.target.value; });
      document.getElementById('io-text').oninput = e => { ov.text = e.target.value; state.proj.overlays.find(x=>x.id===ov.id).text = ov.text; drawStage(); };
      document.getElementById('io-text').onchange = e => patchO(o => { o.text = e.target.value; });
      document.getElementById('io-sub').onchange = e => patchO(o => { o.sub = e.target.value; });
      document.getElementById('io-font').onchange = e => patchO(o => { o.font = e.target.value; });
      document.getElementById('io-size').onchange = e => patchO(o => { o.size = Number(e.target.value) || 64; });
      document.getElementById('io-start').onchange = e => patchO(o => { o.start = Math.max(0, Number(e.target.value) || 0); });
      document.getElementById('io-dur').onchange = e => patchO(o => { o.dur = Math.max(0.3, Number(e.target.value) || 2); });
      document.getElementById('io-col').onchange = e => patchO(o => { o.color = e.target.value; });
      document.getElementById('io-bg').onchange = e => patchO(o => { o.bg = e.target.value; });
      document.getElementById('io-x').oninput = e => { state.proj.overlays.find(x=>x.id===ov.id).x = Number(e.target.value); drawStage(); };
      document.getElementById('io-y').oninput = e => { state.proj.overlays.find(x=>x.id===ov.id).y = Number(e.target.value); drawStage(); };
      document.getElementById('io-x').onchange = () => pushHist(state.proj);
      document.getElementById('io-y').onchange = () => pushHist(state.proj);
      document.getElementById('io-dup').onclick = () => mutate(pr => {
        const cp = deepClone(ov); cp.id = U.uid('ov'); cp.start = Number((ov.start + 0.5).toFixed(2));
        pr.overlays.push(cp); state.selId = cp.id;
      });
      document.getElementById('io-del').onclick = () => mutate(pr => {
        pr.overlays = pr.overlays.filter(x => x.id !== ov.id); state.selId = pr.overlays[0]?.id || null;
      });
    } else if (state.inspTab === 'audio') {
      const bgm = p.audioMeta?.bgm, voc = p.audioMeta?.voice;
      box.innerHTML = `
        <div class="sec">
          <h3>Audio Mix & Beat-Sync Engine</h3>
          <div class="frow"><label>BGM Under Voice (Channel Default: -22 dB)</label>
            <div class="srow"><input id="ia-bgmdb" type="range" min="-38" max="0" step="1" value="${p.bgmDb ?? -22}" /><span class="sval">${p.bgmDb ?? -22} dB</span></div>
          </div>
          <div class="frow"><label>BGM in Voice Pauses / Cold Open</label>
            <div class="srow"><input id="ia-idledb" type="range" min="-30" max="0" step="1" value="${p.bgmIdleDb ?? -12}" /><span class="sval">${p.bgmIdleDb ?? -12} dB</span></div>
          </div>
          <div class="frow"><label>Voiceover Gain</label>
            <div class="srow"><input id="ia-vocdb" type="range" min="-12" max="12" step="1" value="${p.voiceDb ?? 0}" /><span class="sval">${p.voiceDb ?? 0} dB</span></div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input id="ia-duck" type="checkbox" ${p.duck !== false ? 'checked' : ''} style="accent-color:var(--primary)" />
            <span>Auto-Duck BGM when Voice speaks</span>
          </label>
          <div class="frow"><label>Beat-Sync Camera & Glow Reactivity</label>
            <div class="srow"><input id="ia-sync" type="range" min="0" max="1.5" step="0.05" value="${p.beatSync ?? 1}" /><span class="sval">${Math.round((p.beatSync??1)*100)}%</span></div>
          </div>
          <div style="background:var(--raise);border:1px solid var(--line);border-radius:8px;padding:9px;font:11.5px var(--f-mono);display:grid;gap:4px">
            <div>BGM: ${bgm ? `${bgm.bpm} BPM • ${bgm.beats.length} beats • ${bgm.onsets.length} bass hits` : 'Not loaded (using demo)'}</div>
            <div>Voice: ${voc ? `${voc.segments.length} speech bursts • ${voc.pauses.length} pause slots` : 'Not loaded'}</div>
          </div>
        </div>`;
      const patchA = (id, key) => {
        const el = document.getElementById(id);
        el.oninput = () => { state.proj[key] = Number(el.value); el.nextElementSibling.textContent = (key === 'beatSync' ? Math.round(Number(el.value)*100)+'%' : el.value + ' dB'); drawStage(); renderHeaderChips(); };
        el.onchange = () => pushHist(state.proj);
      };
      patchA('ia-bgmdb', 'bgmDb'); patchA('ia-idledb', 'bgmIdleDb'); patchA('ia-vocdb', 'voiceDb'); patchA('ia-sync', 'beatSync');
      document.getElementById('ia-duck').onchange = e => mutate(pr => { pr.duck = e.target.checked; });
    } else {
      box.innerHTML = `
        <div class="sec">
          <h3>Project & Frame Polish</h3>
          <div class="frow"><label>Resolution Preset</label>
            <select id="ip-res">
              <option value="1920x1080" ${p.w===1920&&p.h===1080?'selected':''}>1920 × 1080 (YouTube 16:9)</option>
              <option value="1280x720" ${p.w===1280&&p.h===720?'selected':''}>1280 × 720 (HD Fast)</option>
              <option value="1080x1920" ${p.w===1080&&p.h===1920?'selected':''}>1080 × 1920 (Shorts 9:16)</option>
            </select>
          </div>
          <div class="frow"><label>Frame Rate</label>
            <select id="ip-fps">
              <option value="30" ${p.fps===30?'selected':''}>30 fps</option>
              <option value="60" ${p.fps===60?'selected':''}>60 fps</option>
            </select>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input id="ip-bars" type="checkbox" ${p.cinemaBars ? 'checked' : ''} style="accent-color:var(--primary)" />
            <span>Cinema Letterbox Bars (138px top/bottom)</span>
          </label>
          <div class="frow"><label>16mm Film Grain</label>
            <div class="srow"><input id="ip-grain" type="range" min="0" max="0.35" step="0.02" value="${p.grain ?? 0.14}" /><span class="sval">${Math.round((p.grain??0.14)*100)}%</span></div>
          </div>
          <div class="frow"><label>Canvas Background</label><input id="ip-bg" type="color" value="${p.bg || '#07090d'}" style="height:32px;width:100%" /></div>
        </div>`;
      document.getElementById('ip-res').onchange = e => { const [w, h] = e.target.value.split('x').map(Number); mutate(pr => { pr.w = w; pr.h = h; }); };
      document.getElementById('ip-fps').onchange = e => mutate(pr => { pr.fps = Number(e.target.value); });
      document.getElementById('ip-bars').onchange = e => mutate(pr => { pr.cinemaBars = e.target.checked; });
      document.getElementById('ip-grain').oninput = e => { state.proj.grain = Number(e.target.value); e.target.nextElementSibling.textContent = Math.round(Number(e.target.value)*100)+'%'; drawStage(); };
      document.getElementById('ip-grain').onchange = () => pushHist(state.proj);
      document.getElementById('ip-bg').onchange = e => mutate(pr => { pr.bg = e.target.value; });
    }
  }

  function renderTimeline() {
    const body = document.getElementById('hes-tl-body');
    if (!body) return;
    const p = state.proj, tl = E.resolveTimeline(p), Z = state.tlZoom;
    const laneW = Math.max(700, Math.ceil((tl.totalDur + 2) * Z));

    // Build ruler ticks
    const step = Z >= 95 ? 0.5 : Z >= 55 ? 1 : 2;
    let ticks = '';
    for (let t = 0; t <= tl.totalDur + 1; t += step) {
      const maj = Math.abs(t - Math.round(t)) < 0.01;
      ticks += `<div class="tick ${maj ? '' : 'min'}" style="left:${t * Z}px">${maj ? t.toFixed(0) + 's' : ''}</div>`;
    }

    // Build Shots row
    let shotHtml = '';
    tl.items.forEach((it, i) => {
      const sel = state.selType === 'shot' && state.selId === it.shot.id;
      shotHtml += `<div class="bar g-scene ${sel ? 'sel' : ''}" data-sbar="${it.shot.id}" style="left:${it.start * Z}px;width:${Math.max(24, it.dur * Z)}px" title="${it.shot.label} (${it.shot.motion})">
        <span>${i + 1}. ${it.shot.label}</span>
        <div class="edge r" data-sed="${it.shot.id}"></div>
      </div>`;
      if (i > 0) {
        shotHtml += `<button class="trchip" data-trbtn="${it.shot.id}" style="left:${it.start * Z}px" title="Click to cycle transition">${it.shot.trIn}</button>`;
      }
    });

    // Build Overlays row
    let ovHtml = '';
    for (const ov of (p.overlays || [])) {
      const sel = state.selType === 'overlay' && state.selId === ov.id;
      ovHtml += `<div class="bar g-screen ${sel ? 'sel' : ''}" data-obar="${ov.id}" style="left:${ov.start * Z}px;width:${Math.max(20, ov.dur * Z)}px">
        <div class="edge l" data-oel="${ov.id}"></div>
        <span>${ov.text || ov.type}</span>
        <div class="edge r" data-oer="${ov.id}"></div>
      </div>`;
    }

    body.innerHTML = `
      <div class="tlinner" style="width:${165 + laneW}px">
        <div class="trow rul"><div class="tlabel">Timecode</div><div id="tl-rul" class="lane" style="width:${laneW}px">${ticks}</div></div>
        <div class="trow"><div class="tlabel"><span class="dot" style="background:var(--scene)"></span>Hook Shots</div><div class="lane" style="width:${laneW}px">${shotHtml}</div></div>
        <div class="trow"><div class="tlabel"><span class="dot" style="background:var(--screen)"></span>Overlays</div><div class="lane" style="width:${laneW}px">${ovHtml}</div></div>
        <div class="trow wave"><div class="tlabel"><span class="dot" style="background:var(--audio)"></span>Voiceover</div><div class="lane" style="width:${laneW}px"><canvas id="w-voice" class="wcanvas" width="${laneW}" height="44"></canvas></div></div>
        <div class="trow wave"><div class="tlabel"><span class="dot" style="background:var(--map)"></span>BGM + Beats</div><div class="lane" style="width:${laneW}px"><canvas id="w-bgm" class="wcanvas" width="${laneW}" height="44"></canvas></div></div>
        <div id="hes-ph" class="ph" style="left:${165 + state.t * Z}px"></div>
      </div>`;

    drawWaveforms(laneW, Z);

    // Scrubbing on ruler / empty wave lanes
    body.querySelectorAll('.lane').forEach(l => l.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.bar, .trchip')) return;
      const r = l.getBoundingClientRect();
      const move = e2 => seekTo(Math.max(0, (e2.clientX - r.left) / Z));
      move(ev);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true });
    }));

    // Select & trim shots
    body.querySelectorAll('[data-sbar]').forEach(el => el.onpointerdown = ev => {
      const sid = el.dataset.sbar;
      if (ev.target.dataset.sed) {
        ev.stopPropagation();
        const sx = ev.clientX, sh = state.proj.shots.find(x => x.id === sid), sd = sh.dur;
        const mv = e2 => { sh.dur = Math.max(0.4, Number((sd + (e2.clientX - sx) / Z).toFixed(2))); renderTimeline(); drawStage(); };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', () => { window.removeEventListener('pointermove', mv); pushHist(state.proj); renderInspector(); }, { once: true });
        return;
      }
      state.selType = 'shot'; state.selId = sid; state.inspTab = 'shot';
      document.querySelector('[data-itab="shot"]').classList.add('active');
      document.querySelectorAll('[data-itab]').forEach(b => b.setAttribute('aria-selected', b.dataset.itab === 'shot'));
      renderTimeline(); renderInspector();
    });

    // Cycle transition chip
    body.querySelectorAll('[data-trbtn]').forEach(btn => btn.onclick = ev => {
      ev.stopPropagation();
      const sid = btn.dataset.trbtn;
      const keys = TR.LIST.map(x => x[0]);
      mutate(pr => {
        const s = pr.shots.find(x => x.id === sid);
        if (!s) return;
        s.trIn = keys[(keys.indexOf(s.trIn || 'cut') + 1) % keys.length];
        if (s.trIn !== 'cut' && !s.trDur) s.trDur = 0.28;
      });
    });

    // Select, drag & trim overlays
    body.querySelectorAll('[data-obar]').forEach(el => el.onpointerdown = ev => {
      const oid = el.dataset.obar, ov = state.proj.overlays.find(x => x.id === oid);
      if (!ov) return;
      state.selType = 'overlay'; state.selId = oid; state.inspTab = 'overlay';
      document.querySelectorAll('[data-itab]').forEach(b => b.setAttribute('aria-selected', b.dataset.itab === 'overlay'));
      renderInspector();
      const sx = ev.clientX, origStart = ov.start, origDur = ov.dur;
      const mode = ev.target.dataset.oer ? 'r' : ev.target.dataset.oel ? 'l' : 'move';
      const mv = e2 => {
        const dt = (e2.clientX - sx) / Z;
        if (mode === 'move') ov.start = Math.max(0, Number((origStart + dt).toFixed(2)));
        else if (mode === 'r') ov.dur = Math.max(0.3, Number((origDur + dt).toFixed(2)));
        else { const ns = Math.max(0, Math.min(origStart + origDur - 0.3, origStart + dt)); ov.dur = Number((origStart + origDur - ns).toFixed(2)); ov.start = Number(ns.toFixed(2)); }
        renderTimeline(); drawStage();
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', () => { window.removeEventListener('pointermove', mv); pushHist(state.proj); renderInspector(); }, { once: true });
    });
  }

  function drawWaveforms(laneW, Z) {
    const p = state.proj;
    // Voice waveform
    const vc = document.getElementById('w-voice');
    if (vc) {
      const cx = vc.getContext('2d');
      cx.clearRect(0, 0, laneW, 44);
      const vm = p.audioMeta?.voice;
      if (vm && vm.wave) {
        const dur = vm.dur;
        cx.fillStyle = 'rgba(155, 132, 245, 0.22)';
        for (const seg of (vm.segments || [])) cx.fillRect(seg.s * Z, 4, (seg.e - seg.s) * Z, 36);
        cx.fillStyle = '#9b84f5';
        for (let i = 0; i < vm.wave.length; i++) {
          const x = (i / vm.wave.length) * dur * Z;
          const h = Math.max(2, vm.wave[i] * 34);
          cx.fillRect(x, 22 - h / 2, Math.max(1.5, (dur * Z) / vm.wave.length - 1), h);
        }
      } else {
        cx.fillStyle = 'rgba(138,147,165,0.45)';
        cx.font = '11px sans-serif';
        cx.fillText('Upload voiceover to auto-duck BGM & align cuts to pauses', 12, 26);
      }
    }
    // BGM waveform + gold beat markers
    const bc = document.getElementById('w-bgm');
    if (bc) {
      const cx = bc.getContext('2d');
      cx.clearRect(0, 0, laneW, 44);
      const bm = p.audioMeta?.bgm;
      if (bm && bm.wave) {
        const dur = bm.dur;
        cx.fillStyle = '#3fa7b5';
        for (let i = 0; i < bm.wave.length; i++) {
          const x = (i / bm.wave.length) * dur * Z;
          const h = Math.max(2, bm.wave[i] * 30);
          cx.fillRect(x, 22 - h / 2, Math.max(1.5, (dur * Z) / bm.wave.length - 1), h);
        }
        for (const bt of (bm.beats || [])) {
          cx.fillStyle = 'rgba(240, 169, 59, 0.45)';
          cx.fillRect(bt * Z, 4, 1.5, 36);
        }
        for (const db of (bm.downbeats || [])) {
          cx.fillStyle = '#f0a93b';
          cx.fillRect(db * Z - 1, 0, 2.5, 44);
        }
      }
    }
  }

  function renderAll() {
    if (!state.proj) return;
    renderHeaderChips();
    renderLibrary();
    renderInspector();
    renderTimeline();
    updatePlayheadUI();
  }

  // ---------- Export Modal ----------
  function openExportModal() {
    const m = document.getElementById('hes-export-modal');
    const p = state.proj;
    m.hidden = false;
    m.innerHTML = `
      <div class="dlg">
        <h2><span>Export Edited Hook</span><button id="ex-close" class="btn sm">✕</button></h2>
        <div class="frow"><label>Export Mode</label>
          <select id="ex-mode">
            <option value="composite">Full Edited Hook MP4 (Visuals + Overlays + Mixed Audio)</option>
            <option value="alpha">Transparent Overlays WebM (Alpha for CapCut Layer)</option>
            <option value="green">Green Screen Overlays MP4</option>
            <option value="blue">Blue Screen Overlays MP4</option>
          </select>
        </div>
        <div class="frow2">
          <div class="frow"><label>Resolution</label>
            <select id="ex-size">
              <option value="1920x1080" ${p.w===1920?'selected':''}>1920 × 1080</option>
              <option value="1280x720" ${p.w===1280?'selected':''}>1280 × 720</option>
              <option value="1080x1920" ${p.w===1080?'selected':''}>1080 × 1920 (Shorts)</option>
            </select>
          </div>
          <div class="frow"><label>FPS</label>
            <select id="ex-fps"><option value="30" selected>30 fps</option><option value="60">60 fps</option></select>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input id="ex-audio" type="checkbox" checked style="accent-color:var(--primary)" />
          <span>Include Mixed BGM (${p.bgmDb ?? -22} dB ducked) + Voiceover Audio</span>
        </label>
        <div class="pbar"><i id="ex-bar"></i></div>
        <div id="ex-stat" style="font:12px var(--f-mono);color:var(--muted)">Ready to encode offline via WebCodecs + Mediabunny.</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="ex-cancel" class="btn">Cancel</button>
          <button id="ex-go" class="btn pri">Render & Download</button>
        </div>
      </div>`;
    let abortCtrl = null;
    const close = () => { if (abortCtrl) abortCtrl.abort(); m.hidden = true; };
    document.getElementById('ex-close').onclick = close;
    document.getElementById('ex-cancel').onclick = close;
    document.getElementById('ex-go').onclick = async () => {
      const goBtn = document.getElementById('ex-go');
      goBtn.disabled = true;
      abortCtrl = new AbortController();
      const mode = document.getElementById('ex-mode').value;
      const size = document.getElementById('ex-size').value;
      const fps = Number(document.getElementById('ex-fps').value);
      const includeAudio = document.getElementById('ex-audio').checked;
      try {
        const res = await EXP.run(state.proj, { mode, size, fps, includeAudio, format: mode === 'alpha' ? 'webm' : 'mp4', signal: abortCtrl.signal }, (pct, msg) => {
          document.getElementById('ex-bar').style.width = `${Math.round(pct * 100)}%`;
          document.getElementById('ex-stat').textContent = `${Math.round(pct * 100)}% — ${msg}`;
        });
        EXP.downloadBlob(res.blob, res.filename);
        document.getElementById('ex-stat').textContent = `Done! Downloaded ${res.filename} (${(res.bytes / 1048576).toFixed(2)} MB)`;
      } catch (err) {
        document.getElementById('ex-stat').textContent = 'Export error: ' + err.message;
      } finally {
        goBtn.disabled = false;
      }
    };
  }

  // ---------- Headless API (render.mjs + qa-sheet.mjs) ----------
  window.HOOKSTUDIO = {
    async load(projJson) {
      const p = typeof projJson === 'string' ? JSON.parse(projJson) : deepClone(projJson);
      await HES.text.ready();
      await E.ingestProjectMedia(p, true);
      // Ensure deterministic beat grid if audioMeta absent
      if (!p.audioMeta || !p.audioMeta.bgm) {
        const bpm = p.style === 'dhruv' ? 84 : 105;
        const period = 60 / bpm;
        const beats = [], downbeats = [];
        for (let i = 0, t = 0; t < 120; i++, t += period) {
          beats.push(Number(t.toFixed(3)));
          if (i % 4 === 0) downbeats.push(Number(t.toFixed(3)));
        }
        p.audioMeta = p.audioMeta || {};
        p.audioMeta.bgm = { dur: 120, bpm, beatPeriod: period, beats, downbeats, onsets: downbeats, energy: new Array(200).fill(0.55), wave: new Array(200).fill(0.5), name: `Beat (${bpm} BPM)` };
      }
      state.proj = p;
      const tl = E.resolveTimeline(p);
      if (!window.__HEADLESS) { renderAll(); drawStage(); }
      return { duration: tl.totalDur, shots: p.shots.length, overlays: (p.overlays || []).length, bpm: p.audioMeta.bgm.bpm };
    },
    async frame(t, mode = 'composite', quality = 0.94) {
      const p = state.proj;
      await E.seekVideosForTime(p, Number(t) || 0);
      if (!window.HOOKSTUDIO._c) window.HOOKSTUDIO._c = U.canvas(p.w || 1920, p.h || 1080);
      const c = window.HOOKSTUDIO._c;
      const W = p.w || 1920, H = p.h || 1080;
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const ctx = c.getContext('2d');
      E.renderAt(ctx, p, Number(t) || 0, { W, H, mode, guides: false });
      return mode === 'alpha' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', quality);
    },
    autoedit(opts = {}) {
      const next = AE.generate(state.proj, opts);
      state.proj = next;
      const tl = E.resolveTimeline(next);
      return { duration: tl.totalDur, shots: next.shots.length, overlays: next.overlays.length, style: next.style };
    },
    async sheet(presetIds, w = 360, h = 202) {
      await HES.text.ready();
      const ids = presetIds && presetIds.length ? presetIds : M.PRESETS.map(x => x.id);
      const cols = 4, rows = Math.ceil(ids.length / cols);
      const c = document.getElementById('hesSheet');
      c.width = cols * w; c.height = rows * (h + 28);
      const cx = c.getContext('2d');
      cx.fillStyle = '#101318'; cx.fillRect(0, 0, c.width, c.height);
      const med = E.allMedia()[0];
      ids.forEach((id, idx) => {
        const col = idx % cols, row = Math.floor(idx / cols);
        const x = col * w, y = row * (h + 28);
        cx.save(); cx.translate(x, y);
        cx.beginPath(); cx.rect(0, 0, w, h); cx.clip();
        M.renderShot(cx, { motion: id, tension: 0.72, zoom: 1, panX: 0, panY: 0, seed: 31 + idx }, 1.1, 2.2, w, h, { beatPulse: 0.85, downbeatPulse: 0.6, onsetPulse: 0.7, combined: 0.75, energy: 0.75, beatIndex: 3 }, med, 1);
        cx.restore();
        cx.fillStyle = '#171b22'; cx.fillRect(x, y + h, w, 28);
        cx.fillStyle = '#e6e9ef'; cx.font = 'bold 13px sans-serif';
        cx.fillText(id, x + 8, y + h + 18);
      });
      return c.toDataURL('image/jpeg', 0.88);
    },
  };

  // ---------- Boot ----------
  window.addEventListener('DOMContentLoaded', async () => {
    if (window.__HEADLESS) return;
    buildAppShell();
    let initial = null;
    try { const raw = localStorage.getItem(LS_KEY); if (raw) initial = JSON.parse(raw); } catch {}
    if (!initial || !initial.shots || !initial.shots.length) initial = TPL.createProject('fw-hybrid');
    state.selType = 'shot';
    state.selId = initial.shots[0] ? initial.shots[0].id : null;
    await HES.text.ready();
    await E.ingestProjectMedia(initial);
    setProj(initial, true);
    applyMobileVisibility();
    if (!window.__HEADLESS) loadDemoBeat(105);
  });
})();
