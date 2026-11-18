// Beat-aligned shot transitions observed in Dhruv Rathee, Nitish Rajput & Deshbhakt hooks.
HES.transitions = (() => {
  const U = HES.util;
  const LIST = [
    ['cut', 'Hard Cut (Beat Snap)'],
    ['flash', 'Beat Flash (White/Amber)'],
    ['burn', 'Film Burn Bloom'],
    ['whip-l', 'Whip Slide Left'],
    ['whip-r', 'Whip Slide Right'],
    ['zoom-in', 'Punch Zoom Cut'],
    ['wipe', 'Diagonal Wipe'],
    ['fade', 'Crossfade'],
    ['dip', 'Dip to Black'],
  ];

  function render(ctx, type, p, drawOut, drawIn, W, H) {
    const t = U.clamp(p);
    if (type === 'cut' || t <= 0) { drawOut(ctx); return; }
    if (t >= 1) { drawIn(ctx); return; }

    if (type === 'fade') {
      drawOut(ctx);
      ctx.save(); ctx.globalAlpha = U.smooth(t); drawIn(ctx); ctx.restore();
      return;
    }
    if (type === 'dip') {
      if (t < 0.5) {
        drawOut(ctx);
        ctx.fillStyle = `rgba(0,0,0,${U.smooth(t * 2)})`; ctx.fillRect(0, 0, W, H);
      } else {
        drawIn(ctx);
        ctx.fillStyle = `rgba(0,0,0,${1 - U.smooth((t - 0.5) * 2)})`; ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    if (type === 'flash') {
      if (t < 0.45) drawOut(ctx); else drawIn(ctx);
      const peak = t < 0.45 ? U.ease.out(t / 0.45) : 1 - U.ease.out((t - 0.45) / 0.55);
      ctx.fillStyle = `rgba(255, 245, 225, ${U.clamp(peak * 0.92)})`;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    if (type === 'burn') {
      if (t < 0.5) drawOut(ctx); else drawIn(ctx);
      const peak = Math.sin(t * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rg = ctx.createRadialGradient(W * (0.2 + 0.6 * t), H * 0.5, 0, W * 0.5, H * 0.5, W * 0.9);
      rg.addColorStop(0, `rgba(255, 220, 120, ${peak})`);
      rg.addColorStop(0.5, `rgba(245, 95, 25, ${peak * 0.85})`);
      rg.addColorStop(1, `rgba(180, 20, 10, ${peak * 0.4})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }
    if (type === 'whip-l' || type === 'whip-r') {
      const dir = type === 'whip-l' ? -1 : 1;
      const e = U.ease.inOut(t);
      const off = e * W * dir;
      ctx.save(); ctx.translate(off, 0); drawOut(ctx); ctx.restore();
      ctx.save(); ctx.translate(off - dir * W, 0); drawIn(ctx); ctx.restore();
      // subtle directional speed streak at midpoint
      const streak = Math.sin(t * Math.PI);
      if (streak > 0.1) {
        ctx.fillStyle = `rgba(255,255,255,${streak * 0.12})`;
        ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    if (type === 'zoom-in') {
      if (t < 0.5) {
        const s = 1 + 0.35 * (t / 0.5) ** 2;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); drawOut(ctx); ctx.restore();
      } else {
        const s = 1.25 - 0.25 * U.ease.outExpo((t - 0.5) / 0.5);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); drawIn(ctx); ctx.restore();
      }
      return;
    }
    if (type === 'wipe') {
      drawOut(ctx);
      const e = U.ease.outQuart(t);
      const x = -W * 0.2 + e * W * 1.4;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(x, 0); ctx.lineTo(x - W * 0.18, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.clip();
      drawIn(ctx);
      ctx.restore();
    }
  }

  return { LIST, render };
})();
