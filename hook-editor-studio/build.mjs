// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Hook Editor Studio Pro.html"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// 1. Ensure vendor/mediabunny.min.js exists (copied from map-animation-studio)
const vendorMb = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendorMb)) {
  const src = [
    path.join(here, 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs'),
    path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs'),
  ].find(fs.existsSync);
  if (!src) {
    console.error('mediabunny.min.cjs not found in node_modules or ../map-animation-studio.');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(vendorMb), { recursive: true });
  fs.copyFileSync(src, vendorMb);
  try {
    fs.copyFileSync(path.join(path.dirname(src), '..', '..', 'LICENSE'), path.join(here, 'vendor', 'MEDIABUNNY-LICENSE.txt'));
  } catch {}
}

// 2. Ensure vendor/fonts/*.woff2 exist (copied from vfx-elements-studio)
const fontDir = path.join(here, 'vendor', 'fonts');
const srcFontDir = path.join(here, '..', 'vfx-elements-studio', 'vendor', 'fonts');
const neededFonts = [
  'BebasNeue-Regular-subset.woff2',
  'Khand-SemiBold-subset.woff2',
  'Mukta-Medium-subset.woff2',
  'Mukta-ExtraBold-subset.woff2',
  'Kalam-Regular-subset.woff2',
];
fs.mkdirSync(fontDir, { recursive: true });
for (const fn of neededFonts) {
  const dst = path.join(fontDir, fn);
  const src = path.join(srcFontDir, fn);
  if (!fs.existsSync(dst) && fs.existsSync(src)) fs.copyFileSync(src, dst);
}

// 3. Inline all CSS, fonts, vendor libs and src/** scripts into single HTML
let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing inline:', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
html = html.replace(/@font:([^)'"]+)/g, (_, file) => {
  const f = path.join(fontDir, file);
  if (!fs.existsSync(f)) { console.warn('missing font:', file); return 'data:font/woff2;base64,'; }
  return 'data:font/woff2;base64,' + fs.readFileSync(f).toString('base64');
});

const out = path.join(here, 'Hook Editor Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
