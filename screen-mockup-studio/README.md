# Screen Mockup Studio Pro

Screen elements for Favorite World videos: device frames with 3D camera moves and your photo/video
inside (phone, laptop, monitor, TV, tablet, old CRT, cinema screen, floating window); a search engine
typing with suggestions → results; encyclopedia-style article scroll with highlight and zoom-to-line;
a video player page; a news broadcast frame; CCTV / bodycam / drone HUDs; a video-call grid; an email
inbox; a "classified" dossier; a hacker terminal; stacked lock-screen notifications; screen zoom-ins
with blur-out. All procedural and deterministic — the preview and every export match frame for frame.

**Rules (the user, 2026-10-29):** exports are always **silent** (no sound effects, ever). Generic names
only — never a real brand, logo, channel or person. Never write "AI" in any on-screen default text.
Hindi (Devanagari) must render correctly anywhere — bundled OFL fonts (Inter, JetBrains Mono, Noto Serif
+ Mukta for Devanagari), fully offline.

## Open it
- **PC:** double-click `Start Screen Mockup Studio.cmd` (or open `Screen Mockup Studio Pro.html` in
  Chrome/Edge). Works offline, nothing to install.
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7405`
  address on your phone (same Wi-Fi). Or copy `Screen Mockup Studio Pro.html` to the phone and open it
  in Chrome.

## Use it
1. **Library** (left / first tab): 36 named presets in 7 families (Devices · Web · Broadcast · Ops ·
   HUD · Phone screens · Focus moves). Click a preset to put it on the selected shot; **+** adds a new
   shot that uses it. Hover a card to watch it move.
2. **Timeline:** your shots with a transition (cut / fade / dip / zoom / slide / whip) between each
   pair. Click a shot or a transition chip to edit it.
3. **Edit** (right / third tab): every setting of the shot — device (colour, orientation, lid angle…),
   screen content (all texts, media slots, timings), camera move (amount, easing, window), background,
   focus zoom, glare/shadow, and a dice for a new look seed.
4. **Export:** full silent MP4, or one shot as a green-screen (#00FF00) / blue-screen (#0000FF) element
   for CapCut, a **transparent WebM (VP9 + alpha)**, a black/white matte, a screen-keyed-green frame, or
   a screen matte. 720p / 1080p / 4K / Shorts 1080×1920 / square. Exports are frame-exact with the preview.
5. **Save / Open:** a `.sms.json` project file (photos are stored inside; video clips must be re-added
   or referenced by the pipeline). The studio also remembers your last project in the browser.

Shortcuts: Space play/pause · ←/→ one frame · Ctrl+S save. Drag photos/videos onto the stage to add
shots. Phone layout: stage on top, tabs at the bottom (Library / Timeline / Edit / Export), no
horizontal scrolling.

## Templates
Documentary opener · Research story · Investigation · News bulletin · Old school · Phone day ·
Cinema frame · Blank.

## For developers / the pipeline
- Source lives in `src/` (`src/core/` engine + devices + exporter, `src/content/` screen contents,
  `src/presets.js` library, `src/ui/` app). `node build.mjs` inlines everything (plus the MPL-2.0
  Mediabunny muxer and the OFL fonts from `vendor/`) into the single HTML file.
- `node render.mjs <project.json> <out.mp4|out.webm>
  [--mode composite|green|blue|alpha|matte|screenkey|screenmatte] [--fps 30] [--from S --to S]
  [--still S out.jpg]` renders frame-exact with headless Chrome + ffmpeg. It uses Remotion's
  chrome-headless-shell and ffmpeg next to the studio folder when present, and falls back to any
  installed Chrome/Edge and ffmpeg. Mode `alpha` writes a transparent WebM (VP9 + alpha).
- `node qa-sheet.mjs <out.jpg> [--ids a,b] [--from N --count M] [--ps 0.25,…]` makes contact sheets of
  presets (the ones in `test-output/` were made with it).
- `node serve.mjs [--lan]` serves the folder on port **7405**.
- `python production/pipeline/screen_fx.py --preset phone-hero-photo --media photo.jpg` renders a
  ready-to-place clip straight from the command line (see `production/SCREEN_MOCKUP_STUDIO.md`).
- Headless API: `window.SMS` — `SMS.load(project)`, `SMS.frame(t, mode)`, `SMS.sheet(ids, ps)`.
- Credits: core engine, devices, contents (screens/ops), architecture and UI by Claude; video-call
  grid content, preset library, exporter, build/serve/render/qa pipeline and docs finished by Z.ai.
