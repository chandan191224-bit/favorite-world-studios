// Packed assets (fonts, demo photos) + ORT/depth-model glue. The big model files
// (models/depth-model.js, vendor/ort/ort-assets.js) are classic <script> files next to the HTML.
window.PP = window.PP || {};
PP.assets = (() => {
  const U = PP.util;

  // Demo photos are inlined by build.mjs (base64 JPEG, generated/artwork placeholders users replace with their own).
  const DEMO = {};
  /* @demophotos */

  const DEMO_INFO = [
    ['horseman', 'Rider at dusk (photo)'],
    ['factory', 'Archive: three men (photo)'],
    ['desert', 'Night camp (photo)'],
    ['room', 'Window light room (photo)'],
    ['ridge', 'Valley ridges (art)'],
    ['street', 'Old street (art)'],
    ['steps', 'Steps & figure (art)'],
  ];

  const demoCache = {};
  function demoImage(id) {
    if (demoCache[id]) return demoCache[id].then ? demoCache[id] : Promise.resolve(demoCache[id]);
    const p = DEMO[id] ? U.loadImage(DEMO[id]) : Promise.reject(new Error('missing demo ' + id));
    demoCache[id] = p;
    p.then(el => { demoCache[id] = el; }).catch(() => { delete demoCache[id]; });
    return p;
  }
  // sync: the loaded <img> for a packed photo demo (null until demoImage resolves)
  function demoEl(id) {
    const c = demoCache[id];
    return c && c.width ? c : null;
  }
  function demoReady() { return Object.keys(DEMO).length > 0; }

  // ---- ONNX Runtime glue (packed for file:// by pack-assets.mjs) ----
  let ortReady = null, session = null, sessionKey = '';
  function ortAvailable() {
    return !!(window.PPS_ASSETS && PPS_ASSETS.depthModel && PPS_ASSETS.ortWasm && PPS_ASSETS.ortMjs && window.ort);
  }
  function b64u8(b64) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  async function initOrt() {
    if (window.ort) {
      const ort = window.ort;
      ort.env.wasm.numThreads = 1;             // file:// pages are not cross-origin isolated
      ort.env.wasm.proxy = false;
      // The wasm must come from blob URLs made from the packed assets (file:// cannot fetch),
      // passed as wasmPaths so ORT provides locateFile() — without it the wasm loader tries
      // new URL(…, import.meta.url) on a blob: module and throws.
      if (!ort.env.wasm.wasmPaths) {
        const mjsUrl = URL.createObjectURL(new Blob([PPS_ASSETS.ortMjs], { type: 'text/javascript' }));
        const wasmUrl = URL.createObjectURL(new Blob([b64u8(PPS_ASSETS.ortWasm)], { type: 'application/wasm' }));
        ort.env.wasm.wasmPaths = { mjs: mjsUrl, wasm: wasmUrl };
      }
    }
    return window.ort;
  }
  function getSession() {
    if (!ortReady) ortReady = (async () => {
      const ort = await initOrt();
      session = await ort.InferenceSession.create(b64u8(PPS_ASSETS.depthModel), { executionProviders: ['wasm'] });
      sessionKey = 'ok';
      return session;
    })().catch(e => { ortReady = null; throw e; });
    return ortReady;
  }

  return { DEMO, DEMO_INFO, demoImage, demoEl, demoReady, ortAvailable, getSession, b64u8 };
})();
