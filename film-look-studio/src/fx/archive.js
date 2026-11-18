// Archival: the old-photo family. Three exportable grades (sepia, faded colour stock, silver
// B&W — plain FL.grade settings, so the same numbers drive the preview, the render and the
// .cube LUT export) and two picture processes (newspaper halftone screen, aged photo print).
// Everything is deterministic from the layer seed. The halftone screens are cached 64×64
// dot-phase tiles with U.h2 jitter baked in, and the old-print colour work happens on low-res
// fields — no effect here ever reads pixels at full resolution.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;

  // FL.grade only parses '#rrggbb', so colour maths has to round-trip through hex.
  const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, t) => {
    const A = U.hexRgb(a), B = U.hexRgb(b);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };

  // ---------- sepia (grade) ----------
  // mono:1 runs the luma through the toneDark → toneLight ramp. `warmth` adds temp and also
  // leans the highlight tone itself golden — temp alone barely shows once colour is toned away.
  register({
    id: 'sepia', name: 'Sepia print', family: 'archive', kind: 'grade',
    desc: 'Warm toned monochrome, like an old album photograph. Deepen for the archive-box look.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('warmth', 'Warmth', 0, 1, 0.05, 1, 'How golden the tone runs'),
      P.range('depth', 'Fade depth', 0, 0.5, 0.01, 0.25, 'Milky, faded blacks'),
      P.color('tone', 'Highlight tone', '#f0e2c8'),
    ],
    grade(P) {
      const w = U.clamp(P.warmth, 0, 1), d = U.clamp(P.depth, 0, 0.5), c = U.hexRgb(P.tone);
      return {
        amount: U.clamp(P.amount, 0, 1),
        sat: 0, mono: 1,
        toneDark: '#241a10',
        toneLight: toHex(c[0] * (1 + 0.12 * w), c[1] * (1 + 0.02 * w), c[2] * (1 - 0.14 * w)),
        temp: 0.35 * w,
        fade: d,
        lift: 0.02 + d * 0.04,       // 0.03 at the default depth
        contrast: 0.15,
      };
    },
  });
  preset('sepia-classic', 'Sepia: classic warm', 'sepia', {});
  preset('sepia-deep', 'Sepia: deep album', 'sepia', { depth: 0.42, tone: '#d8c8a8' });
  preset('sepia-light', 'Sepia: light golden', 'sepia', { warmth: 0.75, depth: 0.08, tone: '#f4ead2' });

  // ---------- faded colour stock (grade) ----------
  // Lifted blacks #1A1612-ish, highlights capped near #F0EAD8, teal shadows / cream highlights,
  // a slight green-cyan cast. `cast` swings it to the warm 1970s orange end (and warms the
  // highlight split-tone with it); `liftAmt` drives the lift and the milky fade together.
  register({
    id: 'faded', name: 'Faded colour stock', family: 'archive', kind: 'grade',
    desc: 'Washed-out old colour film: lifted blacks, teal shadows, cream highlights.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('liftAmt', 'Lifted blacks', 0, 0.08, 0.002, 0.045, 'How milky the blacks sit'),
      P.range('desat', 'Saturation', 0.4, 1, 0.01, 0.65),
      P.range('warmteal', 'Teal in shadows', 0, 0.5, 0.01, 0.3),
      P.range('cast', 'Colour cast', -1, 1, 0.05, 0, 'Cool green-cyan ↔ warm 1970s orange'),
    ],
    grade(P) {
      const lift = U.clamp(P.liftAmt, 0, 0.08), cast = U.clamp(P.cast, -1, 1);
      return {
        amount: U.clamp(P.amount, 0, 1),
        sat: U.clamp(P.desat, 0.4, 1),
        lift, fade: Math.min(0.5, lift * 5.6),      // 0.25 of fade at the default lift
        gain: 0.97,                                  // caps the highlights
        temp: -0.05 + cast * 0.3, tint: -0.06,
        shadowColor: '#2E6A5E', shadowAmt: U.clamp(P.warmteal, 0, 0.5),
        highColor: cast > 0 ? mixHex('#F4E4C0', '#f4dcb0', cast) : '#F4E4C0',
        highAmt: 0.25,
      };
    },
  });
  preset('faded-stock', 'Faded: old colour stock', 'faded', {});
  preset('faded-memory', 'Faded: washed-out memory', 'faded', { liftAmt: 0.08, desat: 0.5 });
  preset('faded-seventies', 'Faded: 1970s orange', 'faded', { cast: 1 });

  // ---------- silver B&W (grade) ----------
  // mono:1 through #0A0A0A → toneLight keeps the whites silvery (or warm paper) instead of
  // clipping to pure white; crush and bleach sit after the tone ramp for hard newsprint grit.
  register({
    id: 'silver', name: 'Silver B&W', family: 'archive', kind: 'grade',
    desc: 'Classic black-and-white print: crushed blacks, silvery whites, optional bleach grit.',
    params: [
      P.range('amount', 'Strength', 0, 1, 0.05, 1),
      P.range('contrast', 'Contrast', 0, 0.8, 0.05, 0.3),
      P.range('crush', 'Crush blacks', 0, 0.7, 0.05, 0.35),
      P.range('bleach', 'Silvery bleach', 0, 1, 0.05, 0, 'Bleach-bypass grit for harsh newsprint'),
      P.color('silverTint', 'Paper whites', '#E8E8E8'),
    ],
    grade(P) {
      return {
        amount: U.clamp(P.amount, 0, 1),
        sat: 0, mono: 1,
        toneDark: '#0A0A0A', toneLight: P.silverTint,
        contrast: U.clamp(P.contrast, 0, 0.8), crush: U.clamp(P.crush, 0, 0.7),
        bleach: U.clamp(P.bleach, 0, 1),
      };
    },
  });
  preset('silver-bw', 'Silver: classic B&W', 'silver', {});
  preset('silver-newsprint', 'Silver: harsh newsprint', 'silver', { contrast: 0.45, bleach: 0.35 });
  preset('silver-warm', 'Silver: warm paper', 'silver', { silverTint: '#EDE4D0' });

  // ---------- halftone (process) ----------
  // A newspaper screen is a rotated lattice of dot centres. The lattice basis is snapped to
  // vectors that divide 64 px exactly, so one cached 64×64 tile of quantised
  // squared-distance-to-nearest-centre (the dot phase field, with U.h2 per-centre jitter)
  // tiles the plane seamlessly. The render loop then does a single tile lookup per pixel —
  // no trig, no hashing — at half resolution, upscaled with smoothing off for crisp dots.
  const HT_INK = 206.63;   // coverage A turns ink when field < A * HT_INK (r = 0.72·√A cells)
  function screenTile(deg, pitch, seed) {
    const rad = deg * Math.PI / 180, co = Math.cos(rad), si = Math.sin(rad);
    const snap = v => {
      if (Math.abs(v) < 1e-9) return 0;
      const sg = v < 0 ? -1 : 1; v *= sg;
      if (v > 32) v = 32;
      return sg * 64 / Math.max(1, Math.round(64 / v));
    };
    const v1x = snap(pitch * co), v1y = snap(pitch * si), v2x = snap(-pitch * si), v2y = snap(pitch * co);
    const pe = Math.hypot(v1x, v1y) || pitch, pe2 = pe * pe;
    // collect the distinct centres on the 64×64 torus (deduped at 1/4 px, jitter per centre)
    const M = Math.min(72, Math.ceil(64 / pe) + 2), centres = new Map();
    for (let m = -M; m <= M; m++) for (let n = -M; n <= M; n++) {
      const x = (((m * v1x + n * v2x) % 64) + 64) % 64, y = (((m * v1y + n * v2y) % 64) + 64) % 64;
      const qx = Math.round(x * 4) & 255, qy = Math.round(y * 4) & 255, key = (qx << 8) | qy;
      if (!centres.has(key)) centres.set(key, [x, y,
        (U.h2(qx, qy, seed) - 0.5) * 0.12 * pe, (U.h2(qx, qy, seed + 977) - 0.5) * 0.12 * pe]);
    }
    const t = new Uint8Array(64 * 64); t.fill(255);
    const R = Math.min(31, Math.ceil(0.86 * pe + 1.5));
    for (const [x, y, jx, jy] of centres.values()) {
      const cx = Math.round(x), cy = Math.round(y), fx = cx - x, fy = cy - y;
      for (let oy = -R; oy <= R; oy++) {
        const dy = oy + fy - jy, dy2 = dy * dy, row = ((cy + oy) & 63) << 6;
        for (let ox = -R; ox <= R; ox++) {
          const dx = ox + fx - jx, d2 = (dx * dx + dy2) / pe2;
          if (d2 >= 0.64) continue;
          const f = (d2 * 398.44) | 0, idx = row | ((cx + ox) & 63);
          if (f < t[idx]) t[idx] = f;
        }
      }
    }
    return t;
  }
  function screenTiles(mode, pitch, seed) {
    return U.cache('ht-tile|' + mode + '|' + pitch.toFixed(3) + '|' + seed, () => {
      const angles = mode === 'cmy' ? [15, 75, 0, 45] : [45];   // C M Y K screens
      return angles.map((deg, i) => screenTile(deg, pitch, seed + 17 + i * 1013));
    });
  }
  // Pre-blended CMYK overlaps on warm paper (bit 0 Y, 1 M, 2 C, 3 K). Dots within one screen
  // never overlap, so a pixel's colour only depends on which screens dot it — and the inks can
  // print at lower per-channel alpha than the solid mono ink.
  const CMY_COMBOS = (() => {
    const paper = [244, 241, 230];
    const inks = [[250, 218, 34], [226, 28, 130], [16, 158, 218], [17, 15, 14]];
    const alphas = [0.82, 0.82, 0.82, 0.95];
    const out = new Uint8Array(16 * 3);
    for (let m = 0; m < 16; m++) {
      let r = paper[0], g = paper[1], b = paper[2];
      for (let k = 0; k < 4; k++) if (m & (1 << k)) {
        r += (inks[k][0] - r) * alphas[k]; g += (inks[k][1] - g) * alphas[k]; b += (inks[k][2] - b) * alphas[k];
      }
      out[m * 3] = r; out[m * 3 + 1] = g; out[m * 3 + 2] = b;
    }
    return out;
  })();
  register({
    id: 'halftone', name: 'Halftone print', family: 'archive', kind: 'process',
    desc: 'Newspaper dot screen printed over the picture: mono 45° newsprint or CMY colour separations.',
    params: [
      P.select('mode', 'Screen', [['mono', 'Mono (45° newsprint)'], ['cmy', 'CMY colour print']], 'mono'),
      P.range('cell', 'Dot pitch', 2, 16, 0.5, 4, 'Cell size in px at 1080p'),
      P.range('amount', 'Amount', 0, 1, 0.05, 0.6, '0.6 keeps the picture readable under the print'),
      P.range('contrast', 'Dot gain', 0.5, 2, 0.05, 1, 'How hard mid-tones fill into solid dots'),
    ],
    process(g, P, e) {
      const { W, H, S, seed } = e, amt = U.clamp(P.amount, 0, 1);
      if (amt <= 0.002) return;
      const cmy = P.mode === 'cmy';
      const pitch = Math.max(1, P.cell * S * 0.5);   // cell px at 1080, halved into the W/2 grid
      const hw = Math.max(2, Math.round(W / 2)), hh = Math.max(2, Math.round(H / 2));
      // sample the picture at half resolution only
      const src = e.src();
      const sc = U.tmp('ht-src', hw, hh), sg = sc.getContext('2d', { willReadFrequently: true });
      sg.globalCompositeOperation = 'copy'; sg.drawImage(src, 0, 0, hw, hh); sg.globalCompositeOperation = 'source-over';
      const sd = sg.getImageData(0, 0, hw, hh).data;
      const tiles = screenTiles(P.mode, pitch, seed);
      const oc = U.tmp('ht-out', hw, hh), og = oc.getContext('2d');
      const img = U.cache('ht-img|' + hw + 'x' + hh, () => og.createImageData(hw, hh)), d = img.data;
      const con = U.clamp(P.contrast, 0.5, 2) / 255, K = HT_INK;
      if (!cmy) {
        const t = tiles[0];
        let p = 0;
        for (let y = 0; y < hh; y++) {
          const row = (y & 63) << 6;
          for (let x = 0; x < hw; x++, p += 4) {
            const xi = x & 63;
            const a = (255 - (0.2126 * sd[p] + 0.7152 * sd[p + 1] + 0.0722 * sd[p + 2])) * con;
            if (a <= 0.004 || (a < 1.22 && t[row | xi] >= a * K)) {
              d[p] = 244; d[p + 1] = 241; d[p + 2] = 230;      // warm newsprint paper
            } else {
              d[p] = 27; d[p + 1] = 25; d[p + 2] = 21;         // soft ink black
            }
            d[p + 3] = 255;
          }
        }
      } else {
        const tC = tiles[0], tM = tiles[1], tY = tiles[2], tK = tiles[3];
        let p = 0;
        for (let y = 0; y < hh; y++) {
          const row = (y & 63) << 6;
          for (let x = 0; x < hw; x++, p += 4) {
            const xi = x & 63;
            let cA = (255 - sd[p]) * con, mA = (255 - sd[p + 1]) * con, yA = (255 - sd[p + 2]) * con;
            let kA = cA < mA ? cA : mA; if (yA < kA) kA = yA;  // under-colour removal → the K screen
            let mask = 0;
            if (kA > 0.004) {
              if (kA >= 1.22 || tK[row | xi] < kA * K) mask = 8;
              cA -= kA; mA -= kA; yA -= kA;
            }
            if (cA > 0.004 && (cA >= 1.22 || tC[row | xi] < cA * K)) mask |= 4;
            if (mA > 0.004 && (mA >= 1.22 || tM[row | xi] < mA * K)) mask |= 2;
            if (yA > 0.004 && (yA >= 1.22 || tY[row | xi] < yA * K)) mask |= 1;
            const o = mask * 3;
            d[p] = CMY_COMBOS[o]; d[p + 1] = CMY_COMBOS[o + 1]; d[p + 2] = CMY_COMBOS[o + 2]; d[p + 3] = 255;
          }
        }
      }
      og.putImageData(img, 0, 0);
      g.save();
      g.imageSmoothingEnabled = false;   // crisp dots through the 2× upscale
      g.globalAlpha = amt;
      g.drawImage(oc, 0, 0, W, H);
      g.restore();
    },
  });
  preset('halftone-newsprint', 'Halftone: newsprint mono', 'halftone', { cell: 4 });
  preset('halftone-newspaper-photo', 'Halftone: newspaper photo', 'halftone', { cell: 6, amount: 1, contrast: 1.05 });
  preset('halftone-screenprint', 'Halftone: coarse screen print', 'halftone', { cell: 12, contrast: 1.8 });
  preset('halftone-cmy', 'Halftone: CMY colour print', 'halftone', { mode: 'cmy', cell: 5, amount: 0.85 });

  // ---------- old photo print (process) ----------
  // Not a grade: soft focus, a yellowed-paper tint field whose shadows cross over toward cyan
  // (aged print chemistry — this is what gives the 1970s preset its cool shadows), a white
  // veil, seeded foxing blotches painted at 1/8 resolution, and faded edges.
  register({
    id: 'oldphoto', name: 'Old photo print', family: 'archive', kind: 'process',
    desc: 'An aged photographic print: yellowed paper, soft focus, foxing stains, faded edges.',
    params: [
      P.range('age', 'Age', 0, 1, 0.05, 0.75),
      P.color('tint', 'Paper tint', '#E8D9B0'),
      P.range('fox', 'Foxing stains', 0, 1, 0.05, 0.5),
      P.range('soft', 'Soft focus', 0, 1, 0.05, 0.5),
      P.range('veil', 'White veil', 0, 0.15, 0.005, 0.05),
    ],
    process(g, P, e) {
      const { W, H, S, seed } = e, age = U.clamp(P.age, 0, 1);
      if (age <= 0.002) return;
      const fox = U.clamp(P.fox, 0, 1), soft = U.clamp(P.soft, 0, 1), veil = U.clamp(P.veil, 0, 0.15);
      const src = e.src();
      // slight soft focus — 1–2 px at 1080 through the param
      let base = src;
      if (soft > 0.02) {
        const softC = U.tmp('op-soft', W, H); U.ctx2(softC);
        U.blurInto(softC, src, (1.4 + 2.6 * soft) * S * age, 'op-soften');
        g.drawImage(softC, 0, 0);
        base = softC;
      }
      // paper tint as a low-res field: the picture keeps its detail, the stain stays chemical.
      // 15–30% mix toward the tint in the highlights, drifting cyan in the shadows.
      const tw = Math.max(2, Math.round(W / 4)), th = Math.max(2, Math.round(H / 4));
      const tc = U.tmp('op-tint', tw, th), tg = tc.getContext('2d', { willReadFrequently: true });
      tg.globalCompositeOperation = 'copy'; tg.drawImage(base, 0, 0, tw, th); tg.globalCompositeOperation = 'source-over';
      const img = tg.getImageData(0, 0, tw, th), td = img.data;
      const c = U.hexRgb(P.tint), mixA = 0.32 * age;
      for (let p = 0; p < td.length; p += 4) {
        const l = (0.2126 * td[p] + 0.7152 * td[p + 1] + 0.0722 * td[p + 2]) / 255;
        const cw = 0.8 * (1 - U.smooth(U.clamp((l - 0.1) / 0.28)));   // 1 in deep shadows → 0 in mids
        td[p] = c[0] + (127 - c[0]) * cw;
        td[p + 1] = c[1] + (179 - c[1]) * cw;
        td[p + 2] = c[2] + (198 - c[2]) * cw;
        td[p + 3] = 255 * mixA * (1 + 0.5 * cw);
      }
      tg.putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(tc, 0, 0, W, H);
      // faint white veil — the gentle contrast loss of an old print
      if (veil > 0.002) { g.fillStyle = U.rgba('#fffbf0', veil * age); g.fillRect(0, 0, W, H); }
      // foxing: 6–14 seeded brown blotches, 1–4% of S, soft because they are painted small
      const nFox = Math.round(14 * fox);
      if (nFox > 0) {
        const fw = Math.max(2, Math.round(W / 8)), fh = Math.max(2, Math.round(H / 8)), k = fw / W;
        const fc = U.tmp('op-fox', fw, fh), fg = U.ctx2(fc);
        for (let i = 0; i < nFox; i++) {
          const r0 = U.h1(i, seed), r1 = U.h1(i, seed + 1), r2 = U.h1(i, seed + 2), r3 = U.h1(i, seed + 3), r4 = U.h1(i, seed + 4);
          const rad = (6 + 18 * r2) * S * k;
          const col = r4 < 0.55 ? '#8a6a3a' : r4 < 0.85 ? '#6d5330' : '#9a7038';
          const a = (0.08 + 0.12 * r3) * age * (0.6 + 0.4 * fox);
          fg.save(); fg.translate(r0 * fw, r1 * fh); fg.rotate(r3 * Math.PI); fg.scale(1, 0.55 + r4 * 0.55);
          const gr = fg.createRadialGradient(0, 0, 0, 0, 0, rad);
          gr.addColorStop(0, U.rgba(col, a));
          gr.addColorStop(0.45, U.rgba(col, a * 0.55));
          gr.addColorStop(1, U.rgba(col, 0));
          fg.fillStyle = gr; fg.fillRect(-rad, -rad, rad * 2, rad * 2);
          fg.restore();
        }
        g.drawImage(fc, 0, 0, W, H);
      }
      // faded edges — the print's own vignette
      const vig = 0.34 * age;
      if (vig > 0.01) {
        const R = Math.hypot(W, H) * 0.5;
        const gr = g.createRadialGradient(W / 2, H / 2, R * 0.45, W / 2, H / 2, R * 1.15);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.6, U.rgba('#2e2213', vig * 0.3));
        gr.addColorStop(1, U.rgba('#241a0e', vig));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    },
  });
  preset('photo-1940s', 'Old photo: 1940s print', 'oldphoto', { age: 0.9, tint: '#E0CFA8', fox: 0.7, veil: 0.06 });
  preset('photo-1970s', 'Old photo: 1970s', 'oldphoto', { tint: '#e0a070', fox: 0.25, soft: 0.35 });
  preset('photo-album', 'Old photo: album corner', 'oldphoto', { age: 0.95, fox: 0.4, soft: 0.7, veil: 0.12 });
})();
