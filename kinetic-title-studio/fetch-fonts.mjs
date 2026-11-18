// One-time: downloads the free (SIL Open Font License) fonts the studio bundles, so it works fully offline.
//   node fetch-fonts.mjs   ->   vendor/fonts/*.woff2 + vendor/fonts/fonts.css (unicode-range per subset)
// build.mjs inlines vendor/fonts/fonts.css (fonts as base64) into the single HTML file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'vendor', 'fonts');
fs.mkdirSync(dir, { recursive: true });
// family -> axis spec for the Google Fonts css2 API (all OFL)
const FAMILIES = [
  ['Noto Sans Devanagari', 'wght@500;800'],
  ['Noto Serif Devanagari', 'wght@600;800'],
  ['Hind', 'wght@500;700'],
  ['Mukta', 'wght@500;800'],
  ['Tiro Devanagari Hindi', 'ital@0;1'],
  ['Rozha One', null],
  ['Khand', 'wght@600'],
  ['Teko', 'wght@600'],
  ['Yatra One', null],
  ['Kalam', 'wght@400;700'],
  ['Bebas Neue', null],
  ['Cinzel', 'wght@600;800'],
  ['Anton', null],
  ['Playfair Display', 'ital,wght@0,700;1,700'],
  ['Montserrat', 'wght@600;800'],
  ['Inter', 'wght@500;700'],
  ['Oswald', 'wght@600'],
  ['Special Elite', null],
  ['Roboto Mono', 'wght@500'],
];
const KEEP = new Set(['latin', 'latin-ext', 'devanagari']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
let css = '/* Fonts: SIL Open Font License 1.1 (Google Fonts). Downloaded by fetch-fonts.mjs */\n';
for (const [fam, axes] of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}${axes ? ':' + axes : ''}&display=block`;
  const text = await (await fetch(url, { headers: { 'user-agent': UA } })).text();
  const blocks = [...text.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]+)\}/g)];
  if (!blocks.length) throw new Error('no fonts for ' + fam + '\n' + text.slice(0, 300));
  for (const [, subset, body] of blocks) {
    if (!KEEP.has(subset)) continue;
    const src = body.match(/url\((https:[^)]+)\)/)[1];
    const weight = body.match(/font-weight: (\d+)/)[1], style = body.match(/font-style: (\w+)/)[1];
    const range = body.match(/unicode-range: ([^;]+);/)[1];
    const file = `${fam.replace(/ /g, '')}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
    if (!fs.existsSync(path.join(dir, file))) fs.writeFileSync(path.join(dir, file), Buffer.from(await (await fetch(src)).arrayBuffer()));
    css += `@font-face{font-family:'${fam}';font-style:${style};font-weight:${weight};font-display:block;src:url(@font:${file}) format('woff2');unicode-range:${range};}\n`;
  }
  console.log('ok', fam);
}
fs.writeFileSync(path.join(dir, 'fonts.css'), css);
fs.writeFileSync(path.join(dir, 'OFL-NOTICE.txt'), 'All fonts in this folder are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org) and were downloaded from Google Fonts.\n' + FAMILIES.map(f => '- ' + f[0]).join('\n') + '\n');
const total = fs.readdirSync(dir).filter(f => f.endsWith('.woff2')).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
console.log(`fonts.css written, ${(total / 1024).toFixed(0)} KB of woff2`);
