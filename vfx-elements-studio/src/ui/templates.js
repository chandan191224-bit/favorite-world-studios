// Ready-made projects. Each template replaces the current project; every one works with
// no user files (built-in demo scenes drawn procedurally).
VFX.templates = (() => {
  const E = VFX.engine;
  const bg = over => Object.assign({ type: 'demo', backdrop: 'city', color: '#101014', media: null, fit: 'cover', zoom: 0.08, fx: 0.5, fy: 0.5, start: 0, loop: true }, over || {});
  const base = { version: 1, width: 1920, height: 1080, fps: 30, lang: 'hi', media: {} };
  const mk = (name, note, shots) => ({
    name, note,
    make: () => Object.assign({}, base, { name, shots: shots.map(s => E.newShot(s)) }),
  });

  const LIST = [
    mk('युद्ग्रस्त शहर (War-torn city)', 'युद्ध का माहौल — काला धुआँ, तोपों की चमक, अंगारे और राख।', [
      { name: 'युद्ध का माहौल', dur: 8, bg: bg({ backdrop: 'ruins' }), layers: [{ preset: 'cb-war-city' }] },
      { name: 'धुआँ और राख', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: bg({ backdrop: 'ruins', zoom: 0.12 }), layers: [{ preset: 'sm-war-black', p: { x: 0.38 } }, { preset: 'pa-ash-fall' }] },
    ]),
    mk('Partition night', 'आग की रात — नारंगी चमक, धुआँ, अंगारे। 1947 जैसे रात के शॉट।', [
      { name: 'आग की रात', dur: 9, bg: bg({ backdrop: 'city' }), layers: [{ preset: 'cb-partition-night' }] },
      { name: 'अंगारे और राख', dur: 7, trans: { type: 'fade', dur: 0.7 }, bg: bg({ backdrop: 'city', zoom: 0.1 }), layers: [{ preset: 'fi-embers', p: { amount: 1.3 } }, { preset: 'pa-ash-fall' }] },
    ]),
    mk('Storm arrives', 'तूफ़ान आ रहा है — काले बादल, तिरछी बारिश, बिजली।', [
      { name: 'बादल घिर आए', dur: 7, bg: bg({ backdrop: 'field' }), layers: [{ preset: 'sk-storm-clouds' }, { preset: 'sk-cloud-shadows' }] },
      { name: 'तूफ़ान', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: bg({ backdrop: 'field', zoom: 0.1 }), layers: [{ preset: 'cb-storm-arrives' }] },
    ]),
    mk('Dust bowl', 'सूखा और धूल — रेगिस्तानी आँधी, उड़ते कागज़, भूरा रंग।', [
      { name: 'धूल का फ़ाटक', dur: 9, bg: bg({ backdrop: 'field' }), layers: [{ preset: 'cb-dust-bowl' }] },
      { name: 'उड़ते दस्तावेज़', dur: 7, trans: { type: 'dip', dur: 0.6 }, bg: bg({ backdrop: 'ruins', zoom: 0.06 }), layers: [{ preset: 'pa-paper-fly', p: { amount: 1.2 } }, { preset: 'sm-ground-fog', p: { tint: '#c8a86e' } }] },
    ]),
    mk('Winter front', 'ठंडी मोर्चाबंदी — बर्फ़, धुंध और ठंडा रंग।', [
      { name: 'बर्फ़ीला मोर्चा', dur: 9, bg: bg({ backdrop: 'field' }), layers: [{ preset: 'cb-winter-front' }] },
      { name: 'ग्राउंड फ़ॉग', dur: 7, trans: { type: 'fade', dur: 0.9 }, bg: bg({ backdrop: 'field', zoom: 0.05 }), layers: [{ preset: 'sm-fog-bank', p: { tint: '#dfe8f2' } }, { preset: 'we-snow-gentle' }] },
    ]),
    mk('Burning archive', 'जलता अभिलेख — फ़ोटो किनारों से जलती है, चिंगारियाँ और राख।', [
      { name: 'जलता अभिलेख', dur: 7, bg: bg({ backdrop: 'ruins' }), layers: [{ preset: 'cb-burning-archive' }] },
      { name: 'जलती लाइन', dur: 6, trans: { type: 'dip', dur: 0.7 }, bg: bg({ backdrop: 'ruins', zoom: 0.08 }), layers: [{ preset: 'fi-line' }] },
    ]),
    mk('Rain on the window', 'शीशे पर बारिश — आपकी फ़ुटेज गीले शीशे के पीछे।', [
      { name: 'शीशे पर बारिश', dur: 10, bg: bg({ backdrop: 'city', zoom: 0.1 }), layers: [{ preset: 'wa-rain-window' }] },
      { name: 'बूँदें और छींटे', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: bg({ backdrop: 'city', zoom: 0.14 }), layers: [{ preset: 'we-rain-splash' }, { preset: 'sm-ground-fog', p: { amount: 0.5 } }] },
    ]),
    mk('Heat & dust (desert)', 'रेगिस्तान की लपटें — गर्मी की कँपकँपी, धूल के कण, धूप की चमक।', [
      { name: 'गर्मी की लहर', dur: 9, bg: bg({ backdrop: 'field' }), layers: [{ preset: 'fi-heat' }, { preset: 'sk-sun-glare' }] },
      { name: 'धूल के कण', dur: 7, trans: { type: 'fade', dur: 0.7 }, bg: bg({ backdrop: 'field', zoom: 0.1 }), layers: [{ preset: 'pa-dust-motes' }, { preset: 'we-wind-leaves', p: { amount: 0.6 } }] },
    ]),
    mk('Battle sequence', 'लड़ाई का सिलसिला — मज़ल फ़्लैश, गोलियाँ, धूल और विस्फ़ोट।', [
      { name: 'मुँह की चमक', dur: 5, bg: bg({ backdrop: 'ruins' }), layers: [{ preset: 'ex-muzzle', p: { x: 0.3, y: 0.6 } }, { preset: 'sm-impact-puff', p: { x: 0.7, y: 0.8 } }] },
      { name: 'ज़मीन पर गोलियाँ', dur: 6, trans: { type: 'dip', dur: 0.5 }, bg: bg({ backdrop: 'field', zoom: 0.08 }), layers: [{ preset: 'ex-bullet-hits' }] },
      { name: 'बड़ा विस्फ़ोट', dur: 6, trans: { type: 'fade', dur: 0.6 }, bg: bg({ backdrop: 'ruins', zoom: 0.05 }), layers: [{ preset: 'ex-fireball' }] },
    ]),
    mk('Night & water', 'रात और पानी — तारे, झरने की छलक और नीली रोशनी।', [
      { name: 'तारों भरी रात', dur: 9, bg: bg({ backdrop: 'field' }), layers: [{ preset: 'sk-night-stars' }] },
      { name: 'पानी की छलक', dur: 5, trans: { type: 'dip', dur: 0.6 }, bg: bg({ backdrop: 'city', zoom: 0.1 }), layers: [{ preset: 'wa-splash' }] },
      { name: 'कॉस्टिक्स', dur: 8, trans: { type: 'fade', dur: 0.8 }, bg: bg({ backdrop: 'city', zoom: 0.12 }), layers: [{ preset: 'wa-caustics' }] },
    ]),
    {
      name: 'Shorts vertical pack', note: '1080×1920 — रील्स/शॉर्ट्स के लिए मौसम और माहौल।',
      make: () => Object.assign({}, base, {
        name: 'Shorts vertical pack', width: 1080, height: 1920, media: {},
        shots: [
          E.newShot({ name: 'बारिश', dur: 6, bg: bg({ backdrop: 'city' }), layers: [E.newLayer('we-rain-heavy')] }),
          E.newShot({ name: 'अंगारे', dur: 6, trans: { type: 'fade', dur: 0.6 }, bg: bg({ backdrop: 'city' }), layers: [E.newLayer('fi-embers', { p: { amount: 1.3 } })] }),
          E.newShot({ name: 'तारे', dur: 6, trans: { type: 'fade', dur: 0.6 }, bg: bg({ backdrop: 'field' }), layers: [E.newLayer('sk-night-stars')] }),
        ],
      }),
    },
    mk('Blank', 'खाली प्रोजेक्ट — एक शॉट और डेमो दृश्य के साथ शुरू।', [
      { name: 'शॉट 1', dur: 8, bg: bg(), layers: [{ preset: 'sm-column' }] },
    ]),
  ];

  return { LIST };
})();
