# Blueprint & Diagram Studio Pro

Every "how does it work / how is it built / who is related to whom" graphic a documentary-explainer
edit uses, in **Hindi (Devanagari) and English**: blueprint draw-ons that draw themselves stroke by
stroke (fort, dam, bridge, ship, submarine, tank, jet, rocket, train, car, gears, bunker, dome,
satellite, floor plan, minaret — or **your own SVG**, or **your photo traced into line art**),
rotating 3D wireframes, exploded & cutaway views, labelled photo call-outs, process flows with
moving dots, cycles, funnels, decision flowcharts, family/dynasty trees with portraits, scale &
size comparisons with a giant reveal, cross-sections (earth, sea, floors, tunnels, pipes), looping
mechanisms (gears, piston, conveyor, pulley, pendulum, valve, turbine) and relationship diagrams
(Venn, 2×2, hub-and-spoke, comparison tables). 65 presets in 10 families, 6 paper themes
(Blueprint navy, graphite tracing, chalkboard, neon, clean white, aged drafting). Hindi is animated
per word or grapheme cluster, so matras and conjuncts never break. 8 free OFL font families are
bundled; works offline; **all exports are silent** (no sound, ever).

## Open it
- **PC:** double-click `Start Blueprint Studio.cmd` (or open `Blueprint & Diagram Studio Pro.html`
  in Chrome/Edge).
- **Phone:** double-click `Open On Phone.cmd` and open the printed `http://192.168.…:7407` address
  (same Wi-Fi), or copy the HTML file to the phone.

## Use it
1. **Presets** (left / first tab): 65 looks in 10 families. Click one to apply it to the selected
   shot; **+** adds a new shot. Hover a card to watch it move.
2. **Timeline:** shots one after another with transition chips (cut / fade / dip to black / wipe)
   between them; drag cards to reorder. **+ Photo** adds your photo and starts a labelled diagram
   with it; **+ Demo** adds a blueprint shot; **Project settings** = size, fps, background.
   **Layers** under the shots: timing bars for the selected shot — drag a bar to move it, grips to
   resize (Blueprint and Labelled shots are editable; others are a timing preview). The green line
   is the playhead.
3. **Edit** (right / third tab): the text fields (Hindi typing works everywhere), the STYLE /
   ANIMATION / LABELS / MEDIA groups (paper theme, drawing, line weight, draw speed, stagger, draw
   order, ease, hold, labels, dimensions with counting measurements, title block, photo/SVG slots),
   timing, transition, seed, undo/redo (Ctrl+Z / Ctrl+Shift+Z).
4. Drop a photo / video / SVG straight onto the stage to use it in the selected shot.
5. **Save / Open** a `.blueprint.json` project; the last project is kept in the browser too.
6. **Export:** MP4 (H.264), green screen (#00FF00, CapCut Chroma key), blue screen, transparent
   WebM (VP9 alpha), black/white matte. Range: whole video, one shot, or custom in→out. Sizes
   720p/1080p/4K/Shorts 1080×1920/square. Always silent.

## Pipeline (for /make-video)
```
python production/pipeline/diagram_fx.py --preset bp-fort-blueprint --text "किले की दीवार" --out fort.mp4
python production/pipeline/diagram_fx.py --preset la-photo-labels --photo IMG_4021.jpg --field labels="0.5,0.4 | मुख्य द्वार | GATE" --out tags.webm --mode alpha
python production/pipeline/diagram_fx.py --preset bp-photo-trace --photo face.jpg --out sketch.mp4
python production/pipeline/diagram_fx.py --preset bp-svg-import --media myfile.svg --out logo.mp4
python production/pipeline/diagram_fx.py --list
python production/pipeline/diagram_fx.py --input project.blueprint.json --out full.mp4
```
`--text` / `--sub` go to the shot's main fields; any field with `--field key=value`, any look
setting with `--param key=value`; `--dur`, `--size 1080x1920`, `--fps`, `--mode`, `--bg`. Direct:
`node blueprint-diagram-studio/render.mjs project.blueprint.json out.mp4 [--mode green|blue|alpha|matte]
[--fps 30] [--from S] [--to S] [--still S out.jpg]` (frame-exact, headless Chrome + ffmpeg, silent).

## Developer notes
`node build.mjs` rebuilds the HTML from `src/` (fonts + Mediabunny inlined; `node fetch-fonts.mjs`
re-downloads the fonts). `node qa-sheet.mjs out.jpg --ids a,b,c` renders a contact sheet.
`node serve.mjs [--lan]` serves on port **7407**. Research catalogue: `research/catalogue.md`.
Built by Z.ai (GLM-5.3) 2026-11-07 following the Kinetic Title Studio Pro house architecture; see
`HANDOVER.md`.
