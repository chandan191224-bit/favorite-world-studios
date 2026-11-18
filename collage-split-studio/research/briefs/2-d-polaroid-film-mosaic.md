# Task 2-d: fx/polaroid.js + fx/film.js + fx/mosaic.js (families `polaroid`, `film`, `mosaic`)

Your Task ID: **2-d**. Read `CONTRACT.md` in this folder first, then the source files it lists. Then CREATE exactly three
files and nothing else.

## 1. `/home/z/my-project/collage-split-studio/src/fx/polaroid.js` — family `polaroid`

A polaroid = white frame drawn by you: border ≈ 5 % of photo width on sides/top and a thick bottom band ≈ 16 % of the
photo height; photo inside via `D.photo`; caption = `env.label(k)` in hand style (`D.label` style 'hand', dark text —
labels style param still allowed) inside the bottom band, centred. Soft shadow. Slight static rotation.

### Layout `deal` — "Deal + fan" (slots 4, min 2, max 6, dur 6)
- A deck sits at the bottom-right corner (draw 4–6 stacked white rects slightly offset, rotated −8°, visible from the
  start — they shrink as cards are dealt).
- Polaroids are dealt one by one onto seeded target positions in the middle area (margins 0.15·S, controlled overlap):
  each slides from the deck position with `E.outQuart` + tiny overshoot rotation (rotation settles from the deck's −8°
  to its resting ±6° with `E.outBack`), stagger `stagger` def 0.28 s, all landed by p ≈ 0.62; captions pop 0.15 s after
  each lands (`E.pop`).
- `fan` (bool def true): at p 0.72..0.93 the stack fans out — each card's position/rotation interpolates
  (`E.inOut`, per-card ±0.04 s stagger) to a fanned arrangement (angles spread −14°..+14° around the stack centre,
  positions spread along x). Hold.
- `bw` param (0..1 def 0) on the photos. Look `{ bg: 'dark' }`.

### Layout `slam` — "Polaroid slam" (slots 1, min 1, max 2, dur 3.5)
One polaroid slams down: scale 2.3→1 with `E.slam`, rotation −14°→−3°, shadow grows from blur 0.02→0.045·S, done by
p ≈ 0.4 (looks stamped). Then the caption appears at p 0.5..0.65 revealed CHARACTER BY CHARACTER (whole number of
chars: `text.slice(0, Math.round(frac * text.length))`) like being written, with a small underline stroke growing
beneath. Hold. If slot 1 is present, a second polaroid slams at p 0.55 after the first (same treatment, opposite
rotation). Look `{ bg: 'dark' }`.

### Layout `fan` — "Polaroid fan spread" (slots 4, min 3, max 6, dur 6)
Polaroids start stacked at the bottom-left corner (rotated −20°, only edges visible), then fan out between p 0.1 and
0.6 (`E.inOut`) into an arc across the lower half: angles −24°..+24°, positions on an arc centred above the frame
centre (compute arc so cards don't leave the frame — clamp). Then `pick` (int, def 1) lifts forward at p 0.72..0.93:
scales to 1.6 and slides toward centre-front (drawn last, biggest shadow). Captions pop after the fan settles.
Look `{ bg: 'dark' }`.

## 2. `/home/z/my-project/collage-split-studio/src/fx/film.js` — family `film`

### Layout `filmstrip` — "Film strip" (slots 4, min 2, max 6, dur 6)
- Look `{ bg: 'black' }`. A strip band centred (band height `bandH` def 0.56 of H for horizontal), dark grey
  `#15161a` with rounded corners, ONE row of photo frames (frame aspect ≈ 3:2, height = band inner height minus
  sprockets), frames wrap photos `k % n`.
- Sprocket holes: rounded-rect holes (w ≈ 0.012·S, h ≈ 0.008·S, radius 40 %) evenly spaced along the top and bottom
  edges INSIDE the band (count = strip length / spacing, seeded offset fine). In matte mode: holes are part of the
  white band silhouette (i.e. just don't draw holes as separate dark shapes — draw the band white and the holes as
  transparent cut-outs using `destination-out` on a scratch canvas; keep it simple: band + frames white, holes cut).
- Edge markings in amber (`#e5a93c`, mono font `D.FONTS.type`, small): repeated `'COLLAGE 400 · 36 EXP'` along the top
  sprocket row and a frame counter near the centre frame — WHOLE numbers only. Skip edge text in matte mode.
- Motion: strip scrolls (photos pass left) for p 0..0.65 (`E.inOut` — starts moving, decelerates), then `endZoom`
  (bool def true): between p 0.7 and 0.95 the strip scales and translates so ONE chosen frame (`pick` int def 0)
  ends filling the WHOLE frame exactly (cover math — end scale = max(W/fw, H/fh); clamp translate so no edges show at
  any point during the zoom). With endZoom false: the strip keeps drifting slowly and holds.
- `orient` (h | v def h): vertical version — band vertical, scrolls up (for Shorts 1080×1920 projects).
- Frame counter: `1..frameCount` whole numbers under the frames (tiny, muted) — in horizontal mode under the band.

### Layout `contact` — "Contact sheet" (slots 12, min 4, max 12, dur 6)
35 mm contact sheet look on black: `strips` (2–4, def 3) horizontal strips of `per` (5–6, def 6) frames; frames wrap
photos `k % n`. Each strip has the sprocket-hole rows top+bottom (small squares this time, 0.006·S, slight seeded
x-offset per strip), thin gaps between frames, tiny frame numbers (whole, 1-based continuous across strips) under each
frame in muted grey mono, and one line of amber edge text per strip (`'COLLAGE 400'`).
- Develop-in: strips fade+scale from 0.985 with `E.outQuart`, staggered strip-then-frame (all developed by p ≈ 0.5).
- `highlight` (int def the middle frame): at p 0.55 it gets an amber rounded outline + slight scale-up 1.06;
  `endZoom` (bool def true): at p 0.72..0.95 the highlighted frame enlarges to fill the whole frame exactly (cover
  math, no edges, `E.inOut`), hold. endZoom false: hold on the sheet with a slow zoom 1→1.05.

## 3. `/home/z/my-project/collage-split-studio/src/fx/mosaic.js` — family `mosaic`

### Layout `mosaic` — "Mosaic build" (slots 6, min 2, max 8, dur 5)
- Grid `cols` (3 | 4 | 5 | 6 def 4), rows = ceil((cols*rows fills W×H with margin 0)) — full-bleed tiling: tiles are
  equal cells covering the whole frame, gap `gap` def 0.003, NO margin. Tile photos wrap `k % n`.
- Flip-in: each tile scales horizontally 0→1 (a flip: draw the tile to `U.tmp`, then `drawImage` with negative→positive
  scaleX — cheap) with `E.outQuart`; `order` (random | wave | row def random): random = seeded shuffle of indices;
  wave = order by (col + row) diagonal; row = left-to-right top-to-bottom. Stagger `stagger` (0.02..0.2 s def 0.07).
  All tiles in by p ≈ 0.85 (this family is allowed to build the whole scene — the fill IS the content). Then hold.
- Numbers optional (`numbers` bool def false): whole numbers 1..count in tiny white pills on tiles (matte: white pills).

### Layout `mosaicreveal` — "Mosaic reveal" (slots 4, min 2, max 6, dur 6)
- Photo 0 is the base, full frame via `D.photo` (not `D.base` — it must also be there in element mode; use plain
  `D.photo` at 0,0,W,H).
- p 0.05..0.45: tiles (photos 1..n−1, wrapped to fill the grid like `mosaic`, full-bleed) fly IN from off-screen edges
  (`E.outQuart`, rotation ±20°→0, staggered) until they cover the base completely.
- p 0.45..0.6: hold the mosaic (nothing moves except the engine's drift).
- p 0.6..0.93: tiles fly OFF one by one (reverse stagger, seeded order, rotate + scale down + slide to the nearest
  edge) revealing the base photo; LAST tile gone by p ≈ 0.93; hold on the full-frame base photo.

### Presets (exact ids)
```
pr('polaroid-deal-fan', 'Polaroids – deal + fan', 'deal', {}, 6, 'Polaroids dealt from the deck, then fanned out.', 4);
pr('polaroid-slam', 'Polaroid – slam', 'slam', {}, 3.5, 'One polaroid slams down, caption writes itself.', 1);
pr('polaroid-fan-spread', 'Polaroids – fan spread', 'fan', {}, 6, 'A stack fans out; one card lifts forward.', 4);
pr('filmstrip-scroll', 'Film strip – scroll', 'filmstrip', {}, 6, 'Photos roll past on a film strip, one frame zooms up.', 4);
pr('filmstrip-vertical', 'Film strip – vertical', 'filmstrip', { orient: 'v' }, 6, 'Vertical film strip for Shorts.', 4);
pr('contact-sheet-develop', 'Contact sheet – develop', 'contact', { endZoom: false }, 6, 'A 35 mm contact sheet develops in.', 12);
pr('contact-sheet-zoom', 'Contact sheet – zoom to frame', 'contact', {}, 6, 'The contact sheet develops, one frame zooms to full.', 12);
pr('mosaic-build', 'Mosaic – build', 'mosaic', { order: 'random' }, 5, 'Tiles flip in one by one until filled.', 6);
pr('mosaic-wave', 'Mosaic – wave', 'mosaic', { order: 'wave', cols: 5 }, 5, 'Tiles flip in on a diagonal wave.', 6);
pr('mosaic-reveal', 'Mosaic – reveal', 'mosaicreveal', {}, 6, 'Tiles cover a photo, then fly off to reveal it.', 4);
```

General notes:
- Sprocket holes / film band in matte mode: everything solid white EXCEPT actual holes (cut with
  `globalCompositeOperation = 'destination-out'` on a `U.tmp` scratch, then draw the scratch). No text in matte mode.
- Whole numbers everywhere a count is drawn.
- Cover math for any end zoom: end scale = max(W/w, H/h); translate so the frame is centred; clamp during the move.
- No `Math.random`/`Date`; seeds only.

Finish with `node --check` on all three files. Report the layout + preset ids you created and any assumptions.
