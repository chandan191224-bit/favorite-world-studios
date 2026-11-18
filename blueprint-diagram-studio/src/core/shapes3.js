// GENERIC parametric technical drawings — civil & structures set: house plan, pillbox section, temple dome, satellite.
(() => {
const { register, arc, circ, rect } = BD.shapes;

// ---------------- 1. House floor plan (plan view) ----------------
// Viewed from above. The 40 px outer wall is one continuous band split into 3 closed runs by the
// entry door (south) and two window breaks; internal walls are thinner double bands with door gaps.
register({
  id: 'floorplan', name: 'House floor plan (plan view)', cat: 'Architecture',
  strokes: [
    // outer wall band (double line, 40 px apart), run A: entry gap -> SE corner -> kitchen window
    { p: [[520, 440], [520, 480], [800, 480], [800, 280], [760, 280], [760, 440], [520, 440]], w: 1.6, g: 0 },
    // run B: kitchen window -> NE corner -> living window
    { p: [[800, 210], [800, 140], [420, 140], [420, 180], [760, 180], [760, 210], [800, 210]], w: 1.6, g: 0 },
    // run C: living window -> NW + W + SW walls -> entry gap
    { p: [[300, 140], [200, 140], [200, 480], [460, 480], [460, 440], [240, 440], [240, 180], [300, 180], [300, 140]], w: 1.6, g: 0 },
    // cross wall (living | kitchen over bedroom) with two door gaps
    { p: [[540, 180], [556, 180], [556, 214], [540, 214], [540, 180]], w: 1.4, g: 0 },
    { p: [[540, 262], [556, 262], [556, 356], [540, 356], [540, 262]], w: 1.4, g: 0 },
    { p: [[540, 404], [556, 404], [556, 440], [540, 440], [540, 404]], w: 1.4, g: 0 },
    // kitchen | bedroom partition
    { p: [[540, 300], [760, 300], [760, 316], [540, 316], [540, 300]], w: 1.4, g: 0 },
    // living | stair hall partition with an open-plan gap
    { p: [[240, 316], [300, 316], [300, 332], [240, 332], [240, 316]], w: 1.4, g: 0 },
    { p: [[380, 316], [540, 316], [540, 332], [380, 332], [380, 316]], w: 1.4, g: 0 },
    // staircase strings + tread lines + up-direction arrow
    { p: [[248, 344], [402, 344]], w: 1.2, g: 0 },
    { p: [[248, 424], [402, 424]], w: 1.2, g: 0 },
    { p: [[255, 344], [255, 424]], w: 0.8, g: 1 },
    { p: [[275, 344], [275, 424]], w: 0.8, g: 1 },
    { p: [[295, 344], [295, 424]], w: 0.8, g: 1 },
    { p: [[315, 344], [315, 424]], w: 0.8, g: 1 },
    { p: [[335, 344], [335, 424]], w: 0.8, g: 1 },
    { p: [[355, 344], [355, 424]], w: 0.8, g: 1 },
    { p: [[375, 344], [375, 424]], w: 0.8, g: 1 },
    { p: [[395, 344], [395, 424]], w: 0.8, g: 1 },
    // main entry door (south wall): leaf + quarter-circle swing arc into the stair hall
    { p: [[460, 440], [460, 380]], w: 1.1, g: 1 },
    { p: arc(460, 440, 60, 60, -Math.PI / 2, 0, 16), w: 0.7, g: 1 },
    // living <-> kitchen door, swinging into the living room
    { p: [[540, 214], [492, 214]], w: 1.1, g: 1 },
    { p: arc(540, 214, 48, 48, Math.PI, Math.PI / 2, 16), w: 0.7, g: 1 },
    // stair hall <-> bedroom door, swinging into the bedroom
    { p: [[556, 356], [604, 356]], w: 1.1, g: 1 },
    { p: arc(556, 356, 48, 48, 0, Math.PI / 2, 16), w: 0.7, g: 1 },
    // windows: thin double glazing lines closing the wall breaks
    { p: [[300, 152], [420, 152]], w: 0.7, g: 1 },
    { p: [[300, 168], [420, 168]], w: 0.7, g: 1 },
    { p: [[772, 210], [772, 280]], w: 0.7, g: 1 },
    { p: [[788, 210], [788, 280]], w: 0.7, g: 1 },
    // stair up-direction arrow
    { p: [[370, 384], [272, 384]], w: 0.9, g: 1 },
    { p: [[284, 377], [272, 384], [284, 391]], w: 0.9, g: 1 },
  ],
  outline: rect(200, 140, 600, 340),
  labels: [
    { x: 390, y: 250, t: 'बैठक', sub: 'LIVING' },
    { x: 658, y: 255, t: 'रसोई', sub: 'KITCHEN' },
    { x: 668, y: 385, t: 'शयन कक्ष', sub: 'BEDROOM' },
    { x: 465, y: 360, t: 'सीढ़ियाँ', sub: 'STAIRS' },
  ],
  dims: [
    { x1: 200, y1: 480, x2: 800, y2: 480, off: 62, to: 12, unit: ' m', ang: 'flat' },
    { x1: 556, y1: 205, x2: 760, y2: 205, off: 0, to: 4, unit: ' m', ang: 'flat' },
  ],
});

// ---------------- 2. Pillbox bunker (cross-section) ----------------
// Thick concrete box partly buried: stepped firing slit at the front (left), rear door with entry
// steps, irregular earth berms riding up both flanks, concrete hatch ticks on slab and walls.
register({
  id: 'bunker', name: 'Pillbox bunker (cross-section)', cat: 'Engineering',
  strokes: [
    // concrete box, outer face (gaps = firing slit on the left, rear door on the right)
    { p: [[360, 386], [360, 320], [720, 320], [720, 410]], w: 1.6, g: 0 },
    { p: [[720, 470], [720, 534], [360, 534], [360, 396]], w: 1.6, g: 0 },
    // inner face: roof soffit + floor line (matching gaps)
    { p: [[388, 379], [388, 348], [692, 348], [692, 410]], w: 1.4, g: 0 },
    { p: [[692, 470], [692, 506], [388, 506], [388, 403]], w: 1.4, g: 0 },
    // firing slit with stepped (splayed) reveal: narrow outside, wide inside
    { p: [[360, 386], [369, 386], [369, 382], [378, 382], [378, 379], [388, 379]], w: 1.2, g: 0 },
    { p: [[360, 396], [369, 396], [369, 400], [378, 400], [378, 403], [388, 403]], w: 1.2, g: 0 },
    // rear door leaf (edge-on) + steps descending to the interior floor
    { p: [[706, 410], [706, 470]], w: 1.2, g: 1 },
    { p: [[692, 470], [692, 482], [678, 482], [678, 494], [664, 494], [664, 506]], w: 0.9, g: 1 },
    // gun shelf under the slit
    { p: [[388, 432], [436, 432]], w: 0.8, g: 1 },
    // concrete hatch ticks (roof slab / front wall / floor slab)
    { p: [[392, 348], [406, 320]], w: 0.6, g: 1 },
    { p: [[612, 348], [626, 320]], w: 0.6, g: 1 },
    { p: [[648, 348], [662, 320]], w: 0.6, g: 1 },
    { p: [[361, 448], [387, 462]], w: 0.6, g: 1 },
    { p: [[361, 478], [387, 492]], w: 0.6, g: 1 },
    { p: [[470, 534], [484, 506]], w: 0.6, g: 1 },
    { p: [[560, 534], [574, 506]], w: 0.6, g: 1 },
    // earth berm riding up the front flank to just below the slit
    { p: [[60, 470], [150, 463], [220, 451], [290, 436], [340, 426], [360, 420]], w: 1.4, g: 0 },
    // rear flank berm dipping into the entry cut at ground level
    { p: [[940, 470], [876, 461], [812, 451], [768, 448], [744, 457], [736, 467], [720, 470]], w: 1.4, g: 0 },
  ],
  outline: rect(360, 320, 360, 214),
  labels: [
    { x: 250, y: 355, t: 'गोलीबारी झिरी', sub: 'FIRING SLIT' },
    { x: 510, y: 334, t: 'कंक्रीट', sub: 'CONCRETE' },
    { x: 630, y: 438, t: 'प्रवेश द्वार', sub: 'ENTRY' },
    { x: 170, y: 505, t: 'मिट्टी का ढेर', sub: 'EARTH BERM' },
  ],
  dims: [
    { x1: 360, y1: 558, x2: 388, y2: 558, off: 0, to: 1.2, unit: ' m', ang: 'flat' },
  ],
});

// ---------------- 3. Temple dome (elevation) ----------------
// Bulbous shell (pinched flare at the springing + big elliptical cap) on an octagonal drum with
// facet lines, projecting cornice, kalash finial, three-step plinth and a central arched opening.
register({
  id: 'dome', name: 'Temple dome (elevation)', cat: 'Architecture',
  strokes: [
    // ground + three plinth steps
    { p: [[280, 542], [720, 542]], w: 2, g: 0 },
    { p: rect(392, 476, 216, 20), w: 1.4, g: 0 },
    { p: rect(360, 496, 280, 22), w: 1.4, g: 0 },
    { p: rect(328, 518, 344, 24), w: 1.4, g: 0 },
    // octagonal drum + projecting cornice band
    { p: rect(412, 384, 176, 92), w: 1.5, g: 0 },
    { p: rect(396, 368, 208, 16), w: 1.4, g: 0 },
    // bulbous dome: flared facets out of the cornice into the elliptical shell (max girth above springing)
    { p: [[415, 368], [392, 346], [388, 318],
      ...arc(500, 318, 112, 140, Math.PI, Math.PI * 1.5, 32),
      ...arc(500, 318, 112, 140, Math.PI * 1.5, Math.PI * 2, 32).slice(1),
      [612, 318], [608, 346], [585, 368]], w: 1.8, g: 0 },
    // kalash finial: neck, pot, spike, tip flare
    { p: [[500, 178], [500, 161]], w: 1.2, g: 0 },
    { p: circ(500, 150, 11, 16), w: 1.2, g: 0 },
    { p: [[500, 139], [500, 104]], w: 1.2, g: 0 },
    { p: [[493, 116], [500, 104], [507, 116]], w: 1, g: 0 },
    // drum facet lines (octagon read) + meridian seam across the shell
    { p: [[445, 384], [445, 476]], w: 0.6, g: 1 },
    { p: [[555, 384], [555, 476]], w: 0.6, g: 1 },
    { p: arc(500, 312, 111, 14, Math.PI, Math.PI * 2, 20), w: 0.6, g: 1 },
    // central arched opening (double line)
    { p: [[480, 470], [480, 442], ...arc(500, 442, 20, 20, Math.PI, Math.PI * 2, 20), [520, 470]], w: 1.2, g: 0 },
    { p: [[484, 470], [484, 446], ...arc(500, 446, 16, 16, Math.PI, Math.PI * 2, 20), [516, 470]], w: 0.8, g: 1 },
    // centre line
    { p: [[500, 542], [500, 88]], w: 0.6, g: 2 },
  ],
  outline: [[328, 542], [328, 518], [360, 518], [360, 496], [392, 496], [392, 476], [412, 476], [412, 384],
    [396, 384], [396, 368], [415, 368], [392, 346], [388, 318],
    ...arc(500, 318, 112, 140, Math.PI, Math.PI * 2, 32),
    [612, 318], [608, 346], [585, 368], [604, 368], [604, 384], [588, 384], [588, 476],
    [608, 476], [608, 496], [640, 496], [640, 518], [672, 518], [672, 542], [328, 542]],
  labels: [
    { x: 560, y: 130, t: 'कलश', sub: 'FINIAL' },
    { x: 500, y: 260, t: 'गुंबद', sub: 'DOME' },
    { x: 500, y: 404, t: 'ड्रम', sub: 'DRUM' },
    { x: 500, y: 507, t: 'चबूतरा', sub: 'PLINTH' },
  ],
  dims: [
    { x1: 700, y1: 100, x2: 700, y2: 542, off: 66, to: 30, unit: ' m', ang: 'up' },
  ],
});

// ---------------- 4. Satellite (profile) ----------------
// Central bus with two angled solar wings (5x3 cell grid), parabolic dish with feed struts + horn,
// antenna rod above, thruster cones at the base.
function wing(ax, ay, ang, L, W) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const p = (u, v) => [ax + u * c - v * s, ay + u * s + v * c];
  const h = W / 2;
  return {
    frame: [p(0, -h), p(L, -h), p(L, h), p(0, h), p(0, -h)],
    divs: [0.2, 0.4, 0.6, 0.8].map(f => [p(L * f, -h), p(L * f, h)]),
    longs: [-h / 3, h / 3].map(v => [p(0, v), p(L, v)]),
  };
}
const WL = wing(440, 330, Math.PI + 0.12, 235, 92); // left wing, tilted 7 deg up
const WR = wing(560, 330, -0.12, 235, 92);          // right wing, mirrored tilt
register({
  id: 'satellite', name: 'Satellite (profile)', cat: 'Engineering',
  strokes: [
    // central bus
    { p: rect(440, 280, 120, 100), w: 1.6, g: 0 },
    // solar panel wings: frames first, then cell grid
    { p: WL.frame, w: 1.4, g: 0 },
    { p: WR.frame, w: 1.4, g: 0 },
    { p: WL.divs[0], w: 0.7, g: 1 },
    { p: WL.divs[1], w: 0.7, g: 1 },
    { p: WL.divs[2], w: 0.7, g: 1 },
    { p: WL.divs[3], w: 0.7, g: 1 },
    { p: WL.longs[0], w: 0.7, g: 1 },
    { p: WL.longs[1], w: 0.7, g: 1 },
    { p: WR.divs[0], w: 0.7, g: 1 },
    { p: WR.divs[1], w: 0.7, g: 1 },
    { p: WR.divs[2], w: 0.7, g: 1 },
    { p: WR.divs[3], w: 0.7, g: 1 },
    { p: WR.longs[0], w: 0.7, g: 1 },
    { p: WR.longs[1], w: 0.7, g: 1 },
    // parabolic dish: bowl (bulges down), rim line, feed struts + horn, mast to the bus
    { p: arc(500, 232, 85, 30, 0, Math.PI, 24), w: 1.6, g: 0 },
    { p: [[415, 232], [585, 232]], w: 0.8, g: 1 },
    { p: [[418, 234], [500, 172]], w: 0.9, g: 1 },
    { p: [[582, 234], [500, 172]], w: 0.9, g: 1 },
    { p: circ(500, 166, 8, 16), w: 1.1, g: 0 },
    { p: [[500, 262], [500, 280]], w: 1.2, g: 0 },
    // antenna rod + tip
    { p: [[500, 158], [500, 106]], w: 0.9, g: 0 },
    { p: circ(500, 100, 5, 16), w: 0.9, g: 0 },
    // thruster cones at the base
    { p: [[461, 380], [454, 404], [486, 404], [479, 380]], w: 1.3, g: 0 },
    { p: [[521, 380], [514, 404], [546, 404], [539, 380]], w: 1.3, g: 0 },
    // bus deck seams + star-tracker circles
    { p: [[440, 306], [560, 306]], w: 0.7, g: 1 },
    { p: [[440, 352], [560, 352]], w: 0.7, g: 1 },
    { p: circ(465, 295, 7, 16), w: 1, g: 1 },
    { p: circ(535, 295, 7, 16), w: 1, g: 1 },
    // centre line
    { p: [[500, 88], [500, 412]], w: 0.6, g: 2 },
  ],
  outline: [[440, 280], [560, 280], ...WR.frame.slice(0, 4), [560, 380], [440, 380],
    ...WL.frame.slice(0, 4), [440, 280]],
  labels: [
    { x: 322, y: 316, t: 'सौर पैनल', sub: 'SOLAR PANEL' },
    { x: 500, y: 330, t: 'बस', sub: 'BUS' },
    { x: 655, y: 195, t: 'डिश एंटेना', sub: 'DISH' },
    { x: 500, y: 424, t: 'थ्रस्टर', sub: 'THRUSTER' },
  ],
  dims: [
    { x1: 201, y1: 458, x2: 799, y2: 458, off: 0, to: 8, unit: ' m', ang: 'flat' },
  ],
});

})();
