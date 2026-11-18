// Throwaway QA helper: render full-res stills of presets at given times + font metrics.
//   node stills.mjs "id@t;id@t" outdir
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './tooling.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const specs = (process.argv[2] || '').split(';').filter(Boolean).map(s => { const [id, t] = s.split('@'); return { id, t: +t }; });
const outDir = process.argv[3] || path.join(here, 'test-output', 'stills');
const b = await launch();
try {
  await b.open(pathToFileURL(path.join(here, 'Data Chart Studio Pro.html')).href);
  fs.mkdirSync(outDir, { recursive: true });
  for (const { id, t } of specs) {
    const url = await b.evaluate(`(function(){DCS.build({preset:${JSON.stringify(id)}});return DCS.frame(${t}, 'composite')})()`);
    const file = path.join(outDir, `${id}_${String(t).replace('.', '_')}.jpg`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', file);
  }
  const metrics = await b.evaluate(`(function(){
    const c = document.createElement('canvas').getContext('2d');
    const out = {};
    for (const fam of ["'DC Inter'", "'DC Anton'", "'DC Mukta'"]) {
      c.font = '800 100px ' + fam;
      out[fam] = { zero: c.measureText('0').width, one: c.measureText('1').width, four: c.measureText('4').width, seven: c.measureText('7').width, comma: c.measureText(',').width, width_140: c.measureText('140').width };
    }
    return out; })()`);
  console.log('digit advances:', JSON.stringify(metrics, null, 1));
  const errs = b.errors();
  if (errs.length) console.log('console errors:\n' + errs.join('\n'));
} finally { b.close(); }
