# Map Animation Studio

Map and travel animations for YouTube, built on Remotion, so you edit them in **Remotion Studio**: a timeline, a props panel and a Render button.
It covers every technique in the *Map & Travel Animation Reference Guide*, plus extra highlight, transition and editing effects.

All the data is free and accurate, and most of it ships in this folder:

| Data | Source | Notes |
|---|---|---|
| Country borders (3 detail levels) | Natural Earth 1:10m | **`borders: "india"`** uses Natural Earth's India point-of-view file (J&K and Ladakh as officially recognised by India). `"world"` uses de facto lines. |
| States / provinces | Natural Earth admin-1 | Every country |
| 7,300+ cities, 70+ landmarks and peaks, extra Indian towns | Natural Earth plus surveyed coordinates | Peaks use official heights (Everest 8,849 m) |
| Rivers, lakes, highways, railways | Natural Earth 1:10m | Highways and railways are the **routing network** |
| Satellite globe, night lights | NASA Blue Marble / Black Marble | Real day/night terminator for any date |
| 3D terrain | AWS Terrain Tiles (SRTM, ~30–70 m) | Downloaded when rendering; `npm run cache-terrain` stores it offline |
| Flags (250+) | `flag-icons` (MIT) | Waving animation |
| Sound effects | Synthesised by `scripts/make-sfx.mjs` | Your own, royalty-free |

## Map Animation Studio app (your own editor)

The studio has its own editor that runs in your browser. Nothing else needs to be open.

**Windows:** double-click **`Start Map Studio.bat`**. The first start installs its components, which takes a few minutes. After that, your browser opens **http://localhost:7272**. Keep the black window open while you work. Run `npm run shortcut` once to put a *Map Animation Studio* icon on your desktop.

**Phone / tablet:** double-click **`Open On Phone.cmd`** on the PC and open the *Phone:* address it prints (same Wi-Fi).

**Smooth preview (2026-10-30):** the studio serves a fast production build (rebuilt automatically after updates; `--live` gives the old on-the-fly developer mode) and compresses map data for Wi-Fi. The **Preview** menu next to the play controls sets how sharp the map is painted while you edit: *Auto* (paints at the size you see it — default), *Fast* (for slow laptops and phones), *Full*. Exports are always full quality. `node scripts/perf-check.mjs` measures repaint time on a laptop-sized window and an emulated phone.
**macOS/Linux:** run `./start-map-studio.sh` (or `npm start`).

The screen is laid out like Cutroom:

| Area | What it does |
|---|---|
| **Left: Add / Templates / Media** | Add any layer at the playhead: highlight area, flag/photo/video inside an area, route, pin, radar, callout, arrow, map label, text, location card, image, video, waving flag, counter, GPS HUD, sound. **Templates** adds any of the 30 ready-made animations as a *scene* on the timeline, or starts a new project from one. **Media** uploads your photos, videos and audio; they are copied into `public/media`. |
| **Centre: preview** | Live preview. Drag the selected layer to move it, scroll to scale it, Shift+scroll to rotate it. With **Rec** on, those moves become keyframes at the playhead. Drop files on the preview to add them. |
| **Right: inspector** | **Layer**: every setting, with place search (countries, states, 7,300+ cities, landmarks). **Animate**: keyframes (opacity, scale, x, y, rotate, easing) and presets. **Camera**: camera keyframes (place, zoom, bearing, 3D pitch, fly/smooth/cut). **Project**: frame size, length, map look, borders, map details, sun, sound. |
| **Bottom: timeline** | One track per layer, plus a camera track. Drag bars to move them, drag their edges to trim. Drag the diamonds to retime keyframes, and double-click the camera row to add a camera key. Snapping is on (hold Alt to turn it off), and Ctrl+wheel zooms. Drag the end marker to change the length. |

**Export** renders the MP4 on your PC. Since 2026-11-13 the default is **YouTube quality** (H.264 CRF 16, JPEG frames, all CPU cores): it looks the same after YouTube's re-encode and exports several times faster than before. The other choices are the old **Master quality** (CRF 12, slow preset, lossless PNG frames), ProRes 4444 `.mov`, and a quick draft — in any frame size including 4K and Shorts. Files go to `out/`, and the renderer is pre-warmed when the studio starts, so the first export no longer waits a minute for "Preparing the renderer". The first export ever downloads the render browser (about 100 MB, once).

**Saving:** **Ctrl+S** saves to `projects/`, and after that the project autosaves. Use *Project → Download project file* to keep a copy anywhere. Undo/redo goes back up to 150 steps.

**Shortcuts:** Space play · ←/→ frame · K keyframe · R record · S split · Del delete · Ctrl+D duplicate · Ctrl+Z / Ctrl+Shift+Z undo/redo.

A misspelt place name doesn't stop the preview: that element is skipped and a ⚠ warning shows on the preview.

## New on 2026-11-18

* **Pan, zoom, tilt & set camera directly from the preview**: in the preview toolbar (*Pan / Zoom Map*, default), drag the map to pan anywhere, scroll the mouse wheel to zoom in/out, `Shift+drag` or `Shift+wheel` to tilt 3D pitch, and `Alt+wheel` to rotate bearing. Click **Set Camera Here** (or turn on **Rec**) to lock that exact framing as a camera keyframe at the playhead. Switch to *Move Layer* when you want to drag/scale a movable layer on screen.
* **Full-Screen preview mode with full controls**: click **Full Screen** in the preview or transport bar (or press `F11`, `Esc` to exit) to expand the preview across the whole screen with a floating transport bar so you can play/pause, scrub the timeline, pan/zoom the camera, set camera keyframes, and `Ctrl+Click` regions to group them while in full screen.
* **`Ctrl + Click` on the preview map (or *Select Regions* tool) to group areas**: hold `Ctrl` and click countries, states, or continents directly on the map preview (or switch the preview toolbar to *Select Regions*) to combine multiple regions into a named **Region Group** on the spot. Clicking an already-grouped region toggles it between **Selected (On)** and **Unselected (Off)** inside the group.
* **Combined Region Groups (continents, countries, states) with unified effects & waving flags**: any Highlight, Flag/Photo/Video fill (`region-media`), or Break-out piece (`cutout`) layer can combine multiple areas (or 1-click presets: **USSR**, **KOREA**, **PAKISTAN**, **BRITISH INDIA**, **NATO**, **BRICS**, or any **Continent**). Waving flags (including the new built-in USSR flag `su.svg`), photos, videos, highlights, and labels stretch across the entire combined group as one unified territory.
* **Remove internal borders between grouped areas**: toggle *Remove internal borders between grouped areas* on any Region Group (for example, North Korea + South Korea grouped as **KOREA**, or the 15 republics grouped as **USSR**) to dissolve the dividing border lines between conjoined areas—both in the highlight/flag outline and on the base map—leaving only the outer country/group border.
* **Select / Unselect individual areas inside a group**: uncheck any member inside a Region Group (or `Ctrl+Click` it on the preview, or toggle layers inside a timeline group) so all selected areas show the combined effect/flag while the unselected area does not show the effect, without deleting it from the group.

## New on 2026-11-13

* **Quick tab** (first panel): 8 one-click builders — Fly into a place, Journey A→B, Highlight an area, Compare two
  places, Country→city drill-down, Breaking-news zoom, Conflict arrows, Tour of stops. Type the places, press
  *Create at playhead*; everything made is ordinary editable layers and camera keyframes.
* **Effects can play on top**: an effect inside a layer now has *While it plays: On top / Replaces*. *On top*
  (the default when the effect is a different type than its layer) draws over the main layer while it keeps
  playing — e.g. a route runs India→Russia and from 2.5–3.5 s China glows on top, with the route and camera
  undisturbed. *Replaces* is the old behaviour (India → Bihar swap).
* **Ships follow real sea lanes**: route mode *sea* now sails open water through the real straits and canals
  (Suez, Panama, Bosphorus, Malacca, Gibraltar, Hormuz…), never across land. Data: `public/data/sea.json`
  (rebuild with `node scripts/build-sea.mjs`).
* **Custom route paths**: give a route layer a GPX or GeoJSON file (*Custom path* field, files from the Media tab)
  and the route follows your drawn/recorded path exactly. Waypoints typed as plain `lat, lon` stops still steer a
  route without drawing pins.
* **Break-out piece** (new layer): a country or state lifts off the map with a shadow — like history videos where
  India breaks out of Asia — then goes wherever you drag it (keyframes/Rec). Fill it with the map colours, its
  flag, any flag, or a photo; optional label.
* **Camera follows the route**: on any route layer (Layer tab) and in the Journey/Tour quick builders — a 3D chase
  cam along the real route geometry, including sea lanes and custom paths.
* **Layer groups**: give layers a *Group* name (Layer tab) and they sit together under one header on the timeline;
  drag the group bar to move them all (effects inside them come along), fold the group with −/+, double-click the
  header to rename (empty = ungroup).

## Effects inside a layer (2026-10-31)

One main layer can carry a whole sequence. Example: **Highlight India** (0–15 s) with a sky-to-ground camera, and at 5 s a
**Highlight effect set to Bihar** for 5 s: from 5–10 s the layer shows Bihar instead of India (no second layer drawn on
top), then it goes back to India. The camera keeps following its own keyframes.

* **Add → "Add as: Effect"** (default): click an item, or drag it onto a layer's bar. It goes *inside* the layer under the
  playhead and shows as a striped chip on that layer's bar, not as a new track. **"Layer"** makes a normal layer as before.
* A new effect of the same type copies the main layer's settings, so you only change what differs (India → Bihar).
  An effect can also be another type (a route, a pin, a callout…) to replace the main layer for a while.
* Effect settings (Layer tab → *Effect inside …*): in/out transition (dissolve, zoom dissolve, cut, with lengths),
  **Camera during the effect** (default *Keep the main camera*, or any cinematic move: push-in, orbit, tilt reveal…), and the
  effect's own keyframes on the Animate tab. *Make it a layer* turns it back into a normal layer. Any layer can be attached
  later with *Use as effect*.
* Effects on a **ready-made scene** (or dropped on the **Camera** row) can also *pause* it: the scene stops, the effect plays
  with its own camera, then the scene carries on. *Keep end time* plays the rest of the scene faster; *Make main longer*
  lengthens it instead.

## Cinematic camera presets (2026-10-31)

23 designed camera moves that write **ordinary camera keyframes** (shown and editable on the Camera row):
* Layer tab → **Cinematic camera for this layer**: pick a move (sky to ground, push-in, orbit, crane, tilt reveal, drift,
  snap zoom…) and a length; it frames the layer's place. Countries and states are framed from their real shape (Bihar works).
* Camera tab → **Cinematic presets**: every move plus two-place shots (drill down country → state, journey A → B, compare,
  border sweep, out-and-back), from the playhead, with automatic zoom.

Sound effects in every template now default to volume 0; turn them up per project if you want them.

## Remotion Studio (optional, for developers)

```bash
cd map-animation-studio
npm install
npm run studio        # opens Remotion Studio at http://localhost:3000
```

In Studio, pick a composition on the left and edit its props on the right. Type places as names (`"Mumbai"`, `"Taj Mahal"`, `"Kerala"`, `"Paris, France"`) or coordinates (`"19.07, 72.87"`). To name a coordinate, write `"Base Camp (28.0026, 86.8528)"`.

## Rendering from the command line

`npm run render` now defaults to the fast **YouTube quality** (CRF 16, JPEG frames, `fast` preset, all CPU cores) —
visually identical on YouTube, several times faster. `--max` restores the archive-master settings from
`remotion.config.ts` (lossless PNG frames, CRF 12, slow preset; about 30 Mbps at 1080p).

```bash
npm run render -- FlightPath              # out/FlightPath.mp4 (1080p, fast YouTube quality)
npm run render -- FlightPath --max        # archive master (CRF 12, slow, PNG frames)
npm run render -- FlightPath --4k         # 3840x2160
npm run render -- FlightPath --shorts     # 1080x1920 for Shorts/Reels
npm run render -- FlightPath --square     # 1080x1080
npm run render -- FlightPath --prores     # ProRes 4444 .mov for Premiere/DaVinci grading
npm run render -- MapComposer --props=my-props.json
```

Every composition also has a **format** prop (16:9 1080p / 4K, 9:16, 1:1, 4:5) and a **durationSec** prop.

## The compositions

### 00 · Map Composer: your own timeline with keyframes
`MapComposer` is the free-form editor. Add **layers**; each one appears as a bar on the Studio timeline from `startSec` to `endSec`. Layer types:

`highlight` · `region-media` (photo/video/flag inside a country or state) · `route` · `pin` · `radar` · `callout` · `arrow` · `map-label` · `text` · `location-card` · `image` · `video` · `flag` · `counter` · `hud` · `sfx` · `scene` (plays any of the 30 templates, full-frame or scaled down as picture-in-picture)

* **Keyframes** (`keys`): each key sets `opacity`, `scale`, `x`, `y` and `rotate` at a time `t` (seconds from the layer's start), with an easing (`linear`, `ease-in`, `ease-out`, `ease-in-out`, `back`, `elastic`, `bounce`, `hold`). Keys combine freely, and layers stack.
* **Camera keyframes** (`camera`): place, zoom, bearing, 3D pitch, and how the camera gets there (`fly` = Google-Earth zoom-out/in, `smooth`, `linear`, `cut`).
* **Project files**: set `projectFile` to a JSON file in `public/` (see `public/projects/example-delhi-mumbai.json`). Your `/make-video` pipeline can write these files and render them with `npm run render -- MapComposer --props='{"projectFile":"projects/x.json"}'`.

### 0 · Map highlights
* `MapHighlights`: tours countries, states, radius rings or your own GeoJSON (`file:areas/x.geojson`) with **16 highlight styles**: fill, gradient, glow, neon, outline-draw, spotlight, pop-out, paper-cutout, extrude, hatch, dots, pulse, marching-ants, blink, inner-glow, ring.
* `HighlightCatalog` shows all 16 styles side by side so you can pick one.
* `CountrySpotlightGlobe` is the same scene on the satellite globe.
* `RegionMediaFill` puts **waving flags, photos or video inside a country or state, clipped exactly to its border**, so nothing spills into neighbouring areas. `media: "flag"` uses the area's own flag, and `"flag:jp"` picks one.

### 1 · Routes & paths
* `FlightPath`: great-circle flight, either geodesic or lifted 3D arc, with the plane turning to its heading, a live distance counter, real flight-time clock, HUD and arrival card. Mumbai→London measures 7,194 km.
* `VehicleRoute`: car, bus, train, bike, auto-rickshaw or ship **snapped to real highways or railways** (Delhi→Leh goes via Shimla and Manali), with a tilted 3D navigation camera. `mode: "street"` uses OpenStreetMap/OSRM street routing (needs internet). `trackFile` takes your GPX.
* `ParchmentCrawl`: Indiana-Jones-style red ink crawl on antique paper, with creases, burnt edges and a plane overlay.
* `ElevationTrail`: a trek drawn on **real 3D terrain** with a live elevation graph (gain/loss). Use a GPX file for the exact trail.

### 2 · Terrain & flyovers
* `DemMountainSweep`: drone sweep/orbit/flyover/reveal over real elevation data, with sun position, fog, snowline and peak labels (hidden behind ridges).
* `LowPolyTerrain`: the same with faceted low-poly styling.
* `MacroZoomDrop`: continuous dive from orbit to a place, with satellite imagery crossfading to vector detail, an altitude HUD and an optional dissolve into your footage.
* `LandmarkSwivel`: 360° orbit around a landmark miniature with a floating pin and tilt-shift.
* `TiltShiftCity`: toy-like miniature city with traffic and tilt-shift blur.

### 3 · Travel transitions
`MatchCut` (iris / window / zoom-blur / reverse into your footage), `GeoZoomPush` (satellite snap push with speed lines and flash), `HudOverlay` (GPS telemetry over footage or a 3D terrain chase, with circular minimap), `KineticLocationCard` (6 card styles), `SearchFlyTo` (search bar types the place, then the globe flies there).

### 4 · Isometric & infographic
`PopUpMiniatures` (3D landmark models spring up as the route reaches them), `ExtrudedCity` (isometric city; give it a GeoJSON of real building footprints via `buildingsFile`), `PulsingMarkers` (radar-ring targets with callout boxes that can hold a photo or video preview; it is a Map Composer preset, so you can add more layers).

### 5 · Historical & geopolitical
`FrontlineShift` (moving front lines, territory shading limited to chosen countries, military arrows, date ticker), `EmpireExpansion` (choropleth timeline with add/remove steps; the default is EU enlargement 1957→2020), `ParticleStreams` (migration/trade flows), `UnfoldingPaperMap` (a 3D folded map unfolds, then the route is drawn; the default is Vasco da Gama's 1497–98 voyage via coastal waypoints).

### 6 · Vlog integration
`SplitScreenTracker` (footage plus live route map: side-by-side, stacked or picture-in-picture), `PolaroidPinDrop` (polaroids drop at each stop and the last grows into the full-screen clip), `EarthZoomChain` (audio-driven zooms: set `beatTimesSec` and `music` and each zoom lands on a beat with whoosh, impact, shake and flash), `DayNightGlobe` (real sun position over time).

## Your own media
Put files in `public/media/` and reference them as `media/clip.mp4`. Put custom areas (GeoJSON) in `public/areas/` and use `file:areas/my-area.geojson` as a target.

## Accuracy notes
* Distances are geodesic (WGS84 mean radius). Flight lines are true great circles. Road and rail routes follow Natural Earth's major highways and railways, so they are slightly shorter than the real winding road (Mumbai–Pune 147 km vs ~150 km). Use `street` mode or a GPX file for exact roads.
* Vector detail is excellent down to about state and city scale. For street level, cut to footage (`endMedia`, match cuts).
* Historical defaults (Korean War fronts, Vasco da Gama route) are approximate illustrations. Replace them with your sourced data. Country shapes are modern borders.
* 3D landmark models are stylised miniatures, not survey models.

## Rebuilding data
`npm run build-data` re-downloads Natural Earth and NASA imagery and rebuilds `public/data`. `npm run make-sfx` regenerates the sounds.
