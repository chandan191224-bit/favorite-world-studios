# HANDOVER — Sketch & Ink Reveal Studio Pro (studios/sketch-reveal-studio/)

Built by **Z.ai (GLM-5.3, Full-Stack)** on 2026-11-07, following the house reference
(Kinetic Title Studio Pro) and the brief in `studios/sketch-reveal-studio/BRIEF.md`.

## What was built
- **One self-contained offline HTML** (`Sketch & Ink Reveal Studio Pro.html`, 2.3 MB) built by
  `node build.mjs` from `src/` — core (util/text/proc/paper/inkdraw/media/engine/export),
  fx (styles/reveals/annotations/roto/elements), presets, UI (app/templates). Fonts
  (Mukta, Kalam, Tiro Devanagari, Caveat — OFL, subset woff2, base64) and Mediabunny
  (MPL-2.0) are inlined. `node fetch-fonts.mjs` re-downloads fonts.
- **The sketch engine** (the heart, all procedural + seeded, canvas 2D only, no
  `ctx.filter`): photo → grayscale → unsharp edge source → Sobel → non-max suppression →
  **ridge tracing with momentum, hysteresis and gap jumps** → RDP simplification + even
  resampling → hand strokes (variable width, pressure taper, seeded wobble, pencil /
  charcoal / chalk / brush passes, optional pencil/nib tool that follows the stroke tip).
  Tone passes: **isophote streamlines** (hatching that follows the forms — banknote
  engraving), straight cross-hatch, stipple dots, tinted washes, k-means colour
  quantisation, halftone dot screens, woodcut fills with white cuts. Heavy analysis runs
  ONCE per photo at 512 px in background time-slices (never blocks the page; the stage
  shows a progress note), cached by media + all result-affecting params.
- **67 presets / 7 families**: 16 draw styles (14 styles + portrait variants), 9 draw-on
  reveals (orders, artist pencil/pen), 10 transitions, 8 papers, 8 annotations, 6
  rotoscope, 10 scenes & stories. 10 templates (incl. Hindi-first + Shorts vertical).
- **Timeline**: shots + transition chips between them (a transition eats into the next
  shot's head — the new drawing starts under the effect), drag-to-reorder, **layer bars**
  for labels/marks with move/resize handles + playhead, + Photo / + Demo buttons.
- **Inspector** auto-built from parameter schemas, grouped in cards (STYLE, ANIMATION,
  PAPER, PHOTO, LABELS, LAYERS, MEDIA, timing, seed). Undo/redo (Ctrl+Z / Ctrl+Shift+Z),
  autosave with media size budget, Save/Open `.sketch.json`, drag-drop photos/videos.
- **Pipeline**: `window.SKS` hooks (`load` with `{"shots":[{"preset":…,"media":…,"fields":…}]`
  shorthand, `project`, `duration`, `frame`, `sheet`), `render.mjs` (headless Chrome via
  CDP + ffmpeg, PNG frames piped → libx264 MP4 / libvpx-vp9 yuva420p alpha WebM, exit
  codes checked, never fails silently), `qa-sheet.mjs`, `serve.mjs` (port 7408),
  `Start Sketch Studio.cmd` + `Open On Phone.cmd` (CRLF), `production/pipeline/sketch_fx.py`
  (UTF-8-safe) and `production/SKETCH_REVEAL_STUDIO.md` (usage rules).
- **Demo art, drawn procedurally**: sepia archive portrait (layered shading), old-city
  gate event scene, river/bridge landscape, pocket-watch still life, aged document, and
  a deterministic "video clip" (steam train at 12 fps) for the rotoscope presets — so
  the studio starts playing with no user files.

## Real bugs found and fixed during QA (kept here for the record)
1. `'demo:place'.slice(6)` === `'lace'` — every non-portrait demo fell back to the
   portrait (5-char prefix, not 6).
2. One-character typo in the stroke arc length (`P[i*2-3]` instead of `P[i*2-1]`) made
   every stroke NaN → **no strokes rendered at all** — only hatch/dots/washes showed.
3. `destination-in` applies to the whole canvas per fill — multi-shape masks (ink
   bleed, brush, wash) erased everything; masks are now built on their own canvas and
   applied once.
4. Labels/marks were positioned in design px (1920) on device-px canvases — invisible
   at any size but Full HD.
5. For pour/split reveals the ink pass repainted the paper over the just-drawn photo
   (`noPaper` flag added).
6. `SKS.frame` returned JPEG for composite mode while render.mjs pipes PNG (ffmpeg
   exit 69 — caught by the loud-failure check).
7. Analyses are async — the first QA sheets drew half-analysed rows; `SKS.sheet` now
   warms and waits for every analysis.
8. Draw-on finished at p≈0.46 (static middle); all preset timings retuned so animation
   finishes near p≈0.95, verified by per-cell ink-pixel counts.
9. tr-* sheet thumbnails rendered outside the transition segment; cut thumbs show A→B.
10. Pour/split/splitHold shots drew ink with `noPaper` before the photo had started —
    black frames; the paper is now always drawn under those reveals.
11. splitHold's divider followed the subject focus (≈0.55) instead of a true half; pour
    drips punched holes instead of extending the colour; dip's recovery was too dark.

## Tested (in this sandbox, headless Chrome 156 + ffmpeg 7.1.5)
- **Contact sheets of every preset** at p = 0.25/0.45/0.65/0.85 for all 7 families
  (`test-output/qa-*.jpg`), looked at by a vision model like an editor, then re-rendered
  after each fix round. Final rounds: styles 14/16 GOOD (the p=0.85 "washed" notes are the intended photo
  reveal mid-fade), paper 8/8, rotoscope 6/6, transitions 10/10 SHIP, annotations 8/8,
  scenes 9/10 SHIP + story-split/pour verified fixed by pixel probes after the final
  build (split halves measured, pour renders on paper, dip lifts to 96% shot B).
- **Editor**: loads with **zero console errors**; 1920×870 (play button clickable,
  transport visible below stage), 1366×680 (no horizontal scroll), 390×844 (4 bottom
  tabs, no horizontal scroll, stage renders). Interactions exercised headless: play /
  pause (time advances), library card click applies preset, transition chip select +
  type change, layer bar panel, annotation add, undo removes it, Templates (10),
  Export dialog (5 modes / 11 ranges / 5 sizes). Worst interaction latency during
  warm-up: ~53 ms (20 slider events incl. paint).
- **Exports**: MP4 h264 silent (0 audio streams, decodes clean); **green screen exactly
  #00FF00** in all four corners; **transparent WebM alpha verified in a real browser**
  (95% transparent background, ink visible — ffmpeg cannot decode VP9 alpha, as
  expected); PNG frames from `SKS.frame` are lossless. Python helper end-to-end with
  Hindi `--text`/`--sub` (label/sub and heading/body mapped correctly), `--list` (67).
- **Determinism**: everything seeded (no `Math.random`/`Date` in effect code — ids only);
  analysis cached by every result-affecting parameter.

## Not done / not tested (honest)
- **Not tried on a real phone** — only the 390×844 emulation (no horizontal scroll,
  tabs work). Touch drag of layer bars uses pointer events, which should work, but no
  finger test happened.
- The **in-editor Export dialog** was opened and its options checked, but no click-through
  export was run in the dialog itself (the same export code path was verified headless
  via `SKS.frame` + render.mjs; MediaRecorder fallback not exercised).
- **Rotoscope with a real video file**: the demo train clip was used for all roto QA.
  `render.mjs` supports video media (file URLs + exact seeking), and seeking is the same
  code path as the reference studio, but a real user clip was not rendered end-to-end.
- The demo portrait is painterly-illustrative (procedural), not a photograph — on real
  photos the tracer produces crisper strokes; engraving density on soft-toned photos is
  lighter than on high-contrast ones (raise **Hatch density** in the inspector).
- Boiling-line rotoscope caches per 1/12 s step: scrubbing a long clip cold can take a
  moment per new frame step (LRU-capped at ~260 frames).
- `story-dry-back` intentionally shows photo → sketch (it IS the "photo dries back"
  preset); reviewers read it as "backwards" — it is by design.
- Windows launchers are CRLF and copy the reference exactly, but were not run on the
  user's PC (no Windows here); render.mjs's Remotion ffmpeg/Chrome paths follow the
  reference's scan order and fall back to system Chrome/ffmpeg.

## Checked on Windows by Claude (2026-11-07)
- **Fixed: `sketch_fx.py --photo` rendered only blank paper.** The helper writes the photo inline on the shot
  (`shot.media = {m1: {path}}`) but `render.mjs` only turned `path` into image data for the project-level `media`
  table, so the photo never loaded. `render.mjs` now resolves paths in both places.
- Rebuilt the HTML; editor checked headless at 1920×870, 1366×680, 390×844: play button visible and clickable, Play
  advances, no horizontal scroll, no console errors.
- `sketch_fx.py` on a real image: `story-portrait-historical` MP4 with a Hindi caption (draws on, then the photo
  fades in) and `sty-engraving` as transparent WebM — both silent and correct.
- Note: on busy, many-figure images the traced line art is rough/blobby; it reads best on a single portrait or a
  clear subject.
