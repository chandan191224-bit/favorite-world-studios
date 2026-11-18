// Wraps the depth model + ONNX Runtime wasm into classic <script> files so "Auto depth" also works when the studio is
// opened by double-click (file://, where fetch() of local files is blocked). Run once after updating vendor/ or models/:
//   node pack-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const b64 = f => fs.readFileSync(path.join(here, f)).toString('base64');
const write = (f, s) => { fs.writeFileSync(path.join(here, f), s); console.log('wrote', f, (s.length / 1048576).toFixed(1) + ' MB'); };
write('vendor/ort/ort-assets.js', '/* ONNX Runtime Web 1.22 (MIT) wasm + glue, packed for file:// use */\n' +
  'window.PPS_ASSETS = window.PPS_ASSETS || {};\n' +
  'PPS_ASSETS.ortMjs = ' + JSON.stringify(fs.readFileSync(path.join(here, 'vendor/ort/ort-wasm-simd-threaded.mjs'), 'utf8')) + ';\n' +
  'PPS_ASSETS.ortWasm = "' + b64('vendor/ort/ort-wasm-simd-threaded.wasm') + '";\n');
write('models/depth-model.js', '/* Depth Anything V2 Small (Apache-2.0), ONNX int8, packed for file:// use */\n' +
  'window.PPS_ASSETS = window.PPS_ASSETS || {};\n' +
  'PPS_ASSETS.depthModel = "' + b64('models/depth-anything-v2-small-q8.onnx') + '";\n');
