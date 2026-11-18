// QA: contact sheet of presets at several progress points, rendered headless to a JPG.
//   node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 40] [--ps 0.25,0.45,0.65,0.85] [--w 400] [--h 225]
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0];
if (!out) { console.log('usage: node qa-sheet.mjs <out.jpg> [--ids a,b,c] [--from 0 --count 40] [--ps 0.25,0.45,0.65,0.85]'); process.exit(1); }

function findChrome() {
  const cands = [];
  const push = p => { if (p && fs.existsSync(p)) cands.push(p); };
  if (process.env.SMS_CHROME) push(process.env.SMS_CHROME);
  const rem = p => path.join(root, 'node_modules', '.remotion', p);
  push(rem('chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'));
  push(rem('chrome-headless-shell/linux-x64/chrome-headless-shell-linux64/chrome-headless-shell'));
  for (const base of [path.join(os.homedir(), '.cache')]) {
    try {
      for (const d of fs.readdirSync(base)) {
        if (/^(ms-playwright|puppeteer|chrome|chromium)/i.test(d)) {
          const dir = path.join(base, d);
          const walk = dir2 => { try { for (const v of fs.readdirSync(dir2)) { push(path.join(dir2, v, 'chrome-linux64', 'chrome')); push(path.join(dir2, v, 'chrome-headless-shell-linux64', 'chrome-headless-shell')); push(path.join(dir2, v, 'chrome-win64', 'chrome.exe')); } } catch (e) {} };
          if (d === 'ms-playwright') { walk(path.join(dir, 'chromium-1200')); cands.push(path.join(dir, 'chromium-1200', 'chrome-linux64', 'chrome')); cands.push(path.join(dir, 'chromium_headless_shell-1200', 'chrome-headless-shell-linux64', 'chrome-headless-shell')); }
          else if (d === 'puppeteer') walk(path.join(dir, 'chrome'));
          else walk(dir);
        }
      }
    } catch (e) {}
  }
  try { for (const b of ['chrome', 'chromium', 'chromium-browser', 'google-chrome']) { try { const w = execSync(`which ${b} 2>/dev/null`).toString().trim(); if (w) push(w); } catch (e) {} } } catch (e) {}
  return cands.find(fs.existsSync);
}
const chrome = findChrome();
if (!chrome) { console.error('No Chrome/Chromium found. Set SMS_CHROME=<path>.'); process.exit(1); }
const html = path.join(here, 'Screen Mockup Studio Pro.html');
const port = 9400 + Math.floor(Math.random() * 300), ud = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir() || '.', 'smsqa-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--headless=new', ...(process.platform === 'win32' ? [] : ['--no-sandbox', '--disable-dev-shm-usage']), 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {} if (!ws) await new Promise(r => setTimeout(r, 250)); }
if (!ws) { proc.kill(); console.error('chrome did not start'); process.exit(1); }
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };
try {
  await send('Page.enable', {});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await new Promise(r => setTimeout(r, 1200));
  await ev('document.fonts.ready.then(() => 1)');
  const ps = (opt('--ps', '0.25,0.45,0.65,0.85')).split(',').map(Number);
  const W = +(opt('--w', 400)), H = +(opt('--h', 225));
  const sel = opt('--ids')
    ? JSON.stringify(opt('--ids').split(','))
    : `SM.presets.list.map(p => p.id).slice(${+opt('--from', 0)}, ${+opt('--from', 0) + +opt('--count', 40)})`;
  const ids = await ev(`(() => { const all = ${sel}; return JSON.stringify(all); })()`);
  const stats = await ev(`(() => { const r = SMS.sheet(${ids}, ${JSON.stringify(ps)}, ${W}, ${H}, false); return JSON.stringify(r); })()`);
  const url = await ev(`document.getElementById('smsSheet').toDataURL('image/jpeg', 0.85)`);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out, stats);
} finally { try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {} try { fs.rmSync(ud, { recursive: true, force: true }); } catch {} }
