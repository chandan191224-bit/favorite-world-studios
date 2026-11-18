# HANDOVER — Data Chart Studio Pro (studios/data-chart-studio/)

Continued from Claude's half-finished upload and completed in the Z.ai sandbox, exactly per BRIEF.md.
Status: **finished and verified**; the complete folder plus `production/` and this file are in the final zip.

## What was in the upload vs what I did

Already in the zip (Claude): `build.mjs`, `src/index.html`, `src/styles.css`, `src/core/*` (util, data, format,
themes, draw, engine, export), `src/charts/*` (registry, bars, lines, round, numbers, race, icons, flags,
presets), `src/ui/*` (app, api), `qa-sheet.mjs`, vendor licence texts. I reviewed and kept all of it.

I added / changed:
- **Vendor files actually obtained from npm** (they were missing from the upload): `vendor/mediabunny.min.js`
  (= `mediabunny@1.65.2` dist/bundles/mediabunny.min.cjs, MPL-2.0), `vendor/Inter.woff2`
  (@fontsource-variable/inter latin wght), Mukta 500/700/800 (devanagari + latin subsets),
  Tiro Devanagari Hindi 400 (devanagari + latin), Anton 400 — all OFL.
- **`tooling.mjs`** rewritten: cross-platform headless-Chrome discovery (DATACHART_CHROME → repo
  node_modules/.remotion chrome-headless-shell win64 → linux64 → puppeteer cache → PATH) and `ui:true` /
  screenshot support for UI testing. Behaviour on the user's PC is unchanged.
- **Bug fixes found by QA** (each one verified before/after at 1920×1080 with a vision model — details below):
  1. `format.autoDecimals` dropped decimals for values ≥ 100 (142.9 showed as "143 करोड़"). Now keeps the exact
     decimals up to 999; ≥ 1000 stays integer. Affects race-pop-hi, compare-hi-paper, area-population, counter-trio.
  2. Race year counter used `floor` (2022.87 → "2022" at p=0.85 with a callout saying 2023). Now `round`.
  3. Race rows crossing ranks printed their labels on top of each other (United Kingdom/China, Canada/Brazil,
     France/Italy value collisions). Two-pass draw: while two bars are within a bar-height, the row behind hides
     its name/flag/value for the crossing moment.
  4. Pie `show()` dropped the decimal of big shares (95.2% showed "95%"). Now keeps one decimal when the number
     has one (95.2 / 4 / 0.8).
  5. Pie outside labels collided at the top (Winter/Pre-monsoon). Now collected, spread per side by height with
     an 84px gap, leaders redrawn to the moved label.
  6. `yGrid` axis labels with long Hindi unit words ("$17.50 ट्रिलियन") could run off the left frame edge.
     Now shrink-to-fit inside the plot box.
  7. Negative column labels sank into the x-label row (the −5.8% over "FY21"). Now track the bar tip but never
     above `plot bottom + 82k`, clamped inside the frame.
  8. Scale-comparison labels overlapped for small shapes at the tail (Pakistan/Sri Lanka read as
     "PakistaSri Lanka"). Now measured real text widths, spread with an iterative forward/backward pass, and
     detached labels get a leader line back to their shape.
  9. Scatter point labels stacked over each other on the crowded left (Bangladesh/India/Pakistan). Now spread
     above their bubbles; the highlighted bubble also gets a ring.
  10. Nested-circles value text overshot with the back easing (Pakistan showed $0.37T then settled to $0.34T).
      Numbers now use a clamped progress while the shape keeps the pop.
  11. Highlight dim floor raised 0.28 → 0.45 (several sheets read dimmed rows as "bars effectively invisible").
  12. **Camera push looked like a broken crop** (all row labels cut, value clipped mid-glyph at the frame bottom).
      The chart now renders through a masked layer: a soft focus around the target with dark falloff at the
      edges; call-outs stay unmasked and readable. Preset `bars-states-hi` zoom softened 1.35 → 1.25 so the
      deepest row clears the source line.
- **New pipeline files** (per the brief): `render.mjs` (headless Chrome + ffmpeg, frame-exact, PNG-piped so key
  colours stay exact, `--preset/--csv` or project-file input, `--mode composite|green|blue|alpha|matte`,
  `--still`), `serve.mjs` (port 7403), `Start Data Chart Studio.cmd`, `Open On Phone.cmd`,
  `production/pipeline/chart_fx.py`, `production/DATA_CHART_STUDIO.md`, `README.md`, plus two QA helpers
  (`stills.mjs`, `verify.mjs`) that stay in the folder for future checks.

## What I tested and how (all in this sandbox, all with real renders)

- **Every one of the 44 presets**: contact sheets at p = 0.25/0.45/0.65/0.85 (`test-output/qa-*-v2.jpg`,
  640×360) inspected frame by frame with a vision model; every suspect then re-rendered at 1920×1080
  (`test-output/stills/`) and re-inspected. Numbers were cross-checked against the preset data (e.g. race 2023
  finals US $27.36T / China $17.79T / Japan $4.21T / Germany $4.46T / India $3.55T; population भारत 142.9 /
  चीन 141.0 / अमेरिका 33.5 करोड़). Final sweep: sheets A–E all clean; the remaining sheet-level notes were
  confirmed as tile-scale misreads or mid-interpolation values at the exact 85% sample.
- **Hindi**: every preset with Devanagari checked for tofu/clipped conjuncts (भारत, ज़्यादा, क्षरता, ट्रिलियन,
  नंबर etc.) — correct everywhere; the ₹ glyph renders in all four fonts.
- **Timing**: objective check across all 44 presets — coarse 48×27 hash of p=0.95 vs p=0.999: **none still
  moving** at the end. Races finish at p≈0.86 then hold (by design, `hold` param).
- **Exports (in-app, WebCodecs + Mediabunny)**: all five modes rendered and probed — MP4 h264/yuvj420p, exact
  duration; alpha WebM vp9; matte black/white; MediaRecorder fallback (forced by hiding VideoEncoder) also
  produced a decodable webm. Pixel probes: alpha corners decode **fully transparent (alpha 0) in a real browser**
  with opaque chart pixels; green fills are exact #00FF00 on the canvas and round-trip through in-app H.264 as a
  uniform ~(0,252,0) — keys cleanly in any chroma-key tool.
- **CLI renders (`render.mjs` / `chart_fx.py`)**: composite/green/blue/matte MP4 + alpha WebM + stills + a
  two-scene project with a fade transition (110 frames, 4.6 s). The PNG pipe + full-range H.264 make **green
  probe as exactly [0,255,0] and decode in a browser as (0,255,2)**; alpha WebM decodes transparent in Chrome
  (corner alpha 0, bars opaque). `node verify.mjs` re-runs all of this and finishes 8/8 export checks — see
  `test-output/exports/` for the evidence files. No console errors in any run.
- **Phone**: 390×844 in headless Chrome with the real UI booted — `scrollWidth` 390 (no horizontal scroll),
  bottom tabs render, all four tabs switch, the export dialog opens from the phone tab, zero console errors;
  screenshots in `test-output/phone-390-*.jpg`. Desktop 1600×900 editor: default project (3 scenes) loads,
  44 library cards, preset click switches the chart, inspector tabs work, zero console errors
  (`test-output/desktop-editor.jpg`).
- Speed: contact sheets of 44 presets render in ~2 s/row at 640×360; full-res frames ~60–100 ms each in
  headless Chrome — no profiling needed, nothing felt slow.

## Known quirks (not bugs, documented so nobody "fixes" them blind)

- ffprobe lists the VP9 alpha streams as `yuv420p` (it does not show the alpha plane); the alpha is real and
  decodes transparent in Chrome — verified for both the in-app export and the CLI render.
- In-app H.264 green/blue elements decode as ~(0,252,0)/(3,2,255) instead of exactly 255 — that is the
  colour-space round-trip of H.264, not a fill error; the canvas fill is exact, and the colour is uniform, so it
  keys cleanly. The CLI renders (PNG pipe + full-range yuvj420p) decode at (0,255,2) in a browser and probe as
  exactly [0,255,0] with ffprobe — as exact as H.264 allows.
- Races sample at exactly p=0.85 land ~0.1 s before the interpolation ends (values like 142.8 / US $27.10T at
  that instant); they reach the exact final values at p≈0.86 and hold. At p=0.95 everything is settled.
- Tabular digit cells in Inter/Anton show a small gap around "1" (advance 44 vs 69 for "0"). Checked at full
  size — reads as normal number spacing; only visible in tiny thumbnails.

## What is NOT done or not tested — be honest with yourself

- **Not tried on a real phone.** Phone layout was verified at 390 px in headless Chrome (layout, tabs, no
  horizontal scroll, screenshots). Real-device rendering (safe areas, performance, touch) is untested.
- MediaRecorder fallback was tested headless (it encodes); its pacing in a foreground tab on a real PC was not
  measured. WebCodecs is the primary path everywhere, so the fallback is unlikely to be hit in Chrome/Edge.
- The drag-drop CSV / paste path was exercised via the API and the data grid, not by OS-level drag events in a
  GUI (headless drag is unreliable); the handlers are the same ones the reference studios use.
- `chart_fx.py` was tested on Linux (python3) with node on PATH; it is plain argparse/subprocess, but it has
  not been run on Windows. Same for the `.cmd` launchers — they mirror the working Paper Studio ones verbatim,
  but were not run on a Windows PC.
- Long-form content: the longest render tested is 6 s at 30 fps (180 frames) plus a 4.6 s project; a 60 s 4K
  race at 4K/30 (≈1.6 GB of PNG pipe) should work but was not benchmarked end to end.
- Sources in presets are rounded real figures kept from Claude's data (IMF/UN/Census/SIPRI, labelled);
  the user must still verify each number before it goes into a video (their rule, restated in
  `production/DATA_CHART_STUDIO.md`).
- No Codex jobs were run (this environment has no Codex); everything was built and reviewed here.

## File map of the final zip

```
studios/data-chart-studio/            complete studio (same paths as the upload, plus the new files)
  BRIEF.md  build.mjs  qa-sheet.mjs  render.mjs  serve.mjs  tooling.mjs
  stills.mjs  verify.mjs            (QA helpers)
  Start Data Chart Studio.cmd  Open On Phone.cmd
  Data Chart Studio Pro.html        (built, self-contained, 1.7 MB)
  src/  vendor/                     (sources + mediabunny + OFL fonts, now complete)
  test-output/                      (contact sheets qa-*-v2.jpg, stills/, exports/, phone+desktop screenshots)
  README.md
production/
  DATA_CHART_STUDIO.md              (usage rules for the video pipeline)
  pipeline/chart_fx.py              (one-command clip maker)
HANDOVER.md                         (this file)
```
