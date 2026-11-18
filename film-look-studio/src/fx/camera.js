// Camera moves (family 'camera', kind 'camera'). These effects never touch a canvas:
// camera(P, e) only returns a move {x, y, rot, zoom, bx, by, zb, mx, my, mr} and the
// engine applies it to the picture. All spatial values are in 1080-units (the engine
// scales by e.S = shortSide/1080), rotation in radians, zoom multiplicative (1 = none).
//
// THE rule of this family: a camera move must NEVER expose an edge of the picture. Every
// effect returns CONSTANT worst-case margins (mx/my for x/y, mr for rot) computed from the
// params — never the current sample — and the engine pre-multiplies the zoom by a cover
// factor built from those margins. Returned zoom is never below 1.0 (a "zoom out" starts
// above 1 and settles >= 1). 'whip' carries the extra trick that keeps a travelling
// picture covered mid-move; see the comment inside it.
(() => {
  const U = FL.util, { register, preset, P } = FL.fx;
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  // frame width/height in 1080-units, so "% of frame" means the same at 1080p, 4K,
  // Shorts 1080x1920 and square (the engine scales everything we return by e.S)
  const frameW = e => e.W / e.S, frameH = e => e.H / e.S;

  // ---------- impact shake ----------
  register({
    id: 'shake', name: 'Impact shake', family: 'camera', kind: 'camera', event: true, dur: 0.6,
    desc: 'Decaying impact jolt — explosion, slap or low rumble. Amplitude dies off exponentially; the margins keep the cover zoom up so no edge ever shows.',
    params: [
      P.range('power', 'Power', 0, 1, 0.05, 0.6, 'Peak travel, about 1.1% of frame height at 1'),
      P.range('freq', 'Frequency', 6, 16, 0.5, 10, 'Vibration rate in Hz'),
      P.range('decay', 'Decay', 0.3, 9, 0.1, 5, 'How fast it dies away (higher = shorter)'),
      P.select('dir', 'Direction', [['all', 'All directions'], ['vert', 'Vertical only'], ['horiz', 'Horizontal only']], 'all'),
      P.range('rot', 'Roll', 0, 0.6, 0.05, 0.2, 'Tiny roll wobble in degrees'),
    ],
    camera(P, e) {
      const { lt, seed } = e;
      const amp = P.power * 12 * frameH(e) / 1080;            // ≈1.1% of frame height at power 1
      const env = Math.exp(-lt * Math.max(0.05, P.decay));    // decaying envelope from the hit
      const w = lt * TAU * Math.max(1, P.freq);
      // three incommensurate frequencies with seeded phases: deterministic, never periodic
      const vib = sd => (Math.sin(w + U.h1(1, sd) * TAU)
        + 0.55 * Math.sin(w * 1.31 + U.h1(2, sd) * TAU)
        + 0.28 * Math.sin(w * 1.73 + U.h1(3, sd) * TAU)) / 1.83;
      const roll = Math.max(0, P.rot) * D2R;
      const d = P.dir;
      return {
        x: d === 'vert' ? 0 : amp * env * vib(seed),
        y: d === 'horiz' ? 0 : amp * env * vib(seed + 7),
        rot: roll * env * vib(seed + 13),
        mx: d === 'vert' ? 0 : amp,                           // worst case (t=0), constant
        my: d === 'horiz' ? 0 : amp,
        mr: roll,
      };
    },
  });
  preset('shake-impact', 'Camera: explosion impact', 'shake', { power: 1, freq: 11, decay: 5.5, rot: 0.3 }, { dur: 0.6 });
  preset('shake-slap', 'Camera: slap hit', 'shake', { power: 0.5, freq: 13, decay: 6.5, rot: 0.18 }, { dur: 0.45 });
  preset('shake-rumble', 'Camera: low rumble', 'shake', { power: 0.25, freq: 5, decay: 0.3, rot: 0.08 }, { dur: 3 });
  preset('shake-vert', 'Camera: vertical jolt', 'shake', { dir: 'vert', power: 0.8, freq: 9, decay: 5, rot: 0.2 }, { dur: 0.5 });

  // ---------- handheld drift ----------
  register({
    id: 'handheld', name: 'Handheld drift', family: 'camera', kind: 'camera',
    desc: 'Documentary handheld: slow seeded fbm wander (two layers), fine micro tremor and the operator\'s breathing bounce. Continuous — a pure function of layer time.',
    params: [
      P.range('amp', 'Drift', 0, 1, 0.05, 0.5, 'Slow wander: 1.5% of frame at 0, 3% at 1'),
      P.range('micro', 'Micro tremor', 0, 1, 0.05, 0.3, 'Fine hand jitter, ±0.2% at 4½–8 Hz'),
      P.range('breathe', 'Breathing', 0, 1, 0.05, 0.3, 'Vertical bounce, ±0.4% at 0.25 Hz'),
      P.range('rate', 'Wander speed', 0.3, 1.5, 0.05, 1, 'Speed of the slow drift'),
    ],
    camera(P, e) {
      const { lt, seed } = e;
      const r = Math.max(0.05, P.rate), m = U.clamp(P.micro, 0, 1);
      const W = frameW(e), H = frameH(e);
      const drift = 0.015 + 0.015 * U.clamp(P.amp, 0, 1);      // 1.5–3% of the frame
      const micro = 0.002 * m;                                // ±0.2%
      const br = 0.004 * U.clamp(P.breathe, 0, 1);             // ±0.4%
      const mf = 4.5 + 3.5 * m;                               // tremor 4.5–8 Hz
      // two fbm layers (≈0.15 Hz and 0.5 Hz), weighted so the sum stays inside the drift
      const wob = sd => 0.7 * U.fbm1(lt * 0.15 * r, sd) + 0.3 * U.fbm1(lt * 0.5 * r, sd + 37);
      return {
        x: drift * W * wob(seed + 11) + micro * W * U.noise1(lt * mf, seed + 77),
        y: drift * H * wob(seed + 23) + micro * H * U.noise1(lt * mf, seed + 91)
          + br * H * Math.sin(lt * TAU * 0.25 + U.h1(3, seed) * TAU),
        mx: (drift + micro) * W,                              // worst-case sum, constant
        my: (drift + micro + br) * H,
      };
    },
  });
  preset('handheld-doc', 'Handheld: documentary calm', 'handheld', { amp: 0.5, micro: 0.25, breathe: 0.3, rate: 0.8 });
  preset('handheld-nervous', 'Handheld: nervous reporter', 'handheld', { amp: 1, micro: 0.8, rate: 1.2, breathe: 0.2 });
  preset('handheld-breathe', 'Handheld: breathing hold', 'handheld', { amp: 0.35, micro: 0.2, breathe: 1, rate: 0.7 });
  preset('handheld-floaty', 'Handheld: dreamy slow', 'handheld', { amp: 0.7, micro: 0.15, breathe: 0.5, rate: 0.4 });

  // ---------- zoom punch ----------
  register({
    id: 'punch', name: 'Zoom punch', family: 'camera', kind: 'camera', event: true, dur: 0.7,
    desc: 'Zoom hit: 1 → peak fast (ease-out), settles back and parks by p≈0.9. Zoom-blur follows the real zoom speed; an optional counter-move offsets the hit.',
    params: [
      P.select('shape', 'Shape', [['hit', 'Hit in'], ['double', 'Double hit'], ['release', 'Release (starts parked)']], 'hit'),
      P.range('zoomPeak', 'Peak zoom', 1.08, 1.45, 0.01, 1.22, 'Zoom at the hit'),
      P.range('zoomSettle', 'Settle zoom', 1, 1.2, 0.01, 1.06, 'Where it parks — never below 1'),
      P.range('hit', 'Hit time', 0.08, 0.25, 0.01, 0.18, 'Seconds up to the peak (hit shape)'),
      P.range('blur', 'Zoom blur', 0, 1, 0.05, 0.6, 'Smear while the zoom moves (zb up to 0.12)'),
      P.range('counter', 'Counter-move', 0, 1, 0.05, 0.25, 'Small x/y push against the hit, ±0.8%'),
    ],
    camera(P, e) {
      const { p, seed } = e;
      const durS = Math.max(0.1, e.dur);
      const pk = Math.max(1, P.zoomPeak), st = U.clamp(Math.max(1, P.zoomSettle), 1, 1.2);
      const p2 = Math.min(1.5, pk + 0.06), s2 = st + 0.04;     // double: second hit is harder
      let ph = 0.25, speed = 1;                               // peak position in p, reference zoom speed
      const zAt = q => {
        q = U.clamp(q, 0, 1);
        if (P.shape === 'double') {
          if (q < 0.30) return U.lerp(1, pk, U.ease.out(q / 0.30));
          if (q < 0.45) return U.lerp(pk, st, U.ease.inOut((q - 0.30) / 0.15));
          if (q < 0.60) return U.lerp(st, p2, U.ease.out((q - 0.45) / 0.15));
          if (q < 0.92) return U.lerp(p2, s2, U.ease.inOut((q - 0.60) / 0.32));
          return s2;
        }
        if (P.shape === 'release') {
          const z0 = pk, zd = st, zr = U.lerp(st, pk, 0.6);    // parked → dip → partway back
          if (q < 0.50) return U.lerp(z0, zd, U.ease.inOut(q / 0.50));
          if (q < 0.95) return U.lerp(zd, zr, U.ease.inOut((q - 0.50) / 0.45));
          return zr;
        }
        if (q < ph) return U.lerp(1, pk, U.ease.out(q / ph));
        if (q < 0.90) return U.lerp(pk, st, U.ease.inOut((q - ph) / (0.90 - ph)));
        return st;
      };
      if (P.shape === 'double') speed = Math.max(1e-4, (p2 - st) / 0.15);
      else if (P.shape === 'release') speed = Math.max(1e-4, (pk - st) / 0.5);
      else { ph = U.clamp(P.hit / durS, 0.02, 0.85); speed = Math.max(1e-4, (pk - 1) / ph); }
      const zoom = Math.max(1, zAt(p));
      // zoom-blur from the actual zoom speed (signed: in = expanding smear, out = contracting)
      const h = 0.002, dz = (zAt(p + h) - zAt(p - h)) / (2 * h);
      const zb = 0.12 * U.clamp(P.blur, 0, 1) * (speed > 1e-4 ? U.clamp(dz / speed, -1, 1) : 0);
      // counter-move: a bell over the same window, direction fixed by the layer seed
      const bell = P.shape === 'double' ? Math.max(U.bell(p, 0.30), U.bell(p, 0.60))
        : P.shape === 'release' ? U.bell(p, 0.50) : U.bell(p, ph);
      const ang = U.h1(5, seed) * TAU;
      const cx = 0.008 * U.clamp(P.counter, 0, 1) * frameW(e);
      const cy = 0.008 * U.clamp(P.counter, 0, 1) * 0.6 * frameH(e);
      return {
        zoom, zb,
        x: cx * Math.cos(ang) * bell,
        y: cy * Math.sin(ang) * bell,
        mx: cx,                                                // worst case, constant
        my: cy,
      };
    },
  });
  preset('punch-in', 'Punch: hit in', 'punch', { zoomPeak: 1.22, zoomSettle: 1.06, blur: 0.8, counter: 0.3, hit: 0.18 }, { dur: 0.7 });
  preset('punch-soft', 'Punch: soft emphasis', 'punch', { zoomPeak: 1.12, zoomSettle: 1.03, blur: 0.35, counter: 0.15, hit: 0.2 }, { dur: 0.8 });
  preset('punch-double', 'Punch: double hit', 'punch', { shape: 'double', zoomPeak: 1.22, zoomSettle: 1.04, blur: 0.65, counter: 0.25 }, { dur: 1.1 });
  preset('punch-out', 'Punch: released push', 'punch', { shape: 'release', zoomPeak: 1.18, zoomSettle: 1.02, blur: 0.45, counter: 0.2 }, { dur: 0.9 });

  // ---------- whip pan ----------
  register({
    id: 'whip', name: 'Whip pan', family: 'camera', kind: 'camera', event: true, dur: 0.45,
    desc: 'Fast pan with a heavy directional smear: the picture swings out mid-move, then lands parked slightly off-centre, like landing on a new framing.',
    params: [
      P.select('dir', 'Direction', [['right', 'Whip right'], ['left', 'Whip left'], ['up', 'Whip up'], ['down', 'Whip down']], 'right'),
      P.range('dist', 'Travel', 0.4, 0.95, 0.01, 0.75, 'How far it swings, as a fraction of the frame'),
      P.range('blur', 'Smear', 0, 1, 0.05, 0.8, 'Directional blur, up to 60 px at 1080'),
      P.range('settle', 'Park offset', 0, 0.03, 0.001, 0.02, 'Where it lands, off-centre (fraction of frame)'),
    ],
    camera(P, e) {
      const { p } = e;
      const vert = P.dir === 'up' || P.dir === 'down';
      const axis = vert ? frameH(e) : frameW(e);               // travel axis, 1080-units
      const sgn = P.dir === 'left' || P.dir === 'up' ? -1 : 1;
      const amp = U.clamp(P.dist, 0.05, 0.98) * axis;          // peak swing
      const park = U.clamp(P.settle, 0, 0.05) * axis;          // parked landing spot
      // swing out to ±amp at mid-move (smooth in-out up and down); the small settle term
      // carries the landing, so it starts at 0 and ENDS parked at ±park — not back at 0
      const posOf = q => sgn * (park * U.ease.inOut(U.clamp(q)) + (amp - park) * U.bell(U.clamp(q), 0.5));
      const pos = posOf(p);
      // velocity drives the smear: strong a quarter of the way in, ~0 at both ends
      const h = 0.002;
      const vel = (posOf(p + h) - posOf(p - h)) / (2 * h);
      const peak = 3 * (amp - park) + 1.5 * park;              // upper bound of |d pos/dp|
      const mag = 60 * U.clamp(P.blur, 0, 1) * U.clamp(Math.abs(vel) / peak, 0, 1);
      // COVER, the critical trick of a whip over a still: mid-travel the picture is
      // offset by up to |pos|, so with rotation 0 the zoom needed to keep the frame
      // covered is ≈ (axis + 2·|pos|)/axis. We return that per frame, floored at 1.04.
      // It is smooth in time because pos is smooth, so the cover rises through the middle
      // of the whip (hiding the edge behind the smear) and comes back down to the landing.
      // The margins only have to cover the END state (park) — the engine adds that cover
      // on top, so even parked at the 1.04 floor the frame is still covered.
      const zoom = Math.max(1.04, 1 + 2 * Math.abs(pos) / axis);
      return vert
        ? { y: pos, by: mag, zoom, my: park }
        : { x: pos, bx: mag, zoom, mx: park };
    },
  });
  preset('whip-left', 'Whip pan: left', 'whip', { dir: 'left', dist: 0.75, blur: 0.8, settle: 0.02 }, { dur: 0.45 });
  preset('whip-right', 'Whip pan: right', 'whip', { dir: 'right', dist: 0.75, blur: 0.8, settle: 0.02 }, { dur: 0.45 });
  preset('whip-soft', 'Whip pan: soft', 'whip', { dist: 0.5, blur: 0.5, settle: 0.015 }, { dur: 0.55 });
  preset('whip-up', 'Whip pan: up', 'whip', { dir: 'up', dist: 0.6, blur: 0.7, settle: 0.02 }, { dur: 0.5 });
  preset('whip-down', 'Whip pan: down', 'whip', { dir: 'down', dist: 0.6, blur: 0.7, settle: 0.02 }, { dur: 0.5 });

  // ---------- slow float (Ken Burns) ----------
  register({
    id: 'float', name: 'Slow float (Ken Burns)', family: 'camera', kind: 'camera',
    desc: 'Whole-layer Ken Burns: zoom drifts 1 → target across the layer (never below 1) with a fixed diagonal pan; the full target is reached only at the very end.',
    params: [
      P.range('zoom', 'End zoom', 1, 1.2, 0.005, 1.08, 'Zoom at the end of the layer'),
      P.range('zoomStart', 'Start zoom', 1, 1.2, 0.005, 1, 'Zoom at the start (1 = plain push)'),
      P.range('panX', 'Pan X', -8, 8, 0.5, 0, 'Horizontal pan, % of frame width'),
      P.range('panY', 'Pan Y', -8, 8, 0.5, 0, 'Vertical pan, % of frame height'),
      P.select('ease', 'Easing', [['inOut', 'Smooth (in-out)'], ['linear', 'Linear']], 'inOut'),
    ],
    camera(P, e) {
      const { lt, dur } = e;
      const q = U.clamp(lt / Math.max(0.01, dur));
      const prog = P.ease === 'linear' ? q : U.ease.inOut(q);
      const px = P.panX / 100 * frameW(e), py = P.panY / 100 * frameH(e);
      return {
        x: px * prog, y: py * prog,
        zoom: U.lerp(Math.max(1, P.zoomStart), Math.max(1, P.zoom), prog),
        mx: Math.abs(px),                                      // worst case, constant
        my: Math.abs(py),
      };
    },
  });
  preset('float-in', 'Float: slow push in', 'float', { zoom: 1.1 });
  preset('float-diagonal', 'Float: diagonal drift', 'float', { zoom: 1.06, panX: 3, panY: -2 });
  preset('float-archival', 'Float: archival still', 'float', { zoom: 1.12, panY: -3 });
  preset('float-settle', 'Float: settle back', 'float', { zoomStart: 1.15, zoom: 1.05 });
})();
