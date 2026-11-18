// FAMILY 4 — Labelled diagram: the user's photo/footage frame (or the built-in demo photo) with
// call-out leader lines and numbered markers that draw on one by one, and a legend box that
// builds up. The photo settles with a tiny push (documentary feel).
BD.fx.register({
  id: 'labelled', name: 'Labelled diagram', fam: 'Labelled diagram',
  note: 'अपनी तस्वीर पर नंबर वाले निशान और लीडर-लाइन लेबल — एक-एक करके खिंचते हैं, नीचे लेजेंड बनता है। Your photo with numbered call-outs that draw on one by one and a legend that builds.',
  dur: 8,
  fields: [
    { k: 'title', label: 'Title', def: 'गढ़ी की व्याख्या' },
    { k: 'sub', label: 'Sub note', def: 'FIG. 01' },
    { k: 'labels', label: 'Markers (x,y | हिंदी | ENGLISH), 0..1 photo coords', multi: true, def: '0.52,0.72 | मुख्य द्वार | GATE\n0.40,0.54 | बुर्ज | TOWER\n0.58,0.57 | प्राचीर | WALL\n0.30,0.86 | नींव की चट्टान | BASE ROCK' },
    { k: 'layerTimes', label: 'Layer timing (auto)', def: '' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'clean', sec: 'style' },
    { k: 'marker', label: 'Marker', type: 'select', options: () => [['num', 'Numbered circles'], ['dot', 'Dot'], ['ring', 'Ring'], ['cross', 'Crosshair']], def: 'num', sec: 'style' },
    { k: 'frameStyle', label: 'Photo frame', type: 'select', options: () => [['none', 'None'], ['white', 'White border'], ['corners', 'Corner brackets'], ['tape', 'Tape corners']], def: 'white', sec: 'style' },
    { k: 'photoW', label: 'Photo size', type: 'range', min: 0.5, max: 0.95, step: 0.05, def: 0.8, sec: 'style' },
    { k: 'labelSize', label: 'Label size', type: 'range', min: 18, max: 44, step: 1, def: 28, sec: 'labels' },
    { k: 'legendOn', label: 'Legend box', type: 'check', def: true, sec: 'labels' },
    { k: 'scrim', label: 'Scrim under labels', type: 'range', min: 0, max: 0.5, step: 0.05, def: 0.2, sec: 'style' },
    { k: 'settle', label: 'Photo settle (push)', type: 'range', min: 0, max: 0.08, step: 0.005, def: 0.04, sec: 'anim' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.8, sec: 'anim' },
    { k: 'photo', label: 'Photo / video frame', type: 'media', def: '', sec: 'media' },
  ],
  layers(f, p, dur) {
    const end = BD.util.clamp((1 - (p.hold || 1.8) / dur) / (p.speed || 1), 0.3, 0.97);
    const n = Math.max(1, BD.text.lines(f.labels).length);
    const sec = dur * end;
    return [{ name: 'Photo', start: 0, dur: 0.08 * sec }]
      .concat(Array.from({ length: n }, (_, i) => ({ name: 'Label ' + (i + 1), start: (0.2 + i * 0.72 / n) * sec, dur: 0.5 * sec })))
      .concat([{ name: 'Legend', start: 0.55 * sec, dur: 0.4 * sec }]);
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 1.8) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: call-outs only, no paper/photo
    if (!elem) th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);

    // ---- photo area ----
    const pw = fw * (p.photoW == null ? 0.8 : +p.photoW), ph = pw * (fh / fw);
    const PX = -pw / 2, PY = -ph / 2 - fh * 0.03;
    const pop = elem ? 0 : U.range(pr, 0, 0.1);
    // settle: 1.04 -> 1.0 over ~0.8 s (documentary photo push)
    const st = 1 + (p.settle == null ? 0.04 : +p.settle) * (1 - U.ease.out(U.range(pr, 0, 0.18)));
    if (pop > 0) {
      const m = env.media && env.media.el && !env.media.missing ? env.media : null;
      const img = m ? m.el : BD.engine.demoPhoto(Math.round(fw * 0.5), Math.round(fh * 0.5));
      g.save();
      g.globalAlpha *= pop;
      // scrim behind the photo
      g.fillStyle = th.dark ? 'rgba(0,0,0,.35)' : 'rgba(20,22,28,.10)';
      g.fillRect(PX, PY, pw, ph);
      g.translate(PX + pw / 2, PY + ph / 2); g.scale(st, st); g.translate(-PX - pw / 2, -PY - ph / 2);
      if (m && m.kind === 'video') {
        // cover-fit the video exactly (no edges exposed)
        const ew = img.videoWidth || 16, eh = img.videoHeight || 9;
        const k = Math.max(pw / ew, ph / eh);
        g.drawImage(img, PX + (pw - ew * k) / 2, PY + (ph - eh * k) / 2, ew * k, eh * k);
      } else {
        const ew = img.naturalWidth || img.width || 16, eh = img.naturalHeight || img.height || 9;
        const k = Math.max(pw / ew, ph / eh);
        g.drawImage(img, PX + (pw - ew * k) / 2, PY + (ph - eh * k) / 2, ew * k, eh * k);
      }
      g.restore();
      // frame styles
      const fr = U.range(pr, 0.04, 0.14);
      if (fr > 0 && p.frameStyle !== 'none') {
        g.save(); g.globalAlpha *= fr;
        if (p.frameStyle === 'white') { g.lineWidth = 14; g.strokeStyle = th.dark ? '#f2f4f8' : '#ffffff'; g.strokeRect(PX - 7, PY - 7, pw + 14, ph + 14); }
        else if (p.frameStyle === 'corners') {
          g.strokeStyle = th.ink; g.lineWidth = 5; const L = 54;
          [[PX, PY, 1, 1], [PX + pw, PY, -1, 1], [PX + pw, PY + ph, -1, -1], [PX, PY + ph, 1, -1]].forEach(([x, y, dx, dy]) => {
            D.stroke(g, [[x, y + dy * L], [x, y], [x + dx * L, y]], { w: 5, color: th.ink, prog: U.range(pr, 0.04, 0.16) });
          });
        } else if (p.frameStyle === 'tape') {
          g.fillStyle = 'rgba(233,220,160,.85)';
          [[PX - 12, PY - 12, 0.35], [PX + pw - 34, PY - 12, -0.35], [PX - 12, PY + ph - 34, -0.35], [PX + pw - 34, PY + ph - 34, 0.35]].forEach(([x, y, rot], i) => {
            g.save(); g.translate(x + 23, y + 23); g.rotate(rot);
            g.globalAlpha *= fr * U.range(pr, 0.05 + i * 0.02, 0.14 + i * 0.02);
            g.fillRect(-34, -14, 68, 28); g.restore();
          });
        }
        g.restore();
      }
    }

    // ---- markers + leader lines ----
    const list = T.lines(f.labels).map(s => {
      const [pos, t, sub] = s.split('|');
      const [x, y] = (pos || '').split(',').map(Number);
      return { x: isFinite(x) ? U.clamp(x, 0.05, 0.95) : 0.5, y: isFinite(y) ? U.clamp(y, 0.05, 0.95) : 0.5, t: (t || '').trim(), sub: (sub || '').trim() };
    });
    const n = list.length;
    // scrim for label legibility over the photo
    if (p.scrim > 0 && !elem) {
      g.save(); g.globalAlpha *= p.scrim * U.range(pr, 0.15, 0.3);
      g.fillStyle = '#000'; g.fillRect(PX, PY, pw, ph); g.restore();
    }
    const legend = [];
    // stack the label boxes per side (below the title, clear of the legend) so they never collide
    const laidY = { left: [], right: [] };
    list.forEach((L, i) => {
      const lp = D.stagger(U.range(pr, 0.18, 0.86), i, n, 0.35);
      if (lp <= 0) return;
      const px = PX + L.x * pw * st - (st - 1) * pw / 2, py = PY + L.y * ph * st - (st - 1) * ph / 2;
      const side = px < 0 ? 'left' : 'right';
      const bx = side === 'left' ? -fw / 2 + 56 : fw / 2 - 56;
      let by = U.clamp(py, -fh / 2 + 236, fh / 2 - 210);
      const arr = laidY[side];
      for (let guard = 0; guard < 24; guard++) {
        const clash = arr.find(y => Math.abs(y - by) < 92);
        if (clash == null) break;
        by = U.clamp(clash + 92 * (by >= clash ? 1 : -1), -fh / 2 + 236, fh / 2 - 210);
      }
      arr.push(by);
      D.leader(g, px, py, bx, by, {
        text: L.t, sub: L.sub, prog: lp, th, fs: p.labelSize || 28, side,
        color: th.dark ? '#ffd84a' : '#c2572c', marker: p.marker === 'num' ? 'dot' : p.marker,
        badge: p.marker === 'num' ? i + 1 : null, badgeR: (p.labelSize || 28) * 0.6, seed: env.seed + i * 3, t: lt,
      });
      legend.push({ n: i + 1, t: L.t, sub: L.sub, p: lp });
    });

    // ---- legend box builds up ----
    if (p.legendOn !== false && legend.length) {
      const lw = Math.min(430, fw * 0.24), lh = 60 + legend.length * 52;
      const lx = fw / 2 - 44 - lw, ly = fh / 2 - 44 - lh;
      const bp = U.range(pr, 0.5, 0.72);
      if (bp > 0) {
        g.save(); g.globalAlpha *= bp;
        U.rrect(g, lx, ly, lw, lh, 10);
        g.fillStyle = th.labelBg; g.fill();
        g.lineWidth = 1.6; g.strokeStyle = th.labelBorder; g.stroke();
        D.text(g, lx + 20, ly + 40, f.title || 'LEGEND', { font: th.fonts.head, fs: 30, color: th.labelInk, weight: 'bold', prog: U.range(pr, 0.55, 0.75) });
        legend.forEach((r, i) => {
          const rp = U.range(r.p, 0.25, 0.9);
          if (rp <= 0) return;
          D.numbered(g, lx + 36, ly + 72 + i * 52, r.n, { r: 16, prog: rp, color: th.accent, ink: th.dark ? '#101418' : '#fff', bg: 'rgba(0,0,0,.35)' });
          D.text(g, lx + 62, ly + 80 + i * 52, r.t, { font: th.fonts.label, fs: 24, color: th.labelInk, weight: 'bold', alpha: rp, prog: U.range(rp, 0.2, 1) });
          if (r.sub) D.text(g, lx + 62, ly + 104 + i * 52, r.sub, { font: th.fonts.mono, fs: 15, color: th.labelInk, alpha: rp * 0.6, prog: U.range(rp, 0.3, 1) });
        });
        g.restore();
      }
    }

    // ---- title block corner ----
    if (f.title) {
      const tp = U.range(pr, 0.08, 0.3);
      if (tp > 0) {
        D.text(g, -fw / 2 + 44, -fh / 2 + 84, f.title, { font: th.fonts.head, fs: 56, color: th.ink, weight: 'bold', alpha: tp, prog: U.range(tp, 0.1, 1) });
        D.line(g, -fw / 2 + 44, -fh / 2 + 104, -fw / 2 + 44 + 220 * U.range(tp, 0.3, 1), -fh / 2 + 104, { w: 4, color: th.accent });
      }
    }
    if (f.sub) {
      const sp = U.range(pr, 0.16, 0.4);
      if (sp > 0) D.text(g, -fw / 2 + 44, -fh / 2 + 138, f.sub, { font: th.fonts.mono, fs: 22, color: th.ink2, alpha: sp, prog: U.range(sp, 0.1, 1) });
    }
    g.restore();
  },
});
