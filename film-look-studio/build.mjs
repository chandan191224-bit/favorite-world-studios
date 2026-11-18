// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Film Look Studio Pro.html"
// Inlines src/**, the Mediabunny muxer and the bundled OFL fonts (base64 woff2),
// so the HTML opens by double-click with no server and no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendor)) {
  // Mediabunny (MPL-2.0) muxer. On the author's PC it comes from the shared npm install.
  for (const rel of ['../map-animation-studio/node_modules/mediabunny/dist/bundles/mediabunny.min.cjs', '../node_modules/mediabunny/dist/bundles/mediabunny.min.cjs']) {
    const src = path.join(here, rel);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(vendor), { recursive: true });
      fs.copyFileSync(src, vendor);
      const lic = path.join(path.dirname(src), '..', '..', 'LICENSE');
      if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(here, 'vendor', 'MEDIABUNNY-LICENSE.txt'));
      break;
    }
  }
}
// fonts.css -> @font-face rules with the woff2 files embedded as base64 data URLs
function inlineFonts(css) {
  return css.replace(/url\(fonts\/([^)]+\.woff2)\)/g, (_, file) => {
    const p = path.join(here, 'fonts', file);
    if (!fs.existsSync(p)) { console.warn('missing font', file); return 'url(fonts/' + file + ')'; }
    return 'url(data:font/woff2;base64,' + fs.readFileSync(p).toString('base64') + ')';
  });
}
let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  if (rel === 'fonts/fonts.css') return inlineFonts(fs.readFileSync(file, 'utf8')).replace(/<\/script/gi, '<\\/script');
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
const out = path.join(here, 'Film Look Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
