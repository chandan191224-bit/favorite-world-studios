// One-time font fetch: downloads the free OFL fonts this studio bundles (from the Fontsource CDN)
// into vendor/fonts/ and writes vendor/fonts/fonts.css with @font: placeholders that build.mjs inlines as base64.
// Re-run any time:  node fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'vendor', 'fonts');
fs.mkdirSync(dir, { recursive: true });

// family: [package, cssName, weights, subsets, italic]
const FONTS = [
  ['mukta', 'Mukta', [400, 500, 700, 800], ['devanagari', 'latin'], false],
  ['kalam', 'Kalam', [400, 700], ['devanagari', 'latin'], false],
  ['tiro-devanagari-hindi', 'Tiro Devanagari Hindi', [400], ['devanagari', 'latin'], true],
  ['khand', 'Khand', [500, 600, 700], ['devanagari', 'latin'], false],
  ['rozha-one', 'Rozha One', [400], ['devanagari', 'latin'], false],
  ['special-elite', 'Special Elite', [400], ['latin'], false],
  ['share-tech-mono', 'Share Tech Mono', [400], ['latin'], false],
  ['oswald', 'Oswald', [500, 600], ['latin'], false],
];
const RANGES = {
  devanagari: 'U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20B9, U+A8E0-A8FF',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD',
};

let css = '/* bundled free OFL fonts (Fontsource); build.mjs inlines each as a data URL */\n';
let ok = 0, fail = [];
for (const [pkg, name, weights, subsets, italics] of FONTS) {
  for (const w of weights) {
    for (const sub of subsets) {
      const styles = italics ? ['normal', 'italic'] : ['normal'];
      for (const st of styles) {
        const file = `${name.replace(/ /g, '')}-${w}-${sub}${st === 'italic' ? '-italic' : ''}.woff2`;
        const url = `https://cdn.jsdelivr.net/fontsource/fonts/${pkg}@latest/${sub}-${w}-${st}.woff2`;
        try {
          if (!fs.existsSync(path.join(dir, file)) || fs.statSync(path.join(dir, file)).size < 1000) {
            const r = await fetch(url);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const buf = Buffer.from(await r.arrayBuffer());
            if (buf.length < 1000) throw new Error('too small');
            fs.writeFileSync(path.join(dir, file), buf);
          }
          ok++;
          css += `@font-face { font-family: "${name}"; font-style: ${st}; font-weight: ${w}; font-display: swap; unicode-range: ${RANGES[sub]}; src: url(@font:${file}) format("woff2"); }\n`;
        } catch (e) { fail.push(`${file}: ${e.message}`); }
      }
    }
  }
}
fs.writeFileSync(path.join(dir, 'fonts.css'), css);
console.log(`fonts: ${ok} ok, ${fail.length} failed`);
if (fail.length) { fail.forEach(f => console.log(' -', f)); process.exitCode = 2; }
