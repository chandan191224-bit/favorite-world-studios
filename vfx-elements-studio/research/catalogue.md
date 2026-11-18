# Atmosphere & VFX elements — research catalogue

Feature spec for the VFX Elements Studio. Target: a deterministic, seeded, Canvas-2D overlay renderer that documentary/explainer editors (Vox, Johnny Harris, Hindi doc channels like Dhruv Rathee / Nitish Rajput style) can drop on footage and photos to build mood. Every number below is in **design px** on a reference **1920×1080 canvas @ 30 fps** — scale linearly by `w/1920`. All randomness must come from a **seeded hash noise** (value-noise → fBm), never `Math.random()`, so renders are reproducible and loopable.

---

## Sources looked at

Sandbox network blocked most search engines (bot-walls), so this list mixes successful reads with attempted queries. Domain knowledge of After Effects technique (Video Copilot, ActionVFX stock conventions, Cycore/Trapcode plug-ins) fills the gaps.

**Actually read (HTTP 200, content extracted):**
- `https://en.wikipedia.org/wiki/Muzzle_flash` — the 5 real components of a muzzle flash: primary flash (brightest, ultra-fast), intermediate flash (reddish disc in front of muzzle, shock-wave driven), secondary flash (large white/yellow fireball furthest from muzzle, re-ignition of unburnt ejecta), residual airborne sparks, plus increased smoke when flash-suppressant salts are used. Direct basis for our ex-muzzle timing/colour table.
- `https://en.wikipedia.org/wiki/Crepuscular_rays` — god rays are near-parallel shafts that only *appear* to radiate from the sun (perspective convergence), most visible at high light/dark contrast, warm/orange at dawn/dusk because low sun crosses ~40× more atmosphere (Rayleigh scattering). Basis for sk-god-rays geometry.
- `https://en.wikipedia.org/wiki/Fog` — fog = visibility < 1 km (mist is thinner); radiation fog forms at night over cooled ground, a *slight breeze* spreads it into a layer several hundred feet deep; fog is low-lying and locally generated. Basis for sm-ground-fog / sm-fog-bank layering.
- `https://en.wikipedia.org/wiki/Caustic_(optics)` — caustics are envelopes of refracted light forming bright net/web patterns; animate by moving the focus surface. Basis for wa-caustics.
- `https://en.wikipedia.org/wiki/Lightning` (grepped) — stepped leader → return stroke, dart leaders causing re-strikes/flicker, tree-like branching, "megaflash" > 5 s. Basis for we-lightning flicker timing.
- `https://en.wikipedia.org/wiki/Rain` (grepped) — drizzle impacts ≈ 2 m/s; raindrops are near-spherical (never teardrop), larger drops fall faster (mass vs drag). Basis for rain speed stratification.
- `https://videocopilot.net/blog/` — fetched (site up, titles not extractable from HTML); general knowledge of VC's Action Essentials 2 / muzzle-flash & explosion tutorials applied.

**Attempted but blocked (still informed the spec by confirming what pros search for):**
- `https://duckduckgo.com/html/?q=after+effects+smoke+overlay+documentary+tutorial` (empty response)
- `https://lite.duckduckgo.com/lite/?q=god+rays+light+shafts+after+effects+tutorial` (empty)
- `https://www.bing.com/search?format=rss&q=...` × 3 queries: "after effects smoke overlay documentary tutorial", "actionvfx smoke elements", "god rays after effects tutorial" (engine returned unrelated results — unusable)
- `https://www.mojeek.com/search?q=after+effects+rain+overlay+tutorial+documentary`, `.../muzzle+flash+after+effects+tutorial` (empty)
- `https://www.actionvfx.com/blogs/all` (Vercel security checkpoint) — ActionVFX library conventions (4K ProRes black-background stock, screen/add composite) applied from knowledge
- `https://aescripts.com` (HTTP 403) — knowledge of Trapcode Particular/Shine/Lux, Saber, Plexus applied
- `https://www.schoolofmotion.com/blog/...` (JS shell only)
- `https://searx.be/search?q=...` (anti-bot verification page)

**Canonical technique knowledge applied (no fetch):** AE Cycore effects (CC Rainfall, CC Snowfall, CC Drizzle, CC Particle World, CC Light Sweep, CC Mr. Mercury), Fractal Noise + Displacement Map + Linear Color Key fire technique, Video Copilot muzzle-flash/explosion tutorials, ActionVFX stock element categories (smoke, fire, muzzle flashes, atmospheres, debris, rain, snow), blending-mode conventions used by stock libraries.

---

## What makes overlays look professional (general rules)

1. **Timing is frame-accurate, not "fast".** Light-emitting events are 1–3 frames @ 30 fps (muzzle flash total 2–3 frames = 67–100 ms; lightning return stroke bright 2–4 frames; still-camera flash 1–2 frames). Smoke/dust, being massive, are slow: 2–8 s linger. Amateur work makes flashes too long (feels like glow) and smoke too fast (feels like steam).
2. **Motion physics per element class.** Reference gravity in design space: **G = 1500 px/s²** (1 m ≈ 150 px). Rain terminal velocity 1200–2000 px/s (big drops faster — mass beats drag); snow 60–140 px/s; ash 40–90 px/s; embers have *negative* buoyancy (−40 to −90 px/s² accel capped at 60–140 px/s rise) plus drag ~0.9–0.98/s; debris follows pure ballistics with drag 0.15–0.3/s; smoke puffs decelerate with drag 1.5–3.0/s (exponential velocity decay). Turbulence = curl-noise field, never per-particle sine alone.
3. **Colour encodes physics.** Black war smoke (incomplete combustion, oil/explosives): core `#1c1c1e`, body `#35353a`, rim/sun-lit edge `#6e6e73`. White chimney/water-vapour smoke: `#9a9a9a` at base → `#e8e8e8` as it thins and scatters light. Fire glow: core `#fff3c4` → `#ffb347` → `#ff6a00` → `#c62828` → dark char `#1a0e08`. Dust: tan `#c2a17a` → `#8a6f4d`. Heat/light overlays are additive (screen) with warm hex; massive overlays (smoke, dust, ash) are subtractive-ish (normal alpha) so they can *darken* the plate.
4. **Softness/depth: 2–3 parallax layers minimum.** Far layer: feature size 128–256 px, blur 6–12 px, speed ×0.3–0.5, opacity 0.5×. Mid: 64–128 px features, speed ×0.7. Near: 32–64 px, sharp, fastest, lowest alpha (0.15–0.3) so it reads as "air" not stickers. A single flat layer = the #1 amateur tell.
5. **Avoid the "flat blob": domain-warped fBm + curl advection + density shading.** Never render raw fBm as alpha. Pipeline: (a) fBm with 4–5 octaves, lacunarity 2.0, gain 0.5; (b) domain warp `p' = p + 0.6·fbm(p·0.5 + t·drift)` (this alone kills the "cloud-Photoshop-filter" look); (c) advect the density field along a curl-noise velocity (divergence-free → billowing swirls, no shrinking/growing artifacts); (d) density shading: alpha' = smoothstep(edge0, edge1, density), and darken dense cores (self-shadow) by multiplying RGB by `0.55 + 0.45·(1−density)`. Puff structure: render 8–24 overlapping radial-gradient "sprites" whose spawn times/positions jitter, not one big texture.
6. **Edge treatment: never a hard cut.** Feather every mask/shape 12–40 px (radial gradient alpha 0 at 80–90% radius). Element-to-footage boundary must fade below perceptibility; hard rectangles = instant fake.
7. **Loop behaviour.** Ambient loops (fog, embers, rain, dust, caustics, stars) must be seamless: standard loop lengths **4 s / 6 s / 8 s**. Technique with deterministic noise: render two fields offset by exactly the loop length and crossfade the last 15% of the loop (`w = smoothstep(0.85L, L, t)`); for particles, wrap positions modulo canvas + loop the turbulence field phase. One-shot events (explosions, lightning, splash) are non-looping clips with defined in/out.
8. **How editors composite stock overlays.** Light emitters (fire, flashes, sparks, god rays, lightning, caustics, camera flashes) → shoot on black, composite with **Screen/Add/Lighter Color** (black drops out, no matte needed). Massive/volumetric (smoke, dust, fog, rain streaks on dark) → **premultiplied alpha** or key green-screen stock then use normal alpha. In Canvas 2D: `globalCompositeOperation = 'screen'` (or `'lighter'` for extra punch) for emitters; `'source-over'` with per-pixel alpha for masses; optional final grade layer with `'multiply'`/`'overlay'`. Rain at night reads best with `'lighten'`; smoke over bright sky needs `source-over` with the sky-lit rim (rule 3).
9. **Frame-rate independence & determinism.** All motion defined as `f(t)` from a seeded noise/hash, not integrated state where possible; when integrating (debris, runners), store state but seed initial conditions from hash(seed, particleIndex, loopEpoch). Same seed ⇒ identical render, every time.

---

## Family 1: Smoke & fog

General smoke model: each **puff** = spawned at origin + jitter, radius r(t) growing (r += r·(0.25–0.6)/s), alpha peak 0.25–0.55 decaying over life 3–10 s, advected by wind vector + curl-noise turbulence (amplitude 8–30 px/s for calm, 60–120 px/s for violent), internal rotation from curl field. Colour ramp applied along density.

| # | Look | Geometry & motion (design px, s) | Colour ramp | Softness / timing | Amateur vs pro |
|---|------|----------------------------------|-------------|-------------------|----------------|
| 1.1 | **Thin rising smoke column** (cigarette / incense / distant chimney wisp) | Origin point; column height 300–500 px. Laminar lower 15–25% (straight, width 4–8 px), then transitions to turbulent: lateral wander = `40·sin(0.8t) + fbm(t)·30` px, width grows to 30–60 px at top. Rise speed 60–120 px/s (slows to 40–70 as it dissipates). Loop 6 s. | `#b8b8b8` → `#d8d8d8`, alpha 0.12–0.25. Slight warm tint `#c9c2b8` if backlit by fire. | Gaussian cross-section; top fades over 150–250 px. | Amateur: uniform width, straight rise, constant speed. Pro: laminar→turbulent transition, deceleration, growth. |
| 1.2 | **Thick black war smoke** (burning oil, strike, city raid) | Column 600–900 px tall, 300–500 px wide at top. Puffs 80–160 px radius spawned 6–10/s, rise 20–50 px/s (heavy, slow), heavy curl advection (amplitude 60–120 px/s), internal churn (each puff rotates ~10–25°/s). Life 8–12 s; lingers and drifts downwind 15–40 px/s after detaching. Loop 8 s (ambient version). | Core `#16161a` (alpha 0.85), body `#2e2e33`, edges thin to `#4a4a50`; *top rim lit by sky* `#6e6e73` (1–3 px bright band on sun side). | Density shading mandatory; 3 depth layers (×0.4/×0.7/×1 speed). | Amateur: flat grey blob, uniform grey. Pro: near-black core, visible billow churn, sky-lit rim, 10 s persistence. |
| 1.3 | **White chimney / steam smoke** | Puffs 30–80 px, spawn 2–3/s from fixed origin, buoyant: initial rise 80 px/s accelerating to 140 px/s for first 1 s, then drag flattens drift to wind speed. Detach and elongate into ellipses (2:1–3:1) after 2 s. Life 4–6 s. Loop 6 s. | Base `#8f8f8f` → mid `#c8c8c8` → dissolving edge `#ececec`, alpha 0.3→0.05. | Soft radial sprites; slight yellow tint `#d8d2c0` at dawn. | Amateur: circles that just scale. Pro: buoyant acceleration, elongation, colour lightens as density (and soot) drops. |
| 1.4 | **Drifting ground fog** | Band occupying bottom 20–35% of frame. 3 layers: far (features 256 px, drift 8–15 px/s, alpha 0.30, blur 10 px), mid (128 px, 18–28 px/s, 0.25), near (64 px, 30–45 px/s, 0.18, blur 0). Domain-warped fBm thresholded at ~0.45. Loop 8 s. | Cool neutral `#c5ccd4` (night) / `#dde3e8` (dawn), alpha 0.15–0.35. Luminous bottom edge if moonlit. | Edges feather 40+ px; must *silhouette* foreground subjects slightly. | Amateur: one blurry PNG crawling sideways. Pro: parallax layers, slow vertical breathing (±2% band height over 8 s). |
| 1.5 | **Rolling fog bank / mist wall** | A front that travels across frame at 30–60 px/s, 400–800 px deep, with visible *rolling* motion: top edge advances 10–20% faster than base, vertical billows 100–200 px rotating forward (like a slow wave breaking). fBm advected horizontally + curl cells along the leading edge. Loop 8 s. | `#b9c2cb` body, leading edge brighter `#e2e8ee` (catches light), interior 0.35 alpha. | Leading edge feather 30–60 px; trailing fade 200 px. | Amateur: uniform wall sliding. Pro: differential edge speed, breaking billows. |
| 1.6 | **Impact smoke puff** (hit, crash, landing) | One-shot: burst at t=0, 5–9 puffs ejected radially in a 60–90° cone upwind-biased, initial speed 300–600 px/s decaying with drag 2.5/s, radius grows 0.4–0.6×/s from 10–20 px to 60–120 px, total life 1.5–3 s. | Starts dusty local soil colour (e.g. `#a89476`), core darker `#6f6353`, thins to 0 alpha. | First 3 frames sharp, then soften fast. | Amateur: single scaling circle. Pro: directional cone, velocity decay, dust colour from environment. |
| 1.7 | **Battlefield smoke wall** (horizon dressing for war docs) | 6–12 smoke columns spaced 150–400 px along the horizon line, each a slowed 1.2 variant (rise 15–35 px/s), merging into a continuous 150–250 px-tall haze band. Whole band drifts 10–25 px/s with the "wind". Depth: 2 rows (back row ×0.5 speed, +15% blur, darker `#232327`). Loop 10 s. | Back `#232327`, front `#2e2e33`, sky-lit top edges `#5a5a60`; horizon glow if fires beneath `#4a3a2e`. | Bottom edge ragged (follows terrain silhouette); top feather 60 px. | Amateur: one repeated smoke sprite tiled. Pro: varied column heights/phases, merged band, terrain hugging. |

---

## Family 2: Fire

**The classic 2D procedural fire technique** (works in AE and Canvas alike):
1. Shape mask (flame silhouette — teardrop/tongue).
2. Fill with fBm noise **scrolling upward** at 200–400 px/s (noise y-offset = t·speed), 4 octaves, plus domain warp `x' = x + 25·fbm(x·0.02, y·0.02 − t·0.7)` for licking.
3. Vertical ramp: mask noise by height (more noise passes at the *base*, less at the tip): `alpha = smoothstep(tipY, baseY, y) · noise`.
4. Colour ramp along the same axis: `#000000 → #1a0500 → #7a1500 → #e33b00 → #ff9b1a → #ffe08a → #ffffff` (only the very base of big fires reaches white).
5. Flicker: global brightness × `0.85 + 0.3·fbm(t·6)`; tongue tips wander ±10–20 px at 3–6 Hz.

| # | Look | Geometry & motion | Colour / light | Timing | Amateur vs pro |
|---|------|-------------------|----------------|--------|----------------|
| 2.1 | **Torch flame** | 30–60 px tall, 12–20 px wide teardrop; single dominant tongue + 1–2 minor side tongues; sway = wind + `8·sin(2π·3t)` px; noise scroll 250–300 px/s. | Ramp per technique above, tip never white; casts warm glow disc (radial `#ff9b1a` 0.15 alpha, 80–150 px) with 8–11 Hz flicker. | Continuous, loop 4 s (flicker is statistical, loops trivially). | Amateur: symmetric teardrop, constant brightness. Pro: asymmetric tongues, flicker, glow on surroundings. |
| 2.2 | **Campfire** | 100–180 px flames from 3–5 origin points (logs); each tongue 60–140 px with independent phase; occasional "pop" throws 3–6 spark particles (Family 2.6). | Hot base with white `#fff3c4` pockets; glow pool 250–400 px on ground/actors' faces (screen, alpha 0.2, flicker). | Loop 6 s. | Amateur: one repeating flame GIF. Pro: multi-origin, pops, light spill that flickers on the *plate*. |
| 2.3 | **Large building fire** | Flames 200–400 px licking from windows/roofline (place along a mask path); heavy black smoke (1.2) above, glow windows `#ff7a1a` at 0.3–0.5 alpha behind flame layer. | Fire screen-composited; interior glow uses 'overlay' to keep wall texture. | Loop 8 s; flames surge ±30% height on 0.3–0.7 Hz noise. | Amateur: flames pasted flat with no glow. Pro: windows glow first, flames reach for sky, smoke separates above. |
| 2.4 | **Line of fire** (firebreak, trench, riot line) | 1D along a path (polyline): at each sample point, flame height `h = 40·(0.6+0.4·fbm(x·0.01, t·0.5))` px; width 10–18 px; independent noise phase per 100 px segment. | Base `#ffe08a` strip 3–5 px, body `#ff7a1a`, tips `#c62828`. Glow band along path 0.12 alpha. | Loop 6 s. | Amateur: one flame sprite stretched. Pro: coherent-but-uncorrelated heights (big features correlate, small don't). |
| 2.5 | **Embers drifting up** | Particles 2–4 px; rise 40–90 px/s (accelerating slightly, buoyancy), lateral wiggle `±15 px` at 0.5–2 Hz (per-particle frequency from hash), lifespan 2–4 s, spawn from area or line. **Cooling colour over life**: `#ffd27f (0–20%) → #ff9b1a (20–60%) → #e33b00 (60–85%) → #661200 (85–100%)`; alpha flicker `0.6+0.4·sin(2π·(6–10)t + φ)`. | Screen blend. Count 20–80 visible. | Loop 6 s (respawn wrap). | Amateur: yellow dots rising straight. Pro: cooling ramp, flicker, non-uniform rise. |
| 2.6 | **Spark bursts** | 10–30 particles ejected radially (cone if directional), initial 400–900 px/s, gravity 1500 px/s², drag 0.4/s, life 0.3–0.6 s; render as **streaks** (line from pos to pos−v·0.02), width 1–2 px tapering. | Head `#fff3c4`, tail `#ff9b1a`, alpha 1→0. | One-shot 0.6 s. | Amateur: dots. Pro: motion-stretched streaks, gravity arcs, cooling. |
| 2.7 | **Burning paper edge that eats inward** | Burn front = isoline of a noise field advancing inward from the border at **20–60 px/s** with noise-modulated speed (front position = `border + depth(t) + fbm·12`); behind the front: transparent (hole) with a 1–3 px **char ring** `#1a1208`; ahead: 2–6 px **glowing rim** `#ff7a1a` with inner 1 px white-hot `#ffd27f`, rim flickers 6 Hz; ahead of rim by 0–8 px a scorch tint `#3a2a1a` 0.3 alpha; occasional 1–2 px ash flakes fall (gravity, 60–90 px/s, drift). | Rim additive, char opaque. | Full A4-sized photo burn ≈ 6–12 s. Deterministic from seed + start corner. | Amateur: circle wipe with orange ring. Pro: noise-nibbled irregular front, char+glow+scorch zoned, flakes. |
| 2.8 | **Heat shimmer / haze** | Displacement of the *underlying plate*: sample plate at `p + d(p,t)`, `d = (2–6 px) · (fbm(p·0.01 − t·(40–80 px/s vertical)) − 0.5) · 2`, strongest near heat source, radially fading to 0 by 150–300 px; 2–3 noise octaves (0.5–2 Hz apparent). Also usable: slight vertical scale wobble 0.2%. | Neutral (it's a distortion, not a colour). | Continuous loop 4 s. | Amateur: wavy "flag" flag-like sine. Pro: upward-drifting, source-anchored, band-limited. |

---

## Family 3: Explosions & impacts

All timings at **30 fps** (frames in parentheses). One-shot clips with defined lifecycle; deterministic per seed.

| # | Look | Timeline (s @ 30fps) | Visuals | Notes |
|---|------|----------------------|---------|-------|
| 3.1 | **Muzzle flash** | **f0–f1 (0–67 ms): full flash.** f1–f2 (67–100 ms): half-size decay. f2–f30+ (0.1–1 s): smoke wisps, 1–2 s residual smoke; sparks (2.6) fly 0.1–0.3 s. | Frame-1 core: white `#fff8dc` star, 4–7 spikes, 60–140 px across (pistol ~60 px, rifle ~90, tank/artillery ~300+), spikes 1.5–2.5× core diameter; per Wikipedia, secondary flash is the big white/yellow fireball *in front of* muzzle, intermediate = reddish disc `#ff5a3c` closer to muzzle; residual sparks dribble out. 2–3 px muzzle darkening ring after. Side-on shows elongated ellipse (2:1–3:1 along barrel). Night: full-frame exposure bump 1–2 frames (screen white 0.15–0.25 alpha). | NEVER longer than 3 frames of visible light. Smoke (grey-white `#b8b8b8`) persists 1–2 s. |
| 3.2 | **Artillery horizon flash** | f0–f1: horizon flash (bright patch 100–300 px wide, flat). f0–f3: silhouette rim-light on skyline (warm `#ffb347` 0.3 alpha). f2–f10: flash decays to orange glow. f3+: distant smoke column (1.2) rises 15–35 px/s for 8–15 s. Optional f30–f45: ground rumble dust puffs along rooftops. | Sky flash = horizontal streak gradient `#fff3c4`→transparent over 80 px. | Distant = slower, dimmer, longer smoke. |
| 3.3 | **Fireball explosion** | **Phase A f0–f2 (0–67 ms): flash** — white core 100–260 px, full-frame bloom 1 frame. **Phase B f2–f15 (0.07–0.5 s): fireball** — sphere expands 120→260 px (ease-out), colour `#fff3c4`→`#ffb347`→`#e33b00`→`#7a1500` as it cools. **Phase C f3–f8: shockwave ring** — thin (3–8 px) ring expanding 800–1500 px/s to 300–500 px radius, alpha 0.4→0 (visible as dust/refraction). **Phase D f6–f30 (0.2–1 s): debris** — 8–20 chunks, 3–10 px, ballistic (v₀ 500–1200 px/s upward cone 45–75°, G=1500 px/s², drag 0.15–0.3/s), rotating 2–8 rev/s, leave 2–4 px grey trails. **Phase E f15–f150 (0.5–5 s): black smoke** — 1.2 columns from blast point, 10–25 puffs, life 4–6 s, glow-lit internally for first 0.5 s (`#ff6a00` at 0.2 alpha on smoke cores). | Ground burst adds dirt/dust cone 60–90° (1.6) under fireball. | Amateurs skip Phase C/E; pros always pay the smoke bill. |
| 3.4 | **Dust impact** (shell hits ground, no fire) | f0–f2: ejecta burst — 5–9 dust puffs (1.6) plus 4–8 pebbles (ballistic, 300–700 px/s). f0–f6: vertical dust column rises 150–300 px, base 60–120 px. f6–f45 (0.2–1.5 s): column topples downwind, spreads into 200–400 px cloud, fades. | Local soil colours; core `#6f6353` shadow, sun-side `#b8a37e`. | |
| 3.5 | **Bullet ground hits** | Per hit: f0–f1: 15–50 px dust spurt (2–4 puffs, 200–400 px/s initial, drag 3/s). f1–f12 (0.04–0.4 s): puff expands ×3 and fades. 30% of hits add 1–3 pebble streaks (0.2 s). Hits seeded by timeline markers or automatic rate 0.5–4/s. | Dust tan; night hits add 1-frame muzzle-dim spark `#ffd27f`. | Small = fast fade. Big puffs on soft dirt, sparks on stone. |
| 3.6 | **Flare / rocket trail** | Head: 6–12 px bright core `#fff8dc` + glow disc 30–60 px `#ff9b1a` 0.4 alpha, travelling 600–1200 px/s along slightly-curved path (slight gravity 150–300 px/s² if rocket, straight if flare). Trail: smoke puffs spawned every 15–25 px along path, 8–20 px at spawn, growing 0.5×/s, life 3–5 s, colour `#c9c2b8` (flare: warm `#e8c9a0`). Sputter: 2–5 sparks/frame ejected backwards (400 px/s, 0.2 s life). | Screen for head/trail glow; alpha for trail smoke. | Flare descends slowly (30–80 px/s) on parachute if illumination flare, lighting the ground (radial 0.25 alpha, slow drift). |

---

## Family 4: Weather

| # | Look | Geometry, speed, density | Colour & blend | Timing | Amateur vs pro |
|---|------|--------------------------|----------------|--------|----------------|
| 4.1 | **Light rain** | Streaks: length 15–30 px, width 1 px, angle 5–10° from vertical, speed 1400–1700 px/s, density 40–80 visible/frame @1080p. 2 layers (far ×0.6 speed/length, alpha 0.5). | `#cfd8e0` at 0.15–0.3 alpha, 'lighten'/'screen' at night; source-over 0.2 on bright day. | Loop 4 s. | Amateur: uniform lengths. Pro: length ∝ speed variance (drops 0.5–2 m/s spread per Wikipedia), near/far parallax. |
| 4.2 | **Heavy rain** | Length 60–140 px, width 1–2 px, angle 10–18°, speed 1700–2000 px/s, density 150–300/frame, 3 depth layers. Occasional sheet gusts (density ×1.5 for 0.5–1 s every 3–7 s). | Slightly blue-grey `#c4ccd6`, alpha 0.2–0.45. | Loop 4 s. | Pro: gust modulation, sheets, dimming grade (−10% exposure). |
| 4.3 | **Angled rain with wind** | Angle 25–45° from vertical (storm), speed vector = fall 1500 px/s + wind 400–900 px/s horizontal; streaks oriented along velocity; density 120–250. | As 4.2, + directional motion blur feel (streak = velocity·0.04 s). | Loop 4 s. | Pro: everything in scene shares the wind vector (rain, debris, mist). |
| 4.4 | **Rain with ground splashes** | 4.2 + splash ring per drop landing on ground plane: ring 0→10–30 px radius over 3–5 frames (100–167 ms), 1–2 px tall crown of 3–6 micro-droplets 1–2 px jumping 10–25 px. Splash density ∝ rain density × ground coverage (limit 10–40 active splashes/frame, seeded to a ground-plane grid so they stay put). | Ring `#dfe6ee` 0.35 alpha, expanding+thinning. | Loop 4 s (splash grid wraps). | Pro: splashes anchored to perspective ground plane (smaller far away), not screen space. |
| 4.5 | **Gentle snow** | Flakes 2–5 px (soft discs, 1–2 px blur), fall 60–140 px/s (size ∝ speed), sway `±20–40 px` at 0.2–0.6 Hz, density 60–150/frame, 3 depth layers (far: 1–2 px, 0.4× speed). | `#f4f7fa` at 0.5–0.9 alpha; screen blend over dark. | Loop 8 s. | Pro: depth layers, sway decorrelated per flake. |
| 4.6 | **Blizzard** | Horizontal wind 300–700 px/s vs fall 100–200 px/s ⇒ streaks at 60–80° from horizontal, streak length 20–60 px; density 300–600; visibility fog layer (1.4 at 0.3 alpha, cool white); gust noise modulates wind ±50% at 0.1–0.3 Hz. | White `#eef2f6` 0.2–0.5; scene desaturated + cooled. | Loop 6 s. | Pro: wind gusts, near-whiteout far layer. |
| 4.7 | **Lightning** | **Timeline (30 fps):** f0: pre-glow 1 frame (sky brightens 10%). f1–f4 (33–133 ms): main bolt — jagged polyline from sky to ground, segment lengths 40–120 px, direction changes ±25–40°, 2–5 **branches** leaving main channel at 30–60° (branch width 20–35% of main 3–6 px), core `#ffffff`, glow `#cfe0ff` 30–50 px 0.5 alpha. Sky flash whole-frame +0.3–0.5 exposure f1–f3. f5–f8: dim. f8–f14 (0.27–0.47 s): **re-strike** (dart-leader flicker): bolt re-brightens 1–2 frames at 60–80% intensity, same path ±2 px. Optional 2nd re-strike f20–f26. Bolt fades fully by f30 (1 s). Thunder never needed (docs add audio separately). | Bolt screen-blend; flash as additive full-frame. | One-shot; sequenced via markers or random every 6–20 s. | Amateur: zigzag that lingers. Pro: 2–4 frame strike, flicker re-strikes on the *same* channel, tree branching. |
| 4.8 | **Hail** | 3–6 px white discs (not streaks), speed 700–1100 px/s, near-vertical (angle <8°), density 40–100, 1-frame white 4–6 px bounce flash on ground hits (bounces 50–120 px, 1–2 bounces). | `#ffffff` 0.8–1 alpha. | Loop 4 s. | Pro: bounce flashes, size variance (5–25% of hail >8 px for drama). |
| 4.9 | **Dust storm** | 3 tan haze layers (fBm like 1.4 but faster): far (speed 150 px/s, alpha 0.4, features 256 px), mid 300 px/s, near 500–900 px/s (features 64 px, alpha 0.25, streaky — stretch noise ×3 horizontally). Leading wall option: 1.5-style front 400–700 px tall travelling 400–700 px/s. Debris silhouettes: 5–10 dark flakes tumbling at wind speed. | Tan ramp `#c2a17a`→`#8a6f4d`; scene graded sepia −30% saturation. | Loop 6 s. | Pro: horizontal streaking, wall front, sun becomes diffuse orange disc. |
| 4.10 | **Wind-blown leaves / paper** | Particles 6–18 px (leaf shape: ellipse with 2–3 lobes; paper: quad), horizontal speed 200–600 px/s (gusts ×1.8 at 0.2–0.5 Hz), vertical = `20·sin(2π·(1–3)t+φ)` flutter + occasional 100–200 px swoops; rotation 3–8 Hz (paper tumbles on 2 axes — render as skewing quad). Density 10–40. | Autumn `#c67b2e`/`#a84b28`, dry `#b8a37e`; paper `#d8d2c4`. | Loop 8 s. | Pro: tumbling 3D-ish rotation, gust correlation (all particles surge together). |

---

## Family 5: Sky & light

| # | Look | Geometry & motion | Colour & blend | Timing |
|---|------|-------------------|----------------|--------|
| 5.1 | **Time-lapse clouds** | fBm field advected 40–120 px/s (time-lapse compression: pick "real" 10 min → 8 s loop, so speeds ~80× life speed), plus evolution (octave phases drift) so clouds morph while moving. 2–3 altitude layers (high wispy ×0.4 alpha streaks; mid puffy; low dark). | Day: white tops `#ffffff`, bases `#b8c2cc` (light from above). Dusk: bases `#5a4a6e`, rims `#ffb347`. 'Screen' over sky, or replace-sky mask. | Loop 8 s. |
| 5.2 | **Storm clouds** | Towering mass entering from one side at 30–60 px/s; churn: curl advection 20–40 px/s on the underside; mammatus bumps (8–15 lobe bumps, 60–120 px, slight sag 5–10 px/s). | Base dark `#2a2d33`→`#4a4e57`, top edges still bright `#c9d2da`; occasional interior heat flash `#fff3c4` 1 frame (lightning behind). | Loop 10 s. |
| 5.3 | **God rays / light shafts** | Per Wikipedia: shafts are near-**parallel**; place convergence point at the sun (off/side frame), fan beams at 0.2–1.2° each, beam width 30–120 px at frame edge widening away from sun; beams rotate slowly ±2–5° over 10 s (cloud movement); each beam's alpha modulated by slow fBm (0.05–0.2 Hz) as clouds pass. | Warm `#ffd9a0` (dawn/dusk, Rayleigh) or neutral `#eef2f8`; alpha 0.08–0.25; **'screen'/'lighten'**. Beams visible only where they cross darker background (multiply mask by inverted plate luminance for realism). | Loop 8 s. |
| 5.4 | **Sun glare / lens bloom** | Core: radial gradient `#ffffff`→`#ffe8b0`→transparent, 60–200 px. Streak: horizontal anamorphic flare 300–800 px × 4–10 px `#ffd9a0` 0.3 alpha. Ghosts: 2–4 circles/hexagons 10–40 px along line through frame centre at 0.5–1.5× core distance, alpha 0.1–0.2, hue-shifted `#a0c4ff`/`#ffc4a0`. Gentle breathing ±10% size at 0.3 Hz. | Additive. | Loop 4 s. |
| 5.5 | **Moving cloud shadows** | 2–3 large soft dark patches (fBm thresholded, features 400–800 px) sweeping at 30–80 px/s across frame; alpha 0.10–0.25; edges feather 100+ px. Must move in the same direction as any visible clouds/rays. | Neutral black 'multiply' 0.1–0.25. | Loop 10 s. |
| 5.6 | **Night star field** | 150–400 points distributed with density gradient (Milky Way band option: density ×3 along a 15–30° wide diagonal band). Magnitude: alpha 0.3–1.0, size 0.5–2.5 px; brightest 5% get 4-point cross flare (4 px arms, 0.5 alpha). **Twinkle**: 20–30% of stars modulate alpha `0.7+0.3·fbm(t·(0.5–3 Hz))`; twinkle is subtle (amplitude ≤0.3). | `#ffffff`–`#cfe0ff` (hot) / `#ffd9a0` (cool K-stars); 'screen' over night plate. | Loop 8 s. |
| 5.7 | **Aurora curtains** | Vertical curtain sheets: for each x, a vertical gradient strip whose top edge y = base + `80·fbm(x·0.003, t·0.1)`, height 200–500 px, vertical streaks inside (stretch noise ×8 vertically). Curtains drift horizontally 20–60 px/s; internal streaks slide at different rates (parallax). | Base `#3dffb0`, upper `#4a90ff`, tips `#b0ffe0`; alpha 0.15–0.35; 'screen'. Occasional pink fringe `#ff7ab0` at the bottom edge. | Loop 10 s. |

---

## Family 6: Particles & debris

| # | Look | Physics & geometry | Colour | Timing |
|---|------|--------------------|--------|--------|
| 6.1 | **Dust motes in light beams** | 30–120 particles, 1–3 px, drift 5–15 px/s Brownian (curl noise, tiny amplitude), slight downward bias 2–5 px/s. **Visibility mask: only render inside beam polygons/light pools** (multiply alpha by beam mask 5.3). | `#fff3c4` warm if sunlit, `#dfe6ee` if window light; alpha 0.2–0.5, twinkle 0.5–1.5 Hz on 30%. | Loop 8 s. |
| 6.2 | **Falling ash** | Flakes 2–5 px irregular (2–3 px blobs), fall 40–90 px/s (light — high drag), flutter `±10–20 px` at 0.3–1 Hz, rotation slow 0.5–2 Hz. Density 60–200. | Grey ramp `#9a9a9a`→`#6e6e73`; some embers among it if fire nearby (2.5 at 10% density). | Loop 6 s. |
| 6.3 | **Falling debris** | Chunks 4–16 px (dark polygons), pure ballistic: v₀ 0–300 px/s, G=1500 px/s², drag 0.15/s, rotation 1–5 rev/s; optional small trail (2 px grey, 0.2 s). Spawn from a point/line (blast, collapse). | Silhouette `#1a1a1e` against sky, `#3a3a40` lit side. | One-shot 1.5–3 s or continuous feed 2–6/s. |
| 6.4 | **Flying paper / documents** | Quads 20–60 px (portrait pages), velocity 150–500 px/s along wind + vertical swoops `100·sin(2π·0.5t+φ)`, tumble on 2 axes: render as quad with skew `sin/cos` at 2–5 Hz (reads as 3D flip), occasional flat-glide moments (tumble phase crosses zero). 5–25 sheets. | Aged paper `#e8dfc8` with faint text lines `#8a7f68` 1–2 px strokes. | Loop 8 s. |
| 6.5 | **Bokeh circles** | 8–30 discs, 8–30 px (a few 40–60 px hero bokeh at 0.15 alpha), soft-edge radial gradient (no ring), float 10–30 px/s random-walk, alpha 0.1–0.3. Big ones become regular hexagons (camera aperture) 6-gon at >25 px. | Scene-tinted: sample plate hue, push +10% saturation; highlights `#ffe8c4`. 'Screen'. | Loop 6 s. |
| 6.6 | **Falling petals** | Petal shape (teardrop/ellipse 6–12 px), fall 60–120 px/s, sway ±40 px at 0.3–0.8 Hz, 3D flutter: scaleY oscillates 0.3–1 at 1.5–3 Hz (petal turning over). 20–80 petals. | Cherry `#ffb7c5`→`#ff8fa8`, backlit edge `#ffd9e0`; alpha 0.8. | Loop 8 s. |
| 6.7 | **Crowd camera flashes** | 1–2 frame white bursts: 6–16 px star/circle + 20–50 px glow, alpha 1→0 in 2 frames, at random positions within a crowd mask. Temporal clustering: bursts come in volleys — 3–8 flashes within 0.5 s windows, then 1–4 s quiet (Poisson gates). Positions weighted to upper-third of crowd region (raised cameras). | Pure white `#ffffff` + cool halo `#e8f0ff`. 'Screen'. | Continuous, event-triggered density (sparse before, dense at climax). |

---

## Family 7: Water

| # | Look | Geometry & motion | Colour & blend | Timing |
|---|------|-------------------|----------------|--------|
| 7.1 | **Ripples** (rain on a lake / pond surface) | Concentric rings from impact points; ring pair per ripple: crest highlight arc on the light side (top-left, 135°+180° arc) and shadow arc opposite (bottom-right); ring spacing 8–16 px, expansion 60–120 px/s, ring width 2–4 px growing to 6–10, alpha 0.35→0 by radius 120–250 px. 2–3 nested rings per drop, each new ring 30% dimmer. Skew ellipses (×0.35 vertical) if oblique camera. | Highlight `#ffffff` 0.3–0.4; shadow `#000000` 0.15–0.25. Over water plate, 'screen' for crests + 'multiply' for shadows. | Each ripple 1–2 s life; spawn 0.5–3/s for ambient pond, synced with rain hits for rain. |
| 7.2 | **Rain on window pane** (viewer inside) | Two particle classes: (a) **static droplets**: 40–150 stuck drops, 1–6 px, lens-shaped highlight top-left + darker bottom edge, static but slowly grow (0.02–0.05 px/s) until 5–8 px; (b) **runners**: when a static drop reaches critical size or randomly (2–6/s), it detaches and runs down: accelerate 30→150 px/s (gravity − drag), wobble ±3–6 px on noise, shrinking, **leaving a trail of 1–2 px micro-droplets** every 4–10 px (trail persists 3–10 s, slowly shrinking). Behind drops: refraction hint — brighten/magnify plate by 4–8% inside drop. Whole pane gets subtle fog bloom at edges. | Drops `#eef4fa` highlights on `#c8d4de` body 0.3–0.6 alpha; night: warm interior reflections streaks `#ffb347` 0.15. | Loop 10 s (runner spawns deterministic from seed×slot). |
| 7.3 | **Underwater caustics** | Ridged multifractal (|noise|−0.5 flipped, 4–5 octaves) thresholded to a bright **web/net** pattern — bright cell edges with darker interiors, i.e. the light-envelope net Wikipedia describes. Animate: pattern scale breathes 0.95–1.05 (2–4 s cycle) and the field drifts 5–20 px/s; 2 layers at different scales (1.0 and 1.6) and opacities for depth. | Pale aqua `#cfe8ff` core web on `#9ac4e8`; alpha 0.2–0.5; **'screen'** over underwater plate or pool floor. Add faint god-ray beams (5.3, steep angle) through the surface. | Loop 4–6 s. |
| 7.4 | **Splash crown** | One-shot on impact: (a) **crown**: 20–40 droplets ejected in a 60–90° upward cone, v₀ 150–400 px/s, G=1500, sizes 1–4 px, lives 0.4–0.8 s, render as teardrop streaks along velocity; (b) **expanding ring** on the surface (7.1 style, fast: 0→80–150 px in 0.5 s); (c) **column**: thin vertical spike 40–100 px rising then collapsing 0.3 s after impact. | Water takes plate colour, highlights `#ffffff` 0.5. | Total 0.8–1.2 s. Deterministic per seed. |

---

## Family 8: Combo stacks ("mood stacks")

Stacks = ordered render lists (back→front) + a grade. Ordering principle: *sky/light behind, masses mid, particles near, distortion last*.

| # | Stack | Layers (in render order) | Grade |
|---|-------|--------------------------|-------|
| 8.1 | **cb-war-city** (war-torn city, archival or reenactment) | 1. sk-storm-clouds (low, dark variant alpha 0.5) → 2. ex-artillery horizon flashes (every 8–20 s, seeded) → 3. sm-battlefield-wall (back row) → 4. fi-building fires on 2–4 skyline points + window glow → 5. sm-battlefield-wall (front row) → 6. ex-bullet-hits / ex-dust-impact sparse → 7. pa-ash-fall light → 8. fi-embers sparse → 9. subtle film grain + 15% desaturation. | Desaturate 20–35%, contrast +10%, blacks lifted 5% (aged), highlights tinted `#c9b8a0`. |
| 8.2 | **cb-partition-night** (night of fire and smoke, archival photos) | 1. Night grade on photo (see right) → 2. fi-building glow windows on horizon (warm pools 0.3 alpha) → 3. sm-column-thin ×4–6 at varied horizon points + one sm-war-black → 4. fi-embers rising through frame → 5. ex-artillery distant flash every 10–25 s (1 frame) → 6. heat shimmer low on horizon → 7. grain. | Dark blue base `#0a1220` multiply 0.6, warm fire pools screen `#ff7a1a` 0.15, deep shadows, moon highlight rim `#8fa8c8`. |
| 8.3 | **cb-storm-arrives** (transition mood, 10–20 s) | Phase 1 (0–30%): sk-cloud-shadows increase alpha 0.1→0.3, wind rises (audio implied). Phase 2 (30–55%): sk-storm-clouds enter, we-wind-leaves/debris light, 4.9 haze far layer. Phase 3 (55–80%): we-rain-light → we-rain-heavy crossfade over 3 s, 4.1→4.2 density ramp. Phase 4 (80–100%): we-lightning first strike + wind-bent rain (4.3), exposure −15%. | Progressive: saturation 100→70%, exposure 0→−0.5 stops, cool shift +5% blue. |
| 8.4 | **cb-dust-bowl** (depression-era, dry heat) | 1. Sepia grade → 2. we-dust-storm far wall (slow, 200 px/s) → 3. sk-sun-glare diffuse (sun as orange disc through dust) → 4. fi-heat shimmer strong (4–6 px) → 5. we-dust-storm near streaks → 6. pa-paper-fly / dry leaves sparse → 7. grain heavy (16mm). | Sepia `#8a6f4d` tint 25%, contrast −10% (haze lifts blacks), highlights `#e8c9a0`. |
| 8.5 | **cb-winter-front** (cold snap arrives) | 1. Cool grade → 2. sk-cloud-shadows → 3. we-snow-gentle fading in → 4. snow accumulation hint: white edge gradients on horizontal surfaces (0.2 alpha, grows over 10 s) → 5. we-snow-gentle → we-snow-blizzard ramp at climax → 6. window frost vignette (crystalline fBm edges from corners, 0.15 alpha) → 7. breath fog puffs if subjects (1.6 tiny, 0.5 s each, 3–5 s interval). | Cool `#dfe8f0` tint 15%, exposure −0.3, saturation −20%. |
| 8.6 | **cb-burning-archive** (photo burns while narrator speaks) | 1. Photo on dark background, vignette → 2. fi-burn-edge from 1–2 seeded corner(s), advancing 30–50 px/s → 3. fi-embers rising from the burn front → 4. sm-column-thin from the front → 5. warm flicker light on remaining photo (`#ff9b1a` radial 0.1 alpha, 8–11 Hz flicker, centred on front) → 6. fi-heat shimmer within 100 px of front → 7. pa-ash-fall sparse (the photo's ash) → 8. grade: remaining photo warms +10% as front approaches. | Background `#0a0806`; photo warm shift toward `#ffb347` 10%; smoke screen-grey, not black (small scale fire). |

---

## Parameter checklist (standard control set)

Every preset exposes these controls. "Design px" = 1920-space units; renderer scales by `w/1920`.

| Control | Type / unit | Notes |
|---|---|---|
| `amount` / density | float | Particle count or fBm coverage multiplier. 0–2, default 1. |
| `size` | px | Mean sprite/feature size at scale 1. Per-family defaults below. |
| `speed` | multiplier | Scales all velocities (not lifetimes). 0.25–3, default 1. |
| `wind` / direction | px/s vector or angle°+strength | Global advection vector; angle 0°=right, 90°=down-screen. Max per family. |
| `tint` | hex + strength 0–1 | Multiplies element colour; strength 0 = physical default ramps. |
| `opacity` | 0–1 | Global layer alpha, default per family. |
| `softness` | px blur / 0–1 | Edge feather; 0 = razor. Applied to sprites and masks. |
| `seed` | int | Feeds all hash-noise; changing seed = new layout, same behaviour. |
| `position` | x,y px | Emitter/origin for point effects; ignored by full-frame ambients. |
| `areaMask` | rect / ellipse / luma-path | Region beyond which alpha=0 (feathered 20–60 px). For "only behind the subject". |
| `loopLength` | s | 4/6/8/10 per family; one-shots report `duration` instead. |
| `startTime` / `trigger` | s or marker | For one-shots (explosions, lightning, splash, burn). |

**Per-family defaults:**

| Family | amount | size (px) | speed | wind max (px/s) | opacity | softness (px) | loop (s) |
|---|---|---|---|---|---|---|---|
| 1 Smoke/fog | 1 | 80 (puffs) | 1 | 60 | 0.45 | 24 | 8 (thin col 6, impact n/a) |
| 2 Fire | 1 | 120 (flame h) | 1 | 40 | 0.9 (flames) | 8 | 4–6 |
| 3 Explosions | 1 | 180 (fireball r) | 1 | 30 | 1.0 | 4 | one-shot 1.5–5 s |
| 4 Weather | 1 | streak L per table | 1 | 900 | 0.3 | 1 | 4 (snow/blizzard 6–8) |
| 5 Sky/light | 1 | beam 60 | 1 | 120 | 0.18 | 40 | 8–10 |
| 6 Particles | 1 | 3 | 1 | 500 | 0.5 | 1 | 6–8 |
| 7 Water | 1 | ring set 10 | 1 | 100 | 0.35 | 2 | 4–10 (splash one-shot) |
| 8 Stacks | — | inherits | 1 | 700 | 0.5 | — | 10 (or one-shot arc) |

---

## Preset list (55)

| id | name | family | one-line description |
|----|------|--------|----------------------|
| sm-column-thin | Thin smoke column | Smoke | Laminar→turbulent 300–500 px wispy grey column, 60–120 px/s rise, 6 s loop |
| sm-war-black | Black war smoke | Smoke | Heavy near-black billowing column, sky-lit rim, 8–12 s linger |
| sm-chimney | Chimney smoke | Smoke | Buoyant white-grey puffs, 2–3/s, accelerating rise then wind drift |
| sm-ground-fog | Ground fog drift | Smoke | 3-layer low band (bottom 20–35%), 15–45 px/s drift, cool neutral |
| sm-fog-bank | Rolling fog bank | Smoke | Travelling wall front 30–60 px/s with forward-rolling top billows |
| sm-impact-puff | Impact smoke puff | Smoke | One-shot directional dust burst, 300–600 px/s decaying, 1.5–3 s |
| sm-battlefield-wall | Battlefield smoke wall | Smoke | 6–12 merged horizon columns forming a 200 px haze band, 10 s loop |
| fi-torch | Torch flame | Fire | 30–60 px flickering tongue + warm glow pool, 4 s loop |
| fi-campfire | Campfire | Fire | Multi-origin 100–180 px flames with spark pops and flickering ground light |
| fi-building | Building fire | Fire | 200–400 px window flames + interior glow + black smoke separation |
| fi-line | Line of fire | Fire | Noise-height flame strip along a path, coherent-but-uncorrelated heights |
| fi-embers | Rising embers | Fire | Cooling-colour sparks rising 40–90 px/s with wiggle and 8 Hz flicker |
| fi-sparks | Spark burst | Fire | Radial 400–900 px/s streaks with gravity arcs, 0.3–0.6 s one-shot |
| fi-burn-edge | Burning edge | Fire | Noise-nibbled burn front with char ring, glowing rim, scorch zone, ash flakes |
| fi-heat | Heat shimmer | Fire | 2–6 px upward-drifting displacement of the plate, source-anchored |
| ex-muzzle | Muzzle flash | Explosion | 2–3 frame white-star flash + reddish disc + lingering smoke, night exposure bump |
| ex-artillery | Artillery flash | Explosion | 1–2 frame horizon flash with skyline rim-light and rising distant smoke |
| ex-fireball | Fireball explosion | Explosion | Flash→fireball→shockwave ring→ballistic debris→lingering black smoke |
| ex-dust-impact | Dust impact | Explosion | Ground-hit dust column rising 150–300 px then toppling downwind |
| ex-bullet-hits | Bullet ground hits | Explosion | Rapid 15–50 px dust spurts with occasional pebble streaks |
| ex-flare | Flare trail | Explosion | Bright head at 600–1200 px/s + smoke trail puffs + backward sputter sparks |
| we-rain-light | Light rain | Weather | 40–80 thin 15–30 px streaks at 5–10°, two depth layers, 4 s loop |
| we-rain-heavy | Heavy rain | Weather | 150–300 streaks 60–140 px with gust sheets, exposure −10% |
| we-rain-angled | Wind-driven rain | Weather | 25–45° streaks sharing a global 400–900 px/s wind vector |
| we-rain-splash | Rain with splashes | Weather | Heavy rain + perspective-anchored ground splash rings (3–5 frames each) |
| we-snow-gentle | Gentle snow | Weather | 60–150 soft flakes 60–140 px/s with decorrelated sway, 8 s loop |
| we-snow-blizzard | Blizzard | Weather | Near-horizontal 300–700 px/s whiteout with gust modulation |
| we-lightning | Lightning strike | Weather | 2–4 frame branched bolt, sky flash, dart-leader re-strikes on same channel |
| we-hail | Hail | Weather | Fast 3–6 px white discs with 1-frame ground bounce flashes |
| we-dust-storm | Dust storm | Weather | 3-layer tan haze wall at 150–900 px/s with streaky near layer |
| we-wind-leaves | Wind-blown leaves & paper | Weather | Tumbling 2-axis flakes/paper at 200–600 px/s with correlated gusts |
| sk-clouds-timelapse | Time-lapse clouds | Sky | Morphing fBm cloud decks at 40–120 px/s, 2–3 altitude layers |
| sk-storm-clouds | Storm clouds | Sky | Dark towering mass with curl-churned underside and mammatus lobes |
| sk-god-rays | God rays | Sky | Near-parallel light shafts converging at sun, alpha 0.08–0.25, 8 s loop |
| sk-sun-glare | Sun glare & bloom | Sky | Radial bloom + anamorphic streak + aperture ghosts, breathing |
| sk-cloud-shadows | Cloud shadows | Sky | 400–800 px soft dark patches sweeping 30–80 px/s, multiply 0.1–0.25 |
| sk-night-stars | Night star field | Sky | 150–400 magnitude-graded stars, 20–30% twinkle, Milky Way band option |
| sk-aurora | Aurora curtains | Sky | Green-blue vertical curtains with drifting noise edges and pink fringe |
| pa-dust-motes | Dust motes | Particles | 1–3 px motes drifting in visible light beams only, Brownian |
| pa-ash-fall | Falling ash | Particles | Grey fluttering flakes 40–90 px/s, optional ember minority |
| pa-debris-fall | Falling debris | Particles | Ballistic dark chunks 4–16 px with rotation and short trails |
| pa-paper-fly | Flying documents | Particles | 2-axis tumbling paper quads on wind arcs, text-line detail |
| pa-bokeh | Bokeh circles | Particles | 8–30 px soft discs (hexagon when large) screen-blended, float drift |
| pa-petals | Falling petals | Particles | Pink petals 60–120 px/s with 3D flutter (scaleY oscillation) |
| pa-crowd-flashes | Crowd camera flashes | Particles | 1–2 frame white bursts in clustered volleys within a crowd mask |
| wa-ripples | Water ripples | Water | Expanding highlight/shadow ring pairs, 60–120 px/s, elliptical for oblique camera |
| wa-rain-window | Rain on window | Water | Static growing droplets + runners with micro-droplet trails and refraction |
| wa-caustics | Underwater caustics | Water | Ridged-noise light web breathing 0.95–1.05 scale, screen blend |
| wa-splash | Splash crown | Water | 20–40 droplet arc crown + fast expanding ring + collapsing column |
| cb-war-city | War-torn city | Combo | Storm clouds + artillery flashes + battlefield walls + fires + ash + embers |
| cb-partition-night | Partition night | Combo | Blue night grade, fire-glow horizon pools, thin columns, embers, distant flashes |
| cb-storm-arrives | Storm arrives | Combo | 4-phase build: cloud shadows → wind debris → rain ramp → lightning |
| cb-dust-bowl | Dust bowl | Combo | Sepia grade, dust walls, diffuse orange sun, strong heat shimmer |
| cb-winter-front | Winter front | Combo | Cool grade, snow ramp, frost vignette, breath fog puffs |
| cb-burning-archive | Burning archive | Combo | Photo burn-edge with embers, smoke, front-glow flicker, ash, heat shimmer |

Total: **55 presets** (7 smoke, 8 fire, 6 explosion, 10 weather, 7 sky, 7 particle, 4 water, 6 combo).

---

### Implementation notes for Canvas 2D (binding summary)

1. **Noise core**: one `fbm(x, y, t, seed, octaves)` built on hashed value noise; `curl(x, y, t, seed)` via finite differences of a potential field `ψ = fbm(x·s, y·s, t·ts)`. All presets share it.
2. **Sprite batching**: pre-render soft radial-gradient puff/streak sprites to offscreen canvases at 64 px and 128 px; tint via a second composite pass (fill 'source-atop') instead of per-frame gradients.
3. **Blend discipline**: emitters → `'screen'`, masses → `'source-over'`, shadows → `'multiply'`, distortion (heat, window drops) → plate sampling with `drawImage` offset per 8–16 px block, not per-pixel (perf).
4. **Loop**: every ambient preset implements `render(t)` with `t = (time − start) mod loop`; two-field crossfade in the final 15% only for fBm fields (particles just wrap).
5. **Determinism**: every random draw is `hash(seed, id, index, epoch)`; identical seed + identical `t` ⇒ identical frame, enabling scrubbing and cache-friendly export.
