# HANDOVER — Blueprint & Diagram Studio Pro (studios/blueprint-diagram-studio/)

## What was built
A complete house-style studio (Kinetic Title Studio Pro architecture, same dark/amber UI, same
build/serve/render/qa pipeline), for every "how does it work / how is it built / who is related to
whom" graphic a Hindi documentary-explainer edit uses.

- **10 families, 65 presets** (`src/fx/*.js`): Blueprint draw-on (18 — 16 parametric drawings +
  SVG import + photo trace), Rotating wireframe (5), Exploded & cutaway (5), Labelled diagram (5),
  Process & flow (8: steps, pipeline with moving dots, cycle, chain, funnel, timeline,
  before/after, decision flowchart), Trees & hierarchy (4: dynasty with portraits, org chart, big
  tree with camera pan + pull-back, succession highlight), Scale & size (3: ruler lineup, giant
  reveal, area squares), Cross-sections (5: earth, sea depth, floors, mine shaft, pipe),
  Mechanisms (7: gears with true ratio, slider-crank piston, conveyor, pulley, pendulum, valve,
  turbine), Relationship diagrams (5: Venn 2/3, 2×2, hub-and-spoke, comparison table).
- **6 paper themes** (blueprint navy, graphite tracing, chalkboard, neon, clean white, aged
  drafting) with cached low-res textures; chalk/graphite/aged strokes "boil" at 8 fps.
- **Technical-drawing core** (`src/core/draw.js`): stroke draw-on with progress, arrowheads
  (arrow/tick/dot/hollow), full dimension lines (extension lines + counting measurements), centre
  lines, hatching, leader lines + pop-in label boxes (Devanagari-safe), numbered markers, blueprint
  grid sweep, generic title block, moving dots along paths.
- **16 generic parametric drawings** (`shapes.js` + `shapes2.js` + `shapes3.js`): fort wall,
  minaret, gravity dam, arch bridge, house plan, cargo ship, submarine, tank, fighter jet (top
  view), rocket, train car, car, gear train, bunker, temple dome, satellite — each with Hindi/English
  labels, dimension specs and a closed outline for 3D extrusion.
- **Photo → line art tracer** (`src/core/trace.js`): Sobel edges, exact-quantile adaptive
  threshold, coarse-grid marching-squares contour tracing (closed-loop chaining), RDP simplification
  — the traced contours draw on like any other blueprint stroke.
- **SVG import** (`src/core/svgimp.js`): path/rect/circle/ellipse/line/polyline/polygon + nested
  transforms, curves flattened to polylines.
- **3D wireframes** (`src/core/wire.js`): box/cylinder meshes + automatic LATHE of any silhouette
  outline (rings + verticals — domes read as domes), turntable + tilt, perspective, hidden-line fade.
- **Studio UI** (`src/ui/app.js`): preset library with live hover thumbnails (lazy, 12 ms budget),
  stage with drag-drop (photo/video/SVG/JSON), transport (space/arrows), timeline with shot cards +
  transition chips (cut/fade/black/wipe) + drag reorder + **layer timing bars with grips** (editable
  on Blueprint/Labelled shots, timing preview on the rest) + playhead, auto-built inspector
  (SHOT/STYLE/ANIMATION/LABELS/MEDIA), undo/redo (Ctrl+Z / Ctrl+Shift+Z), localStorage autosave with
  media re-link by name, phone layout < 900 px with Library/Timeline/Edit/Export tabs, 10 templates
  (≥1 fully Hindi, 1 Shorts vertical, 1 English).
- **Pipeline**: `window.BDS = { load(project), project(), duration(), frame(t, mode), sheet(...) }`
  with the `{"shots":[{"preset","media","fields","params"}]}` shorthand (media by path/url/dataURL/
  text); `render.mjs` (headless Chrome via CDP + ffmpeg; PNG frames → libx264 MP4 / libvpx-vp9
  yuva420p WebM; `--mode/--fps/--size/--from/--to/--still`; fails loudly); `qa-sheet.mjs`;
  `serve.mjs` on port **7407**; `Start Blueprint Studio.cmd` + `Open On Phone.cmd` (CRLF);
  `production/pipeline/diagram_fx.py` (--preset/--photo/--media/--text/--sub/--field/--param/
  --mode/--size/--fps/--list/--input, UTF-8 console, studio found at ../../blueprint-diagram-studio).
- **Fonts**: 28 OFL woff2 files (8 families: Mukta, Khand, Kalam, Tiro Devanagari Hindi, Rozha One,
  Special Elite, Share Tech Mono, Oswald) inlined as base64 (HTML ≈ 3.0 MB).

## What was tested and how (this sandbox, 2026-11-07)
- **Contact sheets of every preset** at p = 0.25/0.45/0.65/0.85 (`test-output/qa-*.jpg`, one per
  family), and each sheet was **looked at with a vision model**; every issue found was fixed and
  re-looked: label boxes overflowing the frame edge (leader anchoring rewritten), photo tracer
  returning nothing (marching-squares loop-closing bug + RDP degenerate-chord bug — both fixed and
  verified: contours now follow the fort/ridge/foreground in the demo photo), wireframe dome reading
  as a flat box (switched extrusion to automatic lathe), wireframe labels floating in space (now
  anchored to real projected vertices), exploded parts moving the WRONG WAY (sign bug — nose now
  separates upward), exploded label collisions (per-side stacking), labelled call-outs landing on
  sky (markers re-targeted + a visible gate added to the demo photo), big-tree pull-back showing
  black letterbox + cut-off root (paper now covers the full zoomed-out world, camera re-centres),
  giant reveal collapsing to nothing (zoom-to-fit-giant + screen-constant line weights + screen-space
  counting label — verified: mountain fills the frame, 8,848 m counts up).
- **Editor in a real browser** (agent-browser, Chrome): 1920×870, 1366×680, 390×844 — play button
  visible and clickable at all three, **0 console errors**, play advances time (0→4.1 s, canvas
  non-black), preset apply, shot select, family chips, search, template load (10 templates), export
  dialog (5 modes/6 ranges/5 sizes), layer bar drag writes timings, undo/redo works, phone tabs
  switch panels, **no horizontal scroll at 390 px**. 20 shot-select clicks took 94 ms (~5 ms each).
- **Pipeline**: `render.mjs` composite MP4 (h264, 5.5 s/165 frames, 1280×720, **no audio stream**);
  green mode — lossless PNG still is **exactly (0,255,0)**, the MP4 is (0,254,0) (yuv420p rounding,
  same as the Kinetic Title Studio hand-over recorded; chroma keys fine); **alpha WebM verified in a
  browser**: corner pixels (0,0,0,0), 855k transparent vs 17k opaque pixels; media-by-path for photo
  and SVG works end to end; `diagram_fx.py --list` (68 lines) and two end-to-end renders (Hindi
  fort MP4, labelled alpha WebM with a real photo) succeed.
- **In-browser WebCodecs export** (Mediabunny): 640×360 MP4 rendered in 0.2 s.
- Determinism: no `Math.random`/`Date` in any effect (seeded hashing only; `uid()` for ids only).

## Not done / not tested (be honest)
- **Not tried on a real phone** — the 390×844 layout was verified in a desktop browser's device
  viewport only.
- The in-browser Export dialog's **cancel path** and 4K/60 fps exports were not exercised (the
  exporter itself was tested via `BD.exporter.run`).
- `bp-svg-import` and `bp-photo-trace` sheets show the **placeholder state** (no user file is
  attached in QA); both were verified separately with a real SVG file and a real photo.
- The traced-line art is a stylised contour trace (edge regions → outlines), not a thinning/
  skeletonisation — dense pencil sketches will trace as outline bands.
- MediaRecorder fallback path (browsers without WebCodecs) is untested in this sandbox (Chrome has
  WebCodecs).
- Windows specifics (Remotion's ffmpeg/Chrome lookup, CRLF launchers) follow the reference
  implementation exactly but could only be tested on Linux here; the user's PC check remains.
- WebCodecs `hevc`/`av1` encode paths are theoretical (mediabunny picks `avc` first).

## Checked on Windows by Claude (2026-11-07)
- **Fixed: MP4s were tagged full-range (`yuvj420p`)** because composite frames are piped as JPEG; some players/editors
  show washed or crushed colours. `render.mjs` now converts to normal TV range (`yuv420p(tv)`).
- **Layer timing list squeezed the preview** on laptop screens (stage 335 px wide at 1366×680); the layer tracks now
  scroll inside a capped box on desktop.
- Rebuilt; editor checked headless at 1920×870, 1366×680, 390×844 (play clickable, Play advances, no horizontal
  scroll, no console errors). `diagram_fx.py`: dynasty tree with Hindi title (MP4), fort blueprint on green, giant
  scale reveal — silent, render fine. Shots start with a short fade from black by design.
