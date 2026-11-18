// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Data Chart Studio Pro.html"
// Fonts (SIL OFL, in vendor/fonts) and the Mediabunny muxer (MPL-2.0) are inlined, so nothing loads from the internet.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(vendor)) {
  const src = path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs');
  fs.mkdirSync(path.dirname(vendor), { recursive: true });
  fs.copyFileSync(src, vendor);
}
const DEVA = 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09';
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+00D7,U+20B9';
const FONTS = [
  ['DC Inter', 'Inter.woff2', '100 900', ''],
  ...[500, 700, 800].flatMap(w => [['DC Mukta', `fonts/mukta-devanagari-${w}-normal.woff2`, String(w), DEVA], ['DC Mukta', `fonts/mukta-latin-${w}-normal.woff2`, String(w), LATIN]]),
  ['DC Tiro', 'fonts/tiro-devanagari-hindi-devanagari-400-normal.woff2', '100 900', DEVA],
  ['DC Tiro', 'fonts/tiro-devanagari-hindi-latin-400-normal.woff2', '100 900', LATIN],
  ['DC Anton', 'fonts/anton-latin-400-normal.woff2', '100 900', LATIN],
];
const faces = FONTS.map(([fam, file, weight, range]) => {
  const b64 = fs.readFileSync(path.join(here, 'vendor', file)).toString('base64');
  return `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${weight};font-style:normal;font-display:block;${range ? `unicode-range:${range};` : ''}}`;
}).join('\n');

let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace('/* @fonts */', () => faces);
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
const out = path.join(here, 'Data Chart Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
