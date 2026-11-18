// FAMILY 7 — Scale & size comparison: generic silhouettes (person, car, bus, plane, ship, tower,
// mountain, stadium, dome, rocket) lined up against a height ruler, each rising into place; the
// camera pulls back to reveal the giant one; area mode compares squares that grow.
BD.fx.register({
  id: 'scale', name: 'Scale & size comparison', fam: 'Scale & size comparison',
  note: 'कौन कितना बड़ा? ऊँचाई के पैमाने पर तुलना — हर आकृति अपनी जगह उठती है, फिर कैमरा पीछे खिंचकर सबसे बड़ा दिखाता है। Height ruler comparisons; the camera pulls back to reveal the giant; area squares mode.',
  dur: 8,
  fields: [
    { k: 'title', label: 'Title', def: 'कौन कितना ऊँचा?' },
    { k: 'sub', label: 'Sub note', def: 'HEIGHT COMPARISON' },
    { k: 'items', label: 'Objects (kind | नाम | value m)', multi: true, def: 'person | इंसान | 1.7\ncar | कार | 1.5\nbus | बस | 3.2\nplane | हवाई जहाज़ | 12\nrocket | रॉकेट | 68' },
    { k: 'giant', label: 'Giant (kind | नाम | value m)', def: 'mountain | पर्वत | 8848' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'clean', sec: 'style' },
    { k: 'mode', label: 'Mode', type: 'select', options: () => [['height', 'Height lineup + ruler'], ['area', 'Area squares']], def: 'height', sec: 'style' },
    { k: 'giantOn', label: 'Giant reveal at end', type: 'check', def: true, sec: 'style' },
    { k: 'fill', label: 'Fill silhouettes', type: 'check', def: true, sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 2, sec: 'anim' },
    { k: 'labelsOn', label: 'Labels + counts', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 38, step: 1, def: 24, sec: 'labels' },
  ],
  // silhouette stroke sets in a local box (x centred, gy = ground, h = pixel height)
  _silPts(kind, x, gy, h) {
    switch (kind) {
      case 'car': return {
        body: [[x - h * 1.1, gy], [x - h * 1.05, gy - h * 0.55], [x - h * 0.5, gy - h * 0.62], [x - h * 0.25, gy - h * 1.05], [x + h * 0.3, gy - h * 1.05], [x + h * 0.62, gy - h * 0.6], [x + h * 1.05, gy - h * 0.5], [x + h * 1.1, gy]],
        wheels: [[x - h * 0.62, gy, h * 0.17], [x + h * 0.62, gy, h * 0.17]],
      };
      case 'bus': return {
        body: [[x - h * 1.5, gy], [x - h * 1.5, gy - h * 0.92], [x + h * 1.5, gy - h * 0.92], [x + h * 1.5, gy]],
        extra: Array.from({ length: 5 }, (_, i) => [[x - h * 1.34 + i * h * 0.56, gy - h * 0.82], [x - h * 1.34 + i * h * 0.56, gy - h * 0.58]]),
        wheels: [[x - h * 0.95, gy, h * 0.12], [x + h * 0.95, gy, h * 0.12]],
      };
      case 'plane': return {
        body: [[x - h * 1.6, gy - h * 0.28], [x - h * 1.25, gy - h * 0.36], [x - h * 0.55, gy - h * 0.4], [x + h * 0.5, gy - h * 0.4], [x + h * 1.15, gy - h * 0.32], [x + h * 1.6, gy - h * 0.18], [x + h * 1.6, gy - h * 0.1], [x - h * 1.6, gy - h * 0.1], [x - h * 1.6, gy - h * 0.28]],
        extra: [[[x - h * 0.1, gy - h * 0.4], [x + h * 0.28, gy - h * 0.95], [x + h * 0.5, gy - h * 0.95], [x + h * 0.42, gy - h * 0.4]], [[x - h * 0.9, gy - h * 0.34], [x - h * 1.05, gy - h * 0.75], [x - h * 0.85, gy - h * 0.75], [x - h * 0.62, gy - h * 0.36]]],
      };
      case 'ship': return {
        body: [[x - h * 1.7, gy], [x - h * 1.5, gy - h * 0.5], [x + h * 1.2, gy - h * 0.5], [x + h * 1.75, gy - h * 0.34], [x + h * 1.7, gy]],
        extra: [[[x + h * 0.1, gy - h * 0.5], [x + h * 0.1, gy - h * 0.92], [x + h * 0.55, gy - h * 0.92], [x + h * 0.55, gy - h * 0.5]]],
      };
      case 'tower': return {
        body: [[x - h * 0.13, gy], [x - h * 0.06, gy - h * 0.92], [x + h * 0.06, gy - h * 0.92], [x + h * 0.13, gy]],
        extra: [[[x - h * 0.09, gy - h * 0.92], [x, gy - h], [x + h * 0.09, gy - h * 0.92]]],
      };
      case 'mountain': return {
        body: [[x - h * 0.62, gy], [x - h * 0.2, gy - h * 0.55], [x - h * 0.05, gy - h * 0.72], [x, gy - h], [x + h * 0.07, gy - h * 0.8], [x + h * 0.26, gy - h * 0.5], [x + h * 0.66, gy]],
      };
      case 'stadium': return {
        body: [[x - h * 1.8, gy], [x - h * 1.8, gy - h * 0.72], [x - h * 1.2, gy - h * 0.95], [x + h * 1.2, gy - h * 0.95], [x + h * 1.8, gy - h * 0.72], [x + h * 1.8, gy]],
      };
      case 'dome': return {
        body: [[x - h * 0.5, gy], [x - h * 0.5, gy - h * 0.38], [x - h * 0.42, gy - h * 0.62], [x, gy - h], [x + h * 0.42, gy - h * 0.62], [x + h * 0.5, gy - h * 0.38], [x + h * 0.5, gy]],
      };
      case 'rocket': return {
        body: [[x - h * 0.05, gy], [x - h * 0.05, gy - h * 0.86], [x, gy - h], [x + h * 0.05, gy - h * 0.86], [x + h * 0.05, gy]],
        extra: [[[x - h * 0.05, gy - h * 0.22], [x - h * 0.18, gy], [x - h * 0.05, gy]], [[x + h * 0.05, gy - h * 0.22], [x + h * 0.18, gy], [x + h * 0.05, gy]]],
      };
      default: { // person
        const u = h / 7;
        const P = (px, py) => [x + px * u, gy - py * u];
        return {
          body: [P(0, 8.6), P(-0.9, 8.2), P(-1.1, 7.4), P(-0.6, 7.1), P(0.6, 7.1), P(1.1, 7.4), P(0.9, 8.2), P(0, 8.6), P(0, 7.0), P(-1.2, 6.9), P(-1.3, 4.6), P(-1.15, 4.4), P(1.15, 4.4), P(1.3, 4.6), P(1.2, 6.9), P(0, 7.0), P(-0.7, 4.5), P(-0.9, 2.2), P(-0.5, 0), P(0.5, 0), P(0.9, 2.2), P(0.7, 4.5), P(-0.7, 4.5)],
        };
      }
    }
  },
  // draw one silhouette with rise + draw-on + optional fill
  _sil(g, kind, x, yy, gy, h, sp, th, LW, seed, lt, fillOn, accent) {
    const U = BD.util, D = BD.draw;
    const { body, extra, wheels } = this._silPts(kind, x, yy, h);
    const col = accent ? th.accent : th.ink;
    const drawSet = (pts, prog, w, thin) => {
      const shifted = pts.map(q => [q[0], yy - (gy - q[1])]);
      D.stroke(g, shifted, { w, color: col, prog, boil: th.wobble, seed, t: lt, glow: th.glow ? 0.4 : 0 });
      if (fillOn && !thin && prog > 0.3) {
        g.save(); g.globalAlpha *= 0.1 * U.range(prog, 0.3, 1);
        g.beginPath(); shifted.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
        g.fillStyle = col; g.fill(); g.restore();
      }
    };
    drawSet(body, sp, 2.8 * LW);
    if (extra) extra.forEach((ex, i) => drawSet(ex, U.range(sp, 0.35 + i * 0.1, 0.8 + i * 0.1), 1.8 * LW, true));
    if (wheels) wheels.forEach(([wx, wy, r], i) => {
      const wp = U.range(sp, 0.3 + i * 0.1, 0.85);
      if (wp <= 0) return;
      const c = BD.shapes.circ(0, 0, r);
      D.stroke(g, c.map(q => [wx + q[0], yy - (gy - wy) + q[1]]), { w: 2.2 * LW, color: col, prog: wp });
    });
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 2) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const fs = p.labelSize || 24;
    const items = T.lines(f.items).map(s => { const [kind, name, v] = s.split('|').map(x => (x || '').trim()); return { kind: kind || 'person', name: name || '', v: parseFloat(v) || 1 }; });
    const n = Math.max(1, items.length);
    const giant = (() => { const [kind, name, v] = String(f.giant || '').split('|').map(x => (x || '').trim()); return { kind: kind || 'mountain', name: name || '', v: parseFloat(v) || 8848 }; })();
    const showGiant = p.giantOn !== false && p.mode === 'height';

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.08), minor: 96, major: 480 });
    }

    if (p.mode === 'area') {
      // squares that grow; value = area km^2
      const maxV = Math.max(...items.map(it => it.v), 1);
      const area = fw * fh * 0.4;
      let x = -fw * 0.38, y = fh * 0.28;
      items.forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.1, 0.8), i, n, 0.4);
        if (sp <= 0) return;
        const s = Math.sqrt(area * it.v / maxV);
        const grow = U.ease.outQuart(sp);
        g.save(); g.globalAlpha *= U.range(sp, 0, 0.3);
        g.strokeStyle = th.ink; g.lineWidth = 2.6 * LW;
        g.strokeRect(x, y - s * grow, s * grow, s * grow);
        if (p.fill !== false) { g.fillStyle = U.rgba(th.pal.accent, 0.12); g.fillRect(x, y - s * grow, s * grow, s * grow); }
        g.restore();
        D.text(g, x, y + 36, it.name, { font: th.fonts.label, fs, color: th.ink, weight: 'bold', alpha: U.range(sp, 0.3, 0.8), prog: U.range(sp, 0.3, 0.9) });
        if (p.labelsOn !== false) D.text(g, x, y + 36 + fs * 0.9, T.formatNumber(it.v * U.range(sp, 0.2, 1), 'plain', 0, 'en') + ' km²', { font: th.fonts.mono, fs: fs * 0.7, color: th.ink2, alpha: U.range(sp, 0.4, 0.9), prog: U.range(sp, 0.5, 1) });
        x += s + 34;
      });
    } else {
      // ---- height lineup with camera pull-back for the giant ----
      // Line weights are divided by zoomK so they stay CONSTANT ON SCREEN while the camera moves.
      // The zoom is chosen so the GIANT fits vertically in the frame (for a true-scale 8,848 m
      // mountain that is a deep zoom — the small lineup shrinks to specks: the actual scale gag).
      const maxLine = Math.max(...items.map(it => it.v), 1);
      const allMax = showGiant ? Math.max(giant.v, maxLine) : maxLine;
      const backP = showGiant ? U.range(pr, 0.62, 0.9) : 0;
      const GY = fh * 0.36; // ground line, fixed on screen
      let zoomK;
      if (showGiant) {
        const scaleY0 = (fh * 0.74) / maxLine;
        const hG = giant.v * scaleY0;
        zoomK = U.lerp(1, U.clamp((GY + fh * 0.5) / hG, 0.007, 0.92), U.ease.inOut(backP));
      } else zoomK = 1;
      const wc = 1 / zoomK; // width compensation (screen-constant line weight)
      const vis = U.clamp((zoomK - 0.22) / 0.28); // small-object labels/ruler fade out on deep zoom
      g.save();
      g.translate(0, GY * (1 - zoomK));
      g.scale(zoomK, zoomK);
      const groundY = GY; // world ground
      const scaleY = (fh * 0.74) / maxLine;

      // ruler
      const rulerX = -fw * 0.3;
      const rulerP = U.range(pr, 0.05, 0.4);
      D.line(g, rulerX, groundY, rulerX, groundY - maxLine * scaleY, { w: 3 * LW * wc, color: th.ink, prog: rulerP, alpha: vis });
      const ticks = 8;
      for (let i = 0; i <= ticks; i++) {
        const tv = maxLine * i / ticks;
        const ty = groundY - tv * scaleY;
        const tp = D.stagger(rulerP, i, ticks + 1, 0.6);
        if (tp <= 0) continue;
        D.line(g, rulerX, ty, rulerX + 16, ty, { w: 2 * LW * wc, color: th.ink2, prog: tp, alpha: vis * 0.9 });
        if (p.labelsOn !== false && zoomK > 0.45) D.text(g, rulerX - 14, ty + 8 / Math.max(0.5, zoomK) * 0.8, T.formatNumber(tv * U.range(tp, 0.3, 1), 'plain', 0, 'en') + ' m', { font: th.fonts.mono, fs: 24 / Math.max(0.45, zoomK) * 0.8, color: th.ink2, align: 'right', alpha: tp * 0.9 * vis, prog: U.range(tp, 0.2, 0.8) });
      }
      D.line(g, rulerX - 46, groundY, rulerX + fw * 0.85, groundY, { w: 3.4 * LW * wc, color: th.ink, prog: U.range(pr, 0.02, 0.2) });

      // objects rise into place
      const x0 = rulerX + 110, span = fw * 0.66;
      const lab = 56 / Math.max(0.3, zoomK);
      items.forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.14, 0.68), i, n, 0.4);
        if (sp <= 0) return;
        const x = x0 + (n === 1 ? span * 0.4 : span * 0.82 * i / (n - 1));
        const h = it.v * scaleY;
        const rise = U.ease.out(U.range(sp, 0.12, 0.72));
        const yy = groundY + (1 - rise) * h * 0.3;
        this._sil(g, it.kind, x, yy, groundY, h, sp, th, LW * wc, env.seed + i * 9, lt, p.fill !== false, false);
        if (p.labelsOn !== false) {
          const lp = U.range(sp, 0.45, 0.9) * vis;
          if (lp > 0.01) {
            const vsc = Math.max(0.34, zoomK);
            D.text(g, x, groundY + lab, it.name, { font: th.fonts.label, fs: fs / vsc * 0.8, color: th.ink, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.2, 0.9) });
            const val = it.v * U.range(lp, 0.1, 1);
            D.text(g, x, groundY + lab + fs / vsc * 0.95, T.formatNumber(val, 'plain', val < 10 ? 1 : 0, 'en') + ' m', { font: th.fonts.mono, fs: fs * 0.72 / vsc, color: th.ink2, align: 'center', alpha: lp });
          }
        }
      });

      // the giant rises while the camera pulls back to fit it — its label is drawn in SCREEN space
      // (at a true-scale deep zoom a world-space label would collapse onto the ground line)
      let giantX = 0, giantReady = false;
      if (showGiant) {
        const gp = U.range(pr, 0.56, 0.92);
        if (gp > 0) {
          const x = x0 + span * 0.94;
          const h = giant.v * scaleY;
          const rise = U.ease.out(U.range(gp, 0.08, 0.85));
          const yy = groundY + (1 - rise) * h * 0.22;
          this._sil(g, giant.kind, x, yy, groundY, h, U.range(gp, 0.15, 1), th, LW * wc, env.seed + 99, lt, p.fill !== false, true);
          giantX = x; giantReady = true;
        }
      }
      g.restore(); // camera
      if (giantReady && p.labelsOn !== false) {
        const lp = U.range(U.range(pr, 0.56, 0.92), 0.6, 0.96);
        if (lp > 0) {
          D.text(g, 0, GY - 196, giant.name, { font: th.fonts.label, fs: fs * 2.4, color: th.accent, weight: 'bold', align: 'center', alpha: lp, prog: U.range(lp, 0.2, 0.9) });
          const val = giant.v * U.range(lp, 0.1, 1);
          D.text(g, 0, GY - 196 + fs * 2.9, T.formatNumber(val, 'indian', 0, 'en') + ' m', { font: th.fonts.mono, fs: fs * 2.0, color: th.accent, align: 'center', alpha: lp });
        }
      }
    }

    // title (screen space)
    if (f.title) {
      const tp = U.range(pr, 0.04, 0.2);
      if (tp > 0) {
        D.text(g, -fw / 2 + 70, -fh / 2 + 84, f.title, { font: th.fonts.head, fs: 54, color: th.ink, weight: 'bold', alpha: tp, prog: U.range(tp, 0.1, 1) });
        D.line(g, -fw / 2 + 70, -fh / 2 + 104, -fw / 2 + 70 + 220 * U.range(tp, 0.4, 1), -fh / 2 + 104, { w: 4, color: th.accent });
      }
    }
    if (f.sub) D.text(g, -fw / 2 + 70, -fh / 2 + 138, f.sub, { font: th.fonts.mono, fs: 22, color: th.ink2, alpha: U.range(pr, 0.1, 0.3) });
    g.restore();
  },
});
