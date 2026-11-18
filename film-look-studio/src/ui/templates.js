// Ready-made looks. Each template is a full project; layers come from named presets
// (ENG.layerFromPreset) with fixed seeds so every load is identical.
FL.templates = (() => {
  const ENG = FL.engine;
  const L = (pid, at, seed, extra) => {
    const l = ENG.layerFromPreset(pid, at || 0, seed);
    if (!l) return null;
    return Object.assign(l, extra || {});
  };
  const base = (name, demo, dur) => {
    const p = ENG.defaultProject();
    p.name = name; p.duration = dur || 8;
    p.source.demo = demo || 'fort';
    return p;
  };
  const LIST = [
    {
      name: 'Old newsreel', note: 'Sepia, grain, flicker and a 16 mm gate — the archive-bin look.',
      make() {
        const p = base('Old newsreel', 'street', 8);
        p.layers = [L('sepia-classic', 0, 7), L('flicker-subtle', 0, 12), L('grain-classic', 0, 21),
          L('dust-clean', 0, 5), L('gate-16mm', 0, 33), L('weave-subtle', 0, 9), L('vignette-soft', 0, 14)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Vintage 8 mm home film', note: 'Faded colour, heavy grain, dust, scratches, gate weave and a splice burn.',
      make() {
        const p = base('Vintage 8 mm home film', 'street', 8);
        p.layers = [L('faded-stock', 0, 7), L('grain-8mm', 0, 11), L('dust-damaged', 0, 23),
          L('scratch-emulsion', 0, 4), L('gate-super8', 0, 31), L('weave-8mm', 0, 17), L('halation-film', 0, 8),
          L('burn-classic', 4, 44, { fadeOut: 0.6 })].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Archival photo album', note: 'Aged print with foxing, a slow drift and a typed paper caption.',
      make() {
        const p = base('Archival photo album', 'fort', 8);
        p.layers = [L('photo-1940s', 0, 7), L('grain-fine', 0, 12), L('float-archival', 0, 3),
          L('vignette-soft', 0, 14), L('label-archive-tape', 1, 6)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'VHS tape', note: 'Chroma bleed, tracking noise, scanlines and a tape-deck display.',
      make() {
        const p = base('VHS tape', 'valley', 8);
        p.layers = [L('vhs-home', 0, 7), L('scan-fine', 0, 10), L('rgb-subtle', 0, 19),
          L('osd-play', 0, 5)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'War documentary', note: 'Desaturated grade, letterbox, halation, handheld camera and one impact.',
      make() {
        const p = base('War documentary', 'fort', 8);
        p.layers = [L('wardoc-classic', 0, 7), L('letterbox-cinema', 0, 10), L('halation-film', 0, 13),
          L('grain-classic', 0, 22), L('handheld-doc', 0, 3), L('shake-impact', 4.2, 41)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Teal & orange film', note: 'The modern documentary grade with halation, grain and a warm leak.',
      make() {
        const p = base('Teal & orange film', 'valley', 8);
        p.layers = [L('teal-film', 0, 7), L('halation-film', 0, 13), L('grain-fine', 0, 22),
          L('letterbox-2', 0, 10), L('vignette-soft', 0, 14), L('leak-warm', 0, 6, { opacity: 0.7 })].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Light leaks pack', note: 'Layered warm leaks with bloom and one flash at the middle cut.',
      make() {
        const p = base('Light leaks pack', 'valley', 8);
        p.layers = [L('leak-warm', 0, 7), L('leak-golden-edge', 0, 12, { opacity: 0.85 }),
          L('bloom-soft', 0, 9), L('flash-warm', 4, 36, { fadeIn: 0.02, fadeOut: 0.25 })].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Case file', note: 'Manila dossier frame, sepia, a classified stamp and a redaction sweep.',
      make() {
        const p = base('Case file', 'street', 10);
        p.layers = [L('sepia-light', 0, 7), L('grain-fine', 0, 12), L('dossier-case-file', 0, 15),
          L('stamp-classified', 1.1, 26), L('redact-sweep', 3.5, 4)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Hindi archival caption', note: 'Sepia with a typed Devanagari paper-tape caption and vignette.',
      make() {
        const p = base('Hindi archival caption', 'fort', 8);
        p.layers = [L('sepia-classic', 0, 7), L('grain-fine', 0, 12), L('vignette-soft', 0, 14),
          L('label-hindi', 1, 6)].filter(Boolean);
        return p;
      },
    },
    {
      name: 'Blank', note: 'Nothing on top — build your own stack from the library.',
      make() { return base('Untitled film look', 'fort', 8); },
    },
  ];
  return { LIST };
})();
