// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Kinetic Title Studio Pro.html"
// Inlines src/** + the Mediabunny muxer + every bundled font (base64 woff2).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendor)) {
  // Mediabunny (MPL-2.0) muxer — copy from a local npm install if the vendor copy is missing:
  //   npm install mediabunny   →  node_modules/mediabunny/dist/bundles/mediabunny.min.cjs
  const tries = [
    path.join(here, 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs'),
    path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs'),
  ];
  const src = tries.find(fs.existsSync);
  if (!src) { console.error('vendor/mediabunny.min.js missing. Run: npm install mediabunny (once) or copy dist/bundles/mediabunny.min.cjs from the Map Animation Studio.'); process.exit(1); }
  fs.mkdirSync(path.dirname(vendor), { recursive: true });
  fs.copyFileSync(src, vendor);
  try { fs.copyFileSync(path.join(path.dirname(src), '..', '..', 'LICENSE'), path.join(here, 'vendor', 'MEDIABUNNY-LICENSE.txt')); } catch {}
}

let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
// fonts.css uses url(@font:Family-Weight-subset.woff2) — inline each font as a data URL
html = html.replace(/@font:([^)'"]+)/g, (_, file) => {
  const f = path.join(here, 'vendor', 'fonts', file);
  if (!fs.existsSync(f)) { console.warn('missing font', file); return 'data:font/woff2;base64,'; }
  return 'data:font/woff2;base64,' + fs.readFileSync(f).toString('base64');
});
const out = path.join(here, 'Kinetic Title Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
