// QA: contact sheet of effect presets at several progress points, rendered headless to a JPG.
//   node paper-transition-studio/qa-sheet.mjs <out.jpg> [--fx inkfx | --ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
const chrome = path.join(here, '..', 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const port = 9400 + Math.floor(Math.random() * 300), ud = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'ptsqa-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {} if (!ws) await new Promise(r => setTimeout(r, 250)); }
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };
try {
  await send('Page.enable', {});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'Paper Transition Studio Pro.html')).href });
  await new Promise(r => setTimeout(r, 2500));
  await ev('document.fonts.ready.then(() => 1)');
  const ps = (opt('--ps', '0.25,0.45,0.65,0.85')).split(',').map(Number);
  const sel = opt('--ids') ? JSON.stringify(opt('--ids').split(',')) : `PT.fx.presets.filter(p => ${opt('--fx') ? `p.fx === ${JSON.stringify(opt('--fx'))}` : 'true'}).map(p => p.id).slice(${+opt('--from', 0)}, ${+opt('--from', 0) + +opt('--count', 14)})`;
  const url = await ev(`(() => { const ids = ${sel}; PTS.sheet(ids, ${JSON.stringify(ps)}, 400, 225, false); return document.getElementById('ptsSheet').toDataURL('image/jpeg', 0.85); })()`);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out);
} finally { ws.close(); proc.kill(); try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} }
