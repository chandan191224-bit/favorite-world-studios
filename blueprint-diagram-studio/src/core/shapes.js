// GENERIC parametric technical drawings (no real brands, no real people). Each drawing lives in a
// 1000×600 box (y down) and is a list of polyline strokes with a group (0 = outline, 1 = detail,
// 2 = centre/phantom lines), optional labels [{x,y,t,sub}], dimension specs [{x1,y1,x2,y2,off,t|to,unit,ang}]
// and an optional closed `outline` polygon (used by the rotating-wireframe family for extrusion).
// Arcs are sampled into polylines with the arc() helper — strokes are always point lists.
BD.shapes = (() => {
  const U = BD.util;
  const list = [], byId = {};

  // sample an ellipse arc into points
  const arc = (cx, cy, rx, ry, a0, a1, n = 26) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
  };
  const circ = (cx, cy, r, n = 40) => arc(cx, cy, r, r, -Math.PI / 2, Math.PI * 1.5, n);
  // rectangle (optionally with a corner removed etc. — caller passes points)
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];

  function register(s) {
    if (byId[s.id]) throw new Error('duplicate shape ' + s.id);
    s.vb = s.vb || [1000, 600];
    byId[s.id] = s; list.push(s);
    return s;
  }

  // crenellated parapet: returns points along the top of a wall from x0..x1 at base y, merlon height mh, width mw
  function crenel(x0, x1, y, mw, mh, gap) {
    const pts = [];
    let x = x0;
    let up = true;
    while (x < x1) {
      const nx = Math.min(x + (up ? mw : gap), x1);
      if (up) { pts.push([x, y], [x, y - mh], [nx, y - mh], [nx, y]); }
      else pts.push([x, y], [nx, y]);
      x = nx; up = !up;
    }
    return pts;
  }

  // ---------------- 1. Fort / castle wall (elevation) ----------------
  register({
    id: 'fort', name: 'Fort wall (elevation)', cat: 'Military',
    strokes: [
      // ground
      { p: [[60, 520], [940, 520]], w: 2, g: 0 },
      // curtain wall body (up the left side, battlements across the top, down the right side)
      { p: [[210, 520], [210, 320], ...crenel(210, 790, 320, 44, 26, 34), [790, 520], [210, 520]], w: 1.4, g: 0 },
      // flanking towers (with their own battlements)
      { p: [[130, 520], [130, 240], ...crenel(130, 210, 240, 36, 22, 26), [210, 240], [210, 520]], w: 1.6, g: 0 },
      { p: [[790, 520], [790, 240], ...crenel(790, 870, 240, 36, 22, 26), [870, 240], [870, 520]], w: 1.6, g: 0 },
      // gate arch (double line)
      { p: [[460, 520], [460, 430], ...arc(500, 430, 40, 40, Math.PI, Math.PI * 2), [540, 520]], w: 1.2, g: 0 },
      { p: [[448, 520], [448, 438], ...arc(500, 438, 52, 52, Math.PI, Math.PI * 2), [552, 520]], w: 0.8, g: 1 },
      // wall-walk + parapet inner line
      { p: [[224, 352], [776, 352]], w: 0.8, g: 1 },
      // tower arrow slits (cross shaped)
      { p: [[160, 300], [160, 340], [150, 320], [170, 320]], w: 0.8, g: 1 },
      { p: [[840, 300], [840, 340], [830, 320], [850, 320]], w: 0.8, g: 1 },
      { p: [[160, 380], [160, 420], [150, 400], [170, 400]], w: 0.8, g: 1 },
      { p: [[840, 380], [840, 420], [830, 400], [850, 400]], w: 0.8, g: 1 },
      // portcullis grid in the gate
      { p: [[472, 470], [528, 470]], w: 0.6, g: 1 },
      { p: [[472, 500], [528, 500]], w: 0.6, g: 1 },
      { p: [[480, 436], [480, 520]], w: 0.6, g: 1 },
      { p: [[500, 420], [500, 520]], w: 0.6, g: 1 },
      { p: [[520, 436], [520, 520]], w: 0.6, g: 1 },
      // plinth steps at tower bases
      { p: [[118, 540], [222, 540]], w: 1, g: 1 },
      { p: [[778, 540], [882, 540]], w: 1, g: 1 },
    ],
    outline: [[130, 520], [130, 240], ...crenel(130, 210, 240, 36, 22, 26), [210, 240], [210, 320], ...crenel(210, 790, 320, 44, 26, 34), [790, 240], ...crenel(790, 870, 240, 36, 22, 26), [870, 240], [870, 520]],
    labels: [
      { x: 500, y: 470, t: 'प्रवेश द्वार', sub: 'MAIN GATE' },
      { x: 170, y: 250, t: 'बुर्ज', sub: 'FLANKING TOWER' },
      { x: 640, y: 300, t: 'मेरलन', sub: 'CRENELLATION' },
      { x: 300, y: 360, t: 'प्राचीर', sub: 'CURTAIN WALL' },
    ],
    dims: [
      { x1: 130, y1: 520, x2: 870, y2: 520, off: 78, to: 240, unit: ' m', ang: 'flat' },
      { x1: 210, y1: 320, x2: 210, y2: 520, off: -60, to: 42, unit: ' m', ang: 'up' },
    ],
  });

  // ---------------- 2. Tower / minaret (elevation) ----------------
  register({
    id: 'tower', name: 'Tower / minaret (elevation)', cat: 'Architecture',
    strokes: [
      { p: [[100, 560], [900, 560]], w: 2, g: 0 }, // ground
      // plinth
      { p: rect(430, 520, 140, 40), w: 1.4, g: 0 },
      // tapering shaft (left/right)
      { p: [[448, 520], [462, 170]], w: 1.6, g: 0 },
      { p: [[552, 520], [538, 170]], w: 1.6, g: 0 },
      // balconies at three levels
      { p: [[444, 420], [556, 420]], w: 1.2, g: 0 },
      { p: [[436, 410], [436, 420], [564, 420], [564, 410]], w: 1, g: 1 },
      { p: [[452, 330], [548, 330]], w: 1.2, g: 0 },
      { p: [[445, 321], [445, 330], [555, 330], [555, 321]], w: 1, g: 1 },
      { p: [[458, 250], [542, 250]], w: 1.2, g: 0 },
      { p: [[452, 242], [452, 250], [548, 250], [548, 242]], w: 1, g: 1 },
      // drum + dome + finial
      { p: rect(468, 130, 64, 40), w: 1.4, g: 0 },
      { p: arc(500, 130, 42, 46, Math.PI, Math.PI * 2), w: 1.6, g: 0 },
      { p: [[500, 84], [500, 62]], w: 1.2, g: 0 },
      { p: circ(500, 56, 7), w: 1.2, g: 0 },
      // fluting on the shaft
      { p: [[482, 500], [486, 180]], w: 0.5, g: 1 },
      { p: [[518, 500], [514, 180]], w: 0.5, g: 1 },
      // bracket supports under top balcony
      { p: [[470, 250], [462, 270], [530, 270], [538, 250]], w: 0.8, g: 1 },
      // door at base
      { p: [[478, 520], [478, 486], ...arc(500, 486, 22, 22, Math.PI, Math.PI * 2), [522, 520]], w: 1, g: 1 },
      // centre line
      { p: [[500, 560], [500, 50]], w: 0.6, g: 2 },
    ],
    outline: [[448, 520], [462, 170], [468, 170], [468, 130], ...arc(500, 130, 42, 46, Math.PI, Math.PI * 2), [542, 130], [542, 170], [552, 170], [538, 520]],
    labels: [
      { x: 500, y: 100, t: 'गुंबद', sub: 'DOME' },
      { x: 545, y: 250, t: 'बालकनी', sub: 'BALCONY' },
      { x: 500, y: 400, t: 'शाफ्ट', sub: 'TAPERING SHAFT' },
      { x: 500, y: 540, t: 'चबूतरा', sub: 'PLINTH' },
    ],
    dims: [
      { x1: 560, y1: 62, x2: 560, y2: 560, off: 60, to: 72, unit: ' m', ang: 'up' },
      { x1: 436, y1: 410, x2: 564, y2: 410, off: -46, to: 12, unit: ' m', ang: 'flat' },
    ],
  });

  // ---------------- 3. Gravity dam (cross-section) ----------------
  register({
    id: 'dam', name: 'Gravity dam (section)', cat: 'Engineering',
    strokes: [
      { p: [[60, 520], [940, 520]], w: 2, g: 0 }, // foundation ground
      // dam body: crest -> vertical upstream face -> sloping downstream face
      { p: [[420, 200], [380, 200], [380, 380], [640, 520], [420, 520], [420, 200]], w: 1.6, g: 0 },
      // crest roadway + railing
      { p: [[368, 200], [432, 200]], w: 1, g: 1 },
      { p: [[372, 186], [428, 186]], w: 0.7, g: 1 },
      { p: [[374, 186], [374, 200]], w: 0.6, g: 1 },
      { p: [[400, 186], [400, 200]], w: 0.6, g: 1 },
      { p: [[426, 186], [426, 200]], w: 0.6, g: 1 },
      // water on the upstream side
      { p: [[80, 240], [380, 240]], w: 1.4, g: 0 },
      { p: [[100, 268], [180, 268]], w: 0.6, g: 1 },
      { p: [[200, 268], [290, 268]], w: 0.6, g: 1 },
      { p: [[120, 296], [240, 296]], w: 0.6, g: 1 },
      { p: [[90, 330], [170, 330]], w: 0.5, g: 1 },
      { p: [[210, 356], [310, 356]], w: 0.5, g: 1 },
      // inspection gallery inside
      { p: rect(430, 360, 34, 26), w: 0.8, g: 1 },
      // drainage curtain (dashed, near upstream face)
      { p: [[398, 260], [398, 470]], w: 0.6, g: 2, dash: true },
      { p: [[410, 260], [410, 470]], w: 0.6, g: 2, dash: true },
      // rock foundation hatch hint + toe block
      { p: [[640, 520], [668, 492]], w: 1, g: 1 },
      { p: [[668, 520], [696, 492]], w: 0.8, g: 1 },
      { p: [[700, 520], [728, 492]], w: 0.8, g: 1 },
      // downstream stairs zig-zag
      { p: [[452, 500], [452, 480], [476, 480], [476, 460], [500, 460], [500, 440], [524, 440], [524, 420], [548, 420], [548, 400]], w: 0.7, g: 1 },
    ],
    outline: [[420, 200], [380, 200], [380, 380], [640, 520], [420, 520]],
    labels: [
      { x: 200, y: 240, t: 'जल स्तर', sub: 'RESERVOIR LEVEL' },
      { x: 440, y: 250, t: 'शीर्ष मार्ग', sub: 'CREST ROAD' },
      { x: 560, y: 460, t: 'निचला ढाल', sub: 'DOWNSTREAM FACE' },
      { x: 447, y: 373, t: 'निरीक्षण गैलरी', sub: 'GALLERY' },
    ],
    dims: [
      { x1: 700, y1: 200, x2: 700, y2: 520, off: 66, to: 285, unit: ' m', ang: 'up' },
      { x1: 380, y1: 545, x2: 640, y2: 545, off: 0, to: 200, unit: ' m', ang: 'flat' },
    ],
  });

  // ---------------- 4. Arch bridge (elevation) ----------------
  register({
    id: 'bridge', name: 'Arch bridge (elevation)', cat: 'Engineering',
    strokes: [
      // deck
      { p: [[90, 270], [910, 270]], w: 1.8, g: 0 },
      { p: [[90, 292], [910, 292]], w: 1, g: 1 },
      // railing
      { p: [[90, 246], [910, 246]], w: 0.8, g: 1 },
      // spandrel + arch rings (two arches)
      { p: [[120, 292], [160, 420], ...arc(300, 420, 130, 130, Math.PI, Math.PI * 2, 30), [440, 420], ...arc(580, 420, 130, 130, Math.PI, Math.PI * 2, 30), [720, 420], [760, 292]], w: 1.6, g: 0 },
      // inner arch ring (detail)
      { p: [[196, 420], ...arc(300, 420, 106, 106, Math.PI, Math.PI * 2, 26), [404, 420]], w: 0.7, g: 1 },
      { p: [[476, 420], ...arc(580, 420, 106, 106, Math.PI, Math.PI * 2, 26), [684, 420]], w: 0.7, g: 1 },
      // center pier + abutments to ground
      { p: rect(430, 420, 40, 100), w: 1.5, g: 0 },
      { p: [[90, 292], [90, 520]], w: 1.5, g: 0 },
      { p: [[160, 420], [160, 520]], w: 1.5, g: 0 },
      { p: [[720, 420], [720, 520]], w: 1.5, g: 0 },
      { p: [[910, 292], [910, 520]], w: 1.5, g: 0 },
      { p: [[60, 520], [940, 520]], w: 2, g: 0 },
      // water
      { p: [[180, 480], [420, 480]], w: 0.7, g: 1 },
      { p: [[470, 480], [700, 480]], w: 0.7, g: 1 },
      { p: [[210, 500], [380, 500]], w: 0.5, g: 1 },
      { p: [[500, 500], [660, 500]], w: 0.5, g: 1 },
      // voussoir ticks on arch 1
      { p: [[240, 340], [236, 318]], w: 0.6, g: 1 },
      { p: [[300, 300], [300, 276]], w: 0.6, g: 1 },
      { p: [[360, 340], [364, 318]], w: 0.6, g: 1 },
      { p: [[520, 340], [516, 318]], w: 0.6, g: 1 },
      { p: [[580, 300], [580, 276]], w: 0.6, g: 1 },
      { p: [[640, 340], [644, 318]], w: 0.6, g: 1 },
      // railing posts
      { p: [[130, 246], [130, 270]], w: 0.6, g: 1 },
      { p: [[190, 246], [190, 270]], w: 0.6, g: 1 },
      { p: [[250, 246], [250, 270]], w: 0.6, g: 1 },
      { p: [[310, 246], [310, 270]], w: 0.6, g: 1 },
      { p: [[370, 246], [370, 270]], w: 0.6, g: 1 },
      { p: [[430, 246], [430, 270]], w: 0.6, g: 1 },
      { p: [[490, 246], [490, 270]], w: 0.6, g: 1 },
      { p: [[550, 246], [550, 270]], w: 0.6, g: 1 },
      { p: [[610, 246], [610, 270]], w: 0.6, g: 1 },
      { p: [[670, 246], [670, 270]], w: 0.6, g: 1 },
      { p: [[730, 246], [730, 270]], w: 0.6, g: 1 },
      { p: [[790, 246], [790, 270]], w: 0.6, g: 1 },
      { p: [[850, 246], [850, 270]], w: 0.6, g: 1 },
    ],
    outline: [[90, 292], [90, 520], [160, 520], [160, 420], ...arc(300, 420, 130, 130, Math.PI, Math.PI * 2, 30), [440, 420], ...arc(580, 420, 130, 130, Math.PI, Math.PI * 2, 30), [720, 420], [720, 520], [910, 520], [910, 292]],
    labels: [
      { x: 300, y: 360, t: 'मेहराब', sub: 'ARCH RING' },
      { x: 500, y: 270, t: 'सड़क पट्टी', sub: 'DECK' },
      { x: 450, y: 470, t: 'पाया', sub: 'PIER' },
      { x: 580, y: 480, t: 'जल स्तर', sub: 'WATER LEVEL' },
    ],
    dims: [
      { x1: 160, y1: 420, x2: 440, y2: 420, off: -170, to: 130, unit: ' m', ang: 'flat' },
      { x1: 90, y1: 292, x2: 910, y2: 292, off: -84, to: 320, unit: ' m', ang: 'flat' },
    ],
  });

  // ---------------- 5. Rocket (side profile) ----------------
  register({
    id: 'rocket', name: 'Rocket / missile (profile)', cat: 'Military',
    strokes: [
      // nose cone (ogive)
      { p: [[500, 60], [540, 176]], w: 1.6, g: 0 },
      { p: [[500, 60], [460, 176]], w: 1.6, g: 0 },
      // stage 2 body
      { p: [[460, 176], [460, 320]], w: 1.6, g: 0 },
      { p: [[540, 176], [540, 320]], w: 1.6, g: 0 },
      // interstage
      { p: [[460, 320], [540, 320]], w: 1.2, g: 1 },
      // stage 1 body
      { p: [[460, 320], [460, 440]], w: 1.8, g: 0 },
      { p: [[540, 320], [540, 440]], w: 1.8, g: 0 },
      // boattail + engine bell
      { p: [[460, 440], [452, 462], [468, 462], [468, 496]], w: 1.2, g: 0 },
      { p: [[540, 440], [548, 462], [532, 462], [532, 496]], w: 1.2, g: 0 },
      { p: [[468, 496], [500, 508], [532, 496]], w: 1.4, g: 0 },
      // fins (left, right, centre-line hint)
      { p: [[460, 440], [392, 522], [460, 522], [460, 440]], w: 1.5, g: 0 },
      { p: [[540, 440], [608, 522], [540, 522], [540, 440]], w: 1.5, g: 0 },
      // raceway + cable duct
      { p: [[530, 176], [530, 440]], w: 0.6, g: 1 },
      // ullage / separation tick marks
      { p: [[448, 332], [472, 332]], w: 0.6, g: 1 },
      { p: [[528, 332], [552, 332]], w: 0.6, g: 1 },
      // payload fairing seam
      { p: [[470, 150], [470, 176]], w: 0.6, g: 1 },
      { p: [[530, 150], [530, 176]], w: 0.6, g: 1 },
      // centre line (full height)
      { p: [[500, 30], [500, 540]], w: 0.6, g: 2 },
      // ground line
      { p: [[380, 540], [620, 540]], w: 1.2, g: 1 },
    ],
    outline: [[500, 60], [540, 176], [540, 440], [548, 462], [532, 496], [500, 508], [468, 496], [452, 462], [460, 440], [460, 176], [500, 60]],
    labels: [
      { x: 500, y: 110, t: 'नोज़ कोन', sub: 'NOSE CONE' },
      { x: 500, y: 250, t: 'चरण 2', sub: 'STAGE 2' },
      { x: 500, y: 380, t: 'चरण 1', sub: 'STAGE 1' },
      { x: 420, y: 490, t: 'फिन', sub: 'FIN' },
      { x: 500, y: 486, t: 'इंजन', sub: 'ENGINE' },
    ],
    dims: [
      { x1: 600, y1: 60, x2: 600, y2: 522, off: 64, to: 68, unit: ' m', ang: 'up' },
      { x1: 392, y1: 545, x2: 608, y2: 545, off: 0, to: 9, unit: ' m', ang: 'flat' },
    ],
  });

  // ---------------- 6. Gear train (front view) ----------------
  function gearTeeth(cx, cy, r, n, tooth) {
    // trapezoidal teeth around the pitch circle
    const pts = [];
    const step = U.TAU / n;
    for (let i = 0; i < n; i++) {
      const a = i * step;
      const a0 = a - step * 0.28, a1 = a - step * 0.06, a2 = a + step * 0.06, a3 = a + step * 0.28;
      pts.push([cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], [cx + Math.cos(a0) * (r + tooth), cy + Math.sin(a0) * (r + tooth)],
        [cx + Math.cos(a1) * (r + tooth), cy + Math.sin(a1) * (r + tooth)], [cx + Math.cos(a2) * (r + tooth), cy + Math.sin(a2) * (r + tooth)],
        [cx + Math.cos(a3) * (r + tooth), cy + Math.sin(a3) * (r + tooth)], [cx + Math.cos(a3) * r, cy + Math.sin(a3) * r]);
    }
    pts.push(pts[0].slice());
    return pts;
  }
  register({
    id: 'gears', name: 'Gear train (front view)', cat: 'Mechanical',
    strokes: [
      { p: gearTeeth(300, 300, 110, 14, 16), w: 1.5, g: 0 },
      { p: gearTeeth(532, 300, 74, 10, 15), w: 1.5, g: 0 },
      { p: gearTeeth(700, 424, 52, 8, 13), w: 1.5, g: 0 },
      // rims
      { p: circ(300, 300, 92), w: 0.8, g: 1 },
      { p: circ(532, 300, 60), w: 0.8, g: 1 },
      { p: circ(700, 424, 40), w: 0.8, g: 1 },
      // hubs with keyway
      { p: circ(300, 300, 34), w: 1.1, g: 0 },
      { p: circ(532, 300, 24), w: 1.1, g: 0 },
      { p: circ(700, 424, 17), w: 1.1, g: 0 },
      { p: [[300, 266], [292, 274], [300, 274]], w: 0.9, g: 1 },
      { p: [[532, 276], [526, 282], [532, 282]], w: 0.9, g: 1 },
      // spokes
      { p: [[300, 266], [300, 334]], w: 0.7, g: 1 },
      { p: [[266, 300], [334, 300]], w: 0.7, g: 1 },
      { p: [[532, 276], [532, 324]], w: 0.7, g: 1 },
      // centre lines
      { p: [[300, 160], [300, 440]], w: 0.6, g: 2 },
      { p: [[160, 300], [440, 300]], w: 0.6, g: 2 },
      { p: [[532, 200], [532, 380]], w: 0.6, g: 2 },
      { p: [[440, 300], [620, 300]], w: 0.6, g: 2 },
      { p: [[700, 350], [700, 480]], w: 0.6, g: 2 },
    ],
    labels: [
      { x: 300, y: 300, t: 'गियर A', sub: 'DRIVER' },
      { x: 532, y: 300, t: 'गियर B', sub: 'DRIVEN' },
      { x: 700, y: 424, t: 'गियर C', sub: 'IDLER' },
      { x: 300, y: 180, t: 'दाँत', sub: 'TEETH' },
    ],
    dims: [
      { x1: 300, y1: 300, x2: 410, y2: 300, off: -120, to: 220, unit: ' mm', ang: 'flat' },
    ],
  });

  return { register, list, byId, arc, circ, rect, crenel, gearTeeth };
})();
