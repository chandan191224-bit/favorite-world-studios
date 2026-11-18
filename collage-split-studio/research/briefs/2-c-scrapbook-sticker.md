# Task 2-c: fx/scrapbook.js + fx/sticker.js (families `scrapbook` and `sticker`)

Your Task ID: **2-c**. Read `CONTRACT.md` in this folder first, then the source files it lists. Then CREATE exactly two
files and nothing else. These two families are the Johnny Harris / Vox heart of the studio — make them feel
hand-placed: seeded scatter, small rotations, stop-motion boil, physical entrances.

## 1. `/home/z/my-project/collage-split-studio/src/fx/scrapbook.js` — family `scrapbook`

### Layout `scrap` — "Scrapbook collage" (slots 5, min 2, max 8, dur 6) — THE Johnny Harris look
Look: `{ bg: 'kraft', stop: 12, jitter: 0.55, drift: 0.45, labelStyle: 'hand' }` (12 fps stop-motion + hand-placed jitter
by default; the engine's `jit()` does the boil for you).

- Positions: precompute ONCE per (seed, n, params) a scattered arrangement that fills the frame with generous margins
  (≈ 0.08·S) and controlled overlap: start from a loose grid (`U.gridFor`), then jitter each centre ±0.35 cell,
  scale each photo 0.9–1.15 (seeded), rotate ±`rot` (deg param 0..10 def 5). Ensure the biggest photo is near the
  centre; sort so bigger photos draw first (behind). Cache this arrangement (module-level Map keyed by
  seed|n|spread|W|H|mode-ish — include everything that changes it).
- Photo style: `style` param (cutout | rough | photo):
  - cutout: `D.cutout` with white outline (`outline` def 0.028) + shadow 1 — the JH sticker look;
  - rough: `D.photo` with `rough: 1.6` (hand-cut edge), white `border` 0.004, shadow;
  - photo: plain `D.photo` rect, thin border, shadow.
  Apply `bw` (0..1 def 0) B&W grade (preset `jh-bw-collage` uses 1). Photo heights ≈ 0.3..0.45·H (seeded), widths from
  `D.cutAspect`.
- Scraps: `scraps` bool def true — 2–4 `D.scrap` patches (kraft/white/news, seeded kinds) BEHIND the photos at partially
  visible spots + one `D.halftone` patch (`halftone` bool def false) near a corner; they appear first
  (p 0.02..0.18, `E.outQuart` alpha-free slide-in from the nearest edge or scale-up — don't use plain alpha fades for
  paper; scale + slide is physical).
- Entrance: photos fly in one by one from alternating off-screen sides (left, right, left…): slide `E.outQuart` +
  rotation settles from ±25° to the resting rotation (overshoot a touch — `E.outBack` on the rotation), stagger
  `stagger` (0.1..0.5 s def 0.22), LAST one landed by p ≈ 0.62. While flying, scale 1.06→1.
- Labels: `labels` bool def true — `env.label(k)` drawn near photo k (slightly below-right, rotated with the photo,
  style from `labelStyle` — hand by default here), appearing 0.25 s after its photo lands (`E.pop` scale-in).
- After landing: hold with the stop-motion boil (`env.jit(k)` per photo — pass different k per photo), plus a very slow
  whole-group push handled by the engine's `drift` look param (do NOT add your own camera).

### Layout `scraptidy` — "Chaos → order" (slots 5, min 3, max 8, dur 6)
Same scatter + entrances, but compressed: all photos in by p ≈ 0.38. Then at p 0.52..0.9 every photo flies
(`E.inOut`, ±0.05 s stagger) to a NEAT row (or 2 rows when n > 5) along the vertical centre: equal heights 0.34·H,
even spacing, rotation → 0, no overlap; labels pop under each in the tidy row; hold to the end. This is the
"many stories → one timeline" move.

## 2. `/home/z/my-project/collage-split-studio/src/fx/sticker.js` — family `sticker`

### Layout `stickers` — "Sticker pop-ins" (slots 3, min 2, max 6, dur 5)
- `base` param (photo | plain, def photo): slot 0 full frame via `D.base` (with slow zoom 0.05) — or plain background
  (`env.bg()` only, look `{ bg: 'dark' }`).
- Slots 1..n−1 are cut-out stickers: `D.cutout` with white outline (`outline` def 0.03), shadow 1.1, seeded scattered
  positions in a ring/inset margin (never covering each other's centres; keep 0.12·S+ apart), heights
  0.18..0.3·H seeded. They pop in one by one (`E.pop`, stagger `stagger` def 0.3 s, last by p ≈ 0.7), each with a tiny
  continuous wiggle from `env.jit(k)` and a static seeded rotation ±6°.
- Each sticker gets a small label (`labels` def true) that pops 0.2 s after it: `env.label(k)` near its foot.
- `bw` param optional grade on stickers only.

### Layout `lineup` — "Sticker lineup" (slots 4, min 2, max 6, dur 5)
Look `{ bg: 'dark' }`. Cut-outs slide in from alternating left/right edges along the lower third, decelerating into a
row (equal heights 0.4·H, even x spacing, slight static rotations ±3°), each with a small settle-bounce
(`E.outQuart` + 4 % overshoot via `E.outBack` blend or a tiny post-arrival scale wobble). Last in by p ≈ 0.62. Labels
(`env.label(k)`) pop under each. Slow group push 1→1.04 to the end. In matte mode this is a clean white silhouette row.

### Layout `stickerfan` — "Sticker fan-out" (slots 4, min 3, max 6, dur 5)
Cut-outs start clustered at the centre (overlapping, scale 0.6), then between p 0.12 and 0.55 they burst outward
(`E.outQuart`) to a seeded ring (radius 0.3·min(W,H), angles spread evenly + seeded jitter, rotations tangent to the
ring), scale to full; labels pop after; slow ring rotation of ±3° total to the end (`E.inOut`).

### Presets (exact ids — `jh-bw-collage` is referenced by the default project, it MUST exist)
```
pr('jh-bw-collage', 'Scrapbook – B&W on kraft', 'scrap', { style: 'cutout', bw: 1 }, 6, 'The classic explainer opener: B&W cut-outs, white outlines, kraft paper, 12 fps jitter.', 5);
pr('scrapbook-pop-in', 'Scrapbook – colour pop-in', 'scrap', { style: 'cutout', bw: 0 }, 6, 'Colour cut-outs fly onto the paper one by one.', 5);
pr('scrapbook-chaos-order', 'Scrapbook – chaos to order', 'scraptidy', {}, 6, 'The scatter flies into a neat labelled row.', 5);
pr('scrap-annotated', 'Scrapbook – annotated', 'scrap', { style: 'rough', bw: 0.55, halftone: true, scraps: true }, 6, 'Hand-cut photos with scraps and halftone print dots.', 4);
pr('vox-halftone', 'Scrapbook – print look', 'scrap', { style: 'photo', bw: 0.7, halftone: true }, 6, 'Halftone-heavy newsprint look.', 4);
pr('sticker-pop', 'Stickers – pop-in', 'stickers', {}, 5, 'Cut-out stickers pop in over the photo.', 3);
pr('sticker-lineup', 'Stickers – lineup', 'lineup', {}, 5, 'Cut-outs slide in and line up.', 4);
pr('sticker-fan', 'Stickers – fan-out', 'stickerfan', {}, 5, 'Cut-outs burst from the centre into a ring.', 4);
```

Notes:
- `D.cutout` on a photo WITHOUT any mask gives a rough hand-cut blob by default — for `style:'cutout'` pass `rough: 0`
  so the outline follows the photo rectangle tightly (or a gentle 0.6 for a hand-cut feel). When the user HAS cut the
  photo out (auto/lasso/ellipse), the outline follows their mask — that's the point.
- Never place a sticker's label where the sticker itself will land — offset labels outward from the group centre.
- All randomness seeded from `env.seed` (+ index). No `Math.random`/`Date`.

Finish with `node --check` on both files. Report the layout + preset ids you created and any assumptions.
