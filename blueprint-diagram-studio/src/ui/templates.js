// Ready-made projects. Each template replaces the current project.
BD.templates = (() => {
  const E = BD.engine;
  const bg = over => Object.assign({ type: 'none', color: '#0b0d11', media: null, fit: 'cover', zoom: 0, start: 0, loop: true }, over || {});
  const base = { version: 1, width: 1920, height: 1080, fps: 30, lang: 'hi', bg: bg() };
  const mk = (name, note, shots, extra = {}) => ({ name, note, make: () => Object.assign({}, base, { name, shots: shots.map(c => E.newShot(c[0], c[1] || {})) }, extra) });

  const LIST = [
    mk('Hindi documentary: किला', 'किले की दीवार खिंचती है, फिर विस्फोटित दृश्य और गुंबद — इतिहास एपिसोड का ढाँचा।', [
      ['bp-fort-blueprint', { dur: 7 }],
      ['ex-wall-cutaway', { dur: 6, trans: 'fade' }],
      ['bp-dome-blueprint', { dur: 6.5, trans: 'fade' }],
      ['la-photo-labels', { dur: 7, trans: 'fade' }],
    ]),
    mk('Military pack', 'टैंक, पनडुब्बी, रॉकेट और लड़ाकू विमान — रक्षा वीडियो का सेट।', [
      ['bp-tank-clean', { dur: 6.5 }],
      ['bp-submarine-navy', { dur: 6.5, trans: 'fade' }],
      ['ex-rocket-exploded', { dur: 6, trans: 'fade' }],
      ['bp-jet-neon', { dur: 6, trans: 'fade' }],
      ['mc-gears-mesh', { dur: 7, trans: 'fade' }],
    ]),
    mk('How it works (Hindi)', 'मशीन कैसे काम करती है — प्रक्रिया, गियर, पिस्टन।', [
      ['pr-steps-sequence', { dur: 6 }],
      ['mc-pulley-lift', { dur: 7, trans: 'fade' }],
      ['mc-piston-crank', { dur: 7, trans: 'fade' }],
      ['pr-cycle-loop', { dur: 6.5, trans: 'fade' }],
    ]),
    mk('Economy explainer', 'पैसा कैसे बहता है — पाइपलाइन, फ़नल, तुलना।', [
      ['pr-pipeline-flow', { dur: 6.5 }],
      ['pr-funnel-stage', { dur: 6, trans: 'fade' }],
      ['rl-compare-table', { dur: 5.5, trans: 'fade' }],
      ['rl-venn2', { dur: 5, trans: 'fade' }],
    ]),
    mk('Dynasty history (Hindi)', 'वंशावली, उत्तराधिकार और बड़ा वृक्ष — इतिहास की सीरीज़।', [
      ['tr-dynasty-tree', { dur: 9 }],
      ['tr-succession', { dur: 8, trans: 'fade' }],
      ['tr-bigtree-pan', { dur: 9, trans: 'fade' }],
    ]),
    mk('Scale & wonder', 'पैमाने का एहसास — ऊँचाई, विशाल पर्वत, समुद्र की गहराई।', [
      ['sc-height-lineup', { dur: 6.5 }],
      ['sc-giant-reveal', { dur: 7.5, trans: 'fade' }],
      ['cr-sea-depth', { dur: 7, trans: 'fade' }],
      ['cr-earth-layers', { dur: 7, trans: 'fade' }],
    ]),
    mk('Engineering set', 'बाँध, पुल, सुरंग — इंजीनियरिंग डॉक्यूमेंट्री का सेट।', [
      ['bp-dam-graphite', { dur: 7 }],
      ['bp-bridge-chalk', { dur: 7, trans: 'fade' }],
      ['cr-tunnel-shaft', { dur: 7, trans: 'fade' }],
      ['wf-rocket-blueprint', { dur: 8, trans: 'fade' }],
    ]),
    mk('English labels pack', 'English-labelled versions — for bilingual edits.', [
      ['bp-fort-blueprint', { dur: 6.5, f: { title: 'Fortress wall', sub: 'ELEVATION · SHEET 01', labels: 'Gate|MAIN GATE\nTower|FLANKING TOWER\nMerlon|CRENELLATION' } }],
      ['pr-steps-sequence', { dur: 6, trans: 'fade', f: { title: 'How it works', items: 'Raw material | RAW\nStorage | STORE\nAssembly | BUILD\nDelivery | DELIVER' } }],
      ['sc-height-lineup', { dur: 6, trans: 'fade', f: { title: 'How tall?', sub: 'HEIGHT COMPARISON', items: 'person | Person | 1.7\ncar | Car | 1.5\nbus | Bus | 3.2\nplane | Aircraft | 12' } }],
    ]),
    {
      name: 'Shorts vertical pack', note: '1080×1920 — रील्स/शॉर्ट्स के लिए त्वरित डायग्राम।',
      make: () => Object.assign({}, base, {
        name: 'Shorts vertical pack', width: 1080, height: 1920, bg: bg({ type: 'none' }),
        shots: [
          E.newShot('bp-rocket-neon', { dur: 5.5 }),
          E.newShot('pr-chain-cause', { dur: 5, trans: 'fade' }),
          E.newShot('sc-giant-reveal', { dur: 6, trans: 'fade' }),
          E.newShot('rl-venn2', { dur: 4.5, trans: 'fade' }),
        ],
      }),
    },
    mk('Blank', 'खाली प्रोजेक्ट — एक ब्लूप्रिंट शॉट के साथ शुरू।', [['bp-fort-blueprint']]),
  ];

  return { LIST };
})();
