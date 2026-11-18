# Photo Parallax Studio Pro

Turns one still photo into a moving documentary camera shot: the 2.5D "photo comes alive" look (The Kid Stays in the
Picture, history-channel style). It separates the subject from the background by depth, moves the camera (push, pull,
truck, pan, tilt, crane, orbit, dolly-zoom, sway, drift, Ken Burns, 3D displacement mesh), fills the gaps behind the
subject so edges never tear, and adds atmosphere (fog, haze, god rays, embers, rain, snow, dust, bokeh, lightning, light
leaks, smoke), colour looks, grain, vignette, letterbox and Hindi/English captions. Works offline. No accounts, no paid
services. **All exports are silent** (the user never uses sound effects in video editing).

## Open it
- **PC:** double-click `Start Photo Parallax Studio.cmd` (or open `Photo Parallax Studio Pro.html` in Chrome/Edge).
  Keep `models/depth-model.js` and `vendor/ort/` next to the HTML: they are the offline automatic-depth model (Depth
  Anything V2 Small, Apache-2.0). Without them the studio still works with its built-in depth estimate.
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7401` address on the
  phone (same Wi-Fi).

## Use it
1. **Templates** (top bar) start a ready-made project: Archive documentary (B/W), Photo comes alive, Cinematic teal &
   embers, History slideshow, Hindi explainer opener, Fog & weather, 3D mesh moves, Blank.
2. **Add photo** (or drag photos onto the stage): each photo becomes a shot.
3. **Library** (left / first tab): 36 presets in 9 families. Click one to put it on the selected shot; **+** adds a
   new shot with it. Hover a card to see it move.
   - Push & pull: push-doc, push-archive, push-detail, pull-reveal, push-lean, push-tilt-up, push-tilt-down
   - Truck & pan: truck-right, truck-left, truck-occlude, pan-slow
   - Tilt & crane: crane-rise, tilt-up-sky
   - Orbit & dolly-zoom: orbit-subject, orbit-wide, vertigo, vertigo-rev
   - Sway & drift: sway, drift, breathe
   - Mesh 3D: mesh-zoom, mesh-rush
   - Documentary looks: kid-stays, teal-embers, god-rays, fog-valley, dust-battle, bokeh-dream, year-chip, name-tag, place-marker
   - Weather & mood: rain-street, snow-archive, lightning-storm
   - Ken Burns (flat, photo stays whole): kb-push, kb-pan
4. **Edit** (right / third tab): camera move settings, **Depth** (automatic depth, number of layers, parallax strength,
   focus point, brush to paint near/far by hand), atmosphere, captions/name tags/place labels, colour look, grain,
   vignette, depth of field, letterbox, transition to the next shot (dip, flash, defocus, zoom, torn paper, slide, fade).
5. **Save / Open** a `.parallax.json` project (photos included). The last project is also kept in the browser.
6. **Export:** MP4 (H.264), green-screen / blue-screen element, transparent WebM, black/white matte. 720p, 1080p, 4K,
   Shorts 1080×1920, square. Green/blue/alpha/matte make the photo a floating card (rounded corners, margin) to lay over
   other footage; use **MP4 (composite)** for a normal full-frame shot.

## Pipeline (for /make-video)
```
python production/pipeline/parallax_fx.py clip.mp4 --photo still.jpg --preset push-doc
python production/pipeline/parallax_fx.py clip.mp4 --photo still.jpg --preset year-chip --caption "कहानी यहीं से बदली" --year 1947
python production/pipeline/parallax_fx.py clip.mp4 --photo still.jpg --preset name-tag --name "एक महान इंसान" --sub "1952 – 2020"
python production/pipeline/parallax_fx.py clip.webm --photo still.png --preset kb-push --mode alpha
python production/pipeline/parallax_fx.py clip.mp4 --project saved.parallax.json
python production/pipeline/parallax_fx.py --list
```
Options: `--duration S`, `--size 1920x1080|1080x1920`, `--fps`, `--focus x,y` (subject point, 0..1), `--place "name"
--place-at x,y`, `--still S` (one frame to .jpg). Direct: `node render.mjs project.parallax.json out.mp4 [--mode
composite|green|blue|alpha|matte] [--fps 30] [--from S --to S] [--still S out.jpg]`.

## Developer notes
- `node build.mjs` rebuilds `Photo Parallax Studio Pro.html` + `presets.json` from `src/` (fonts, Mediabunny, ONNX
  Runtime glue and demo photos inlined). `node pack-assets.mjs` re-packs the model/wasm into the two sidecar scripts.
- `node qa-sheet.mjs out.jpg [--from 0 --count 12] [--ps 0.25,0.45,0.65,0.85]` renders a contact sheet of presets.
- `node serve.mjs [--lan]` serves the folder on port 7401.
- Everything is seeded (preview == export). Canvas 2D for the layered cut-out renderer, WebGL for the mesh renderer.

## History
Started by Claude on 2026-11-06 (research + model packing), finished by Z.ai (GLM-5.3 Full-Stack) on 2026-11-07, then
checked and fixed by Claude on Windows. See `HANDOVER.md` for what was tested and what was not.

## Subject cut-out (2026-11-15)
Edit → **Subject cut-out** turns any shot into a 3-layer frame: in-painted, blurred/darkened/desaturated/tinted
background; text that sits behind the subject; the subject cut out by depth with a gold/cyan rim glow and its own zoom.
Presets: cutout-rim, cutout-bw, cutout-teal, cutout-name, depth-title (family "Subject cut-out"). New text element
**Stencil name / title behind subject**. Code: `src/core/subject.js`, stencil art in `src/core/overlays.js`.
CLI: `parallax_fx.py ... --subject gold|bw-subject|teal-bg|clean --title "NAME
LINE" --cut 0.6`.
