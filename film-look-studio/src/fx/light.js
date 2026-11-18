// Light leaks, lens flares, film burns, flashes, bloom and halation.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;

  const PALETTES = {
    warm: ['#ff8a2a', '#ffb347', '#ff5a1f', '#ffd27a'],
    sunset: ['#ff3b1f', '#ff7a1a', '#c4162a', '#ffb05a'],
    golden: ['#ffc65a', '#ffe08a', '#ff9f2e', '#fff1c0'],
    rose: ['#ff4f8b', '#ff8fb1', '#c2185b', '#ffb36b'],
    rainbow: ['#ff3d3d', '#ffb02e', '#4dd2ff', '#b44dff', '#57ff8a'],
    blue: ['#3d7bff', '#7fd4ff', '#2747c9', '#b8e6ff'],
    teal: ['#18c7b5', '#ff9a3c', '#2a8cff', '#ffd08a'],
    red: ['#ff1a1a', '#b30000', '#ff4d2e', '#ff7a5c'],
    white: ['#fff6e6', '#ffffff', '#ffe9c9', '#fff2dd'],
  };
  const palOpts = [['warm', 'Warm amber'], ['sunset', 'Sunset red'], ['golden', 'Golden'], ['rose', 'Rose / magenta'], ['rainbow', 'Rainbow prism'], ['blue', 'Cool blue'], ['teal', 'Teal + orange'], ['red', 'Deep red'], ['white', 'White']];

  function blob(g, x, y, r, sx, rot, color, a) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, U.rgba(color, a)); gr.addColorStop(0.3, U.rgba(color, a * 0.62)); gr.addColorStop(0.65, U.rgba(color, a * 0.2)); gr.addColorStop(1, U.rgba(color, 0));
    g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }

  register({
    id: 'leak', name: 'Light leak', family: 'light', light: true, blend: 'screen',
    desc: 'Soft coloured light spilling over the film. Drift for a gentle look; sweep or burst over a cut.',
    params: [
      P.select('palette', 'Colours', palOpts, 'warm'),
      P.select('motion', 'Motion', [['drift', 'Gentle drift'], ['sweepR', 'Sweep left → right'], ['sweepL', 'Sweep right → left'], ['sweepU', 'Rise from bottom'], ['pulse', 'Breathing pulse'], ['burst', 'Burst (white-out at the middle)']], 'drift'),
      P.range('intensity', 'Intensity', 0, 2, 0.05, 1),
      P.range('size', 'Size', 0.3, 2, 0.05, 1),
      P.range('count', 'Light blobs', 1, 8, 1, 4),
      P.range('edge', 'Hug the edges', 0, 1, 0.05, 0.6),
      P.range('speed', 'Speed', 0, 3, 0.05, 1),
      P.range('stretch', 'Streakiness', 0, 1, 0.05, 0.35),
    ],
    draw(g, P, e) {
      const { W, H, S, lt, p, seed } = e, pal = PALETTES[P.palette] || PALETTES.warm, n = Math.round(P.count);
      let env = 1;
      if (P.motion === 'burst') env = U.bell(p, 0.48) * 1.6;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 1), r2 = U.h1(i, seed + 2), r3 = U.h1(i, seed + 3);
        const side = r0 < 0.5 ? 0 : 1;
        let x = U.lerp(r1, side ? 0.92 + r2 * 0.1 : -0.02 + r2 * 0.1, P.edge), y = U.lerp(0.15, 0.85, r3);
        const sp = P.speed * 0.12;
        x += U.fbm1(lt * sp + i * 7.1, seed + 11) * 0.22; y += U.fbm1(lt * sp + i * 3.7, seed + 17) * 0.18;
        if (P.motion === 'sweepR' || P.motion === 'sweepL' || P.motion === 'burst') {
          const k = U.ease.inOut(p) * 1.7 - 0.35 + (r1 - 0.5) * 0.4;
          x = P.motion === 'sweepL' ? 1 - k : k;
        }
        if (P.motion === 'sweepU') y = 1.3 - U.ease.inOut(p) * 1.6 + (r3 - 0.5) * 0.3;
        let a = 0.62 * P.intensity * (0.72 + 0.28 * U.fbm1(lt * (0.6 + P.speed) + i * 13, seed + 23));
        if (P.motion === 'pulse') a *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(lt * P.speed * 2.2 + i * 1.7));
        a *= env;
        const r = H * (0.38 + r2 * 0.42) * P.size;
        const sx = 1 + P.stretch * (0.6 + r0 * 1.6), rot = (r3 - 0.5) * 1.2 + U.fbm1(lt * sp, seed + i) * 0.4;
        blob(g, x * W, y * H, r, sx, rot, pal[i % pal.length], Math.min(1, a));
      }
      if (P.motion === 'burst') {
        // the hot core that hides the cut
        const k = U.clamp((env - 1) / 0.6);
        if (k > 0) { g.fillStyle = U.rgba(pal[0] === '#3d7bff' ? '#e8f4ff' : '#fff4e0', k * 0.95); g.fillRect(0, 0, W, H); }
      }
      void S;
    },
  });
  preset('leak-warm', 'Warm light leak', 'leak', { palette: 'warm' });
  preset('leak-golden-edge', 'Golden edge leak', 'leak', { palette: 'golden', edge: 0.95, count: 3, size: 1.2 });
  preset('leak-sunset', 'Sunset red leak', 'leak', { palette: 'sunset', intensity: 1.15 });
  preset('leak-rose', 'Rose film leak', 'leak', { palette: 'rose', stretch: 0.6 });
  preset('leak-rainbow', 'Rainbow prism leak', 'leak', { palette: 'rainbow', count: 5, stretch: 0.8, intensity: 0.9 });
  preset('leak-blue', 'Cool blue leak', 'leak', { palette: 'blue', intensity: 0.9 });
  preset('leak-teal-orange', 'Teal + orange leak', 'leak', { palette: 'teal', count: 4 });
  preset('leak-pulse', 'Breathing leak', 'leak', { palette: 'warm', motion: 'pulse', speed: 1.2 });
  preset('leak-sweep', 'Light sweep (L → R)', 'leak', { palette: 'golden', motion: 'sweepR', count: 3, size: 1.3 }, { dur: 2 });
  preset('leak-rise', 'Rising leak', 'leak', { palette: 'sunset', motion: 'sweepU', count: 4, size: 1.2 }, { dur: 2 });
  preset('leak-burst', 'Leak burst transition', 'leak', { palette: 'warm', motion: 'burst', count: 5, size: 1.4, intensity: 1.2 }, { dur: 1.4 });
  preset('leak-burst-red', 'Red burst transition', 'leak', { palette: 'red', motion: 'burst', count: 5, size: 1.5, intensity: 1.3 }, { dur: 1.2 });

  // ---------- lens flare ----------
  register({
    id: 'flare', name: 'Lens flare', family: 'light', light: true, blend: 'screen',
    desc: 'Anamorphic streak, glow and ghost rings from a bright light. Can drift or sweep across.',
    params: [
      P.select('look', 'Look', [['anamorphic', 'Anamorphic (blue streak)'], ['sun', 'Golden sun'], ['white', 'Clean white'], ['red', 'Red warning']], 'anamorphic'),
      P.select('path', 'Movement', [['static', 'Still'], ['drift', 'Slow drift'], ['sweepR', 'Sweep left → right'], ['sweepL', 'Sweep right → left']], 'drift'),
      P.range('x', 'Light X', 0, 1, 0.01, 0.72), P.range('y', 'Light Y', 0, 1, 0.01, 0.32),
      P.range('intensity', 'Intensity', 0, 2, 0.05, 1),
      P.range('streak', 'Streak length', 0, 2, 0.05, 1),
      P.range('glow', 'Glow size', 0.2, 2.5, 0.05, 1),
      P.range('ghosts', 'Ghost rings', 0, 10, 1, 6),
      P.range('rays', 'Star rays', 0, 1, 0.05, 0.3),
    ],
    draw(g, P, e) {
      const { W, H, S, lt, p, seed } = e;
      const col = { anamorphic: ['#5fb0ff', '#a9d8ff'], sun: ['#ffb347', '#ffe3a1'], white: ['#e8eeff', '#ffffff'], red: ['#ff3020', '#ff8a70'] }[P.look] || ['#5fb0ff', '#a9d8ff'];
      let x = P.x, y = P.y;
      if (P.path === 'drift') { x += U.fbm1(lt * 0.15, seed) * 0.08; y += U.fbm1(lt * 0.12, seed + 3) * 0.05; }
      if (P.path === 'sweepR' || P.path === 'sweepL') { const k = U.lerp(-0.15, 1.15, U.ease.inOut(p)); x = P.path === 'sweepR' ? k : 1 - k; }
      const X = x * W, Y = y * H, I = P.intensity * (0.9 + 0.1 * U.fbm1(lt * 3, seed + 9));
      g.globalCompositeOperation = 'lighter';
      const R = H * 0.22 * P.glow;
      let gr = g.createRadialGradient(X, Y, 0, X, Y, R);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 * I})`); gr.addColorStop(0.08, U.rgba(col[1], 0.7 * I)); gr.addColorStop(0.35, U.rgba(col[0], 0.22 * I)); gr.addColorStop(1, U.rgba(col[0], 0));
      g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2);
      if (P.streak > 0) {
        const L = W * 0.65 * P.streak;
        g.save(); g.translate(X, Y); g.scale(1, 0.016);
        gr = g.createRadialGradient(0, 0, 0, 0, 0, L);
        gr.addColorStop(0, U.rgba(col[1], 0.9 * I)); gr.addColorStop(0.25, U.rgba(col[0], 0.45 * I)); gr.addColorStop(1, U.rgba(col[0], 0));
        g.fillStyle = gr; g.fillRect(-L, -L, L * 2, L * 2); g.restore();
        g.save(); g.translate(X, Y); g.scale(1, 0.0035);
        gr = g.createRadialGradient(0, 0, 0, 0, 0, L * 0.8);
        gr.addColorStop(0, `rgba(255,255,255,${0.9 * I})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(-L, -L, L * 2, L * 2); g.restore();
      }
      if (P.rays > 0) {
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + U.h1(i, seed) * 0.2 + lt * 0.05, len = H * (0.12 + U.h1(i, seed + 4) * 0.2) * P.glow;
          g.save(); g.translate(X, Y); g.rotate(a);
          const lg = g.createLinearGradient(0, 0, len, 0);
          lg.addColorStop(0, `rgba(255,255,255,${0.5 * P.rays * I})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = lg; g.beginPath(); g.moveTo(0, -2 * S); g.lineTo(len, 0); g.lineTo(0, 2 * S); g.fill(); g.restore();
        }
      }
      // ghosts along the line through the frame centre
      const cx = W / 2, cy = H / 2, n = Math.round(P.ghosts);
      for (let i = 0; i < n; i++) {
        const k = -0.4 + U.h1(i, seed + 20) * 1.9, gx = cx + (cx - X) * k, gy = cy + (cy - Y) * k;
        const r = H * (0.015 + U.h1(i, seed + 21) * 0.07), hue = [col[0], col[1], '#8cff9a', '#ff9ad5', '#ffd27a'][i % 5];
        const a = (0.05 + U.h1(i, seed + 22) * 0.1) * I;
        gr = g.createRadialGradient(gx, gy, r * 0.2, gx, gy, r);
        gr.addColorStop(0, U.rgba(hue, a * 0.5)); gr.addColorStop(0.85, U.rgba(hue, a)); gr.addColorStop(1, U.rgba(hue, 0));
        g.fillStyle = gr; g.beginPath();
        if (i % 3 === 2) { for (let j = 0; j < 6; j++) { const aa = j / 6 * Math.PI * 2; g.lineTo(gx + Math.cos(aa) * r, gy + Math.sin(aa) * r); } g.closePath(); }
        else g.arc(gx, gy, r, 0, Math.PI * 2);
        g.fill();
      }
    },
  });
  preset('flare-anamorphic', 'Anamorphic blue flare', 'flare', {});
  preset('flare-sun', 'Golden sun flare', 'flare', { look: 'sun', x: 0.25, y: 0.22, streak: 0.5, rays: 0.6, glow: 1.4 });
  preset('flare-sweep', 'Flare sweep', 'flare', { look: 'white', path: 'sweepR', y: 0.4, streak: 1.4 }, { dur: 2 });
  preset('flare-red', 'Red warning flare', 'flare', { look: 'red', x: 0.5, y: 0.5, streak: 1.6, ghosts: 3 });

  // ---------- film burn ----------
  const FW = 224, FH = 126;
  function field(seed) {
    return U.cache('burnfield|' + seed, () => {
      const a = new Float32Array(FW * FH), b = new Float32Array(FW * FH);
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        a[y * FW + x] = U.fbm2(x / 34, y / 34, seed, 5);
        b[y * FW + x] = U.fbm2(x / 22 + 40, y / 22, seed + 77, 4);
      }
      return [a, b];
    });
  }
  const BURN = {
    orange: [[0, '#5a0800'], [0.18, '#c41f00'], [0.4, '#ff6a00'], [0.65, '#ffc04a'], [0.85, '#fff1c4'], [1, '#ffffff']],
    red: [[0, '#3a0000'], [0.25, '#9a0000'], [0.5, '#ff1a0a'], [0.75, '#ff8a5a'], [1, '#ffe8dc']],
    white: [[0, '#4a2a10'], [0.2, '#c87a2a'], [0.45, '#ffd28a'], [0.7, '#fff6de'], [1, '#ffffff']],
    blue: [[0, '#001040'], [0.3, '#0050c8'], [0.55, '#3aa8ff'], [0.8, '#bfe8ff'], [1, '#ffffff']],
    magenta: [[0, '#300020'], [0.3, '#a0005a'], [0.55, '#ff2a8a'], [0.8, '#ffb0d0'], [1, '#ffffff']],
  };
  const rampCache = {};
  function ramp(name) {
    if (rampCache[name]) return rampCache[name];
    const stops = BURN[name] || BURN.orange, out = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const v = i / 255; let k = 0;
      while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
      const [p0, c0] = stops[k], [p1, c1] = stops[k + 1], f = U.clamp((v - p0) / (p1 - p0)), a = U.hexRgb(c0), b = U.hexRgb(c1);
      for (let c = 0; c < 3; c++) out[i * 3 + c] = U.lerp(a[c], b[c], f);
    }
    return (rampCache[name] = out);
  }
  register({
    id: 'burn', name: 'Film burn', family: 'light', light: true, blend: 'screen',
    desc: 'The projector lamp melting the film: a hot orange-white burn that spreads and fades. Put it over a cut.',
    params: [
      P.select('palette', 'Colour', [['orange', 'Classic orange'], ['red', 'Deep red'], ['white', 'White-hot'], ['blue', 'Cold blue'], ['magenta', 'Magenta']], 'orange'),
      P.select('origin', 'Starts from', [['left', 'Left edge'], ['right', 'Right edge'], ['bottom', 'Bottom'], ['top', 'Top'], ['center', 'Centre'], ['corner', 'Corner'], ['spots', 'Several spots']], 'left'),
      P.select('mode', 'Timing', [['transition', 'Burn in and out (over a cut)'], ['out', 'Burn to white and stay'], ['edge', 'Flickering edge burn (loop)']], 'transition'),
      P.range('coverage', 'How far it spreads', 0.2, 1.4, 0.05, 1),
      P.range('intensity', 'Intensity', 0, 2, 0.05, 1),
      P.range('turbulence', 'Turbulence', 0, 1.5, 0.05, 0.8),
      P.range('speed', 'Boil speed', 0, 3, 0.05, 1),
    ],
    draw(g, P, e) {
      const { W, H, lt, p, seed } = e, [fa, fb] = field(seed), rp = ramp(P.palette);
      let q;
      if (P.mode === 'transition') q = U.bell(p, 0.5) * P.coverage;
      else if (P.mode === 'out') q = U.smooth(U.clamp(p / 0.85)) * (P.coverage + 0.6);
      else q = (0.22 + 0.1 * U.fbm1(lt * 1.5 * P.speed, seed)) * P.coverage;
      if (q <= 0.001) return;
      const c = U.tmp('burnsmall', FW, FH), cg = c.getContext('2d'), img = cg.createImageData(FW, FH), d = img.data;
      const ph = lt * P.speed * 0.9, ca = Math.cos(ph), sa = Math.sin(ph);
      const spots = [[0.2, 0.3], [0.75, 0.25], [0.5, 0.8], [0.9, 0.7]].map(([x, y], i) => [U.lerp(x, U.h1(i, seed), 0.3), U.lerp(y, U.h1(i, seed + 1), 0.3)]);
      const width = 0.22, I = P.intensity;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const u = x / (FW - 1), v = y / (FH - 1), i = y * FW + x;
        let dist;
        switch (P.origin) {
          case 'right': dist = 1 - u; break;
          case 'bottom': dist = 1 - v; break;
          case 'top': dist = v; break;
          case 'center': dist = Math.hypot((u - 0.5) * 1.6, v - 0.5) * 1.3; break;
          case 'corner': dist = Math.hypot(u, v) * 0.75; break;
          case 'spots': dist = Math.min(...spots.map(([sx, sy]) => Math.hypot((u - sx) * 1.7, v - sy))) * 1.6; break;
          default: dist = u;
        }
        if (P.mode === 'edge') dist = Math.min(u, 1 - u, v * 1.4, (1 - v) * 1.4) * 2.4;
        const n = fa[i] * ca + fb[i] * sa;
        const val = dist - n * 0.45 * P.turbulence;
        const h = U.clamp((q - val) / width + 0.15);
        if (h <= 0) { d[i * 4 + 3] = 0; continue; }
        const k = Math.min(255, (h * 255) | 0) * 3, a = Math.min(1, h * 2.2) * I;
        d[i * 4] = rp[k] * a; d[i * 4 + 1] = rp[k + 1] * a; d[i * 4 + 2] = rp[k + 2] * a; d[i * 4 + 3] = 255;
      }
      cg.putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.drawImage(c, 0, 0, W, H);
      if (P.mode !== 'edge') {
        // whole-frame warm wash at the peak so the cut disappears
        const wash = U.clamp((q - 0.75) / 0.35) * I;
        if (wash > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = U.rgba(BURN[P.palette] ? BURN[P.palette][BURN[P.palette].length - 2][1] : '#ffd28a', wash * 0.9); g.fillRect(0, 0, W, H); }
      }
    },
  });
  preset('burn-classic', 'Film burn (orange)', 'burn', {}, { dur: 1.6 });
  preset('burn-right', 'Film burn from right', 'burn', { origin: 'right' }, { dur: 1.6 });
  preset('burn-red', 'Deep red burn', 'burn', { palette: 'red', origin: 'bottom' }, { dur: 1.6 });
  preset('burn-white', 'White-hot burn', 'burn', { palette: 'white', origin: 'center' }, { dur: 1.4 });
  preset('burn-spots', 'Bubbling burn spots', 'burn', { origin: 'spots', turbulence: 1.1 }, { dur: 1.8 });
  preset('burn-out', 'Burn out to white (ending)', 'burn', { mode: 'out', origin: 'corner', palette: 'white' }, { dur: 2 });
  preset('burn-edge', 'Flickering edge burn', 'burn', { mode: 'edge', intensity: 0.8 });
  preset('burn-blue', 'Cold blue burn', 'burn', { palette: 'blue', origin: 'top' }, { dur: 1.6 });

  // ---------- flash ----------
  register({
    id: 'flash', name: 'Flash cut', family: 'light', light: true, blend: 'screen', event: true, dur: 0.4,
    desc: 'Camera-flash / photo-flash frames to punch a cut or a stat. Put it right on the cut.',
    params: [
      P.select('shape', 'Shape', [['hard', 'Hard (2 frames)'], ['soft', 'Soft fade'], ['double', 'Double flash'], ['strobe', 'Strobe'], ['photo', 'Old photo flashbulb']], 'soft'),
      P.color('color', 'Colour', '#ffffff'),
      P.range('intensity', 'Intensity', 0, 1, 0.05, 1),
      P.range('count', 'Strobe flashes', 2, 10, 1, 4),
    ],
    draw(g, P, e) {
      const { W, H, p, lt, fps } = e;
      let a = 0;
      if (P.shape === 'hard') a = lt < 2 / fps ? 1 : 0;
      else if (P.shape === 'soft') a = p < 0.12 ? U.smooth(p / 0.12) : Math.pow(1 - (p - 0.12) / 0.88, 2);
      else if (P.shape === 'double') a = Math.max(U.bell(U.clamp(p / 0.35)), 0.8 * U.bell(U.clamp((p - 0.45) / 0.4)));
      else if (P.shape === 'strobe') { const n = Math.round(P.count), k = p * n; a = (k % 1) < 0.35 && k < n ? 1 : 0; }
      else if (P.shape === 'photo') {
        a = p < 0.06 ? 1 : Math.pow(1 - (p - 0.06) / 0.94, 3);
        const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
        gr.addColorStop(0, U.rgba(P.color, a * P.intensity)); gr.addColorStop(1, U.rgba(P.color, a * P.intensity * 0.55));
        g.fillStyle = gr; g.fillRect(0, 0, W, H); return;
      }
      g.fillStyle = U.rgba(P.color, U.clamp(a * P.intensity)); g.fillRect(0, 0, W, H);
    },
  });
  preset('flash-white', 'White flash', 'flash', {}, { dur: 0.4 });
  preset('flash-hard', 'Hard flash frame', 'flash', { shape: 'hard' }, { dur: 0.2 });
  preset('flash-double', 'Double flash', 'flash', { shape: 'double' }, { dur: 0.5 });
  preset('flash-strobe', 'Strobe flicker', 'flash', { shape: 'strobe', count: 5 }, { dur: 0.8 });
  preset('flash-photo', 'Flashbulb pop', 'flash', { shape: 'photo', color: '#fff4dc' }, { dur: 0.6 });
  preset('flash-warm', 'Warm flash', 'flash', { color: '#ffd9a0' }, { dur: 0.45 });

  // ---------- dip / black flicker cut ----------
  register({
    id: 'dip', name: 'Dip / black flicker', family: 'light', blend: 'source-over', event: true, dur: 0.5,
    desc: 'Dip to black (or any colour), or a few black flicker frames like a failing projector.',
    params: [
      P.select('shape', 'Shape', [['dip', 'Smooth dip'], ['flicker', 'Black flicker frames'], ['blink', 'Eye-blink (top & bottom)']], 'dip'),
      P.color('color', 'Colour', '#000000'),
      P.range('intensity', 'Strength', 0, 1, 0.05, 1),
    ],
    draw(g, P, e) {
      const { W, H, p, seed } = e;
      if (P.shape === 'blink') {
        const k = U.bell(p, 0.5), h = H / 2 * U.ease.inOut(k);
        g.fillStyle = P.color; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h); return;
      }
      let a = U.bell(p, 0.5);
      if (P.shape === 'flicker') a = U.h1(e.film(12), seed) < 0.55 * U.bell(p, 0.5) + 0.1 ? 1 : 0.15 * U.bell(p);
      g.fillStyle = U.rgba(P.color, a * P.intensity); g.fillRect(0, 0, W, H);
    },
  });
  preset('dip-black', 'Dip to black', 'dip', {}, { dur: 0.6 });
  preset('dip-flicker', 'Black flicker frames', 'dip', { shape: 'flicker' }, { dur: 0.6 });
  preset('dip-blink', 'Eye-blink cut', 'dip', { shape: 'blink' }, { dur: 0.5 });

  // ---------- glow (bloom / halation) ----------
  function glow(g, e, thr, radius, tint, amount, key) {
    const { W, H, S } = e, src = e.src();
    const sw = Math.max(16, Math.round(W / 8)), sh = Math.max(9, Math.round(H / 8));
    const small = U.tmp(key + 's', sw, sh), sg = small.getContext('2d', { willReadFrequently: true });
    sg.globalCompositeOperation = 'copy'; sg.drawImage(src, 0, 0, sw, sh); sg.globalCompositeOperation = 'source-over';
    const img = sg.getImageData(0, 0, sw, sh), d = img.data, [tr, tg, tb] = U.hexRgb(tint), t0 = thr * 255, inv = 1 / Math.max(1, 255 - t0);
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], k = Math.max(0, (l - t0) * inv);
      d[i] = d[i] * k * tr / 255; d[i + 1] = d[i + 1] * k * tg / 255; d[i + 2] = d[i + 2] * k * tb / 255; d[i + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    const big = U.tmp(key + 'b', W, H), bg = U.ctx2(big);
    U.blurInto(big, small, radius * S / 8 * 8, key);
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < Math.ceil(amount); i++) { g.globalAlpha = Math.min(1, amount - i); g.drawImage(big, 0, 0); }
    void bg;
  }
  register({
    id: 'bloom', name: 'Bloom / glow', family: 'light', kind: 'process',
    desc: 'Highlights glow softly, like old lenses and diffusion filters.',
    params: [P.range('threshold', 'Glow from brightness', 0, 0.95, 0.01, 0.6), P.range('radius', 'Radius', 4, 120, 1, 40), P.range('amount', 'Amount', 0, 3, 0.05, 1), P.color('tint', 'Tint', '#ffffff')],
    process(g, P, e) { glow(g, e, P.threshold, P.radius, P.tint, P.amount, 'bloom'); },
  });
  register({
    id: 'halation', name: 'Halation', family: 'film', kind: 'process',
    desc: 'The red-orange halo film gets around bright edges (light bouncing back through the emulsion).',
    params: [P.range('threshold', 'Starts at brightness', 0.3, 0.98, 0.01, 0.7), P.range('radius', 'Spread', 2, 60, 1, 14), P.range('amount', 'Amount', 0, 3, 0.05, 1.2), P.color('tint', 'Halo colour', '#ff4a1c')],
    process(g, P, e) { glow(g, e, P.threshold, P.radius, P.tint, P.amount, 'hal'); },
  });
  preset('bloom-soft', 'Soft bloom', 'bloom', {});
  preset('bloom-dreamy', 'Dreamy glow', 'bloom', { threshold: 0.35, radius: 80, amount: 0.9, tint: '#ffe6c8' });
  preset('halation-film', 'Film halation (red halo)', 'halation', {});
  preset('halation-strong', 'Strong halation', 'halation', { threshold: 0.55, radius: 22, amount: 2 });

  // ---------- projector hotspot ----------
  register({
    id: 'projector', name: 'Projector lamp', family: 'light', blend: 'soft-light',
    desc: 'Bright centre and darker corners that pulse with the lamp, like film thrown on a wall.',
    params: [P.range('hotspot', 'Hot centre', 0, 1, 0.05, 0.6), P.range('falloff', 'Dark corners', 0, 1, 0.05, 0.7), P.range('flicker', 'Lamp flicker', 0, 1, 0.05, 0.4), P.color('color', 'Lamp colour', '#ffe7b8')],
    draw(g, P, e) {
      const { W, H, seed } = e, f = 1 + (U.h1(e.film(18), seed) - 0.5) * P.flicker * 0.5;
      const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
      gr.addColorStop(0, U.rgba(P.color, U.clamp(P.hotspot * f))); gr.addColorStop(0.45, U.rgba(P.color, P.hotspot * 0.25 * f));
      gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${P.falloff})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    },
  });
  preset('projector-lamp', 'Projector lamp', 'projector', {});
})();
