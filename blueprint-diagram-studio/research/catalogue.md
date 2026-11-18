# Blueprint & Diagram Studio Pro — Research Catalogue (Feature Spec)

**Target:** Hindi documentary-explainer YouTube channel (military, engineering, history, economy, science). Reference style space: Vox, Johnny Harris, Kurzgesagt, Show It Better, Flat Pack FX "Vox-look" tutorials, UsefulCharts dynasty posters, Real Data / Global Data 3D size comparisons, Indian explainer channels (Dhruv Rathee / Nitish Rajput pacing).

**What makes documentary diagram animation look professional** is not the artwork — it is *disciplined timing*. Every graphic behaves like a draftsman is drawing it live on camera: (1) a fixed draw order — **structure → details → dimensions → labels** — never a label appearing before the geometry it points at exists; (2) constant, legible line weight (4–5 px for outlines at 1080p) that never changes mid-stroke; (3) generous *breathing holds* — a completed diagram rests ≥1.5 s before the cut so the viewer's eye can read it, and the last element of a shot lands at **85–95 % of the shot duration** (i.e. land it *on* the narration beat, then hold); (4) stagger discipline — sibling elements (grid rows, tree branches, callout labels) never animate simultaneously; they cascade at 0.25–0.5 s gaps; (5) eased, "analog" motion — draw-ons run near-linear with only 5–10 % ease-out so the pen never visibly decelerates to a stop, while labels *pop* with a 10–15 % overshoot because that is how a hand places a sticker; (6) a quiet background with ≤25 % contrast grid so the white/ink line work is the highest-contrast thing on screen at all times. Tutorials consistently teach the same core moves — **trim-path stroke reveal, mask-on-photo line art, count-up numbers, staggered label pops, hold** — and the pro/amateur gap is entirely in consistency and hold times, not complexity.

All numbers below assume a **1920×1080 canvas, 24 or 30 fps export**. px values scale linearly for 1440p/4K.

---

## 1. Blueprint draw-on

Technical line drawings that draw themselves stroke-by-stroke. Six paper styles, one animation engine.

### Looks found
- **Classic blueprint (navy grid):** background deep cyanotype blue **#1E3FA0** (measured from reference frame; modern documentary variant: **#16305E–#1B3B6F** for a moodier night look). All linework pure white **#FFFFFF**; accents cyan **#7FDBFF**. Faint square grid in lighter blue **#2B4C8C** at **18–25 % opacity**, minor cell **48 px**, major line every **240 px** (5 cells) at +6 % opacity; grid occupies full frame. Uniform line weight confirmed in reference analysis: *no thick/thin differentiation* — outline **4–5 px**, detail **2.5–3 px**, dimension/witness lines **2 px**, hatching **2 px** at 45°, hatch spacing **10–14 px**.
- **Tracing paper (graphite):** paper **#F2EDE4**, graphite ink **#2A2A2A** with **0.6 px jitter** (line boiling), grid **#C9C2B4** at 30 %, 24 px cell. Looks hand-drawn — pairs with 8 fps "boil" redraw.
- **Black chalkboard:** board **#20261F** (slate-green) or **#1B1B1B**, chalk **#F5F5F0** at 85 % opacity with 1–1.5 px chalk fuzz (double stroke offset 0.8 px, 40 % opacity). Erased-ghost layer of previous diagram at 6 % opacity.
- **Neon-on-black:** bg **#0A0A0F**, strokes **#00E5FF** with 12 px outer glow at 60 % opacity + 2 px hot core **#FFFFFF**. Grid **#121A2E** at 40 %, 96 px cell.
- **Clean white (Vox/JH look):** bg **#FFFFFF** (or paper **#FAF8F4**), ink **#1A1A1A**, single accent **#2563EB** or channel red **#E63946**. No grid, or 5 % gray dot-grid at 32 px.
- **Aged drafting paper:** bg **#E8DCC0**, sepia ink **#4A3F35**, grid **#D6C9AC** at 25 %, coffee-stain blotches (2–3 ellipses) at 4–6 % opacity, torn/deckled edge mask 8 px.
- **Dimension system (all styles):** dimension line offset **48–64 px** from geometry; extension/witness lines start with a **3 px gap** from the object, overshoot the dim line by **8 px**; arrowheads **closed filled, 20 px long × 7 px half-width** (≈4× line weight); measurement text **28–34 px**, placed *above* the line, rotated to match line direction (vertical dims get rotated numerals — confirmed in reference). Centre lines: **dash-dot** pattern 24 px dash / 6 px gap / 16 px dot, extending **24 px** past the feature, colour at 70 % ink.
- **Title block (generic):** bottom-right **480 × 220 px** box, 2 px border, 1 px internal rules, 6 cells: TITLE / SCALE / DRAWN-BY / DATE / SHEET / REV. Text 22–24 px mono or condensed sans, uppercase, letter-spacing 0.02 em. Draws on as a group in 0.6 s *after* all dimensions.
- **Typography:** technical lettering (ISO 3098 feel) — DIN Condensed / Oswald / Barlow Condensed for Latin; **Noto Sans Devanagari** for Hindi labels at **30–42 px**, numbers always tabular (monospaced digits) so count-ups don't jitter.

### Moves found
- Outline (longest single path, typically 1200–2600 px) **draws on over 2.5–4 s** ⇒ effective speed **≈400–700 px/s (13–23 px/frame @30 fps)**; easing **linear to 8 % ease-out** — the pen must never stop dead.
- Secondary strokes: duration = `clamp(length / 600 px/s, 0.35 s min, 2.2 s max)`; **stagger 0.2–0.4 s** after the outline starts, then 0.08–0.15 s between sibling details; multiple pens may run concurrently (max 3 simultaneous strokes).
- Dimension lines draw **left→right / bottom→top** over **0.5–0.9 s**; both **arrowheads snap on in the last 10 %** of the draw (2-frame pop, scale 90→100 %); the **measurement number counts up over 0.8 s** with ease-out, starting when the line is 40 % drawn and finishing ≤0.2 s after the arrowheads land.
- Centre lines fade+draw last among geometry (0.5 s, 0.3 s after details).
- Hatching: whole hatch region **wipes at 45° in 0.6–0.8 s** (a single mask wipe, not stroke-by-stroke).
- **Final hold ≥1.5 s**; land final stroke at 85–95 % of shot duration.
- **Parametric library** (17 presets; each = 1 outline path 1400–3200 px + 12–40 detail paths 60–400 px + 3–8 dimension groups; total draw budget 6–11 s, outline first, details next, dimensions after, title block last): fort wall (crenellation module 96 px, merlon 48×48 px, wall height dim), tower/minaret (taper ratio, balcony rings, height dim + centre line), dam (curved gravity profile, hatched concrete, water-level dim), bridge (truss triangles 120 px module, span dim), floor plan (wall poché = 8 px double line filled, door swing arcs 90°, room labels), ship hull (waterline, stations, beam/length dims), submarine (pressure hull centre line, ballast blocks), tank (hull + turret + track ellipse 3:1), fighter jet (plan view, wing sweep dim 40°), rocket (stage separations, fairing dim), train engine (driver wheel Ø 3× small wheel), car (wheelbase dim, ride height), gear train (2–5 gears, module dim), bunker (cut top view, wall thickness hatched), dome (section arc, rise/span), satellite (solar panel wings 3×5 module grid).
- **User SVG import:** auto-assign draw order by (a) provided layer names, else (b) path bounding-box area descending then top-left→bottom-right; stroke width normalised into the 2/3/5 px weight ladder; paths >4000 px auto-split at vertices every ~1200 px so no single draw exceeds 3 s.
- **Photo → line art tracing:** edge-detect → simplify → bucket into 2 weights (5 px boundary, 2.5 px interior) → 120–400 strokes → draw in 4–7 s with 3 concurrent "pens" at 600 px/s each; optional pencil-texture stroke alpha 90 %; reveal runs while the source photo cross-fades out over the first 1.5 s.

### Professional markers
- Line weight never varies mid-stroke; no stroke ever *teleports* in (fade/scale is only allowed for labels, titles and hatching wipes).
- Arrowhead size locked to line weight (length = 4× weight); dimensions aligned to a single baseline, numerals never overlap geometry.
- Natural draw order: **structure → details → dimensions → labels → title block**; the eye always has somewhere to land.
- ≥1.5 s tail hold; grid perfectly behind everything and never animated; breathing micro-camera drift (±0.4°, 8 s period) only if the shot is ≥6 s.

---

## 2. Rotating wireframe

3D wireframe boxes/cylinders/extrusions rotating slowly, hidden lines fading, labels popping.

### Looks found
- Two palettes: **"Tron" neon** (bg **#0A0A0F**, edges **#00E5FF**, hidden edges **#00E5FF @ 25 %**, glow 10 px @ 50 %) or **drafting blueprint** (navy **#16305E**, visible edges white 4 px, hidden edges **#FFFFFF @ 30 %** as **12 px dash / 8 px gap** dashes — the classic hidden-line convention).
- Vertices get **6 px dots**; silhouette edges (object outline) run 5 px, internal edges 3 px — that weight split is what reads as "3D".
- Optional vertex index labels (A, B, C… or Hindi equivalents) at 26 px, offset 24 px outward along vertex normal.
- Ground shadow: flat ellipse at 8–12 % opacity that squashes with tilt.

### Moves found
- **Turntable 6–12 °/s** (full revolution 30–60 s — documentary pace, never faster than 15 °/s); vertical **tilt 5–15°** applied as a slow 0.5–1 °/s drift or a one-time 1.2 s tilt move at shot start with ease-in-out.
- Rotation is **linear** (constant angular velocity) — ease only when starting/stopping the whole shot (0.8 s ease-in from rest).
- **Labels pop** every **30–45°** of rotation or at hold points: label scales 0→110 %→100 % over **0.35 s** (overshoot), leader line draws 0.3 s before the text.
- Hidden-line fade: dashed hidden lines crossfade to 30 % opacity; optional "x-ray" moment where the whole front face drops to 15 % fill-opacity over 0.4 s to reveal internals.
- Loop cadence: if looping, loop length = exact divisor of 360° (e.g. 90° over 15 s) to make a seamless cut.

### Professional markers
- Constant angular velocity; no wobble in the rotation matrix; silhouette edge weight consistent as the object turns.
- Labels never collide with edges (collision check + 24 px minimum clearance); label side of the object always faces camera when it pops.
- Hidden-line dash pattern does not crawl (dash phase locked to geometry, not screen).

---

## 3. Exploded & cutaway views

Object splits along an axis with leader-line labels; cutaway reveals layers; X-ray toggle.

### Looks found
- Reference exploded/axonometric tutorials (Upstairs, Toffu Co) use: bg **#FFFFFF** or warm paper **#FAF8F4**; parts in **2–3 muted fills** (e.g. **#DDEBD5**, **#F2D9E8**, **#D5D9EE** pastel set measured from reference; military variant: **#B8C4CF** steel, **#8D6E4C** brass, **#5C6B77** iron) with **2.5 px ink outline #1A1A1A**; thin white gaps (3–4 px) between exploded parts.
- **Leader lines:** 2 px, one elbow (horizontal 40–60 px, then 12 px tick to the part); label text 28–34 px in a pill/box with 24 px padding, 2 px border at 60 % ink or soft shadow; numbered chips (Ø 44 px circles, 2 px border) when >5 parts.
- Cutaway: cut faces filled with **hatching 45°, 10 px spacing, 2 px**; revealed internals use 2 accent colours max.
- X-ray: outer shell drops to **12–18 % fill opacity**, outline stays 100 %, internals at full strength.

### Moves found
- Parts separate **along one axis** (usually vertical) each travelling **80–160 px** from the assembled position; **stagger 0.12–0.2 s per part**, each move **0.7–1.0 s** with **cubic ease-out (0.22, 1, 0.36, 1)**; assembly order and explosion order are the same animation reversed.
- After all parts settle (+0.3 s), **leader lines draw 0.4–0.6 s** each, stagger **0.35–0.5 s** in numbered order 1→n; label box pops (scale 96→100 %, 0.25 s) right after its line lands.
- **Cutaway:** layers peel/slide away **one per 0.6–0.9 s**, stagger **0.3 s**; each newly-revealed layer's label fades in 12 px slide-up over 0.3 s; depth count-up on the reveal (e.g. "15 m") 0.6 s.
- **X-ray toggle:** 0.4 s crossfade, eased; keep internals static during the toggle so only the shell changes.
- Hold assembled → exploded state ≥2 s; if re-assembling, run at 1.3× speed.

### Professional markers
- Every part travels along *exactly* one shared axis — never diagonal guesses; gaps between exploded parts equal (±4 px).
- Leader elbows all turn the same direction; labels right-aligned to a common column when space allows.
- Numbering runs in assembly order (bottom/up or core/out), matching narration.

---

## 4. Labelled diagram (photo/footage call-outs)

User's photo or footage frame with leader lines, numbered markers, legend box.

### Looks found
- Photo full-bleed (16:9 crop) with a **8–12 % dark scrim** on the label side so text passes contrast (white text on scrim = ≥4.5:1).
- Reference callout style (SaaS-annotated mockup frame): floating cards **#FFFFFF, radius 8–12 px, 2 px border at 15 % black, drop shadow 0 4 px 12 px @ 15 %**, text **#1A1A1A 28–32 px**, icon chip 40 px; leader lines **2 px #FFFFFF** with 6 px end-dot on the target.
- Numbered markers: **Ø 44–52 px circles, 3 px border, white fill 90 %, number 26 px bold**; or ring style (Ø 36 px, 3 px ring) for video.
- Legend box: bottom-left or right rail **360–420 px wide**, rows of 44 px height, swatch chip 20 px, text 26 px; builds row-by-row.

### Moves found
- Photo **settles in 0.8 s** (scale 1.04→1.0, ease-out-quintic) — this "settle" is what stops the graphic feeling slapped on; if footage, freeze-frame with 4 % film grain instead.
- Callouts draw in **sequence**: leader line 0.5–0.7 s (500–700 px/s) → marker pops (scale 0→110 %→100 %, 0.3 s, overshoot) → text fades in 0.25 s. **Stagger 0.35–0.5 s** between callouts; never two at once.
- Legend builds **one row per 0.25 s**, synced so each row lands 0.1 s after its callout marker pops.
- Optional highlight pulse on the target: 3 px outline pulse (opacity 100→40→100 %) for 0.8 s after the marker lands.
- Final state holds ≥1.5 s; exit = whole overlay group fades 0.4 s while camera pushes in 4 %.

### Professional markers
- Leader lines end *on the exact feature* (with the 6 px dot), never floating near it; all elbows share one direction.
- Marker numbers match legend order exactly; label boxes share one width/height/padding system (24 px inset).
- Scrim keeps text ≥4.5:1 contrast; nothing overlaps the photo's subject eyes/faces (documentary courtesy).

---

## 5. Process & flow

Step boxes + arrows, pipelines with moving dots, cycles, cause→effect chains, funnels, step timelines, before→after, decision trees.

### Looks found
- Vox-style step boxes: **#FFFFFF** cards, **2.5 px ink border**, **8–12 px radius**, **28–32 px** step number in accent **#2563EB**, title 32 px bold, sub 24 px; or dark mode **#111827** cards with **#F9FAFB** text and accent **#F59E0B**.
- Arrows: 2.5–3 px shaft, arrowhead 20×8 px closed; flow direction colour = accent. Pipelines: 6 px pipe in **#9CA3AF** with 6 px inner channel; moving dots **14–18 px**, colour-coded (money **#F59E0B**, goods **#10B981**, water **#3B82F6**, loss/red **#EF4444**).
- Funnel: 3–5 trapezoid stages, each fill a step of one hue ramp (e.g. **#93C5FD → #3B82F6 → #1D4ED8 → #1E3A8A**), % labels on the right rail.
- Decision tree: diamonds **120×80 px** with 2.5 px border, YES/NO chips 22 px above branch lines.

### Moves found
- Step boxes **scale+fade in 0.4 s** (scale 92→100 %, ease-out) with **0.5–0.8 s stagger**; arrows draw **0.5–0.8 s** (500–800 px/s, slight ease-out) *after* their source box lands, arriving 0.1 s before the next box appears — the eye follows box→arrow→box.
- **Pipeline dots** travel at a constant **90–140 px/s** (linear, never eased — flow must feel continuous), spawn every **0.9–1.3 s**, spacing on screen 120–160 px; dots shrink to 0 over the last 40 px of the run; loop or cycle seamlessly.
- Cycles: 3–6 nodes on a circle (radius 300–420 px); ring draws 1.2 s (stroke reveal), then nodes pop 0.3 s each staggered 0.3 s, then a single dot orbits at 40–60 °/s forever.
- Cause→effect chains: each link = box pop 0.3 s + arrow 0.5 s, total cadence **0.8–1.0 s per link**; final effect box gets accent fill + 1.5 s hold.
- Funnels: stages wipe top→bottom **0.6 s each**, stagger 0.4 s; count labels count down/up **0.6 s** per stage.
- Step timeline: baseline draws 0.8 s left→right; ticks pop 0.2 s at 0.3 s stagger; year labels count-up 0.5 s.
- Before→after: split-screen wipe 0.9 s (linear wipe, soft 12 px edge), labels "पहले/बाद" (Before/After) fade 0.3 s on each side, hold both 1.5 s.
- Decision tree: root pops, branches draw 0.4 s per level at 0.4 s stagger; YES/NO chips fade in 0.2 s as each branch lands.

### Professional markers
- One arrowhead geometry everywhere; arrow shaft length ≥3× head length; boxes on a 8 px layout grid with identical paddings.
- Flow dots never overlap each other and never ease; cadence of steps matches narration sentences (1 step ≈ 1 sentence, 1.5–3 s each).
- Direction is unambiguous — every arrow has a head; loops that are meant to be loops visibly close.

---

## 6. Trees & hierarchy

Family tree / dynasty lineage with portraits, marriage lines, growing branches, succession highlight, camera panning, org charts.

### Looks found
- Reference (Queen Victoria bloodline chart): **bg #FFFFFF**; **title banner: deep crimson #8B1A1A–#922B2B rectangle with thin 2 px black border**, serif all-caps title **≈56 px white**, sans subtitle **≈26 px**; **legend row** with distinct line styles — parents = solid black **4–5 px**, bloodline = heavy line, other descents = thin 2 px; portraits in oval/rect slots with 2 px ink border; **names 30–34 px serif bold, life-years 22–24 px mono**.
- Documentary variant: paper **#FAF8F4**, ink **#1A1A1A**, generations tinted by era band (**#F2D9E8 / #DDEBD5 / #D5D9EE** at 30 %), portrait slots **220×260 px** (or 160×160 circles), connector 2.5 px.
- Marriage lines: double line (two 2 px lines 4 px apart) or a ∞/linked-ring glyph; succession line: **4–5 px accent #B45309 (amber) or #922B2B (crimson)**.

### Moves found
- **Branches grow** 0.5–0.8 s per generation level (stroke reveal along the connector path, 500 px/s); **0.3 s stagger between siblings** (left→right, matching reading order / primogeniture).
- Portrait slots scale-in 0.35 s (96→100 %) right after their branch lands; name + years fade in 0.25 s beneath (8 px slide-up).
- Marriage lines draw 0.4 s with the ring glyph popping last.
- **Line-of-succession highlight:** after the full tree holds 1.5 s, a 4–5 px amber line traces the chosen lineage **0.6 s per generation**, other branches dim to 35 % opacity over 0.4 s; hold the highlighted path ≥2 s.
- **Camera pan along a big tree:** vertical or horizontal drift at **120–200 px/s, linear**, easing only at the ends (1 s ease-in/out over 10 s of travel); the tree draws *ahead* of the viewport (draw at 1.5× pan speed) so ink is always arriving from the leading edge.
- Org chart: root box pops 0.4 s → level 1 boxes 0.35 s each staggered 0.25 s → connectors draw 0.3 s bottom-up before each level's boxes.

### Professional markers
- All connectors orthogonal or smooth-Bézier — never mixed within one tree; generation bands perfectly horizontal; every portrait slot identical size.
- Reading order = animation order (eldest first, left→right); years in tabular figures.
- Legend explained *before* the first non-obvious line type appears (legend draws within the first 2 s of the shot).

---

## 7. Scale & size comparison

Silhouettes lined up with a height ruler, camera pulling back, area comparison squares.

### Looks found
- Reference growth/scale chart: **bg #FFFFFF**; silhouettes **flat solid #1A1A1A** (documentary variant: **#111827** on **#FAF8F4**); one accent silhouette (the "star" subject) in **#E63946** or **#B45309**.
- **Height ruler:** vertical bar on the left or right — thick **6–8 px black spine** with a heavy top cap (L-frame), **dense ticks like a barcode** (minor ticks every 4–8 px screen-space, major labeled ticks with values); labels **24–28 px tabular figures** beside major ticks. Ground line: 3 px full-width at y = 92 % of frame.
- Each silhouette gets a name label 28 px + value label 24 px mono directly beneath, 16 px above the ground line.
- Area comparison squares: 2 px ink squares on a shared baseline with area ∝ value, fill at 12 % accent, value labels inside.

### Moves found
- Silhouettes **rise into place from the ground line**: height scales 0→100 % over **0.8–1.2 s** with ease-out (back-out 1.05 for a tiny overshoot), **stagger 0.4–0.6 s** smallest→largest, left→right.
- As each silhouette lands, the **ruler tick block for its height lights up** (accent flash 0.3 s) and its **value label counts up 0.6–0.8 s**.
- **Camera pull-back reveal:** after the last normal subject lands, camera zooms from **100 % → 35–50 %** over **2.5–3.5 s ease-in-out** while the *giant* subject (ship, tower, mountain, stadium) scales/fades in at the far end during the last 1 s; its value label counts up 1.2 s (big numbers deserve longer count-ups). Alternative: giant silhouette rises 1.8–2.5 s (slower because it is enormous — mass reads as slowness).
- Area squares: wipe-fill each square 0.7 s, stagger 0.5 s, label counts up 0.6 s inside.
- Final lineup holds **≥2 s** with all labels legible before any exit.

### Professional markers
- Silhouettes share one visual weight (all solid fills, no mixed outline/fill); all stand on the *same* ground line with zero float.
- Ruler tick density and label rounding consistent (all metres or all feet, 1–2–5 progression of major ticks).
- The reveal beat is *earned*: exactly one camera move per shot, and it starts only after every small subject is readable.

---

## 8. Cross-sections & layers

Earth layers, sea depth with markers, building floors, tunnel/mine shaft, pipe/road cross-section.

### Looks found
- Earth/science style: bg **#FFFFFF** or space **#0B1026**; layers as stacked horizontal bands with muted ramps (crust **#C2956B** → mantle **#A15E3C** → outer core **#D97706** → inner core **#F59E0B**); each band labelled with name 30 px + depth 26 px mono; thin 2 px separators.
- Sea depth: water column **#7DD3FC → #0C4A6E → #052F4E** gradient in 3–5 bands; depth markers on the left rail (0, 200, 1000, 4000, 10911 m); creatures/objects at true-depth positions.
- Building floors / tunnel & mine shaft: architectural section — 3 px ink outlines, floor slabs hatched 45°/10 px, floor numbers in 26 px chips; pipe/road section: material layers as nested bands with hatch patterns distinct per material (concrete dots, asphalt dense hatch, soil sparse hatch).
- Labels on the right rail with 2 px leader lines; every layer has one accent edge-light (2 px highlight at top edge).

### Moves found
- **Layers slide in horizontally** from alternating sides (or top→bottom for depth order) **0.7 s each, stagger 0.35 s**, ease-out; deepest layer lands last.
- Depth markers count up **0.6 s** each as their layer lands; the marker tick flashes accent 0.3 s.
- Labels fade in with a 12 px slide toward their layer, 0.3 s, 0.15 s after the layer lands.
- Optional vertical camera descent for long sections (mine shaft, Mariana Trench): camera dollies down at **160–240 px/s, linear**, layers pre-drawn ahead of the viewport; depth counter (top-right chip, 32 px mono) counts continuously with the travel.
- Layer "peel" interaction: any single layer can slide out 0.5 s to isolate, hold 1.5 s, slide back 0.4 s.
- Final full section holds ≥2 s with a bracket-label summarising total depth/height (counts up 0.8 s).

### Professional markers
- Layer boundaries are perfectly horizontal and full-bleed; hatch density encodes material consistently across the whole video series.
- Depth numbers use the same unit and rounding as the narration; markers sit on a single rail, evenly aligned.
- Colour ramps are perceptual (light→dark = shallow→deep), never random hues per layer.

---

## 9. Mechanisms (looping machines)

Meshing gears, piston/crank, conveyor, pulley, pendulum, valves, turbine.

### Looks found
- Drafting look: navy blueprint bg **#16305E**, white 4 px outlines; or clean-white with **#1A1A1A** 3 px outlines + accent motion trails (last 60° of gear rotation ghosted at 15 % opacity).
- Gears: 2–4 px outlines, teeth as trapezoids, hub circles with centre-line cross; piston: cylinder walls hatched on cut face, crank circle dashed at 2 px; conveyor: belt as two 3 px lines with 12 px dash/8 px gap moving; pendulum: pivot triangle, rod 3 px, bob Ø 40 px; valve: pipe 6 px walls, flow arrow inside; turbine: 8–12 blades as arcs, hub circle.
- Motion direction indicated by a curved 2 px arrow with head, drawn once, fading to 40 % during the loop.

### Moves found
- **Gears:** angular velocity **20–40 °/s**; meshing pair obeys `ω₂ = −ω₁ × (teethA / teethB)` exactly (a ratio error of even 2 % is visible — sync teeth phase so a tooth enters a gap, never tooth-on-tooth); loop length = one full revolution of the *slowest* gear (typically **6–12 s**).
- **Piston/crank:** one crank revolution per **2.0–2.5 s** (constant ω); piston position = crank kinematics (true sinusoid via slider-crank, not linear back-and-forth); loop 2.0–2.5 s.
- **Conveyor:** belt dash pattern translates at **150 px/s** (linear, seamless); items on the belt spawn every 1.5–2 s and ride at exactly belt speed.
- **Pulley:** rope translates 100–150 px/s; the two loads move at the true rope-ratio speeds.
- **Pendulum:** period **2.0–3.0 s** full cycle, angle amplitude 15–25°, easing = true sine (not keyframed ease) so the loop is seamless.
- **Valves:** open/close cycle 1.2 s with ease-in-out at the seats; flow dots inside pipe obey the pipeline-dot spec (90–140 px/s).
- **Turbine:** 60–90 °/s constant; optional 1.5 s spin-up from 0 with ease-in at shot start.
- Labels for parts pop once (0.3 s each, 0.3 s stagger) *before* the loop starts or after a 1 s run-in, then the machine loops indefinitely; total mechanism shot = intro 3–5 s + loop as long as narration needs.

### Professional markers
- Every loop is mathematically seamless (frame 0 == frame N); no ease at the loop seam.
- Mesh points stay perfectly tangent; hatching stays fixed to the part while it moves (hatch translates/rotates with the body — a classic amateur error is static hatching).
- Motion trails and direction arrows never occlude the mechanism's working point.

---

## 10. Relationship diagrams

Venn (2/3 circles), 2×2 matrix, hub-and-spoke, comparison table.

### Looks found
- **Venn:** 2 or 3 circles **Ø 480–560 px**, strokes 3 px; fills translucent (multiply blend) — circle A **#3B82F6 @ 20 %**, B **#EF4444 @ 20 %**, C **#F59E0B @ 20 %**; overlap reads as a darker blended zone; labels 32 px bold outside, overlap label 30 px on white chip (24 px padding) for legibility.
- **2×2 matrix:** axes 3 px with arrowheads; quadrant fills at 8–12 % tint of one hue ramp; axis labels 28 px; quadrant titles 32 px bold + 24 px descriptor; dot markers Ø 16 px for plotted items.
- **Hub-and-spoke:** centre circle **Ø 240–320 px** with icon/label 34 px; 4–8 spokes of 2.5 px lines (or curved Béziers) to node pills **280×96 px**, radius 8 px, 2 px border; ring variant (measured from reference wheel): concentric rings with pastel wedges (**#D8D8DA / #F2D9E8 / #DDEBD5 / #D5D9EE**), 3–4 px white gaps, bold 32–36 px **#3A3A3C** category labels, white centre circle ≈15 % of wheel diameter.
- **Comparison table:** header row 64 px tall with accent fill (**#1D4ED8** or **#8B1A1A**) + white 28 px text; body rows 56 px, zebra striping **#F3F4F6**; winning cells get a ✓ chip (Ø 28 px accent circle).

### Moves found
- **Venn 2/3:** circles slide together from offscreen **400 px** apart over **0.9–1.2 s, ease-out (0.22, 1, 0.36, 1)**; overlap zone **flashes** (fill opacity 20→45→20 %) for **0.3 s** the moment circles touch; overlap label chip pops 0.25 s after. Settle hold ≥1.5 s.
- **2×2:** axes draw 0.5 s each (horizontal first) → quadrant tints fade in 0.35 s staggered 0.25 s (reading order) → plotted dots pop 0.2 s each stagger 0.2 s with 12 px label slides.
- **Hub-and-spoke:** hub pops (scale 92→100 %, 0.4 s) → spokes draw outward 0.4 s each stagger 0.2 s → node pills pop 0.3 s as each spoke lands; optional pulse ring from hub (Ø grows 0→1.2× hub, opacity 60→0 %, 1.5 s, every 4 s).
- **Comparison table:** header wipes in 0.5 s → rows **build one per 0.25 s** (fade + 12 px slide-up), synced to narration beats; ✓ chips pop 0.2 s with 110 % overshoot as their row lands; final winning column gets a 3 px accent bracket that draws top→bottom in 0.6 s.
- Wheel/ring variant: ring sweeps 360° over 1.5 s (radial wipe), wedges pop 0.3 s stagger 0.25 s, centre content pops last.

### Professional markers
- Venn circles are true equal-radius circles with consistent stroke; overlap label always on a solid chip (never translucent-on-translucent).
- Table rows share exact heights; every column left-aligned (numbers right-aligned, tabular figures).
- One accent colour means one thing (the "winner"/"overlap"), never decoration.

---

## Global timing & easing spec

Standard timings for the studio (1080p, 24/30 fps). These are defaults, not ceilings — every preset exposes them as parameters.

| Move type | Default duration / speed | Easing | Notes |
|---|---|---|---|
| Outline draw-on (blueprint) | 2.5–4 s total; 400–700 px/s | Linear to 8 % ease-out | Clamp: min 0.35 s, max 4.5 s per stroke |
| Detail stroke draw | length / 600 px/s (clamp 0.35–2.2 s) | Linear | Up to 3 concurrent strokes |
| Detail stagger | 0.2–0.4 s after outline; 0.08–0.15 s between siblings | — | Cascade, never simultaneous |
| Dimension line draw | 0.5–0.9 s (L→R, B→T) | Ease-out 10 % | Arrowheads snap in last 10 % (2 frames) |
| Measurement count-up | 0.8 s (small), 1.2 s (large/camera-reveal numbers) | Ease-out cubic | Tabular figures mandatory |
| Centre line | 0.5 s, +0.3 s after details | Fade + draw | Dash-dot 24/6/16 px |
| Hatching wipe | 0.6–0.8 s | Linear | 45° mask wipe |
| Label pop | 0.25–0.35 s, scale 0→110 %→100 % | Back-out (overshoot 1.1–1.15) | Leader draws 0.3–0.6 s *before* text |
| Label stagger | 0.35–0.5 s | — | Numbered order 1→n |
| Legend/table row build | 0.25 s per row | Ease-out | Synced to narration |
| Step box pop | 0.4 s, scale 92→100 % | Ease-out | — |
| Arrow draw | 0.5–0.8 s; 500–800 px/s | Slight ease-out | Lands 0.1 s before next box |
| Pipeline flow dots | 90–140 px/s constant | Linear (never ease) | Spawn every 0.9–1.3 s; dot Ø 14–18 px |
| Wireframe turntable | 6–12 °/s (≤15 °/s) | Linear | Tilt 5–15°, 0.5–1 °/s drift |
| Exploded part travel | 0.7–1.0 s, 80–160 px | Cubic ease-out (0.22,1,0.36,1) | Stagger 0.12–0.2 s per part |
| Cutaway layer reveal | 0.6–0.9 s per layer | Ease-out | Stagger 0.3 s |
| Tree branch grow | 0.5–0.8 s per generation | Linear-ish | Sibling stagger 0.3 s |
| Tree camera pan | 120–200 px/s | Linear (1 s ease at ends) | Draw ahead at 1.5× pan speed |
| Silhouette rise | 0.8–1.2 s (giant: 1.8–2.5 s) | Back-out 1.05 | Stagger 0.4–0.6 s smallest→largest |
| Camera pull-back reveal | 2.5–3.5 s, zoom 100 %→35–50 % | Ease-in-out | One camera move per shot |
| Camera descent (sections) | 160–240 px/s | Linear | Depth counter synced to travel |
| Gear mesh | 20–40 °/s; ω₂ = −ω₁·(Z₁/Z₂) | Linear, seamless loop | Loop = 1 rev of slowest gear (6–12 s) |
| Piston cycle | 2.0–2.5 s per crank rev | Constant ω (true kinematics) | Seamless loop |
| Pendulum | 2.0–3.0 s period, 15–25° amplitude | True sine | Seamless loop |
| Conveyor | 150 px/s belt pattern | Linear | Items at exact belt speed |
| Venn circle slide | 0.9–1.2 s, 400 px travel | Cubic ease-out | Overlap flash 0.3 s on contact |
| X-ray toggle | 0.4 s crossfade | Ease-in-out | Internals static during toggle |
| Before/after wipe | 0.9 s, 12 px soft edge | Linear | Hold both sides 1.5 s |
| Photo settle | 0.8 s, scale 1.04→1.0 | Ease-out quintic | Every graphic shot starts with a settle |
| Minimum hold (tail) | 1.5 s (2 s for lineups/sections) | — | Land last element at 85–95 % of shot |
| Minimum hold (between groups) | 0.3 s | — | "Breathing" gap |
| Handheld drift (optional) | ±0.4°, 8 s period | Sine | Only shots ≥6 s |
| Line boil (sketch styles) | ±1 px jitter, 8 fps stepping | — | Tracing-paper/chalk styles only |
| Exit fade | 0.4 s with 4 % push-in | Ease-out | — |

**Sound design defaults** (affects perceived timing): pen-scratch per stroke at −18 dBFS, one tick per count-up frame-change (throttled to ≤8 ticks/s), soft whoosh (−14 dBFS) on camera moves, low mechanical loop at −26 dBFS for mechanisms. Every animation event should have exactly one sound; silent moves read as broken.

---

## Sources

**Web search status:** DuckDuckGo HTML/lite and Mojeek were **bot-blocked** (captcha challenge) via curl; Bing via headless browser returned irrelevant cached results. Search snippets were instead gathered from **YouTube search result pages via the agent-browser headless browser** (worked reliably). Reference images were gathered via the **image-search skill** (z-ai CLI) and analysed with the **vision CLI (z-ai vision)**. Where noted, quantitative style facts come from those image analyses; timing numbers synthesise the tutorial patterns below with the assistant's motion-design expertise.

**YouTube searches performed** (titles/snippets read, videos not watched):
- `blueprint animation after effects tutorial` → Rawnose "Mastering After Effects Blueprint Effect in Minutes"; Motion Graphics Agency "How to make Blueprint reveal Logo Animation"; The Question Station "How to Create a Blueprint Background in After Effects"; SonduckFilm "Create Hyper Motion Graphics / Create Blueprint Animations in After Effects".
- `exploded view animation after effects tutorial` → Upstairs "Animating an Exploded Axonometric Diagram with After Effects"; Toffu Co "EASY EXPLODED BUILDING DIAGRAM Animation Tutorial".
- `family tree animation documentary video` → National Geographic "Human Family Tree"; UsefulCharts "Evolutionary Tree of Life"; Great Big Story "The Largest Handwritten Family Tree in the World".
- `scale comparison animation size comparison video` → Global Data "Universe Size Comparison | 3d Animation"; Real Data "Tallest statue size comparison 3d animation"; Scientificus "Cosmic Eye (Original HD)".
- `cross section animation after effects cutaway` → Brooker Films "Animate Lines in Adobe After Effects (Trim Paths)"; After Effects Channel "Cross animation with trim paths"; Flat Pack FX "Stylized Timeline Animation".
- `vox style diagram animation motion graphics` → Nuclear Media "Animate a Pie Chart in After Effects | Vox Style Infographics" & "How to Create Vox-Style News Graphics"; Chris Moran "How VOX breaks the Digital Feel with Motion Graphics"; Skai Generated "How To Create Vox-Style AI Motion Graphics".
- `chalkboard diagram animation news video` → Arc Solutions "Pulse Social Chalkboard Animation"; Prompt Katta "How to Create Animated Blackboard Motion Graphics"; whiteboard-animation tutorials.
- `photo to line drawing animation effect after effects` → One Click Motion "Turn Any Image Into a Hand-Drawn Doodle Video"; AnF Studios "Line Art Animation in After Effects | No Plugins"; Leah Jackson "Animate a single line drawing from Illustrator".
- `animating gears looping mechanism after effects` → LeeDanielsART "QUICK TIP | Animating Gears"; Ni3 Designs "Animate Gear in After Effects"; Nick Khoo "Animated gears".
- `blueprint style military documentary graphics video` → Blueprint channel F-35 documentary; byl "WWII Documentary in Capcut", "Advanced War Map Animation Like a PRO".
- `hindi explainer channel documentary graphics dhruv rathee style` → Tausif Khalid "Dhruv Rathee's Editing Style Decoded | Motion Graphics, Sound Design & More"; KamalPreet Singh "The Editing Formula Behind Dhruv Rathee's Videos".
- `wireframe 3d turntable rotating animation after effects` → SternFX "Make 3D Wireframes in After Effects"; SonduckFilm "Make Anything a 3D Wireframe 'Tron' Effect", "Create Cinematic 3D Wireframe Worlds".
- `venn diagram animation after effects` → ECAbrams "Animate Venn Diagrams"; Casey Farina "Color Mix/Wheel Venn Diagram"; K Motion Tutorials "Venn Diagrams Made Easy".

**Image searches + vision analyses** (z-ai image-search → z-ai vision):
- "blueprint technical drawing with dimension lines white lines on blue background" → cyanotype chair frame: bg **#1E3FA0/#1C3F9E**, all-white uniform-weight linework, 45° hatching at same weight, dimension lines with arrowheads both ends, numerals rotated to dimension direction, faint lighter-blue square grid (~20+ cells across width), handwritten marker numerals. (URL: https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0ab553d973c2.jpg)
- "exploded view diagram parts separated with labels leader lines" → returned a concentric ring infographic instead (still harvested): pastel wedges #D8D8DA/#F2D9E8/#DDEBD5/#D5D9EE, 3–4 px white radial gaps, bold #3A3A3C 32–36 px category labels, white centre ≈15 % of diameter. (https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/e517471163ca.png)
- "royal dynasty family tree chart with portraits and names documentary graphic" → Queen Victoria bloodline poster: white bg, crimson #8B1A1A title banner with thin black border, 56 px serif caps title, 26 px sans subtitle, legend with 4–5 px solid "parents" line vs thinner descents, tall scroll format. (https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/e756e569d196.jpg)
- "size comparison silhouette chart human next to animals with scale bar" → growth chart: white bg, thick black ruler spine with heavy top cap, barcode-dense ticks, ascending 24–28 px labels, bold sans title top-center. (https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/56e3ff5ef5a7.jpg)
- "exploded view diagram…" (2nd image) → annotated SaaS callout mockup: white rounded cards with 2 px borders and soft shadows, leader lines to features, dotted arc decoration — informs Family 4 label-card spec. (https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a182525f7111.png)
- Two further vision calls failed with upstream 500 errors (noted; not retried to stay in budget).

**Model expertise:** everything not directly evidenced above — especially the per-second timing tables, easing curves, loop mathematics (gear ratios, slider-crank, pendulum sine), draw-order conventions, and the six paper-style palettes — is synthesised from the assistant's motion-design knowledge, cross-checked for consistency with the tutorial patterns found. **Say-so notice: web text search largely failed; snippet-level search succeeded only via YouTube; the timing/numbers spec is therefore part research, part expertise.**
