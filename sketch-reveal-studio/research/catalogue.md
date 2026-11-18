# Sketch & Ink Reveal Studio — Look & Move Catalogue (Feature Spec)

Purpose: catalogue every distinct look/move for a tool that turns photos into hand-drawn art that **draws itself on screen**, then reveals the real photo (Vox / Johnny Harris / history-documentary style). Typical shot: 4–8 s. All timings below assume a 6 s shot at 1080p unless noted. Research basis: Wikipedia (rotoscoping, Rotoshop, Waking Life, A Scanner Darkly, ink wash painting/sumi-e, halftone, stippling, hatching, woodcut, linocut, engraving, etching, Ken Burns effect, cel shading, whiteboard animation) + standard documentary/After Effects craft practice. Pixel values are 1080p reference.

## 1. Drawing styles from a photo

**1.1 Pencil sketch** — soft graphite greys on cream paper, visible construction lines, smudged shading.
- Pro recipe: desaturate → invert → colour-dodge blur (or DoG/Sobel edge pass) for contours; quantise tone to 6–8 grey levels; keep paper tooth.
- Craft: 1–3 px strokes, hatch spacing 6–12 px, graphite grey #4A4A4A not pure black; draw-on 3–4 s, per-stroke 0.3–0.5 s with 60% ease-out.

**1.2 Construction pencil (architectural)** — perspective rules, horizon line, boxes for features; "how an artist blocks out a scene".
- Pro recipe: vanishing lines converge to 1–2 vanishing points; straight-edge strokes, no wobble; guides at 30% opacity under final lines.
- Craft: 1 px guide lines snap in 0.15–0.25 s each, staggered; final lines 2–3 px on top; ordering: horizon → masses → openings → detail.

**1.3 Charcoal** — velvet near-blacks, smudged midtones, dusty texture, ragged edges.
- Pro recipe: heavy blur pass for tone + noise/grain for dust; 4 grey levels max; broken, re-stated strokes.
- Craft: 3–8 px strokes, coverage 40–90% in shadows; draw-on 4 s; smudge follows 2 frames behind stroke.

**1.4 Sanguine (red chalk)** — warm rust-brown (#9A5B3C-ish) on cream, old-master portrait look (Leonardo/Watteau).
- Pro recipe: single-hue duotone; hatching follows facial form; tone from stroke density, not colour value.
- Craft: 1–3 px, hatch spacing 5–10 px tightening at shadow cores; 3.5–4.5 s draw-on.

**1.5 Ink line art** — clean uniform black outlines only, white paper, no tone (or minimal spotting).
- Pro recipe: thresholded edge map, stroke simplification to long confident paths; taper stroke ends.
- Craft: 2–4 px, uniform width, rounded caps; pure ink black #1A1A1A; draw-on 2.5–3.5 s (faster = confident).

**1.6 Brush ink (calligraphic)** — gestural lines with pressure width, Japanese/Chinese brush energy.
- Pro recipe: stroke width modulated by direction/speed (flat-brush nib model); occasional dry-brush splits at stroke ends.
- Craft: 2–8 px variable width, 1–2 strokes per feature; 2–3 s draw-on; bold silhouette stroke first.

**1.7 Sumi-e ink wash** — 3–5 wash values, big negative space, asymmetric composition, one-load-of-ink gradients.
- Pro recipe: tone-map to 4 wash levels (light grey → full black); wet-edge darker rims on every wash; 2–6 px bleed into paper.
- Craft: washes laid broad-to-tight (2–3 washes, 0.8–1.2 s each); never fills the frame — leave 30%+ bare paper.

**1.8 Engraving / banknote line** — dense parallel line hatching that follows 3D form; currency-portrait feel (Dürer, banknote guilloche).
- Pro recipe: flow-field hatching aligned to luminance gradients; second pass crosses at 60–90°; shadows get tighter spacing, never heavier line.
- Craft: uniform 1–1.5 px lines, spacing 3–6 px (highlights) down to 1.5–2 px (darks); 5–7 s full draw-on; hatch passes sweep across the form, not the screen.

**1.9 Etching / copperplate** — freer, wavier cross-hatch than engraving; ink swells in the darkest pockets (Rembrandt).
- Pro recipe: 3 layered hatch passes at irregular angles (≈45°, ≈75°, vertical), slight per-line wobble 1–2 px amplitude.
- Craft: 1–2 px, spacing 5–14 px; darks get a 4th pass that pools ink (dilate line 50%); 5–6 s draw-on.

**1.10 Woodcut** — hard 2-tone black/white, bold silhouettes, white carving lines through black, ragged gouge edges.
- Pro recipe: luminance threshold + medial-axis white cuts; chunky white negative lines; no greys at all.
- Craft: white cuts 4–12 px wide with ragged 1–2 px edges; draw-on 3–4 s as "carve" strokes (white appearing in black).

**1.11 Linocut** — chunky rounded shapes, hand-carved feel, thick contours, optional 2-colour misregistration (Grosvenor School, Picasso).
- Pro recipe: shapes simplified to 5–9 regions; gouge texture in contour edges; colour layers offset 2–4 px.
- Craft: contours 6–14 px; 3.5 s draw-on; each colour layer lands as a stamp with 0.1 s settle.

**1.12 Stipple** — tone built purely from dots (Campagnola, banknote medallions, scientific illustration).
- Pro recipe: dot density maps tone (Poisson-disk sampling driven by luminance); dot size varies ±30%, never grid-aligned.
- Craft: 2–4 px dots, spacing 4–10 px, 30–70% coverage in shadows; draw-on as 3 sprinkle passes over 4–5 s.

**1.13 Cross-hatch (pen)** — diagonal pen hatching layered in visible passes; "engraving light" for quick explainer looks.
- Pro recipe: 3 passes — 45°, 135°, then vertical only in core shadows; each pass confined to region boundaries with 2–3 px slop.
- Craft: 1.5–2.5 px, spacing 6–14 px per pass; passes land 0.6–1 s apart; 4–5 s total.

**1.14 Chalk on blackboard** — white/pastel strokes on dark slate, dusty grain, soft glow, eraser ghosts.
- Pro recipe: stroke alpha modulated by noise (chalk skip); 1–2 px white halo; pastel accents for annotations.
- Craft: 5–12 px strokes; draw-on 3.5–4.5 s; chalk dust puffs on stroke lift; slight chalk-squeak audio if sound design.

**1.15 Coloured pencil** — visible directional strokes, layered hues, paper tooth showing through.
- Pro recipe: hue-limited palette (3–5 hues); stroke-aligned hue jitter ±8°; burnishing only in focal area.
- Craft: 2–4 px strokes, 2 cross layers max; 4–5 s draw-on; warm subject / cool background bias.

**1.16 Watercolour wash** — transparent layered washes, wet edges, blooms/backruns, white paper as highlights.
- Pro recipe: wet-edge darker rim (pigment migration) on every shape; granulation noise in pooling; 2 washes + 1 detail pass.
- Craft: fills stop 1–3 px inside the ink lines; washes land 0.8–1.5 s each, staggered by region; leave 20%+ unpainted white.

**1.17 Comic halftone** — visible CMYK dot screens, bold ink outlines, pop palette, slight misregistration.
- Pro recipe: CMYK separations at classic angles (C 15°, M 75°, Y 0/90°, K 45°), 4–8 px dot pitch; channels offset 1–3 px.
- Craft: 3–5 px ink outlines; 2 flat shadow tones max; draw-on 3 s lines then 1 s dots.

**1.18 Old manuscript illumination** — parchment ground, brown iron-gall ink, burnished gold accents, rubricated red initials.
- Pro recipe: ink lines in warm sepia-brown #4B3621; gold with specular bevel; parchment grain multiply 15%.
- Craft: 1.5–3 px ink strokes; gold leaf lands last with 0.2 s glint; 5–6 s full-page draw-on.

**1.19 Blueprint white-line** — uniform white technical lines on Prussian/cyanotype blue, drafting annotations, dimension marks.
- Pro recipe: cyanotype blue base (#1D3E6E → #274B7A range); ALL strokes same 1.5–2 px weight (that's the tell); dashed lines for hidden edges.
- Craft: no tone, no shading — dimension callouts and leader lines as decoration; 3–4 s draw-on, 0.1 s per tick.

## 2. Draw-on reveals

**2.1 Outline-first draw-on** — silhouette/contour strokes land first, then features, then smallest details (big-to-small is the pro order).
- Timing: contour 1.5–2 s → features 1–1.5 s → details 1 s → hold; per-stroke 0.3–0.5 s, ease-out 60%, 80–150 ms gap between strokes.

**2.2 Construction-then-cleanup** — light geometric guides draw first, then confident dark final lines; guides fade out.
- Timing: guides 0.5–1 s at 30% opacity; final lines 2–3 s; guides fade over 0.4 s at ~70% of the shot.

**2.3 Hatching passes building up** — tone arrives as ordered passes, each darker than the last, sweeping across the form.
- Timing: pass 1 (45°) 1 s → pass 2 (cross) 1 s at +0.5 s → darks deepen 1 s; each pass eases out and never backtracks.

**2.4 Stipple build-up** — dots sprinkle in waves starting at shadow cores, spreading to midtones.
- Timing: 3 waves over 4–5 s; 20–40 dots/s landing rate; per-dot pop scale 100→90% in 2 frames.

**2.5 Scribble fill** — energetic back-and-forth zigzag shading that slightly overshoots boundaries, then conforms.
- Timing: 2–3 reversals/s; amplitude decays 30% over the pass; total 0.8–1.2 s per region.

**2.6 Colour flooding in** — flat colour rises inside the lines like water filling a basin; regions fill in reading order.
- Timing: 0.8–1.2 s per region, 0.2 s stagger; fill edge has 2–4 px wet rim that fades; top-down or bottom-up, never both.

**2.7 Hand + pencil following the stroke** — whiteboard/RSA-style drawing hand (or pencil tip) rides the stroke tip.
- Timing: hand lags stroke tip 2–4 frames; speed 1.5–3× real drawing; hand lifts with 2-frame overshoot between strokes; tiny 1–2 px camera bob.

**2.8 Nib / pen cursor** — a small nib or scratch point with micro-jitter marks the active stroke (no full hand).
- Timing: jitter resampled at 8–12 fps (boil) so it feels animated; sync a scratch SFX per 0.3 s of stroke.

**2.9 Chalk hand on blackboard** — chalk held low-angle, strokes accompanied by dust particles and eraser ghosts.
- Timing: 3.5–4.5 s draw; dust puff 4–8 particles per lift; eraser swipe available as an exit gesture.

**2.10 Multi-stroke stagger** — parallel strokes cascade with 30–80 ms offsets (hair, hatch rows, wood-grain lines).
- Timing: 3–6 strokes visible in flight at once; each follows the same path shape with ±2 px jitter so it reads as hand-done.

**2.11 Redraw wobble pass (sketchy double line)** — after a line lands, it re-draws once with 1–2 px offset (boil preview).
- Timing: second pass 0.2 s after first, 1.5× faster; both settle to 70% opacity; use sparingly (max 20% of strokes).

**2.12 Signature flourish** — artist signature or date scribbled bottom-right as the shot settles.
- Timing: 0.5–0.8 s, ease-out with slight overshoot; ink or pencil matches the medium; lands on narration beat.

## 3. Sketch-to-photo transitions

**3.1 Ink bleed reveal** — photo appears through an ink-bleed mask that grows organically, edges feathering like wet ink in paper.
- Craft: fractal-noise mask edge, 6–20 px feather, subtle turbulence offset evolving over 1–2 s; darken leading edge 10%.

**3.2 Watercolour wash wipe** — a broad translucent wash band sweeps across, "washing" the sketch into the photo.
- Craft: leading edge darker (wet rim), trailing edge leaves 10–20% paper texture on the photo for 0.5 s; 1.5 s, ease-in-out 30%.

**3.3 Radial reveal** — circle grows from the subject's face/centre; the classic portrait transition.
- Craft: 1–1.5 s, strong ease-out; mask edge ragged (noise amplitude 10–30 px at 2–3 octaves); often paired with a 3% zoom-in.

**3.4 Brush-stroke reveal** — 3–5 big dry-brush swipes (0.3–0.5 s each) paint the photo over the sketch.
- Craft: bristle gaps (streaky alpha) at swipe edges; alternating directions; final swipe clears the residue.

**3.5 Photo drying back to sketch** — inverse move: photo desaturates, softens and "dries" back into lines (flashback/out-of-memory cue).
- Craft: 2–3 s; mid-transition blur pulse then edges re-crispen; grain rises 5→12%.

**3.6 Colour pouring into lines** — colour runs down into the line drawing, following the strokes like water in grooves.
- Craft: gravity-fixed direction; colour travels along stroke paths (not across paper); 1.5 s; leading meniscus brighter 15%.

**3.7 Half-sketch / half-photo split** — subject shown half drawn, half real (vertical or diagonal seam).
- Craft: seam ragged 5–15 px; hold 1.5–2.5 s while camera slides 3–5% toward the photo side; used as a topic-sentence shot.

**3.8 Contour-following wipe** — reveal travels along a drawn contour (jawline → collar → shoulder → frame).
- Craft: 2 s; reveal head 40–80 px wide hugging the path; the contour itself draws just ahead of the photo behind it.

**3.9 Charcoal dust blow-off** — particles of charcoal blow off the page, uncovering the photo beneath.
- Craft: 0.8–1.2 s; particles drift in one wind direction with 5–10 px blur before settling; photo crisper by contrast.

**3.10 Paper peel / page turn** — sketch page peels away (corner first) revealing the photo page beneath.
- Craft: 1–1.5 s; soft shadow under the curl; slight page bend (displacement, not affine); end on 2-frame settle.

**3.11 Light sweep (darkroom exposure)** — a light bar passes and the sketch "exposes" into the photo like a print in developer.
- Craft: 0.8 s sweep; highlight bloom 2–4% on the bar; photo contrast ramps in the bar's wake; sepia warm-up optional.

**3.12 Grain dissolve** — plain cross-dissolve made organic by a film-grain spike mid-transition.
- Craft: 1 s dissolve; grain peaks 10–15% at the midpoint to mask the morph; ends at the shot's resting grain (6–8%).

## 4. Rotoscope look on video

**4.1 Stable line rotoscope** — traced line art locked to live footage, smooth at full frame rate (interpolated rotoscoping à la Rotoshop / *A Scanner Darkly*'s smooth mode).
- Craft: 1.5–3 px lines; regenerate vector every frame but interpolate in-betweens so lines glide, not boil.

**4.2 Boiling line at 8 fps** — lines redrawn every 3rd frame so the drawing shivers nervously (*Waking Life*'s livelier scenes).
- Craft: 3 redraw variants cycling; jitter amplitude 1–3 px; for drama re-enactments and uneasy topics.

**4.3 Boiling line at 12 fps (on twos)** — 2 redraw variants held 2 frames each; lively but calm — the default explainer boil.
- Craft: jitter 1–2 px; keep silhouettes stable, boil only interior/detail lines so faces stay readable.

**4.4 Posterised cel** — luminance posterised to 2–4 flat tones with an edge outline (cel/toon shading).
- Craft: 3–5 hue limited palette; outline 2–3 px; tones snap, no gradients; shadows offset toward one light direction.

**4.5 Cel + sketch outline combo** — flat cel fills with a pencil-textured outline on top (Vox-style hybrid).
- Craft: fills inside 1–3 px of the line (imperfect registration on purpose); outline uses 1.12 pencil recipe.

**4.6 Halftone rotoscope** — video pushed through an animated dot screen; retro print-in-motion.
- Craft: 4–8 px dot pitch at 45°; dots track tone per frame; pair with newsprint paper (5.6) for period pieces.

## 5. Paper & medium

**5.1 Sketchbook cream** — warm white #F3EDDF with faint fibre; the default ground.
- Craft: vignette 5–10% corner darkening; media sits 100% opaque, ground texture shows through washes at 20–30%.

**5.2 Aged parchment** — tan/brown with foxing spots, darker edges, deckle.
- Craft: multiply-blend stains (5–15 irregular blobs); edge gradient 15–25% brown; slight warp displacement.

**5.3 Kraft paper** — mid-brown #C4A484 with visible flecks; packaging/poster vibe.
- Craft: media in white chalk or sepia ink (contrast is the game); fleck density 0.5–1 per 100 px².

**5.4 Blackboard** — dark slate/green #26343A with chalk-dust haze and eraser ghost trails.
- Craft: haze 4–8% white lift; ghosts at 5–10% opacity under new strokes; worn centre, darker edges.

**5.5 Graph paper** — pale blue 5 mm grid (scaled to image), margin line in red.
- Craft: grid shows through media at 20–40%; technical drawings sit ON grid intersections; blueprint's friendlier cousin.

**5.6 Newsprint** — grey-yellow stock, visible halftone dots, ink spread, misregistered colour.
- Craft: dot pitch 3–6 px; CMY channels offset 1–3 px; paper base #E8E4D0; use for 1900–1950 period items.

**5.7 Blueprint paper** — deep cyanotype blue ground for 1.19; drafting border and title block.
- Craft: title block bottom-right (project, date, scale); border double-rule 2 px + 1 px; adds instant technical authority.

**5.8 Watercolour paper (cold-press)** — bumpy white ground; pigment granulates into the texture.
- Craft: granulation = noise correlated with paper bumps; pools in valleys at 10–15% darker; highlights stay paper-white.

**5.9 Coffee stain** — brown ring with darker crescent rim, slight page warp shadow.
- Craft: ring outer edge crisp, inner soft; 40–80 px diameter; place off-centre, never over the subject's face.

**5.10 Edge burn** — corners scorch toward near-black; the "old document" cue.
- Craft: radial gradient multiply, 60–85% at extreme corners; burn first, media second (media also burns 10%).

**5.11 Smudges & eraser marks** — graphite smears, eraser crumb trails, ghost lines under corrections.
- Craft: smears follow stroke direction, 10–20% grey; ghost line at 15% opacity offset 3–6 px from its replacement.

**5.12 Paper grain overlay** — fine multiplicative noise across everything, unifying sketch + photo.
- Craft: 5–10% opacity; animate per frame at ±2% for a filmic flicker; the single cheapest "professional" upgrade.

**5.13 Deckle / torn edges** — irregular white ragged edge around the paper, soft drop shadow.
- Craft: edge rag 8–20 px; shadow 2–3 px, 20% opacity; page floats 1–2° off the frame's axis.

**5.14 Pin & tape corners** — photo/sketch pinned or taped to a board; push-pin with radial shadow or masking-tape strips.
- Craft: pin highlight + 4–6 px radial shadow; tape at 80% white with 5% shadow line; rotation 1–3°.

## 6. Sketchy annotations

**6.1 Hand-drawn circle** — 1.2 revolutions with overshoot, ellipse squashed to camera perspective.
- Craft: 3–5 px ink; 0.4–0.6 s, ease-out; slight taper at the tail; red or black depending on medium.

**6.2 Curved arrow** — swooping quadratic curve with a hand-drawn head; points at the detail that matters.
- Craft: 0.5 s; curvature follows subject shape (arrow hugs the face, not the frame); head 2 strokes.

**6.3 Straight double-arrow** — ruler-ish arrow with a slight bow and visible double-stroke.
- Craft: 0.3 s; used for maps and measurements; pairs with blueprint style.

**6.4 Underline** — energetic 2-pass back-and-forth underline, thicker than text strokes.
- Craft: 0.3–0.5 s; second pass 1.5× faster at 70% opacity; emphasises caption text.

**6.5 Cross-out** — big X over a region or previous claim; 2 confident diagonal strokes.
- Craft: 0.4 s total (0.2 s per stroke); strokes overshoot the target corners by 10–20%.

**6.6 Bracket** — squared bracket snapping around a subject or column of facts.
- Craft: 0.4 s; corners overshoot 2 px then settle; used for "grouping" in explainers.

**6.7 Star burst** — 5-point asterisk/star sparks; "important!" gesture.
- Craft: 0.3 s pop with 10% overshoot; 2–3 stars staggered 80 ms; never more than 3 per frame.

**6.8 Question / exclamation scribble** — a drawn "?" or "!" pops above the subject.
- Craft: 0.3 s, ease-out with a 2-frame squash; ink matches medium; voice-over beat sync.

**6.9 Highlighter swipe** — translucent marker colour wipes across a word or face region.
- Craft: 0.4 s; colour at 30–40% opacity multiply; 1–2 px darker bleed edge; marker colour distinct from media palette.

**6.10 Handwritten note + leader line** — a word or date ("1947", "Kolkata") with a leader line to the subject.
- Craft: 0.8 s (word 0.5 s, leader 0.3 s); handwriting font must match medium (chalk on blackboard, ink on parchment).

## 7. Portrait & scene presets

**7.1 Historical portrait reveal** — the flagship 6–8 s shot: engraving draws on (3 s) → hold (1 s) → photo fades through (1.5 s) → vignette + caption.
- Craft: sepia warm-up +20% during fade; grain 8%; oval or soft-corner vignette 25%; subject's eyes hit upper-third line.

**7.2 Name & dates ink caption** — name + lifespan (e.g. "Rani Lakshmibai, 1828–1858") written in ink beneath the portrait.
- Craft: caption draws on 0.5–0.8 s, 0.3 s after the reveal settles; underline stroke last (6.4); italic serif or handwriting.

**7.3 Old event illustration** — battle/riot/coronation scene as a woodcut or engraving draw-on (4 s) with hatching build.
- Craft: caption in slab serif or letterpress; sepia/duotone; slow 4% Ken Burns push during the hold; smoke/cloud areas hatch last.

**7.4 Place sketch then real** — landmark sketch draws (2.5 s), then a wipe (1 s) to the modern drone-style photo of the same angle.
- Craft: match framing between sketch and photo (same viewpoint = the magic); map pin bounce (0.3 s) can preface; before/after same-scale is non-negotiable.

**7.5 Manuscript page** — parchment page: illuminated initial draws + gold glint, then text lines scribble in as placeholder strokes.
- Craft: text as readable scribble lines (not lorem-ipsum legible) at 1.5 px, 15 lines landing 30 ms apart; gold glint 0.2 s.

**7.6 Archival photo treatment** — sepia or silver-gelatin duotone, 8–12% grain, vignette 20–30%, slight gate weave (±1 px @ 12 fps).
- Craft: thin white border OR oval matte; dust/hair specks 2–4 per shot; this is the "we are now in the archive" signal.

**7.7 Pinned photo on board** — archival photo pinned/taped over the sketchbook ground with drop shadow and 1–3° rotation.
- Craft: shadow 6–10 px blur, 25% opacity; neighbouring photos overlap 5–10%; pin per 5.14.

**7.8 Before/after split screen** — sketch left, photo right, animated divider sweeps once (1 s) then holds.
- Craft: divider = a drawn line (2 px ink), not a UI bar; both sides 2% inner shadow at the seam; labels in annotation hand (6.10).

**7.9 Ken Burns on the sketch** — slow 4–8% zoom + 3–5% pan across the drawn image during its hold.
- Craft: linear or 10% ease; pan direction follows the drawing's reading order (left→right in LTR locales); never out-zoom a portrait's face off third-lines.

**7.10 Photo-in-window insert** — a blank frame is drawn in the sketch, then the real photo card slides into it.
- Craft: frame draws 0.6 s; photo slides/settles 0.4 s with 2-frame overshoot; drop shadow 4 px inside the drawn frame; used for evidence/documents.

## Build list

Flat list of every distinct look/move to ship, grouped by family.

**Family 1 — Drawing styles from a photo**
1. Graphite pencil sketch render (portrait)
2. Construction-pencil render (architectural, perspective guides)
3. Charcoal render with smudged tones
4. Sanguine red-chalk render
5. Clean ink line-art render (uniform outline)
6. Calligraphic brush-ink render (variable width)
7. Sumi-e ink-wash render (3–5 wash levels)
8. Banknote engraving render (form-following parallel hatching)
9. Copperplate etching render (wavy layered cross-hatch)
10. Woodcut render (2-tone with white carve lines)
11. Linocut render (chunky shapes, colour misregistration)
12. Stipple render (density-mapped dots)
13. Pen cross-hatch render (3 ordered passes)
14. Chalk-on-blackboard render (dusty white/pastel)
15. Coloured-pencil render (layered directional strokes)
16. Watercolour-wash render (wet edges, blooms, white reserves)
17. Comic-halftone render (CMYK dot screens, misregistration)
18. Manuscript-illumination render (sepia ink, gold, rubric red)
19. Blueprint white-line render (uniform weight on cyanotype blue)

**Family 2 — Draw-on reveals**
20. Outline-first draw-on (contour → features → detail)
21. Construction-then-cleanup draw-on (guides fade out)
22. Hatching-passes tone build (3 sweeps across the form)
23. Stipple build-up (3 sprinkle waves from shadow cores)
24. Scribble fill (energetic zigzag shading)
25. Colour flood (regions fill in reading order)
26. Hand + pencil following the stroke (whiteboard style)
27. Nib/pen cursor with 8–12 fps jitter
28. Chalk hand drawing with dust puffs
29. Multi-stroke stagger cascade (30–80 ms offsets)
30. Redraw wobble pass (sketchy double line)
31. Signature/date flourish to close the shot

**Family 3 — Sketch-to-photo transitions**
32. Ink-bleed mask growing from the subject
33. Watercolour wash wipe with wet leading edge
34. Radial ragged-circle reveal from the face
35. Brush-stroke reveal (3–5 dry-brush swipes)
36. Photo drying back to sketch (inverse flashback)
37. Colour pouring into the line grooves
38. Half-sketch/half-photo split with ragged seam
39. Contour-following wipe along a drawn silhouette
40. Charcoal dust blow-off reveal
41. Paper peel / page turn to the photo
42. Light-sweep darkroom exposure reveal
43. Grain-spike cross dissolve

**Family 4 — Rotoscope look on video**
44. Stable-line rotoscope (smooth interpolated tracing)
45. Boiling line at 8 fps (nervous drama variant)
46. Boiling line at 12 fps on twos (default explainer boil)
47. Posterised cel render (2–4 flat tones + outline)
48. Cel fill + pencil-outline hybrid
49. Halftone rotoscope (animated dot screen)

**Family 5 — Paper & medium**
50. Sketchbook cream paper ground
51. Aged parchment with foxing stains
52. Kraft brown paper ground
53. Blackboard slate with dust haze and eraser ghosts
54. Graph paper with 5 mm blue grid
55. Newsprint with misregistered halftone
56. Blueprint paper with drafting border and title block
57. Cold-press watercolour paper with granulation
58. Coffee-stain ring overlay
59. Edge burn scorched corners
60. Smudge and eraser-mark overlay with ghost lines
61. Animated paper grain overlay (filmic flicker)
62. Deckle/torn paper edge with shadow
63. Push-pin and masking-tape corner mounts

**Family 6 — Sketchy annotations**
64. Hand-drawn circle with overshoot
65. Curved swooping arrow
66. Straight double-stroke arrow
67. Energetic double-pass underline
68. Cross-out X
69. Snap bracket around subject
70. Star-burst asterisk pops
71. Scribbled question/exclamation mark
72. Highlighter translucent swipe
73. Handwritten note with leader line

**Family 7 — Portrait & scene presets**
74. Historical portrait reveal (engraving draws → photo fades → vignette)
75. Name-and-dates ink caption with underline
76. Old event illustration (woodcut battle-scene draw-on)
77. Place-sketch-then-real matched-angle wipe
78. Manuscript page with illuminated initial and scribble text
79. Archival photo treatment (sepia, grain, gate weave, matte)
80. Pinned photo on board with shadow and rotation
81. Before/after split screen with drawn divider
82. Ken Burns pan/zoom on the sketch hold
83. Photo-in-window insert (photo card slides into drawn frame)
