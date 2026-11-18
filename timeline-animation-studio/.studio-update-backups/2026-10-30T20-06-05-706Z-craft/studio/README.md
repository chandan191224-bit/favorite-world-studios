# Timeline Animation Studio Pro

An offline **documentary timeline animation editor**, researched from the exact YouTube query “timeline animation after effects”: 26 videos found and 25 opening samples visually inspected. It follows the dark-panel, amber-control family of your Paper and Detective studios. No account, paid service, API key, CDN or external font is required. All exports are silent.

Double-click **Start Timeline Studio.cmd**, or open **Timeline Animation Studio Pro.html** in Chrome or Edge. The single HTML contains the complete editor, original procedural artwork, offline preset thumbnails and video muxer. Copy that file to another computer to use it there.

## Make a timeline

1. Start under **Documentary**, with **16 effects across eight animation types**: moving year ruler, historical photo journey, alternating cutout chronology, luminous event rail, perspective passage, vertical journey, rolling year strip and date insert. The earlier 36 diagram presets are available separately under Diagrams.
2. Select a stop on the stage or under **Milestones**. Edit its displayed date, numeric year, heading, caption, month, source and image. Import transparent PNGs for portrait/object cutouts.
3. **Animation** shows the actual camera travel and holds. **Arrange** shows the complete long timeline for positioning. The lower bars retime camera arrivals independently from calendar years.
4. **Motion** controls travel duration, holds, easing, camera framing and an optional final wide reveal. **Build camera stops from holds** creates arrival times from your hold/travel settings. **Style** controls ruler ticks, typography, colours and large event images. **Project** changes the scene title, dimensions, duration and CSV data.
5. **Save** downloads a `.timeline.json` project containing imported photos. **Open** restores it. Export a silent video or still when ready.

Documentary presets open on a representative camera stop; Play begins from the start. Preset replacements and most edits can be undone. Dates and text can be written in Hindi or English using fonts installed on your device. Display dates are independent of numeric calendar values: for example, a display label of `300 BCE` can use a numeric value of `-300`. The studio does not parse calendar strings or calculate historical accuracy for you.

For a **year ruler over documentary footage**, choose “Year ruler over footage”, click **Backdrop**, and import a silent MP4/WebM or image. Enter the narrative dates and camera arrivals. The ruler shows intermediate years during travel and pauses at each event. Export a composite video, or export alpha/keyed elements to layer over footage in the shared editor. Transparent exports omit the backdrop.

For a **historical photo journey**, replace the large event images, set narration holds, and choose travel/push/pull or continuous passage. The timeline extends offscreen: the camera visits events rather than fitting the full chronology on screen. Turn on the final wide reveal when context at the end helps.

## Layouts and motion

The primary documentary families reproduce the useful behaviours observed in the tutorial previews: a fixed pointer over moving year ticks, large photos/cutouts attached to a long rail, image-linked luminous branches, deliberate travel and narration holds, masked year rolls and optional pullback context. References are linked under the studio’s **26 refs** button.

Calendar values affect proportional spacing; camera arrivals use seconds in the video. Each stop also has an image entrance duration, camera hold and zoom. Perspective and parallax are Canvas 2D simulations rather than a full After Effects 3D scene or optical depth of field. Motion blur is not an After Effects motion-blur replica.

Use short captions and 4–8 milestones for a readable overview. The editor accepts up to 100 milestones; dense projects need shorter captions, camera follow or multiple clips. Duplicating a milestone also duplicates its photo reference. Replacing photos embeds the new image; browser imports downsize photos to a maximum dimension of 1920 pixels.

## CSV and reusable presets

Import/export CSV from Project or the Milestones list. Required headers: `date,title`. Optional: `value,endValue,description,start,duration,lane,color,cameraHold,cameraZoom,month,source,mediaFit`. Quoted commas, quotes and multiline descriptions are supported. Import replaces the milestone list and can be undone. See `projects/example.csv`.

Save your edited timeline with **Save as my preset** in Style or Project. My presets and autosaves use this browser’s IndexedDB; they are not shared automatically between devices. Download a project backup before clearing browser storage or moving devices.

Shortcuts: Space play/pause; Ctrl+S save; Ctrl+Z undo; Ctrl+Shift+Z redo; Ctrl+D duplicate; Delete remove selected. In Arrange, arrows nudge a marker; Shift+arrows moves it farther.

## Phone

Double-click **Open On Phone.cmd** on your laptop. Connect your phone to the same Wi-Fi and enter a printed Phone address in its browser. Keep the command window open. Windows may ask you to allow the Node server on your private network; the studio does not change firewall settings. The stage stays above Library / Events / Edit / Export tabs.

You can also copy the single HTML to a phone, although direct local-file opening varies by browser. There is no required internet connection. Node.js is needed only for the laptop’s phone server and command-line tools. Backdrop videos embed in the portable project; use short compressed clips (80 MB import limit, 150 MB project-open limit). Keep downloaded backups if your browser runs out of autosave storage.

## Export

- MP4 H.264 through WebCodecs and the bundled MIT-licensed Mediabunny muxer. Availability depends on the browser and codec at the selected size; unsupported MP4 reports an error.
- WebM VP9/VP8 through WebCodecs, with a real-time MediaRecorder fallback. Keep the tab visible when using the fallback.
- PNG still, transparent PNG or PNG sequence ZIP. ZIP exports in the UI are limited to 1,200 frames to bound memory use.
- Designed background, exact green/blue screen, black-and-white matte or transparent output. Browser transparency uses PNG/ZIP. Use the PC renderer for transparent VP9 WebM.
- 540p, 720p, 1080p and 4K short-edge sizes, 24/25/30/60 fps and an editable time range. For portrait, 1080p means 1080×1920. Preview quality does not reduce export resolution.

Long 4K exports need considerable browser memory. Use short ranges or the PC renderer. No sound effects or audio are generated or mixed.

## Command line and production pipeline

From this folder:

```powershell
node project.mjs templates
node project.mjs layouts
node project.mjs create doc-history-journey projects/my-timeline.timeline.json --title "My chronology" --csv projects/example.csv
node project.mjs create doc-vox-cutouts projects/photos.timeline.json --photo "C:\path\cutout.png"
node render.mjs projects/my-timeline.timeline.json out/timeline.mp4 --height 1080 --fps 30
node render.mjs projects/photos.timeline.json out/elements.webm --mode alpha --from 4 --to 8
node render.mjs projects/my-timeline.timeline.json out/poster.png --still 12
```

The frame-exact PC renderer uses the existing Clausd headless Chrome and installed FFmpeg. Set `TIMELINE_TOOLS_ROOT` if those tools live in another Remotion project; `TIMELINE_FFMPEG` can point to FFmpeg. Those dependencies are not required to open the offline editor.

After installation in Clausd:

```powershell
python production/pipeline/timeline_fx.py templates
python production/pipeline/timeline_fx.py create doc-history-journey production/episodes/example/timeline.timeline.json --csv timeline-animation-studio/projects/example.csv
python production/pipeline/timeline_fx.py render production/episodes/example/timeline.timeline.json out/timeline.mp4 --height 1080
```

Browser API: `TLS.load(project)`, `await TLS.frame(seconds,mode,width,height)`, `await TLS.sheet([.25,.45,.65,.85],mode,width)`, and `TLS.project`. `frame` returns a PNG data URL. `sheet` accepts fractions of project duration. All use the same renderer as the editor.

## Research and verification

Read `research/REFERENCE_CATALOGUE.md` and the three `research/twenty/REVIEW_*.md` reports for creator links and actual frame observations. The 25 inspected samples cover at most the opening 36 seconds; full tutorial viewings are not claimed. One selected video was unavailable, and one Netflix-style comparison uses a CapCut UI. Templates are original implementations of design families, not copies of paid source projects. Demo NASA photos have image-source metadata; cutout spacecraft illustrations are original vectors. Some photos are illustrative later/prelaunch views rather than the exact historical moment.

`VERIFICATION.md` records actual checks and limits. Test output contains real browser exports, full-resolution examples and five-timepoint sheets of all 16 documentary presets. Documentary desktop and 390px phone layouts are browser-tested; a physical phone was not tested. Preview and exact-export video decoders are separate, so background footage playback cannot change exported source frames.

```powershell
node build.mjs
node qa-thumbnails.mjs
node build.mjs
node qa-documentary.mjs
node qa-production.mjs
```

Build sources live under `src/core`, `src/ui`. The self-contained HTML needs no runtime imports. Bundled dependency licence: `vendor/MEDIABUNNY-LICENSE.txt`.
