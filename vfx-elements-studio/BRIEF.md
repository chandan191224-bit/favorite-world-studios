# Brief for Z.ai — build **Atmosphere & VFX Elements Studio Pro** (folder `vfx-elements-studio/`) from scratch

Please build this complete studio in your sandbox, then give me ONE downloadable zip of the `vfx-elements-studio/` folder (same paths)
plus the hand-over files listed below. Work through it in order; don't stop to ask unless truly blocked; if your turn runs
out, end with a precise "what's done / what's left" list so the next turn can continue. Use the best model effort —
this is a large, professional tool, not a demo.

## Who this is for
A Hindi documentary-explainer YouTube channel, "Favorite World" (history, geopolitics, economy, science, in Hindi). The
user edits like a pro documentary editor and already has a family of studios built in ONE house style: Paper Transition
Studio Pro, Paper Studio Pro, Map Animation Studio, Timeline Animation Studio Pro, Detective Board Studio Pro, Data Chart
Studio Pro, Photo Parallax Studio Pro, Kinetic Title Studio Pro, Film Look Studio Pro, Screen Mockup Studio Pro. The new
studio must look, feel and work exactly like them, so the user can switch between them without learning anything new.

The zip contains `_house-reference/`: the complete, finished **Kinetic Title Studio Pro** source (build, serve, render,
qa scripts, index.html, styles.css, UI app, templates, engine, export, presets, README, HANDOVER, launchers,
mediabunny) and three screenshots of a finished studio (`screenshot-desktop-1920x870.jpg`, `screenshot-laptop-1366x680.jpg`,
`screenshot-phone-390x844.jpg`). **Read them first and copy that architecture, UI look, file layout and code style.**

## What this studio is
Ready-made atmosphere and VFX ELEMENTS that a documentary editor lays over footage and photos (war, disaster, history,
crime), all procedural, seeded, looping where it makes sense, and exported mainly as transparent / green-screen / screen-
on-black overlays. Families (build all, several presets each, every one good enough to use in a real film):
1. **Smoke & fog** — rising smoke columns (thin, thick black war smoke, white chimney smoke), drifting ground fog, rolling
   fog bank, haze layers, smoke puff after an impact, battlefield smoke wall. Use proper fluid-looking noise (curl /
   domain-warped fBm advected over time, density shading, soft edges), not flat blobs.
2. **Fire** — burning flames (small torch, campfire, large building fire, line of fire), burning embers drifting up,
   sparks bursts, burning paper edge that eats inward, heat shimmer (as a displacement that can be applied to the
   user's clip/photo).
3. **Explosions & impacts** — muzzle flash, distant artillery flashes on the horizon, explosion fireball with expanding
   smoke + debris + shockwave ring + light flash, dust impact, bullet hits on ground (dust puffs), flare/rocket trail.
   Seeded, physically plausible timing (flash 2–3 frames, fireball ~0.5 s, smoke lingers).
4. **Weather** — rain (light / heavy / angled / with splashes at the bottom), snow (gentle / blizzard), lightning
   (bolt with branching + sky flash), hail, dust storm / sandstorm, wind-blown leaves or paper.
5. **Sky & light** — clouds passing overhead (time-lapse), storm clouds, god rays / light shafts through smoke, sun
   glare, moving cloud shadows over the ground, night sky with stars, aurora (keep it subtle).
6. **Particles & debris** — floating dust motes in light, ash falling, debris falling, paper/documents flying,
   bokeh, falling petals, crowd-flash photography (camera flashes).
7. **Water** — ripples, rain on a window pane (with drops running down), underwater caustics, splash.
8. **Combo looks** — ready stacks: "war-torn city" (smoke + embers + ash + distant flashes), "partition night" (fire
   glow + smoke + embers), "storm arrives", "dust bowl", "winter front", "burning archive".
Every element: density/amount, size, speed, direction/wind, colour/tint, opacity, softness, seed, position/area mask,
loop length. Apply over a drop-in photo/video (composite) or export alone (alpha / green / screen-on-black / matte).
Performance: draw at a working resolution and upscale smoothly; the editor must stay responsive.

## Research first (short)
Search the web/YouTube for how documentary editors make these (e.g. "blueprint animation After Effects", "family tree
animation documentary", "photo to sketch animation documentary", "engraving portrait reveal", "how it works explainer
diagram animation", "Vox/Johnny Harris/Kurzgesagt style" etc. as fits this studio). Write `research/catalogue.md`: every
look/move you found, with what makes it look professional (timing, easing, line weight, colour). That catalogue is your
feature spec; build every item in it.

## UI / UX — how our studios look and work (match it exactly)
**Look.** Dark UI, amber accent. Use the same CSS tokens as the reference:
`--bg:#0b0d11; --panel:#14171f; --card:#10131a; --input:#090b0f; --border:#252a38; --accent:#e5a93c; --accent-2:#f3bc56;
--text:#eef0f4; --muted:#9198a8; --danger:#ef4444; --ok:#22c55e; --r:10px`. System UI font 13 px for the interface,
uppercase amber section headings (12 px, letter-spacing .06em), rounded 8-10 px buttons: amber primary button, ghost
buttons with a border that turns amber on hover, pill chips for families (amber outline when on).

**Desktop layout** (CSS grid, like the reference; see the screenshot):
- **Top bar** (50 px): amber square logo + studio name + small "PRO" badge, the editable project name, and on the right:
  Templates, Open, Save, and the amber **Export** button.
- **Left panel (≈300 px) — Library**: heading, a search box ("Search …"), family chips (All + one per family), then a
  grid of preset cards (≈124 px wide) each with a **live animated thumbnail on hover** (still thumbnail otherwise), the
  preset name, and a small "+" button to add it to the timeline. Click a card = apply to the selected shot.
  Thumbnails are rendered lazily at low resolution and cached; never block start-up.
- **Centre — Stage**: the 16:9 preview canvas centred on near-black (#07080b), rounded corners, soft shadow; drag-and-drop
  photos/videos/SVG onto it (dashed amber "Drop to add" overlay). Optional safe-area / grid guides toggle.
- **Transport** under the stage: round amber play/pause button, time "0:00.0 / 0:12.4" in monospace, scrub slider,
  Loop toggle, preview quality select (Full / Half / Quarter). Space = play/pause, arrows = frame step.
- **Timeline** under the transport: shot cards in order with a thumbnail, name and duration, transition chips between
  shots, an "Add shot" card; drag to reorder; selected shot outlined amber; buttons "+ Photo", "+ Demo", "Project
  settings". Where the studio has layers (labels, annotations), show them as draggable bars with grip handles to move
  and resize their timing, with a playhead.
- **Right panel (≈330 px) — Inspector**: auto-built from the effect's parameter schema, grouped in cards with amber
  headings (e.g. SHOT 1, STYLE, ANIMATION, LABELS, MEDIA): sliders with the value shown on the right, selects, colour
  pickers, text inputs / textareas (Hindi typing must work), media slot pickers, toggles, a short plain-language
  description under each effect. Every change updates the preview instantly and autosaves.
- **Export dialog** (modal): mode (MP4, green screen #00FF00, blue screen #0000FF, transparent WebM with alpha, black/white
  matte), size (720p, 1080p, 4K, Shorts 1080x1920, square 1080x1080), fps (24/25/30/60), range (whole / selected
  shot / custom in-out), a progress bar with cancel, and a download when done. Silent always.
- **Templates** dialog: 8-10 ready example projects (at least one in Hindi) that load with one click.

**Phone layout (< 900 px)**: stage on top (full width), transport below it, then ONE panel at a time chosen by bottom
tabs **Library / Timeline / Edit / Export** (amber underline on the active tab); top bar shrinks to logo, project name,
Open, Save. Touch-friendly sizes (≥40 px targets), no horizontal scroll at 390 px, pinch/drag not required.

**Behaviour**: starts instantly with a demo project already playing-ready (built-in demo art drawn procedurally, so it
works with no user files); Save/Open as `.json` project files; localStorage autosave (with size budget; media too big
for storage is re-linked by name); drag-drop or "+ Photo" to add the user's media; undo/redo (Ctrl+Z / Ctrl+Shift+Z);
everything works offline by double-clicking the HTML.

## Rules (the user's — every one applies)
- Free tools only: no paid APIs, no accounts, no CDN at runtime. Works fully **offline**.
- **One self-contained HTML file** `Atmosphere & VFX Elements Studio Pro.html` built by `node build.mjs` that inlines `src/**` + vendor libs + fonts
  as base64 `@font-face` (copy `_house-reference/build.mjs`). Opens by double-click in Chrome/Edge on PC and on a phone.
- **Deterministic**: everything seeded; no `Math.random`/`Date` inside effects; preview == export frame-for-frame.
  Canvas 2D (WebGL only if truly needed); no `ctx.filter` (Safari); cache heavy fields at low resolution.
- **Export** via WebCodecs + Mediabunny (`_house-reference/vendor/mediabunny.min.js`, copy it to `vfx-elements-studio/vendor/`):
  MP4 H.264, green/blue screen, transparent WebM (VP9 alpha), black/white matte; MediaRecorder fallback.
- **No sound effects at all** (the user never uses SFX). All exports silent, no audio track.
- Never write "AI" or "AI-generated" in any default text that appears in a video.
- Generic names only — never imitate a real brand, logo, company, channel or real person in defaults.
- Hindi (Devanagari) text must render correctly anywhere text appears (bundle free OFL fonts, e.g. Mukta, Noto Sans
  Devanagari, Tiro Devanagari Hindi, Kalam for hand-written labels; plus Latin fonts that fit the studio). Never split a
  Devanagari grapheme cluster when animating text (use `Intl.Segmenter('hi', {granularity:'grapheme'})`).
- Pipeline hooks: `window.VFX` = { load(project), project(), duration(), frame(t, mode), sheet(...) } (like
  `window.KTS` in the reference) plus a `"preset"` shorthand in `load()` so a pipeline project can be just
  `{"shots":[{"preset":"<id>", "media":{...}, "fields":{...}}]}`; `render.mjs` (headless Chrome via CDP + ffmpeg,
  frame-exact, silent; `--mode`, `--fps`, `--size`, `--from/--to`, `--still`); `qa-sheet.mjs` (contact sheets to JPG);
  `serve.mjs [--lan]` on port **7409**; `Start VFX Studio.cmd` and `Open On Phone.cmd` (CRLF batch files, like the reference).

## Lessons from earlier studios (these were real bugs — avoid them)
- **Write the hand-over files EARLY** (README.md, production doc, the Python helper, HANDOVER.md) right after the studio
  first works, then keep updating them. Earlier chats were cut off before writing them.
- The user's PC is **Windows**. The Python helper must start with
  `for s in (sys.stdout, sys.stderr): s.reconfigure(encoding="utf-8", errors="replace")` (Hindi crashed cp1252). The
  helper lives in `production/pipeline/` and finds the studio as `os.path.join(HERE, "..", "..", "vfx-elements-studio")`.
- `render.mjs` on the PC uses **Remotion's ffmpeg** (`node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`; scan
  the `node_modules/@remotion/` folder for `compositor-*`) and **Remotion's headless Chrome**
  (`node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe`), both
  relative to the repo root = the studio folder's parent; fall back to installed Chrome/Edge and PATH ffmpeg. That ffmpeg
  has **no ffv1, no prores, no rawvideo muxer, no ffprobe**. Use PNG frames piped (`-f image2pipe -c:v png -i -`) ->
  `libx264 -pix_fmt yuv420p` for MP4 and -> `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0` for transparent WebM. Check
  the ffmpeg exit code and fail loudly; never fail silently. (`_house-reference/render.mjs` already does all this.)
- Editor layout at **1920×870** (the user's Edge window): the stage must not cover the play bar. `.stage-wrap` is a size
  container (`container-type: size; overflow: hidden`) and the stage is limited with `max-width: 100cqw; max-height:
  100cqh` (desktop only; reset in the phone media query). Verify the play button is clickable at 1920×870, 1366×680 and
  390×844.
- `button, input, select, textarea { color: inherit; font: inherit; }` — textareas were unreadable dark-on-dark.
- The play loop must never step backwards: clamp the per-frame time step to 0..0.1 s.
- Nothing heavy on the page thread at start-up or for library thumbnails (one studio froze for a minute). Cache keys
  must include everything that changes the result, or a first rough frame gets stuck in the cache.
- Hand-written pipeline projects omit fields: normalise every layer/shot in `load()` (on, seed, start, opacity, params).
- Pans/zooms must never expose an edge of an image (compute the cover zoom exactly).
- Small numbers as whole numbers ("362", not "362.0"); Indian digit grouping for ₹ (1,25,00,000).

## Verify like a video editor (no claims without looking)
Render contact sheets of **every preset** at p = 0.25 / 0.45 / 0.65 / 0.85 and actually look at them. Fix timing
(animations must finish near p≈0.95 and then hold, not end at 0.7), artefacts, wrong directions, clipped or broken Hindi
text, strokes drawing in an unnatural order. Check templates load with no console errors, exports decode (green really
#00FF00, alpha really transparent — check alpha in a browser, ffmpeg can't decode VP9 alpha), phone width (390 px) has no
horizontal scroll, the editor stays responsive (< 50 ms per interaction) during the first 20 s. Put the contact sheets in
`vfx-elements-studio/test-output/`.

## Acceptance tests — the studio is NOT finished until every one passes (paste the outputs into HANDOVER.md)
Earlier studios came back with these exact bugs; Claude then had to fix them by hand. Please make sure none is left:
1. **The Python helper really uses the user's media.** Run `python production/pipeline/vfx_fx.py --preset <a preset
   that uses media> --photo some/real/photo.jpg --text "हिंदी परीक्षण" --out t.mp4` (and `--media clip.mp4` where video
   makes sense, and the audio file for the audio studio). Extract frames from t.mp4 with ffmpeg and LOOK at them: the
   photo/video/audio-driven content must be visible. (A previous studio's helper put media on the shot but
   render.mjs only resolved project-level media paths, so every helper clip showed a blank background.)
   `render.mjs` must resolve `path` fields wherever the helper writes them (project-level media table AND per-shot
   media objects).
2. **MP4 colour format**: `ffprobe`/`ffmpeg -i t.mp4` must show `yuv420p(tv, …)` — never `yuvj420p`/pc range. If you pipe
   JPEG frames, add `-vf scale=in_range=pc:out_range=tv -color_range tv`; piping PNG avoids it.
3. **No audio stream** in any output (`-an`), the audio studio included.
4. **Transparent WebM**: corners/background fully transparent when decoded in Chrome (draw the video to a canvas and
   read alpha) — ffmpeg's native vp9 decoder drops alpha, so don't judge alpha with it.
5. **Green**: background exactly (0,255,0) in the canvas before encoding; ≈(0,250+,0) after H.264 is fine.
6. **Editor layout**: run `node _house-reference/tools/studio-check.mjs <chrome> "<studio html>" <outdir> <tag>` (it
   is in the zip; it uses Chrome's DevTools protocol, no npm deps). At 1920×870, 1366×680 and 390×844 it must print
   `inView:true, playClickable:true, hscroll:false`, `t1` later than `t0` (Play advances), `lagMs` < 50 and
   `console errors: none`. The stage must stay large on a laptop (≥ 50 % of the centre column width at 1366×680):
   long layer/track lists scroll inside a capped box instead of squeezing the preview.
7. **Helper paths**: the helper lives in `production/pipeline/` and finds the studio as
   `os.path.join(HERE, "..", "..", "vfx-elements-studio")`; it starts with the UTF-8 `reconfigure` lines; it prints the output path
   and exits non-zero on any failure.
8. **Every preset** passes the contact-sheet review (p = 0.25/0.45/0.65/0.85), plus one 1080p still per family that you
   look at full size. Fix anything that looks amateur — this is for a real channel.
9. **Fresh-unzip test**: unzip your final zip into an empty folder, run `node build.mjs` and one `render.mjs` there,
   to prove nothing is missing.
10. Final deliverable: ONE zip containing `vfx-elements-studio/` (with the built HTML), `production/VFX_ELEMENTS_STUDIO.md`,
   `production/pipeline/vfx_fx.py` and `HANDOVER.md`, offered as a download link in the chat. Write the final message
   in **English**.

## Hand-over files (all in your final zip)
- `vfx-elements-studio/` complete, including the built `vfx-elements-studio/Atmosphere & VFX Elements Studio Pro.html`.
- `vfx-elements-studio/README.md` — open on PC / phone, how to use, pipeline commands.
- `production/VFX_ELEMENTS_STUDIO.md` — usage rules for the video pipeline (when to use it, how, quality bar).
- `production/pipeline/vfx_fx.py` — Python CLI that calls `render.mjs` to make a silent, ready-to-place clip (MP4 or
  transparent WebM) from the user's media + a preset name (`--preset`, `--media`/`--photo`, `--text`/`--field k=v`,
  `--mode`, `--size`, `--fps`, `--list`).
- `HANDOVER.md` — what you built, what you tested and how, what is NOT done or not tested. Be honest.

## The studio-building method (for reference)
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
