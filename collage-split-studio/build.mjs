// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Collage & Split Studio Pro.html"
// Inlines src/**, the vendor libs and the bundled OFL fonts (woff2 -> base64 data URLs).
// No CDN, no network at runtime — the file opens by double-click, fully offline.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendor)) {
  // Mediabunny (MPL-2.0) muxer — normally copied from another studio's node_modules on the PC
  const src = path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs');
  fs.mkdirSync(path.dirname(vendor), { recursive: true });
  fs.copyFileSync(src, vendor);
}

// fonts: dedupe identical woff2 files (Google serves the same variable font per weight) and inline as base64
const fontB64 = new Map(); // file -> data URL
function fontUrl(dir, file) {
  const p = path.join(dir, file);
  const buf = fs.readFileSync(p);
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  if (!fontB64.has(hash)) fontB64.set(hash, `data:font/woff2;base64,${buf.toString('base64')}`);
  return fontB64.get(hash);
}

let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  let out = fs.readFileSync(file, 'utf8');
  if (rel.endsWith('fonts.css')) {
    // url(FONT:name.woff2) -> inlined base64 data URL (deduped by content)
    out = out.replace(/url\(FONT:([^)]+)\)/g, (_, f) => `url(${fontUrl(path.join(here, 'src', 'fonts'), f)})`);
  } else out = out.replace(/<\/script/gi, '<\\/script');
  return `/* ---- ${rel} ---- */\n` + out;
});
const out = path.join(here, 'Collage & Split Studio Pro.html');
fs.writeFileSync(out, html);
const uniqueFonts = new Set(fontB64.values());
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB; fonts: ${fontB64.size} files -> ${uniqueFonts.size} unique inlined)`);
