// Screen contents: what is shown ON the screen (your photo/video, a search page, an article, a player, a HUD...).
// Contract (see CONTRACT.md):
//   SM.content.register({ id, name, family, icon, params, browser?, statusBar?, focus?(env), draw(g, env) })
//   draw(g, env): g is already scaled to LOGICAL px; draw inside 0..env.W x 0..env.H. Deterministic: use env.t / env.p /
//   env.seed / SM.util.rng / h1 only - never Math.random or Date. Return nothing.
//   focus(env): optional { x, y, w, h } in the same logical px (no canvas needed) for the "Zoom to focus" camera move.
SM.content = (() => {
  const list = [], byId = {};
  const P = {
    range: (key, label, min, max, step, def) => ({ key, label, type: 'range', min, max, step, def }),
    select: (key, label, options, def) => ({ key, label, type: 'select', options, def }),
    bool: (key, label, def) => ({ key, label, type: 'bool', def }),
    color: (key, label, def) => ({ key, label, type: 'color', def }),
    text: (key, label, def) => ({ key, label, type: 'text', def }),
    textarea: (key, label, def) => ({ key, label, type: 'textarea', def }),
    media: (key, label) => ({ key, label, type: 'media', def: '' }),
  };
  function register(def) {
    def.params = def.params || [];
    def.defaults = {};
    for (const p of def.params) def.defaults[p.key] = p.def;
    if (byId[def.id]) list.splice(list.indexOf(byId[def.id]), 1);
    list.push(def); byId[def.id] = def;
  }
  return { list, byId, register, P };
})();

// Shared screen UI pieces every content can use: status bar, browser bar, window bar, cursor, icons, avatars, media.
SM.chrome = (() => {
  const U = SM.util, F = SM.font;
  const theme = dark => dark
    ? { bg: '#0f1115', panel: '#171a21', card: '#1c2029', line: '#2a2f3a', text: '#eef0f4', sub: '#a3a9b6', faint: '#6b7280', accent: '#e5a93c', link: '#8ab4ff' }
    : { bg: '#ffffff', panel: '#f3f4f6', card: '#ffffff', line: '#e3e5ea', text: '#15171c', sub: '#565d6b', faint: '#8b919e', accent: '#c47f12', link: '#1a4fd6' };

  // phone/tablet status bar (time, signal, wifi, battery). Returns its height.
  function statusBar(g, W, o = {}) {
    const h = o.h || 44, c = o.color || '#fff';
    g.save(); g.fillStyle = c; g.strokeStyle = c;
    g.font = F(700, 16); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(o.time || '9:41', 28, h / 2 + 2);
    const x = W - 26;
    g.lineWidth = 1.4; U.rr(g, x - 27, h / 2 - 6, 24, 12, 3.5); g.stroke();
    g.fillRect(x - 25, h / 2 - 4, 20 * (o.battery == null ? 0.8 : o.battery), 8); g.fillRect(x - 1.5, h / 2 - 2.5, 2, 5);
    for (let i = 0; i < 4; i++) g.fillRect(x - 70 + i * 5, h / 2 + 5 - (i + 1) * 3, 3.4, (i + 1) * 3);
    g.beginPath(); g.arc(x - 39, h / 2 + 5, 2, 0, Math.PI * 2); g.fill();
    for (const r of [6, 10]) { g.beginPath(); g.arc(x - 39, h / 2 + 5, r, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
    g.restore();
    return h;
  }
  // desktop browser chrome (tab + address bar). Returns its height.
  function browserBar(g, W, o = {}) {
    const T = theme(o.dark), h = 86;
    g.save();
    g.fillStyle = o.dark ? '#1b1e25' : '#dfe3ea'; g.fillRect(0, 0, W, h);
    g.fillStyle = T.bg; U.rr(g, 92, 8, Math.min(300, W * 0.3), 34, 9); g.fill(); g.fillRect(92, 26, Math.min(300, W * 0.3), 16);
    g.fillStyle = T.text; g.font = F(600, 13); g.textBaseline = 'middle'; g.fillText(o.title || 'New tab', 120, 26, Math.min(300, W * 0.3) - 40);
    g.fillStyle = o.accent || '#e5a93c'; g.beginPath(); g.arc(106, 26, 6, 0, Math.PI * 2); g.fill();
    ['#ef6b5e', '#f4bf4f', '#61c454'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(22 + i * 20, 25, 6, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = T.bg; g.fillRect(0, 42, W, h - 42);
    g.fillStyle = T.panel; U.rr(g, 110, 49, W - 220, 30, 15); g.fill();
    g.fillStyle = T.faint; g.font = F(400, 14);
    g.fillText('‹   ›   ⟳', 22, 64);
    g.fillStyle = T.sub; g.beginPath(); g.arc(130, 64, 5, Math.PI, 0); g.fill(); g.fillRect(124.5, 63, 11, 8);
    g.fillStyle = T.text; g.font = F(400, 15); g.fillText(o.url || 'example.org', 146, 65, W - 290);
    g.strokeStyle = T.line; g.lineWidth = 1; g.beginPath(); g.moveTo(0, h - 0.5); g.lineTo(W, h - 0.5); g.stroke();
    g.restore();
    return h;
  }
  // phone browser: address pill under the status bar. Returns height.
  function mobileUrl(g, W, y, o = {}) {
    const T = theme(o.dark);
    g.save(); g.fillStyle = T.bg; g.fillRect(0, y, W, 52);
    g.fillStyle = T.panel; U.rr(g, 14, y + 8, W - 28, 36, 18); g.fill();
    g.fillStyle = T.sub; g.font = F(400, 15); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🔒 ' + (o.url || 'example.org'), W / 2, y + 27, W - 60);
    g.restore();
    return 52;
  }
  // desktop app window title bar. Returns height.
  function windowBar(g, W, o = {}) {
    const dark = o.theme !== 'light', h = 40;
    g.save(); g.fillStyle = dark ? '#22262f' : '#e4e7ec'; g.fillRect(0, 0, W, h);
    ['#ef6b5e', '#f4bf4f', '#61c454'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(22 + i * 20, h / 2, 6, 0, Math.PI * 2); g.fill(); });
    if (o.title) { g.fillStyle = dark ? '#c9ced8' : '#3b404b'; g.font = F(600, 14); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.title, W / 2, h / 2 + 1, W - 200); }
    g.restore();
    return h;
  }

  // Cursor along keyframes [{t, x, y, click}] (t in seconds). Draws the arrow (or hand) and click ripples.
  function cursorPos(keys, t) {
    if (!keys || !keys.length) return null;
    if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.t) { const k = U.ease.inOut(U.range(t, a.t, b.t)); return { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k) }; }
    }
    const l = keys[keys.length - 1]; return { x: l.x, y: l.y };
  }
  function cursor(g, keys, t, o = {}) {
    const pos = cursorPos(keys, t);
    if (!pos) return;
    const sc = o.scale || 1;
    for (const k of keys) if (k.click && t >= k.t && t < k.t + 0.6) {
      const q = (t - k.t) / 0.6;
      g.save(); g.strokeStyle = U.rgba(o.ring || '#e5a93c', 1 - q); g.lineWidth = 3 * sc;
      g.beginPath(); g.arc(k.x, k.y, (8 + q * 30) * sc, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    const down = keys.some(k => k.click && t >= k.t - 0.06 && t < k.t + 0.12);
    g.save(); g.translate(pos.x, pos.y); g.scale(sc * (down ? 0.88 : 1), sc * (down ? 0.88 : 1));
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    g.beginPath();
    if (o.hand) { // pointing hand
      g.moveTo(0, 0); g.lineTo(4, 0); g.lineTo(4, 10); g.lineTo(14, 12); g.lineTo(16, 26); g.lineTo(2, 28); g.lineTo(-6, 16); g.lineTo(-2, 12); g.lineTo(0, 14); g.closePath();
    } else { g.moveTo(0, 0); g.lineTo(0, 26); g.lineTo(6.5, 20); g.lineTo(11, 30); g.lineTo(15, 28.3); g.lineTo(10.6, 18.6); g.lineTo(19, 18.6); g.closePath(); }
    g.fillStyle = o.fill || '#ffffff'; g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = o.stroke || '#111'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }

  function appIcon(g, x, y, s, color, letter) {
    g.save(); const gr = g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, U.shade(color, 0.18)); gr.addColorStop(1, U.shade(color, -0.12));
    g.fillStyle = gr; U.rr(g, x, y, s, s, s * 0.24); g.fill();
    g.fillStyle = '#fff'; g.font = F(800, s * 0.5); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(letter || '•').slice(0, 2), x + s / 2, y + s * 0.54);
    g.restore();
  }
  const AV = ['#e5a93c', '#5b8def', '#3fb68b', '#d9534f', '#9b6bd6', '#e07b39', '#2fa4b8', '#c2547a'];
  function avatar(g, x, y, r, name, seed = 1) {
    const init = String(name || '?').trim().split(/\s+/).map(w => U.graphemes(w)[0] || '').slice(0, 2).join('').toUpperCase();
    g.save(); g.fillStyle = AV[Math.floor(U.h1(U.glen(name) * 7 + (name || '').charCodeAt(0), seed) * AV.length)];
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = F(700, r * 0.8); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(init, x, y + r * 0.06);
    g.restore();
  }

  // media helpers: env.media(key) gives { el, w, h, kind } or null
  function drawCover(g, m, x, y, w, h, o = {}) {
    if (!m) return placeholder(g, x, y, w, h, o);
    const z = 1 + (o.zoom || 0), s = (o.fit === 'contain' ? Math.min(w / m.w, h / m.h) : Math.max(w / m.w, h / m.h)) * z;
    const dw = m.w * s, dh = m.h * s, fx = o.fx == null ? 0.5 : o.fx, fy = o.fy == null ? 0.5 : o.fy;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(m.el, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
    g.restore();
  }
  // a tasteful stand-in picture (no media yet): seeded sunset-hills scene + label
  function placeholder(g, x, y, w, h, o = {}) {
    const seed = o.seed || 3, R = U.rng(seed), hue = [[28, 210], [200, 30], [265, 35], [160, 25]][Math.floor(R() * 4)];
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, `hsl(${hue[1]},45%,22%)`); sky.addColorStop(0.6, `hsl(${hue[0]},65%,55%)`); sky.addColorStop(1, `hsl(${hue[0]},70%,70%)`);
    g.fillStyle = sky; g.fillRect(x, y, w, h);
    g.fillStyle = `hsla(${hue[0] + 15},90%,85%,.9)`; g.beginPath(); g.arc(x + w * (0.3 + R() * 0.4), y + h * 0.55, Math.min(w, h) * 0.09, 0, Math.PI * 2); g.fill();
    for (let l = 0; l < 3; l++) {
      g.fillStyle = `hsla(${hue[1]},30%,${16 - l * 4}%,${0.75 + l * 0.1})`; g.beginPath(); g.moveTo(x, y + h);
      for (let i = 0; i <= 24; i++) g.lineTo(x + w * i / 24, y + h * (0.6 + l * 0.1) - U.fbm1(i * 0.35 + l * 7, seed + l) * h * 0.12);
      g.lineTo(x + w, y + h); g.closePath(); g.fill();
    }
    if (o.label !== false) {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = F(600, Math.max(10, Math.min(w, h) * 0.06)); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.label || 'Your photo / video', x + w / 2, y + h * 0.88, w * 0.9);
    }
    g.restore();
  }

  // text helpers
  function text(g, s, x, y, o = {}) {
    g.save(); g.font = F(o.w || 400, o.size || 16, o.kind || 'sans'); g.fillStyle = o.color || '#fff';
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic'; g.fillText(s, x, y, o.max || undefined); g.restore();
  }
  function para(g, s, x, y, maxW, o = {}) {
    g.save(); g.font = F(o.w || 400, o.size || 16, o.kind || 'sans'); g.fillStyle = o.color || '#fff'; g.textBaseline = 'alphabetic';
    const lines = U.wrap(g, s, maxW), lh = (o.size || 16) * (o.lh || 1.45), out = [];
    lines.slice(0, o.maxLines || 999).forEach((l, i) => { g.fillText(l, x, y + i * lh); out.push({ text: l, x, y: y + i * lh, w: g.measureText(l).width }); });
    g.restore();
    return { lines: out, h: Math.min(lines.length, o.maxLines || 999) * lh, lh };
  }

  return { theme, statusBar, browserBar, mobileUrl, windowBar, cursor, cursorPos, appIcon, avatar, drawCover, placeholder, text, para };
})();
