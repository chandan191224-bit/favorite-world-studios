// Ready-made starter projects (all use demo photos until the user drops their own — they load offline with no files).
CS.templates = (() => {
  const ENG = CS.engine;

  function scene(presetId, dur, labels, trans) {
    const s = ENG.newScene(presetId, dur);
    (labels || []).forEach((lb, i) => { if (s.slots[i]) s.slots[i].label = lb; });
    if (trans) s.trans = trans;
    return s;
  }
  function proj(name, scenes, w, h) {
    return { version: 1, name, width: w || 1920, height: h || 1080, fps: 30, scenes };
  }

  const LIST = [
    {
      id: 'blank', name: 'Blank', note: 'One photo, nothing else — start from scratch.',
      make: () => proj('Blank collage', [scene('photo-full', 4)], 1920, 1080),
    },
    {
      id: 'vs-story', name: 'Compare story (Hindi labels)', note: 'A vs B duel, before/after slider, side panel.',
      make: () => proj('Compare story', [
        scene('vs-duel', 5, ['गाँव', 'शहर'], { type: 'fade', dur: 0.5 }),
        scene('ab-panel', 5, ['पहले', 'बाद'], { type: 'push-left', dur: 0.6 }),
        scene('before-after', 5, ['पहले', 'बाद'], { type: 'fade', dur: 0.5 }),
      ]),
    },
    {
      id: 'scrap-story', name: 'Scrapbook story', note: 'B&W cut-outs on kraft, chaos-to-order, sticker pop-ins.',
      make: () => proj('Scrapbook story', [
        scene('jh-bw-collage', 6, ['कहानी', 'साल 1920', 'पहला दृश्य', 'वजह', 'नतीजा'], { type: 'zoom', dur: 0.6 }),
        scene('scrapbook-chaos-order', 6, ['एक', 'दो', 'तीन', 'चार', 'पाँच'], { type: 'slide-over', dur: 0.6 }),
        scene('sticker-pop', 5, ['', 'मुख्य किरदार', 'गवाह', 'जाँचकर्ता'], { type: 'fade', dur: 0.5 }),
      ]),
    },
    {
      id: 'split-pack', name: 'Split screen pack', note: '2, 3 and 4-way splits + a full-frame split push.',
      make: () => proj('Split screens', [
        scene('split-2-slide', 5, ['यहाँ', 'वहाँ'], { type: 'push-left', dur: 0.5 }),
        scene('split-3-columns', 5, ['रात', 'दिन', 'शाम'], { type: 'push-up', dur: 0.5 }),
        scene('split-4-grid', 5, ['एक', 'दो', 'तीन', 'चार'], { type: 'flash', dur: 0.4 }),
        scene('split-push-3', 6, [], { type: 'fade', dur: 0.5 }),
      ]),
    },
    {
      id: 'wall-story', name: 'Photo wall zoom', note: 'A wall of nine photos that zooms into one, then a 3×3 grid.',
      make: () => proj('Photo wall', [
        scene('wall-zoom-in', 6, [], { type: 'zoom', dur: 0.7 }),
        scene('grid-3x3-cascade', 5.5, [], { type: 'fade', dur: 0.5 }),
      ]),
    },
    {
      id: 'film-story', name: 'Film / contact sheet', note: 'Film strip scroll + contact sheet that zooms to one frame.',
      make: () => proj('Film look', [
        scene('filmstrip-scroll', 6, [], { type: 'flash', dur: 0.4 }),
        scene('contact-sheet-zoom', 6, [], { type: 'cut', dur: 0 }),
      ]),
    },
    {
      id: 'polar-story', name: 'Polaroid memories', note: 'Polaroids dealt and fanned, one slams down with a caption.',
      make: () => proj('Polaroids', [
        scene('polaroid-deal-fan', 6, ['पहली मुलाकात', 'यादें', 'सफ़र', 'दोस्त'], { type: 'fade', dur: 0.5 }),
        scene('polaroid-slam', 3.5, ['वो दिन'], { type: 'cut', dur: 0 }),
      ]),
    },
    {
      id: 'shorts', name: 'Shorts (1080×1920)', note: 'Vertical: stickers, masonry grid, vertical film strip.',
      make: () => proj('Shorts collage', [
        scene('sticker-lineup', 5, ['पहला', 'दूसरा', 'तीसरा', 'चौथा'], { type: 'fade', dur: 0.4 }),
        scene('grid-masonry', 5, [], { type: 'push-up', dur: 0.5 }),
        scene('filmstrip-vertical', 6, [], { type: 'fade', dur: 0.4 }),
      ], 1080, 1920),
    },
  ];

  return { LIST };
})();
