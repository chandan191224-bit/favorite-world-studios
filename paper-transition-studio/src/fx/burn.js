// Cached arrival fields: smouldering paper, and a stained, dry-brush reveal.
(() => {
  const U = PT.util, { range, select, bool } = PT.fx.P;
  const fields = new Map();

  // Four fields total (including both effects); no full-size noise or per-frame ImageData allocations.
  function cached(key, env, build) {
    if (fields.has(key)) {
      const f = fields.get(key);
      fields.delete(key); fields.set(key, f);
      return f;
    }
    const scale = Math.min(1, 640 / Math.max(env.W, env.H));
    const w = Math.max(1, Math.round(env.W * scale)), h = Math.max(1, Math.round(env.H * scale));
    const mask = U.canvas(w, h), look = U.canvas(w, h);
    const mg = mask.getContext('2d'), lg = look.getContext('2d');
    const f = { w, h, mask, look, mg, lg, maskData: mg.createImageData(w, h), lookData: lg.createImageData(w, h) };
    build(f);
    fields.set(key, f);
    if (fields.size > 4) fields.delete(fields.keys().next().value);
    return f;
  }

  function burnField(P, env) {
    const { W, H, S, seed } = env;
    const key = JSON.stringify(['burn', W, H, seed, P.origin, P.cx, P.cy, P.spots, P.shape]);
    return cached(key, env, f => {
      const random = U.rng(seed + 431), centres = [];
      let cx = P.cx * W / S, cy = P.cy * H / S;
      if (P.origin === 'bottom') cy = H / S;
      if (P.origin === 'top') cy = 0;
      if (P.origin === 'left') cx = 0;
      centres.push([cx, cy, 0]);
      const count = P.origin === 'spots' ? U.clamp(Math.round(P.spots), 1, 4) : 1;
      for (let j = 1; j < count; j++) centres.push([(0.12 + random() * 0.76) * W / S, (0.12 + random() * 0.76) * H / S, random() * 0.055]);
      const { w, h } = f, n = w * h, dx = W / (w * S), dy = H / (h * S);
      f.arrival = new Float32Array(n); f.inv = new Float32Array(n); f.texture = new Uint8Array(n);
      f.max = 0;
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
        const X = (x + 0.5) * dx, Y = (y + 0.5) * dy;
        let d = Infinity;
        for (const c of centres) {
          const rx = X - c[0], ry = Y - c[1];
          const v = P.shape === 'teardrop'
            ? Math.hypot(rx * (1 + 0.85 * U.clamp(-ry / 0.45)), ry * (ry < 0 ? 0.53 : 1.18))
            : Math.hypot(rx, ry);
          d = Math.min(d, v + c[2]);
        }
        // Broad meanders, flaky middle detail, then 5-15 px bites at 1080p.
        const ragged = 0.033 * U.fbm2(X * 5, Y * 5, seed, 3)
          + 0.012 * U.noise2(X * 37, Y * 37, seed + 71)
          + 0.006 * U.noise2(X * 143, Y * 143, seed + 93);
        const v = Math.max(0, d + ragged);
        f.arrival[i] = v; f.max = Math.max(f.max, v);
        f.texture[i] = 255 * U.clamp(0.5 + 0.32 * U.noise2(X * 92, Y * 92, seed + 111) + 0.18 * (U.h2(x, y, seed + 5) * 2 - 1));
      }
      // Convert arrival differences to approximate physical distances, keeping rim widths consistent.
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
        const x0 = Math.max(0, x - 1), x1 = Math.min(w - 1, x + 1);
        const y0 = Math.max(0, y - 1), y1 = Math.min(h - 1, y + 1);
        const gx = (f.arrival[y * w + x1] - f.arrival[y * w + x0]) / (Math.max(1, x1 - x0) * dx);
        const gy = (f.arrival[y1 * w + x] - f.arrival[y0 * w + x]) / (Math.max(1, y1 - y0) * dy);
        f.inv[i] = 1 / U.clamp(Math.hypot(gx, gy), 0.55, 2.6);
      }
      const gw = Math.max(1, Math.ceil(w / 5)), gh = Math.max(1, Math.ceil(h / 5));
      f.glow = U.canvas(gw, gh); f.gg = f.glow.getContext('2d'); f.glowData = f.gg.createImageData(gw, gh);
      // Stable spatial sites, rather than a new random particle distribution each frame.
      f.sites = [];
      for (let j = 0; j < 1900; j++) {
        const x = random(), y = random(), i = Math.min(h - 1, Math.floor(y * h)) * w + Math.min(w - 1, Math.floor(x * w));
        f.sites.push({ x: x * W, y: y * H, a: f.arrival[i], inv: f.inv[i], r: random(), phase: random() * Math.PI * 2 });
      }
    });
  }

  // Mask only the outgoing sheet, never the already drawn incoming image.
  function remaining(ctx, A, f, env, decorate) {
    const { W, H } = env, sheet = env.tmp('burn-ink:sheet', W, H), g = sheet.getContext('2d');
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.drawImage(A, 0, 0);
    if (decorate && !env.matte) decorate(g);
    g.globalCompositeOperation = 'destination-in'; g.imageSmoothingEnabled = !env.matte;
    g.drawImage(f.mask, 0, 0, W, H); g.restore();
    ctx.drawImage(sheet, 0, 0);
  }

  function fireDetails(ctx, f, threshold, P, env, ignition) {
    const { W, H, S, t } = env;
    const end = 1 - U.smooth(U.range(threshold, f.max, f.max + 0.075));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = ignition * end;
    ctx.drawImage(f.glow, 0, 0, W, H);
    ctx.restore();
    for (const q of f.sites) {
      const d = (q.a - threshold) * q.inv;
      const edge = U.clamp(1 - Math.abs(d) / 0.013) * ignition * end;
      if (P.flame && edge > 0 && q.r < 0.72) {
        const flicker = 0.65 + 0.22 * Math.sin(t * 21 + q.phase) + 0.13 * Math.sin(t * 39 + q.phase * 2);
        const height = S * (0.012 + q.r * 0.058) * flicker, width = S * (0.002 + q.r * 0.005);
        const lean = S * 0.008 * Math.sin(t * 10 + q.phase), x = q.x, y = q.y;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = edge * 0.55;
        const gr = ctx.createLinearGradient(x, y, x + lean, y - height);
        gr.addColorStop(0, 'rgba(255,220,92,0.9)'); gr.addColorStop(0.28, 'rgba(255,127,18,0.7)'); gr.addColorStop(1, 'rgba(210,52,6,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - width, y + width);
        ctx.bezierCurveTo(x - width * 1.8, y - height * 0.35, x + lean - width, y - height * 0.64, x + lean, y - height);
        ctx.bezierCurveTo(x + lean + width * 0.4, y - height * 0.56, x + width * 2, y - height * 0.2, x + width, y + width);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      if (P.smoke && edge > 0 && q.r < 0.095) {
        const age = ((t * 0.48 + q.phase) % 1 + 1) % 1;
        const radius = S * (0.012 + age * 0.035);
        const x = q.x + S * (age * 0.025 + 0.009 * Math.sin(q.phase + age * 4));
        const y = q.y - age * S * 0.16;
        ctx.save(); ctx.globalAlpha = edge * Math.sin(age * Math.PI) * 0.12;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gr.addColorStop(0, 'rgba(108,103,94,0.85)'); gr.addColorStop(1, 'rgba(108,103,94,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
      }
      // Emit only after the front passes a site. Scrubbing backward reconstructs the same flakes.
      const age = -d / 0.14;
      if (age <= 0 || age >= 1 || q.r > 0.065 + 0.035 * P.sparks) continue;
      const alpha = Math.sin(age * Math.PI) * ignition * end;
      const x = q.x + S * (0.028 * Math.sin(q.phase + age * 3) + age * 0.045);
      const y = q.y - S * age * (0.07 + q.r);
      ctx.save(); ctx.globalAlpha = alpha * 0.65;
      if (q.r < 0.035 * P.sparks) {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffc85a'; ctx.lineWidth = S * 0.0012;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - S * 0.002, y + S * 0.004 * (1 - age)); ctx.stroke();
      } else {
        ctx.translate(x, y); ctx.rotate(q.phase + age * 5 + Math.sin(t * 3 + q.phase) * 0.4);
        ctx.fillStyle = q.r < 0.05 ? '#514738' : '#a99a80';
        ctx.fillRect(-S * 0.0012, -S * 0.0006, S * 0.0024, S * 0.0012);
      }
      ctx.restore();
    }
  }

  PT.fx.register({
    id: 'burn', name: 'Paper burn', family: 'Burn & ink', sfx: 'fire', dur: 3, ease: 'linear',
    desc: 'A slow smoulder ignites into a ragged hole, with flaky char, orange embers and drifting ash.',
    params: [
      select('origin', 'Burn starts', [['center', 'Centre'], ['bottom', 'Bottom edge'], ['top', 'Top edge'], ['left', 'Left edge'], ['spots', 'Several spots']], 'center'),
      range('cx', 'Origin X', 0, 1, 0.01, 0.5), range('cy', 'Origin Y', 0, 1, 0.01, 0.5),
      range('spots', 'Burn spots', 1, 4, 1, 3),
      select('shape', 'Burn shape', [['round', 'Round'], ['teardrop', 'Teardrop (rises upward)']], 'round'),
      range('char', 'Char width', 0, 1, 0.01, 0.6), bool('flame', 'Flame tongues', true),
      range('sparks', 'Sparks', 0, 1, 0.01, 0.3), bool('smoke', 'Faint smoke', true),
    ],
    draw(ctx, p, A, B, P, env) {
      ctx.drawImage(B, 0, 0);
      if (p >= 1) return;
      if (p <= 0) { ctx.drawImage(A, 0, 0); return; }
      const f = burnField(P, env), { w, h } = f;
      const e = U.clamp(env.E(U.range(p, 0.15, 1)));
      const growth = 0.10 * e + 0.90 * Math.pow(e, 1.65);
      const threshold = p < 0.15 ? U.lerp(-0.05, 0.008, U.smooth(p / 0.15)) : 0.008 + (f.max + 0.09) * growth;
      const md = f.maskData.data, ld = f.lookData.data, aa = 0.6 / Math.min(w, h);
      const charWidth = 0.009 + 0.026 * P.char, scorchWidth = charWidth + 0.028 + 0.014 * P.char;
      const ignition = U.smooth(U.range(p, 0.115, 0.205)), warmth = U.smooth(U.range(p, 0, 0.075));
      for (let i = 0, j = 0; i < f.arrival.length; i++, j += 4) {
        const d = (f.arrival[i] - threshold) * f.inv[i];
        const paper = env.matte ? +(f.arrival[i] > threshold) : U.clamp(0.5 + d / aa);
        md[j + 3] = 255 * paper;
        if (env.matte) continue;
        const texture = f.texture[i] / 255, cw = charWidth * (0.75 + texture * 0.55);
        let r = 0, g = 0, b = 0, a = 0;
        if (d >= 0 && d < scorchWidth) {
          const soot = 1 - U.smooth(U.range(d, cw * 0.65, cw * 1.3));
          const scorch = 1 - U.smooth(U.clamp(d / scorchWidth));
          r = U.lerp(125, 29 + texture * 25, soot); g = U.lerp(69, 18 + texture * 16, soot); b = U.lerp(29, 10 + texture * 10, soot);
          a = Math.max(scorch * 0.70, soot * 0.98) * warmth * paper;
        }
        const ember = U.clamp(1 - Math.abs(d - 0.001) / (0.003 + texture * 0.0025)) * ignition;
        if (ember > 0) {
          const bright = 0.8 + 0.2 * Math.sin(env.t * 24 + texture * 23);
          const ea = ember * bright;
          const out = ea + a * (1 - ea);
          r = (255 * ea + r * a * (1 - ea)) / out;
          g = ((151 + texture * 76) * ea + g * a * (1 - ea)) / out;
          b = ((27 + texture * 37) * ea + b * a * (1 - ea)) / out; a = out;
        }
        ld[j] = r; ld[j + 1] = g; ld[j + 2] = b; ld[j + 3] = a * 255;
      }
      f.mg.putImageData(f.maskData, 0, 0);
      remaining(ctx, A, f, env);
      if (env.matte) return;
      f.lg.putImageData(f.lookData, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(f.look, 0, 0, env.W, env.H); ctx.restore();
      const gd = f.glowData.data, gw = f.glow.width, gh = f.glow.height;
      for (let y = 0, j = 0; y < gh; y++) for (let x = 0; x < gw; x++, j += 4) {
        const i = Math.min(h - 1, Math.floor((y + 0.5) * h / gh)) * w + Math.min(w - 1, Math.floor((x + 0.5) * w / gw));
        const d = (f.arrival[i] - threshold) * f.inv[i], glow = U.clamp(1 - Math.abs(d) / 0.03);
        gd[j] = 255; gd[j + 1] = 91; gd[j + 2] = 15; gd[j + 3] = 105 * glow * glow;
      }
      f.gg.putImageData(f.glowData, 0, 0);
      fireDetails(ctx, f, threshold, P, env, ignition);
    },
  });

  function inkField(P, env) {
    const { W, H, S, seed } = env, count = U.clamp(Math.round(P.strokes), 2, 5);
    return cached(JSON.stringify(['ink', W, H, seed, count, P.dir]), env, f => {
      const { w, h } = f, random = U.rng(seed + 853), n = w * h;
      f.arrival = new Float32Array(n); f.stain = new Float32Array(n); f.texture = new Uint8Array(n);
      const blobs = [];
      for (let i = 0; i < 11; i++) blobs.push([random() * W / S, random() * H / S, 0.08 + random() * 0.23, 0.65 + random() * 0.7]);
      // Bristle channels run parallel to each stroke; vary their length along the sweep.
      const bristles = Array.from({ length: count }, (_, k) => {
        const row = new Float32Array(h);
        for (let y = 0; y < h; y++) row[y] = U.noise1(y / h * H / S * 185, seed + k * 29) * 0.045
          + (U.h1(Math.floor(y / h * H / S * 380), seed + k * 79) > 0.77 ? 0.085 : 0);
        return row;
      });
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
        const u = (x + 0.5) / w, v = (y + 0.5) / h, X = u * W / S, Y = v * H / S;
        const grain = U.h2(x, y, seed + 37);
        f.texture[i] = grain * 255;
        const rough = 0.011 * U.noise1(X * 63, seed + 31) + 0.005 * U.noise1(X * 201, seed + 53);
        let arrival = 1;
        for (let k = 0; k < count; k++) {
          const edge = rough + 0.018 * U.noise1(X * 9, seed + k * 21);
          if (v < k / count - 0.032 + edge || v > (k + 1) / count + 0.032 + edge) continue;
          const left = P.dir === 'left' || (P.dir === 'alternate' && k % 2 === 1);
          const sweep = left ? 1 - u : u;
          const dry = bristles[k][y] * (0.65 + 0.35 * U.noise1(X * 12, seed + k * 61));
          const start = 0.24 + 0.40 * k / (count - 1);
          arrival = Math.min(arrival, start + 0.34 * U.clamp((sweep + 0.055 + dry) / 1.11));
        }
        // The overlapping bands cover all rows, with a short final bristle pickup for gaps.
        f.arrival[i] = Math.min(arrival, 0.975 + grain * 0.01);
        let stain = Infinity;
        for (const b of blobs) stain = Math.min(stain, Math.hypot((X - b[0]) / b[2], (Y - b[1]) / (b[2] * b[3])));
        stain += U.fbm2(X * 23, Y * 23, seed + 67, 3) * 0.25 + (grain - 0.5) * 0.08;
        // Isolated droplets just ahead of the irregular tea fronts.
        if (grain > 0.982) stain -= 0.21;
        f.stain[i] = stain;
      }
      const tile = U.canvas(128, 128), g = tile.getContext('2d'), data = g.createImageData(128, 128);
      for (let i = 0; i < 128 * 128; i++) {
        const v = U.h1(i, seed + 883), j = i * 4;
        data.data[j] = data.data[j + 1] = data.data[j + 2] = v > 0.5 ? 255 : 0;
        data.data[j + 3] = 5 + v * 9;
      }
      g.putImageData(data, 0, 0); f.grain = tile;
    });
  }

  PT.fx.register({
    id: 'ink', name: 'Vintage brush reveal', family: 'Burn & ink', sfx: 'brush', dur: 2.4, ease: 'linear',
    desc: 'The page ages into sepia and tea stains, then dry, bristly brush strokes sweep the new scene into view.',
    params: [
      range('strokes', 'Brush strokes', 2, 5, 1, 4),
      select('dir', 'Brush direction', [['right', 'Left → right'], ['left', 'Right → left'], ['alternate', 'Alternate directions']], 'alternate'),
      range('sepia', 'Sepia strength', 0, 1, 0.01, 0.72), range('stains', 'Tea stains', 0, 1, 0.01, 0.65),
    ],
    draw(ctx, p, A, B, P, env) {
      ctx.drawImage(B, 0, 0);
      if (p >= 1) return;
      if (p <= 0) { ctx.drawImage(A, 0, 0); return; }
      const f = inkField(P, env), e = U.clamp(env.E(p));
      const age = U.smooth(U.range(p, 0, 0.23)), bloom = U.smooth(U.range(p, 0.045, 0.43)) * (0.65 + P.stains * 1.5);
      const md = f.maskData.data, ld = f.lookData.data;
      for (let i = 0, j = 0; i < f.arrival.length; i++, j += 4) {
        md[j + 3] = env.matte ? (f.arrival[i] > e ? 255 : 0) : 255 * U.clamp(0.5 + (f.arrival[i] - e) / 0.0025);
        if (env.matte) continue;
        const d = bloom - f.stain[i], pigment = U.smooth(U.clamp(d / 0.16));
        const ring = U.clamp(1 - Math.abs(d - 0.025) / 0.075);
        ld[j] = 111 + f.texture[i] * 0.09; ld[j + 1] = 65 + f.texture[i] * 0.05; ld[j + 2] = 27;
        ld[j + 3] = 255 * P.stains * age * Math.max(pigment * 0.24, ring * 0.39);
      }
      f.mg.putImageData(f.maskData, 0, 0);
      if (!env.matte) f.lg.putImageData(f.lookData, 0, 0);
      remaining(ctx, A, f, env, g => {
        const { W, H, S } = env;
        g.save(); g.globalCompositeOperation = 'color'; g.globalAlpha = P.sepia * age;
        g.fillStyle = '#9a6b36'; g.fillRect(0, 0, W, H); g.restore();
        g.save(); g.globalAlpha = age;
        const vignette = g.createRadialGradient(W * 0.5, H * 0.48, S * 0.16, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.61);
        vignette.addColorStop(0, 'rgba(38,22,8,0)'); vignette.addColorStop(0.65, 'rgba(38,22,8,0.09)'); vignette.addColorStop(1, 'rgba(38,22,8,0.46)');
        g.fillStyle = vignette; g.fillRect(0, 0, W, H);
        g.drawImage(f.look, 0, 0, W, H);
        g.fillStyle = g.createPattern(f.grain, 'repeat'); g.fillRect(0, 0, W, H);
        const x = W * (0.18 + U.h1(1, env.seed + 911) * 0.64) + U.noise1(env.t * 0.7, env.seed) * S * 0.0005;
        g.strokeStyle = 'rgba(242,223,182,0.18)'; g.lineWidth = Math.max(0.5, S * 0.00065);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + S * 0.0006, H); g.stroke(); g.restore();
      });
    },
  });

  const pr = PT.fx.preset;
  pr('burn-center', 'Burn hole', 'burn', { origin: 'center' }, 3, 'Slow smoulder, a glowing ragged hole, then ash');
  pr('burn-bottom', 'Burn up from the bottom', 'burn', { origin: 'bottom', shape: 'teardrop', cy: 1 }, 3, 'Flame eats upward from the lower edge');
  pr('burn-teardrop', 'Teardrop burn', 'burn', { shape: 'teardrop', cy: 0.72 }, 3, 'A narrow finger of fire reaches upward');
  pr('burn-spots', 'Burn from several spots', 'burn', { origin: 'spots', spots: 4 }, 3.2, 'Separate scorched holes grow together');
  pr('soot', 'Soot bloom', 'burn', { char: 1, flame: false, sparks: 0, smoke: true }, 3.4, 'A wide dark scorch blooms before the paper opens');
  pr('ink-brush', 'Vintage brush reveal', 'ink', { strokes: 4, dir: 'alternate', sepia: 0.72, stains: 0.65 }, 2.4, 'Tea-stained sepia gives way to dry brush strokes');
})();
