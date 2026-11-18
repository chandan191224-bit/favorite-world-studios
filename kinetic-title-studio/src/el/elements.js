// Element types. Each draws in "design px" (1080 = short side of the frame) around its anchor (0,0).
// draw(g, it, t, env): it = {f: fields, p: params}, t = seconds into the clip, env = {dur, seed, fw, fh, ox, oy, lang}
// Frame rect in local coords: x from -env.ox to env.fw-env.ox, y from -env.oy to env.fh-env.oy.
KT.el = (() => {
  const U = KT.util, T = KT.text, A = KT.anim;
  const byId = {}, list = [];
  function register(d) { byId[d.id] = d; list.push(d); return d; }

  // shared param blocks
  const P = {
    font: (def = 'notoSans', label = 'Font') => ({ k: 'font', label, type: 'select', options: T.FONT_OPTIONS, def }),
    color: (k, label, def) => ({ k, label, type: 'color', def }),
    num: (k, label, def, min, max, step = 0.01) => ({ k, label, type: 'range', def, min, max, step }),
    sel: (k, label, options, def) => ({ k, label, type: 'select', options, def }),
    bool: (k, label, def = false) => ({ k, label, type: 'check', def }),
  };
  const ANIM = [
    P.sel('in', 'In animation', A.IN, 'rise'), P.sel('unit', 'Animate by', A.UNITS, 'word'),
    P.num('inDur', 'In time (s)', 0.9, 0.1, 4), P.num('spread', 'Stagger', 0.6, 0, 1),
    P.sel('ease', 'Easing', U.EASES, 'out'), P.sel('out', 'Out animation', [['fade', 'Fade'], ['same', 'Reverse of In'], ['blur', 'Blur out'], ['drop', 'Sink'], ['rise', 'Float up'], ['glitch', 'Glitch'], ['hold', 'None (cut)']], 'fade'),
    P.num('outDur', 'Out time (s)', 0.45, 0, 2), P.sel('loop', 'While on screen', A.LOOPS, 'none'),
  ];
  // reverse-the-in timing for built-up graphics: in plays forward, out plays the in backwards
  const rev = (t, dur, inDur, outDur) => (outDur > 0 && t > dur - outDur ? inDur * U.clamp((dur - t) / outDur) : t);
  const frame = env => ({ x0: -env.ox, y0: -env.oy, x1: env.fw - env.ox, y1: env.fh - env.oy });

  // ---------- post effects on the element's own layer ----------
  const noiseCache = {};
  function noiseField(seed) {
    if (noiseCache[seed]) return noiseCache[seed];
    const w = 160, h = 90, f = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[y * w + x] = U.fbm2(x / 22, y / 22, seed, 4) * 0.5 + 0.5;
    const c = U.canvas(w, h);
    return (noiseCache[seed] = { f, w, h, c });
  }
  function post(g, kind, t, dur, env, inDur) {
    if (!kind || kind === 'none') return;
    const F = frame(env);
    if (kind === 'shine') {
      const p = U.range(t, inDur * 0.6, inDur * 0.6 + 1.3);
      if (p <= 0 || p >= 1) return;
      const x = U.lerp(F.x0 - 400, F.x1 + 400, U.ease.inOut(p));
      const gr = g.createLinearGradient(x - 160, 0, x + 160, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.globalCompositeOperation = 'source-atop'; g.setTransform(g.getTransform().multiply(new DOMMatrix().skewX(-20)));
      g.fillStyle = gr; g.fillRect(F.x0 - 2000, F.y0 - 100, F.x1 - F.x0 + 4000, F.y1 - F.y0 + 200); g.restore();
    } else if (kind === 'dissolve') {
      const pin = U.range(t, 0, inDur * 1.4), pout = U.range(t, dur - 0.7, dur), p = pin * (1 - pout);
      if (p >= 1) return;
      const N = noiseField(env.seed), id = N.c.getContext('2d').createImageData(N.w, N.h), d = id.data;
      const th = U.lerp(-0.15, 1.15, p);
      for (let i = 0; i < N.f.length; i++) { d[i * 4 + 3] = 255 * U.smooth(U.clamp((th - N.f[i]) / 0.12)); }
      N.c.getContext('2d').putImageData(id, 0, 0);
      g.save(); g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = true;
      g.drawImage(N.c, F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); g.restore();
    } else if (kind === 'film') {
      const f = Math.floor(t * 24);
      g.save(); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(20,12,0,${0.08 + U.h1(f, env.seed) * 0.12})`; g.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
      g.fillStyle = 'rgba(255,240,210,0.5)';
      for (let k = 0; k < 2; k++) if (U.h1(f * 3 + k, env.seed + 2) < 0.5) g.fillRect(F.x0 + U.h1(f + k * 17, env.seed) * (F.x1 - F.x0), F.y0, 2, F.y1 - F.y0);
      g.restore();
    }
  }

  // ---------- 1. Titles + kinetic typography ----------
  register({
    id: 'title', name: 'Title / kinetic text', family: 'titles',
    fields: [{ k: 'label', label: 'Small label above (optional)' }, { k: 'title', label: 'Main text (*word* = accent)', multi: true }, { k: 'sub', label: 'Subtitle below (optional)' }],
    params: [
      P.font('notoSans'), P.num('size', 'Size', 110, 30, 260, 1), P.sel('fill', 'Fill', A.FILLS, 'solid'),
      P.color('color', 'Colour', '#ffffff'), P.color('emph', 'Accent colour (*words*)', '#f5b942'), P.color('color2', 'Gradient 2nd colour', '#f5b942'),
      P.bool('upper', 'UPPERCASE (English)'), P.num('tracking', 'Letter spacing', 0, -0.05, 0.6),
      P.num('width', 'Max width', 0.8, 0.3, 0.98), P.sel('align', 'Align', [['center', 'Centre'], ['left', 'Left'], ['right', 'Right']], 'center'),
      ...ANIM,
      P.num('shadow', 'Shadow', 0.6, 0, 2), P.num('glow', 'Glow', 0, 0, 2), P.num('extrude', '3D depth', 0, 0, 3), P.num('outline', 'Outline', 0, 0, 0.12),
      P.sel('deco', 'Decoration', [['none', 'None'], ['rules', 'Rules left/right'], ['line', 'Line under'], ['letterbox', 'Cinema bars'], ['frame', 'Frame corners'], ['band', 'Dark band'], ['split', 'Split line reveal']], 'none'),
      P.sel('post', 'Finish', [['none', 'None'], ['shine', 'Light sweep'], ['dissolve', 'Smoke dissolve'], ['film', 'Old film flicker']], 'none'),
      P.font('notoSans', 'Label/sub font'), P.color('accent', 'Decoration colour', '#f5b942'),
    ],
    dur: 4,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, F = frame(env), dur = env.dur, seed = env.seed;
      const maxW = env.fw * p.width;
      const o = {
        text: f.title, font: p.font, size: p.size, weight: 'bold', fill: p.fill, color: p.color, color2: p.color2, emphColor: p.emph, upper: p.upper, tracking: p.tracking,
        maxW, maxH: env.fh * 0.62, align: p.align, in: p.in, unit: p.unit, inDur: p.inDur, spread: p.spread, ease: p.ease, out: p.out, outDur: p.outDur, loop: p.loop,
        shadow: p.shadow, glow: p.glow, extrude: p.extrude, outline: p.outline, inStart: p.deco === 'split' || p.deco === 'letterbox' ? 0.35 : 0,
      };
      const L = f.title ? A.mkLayout(o) : null;
      const top = L ? L.top : 0, bot = L ? L.top + L.H : 0, W = L ? L.W : 400;
      const xL = !L ? 0 : p.align === 'left' ? 0 : p.align === 'right' ? -W : -W / 2;
      const inP = U.ease.inOut(U.range(rev(t, dur, 1, p.outDur), 0, 1));
      const ac = p.accent;
      // decorations behind
      if (p.deco === 'letterbox') {
        const bh = (F.y1 - F.y0) * 0.125 * U.ease.out(U.range(rev(t, dur, 0.6, p.outDur), 0, 0.6));
        g.fillStyle = '#000'; g.fillRect(F.x0, F.y0, F.x1 - F.x0, bh); g.fillRect(F.x0, F.y1 - bh, F.x1 - F.x0, bh);
      }
      if (p.deco === 'band' && L) {
        const pad = 50, h = (bot - top) + pad * 2 + (f.label ? 70 : 0) + (f.sub ? 70 : 0);
        g.fillStyle = 'rgba(8,9,12,0.72)';
        const bw = (F.x1 - F.x0) * inP; g.fillRect(F.x0 + ((F.x1 - F.x0) - bw) / 2, top - pad - (f.label ? 70 : 0), bw, h);
      }
      g.save();
      if (p.post === 'dissolve' || p.post === 'shine' || p.post === 'film') { /* applied after drawing */ }
      if (L) {
        if (p.deco === 'split') { g.save(); g.beginPath(); g.rect(F.x0, F.y0, F.x1 - F.x0, bot + 14 - F.y0); g.clip(); A.text(g, Object.assign({}, o, { in: o.in === 'rise' ? 'mask' : o.in }), t, dur, seed); g.restore(); }
        else A.text(g, o, t, dur, seed);
      }
      // label above / subtitle below
      const lsz = Math.max(26, p.size * 0.3);
      if (f.label) A.text(g, { text: f.label, font: p.font2, size: lsz, weight: 'bold', color: ac, upper: true, tracking: 0.28, maxW, align: p.align, valign: 'bottom', in: p.deco === 'split' ? 'maskDown' : 'track', unit: 'all', inDur: 1.1, inStart: 0.5, out: 'fade', outDur: p.outDur, ease: 'cine' }, t, dur, seed + 3);
      g.save(); if (f.label) g.translate(0, top - 22); g.restore();
      if (f.label) { /* label is drawn at its own origin; shift by drawing again positioned */ }
      g.restore();
      // (label positioning) — redraw cleanly using translate
      if (f.sub) { g.save(); g.translate(0, bot + lsz * 1.25 + 8); A.text(g, { text: f.sub, font: p.font2, size: lsz * 1.05, weight: 'normal', color: '#e9e6df', maxW, align: p.align, valign: 'middle', in: p.deco === 'split' ? 'mask' : 'fade', unit: 'all', inDur: 1.0, inStart: Math.min(1.7, Math.max(0.4, (dur - p.outDur) * 0.48)), out: 'fade', outDur: p.outDur, shadow: 0.6 }, t, dur, seed + 5); g.restore(); }
      // rules / lines
      if (L && (p.deco === 'rules' || p.deco === 'line' || p.deco === 'split')) {
        g.strokeStyle = ac; g.lineWidth = 3; g.lineCap = 'round';
        if (p.deco === 'rules') {
          const y = (top + bot) / 2, gap = 40, len = 160 * inP;
          g.beginPath(); g.moveTo(xL - gap, y); g.lineTo(xL - gap - len, y); g.moveTo(xL + W + gap, y); g.lineTo(xL + W + gap + len, y); g.stroke();
        } else {
          const y = bot + (p.deco === 'split' ? 14 : 22), cx = xL + W / 2, len = (W / 2 + 30) * inP;
          g.beginPath(); g.moveTo(cx - len, y); g.lineTo(cx + len, y); g.stroke();
        }
      }
      if (L && p.deco === 'frame') {
        const pad = 46, x0 = xL - pad, y0 = top - pad - (f.label ? 60 : 0), x1 = xL + W + pad, y1 = bot + pad + (f.sub ? 70 : 0), c = 60 * inP;
        g.strokeStyle = ac; g.lineWidth = 4;
        g.beginPath();
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => { g.moveTo(x + sx * c, y); g.lineTo(x, y); g.lineTo(x, y + sy * c); });
        g.stroke();
      }
      post(g, p.post, t, dur, env, p.inDur);
    },
  });
  // label needs to sit above the title: wrap draw so the label gets a translated origin
  (() => {
    const d = byId.title, base = d.draw;
    d.draw = function (g, it, t, env) {
      const f = it.f;
      if (!f.label) return base(g, it, t, env);
      const p = it.p;
      const L = f.title ? A.mkLayout({ text: f.title, font: p.font, size: p.size, weight: 'bold', upper: p.upper, tracking: p.tracking, maxW: env.fw * p.width, maxH: env.fh * 0.62, align: p.align }) : null;
      const top = L ? L.top : 0;
      // draw everything except the label, then the label at the right place
      base(g, Object.assign({}, it, { f: Object.assign({}, f, { label: '' }) }), t, env);
      const lsz = Math.max(26, p.size * 0.3);
      g.save(); g.translate(0, top - lsz * 0.5);
      A.text(g, { text: f.label, font: p.font2, size: lsz, weight: 'bold', color: p.accent, upper: true, tracking: 0.28, maxW: env.fw * p.width, align: p.align, valign: 'bottom', in: p.deco === 'split' ? 'maskDown' : 'track', unit: 'all', inDur: 1.1, inStart: 0.5, out: 'fade', outDur: p.outDur, ease: 'cine', shadow: 0.5 }, t, env.dur, env.seed + 3);
      g.restore();
    };
  })();

  // ---------- 2. Lower thirds ----------
  register({
    id: 'lower', name: 'Lower third / name tag', family: 'lower',
    fields: [{ k: 'name', label: 'Name / main line' }, { k: 'role', label: 'Role / second line' }, { k: 'tag', label: 'Tag (news / location date)' }],
    params: [
      P.sel('style', 'Style', [['doc', 'Documentary line'], ['bar', 'Colour bar'], ['news', 'News strap'], ['serif', 'Minimal serif'], ['location', 'Location pin'], ['pill', 'Glass pill']], 'doc'),
      P.font('mukta'), P.num('size', 'Size', 58, 30, 110, 1), P.color('accent', 'Accent', '#f5b942'), P.color('color', 'Text colour', '#ffffff'),
      P.num('inDur', 'In time (s)', 0.9, 0.3, 2.5), P.num('outDur', 'Out time (s)', 0.5, 0, 2),
    ],
    dur: 5, x: 0.07, y: 0.8,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, s = p.size, ac = p.accent, k = rev(t, env.dur, p.inDur, p.outDur) / p.inDur;
      const ph = (a, b, e = 'out') => U.ease[e](U.range(k, a, b));
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const fN = T.font(p.font, s, 'bold'), fR = T.font(p.font, s * 0.52, 'normal');
      g.font = fN; const wN = g.measureText(f.name || '').width; g.font = fR; const wR = g.measureText(f.role || '').width;
      const txt = (str, font, x, y, col, a = 1, sh = true) => { if (!str || a <= 0) return; g.save(); g.globalAlpha *= a; g.font = font; g.fillStyle = col; if (sh) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 10; g.shadowOffsetY = 2; } g.fillText(str, x, y); g.restore(); };
      const clipR = (x, y, w, h, fn) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(); g.restore(); };
      if (p.style === 'doc') {
        const lh = s * 2.1 * ph(0, 0.4);
        g.fillStyle = ac; g.fillRect(0, -s * 0.95, 7, lh);
        const sl = (1 - ph(0.25, 0.8, 'outQuart')) * -(wN + 40);
        clipR(14, -s * 1.3, wN + 200, s * 3, () => { txt(f.name, fN, 26 + sl, 0, p.color); txt(f.role, fR, 26 + sl * 1.2, s * 0.85, ac); });
      } else if (p.style === 'bar') {
        const bw = (wN + 60) * ph(0, 0.45, 'outQuart'), rw = (wR + 44) * ph(0.3, 0.7, 'outQuart');
        g.fillStyle = ac; g.fillRect(0, -s * 1.05, 12, s * 1.45 * ph(0, 0.2));
        g.fillStyle = 'rgba(12,14,18,.88)'; g.fillRect(12, -s * 1.05, bw, s * 1.45);
        g.fillStyle = ac; g.fillRect(12, s * 0.4, rw, s * 0.85);
        clipR(12, -s * 1.05, bw, s * 1.45, () => txt(f.name, fN, 42, -s * 0.05 + (1 - ph(0.3, 0.75)) * s, p.color, 1, false));
        clipR(12, s * 0.4, rw, s * 0.85, () => txt(f.role, fR, 34, s * 0.98, U.lum(ac) > 0.5 ? '#111' : '#fff', ph(0.5, 0.9), false));
      } else if (p.style === 'news') {
        const tag = f.tag || (env.lang === 'hi' ? 'ब्रेकिंग' : 'BREAKING'), fT = T.font(p.font, s * 0.55, 'bold');
        g.font = fT; const wT = g.measureText(tag).width + 40;
        const W = Math.max(wN + 70, wR + 70, 900);
        const a = ph(0, 0.35, 'outQuart'), b = ph(0.2, 0.65, 'outQuart'), c = ph(0.45, 0.9, 'outQuart');
        g.fillStyle = '#d61f26'; g.fillRect(0, -s * 1.75, wT * a, s * 0.75);
        clipR(0, -s * 1.75, wT * a, s * 0.75, () => txt(tag, fT, 20, -s * 1.18, '#fff', 1, false));
        g.fillStyle = '#ffffff'; g.fillRect(0, -s * 1.0, W * b, s * 1.35);
        clipR(0, -s * 1.0, W * b, s * 1.35, () => txt(f.name, fN, 30, s * 0.08, '#111', 1, false));
        g.fillStyle = 'rgba(14,16,22,.92)'; g.fillRect(0, s * 0.35, W * c, s * 0.82);
        clipR(0, s * 0.35, W * c, s * 0.82, () => txt(f.role, fR, 30, s * 0.92, '#fff', 1, false));
      } else if (p.style === 'serif') {
        const fS = T.font(p.font === 'mukta' ? 'playfair' : p.font, s * 1.05, 'bold', true);
        g.font = fS; const w2 = g.measureText(f.name || '').width;
        clipR(-10, -s * 1.4, w2 + 60, s * 1.65, () => txt(f.name, fS, 0, (1 - ph(0, 0.6, 'outQuart')) * s * 1.4, p.color));
        g.fillStyle = ac; g.fillRect(0, s * 0.32, Math.max(120, w2 * 0.45) * ph(0.35, 0.8, 'inOut'), 3);
        const fC = T.font('notoSans', s * 0.42, 'bold');
        g.save(); g.globalAlpha = ph(0.55, 1); g.font = fC; g.fillStyle = '#e8e2d6';
        const roleTxt = T.isDeva(f.role || '') ? (f.role || '') : (f.role || '').toUpperCase().split('').join(String.fromCharCode(8202));
        g.fillText(roleTxt, 0, s * 1.05); g.restore();
      } else if (p.style === 'location') {
        const pop = U.ease.outBack(U.range(k, 0, 0.35)), r = s * 0.42;
        g.save(); g.translate(r, -s * 0.35); g.scale(pop, pop);
        g.fillStyle = ac; g.beginPath(); g.arc(0, -r * 0.2, r, Math.PI * 0.82, Math.PI * 2.18); g.lineTo(0, r * 1.5); g.closePath(); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(0, -r * 0.2, r * 0.38, 0, 7); g.fill(); g.restore();
        const x = r * 2 + 26;
        clipR(x - 6, -s * 1.3, wN + 120, s * 1.5, () => txt(f.name, fN, x, (1 - ph(0.2, 0.65, 'outQuart')) * s * 1.2, p.color));
        // date / coordinates typed
        const tag = f.tag || f.role || '', cl = T.clusters(tag), nshow = Math.floor(cl.length * U.range(k, 0.5, 1));
        txt(cl.slice(0, nshow).join(''), T.font('mono', s * 0.48, 500), x, s * 0.75, ac);
      } else if (p.style === 'pill') {
        const H = s * 1.9, R = H / 2, W = Math.max(wN, wR) + H + 70, w = U.lerp(H, W, ph(0.15, 0.6, 'outQuart')), a = ph(0, 0.2);
        g.save(); g.globalAlpha *= a; g.fillStyle = 'rgba(18,20,26,.72)'; U.rrect(g, 0, -R, w, H, R); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke(); g.restore();
        const sc = U.ease.outBack(U.range(k, 0.05, 0.4));
        g.save(); g.translate(R, 0); g.scale(sc, sc); g.fillStyle = ac; g.beginPath(); g.arc(0, 0, R * 0.74, 0, 7); g.fill();
        g.font = T.font(p.font, R * 0.8, 'bold'); g.textAlign = 'center'; g.fillStyle = U.lum(ac) > 0.5 ? '#111' : '#fff';
        g.fillText(T.clusters(f.name || '?')[0] || '?', 0, R * 0.28); g.restore(); g.textAlign = 'left';
        clipR(H, -R, w - H, H, () => { const d = (1 - ph(0.35, 0.8, 'outQuart')) * -60; txt(f.name, fN, H + 10 + d, -s * 0.05, p.color, 1, false); txt(f.role, fR, H + 12 + d, s * 0.62, '#c9ced8', 1, false); });
      }
    },
  });

  // ---------- 3. Call-outs ----------
  register({
    id: 'callout', name: 'Call-out (points at footage)', family: 'callout',
    fields: [{ k: 'label', label: 'Label' }, { k: 'sub', label: 'Second line (optional)' }],
    params: [
      P.sel('kind', 'Kind', [['label', 'Label with leader line'], ['spotlight', 'Spotlight circle'], ['measure', 'Measure line (A → B)']], 'label'),
      P.sel('marker', 'Marker', [['dot', 'Dot'], ['ring', 'Pulsing ring'], ['box', 'Corner box'], ['cross', 'Crosshair'], ['arrow', 'Hand-drawn arrow'], ['none', 'None']], 'dot'),
      P.sel('box', 'Label look', [['box', 'White box'], ['dark', 'Dark box'], ['plain', 'Plain text'], ['under', 'Text on line']], 'box'),
      P.num('dx', 'Label offset X', 300, -900, 900, 1), P.num('dy', 'Label offset Y', -170, -600, 600, 1),
      P.num('r', 'Marker size', 60, 10, 400, 1), P.num('x2', 'Measure end X', 0.8, 0, 1), P.num('y2', 'Measure end Y', 0.5, 0, 1),
      P.font('mukta'), P.num('size', 'Text size', 44, 20, 100, 1), P.color('accent', 'Line colour', '#ffffff'), P.color('accent2', 'Accent', '#f5b942'),
      P.num('inDur', 'In time (s)', 1.1, 0.3, 3), P.num('outDur', 'Out time (s)', 0.5, 0, 2),
    ],
    dur: 4, x: 0.55, y: 0.5,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, k = rev(t, env.dur, p.inDur, p.outDur) / p.inDur, F = frame(env);
      const ph = (a, b, e = 'out') => U.ease[e](U.range(k, a, b));
      const lw = 4, col = p.accent, ac = p.accent2, s = p.size;
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (p.kind === 'spotlight') {
        const R = p.r * 2.2 * U.lerp(3, 1, ph(0, 0.7, 'inOut'));
        g.save(); g.fillStyle = `rgba(0,0,0,${0.62 * ph(0, 0.5)})`; g.beginPath(); g.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); g.arc(0, 0, R, 0, 7, true); g.fill('evenodd');
        g.strokeStyle = ac; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ph(0.3, 0.9, 'inOut')); g.stroke(); g.restore();
        if (f.label) { g.save(); g.translate(0, R + s * 1.3); A.text(g, { text: f.label, font: p.font, size: s, color: '#fff', shadow: 1, in: 'rise', inDur: 0.6, inStart: p.inDur * 0.6, outDur: p.outDur, maxW: 900 }, t, env.dur, env.seed); g.restore(); }
        return;
      }
      if (p.kind === 'measure') {
        const bx = (p.x2 - it.x) * env.fw, by = (p.y2 - it.y) * env.fh, e = ph(0.1, 0.75, 'inOut');
        const ex = bx * e, ey = by * e, L = Math.hypot(bx, by) || 1, nx = -by / L * 18, ny = bx / L * 18;
        g.strokeStyle = col; g.lineWidth = lw; g.setLineDash([16, 12]);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
        g.beginPath(); g.moveTo(nx * ph(0, 0.2), ny * ph(0, 0.2)); g.lineTo(-nx * ph(0, 0.2), -ny * ph(0, 0.2)); g.stroke();
        if (e > 0.98) { g.beginPath(); g.moveTo(bx + nx, by + ny); g.lineTo(bx - nx, by - ny); g.stroke(); }
        g.save(); g.translate(bx / 2 + nx * 2.6, by / 2 + ny * 2.6);
        A.text(g, { text: f.label, font: p.font, size: s, color: '#fff', emphColor: ac, shadow: 1.2, in: 'pop', unit: 'all', inDur: 0.5, inStart: p.inDur * 0.7, outDur: p.outDur, maxW: 900 }, t, env.dur, env.seed);
        g.restore();
        return;
      }
      // marker
      const mp = ph(0, 0.3, 'outBack'), R = p.r;
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw;
      if (p.marker === 'dot') { g.beginPath(); g.arc(0, 0, 16 * mp, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 6 * mp, 0, 7); g.fill(); }
      else if (p.marker === 'ring') {
        g.strokeStyle = ac; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, R * mp, 0, 7); g.stroke();
        const pulse = (t * 0.9) % 1; g.globalAlpha = (1 - pulse) * 0.6 * U.clamp(k); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * (1 + pulse * 0.6) * mp, 0, 7); g.stroke(); g.globalAlpha = 1;
      } else if (p.marker === 'box') {
        const h = R * 1.3, c = h * 0.4 * mp, sc = U.lerp(1.6, 1, mp);
        g.strokeStyle = ac; g.lineWidth = 6; g.beginPath();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const x = sx * h * sc, y = sy * h * sc; g.moveTo(x - sx * c, y); g.lineTo(x, y); g.lineTo(x, y - sy * c); });
        g.stroke();
      } else if (p.marker === 'cross') {
        const h = R * mp; g.beginPath(); g.arc(0, 0, h * 0.7, 0, 7); g.moveTo(-h, 0); g.lineTo(-h * 0.3, 0); g.moveTo(h, 0); g.lineTo(h * 0.3, 0); g.moveTo(0, -h); g.lineTo(0, -h * 0.3); g.moveTo(0, h); g.lineTo(0, h * 0.3); g.stroke();
      }
      const start = p.marker === 'box' ? R * 1.3 * 1.2 : p.marker === 'ring' ? R : p.marker === 'cross' ? R * 0.7 : p.marker === 'none' ? 0 : 16;
      const dx = p.dx, dy = p.dy, sgn = dx >= 0 ? 1 : -1, ang = Math.atan2(dy, dx * 0.35);
      // leader: 45° elbow then horizontal (as in the reference packs); hand-drawn arrow is a curve
      const lp = ph(0.2, 0.6, 'inOut');
      if (p.marker === 'arrow') {
        g.strokeStyle = ac; g.lineWidth = 6;
        const ax = dx, ay = dy, cx = dx * 0.1, cy = dy * 0.9, n = 30, m = Math.floor(n * lp);
        g.beginPath();
        for (let i = 0; i <= m; i++) { const u = 1 - i / n, x = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * cx + u * u * ax, y = 2 * (1 - u) * u * cy + u * u * ay; const d = Math.hypot(x, y) < 26 ? 0 : 1; if (!d) break; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        if (lp >= 1) { const a = Math.atan2(-cy * 2 * 0.06, -cx * 2 * 0.06) || Math.atan2(-cy, -cx); const hx = 22 * Math.cos(Math.atan2(cy, cx)), hy = 22 * Math.sin(Math.atan2(cy, cx)); const ex = hx * 1.3, ey = hy * 1.3; g.beginPath(); g.moveTo(ex + hy * 0.9 + hx * 0.9, ey - hx * 0.9 + hy * 0.9); g.lineTo(ex, ey); g.lineTo(ex - hy * 0.9 + hx * 0.9, ey + hx * 0.9 + hy * 0.9); g.stroke(); void a; }
      } else {
        const sx = Math.cos(ang) * start, sy = Math.sin(ang) * start;
        const ex = dx * 0.35, ey = dy, seg1 = Math.hypot(ex - sx, ey - sy), seg2 = Math.abs(dx - ex), tot = seg1 + seg2, d = tot * lp;
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(sx, sy);
        if (d <= seg1) g.lineTo(sx + (ex - sx) * d / seg1, sy + (ey - sy) * d / seg1);
        else { g.lineTo(ex, ey); g.lineTo(ex + sgn * (d - seg1), ey); }
        g.stroke();
      }
      // label
      if (!f.label) return;
      const fL = T.font(p.font, s, 'bold'), fS = T.font(p.font, s * 0.62, 'normal');
      g.font = fL; const wl = g.measureText(f.label).width; g.font = fS; const ws = f.sub ? g.measureText(f.sub).width : 0;
      const pad = s * 0.45, bw = Math.max(wl, ws) + pad * 2, bh = s * (f.sub ? 2.15 : 1.45);
      const bx = p.marker === 'arrow' ? dx - bw / 2 : sgn > 0 ? dx : dx - bw, by = p.box === 'under' ? dy - bh + 4 : dy - bh / 2;
      const wp = ph(0.5, 0.85, 'outQuart'), wx = sgn > 0 || p.marker === 'arrow' ? bx : bx + bw * (1 - wp);
      g.save(); g.beginPath(); g.rect(wx - 2, by - 40, bw * wp + 4, bh + 80); g.clip();
      if (p.box === 'box' || p.box === 'dark') { g.fillStyle = p.box === 'box' ? '#ffffff' : 'rgba(10,12,16,.86)'; g.fillRect(bx, by, bw, bh); g.fillStyle = ac; g.fillRect(bx, by + bh - 6, bw, 6); }
      const tc = p.box === 'box' ? '#111' : '#fff', lift = (1 - ph(0.6, 1, 'outQuart')) * s * 0.8;
      g.fillStyle = tc; g.font = fL; g.textBaseline = 'alphabetic';
      if (p.box === 'plain' || p.box === 'under') { g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12; }
      g.fillText(f.label, bx + pad, by + s * 1.08 + lift);
      if (f.sub) { g.font = fS; g.fillStyle = p.box === 'box' ? '#444' : ac; g.fillText(f.sub, bx + pad, by + s * 1.82 + lift); }
      g.restore();
      if (p.box === 'under') { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(bx, dy); g.lineTo(bx + bw * wp, dy); g.stroke(); }
    },
  });

  // ---------- 4. Quote cards ----------
  register({
    id: 'quote', name: 'Quote card', family: 'quote',
    fields: [{ k: 'quote', label: 'Quote (*word* = accent)', multi: true }, { k: 'author', label: 'Who said it' }, { k: 'role', label: 'Role / year' }],
    params: [P.sel('style', 'Style', [['marks', 'Big quote marks'], ['card', 'Dark card'], ['hand', 'Handwritten'], ['minimal', 'Minimal centred']], 'marks'),
      P.font('notoSerif'), P.num('size', 'Size', 66, 30, 140, 1), P.color('accent', 'Accent', '#f5b942'), P.color('color', 'Text colour', '#ffffff'),
      P.num('inDur', 'Text reveal (s)', 2.2, 0.4, 6), P.num('outDur', 'Out time (s)', 0.5, 0, 2)],
    dur: 7,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, dur = env.dur, ac = p.accent, W = Math.min(env.fw * 0.72, 1400);
      const font = p.style === 'hand' ? 'kalam' : p.font;
      const o = { text: f.quote, font, size: p.size, weight: p.style === 'hand' ? 'bold' : 'bold', color: p.color, emphColor: ac, maxW: W, maxH: env.fh * 0.6, lineH: 1.3, align: p.style === 'card' ? 'left' : 'center', in: p.style === 'hand' ? 'fade' : 'rise', unit: 'word', inDur: p.inDur, inStart: 0.4, spread: 0.85, outDur: p.outDur, shadow: p.style === 'card' ? 0 : 0.8 };
      const L = A.mkLayout(o), top = L.top, bot = L.top + L.H, xL = o.align === 'left' ? -W / 2 : -L.W / 2;
      const k = U.range(rev(t, dur, 0.8, p.outDur), 0, 0.8);
      if (p.style === 'card') {
        const pad = 70, cw = W + pad * 2, ch = L.H + pad * 2 + 110;
        g.save(); g.globalAlpha = U.ease.out(k); g.translate(0, (1 - U.ease.out(k)) * 40);
        g.fillStyle = 'rgba(14,16,22,.9)'; U.rrect(g, -cw / 2, top - pad, cw, ch, 22); g.fill();
        g.fillStyle = ac; g.fillRect(-cw / 2, top - pad + 30, 8, ch - 60); g.restore();
        g.save(); g.translate(-W / 2, 0); A.text(g, o, t, dur, env.seed); g.restore();
      } else {
        A.text(g, o, t, dur, env.seed);
      }
      if (p.style === 'marks') {
        g.save(); g.globalAlpha = U.ease.out(k); g.fillStyle = ac; g.font = T.font('playfair', 260, 'bold');
        g.textAlign = 'center'; const sc = U.lerp(1.6, 1, U.ease.outBack(k)); g.translate(xL - 40, top + 60); g.scale(sc, sc); g.fillText('“', 0, 0); g.restore();
      }
      if (p.style === 'hand') {
        const up = U.range(t, 0.4 + p.inDur, 0.9 + p.inDur) * (1 - U.range(t, dur - p.outDur, dur));
        g.strokeStyle = ac; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
        const x0 = -L.W / 2, x1 = x0 + L.W * up, y = bot + 18;
        for (let x = x0; x <= x1; x += 12) { const yy = y + Math.sin(x * 0.03) * 4; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
        g.stroke();
      }
      if (p.style === 'minimal') { g.fillStyle = ac; const w = 120 * U.ease.inOut(k); g.fillRect(-w / 2, top - 50, w, 4); }
      const byline = [f.author, f.role].filter(Boolean).join(' · ');
      if (byline) {
        g.save(); g.translate(p.style === 'card' ? -W / 2 : 0, bot + 75);
        A.text(g, { text: '— ' + byline, font: 'notoSans', size: p.size * 0.48, weight: 'bold', color: p.style === 'card' ? ac : '#e6e0d4', align: o.align, maxW: W, in: 'slideR', unit: 'all', inDur: 0.7, inStart: 0.4 + p.inDur * 0.9, outDur: p.outDur, shadow: 0.6 }, t, dur, env.seed + 2);
        g.restore();
      }
    },
  });

  // ---------- 5. Number / stat counters ----------
  register({
    id: 'counter', name: 'Number / stat counter', family: 'numbers',
    fields: [{ k: 'label', label: 'Label under the number' }, { k: 'from', label: 'Count from' }, { k: 'to', label: 'Count to' }, { k: 'prefix', label: 'Before (₹, $)' }, { k: 'suffix', label: 'After (%, +, लोग)' }],
    params: [P.sel('style', 'Style', [['big', 'Big stat'], ['ring', 'Ring progress (%)'], ['bar', 'Progress bar'], ['odo', 'Rolling digits']], 'big'),
      P.sel('format', 'Number format', [['indian', 'Indian 12,34,567'], ['lakhcrore', 'Lakh / crore words'], ['intl', 'International 1,234,567'], ['compact', 'Compact 1.2M'], ['plain', 'Plain']], 'indian'),
      P.num('dec', 'Decimals', 0, 0, 3, 1), P.bool('deva', 'Hindi digits (०१२)'), P.num('max', 'Bar/ring full value', 100, 1, 1e12, 1),
      P.font('bebas'), P.num('size', 'Size', 200, 60, 360, 1), P.color('color', 'Number colour', '#ffffff'), P.color('accent', 'Accent', '#f5b942'),
      P.num('countDur', 'Count time (s)', 2, 0.3, 8), P.num('outDur', 'Out time (s)', 0.5, 0, 2)],
    dur: 4.5,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, dur = env.dur, ac = p.accent;
      const a = +String(f.from || 0).replace(/[^\d.-]/g, '') || 0, b = +String(f.to || 0).replace(/[^\d.-]/g, '') || 0;
      const e = U.ease.outExpo(U.range(t, 0.25, 0.25 + p.countDur)), v = U.lerp(a, b, e);
      const lang = T.isDeva((f.label || '') + (f.suffix || '')) ? 'hi' : env.lang;
      const num = (f.prefix || '') + T.formatNumber(v, p.format, p.dec, lang, p.deva) + (f.suffix || '');
      const out = 1 - U.range(t, dur - p.outDur, dur), inA = U.ease.out(U.range(t, 0, 0.35));
      g.save(); g.globalAlpha *= out * inA; g.translate(0, (1 - inA) * 40);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const size = p.size, fontS = T.font(p.font, size, 'bold');
      if (p.style === 'ring') {
        const R = size * 1.05, frac = U.clamp(v / (p.max || 100));
        g.lineCap = 'round'; g.lineWidth = size * 0.16; g.strokeStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
        g.strokeStyle = ac; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); g.stroke();
        g.font = T.font(p.font, size * 0.62, 'bold'); g.fillStyle = p.color; g.fillText(num, 0, size * 0.22);
        if (f.label) { g.font = T.font('mukta', size * 0.2, 'bold'); g.fillStyle = '#e6e0d4'; g.fillText(f.label, 0, R + size * 0.45); }
      } else if (p.style === 'bar') {
        const W = Math.min(1300, env.fw * 0.7), frac = U.clamp(v / (p.max || 100)), h = size * 0.16;
        g.textAlign = 'left'; g.font = T.font(p.font, size * 0.7, 'bold'); g.fillStyle = p.color; g.fillText(num, -W / 2, -h);
        if (f.label) { g.textAlign = 'right'; g.font = T.font('mukta', size * 0.2, 'bold'); g.fillStyle = '#e6e0d4'; g.fillText(f.label, W / 2, -h - 8); }
        g.fillStyle = 'rgba(255,255,255,.15)'; U.rrect(g, -W / 2, 0, W, h, h / 2); g.fill();
        g.fillStyle = ac; U.rrect(g, -W / 2, 0, Math.max(h, W * frac), h, h / 2); g.fill();
      } else if (p.style === 'odo') {
        // rolling digit columns: each digit slides like an odometer, the fractional part drives the roll
        const target = T.formatNumber(b, p.format, p.dec, lang, false), chars = ((f.prefix || '') + target + (f.suffix || '')).split('');
        g.font = fontS; const cw = g.measureText('0').width * 1.02;
        const widths = chars.map(c => (/\d/.test(c) ? cw : g.measureText(c).width)), W = widths.reduce((s, x) => s + x, 0);
        let x = -W / 2, di = 0;
        const digitsTotal = chars.filter(c => /\d/.test(c)).length;
        const lh = size * 1.0;
        g.save(); g.beginPath(); g.rect(-W / 2 - 20, -size * 0.85, W + 40, size * 1.0); g.clip();
        chars.forEach((c, i) => {
          if (/\d/.test(c)) {
            const place = digitsTotal - 1 - di; di++;
            const val = (v / Math.pow(10, place + (p.format === 'plain' || p.format === 'indian' || p.format === 'intl' ? -0 : 0))) % 10;
            const pos = e >= 1 ? +c : val;
            const base = Math.floor(pos), fr = U.smooth(pos - base);
            for (let k2 = 0; k2 < 2; k2++) {
              const d = (base + k2) % 10, y = (k2 - fr) * lh;
              g.fillStyle = p.color; g.textAlign = 'center';
              g.fillText(p.deva ? T.toDeva(d) : String(d), x + cw / 2, y);
            }
          } else { g.fillStyle = ac; g.textAlign = 'left'; g.fillText(c, x, 0); }
          x += widths[i];
        });
        g.restore();
        if (f.label) { g.textAlign = 'center'; g.font = T.font('mukta', size * 0.24, 'bold'); g.fillStyle = '#e6e0d4'; g.fillText(f.label, 0, size * 0.45); }
      } else {
        g.font = fontS; g.fillStyle = p.color; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 24;
        const sc = 1 + 0.06 * (1 - U.ease.outBack(U.range(t, 0.25 + p.countDur, 0.55 + p.countDur)));
        g.save(); g.scale(sc, sc);
        const w = g.measureText(num).width; if (w > env.fw * 0.9) g.scale(env.fw * 0.9 / w, env.fw * 0.9 / w);
        g.fillText(num, 0, size * 0.3); g.restore();
        g.shadowBlur = 0;
        const lw = Math.min(g.measureText(num).width, env.fw * 0.9) * 0.5 * U.ease.inOut(U.range(t, 0.3, 1.1));
        g.fillStyle = ac; g.fillRect(-lw / 2, size * 0.42, lw, 6);
        if (f.label) { g.save(); g.translate(0, size * 0.75); A.text(g, { text: f.label, font: 'mukta', size: size * 0.24, weight: 'bold', color: '#efe9de', maxW: env.fw * 0.8, in: 'rise', unit: 'word', inDur: 0.6, inStart: 0.6, outDur: 0, shadow: 0.6 }, t, dur, env.seed); g.restore(); }
      }
      g.restore();
    },
  });

  // ---------- 6. Highlighter / underline / strike / circle ----------
  register({
    id: 'highlight', name: 'Highlight words', family: 'highlight',
    fields: [{ k: 'text', label: 'Text (*words* get marked)', multi: true }],
    params: [P.sel('mark', 'Mark', [['marker', 'Highlighter marker'], ['underline', 'Hand underline'], ['strike', 'Strike-through'], ['circle', 'Hand-drawn circle'], ['box', 'Box outline'], ['redact', 'Redact (black bar)'], ['swipe', 'Colour block swipe']], 'marker'),
      P.sel('card', 'Background', [['paper', 'Paper card'], ['dark', 'Dark card'], ['none', 'None (on footage)']], 'paper'),
      P.font('notoSerif'), P.num('size', 'Size', 72, 30, 150, 1), P.color('accent', 'Mark colour', '#ffd84a'),
      P.num('markAt', 'Mark starts (s)', 0.8, 0, 5), P.num('markDur', 'Mark time (s)', 0.6, 0.1, 3), P.num('outDur', 'Out time (s)', 0.4, 0, 2)],
    dur: 4.5,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, dur = env.dur, ac = p.accent, W = Math.min(env.fw * 0.75, 1500);
      const dark = p.card === 'dark' || p.card === 'none', tc = dark ? '#ffffff' : '#16130f';
      const o = { text: f.text, font: p.font, size: p.size, weight: 'bold', color: tc, maxW: W, maxH: env.fh * 0.6, lineH: 1.35, in: 'fade', unit: 'all', inDur: 0.4, outDur: 0, shadow: p.card === 'none' ? 0.8 : 0 };
      const L = A.mkLayout(o), out = 1 - U.range(t, dur - p.outDur, dur);
      g.save(); g.globalAlpha *= out;
      if (p.card !== 'none') {
        const pad = 70, k = U.ease.out(U.range(t, 0, 0.4));
        g.save(); g.globalAlpha *= k; g.fillStyle = dark ? 'rgba(14,16,22,.92)' : '#f4efe4'; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 40;
        U.rrect(g, -L.W / 2 - pad, L.top - pad, L.W + pad * 2, L.H + pad * 2, 14); g.fill(); g.restore();
      }
      let marked = L.units.word.filter(w => w.emph);
      if (!marked.length) marked = L.units.word;
      // group consecutive marked words on the same line into one stroke
      const runs = [];
      marked.forEach(w => { const r = runs[runs.length - 1]; if (r && r.line === w.line && r.last.i === w.i - 1) { r.x1 = w.x + w.w; r.last = w; } else runs.push({ line: w.line, x0: w.x, x1: w.x + w.w, last: w }); });
      const nR = runs.length, per = p.markDur;
      const prog = i => U.ease.inOut(U.range(t, p.markAt + i * per * 0.8, p.markAt + i * per * 0.8 + per));
      const rough = (x0, x1, y0, y1, k, seed) => {
        const n = 24; g.beginPath();
        for (let i = 0; i <= n; i++) { const x = U.lerp(x0, U.lerp(x0, x1, k), i / n); g[i ? 'lineTo' : 'moveTo'](x, y0 + U.noise1(i * 0.7, seed) * 4); }
        for (let i = n; i >= 0; i--) { const x = U.lerp(x0, U.lerp(x0, x1, k), i / n); g.lineTo(x, y1 + U.noise1(i * 0.7, seed + 9) * 4); }
        g.closePath();
      };
      const behind = p.mark === 'marker' || p.mark === 'swipe';
      if (behind) runs.forEach((r, i) => {
        const k = prog(i); if (k <= 0) return;
        const pad = p.size * 0.12, y0 = r.line.top + L.size * 0.12, y1 = r.line.bottom - L.size * 0.05;
        g.fillStyle = p.mark === 'marker' ? U.rgba(ac, dark ? 0.55 : 0.85) : ac;
        if (p.mark === 'marker') rough(r.x0 - pad, r.x1 + pad, y0, y1, k, i * 13 + 1); else { g.beginPath(); g.rect(r.x0 - pad, y0, (r.x1 - r.x0 + pad * 2) * k, y1 - y0); }
        g.fill();
      });
      A.text(g, o, t, dur, env.seed);
      if (p.mark === 'swipe') runs.forEach((r, i) => { // text on the block turns contrasting
        const k = prog(i); if (k <= 0) return; const pad = p.size * 0.12;
        g.save(); g.beginPath(); g.rect(r.x0 - pad, r.line.top, (r.x1 - r.x0 + pad * 2) * k, r.line.bottom - r.line.top); g.clip();
        g.font = L.fontStr; g.fillStyle = U.lum(ac) > 0.55 ? '#111' : '#fff'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        L.units.word.filter(w => w.line === r.line && w.x >= r.x0 - 1 && w.x + w.w <= r.x1 + 1).forEach(w => g.fillText(w.text, w.x, w.base));
        g.restore();
      });
      if (!behind) runs.forEach((r, i) => {
        const k = prog(i); if (k <= 0) return;
        g.strokeStyle = p.mark === 'strike' ? '#e0262b' : ac; g.lineWidth = Math.max(4, p.size * 0.07); g.lineCap = 'round';
        const y = r.line.base, x0 = r.x0 - 8, x1 = r.x1 + 8;
        if (p.mark === 'underline') { g.beginPath(); for (let j = 0; j <= 30; j++) { const x = U.lerp(x0, U.lerp(x0, x1, k), j / 30); g[j ? 'lineTo' : 'moveTo'](x, y + L.size * 0.2 + Math.sin(j * 0.9) * 3 + j * 0.15); } g.stroke(); }
        else if (p.mark === 'strike') { const ym = y - L.asc * 0.32; g.beginPath(); g.moveTo(x0, ym + 3); g.lineTo(U.lerp(x0, x1, k), ym - 3); g.stroke(); }
        else if (p.mark === 'box') { const pad = 12, w = x1 - x0 + pad * 2, h = r.line.bottom - r.line.top, per2 = 2 * (w + h), d = per2 * k; g.beginPath(); const pts = [[x0 - pad, r.line.top], [x1 + pad, r.line.top], [x1 + pad, r.line.bottom], [x0 - pad, r.line.bottom], [x0 - pad, r.line.top]]; let acc = 0; g.moveTo(...pts[0]); for (let j = 1; j < pts.length; j++) { const sl = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); if (acc + sl >= d) { const u = (d - acc) / sl; g.lineTo(U.lerp(pts[j - 1][0], pts[j][0], u), U.lerp(pts[j - 1][1], pts[j][1], u)); break; } g.lineTo(...pts[j]); acc += sl; } g.stroke(); }
        else if (p.mark === 'circle') {
          const cx = (x0 + x1) / 2, cy = (r.line.top + r.line.bottom) / 2 + 4, rx = (x1 - x0) / 2 + 26, ry = (r.line.bottom - r.line.top) / 2 + 14;
          g.beginPath(); const n = 60, m = Math.floor(n * 1.12 * k);
          for (let j = 0; j <= m; j++) { const a = -2.4 + j / n * Math.PI * 2, wob = 1 + U.noise1(j * 0.25, i + 3) * 0.05 + j / n * 0.06; g[j ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob); }
          g.stroke();
        } else if (p.mark === 'redact') { g.fillStyle = '#0b0b0b'; g.fillRect(x0, r.line.top + L.size * 0.1, (x1 - x0) * k, r.line.bottom - r.line.top - L.size * 0.1); }
      });
      g.restore();
    },
  });

  // ---------- 7. Text match cut ----------
  const MC_LOOKS = { paper: ['#f2ede2', '#16130f', 'doc'], news: ['#e9e4d6', '#111', 'doc'], dark: ['#101216', '#fff', 'plain'], red: ['#b3171d', '#fff', 'plain'], blue: ['#123a7a', '#fff', 'plain'], type: ['#efe6cf', '#2a241b', 'doc'], yellow: ['#f5c22b', '#111', 'plain'], grid: ['#0f1a1f', '#e8f4f2', 'grid'] };
  register({
    id: 'matchcut', name: 'Text match cut', family: 'matchcut',
    fields: [{ k: 'word', label: 'The word that stays' }, { k: 'lines', label: 'Sentences around it, one per cut, split with |  (optional)', multi: true }],
    params: [P.num('cut', 'Seconds per cut', 0.5, 0.15, 2), P.sel('looks', 'Backgrounds', [['mix', 'Documents + colours'], ['docs', 'Documents only'], ['colors', 'Colours only']], 'mix'),
      P.bool('fonts', 'Change font every cut', true), P.bool('marker', 'Yellow highlight on the word', true), P.num('size', 'Size', 120, 40, 260, 1), P.num('zoom', 'Slow push-in', 0.08, 0, 0.4), P.color('accent', 'Highlight colour', '#ffe14d')],
    dur: 4,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, F = frame(env);
      const idx = Math.floor(t / p.cut);
      const keys = p.looks === 'docs' ? ['paper', 'news', 'type'] : p.looks === 'colors' ? ['dark', 'red', 'blue', 'yellow', 'grid'] : ['paper', 'dark', 'news', 'red', 'type', 'blue', 'yellow', 'grid'];
      const look = MC_LOOKS[keys[idx % keys.length]];
      const fonts = env.lang === 'hi' || T.isDeva(f.word || '') ? ['notoSerif', 'rozha', 'khand', 'tiro', 'mukta', 'yatra', 'hind'] : ['notoSerif', 'bebas', 'playfair', 'elite', 'montserrat', 'cinzel', 'oswald', 'anton'];
      const fid = p.fonts ? fonts[idx % fonts.length] : fonts[0];
      const z = 1 + p.zoom * U.range(t, 0, env.dur);
      g.fillStyle = look[0]; g.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
      g.save(); g.scale(z, z);
      const sentences = String(f.lines || '').split('|').map(s => s.trim()).filter(Boolean);
      const sent = sentences.length ? sentences[idx % sentences.length] : '';
      const size = p.size * (fid === 'bebas' || fid === 'anton' || fid === 'khand' ? 1.15 : 1);
      g.textBaseline = 'alphabetic'; g.font = T.font(fid, size, 'bold');
      const word = f.word || '';
      const ww = g.measureText(word).width;
      if (look[2] === 'doc' || look[2] === 'grid') {
        // filler text lines (document look) – grey bars, deterministic per cut
        const lc = look[2] === 'grid' ? 'rgba(120,220,210,.13)' : U.rgba(look[1], 0.16);
        g.fillStyle = lc;
        if (look[2] === 'grid') { for (let x = -2000; x < 2000; x += 80) g.fillRect(x, F.y0 / z, 2, (F.y1 - F.y0) / z); for (let y = -1200; y < 1200; y += 80) g.fillRect(F.x0 / z, y, (F.x1 - F.x0) / z, 2); }
        else for (let r = -6; r <= 6; r++) { if (r === 0) continue; const y = r * size * 0.62; let x = -900; while (x < 900) { const w = 60 + U.h2(r, Math.floor(x), idx + env.seed) * 220; g.fillRect(x, y - size * 0.18, w, size * 0.2); x += w + 26; } }
      }
      let wx = -ww / 2;
      if (sent) {
        // place the sentence so the kept word sits exactly at the centre
        const pos = sent.indexOf(word);
        if (pos >= 0) {
          const before = sent.slice(0, pos), after = sent.slice(pos + word.length);
          g.font = T.font(fid, size * 0.62, 'normal');
          const bw = g.measureText(before).width;
          g.fillStyle = U.rgba(look[1], 0.85);
          g.fillText(before, -ww / 2 - bw - size * 0.15, size * 0.05);
          g.fillText(after, ww / 2 + size * 0.15, size * 0.05);
        }
      }
      if (p.marker && look[2] !== 'plain') { g.fillStyle = U.rgba(p.accent, 0.92); g.fillRect(wx - size * 0.12, -size * 0.78, ww + size * 0.24, size * 1.02); }
      g.font = T.font(fid, size, 'bold'); g.fillStyle = look[2] === 'plain' ? look[1] : '#111';
      if (look[2] === 'grid') g.fillStyle = '#111';
      g.fillText(word, wx, size * 0.05);
      g.restore();
    },
  });

  // ---------- 8. Social / chat / news cards ----------
  register({
    id: 'social', name: 'Social, chat & news card', family: 'social',
    fields: [{ k: 'name', label: 'Name / app / headline' }, { k: 'handle', label: 'Handle / time / tag' }, { k: 'text', label: 'Text (chat: one message per line, > = sent by you)', multi: true }, { k: 'likes', label: 'Likes / extra' }],
    params: [P.sel('kind', 'Kind', [['post', 'Social post card'], ['chat', 'Chat messages'], ['comment', 'Video comment'], ['notify', 'Phone notification'], ['ticker', 'Breaking news ticker'], ['search', 'Search bar typing']], 'post'),
      P.sel('theme', 'Theme', [['dark', 'Dark'], ['light', 'Light']], 'dark'), P.color('accent', 'Accent', '#1d9bf0'), P.font('notoSans'), P.num('scale', 'Size', 1, 0.5, 1.8),
      P.num('inDur', 'In time (s)', 0.7, 0.2, 3), P.num('outDur', 'Out time (s)', 0.4, 0, 2), P.num('speed', 'Ticker speed', 260, 60, 800, 1)],
    dur: 5,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, dur = env.dur, dark = p.theme === 'dark', ac = p.accent, F = frame(env);
      const bg = dark ? '#16181c' : '#ffffff', fg = dark ? '#e7e9ea' : '#0f1419', mut = dark ? '#8b98a5' : '#536471';
      const k = rev(t, dur, p.inDur, p.outDur) / p.inDur;
      const fnt = (s, w = 'bold') => T.font(p.font, s, w);
      const wrap = (str, s, w) => A.mkLayout({ text: str, font: p.font, size: s, weight: 'normal', maxW: w, align: 'left', valign: 'top', lineH: 1.32 });
      const drawWrapped = (L, x, y, col) => { g.font = L.fontStr; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; L.lines.forEach(l => g.fillText(l.words.map(w => w.text).join(' '), x + l.x, y + l.base)); };
      const avatar = (x, y, r, name, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = fnt(r * 0.95); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.clusters(name || '?')[0] || '?', x, y + r * 0.05); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; };
      const tick = (x, y, r) => { g.fillStyle = ac; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = r * 0.28; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * 0.45, y); g.lineTo(x - r * 0.1, y + r * 0.35); g.lineTo(x + r * 0.5, y - r * 0.35); g.stroke(); };
      g.save(); g.scale(p.scale, p.scale);
      if (p.kind === 'post' || p.kind === 'comment') {
        const W = p.kind === 'post' ? 980 : 1100, s = 40, TL = wrap(f.text || '', p.kind === 'post' ? 46 : 40, W - (p.kind === 'post' ? 80 : 170));
        const H = (p.kind === 'post' ? 190 : 140) + TL.H + (p.kind === 'post' ? 110 : 70);
        const e = U.ease.outBack(U.clamp(k)), a = U.clamp(k * 2);
        g.globalAlpha *= a; g.translate(0, (1 - e) * 60); g.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e);
        const x0 = -W / 2, y0 = -H / 2;
        if (p.kind === 'post') { g.fillStyle = bg; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 50; U.rrect(g, x0, y0, W, H, 28); g.fill(); g.shadowBlur = 0; }
        else { g.fillStyle = dark ? 'rgba(15,15,15,.94)' : 'rgba(255,255,255,.97)'; U.rrect(g, x0, y0, W, H, 22); g.fill(); }
        const ar = p.kind === 'post' ? 50 : 42;
        avatar(x0 + 40 + ar, y0 + 40 + ar, ar, f.name, ac);
        const nx = x0 + 40 + ar * 2 + 24;
        g.font = fnt(s); g.fillStyle = fg; g.fillText(f.name || '', nx, y0 + 40 + ar * 0.75);
        const nw = g.measureText(f.name || '').width;
        if (p.kind === 'post') { tick(nx + nw + 26, y0 + 40 + ar * 0.62, 17); g.font = fnt(32, 'normal'); g.fillStyle = mut; g.fillText(f.handle || '', nx, y0 + 40 + ar * 1.6); drawWrapped(TL, x0 + 40, y0 + 170, fg); }
        else { g.font = fnt(30, 'normal'); g.fillStyle = mut; g.fillText(f.handle || '', nx + nw + 18, y0 + 40 + ar * 0.75); drawWrapped(TL, nx, y0 + 40 + ar * 1.1, fg); }
        // counts that tick up
        const cnt = +String(f.likes || 0).replace(/[^\d]/g, '') || 0, c = Math.round(cnt * U.ease.outExpo(U.range(t, p.inDur, p.inDur + 2.6)));
        const cs = T.formatNumber(c, cnt >= 1e5 ? 'compact' : 'indian', cnt >= 1e5 ? 1 : 0);
        const by = y0 + H - 50;
        g.font = fnt(32, 'normal'); g.fillStyle = mut;
        if (p.kind === 'post') {
          const ix = [x0 + 40, x0 + 290, x0 + 540];
          // small counts as whole numbers ("362", not "362.0"); compact only from 10,000 up ("12.4K")
          const small = v => (v >= 1e4 ? T.formatNumber(v, 'compact', 1) : T.formatNumber(v, 'indian', 0));
          ['💬', '🔁', '♥'].forEach((ic, i) => { g.fillStyle = i === 2 && t > p.inDur + 1.2 ? '#f91880' : mut; g.fillText(ic + '  ' + (i === 2 ? cs : small(Math.round(c * (i ? 0.18 : 0.06)))), ix[i], by); });
        } else {
          g.fillText('👍  ' + cs + '     👎     ' + (env.lang === 'hi' ? 'जवाब दें' : 'Reply'), nx, by);
        }
      } else if (p.kind === 'chat') {
        const W = 860, msgs = String(f.text || '').split('\n').map(s => s.trim()).filter(Boolean);
        const hh = 110, e = U.ease.out(U.clamp(k));
        g.globalAlpha *= U.clamp(k * 2); g.translate(0, (1 - e) * 80);
        // layout bubbles
        const bubbles = msgs.map(m => { const me = m.startsWith('>'); const L = wrap(me ? m.slice(1).trim() : m, 38, W * 0.66); return { me, L, h: L.H + 44, w: Math.max(...L.lines.map(l => l.w), 60) + 56 }; });
        const H = hh + 40 + bubbles.reduce((s, b) => s + b.h + 22, 0) + 30;
        const x0 = -W / 2, y0 = -H / 2;
        g.fillStyle = dark ? '#0b141a' : '#efe7de'; U.rrect(g, x0, y0, W, H, 30); g.fill();
        g.fillStyle = dark ? '#202c33' : '#008069'; U.rrect(g, x0, y0, W, hh, 30); g.fill(); g.fillRect(x0, y0 + hh - 30, W, 30);
        avatar(x0 + 70, y0 + hh / 2, 36, f.name, '#6b7c85');
        g.font = fnt(38); g.fillStyle = '#fff'; g.fillText(f.name || '', x0 + 126, y0 + hh / 2 + 4);
        g.font = fnt(26, 'normal'); g.fillStyle = dark ? '#8696a0' : '#d9fdd3'; g.fillText(f.handle || (env.lang === 'hi' ? 'ऑनलाइन' : 'online'), x0 + 126, y0 + hh / 2 + 38);
        let y = y0 + hh + 34;
        const span = Math.max(0.5, dur - p.inDur - p.outDur - 0.8), per = span / Math.max(1, bubbles.length);
        bubbles.forEach((b, i) => {
          const ts = p.inDur + i * per, typing = !b.me && t > ts - 0.6 && t < ts && i > 0;
          const bx = b.me ? x0 + W - 30 - b.w : x0 + 30;
          if (typing) { g.fillStyle = dark ? '#202c33' : '#fff'; U.rrect(g, bx, y, 130, 64, 20); g.fill(); for (let d = 0; d < 3; d++) { g.fillStyle = mut; g.globalAlpha = 0.4 + 0.6 * (Math.floor(t * 6 + d) % 3 === 0); g.beginPath(); g.arc(bx + 38 + d * 28, y + 32, 8, 0, 7); g.fill(); g.globalAlpha = 1; } }
          const q = U.ease.outBack(U.range(t, ts, ts + 0.35)); if (q <= 0) { return; }
          g.save(); g.translate(b.me ? bx + b.w : bx, y); g.scale(q, q); g.translate(b.me ? -b.w : 0, 0);
          g.fillStyle = b.me ? (dark ? '#005c4b' : '#d9fdd3') : (dark ? '#202c33' : '#ffffff'); U.rrect(g, 0, 0, b.w, b.h, 18); g.fill();
          drawWrapped(b.L, 28, 22, dark ? '#e9edef' : '#111b21');
          if (b.me) { g.strokeStyle = '#53bdeb'; g.lineWidth = 3.5; g.beginPath(); [0, 10].forEach(o => { g.moveTo(b.w - 52 + o, b.h - 18); g.lineTo(b.w - 46 + o, b.h - 12); g.lineTo(b.w - 36 + o, b.h - 24); }); g.stroke(); }
          g.restore();
          y += b.h + 22;
        });
      } else if (p.kind === 'notify') {
        const W = 980, H = 190, top = F.y0 / p.scale + 40, e = U.ease.outBack(U.clamp(k));
        g.translate(0, U.lerp(top - H - 80, top, e) - 0);
        g.fillStyle = dark ? 'rgba(40,40,44,.92)' : 'rgba(246,246,248,.96)'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 40; U.rrect(g, -W / 2, 0, W, H, 42); g.fill(); g.shadowBlur = 0;
        g.fillStyle = ac; U.rrect(g, -W / 2 + 34, 34, 76, 76, 18); g.fill();
        g.fillStyle = '#fff'; g.font = fnt(44); g.textAlign = 'center'; g.fillText(T.clusters(f.name || 'N')[0], -W / 2 + 72, 88); g.textAlign = 'left';
        g.font = fnt(30, 'normal'); g.fillStyle = mut; g.fillText((f.name || '').toUpperCase(), -W / 2 + 134, 64);
        g.textAlign = 'right'; g.fillText(f.handle || (env.lang === 'hi' ? 'अभी' : 'now'), W / 2 - 40, 64); g.textAlign = 'left';
        const lines = String(f.text || '').split('\n');
        g.font = fnt(36); g.fillStyle = fg; g.fillText(lines[0] || '', -W / 2 + 134, 112);
        g.font = fnt(32, 'normal'); g.fillStyle = dark ? '#d0d0d4' : '#333'; g.fillText((lines[1] || '').slice(0, 60), -W / 2 + 134, 154);
      } else if (p.kind === 'ticker') {
        const FW = (F.x1 - F.x0) / p.scale, x0 = F.x0 / p.scale, H = 92, e = U.ease.outQuart(U.clamp(k));
        const tag = f.handle || (env.lang === 'hi' ? 'ब्रेकिंग न्यूज़' : 'BREAKING NEWS');
        g.font = fnt(40); const tw = g.measureText(tag).width + 70;
        g.fillStyle = '#0e1a3a'; g.fillRect(x0, -H / 2, FW * e, H);
        g.fillStyle = '#ffffff'; g.fillRect(x0, -H / 2 - 74, Math.min(FW, 1500) * U.ease.outQuart(U.range(k, 0.3, 1)), 74);
        g.save(); g.beginPath(); g.rect(x0, -H / 2 - 74, Math.min(FW, 1500) * U.ease.outQuart(U.range(k, 0.3, 1)), 74); g.clip();
        g.font = fnt(42); g.fillStyle = '#111'; g.fillText(f.name || '', x0 + tw + 30, -H / 2 - 22); g.restore();
        // crawl
        g.save(); g.beginPath(); g.rect(x0 + tw, -H / 2, FW * e - tw, H); g.clip();
        const crawl = String(f.text || '').replace(/\n/g, '  •  ') + '  •  ';
        g.font = fnt(40, 'normal'); const cw = g.measureText(crawl).width || 1;
        let x = x0 + tw + 40 - ((t * p.speed) % cw);
        g.fillStyle = '#fff'; while (x < x0 + FW) { g.fillText(crawl, x, 14); x += cw; }
        g.restore();
        g.fillStyle = '#d61f26'; g.fillRect(x0, -H / 2 - 74, tw * e, H + 74);
        g.fillStyle = '#fff'; g.font = fnt(40); g.save(); g.beginPath(); g.rect(x0, -H / 2 - 74, tw * e, H + 74); g.clip(); g.fillText(tag, x0 + 35, 10); g.restore();
        if (f.likes) { g.fillStyle = '#fff'; g.font = fnt(30); g.fillText(f.likes, x0 + 30, -H / 2 - 26); }
      } else if (p.kind === 'search') {
        const W = 1200, H = 110, e = U.ease.outBack(U.clamp(k));
        g.globalAlpha *= U.clamp(k * 2); g.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e);
        const sugg = String(f.likes || '').split('|').map(s => s.trim()).filter(Boolean);
        const q = f.text || '', cl = T.clusters(q), typeEnd = p.inDur + 0.25 + cl.length * 0.06, shown = cl.slice(0, Math.floor(cl.length * U.range(t, p.inDur + 0.2, typeEnd))).join('');
        const sp = U.ease.out(U.range(t, typeEnd + 0.1, typeEnd + 0.5)), sh = sugg.length * 76 * sp;
        g.fillStyle = dark ? '#303134' : '#fff'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30; U.rrect(g, -W / 2, -H / 2, W, H + sh + (sh ? 20 : 0), H / 2 > 40 && !sh ? H / 2 : 30); g.fill(); g.shadowBlur = 0;
        g.strokeStyle = mut; g.lineWidth = 6; g.beginPath(); g.arc(-W / 2 + 62, -6, 18, 0, 7); g.moveTo(-W / 2 + 75, 7); g.lineTo(-W / 2 + 90, 22); g.stroke();
        g.font = fnt(44, 'normal'); g.fillStyle = fg; g.fillText(shown, -W / 2 + 120, 15);
        if (Math.floor(t * 2.2) % 2 === 0 || t < typeEnd) { const cw = g.measureText(shown).width; g.fillStyle = ac; g.fillRect(-W / 2 + 124 + cw, -24, 4, 52); }
        g.save(); g.beginPath(); g.rect(-W / 2, H / 2, W, sh + 20); g.clip();
        sugg.forEach((s, i) => { g.fillStyle = mut; g.font = fnt(38, 'normal'); g.fillText('🔍', -W / 2 + 48, H / 2 + 56 + i * 76); g.fillStyle = fg; g.fillText(s, -W / 2 + 120, H / 2 + 56 + i * 76); });
        g.restore();
      }
      g.restore();
    },
  });

  // ---------- 9. Subtitles / captions ----------
  register({
    id: 'caption', name: 'Subtitles / captions', family: 'captions',
    fields: [{ k: 'text', label: 'Caption text (| splits phrases; otherwise auto)', multi: true }],
    params: [P.sel('style', 'Style', [['classic', 'Classic outline'], ['boxed', 'Boxed line'], ['karaoke', 'Karaoke word colour'], ['pop', 'Big pop words (Reels)'], ['wordbox', 'Box on spoken word'], ['reveal', 'Words appear as spoken'], ['cine', 'Cinematic serif']], 'classic'),
      P.font('mukta'), P.num('size', 'Size', 64, 30, 160, 1), P.num('words', 'Words per screen', 6, 1, 14, 1), P.color('color', 'Text colour', '#ffffff'), P.color('accent', 'Accent', '#ffd400'), P.num('width', 'Max width', 0.8, 0.3, 0.95)],
    dur: 6, y: 0.86,
    draw(g, it, t, env) {
      const p = it.p, f = it.f, dur = env.dur;
      const raw = String(f.text || '');
      let chunks;
      const words = T.parse(raw.replace(/\|/g, ' ')).map(w => w.text);
      if (raw.includes('|')) chunks = raw.split('|').map(s => T.parse(s).map(w => w.text)).filter(c => c.length);
      else { const n = p.style === 'pop' ? Math.min(3, p.words) : p.words; chunks = []; for (let i = 0; i < words.length; i += n) chunks.push(words.slice(i, i + n)); }
      // time per word, weighted by akshar count (like real speech)
      const wts = chunks.flat().map(w => 0.6 + T.clusters(w).length * 0.25), tot = wts.reduce((a, b) => a + b, 0) || 1;
      let acc = 0; const times = wts.map(w => { const s = acc / tot * dur; acc += w; return [s, acc / tot * dur]; });
      let wi = 0, ci = -1, cs = 0;
      chunks.forEach((c, i) => { const s = times[wi] ? times[wi][0] : 0; if (t >= s) { ci = i; cs = wi; } wi += c.length; });
      if (ci < 0) return;
      const chunk = chunks[ci];
      const cur = times.findIndex(([a, b]) => t >= a && t < b), local = cur - cs;
      const pop = p.style === 'pop', upper = pop;
      const o = { text: chunk.join(' '), font: pop && p.font === 'mukta' ? 'anton' : p.style === 'cine' ? 'notoSerif' : p.font, size: pop ? p.size * 1.5 : p.size, weight: 'bold', upper, maxW: env.fw * p.width, maxH: env.fh * 0.4, lineH: 1.2, valign: 'bottom', align: 'center' };
      const L = A.mkLayout(o);
      const ws = L.units.word;
      const chunkStart = times[cs][0];
      if (p.style === 'boxed') { g.fillStyle = 'rgba(0,0,0,.68)'; L.lines.forEach(l => { g.fillRect(l.x - 22, l.top - 6, l.w + 44, l.bottom - l.top + 12); }); }
      ws.forEach((w, i) => {
        const [ws0] = times[cs + i] || [0];
        const spoken = t >= ws0, isCur = i === local;
        let col = p.color, a = 1, sc = 1, dy = 0;
        if (p.style === 'karaoke') col = isCur ? p.accent : spoken ? p.color : U.rgba(p.color, 0.55);
        if (p.style === 'pop') { col = isCur ? p.accent : p.color; const q = U.range(t, ws0, ws0 + 0.15); sc = isCur ? 1 + 0.12 * Math.sin(q * Math.PI) + 0.06 : 1; if (!spoken) a = 0; }
        if (p.style === 'reveal') { const q = U.ease.out(U.range(t, ws0, ws0 + 0.25)); a = q; dy = (1 - q) * L.size * 0.4; }
        if (p.style === 'cine') a = U.range(t, chunkStart, chunkStart + 0.3);
        if (p.style === 'classic' || p.style === 'boxed') a = U.range(t, chunkStart, chunkStart + 0.08);
        if (a <= 0) return;
        g.save(); g.globalAlpha *= a;
        const cx = w.x + w.w / 2, cy = w.base - L.asc * 0.35;
        g.translate(cx, cy + dy); g.scale(sc, sc); g.translate(-cx, -cy);
        if (p.style === 'wordbox' && isCur) { g.fillStyle = p.accent; U.rrect(g, w.x - 12, w.line.top + 4, w.w + 24, w.line.bottom - w.line.top - 4, 10); g.fill(); }
        g.font = L.fontStr; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.lineJoin = 'round';
        if (p.style !== 'boxed' && p.style !== 'cine' && !(p.style === 'wordbox' && isCur)) { g.lineWidth = L.size * (pop ? 0.16 : 0.12); g.strokeStyle = '#000'; g.strokeText(w.text, w.x, w.base); }
        if (p.style === 'cine') { g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 14; g.shadowOffsetY = 3; }
        g.fillStyle = p.style === 'wordbox' && isCur ? (U.lum(p.accent) > 0.55 ? '#111' : '#fff') : col; g.fillText(w.text, w.x, w.base);
        g.restore();
      });
    },
  });

  return { register, byId, list };
})();
