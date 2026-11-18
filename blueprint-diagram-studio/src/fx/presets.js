// Preset library — every named look the studio ships with, built on the element registry.
// Each preset: { id, name, note, fam, el, dur?, f: {fields}, p: {params} }.
// Fields/params only need to differ from the element defaults; the engine merges.
// Default text is Hindi-first (Favorite World is a Hindi channel) with generic names only —
// no real brands, no real people, never the word "AI" in any text that appears in a video.
BD.presets = (() => {
  const L = [];

  // ---------------- Blueprint draw-on ----------------
  const bp = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Blueprint draw-on', el: 'blueprint', dur: dur || 7 }, { f, p }));
  const T2 = {
    fort: ['किले की दीवार', 'ELEVATION · SHEET 01'], dam: ['गुरुत्व बाँध', 'SECTION · SHEET 02'], bridge: ['मेहराबी पुल', 'ELEVATION · SHEET 03'],
    floorplan: ['मकान का नक्शा', 'PLAN · SHEET 04'], ship: ['कार्गो जहाज़', 'PROFILE · SHEET 05'], submarine: ['पनडुब्बी', 'PROFILE · SHEET 06'],
    tank: ['युद्धक वाहन', 'PROFILE · SHEET 07'], jet: ['लड़ाकू विमान', 'PLAN VIEW · SHEET 08'], rocket: ['प्रक्षेपण यान', 'PROFILE · SHEET 09'],
    train: ['रेल डिब्बा', 'SIDE VIEW · SHEET 10'], car: ['कार', 'PROFILE · SHEET 11'], gears: ['गियर ट्रेन', 'FRONT VIEW · SHEET 12'],
    bunker: ['बंकर', 'SECTION · SHEET 13'], dome: ['मंदिर गुंबद', 'ELEVATION · SHEET 14'], satellite: ['उपग्रह', 'OUTLINE · SHEET 15'],
    tower: ['मीनार', 'ELEVATION · SHEET 16'],
  };
  const bpNote = drawing => `${drawing} ख़ुद खिंचता है — रूपरेखा, विवरण, माप और लेबल। The drawing draws itself: outline, details, dimensions with counting measurements, leader labels, title block.`;
  bp('bp-fort-blueprint', 'Fort wall · blueprint', bpNote('किले की दीवार'), { title: T2.fort[0], sub: T2.fort[1] }, { theme: 'bp', drawing: 'fort' });
  bp('bp-dam-graphite', 'Gravity dam · graphite', bpNote('बाँध'), { title: T2.dam[0], sub: T2.dam[1] }, { theme: 'graphite', drawing: 'dam', hatchOn: true });
  bp('bp-bridge-chalk', 'Arch bridge · chalkboard', bpNote('पुल'), { title: T2.bridge[0], sub: T2.bridge[1] }, { theme: 'chalk', drawing: 'bridge' });
  bp('bp-ship-navy', 'Cargo ship · navy', bpNote('जहाज़'), { title: T2.ship[0], sub: T2.ship[1] }, { theme: 'bp', drawing: 'ship' });
  bp('bp-rocket-neon', 'Rocket · neon line', bpNote('रॉकेट'), { title: T2.rocket[0], sub: T2.rocket[1] }, { theme: 'neon', drawing: 'rocket', zoom: 0.03 });
  bp('bp-plan-aged', 'House plan · aged paper', bpNote('नक्शा'), { title: T2.floorplan[0], sub: T2.floorplan[1] }, { theme: 'aged', drawing: 'floorplan', order: 'natural', spread: 0.6 });
  bp('bp-tank-clean', 'Tank · clean white', bpNote('टैंक'), { title: T2.tank[0], sub: T2.tank[1] }, { theme: 'clean', drawing: 'tank' });
  bp('bp-dome-blueprint', 'Temple dome · blueprint', bpNote('गुंबद'), { title: T2.dome[0], sub: T2.dome[1] }, { theme: 'bp', drawing: 'dome' });
  bp('bp-tower-graphite', 'Minaret · graphite', bpNote('मीनार'), { title: T2.tower[0], sub: T2.tower[1] }, { theme: 'graphite', drawing: 'tower' });
  bp('bp-gears-clean', 'Gear train · clean', bpNote('गियर'), { title: T2.gears[0], sub: T2.gears[1] }, { theme: 'clean', drawing: 'gears' });
  bp('bp-submarine-navy', 'Submarine · navy', bpNote('पनडुब्बी'), { title: T2.submarine[0], sub: T2.submarine[1] }, { theme: 'bp', drawing: 'submarine' });
  bp('bp-jet-neon', 'Fighter jet · neon', bpNote('विमान'), { title: T2.jet[0], sub: T2.jet[1] }, { theme: 'neon', drawing: 'jet' });
  bp('bp-train-aged', 'Train car · aged', bpNote('रेल'), { title: T2.train[0], sub: T2.train[1] }, { theme: 'aged', drawing: 'train' });
  bp('bp-car-clean', 'Car · clean', bpNote('कार'), { title: T2.car[0], sub: T2.car[1] }, { theme: 'clean', drawing: 'car' });
  bp('bp-satellite-blueprint', 'Satellite · blueprint', bpNote('उपग्रह'), { title: T2.satellite[0], sub: T2.satellite[1] }, { theme: 'bp', drawing: 'satellite' });
  bp('bp-bunker-chalk', 'Pillbox bunker · chalk', bpNote('बंकर'), { title: T2.bunker[0], sub: T2.bunker[1] }, { theme: 'chalk', drawing: 'bunker', hatchOn: true });
  bp('bp-photo-trace', 'Trace my photo', 'अपनी तस्वीर को लाइन-आर्ट में बदलकर वैसे ही खिंचवाएँ (Media में फ़ोटो चुनें)। Your photo traced into line art that draws itself on — pick the photo in the Media panel.', { title: 'तस्वीर से ख़ाका', sub: 'PHOTO TRACE' }, { theme: 'graphite', drawing: 'photo', labelsOn: false, dimsOn: false, thresh: 16 }, 7.5);
  bp('bp-svg-import', 'Draw my SVG', 'अपनी SVG फ़ाइल की रेखाएँ एक-एक करके खिंचती हैं (Media में SVG चुनें)। Your SVG file draws on stroke by stroke — pick the .svg in the Media panel.', { title: 'SVG रेखाचित्र', sub: 'IMPORTED DRAWING' }, { theme: 'clean', drawing: 'svg', labelsOn: false }, 7);

  // ---------------- Rotating wireframe ----------------
  const wf = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Rotating wireframe', el: 'wireframe', dur: dur || 8 }, { f, p }));
  wf('wf-tower-neon', 'Tower wireframe · neon', 'मीनार का 3D तार-खाका नीली नियॉन रेखाओं में घूमता है। The tower silhouette extruded into a spinning neon wireframe.', { title: 'मीनार', labels: 'गुंबद\nशाफ्ट' }, { theme: 'neon', model: 'tower', rotSpeed: 16 });
  wf('wf-rocket-blueprint', 'Rocket wireframe · blueprint', 'रॉकेट का खाका नीली शीट पर घूमता है। The rocket extruded and spinning on a blueprint sheet.', { title: 'प्रक्षेपण यान', labels: 'नोज़ कोन\nइंजन' }, { theme: 'bp', model: 'rocket', rotSpeed: 12, fade: 0.4 });
  wf('wf-box-graphite', 'Box wireframe · graphite', 'सादा डिब्बा ट्रेसिंग पेपर पर घूमता है। A plain box spinning on tracing paper.', { title: 'आयत घन', labels: 'कोना' }, { theme: 'graphite', model: 'box', rotSpeed: 20, tilt: 22 });
  wf('wf-cyl-clean', 'Cylinder wireframe · clean', 'बेलन सफ़ेद काग़ज़ पर घूमता है। A cylinder spinning on clean white.', { title: 'बेलन', labels: 'व्यास' }, { theme: 'clean', model: 'cyl', rotSpeed: 14 });
  wf('wf-ship-neon', 'Ship hull wireframe', 'जहाज़ के पोत का घूमता खाका। The ship hull extruded into a rotating wireframe.', { title: 'पोत', labels: 'प्रोरा\nपतवार' }, { theme: 'neon', model: 'ship', rotSpeed: 10 });

  // ---------------- Exploded & cutaway ----------------
  const ex = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Exploded & cutaway', el: 'exploded', dur: dur || 7 }, { f, p }));
  ex('ex-rocket-exploded', 'Rocket exploded view', 'रॉकेट के हिस्से अलग होते हैं — नोज़, चरण, इंजन, फिन। The rocket splits into labelled parts along its axis.', { title: 'रॉकेट के हिस्से', sub: 'EXPLODED VIEW' }, { theme: 'bp', model: 'rocket', mode: 'explode', axis: 'y', explode: 0.9 });
  ex('ex-wall-cutaway', 'Wall cutaway layers', 'दीवार की परतें एक-एक करके खुलती हैं। The wall reveals its layers one by one.', { title: 'दीवार की परतें', sub: 'CUTAWAY' }, { theme: 'aged', model: 'wall', mode: 'cutaway', axis: 'y' });
  ex('ex-floors-cutaway', 'Building floors cutaway', 'इमारत की मंज़िलें कट कर अंदर दिखती हैं। The building floors reveal in section.', { title: 'इमारत का कट', sub: 'FLOOR SECTION' }, { theme: 'bp', model: 'floors', mode: 'cutaway' });
  ex('ex-pipe-xray', 'Pipe X-ray view', 'पाइप का एक्स-रे — ठोस छाया और खंडित रूपरेखा। X-ray look: ghost solid with dashed outlines over the real structure.', { title: 'पाइप का एक्स-रे', sub: 'X-RAY VIEW' }, { theme: 'clean', model: 'pipe', mode: 'xray', axis: 'x' });
  ex('ex-dam-exploded', 'Dam body exploded', 'बाँध के पिंड अलग होकर दिखते हैं। The dam body pulls apart into its blocks.', { title: 'बाँध के पिंड', sub: 'EXPLODED' }, { theme: 'graphite', model: 'dam', mode: 'explode', axis: 'y', explode: 0.7 });

  // ---------------- Labelled diagram ----------------
  const la = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Labelled diagram', el: 'labelled', dur: dur || 8 }, { f, p }));
  la('la-photo-labels', 'Photo call-outs · numbered', 'अपनी तस्वीर पर नंबर वाले कॉल-आउट, एक-एक करके। Numbered call-outs that draw on one by one over your photo.',
    { title: 'गढ़ी की व्याख्या', sub: 'FIG. 01', labels: '0.52,0.72 | मुख्य द्वार | GATE\n0.40,0.54 | बुर्ज | TOWER\n0.58,0.57 | प्राचीर | WALL\n0.30,0.86 | नींव की चट्टान | BASE ROCK' },
    { theme: 'clean', marker: 'num', frameStyle: 'white', photoW: 0.78 });
  la('la-photo-hindi', 'Photo labels · Hindi', 'ट्रेसिंग-पेपर लुक में हिंदी लेबल। Hindi leader labels on an aged-paper look.',
    { title: 'पुराना किला', sub: 'चित्र 02', labels: '0.50,0.62 | किला | FORT\n0.28,0.52 | पहाड़ी की चोटी | RIDGE\n0.72,0.86 | आस-पास की ज़मीन | GROUND' },
    { theme: 'aged', marker: 'dot', frameStyle: 'corners', labelSize: 30 });
  la('la-photo-rings', 'Ring markers · navy', 'नीली शीट पर घेरा निशान और लेबल। Ring markers on the navy sheet.',
    { title: 'ढाँचा', sub: 'FIG. 03', labels: '0.35,0.4 | खंभा | MAST\n0.65,0.55 | आधार | BASE' },
    { theme: 'bp', marker: 'ring', frameStyle: 'none', scrim: 0.3 });
  la('la-photo-legend', 'Photo + legend box', 'तस्वीर + नीचे-दाएँ बनता लेजेंड बॉक्स। Photo with a legend box that builds up.',
    { title: 'साक्ष्य', sub: 'EVIDENCE SHEET', labels: '0.3,0.35 | प्रवेश | ENTRY\n0.55,0.5 | मार्ग | ROUTE\n0.75,0.65 | मंज़िल | EXIT' },
    { theme: 'clean', marker: 'num', legendOn: true, frameStyle: 'tape' });
  la('la-video-frame', 'Video frame call-outs', 'वीडियो फ़्रेम पर कॉल-आउट (Media में वीडियो चुनें)। Call-outs over a paused video frame (pick a video in Media).',
    { title: 'फ़्रेम विश्लेषण', sub: 'FRAME 0421', labels: '0.5,0.42 | केंद्र बिंदु | CENTRE\n0.25,0.6 | बायाँ छोर | LEFT EDGE' },
    { theme: 'chalk', marker: 'cross', frameStyle: 'none', scrim: 0.35 });

  // ---------------- Process & flow ----------------
  const pr = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Process & flow', el: 'process', dur: dur || 7 }, { f, p }));
  pr('pr-steps-sequence', 'Step boxes + arrows', 'कदम-दर-कदम बॉक्स और तीर क्रम से खिंचते हैं। Step boxes connected by arrows that draw on in sequence.',
    { title: 'कैसे काम करता है', items: 'कच्चा माल | RAW\nभंडारण | STORE\nउत्पादन | BUILD\nवितरण | DELIVER' }, { theme: 'clean', kind: 'steps' });
  pr('pr-pipeline-flow', 'Pipeline with flow', 'पाइपलाइन में बहते बिंदु — पैसा/माल/पानी का बहाव। Dots flow along the line — money/goods/water.',
    { title: 'आपूर्ति शृंखला', items: 'स्रोत | SOURCE\nभंडारण | HUB\nजाँच | CHECK\nगंतव्य | DESTINATION' }, { theme: 'clean', kind: 'pipeline', dotSpeed: 220 });
  pr('pr-cycle-loop', 'Cycle / loop', 'गोलाकार प्रक्रिया — चक्र के तीर घूमते हैं। A circular process; the arrows close the loop.',
    { title: 'जल चक्र', items: 'वाष्पीकरण | EVAPORATION\nसंघनन | CONDENSATION\nवर्षा | RAIN\nसंग्रह | COLLECTION' }, { theme: 'bp', kind: 'cycle' });
  pr('pr-chain-cause', 'Cause → effect chain', 'कारण से परिणाम तक की कड़ी। A vertical cause-to-effect chain.',
    { title: 'कारण और परिणाम', items: 'बाढ़ | FLOOD\nफ़सल नुक़सान | CROP LOSS\nक़ीमत बढ़ोतरी | PRICE RISE' }, { theme: 'aged', kind: 'chain' });
  pr('pr-funnel-stage', 'Funnel stages', 'फ़नल — हर स्तर पर बची मात्रा। Funnel narrowing stage by stage.',
    { title: 'भर्ती प्रक्रिया', sub: 'FUNNEL', items: 'आवेदन 1,200 | APPLIED\nलिखित परीक्षा 340 | TEST\nइंटरव्यू 90 | INTERVIEW\nचयन 12 | SELECTED' }, { theme: 'clean', kind: 'funnel' });
  pr('pr-timeline-steps', 'Timeline of steps', 'टाइमलाइन पर घटनाएँ, एक-एक करके। Events land on a timeline one by one.',
    { title: 'योजना की समय-रेखा', items: '2019 | घोषणा\n2021 | नींव\n2023 | आधा काम\n2026 | पूर्ण' }, { theme: 'clean', kind: 'timeline' });
  pr('pr-before-after', 'Before → after', 'पहले और बाद — वाइप से बदलाव। Before and after panels with a wipe reveal.',
    { title: 'बदलाव', items: 'पुराना शहर | OLD CITY\nनया शहर | NEW CITY\nसंकरी सड़कें | NARROW ROADS\nचौड़ी सड़कें | WIDE ROADS' }, { theme: 'clean', kind: 'beforeafter' });
  pr('pr-decision-flow', 'Decision flowchart', 'फ़्लोचार्ट — हाँ/नहीं शाखाओं के साथ। A flowchart with yes/no branches.',
    { title: 'निर्णय वृक्ष', items: 'शुरुआत | START\nजाँच करें | CHECK\nशर्त पूरी? | CONDITION MET?\nआगे बढ़ें | PROCEED\nदोबारा | RETRY' }, { theme: 'clean', kind: 'flow' });

  // ---------------- Trees & hierarchy ----------------
  const tr = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Trees & hierarchy', el: 'tree', dur: dur || 9 }, { f, p }));
  tr('tr-dynasty-tree', 'Dynasty tree · portraits', 'वंशावली — पीढ़ियाँ, नाम, साल, शादी की रेखाएँ, पोर्ट्रेट स्लॉट। A dynasty tree with generations, years, marriage lines and portrait slots.',
    { title: 'राजवंश वंशावली', nodes: '1 | सम्राट प्रथम | 1526–1530 | संस्थापक\n2 | युवराज उत्तर | 1542–1555 |\n2 | शाहज़ादी रूप | 1545–1600 |\n3 | सम्राट द्वितीय | 1560–1605 | महान\n3 | सेनापति वीर | 1562–1620 |', marriages: '1-2\n3-4' },
    { theme: 'aged', kind: 'dynasty', nodeStyle: 'card', portraitsOn: true });
  tr('tr-org-chart', 'Org / government chart', 'संगठन चार्ट — शीर्ष पद से विभाग तक। An org chart from the top post down to departments.',
    { title: 'प्रशासन संरचना', nodes: '1 | प्रधान कार्यालय | — |\n2 | रक्षा मंत्रालय | — |\n2 | वित्त मंत्रालय | — |\n3 | नौसेना विभाग | — |\n3 | सेना विभाग | — |\n3 | बजट ब्यूरो | — |', marriages: '' },
    { theme: 'clean', kind: 'org', nodeStyle: 'lozenge', portraitsOn: false });
  tr('tr-bigtree-pan', 'Big tree · camera pan', 'बड़ा वृक्ष — कैमरा पैन करता हुआ चलता है, अंत में पीछे खिंचता है। A wide tree the camera pans along, then pulls back to show it all.',
    { title: 'पीढ़ियों का वृक्ष', nodes: '1 | कुलपति | 1700–1770 |\n2 | ज्येष्ठ शाखा | 1725–1790 |\n2 | द्वितीय शाखा | 1730–1800 |\n3 | व्यापारी वंश | 1755–1820 |\n3 | भूमि-धारक | 1760–1830 |\n3 | सेना परिवार | 1762–1815 |\n3 | विद्वान वंश | 1765–1840 |', marriages: '' },
    { theme: 'aged', kind: 'bigtree', nodeStyle: 'card' });
  tr('tr-succession', 'Line of succession', 'उत्तराधिकार की रेखा हाइलाइट होती है। The line of succession lights up through the tree.',
    { title: 'उत्तराधिकार', nodes: '1 | संस्थापक | 1490–1540 |\n2 | प्रथम उत्तराधिकारी | 1510–1560 |\n2 | दूसरा पुत्र | 1512–1558 |\n3 | वर्तमान प्रमुख | 1535–1601 |', marriages: '1-2', },
    { theme: 'aged', kind: 'dynasty', nodeStyle: 'circle', portraitsOn: true, highlight: '1,2,4' });

  // ---------------- Scale & size ----------------
  const sc = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Scale & size comparison', el: 'scale', dur: dur || 8 }, { f, p }));
  sc('sc-height-lineup', 'Height lineup + ruler', 'पैमाने पर ऊँचाई की तुलना — हर आकृति अपनी जगह उठती है। A height ruler lineup; each silhouette rises into place.',
    { title: 'कौन कितना ऊँचा?', sub: 'HEIGHT COMPARISON' }, { theme: 'clean', mode: 'height', giantOn: false });
  sc('sc-giant-reveal', 'Giant reveal pull-back', 'कतार बनती है, फिर कैमरा पीछे — और सबसे बड़ा सामने। The lineup forms, then the camera pulls back to reveal the giant.',
    { title: 'पैमाने का एहसास', sub: 'SCALE' }, { theme: 'clean', mode: 'height', giantOn: true });
  sc('sc-area-squares', 'Area squares', 'क्षेत्रफल की तुलना — बढ़ते वर्ग। Area comparison with squares that grow.',
    { title: 'कितनी जगह?', sub: 'AREA COMPARISON', items: 'stadium | स्टेडियम | 40\ndome | गुंबद | 12\nbus | बस | 0.03' }, { theme: 'clean', mode: 'area', giantOn: false });

  // ---------------- Cross-sections & layers ----------------
  const cr = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Cross-sections & layers', el: 'cross', dur: dur || 7 }, { f, p }));
  cr('cr-earth-layers', 'Earth layers', 'धरती की परतें — स्कैन करते हुए खुलती हैं, गहराई गिनती है। The layers of the Earth revealed by a sweeping scan with counting depths.',
    { title: 'धरती के अंदर', sub: 'CROSS-SECTION', items: 'पृथ्वी की परत | 30 | क्रस्ट\nमैंटल | 2900 | चट्टान\nबाहरी कोर | 5100 | तरल\nभीतरी कोर | 6371 | ठोस' }, { theme: 'aged', kind: 'earth' });
  cr('cr-sea-depth', 'Sea depth markers', 'समुद्र की गहराई — परतें और गहराई के निशान। Sea depth bands with counting depth markers.',
    { title: 'समुद्र की गहराई', sub: 'DEPTH PROFILE', items: 'सतह | 0 | SURFACE\प्रकाश क्षेत्र | 0.2 |\nमध्य सागर | 1 | TWILIGHT\nगहरा सागर | 4 | DEEP\nखाई | 11 | TRENCH' }, { theme: 'bp', kind: 'sea', unit: ' km' });
  cr('cr-building-floors', 'Building floors', 'इमारत की मंज़िलें ऊपर की ओर बनती हैं। Floors stack up with height counts.',
    { title: 'इमारत का कट', sub: 'SECTION', items: 'भूमि | 0 | LOBBY\nपहली | 4 | OFFICES\nदूसरी | 8 | OFFICES\nतीसरी | 12 | MEETING\nछत | 16 | ROOF' }, { theme: 'clean', kind: 'floors', unit: ' m' });
  cr('cr-tunnel-shaft', 'Tunnel / mine shaft', 'खान की सुरंग — पिंजरा नीचे जाता है, स्तर खुलते हैं। A mine shaft with the cage descending and galleries sliding open.',
    { title: 'खान का कट', sub: 'SHAFT SECTION', items: 'सतह | 0 | SURFACE\nस्तर 1 | 120 | LEVEL 1\nस्तर 2 | 240 | LEVEL 2\nस्तर 3 | 360 | LEVEL 3' }, { theme: 'chalk', kind: 'tunnel', unit: ' m' });
  cr('cr-pipe-section', 'Pipe cross-section', 'पाइप का कट — घेरे और प्रवाह। Pipe rings with flow dots in the bore.',
    { title: 'पाइप का कट', sub: 'SECTION', items: 'बाहरी खोल | 640 | JACKET\nइन्सुलेशन | 560 | INSULATION\nमुख्य पाइप | 480 | CORE' }, { theme: 'bp', kind: 'pipe', unit: ' mm' });

  // ---------------- Mechanisms ----------------
  const mc = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Mechanisms', el: 'mech', dur: dur || 9 }, { f, p }));
  mc('mc-gears-mesh', 'Meshing gears', 'दो गियर सही अनुपात में जुड़कर घूमते हैं। Two gears mesh at the true ratio and keep turning.',
    { title: 'गियर कैसे जुड़ते हैं', sub: 'MECHANISM', labels: 'संचालित गियर | DRIVER\nअनुगामी गियर | DRIVEN' }, { theme: 'chalk', kind: 'gears', speed: 1 });
  mc('mc-piston-crank', 'Piston / crank', 'पिस्टन-क्रैंक का सही यंत्रशास्त्र। True slider-crank kinematics.',
    { title: 'इंजन कैसे काम करता है', sub: 'PISTON', labels: 'पिस्टन | PISTON\nक्रैंकशाफ़्ट | CRANKSHAFT' }, { theme: 'bp', kind: 'piston', speed: 1.1 });
  mc('mc-conveyor-belt', 'Conveyor belt', 'कन्वेयर पट्टी — सामान बहता है। A conveyor belt with items riding along.',
    { title: 'कन्वेयर', sub: 'BELT', labels: 'पट्टी | BELT\nरोलर | ROLLER' }, { theme: 'clean', kind: 'conveyor', speed: 1 });
  mc('mc-pulley-lift', 'Pulley lift', 'घिरनी — भार उठता है। A two-wheel pulley with a rising load.',
    { title: 'घिरनी', sub: 'PULLEY', labels: 'बड़ी घिरनी | LARGE WHEEL\nभार | LOAD' }, { theme: 'aged', kind: 'pulley', speed: 0.8 });
  mc('mc-pendulum-swing', 'Pendulum', 'पेंडुलम का सही दोलन। A pendulum swinging on a true sine.',
    { title: 'पेंडुलम', sub: 'OSCILLATION', labels: 'द्रव्यमान | BOB\nधुरी | PIVOT' }, { theme: 'chalk', kind: 'pendulum', speed: 1 });
  mc('mc-valve-open', 'Valve opening', 'वाल्व खुलता-बंद होता है, बहाव बदलता है। A valve opens and closes; the flow responds.',
    { title: 'वाल्व', sub: 'FLOW CONTROL', labels: 'हैंडव्हील | HANDWHEEL\nप्लग | PLUG' }, { theme: 'bp', kind: 'valve', speed: 0.9 });
  mc('mc-turbine-spin', 'Turbine spin', 'टर्बाइन घूमती है, प्रवाह अंदर आता है। A spinning turbine with inflow dots.',
    { title: 'टर्बाइन', sub: 'ROTATION', labels: 'ब्लेड | BLADES\nशाफ़्ट | SHAFT' }, { theme: 'neon', kind: 'turbine', speed: 1.2 });

  // ---------------- Relationship diagrams ----------------
  const rl = (id, name, note, f, p, dur) => L.push(Object.assign({ id, name, note, fam: 'Relationship diagrams', el: 'relations', dur: dur || 6 }, { f, p }));
  rl('rl-venn2', 'Venn (2 circles)', 'दो घेरे खिसककर जुड़ते हैं, बीच हाइलाइट। Two circles slide together; the overlap lights up.',
    { title: 'दो धाराएँ', items: 'सेना\nनौसेना\nसंयुक्त अभियान' }, { theme: 'clean', kind: 'venn2' });
  rl('rl-venn3', 'Venn (3 circles)', 'तीन घेरे जुड़ते हैं — बीच का साझा हिस्सा। Three circles converge on the shared centre.',
    { title: 'तीन कारक', items: 'पूँजी\nश्रम\nतकनीक\nविकास' }, { theme: 'clean', kind: 'venn3' });
  rl('rl-matrix-2x2', '2×2 matrix', 'दो-दो विकल्पों का मैट्रिक्स — चौथा खाना हाइलाइट। A 2×2 with the winning quadrant highlighted.',
    { title: 'निर्णय मैट्रिक्स', items: 'कम लागत\nअधिक लागत\nकम जोखिम\nअधिक जोखिम\nकम\nअधिक' }, { theme: 'clean', kind: 'matrix' });
  rl('rl-hub-spoke', 'Hub & spoke', 'केंद्र से बाहर की ओर जुड़े नोड। Nodes connect out from the hub.',
    { title: 'केंद्र', items: 'बंदरगाह\nरेल\nहवाई\nसड़क\nतेल' }, { theme: 'bp', kind: 'hub' });
  rl('rl-compare-table', 'Comparison table', 'तुलना तालिका पंक्ति-दर-पंक्ति बनती है। A comparison table that builds row by row.',
    { title: 'तुलना', rows: 'विषय | विकल्प A | विकल्प B\nलागत | कम | अधिक\nगति | धीमी | तेज़\nजोखिम | उच्च | कम' }, { theme: 'clean', kind: 'table' });

  const byId = {};
  L.forEach(p => (byId[p.id] = p));
  const FAMS = ['Blueprint draw-on', 'Rotating wireframe', 'Exploded & cutaway', 'Labelled diagram', 'Process & flow', 'Trees & hierarchy', 'Scale & size comparison', 'Cross-sections & layers', 'Mechanisms', 'Relationship diagrams'];
  return { list: L, byId, FAMS };
})();
