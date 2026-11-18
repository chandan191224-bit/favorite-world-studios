# Task 2-a: fx/compare.js + fx/grid.js (families `compare` and `grid`)

Your Task ID: **2-a**. Read `CONTRACT.md` in this folder first, then the source files it lists. Then CREATE exactly two
files and nothing else:

## 1. `/home/z/my-project/collage-split-studio/src/fx/compare.js` — family `compare`

### Layout `vsduel` — "A vs B duel" (slots 2, min 2, max 2, dur 5)
The classic "X बनाम Y" opener: two cut-outs (or photos) slide in from the left and right edges at slightly different
heights, facing each other with a small gap in the middle; a round VS badge pops between them (springy, `E.pop`); name
labels under each (`env.label(0) || 'A'`, `env.label(1) || 'B'`); the whole pair very slowly pushes in (2–3 %) to the end.
- params: `mode` (cutout | photo: cut-out stickers vs plain photos in rough frames), `badge` (vs | none), `badgeText`
  (text, def `VS`), `badgeColor` (color, def `#e5a93c`), `enter` (slide | pop: slide from sides vs springy pop-in at
  place), `gap` (0.1..0.5 how far apart they stand), `bw` (0..1 B&W grade on both).
- Badge: circle (r ≈ 0.08·S), badgeColor fill, white ring, dark bold badgeText. In matte mode: white circle, no text.
- Entrances done by p ≈ 0.35, badge by p ≈ 0.55, then hold (labels can trail 0.2 s behind each figure).

### Layout `abpanel` — "Side panel compare" (slots 2, dur 5)
Photo A (slot 0) full frame via `D.base`. Photo B (slot 1) slides in as a panel over one side: rect of width `width`
(frac 0.3..0.7 of W, def 0.45) with a straight or angled left edge (`edge`: straight | slant), soft shadow on the moving
edge. Tab labels pinned: `env.label(0) || 'BEFORE'` top-left, `env.label(1) || 'AFTER'` at the top of the panel (flip the
BEFORE label to the right when the panel comes from the right so they never overlap the panel).
- params: `side` (left | right), `width`, `edge`, `enter` (slide | wipe: panel edge sweeps), `labels` bool def true.
- Panel fully in place by p ≈ 0.4; both photos get a slow `zoom` (0..0.15, def 0.05) Ken Burns after that.

### Layout `abswap` — "Swap compare" (slots 2, dur 4.5)
Photo A full frame; photo B wipes over A along an angled edge — the edge sweeps left→right between p 0.12 and p 0.55
(`E.inOut`), a thin bright line rides the edge while it moves. Labels top-left/top-right stay put the whole time
(`BEFORE`/`AFTER` fallbacks). Optional `swapBack` (bool): at p 0.78..0.95 it sweeps back once. `edgeAngle` range
(−0.15..0.15 frac of W as x-offset difference top vs bottom).

### Layout `comparecards` — "Compare cards" (slots 2, dur 4.5)
Look `bg: 'kraft'`. Two white cards (rounded rect, soft shadow, opposite slight rotations ±2–3°) drop onto the paper
background with `E.outBack`, stacked vertically or side by side (`arrange`: side | stacked) — each card contains one
photo (`D.photo` inside the card with a small inset) and a header label above the photo inside the card
(`env.label(i) || 'A'/'B'`, dark text, no pill background — it's printed on the card). Cards landed by p ≈ 0.4.

### Presets (exact ids)
```
pr('vs-duel', 'A vs B – cut-out duel', 'vsduel', { mode: 'cutout' }, 5, 'Two cut-outs face off with a VS badge — type the two names in the photo slots.', 2);
pr('vs-duel-photos', 'A vs B – photos', 'vsduel', { mode: 'photo', badgeText: 'VS' }, 5, 'Same duel with framed photos.', 2);
pr('ab-panel', 'Before / after – side panel', 'abpanel', {}, 5, 'After photo slides over as a side panel with tab labels.', 2);
pr('ab-swap', 'Compare – angled wipe', 'abswap', {}, 4.5, 'B wipes over A along an angled line.', 2);
pr('compare-cards', 'Compare – two cards', 'comparecards', {}, 4.5, 'Two labelled cards drop onto paper.', 2);
```

## 2. `/home/z/my-project/collage-split-studio/src/fx/grid.js` — family `grid`

### Layout `grid` — "Photo grid" (slots 6, min 2, max 12, dur 5)
Even grid filling the frame with margin `margin` (frac of S, def 0.06): rows×cols from `layout`
(auto | 2x2 | 3x2 | 3x3 | 4x3 | 4x4; auto = `U.gridFor(n, W, H)`), `gap` (0..0.02 def 0.006), cell frames
(`frame`: none | white | dark, def white), `radius` (0..0.05), labels under cells (`labels` bool, `env.label(k)`).
Build-in (`build`: pop | cascade | slide | flip | none) staggered by `stagger` (0..0.5 frac of the build window, def 0.25):
- pop: `E.outBack` scale 0→1; cascade: same but ordered diagonally (i = col + row); slide: from off-screen top/bottom
  alternating; flip: horizontal scale −1→1 flip look (draw photo into `U.tmp` then draw scaled) — your choice, keep it
  cheap; all cells in place by p ≈ 0.45.
- `rearrange` (bool def false): at p 0.5..0.9 photos fly to a seeded permutation of the same cells (`E.inOut`), settle,
  hold. While flying, photos keep their content but change position (photo k of cell c moves to cell perm(c)).
- `kb` slow zoom inside cells (0..0.2 def 0.04).
- Number badges optional (`numbers` bool def false): small amber circle + whole number 1..n on the top-left of each cell
  (matte: white circle, no digit).

### Layout `masonry` — "Masonry grid" (slots 6, min 3, max 8, dur 5)
Editorial mixed grid: 2 columns; ~1/3 of cells (seeded, rounded count) span both columns (wide) or are tall (span 2
rows) — precompute a deterministic layout from `seed` + n that fills W×H nicely with the same margin/gap params as
`grid`. Build: diagonal cascade (`E.outQuart` scale + fade-free slide-up 0.05·H), done by p ≈ 0.5, hold with kb zoom.
Params: `margin`, `gap`, `frame`, `labels`, `kb`.

### Presets (exact ids — `grid-3x3-cascade` is referenced by the default project, it MUST exist)
```
pr('grid-2x2-pop', 'Grid 2 × 2 – pop', 'grid', { layout: '2x2', build: 'pop' }, 5, 'Four photos pop in.', 4);
pr('grid-3x2-cascade', 'Grid 3 × 2 – cascade', 'grid', { layout: '3x2', build: 'cascade' }, 5, 'Six photos cascade in diagonally.', 6);
pr('grid-3x3-cascade', 'Grid 3 × 3 – cascade', 'grid', { layout: '3x3', build: 'cascade', stagger: 0.3 }, 5.5, 'Nine photos build diagonally.', 9);
pr('grid-4x3-wall', 'Grid 4 × 3 – wall', 'grid', { layout: '4x3', build: 'cascade', frame: 'none', gap: 0.002 }, 5.5, 'Twelve photos tile the frame edge to edge.', 12);
pr('grid-rearrange', 'Grid – rearrange', 'grid', { layout: '3x2', build: 'pop', rearrange: true }, 6, 'Photos build, then fly to new places.', 6);
pr('grid-masonry', 'Masonry – mixed grid', 'masonry', {}, 5, 'Editorial mixed-size grid.', 6);
```

Finish with `node --check` on both files. Report the layout + preset ids you created and any assumptions.
