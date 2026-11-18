# Photo Parallax research, catalog part 2

Sheets viewed: every sheet of the 10 videos (2VfHQaHg0sI 2, sOWZgSLndE4 2, 5t4I0QmdJKw 2, xAQHyTDICs4 2, v0G8cciSJdM 2, c_-rCfqk2vk 2, XwC6W5yviNc 2, tomP8T_1H38 1, G5_Mm9WTcec 2, KRWGQ0SHy1E 2).

Caveat: tiles are ~5-11 s apart for the long videos (0.25 s apart for the two 8-13 s clips), so speeds/easing for long tutorials are inferred from neighbouring frames or from timeline/curve UI, not measured. Geometry numbers are rough estimates from thumbnails.

---

## 2VfHQaHg0sI | PARALLAX TOOLS - Free plugin for After Effects - Tutorial (382 s)
Watchable: YES (plugin showcase + UI walkthrough; useful). Channel intro 0:00 and sponsor bits skipped.

- 0:05-0:15 Demo: aerial fly-through between skyscrapers. Camera moves forward/down the canyon of buildings (dolly-in on Z), left/right building walls slide past faster at the frame edges than the far end (classic 3D-mesh parallax). Strong speed; near-constant velocity with a sharp rush.
- 0:15 Side-by-side "2D TRANSITION" vs "3D TRANSITION" labels: the same cut done as flat slide vs as a transition where the 3D mesh scene rushes through (ie. the tool offers a 2D and a 3D transition between photos).
- 0:21-0:26 City street with white van and bus: camera dollies straight down the street toward the vanishing point; at 0:26 a wireframe/grey backdrop appears showing the photo is a displaced 3D mesh ("to 3D MESH" label) – the street is a depth mesh, buildings walls are stretched planes that the camera can enter.
- 0:31 "100%" over a parking-garage corridor (one-point perspective, push straight in; ceiling lights streak past).
- 0:42 Dune landscape (smooth soft pan/rise), title "PARALLAX TOOLS FOR AFTER EFFECTS".
- 0:47-0:58 UI: panel of preset thumbnails (grid, ~2 columns x many rows); requires AE 2024.1+; 1:09 "APPLYING A PRESET": click preset, it is applied to the selected layer; 1:24 "optimized for Full HD resolution" (1920 max working res).
- 1:35 "REPLACING THE DEFAULT IMAGE": every preset ships with a placeholder photo; user swaps the image and the animation re-plays on it.
- 1:40-2:02 "Convert your 2D image to 3D MESH": uses the free web tool ZoeDepth (depth estimation) – upload photo, get depth map + 3D mesh (GLB/OBJ) (rendered as a black bowl-like mesh at 2:02, grey sphere-ish mesh at 5:07). Photo -> depth -> mesh is the workflow; no manual layer cutting.
- 2:07-2:49 Parking-garage mesh in AE: the mesh object is placed in a comp; a "Scene center here" arrow marks the pivot where the camera orbits/dollies around the scene centre.
- 3:00-3:05 "Loop Duration: 1.5 sec" then "3 sec": preset camera loop has a duration control (seamless looping camera move, 1.5 s or 3 s per loop).
- 3:10-3:48 Mountain sunrise: snowy ridge, sun with lens-flare orbs; camera sweeps/pushes forward over the ridge, foreground snow slides faster; bokeh/flare orbs drift (3:42-3:48). Warm/cold split grade (orange sun, cyan snow).
- 4:04-4:41 City aerial (cluster of towers) tested with several presets; 4:30 coast road with cliff (another test image, camera follows the road in).
- 4:46-5:02 Right-click/context menu + dialog = export/render settings (quick presets in a menu).
- 5:02-6:00 More aerial city top-down tilt shots (buildings seen from above, camera descends between roofs).
- 6:06 End card: big green text "TO MY..." over top-down skyscrapers (heavy 3D-moving background behind text).
- UI ideas: preset gallery with thumbnails; "replace image" slot; 2D vs 3D transition toggle; loop duration selector (1.5/3 s); scene-centre pivot gizmo; image->depth->mesh pipeline.

## sOWZgSLndE4 | After Effects Parallaxer V2 (403 s, Korean + English subs)
Watchable: YES for UI/logic (layer-stack parallax in AE). Flat vector demos at 0:05-0:17 are 2D cartoon parallax (skip look).

- 0:00 Foggy forest hero shot: foliage layers (big leaves in foreground, rocks, trees, fog, bright far background) – about 5-8 depth layers; camera drifts forward with foreground leaves moving most.
- 0:05-0:16 Flat cartoon demos: bird on a branch in front of picket fence and trees; poster-like people layers; shows the same engine works on vector art. Camera moves laterally (truck) with fence/foreground sliding fastest.
- 0:27-0:55 "Load the images and position them in a way that looks good": layers are separate transparent PNGs (tree, grass, rock, etc.) laid out in 2D first; stacking order = depth order.
- 1:07-1:29 Title "FOREST DEEP FOG" placed between layers (text sits inside the 3D depth, foliage overlaps the bottom of the letters = text integrated at a depth). Top layer in the list = FURTHEST from camera (order of distance from the camera; 1:18 caption).
- 1:35 Dialog: choose the 3D space size from 3 presets ("size that suits the situation of the scene").
- 1:40-1:51 After conversion layers become 3D "while maintaining the 2D position": the script computes Z so that layers look the same size as flat (scale-compensation: farther layers are scaled up).
- 1:51 Exploded/oblique 3D view showing layers as cards in depth; 1:57 black view showing camera frustum.
- 2:03-2:36 New in V2: select layers and press "Flat" to align them to the same Z (so grouped parts of one object stay coplanar); "+" and "-" buttons move selected layers farther/nearer; the top-view schematic shows layer cards as stems with dots at different Z and the camera as a triangle at the bottom.
- 2:59 "Bake the expression position" for speed (render faster).
- 3:15-3:49 "Now animate the camera": hotkey puts the camera at the position of the selected layer (3:21-3:43 keyboard graphic: click where you want the camera to go), enabling quick keyframing by layer.
- 3:55-4:17 Camera path shown as arcs in the motion path: parabolic arcs between layer stops; 4:06-4:23 "Unnatural movement can be seen at the edge of the layer" – when the camera moves too far, layer edges/holes show; fix: shows a top view with the camera path and layer extents (pink lines), and a corrected path that keeps within the safe zone (shrink the path). IMPORTANT for tool: a "safe range" or overscan limit for camera so holes don't show.
- 4:50-5:02 "Camera Depth creates distance-dependent blur, making the scene more three-dimensional": DOF blur driven by Z distance from the focus plane (foreground leaves blurry when focus is mid).
- 5:30-5:58 Fog: fractal-noise-3D plugin (paid) generates volumetric fog; place a fog layer between layers at specific depths so near layers are partially fogged; they use a blue solid + noise as fog sample.
- 6:03-6:09 Noise effect added for "film look" (grain).
- 6:20-6:37 Outro with final shots (forest push with rocks/leaves, cartoon forest with a cursor, bird & fence).
- UI ideas: layer list with depth order; "Flat" (group at same depth) button; +/- nudge depth; camera-to-layer hotkey; camera path preview from top view with safe-zone; DOF toggle; fog layer slot; grain toggle; "bake" (pre-render).

## 5t4I0QmdJKw | 3D Photo Zoom With Strobe Effect In Capcut (378 s)
Watchable: PARTIAL (amateur phone screen-recording, Hindi/English host; only the CapCut steps matter).

- 0:05-0:10 Preview: vertical portrait of a man jumping against sky, in a phone mock-up (9:16, centred card on yellow/white gradient).
- 1:08-2:00 CapCut mobile: photo laid on timeline, a copy duplicated to a second layer; a blurred, enlarged copy of the same photo under the sharp one (9:16 fill: blur background 2:21, 2:47 - zoomed, heavily motion-blurred version of the photo fills the frame while the sharp one sits as a smaller card).
- 2:05-2:16 Style tab -> "3D zoom"/photo style menu (thumbnail grid of styles) – the 3D Zoom style is a one-tap AI depth parallax (subject nearer/foreground moves, background moves less).
- 2:32-2:42 Effects grid (purple thumbnails; flash/strobe/glitch style effects); applied to short sections.
- 3:08-3:50 Several effect clips stacked on an effects track and cut into short bursts (strobe = repeated flashes on beat).
- 4:01-4:11 Add sound / beat markers: cyan beat bar on the audio track from 4:11 onward – strobe flashes are placed on the beats.
- 4:48-5:56 Repeating pattern of adding effect clips at each marker; some overlay a vertical flash that pulses between blurred-zoomed and clear photo.
- 6:02 Export (progress 45%) -> share screen. 6:12 End credit card.
- Features: 3D-zoom style (push-in with depth), strobe flash pulses on audio beats, blurred-copy background fill, short effect clips on a timeline.

## xAQHyTDICs4 | CapCut Tutorial - 2D Image to 3D Parallax Effect (285 s)
Watchable: YES (good "recipe" for what users expect: AI image -> remove subject -> weather overlays -> lightning). Intro avatar 0:00-0:04 skipped.

- 0:07-0:27 Showcase: hiker with backpack looking at mountain valley at dusk, "Parallax view" caption; lightning flashes in the sky (0:11 shows a white bolt left of the subject). Further showcase of AI stills (GTA-style man, soldier aiming gun with explosion behind, prison corridor 0:27) each with a push-in and subject/background separation.
- 0:31-0:55 Ideogram (AI image generator) used to make the base still with prompt "Mountain landscape with cloudy sky, winding road, city lights below, and a person standing on a rooftop watching"; style "Realistic", aspect 16:9.
- 1:03-1:38 Photoroom app: AI tools list = AI Backgrounds, AI Expand, AI Fill, AI Images, AI Shadows, Remove Background, Resize, Retouch, Upscale. Workflow: "Retouch" (erase brush, purple mask over the man at 1:19) removes the person, producing an empty mountain background plate (1:31) = the hole-fill / clean plate; "Remove Background" outputs the person as a cutout on a transparent grid (1:35-1:38). So 2 layers: clean background plate + subject cutout.
- 1:42-1:54 CapCut (mod APK): import both, place plate on main track, cutout on overlay track.
- 1:58 "Rain overlay" (video overlay of rain falling, blended with Screen/Lighten) and 2:02-2:10 overlay opacity slider; 2:14 filter strength slider.
- 2:22-2:50 Keyframes for overlay/subject: red marker circles show diamond keyframe button taps (camera move defined by start and end keyframes: subject scales/moves differently from the plate).
- 3:02-3:41 Effects > "Play Pendulum"-type video effect (sliders: Intensity, Twist, Speed, Sharpen shown 3:17-3:41); applied to the subject layer only ("Object" selector at 3:37 = effect applied to Object/ Overlay) to make a swing/sway parallax; slider values tuned (Twist 27).
- 3:57-4:13 Effects category "Nature": Lightning/Rain/thunder flash effect (4:05 white-flash lightning bolts across the sky; sliders Speed/Sticker/Filter); applied over the background layer (the bolts are behind the subject).
- 4:17-4:29 Result: 16:9 frame with blue horizontal scanline bars letterbox around the clip (stylised wrapper); another demo of the soldier still.
- Features: subject cutout + clean plate; weather overlays (rain, lightning); sway/pendulum effect with intensity/twist/speed/sharpness sliders; keyframes start-end; opacity sliders.

## v0G8cciSJdM | 2D Images into Stunning 3D Animations in CapCut with Parallax Effect (182 s)
Watchable: YES (short, clear recipe; AI image of soldier in fiery explosion).

- 0:02-0:10 Showcase loops: a soldier silhouette against orange explosions (rounded-corner frame, camera pushes in with the soldier moving up/forward while background fire barely moves), a leopard walking (0:07), a man in hat in dusty old street (0:10). All 16:9, warm orange teal-free grade.
- 0:12-0:40 Flow State / AI image generator UI to create stills (not relevant).
- 0:40-0:48 Close-up push on soldier: subject scales bigger than background (about 110-120 % vs 105 %).
- 0:50-1:10 Object-remover website (inpaint): brush size slider; brush paints purple over the soldier; the tool deletes him and fills the hole with continuous fire/explosion = clean background plate (1:03-1:10). Then a background-remover site gives the soldier cutout on transparent background (1:10 "Animation" label).
- 1:13-1:43 CapCut desktop: both images imported; background on main track, cutout on top; Transform panel: Scale, Position X/Y, Rotation with keyframe diamond; "make the character BIGGER" over time (scale keyframes 100 -> ~115 % on the subject vs 100 -> ~105 % on the background).
- 1:46-2:14 Video effect "Play Pendulum" (Details panel: Speed, Strength, Tone, Sharpen sliders; "Effect added" toast) – applied on the whole composite (1:48) to add a camera-sway; comment on screen: effects reduce quality after export (so "Rebound"/Sharpen helps).
- 2:19 Perspective-tilted plane of the same still on a dark stage floor (card rotated in 3D, as a mockup variant). 2:21 final: soldier large and sharp, fire background blurred.
- Features: two-layer (subject + plate) with different scale speeds; sway effect; sharpen compensation.

## c_-rCfqk2vk | How I Turned Simple Images Into Cinematic Scenes with CapCut (778 s)
Watchable: YES (best long tutorial; several documentary-style looks). Sponsor and generic website demo 4:08-5:02 skipped.

- 0:00-0:54 Montage of documentary stills: men in suits on a road with golden text "$45,790", hand in dark, warrior in mist, desert with "DOCUMENTARY STYLE" CapCut logo (0:32), two cowboys in town with shallow DOF (0:43). Each shows a slow push + subtle drift; dusty, desaturated warm grade.
- 1:04-1:26 Neon-line effects: yellow squiggle draws itself, a white musical staff with blue neon line, icons with glow = line/stroke animations drawn over black (not parallax).
- 1:37 Clock faces with glow orbs and light streaks – floating bokeh orbs rotating; 1:48 conductor in a dark hall with white glowing orbs floating in the foreground/background (orbs = atmosphere layers drifting at different speeds; foreground orbs blurred and larger).
- 2:09-3:03 Timeline: black-and-white still with fighters + red/orange tinted overlay layers; 2:42 over-exposed golden light glow washes over (light-leak/glow) with text "FEEL ALIVE"; 3:25-3:36 yellow-lit fighter with colour-adjust.
- 3:14 "A LIGHT" / 3:57 "DEEPER" title cards explaining steps; 3:47 hiker silhouette on a sunset ridge with orange/red clouds (strong sky gradient + silhouette).
- 5:02-5:35 "1ST LAYER": builds a scene bottom-up – stone floor plane (5:13, perspective ground at the bottom of the frame), then sky background (5:24 blue cloud sky behind a Roman warrior cutout), then castle background (5:35 red-dusk castle replaces sky). Layers: floor (near, bottom third), warrior (mid), sky/castle (far); shows placeholders red boxes where more layers go (castle towers).
- 5:45-6:29 Two portraits (old man and woman, side profile) cut out with the background-remover (black checkerboard) and placed on a black stage; each at slightly different scale.
- 6:40 close-up of two profiles on black with Contrast/Highlight sliders in Adjust panel (high-contrast B/W with chiaroscuro look).
- 7:01-8:08 Adding a globe + wooden desk in front (foreground props), with the two heads behind; scale of each layer keyframed separately; the globe is larger (nearest) and moves most.
- 8:17-8:28 Keyframe curve editor (graph with ease curve); 9:11 grid of easing presets (ease in / out / in-out) – 9:11 and 10:16 show the curves list; 10:27 customised curve. The animations use eased start/stop (ease in-out) on Scale and Position.
- 10:48-11:31 Adds a fire overlay (video of flames with black background, Screen blend) behind and in front of the heads; 11:21 ember particles overlay; 11:31 lighting on faces.
- 11:42-12:25 Colour grading: Adjust panel, "Color wheel" (Lift/Gamma/Gain-style wheels + Temp/Tint/Saturation/Brightness/Shadows/Highlights/Vignette sliders). End look: warm orange/teal split, deep vignette, sparks.
- 12:36 Final: push-in close-up of old man and woman with flames and sparks; slight camera sway, heavy vignette.
- Features: multi-layer scene (floor/subject/props/sky), eased keyframes, fire/ember overlay, orb/bokeh overlays, colour wheels, vignette.

## XwC6W5yviNc | The Kid Stays in the Picture "effect" 1 (13 s)
Watchable: YES (pure reference, 0.25 s frames; best view of the real effect on archive photos).

- 0:00-3.75 Title card: white two-line title on black, fades in 0:00-0:01.0 and out 3:25-3:50 (0.75 s fades, hold ~3 s).
- 4.0-7.75 Photo 1: B/W photo of a man on a glacier shore looking at a lake, jagged ice pinnacles in the right foreground, mountains behind. Over 3.75 s the camera pushes in/right: the ice pinnacles (foreground, bottom right) grow and slide off the right-bottom edge faster (~+25-35 %), the man (mid-left) drifts left ~+10 %, far peaks/clouds nearly static (~+3 %). Also the lake changes - fill of the hole behind the man appears stretched/smeared (visible from 5.5 s the dark blur on the lake) = stretch/warp fill. Ends with dip to black at 7.75 (fade out ~0.25-0.5 s).
- 8.0-10.75 Photo 2: B/W cycling race on a mountain road, cyclist in foreground right, vintage cars left, hillside behind. Over 2.75 s the cyclist rises/leaves the frame at the bottom (foreground cutout slides down, ~+60 % moves) while the cars and the hill move the other way/zoom in (camera pushes down-forward). Cut by dip to black again at 10.75.
- Very high contrast, clipped whites in the road (high-key B/W grade), slight film flicker/grain.
- 11.0-12.75 End card on black: "PAR" (red) and "FUNNYMAN" (white) sliding horizontally from opposite sides and swapping, crossing at 12.5.
- Features: three-plane cutout (foreground ice, subject, sky), push-in with foreground moving fastest, dip-to-black cuts, B/W high-contrast grade, stretched hole fill.

## tomP8T_1H38 | The Kid Stays In The Picture Effect (8 s)
Watchable: YES (one photo, 0.25 s frames).

- 0:00-7.75 Single B/W photo (Reichstag flag raising): red-flag (here grey) in the foreground and a soldier at the pole, background dusty ruins. Camera does a slow push forward with a small clockwise lean: the flag (large foreground, left) slides up/left and grows (~+12 % in 8 s), the soldier at the pole moves slightly right/down; the standing figures at top-right drift up and out of frame (~+15 % relative to the background); the ruined skyline behind moves least (~+4 %). The flag cloth also appears to wave: gentle fold animation on the flag mesh/layer (distortion warp) - possibly a separate warped layer.
- Constant slow speed, near-linear (no visible ease), the frame is a 4:3-ish crop.
- B/W with smoky haze/dust over the sky (faint atmosphere layer), no vignette hard edge but darker corners.
- Features: 3+ planes, push with rotation, cloth wave warp on a layer, haze.

## G5_Mm9WTcec | 2002 The Kid Stays in the Picture Official Trailer (90 s)
Watchable: YES (professional use of the effect and its surroundings; sample at 0.25-1.25 s per tile, so motion is inferred).

- 0:01-0:12 Opening: dark, shot through a mirror/oval-framed, faces of two people emerge from the dark foliage (low-key, heavily vignetted, glowing ovals); slow reveal from black (fade-in ~5 s). Probably multi-plane: mirror frame cutout in front, faces behind, leaves at edges.
- 0:12-0:13 Fast rotating abstract mask wipe (sectors of a mirror rotating) to a NYC street shot (taxi, neon signs) = rotary wipe transition.
- 0:15-0:48 Rapid montage, ~1.25 s per shot: photos of Robert Evans in the scene, each with a slow push and slight lateral drift. Presentation devices: B/W photo inside coloured light-leak borders, red curtain/theatre mask FX overlay with "FLMOROS" label (0:17), photo on top of a faded newspaper (0:20-0:21: "Robert Evans" over a yellowed paper = photo stacked on texture), pool photo with the headline "Businessman Dives in Pool, Comes Out a Movie Star" (0:21-0:22: newspaper clipping with the photo cut out and an inner photo moving at a different speed), crowd (0:23), colour tinted face (0:25: colourised/sepia tint), podium/red curtain (0:27), men in robes, white flash frames (0:30, 0:47 = full white flash between shots), Paramount arch (0:31) with blue sky, "The Godfather" title composited over faces (0:32-0:33: huge text overlapped by a photo layer in front), crowd of fans (0:35), magazine covers (0:36-0:38: "Screen Stories", "TIME"; magazine layers flying/tilting in 3D) with transition via blur-zoom.
- 0:40-0:42 Photo of a man on a pool lounger with the word "Chinatown" fading across it; same shot turned B/W at 0:41 and then lounge chair; text sits behind the subject partly (partial occlusion).
- 0:43 Orange sunset with a palm silhouette: sun disc and palm layers (flat colour sky).
- 0:45-0:58 More photo montage: B/W shot with a pipe; hands to face; magazine "10 most eligible bachelors"; 0:55 warm amber backgrounds with bokeh light orbs (0:56-0:58 yellow orbs on orange), motion blur on man walking.
- 1:00-1:06 Handheld-style frenetic: glasses silhouette with bars shadow; 1:01 radial/spin blur (spinning newspaper "Killing") – whip/spin transition; 1:03-1:05 text "led to murder" in distressed paper letters (typed text with blur, ghost trails).
- 1:08 Newspaper "The Man With the Golden Touch" next to a photo; 1:10-1:11 same headline fading under a night pool scene with blue glowing lines (light streaks).
- 1:12-1:15 Dark interior scenes (living room, theatre seats) – pushes with deep vignette.
- 1:16-1:24 Title card "THE KID STAYS IN THE PICTURE" over a cut-out of the man with large glowing green-yellow oval (light) shape; review-quote red banners (1:18-1:21) at lower centre; 1:22 red wipe; 1:23-1:26 credits block on dark blue background; 1:27 spiral "COMING SOON" tunnel.
- Features: ~1-1.5 s per photo, push/drift + white flashes, blur/whip transitions, newspaper/magazine layering, tint colourisation, bokeh/light streaks, text integrated behind subjects, rapid cuts on rhythm.

## KRWGQ0SHy1E | Bring Static Images to Life in DaVinci Resolve with this SIMPLE Trick (437 s)
Watchable: YES (talking head intro 0:06-0:24 skipped; screen tutorial is a full recipe).

- 0:00 Dark reveal of the knight on horseback (fade up from black).
- 0:24 Result: AI still of a knight in golden armour on a rearing horse with huge red cape and banner army in a warm dusty sky; camera pushes in gently, cape/flags in motion.
- 0:36 Resolve Magic Mask (purple AI selection of the knight+horse+cape) to isolate the subject. 0:42 subject exported on white background with long white "handles" = alpha. 0:48 the clean background plate: the knight is gone and the hole is filled with flags/clouds/army = AI fill / clone.
- 0:54-1:06 Edit page: timeline with two clips (background, subject) on tracks V1/V2 plus lighting tracks (colour-coded blue clips).
- 1:37 Light-ray / sun-beam overlay (orange rays from top-left on black) – added with Screen/Add blend; 1:49 same rays over the knight; 1:55-2:19 sliders to adjust intensity; "Hold Alt + Click and Drag" at 2:19 = duplicate/offset the keyframe or copy (a shortcut hint).
- 2:37 Embers/sparks particle clip on black (orange dots), blended Screen over the scene; the embers move upward and sideways, near embers larger/blurrier.
- 3:08-3:32 Fusion/Transform panel: keyframe Position, Zoom; the background plate is zoomed slightly (3:14-3:32 background alone moves while the subject is frozen to show different speeds).
- 3:38-5:51 Keyframe pass: top monitor shows only the background; timeline lane shows keyframes; each change = zoom 1.00 -> 1.08 on background, 1.00 -> 1.15 on subject; then position offsets so the subject shifts left while background moves slowly; the cape/flags foreground (4:45-5:27, frame filled with red flag) shows a separate foreground flag layer with the strongest zoom (big motion) = third layer.
- 5:58 Right-click -> context menu to add motion blur / smooth. 6:04-6:28 Transparent-checker view of just the subject with different positions (shifted to show only the subject cutout moving: scaled up with feathering, edge-softness).
- 6:40 Final render: knight close-up, cape in front of the camera, letterboxed black bars top/bottom (cinemascope 2.39:1 crop). 
- Features: subject cutout with AI mask; clean plate; 3 speeds; light rays + embers overlays; Edit-page keyframing with eased lanes; letterbox; talking-head intro.

---

# Merged features (families; counts of my 10 videos that showed each)

Count key: 2Vf=2VfHQaHg0sI, sOW=sOWZgSLndE4, 5t4=5t4I0QmdJKw, xAQ=xAQHyTDICs4, v0G=v0G8cciSJdM, c_-=c_-rCfqk2vk, XwC=XwC6W5yviNc, tom=tomP8T_1H38, G5=G5_Mm9WTcec, KRW=KRWGQ0SHy1E.

## Camera moves
| Feature | Details/estimates | Count |
|---|---|---|
| Push-in / dolly-in (scale + Z) | most common; background 3-8 % scale, mid 10-20 %, foreground 25-60 % over 3-8 s; straight toward the vanishing point for corridors/streets | 10 (all) |
| Pull-out / reverse of push | implied by "Loop"/bounce presets, 3D zoom styles | 3 (2Vf, 5t4, sOW) |
| Lateral truck / pan with parallax | foreground slides fastest; used on cartoon scenes and the road/cycling shot | 4 (sOW, 2Vf, XwC, KRW) |
| Vertical tilt/crane (rise or descend) | top-down aerial city, cyclist slides down | 3 (2Vf, XwC, tom) |
| Orbit / arc camera path around a pivot ("scene centre") | pivot gizmo, parabolic path arcs | 2 (2Vf, sOW) |
| Slight roll/lean | clockwise 1-3 deg during push (flag photo), tilted card mockup | 3 (tom, v0G, 2Vf) |
| Sway / pendulum camera (periodic) | Intensity/Twist/Speed/Sharpen sliders (CapCut Play Pendulum) | 2 (xAQ, v0G) |
| Loop duration (seamless camera loop 1.5/3 s) | | 1 (2Vf) |
| Camera-to-layer hotkey / path keyframes | click a layer, camera jumps to its Z | 1 (sOW) |
| Easing: ease-in-out Bezier curves; also near-linear slow moves | curve editor + preset grid; linear for archive photo | 4 (c_-, KRW, sOW, tom) |
| Safe-range clamp so hole edges never show ("unnatural movement at layer edge") | shrink path to safe extent | 2 (sOW, 2Vf) |
| Beat-synced strobe/zoom pulses | flash on audio markers | 2 (5t4, G5) |

## Layering & depth
| Feature | Details | Count |
|---|---|---|
| 2 layers: subject cutout + clean plate | simplest, works on AI stills | 4 (xAQ, v0G, c_-, KRW) |
| 3 layers: foreground/mid/background | foreground fastest | 5 (XwC, tom, KRW, c_-, sOW) |
| Many (5-8+) separately cut PNG layers placed in Z (foliage, rocks, sky) | layer list order = depth order; top = farthest | 2 (sOW, 2Vf partially) |
| Photo -> depth map -> displaced 3D mesh (ZoeDepth) | no manual cutting; stretched mesh walls | 1 (2Vf) |
| "Flat" (group layers at same depth) and +/- depth nudge | | 1 (sOW) |
| Scale compensation so 3D layers look 2D-correct at start | | 1 (sOW) |
| AI/Magic mask subject selection (Resolve Magic Mask, background-remover sites, Photoroom) | | 4 (xAQ, v0G, KRW, c_-) |
| Props/foreground objects added in front (globe, desk, floor plane, flags) | | 3 (c_-, KRW, XwC) |
| Text embedded in depth (letters between layers, partially occluded) | "FOREST DEEP FOG", "Godfather" title | 3 (sOW, G5, c_-) |
| Layer-specific effect (only subject or only background) | "Object" selector | 2 (xAQ, KRW) |

## Hole fill
| Feature | Count |
|---|---|
| AI inpaint/erase the subject to a clean plate (Photoroom Retouch, object-remover site, Resolve AI fill) | 4 (xAQ, v0G, KRW, c_-) |
| Stretch/smear/warp fill (edges of the removed object smeared; visible on lake behind man) | 1 (XwC) |
| Overscan/scale background so holes stay hidden (zoom bg >= subject offset) | 3 (v0G, KRW, sOW) |
| Camera clamp for mesh stretching (safe path) | 2 (sOW, 2Vf) |
| No fill needed because layers are separate transparent art | 1 (sOW) |

## Atmosphere
| Feature | Count |
|---|---|
| Fog / haze (volumetric fractal-noise layers at depth, dust haze on photos) | 3 (sOW, tom, c_-) |
| Light rays / sun beams (Screen/Add overlay, orange from top corner) | 2 (KRW, 2Vf lens flare) |
| Lens-flare / bokeh orbs drifting (large foreground blurred, small far) | 4 (2Vf, c_-, G5, KRW) |
| Embers / sparks / fire overlay (Screen blend, rising particles) | 3 (KRW, c_-, v0G explosion look) |
| Rain overlay | 1 (xAQ) |
| Lightning flashes | 1 (xAQ) |
| Smoke / dust / newspaper texture overlays | 2 (G5, tom) |
| Film grain / noise | 2 (sOW, XwC) |
| Light leak / white flash / glow wash | 3 (G5, c_-, 5t4) |
| Neon line/stroke drawing overlays | 1 (c_-) |

## Look & grade
| Feature | Count |
|---|---|
| B/W high-contrast archive grade | 3 (XwC, tom, c_-) |
| Warm teal/orange or amber split grade | 5 (v0G, c_-, KRW, xAQ, 2Vf) |
| Colour wheels / Lift-Gamma-Gain, Temp/Tint, Saturation, Highlights/Shadows sliders | 2 (c_-, KRW) |
| Heavy vignette | 4 (c_-, G5, tom, KRW) |
| Letterbox (cinemascope bars) or scanline bars frame | 3 (KRW, xAQ, G5) |
| DOF blur driven by depth (Camera Depth) / blurred foreground leaves | 2 (sOW, c_-) |
| Sharpen to compensate effect softening; "Rebound" artefact warning | 2 (v0G, xAQ) |
| Rounded-corner card frame / perspective plane mockup | 2 (v0G, 5t4) |
| Colourised/tinted still | 1 (G5) |

## Transitions & sequencing
| Feature | Count |
|---|---|
| Dip to black between photos (~0.25-0.75 s) | 2 (XwC, KRW) |
| Hard cuts at 1-1.5 s with white flash frames (trailer montage) | 1 (G5) |
| Spin/whip/radial blur transition | 2 (G5, 5t4) |
| Mask wipe (rotary mirror/segment wipe, red wipe) | 1 (G5) |
| 2D vs 3D transition (mesh rushes through) | 1 (2Vf) |
| Title card fade in / out (0.75 s) with hold ~3 s | 2 (XwC, G5) |
| Fade from black on reveal (~4-5 s slow) | 2 (G5, KRW) |
| Holds per photo: 3-4 s (archive docs), 1-1.5 s (trailer), 8-12 s (dramatic still) | 3 |
| End card with sliding text | 2 (XwC, 2Vf) |
| Beat markers / audio sync | 2 (5t4, G5) |

## Tool UI ideas
| Feature | Count |
|---|---|
| Preset gallery with thumbnails (apply to photo, replaceable placeholder image) | 3 (2Vf, 5t4 styles, xAQ effects) |
| Loop duration (1.5 / 3 s) and total length | 1 (2Vf) |
| Layer list with depth order, +/- depth nudge, "Flat" align, camera-to-layer | 1 (sOW) |
| Top-view/side-view schematic with camera frustum and layer stems | 2 (sOW, 2Vf) |
| Camera path preview + safe zone | 1 (sOW) |
| Keyframe curve editor with ease preset grid | 2 (c_-, KRW) |
| Sliders: Intensity, Twist, Speed, Sharpen, Strength, Tone | 2 (xAQ, v0G) |
| DOF toggle with focus distance; fog layer; grain toggle | 1 (sOW) |
| Scale/Position/Rotation keyframe per layer | 5 (v0G, c_-, KRW, xAQ, 5t4) |
| Blend mode on overlays (Screen/Add) + opacity slider | 4 (xAQ, KRW, c_-, v0G) |
| Colour panel (wheels, Temp, Tint, Vignette) | 2 (c_-, KRW) |
| Export presets / size choice (Full HD recommended) | 3 (2Vf, 5t4, sOW) |
| Magic-mask / erase brush with brush size for cutting and hole filling | 3 (xAQ, v0G, KRW) |
| Hotkeys (Alt+drag duplicate, camera-to-layer) | 2 (KRW, sOW) |
