# Film Look Studio Pro

Professional film-look overlays and textures for Favorite World videos: light leaks, lens flares, film
burns, grain, dust & scratches, 8 mm / 16 mm / 35 mm gates and weave, sepia & faded archival looks,
halftone newsprint, VHS / CRT / glitch / RGB split, camera shake & handheld drift, zoom punch, whip pans,
vignettes, letterbox, colour grades (teal & orange, war documentary, warm history) and classified-document
marks. Everything is procedural and seeded — every look is new, any colour, any size — layered over your
own photo or video, and exported as a finished MP4, an overlay (screen-blend on black / transparent WebM /
green screen) or a .cube LUT.

**Rules (the user):** overlays and looks only — this studio never supplies content. All exports are
**silent** (the user never uses sound effects in editing). Text in videos is always generic (no real
brands, channels or people) and never says "AI" or "AI-generated". Hindi (Devanagari) must render
correctly anywhere — the fonts are bundled inside the HTML, fully offline.

## Open it
- **PC:** double-click `Start Film Look Studio.cmd` (or open `Film Look Studio Pro.html` in Chrome/Edge).
  Works offline; nothing is downloaded.
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7404`
  address on your phone (same Wi-Fi). Or copy `Film Look Studio Pro.html` to the phone and open it in
  Chrome — it is one self-contained file.

## Use it
1. **Picture:** drop a photo or video on the stage (or pick a demo scene under Project → Picture).
2. **Library** (left / first tab): seven families — Light & burns, Film & damage, Archival, VHS / CRT /
   glitch, Camera moves, Frame & grade, Classified & docs. Click a look to put it on the selected layer;
   **+** adds it as a new layer on top. Hover a card to see it move.
3. **Timeline:** one row per layer. Drag a bar to move it in time, drag its right edge to stretch it.
   Top rows draw last (in front). Double-click a bar to audition that look alone.
4. **Edit** (right / third tab): every setting of the selected layer — timing, fades, opacity, blend,
   seed (🎲 = new variant), and the look's own parameters.
5. **Export:** the full picture as MP4; or the overlay alone — light elements on black (blend **Screen**
   or **Add** above your clip), transparent WebM (Premiere / DaVinci / browsers), green #00FF00 or blue
   #0000FF element (chroma key in CapCut), black & white matte; or the untouched picture. Sizes: 720p,
   1080p, 4K, Shorts 1080×1920, square. Colour grades can also be saved as a **.cube LUT** for
   CapCut / Premiere / Resolve.
6. **Save / Open:** a `.look.json` project file (photos are stored inside; video clips are re-linked by
   file path). The studio also remembers your last project in the browser.

Shortcuts: Space play/pause · ←/→ one frame · Ctrl+S save.

## Templates
Old newsreel, Vintage 8 mm home film, Archival photo album, VHS tape, War documentary, Teal & orange film,
Light leaks pack, Case file, Hindi archival caption, Blank.

## For developers / the pipeline
- Source lives in `src/` (`core/` engine + export, `fx/` one file per family, `ui/` app + templates).
  `node build.mjs` inlines everything — sources, the MPL-2.0 Mediabunny muxer from `vendor/`, and the
  bundled OFL fonts (base64 woff2) — into the single HTML file.
- `node render.mjs <project.look.json> <out.mp4|webm|png|jpg> [--mode composite|screen|alpha|green|blue|matte|source] [--fps 30] [--from S --to S] [--still S out.png]`
  renders frame-exact with headless Chrome + ffmpeg (see `production/FILM_LOOK_STUDIO.md` and
  `production/pipeline/filmlook_fx.py`).
- `node qa-sheet.mjs <out.jpg> [--family film | --fx grain | --ids a,b] [--from N --count N]` makes QA
  contact sheets of the presets.
- `node serve.mjs [--lan]` serves the folder on port 7404.
- Effects: `FL.fx.register({ id, name, family, params, kind, draw|process|camera|grade })` +
  `preset(id, name, fx, params, {dur})`. Everything must be deterministic (seeded, no Math.random/Date)
  so preview and export match frame-for-frame.
