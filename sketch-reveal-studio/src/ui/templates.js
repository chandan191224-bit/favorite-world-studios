// Ready-made projects. Each template replaces the current project.
SK.templates = (() => {
  const E = SK.engine;
  const base = { version: 1, width: 1920, height: 1080, fps: 30, lang: 'hi', media: {} };
  const mk = (name, note, shotDefs, transDefs, extra = {}) => ({
    name, note,
    make: () => Object.assign({}, base, {
      name,
      shots: shotDefs.map(([preset, over]) => E.newShot(preset, over || {})),
      transitions: transDefs.map(([preset, over]) => E.newTrans(preset, over || {})),
    }, extra),
  });
  const T = i => transDefs => transDefs; // readability noop

  const LIST = [
    mk('Hindi documentary opener', 'ऐतिहासिक पोर्ट्रेट, जगह का स्केच, वस्तु और पांडुलिपि — एक वृत्तचित्र की शुरुआत।', [
      ['story-portrait-historical'],
      ['story-place'],
      ['sty-stipple', { demo: 'object' }],
      ['story-manuscript'],
    ], [['tr-bleed'], ['tr-wash'], ['tr-radial']]),

    mk('Chapter pack', 'हर अलग ड्राइंग स्टाइल में अध्याय कार्ड।', [
      ['sty-engraving-portrait'],
      ['sty-pencil-portrait'],
      ['sty-inkwash', { demo: 'place' }],
      ['sty-blueprint', { demo: 'scene' }],
    ], [['tr-dissolve'], ['tr-dissolve'], ['tr-dissolve']]),

    mk('Portrait showcase', 'एक ही चेहरा, छह तरीकों से — कोई फ़ोटो नहीं बदली।', [
      ['sty-pencil-portrait'],
      ['sty-engraving-portrait', { seed: 21 }],
      ['sty-charcoal', { demo: 'portrait', photoAt: 3.6 }],
      ['sty-woodcut', { demo: 'portrait', photoReveal: 'none' }],
      ['sty-stipple', { demo: 'portrait', photoReveal: 'none' }],
      ['sty-chalk', { demo: 'portrait', photoReveal: 'none' }],
    ], [['tr-dissolve'], ['tr-dry'], ['tr-dissolve'], ['tr-dissolve'], ['tr-dissolve']]),

    mk('Event story', 'पुरानी घटना: नक्शा-सा दृश्य, क्रॉस-हैच, रंग उतरते हैं।', [
      ['story-event'],
      ['sty-crosshatch', { demo: 'scene', photoAt: 4.2 }],
      ['sty-halftone', { demo: 'scene', photoAt: 3.8 }],
    ], [['tr-bleed'], ['tr-pour']]),

    mk('Rotoscope reel', 'वीडियो क्लिप पर लाइन-आर्ट — stable और boiling दोनों।', [
      ['roto-ink-stable'],
      ['roto-ink-boil'],
      ['roto-cel'],
      ['roto-blueprint'],
    ], [['tr-dissolve'], ['tr-dissolve'], ['tr-brush']]),

    mk('Explainer chalkboard', 'चॉक और स्केची एनोटेशन — समझाने वाला वीडियो।', [
      ['sty-chalk', { demo: 'place', photoReveal: 'none', drawDur: 3.6 }],
      ['sty-chalk', { demo: 'scene', photoReveal: 'none', drawDur: 3.4, seed: 11 }],
    ], [['tr-dip']]),

    mk('Manuscript pack', 'पांडुलिपि पेज — शीर्षक, ब्योरा, चित्र।', [
      ['story-manuscript'],
      ['story-manuscript', { f: { heading: 'दूसरा पन्ना', body: 'यहाँ नई प्रविष्टि आती है।\nहर पंक्ति हाथ से लिखी जाती है।' }, seed: 31 }],
    ], [['tr-bleed']]),

    mk('Sketch ↔ photo study', 'आधा स्केच आधी फ़ोटो, सूखती फ़ोटो, रंग उतरना।', [
      ['story-split'],
      ['story-dry-back'],
      ['story-pour'],
    ], [['tr-split'], ['tr-dissolve']]),

    {
      name: 'अपनी फ़ोटो से शुरू करें', note: 'एक शॉट, पेंसिल स्केच, फ़ोटो फ़ेड-इन — अपनी फ़ोटो डालें और शुरू करें।',
      make: () => Object.assign({}, base, {
        name: 'नई प्रोजेक्ट',
        shots: [E.newShot('sty-pencil', { demo: 'portrait' })],
        transitions: [],
      }),
    },

    {
      name: 'Shorts vertical pack', note: '1080×1920 — रील्स/शॉर्ट्स के लिए तेज़ स्केच रिवील।',
      make: () => Object.assign({}, base, {
        name: 'Shorts sketch', width: 1080, height: 1920,
        shots: [
          E.newShot('story-portrait-pencil', { dur: 5 }),
          E.newShot('rev-fast-sketch', { dur: 4, demo: 'scene' }),
          E.newShot('sty-halftone', { demo: 'object', dur: 4.4, photoAt: 3.4 }),
        ],
        transitions: [E.newTrans('tr-bleed', { dur: 0.8 }), E.newTrans('tr-pour', { dur: 0.8 })],
      }),
    },
  ];

  return { LIST };
})();
