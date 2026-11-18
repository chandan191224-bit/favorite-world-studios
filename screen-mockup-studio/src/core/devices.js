// Device frames: generic (no brand) phone, tablet, laptop, monitor, TV, old CRT, cinema screen, floating window and
// full-frame. build(P) returns convex slab parts + the screen rectangle; the engine sorts, shades and textures them.
SM.devices = (() => {
  const S = SM.space, U = SM.util, { xf, chain, rotX, rotY, rotZ, outline, circle, D } = S;
  const list = [], byId = {};
  const P = { range: (key, label, min, max, step, def) => ({ key, label, type: 'range', min, max, step, def }),
    select: (key, label, options, def) => ({ key, label, type: 'select', options, def }), color: (key, label, def) => ({ key, label, type: 'color', def }),
    bool: (key, label, def) => ({ key, label, type: 'bool', def }) };
  function register(d) { d.params = d.params || []; d.defaults = {}; for (const p of d.params) d.defaults[p.key] = p.def; list.push(d); byId[d.id] = d; }

  const FINISH = { graphite: ['#3a3c42', '#26272b'], silver: ['#d5d8de', '#e6e7ea'], gold: ['#d9c39a', '#eadcc0'], midnight: ['#283244', '#1d2533'], white: ['#ececee', '#f6f6f6'], amber: ['#c98a2b', '#d9a24a'] };
  const finishSel = def => P.select('finish', 'Body colour', { graphite: 'Graphite', silver: 'Silver', gold: 'Gold', midnight: 'Midnight blue', white: 'White', amber: 'Amber' }, def);
  const BLACK = '#060607';

  // ---------- phone ----------
  register({
    id: 'phone', name: 'Phone', icon: '📱', aspect: 'tall',
    params: [finishSel('graphite'), P.select('orient', 'Orientation', { portrait: 'Portrait', landscape: 'Landscape' }, 'portrait'), P.bool('island', 'Camera pill', true)],
    build(p) {
      const land = p.orient === 'landscape', w = 75, h = 158, t = 8.4, [side, back] = FINISH[p.finish] || FINISH.graphite;
      const M = xf(land ? rotZ(90 * D) : S.I3);
      const parts = [
        { M, pts: outline(w, h, 11.5, 7), z0: -t / 2, z1: t / 2, mat: { front: BLACK, side, back, gloss: 0.6, rim: U.shade(side, 0.25), rimW: 0.9 }, host: true,
          decals(g, cam) { if (p.island) S.decal(g, cam, M, outline(19, 5.6, 2.8, 4, 0, h / 2 - 3.6 - 7.2), t / 2 + 0.12, '#020203'); } },
        { M, pts: outline(1.6, 9, 0.8, 2, -w / 2 - 0.6, 38), z0: -1.4, z1: 1.4, mat: { front: side, side, back: side, gloss: 0.5 } },
        { M, pts: outline(1.6, 15, 0.8, 2, -w / 2 - 0.6, 20), z0: -1.4, z1: 1.4, mat: { front: side, side, back: side, gloss: 0.5 } },
        { M, pts: outline(1.6, 22, 0.8, 2, w / 2 + 0.6, 26), z0: -1.4, z1: 1.4, mat: { front: side, side, back: side, gloss: 0.5 } },
        { M, pts: outline(27, 27, 7, 5, -w / 2 + 19, h / 2 - 19), z0: -t / 2 - 1.6, z1: -t / 2 + 0.2, mat: { front: back, side: U.shade(back, 0.1), back: U.shade(back, -0.08), gloss: 0.7 },
          decals(g, cam) { for (const [x, y] of [[-6, 6], [6, 6], [-6, -6]]) S.decal(g, cam, M, circle(4.3, 16, -w / 2 + 19 + x, h / 2 - 19 + y), -t / 2 - 1.65, '#0b0c0f', [0, 0, -1]); } },
      ];
      return { parts, screen: { M, w: w - 7, h: h - 7, cx: 0, cy: 0, z: t / 2 + 0.05, r: 9 }, bounds: { w: land ? h : w, h: land ? w : h, d: t, cx: 0, cy: 0 }, floorY: -(land ? w : h) / 2 - 10 };
    },
  });

  // ---------- tablet ----------
  register({
    id: 'tablet', name: 'Tablet', icon: '▭', aspect: 'any',
    params: [finishSel('silver'), P.select('orient', 'Orientation', { landscape: 'Landscape', portrait: 'Portrait' }, 'landscape')],
    build(p) {
      const land = p.orient !== 'portrait', w = 250, h = 178, t = 6.5, [side, back] = FINISH[p.finish] || FINISH.silver;
      const M = xf(land ? S.I3 : rotZ(90 * D));
      const parts = [{ M, pts: outline(w, h, 14, 7), z0: -t / 2, z1: t / 2, mat: { front: BLACK, side, back, gloss: 0.5, rim: U.shade(side, 0.2), rimW: 1 }, host: true,
        decals(g, cam) { S.decal(g, cam, M, circle(1.4, 10, 0, h / 2 - 5.2), t / 2 + 0.1, '#1a1c22'); } }];
      return { parts, screen: { M, w: w - 19, h: h - 19, cx: 0, cy: 0, z: t / 2 + 0.05, r: 6 }, bounds: { w: land ? w : h, h: land ? h : w, d: t, cx: 0, cy: 0 }, floorY: -(land ? h : w) / 2 - 14 };
    },
  });

  // ---------- laptop ----------
  let keyTex = null;
  function keyboard() {
    if (keyTex) return keyTex;
    const c = U.canvas(1000, 400), g = c.getContext('2d');
    g.fillStyle = '#2a2c31'; g.fillRect(0, 0, 1000, 400);
    const rows = [14, 14, 13, 12, 12, 9], kw = 1000 / 14.6;
    rows.forEach((n, r) => {
      const y = 14 + r * 63, hgt = r === 0 ? 34 : 54;
      let x = 10;
      for (let i = 0; i < n; i++) {
        let w = kw - 8;
        if (r === 5 && i === 4) w = kw * 5.2; // space bar
        if ((r === 2 || r === 3) && i === n - 1) w = (1000 - 10 - x) - 8;
        if (r === 4 && (i === 0 || i === n - 1)) w = kw * 1.5;
        g.fillStyle = '#111216'; U.rr(g, x, y, w, hgt, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)'; U.rr(g, x + 2, y + 2, w - 4, 6, 3); g.fill();
        x += w + 8;
      }
    });
    return (keyTex = c);
  }
  register({
    id: 'laptop', name: 'Laptop', icon: '💻', aspect: 'wide',
    params: [finishSel('silver'), P.range('open', 'Lid angle', 70, 135, 1, 108)],
    build(p) {
      const W = 320, Dp = 222, tb = 9, LH = 210, tl = 5.5, [side, back] = FINISH[p.finish] || FINISH.silver;
      const base = xf(rotX(-90 * D), [0, 0, 0]);
      const hinge = xf(S.I3, [0, tb, -Dp / 2 + 4]);
      const lid = chain(chain(hinge, xf(rotX(-((p.open || 108) - 90) * D))), xf(S.I3, [0, LH / 2, 0]));
      const deck = U.shade(side, -0.05);
      const parts = [
        { M: base, pts: outline(W, Dp, 12, 6), z0: 0, z1: tb, mat: { front: deck, side: U.shade(side, -0.12), back: U.shade(side, -0.3), gloss: 0.35 },
          decals(g, cam) {
            const kb = keyboard(), M = base;
            S.texSurface(g, cam, kb, (u, v) => S.tp(M, [-134 + u * 268, Dp / 2 - 18 - v * 104, tb + 0.06]), 3);
            S.decal(g, cam, M, outline(120, 72, 6, 4, 0, -Dp / 2 + 52), tb + 0.06, U.shade(deck, -0.07));
          } },
        { M: lid, pts: outline(W, LH, 11, 6), z0: -tl, z1: 0, mat: { front: '#0a0a0c', side: U.shade(side, -0.1), back, gloss: 0.45 }, host: true,
          decals(g, cam) { S.decal(g, cam, lid, circle(1.2, 10, 0, LH / 2 - 5.5), 0.1, '#1d1f25'); S.decal(g, cam, lid, outline(26, 26, 13, 6, 0, 8), -tl - 0.1, U.shade(back, 0.12), [0, 0, -1]); } },
      ];
      return { parts, screen: { M: lid, w: W - 16, h: LH - 26, cx: 0, cy: 4, z: 0.05, r: 3 }, bounds: { w: W, h: LH + 30, d: Dp, cx: 0, cy: LH / 2 - 8 }, floorY: -1 };
    },
  });

  // ---------- desktop monitor ----------
  register({
    id: 'monitor', name: 'Desktop monitor', icon: '🖥', aspect: 'wide',
    params: [finishSel('graphite')],
    build(p) {
      const w = 620, h = 362, t = 14, [side, back] = FINISH[p.finish] || FINISH.graphite;
      const M = xf(S.I3, [0, 330, 0]);
      const parts = [
        { M, pts: outline(w, h, 7, 4), z0: -t, z1: 0, mat: { front: '#0b0b0d', side, back, gloss: 0.35, rim: U.shade(side, 0.15), rimW: 0.8 }, host: true },
        { M: xf(S.I3, [0, 0, 0]), pts: outline(62, 300, 8, 4, 0, 170), z0: -t - 26, z1: -t - 10, mat: { front: side, side: U.shade(side, -0.1), back, gloss: 0.4 } },
        { M: xf(rotX(-90 * D), [0, 0, -t - 18]), pts: outline(240, 170, 20, 6), z0: 0, z1: 7, mat: { front: U.shade(side, 0.05), side: U.shade(side, -0.15), back, gloss: 0.5 } },
      ];
      return { parts, screen: { M, w: w - 14, h: h - 26, cx: 0, cy: 6, z: 0.05, r: 2 }, bounds: { w, h: h + 160, d: 170, cx: 0, cy: 270 }, floorY: -1 };
    },
  });

  // ---------- TV ----------
  register({
    id: 'tv', name: 'TV', icon: '📺', aspect: 'wide',
    params: [P.select('stand', 'Stand', { feet: 'Two feet', center: 'Centre stand', wall: 'Wall (no stand)' }, 'feet')],
    build(p) {
      const w = 980, h = 560, t = 20, side = '#1b1c20', back = '#141518';
      const M = xf(S.I3, [0, h / 2 + 46, 0]);
      const parts = [{ M, pts: outline(w, h, 6, 3), z0: -t, z1: 0, mat: { front: '#070708', side, back, gloss: 0.3, rim: '#2a2c31', rimW: 1 }, host: true,
        decals(g, cam) { S.decal(g, cam, M, outline(26, 3, 1.5, 2, 0, -h / 2 + 5), 0.1, '#3a3d44'); } }];
      if (p.stand === 'feet') for (const x of [-400, 400]) parts.push({ M: xf(rotY((x < 0 ? 18 : -18) * D), [x, 0, -8]), pts: [[-10, 0], [10, 0], [4, 60], [-4, 60]], z0: -50, z1: 50, mat: { front: '#24262b', side: '#2c2f35', back: '#1a1b1f', gloss: 0.5 } });
      if (p.stand === 'center') parts.push({ M: xf(S.I3, [0, 0, -t - 6]), pts: outline(60, 90, 6, 3, 0, 45), z0: -14, z1: 0, mat: { front: '#25272c', side: '#1e2024', back: '#18191c', gloss: 0.4 } },
        { M: xf(rotX(-90 * D), [0, 0, -t - 6]), pts: outline(300, 160, 18, 5), z0: 0, z1: 8, mat: { front: '#2a2c31', side: '#1f2125', back: '#18191c', gloss: 0.5 } });
      return { parts, screen: { M, w: w - 12, h: h - 14, cx: 0, cy: 1, z: 0.05, r: 1 }, bounds: { w, h: h + 50, d: 120, cx: 0, cy: h / 2 + 22 }, floorY: p.stand === 'wall' ? null : -1 };
    },
  });

  // ---------- old CRT TV ----------
  register({
    id: 'crt', name: 'Old CRT TV', icon: '📼', aspect: '4:3',
    params: [P.select('body', 'Cabinet', { wood: 'Wood', beige: 'Beige plastic', black: 'Black plastic' }, 'wood'), P.range('curve', 'Glass curve', 0, 1, 0.05, 0.6), P.range('scan', 'Scanlines', 0, 1, 0.05, 0.55)],
    build(p) {
      const col = { wood: ['#6b4423', '#4e2f17'], beige: ['#cdbf9f', '#a99a7b'], black: ['#26262a', '#1a1a1d'] }[p.body] || ['#6b4423', '#4e2f17'];
      const w = 460, h = 360, M = xf(S.I3, [0, h / 2, 0]);
      const parts = [
        { M: xf(S.I3, [0, h / 2 - 10, 0]), pts: outline(360, 290, 30, 5), z0: -330, z1: -60, mat: { front: col[1], side: U.shade(col[1], -0.1), back: U.shade(col[1], -0.25), gloss: 0.15 } },
        { M, pts: outline(w, h, 26, 6), z0: -60, z1: 0, mat: { front: col[0], side: U.shade(col[0], -0.12), back: col[1], gloss: 0.25 }, host: true,
          decals(g, cam) {
            S.decal(g, cam, M, outline(318, 252, 34, 6, -54, 10), 0.08, '#141414');
            for (const [y, rad] of [[90, 19], [36, 15]]) { S.decal(g, cam, M, circle(rad + 4, 20, 172, y), 0.1, U.shade(col[0], -0.35)); S.decal(g, cam, M, circle(rad, 20, 172, y), 0.2, '#1b1b1d'); S.decal(g, cam, M, outline(3, rad * 1.5, 1.5, 2, 172, y), 0.3, '#5d5f66'); }
            for (let i = 0; i < 7; i++) S.decal(g, cam, M, outline(56, 3.2, 1.6, 2, 172, -30 - i * 13), 0.1, U.shade(col[0], -0.42));
          } },
        { M: xf(rotX(-90 * D), [0, 0, -40]), pts: outline(380, 230, 10, 3), z0: 0, z1: 6, mat: { front: '#1d1d20', side: '#151517', back: '#111', gloss: 0.1 } },
      ];
      return { parts, screen: { M, w: 296, h: 230, cx: -54, cy: 10, z: 0.1, r: 30, bulge: 14 * (p.curve == null ? 0.6 : p.curve) }, bounds: { w, h, d: 330, cx: 0, cy: h / 2 }, floorY: -1,
        screenFx(g, W, H, t) {
          const s = p.scan == null ? 0.55 : p.scan;
          if (s > 0) { g.fillStyle = `rgba(0,0,0,${0.32 * s})`; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1.2); }
          const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
          v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
          g.fillStyle = `rgba(255,255,255,${0.025 + 0.02 * U.noise1(t * 9, 3)})`; g.fillRect(0, 0, W, H);
        } };
    },
  });

  // ---------- cinema ----------
  register({
    id: 'cinema', name: 'Cinema screen', icon: '🎬', aspect: '2.39:1',
    params: [P.bool('seats', 'Audience seats', true), P.bool('curtains', 'Curtains', true), P.bool('beam', 'Projector beam', true)],
    build(p) {
      const w = 1000, h = 418, M = xf(S.I3, [0, 520, 0]);
      const parts = [{ M: xf(S.I3, [0, 500, -6]), pts: outline(2400, 1500, 0, 1), z0: -4, z1: 0, mat: { front: '#0c0b0d', side: '#0c0b0d', amb: 1 }, host: false },
        { M, pts: outline(w + 24, h + 24, 0, 1), z0: -3, z1: 0, mat: { front: '#050505', side: '#050505', amb: 1 }, host: true }];
      if (p.curtains) for (const sgn of [-1, 1]) for (let i = 0; i < 6; i++) {
        const x = sgn * (w / 2 + 40 + i * 44);
        parts.push({ M: xf(S.I3, [x, 470, 20 + (i % 2) * 10]), pts: outline(46, 1000, 22, 4), z0: -10, z1: 10, mat: { front: i % 2 ? '#5a0d14' : '#741520', side: '#3c080d', amb: 0.55, gloss: 0.15 } });
      }
      if (p.seats) for (let r = 0; r < 3; r++) for (let i = -8; i <= 8; i++) {
        const z = 640 + r * 120, y = 262 - r * 34;
        parts.push({ M: xf(S.I3, [i * 92 + (r % 2) * 46, y, z]), pts: outline(76, 120, 18, 4, 0, 60), z0: -12, z1: 12, mat: { front: '#16100f', side: '#120d0c', back: '#100b0a', amb: 0.7, gloss: 0.1 } });
      }
      return { parts, screen: { M, w, h, cx: 0, cy: 0, z: 0.05, r: 0 }, bounds: { w: w * 1.18, h: h * 1.25, d: 10, cx: 0, cy: 520 }, floorY: null, cinema: p };
    },
  });

  // ---------- floating window / screen card ----------
  register({
    id: 'window', name: 'Floating window', icon: '🗔', aspect: 'any',
    params: [P.select('ratio', 'Shape', { '16:10': '16:10', '16:9': '16:9', '4:3': '4:3', '1:1': 'Square', '9:16': 'Tall 9:16' }, '16:10'), P.select('theme', 'Window', { dark: 'Dark', light: 'Light' }, 'dark'), P.range('thick', 'Thickness', 0, 20, 1, 4)],
    build(p) {
      const [a, b] = String(p.ratio || '16:10').split(':').map(Number), r = a / b;
      const w = r >= 1 ? 1000 : 1000 * r, h = r >= 1 ? 1000 / r : 1000, t = p.thick == null ? 4 : +p.thick;
      const M = xf();
      const fr = p.theme === 'light' ? '#e9ebef' : '#1d2028';
      return { parts: [{ M, pts: outline(w, h, 18, 6), z0: -t, z1: 0, mat: { front: fr, side: U.shade(fr, -0.25), back: U.shade(fr, -0.3), amb: 0.7, gloss: 0.2 }, host: true }],
        screen: { M, w, h, cx: 0, cy: 0, z: 0.05, r: 16, windowBar: p.theme || 'dark' }, bounds: { w, h, d: t, cx: 0, cy: 0 }, floorY: null, shadowCard: true };
    },
  });

  // ---------- full frame (no device) ----------
  register({
    id: 'flat', name: 'Full frame (no device)', icon: '⛶', aspect: 'frame',
    params: [],
    build(p, env) {
      const r = env.W / env.H, h = 1000, w = h * r, M = xf();
      return { parts: [{ M, pts: outline(w, h, 0, 1), z0: 0, z1: 0, mat: { front: '#000', side: '#000', amb: 1 }, host: true, flat: true }],
        screen: { M, w, h, cx: 0, cy: 0, z: 0.01, r: 0 }, bounds: { w, h, d: 0, cx: 0, cy: 0, exact: true }, floorY: null };
    },
  });

  return { list, byId, register, FINISH };
})();
