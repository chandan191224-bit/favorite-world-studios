# Photo Parallax Studio - research catalogue, part 1 (10 videos)

Method and caveat: every 6x6 contact sheet (2 per video, all 20 viewed) was read. Almost all ten videos are screen-recordings of After Effects / Photoshop / Resolve, so the sheets show the tutorial's *workflow* (layer panels, 3D views, graph editor, finished result at the start/end) rather than a continuous finished clip. Tile spacing is ~4-30 s, so speeds/durations of camera moves are estimates from the tutorial's own keyframes and from the finished-result tiles; items marked (inferred) come from the setup shown (camera dialog, layer stack, ellipse path) rather than the moving result. Timestamps are the yellow tile stamps (h:mm:ss or m:ss).

---

## 1. FNxpe0AUnfk - "2.5D Parallax in 1 Minute - Quick After Effects Tutorials" (322 s)
Watchable: partly. Flat vector illustration (sky, 2-3 mountain ridges, yellow hills, house + cypress trees, clouds). Only 0:00-0:13 and 4:28-5:08 show the finished look; rest is AE UI. Useful for the *rig* and for edge-reveal problems.
- 0:00-0:09 finished piece: gentle push-in on the flat landscape (frame shrinks inside AE viewer at 0:09-0:18, i.e. camera is moving back/out of the comp, vector scene recomposed in a 3D view).
- 0:22-0:36 the layers are shown "exploded": each cutout is a flat card at a different angle/depth, flying apart then re-collecting (the classic exploded-layer-stack view). Shows the scene is simply N flat cards spaced on Z.
- 0:40-0:58 sky layer isolated (pale blue + mountain silhouette); 0:44 AE Camera dialog (35mm preset) - virtual camera with a null/pivot (pivot crosshair 0:53-0:58).
- 1:02-1:56 side (custom/top) view: layers laid out along Z, yellow hills nearest, sky farthest. White wedge at 1:11 = the sky card seen edge-on. Z spacing is hand-set, background ~3-5x farther than foreground (inferred from the view).
- 2:09-2:36 background layers must be SCALED UP after being pushed back (blue sky card larger than frame at 2:09, 2:27) so that its screen size stays the same - the standard "move back + scale up" compensation.
- 2:41-3:34 clouds: separate white layer, hand-keyframed drift left->right on position, independent of camera (idle motion layer); 2:45 cloud strip shown wider than frame so it can slide.
- 3:43-3:48 camera slides right and a blue strip + orange cliff edge is exposed at the right border = "edge reveal" artefact when the card is narrower than the camera path needs.
- 4:28-4:50 same camera move with black slivers at right edge (4:37, 4:41) and layers cropped (4:46-4:50) - again edge exposure; fix = make cards wider / scale up.
- 4:55-5:08 final loop: slow lateral truck + slight push, hills move faster than mountains.

## 2. CjUeDBbdG_o - "4 steps to animate your photos in after effects - 2.5D parallax" (910 s)
Watchable: yes, the best structured one for photo-from-single-image. Subject: still of a man on a horse with banners (Ramsay Bolton still), battlefield behind.
- 0:12-0:38 title card with four tool icons (cursor, lasso/mask, pin, light-burst) = the 4-step workflow: select subject, fill the background, build 3D camera, finish with light/blur (icons read, content inferred).
- 1:15 subject cut out on white/transparent: person+horse, cut cleanly; black region left at the bottom = missing area where the horse's legs/ground were not in frame.
- 3:09-5:03 red overlay = the subject selection ("Select Subject"/Roto mask) on the plate; 3:47-4:12 subject mask grown/refined (feather); the hole behind is filled in the plate (content-aware fill / generative expand): 4:38-4:50 shows a background plate with the soldiers blurred out and a black wedge at lower-left still unfilled; 5:03 fill complete.
- 6:44 the flag top-left is cut as a separate small layer (midground banner), 8:13-9:28 head/face is cut as an EXTRA layer (profile of face on transparency) so the face can parallax separately from the body: 3 layers min (background plate, body/horse, head), optionally banner.
- 9:41-11:22 camera + lights set up; 11:35 / 11:47 Graph Editor: bell-shaped speed curves (pink) = ease-in/ease-out on camera position keyframes; the shape is an ease with long tail (slow start, fast mid, soft stop).
- 12:25 and 13:16 camera pushes into the face: frame crops from full battle to head+shoulders (~1.0x -> ~2x apparent). 13:54 strong foreground DEPTH-OF-FIELD blur (soft shoulders in focus-pulled foreground) at the end of the push.
- 14:07-14:19 final: slow push-in on subject, background drifts at smaller rate, subject + flag move slightly differently. 5:28 a second sample (castle on water with fence) shown with grid warp lines = mesh/perspective grid for foreground fence plane.

## 3. -rgJDVkcE0g - "Create 3D Parallax in After Effects - Urdu/Hindi" (803 s)
Watchable: partly (talking head half). Landscape sunset: pink/orange sky, snowy mountain, dark pine forest.
- 0:11 finished preview: huge word "NEW YEAR" sits BETWEEN the pines and the mountain: text placed in depth between layers (pines foreground, text, mountain, sky) while camera pushes in.
- 2:02-2:58 sky expanded: white void to the right of the sky is filled to make the sky wider than the frame (canvas extend + content-aware fill) - the sky is a wide panorama so a lateral move has no empty edge.
- 3:20-3:42 mountain selected (magenta quick-selection) then deleted background -> transparent PNG; 3:54 mountain pasted onto the sky strip.
- 4:27-5:01 forest: magenta selection, grey-white sky removed, then levels/curves crushed to near-black silhouette (5:01); 5:12 pine layer overlays with a faded, hazy top (blue haze - atmospheric perspective: 5:12 hazy, 5:23 fully dark).
- 5:34-6:41 final panoramic strip: sky (back) -> mountains (mid) -> pines (front), all wider than frame. Fog/haze gradient on pine bases.
- 7:48-9:06 AE: layers set 3D; 8:55 camera triangle + null view; 9:50 layer rows show Position keyframes on camera; 10:02-12:38 camera slow forward push through the pines with side drift; foreground pines move fastest, sky almost static.
- 12:49 summary, 13:00 closing card ("khatm shud" = finished).

## 4. dna4O_hI6vw - "2.5D Landscape Parallax Animation in After Effects" (504 s)
Watchable: yes (finished flat-vector piece shown many times). Desert: teal sky, big cream sun with glow, red-orange cliffs, cactus, camel caravan, birds.
- 0:00 finished loop: bird on the left cliff, sun large centre. 0:13-0:55 full-scene view.
- 1:02-1:16 colourful control rig overlaid on the scene (many coloured paths/handles = per-layer position/rotation paths drawn on the comp, rainbow curves) - layers each have a motion path.
- 1:16-2:05 camera pulls far back: the exploded 3D scene viewed from the side, stack of cards (cliffs front, camels, mountains, sun, sky) with dark gaps between them - 6-8 cards.
- 2:12-2:19 layers selected, sky teal fills behind; red ground slab sliding in = depth layers offset.
- 2:47-3:22 sun gets a glow/bloom (2:47 plain disc, 2:54 bright bloom halo): glow effect on sun layer; birds are tiny dark layers flapping/moving across.
- 3:29-4:04 camel line walks left->right (position keyframes), 4:53-5:28 camel x position changes between tiles.
- 4:04 camera dialog; 4:25 menu: New > Camera.
- 5:35-6:03 camera pushes in hard toward the sun: foreground cliffs slide off-screen left, sun + sky fill frame (zoom ~3-4x on the far layer), sun bloom stays big.
- 6:10-6:17 camera roll/Dutch tilt: whole frame rotates ~5-8 degrees while still moving (tilted layer frame at 6:10, 6:17) then levels at 6:24.
- 7:20-7:34 slide to the right; 8:02 camera passes behind the right cliff: right cliff sweeps across the frame and exposes sun and sky - overlap/occlusion reveal.
- Loop: short 8-10 s finished move with slow ease; birds + camels continue animating independent of camera.

## 5. GZimVBFSGm0 - "BRING YOUR PHOTOS TO LIFE using 2.5D parallax | Photoshop & AE" (1111 s)
Watchable: yes. Photo: man in maroon hoodie reaching up beside a pond, green bushes background, reflections on water.
- 0:00 finished: slow push-in on the man with fog on the water; 18:00-18:15 shows mist/haze band drifting across the water at left-bottom, a "fog layer" in front of the background, behind the man.
- 2:18-2:49 the subject's hoodie/torso is enlarged for inspection: lower body below frame bottom is missing, so the cutout is extended downward (content-aware fill/clone) because the push-in and camera tilt expose below the original frame (2:34 dark band = canvas extended and partly filled).
- 3:05-3:36 subject mask: lasso/subject-select outline (white outline), 3:36 clean silhouette on checker (transparent) - white cut shape of arms/hood.
- 4:06-5:08 the area behind the subject (where arms/head used to be) is painted: head close-up (4:37 side head, 4:53 head, 5:08 hood fabric) = checking fill quality / Heal brush on hair edges.
- 6:41-7:27 canvas extended with guide lines (extra headroom/ground around the photo).
- 7:12-9:00 Photoshop Video Timeline with purple clips - used to make quick preview; 9:15-9:30 a Transform/Perspective dialog.
- 10:32-13:37 AE: camera dialog at 11:19 (50mm preset), layers 3D; 11:34-12:36 a black "frame" with the comp showing layers in camera view - background/subject/water layers offset.
- 12:51 onward: white mist appears over water; 14:39 the lower-body layer (jeans) shown extended; 15:10-17:44 refinements; 17:29 an effects dialog (probably fractal-noise or Turbulent Displace) for fog.
- Look: warm orange/olive grade, slight dark vignette edges.

## 6. 7tVyu-rjHbg - "Create a 3D Scene from a Single Photo in After Effects" (1772 s)
Watchable: yes, the most complete (30 min). Photo: Budapest tram on riverside, people on a bench, bare trees, bright hazy sky.
- 0:00 finished: gentle push through scene; 0:24 intro shows scene tilted as 3D plane in space ("Animation starts at 14:02" label).
- 1:13-2:52 bench + people cut out (bench slats with transparent gaps) - difficult edge, via Select & Mask.
- 4:30-4:55 trees selected with red-overlay mask (branches need hair/refine edge); 5:20 final trees.
- 5:44-7:23 the tram is a close inspection; 7:47-9:26 tram extracted onto transparent canvas as one long thin strip (separate moving layer).
- 10:40, 11:05-11:29 the hole where the tram was is filled (railing + ground preserved); 11:29 shows the background plate without the tram: railing only (content-aware fill / clone of the railing line).
- 12:43-13:32 sky replaced with a Chicago skyline/blue sky/water composite (new sky layer + water strip) - "sky replacement".
- 14:22 import PSD as comp, layers kept; 15:11 3D layers shown as planes in perspective; 17:14-17:39 ground plane laid flat (rotated 90 degrees on X) so camera moves along the ground - the ground is a 3D floor card in perspective, 20:06 ground texture close-up.
- 22:10 trees pushed out left/right as side flats; 22:34 bench + people closeup; 22:59 cohesive layers.
- 23:23-24:37 tram on black, animated sliding left->right across (independent moving layer behind railing, ahead of skyline); 25:02-26:40 tram passes behind foreground bench/trees.
- 27:30 sun glow + flare added behind the right tree (orange glow); 27:54 removed to compare. 28:44 end: whole scene rendered with camera tilted - black corners visible (edge limits of plane).
- Camera: slow dolly forward + small lateral slide (pos Z + X) with keyframes eased; foreground trees/bench move fastest, skyline slowest; depth order: bench/people (front) -> trees -> railing/ground -> tram -> skyline -> sky.

## 7. DFs_EpjZ_mU - "Premium MagnatesMedia's Animation for Free 2024" (492 s)
Watchable: yes. Documentary-style still: three elderly men in suits, grain silos at dusk, dramatic sky. (MagnatesMedia style = documentary B-roll "magnate" look.)
- 0:27-0:41 backdrop = industrial plant in blue hour (stylised/AI image); 0:41 men composite in Photoshop; layers: backdrop, businessman 1, businessman 2, sky, text.
- 1:08-1:35 PSD import into AE as composition - Retain Layer Sizes (dialog shows "Import Kind: Composition").
- 2:09 sky layer replaced with warm cloudy sky.
- 2:23-2:37 New > Camera and New > Null Object; 2:30 camera settings dialog (35 mm). Layer list at 2:50: text, camera, null, men, backdrop, sky.
- 3:04-5:07 camera parented to a null (rig): 3-panel view (comp, left, camera). Keyframes on the null: slow push and tilt.
- 5:14-6:15 Graph Editor speed curve (green/blue bell) = easy-ease on the null's position.
- 5:34 camera tilts down/pans along the silos (left silos with man cropped), 5:41-5:48 sky fills frame (camera tilt up to sky), so the move is: wide -> push + tilt up through men to sky then settle.
- 6:22-7:24 a thin inner BORDER frame (double rectangular outline around the picture) - a boxed "frame" overlay; 6:29-6:36 the framed result; 7:44-7:58 final: grit vignette dark corners, cold-blue grade with orange window lights.
- Look: heavy dark vignette, teal-blue cold grade, orange practical lights, soft focus on distant silos.

## 8. HDf5JHhuMmI - "Advanced 3D Documentary Animation in AE - 3D History Slideshow" (1430 s)
Watchable: yes, very relevant: this is the "documentary photo in 3D space" look. B/W photos (Freedom March, WWI stone relief) on planes in a black void.
- 0:00 finished result: B/W stone relief "1918 WORLD WAR" - photo plane floating in dark space with a lit floor, red year chip + white bold caption lower-left.
- 1:39-3:18: the photo is a flat 3D card in a black 3D space with a camera and a null; planes angled a few degrees.
- 3:38 blue solid; 4:38 / 4:58 fractal-noise black/white clouds (grey, then high-contrast splotches) - used as floor texture/ displacement/ smoke matte.
- 5:18-6:17 floor plane under the photo with noise texture reflecting / fading (black-white splotches plane) - "ground fog / dirty floor".
- 6:37-7:17 spot light/light cone on photo; 7:57-8:36 dark smoke noise (very low contrast grey) drifting in front of photo.
- 9:16-11:35 elliptical orbit guides around the photo (white/blue ellipse at ground level then vertical): camera orbit path around the photo card; perspective ellipse at 9:16 (flat), 9:36 (bigger), 11:15 (blue ellipse around card).
- 11:55 Graph Editor: sharp ease curve (fast attack, long decel) on camera orbit/position.
- 12:35-15:34 big bold sans caption "FREEDOM MARCH": starts small bottom-left with red "1963"-style chip; 12:55 huge text fills frame; 14:34-15:34 text sits on a plane IN FRONT of the photo (bottom half), partly overlapping, letter-by-letter reveal; red box beside it.
- 16:14 black space with grey smoke; 16:53 photo tiny and far away.
- 17:13-18:33 a second plane is placed to the right (18:33 two photo planes side by side) - camera slides right to the next slide = sequencing by camera move along a row of cards.
- 19:13 close-up of crowd faces (camera dives into photo, ~4-5x zoom) then 19:32 pulls back to caption.
- 19:52-20:12 Curves/linear graph; 21:32-22:31 next photo (stone relief) arrives, caption "WORLD WAR" with red year, same template.
- Look: B/W, high contrast, black surround, soft vignette, grain-like noise floor, red accent chip for year/ date, bold condensed type.

## 9. ZxvWQNoMcAU - "Historic Photo Video Slideshow Animation in AE" (1466 s)
Watchable: partly (only first minute + results). More "paper/ink slideshow" than parallax; still useful for the documentary look.
- 0:00 b/w museum hall with arches + lower-third label "1981 / BEAUTIFUL AMAZING AND RICH" - black bar with year in large light type.
- 0:20 torn-paper diagonal reveal over grey map; 0:40 "UNLEASH 1967 THE HISTORIC CULTURE" label on Colosseum ruins, orange glow (warm sunset grade) against dark background with torn/ink-splat edge.
- 3:03-4:04 ink-splat matte (black blot on white then white blot on black) used as an alpha matte; 3:44 / 4:24 curves control on the matte; 4:24 photo revealed only where ink is white.
- 5:46 paper texture grey; 6:06-7:28 hand-drawn line-art map (white with black contours) used as a dark low-opacity texture behind (the elliptical vignette lines at 6:47-7:07).
- 7:48-10:51 combining: photo fades from black through ink blob into dark background with faint map lines; edges ragged grey (ink bleed).
- 12:13-16:57 ink-blot reveal tuned: 13:14 whole composition scaled down (pull-back) then back; 15:36 position-keyframe bell curve; 17:18 brighter/warm look with grain.
- 18:19-24:06 text: "UNLEASH / THE HISTORIC CULTURE" typewriter-style monospace type in black label boxes, typed in letter by letter with a cursor (20:01 "THE H"); "1967" number counts up from 1 -> 1967 (21:43-22:24) and eases to rest; 22:44 curve for number speed.
- Look: desaturated + one warm orange accent (flames/sky), paper grain, dark vignette, ragged ink edges, typewriter titles, small year counter.

## 10. 1M3WxnHJq5c - "Stunning 3D Camera Effect (No Plugins, Free Version!) / DaVinci Resolve" (653 s)
Watchable: mostly UI (talking head + Fusion node view); only technique is relevant.
- 3:28-10:34 Fusion page: node graph (Image/MediaIn -> ImagePlane3D -> Merge3D + Camera3D -> Renderer3D); 4:13-5:17 3D viewer showing a camera frustum (blue wireframe lines) and the image card in a grid; 4:22 PIP of the card in space.
- 5:44-6:29 shot sequence: warm backlit portrait (orange lamp) seen from farther -> closer; 6:20 spline editor shows keyframe curves for camera Z / rotate.
- 7:15-7:33 card plus overlay of a YouTube comment (text/graphic plane placed in front of image) shown as separate card in 3D.
- 9:49-9:58 camera swings very close to the card: heavy defocus blur on the foreground (9:58 blurry face) - fake depth-of-field blur ramp as it nears the lens, 10:07 orange glow edge.
- Takeaway: single plane + 3D camera gives free moves; lighting wrap/ blur added in Fusion; no plugins needed.

---

## MERGED FEATURE LIST (counts out of 10 videos)

ids: FNx=FNxpe0AUnfk, Cj=CjUeDBbdG_o, rg=-rgJDVkcE0g, dna=dna4O_hI6vw, GZ=GZimVBFSGm0, 7t=7tVyu-rjHbg, DF=DFs_EpjZ_mU, HD=HDf5JHhuMmI, Zx=ZxvWQNoMcAU, 1M=1M3WxnHJq5c

### Camera moves
- Push-in / dolly-forward along Z (main move; layers separate because nearer ones scale/shift faster): 8/10 (FNx, Cj, rg, dna, GZ, 7t, DF, HD)
- Zoom-into-detail (hard push, 3-5x, ends on a face/sun/crowd): 5/10 (Cj 12:25-14:19, dna 5:35, GZ 4:37, HD 19:13, 1M 9:58)
- Pull-back / reveal: 4/10 (FNx 0:09, Zx 13:14, dna 1:37 exploded view, HD 19:32)
- Lateral truck / pan (X slide, with panoramic wide layers): 6/10 (FNx 4:28, rg, dna 8:02, 7t 25:02, HD 18:33 slide to next card, GZ edge)
- Tilt up/down (vertical reveal, ground -> sky): 3/10 (DF 5:34-5:48, GZ canvas extended below, 7t ground plane)
- Orbit / arc around subject (camera path as ellipse): 2/10 (HD 9:16-11:35, 7t 28:44)
- Dutch roll (frame rotates 5-8 deg while moving): 1/10 (dna 6:10-6:17)
- Camera + null rig (camera parented to null; animate the null): 4/10 (FNx, dna, DF, 1M)
- Easing: eased speed curve (bell/easy-ease, long tail) shown in graph editor: 7/10 (Cj 11:35, DF 5:55, HD 11:55, Zx 15:36, 1M 6:20, FNx, GZ)
- Idle/ambient motion of single layers independent of camera (clouds drift, camels walk, birds, tram pass): 4/10 (FNx, dna, 7t, Zx via number/ink)
- Focal length presets: 35 mm and 50 mm cameras: 4/10 (FNx, dna, GZ, DF)

### Layering & depth
- Subject / background two-layer split minimum: 5/10 (Cj, GZ, 7t, DF, 1M)
- 3-4 layer split (subject, midground element, background, sky): 7/10 (Cj head+body+bg, rg, 7t, DF, dna, FNx, GZ)
- 6-8 card exploded stack on Z: 3/10 (FNx 0:22, dna 1:16, 7t)
- Separate head/face layer for face parallax: 1/10 (Cj)
- Ground/floor plane rotated flat so camera moves "over" it: 3/10 (7t, HD floor, rg)
- Move-back + scale-up compensation for far layers: 2/10 (FNx, dna)
- Text placed in depth between layers (title behind trees / in front of photo): 3/10 (rg, HD, DF text layer)
- Wide / panoramic cards (extra width so lateral slide never exposes edges): 3/10 (rg sky, FNx, dna)
- Selection method: Select Subject / Select & Mask / quick selection (magenta/red overlays) before cut: 5/10 (Cj, rg, GZ, 7t, DF)
- Detailed tree/branch masks: 2/10 (7t 4:30, rg)

### Hole fill (behind the subject)
- Content-aware fill / generative expand for the plate behind the cutout: 5/10 (Cj 4:38, GZ, 7t 11:29, rg 2:02, DF)
- Clone / heal brush patching: 3/10 (GZ, 7t, Cj)
- Canvas extension (above/below/sides for sky and ground): 4/10 (rg, GZ, FNx via bigger cards, 7t)
- Scale-up of background so holes never show: 3/10 (FNx, dna, Cj)
- Edge exposure artefacts shown (black slivers at the border): 3/10 (FNx 4:37, 7t 28:44, Cj 4:50)
- Remove-moving-object-then-reinsert (e.g. tram extracted, background rebuilt, tram animated across): 1/10 (7t)

### Atmosphere
- Fog / mist layer between background and subject: 3/10 (GZ 18:00, HD, rg haze)
- Procedural noise smoke/dark fog (fractal noise): 2/10 (HD, Zx)
- Sun glow / bloom / lens flare: 3/10 (dna 2:54, 7t 27:30, 1M glow)
- Light cone / spotlight over floor: 1/10 (HD)
- Atmospheric perspective haze (far layers lighter/bluer): 2/10 (rg, FNx)
- Birds, camels, tram, clouds as moving sprite layers: 3/10 (dna, FNx, 7t)
- Dust/embers/rain/snow: 0/10 (not shown; embers present only as colour in Zx)
- Ink / paper / map textures behind photo: 1/10 (Zx)

### Look and grade
- Dark vignette: 4/10 (DF, HD, Zx, GZ)
- Cold teal vs warm orange grade (documentary cinematic): 4/10 (DF, GZ, 7t, Zx)
- Desaturated / B&W with one accent (red): 2/10 (HD, Zx)
- Film grain / noise: 2/10 (HD, Zx)
- DOF / foreground blur ramp (rack focus): 3/10 (Cj 13:54, 1M 9:58, GZ)
- Letterbox bars: 0/10 (not clearly shown)
- Thin inner frame border: 1/10 (DF)
- Silhouette crush on foreground (levels so trees go black): 1/10 (rg)

### Transitions and sequencing
- Camera slides to next photo card sitting on the same row: 1/10 (HD 18:33)
- Torn-paper / ink-blot reveal between images: 1/10 (Zx)
- Fade through black between slides: 2/10 (HD 18:53, Zx 8:49)
- Lower-third caption with year chip + number counter animation: 3/10 (HD, Zx, DF text)
- Typewriter / per-letter text reveal with cursor: 2/10 (Zx, HD)
- Text scaled huge in front of image then shrunk to caption: 1/10 (HD 12:55)

### Tool UI ideas (from what AE/Resolve expose)
- Camera preset dropdown (35/50 mm; preset camera types): 4/10
- Layers panel with Z/depth value per layer + exploded 3D side view: 6/10
- Camera path / ellipse widget for orbit: 2/10
- Null/pivot object for rig: 4/10
- Graph editor for ease: 7/10
- Selection helper: AI subject mask + manual brush with red overlay, feather slider: 5/10
- Fill-behind-subject step (inpaint) with preview of the hole: 5/10
- Extend canvas (sky/ground) control: 4/10
- Fog layer control (opacity, speed, noise scale): 3/10
- Border/frame and lower-third template controls: 2/10
