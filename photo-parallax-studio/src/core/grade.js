// Look & grade: documentary colour looks, vignette, letterbox, frame border, film grain.
// Composite-mode only (no ctx.filter — Safari safe). Deterministic grain per frame index.
window.PP = window.PP || {};
PP.grade = (() => {
  const U = PP.util;

  const LOOKS = [
    ['none', 'Natural (no grade)'],
    ['warm', 'Warm amber'],
    ['teal', 'Teal & orange'],
    ['cold', 'Cold blue night'],
    ['bw', 'Black & white'],
    ['bw2', 'Archive B/W (high contrast)'],
    ['sepia', 'Sepia vintage'],
    ['faded', 'Faded vintage'],
  ];

  function desat(g, W, H, amount) {
    if (amount <= 0) return;
    g.save();
    g.globalCompositeOperation = 'saturation';
    g.globalAlpha = U.clamp(amount);
    g.fillStyle = '#808080';
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  function fill(g, W, H, color, mode, alpha) {
    g.save();
    g.globalCompositeOperation = mode;
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  const grainTile = {};
  function tile(seed, frame, size) {
    const k = seed + ':' + (frame % 97);
    if (grainTile[k]) return grainTile[k];
    const cv = U.canvas(size, size), g = cv.getContext('2d');
    const id = g.createImageData(size, size), d = id.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = U.h2(x, y, seed * 31 + frame * 977);
      const v = 110 + Math.round(h * 90);
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    grainTile[k] = cv;
    return cv;
  }

  // main entry: apply the shot's grade to a finished frame
  // g { look, vignette, grain, letterbox, frame, frameColor }
  function apply(ctx, shot, W, H, env) {
    const gr = shot.grade || {};
    const look = gr.look || 'none';
    // colour looks
    if (look === 'warm') { desat(ctx, W, H, 0.15); fill(ctx, W, H, '#5a3c1e', 'multiply', 0.32); fill(ctx, W, H, '#3d2a12', 'overlay', 0.10); fill(ctx, W, H, '#ffca7a', 'soft-light', 0.30); }
    else if (look === 'teal') {
      desat(ctx, W, H, 0.12);
      fill(ctx, W, H, '#0e2b33', 'multiply', 0.42);      // teal shadows
      fill(ctx, W, H, '#ff9d45', 'soft-light', 0.38);    // warm highlights
      fill(ctx, W, H, '#123a44', 'screen', 0.10);
    }
    else if (look === 'cold') { desat(ctx, W, H, 0.3); fill(ctx, W, H, '#0c1e33', 'multiply', 0.5); fill(ctx, W, H, '#1c3a5e', 'screen', 0.16); }
    else if (look === 'bw') { desat(ctx, W, H, 1); }
    else if (look === 'bw2') {
      desat(ctx, W, H, 1);
      // contrast: overlay the frame onto itself
      ctx.save(); ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = 'overlay';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
      fill(ctx, W, H, '#000', 'multiply', 0.10);
      fill(ctx, W, H, '#fff', 'screen', 0.06);
    }
    else if (look === 'sepia') { desat(ctx, W, H, 1); fill(ctx, W, H, '#7a5c33', 'color', 0.55); fill(ctx, W, H, '#2e2113', 'multiply', 0.22); }
    else if (look === 'faded') { desat(ctx, W, H, 0.55); fill(ctx, W, H, '#5e6b75', 'screen', 0.20); fill(ctx, W, H, '#d8c9a8', 'soft-light', 0.25); }

    // vignette
    const v = gr.vignette == null ? 0 : gr.vignette;
    if (v > 0.01) {
      const S = Math.max(W, H);
      const rg = ctx.createRadialGradient(W / 2, H / 2, S * 0.36, W / 2, H / 2, S * 0.74);
      rg.addColorStop(0, 'rgba(0,0,0,0)');
      rg.addColorStop(0.75, `rgba(0,0,0,${v * 0.5})`);
      rg.addColorStop(1, `rgba(0,0,0,${v})`);
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // grain
    const gn = gr.grain == null ? 0 : gr.grain;
    if (gn > 0.01) {
      const frame = Math.round((env.t || 0) * (env.fps || 30));
      const t = tile(env.seed || 1, frame, 160);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = gn * 0.5;
      const pat = ctx.createPattern(t, 'repeat');
      ctx.fillStyle = pat;
      ctx.scale(2, 2);
      ctx.fillRect(0, 0, W / 2 + 2, H / 2 + 2);
      ctx.restore();
    }
    // letterbox
    const lb = gr.letterbox || 0;
    if (lb > 0) {
      const target = lb; // aspect: 2.39, 2.0, 1.85
      const frameAR = W / H;
      if (frameAR < target) {
        const bh = (H - W / target) / 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      }
    }
    // thin inner frame border
    const fr = gr.frame || 0;
    if (fr > 0.01) {
      ctx.save();
      ctx.strokeStyle = gr.frameColor || '#f2ede1';
      ctx.lineWidth = Math.max(2, fr * 0.012 * Math.min(W, H));
      const m = ctx.lineWidth * 1.6;
      ctx.strokeRect(m, m, W - m * 2, H - m * 2);
      if (fr > 0.5) ctx.strokeRect(m * 2.1, m * 2.1, W - m * 4.2, H - m * 4.2);
      ctx.restore();
    }
  }

  return { LOOKS, apply };
})();
