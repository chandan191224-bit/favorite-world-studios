// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Paper Transition Studio Pro.html"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendor)) {
  // Mediabunny (MPL-2.0) muxer, already installed for the Map Animation Studio
  const src = path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs');
  fs.mkdirSync(path.dirname(vendor), { recursive: true });
  fs.copyFileSync(src, vendor);
  fs.copyFileSync(path.join(path.dirname(src), '..', '..', 'LICENSE'), path.join(here, 'vendor', 'MEDIABUNNY-LICENSE.txt'));
}
let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
const out = path.join(here, 'Paper Transition Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
