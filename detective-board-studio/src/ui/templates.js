/* Detective Board Studio Pro. Original, fully editable fictional demonstration projects. */
(() => {
  'use strict';
  const DB = window.DB = window.DB || {};
  const copy = o => JSON.parse(JSON.stringify(o));
  const pose = (x = 1200, y = 675, zoom = 1, rotation = 0, tilt = 0) => ({ x, y, zoom, rotation, tilt });

  DB.themes = {
    cork: { id: 'cork', name: 'Classic cork', color: '#514132', paper: '#eee4ce', accent: '#bf453e' },
    noir: { id: 'noir', name: 'Midnight noir', color: '#182226', paper: '#dedbcf', accent: '#d2a957' },
    blueprint: { id: 'blueprint', name: 'Blueprint', color: '#163a4d', paper: '#e0e6df', accent: '#6dc7dc' },
    archive: { id: 'archive', name: 'Archive linen', color: '#555347', paper: '#d7c7a3', accent: '#b59659' },
    whiteboard: { id: 'whiteboard', name: 'Whiteboard', color: '#d8d9d1', paper: '#fbf7e9', accent: '#28617f' },
    dossier: { id: 'dossier', name: 'Classified desk', color: '#383d32', paper: '#d9c6a4', accent: '#c65846' },
    crimson: { id: 'crimson', name: 'Crimson velvet', color: '#382527', paper: '#e7dcc7', accent: '#d76a5c' },
    charcoal: { id: 'charcoal', name: 'Graphite wall', color: '#25282c', paper: '#e1e0d7', accent: '#e1ac54' }
  };

  DB.elementTypes = [
    { id: 'photo', name: 'Polaroid photo', description: 'A pinned photo with an editable caption. Add your own image or video.' },
    { id: 'note', name: 'Sticky note', description: 'A handwritten lead, question, or deduction.' },
    { id: 'document', name: 'Case document', description: 'A typed report with editable headline and paragraphs.' },
    { id: 'newspaper', name: 'Newspaper clipping', description: 'An editorial headline, columns, and supporting image.' },
    { id: 'map', name: 'Location map', description: 'A schematic street map, editable location caption, or your own map image.' },
    { id: 'fingerprint', name: 'Fingerprint card', description: 'A procedural fingerprint record and editable evidence metadata.' },
    { id: 'folder', name: 'Case folder', description: 'An archive file with an editable case name and number.' },
    { id: 'label', name: 'Evidence label', description: 'A compact strip for a name, time, or case identifier.' },
    { id: 'stamp', name: 'Rubber stamp', description: 'An editable verdict, classified mark, or status.' },
    { id: 'tape', name: 'Tape strip', description: 'A paper tape annotation or a strip to attach your evidence.' },
    { id: 'circle', name: 'Marker circle', description: 'A drawn attention ring with an optional annotation.' },
    { id: 'text', name: 'Board text', description: 'An editable board title, large clue, or time label.' },
    { id: 'evidence', name: 'Evidence bag', description: 'A specimen bag with a label and editable evidence caption.' },
    { id: 'screen', name: 'Surveillance screen', description: 'A framed surveillance view with editable timestamp or uploaded footage.' }
  ];

  const defaults = {
    photo: { w: 340, h: 390, color: '#f0e9d8', text: 'UNTITLED EVIDENCE', title: 'Photo evidence', subtitle: 'EXHIBIT 01 / ADD YOUR MEDIA', body: '', reveal: 'pin' },
    note: { w: 290, h: 235, color: '#dcca85', text: 'What connects these clues?', title: 'New lead', subtitle: 'WORKING THEORY', body: 'Add your notes here.', reveal: 'drop' },
    document: { w: 340, h: 430, color: '#e5dcc6', text: 'INCIDENT REPORT', title: 'INCIDENT REPORT', subtitle: 'REFERENCE 024 / FICTIONAL DEMO', body: 'Observation recorded at the location.\n\nCompare the witness account with the available timeline. Record the source and the next step.\n\nSTATUS: awaiting verification.', reveal: 'slide' },
    newspaper: { w: 460, h: 330, color: '#d7c8a8', text: 'THE STORY BEHIND THE CLUES', title: 'THE EVENING RECORD', subtitle: 'SPECIAL EDITION / FICTIONAL DEMO', body: 'A fresh lead has raised new questions. The original account and the supporting records no longer agree.\n\nThe timeline may hold the missing connection.', reveal: 'fade' },
    map: { w: 430, h: 320, color: '#c9cfb7', text: 'LAST KNOWN LOCATION', title: 'LOCATION STUDY', subtitle: 'SCHEMATIC MAP / FICTIONAL DEMO', body: 'Mark the location and connect it to the next clue.', reveal: 'scale' },
    fingerprint: { w: 250, h: 320, color: '#ddd6c7', text: 'PRINT RECORD', title: 'PRINT RECORD', subtitle: 'SPECIMEN 04 / FICTIONAL', body: 'COMPARE / DO NOT ASSUME A MATCH', reveal: 'pin' },
    folder: { w: 440, h: 320, color: '#b6a47b', text: 'CASE FILE 024', title: 'CASE FILE 024', subtitle: 'RESEARCH COPY / FICTIONAL', body: 'Evidence, interviews, and working notes.', reveal: 'slide' },
    label: { w: 300, h: 78, color: '#e5d9be', text: 'EXHIBIT A', title: '', subtitle: '', body: '', reveal: 'typewriter', pin: false },
    stamp: { w: 290, h: 120, color: '#b04038', text: 'CLASSIFIED', title: '', subtitle: '', body: '', reveal: 'scale', pin: false },
    tape: { w: 310, h: 70, color: '#c7b78b', text: 'KEEP THIS IN THE FILE', title: '', subtitle: '', body: '', reveal: 'slide', pin: false },
    circle: { w: 300, h: 220, color: '#bf453e', text: '', title: '', subtitle: '', body: '', reveal: 'fade', pin: false },
    text: { w: 480, h: 140, color: '#e9dfc8', text: 'THE MISSING CONNECTION', title: '', subtitle: '', body: '', reveal: 'typewriter', pin: false },
    evidence: { w: 270, h: 345, color: '#d0c6aa', text: 'EVIDENCE 07', title: 'EVIDENCE 07', subtitle: 'CHAIN OF CUSTODY / FICTIONAL', body: 'ITEM: recovered object\nLOCATION: archive desk\nSTATUS: awaiting review', reveal: 'drop' },
    screen: { w: 410, h: 290, color: '#334b4c', text: 'CAMERA 03', title: 'SURVEILLANCE', subtitle: '23:41:08 / DEMO FOOTAGE', body: '', reveal: 'fade' }
  };
  DB.nodeDefaults = type => ({ type: defaults[type] ? type : 'photo', x: 1200, y: 675, rotation: 0, media: null, mediaFit: 'cover', mediaX: 0.5, mediaY: 0.5, mediaZoom: 1, enter: 0, exit: null, reveal: 'pin', revealDuration: 0.8, pin: true, tape: false, depth: 1, opacity: 1, locked: false, ...copy(defaults[type] || defaults.photo) });

  const overview = p => pose((p.board.width || 2400) / 2, (p.board.height || 1350) / 2);
  const target = (p, n) => n || p.nodes.find(a => a.type === 'photo') || p.nodes[0] || { x: 1200, y: 675, w: 400, h: 400 };
  const focus = (p, n, z = 2.35, r = 0, t = 0) => { const a = target(p, n); return pose(a.x, a.y, z, r, t); };
  const last = p => copy(p.shots && p.shots.length ? p.shots[p.shots.length - 1].to : overview(p));
  const shot = (name, from, to, duration = 4, preset = 'push', ease = 'cinematic') => ({ id: 'shot-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, duration, ease, preset, from: copy(from), to: copy(to) });
  const preset = (id, name, description, apply) => ({ id, name, description, apply });
  DB.cameraPresets = [
    preset('overview', 'Full board', 'Ease back to a clear, level view of the entire case.', p => [shot('Full board', last(p), overview(p), 5, 'overview')]),
    preset('push', 'Slow push in', 'Move from the previous camera position into the selected clue.', (p, n) => [shot('Slow push in', last(p), focus(p, n, 2.4), 5, 'push')]),
    preset('pull', 'Pull back reveal', 'Start on a clue and reveal the complete evidence web.', (p, n) => [shot('Pull back reveal', focus(p, n, 2.8), overview(p), 6, 'pull')]),
    preset('travel', 'Clue to clue', 'Track across three connected clues with continuous endpoints.', p => {
      const meaningful = p.nodes.filter(a => !['label', 'stamp', 'tape', 'circle', 'text'].includes(a.type)).slice(0, 3);
      const ns = meaningful.length ? meaningful : [target(p)];
      let a = last(p); return ns.map((n, i) => { const b = focus(p, n, 2.15, i % 2 ? 2 : -2, 5); const s = shot('Track clue ' + (i + 1), a, b, 4, 'travel'); a = b; return s; });
    }),
    preset('orbit', 'Oblique arc', 'A simulated angled arc with editable roll and board tilt.', (p, n) => { const a = last(p), b = focus(p, n, 1.9, -6, 22), c = focus(p, n, 2.2, 5, -16); return [shot('Arc approach', a, b, 4, 'orbit'), shot('Arc across clue', b, c, 5, 'orbit')]; }),
    preset('follow', 'Follow the string', 'Travel between the endpoints of the first three connections.', p => {
      let a = last(p); const shots = p.edges.slice(0, 3).flatMap((e, i) => { const n = p.nodes.find(v => v.id === e.to); if (!n) return []; const b = focus(p, n, 2.2, i % 2 ? 1.5 : -1.5, 7); const s = shot('String trail ' + (i + 1), a, b, 4.5, 'follow'); a = b; return [s]; });
      return shots.length ? shots : [shot('Begin the string trail', a, focus(p, null, 2.2), 4.5, 'follow')];
    }),
    preset('reveal', 'The big reveal', 'Hold on the answer, then pull out to see the whole network.', (p, n) => { const a = focus(p, n, 2.6, -2, 8), b = focus(p, n, 2.8, 0, 0); return [shot('Answer close up', a, b, 3.5, 'reveal'), shot('The whole picture', b, overview(p), 6, 'reveal')]; }),
    preset('whip', 'Whip to evidence', 'Brief controlled camera travel, followed by a readable hold.', (p, n) => { const a = last(p), b = focus(p, n, 2.25, 0, 0); return [shot('Whip to evidence', a, b, 0.7, 'whip', 'smooth'), shot('Let the clue breathe', b, { ...b, zoom: 2.4 }, 3.3, 'whip', 'linear')]; }),
    preset('macro', 'Macro detail', 'A tight forensic study of the selected exhibit.', (p, n) => { const a = focus(p, n, 3.2, -2, 3), b = { ...a, zoom: 4.1, rotation: 1 }; return [shot('Macro approach', last(p), a, 3, 'macro'), shot('Forensic detail', a, b, 5, 'macro', 'linear')]; }),
    preset('handheld', 'Documentary drift', 'An irregular but continuous three-point documentary move.', (p, n) => { const a = last(p), b = focus(p, n, 2.15, -1.7, 4), c = { ...b, x: b.x + 27, y: b.y - 13, zoom: 2.25, rotation: 1.1 }, d = { ...b, x: b.x - 14, y: b.y + 9, zoom: 2.3, rotation: -0.5 }; return [shot('Handheld approach', a, b, 2.5, 'handheld'), shot('Documentary drift A', b, c, 3, 'handheld', 'linear'), shot('Documentary drift B', c, d, 3, 'handheld', 'linear')]; }),
    preset('vertical', 'Vertical scan', 'Scan down the board for a portrait documentary sequence.', p => { const c = overview(p), a = pose(c.x, 350, 1.9), b = pose(c.x, 1040, 1.9); return [shot('Find the top lead', last(p), a, 3, 'vertical'), shot('Vertical board scan', a, b, 7, 'vertical', 'linear'), shot('Board context', b, c, 4, 'vertical')]; }),
    preset('drift', 'Slow lateral drift', 'A subtle editorial move across the complete board.', p => { const c = overview(p), a = pose(c.x - 170, c.y - 20, 1.35, -1, 3), b = pose(c.x + 170, c.y + 20, 1.35, 1, 3); return [shot('Drift approach', last(p), a, 3, 'drift'), shot('Slow lateral drift', a, b, 9, 'drift', 'linear')]; }),
    preset('suspects', 'Suspect lineup', 'Give three photo exhibits an equal close-up and reading time.', p => { const photos = p.nodes.filter(n => n.type === 'photo').slice(0, 3); const ns = photos.length ? photos : [target(p)]; let a = last(p); return ns.map((n, i) => { const b = focus(p, n, 2.6, 0, 0); const s = shot('Exhibit ' + (i + 1), a, b, 4.5, 'suspects'); a = b; return s; }); }),
    preset('timeline', 'Timeline sweep', 'Move chronologically from the leftmost to the rightmost evidence.', p => { const ns = p.nodes.filter(a => !['stamp', 'tape', 'circle'].includes(a.type)).sort((a, b) => a.x - b.x); const a = focus(p, ns[0], 2), b = focus(p, ns[ns.length - 1], 2); return [shot('Timeline start', last(p), a, 3, 'timeline'), shot('Follow the timeline', a, b, 9, 'timeline', 'linear')]; }),
    preset('spiral', 'Spiral to the answer', 'An angled approach, closer counter-roll, and final level frame.', (p, n) => { const a = last(p), b = focus(p, n, 1.9, -9, 12), c = focus(p, n, 2.6, 5, -8), d = focus(p, n, 2.8, 0, 0); return [shot('Spiral approach', a, b, 3, 'spiral'), shot('Counter roll', b, c, 3, 'spiral'), shot('The answer', c, d, 3, 'spiral')]; }),
    preset('establish', 'Cinematic establish', 'Open with an angled board, then settle into a legible wide frame.', p => { const c = overview(p); return [shot('Angled opening', pose(c.x - 100, c.y + 70, 1.4, -5, 18), c, 7, 'establish')]; }),
    preset('hold', 'Locked camera', 'Hold the current camera position for a clean narration beat.', p => [shot('Locked camera', last(p), last(p), 5, 'hold', 'linear')]),
    preset('rack', 'Detail to context', 'Move from a forensic close-up to the surrounding clues.', (p, n) => { const a = focus(p, n, 3.7, -3, 5), b = focus(p, n, 1.65, 1, 0); return [shot('Detail study', a, { ...a, zoom: 3.85 }, 3, 'rack', 'linear'), shot('Detail to context', { ...a, zoom: 3.85 }, b, 5, 'rack')]; })
  ];

  const N = (id, type, x, y, text, opts = {}) => ({ id, ...DB.nodeDefaults(type), x, y, text, title: opts.title || text, ...opts });
  const E = (from, to, label, start = 2, opts = {}) => ({ id: 'edge-' + from + '-' + to, from, to, label, color: '#b93e38', width: 3.5, style: 'string', start, duration: 1.1, sag: 0.08, ...opts });
  function base(name, theme, header, seed) {
    const th = DB.themes[theme];
    return { version: 1, name, width: 1920, height: 1080, fps: 30, duration: 23, seed, board: { width: 2400, height: 1350, theme, color: th.color, lighting: 0.3, vignette: theme === 'whiteboard' ? 0.16 : 0.3, grain: 0.12, spotlight: 0.24, showHeader: true, header, subtitle: 'FICTIONAL DEMONSTRATION / REPLACE EVERY CLUE', frame: true }, camera: { handheld: 0, parallax: 0.35, letterbox: 0 }, nodes: [], edges: [], shots: [], media: {} };
  }
  function story(p, ids, duration = 23) {
    const wide = overview(p);
    let a = pose(1200, 675, 1.08, -1.5, 7);
    p.shots = [shot('Establish the case', a, wide, 4.5, 'establish')];
    a = wide;
    const visit = ids.map(id => p.nodes.find(n => n.id === id)).filter(Boolean).slice(0, 4);
    const each = Math.max(2, (duration - 9.5) / visit.length);
    visit.forEach((n, i) => {
      const z = n.type === 'map' || n.type === 'newspaper' || n.type === 'folder' ? 2.05 : 2.4;
      const b = pose(n.x, n.y, z, i % 2 ? 1.8 : -2, i % 2 ? -4 : 7);
      p.shots.push(shot(['Find the first lead', 'Connect the evidence', 'Question the account', 'Find the missing link'][i], a, b, each, i ? 'travel' : 'push'));
      a = b;
    });
    p.shots.push(shot('Reveal the complete case', a, wide, 5, 'reveal'));
    p.duration = p.shots.reduce((sum, s) => sum + s.duration, 0);
    return p;
  }

  const entries = [];
  function add(id, name, family, description, accent, make) { entries.push({ id, name, family, description, accent, make }); }

  add('harbour-files', 'The Harbour Files', 'Red string', 'A classic cork wall with a missing shipment, a witness, and a late-night trail.', '#bf654e', () => {
    const p = base('The Harbour Files', 'cork', 'THE HARBOUR FILES', 42);
    p.nodes = [
      N('harbour-photo', 'photo', 330, 445, 'THE LAST SHIPMENT', { rotation: -5, subtitle: 'NORTH QUAY / EXHIBIT 01', enter: 0 }),
      N('harbour-note', 'note', 760, 360, 'Why was the gate open?', { rotation: 4, enter: 0.35, color: '#cfb96e', body: 'The access log ends at 23:40.' }),
      N('harbour-building', 'photo', 1200, 455, 'WAREHOUSE NINE', { rotation: 3, enter: 0.7, subtitle: 'LOCATION B / FICTIONAL' }),
      N('harbour-report', 'document', 1700, 470, 'THE INCIDENT LOG', { rotation: -3, enter: 1.05, body: '23:12 — delivery arrived.\n23:26 — supervisor signed out.\n23:40 — access reader offline.\n23:47 — vehicle left the quay.\n\nOne signature is missing from the register. Compare with the gate camera.' }),
      N('harbour-print', 'fingerprint', 2120, 425, 'PARTIAL PRINT', { rotation: 5, enter: 1.4, subtitle: 'CRATE SEAL / NOT YET MATCHED' }),
      N('harbour-map', 'map', 470, 965, 'TWO ROUTES. ONE EXIT.', { rotation: 2, enter: 1.75, subtitle: 'NORTH QUAY / SCHEMATIC' }),
      N('harbour-witness', 'photo', 1020, 985, 'WITNESS A', { rotation: -4, enter: 2.1, subtitle: 'FICTIONAL PERSON / INTERVIEW 02' }),
      N('harbour-clipping', 'newspaper', 1590, 1000, 'CARGO VANISHES BEFORE DAWN', { rotation: 3, enter: 2.45, title: 'THE QUAYSIDE RECORD', body: 'The night shift reported an empty loading bay at first light. An unsigned docket and a silent access reader are the only leads.\n\nThe missing minutes may explain the route.' }),
      N('harbour-label', 'label', 2110, 875, '23:47 — THE MISSING MINUTE', { rotation: -4, enter: 2.8, w: 370 }),
      N('harbour-stamp', 'stamp', 2090, 1090, 'CASE OPEN', { rotation: -9, enter: 3.15, color: '#b84235' })
    ];
    p.edges = [E('harbour-photo', 'harbour-building', 'same shipment', 1.2), E('harbour-building', 'harbour-report', 'gate log', 1.6), E('harbour-report', 'harbour-print', 'seal recovered', 2.2), E('harbour-map', 'harbour-witness', 'last sighting', 2.8), E('harbour-witness', 'harbour-building', 'had access?', 3.2), E('harbour-photo', 'harbour-map', 'route', 3.6), E('harbour-report', 'harbour-label', '11 minutes', 4), E('harbour-clipping', 'harbour-label', 'time discrepancy', 4.4)];
    return story(p, ['harbour-photo', 'harbour-report', 'harbour-witness', 'harbour-label']);
  });

  add('midnight-witness', 'Midnight Witness', 'Noir', 'Cold surveillance frames, warm handwritten questions, and a patient oblique camera.', '#9db0ac', () => {
    const p = base('Midnight Witness', 'noir', 'A WITNESS AFTER MIDNIGHT', 91);
    p.board.spotlight = 0.4;
    p.nodes = [
      N('noir-screen', 'screen', 410, 460, 'CAMERA 03 / 00:17:42', { w: 490, h: 335, rotation: -2, subtitle: 'EAST ENTRANCE / FICTIONAL RECORD', enter: 0 }),
      N('noir-note', 'note', 970, 380, 'Someone returned.', { color: '#c8b98a', rotation: 5, enter: 0.4, body: 'The room had already been locked.' }),
      N('noir-person', 'photo', 1470, 480, 'THE UNKNOWN WITNESS', { rotation: -5, enter: 0.8, subtitle: 'IDENTITY UNCONFIRMED / FICTIONAL' }),
      N('noir-building', 'photo', 2030, 470, 'THE EAST ENTRANCE', { rotation: 4, enter: 1.2, subtitle: 'LOCATION 04 / NIGHT VIEW' }),
      N('noir-document', 'document', 420, 1010, 'INTERVIEW TRANSCRIPT', { rotation: 3, enter: 1.6, body: 'Q: When did you hear the door?\nA: Just after the clock stopped.\n\nQ: Did you see a face?\nA: Only a reflection in the glass.\n\nCheck the camera timestamp against the building clock.' }),
      N('noir-map', 'map', 1020, 990, 'THE BLIND SPOT', { rotation: -4, enter: 2, subtitle: 'EAST CORRIDOR / SCHEMATIC' }),
      N('noir-evidence', 'evidence', 1570, 990, 'EXHIBIT 12', { rotation: 4, enter: 2.4, body: 'ITEM: brass key\nFOUND: east doorway\nSTATUS: awaiting review' }),
      N('noir-label', 'label', 2040, 915, 'ONE KEY. TWO ENTRANCES.', { rotation: -3, enter: 2.8, w: 370 }),
      N('noir-stamp', 'stamp', 2020, 1110, 'UNCONFIRMED', { rotation: -8, enter: 3.2, color: '#bca36a' })
    ];
    p.edges = [E('noir-screen', 'noir-person', '00:17', 1, { color: '#ad403b' }), E('noir-person', 'noir-building', 'reflection', 1.5), E('noir-screen', 'noir-document', 'compare accounts', 2), E('noir-map', 'noir-building', 'unseen route', 2.5), E('noir-evidence', 'noir-person', 'who held the key?', 3), E('noir-evidence', 'noir-label', 'duplicate?', 3.5), E('noir-note', 'noir-map', 'after closing', 4)];
    return story(p, ['noir-screen', 'noir-person', 'noir-map', 'noir-evidence'], 26);
  });

  add('suspect-web', 'The Suspect Web', 'Relationships', 'A radial network of three fictional suspects, shared locations, and unresolved links.', '#b8544d', () => {
    const p = base('The Suspect Web', 'cork', 'EVERYONE HAS A CONNECTION', 128);
    p.nodes = [
      N('suspect-person-a', 'photo', 370, 420, 'ROWAN VALE', { rotation: -4, subtitle: 'FICTIONAL / SUBJECT A', enter: 0 }),
      N('suspect-person-b', 'photo', 1200, 390, 'ELLIOT SHAW', { rotation: 2, subtitle: 'FICTIONAL / SUBJECT B', enter: 0.35 }),
      N('suspect-person-c', 'photo', 2030, 420, 'MORGAN REED', { rotation: 5, subtitle: 'FICTIONAL / SUBJECT C', enter: 0.7 }),
      N('suspect-center', 'note', 1200, 865, 'WHO WAS IN ROOM 6?', { w: 360, h: 290, rotation: -2, color: '#d8bd73', enter: 1.05, body: 'Three accounts.\nOne shared location.\nTwo missing minutes.' }),
      N('suspect-report-a', 'document', 450, 1010, 'ALIBI / SUBJECT A', { w: 300, h: 360, rotation: 3, enter: 1.4, body: 'Claims to have left at 21:05.\n\nA receipt places the purchase at 21:17.\n\nVerify the register clock before drawing conclusions.' }),
      N('suspect-report-c', 'document', 1950, 1010, 'ALIBI / SUBJECT C', { w: 300, h: 360, rotation: -4, enter: 1.75, body: 'Claims to have stayed upstairs.\n\nThe corridor camera was turned away.\n\nRequest the maintenance record.' }),
      N('suspect-map', 'map', 780, 710, 'ROOM SIX', { w: 275, h: 205, rotation: -6, enter: 2.1 }),
      N('suspect-label', 'label', 1620, 730, 'SHARED ACCESS CARD', { w: 320, rotation: 5, enter: 2.45 }),
      N('suspect-status', 'stamp', 1200, 1160, 'THEORY ONLY', { rotation: -6, enter: 2.8, color: '#a84235' })
    ];
    p.edges = [E('suspect-person-a', 'suspect-center', 'same room', 1.2), E('suspect-person-b', 'suspect-center', 'shared key', 1.7), E('suspect-person-c', 'suspect-center', 'seen nearby', 2.2), E('suspect-person-a', 'suspect-report-a', 'check alibi', 2.6), E('suspect-person-c', 'suspect-report-c', 'verify time', 3), E('suspect-map', 'suspect-label', 'common link', 3.4), E('suspect-person-b', 'suspect-label', 'access log', 3.8)];
    return story(p, ['suspect-person-a', 'suspect-person-b', 'suspect-person-c', 'suspect-center'], 24);
  });

  add('vanishing-route', 'The Vanishing Route', 'Maps', 'A route investigation with two city maps, location evidence, and a missing waypoint.', '#73a9b8', () => {
    const p = base('The Vanishing Route', 'blueprint', 'THE ROUTE THAT DISAPPEARED', 211);
    p.nodes = [
      N('route-map-west', 'map', 540, 500, 'POINT A / THE STATION', { w: 650, h: 440, rotation: -3, enter: 0, subtitle: 'WEST DISTRICT / SCHEMATIC' }),
      N('route-map-east', 'map', 1790, 500, 'POINT C / THE QUAY', { w: 650, h: 440, rotation: 3, enter: 0.45, subtitle: 'EAST DISTRICT / SCHEMATIC' }),
      N('route-note', 'note', 1190, 520, 'WHERE IS POINT B?', { w: 320, h: 255, rotation: -2, color: '#c9c8a1', enter: 0.9, body: 'The recorded journey takes\neleven minutes too long.' }),
      N('route-station', 'photo', 380, 1050, '21:10 / THE STATION', { w: 280, h: 315, rotation: 4, enter: 1.35, subtitle: 'FICTIONAL LOCATION A' }),
      N('route-bridge', 'photo', 920, 1020, '21:24 / THE BRIDGE', { w: 280, h: 315, rotation: -5, enter: 1.8, subtitle: 'FICTIONAL LOCATION B' }),
      N('route-harbour', 'photo', 1490, 1050, '21:38 / THE QUAY', { w: 280, h: 315, rotation: 3, enter: 2.25, subtitle: 'FICTIONAL LOCATION C' }),
      N('route-record', 'document', 2050, 1050, 'THE TRAVEL RECORD', { w: 290, h: 350, rotation: -3, enter: 2.7, body: 'Station to bridge: 14 min\nBridge to quay: 14 min\n\nExpected journey: 17 min\nRecorded journey: 28 min\n\nInvestigate the unexplained stop.' }),
      N('route-label', 'label', 1180, 235, 'FOLLOW THE MISSING ELEVEN MINUTES', { w: 590, rotation: 0, enter: 3.15 })
    ];
    p.edges = [E('route-map-west', 'route-note', 'unrecorded stop', 1.1, { color: '#dbb16a', style: 'dashed' }), E('route-note', 'route-map-east', 'eleven minutes', 1.6, { color: '#dbb16a', style: 'dashed' }), E('route-station', 'route-bridge', '14 min', 2.2, { color: '#d26659', style: 'arrow' }), E('route-bridge', 'route-harbour', '14 min', 2.7, { color: '#d26659', style: 'arrow' }), E('route-harbour', 'route-record', 'time record', 3.2), E('route-map-west', 'route-station', 'start', 3.7), E('route-map-east', 'route-harbour', 'end', 4.2)];
    return story(p, ['route-map-west', 'route-bridge', 'route-record', 'route-note'], 25);
  });

  add('missing-minutes', 'The Missing Minutes', 'Timelines', 'A left-to-right sequence of time-stamped evidence and one conspicuous gap.', '#c9aa69', () => {
    const p = base('The Missing Minutes', 'charcoal', 'RECONSTRUCT THE NIGHT', 318);
    p.nodes = [
      N('time-a', 'label', 290, 345, '22:03 / ARRIVAL', { w: 330, enter: 0 }),
      N('time-b', 'label', 880, 345, '22:17 / LAST CONTACT', { w: 360, enter: 0.35 }),
      N('time-gap', 'label', 1470, 345, '22:18 — 22:26 / ???', { w: 370, color: '#b44b3d', enter: 0.7 }),
      N('time-c', 'label', 2070, 345, '22:27 / DEPARTURE', { w: 370, enter: 1.05 }),
      N('time-building', 'photo', 300, 690, 'THE WEST DOOR', { w: 300, h: 350, rotation: -4, subtitle: 'EXHIBIT 01 / FICTIONAL', enter: 0.2 }),
      N('time-screen', 'screen', 880, 660, 'LAST FRAME / 22:17:09', { w: 420, h: 295, rotation: 2, enter: 0.55 }),
      N('time-note', 'note', 1470, 675, 'NINE MINUTES MISSING', { w: 330, h: 270, color: '#cbb577', rotation: -2, enter: 0.9, body: 'No camera frames.\nNo access entries.\nOne unanswered call.' }),
      N('time-car', 'photo', 2070, 690, 'THE DEPARTURE', { w: 300, h: 350, rotation: 4, subtitle: 'EXHIBIT 04 / FICTIONAL', enter: 1.25 }),
      N('time-document', 'document', 730, 1090, 'CLOCK COMPARISON', { w: 390, h: 280, rotation: 2, enter: 1.6, body: 'Lobby camera: network time.\nDoor reader: local time.\nWitness watch: not synchronised.\n\nCorrect the clocks before comparing the accounts.' }),
      N('time-status', 'stamp', 1660, 1100, 'TIMELINE INCOMPLETE', { w: 480, rotation: -4, enter: 2, color: '#c56f58' })
    ];
    p.edges = [E('time-building', 'time-screen', '14 minutes', 1.4, { color: '#d0a95b', style: 'arrow' }), E('time-screen', 'time-note', 'lost footage', 2, { style: 'dashed', color: '#c35046' }), E('time-note', 'time-car', '9 minutes', 2.6, { style: 'dashed', color: '#c35046' }), E('time-document', 'time-screen', 'compare clocks', 3.2), E('time-gap', 'time-note', 'the gap', 3.8)];
    return story(p, ['time-building', 'time-screen', 'time-note', 'time-document'], 24);
  });

  add('classified-dossier', 'Classified Dossier', 'Dossiers', 'A layered intelligence desk of reports, photographs, evidence, and restricted annotations.', '#a1a57d', () => {
    const p = base('Classified Dossier', 'dossier', 'OPERATION NIGHTGLASS', 449);
    p.nodes = [
      N('dossier-folder', 'folder', 440, 440, 'OPERATION NIGHTGLASS', { w: 540, h: 350, rotation: -5, subtitle: 'RESEARCH COPY / FICTIONAL OPERATION', enter: 0 }),
      N('dossier-document', 'document', 1100, 545, 'FIELD OBSERVATION 07', { w: 390, h: 510, rotation: 3, enter: 0.4, body: 'OBJECTIVE\nIdentify the source of the signal.\n\nOBSERVATION\nThe transmission began at 04:12. A vehicle was parked by the relay station. Its departure coincides with the final burst.\n\nNEXT STEP\nCompare the relay maintenance schedule with the sighting.' }),
      N('dossier-station', 'photo', 1730, 470, 'RELAY STATION', { rotation: -3, enter: 0.8, subtitle: 'SITE DELTA / FICTIONAL' }),
      N('dossier-note', 'note', 2160, 475, 'Who had access?', { w: 260, h: 250, color: '#c7bd8b', rotation: 5, enter: 1.2, body: 'Check the service roster.' }),
      N('dossier-evidence', 'evidence', 400, 1010, 'RECOVERED FRAGMENT', { rotation: 4, enter: 1.6, body: 'ITEM: transmitter casing\nEXHIBIT: 07-B\nSTATUS: catalogued' }),
      N('dossier-person', 'photo', 1570, 1030, 'CONTACT: THE ARCHIVIST', { rotation: 3, enter: 2, subtitle: 'FICTIONAL PERSON / ID PENDING' }),
      N('dossier-map', 'map', 2100, 1010, 'THE SIGNAL TRIANGLE', { w: 330, h: 265, rotation: -5, enter: 2.4 }),
      N('dossier-stamp', 'stamp', 870, 1020, 'RESTRICTED', { w: 340, color: '#ae4838', rotation: -10, enter: 2.8 }),
      N('dossier-tape', 'tape', 900, 1180, 'FOLLOW THE TRANSMISSION', { w: 420, rotation: 3, enter: 3.2 })
    ];
    p.edges = [E('dossier-folder', 'dossier-document', 'field notes', 1.1), E('dossier-document', 'dossier-station', '04:12', 1.6), E('dossier-station', 'dossier-note', 'service roster', 2.1), E('dossier-evidence', 'dossier-person', 'source?', 2.6), E('dossier-person', 'dossier-map', 'three locations', 3.1), E('dossier-document', 'dossier-person', 'contact log', 3.6)];
    return story(p, ['dossier-folder', 'dossier-document', 'dossier-station', 'dossier-person'], 27);
  });

  add('archive-1936', 'The 1936 Archive', 'Archives', 'A warm historical investigation built from press clippings and recovered records.', '#b89a63', () => {
    const p = base('The 1936 Archive', 'archive', 'A LETTER FROM 1936', 536);
    p.nodes = [
      N('archive-press', 'newspaper', 480, 490, 'THE TRAIN THAT NEVER ARRIVED', { w: 570, h: 390, rotation: -4, title: 'THE NORTHLINE CHRONICLE', subtitle: '17 NOVEMBER 1936 / FICTIONAL EDITION', enter: 0, body: 'The midnight mail failed to reach its destination. The station register records a departure, yet the signal box carries no arrival entry.\n\nA letter discovered decades later may explain the final stop.' }),
      N('archive-train', 'photo', 1190, 440, 'NORTHLINE TERMINUS', { rotation: 3, enter: 0.4, subtitle: 'ARCHIVE EXHIBIT / FICTIONAL' }),
      N('archive-letter', 'document', 1810, 520, 'THE UNPOSTED LETTER', { w: 400, h: 490, rotation: -3, enter: 0.8, subtitle: 'FOUND IN A LOCKED DRAWER', body: 'Dear R.,\n\nIf the last train leaves without me, take the envelope to the old station office. Do not trust the date on the register.\n\nThe answer is hidden in the duplicate.\n\n— E.' }),
      N('archive-date', 'label', 2200, 290, '1936', { w: 200, rotation: 5, enter: 1.2 }),
      N('archive-person', 'photo', 350, 1040, 'THE STATION MASTER', { w: 300, h: 345, rotation: 5, enter: 1.6, subtitle: 'FICTIONAL PERSON / RECORD 04' }),
      N('archive-map', 'map', 950, 1030, 'THE ABANDONED BRANCH', { w: 440, h: 300, rotation: -2, enter: 2 }),
      N('archive-folder', 'folder', 1650, 1060, 'DUPLICATE REGISTER', { w: 430, h: 280, rotation: 4, enter: 2.4, subtitle: 'ARCHIVE BOX 36 / FICTIONAL' }),
      N('archive-note', 'note', 2150, 1000, 'The dates do not match.', { w: 260, h: 230, color: '#c9b988', rotation: -5, enter: 2.8, body: 'Compare both copies.' })
    ];
    p.edges = [E('archive-press', 'archive-train', 'midnight service', 1.2, { color: '#8c5039' }), E('archive-train', 'archive-letter', 'unposted', 1.7), E('archive-letter', 'archive-folder', 'the duplicate', 2.2), E('archive-person', 'archive-map', 'final route', 2.7), E('archive-map', 'archive-train', 'branch line', 3.2), E('archive-folder', 'archive-note', 'different dates', 3.7)];
    return story(p, ['archive-press', 'archive-letter', 'archive-map', 'archive-folder'], 28);
  });

  add('open-case', 'Open Case Workshop', 'Whiteboard', 'A clear, bright research board for explainers, interviews, and working theories.', '#6c9caf', () => {
    const p = base('Open Case Workshop', 'whiteboard', 'WHAT DO WE ACTUALLY KNOW?', 678);
    p.board.lighting = 0.12;
    p.nodes = [
      N('workshop-question', 'note', 390, 445, 'THE QUESTION', { w: 350, h: 280, rotation: -3, enter: 0, color: '#e5d69b', body: 'Why did the system stop\nat exactly 08:15?' }),
      N('workshop-record', 'document', 1030, 495, 'CONFIRMED OBSERVATIONS', { w: 390, h: 390, rotation: 2, enter: 0.4, body: '08:12 — normal operation.\n08:14 — maintenance access.\n08:15 — system offline.\n08:21 — service restored.\n\nThese observations are fictional demonstration data.' }),
      N('workshop-building', 'photo', 1720, 465, 'THE CONTROL ROOM', { rotation: -3, enter: 0.8, subtitle: 'FICTIONAL LOCATION / REPLACE PHOTO' }),
      N('workshop-label', 'label', 2160, 435, 'OBSERVE → VERIFY', { w: 300, rotation: 4, enter: 1.2, color: '#cbddd8' }),
      N('workshop-map', 'map', 430, 1030, 'SYSTEM MAP', { w: 380, h: 290, rotation: 3, enter: 1.6 }),
      N('workshop-theory', 'note', 1020, 1020, 'WORKING THEORY', { w: 350, h: 280, rotation: -4, enter: 2, color: '#c7d4b3', body: 'A routine change may have\ntriggered the shutdown.\n\nWhat would disprove this?' }),
      N('workshop-source', 'document', 1660, 1040, 'NEXT VERIFICATION', { w: 370, h: 330, rotation: 2, enter: 2.4, body: '1. Compare maintenance notes.\n2. Check the event timestamps.\n3. Reproduce the sequence.\n4. Record the alternate explanations.' }),
      N('workshop-stamp', 'stamp', 2150, 1050, 'VERIFY FIRST', { w: 290, rotation: -5, enter: 2.8, color: '#31677d' })
    ];
    p.edges = [E('workshop-question', 'workshop-record', 'evidence', 1, { color: '#326e85', style: 'arrow' }), E('workshop-record', 'workshop-building', 'location', 1.6, { color: '#326e85', style: 'line' }), E('workshop-map', 'workshop-theory', 'model', 2.2, { color: '#5d7d51', style: 'arrow' }), E('workshop-theory', 'workshop-source', 'test it', 2.8, { color: '#5d7d51', style: 'arrow' }), E('workshop-record', 'workshop-theory', 'working link', 3.4, { color: '#ad843b', style: 'dashed' })];
    return story(p, ['workshop-question', 'workshop-record', 'workshop-theory', 'workshop-source'], 23);
  });

  add('forensic-table', 'Forensic Table', 'Forensics', 'A close study of fingerprints, sealed evidence, scene photos, and a comparison report.', '#91b1a5', () => {
    const p = base('Forensic Table', 'noir', 'EVERY TRACE TELLS YOU SOMETHING', 749);
    p.nodes = [
      N('forensic-scene', 'photo', 360, 460, 'THE SCENE / EXHIBIT A', { w: 350, h: 400, rotation: -3, enter: 0, subtitle: 'FICTIONAL SCENE / NOT A REAL CASE' }),
      N('forensic-print-a', 'fingerprint', 950, 480, 'RECOVERED TRACE', { w: 300, h: 390, rotation: 3, enter: 0.4, subtitle: 'SURFACE A / PARTIAL PRINT' }),
      N('forensic-print-b', 'fingerprint', 1500, 480, 'COMPARISON SAMPLE', { w: 300, h: 390, rotation: -2, enter: 0.8, subtitle: 'REFERENCE SAMPLE / FICTIONAL' }),
      N('forensic-evidence', 'evidence', 2070, 490, 'SEALED EXHIBIT B', { w: 300, h: 390, rotation: 4, enter: 1.2, body: 'ITEM: glass fragment\nLOCATION: window ledge\nCHAIN: sealed for review' }),
      N('forensic-report', 'document', 550, 1030, 'COMPARISON REPORT', { w: 450, h: 340, rotation: 2, enter: 1.6, body: 'Observe ridge flow and the quality of the available trace.\n\nDo not infer an identification from an incomplete fictional sample.\n\nRecord limitations and request a second review.' }),
      N('forensic-note', 'note', 1250, 1020, 'A trace is a lead,\nnot a conclusion.', { w: 350, h: 260, rotation: -4, enter: 2, color: '#c6c29d', body: 'Compare. Verify. Document.' }),
      N('forensic-label', 'label', 1900, 920, 'SAMPLE → COMPARE → REVIEW', { w: 450, enter: 2.4, rotation: 2 }),
      N('forensic-status', 'stamp', 1920, 1120, 'REVIEW PENDING', { w: 340, rotation: -6, color: '#b6ac7e', enter: 2.8 })
    ];
    p.edges = [E('forensic-scene', 'forensic-print-a', 'trace found', 1.1), E('forensic-print-a', 'forensic-print-b', 'compare', 1.7, { color: '#b5aa6c', style: 'dashed' }), E('forensic-print-b', 'forensic-evidence', 'same surface?', 2.3), E('forensic-report', 'forensic-print-a', 'quality check', 2.9), E('forensic-note', 'forensic-label', 'second review', 3.5)];
    return story(p, ['forensic-scene', 'forensic-print-a', 'forensic-print-b', 'forensic-report'], 24);
  });

  add('paper-trail', 'Follow the Paper Trail', 'Dossiers', 'A financial mystery with linked receipts, organisations, and a final ledger.', '#d0a878', () => {
    const p = base('Follow the Paper Trail', 'dossier', 'FOLLOW THE PAPER TRAIL', 851);
    p.nodes = [
      N('ledger-start', 'folder', 380, 440, 'THE ORIGINAL CONTRACT', { w: 440, h: 320, rotation: -4, enter: 0, subtitle: 'NORTHSTAR PROJECT / FICTIONAL' }),
      N('ledger-a', 'document', 980, 490, 'TRANSFER / 0041', { w: 330, h: 390, rotation: 3, enter: 0.4, body: 'SENDER: Northstar Studio\nRECIPIENT: Alder Services\nAMOUNT: 48,000 demo units\nREFERENCE: equipment deposit\n\nFind the corresponding invoice.' }),
      N('ledger-b', 'document', 1550, 490, 'INVOICE / A-17', { w: 330, h: 390, rotation: -2, enter: 0.8, body: 'SUPPLIER: Alder Services\nITEM: archive equipment\nAMOUNT: 48,000 demo units\nSTATUS: marked paid\n\nThe delivery address is missing.' }),
      N('ledger-building', 'photo', 2090, 470, 'THE REGISTERED ADDRESS', { w: 300, h: 350, rotation: 4, enter: 1.2, subtitle: 'FICTIONAL OFFICE / EXHIBIT 04' }),
      N('ledger-note', 'note', 380, 1030, 'SAME AMOUNT.\nDIFFERENT REFERENCE.', { w: 330, h: 280, rotation: 3, enter: 1.6, color: '#c6b980', body: 'Check the ledger entry.' }),
      N('ledger-record', 'document', 1030, 1040, 'THE MISSING LEDGER LINE', { w: 430, h: 340, rotation: -3, enter: 2, body: '0040 — storage rent\n0041 — equipment deposit\n0042 — entry removed\n0043 — archive delivery\n\nWhat was recorded between the payment and the delivery?' }),
      N('ledger-person', 'photo', 1690, 1040, 'THE AUTHORISED SIGNATORY', { w: 290, h: 335, rotation: 4, enter: 2.4, subtitle: 'FICTIONAL PERSON / CONTACT 03' }),
      N('ledger-status', 'stamp', 2170, 1050, 'TRACE THE ENTRY', { w: 290, rotation: -7, enter: 2.8, color: '#b64f3c' })
    ];
    p.edges = [E('ledger-start', 'ledger-a', 'deposit', 1), E('ledger-a', 'ledger-b', 'matching amount', 1.6, { style: 'arrow' }), E('ledger-b', 'ledger-building', 'address?', 2.2), E('ledger-a', 'ledger-record', 'line 0042', 2.8), E('ledger-record', 'ledger-person', 'signature', 3.4), E('ledger-note', 'ledger-record', 'compare references', 4)];
    return story(p, ['ledger-a', 'ledger-b', 'ledger-record', 'ledger-person'], 25);
  });

  add('conspiracy-wall', 'The Connection Wall', 'Relationships', 'A dense but legible relationship web with a central question and coloured leads.', '#c75c54', () => {
    const p = base('The Connection Wall', 'crimson', 'ONE EVENT. MANY CONNECTIONS.', 979);
    p.nodes = [
      N('web-person-a', 'photo', 350, 410, 'THE COLLECTOR', { w: 290, h: 335, rotation: -5, enter: 0, subtitle: 'FICTIONAL PERSON / SUBJECT 01' }),
      N('web-person-b', 'photo', 2010, 410, 'THE COURIER', { w: 290, h: 335, rotation: 5, enter: 0.3, subtitle: 'FICTIONAL PERSON / SUBJECT 02' }),
      N('web-paper', 'newspaper', 1170, 400, 'A CITYWIDE BLACKOUT', { w: 510, h: 320, rotation: 1, enter: 0.6, title: 'THE METROPOLITAN RECORD', body: 'At 02:14, three substations went silent. The maintenance records appear unrelated, until one name recurs on every work order.' }),
      N('web-question', 'note', 1180, 850, 'WHAT IS THE SHARED LINK?', { w: 370, h: 290, rotation: -3, color: '#c9b37b', enter: 0.9, body: 'Three sites.\nTwo contractors.\nOne authorisation.' }),
      N('web-map', 'map', 420, 900, 'THREE SUBSTATIONS', { w: 360, h: 280, rotation: 3, enter: 1.2 }),
      N('web-report', 'document', 1950, 930, 'MAINTENANCE ORDER', { w: 340, h: 390, rotation: -4, enter: 1.5, body: 'SITE A — approved 01:22\nSITE B — approved 01:24\nSITE C — approved 01:26\n\nEach carries the same reference code: N-08.\n\nVerify who issued the code.' }),
      N('web-evidence', 'evidence', 770, 1130, 'ACCESS TOKEN N-08', { w: 230, h: 260, rotation: -3, enter: 1.8 }),
      N('web-label', 'label', 1490, 1180, 'AUTHORISED BY WHOM?', { w: 350, rotation: 4, enter: 2.1 }),
      N('web-stamp', 'stamp', 2160, 1190, 'UNVERIFIED', { w: 280, rotation: -5, enter: 2.4, color: '#d59176' }),
      N('web-top-label', 'label', 1200, 225, 'A WORKING THEORY / FICTIONAL DEMO', { w: 650, rotation: -1, enter: 2.7 })
    ];
    p.edges = [E('web-person-a', 'web-paper', 'archived records', 0.9), E('web-paper', 'web-person-b', 'delivery', 1.4), E('web-map', 'web-question', 'same outage', 1.9), E('web-report', 'web-question', 'shared code', 2.4), E('web-person-a', 'web-map', 'site visit', 2.9, { style: 'dashed', color: '#d5b264' }), E('web-person-b', 'web-report', 'work order', 3.4), E('web-evidence', 'web-question', 'N-08', 3.9), E('web-question', 'web-label', 'the final question', 4.4)];
    return story(p, ['web-paper', 'web-map', 'web-report', 'web-question'], 25);
  });

  add('press-investigation', 'Behind the Headline', 'Archives', 'An investigative press collage with competing accounts and the source document.', '#b7aa8a', () => {
    const p = base('Behind the Headline', 'archive', 'BEHIND THE HEADLINE', 1043);
    p.nodes = [
      N('press-lead', 'newspaper', 480, 490, 'THE OFFICIAL ACCOUNT', { w: 590, h: 410, rotation: -3, enter: 0, title: 'THE DAILY RECORD', subtitle: 'SPECIAL REPORT / FICTIONAL', body: 'The archive closed after a routine inspection. Officials described the decision as temporary. The public notice provides no reopening date.\n\nA separate maintenance memo tells a different story.' }),
      N('press-alternate', 'newspaper', 1790, 480, 'THE ACCOUNT THAT CHANGED', { w: 590, h: 410, rotation: 3, enter: 0.5, title: 'THE OBSERVER', subtitle: 'FOLLOW-UP / FICTIONAL', body: 'The first announcement mentioned structural repairs. The revised notice mentions missing records. What changed between the two statements?\n\nReview the original document before drawing a conclusion.' }),
      N('press-note', 'note', 1160, 470, 'SAME DAY.\nTWO ACCOUNTS.', { w: 320, h: 260, rotation: -4, enter: 1, color: '#d4c492', body: 'Find the original memo.' }),
      N('press-building', 'photo', 380, 1040, 'THE MUNICIPAL ARCHIVE', { w: 310, h: 350, rotation: 4, enter: 1.5, subtitle: 'FICTIONAL LOCATION' }),
      N('press-document', 'document', 1040, 1030, 'SOURCE DOCUMENT / 17-B', { w: 450, h: 360, rotation: 2, enter: 2, body: 'Inspection completed: 09:15.\nFirst notice issued: 10:20.\nMemo revised: 13:40.\nSecond notice issued: 14:05.\n\nThe amendment adds a reference to archive box 17-B.' }),
      N('press-folder', 'folder', 1720, 1050, 'ARCHIVE BOX 17-B', { w: 410, h: 290, rotation: -3, enter: 2.5 }),
      N('press-label', 'label', 2180, 990, 'CHECK THE SOURCE', { w: 280, rotation: 4, enter: 3 }),
      N('press-stamp', 'stamp', 2140, 1160, 'RECORD FOUND', { w: 300, rotation: -6, enter: 3.5, color: '#9d543c' })
    ];
    p.edges = [E('press-lead', 'press-note', 'first statement', 1.2), E('press-note', 'press-alternate', 'revised statement', 1.8), E('press-building', 'press-document', 'source', 2.4), E('press-document', 'press-folder', '17-B', 3), E('press-alternate', 'press-document', 'amendment', 3.6), E('press-folder', 'press-label', 'verify context', 4.2)];
    return story(p, ['press-lead', 'press-alternate', 'press-document', 'press-folder'], 26);
  });

  add('surveillance-room', 'Surveillance Room', 'Noir', 'Three camera views, a camera map, and the crucial frame between recordings.', '#7aa8a4', () => {
    const p = base('Surveillance Room', 'charcoal', 'THREE CAMERAS. ONE BLIND SPOT.', 1187);
    p.nodes = [
      N('surveil-screen-a', 'screen', 420, 480, 'CAM 01 / 03:11:52', { w: 520, h: 340, rotation: -2, enter: 0, subtitle: 'WEST DOOR / FICTIONAL RECORD' }),
      N('surveil-screen-b', 'screen', 1200, 480, 'CAM 02 / 03:12:04', { w: 520, h: 340, rotation: 1, enter: 0.4, subtitle: 'MAIN CORRIDOR / FICTIONAL RECORD' }),
      N('surveil-screen-c', 'screen', 1980, 480, 'CAM 03 / SIGNAL LOST', { w: 520, h: 340, rotation: -1, enter: 0.8, subtitle: 'EAST EXIT / FICTIONAL RECORD' }),
      N('surveil-map', 'map', 450, 1040, 'CAMERA COVERAGE', { w: 480, h: 320, rotation: 3, enter: 1.2 }),
      N('surveil-note', 'note', 1190, 1000, 'TWELVE SECONDS\nBETWEEN FRAMES', { w: 380, h: 290, rotation: -3, enter: 1.6, color: '#c9bd83', body: 'The route crosses the\nunrecorded east corridor.' }),
      N('surveil-log', 'document', 1900, 1040, 'RECORDER EVENT LOG', { w: 410, h: 350, rotation: 3, enter: 2, body: '03:11:52 — movement, west.\n03:12:04 — movement, central.\n03:12:09 — east signal loss.\n03:12:31 — east restored.\n\nWas the loss scheduled or unexpected?' }),
      N('surveil-label', 'label', 1200, 225, 'ALL TIMES ARE FICTIONAL DEMO DATA', { w: 650, enter: 2.4 }),
      N('surveil-status', 'stamp', 1200, 1220, 'FIND THE MISSING FRAME', { w: 510, rotation: -3, color: '#b7604e', enter: 2.8 })
    ];
    p.edges = [E('surveil-screen-a', 'surveil-screen-b', '12 seconds', 1.2, { style: 'arrow' }), E('surveil-screen-b', 'surveil-screen-c', 'signal lost', 1.8, { style: 'dashed' }), E('surveil-map', 'surveil-screen-a', 'coverage', 2.4), E('surveil-note', 'surveil-screen-b', 'last clear frame', 3), E('surveil-log', 'surveil-screen-c', 'event 03', 3.6), E('surveil-map', 'surveil-note', 'blind spot', 4.2)];
    return story(p, ['surveil-screen-a', 'surveil-screen-b', 'surveil-screen-c', 'surveil-log'], 24);
  });

  add('final-revelation', 'The Final Connection', 'Red string', 'An opening-ready mystery with three leads converging on one sealed exhibit.', '#ce8d5c', () => {
    const p = base('The Final Connection', 'cork', 'THE CLUE THAT CHANGES EVERYTHING', 1268);
    p.nodes = [
      N('final-harbour', 'photo', 380, 425, 'THE PLACE', { w: 320, h: 365, rotation: -5, enter: 0, subtitle: 'NORTH DOCK / FICTIONAL' }),
      N('final-person', 'photo', 1200, 415, 'THE PERSON', { w: 320, h: 365, rotation: 2, enter: 0.4, subtitle: 'THE ARCHIVIST / FICTIONAL' }),
      N('final-paper', 'document', 2020, 440, 'THE RECORD', { w: 340, h: 400, rotation: 4, enter: 0.8, body: 'Delivery accepted at 18:47.\nReference: sealed exhibit 09.\nReceiver: initial only.\n\nThe same mark appears on the reverse of the photograph.' }),
      N('final-exhibit', 'evidence', 1200, 990, 'SEALED EXHIBIT 09', { w: 330, h: 390, rotation: -2, enter: 2, subtitle: 'THE SHARED CONNECTION', body: 'ITEM: archive key\nREFERENCE: exhibit 09\nSTATUS: seal intact' }),
      N('final-note-a', 'note', 410, 990, 'A place is not\nan explanation.', { w: 320, h: 260, rotation: 4, enter: 1.2, body: 'Find what connects them.', color: '#cbbb7f' }),
      N('final-note-b', 'note', 2020, 990, 'THE SAME MARK.', { w: 320, h: 260, rotation: -4, enter: 1.6, body: 'The connection was\nin plain sight.', color: '#d1bd83' }),
      N('final-label', 'label', 1200, 730, '09 / THE MISSING CONNECTION', { w: 500, enter: 2.4, rotation: 0 }),
      N('final-status', 'stamp', 2030, 1190, 'CONNECTED', { w: 330, rotation: -8, color: '#b34335', enter: 3 })
    ];
    p.edges = [E('final-harbour', 'final-exhibit', 'the delivery', 2.6), E('final-person', 'final-exhibit', 'the receiver', 3.1), E('final-paper', 'final-exhibit', 'the reference', 3.6), E('final-note-a', 'final-harbour', 'context', 1.3), E('final-note-b', 'final-paper', 'same mark', 1.9)];
    return story(p, ['final-harbour', 'final-person', 'final-paper', 'final-exhibit'], 26);
  });

  add('vertical-case', 'The Pocket Case', 'Timelines', 'A portrait-ready investigation with one central trail for Shorts and Reels.', '#b9996c', () => {
    const p = base('The Pocket Case', 'noir', 'THE POCKET CASE', 1399);
    p.width = 1080; p.height = 1920;
    p.board.width = 1350; p.board.height = 2400;
    p.board.header = 'ONE NIGHT. THREE CLUES.';
    p.nodes = [
      N('pocket-photo', 'photo', 370, 500, 'THE LAST SIGHTING', { w: 450, h: 510, rotation: -4, enter: 0, subtitle: '23:17 / FICTIONAL DEMO' }),
      N('pocket-note', 'note', 1010, 500, 'WHERE DID\nTHEY GO?', { w: 340, h: 290, rotation: 5, enter: 0.4, color: '#ccb879', body: 'Follow the next clue.' }),
      N('pocket-map', 'map', 910, 1110, 'THE UNRECORDED ROUTE', { w: 530, h: 390, rotation: 3, enter: 0.8 }),
      N('pocket-label-a', 'label', 330, 1040, '23:28 / NO RECORD', { w: 390, rotation: -3, enter: 1.2 }),
      N('pocket-document', 'document', 380, 1650, 'THE RECOVERED MESSAGE', { w: 460, h: 490, rotation: -3, enter: 1.6, body: 'The note was never sent.\n\nIt points to a different entrance and a clock eleven minutes ahead.\n\nCompare the route with the original timestamp.' }),
      N('pocket-evidence', 'evidence', 1010, 1740, 'EXHIBIT 03', { w: 330, h: 410, rotation: 4, enter: 2, body: 'ITEM: access key\nFOUND: east entrance\nSTATUS: logged' }),
      N('pocket-note-end', 'note', 500, 2170, 'THE CLOCK\nWAS WRONG.', { w: 450, h: 260, rotation: 2, enter: 2.4, color: '#cabd89', body: 'Rebuild the timeline.' }),
      N('pocket-stamp', 'stamp', 1050, 2200, 'NEW LEAD', { w: 320, rotation: -7, enter: 2.8, color: '#bc6652' })
    ];
    p.edges = [E('pocket-photo', 'pocket-map', 'eleven minutes', 1), E('pocket-map', 'pocket-document', 'the message', 1.7), E('pocket-document', 'pocket-evidence', 'east entrance', 2.4), E('pocket-evidence', 'pocket-note-end', 'time correction', 3.1), E('pocket-note', 'pocket-label-a', 'where next?', 3.8)];
    const wide = pose(675, 1200, 1, 0, 0);
    const a = pose(425, 740, 1.65, -1, 0), b = pose(850, 1230, 1.45, 1, 0), c = pose(425, 1670, 1.65, -1, 0);
    p.shots = [shot('Portrait establish', wide, wide, 4.5, 'overview'), shot('The first sighting', wide, a, 4, 'push'), shot('Follow the missing route', a, b, 5, 'vertical'), shot('Read the final clue', b, c, 5, 'vertical'), shot('Reveal the whole trail', c, wide, 5.5, 'reveal')];
    p.duration = 24;
    return p;
  });

  add('research-blueprint', 'Research Blueprint', 'Whiteboard', 'A structured explanatory board showing a claim, evidence, tests, and the next question.', '#82bdcc', () => {
    const p = base('Research Blueprint', 'blueprint', 'FROM CLAIM TO EVIDENCE', 1453);
    p.nodes = [
      N('research-claim', 'note', 380, 460, '01 / THE CLAIM', { w: 340, h: 280, rotation: -3, enter: 0, color: '#d1c791', body: 'A new process made\nthe archive faster.\n\nHow would we measure it?' }),
      N('research-data', 'document', 1040, 490, '02 / THE RECORDS', { w: 390, h: 390, rotation: 2, enter: 0.4, body: 'Week 1: 120 demo records\nWeek 2: 138 demo records\nWeek 3: 141 demo records\n\nBut staffing also changed.\n\nThis is fictional example data.' }),
      N('research-photo', 'photo', 1720, 465, 'THE CHANGED WORKFLOW', { rotation: -3, enter: 0.8, subtitle: 'ILLUSTRATIVE DEMO / REPLACE IMAGE' }),
      N('research-variable', 'label', 2170, 455, 'WHAT ELSE CHANGED?', { w: 310, rotation: 3, enter: 1.2 }),
      N('research-map', 'map', 430, 1050, '03 / THE PROCESS MAP', { w: 410, h: 300, rotation: 3, enter: 1.6 }),
      N('research-test', 'note', 1100, 1030, '04 / TEST THE IDEA', { w: 370, h: 290, rotation: -3, enter: 2, color: '#b6cbc1', body: 'Compare equal teams.\nUse the same time period.\nRepeat the measurement.' }),
      N('research-report', 'document', 1770, 1040, '05 / THE NEXT QUESTION', { w: 400, h: 350, rotation: 2, enter: 2.4, body: 'Does the improvement remain when team size is held constant?\n\nRecord the comparison, uncertainty, and alternative explanation.\n\nA better question is progress.' }),
      N('research-status', 'stamp', 2170, 1080, 'TESTABLE', { w: 260, color: '#89becb', rotation: -6, enter: 2.8 })
    ];
    p.edges = [E('research-claim', 'research-data', 'measure', 1, { color: '#9bc4d0', style: 'arrow' }), E('research-data', 'research-photo', 'context', 1.6, { color: '#9bc4d0', style: 'line' }), E('research-map', 'research-test', 'compare', 2.2, { color: '#d1b36a', style: 'arrow' }), E('research-test', 'research-report', 'review', 2.8, { color: '#d1b36a', style: 'arrow' }), E('research-variable', 'research-data', 'confounder?', 3.4, { color: '#ca7a66', style: 'dashed' })];
    return story(p, ['research-claim', 'research-data', 'research-test', 'research-report'], 24);
  });

  DB.templates = entries;
  DB.makeProject = id => {
    const template = entries.find(t => t.id === id) || entries[0];
    const p = template.make();
    p.template = template.id;
    return copy(p);
  };
})();
