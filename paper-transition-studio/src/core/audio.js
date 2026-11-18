// Paper sound effects synthesised in code (royalty-free): rip, crumple, whoosh, roll, fold, fire, brush.
// The same buffers play in the preview and get mixed into the export.
PT.audio = (() => {
  const U = PT.util, SR = 48000;
  const KINDS = [['rip', 'Paper rip'], ['crumple', 'Crumple'], ['whoosh', 'Whoosh'], ['roll', 'Paper roll'], ['fold', 'Fold'], ['fire', 'Fire'], ['brush', 'Brush'], ['none', 'Silent']];

  function biquad(x, type, f, q = 0.707) {
    const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  const noise = (n, R) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = R() * 2 - 1; return a; };
  function grains(out, R, count, from, to, len, amp, dens = null) {
    for (let g = 0; g < count; g++) {
      let pos = from + R() * (to - from);
      if (dens) { let tries = 0; while (R() > dens(pos / out.length) && tries++ < 6) pos = from + R() * (to - from); }
      const L = Math.floor(len * (0.4 + R())), a = amp * (0.3 + R() * 0.7), st = Math.floor(pos);
      for (let i = 0; i < L && st + i < out.length; i++) out[st + i] += (R() * 2 - 1) * a * Math.exp(-i / (L * 0.25));
    }
  }
  function norm(a, peak = 0.9) { let m = 1e-6; for (const v of a) m = Math.max(m, Math.abs(v)); const k = peak / m; for (let i = 0; i < a.length; i++) a[i] *= k; return a; }
  function fade(a, ms = 8) { const n = Math.min(a.length / 2, SR * ms / 1000); for (let i = 0; i < n; i++) { a[i] *= i / n; a[a.length - 1 - i] *= i / n; } return a; }

  const synth = {
    rip(d, R) {
      const n = Math.floor(SR * d), env = i => { const t = i / n; return Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6; };
      let bed = biquad(biquad(noise(n, R), 'bp', 2400, 0.7), 'hp', 700);
      const crack = new Float32Array(n);
      grains(crack, R, Math.floor(d * 900), 0, n * 0.92, SR * 0.004, 1, t => 0.2 + Math.sin(Math.PI * Math.min(1, t * 1.1)));
      const cr = biquad(crack, 'hp', 1500);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) { const am = 0.6 + 0.4 * Math.sin(i / SR * 70 + Math.sin(i / SR * 23) * 3); out[i] = (bed[i] * 0.55 * am + cr[i] * 0.8) * env(i); }
      return fade(norm(out, 0.85));
    },
    crumple(d, R) {
      const n = Math.floor(SR * d), out = new Float32Array(n);
      grains(out, R, Math.floor(d * 260), 0, n * 0.8, SR * 0.012, 1, t => (t < 0.65 ? 1 - t * 0.6 : 0.15));
      grains(out, R, Math.floor(d * 500), 0, n * 0.7, SR * 0.002, 0.6);
      let y = biquad(biquad(out, 'bp', 2800, 0.6), 'hp', 400);
      const body = biquad(out, 'lp', 600);
      for (let i = 0; i < n; i++) y[i] = y[i] + body[i] * 0.5;
      return fade(norm(y, 0.8));
    },
    whoosh(d, R) {
      const n = Math.floor(SR * d), x = noise(n, R), out = new Float32Array(n);
      let lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, f = 300 + 2600 * Math.sin(Math.PI * t) ** 2, a = Math.min(1, 2 * Math.PI * f / SR);
        lp += a * (x[i] - lp); lp2 += a * (lp - lp2);
        out[i] = (lp - lp2 * 0.6) * Math.sin(Math.PI * t) ** 1.5;
      }
      const cr = new Float32Array(n); grains(cr, R, Math.floor(d * 120), n * 0.2, n * 0.8, SR * 0.003, 0.25);
      for (let i = 0; i < n; i++) out[i] += cr[i] * Math.sin(Math.PI * i / n);
      return fade(norm(out, 0.7));
    },
    roll(d, R) {
      const n = Math.floor(SR * d), bed = biquad(noise(n, R), 'lp', 1400), out = new Float32Array(n);
      const cr = new Float32Array(n); grains(cr, R, Math.floor(d * 400), 0, n, SR * 0.003, 0.7);
      const crf = biquad(cr, 'bp', 2000, 0.8);
      for (let i = 0; i < n; i++) { const t = i / n, e = Math.min(1, t * 6, (1 - t) * 4); out[i] = (bed[i] * (0.5 + 0.5 * Math.sin(i / SR * 38 * Math.PI)) * 0.6 + crf[i]) * e; }
      return fade(norm(out, 0.75));
    },
    fold(d, R) {
      const n = Math.floor(SR * d), out = synth.whoosh(d, R);
      for (let i = 0; i < n; i++) out[i] *= 0.45;
      for (const at of [0.33, 0.62]) {
        const st = Math.floor(n * at), c = new Float32Array(Math.floor(SR * 0.08)); grains(c, R, 30, 0, c.length * 0.5, SR * 0.004, 1);
        const cf = biquad(c, 'bp', 2500, 0.7);
        for (let i = 0; i < cf.length && st + i < n; i++) out[st + i] += cf[i] * 0.9 + Math.sin(i / SR * 2 * Math.PI * 95) * Math.exp(-i / (SR * 0.03)) * 0.5;
      }
      return fade(norm(out, 0.8));
    },
    fire(d, R) {
      const n = Math.floor(SR * d), rum = biquad(noise(n, R), 'lp', 260), pops = new Float32Array(n);
      grains(pops, R, Math.floor(d * 70), n * 0.1, n * 0.95, SR * 0.006, 1);
      grains(pops, R, Math.floor(d * 300), n * 0.15, n * 0.95, SR * 0.0015, 0.35);
      const pf = biquad(pops, 'hp', 1200), out = new Float32Array(n);
      for (let i = 0; i < n; i++) { const t = i / n, e = Math.min(1, t * 3) * Math.min(1, (1 - t) * 5); out[i] = (rum[i] * 2.2 * (0.6 + 0.4 * Math.sin(i / SR * 9)) + pf[i]) * e; }
      return fade(norm(out, 0.75));
    },
    brush(d, R) {
      const n = Math.floor(SR * d), x = biquad(biquad(noise(n, R), 'bp', 3200, 0.5), 'hp', 900), out = new Float32Array(n);
      const strokes = 3;
      for (let i = 0; i < n; i++) {
        const t = i / n, k = U.clamp((t - 0.3) / 0.7) * strokes, f = k - Math.floor(k);
        const e = t < 0.3 ? 0.05 : Math.sin(Math.PI * f) ** 0.7 * (0.75 + 0.25 * Math.sin(i / SR * 160));
        out[i] = x[i] * e;
      }
      return fade(norm(out, 0.6));
    },
  };
  const cache = new Map();
  function buffer(kind, d, seed) {
    if (!synth[kind]) return null;
    const k = `${kind}|${d.toFixed(3)}|${seed}`;
    if (!cache.has(k)) { cache.set(k, synth[kind](Math.max(0.15, d), U.rng(seed))); if (cache.size > 40) cache.delete(cache.keys().next().value); }
    return cache.get(k);
  }
  function eventsFor(proj) {
    const tl = PT.engine.timeline(proj), ev = [];
    for (const s of tl.segs) {
      if (s.kind !== 'trans') continue;
      const tr = proj.shots[s.to].transition, fx = PT.fx.byId[tr.fx];
      if (!tr.sfx || !fx) continue;
      const kind = tr.sfxKind || fx.sfx || 'rip';
      if (kind === 'none') continue;
      ev.push({ t: s.t0, d: s.t1 - s.t0, kind, seed: tr.seed || 1, gain: tr.sfxGain == null ? 1 : tr.sfxGain });
    }
    return { ev, total: tl.total };
  }
  // full mono mix of the project (Float32Array @ 48 kHz) for export / WAV
  function mix(proj, from = 0, to = null) {
    const { ev, total } = eventsFor(proj);
    to = to == null ? total : to;
    const n = Math.max(1, Math.ceil((to - from) * SR)), out = new Float32Array(n), vol = proj.sfxVolume == null ? 0.8 : proj.sfxVolume;
    for (const e of ev) {
      const b = buffer(e.kind, e.d, e.seed); if (!b) continue;
      const st = Math.round((e.t - from) * SR);
      for (let i = 0; i < b.length; i++) { const j = st + i; if (j >= 0 && j < n) out[j] += b[i] * vol * e.gain; }
    }
    for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i]);
    return out;
  }
  function wav(samples) {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Blob([buf], { type: 'audio/wav' });
  }

  // ---- live preview playback ----
  let ac = null, playing = [];
  function ctx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C({ sampleRate: SR }); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function stop() { for (const s of playing) { try { s.stop(); } catch (e) {} } playing = []; }
  function play(proj, fromT) {
    stop();
    const a = ctx(); if (!a) return;
    const { ev } = eventsFor(proj), vol = proj.sfxVolume == null ? 0.8 : proj.sfxVolume;
    for (const e of ev) {
      if (e.t + e.d < fromT) continue;
      const b = buffer(e.kind, e.d, e.seed); if (!b) continue;
      const ab = a.createBuffer(1, b.length, SR); ab.copyToChannel(b, 0);
      const src = a.createBufferSource(); src.buffer = ab;
      const g = a.createGain(); g.gain.value = vol * e.gain; src.connect(g).connect(a.destination);
      const off = Math.max(0, fromT - e.t), when = a.currentTime + Math.max(0, e.t - fromT) + 0.02;
      src.start(when, off); playing.push(src);
    }
  }
  function preview(kind, d = 1.2) { const a = ctx(); const b = buffer(kind, d, 7); if (!a || !b) return; const ab = a.createBuffer(1, b.length, SR); ab.copyToChannel(b, 0); const s = a.createBufferSource(); s.buffer = ab; s.connect(a.destination); s.start(); }

  return { SR, KINDS, buffer, mix, wav, play, stop, preview };
})();
