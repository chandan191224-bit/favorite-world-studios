// Documentary marks. All animation is reconstructed from layer time and seed.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;
  const TYPE = '"Special Elite", "Courier Prime", "Courier New", "Noto Sans Devanagari", "Mukta", monospace';
  const STAMP = '"Oswald", "Arial Narrow", Impact, "Noto Sans Devanagari", "Mukta", sans-serif';
  const MONO = '"JetBrains Mono", ui-monospace, Consolas, "Noto Sans Devanagari", "Mukta", monospace';
  const TAU = Math.PI * 2;
  const pad = (n, digits = 2) => String(Math.floor(n)).padStart(digits, '0');
  const font = (g, size, face = MONO, weight = '') => { g.font = `${weight ? weight + ' ' : ''}${size}px ${face}`; };
  const single = value => String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ');
  function fit(g, text, size, width, face = MONO, weight = '') {
    font(g, size, face, weight);
    const measured = g.measureText(text).width;
    size *= Math.min(1, width / Math.max(1, measured));
    font(g, size, face, weight);
    return size;
  }
  function outlined(g, text, x, y, size, width, align = 'left') {
    fit(g, text, size, width);
    g.textAlign = align; g.textBaseline = 'top';
    g.lineJoin = 'round'; g.lineWidth = Math.max(1, size * 0.13);
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.fillStyle = '#f3f4eb';
    g.strokeText(text, x, y); g.fillText(text, x, y);
  }
  function corners(g, x, y, w, h, arm) {
    arm = Math.min(arm, w / 3, h / 3);
    g.beginPath();
    for (const [xx, yy, sx, sy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]) {
      g.moveTo(xx, yy + sy * arm); g.lineTo(xx, yy); g.lineTo(xx + sx * arm, yy);
    }
    g.stroke();
  }
  function rec(g, x, y, size, t, width) {
    if (Math.floor(Math.max(0, t) * 2) % 2) return;
    g.fillStyle = '#e53737'; g.beginPath(); g.arc(x + size * 0.24, y + size * 0.53, size * 0.22, 0, TAU); g.fill();
    outlined(g, 'REC', x + size * 0.8, y, size, width - size * 0.8);
  }
  function rect(P, e) {
    const x = U.clamp(P.x) * e.W, y = U.clamp(P.y) * e.H;
    return { x, y, w: Math.min(e.W - x, U.clamp(P.w) * e.W), h: Math.min(e.H - y, U.clamp(P.h) * e.H) };
  }
  const areaParams = (x, y, w, h) => [P.range('x', 'Area left', 0, 1, 0.01, x), P.range('y', 'Area top', 0, 1, 0.01, y),
    P.range('w', 'Area width', 0, 1, 0.01, w), P.range('h', 'Area height', 0, 1, 0.01, h)];

  function stampInk(g, p, e) {
    const text = single(p.text), size = p.size * e.S;
    font(g, size, STAMP, '700');
    // Measured width also invalidates the cache when a webfont finishes loading.
    const measured = g.measureText(text).width;
    const circle = p.border === 'circle', inset = size * 0.42;
    const w = circle ? Math.max(size * 3.6, measured * 0.62 + inset * 2) : Math.max(size * 2, measured + inset * 2);
    const h = circle ? w : size * 1.95;
    return U.cache(`docs:stamp:${JSON.stringify([e.seed, size, measured, text, p.color, p.border])}`, () => {
      const c = U.canvas(Math.ceil(w + 12 * e.S), Math.ceil(h + 12 * e.S)), cg = U.ctx2(c);
      const cx = c.width / 2, cy = c.height / 2;
      cg.translate(cx, cy); cg.fillStyle = p.color; cg.strokeStyle = p.color;
      cg.lineWidth = Math.max(1, size * 0.055); cg.lineJoin = 'round';
      if (circle) {
        const r = w / 2 - size * 0.1;
        cg.beginPath(); cg.arc(0, 0, r, 0, TAU); cg.stroke();
        cg.lineWidth *= 0.45; cg.beginPath(); cg.arc(0, 0, r - size * 0.17, 0, TAU); cg.stroke();
        // A shaped central imprint preserves complex scripts in circular seals.
        fit(cg, text, size * 0.72, w * 0.78, STAMP, '700');
        cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText(text, 0, size * 0.03);
        cg.lineWidth = size * 0.025;
        for (const sign of [-1, 1]) {
          cg.beginPath(); cg.moveTo(-w * 0.22, sign * w * 0.2); cg.lineTo(w * 0.22, sign * w * 0.2); cg.stroke();
          cg.beginPath(); cg.arc(0, sign * w * 0.31, size * 0.07, 0, TAU); cg.fill();
        }
      } else {
        if (p.border !== 'none') {
          cg.strokeRect(-w / 2, -h / 2, w, h);
          if (p.border === 'double') {
            const d = size * 0.15; cg.lineWidth *= 0.45;
            cg.strokeRect(-w / 2 + d, -h / 2 + d, w - d * 2, h - d * 2);
          }
        }
        font(cg, size, STAMP, '700'); cg.textAlign = 'center'; cg.textBaseline = 'middle';
        cg.fillText(text, 0, size * 0.04);
      }
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'destination-out';
      const random = U.rng(e.seed + 401), density = Math.min(6500, Math.ceil(w * h / Math.max(1, e.S * e.S) / 150));
      // Sparse pinholes, dry streaks and broad light patches erode only the ink.
      for (let i = 0; i < density; i++) {
        cg.globalAlpha = 0.25 + random() * 0.7;
        const x = random() * c.width, y = random() * c.height;
        cg.fillRect(x, y, (0.5 + random() * 2.6) * e.S, (0.4 + random() * 1.6) * e.S);
      }
      for (let i = 0; i < 34; i++) {
        cg.globalAlpha = 0.07 + random() * 0.22;
        cg.fillRect(random() * c.width, random() * c.height, (3 + random() * 24) * e.S, (1 + random() * 12) * e.S);
      }
      return c;
    });
  }
  register({
    id: 'stamp', name: 'Rubber stamp slam', family: 'docs', kind: 'overlay', blend: 'multiply', event: true, dur: 1.2,
    desc: 'A worn rubber imprint lands with a short impact and remains on the picture.',
    params: [P.text('text', 'Stamp text', 'CLASSIFIED'), P.color('color', 'Ink colour', '#c8102e'),
      P.select('border', 'Border', [['double','Double rectangle'],['single','Single rectangle'],['none','No border'],['circle','Circle seal']], 'double'),
      P.range('rotation', 'Rotation (degrees)', -25, 25, 1, -12), P.range('x', 'Position X', 0, 1, 0.01, 0.5),
      P.range('y', 'Position Y', 0, 1, 0.01, 0.5), P.range('size', 'Letter size', 24, 160, 1, 100)],
    draw(g, p, e) {
      const c = stampInk(g, p, e), q = U.range(e.p, 0, 0.12);
      const scale = q < 1 ? U.lerp(1.6, 1, U.ease.outBack(q)) : 1;
      const angle = p.rotation * Math.PI / 180, cs = Math.abs(Math.cos(angle)), sn = Math.abs(Math.sin(angle));
      const bw = c.width * cs + c.height * sn, bh = c.width * sn + c.height * cs;
      const safe = 16 * e.S, base = Math.min(1, (e.W - safe * 2) / (bw * 1.6), (e.H - safe * 2) / (bh * 1.6));
      const rx = bw * base * 0.8 + safe, ry = bh * base * 0.8 + safe;
      const localFrame = Math.floor(Math.max(0, e.lt - e.dur * 0.12) * e.fps + 1e-6);
      const jolt = e.p >= 0.12 && localFrame < 2 ? (localFrame === 0 ? 2 : -1.2) * e.S : 0;
      g.save(); g.globalAlpha = U.sstep(0, 0.055, e.p);
      g.translate(U.clamp(p.x * e.W, rx, e.W - rx) + jolt, U.clamp(p.y * e.H, ry, e.H - ry) - jolt * 0.6);
      g.rotate(angle); g.scale(base * scale, base * scale); g.drawImage(c, -c.width / 2, -c.height / 2); g.restore();
    },
  });

  function redactLines(p, e, a) {
    return U.cache(`docs:redact:${JSON.stringify([e.seed, a.w, a.h, e.S, p.lines, p.height])}`, () => {
      const rows = [], n = Math.round(p.lines), pitch = a.h / Math.max(1, n), random = U.rng(e.seed + 81);
      for (let i = 0; i < n; i++) {
        const h = Math.min(p.height * e.S, pitch * 0.63), left = random() * a.w * 0.09;
        const width = Math.min(a.w - left, a.w * (0.48 + random() * 0.5));
        const gap = width * (0.03 + random() * 0.05), split = 0.3 + random() * 0.35;
        const bars = random() < 0.55 ? [[left, width * split], [left + width * split + gap, width * (1 - split) - gap]] : [[left, width]];
        const y = pitch * (i + 0.5) - h / 2;
        const paths = bars.map(([x, w], j) => {
          const points = [], count = Math.max(3, Math.ceil(w / Math.max(1, 32 * e.S)));
          for (let k = 0; k <= count; k++) points.push([x + w * k / count, y + U.h2(k, i * 3 + j, e.seed) * h * 0.07]);
          for (let k = count; k >= 0; k--) points.push([x + w * k / count, y + h - U.h2(k, i * 3 + j, e.seed + 9) * h * 0.07]);
          return points;
        });
        const strokes = []; let x = 0;
        while (x < a.w * 0.96) {
          const len = Math.min((12 + random() * 44) * e.S, a.w * 0.96 - x);
          strokes.push([x, len]); x += len + (7 + random() * 13) * e.S;
        }
        rows.push({ y, h, paths, strokes });
      }
      return rows;
    });
  }
  register({
    id: 'redact', name: 'Document redaction', family: 'docs', kind: 'overlay', event: true, dur: 2.5,
    desc: 'Ragged marker bars sweep across a document, or withdraw to reveal it.',
    params: [...areaParams(0.16, 0.28, 0.68, 0.4), P.range('lines', 'Number of lines', 1, 18, 1, 6),
      P.color('color', 'Marker colour', '#0b0b0b'), P.range('height', 'Bar height', 8, 68, 1, 28),
      P.range('speed', 'Sweep speed', 0.5, 2, 0.05, 1),
      P.select('mode', 'Animation', [['draw','Draw on'],['static','Static'],['reveal','Declassify: withdraw']], 'draw'), P.bool('typed', 'Faint typed lines', true)],
    draw(g, p, e) {
      const a = rect(p, e); if (a.w <= 0 || a.h <= 0) return;
      const rows = redactLines(p, e, a), end = Math.min(0.88, 0.85 / p.speed);
      g.save(); g.translate(a.x, a.y); g.beginPath(); g.rect(0, 0, a.w, a.h); g.clip();
      if (p.typed) {
        g.strokeStyle = 'rgba(105,104,99,0.38)'; g.lineWidth = Math.max(0.6, 2.2 * e.S); g.lineCap = 'round'; g.beginPath();
        rows.forEach(r => r.strokes.forEach(([x,w]) => { g.moveTo(x, r.y + r.h / 2); g.lineTo(x + w, r.y + r.h / 2); })); g.stroke();
      }
      rows.forEach((r, i) => {
        const start = end * 0.68 * i / Math.max(1, rows.length - 1);
        const q = p.mode === 'static' ? 1 : U.smooth(U.range(e.p, start, start + end * 0.32));
        // The right boundary travels left when declassifying: no marks escape the area.
        const progress = p.mode === 'reveal' ? 1 - q : q;
        if (progress <= 0) return;
        g.save(); g.beginPath(); g.rect(0, 0, a.w * progress, a.h); g.clip(); g.fillStyle = p.color;
        r.paths.forEach(points => { g.beginPath(); points.forEach(([x,y], j) => j ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath(); g.fill(); });
        g.restore();
      });
      g.restore();
    },
  });

  register({
    id: 'censor', name: 'Privacy censor rectangle', family: 'docs', kind: 'process',
    desc: 'Pixelate or soften just the selected part of the current picture.',
    params: [...areaParams(0.38, 0.22, 0.24, 0.34), P.select('mode', 'Censor method', [['pixelate','Pixelate'],['blur','Blur']], 'pixelate'),
      P.range('block', 'Block / blur size', 8, 80, 1, 32), P.bool('frame', 'Black frame', false)],
    process(g, p, e) {
      const a = rect(p, e); if (a.w < 1 || a.h < 1) return;
      const src = e.src(), block = p.block * e.S;
      g.save(); g.beginPath(); g.rect(a.x, a.y, a.w, a.h); g.clip();
      if (p.mode === 'blur') {
        // Include neighbouring pixels so the crop does not grow a dark halo.
        const bleed = block * 2, x = Math.max(0, Math.floor(a.x - bleed)), y = Math.max(0, Math.floor(a.y - bleed));
        const w = Math.min(e.W - x, Math.ceil(a.x + a.w + bleed) - x), h = Math.min(e.H - y, Math.ceil(a.y + a.h + bleed) - y);
        const crop = U.tmp('docs:censor:crop', w, h), cg = U.ctx2(crop); cg.drawImage(src, x, y, w, h, 0, 0, w, h);
        const soft = U.tmp('docs:censor:soft', w, h); U.ctx2(soft); U.blurInto(soft, crop, block, 'docs:censor:blur');
        g.drawImage(soft, x, y, w, h);
      } else {
        const c = U.tmp('docs:censor:blocks', Math.max(1, Math.ceil(a.w / block)), Math.max(1, Math.ceil(a.h / block))), cg = U.ctx2(c);
        cg.imageSmoothingEnabled = false; cg.drawImage(src, a.x, a.y, a.w, a.h, 0, 0, c.width, c.height);
        g.imageSmoothingEnabled = false; g.drawImage(c, a.x, a.y, a.w, a.h);
      }
      if (p.frame) { const line = Math.min(3 * e.S, a.w / 4, a.h / 4); g.strokeStyle = '#0b0b0b'; g.lineWidth = line; g.strokeRect(a.x + line / 2, a.y + line / 2, a.w - line, a.h - line); }
      g.restore();
    },
  });

  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('hi', { granularity: 'grapheme' }) : null;
  function letters(text) {
    if (segmenter) return Array.from(segmenter.segment(text), s => s.segment);
    // Keep combining marks, joiners and virama-linked consonants together.
    const result = []; let join = false;
    for (const ch of Array.from(text)) {
      const mark = /[\p{Mark}\u200c\u200d]/u.test(ch);
      if (result.length && (mark || join)) result[result.length - 1] += ch; else result.push(ch);
      join = ch === '\u094d' || ch === '\u200d';
    }
    return result;
  }
  function tape(width, height, e) {
    return U.cache(`docs:tape:${e.seed}:${width}:${height}:${e.S}`, () => {
      const c = U.canvas(width, height), g = U.ctx2(c), s = e.S;
      g.fillStyle = '#e8e1cf'; g.beginPath(); g.moveTo(9*s, 0); g.lineTo(c.width-9*s, 0);
      for (let i = 0; i <= 14; i++) g.lineTo(c.width - (3 + U.h1(i,e.seed)*9)*s, c.height*i/14);
      g.lineTo(9*s,c.height);
      for (let i = 14; i >= 0; i--) g.lineTo((3+U.h1(i,e.seed+41)*9)*s,c.height*i/14);
      g.closePath(); g.fill(); g.clip();
      for (let i = 0; i < 280; i++) {
        g.fillStyle = U.rgba('#776748', 0.025 + U.h1(i,e.seed+7)*0.04);
        g.fillRect(U.h1(i,e.seed+9)*c.width,U.h1(i,e.seed+13)*c.height, (1+U.h1(i,e.seed+11)*3)*s, s);
      }
      return c;
    });
  }
  register({
    id: 'label', name: 'Archival typewriter caption', family: 'docs', kind: 'overlay', event: true, dur: 3.5,
    desc: 'A shaped typewriter caption appears on torn paper tape or a soft dark backing.',
    params: [P.text('text', 'Caption', 'ARCHIVE FOOTAGE — 1947'), P.text('second', 'Second line', 'NEW DELHI'),
      P.select('position', 'Position', [['bottom-left','Bottom left'],['top-left','Top left'],['bottom-right','Bottom right'],['centre','Centre']], 'bottom-left'),
      P.range('size', 'Text size', 18, 76, 1, 36), P.color('color', 'Text colour', '#25231f'), P.bool('tape', 'Paper tape strip', true)],
    draw(g, p, e) {
      const first = single(p.text), second = single(p.second), a = letters(first), b = letters(second), count = a.length + b.length;
      const margin = 58 * e.S, padding = 27 * e.S, maxWidth = e.W - margin * 2 - padding * 2;
      font(g, p.size * e.S, TYPE);
      const factor = Math.min(1, maxWidth / Math.max(1, g.measureText(first).width, g.measureText(second).width * 0.72));
      const size = p.size * e.S * factor, lineHeight = size * 1.55;
      font(g, size, TYPE); const w1 = g.measureText(first).width;
      font(g, size * 0.72, TYPE); const w2 = g.measureText(second).width;
      const w = Math.max(w1, w2, size * 2) + padding * 2, h = padding * 2 + size * (second ? 2.75 : 1.45);
      const x = p.position === 'centre' ? (e.W-w)/2 : p.position === 'bottom-right' ? e.W-margin-w : margin;
      const y = p.position === 'centre' ? (e.H-h)/2 : p.position === 'top-left' ? margin : e.H-margin-h;
      g.save();
      if (p.tape) {
        g.shadowColor = 'rgba(0,0,0,0.28)'; g.shadowBlur = 7 * e.S; g.shadowOffsetY = 3 * e.S;
        g.drawImage(tape(Math.ceil(w), Math.ceil(h), e), x, y); g.shadowColor = 'transparent';
      } else {
        g.fillStyle = 'rgba(0,0,0,0.54)'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 14 * e.S;
        g.fillRect(x, y, w, h); g.shadowColor = 'transparent';
      }
      const revealLength = Math.min(count * 0.04, e.dur * 0.85), shown = Math.min(count, Math.floor(Math.max(0, e.lt) / Math.max(0.001, revealLength) * count));
      g.fillStyle = !p.tape && p.color === '#25231f' ? '#f0eadc' : p.color;
      g.textAlign = 'left'; g.textBaseline = 'top'; font(g, size, TYPE);
      const text1 = a.slice(0, shown).join(''), text2 = b.slice(0, Math.max(0, shown-a.length)).join('');
      g.fillText(text1, x+padding, y+padding);
      font(g, size*0.72, TYPE); if (second) g.fillText(text2, x+padding, y+padding+lineHeight);
      if (Math.floor(Math.max(0,e.lt)*2)%2 === 0) {
        const row2 = second && shown >= a.length; font(g, row2 ? size*0.72 : size, TYPE);
        const xx = x+padding+g.measureText(row2 ? text2 : text1).width + 2*e.S;
        g.fillRect(xx, y+padding+(row2 ? lineHeight : 0), Math.max(1,2*e.S), size*(row2 ? 0.72 : 1));
      }
      g.restore();
    },
  });

  // Gregorian arithmetic rather than host-clock parsing: identical across time zones.
  const leap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const monthDays = (y,m) => [31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
  function civilDay(y,m,d) {
    y -= m <= 2 ? 1 : 0;
    const era = Math.floor(y / 400), yy = y - era * 400, mm = m + (m > 2 ? -3 : 9);
    return era * 146097 + yy * 365 + Math.floor(yy/4) - Math.floor(yy/100) + Math.floor((153*mm+2)/5) + d - 1;
  }
  function civilFrom(day) {
    const era = Math.floor(day/146097), dd = day-era*146097;
    const yy = Math.floor((dd-Math.floor(dd/1460)+Math.floor(dd/36524)-Math.floor(dd/146096))/365);
    let y = yy+era*400;
    const doy = dd-(yy*365+Math.floor(yy/4)-Math.floor(yy/100)), mp = Math.floor((5*doy+2)/153);
    const d = doy-Math.floor((153*mp+2)/5)+1, m = mp+(mp<10 ? 3 : -9); y += m<=2 ? 1 : 0;
    return `${pad(y,4)}-${pad(m)}-${pad(d)}`;
  }
  function running(date, time, t) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date)), tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time));
    let y = dm ? +dm[1] : 2024, m = dm ? U.clamp(+dm[2],1,12) : 3, d = dm ? +dm[3] : 14;
    d = U.clamp(d,1,monthDays(y,m));
    const start = tm ? U.clamp(+tm[1],0,23)*3600 + U.clamp(+tm[2],0,59)*60 + U.clamp(+(tm[3]||0),0,59) : 8229;
    const seconds = start + Math.floor(Math.max(0,t)), day = Math.floor(seconds/86400), clock = seconds%86400;
    return { date: civilFrom(civilDay(y,m,d)+day), time: `${pad(clock/3600)}:${pad(clock%3600/60)}:${pad(clock%60)}` };
  }
  register({
    id: 'cctv', name: 'CCTV evidence camera', family: 'docs', kind: 'overlay',
    desc: 'Security-camera identification and a deterministic running calendar timestamp.',
    params: [P.text('cam', 'Camera label', 'CAM 03'), P.text('date', 'Start date (YYYY-MM-DD)', '2024-03-14'),
      P.text('time', 'Start time (HH:MM:SS)', '02:17:09'), P.bool('border', 'Corner border', true),
      P.bool('bar', 'Timestamp backing bar', true), P.bool('scanlines', 'Subtle scanlines', false)],
    draw(g, p, e) {
      const { W,H,S } = e, m = 48*S, size = 30*S, narrow = W < H, clock = running(p.date,p.time,e.t);
      const y = narrow ? m+size*1.65 : m, text = `${clock.date}  ${clock.time}`;
      g.save();
      if (p.scanlines) {
        const tile = U.cache(`docs:scan:${S}`, () => { const c = U.canvas(2,Math.max(2,4*S)), cg=U.ctx2(c); cg.fillStyle='rgba(0,0,0,0.075)'; cg.fillRect(0,0,2,Math.max(1,S)); return c; });
        g.fillStyle = g.createPattern(tile,'repeat'); g.fillRect(0,0,W,H);
      }
      if (p.bar) { g.fillStyle='rgba(0,0,0,0.42)'; g.fillRect(m-10*S,y-7*S,W-m*2+20*S,size*1.6); }
      outlined(g,single(p.cam),m,m,size,narrow ? W-2*m : W*0.3);
      outlined(g,text,W-m,y,size,narrow ? W-2*m : W*0.59,'right');
      rec(g,m,H-m-size,size,e.t,W-2*m);
      if (p.border) { g.strokeStyle='rgba(245,245,239,0.72)'; g.lineWidth=2*S; corners(g,24*S,24*S,W-48*S,H-48*S,42*S); }
      g.restore();
    },
  });

  function timecode(t, fps) {
    const actual = Math.max(1,fps || 25), rate = Math.round(actual);
    const n = Math.floor(Math.max(0,t)*actual+1e-6), seconds = Math.floor(n/rate);
    return `${pad(Math.floor(seconds/3600)%100)}:${pad(seconds%3600/60)}:${pad(seconds%60)}:${pad(n%rate,rate>100?3:2)}`;
  }
  register({
    id: 'viewfinder', name: 'Documentary viewfinder', family: 'docs', kind: 'overlay',
    desc: 'Camcorder brackets, recording indicator, frame timecode and exposure information.',
    params: [P.bool('recording','Recording indicator',true), P.bool('safe','Safe-area guides',false),
      P.bool('info','Camera information',true), P.bool('cross','Centre cross',true)],
    draw(g, p, e) {
      const { W,H,S } = e, m=65*S, size=29*S;
      g.save(); g.strokeStyle='rgba(245,247,238,0.9)'; g.lineWidth=2.5*S;
      corners(g,m,m,W-2*m,H-2*m,65*S);
      if (p.safe) {
        g.save(); g.strokeStyle='rgba(245,247,238,0.3)'; g.lineWidth=S; g.setLineDash([10*S,12*S]);
        g.strokeRect(W*0.1,H*0.1,W*0.8,H*0.8); g.restore();
      }
      if (p.cross) { g.beginPath(); g.moveTo(W/2-17*S,H/2); g.lineTo(W/2+17*S,H/2); g.moveTo(W/2,H/2-17*S); g.lineTo(W/2,H/2+17*S); g.stroke(); }
      if (p.recording) rec(g,m+18*S,m+20*S,size,e.t,W/2-m);
      const bx=W-m-90*S, by=m+22*S;
      g.strokeRect(bx,by,65*S,25*S); g.fillStyle='#f3f4eb'; g.fillRect(bx+67*S,by+7*S,5*S,11*S);
      for (let i=0;i<3;i++) g.fillRect(bx+(6+i*18)*S,by+5*S,13*S,15*S);
      const bottom=H-m-size-17*S;
      outlined(g,timecode(e.t,e.fps),W/2,bottom,size,W-2*m-20*S,'center');
      if (p.info) {
        outlined(g,`4K ${Math.round(e.fps||25)}P`,m+18*S,m+size*2.1,size*0.77,W/2-m);
        outlined(g,'ISO 800   F2.8',W-m-18*S,m+size*2.1,size*0.77,W/2-m,'right');
      }
      g.restore();
    },
  });

  register({
    id: 'osd', name: 'VHS on-screen display', family: 'docs', kind: 'overlay',
    desc: 'Outlined tape-deck playback symbols, a counter and a home-video date imprint.',
    params: [P.select('mode','Transport mode',[['play','PLAY'],['rec','REC'],['pause','PAUSE'],['rewind','REW'],['ff','FF']], 'play'),
      P.text('date','Date imprint','JAN. 14 1991'), P.bool('time','Show running counter',true),
      P.range('size','Display size',28,90,1,54), P.bool('tracking','Tracking adjustment bar',false)],
    draw(g, p, e) {
      const { W,H,S }=e, m=70*S, size=p.size*S;
      // Transport symbols are paths, so their appearance does not depend on symbol fonts.
      const word={play:'PLAY',rec:'REC',pause:'PAUSE',rewind:'REW',ff:'FF'}[p.mode]||'PLAY';
      g.save(); const f=fit(g,word,size,(W-2*m)*0.67,MONO,'700');
      g.textAlign='left'; g.textBaseline='top'; g.strokeStyle='#181921'; g.fillStyle='#f3f4eb'; g.lineWidth=4*S; g.lineJoin='miter';
      g.strokeText(word,m,m); g.fillText(word,m,m);
      const x=m+g.measureText(word).width+f*0.45, y=m+f*0.19, w=f*0.55, h=f*0.72;
      function triangle(xx,reverse) {
        g.beginPath(); g.moveTo(xx+(reverse?w:0),y); g.lineTo(xx+(reverse?0:w),y+h/2); g.lineTo(xx+(reverse?w:0),y+h); g.closePath(); g.stroke(); g.fill();
      }
      if (p.mode==='rec') { g.beginPath(); g.arc(x+w/2,y+h/2,h/2,0,TAU); g.stroke(); g.fill(); }
      else if (p.mode==='pause') { for(let i=0;i<2;i++) { g.strokeRect(x+i*w*0.75,y,w*0.35,h); g.fillRect(x+i*w*0.75,y,w*0.35,h); } }
      else { triangle(x,p.mode==='rewind'); if(p.mode==='rewind'||p.mode==='ff') triangle(x+w*1.05,p.mode==='rewind'); }
      const narrow=W<H, base=H-m-size*0.85;
      outlined(g,single(p.date),m,narrow?base-size*1.2:base,size*0.73,narrow?W-2*m:(W-2*m)*0.6);
      outlined(g,'SP',W-m,m,size*0.7,(W-2*m)*0.2,'right');
      if(p.time) outlined(g,timecode(e.t,1).slice(0,8),W-m,base,size*0.73,narrow?W-2*m:(W-2*m)*0.36,'right');
      if(p.tracking) {
        const yy=m+size*1.7; outlined(g,'TRACKING',m,yy,size*0.55,W-2*m);
        g.fillStyle='#f3f4eb'; g.strokeStyle='#181921'; g.lineWidth=2*S;
        const unit=Math.min(24*S,(W-2*m)/12);
        for(let i=0;i<8;i++) { const xx=m+i*unit*1.35; g.strokeRect(xx,yy+size*0.8,unit,14*S); if(i<5) g.fillRect(xx,yy+size*0.8,unit,14*S); }
      }
      g.restore();
    },
  });

  function dossierFrame(p,e) {
    const { W,H,S }=e, m=Math.max(38*S,p.margin*Math.min(W,H)), top=Math.max(m,158*S);
    return U.cache(`docs:dossier:${JSON.stringify([e.seed,W,H,p.margin,p.header,p.subject])}`, () => {
      const c=U.canvas(W,H), g=U.ctx2(c), random=U.rng(e.seed+740);
      // Even-odd clipping leaves the footage window completely transparent.
      g.beginPath(); g.rect(0,0,W,H); g.rect(m,top,W-2*m,H-top-m); g.clip('evenodd');
      g.fillStyle='#c9a36a'; g.fillRect(0,0,W,H);
      for(let i=0;i<3200;i++) {
        g.fillStyle=U.rgba(random()<0.5?'#5b3d1e':'#fff1d3',0.03+random()*0.07);
        g.fillRect(random()*W,random()*H,(1+random()*4)*S,(0.5+random()*2)*S);
      }
      g.strokeStyle='rgba(74,49,23,0.48)'; g.lineWidth=2*S; g.strokeRect(m-2*S,top-2*S,W-2*m+4*S,H-top-m+4*S);
      g.strokeStyle='rgba(255,238,202,0.4)'; g.strokeRect(13*S,13*S,W-26*S,H-26*S);
      // Metallic folded wire clip, inset far enough to stay on the folder header.
      g.save(); g.translate(58*S,26*S); g.rotate(-0.17); g.lineCap='round'; g.lineJoin='round';
      g.beginPath(); g.moveTo(0,58*S); g.lineTo(0,11*S); g.bezierCurveTo(0,-5*S,26*S,-5*S,26*S,11*S);
      g.lineTo(26*S,66*S); g.bezierCurveTo(26*S,84*S,-9*S,84*S,-9*S,66*S);
      g.lineTo(-9*S,17*S); g.bezierCurveTo(-9*S,7*S,11*S,7*S,11*S,17*S); g.lineTo(11*S,57*S);
      g.strokeStyle='#635e50'; g.lineWidth=6*S; g.stroke(); g.strokeStyle='#dbd7c8'; g.lineWidth=2.5*S; g.stroke(); g.restore();
      const x=Math.max(m,112*S), width=W-x-38*S;
      fit(g,single(p.header),32*S,width,TYPE); g.textAlign='left'; g.textBaseline='top'; g.fillStyle='#35291d'; g.fillText(single(p.header),x,40*S);
      fit(g,`SUBJECT: ${single(p.subject)}`,23*S,width,TYPE); g.fillText(`SUBJECT: ${single(p.subject)}`,x,94*S);
      return c;
    });
  }
  register({
    id:'dossier', name:'Case-file folder frame', family:'docs', kind:'overlay',
    desc:'Textured manila folder, wire paper clip and typed subject framing a clear footage window.',
    params:[P.text('header','File header','CASE FILE  No. 1947-07'), P.text('subject','Subject','TRANSFER OF POWER'),
      P.range('margin','Window margin',0.035,0.2,0.005,0.065)],
    draw(g,p,e) { g.drawImage(dossierFrame(p,e),0,0); },
  });

  preset('stamp-classified','Classified: red double stamp','stamp',{}, {dur:1.2});
  preset('stamp-top-secret','Top secret: red stamp','stamp',{text:'TOP SECRET',border:'single',rotation:-8}, {dur:1.2});
  preset('stamp-confidential','Confidential: worn red stamp','stamp',{text:'CONFIDENTIAL',rotation:-10,size:88}, {dur:1.2});
  preset('stamp-declassified','Declassified: green-grey stamp','stamp',{text:'DECLASSIFIED',color:'#596f60',rotation:7,size:88}, {dur:1.2});
  preset('stamp-evidence','Evidence: blue stamp','stamp',{text:'EVIDENCE',color:'#245c8b',border:'single',rotation:-6}, {dur:1.2});
  preset('stamp-archive','Archive 1947: circular black seal','stamp',{text:'ARCHIVE • 1947 •',color:'#24221f',border:'circle',size:66,rotation:-9}, {dur:1.2});
  preset('stamp-hindi','Confidential: Hindi stamp','stamp',{text:'गोपनीय',color:'#c8102e',size:110}, {dur:1.2});
  preset('redact-sweep','Redaction: sequential marker sweep','redact',{}, {dur:2.5});
  preset('redact-static-block','Redaction: static document block','redact',{mode:'static',lines:8,typed:true});
  preset('redact-reveal','Declassify: withdraw redaction bars','redact',{mode:'reveal',typed:true}, {dur:2.5});
  preset('censor-pixel-face','Privacy: pixelated face','censor',{x:0.38,y:0.2,w:0.24,h:0.34,mode:'pixelate',block:40});
  preset('censor-blur-plate','Privacy: blurred number plate','censor',{x:0.35,y:0.67,w:0.3,h:0.12,mode:'blur',block:48});
  preset('label-archive-tape','Archive: typewriter paper tape','label',{}, {dur:3.5});
  preset('label-location','Location: plain typewriter caption','label',{text:'NEW DELHI',second:'INDIA',tape:false,color:'#f0eadc',size:40}, {dur:3});
  preset('label-file-number','Case file: typed reference number','label',{text:'FILE NO. 47/IND/1947',second:'NATIONAL ARCHIVES',position:'top-left',size:32}, {dur:3.5});
  preset('label-hindi','Archive: Hindi paper caption','label',{text:'अभिलेख फुटेज — 1947',second:'नई दिल्ली',size:38}, {dur:3.5});
  preset('cctv-classic','CCTV: evidence timestamp and scanlines','cctv',{bar:true,border:true,scanlines:true});
  preset('cctv-minimal','CCTV: minimal camera identification','cctv',{bar:false,border:false,scanlines:false});
  preset('viewfinder-rec','Viewfinder: documentary recording','viewfinder',{recording:true,info:true,safe:true});
  preset('viewfinder-clean','Viewfinder: clean framing guides','viewfinder',{recording:false,info:false,safe:false,cross:true});
  preset('osd-play','VHS: play and date imprint','osd',{mode:'play'});
  preset('osd-rec','VHS: recording display','osd',{mode:'rec'});
  preset('osd-rewind','VHS: rewind with tracking adjustment','osd',{mode:'rewind',tracking:true});
  preset('osd-pause','VHS: paused tape display','osd',{mode:'pause',time:false});
  preset('dossier-case-file','Dossier: manila case-file window','dossier',{});
})();
