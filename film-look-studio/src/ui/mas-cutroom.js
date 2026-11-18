/* ============================================================================
   Map Animation Studio Unified Cutroom Engine (mas-cutroom.js)
   Brings the complete Map Animation Studio Timeline, 4-Tab Inspector (Layer,
   Animate, Camera, Project), 4-Tab Library & Media Manager (Quick, Add,
   Templates, Media), Interactive Stage Preview (Pan/Zoom, Select/Group,
   Move Layer, View Zoom, Set Camera Here, Full Screen F11, Keyframe Recording),
   Top Bar (150-step Undo/Redo, Hide Panels, Project Menu), and Dual Browser +
   Server Export Engine to all Favorite World Studios.
   ============================================================================ */
(() => {
  'use strict';
  if (window.__MAS_CUTROOM_LOADED) return;
  window.__MAS_CUTROOM_LOADED = true;

  const FPS_DEFAULT = 30;
  const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  const QUICK_COLORS = ['auto', '#ffb347', '#ff4d5e', '#3fa7b5', '#57d18b', '#9b84f5', '#ffffff'];
  const EASES = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'back', 'elastic', 'bounce', 'hold'];
  const CAMERA_MOVES = [
    ['sky-to-ground', 'Zoom · Sky to ground'],
    ['push-in', 'Zoom · Slow push-in'],
    ['pull-back', 'Zoom · Pull back reveal'],
    ['snap-zoom', 'Zoom · Breaking-news snap zoom'],
    ['orbit-cw', 'Orbit · 360° clockwise orbit'],
    ['orbit-ccw', 'Orbit · Counter-clockwise orbit'],
    ['tilt-reveal', '3D · Tilt up horizon reveal'],
    ['crane-up', '3D · High crane rise'],
    ['drift-right', 'Pan · Cinematic lateral drift'],
    ['whip-pan', 'Pan · Fast whip transition'],
    ['chase-cam', 'Follow · Dynamic chase cam'],
    ['handheld-doc', 'Doc · Handheld documentary float'],
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const r3 = v => Math.round((+v || 0) * 1000) / 1000;
  const uid = (p = 'mas') => p + '_' + Math.random().toString(36).slice(2, 9);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = sec => {
    const s = Math.max(0, +sec || 0);
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(1).padStart(4, '0');
    return `${String(m).padStart(2, '0')}:${rem}`;
  };

  /* ---------- Map Animation Studio 8-Easing Keyframe Evaluator ---------- */
  function evalEase(t, ease = 'ease-in-out') {
    const x = clamp(t, 0, 1);
    switch (ease) {
      case 'linear': return x;
      case 'hold': return x < 1 ? 0 : 1;
      case 'ease-in': return x * x * x;
      case 'ease-out': return 1 - Math.pow(1 - x, 3);
      case 'back': {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      }
      case 'elastic': {
        if (x === 0 || x === 1) return x;
        return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
      }
      case 'bounce': {
        const n1 = 7.5625, d1 = 2.75;
        let v = x;
        if (v < 1 / d1) return n1 * v * v;
        if (v < 2 / d1) return n1 * (v -= 1.5 / d1) * v + 0.75;
        if (v < 2.5 / d1) return n1 * (v -= 2.25 / d1) * v + 0.9375;
        return n1 * (v -= 2.625 / d1) * v + 0.984375;
      }
      case 'ease-in-out':
      default:
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
  }

  function evaluateKeys(keys, localSec) {
    if (!Array.isArray(keys) || !keys.length) {
      return { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, active: false };
    }
    const sorted = keys.slice().sort((a, b) => (+a.t || 0) - (+b.t || 0));
    if (localSec <= (+sorted[0].t || 0)) {
      const k = sorted[0];
      return { opacity: k.opacity ?? 1, scale: k.scale ?? 1, x: +k.x || 0, y: +k.y || 0, rotate: +k.rotate || 0, active: true };
    }
    const last = sorted[sorted.length - 1];
    if (localSec >= (+last.t || 0)) {
      return { opacity: last.opacity ?? 1, scale: last.scale ?? 1, x: +last.x || 0, y: +last.y || 0, rotate: +last.rotate || 0, active: true };
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const ta = +a.t || 0, tb = +b.t || 0;
      if (localSec >= ta && localSec <= tb) {
        const span = Math.max(1e-4, tb - ta);
        const p = evalEase((localSec - ta) / span, b.ease || 'ease-in-out');
        return {
          opacity: lerp(a.opacity ?? 1, b.opacity ?? 1, p),
          scale: lerp(a.scale ?? 1, b.scale ?? 1, p),
          x: lerp(+a.x || 0, +b.x || 0, p),
          y: lerp(+a.y || 0, +b.y || 0, p),
          rotate: lerp(+a.rotate || 0, +b.rotate || 0, p),
          active: true,
        };
      }
    }
    return { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, active: false };
  }

  function makePresetKeys(presetId, dur = 3) {
    const d = Math.max(0.4, +dur || 3);
    const intro = Math.min(0.65, d * 0.35);
    switch (presetId) {
      case 'pop':
        return [
          { t: 0, opacity: 0, scale: 0.25, x: 0, y: 0, rotate: -6, ease: 'ease-out' },
          { t: r3(intro), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'back' },
        ];
      case 'slide-up':
        return [
          { t: 0, opacity: 0, scale: 1, x: 0, y: 110, rotate: 0, ease: 'ease-out' },
          { t: r3(intro), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'ease-out' },
        ];
      case 'zoom-in':
        return [
          { t: 0, opacity: 0, scale: 0.45, x: 0, y: 0, rotate: 0, ease: 'ease-in-out' },
          { t: r3(intro), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'ease-out' },
          { t: r3(d), opacity: 1, scale: 1.15, x: 0, y: 0, rotate: 0, ease: 'linear' },
        ];
      case 'spin-in':
        return [
          { t: 0, opacity: 0, scale: 0.2, x: 0, y: 0, rotate: -140, ease: 'ease-out' },
          { t: r3(intro), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'back' },
        ];
      case 'fade':
      default:
        return [
          { t: 0, opacity: 0, scale: 1, x: 0, y: 0, rotate: 0, ease: 'ease-out' },
          { t: r3(intro), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'ease-in-out' },
          { t: r3(Math.max(intro + 0.1, d - 0.45)), opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, ease: 'linear' },
          { t: r3(d), opacity: 0, scale: 1, x: 0, y: 0, rotate: 0, ease: 'ease-in' },
        ];
    }
  }

  window.MASKeyframes = { evalEase, evaluateKeys, makePresetKeys };
})();

/* ============================================================================
   Part 2: Map Animation Studio Cutroom UI, Multi-Track Timeline, 4-Tab Inspector,
   4-Tab Library/Media, Stage Overlay/Transport, and Dual Export Engine
   ============================================================================ */
(() => {
  'use strict';
  const { evalEase, evaluateKeys, makePresetKeys } = window.MASKeyframes;

  const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  const QUICK_COLORS = ['auto', '#ffb347', '#ff4d5e', '#3fa7b5', '#57d18b', '#9b84f5', '#ffffff'];
  const EASES = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'back', 'elastic', 'bounce', 'hold'];
  const FX_TRANSITIONS = ['dissolve', 'zoom', 'cut'];
  const CAMERA_MOVES = [
    ['sky-to-ground', 'Zoom · Sky to ground'],
    ['push-in', 'Zoom · Slow push-in'],
    ['pull-back', 'Zoom · Pull back reveal'],
    ['snap-zoom', 'Zoom · Breaking-news snap zoom'],
    ['orbit-cw', 'Orbit · 360° clockwise orbit'],
    ['orbit-ccw', 'Orbit · Counter-clockwise orbit'],
    ['tilt-reveal', '3D · Tilt up horizon reveal'],
    ['crane-up', '3D · High crane rise'],
    ['drift-right', 'Pan · Cinematic lateral drift'],
    ['whip-pan', 'Pan · Fast whip transition'],
    ['chase-cam', 'Follow · Dynamic chase cam'],
    ['handheld-doc', 'Doc · Handheld documentary float'],
  ];
  const EXPORT_QUALITIES = [
    { id: 'high', name: 'YouTube quality MP4 (recommended)', desc: 'H.264, CRF 16, BT.709, 320 kbps audio. Looks identical on YouTube and exports several times faster.' },
    { id: 'max', name: 'Master quality MP4 (slow)', desc: 'H.264, CRF 12, slow preset, lossless frames. For archive masters.' },
    { id: 'prores', name: 'ProRes 4444 / Alpha (.mov / .webm / ZIP)', desc: 'Master for Premiere Pro / DaVinci Resolve / CapCut grading & alpha compositing.' },
    { id: 'draft', name: 'Quick draft MP4', desc: 'Fastest, smaller, for checking timing.' },
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
  const r3 = v => Math.round((+v || 0) * 1000) / 1000;
  const uid = (p = 'mas') => p + '_' + Math.random().toString(36).slice(2, 9);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = sec => {
    const s = Math.max(0, +sec || 0);
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(1).padStart(4, '0');
    return `${String(m).padStart(2, '0')}:${rem}`;
  };

  const GROUP_DOT_COLOR = {
    map: '#3fa7b5',
    screen: '#f0a93b',
    audio: '#9b84f5',
    scene: '#5b8cff',
  };

  /* ---------- Global Cutroom State ---------- */
  const MAS = {
    pps: 54,
    fit: true,
    snapOn: true,
    snapAt: null,
    addMode: localStorage.getItem('mas:addMode') || 'layer',
    itab: 'layer',       // 'layer' | 'animate' | 'camera' | 'project'
    ltab: 'templates',   // 'quick' | 'add' | 'templates' | 'media'
    sel: { kind: 'layer', i: 0, key: null },
    closedGroups: {},
    renaming: null,
    ctxMenu: null,
    recording: false,
    stageTool: 'camera', // 'camera' | 'select' | 'layer'
    frameScale: 1,
    isFullscreen: false,
    hideLeft: false,
    hideRight: false,
    online: false,
    serverMedia: [],
    serverOutputs: [],
    sessionOutputs: [],
    exportQuality: localStorage.getItem('mas:exportQuality') || 'high',
    sfxEnabled: false,
    sfxVolume: 0.8,
  };

  /* ---------- Server Health & Media Check ---------- */
  async function checkServer() {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        MAS.online = Boolean(j && j.ok);
      } else {
        const r2 = await fetch('/api/info', { cache: 'no-store' });
        MAS.online = r2.ok;
      }
      if (MAS.online) {
        fetch('/api/media').then(x => x.ok ? x.json() : []).then(list => { if (Array.isArray(list)) MAS.serverMedia = list; }).catch(() => {});
        fetch('/api/outputs').then(x => x.ok ? x.json() : []).then(list => { if (Array.isArray(list)) MAS.serverOutputs = list; }).catch(() => {});
      }
    } catch {
      MAS.online = false;
    }
    const badge = document.getElementById('mas-server-chip');
    if (badge) {
      badge.textContent = MAS.online ? 'Server Online' : 'Local Studio';
      badge.className = 'mas-chip ' + (MAS.online ? 'ok' : '');
    }
  }

  /* ---------- Bridge Discovery ---------- */
  function getBridge() {
    return window.__MAS_STUDIO_BRIDGE || null;
  }

  /* ---------- Snap Helper ---------- */
  function snapTargets(bridge, excludeIdx) {
    const total = bridge.getDuration();
    const t = bridge.getTime();
    const c = [0, total, t];
    const layers = bridge.getLayers();
    layers.forEach((l, i) => {
      if (i === excludeIdx) return;
      c.push(l.startSec, l.endSec);
    });
    if (excludeIdx !== 'cam') {
      for (const k of bridge.getCameraKeys()) c.push(k.t);
    }
    return c;
  }

  function snapTime(v, targets, altKey) {
    const bridge = getBridge();
    const fps = bridge ? bridge.getFps() : 30;
    const q = Math.round(v * fps) / fps;
    if (!MAS.snapOn || altKey) return { v: q, at: null };
    let best = null;
    for (const c of targets) {
      if (Math.abs(c - v) * MAS.pps < 7 && (best === null || Math.abs(c - v) < Math.abs(best - v))) {
        best = c;
      }
    }
    return best === null ? { v: q, at: null } : { v: best, at: best };
  }

  /* ---------- Drag Helper ---------- */
  function startDrag(e, onMove, onEnd) {
    e.preventDefault();
    const x0 = e.clientX;
    const move = ev => onMove((ev.clientX - x0) / MAS.pps, ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      MAS.snapAt = null;
      if (onEnd) onEnd();
      renderMASTimeline();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* ---------- Render Map Animation Studio Multi-Track Timeline ---------- */
  function renderMASTimeline() {
    const bridge = getBridge();
    const host = document.getElementById('mas-timeline-mount');
    if (!bridge || !host) return;

    const total = Math.max(0.5, bridge.getDuration());
    const t = clamp(bridge.getTime(), 0, total);
    const fps = bridge.getFps();
    const layers = bridge.getLayers();
    const camKeys = bridge.getCameraKeys();
    const camSpans = bridge.getCameraSpans ? bridge.getCameraSpans() : [];

    const labelW = window.innerWidth <= 900 ? 132 : 196;
    const boxW = host.clientWidth || 860;
    if (MAS.fit) {
      MAS.pps = Math.max(6, (boxW - labelW - 36) / Math.max(1, total * 1.04));
    }
    const span = Math.max(total * 1.12, total + 1.5);
    const laneW = Math.max(300, Math.round(span * MAS.pps));

    // Graduated ticks
    const step = STEPS.find(s => s * MAS.pps >= 62) || 120;
    const minor = step / 5;
    const ticks = [];
    for (let v = 0; v <= span + 1e-6; v += minor) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-5;
      if (!major && minor * MAS.pps < 7) continue;
      const s = Math.round(v * 100) / 100;
      const lbl = step < 1 ? `${s.toFixed(1)}s` : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${s}s`;
      ticks.push({ x: Math.round(v * MAS.pps), major, label: major ? lbl : '' });
    }

    // Separate attached effects vs main rows
    const isFx = l => Boolean(l.attachTo && (l.attachTo === 'camera' || layers.some(m => m.id === l.attachTo && !m.attachTo)));
    const fxOf = id => layers.map((l, i) => ({ l, i })).filter(({ l }) => l.attachTo === id && isFx(l));
    const mainRows = layers.map((l, i) => ({ l, i })).filter(({ l }) => !isFx(l));

    // Group blocks
    const blocks = [];
    const seenGroups = new Map();
    for (const row of mainRows) {
      const gname = (row.l.group || '').trim();
      if (!gname) {
        blocks.push({ kind: 'layer', row });
        continue;
      }
      let b = seenGroups.get(gname);
      if (!b) {
        b = { kind: 'group', name: gname, rows: [] };
        seenGroups.set(gname, b);
        blocks.push(b);
      }
      b.rows.push(row);
    }

    const selLayerIdx = MAS.sel.kind === 'layer' ? MAS.sel.i : -1;
    const playX = labelW + t * MAS.pps;

    const renderFxChips = parentId =>
      fxOf(parentId)
        .map(({ l: f, i: fi }) => {
          const left = Math.round(f.startSec * MAS.pps);
          const w = Math.max(8, Math.round((f.endSec - f.startSec) * MAS.pps));
          return `<div class="mas-fxchip ${selLayerIdx === fi ? 'sel' : ''}" data-mas-fx="${fi}" style="left:${left}px;width:${w}px" title="Effect: ${esc(f.name)} (${f.startSec.toFixed(2)}s → ${f.endSec.toFixed(2)}s)">
            <div class="mas-edge l" data-mas-bar-edge="l" data-mas-idx="${fi}"></div>
            <span>⚡ ${esc(f.name)}${f.fx?.hold ? ' ⏸' : ''}</span>
            <div class="mas-edge r" data-mas-bar-edge="r" data-mas-idx="${fi}"></div>
          </div>`;
        })
        .join('');

    const renderLayerRow = ({ l, i }, inGroup = false) => {
      const g = l.groupColor || 'screen';
      const isSel = selLayerIdx === i;
      const isMaster = Boolean(l.isGroupMaster);
      const left = Math.round(l.startSec * MAS.pps);
      const width = Math.max(6, Math.round((l.endSec - l.startSec) * MAS.pps));
      const padLeft = inGroup ? (isMaster ? 12 : 20) : 8;
      return `<div class="mas-trow ${isSel ? 'sel' : ''} ${l.hidden ? 'off' : ''}" data-mas-row="${i}">
        <div class="mas-tlabel" style="padding-left:${padLeft}px" data-mas-select="${i}" title="${esc(l.name)} · Click to select, double-click to rename, right-click for quick edit">
          <span class="mas-dot" style="background:${isMaster ? 'var(--mas-primary)' : (l.color && l.color !== 'auto' ? l.color : GROUP_DOT_COLOR[g] || '#f0a93b')}"></span>
          ${MAS.renaming === i
            ? `<input type="text" class="mas-rename-in" data-mas-rename-in="${i}" value="${esc(l.name)}" style="height:20px;padding:1px 5px;font-size:11px;width:100%" />`
            : `<span class="mas-nm" style="${isMaster ? 'font-weight:700;color:#ffd79a' : ''}">${isMaster ? '★ ' : ''}${esc(l.name)}</span>`
          }
          <button type="button" class="mas-eye" data-mas-toggle-hide="${i}" title="${l.hidden ? 'Show layer' : 'Hide layer'}">${l.hidden ? '○' : '●'}</button>
          <button type="button" class="mas-eye" data-mas-del-layer="${i}" style="color:var(--mas-danger)" title="Delete layer">×</button>
        </div>
        <div class="mas-lane" data-mas-lane="${i}" data-mas-uid="${esc(l.id)}" style="width:${laneW}px">
          <div class="mas-beyond" style="left:${Math.round(total * MAS.pps)}px;width:${Math.max(0, laneW - Math.round(total * MAS.pps))}px"></div>
          <div class="mas-bar g-${g} ${isSel ? 'sel' : ''}" data-mas-bar="${i}" style="left:${left}px;width:${width}px" title="${esc(l.name)}: ${l.startSec.toFixed(2)}s → ${l.endSec.toFixed(2)}s · Drag to move, drag edges to trim, right-click for quick edit">
            <div class="mas-edge l" data-mas-bar-edge="l" data-mas-idx="${i}"></div>
            <span>${esc(l.icon || '◆')} ${esc(l.name)}</span>
            <div class="mas-edge r" data-mas-bar-edge="r" data-mas-idx="${i}"></div>
          </div>
          ${(l.keys || []).map((k, ki) => {
            const kx = Math.round((l.startSec + (+k.t || 0)) * MAS.pps);
            const kSel = isSel && MAS.sel.key === ki;
            return `<div class="mas-kf ${kSel ? 'sel' : ''}" data-mas-kf="${i}:${ki}" style="left:${kx}px" title="Keyframe at ${(l.startSec + (+k.t || 0)).toFixed(2)}s · opacity ${k.opacity ?? 1} · scale ${k.scale ?? 1} · ${k.ease || 'ease-in-out'}"></div>`;
          }).join('')}
          ${renderFxChips(l.id)}
        </div>
      </div>`;
    };

    const renderBlock = b => {
      if (b.kind === 'layer') return renderLayerRow(b.row, false);
      const closed = Boolean(MAS.closedGroups[b.name]);
      const s0 = Math.min(...b.rows.map(r => r.l.startSec));
      const e0 = Math.max(...b.rows.map(r => r.l.endSec));
      const memberCount = b.rows.length;
      return `<div class="mas-trow ghead" data-mas-group="${esc(b.name)}">
        <div class="mas-tlabel" data-mas-group-toggle="${esc(b.name)}" title="Group “${esc(b.name)}” · Click to fold/unfold, right-click for Group Quick Edit">
          <button type="button" class="mas-eye" style="opacity:1">${closed ? '＋' : '－'}</button>
          <span class="mas-nm" style="font-weight:700">★ ${esc(b.name)}</span>
          <span class="mas-chip" style="padding:1px 5px;font-size:9.5px">${memberCount}</span>
          <button type="button" class="mas-eye" data-mas-del-group="${esc(b.name)}" style="color:var(--mas-danger)" title="Delete entire group">×</button>
        </div>
        <div class="mas-lane" style="width:${laneW}px">
          <div class="mas-beyond" style="left:${Math.round(total * MAS.pps)}px;width:${Math.max(0, laneW - Math.round(total * MAS.pps))}px"></div>
          <div class="mas-bar gbar" data-mas-group-bar="${esc(b.name)}" style="left:${Math.round(s0 * MAS.pps)}px;width:${Math.max(8, Math.round((e0 - s0) * MAS.pps))}px" title="Drag to shift all ${memberCount} layers in group “${esc(b.name)}” together">
            <span>${closed ? `${memberCount} layers (Combined Group)` : `★ Combined Group: ${esc(b.name)}`}</span>
          </div>
        </div>
      </div>` + (closed ? '' : b.rows.map(r => renderLayerRow(r, true)).join(''));
    };

    const prevScrollLeft = host.querySelector('.mas-tl')?.scrollLeft || 0;
    const prevScrollTop = host.querySelector('.mas-tl')?.scrollTop || 0;

    host.innerHTML = `
      <div class="mas-tlhead">
        <span class="mas-lbl">Timeline</span>
        <button type="button" class="mas-btn sm" id="mas-btn-add-layer" title="Add a layer or effect at the playhead">＋ Add layer ▾</button>
        <button type="button" class="mas-btn sm" id="mas-btn-add-cam" title="Add a camera keyframe / shot at the playhead">⌖ Camera key</button>
        <button type="button" class="mas-btn sm" id="mas-btn-split" ${selLayerIdx < 0 ? 'disabled' : ''} title="Split selected layer at playhead (S)">✂ Split</button>
        <button type="button" class="mas-btn sm" id="mas-btn-group" ${selLayerIdx < 0 ? 'disabled' : ''} title="Assign selected layer to a Combined Group">★ Group</button>
        <button type="button" class="mas-btn sm ghost danger" id="mas-btn-del" ${MAS.sel.kind === 'none' ? 'disabled' : ''} title="Delete selection (Del)">🗑</button>
        <span style="flex:1"></span>
        <button type="button" class="mas-btn sm icon ghost ${MAS.snapOn ? 'on' : ''}" id="mas-btn-snap" title="Magnetic snapping (hold Alt while dragging to bypass)">🧲</button>
        <button type="button" class="mas-btn sm icon ghost" id="mas-btn-zout" title="Zoom out timeline (Ctrl+wheel)">－</button>
        <button type="button" class="mas-btn sm icon ghost" id="mas-btn-zin" title="Zoom in timeline (Ctrl+wheel)">＋</button>
        <button type="button" class="mas-btn sm ${MAS.fit ? 'on' : 'ghost'}" id="mas-btn-fit" title="Fit project duration to timeline width">Fit</button>
      </div>
      <div class="mas-tl" id="mas-tl-scroll">
        <div class="mas-tlinner" style="width:${labelW + laneW + 32}px">
          <div class="mas-trow ruler">
            <div class="mas-tlabel" style="cursor:default;color:var(--mas-muted);font-family:var(--mas-mono);font-size:10.5px">
              ${fmtTime(t)} <span style="margin-left:auto;opacity:0.75">F${Math.round(t * fps)}</span>
            </div>
            <div class="mas-lane rul" id="mas-ruler-lane" style="width:${laneW}px">
              ${ticks.map(tk => `<div class="mas-tick ${tk.major ? '' : 'minor'}" style="left:${tk.x}px">${tk.label}</div>`).join('')}
              <div class="mas-beyond" style="left:${Math.round(total * MAS.pps)}px;width:${Math.max(0, laneW - Math.round(total * MAS.pps))}px"></div>
              <div class="mas-endh" id="mas-end-handle" style="left:${Math.round(total * MAS.pps)}px" title="Project length ${total.toFixed(2)}s (drag to change)"></div>
            </div>
          </div>

          <div class="mas-trow cam ${MAS.sel.kind === 'cam' ? 'sel' : ''}">
            <div class="mas-tlabel" id="mas-cam-row-label" title="Camera Track · Click to open Camera Inspector, double-click lane to add camera keyframe">
              <span class="mas-dot" style="background:#8fdbe5"></span>
              <span class="mas-nm">Camera</span>
              <span class="mas-chip" style="padding:0 5px;font-size:9.5px">${camKeys.length || camSpans.length}</span>
            </div>
            <div class="mas-lane" id="mas-cam-lane" style="width:${laneW}px" title="Double-click to add a camera keyframe at pointer time">
              <div class="mas-beyond" style="left:${Math.round(total * MAS.pps)}px;width:${Math.max(0, laneW - Math.round(total * MAS.pps))}px"></div>
              ${camSpans.map((sp, si) => `<div class="mas-cam-span ${MAS.sel.kind === 'cam' && MAS.sel.key === si ? 'sel' : ''}" data-mas-cam-span="${si}" style="left:${Math.round(sp.startSec * MAS.pps)}px;width:${Math.max(12, Math.round((sp.endSec - sp.startSec) * MAS.pps - 2))}px" title="Shot ${si + 1}: ${esc(sp.name)} (${sp.startSec.toFixed(1)}s → ${sp.endSec.toFixed(1)}s)">${esc(sp.name)}</div>`).join('')}
              ${camKeys.map((k, ki) => `<div class="mas-kf cam ${MAS.sel.kind === 'cam' && MAS.sel.key === ki ? 'sel' : ''}" data-mas-cam-kf="${ki}" style="left:${Math.round(k.t * MAS.pps)}px" title="Camera key at ${k.t.toFixed(2)}s · ${esc(k.label || k.move || 'smooth')} · zoom ${(k.zoom ?? 1).toFixed(2)}"></div>`).join('')}
              ${renderFxChips('camera')}
            </div>
          </div>

          ${blocks.map(renderBlock).join('')}
          ${layers.length === 0 ? `<div class="mas-trow" style="height:44px"><div class="mas-tlabel"></div><div class="mas-lane" style="width:${laneW}px;display:flex;align-items:center;padding-left:14px;color:var(--mas-muted)">Add a layer from the left panel or drop media onto the preview.</div></div>` : ''}
          <div class="mas-ph" id="mas-playhead-line" style="left:${Math.round(playX)}px"></div>
          ${MAS.snapAt !== null ? `<div class="mas-snapline" style="left:${Math.round(labelW + MAS.snapAt * MAS.pps)}px"></div>` : ''}
        </div>
      </div>
    `;

    const sc = host.querySelector('#mas-tl-scroll');
    if (sc) {
      sc.scrollLeft = prevScrollLeft;
      sc.scrollTop = prevScrollTop;
    }

    wireMASTimelineEvents(host, bridge, labelW, span, total);
  }

  function wireMASTimelineEvents(host, bridge, labelW, span, total) {
    const sc = host.querySelector('#mas-tl-scroll');
    const timeAtClientX = clientX => {
      if (!sc) return 0;
      const r = sc.getBoundingClientRect();
      return clamp((clientX - r.left - labelW + sc.scrollLeft) / MAS.pps, 0, span);
    };

    // Header buttons
    const btnSnap = host.querySelector('#mas-btn-snap');
    if (btnSnap) btnSnap.onclick = () => { MAS.snapOn = !MAS.snapOn; renderMASTimeline(); };
    const btnZout = host.querySelector('#mas-btn-zout');
    if (btnZout) btnZout.onclick = () => { MAS.fit = false; MAS.pps = clamp(MAS.pps / 1.45, 2, 900); renderMASTimeline(); };
    const btnZin = host.querySelector('#mas-btn-zin');
    if (btnZin) btnZin.onclick = () => { MAS.fit = false; MAS.pps = clamp(MAS.pps * 1.45, 2, 900); renderMASTimeline(); };
    const btnFit = host.querySelector('#mas-btn-fit');
    if (btnFit) btnFit.onclick = () => { MAS.fit = true; renderMASTimeline(); };

    const btnAddLayer = host.querySelector('#mas-btn-add-layer');
    if (btnAddLayer) {
      btnAddLayer.onclick = e => {
        const rect = btnAddLayer.getBoundingClientRect();
        openAddLayerMenu(rect.left, rect.top - 8, true);
      };
    }
    const btnAddCam = host.querySelector('#mas-btn-add-cam');
    if (btnAddCam) {
      btnAddCam.onclick = () => {
        bridge.addCameraKeyAt(bridge.getTime());
        MAS.sel = { kind: 'cam', key: Math.max(0, bridge.getCameraKeys().length - 1) };
        MAS.itab = 'camera';
        renderAllMAS();
      };
    }
    const btnSplit = host.querySelector('#mas-btn-split');
    if (btnSplit) {
      btnSplit.onclick = () => {
        if (MAS.sel.kind === 'layer' && MAS.sel.i >= 0) {
          bridge.splitLayer(MAS.sel.i, bridge.getTime());
          renderAllMAS();
        }
      };
    }
    const btnGroup = host.querySelector('#mas-btn-group');
    if (btnGroup) {
      btnGroup.onclick = () => {
        if (MAS.sel.kind !== 'layer' || MAS.sel.i < 0) return;
        const layers = bridge.getLayers();
        const cur = layers[MAS.sel.i];
        if (!cur) return;
        const nextGroup = cur.group ? '' : 'Group 1';
        bridge.updateLayer(MAS.sel.i, { group: nextGroup || undefined });
        renderAllMAS();
      };
    }
    const btnDel = host.querySelector('#mas-btn-del');
    if (btnDel) {
      btnDel.onclick = () => deleteMASSelection();
    }

    // Ctrl+wheel zoom on timeline
    if (sc) {
      sc.addEventListener('wheel', e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const rect = sc.getBoundingClientRect();
        const px = e.clientX - rect.left - labelW + sc.scrollLeft;
        const at = px / MAS.pps;
        const next = clamp(MAS.pps * Math.exp(-e.deltaY * 0.002), 2, 900);
        MAS.fit = false;
        MAS.pps = next;
        renderMASTimeline();
        const scAfter = host.querySelector('#mas-tl-scroll');
        if (scAfter) scAfter.scrollLeft = at * next - (e.clientX - rect.left - labelW);
      }, { passive: false });
    }

    // Ruler scrub
    const rulerLane = host.querySelector('#mas-ruler-lane');
    if (rulerLane) {
      rulerLane.onpointerdown = e => {
        if (e.target.id === 'mas-end-handle') return;
        bridge.setTime(timeAtClientX(e.clientX));
        updateMASPlayheadOnly();
        startDrag(e, (_dt, ev) => {
          bridge.setTime(timeAtClientX(ev.clientX));
          updateMASPlayheadOnly();
        });
      };
    }

    // End duration handle
    const endHandle = host.querySelector('#mas-end-handle');
    if (endHandle) {
      endHandle.onpointerdown = e => {
        e.stopPropagation();
        const d0 = bridge.getDuration();
        const targets = bridge.getLayers().map(l => l.endSec);
        startDrag(e, (dt, ev) => {
          const s = snapTime(d0 + dt, targets, ev.altKey);
          MAS.snapAt = s.at;
          bridge.setDuration(clamp(r3(s.v), 0.5, 600));
          renderMASTimeline();
        });
      };
    }

    // Camera row & camera keyframes
    const camLabel = host.querySelector('#mas-cam-row-label');
    if (camLabel) {
      camLabel.onclick = () => {
        MAS.sel = { kind: 'cam', key: 0 };
        MAS.itab = 'camera';
        renderAllMAS();
      };
    }
    const camLane = host.querySelector('#mas-cam-lane');
    if (camLane) {
      camLane.onpointerdown = e => {
        if (e.target === camLane) {
          bridge.setTime(timeAtClientX(e.clientX));
          updateMASPlayheadOnly();
        }
      };
      camLane.ondblclick = e => {
        const at = r3(timeAtClientX(e.clientX));
        bridge.addCameraKeyAt(at);
        MAS.sel = { kind: 'cam', key: Math.max(0, bridge.getCameraKeys().length - 1) };
        MAS.itab = 'camera';
        renderAllMAS();
      };
    }
    host.querySelectorAll('[data-mas-cam-span]').forEach(el => {
      el.onclick = e => {
        e.stopPropagation();
        const si = +el.dataset.masCamSpan;
        MAS.sel = { kind: 'cam', key: si };
        MAS.itab = 'camera';
        if (bridge.selectCameraShot) bridge.selectCameraShot(si);
        renderAllMAS();
      };
    });
    host.querySelectorAll('[data-mas-cam-kf]').forEach(el => {
      el.onpointerdown = e => {
        e.stopPropagation();
        const ki = +el.dataset.masCamKf;
        MAS.sel = { kind: 'cam', key: ki };
        MAS.itab = 'camera';
        const k0 = bridge.getCameraKeys()[ki];
        if (!k0) return;
        const t0 = k0.t;
        const targets = snapTargets(bridge, 'cam');
        startDrag(e, (dt, ev) => {
          const s = snapTime(t0 + dt, targets, ev.altKey);
          MAS.snapAt = s.at;
          bridge.updateCameraKey(ki, { t: Math.max(0, r3(s.v)) });
          renderMASTimeline();
        }, () => renderMASInspector());
      };
      el.ondblclick = e => {
        e.stopPropagation();
        const ki = +el.dataset.masCamKf;
        const k0 = bridge.getCameraKeys()[ki];
        if (k0) {
          bridge.setTime(k0.t);
          updateMASPlayheadOnly();
        }
      };
    });

    // Layer selection, rename, visibility, delete
    host.querySelectorAll('[data-mas-select]').forEach(el => {
      const idx = +el.dataset.masSelect;
      el.onclick = () => {
        MAS.sel = { kind: 'layer', i: idx, key: null };
        if (MAS.itab === 'camera' || MAS.itab === 'project') MAS.itab = 'layer';
        bridge.setSelectedLayer(idx);
        renderAllMAS();
      };
      el.ondblclick = e => {
        e.stopPropagation();
        MAS.renaming = idx;
        renderMASTimeline();
        const inp = host.querySelector(`[data-mas-rename-in="${idx}"]`);
        if (inp) { inp.focus(); inp.select(); }
      };
    });

    host.querySelectorAll('[data-mas-rename-in]').forEach(inp => {
      const idx = +inp.dataset.masRenameIn;
      const finish = () => {
        const val = inp.value.trim();
        MAS.renaming = null;
        if (val) bridge.updateLayer(idx, { name: val });
        renderAllMAS();
      };
      inp.onblur = finish;
      inp.onkeydown = e => {
        if (e.key === 'Enter') inp.blur();
        if (e.key === 'Escape') { MAS.renaming = null; renderMASTimeline(); }
        e.stopPropagation();
      };
    });

    host.querySelectorAll('[data-mas-toggle-hide]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const idx = +btn.dataset.masToggleHide;
        const l = bridge.getLayers()[idx];
        if (l) bridge.updateLayer(idx, { hidden: !l.hidden });
        renderAllMAS();
      };
    });

    host.querySelectorAll('[data-mas-del-layer]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const idx = +btn.dataset.masDelLayer;
        bridge.deleteLayer(idx);
        if (MAS.sel.kind === 'layer' && MAS.sel.i === idx) MAS.sel = { kind: 'none', i: -1, key: null };
        renderAllMAS();
      };
    });

    // Group headers & bars
    host.querySelectorAll('[data-mas-group-toggle]').forEach(el => {
      const gname = el.dataset.masGroupToggle;
      el.onclick = () => {
        MAS.closedGroups[gname] = !MAS.closedGroups[gname];
        renderMASTimeline();
      };
    });
    host.querySelectorAll('[data-mas-del-group]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const gname = btn.dataset.masDelGroup;
        const layers = bridge.getLayers();
        for (let i = layers.length - 1; i >= 0; i--) {
          if ((layers[i].group || '').trim() === gname) bridge.deleteLayer(i);
        }
        renderAllMAS();
      };
    });
    host.querySelectorAll('[data-mas-group-bar]').forEach(bar => {
      const gname = bar.dataset.masGroupBar;
      bar.onpointerdown = e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const layers = bridge.getLayers();
        const members = layers.map((l, i) => ({ i, s: l.startSec, e: l.endSec, g: (l.group || '').trim() })).filter(m => m.g === gname);
        if (!members.length) return;
        const minS = Math.min(...members.map(m => m.s));
        const targets = snapTargets(bridge, members[0].i);
        startDrag(e, (dt, ev) => {
          const sn = snapTime(minS + dt, targets, ev.altKey);
          const d = r3(Math.max(-minS, sn.v - minS));
          MAS.snapAt = sn.at;
          for (const m of members) {
            bridge.updateLayer(m.i, { startSec: r3(m.s + d), endSec: r3(m.e + d) }, true);
          }
          renderMASTimeline();
        }, () => renderMASInspector());
      };
    });

    // Layer bar move & left/right edge trim
    host.querySelectorAll('[data-mas-bar]').forEach(bar => {
      const idx = +bar.dataset.masBar;
      bar.onpointerdown = e => {
        if (e.button !== 0 || e.target.dataset.masBarEdge) return;
        e.stopPropagation();
        MAS.sel = { kind: 'layer', i: idx, key: null };
        bridge.setSelectedLayer(idx);
        const l0 = bridge.getLayers()[idx];
        if (!l0 || l0.locked) return;
        const s0 = l0.startSec, e0 = l0.endSec, dur = Math.max(0.05, e0 - s0);
        const targets = snapTargets(bridge, idx);
        startDrag(e, (dt, ev) => {
          const a = snapTime(s0 + dt, targets, ev.altKey);
          const b = snapTime(e0 + dt, targets, ev.altKey);
          const useB = b.at !== null && (a.at === null || Math.abs(b.v - (e0 + dt)) < Math.abs(a.v - (s0 + dt)));
          const nextS = Math.max(0, r3(useB ? b.v - dur : a.v));
          MAS.snapAt = useB ? b.at : a.at;
          bridge.updateLayer(idx, { startSec: nextS, endSec: r3(nextS + dur) }, true);
          renderMASTimeline();
        }, () => renderMASInspector());
      };
    });

    host.querySelectorAll('[data-mas-bar-edge]').forEach(edge => {
      const side = edge.dataset.masBarEdge;
      const idx = +edge.dataset.masIdx;
      edge.onpointerdown = e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        MAS.sel = { kind: 'layer', i: idx, key: null };
        bridge.setSelectedLayer(idx);
        const l0 = bridge.getLayers()[idx];
        if (!l0 || l0.locked) return;
        const s0 = l0.startSec, e0 = l0.endSec;
        const targets = snapTargets(bridge, idx);
        startDrag(e, (dt, ev) => {
          if (side === 'l') {
            const a = snapTime(s0 + dt, targets, ev.altKey);
            MAS.snapAt = a.at;
            const nextS = clamp(r3(a.v), 0, Math.max(0, e0 - 0.1));
            bridge.updateLayer(idx, { startSec: nextS }, true);
          } else {
            const b = snapTime(e0 + dt, targets, ev.altKey);
            MAS.snapAt = b.at;
            const nextE = Math.max(s0 + 0.1, r3(b.v));
            bridge.updateLayer(idx, { endSec: nextE }, true);
          }
          renderMASTimeline();
        }, () => renderMASInspector());
      };
    });

    // Keyframe diamond drag & click
    host.querySelectorAll('[data-mas-kf]').forEach(kf => {
      const [iStr, kiStr] = kf.dataset.masKf.split(':');
      const idx = +iStr, ki = +kiStr;
      kf.onpointerdown = e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        MAS.sel = { kind: 'layer', i: idx, key: ki };
        MAS.itab = 'animate';
        bridge.setSelectedLayer(idx);
        const l0 = bridge.getLayers()[idx];
        if (!l0 || !l0.keys || !l0.keys[ki]) return;
        const k0 = l0.keys[ki];
        const t0 = +k0.t || 0;
        const dur = Math.max(0.1, l0.endSec - l0.startSec);
        const targets = snapTargets(bridge, idx);
        startDrag(e, (dt, ev) => {
          const sn = snapTime(l0.startSec + t0 + dt, targets, ev.altKey);
          MAS.snapAt = sn.at;
          const nt = clamp(r3(sn.v - l0.startSec), 0, dur);
          const nextKeys = l0.keys.map((k, m) => (m === ki ? { ...k, t: nt } : k));
          bridge.updateLayer(idx, { keys: nextKeys }, true);
          renderMASTimeline();
        }, () => renderMASInspector());
      };
      kf.ondblclick = e => {
        e.stopPropagation();
        const l0 = bridge.getLayers()[idx];
        const k0 = l0?.keys?.[ki];
        if (l0 && k0) {
          bridge.setTime(l0.startSec + (+k0.t || 0));
          updateMASPlayheadOnly();
        }
      };
    });

    // Lane click seeks & drag-and-drop from Add tab
    host.querySelectorAll('[data-mas-lane]').forEach(lane => {
      const idx = +lane.dataset.masLane;
      lane.onpointerdown = e => {
        if (e.target === lane) {
          MAS.sel = { kind: 'layer', i: idx, key: null };
          bridge.setSelectedLayer(idx);
          bridge.setTime(timeAtClientX(e.clientX));
          updateMASPlayheadOnly();
          renderMASInspector();
        }
      };
      lane.ondragover = e => {
        if (e.dataTransfer.types.includes('text/x-mas-add')) {
          e.preventDefault();
          lane.classList.add('dropok');
        }
      };
      lane.ondragleave = () => lane.classList.remove('dropok');
      lane.ondrop = e => {
        lane.classList.remove('dropok');
        const typeId = e.dataTransfer.getData('text/x-mas-add');
        if (!typeId) return;
        e.preventDefault();
        const at = r3(timeAtClientX(e.clientX));
        const attachId = MAS.addMode === 'effect' ? lane.dataset.masUid : null;
        bridge.addLayer(typeId, at, attachId);
        renderAllMAS();
      };
    });

    // Right-click context menu on layer rows/bars/groups
    host.querySelectorAll('[data-mas-row],[data-mas-bar],[data-mas-fx]').forEach(el => {
      el.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        const idx = +(el.dataset.masFx ?? el.dataset.masBar ?? el.dataset.masRow);
        MAS.sel = { kind: 'layer', i: idx, key: null };
        bridge.setSelectedLayer(idx);
        openTimelineContextMenu({ kind: 'layer', i: idx, x: e.clientX, y: e.clientY });
      };
    });
    host.querySelectorAll('[data-mas-group]').forEach(el => {
      el.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        openTimelineContextMenu({ kind: 'group', name: el.dataset.masGroup, x: e.clientX, y: e.clientY });
      };
    });
  }

  function updateMASPlayheadOnly() {
    const bridge = getBridge();
    if (!bridge) return;
    const t = bridge.getTime();
    const labelW = window.innerWidth <= 900 ? 132 : 196;
    const ph = document.getElementById('mas-playhead-line');
    if (ph) ph.style.left = `${Math.round(labelW + t * MAS.pps)}px`;
    const fsScrub = document.getElementById('mas-fs-scrub');
    const fsTc = document.getElementById('mas-fs-tc');
    if (fsScrub) fsScrub.value = t;
    if (fsTc) fsTc.textContent = `${fmtTime(t)} / ${fmtTime(bridge.getDuration())}`;
  }

  /* ---------- Right-Click Timeline Context Menu (#tl-ctx-menu) ---------- */
  function closeContextMenu() {
    const old = document.getElementById('tl-ctx-menu');
    if (old) old.remove();
  }

  function openTimelineContextMenu(target) {
    closeContextMenu();
    const bridge = getBridge();
    if (!bridge) return;
    const menu = document.createElement('div');
    menu.id = 'tl-ctx-menu';
    menu.className = 'mas-menu';
    menu.style.left = `${Math.min(window.innerWidth - 305, Math.max(8, target.x))}px`;
    menu.style.top = `${Math.min(window.innerHeight - 360, Math.max(8, target.y))}px`;
    menu.style.width = '290px';
    menu.style.padding = '10px';
    menu.style.gap = '7px';

    if (target.kind === 'group') {
      const gname = target.name;
      menu.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--mas-line);padding-bottom:5px">
          <b style="color:var(--mas-primary)">★ Group Quick Edit: ${esc(gname)}</b>
          <button type="button" class="mas-btn sm icon ghost" id="mas-ctx-close">×</button>
        </div>
        <div style="display:flex;gap:5px;align-items:center">
          <span style="font-size:11px;color:var(--mas-muted);width:58px">Colour:</span>
          ${QUICK_COLORS.map(c => `<button type="button" data-mas-grp-color="${c}" style="width:19px;height:19px;border-radius:4px;border:1px solid var(--mas-line);background:${c === 'auto' ? 'linear-gradient(135deg,#f0a93b,#3fa7b5)' : c};padding:0"></button>`).join('')}
        </div>
        <hr />
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button type="button" class="mas-btn sm" id="mas-ctx-grp-rename">Rename Group</button>
          <button type="button" class="mas-btn sm" id="mas-ctx-grp-ungroup">Ungroup</button>
          <button type="button" class="mas-btn sm danger" id="mas-ctx-grp-del">Delete Group</button>
        </div>
      `;
      document.body.appendChild(menu);
      menu.querySelector('#mas-ctx-close').onclick = closeContextMenu;
      menu.querySelectorAll('[data-mas-grp-color]').forEach(b => {
        b.onclick = () => {
          const col = b.dataset.masGrpColor;
          bridge.getLayers().forEach((l, idx) => {
            if ((l.group || '').trim() === gname) bridge.updateLayer(idx, { color: col });
          });
          renderAllMAS();
        };
      });
      menu.querySelector('#mas-ctx-grp-rename').onclick = () => {
        const next = gname + ' Pro';
        bridge.getLayers().forEach((l, idx) => {
          if ((l.group || '').trim() === gname) bridge.updateLayer(idx, { group: next });
        });
        closeContextMenu();
        renderAllMAS();
      };
      menu.querySelector('#mas-ctx-grp-ungroup').onclick = () => {
        bridge.getLayers().forEach((l, idx) => {
          if ((l.group || '').trim() === gname) bridge.updateLayer(idx, { group: '' });
        });
        closeContextMenu();
        renderAllMAS();
      };
      menu.querySelector('#mas-ctx-grp-del').onclick = () => {
        const layers = bridge.getLayers();
        for (let i = layers.length - 1; i >= 0; i--) {
          if ((layers[i].group || '').trim() === gname) bridge.deleteLayer(i);
        }
        closeContextMenu();
        renderAllMAS();
      };
      return;
    }

    const idx = target.i;
    const l = bridge.getLayers()[idx];
    if (!l) return;
    const isFxLayer = Boolean(l.attachTo);
    menu.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--mas-line);padding-bottom:5px">
        <b style="color:var(--mas-primary);overflow:hidden;text-overflow:ellipsis">${isFxLayer ? '⚡ Effect: ' : 'Quick Edit: '}${esc(l.name)}</b>
        <button type="button" class="mas-btn sm icon ghost" id="mas-ctx-close">×</button>
      </div>
      <div class="mas-grid2">
        <div class="mas-f"><span class="mas-fl">Layer name</span><input type="text" id="mas-ctx-name" value="${esc(l.name)}" /></div>
        <div class="mas-f"><span class="mas-fl">Group</span><input type="text" id="mas-ctx-group" value="${esc(l.group || '')}" placeholder="None" /></div>
      </div>
      <div class="mas-grid2">
        <div class="mas-f"><span class="mas-fl">Start (s)</span><input type="number" step="0.1" min="0" id="mas-ctx-start" value="${l.startSec}" /></div>
        <div class="mas-f"><span class="mas-fl">End (s)</span><input type="number" step="0.1" min="0.1" id="mas-ctx-end" value="${l.endSec}" /></div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <span style="font-size:11px;color:var(--mas-muted);width:54px">Colour:</span>
        ${QUICK_COLORS.map(c => `<button type="button" data-mas-ctx-color="${c}" style="width:19px;height:19px;border-radius:4px;border:${l.color === c ? '2px solid #fff' : '1px solid var(--mas-line)'};background:${c === 'auto' ? 'linear-gradient(135deg,#f0a93b,#3fa7b5)' : c};padding:0"></button>`).join('')}
      </div>
      ${isFxLayer ? `<button type="button" class="mas-btn sm" id="mas-ctx-detach">Detach to its own layer track</button>` : ''}
      <hr />
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button type="button" class="mas-btn sm" id="mas-ctx-at-ph">Start at playhead</button>
        <button type="button" class="mas-btn sm" id="mas-ctx-split">✂ Split</button>
        <button type="button" class="mas-btn sm" id="mas-ctx-dup">Duplicate</button>
        <button type="button" class="mas-btn sm" id="mas-ctx-hide">${l.hidden ? 'Show' : 'Hide'}</button>
        <button type="button" class="mas-btn sm danger" id="mas-ctx-del">Delete</button>
      </div>
    `;
    document.body.appendChild(menu);
    menu.querySelector('#mas-ctx-close').onclick = closeContextMenu;
    menu.querySelector('#mas-ctx-name').oninput = e => { bridge.updateLayer(idx, { name: e.target.value }); renderMASTimeline(); };
    menu.querySelector('#mas-ctx-group').onchange = e => { bridge.updateLayer(idx, { group: e.target.value.trim() }); renderAllMAS(); };
    menu.querySelector('#mas-ctx-start').onchange = e => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) bridge.updateLayer(idx, { startSec: r3(Math.max(0, Math.min(v, l.endSec - 0.1))) });
      renderAllMAS();
    };
    menu.querySelector('#mas-ctx-end').onchange = e => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) bridge.updateLayer(idx, { endSec: r3(Math.max(l.startSec + 0.1, v)) });
      renderAllMAS();
    };
    menu.querySelectorAll('[data-mas-ctx-color]').forEach(b => {
      b.onclick = () => {
        bridge.updateLayer(idx, { color: b.dataset.masCtxColor });
        closeContextMenu();
        renderAllMAS();
      };
    });
    const btnDetach = menu.querySelector('#mas-ctx-detach');
    if (btnDetach) {
      btnDetach.onclick = () => {
        bridge.updateLayer(idx, { attachTo: null, fx: null });
        closeContextMenu();
        renderAllMAS();
      };
    }
    menu.querySelector('#mas-ctx-at-ph').onclick = () => {
      const dur = Math.max(0.1, l.endSec - l.startSec);
      const t = r3(bridge.getTime());
      bridge.updateLayer(idx, { startSec: t, endSec: r3(t + dur) });
      closeContextMenu();
      renderAllMAS();
    };
    menu.querySelector('#mas-ctx-split').onclick = () => {
      bridge.splitLayer(idx, bridge.getTime());
      closeContextMenu();
      renderAllMAS();
    };
    menu.querySelector('#mas-ctx-dup').onclick = () => {
      bridge.duplicateLayer(idx);
      closeContextMenu();
      renderAllMAS();
    };
    menu.querySelector('#mas-ctx-hide').onclick = () => {
      bridge.updateLayer(idx, { hidden: !l.hidden });
      closeContextMenu();
      renderAllMAS();
    };
    menu.querySelector('#mas-ctx-del').onclick = () => {
      bridge.deleteLayer(idx);
      closeContextMenu();
      renderAllMAS();
    };
  }

  window.addEventListener('pointerdown', e => {
    const m = document.getElementById('tl-ctx-menu');
    if (m && !m.contains(e.target)) m.remove();
    const am = document.getElementById('mas-pop-menu');
    if (am && !am.contains(e.target)) am.remove();
  });

  function openAddLayerMenu(x, y, upward = false) {
    const old = document.getElementById('mas-pop-menu');
    if (old) old.remove();
    const bridge = getBridge();
    if (!bridge) return;
    const types = bridge.getAddableTypes();
    const m = document.createElement('div');
    m.id = 'mas-pop-menu';
    m.className = 'mas-menu';
    m.style.left = `${Math.min(window.innerWidth - 240, Math.max(8, x))}px`;
    if (upward) m.style.bottom = `${Math.max(8, window.innerHeight - y)}px`;
    else m.style.top = `${Math.min(window.innerHeight - 300, Math.max(8, y))}px`;
    m.innerHTML = types.slice(0, 18).map(t => `<button type="button" data-mas-add-item="${esc(t.id)}"><span>${esc(t.icon || '＋')}</span><span>${esc(t.name)}</span><small>${esc(t.group || '')}</small></button>`).join('');
    document.body.appendChild(m);
    m.querySelectorAll('[data-mas-add-item]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.masAddItem;
        m.remove();
        const at = r3(bridge.getTime());
        const layers = bridge.getLayers();
        const hostId = MAS.addMode === 'effect' && MAS.sel.kind === 'layer' && layers[MAS.sel.i] ? layers[MAS.sel.i].id : null;
        bridge.addLayer(id, at, hostId);
        renderAllMAS();
      };
    });
  }

  /* ---------- Render Map Animation Studio 4-Tab Inspector ---------- */
  function renderMASInspector() {
    const bridge = getBridge();
    const mount = document.getElementById('mas-inspector-mount');
    if (!bridge || !mount) return;

    const layers = bridge.getLayers();
    const selIdx = MAS.sel.kind === 'layer' && MAS.sel.i >= 0 && MAS.sel.i < layers.length ? MAS.sel.i : (layers.length ? 0 : -1);
    const l = selIdx >= 0 ? layers[selIdx] : null;
    const t = bridge.getTime();
    const fps = bridge.getFps();

    // Update top 4 tab buttons
    const tabBar = document.getElementById('mas-insp-tabbar');
    if (tabBar) {
      tabBar.querySelectorAll('[data-mas-itab]').forEach(b => {
        b.classList.toggle('on', b.dataset.masItab === MAS.itab);
      });
    }

    if (MAS.itab === 'layer') {
      if (!l) {
        mount.innerHTML = `<div class="mas-box"><p style="color:var(--mas-muted);font-size:11.5px;margin:0">Select a layer on the timeline to edit its timing, grouping, attached effects, and properties.</p></div>`;
        return;
      }
      const dur = r3(Math.max(0.05, l.endSec - l.startSec));
      const gname = (l.group || '').trim();
      const groupPeers = gname ? layers.map((x, idx) => ({ x, idx })).filter(p => (p.x.group || '').trim() === gname && !p.x.attachTo) : [];
      const mainCandidates = layers.filter((x, idx) => idx !== selIdx && !x.attachTo);
      const allGroups = [...new Set(layers.map(x => (x.group || '').trim()).filter(Boolean))];

      mount.innerHTML = `
        <div class="mas-box">
          <div style="display:flex;align-items:center;gap:7px">
            <span style="width:24px;height:24px;border-radius:6px;background:rgba(240,169,59,0.18);color:#ffd79a;display:inline-flex;align-items:center;justify-content:center;font-weight:700">${esc(l.icon || '◆')}</span>
            <input type="text" id="mas-inp-lname" value="${esc(l.name)}" style="flex:1;background:var(--mas-raise);border:1px solid var(--mas-line);border-radius:6px;padding:4px 7px;font-weight:600;font-size:12px" aria-label="Layer name" />
          </div>
          <div class="mas-grid3">
            <div class="mas-f"><span class="mas-fl">Start (s)</span><input type="number" step="0.1" min="0" id="mas-inp-lstart" value="${l.startSec}" /></div>
            <div class="mas-f"><span class="mas-fl">End (s)</span><input type="number" step="0.1" min="0.1" id="mas-inp-lend" value="${l.endSec}" /></div>
            <div class="mas-f"><span class="mas-fl">Length</span><input type="number" step="0.1" min="0.05" id="mas-inp-llen" value="${dur}" /></div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
            <button type="button" class="mas-btn sm" id="mas-inp-at-ph">Start at playhead</button>
            <button type="button" class="mas-btn sm" id="mas-inp-split" ${t <= l.startSec + 0.05 || t >= l.endSec - 0.05 ? 'disabled' : ''}>✂ Split</button>
            <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;margin-left:auto;cursor:pointer">
              <input type="checkbox" id="mas-inp-hidden" ${l.hidden ? 'checked' : ''} /> Hidden
            </label>
          </div>
          <div class="mas-f">
            <span class="mas-fl"><span>Group</span><small style="color:var(--mas-muted)">Combined folder on timeline</small></span>
            <input type="text" id="mas-inp-group" list="mas-group-datalist" value="${esc(gname)}" placeholder="None (type name to group)" />
            <datalist id="mas-group-datalist">${allGroups.map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>
          </div>
          ${gname && groupPeers.length > 1 ? `
            <div class="mas-fxbox cam-box" style="margin-bottom:0">
              <h4><span>★ Combined Group (“${esc(gname)}”)</span><span>${groupPeers.length} members</span></h4>
              <div style="display:grid;gap:3px;max-height:110px;overflow:auto">
                ${groupPeers.map(p => `
                  <div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:2px 5px;border-radius:5px;background:${p.idx === selIdx ? 'rgba(240,169,59,0.16)' : 'rgba(255,255,255,0.03)'}">
                    <input type="checkbox" data-mas-grp-member-vis="${p.idx}" ${!p.x.hidden ? 'checked' : ''} />
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" data-mas-grp-jump="${p.idx}">${esc(p.x.name)}</span>
                  </div>
                `).join('')}
              </div>
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                <button type="button" class="mas-btn sm" id="mas-inp-grp-sync">Sync members style</button>
                <button type="button" class="mas-btn sm ghost" id="mas-inp-grp-ungroup">Ungroup</button>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="mas-fxbox cam-box">
          <h4><span>⌖ Cinematic camera for this layer</span></h4>
          <div class="mas-grid2">
            <div class="mas-f">
              <span class="mas-fl">Camera preset</span>
              <select id="mas-inp-layer-cam-preset">
                ${CAMERA_MOVES.map(([id, nm]) => `<option value="${id}">${esc(nm)}</option>`).join('')}
              </select>
            </div>
            <div class="mas-f">
              <span class="mas-fl">Move length (s)</span>
              <input type="number" step="0.5" min="0.5" max="60" id="mas-inp-layer-cam-len" value="${Math.min(4, dur)}" />
            </div>
          </div>
          <button type="button" class="mas-btn sm pri" id="mas-inp-apply-layer-cam">⌖ Apply camera to this layer</button>
        </div>

        ${mainCandidates.length ? `
          <div class="mas-fxbox">
            <h4><span>⚡ ${l.attachTo ? 'Embedded Effect Settings' : 'Use as effect'}</span></h4>
            ${l.attachTo ? `
              <div class="mas-grid2">
                <div class="mas-f">
                  <span class="mas-fl">While it plays</span>
                  <select id="mas-inp-fx-blend">
                    <option value="overlay" ${l.fx?.blend === 'overlay' ? 'selected' : ''}>On top (overlay)</option>
                    <option value="replace" ${l.fx?.blend !== 'overlay' ? 'selected' : ''}>Replaces main layer</option>
                  </select>
                </div>
                <div class="mas-f">
                  <span class="mas-fl">Transition</span>
                  <select id="mas-inp-fx-trans">
                    ${FX_TRANSITIONS.map(tr => `<option value="${tr}" ${l.fx?.transIn === tr ? 'selected' : ''}>${tr}</option>`).join('')}
                  </select>
                </div>
              </div>
              <button type="button" class="mas-btn sm" id="mas-inp-fx-detach">Make it a standalone layer</button>
            ` : `
              <div style="display:flex;gap:5px;align-items:center">
                <select id="mas-inp-fx-target" style="flex:1;background:var(--mas-raise);border:1px solid var(--mas-line);border-radius:6px;padding:4px 6px;font-size:11px">
                  ${mainCandidates.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}
                </select>
                <button type="button" class="mas-btn sm" id="mas-inp-fx-attach">Attach as effect</button>
              </div>
            `}
          </div>
        ` : ''}

        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
          <button type="button" class="mas-btn sm" id="mas-inp-z-up">↑ Forward</button>
          <button type="button" class="mas-btn sm" id="mas-inp-z-down">↓ Backward</button>
          <button type="button" class="mas-btn sm" id="mas-inp-dup">Duplicate</button>
          <button type="button" class="mas-btn sm danger" id="mas-inp-del">Delete</button>
        </div>
      `;

      mount.querySelector('#mas-inp-lname').oninput = e => { bridge.updateLayer(selIdx, { name: e.target.value }); renderMASTimeline(); };
      mount.querySelector('#mas-inp-lstart').onchange = e => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) bridge.updateLayer(selIdx, { startSec: r3(Math.max(0, Math.min(v, l.endSec - 0.05))) });
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-lend').onchange = e => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) bridge.updateLayer(selIdx, { endSec: r3(Math.max(l.startSec + 0.05, v)) });
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-llen').onchange = e => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) bridge.updateLayer(selIdx, { endSec: r3(l.startSec + Math.max(0.05, v)) });
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-at-ph').onclick = () => {
        bridge.updateLayer(selIdx, { startSec: r3(t), endSec: r3(t + dur) });
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-split').onclick = () => {
        bridge.splitLayer(selIdx, t);
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-hidden').onchange = e => {
        bridge.updateLayer(selIdx, { hidden: e.target.checked });
        renderAllMAS();
      };
      mount.querySelector('#mas-inp-group').onchange = e => {
        bridge.updateLayer(selIdx, { group: e.target.value.trim() });
        renderAllMAS();
      };
      mount.querySelectorAll('[data-mas-grp-member-vis]').forEach(chk => {
        chk.onchange = () => {
          const pi = +chk.dataset.masGrpMemberVis;
          bridge.updateLayer(pi, { hidden: !chk.checked });
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-grp-jump]').forEach(sp => {
        sp.onclick = () => {
          const pi = +sp.dataset.masGrpJump;
          MAS.sel = { kind: 'layer', i: pi, key: null };
          bridge.setSelectedLayer(pi);
          renderAllMAS();
        };
      });
      const btnGrpSync = mount.querySelector('#mas-inp-grp-sync');
      if (btnGrpSync) {
        btnGrpSync.onclick = () => {
          groupPeers.forEach(p => bridge.updateLayer(p.idx, { color: l.color }));
          renderAllMAS();
        };
      }
      const btnGrpUngroup = mount.querySelector('#mas-inp-grp-ungroup');
      if (btnGrpUngroup) {
        btnGrpUngroup.onclick = () => {
          groupPeers.forEach(p => bridge.updateLayer(p.idx, { group: '' }));
          renderAllMAS();
        };
      }
      mount.querySelector('#mas-inp-apply-layer-cam').onclick = () => {
        const preset = mount.querySelector('#mas-inp-layer-cam-preset').value;
        const moveLen = parseFloat(mount.querySelector('#mas-inp-layer-cam-len').value) || 3;
        bridge.applyCameraToLayer(selIdx, preset, moveLen);
        renderAllMAS();
      };
      const btnAttach = mount.querySelector('#mas-inp-fx-attach');
      if (btnAttach) {
        btnAttach.onclick = () => {
          const targetId = mount.querySelector('#mas-inp-fx-target').value;
          bridge.updateLayer(selIdx, { attachTo: targetId, fx: { blend: 'overlay', hold: false, transIn: 'dissolve', tin: 0.3, transOut: 'dissolve', tout: 0.3 } });
          renderAllMAS();
        };
      }
      const btnDetach = mount.querySelector('#mas-inp-fx-detach');
      if (btnDetach) {
        btnDetach.onclick = () => {
          bridge.updateLayer(selIdx, { attachTo: null, fx: null });
          renderAllMAS();
        };
      }
      const selBlend = mount.querySelector('#mas-inp-fx-blend');
      if (selBlend) {
        selBlend.onchange = () => {
          bridge.updateLayer(selIdx, { fx: { ...(l.fx || {}), blend: selBlend.value } });
          renderAllMAS();
        };
      }
      mount.querySelector('#mas-inp-z-up').onclick = () => { bridge.moveLayerZ(selIdx, 1); renderAllMAS(); };
      mount.querySelector('#mas-inp-z-down').onclick = () => { bridge.moveLayerZ(selIdx, -1); renderAllMAS(); };
      mount.querySelector('#mas-inp-dup').onclick = () => { bridge.duplicateLayer(selIdx); renderAllMAS(); };
      mount.querySelector('#mas-inp-del').onclick = () => { bridge.deleteLayer(selIdx); renderAllMAS(); };
      return;
    }

    if (MAS.itab === 'animate') {
      if (!l) {
        mount.innerHTML = `<div class="mas-box"><p style="color:var(--mas-muted);font-size:11.5px;margin:0">Select a layer on the timeline to animate its keyframes (opacity, scale, position, rotation).</p></div>`;
        return;
      }
      const dur = Math.max(0.1, r3(l.endSec - l.startSec));
      const local = r3(t - l.startSec);
      const inside = local >= -0.05 && local <= dur + 0.05;
      const keys = (l.keys || []).map((k, idx) => ({ k, idx })).sort((a, b) => (+a.k.t || 0) - (+b.k.t || 0));

      mount.innerHTML = `
        <div class="mas-box">
          <p style="color:var(--mas-muted);font-size:11px;margin:0">
            Keyframes animate <b>opacity, scale, position (X/Y) and rotation</b> of “${esc(l.name)}”.
          </p>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button type="button" class="mas-btn sm pri" id="mas-anim-add-kf" ${!inside ? 'disabled' : ''} title="Add keyframe at playhead (K)">◆ Add keyframe here</button>
            <button type="button" class="mas-btn sm ${MAS.recording ? 'on rec' : ''}" id="mas-anim-rec" title="Record moves on preview as keyframes (R)">● ${MAS.recording ? 'Recording' : 'Record'}</button>
            ${keys.length ? `<button type="button" class="mas-btn sm ghost danger" id="mas-anim-clear">Clear</button>` : ''}
          </div>
          ${!inside ? `<p style="color:var(--mas-warn);font-size:10.5px;margin:0">Move playhead inside layer (${fmtTime(l.startSec)} – ${fmtTime(l.endSec)}) to add keyframes.</p>` : ''}
          <div class="mas-f">
            <span class="mas-fl">One-click keyframe presets</span>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${[['pop', 'Pop in'], ['slide-up', 'Slide up'], ['zoom-in', 'Zoom in'], ['spin-in', 'Spin in'], ['fade', 'Fade']].map(([pid, pnm]) => `<button type="button" class="mas-btn sm" data-mas-kf-preset="${pid}">${pnm}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="mas-box">
          <h4><span>Keyframes (${keys.length})</span></h4>
          ${keys.length === 0 ? `<p style="color:var(--mas-muted);font-size:11px;margin:0">No custom keyframes yet (using studio default entrance).</p>` : ''}
          ${keys.map(({ k, idx }) => {
            const isSel = MAS.sel.key === idx;
            return `
              <details class="mas-card2 ${isSel ? 'sel' : ''}" ${isSel ? 'open' : ''} data-mas-kf-card="${idx}">
                <summary data-mas-kf-sum="${idx}">
                  <span class="mas-diamond-ic"></span>
                  <span style="flex:1">${(+k.t || 0).toFixed(2)}s <small style="color:var(--mas-muted)">(at ${(l.startSec + (+k.t || 0)).toFixed(2)}s)</small></span>
                  <span style="color:var(--mas-muted);font-size:10.5px">${esc(k.ease || 'ease-in-out')}</span>
                  <button type="button" class="mas-btn sm icon ghost danger" data-mas-kf-del="${idx}">×</button>
                </summary>
                <div class="mas-card-body">
                  <div class="mas-grid2">
                    <div class="mas-f"><span class="mas-fl">Time (s from start)</span><input type="number" step="0.05" min="0" max="${dur}" data-mas-kf-prop="${idx}:t" value="${+k.t || 0}" /></div>
                    <div class="mas-f"><span class="mas-fl">Easing in</span>
                      <select data-mas-kf-prop="${idx}:ease">
                        ${EASES.map(ea => `<option value="${ea}" ${(k.ease || 'ease-in-out') === ea ? 'selected' : ''}>${ea}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                  <div class="mas-grid2">
                    <div class="mas-f"><span class="mas-fl"><span>Opacity</span><b>${Math.round((k.opacity ?? 1) * 100)}%</b></span><input type="range" min="0" max="1" step="0.02" data-mas-kf-prop="${idx}:opacity" value="${k.opacity ?? 1}" /></div>
                    <div class="mas-f"><span class="mas-fl"><span>Scale</span><b>${(k.scale ?? 1).toFixed(2)}×</b></span><input type="range" min="0.1" max="3.5" step="0.02" data-mas-kf-prop="${idx}:scale" value="${k.scale ?? 1}" /></div>
                  </div>
                  <div class="mas-grid3">
                    <div class="mas-f"><span class="mas-fl">X offset</span><input type="number" step="1" data-mas-kf-prop="${idx}:x" value="${+k.x || 0}" /></div>
                    <div class="mas-f"><span class="mas-fl">Y offset</span><input type="number" step="1" data-mas-kf-prop="${idx}:y" value="${+k.y || 0}" /></div>
                    <div class="mas-f"><span class="mas-fl">Rotate (°)</span><input type="number" step="1" data-mas-kf-prop="${idx}:rotate" value="${+k.rotate || 0}" /></div>
                  </div>
                </div>
              </details>
            `;
          }).join('')}
        </div>
      `;

      const btnAddKf = mount.querySelector('#mas-anim-add-kf');
      if (btnAddKf) {
        btnAddKf.onclick = () => {
          addKeyframeAtPlayhead();
        };
      }
      const btnRec = mount.querySelector('#mas-anim-rec');
      if (btnRec) {
        btnRec.onclick = () => {
          MAS.recording = !MAS.recording;
          renderAllMAS();
        };
      }
      const btnClear = mount.querySelector('#mas-anim-clear');
      if (btnClear) {
        btnClear.onclick = () => {
          bridge.updateLayer(selIdx, { keys: [] });
          MAS.sel.key = null;
          renderAllMAS();
        };
      }
      mount.querySelectorAll('[data-mas-kf-preset]').forEach(b => {
        b.onclick = () => {
          const pkeys = makePresetKeys(b.dataset.masKfPreset, dur);
          bridge.updateLayer(selIdx, { keys: pkeys });
          MAS.sel.key = 0;
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-kf-sum]').forEach(sum => {
        sum.onclick = e => {
          if (e.target.dataset.masKfDel) return;
          e.preventDefault();
          const ki = +sum.dataset.masKfSum;
          MAS.sel.key = MAS.sel.key === ki ? null : ki;
          if (MAS.sel.key !== null && l.keys[ki]) {
            bridge.setTime(l.startSec + (+l.keys[ki].t || 0));
          }
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-kf-del]').forEach(btn => {
        btn.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          const ki = +btn.dataset.masKfDel;
          const next = (l.keys || []).filter((_, m) => m !== ki);
          bridge.updateLayer(selIdx, { keys: next });
          MAS.sel.key = null;
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-kf-prop]').forEach(inp => {
        const [kiStr, prop] = inp.dataset.masKfProp.split(':');
        const ki = +kiStr;
        inp.oninput = () => {
          const val = prop === 'ease' ? inp.value : parseFloat(inp.value);
          if (prop !== 'ease' && !Number.isFinite(val)) return;
          const next = (l.keys || []).map((k, m) => (m === ki ? { ...k, [prop]: val } : k));
          bridge.updateLayer(selIdx, { keys: next }, true);
          renderMASTimeline();
        };
        inp.onchange = () => renderMASInspector();
      });
      return;
    }

    if (MAS.itab === 'camera') {
      const camKeys = bridge.getCameraKeys();
      mount.innerHTML = `
        <div class="mas-fxbox cam-box">
          <h4><span>⌖ Cinematic Camera Presets</span><span>${CAMERA_MOVES.length} moves</span></h4>
          <div class="mas-grid2">
            <div class="mas-f">
              <span class="mas-fl">Camera move</span>
              <select id="mas-cam-preset-sel">
                ${CAMERA_MOVES.map(([id, nm]) => `<option value="${id}">${esc(nm)}</option>`).join('')}
              </select>
            </div>
            <div class="mas-f">
              <span class="mas-fl">Duration (s)</span>
              <input type="number" step="0.5" min="0.5" max="60" id="mas-cam-preset-dur" value="4" />
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button type="button" class="mas-btn sm pri" id="mas-cam-apply-ph">Apply at playhead (${t.toFixed(1)}s)</button>
            <button type="button" class="mas-btn sm" id="mas-cam-add-here">＋ Add camera key here</button>
            ${camKeys.length > 1 ? `<button type="button" class="mas-btn sm ghost danger" id="mas-cam-clear">Reset</button>` : ''}
          </div>
        </div>
        <div class="mas-box">
          <h4><span>Camera Keyframes (${camKeys.length})</span></h4>
          ${camKeys.map((k, idx) => {
            const isSel = MAS.sel.kind === 'cam' && MAS.sel.key === idx;
            return `
              <details class="mas-card2 ${isSel ? 'sel' : ''}" ${isSel ? 'open' : ''}>
                <summary data-mas-camk-sum="${idx}">
                  <span class="mas-diamond-ic" style="background:#8fdbe5"></span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k.t.toFixed(2)}s · ${esc(k.label || 'Frame')}</span>
                  <span style="color:var(--mas-muted);font-size:10.5px">${esc(k.move || 'smooth')}</span>
                  <button type="button" class="mas-btn sm icon ghost danger" data-mas-camk-del="${idx}">×</button>
                </summary>
                <div class="mas-card-body">
                  <div class="mas-grid2">
                    <div class="mas-f"><span class="mas-fl">Time (s)</span><input type="number" step="0.1" min="0" data-mas-camk-prop="${idx}:t" value="${k.t}" /></div>
                    <div class="mas-f"><span class="mas-fl">Transition</span>
                      <select data-mas-camk-prop="${idx}:move">
                        ${['fly', 'smooth', 'linear', 'cut'].map(m => `<option value="${m}" ${(k.move || 'smooth') === m ? 'selected' : ''}>${m}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                  <div class="mas-grid3">
                    <div class="mas-f"><span class="mas-fl">Zoom</span><input type="number" step="0.05" min="0.2" max="12" data-mas-camk-prop="${idx}:zoom" value="${r3(k.zoom ?? 1)}" /></div>
                    <div class="mas-f"><span class="mas-fl">Rotate (°)</span><input type="number" step="1" min="-180" max="180" data-mas-camk-prop="${idx}:bearing" value="${Math.round(k.bearing || 0)}" /></div>
                    <div class="mas-f"><span class="mas-fl">3D Tilt (°)</span><input type="number" step="1" min="-60" max="60" data-mas-camk-prop="${idx}:pitch" value="${Math.round(k.pitch || 0)}" /></div>
                  </div>
                </div>
              </details>
            `;
          }).join('')}
        </div>
      `;

      mount.querySelector('#mas-cam-apply-ph').onclick = () => {
        const presetId = mount.querySelector('#mas-cam-preset-sel').value;
        const dur = parseFloat(mount.querySelector('#mas-cam-preset-dur').value) || 4;
        bridge.applyCameraPresetAt(presetId, t, dur);
        renderAllMAS();
      };
      mount.querySelector('#mas-cam-add-here').onclick = () => {
        bridge.addCameraKeyAt(t);
        MAS.sel = { kind: 'cam', key: Math.max(0, bridge.getCameraKeys().length - 1) };
        renderAllMAS();
      };
      const btnCamClear = mount.querySelector('#mas-cam-clear');
      if (btnCamClear) {
        btnCamClear.onclick = () => {
          bridge.resetCameraKeys();
          renderAllMAS();
        };
      }
      mount.querySelectorAll('[data-mas-camk-sum]').forEach(sum => {
        sum.onclick = e => {
          if (e.target.dataset.masCamkDel) return;
          e.preventDefault();
          const idx = +sum.dataset.masCamkSum;
          MAS.sel = { kind: 'cam', key: MAS.sel.kind === 'cam' && MAS.sel.key === idx ? null : idx };
          if (MAS.sel.key !== null && camKeys[idx]) {
            bridge.setTime(camKeys[idx].t);
            if (bridge.selectCameraShot) bridge.selectCameraShot(idx);
          }
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-camk-del]').forEach(btn => {
        btn.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          bridge.deleteCameraKey(+btn.dataset.masCamkDel);
          renderAllMAS();
        };
      });
      mount.querySelectorAll('[data-mas-camk-prop]').forEach(inp => {
        const [idxStr, prop] = inp.dataset.masCamkProp.split(':');
        const idx = +idxStr;
        inp.onchange = () => {
          const val = prop === 'move' ? inp.value : parseFloat(inp.value);
          if (prop !== 'move' && !Number.isFinite(val)) return;
          bridge.updateCameraKey(idx, { [prop]: val });
          renderAllMAS();
        };
      });
      return;
    }

    if (MAS.itab === 'project') {
      const meta = bridge.getProjectMeta();
      mount.innerHTML = `
        <div class="mas-box">
          <h4><span>Project & Format (Map Studio Standard)</span></h4>
          <div class="mas-f">
            <span class="mas-fl">Project name</span>
            <input type="text" id="mas-proj-name" value="${esc(meta.name)}" />
          </div>
          <div class="mas-grid3">
            <div class="mas-f">
              <span class="mas-fl">Aspect / Size</span>
              <select id="mas-proj-size">
                <option value="1920x1080" ${meta.width === 1920 && meta.height === 1080 ? 'selected' : ''}>1080p 16:9</option>
                <option value="3840x2160" ${meta.width === 3840 && meta.height === 2160 ? 'selected' : ''}>4K 16:9</option>
                <option value="1080x1920" ${meta.width === 1080 && meta.height === 1920 ? 'selected' : ''}>Shorts 9:16</option>
                <option value="1080x1080" ${meta.width === 1080 && meta.height === 1080 ? 'selected' : ''}>Square 1:1</option>
                <option value="1440x1080" ${meta.width === 1440 && meta.height === 1080 ? 'selected' : ''}>Classic 4:3</option>
              </select>
            </div>
            <div class="mas-f">
              <span class="mas-fl">Length (s)</span>
              <input type="number" step="0.5" min="1" max="600" id="mas-proj-dur" value="${r3(bridge.getDuration())}" />
            </div>
            <div class="mas-f">
              <span class="mas-fl">FPS</span>
              <select id="mas-proj-fps">
                ${[24, 25, 30, 50, 60].map(f => `<option value="${f}" ${fps === f ? 'selected' : ''}>${f} fps</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="mas-grid2" style="align-items:center;padding-top:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;cursor:pointer">
              <input type="checkbox" id="mas-proj-sfx" ${MAS.sfxEnabled ? 'checked' : ''} /> Sound effects
            </label>
            <div class="mas-f">
              <span class="mas-fl"><span>Volume</span><b>${Math.round(MAS.sfxVolume * 100)}%</b></span>
              <input type="range" min="0" max="1" step="0.05" id="mas-proj-vol" value="${MAS.sfxVolume}" />
            </div>
          </div>
        </div>
      `;
      mount.querySelector('#mas-proj-name').oninput = e => bridge.setProjectMeta({ name: e.target.value });
      mount.querySelector('#mas-proj-size').onchange = e => {
        const [w, h] = e.target.value.split('x').map(Number);
        bridge.setProjectMeta({ width: w, height: h });
        renderAllMAS();
      };
      mount.querySelector('#mas-proj-dur').onchange = e => {
        const d = parseFloat(e.target.value);
        if (Number.isFinite(d)) bridge.setDuration(clamp(d, 1, 600));
        renderAllMAS();
      };
      mount.querySelector('#mas-proj-fps').onchange = e => {
        bridge.setProjectMeta({ fps: +e.target.value });
        renderAllMAS();
      };
      mount.querySelector('#mas-proj-sfx').onchange = e => { MAS.sfxEnabled = e.target.checked; };
      mount.querySelector('#mas-proj-vol').oninput = e => { MAS.sfxVolume = parseFloat(e.target.value); renderMASInspector(); };
    }
  }

  /* ---------- Render Map Animation Studio 4-Tab Left Library Drawer ---------- */
  function renderMASLibrary() {
    const bridge = getBridge();
    const drawer = document.getElementById('mas-lib-drawer');
    const bar = document.getElementById('mas-lib-tabbar');
    if (!bridge || !drawer || !bar) return;

    bar.querySelectorAll('[data-mas-ltab]').forEach(b => {
      b.classList.toggle('on', b.dataset.masLtab === MAS.ltab);
    });

    const libPanel = drawer.parentElement;
    if (libPanel) {
      for (const ch of libPanel.children) {
        if (ch.id === 'mas-lib-tabbar' || ch.id === 'mas-lib-drawer') continue;
        ch.classList.toggle('mas-native-hidden', MAS.ltab !== 'templates');
      }
    }
    if (MAS.ltab === 'templates') {
      drawer.hidden = true;
      return;
    }
    drawer.hidden = false;

    if (MAS.ltab === 'quick') {
      const builders = bridge.getQuickBuilders();
      drawer.innerHTML = `
        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.08em;color:var(--mas-muted);font-weight:700">⚡ One-Click Quick Builders</div>
        <div style="display:grid;gap:5px">
          ${builders.map((qb, qi) => `
            <div style="background:var(--mas-raise);border:1px solid var(--mas-line);border-radius:7px;padding:7px 9px;display:flex;align-items:center;gap:8px">
              <div style="flex:1;min-width:0">
                <b style="display:block;font-size:11.5px;color:var(--mas-fg)">${esc(qb.name)}</b>
                <small style="display:block;font-size:10px;color:var(--mas-muted)">${esc(qb.desc)}</small>
              </div>
              <button type="button" class="mas-btn sm pri" data-mas-qb="${qi}">Build</button>
            </div>
          `).join('')}
        </div>
      `;
      drawer.querySelectorAll('[data-mas-qb]').forEach(btn => {
        btn.onclick = () => {
          const qb = builders[+btn.dataset.masQb];
          if (qb && qb.run) {
            qb.run(bridge.getTime());
            renderAllMAS();
          }
        };
      });
      return;
    }

    if (MAS.ltab === 'add') {
      const types = bridge.getAddableTypes();
      const layers = bridge.getLayers();
      const hostLayer = MAS.sel.kind === 'layer' && layers[MAS.sel.i] ? layers[MAS.sel.i] : null;
      drawer.innerHTML = `
        <div class="mas-addmode">
          <span>Add as</span>
          <div class="mas-seg">
            <button type="button" class="${MAS.addMode === 'effect' ? 'on' : ''}" data-mas-addmode="effect" title="Embed inside the selected layer at playhead">Effect</button>
            <button type="button" class="${MAS.addMode === 'layer' ? 'on' : ''}" data-mas-addmode="layer" title="Create a new layer track">Layer</button>
          </div>
        </div>
        <p style="font-size:10.5px;color:var(--mas-muted);margin:0">
          ${MAS.addMode === 'effect' && hostLayer
            ? `Adds inside <b>${esc(hostLayer.name)}</b> at playhead (${bridge.getTime().toFixed(1)}s).`
            : `Click to add at playhead (${bridge.getTime().toFixed(1)}s), or drag onto any timeline track.`}
        </p>
        <div style="display:grid;gap:4px">
          ${types.map(t => `
            <button type="button" class="mas-btn" style="justify-content:flex-start;padding:5px 8px;text-align:left" draggable="true" data-mas-add-card="${esc(t.id)}">
              <span style="width:22px;height:22px;border-radius:5px;background:rgba(240,169,59,0.16);color:#ffd79a;display:inline-flex;align-items:center;justify-content:center;font-weight:700">${esc(t.icon || '＋')}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis"><b>${esc(t.name)}</b> <small style="color:var(--mas-muted)">· ${esc(t.desc || t.group || '')}</small></span>
            </button>
          `).join('')}
        </div>
      `;
      drawer.querySelectorAll('[data-mas-addmode]').forEach(b => {
        b.onclick = () => {
          MAS.addMode = b.dataset.masAddmode;
          try { localStorage.setItem('mas:addMode', MAS.addMode); } catch {}
          renderMASLibrary();
        };
      });
      drawer.querySelectorAll('[data-mas-add-card]').forEach(card => {
        const id = card.dataset.masAddCard;
        card.onclick = () => {
          const attachId = MAS.addMode === 'effect' && hostLayer ? hostLayer.id : null;
          bridge.addLayer(id, r3(bridge.getTime()), attachId);
          renderAllMAS();
        };
        card.ondragstart = e => {
          e.dataTransfer.setData('text/x-mas-add', id);
          e.dataTransfer.effectAllowed = 'copy';
        };
      });
      return;
    }

    if (MAS.ltab === 'media') {
      const mediaItems = bridge.getMediaList();
      drawer.innerHTML = `
        <div class="mas-dropzone" id="mas-media-dropzone">
          <b>＋ Upload photos, videos or audio</b>
          <span>Drop files here or click to browse</span>
          <input type="file" id="mas-media-file-input" accept="image/*,video/*,audio/*" multiple hidden />
        </div>
        <div style="display:flex;gap:5px">
          <input type="text" id="mas-media-url-in" placeholder="Paste media URL (https://…)" style="flex:1;background:var(--mas-raise);border:1px solid var(--mas-line);border-radius:6px;padding:4px 7px;font-size:11px;color:var(--mas-fg)" />
          <button type="button" class="mas-btn sm" id="mas-media-url-btn">Use link</button>
        </div>
        ${mediaItems.length ? `
          <div class="mas-media-grid">
            ${mediaItems.map(m => `
              <div class="mas-mitem">
                <div class="mas-mthumb">
                  ${m.kind === 'video'
                    ? `<video src="${esc(m.src)}" muted preload="metadata"></video>`
                    : `<img src="${esc(m.src)}" alt="${esc(m.name)}" loading="lazy" />`}
                </div>
                <div class="mas-mname" title="${esc(m.name)}">${esc(m.name)}</div>
                <div class="mas-macts">
                  <button type="button" class="mas-btn sm" style="flex:1;font-size:10px" data-mas-media-add="${esc(m.id)}">＋ Layer</button>
                  <button type="button" class="mas-btn sm ghost" style="font-size:10px" data-mas-media-use="${esc(m.id)}" title="Assign to selected layer">Use</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `<p style="font-size:11px;color:var(--mas-muted);margin:0">No imported media yet. Drop photos or videos above to use them across your timeline.</p>`}
      `;
      const dz = drawer.querySelector('#mas-media-dropzone');
      const fi = drawer.querySelector('#mas-media-file-input');
      if (dz && fi) {
        dz.onclick = () => fi.click();
        fi.onchange = async () => {
          if (fi.files && fi.files.length) {
            await bridge.uploadMedia([...fi.files]);
            renderAllMAS();
          }
        };
        dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
        dz.ondragleave = () => dz.classList.remove('over');
        dz.ondrop = async e => {
          e.preventDefault();
          dz.classList.remove('over');
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            await bridge.uploadMedia([...e.dataTransfer.files]);
            renderAllMAS();
          }
        };
      }
      const urlBtn = drawer.querySelector('#mas-media-url-btn');
      if (urlBtn) {
        urlBtn.onclick = async () => {
          const url = drawer.querySelector('#mas-media-url-in').value.trim();
          if (/^https?:\/\//i.test(url) && bridge.addMediaUrl) {
            await bridge.addMediaUrl(url);
            renderAllMAS();
          }
        };
      }
      drawer.querySelectorAll('[data-mas-media-add]').forEach(b => {
        b.onclick = () => {
          bridge.useMedia(b.dataset.masMediaAdd, true);
          renderAllMAS();
        };
      });
      drawer.querySelectorAll('[data-mas-media-use]').forEach(b => {
        b.onclick = () => {
          bridge.useMedia(b.dataset.masMediaUse, false);
          renderAllMAS();
        };
      });
    }
  }

  /* ---------- Render Stage Overlay Badges & Controls ---------- */
  function renderMASStageOverlay() {
    const bridge = getBridge();
    if (!bridge) return;
    const badgesEl = document.getElementById('mas-stage-badges');
    if (badgesEl) {
      const layers = bridge.getLayers();
      const selLayer = MAS.sel.kind === 'layer' && layers[MAS.sel.i] ? layers[MAS.sel.i] : null;
      badgesEl.innerHTML = `
        ${selLayer ? `<span class="mas-badge">${esc(selLayer.icon || '◆')} ${esc(selLayer.name)}${selLayer.group ? ` · ★ ${esc(selLayer.group)}` : ''}</span>` : ''}
        ${MAS.recording ? `<span class="mas-badge rec">● Recording keyframes</span>` : ''}
      `;
    }
    const zoomBtn = document.getElementById('mas-view-zoom-pct');
    if (zoomBtn) zoomBtn.textContent = `${Math.round(MAS.frameScale * 100)}%`;
    const recBtn = document.getElementById('mas-transport-rec');
    if (recBtn) recBtn.classList.toggle('on', MAS.recording), recBtn.classList.toggle('rec', MAS.recording);
  }

  /* ---------- Keyframe Actions ---------- */
  function addKeyframeAtPlayhead() {
    const bridge = getBridge();
    if (!bridge) return;
    const t = bridge.getTime();
    if (MAS.sel.kind === 'cam' || MAS.itab === 'camera') {
      bridge.addCameraKeyAt(t);
      MAS.sel = { kind: 'cam', key: Math.max(0, bridge.getCameraKeys().length - 1) };
      MAS.itab = 'camera';
      renderAllMAS();
      return;
    }
    const layers = bridge.getLayers();
    const idx = MAS.sel.kind === 'layer' && layers[MAS.sel.i] ? MAS.sel.i : (layers.length ? 0 : -1);
    if (idx < 0) return;
    const l = layers[idx];
    const dur = Math.max(0.1, l.endSec - l.startSec);
    const local = clamp(r3(t - l.startSec), 0, dur);
    const cur = evaluateKeys(l.keys || [], local);
    const nextKeys = [...(l.keys || [])];
    const existingIdx = nextKeys.findIndex(k => Math.abs((+k.t || 0) - local) < 0.04);
    const newK = { t: local, opacity: r3(cur.opacity), scale: r3(cur.scale), x: Math.round(cur.x), y: Math.round(cur.y), rotate: Math.round(cur.rotate), ease: 'ease-in-out' };
    let keyIdx = existingIdx;
    if (existingIdx >= 0) nextKeys[existingIdx] = newK;
    else {
      nextKeys.push(newK);
      nextKeys.sort((a, b) => (+a.t || 0) - (+b.t || 0));
      keyIdx = nextKeys.indexOf(newK);
    }
    bridge.updateLayer(idx, { keys: nextKeys });
    MAS.sel = { kind: 'layer', i: idx, key: keyIdx };
    MAS.itab = 'animate';
    renderAllMAS();
  }

  function deleteMASSelection() {
    const bridge = getBridge();
    if (!bridge) return;
    if (MAS.sel.kind === 'layer' && MAS.sel.i >= 0) {
      const l = bridge.getLayers()[MAS.sel.i];
      if (!l) return;
      if (MAS.sel.key !== null && l.keys && l.keys[MAS.sel.key]) {
        const nextKeys = l.keys.filter((_, m) => m !== MAS.sel.key);
        bridge.updateLayer(MAS.sel.i, { keys: nextKeys });
        MAS.sel.key = null;
      } else {
        bridge.deleteLayer(MAS.sel.i);
        MAS.sel = { kind: 'none', i: -1, key: null };
      }
      renderAllMAS();
    } else if (MAS.sel.kind === 'cam' && MAS.sel.key !== null) {
      bridge.deleteCameraKey(MAS.sel.key);
      MAS.sel = { kind: 'cam', key: null };
      renderAllMAS();
    }
  }

  function toggleMASFullscreen() {
    const bridge = getBridge();
    const center = document.querySelector('.center, .editor');
    if (!center) return;
    MAS.isFullscreen = !MAS.isFullscreen;
    center.classList.toggle('mas-fullscreen-active', MAS.isFullscreen);
    let fsBar = document.getElementById('mas-fs-bar');
    if (MAS.isFullscreen) {
      if (!fsBar) {
        fsBar = document.createElement('div');
        fsBar.id = 'mas-fs-bar';
        fsBar.className = 'mas-fs-controls';
        center.appendChild(fsBar);
      }
      const dur = bridge ? bridge.getDuration() : 20;
      const t = bridge ? bridge.getTime() : 0;
      fsBar.innerHTML = `
        <button type="button" class="mas-btn pri" id="mas-fs-play">${bridge && bridge.isPlaying() ? '❚❚' : '▶'}</button>
        <span id="mas-fs-tc" style="font-family:var(--mas-mono);font-size:12px">${fmtTime(t)} / ${fmtTime(dur)}</span>
        <input type="range" id="mas-fs-scrub" min="0" max="${dur}" step="0.02" value="${t}" style="flex:1;accent-color:var(--mas-primary)" />
        <button type="button" class="mas-btn sm pri" id="mas-fs-setcam">⌖ Set Camera Key</button>
        <button type="button" class="mas-btn sm" id="mas-fs-exit">Exit (Esc)</button>
      `;
      fsBar.querySelector('#mas-fs-play').onclick = () => {
        if (!bridge) return;
        if (bridge.isPlaying()) bridge.pause(); else bridge.play();
        fsBar.querySelector('#mas-fs-play').textContent = bridge.isPlaying() ? '❚❚' : '▶';
      };
      fsBar.querySelector('#mas-fs-scrub').oninput = e => {
        if (bridge) {
          bridge.pause();
          bridge.setTime(parseFloat(e.target.value));
          updateMASPlayheadOnly();
        }
      };
      fsBar.querySelector('#mas-fs-setcam').onclick = () => {
        if (bridge) {
          bridge.captureCameraAt(bridge.getTime());
          renderAllMAS();
        }
      };
      fsBar.querySelector('#mas-fs-exit').onclick = toggleMASFullscreen;
    } else if (fsBar) {
      fsBar.remove();
    }
    if (bridge && bridge.fitStage) setTimeout(() => bridge.fitStage(), 50);
  }

  function renderAllMAS() {
    renderMASTimeline();
    renderMASInspector();
    renderMASLibrary();
    renderMASStageOverlay();
  }

  window.MASCutroom = {
    MAS,
    renderAllMAS,
    renderMASTimeline,
    renderMASInspector,
    renderMASLibrary,
    renderMASStageOverlay,
    updateMASPlayheadOnly,
    addKeyframeAtPlayhead,
    deleteMASSelection,
    toggleMASFullscreen,
    checkServer,
    EXPORT_QUALITIES,
  };
})();

/* ============================================================================
   Part 3: Studio Auto-Bridges, Real-Time Renderer Keyframe Hooks,
   DOM Mounting, Stage Gesture Recording, and Export Engine Upgrade
   ============================================================================ */
(() => {
  'use strict';
  const { evaluateKeys } = window.MASKeyframes;
  const {
    MAS,
    renderAllMAS,
    renderMASTimeline,
    renderMASInspector,
    renderMASLibrary,
    renderMASStageOverlay,
    updateMASPlayheadOnly,
    addKeyframeAtPlayhead,
    deleteMASSelection,
    toggleMASFullscreen,
    checkServer,
    EXPORT_QUALITIES,
  } = window.MASCutroom;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const r3 = v => Math.round((+v || 0) * 1000) / 1000;
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Camera Keyframe Interpolation Hook ---------- */
  function evaluateCameraKeys(camKeys, t) {
    if (!Array.isArray(camKeys) || !camKeys.length) return null;
    const sorted = camKeys.slice().sort((a, b) => (+a.t || 0) - (+b.t || 0));
    if (t <= (+sorted[0].t || 0)) return sorted[0];
    const last = sorted[sorted.length - 1];
    if (t >= (+last.t || 0)) return last;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const ta = +a.t || 0, tb = +b.t || 0;
      if (t >= ta && t <= tb) {
        if (b.move === 'cut') return t < tb ? a : b;
        const span = Math.max(1e-4, tb - ta);
        const rawP = clamp((t - ta) / span, 0, 1);
        const p = b.move === 'linear' ? rawP : rawP * rawP * (3 - 2 * rawP);
        // 'fly' dips zoom slightly at midpoint like Google Earth
        const flyDip = b.move === 'fly' ? Math.sin(rawP * Math.PI) * 0.22 : 0;
        return {
          t,
          x: lerp(+a.x || 0, +b.x || 0, p),
          y: lerp(+a.y || 0, +b.y || 0, p),
          zoom: Math.max(0.15, lerp(a.zoom ?? 1, b.zoom ?? 1, p) - flyDip),
          bearing: lerp(+a.bearing || 0, +b.bearing || 0, p),
          pitch: lerp(+a.pitch || 0, +b.pitch || 0, p),
        };
      }
    }
    return null;
  }

  /* ---------- Build Studio Bridge for All 13 Studios ---------- */
  function createUniversalBridge() {
    const H = window.__MAS_HOST;
    if (!H) return null;

    const getProj = () => H.getProject();
    const getDur = () => Math.max(0.5, +H.getDuration() || 10);
    const getFps = () => +(getProj()?.fps) || 30;

    // Ensure project has masCameraKeys array
    const ensureCamKeys = () => {
      const p = getProj();
      if (!p) return [];
      if (H.getCameraKeys) return H.getCameraKeys();
      if (!Array.isArray(p.masCameraKeys) || !p.masCameraKeys.length) {
        p.masCameraKeys = [
          { t: 0, label: 'Opening Frame', x: 0, y: 0, zoom: 1, bearing: 0, pitch: 0, move: 'smooth', ease: 'ease-in-out' },
        ];
      }
      return p.masCameraKeys;
    };

    const bridge = {
      id: H.id,
      getProject: getProj,
      getTime: () => +H.getTime() || 0,
      setTime: t => {
        H.setTime(clamp(+t || 0, 0, getDur()));
        updateMASPlayheadOnly();
      },
      isPlaying: () => Boolean(H.isPlaying()),
      play: () => H.play(),
      pause: () => H.pause(),
      getFps,
      getDuration: getDur,
      setDuration: d => {
        if (H.setDuration) H.setDuration(d);
        else {
          const p = getProj();
          if (p) p.duration = d;
        }
        H.changed(true);
      },
      getProjectMeta: () => {
        const p = getProj() || {};
        return {
          name: p.name || p.title || 'Untitled Project',
          width: +p.width || +p.w || 1920,
          height: +p.height || +p.h || 1080,
          fps: +p.fps || 30,
        };
      },
      setProjectMeta: patch => {
        const p = getProj();
        if (!p) return;
        if (patch.name !== undefined) {
          p.name = patch.name;
          if ('title' in p && !p.name) p.title = patch.name;
          const pn = document.getElementById('projName') || document.getElementById('projectName') || document.getElementById('hes-pname');
          if (pn) pn.value = patch.name;
        }
        if (patch.width && patch.height) {
          if ('w' in p) { p.w = patch.width; p.h = patch.height; }
          else { p.width = patch.width; p.height = patch.height; }
        }
        if (patch.fps) p.fps = patch.fps;
        if (H.onMetaChanged) H.onMetaChanged(patch);
        H.changed(true);
      },
      getLayers: () => H.getLayers(),
      updateLayer: (idx, patch, quiet = false) => {
        H.updateLayer(idx, patch);
        H.changed(!quiet);
      },
      setSelectedLayer: idx => {
        if (H.setSelectedLayer) H.setSelectedLayer(idx);
      },
      addLayer: (typeId, atSec, attachToId) => {
        H.addLayer(typeId, atSec, attachToId);
        H.changed(true);
      },
      splitLayer: (idx, atSec) => {
        if (H.splitLayer) H.splitLayer(idx, atSec);
        H.changed(true);
      },
      duplicateLayer: idx => {
        if (H.duplicateLayer) H.duplicateLayer(idx);
        H.changed(true);
      },
      deleteLayer: idx => {
        if (H.deleteLayer) H.deleteLayer(idx);
        H.changed(true);
      },
      moveLayerZ: (idx, delta) => {
        if (H.moveLayerZ) H.moveLayerZ(idx, delta);
        H.changed(true);
      },
      getCameraKeys: ensureCamKeys,
      getCameraSpans: () => (H.getCameraSpans ? H.getCameraSpans() : []),
      selectCameraShot: idx => {
        if (H.selectCameraShot) H.selectCameraShot(idx);
      },
      addCameraKeyAt: atSec => {
        if (H.addCameraKeyAt) {
          H.addCameraKeyAt(atSec);
        } else {
          const ks = ensureCamKeys();
          const cur = evaluateCameraKeys(ks, atSec) || ks[ks.length - 1] || { x: 0, y: 0, zoom: 1, bearing: 0, pitch: 0 };
          ks.push({
            t: r3(atSec),
            label: `Cam @ ${atSec.toFixed(1)}s`,
            x: cur.x || 0,
            y: cur.y || 0,
            zoom: r3(cur.zoom ?? 1),
            bearing: Math.round(cur.bearing || 0),
            pitch: Math.round(cur.pitch || 0),
            move: 'smooth',
            ease: 'ease-in-out',
          });
          ks.sort((a, b) => a.t - b.t);
        }
        H.changed(true);
      },
      captureCameraAt: atSec => {
        if (H.captureCameraAt) H.captureCameraAt(atSec);
        else bridge.addCameraKeyAt(atSec);
        H.changed(true);
      },
      updateCameraKey: (idx, patch) => {
        if (H.updateCameraKey) H.updateCameraKey(idx, patch);
        else {
          const ks = ensureCamKeys();
          if (ks[idx]) Object.assign(ks[idx], patch);
        }
        H.changed(true);
      },
      deleteCameraKey: idx => {
        if (H.deleteCameraKey) H.deleteCameraKey(idx);
        else {
          const ks = ensureCamKeys();
          if (ks.length > 1) ks.splice(idx, 1);
        }
        H.changed(true);
      },
      resetCameraKeys: () => {
        if (H.resetCameraKeys) H.resetCameraKeys();
        else {
          const p = getProj();
          if (p) p.masCameraKeys = [{ t: 0, label: 'Default Frame', x: 0, y: 0, zoom: 1, bearing: 0, pitch: 0, move: 'smooth', ease: 'ease-in-out' }];
        }
        H.changed(true);
      },
      applyCameraPresetAt: (presetId, atSec, durSec) => {
        if (H.applyCameraPresetAt) {
          H.applyCameraPresetAt(presetId, atSec, durSec);
        } else {
          const ks = ensureCamKeys();
          const t0 = r3(atSec), t1 = r3(atSec + Math.max(0.5, durSec));
          const presets = {
            'sky-to-ground': [{ zoom: 0.72, pitch: 0, bearing: 0 }, { zoom: 1.45, pitch: 12, bearing: 0, move: 'fly' }],
            'push-in': [{ zoom: 1.0, pitch: 0, bearing: 0 }, { zoom: 1.35, pitch: 0, bearing: 0, move: 'smooth' }],
            'pull-back': [{ zoom: 1.45, pitch: 0, bearing: 0 }, { zoom: 1.0, pitch: 0, bearing: 0, move: 'smooth' }],
            'snap-zoom': [{ zoom: 1.0, pitch: 0, bearing: 0 }, { zoom: 1.65, pitch: 0, bearing: -3, move: 'fly' }],
            'orbit-cw': [{ zoom: 1.15, pitch: 10, bearing: -14 }, { zoom: 1.15, pitch: 10, bearing: 14, move: 'smooth' }],
            'orbit-ccw': [{ zoom: 1.15, pitch: 10, bearing: 14 }, { zoom: 1.15, pitch: 10, bearing: -14, move: 'smooth' }],
            'tilt-reveal': [{ zoom: 1.1, pitch: 28, bearing: 0 }, { zoom: 1.0, pitch: 0, bearing: 0, move: 'smooth' }],
            'crane-up': [{ zoom: 1.3, pitch: 18, y: 60, bearing: 0 }, { zoom: 0.95, pitch: 0, y: 0, bearing: 0, move: 'smooth' }],
            'drift-right': [{ zoom: 1.12, x: -70, pitch: 0, bearing: 0 }, { zoom: 1.12, x: 70, pitch: 0, bearing: 0, move: 'linear' }],
            'whip-pan': [{ zoom: 1.2, x: -160, pitch: 0, bearing: -5 }, { zoom: 1.0, x: 0, pitch: 0, bearing: 0, move: 'fly' }],
            'chase-cam': [{ zoom: 1.25, pitch: 16, bearing: -6 }, { zoom: 1.35, pitch: 20, bearing: 6, move: 'smooth' }],
            'handheld-doc': [{ zoom: 1.08, pitch: 4, bearing: -2 }, { zoom: 1.14, pitch: -3, bearing: 2, move: 'smooth' }],
          };
          const pair = presets[presetId] || presets['push-in'];
          const filtered = ks.filter(k => k.t < t0 - 0.05 || k.t > t1 + 0.05);
          filtered.push(
            { t: t0, label: `${presetId} start`, x: pair[0].x || 0, y: pair[0].y || 0, zoom: pair[0].zoom, bearing: pair[0].bearing, pitch: pair[0].pitch, move: 'smooth', ease: 'ease-in-out' },
            { t: t1, label: `${presetId} end`, x: pair[1].x || 0, y: pair[1].y || 0, zoom: pair[1].zoom, bearing: pair[1].bearing, pitch: pair[1].pitch, move: pair[1].move || 'smooth', ease: 'ease-in-out' }
          );
          filtered.sort((a, b) => a.t - b.t);
          const p = getProj();
          if (p) p.masCameraKeys = filtered;
        }
        H.changed(true);
      },
      applyCameraToLayer: (layerIdx, presetId, moveLen) => {
        const l = bridge.getLayers()[layerIdx];
        if (!l) return;
        if (H.applyCameraToLayer) H.applyCameraToLayer(layerIdx, presetId, moveLen);
        else bridge.applyCameraPresetAt(presetId, l.startSec, Math.min(moveLen, Math.max(0.5, l.endSec - l.startSec)));
        H.changed(true);
      },
      getAddableTypes: () => H.getAddableTypes(),
      getQuickBuilders: () => H.getQuickBuilders(),
      getMediaList: () => H.getMediaList(),
      uploadMedia: async files => {
        if (MAS.online) {
          for (const f of files) {
            try {
              await fetch(`/api/media?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
            } catch {}
          }
        }
        if (H.uploadMedia) await H.uploadMedia(files);
        H.changed(true);
      },
      useMedia: (id, asNewLayer) => {
        if (H.useMedia) H.useMedia(id, asNewLayer);
        H.changed(true);
      },
      fitStage: () => { if (H.fitStage) H.fitStage(); },
    };

    return bridge;
  }

  /* ---------- Mount Map Animation Studio Cutroom UI Shell ---------- */
  function mountMASCutroom() {
    const bridge = createUniversalBridge();
    if (!bridge) return;
    window.__MAS_STUDIO_BRIDGE = bridge;

    // 1. Enhance Top Bar with Map Animation Studio Controls
    const topBar = document.querySelector('header.top, header.topbar');
    if (topBar && !document.getElementById('mas-top-injected')) {
      const brand = topBar.querySelector('.brand');
      if (brand && !brand.querySelector('.mas-brand-dot') && !brand.querySelector('i')) {
        const dot = document.createElement('span');
        dot.className = 'mas-brand-dot';
        brand.prepend(dot);
      }
      const ctrls = document.createElement('div');
      ctrls.id = 'mas-top-injected';
      ctrls.className = 'mas-top-ctrls';
      ctrls.innerHTML = `
        <span id="mas-server-chip" class="mas-chip">Local Studio</span>
        <button type="button" class="mas-btn sm ghost mas-hide-mob" id="mas-toggle-left" title="Hide or show Left Library Panel">Hide Library</button>
        <button type="button" class="mas-btn sm ghost mas-hide-mob" id="mas-toggle-right" title="Hide or show Right Inspector Panel">Hide Inspector</button>
      `;
      const actions = topBar.querySelector('.top-actions');
      if (actions) topBar.insertBefore(ctrls, actions);
      else topBar.appendChild(ctrls);

      const btnLeft = ctrls.querySelector('#mas-toggle-left');
      btnLeft.onclick = () => {
        MAS.hideLeft = !MAS.hideLeft;
        document.body.classList.toggle('mas-hide-left', MAS.hideLeft);
        btnLeft.textContent = MAS.hideLeft ? 'Show Library' : 'Hide Library';
        btnLeft.classList.toggle('on', MAS.hideLeft);
        if (bridge.fitStage) setTimeout(() => bridge.fitStage(), 50);
      };
      const btnRight = ctrls.querySelector('#mas-toggle-right');
      btnRight.onclick = () => {
        MAS.hideRight = !MAS.hideRight;
        document.body.classList.toggle('mas-hide-right', MAS.hideRight);
        btnRight.textContent = MAS.hideRight ? 'Show Inspector' : 'Hide Inspector';
        btnRight.classList.toggle('on', MAS.hideRight);
        if (bridge.fitStage) setTimeout(() => bridge.fitStage(), 50);
      };
    }

    // 2. Enhance Left Library Panel with Map Animation Studio 4 Tabs (Quick | Add | Templates | Media)
    const libPanel = document.getElementById('panelLib') || document.getElementById('libraryPanel') || document.getElementById('panel-lib');
    if (libPanel && !document.getElementById('mas-lib-tabbar')) {
      libPanel.classList.add('mas-lib-host');
      const tabBar = document.createElement('div');
      tabBar.id = 'mas-lib-tabbar';
      tabBar.className = 'mas-lib-bar';
      tabBar.innerHTML = `
        <button type="button" data-mas-ltab="quick">Quick</button>
        <button type="button" data-mas-ltab="add">Add</button>
        <button type="button" data-mas-ltab="templates" class="on">Templates</button>
        <button type="button" data-mas-ltab="media">Media</button>
      `;
      const drawer = document.createElement('div');
      drawer.id = 'mas-lib-drawer';
      drawer.className = 'mas-lib-drawer';
      drawer.hidden = true;
      libPanel.prepend(drawer);
      libPanel.prepend(tabBar);

      tabBar.querySelectorAll('[data-mas-ltab]').forEach(btn => {
        btn.onclick = () => {
          MAS.ltab = btn.dataset.masLtab;
          renderMASLibrary();
        };
      });
    }

    // 3. Enhance Right Inspector Panel with Map Animation Studio 4 Tabs (Layer | Animate | Camera | Project)
    const inspPanel = document.getElementById('panelInsp') || document.getElementById('inspectorPanel') || document.getElementById('panel-insp');
    if (inspPanel && !document.getElementById('mas-insp-tabbar')) {
      inspPanel.classList.add('mas-insp-host');
      const tabBar = document.createElement('div');
      tabBar.id = 'mas-insp-tabbar';
      tabBar.className = 'mas-insp-tabs';
      tabBar.innerHTML = `
        <button type="button" data-mas-itab="layer" class="on">Layer</button>
        <button type="button" data-mas-itab="animate">Animate</button>
        <button type="button" data-mas-itab="camera">Camera</button>
        <button type="button" data-mas-itab="project">Project</button>
      `;
      const mount = document.createElement('div');
      mount.id = 'mas-inspector-mount';
      mount.style.padding = '8px 10px 0';
      inspPanel.prepend(mount);
      inspPanel.prepend(tabBar);

      tabBar.querySelectorAll('[data-mas-itab]').forEach(btn => {
        btn.onclick = () => {
          MAS.itab = btn.dataset.masItab;
          // Also sync native studio inspector tabs if present
          if (MAS.itab === 'camera') {
            const nc = document.getElementById('tabCamera') || document.querySelector('[data-inspector="motion"]');
            if (nc) nc.click();
          } else if (MAS.itab === 'project') {
            const np = document.getElementById('tabBoard') || document.querySelector('[data-inspector="project"]');
            if (np) np.click();
          } else if (MAS.itab === 'layer') {
            const nl = document.getElementById('tabClue') || document.querySelector('[data-inspector="event"]');
            if (nl) nl.click();
          }
          renderMASInspector();
        };
      });
    }

    // 4. Enhance Bottom Timeline Panel with Map Animation Studio Multi-Track Timeline
    const tlPanel = document.getElementById('panelTimeline') || document.querySelector('.timeline-panel') || document.querySelector('.tl');
    if (tlPanel && !document.getElementById('mas-timeline-mount')) {
      tlPanel.classList.add('mas-tl-host');
      for (const ch of tlPanel.children) {
        ch.classList.add('mas-native-hidden');
      }
      const mount = document.createElement('div');
      mount.id = 'mas-timeline-mount';
      mount.className = 'mas-tlwrap';
      tlPanel.appendChild(mount);
    }

    // 5. Enhance Stage Preview with Floating Map Animation Studio Toolbar & Badges
    const stageWrap = document.getElementById('stageWrap') || document.querySelector('.stagewrap');
    if (stageWrap && !document.getElementById('mas-stage-overlay')) {
      stageWrap.classList.add('mas-stage-host');
      if (getComputedStyle(stageWrap).position === 'static') stageWrap.style.position = 'relative';
      const badges = document.createElement('div');
      badges.id = 'mas-stage-badges';
      badges.className = 'mas-stage-badges';
      stageWrap.appendChild(badges);

      const overlay = document.createElement('div');
      overlay.id = 'mas-stage-overlay';
      overlay.className = 'mas-stage-overlay';
      overlay.innerHTML = `
        <div class="mas-stage-pill mas-hide-mob">
          <span style="color:var(--mas-muted)">View</span>
          <input type="range" id="mas-view-zoom" min="0.5" max="2.2" step="0.05" value="1" style="width:54px;height:14px;accent-color:var(--mas-primary)" title="Preview display magnification" />
          <button type="button" class="mas-btn sm ghost" id="mas-view-zoom-pct" style="min-height:20px;padding:0 4px;font-size:10.5px" title="Reset view magnification to 100%">100%</button>
        </div>
        <button type="button" class="mas-btn sm pri" id="mas-stage-setcam" title="Save current preview position & zoom as a camera keyframe at playhead">⌖ Set Camera Here</button>
        <button type="button" class="mas-btn sm" id="mas-stage-fs" title="Full Screen interactive preview (F11)">⛶ Full Screen</button>
      `;
      stageWrap.appendChild(overlay);

      const zoomIn = overlay.querySelector('#mas-view-zoom');
      const applyZoom = v => {
        MAS.frameScale = v;
        const target = document.getElementById('stageMat') || document.getElementById('stage') || document.getElementById('hes-stage');
        if (target) target.style.transform = v === 1 ? '' : `scale(${v})`;
        renderMASStageOverlay();
      };
      zoomIn.oninput = () => applyZoom(parseFloat(zoomIn.value));
      overlay.querySelector('#mas-view-zoom-pct').onclick = () => {
        zoomIn.value = '1';
        applyZoom(1);
      };
      overlay.querySelector('#mas-stage-setcam').onclick = () => {
        bridge.captureCameraAt(bridge.getTime());
        renderAllMAS();
      };
      overlay.querySelector('#mas-stage-fs').onclick = toggleMASFullscreen;
    }

    // 6. Enhance Transport Bar with Step Frame, Keyframe (K), and Record (R)
    const transport = document.querySelector('.transport');
    if (transport && !document.getElementById('mas-transport-kf')) {
      const kfBtn = document.createElement('button');
      kfBtn.type = 'button';
      kfBtn.id = 'mas-transport-kf';
      kfBtn.className = 'mas-btn sm mas-hide-mob';
      kfBtn.title = 'Add a keyframe at the playhead (K)';
      kfBtn.innerHTML = '◆ Keyframe';
      kfBtn.onclick = addKeyframeAtPlayhead;

      const recBtn = document.createElement('button');
      recBtn.type = 'button';
      recBtn.id = 'mas-transport-rec';
      recBtn.className = 'mas-btn sm mas-hide-mob';
      recBtn.title = 'Record: moves on preview become keyframes at playhead (R)';
      recBtn.innerHTML = '● Rec';
      recBtn.onclick = () => {
        MAS.recording = !MAS.recording;
        renderAllMAS();
      };

      transport.append(kfBtn, recBtn);
    }

    // 7. Enhance Export Dialog with Map Animation Studio Quality Cards & Server Render Option
    enhanceExportDialog(bridge);

    // 8. Global Map Animation Studio Keyboard Shortcuts (K, R, S, F11)
    window.addEventListener('keydown', e => {
      const tag = e.target?.tagName || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        addKeyframeAtPlayhead();
      } else if (!mod && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        MAS.recording = !MAS.recording;
        renderAllMAS();
      } else if (!mod && e.key.toLowerCase() === 's') {
        if (MAS.sel.kind === 'layer' && MAS.sel.i >= 0) {
          e.preventDefault();
          bridge.splitLayer(MAS.sel.i, bridge.getTime());
          renderAllMAS();
        }
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleMASFullscreen();
      } else if (e.key === 'Escape' && MAS.isFullscreen) {
        toggleMASFullscreen();
      }
    });

    // Periodic playhead sync during playback
    let lastT = -1;
    function syncLoop() {
      const t = bridge.getTime();
      if (Math.abs(t - lastT) > 0.01) {
        lastT = t;
        updateMASPlayheadOnly();
      }
      requestAnimationFrame(syncLoop);
    }
    requestAnimationFrame(syncLoop);

    checkServer();
    setInterval(checkServer, 10000);
    renderAllMAS();
  }

  function enhanceExportDialog(bridge) {
    const dlg = document.getElementById('dlgExport') || document.getElementById('dialog') || document.getElementById('hes-export-modal');
    if (!dlg || document.getElementById('mas-export-presets')) return;
    const body = dlg.querySelector('.dlg-body') || dlg;
    const box = document.createElement('div');
    box.id = 'mas-export-presets';
    box.className = 'mas-export-opts';
    const renderOpts = () => {
      box.innerHTML = EXPORT_QUALITIES.map(q => `
        <label class="mas-opt ${MAS.exportQuality === q.id ? 'sel' : ''}" data-mas-exq="${q.id}">
          <input type="radio" name="mas_ex_q" ${MAS.exportQuality === q.id ? 'checked' : ''} />
          <b>${esc(q.name)}</b>
          <small>${esc(q.desc)}</small>
        </label>
      `).join('');
      box.querySelectorAll('[data-mas-exq]').forEach(lbl => {
        lbl.onclick = () => {
          MAS.exportQuality = lbl.dataset.masExq;
          try { localStorage.setItem('mas:exportQuality', MAS.exportQuality); } catch {}
          // Sync underlying format/size selectors if present
          const sz = document.getElementById('exSize') || document.getElementById('exportHeight');
          const fmt = document.getElementById('exFormat') || document.getElementById('exportFormat');
          if (MAS.exportQuality === 'draft' && sz) {
            if ([...sz.options].some(o => o.value === '540')) sz.value = '540';
            else if ([...sz.options].some(o => o.value === '1280x720')) sz.value = '1280x720';
          } else if ((MAS.exportQuality === 'high' || MAS.exportQuality === 'max') && sz) {
            if ([...sz.options].some(o => o.value === '1080')) sz.value = '1080';
            else if ([...sz.options].some(o => o.value === '1920x1080')) sz.value = '1920x1080';
          }
          if (MAS.exportQuality === 'prores' && fmt) {
            if ([...fmt.options].some(o => o.value === 'sequence')) fmt.value = 'sequence';
          } else if (fmt && [...fmt.options].some(o => o.value === 'mp4')) {
            fmt.value = 'mp4';
          }
          renderOpts();
        };
      });
    };
    renderOpts();
    const firstField = body.querySelector('label, .field, .fields');
    if (firstField) firstField.parentNode.insertBefore(box, firstField);
    else body.prepend(box);
  }

  window.MASMount = { mountMASCutroom, evaluateCameraKeys };
})();

/* ============================================================================
   Part 4: Universal Studio Adapter & Renderer Keyframe Hook
   ============================================================================ */
(() => {
  'use strict';
  const { evaluateKeys } = window.MASKeyframes;
  const { mountMASCutroom, evaluateCameraKeys } = window.MASMount;
  const { renderAllMAS, updateMASPlayheadOnly, MAS } = window.MASCutroom;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
  const r3 = v => Math.round((+v || 0) * 1000) / 1000;
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);

  /* ---------- 1. Detective Board Studio Adapter (window.DB) ---------- */
  function buildDetectiveAdapter() {
    const DB = window.DB;
    if (!DB || !DB.app) return null;

    // Hook DB.renderer.render to evaluate per-node & per-edge keyframes at 60fps and during export
    if (DB.renderer && !DB.renderer.__masHooked) {
      DB.renderer.__masHooked = true;
      const origRender = DB.renderer.render;
      DB.renderer.render = function (ctx, project, time = 0, options = {}) {
        const saved = [];
        if (project && Array.isArray(project.nodes) && !options.editor) {
          for (const n of project.nodes) {
            if (Array.isArray(n.keys) && n.keys.length) {
              const local = time - (+n.enter || 0);
              const k = evaluateKeys(n.keys, local);
              if (k.active) {
                saved.push({
                  n,
                  x: n.x,
                  y: n.y,
                  w: n.w,
                  h: n.h,
                  rotation: n.rotation,
                  opacity: n.opacity,
                });
                n.x = (+n.x || 0) + k.x;
                n.y = (+n.y || 0) + k.y;
                n.w = Math.max(12, (+n.w || 240) * k.scale);
                n.h = Math.max(12, (+n.h || 200) * k.scale);
                n.rotation = (+n.rotation || 0) + k.rotate;
                n.opacity = clamp((n.opacity ?? 1) * k.opacity, 0, 1);
              }
            }
          }
        }
        try {
          return origRender.call(this, ctx, project, time, options);
        } finally {
          for (const s of saved) {
            s.n.x = s.x;
            s.n.y = s.y;
            s.n.w = s.w;
            s.n.h = s.h;
            s.n.rotation = s.rotation;
            s.n.opacity = s.opacity;
          }
        }
      };
    }

    // Wrap renderAll so MASCutroom updates whenever Detective Board UI updates
    const origRenderAll = DB.app.renderAll;
    DB.app.renderAll = function (...args) {
      const res = origRenderAll.apply(this, args);
      if (!window.__masUpdating) {
        window.__masUpdating = true;
        try { renderAllMAS(); } finally { window.__masUpdating = false; }
      }
      return res;
    };

    const getP = () => DB.app.project;
    const getDur = () => DB.duration(getP());

    return {
      id: 'detective-board-studio',
      getProject: getP,
      getTime: () => DB.app.time,
      setTime: t => DB.app.seek(t),
      isPlaying: () => DB.app.playing,
      play: () => { if (!DB.app.playing) DB.app.play(); },
      pause: () => DB.app.pause(),
      getDuration: getDur,
      setDuration: d => {
        const p = getP();
        if (!p.shots || !p.shots.length) { p.duration = d; return; }
        const cur = getDur();
        if (cur > 0) {
          const factor = d / cur;
          p.shots.forEach(s => { s.duration = r3(Math.max(0.2, s.duration * factor)); });
        }
        p.duration = DB.duration(p);
      },
      getLayers: () => {
        const p = getP();
        const total = getDur();
        const nodeLayers = (p.nodes || []).map((n, ni) => ({
          id: n.id,
          rawKind: 'node',
          rawIdx: ni,
          name: n.text || n.title || n.type || `Clue ${ni + 1}`,
          type: n.type,
          icon: ({ photo: '▣', note: '▤', document: '▧', newspaper: '▥', map: '⌖', fingerprint: '◉', folder: '▱', label: '▰', stamp: '▢', tape: '╱', circle: '◯', text: 'T', evidence: '◇', screen: '▣' })[n.type] || '◆',
          groupColor: n.type === 'map' ? 'map' : n.type === 'screen' ? 'scene' : 'screen',
          startSec: r3(+n.enter || 0),
          endSec: r3(n.exit != null ? +n.exit : total),
          hidden: Boolean(n.hidden),
          locked: Boolean(n.locked),
          group: n.group || '',
          isGroupMaster: Boolean(n.isGroupMaster),
          attachTo: n.attachTo || null,
          fx: n.fx || null,
          keys: n.keys || [],
          color: n.color || 'auto',
        }));
        const edgeLayers = (p.edges || []).map((e, ei) => {
          const fn = p.nodes.find(n => n.id === e.from)?.text || 'Clue A';
          const tn = p.nodes.find(n => n.id === e.to)?.text || 'Clue B';
          const st = +e.start || 0;
          const du = Math.max(0.2, +e.duration || 1.2);
          return {
            id: e.id,
            rawKind: 'edge',
            rawIdx: ei,
            name: e.label || `${fn} → ${tn}`,
            type: 'string',
            icon: '⤳',
            groupColor: 'map',
            startSec: r3(st),
            endSec: r3(st + du),
            hidden: Boolean(e.hidden),
            locked: false,
            group: e.group || 'Red Strings',
            isGroupMaster: false,
            attachTo: null,
            fx: null,
            keys: e.keys || [],
            color: e.color || '#b93534',
          };
        });
        return [...nodeLayers, ...edgeLayers];
      },
      updateLayer: (idx, patch) => {
        const p = getP();
        const nodeCount = (p.nodes || []).length;
        if (idx < nodeCount) {
          const n = p.nodes[idx];
          if (!n) return;
          if (patch.name !== undefined) n.text = patch.name;
          if (patch.startSec !== undefined) n.enter = r3(patch.startSec);
          if (patch.endSec !== undefined) n.exit = r3(patch.endSec);
          if (patch.hidden !== undefined) n.hidden = patch.hidden;
          if (patch.locked !== undefined) n.locked = patch.locked;
          if (patch.group !== undefined) n.group = patch.group;
          if (patch.attachTo !== undefined) n.attachTo = patch.attachTo;
          if (patch.fx !== undefined) n.fx = patch.fx;
          if (patch.keys !== undefined) n.keys = patch.keys;
          if (patch.color !== undefined && patch.color !== 'auto') n.color = patch.color;
        } else {
          const e = p.edges[idx - nodeCount];
          if (!e) return;
          if (patch.name !== undefined) e.label = patch.name;
          if (patch.startSec !== undefined) e.start = r3(patch.startSec);
          if (patch.endSec !== undefined) e.duration = r3(Math.max(0.1, patch.endSec - (+e.start || 0)));
          if (patch.hidden !== undefined) e.hidden = patch.hidden;
          if (patch.group !== undefined) e.group = patch.group;
          if (patch.color !== undefined && patch.color !== 'auto') e.color = patch.color;
        }
      },
      setSelectedLayer: idx => {
        const p = getP();
        if (idx >= 0 && idx < p.nodes.length) {
          DB.app.selectNode(p.nodes[idx].id);
        }
      },
      addLayer: (typeId, atSec, attachToId) => {
        const p = getP();
        if (typeId === 'string' && p.nodes.length >= 2) {
          const a = p.nodes[p.nodes.length - 2], b = p.nodes[p.nodes.length - 1];
          p.edges.push({ id: DB.util.uid('string'), from: a.id, to: b.id, color: '#b93534', width: 3, style: 'string', label: '', start: r3(atSec), duration: 1.5, sag: 0.1 });
        } else {
          DB.app.addNode(typeId || 'photo');
          const last = p.nodes[p.nodes.length - 1];
          if (last) {
            last.enter = r3(atSec);
            if (attachToId) {
              last.attachTo = attachToId;
              last.fx = { blend: 'overlay', hold: false, transIn: 'dissolve', tin: 0.3, transOut: 'dissolve', tout: 0.3 };
            }
          }
        }
      },
      splitLayer: (idx, atSec) => {
        const p = getP();
        if (idx < 0 || idx >= p.nodes.length) return;
        const n = p.nodes[idx];
        const end = n.exit != null ? +n.exit : getDur();
        if (atSec <= (+n.enter || 0) + 0.05 || atSec >= end - 0.05) return;
        const copy = DB.util.clone(n);
        copy.id = DB.util.uid('clue');
        copy.text = (n.text || 'Clue') + ' (part 2)';
        copy.enter = r3(atSec);
        copy.exit = r3(end);
        n.exit = r3(atSec);
        p.nodes.splice(idx + 1, 0, copy);
      },
      duplicateLayer: idx => {
        const p = getP();
        if (idx >= 0 && idx < p.nodes.length) {
          DB.app.selectNode(p.nodes[idx].id);
          DB.app.duplicate();
        }
      },
      deleteLayer: idx => {
        const p = getP();
        if (idx >= 0 && idx < p.nodes.length) {
          DB.app.selectNode(p.nodes[idx].id);
          DB.app.removeNode();
        } else if (idx >= p.nodes.length) {
          p.edges.splice(idx - p.nodes.length, 1);
        }
      },
      moveLayerZ: (idx, delta) => {
        const p = getP();
        const j = idx + delta;
        if (idx >= 0 && idx < p.nodes.length && j >= 0 && j < p.nodes.length) {
          [p.nodes[idx], p.nodes[j]] = [p.nodes[j], p.nodes[idx]];
          p.nodes.forEach((n, k) => { n.z = k + 1; });
        }
      },
      getCameraSpans: () => {
        const p = getP();
        let t = 0;
        return (p.shots || []).map((s, i) => {
          const d = Math.max(0.1, +s.duration || 4);
          const sp = { startSec: r3(t), endSec: r3(t + d), name: s.name || `Shot ${i + 1}` };
          t += d;
          return sp;
        });
      },
      getCameraKeys: () => {
        const p = getP();
        let t = 0;
        const out = [];
        (p.shots || []).forEach((s, i) => {
          out.push({
            t: r3(t),
            label: s.name || `Shot ${i + 1}`,
            x: s.to?.x ?? 1200,
            y: s.to?.y ?? 675,
            zoom: s.to?.zoom ?? 1,
            bearing: s.to?.rotation ?? 0,
            pitch: s.to?.tilt ?? 0,
            move: s.ease === 'linear' ? 'linear' : 'smooth',
            ease: s.ease || 'cinematic',
          });
          t += Math.max(0.1, +s.duration || 4);
        });
        return out;
      },
      selectCameraShot: idx => {
        DB.app.selectShot(idx);
      },
      addCameraKeyAt: () => {
        DB.app.addShot();
      },
      captureCameraAt: atSec => {
        const p = getP();
        const pose = DB.app.view || DB.renderer.cameraAt(p, atSec);
        if (p.shots && p.shots.length) {
          let t = 0, targetShot = p.shots[p.shots.length - 1];
          for (const s of p.shots) {
            if (atSec <= t + s.duration) { targetShot = s; break; }
            t += s.duration;
          }
          targetShot.to = { x: Math.round(pose.x), y: Math.round(pose.y), zoom: r3(pose.zoom), rotation: Math.round(pose.rotation || 0), tilt: Math.round(pose.tilt || 0) };
        }
      },
      updateCameraKey: (idx, patch) => {
        const p = getP();
        const s = p.shots?.[idx];
        if (!s) return;
        if (patch.zoom !== undefined) s.to.zoom = patch.zoom;
        if (patch.bearing !== undefined) s.to.rotation = patch.bearing;
        if (patch.pitch !== undefined) s.to.tilt = patch.pitch;
        if (patch.t !== undefined && idx > 0 && p.shots[idx - 1]) {
          const prevStart = p.shots.slice(0, idx - 1).reduce((a, c) => a + c.duration, 0);
          p.shots[idx - 1].duration = Math.max(0.2, r3(patch.t - prevStart));
        }
      },
      deleteCameraKey: idx => {
        const p = getP();
        if (p.shots && p.shots.length > 1) p.shots.splice(idx, 1);
      },
      resetCameraKeys: () => {
        DB.app.applyCamera('overview');
      },
      applyCameraPresetAt: (presetId) => {
        const map = { 'sky-to-ground': 'push', 'push-in': 'push', 'pull-back': 'pull', 'snap-zoom': 'macro', 'orbit-cw': 'orbit', 'orbit-ccw': 'orbit', 'tilt-reveal': 'reveal', 'crane-up': 'overview', 'drift-right': 'drift', 'whip-pan': 'whip', 'chase-cam': 'follow', 'handheld-doc': 'handheld' };
        DB.app.applyCamera(map[presetId] || presetId || 'push');
      },
      applyCameraToLayer: (layerIdx, presetId, moveLen) => {
        const p = getP();
        const n = p.nodes[layerIdx];
        if (!n) return;
        const from = p.shots.length ? DB.util.clone(p.shots[p.shots.length - 1].to) : { x: p.board.width / 2, y: p.board.height / 2, zoom: 1, rotation: 0, tilt: 0 };
        p.shots.push({
          id: DB.util.uid('shot'),
          name: `Focus: ${n.text || n.type}`,
          duration: Math.max(0.5, +moveLen || 4),
          ease: 'cinematic',
          preset: presetId || 'push',
          from,
          to: { x: n.x, y: n.y, zoom: 2.2, rotation: n.rotation || 0, tilt: presetId === 'tilt-reveal' ? 18 : 0 },
        });
      },
      getAddableTypes: () => [
        ...(DB.elementTypes || []).map(t => ({ id: t.id, name: t.name, desc: t.description, group: 'Evidence', icon: '▣' })),
        { id: 'string', name: 'Red String Link', desc: 'Connect two clues with red yarn', group: 'Connections', icon: '⤳' },
      ],
      getQuickBuilders: () => [
        {
          name: 'Zoom into Selected Clue',
          desc: 'Adds a dramatic push-in camera shot onto the selected clue',
          run: () => {
            const p = getP();
            const n = p.nodes.find(x => x.id === DB.app.selected) || p.nodes[0];
            if (n) {
              const from = p.shots.length ? DB.util.clone(p.shots[p.shots.length - 1].to) : { x: 1200, y: 675, zoom: 1, rotation: 0, tilt: 0 };
              p.shots.push({ id: DB.util.uid('shot'), name: `Zoom → ${n.text || 'Clue'}`, duration: 3.5, ease: 'cinematic', preset: 'push', from, to: { x: n.x, y: n.y, zoom: 2.45, rotation: n.rotation || 0, tilt: 8 } });
              DB.app.renderAll();
            }
          },
        },
        {
          name: 'Connect Last 2 Clues (Red String)',
          desc: 'Pins a red investigation string between the latest two clues',
          run: at => {
            const p = getP();
            if (p.nodes.length >= 2) {
              const a = p.nodes[p.nodes.length - 2], b = p.nodes[p.nodes.length - 1];
              p.edges.push({ id: DB.util.uid('string'), from: a.id, to: b.id, color: '#b93534', width: 3.2, style: 'string', label: 'LINKED', start: r3(at), duration: 1.2, sag: 0.12 });
              DB.app.renderAll();
            }
          },
        },
        {
          name: 'Pin Evidence Cluster (3 Clues)',
          desc: 'Drops a Polaroid photo, sticky note, and classified stamp linked by string',
          run: at => {
            const p = getP();
            DB.app.addNode('photo');
            const n1 = p.nodes[p.nodes.length - 1];
            n1.enter = r3(at); n1.group = 'Evidence Cluster';
            DB.app.addNode('note');
            const n2 = p.nodes[p.nodes.length - 1];
            n2.x = n1.x + 250; n2.y = n1.y + 40; n2.enter = r3(at + 0.4); n2.group = 'Evidence Cluster';
            p.edges.push({ id: DB.util.uid('string'), from: n1.id, to: n2.id, color: '#b93534', width: 3, style: 'string', label: 'EVIDENCE', start: r3(at + 0.7), duration: 1.0, sag: 0.1 });
            DB.app.renderAll();
          },
        },
        {
          name: 'Full Investigation Camera Tour',
          desc: 'Builds a continuous camera sequence visiting every clue on the board',
          run: () => {
            DB.app.applyCamera('travel');
          },
        },
      ],
      getMediaList: () => {
        const p = getP();
        return Object.entries(p.media || {}).map(([id, m]) => ({
          id,
          name: m.name || id,
          kind: m.kind || 'image',
          src: m.dataUrl || m.url || m.path || '',
        }));
      },
      uploadMedia: async files => {
        await DB.app.importMedia(files);
      },
      useMedia: (id, asNewLayer) => {
        const p = getP();
        const m = p.media?.[id];
        if (!m) return;
        if (asNewLayer || !DB.app.selected) {
          DB.app.addNode(m.kind === 'video' ? 'screen' : 'photo', id);
        } else {
          const n = p.nodes.find(x => x.id === DB.app.selected);
          if (n) n.media = id;
        }
        DB.app.renderAll();
      },
      fitStage: () => DB.app.fitStage(),
      changed: full => {
        const p = getP();
        p.duration = DB.duration(p);
        if (full) DB.app.renderAll();
        else DB.app.draw();
      },
    };
  }

  /* ---------- 2. Timeline Animation Studio Adapter (window.TL) ---------- */
  function buildTimelineStudioAdapter() {
    const TL = window.TL;
    if (!TL || !TL.app) return null;

    if (TL.renderer && !TL.renderer.__masHooked) {
      TL.renderer.__masHooked = true;
      const origRender = TL.renderer.render;
      TL.renderer.render = function (ctx, project, time = 0, options = {}) {
        const saved = [];
        if (project && Array.isArray(project.events) && !options.editor) {
          for (const ev of project.events) {
            if (Array.isArray(ev.keys) && ev.keys.length) {
              const k = evaluateKeys(ev.keys, time - (+ev.start || 0));
              if (k.active) {
                saved.push({ ev, ox: ev.offsetX, oy: ev.offsetY });
                ev.offsetX = (+ev.offsetX || 0) + k.x;
                ev.offsetY = (+ev.offsetY || 0) + k.y;
              }
            }
          }
        }
        try {
          return origRender.call(this, ctx, project, time, options);
        } finally {
          for (const s of saved) {
            s.ev.offsetX = s.ox;
            s.ev.offsetY = s.oy;
          }
        }
      };
    }

    const origRefresh = TL.app.refresh;
    TL.app.refresh = function (...args) {
      const res = origRefresh.apply(this, args);
      if (!window.__masUpdating) {
        window.__masUpdating = true;
        try { renderAllMAS(); } finally { window.__masUpdating = false; }
      }
      return res;
    };

    const getP = () => TL.app.project;
    const getDur = () => TL.duration(getP());

    return {
      id: 'timeline-animation-studio',
      getProject: getP,
      getTime: () => TL.app.time,
      setTime: t => { TL.app.time = t; },
      isPlaying: () => Boolean(TL.app.state?.playing),
      play: () => { if (!TL.app.state?.playing) TL.app.play(); },
      pause: () => TL.app.pause(),
      getDuration: getDur,
      setDuration: d => {
        const p = getP();
        p.duration = clamp(r3(d), 1, 600);
      },
      getLayers: () => {
        const p = getP();
        return (p.events || []).map((ev, i) => {
          const st = +ev.start || 0;
          const hold = Math.max(0.3, +(ev.cameraHold ?? ev.duration) || 2.5);
          return {
            id: ev.id,
            name: `${ev.date ? ev.date + ' · ' : ''}${ev.title || 'Milestone ' + (i + 1)}`,
            type: 'event',
            icon: '◆',
            groupColor: ev.lane === 1 ? 'map' : ev.lane === 2 ? 'audio' : ev.lane === 3 ? 'scene' : 'screen',
            startSec: r3(st),
            endSec: r3(st + hold),
            hidden: Boolean(ev.hidden),
            locked: Boolean(ev.locked),
            group: ev.group || '',
            isGroupMaster: Boolean(ev.isGroupMaster),
            attachTo: ev.attachTo || null,
            fx: ev.fx || null,
            keys: ev.keys || [],
            color: ev.color || 'auto',
          };
        });
      },
      updateLayer: (idx, patch) => {
        const p = getP();
        const ev = p.events?.[idx];
        if (!ev) return;
        if (patch.name !== undefined) ev.title = patch.name.replace(/^[^·]+·\s*/, '');
        if (patch.startSec !== undefined) ev.start = r3(patch.startSec);
        if (patch.endSec !== undefined) {
          const len = Math.max(0.2, r3(patch.endSec - (+ev.start || 0)));
          ev.cameraHold = len;
          ev.duration = len;
        }
        if (patch.hidden !== undefined) ev.hidden = patch.hidden;
        if (patch.locked !== undefined) ev.locked = patch.locked;
        if (patch.group !== undefined) ev.group = patch.group;
        if (patch.attachTo !== undefined) ev.attachTo = patch.attachTo;
        if (patch.fx !== undefined) ev.fx = patch.fx;
        if (patch.keys !== undefined) ev.keys = patch.keys;
        if (patch.color !== undefined && patch.color !== 'auto') ev.color = patch.color;
      },
      setSelectedLayer: idx => {
        const ev = getP().events?.[idx];
        if (ev) TL.app.select(ev.id);
      },
      addLayer: (_typeId, atSec, attachToId) => {
        TL.app.actions.add();
        const p = getP();
        const last = p.events[p.events.length - 1];
        if (last) {
          last.start = r3(atSec);
          if (attachToId) last.attachTo = attachToId;
        }
      },
      splitLayer: (idx, atSec) => {
        const p = getP();
        const ev = p.events?.[idx];
        if (!ev) return;
        const st = +ev.start || 0;
        const hold = Math.max(0.4, +(ev.cameraHold ?? ev.duration) || 2.5);
        if (atSec <= st + 0.1 || atSec >= st + hold - 0.1) return;
        const copy = TL.util.clone(ev);
        copy.id = TL.util.uid();
        copy.title = (ev.title || 'Event') + ' II';
        copy.start = r3(atSec);
        copy.cameraHold = r3(st + hold - atSec);
        ev.cameraHold = r3(atSec - st);
        p.events.splice(idx + 1, 0, copy);
      },
      duplicateLayer: idx => {
        const ev = getP().events?.[idx];
        if (ev) {
          TL.app.select(ev.id);
          TL.app.actions.duplicate();
        }
      },
      deleteLayer: idx => {
        const ev = getP().events?.[idx];
        if (ev) {
          TL.app.select(ev.id);
          TL.app.actions.delete();
        }
      },
      moveLayerZ: (idx, delta) => {
        const ev = getP().events?.[idx];
        if (ev) {
          TL.app.select(ev.id);
          if (delta < 0) TL.app.actions.earlier();
          else TL.app.actions.later();
        }
      },
      getCameraSpans: () => {
        const p = getP();
        if (!TL.timingData) return [];
        return TL.timingData(p).map(x => ({
          startSec: r3(x.start),
          endSec: r3(x.holdEnd),
          name: `${x.e.date} (${x.hold.toFixed(1)}s)`,
        }));
      },
      getCameraKeys: () => {
        const p = getP();
        return (p.events || []).map(e => ({
          t: r3(+e.start || 0),
          label: `${e.date} · ${e.title}`,
          x: +e.offsetX || 0,
          y: +e.offsetY || 0,
          zoom: +(e.cameraZoom ?? p.camera?.zoom ?? 1),
          bearing: +(p.camera?.rotation || 0),
          pitch: 0,
          move: 'smooth',
          ease: p.animation?.ease || 'cinematic',
        }));
      },
      selectCameraShot: idx => {
        const ev = getP().events?.[idx];
        if (ev) TL.app.select(ev.id);
      },
      addCameraKeyAt: atSec => {
        TL.app.actions.add();
        const p = getP();
        const last = p.events[p.events.length - 1];
        if (last) last.start = r3(atSec);
      },
      updateCameraKey: (idx, patch) => {
        const ev = getP().events?.[idx];
        if (!ev) return;
        if (patch.t !== undefined) ev.start = r3(patch.t);
        if (patch.zoom !== undefined) ev.cameraZoom = patch.zoom;
      },
      deleteCameraKey: idx => {
        const ev = getP().events?.[idx];
        if (ev && getP().events.length > 1) {
          TL.app.select(ev.id);
          TL.app.actions.delete();
        }
      },
      resetCameraKeys: () => {
        TL.app.autoTiming();
      },
      getAddableTypes: () => [
        { id: 'event', name: 'Chronology Milestone', desc: 'Date, headline, photo & camera stop', group: 'Timeline', icon: '◆' },
        ...(TL.documentaryTemplates || []).slice(0, 8).map(t => ({ id: `tpl:${t.id}`, name: t.name, desc: t.family, group: 'Documentary', icon: '▤' })),
      ],
      getQuickBuilders: () => [
        { name: 'Auto-Rebuild Camera Timing', desc: 'Spreads all milestone arrivals and camera holds evenly', run: () => TL.app.actions.autoTiming() },
        { name: 'Sort Milestones Chronologically', desc: 'Orders all events by numeric calendar value and retimes', run: () => TL.app.actions.sortDates() },
        { name: 'Add 3 Historical Era Stops', desc: 'Inserts a 3-part sequence of milestones at the playhead', run: at => {
          for (let k = 0; k < 3; k++) {
            TL.app.actions.add();
            const ev = getP().events[getP().events.length - 1];
            if (ev) { ev.start = r3(at + k * 2.5); ev.group = 'Era Sequence'; }
          }
          TL.app.refresh();
        }},
      ],
      getMediaList: () => {
        const p = getP();
        return Object.entries(p.media || {}).map(([id, m]) => ({
          id,
          name: m.name || id,
          kind: m.kind || 'image',
          src: m.dataUrl || m.url || '',
        }));
      },
      uploadMedia: async files => {
        for (const f of files) {
          if (f.type.startsWith('video/')) await TL.app.importBackdrop(f);
          else await TL.app.importPhoto(f);
        }
      },
      useMedia: (id, asNewLayer) => {
        const p = getP();
        if (asNewLayer) TL.app.actions.add();
        const ev = p.events.find(e => e.id === TL.app.state.selected) || p.events[0];
        if (ev) ev.media = id;
        TL.app.refresh();
      },
      changed: () => TL.app.refresh(),
    };
  }

  /* ---------- 3. Generic Clip/Shot/Scene/Layer Studio Adapter (for the other 11 studios) ---------- */
  function buildGenericStudioAdapter() {
    const B = window.__MAS_BRIDGE_STATE;
    if (!B) return null;

    // Hook engine render if available
    if (B.engine && B.engine.render && !B.engine.__masHooked) {
      B.engine.__masHooked = true;
      const origRender = B.engine.render;
      B.engine.render = function (ctx, proj, t, opts = {}) {
        const camKeys = proj?.masCameraKeys;
        const cam = Array.isArray(camKeys) && camKeys.length > 1 ? evaluateCameraKeys(camKeys, t) : null;
        const arr = proj?.clips || proj?.shots || proj?.scenes || proj?.layers || [];
        let activeKf = null;
        let curT = 0;
        for (const item of arr) {
          const d = Math.max(0.1, +(item.dur ?? item.duration) || 4);
          const s0 = item.start !== undefined ? (+item.start || 0) : curT;
          if (t >= s0 && t <= s0 + d && Array.isArray(item.keys) && item.keys.length) {
            const k = evaluateKeys(item.keys, t - s0);
            if (k.active) { activeKf = k; break; }
          }
          curT += d;
        }
        const hasCam = Boolean(cam && (Math.abs((cam.zoom ?? 1) - 1) > 0.005 || Math.abs(cam.x || 0) > 0.5 || Math.abs(cam.y || 0) > 0.5 || Math.abs(cam.bearing || 0) > 0.1 || Math.abs(cam.pitch || 0) > 0.1));
        const hasKf = Boolean(activeKf);
        if ((hasCam || hasKf) && ctx) {
          const W = opts.W || proj.width || proj.w || ctx.canvas.width;
          const H = opts.H || proj.height || proj.h || ctx.canvas.height;
          ctx.save();
          if (hasCam) {
            ctx.translate(W / 2 + (cam.x || 0), H / 2 + (cam.y || 0));
            ctx.rotate(((cam.bearing || 0) * Math.PI) / 180);
            const sy = Math.max(0.5, Math.cos(((cam.pitch || 0) * Math.PI) / 180));
            ctx.scale(cam.zoom ?? 1, (cam.zoom ?? 1) * sy);
            ctx.translate(-W / 2, -H / 2);
          }
          if (hasKf) {
            ctx.globalAlpha *= clamp(activeKf.opacity ?? 1, 0, 1);
            ctx.translate(W / 2 + (activeKf.x || 0), H / 2 + (activeKf.y || 0));
            ctx.rotate(((activeKf.rotate || 0) * Math.PI) / 180);
            ctx.scale(activeKf.scale ?? 1, activeKf.scale ?? 1);
            ctx.translate(-W / 2, -H / 2);
          }
          try {
            return origRender.call(this, ctx, proj, t, opts);
          } finally {
            ctx.restore();
          }
        }
        return origRender.call(this, ctx, proj, t, opts);
      };
    }

    const getItemsArray = p => {
      if (!p) return [];
      return p.clips || p.shots || p.scenes || p.layers || [];
    };

    const getDur = () => {
      const p = B.getProject();
      if (!p) return 10;
      if (B.getDuration) return Math.max(0.5, +B.getDuration() || 10);
      if (p.duration) return +p.duration;
      const arr = getItemsArray(p);
      return Math.max(1, arr.reduce((s, x) => s + (+x.dur || +x.duration || 4), 0));
    };

    return {
      id: B.id || 'studio-pro',
      getProject: () => B.getProject(),
      getTime: () => +B.getTime() || 0,
      setTime: t => B.setTime(t),
      isPlaying: () => Boolean(B.isPlaying()),
      play: () => B.play(),
      pause: () => B.pause(),
      getDuration: getDur,
      setDuration: d => {
        const p = B.getProject();
        if (!p) return;
        if ('duration' in p) p.duration = r3(d);
        const arr = getItemsArray(p);
        if (arr.length) {
          const cur = arr.reduce((s, x) => s + (+x.dur || +x.duration || 4), 0);
          if (cur > 0) {
            const scale = d / cur;
            arr.forEach(x => {
              if ('dur' in x) x.dur = r3(Math.max(0.2, x.dur * scale));
              else if ('duration' in x) x.duration = r3(Math.max(0.2, x.duration * scale));
            });
          }
        }
        B.changed(true);
      },
      getLayers: () => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        const total = getDur();
        let cursor = 0;
        const mainLayers = arr.map((item, idx) => {
          const isExplicitSpan = item.start !== undefined && p.layers === arr;
          const dur = Math.max(0.2, +(item.dur ?? item.duration ?? (total - (+item.start || 0))) || 4);
          const s0 = isExplicitSpan ? (+item.start || 0) : (item.masStartSec != null ? +item.masStartSec : cursor);
          const e0 = isExplicitSpan ? s0 + dur : s0 + dur;
          cursor += dur;
          const label = item.name || item.label || item.title || item.preset || item.fx || item.chart || item.el || `Track ${idx + 1}`;
          return {
            id: item.id || (item.id = uid('layer')),
            rawIdx: idx,
            name: String(label),
            type: item.preset || item.fx || item.chart || item.el || 'layer',
            icon: '▣',
            groupColor: idx % 3 === 0 ? 'screen' : idx % 3 === 1 ? 'scene' : 'map',
            startSec: r3(s0),
            endSec: r3(e0),
            hidden: Boolean(item.hidden || item.on === false),
            locked: Boolean(item.locked),
            group: item.group || '',
            isGroupMaster: Boolean(item.isGroupMaster),
            attachTo: item.attachTo || null,
            fx: item.masFx || null,
            keys: item.keys || [],
            color: item.color || 'auto',
          };
        });
        // If studio also has proj.overlays (e.g. Hook Editor Studio), include them as overlay tracks!
        if (Array.isArray(p?.overlays)) {
          p.overlays.forEach((ov, oi) => {
            mainLayers.push({
              id: ov.id || (ov.id = uid('ov')),
              rawKind: 'overlay',
              rawIdx: oi,
              name: ov.text || ov.type || `Overlay ${oi + 1}`,
              type: ov.type || 'overlay',
              icon: 'T',
              groupColor: 'screen',
              startSec: r3(+ov.start || 0),
              endSec: r3((+ov.start || 0) + Math.max(0.2, +ov.dur || 2.5)),
              hidden: Boolean(ov.hidden),
              locked: false,
              group: ov.group || 'Overlays',
              isGroupMaster: false,
              attachTo: ov.attachTo || null,
              fx: ov.masFx || null,
              keys: ov.keys || [],
              color: ov.color || '#f0a93b',
            });
          });
        }
        return mainLayers;
      },
      updateLayer: (idx, patch) => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        if (idx < arr.length) {
          const item = arr[idx];
          if (!item) return;
          if (patch.name !== undefined) {
            if ('label' in item) item.label = patch.name;
            else if ('title' in item) item.title = patch.name;
            else item.name = patch.name;
          }
          if (patch.startSec !== undefined) {
            if ('start' in item) item.start = r3(patch.startSec);
            item.masStartSec = r3(patch.startSec);
          }
          if (patch.endSec !== undefined) {
            const s0 = item.start !== undefined ? (+item.start || 0) : (item.masStartSec ?? 0);
            const newDur = Math.max(0.2, r3(patch.endSec - s0));
            if ('dur' in item) item.dur = newDur;
            else if ('duration' in item) item.duration = newDur;
          }
          if (patch.hidden !== undefined) {
            item.hidden = patch.hidden;
            if ('on' in item) item.on = !patch.hidden;
          }
          if (patch.locked !== undefined) item.locked = patch.locked;
          if (patch.group !== undefined) item.group = patch.group;
          if (patch.attachTo !== undefined) item.attachTo = patch.attachTo;
          if (patch.fx !== undefined) item.masFx = patch.fx;
          if (patch.keys !== undefined) item.keys = patch.keys;
          if (patch.color !== undefined && patch.color !== 'auto') item.color = patch.color;
        } else if (Array.isArray(p?.overlays)) {
          const ov = p.overlays[idx - arr.length];
          if (!ov) return;
          if (patch.name !== undefined) ov.text = patch.name;
          if (patch.startSec !== undefined) ov.start = r3(patch.startSec);
          if (patch.endSec !== undefined) ov.dur = Math.max(0.2, r3(patch.endSec - (+ov.start || 0)));
          if (patch.hidden !== undefined) ov.hidden = patch.hidden;
          if (patch.group !== undefined) ov.group = patch.group;
          if (patch.keys !== undefined) ov.keys = patch.keys;
        }
      },
      setSelectedLayer: idx => {
        if (B.selectLayer) B.selectLayer(idx);
      },
      addLayer: (typeId, atSec, attachToId) => {
        if (B.addLayer) B.addLayer(typeId, atSec, attachToId);
        else {
          const p = B.getProject();
          const arr = getItemsArray(p);
          if (arr.length) {
            const copy = JSON.parse(JSON.stringify(arr[arr.length - 1]));
            copy.id = uid('item');
            if ('start' in copy) copy.start = r3(atSec);
            if (attachToId) copy.attachTo = attachToId;
            arr.push(copy);
          }
        }
      },
      splitLayer: (idx, atSec) => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        if (idx < 0 || idx >= arr.length) return;
        const layers = window.__MAS_STUDIO_BRIDGE.getLayers();
        const l = layers[idx];
        if (!l || atSec <= l.startSec + 0.1 || atSec >= l.endSec - 0.1) return;
        const item = arr[idx];
        const d1 = r3(atSec - l.startSec);
        const d2 = r3(l.endSec - atSec);
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = uid('split');
        if ('dur' in item) { item.dur = d1; copy.dur = d2; }
        else if ('duration' in item) { item.duration = d1; copy.duration = d2; }
        if ('start' in copy) copy.start = r3(atSec);
        copy.masStartSec = r3(atSec);
        arr.splice(idx + 1, 0, copy);
      },
      duplicateLayer: idx => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        if (idx >= 0 && idx < arr.length) {
          const copy = JSON.parse(JSON.stringify(arr[idx]));
          copy.id = uid('copy');
          arr.splice(idx + 1, 0, copy);
        }
      },
      deleteLayer: idx => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        if (idx >= 0 && idx < arr.length && arr.length > 1) {
          arr.splice(idx, 1);
        } else if (idx >= arr.length && Array.isArray(p?.overlays)) {
          p.overlays.splice(idx - arr.length, 1);
        }
      },
      moveLayerZ: (idx, delta) => {
        const p = B.getProject();
        const arr = getItemsArray(p);
        const j = idx + delta;
        if (idx >= 0 && idx < arr.length && j >= 0 && j < arr.length) {
          [arr[idx], arr[j]] = [arr[j], arr[idx]];
          if (B.selectLayer) B.selectLayer(j);
        }
      },
      getAddableTypes: () => (B.getAddableTypes ? B.getAddableTypes() : [{ id: 'default', name: 'New Studio Layer / Clip', desc: 'Add to timeline at playhead', group: 'Studio', icon: '＋' }]),
      getQuickBuilders: () => (B.getQuickBuilders ? B.getQuickBuilders() : [
        { name: 'Add Layer at Playhead', desc: 'Inserts a new animated clip/shot at the current playhead', run: at => window.__MAS_STUDIO_BRIDGE.addLayer('default', at, null) },
        { name: 'Cinematic Push-In Camera', desc: 'Adds a smooth 4-second push-in camera move at playhead', run: at => window.__MAS_STUDIO_BRIDGE.applyCameraPresetAt('push-in', at, 4) },
        { name: 'Pop-In Keyframe Animation', desc: 'Applies Pop-In keyframes to the currently selected layer', run: () => {
          const layers = window.__MAS_STUDIO_BRIDGE.getLayers();
          const idx = MAS.sel.kind === 'layer' && layers[MAS.sel.i] ? MAS.sel.i : 0;
          if (layers[idx]) window.__MAS_STUDIO_BRIDGE.updateLayer(idx, { keys: window.MASKeyframes.makePresetKeys('pop', layers[idx].endSec - layers[idx].startSec) });
        }},
      ]),
      getMediaList: () => (B.getMediaList ? B.getMediaList() : []),
      uploadMedia: async files => { if (B.uploadMedia) await B.uploadMedia(files); },
      useMedia: (id, asNewLayer) => { if (B.useMedia) B.useMedia(id, asNewLayer); },
      changed: full => {
        B.changed(full);
        if (!window.__masUpdating) {
          window.__masUpdating = true;
          try { renderAllMAS(); } finally { window.__masUpdating = false; }
        }
      },
    };
  }

  function bootMAS() {
    if (window.__HEADLESS) return;
    let host = null;
    if (window.DB && window.DB.app) host = buildDetectiveAdapter();
    else if (window.TL && window.TL.app) host = buildTimelineStudioAdapter();
    else if (window.__MAS_BRIDGE_STATE) host = buildGenericStudioAdapter();

    if (!host) return;
    window.__MAS_HOST = host;
    mountMASCutroom();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(bootMAS, 60));
  } else {
    setTimeout(bootMAS, 60);
  }
  window.__bootMAS = bootMAS;
})();
