// Named looks: device x content x camera x background x focus. These fill the library, the
// templates and the default project. Everything deterministic (seed fixed per preset).
SM.presets = (() => {
  const U = SM.util, ENG = SM.engine;
  const list = [], byId = {};
  function preset(id, name, family, note, spec) {
    const p = { id, name, family, note, spec: Object.assign({ name }, spec) };
    p.spec.seed = p.spec.seed || 7;
    list.push(p); byId[id] = p;
  }

  // ---------------- Devices (your photo/video inside a device) ----------------
  preset('phone-hero-photo', 'Phone hero photo', 'Devices', 'Your photo fills a phone that swings in, then floats.',
    { dur: 5.5, device: { id: 'phone', finish: 'graphite', orient: 'portrait', island: true }, content: { id: 'media', media: '', fit: 'cover', kb: 0.07 },
      camera: { move: 'swing', ease: 'inOut', amount: 1, from: 0.05, to: 0.92 }, bg: { id: 'studio' }, focus: { auto: false }, glare: 0.6, shadow: 0.75 });

  preset('phone-video-push', 'Phone video push', 'Devices', 'A video playing on a phone, slow push.',
    { dur: 5, device: { id: 'phone', finish: 'midnight', orient: 'portrait' }, content: { id: 'media', media: '', fit: 'cover', kb: 0.02 },
      camera: { move: 'push', amount: 0.9 }, bg: { id: 'blur', dim: 0.5 }, glare: 0.5 });

  preset('tablet-photo-float', 'Tablet gentle float', 'Devices', 'Photo on a silver tablet, drifting camera.',
    { dur: 6, device: { id: 'tablet', finish: 'silver', orient: 'landscape' }, content: { id: 'media', fit: 'cover', kb: 0.05 },
      camera: { move: 'float', amount: 1.4 }, bg: { id: 'amber' } });

  preset('laptop-photo-tilt', 'Laptop tilt up', 'Devices', 'Laptop on a desk, camera tilts up to reveal the screen.',
    { dur: 5.5, device: { id: 'laptop', finish: 'silver', open: 108 }, content: { id: 'media', fit: 'cover', kb: 0.05 },
      camera: { move: 'rise', ease: 'inOut', amount: 1, from: 0.05, to: 0.92 }, bg: { id: 'night' } });

  preset('monitor-player', 'Monitor video player', 'Devices', 'A player page filling a desktop monitor.',
    { dur: 6, device: { id: 'monitor', finish: 'graphite' }, content: { id: 'player', dark: true },
      camera: { move: 'pull', amount: 0.8 }, bg: { id: 'studio' } });

  preset('crt-photo', 'Old CRT TV', 'Devices', 'A wood-cabinet CRT with curved glass and scanlines.',
    { dur: 6, device: { id: 'crt', body: 'wood', curve: 0.6, scan: 0.55 }, content: { id: 'media', fit: 'cover', kb: 0.03 },
      camera: { move: 'orbit', ease: 'inOut', amount: 0.7 }, bg: { id: 'desk' } });

  preset('cinema-widescreen', 'Cinema screen', 'Devices', 'Your video on a cinema screen, projector beam and seats.',
    { dur: 7, device: { id: 'cinema', seats: true, curtains: true, beam: true }, content: { id: 'media', fit: 'cover', kb: 0.04 },
      camera: { move: 'push', amount: 0.55 }, bg: { id: 'none' }, glare: 0.25, shadow: 0 });

  preset('window-call-grid', 'Video call (window)', 'Devices', 'A call grid inside a floating app window.',
    { dur: 6.5, device: { id: 'window', ratio: '16:10', theme: 'dark', thick: 4 }, content: { id: 'call', layout: 'grid', speaking: 2 },
      camera: { move: 'swing', ease: 'inOut', amount: 0.8, from: 0.04, to: 0.9 }, bg: { id: 'grid' } });

  preset('flat-photo', 'Full-frame photo', 'Devices', 'No device at all — just your picture with a slow Ken Burns.',
    { dur: 5, device: { id: 'flat' }, content: { id: 'media', fit: 'cover', kb: 0.12 },
      camera: { move: 'static' }, bg: { id: 'color', color: '#101216' }, glare: 0, shadow: 0 });

  // ---------------- Web ----------------
  preset('search-laptop', 'Search typing (laptop)', 'Web', 'The classic: typing a query, suggestions, then the results page.',
    { dur: 7, device: { id: 'laptop', finish: 'silver' }, content: { id: 'search', dark: false, showResults: true, speed: 1 },
      camera: { move: 'pan', amount: 0.6 }, bg: { id: 'paper' }, glare: 0.45 });

  preset('search-phone', 'Search typing (phone)', 'Web', 'Same search story on a phone, vertical layout.',
    { dur: 7, device: { id: 'phone', orient: 'portrait' }, content: { id: 'search', dark: false, showResults: true },
      camera: { move: 'push', amount: 0.8 }, bg: { id: 'studio' } });

  preset('article-zoom', 'Article zoom to line', 'Web', 'An encyclopedia article scrolls, highlights a line, then the camera dives to it.',
    { dur: 8, device: { id: 'window', ratio: '16:10', theme: 'light' }, content: { id: 'article', dark: false, hl: 4, hlAt: 0.5, scroll: 0.45 },
      camera: { move: 'focus', ease: 'inOut', from: 0.05, to: 0.72 }, bg: { id: 'paper' },
      focus: { auto: true, zoom: 0.62, blur: 0.8, dim: 0.42 }, glare: 0.35 });

  preset('article-focus-out', 'Focus then pull back', 'Web', 'Zooms to the highlighted line, holds, then pulls back out.',
    { dur: 9, device: { id: 'window', ratio: '16:10', theme: 'dark' }, content: { id: 'article', dark: true, hl: 6, hlAt: 0.4 },
      camera: { move: 'focusOut', ease: 'inOut' }, bg: { id: 'night' }, focus: { auto: true, zoom: 0.66, blur: 0.9, dim: 0.55 } });

  preset('player-monitor', 'Player page on monitor', 'Web', 'A video-watch page on a big monitor, pulling back.',
    { dur: 6, device: { id: 'monitor' }, content: { id: 'player', dark: true, start: 0.15, end: 0.4 },
      camera: { move: 'pull', amount: 0.7 }, bg: { id: 'night' } });

  preset('inbox-monitor', 'Mail on a monitor', 'Web', 'An inbox that opens its first message and highlights a line.',
    { dur: 7.5, device: { id: 'monitor', finish: 'midnight' }, content: { id: 'inbox', openAt: 0.42, hlLine: 4 },
      camera: { move: 'rise', amount: 0.85 }, bg: { id: 'studio' } });

  // ---------------- Broadcast ----------------
  preset('news-tv-split', 'News channel (split)', 'Broadcast', 'Generic news frame: anchor + report boxes, lower third, ticker.',
    { dur: 7, device: { id: 'tv', stand: 'feet' }, content: { id: 'news', layout: 'split', live: true, clock: '21:30:00' },
      camera: { move: 'push', amount: 0.5 }, bg: { id: 'studio' }, glare: 0.3 });

  preset('news-phone-vertical', 'News on a phone', 'Broadcast', 'The same news frame made for a vertical phone screen.',
    { dur: 6.5, device: { id: 'phone', finish: 'graphite' }, content: { id: 'news', layout: 'full', headline: 'सीमा पर बड़ी बातचीत' },
      camera: { move: 'float', amount: 1.2 }, bg: { id: 'night' } });

  preset('news-full-window', 'News full picture', 'Broadcast', 'Full-bleed news picture in a floating window.',
    { dur: 6, device: { id: 'window', ratio: '16:9', theme: 'dark' }, content: { id: 'news', layout: 'full' },
      camera: { move: 'pan', amount: 0.7 }, bg: { id: 'studio' } });

  // ---------------- Ops ----------------
  preset('terminal-window', 'Terminal, swing in', 'Ops', 'A green shell window swinging in over a tech grid.',
    { dur: 7.5, device: { id: 'window', ratio: '16:10', theme: 'dark' }, content: { id: 'terminal', theme: 'green', speed: 30, rain: true },
      camera: { move: 'swing', ease: 'inOut', amount: 0.75, from: 0.04, to: 0.9 }, bg: { id: 'grid' } });

  preset('terminal-dive', 'Dive into the terminal', 'Ops', 'The camera dives right into the shell until it fills the frame.',
    { dur: 7, device: { id: 'window', ratio: '16:10', theme: 'dark' }, content: { id: 'terminal', theme: 'amber', speed: 34 },
      camera: { move: 'dive', ease: 'inOut', from: 0.25, to: 0.95 }, bg: { id: 'night' } });

  preset('classified-monitor', 'Classified dossier', 'Ops', 'A restricted file on a monitor; lines get blacked out.',
    { dur: 8, device: { id: 'monitor', finish: 'graphite' }, content: { id: 'classified', redact: 3, stamp: 'TOP SECRET', scan: true },
      camera: { move: 'pull', amount: 0.65 }, bg: { id: 'desk' } });

  preset('classified-zoom', 'Dossier zoom', 'Ops', 'The camera zooms to the dossier body while the rest blurs.',
    { dur: 8, device: { id: 'window', ratio: '16:10', theme: 'dark' }, content: { id: 'classified', redact: 2 },
      camera: { move: 'focus', ease: 'inOut', from: 0.15, to: 0.8 }, bg: { id: 'night' }, focus: { auto: true, zoom: 0.66, blur: 0.75, dim: 0.4 } });

  preset('classified-crt', 'Dossier on CRT', 'Ops', 'The same file read on an old beige CRT.',
    { dur: 8, device: { id: 'crt', body: 'beige', curve: 0.35, scan: 0.2 }, content: { id: 'classified', redact: 3 },
      camera: { move: 'orbit', amount: 0.55 }, bg: { id: 'desk' } });

  // ---------------- HUD ----------------
  preset('cctv-monitor', 'Security camera', 'HUD', 'One CCTV feed with timecode and REC blink.',
    { dur: 5.5, device: { id: 'monitor', finish: 'midnight' }, content: { id: 'cctv', tint: 'green', cam: 'CAM 03', clock: '21:47:05' },
      camera: { move: 'static' }, bg: { id: 'night' }, glare: 0.2 });

  preset('cctv-crt', 'CCTV on old CRT', 'HUD', 'A green-tinted feed on a wood-cabinet CRT.',
    { dur: 5.5, device: { id: 'crt', body: 'black', curve: 0.5, scan: 0.35 }, content: { id: 'cctv', tint: 'green', cam: 'CAM 07' },
      camera: { move: 'float', amount: 1 }, bg: { id: 'desk' } });

  preset('cctv-wall-room', 'Control room wall', 'HUD', 'Four feeds, one tile goes into alert.',
    { dur: 7, device: { id: 'monitor' }, content: { id: 'cctvwall', grid: '4', alertTile: 3, tint: 'green', clock: '23:12:44' },
      camera: { move: 'push', amount: 0.9 }, bg: { id: 'night' } });

  preset('bodycam-handheld', 'Body camera', 'HUD', 'Bodycam HUD with handheld camera shake.',
    { dur: 6, device: { id: 'window', ratio: '16:9', theme: 'dark' }, content: { id: 'bodycam', unit: 'UNIT 4471', battery: 84, clock: '02:14:33' },
      camera: { move: 'handheld', amount: 1.4 }, bg: { id: 'none' }, glare: 0.15 });

  preset('drone-optical', 'Drone telemetry', 'HUD', 'Optical drone view with full telemetry.',
    { dur: 6.5, device: { id: 'window', ratio: '16:9', theme: 'dark' }, content: { id: 'drone', thermal: false, altitude: 124, speed: 36 },
      camera: { move: 'float', amount: 1 }, bg: { id: 'night' } });

  preset('drone-thermal', 'Drone thermal', 'HUD', 'The same drone shot in thermal colours.',
    { dur: 6.5, device: { id: 'window', ratio: '16:9', theme: 'dark' }, content: { id: 'drone', thermal: true, altitude: 96 },
      camera: { move: 'push', amount: 0.9 }, bg: { id: 'night' } });

  preset('camcorder-crt', 'Home video on CRT', 'HUD', 'A camcorder viewfinder playing on an old TV.',
    { dur: 6, device: { id: 'crt', body: 'wood', curve: 0.45, scan: 0.3 }, content: { id: 'camcorder', mode: 'REC', color: 'amber' },
      camera: { move: 'orbit', amount: 0.5 }, bg: { id: 'desk' } });

  // ---------------- Phone screens ----------------
  preset('notify-lock', 'Notifications stacking', 'Phone screens', 'A lock screen that fills up with notifications.',
    { dur: 8, device: { id: 'phone', finish: 'graphite' }, content: { id: 'notify', lock: true, gap: 1.5 },
      camera: { move: 'swing', ease: 'outExpo', amount: 0.7 }, bg: { id: 'studio' } });

  preset('call-phone', 'Video call on phone', 'Phone screens', 'A call grid made for the vertical phone screen.',
    { dur: 6.5, device: { id: 'phone', orient: 'portrait' }, content: { id: 'call', layout: 'spotlight', speaking: 1 },
      camera: { move: 'float', amount: 1.2 }, bg: { id: 'night' } });

  preset('player-phone', 'Player on phone', 'Phone screens', 'A watch page in vertical layout.',
    { dur: 6, device: { id: 'phone', finish: 'midnight' }, content: { id: 'player', dark: true, start: 0.2, end: 0.45 },
      camera: { move: 'push', amount: 1 }, bg: { id: 'studio' } });

  // ---------------- Focus moves ----------------
  preset('dive-phone-photo', 'Dive into the phone', 'Focus moves', 'The camera flies right into a phone screen.',
    { dur: 6, device: { id: 'phone', orient: 'portrait' }, content: { id: 'media', fit: 'cover', kb: 0.02 },
      camera: { move: 'dive', ease: 'inOut', from: 0.3, to: 0.95 }, bg: { id: 'blur', dim: 0.55 } });

  preset('reveal-screen-device', 'Screen to device reveal', 'Focus moves', 'Starts inside the picture, pulls back to show the device.',
    { dur: 6, device: { id: 'monitor' }, content: { id: 'media', fit: 'cover' },
      camera: { move: 'reveal', ease: 'inOut', from: 0.05, to: 0.92 }, bg: { id: 'studio' } });

  preset('search-then-zoom', 'Search then zoom', 'Focus moves', 'Search results appear, then the camera zooms into one.',
    { dur: 8, device: { id: 'laptop', finish: 'silver' }, content: { id: 'search', dark: false, showResults: true, pick: 1 },
      camera: { move: 'focus', ease: 'inOut', from: 0.55, to: 0.9 }, bg: { id: 'paper' },
      focus: { auto: true, zoom: 0.6, blur: 0.7, dim: 0.35 }, glare: 0.4 });

  const FAMILIES = ['Devices', 'Web', 'Broadcast', 'Ops', 'HUD', 'Phone screens', 'Focus moves'];

  // shots built from preset ids (used by the default project + templates)
  SM.presetShots = ids => (ids || []).map(id => {
    const p = byId[id]; if (!p) return null;
    const s = ENG.newShot(p.spec);
    s.name = p.name;
    return s;
  }).filter(Boolean);

  return { list, byId, FAMILIES, presetShots: SM.presetShots };
})();
