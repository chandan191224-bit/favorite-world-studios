// Procedural paper: crumple shading (Voronoi facets + creases + folds), fibres, and
// full sheets (plain, coloured, kraft, newspaper, notebook, graph, gift wrap, parchment...).
PT.materials = (() => {
  const U = PT.util;
  const cache = new Map();
  const remember = (key, make) => {
    if (cache.has(key)) return cache.get(key);
    const v = make();
    cache.set(key, v);
    if (cache.size > 48) cache.delete(cache.keys().next().value); // phones: keep memory bounded
    return v;
  };

  const FONTS = {
    serif: "'Playfair Display','Noto Serif Devanagari','Kokila',Georgia,serif",
    body: "'Libre Baskerville','Noto Serif Devanagari','Nirmala UI',Georgia,serif",
    sans: "'Mukta','Noto Sans Devanagari','Nirmala UI','Segoe UI',Roboto,sans-serif",
    hand: "'Caveat','Kalam','Segoe Print','Nirmala UI',cursive",
  };

  const BASE = {
    white: '#f2f0eb', cream: '#efe5cf', grey: '#d4d4d2', kraft: '#b98c5c', cardboard: '#a77a4c',
    lavender: '#dcd7ea', pink: '#f1cdd5', black: '#202022', parchment: '#e2cd9e', newspaper: '#ebe5d5',
    notebook: '#f7f6f2', graph: '#f5f6f2',
  };
  const BACK = { kraft: '#c9a47c', cardboard: '#c4a17a', black: '#2c2c2e', newspaper: '#e3dfd4', parchment: '#e9dcbc', giftwrap: '#efe7d3' };
  const MATERIALS = [
    ['white', 'White paper'], ['cream', 'Cream paper'], ['grey', 'Grey paper'], ['lavender', 'Lavender paper'], ['pink', 'Pink paper'],
    ['color', 'Coloured paper (pick colour)'], ['kraft', 'Kraft / brown paper'], ['cardboard', 'Cardboard'], ['black', 'Black paper'],
    ['newspaper', 'Newspaper page'], ['notebook', 'Notebook (ruled + spiral)'], ['graph', 'Graph paper'], ['parchment', 'Old parchment'],
    ['giftwrap', 'Gift-wrap pattern'],
  ];

  // Grey shading map, 128 = neutral. Drawn with 'overlay' on top of any colour.
  function crumpleMap(W, H, seed, amount) {
    return remember(`cr|${W}|${H}|${seed}|${amount.toFixed(2)}`, () => {
      const sc = Math.min(1, 960 / Math.max(W, H));
      const w = Math.max(8, Math.round(W * sc)), h = Math.max(8, Math.round(H * sc));
      const c = U.canvas(w, h), g = c.getContext('2d');
      const img = g.createImageData(w, h), d = img.data;
      const R = U.rng(seed * 7 + 1);
      const N = Math.round(26 + 150 * amount);
      const cell = Math.sqrt((w * h) / N);
      const gx = Math.ceil(w / cell) + 1, gy = Math.ceil(h / cell) + 1;
      const sx = new Float32Array(gx * gy), sy = new Float32Array(gx * gy), sv = new Float32Array(gx * gy), gdx = new Float32Array(gx * gy), gdy = new Float32Array(gx * gy);
      for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
        const k = j * gx + i;
        sx[k] = (i + 0.1 + R() * 0.8) * cell; sy[k] = (j + 0.1 + R() * 0.8) * cell;
        sv[k] = (R() - 0.5) * 2; const a = R() * Math.PI * 2; gdx[k] = Math.cos(a); gdy[k] = Math.sin(a);
      }
      // a few long fold lines like a sheet that was folded once
      const folds = [];
      const nf = 1 + Math.floor(R() * 3 * amount + amount);
      for (let f = 0; f < nf; f++) { const a = R() * Math.PI; folds.push([Math.cos(a), Math.sin(a), (R() - 0.5) * w * 0.8, R() > 0.5 ? 1 : -1]); }
      const creaseW = cell * 0.09, facetK = 0.08 + 0.2 * amount, gradK = 0.3 * amount;
      for (let y = 0; y < h; y++) {
        const cy = Math.floor(y / cell);
        for (let x = 0; x < w; x++) {
          const cx = Math.floor(x / cell);
          let d1 = 1e9, d2 = 1e9, k1 = 0, k2 = 0;
          for (let j = cy - 1; j <= cy + 1; j++) {
            if (j < 0 || j >= gy) continue;
            for (let i = cx - 1; i <= cx + 1; i++) {
              if (i < 0 || i >= gx) continue;
              const k = j * gx + i, ddx = x - sx[k], ddy = y - sy[k], dd = ddx * ddx + ddy * ddy;
              if (dd < d1) { d2 = d1; k2 = k1; d1 = dd; k1 = k; } else if (dd < d2) { d2 = dd; k2 = k; }
            }
          }
          const e = Math.sqrt(d2) - Math.sqrt(d1);
          let v = sv[k1] * facetK + ((x - sx[k1]) * gdx[k1] + (y - sy[k1]) * gdy[k1]) / cell * gradK;
          if (e < creaseW) { const t = 1 - e / creaseW; v += (sv[k2] > sv[k1] ? 0.32 : -0.38) * t * t * (0.4 + amount); }
          for (const [fx, fy, off, sg] of folds) {
            const dist = (x - w / 2) * fx + (y - h / 2) * fy - off;
            v += sg * 0.07 * Math.tanh(dist / (cell * 0.6)) * amount;
            if (Math.abs(dist) < 1.4) v -= 0.12 * amount;
          }
          v += U.noise2(x * 0.06, y * 0.06, seed) * 0.05;
          const o = (y * w + x) * 4, val = U.clamp(128 + v * 128, 0, 255);
          d[o] = d[o + 1] = d[o + 2] = val; d[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }
  // fine paper fibre tile, used as a repeating pattern
  function fibreTile(seed) {
    return remember(`fib|${seed}`, () => {
      const n = 256, c = U.canvas(n, n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = 128 + U.noise2(x / 3.1, y / 3.1, seed) * 10 + U.noise2(x / 1.2, y / 9, seed + 5) * 7 + (U.h2(x, y, seed) - 0.5) * 14;
        const o = (y * n + x) * 4; d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }
  function applyPaperLook(g, W, H, seed, crumple, fibre = 0.5) {
    if (fibre > 0) {
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = fibre;
      g.fillStyle = g.createPattern(fibreTile(seed % 5), 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    }
    if (crumple > 0.01) {
      g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = Math.min(1, 0.45 + crumple * 0.6);
      g.imageSmoothingQuality = 'high';
      g.drawImage(crumpleMap(W, H, seed, crumple), 0, 0, W, H); g.restore();
    }
  }
  function vignette(g, W, H, amt) {
    const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${amt})`);
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  }

  const WORDS_EN = 'the government said on monday that new report shows growth in rural areas while experts warned prices could rise further after the monsoon season officials added that data from states will be released next week and the policy may change markets reacted with caution as farmers demanded support for crops villages water supply'.split(' ');
  const WORDS_HI = 'सरकार ने सोमवार को कहा कि नई रिपोर्ट में ग्रामीण क्षेत्रों में विकास दिखा है जबकि विशेषज्ञों ने चेतावनी दी कि मानसून के बाद कीमतें और बढ़ सकती हैं अधिकारियों ने बताया कि राज्यों के आंकड़े अगले हफ्ते जारी होंगे और नीति बदल सकती है किसानों ने फसलों के लिए मदद की मांग की गांव पानी बाजार'.split(' ');

  function drawNewspaper(g, W, H, sp, R) {
    const hi = sp.lang === 'hi';
    const words = hi ? WORDS_HI : WORDS_EN;
    const S = Math.min(W, H), m = W * 0.045, ink = '#1d1b18';
    g.fillStyle = ink; g.textBaseline = 'alphabetic';
    const mast = sp.masthead || (hi ? 'दैनिक समाचार' : 'The Daily Chronicle');
    g.textAlign = 'center';
    g.font = `800 ${S * 0.11}px ${FONTS.serif}`;
    g.fillText(mast, W / 2, m + S * 0.1, W - 2 * m);
    let y = m + S * 0.125;
    g.fillRect(m, y, W - 2 * m, S * 0.004); y += S * 0.03;
    g.font = `600 ${S * 0.018}px ${FONTS.sans}`; g.textAlign = 'left';
    g.fillText(sp.date || (hi ? 'नई दिल्ली · शनिवार' : 'NEW DELHI · SATURDAY'), m, y);
    g.textAlign = 'right'; g.fillText(hi ? 'मूल्य ₹5' : 'PRICE ₹5', W - m, y); g.textAlign = 'left';
    y += S * 0.012; g.fillRect(m, y, W - 2 * m, S * 0.0018); y += S * 0.02;
    const head = sp.headline || (hi ? 'देश भर में बड़ा बदलाव, नई रिपोर्ट ने सबको चौंकाया' : 'Big Change Across The Nation As New Report Stuns Experts');
    g.font = `800 ${S * 0.07}px ${FONTS.serif}`;
    const lines = wrap(g, head, W - 2 * m).slice(0, 2);
    for (const l of lines) { y += S * 0.07; g.fillText(l, m, y); }
    if (sp.sub) { g.font = `italic 500 ${S * 0.03}px ${FONTS.body}`; y += S * 0.045; g.fillText(sp.sub, m, y, W - 2 * m); }
    y += S * 0.03;
    const cols = W > H ? 5 : 3, gap = W * 0.018, cw = (W - 2 * m - gap * (cols - 1)) / cols;
    const photoCol = Math.floor(R() * (cols - 1));
    for (let c = 0; c < cols; c++) {
      const x = m + c * (cw + gap);
      let yy = y;
      if (c === photoCol || c === photoCol + 1) {
        if (c === photoCol) {
          const pw = cw * 2 + gap, ph = (H - y) * 0.42;
          const pg = g.createLinearGradient(x, yy, x + pw, yy + ph);
          pg.addColorStop(0, '#8d8a84'); pg.addColorStop(0.5, '#5f5c57'); pg.addColorStop(1, '#a6a29b');
          g.fillStyle = pg; g.fillRect(x, yy, pw, ph);
          g.fillStyle = 'rgba(255,255,255,0.12)';
          for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x + R() * pw, yy + R() * ph, pw * (0.08 + R() * 0.2), ph * (0.1 + R() * 0.25), R() * 3, 0, 7); g.fill(); }
          g.fillStyle = ink;
        }
        yy += (H - y) * 0.42 + S * 0.03;
      }
      g.fillRect(x + cw + gap / 2 - 0.5, y, c < cols - 1 ? 1 : 0, H - y - m);
      const lh = S * 0.024;
      g.font = `700 ${S * 0.026}px ${FONTS.serif}`;
      g.fillText(words.slice(Math.floor(R() * 20), Math.floor(R() * 20) + 4).join(' '), x, yy + lh, cw); yy += lh * 1.6;
      g.font = `400 ${S * 0.0155}px ${FONTS.body}`;
      while (yy < H - m) {
        let s = '';
        while (g.measureText(s).width < cw * 0.92) s += words[Math.floor(R() * words.length)] + ' ';
        g.fillText(s, x, yy, cw); yy += lh * 0.78;
        if (R() < 0.07) yy += lh * 0.6;
      }
    }
  }
  function wrap(g, text, maxW) {
    const out = []; let line = '';
    for (const w of String(text).split(/\s+/)) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  function drawNotebook(g, W, H, sp) {
    const S = Math.min(W, H), gapL = S / 19;
    g.strokeStyle = 'rgba(70,120,210,0.55)'; g.lineWidth = Math.max(1, S * 0.0022);
    for (let y = S * 0.16; y < H; y += gapL) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(220,60,70,0.75)'; g.lineWidth = Math.max(1, S * 0.003);
    const mx = W * 0.13; g.beginPath(); g.moveTo(mx, 0); g.lineTo(mx, H); g.stroke();
    // spiral holes
    const r = S * 0.016;
    for (let y = r * 3; y < H; y += r * 4.2) {
      g.fillStyle = 'rgba(60,60,60,0.85)'; g.beginPath(); g.arc(W * 0.045, y, r, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(W * 0.045 + r * 0.25, y + r * 0.25, r * 0.8, 0, 7); g.fill();
    }
    if (sp.text) {
      g.fillStyle = '#1f3d8a'; g.font = `600 ${S * 0.06}px ${FONTS.hand}`; g.textBaseline = 'alphabetic';
      let y = S * 0.16 + gapL * 2 - S * 0.008;
      for (const l of wrap(g, sp.text, W - mx - W * 0.08)) { g.fillText(l, mx + W * 0.03, y); y += gapL * 1.5; }
    }
  }
  function drawGraph(g, W, H) {
    const S = Math.min(W, H), s = S / 36;
    g.lineWidth = 1;
    for (let x = 0, i = 0; x < W; x += s, i++) { g.strokeStyle = i % 5 ? 'rgba(60,140,170,0.22)' : 'rgba(60,140,170,0.45)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0, i = 0; y < H; y += s, i++) { g.strokeStyle = i % 5 ? 'rgba(60,140,170,0.22)' : 'rgba(60,140,170,0.45)'; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }
  const GIFT = {
    trees: { bg: '#f1ece2', draw: (g, x, y, s, R) => { g.fillStyle = R() > 0.5 ? '#2e6b46' : '#c2313b'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y - s * (0.55 - k * 0.22)); g.lineTo(x - s * (0.22 + k * 0.08), y - s * (0.2 - k * 0.22)); g.lineTo(x + s * (0.22 + k * 0.08), y - s * (0.2 - k * 0.22)); g.fill(); } g.fillStyle = '#6b4a2e'; g.fillRect(x - s * 0.04, y + s * 0.2, s * 0.08, s * 0.12); } },
    snowmen: { bg: '#b8262f', draw: (g, x, y, s) => { g.fillStyle = '#fbfbf7'; g.beginPath(); g.arc(x, y + s * 0.12, s * 0.2, 0, 7); g.fill(); g.beginPath(); g.arc(x, y - s * 0.17, s * 0.13, 0, 7); g.fill(); g.fillStyle = '#1d1d1d'; g.fillRect(x - s * 0.12, y - s * 0.31, s * 0.24, s * 0.03); g.fillRect(x - s * 0.08, y - s * 0.46, s * 0.16, s * 0.16); g.fillStyle = '#f08a24'; g.fillRect(x, y - s * 0.18, s * 0.09, s * 0.025); } },
    gifts: { bg: '#b48a5e', draw: (g, x, y, s, R) => { const c = ['#c2313b', '#2e6b46', '#e7c25a'][Math.floor(R() * 3)]; g.fillStyle = c; g.fillRect(x - s * 0.2, y - s * 0.15, s * 0.4, s * 0.32); g.fillStyle = '#f5efe1'; g.fillRect(x - s * 0.03, y - s * 0.15, s * 0.06, s * 0.32); g.fillRect(x - s * 0.2, y - s * 0.02, s * 0.4, s * 0.05); g.beginPath(); g.ellipse(x - s * 0.07, y - s * 0.2, s * 0.08, s * 0.05, 0.4, 0, 7); g.ellipse(x + s * 0.07, y - s * 0.2, s * 0.08, s * 0.05, -0.4, 0, 7); g.fill(); } },
    stars: { bg: '#1f3c6e', draw: (g, x, y, s) => { g.fillStyle = '#f4d35e'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? s * 0.09 : s * 0.22, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } },
    dots: { bg: '#24305e', draw: (g, x, y, s) => { g.fillStyle = '#f5f1e6'; g.beginPath(); g.arc(x, y, s * 0.12, 0, 7); g.fill(); } },
    stripes: { bg: '#f1ece2', draw: null },
  };
  function drawGift(g, W, H, sp, R) {
    const p = GIFT[sp.pattern] || GIFT.trees, S = Math.min(W, H);
    g.fillStyle = sp.color && sp.pattern === 'dots' ? sp.color : p.bg; g.fillRect(0, 0, W, H);
    if (!p.draw) {
      g.save(); g.translate(W / 2, H / 2); g.rotate(-0.6);
      const st = S * 0.06; for (let x = -W * 1.5; x < W * 1.5; x += st * 2) { g.fillStyle = '#c2313b'; g.fillRect(x, -H * 1.5, st, H * 3); }
      g.restore(); return;
    }
    const s = S * 0.16;
    for (let y = s * 0.4, row = 0; y < H + s; y += s * 0.9, row++)
      for (let x = (row % 2) * s * 0.5; x < W + s; x += s) p.draw(g, x, y, s, R);
  }
  function drawParchment(g, W, H, seed) {
    const sc = 0.25, w = Math.round(W * sc), h = Math.round(H * sc), c = U.canvas(w, h), cg = c.getContext('2d'), img = cg.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = U.fbm2(x / 40, y / 40, seed, 5), e = Math.min(x, y, w - x, h - y) / (Math.min(w, h) * 0.5);
      const burn = U.clamp(1 - e * 2.2) * 0.55;
      const o = (y * w + x) * 4, v = U.clamp(0.5 + n * 0.8);
      d[o] = 120; d[o + 1] = 78; d[o + 2] = 32; d[o + 3] = Math.round(255 * U.clamp(v * 0.35 + burn));
    }
    cg.putImageData(img, 0, 0);
    g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, W, H);
  }

  // Full sheet canvas for a paper spec (cached).
  function sheet(sp, W, H) {
    const key = `sh|${W}|${H}|${JSON.stringify(sp)}`;
    return remember(key, () => {
      const c = U.canvas(W, H), g = c.getContext('2d');
      const m = sp.material || 'white', seed = sp.seed || 1, R = U.rng(seed);
      const crumple = sp.crumple == null ? 0.5 : +sp.crumple;
      if (m === 'giftwrap') drawGift(g, W, H, sp, R);
      else { g.fillStyle = m === 'color' ? (sp.color || '#f0c43c') : (BASE[m] || BASE.white); g.fillRect(0, 0, W, H); }
      if (m === 'kraft' || m === 'cardboard') {
        for (let i = 0; i < W * H / 900; i++) { g.fillStyle = R() > 0.5 ? 'rgba(70,40,15,0.18)' : 'rgba(255,240,210,0.14)'; g.fillRect(R() * W, R() * H, 1 + R() * 2.5, 1 + R() * 1.5); }
        g.strokeStyle = 'rgba(80,50,20,0.12)';
        for (let i = 0; i < 160; i++) { g.lineWidth = 0.6 + R(); g.beginPath(); const x = R() * W, y = R() * H; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 12); g.stroke(); }
        if (m === 'cardboard') { g.fillStyle = 'rgba(60,35,10,0.08)'; for (let y = 0; y < H; y += Math.min(W, H) / 40) g.fillRect(0, y, W, Math.min(W, H) / 80); }
      }
      if (m === 'newspaper') drawNewspaper(g, W, H, sp, R);
      if (m === 'notebook') drawNotebook(g, W, H, sp);
      if (m === 'graph') drawGraph(g, W, H);
      if (m === 'parchment') drawParchment(g, W, H, seed);
      applyPaperLook(g, W, H, seed, crumple, m === 'black' ? 0.25 : 0.5);
      if (m === 'color' || m === 'newspaper' || m === 'parchment' || sp.vignette) vignette(g, W, H, m === 'color' ? 0.32 : 0.22);
      if (m === 'newspaper') { g.fillStyle = 'rgba(200,170,90,0.07)'; g.fillRect(0, 0, W, H); }
      return c;
    });
  }
  // The underside of a torn piece (what the curled flaps show).
  function back(color, W, H, seed = 3) {
    return remember(`bk|${W}|${H}|${color}|${seed}`, () => {
      const c = U.canvas(W, H), g = c.getContext('2d');
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      applyPaperLook(g, W, H, seed, 0.28, 0.55);
      return c;
    });
  }
  const backColor = sp => (sp && sp.type === 'paper' ? (BACK[sp.material] || (sp.material === 'cream' ? '#f3ecdc' : '#f4f2ed')) : sp && sp.type === 'newspaper' ? BACK.newspaper : '#f4f2ed');

  // small lumpy crumpled-ball sprite (used by crumple, scatter, lower thirds)
  function ballSprite(color, size, seed) {
    return remember(`ball|${color}|${size}|${seed}`, () => {
      const c = U.canvas(size, size), g = c.getContext('2d'), R = U.rng(seed), r = size * 0.42, cx = size / 2;
      const pts = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = r * (0.82 + R() * 0.2); pts.push([cx + Math.cos(a) * rr, cx + Math.sin(a) * rr]); }
      g.save(); g.fill(U.pathFrom(pts)); g.clip(U.pathFrom(pts));
      g.fillStyle = color; g.fillRect(0, 0, size, size);
      for (let i = 0; i < 26; i++) {
        const a = R() * 7, d = R() * r, x = cx + Math.cos(a) * d, y = cx + Math.sin(a) * d, s = r * (0.25 + R() * 0.45);
        g.fillStyle = R() > 0.5 ? `rgba(255,255,255,${0.15 + R() * 0.3})` : `rgba(0,0,0,${0.08 + R() * 0.22})`;
        g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) g.lineTo(x + (R() - 0.5) * s * 2, y + (R() - 0.5) * s * 2); g.fill();
      }
      const sh = g.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = sh; g.fillRect(0, 0, size, size);
      g.restore();
      return c;
    });
  }

  return { FONTS, MATERIALS, GIFT_PATTERNS: Object.keys(GIFT), sheet, back, backColor, crumpleMap, applyPaperLook, vignette, ballSprite, wrap, clear: () => cache.clear() };
})();
