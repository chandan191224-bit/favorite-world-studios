// Camera moves (from the research catalogue): push/pull, zoom-into-detail, truck, pan, tilt,
// crane, orbit, dolly-zoom (vertigo), sway, drift, breathe, flat Ken Burns and the mesh 3D moves.
// cam(P, ep, p) -> { zoom, x, y, rot, vertigo } — zoom 1 = rest; x/y content shift fractions;
// rot radians; vertigo multiplies the far-plane stretch around the focus depth.
(() => {
  const M = PP.moves, R = PP.fx.P;
  const D2R = Math.PI / 180;

  const withEase = (P, e) => ({ zoom: 1, x: 0, y: 0, rot: 0, vertigo: 1, ...e(P) });

  PP.fx.register({
    id: 'push', name: 'Push in (documentary)', family: 'Push & pull', dur: 5,
    desc: 'The main documentary move: the camera slowly dollies in and the depth layers separate.',
    params: [R.range('amount', 'Push amount', 0.03, 1.2, 0.01, 0.24), R.range('drift', 'Side drift', 0, 0.3, 0.005, 0), R.range('driftAng', 'Drift angle', 0, 360, 1, 0), R.range('roll', 'Lean (dutch)', -8, 8, 0.5, 0)],
    ease: 'sine',
    cam(P, ep) {
      const a = P.drift || 0, ang = (P.driftAng || 0) * D2R;
      return { zoom: 1 + (P.amount || 0.24) * ep, x: Math.cos(ang) * a * ep, y: Math.sin(ang) * a * ep, rot: (P.roll || 0) * D2R * ep, vertigo: 1 };
    },
  });

  PP.fx.register({
    id: 'push-soft', name: 'Slow archive push', family: 'Push & pull', dur: 7,
    desc: 'Very gentle push used on archive stills — the layers barely separate.',
    params: [R.range('amount', 'Push amount', 0.02, 0.5, 0.005, 0.14), R.range('drift', 'Side drift', 0, 0.2, 0.005, 0.015)],
    ease: 'inOut',
    cam(P, ep) { return { zoom: 1 + (P.amount || 0.14) * ep, x: (P.drift || 0) * ep, y: 0, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'push-detail', name: 'Zoom into the detail', family: 'Push & pull', dur: 4,
    desc: 'Hard push (2–4x) ending on a face or detail, with a fast start and a soft stop.',
    params: [R.range('amount', 'Zoom', 0.3, 4, 0.05, 1.7), R.range('drift', 'Side drift', 0, 0.4, 0.01, 0.05), R.range('roll', 'Lean', -8, 8, 0.5, 0)],
    ease: 'out',
    cam(P, ep) { return { zoom: 1 + (P.amount || 1.7) * ep, x: (P.drift || 0) * ep, y: 0, rot: (P.roll || 0) * D2R * ep * 0.4, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'pull', name: 'Pull back (reveal)', family: 'Push & pull', dur: 5,
    desc: 'The camera pulls back and reveals more of the scene.',
    params: [R.range('amount', 'Pull amount', 0.03, 0.6, 0.01, 0.2), R.range('drift', 'Side drift', 0, 0.3, 0.005, 0)],
    ease: 'inOut',
    cam(P, ep) { return { zoom: 1 - (P.amount || 0.2) * ep, x: (P.drift || 0) * ep, y: 0, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'push-tilt', name: 'Push + tilt up/down', family: 'Tilt & crane', dur: 5,
    desc: 'Dolly in while tilting: ground to sky, or down to the ground.',
    params: [R.range('amount', 'Push amount', 0.02, 0.6, 0.01, 0.2), R.range('tilt', 'Tilt amount', -0.5, 0.5, 0.01, 0.22), R.range('drift', 'Side drift', 0, 0.3, 0.005, 0)],
    ease: 'sine',
    cam(P, ep) { return { zoom: 1 + (P.amount || 0.2) * ep, x: (P.drift || 0) * ep, y: (P.tilt || 0.22) * ep, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'truck', name: 'Lateral truck', family: 'Truck & pan', dur: 5,
    desc: 'Slide sideways — foreground sweeps past faster than the background.',
    params: [R.range('dist', 'Distance', 0.02, 0.6, 0.01, 0.16), R.select('dir', 'Direction', [['1', 'Right'], ['-1', 'Left']], '1'), R.range('push', 'Push while trucking', 0, 0.5, 0.01, 0.06), R.range('vert', 'Vertical', -0.3, 0.3, 0.01, 0)],
    ease: 'inOut',
    cam(P, ep) { return { zoom: 1 + (P.push || 0) * ep, x: (P.dist || 0.16) * ep * (+P.dir || 1), y: (P.vert || 0) * ep, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'pan', name: 'Slow pan (panorama)', family: 'Truck & pan', dur: 6,
    desc: 'A long flat pan across a wide photo — near-linear, documentary style.',
    params: [R.range('dist', 'Distance', 0.05, 0.8, 0.01, 0.3), R.select('dir', 'Direction', [['1', 'Right'], ['-1', 'Left']], '1'), R.range('push', 'Slight push', 0, 0.3, 0.01, 0.03)],
    ease: 'linear',
    cam(P, ep) { return { zoom: 1 + (P.push || 0.03) * ep, x: (P.dist || 0.3) * ep * (+P.dir || 1), y: 0, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'crane', name: 'Crane rise', family: 'Tilt & crane', dur: 6,
    desc: 'The camera rises and gently pushes in.',
    params: [R.range('rise', 'Rise', 0.02, 0.5, 0.01, 0.2), R.range('push', 'Push', 0, 0.4, 0.01, 0.08)],
    ease: 'inOut',
    cam(P, ep) { return { zoom: 1 + (P.push || 0.08) * ep, x: 0, y: -(P.rise || 0.2) * ep, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'orbit', name: 'Arc around subject', family: 'Orbit & dolly-zoom', dur: 6,
    desc: 'A short orbital arc around the subject at the focus point.',
    params: [R.range('arc', 'Arc angle', 2, 60, 1, 24), R.range('radius', 'Arc radius', 0.03, 0.4, 0.01, 0.12), R.range('push', 'Push', 0, 0.4, 0.01, 0.07)],
    ease: 'inOut',
    cam(P, ep) {
      const a = (P.arc || 24) * D2R * (ep - 0.5), r = P.radius || 0.12;
      return { zoom: 1 + (P.push || 0.07) * ep, x: Math.sin(a) * r, y: -Math.sin(a) * r * 0.18, rot: 0, vertigo: 1 };
    },
  });

  PP.fx.register({
    id: 'vertigo', name: 'Dolly zoom (vertigo)', family: 'Orbit & dolly-zoom', dur: 5,
    desc: 'Camera and lens move against each other: the subject stays put while the background stretches.',
    params: [R.range('amount', 'Strength', 0.05, 0.9, 0.01, 0.42), R.range('zoom', 'Subject zoom', 0, 0.6, 0.01, 0.05), R.select('mode', 'Feel', [['push', 'Push in (bg stretches)'], ['pull', 'Pull back (bg compresses)']], 'push')],
    ease: 'inOut',
    cam(P, ep) {
      const st = (P.amount || 0.42) * ep;
      return {
        zoom: 1 + (P.zoom || 0.05) * ep,
        x: 0, y: 0, rot: 0,
        vertigo: P.mode === 'pull' ? 1 / (1 + st) : 1 + st,
      };
    },
  });

  PP.fx.register({
    id: 'sway', name: 'Pendulum sway', family: 'Sway & drift', dur: 6,
    desc: 'Hand-held style sway that settles to rest by the end of the shot.',
    params: [R.range('amp', 'Sway amount', 0.005, 0.15, 0.005, 0.035), R.range('twist', 'Twist', 0, 10, 0.5, 2.5), R.range('speed', 'Speed', 0.1, 2, 0.05, 0.55)],
    ease: 'linear',
    cam(P, ep, p) {
      const s = M.settle(p), w = p * (P.speed || 0.55) * Math.PI * 3;
      return { zoom: 1 + 0.02 * p, x: Math.sin(w) * (P.amp || 0.035) * s, y: Math.cos(w * 0.8) * (P.amp || 0.035) * 0.4 * s, rot: Math.sin(w + 0.6) * (P.twist || 2.5) * D2R * s, vertigo: 1 };
    },
  });

  PP.fx.register({
    id: 'drift', name: 'Ambient drift', family: 'Sway & drift', dur: 8,
    desc: 'A slow, constant breathing drift — the photo never sits perfectly still.',
    params: [R.range('amp', 'Drift amount', 0.005, 0.12, 0.005, 0.04), R.range('rot', 'Micro lean', 0, 3, 0.1, 0.6)],
    ease: 'sine',
    cam(P, ep) { return { zoom: 1 + 0.015 * ep, x: (P.amp || 0.04) * ep, y: (P.amp || 0.04) * 0.3 * Math.sin(ep * 2.4), rot: (P.rot || 0.6) * D2R * Math.sin(ep * 1.6), vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'breathe', name: 'Breathing hold', family: 'Sway & drift', dur: 6,
    desc: 'One slow in–out breath of the camera: nearly still, alive, back at rest at the end.',
    params: [R.range('amp', 'Breath amount', 0.005, 0.1, 0.005, 0.03)],
    ease: 'sine',
    cam(P, ep, p) {
      const b = (1 - Math.cos(p * Math.PI * 2)) / 2;   // 0 → 1 → 0, rest at both ends
      return { zoom: 1 + (P.amp || 0.03) * b, x: (P.amp || 0.03) * 0.3 * b, y: 0, rot: 0, vertigo: 1 };
    },
  });

  PP.fx.register({
    id: 'kb', name: 'Ken Burns (flat)', family: 'Ken Burns', dur: 6,
    desc: 'Classic flat zoom — no layer separation, for when the photo must stay whole.',
    params: [R.range('amount', 'Zoom amount', -0.5, 1.5, 0.01, 0.22), R.range('x', 'Pan X', -0.4, 0.4, 0.01, 0.02), R.range('y', 'Pan Y', -0.4, 0.4, 0.01, 0.01)],
    ease: 'linear',
    cam(P, ep) { return { zoom: 1 + (P.amount || 0.22) * ep, x: (P.x || 0) * ep, y: (P.y || 0) * ep, rot: 0, vertigo: 1, flat: true }; },
  });

  PP.fx.register({
    id: 'mesh-zoom', name: '3D zoom (displacement mesh)', family: 'Mesh 3D', dur: 5,
    desc: 'The photo is displaced into a 3D mesh by its depth map and the camera flies a little — the "photo comes alive" look.',
    params: [R.range('amount', 'Push', 0.05, 1.2, 0.01, 0.35), R.range('drift', 'Side drift', 0, 0.3, 0.01, 0.04), R.range('depthZ', 'Depth scale', 0.3, 2.5, 0.05, 0.85), R.range('overscan', 'Edge safety', 0.05, 0.5, 0.01, 0.22)],
    ease: 'sine', renderer: 'mesh',
    cam(P, ep) { return { zoom: 1 + (P.amount || 0.35) * ep, x: (P.drift || 0.04) * ep, y: 0, rot: 0, vertigo: 1 }; },
  });

  PP.fx.register({
    id: 'mesh-rush', name: 'Mesh fly-through', family: 'Mesh 3D', dur: 5,
    desc: 'A strong push through the depth mesh — corridors, streets and arches come alive.',
    params: [R.range('amount', 'Push', 0.2, 2.5, 0.05, 0.85), R.range('drift', 'Side drift', 0, 0.4, 0.01, 0.05), R.range('depthZ', 'Depth scale', 0.3, 3, 0.05, 1.15), R.range('overscan', 'Edge safety', 0.05, 0.6, 0.01, 0.3)],
    ease: 'inOut', renderer: 'mesh',
    cam(P, ep) { return { zoom: 1 + (P.amount || 0.85) * ep, x: (P.drift || 0.05) * ep, y: 0, rot: 0, vertigo: 1 }; },
  });
})();
