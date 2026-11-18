# SHARED CONTRACT — Collage & Split Studio fx families (read fully before coding)

You are writing ONE or TWO new files inside `collage-split-studio/src/fx/`. Do not edit any other file. No imports —
browser globals only (`CS.*`, `window`). Everything runs inside one self-contained HTML built by `build.mjs`.

READ THESE FILES FIRST (they are the whole API):
- `/home/z/my-project/collage-split-studio/src/fx/registry.js` (registry + param helpers + families)
- `/home/z/my-project/collage-split-studio/src/fx/splits.js` (the finished example family — match this style)
- `/home/z/my-project/collage-split-studio/src/core/util.js` (math/easing/noise/rough edges)
- `/home/z/my-project/collage-split-studio/src/core/draw.js` (photo/cutout/label/scrap primitives)
- `/home/z/my-project/collage-split-studio/src/core/engine.js` (how draw() is called — read `drawScene`)
- `/home/z/my-project/collage-split-studio/src/core/media.js` (what env.src(i) returns)
- `/home/z/my-project/collage-split-studio/research/catalogue.md` (the look spec)

## Registering a layout

```js
CS.fx.register({
  id: 'kebab-id', name: 'Human Name', family: '<one of the FAMILIES keys in registry.js>',
  slots: 4, minSlots: 2, maxSlots: 12, dur: 5,
  desc: 'One sentence shown as tooltip.',
  params: [ /* helpers below */ ],
  look: { bg: 'kraft', stop: 12, jitter: 0.55 },   // default look overrides (keys must be COMMON param keys)
  ownCamera: true,  // ONLY if the layout runs its own camera (disables the engine's global drift)
  draw(g, env) { ... },
});
```

Param helpers (from `CS.fx.P`, destructure like splits.js does):
`range(key,label,min,max,step,def)`, `select(key,label,[[value,label],...],def)`, `bool(key,label,def)`,
`color(key,label,def)`, `text(key,label,def)`.

NEVER declare these param keys — the registry appends them to every layout automatically:
`bg, bgColor, stop, jitter, drift, grain, vignette, labelStyle, labelSize`.

## The draw contract

`draw(g, env)` paints ONE frame. `env`:
- `W, H` canvas size; `S = Math.min(W,H)` (use for margins, font sizes, stroke widths)
- `t` seconds inside the scene (already stepped to the stop-motion fps), `dur` scene length, `p = clamp(t/dur)` 0..1
- `seed` (int), `P` resolved params, `mode`: `'composite' | 'element' | 'matte'`, `step` (stop-motion frame counter)
- `n` number of media slots; `src(i)` → `{ el, w, h, mask, bbox:[x0,y0,x1,y1], key, video, slot, i }`
  (empty slots give a numbered demo placeholder — never a broken image); `label(i)` → user label text or `''`
- `jit(k, amt=1)` → `[dx, dy, rot]` hand-placed jitter; zero unless stop-motion fps + jitter are on. `k` = element index.
- `bg()` → paints the background. **CALL IT FIRST, UNCONDITIONALLY** (it no-ops in element/matte modes).
- `labelSize` (multiplier for label size)

Primitives (`const D = CS.draw`):
- `D.photo(g, env, i, x, y, w, h, opts)` — photo/video in a rect. opts: `{ rot, scale, alpha, radius, border,
  borderBottom, borderColor, shadow (0..1.6), bw (0..1 B&W), tint, zoom, fit:'cover'|'contain', fx, fy, rough, seed }`
- `D.base(g, env, i, opts)` — full-frame base photo (auto-skipped in element/matte exports)
- `D.cutout(g, env, i, cx, cy, h, opts)` — cut-out (respects the user's mask) centred on cx,cy with content height h.
  opts: `{ outline (fraction of h, def .025), outlineColor, shadow, rot, scale, alpha, bw, tint, rough, flip, seed }`.
  Returns `{ w, h }` (w = 0 while fully scaled-out — check before drawing labels relative to it).
- `D.cutAspect(srcOrIndex)` — aspect ratio of the cut-out content
- `D.label(g, env, text, x, y, opts)` — opts `{ style:'pill'|'tag'|'white'|'type'|'hand'|'plain', size (frac of S, def .045),
  alpha, scale, rot, align:'left'|'right'|'center', color }`
- `D.scrap(g, env, k, x, y, w, h, opts)` — rough paper scrap, k = integer id. opts `{ kind:'kraft'|'white'|'news'|'color'|'dark',
  color, rot, alpha, shadow, rough }`
- `D.halftone(g, env, x, y, r, opts)` — halftone dot patch (no-op in matte)
- `D.setShadow(g, env, amt)`, `D.noShadow(g)`, `D.grade(g,x,y,w,h,bw,tint)`

Util (`const U = CS.util`): `U.clamp`, `U.lerp`, `U.range(p, a, b)` (normalised progress inside window a..b — CLAMPED 0..1),
`U.ease.{linear,in,out,inOut,outQuart,outExpo,inQuad,outBack,pop,slam}`, `U.h1(i,seed)` hash 0..1, `U.sh(i,seed)` −1..1,
`U.rng(seed)` seeded PRNG (allowed — seeded), `U.noise1/fbm1/noise2/fbm2`, `U.roundRect(g,x,y,w,h,r)`,
`U.gridFor(n,w,h)` best rows/cols for n in w×h, `U.tmp(key,w,h)` cleared scratch canvas, `U.canvas(w,h)`.

## Timing rule (the #1 QA failure)
Every discrete entrance/arrival must COMPLETE by `p = 0.95` and hold. Use
`const e = E.outQuart(U.range(t, START, START + LEN));` with all entrances finished by `0.95 * dur`. Staggered entrances:
spread so the LAST one lands ≤ 0.95·dur. Slow continuous camera moves may run to the end. If it still looks unfinished at
p = 0.85 in a contact sheet, it's a bug.

## The three modes
- `composite` — normal frame.
- `element` — photos/labels/scraps WITHOUT background (green-screen + transparent exports). `env.bg()` already no-ops;
  `D.base` no-ops. Never paint a full-frame opaque rect of your own in element mode (it would become a solid key block).
  For full-frame "cover" end-states (wall zoom, pip grow) it's OK — the photo itself is the element.
- `matte` — white silhouettes on transparency for B/W track mattes: `D.photo`/`D.cutout`/`D.label`/`D.scrap` handle it;
  any shape YOU draw by hand must be solid `#fff`, with shadows/textures/grain skipped (`if (env.mode === 'matte')`).

## Hard rules
- Deterministic: NO `Math.random`, NO `Date`/`performance` inside draw. Seeds only (`env.seed`, `U.h1/U.sh/U.rng(seed)`,
  `env.step`).
- NO `ctx.filter` (Safari). Use `D.grade`/compositing instead.
- Pans/zooms must NEVER expose an edge: exact cover scale `s = Math.max(W/w, H/h)`, clamp translate to
  `±(w*s − W)/2` etc. When zooming into a photo until it fills the frame, the END state must cover exactly.
- Performance: < 8 ms per frame at 640×360 (library thumbnails run this live). Cache expensive things in module-level
  `Map`s keyed with EVERYTHING that changes the result (seed, size, ids, colors). `U.tmp(key,w,h)` = cheap cleared scratch.
- Counts drawn on screen are WHOLE numbers (`Math.round`), never "12.0".
- Hindi (Devanagari) labels must never clip (D.label measures; keep ≥ 8 % padding on custom text).
- Use `env.src(i)` with wrap (`i % env.n`) when you need more photos than slots.
- Panel/photo counts: `const n = Math.max(minSlots, Math.min(env.n, MAX))`.
- Where the design needs a label that the user hasn't typed, fall back to generic text (`'A'`/`'B'`, `'BEFORE'`/`'AFTER'`)
  so preset thumbnails/QA sheets show the intended look. Never brand names, never real people, never the word "AI".
- File style: IIFE like splits.js:
  `(() => { const U = CS.util, D = CS.draw, { range, select, bool, color, text } = CS.fx.P, E = U.ease; ... const pr = CS.fx.preset; pr(...); })();`

## Presets (the library the user clicks)
`CS.fx.preset(id, name, fx, params, dur, note, slots)` — kebab ids, unique studio-wide. `params` = only the overrides.
Give every layout 3–5 presets exactly as listed in your brief. `note` = one short sentence for the card tooltip.

## Before you finish
`node --check <file>` must pass for each file you create. Report: file paths, layout ids + preset ids created, and any
deviations/assumptions. Create ONLY your assigned files; touch nothing else.
