// Drawing primitives every layout uses: auto-fit photos/videos in a frame, cut-out "stickers" with a white outline and
// drop shadow, labels, rough paper scraps and halftone dots. All deterministic (no Math.random / Date).
CS.draw = (() => {
  const U = CS.util;
  const FONT = `'Instrument Sans', 'Mukta', system-ui, sans-serif`;
  const FONTS = {
    sans: FONT, bold: `'Mukta', 'Instrument Sans', sans-serif`, serif: `'Playfair Display', 'Noto Serif Devanagari', Georgia, serif`,
    type: `'Courier Prime', 'Courier New', monospace`, hand: `'Caveat', 'Kalam', cursive`,
  };

  // draw the source into (x,y,w,h) like CSS object-fit: cover, focal point fx/fy (0..1), extra zoom
  function coverInto(g, src, x, y, w, h, fx = 0.5, fy = 0.42, zoom = 0) {
    const iw = src.w, ih = src.h;
    if (!iw || !ih || w <= 0 || h <= 0) return;
    const s = Math.max(w / iw, h / ih) * (1 + Math.max(0, zoom));
    const sw = Math.min(iw, w / s), shh = Math.min(ih, h / s);
    const sx = (iw - sw) * U.clamp(fx), sy = (ih - shh) * U.clamp(fy);
    try { g.drawImage(src.el, sx, sy, sw, shh, x, y, w, h); } catch (e) {}
  }
  function containInto(g, src, x, y, w, h) {
    const s = Math.min(w / src.w, h / src.h), dw = src.w * s, dh = src.h * s;
    try { g.drawImage(src.el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) {}
  }
  function setShadow(g, env, amt, dir = 1) {
    if (!amt || env.mode === 'matte') return;
    const S = env.S;
    g.shadowColor = `rgba(0,0,0,${Math.min(0.75, 0.42 * amt)})`;
    g.shadowBlur = S * 0.022 * amt; g.shadowOffsetX = S * 0.004 * amt * dir; g.shadowOffsetY = S * 0.009 * amt;
  }
  function noShadow(g) { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; }
  // black & white / tint inside the current clip
  function grade(g, x, y, w, h, bw, tint) {
    if (bw > 0) { g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = U.clamp(bw); g.fillStyle = '#808080'; g.fillRect(x, y, w, h); g.restore(); }
    if (tint) { g.save(); g.globalCompositeOperation = 'color'; g.globalAlpha = 0.55; g.fillStyle = tint; g.fillRect(x, y, w, h); g.restore(); }
  }

  // A photo/video in a frame. (x,y,w,h) is the picture area; o: { rot, scale, alpha, radius, border, borderBottom,
  // borderColor, shadow, bw, tint, zoom, fit:'cover'|'contain', fx, fy, rough }
  function photo(g, env, i, x, y, w, h, o = {}) {
    const src = typeof i === 'object' ? i : env.src(i), sl = src.slot || {};
    if (w < 1 || h < 1) return;
    const matte = env.mode === 'matte';
    g.save();
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    g.translate(x + w / 2, y + h / 2);
    if (o.rot) g.rotate(o.rot);
    if (o.scale != null && o.scale !== 1) g.scale(o.scale, o.scale);
    const b = o.border || 0, bb = o.borderBottom != null ? o.borderBottom : b, r = o.radius || 0;
    const fx = o.fx != null ? o.fx : sl.fx != null ? sl.fx : 0.5, fy = o.fy != null ? o.fy : sl.fy != null ? sl.fy : 0.42;
    const zoom = (sl.zoom || 0) + (o.zoom || 0);
    const outer = () => {
      if (o.rough) { g.save(); g.translate(0, (bb - b) / 2); g.beginPath(); const pts = U.roughRect(w + 2 * b, h + b + bb, (o.seed || 1) + i * 13, o.rough, env.S); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); g.closePath(); g.restore(); }
      else U.roundRect(g, -w / 2 - b, -h / 2 - b, w + 2 * b, h + b + bb, r + b * 0.4);
    };
    if (o.shadow || b || bb) {
      g.save(); setShadow(g, env, o.shadow || 0);
      outer(); g.fillStyle = matte ? '#fff' : (o.borderColor || '#fff'); g.fill();
      g.restore();
    }
    g.save();
    if (o.rough && !b && !bb) outer(); else U.roundRect(g, -w / 2, -h / 2, w, h, r);
    g.clip();
    if (matte) { g.fillStyle = '#fff'; g.fillRect(-w / 2, -h / 2, w, h); }
    else {
      if (o.fit === 'contain') {
        const bl = U.tmp('cblur', 40, Math.max(2, Math.round(40 * h / w))), bg = bl.getContext('2d');
        coverInto(bg, src, 0, 0, bl.width, bl.height, 0.5, 0.5, 0.1);
        g.drawImage(bl, -w / 2, -h / 2, w, h);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-w / 2, -h / 2, w, h);
        containInto(g, src, -w / 2, -h / 2, w, h);
      } else coverInto(g, src, -w / 2, -h / 2, w, h, fx, fy, zoom);
      grade(g, -w / 2, -h / 2, w, h, o.bw || 0, o.tint);
    }
    g.restore();
    g.restore();
  }

  // full-frame "base" photo (the background picture of PiP / sticker scenes) — hidden in element exports
  function base(g, env, i, o = {}) {
    if (env.mode !== 'composite') return;
    photo(g, env, i, 0, 0, env.W, env.H, o);
  }

  // ---------- cut-out stickers ----------
  const stickers = new Map();
  function remember(k, v) { if (stickers.size > 90) stickers.delete(stickers.keys().next().value); stickers.set(k, v); return v; }
  function buildMaskLayer(src, wb, hb, o, seed, S) {
    const M = U.canvas(wb, hb), mg = M.getContext('2d'), [x0, y0, x1, y1] = src.bbox;
    if (src.mask) {
      const mw = src.mask.width, mh = src.mask.height;
      mg.drawImage(src.mask, x0 * mw, y0 * mh, (x1 - x0) * mw, (y1 - y0) * mh, 0, 0, wb, hb);
    } else {
      mg.fillStyle = '#fff';
      if (o.rough) {
        const pts = U.roughRect(wb * 0.985, hb * 0.985, seed, o.rough, Math.min(wb, hb) * 2.2);
        mg.translate(wb / 2, hb / 2); mg.fill(U.pathFrom(pts));
      } else mg.fillRect(0, 0, wb, hb);
    }
    return M;
  }
  function buildOutline(M, pad, rpx, color) {
    const O = U.canvas(M.width + pad * 2, M.height + pad * 2), og = O.getContext('2d');
    if (rpx > 0.5) {
      const n = rpx > 6 ? 24 : 16;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; og.drawImage(M, pad + Math.cos(a) * rpx, pad + Math.sin(a) * rpx); og.drawImage(M, pad + Math.cos(a) * rpx * 0.55, pad + Math.sin(a) * rpx * 0.55); }
      og.drawImage(M, pad, pad);
      og.globalCompositeOperation = 'source-in'; og.fillStyle = color; og.fillRect(0, 0, O.width, O.height);
    }
    return O;
  }
  // cut-out of slot i, its picture height h centred on (cx, cy). o: { outline (fraction of h), outlineColor, shadow, rot,
  // scale, alpha, bw, tint, rough (hand-cut edge when the photo has no mask), flip, matte-safe }
  function cutout(g, env, i, cx, cy, h, o = {}) {
    const src = typeof i === 'object' ? i : env.src(i);
    const [x0, y0, x1, y1] = src.bbox, rw = (x1 - x0) * src.w, rh = (y1 - y0) * src.h, aspect = rw / Math.max(1, rh);
    const hb = Math.max(32, Math.min(1400, Math.ceil(h / 48) * 48)), wb = Math.max(8, Math.round(hb * aspect));
    const rpx = (o.outline != null ? o.outline : 0.025) * hb, pad = Math.ceil(rpx + 3);
    const matte = env.mode === 'matte', color = matte ? '#fff' : (o.outlineColor || '#ffffff');
    const seed = (o.seed || 3) + (src.i || 0) * 7;
    const k = `${src.key}|${hb}|${rpx.toFixed(1)}|${color}|${o.rough || 0}|${seed}`;
    let st = stickers.get(k);
    if (!st) { const M = buildMaskLayer(src, wb, hb, o, seed, env.S); st = remember(k, { M, O: buildOutline(M, pad, rpx, color), pad, content: null, ck: '' }); }
    // content layer (rebuilt per frame for video, cached for photos)
    const ck = `${o.bw || 0}|${o.tint || ''}|${matte}`;
    if (src.video || !st.content || st.ck !== ck) {
      const C = st.content && st.content.width === wb + pad * 2 ? st.content : U.canvas(wb + pad * 2, hb + pad * 2), cg = C.getContext('2d');
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'source-over'; cg.globalAlpha = 1;
      cg.clearRect(0, 0, C.width, C.height);
      cg.drawImage(st.O, 0, 0);
      const L = U.canvas(wb, hb), lg = L.getContext('2d');
      if (matte) { lg.fillStyle = '#fff'; lg.fillRect(0, 0, wb, hb); }
      else {
        try { lg.drawImage(src.el, x0 * src.w, y0 * src.h, rw, rh, 0, 0, wb, hb); } catch (e) {}
        grade(lg, 0, 0, wb, hb, o.bw || 0, o.tint);
      }
      lg.globalCompositeOperation = 'destination-in'; lg.drawImage(st.M, 0, 0);
      cg.drawImage(L, pad, pad);
      st.content = C; st.ck = ck;
    }
    const sc = (h / hb) * (o.scale != null ? o.scale : 1);
    if (sc <= 0.001) return { w: 0, h: 0 };
    g.save();
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    g.translate(cx, cy);
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flip ? -sc : sc, sc);
    setShadow(g, env, o.shadow != null ? o.shadow : 1);
    g.drawImage(st.content, -st.content.width / 2, -st.content.height / 2);
    g.restore();
    return { w: wb * h / hb, h };
  }
  const cutAspect = src => { const [x0, y0, x1, y1] = src.bbox; return ((x1 - x0) * src.w) / Math.max(1, (y1 - y0) * src.h); };

  // ---------- labels ----------
  // styles: pill (dark rounded), tag (amber block), white (white card, dark text), plain (big text with shadow), type (typewriter strip)
  function label(g, env, text, x, y, o = {}) {
    if (!text) return;
    const S = env.S, size = S * (o.size || 0.045), style = o.style || env.P.labelStyle || 'pill';
    const matte = env.mode === 'matte';
    g.save();
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    if (o.scale != null) g.scale(o.scale, o.scale);
    const font = style === 'type' ? FONTS.type : style === 'hand' ? FONTS.hand : FONTS.bold;
    g.font = `800 ${size}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    const tw = g.measureText(text).width, px = size * 0.55, py = size * 0.32, bw = tw + px * 2, bh = size + py * 2;
    const ax = o.align === 'left' ? bw / 2 : o.align === 'right' ? -bw / 2 : 0;
    g.translate(ax, 0);
    const fills = { pill: ['rgba(12,13,17,.82)', '#fff'], tag: [o.color || '#e5a93c', '#15120a'], white: ['#fff', '#14161c'], type: ['#f3efe4', '#1b1b1b'], hand: [null, o.color || '#fff'], plain: [null, '#fff'] }[style] || ['rgba(12,13,17,.82)', '#fff'];
    if (fills[0]) {
      g.save(); setShadow(g, env, 0.6);
      U.roundRect(g, -bw / 2, -bh / 2, bw, bh, style === 'pill' ? bh / 2 : size * 0.12);
      g.fillStyle = matte ? '#fff' : fills[0]; g.fill(); g.restore();
    } else if (!matte) { g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = size * 0.25; g.shadowOffsetY = size * 0.05; }
    if (!matte || !fills[0]) { g.fillStyle = matte ? '#fff' : fills[1]; g.fillText(text, 0, size * 0.04); }
    g.restore();
    return { w: bw, h: bh };
  }

  // rough paper scrap (decor behind cut-outs). kind: kraft | white | news | color | dark
  function scrap(g, env, k, x, y, w, h, o = {}) {
    const matte = env.mode === 'matte';
    const seed = (env.seed || 1) * 31 + k * 97;
    const kind = o.kind || ['white', 'kraft', 'news', 'color'][Math.floor(U.h1(k, env.seed + 5) * 4)];
    const col = { white: '#f4f1e8', kraft: '#c49a63', news: '#d8d4c8', color: o.color || '#d9534f', dark: '#2b2d33' }[kind] || '#f4f1e8';
    g.save();
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    g.translate(x, y); if (o.rot) g.rotate(o.rot);
    if (o.scale != null) g.scale(o.scale, o.scale);
    const path = U.pathFrom(U.roughRect(w, h, seed, o.rough != null ? o.rough : 1.2, env.S));
    setShadow(g, env, o.shadow != null ? o.shadow : 0.6);
    g.fillStyle = matte ? '#fff' : col; g.fill(path); noShadow(g);
    if (!matte && kind === 'news') {
      g.save(); g.clip(path); g.fillStyle = 'rgba(30,30,30,.22)';
      const lh = env.S * 0.012;
      for (let yy = -h / 2 + lh * 1.5; yy < h / 2; yy += lh * 1.6) g.fillRect(-w / 2 + lh, yy, w * (0.55 + U.h1(yy | 0, seed) * 0.4), lh * 0.55);
      g.restore();
    }
    if (!matte && o.texture !== false) {
      g.save(); g.clip(path); g.globalAlpha = 0.25; g.globalCompositeOperation = 'multiply';
      g.drawImage(CS.look.paper('#d8cdb8', 512, 512, 5, 1.4, 0.6), -w / 2, -h / 2, w, h); g.restore();
    }
    g.restore();
  }
  // halftone dot patch (Vox-style print texture)
  function halftone(g, env, x, y, r, o = {}) {
    if (env.mode === 'matte') return;
    const step = env.S * (o.step || 0.012), col = o.color || 'rgba(20,20,20,.55)';
    g.save(); g.fillStyle = col;
    if (o.alpha != null) g.globalAlpha *= U.clamp(o.alpha);
    for (let yy = -r; yy <= r; yy += step) for (let xx = -r + ((Math.round(yy / step) & 1) * step) / 2; xx <= r; xx += step) {
      const d = Math.hypot(xx, yy) / r; if (d > 1) continue;
      g.beginPath(); g.arc(x + xx, y + yy, step * 0.42 * (1 - d * d), 0, 7); g.fill();
    }
    g.restore();
  }
  function clear() { stickers.clear(); }
  return { FONT, FONTS, coverInto, containInto, setShadow, noShadow, grade, photo, base, cutout, cutAspect, label, scrap, halftone, clear };
})();
