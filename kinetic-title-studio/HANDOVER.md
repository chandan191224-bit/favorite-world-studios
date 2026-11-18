# HANDOVER — Kinetic Title Studio Pro (studios/kinetic-title-studio/)

## Who built what
- **Claude, 2026-11-06:** research (`research/catalogue-A.md`, `catalogue-B.md`), `fetch-fonts.mjs` + fonts,
  `src/core/util.js`, `anim.js`, `text.js` (Devanagari-safe shaping/segmenting), `src/el/elements.js`. Session limit hit.
- **Z.ai (GLM-5.3, Full-Stack), 2026-11-07:** 84 presets (`src/el/presets.js`), engine, export, UI + phone layout,
  templates, `build.mjs`, `render.mjs`, `qa-sheet.mjs`, `serve.mjs`, launchers, `production/pipeline/title_fx.py`,
  contact sheets of every family (`test-output/qa-*.jpg`). It stopped before README/HANDOVER/production doc.
- **Claude, 2026-11-07 (Windows):** checked and fixed it (below), wrote the docs.

## Fixed on Windows
1. **Transparent export (`--mode alpha`) failed silently**: `render.mjs` wrote an FFV1 intermediate, then tried VP9 and a
   ProRes fallback; Remotion's ffmpeg has no FFV1/ProRes, so nothing was written and no error shown. Now PNG frames go
   straight into VP9 + alpha (as in the Paper/Parallax studios), and any ffmpeg failure stops with an error.
2. **`title_fx.py` crashed** printing Hindi/arrows to the Windows console (cp1252) → UTF-8 output.
3. **`--sub` (and `--text` for some presets) went to the wrong field**: the helper guessed the element type by searching
   `presets.js` for `el: '`, but presets are declared through family helpers (`mt(...)`, `lt(...)`) without it. Now the
   id prefix decides (`mt/kt` → title, `lt` → lower, `co` → callout, `qc` → quote, `nm` → counter, `hl`, `mc`, `so`, `cap`).
4. **Play bar hidden on wide screens** (1920×870): the stage grew over the transport. `.stage-wrap` is a size container,
   stage limited by `100cqw/100cqh` (desktop only).
5. **Main-text box unreadable** in the inspector: `textarea` was missing from the `color: inherit` rule.
6. **Social post counts showed "362.0"**: small counts now whole numbers; compact ("12.4K") only from 10,000.

## Tested (Windows, 2026-11-07)
- `node build.mjs` → `Kinetic Title Studio Pro.html` (4.7 MB). Editor in headless Chrome at 1920×870: answers in
  1–12 ms through the first 20 s, Play advances (0.6 → 3.7 s), no console errors; layout at 1920×870, 1366×680 and
  390×844: play button visible and clickable, no horizontal scroll.
- `title_fx.py`: Hindi chapter card with subtitle (MP4), Hindi lower third as transparent WebM (corner alpha 0),
  ₹ counter on green (green (0,254,0); lands on ₹1,25,00,000). No audio streams.
- Contact sheets looked at: Z.ai's for Social & chat and Call-outs, plus a Windows sheet of so-post, mt-hindi-display,
  nm-crore, hl-marker, cap-karaoke — Hindi shapes correctly, animations complete.

## Not tested
Not every one of the 84 presets was re-rendered on Windows (Z.ai's sheets cover all families); the editor was driven
headless, not clicked through by hand; not tried on a real phone; in-browser Export dialog not exercised here.
