// Preset recipes: the named looks from the research catalogue. Each preset = a camera move
// plus atmosphere, grade and depth settings, applied to a shot with one click.
// Pure data — build.mjs also copies this block into presets.json for the command-line pipeline.
(() => {
  const preset = PP.fx.preset;
/* PRESETS-START */
  // --- Push & pull ---
  preset('push-doc', 'Documentary push', 'Push & pull', 'The standard move: slow push, layers separate, soft vignette.',
    { fx: 'push', params: { amount: 0.24 } }, 5, { demo: 'horseman', grade: { look: 'warm', vignette: 0.45, grain: 0.12 } });
  preset('push-archive', 'Archive slow push', 'Push & pull', 'Gentle push for old stills — grain, warm fade, heavy vignette.',
    { fx: 'push-soft', params: { amount: 0.15 } }, 7, { demo: 'factory', grade: { look: 'faded', vignette: 0.55, grain: 0.3 } });
  preset('push-detail', 'Zoom into the detail', 'Push & pull', 'Hard push into a face or detail, fast start, soft landing.',
    { fx: 'push-detail', params: { amount: 1.8 } }, 4, { demo: 'factory', grade: { look: 'warm', vignette: 0.5, grain: 0.15 }, depth: { bands: 6, parallax: 0.7 } });
  preset('pull-reveal', 'Pull back reveal', 'Push & pull', 'Start close, pull back and reveal the whole scene.',
    { fx: 'pull', params: { amount: 0.22 } }, 5, { demo: 'desert', grade: { look: 'cold', vignette: 0.4 } });
  preset('push-lean', 'Push with lean', 'Push & pull', 'Push in with a slight dutch lean — tension.',
    { fx: 'push', params: { amount: 0.26, roll: 4.5 } }, 5, { demo: 'horseman', grade: { look: 'sepia', vignette: 0.5, grain: 0.2 } });
  preset('push-tilt-up', 'Push + tilt up', 'Push & pull', 'Dolly in while tilting up to the sky.',
    { fx: 'push-tilt', params: { amount: 0.22, tilt: 0.24 } }, 5.5, { demo: 'ridge', grade: { look: 'warm', vignette: 0.35 } });
  preset('push-tilt-down', 'Push + tilt down', 'Push & pull', 'Dolly in while tilting down to the ground.',
    { fx: 'push-tilt', params: { amount: 0.2, tilt: -0.22 } }, 5.5, { demo: 'ridge', grade: { look: 'warm', vignette: 0.35 } });

  // --- Truck & pan ---
  preset('truck-right', 'Truck right', 'Truck & pan', 'Slide right — foreground sweeps past fastest.',
    { fx: 'truck', params: { dist: 0.17, dir: '1' } }, 5, { demo: 'steps', grade: { look: 'none', vignette: 0.4 } });
  preset('truck-left', 'Truck left', 'Truck & pan', 'Slide left — foreground sweeps past fastest.',
    { fx: 'truck', params: { dist: 0.17, dir: '-1' } }, 5, { demo: 'steps', grade: { look: 'none', vignette: 0.4 } });
  preset('truck-occlude', 'Truck behind foreground', 'Truck & pan', 'Strong lateral move where a foreground object passes the camera.',
    { fx: 'truck', params: { dist: 0.3, dir: '-1', push: 0.05 } }, 6, { demo: 'steps', grade: { look: 'warm', vignette: 0.45 }, depth: { bands: 6, parallax: 0.95 } });
  preset('pan-slow', 'Slow pan (panorama)', 'Truck & pan', 'Long, near-linear pan across a wide photo.',
    { fx: 'pan', params: { dist: 0.14 } }, 6, { demo: 'ridge', grade: { look: 'none', vignette: 0.35 }, depth: { parallax: 0.35 } });
  preset('crane-rise', 'Crane rise', 'Tilt & crane', 'The camera rises and pushes in gently.',
    { fx: 'crane', params: { rise: 0.22 } }, 6, { demo: 'ridge', grade: { look: 'warm', vignette: 0.35 } });
  preset('tilt-up-sky', 'Tilt up to the sky', 'Tilt & crane', 'From the ground up to the sky with a soft push.',
    { fx: 'push-tilt', params: { amount: 0.18, tilt: 0.34 } }, 6, { demo: 'ridge', grade: { look: 'warm', vignette: 0.3 }, depth: { parallax: 0.5 } });

  // --- Orbit & dolly-zoom ---
  preset('orbit-subject', 'Arc around subject', 'Orbit & dolly-zoom', 'A short orbit around the subject at the focus point.',
    { fx: 'orbit', params: { arc: 26 } }, 6, { demo: 'horseman', grade: { look: 'warm', vignette: 0.45 } });
  preset('orbit-wide', 'Wide orbit', 'Orbit & dolly-zoom', 'A bigger arc for wide scenes.',
    { fx: 'orbit', params: { arc: 46, radius: 0.2 } }, 7, { demo: 'desert', grade: { look: 'cold', vignette: 0.4 } });
  preset('vertigo', 'Vertigo push', 'Orbit & dolly-zoom', 'Subject stays constant while the background stretches.',
    { fx: 'vertigo', params: { amount: 0.45, zoom: 0.05 } }, 5, { demo: 'street', grade: { look: 'teal', vignette: 0.5 } });
  preset('vertigo-rev', 'Vertigo pull', 'Orbit & dolly-zoom', 'Reverse dolly zoom — the world compresses.',
    { fx: 'vertigo', params: { amount: 0.45, zoom: 0.05, mode: 'pull' } }, 5, { demo: 'street', grade: { look: 'teal', vignette: 0.5 } });

  // --- Sway & drift ---
  preset('sway', 'Pendulum sway', 'Sway & drift', 'Hand-held sway that settles by the end.',
    { fx: 'sway', params: {} }, 6, { demo: 'room', grade: { look: 'warm', vignette: 0.4 } });
  preset('drift', 'Ambient drift', 'Sway & drift', 'The photo never sits still — a slow living drift.',
    { fx: 'drift', params: {} }, 8, { demo: 'room', grade: { look: 'warm', vignette: 0.35 } });
  preset('breathe', 'Breathing hold', 'Sway & drift', 'One slow breath. Nearly still.',
    { fx: 'breathe', params: {} }, 6, { demo: 'desert', grade: { look: 'cold', vignette: 0.3 } });

  // --- Mesh 3D ---
  preset('mesh-zoom', '3D zoom (mesh)', 'Mesh 3D', 'Depth-displaced mesh camera push — the modern look.',
    { fx: 'mesh-zoom', params: {} }, 5, { demo: 'horseman', grade: { look: 'none', vignette: 0.4 }, depth: { renderer: 'mesh' } });
  preset('mesh-rush', 'Mesh fly-through', 'Mesh 3D', 'Push through the mesh — for streets, corridors, arches.',
    { fx: 'mesh-rush', params: {} }, 5, { demo: 'street', grade: { look: 'teal', vignette: 0.45 }, depth: { renderer: 'mesh' } });

  // --- Documentary looks ---
  preset('kid-stays', 'Photo comes alive (classic)', 'Documentary looks', 'The archival cut-out look: strong separation, B/W, grain, vignette.',
    { fx: 'push', params: { amount: 0.34 } }, 5, { demo: 'factory', grade: { look: 'bw2', vignette: 0.6, grain: 0.3 }, depth: { bands: 4, parallax: 0.95 } });
  preset('teal-embers', 'Teal night + embers', 'Documentary looks', 'Cold teal grade, warm embers rising, letterbox.',
    { fx: 'push', params: { amount: 0.22 } }, 6, { demo: 'desert', atmos: [{ kind: 'embers' }], grade: { look: 'teal', vignette: 0.55, letterbox: 2.39 } });
  preset('god-rays', 'Window light rays', 'Documentary looks', 'Soft god rays sweep an interior while the camera pushes.',
    { fx: 'push-soft', params: { amount: 0.16 } }, 6, { demo: 'room', atmos: [{ kind: 'rays' }, { kind: 'dust' }], grade: { look: 'warm', vignette: 0.45 } });
  preset('fog-valley', 'Foggy valley drift', 'Documentary looks', 'Drifting fog bands behind the subject.',
    { fx: 'drift', params: {} }, 8, { demo: 'ridge', atmos: [{ kind: 'fog' }, { kind: 'haze' }], grade: { look: 'cold', vignette: 0.4 } });
  preset('dust-battle', 'Dust & smoke', 'Documentary looks', 'Dark drifting smoke and dust over a warm grade.',
    { fx: 'push', params: { amount: 0.26 } }, 6, { demo: 'horseman', atmos: [{ kind: 'smoke' }, { kind: 'dust' }], grade: { look: 'warm', vignette: 0.55, grain: 0.18 } });
  preset('bokeh-dream', 'Bokeh dream', 'Documentary looks', 'Soft bokeh orbs and a light leak drifting across.',
    { fx: 'drift', params: { amp: 0.03 } }, 7, { demo: 'room', atmos: [{ kind: 'bokeh' }, { kind: 'leak' }], grade: { look: 'faded', vignette: 0.45 } });
  preset('year-chip', 'Year chip caption', 'Documentary looks', 'Push with a red year chip and a Hindi caption.',
    { fx: 'push', params: { amount: 0.2 } }, 6, { demo: 'factory', overlays: [{ kind: 'caption', text: 'कहानी यहीं से बदल गई', year: '1947' }], grade: { look: 'bw', vignette: 0.5, grain: 0.22 } });
  preset('name-tag', 'Name tag lower third', 'Documentary looks', 'Documentary push with a stacked name tag.',
    { fx: 'push', params: { amount: 0.18 } }, 6, { demo: 'steps', overlays: [{ kind: 'nametag', text: 'एक महान इंसान', sub: '1952 – 2020' }], grade: { look: 'sepia', vignette: 0.45 } });
  preset('place-marker', 'Place label + ring', 'Documentary looks', 'Push onto a place marker with a pulsing ring.',
    { fx: 'push-detail', params: { amount: 0.6 } }, 5, { demo: 'desert', overlays: [{ kind: 'place', text: 'रामेश्वरम्', x: 0.52, y: 0.5 }], grade: { look: 'warm', vignette: 0.45 } });

  // --- Subject cut-out: Nitish Rajput / Dhruv Rathee 3-layer frames, 2026-11-15 ---
  // subject = cut out by depth, rim-lit, own zoom. background = clean plate, blurred/darkened/desaturated/tinted.
  // (no semicolons in comments here: build.mjs splits this block on them for presets.json)
  // Put the focus point on the subject. Text with depth below 0.8 sits BEHIND the subject.
  preset('cutout-rim', 'Cut-out + gold rim', 'Subject cut-out', 'Nitish-style: subject cut out with a warm gold rim glow over a soft, darker background.',
    { fx: 'push-soft', params: { amount: 0.12 } }, 5, { demo: 'horseman', grade: { look: 'none', vignette: 0.55, grain: 0.1 },
      subject: { on: true, rim: '#ffb547', rimAmt: 0.9, rimGlow: 0.5, rimWidth: 0.35, bgSat: 0.55, bgDim: 0.3, bgBlur: 0.35, bgTintAmt: 0, fgSat: 1, pop: 0.06 } });
  preset('cutout-bw', 'B&W subject on colour', 'Subject cut-out', 'Memory look: black-and-white subject with a gold edge over the full-colour scene.',
    { fx: 'push-soft', params: { amount: 0.12 } }, 5, { demo: 'horseman', grade: { look: 'none', vignette: 0.5, grain: 0.14 },
      subject: { on: true, rim: '#ffbf5e', rimAmt: 1, rimGlow: 0.45, rimWidth: 0.4, fgSat: 0, fgContrast: 1.18, bgSat: 1, bgDim: 0.22, bgBlur: 0.25, bgTintAmt: 0, pop: 0.05 } });
  preset('cutout-teal', 'Colour subject, teal background', 'Subject cut-out', 'Object/person pops in full colour with a cyan rim; the scene behind goes cold teal.',
    { fx: 'push', params: { amount: 0.14 } }, 5, { demo: 'horseman', grade: { look: 'none', vignette: 0.6, grain: 0.1 },
      subject: { on: true, rim: '#59e3ff', rimAmt: 0.85, rimGlow: 0.55, rimWidth: 0.3, bgSat: 0.15, bgDim: 0.35, bgBlur: 0.3, bgTint: '#0e3a46', bgTintAmt: 0.55, fgSat: 1.1, pop: 0.07 } });
  preset('cutout-name', 'Cut-out + stencil name', 'Subject cut-out', 'Character intro: rim-lit subject with a big worn stencil name beside it.',
    { fx: 'push-soft', params: { amount: 0.1 } }, 6, { demo: 'horseman', grade: { look: 'none', vignette: 0.5, grain: 0.12 },
      subject: { on: true, rim: '#ffb547', rimAmt: 0.8, rimGlow: 0.45, rimWidth: 0.3, bgSat: 0.7, bgDim: 0.25, bgBlur: 0.3, bgTintAmt: 0, fgSat: 1, pop: 0.05 },
      overlays: [{ kind: 'stencil', text: 'THE\nSPY', style: 'stencil', x: 0.07, y: 0.3, size: 0.15, depth: 0.6 }] });
  preset('depth-title', 'Giant title behind subject', 'Subject cut-out', 'Dhruv-style: one huge word sits between the background and the subject.',
    { fx: 'push-soft', params: { amount: 0.1 } }, 5, { demo: 'horseman', grade: { look: 'none', vignette: 0.4, grain: 0.08 },
      subject: { on: true, rimAmt: 0, bgSat: 1, bgDim: 0.12, bgBlur: 0.22, bgTintAmt: 0, fgSat: 1, pop: 0.03 },
      overlays: [{ kind: 'stencil', text: 'EMPIRE', style: 'clean', align: 'center', x: 0.5, y: 0.08, size: 0.3, depth: 0.6, reveal: 'fade' }] });

  // --- Weather & mood ---
  preset('rain-street', 'Rain on the street', 'Weather & mood', 'Cold blue grade with slanting rain.',
    { fx: 'truck', params: { dist: 0.14, dir: '-1' } }, 6, { demo: 'street', atmos: [{ kind: 'rain' }], grade: { look: 'cold', vignette: 0.55, grain: 0.15 } });
  preset('snow-archive', 'Snowy archive', 'Weather & mood', 'Falling snow over a monochrome archive still.',
    { fx: 'push-soft', params: { amount: 0.14 } }, 7, { demo: 'factory', atmos: [{ kind: 'snow' }], grade: { look: 'bw', vignette: 0.55, grain: 0.25 } });
  preset('lightning-storm', 'Lightning storm', 'Weather & mood', 'Cold flashes with bolts on a dark push.',
    { fx: 'push', params: { amount: 0.2 } }, 6, { demo: 'ridge', atmos: [{ kind: 'lightning' }, { kind: 'rain', amount: 0.25 }], grade: { look: 'cold', vignette: 0.65 } });

  // --- Ken Burns ---
  preset('kb-push', 'Ken Burns push (flat)', 'Ken Burns', 'Flat zoom with no layer separation.',
    { fx: 'kb', params: { amount: 0.22 } }, 6, { demo: 'horseman', grade: { look: 'none', vignette: 0.3 }, depth: { parallax: 0 } });
  preset('kb-pan', 'Ken Burns pan (flat)', 'Ken Burns', 'Flat pan across the photo.',
    { fx: 'kb', params: { amount: 0.05, x: 0.12 } }, 6, { demo: 'ridge', grade: { look: 'none', vignette: 0.3 }, depth: { parallax: 0 } });
/* PRESETS-END */
})();
