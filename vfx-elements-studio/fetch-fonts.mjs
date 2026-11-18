// Downloads the bundled OFL fonts (from Google Fonts' GitHub) and subsets them to
// woff2 (Latin + Devanagari + punctuation) so the single-file build stays small.
//   node fetch-fonts.mjs         ->  vendor/fonts/*.woff2 + vendor/fonts/fonts.css
// Fonts: Mukta (500/800, Devanagari+Latin), Kalam (400 handwriting), Khand (600 condensed), Bebas Neue (400).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'vendor', 'fonts');
const src = path.join(dir, 'src');
fs.mkdirSync(src, { recursive: true });

// [family name for CSS, file name in repo, weights to keep, has Devanagari]
const FONTS = [
  ['Mukta', 'mukta', ['Medium', 'ExtraBold'], true],
  ['Kalam', 'kalam', ['Regular'], true],
  ['Khand', 'khand', ['SemiBold'], true],
  ['Bebas Neue', 'bebasneue', ['Regular'], false],
];

const UNI = 'U+0020-007E,U+00A0-00FF,U+2000-206F,U+20B9,U+2212,U+0900-097F,U+A8E0-A8FF';

const css = ['/* Bundled fonts (OFL). Inlined as base64 by build.mjs. */'];
for (const [fam, repo, weights, deva] of FONTS) {
  for (const w of weights) {
    const name = `${fam.replace(/ /g, '')}-${w}`;
    const ttf = path.join(src, `${name}.ttf`);
    if (!fs.existsSync(ttf)) {
      const url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${repo}/${fam.replace(/ /g, '')}-${w}.ttf`;
      console.log('downloading', url);
      const r = spawnSync('curl', ['-sL', '--fail', '-o', ttf, url]);
      if (r.status !== 0 || !fs.existsSync(ttf) || fs.statSync(ttf).size < 10000) {
        console.error('could not download', url); process.exit(1);
      }
    }
    const out = path.join(dir, `${name}-subset.woff2`);
    // keep shaping (GSUB/GPOS) so Devanagari conjuncts/matras render correctly from canvas
    const r = spawnSync('python3', ['-m', 'fontTools.subset', ttf,
      `--unicodes=${UNI}`, '--layout-features=*', '--glyph-names', '--no-hinting',
      '--flavor=woff2', `--output-file=${out}`], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('subset failed for', name); process.exit(1); }
    const weight = /ExtraBold/.test(w) ? 800 : /SemiBold/.test(w) ? 600 : /Medium/.test(w) ? 500 : 400;
    const fname = deva ? `"${fam}"` : `"${fam}"`; // canvas needs the exact family name
    css.push(`@font-face{font-family:${fname};font-weight:${weight};font-style:normal;font-display:block;src:url(@font:${name}-subset.woff2) format("woff2")}`);
    console.log(`${name}-subset.woff2  ${(fs.statSync(out).size / 1024).toFixed(1)} KB  (weight ${weight})`);
  }
}
fs.writeFileSync(path.join(dir, 'fonts.css'), css.join('\n') + '\n');
console.log('wrote', path.join(dir, 'fonts.css'));
