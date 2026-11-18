// SVG import: parse an SVG file's shapes into the same stroke format the parametric drawings use,
// so a user's own SVG draws on stroke-by-stroke. Handles path/rect/circle/ellipse/line/polyline/
// polygon + nested transforms. Curves are flattened to polylines; result normalised into 0..1000 ×
// 0..(1000·ar). Deterministic, cached per text.
BD.svgimp = (() => {
  const U = BD.util;
  const cache = new Map();

  // ---- transform parsing ----
  function parseTransform(str) {
    // -> matrix [a,b,c,d,e,f]
    let m = [1, 0, 0, 1, 0, 0];
    if (!str) return m;
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    let match;
    while ((match = re.exec(str))) {
      const n = match[2].trim().split(/[\s,]+/).map(Number);
      let t = [1, 0, 0, 1, 0, 0];
      if (match[1] === 'matrix') t = n.slice(0, 6);
      else if (match[1] === 'translate') t = [1, 0, 0, 1, n[0] || 0, n[1] || 0];
      else if (match[1] === 'scale') t = [n[0] == null ? 1 : n[0], 0, 0, n.length > 1 ? n[1] : (n[0] == null ? 1 : n[0]), 0, 0];
      else if (match[1] === 'rotate') { const a = (n[0] || 0) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); t = [cs, sn, -sn, cs, 0, 0]; if (n.length > 2) { t[4] = n[1] - (cs * n[1] - sn * n[2]); t[5] = n[2] - (sn * n[1] + cs * n[2]); } }
      else if (match[1] === 'skewX') t = [1, 0, Math.tan((n[0] || 0) * Math.PI / 180), 1, 0, 0];
      else if (match[1] === 'skewY') t = [1, Math.tan((n[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
      m = mul(m, t);
    }
    return m;
  }
  const mul = (m, t) => [
    m[0] * t[0] + m[2] * t[1], m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3], m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4], m[1] * t[4] + m[3] * t[5] + m[5],
  ];
  const apply = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

  // ---- path d parser -> array of subpaths (point lists) ----
  function parsePath(d) {
    const out = [];
    if (!d) return out;
    const tok = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cur = null, cmd = null, pc = null, pcx = 0, pcy = 0;
    const num = () => parseFloat(tok[i++]);
    const moveTo = (x, y) => { if (cur && cur.length > 1) out.push(cur); cur = [[x, y]]; cx = sx = x; cy = sy = y; };
    const lineTo = (x, y) => { cur.push([x, y]); cx = x; cy = y; };
    while (i < tok.length) {
      const t = tok[i];
      if (/[MmLlHhVvCcSsQqTtAaZz]/i.test(t)) { cmd = tok[i++]; if (cmd === cmd.toLowerCase() && cmd.toLowerCase() !== 'z') { pc = cmd; } }
      const rel = cmd === cmd.toLowerCase() && cmd.toLowerCase() !== 'z';
      switch (cmd.toUpperCase()) {
        case 'M': { let x = num(), y = num(); if (rel) { x += cx; y += cy; } moveTo(x, y); cmd = rel ? 'l' : 'L'; break; }
        case 'L': { let x = num(), y = num(); if (rel) { x += cx; y += cy; } lineTo(x, y); break; }
        case 'H': { let x = num(); if (rel) x += cx; lineTo(x, cy); break; }
        case 'V': { let y = num(); if (rel) y += cy; lineTo(cx, y); break; }
        case 'C': {
          let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
          if (rel) { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
          for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; lineTo(u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y); }
          pcx = x2; pcy = y2; pc = cmd; break;
        }
        case 'S': {
          let x2 = num(), y2 = num(), x = num(), y = num();
          if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
          const x1 = (pc && pc.toUpperCase() === 'C') ? 2 * cx - pcx : cx, y1 = (pc && pc.toUpperCase() === 'C') ? 2 * cy - pcy : cy;
          for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; lineTo(u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y); }
          pcx = x2; pcy = y2; pc = cmd; break;
        }
        case 'Q': {
          let x1 = num(), y1 = num(), x = num(), y = num();
          if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; }
          for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; lineTo(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y); }
          pcx = x1; pcy = y1; pc = cmd; break;
        }
        case 'T': {
          let x = num(), y = num(); if (rel) { x += cx; y += cy; }
          const x1 = (pc && pc.toUpperCase() === 'Q') ? 2 * cx - pcx : cx, y1 = (pc && pc.toUpperCase() === 'Q') ? 2 * cy - pcy : cy;
          for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; lineTo(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y); }
          pcx = x1; pcy = y1; pc = cmd; break;
        }
        case 'A': {
          const rx = num(), ry = num(), rot = num() * Math.PI / 180, laf = num(), sf = num();
          let x = num(), y = num(); if (rel) { x += cx; y += cy; }
          // endpoint -> centre parameterisation
          const dx = (cx - x) / 2, dy = (cy - y) / 2;
          const cosr = Math.cos(rot), sinr = Math.sin(rot);
          const x1p = cosr * dx + sinr * dy, y1p = -sinr * dx + cosr * dy;
          let RX = Math.abs(rx) || 1, RY = Math.abs(ry) || 1;
          const lam = (x1p * x1p) / (RX * RX) + (y1p * y1p) / (RY * RY);
          if (lam > 1) { const s = Math.sqrt(lam); RX *= s; RY *= s; }
          const sign = (laf !== sf) ? 1 : -1;
          let nume = RX * RX * RY * RY - RX * RX * y1p * y1p - RY * RY * x1p * x1p;
          nume = Math.max(0, nume);
          let co = sign * Math.sqrt(nume / (RX * RX * y1p * y1p + RY * RY * x1p * x1p)) || 0;
          const cxp = co * RX * y1p / RY, cyp = -co * RY * x1p / RX;
          const ox = cosr * cxp - sinr * cyp + (cx + x) / 2, oy = sinr * cxp + cosr * cyp + (cy + y) / 2;
          let a1 = Math.atan2((cy - oy) / RY, (cx - ox) / RX);
          let a2 = Math.atan2((y - oy) / RY, (x - ox) / RX);
          let sweep = a2 - a1;
          if (sf === 0 && sweep > 0) sweep -= U.TAU;
          if (sf === 1 && sweep < 0) sweep += U.TAU;
          const n = Math.max(6, Math.ceil(Math.abs(sweep) / (Math.PI / 12)));
          for (let k = 1; k <= n; k++) {
            const a = a1 + sweep * k / n;
            lineTo(ox + RX * Math.cos(a), oy + RY * Math.sin(a));
          }
          pc = cmd; break;
        }
        case 'Z': { if (cur && cur.length > 1) { cur.push([sx, sy]); out.push(cur); cur = null; } cx = sx; cy = sy; break; }
      }
    }
    if (cur && cur.length > 1) out.push(cur);
    return out;
  }

  // ---- walk the DOM ----
  function parse(svgText) {
    const key = svgText.length + ':' + hash(svgText);
    if (cache.has(key)) return cache.get(key);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return { strokes: [], labels: [], dims: [], vb: [1000, 600], ar: 16 / 9 };
    let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(v => !isFinite(v))) vb = [0, 0, 1000, 600];
    const [vx, vy, vw, vh] = vb;
    const strokes = [], labels = [];
    const walk = (el, m) => {
      for (const child of el.children) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'g' || tag === 'a' || tag === 'switch') { walk(child, mul(m, parseTransform(child.getAttribute('transform')))); continue; }
        if (tag === 'text' || tag === 'tspan') { const t = (child.textContent || '').trim(); if (t) labels.push({ x: 500, y: 300, t, sub: '' }); continue; }
        const cm = mul(m, parseTransform(child.getAttribute('transform')));
        const sw = parseFloat(child.getAttribute('stroke-width') || '1') || 1;
        const hasFill = child.getAttribute('fill') && child.getAttribute('fill') !== 'none';
        const hasStroke = !child.getAttribute('stroke') || child.getAttribute('stroke') !== 'none';
        let subs = [];
        if (tag === 'path') subs = parsePath(child.getAttribute('d'));
        else if (tag === 'rect') { const x = +child.getAttribute('x') || 0, y = +child.getAttribute('y') || 0, w = +child.getAttribute('width') || 0, h = +child.getAttribute('height') || 0; if (w && h) subs = [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]]; }
        else if (tag === 'circle') { const cx = +child.getAttribute('cx') || 0, cy = +child.getAttribute('cy') || 0, r = +child.getAttribute('r') || 0; if (r) subs = [circle(cx, cy, r)]; }
        else if (tag === 'ellipse') { const cx = +child.getAttribute('cx') || 0, cy = +child.getAttribute('cy') || 0, rx = +child.getAttribute('rx') || 0, ry = +child.getAttribute('ry') || 0; if (rx && ry) subs = [ellipse(cx, cy, rx, ry)]; }
        else if (tag === 'line') { const p = [[+child.getAttribute('x1') || 0, +child.getAttribute('y1') || 0], [+child.getAttribute('x2') || 0, +child.getAttribute('y2') || 0]]; subs = [p]; }
        else if (tag === 'polyline' || tag === 'polygon') { const pts = (child.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); const P = []; for (let i = 0; i + 1 < pts.length; i += 2) P.push([pts[i], pts[i + 1]]); if (tag === 'polygon' && P.length > 2) P.push(P[0].slice()); if (P.length > 1) subs = [P]; }
        else continue;
        for (const sub of subs) {
          if (!sub || sub.length < 2) continue;
          strokes.push({ p: sub.map(p => apply(cm, p)), w: clamp(sw, 0.5, 4), g: hasFill && !hasStroke ? 1 : 0 });
        }
      }
    };
    const circle = (cx, cy, r) => { const out = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * U.TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; };
    const ellipse = (cx, cy, rx, ry) => { const out = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * U.TAU; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    walk(svg, [1, 0, 0, 1, -vx, -vy]);
    // normalise into 0..1000 × 0..(vh/vw*1000) keeping aspect
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const s of strokes) for (const p of s.p) { if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1]; if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]; }
    if (!isFinite(minX)) { minX = minY = 0; maxX = vw; maxY = vh; }
    const dw = Math.max(1e-6, maxX - minX), dh = Math.max(1e-6, maxY - minY);
    const k = 1000 / dw;
    const norm = strokes.map(s => ({ p: s.p.map(p => [(p[0] - minX) * k, (p[1] - minY) * k]), w: U.clamp(s.w * k * 0.8, 0.5, 3), g: s.g }));
    const res = { strokes: norm, labels: labels.slice(0, 12), dims: [], vb: [1000, Math.max(60, Math.round(1000 * dh / dw))], ar: dw / dh };
    if (cache.size > 30) cache.clear();
    cache.set(key, res);
    return res;
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; }
  return { parse };
})();
