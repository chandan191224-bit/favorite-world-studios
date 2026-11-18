// Downloads the bundled OFL fonts (woff2) from Google Fonts and writes vendor/fonts/fonts.css
// with url(@font:file.woff2) placeholders that build.mjs inlines as base64.
//   node fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'vendor', 'fonts');
fs.mkdirSync(outDir, { recursive: true });

// family -> css2 query. Kept small on purpose: this studio writes Hindi ink labels
// (Kalam), readable Devanagari (Mukta), an elegant Devanagari serif (Tiro) and a
// Latin hand for annotations (Caveat). All OFL.
const WANT = [
  'family=Mukta:wght@400;600',
  'family=Kalam:wght@400;700',
  'family=Tiro+Devanagari+Hindi:ital@0;1',
  'family=Caveat:wght@400;700',
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

let css = '/* Bundled OFL fonts (fetched from Google Fonts, subset woff2). Inlined by build.mjs. */\n';
let n = 0, bytes = 0;
for (const q of WANT) {
  const url = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error('failed', url, res.status); process.exit(1); }
  const text = await res.text();
  const fam = decodeURIComponent(q.split('family=')[1].split(':')[0]).replace(/ /g, '');
  // css2 emits "/* subset */\n@font-face {...}" pairs — track the comment that precedes each block
  const blocks = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g;
  let m;
  while ((m = re.exec(text))) blocks.push({ subset: m[1], block: m[2] });
  if (!blocks.length) { console.error('no @font-face blocks for', q); process.exit(1); }
  for (const { subset, b } of blocks.map(x => ({ subset: x.subset, b: x.block }))) {
    const weight = (b.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    const style = (b.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
    const src = (b.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!src) continue;
    const name = `${fam}-${weight}-${style}-${subset}.woff2`;
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    fs.writeFileSync(path.join(outDir, name), buf);
    bytes += buf.length; n++;
    css += b.replace(src, `url(@font:${name})`) + '\n';
  }
}
fs.writeFileSync(path.join(outDir, 'fonts.css'), css);
console.log(`fetched ${n} woff2 files (${(bytes / 1024).toFixed(0)} KB) -> vendor/fonts/`);
