// Ready-made projects (generic names, Hindi text renders with the bundled fonts).
PP.templates = (() => {
  const E = PP.engine;
  const T = (source, dur, moveFx, moveParams, grade, extras = {}) => {
    const s = E.newShot(source, dur);
    s.move = { fx: moveFx, params: moveParams || {}, seed: extras.seed || 3 };
    s.grade = Object.assign({ look: 'none', vignette: 0.4, grain: 0.12, letterbox: 0, frame: 0, dof: 0 }, grade);
    if (extras.atmos) s.atmos = extras.atmos.map(a => Object.assign(PP.atmos.create(a.kind), a));
    if (extras.overlays) s.overlays = extras.overlays.map(o => Object.assign(PP.overlays.create(o.kind), o));
    if (extras.depth) s.depth = Object.assign({}, s.depth, extras.depth);
    if (extras.transition) s.transition = E.newTransition(extras.transition, extras.transitionDur);
    return s;
  };

  const LIST = [
    {
      id: 'archive', name: 'Archive documentary (B/W)',
      note: 'B/W archive stills, classic push, year chips, dip to black — the newsreel look.',
      make() {
        const p = { version: 1, name: 'Archive documentary', width: 1920, height: 1080, fps: 30, shots: [] };
        const s1 = T({ type: 'demo', demo: 'factory' }, 5, 'push', { amount: 0.28 }, { look: 'bw2', vignette: 0.55, grain: 0.3 },
          { depth: { bands: 4, parallax: 0.9 }, overlays: [{ kind: 'caption', text: 'जब कहानी यहीं से बदली', year: '1942', start: 0.4 }], transition: 'dip' });
        const s2 = T({ type: 'demo', demo: 'horseman' }, 5, 'push', { amount: 0.34 }, { look: 'bw2', vignette: 0.6, grain: 0.32 },
          { depth: { bands: 4, parallax: 0.95 }, overlays: [{ kind: 'caption', text: 'एक तस्वीर, एक पूरी कहानी', year: '1947', start: 0.4 }], transition: 'dip' });
        const s3 = T({ type: 'demo', demo: 'steps' }, 5, 'push-detail', { amount: 0.9 }, { look: 'sepia', vignette: 0.5, grain: 0.25 },
          { overlays: [{ kind: 'nametag', text: 'अपने हीरो', sub: 'एक याद' }] });
        p.shots.push(s1, s2, s3);
        return p;
      },
    },
    {
      id: 'alive', name: 'Photo comes alive (classic)',
      note: 'The Kid-Stay-in-the-Picture cut-out look: strong separation, high contrast, grain.',
      make() {
        const p = { version: 1, name: 'Photo comes alive', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(
          T({ type: 'demo', demo: 'horseman' }, 5, 'push', { amount: 0.32 }, { look: 'bw2', vignette: 0.6, grain: 0.3 }, { depth: { bands: 4, parallax: 0.95 }, transition: 'dip' }),
          T({ type: 'demo', demo: 'desert' }, 5, 'push', { amount: 0.3 }, { look: 'bw2', vignette: 0.6, grain: 0.3 }, { depth: { bands: 5, parallax: 0.9 }, transition: 'zoom' }),
          T({ type: 'demo', demo: 'factory' }, 5, 'pull', { amount: 0.2 }, { look: 'bw2', vignette: 0.55, grain: 0.3 }, { depth: { bands: 4, parallax: 0.9 } }),
        );
        return p;
      },
    },
    {
      id: 'teal', name: 'Cinematic teal & embers',
      note: 'Teal night grade, embers, letterbox — modern cinematic B-roll.',
      make() {
        const p = { version: 1, name: 'Teal and embers', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(
          T({ type: 'demo', demo: 'desert' }, 6, 'push', { amount: 0.22 }, { look: 'teal', vignette: 0.55, grain: 0.12, letterbox: 2.39 }, { atmos: [{ kind: 'embers' }], transition: 'defocus' }),
          T({ type: 'demo', demo: 'room' }, 6, 'push-soft', { amount: 0.16 }, { look: 'teal', vignette: 0.5, grain: 0.12, letterbox: 2.39 }, { atmos: [{ kind: 'dust' }, { kind: 'rays', amount: 0.3 }] }),
        );
        return p;
      },
    },
    {
      id: 'framed', name: 'History slideshow (framed)',
      note: 'Framed stills with pull-backs, date blocks, defocus transitions.',
      make() {
        const p = { version: 1, name: 'History slideshow', width: 1920, height: 1080, fps: 30, shots: [] };
        const g = { look: 'sepia', vignette: 0.5, grain: 0.22, frame: 0.8 };
        p.shots.push(
          T({ type: 'demo', demo: 'factory' }, 4.5, 'pull', { amount: 0.18 }, g, { overlays: [{ kind: 'caption', text: 'सुनहरे दिन', year: 'जनवरी 1942', chipColor: '#a3772c', start: 0.5 }], transition: 'defocus' }),
          T({ type: 'demo', demo: 'steps' }, 4.5, 'pull', { amount: 0.18 }, g, { overlays: [{ kind: 'caption', text: 'पत्थर की सीढ़ियाँ', year: 'नवंबर 1958', chipColor: '#a3772c', start: 0.5 }], transition: 'defocus' }),
          T({ type: 'demo', demo: 'horseman' }, 4.5, 'pull', { amount: 0.18 }, g, { overlays: [{ kind: 'caption', text: 'आख़िरी सफ़र', year: 'अगस्त 1963', chipColor: '#a3772c', start: 0.5 }] }),
        );
        return p;
      },
    },
    {
      id: 'hindi', name: 'Hindi explainer opener',
      note: 'Map-style opener with a place label, year chip and a big title — documentary intro.',
      make() {
        const p = { version: 1, name: 'Hindi explainer opener', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(
          T({ type: 'demo', demo: 'room' }, 5, 'push-detail', { amount: 0.55 }, { look: 'warm', vignette: 0.5, grain: 0.15 },
            { overlays: [{ kind: 'place', text: 'रामेश्वरम्', x: 0.5, y: 0.42, start: 0.5 }], transition: 'zoom' }),
          T({ type: 'demo', demo: 'steps' }, 5, 'push', { amount: 0.24 }, { look: 'warm', vignette: 0.5, grain: 0.15 },
            { overlays: [{ kind: 'bigtitle', text: 'एक सच्ची कहानी', start: 0.2 }, { kind: 'nametag', text: 'साधारण लड़का', sub: 'असाधारण सपना', start: 1.2 }] }),
        );
        return p;
      },
    },
    {
      id: 'weather', name: 'Fog & weather showcase',
      note: 'Fog valley, rainy street and a lightning storm.',
      make() {
        const p = { version: 1, name: 'Fog and weather', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(
          T({ type: 'demo', demo: 'ridge' }, 7, 'drift', {}, { look: 'cold', vignette: 0.4, grain: 0.1 }, { atmos: [{ kind: 'fog' }, { kind: 'haze' }], transition: 'dip' }),
          T({ type: 'demo', demo: 'street' }, 6, 'truck', { dist: 0.14, dir: '-1' }, { look: 'cold', vignette: 0.55, grain: 0.15 }, { atmos: [{ kind: 'rain' }], transition: 'flash' }),
          T({ type: 'demo', demo: 'ridge' }, 6, 'push', { amount: 0.2 }, { look: 'cold', vignette: 0.65, grain: 0.12 }, { atmos: [{ kind: 'lightning' }, { kind: 'rain', amount: 0.25 }] }),
        );
        return p;
      },
    },
    {
      id: 'mesh', name: '3D mesh moves',
      note: 'Displacement-mesh pushes — the modern "3D photo" look.',
      make() {
        const p = { version: 1, name: '3D mesh moves', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(
          T({ type: 'demo', demo: 'street' }, 5, 'mesh-rush', {}, { look: 'teal', vignette: 0.45, grain: 0.1 }, { depth: { renderer: 'mesh' }, transition: 'zoom' }),
          T({ type: 'demo', demo: 'horseman' }, 5, 'mesh-zoom', {}, { look: 'none', vignette: 0.4, grain: 0.1 }, { depth: { renderer: 'mesh' }, transition: 'defocus' }),
          T({ type: 'demo', demo: 'room' }, 5, 'mesh-zoom', { amount: 0.5 }, { look: 'warm', vignette: 0.45, grain: 0.1 }, { depth: { renderer: 'mesh' } }),
        );
        return p;
      },
    },
    {
      id: 'blank', name: 'Blank project',
      note: 'One demo shot, everything default. Replace the photo with yours.',
      make() {
        const p = { version: 1, name: 'Untitled parallax video', width: 1920, height: 1080, fps: 30, shots: [] };
        p.shots.push(T({ type: 'demo', demo: 'horseman' }, 5, 'push', { amount: 0.24 }, { look: 'warm', vignette: 0.45, grain: 0.12 }));
        return p;
      },
    },
  ];

  return { LIST };
})();
