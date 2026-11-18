// Preset library — every named look the studio ships with, on the element registry.
// kinds: shot (default), 'trans' (applies to the selected transition),
// 'paper' (paper settings for the selected shot), 'layer' (adds a mark/label layer).
// Default text is Hindi-first with generic names only.
SK.presets = (() => {
  const L = [];

  // ---------------- Draw styles (one card per style, on the demo subject) ----------------
  const st = (id, name, note, p, f, dur, demo) => L.push(Object.assign({
    id, name, note, fam: 'Draw styles', el: 'photo', kind: 'shot', demo: demo || 'scene',
    dur: dur || 5.4,
  }, { p: Object.assign({ photoReveal: 'fade', photoAt: 4.15, photoDur: 1.0, drawDur: 4.0, order: 'natural', vignette: 0.3, photoAge: 0.5, detail: 0.62 }, p), f: f || {} }));

  st('sty-pencil', 'Pencil sketch', 'Graphite outline with soft form-following shading — the everyday sketch look.', { style: 'pencil' });
  st('sty-charcoal', 'Charcoal', 'Thick soft charcoal, smudged darks — dramatic and loose.', { style: 'charcoal' });
  st('sty-inkline', 'Ink line art', 'Clean contour lines only — editorial and light.', { style: 'inkline' });
  st('sty-inkwash', 'Ink wash (sumi-e)', 'Brush contours with layered grey washes — East-Asian ink painting.', { style: 'inkwash', photoAge: 0.35 });
  st('sty-engraving', 'Engraving / etching', 'Banknote-style line hatching that follows the forms.', { style: 'engraving', hatchDensity: 1.15, drawDur: 4.8, photoAt: 5.0, photoDur: 1.2 }, {}, 6.4);
  st('sty-woodcut', 'Woodcut / linocut', 'Bold posterised cuts, white gouges in solid black.', { style: 'woodcut', photoReveal: 'none', vignette: 0.15 }, {}, 5);
  st('sty-stipple', 'Stipple', 'Shading from thousands of hand-placed dots — old print feel.', { style: 'stipple', drawDur: 4.8, photoAt: 5.0, photoDur: 1.2 }, {}, 6.4);
  st('sty-crosshatch', 'Cross-hatch', 'Classic pen cross-hatching in two directions.', { style: 'crosshatch', hatchDensity: 1.05, drawDur: 4.8, photoAt: 5.0, photoDur: 1.2 }, {}, 6.4);
  st('sty-chalk', 'Chalk on blackboard', 'Soft white chalk with dust — classroom / explainer feel.', { style: 'chalk', photoReveal: 'none', vignette: 0.2 });
  st('sty-cpencil', 'Coloured pencil', 'Waxy colour under a graphite outline.', { style: 'cpencil', photoReveal: 'fade' });
  st('sty-watercolour', 'Watercolour wash', 'Loose transparent colour pools with a light contour.', { style: 'watercolour', photoAge: 0.3 });
  st('sty-halftone', 'Comic halftone', 'Posterised colour with a dot screen in the shadows.', { style: 'halftone', photoAge: 0.15, vignette: 0.1 });
  st('sty-manuscript', 'Manuscript illustration', 'Sepia ink on aged parchment.', { style: 'manuscript', paper: 'parchment' });
  st('sty-blueprint', 'Blueprint', 'White technical lines on a blue print with a faint grid.', { style: 'blueprint', photoReveal: 'fade', photoAge: 0.2, vignette: 0.1, drawDur: 4.4, photoAt: 4.6 });
  st('sty-engraving-portrait', 'Engraving portrait', 'The banknote treatment on a face — the history-channel classic.', { style: 'engraving', hatchDensity: 1.4, drawDur: 5.2, photoAt: 5.4, photoDur: 1.3, vignette: 0.45, photoAge: 0.7, labelY: 0.87, labelSize: 50 }, { label: 'राजस्व अधिकारी, 1897' }, 7.0, 'portrait');
  st('sty-pencil-portrait', 'Pencil portrait', 'Graphite portrait study on cream paper.', { style: 'pencil', vignette: 0.4, drawDur: 4.4, photoAt: 4.6 }, { label: 'एक अनाम चित्रकार की कॉपी' }, 6.0, 'portrait');

  // ---------------- Draw-on reveals ----------------
  const rv = (id, name, note, p, dur) => L.push({
    id, name, note, fam: 'Draw-on reveals', el: 'photo', kind: 'shot', demo: 'portrait',
    dur: dur || 6, f: { label: '' },
    p: Object.assign({ style: 'pencil', photoReveal: 'fade', photoAt: 4.3, photoDur: 1.3, drawDur: 4.1, vignette: 0.35 }, p),
  });
  rv('rev-outline-first', 'Outline first, then detail', 'Big contours first, details after — how an artist actually works.', { order: 'natural' });
  rv('rev-topdown', 'Top-down sweep', 'The drawing flows down the frame like a curtain.', { order: 'top', drawDur: 4.0, photoAt: 4.3 });
  rv('rev-centreout', 'Centre-out', 'Starts at the subject and grows outward.', { order: 'center', drawDur: 3.9, photoAt: 4.2 });
  rv('rev-subject', 'Subject first', 'The face arrives first, the background fills in around it.', { order: 'subject', drawDur: 4.2, photoAt: 4.5 });
  rv('rev-scatter', 'Seeded scatter', 'Lines land in a seeded random order — lively, loose.', { order: 'random', drawDur: 4.0, photoAt: 4.3 });
  rv('rev-artist', 'Artist at work (pencil)', 'A pencil follows every stroke while the portrait builds.', { order: 'natural', tool: 'pencil', drawDur: 5.2, photoAt: 5.5, photoDur: 1.0 }, 7.0);
  rv('rev-artist-pen', 'Artist at work (pen nib)', 'The steel nib draws the ink contours.', { order: 'natural', tool: 'pen', style: 'inkline', drawDur: 4.8, photoAt: 5.1, photoDur: 1.1 }, 6.6);
  rv('rev-fast-sketch', 'Fast sketch', 'A quick 2-second gesture sketch — energetic.', { order: 'natural', drawDur: 2.3, photoAt: 2.9, photoDur: 1.0, style: 'charcoal' }, 4.6);
  rv('rev-hatch-build', 'Hatching builds up', 'Long drawing where the shading passes grow band by band.', { style: 'crosshatch', drawDur: 6.4, photoAt: 6.7, photoDur: 1.1, hatchDensity: 0.95, tone: 0.85 }, 8.2);

  // ---------------- Transitions (apply to the selected transition chip) ----------------
  const tr = (id, name, note, p, dur) => L.push({ id, name, note, fam: 'Transitions', kind: 'trans', p: Object.assign({ type: id.replace(/^tr-/, '') }, p), dur });
  tr('tr-cut', 'Cut', 'Hard cut — no transition time.', { type: 'cut' }, 0);
  tr('tr-dissolve', 'Cross-dissolve', 'Soft crossfade between the two papers.', null, 0.7);
  tr('tr-bleed', 'Ink bleed', 'The next shot bleeds through like wet ink spreading.', null, 1.1);
  tr('tr-wash', 'Watercolour wipe', 'A wash band sweeps across, carrying the new shot in.', null, 1.1);
  tr('tr-radial', 'Radial reveal', 'Grows out of the subject as a wobbling circle.', null, 0.9);
  tr('tr-brush', 'Brush strokes', 'Broad brush strokes wipe the new shot in.', null, 1.0);
  tr('tr-pour', 'Colour pour', 'The new shot pours in from the top with drips.', null, 1.0);
  tr('tr-split', 'Split sweep', 'A wobbly line sweeps across: old on the right, new on the left.', null, 0.9);
  tr('tr-dip', 'Dip to paper', 'Fades to bare paper, then the next shot.', null, 0.8);
  tr('tr-dry', 'Photo dries to sketch', 'The photo dries back into a sketch before the cut.', null, 1.2);

  // ---------------- Paper & medium (settings for the selected shot) ----------------
  const pp = (id, name, note, p) => L.push({ id, name, note, fam: 'Paper & medium', kind: 'paper', p });
  pp('pap-cream', 'Sketchbook cream', 'Clean warm sketchbook paper, light grain.', { paper: 'cream', stains: 0.25, burn: 0, smudge: 0, eraser: 0 });
  pp('pap-parchment', 'Aged parchment', 'Yellowed parchment with age spots.', { paper: 'parchment', stains: 0.85, burn: 0.4 });
  pp('pap-burnt', 'Burnt-edge parchment', 'Heavily aged sheet, scorched edges.', { paper: 'parchment', stains: 1, burn: 0.95 });
  pp('pap-kraft', 'Kraft paper', 'Brown packing paper — warm and rough.', { paper: 'kraft', stains: 0.4 });
  pp('pap-board', 'Black chalkboard', 'Chalkboard with dust and a wooden frame — ink goes white.', { paper: 'board', smudge: 0.5, inkColor: '#f2efe6' });
  pp('pap-graph', 'Graph paper', 'Engineer\'s grid paper.', { paper: 'graph', grid: 0.35 });
  pp('pap-news', 'Newsprint', 'Old newspaper stock with halftone dots.', { paper: 'news', stains: 0.6 });
  pp('pap-graphite-smudge', 'Smudged + erased', 'Well-used sheet: smudges and eraser marks.', { smudge: 0.7, eraser: 0.8, stains: 0.5 });

  // ---------------- Annotations (add a layer to the selected shot) ----------------
  const an = (id, name, note, layer) => L.push({ id, name, note, fam: 'Annotations', kind: 'layer', layer });
  an('ann-circle', 'Hand-drawn circle', 'Wobbly red circle around the detail.', { kind: 'mark', mark: 'circle', x: 0.62, y: 0.38, size: 150, color: '#c8372d', start: 1.2, dur: 0.9 });
  an('ann-arrow', 'Hand-drawn arrow', 'Curved arrow pointing at the spot.', { kind: 'mark', mark: 'arrow', x: 0.44, y: 0.5, size: 120, color: '#c8372d', start: 1.2, dur: 0.9, rot: 0.2 });
  an('ann-underline', 'Underline', 'Two quick underline strokes.', { kind: 'mark', mark: 'underline', x: 0.5, y: 0.66, size: 150, color: '#c8372d', start: 1.2, dur: 0.8, double: true });
  an('ann-cross', 'Cross-out', 'Red X over the wrong part.', { kind: 'mark', mark: 'cross', x: 0.35, y: 0.35, size: 110, color: '#c8372d', start: 1.4, dur: 0.8 });
  an('ann-bracket', 'Bracket', 'Groups a region with a hand bracket.', { kind: 'mark', mark: 'bracket', x: 0.7, y: 0.5, size: 140, color: '#c8372d', start: 1.2, dur: 0.9 });
  an('ann-star', 'Star', 'Excited hand-drawn star burst.', { kind: 'mark', mark: 'star', x: 0.58, y: 0.3, size: 150, color: '#ffd84a', start: 1.2, dur: 0.9 });
  an('ann-box', 'Box', 'Rough rectangle drawn around the detail.', { kind: 'mark', mark: 'box', x: 0.5, y: 0.5, size: 130, color: '#c8372d', start: 1.2, dur: 1.0 });
  an('ann-label', 'Ink label', 'Handwritten Hindi label with a leader line.', { kind: 'label', text: 'यहाँ ध्यान दें', x: 0.3, y: 0.2, size: 52, color: '#2c2416', start: 1.2, dur: 1.4, underline: true, leader: [0.55, 0.42] });

  // ---------------- Video rotoscope ----------------
  const rt = (id, name, note, p, dur) => L.push({
    id, name, note, fam: 'Video rotoscope', el: 'roto', kind: 'shot', demo: 'clip', dur: dur || 5,
    f: {},
    p: Object.assign({ photoReveal: 'none' }, p),
  });
  rt('roto-ink-stable', 'Ink line (stable)', 'Clean line art of the clip — no flicker.', { roto: 'ink', boil: 0 });
  rt('roto-ink-boil', 'Ink line (boiling)', 'The deliberate hand-drawn boil at 10 fps.', { roto: 'ink', boil: 10 });
  rt('roto-pencil-boil', 'Pencil boil', 'Wobbly pencil sketch redrawn every frame.', { roto: 'pencil', boil: 12 });
  rt('roto-charcoal', 'Charcoal film', 'Heavy charcoal treatment with smudged darks.', { roto: 'charcoal', boil: 8 });
  rt('roto-blueprint', 'Blueprint film', 'White lines on a moving blue print.', { roto: 'blueprint', boil: 0 });
  rt('roto-cel', 'Posterised cel', 'Flat cel colour with inked contours — animated look.', { roto: 'cel', boil: 0, celLevels: 4 });

  // ---------------- Scenes & stories ----------------
  const sc = (id, name, note, el, demo, dur, f, p) => L.push({
    id, name, note, fam: 'Scenes & stories', el, kind: 'shot', demo, dur, f: f || {},
    p: p || {},
  });
  sc('story-portrait-historical', 'Historical portrait reveal', 'The classic: an engraving draws on over a vignetted portrait, the photo fades in, and the name writes itself in ink below.',
    'photo', 'portrait', 7.8,
    { label: 'एक बड़ा आदमी', sub: '1861 – 1936 · वकील, लेखक' },
    { style: 'engraving', hatchDensity: 1.2, drawDur: 5.4, photoAt: 5.6, photoDur: 1.6, photoAge: 0.75, photoVig: 0.7, vignette: 0.5, frame: 0.6, labelAt: 5.9, labelSize: 58, order: 'natural' });
  sc('story-portrait-pencil', 'Pencil portrait + name', 'Softer take: graphite portrait, gentle fade, ink name line.',
    'photo', 'portrait', 6.8,
    { label: 'स्टेशन मास्टर', sub: '1943 की एक तस्वीर' },
    { style: 'pencil', drawDur: 4.6, photoAt: 4.9, photoDur: 1.3, photoAge: 0.6, vignette: 0.4, labelAt: 5.2 });
  sc('story-event', 'Old event illustration', 'A monument scene draws on and colour washes over the crowd.',
    'photo', 'scene', 7.4,
    { label: 'राजधानी का द्वार', sub: '' },
    { style: 'crosshatch', drawDur: 5.0, photoAt: 5.3, photoDur: 1.4, photoAge: 0.55, vignette: 0.35, labelAt: 5.6, labelY: 0.88 });
  sc('story-place', 'Place sketch → real', 'The landscape sketches itself, then the real place arrives.',
    'photo', 'place', 6.8,
    { label: 'नदी और पुल', sub: 'आज और सौ साल पहले' },
    { style: 'inkwash', drawDur: 4.6, photoAt: 4.9, photoDur: 1.4, photoAge: 0.4, vignette: 0.25, labelAt: 5.2 });
  sc('story-stipple-object', 'Museum still life', 'A stippled museum object on parchment with a plate label.',
    'photo', 'object', 7.2,
    { label: 'जेबी घड़ी, c. 1910', sub: 'संग्रह संख्या १९-ए' },
    { style: 'stipple', paper: 'parchment', drawDur: 5.4, photoAt: 5.7, photoDur: 1.1, photoAge: 0.65, vignette: 0.4, labelAt: 6.0, labelFont: 'tiro' });
  sc('story-manuscript', 'Manuscript page', 'Aged page: illustration in a ruled box, heading and body writing on by hand.',
    'manuscript', 'object', 9.5,
    { heading: 'यात्रा का ब्योरा', body: 'हम भोर होते होते पहुँचे।\nपहला पहरूआ मिला और रास्ता दिखा।\nशाम तक किनारे आ गए।' },
    { style: 'manuscript', drawDur: 5.4, textAt: 5.8, writeSpeed: 1.0 });
  sc('story-split', 'Half sketch / half photo', 'The frame holds half drawing, half real photo — comparison shots.',
    'photo', 'portrait', 6.6,
    { label: 'पहले और अब', sub: '' },
    { style: 'pencil', photoReveal: 'splitHold', photoAt: 4.3, photoDur: 1.2, drawDur: 4.1, vignette: 0.3, labelAt: 4.8 });
  sc('story-dry-back', 'Photo dries to a sketch', 'The photo shows, then dries back into the drawing before the cut.',
    'photo', 'place', 7.0,
    { label: 'यादें फीकी पड़ती हैं', sub: '' },
    { style: 'inkline', photoReveal: 'fade', photoAt: 1.8, photoDur: 1.2, dryBack: 2.6, drawDur: 2.2, vignette: 0.35, labelAt: 2.4 });
  sc('story-pour', 'Colour pours in', 'Ink drawing holds while colour floods into the lines.',
    'photo', 'scene', 6.8,
    { label: 'रंग भरते ही तस्वीर बदल जाती है', sub: '' },
    { style: 'inkline', photoReveal: 'pour', photoAt: 4.0, photoDur: 2.0, drawDur: 3.6, vignette: 0.25, labelAt: 4.5, labelSize: 44 });
  sc('story-chalk-lesson', 'Chalkboard lesson', 'Chalk sketch with an arrow and a handwritten note — explainer style.',
    'photo', 'place', 6.8,
    { label: 'रास्ता यहीं से मुड़ता है', sub: '' },
    { style: 'chalk', paper: 'board', photoReveal: 'none', drawDur: 4.6, vignette: 0.15, labelAt: 5.0, labelColor: '#f2efe6',
      layers: [{ kind: 'mark', mark: 'arrow', x: 0.6, y: 0.4, size: 130, color: '#ffd84a', start: 4.4, dur: 0.9, rot: 0.3 }] });

  const byId = {};
  L.forEach(p => (byId[p.id] = p));
  const FAMS = ['Draw styles', 'Draw-on reveals', 'Transitions', 'Paper & medium', 'Annotations', 'Video rotoscope', 'Scenes & stories'];
  return { list: L, byId, FAMS };
})();
