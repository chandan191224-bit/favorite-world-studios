// Camera moves: every registered move maps raw progress p (0..1) to a camera state
// { zoom, x, y, rot, vertigo } — zoom 1 = the photo at rest. x/y are frame fractions
// (positive x moves the picture right = camera trucks left). Deterministic: seeded, no clock.
window.PP = window.PP || {};
PP.moves = (() => {
  const U = PP.util;
  const defs = {};

  function define(id, fn) { defs[id] = fn; }

  // resolve params (fx defaults <- preset params <- shot params) like the engine does
  function cam(move, p, ctx) {
    const fx = PP.fx.byId[move.fx] || {};
    const P = Object.assign({}, fx.defaults, move.params || {});
    const fn = fx.cam || defs[move.fx];
    const e = U.ease[P.ease || fx.ease || 'sine'];
    const state = fn ? fn(P, e(U.clamp(p)), U.clamp(p), ctx || {}) : { zoom: 1, x: 0, y: 0, rot: 0, vertigo: 1 };
    return Object.assign({ zoom: 1, x: 0, y: 0, rot: 0, vertigo: 1 }, state);
  }

  // depth multiplier for layered parallax: near (d=1) moves more, far (d=0) less
  function layerMul(d, K) { return 1 + (K == null ? 0.65 : K) * (d - 0.5); }

  // apply a camera state to a 2D context for one layer of depth d
  function applyLayer(ctx, cam, d, K, focus, W, H) {
    const m = layerMul(d, K);
    const z = 1 + (cam.zoom - 1) * m;
    const x = cam.x * m * W, y = cam.y * m * H, r = cam.rot * m;
    const fx = (focus && focus[0]) || 0.5, fy = (focus && focus[1]) || 0.55;
    let zz = z;
    if (cam.vertigo && cam.vertigo !== 1 && ctx.__focusD != null) {
      zz = z * Math.pow(cam.vertigo, (ctx.__focusD - d) * 2.8);   // subject plane stays constant
    }
    ctx.translate(fx * W + x, fy * H + y);
    ctx.rotate(r);
    ctx.scale(zz, zz);
    ctx.translate(-fx * W, -fy * H);
  }

  // shared building blocks for move definitions
  const TAU = Math.PI * 2;
  // sway/oscillation that decays so the shot settles by p≈0.95
  function settle(p) { return U.clamp(1 - Math.pow(U.clamp(p / 0.92), 2.2)); }

  return { define, cam, layerMul, applyLayer, settle, TAU };
})();
