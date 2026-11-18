// Atmosphere: fog, light rays, embers, rain, snow, dust, bokeh orbs, lightning, light leak,
// drifting smoke. Seeded and time-driven (no Math.random / Date) so preview == export.
// No ctx.filter (Safari): soft looks come from gradients and cached pre-blurred noise tiles.
window.PP = window.PP || {};
PP.atmos = (() => {
  const U = PP.util;
  const tiles = {};

  // cached fbm alpha tile (soft clouds)
  function noiseTile(seed, w = 220, h = 120, oct = 4, lo = 0, hi = 1) {
    const key = seed + '|' + w + 'x' + h + oct + lo + hi;
    if (tiles[key]) return tiles[key];
    const cv = U.canvas(w, h), g = cv.getContext('2d');
    const id = g.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = U.fbm2(x / w * 3.1, y / h * 2.2, seed, oct) * 0.5 + 0.5;
      // make it tile horizontally (mirror wrap)
      const nx = w - 1 - x;
      if (x > w * 0.75) { const n2 = U.fbm2(nx / w * 3.1, y / h * 2.2, seed, oct) * 0.5 + 0.5; n = U.lerp(n, n2, (x - w * 0.75) / (w * 0.25)); }
      const a = U.clamp((n - lo) / (hi - lo || 1));
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
    g.putImageData(id, 0, 0);
    tiles[key] = cv;
    return cv;
  }

  const F = {
    range: (key, label, min, max, step, def) => ({ key, label, type: 'range', min, max, step, def }),
    select: (key, label, options, def) => ({ key, label, type: 'select', options, def }),
    color: (key, label, def) => ({ key, label, type: 'color', def }),
  };

  const LIST = [
    {
      id: 'fog', name: 'Fog / mist', group: 'Weather', depth: 0.42, fields: [
        F.range('amount', 'Amount', 0, 1, 0.01, 0.5), F.range('speed', 'Drift speed', 0, 1, 0.01, 0.25),
        F.range('bandY', 'Height', 0, 1, 0.01, 0.62), F.range('bandH', 'Thickness', 0.05, 1, 0.01, 0.5),
        F.color('color', 'Colour', '#cfd8de'), F.range('seed', 'Shape', 1, 99, 1, 7),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.5 : o.amount, sp = o.speed == null ? 0.25 : o.speed;
        const y0 = (o.bandY == null ? 0.62 : o.bandY) * H, bh = (o.bandH == null ? 0.5 : o.bandH) * H;
        const tile = noiseTile(o.seed || 7);
        const drift = (lt * sp * 0.13) % 1;
        g.save();
        g.globalAlpha = amt * 0.85;
        g.globalCompositeOperation = 'source-over';
        const [r, gg, b] = U.hexRgb(o.color || '#cfd8de');
        const gr = g.createLinearGradient(0, y0 - bh * 0.5, 0, y0 + bh);
        gr.addColorStop(0, `rgba(${r},${gg},${b},0)`); gr.addColorStop(0.55, `rgba(${r},${gg},${b},.6)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr;
        g.fillRect(0, y0 - bh * 0.5, W, bh * 1.5);
        // two drifting noise layers clipped to the band
        g.globalCompositeOperation = 'source-atop';
        for (let layer = 0; layer < 2; layer++) {
          const sp2 = layer ? 1 : 0.55, sc = (layer ? 1.7 : 1) * (W / tile.width) * 1.2;
          const off = -drift * W * sp2 * (layer ? -1 : 1);
          g.globalAlpha = amt * (layer ? 0.5 : 0.75);
          g.drawImage(tile, off - W * 0.1, y0 - bh * 0.5, W * 1.2 * sc / 2, bh * 1.1);
          g.drawImage(tile, off - W * 0.1 + W * 1.2 * sc / 2, y0 - bh * 0.5, W * 1.2 * sc / 2, bh * 1.1);
        }
        g.restore();
      },
    },
    {
      id: 'haze', name: 'Depth haze (atmospheric)', group: 'Weather', depth: 0.3, fields: [
        F.range('amount', 'Amount', 0, 1, 0.01, 0.35), F.color('color', 'Colour', '#b8c6d4'),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.35 : o.amount;
        const [r, gg, b] = U.hexRgb(o.color || '#b8c6d4');
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, `rgba(${r},${gg},${b},${amt * 0.9})`);
        gr.addColorStop(0.65, `rgba(${r},${gg},${b},${amt * 0.35})`);
        gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      },
    },
    {
      id: 'rays', name: 'Light rays (god rays)', group: 'Light', depth: 0.75, fields: [
        F.range('amount', 'Amount', 0, 1, 0.01, 0.45), F.range('spread', 'Spread', 0.2, 1.2, 0.01, 0.7),
        F.range('swing', 'Swing', 0, 1, 0.01, 0.3), F.range('x', 'Source X', 0, 1, 0.01, 0.24), F.range('y', 'Source Y', 0, 1, 0.01, 0.02),
        F.color('color', 'Colour', '#ffe9b8'), F.range('seed', 'Pattern', 1, 99, 1, 11),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.45 : o.amount, swing = o.swing == null ? 0.3 : o.swing;
        const sx = (o.x == null ? 0.24 : o.x) * W + Math.sin(lt * 0.35) * swing * W * 0.06;
        const sy = (o.y == null ? 0.02 : o.y) * H;
        const spread = (o.spread == null ? 0.7 : o.spread) * Math.PI * 0.55;
        const [r, gg, b] = U.hexRgb(o.color || '#ffe9b8');
        g.save();
        g.globalCompositeOperation = 'lighter';
        const R = U.rng(o.seed || 11);
        for (let i = 0; i < 9; i++) {
          const base = spread * (i / 8 - 0.5) * 2 * 0.5 + Math.PI * 0.5;   // pointing down-ish
          const a = base + (R() - 0.5) * 0.14;
          const w0 = W * (0.02 + R() * 0.05), w1 = w0 * (2.6 + R() * 2.4);
          const len = Math.hypot(W, H) * 1.2;
          const pulse = 0.65 + 0.35 * Math.sin(lt * (0.5 + R() * 0.4) + i * 1.7);
          const al = amt * 0.16 * pulse;
          const gr = g.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
          gr.addColorStop(0, `rgba(${r},${gg},${b},${al})`);
          gr.addColorStop(0.6, `rgba(${r},${gg},${b},${al * 0.35})`);
          gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(sx - w0 / 2, sy); g.lineTo(sx + w0 / 2, sy);
          g.lineTo(sx + Math.cos(a) * len + w1 / 2, sy + Math.sin(a) * len);
          g.lineTo(sx + Math.cos(a) * len - w1 / 2, sy + Math.sin(a) * len);
          g.closePath(); g.fill();
        }
        // soft source glow
        const glow = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.3);
        glow.addColorStop(0, `rgba(${r},${gg},${b},${amt * 0.5})`); glow.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        g.restore();
      },
    },
    {
      id: 'embers', name: 'Embers / sparks', group: 'Particles', depth: 0.85, fields: [
        F.range('count', 'Count', 5, 160, 1, 60), F.range('amount', 'Brightness', 0, 1, 0.01, 0.72),
        F.range('speed', 'Rise speed', 0.1, 2, 0.01, 0.55), F.range('size', 'Size', 0.2, 3, 0.01, 1),
        F.range('drift', 'Sway', 0, 1, 0.01, 0.5), F.color('color', 'Colour', '#ffb14d'), F.range('seed', 'Pattern', 1, 99, 1, 5),
      ],
      draw(g, o, lt, W, H) {
        const n = Math.round(o.count == null ? 46 : o.count), amt = o.amount == null ? 0.6 : o.amount;
        const sp = o.speed == null ? 0.55 : o.speed, sz = (o.size == null ? 1 : o.size) * H / 1080;
        const drift = o.drift == null ? 0.5 : o.drift;
        const [r, gg, b] = U.hexRgb(o.color || '#ffb14d');
        const R = U.rng(o.seed || 5);
        const seeds = [];
        for (let i = 0; i < n; i++) seeds.push([R(), R(), R(), R(), R()]);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (const [x0, y0, v, ph, sw] of seeds) {
          const cycle = 0.55 / (sp * (0.6 + v * 0.8));
          const t01 = ((lt + ph * cycle * 7) / cycle) % 1;
          const x = (x0 + Math.sin((lt + ph * 9) * (0.5 + sw)) * drift * 0.06) * W;
          const y = (1.05 - t01 * 1.15) * H;
          const s = (0.35 + v * 0.9) * sz * (1 + Math.sin(lt * 3 + ph * 8) * 0.2);
          const al = amt * U.clamp(t01 * 4) * U.clamp((1 - t01) * 3);
          const gr = g.createRadialGradient(x, y, 0, x, y, s * 4);
          gr.addColorStop(0, `rgba(${r},${gg},${b},${al})`); gr.addColorStop(0.35, `rgba(${r},${gg},${b},${al * 0.5})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
          g.fillStyle = gr;
          g.beginPath(); g.arc(x, y, s * 4, 0, 7); g.fill();
        }
        g.restore();
      },
    },
    {
      id: 'rain', name: 'Rain', group: 'Weather', depth: 0.9, fields: [
        F.range('count', 'Density', 10, 300, 1, 150), F.range('amount', 'Visibility', 0, 1, 0.01, 0.55),
        F.range('speed', 'Speed', 0.2, 3, 0.01, 1.3), F.range('slant', 'Slant', -0.5, 0.5, 0.01, 0.16),
        F.color('color', 'Colour', '#dce8f2'), F.range('seed', 'Pattern', 1, 99, 1, 3),
      ],
      draw(g, o, lt, W, H) {
        const n = Math.round(o.count == null ? 150 : o.count), amt = o.amount == null ? 0.55 : o.amount;
        const sp = o.speed == null ? 1.3 : o.speed, sl = o.slant == null ? 0.16 : o.slant;
        const [r, gg, b] = U.hexRgb(o.color || '#dce8f2');
        const R = U.rng(o.seed || 3);
        g.save();
        g.lineCap = 'round';
        g.lineWidth = Math.max(1.4, H / 560);
        const len = H * 0.065 * (0.7 + sp * 0.4);
        // bright core strokes + soft wide strokes (visible on light scenes too)
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = `rgba(${r},${gg},${b},${(pass ? amt * 0.32 : amt * 0.8).toFixed(3)})`;
          g.lineWidth = pass ? Math.max(3, H / 210) : Math.max(1.4, H / 560);
          g.beginPath();
          for (let i = 0; i < n; i++) {
            const x0 = R(), v = 0.5 + R() * 0.9, ph = R();
            const t01 = ((lt * sp * v * 1.4) + ph) % 1;
            const x = x0 * W * 1.1 - W * 0.05 + t01 * sl * H;
            const y = t01 * (H + len) - len;
            g.moveTo(x, y); g.lineTo(x + sl * len, y + len);
          }
          g.stroke();
        }
        g.restore();
      },
    },
    {
      id: 'snow', name: 'Snow', group: 'Weather', depth: 0.88, fields: [
        F.range('count', 'Density', 10, 260, 1, 110), F.range('amount', 'Visibility', 0, 1, 0.01, 0.7),
        F.range('speed', 'Fall speed', 0.05, 1, 0.01, 0.22), F.range('sway', 'Sway', 0, 1, 0.01, 0.6),
        F.range('size', 'Flake size', 0.3, 3, 0.01, 1), F.color('color', 'Colour', '#ffffff'), F.range('seed', 'Pattern', 1, 99, 1, 9),
      ],
      draw(g, o, lt, W, H) {
        const n = Math.round(o.count == null ? 110 : o.count), amt = o.amount == null ? 0.7 : o.amount;
        const sp = o.speed == null ? 0.22 : o.speed, sw = o.sway == null ? 0.6 : o.sway;
        const sz = (o.size == null ? 1 : o.size) * H / 1080;
        const [r, gg, b] = U.hexRgb(o.color || '#ffffff');
        const R = U.rng(o.seed || 9);
        g.save();
        for (let i = 0; i < n; i++) {
          const x0 = R(), v = 0.4 + R() * 0.9, ph = R(), ps = R();
          const t01 = ((lt * sp * v * 1.6) + ph) % 1;
          const x = (x0 + Math.sin(lt * (0.4 + ps * 0.7) + ph * 9) * sw * 0.045) * W;
          const y = t01 * (H * 1.12) - H * 0.06;
          const s = (0.35 + v * 0.75) * sz * (1 + ps * 0.6);
          const al = amt * (0.45 + v * 0.5);
          g.fillStyle = `rgba(${r},${gg},${b},${al})`;
          g.beginPath(); g.arc(x, y, s * 2.6, 0, 7); g.fill();
          if (v > 0.8) {   // a few big soft flakes
            const gr = g.createRadialGradient(x, y, 0, x, y, s * 6);
            gr.addColorStop(0, `rgba(${r},${gg},${b},${al * 0.35})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * 6, 0, 7); g.fill();
          }
        }
        g.restore();
      },
    },
    {
      id: 'dust', name: 'Dust motes', group: 'Particles', depth: 0.8, fields: [
        F.range('count', 'Count', 5, 200, 1, 60), F.range('amount', 'Visibility', 0, 1, 0.01, 0.35),
        F.range('speed', 'Drift', 0.02, 1, 0.01, 0.14), F.color('color', 'Colour', '#e8ddc4'), F.range('seed', 'Pattern', 1, 99, 1, 21),
      ],
      draw(g, o, lt, W, H) {
        const n = Math.round(o.count == null ? 60 : o.count), amt = o.amount == null ? 0.35 : o.amount;
        const sp = o.speed == null ? 0.14 : o.speed;
        const [r, gg, b] = U.hexRgb(o.color || '#e8ddc4');
        const R = U.rng(o.seed || 21);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const x0 = R(), y0 = R(), v = 0.4 + R() * 0.8, ph = R();
          const x = (x0 + Math.sin(lt * sp * (0.5 + v) + ph * 7) * 0.03) * W;
          const y = (y0 - lt * sp * v * 0.16 % 1 + 1) % 1 * H;
          const s = (0.4 + v) * H / 1080;
          g.fillStyle = `rgba(${r},${gg},${b},${amt * (0.25 + v * 0.35)})`;
          g.beginPath(); g.arc(x, y, s * 2.1, 0, 7); g.fill();
        }
        g.restore();
      },
    },
    {
      id: 'bokeh', name: 'Bokeh orbs', group: 'Light', depth: 0.7, fields: [
        F.range('count', 'Count', 3, 40, 1, 14), F.range('amount', 'Brightness', 0, 1, 0.01, 0.4),
        F.range('size', 'Size', 0.2, 3, 0.01, 1), F.range('speed', 'Drift', 0.02, 0.6, 0.01, 0.12),
        F.color('color', 'Colour', '#ffd9a0'), F.range('seed', 'Pattern', 1, 99, 1, 13),
      ],
      draw(g, o, lt, W, H) {
        const n = Math.round(o.count == null ? 14 : o.count), amt = o.amount == null ? 0.4 : o.amount;
        const sz = (o.size == null ? 1 : o.size) * H / 1080, sp = o.speed == null ? 0.12 : o.speed;
        const [r, gg, b] = U.hexRgb(o.color || '#ffd9a0');
        const R = U.rng(o.seed || 13);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const x0 = R(), y0 = R(), v = 0.3 + R() * 0.9, ph = R();
          const x = (x0 + Math.sin(lt * sp * (0.4 + v) + ph * 8) * 0.05) * W;
          const y = (y0 + Math.cos(lt * sp * (0.3 + v * 0.6) + ph * 6) * 0.04) * H;
          const s = (0.3 + v * 0.9) * sz * 26;
          const gr = g.createRadialGradient(x, y, s * 0.55, x, y, s);
          gr.addColorStop(0, `rgba(${r},${gg},${b},${amt * 0.5})`);
          gr.addColorStop(0.8, `rgba(${r},${gg},${b},${amt * 0.32})`);
          gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
          g.fillStyle = gr;
          g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
        }
        g.restore();
      },
    },
    {
      id: 'lightning', name: 'Lightning flashes', group: 'Weather', depth: 0.95, fields: [
        F.range('amount', 'Brightness', 0, 1, 0.01, 0.55), F.range('rate', 'Flashes per 10 s', 0.5, 6, 0.5, 2),
        F.range('bolt', 'Bolt visibility', 0, 1, 0.01, 0.5), F.color('color', 'Flash colour', '#eaf2ff'), F.range('seed', 'Timing', 1, 99, 1, 4),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.55 : o.amount, rate = (o.rate == null ? 2 : o.rate) / 10;
        const boltV = o.bolt == null ? 0.5 : o.bolt;
        const [r, gg, b] = U.hexRgb(o.color || '#eaf2ff');
        const R = U.rng(o.seed || 4);
        const period = 1 / rate;
        const k = Math.floor(lt / period), ph = (lt % period) / period;
        const elapsed = ph * period;
        // flash envelope: quick double-strike, visible for ~0.3 s of each period
        const env = Math.max(Math.exp(-elapsed * 9), 0.6 * Math.exp(-Math.max(0, elapsed - 0.08) * 12));
        if (env < 0.02) return;
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(${r},${gg},${b},${amt * env * 0.8})`;
        g.fillRect(0, 0, W, H);
        // seeded bolt polyline for this strike
        if (boltV > 0.02) {
          const R2 = U.rng((o.seed || 4) + k * 37);
          const bx = W * (0.25 + R2() * 0.5);
          let x = bx, y = 0;
          g.strokeStyle = `rgba(${r},${gg},${b},${amt * env * boltV})`;
          g.lineWidth = Math.max(2, H / 420); g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y);
          while (y < H * (0.5 + R2() * 0.35)) {
            y += H * (0.04 + R2() * 0.06);
            x += (R2() - 0.5) * W * 0.06;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.restore();
      },
    },
    {
      id: 'leak', name: 'Light leak', group: 'Light', depth: 0.98, fields: [
        F.range('amount', 'Amount', 0, 1, 0.01, 0.4), F.range('x', 'Centre X', 0, 1, 0.01, 0.85),
        F.range('drift', 'Drift', 0, 1, 0.01, 0.4), F.color('color', 'Colour', '#ff9d45'),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.4 : o.amount;
        const [r, gg, b] = U.hexRgb(o.color || '#ff9d45');
        const cx = ((o.x == null ? 0.85 : o.x) + Math.sin(lt * 0.3) * (o.drift == null ? 0.4 : o.drift) * 0.05) * W;
        const cy = H * (0.3 + Math.cos(lt * 0.22) * 0.12);
        const rad = Math.hypot(W, H) * 0.75;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, `rgba(${r},${gg},${b},${amt * 0.55})`);
        gr.addColorStop(0.5, `rgba(${r},${gg},${b},${amt * 0.18})`);
        gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.restore();
      },
    },
    {
      id: 'smoke', name: 'Drifting smoke (dark)', group: 'Weather', depth: 0.6, fields: [
        F.range('amount', 'Amount', 0, 1, 0.01, 0.3), F.range('speed', 'Drift', 0, 1, 0.01, 0.2),
        F.range('y', 'Height', 0, 1, 0.01, 0.5), F.range('seed', 'Shape', 1, 99, 1, 17),
      ],
      draw(g, o, lt, W, H) {
        const amt = o.amount == null ? 0.3 : o.amount, sp = o.speed == null ? 0.2 : o.speed;
        const tile = noiseTile((o.seed || 17) + 1, 220, 120, 5, 0.35, 1);
        const y0 = (o.y == null ? 0.5 : o.y) * H;
        const drift = (lt * sp * 0.08) % 1;
        g.save();
        g.globalAlpha = amt;
        const gr = g.createLinearGradient(0, y0 - H * 0.3, 0, y0 + H * 0.55);
        gr.addColorStop(0, 'rgba(10,10,14,0)'); gr.addColorStop(0.5, 'rgba(10,10,14,.7)'); gr.addColorStop(1, 'rgba(10,10,14,0)');
        g.fillStyle = gr; g.fillRect(0, y0 - H * 0.3, W, H * 0.85);
        g.globalCompositeOperation = 'source-atop';
        const tw = W * 1.6;
        g.globalAlpha = amt;
        g.drawImage(tile, -drift * tw * 0.5, y0 - H * 0.28, tw, H * 0.8);
        g.drawImage(tile, -drift * tw * 0.5 + tw, y0 - H * 0.28, tw, H * 0.8);
        g.restore();
      },
    },
  ];

  const byId = {};
  for (const a of LIST) byId[a.id] = a;

  function defaults(a) { const d = {}; for (const f of a.fields || []) d[f.key] = f.def; return d; }
  function create(id) { const a = byId[id]; return a ? Object.assign({ kind: id, seed: 1 }, defaults(a)) : null; }

  // draw one atmosphere entry
  function draw(g, o, lt, W, H, S, env) {
    const a = byId[o.kind];
    if (!a) return;
    try { a.draw(g, o, lt, W, H, S, env); } catch (e) { /* never break a render over weather */ }
  }

  return { LIST, byId, create, draw, noiseTile };
})();
