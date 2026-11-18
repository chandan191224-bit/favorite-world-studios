// Builds the single self-contained studio file (works offline, on PC and phone):
//   node build.mjs   ->   "Photo Parallax Studio Pro.html"  (+ presets.json for the CLI pipeline)
// Inlines src/**, the Mediabunny muxer, ONNX Runtime Web glue and the OFL fonts (Mukta,
// Tiro Devanagari Hindi) as base64, plus the demo photos. The two big packed asset files
// (models/depth-model.js, vendor/ort/ort-assets.js) stay next to the HTML and load as classic
// scripts so auto-depth also works from file://.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// vendor: mediabunny (MPL-2.0)
if (!fs.existsSync(path.join(here, 'vendor', 'mediabunny.min.js'))) {
  const src = path.join(here, '..', 'map-animation-studio', 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(here, 'vendor', 'mediabunny.min.js'));
  else console.warn('vendor/mediabunny.min.js missing — copy it from node_modules/mediabunny/dist/bundles/mediabunny.min.cjs');
}

let html = fs.readFileSync(path.join(here, 'src', 'index.html'), 'utf8');

// ---- fonts -> @font-face with base64 woff2 ----
const FONTS = [
  ['Mukta', 400, 'devanagari', 'U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A'],
  ['Mukta', 400, 'latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Mukta', 400, 'latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ['Mukta', 700, 'devanagari', 'U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A'],
  ['Mukta', 700, 'latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Mukta', 700, 'latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ['Mukta', 800, 'devanagari', 'U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A'],
  ['Mukta', 800, 'latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ['Mukta', 800, 'latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ['Tiro Devanagari Hindi', 400, 'devanagari', 'U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A'],
  ['Tiro Devanagari Hindi', 400, 'latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
];
let fontCss = '/* bundled OFL fonts (Mukta, Tiro Devanagari Hindi) */\n';
for (const [family, weight, subset, range] of FONTS) {
  const file = path.join(here, 'vendor', 'fonts', `${family.replace(/ /g, '')}-${weight}-${subset}.woff2`);
  if (!fs.existsSync(file)) { console.warn('missing font', file); continue; }
  const b64 = fs.readFileSync(file).toString('base64');
  fontCss += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}\n`;
}
html = html.replace('/* @fonts */', fontCss);

// ---- inline sources ----
html = html.replace(/\/\* @inline:([^ ]+) \*\//g, (_, rel) => {
  const file = path.join(here, rel);
  if (!fs.existsSync(file)) { console.warn('missing', rel); return `/* missing ${rel} */`; }
  return `/* ---- ${rel} ---- */\n` + fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
});

// ---- demo photos -> data URLs ----
const demos = {};
for (const f of fs.readdirSync(path.join(here, 'src', 'assets'))) {
  if (!/^demo-.*\.jpg$/.test(f)) continue;
  demos[f.replace(/^demo-/, '').replace(/\.jpg$/, '')] = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(here, 'src', 'assets', f)).toString('base64');
}
html = html.replace('/* @demophotos */', 'Object.assign(DEMO, ' + JSON.stringify(demos) + ');');

const out = path.join(here, 'Photo Parallax Studio Pro.html');
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);

// ---- presets.json (pure data for the Python pipeline helper) ----
const looksSrc = fs.readFileSync(path.join(here, 'src', 'fx', 'looks.js'), 'utf8');
const m = looksSrc.match(/\/\* PRESETS-START \*\/([\s\S]*?)\/\* PRESETS-END \*\//);
if (m) {
  const calls = m[1].trim();
  const items = [];
  const preset = (...a) => {
    const [id, name, family, note, move, dur, extra] = a;
    items.push({ id, name, family, note, move, dur, ...(extra || {}) });
    return null;
  };
  // split into top-level statements (preset(...) calls) and run each
  const stmts = [];
  let depth = 0, cur = '';
  for (const ch of calls) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ';' && depth === 0) { if (cur.trim()) stmts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) stmts.push(cur.trim());
  for (const st of stmts) new Function('preset', st)(preset);
  fs.writeFileSync(path.join(here, 'presets.json'), JSON.stringify(items, null, 1));
  console.log(`wrote presets.json (${items.length} presets)`);
} else {
  console.warn('PRESETS markers not found');
}
