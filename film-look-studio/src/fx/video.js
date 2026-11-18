// VHS / CRT / glitch: home-tape wear, monitor glass, channel split, digital damage and scanlines.
// Every re-roll (band offsets, slice picks, block noise, invert frames) keys off the film-frame
// index e.film(24), so the preview and the export render identical frames. No per-pixel loops at
// full resolution: bands and slices are drawImage calls, the textures are cached pattern tiles
// and low-res noise stretched up.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;

  // ---------- VHS tape ----------
  const NW = 240, NH = 96; // tracking-bar noise tile, cached per seed
  function noiseStrip(seed) {
    return U.cache('vhs:noise|' + seed, () => {
      const c = U.canvas(NW, NH), g = U.ctx2(c), img = g.createImageData(NW, NH), d = img.data;
      for (let y = 0; y < NH; y++) {
        let base = 36 + U.h1(y, seed) * 150; // one grey per row -> long horizontal streaks
        if (U.h1(y, seed + 31) > 0.92) base += 70; // the odd brighter streak
        for (let x = 0; x < NW; x++) {
          const i = (y * NW + x) * 4;
          let v = base + (U.h2(x, y, seed + 5) - 0.5) * 46;
          if (U.h2(x, y, seed + 9) > 0.988) v = 225 + U.h2(x, y, seed + 13) * 30; // white specks
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }

  register({
    id: 'vhs', name: 'VHS tape', family: 'video', kind: 'process',
    desc: 'Home-video tape: chroma bleed, jittery scan bands and a torn grey tracking bar. Wear scales everything at once.',
    params: [
      P.range('wear', 'Tape wear', 0, 1, 0.05, 0.65),
      P.range('chroma', 'Chroma bleed', 0, 1, 0.05, 0.6),
      P.range('bands', 'Jitter bands', 0, 1, 0.05, 0.5),
      P.range('tracking', 'Tracking bar', 0, 1, 0.05, 0.3),
      P.range('sat', 'Colour richness', 0.8, 1.4, 0.05, 1.1),
    ],
    process(g, P, e) {
      const { W, H, S, seed } = e, src = e.src();
      const m = U.lerp(0.25, 1, P.wear); // master SP/EP wear scale
      const fi = e.film(24); // band and tear offsets re-roll per film frame

      // 1. jitter bands: horizontal slices nudged sideways on smooth noise
      if (P.bands * m > 0.02) {
        const n = Math.max(2, Math.round(U.lerp(3, 10, P.bands)));
        const amp = U.lerp(1.5, 6, P.bands) * S * m;
        for (let i = 0; i < n; i++) {
          const y = ((i + 0.15 + U.h1(i, seed + 3) * 0.7) / n) * H;
          const bh = U.lerp(8, 30, U.h1(i, seed + 4)) * S * U.lerp(0.7, 1.25, P.bands);
          const off = U.noise1(fi * 0.9 + i * 17.3, seed + i * 29) * amp;
          if (Math.abs(off) < 0.35) continue;
          g.drawImage(src, 0, y, W, bh, off, y, W, bh);
        }
      }

      // 2. chroma bleed: the red channel (plus a whisper of blue) smeared along the scan
      const chr = P.chroma * m * (1 + Math.max(0, P.sat - 1) * 1.2);
      if (chr > 0.02) {
        const dx = U.lerp(3, 8, U.clamp(chr)) * S;
        g.globalCompositeOperation = 'screen';
        g.globalAlpha = 0.35 * chr;
        g.drawImage(U.channel(src, 0, 'vhs:R'), dx, 0);
        if (chr > 0.45) {
          g.globalAlpha = 0.16 * chr;
          g.drawImage(U.channel(src, 2, 'vhs:B'), -dx * 0.6, 0);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }

      // 3. tracking bar: noisy grey smear with white tear lines over the bottom 8-14%
      const trk = P.tracking * m;
      if (trk > 0.02) {
        const tH = Math.max(4, Math.round(H * U.lerp(0.08, 0.14, U.clamp(trk)))), y0 = H - tH;
        const tile = noiseStrip(seed);
        const sx = (fi * 53 + Math.floor(U.h1(fi, seed + 22) * 112)) % (NW - 120); // sliding window
        const bar = U.tmp('vhs:bar', W, tH), bg = U.ctx2(bar);
        bg.drawImage(tile, sx, 0, 120, NH, 0, 0, W, tH);
        const fadeH = Math.min(tH * 0.45, 18 * S);
        if (fadeH > 1) { // melt the top edge of the bar into the picture
          bg.globalCompositeOperation = 'destination-out';
          const fg = bg.createLinearGradient(0, 0, 0, fadeH);
          fg.addColorStop(0, 'rgba(0,0,0,0.95)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
          bg.fillStyle = fg; bg.fillRect(0, 0, W, fadeH);
          bg.globalCompositeOperation = 'source-over';
        }
        const nl = 2 + Math.floor(trk * 3); // tear lines, new every film frame
        for (let i = 0; i < nl; i++) {
          const k = fi * 7 + i;
          const ly = U.h1(k, seed + 60) * Math.max(1, tH - 3);
          const lh = Math.max(1, Math.round((1 + U.h1(k, seed + 71) * 1.6) * Math.max(1, S)));
          const full = U.h1(k, seed + 81) > 0.35;
          const lw = full ? W : W * (0.2 + U.h1(k, seed + 91) * 0.8);
          const lx = full ? 0 : U.h1(k, seed + 101) * (W - lw);
          bg.fillStyle = U.h1(k, seed + 111) > 0.3
            ? `rgba(255,255,255,${(0.4 + 0.45 * U.h1(k, seed + 121)).toFixed(3)})`
            : 'rgba(0,0,0,0.4)';
          bg.fillRect(lx, ly, lw, lh);
        }
        g.globalAlpha = U.clamp(0.35 + 0.65 * trk);
        g.drawImage(bar, 0, y0);
        g.globalAlpha = 1;
      }

      // 4. washed-out tape colour: grey wash below sat 1, 4% black veil on well-worn tapes
      if (P.sat < 0.99) { g.fillStyle = `rgba(128,128,128,${((1 - P.sat) * 0.5).toFixed(3)})`; g.fillRect(0, 0, W, H); }
      const dip = 0.04 * U.sstep(0.6, 1, P.wear);
      if (dip > 0.002) { g.fillStyle = `rgba(0,0,0,${dip.toFixed(3)})`; g.fillRect(0, 0, W, H); }
    },
  });
  preset('vhs-home', 'VHS: home tape', 'vhs', {});
  preset('vhs-worn', 'VHS: worn tracking', 'vhs', { wear: 0.8, tracking: 0.8 });
  preset('vhs-ruined', 'VHS: ruined tape', 'vhs', { wear: 1, chroma: 1, bands: 1, tracking: 1 });
  preset('vhs-cleanish', 'VHS: light static', 'vhs', { wear: 0.35 });

  // ---------- CRT monitor glass ----------
  register({
    id: 'crt', name: 'CRT monitor', family: 'video', light: false,
    desc: 'CRT glass: scanlines, aperture-grille stripes, a diagonal reflection streak, corner falloff and slow flicker.',
    params: [
      P.range('lines', 'Scanlines', 0, 1, 0.05, 0.55),
      P.range('grille', 'Aperture grille', 0, 1, 0.05, 0.35),
      P.range('vignette', 'Corner falloff', 0, 0.6, 0.05, 0.35),
      P.range('reflect', 'Glass reflection', 0, 1, 0.05, 0.35),
      P.range('flick', 'Flicker', 0, 0.3, 0.01, 0.08),
    ],
    draw(g, P, e) {
      const { W, H, S, lt, seed } = e;

      if (P.grille > 0.02) { // vertical RGB phosphor stripes, cell >= 3 px
        const cell = Math.max(3, Math.round(3 * S));
        const tile = U.cache(`crt:grille|${S.toFixed(3)}`, () => {
          const c = U.canvas(cell, Math.max(2, Math.round(2 * S))), tg = U.ctx2(c);
          const w = Math.max(1, Math.floor(cell / 3));
          tg.fillStyle = '#ff2828'; tg.fillRect(0, 0, w, c.height);
          tg.fillStyle = '#28ff46'; tg.fillRect(w, 0, w, c.height);
          tg.fillStyle = '#3a64ff'; tg.fillRect(w * 2, 0, c.width - w * 2, c.height);
          return c;
        });
        g.globalAlpha = 0.01 + 0.03 * P.grille; // 1-4% strength
        g.fillStyle = g.createPattern(tile, 'repeat');
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }

      if (P.lines > 0.02) { // 2-3 px pitch at 1080; strength only is what flickers
        const pitch = Math.max(2, Math.round(3 * S));
        const tile = U.cache(`crt:lines|${S.toFixed(3)}`, () => {
          const c = U.canvas(2, pitch), tg = U.ctx2(c);
          tg.fillStyle = '#000';
          tg.fillRect(0, 0, 2, Math.max(1, Math.round(pitch / 3)));
          return c;
        });
        const flick = 1 + P.flick * 1.4 * U.fbm1(lt * 0.8, seed, 2); // ~0.5-1 Hz wobble
        g.globalAlpha = Math.min(1, P.lines * 0.45 * flick);
        g.fillStyle = g.createPattern(tile, 'repeat');
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }

      if (P.reflect > 0.02) { // one soft diagonal streak of window light on the glass
        const A = 0.16 * P.reflect, w0 = Math.max(8, W * 0.10), L = Math.hypot(W, H) * 1.25;
        g.save();
        g.translate(W * 0.30, -H * 0.05);
        g.rotate(0.55);
        let lg = g.createLinearGradient(0, 0, w0, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, `rgba(255,255,255,${A.toFixed(3)})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.fillRect(0, 0, w0, L);
        const w1 = w0 * 0.4, x1 = w0 * 1.9; // a thinner companion streak
        lg = g.createLinearGradient(x1, 0, x1 + w1, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, `rgba(255,255,255,${(A * 0.45).toFixed(3)})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.fillRect(x1, 0, w1, L);
        g.restore();
      }

      if (P.vignette > 0.01) {
        const R = Math.hypot(W, H) / 2, v = P.vignette;
        const gr = g.createRadialGradient(W / 2, H / 2, R * 0.45, W / 2, H / 2, R);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.65, `rgba(0,0,0,${(v * 0.18).toFixed(3)})`);
        gr.addColorStop(0.88, `rgba(0,0,0,${(v * 0.6).toFixed(3)})`);
        gr.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, v).toFixed(3)})`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    },
  });
  preset('crt-monitor', 'CRT: studio monitor', 'crt', {});
  preset('crt-tv', 'CRT: living-room TV', 'crt', { lines: 0.8, grille: 0.5, vignette: 0.45 });
  preset('crt-arcade', 'CRT: arcade bright', 'crt', { lines: 0.3, grille: 0.8, reflect: 0.6, vignette: 0.3 });
  preset('crt-soft', 'CRT: gentle lines only', 'crt', { lines: 0.3, grille: 0, vignette: 0, reflect: 0, flick: 0 });

  // ---------- RGB split ----------
  register({
    id: 'rgb', name: 'RGB split', family: 'video', kind: 'process',
    desc: 'Chromatic aberration: red and blue channels pulled apart along a direction, with an optional ghost double.',
    params: [
      P.range('amount', 'Amount', 0, 1, 0.05, 0.7),
      P.range('px', 'Shift (px at 1080)', 2, 14, 0.5, 5),
      P.range('angle', 'Direction', 0, 360, 5, 0),
      P.range('ghost', 'Ghost double', 0, 1, 0.05, 0),
    ],
    process(g, P, e) {
      const { S } = e, src = e.src();
      const d = P.px * S * P.amount;
      if (d < 0.5) return;
      const a = P.angle * Math.PI / 180, dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      // exact split: the three pure channels recombine additively, red shifted one way, blue the other
      const rC = U.channel(src, 0, 'rgb:R'), gC = U.channel(src, 1, 'rgb:G'), bC = U.channel(src, 2, 'rgb:B');
      g.globalCompositeOperation = 'copy';
      g.drawImage(rC, -dx, -dy);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(gC, 0, 0);
      g.drawImage(bC, dx, dy);
      if (P.ghost > 0.02) { // faint double at twice the shift
        g.globalAlpha = 0.2 * P.ghost;
        g.drawImage(rC, -dx * 2, -dy * 2);
        g.drawImage(bC, dx * 2, dy * 2);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
  });
  preset('rgb-subtle', 'RGB split: subtle stereo', 'rgb', { px: 3 });
  preset('rgb-film', 'RGB split: film fringe', 'rgb', { px: 10, ghost: 0.25 });
  preset('rgb-heavy', 'RGB split: heavy datamosh', 'rgb', { px: 12, ghost: 0.5, amount: 1 });
  preset('rgb-vertical', 'RGB split: vertical', 'rgb', { angle: 90, px: 7 });

  // ---------- digital glitch ----------
  register({
    id: 'glitch', name: 'Digital glitch', family: 'video', kind: 'process',
    desc: 'Digital interference: displaced slices, RGB tear, colour blocks and the odd inverted frame. Sustained or in bursts.',
    params: [
      P.select('mode', 'Timing', [['sustained', 'Sustained interference'], ['burst', 'Bursts (2-3 per layer)']], 'sustained'),
      P.range('intensity', 'Intensity', 0, 1, 0.05, 0.7),
      P.range('slices', 'Slices', 4, 14, 1, 8),
      P.range('h', 'Slice height (px)', 8, 60, 1, 30),
      P.range('shift', 'Slice shift (px)', 10, 80, 1, 45),
      P.range('tear', 'RGB tear', 0, 1, 0.05, 0.5),
      P.range('blocks', 'Colour blocks', 0, 1, 0.05, 0.5),
      P.range('invert', 'Invert chance', 0, 0.1, 0.005, 0.02),
    ],
    process(g, P, e) {
      const { W, H, S, lt, dur, seed } = e, src = e.src();
      // burst mode: 2-3 seeded bursts of 4-10 film frames inside the layer, clean in between
      let env = 1;
      if (P.mode === 'burst') {
        env = 0;
        const nb = 2 + (U.h1(7, seed) < 0.45 ? 1 : 0);
        const span = Math.max(0.4, dur);
        for (let i = 0; i < nb; i++) {
          const st = ((i + 0.2 + 0.55 * U.h1(i, seed + 50)) / nb) * span;
          const len = (4 + Math.floor(U.h1(i, seed + 51) * 7)) / 24;
          if (lt >= st && lt < st + len) {
            const k = Math.min(U.clamp((lt - st) * 24), U.clamp((st + len - lt) * 24));
            env = Math.max(env, k * (0.7 + 0.3 * U.h1(i, seed + 52)));
          }
        }
      }
      const I = P.intensity * env;
      if (I < 0.02) return;
      const fi = e.film(24);
      const life = 0.75 + 0.25 * (0.5 + 0.5 * U.fbm1(lt * 0.6, seed + 9)); // slow swell, deterministic
      const amp = P.shift * S * I * life;

      // slices: re-picked every 2-4 film frames, displaced sideways
      const n = Math.round(P.slices), hPx = P.h * S;
      const period = 2 + Math.floor(U.h1(0, seed) * 2.999);
      const ep = Math.floor(fi / period);
      const drawn = [];
      for (let i = 0; i < n; i++) {
        const y = ((i + 0.1 + U.h1(ep * 101 + i * 7, seed + i * 31) * 0.8) / n) * H;
        const bh = Math.min((0.45 + U.h1(ep * 101 + i * 13, seed + i * 37) * 1.1) * hPx, Math.max(1, H - y));
        const dx = (U.h1(ep * 101 + i * 19, seed + i * 41) < 0.5 ? -1 : 1)
          * amp * (0.2 + 0.8 * U.h1(ep * 101 + i * 23, seed + i * 43));
        if (Math.abs(dx) < 0.5 || y >= H - 1) continue;
        g.drawImage(src, 0, y, W, bh, dx, y, W, bh);
        drawn.push([Math.abs(dx), dx, y, bh]);
      }

      // RGB tear on the 2-3 strongest slices
      const tear = P.tear * I;
      if (tear > 0.08 && drawn.length) {
        drawn.sort((a, b) => b[0] - a[0]);
        const rC = U.channel(src, 0, 'gl:R'), bC = U.channel(src, 2, 'gl:B');
        const tp = U.lerp(6, 20, P.tear) * S;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(0.75, 0.45 + 0.45 * tear);
        const k = Math.min(2 + (P.tear > 0.7 ? 1 : 0), drawn.length);
        for (let j = 0; j < k; j++) {
          const [, dx, y, bh] = drawn[j];
          g.drawImage(rC, 0, y, W, bh, dx - tp, y, W, bh);
          g.drawImage(bC, 0, y, W, bh, dx + tp, y, W, bh);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }

      // colour blocks: pure #18f0ff / #ff2050 / white rectangles, re-rolled on their own 2-4 frame clock
      if (P.blocks > 0.02) {
        const bEp = Math.floor(fi / (2 + Math.floor(U.h1(2, seed) * 2.999)));
        const cnt = Math.round(U.lerp(8, 24, P.blocks));
        const cols = ['#18f0ff', '#ff2050', '#ffffff'];
        g.globalAlpha = 0.25 * U.clamp(0.4 + 0.6 * I);
        for (let i = 0; i < cnt; i++) {
          const k = bEp * 211 + i * 3;
          const bw = U.lerp(10, 80, U.h1(k, seed + 130 + i)) * S;
          const bh = U.lerp(10, 80, U.h1(k, seed + 170 + i)) * S;
          g.fillStyle = cols[(U.h1(k, seed + 210 + i) * 3) | 0];
          g.fillRect(U.h1(k, seed + 250 + i) * Math.max(1, W - bw), U.h1(k, seed + 290 + i) * Math.max(1, H - bh), bw, bh);
        }
        g.globalAlpha = 1;
      }

      // the rare one-frame invert, decided per film frame
      if (P.invert > 0 && U.h1(fi, seed + 99) < P.invert) {
        g.globalCompositeOperation = 'difference';
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
    },
  });
  preset('glitch-broadcast', 'Glitch: broadcast error', 'glitch', { mode: 'sustained', intensity: 0.7 });
  preset('glitch-bursts', 'Glitch: bursts', 'glitch', { mode: 'burst', intensity: 0.8, invert: 0.03 });
  preset('glitch-mosh', 'Glitch: datamosh', 'glitch', { mode: 'sustained', intensity: 1, tear: 1, blocks: 0.8, slices: 12, shift: 70 });
  preset('glitch-tiny', 'Glitch: tiny stutter', 'glitch', { intensity: 0.25, slices: 5, h: 16, shift: 26, tear: 0.2, blocks: 0.15, invert: 0 });

  // ---------- scanlines & rolling interference ----------
  register({
    id: 'scan', name: 'Scanlines & roll', family: 'video', light: false,
    desc: 'Fine scanlines plus a slow rolling interference band crawling down, like a TV losing sync.',
    params: [
      P.range('lines', 'Line strength', 0, 0.4, 0.01, 0.18),
      P.range('pitch', 'Line pitch (px)', 2, 5, 1, 2),
      P.range('roll', 'Rolling band', 0, 1, 0.05, 0.5),
      P.range('band', 'Band strength', 0, 1, 0.05, 0.6),
    ],
    draw(g, P, e) {
      const { W, H, S, lt, seed } = e;
      if (P.lines > 0.005) {
        const pitch = Math.max(2, Math.round(P.pitch * S));
        const tile = U.cache(`scan:tile|${pitch}|${S.toFixed(3)}`, () => {
          const c = U.canvas(2, pitch), tg = U.ctx2(c);
          tg.fillStyle = '#000';
          tg.fillRect(0, 0, 2, Math.max(1, Math.round(pitch * 0.45)));
          return c;
        });
        g.globalAlpha = P.lines;
        g.fillStyle = g.createPattern(tile, 'repeat');
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
      const k = P.roll * P.band;
      if (k > 0.01) { // one bright + dark bar travelling down over a seeded 6-12 s
        const period = U.lerp(6, 12, U.h1(3, seed));
        const bh = U.lerp(0.08, 0.12, U.h1(5, seed)) * H;
        const yTop = ((lt / period) % 1) * (H + bh) - bh;
        const gr = g.createLinearGradient(0, yTop, 0, yTop + bh);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.28, `rgba(255,255,255,${(0.14 * k).toFixed(3)})`);
        gr.addColorStop(0.52, 'rgba(255,255,255,0)');
        gr.addColorStop(0.78, `rgba(0,0,0,${(0.18 * k).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, yTop, W, bh);
      }
    },
  });
  preset('scan-fine', 'Scanlines: fine CRT lines', 'scan', { lines: 0.16, pitch: 2, roll: 0 });
  preset('scan-roll', 'Scanlines: rolling interference', 'scan', { lines: 0.12, pitch: 3, roll: 0.8, band: 0.85 });
  preset('scan-tv-set', 'Scanlines: TV set', 'scan', { lines: 0.3, roll: 0.4 });
})();
