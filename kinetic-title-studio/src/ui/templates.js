// Ready-made projects. Each template replaces the current project.
KT.templates = (() => {
  const E = KT.engine;
  const bg = over => Object.assign({ type: 'demo', color: '#101014', media: null, fit: 'cover', zoom: 0, start: 0, loop: true }, over || {});
  const base = { version: 1, width: 1920, height: 1080, fps: 30, lang: 'hi', bg: bg() };
  const mk = (name, note, clips, extra = {}) => ({ name, note, make: () => Object.assign({}, base, { name, clips: clips.map(c => E.newClip(c[0], c[1] || {})) }, extra) });

  const LIST = [
    mk('Hindi documentary opening', 'अध्याय कार्ड, गोल्ड टाइटल, आँकड़े और कोट — एक वृत्तचित्र की शुरुआत।', [
      ['mt-hindi-display'], ['mt-gold', { dur: 3.6 }], ['nm-crore', { dur: 4 }], ['qc-marks', { dur: 6 }],
    ]),
    mk('Chapter pack', 'एक फ़िल्म के अध्याय कार्ड — हर अलग अंदाज़ में।', [
      ['mt-condensed'], ['mt-hindi-display'], ['mt-band'], ['mt-split'], ['mt-typewriter'],
    ]),
    mk('Interview pack', 'इंटरव्यू सेट — लोअर थर्ड, कॉलआउट और कोट।', [
      ['lt-doc'], ['co-label', { x: 0.6, y: 0.46, dur: 4 }], ['lt-serif'], ['co-spotlight', { dur: 4 }], ['qc-card', { dur: 6 }],
    ]),
    mk('Stats sequence', 'आँकड़ों की सीरीज़ — करोड़, प्रतिशत, प्रोग्रेस।', [
      ['nm-rupee'], ['nm-crore'], ['nm-percent-ring'], ['nm-bar'], ['nm-odo'],
    ]),
    mk('News break', 'ब्रेकिंग स्ट्रिप, न्यूज़ लोअर थर्ड और बड़ा आँकड़ा।', [
      ['so-ticker'], ['lt-news'], ['nm-rupee', { f: { label: 'राहत राशि', to: '5200000000' }, dur: 4.2 }], ['co-measure', { dur: 4 }],
    ]),
    mk('Social proof', 'पोस्ट, चैट, कमेंट और नोटिफ़िकेशन — सोशल प्रूफ़ का पैक।', [
      ['so-post'], ['so-comment'], ['so-notify'], ['so-chat'],
    ]),
    mk('Match cut sequence', 'एक शब्द, कई बैकग्राउंड — वॉक्स स्टाइल।', [
      ['mc-headline'], ['mc-docs'], ['mc-fontswap'], ['hl-marker', { dur: 5 }],
    ]),
    mk('Captions showcase', 'हर कैप्शन स्टाइल एक के बाद एक।', [
      ['cap-classic'], ['cap-boxed'], ['cap-karaoke'], ['cap-pop'], ['cap-wordbox'], ['cap-reveal'], ['cap-cine'], ['cap-hinglish'],
    ]),
    {
      name: 'Shorts vertical pack', note: '1080×1920 — रील्स/शॉर्ट्स के लिए पॉप कैप्शन और पंच टाइटल।',
      make: () => Object.assign({}, base, {
        name: 'Shorts vertical pack', width: 1080, height: 1920, bg: bg({ type: 'color', color: '#101014' }),
        clips: [
          E.newClip('kt-punch', { dur: 2.6 }),
          E.newClip('cap-pop', { dur: 4.5 }),
          E.newClip('nm-compact', { dur: 4 }),
          E.newClip('kt-word-rise', { dur: 3.4 }),
        ],
      }),
    },
    mk('Blank', 'खाली प्रोजेक्ट — एक टाइटल के साथ शुरू।', [['kt-word-rise']]),
  ];

  return { LIST };
})();
