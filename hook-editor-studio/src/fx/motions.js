// BGM-synced camera motion & visual look presets analyzed from 33 Dhruv Rathee, Nitish Rajput & Deshbhakt hooks.
// Safari-safe: never uses ctx.filter; uses cached offscreen grayscale plates + Canvas 2D compositing.
HES.motions = (() => {
  const U = HES.util;
  const bwCache = new WeakMap();

  function getBwSource(el) {
    if (!el || el instanceof HTMLVideoElement) return null;
    if (bwCache.has(el)) return bwCache.get(el);
    const w = Math.min(960, el.naturalWidth || el.width || 640);
    const h = Math.round(w * ((el.naturalHeight || el.height || 360) / Math.max(1, el.naturalWidth || el.width || 640)));
    const c = U.canvas(w, h), g = c.getContext('2d');
    g.drawImage(el, 0, 0, w, h);
    try {
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const c2 = U.clamp((y - 128) * 1.16 + 128, 0, 255); // punchy documentary B&W contrast
        d[i] = d[i + 1] = d[i + 2] = c2;
      }
      g.putImageData(img, 0, 0);
    } catch {}
    bwCache.set(el, c);
    return c;
  }

  function drawMediaCover(ctx, src, W, H, xform = {}, focusX = 0.5, focusY = 0.5) {
    const sw = src.videoWidth || src.naturalWidth || src.width || W;
    const sh = src.videoHeight || src.naturalHeight || src.height || H;
    const baseScale = Math.max(W / sw, H / sh);
    const sc = baseScale * (xform.scale || 1);
    const dw = sw * sc, dh = sh * sc;
    const cx = W * 0.5 + (xform.tx || 0) * W + (0.5 - focusX) * (dw - W) * 0.5;
    const cy = H * 0.5 + (xform.ty || 0) * H + (0.5 - focusY) * (dh - H) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    if (xform.rot) ctx.rotate(xform.rot);
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  // Procedural fallback documentary backdrop when user hasn't uploaded media yet
  function drawDemoScene(ctx, shot, t, W, H, beat) {
    const seed = shot.seed || 7;
    const pal = [
      ['#0e1824', '#1f364d', '#e5a93c'],
      ['#1a1014', '#401822', '#ef4444'],
      ['#0c1a17', '#1c3d35', '#22d3ee'],
      ['#181510', '#382c1c', '#f59e0b'],
    ][Math.abs(seed) % 4];
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // atmospheric volumetric shafts & silhouettes
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + i * 0.22 + 0.04 * Math.sin(t * 0.6 + i + seed));
      const rg = ctx.createRadialGradient(x, H * 0.42, W * 0.02, x, H * 0.42, W * (0.28 + 0.05 * beat.combined));
      rg.addColorStop(0, U.rgba(pal[2], 0.18 + 0.14 * beat.beatPulse));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // stylized horizon / architecture bars for depth
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    for (let i = 0; i < 14; i++) {
      const bx = (i / 14) * W;
      const bw = W / 13;
      const bh = H * (0.18 + 0.25 * U.h1(i, seed));
      ctx.fillRect(bx, H - bh, bw * 0.88, bh);
    }
    // grid lines subtle documentary feel
    ctx.strokeStyle = U.rgba(pal[2], 0.08 + 0.05 * beat.beatPulse);
    ctx.lineWidth = 1;
    for (let g = 1; g < 6; g++) {
      ctx.beginPath(); ctx.moveTo(0, (H * g) / 6); ctx.lineTo(W, (H * g) / 6); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette(ctx, W, H, strength = 0.55) {
    if (strength <= 0.01) return;
    const rg = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.25, W * 0.5, H * 0.5, W * 0.72);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, `rgba(0,0,0,${U.clamp(strength, 0, 0.92)})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }

  function drawLightLeak(ctx, W, H, amt, seed, beat) {
    if (amt <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const x = W * (0.12 + 0.76 * U.h1(beat.beatIndex, seed));
    const y = H * (0.2 + 0.6 * U.h1(beat.beatIndex + 3, seed));
    const rg = ctx.createRadialGradient(x, y, 0, x, y, W * (0.45 + 0.2 * amt));
    rg.addColorStop(0, `rgba(255, 195, 95, ${U.clamp(amt * 0.72)})`);
    rg.addColorStop(0.45, `rgba(235, 85, 35, ${U.clamp(amt * 0.35)})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  const FAMS = ['All', 'Beat Sync', 'Documentary', 'Color & Tension', 'Split & Cards'];

  const PRESETS = [
    {
      id: 'pulse-zoom', name: 'Beat-Pulse Zoom', fam: 'Beat Sync',
      desc: 'Steady push-in with crisp camera punch on every BGM beat (Nitish / Dhruv style).',
      def: { zoomAmp: 0.10, beatAmp: 0.055, shakeAmp: 0.0, panX: 0.0, vignette: 0.45, tint: 0 },
    },
    {
      id: 'bass-shake', name: 'Bass-Kick Impulse', fam: 'Beat Sync',
      desc: 'Damped rotational & XY camera kick triggered by BGM bass/onset hits.',
      def: { zoomAmp: 0.08, beatAmp: 0.06, shakeAmp: 0.018, panX: 0.0, vignette: 0.5, tint: 0 },
    },
    {
      id: 'whip-push', name: 'Whip-Snap Push', fam: 'Beat Sync',
      desc: 'High-velocity slide-in at shot start + beat-locked forward push (Deshbhakt / Nitish).',
      def: { zoomAmp: 0.14, beatAmp: 0.045, shakeAmp: 0.008, panX: 0.03, vignette: 0.45, tint: 0 },
    },
    {
      id: 'ken-burns-beat', name: 'Ken Burns + Beat Step', fam: 'Documentary',
      desc: 'Smooth lateral pan + subtle zoom step-ups on every 4-beat downbeat.',
      def: { zoomAmp: 0.12, beatAmp: 0.035, shakeAmp: 0.0, panX: 0.045, vignette: 0.38, tint: 0 },
    },
    {
      id: 'hud-zoom', name: 'Rapid Punch-In Reveal', fam: 'Beat Sync',
      desc: 'Fast dramatic 1.25× zoom punch-in during the first 0.5s, then beat float.',
      def: { zoomAmp: 0.18, beatAmp: 0.05, shakeAmp: 0.006, panX: 0.0, vignette: 0.55, tint: 0 },
    },
    {
      id: 'bw-color-pop', name: 'B&W → Color Beat Pop', fam: 'Color & Tension',
      desc: 'Starts gritty documentary B&W and flashes into vivid full color on downbeats.',
      def: { zoomAmp: 0.10, beatAmp: 0.05, shakeAmp: 0.006, panX: 0.015, vignette: 0.55, tint: 0 },
    },
    {
      id: 'crimson-tension', name: 'Crimson Alarm Tension', fam: 'Color & Tension',
      desc: 'Monochrome contrast with pulsing red danger wash synced to beat energy.',
      def: { zoomAmp: 0.11, beatAmp: 0.05, shakeAmp: 0.01, panX: 0.0, vignette: 0.65, tint: 0.55 },
    },
    {
      id: 'film-burn-leak', name: '16mm Film Burn Bloom', fam: 'Color & Tension',
      desc: 'Warm amber light-leaks & exposure flares blooming over beat transients.',
      def: { zoomAmp: 0.09, beatAmp: 0.045, shakeAmp: 0.005, panX: -0.02, vignette: 0.5, tint: 0.35 },
    },
    {
      id: 'rim-cutout', name: 'Rim-Lit Framed Focus', fam: 'Split & Cards',
      desc: 'Dark blurred mood backdrop + centered glowing amber-rimmed card pulsing on beat.',
      def: { zoomAmp: 0.08, beatAmp: 0.05, shakeAmp: 0.0, panX: 0.0, vignette: 0.7, tint: 0.2 },
    },
    {
      id: 'polaroid-desk', name: 'Pinned Polaroid Desk', fam: 'Split & Cards',
      desc: 'Deshbhakt-style tilted photo/clip card with red pin over dark desk + beat bounce.',
      def: { zoomAmp: 0.07, beatAmp: 0.045, shakeAmp: 0.006, panX: 0.02, vignette: 0.6, tint: 0 },
    },
    {
      id: 'torn-split', name: 'Torn-Paper B&W Split', fam: 'Split & Cards',
      desc: 'Nitish-style jagged torn-paper divider: warm color left vs crisp B&W right.',
      def: { zoomAmp: 0.08, beatAmp: 0.04, shakeAmp: 0.005, panX: 0.02, vignette: 0.5, tint: 0.25 },
    },
    {
      id: 'clean-doc', name: 'Clean Documentary Drift', fam: 'Documentary',
      desc: 'Gentle slow cinematic drift with subtle beat breath for breather moments.',
      def: { zoomAmp: 0.06, beatAmp: 0.018, shakeAmp: 0.0, panX: 0.02, vignette: 0.32, tint: 0 },
    },
  ];
  const byId = Object.fromEntries(PRESETS.map(p => [p.id, p]));

  function renderShot(ctx, shot, lt, dur, W, H, beat, mediaEntry, syncStrength = 1) {
    const preset = byId[shot.motion || 'pulse-zoom'] || PRESETS[0];
    const p = U.clamp(lt / Math.max(0.1, dur));
    const seed = shot.seed || 7;
    const sync = U.clamp((shot.beatSync != null ? shot.beatSync : 1) * syncStrength, 0, 2);
    const beatEnv = beat.combined * sync;
    const def = preset.def;

    const zoomAmp = shot.zoomAmp != null ? shot.zoomAmp : def.zoomAmp;
    const beatAmp = (shot.beatAmp != null ? shot.beatAmp : def.beatAmp) * sync;
    const shakeAmp = (shot.shakeAmp != null ? shot.shakeAmp : def.shakeAmp) * sync;
    const panX = shot.panX != null ? shot.panX : def.panX;
    const vig = shot.vignette != null ? shot.vignette : def.vignette;

    // Base motion curve + beat impulse
    let scale = 1.03 + zoomAmp * U.ease.out(p) + beatAmp * beat.beatPulse + beatAmp * 0.4 * beat.downbeatPulse;
    let tx = (p - 0.5) * panX;
    let ty = 0;
    let rot = 0;

    if (preset.id === 'whip-push') {
      const whip = 1 - U.ease.outExpo(U.range(p, 0, 0.22));
      tx += (seed % 2 === 0 ? 1 : -1) * whip * 0.24;
      scale += whip * 0.10;
    } else if (preset.id === 'hud-zoom') {
      const punch = 1 - U.ease.outExpo(U.range(p, 0, 0.28));
      scale = 1.04 + zoomAmp * (1 - punch * 0.65) + beatAmp * beat.beatPulse;
    } else if (preset.id === 'ken-burns-beat') {
      scale = 1.04 + zoomAmp * p + beatAmp * beat.downbeatPulse;
    }

    if (shakeAmp > 0) {
      const n1 = U.noise1(lt * 18, seed), n2 = U.noise1(lt * 18 + 31, seed + 5);
      const kick = Math.max(beat.onsetPulse || 0, beat.downbeatPulse || 0);
      tx += n1 * shakeAmp * (0.25 + 1.2 * kick);
      ty += n2 * shakeAmp * (0.25 + 1.2 * kick);
      rot += U.noise1(lt * 14 + 77, seed) * shakeAmp * 0.8 * kick;
    }

    const el = mediaEntry ? (mediaEntry.video || mediaEntry.img || mediaEntry.el) : null;
    const src = el && (mediaEntry.kind === 'video' ? el.readyState >= 2 : (el.complete !== false && (el.naturalWidth || el.width) > 0))
      ? el : null;
    const fx = shot.fx != null ? shot.fx : 0.5, fy = shot.fy != null ? shot.fy : 0.5;
    if (shot.raw && src) {
      drawMediaCover(ctx, src, W, H, { scale: 1, tx: 0, ty: 0, rot: 0 }, 0.5, 0.5);
      return;
    }
    const xform = { scale: scale * (shot.zoom || 1), tx, ty, rot };

    // Special framing styles
    if (preset.id === 'rim-cutout' || preset.id === 'polaroid-desk') {
      // Dark atmospheric backdrop first
      if (src) {
        ctx.save();
        ctx.globalAlpha = 0.26;
        drawMediaCover(ctx, getBwSource(src) || src, W, H, { scale: 1.22, tx: -tx * 0.4 }, fx, fy);
        ctx.restore();
      } else {
        drawDemoScene(ctx, shot, lt, W, H, beat);
      }
      ctx.fillStyle = 'rgba(8, 10, 14, 0.66)';
      ctx.fillRect(0, 0, W, H);

      // Centered glowing / tilted card
      const cw = W * (preset.id === 'polaroid-desk' ? 0.58 : 0.64);
      const ch = H * (preset.id === 'polaroid-desk' ? 0.60 : 0.64);
      const cardScale = 1 + beatAmp * 0.85 * beat.beatPulse;
      const tilt = preset.id === 'polaroid-desk' ? (seed % 2 === 0 ? -0.045 : 0.045) * (1 - 0.3 * U.ease.out(p)) + rot : rot;

      ctx.save();
      ctx.translate(W * 0.5 + tx * W * 0.5, H * 0.5 + ty * H * 0.5);
      ctx.rotate(tilt);
      ctx.scale(cardScale, cardScale);

      // Shadow + amber rim glow
      ctx.shadowColor = preset.id === 'rim-cutout' ? U.rgba('#e5a93c', 0.55 + 0.35 * beatEnv) : 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = preset.id === 'rim-cutout' ? (28 + 26 * beatEnv) : 34;
      const pad = preset.id === 'polaroid-desk' ? 18 : 5;
      const botPad = preset.id === 'polaroid-desk' ? 42 : 5;
      ctx.fillStyle = preset.id === 'polaroid-desk' ? '#f3efe6' : '#e5a93c';
      U.rrect(ctx, -cw / 2 - pad, -ch / 2 - pad, cw + pad * 2, ch + pad + botPad, preset.id === 'polaroid-desk' ? 6 : 14);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.save();
      U.rrect(ctx, -cw / 2, -ch / 2, cw, ch, preset.id === 'polaroid-desk' ? 3 : 10);
      ctx.clip();
      if (src) {
        const sw = src.videoWidth || src.naturalWidth || W, sh = src.videoHeight || src.naturalHeight || H;
        const sc = Math.max(cw / sw, ch / sh) * (1.03 + zoomAmp * 0.6 * p);
        ctx.drawImage(src, -sw * sc / 2, -sh * sc / 2, sw * sc, sh * sc);
      } else {
        ctx.translate(-W / 2, -H / 2);
        drawDemoScene(ctx, shot, lt, W, H, beat);
      }
      ctx.restore();

      if (preset.id === 'polaroid-desk') {
        // Red thumbtack pin on top edge
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(0, -ch / 2 - 4, 11, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(-3, -ch / 2 - 7, 3.5, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    } else if (preset.id === 'torn-split') {
      // Left: warm color | Right: crisp B&W separated by jagged torn-paper edge
      const splitX = W * (0.5 + 0.04 * Math.sin(p * Math.PI));
      const drawHalf = (isRight) => {
        ctx.save();
        ctx.beginPath();
        if (!isRight) {
          ctx.moveTo(0, 0); ctx.lineTo(splitX, 0);
          for (let y = 0; y <= H; y += 22) ctx.lineTo(splitX + U.noise1(y * 0.06, seed) * 18, y);
          ctx.lineTo(0, H);
        } else {
          ctx.moveTo(W, 0); ctx.lineTo(splitX, 0);
          for (let y = 0; y <= H; y += 22) ctx.lineTo(splitX + U.noise1(y * 0.06, seed) * 18, y);
          ctx.lineTo(W, H);
        }
        ctx.closePath();
        ctx.clip();
        if (src) {
          const useSrc = isRight ? (getBwSource(src) || src) : src;
          drawMediaCover(ctx, useSrc, W, H, { scale: scale + (isRight ? 0.02 : 0), tx: isRight ? tx + 0.01 : tx - 0.01, ty, rot }, fx, fy);
        } else {
          drawDemoScene(ctx, shot, lt + (isRight ? 2 : 0), W, H, beat);
        }
        if (!isRight) {
          ctx.fillStyle = `rgba(210, 45, 35, ${0.20 + 0.14 * beatEnv})`;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      };
      drawHalf(false);
      drawHalf(true);
      // White torn paper edge
      ctx.save();
      ctx.strokeStyle = '#f8f5ec';
      ctx.lineWidth = Math.max(4, W * 0.0045);
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 16;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 22) {
        const x = splitX + U.noise1(y * 0.06, seed) * 18;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    } else {
      // Full-bleed shot rendering
      if (src) {
        if (preset.id === 'bw-color-pop') {
          const bw = getBwSource(src);
          const colorAlpha = U.clamp(0.15 + 0.85 * Math.max(beat.downbeatPulse, beat.onsetPulse * 0.75));
          if (bw) {
            drawMediaCover(ctx, bw, W, H, xform, fx, fy);
            ctx.save(); ctx.globalAlpha = colorAlpha;
            drawMediaCover(ctx, src, W, H, xform, fx, fy);
            ctx.restore();
          } else drawMediaCover(ctx, src, W, H, xform, fx, fy);
        } else if (preset.id === 'crimson-tension') {
          const bw = getBwSource(src) || src;
          drawMediaCover(ctx, bw, W, H, xform, fx, fy);
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgba(210, 32, 32, ${U.clamp(0.32 + 0.42 * beatEnv)})`;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        } else {
          drawMediaCover(ctx, src, W, H, xform, fx, fy);
        }
      } else {
        ctx.save();
        ctx.translate(W * 0.5 + tx * W, H * 0.5 + ty * H);
        ctx.scale(scale, scale);
        ctx.rotate(rot);
        ctx.translate(-W * 0.5, -H * 0.5);
        drawDemoScene(ctx, shot, lt, W, H, beat);
        ctx.restore();
        if (preset.id === 'crimson-tension') {
          ctx.fillStyle = `rgba(210, 28, 28, ${U.clamp(0.22 + 0.35 * beatEnv)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    }

    if (preset.id === 'film-burn-leak') {
      drawLightLeak(ctx, W, H, 0.35 + 0.65 * beatEnv, seed, beat);
    }

    // Subtle exposure pop on heavy beats for beat-sync presets
    if (beatAmp > 0.03 && beat.downbeatPulse > 0.45) {
      ctx.fillStyle = `rgba(255, 240, 210, ${(beat.downbeatPulse - 0.45) * 0.14 * sync})`;
      ctx.fillRect(0, 0, W, H);
    }

    drawVignette(ctx, W, H, vig);
  }

  return { FAMS, PRESETS, byId, renderShot, drawDemoScene, drawMediaCover, getBwSource };
})();
