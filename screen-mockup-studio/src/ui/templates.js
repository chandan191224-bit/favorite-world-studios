// Ready-made projects. Every shot comes from a named preset, so the templates stay in sync
// with the library (and stay deterministic).
SM.templates = (() => {
  const ENG = SM.engine, PS = SM.presetShots;
  const T = [];

  function project(name, ids, transitions) {
    const shots = PS(ids);
    shots.forEach((s, i) => {
      if (i > 0) s.transition = Object.assign({ type: 'fade', dur: 0.5 }, (transitions || [])[i - 1] || {});
    });
    return { version: 1, name, width: 1920, height: 1080, fps: 30, shots };
  }

  T.push({ name: 'Documentary opener', note: 'Phone hero → search → article zoom', make: () => project('Documentary opener',
    ['phone-hero-photo', 'search-laptop', 'article-zoom'],
    [{ type: 'dip', dur: 0.6 }, { type: 'zoom', dur: 0.7 }]) });

  T.push({ name: 'Research story', note: 'Search on phone, article, player', make: () => project('Research story',
    ['search-phone', 'article-focus-out', 'player-phone'],
    [{ type: 'slide', dur: 0.55 }, { type: 'fade', dur: 0.5 }]) });

  T.push({ name: 'Investigation', note: 'Terminal → dossier → CCTV wall → bodycam', make: () => project('Investigation',
    ['terminal-window', 'classified-zoom', 'cctv-wall-room', 'bodycam-handheld'],
    [{ type: 'whip', dur: 0.45 }, { type: 'dip', dur: 0.6 }, { type: 'fade', dur: 0.5 }]) });

  T.push({ name: 'News bulletin', note: 'Split screen, full picture, player', make: () => project('News bulletin',
    ['news-tv-split', 'news-full-window', 'monitor-player'],
    [{ type: 'slide', dur: 0.5 }, { type: 'fade', dur: 0.5 }]) });

  T.push({ name: 'Old school', note: 'CRT, camcorder, paper dossier', make: () => project('Old school',
    ['camcorder-crt', 'crt-photo', 'classified-crt'],
    [{ type: 'dip', dur: 0.6 }, { type: 'zoom', dur: 0.65 }]) });

  T.push({ name: 'Phone day', note: 'Lock screen → call → player (vertical)', make: () => project('Phone day',
    ['notify-lock', 'call-phone', 'player-phone'],
    [{ type: 'slide', dur: 0.5 }, { type: 'fade', dur: 0.5 }]) });

  T.push({ name: 'Cinema frame', note: 'One wide shot on a cinema screen', make: () => project('Cinema frame',
    ['cinema-widescreen', 'flat-photo'], [{ type: 'fade', dur: 0.8 }]) });

  T.push({ name: 'Blank', note: 'One empty shot to build from', make: () => project('Blank', ['flat-photo']) });

  return { LIST: T };
})();
