// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Screen Mockup Studio Pro.html"
// Inlines src/**, the Mediabunny muxer and the OFL fonts (Inter, JetBrains Mono, Mukta,
// Noto Serif) as base64 @font-face rules, so Hindi (Devanagari) renders everywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// --- vendor: mediabunny (MPL-2.0). In the shipped zip it is already in vendor/;
//     on the user's PC fall back to the Map Animation Studio copy. ---
const mb = path.join(here, 'vendor', 'mediabunny.min.js');
if (!fs.existsSync(mb)) {
  for (const rel of ['../map-animation-studio/node_modules/mediabunny/dist/bundles/mediabunny.min.cjs', 'node_modules/mediabunny/dist/bundles/mediabunny.min.cjs']) {
    const src = path.resolve(here, rel);
    if (fs.existsSync(src)) { fs.copyFileSync(src, mb); break; }
  }
}
if (!fs.existsSync(mb)) { console.error('vendor/mediabunny.min.js is missing (npm package "mediabunny")'); process.exit(1); }

// --- fonts: <pkg>-<subset>-<weight>.woff2 -> @font-face with base64 data URLs ---
const RANGE = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  devanagari: 'U+0900-097F, U+1CD0-1CF6, U+1CF8-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+2B82-2B83, U+A823-A827, U+A880-A881, U+A8B4-A8C5, U+A8D0-A8D9, U+A900-A909, U+A9F0-A9F9, U+AA60-AA76, U+ABC0-ABE6, U+ABE8, U+ABED-ABEF, U+FB01-FB02',
};
// [css family, package, subset, weights]
const FAMILIES = [
  ['SMSans', 'inter', 'latin', [400, 600, 700, 800]],
  ['SMSans', 'mukta', 'devanagari', [400, 600, 700, 800]],
  ['SMSerif', 'noto-serif', 'latin', [400, 600, 700, 800]],
  ['SMSerif', 'mukta', 'devanagari', [400, 600, 700, 800]],
  ['SMMono', 'jetbrains-mono', 'latin', [400, 600, 700, 800]],
  ['SMMono', 'mukta', 'devanagari', [400, 600, 700, 800]],
];
let fontCss = '/* bundled OFL fonts, inlined by build.mjs */\n';
for (const [family, pkg, subset, weights] of FAMILIES) {
  for (const w of weights) {
    const file = path.join(here, 'vendor', 'fonts', `${pkg}-${subset}-${w}.woff2`);
    if (!fs.existsSync(file)) { console.error('missing font', file); process.exit(1); }
    const b64 = fs.readFileSync(file).toString('base64');
    fontCss += `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${w}; font-display: block; unicode-range: ${RANGE[subset]}; src: url(data:font/woff2;base64,${b64}) format('woff2'); }\n`;
  }
}

// --- inline the sources ---
let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');
html = html.replace(/\/\* @fonts \*\//, () => fontCss);
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});
const out = path.join(here, 'Screen Mockup Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
