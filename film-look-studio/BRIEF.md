# Brief for Z.ai — continue building **Film Look Studio Pro** (folder `film-look-studio/`)

You are continuing a half-finished job. Claude (another assistant) started it on the user's PC and ran out of time.
The uploaded zip has everything written so far plus a reference studio. **Please continue and finish it in your
sandbox**, then give me a downloadable zip of the complete `film-look-studio/` folder (same paths) plus the extra files listed in
"Hand-over files". Work through it in order; don't stop to ask unless truly blocked; if your turn runs out, end with a
precise "what's done / what's left" list so the next turn can continue.

## Who this is for
A Hindi documentary-explainer YouTube channel, "Favorite World". The user already has studios built in this exact style
(Paper Transition Studio Pro, Map Animation Studio, Timeline Animation Studio Pro, Detective Board Studio Pro). The
`_house-reference/` folder in the zip has the Paper Transition Studio's build/serve/render/qa scripts, index.html,
styles, UI app, engine, export and registry — **copy that architecture, UI look and file layout**.

## What this studio is
Overlay/texture/look elements documentary editors put on top of footage: light leaks, lens flares, film burns; film
grain, dust & scratches, 8mm/16mm gate and frame jitter, archival/old-photo looks (sepia, faded, halftone); VHS/CRT/
glitch/RGB split, camera shake & handheld drift, zoom-punch, whip-pan blur; vignettes, letterbox, colour-grade looks
(teal-orange, desaturated war documentary, warm history); flash/flicker cuts, scan lines, "classified/redacted" overlays.
All procedural and seeded, layerable over a dropped-in video or image. Export as an overlay (screen-blend on black, or
transparent WebM) or as a composited MP4. Also export a grade as a .cube LUT.

## What's already done (in the zip)
- `research/catalogue-light-film.md`: research catalogue (feature spec for light & film families; extend it from your own
  knowledge for the other families listed above).
- `src/core/util.js`, `engine.js`, `grade.js` (colour grading + LUT), `sources.js` (media sources).
- `src/fx/registry.js` (4 kinds: overlay / process / grade / camera — read its header comment, that is the contract),
  `src/fx/light.js`, `src/fx/docs.js` (classified & docs family).
- Still to do: families film & damage, archival, VHS/CRT/glitch, camera moves, frame & grade presets; UI, index.html,
  styles, build.mjs, export, render/qa/serve, launchers, helper, docs. `vendor/mediabunny.min.js` is on the PC (npm
  `mediabunny`), not uploaded.

## Rules (the user's — every one applies)
- Free tools only: no paid APIs, no accounts, no CDN at runtime. Works fully **offline**.
- **One self-contained HTML file** `Film Look Studio Pro.html` built by `node build.mjs` that inlines `src/**` + vendor libs + fonts
  (like `_house-reference/build.mjs`). Opens by double-click in Chrome/Edge on PC and on a phone.
- **Deterministic**: everything seeded; no `Math.random`/`Date` inside effects; preview == export frame-for-frame.
  Canvas 2D (WebGL only if truly needed); no `ctx.filter` (Safari); cache heavy fields at low resolution.
- **UI**: dark, amber accent, like the reference: effects/preset library with live hover thumbnails + family chips,
  preview stage + transport, timeline, inspector auto-built from params, templates, Save/Open JSON + localStorage
  autosave, drag-drop media. **Phone layout < 900 px**: stage on top, bottom tabs (Library / Timeline / Edit / Export),
  no horizontal scroll.
- **Export** via WebCodecs + Mediabunny (`vendor/mediabunny.min.js`, npm `mediabunny` dist/bundles/mediabunny.min.cjs):
  MP4 H.264, green-screen #00FF00 / blue-screen element, transparent WebM (VP9 alpha), black/white matte;
  MediaRecorder fallback. 720p/1080p/4K/Shorts 1080x1920/square.
- **No sound effects at all** (the user never uses SFX in editing). All exports silent.
- Never write "AI" or "AI-generated" in any default text that appears in a video.
- Generic names only — never imitate a real brand, logo, channel or real person.
- Hindi (Devanagari) text must render correctly anywhere text appears (bundled free OFL fonts, e.g. Mukta / Noto / Tiro).
- Pipeline hooks: a `window.<API>` object (`load(project)`, `frame(t, mode)`, `sheet(...)`), `render.mjs` (headless
  Chrome via Puppeteer + ffmpeg, frame-exact, silent), `qa-sheet.mjs` (contact sheets to JPG), `serve.mjs [--lan]` on port
  **7404**, `Start Film Look Studio.cmd`, `Open On Phone.cmd`.

## Lessons from the first three studios you finished (please avoid these — they were real bugs)
- **Write the hand-over files EARLY** (README.md, production doc, the Python helper, HANDOVER.md) right after the
  studio first works, then keep updating them. Two earlier chats were cut off before writing them.
- The user's PC is **Windows**. The Python helper must start with
  `for s in (sys.stdout, sys.stderr): s.reconfigure(encoding="utf-8", errors="replace")` (Hindi crashed cp1252).
- `render.mjs` on the PC uses **Remotion's ffmpeg** (`node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`, look
  inside the `node_modules/@remotion/` folder) and **Remotion's headless Chrome**
  (`node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe`), both
  relative to the repo root = the studio folder's parent; fall back to installed Chrome/Edge. That ffmpeg has **no
  ffv1, no prores, no rawvideo muxer, no ffprobe**. Use: PNG frames piped (`-f image2pipe -c:v png -i -`) → `libx264
  -pix_fmt yuv420p` for MP4, and → `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0` for transparent WebM. Check the ffmpeg
  exit code and fail loudly; never fail silently.
- Editor layout at **1920×870** (the user's Edge window): the stage must not cover the play bar. Make `.stage-wrap` a
  size container (`container-type: size; overflow: hidden`) and limit the stage with `max-width: 100cqw; max-height:
  100cqh` (desktop only; reset in the phone media query). Verify the play button is clickable at 1920×870, 1366×680
  and 390×844.
- `button, input, select, textarea { color: inherit; font: inherit; }` — textareas were unreadable dark-on-dark.
- The play loop must never step backwards: clamp the per-frame time step to 0..0.1 s.
- Nothing heavy on the page thread at start-up or for library thumbnails (one studio froze for a minute). Cache keys
  must include everything that changes the result, or a first rough frame gets stuck in the cache.
- Pans/moves must never expose an edge of the image (compute the cover zoom exactly).
- Small counts as whole numbers ("362", not "362.0").

## Verify like a video editor (no claims without looking)
Render contact sheets of **every preset** at p = 0.25 / 0.45 / 0.65 / 0.85 and actually look at them. Fix timing
(animations must finish near p≈0.95, not 0.7), artefacts, wrong directions, clipped Hindi text. Check templates load
with no console errors, exports decode (green really #00FF00, alpha really transparent), phone width (390 px) has no
horizontal scroll. Put the contact sheets in `film-look-studio/test-output/`.

## Hand-over files (also in your final zip)
- `film-look-studio/README.md` — open on PC / phone, how to use, pipeline commands.
- `production/FILM_LOOK_STUDIO.md` — usage rules for the video pipeline (when to use it, how).
- `production/pipeline/filmlook_fx.py` — Python CLI that calls `render.mjs` to make a silent, ready-to-place clip
  (MP4 or transparent WebM) from the inputs + a preset name.
- `HANDOVER.md` — what you built, what you tested and how, what is NOT done or not tested. Be honest.

## The original studio-building method (for reference)
# make-studio — turn a reference into a working studio

The user's standard (2026-10-30): *"next time I just give a tool name or any video reference of any tool or anything, then you
will make this type of studios from where I can use these tools easily"*. Gold-standard examples in the repo:
`paper-transition-studio/` (built from a 62-video playlist) and the user's Paper Studio Pro. Everything stays in
`C:\Users\chand\Desktop\clausd`; free tools only; no paid APIs.

## 1. Study the reference (never build from guesses)
- **YouTube video/playlist:** `python -m pip install --user -q yt-dlp`, list with `python -m yt_dlp --flat-playlist --print "%(id)s | %(duration)s | %(title)s" URL`,
  download 360p video-only to the scratchpad (`-f "134/135/243/18/bv*[height<=480]"`), make timestamped contact sheets with ffmpeg
  (`imageio_ffmpeg.get_ffmpeg_exe()`: `fps=4 (short) / 2 (long),scale=200:-2,tile=6x6`). Videos yt-dlp can't fetch: play them in the
  browser pane and grab frames to a canvas. Report how many were watchable vs private/removed.
- **Tool name / website:** read its docs/site/demo videos; list every feature and look.
- Split the sheets across 2–3 helpers (subagents or Codex) to **catalogue every distinct effect**: name, timing per phase, geometry,
  materials, edges/shadows, easing, what is revealed. Skip amateur/irrelevant parts (the user asked for this). Merge into one master list
  grouped into families with counts — that list is the feature spec.

## 2. Architecture (copy the paper studio's pattern)
- **One self-contained offline HTML file** that runs in Chrome/Edge on PC and on a phone (no install, no server needed), built from
  modular sources: `src/core/*` (util/noise/easing, materials, sources, draw primitives, engine/timeline, audio, export),
  `src/fx/*.js` (one registry: `register({id,name,family,params,draw(ctx,p,A,B,P,env)})` + named `preset(...)` looks),
  `src/ui/*` (app + templates), `build.mjs` inlines everything (vendor libs copied locally, e.g. Mediabunny from
  `map-animation-studio/node_modules/mediabunny`) into `<Name> Pro.html`.
- **Procedural + deterministic**: everything seeded (no Math.random/Date in effects) so preview == export. Canvas 2D (WebGL only if
  truly needed); precompute heavy fields at low resolution and cache; no `ctx.filter` (Safari).
- **UI** (dark, amber accent like the user's tools): effects library with live hover thumbnails and family chips, preview stage +
  transport, timeline (shots + transitions), inspector auto-built from params, templates, Save/Open JSON + localStorage autosave,
  drag-drop media. **Phone layout** < 900 px: stage on top, bottom tabs (Effects / Timeline / Edit / Export), no horizontal scroll.
- **Export**: WebCodecs via Mediabunny — MP4 (H.264), green/blue-screen element, transparent WebM (VP9 alpha), B/W matte;
  MediaRecorder fallback. Sound effects **off by default and never used in video editing** (user rule).
- **Pipeline hooks**: `window.PTS`-style API (`load`, `frame(t, mode)`, `sheet(...)`), `render.mjs` (Remotion's headless Chrome +
  ffmpeg, frame-exact, silent), `qa-sheet.mjs` (contact sheets to JPG), `serve.mjs [--lan]` + `Open On Phone.cmd` +
  `Start <Name>.cmd`, and a `production/pipeline/<name>_fx.py` helper that renders a ready-to-place clip from real footage.

## 3. Use the team (the user wants Codex involved)
Write a precise brief in `production/codex/briefs/<studio>-<part>.md` (files to read, the exact draw contract, determinism, matte
mode, speed budget, quality bar, "create ONE file, edit nothing else") and run
`"$LOCALAPPDATA/OpenAI/Codex/bin/<ver>/codex.exe" exec -s workspace-write -C C:/Users/chand/Desktop/clausd -m gpt-6.1-sol -c 'model_reasoning_effort="high"' -o <report.md> "Read <brief> and do exactly that job."`
in the background, 1–2 jobs in parallel. Review every Codex file (`node --check`, render it, look at it) before shipping.

## 4. Verify like an editor (no claims without looking)
- Render contact sheets of **every preset** at p = 0.25/0.45/0.65/0.85 and look at them; fix timing (effects must finish near p≈0.95,
  not 0.7), artefacts, wrong directions. Check templates render without errors, exports decode (green = #00FF00, alpha really
  transparent), phone width has no horizontal scroll, console has no errors. Measure speed with a CPU profile if anything feels slow.

## 5. Hand over
README (open on PC/phone, how to use, pipeline commands), `production/<NAME>.md` with the user's usage rules in their words,
skill/agent/handbook lines so `/make-video` uses it (Claude: `.claude/skills/make-video*`, agents; Codex:
`production/codex-boss/BOSS_HANDBOOK.md`), a memory note, and log Codex-boss changes in `production/codex-boss/CHANGELOG.md` when
Codex builds it. Tell the user plainly what was tested and what wasn't (e.g. not tried on a real phone).
