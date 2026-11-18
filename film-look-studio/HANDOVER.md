# HANDOVER — Film Look Studio Pro

Status: **complete and verified in the sandbox** (see “What was tested and how”). Written early and kept
current, per the house rule.

## What this studio is
Overlay/texture/grade layers for the Hindi documentary-explainer channel “Favorite World”, built in the
house style (Paper Transition Studio Pro architecture): one self-contained offline HTML file
(`Film Look Studio Pro.html`, built by `node build.mjs`), dark UI with amber accent, seeded/deterministic
canvas rendering, silent exports, bundled OFL fonts (Devanagari included), pipeline hooks
(`window.FLS`, `render.mjs`, `qa-sheet.mjs`, `serve.mjs` on port 7404, `.cmd` launchers,
`production/pipeline/filmlook_fx.py`).

## What is built (files)
- `src/core/`: util.js, grade.js (+ .cube LUT), sources.js (4 demo scenes), engine.js (layer stack, four
  kinds: overlay/process/grade/camera; render modes composite/screen/alpha/source), export.js
  (WebCodecs + Mediabunny, MediaRecorder fallback, green/blue/matte post-stages, .cube export).
- `src/fx/`: registry.js; light.js + docs.js (pre-existing from the first half of the job); new:
  film.js (grain, dust, scratch, gate, weave, slip, flicker), archive.js (sepia/faded/silver grades,
  halftone, old photo), video.js (vhs, crt, rgb split, glitch, scanlines), camera.js (shake, handheld,
  punch, whip, float), frame.js (teal/wardoc/warmh/bleach grades, vignette, letterbox).
  **44 effects, 171 named presets across 7 families.**
- `src/ui/`: app.js (library with live hover thumbnails, stage + transport, draggable layer timeline,
  auto-built inspector, templates, Save/Open + localStorage autosave, drag-drop media, export dialog,
  `window.FLS` API), templates.js (10 templates incl. a Hindi Devanagari caption one).
- `build.mjs` (inlines src + vendor mediabunny + base64 woff2 fonts), `render.mjs` (headless Chrome +
  ffmpeg; PNG pipe → libx264/yuv420p or libvpx-vp9/yuva420p; loud failures), `qa-sheet.mjs`,
  `serve.mjs` (port 7404), `Start Film Look Studio.cmd`, `Open On Phone.cmd`.
- `fonts/` (OFL woff2: Instrument Sans, JetBrains Mono, Special Elite, Oswald, Mukta, Noto Sans
  Devanagari), `vendor/mediabunny.min.js` (MPL-2.0, license file included).
- `research/catalogue-light-film.md` (research catalogue; Part 2b adds the families beyond the 15 refs).
- Hand-over: `README.md`, `production/FILM_LOOK_STUDIO.md`, `production/pipeline/filmlook_fx.py`,
  this file. `test-output/` holds the QA evidence (contact sheets + export artefacts).

## Bugs found and fixed during QA (worth knowing)
1. **Film-gate punch erased nothing** (film.js): the window was punched with `destination-out` while the
   fill style was still the transparent-centre vignette gradient (rough) or a 0.5-alpha halo (others) —
   `destination-out` erases in proportion to the fill alpha. Every gate window was a dark veil;
   gate-rough was near-black. Fixed by forcing an opaque `#000` fill for the punch.
2. **Pipeline projects rendered no layers at all**: hand-written project JSON (render.mjs /
   filmlook_fx.py) omits `on: true`; the engine treated `on: undefined` as off. `load()` now
   normalises `on`/`seed`/`start`/`opacity`/`params`/`blend` on every layer.
3. **Thumbnail sampling stepped outside the layer span** (app.js renderLook): event presets whose
   length came from the effect (e.g. redact 2.5 s) were sampled on a 6 s clock, switching the layer
   off mid-preview (redact-static-block “vanished”). Now t is sampled inside the layer’s real span.
4. `halftone-newspaper-photo` crushed the chart to near-black (my own spec value); dot gain 1.4 → 1.05.
5. `rgb-film` / `rgb-vertical` too faint at 6/4 px; raised to 10/7 px.
6. `render.mjs --still` ignored the main output path when `--still` had one value; fixed (falls back
   to the positional out path). Transparent WebM branch now also passes `-vf format=yuva420p` (some
   ffmpeg builds ignore `-pix_fmt` alone).

## What was tested and how
- **Build**: `node build.mjs` → 2.3 MB single HTML; all sources pass `node --check`.
- **Every preset (171) at p = 0.25/0.45/0.65/0.85**: contact sheets in `test-output/qa-<family>-N.jpg`
  (17 sheets + close-up crops), reviewed with a vision model against a per-family rubric, plus a
  quantitative in-page pass (motion between columns, settling by p≈0.95, flat/black/white cells) and
  targeted pixel probes for anything flagged. Verified items include: gate windows now clear (interior
  brightness 129 vs 41 before the fix), halftone legible, redact-static constant across p, whip pans
  never expose an edge (edge rows carry picture content 64–150 luma at every p; the “grey band” the
  reviewer first saw is the motion-blur smear, which is the intended look), glitch-bursts fire at their
  seeded times (the fixed p-grid can miss 0.17–0.2 s burst windows — a separate sheet at burst times
  shows them clearly), Devanagari renders connected (label-hindi, stamp-hindi) with bundled fonts.
  The 9 metric flags that remain are by design: strobe sampling alias, continuous rumble, whip
  blur-decay tail, and a static effect measured against a “must move” rule.
- **Exports** (test-output/exports/): composite MP4 via render.mjs (h264, yuv420p, 640×360, 58 frames
  at 24 fps = frame-exact, **0 audio streams**); screen/green/blue/matte/source MP4s decoded and
  pixel-checked — green is (0,251–254,0) i.e. chroma green after the yuv round-trip (pure #00FF00 does
  not survive 4:2:0 exactly; it keys as green), matte is white-look/black-empty, screen is light
  elements on black, source is untouched. Burn peak frame ≈ 250 luma (white-out) with sepia before.
  **Transparent WebM**: the in-browser exporter (WebCodecs VP9, `alpha:'keep'`) was exported and
  decoded **in a browser**: measured alpha 0–255 with 53 % transparent at mid-burst and 93.5 %
  transparent at the tail — real transparency, end to end. `.cube` LUT from the Export dialog:
  35942 lines, `LUT_3D_SIZE 33`, correct header. `render.mjs --still` PNG verified.
- **Python helper**: `filmlook_fx.py` ran end to end for an MP4 burn and an alpha WebM (h264 / vp9,
  silent, exit-code checked).
- **UI in a real browser** (agent-browser, built HTML served by `serve.mjs`): layouts verified at
  **1920×870, 1366×680 and 390×844** — play button visible and unobstructed at all three, stage never
  covers the transport (size-container CSS), no horizontal scroll at 390 px, four bottom tabs on phone,
  family chips filter, preset apply/add, template load (incl. the Hindi one), export dialog (7 modes),
  .cube button, timeline bar drag (move +0.3..+4.45 s) and grip resize (3.5→1.9 s), live playback shows
  the look (warm leak verified on stage mid-play), console clean.

## What is NOT done or not tested (honest)
- **Not tried on a real phone** — no device in the sandbox. The 390×844 layout was verified in
  headless Chrome only.
- **render.mjs transparent WebM was not verifiable in this sandbox**: Debian’s ffmpeg build here cannot
  encode or decode VP9 alpha (files come out yuv420p). The in-browser WebCodecs path (the studio’s own
  Export button) is the verified route for transparent overlays. render.mjs follows exactly the
  recipe the user documented for their Remotion ffmpeg (`libvpx-vp9 yuva420p -auto-alt-ref 0`, PNG
  pipe) plus `-vf format=yuva420p`; on the user’s PC it should behave as in their earlier studios —
  **check once on the PC** with a quick `node render.mjs test.json out.webm --mode alpha`.
- **Chrome/Edge only for export** (WebCodecs); the MediaRecorder fallback produces WebM without alpha
  — in browsers without WebCodecs, use the green/blue element instead.
- censor-blur-plate is real but hard to *see* on the demo scenes (it measurably cuts local detail
  27–44 %); on real footage with texture it reads clearly.
- cctv presets always show the blinking REC dot (part of the CCTV look; there is no “no REC” toggle).
- The green/blue backgrounds survive the yuv round-trip as (0,251–254,0)/(0,0,254) — visually and for
  chroma keying identical to #00FF00/#0000FF; exact 255 values do not survive 4:2:0 encoding.

## Font licences
All bundled fonts are SIL Open Font License 1.1 (Google Fonts): Instrument Sans, JetBrains Mono,
Special Elite, Oswald, Mukta (TypeTogether), Noto Sans Devanagari (Google). Mediabunny is MPL-2.0
(`vendor/MEDIABUNNY-LICENSE.txt`).

## Saved on the PC by Claude (2026-11-07)
`production/pipeline/filmlook_fx.py` looked for the studio one folder too high once moved into `production/pipeline/`;
it now points at `studios/film-look-studio/`. The user asked to skip a full Windows re-test ("all looks good").
