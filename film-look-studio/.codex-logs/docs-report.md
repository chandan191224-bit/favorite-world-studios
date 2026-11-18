Created only [docs.js](/C:/Users/chand/Desktop/clausd/film-look-studio/src/fx/docs.js), with eight effects and 25 presets:

- Stamp: classified, top-secret, confidential, declassified, evidence, archive, hindi
- Redact: sweep, static-block, reveal
- Censor: pixel-face, blur-plate
- Label: archive-tape, location, file-number, hindi
- CCTV: classic, minimal
- Viewfinder: rec, clean
- OSD: play, rec, rewind, pause
- Dossier: case-file

Each preset ID uses its effect prefix, such as `stamp-classified`.

Syntax check and 432 mocked drawing checks passed, including deterministic seeking, landscape/portrait dimensions, and calendar rollover. `build.mjs` and `qa-sheet.mjs` were missing, so visual and performance verification remain untested. No episode was rendered.