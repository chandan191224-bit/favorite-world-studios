// Offline operations screens and camera overlays. All motion is a pure function of the shot clock and seed.
(() => {
  'use strict';
  const U = SM.util, F = SM.font, C = SM.chrome, P = SM.content.P;
  const register = def => SM.content.register(def);
  const memo = new Map();
  function cached(key, make) {
    if (memo.has(key)) return memo.get(key);
    if (memo.size >= 48) memo.delete(memo.keys().next().value);
    const value = make(); memo.set(key, value); return value;
  }
  function text(g, s, x, y, size = 18, color = '#e9f2ef', weight = 400, align = 'left', max) {
    g.font = F(weight, size, 'mono'); g.fillStyle = color;
    g.textBaseline = 'middle'; g.textAlign = align;
    if (max > 0) g.fillText(String(s), x, y, max); else g.fillText(String(s), x, y);
  }
  function line(g, x, y, x2, y2, color = '#4b615b', width = 1) {
    g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
  }
  function box(g, x, y, w, h, fill, stroke, r = 0) {
    U.rr(g, x, y, w, h, r);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  }
  function clip(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); g.clip(); }
  function wrapped(g, value, width, size, kind = 'mono') {
    const key = JSON.stringify(['wrap', value, Math.round(width), size, kind]);
    return cached(key, () => {
      g.font = F(400, size, kind);
      // Split long identifiers too; preserve Hindi grapheme clusters.
      const rows = [];
      for (const row of U.wrap(g, value, Math.max(10, width))) {
        if (g.measureText(row).width <= width) { rows.push(row); continue; }
        let part = '';
        for (const ch of U.graphemes(row)) {
          if (part && g.measureText(part + ch).width > width) { rows.push(part); part = ''; }
          part += ch;
        }
        rows.push(part);
      }
      return rows;
    });
  }
  function media(env, key = 'media') { return env.media(key); }
  function badge(g, label, x, y, w, color = '#b8c5bf', fill = '#26312d', size = 12) {
    box(g, x, y, w, 27, fill, color, 3); text(g, label, x + w / 2, y + 14, size, color, 600, 'center', w - 12);
  }
  function battery(g, x, y, level = 0.78, color = '#ecf7ef', scale = 1) {
    g.save(); g.translate(x, y); g.scale(scale, scale);
    box(g, 0, 0, 34, 16, null, color, 1);
    g.fillStyle = color; g.fillRect(35, 5, 3, 6); g.fillRect(3, 3, 28 * U.clamp(level), 10); g.restore();
  }
  function rec(g, x, y, env, size = 18, color = '#f1f7f2') {
    if (Math.floor(env.t * 2) % 2 === 0) {
      g.fillStyle = '#ff5753'; g.beginPath(); g.arc(x + size * 0.27, y, size * 0.27, 0, Math.PI * 2); g.fill();
    }
    text(g, 'REC', x + size, y, size, color, 600);
  }
  function vignette(g, W, H, strength = 0.7) {
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.16, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  function noiseTiles(seed) {
    return cached('noise:' + seed, () => {
      const R = U.rng(seed), tiles = [];
      for (let k = 0; k < 4; k++) {
        const c = U.canvas(96, 96), ctx = c.getContext('2d'), d = ctx.createImageData(96, 96);
        for (let i = 0; i < d.data.length; i += 4) {
          const n = Math.floor(R() * 256);
          d.data[i] = d.data[i + 1] = d.data[i + 2] = n; d.data[i + 3] = 255;
        }
        ctx.putImageData(d, 0, 0); tiles.push(c);
      }
      return tiles;
    });
  }
  function surveillance(g, env, W, H, slot, tint = 'green', seed = env.seed) {
    C.drawCover(g, slot, 0, 0, W, H, { seed, label: false });
    g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); g.restore();
    if (tint !== 'none') {
      g.fillStyle = tint === 'blue' ? 'rgba(40,105,175,.22)' : 'rgba(40,122,72,.21)'; g.fillRect(0, 0, W, H);
    }
    const frame = Math.floor(env.t * (env.fps || 30) / 2);
    const tile = noiseTiles(seed)[((frame % 4) + 4) % 4];
    g.save(); g.globalAlpha = 0.075; g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    g.fillStyle = 'rgba(0,0,0,.13)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    const tick = Math.floor(env.t * 6);
    if (U.h1(tick, seed) > 0.88) {
      const y = U.h1(tick + 31, seed) * H, h = Math.max(3, H * 0.025);
      g.save(); clip(g, 0, y, W, h); g.translate((U.h1(tick + 93, seed) - 0.5) * 22, 0);
      C.drawCover(g, slot, 0, 0, W, H, { seed, label: false }); g.restore();
      g.fillStyle = 'rgba(199,235,212,.12)'; g.fillRect(0, y, W, 1);
    }
    vignette(g, W, H, 0.66);
  }
  function cctvLabels(g, env, W, H, cam, clock, date, small = false) {
    const pad = small ? Math.max(10, W * 0.035) : (env.tall ? 24 : 40);
    const size = small ? Math.max(11, Math.min(W, H) * 0.055) : (env.tall ? 16 : 22);
    g.save(); g.shadowColor = '#000'; g.shadowBlur = 3;
    text(g, cam, pad, pad + size / 2, size, '#e4f5e6', 600, 'left', W * 0.6);
    rec(g, W - pad - size * 3.2, pad + size / 2, env, size * 0.85);
    text(g, date, pad, H - pad - size * 1.35, size * 0.8, '#e4f5e6');
    text(g, U.clock(clock, env.t), pad, H - pad, size, '#e4f5e6', 600);
    text(g, 'CH / SECURE', W - pad, H - pad, size * 0.65, '#c2d1c5', 400, 'right'); g.restore();
  }
  const mediaParam = () => P.media('media', 'Photo / video');
  const hudParam = () => P.bool('hudOnly', 'HUD only (transparent)', false);
  const clockParams = () => [P.text('date', 'Date', '2026-10-21'), P.text('clock', 'Start clock', '21:47:05')];

  // Terminal timeline is precomputed, including the per-character pauses, for stable backwards scrubbing.
  function terminalState(env) {
    const p = env.P;
    const key = JSON.stringify(['terminal', p.lines, p.prompt, p.speed, env.seed, env.dur]);
    const script = cached(key, () => {
      const R = U.rng(env.seed), speed = Math.max(4, +p.speed || 32); let at = 0;
      const rows = String(p.lines || '').split('\n').map(raw => {
        const typed = raw.startsWith('$ '), tag = raw.trim();
        const type = tag === '[bar]' ? 'bar' : tag === '[grant]' ? 'grant' : tag === '[deny]' ? 'deny' : 'text';
        const content = typed ? String(p.prompt || '$') + ' ' + raw.slice(2) : raw;
        const chars = U.graphemes(content), times = []; const start = at;
        if (typed) for (let i = 0; i < chars.length; i++) {
          at += (0.65 + R() * 0.8 + (/[ ./]/.test(chars[i]) ? R() * 0.6 : 0)) / speed; times.push(at);
        }
        else at += type === 'bar' ? 1.15 : type === 'grant' || type === 'deny' ? 0.6 : 0.11;
        const end = at; at += typed ? 0.22 : 0.08;
        return { type, content, chars, times, typed, start, end };
      });
      // Long scripts still finish before the shot ends. Short scripts keep their natural typing speed.
      const scale = Math.min(1, Math.max(0.05, env.dur * 0.88) / Math.max(0.01, at));
      return { rows, scale };
    });
    const time = Math.max(0, env.t - 0.1) / script.scale;
    return { script, time };
  }
  function terminalLayout(g, env) {
    const size = env.tall ? 16 : 23, lh = size * 1.65, pad = env.tall ? 24 : 46;
    const { script, time } = terminalState(env), rows = [];
    let y = 102;
    for (const row of script.rows) {
      if (time < row.start) break;
      const h = row.type === 'grant' || row.type === 'deny' ? lh * 3.6 : lh;
      let count = row.chars.length;
      if (row.typed) { count = 0; while (count < row.times.length && row.times[count] <= time) count++; }
      const value = row.chars.slice(0, count).join('');
      const parts = row.type === 'text' ? wrapped(g, value, env.W - pad * 2, size) : [''];
      const item = { ...row, y, h: h * parts.length, value, parts, active: time < row.end, progress: U.range(time, row.start, row.end) };
      rows.push(item); y += item.h;
    }
    const scroll = Math.max(0, y - (env.H - 64));
    return { rows, size, lh, pad, scroll, y };
  }
  register({
    id: 'terminal', name: 'Archive terminal', family: 'ops', icon: '⌨', browser: null,
    params: [
      P.textarea('lines', 'Terminal lines', '$ connect archive.local\nSecure connection established.\n$ authenticate --key operator\n[bar]\nIdentity verified. Session encrypted.\n$ open dossier_047\nअभिलेख सफलतापूर्वक खोला गया।\n[grant]'),
      P.select('theme', 'Phosphor', ['green', 'amber', 'white', 'blue'], 'green'),
      P.text('prompt', 'Command prompt', '$'), P.range('speed', 'Typing speed', 8, 100, 1, 32),
      P.bool('rain', 'Subtle code rain', true), P.text('title', 'Window title', 'ARCHIVE / SECURE SHELL'),
    ],
    focus(env) {
      // Use a scratch context so focus and draw share exactly the same wrapped last-line geometry.
      const g = U.tmp('ops-focus', 1, 1).getContext('2d'), l = terminalLayout(g, env), last = l.rows[l.rows.length - 1];
      return { x: l.pad, y: U.clamp(last ? last.y - l.scroll - l.size : 85, 62, env.H - 100), w: env.W - l.pad * 2, h: Math.min(last ? last.h : l.lh, env.H - 100) };
    },
    draw(g, env) {
      const { W, H, P: p } = env, color = ({ green: '#8ce8ac', amber: '#edc16b', white: '#e4ecec', blue: '#8cc9f6' })[p.theme] || '#8ce8ac';
      g.save(); box(g, 0, 0, W, H, '#070d0c');
      if (p.rain) {
        const step = env.tall ? 32 : 44;
        for (let col = 0; col < Math.ceil(W / step); col++) {
          const rate = 22 + U.h1(col, env.seed) * 28, base = (env.t * rate + U.h1(col + 91, env.seed) * H) % (H + 180);
          for (let j = 0; j < 7; j++) {
            g.globalAlpha = (1 - j / 8) * 0.075;
            text(g, '01:7AC39'[Math.floor(U.h1(col * 19 + j, env.seed) * 8)], col * step, base - j * 24, 16, color);
          }
        }
        g.globalAlpha = 1;
      }
      const l = terminalLayout(g, env);
      g.save(); clip(g, 0, 65, W, H - 104); g.translate(0, -l.scroll);
      l.rows.forEach((row, index) => {
        if (row.y + row.h < l.scroll + 60) return;
        if (row.type === 'bar') {
          const w = Math.min(W - l.pad * 2 - 65, 620), y = row.y - l.size * 0.35;
          box(g, l.pad, y, w, 18, '#13251c', U.rgba(color, 0.4));
          g.fillStyle = color; g.fillRect(l.pad + 3, y + 3, Math.max(0, (w - 6) * row.progress), 12);
          text(g, Math.floor(row.progress * 100) + '%', l.pad + w + 12, y + 9, 14, color);
        } else if (row.type === 'grant' || row.type === 'deny') {
          const c = row.type === 'deny' ? '#f37676' : color, w = Math.min(W - l.pad * 2, 770), x = (W - w) / 2;
          box(g, x, row.y - 8, w, row.h - 24, U.rgba(c, 0.055), c, 2);
          text(g, row.type === 'deny' ? 'ACCESS DENIED' : 'ACCESS GRANTED', W / 2, row.y + row.h / 2 - 21, env.tall ? 24 : 39, c, 600, 'center', w - 28);
          text(g, row.type === 'deny' ? 'SESSION BLOCKED' : 'IDENTITY CONFIRMED / 047', W / 2, row.y + row.h - 42, env.tall ? 10 : 14, c, 400, 'center', w - 24);
        } else {
          row.parts.forEach((part, i) => text(g, part, l.pad, row.y + i * l.lh, l.size, row.typed ? color : '#8b9b94'));
          if (index === l.rows.length - 1 && Math.floor(env.t * 2.4) % 2 === 0) {
            g.font = F(400, l.size, 'mono'); const last = row.parts[row.parts.length - 1] || '';
            g.fillStyle = color; g.fillRect(l.pad + g.measureText(last).width + 3, row.y + (row.parts.length - 1) * l.lh - l.size / 2, l.size * 0.55, l.size * 1.1);
          }
        }
      });
      g.restore();
      box(g, 0, 0, W, 57, '#111b17'); line(g, 0, 57, W, 57, '#293d32');
      text(g, p.title, 24, 29, env.tall ? 13 : 17, color, 500, 'left', W - 48);
      box(g, 0, H - 39, W, 39, '#111b17');
      text(g, '● ENCRYPTED', 24, H - 19, 11, color);
      text(g, 'UTF-8 / ' + String(env.seed).padStart(4, '0'), W - 24, H - 19, 11, '#71877a', 400, 'right'); g.restore();
    },
  });

  function dossierLayout(env) {
    const { W, H, tall } = env, sidebar = tall ? 0 : Math.min(260, W * 0.2), top = tall ? 18 : 95;
    const w = tall ? W - 28 : Math.min(820, W - sidebar - 100), x = sidebar + (W - sidebar - w) / 2;
    const h = H - top - (tall ? 18 : 36), inset = tall ? 24 : 48;
    return { sidebar, x, y: top, w, h, inset, bodyY: top + (tall ? 240 : 262), size: tall ? 15 : 18, lh: tall ? 27 : 33 };
  }
  register({
    id: 'classified', name: 'Classified dossier', family: 'ops', icon: '▤', browser: null,
    params: [P.text('org', 'Organisation', 'ARCHIVE DIVISION'), P.text('fileNo', 'File number', '047 / SECTION 08'),
      P.text('title', 'Document title', 'Operation Nightfall'), P.text('subject', 'Subject', 'Restricted field assessment'),
      P.textarea('text', 'Document body', 'The following record contains a summary of the field assessment.\nAll observation points reported activity during the designated window.\nThe original source remains protected under archive protocol.\nMovement was confirmed near the northern access corridor.\nSupporting photographs are attached for internal review.\nFurther disclosure requires written authorisation.'),
      mediaParam(), P.range('redact', 'Redacted lines', 0, 12, 1, 3), P.text('stamp', 'Classification stamp', 'TOP SECRET'),
      P.bool('scan', 'Scanning sweep', true), P.text('access', 'Access level', 'LEVEL 04')],
    focus(env) { const l = dossierLayout(env); return { x: l.x + l.inset, y: l.y + l.h * 0.69, w: l.w - l.inset * 2, h: Math.min(130, l.h * 0.2) }; },
    draw(g, env) {
      const { W, H, P: p, tall } = env, l = dossierLayout(env), paper = '#eeeae0', ink = '#272d2d';
      g.save(); box(g, 0, 0, W, H, '#121b22');
      if (!tall) {
        box(g, 0, 0, W, 59, '#1b272f'); text(g, 'RESTRICTED ARCHIVE', 28, 30, 17, '#d4ddd9', 600);
        badge(g, 'ACCESS ' + p.access, W - 230, 16, 198, '#c4ae80', '#34342d');
        box(g, 0, 59, l.sidebar, H - 59, '#172229');
        text(g, 'DIRECTORY', 25, 104, 12, '#80948e', 600);
        ['▱  Field records', '▱  Source material', '▱  Assessments', '▱  Protected files'].forEach((s, i) => text(g, s, 25, 153 + i * 44, 14, i === 3 ? '#e2eae4' : '#81928b', 400, 'left', l.sidebar - 45));
        box(g, 12, 323, l.sidebar - 24, 46, '#2c3c41', '#52645f', 3);
        text(g, '047 / OPEN DOCUMENT', 25, 346, 12, '#e1d6b7', 500, 'left', l.sidebar - 46);
        text(g, 'LOCAL VAULT / READ ONLY', 24, H - 30, 10, '#6c827b', 400, 'left', l.sidebar - 42);
      }
      g.save(); g.shadowColor = '#0008'; g.shadowBlur = 22; box(g, l.x, l.y, l.w, l.h, paper); g.restore();
      g.save(); clip(g, l.x, l.y, l.w, l.h);
      const x = l.x + l.inset, right = l.x + l.w - l.inset, y = l.y;
      text(g, p.org, x, y + 43, tall ? 16 : 21, ink, 700, 'left', l.w - l.inset * 2);
      text(g, 'FILE ' + p.fileNo, x, y + 75, tall ? 11 : 13, '#686b61', 400, 'left', l.w - l.inset * 2);
      line(g, x, y + 99, right, y + 99, '#989d90');
      g.font = F(700, tall ? 28 : 37, 'serif'); g.fillStyle = ink; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(p.title, x, y + 143, l.w - l.inset * 2);
      text(g, 'SUBJECT /', x, y + 188, 10, '#73776d', 600);
      text(g, p.subject, x, y + 215, tall ? 14 : 17, ink, 500, 'left', l.w - l.inset * 2);
      const photoW = tall ? l.w * 0.40 : l.w * 0.31, photoH = photoW * 0.67;
      const photoY = l.y + l.h - photoH - 40, bodyBottom = Math.min(photoY - 25, l.y + l.h * 0.73);
      const rows = wrapped(g, p.text, l.w - l.inset * 2, l.size, 'serif');
      const visible = Math.max(0, Math.floor((bodyBottom - l.bodyY) / l.lh));
      rows.slice(0, visible).forEach((s, i) => {
        const yy = l.bodyY + i * l.lh;
        g.font = F(400, l.size, 'serif'); g.fillStyle = ink; g.textBaseline = 'middle'; g.fillText(s, x, yy);
        if (i < +p.redact) {
          const q = U.ease.out(U.range(env.p, 0.12 + i * 0.035, 0.29 + i * 0.035));
          const w = Math.min(right - x, g.measureText(s).width * (i % 2 ? 0.73 : 0.94));
          g.fillStyle = '#202321'; g.fillRect(x + (i % 2 ? 12 : 0), yy - l.size * 0.51, w * q, l.size * 1.05);
        }
      });
      const px = right - photoW;
      g.save(); g.translate(px + photoW / 2, photoY + photoH / 2); g.rotate(-0.045);
      box(g, -photoW / 2 - 6, -photoH / 2 - 6, photoW + 12, photoH + 25, '#faf8ed', '#b3b5a7');
      C.drawCover(g, media(env), -photoW / 2, -photoH / 2, photoW, photoH, { seed: env.seed, label: false });
      g.strokeStyle = '#858d89'; g.lineWidth = 2;
      U.rr(g, photoW * 0.17, -photoH / 2 - 18, 13, 42, 6); g.stroke();
      U.rr(g, photoW * 0.17 + 4, -photoH / 2 - 14, 6, 31, 3); g.stroke(); g.restore();
      if (p.stamp && env.p >= 0.45) {
        const q = U.range(env.p, 0.45, 0.54), sc = 1 + 0.7 * (1 - U.ease.back(q));
        const sw = Math.min(l.w - l.inset * 2, tall ? 245 : 370), sh = tall ? 66 : 88;
        g.save(); g.translate(x + sw / 2, l.y + l.h * 0.77); g.rotate(-0.12); g.scale(sc, sc); g.globalAlpha = U.range(env.p, 0.45, 0.465) * 0.88;
        g.strokeStyle = '#9d3030'; g.lineWidth = 3; g.strokeRect(-sw / 2, -sh / 2, sw, sh); g.lineWidth = 1; g.strokeRect(-sw / 2 + 6, -sh / 2 + 6, sw - 12, sh - 12);
        text(g, p.stamp, 0, 1, tall ? 29 : 39, '#9d3030', 700, 'center', sw - 25);
        // Deterministic pinholes break the ink edge without a bitmap texture.
        const R = U.rng(env.seed + 417); g.fillStyle = paper;
        for (let i = 0; i < 85; i++) g.fillRect(-sw / 2 + R() * sw, -sh / 2 + R() * sh, 1 + R() * 3, 1 + R() * 2);
        g.restore();
      }
      if (p.scan && env.p < 0.9) {
        const sy = l.y + U.range(env.p, 0, 0.9) * l.h;
        const grad = g.createLinearGradient(0, sy - 26, 0, sy + 2); grad.addColorStop(0, 'rgba(80,154,146,0)'); grad.addColorStop(1, 'rgba(80,154,146,.14)');
        g.fillStyle = grad; g.fillRect(l.x, sy - 26, l.w, 28); line(g, l.x, sy, l.x + l.w, sy, '#8baea655');
      }
      line(g, x, l.y + l.h - 28, right, l.y + l.h - 28, '#b4b6aa');
      text(g, tall ? 'ACCESS / ' + p.access : 'CONTROLLED COPY / ' + p.access, x, l.y + l.h - 14, 9, '#71766c');
      text(g, '01', right, l.y + l.h - 14, 10, '#71766c', 400, 'right'); g.restore(); g.restore();
    },
  });

  function inboxLayout(env) {
    const folders = env.tall ? 0 : env.W * 0.155, list = env.tall ? env.W : env.W * 0.305;
    return { folders, list, readX: env.tall ? 0 : folders + list, top: env.tall ? 84 : 75, pad: env.tall ? 25 : 34, size: env.tall ? 17 : 20, lh: env.tall ? 29 : 34 };
  }
  function mailRows(p) {
    return cached('mails:' + p.mails, () => String(p.mails || '').split('\n').filter(s => s.trim()).map(row => {
      const [from = 'Archive Desk', subject = 'Untitled message', snippet = '', time = '09:41'] = row.split('|').map(s => s.trim());
      return { from: from || 'Archive Desk', subject: subject || 'Untitled message', snippet, time };
    }));
  }
  function readingRows(g, env, l) { return wrapped(g, env.P.body, env.W - l.readX - l.pad * 2, l.size, 'sans'); }
  register({
    id: 'inbox', name: 'Mail inbox', family: 'screens', icon: '✉', browser: null,
    params: [P.text('app', 'App name', 'Mail'),
      P.textarea('mails', 'Messages: From | Subject | snippet | time', 'Archive Desk | Restricted records released | The requested documents are now available. | 09:41\nField Office | Observation summary | Please review the attached findings. | 09:36\nRecords Unit | Reference 047 | Your request has been logged. | 08:52\nResearch Desk | Weekly briefing | Updates from the archive team. | Yesterday'),
      P.range('openAt', 'Open first message at', 0, 1, 0.01, 0.45),
      P.textarea('body', 'Message body', 'Hello,\n\nThe requested records have cleared the internal review.\nThe access corridor was active during the observation window.\nPlease keep this information within the authorised group.\n\nA complete summary will follow in the next briefing.\n\nRegards,\nArchive Desk'),
      P.range('hlLine', 'Highlight body line (0 = none)', 0, 30, 1, 4)],
    focus(env) {
      const l = inboxLayout(env), g = U.tmp('ops-focus', 1, 1).getContext('2d');
      const rows = readingRows(g, env, l), index = U.clamp(Math.round(+env.P.hlLine || 1) - 1, 0, Math.max(0, rows.length - 1));
      const y = l.top + 228 + index * l.lh, scroll = Math.max(0, y - (env.H - 115));
      return { x: l.readX + l.pad, y: y - scroll - l.size, w: env.W - l.readX - l.pad * 2, h: l.lh + 12 };
    },
    draw(g, env) {
      const { W, H, P: p, tall } = env, l = inboxLayout(env), rows = mailRows(p), current = rows[0] || { from: 'Archive Desk', subject: 'No messages', time: '' };
      const opened = env.p >= +p.openAt, transition = U.ease.out(U.range(env.p, +p.openAt, Math.min(1, +p.openAt + 0.065)));
      g.save(); box(g, 0, 0, W, H, '#fafbf9');
      if (!tall) {
        box(g, 0, l.top, l.folders, H - l.top, '#edf1ee');
        badge(g, '+ Compose', 20, l.top + 25, l.folders - 40, '#365d50', '#d9e7df', 14);
        ['Inbox', 'Starred', 'Sent', 'Drafts', 'Archive', 'Trash'].forEach((s, i) => {
          if (!i) box(g, 12, l.top + 82, l.folders - 24, 42, '#d9e5df', null, 5);
          text(g, s, 28, l.top + 103 + i * 47, 14, i ? '#697b72' : '#234f3a', i ? 400 : 600);
        });
        line(g, l.folders, l.top, l.folders, H, '#d7dfd8');
      }
      g.save(); clip(g, l.folders, l.top, l.list, H - l.top);
      text(g, 'Inbox', l.folders + 23, l.top + 35, 23, '#1c3026', 700);
      text(g, rows.length + ' messages', l.folders + l.list - 22, l.top + 35, 11, '#738477', 400, 'right');
      rows.forEach((mail, i) => {
        const arrival = U.ease.out(U.range(env.p, i * 0.055, i * 0.055 + 0.11));
        if (!arrival) return;
        const y = l.top + 68 + i * 126;
        if (y > H) return;
        g.save(); g.translate((1 - arrival) * 50, 0); g.globalAlpha = arrival;
        box(g, l.folders + 1, y, l.list - 2, 125, i === 0 && opened ? '#e5eee8' : '#fafbf9');
        if (i === 0 && opened) { g.fillStyle = '#517f63'; g.fillRect(l.folders, y, 4, 125); }
        if (i || !opened) { g.fillStyle = '#5485d1'; g.beginPath(); g.arc(l.folders + 15, y + 26, 3, 0, Math.PI * 2); g.fill(); }
        const x = l.folders + 29, width = l.list - 53;
        text(g, mail.from, x, y + 27, 15, '#293e33', 600, 'left', width - 80);
        text(g, mail.time, l.folders + l.list - 20, y + 27, 10, '#758277', 400, 'right', 78);
        text(g, mail.subject, x, y + 58, 17, '#20372b', 600, 'left', width);
        text(g, mail.snippet, x, y + 88, 13, '#6f7e73', 400, 'left', width);
        line(g, l.folders + 22, y + 125, l.folders + l.list, y + 125, '#e0e6df'); g.restore();
      }); g.restore();
      if (opened) {
        g.save(); clip(g, l.readX, l.top, W - l.readX, H - l.top);
        g.translate(tall ? (1 - transition) * W : (1 - transition) * 24, 0);
        box(g, l.readX, l.top, W - l.readX, H - l.top, '#fff');
        const x = l.readX + l.pad, rw = W - x - l.pad, yy = l.top;
        text(g, tall ? '‹  Inbox' : '↶     Archive     ···', x, yy + 28, 13, '#66816d');
        const subject = wrapped(g, current.subject, rw, tall ? 27 : 32, 'sans').slice(0, 2);
        subject.forEach((s, i) => { g.font = F(700, tall ? 27 : 32); g.fillStyle = '#23382c'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, x, yy + 82 + i * 37); });
        C.avatar(g, x + 20, yy + 160, 20, current.from, env.seed);
        text(g, current.from, x + 53, yy + 151, 15, '#283d30', 600, 'left', rw - 60);
        text(g, 'to: me  ·  ' + current.time, x + 53, yy + 178, 11, '#819084', 400, 'left', rw - 60);
        line(g, x, yy + 204, W - l.pad, yy + 204, '#e3e8e1');
        const body = readingRows(g, env, l), idx = Math.round(+p.hlLine) - 1;
        const targetY = yy + 228 + Math.max(0, idx) * l.lh;
        const scroll = idx >= 0 && idx < body.length ? Math.max(0, targetY - (H - 115)) : 0;
        g.save(); clip(g, x, yy + 213, rw, H - yy - 240);
        body.forEach((s, i) => {
          const y = yy + 228 + i * l.lh - scroll;
          if (y < yy + 210 || y > H) return;
          g.font = F(400, l.size);
          if (i === idx) {
            const q = U.ease.out(U.range(env.p, +p.openAt + 0.07, Math.min(1, +p.openAt + 0.23)));
            g.fillStyle = '#f5dc79'; g.fillRect(x - 3, y - l.size * 0.64, Math.min(rw, g.measureText(s).width + 9) * q, l.size * 1.4);
          }
          g.fillStyle = '#394b3e'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y);
        }); g.restore(); g.restore();
      } else if (!tall) {
        text(g, 'Select a conversation', l.readX + (W - l.readX) / 2, H / 2, 18, '#9ba89e', 400, 'center');
      }
      box(g, 0, 0, W, l.top, '#244638');
      text(g, p.app, 26, l.top / 2, tall ? 27 : 29, '#f3f7ef', 600, 'left', tall ? W - 100 : l.folders - 42);
      if (!tall) { box(g, l.folders + 24, 18, Math.min(510, W * 0.37), 39, '#365749', null, 5); text(g, 'Search messages', l.folders + 43, 38, 14, '#b7c8bd'); }
      C.avatar(g, W - 35, l.top / 2, 17, 'Operator', env.seed); g.restore();
    },
  });

  register({
    id: 'cctv', name: 'Security camera', family: 'hud', icon: '◉', browser: null, statusBar: false,
    params: [mediaParam(), P.select('tint', 'Night tint', ['green', 'none', 'blue'], 'green'), ...clockParams(), P.text('cam', 'Camera label', 'CAM 03'), hudParam()],
    draw(g, env) {
      g.save(); if (!env.P.hudOnly) surveillance(g, env, env.W, env.H, media(env), env.P.tint);
      cctvLabels(g, env, env.W, env.H, env.P.cam, env.P.clock, env.P.date); g.restore();
    },
  });
  register({
    id: 'bodycam', name: 'Body camera', family: 'hud', icon: '▣', browser: null, statusBar: false,
    params: [mediaParam(), ...clockParams(), P.text('unit', 'Unit identifier', 'UNIT 4471'), P.range('battery', 'Battery %', 0, 100, 1, 84), hudParam()],
    draw(g, env) {
      const { W, H, P: p, tall } = env, pad = tall ? 24 : 42, fs = tall ? 14 : 23;
      g.save();
      if (!p.hudOnly) {
        C.drawCover(g, media(env), 0, 0, W, H, { zoom: 0.09, fx: 0.5 + Math.sin(env.t * 0.7) * 0.006, seed: env.seed, label: false });
        vignette(g, W, H, 0.93);
        const rim = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
        rim.addColorStop(0, '#0000'); rim.addColorStop(1, '#07161b88'); g.fillStyle = rim; g.fillRect(0, 0, W, H);
      }
      g.shadowColor = '#000'; g.shadowBlur = 4;
      text(g, p.date + ' T ' + U.clock(p.clock, env.t) + 'Z', W - pad, pad + fs / 2, fs, '#f5f4db', 600, 'right', W - pad * 2);
      text(g, p.unit, W - pad, pad + fs * 2.2, fs * 0.85, '#f5f4db', 500, 'right', W - pad * 2);
      text(g, 'BODY CAM', W - pad, pad + fs * 3.65, fs * 0.67, '#d9dec9', 500, 'right');
      battery(g, W - pad - 38, pad + fs * 5, +p.battery / 100, '#f5f4db');
      rec(g, pad, H - pad, env, tall ? 15 : 20, '#f5f4db');
      text(g, U.mmss(env.t), W - pad, H - pad, fs, '#f5f4db', 500, 'right'); g.restore();
    },
  });

  // Thermal uses at most 240 horizontal samples and a reusable output buffer. The source canvas never gets tainted
  // pixels copied into the visible context; an unreadable source falls back to the normal local-media view.
  const thermalCache = new Map();
  const thermalStops = [[3, 6, 23], [37, 18, 100], [129, 26, 132], [218, 53, 72], [255, 155, 38], [255, 238, 136], [255, 255, 245]];
  const thermalLut = Array.from({ length: 256 }, (_, n) => {
    const t = n / 255 * (thermalStops.length - 1), i = Math.min(thermalStops.length - 2, Math.floor(t));
    return thermalStops[i].map((v, k) => Math.round(U.lerp(v, thermalStops[i + 1][k], t - i)));
  });
  function thermal(g, env) {
    const { W, H } = env, source = media(env), scale = Math.min(1, 240 / W, 480 / H);
    const w = Math.max(1, Math.round(W * scale)), h = Math.max(1, Math.round(H * scale));
    const key = `${w}:${h}:${env.seed}`, frame = Math.floor(env.t * Math.min(env.fps || 30, 12));
    let entry = thermalCache.get(key);
    if (!entry) {
      if (thermalCache.size >= 6) thermalCache.delete(thermalCache.keys().next().value);
      const canvas = U.canvas(w, h); entry = { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }), frame: -1, source: null, bad: false }; thermalCache.set(key, entry);
    }
    if (entry.frame !== frame || entry.source !== (source && source.el)) {
      entry.frame = frame; entry.source = source && source.el;
      try {
        entry.ctx.clearRect(0, 0, w, h); C.drawCover(entry.ctx, source, 0, 0, w, h, { seed: env.seed, label: false });
        const d = entry.ctx.getImageData(0, 0, w, h), a = d.data;
        for (let i = 0; i < a.length; i += 4) {
          const rgb = thermalLut[Math.round(a[i] * 0.2126 + a[i + 1] * 0.7152 + a[i + 2] * 0.0722)];
          a[i] = rgb[0]; a[i + 1] = rgb[1]; a[i + 2] = rgb[2];
        }
        entry.ctx.putImageData(d, 0, 0); entry.bad = false;
      } catch (_) { entry.bad = true; }
    }
    if (entry.bad) C.drawCover(g, source, 0, 0, W, H, { seed: env.seed, label: false });
    else g.drawImage(entry.canvas, 0, 0, W, H);
  }
  register({
    id: 'drone', name: 'Drone telemetry', family: 'hud', icon: '⌖', browser: null, statusBar: false,
    params: [mediaParam(), P.bool('thermal', 'Thermal view', false), P.range('altitude', 'Altitude (m)', 0, 3000, 1, 124),
      P.range('speed', 'Speed (km/h)', 0, 180, 1, 36), P.range('distance', 'Distance (m)', 0, 10000, 1, 842),
      P.range('lat', 'GPS latitude', -90, 90, 0.0001, 28.6139), P.range('lon', 'GPS longitude', -180, 180, 0.0001, 77.209),
      P.range('heading', 'Heading (degrees)', 0, 359, 1, 72), P.range('battery', 'Battery %', 0, 100, 1, 78), hudParam()],
    focus(env) { return { x: env.W * 0.35, y: env.H * 0.35, w: env.W * 0.3, h: env.H * 0.3 }; },
    draw(g, env) {
      const { W, H, tall, P: p } = env, pad = tall ? 22 : 40, size = tall ? 14 : 19, c = p.thermal ? '#fff3cd' : '#d9f8dc';
      const heading = (+p.heading + Math.sin(env.t * 0.2) * 9 + 360) % 360;
      g.save();
      if (!p.hudOnly) {
        if (p.thermal) thermal(g, env); else C.drawCover(g, media(env), 0, 0, W, H, { zoom: 0.03, seed: env.seed, label: false });
        vignette(g, W, H, 0.5);
      }
      g.shadowColor = '#0009'; g.shadowBlur = 2;
      const tapeW = tall ? W - 80 : Math.min(650, W * 0.5), tx = (W - tapeW) / 2, ty = tall ? 98 : 44;
      g.save(); clip(g, tx, ty - 18, tapeW, 49);
      const spacing = tall ? 5 : 7;
      for (let k = Math.floor(heading - tapeW / spacing / 2) - 5; k <= heading + tapeW / spacing / 2 + 5; k += 1) {
        if (k % 5) continue;
        const x = W / 2 + (k - heading) * spacing, deg = ((k % 360) + 360) % 360;
        line(g, x, ty + 5, x, ty + (k % 10 ? 11 : 16), c);
        if (!(k % 10)) text(g, ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' })[deg] || String(deg).padStart(3, '0'), x, ty - 6, 11, c, 500, 'center');
      } g.restore();
      line(g, W / 2 - 5, ty + 25, W / 2, ty + 17, c, 2); line(g, W / 2, ty + 17, W / 2 + 5, ty + 25, c, 2);
      const cx = W / 2, cy = H / 2, gap = tall ? 28 : 42, len = tall ? 32 : 55;
      line(g, cx - gap - len, cy, cx - gap, cy, c); line(g, cx + gap, cy, cx + gap + len, cy, c);
      line(g, cx, cy - gap - len, cx, cy - gap, c); line(g, cx, cy + gap, cx, cy + gap + len, c);
      g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.stroke();
      for (const [x, y, sx, sy] of [[pad, 155, 1, 1], [W - pad, 155, -1, 1], [pad, H - 150, 1, -1], [W - pad, H - 150, -1, -1]]) {
        line(g, x, y + sy * 25, x, y, c, 1.5); line(g, x, y, x + sx * 30, y, c, 1.5);
      }
      const pitch = Math.sin(env.t * 0.3) * 12;
      g.save(); g.globalAlpha = 0.55;
      for (let n = -2; n <= 2; n++) {
        if (!n) continue;
        const y = cy + n * (tall ? 57 : 49) + pitch, half = tall ? 46 : 84;
        line(g, cx - half, y, cx - 15, y, c); line(g, cx + 15, y, cx + half, y, c);
        text(g, String(-n * 10), cx + half + 9, y, 10, c);
      } g.restore();
      rec(g, pad, pad + 10, env, size, c); text(g, U.mmss(env.t), pad, pad + 40, size, c);
      battery(g, W - pad - 38, pad, +p.battery / 100, c); text(g, Math.round(+p.battery) + '%', W - pad, pad + 39, size * 0.8, c, 400, 'right');
      const base = H - (tall ? 110 : 104), columns = tall ? [pad, W / 2, W - pad] : [pad, W * 0.23, W * 0.43];
      const values = [((+p.altitude || 0) + Math.sin(env.t * 0.4) * 2.3).toFixed(1), ((+p.speed || 0) + Math.sin(env.t * 0.5) * 1.5).toFixed(1), ((+p.distance || 0) + env.t * (+p.speed || 0) / 3.6).toFixed(0)];
      ['ALT / M', 'SPD / KMH', 'DIST / M'].forEach((s, i) => {
        const align = tall && i === 2 ? 'right' : tall && i === 1 ? 'center' : 'left';
        text(g, s, columns[i], base, 10, c, 400, align); text(g, values[i], columns[i], base + 28, tall ? 21 : 28, c, 500, align);
      });
      const lat = U.clamp(+p.lat + Math.sin(env.t * 0.08) * 0.00012, -90, 90), lon = U.clamp(+p.lon + Math.sin(env.t * 0.1) * 0.00015, -180, 180);
      text(g, lat.toFixed(5) + '  ' + lon.toFixed(5), tall ? W / 2 : W - pad, H - pad, tall ? 13 : 17, c, 400, tall ? 'center' : 'right');
      if (!tall) badge(g, p.thermal ? 'THERMAL / IR' : 'OPTICAL / EO', W - pad - 155, base, 155, c, '#14271d88'); g.restore();
    },
  });
  register({
    id: 'camcorder', name: 'Home video viewfinder', family: 'hud', icon: '▹', browser: null, statusBar: false,
    params: [mediaParam(), P.select('mode', 'Transport', ['REC', 'PLAY'], 'REC'), P.select('color', 'Display colour', ['amber', 'white'], 'amber'), ...clockParams(), P.text('counter', 'Tape start clock', '00:12:04'), hudParam()],
    draw(g, env) {
      const { W, H, P: p, tall } = env, pad = tall ? 27 : 48, fs = tall ? 22 : 30, c = p.color === 'white' ? '#f1f0df' : '#f5cf80';
      g.save();
      if (!p.hudOnly) {
        C.drawCover(g, media(env), 0, 0, W, H, { seed: env.seed, label: false });
        const scale = Math.min(1, 800 / W, 450 / H);
        const scratch = U.tmp('ops-bleed', W * scale, H * scale), s = scratch.getContext('2d');
        s.clearRect(0, 0, scratch.width, scratch.height); C.drawCover(s, media(env), 0, 0, scratch.width, scratch.height, { seed: env.seed, label: false });
        s.globalCompositeOperation = 'multiply'; s.fillStyle = '#ce3752'; s.fillRect(0, 0, scratch.width, scratch.height); s.globalCompositeOperation = 'source-over';
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.09; g.drawImage(scratch, 3, 0, W, H); g.restore();
        s.clearRect(0, 0, scratch.width, scratch.height);
        C.drawCover(s, media(env), 0, 0, scratch.width, scratch.height, { seed: env.seed, label: false });
        s.globalCompositeOperation = 'multiply'; s.fillStyle = '#435ebe'; s.fillRect(0, 0, scratch.width, scratch.height); s.globalCompositeOperation = 'source-over';
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.045; g.drawImage(scratch, -3, 1, W, H); g.restore();
        const y = ((env.t * 41 + U.h1(2, env.seed) * H) % (H + 10)) - 5;
        g.save(); clip(g, 0, y, W, 4); g.translate(Math.sin(env.t * 7) * 7, 0); C.drawCover(g, media(env), 0, 0, W, H, { seed: env.seed, label: false }); g.restore();
        g.fillStyle = '#fff2'; g.fillRect(0, y, W, 1); vignette(g, W, H, 0.47);
      }
      g.shadowColor = '#34220d'; g.shadowBlur = 2; g.shadowOffsetX = 1; g.shadowOffsetY = 1;
      if (p.mode === 'PLAY') text(g, 'PLAY ▶', pad, pad + 15, fs, c, 600); else rec(g, pad, pad + 15, env, fs, c);
      battery(g, W - pad - 46, pad, 0.68, c, 1.2);
      text(g, 'SP  ' + U.clock(p.counter, env.t), W - pad, pad + 64, fs * 0.65, c, 500, 'right');
      text(g, p.date, pad, H - pad - fs * 1.3, fs * 0.9, c, 600, 'left', W - pad * 2);
      text(g, U.clock(p.clock, env.t), pad, H - pad, fs, c, 600);
      if (!tall) text(g, 'AUTO', W - pad, H - pad, fs * 0.6, c, 500, 'right');
      const cx = W / 2, cy = H / 2, s = tall ? 50 : 72;
      for (const [x, y, dx, dy] of [[cx - s, cy - s, 1, 1], [cx + s, cy - s, -1, 1], [cx - s, cy + s, 1, -1], [cx + s, cy + s, -1, -1]]) {
        line(g, x, y, x + dx * 18, y, U.rgba(c, 0.65)); line(g, x, y, x, y + dy * 18, U.rgba(c, 0.65));
      } g.restore();
    },
  });

  function wallLayout(env) {
    const n = String(env.P.grid) === '9' ? 3 : 2, gap = env.tall ? 6 : 10, pad = env.tall ? 12 : 24;
    const top = env.tall ? 105 : 83, bottom = env.tall ? 76 : 48, w = (env.W - pad * 2 - gap * (n - 1)) / n;
    const gridH = env.tall ? Math.min(env.H - top - bottom, w * 0.92 * n + gap * (n - 1)) : env.H - top - bottom;
    const h = (gridH - gap * (n - 1)) / n, y = top + (env.H - top - bottom - gridH) / 2;
    return { n, gap, pad, w, h, y };
  }
  register({
    id: 'cctvwall', name: 'Security control room', family: 'hud', icon: '▦', browser: null, statusBar: false,
    params: [mediaParam(), P.media('media2', 'Feed 2'), P.media('media3', 'Feed 3'), P.media('media4', 'Feed 4'),
      P.select('grid', 'Feed grid', ['4', '9'], '4'), ...clockParams(), P.range('alertTile', 'Alert tile (1-based, 0 = none)', 0, 9, 1, 3),
      P.select('tint', 'Camera tint', ['green', 'none', 'blue'], 'green')],
    focus(env) {
      const l = wallLayout(env), i = U.clamp(Math.round(+env.P.alertTile || 1) - 1, 0, l.n * l.n - 1);
      return { x: l.pad + i % l.n * (l.w + l.gap), y: l.y + Math.floor(i / l.n) * (l.h + l.gap), w: l.w, h: l.h };
    },
    draw(g, env) {
      const { W, H, P: p, tall } = env, l = wallLayout(env), slots = ['media', 'media2', 'media3', 'media4'].map(key => media(env, key));
      g.save(); box(g, 0, 0, W, H, '#0a1115'); box(g, 0, 0, W, tall ? 76 : 57, '#172027');
      text(g, 'SURVEILLANCE / CONTROL', l.pad, tall ? 29 : 30, tall ? 16 : 20, '#d5e1db', 600, 'left', W - l.pad * 2);
      text(g, l.n * l.n + ' CHANNELS / LOCAL RECORDING', tall ? l.pad : W - l.pad, tall ? 55 : 30, 10, '#81978a', 400, tall ? 'left' : 'right');
      for (let i = 0; i < l.n * l.n; i++) {
        const x = l.pad + i % l.n * (l.w + l.gap), y = l.y + Math.floor(i / l.n) * (l.h + l.gap);
        g.save(); clip(g, x, y, l.w, l.h); g.translate(x, y);
        const tileEnv = { ...env, seed: env.seed + i * 97, t: env.t + i * 0.07 };
        surveillance(g, tileEnv, l.w, l.h, slots[i % 4], p.tint, tileEnv.seed);
        cctvLabels(g, tileEnv, l.w, l.h, 'CAM ' + String(i + 1).padStart(2, '0'), U.clock(p.clock, i * 17), p.date, true);
        g.restore();
        const alert = +p.alertTile === i + 1 && env.p >= 0.4;
        const blink = 0.6 + 0.4 * Math.sin(env.t * 7) ** 2;
        g.strokeStyle = alert ? `rgba(242,79,69,${blink})` : '#3c5147'; g.lineWidth = alert ? 3 : 1; g.strokeRect(x + 1.5, y + 1.5, l.w - 3, l.h - 3);
        if (alert) {
          const tw = Math.min(l.w - 20, tall ? 66 : 108), th = tall ? 24 : 29;
          box(g, x + (l.w - tw) / 2, y + l.h / 2 - th / 2, tw, th, '#a82e2a');
          text(g, 'ALERT', x + l.w / 2, y + l.h / 2, tall ? 11 : 16, '#fff4ea', 600, 'center');
        }
      }
      line(g, l.pad, H - 39, W - l.pad, H - 39, '#23352b');
      text(g, '● SYSTEM ONLINE', l.pad, H - 20, tall ? 10 : 12, '#8cb998');
      text(g, U.clock(p.clock, env.t), W - l.pad, H - 20, tall ? 12 : 14, '#91a99b', 500, 'right'); g.restore();
    },
  });
})();
