# Data Chart Studio Pro

Animated data visuals for documentary explainers (Vox / Johnny Harris / Indian explainer style), driven by your
own pasted numbers: bar chart races, growing bars and columns, lines that draw on with a moving end label, areas,
pies and donuts, India-vs-China comparisons, stacked/100% bars, big-number counters (₹, %, lakh/crore/billion,
Indian digit grouping), icon arrays, scale comparisons, rankings, scatter/bubbles, gauges and tables that build
row by row. Labels in Hindi and English everywhere. Three looks: clean dark, paper/newsprint, neon (plus clean light).
Animated axes and grids, highlight one bar or point, annotation call-outs, camera push to a data point.

**Rules (the user, 2026-10-30):** every number that appears in a video must be checked against its real source
before export; sample data is always labelled "sample". Exports are **silent** (the user never uses SFX in
editing). Never write "AI" or "AI-generated" in any text that appears in a video. Generic names only — no real
brands, logos, channels or people.

## Open it
- **PC:** double-click `Start Data Chart Studio.cmd` (or open `Data Chart Studio Pro.html` in Chrome/Edge). Works
  fully offline; the file is self-contained (fonts and libraries are inlined).
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7403` address on your
  phone (same Wi-Fi). Or copy `Data Chart Studio Pro.html` to the phone and open it in Chrome — below 900 px the
  studio switches to a phone layout (stage on top, tabs at the bottom).

## Use it
1. **Charts** (left / first tab): 44 ready presets with sample data. Click a card to load it into the selected
   scene, **+** to add it as a new scene. Hover a card to watch it move. The chips filter by family, plus a Hindi
   chip and search.
2. **Stage + transport:** Space or ▶ to play, drag the scrub bar, arrow keys step one frame. Loop, solo scene,
   preview quality (Half is usually fast enough).
3. **Scenes strip:** every scene in a row. Duplicate / move / delete, and the transition between scenes
   (cut / fade / slide). Project settings set the frame size (720p … 4K, Shorts 1080×1920, square) and fps.
4. **Edit** (right / third tab) — five groups:
   - **Data:** a spreadsheet grid (first column = names, then numbers), paste CSV/Excel/Sheets rows, import a
     .csv, or drag a CSV onto the stage. Optional columns: `flag` (in, cn, us…), `color` (#hex), `note`, `icon`,
     `unit`, `prefix`, `suffix`; optional rows `#flag,us,cn` / `#color,#hex,#hex` under the header.
   - **Text:** title, subtitle, source line, title position, number words (English crore/lakh/billion or Hindi
     करोड़/लाख/अरब). Type Hindi or English anywhere — both fonts are built in.
   - **Numbers:** ₹/$/%, unit words, lakh/crore/billion shortening (Indian or international), decimals, Indian
     `12,34,567` or `1,234,567` grouping, Devanagari digits `१२३`, ×-scaling — with a live example.
   - **Style:** theme (dark / paper / neon / light), the chart's own settings, and a background photo with strength.
   - **Animate:** scene length, build timing and easing, highlight one bar/line/point (others dim), call-outs on
     data points, camera push to a data point, fade-out ending.
5. **Export:** full video, green-screen element (exact #00FF00 for CapCut Chroma key), blue-screen, transparent
   WebM (VP9 with alpha), or a black/white track matte. 720p / 1080p / 4K / Shorts 1080×1920 / square, 24–60 fps.
   PNG still of the current frame. All exports are silent. WebCodecs (Mediabunny) does the encoding with a
   MediaRecorder fallback.
6. **Save / Open:** a `.chart.json` project file (background photos are stored inside). The studio also remembers
   the last project in the browser. Ctrl+Z undo, Ctrl+S save.

## Presets (the library)
Race (GDP, Hindi population, neon), Lines (India GDP with call-outs + camera, भारत बनाम चीन, literacy paper,
petrol neon), Areas (population, stacked electricity), Columns (GDP growth with negatives, Olympic medals,
Hindi neon), Bars (states paper + Hindi with camera push, flags neon), Stacked/100% (urban vs rural, age groups),
Compare (India vs China butterfly, भारत बनाम पाकिस्तान paper, versus columns with the ×N badge), Pie & donut
(budget Hindi, rain, neon legend), Counters (₹48 लाख करोड़, three mixed units, from→to neon, auto-million),
Icon arrays (out of 100 Indians, 1 icon = 1 lakh), Scale (GDP circles, nested, area squares), Rankings
(top-10 countdown, Hindi paper), Flag rows (neighbours, military spending), Scatter/bubble (wealth vs health,
paper states), Gauges (literacy semicircle, Hindi rings, neon bars), Tables (economies with flags, Hindi paper).

## For developers / the pipeline
- Source lives in `src/` — `src/core/*` (util, CSV/data, number format, themes, draw primitives, engine, exporter),
  `src/charts/*` (one registry + one file per chart family + presets), `src/ui/*` (editor app, pipeline API).
  `node build.mjs` inlines everything plus the vendor libs (Mediabunny, MPL-2.0) and the OFL fonts
  (Inter, Mukta, Tiro Devanagari Hindi, Anton) into the single HTML file.
- `window.DCS` pipeline API (used by headless Chrome): `ready()`, `load(project)`, `build({preset, csv, …})`,
  `frame(t, mode, type)`, `sheet(ids, fractions, w, h, mode)`, `presets()`.
- `node render.mjs <project.chart.json | --preset id --csv data.csv> <out.mp4>` with `--mode
  composite|green|blue|alpha|matte`, `--fps`, `--from/--to`, `--size`, `--still S out.jpg` renders frame-exact,
  silent, with the same renderer as the preview (see `production/DATA_CHART_STUDIO.md`).
- `python production/pipeline/chart_fx.py out.mp4 --preset <id> --csv data.csv [--mode …]` wraps render.mjs for
  the video pipeline.
- `node qa-sheet.mjs <out.jpg> [--chart id | --ids a,b | --from N --count M] [--fr 0.25,0.45,0.65,0.85]
  [--size WxH] [--mode …]` makes contact sheets; `node stills.mjs "id@t;id@t" outdir` renders full-res stills;
  `node verify.mjs` re-runs the export/phone/UI checks.
- `node serve.mjs [--lan]` serves the folder on port 7403.
- Charts: `DC.charts.register({ id, name, family, shape, params, draw(ctx, env) })`, presets:
  `DC.charts.preset({ id, name, chart, csv, title, theme, lang, format, params, … })`. Everything must stay
  deterministic (seeded, no Math.random/Date in drawing) so preview == export.
- Verified behaviour worth keeping: green/blue CLI renders probe as exactly #00FF00/#0000FF (PNG pipe into
  full-range H.264) and decode in a browser as (0,255,2); alpha WebM really is transparent (browser decode:
  corner alpha 0, chart opaque); ffprobe lists VP9 alpha streams as yuv420p but the alpha is there. `node
  verify.mjs` re-runs every check (8/8 export checks, phone 390 px, desktop UI).
