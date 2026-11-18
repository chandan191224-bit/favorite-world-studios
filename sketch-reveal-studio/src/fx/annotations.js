// Sketchy annotations: the wobbly pen marks a host draws over an old photo —
// circle, arrow, underline, cross-out, bracket, star, box — and handwritten ink
// labels that write themselves on (Devanagari-safe: whole akshar appear, never split).
SK.ann = (() => {
  const U = SK.util, T = SK.text;

  const MARKS = [
    ['circle', 'Circle'], ['arrow', 'Arrow'], ['underline', 'Underline'], ['cross', 'Cross-out'],
    ['bracket', 'Bracket'], ['star', 'Star'], ['box', 'Box'], ['ring', 'Double ring'],
  ];

  // draw one mark centred at (x,y) with radius r (device px). q: 0..1 draw-on.
  // opts: {color, width, seed, rot, wobble}
  function mark(g, type, x, y, r, q, opts = {}) {
    const seed = opts.seed || 7, col = opts.color || '#c8372d';
    const w = Math.max(2, (opts.width || 5) * (r / 90));
    const wob = f => U.fbm2(f * 1.7 + seed * 0.31, seed, seed, 2) * r * 0.07 * (opts.wobble == null ? 1 : opts.wobble);
    g.save();
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    const P = q * (opts.speed || 1);
    if (type === 'circle' || type === 'ring') {
      const turns = type === 'ring' ? 2.15 : 1.12; // overshoot like a real hand
      const a0 = (opts.rot || -0.6);
      const sweep = U.clamp(P) * Math.PI * 2 * turns;
      g.beginPath();
      for (let a = 0; a <= sweep; a += 0.09) {
        const rr = r * (1 + U.noise1(a * 1.3 + seed, seed) * 0.055) + wob(a) * 0.4;
        const px = x + Math.cos(a0 + a) * rr * 1.12, py = y + Math.sin(a0 + a) * rr;
        a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
    } else if (type === 'arrow') {
      // curved arrow from tail to head
      const dx = r * 1.7, dy = -r * 0.9, rot = opts.rot || 0;
      g.save();
      g.translate(x, y); g.rotate(rot);
      const L = U.clamp(P);
      g.beginPath();
      g.moveTo(-dx, dy);
      const steps = 22;
      for (let i = 1; i <= steps * L; i++) {
        const t = i / steps;
        const px = U.lerp(-dx, 0, t), py = dy * (1 - t * t) + U.noise1(t * 5 + seed, seed) * r * 0.06;
        g.lineTo(px, py);
      }
      g.stroke();
      if (L > 0.92) { // the head pops once the line arrives
        const k = U.range(P, 0.92, 1);
        g.save();
        g.globalAlpha = k;
        g.beginPath();
        g.moveTo(-r * 0.28, -r * 0.16); g.lineTo(0, 0); g.lineTo(-r * 0.2, -r * 0.44);
        g.lineWidth = w * 0.9; g.stroke();
        g.restore();
      }
      g.restore();
    } else if (type === 'underline') {
      const L = U.clamp(P);
      const wq = r * 2.2;
      g.beginPath();
      g.moveTo(x - wq / 2, y + r * 0.55);
      g.quadraticCurveTo(x, y + r * 0.75 + wob(1), x - wq / 2 + wq * L, y + r * 0.5 + wob(2) * 0.5);
      g.stroke();
      if (L >= 0.999 && (opts.double)) { // second quicker stroke
        g.beginPath();
        g.moveTo(x - wq / 2 + 6, y + r * 0.8);
        g.quadraticCurveTo(x, y + r * 0.95, x + wq / 2 - 4, y + r * 0.72);
        g.stroke();
      }
    } else if (type === 'cross') {
      const s = r * 1.05;
      const q1 = U.clamp(P / 0.55), q2 = U.clamp((P - 0.5) / 0.5);
      g.beginPath();
      g.moveTo(x - s, y - s);
      g.lineTo(x - s + 2 * s * q1, y - s + 2 * s * q1);
      g.stroke();
      if (q2 > 0) {
        g.beginPath();
        g.moveTo(x + s, y - s);
        g.lineTo(x + s - 2 * s * q2, y - s + 2 * s * q2);
        g.stroke();
      }
    } else if (type === 'bracket') {
      const hgt = r * 1.7, wid = r * 0.55, dir = opts.side === 'right' ? -1 : 1;
      const L = U.clamp(P);
      // three strokes: top hook, spine, bottom hook
      const t1 = U.clamp(L / 0.4), t2 = U.clamp((L - 0.35) / 0.35), t3 = U.clamp((L - 0.7) / 0.3);
      if (t1 > 0) { g.beginPath(); g.moveTo(x + dir * wid, y - hgt / 2 - (1 - t1) * 0); g.lineTo(x + dir * wid * (1 - t1) + dir * wid * t1, y - hgt / 2); g.lineTo(x - dir * wid * 0.12 * t1 + dir * wid, y - hgt / 2); g.stroke(); }
      if (t2 > 0) { g.beginPath(); g.moveTo(x + dir * wid, y - hgt / 2); g.lineTo(x + dir * wid + wob(3), y - hgt / 2 + hgt * t2); g.stroke(); }
      if (t3 > 0) { g.beginPath(); g.moveTo(x + dir * wid, y + hgt / 2 - hgt * (1 - t3)); g.lineTo(x + dir * wid, y + hgt / 2); g.lineTo(x - dir * wid * 0.12, y + hgt / 2); g.stroke(); }
    } else if (type === 'star') {
      const pts = 5, R1 = r, R2 = r * 0.42;
      const total = pts * 2;
      const upto = Math.floor(U.clamp(P) * total + 0.999);
      g.beginPath();
      for (let i = 0; i < upto; i++) {
        const a = -Math.PI / 2 + i * Math.PI / pts + U.noise1(i + seed, seed) * 0.06;
        const rr = (i % 2 ? R2 : R1) * (1 + U.noise1(i * 2 + seed, seed) * 0.08);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      if (P >= 1) g.closePath();
      g.stroke();
    } else if (type === 'box') {
      const wq = r * 1.9, hq = r * 1.3;
      const peri = 2 * (wq + hq);
      const drawn = U.clamp(P) * peri;
      g.beginPath();
      g.moveTo(x - wq / 2, y - hq / 2);
      let acc = 0;
      // walk the rectangle perimeter with a small overshoot at the end
      const corners = [[x - wq / 2, y - hq / 2], [x + wq / 2, y - hq / 2], [x + wq / 2, y + hq / 2], [x - wq / 2, y + hq / 2], [x - wq / 2 - wq * 0.12, y - hq / 2 - hq * 0.1]];
      let px = corners[0][0], py = corners[0][1];
      for (let ci = 1; ci < corners.length && acc < drawn; ci++) {
        const [nx, ny] = corners[ci];
        const segLen = Math.hypot(nx - px, ny - py);
        if (acc + segLen <= drawn) { g.lineTo(nx, ny); acc += segLen; px = nx; py = ny; }
        else {
          const t = (drawn - acc) / segLen;
          g.lineTo(px + (nx - px) * t + wob(ci), py + (ny - py) * t + wob(ci + 4));
          acc = drawn;
        }
      }
      g.stroke();
    }
    g.restore();
  }

  // handwritten label that writes itself: whole grapheme clusters appear left to right
  // with a pen underline option. pos (x,y) = anchor. opts: {size, color, font, align,
  // underline, maxW, alpha, leader: [x,y] target for a leader line}
  function label(g, text, x, y, q, opts = {}) {
    if (!text) return;
    const size = opts.size || 46;
    const L = T.fit(text, {
      font: opts.font || 'kalam', size, weight: opts.bold ? 'bold' : 'normal',
      maxW: opts.maxW || 900, lineH: 1.18, align: opts.align || 'center', valign: 'top',
    });
    const cl = L.units.cluster;
    const total = cl.length || 1;
    const n = Math.round(U.clamp(q) * total);
    g.save();
    g.translate(x, y);
    g.fillStyle = opts.color || '#2c2416';
    const alpha = opts.alpha == null ? 1 : opts.alpha;
    // leader line first (draws on quickly)
    if (opts.leader) {
      const [lx, ly] = opts.leader;
      const lq = U.clamp(q * 3);
      g.strokeStyle = opts.color || '#2c2416';
      g.lineWidth = Math.max(2, size * 0.05); g.lineCap = 'round';
      g.beginPath();
      g.moveTo(lx, ly);
      g.quadraticCurveTo(lx + (x - lx) * 0.2 * lq, ly + (y - ly) * 0.9 * lq, U.lerp(lx, 0, lq), U.lerp(ly, -L.asc * 0.2, lq));
      g.stroke();
    }
    g.font = L.fontStr;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const c = cl[i];
      g.fillText(c.text, c.ax, c.base);
    }
    // the pen tip
    if (q > 0 && q < 1 && n > 0 && n < total) {
      const c = cl[Math.min(n - 1, total - 1)];
      SK.ink.tool(g, c.ax + c.w, c.base, 0.12, 'pen', size / 40, opts.color || '#2c2416');
    }
    // underline sweeps after the text
    if (opts.underline && q > 0.25) {
      const uq = U.range(q, 0.25, 0.8);
      g.strokeStyle = opts.uColor || opts.color || '#2c2416';
      g.lineWidth = Math.max(2, size * 0.045); g.lineCap = 'round';
      const wq = Math.min(L.W, (opts.maxW || 900)) * uq;
      const x0 = L.left;
      g.beginPath();
      g.moveTo(x0, L.H + size * 0.32);
      g.quadraticCurveTo(x0 + wq / 2, L.H + size * 0.44, x0 + wq, L.H + size * 0.28);
      g.stroke();
    }
    g.restore();
    return { L, n, total };
  }

  return { MARKS, mark, label };
})();
