// QA: contact sheet of look presets at several progress points, rendered headless to a JPG.
//   node film-look-studio/qa-sheet.mjs <out.jpg> [--fx grain | --ids a,b,c] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85]
//   [--family film]        (whole family, in chunks of --count)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
if (!out) { console.log('usage: node qa-sheet.mjs <out.jpg> [--fx grain | --ids a,b,c | --family film] [--from 0 --count 14] [--ps 0.25,0.45,0.65,0.85]'); process.exit(1); }
function firstExisting(list) { for (const p of list) { if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p; } return null; }
const chrome = firstExisting([
  process.env.FL_CHROME,
  path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'),
  ...(fs.existsSync(path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell'))
    ? fs.readdirSync(path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell')).flatMap(v => [
        path.join(os.homedir(), `.cache/puppeteer/chrome-headless-shell/${v}/chrome-headless-shell-linux64/chrome-headless-shell`),
        path.join(os.homedir(), `.cache/puppeteer/chrome-headless-shell/${v}/chrome-headless-shell-win64/chrome-headless-shell.exe`),
      ])
    : []),
  ...(fs.existsSync(path.join(os.homedir(), '.cache/puppeteer/chrome'))
    ? fs.readdirSync(path.join(os.homedir(), '.cache/puppeteer/chrome')).flatMap(v => [path.join(os.homedir(), `.cache/puppeteer/chrome/${v}/chrome-linux64/chrome`)])
    : []),
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
]);
if (!chrome) { console.error('qa-sheet.mjs: no headless Chrome found (set FL_CHROME)'); process.exit(1); }
const port = 9400 + Math.floor(Math.random() * 300), ud = fs.mkdtempSync(path.join(os.tmpdir(), 'flsqa-'));
const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files', 'about:blank',
  ...(process.platform === 'win32' ? [] : ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']),
], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
if (!ws) { proc.kill(); console.error('qa-sheet.mjs: could not attach to headless Chrome'); process.exit(1); }
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };
try {
  await send('Page.enable', {});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'Film Look Studio Pro.html')).href });
  await new Promise(r => setTimeout(r, 1200));
  await ev('document.fonts.ready.then(() => 1)');
  const ps = (opt('--ps', '0.25,0.45,0.65,0.85')).split(',').map(Number);
  const from = +opt('--from', 0), count = +opt('--count', 14);
  let sel;
  if (opt('--ids')) sel = JSON.stringify(opt('--ids').split(','));
  else if (opt('--fx')) sel = `FL.fx.presets.filter(p => p.fx === ${JSON.stringify(opt('--fx'))}).map(p => p.id).slice(${from}, ${from + count})`;
  else if (opt('--family')) sel = `FL.fx.presets.filter(p => FL.fx.byId[p.fx].family === ${JSON.stringify(opt('--family'))}).map(p => p.id).slice(${from}, ${from + count})`;
  else sel = `FL.fx.presets.map(p => p.id).slice(${from}, ${from + count})`;
  const r = await ev(`(() => { const res = FLS.sheet(${sel}, ${JSON.stringify(ps)}, 640, 360, false); return JSON.stringify(res); })()`);
  const url = await ev(`document.getElementById('flsSheet').toDataURL('image/jpeg', 0.85)`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out, r);
} finally { try { ws.close(); } catch {} try { proc.kill(); } catch {} try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} }
