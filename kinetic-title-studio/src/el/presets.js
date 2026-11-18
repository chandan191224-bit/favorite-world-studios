// Preset library — every named look the studio ships with, built on the element registry.
// Each preset: { id, name, note, fam, el, dur?, x?, y?, f: {fields}, p: {params} }.
// Fields/params only need to differ from the element defaults; the engine merges.
// Default text is Hindi-first (Favorite World is a Hindi channel) with generic names only —
// no real brands, no real people, never the word "AI" in any text that appears in a video.
KT.presets = (() => {
  const L = [];

  // ---------------- Movie titles / chapter cards (user preference: animated movie-style text) ----------------
  const mt = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Movie titles', el: 'title', dur: dur || 4, f, p });

  mt('mt-condensed', 'Condensed cinema', 'Heavy condensed caps, hard slam-in, cinema bars — the classic movie opening card.',
    { label: 'अध्याय एक', title: 'THE LEGACY', sub: 'एक वृत्तचित्र शृंखला' },
    { font: 'khand', size: 168, upper: true, in: 'slam', unit: 'all', inDur: 0.9, ease: 'outExpo', out: 'fade', outDur: 0.4, deco: 'letterbox', shadow: 0.7, font2: 'khand', accent: '#e8c35a' });
  mt('mt-hindi-display', 'Hindi display card', 'Rozha One display Devanagari, gentle rise, thin rule — a Hindi chapter card.',
    { label: 'भाग एक', title: 'आज़ादी की कहानी', sub: '1947 की गवाहगिरी' },
    { font: 'rozha', size: 132, color: '#f3e8d2', emph: '#e5a93c', in: 'rise', unit: 'word', inDur: 2.6, spread: 0.55, ease: 'cine', out: 'fade', outDur: 0.5, deco: 'line', shadow: 0.5, font2: 'mukta', accent: '#e5a93c' });
  mt('mt-gold', 'Gold epic', 'Gold metal fill with a light sweep — big-budget title.',
    { label: '', title: 'महागाथा', sub: 'THE EPIC SAGA' },
    { font: 'khand', size: 150, fill: 'gold', in: 'track', unit: 'all', inDur: 2.2, ease: 'cine', out: 'blur', outDur: 0.5, deco: 'rules', post: 'shine', glow: 0.35, font2: 'montserrat', accent: '#e8c35a' });
  mt('mt-silver', 'Silver chrome', 'Chrome letters zooming out of a blur.',
    { label: '', title: 'FUTURE CITY', sub: 'भविष्य का शहर' },
    { font: 'anton', size: 140, fill: 'silver', upper: true, in: 'zoom', unit: 'all', inDur: 2.0, ease: 'outExpo', out: 'blur', outDur: 0.45, post: 'shine', shadow: 0.4 });
  mt('mt-fire', 'Fire title', 'Fire gradient fill with a burning flicker.',
    { label: 'सीज़न 2', title: 'ज्वालामुखी', sub: '' },
    { font: 'khand', size: 155, fill: 'fire', in: 'flicker', unit: 'word', inDur: 2.2, spread: 0.4, out: 'glitch', outDur: 0.5, glow: 0.5, deco: 'band', shadow: 0.3, font2: 'khand', accent: '#ff9230' });
  mt('mt-tracked', 'Wide-tracked caps', 'Wide letter-spacing, letters appear one by one — prestige drama style.',
    { label: '', title: 'THE HONOR', sub: 'एक सम्मान कथा' },
    { font: 'bebas', size: 92, tracking: 0.45, upper: true, in: 'track', unit: 'cluster', inDur: 3.0, spread: 0.9, ease: 'cine', out: 'fade', outDur: 0.5, shadow: 0.4 });
  mt('mt-serif', 'Cinematic serif', 'Cinzel caps inside drawn corner frames.',
    { label: 'प्रस्तुत करते हैं', title: 'THE INHERITANCE', sub: 'विरासत' },
    { font: 'cinzel', size: 108, color: '#efe6d0', in: 'fade', unit: 'all', inDur: 2.4, ease: 'cine', out: 'fade', outDur: 0.6, deco: 'frame', accent: '#cfa64b', font2: 'cinzel', shadow: 0.3 });
  mt('mt-glitch', 'Glitch / RGB split', 'Digital glitch with RGB channels splitting apart.',
    { label: '', title: 'SYSTEM ERROR', sub: 'तंत्र में गड़बड़ी' },
    { font: 'montserrat', size: 130, upper: true, in: 'glitch', unit: 'word', inDur: 2.4, spread: 0.5, out: 'glitch', outDur: 0.5, deco: 'band', shadow: 0.2, emph: '#21e6ff' });
  mt('mt-3d', '3D depth', 'Long 3D extrude shadow, popping in with overshoot.',
    { label: '', title: 'DECISION 1971', sub: '' },
    { font: 'anton', size: 150, upper: true, extrude: 1.6, in: 'pop', unit: 'all', inDur: 1.1, out: 'drop', outDur: 0.45, loop: 'drift', shadow: 0.3 });
  mt('mt-wipe', 'Soft wipe reveal', 'The whole block reveals in a soft left-to-right wipe.',
    { label: '', title: 'कहानी यहाँ से शुरू होती है', sub: '' },
    { font: 'khand', size: 120, in: 'wipe', unit: 'all', inDur: 2.6, ease: 'inOut', out: 'fade', outDur: 0.4, shadow: 0.6 });
  mt('mt-stroke', 'Stroke draw-on', 'Outline draws on letter by letter, then the fill arrives.',
    { label: '', title: 'दस्तावेज़', sub: 'DOCUMENT' },
    { font: 'playfair', size: 130, color: '#f4efe4', in: 'stroke', unit: 'cluster', inDur: 3.2, spread: 0.9, ease: 'linear', out: 'fade', outDur: 0.5, deco: 'none', shadow: 0.4 }, 4.6);
  mt('mt-typewriter', 'Typewriter case file', 'Typewriter types the case number with a block cursor.',
    { label: 'CASE FILE', title: 'FILE NO. 1947', sub: 'खुलासा' },
    { font: 'elite', size: 104, upper: true, in: 'type', unit: 'cluster', inDur: 2.9, spread: 0.55, out: 'fade', outDur: 0.4, shadow: 0.3, font2: 'mono', accent: '#c9b68a' });
  mt('mt-smoke', 'Smoke dissolve', 'Slow cinematic fade that dissolves away in smoke.',
    { label: '', title: 'THE LAST LETTER', sub: 'आख़िरी ख़त' },
    { font: 'khand', size: 130, color: '#dfe3e8', in: 'fade', unit: 'all', inDur: 2.6, ease: 'cine', out: 'fade', outDur: 0.6, post: 'dissolve', shadow: 0.4 }, 4.4);
  mt('mt-film', 'Old film flicker', 'Cream letters with film flicker and dust — archive footage feel.',
    { label: 'संग्रह 1932', title: 'पुरानी यादें', sub: 'ARCHIVE FOOTAGE' },
    { font: 'tiro', size: 116, color: '#e8dcb8', in: 'flicker', unit: 'word', inDur: 2.2, spread: 0.5, out: 'fade', outDur: 0.4, post: 'film', shadow: 0.4, font2: 'mono', accent: '#c9b68a' });
  mt('mt-band', 'Dark band title', 'Segment label on a dark band — interviews, segments, location cards.',
    { label: 'सेगमेंट 03', title: 'दिल्ली 1952', sub: 'राजधानी की दास्तान' },
    { font: 'mukta', size: 118, in: 'mask', unit: 'line', inDur: 2.2, spread: 0.4, out: 'fade', outDur: 0.4, deco: 'band', font2: 'mukta', accent: '#e5a93c' });
  mt('mt-split', 'Split line reveal', 'Title rises out of a hard split line — late-night show style.',
    { label: '', title: 'TONIGHT SPECIAL', sub: 'आज की ख़ास कहानी' },
    { font: 'anton', size: 140, upper: true, in: 'mask', unit: 'line', inDur: 1.3, spread: 0.35, ease: 'outExpo', out: 'same', outDur: 0.5, deco: 'split', shadow: 0.4, font2: 'oswald' });

  // ---------------- Kinetic text ----------------
  const kt = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Kinetic text', el: 'title', dur: dur || 4, f, p });

  kt('kt-word-rise', 'Word-by-word rise', 'Each word rises up into place — the every-day kinetic caption.',
    { label: '', title: 'हर शब्द कहानी बनता है', sub: '' },
    { font: 'mukta', size: 108, emph: '#ffd84a', in: 'rise', unit: 'word', inDur: 2.4, spread: 0.5, out: 'drop', outDur: 0.45, shadow: 0.6 });
  kt('kt-letter-pop', 'Letter cascade', 'Akshar-safe letter pops cascading across the line.',
    { label: '', title: 'अक्षर दर अक्षर', sub: '' },
    { font: 'mukta', size: 110, emph: '#7ee2a8', in: 'pop', unit: 'cluster', inDur: 2.8, spread: 0.85, ease: 'outBack', out: 'blur', outDur: 0.45, shadow: 0.5 });
  kt('kt-punch', 'Scale punch', 'The whole line slams down from a huge scale — a punch word.',
    { label: '', title: 'बदलाव', sub: '' },
    { font: 'bebas', size: 190, in: 'slam', unit: 'all', inDur: 0.8, ease: 'outExpo', out: 'fade', outDur: 0.35, shadow: 0.7 });
  kt('kt-mask-up', 'Mask reveal up', 'Lines slide up out of masks, editor-style.',
    { label: '', title: 'कहानी का दूसरा पन्ना / नए सबूत के साथ', sub: '' },
    { font: 'khand', size: 112, upper: false, in: 'mask', unit: 'line', inDur: 2.2, spread: 0.45, ease: 'outQuart', out: 'same', outDur: 0.45, shadow: 0.5 });
  kt('kt-blur', 'Blur focus', 'Words drift into focus from a blur.',
    { label: '', title: 'ध्यान केंद्रित', sub: '' },
    { font: 'montserrat', size: 104, in: 'blur', unit: 'word', inDur: 2.4, spread: 0.45, ease: 'cine', out: 'blur', outDur: 0.5, shadow: 0.4 });
  kt('kt-flip', '3D flip words', 'Words flip in like flipping panels.',
    { label: '', title: 'नया दौर', sub: '' },
    { font: 'oswald', size: 118, upper: true, in: 'flip', unit: 'word', inDur: 2.2, spread: 0.6, out: 'drop', outDur: 0.45, shadow: 0.5 });
  kt('kt-skew', 'Skew slide', 'Slanted fast slide-in with skew — sports energy.',
    { label: '', title: 'टीम भारत', sub: '' },
    { font: 'anton', size: 130, upper: true, in: 'skew', unit: 'word', inDur: 2.0, spread: 0.55, ease: 'outQuart', out: 'skew', outDur: 0.4, shadow: 0.5 });
  kt('kt-bounce', 'Bounce drop', 'Words drop in with a bounce.',
    { label: '', title: 'बच्चों की दुनिया', sub: '' },
    { font: 'mukta', size: 108, in: 'bounce', unit: 'word', inDur: 2.4, spread: 0.7, ease: 'outBounce', out: 'rise', outDur: 0.45, shadow: 0.5 });
  kt('kt-zoom', 'Zoom from far', 'Whole block zooms in from far away with a blur trail.',
    { label: '', title: '1947', sub: 'साल जिसने सब बदल दिया' },
    { font: 'bebas', size: 210, in: 'zoom', unit: 'all', inDur: 1.8, ease: 'outExpo', out: 'blur', outDur: 0.45, shadow: 0.6 });
  kt('kt-rotate', 'Rotate in', 'Words swing in from a rotation.',
    { label: '', title: 'क्रांति', sub: '' },
    { font: 'rozha', size: 128, in: 'rotate', unit: 'word', inDur: 2.2, spread: 0.55, out: 'fade', outDur: 0.45, shadow: 0.5 });
  kt('kt-type', 'Kinetic typewriter', 'Typing at speed with a blinking cursor.',
    { label: '', title: 'टाइप होती कहानी…', sub: '' },
    { font: 'mono', size: 92, in: 'type', unit: 'cluster', inDur: 2.8, spread: 0.55, out: 'fade', outDur: 0.4, shadow: 0.4, color: '#9fe8b8' });
  kt('kt-track-in', 'Tracking expand', 'Letters start squeezed together and settle to wide tracking.',
    { label: '', title: 'EXPAND', sub: '' },
    { font: 'bebas', size: 120, tracking: 0.22, upper: true, in: 'track', unit: 'all', inDur: 2.4, ease: 'cine', out: 'fade', outDur: 0.4, shadow: 0.5 });
  kt('kt-wave', 'Wave loop', 'Words keep waving while on screen — good behind narration.',
    { label: '', title: 'लहरों की माला', sub: '' },
    { font: 'mukta', size: 100, in: 'pop', unit: 'word', inDur: 2.0, spread: 0.5, out: 'fade', outDur: 0.4, loop: 'wave', shadow: 0.5 });
  kt('kt-float', 'Float loop', 'Gentle floating hold — documentary calm.',
    { label: '', title: 'समय की नदी', sub: '' },
    { font: 'tiro', size: 104, in: 'rise', unit: 'all', inDur: 2.2, ease: 'cine', out: 'fade', outDur: 0.5, loop: 'float', shadow: 0.5 });
  kt('kt-shake', 'Shake / urgency', 'Camera-shake jitter on every word — tension, countdowns.',
    { label: '', title: 'आख़िरी मौक़ा', sub: '' },
    { font: 'khand', size: 132, in: 'slam', unit: 'all', inDur: 0.6, out: 'glitch', outDur: 0.4, loop: 'shake', shadow: 0.6 });
  kt('kt-drift', 'Slow push-in', 'Slow push while words glow-breathe — the Netflix-doc hold.',
    { label: '', title: 'रहस्य गहरा होता गया', sub: '' },
    { font: 'notoSerif', size: 96, in: 'rise', unit: 'word', inDur: 2.6, spread: 0.6, ease: 'cine', out: 'fade', outDur: 0.6, loop: 'drift', glow: 0.3, shadow: 0.4 }, 4.6);
  kt('kt-outline', 'Outline only', 'Outline-only words, then the fill snaps in.',
    { label: '', title: 'सिर्फ़ ख़ाका', sub: '' },
    { font: 'anton', size: 126, upper: false, in: 'pop', unit: 'word', inDur: 2.2, spread: 0.55, out: 'fade', outDur: 0.4, fill: 'outline', outline: 0, shadow: 0.4 });
  kt('kt-two-tone', 'Two-colour gradient', 'Two-colour gradient fill on kinetic words.',
    { label: '', title: 'रात *और* दिन', sub: '' },
    { font: 'khand', size: 128, fill: 'grad', color: '#f5e9d0', color2: '#e5a93c', in: 'rise', unit: 'word', inDur: 2.4, spread: 0.5, out: 'blur', outDur: 0.45, shadow: 0.5 });

  // ---------------- Lower thirds ----------------
  const lt = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Lower thirds', el: 'lower', dur: dur || 5, f, p });

  lt('lt-doc', 'Documentary line', 'Amber rule, name slides in — the everyday documentary lower third.',
    { name: 'अरुण कुमार', role: 'इतिहासकार · दिल्ली विश्वविद्यालय', tag: '' },
    { style: 'doc', font: 'mukta', size: 58, accent: '#e5a93c', inDur: 2.6, outDur: 0.5 }, 4.5);
  lt('lt-bar', 'Colour bar', 'Accent block with name, second strip with the role.',
    { name: 'मीरा शर्मा', role: 'पत्रकार', tag: '' },
    { style: 'bar', font: 'mukta', size: 58, accent: '#e5a93c', inDur: 2.6, outDur: 0.5 }, 4.5);
  lt('lt-news', 'News strap', 'Breaking strap: red tag, white plate, dark sub-plate.',
    { name: 'बड़ी ख़बर', role: 'राजधानी से विशेष रिपोर्ट', tag: 'ब्रेकिंग' },
    { style: 'news', font: 'mukta', size: 58, inDur: 2.2, outDur: 0.5 }, 4.5);
  lt('lt-serif', 'Minimal serif', 'Italic serif name, hairline underline, spaced role.',
    { name: 'आनंद राव', role: 'फ़िल्म निर्माता', tag: '' },
    { style: 'serif', size: 60, accent: '#e5a93c', inDur: 2.8, outDur: 0.5 }, 4.5);
  lt('lt-location', 'Location pin', 'Map pin pops, location types in with coordinates.',
    { name: 'मुंबई', role: 'शहर', tag: '18.92° N · 72.83° E' },
    { style: 'location', size: 60, accent: '#e5a93c', inDur: 3.0, outDur: 0.5 }, 4.5);
  lt('lt-pill', 'Glass pill', 'Frosted pill with an initial badge — modern interview tag.',
    { name: 'डॉ. सुनीता रेड्डी', role: 'अर्थशास्त्री', tag: '' },
    { style: 'pill', size: 52, accent: '#e5a93c', inDur: 2.4, outDur: 0.5 }, 4.5);

  // ---------------- Call-outs ----------------
  const co = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Call-outs', el: 'callout', dur: dur || 4, f, p });

  co('co-label', 'Label + leader line', 'Dot on the spot, elbow leader line, white label box.',
    { label: 'पुराना किला', sub: '1793 में बना' },
    { kind: 'label', marker: 'dot', box: 'box', dx: 300, dy: -170, size: 44, inDur: 2.5, outDur: 0.5 });
  co('co-ring', 'Pulsing ring', 'Yellow ring that keeps pulsing on the spot.',
    { label: 'केंद्रीय टावर', sub: '' },
    { kind: 'label', marker: 'ring', box: 'plain', dx: 380, dy: -140, r: 90, accent2: '#ffcf3d', inDur: 2.6, outDur: 0.5 });
  co('co-box', 'Corner brackets', 'Bracket box snaps around the detail.',
    { label: 'प्रवेश द्वार', sub: 'मुख्य दरवाज़ा' },
    { kind: 'label', marker: 'box', box: 'dark', dx: 330, dy: -200, r: 110, inDur: 2.5, outDur: 0.5 });
  co('co-cross', 'Crosshair', 'Crosshair marker with a precise measure.',
    { label: 'निशान बिंदु', sub: '' },
    { kind: 'label', marker: 'cross', box: 'plain', dx: 300, dy: -190, r: 80, inDur: 2.5, outDur: 0.5 });
  co('co-arrow', 'Hand-drawn arrow', 'Curved hand-drawn arrow pointing at the spot.',
    { label: 'यहाँ ध्यान दें', sub: '' },
    { kind: 'label', marker: 'arrow', box: 'dark', dx: 330, dy: -230, accent2: '#ffcf3d', inDur: 2.8, outDur: 0.5 });
  co('co-spotlight', 'Spotlight circle', 'Darkens everything except one circle.',
    { label: 'मुख्य आकर्षण', sub: '' },
    { kind: 'spotlight', r: 150, inDur: 2.8, outDur: 0.5 });
  co('co-measure', 'Measure A → B', 'Dashed measure line with end ticks and a label.',
    { label: '340 मीटर', sub: '' },
    { kind: 'measure', x2: 0.82, y2: 0.52, inDur: 2.6, outDur: 0.5 });

  // ---------------- Quote cards ----------------
  const qc = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Quote cards', el: 'quote', dur: dur || 7, f, p });

  qc('qc-marks', 'Big quote marks', 'Giant serif quote mark, words rise one by one.',
    { quote: 'सच्ची कहानी वही होती है जो *कभी नहीं* मरती।', author: 'अरुण कुमार', role: 'इतिहासकार' },
    { style: 'marks', font: 'notoSerif', size: 66, accent: '#e5a93c', inDur: 4.4, outDur: 0.5 });
  qc('qc-card', 'Dark card', 'Left-accent card, quote wipes up inside.',
    { quote: 'इतिहास दोहराता है — जब तक हम उसे *पढ़ते* नहीं।', author: 'मीरा शर्मा', role: 'पत्रकार' },
    { style: 'card', font: 'mukta', size: 62, inDur: 4.2, outDur: 0.5 });
  qc('qc-hand', 'Handwritten', 'Kalam handwriting with a marker underline.',
    { quote: 'क़लम से लिखी *यादें* कभी नहीं मिटतीं', author: 'दादी की डायरी', role: '1948' },
    { style: 'hand', size: 70, accent: '#ffd84a', inDur: 4.2, outDur: 0.5 }, 6.5);
  qc('qc-minimal', 'Minimal centred', 'No marks, just a small accent rule above.',
    { quote: 'सबूत बोलता है।', author: '', role: '' },
    { style: 'minimal', font: 'notoSerif', size: 74, inDur: 3.8, outDur: 0.5 }, 6);

  // ---------------- Numbers / stats ----------------
  const nm = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Numbers', el: 'counter', dur: dur || 4.5, f, p });

  nm('nm-rupee', 'Big ₹ stat', 'Indian-grouped rupees counting up.',
    { label: 'कुल लागत', from: '0', to: '12500000', prefix: '₹', suffix: '' },
    { style: 'big', format: 'indian', font: 'bebas', size: 210, countDur: 3.4, outDur: 0.5 });
  nm('nm-crore', 'Lakh / crore words', 'Counts into Hindi lakh/crore words.',
    { label: 'दर्शकों की संख्या', from: '0', to: '68000000', prefix: '', suffix: '' },
    { style: 'big', format: 'lakhcrore', font: 'bebas', size: 190, countDur: 3.4, outDur: 0.5 });
  nm('nm-percent-ring', 'Ring percentage', 'Gold ring fills as the percentage counts.',
    { label: 'वन क्षेत्र', from: '0', to: '64', prefix: '', suffix: '%' },
    { style: 'ring', format: 'plain', max: 100, font: 'bebas', size: 180, countDur: 3.2, outDur: 0.5 });
  nm('nm-bar', 'Progress bar', 'Number counts while the bar fills.',
    { label: 'शहरी आबादी', from: '0', to: '78', prefix: '', suffix: '%' },
    { style: 'bar', format: 'plain', max: 100, font: 'bebas', size: 180, countDur: 3.2, outDur: 0.5 });
  nm('nm-odo', 'Rolling digits', 'Odometer-style rolling digit columns.',
    { label: 'साल', from: '1900', to: '1947', prefix: '', suffix: '' },
    { style: 'odo', format: 'plain', font: 'bebas', size: 200, countDur: 3.4, outDur: 0.5 });
  nm('nm-deva', 'Hindi digits', 'Counts in Devanagari numerals (०१२३).',
    { label: 'गाँव', from: '0', to: '45000', prefix: '', suffix: '' },
    { style: 'big', format: 'lakhcrore', deva: true, font: 'rozha', size: 190, countDur: 3.4, outDur: 0.5 });
  nm('nm-compact', 'Compact counter', 'M/K compact counting — views, subscribers.',
    { label: 'दृश्य', from: '0', to: '24000000', prefix: '', suffix: '' },
    { style: 'big', format: 'compact', font: 'bebas', size: 200, countDur: 3.4, outDur: 0.5 });

  // ---------------- Highlight ----------------
  const hl = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Highlight', el: 'highlight', dur: dur || 4.5, f, p });

  hl('hl-marker', 'Vox marker', 'Yellow marker strokes left-to-right on the key words.',
    { text: 'इस वाक्य में मुख्य *शब्द* चिह्नित हैं और *महत्वपूर्ण* बातें रेखांकित हैं।' },
    { mark: 'marker', card: 'paper', font: 'notoSerif', size: 68, accent: '#ffd84a', markAt: 1.6, markDur: 1.8, outDur: 0.4 }, 5);
  hl('hl-underline', 'Hand underline', 'Hand-drawn underline sweeps under the words.',
    { text: 'यहाँ *नीचे* एक खास लाइन खिंचती है' },
    { mark: 'underline', card: 'paper', size: 70, markAt: 1.6, markDur: 1.8, outDur: 0.4 }, 4.5);
  hl('hl-strike', 'Strike-through', 'Red strike crosses out the wrong claim.',
    { text: 'पुराना दावा *ग़लत* निकला' },
    { mark: 'strike', card: 'dark', size: 68, markAt: 1.8, markDur: 1.4, outDur: 0.4 }, 4.5);
  hl('hl-circle', 'Hand-drawn circle', 'Wobbly circle drawn around the word.',
    { text: 'इस शब्द को *घेरा* जाता है' },
    { mark: 'circle', card: 'paper', size: 70, markAt: 1.6, markDur: 1.8, outDur: 0.4 }, 4.5);
  hl('hl-box', 'Box outline', 'Rectangle draws itself around the word.',
    { text: 'चौखट में *बंद* शब्द' },
    { mark: 'box', card: 'paper', size: 70, markAt: 1.6, markDur: 1.6, outDur: 0.4 }, 4.5);
  hl('hl-redact', 'Redact', 'Black bar sweeps over the secret part.',
    { text: 'यह भाग *गोपनीय* है' },
    { mark: 'redact', card: 'paper', size: 70, markAt: 1.8, markDur: 1.2, outDur: 0.4 }, 4.5);
  hl('hl-swipe', 'Colour block swipe', 'Colour block swipes across, text flips colour on it.',
    { text: 'रंगीन *पट्टी* शब्दों पर आती है' },
    { mark: 'swipe', card: 'paper', size: 70, accent: '#e5a93c', markAt: 1.6, markDur: 1.6, outDur: 0.4 }, 4.5);
  hl('hl-footage', 'Marker on footage', 'Yellow marker directly over your footage (no card).',
    { text: 'फ़ुटेज पर *सीधे* मार्कर' },
    { mark: 'marker', card: 'none', size: 66, accent: '#ffd84a', markAt: 1.4, markDur: 1.8, outDur: 0.4 }, 4.5);

  // ---------------- Match cuts ----------------
  const mc = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Match cuts', el: 'matchcut', dur: dur || 4, f, p });

  mc('mc-headline', 'Headline match cut', 'One highlighted word jumping across documents and colours — Vox style.',
    { word: 'सच', lines: 'कहानी का सच|इतिहास का सच|देश का सच' },
    { cut: 0.5, looks: 'mix', fonts: true, marker: true, size: 130, zoom: 0.08, accent: '#ffe14d' }, 4);
  mc('mc-docs', 'Documents only', 'Paper/typewriter backgrounds only, same word every cut.',
    { word: '1947', lines: '' },
    { cut: 0.55, looks: 'docs', fonts: true, marker: true, size: 150, zoom: 0.06 }, 4);
  mc('mc-colors', 'Colour flashes', 'Bold colour backgrounds, hard cuts.',
    { word: 'बदलाव', lines: '' },
    { cut: 0.45, looks: 'colors', fonts: true, marker: false, size: 140, zoom: 0.1 }, 3.6);
  mc('mc-fontswap', 'Font swap', 'The word itself stays; only the font changes every cut.',
    { word: 'स्टाइल', lines: '' },
    { cut: 0.5, looks: 'colors', fonts: true, marker: false, size: 150, zoom: 0.05 }, 4);

  // ---------------- Social & chat ----------------
  const so = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Social & chat', el: 'social', dur: dur || 5, f, p });

  so('so-post', 'Social post', 'Generic post card with avatar, verified tick and counting likes.',
    { name: 'अन्ना वर्मा', handle: '@anna.writes · 2 घंटे', text: 'इस शहर की कहानी सुनाते हुए अगला हिस्सा आज शाम।', likes: '12400' },
    { kind: 'post', theme: 'dark', accent: '#e5a93c', inDur: 1.0, outDur: 0.4 }, 5);
  so('so-chat', 'Chat messages', 'Chat thread with typing dots and reply ticks (> = sent).',
    { name: 'रेहान', handle: 'ऑनलाइन', text: 'कल का एपिसोड देखा?\n> देखा! कमाल था\n> कहानी गज़ब की थी', likes: '' },
    { kind: 'chat', theme: 'dark', inDur: 0.7, outDur: 0.4 }, 6);
  so('so-comment', 'Video comment', 'Comment card under the video, likes tick up.',
    { name: 'दीपक मेहता', handle: '2 दिन पहले', text: 'यह कहानी ने दिल छू लिया। ऐसे ही एपिसोड चाहिए!', likes: '4200' },
    { kind: 'comment', theme: 'dark', inDur: 1.0, outDur: 0.4 }, 5);
  so('so-notify', 'Phone notification', 'Notification banner drops in from the top.',
    { name: 'समाचार', handle: 'अभी', text: 'नया एपिसोड अपलोड हुआ\nकहानी का अगला हिस्सा देखें', likes: '' },
    { kind: 'notify', theme: 'dark', accent: '#e5a93c', inDur: 1.1, outDur: 0.4 }, 4.5);
  so('so-ticker', 'Breaking ticker', 'Red tag + white strap + crawling headline.',
    { name: 'समुद्र तट पर बड़ा बदलाव', handle: 'ब्रेकिंग', text: 'मौसम विभाग की नई रिपोर्ट · तटीय इलाकों में सतर्कता · प्रशासन पूरी तैयारी में', likes: '' },
    { kind: 'ticker', theme: 'dark', inDur: 0.7, outDur: 0.4, speed: 260 }, 5);
  so('so-search', 'Search bar typing', 'Search field types the query, suggestions drop down.',
    { name: '', handle: '', text: '1947 की कहानी', likes: 'आज़ादी के साक्षी|1947 के दस्तावेज़|तारीख़ के पन्ने' },
    { kind: 'search', theme: 'dark', inDur: 1.0, outDur: 0.4 }, 4.5);

  // ---------------- Captions ----------------
  const cap = (id, name, note, f, p, dur) => L.push({ id, name, note, fam: 'Captions', el: 'caption', dur: dur || 6, f, p });

  cap('cap-classic', 'Classic outline', 'White with a black outline — the safe default.',
    { text: 'यह शहर कभी समुद्र था और कहानी यहीं से शुरू होती है' },
    { style: 'classic', font: 'mukta', size: 62, words: 6, accent: '#ffd400' });
  cap('cap-boxed', 'Boxed line', 'Each phrase sits on its own black box.',
    { text: 'अब हम उस जगह पर पहुँच चुके हैं जहाँ सब कुछ बदल गया' },
    { style: 'boxed', font: 'mukta', size: 62, words: 6 });
  cap('cap-karaoke', 'Karaoke colour', 'The spoken word lights up in the accent colour.',
    { text: 'इस कहानी में तीन मोड़ हैं और हर मोड़ चौंकाने वाला है' },
    { style: 'karaoke', font: 'mukta', size: 64, words: 6, accent: '#ffd400' });
  cap('cap-pop', 'Reels pop', 'Big punchy caps, active word pops in the accent colour.',
    { text: 'सचमुच | अविश्वसनीय | यह सब | यहीं हुआ' },
    { style: 'pop', font: 'mukta', size: 64, words: 3, accent: '#ffd400' });
  cap('cap-wordbox', 'Box on spoken word', 'Accent box jumps word to word.',
    { text: 'नौ साल लंबी तैयारी के बाद आख़िरकार वो दिन आया' },
    { style: 'wordbox', font: 'mukta', size: 64, words: 6, accent: '#ffd400' });
  cap('cap-reveal', 'Words as spoken', 'Words fade-slide in exactly when spoken.',
    { text: 'यहाँ आइना खड़ा था और लोग कतार में लगते थे' },
    { style: 'reveal', font: 'mukta', size: 62, words: 6 });
  cap('cap-cine', 'Cinematic serif', 'Serif captions with a soft shadow — cinema subtitles.',
    { text: 'उस शाम के बाद कुछ भी पहले जैसा नहीं रहा' },
    { style: 'cine', font: 'notoSerif', size: 60, words: 7 });
  cap('cap-hinglish', 'Hinglish slide', 'Small captions, words slide in left-to-right.',
    { text: 'toh chaliye shuru karte hain kahani ke us hisse se jahan sab badal gaya' },
    { style: 'reveal', font: 'montserrat', size: 54, words: 8, color: '#ffffff', accent: '#ffd400' });

  const byId = {};
  L.forEach(p => (byId[p.id] = p));
  const FAMS = ['Movie titles', 'Kinetic text', 'Lower thirds', 'Call-outs', 'Quote cards', 'Numbers', 'Highlight', 'Match cuts', 'Social & chat', 'Captions'];
  return { list: L, byId, FAMS };
})();
