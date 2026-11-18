// Text animator (like After Effects text animators / CapCut In-Out-Loop): lays out text, then animates each unit
// (line / word / Devanagari-safe cluster) with an In effect, an Out effect and an optional Loop.
KT.anim = (() => {
  const U = KT.util, T = KT.text;
  const IN = [['fade', 'Fade'], ['rise', 'Rise up'], ['drop', 'Drop down'], ['slideL', 'Slide from right'], ['slideR', 'Slide from left'],
    ['pop', 'Scale pop (overshoot)'], ['slam', 'Slam (big → small)'], ['blur', 'Blur in'], ['mask', 'Mask reveal up'], ['maskDown', 'Mask reveal down'],
    ['type', 'Typewriter'], ['flip', '3D flip'], ['glitch', 'Glitch / RGB split'], ['stroke', 'Stroke draw-on'], ['track', 'Tracking in'],
    ['rotate', 'Rotate in'], ['zoom', 'Zoom from far'], ['bounce', 'Bounce drop'], ['skew', 'Skew slide'], ['flicker', 'Flicker on'], ['wipe', 'Wipe (soft)'], ['none', 'None (cut)']];
  const LOOPS = [['none', 'None'], ['float', 'Float'], ['wave', 'Wave'], ['pulse', 'Pulse'], ['shake', 'Shake'], ['glow', 'Glow breathe'], ['drift', 'Slow push-in']];
  const UNITS = [['word', 'Word by word'], ['cluster', 'Letter by letter (akshar-safe)'], ['line', 'Line by line'], ['all', 'All together']];
  const FILLS = [['solid', 'Solid colour'], ['gold', 'Gold metal'], ['silver', 'Silver chrome'], ['fire', 'Fire'], ['grad', 'Two-colour gradient'], ['outline', 'Outline only']];

  // state for a unit from an effect at progress q (0 → hidden/start, 1 → settled)
  function fxState(fx, q, u, size, seed, raw) {
    const s = { a: 1, dx: 0, dy: 0, sc: 1, sx: 1, sy: 1, rot: 0, skew: 0, blur: 0, clip: false, stroke: -1, glitch: 0, hide: false, track: 0 };
    const e = U.ease;
    switch (fx) {
      case 'none': s.hide = raw <= 0; break;
      case 'fade': s.a = q; break;
      case 'rise': s.a = U.range(q, 0, 0.6); s.dy = (1 - q) * size * 0.55; break;
      case 'drop': s.a = U.range(q, 0, 0.6); s.dy = -(1 - q) * size * 0.55; break;
      case 'slideL': s.a = U.range(q, 0, 0.5); s.dx = (1 - q) * size * 1.1; break;
      case 'slideR': s.a = U.range(q, 0, 0.5); s.dx = -(1 - q) * size * 1.1; break;
      case 'pop': { const k = e.outBack(raw); s.sc = Math.max(0, k); s.a = U.range(raw, 0, 0.25); break; }
      case 'slam': { const k = e.outExpo(raw); s.sc = 1 + (1 - k) * 1.8; s.a = U.range(raw, 0, 0.3); break; }
      case 'blur': s.a = U.range(q, 0, 0.8); s.blur = (1 - q) * size * 0.22; s.sc = 1 + (1 - q) * 0.12; break;
      case 'mask': s.clip = true; s.dy = (1 - q) * size * 1.25; break;
      case 'maskDown': s.clip = true; s.dy = -(1 - q) * size * 1.25; break;
      case 'type': s.hide = raw <= 0; break;
      case 'flip': s.sy = Math.cos((1 - q) * Math.PI / 2); s.a = U.range(q, 0, 0.4); s.dy = (1 - q) * size * 0.2; break;
      case 'glitch': {
        const live = raw < 1, f = Math.floor(raw * 14);
        s.glitch = live ? (1 - raw) : 0;
        s.a = raw <= 0 ? 0 : (live && U.h1(f + u * 7, seed) < 0.25 ? 0.25 : 1);
        s.dx = live ? (U.h1(f * 3 + u, seed + 5) - 0.5) * size * 0.5 * (1 - raw) : 0;
        break;
      }
      case 'stroke': s.stroke = raw; break;
      case 'track': s.a = U.range(q, 0, 0.7); s.track = (1 - q); break;
      case 'rotate': s.a = U.range(q, 0, 0.5); s.rot = (1 - q) * 0.6; s.dy = (1 - q) * size * 0.4; break;
      case 'zoom': s.a = U.range(q, 0, 0.6); s.sc = 0.25 + 0.75 * q; s.blur = (1 - q) * size * 0.08; break;
      case 'bounce': { const k = e.outBounce(raw); s.dy = -(1 - k) * size * 1.6; s.a = U.range(raw, 0, 0.15); break; }
      case 'skew': s.a = U.range(q, 0, 0.5); s.dx = (1 - q) * size * 1.4; s.skew = (1 - q) * -0.5; break;
      case 'flicker': { const f = Math.floor(raw * 16); s.a = raw >= 1 ? 1 : raw <= 0 ? 0 : (U.h1(f + u * 3, seed + 9) < 0.35 + raw * 0.6 ? 0.5 + raw * 0.5 : 0.06); break; }
      case 'wipe': s.a = 1; break; // handled at block level
      default: s.a = q;
    }
    return s;
  }

  // per-unit timing: the whole In finishes within inDur, spread 0 = together, 1 = strictly one after another
  function unitProgress(t, i, n, start, total, spread, order, seed) {
    if (total <= 0) return t >= start ? 1 : 0;
    let k = i;
    if (order === 'reverse') k = n - 1 - i;
    else if (order === 'center') k = Math.abs(i - (n - 1) / 2) * 2;
    else if (order === 'random') k = Math.floor(U.h1(i, seed + 77) * n);
    const m = order === 'center' ? n - 1 : n - 1;
    const ut = total / (1 + Math.max(0, m) * spread), st = ut * spread;
    return U.range(t, start + k * st, start + k * st + ut);
  }

  function fillStyle(g, o, y0, y1, x0, x1) {
    const c = o.color || '#ffffff';
    if (o.fill === 'gold' || o.fill === 'silver' || o.fill === 'fire' || o.fill === 'grad') {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      const stops = o.fill === 'gold' ? ['#fff3b8', '#f1c75b', '#a8741d', '#f6dd8a', '#7a5212']
        : o.fill === 'silver' ? ['#ffffff', '#d9dee6', '#7d8794', '#eef2f7', '#4d5560']
        : o.fill === 'fire' ? ['#fff6b0', '#ffc23a', '#ff6a00', '#d42a00', '#5a0b00']
        : [c, o.color2 || '#f5b942'];
      stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
      return gr;
    }
    return c;
  }

  const pool = {};
  function scratch(k, w, h) {
    let c = pool[k];
    if (!c) c = pool[k] = U.canvas(w, h);
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
    return c;
  }

  // draw one unit (string at x, baseline y) with state s
  function drawUnit(g, str, x, y, w, L, s, o, isEmph, seed, ui) {
    if (s.hide || s.a <= 0.002) return;
    const size = L.size, cx = x + w / 2, cy = y - L.asc * 0.35;
    g.save();
    g.globalAlpha *= U.clamp(s.a);
    if (s.clip) { const l = L._line; g.beginPath(); g.rect(x - size * 2, l.top - size * 0.08, w + size * 4, l.bottom - l.top + size * 0.16); g.clip(); }
    g.translate(cx + s.dx, cy + s.dy);
    if (s.rot) g.rotate(s.rot);
    if (s.skew) g.transform(1, 0, s.skew, 1, 0, 0);
    g.scale(s.sc * s.sx, s.sc * s.sy);
    g.translate(-cx, -cy);
    g.font = L.fontStr;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const col = isEmph && o.emphColor ? Object.assign({}, o, { color: o.emphColor, fill: o.emphFill || 'solid' }) : o;
    const fs = fillStyle(g, col, y - L.asc, y + L.desc * 0.4, x, x + w);
    // extrude / long 3D shadow
    if (o.extrude) {
      const n = Math.round(size * o.extrude * 0.12), dark = o.extrudeColor || U.shade(o.color || '#fff', -0.6);
      g.fillStyle = dark;
      for (let k = n; k > 0; k--) g.fillText(str, x + k * 0.7, y + k * 0.9);
    }
    if (s.blur > 0.6) {
      // cheap, Safari-safe blur: draw small, scale up
      const k = Math.min(10, 1 + s.blur / 3), pad = size * 0.6;
      const bw = Math.ceil((w + pad * 2) / k) + 2, bh = Math.ceil((L.asc + L.desc + pad * 2) / k) + 2;
      const c = scratch('blur', bw, bh), cg = c.getContext('2d');
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height);
      cg.scale(1 / k, 1 / k); cg.font = L.fontStr; cg.fillStyle = typeof fs === 'string' ? fs : (o.color || '#fff');
      cg.fillText(str, pad, pad + L.asc);
      g.imageSmoothingEnabled = true;
      g.drawImage(c, 0, 0, bw, bh, x - pad, y - L.asc - pad, bw * k, bh * k);
      g.restore();
      return;
    }
    if (o.shadow) { g.shadowColor = o.shadowColor || 'rgba(0,0,0,0.6)'; g.shadowBlur = size * 0.12 * o.shadow; g.shadowOffsetY = size * 0.04 * o.shadow; }
    if (o.glow) { g.shadowColor = o.glowColor || o.color || '#fff'; g.shadowBlur = size * 0.35 * o.glow; g.shadowOffsetY = 0; }
    if (s.glitch > 0) {
      const off = size * 0.09 * s.glitch;
      g.globalAlpha *= 0.8;
      g.fillStyle = '#ff2a4d'; g.fillText(str, x - off, y);
      g.fillStyle = '#21e6ff'; g.fillText(str, x + off, y + off * 0.3);
      g.globalAlpha /= 0.8;
      // horizontal slice displacement
      const f = Math.floor(s.glitch * 40);
      for (let k = 0; k < 3; k++) {
        const yy = y - L.asc + U.h1(f * 5 + k, seed + ui) * (L.asc + L.desc), hh = size * 0.12;
        g.save(); g.beginPath(); g.rect(x - size, yy, w + size * 2, hh); g.clip();
        g.fillStyle = fs; g.fillText(str, x + (U.h1(f + k * 9, seed + 3) - 0.5) * size * 0.6 * s.glitch, y);
        g.restore();
      }
    }
    const outline = o.fill === 'outline';
    if (s.stroke >= 0 && s.stroke < 1) {
      g.shadowColor = 'transparent';
      const Lp = size * 7;
      g.setLineDash([Lp * U.clamp(s.stroke / 0.75), Lp]);
      g.lineWidth = Math.max(1.5, size * 0.035); g.strokeStyle = o.strokeColor || o.color || '#fff'; g.lineJoin = 'round';
      g.strokeText(str, x, y);
      g.setLineDash([]);
      if (!outline) { g.globalAlpha *= U.range(s.stroke, 0.65, 1); g.fillStyle = fs; g.fillText(str, x, y); }
    } else if (outline) {
      g.lineWidth = Math.max(1.5, size * 0.035); g.strokeStyle = o.color || '#fff'; g.lineJoin = 'round'; g.strokeText(str, x, y);
    } else {
      if (o.outline) { g.lineWidth = size * o.outline; g.strokeStyle = o.outlineColor || '#000'; g.lineJoin = 'round'; g.strokeText(str, x, y); g.shadowColor = 'transparent'; }
      g.fillStyle = fs; g.fillText(str, x, y);
    }
    g.restore();
  }

  function mkLayout(o) {
    return T.fit(o.text, { font: o.font, size: o.size, weight: o.weight, italic: o.italic, maxW: o.maxW, lineH: o.lineH, align: o.align || 'center', valign: o.valign || 'middle', tracking: o.tracking, upper: o.upper, wordGap: o.wordGap }, o.maxH);
  }

  // o: text style + animation. t = local time, dur = clip length. Returns layout (for decorations).
  // inStart/outEnd let callers place the text inside a longer element.
  function text(g, o, t, dur, seed = 1) {
    if (!o.text) return null;
    const L = mkLayout(o);
    const unit = o.unit || 'word', inFx = o.in || 'rise', outFx = o.out || 'fade';
    const inStart = o.inStart || 0, inDur = o.inDur == null ? 0.8 : o.inDur, outDur = o.outDur == null ? 0.45 : o.outDur;
    const outStart = (o.outEnd == null ? dur : o.outEnd) - outDur;
    let list;
    if (unit === 'cluster' || inFx === 'type') list = L.units.cluster.map(c => ({ str: c.text, x: c.ax, y: c.base, w: c.w, line: c.line, emph: c.emph }));
    else if (unit === 'line') list = L.units.line.map(l => ({ str: l.words.map(w => w.text).join(' '), x: l.x, y: l.base, w: l.w, line: l, emph: false, words: l.words }));
    else list = L.units.word.map(w => ({ str: w.text, x: w.x, y: w.base, w: w.w, line: w.line, emph: w.emph }));
    const n = list.length, spread = unit === 'all' ? 0 : (o.spread == null ? 0.6 : o.spread);
    const ein = U.ease[o.ease || 'out'] || U.ease.out;
    // loop motion
    const lt = t - inStart;
    g.save();
    if (o.loop === 'drift') { const k = 1 + 0.06 * U.range(t, 0, dur); g.scale(k, k); }
    // block-level soft wipe
    const wipe = inFx === 'wipe';
    list.forEach((u, i) => {
      const raw = wipe ? 1 : unitProgress(t, i, n, inStart, inDur, spread, o.order, seed);
      let s = fxState(inFx, ein(raw), i, L.size, seed, raw);
      if (outDur > 0 && outFx !== 'hold' && t > outStart) {
        const ro = unitProgress(t, i, n, outStart, outDur, unit === 'all' ? 0 : Math.min(spread, 0.3), o.order, seed);
        const so = fxState(outFx === 'same' ? inFx : outFx, U.ease.out(1 - ro), i, L.size, seed + 1, 1 - ro);
        s.a *= so.a; s.dx += so.dx; s.dy += so.dy; s.sc *= so.sc; s.sy *= so.sy; s.rot += so.rot; s.blur = Math.max(s.blur, so.blur); s.hide = s.hide || so.hide;
        if (so.clip) s.clip = true; if (so.glitch) s.glitch = so.glitch; if (so.track) s.track = Math.max(s.track, so.track);
        if (so.stroke >= 0) s.stroke = so.stroke;
      }
      if (s.track) s.dx += (u.x + u.w / 2) * s.track * 0.6;
      if (o.loop === 'float') s.dy += Math.sin(lt * 1.6) * L.size * 0.04;
      if (o.loop === 'wave') s.dy += Math.sin(lt * 4 - i * 0.6) * L.size * 0.07;
      if (o.loop === 'pulse') s.sc *= 1 + 0.04 * Math.sin(lt * 5);
      if (o.loop === 'shake') { s.dx += U.noise1(lt * 9, seed + i) * L.size * 0.03; s.dy += U.noise1(lt * 9, seed + 40 + i) * L.size * 0.03; }
      L._line = u.line;
      const oo = o.loop === 'glow' ? Object.assign({}, o, { glow: (o.glow || 0.4) * (0.6 + 0.4 * Math.sin(lt * 3)) }) : o;
      drawUnit(g, u.str, u.x, u.y, u.w, L, s, oo, u.emph, seed, i);
      // typewriter cursor
      if (inFx === 'type' && o.cursor !== false) {
        const raw2 = unitProgress(t, i, n, inStart, inDur, spread, o.order, seed), nxt = i + 1 < n ? unitProgress(t, i + 1, n, inStart, inDur, spread, o.order, seed) : 1;
        if ((raw2 > 0 && nxt <= 0) || (i === n - 1 && raw2 > 0 && Math.floor(t * 2.2) % 2 === 0 && t < outStart)) {
          g.fillStyle = o.color || '#fff'; g.globalAlpha = 0.9;
          g.fillRect(u.x + u.w + L.size * 0.05, u.y - L.asc * 0.8, Math.max(2, L.size * 0.06), L.asc * 0.95);
          g.globalAlpha = 1;
        }
      }
    });
    g.restore();
    if (wipe) {
      // soft left→right wipe of the whole block (destination-in gradient)
      const p = U.ease.inOut(U.range(t, inStart, inStart + inDur)), x0 = L.left - L.size, x1 = L.left + L.W + L.size;
      const xe = U.lerp(x0, x1 + L.size * 2, p);
      const gr = g.createLinearGradient(xe - L.size * 2, 0, xe, 0);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr;
      g.fillRect(x0 - 4000, L.top - L.size * 2 - 4000, 8000 + x1 - x0 + 4000, L.H + 8000); g.restore();
    }
    return L;
  }

  return { IN, LOOPS, UNITS, FILLS, text, fxState, unitProgress, fillStyle, mkLayout, scratch };
})();
