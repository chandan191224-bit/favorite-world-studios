# HANDOVER — Collage & Split Studio Pro (Z.ai build, finished in the sandbox)

**Status: complete and verified.** The half-finished studio from the previous turn (`src/core/*`, `src/fx/registry.js`,
`src/fx/splits.js`, `vendor` licence) was kept as-is (plus timing tweaks to five split presets, listed below); every
missing piece was built, and the whole thing was verified like a video editor — contact sheets actually looked at,
exports actually decoded and pixel-checked.

## What was built this turn
- `research/catalogue.md` + `research/notes-vlm.md` — the research pass (image web search + vision-model review of 11
  reference images) that specs every family. Raw search hits in `research/image-search-results.json`.
- **9 new fx families** (`src/fx/`): `compare.js` (duel / side panel / angled wipe / cards), `grid.js` (build + rearrange
  + masonry), `pip.js` (full photo, corner PiPs, grow-to-full, side panels), `wall.js` (zoom-in / pan / shuffle, cached
  wall + own camera, exact cover math), `scrapbook.js` (the Johnny-Harris B&W-on-kraft collage + chaos-to-order),
  `sticker.js` (pop-ins / lineup / fan-out), `polaroid.js` (deal+fan / slam with self-writing caption / fan spread),
  `film.js` (film strip incl. vertical + 35 mm contact sheet), `mosaic.js` (build / wave / reveal). **52 presets**
  across 10 families incl. the pre-existing 14 split/compare ones.
- `src/core/export.js` — silent WebCodecs export via the bundled Mediabunny (MP4 H.264, green/blue element, transparent
  WebM VP9+alpha, B/W matte) with MediaRecorder fallback.
- UI: `src/index.html`, `src/styles.css`, `src/ui/app.js`, `src/ui/templates.js` — effects library with live hover
  thumbnails + family chips, stage + transport, timeline with scene thumbs, auto-built inspector with per-slot media /
  label / focus / video controls, media tray, drag-drop (leftover photos auto-group into a fitting layout), lasso/auto/
  oval cut-out editor, 8 templates (incl. a Shorts 1080×1920 one), Save/Open `.collage.json` + localStorage autosave,
  phone layout (< 900 px: stage on top, bottom tabs, no horizontal scroll), `window.CSAPI` pipeline hook.
- `build.mjs` — inlines everything + Mediabunny + 15 bundled OFL woff2 fonts (deduped from 20, ~700 KB) into
  `Collage & Split Studio Pro.html` (2.3 MB, opens by double-click, fully offline).
- Pipeline: `render.mjs` (headless Chrome via Remotion → Playwright → system fallbacks; PNG pipe → libx264 MP4 /
  libvpx-vp9 yuva420p transparent WebM; ffmpeg exit code checked; `--list-presets`, `--preset/--media` one-liners),
  `qa-sheet.mjs`, `serve.mjs` (port 7406), `Start Collage Studio.cmd`, `Open On Phone.cmd`, `presets.json` manifest.
- Hand-over files: `studios/collage-split-studio/README.md`, `production/COLLAGE_SPLIT_STUDIO.md`,
  `production/pipeline/collage_fx.py` (utf-8 reconfigured first line, as required on Windows).
- QA evidence: `studios/collage-split-studio/test-output/qa-01..04.jpg` (all 52 presets × p = 0.25/0.45/0.65/0.85).

## What I changed in the pre-existing files (so nothing is a surprise)
- `src/fx/splits.js`: **preset parameter tweaks only** — `split-2-slide`, `split-2-rows`, `split-4-grid` got
  longer/stronger entrances + more visible slow zoom; `split-push-3` / `split-push-2v` spread their pushes out. No
  layout code was touched.
- `src/fx/registry.js`, `src/core/*`: untouched.

## How it was tested (and the results)
- **Contact-sheet QA (all 52 presets at p = 0.25/0.45/0.65/0.85):** reviewed with a vision model, three rounds + a
  final sign-off — **"ALL 52 PRESETS PASS"**. Real bugs found and fixed along the way: `compare-cards` blank
  (missing `p` destructure), masonry grid gaps (rewritten as a band packer), film-strip frames poking past the band
  ends (now clipped), contact-sheet frames overflowing the strip width, pip label clipped at the top edge, mosaic
  build/reveal finishing too early, end-zooms now complete by p ≈ 0.88–0.95, polaroid fan starting half-on-screen,
  QA-sheet header colliding with preset labels (moved to the bottom of each cell).
- **Pixel-level export checks** (headless render → raw bytes): green element = **exactly #00FF00** on the canvas
  (36/36 sampled pixels); alpha WebM = really transparent (corner alpha 0, photos opaque — verified by decoding in
  Chrome's own video pipeline; note the sandbox ffmpeg build does not surface VP9 BlockAdditional alpha, but Chrome —
  what CapCut-style tools use — does); matte = pure black + white silhouettes; all end-state zooms (pip-grow, wall,
  filmstrip, contact-sheet) fill the frame with zero background rows.
- **Pipeline end-to-end:** `render.mjs` → MP4 (ffprobe: h264, 1280×720, 120 frames, no audio track), green MP4,
  `--list-presets`; `collage_fx.py` with two real photos + Hindi labels → correct MP4 with readable
  गाँव/शहर labels (vision-verified).
- **In-browser WebCodecs export:** composite/green/alpha/matte all produce valid files (67 KB / 66 KB / 59 KB /
  3 KB test clips).
- **UI in a real browser (1920×870, 1366×680, 390×844):** no console errors; play button clickable at all three sizes;
  stage never covers the transport; no horizontal scroll at 390 px; phone tabs work; preset click applies to the
  scene; export dialog lists 5 modes/sizes; toast repositioned so it never covers the timeline (desktop) or content
  (phone).
- **Templates:** all 8 load and render headless without errors.
- **Perf:** library thumbnails render via a chunked job queue (≈10 ms slices); heavy fields (wall, paper, cut-outs,
  masonry plans) cached with keys covering everything that changes the result.

## What is NOT done / not tested (be honest)
- **Not tried on a real phone** — the phone layout was verified at 390×844 in a desktop browser emulation only.
- The transparent-WebM **MediaRecorder fallback** path was not exercised (WebCodecs worked everywhere it was tried);
  it exists for old browsers and produces WebM at whatever quality the browser picks.
- The **4K (3840×2160) export size** was not rendered end-to-end (pipeline-verified at 720p/1080p-class sizes; 4K uses
  the same code path, just slower).
- Cut-out **auto background removal** works on plain/similar backgrounds (flood fill from the borders) — it is not a
  deep-matting tool; lasso is the reliable path for busy backgrounds. Cut-outs are photo-only (videos draw their full
  frame), as in `src/core/media.js`.
- The `--still` mode of `render.mjs` was implemented but only smoke-tested once (PNG still, not part of the main flow).
- Sandbox ffmpeg (7.1.5) decoded the green MP4's key colour as (0,254,0) after the yuv420p/H.264 round-trip — that is
  normal chroma rounding for **any** H.264 green-screen stock; the canvas itself is exact #00FF00 and the value is
  within any chroma-key tolerance.
- `presets.json` was generated by `render.mjs --list-presets` — if presets are ever added, regenerate it.
- On the PC, `render.mjs` prefers Remotion's chrome-headless-shell + ffmpeg (repo root `node_modules/`), which were
  **not present in this sandbox** — those paths were written to match the previous studios' working setup but could
  only be tested here with the Playwright-chromium/system-ffmpeg fallbacks. If Remotion's paths are missing it falls
  back the same way automatically.

## Deviations from the brief
- The fx families were written directly (by me) rather than by parallel subagents/Codex — the sandbox's agent tasks
  were unavailable this session; the briefs I wrote for them are kept in `research/briefs/` for the record.
- One environment quirk handled: `chrome-headless-shell` hangs on `document.fonts.ready` when launched with
  `--window-size=…` in this sandbox — the flag was dropped from `render.mjs`/`qa-sheet.mjs` (it is not needed; the
  canvas is a fixed size).

**Verdict:** ready to use. Open `studios/collage-split-studio/Collage & Split Studio Pro.html` (or run
`Start Collage Studio.cmd`) and render with `production/pipeline/collage_fx.py`.

## Checked on Windows by Claude (2026-11-07)
Built; editor checked headless at 1920×870, 1366×680, 390×844 (play clickable, Play advances, no horizontal scroll,
no console errors). `collage_fx.py --preset vs-compare` with two real images and Hindi labels भारत/चीन: MP4 and
transparent WebM render correctly and silently (≈35–50 s each at 720p). The helper keeps an editable `.collage.json`
next to the clip on purpose. No fixes were needed.
