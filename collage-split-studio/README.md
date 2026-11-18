# Collage & Split Studio Pro

Multi-image layouts for Favorite World videos: split screens (2/3/4-way, diagonal, wipes), compare A vs B with VS badges
and labels, grids that build and rearrange, picture-in-picture, photo walls that zoom into one photo, scrapbook collages
in the Johnny Harris / Vox style (cut-out photos with white outline + drop shadow, 12 fps stop-motion jitter, hand-placed
feel), cut-out sticker pop-ins, polaroid stacks that deal and fan, film strips and 35 mm contact sheets, before/after
sliders, and mosaic reveals — all procedural, all seeded, with **your own photos and videos** (drag-drop, auto-fit/crop,
manual lasso cut-outs).

It complements the other studios: paper tears/taped notes stay in Paper Transition Studio, string boards in Detective
Board Studio. This one is for everything multi-photo.

**Rules baked in:** fully offline (no CDN, no accounts, free tools only) · deterministic (preview == export, frame for
frame) · **always silent** (the user never uses SFX in editing) · generic names only · Hindi (Devanagari) renders
correctly everywhere (Mukta / Noto Serif Devanagari / Kalam fonts are bundled inside the file).

## Open it
- **PC:** double-click `Start Collage Studio.cmd` (or open `Collage & Split Studio Pro.html` in Chrome/Edge). Works
  offline — the file is self-contained (fonts + Mediabunny muxer inlined).
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7406` address on your
  phone (same Wi-Fi). Or copy the HTML file to the phone and open it in Chrome.

## Use it
1. **Effects** (left / first tab): 52 ready presets in 10 families (chips to filter, search box). Click a card to apply
   it to the selected scene; **+** on a card adds a new scene with it. Hover a card to watch it move.
2. **Drop media:** drag photos/videos onto the stage (or **+ Photo / video**). They fill the selected scene's empty
   slots; leftovers become a new scene with a fitting layout (2 photos → split, 5+ → grid…). The timeline tray shows
   everything you imported — click a tray thumb to fill the next empty slot, × to remove.
3. **Timeline:** scene cards with live thumbnails, transitions between them (fade / push / slide-over / zoom / flash).
   Click a scene or a transition to edit it.
4. **Edit** (right / third tab): duration, a 🎲 for a new arrangement, every layout setting, and one row per photo —
   which media it shows, its label (Hindi OK), focus point, zoom, video start/loop.
5. **Cut-outs:** select a photo in a slot → **✂ Cut-out / lasso…** — auto background removal (plain backgrounds),
   oval, or click a lasso polygon around the subject. Cut-outs get the white outline in scrapbook / sticker / duel
   effects.
6. **Export (always silent):** the full MP4, a green-screen (#00FF00) or blue-screen element for CapCut chroma key, a
   transparent WebM (VP9 + alpha), or a black/white track matte. 720p / 1080p / 4K / Shorts 1080×1920 / square, any fps.
7. **Save / Open:** a `.collage.json` project file (photos are stored inside it; videos are re-linked by file).
   Autosave to the browser too.

Shortcuts: Space play/pause · ←/→ one frame · Ctrl+S save.

## Templates
Blank · Compare story (Hindi labels) · Scrapbook story · Split screen pack · Photo wall zoom · Film / contact sheet ·
Polaroid memories · Shorts (1080×1920 vertical).

## For developers / the pipeline
- Sources in `src/` (`core/` engine + draw/look/media/export, `fx/` one file per family, `ui/` app + templates).
  `node build.mjs` inlines everything + vendor + fonts into the single HTML file.
- `node render.mjs <project.collage.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte] [--fps 30]
  [--from S] [--to S] [--still S out.png]` — frame-exact, headless Chrome + ffmpeg, always silent.
  One-liners: `node render.mjs out.mp4 --preset jh-bw-collage --media a.jpg,b.jpg,c.jpg --dur 6`
  and `node render.mjs --list-presets presets.json`.
- `node qa-sheet.mjs <out.jpg> [--ids a,b] [--from N --count 14] [--ps 0.25,0.45,0.65,0.85]` — contact sheets.
- `node serve.mjs [--lan]` — serves the studio on port **7406**.
- Headless hook: `window.CSAPI` (`load(project)`, `frame(t, mode)`, `presets()`, `sheet(ids, ps, W, H)`).
- Layouts register via `CS.fx.register({ id, family, params, draw(ctx, env) })` — see `src/fx/registry.js` for the
  contract; everything must stay deterministic (no `Math.random`/`Date` inside effects).
- The Python pipeline helper: `../production/pipeline/collage_fx.py` (see `../production/COLLAGE_SPLIT_STUDIO.md`).

Credits: core engine, families, UI, pipeline by Z.ai (Claude); Mediabunny muxer (MPL-2.0) inlined in `vendor/`;
fonts: Instrument Sans, Mukta, Playfair Display, Noto Serif Devanagari, Courier Prime, Caveat, Kalam (all SIL OFL).
