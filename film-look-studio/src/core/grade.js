// Colour grading: one per-pixel function built from plain settings, so the same grade can be
// previewed, exported in a video, and written out as a .cube LUT for CapCut / Premiere / Resolve.
// Pure maths (no DOM) - project.mjs loads this file in Node to write LUTs.
FL.grade = (() => {
  const DEF = {
    exposure: 0,      // stops
    contrast: 0,      // -1..1 (S-curve strength around pivot)
    pivot: 0.45,
    sat: 1,           // 0 = black & white
    vibrance: 0,      // boosts dull colours more than strong ones
    temp: 0,          // -1 cool .. +1 warm
    tint: 0,          // -1 green .. +1 magenta
    lift: 0,          // raises blacks (faded film)
    gain: 1,          // white level
    gamma: 1,         // mid-tones (>1 brighter)
    shadowColor: '#808080', shadowAmt: 0,  // split-tone
    highColor: '#808080', highAmt: 0,
    mono: 0,          // 0..1 mix to a toned monochrome
    toneDark: '#000000', toneLight: '#ffffff',
    bleach: 0,        // bleach bypass: harsh contrast + silvery desaturation
    hue: 0,           // degrees
    crush: 0,         // crush blacks
    fade: 0,          // milky lifted blacks + softer whites
    redBoost: 0,      // isolate warm (reds/oranges) - for war / blood / fire looks
  };
  const hex = h => { let s = String(h || '#808080').replace('#', ''); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16) || 0; return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  // returns f(r,g,b) with inputs/outputs 0..1, writing into out[3]
  function compile(settings) {
    const s = Object.assign({}, DEF, settings || {});
    const ex = Math.pow(2, +s.exposure || 0);
    const k = +s.contrast || 0, pv = +s.pivot;
    const sat = +s.sat, vib = +s.vibrance || 0;
    const tr = 1 + s.temp * 0.16, tb = 1 - s.temp * 0.2, tg = 1 - s.tint * 0.12, tm = 1 + s.tint * 0.05;
    const lift = +s.lift || 0, gain = s.gain == null ? 1 : +s.gain, ig = 1 / Math.max(0.2, +s.gamma || 1);
    const sc = hex(s.shadowColor), hc = hex(s.highColor), sa = +s.shadowAmt || 0, ha = +s.highAmt || 0;
    const mono = +s.mono || 0, td = hex(s.toneDark), tl = hex(s.toneLight);
    const bl = +s.bleach || 0, crush = +s.crush || 0, fade = +s.fade || 0, rb = +s.redBoost || 0;
    const ang = (+s.hue || 0) * Math.PI / 180, ch = Math.cos(ang), sh = Math.sin(ang);
    const useHue = Math.abs(s.hue || 0) > 0.01, useGamma = Math.abs(ig - 1) > 1e-3;
    const curve = x => {
      if (k === 0) return x;
      // smooth S around the pivot that never clips hard
      const d = x - pv;
      const c = k > 0 ? d * (1 + k * 1.6) / (1 + k * 1.2 * Math.abs(d) * 2) : d * (1 + k * 0.7);
      return pv + c;
    };
    return (r, g, b, out) => {
      r *= ex * tr * tm; g *= ex * tg; b *= ex * tb * tm;
      if (useHue) {
        // rotate chroma in YIQ
        const y = 0.299 * r + 0.587 * g + 0.114 * b, i = 0.596 * r - 0.274 * g - 0.322 * b, q = 0.211 * r - 0.523 * g + 0.312 * b;
        const i2 = i * ch - q * sh, q2 = i * sh + q * ch;
        r = y + 0.956 * i2 + 0.621 * q2; g = y - 0.272 * i2 - 0.647 * q2; b = y - 1.106 * i2 + 1.703 * q2;
      }
      r = curve(r); g = curve(g); b = curve(b);
      let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (rb) {
        // keep reds/oranges, pull everything else toward grey
        const warm = Math.max(0, Math.min(1, (r - Math.max(g, b)) * 3));
        const keep = warm * rb, cut = 1 - rb * 0.85;
        const f = keep + (1 - keep) * cut;
        r = l + (r - l) * (f + keep * 0.35); g = l + (g - l) * f; b = l + (b - l) * f;
      }
      let sv = sat;
      if (vib) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), cs = mx > 0 ? (mx - mn) / mx : 0; sv *= 1 + vib * (1 - cs); }
      if (sv !== 1) { r = l + (r - l) * sv; g = l + (g - l) * sv; b = l + (b - l) * sv; }
      if (bl) {
        const ov = (c, m) => (m < 0.5 ? 2 * c * m : 1 - 2 * (1 - c) * (1 - m));
        const lc = Math.max(0, Math.min(1, l));
        r = r + (ov(r, lc) - r) * bl; g = g + (ov(g, lc) - g) * bl; b = b + (ov(b, lc) - b) * bl;
        const l2 = 0.2126 * r + 0.7152 * g + 0.0722 * b, d = bl * 0.55;
        r = r + (l2 - r) * d; g = g + (l2 - g) * d; b = b + (l2 - b) * d;
      }
      if (sa || ha) {
        l = Math.max(0, Math.min(1, 0.2126 * r + 0.7152 * g + 0.0722 * b));
        const ws = (1 - l) * (1 - l) * sa * 0.9, wh = l * l * ha * 0.9;
        r += (sc[0] - 0.5) * ws + (hc[0] - 0.5) * wh;
        g += (sc[1] - 0.5) * ws + (hc[1] - 0.5) * wh;
        b += (sc[2] - 0.5) * ws + (hc[2] - 0.5) * wh;
      }
      if (mono) {
        const m = Math.max(0, Math.min(1, 0.2126 * r + 0.7152 * g + 0.0722 * b));
        r += (td[0] + (tl[0] - td[0]) * m - r) * mono;
        g += (td[1] + (tl[1] - td[1]) * m - g) * mono;
        b += (td[2] + (tl[2] - td[2]) * m - b) * mono;
      }
      if (crush) { const f = x => (x < crush * 0.25 ? 0 : (x - crush * 0.25) / (1 - crush * 0.25)); r = f(r); g = f(g); b = f(b); }
      if (fade) { const lo = fade * 0.18, hi = 1 - fade * 0.08; r = lo + r * (hi - lo); g = lo + g * (hi - lo); b = lo + b * (hi - lo); }
      if (lift || gain !== 1) { r = lift + r * (gain - lift); g = lift + g * (gain - lift); b = lift + b * (gain - lift); }
      r = r < 0 ? 0 : r > 1 ? 1 : r; g = g < 0 ? 0 : g > 1 ? 1 : g; b = b < 0 ? 0 : b > 1 ? 1 : b;
      if (useGamma) { r = Math.pow(r, ig); g = Math.pow(g, ig); b = Math.pow(b, ig); }
      out[0] = r; out[1] = g; out[2] = b;
    };
  }

  // Apply several grades in order, each mixed by its amount, to ImageData in place.
  // grades: [{ f: compiled, amt: 0..1 }]
  function applyAll(img, grades) {
    const d = img.data, n = d.length, o = [0, 0, 0], inv = 1 / 255;
    const list = grades.filter(x => x.amt > 0.001);
    if (!list.length) return;
    // 1D shortcut tables are not possible for cross-channel ops; a 32^3 LUT keeps it fast
    const lut = buildLut(list, 33);
    const N = 33, N1 = N - 1, s = N1 / 255;
    for (let i = 0; i < n; i += 4) {
      const fr = d[i] * s, fg = d[i + 1] * s, fb = d[i + 2] * s;
      let r0 = fr | 0, g0 = fg | 0, b0 = fb | 0;
      if (r0 >= N1) r0 = N1 - 1; if (g0 >= N1) g0 = N1 - 1; if (b0 >= N1) b0 = N1 - 1;
      const dr = fr - r0, dg = fg - g0, db = fb - b0;
      const i000 = ((b0 * N + g0) * N + r0) * 3, i100 = i000 + 3, i010 = i000 + N * 3, i110 = i010 + 3;
      const i001 = i000 + N * N * 3, i101 = i001 + 3, i011 = i001 + N * 3, i111 = i011 + 3;
      for (let c = 0; c < 3; c++) {
        const c00 = lut[i000 + c] + (lut[i100 + c] - lut[i000 + c]) * dr;
        const c10 = lut[i010 + c] + (lut[i110 + c] - lut[i010 + c]) * dr;
        const c01 = lut[i001 + c] + (lut[i101 + c] - lut[i001 + c]) * dr;
        const c11 = lut[i011 + c] + (lut[i111 + c] - lut[i011 + c]) * dr;
        const c0 = c00 + (c10 - c00) * dg, c1 = c01 + (c11 - c01) * dg;
        d[i + c] = (c0 + (c1 - c0) * db) * 255 + 0.5;
      }
    }
    void inv; void o;
  }
  const lutCache = new Map();
  function buildLut(list, N) {
    const key = N + '|' + list.map(x => x.key + '@' + x.amt.toFixed(3)).join('|');
    if (lutCache.has(key)) return lutCache.get(key);
    const lut = new Float32Array(N * N * N * 3), o = [0, 0, 0];
    let p = 0;
    for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
      let R = r / (N - 1), G = g / (N - 1), B = b / (N - 1);
      for (const x of list) {
        x.f(R, G, B, o);
        R += (o[0] - R) * x.amt; G += (o[1] - G) * x.amt; B += (o[2] - B) * x.amt;
      }
      lut[p++] = R; lut[p++] = G; lut[p++] = B;
    }
    if (lutCache.size > 40) lutCache.delete(lutCache.keys().next().value);
    lutCache.set(key, lut);
    return lut;
  }
  // .cube text (Adobe/Resolve/CapCut format), red changes fastest
  function cube(list, title = 'Film Look', N = 33) {
    const lut = buildLut(list, N), lines = [`TITLE "${title.replace(/"/g, '')}"`, `LUT_3D_SIZE ${N}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
    for (let i = 0; i < lut.length; i += 3) lines.push(`${lut[i].toFixed(6)} ${lut[i + 1].toFixed(6)} ${lut[i + 2].toFixed(6)}`);
    return lines.join('\n') + '\n';
  }
  const keyOf = s => JSON.stringify(s);
  return { DEF, compile, applyAll, buildLut, cube, keyOf };
})();
