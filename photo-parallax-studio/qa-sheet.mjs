// QA: contact sheet of presets at several progress points, rendered headless to a JPG.
//   node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
if (!out) { console.log('usage: node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85]'); process.exit(1); }

function findChrome() {
  const cands = [];
  const rim = path.join(root, 'node_modules', '.remotion');
  try { for (const plat of fs.readdirSync(rim)) { const p = path.join(rim, plat, 'chrome-headless-shell-win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'); if (fs.existsSync(p)) cands.push(p); } } catch {}
  const home = os.homedir();
  try {
    for (const dir of [path.join(home, '.cache', 'puppeteer', 'chrome-headless-shell'), path.join(home, '.cache', 'puppeteer', 'chrome')]) {
      for (const v of fs.readdirSync(dir)) {
        for (const bin of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
          const p = path.join(dir, v, bin); if (fs.existsSync(p)) cands.push(p);
        }
      }
    }
  } catch {}
  if (process.platform === 'win32') {
    for (const p of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']) if (fs.existsSync(p)) cands.push(p);
  } else {
    for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (fs.existsSync(p)) cands.push(p);
  }
  return cands[0] || null;
}
const chrome = findChrome();
if (!chrome) { console.error('No Chrome/Edge found.'); process.exit(1); }

const port = 9400 + Math.floor(Math.random() * 300), ud = fs.mkdtempSync(path.join(os.tmpdir(), 'ppsqa-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files', '--no-sandbox', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
if (!ws) { console.error('chrome did not start'); proc.kill(); process.exit(1); }
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 700)); return m.result.result.value; };
try {
  await send('Page.enable', {});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'Photo Parallax Studio Pro.html')).href });
  await new Promise(r => setTimeout(r, 2500));
  await ev('document.fonts.ready.then(() => 1)');
  const ps = (opt('--ps', '0.25,0.45,0.65,0.85')).split(',').map(Number);
  const sel = opt('--ids') ? JSON.stringify(opt('--ids').split(',')) : `PPS.presets().map(p => p.id).slice(${+opt('--from', 0)}, ${+opt('--from', 0) + +opt('--count', 12)})`;
  const ids = await ev(`(function(){ return ${sel}; })()`);
  const url = await ev(`PPS.sheet(${JSON.stringify(ids)}, ${JSON.stringify(ps)}, 400, 225, false); document.getElementById('ppsSheet').toDataURL('image/jpeg', 0.85)`);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out, `(${ids.length} presets x ${ps.length} points)`);
} finally { ws.close(); proc.kill(); try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} }
