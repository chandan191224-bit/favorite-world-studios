// Photo sources: user photos + built-in demo scenes (procedural art + packed photos).
// Everything is cached; all drawing is seeded so preview == export.
window.PP = window.PP || {};
PP.sources = (() => {
  const U = PP.util;
  const cache = new Map();
  const MAX_CACHE = 48;
  function keep(key, val) {
    if (cache.size >= MAX_CACHE) { const k = cache.keys().next().value; cache.delete(k); }
    cache.set(key, val);
    return val;
  }

  // working resolution for the photo plate (aspect of the frame, capped)
  function workSize(W, H) {
    const max = 1400, s = Math.min(1, max / Math.max(W, H));
    return [Math.max(64, Math.round(W * s)), Math.max(64, Math.round(H * s))];
  }

  // cover-fit draw of an image into WxH; returns the mapping so points can be mapped back
  function drawCover(g, img, W, H) {
    const iw = img.width, ih = img.height;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    g.drawImage(img, dx, dy, dw, dh);
    return { s, dx, dy, dw, dh };
  }
  // frame point (fx, fy in 0..1) -> photo point (0..1 in photo space)
  function frameToPhoto(fx, fy, W, H, img) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const x = (fx * W - dx) / dw, y = (fy * H - dy) / dh;
    return [U.clamp(x, 0, 1), U.clamp(y, 0, 1)];
  }

  function plate(source, W, H) {
    const [w, h] = workSize(W, H);
    const key = JSON.stringify([source.type, source.demo || source.media, source.fit || 'cover', w, h]);
    if (cache.has(key)) return cache.get(key);
    let cv;
    if (source.type === 'demo') {
      const painter = PROC[source.demo];
      if (painter) { cv = keep(key, painter(w, h)); cv.__proc = source.demo; return cv; }
      const el = PP.assets.demoEl(source.demo);
      if (el) {
        cv = U.canvas(w, h);
        drawCover(cv.getContext('2d'), el, w, h);
        cv.__img = el;
        return keep(key, cv);
      }
      throw new Error('demo photo not loaded yet');
    }
    if (source.type === 'image') {
      const m = PP.media[source.media];
      if (m && m.el && m.el.width) {
        cv = U.canvas(w, h);
        const g = cv.getContext('2d');
        if ((source.fit || 'cover') === 'contain') {
          g.fillStyle = source.back || '#101014';
          g.fillRect(0, 0, w, h);
          const s = Math.min(w / m.el.width, h / m.el.height), dw = m.el.width * s, dh = m.el.height * s;
          g.drawImage(m.el, (w - dw) / 2, (h - dh) / 2, dw, dh);
        } else drawCover(g, m.el, w, h);
        cv.__img = m.el;
        return keep(key, cv);
      }
      throw new Error('photo not loaded');
    }
    if (source.type === 'color') {
      cv = U.canvas(w, h);
      const g = cv.getContext('2d');
      g.fillStyle = source.color || '#20242c'; g.fillRect(0, 0, w, h);
      return keep(key, cv);
    }
    throw new Error('unknown source ' + source.type);
  }

  // async: ensure the photo behind a source is decoded (packed photo demos load from data URLs)
  async function ensure(source) {
    if (source && source.type === 'demo' && !PROC[source.demo]) {
      await PP.assets.demoImage(source.demo);
    }
  }

  // thumbnail (for timeline)
  function thumb(source, w, h) {
    const key = 'thumb:' + JSON.stringify([source.type, source.demo || source.media, w, h]);
    if (cache.has(key)) return cache.get(key);
    const cv = U.canvas(w, h), g = cv.getContext('2d');
    // photo not decoded yet: return a placeholder WITHOUT caching it, so the real thumbnail appears later
    try { g.drawImage(plate(source, w, h), 0, 0, w, h); } catch (e) { g.fillStyle = '#151920'; g.fillRect(0, 0, w, h); return cv; }
    return keep(key, cv);
  }

  function label(source) {
    if (!source) return '';
    if (source.type === 'demo') return (PP.assets.DEMO_INFO.find(d => d[0] === source.demo) || [0, source.demo])[1];
    if (source.type === 'image') { const m = PP.media[source.media]; return m ? m.name : 'Photo (add)'; }
    return source.type;
  }

  // ---------------- procedural demo scenes (deterministic) ----------------
  const PROC = {
    // flat-vector landscape: sky, sun, 3 ridges, pines — clean depth bands
    ridge(w, h) {
      const cv = U.canvas(w, h), g = cv.getContext('2d'), R = U.rng(7);
      const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
      sky.addColorStop(0, '#f2c580'); sky.addColorStop(0.55, '#e79a5e'); sky.addColorStop(1, '#c96f4e');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // sun
      const sx = w * 0.68, sy = h * 0.34, sr = h * 0.16;
      const halo = g.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 3);
      halo.addColorStop(0, 'rgba(255,236,180,.9)'); halo.addColorStop(1, 'rgba(255,236,180,0)');
      g.fillStyle = halo; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill();
      // clouds (drifting strips)
      for (let i = 0; i < 7; i++) {
        const cy = h * (0.08 + R() * 0.22), cw = w * (0.14 + R() * 0.3), ch = h * 0.028;
        g.fillStyle = `rgba(255,244,214,${0.25 + R() * 0.35})`;
        g.beginPath(); g.ellipse(R() * w, cy, cw / 2, ch, 0, 0, 7); g.fill();
      }
      // far ridge
      ridgeLine(g, w, h * 0.52, h * 0.10, '#8a5a4e', 5, 11);
      // mid ridge
      ridgeLine(g, w, h * 0.66, h * 0.12, '#5d3a35', 9, 7);
      // hills (near, with pines)
      g.fillStyle = '#2e1f22';
      g.beginPath(); g.moveTo(0, h);
      g.lineTo(0, h * 0.86); hills(g, w, h * 0.86, h * 0.08, 4, 3); g.lineTo(w, h); g.closePath(); g.fill();
      // pines on the near hill
      g.fillStyle = '#17110f';
      for (let i = 0; i < 14; i++) {
        const px = w * (0.03 + i * 0.07 + R() * 0.02), ph = h * (0.10 + R() * 0.09), py = h * (0.84 + R() * 0.05);
        pine(g, px, py, ph);
      }
      return cv;
    },
    // one-point-perspective old street: buildings converge to a vanishing point — ideal for the mesh
    street(w, h) {
      const cv = U.canvas(w, h), g = cv.getContext('2d'), R = U.rng(31);
      const vx = w * 0.5, vy = h * 0.52;
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#b9c6c2'); sky.addColorStop(0.45, '#e6dcc4'); sky.addColorStop(1, '#d9c3a1');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      // distant haze + sun glow near the vanishing point
      const glow = g.createRadialGradient(vx, vy, 0, vx, vy, w * 0.42);
      glow.addColorStop(0, 'rgba(255,244,214,.9)'); glow.addColorStop(0.35, 'rgba(255,240,205,.35)'); glow.addColorStop(1, 'rgba(255,240,205,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      // ground with perspective joints
      const gr = g.createLinearGradient(0, vy, 0, h);
      gr.addColorStop(0, '#9a8266'); gr.addColorStop(1, '#6e5a44');
      g.fillStyle = gr; g.fillRect(0, vy, w, h - vy);
      g.strokeStyle = 'rgba(52,42,32,.35)'; g.lineWidth = Math.max(1, w / 900);
      for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(vx, vy); g.lineTo(w / 2 + i * w * 0.15, h * 1.02); g.stroke(); }
      for (let i = 1; i < 9; i++) { const y = vy + (h - vy) * Math.pow(i / 9, 1.75); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      // buildings left & right, shrinking to the vanishing point
      for (let side = -1; side <= 1; side += 2) {
        let x0 = side < 0 ? -w * 0.02 : w * 1.02, x1 = vx + side * w * 0.10;
        let y0 = h * 0.26, y1 = vy - h * 0.02, k = 0;
        while (Math.abs(x1 - vx) > w * 0.013 && k < 10) {
          const xa = x0, xb = x1, ya = y0, yb = y1;
          const shade = 44 + (k * 9) % 46;
          // facade with a vertical shade gradient (lit side toward the street)
          const fg = g.createLinearGradient(xa, 0, xb, 0);
          const c0 = `rgb(${shade + 78},${shade + 60},${shade + 40})`, c1 = `rgb(${shade + 40},${shade + 30},${shade + 20})`;
          if (side < 0) { fg.addColorStop(0, c1); fg.addColorStop(1, c0); } else { fg.addColorStop(0, c0); fg.addColorStop(1, c1); }
          g.fillStyle = fg;
          g.beginPath();
          g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(xb, h); g.lineTo(xa, h); g.closePath(); g.fill();
          // cornice line at the roof
          g.strokeStyle = 'rgba(30,24,18,.5)'; g.lineWidth = Math.max(1, w / 700);
          g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
          // windows on the facade, in perspective rows (tops follow the sloping roofline)
          const cols = 4, rows = 3;
          for (let wj = 0; wj < rows; wj++) for (let wi = 0; wi < cols; wi++) {
            const u1 = (wi + 0.22) / cols, u2 = (wi + 0.78) / cols;
            const v1 = 0.24 + wj * 0.26, v2 = v1 + 0.15;
            const wx1 = U.lerp(xa, xb, u1), wx2 = U.lerp(xa, xb, u2);
            const roof1 = U.lerp(ya, yb, u1), roof2 = U.lerp(ya, yb, u2);   // facade top edge at each column
            const wy1 = U.lerp(roof1, h, v1), wy2 = U.lerp(roof2, h, v1);
            const wy3 = U.lerp(roof1, h, v2), wy4 = U.lerp(roof2, h, v2);
            if (wx2 - wx1 < 1.2 || wy3 - wy1 < 1.2) continue;
            const lit = R() > 0.62;
            g.fillStyle = lit ? `rgba(255,214,138,${0.75 + R() * 0.25})` : 'rgba(38,32,26,.78)';
            g.beginPath();
            g.moveTo(wx1, wy1); g.lineTo(wx2, wy2); g.lineTo(wx2, wy4); g.lineTo(wx1, wy3);
            g.closePath(); g.fill();
            g.strokeStyle = 'rgba(28,22,16,.65)';
            g.stroke();
            if (lit) {  // soft glow around lit windows
              const cx0 = (wx1 + wx2) / 2, cy0 = (wy1 + wy3) / 2, rad = (wx2 - wx1) * 2.2;
              const wg = g.createRadialGradient(cx0, cy0, 0, cx0, cy0, rad);
              wg.addColorStop(0, 'rgba(255,214,138,.26)'); wg.addColorStop(1, 'rgba(255,214,138,0)');
              g.fillStyle = wg; g.fillRect(cx0 - rad, cy0 - rad, rad * 2, rad * 2);
            }
          }
          // a door on the ground floor of the nearest building
          if (k === 0) {
            const dx0 = U.lerp(xa, xb, 0.45), dx1 = U.lerp(xa, xb, 0.62);
            const dy1 = h, dy0 = U.lerp(ya, yb, 0.86);
            g.fillStyle = 'rgba(46,32,22,.92)';
            g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
            g.strokeStyle = 'rgba(24,16,10,.8)'; g.strokeRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
          }
          x0 = x1; y0 = y1;
          x1 = vx + (x1 - vx) * 0.62; y1 = vy + (y1 - vy) * 0.55; k++;
        }
      }
      // far end: a warm arch closing the street
      g.fillStyle = 'rgba(66,50,36,.9)';
      g.fillRect(vx - w * 0.014, vy - h * 0.028, w * 0.028, h * 0.5);
      g.fillStyle = 'rgba(255,238,190,.5)';
      g.fillRect(vx - w * 0.008, vy + h * 0.02, w * 0.016, h * 0.36);
      return cv;
    },
    // documentary still: stone steps + arch + a standing figure silhouette (generic, no face)
    steps(w, h) {
      const cv = U.canvas(w, h), g = cv.getContext('2d'), R = U.rng(97);
      const wall = g.createLinearGradient(0, 0, w, 0);
      wall.addColorStop(0, '#7a7266'); wall.addColorStop(0.5, '#8d8578'); wall.addColorStop(1, '#6e675c');
      g.fillStyle = wall; g.fillRect(0, 0, w, h);
      // stone texture
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${40 + R() * 50},${36 + R() * 46},${30 + R() * 40},${0.05 + R() * 0.09})`;
        g.fillRect(R() * w, R() * h, 2 + R() * 26, 1 + R() * 3);
      }
      // block joints
      g.strokeStyle = 'rgba(52,46,38,.35)'; g.lineWidth = 1.5;
      for (let y = 0; y < h; y += h * 0.09) {
        g.beginPath(); g.moveTo(0, y + (y / h * 30) % 14); g.lineTo(w, y); g.stroke();
        for (let x = (y * 37) % 80; x < w; x += 96 + (y % 3) * 30) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h * 0.09); g.stroke(); }
      }
      // arch (far)
      const ax = w * 0.72, ay = h * 0.18, aw = w * 0.17, ah = h * 0.5;
      g.fillStyle = '#2c2620';
      g.beginPath(); g.moveTo(ax - aw, h); g.lineTo(ax - aw, ay + ah * 0.55);
      g.arc(ax, ay + ah * 0.55, aw, Math.PI, 0); g.lineTo(ax + aw, h); g.closePath(); g.fill();
      // steps
      g.fillStyle = '#4a4238';
      for (let i = 0; i < 7; i++) {
        const sy = h * (0.66 + i * 0.048), sh = h * 0.05, sw = w * (0.16 + i * 0.05), sx0 = w * 0.24 - i * w * 0.012;
        g.fillStyle = `rgb(${74 + i * 3},${66 + i * 3},${56 + i * 2})`;
        g.fillRect(sx0, sy, sw, sh);
        g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(sx0, sy, sw, 2);
      }
      // standing figure silhouette (generic outline — never a real person)
      const fx = w * 0.40, fy = h * 0.90, fh = h * 0.42;
      g.fillStyle = '#181410';
      g.beginPath();
      g.moveTo(fx - fh * 0.10, fy);                     // left shoe
      g.lineTo(fx - fh * 0.095, fy - fh * 0.44);
      g.quadraticCurveTo(fx - fh * 0.13, fy - fh * 0.52, fx - fh * 0.10, fy - fh * 0.60); // coat
      g.lineTo(fx - fh * 0.045, fy - fh * 0.62);
      g.quadraticCurveTo(fx - fh * 0.05, fy - fh * 0.72, fx - fh * 0.028, fy - fh * 0.73); // shoulders
      g.arc(fx, fy - fh * 0.80, fh * 0.062, Math.PI * 0.95, Math.PI * 0.05);              // head
      g.quadraticCurveTo(fx + fh * 0.05, fy - fh * 0.72, fx + fh * 0.045, fy - fh * 0.62);
      g.lineTo(fx + fh * 0.10, fy - fh * 0.60);
      g.quadraticCurveTo(fx + fh * 0.13, fy - fh * 0.52, fx + fh * 0.095, fy - fh * 0.44);
      g.lineTo(fx + fh * 0.10, fy);
      g.closePath(); g.fill();
      // soft shadow
      const sh = g.createRadialGradient(fx, fy, 0, fx, fy, fh * 0.5);
      sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(fx, fy); g.scale(1, 0.22); g.translate(-fx, -fy);
      g.fillStyle = sh; g.beginPath(); g.arc(fx, fy, fh * 0.5, 0, 7); g.fill(); g.restore();
      return cv;
    },
  };

  function ridgeLine(g, w, baseY, amp, color, n, seed) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, baseY);
    hills(g, w, baseY, amp, n, seed); g.lineTo(w, baseY); g.closePath(); g.fill();
  }
  function hills(g, w, baseY, amp, n, seed) {
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w, y = baseY - (Math.sin(i * 2.1 + seed) * 0.5 + U.noise2(i * 1.3, seed, 5) * 0.5) * amp;
      g.lineTo(x, y);
    }
  }
  function pine(g, x, y, hh) {
    g.beginPath(); g.moveTo(x - hh * 0.22, y);
    for (let k = 0; k < 4; k++) {
      const t = k / 4;
      g.lineTo(x - hh * 0.22 * (1 - t), y - hh * (0.25 + t * 0.72));
      g.lineTo(x - hh * 0.22 * (0.82 - t * 0.5), y - hh * (0.25 + t * 0.72));
    }
    g.lineTo(x, y - hh * 1.06);
    for (let k = 3; k >= 0; k--) {
      const t = k / 4;
      g.lineTo(x + hh * 0.22 * (0.82 - t * 0.5), y - hh * (0.25 + t * 0.72));
      g.lineTo(x + hh * 0.22 * (1 - t), y - hh * (0.25 + t * 0.72));
    }
    g.closePath(); g.fill();
  }

  return { plate, thumb, ensure, label, drawCover, frameToPhoto, PROC, workSize };
})();
