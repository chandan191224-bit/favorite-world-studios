// QA: contact sheet of chart presets at several moments, rendered headless to a JPG.
//   node data-chart-studio/qa-sheet.mjs <out.jpg> [--chart race | --ids a,b,c] [--from 0 --count 12] [--fr 0.25,0.45,0.65,0.95]
//        [--size 480x270] [--mode composite|green|blue|alpha|matte]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './tooling.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
if (!out) { console.log('usage: node qa-sheet.mjs <out.jpg> [--chart id | --ids a,b] [--fr 0.25,0.45,0.65,0.95]'); process.exit(1); }
const b = await launch();
try {
  await b.open(pathToFileURL(path.join(here, 'Data Chart Studio Pro.html')).href);
  const fr = opt('--fr', '0.25,0.45,0.65,0.95').split(',').map(Number), [w, h] = opt('--size', '480x270').split('x').map(Number);
  const sel = opt('--ids') ? JSON.stringify(opt('--ids').split(',')) : `DCS.presets().filter(p => ${opt('--chart') ? `p.chart === ${JSON.stringify(opt('--chart'))}` : 'true'}).map(p => p.id).slice(${+opt('--from', 0)}, ${+opt('--from', 0) + +opt('--count', 12)})`;
  const url = await b.evaluate(`DCS.sheet(${sel}, ${JSON.stringify(fr)}, ${w}, ${h}, ${JSON.stringify(opt('--mode', 'composite'))})`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  const errs = b.errors();
  if (errs.length) console.log('console errors:\n' + errs.join('\n'));
  console.log('wrote', out);
} finally { b.close(); }
