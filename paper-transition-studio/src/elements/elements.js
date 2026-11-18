// Animated shot elements. Load after core/overlays.js; no DOM or timeline ownership.
(() => {
  'use strict';
  const U = PT.util, M = PT.materials, F = PT.fx.P;
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const num = (v, fallback) => Number.isFinite(+v) ? +v : fallback;
  const text = (key, label, def = '', area = false) => ({ key, label, type: 'text', def, area });
  const position = () => [
    F.range('x', 'Centre X', 0, 1, 0.005, 0.5),
    F.range('y', 'Centre Y', 0, 1, 0.005, 0.5),
    F.range('scale', 'Scale', 0.2, 2.5, 0.05, 1),
    F.range('rotate', 'Rotation (degrees)', -180, 180, 1, 0),
  ];
  const dimensions = (w, h) => [
    F.range('w', 'Width (short side)', 0.05, 1.2, 0.01, w),
    F.range('h', 'Height (short side)', 0.025, 1, 0.005, h),
  ];
  const paperFields = () => [
    F.select('material', 'Paper', M.MATERIALS, 'cream'),
    F.color('color', 'Custom paper colour', '#f4df9b'),
    F.color('textColor', 'Text colour', '#22201d'),
  ];

  // Entry/exit durations shorten with the element, including sub-frame lifetimes.
  function timing(lt, ld) {
    const t = Math.floor(Math.max(0, lt) * 12) / 12;
    const inD = Math.min(0.6, ld * 0.3), outD = Math.min(0.5, ld * 0.25);
    // Quantise elapsed EXIT time, rather than the whole clip, so a short clip
    // cannot disappear before its entrance has even been sampled.
    const outT = Math.floor(Math.max(0, lt - (ld - outD)) * 12) / 12;
    return { t, inD, enter: U.clamp(t / inD), leave: U.clamp(outT / outD) };
  }
  function register(id, name, group, fields, defaults, draw) {
    PT.overlays.register({ id, name, group, fields: position().concat(fields), defaults,
      draw(ctx, o, lt, ld, W, H) {
        if (!(W > 0 && H > 0 && ld > 0) || lt < 0 || lt >= ld) return;
        const S = Math.min(W, H), T = timing(lt, ld);
        if (T.leave >= 1) return;
        ctx.save();
        try {
          ctx.translate(num(o.x, 0.5) * W, num(o.y, 0.5) * H);
          ctx.rotate(num(o.rotate, 0) * RAD);
          const sc = Math.max(0.01, num(o.scale, 1)); ctx.scale(sc, sc);
          ctx.globalAlpha *= 1 - U.ease.in(T.leave);
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          draw(ctx, o, T, S, W, H, ld);
        } finally { ctx.restore(); }
      },
    });
  }
  function shadow(g, S, k = 1) {
    g.shadowColor = `rgba(24,18,12,${0.28 * k})`;
    g.shadowBlur = S * 0.018 * k;
    g.shadowOffsetX = S * 0.003 * k; g.shadowOffsetY = S * 0.008 * k;
  }
  function jitter(g, T, S, seed, strength = 1) {
    const frame = Math.floor(T.t * 12);
    g.translate((U.h1(frame, seed) - 0.5) * S * 0.0012 * strength,
      (U.h1(frame, seed + 1) - 0.5) * S * 0.0012 * strength);
  }
  function pop(g, T, S, seed) {
    const p = Math.max(0.001, U.ease.outBack(T.enter));
    g.scale(p, p); jitter(g, T, S, seed);
  }
  function box(o, S) {
    return [S * Math.max(0.01, num(o.w, 0.5)), S * Math.max(0.01, num(o.h, 0.3))];
  }
  // Inverse of the user's placement transform. Targets remain frame coordinates
  // when a callout or arrow is moved, rotated or resized in the inspector.
  function localPoint(x, y, o, W, H) {
    const dx = x * W - num(o.x, 0.5) * W, dy = y * H - num(o.y, 0.5) * H;
    const a = -num(o.rotate, 0) * RAD, sc = Math.max(0.01, num(o.scale, 1));
    return [(dx * Math.cos(a) - dy * Math.sin(a)) / sc,
      (dx * Math.sin(a) + dy * Math.cos(a)) / sc];
  }
  function tornRect(w, h, seed, rough = 0.2) {
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    let pts = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      pts = pts.concat(U.tornLine(...a, ...b, U.tornProfile(seed + i * 19, rough, Math.min(w, h)), Math.min(w, h) / 20));
    }
    return pts;
  }
  function paper(g, o, w, h, S, pts = null, crumple = 0.28) {
    const seed = num(o.seed, 7), edge = pts || tornRect(w, h, seed);
    const path = U.pathFrom(edge);
    g.save(); shadow(g, S); g.fillStyle = '#efebe1'; g.fill(path); g.restore();
    const sheet = M.sheet({ type: 'paper', material: o.material || 'cream',
      color: o.color, seed, crumple }, Math.ceil(w), Math.ceil(h));
    g.save(); g.clip(path); g.drawImage(sheet, -w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(255,255,250,0.92)'; g.lineWidth = S * 0.004; g.stroke(path);
    g.restore();
    if (PT.draw && PT.draw.fibres) PT.draw.fibres(g, edge, { S, rim: 0.55 }, seed);
    return path;
  }
  // Preserve explicit newlines, shrink to the available height, and keep Hindi
  // clusters intact: wrap at word boundaries, never split a string into letters.
  function paragraph(g, value, x, y, w, h, size, font, color, weight = 600, align = 'left') {
    if (!value || w <= 0 || h <= 0) return;
    const getLines = () => String(value).split(/\r?\n/).flatMap(s => {
      const lines = M.wrap(g, s, w); return lines.length ? lines : [''];
    });
    g.save();
    let lines;
    for (let n = 0; n < 14; n++) {
      g.font = `${weight} ${size}px ${font}`; lines = getLines();
      if (lines.length * size * 1.35 <= h && lines.every(l => g.measureText(l).width <= w)) break;
      size *= 0.88;
    }
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
    const lh = size * 1.35, top = y + Math.max(lh / 2, (h - lines.length * lh) / 2 + lh / 2);
    lines.forEach((line, i) => g.fillText(line, align === 'center' ? x + w / 2 : x, top + i * lh, w));
    g.restore();
  }
  function photo(g, id, x, y, w, h, S) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#dad9d2'; g.fillRect(x, y, w, h);
    const el = PT.media && PT.media[id] && PT.media[id].el;
    if (el && (el.naturalWidth || el.videoWidth || el.width) && (el.naturalHeight || el.videoHeight || el.height)) {
      g.translate(x, y); PT.sources.drawCover(g, el, w, h, 'cover', 0);
    } else {
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, '#d8d9ce'); gr.addColorStop(1, '#9da99e');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,250,0.25)';
      g.beginPath(); g.arc(x + w * 0.72, y + h * 0.3, h * 0.13, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.38, y + h * 0.38);
      g.lineTo(x + w * 0.7, y + h); g.fill();
      paragraph(g, 'Add a photo', x + w * 0.1, y + h * 0.67, w * 0.8, h * 0.22,
        S * 0.024, M.FONTS.sans, '#37433e', 600, 'center');
    }
    g.restore();
  }

  // Cache only the rubber impression: destination-out erodes the ink on this
  // private surface, never the underlying shot. Bound both resolution and count.
  const impressions = new Map();
  const inkMeasure = U.canvas(1, 1).getContext('2d');
  function stampInk(o, w, h) {
    const res = Math.min(1, 1200 / Math.max(w, h)), cw = Math.max(1, Math.ceil(w * res)), ch = Math.max(1, Math.ceil(h * res));
    const seed = num(o.seed, 7), value = String(o.text || '');
    // Web fonts may finish loading after the first preview frame.
    inkMeasure.font = `800 100px ${M.FONTS.sans}`;
    const key = JSON.stringify([value, o.color, seed, cw, ch, inkMeasure.measureText(value).width]);
    if (impressions.has(key)) return impressions.get(key);
    const c = U.canvas(cw, ch), g = c.getContext('2d'), R = U.rng(seed);
    g.scale(cw / w, ch / h); g.strokeStyle = g.fillStyle = o.color || '#b52227';
    g.lineWidth = h * 0.032; g.strokeRect(w * 0.025, h * 0.07, w * 0.95, h * 0.86);
    g.lineWidth = h * 0.012; g.strokeRect(w * 0.045, h * 0.14, w * 0.91, h * 0.72);
    paragraph(g, value, w * 0.08, h * 0.18, w * 0.84, h * 0.64, h * 0.53, M.FONTS.sans, o.color, 800, 'center');
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 650; i++) {
      g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`;
      const x = R() * w, y = R() * h;
      g.fillRect(x, y, h * (0.001 + R() * 0.012), h * (0.002 + R() * 0.014));
    }
    g.lineWidth = h * 0.009; g.strokeStyle = 'rgba(0,0,0,0.55)';
    for (let i = 0; i < 12; i++) {
      const x = R() * w, y = R() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * (0.01 + R() * 0.045), y - h * 0.06); g.stroke();
    }
    impressions.set(key, c);
    if (impressions.size > 8) impressions.delete(impressions.keys().next().value);
    return c;
  }
  register('stamp', 'Rubber stamp', 'Stamps & notes', [
    text('text', 'Stamp text', 'BREAKING'),
    F.select('color', 'Ink', [['#b52227', 'Red'], ['#254e91', 'Blue'], ['#252525', 'Black']], '#b52227'),
    ...dimensions(0.57, 0.19),
  ], { rotate: -9 }, (g, o, T, S) => {
    const [bw, h] = box(o, S), seed = num(o.seed, 7);
    // fit the stamp to its text: "सच" gets a compact stamp, "CLASSIFIED" the full width (Claude, 2026-10-29)
    inkMeasure.font = `800 ${h * 0.53}px ${M.FONTS.sans}`;
    const w = Math.min(bw, Math.max(h * 1.5, inkMeasure.measureText(String(o.text || '')).width + h * 0.75));
    const hit = U.clamp(T.t / Math.min(0.15, T.inD));
    g.globalAlpha *= hit;
    const sc = 1 + 0.6 * (1 - U.ease.in(hit)); g.scale(sc, sc);
    jitter(g, T, S, seed, 1 + 6 * U.clamp(1 - (T.t - 0.15) / 0.25));
    g.drawImage(stampInk(o, w, h), -w / 2, -h / 2, w, h);
  });

  register('sticky', 'Fluttering sticky note', 'Stamps & notes', [
    text('text', 'Handwritten note', 'याद रखिए…', true),
    F.select('color', 'Note colour', [['#f7e784', 'Yellow'], ['#f4b9cc', 'Pink'], ['#b4d9f0', 'Blue'], ['#cce59e', 'Green']], '#f7e784'),
    F.color('textColor', 'Pen colour', '#27323a'), ...dimensions(0.34, 0.34),
  ], { rotate: -5 }, (g, o, T, S, W, H) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7), arrival = U.ease.out(T.enter);
    g.translate(0, -(H + W + h) / Math.max(0.2, num(o.scale, 1)) * (1 - arrival));
    g.rotate((1 - arrival) * -0.65); g.scale(1, 0.45 + arrival * 0.55);
    jitter(g, T, S, seed, 1.2);
    const curl = Math.min(w, h) * (0.14 + Math.sin(T.t * 3 + seed) * 0.012);
    const x = w / 2, y = h / 2;
    const pts = [[-w / 2, -h / 2], [x, -h / 2], [x, y - curl], [x - curl, y], [-w / 2, y]];
    paper(g, { material: 'color', color: o.color, seed }, w, h, S, pts, 0.1);
    const adhesive = g.createLinearGradient(0, -h / 2, 0, -h * 0.24);
    adhesive.addColorStop(0, 'rgba(95,76,28,0.13)'); adhesive.addColorStop(1, 'rgba(95,76,28,0)');
    g.fillStyle = adhesive; g.fillRect(-w / 2, -h / 2, w, h * 0.26);
    paragraph(g, o.text, -w * 0.39, -h * 0.34, w * 0.78, h * 0.66, S * 0.044, M.FONTS.hand, o.textColor);
    const flap = U.pathFrom([[x, y - curl], [x - curl * 0.88, y - curl * 0.88], [x - curl, y]]);
    g.save(); shadow(g, S, 0.45);
    const fold = g.createLinearGradient(x - curl, y - curl, x, y);
    fold.addColorStop(0, '#fffce0'); fold.addColorStop(0.5, o.color); fold.addColorStop(1, '#9f955c');
    g.fillStyle = fold; g.fill(flap); g.restore();
    g.strokeStyle = 'rgba(255,255,240,0.8)'; g.lineWidth = S * 0.001; g.stroke(flap);
  });

  function tape(g, x, y, w, h, angle, seed, S, progress) {
    if (progress <= 0) return;
    g.save(); g.translate(x, y - (1 - progress) * S * 0.045); g.rotate(angle);
    g.scale(1, 0.6 + 0.4 * progress); g.globalAlpha *= progress * 0.66;
    const pts = tornRect(w, h, seed, 0.6), path = U.pathFrom(pts);
    g.save(); shadow(g, S, 0.3); g.fillStyle = '#e5d6ad'; g.fill(path); g.restore();
    g.save(); g.clip(path);
    const tex = M.sheet({ type: 'paper', material: 'color', color: '#e9ddb9', crumple: 0.08, seed }, Math.ceil(w), Math.ceil(h));
    g.drawImage(tex, -w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(255,255,235,0.75)'; g.lineWidth = S * 0.0018; g.stroke(path);
    g.restore(); g.restore();
  }
  const photoFields = () => [
    { key: 'media', label: 'Photo', type: 'media', def: '' },
    text('caption', 'Handwritten caption', 'Favorite World'),
    F.color('textColor', 'Caption colour', '#30302b'), ...dimensions(0.49, 0.4),
  ];
  register('tape-photo', 'Taped photo print', 'Photos', [
    ...photoFields(), F.bool('showCaption', 'Show caption', true),
  ], { rotate: -6 }, (g, o, T, S) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7), arrive = U.ease.outBack(T.enter);
    g.translate(0, -S * 0.8 * (1 - arrive)); g.rotate((1 - arrive) * 0.19);
    jitter(g, T, S, seed, 1.5);
    const border = Math.min(w, h) * 0.045;
    const captionH = o.showCaption && o.caption ? Math.min(h * 0.23, S * 0.09) : border;
    paper(g, { material: 'white', seed }, w, h, S, null, 0.16);
    photo(g, o.media, -w / 2 + border, -h / 2 + border, w - border * 2, Math.max(1, h - border - captionH), S);
    if (captionH > border) paragraph(g, o.caption, -w * 0.43, h / 2 - captionH, w * 0.86,
      captionH * 0.92, S * 0.032, M.FONTS.hand, o.textColor, 600, 'center');
    tape(g, -w * 0.35, -h * 0.43, w * 0.36, S * 0.048, -0.45, seed + 11, S, U.clamp((T.enter - 0.45) / 0.28));
    tape(g, w * 0.35, -h * 0.43, w * 0.36, S * 0.048, 0.45, seed + 27, S, U.clamp((T.enter - 0.7) / 0.3));
  });

  register('polaroid', 'Developing Polaroid', 'Photos', photoFields(), { rotate: 7, w: 0.4, h: 0.49 }, (g, o, T, S) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7), p = U.ease.out(T.enter);
    g.globalAlpha *= U.clamp(T.enter * 3); g.rotate((1 - p) * -TAU * 0.65);
    const sc = 0.3 + p * 0.7; g.scale(sc, sc); g.translate(0, -S * 0.5 * (1 - p));
    jitter(g, T, S, seed);
    // Polaroid stock has a machine-cut edge rather than a fibre tear.
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const path = U.pathFrom(corners);
    paper(g, { material: 'white', seed }, w, h, S, corners, 0.1);
    const b = Math.min(w, h) * 0.06, ph = Math.max(1, h * 0.77 - b), pw = w - b * 2;
    const x = -w / 2 + b, y = -h / 2 + b;
    g.save(); g.clip(path); photo(g, o.media, x, y, pw, ph, S);
    const develop = U.ease.inOut(U.clamp((T.t - Math.min(0.2, T.inD * 0.5)) / 1));
    g.fillStyle = `rgba(3,21,26,${(1 - develop) * 0.98})`; g.fillRect(x, y, pw, ph);
    g.fillStyle = `rgba(22,159,174,${(1 - develop) * 0.22})`; g.fillRect(x, y, pw, ph); g.restore();
    paragraph(g, o.caption, -w * 0.43, h * 0.29, w * 0.86, h * 0.17,
      S * 0.033, M.FONTS.hand, o.textColor, 600, 'center');
  });

  // Draw a polyline by arc length, with a round nib that varies along the path.
  // Its finished shape is seeded; only the reveal changes with time.
  function stroke(g, pts, progress, width, color, seed) {
    if (progress <= 0 || pts.length < 2) return;
    const lengths = [], n = pts.length - 1;
    let total = 0;
    for (let i = 0; i < n; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lengths.push(l); total += l; }
    let left = total * U.clamp(progress);
    g.strokeStyle = color;
    for (let i = 0; i < n && left > 0; i++) {
      const a = pts[i], b = pts[i + 1], l = lengths[i], p = Math.min(1, left / (l || 1));
      g.lineWidth = width * (0.82 + 0.28 * U.noise1(i * 0.22, seed));
      g.beginPath(); g.moveTo(...a); g.lineTo(U.lerp(a[0], b[0], p), U.lerp(a[1], b[1], p)); g.stroke();
      left -= l;
    }
  }
  function curvedLine(a, b, bend, seed, S, n = 48) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, deviation = Math.sin(Math.PI * t) * bend + U.noise1(i * 0.28, seed) * S * 0.0015 * Math.sin(Math.PI * t);
      pts.push([a[0] + dx * t + nx * deviation, a[1] + dy * t + ny * deviation]);
    }
    return pts;
  }
  register('marker-circle', 'Hand-drawn marker', 'Marker', [
    F.select('mode', 'Mark', [['circle', 'Circle / ellipse'], ['underline', 'Underline'], ['cross-out', 'Cross-out (X)'], ['arrow', 'Curved arrow']], 'circle'),
    F.select('color', 'Marker ink', [['#d72a26', 'Red'], ['#efbf24', 'Yellow'], ['#202429', 'Black']], '#d72a26'),
    ...dimensions(0.46, 0.24), F.range('width', 'Nib width', 0.002, 0.025, 0.001, 0.007),
    Object.assign(F.range('x2', 'Arrow target X', 0, 1, 0.005, 0.75), { when: o => o.mode === 'arrow' }),
    Object.assign(F.range('y2', 'Arrow target Y', 0, 1, 0.005, 0.65), { when: o => o.mode === 'arrow' }),
    Object.assign(F.range('bend', 'Arrow curve', -0.5, 0.5, 0.01, -0.12), { when: o => o.mode === 'arrow' }),
  ], {}, (g, o, T, S, W, H) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7), p = U.ease.out(T.enter), width = S * num(o.width, 0.007);
    const ink = (pts, t, k = 1, s = seed) => stroke(g, pts, t, width * k, o.color, s);
    g.globalAlpha *= 0.88;
    if (o.mode === 'arrow') {
      const end = localPoint(num(o.x2, 0.75), num(o.y2, 0.65), o, W, H);
      const pts = curvedLine([0, 0], end, num(o.bend, -0.12) * S, seed, S);
      ink(pts, U.clamp(p / 0.82));
      const before = pts[pts.length - 3], a = Math.atan2(end[1] - before[1], end[0] - before[0]);
      const len = Math.min(S * 0.045, Math.hypot(...end) * 0.3), head = U.clamp((p - 0.8) / 0.2);
      ink([[end[0] - Math.cos(a - 0.5) * len, end[1] - Math.sin(a - 0.5) * len], end,
        [end[0] - Math.cos(a + 0.5) * len, end[1] - Math.sin(a + 0.5) * len]], head);
    } else if (o.mode === 'underline') {
      ink(curvedLine([-w / 2, 0], [w / 2, 0], h * 0.13, seed, S), p);
      ink(curvedLine([-w * 0.42, h * 0.08], [w * 0.47, h * 0.08], h * 0.09, seed + 1, S), U.clamp((p - 0.72) / 0.28), 0.55);
    } else if (o.mode === 'cross-out') {
      ink(curvedLine([-w / 2, -h / 2], [w / 2, h / 2], h * 0.04, seed, S), U.clamp(p * 2));
      ink(curvedLine([-w / 2, h / 2], [w / 2, -h / 2], -h * 0.04, seed + 3, S), U.clamp(p * 2 - 1));
    } else {
      // The first loop passes its starting angle slightly; the lighter second
      // loop is offset just enough to show the hand retracing the ellipse.
      for (let loop = 0; loop < 2; loop++) {
        const pts = [];
        for (let i = 0; i <= 100; i++) {
          const a = -0.65 + i / 100 * TAU * 1.035, n = U.noise1(i * 0.17, seed + loop * 13);
          pts.push([Math.cos(a) * w * (0.5 + n * 0.008) + loop * S * 0.003,
            Math.sin(a) * h * (0.5 + n * 0.018) - loop * S * 0.002]);
        }
        ink(pts, loop ? U.clamp((p - 0.64) / 0.36) : U.clamp(p / 0.7), loop ? 0.62 : 1, seed + loop);
      }
    }
  });

  register('highlight', 'Highlighter swipe', 'Marker', [
    F.select('color', 'Highlighter', [['#ffe243', 'Yellow'], ['#94e66b', 'Green'], ['#ff9cbd', 'Pink']], '#ffe243'),
    F.range('opacity', 'Opacity', 0.1, 0.8, 0.05, 0.42), ...dimensions(0.63, 0.065),
  ], {}, (g, o, T, S) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7), p = U.ease.out(T.enter);
    if (p <= 0) return;
    const pts = tornRect(w, h, seed, 0.35), path = U.pathFrom(pts);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha *= num(o.opacity, 0.42);
    g.save(); g.beginPath(); g.rect(-w / 2 - S * 0.005, -h, w * p + S * 0.005, h * 2); g.clip();
    g.fillStyle = o.color; g.fill(path);
    g.globalAlpha *= 0.35; g.fillRect(-w / 2, -h * 0.23, w, h * 0.21);
    g.fillRect(-w / 2, h * 0.2, w, h * 0.12); g.restore();
  });

  register('callout', 'Torn-paper pointer', 'Callouts', [
    text('title', 'Title', 'ध्यान दीजिए'), text('body', 'Body', 'यहाँ एक ज़रूरी बात है।', true),
    F.range('px', 'Pointer target X', 0, 1, 0.005, 0.72),
    F.range('py', 'Pointer target Y', 0, 1, 0.005, 0.72),
    ...dimensions(0.52, 0.27), ...paperFields(),
  ], {}, (g, o, T, S, W, H) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7);
    pop(g, T, S, seed);
    const target = localPoint(num(o.px, 0.72), num(o.py, 0.72), o, W, H);
    const [tx, ty] = target;
    if (Math.abs(tx) > w / 2 || Math.abs(ty) > h / 2) {
      const hit = Math.min(w / 2 / (Math.abs(tx) || 1e-9), h / 2 / (Math.abs(ty) || 1e-9));
      const ex = tx * hit, ey = ty * hit, side = Math.abs(ex) >= w / 2 - 0.01;
      const base = Math.min(w, h) * 0.14;
      const bx = side ? Math.sign(ex) * (w / 2 - S * 0.008) : U.clamp(ex, -w / 2 + base, w / 2 - base);
      const by = side ? U.clamp(ey, -h / 2 + base, h / 2 - base) : Math.sign(ey) * (h / 2 - S * 0.008);
      const a = side ? [bx, by - base] : [bx - base, by];
      const b = side ? [bx, by + base] : [bx + base, by];
      const edge = U.tornLine(...a, tx, ty, U.tornProfile(seed + 72, 0.12, S * 0.18), S * 0.005)
        .concat(U.tornLine(tx, ty, ...b, U.tornProfile(seed + 73, 0.12, S * 0.18), S * 0.005), [a]);
      const pointer = U.pathFrom(edge);
      g.save(); shadow(g, S, 0.7); g.fillStyle = '#eee8d8'; g.fill(pointer); g.restore();
      g.save(); g.clip(pointer);
      const texture = M.sheet({ type: 'paper', material: o.material, color: o.color, seed, crumple: 0.28 }, Math.ceil(w), Math.ceil(h));
      g.fillStyle = g.createPattern(texture, 'repeat'); g.fill(pointer);
      g.lineWidth = S * 0.003; g.strokeStyle = '#fffdf5'; g.stroke(pointer); g.restore();
    }
    paper(g, o, w, h, S);
    const color = o.textColor;
    if (o.title) paragraph(g, o.title, -w * 0.42, -h * 0.39, w * 0.84, h * (o.body ? 0.32 : 0.78), S * 0.041, M.FONTS.sans, color, 800);
    if (o.body) paragraph(g, o.body, -w * 0.42, o.title ? -h * 0.015 : -h * 0.39, w * 0.84,
      h * (o.title ? 0.4 : 0.78), S * 0.027, M.FONTS.body, color, 400);
  });

  function pushpin(g, x, y, r, progress, S) {
    if (progress <= 0) return;
    g.save(); g.translate(x, y - S * 0.04 * (1 - progress));
    const bounce = Math.max(0.05, U.ease.outBack(progress)); g.scale(bounce, bounce);
    g.save(); shadow(g, S, 0.65);
    g.strokeStyle = '#b8b6af'; g.lineWidth = r * 0.2;
    g.beginPath(); g.moveTo(r * 0.2, r * 0.2); g.lineTo(r * 0.6, r * 1.5); g.stroke();
    const red = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    red.addColorStop(0, '#fa6d59'); red.addColorStop(0.45, '#ce2a27'); red.addColorStop(1, '#7c151b');
    g.fillStyle = red; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,245,220,0.65)'; g.beginPath(); g.ellipse(-r * 0.28, -r * 0.35, r * 0.28, r * 0.16, -0.4, 0, TAU); g.fill();
    g.restore();
  }
  register('pin-string', 'Investigation pins & string', 'Callouts', [
    text('points', '2–4 frame points: x,y;x,y;…', '0.25,0.35;0.52,0.27;0.72,0.63', true),
    F.color('color', 'String colour', '#b82529'),
    F.range('sag', 'String sag', 0, 0.15, 0.005, 0.035),
    F.range('pinSize', 'Pin size', 0.008, 0.035, 0.001, 0.015),
  ], {}, (g, o, T, S, W, H, ld) => {
    // Frame coordinates are authored around the default (.5,.5) anchor. Moving
    // x/y then translates the whole board; scale/rotate act on the whole board.
    const pts = String(o.points || '').split(';').map(p => p.trim().split(',').map(s => s.trim()))
      .filter(p => p.length === 2 && p.every(v => v !== '' && Number.isFinite(+v)))
      .slice(0, 4).map(p => [(U.clamp(+p[0]) - 0.5) * W, (U.clamp(+p[1]) - 0.5) * H]);
    if (pts.length < 2) return;
    const unit = Math.min(0.18, ld * 0.07), pinD = unit * 1.2, stringStart = (pts.length - 1) * unit + pinD;
    const stringD = Math.min(0.7, ld * 0.24), progress = U.clamp((T.t - stringStart) / stringD);
    const all = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], segment = [];
      for (let j = 0; j <= 30; j++) {
        const t = j / 30;
        segment.push([U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t) + Math.sin(t * Math.PI) * S * num(o.sag, 0.035)]);
      }
      all.push(...(i === 1 ? segment : segment.slice(1)));
    }
    g.save(); shadow(g, S, 0.2);
    stroke(g, all, progress, S * 0.0034, o.color, num(o.seed, 7)); g.restore();
    g.save(); g.globalAlpha *= 0.45;
    stroke(g, all.map(p => [p[0], p[1] - S * 0.0006]), progress, S * 0.0008, '#f4977c', num(o.seed, 7)); g.restore();
    pts.forEach((p, i) => pushpin(g, ...p, S * num(o.pinSize, 0.015), U.clamp((T.t - i * unit) / pinD), S));
  });

  register('counter', 'Rolling paper counter', 'Data', [
    F.range('from', 'Count from', -1000000000, 1000000000, 1, 0),
    F.range('to', 'Count to', -1000000000, 1000000000, 1, 100000),
    text('prefix', 'Prefix', '₹'), text('suffix', 'Suffix', ''),
    F.range('decimals', 'Decimal places', 0, 3, 1, 0), F.bool('indian', 'Indian number grouping', true),
    F.range('countDuration', 'Count duration (seconds)', 0.3, 6, 0.1, 1.8),
    text('label', 'Label underneath', 'कुल राशि'), ...dimensions(0.65, 0.28), ...paperFields(),
  ], {}, (g, o, T, S, W, H, ld) => {
    const [w, h] = box(o, S), seed = num(o.seed, 7);
    pop(g, T, S, seed); paper(g, o, w, h, S);
    const duration = Math.max(0.01, Math.min(num(o.countDuration, 1.8), ld * 0.65));
    const start = Math.min(0.25, ld * 0.08), p = U.clamp((T.t - start) / duration);
    const from = num(o.from, 0), to = num(o.to, 100000), decimals = U.clamp(Math.round(num(o.decimals, 0)), 0, 3);
    const formatter = new Intl.NumberFormat(o.indian ? 'en-IN' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const format = v => `${o.prefix || ''}${formatter.format(Object.is(v, -0) ? 0 : v)}${o.suffix || ''}`;
    // Six number changes per second, sampled at twelve frames, leave a visible
    // half-roll between impressions instead of simply replacing the whole line.
    const elapsed = Math.max(0, T.t - start), tick = Math.floor(elapsed * 6);
    const p0 = U.clamp(tick / (6 * duration)), p1 = U.clamp((tick + 1) / (6 * duration));
    const moving = p > 0 && p < 1;
    const previousValue = p >= 1 ? to : U.lerp(from, to, U.ease.out(p0));
    const currentValue = moving ? U.lerp(from, to, U.ease.out(p1)) : (p >= 1 ? to : from);
    const number = v => formatter.format(Object.is(v, -0) ? 0 : v);
    const digits = number(currentValue), oldDigits = number(previousValue);
    const current = format(currentValue), previous = format(previousValue);
    let size = S * 0.09;
    g.save();
    const samples = [format(from), format(to), current, previous];
    g.font = `800 ${size}px ${M.FONTS.sans}`;
    const maxW = Math.max(...samples.map(s => g.measureText(s).width), 1);
    size *= Math.min(1, w * 0.84 / maxW, h * 0.43 / size);
    g.font = `800 ${size}px ${M.FONTS.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.textColor;
    const cy = o.label ? -h * 0.07 : 0;
    g.beginPath(); g.rect(-w * 0.45, -h * 0.37, w * 0.9, h * 0.64); g.clip();
    if (moving && digits !== oldDigits) {
      const sign = to >= from ? 1 : -1, roll = U.ease.inOut(elapsed * 6 - tick), travel = size * 1.3;
      const prefix = String(o.prefix || ''), suffix = String(o.suffix || '');
      const left = -g.measureText(current).width / 2, startX = left + g.measureText(prefix).width;
      const numberW = g.measureText(digits).width;
      g.textAlign = 'left'; g.fillText(prefix, left, cy); g.fillText(suffix, startX + numberW, cy);
      let right = startX + numberW;
      // Only ASCII numeric glyphs are separated. Hindi affixes remain whole so
      // Devanagari shaping survives, and unchanged digits stay still.
      for (let i = digits.length - 1, j = oldDigits.length - 1; i >= 0; i--, j--) {
        const ch = digits[i], old = j >= 0 ? oldDigits[j] : '', cw = g.measureText(ch).width;
        right -= cw;
        if (ch === old || !/[0-9]/.test(ch)) { g.fillText(ch, right, cy); continue; }
        const newY = cy + sign * (1 - roll) * travel, oldY = cy - sign * roll * travel;
        g.save();
        g.beginPath(); g.rect(right - size * 0.05, cy - size * 0.64, cw + size * 0.1, size * 1.28); g.clip();
        for (let blur = 2; blur >= 1; blur--) {
          g.save(); g.globalAlpha *= 0.06;
          g.fillText(ch, right, newY + sign * blur * size * 0.035);
          if (old) g.fillText(old, right, oldY + sign * blur * size * 0.035); g.restore();
        }
        if (old) g.fillText(old, right, oldY); g.fillText(ch, right, newY); g.restore();
      }
    } else g.fillText(current, 0, cy, w * 0.86);
    g.restore();
    paragraph(g, o.label, -w * 0.42, h * 0.22, w * 0.84, h * 0.19, S * 0.027, M.FONTS.sans, o.textColor, 600, 'center');
  });
})();
