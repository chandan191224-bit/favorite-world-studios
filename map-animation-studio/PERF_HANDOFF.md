# Map Animation Studio smoothness (2026-10-30) — closed

User, 2026-10-31: *"the fast preview mode working too good … u dont need to make any further changes to make it smoother"*.
Kept: fast built app + gzip + `--lan` phone mode, Preview Auto/Fast/Full, GPU canvas, viewport culling + zoom thinning
(`src/map/cull.ts`). `src/map/reuse.ts` (cached base-map reuse) exists but is switched off in `app/Stage.tsx` (untested idea).
Measured map paint in Chrome: Full 231 ms, Auto 72 ms, Fast 46 ms. Tools: `scripts/perf-profile.mjs`, `scripts/perf-check.mjs`.
