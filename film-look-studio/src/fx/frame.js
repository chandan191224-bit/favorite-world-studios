// Frame & grade: letterbox bars, vignettes, and the four exportable looks — teal & orange,
// war documentary, warm history, bleach bypass. Grade effects return plain FL.grade settings
// (the same numbers drive the preview, the render and the .cube LUT export); the overlays are
// nothing but gradients and strokes — no per-pixel work anywhere in this family.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;

  // ---------- teal & orange (grade) ----------
  // Highlights ride a little lighter than the shadows (0.30 at the 0.35 default split).
  const TEAL_HI = 0.3 / 0.35;
  register({
    id: 'teal', name: 'Teal & orange', family: 'frame', kind: 'grade',
    desc: 'The modern documentary film look: teal shadows, warm orange skin tones.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.color('shadows', 'Shadow tint', '#2E6A5E'),
      P.color('highlights', 'Highlight tint', '#FFB36B'),
      P.range('split', 'Split-tone depth', 0, 0.6, 0.05, 0.35, 'How hard the shadows and highlights are tinted'),
      P.range('punch', 'Punch', 0, 0.3, 0.01, 0.12, 'S-curve contrast around the pivot'),
      P.range('sat', 'Saturation', 0.8, 1.3, 0.01, 1.05),
    ],
    grade(P) {
      const split = U.clamp(P.split, 0, 0.6);
      return {
        amount: U.clamp(P.amount, 0, 1),
        shadowColor: P.shadows, shadowAmt: split,
        highColor: P.highlights, highAmt: split * TEAL_HI,
        sat: P.sat, contrast: P.punch, pivot: 0.42,
      };
    },
  });
  preset('teal-film', 'Teal & orange: film look', 'teal', {});
  preset('teal-strong', 'Teal & orange: strong', 'teal', { amount: 1, split: 0.5 });
  preset('teal-soft', 'Teal & orange: gentle', 'teal', { amount: 0.6 });

  // ---------- war documentary (grade) ----------
  register({
    id: 'wardoc', name: 'War documentary', family: 'frame', kind: 'grade',
    desc: 'Desaturated combat-archive grade; blood and fire stay warm while the world goes grey.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('desat', 'Desaturation', 0.25, 0.8, 0.01, 0.45, 'Colour left in the picture — lower is greyer'),
      P.range('bloodfire', 'Blood & fire', 0, 0.7, 0.05, 0.35, 'Keeps reds and oranges warm while everything else goes grey'),
      P.range('grit', 'Grit', 0, 0.4, 0.01, 0.2, 'Hard contrast with crushed blacks'),
      P.range('temp', 'Temperature', -0.4, 0.2, 0.05, -0.1),
    ],
    grade(P) {
      return {
        amount: U.clamp(P.amount, 0, 1),
        sat: P.desat,
        contrast: P.grit,
        crush: Math.min(0.5, P.grit * 1.5),  // crush tied to grit: 0.3 at the 0.2 default, capped 0.5
        temp: P.temp,
        shadowColor: '#3A4A4A', shadowAmt: 0.25,
        redBoost: P.bloodfire,
        fade: 0.15,
      };
    },
  });
  preset('wardoc-classic', 'War documentary: desaturated', 'wardoc', {});
  preset('wardoc-gritty', 'War documentary: gritty', 'wardoc', { grit: 0.4, bloodfire: 0.5 });
  preset('wardoc-bleak', 'War documentary: bleak winter', 'wardoc', { desat: 0.3, temp: -0.2 });

  // ---------- warm history (grade) ----------
  register({
    id: 'warmh', name: 'Warm history', family: 'frame', kind: 'grade',
    desc: 'Golden nostalgia for history and heritage films: amber warmth, soft blacks.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('warmth', 'Warmth', 0, 0.6, 0.05, 0.3),
      P.range('gold', 'Golden highlights', 0, 0.5, 0.05, 0.28),
      P.range('fade', 'Faded blacks', 0, 0.4, 0.05, 0, 'Milky lifted blacks for a softer feel'),
    ],
    grade(P) {
      return {
        amount: U.clamp(P.amount, 0, 1),
        temp: P.warmth,
        highColor: '#FFD9A0', highAmt: P.gold,
        sat: 0.85, lift: 0.04, contrast: 0.08,
        fade: P.fade,
      };
    },
  });
  preset('warmh-history', 'Warm history: golden', 'warmh', {});
  preset('warmh-heritage', 'Warm history: heritage soft', 'warmh', { fade: 0.35 });
  preset('warmh-evening', 'Warm history: evening amber', 'warmh', { warmth: 0.5 });

  // ---------- bleach bypass (grade) ----------
  register({
    id: 'bleachb', name: 'Bleach bypass', family: 'frame', kind: 'grade',
    desc: 'Silvery skip-processed archive look: harsh contrast, most of the colour gone.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('silver', 'Silver', 0, 1, 0.05, 0.55, 'Silvery desaturation of the bleach skip'),
      P.range('harsh', 'Harsh contrast', 0.1, 0.5, 0.05, 0.3),
    ],
    grade(P) {
      return { amount: U.clamp(P.amount, 0, 1), bleach: P.silver, contrast: P.harsh, sat: 0.55 };
    },
  });
  preset('bleachb-film', 'Bleach bypass: silvery', 'bleachb', {});
  preset('bleachb-war', 'Bleach bypass: war film', 'bleachb', { silver: 0.75, harsh: 0.4 });
  preset('bleachb-light', 'Bleach bypass: light touch', 'bleachb', { amount: 0.6 });

  // ---------- vignette (overlay) ----------
  // rounded-rect path built with arcTo (works everywhere; no ctx.roundRect dependency)
  function rrect(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  register({
    id: 'vignette', name: 'Vignette', family: 'frame',
    desc: 'Darkened corners: a soft oval lens falloff or a hard gate rectangle, in any colour.',
    params: [
      P.range('strength', 'Corner strength', 0, 0.8, 0.05, 0.3),
      P.range('start', 'Falloff starts', 0.35, 0.85, 0.05, 0.6, 'How far out the darkening begins (fraction of the half-diagonal)'),
      P.select('shape', 'Shape', [['oval', 'Oval (lens)'], ['rect', 'Rectangle (gate)']], 'oval'),
      P.color('color', 'Colour', '#000000'),
    ],
    draw(g, P, e) {
      const { W, H } = e, str = P.strength;
      if (str <= 0.01) return;
      if (P.shape === 'rect') {
        // gate: a soft inner-shadow band just inside the frame, corners rounded.
        // n nested strokes of one low alpha approximate an exponential falloff:
        // darkening = 1 - (1-strength)^(1 - depth/D) — full strength at the frame edge.
        const mn = Math.min(W, H);
        const rad = mn * 0.16;
        const D = mn * U.lerp(0.28, 0.06, U.range(P.start, 0.35, 0.85));  // later start = shallower band
        const n = 12, a = 1 - Math.pow(1 - str, 1 / n);
        g.lineJoin = 'round';
        g.strokeStyle = U.rgba(P.color, a);
        g.beginPath();
        rrect(g, 0, 0, W, H, rad);
        for (let i = 1; i <= n; i++) { g.lineWidth = 2 * D * i / n; g.stroke(); }
        return;
      }
      // oval: elliptical radial gradient in a scaled space; clear centre, cosine-ish falloff
      // (smoothstep via intermediate stops), full strength at the frame corners.
      // Semi-axes 0.75W / 0.75H keep it aspect-invariant: the corner always sits at the
      // same fraction of the gradient on any canvas.
      const rx = W * 0.75, ry = H * 0.75;
      const dc = Math.hypot(W / 2 / rx, H / 2 / ry);   // corner distance in ellipse units
      const r0 = U.clamp(P.start, 0.35, 0.85) * dc;    // falloff begins here
      const hw = W / 2 / rx, hh = H / 2 / ry;
      g.save();
      g.translate(W / 2, H / 2); g.scale(rx, ry);
      const gr = g.createRadialGradient(0, 0, r0, 0, 0, dc);
      gr.addColorStop(0, U.rgba(P.color, 0));
      gr.addColorStop(0.25, U.rgba(P.color, str * 0.16));
      gr.addColorStop(0.5, U.rgba(P.color, str * 0.5));
      gr.addColorStop(0.75, U.rgba(P.color, str * 0.84));
      gr.addColorStop(1, U.rgba(P.color, str));
      g.fillStyle = gr;
      g.fillRect(-hw - 0.02, -hh - 0.02, hw * 2 + 0.04, hh * 2 + 0.04);
      g.restore();
    },
  });
  preset('vignette-soft', 'Vignette: soft lens', 'vignette', {});
  preset('vignette-heavy', 'Vignette: heavy projector oval', 'vignette', { strength: 0.65, start: 0.4 });
  preset('vignette-warm', 'Vignette: warm edge', 'vignette', { color: '#2a1408' });
  preset('vignette-rect', 'Vignette: gate rectangle', 'vignette', { shape: 'rect' });

  // ---------- letterbox (overlay) ----------
  const BARS = { '2.35': 0.106, '2': 0.125, '1.85': 0.073, '1.66': 0.051 };  // each bar, fraction of H
  register({
    id: 'letterbox', name: 'Letterbox', family: 'frame',
    desc: 'Cinema bars top and bottom — 2.35:1 for film, 2:1 for broadcast; optional slide-in.',
    params: [
      P.select('ratio', 'Ratio', [['2.35', '2.35:1 (cinema)'], ['2', '2:1 (broadcast)'], ['1.85', '1.85:1 (US film)'], ['1.66', '1.66:1 (European)']], '2.35'),
      P.range('slide', 'Slide-in', 0, 1, 0.05, 0, 'Seconds for the bars to grow in from the frame edges'),
      P.color('color', 'Bar colour', '#000000'),
    ],
    draw(g, P, e) {
      const { W, H, lt, dur } = e;
      const frac = BARS[P.ratio] != null ? BARS[P.ratio] : 0.106;
      let bh = H * frac;
      if (P.slide > 0.01) {
        // one-shot intro on a continuous layer: ease.out, always finished by p≈0.9
        const T = Math.max(0.05, Math.min(P.slide, dur * 0.9));
        bh *= U.ease.out(U.clamp(lt / T));
      }
      bh = Math.round(bh);
      if (bh < 1) return;
      g.fillStyle = P.color;
      g.fillRect(0, 0, W, bh);
      g.fillRect(0, H - bh, W, bh);
    },
  });
  preset('letterbox-cinema', 'Letterbox: 2.35:1 cinema', 'letterbox', {});
  preset('letterbox-2', 'Letterbox: 2:1 broadcast', 'letterbox', { ratio: '2' });
  preset('letterbox-185', 'Letterbox: 1.85:1', 'letterbox', { ratio: '1.85' });
  preset('letterbox-slide', 'Letterbox: 2.35:1 sliding in', 'letterbox', { slide: 1 });
  preset('letterbox-warm', 'Letterbox: 2.35:1 warm', 'letterbox', { color: '#1a0e06' });
})();
