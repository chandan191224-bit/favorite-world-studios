// Film strip + 35 mm contact sheet: sprocket holes, edge markings, frame counters, develop-in, zoom to one frame.
(() => {
  const U = CS.util, D = CS.draw, { range, select, bool, color } = CS.fx.P, E = U.ease;

  // a strip band with sprocket holes drawn into a scratch canvas (holes cut out)
  function band(g, env, x, y, w, h, S, holes, r) {
    const matte = env.mode === 'matte';
    const key = ['band', Math.round(w), Math.round(h), Math.round(S), matte ? 1 : 0].join('|');
    const c = U.tmp(key, w, h), cg = c.getContext('2d');
    U.roundRect(cg, 0, 0, w, h, S * 0.012);
    cg.fillStyle = matte ? '#fff' : '#15161a'; cg.fill();
    // cut sprocket holes with destination-out
    cg.globalCompositeOperation = 'destination-out';
    const hw = Math.max(4, S * 0.013), hh = Math.max(3, S * 0.008), step = hw * 2.6;
    const rows = holes === 2 ? [h * 0.075, h * 0.925 - hh] : [h * 0.075];
    const n = Math.max(2, Math.floor((w - step) / step));
    const off = (w - (n - 1) * step - hw) / 2;
    for (const ry of rows) for (let i = 0; i < n; i++) {
      U.roundRect(cg, off + i * step, ry, hw, hh, hh * 0.45); cg.fill();
    }
    cg.globalCompositeOperation = 'source-over';
    g.drawImage(c, x, y);
  }

  function edgeText(g, env, text, x, y, w, S, align) {
    if (env.mode === 'matte' || !text) return;
    g.save();
    g.fillStyle = '#e5a93c'; g.font = `700 ${Math.max(7, S * 0.013)}px ${D.FONTS.type}`;
    g.textBaseline = 'middle'; g.textAlign = align || 'left';
    g.fillText(text, x, y);
    if (align === 'left' && w > S * 0.6) { // repeat along the strip
      const tw = g.measureText(text).width + S * 0.05;
      for (let xx = x + tw; xx < w - tw * 0.4; xx += tw) g.fillText(text, xx, y);
    }
    g.restore();
  }

  CS.fx.register({
    id: 'filmstrip', name: 'Film strip', family: 'film', slots: 4, minSlots: 2, maxSlots: 6, dur: 6,
    desc: 'Photos roll past on a film strip with sprocket holes; one frame zooms up at the end.',
    params: [
      select('orient', 'Orientation', [['h', 'Horizontal'], ['v', 'Vertical (Shorts)']], 'h'),
      range('bandH', 'Strip height', 0.35, 0.85, 0.05, 0.56),
      range('speed', 'Scroll amount', 0, 3, 0.1, 1.6),
      bool('endZoom', 'Zoom into one frame at the end', true),
      range('pick', 'Zoom into frame #', 0, 5, 1, 0),
      color('sprocket', 'Band colour', '#15161a'),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(2, Math.min(slotN, 6));
      const vert = P.orient === 'v';
      const matte = env.mode === 'matte';
      // frame geometry along the strip
      const long = vert ? H : W, across = vert ? W : H;
      const bh = across * (+P.bandH);           // band thickness across the frame
      const fA = bh - S * 0.075 * 2 - S * 0.02; // frame size ACROSS the strip (inside the sprockets)
      const fL = fA * 1.5;                      // frame size ALONG the strip
      const gap = S * 0.014;
      const step = fL + gap;
      const frames = Math.max(n + 2, Math.ceil(long / step) + 3);
      // frame i's centre along the strip (centred layout + scroll)
      const alongC = i => (long * 0.5) - (frames / 2) * step + (i + 0.5) * step + scroll;
      // scroll: decelerate to a stop by p 0.68
      const sq = E.inOut(U.range(p, 0.02, 0.68));
      const scroll = (+P.speed || 0) * step * (1 - sq);
      const zq = P.endZoom ? E.inOut(U.range(p, 0.68, 0.88)) : 0;
      const pick = Math.max(0, Math.min(n - 1, Math.round(+P.pick)));
      // camera transform: identity → zoom so frame `pick` covers the whole view
      let camScale = 1, camX = 0, camY = 0;
      if (zq > 0) {
        // the picked frame's final size on screen: fA across, fL along
        const endScale = vert ? Math.max(W / fA, H / fL) : Math.max(W / fL, H / fA);
        camScale = U.lerp(1, endScale, zq);
        const along0 = alongC(pick);
        const fcx = vert ? W / 2 : along0, fcy = vert ? along0 : H / 2;
        const vw = W / camScale, vh = H / camScale;
        let cx = U.lerp(W / 2, fcx, zq), cy = U.lerp(H / 2, fcy, zq);
        cx = U.clamp(cx, vw / 2, W - vw / 2); cy = U.clamp(cy, vh / 2, H - vh / 2);
        camX = W / 2 - cx * camScale; camY = H / 2 - cy * camScale;
      }
      g.save();
      g.translate(camX, camY); g.scale(camScale, camScale);
      // band
      if (vert) band(g, env, W / 2 - bh / 2, 0, bh, H, S, 2, 0);
      else band(g, env, 0, H / 2 - bh / 2, W, bh, S, 2, 0);
      // frames along the strip — clipped to the band so nothing sticks out past its ends
      g.save();
      g.beginPath();
      if (vert) g.rect(W / 2 - bh / 2, 0, bh, H); else g.rect(0, H / 2 - bh / 2, W, bh);
      g.clip();
      for (let i = 0; i < frames; i++) {
        const k = i % n;
        const a = alongC(i);
        const x = vert ? W / 2 - fA / 2 : a - fL / 2, y = vert ? a - fL / 2 : H / 2 - fA / 2;
        const wpx = vert ? fA : fL, hpx = vert ? fL : fA;
        D.photo(g, env, k, x, y, wpx, hpx, { shadow: 0, border: 0, radius: 0 });
        if (!matte) {
          // frame number beside the frame (whole numbers); fades out with the end zoom
          g.save();
          g.globalAlpha *= U.clamp(1 - zq * 1.4);
          g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `700 ${Math.max(7, S * 0.012)}px ${D.FONTS.type}`;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          const nx = vert ? x + wpx / 2 : x + wpx / 2, ny = vert ? y + hpx + S * 0.05 : y + hpx + S * 0.032;
          g.fillText(String(i + 1), nx, ny);
          g.restore();
        }
      }
      g.restore();
      // edge text on the band (fades away as the end zoom takes over)
      const e1 = 'COLLAGE 400';
      g.save(); g.globalAlpha *= U.clamp(1 - zq * 1.2);
      if (vert) { edgeText(g, env, e1, W / 2 - bh / 2 + S * 0.02, H * 0.2, 0, S); edgeText(g, env, '36 EXP', W / 2 - bh / 2 + S * 0.02, H * 0.24, 0, S); }
      else { edgeText(g, env, e1 + ' · 36 EXP', W * 0.02, H / 2 - bh / 2 + S * 0.026, W, S, 'left'); edgeText(g, env, String(Math.round(1 + (1 - sq) * 18)) , W - S * 0.03, H / 2 - bh / 2 + S * 0.026, 0, S, 'right'); }
      g.restore();
      g.restore();
      // counter chip bottom-left while not zoomed
      if (!matte && zq < 0.5) {
        const a = U.clamp(1 - zq * 2);
        g.save(); g.globalAlpha *= a;
        D.label(g, env, 'FRAME ' + (pick + 1), S * 0.06, H - S * 0.055, { align: 'left', style: 'type', size: 0.028 * env.labelSize });
        g.restore();
      }
    },
  });

  CS.fx.register({
    id: 'contact', name: 'Contact sheet', family: 'film', slots: 12, minSlots: 4, maxSlots: 12, dur: 6,
    desc: 'A 35 mm contact sheet develops in; one frame is highlighted and can zoom to full.',
    params: [
      range('strips', 'Strips', 2, 4, 1, 3),
      range('per', 'Frames per strip', 4, 6, 1, 6),
      bool('endZoom', 'Zoom into the highlighted frame', true),
      range('pick', 'Highlighted frame #', 1, 24, 1, 9),
    ],
    look: { bg: 'black' },
    draw(g, env) {
      const { W, H, S, t, p, P, seed, n: slotN } = env;
      env.bg();
      const n = Math.max(4, Math.min(slotN, 12));
      const matte = env.mode === 'matte';
      const nStrips = Math.round(U.clamp(+P.strips, 2, 4)), per = Math.round(U.clamp(+P.per, 4, 6));
      const total = nStrips * per;
      const m = S * 0.07;
      const stripH = (H - 2 * m) / nStrips;
      const fh = stripH * 0.62;
      const bandW = W - 2 * m;
      const fw = Math.min(fh * 1.5, (bandW - S * 0.05 - (per - 1) * S * 0.012) / per);
      const step = fw + S * 0.012;
      const pick = Math.max(0, Math.min(total - 1, Math.round(+P.pick) - 1));
      const hq = U.range(p, 0.5, 0.62); // highlight ramp
      const zq = P.endZoom ? E.inOut(U.range(p, 0.68, 0.88)) : 0;
      // zoom camera to the picked frame
      let camScale = 1, camX = 0, camY = 0;
      const pr = Math.floor(pick / per), pc = pick % per;
      const stripY0 = m + pr * stripH;
      const fxC = m + step * pc + fw / 2, fyC = stripY0 + stripH * 0.42;
      if (zq > 0) {
        const endScale = Math.max(W / fw, H / fh);
        camScale = U.lerp(1, endScale, zq);
        const vw = W / camScale, vh = H / camScale;
        let cx = U.lerp(W / 2, fxC, zq), cy = U.lerp(H / 2, fyC, zq);
        cx = U.clamp(cx, vw / 2, W - vw / 2); cy = U.clamp(cy, vh / 2, H - vh / 2);
        camX = W / 2 - cx * camScale; camY = H / 2 - cy * camScale;
      }
      g.save();
      g.translate(camX, camY); g.scale(camScale, camScale);
      if (zq > 0.02) g.translate(0, 0);
      let idx = 0;
      for (let s = 0; s < nStrips; s++) {
        const y0 = m + s * stripH;
        const dev0 = 0.06 + s * 0.12;
        const se = E.outQuart(U.range(t, dev0, dev0 + 0.45));
        if (se <= 0) { idx += per; continue; }
        // strip band (thin, dark) with sprocket rows
        const key = ['cband', Math.round(W - 2 * m), Math.round(stripH * 0.92), S, matte ? 1 : 0].join('|');
        const bc = U.tmp(key, W - 2 * m, stripH * 0.92), bg2 = bc.getContext('2d');
        U.roundRect(bg2, 0, 0, bc.width, bc.height, S * 0.006);
        bg2.fillStyle = matte ? '#fff' : '#17181c'; bg2.fill();
        bg2.globalCompositeOperation = 'destination-out';
        const hstep = S * 0.03, hw = S * 0.008;
        for (const ry of [stripH * 0.08, stripH * 0.84]) {
          for (let i = 0; i * hstep < bc.width - hw; i++) {
            const x = m * 0.2 + i * hstep + U.h1(s * 31 + i, seed) * 2;
            bg2.fillRect(x, ry, hw, S * 0.005);
          }
        }
        g.save(); g.globalAlpha *= se; g.translate(m, y0 + stripH * 0.04); g.scale(0.99 + 0.01 * se, 0.99 + 0.01 * se); g.translate(-m, -(y0 + stripH * 0.04));
        g.drawImage(bc, m, y0 + stripH * 0.04);
        g.restore();
        edgeText(g, env, 'COLLAGE 400', m + S * 0.01, y0 + stripH * 0.06, 0, S);
        for (let c = 0; c < per; c++, idx++) {
          const fe = E.outQuart(U.range(t, dev0 + 0.12 + c * 0.06, dev0 + 0.12 + c * 0.06 + 0.4));
          if (fe <= 0) continue;
          const k = idx % n;
          const x = m + step * c, y = y0 + stripH * 0.2;
          g.save();
          g.translate(x + fw / 2, y + fh / 2); const sc = 0.97 + 0.03 * fe; g.scale(sc, sc); g.globalAlpha *= se; g.translate(-x - fw / 2, -y - fh / 2);
          D.photo(g, env, k, x, y, fw, fh, { shadow: 0, border: 0, radius: 0 });
          // frame number under
          if (!matte) {
            g.fillStyle = 'rgba(255,255,255,.45)'; g.font = `700 ${Math.max(6, S * 0.011)}px ${D.FONTS.type}`;
            g.textAlign = 'left'; g.textBaseline = 'middle';
            g.fillText(String(idx + 1), x, y + fh + S * 0.02);
          }
          // highlight ring
          if (idx === pick && hq > 0) {
            g.lineWidth = Math.max(2, S * 0.006); g.strokeStyle = '#e5a93c';
            U.roundRect(g, x - g.lineWidth, y - g.lineWidth, fw + g.lineWidth * 2, fh + g.lineWidth * 2, S * 0.004);
            g.stroke();
          }
          g.restore();
        }
      }
      g.restore();
      if (!matte && zq < 0.4 && hq > 0) {
        g.save(); g.globalAlpha *= hq * (1 - zq * 2.5);
        D.label(g, env, 'FRAME ' + (pick + 1), S * 0.06, H - S * 0.055, { align: 'left', style: 'type', size: 0.028 * env.labelSize });
        g.restore();
      }
    },
  });

  const pr = CS.fx.preset;
  pr('filmstrip-scroll', 'Film strip – scroll', 'filmstrip', {}, 6, 'Photos roll past on a film strip, one frame zooms up.', 4);
  pr('filmstrip-vertical', 'Film strip – vertical', 'filmstrip', { orient: 'v' }, 6, 'Vertical film strip for Shorts.', 4);
  pr('contact-sheet-develop', 'Contact sheet – develop', 'contact', { endZoom: false }, 6, 'A 35 mm contact sheet develops in.', 12);
  pr('contact-sheet-zoom', 'Contact sheet – zoom to frame', 'contact', {}, 6, 'The contact sheet develops, one frame zooms to full.', 12);
})();
