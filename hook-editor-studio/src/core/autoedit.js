// One-Click Auto-Edit Hook generator (Beat-sync + Voiceover pause + Channel style DNA).
HES.autoedit = (() => {
  const U = HES.util;

  const STYLES = {
    hybrid: {
      name: 'Favorite World Hybrid',
      motions: ['pulse-zoom', 'whip-push', 'crimson-tension', 'film-burn-leak', 'torn-split', 'bw-color-pop', 'hud-zoom', 'rim-cutout'],
      transitions: ['cut', 'flash', 'whip-l', 'burn', 'zoom-in', 'whip-r'],
      accent: '#e5a93c',
      cinemaBars: true,
      grain: 0.14,
      beatSync: 1.0,
    },
    nitish: {
      name: 'Nitish Thriller',
      motions: ['pulse-zoom', 'bass-shake', 'crimson-tension', 'torn-split', 'rim-cutout', 'bw-color-pop'],
      transitions: ['cut', 'flash', 'whip-l', 'zoom-in', 'dip'],
      accent: '#dc2626',
      cinemaBars: true,
      grain: 0.16,
      beatSync: 1.05,
    },
    dhruv: {
      name: 'Dhruv Mystery',
      motions: ['hud-zoom', 'film-burn-leak', 'ken-burns-beat', 'clean-doc', 'bw-color-pop', 'rim-cutout'],
      transitions: ['burn', 'zoom-in', 'fade', 'wipe', 'flash'],
      accent: '#38bdf8',
      cinemaBars: true,
      grain: 0.12,
      beatSync: 0.82,
    },
    deshbhakt: {
      name: 'Deshbhakt Rapid',
      motions: ['polaroid-desk', 'whip-push', 'bw-color-pop', 'pulse-zoom', 'torn-split', 'clean-doc'],
      transitions: ['whip-l', 'whip-r', 'wipe', 'cut', 'flash'],
      accent: '#f59e0b',
      cinemaBars: false,
      grain: 0.08,
      beatSync: 0.95,
    },
  };

  const PACE_MULT = { fast: 0.78, medium: 1.0, cinematic: 1.38 };

  function pickNonRepeat(arr, prev, idx, seed) {
    const filtered = arr.filter(x => x !== prev);
    const pool = filtered.length ? filtered : arr;
    return pool[(idx + Math.floor(U.h1(seed * 3.7 + idx * 11) * pool.length)) % pool.length];
  }

  function nearestAnchor(target, anchors, maxDelta) {
    let best = null, bestD = maxDelta;
    for (const a of anchors) {
      const d = Math.abs(a - target);
      if (d < bestD) { bestD = d; best = a; }
    }
    return best;
  }

  function generate(proj, opts = {}) {
    const styleKey = STYLES[opts.style] ? opts.style : (proj.style || 'hybrid');
    const st = STYLES[styleKey];
    const paceKey = opts.pace || proj.pace || 'medium';
    const pace = PACE_MULT[paceKey] || 1.0;

    const meta = proj.audioMeta || {};
    const bgm = meta.bgm || null;
    const voice = meta.voice || null;
    const mediaIds = Object.keys(proj.media || {});

    // Determine target total duration (15-28s ideal hook window, or voice duration if uploaded)
    const bgmPeriod = bgm && bgm.beatPeriod ? bgm.beatPeriod : 0.57; // ~105 BPM fallback
    const rawTarget = voice && voice.dur > 2
      ? Math.min(48, Math.max(6, voice.dur))
      : (opts.targetDur || (bgm && bgm.dur > 6 ? Math.min(24, bgm.dur) : 16));

    // Base shot length calibrated around observed 2.16s median (Nitish 1.8s, Hybrid 2.2s, Dhruv 2.8s)
    const styleBase = styleKey === 'nitish' ? 1.85 : styleKey === 'dhruv' ? 2.75 : styleKey === 'deshbhakt' ? 2.05 : 2.15;
    const targetShot = Math.max(1.1, styleBase * pace);
    const desiredBars = Math.max(2, Math.round(targetShot / Math.max(0.32, bgmPeriod)));
    const nominalStep = Math.max(1.0, desiredBars * bgmPeriod);

    // Collect audio snap points: downbeats (highest weight), voice pauses, regular beats, heavy onsets
    const anchors = [];
    if (bgm) {
      for (const t of (bgm.downbeats || [])) anchors.push(t);
      for (const t of (bgm.beats || [])) anchors.push(t);
      for (const t of (bgm.onsets || [])) anchors.push(t);
    }
    if (voice) {
      for (const p of (voice.pauses || [])) {
        if (p.dur >= 0.14) anchors.push(p.mid);
      }
    }
    anchors.sort((a, b) => a - b);

    // Build beat-snapped cut points from 0 -> rawTarget
    const cuts = [0];
    let cur = 0;
    while (cur + nominalStep * 0.72 < rawTarget - 0.8) {
      const ideal = cur + nominalStep;
      const snap = nearestAnchor(ideal, anchors.filter(a => a > cur + 0.9 && a < rawTarget - 0.7), nominalStep * 0.36);
      const next = snap != null ? snap : Math.min(rawTarget, ideal);
      if (next - cur >= 0.85) {
        cuts.push(Number(next.toFixed(3)));
        cur = next;
      } else {
        break;
      }
    }
    if (rawTarget - cuts[cuts.length - 1] < 0.9 && cuts.length > 1) {
      cuts[cuts.length - 1] = Number(rawTarget.toFixed(3));
    } else {
      cuts.push(Number(rawTarget.toFixed(3)));
    }

    const oldShots = proj.shots || [];
    const newShots = [];
    let prevMotion = null, prevTr = null;
    const baseSeed = Number(opts.seed || proj.seed || 42);

    for (let i = 0; i < cuts.length - 1; i++) {
      const dur = Math.max(0.85, Number((cuts[i + 1] - cuts[i]).toFixed(3)));
      const motion = pickNonRepeat(st.motions, prevMotion, i, baseSeed + 3);
      const trIn = i === 0 ? 'cut' : pickNonRepeat(st.transitions, prevTr, i, baseSeed + 19);
      prevMotion = motion;
      prevTr = trIn;

      // Preserve/cycle uploaded mediaIds so user photos/clips distribute cleanly without gaps
      let mediaId = null;
      if (mediaIds.length) {
        mediaId = mediaIds[i % mediaIds.length];
      } else if (oldShots[i] && oldShots[i].mediaId) {
        mediaId = oldShots[i].mediaId;
      }
      const existingLabel = (oldShots[i] && oldShots[i].label) || (proj.media && mediaId && proj.media[mediaId] && proj.media[mediaId].name) || `Hook Shot ${i + 1}`;

      newShots.push({
        id: oldShots[i] ? oldShots[i].id : U.uid('shot'),
        mediaId,
        label: existingLabel.replace(/\.[^.]+$/, ''),
        dur,
        motion,
        trIn,
        trDur: trIn === 'cut' ? 0 : (styleKey === 'dhruv' ? 0.38 : 0.26),
        tension: (motion === 'crimson-tension' || i >= cuts.length - 3) ? 0.72 : 0.45,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        seed: (i + 1) * 17 + baseSeed,
      });
    }

    // Build / update hook overlays (unless keepOverlays is true and overlays already exist)
    let overlays = proj.overlays;
    if (!opts.keepOverlays || !overlays || !overlays.length) {
      const T = cuts[cuts.length - 1];
      const topic = proj.title || 'THE UNTOLD TRUTH';
      overlays = [];
      if (styleKey === 'nitish' || styleKey === 'hybrid') {
        overlays.push({
          id: U.uid('ov'), type: 'ov-coming-up', start: 0.25, dur: Math.min(5.5, T * 0.45),
          text: 'COMING UP NEXT', sub: '', color: st.accent, bg: '#090b10', font: 'bebas', size: 22, x: 0.055, y: 0.145, animIn: 0.35
        });
      }
      overlays.push({
        id: U.uid('ov'), type: styleKey === 'deshbhakt' ? 'ov-banner' : 'ov-impact-title',
        start: Math.max(0.6, Math.min(1.4, T * 0.08)), dur: Math.min(3.4, T * 0.25),
        text: topic.toUpperCase(), sub: 'DEEP DIVE', color: st.accent, bg: '#090b10', font: 'khand', size: 78, x: 0.5, y: 0.5, animIn: 0.35
      });
      if (T > 6.5) {
        const mid = cuts[Math.floor(cuts.length * 0.42)] || T * 0.42;
        overlays.push({
          id: U.uid('ov'), type: styleKey === 'dhruv' ? 'ov-doc-highlight' : 'ov-callout',
          start: Number(mid.toFixed(2)), dur: Math.min(3.6, T - mid - 0.5),
          text: styleKey === 'dhruv' ? 'OFFICIAL REPORT EXPOSED THE HIDDEN REALITY BEHIND IT' : 'CRITICAL TURNING POINT',
          sub: 'SOURCE: ARCHIVE RECORD', color: styleKey === 'dhruv' ? '#ef4444' : st.accent, bg: '#090b10', font: 'mukta', size: 42, x: 0.5, y: 0.54, animIn: 0.45
        });
      }
      if (T > 11) {
        const nearEnd = cuts[Math.max(1, cuts.length - 2)] || T * 0.72;
        overlays.push({
          id: U.uid('ov'), type: 'ov-stat-pop',
          start: Number(nearEnd.toFixed(2)), dur: Math.min(3.2, T - nearEnd),
          text: '₹21,000 Cr+', sub: 'IMPACT SCALE', color: st.accent, bg: '#090b10', font: 'bebas', size: 88, x: 0.5, y: 0.52, animIn: 0.4
        });
      }
    }

    return {
      ...proj,
      style: styleKey,
      pace: paceKey,
      cinemaBars: st.cinemaBars,
      grain: st.grain,
      beatSync: st.beatSync,
      bgmDb: proj.bgmDb != null ? proj.bgmDb : -22,
      bgmIdleDb: proj.bgmIdleDb != null ? proj.bgmIdleDb : -12,
      duck: proj.duck != null ? proj.duck : true,
      shots: newShots,
      overlays,
    };
  }

  return { STYLES, PACE_MULT, generate };
})();
