# Screen Mockup Studio Pro — code contract

A **shot** = one screen element: `device` (what holds the screen) × `content` (what is on the screen) × `camera` (how the
3D camera moves) × `bg` (background) × `focus` (zoom-to-detail with blur-out). Presets in `src/presets.js` are named
combinations of these. Everything is seeded and driven only by time, so preview == browser export == `render.mjs`.

## Content (src/content/*.js)

```js
SM.content.register({
  id: 'terminal', name: 'Hacker terminal', family: 'ops', icon: '⌨',
  params: [ SM.content.P.textarea('lines', 'Lines', '$ ssh archive@10.0.0.7\n...'), SM.content.P.select(...), ... ],
  browser: null,            // or a default URL string -> the engine draws browser chrome (desktop) / URL pill (phone) above
  statusBar: true,          // phone/tablet: engine draws the status bar above the content (default true when tall)
  focus(env) { return { x, y, w, h }; },   // optional, logical px inside the content rect (used by "Zoom to focus")
  draw(g, env) { ... },
});
```

`draw(g, env)` — `g` is a 2D context already scaled to **logical px**. Draw inside `0..env.W × 0..env.H` (the rect under
any chrome). The canvas starts transparent: paint your own background (leave it transparent only for HUD-only looks).

`env` fields:
| field | meaning |
|---|---|
| `W`, `H` | logical size of the content rect. Desktop-like screens are ~1440 wide (laptop 1440×~870, monitor/TV/flat 1600×900); phone ~440×~950 (tall). `env.tall` is `H > W`. Lay out for both. |
| `t`, `dur`, `p` | seconds into the shot, shot length, `t/dur` (0..1, clamped). Finish animations by p≈0.9. |
| `P` | this content's params merged with defaults |
| `seed` | integer seed of the shot |
| `fps` | project frame rate (for frame-stepped noise / blink) |
| `media(key)` | `{ el, w, h, kind }` for the media slot param `key` (`'media'`, `'media2'`…) or `null` |
| `U`, `F`, `C` | `SM.util`, `SM.font(weight, px, 'sans'|'serif'|'mono')`, `SM.chrome` |

Rules: no `Math.random`, no `Date`, no `ctx.filter` (Safari), no network. `shadowBlur` and blend modes are fine.
Fonts: `SM.font(...)` only (bundled Inter/Noto Serif/JetBrains Mono + Mukta for Hindi). Generic names only — never a real
brand, logo, channel or person; names are editable params. Never write "AI" in on-screen defaults. No sound.

`SM.chrome` helpers: `theme(dark)`, `statusBar`, `browserBar`, `mobileUrl`, `windowBar`, `cursor(g, keys, t, o)` with
`keys = [{t, x, y, click}]`, `appIcon`, `avatar`, `drawCover(g, m, x, y, w, h, {fit, zoom, fx, fy, seed, label})`
(draws a placeholder scene when `m` is null), `placeholder`, `text`, `para` (wrap + returns line boxes).
`SM.util`: `clamp lerp range smooth rng h1 h2 noise1 fbm1 ease.{inOut,out,in,expo,outExpo,back,spring} rr wrap typed glen
rgba mix shade clock(start, sec) mmss tmp(key, W, H)`.

## Device (src/core/devices.js)
`build(P, {W, H}) -> { parts:[{ M, pts, z0, z1, mat, host?, decals?(g, cam) }], screen:{ M, w, h, cx, cy, z, r, bulge?,
windowBar? }, bounds:{ w, h, d, cx, cy, exact? }, floorY, screenFx?(g, W, H, t), shadowCard?, cinema? }`. Parts are convex
slabs (outline extruded z0..z1 in the part's local frame `M = {R, T}`), drawn far-to-near with backface culling.

## Export modes
`composite` (background + device + screen), `green` / `blue` (element on #00FF00 / #0000FF), `alpha` (element on
transparent → WebM VP9 alpha / PNG frames), `matte` (white element on black), `screenkey` (screen filled #00FF00 so any clip
can be keyed in later), `screenmatte` (white screen area on black, occluders black).
