# Detective Board Studio Pro

A complete offline detective-board animation editor in the same UI family as your Paper and Map studios: dark panels, amber controls, library / stage / inspector / camera timeline. All demo cases and artwork are fictional. No account, API key, paid service, external font or CDN is needed.

## Open on your laptop

Double-click **Start Detective Studio.cmd**, or open **Detective Board Studio Pro.html** in Chrome or Edge. The single HTML file contains the editor, templates, thumbnail previews, renderer and video muxer. You can copy it to another device.

Start with a template, drag clues into position, double-click a clue to edit its text, and import your own photos or silent video. Select a clue, click **String**, then click another clue to connect them. Use **Layers** to edit connection labels, colours, styles and timing. The inspector changes text, colours, fonts, crop, size, rotation, pins, tape, opacity, layer depth and entrance/exit times. Drag a selected clue's lower-right corner to resize it.

**Edit board** shows all clues for arranging them. **Camera preview** and **Play** show their actual animated reveals and camera movement. Preview quality is independent of export quality.

## Open on your phone

1. Double-click **Open On Phone.cmd** on the laptop. Node.js is already installed on this PC.
2. Connect the phone and laptop to the same Wi-Fi.
3. Enter a displayed **Phone** address in Chrome or Safari on the phone. Keep the command window open. A firewall prompt may need you to permit the server on your private network; this studio does not change firewall settings.
4. The stage stays above bottom tabs: Library, Timeline, Edit, Camera, Export. Drag clues; pinch with two fingers to zoom and pan.

Alternatively, copy the single HTML file to your phone and open it in a browser. Mobile file-opening support varies. The same-Wi-Fi launcher is the recommended route. No internet is needed once the file is available; the laptop must remain on while serving it.

Projects and autosaves are device/browser-specific. **Save** downloads a portable `.detective.json` file including imported media; use **Open** to transfer it to the other device. A phone does not automatically share its autosave with the laptop.

## Included

- **16 editable templates**: classic red-string corkboards, noir, suspect relationships, map investigations, timelines, classified dossiers, archives, whiteboards, forensics, paper trails, press investigations, surveillance and a portrait case.
- **18 camera presets**: full board, slow push, pull-back reveal, clue travel, oblique arc, follow the string, big reveal, whip to evidence, macro detail, documentary drift, vertical scan, lateral drift, suspect lineup, timeline sweep, spiral, establish, locked frame and detail-to-context.
- **14 element types**: polaroid, sticky note, document, newspaper, map, fingerprint, folder, evidence label, stamp, tape, marker circle, board text, evidence bag and surveillance screen.
- **8 materials/themes**, **7 entrances**, **4 connection styles**. Save any edited board as **My templates** from Board settings or Help.

Templates are starting points for the main visual families researched. They are not an exhaustive promise covering every detective animation ever made. Build new combinations by adding clues, connections and shots.

## Direct the camera

Choose **Camera presets** to replace the camera sequence. Every shot has editable start/end X/Y, zoom, roll, tilt, duration and easing. Select a clue, switch to Camera, then **Aim at selected clue** to target it. Pan/zoom in Edit board and **Capture view** to use that exact composition. **Preview from/to** lets you inspect an endpoint. **Match start to previous** removes a join discontinuity. Add, delete, duplicate by adding matching shots, or drag shots to reorder. Touch users can use **Earlier / Later**.

Camera tilt is a fast Canvas 2D simulation of foreshortening; it is not a full 3D scene or optical depth-of-field renderer. Handheld drift, layer parallax, lighting, vignette, grain and cinema bars are editable.

## Smooth preview

The preview uses screen-sized resolution, bounded cached artwork, viewport culling, pre-rendered library thumbnails and a frame scheduler that preserves elapsed time. Paused previews redraw only when something changes; video seeks trigger a redraw. Library hover animations stop during playback. **Fast** lowers preview resolution further; **Full** is useful for checking detail. Export always renders at the resolution you choose.

Large phone videos and huge boards still depend on device memory and decoder performance. Imports embed media for portable saving; the editor limits each imported file to 120 MB. Use short, compressed clips for phone work. Keep a downloaded JSON backup; browser storage can be cleared by browser/OS settings.

## Export

The Export dialog provides 540p, 720p, 1080p and 4K sizes at 24/30/60 fps, a time range, full-board video, exact green/blue backgrounds, black/white matte, PNG stills and PNG sequence ZIPs.

- **MP4 H.264** uses WebCodecs plus the bundled MIT-licensed Mediabunny muxer. Browser/codec support is checked; it does not silently rename WebM to MP4.
- **WebM VP9/VP8** uses WebCodecs, or a real-time MediaRecorder fallback. Keep the tab visible during fallback export.
- **Transparent output in the browser:** use PNG or a PNG sequence ZIP. Transparent VP9 WebM is provided by the frame-exact PC renderer below; browser alpha-video support is inconsistent.
- Exports contain **no audio**. Sound effects are not used in video editing.

Long 4K browser exports and PNG ZIPs require substantial RAM. Export shorter ranges or use the PC renderer for long clips. Encoding availability at a particular resolution is hardware/browser dependent.

## Save, open and shortcuts

Autosave uses IndexedDB, including media. **Save** is a portable backup and **Open** restores it. Saved custom templates also live in that browser's IndexedDB. Undo/redo keeps up to 35 editing states and shares immutable media strings between states.

Space: play/pause. Ctrl+S: Save. Ctrl+Z / Ctrl+Shift+Z: undo/redo. Ctrl+D: duplicate a clue. Delete: remove selected clue or connection. Arrow keys: move a clue (Shift: 10 pixels). Wheel: zoom. Shift-drag empty board: pan.

## Pipeline and command line

Run from this folder:

```powershell
node project.mjs templates
node project.mjs cameras
node project.mjs create harbour-files projects/my-case.detective.json --title "My investigation" --photo "C:\path\photo.jpg"
node render.mjs projects/my-case.detective.json out/my-case.mp4 --height 1080 --fps 30
node render.mjs projects/my-case.detective.json out/elements.webm --mode alpha --from 3 --to 7
node render.mjs projects/my-case.detective.json out/poster.png --still 8
```

The PC renderer uses the existing Clausd headless Chrome and installed FFmpeg. It renders exact timestamps through the same renderer, pipes PNG frames to FFmpeg, and preserves alpha for VP9 WebM. Use `DETECTIVE_TOOLS_ROOT` if moving the studio away from Clausd; `DETECTIVE_FFMPEG` can point to another installed FFmpeg. Media `path` entries are resolved relative to the JSON project file. UI-saved projects already embed media.

From the Clausd root after installation:

```powershell
python production/pipeline/detective_fx.py templates
python production/pipeline/detective_fx.py create harbour-files production/episodes/example/board.detective.json --photo production/episodes/example/photo.jpg
python production/pipeline/detective_fx.py render production/episodes/example/board.detective.json out/board.mp4 --to 8
```

The browser API is `DBS.load(project)`, `DBS.frame(t, mode, width, height)` and `DBS.sheet(times, mode, width)`. `DBS.project` returns portable state. No sound is mixed in.

## Build and verification

```powershell
node build.mjs
node qa-boot.mjs --all
node qa-boot.mjs --advanced
node qa-boot.mjs --thumbs
node build.mjs
```

The QA report and rendered contact sheets live in `test-output/`. See `research/REFERENCE_CATALOGUE.md` for the opened sources, local studio references and complete feature catalogue. See `VERIFICATION.md` for actual measured results and untested limits. Physical-phone smoothness must still be checked on your handset.

Source is modular under `src/core` and `src/ui`; `build.mjs` inlines it into the single HTML. Third-party licence: `vendor/MEDIABUNNY-LICENSE.txt`.
