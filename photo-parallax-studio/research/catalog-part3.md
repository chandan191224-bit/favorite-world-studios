# Photo Parallax Studio research - catalog part 3

Source: contact sheets (6x6 tiles) of 10 YouTube videos. Sampling interval varies per video (0.25 s up to ~6 s), so move speeds/durations are estimates from tile-to-tile differences. Findings marked (inferred) come from on-screen UI/captions rather than a seen result.

---

## 1. tzDiLPMKCRw - Bring Still Image into 3D Cinematic Animation - DaVinci Resolve Tutorial (512 s)
Watchable: YES (tutorial; result clips at 0:00-0:35 and 8:00+; method visible in Photoshop + Resolve Fusion/Edit screens).
- 0:00-0:35 Result reel: AI "night mountain + campfire + sitter" still brought alive. Look = teal/blue night grade, orange fire as only warm accent, heavy vignette, slow push-in on whole frame; sitter silhouette + fire foreground moves a little more than distant mountain/sky. Also 0:14 "Before/After" tag on a back-view man over a city-lights valley, 0:21 a light-ray beam sweeping across the mountain (overlay).
- 0:42-1:25 Layer split in Photoshop: duplicate photo, rename "Foreground" + "Background", use Object Selection / mask to cut the foreground (sitter + rocky ridge) to a transparent PNG; hide it and keep a "clean background". 2 layers only.
- 1:25-1:40 Hole fill: Photoshop Generative Fill on the empty selection behind the cut-out ("remove it") to rebuild the sky/mountain behind the subject; clean BG exported as JPG, FG as PNG with alpha.
- 1:46-2:45 Side tangent: Lovart/Nano Banana style web tools used to generate/edit the images (not parallax).
- 3:12-4:08 Resolve Edit page: both layers on timeline, matched durations (~7 s clip); FG over BG in Fusion. 3:26 a second back-view man in fog photo shown as an example for the overlay method.
- 3:54-4:16 Overlays: add stock "embers/sparks" footage over the picture, apply Composite Mode = Screen to drop the black (4:01-4:08); a polygon/mask isolates the area where embers should appear (4:16 polygon over the fire/mountain slope).
- 4:23-5:12 "Bonfire" local effect: Fusion node with the BG made transparent; fire glow/flicker added by animating brightness on a masked area (polygon mask around fire at 5:05), grades set to match light.
- 5:12-6:24 Resolve "Warper" (Fusion warp/mesh): pin points placed on the sitter's head/body (5:41-6:16 white/red pins) to add subtle idle breathing / head motion = "living subject" micro-animation, with other pins locking the rest of the image so only a small region moves.
- 6:31-7:28 Camera move via Transform keyframes per layer: BG Zoom 1.0 -> ~1.05-1.1, FG zoom slightly larger, (start key at 0, end key at the end of clip; keyframes auto-created). FG moves faster "since the foreground is closer to the camera". Both set to the same duration.
- 7:35-8:24 Result with exaggerated version: motion-speed value pushed to ~3.0 for a "more exaggerated effect"; the fog-valley city shot gets stronger parallax with fog and lights drifting.
- Techniques: 2-layer FG/BG split; generative fill hole fill; keyframed zoom with different amounts per layer; masked localized animation (fire flicker, breathing warp); Screen-mode embers overlay; teal grade + vignette.

## 2. aMpf8AOJVzs - Make Your Photo Come Alive with 3D Parallax | Photoshop & After Effects (125 s)
Watchable: YES (fast screen tutorial, full workflow Photoshop -> AE 3D camera).
- 0:00-0:05 Result clip: man in yellow jacket on rock, red-rock canyon mountains behind, sky. Camera makes a slow push/dolly in with the man + rock moving ~larger and mountains/sky lagging; sky shows slight drift; label tag "Parallax".
- 0:08-0:36 Photoshop: duplicate layer (Ctrl+J), make 3 layers: (1) foreground = man + rock (select subject, mask), (2) midground = mountains (select + mask, Backspace to erase subject area), (3) sky/background. 3 depth layers total.
- 0:24 Photoshop "Contextual Task Bar -> Generate" / Generative Fill and 0:30-0:36 refill under cut layers to repair holes where the man is cut from the mountain (content-aware/generative fill into the mountain layer behind the man; and 0:39-0:55 same for sky behind mountains).
- 0:39-0:50 Sky layer: skyline edge is selected and a flat light-blue (picked with Color Picker 0:43-0:47) gradient/fill is painted behind the horizon to extend the sky downward beyond the mountains so the mountain layer can move freely.
- 0:57-1:00 Exports as layered PSD / separate PNGs imported into After Effects.
- 1:02-1:19 In AE: layers stacked, 3D layer switch enabled for all; AE "You created a 3D layer" hints. Camera added (1:30-1:33 Camera Settings dialog: One-Node camera, ~50mm preset), then Z positions set: foreground z ~ small (near), mountains mid, sky far (1:19-1:26 view from top shows layers separated along Z axis in an orbit view).
- 1:19-1:26 Layers scaled up (S key) to compensate for being pushed back so each still fills frame (size compensation = distance ratio).
- 1:33-1:52 Camera keyframes on Position (P key): Z moves forward, plus a small X/Y drift; easing via easy-ease; preview shows the final push-in with parallax between the 3 layers.
- 1:54-1:56 Final: camera ends slightly pulled in; fine, smooth ease-out.
- Techniques: 3 layers (FG, mountains, sky), generative fill for holes + sky extension, true 3D with Z spacing + scale compensation, one camera push-in with easy-ease.

## 3. ZqkTMcl3xRI - PIXALOOP PHOTO ANIMATION - HOW TO EDIT PICTURES WITH ANIMATION (194 s)
Watchable: PARTIAL (phone screen recording pillarboxed in a 16:9 frame with ad borders; UI visible but small).
- 0:00-0:06 Result teaser: woman in orange jumper, green bokeh background, left half dissolves into particle dust/disintegration (Thanos-style dust fragments drifting) and vertical caption "ANIMATED PHOTOS". This is Pixaloop's "particles / dispersion" style effect on the subject.
- 0:08-0:13 Open Pixaloop (PicsArt-style), gallery, pick photo.
- 0:16-0:45 UI toolbar bottom row: Animation / Sky / Effects / Overlays / Flip / Eraser etc.; tool "Animate" with arrow draws a motion path on the image; sliders for speed (a horizontal slider near top 0:24-0:27); "Anchor" dots to pin areas that should stay still; "Freeze" brush to mask static areas; "Play" button. Orange "Export" button top-right.
- 0:48-1:40 Motion arrows drawn over the hair/leaves (arrow + circle handle visible 1:10-1:20); user sets direction by dragging a path; white circular anchors to hold subject; speed slider adjusted.
- 1:40-2:20 Picks effect/overlay thumbnails from carousels (6 thumbnails visible 1:45-2:20); strength slider.
- 2:22-2:55 Overlay/sticker panels: animals, flying insects, glitter/sparks/bokeh glow light blobs; user adds light-orb sparkle overlays (2:38-2:55 glowing orange orbs and streak over the frame = light leak/bokeh).
- 2:57-3:00 Final export screen.
- Techniques/UI ideas: path-arrow animation (draw a vector for how pixels flow), anchor points to pin, freeze mask brush, speed slider, overlay library of sparkles/dust/insects, sky replacement tab.

## 4. qRUSPaGVmBc - History Slideshow - Documentary Photo | After Effects Template | Video Displays (15 s)
Watchable: YES (clean template preview, 0.25 s sampling; ideal reference for documentary photo-frame look).
- 0:00-0:04 Slide 1: B&W sepia portrait of old turbaned man inside a thin white-edged picture frame floating over a dark navy textured wall; text block top-left ("JANUARY 1942" yellow date + body copy). Frame slowly pulls back (scale ~100% -> ~85% over 4 s, linear-ish ease-out), slight drift left; background is blurred + vignette.
- 0:04-0:04.5 Transition: frame fades out (alpha) while the next frame's blurred version arrives from the right with a slight rotation (~-3 deg) and settles to straight at 4.5-5.0 (rotate-in + de-blur: starts defocused, ~0.5 s focus pull).
- 0:04.5-0:08.5 Slide 2: Mount Rushmore frame, title "Emotional Memories / VINTAGE SLIDES" in white sans + yellow serif; same slow pull-back; ghost of next/prev photo visible at right edge (3 stacked planes: BG texture blurred, bg photo duplicated large + blurred, foreground framed photo).
- 0:08.5-0:09.25 Transition 2: fade + de-focus; next slide starts defocused, tilted ~+3 deg, scaled up ~110%, then snaps to rest.
- 0:09-0:13 Slide 3: soldier in forage cap; text in yellow "NOVEMBER 1958"; same pull-back; background shows watercolor/ink brush-stroke texture around frame edges (grunge mask reveal).
- 0:13-0:15 Slide 4: person with hands over face; same motion language ("EMOTIONAL PHOTO" title).
- Look: heavy dark vignette, cold navy/blue duotone background, sepia/B&W photo, white 2-3 px photo border, film/paper grain, brush-stroke edge texture, yellow accent text. Each slide ~4.2 s: ~0.5 s intro focus-pull, ~3 s pull-back, ~0.5 s fade/defocus out.
- Techniques: background duplicate of same photo blurred as depth plane; framed photo at front; slow scale-down with rotation settle; defocus-in/out transitions; date + caption text.

## 5. EF6BOgToLG8 - Documentary Editing in After Effects | Cinematic Parallax & Camera Movement (25 s)
Watchable: YES - HINDI documentary short (A.P.J. Abdul Kalam); the closest match to this channel's style. 0.35 s sampling, 25 s runtime. Very rich.
- 0:00-0:04 Aerial map of India, paper-brown land over teal textured sea; camera descends/zooms toward Rameswaram (south tip) with a pulsing red ring marker + label "RAMESWARAM"; yellow Tamil/Hindi/English place sign and framed vintage photo slide in at bottom-left and settle (1.7-2.8). Zoom-out reveal at 1.7 then Hindi word "सपना" pops in as stamped text with blur-in (3.1-3.8, de-blur ~0.3 s).
- 0:04-0:05 Transition: paper tear / torn-edge reveal from map to a wooden desk with globe, book, pens; torn paper shapes wipe (3D paper-tear transition with brown torn edge, 4.2-6.6).
- 0:04-0:06 Scene "desk with globe": Hindi words "भारत / की / पहचान / बना" written along the globe; glowing text with warm emissive glow slides up; camera slow push in on the globe; parallax between table surface and back wall.
- 0:06.5-0:10 Subject cut-out: Kalam in grey bandhgala standing in front of stone staircase (Parliament/steps); cut-out figure, steps behind; slow dolly-in on subject (scale ~100->108%); name-tag lower third "ए.पी.जे. / अब्दुल कलाम" slides up from the left (stacked dark brown tags, 7.3-9.4); torn-paper frame edges visible around the picture (jagged dark vignette).
- 0:09.7-0:10.7 Transition: whip/blur pan + large foreground object (student shoulder/blurred head at left) passes camera ("foreground wipe" with motion blur) revealing next scene (lab with Kalam at table, rocket on blackboard).
- 0:10.4-0:12.5 Scene classroom: Kalam teaching kids; camera trucks right to left; a dark pillar passes in front (11.1-12.5) = occlusion parallax; kids in foreground heads blurred (DOF), Kalam in focus; chalkboard with quote text.
- 0:12.5-0:13.9 Scene presidential office, Kalam at desk with Indian flag; slow push-in; wood-panelled depth; framed picture on wall then zooms into the picture frame ("zoom into the photo") at 13.9 -> transition into B&W industrial tower image with ISRO logo (14.2) and DRDO logo pops (14.9, bounce-in) - logos animate on a blueprint grid.
- 0:14-0:20 Scene "blueprint collage": blue grid blueprint background with cloud layer, pylon tower silhouette; paper note page (left), vintage photo taped on card (right, rotating tilt in), folded blueprint sheet; all elements float with slight different speeds, rotate and zoom out (16.6-18.4 the whole collage zooms out; photo card scales up near camera 17.7-18.4) - strong multi-layer parallax of paper layers at different Z.
- 0:20-0:22.5 Scene chalkboard: camera pushes/zooms into the framed picture on wall (20.5), settles on empty blackboard; Hindi text types onto the board ("उनकी सबसे बड़ी पहचान थी…") with chalk-write reveal; wall texture = peeling plaster; slow push-in ~110%.
- 0:22.9-0:24.6 Scene crowd: camera moves from classroom window out to a wide shot of ~12 people seen from behind looking at the sky; focus rack from blurred (22.9) to sharp (23.3); then upward tilt/pan to sky and a yellow biplane towing a banner (24.3-25.0), plane drifts across clouds.
- Look: strong vignette on every scene, warm sepia grade on interiors, teal on map, mild film grain, edge torn-paper masks, glowing Hindi kinetic type, bounce-ins for logos.
- Transition vocabulary seen: torn-paper reveal; foreground-object whip/blur wipe; zoom-through-a-picture-frame; rack-focus; text-pop de-blur.

## 6. jjSIhkiSU4w - How To Do A Parallax Dolly Zoom With The 3D Camera | After Effects Tutorial (424 s)
Watchable: PARTIAL (talking head + AE UI recordings; the effect itself shown as clips at 0:00-0:30 and in the AE preview).
- 0:00-0:06 Teaser: Munch "The Scream" painting turned into a 3D scene; blurred foreground then focus; dolly-zoom (vertigo) on the bridge: the background (red sky + figure) stays constant size while the bridge walls rush in perspective (field of view widens as camera pulls back, or narrows as it moves in).
- 0:17-0:23 Examples from films: tree-tunnel path, sunset room - dolly-zoom / vertigo reference shots.
- 0:41-1:04 AE project: the painting separated into layers: "2nd line", "1st line", "mouth", "bridge" (many layers, e.g. 31 layers) = subject, bridge railing lines, sky, figures cut out of the painting; set as 3D layers, spaced in Z along the bridge (lines go into the depth, forming a corridor/vanishing perspective).
- 1:04-1:40 Camera hierarchy: AE 3D camera view (Custom view) showing the camera frustum pyramid with colored axes; layers laid out on the bridge perspective along Z axis.
- 1:40-3:30 Key mechanic: animate Camera Position Z (move toward/away from the subject) AND camera Zoom (focal length) in opposite directions, with Point of Interest locked on the focal subject; layer behind the subject stays same size while the foreground layers expand/contract -> "parallax dolly zoom". Uses keyframes on Position + Zoom with matched easing (graph editor); expression link between Zoom and Position (the pickwhip tooltip at 2:50 "Alt-click to add expression") = zoom = f(distance) so the subject keeps constant on-screen size.
- 3:32-5:18 Repeated previews: frustum shape changes (narrower with distance) while the subject (figure) stays the same size and bridge perspective stretches.
- Rest (5:12-7:00): sponsor ad (Squarespace) + outro; skip.
- Techniques: dolly-zoom formula (distance vs focal length), layering by depth with real Z positions, point-of-interest lock, expression-linked zoom.

## 7. RoSiX2CuqBE - The Secret to 3D Documentary Transitions in After Effects Step by Step (902 s)
Watchable: YES (Hindi/Indian presenter tutorial; step by step in AE; many result views).
- 0:00-0:12 Result hero shot: framed portrait of a man in a dark suit on a beige wall, with window light/ray coming from left; camera pushes into the frame; light rays slowly drifting across the wall (light sweep overlay).
- 0:37 Shot: room with framed sketch and dark wood panelling (blur DOF background); 0:50 caption fades.
- 1:15-3:40 Building the "zoom-through a world": layered scene of a building (an ornate classical building cut-out PNG) over sky layer; cloud layer added (3:20-3:58) as a separate plane with clouds scaled and moved; the building has a window; camera pushes toward the window.
- 4:10-6:03 The core technique: "scale-through-a-hole" 3D transition. Camera push-in goes until a window of the building fills the frame (5:00 close-up of window, 5:38-5:50 window shows blue sky through it), then the next scene (interior with the framed portrait, 6:15-6:41) is composed inside the window, so scale-up of the window reveals the next scene; easing curve shown in the Graph Editor (6:03 bell-shaped speed graph = ease in/out). Compositing: window area is masked (alpha hole) and the next shot is precomposed behind.
- 4:35 shop-front illustration example (store with awning); 7:06 landscape painting with sun and mountains: other chain targets.
- 7:31-9:48 Second example: portrait -> "WANTED" newspaper held by a man -> camera zooms into the newspaper's photo -> becomes next scene; 8:21 the newspaper photo of the man; 8:46-9:36 man seen from the back reading newspaper in a room, TV at the same time (9:48-10:01 man watching TV with landscape on screen) = zoom into the TV screen to go to a new world.
- 10:14-12:44 Multi-layer room built from cut-outs: white-background cut-out man at a desk with lamp (10:39), column/pillar (11:54 "pillar" as foreground occlusion layer), bookshelf, painting on wall; layers moved on Z with a 3D camera; foreground pillar passes as camera moves (parallax occluder); red solid used as matte placeholder (11:16).
- 12:44-14:12 final comp: camera dollies through the room toward the framed picture; timeline shows staircase of staggered layer starts (green bars) = sequenced scenes in one continuous camera path; 13:47-14:12 red/black matte shape wipe (red liquid shape) used as transition mask preview.
- 14:24 End: portrait on wall again (loop to the first frame = "match cut loop").
- Look: warm interior, soft window light, DOF blur on far layers, subtle vignette, expo-style ease on all zooms.
- Techniques: nested-world transitions (zoom into a frame/window/screen/newspaper), scale-through with masked holes, constant-direction camera through multiple scenes, matching scale/position at handoff, ease in/out graph, cut-out foreground occluders, sky/cloud separate layer.

## 8. 6iVOh3H930g - How to CREATE 3D Parallax Effect in CAPCUT + PHOTOSHOP (99 s)
Watchable: YES (short, English captions, simple 2-layer workflow; result clips at 0:00-0:13 and 1:30).
- 0:00-0:13 Result reel: WW2 soldiers sitting on rubble looking at a burning city with black smoke; two soldiers (foreground) come toward camera slowly while smoke/city lag; other examples at 0:05-0:09 (cowboys by a campfire at night, soldiers in ruins) with vignette + embers/dust overlay. 
- 0:15-0:24 Photoshop 2024: "Select Subject" (magenta overlay) auto-selects soldiers; refined using "Select and Mask" with red overlay (0:19-0:23) and feathering.
- 0:27-0:30 Photoshop "Remove" tool / Generative Remove (purple selection + progress bar) erases the soldiers to leave a clean background; they "added some clouds" to cover the remaining mistakes (0:33).
- 0:35-0:48 Export: BG as JPG; soldiers as PNG with transparency (important to export correctly); icons "JPG" / "PNG" 0:48. 2 layers only.
- 0:50-1:05 CapCut: import bg on the main track, soldiers PNG on overlay track above; add keyframes in the Animation/Video panel: Scale 100% -> ~108% on the background, and bigger scale on the soldiers (e.g. 100% -> 115-120%); keyframe at start and end ("we're going to zoom in and add a keyframe... then add a keyframe again at the end"); Opposite direction (zoom-out) can be done by swapping.
- 1:06-1:12 Atmosphere: "Natural effects" -> "sparks from fire" stock overlays added on top; Blend mode = Screen to remove black ("be realistic").
- 1:14-1:28 Another dust/ember overlay added in a 2nd track; user can experiment with Special Effects (blur, glow, film grain) -> final looks at 1:30-1:37: slow push on soldiers + embers.
- Techniques: 2 layer split via AI select subject; generative remove for hole fill; per-layer keyframed scale with different amounts; embers overlay with Screen blend; dust/spark layers.

## 9. kmt1y0M9Jno - Edit Like MagnatesMedia in DaVinci Resolve (224 s)
Watchable: PARTIAL (talking-head with AI-generated style reels; parallax portion is 2:00-3:35 in Resolve Fusion).
- 0:09-0:24 MagnatesMedia-style reel: AI cinematic images of a stormtrooper-like soldier in a fire battle (0:18 two soldiers fighting; 0:21 pointing gun); the style = single stylised photo with "vintage parchment frame + hand pointing at it + text label 'Outer Rim'" ( 0:15 map-like old paper card with a mechanical hand pointing at a photo = a "lower-third map-card" element); strong film grain + orange fire-light + dark vignette + slow push-in.
- 0:56 Clipboard graphic "BACKGROUND / OVERLAY / FOREGROUND" = the 3-layer principle of the look.
- 1:08-1:24 ChatGPT prompt writing for sci-fi city (3 layers: city background, fire overlay, character).
- 1:17 Wide street-level futuristic cityscape background (no subject) - "BG" plate, 1:20 black-background fire footage = overlay (Screen).
- 1:52-2:20 Character generated on a white background (2:07 man in jacket pointing, white bg) = foreground cut-out; composited over the city BG in Photoshop (2:20-2:26) extended to 16:9 (white bars filled).
- 2:29 Pack of ember/spark overlay clips (orange sparks tiles) from a free source.
- 2:41-3:34 DaVinci Resolve (Free): Fusion page; node graph MediaIn x3 + Merge3D + Camera3D + Renderer3D (3:00-3:09); each layer an ImageMedia plane in 3D space at different Z; Camera3D translation Z animated (3:12-3:25 spline editor with a falling red line = keyframed linear-to-eased dolly); final 3:34: two men (blue/orange neon rain city) with parallax and embers overlay.
- Techniques: 3D planes + Camera3D in Fusion for parallax (no fake scale keyframes), fire/ember overlay in Screen, white-bg character cut-out, neon rim light grade, film grain, drifting dust.

## 10. NH2jxCOrsM4 - How to make QUALITY depth maps quickly (with no cost) (49 s)
Watchable: YES (short screen recording of a depth-map toolchain; heat-map visuals at 0:00-0:03 and 0:40-0:49).
- 0:00-0:04 Heat-map (inferno colour map) depth maps of: a person hunched over, a close hand (gripping), a face with hair, wall of leaves/trees (distance-coded: bright yellow = near, purple/black = far).
- 0:04-0:11 Search for "depth map" tools: Depth Scanner (Blender add-on/product), Depth Anything / Marigold GitHub ("High Resolution Depth Maps for Stable Diffusion WebUI").
- 0:19-0:27 Pixel-art room scene used as the test image; right-click -> "Open with" pipeline; a small batch UI progress bar (green) at 0:24-0:27 = local depth-map generation running (command line in 0:40).
- 0:31-0:39 File explorer shows output folder with many depth PNGs; drag-drop a source image onto a script (white square cursor) to produce depth.
- 0:40-0:49 Side-by-side output: input image (pink anime face/robot) | its depth map (inferno colours) shown 1:1 at 0:40-0:41; then full-frame depth maps of person at table (0:42-0:43), hand (0:44-0:45), hair (0:45-0:46), tree trunks scene with background fade (0:47-0:49). Depth is smooth gradient with hard silhouette edges; far = black/purple, near = bright yellow.
- Techniques/ideas: free local monocular depth estimation (Depth Anything / ZoeDepth / MiDaS family) as a one-click "auto-split into depth layers" for the tool; inferno colourised preview for user to check depth; batch drop folder; use depth to displace a mesh or to slice into N layers.

---

# Merged feature list (counts out of my 10 videos; videos 3 and 10 are different kinds, see notes)

## Camera moves
- Slow push-in / dolly-in (whole scene scales ~100 -> 108-120% over the clip, ease in-out): 1, 2, 4(pull-back variant), 5, 7, 8, 9 = 7
- Pull-back / zoom-out (frame scales down ~100 -> 85%): 4, 5 (collage zoom-out 16.6-18.4), 8 (mention of "opposite direction") = 3
- Lateral truck / pan (right-to-left with occluding foreground pillar passing): 5 (classroom 11.1-12.5), 7 (pillar occluder) = 2
- Tilt up to sky (reveal): 5 (24.3 plane) = 1
- Orbit / small X-Y drift added to a push-in (parallax from slight camera offset): 2 (Position X/Y), 9 (Camera3D translation) = 2
- Dolly-zoom / vertigo (camera Z and zoom opposed, subject constant size): 6 = 1 (reference in 2 other mentions inferred)
- Push through a frame/window/screen into a new scene (see Transitions): 5, 7 = 2
- Exaggeration control: speed/motion multiplier (e.g. x3 on parallax strength): 1 = 1
- Camera speed ease: ease-in/out bell speed graph (graph editor), expo-style: 2, 6, 7, 9 = 4
- Locked point-of-interest on subject: 6 = 1

## Layering & depth
- 2 layers (subject + background): 1, 8, 9 (3 with overlay) = 3
- 3 layers (foreground / midground (mountains, buildings) / sky): 2, 7, 9 = 3
- 5-30 layers (many separated planes along Z, true 3D scene, painting separated into strips): 6, 7 (room with pillar/columns/bookshelf) = 2
- True 3D (3D layer switch + camera + Z spacing + scale compensation): 2, 6, 7, 9 (Fusion Merge3D + Camera3D) = 4
- Fake parallax (per-layer scale keyframes, no 3D camera): 1, 8, 4 = 3
- Cut method: AI Select Subject / Object Selection + mask, PNG with alpha: 1, 2, 8, 9 = 4
- Cut-out character generated on white background: 9 (+7) = 2
- Depth-map-based auto split (heat-map depth to layers / mesh): 10 = 1
- Duplicate-blurred-background plane behind sharp framed photo (stack: texture, blurred copy, framed photo): 4 = 1
- Paper-collage layers floating at different Z (notes, taped photo, blueprint, logo): 5 = 1
- Foreground occluder (pillar, blurred head, window frame) to enhance parallax: 5, 7 = 2

## Hole fill
- Generative Fill / Generative Remove in Photoshop behind cut-out: 1, 2, 8 = 3
- Sky extension by flat colour/gradient painted below horizon: 2 = 1
- Add clouds/overlay layer to hide fill mistakes: 8 = 1
- Generate clean background plate separately (no subject): 9 (cityscape BG plate) = 1
- No hole fill needed because motion is small (< 10% scale): inferred in 1, 8 = 2

## Atmosphere
- Embers / sparks overlay in Screen blend: 1, 8, 9 = 3
- Fire / bonfire flicker via masked brightness animation: 1 = 1
- Fog / mist behind subject (city-lights valley): 1 = 1
- Light rays / window light sweep: 1 (0:21 beam), 7 (window light) = 2
- Dust / smoke drift (soldier shot, smoke plume): 8 = 1
- Particle dissolve (dust fragments) on the subject: 3 = 1
- Sparkle / bokeh orbs / light-leak overlays, animated stickers: 3 = 1
- Subtle subject micro-motion (Warper breathing/head, mesh warp with pinned anchors): 1 = 1
- Chalk write-on text / glow type: 5 = 1
- Rain: 9 (neon rain city seen in result 3:34) = 1 (inferred)

## Look & grade
- Heavy vignette: 1, 4, 5, 8, 9 = 5
- Film grain / texture (paper, plaster, brushed): 4, 5, 9 = 3
- Teal/blue night grade with one warm accent (fire): 1, 9 = 2
- Sepia / B&W vintage photo with white border frame: 4, 5 = 2
- Blue duotone background + yellow accent text: 4 = 1
- DOF blur (far/near layers, rack focus from blurred to sharp): 4, 5, 7 = 3
- Torn-paper / grunge brush edge mask around photos: 4, 5 = 2
- Neon rim light (orange/cyan) on character: 9 = 1
- Letterbox: none observed in these videos (0)
- Subtitles in a pill style: 8 = 1 (not for the tool)

## Transitions & sequencing
- Cross-fade with de-focus (blur in/out ~0.5 s): 4 = 1
- Rotate-in (3 deg) + settle: 4 = 1
- Paper-tear reveal (torn shapes sweep): 5 = 1
- Foreground-object whip/blur wipe (large blurred object crosses the camera): 5 = 1
- Zoom-through a picture frame / window / TV / newspaper into the next scene (3D documentary transition): 5, 7 = 2
- Match-cut loop back to first image: 7 = 1
- Stamped-text pop with de-blur; bounce-in logos: 5 = 1
- Staggered layer staircase on one continuous camera path through multiple scenes: 7 = 1
- Slide timing: ~4.2 s per photo (0.5 in / 3 hold-move / 0.5 out): 4 = 1; documentary short scenes 1.5-3 s: 5 = 1
- Date/title text block beside photo: 4 = 1; name-tag lower-third (stacked tags): 5 = 1; place label + pulsing ring marker: 5 = 1

## Tool UI ideas
- Layer list with Foreground / Background naming + Z/depth slider per layer: 1, 2, 7 = 3
- Auto subject select + manual brush refine (feather), export alpha PNG: 1, 8 = 2
- Per-layer start/end scale keyframes ("motion strength" master slider, 1x -> 3x): 1, 8 = 2
- Camera presets (push, pull, truck, drift, dolly-zoom) with ease curve editor: 2, 6, 7, 9 = 4
- Overlay shelf (embers, dust, fog, light rays, sparks) with blend=Screen and opacity: 1, 3, 8, 9 = 4
- Hole-fill button (inpaint behind layer) + sky-extension: 1, 2, 8 = 3
- Pixaloop-style path-arrow + anchor + freeze brush + speed slider for local motion: 3 = 1
- Pinned warp points for micro-animation (breathing, head turn): 1 = 1
- Auto depth map (inferno preview) -> slice into N layers: 10 = 1
- Templates: photo-in-frame slideshow with date/title text: 4 = 1
- "Before / After" toggle: 1 = 1
- Export: layered PNG + one video: 2, 8 = 2
