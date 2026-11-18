# Paper Transition Studio Pro

Professional paper transitions and paper elements for Favorite World videos: tears, holes, peels, rolls, folds, crumples,
burns, brush reveals, shredders, page turns, stamps, sticky notes, taped photos, marker circles and more. It recreates
the stock "green-screen paper transition" packs procedurally, so every tear is new, any colour, any size, with your own
photos and videos inside.

**Rules (the user, 2026-10-29):** in our videos this studio is for **transitions only**, optional, only where they
complement the scenes. Newspapers, articles and highlighting always come from Paper Documentary Studio Pro. Sound effects
are **off by default** and are **never** used in video editing (`render.mjs` / `paper_fx.py` are always silent).

## Open it
- **PC:** double-click `Start Paper Studio.cmd` (or open `Paper Transition Studio Pro.html` in Chrome/Edge). Works offline.
- **Phone:** double-click `Open On Phone.cmd` on the PC and open the printed `http://192.168.…:7380` address on your phone
  (same Wi-Fi). Or copy `Paper Transition Studio Pro.html` to the phone and open it in Chrome.

## Use it
1. **Effects** (left / first tab): click an effect to put it on the selected transition; it plays straight away.
   **+** adds a new shot that uses it. Hover a card to see it move.
2. **Timeline:** shots (paper, photo, video, colour, green screen) with a transition between each pair. Click a shot or a
   transition to edit it.
3. **Edit** (right / third tab): every setting of the selected shot or transition, a dice for a new tear shape,
   stop-motion look, sound effect, and paper elements on the shot (titles, stamps, notes, photos, markers, counter…).
4. **Export:** full MP4 with sound, a single transition as a green-screen or blue-screen element (for CapCut: Chroma key),
   a transparent WebM, a black/white matte, or the sound alone (.wav). 720p, 1080p, 4K, Shorts 1080×1920, square.
5. **Save / Open:** a `.paper.json` project file (photos are stored inside; video clips must be re-added after opening).
   The studio also remembers your last project in the browser.

Shortcuts: Space play/pause · ←/→ one frame · Ctrl+S save.

## Templates
Green-screen paper pack (12 tears), Newspaper tear pack, Coloured paper series, News story (your photos), School notebook,
Festival gift wrap, Burn reveal, Vintage history, Blank.

## For developers / the pipeline
- Source lives in `src/` (core engine, effects in `src/fx/`, paper elements in `src/elements/`, UI in `src/ui/`).
  `node build.mjs` inlines everything (plus the MPL-2.0 Mediabunny muxer from `vendor/`) into the single HTML file.
- `node render.mjs <project.paper.json> <out.mp4> [--mode composite|green|blue|matte] [--first-shot N] [--from S --to S] [--still S out.jpg]`
  renders frame-exact with Remotion's headless Chrome + ffmpeg (see `production/PAPER_TRANSITIONS.md`).
- `node serve.mjs [--lan]` serves the folder on port 7380.
- Effects: `PT.fx.register({ id, name, family, params, draw(ctx, p, A, B, P, env) })`; elements:
  `PT.overlays.register({ id, name, group, fields, draw(ctx, o, lt, ld, W, H) })`. Both must be deterministic (seeded, no
  Math.random/Date) so preview and export match.
- Credits: core engine, tears/holes/rolls/strips/sweeps/crumple/fold, UI, exporter by Claude; burn + vintage brush,
  extra transitions (page turn, shredder, paper drop, zoom-through-hole) and the paper elements by Codex (GPT-6.1-Sol, high),
  reviewed and integrated by Claude.
