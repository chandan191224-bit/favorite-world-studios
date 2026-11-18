# Task 2-b: fx/pip.js + fx/wall.js (families `pip` and `wall`)

Your Task ID: **2-b**. Read `CONTRACT.md` in this folder first, then the source files it lists. Then CREATE exactly two
files and nothing else:

## 1. `/home/z/my-project/collage-split-studio/src/fx/pip.js` — family `pip`

### Layout `photo` — "Full photo / video" (slots 1, min 1, max 1, dur 4)
The plain building block: one photo/video fills the frame (`D.photo` at 0,0,W,H with `fit` param cover | contain and the
slot's own focus/zoom), plus its own Ken Burns: `kb` (0..0.25 def 0.07) and `kbDir` (in | out | none). Slow `E.inOut`
across the whole scene; zoom-in means start at 1+kb scale centred on the slot focus; NEVER expose an edge (contain mode:
zoom only the letterbox fill, or skip zoom). Optional `label` text param? No — use `env.label(0)` drawn once as a label
pill bottom-left when non-empty (`labels` bool def true). Look `{ bg: 'black' }`.

### Layout `pip` — "Picture in picture" (slots 2, min 2, max 4, dur 5)
Slot 0 = base photo full frame (`D.base`, with slow zoom 0.04). Slots 1..(n−1) = up to 3 PiP windows.
- Window look: `style` (white | black | shadow: border colour/thickness, def white ≈ 0.012·S border + soft shadow),
  `shape` (rect | rounded | circle), size `pipSize` (frac of S, def 0.26).
- Entrances (`enter`: pop | slide): springy pop (`E.pop`) or slide from the nearest edge, staggered 0.25 s; all in by
  p ≈ 0.45. Optional label under each window (`labels`, `env.label(k)` for k = 1..n−1).
- `move` (bool def false): at p 0.5..0.75 the windows fly to the opposite corners (`E.inOut`), settle, hold.
- `grow` (bool def false): the FIRST window grows from its corner to fill the whole frame between p 0.7 and 0.95
  (`E.inOut`) — END STATE: that photo drawn as full-frame cover exactly (no gaps, no border). Draw the growing window
  above the others with increasing shadow; other windows + labels fade out with scale as it takes over (alpha down
  0.7..0.85 — a fade of competing elements is fine, the hero photo must be solid).
- Circle windows: clip circle (or ellipse matching the rect) — draw via a saved clip path.
- Corners: pick distinct corners seeded (`seed` + index), inset margin ≈ 0.035·S.

### Layout `panels` — "Side panels (news style)" (slots 3, min 2, max 4, dur 5)
Base photo (slot 0) full frame. 2–3 narrow panels (slots 1..n−1) stacked on the right side (`side`: right | left), each
≈ `panelW` (0.16..0.34 def 0.24 of W) × equal share of H with small gaps, sliding in from that side one after another
(`E.outQuart`, stagger 0.3 s, all in by p ≈ 0.5), white borders + shadows. Label bars under each panel
(`labels` def true, `env.label(k)`). Slow zoom on the base only. Look `{ bg: 'black' }`.

### Presets (exact ids — `photo-full` is the default scene when the user drops one photo)
```
pr('photo-full', 'Full photo', 'photo', {}, 4, 'One photo or video fills the frame with a slow zoom.', 1);
pr('pip-corner-pop', 'PiP – corner pop', 'pip', {}, 5, 'A photo pops in over the corner of the main photo.', 2);
pr('pip-grow-full', 'PiP – grows to full', 'pip', { grow: true, move: true }, 5.5, 'Corner window takes over the frame at the end.', 2);
pr('pip-circle', 'PiP – circle window', 'pip', { shape: 'circle', style: 'white' }, 5, 'Round window pinned on the base photo.', 2);
pr('pip-panels-news', 'PiP – side panels', 'panels', {}, 5, 'Narrow panels slide in from the right, news style.', 3);
```

## 2. `/home/z/my-project/collage-split-studio/src/fx/wall.js` — family `wall`

All three layouts: `ownCamera: true` (the engine's global drift is disabled — you move the camera yourself), and they
draw the wall onto a cached offscreen canvas so camera moves are cheap.

### Layout `wall` — "Photo wall, zoom in" (slots 9, min 4, max 12, dur 6)
- Build the wall ONCE per (seed, n, W, H, params) into an offscreen canvas at CURRENT frame size: grid `cols`
  (auto | 3 | 4 | 5, def auto → 4 for n ≥ 8 else 3), rows = ceil(n/cols); tiles = every photo `env.src(k)` with
  `border` (0..0.02 def 0.006 white), `radius`, slight per-tile `tilt` (0..6° def 1.5, seeded ±), `gap`
  (def 0.004), margin around the wall.
- The wall canvas covers the frame EXACTLY at scale 1 (design it so wall_w ≥ W and wall_h ≥ H — extend rows/cols of the
  grid with wrapped photos `k % n` until both cover).
- Build-in: tiles pop (`E.outBack`) in seeded random order (`U.h1`), 2–4 per 0.1 s, all in by p ≈ 0.4 (draw the tiles
  into the offscreen wall only as they arrive — keep a per-tile arrived fraction and composite per frame from a cached
  "tiles" array; or rebuild the wall canvas per frame from cached tile snapshots — your call, but keep < 8 ms).
- Zoom: from p 0.45 to 0.93 the camera zooms into tile `zoomTo` (int 0..n−1 def 0, clamp) until that photo fills the
  whole frame exactly (compute its centre in wall space, end scale = max(W/tw, H/th), end translate = centre − the
  exact cover offset, so the tile covers the frame with no edges and no over-shoot). `E.inOut` on the zoom progress.
  p 0.93..1: hold on the full-frame photo (tiny slow extra zoom 1→1.02 is allowed).
- The base view (before zoom) must also cover the frame — the wall is built to cover by construction, so scaling from
  1 → endScale with translate clamped keeps every intermediate view covered (verify the math!).
- params: `cols`, `tilt`, `border`, `gap`, `zoomTo`, `build` (pop | cascade | none).

### Layout `wallpan` — "Photo wall, pan across" (slots 9, min 4, max 12, dur 6)
Same cached wall (no build-in — `build` still allowed but default none; wall visible from frame 1). Camera: starts
zoomed 1.25× over the left third, pans right (or `dir`: lr | rl | up | down) with `E.inOut` and settles centred at
zoom 1.0 by p ≈ 0.9, hold. At zoom ≥ 1 the wall always covers; clamp translate accordingly.

### Layout `wallshuffle` — "Photo wall shuffle" (slots 9, min 4, max 12, dur 6)
Wall builds (cascade, done by 0.4). At p 0.5..0.88 the tiles fly to a seeded permutation of the same grid positions
(`E.inOut` per tile with ±0.06 s stagger), settle, then a gentle zoom 1→1.06 to the end. Tiles keep their photo while
moving (draw the tile's photo with scale/position interpolated; slight rotation ±3° mid-flight, 0 at both ends).

### Presets (exact ids — `wall-zoom-in` is referenced by the default project, it MUST exist)
```
pr('wall-zoom-in', 'Photo wall – zoom in', 'wall', {}, 6, 'A wall of photos builds, then the camera zooms into one.', 9);
pr('wall-pan-across', 'Photo wall – pan across', 'wallpan', {}, 6, 'Camera drifts across the wall and settles.', 9);
pr('wall-shuffle', 'Photo wall – shuffle', 'wallshuffle', {}, 6, 'The tiles reshuffle into new places.', 9);
pr('wall-gallery', 'Photo wall – gallery', 'wall', { build: 'cascade', zoomTo: 4 }, 6, 'A plain gallery wall, tiles cascade in and hold.', 12);
```

Wall camera notes: wrap your camera in `g.save(); g.translate/scale; …draw wall + tiles…; g.restore();`. In element mode
the wall photos are still drawn (they're the element) but you may skip the background (`env.bg()` handles it). In matte
mode the wall canvas tiles come from `D.photo` which already renders white silhouettes — do NOT draw extra shadows.

Finish with `node --check` on both files. Report the layout + preset ids you created and any assumptions.
