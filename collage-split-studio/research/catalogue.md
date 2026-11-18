# Collage & Split Studio Pro — research catalogue (feature spec)

Research pass (Z.ai, sandbox): image web search for "Johnny Harris collage video", "scrapbook stop-motion collage",
"split screen comparison VS badge", "film strip / contact sheet layouts" (20 results, 11 reviewed with a vision model —
notes in `research/notes-vlm.md`, raw hits in `research/image-search-results.json`), combined with the known look of
Johnny Harris / Vox explainer collage, CapCut-style split-screen templates and real 35 mm contact sheets. This file is
the master list the layouts were built from.

Conventions observed (all families):

- Photos sit on a **textured paper background** (kraft / cream / newsprint / dark charcoal) or plain black/white/colour.
- Cut-out photos ("stickers") get a **white outline (2–4 % of height) + soft drop shadow**, slight random rotation
  (±4–8°), hand-placed offsets. In the JH look photos are often **desaturated / B&W with one accent colour**.
- Motion is **stop-motion boiled**: positions jitter every frame at 12 fps (8 / 6 fps = rougher), like paper moved by hand.
- Entrances are physical: **slide in from off-screen, springy pop, stamp/slam**; never a plain fade.
- Every animation **finishes near p ≈ 0.95** and holds; the last 5 % is the resting composition.
- Labels are **dark pills, amber tags, white cards, typewriter strips or handwritten notes**; Hindi (Devanagari) must fit
  (generous padding, measured width).
- **No tape, no tears, no pinned notes, no string** — those belong to Paper Transition Studio / Detective Board Studio.
- Generic names only; no real brands/logos/people; nothing "AI" in any default text.

## Family: split — Split screens (done in `src/fx/splits.js`)
2/3/4-way panels (side by side, rows, diagonal, 2×2, 1 big + 2 small), panels slide/grow/wipe in with stagger, white or
coloured divider, optional centre VS badge, labels per panel, slow zoom inside panels. Split push: full frame splits as
each next photo pushes in. Presets: `split-2-slide`, `split-2-diagonal`, `split-2-rows`, `split-3-columns`,
`split-3-diagonal`, `split-big-small`, `split-4-grid`, `vs-compare`, `vs-diagonal`, `split-push-3`, `split-push-2v`.

## Family: compare — Compare A vs B
- **A vs B duel**: two cut-out stickers (or photos) slide in from left/right, face each other, VS badge pops between,
  name labels under each, slow push at the end. The classic "X बनाम Y" opener.
- **Side panel compare**: photo A full frame, photo B slides over as a side panel (vertical split with a soft shadow
  edge), tab labels BEFORE/AFTER (or custom) pinned top-left / top-right.
- **Swap compare**: B wipes over A along an angled edge with the sweep controlled, labels stay put; optional swap back.
- **Compare cards**: two labelled white cards drop onto the background, photos inside, header text above each.
- **Before/after slider** (done in `splits.js`): handle sweeps/ping-pongs, line + round handle, BEFORE/AFTER labels.
- Presets: `vs-duel`, `vs-duel-photos`, `ab-panel`, `ab-swap`, `compare-cards`, plus `before-after*` (done).

## Family: grid — Grids that build and rearrange
- Even grid (auto rows × cols for the slot count, or chosen 2×2 … 4×3), cells pop/cascade/flip in with stagger, then
  optionally **rearrange** (photos fly to new positions) in the second half. White or dark cell frames, gap, labels.
- **Masonry**: editorial mixed-size grid (some cells span 2), builds diagonally.
- Presets: `grid-2x2-pop`, `grid-3x2-cascade`, `grid-3x3-cascade`, `grid-4x3-wall`, `grid-rearrange`, `grid-masonry`.

## Family: pip — Picture-in-picture
- **Full photo base** (single slot, Ken Burns) — the plain building block of every story.
- Corner PiP windows (1–3) pop in over the base photo, white/black border, rounded or circle mask, label; optional
  corner swap mid-scene; optional **grow-to-full** at the end (window expands to the whole frame near p ≈ 0.95).
- **Side panels** (news style): base + 2–3 narrow panels slide in from the right, one after another.
- Presets: `photo-full`, `pip-corner-pop`, `pip-grow-full`, `pip-circle`, `pip-panels-news`.

## Family: wall — Photo walls
- **Wall zoom-in**: a wall of photos (4×3 etc., slight per-photo tilt, thin white borders) builds; then the camera zooms
  into one chosen photo until it fills the frame (exact cover zoom — never expose an edge), tiny hold at the end.
- **Pan across**: camera drifts left→right across the wall, settles centre.
- **Shuffle**: tiles fly to new positions mid-scene, settle.
- Presets: `wall-zoom-in`, `wall-pan-across`, `wall-shuffle`, `wall-gallery`.

## Family: scrapbook — Johnny Harris / Vox scrapbook collage
- Kraft/cream paper bg + scraps and halftone accents behind; 3–6 photos hand-cut (rough edge) or cut-out with white
  outline, scattered with rotation/overlap, **slide/pop in one by one**, 12 fps stop-motion boil by default, optional
  handwritten annotation labels, optional B&W grade. This is `jh-bw-collage` (default project scene 1).
- **Chaos → order**: the scattered collage flies into a neat row/grid in the second half.
- Presets: `jh-bw-collage`, `scrapbook-pop-in`, `scrapbook-chaos-order`, `scrap-annotated`, `vox-halftone`.

## Family: sticker — Cut-out stickers
- Base photo full frame; 1–5 cut-out stickers (people/objects with white outline + shadow) **pop in** springy one by
  one, each with a small name label, slight wiggle on stop-motion steps.
- **Lineup / parade**: cut-outs slide in from left and right into a row, labels under each.
- Presets: `sticker-pop`, `sticker-lineup`, `sticker-fan`.

## Family: polaroid — Polaroids & stacks
- **Deal + fan**: a deck in one corner deals polaroids (white frame, thick bottom band, hand-written caption) onto the
  centre one by one — each slides fast and settles with a tiny bounce; then the stack fans out.
- **Slam**: one polaroid slams down from big scale, caption appears after.
- **Fan spread**: polaroids fan out from a corner, one lifts forward.
- Presets: `polaroid-deal-fan`, `polaroid-slam`, `polaroid-fan-spread`.

## Family: film — Film strip & contact sheet
- **Film strip**: dark bg, horizontal band with rounded-rect sprocket holes top + bottom, photo frames scroll past,
  yellow/orange edge markings, frame counter; ends with one frame centred and zoomed (cover). Vertical version for
  Shorts.
- **Contact sheet**: 35 mm look — strips of frames on black, thin frame gaps, frame numbers under each frame, edge
  text; frames "develop in" (fade + scale), then one frame is highlighted (amber outline) and enlarges to full frame.
- Presets: `filmstrip-scroll`, `filmstrip-vertical`, `contact-sheet-develop`, `contact-sheet-zoom`.

## Family: mosaic — Mosaic
- **Build**: photo tiles flip in one by one in a seeded random order until the whole mosaic is filled, slow drift.
- **Wave**: tiles flip in a diagonal wave.
- **Reveal**: photo 1 full frame; the other photos cover it as tiles, then fly off one by one revealing it (done at
  p ≈ 0.95).
- Presets: `mosaic-build`, `mosaic-wave`, `mosaic-reveal`.

Counts: 10 families · ~30 layouts · ~54 presets (14 split/compare done before this pass).
