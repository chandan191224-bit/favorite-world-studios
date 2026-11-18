# HANDOVER — Atmosphere & VFX Elements Studio Pro (studios/vfx-elements-studio/)

Built from scratch per `studios/vfx-elements-studio/BRIEF.md`, in the house style of the reference studio
(Kinetic Title Studio Pro / Photo Parallax Studio Pro: dark UI, amber accent, same layout, same
pipeline). Built by Z.ai (GLM), 2026-11-08.

## What was built

- **55 presets in 8 families**, all procedural, seeded, deterministic (same seed = byte-identical render):
  - Smoke & fog (7): thin column, thick black war smoke, white chimney, drifting ground fog (loops),
    rolling fog bank, impact puff, battlefield smoke wall
  - Fire (8): torch, campfire, building fire, line of fire, embers, spark bursts, burning edge (eats
    the frame inward), heat shimmer (displaces the real footage)
  - Explosions & impacts (6): muzzle flash, distant artillery, fireball (flash + fireball + shockwave
    ring + ballistic debris + lingering smoke), dust impact, bullet ground hits, flare/rocket
  - Weather (10): light/heavy/angled rain, rain with splashes, gentle snow, blizzard, lightning
    (branching bolt, pulse-train restrikes, sky flash, impact glow), hail, dust storm, wind-blown leaves
  - Sky & light (7): time-lapse clouds, storm clouds, god rays, sun glare, cloud shadows, night stars,
    aurora
  - Particles & debris (7): dust motes, ash, debris, flying papers with real Hindi text, bokeh, petals,
    crowd camera flashes
  - Water (4): ripples, rain on window (mist + droplets + runners that refract the footage), caustics,
    splash crown
  - Combo looks (6): war-torn city, partition night, storm arrives, dust bowl, winter front, burning archive
- **Editor** (one self-contained offline HTML, `node build.mjs` inlines src + Mediabunny + 4 OFL fonts):
  library with family chips + live hover thumbnails, 16:9 stage with drag-drop media, transport
  (play/scrub/loop/guides/quality Full-Half-Quarter), timeline with shot cards + transition chips
  (cut / cross-fade / dip-to-black) + **draggable layer timing bars with playhead**, auto-built inspector
  (params grouped Look/Motion/Area + timing + seed), 12 templates (Hindi-first), Save/Open .vfx.json,
  localStorage autosave with size budget, **undo/redo (Ctrl+Z / Ctrl+Shift+Z)**, phone layout with
  bottom tabs.
- **Pipeline**: `window.VFX` hooks (`load` with `{"shots":[{"preset","media","fields"}]}` shorthand,
  `project`, `duration`, `frame`, `sheet`), `render.mjs` (headless Chrome + ffmpeg, frame-exact, silent,
  PNG frames → libx264 yuv420p / libvpx-vp9 yuva420p), `qa-sheet.mjs`, `serve.mjs` (port 7409),
  `Start VFX Studio.cmd` / `Open On Phone.cmd` (CRLF), `fetch-fonts.mjs` (re-downloads + subsets fonts).
- **Hand-over**: `README.md` (studio), `production/VFX_ELEMENTS_STUDIO.md` (usage rules),
  `production/pipeline/vfx_fx.py` (Python CLI helper).

## Acceptance tests — what passed and how (all outputs from this build session)

1. **Python helper really uses the user's media — PASS.**
   `python production/pipeline/vfx_fx.py --preset pa-paper-fly --photo photo.jpg --text "हिंदी परीक्षण" --out t.mp4 --dur 4`
   → rendered; frames extracted with ffmpeg and reviewed by the vision model: *"background is a
   SMPTE test pattern with TEST PHOTO text" (the real photo), "multiple white paper documents flying",
   "Devanagari rendered correctly — no dotted circles, split matras"*. Also `--media clip.mp4` with
   `we-rain-heavy` → test video visible + rain over it. (First run had the classic bug — inline shot
   media objects were registered but never turned into Image/Video elements; fixed in
   `engine.normMediaObj`, re-verified.) `render.mjs` resolves `path` fields in **both** the
   project-level media table and per-shot `media`/`bg.media` objects.

2. **MP4 colour format — PASS.** `ffprobe` on pipeline output: `codec_name=h264, pix_fmt=yuv420p`
   (never yuvj420p/pc range — PNG frames are piped, no JPEG range shift).

3. **No audio stream — PASS.** `ffprobe -select_streams a` on MP4 + WebM outputs: none.

4. **Transparent WebM — PASS.** `--mode alpha` → VP9+alpha WebM; decoded in real Chrome
   (Chrome for Testing, canvas pixel read): corners `(0,0,0,0)`, edges alpha 0, and 26,000+ px of
   real non-zero alpha inside (embers), max alpha 255. (ffmpeg's vp9 decoder can't see alpha —
   checked in the browser as required.)

5. **Green — PASS.** `--mode green` decoded in Chrome: centre `(0,255,0)`, corners `(0,255,2)`
   (H.264 rounding — within the allowed ≈(0,250+,0)).

6. **Editor layout — PASS** (`node tools/studio-check.mjs`):
   ```
   1920x870  inView:true, playClickable:true, hscroll:false, lagMs:0  t0→t1 advances  console errors: none
   1366x680  inView:true, playClickable:true, hscroll:false, lagMs:0  t0→t1 advances  console errors: none
   390x844   inView:true, playClickable:true, hscroll:false, lagMs:0  t0→t1 advances  console errors: none
   ```
   Stage at 1366×680 is 565px of the 736px centre column (77% ≥ 50%); layer list scrolls inside a
   capped box. Phone screenshot reviewed: stage on top, transport, one panel at a time, Library tab
   active with amber underline.

7. **Helper paths — PASS.** Lives in `production/pipeline/vfx_fx.py`; starts with
   `for s in (sys.stdout, sys.stderr): s.reconfigure(encoding="utf-8", errors="replace")`;
   finds the studio as `os.path.join(HERE, "..", "..", "vfx-elements-studio")`; prints
   `OUTPUT: <path>`; exits 1 on missing photo / unknown preset (verified).

8. **Every preset contact-sheet review — PASS.** All 8 family sheets at p=0.25/0.45/0.65/0.85 in
   `test-output/qa-*.jpg`, reviewed round by round with the vision model + pixel-diff measurements;
   plus full-size 1920×1080 stills per family reviewed. Bugs found and fixed during review:
   rain streak math (invisible 0.07px streaks), lightning never visible at sample times (pulse-train
   redesign), muzzle flash polygonal + missing smoke, fireball sprite-box clipping seam, smoke column
   hard bottom edge, artillery rectangular glow shaft, ground-fog band inverted, sparks burst timing,
   god-ray clip-art wedges, cartoon flame silhouettes, rain-window pane not reading, dust impact as a
   box. Final state: 55/55 pass.

9. **Fresh-unzip test — PASS.** Studio folder copied to an empty dir without the built HTML →
   `node build.mjs` (1314 KB) → `node render.mjs` → 6.00s h264/yuv420p MP4, silent.

10. **Final deliverable** — this zip: `studios/vfx-elements-studio/` (with the built
    `Atmosphere & VFX Elements Studio Pro.html`), `production/VFX_ELEMENTS_STUDIO.md`,
    `production/pipeline/vfx_fx.py`, `HANDOVER.md`.

## Also verified

- Determinism: the same project loaded twice renders byte-identical PNG frames (hash compare);
  no `Math.random`/`Date` anywhere in effects (only `uid()` for DOM ids, as in the reference).
- All 12 templates load with zero console errors; undo/redo, transition chips, layer-bar dragging,
  scrub, guides, in-browser export (WebCodecs → green MP4 640×360) all exercised headless without errors.
- Fonts bundled as base64 woff2 subsets (Mukta 500/800, Kalam, Khand 600, Bebas Neue — all OFL),
  Devanagari shaping intact (canvas draws shaped text; verified on the flying papers).
- Autosave restores on reload; large media re-links by name.

## Not tested / known limits (be honest)

- **Not tried on a real phone** — the 390×844 layout was verified in emulated Chrome (screenshots in
  `test-output/vfx2-390x844.jpg`).
- **The editor was driven headless**, not clicked through by hand; the in-browser Export dialog was
  exercised programmatically (WebCodecs path); the MediaRecorder fallback was never triggered.
- **fi-heat (heat shimmer) and wa-rain-window read best over real, detailed footage** — the built-in
  demo backdrops are soft (drawn at 480px), so the blur/refraction parts of those two effects are
  subtle on them. Verified strong over a high-detail test photo.
- Contact sheets were judged by a vision model (GLM) at 480×270 per frame + pixel-diff measurements,
  with several rounds of fixes; a human editor may still want to tune seeds/amounts per shot — that's
  what the sliders are for.
- WebCodecs alpha export in the browser dialog writes WebM/VP9 (works in Premiere/DaVinci/browsers);
  CapCut users should prefer green screen (as the dialog says).
- The reference's Remotion chrome/ffmpeg paths on Windows are searched exactly as in
  `_house-reference/render.mjs` (plus Edge), but that specific machine layout was not available here —
  tested with puppeteer-cache Chrome + system ffmpeg on Linux.

## Checked on Windows by Claude (2026-11-08)
- **Fixed: render.mjs could not start on Windows.** The Chrome search list also contained the Remotion
  `ffmpeg.exe` paths (copy-paste slip), so it launched ffmpeg as "chrome" and every helper render failed
  ("chrome connect: fetch failed"). Removed those lines; Chrome is now Remotion's chrome-headless-shell.
- Rebuilt the HTML; studio-check at 1920×870 / 1366×680 / 390×844: play visible and clickable, Play advances,
  no horizontal scroll, lag ≤ 2 ms, no console errors (stage 565 px wide at 1366×680).
- `vfx_fx.py` on a real image: `cb-war-city` (photo + smoke/embers/flash) and `pa-paper-fly` with
  "हिंदी परीक्षण" papers over the photo (Hindi renders correctly) as MP4 yuv420p, and `fi-embers` as
  transparent WebM (alpha checked: background 0, embers visible). All silent.
- `qa-sheet.mjs` works on Windows (`node qa-sheet.mjs out.jpg --fam Fire`).
- Looks to watch: the small fire presets (torch, campfire, line of fire) have teardrop flames that read a bit
  cartoon-like, and `fi-burn-edge` shows a stray strip of flames along the top edge. Prefer smoke, embers,
  sparks, weather, light and combo presets for real footage; use the fire presets small or soft.
