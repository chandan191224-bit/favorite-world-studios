# Kinetic Title Studio Pro

Every animated text element a documentary/explainer edit uses, in **Hindi (Devanagari) and English**: movie-style
chapter/title cards, kinetic typography, lower thirds, call-outs pointing at footage, quote cards, big number counters
(₹, %, lakh/crore, Indian digit grouping), highlighter/underline/strike/circle/redact on words, text match cuts,
on-screen social/chat cards (generic names only), and caption styles. Hindi is animated per word or grapheme cluster, so
matras and conjuncts never break. 18 free OFL font families are bundled; works offline; **all exports are silent**.

## Open it
- **PC:** double-click `Start Kinetic Title Studio.cmd` (or open `Kinetic Title Studio Pro.html` in Chrome/Edge).
- **Phone:** double-click `Open On Phone.cmd` and open the printed `http://192.168.…:7402` address (same Wi-Fi), or copy
  the HTML file to the phone.

## Use it
1. **Presets** (left / first tab): 84 looks in 10 families: Movie titles (16), Kinetic text (18), Lower thirds (6),
   Call-outs (7), Quote cards (4), Numbers (7), Highlight (8), Match cuts (4), Social & chat (6), Captions (8).
   Click one to apply it to the selected clip; **+** adds a new clip. Hover a card to see it move.
2. **Timeline:** clips one after another. **+ Clip** adds one; **Project settings** = size, fps, background (demo
   city, colour, none, your photo/video).
3. **Edit** (right / third tab): the text fields (`*word*` = accent colour), font, size, colours, fill (gold, chrome,
   fire, gradient), in/out animation, animate-by (word / letter / line / all), timing, easing, loops, position.
4. **Save / Open** a `.kinetic.json` project; the last project is kept in the browser too.
5. **Export:** MP4, green screen (#00FF00, CapCut Chroma key), blue screen, transparent WebM, black/white matte.

## Pipeline (for /make-video)
```
python production/pipeline/title_fx.py --preset mt-hindi-display --text "आज़ादी की कहानी" --sub "1947 की गवाही" --out intro.mp4
python production/pipeline/title_fx.py --preset lt-doc --field name="डॉ. भीमराव आंबेडकर" --field role="संविधान निर्माता" --out tag.webm --mode alpha
python production/pipeline/title_fx.py --preset nm-rupee --field to=12500000 --out budget.mp4 --mode green
python production/pipeline/title_fx.py --list
python production/pipeline/title_fx.py --input project.kinetic.json --out full.mp4
```
`--text` / `--sub` go to the element's main/second line; any field with `--field key=value`, any look setting with
`--param key=value`; `--dur`, `--size 1080x1920`, `--fps`, `--bg demo|black|color|photo|video` (+ `--bg-color`,
`--bg-file`). Direct: `node kinetic-title-studio/render.mjs project.kinetic.json out.mp4 [--mode …]`.

## Developer notes
`node build.mjs` rebuilds the HTML from `src/` (fonts + Mediabunny inlined; `node fetch-fonts.mjs` re-downloads the
fonts). `node qa-sheet.mjs out.jpg --ids a,b,c` renders a contact sheet. `node serve.mjs [--lan]` serves on port 7402.
Started by Claude (research, core text/anim/elements) 2026-11-06, finished by Z.ai (GLM-5.3) 2026-11-07, checked and
fixed by Claude on Windows; see `HANDOVER.md`.
