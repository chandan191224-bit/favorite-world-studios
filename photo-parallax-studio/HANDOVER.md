# HANDOVER — Photo Parallax Studio Pro (studios/photo-parallax-studio/)

## Who built what
- **Claude, 2026-11-06:** YouTube/web research (`research/catalog-part1..3.md`, `videos.txt`), packed the offline depth
  model (Depth Anything V2 Small int8 ONNX) and ONNX Runtime into `models/depth-model.js` / `vendor/ort/ort-assets.js`,
  `src/core/util.js`. The session then hit its usage limit.
- **Z.ai (GLM-5.3, Full-Stack sandbox), 2026-11-07:** everything else: engine, depth (auto + brush + built-in
  estimate), background in-paint, layered cut-out renderer, WebGL displacement-mesh renderer, 36 presets, atmosphere,
  overlays (caption/year chip, name tag, place marker), grade, transitions, UI (desktop + phone), templates, export,
  `build.mjs`, `render.mjs`, `qa-sheet.mjs`, `serve.mjs`, launchers, 4 generic demo photos. Its chat was cut off
  ("Live stream is no longer available") before it wrote README, HANDOVER, the production doc and the pipeline helper.
- **Claude, 2026-11-07 (on the user's Windows PC):** reviewed and finished it (below).

## What Claude fixed / added on Windows
1. **Pan presets exposed a black strip at the photo's edge** (pan-slow, kb-pan at p≥0.65). The safety zoom did not
   account for the pan shift being enlarged by that same zoom. `src/core/engine.js` now computes the exact zoom that
   keeps the moved photo covering the frame (`coverScale`, per edge, nearest and farthest layer, rotation margin), for
   the flat and the layered renderers. The two presets' default pan was shortened (0.32 → 0.14, 0.25 → 0.12) so they
   stay wide.
2. **`render.mjs` could not find ffmpeg on Windows** (looked for `node_modules/@remotion/compositor-*` as one folder
   name) and failed with `spawn ffmpeg ENOENT`. Now it looks inside `node_modules/@remotion/`.
3. **Pipeline shorthand:** a project shot may say `"preset": "<id>"`; the loader (`src/ui/app.js`) fills the move,
   grade, atmosphere, overlays, depth and duration from that preset, and fills missing fields of overlays/atmosphere
   from their defaults. Used by the new helper.
4. **New:** `production/pipeline/parallax_fx.py`, `production/PHOTO_PARALLAX_STUDIO.md`, `README.md`, this file.

### Second round (user: "photo parallax studio not working properly")
5. **The editor froze for about a minute after opening.** The depth model runs on the page thread (~3–6 s per run),
   and it was being run for every size of the drawn demo scenes and from all 36 library thumbnails, plus every shot at
   start-up. Now (`src/core/depth.js`, `src/ui/app.js`): the model runs only for real photos, once per photo; library
   thumbnails never start it (`PP.depth.noStart`); at start-up only the first shot is prepared. Measured headless:
   page answers in 1–5 ms throughout the first 20 s (was blocked ~45–80 s).
6. **Model depth never showed in the editor preview.** The first frame was drawn with the estimate while the model was
   running, and that field/band stack was cached under the same key, so the model result was never used. The cache
   keys now include which depth was used (`tag` 'A'/'H' in `depth.field`, `inpaint.bands`), and the editor redraws when
   a model run finishes (`pp-depth-ready` event). Measured: horseman photo 6.1 s first run → render uses model depth.
7. **Play clock went negative** ("-1:-37.4") and stuck: the loop added (rAF time − last), which can be negative.
   Clamped to 0…0.1 s per frame and t ≥ 0 (`src/ui/app.js` loop).
8. **Timeline thumbnails of photo shots were blank**: made before the photo decoded and cached forever. The placeholder
   is no longer cached (`src/core/sources.js` thumb).
9. `render.mjs` now finds Remotion's headless Chrome (it fell back to installed Chrome, which also works).
10. **Play bar hidden on wide screens** (user's screenshot, 1920-wide Edge): the stage's `max-height: 100%` had no
    definite height to resolve against, so the picture grew past its area and covered the transport (play button,
    time, scrubber). `.stage-wrap` is now a size container and the stage is limited by `100cqw`/`100cqh` (desktop
    only; the phone layout keeps its full-width stage). Checked headless at 1920×870, 1366×680 and 390×844: play
    button visible and clickable, no horizontal scroll.

Known limit: each NEW photo still pauses the editor for a few seconds while its depth is computed (the model runs on
the page thread so the studio works from a double-clicked file). After that the photo is cached.

## Tested (on Windows, 2026-11-07)
- `node build.mjs` → `Photo Parallax Studio Pro.html` (2.47 MB) + `presets.json` (36 presets).
- Contact sheets of **all 36 presets** at p = 0.05/0.45/0.85/1 and 0.25/0.45/0.65/0.85
  (`test-output/win-qa-0.jpg`, `win-qa-12.jpg`, `win-qa-24.jpg`), looked at: no torn edges or black strips after the
  fix; Hindi captions/name tags/place labels shape correctly; moves finish and hold.
- `parallax_fx.py` renders: year-chip with a Hindi caption (MP4), pan-slow transparent WebM (corner alpha 0 = really
  transparent), name-tag green screen (green decodes as (0,254,1); Hindi name correct). No audio stream in any output.

## Not tested
- The editor UI was not clicked through by hand on Windows (Z.ai tested it headless in its sandbox; this was not
  re-checked), and it was not tried on a real phone.
- Automatic depth with the bundled model in the browser UI (the CLI renders above used it if present; not timed).
- Long renders (only 4 s clips at 720p were rendered here) and 4K.
- The `rain-street`, `vertigo`, `mesh-rush` and ridge presets show on simple drawn demo scenes; they need real photos
  to judge the look.
