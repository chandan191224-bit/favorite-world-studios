# Sketch & Ink Reveal Studio Pro

Turns your photos (and short clips) into hand-drawn art that **draws itself on screen**,
then reveals the real photo — the classic history-documentary look. 67 presets in 7
families, all procedural and seeded, in Hindi (Devanagari) and English. Works fully
**offline**; **all exports are silent**.

## Open it
- **PC:** double-click `Start Sketch Studio.cmd` (or open `Sketch & Ink Reveal Studio Pro.html` in Chrome/Edge).
- **Phone:** double-click `Open On Phone.cmd` and open the printed `http://192.168.…:7408` address (same Wi-Fi), or copy the HTML file to the phone.

## Use it
1. **Library** (left / first tab): 7 families — *Draw styles* (pencil, charcoal, ink line,
   ink wash, engraving, woodcut, stipple, cross-hatch, chalk, coloured pencil,
   watercolour, halftone, manuscript, blueprint), *Draw-on reveals* (stroke orders,
   artist pencil/nib on screen), *Transitions*, *Paper & medium*, *Annotations*,
   *Video rotoscope*, *Scenes & stories*. Click a preset to apply it to the selected
   shot; **+** adds a new shot. Hover a card to watch it draw.
2. **Drop a photo or video** on the stage (or **+ Photo** / **+ Demo** — the built-in
   demo art is drawn procedurally, so the studio works with no files at all).
3. **Timeline:** shot cards in order with drag-to-reorder, transition chips between
   shots (click one to edit it), and — when a shot is selected — **layer bars** for its
   labels and marks: drag a bar to move it in time, drag the handles to change when it
   starts and how long it stays.
4. **Edit** (right / third tab): auto-built from the preset — drawing style, line
   weight, wobble, pressure, hatch density, stroke order, drawing speed, photo reveal
   (fade / radial / ink bleed / wash / brush / colour pour / half-sketch split / photo
   dries back), paper (cream, parchment, kraft, blackboard, graph, newsprint, blueprint
   + stains, burn, smudges, eraser marks), photo treatment (archival, sepia, vignette,
   frame), name line (Hindi handwriting writes itself on), layers, timing, seed.
   Every change updates the preview instantly and autosaves.
5. **Templates:** 10 ready projects, at least one fully in Hindi.
6. **Save / Open** `.sketch.json` project files; the last project is kept in the browser
   too. Undo/redo: Ctrl+Z / Ctrl+Shift+Z. Space = play/pause, arrows = frame step.
7. **Export (always silent):** MP4 (H.264), green screen #00FF00, blue screen, transparent
   WebM (VP9 alpha), black/white matte — 720p to 4K, Shorts and square sizes included.
   Pick one shot or the whole video.

## Pipeline (for /make-video)
```
python production/pipeline/sketch_fx.py --preset story-portrait-historical --text "नाम" --sub "1861 – 1936" --out reveal.mp4
python production/pipeline/sketch_fx.py --preset sty-engraving-portrait --photo portrait.jpg --out engrave.mp4
python production/pipeline/sketch_fx.py --preset sty-pencil --photo face.jpg --mode alpha --out sketch.webm
python production/pipeline/sketch_fx.py --preset roto-ink-boil --media clip.mp4 --out roto.mp4
python production/pipeline/sketch_fx.py --list
```
`--text`/`--sub` fill the name lines; any field with `--field key=value`, any look
setting with `--param style=engraving`; `--dur`, `--size 1080x1920`, `--fps`, `--mode
composite|green|blue|alpha|matte`. Direct:
`node sketch-reveal-studio/render.mjs project.sketch.json out.mp4 [--mode …] [--fps …] [--from S --to S] [--still S out.jpg]`.

## Developer notes
`node build.mjs` rebuilds the HTML from `src/` (fonts + Mediabunny inlined;
`node fetch-fonts.mjs` re-downloads the fonts). `node qa-sheet.mjs out.jpg --fam
"Draw styles"` renders a contact sheet. `node serve.mjs [--lan]` serves on port 7408.
Deterministic: everything is seeded (no `Math.random` in effects), heavy photo analysis
runs once per photo in background slices (the stage shows a progress note), canvas 2D
only, no `ctx.filter`. Pipeline hook: `window.SKS = { load(project), project(),
duration(), frame(t, mode), sheet(…) }`; `load()` accepts the shorthand
`{"shots":[{"preset":"<id>","media":{…},"fields":{…}}]}`.

Started and built by Z.ai (GLM-5.3, Full-Stack) 2026-11-07 from the house reference
(Kinetic Title Studio Pro) and the research catalogue in `research/catalogue.md`; see
`HANDOVER.md` for exactly what was tested.
