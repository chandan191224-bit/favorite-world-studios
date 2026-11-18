// QA: contact sheet of presets at several progress points, rendered headless to a JPG.
//   node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85] [--w 480]
// Uses the same browser discovery as render.mjs (Remotion's shell on the PC, Playwright's here).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
if (!out) { console.log('usage: node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85] [--w 480]'); process.exit(1); }

function findChrome() {
  const cands = [];
  if (process.env.CS_CHROME) cands.push(process.env.CS_CHROME);
  cands.push(path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'));
  const pwDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pwDir)) for (const d of fs.readdirSync(pwDir)) {
    if (!d.startsWith('chromium')) continue;
    cands.push(path.join(pwDir, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    cands.push(path.join(pwDir, d, 'chrome-linux', 'headless_shell'));
    cands.push(path.join(pwDir, d, 'chrome-linux', 'chrome'));
  }
  if (process.platform === 'win32') for (const p of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']) cands.push(p);
  else for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) cands.push(p);
  for (const c of cands) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  return null;
}
const chromePath = findChrome();
if (!chromePath) { console.error('ERROR: no headless browser found'); process.exit(1); }

const port = 9400 + Math.floor(Math.random() * 300), ud = fs.mkdtempSync(path.join(os.tmpdir() || '.', 'csqa-'));
const flags = [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files'];
if (process.platform !== 'win32') flags.push('--no-sandbox');
const proc = spawn(chromePath, [...flags, 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
console.error('browser:', chromePath, 'connected:', !!ws);
if (!ws) { console.error('ERROR: could not connect to the headless browser'); proc.kill(); process.exit(1); }
await new Promise(r => (ws.onopen = r));

let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };
try {
  await send('Page.enable', {});

  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'Collage & Split Studio Pro.html')).href });
  await new Promise(r => setTimeout(r, 2500));
  await ev('document.fonts.ready.then(() => 1)');

  const ps = (opt('--ps', '0.25,0.45,0.65,0.85')).split(',').map(Number);
  const W = +opt('--w', 480), H = Math.round(W * 9 / 16);
  const sel = opt('--ids')
    ? JSON.stringify(opt('--ids').split(','))
    : `CS.fx.presets.map(p => p.id).slice(${+opt('--from', 0)}, ${+opt('--from', 0) + +opt('--count', 14)})`;
  const url = await ev(`(() => { const ids = ${sel}; const r = CSAPI.sheet(ids, ${JSON.stringify(ps)}, ${W}, ${H}, false); return document.getElementById('csSheet').toDataURL('image/jpeg', 0.85); })()`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out);
} finally { try { ws.close(); } catch {} try { proc.kill(); } catch {} try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} }
