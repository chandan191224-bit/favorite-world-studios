// Element registry: the shot types. Each element declares its fields + parameter schema
// (the inspector is auto-built from it) and a draw() that orchestrates paper, style
// passes, photo reveal, labels and mark layers. The engine normalises everything.
SK.el = (() => {
  const U = SK.util, T = SK.text;
  const byId = {}, list = [];
  function register(el) { byId[el.id] = el; list.push(el); }

  const STYLE_OPTS = SK.styles.LIST.map(s => [s.id, s.name]);
  const PAPER_OPTS = SK.paper.TYPES;
  const REVEAL_OPTS = [
    ['none', 'No photo (sketch only)'], ['fade', 'Photo fades in'], ['radial', 'Radial reveal'],
    ['bleed', 'Ink bleed'], ['wash', 'Watercolour wipe'], ['brush', 'Brush strokes'],
    ['pour', 'Colour pours into the lines'], ['split', 'Split sweep (sketch → photo)'],
    ['splitHold', 'Half sketch / half photo (hold)'],
  ];
  const ORDER_OPTS = [
    ['natural', 'Big shapes first, then details'], ['top', 'Top-down'], ['center', 'Centre-out'],
    ['subject', 'Subject first'], ['random', 'Random (seeded)'], ['left', 'Left to right'],
  ];

  // shared: draw the label layers of a shot at local time lt (positions in DEVICE px)
  function drawLayers(g, shot, lt, env) {
    const W = env.W, H = env.H;
    for (const ly of shot.layers || []) {
      if (ly.on === false) continue;
      const lq = U.range(lt, ly.start, ly.start + Math.max(0.2, ly.dur));
      if (lq <= 0) continue;
      const x = (ly.x == null ? 0.5 : ly.x) * W, y = (ly.y == null ? 0.5 : ly.y) * H;
      if (ly.kind === 'mark') {
        SK.ann.mark(g, ly.mark || 'circle', x, y, (ly.size || 120) * env.k * 0.55, U.ease.out(lq), {
          color: ly.color || '#c8372d', width: ly.width || 5, seed: (ly.seed || 3), rot: ly.rot || 0, side: ly.side, double: ly.double,
        });
      } else {
        SK.ann.label(g, ly.text || '', x, y, U.ease.pen(lq), {
          size: (ly.size || 52) * env.k, color: ly.color || '#2c2416',
          font: ly.font || 'kalam', bold: ly.bold, underline: ly.underline, uColor: ly.uColor,
          align: ly.align || 'center', maxW: W * 0.8, leader: ly.leader ? [ly.leader[0] * W, ly.leader[1] * H] : null,
        });
      }
    }
  }

  // ---------------------------------------------------------------- photo
  register({
    id: 'photo', name: 'Photo → sketch', family: 'Reveal shots',
    desc: 'A photo becomes a hand drawing that draws itself on, then the real photo bleeds back in. Labels and marks go on as layers.',
    dur: 6,
    fields: [
      { k: 'label', label: 'Name line (लिखते हुए आती है)', ph: 'नाम / शीर्षक' },
      { k: 'sub', label: 'Second line (तारीख़, पद…)' },
    ],
    params: [
      { k: 'style', label: 'Drawing style', type: 'select', options: STYLE_OPTS, def: 'pencil', card: 'STYLE' },
      { k: 'detail', label: 'Edge detail', type: 'range', min: 0, max: 1, step: 0.01, def: 0.55, card: 'STYLE' },
      { k: 'lineWeight', label: 'Line weight', type: 'range', min: 0.4, max: 3, step: 0.05, def: 1, card: 'STYLE' },
      { k: 'wobble', label: 'Hand wobble', type: 'range', min: 0, max: 1.4, step: 0.01, def: null, card: 'STYLE' },
      { k: 'pressure', label: 'Pressure', type: 'range', min: 0, max: 1, step: 0.01, def: null, card: 'STYLE' },
      { k: 'tone', label: 'Shading strength', type: 'range', min: 0, max: 1, step: 0.01, def: 1, card: 'STYLE' },
      { k: 'hatchDensity', label: 'Hatch density', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, card: 'STYLE' },
      { k: 'inkColor', label: 'Ink colour', type: 'color', def: null, card: 'STYLE' },
      { k: 'drawDur', label: 'Drawing time (s)', type: 'range', min: 0.5, max: 12, step: 0.1, def: 4.2, card: 'ANIMATION' },
      { k: 'order', label: 'Stroke order', type: 'select', options: ORDER_OPTS, def: 'natural', card: 'ANIMATION' },
      { k: 'tool', label: 'Drawing tool on screen', type: 'select', options: [['none', 'None'], ['pencil', 'Pencil'], ['pen', 'Pen nib']], def: 'none', card: 'ANIMATION' },
      { k: 'photoReveal', label: 'Photo reveal', type: 'select', options: REVEAL_OPTS, def: 'fade', card: 'ANIMATION' },
      { k: 'photoAt', label: 'Photo starts at (s)', type: 'range', min: 0, max: 14, step: 0.1, def: 4.6, card: 'ANIMATION' },
      { k: 'photoDur', label: 'Reveal time (s)', type: 'range', min: 0.3, max: 6, step: 0.1, def: 1.6, card: 'ANIMATION' },
      { k: 'photoMix', label: 'Photo strength at end', type: 'range', min: 0, max: 1, step: 0.01, def: 1, card: 'ANIMATION' },
      { k: 'dryBack', label: 'Photo dries back at end (s)', type: 'range', min: 0, max: 5, step: 0.1, def: 0, card: 'ANIMATION' },
      { k: 'drift', label: 'Slow push on the photo', type: 'range', min: 0, max: 0.25, step: 0.01, def: 0, card: 'ANIMATION' },
      { k: 'paper', label: 'Paper', type: 'select', options: PAPER_OPTS.concat([['none', 'No paper (black)']]), def: null, card: 'PAPER' },
      { k: 'stains', label: 'Stains', type: 'range', min: 0, max: 1, step: 0.01, def: null, card: 'PAPER' },
      { k: 'burn', label: 'Edge burn', type: 'range', min: 0, max: 1, step: 0.01, def: null, card: 'PAPER' },
      { k: 'smudge', label: 'Smudges', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'PAPER' },
      { k: 'eraser', label: 'Eraser marks', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'PAPER' },
      { k: 'grid', label: 'Grid', type: 'range', min: 0, max: 1, step: 0.01, def: null, card: 'PAPER' },
      { k: 'photoAge', label: 'Archival look of the photo', type: 'range', min: 0, max: 1, step: 0.01, def: 0.55, card: 'PHOTO' },
      { k: 'photoDesat', label: 'Desaturate photo', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'PHOTO' },
      { k: 'photoVig', label: 'Photo vignette', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5, card: 'PHOTO' },
      { k: 'photoBorder', label: 'Aged photo border', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'PHOTO' },
      { k: 'vignette', label: 'Final vignette', type: 'range', min: 0, max: 1, step: 0.01, def: 0.35, card: 'PHOTO' },
      { k: 'frame', label: 'Frame line around', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'PHOTO' },
      { k: 'fx', label: 'Photo focus X', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5, card: 'PHOTO' },
      { k: 'fy', label: 'Photo focus Y', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5, card: 'PHOTO' },
      { k: 'labelSize', label: 'Name line size', type: 'range', min: 24, max: 120, step: 1, def: 54, card: 'LABELS' },
      { k: 'labelFont', label: 'Name line font', type: 'select', options: T.FONT_OPTIONS, def: 'kalam', card: 'LABELS' },
      { k: 'labelColor', label: 'Name line colour', type: 'color', def: '#2c2416', card: 'LABELS' },
      { k: 'labelY', label: 'Name line height', type: 'range', min: 0.02, max: 0.4, step: 0.01, def: 0.84, card: 'LABELS' },
      { k: 'labelAt', label: 'Name line writes at (s)', type: 'range', min: 0, max: 14, step: 0.1, def: 2.2, card: 'LABELS' },
    ],
    draw(g, shot, lt, env) {
      const P = env.P, F = env.F, { W, H } = env;
      const styleId = P.style || 'pencil';
      const cfg = SK.styles.byId[styleId] || SK.styles.byId.pencil;
      const dur = env.dur;
      // phases — the drawing fills the shot: strokes end ~0.8 of the draw window, tone and
      // colour run on after, the photo reveal finishes near p≈0.95 of the whole shot
      const drawDur = Math.min(P.drawDur == null ? Math.min(4.2, dur * 0.72) : P.drawDur, dur * 0.92);
      const R = SK.reveals;
      const qStroke = R.ph(lt, 0, drawDur * 0.86, 'pen');
      const qTone = R.ph(lt, drawDur * 0.32, drawDur * 0.6);
      const qColor = R.ph(lt, drawDur * 0.5, drawDur * 0.48);
      const photoAt = Math.min(P.photoAt == null ? drawDur : P.photoAt, dur - 0.25);
      const photoDur = P.photoDur == null ? 1.6 : P.photoDur;
      let qPhoto = R.ph(lt, photoAt, photoDur);
      const mix = P.photoMix == null ? 1 : P.photoMix;
      const dryBack = P.dryBack || 0;
      let dryMul = 1;
      if (dryBack > 0.2) dryMul = 1 - R.ph(lt, dur - dryBack, dryBack * 0.75);
      qPhoto *= mix * dryMul;
      const reveal = P.photoReveal || 'fade';
      const styleP = Object.assign({}, P);
      if (P.inkColor) styleP.inkOverride = P.inkColor;
      // ink colour override
      const inkCfg = Object.assign({}, cfg);
      if (P.inkColor) inkCfg.ink = Object.assign({}, cfg.ink, { color: P.inkColor });
      if (P.wobble != null) inkCfg.ink = Object.assign({}, inkCfg.ink || cfg.ink, { wobble: P.wobble });
      if (P.pressure != null) inkCfg.ink = Object.assign({}, inkCfg.ink || cfg.ink, { pressure: P.pressure });
      const env2 = Object.assign({}, env, { P: styleP, ph: { stroke: qStroke, tone: qTone, color: qColor } });
      const drawInkState = (alpha, noPaper) => {
        g.save();
        if (alpha != null && alpha < 1) g.globalAlpha = alpha;
        SK.styles.render(g, inkCfg, noPaper ? Object.assign({}, env2, { noPaper: true }) : env2);
        g.restore();
      };
      const mediaOk = env.media && env.media.el && !env.media.missing;
      if (reveal === 'pour' || reveal === 'split' || reveal === 'splitHold') {
        // paper first (ALWAYS — before the photo starts there must be paper under the ink),
        // then the arriving photo, then the ink lines stay on top of both
        if (env.mode === 'composite' && P.paper !== 'none') SK.styles.drawPaper(g, cfg, P, W, H, env);
        if (mediaOk && qPhoto > 0.001 && reveal !== 'splitHold') {
          SK.reveals.photo(g, qPhoto, reveal, env, null);
        } else if (mediaOk && reveal === 'splitHold') {
          const senv = Object.assign({}, env, { focus: [P.fx == null ? 0.5 : P.fx, 0.42] });
          SK.reveals.photo(g, Math.max(qPhoto, 0.999), 'splitHold', senv, null);
        }
        drawInkState(1, true); // ink OVER the arriving photo — and never repaint the paper
      } else {
        drawInkState(1);
        if (mediaOk && qPhoto > 0.001 && reveal !== 'none') {
          SK.reveals.photo(g, qPhoto, reveal === 'dry' ? 'dry' : reveal, env, drawInkState);
        }
      }
      // drift: subtle push on everything drawn (photo included) — transform trick
      // name line + sub (fields)
      const labelAt = P.labelAt == null ? 2.2 : P.labelAt;
      if (F.label) {
        const q = U.ease.pen(R.ph(lt, labelAt, Math.min(1.6, dur - labelAt)));
        if (q > 0) {
          SK.ann.label(g, F.label, W / 2, (P.labelY == null ? 0.84 : P.labelY) * H, q, {
            size: (P.labelSize || 54) * env.k, color: P.labelColor || '#2c2416', font: P.labelFont || 'kalam', maxW: W * 0.8, underline: false,
          });
          if (F.sub) {
            const q2 = U.ease.pen(R.ph(lt, labelAt + 0.7, Math.min(1.2, dur - labelAt - 0.7)));
            if (q2 > 0) SK.ann.label(g, F.sub, W / 2, (P.labelY == null ? 0.84 : P.labelY) * H + (P.labelSize || 54) * env.k * 1.15, q2, {
              size: (P.labelSize || 54) * env.k * 0.58, color: P.labelColor || '#2c2416', font: P.labelFont || 'kalam', maxW: W * 0.8,
            });
          }
        }
      }
      drawLayers(g, shot, lt, env);
      // archival finishing (composite only)
      if (env.mode === 'composite') {
        if (P.vignette > 0) {
          const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.58);
          rg.addColorStop(0, 'rgba(0,0,0,0)');
          rg.addColorStop(1, `rgba(10,6,2,${0.5 * P.vignette})`);
          g.fillStyle = rg; g.fillRect(0, 0, W, H);
        }
        if (P.frame > 0) {
          g.save();
          g.strokeStyle = `rgba(240,234,214,${0.5 + 0.4 * P.frame})`;
          g.lineWidth = Math.max(2, W * 0.0035);
          const m = Math.max(8, W * 0.03);
          g.strokeRect(m, m, W - 2 * m, H - 2 * m);
          g.strokeStyle = `rgba(30,20,10,${0.4 * P.frame})`;
          g.strokeRect(m * 1.35, m * 1.35, W - 2 * m * 1.35, H - 2 * m * 1.35);
          g.restore();
        }
      }
    },
  });

  // ---------------------------------------------------------------- manuscript
  register({
    id: 'manuscript', name: 'Manuscript page', family: 'Reveal shots',
    desc: 'A full aged page: the illustration draws itself inside a ruled box, then the heading and the body write on by hand.',
    dur: 8,
    fields: [
      { k: 'heading', label: 'शीर्षक (heading)', ph: 'पांडुलिपि' },
      { k: 'body', label: 'मुख्य लिखाई (body)', multi: true, ph: 'एक पंक्ति में एक वाक्य…' },
    ],
    params: [
      { k: 'style', label: 'Illustration style', type: 'select', options: STYLE_OPTS.filter(([, n]) => n.includes('sepia') || true), def: 'manuscript', card: 'STYLE' },
      { k: 'detail', label: 'Edge detail', type: 'range', min: 0, max: 1, step: 0.01, def: 0.52, card: 'STYLE' },
      { k: 'lineWeight', label: 'Line weight', type: 'range', min: 0.4, max: 3, step: 0.05, def: 1, card: 'STYLE' },
      { k: 'tone', label: 'Shading strength', type: 'range', min: 0, max: 1, step: 0.01, def: 1, card: 'STYLE' },
      { k: 'hatchDensity', label: 'Hatch density', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, card: 'STYLE' },
      { k: 'drawDur', label: 'Illustration draws for (s)', type: 'range', min: 0.5, max: 12, step: 0.1, def: 3.6, card: 'ANIMATION' },
      { k: 'order', label: 'Stroke order', type: 'select', options: ORDER_OPTS, def: 'natural', card: 'ANIMATION' },
      { k: 'textAt', label: 'Writing starts at (s)', type: 'range', min: 0, max: 12, step: 0.1, def: 3.4, card: 'ANIMATION' },
      { k: 'writeSpeed', label: 'Writing speed', type: 'range', min: 0.4, max: 3, step: 0.05, def: 1, card: 'ANIMATION' },
      { k: 'burn', label: 'Edge burn', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5, card: 'PAPER' },
      { k: 'stains', label: 'Stains', type: 'range', min: 0, max: 1, step: 0.01, def: 0.8, card: 'PAPER' },
      { k: 'border', label: 'Ornamental border', type: 'range', min: 0, max: 1, step: 0.01, def: 1, card: 'PAPER' },
      { k: 'hand', label: 'Handwriting font', type: 'select', options: T.FONT_OPTIONS, def: 'kalam', card: 'LABELS' },
      { k: 'inkColor', label: 'Ink colour', type: 'color', def: '#4a3018', card: 'LABELS' },
      { k: 'headingSize', label: 'Heading size', type: 'range', min: 30, max: 140, step: 1, def: 78, card: 'LABELS' },
      { k: 'bodySize', label: 'Body size', type: 'range', min: 20, max: 80, step: 1, def: 40, card: 'LABELS' },
    ],
    draw(g, shot, lt, env) {
      const P = env.P, F = env.F, { W, H, fw, fh, k } = env;
      // parchment
      if (env.mode === 'composite') {
        g.drawImage(SK.paper.get('parchment', P.seed || 7, W, H, { stains: P.stains == null ? 0.8 : P.stains, burn: P.burn == null ? 0.5 : P.burn }), 0, 0);
        if (P.border > 0.05) { // double ruled border + corner dots
          const m = fw * 0.045, m2 = fw * 0.06;
          g.save();
          g.scale(k, k);
          g.strokeStyle = `rgba(74,48,24,${0.75 * P.border})`;
          g.lineWidth = 3.2;
          g.strokeRect(m, m, fw - 2 * m, fh - 2 * m);
          g.lineWidth = 1.2;
          g.strokeRect(m2, m2, fw - 2 * m2, fh - 2 * m2);
          g.fillStyle = `rgba(140,60,30,${0.6 * P.border})`;
          for (const [cx, cy] of [[m, m], [fw - m, m], [m, fh - m], [fw - m, fh - m]]) {
            g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
            g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
          }
          g.restore();
        }
      }
      // illustration box (upper half) — generous, like a real miniature
      const styleId = P.style || 'manuscript';
      const cfg = SK.styles.byId[styleId] || SK.styles.byId.manuscript;
      const bx = fw * 0.14, by = fh * 0.10, bw = fw * 0.72, bh = fh * 0.46;
      const box = SK.gfx.tmp('msBox', W, H), bg = box.getContext('2d');
      const drawIllu = (gg) => {
        gg.setTransform(1, 0, 0, 1, 0, 0);
        gg.clearRect(0, 0, W, H);
        if (!env.ana || !env.ana.data || !env.ana.data.W) return;
        const data = env.ana.data, ak = W / data.W;
        const qS = SK.reveals.ph(lt, 0, (P.drawDur || 3.6) * 0.82, 'pen');
        const qT = SK.reveals.ph(lt, (P.drawDur || 3.6) * 0.3, (P.drawDur || 3.6) * 0.62);
        const seed0 = P.seed != null ? P.seed : (env.seed || 7);
        const drawn = SK.ink.budget(data.strokes, P.order || 'natural', qS, seed0, data.focus);
        gg.save();
        gg.beginPath();
        gg.rect(bx * k, by * k, bw * k, bh * k);
        gg.clip();
        for (const [si] of drawn) {
          const s = data.strokes[si];
          SK.ink.stroke(gg, s.p, ak, { width: cfg.ink.width * 1.35 * (P.lineWeight || 1), wobble: cfg.ink.wobble, pressure: cfg.ink.pressure, seed: (seed0 * 31 + si) | 0, color: cfg.ink.color, style: cfg.ink.style });
        }
        if (cfg.iso && data.hatch) {
          cfg.iso.levels.forEach((bi, i) => {
            const lines = data.hatch[bi] || [];
            const lq = U.clamp(qT * cfg.iso.levels.length - i);
            const n = Math.floor(lines.length * lq);
            for (let j = 0; j < n; j++) SK.ink.seg(gg, lines[j], ak, { color: cfg.iso.color, width: cfg.iso.width, wobble: 0.3, seed: seed0 + bi * 97 + j, alpha: cfg.iso.alpha * (P.tone == null ? 1 : P.tone) });
          });
        }
        gg.restore();
      };
      drawIllu(bg);
      g.drawImage(box, 0, 0);
      // ruled frame around the illustration, draws on quickly
      const fq = U.ease.out(SK.reveals.ph(lt, 0.15, 0.9));
      if (fq > 0) {
        g.save();
        g.scale(k, k);
        g.strokeStyle = P.inkColor || '#4a3018';
        g.lineWidth = 2.4; g.lineCap = 'round';
        const peri = 2 * (bw + bh), drawn = fq * peri;
        g.beginPath();
        g.moveTo(bx, by);
        let acc = 0, px = bx, py = by;
        // walk the perimeter; the last leg overshoots LEFT along the top edge (hand style)
        const corners = [[bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx - bw * 0.05, by]];
        for (const [nx, ny] of corners) {
          if (acc >= drawn) break;
          const segL = Math.hypot(nx - px, ny - py);
          if (acc + segL <= drawn) { g.lineTo(nx, ny); acc += segL; px = nx; py = ny; }
          else { const t = (drawn - acc) / segL; g.lineTo(px + (nx - px) * t, py + (ny - py) * t); acc = drawn; }
        }
        g.stroke();
        g.restore();
      }
      // heading + body write on
      const textAt = P.textAt == null ? 3.4 : P.textAt;
      const spd = P.writeSpeed || 1;
      if (F.heading) {
        const q = U.ease.pen(SK.reveals.ph(lt, textAt, 1.1 / spd));
        if (q > 0) SK.ann.label(g, F.heading, W / 2, H * 0.60, q, { size: (P.headingSize || 78) * k, color: P.inkColor || '#4a3018', font: P.hand || 'kalam', maxW: W * 0.7 });
      }
      if (F.body) {
        const lines = String(F.body).split('\n').filter(Boolean);
        const bs = (P.bodySize || 40) * k;
        const t0 = textAt + (F.heading ? 1.0 : 0) / spd;
        lines.forEach((ln, i) => {
          const q = U.ease.pen(SK.reveals.ph(lt, t0 + i * (1.35 / spd) / Math.max(0.6, spd), (1.3 / spd)));
          if (q > 0) SK.ann.label(g, ln, W / 2, H * 0.68 + i * bs * 1.65, q, { size: bs, color: P.inkColor || '#4a3018', font: P.hand || 'kalam', maxW: W * 0.74 });
        });
      }
      drawLayers(g, shot, lt, env);
    },
  });

  // ---------------------------------------------------------------- roto
  register({
    id: 'roto', name: 'Video rotoscope', family: 'Video',
    desc: 'A video clip redrawn as line art — stable (no flicker) or with the deliberate hand-drawn "boiling line" at 8–12 fps. Posterised cel look available.',
    dur: 6,
    fields: [],
    params: [
      { k: 'roto', label: 'Treatment', type: 'select', options: SK.roto.MODES, def: 'ink', card: 'STYLE' },
      { k: 'boil', label: 'Boil (fps, 0 = stable)', type: 'range', min: 0, max: 14, step: 1, def: 10, card: 'STYLE' },
      { k: 'detail', label: 'Edge detail', type: 'range', min: 0, max: 1, step: 0.01, def: 0.58, card: 'STYLE' },
      { k: 'lineWeight', label: 'Line weight', type: 'range', min: 0.4, max: 3, step: 0.05, def: 1, card: 'STYLE' },
      { k: 'celLevels', label: 'Cel colour levels', type: 'range', min: 2, max: 8, step: 1, def: 4, card: 'STYLE' },
      { k: 'fade', label: 'Fade in from paper', type: 'range', min: 0, max: 1, step: 0.01, def: 0, card: 'ANIMATION' },
    ],
    draw(g, shot, lt, env) {
      const P = env.P, { W, H } = env;
      if (P.fade > 0) {
        g.save();
        g.globalAlpha = SK.reveals.ph(lt, 0, 0.8);
        SK.roto.render(g, env);
        g.restore();
      } else {
        SK.roto.render(g, env);
      }
      drawLayers(g, shot, lt, env);
    },
  });

  return { byId, list, register };
})();
