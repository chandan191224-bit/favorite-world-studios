// Web Audio decoder, BGM beat/onset/BPM analyzer, Voiceover pause/emphasis analyzer,
// real-time synced playback with auto-ducking, and OfflineAudioContext export mixer.
HES.audio = (() => {
  const U = HES.util;
  let actx = null;
  const buffers = { bgm: null, voice: null };
  let playingNodes = [];
  let muted = false;

  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) stop();
  }
  function isMuted() { return muted; }

  async function decodeFile(file) {
    const c = ctx();
    if (!c) throw new Error('Web Audio API is unavailable in this browser.');
    const arr = await file.arrayBuffer();
    return await c.decodeAudioData(arr);
  }

  function toMono(buf) {
    const n = buf.length, ch = buf.numberOfChannels;
    if (ch === 1) return buf.getChannelData(0);
    const out = new Float32Array(n);
    for (let c = 0; c < ch; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += d[i] / ch;
    }
    return out;
  }

  function makeWave(samples, bins = 160) {
    const step = Math.max(1, Math.floor(samples.length / bins));
    const wave = [];
    let peak = 1e-5;
    for (let i = 0; i < bins; i++) {
      const s0 = i * step, s1 = Math.min(samples.length, s0 + step);
      let mx = 0;
      for (let j = s0; j < s1; j += Math.max(1, Math.floor((s1 - s0) / 48))) {
        const v = Math.abs(samples[j]);
        if (v > mx) mx = v;
      }
      wave.push(mx);
      if (mx > peak) peak = mx;
    }
    return wave.map(v => Math.round((v / peak) * 1000) / 1000);
  }

  function analyzeBgmBuffer(buf) {
    const sr = buf.sampleRate;
    const mono = toMono(buf);
    const hop = Math.max(1, Math.round(sr * 0.02)); // 20ms frames (50 Hz)
    const nf = Math.floor(mono.length / hop);
    const rms = new Float32Array(nf);
    const bassRms = new Float32Array(nf);

    // 1-pole lowpass (~160 Hz) to isolate kicks & sub-bass punches
    const alpha = Math.min(1, (2 * Math.PI * 160) / sr);
    let lp = 0;
    for (let f = 0; f < nf; f++) {
      const i0 = f * hop;
      let s2 = 0, b2 = 0;
      for (let j = 0; j < hop; j++) {
        const v = mono[i0 + j];
        lp += alpha * (v - lp);
        s2 += v * v;
        b2 += lp * lp;
      }
      rms[f] = Math.sqrt(s2 / hop);
      bassRms[f] = Math.sqrt(b2 / hop);
    }

    // Spectral-like energy flux on combined full + bass log energy
    const flux = new Float32Array(nf);
    let prev = 0, prevB = 0;
    for (let f = 0; f < nf; f++) {
      const e = Math.log1p(rms[f] * 45);
      const eb = Math.log1p(bassRms[f] * 60);
      flux[f] = Math.max(0, e - prev) * 0.55 + Math.max(0, eb - prevB) * 0.85;
      prev = e; prevB = eb;
    }

    // Adaptive peak picking for transients/onsets
    let meanFlux = 0;
    for (let f = 0; f < nf; f++) meanFlux += flux[f] / Math.max(1, nf);
    let varFlux = 0;
    for (let f = 0; f < nf; f++) varFlux += (flux[f] - meanFlux) ** 2 / Math.max(1, nf);
    const stdFlux = Math.sqrt(varFlux);

    const onsets = [];
    const minSep = 9; // 180 ms
    let lastOn = -minSep;
    for (let f = 2; f < nf - 2; f++) {
      let loc = 0;
      for (let k = Math.max(0, f - 8); k <= Math.min(nf - 1, f + 8); k++) loc += flux[k];
      loc /= 17;
      const th = loc + stdFlux * 0.95 + 0.04;
      if (flux[f] > th && flux[f] >= flux[f - 1] && flux[f] >= flux[f + 1] && f - lastOn >= minSep) {
        onsets.push(Math.round(f * 0.02 * 1000) / 1000);
        lastOn = f;
      }
    }

    // Autocorrelation BPM estimation (68..165 BPM -> lag 18..44 frames @ 50Hz)
    let bestLag = 28, bestScore = -1; // default ~107 BPM
    for (let lag = 18; lag <= 44; lag++) {
      let sc = 0;
      for (let f = 0; f < nf - lag; f++) sc += flux[f] * flux[f + lag];
      // slight preference for 85..130 BPM documentary/hook range
      const candBpm = 3000 / lag;
      const prior = candBpm >= 80 && candBpm <= 135 ? 1.12 : 1.0;
      if (sc * prior > bestScore) { bestScore = sc * prior; bestLag = lag; }
    }
    const bpm = Math.round((60 / (bestLag * 0.02)) * 10) / 10;
    const beatPeriod = 60 / bpm;

    // Find best phase offset matching detected onsets
    let bestPhase = 0, bestPhaseScore = -1;
    const steps = 20;
    for (let p = 0; p < steps; p++) {
      const ph = (p / steps) * beatPeriod;
      let sc = 0;
      for (let t = ph; t < buf.duration; t += beatPeriod) {
        const fi = Math.min(nf - 1, Math.round(t / 0.02));
        sc += flux[fi] + (fi > 0 ? flux[fi - 1] * 0.5 : 0) + (fi < nf - 1 ? flux[fi + 1] * 0.5 : 0);
      }
      if (sc > bestPhaseScore) { bestPhaseScore = sc; bestPhase = ph; }
    }

    const beats = [], downbeats = [];
    let bi = 0;
    for (let t = bestPhase; t < buf.duration + 0.01; t += beatPeriod) {
      const rt = Math.round(t * 1000) / 1000;
      beats.push(rt);
      if (bi % 4 === 0) downbeats.push(rt);
      bi++;
    }

    // Smooth energy curve at 10 Hz (100 ms bins) normalized 0..1
    const eStep = 5; // 5 * 20ms = 100ms
    const energy = [];
    let eMax = 1e-4;
    for (let f = 0; f < nf; f += eStep) {
      let s = 0, c = 0;
      for (let k = f; k < Math.min(nf, f + eStep); k++) { s += rms[k]; c++; }
      const v = s / Math.max(1, c);
      energy.push(v);
      if (v > eMax) eMax = v;
    }

    return {
      dur: Math.round(buf.duration * 100) / 100,
      bpm,
      beatPeriod: Math.round(beatPeriod * 1000) / 1000,
      beats,
      downbeats,
      onsets,
      energy: energy.map(v => Math.round((v / eMax) * 1000) / 1000),
      wave: makeWave(mono, 180),
    };
  }

  function analyzeVoiceBuffer(buf) {
    const sr = buf.sampleRate;
    const mono = toMono(buf);
    const hop = Math.max(1, Math.round(sr * 0.02)); // 20ms
    const nf = Math.floor(mono.length / hop);
    const rms = new Float32Array(nf);
    let maxRms = 1e-5;
    for (let f = 0; f < nf; f++) {
      let s = 0;
      const i0 = f * hop;
      for (let j = 0; j < hop; j++) { const v = mono[i0 + j]; s += v * v; }
      rms[f] = Math.sqrt(s / hop);
      if (rms[f] > maxRms) maxRms = rms[f];
    }

    // Speech vs silence threshold (10% of peak RMS, floored)
    const sorted = Float32Array.from(rms).sort();
    const p85 = sorted[Math.floor(nf * 0.85)] || maxRms;
    const th = Math.max(0.008, p85 * 0.14);

    // Morphological smooth (fill <220ms micro-gaps between syllables)
    const active = new Uint8Array(nf);
    for (let f = 0; f < nf; f++) active[f] = rms[f] >= th ? 1 : 0;
    let gap = 0;
    for (let f = 0; f < nf; f++) {
      if (active[f]) {
        if (gap > 0 && gap <= 12) for (let g = f - gap; g < f; g++) active[g] = 1;
        gap = 0;
      } else gap++;
    }

    const segments = [], pauses = [];
    let curStart = -1, pStart = active[0] ? -1 : 0;
    for (let f = 0; f < nf; f++) {
      const t = f * 0.02;
      if (active[f] && curStart < 0) {
        curStart = t;
        if (pStart >= 0 && t - pStart >= 0.25) pauses.push([Math.round(pStart * 100) / 100, Math.round(t * 100) / 100]);
        pStart = -1;
      } else if (!active[f] && curStart >= 0) {
        if (t - curStart >= 0.15) segments.push([Math.round(curStart * 100) / 100, Math.round(t * 100) / 100]);
        curStart = -1;
        pStart = t;
      }
    }
    const endT = nf * 0.02;
    if (curStart >= 0 && endT - curStart >= 0.15) segments.push([Math.round(curStart * 100) / 100, Math.round(endT * 100) / 100]);
    if (pStart >= 0 && endT - pStart >= 0.25) pauses.push([Math.round(pStart * 100) / 100, Math.round(endT * 100) / 100]);

    // Emphasis peaks (top vocal surges spaced >= 1.8s apart)
    const peaks = [];
    let lastPk = -2;
    for (let f = 2; f < nf - 2; f++) {
      if (rms[f] > p85 * 0.85 && rms[f] >= rms[f - 1] && rms[f] >= rms[f + 1]) {
        const t = f * 0.02;
        if (t - lastPk >= 1.8) { peaks.push(Math.round(t * 100) / 100); lastPk = t; }
      }
    }

    return {
      dur: Math.round(buf.duration * 100) / 100,
      segments,
      pauses,
      peaks,
      wave: makeWave(mono, 180),
    };
  }

  // Synthesize crisp documentary hook beat (for offline templates & instant demo preview)
  function createDemoBgmBuffer(bpm = 104, dur = 18) {
    const sr = 44100;
    const len = Math.round(sr * dur);
    const ac = ctx();
    const buf = ac ? ac.createBuffer(2, len, sr) : {
      sampleRate: sr, length: len, duration: dur, numberOfChannels: 2,
      _ch: [new Float32Array(len), new Float32Array(len)],
      getChannelData(i) { return this._ch[i]; }
    };
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const bp = 60 / bpm;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const bi = Math.floor(t / bp);
      const bt = t - bi * bp;
      const barPos = bi % 4;
      // Kick punch on beats 0 and 2 (and anticipation on 3.5 every 2 bars)
      let kick = 0;
      if (barPos === 0 || barPos === 2) {
        const f = 52 + 120 * Math.exp(-bt * 26);
        kick = Math.sin(2 * Math.PI * f * bt) * Math.exp(-bt * 9.5) * 0.65;
      }
      // Subtle documentary tick/hat on every 8th note
      const subT = t % (bp * 0.5);
      const tick = (Math.sin(i * 1.7) * 0.5 + Math.sin(i * 3.1) * 0.5) * Math.exp(-subT * 55) * (barPos === 0 ? 0.16 : 0.09);
      // Dark minor drone pad (D2 + A2 + F3 tension)
      const swell = 0.55 + 0.45 * Math.sin(t * 0.5);
      const pad = (Math.sin(2 * Math.PI * 73.42 * t) * 0.22 + Math.sin(2 * Math.PI * 110 * t) * 0.14 + Math.sin(2 * Math.PI * 174.61 * t) * 0.08) * swell;
      // Riser sweep before bar 4 & bar 8
      const barT = t % (bp * 4);
      const riser = barT > bp * 3.0 ? Math.sin(2 * Math.PI * (140 + 420 * (barT - bp * 3)) * t) * 0.06 * ((barT - bp * 3) / bp) : 0;
      const s = U.clamp(kick + tick + pad + riser, -0.9, 0.9);
      L[i] = s; R[i] = s * 0.98;
    }
    return buf;
  }

  function setBuffer(kind, buf, name = '') {
    buffers[kind] = buf;
    if (kind === 'bgm' && buf) return Object.assign(analyzeBgmBuffer(buf), { name: name || 'bgm' });
    if (kind === 'voice' && buf) return Object.assign(analyzeVoiceBuffer(buf), { name: name || 'voiceover' });
    return null;
  }
  function getBuffer(kind) { return buffers[kind]; }

  // Deterministic beat & voice state at time t (safe in headless render.mjs too!)
  function stateAt(proj, t) {
    const meta = (proj && proj.audioMeta) || {};
    const bgm = meta.bgm;
    const voice = meta.voice;
    let beatPulse = 0, downbeatPulse = 0, onsetPulse = 0, energy = 0.55, beatIndex = 0;

    if (bgm && bgm.dur > 0) {
      const loopT = t % bgm.dur;
      const bp = bgm.beatPeriod || (60 / (bgm.bpm || 104));
      beatIndex = Math.floor(loopT / bp);
      // Beat grid pulse
      if (bgm.beats && bgm.beats.length) {
        let minD = 9;
        for (let i = 0; i < bgm.beats.length; i++) {
          const d = loopT - bgm.beats[i];
          if (d >= -0.02 && d < 0.45 && d < minD) minD = d;
        }
        if (minD < 1) beatPulse = Math.exp(-Math.max(0, minD) * 7.5);
      }
      if (bgm.downbeats && bgm.downbeats.length) {
        let minD = 9;
        for (let i = 0; i < bgm.downbeats.length; i++) {
          const d = loopT - bgm.downbeats[i];
          if (d >= -0.02 && d < 0.65 && d < minD) minD = d;
        }
        if (minD < 1) downbeatPulse = Math.exp(-Math.max(0, minD) * 5.2);
      }
      if (bgm.onsets && bgm.onsets.length) {
        let minD = 9;
        for (let i = 0; i < bgm.onsets.length; i++) {
          const d = loopT - bgm.onsets[i];
          if (d >= -0.015 && d < 0.35 && d < minD) minD = d;
        }
        if (minD < 1) onsetPulse = Math.exp(-Math.max(0, minD) * 9.0);
      }
      if (bgm.energy && bgm.energy.length) {
        const idx = U.clamp(Math.floor(loopT * 10), 0, bgm.energy.length - 1);
        energy = bgm.energy[idx];
      }
    } else {
      // Fallback 104 BPM grid when no BGM uploaded yet
      const bp = 60 / 104;
      const ph = t % bp;
      beatIndex = Math.floor(t / bp);
      beatPulse = Math.exp(-ph * 7.5);
      downbeatPulse = (beatIndex % 4 === 0) ? Math.exp(-ph * 5.2) : 0;
      onsetPulse = Math.max(beatPulse * 0.8, downbeatPulse);
    }

    let voiceActive = false;
    if (voice && voice.segments && voice.segments.length) {
      for (let i = 0; i < voice.segments.length; i++) {
        const [a, b] = voice.segments[i];
        if (t >= a && t <= b) { voiceActive = true; break; }
      }
    }

    return {
      beatPulse,
      downbeatPulse,
      onsetPulse,
      combined: U.clamp(Math.max(beatPulse * 0.72, onsetPulse * 0.85, downbeatPulse)),
      energy,
      beatIndex,
      voiceActive,
    };
  }

  function bgmGainAt(proj, t) {
    const mix = (proj && proj.mix) || {};
    const baseDb = mix.bgmDb != null ? mix.bgmDb : -22;
    const swellDb = mix.bgmSwellDb != null ? mix.bgmSwellDb : -12;
    const autoDuck = mix.autoDuck !== false;
    const voiceMeta = proj && proj.audioMeta && proj.audioMeta.voice;
    if (!autoDuck || !voiceMeta || !voiceMeta.segments || !voiceMeta.segments.length) {
      return U.dbToGain(baseDb);
    }
    const st = stateAt(proj, t);
    return U.dbToGain(st.voiceActive ? baseDb : swellDb);
  }

  function scheduleGainEnvelope(gainParam, acCtx, proj, startOffset, dur, t0Audio) {
    const step = 0.08;
    const steps = Math.max(2, Math.ceil(dur / step));
    for (let i = 0; i <= steps; i++) {
      const localT = Math.min(dur, i * step);
      const projT = startOffset + localT;
      let g = bgmGainAt(proj, projT);
      // 0.35s fade-in at 0, 0.8s fade-out at end
      if (projT < 0.35) g *= U.clamp(projT / 0.35);
      const totalDur = (proj.shots || []).reduce((s, x) => s + (x.dur || 2), 0);
      if (totalDur - projT < 0.8) g *= U.clamp((totalDur - projT) / 0.8);
      gainParam.setValueAtTime(Math.max(0.0001, g), t0Audio + localT);
    }
  }

  function stop() {
    for (const n of playingNodes) {
      try { n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    }
    playingNodes = [];
  }

  function play(proj, startT = 0, totalDur = 15) {
    stop();
    if (muted) return;
    const c = ctx();
    if (!c) return;
    const now = c.currentTime + 0.02;
    const playDur = Math.max(0.2, totalDur - startT);

    if (buffers.bgm) {
      const src = c.createBufferSource();
      src.buffer = buffers.bgm;
      src.loop = true;
      const g = c.createGain();
      scheduleGainEnvelope(g.gain, c, proj, startT, playDur, now);
      src.connect(g).connect(c.destination);
      src.start(now, startT % buffers.bgm.duration, playDur);
      playingNodes.push(src);
    }
    if (buffers.voice && startT < buffers.voice.duration) {
      const src = c.createBufferSource();
      src.buffer = buffers.voice;
      const g = c.createGain();
      const vGain = U.dbToGain((proj.mix && proj.mix.voiceDb != null) ? proj.mix.voiceDb : 0);
      g.gain.setValueAtTime(vGain, now);
      src.connect(g).connect(c.destination);
      const rem = Math.min(playDur, buffers.voice.duration - startT);
      if (rem > 0.05) {
        src.start(now, startT, rem);
        playingNodes.push(src);
      }
    }
  }

  async function renderMixedAudioBuffer(proj, from = 0, to = 15) {
    const dur = Math.max(0.2, to - from);
    const hasBgm = !!buffers.bgm, hasVoice = !!buffers.voice;
    if (!hasBgm && !hasVoice) return null;
    const sr = 48000;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const off = new OAC(2, Math.ceil(dur * sr), sr);

    if (hasBgm) {
      const src = off.createBufferSource();
      src.buffer = buffers.bgm;
      src.loop = true;
      const g = off.createGain();
      scheduleGainEnvelope(g.gain, off, proj, from, dur, 0);
      src.connect(g).connect(off.destination);
      src.start(0, from % buffers.bgm.duration, dur);
    }
    if (hasVoice && from < buffers.voice.duration) {
      const src = off.createBufferSource();
      src.buffer = buffers.voice;
      const g = off.createGain();
      g.gain.setValueAtTime(U.dbToGain((proj.mix && proj.mix.voiceDb != null) ? proj.mix.voiceDb : 0), 0);
      src.connect(g).connect(off.destination);
      const rem = Math.min(dur, buffers.voice.duration - from);
      if (rem > 0.05) src.start(0, from, rem);
    }
    return await off.startRendering();
  }

  return {
    decodeFile, analyzeBgmBuffer, analyzeVoiceBuffer, createDemoBgmBuffer,
    setBuffer, getBuffer, stateAt, bgmGainAt, play, stop, setMuted, isMuted,
    renderMixedAudioBuffer,
  };
})();
