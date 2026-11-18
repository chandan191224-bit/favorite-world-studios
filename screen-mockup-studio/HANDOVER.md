# HANDOVER — Screen Mockup Studio Pro

**What this is:** the "screen elements" studio for Favorite World (Hindi documentary-explainer
channel), continuing the half-finished folder `studios/screen-mockup-studio/` that Claude started on the
user's PC. Everything below was finished, built, tested and verified in the Z.ai sandbox.

## What I built (this session)
Continuing from the uploaded state (`src/core/util.js`, `space.js`, `devices.js`, `engine.js`,
`src/content/registry.js`, `screens.js`, `ops.js`, vendor licenses):

- `src/content/calls.js` — new content: video-call grid (generic meeting app; speaking-tile pulse,
  mic-off icons, meeting timer, spotlight/grid layouts, 4 media slots, deterministic).
- `src/presets.js` — the preset library: 36 named looks in 7 families + `SM.presetShots()`
  (engine.defaultProject depends on it) + the `"preset"` shorthand for pipeline projects.
- `src/index.html`, `src/styles.css` — the studio shell (dark/amber, house-reference look) with all
  the hard-won layout fixes: `.stage-wrap` is a size container (`container-type: size`) and
  `#stage { max-width: 100cqw; max-height: 100cqh }` (desktop only, reset under 900 px);
  `button, input, select, textarea { color: inherit; font: inherit }`; no page-level horizontal
  scroll at 390 px.
- `src/ui/app.js` — the whole UI: preset library with live hover thumbnails + family chips + search,
  stage + transport (play loop clamped to 0..0.1 s, never backwards), timeline (shots + transition
  chips, thumbnails), auto-built inspector (device / content / camera / background / focus / shot /
  transition / project), media manager (drag-drop, video seek sync, localStorage autosave with
  budget, `.sms.json` save/open), export dialog, templates, `window.SMS` pipeline API
  (`load`, `project`, `duration`, `frame`, `sheet`), preset shorthand expansion in `load()`.
- `src/ui/templates.js` — 8 ready projects.
- `src/core/export.js` — exporter: 7 modes (composite, green #00FF00, blue #0000FF, alpha
  transparent WebM, matte, screenkey, screenmatte) via WebCodecs + Mediabunny, MediaRecorder
  fallback. Always silent (user rule: no SFX ever).
- `build.mjs` — inlines `src/**`, `vendor/mediabunny.min.js` and the OFL fonts as base64
  `@font-face` (Inter/JetBrains Mono/Noto Serif latin + Mukta devanagari, weights 400/600/700/800)
  into `Screen Mockup Studio Pro.html` (2.8 MB, works offline by double-click).
- `vendor/` — filled in from npm: `mediabunny.min.js` (dist bundle, MPL-2.0) and 16 woff2 fonts
  (@fontsource, OFL). Licenses were already in the zip.
- `render.mjs` — headless Chrome (CDP, no puppeteer dependency) + ffmpeg. Uses Remotion's
  chrome-headless-shell / ffmpeg next to the studio folder when present (the user's PC), falls back
  to puppeteer/playwright caches, installed Chrome/Edge, PATH ffmpeg. PNG pipe
  (`-f image2pipe -c:v png -i -`) → `libx264 -pix_fmt yuv420p` (MP4) or
  `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0` (alpha WebM). Exit codes checked, fails loudly.
- `qa-sheet.mjs`, `serve.mjs` (port **7405**), `Start Screen Mockup Studio.cmd`,
  `Open On Phone.cmd`.
- `production/SCREEN_MOCKUP_STUDIO.md`, `production/pipeline/screen_fx.py` (Windows cp1252 fix at
  the top, preset shorthand, media slots, loud failures), `README.md`, this file.
- Bug fix in the inherited engine: device decals (CRT bezel ring etc.) were drawn AFTER the screen
  picture, so every CRT preset showed a black screen — decals now draw first. Also fixed the blank
  Easing dropdown in the UI and preset timings (outExpo settling by p≈0.5 → inOut windows ending
  ~p≈0.92; notification stack spread over the shot; float/push amounts raised).

## What I tested and how (no claims without looking)
- **Build:** `node build.mjs` — 2.8 MB single HTML; `node --check` on every source file.
- **Browser (Chrome, agent-browser):** no console errors on load; play/pause/scrub/loop; preset
  apply + "+" add; templates load (all 8) with no errors; export dialog (7 modes / ranges / sizes);
  autosave (localStorage); drag-drop media path wired.
- **Layout:** 1920×870 (play button clickable, stage never covers the transport), 1366×680, and
  390×844 phone (stage on top, 4 bottom tabs, `scrollWidth == clientWidth` — no horizontal scroll),
  checked with screenshots + VLM reads.
- **Export modes at pixel level** (in-page canvas reads): green exactly [0,255,0], blue [0,0,255],
  alpha [0,0,0,0] corners, matte/screenkey/screenmatte black/white as specified.
- **Browser export:** WebCodecs+Mediabunny produced a real MP4 (`ftypisom`) and a transparent WebM —
  verified by drawing the blob back onto a canvas in Chrome (66% transparent, device opaque).
- **Pipeline:** `render.mjs` composite MP4 (with an H.264 test clip attached through a
  `media.<id>.path` — video seeking works end-to-end), green MP4, alpha WebM, `--still` JPG; all
  decode with ffmpeg exit 0. **Important:** ffmpeg's own decoder cannot re-read the alpha channel of
  a VP9+alpha WebM (it shows opaque black) — that is an ffmpeg limitation; the file itself is
  correct, proven by decoding it in Chrome (83.5% fully transparent pixels + soft shadow
  semi-transparency). Premiere/DaVinci/browsers read it natively; in CapCut prefer green mode.
- **`screen_fx.py`:** `--list` (36 presets), and a full render `--preset crt-photo --media photo.png
  --mode green` → corner exactly #00FF00 and the user photo visible on the CRT screen.
- **QA contact sheets:** every preset at p = 0.25/0.45/0.65/0.85 in
  `studios/screen-mockup-studio/test-output/presets-a.jpg` / `presets-b.jpg` (made with `qa-sheet.mjs`),
  inspected with a vision model; after the fixes the CRT rows show content, no broken geometry, no
  pink error areas, no clipped text, animations progress across the columns.
- **Hindi at high resolution:** 1080p stills of the news frame (headline सीमा पर बड़ी बातचीत,
  ticker), lock-screen notifications (₹2,40,000, conjuncts) and the terminal (अभिलेख
  सफलतापूर्वक खोला गया।) — Devanagari conjuncts/matras, the rupee sign and danda all render;
  no tofu.

## Honest "not done / not tested" list
- **Not tested on a real phone** — the 390 px layout was verified in a desktop browser at phone
  size. `Open On Phone.cmd` is untested on the user's Wi-Fi.
- **Not tested on the user's PC paths** — the Remotion chrome/ffmpeg fallbacks are written to spec
  (`node_modules/.remotion/…`, `node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`) but
  could not be exercised in the sandbox; every fallback was tested with the sandbox equivalents
  (puppeteer cache + system ffmpeg).
- **ffmpeg's decoder** cannot re-read VP9 alpha (see above) — so don't QA alpha WebM by
  re-decoding with ffmpeg; use a browser or an NLE.
- 4K export works but is slow (Canvas2D); 1080p is the sweet spot. Not benchmarked on the user's PC.
- The MediaRecorder fallback (very old browsers) keeps no alpha and was not exercised — Chrome/Edge
  on PC and phone always use WebCodecs here.
- `cctvwall`'s alert timing (p ≥ 0.4) and the static-CCTV look are intentional; if the user wants
  the alert later, it is a one-line change in `src/content/ops.js`.
- The `.cmd` launchers are CRLF Windows batch files; they were written but only run on Windows.
