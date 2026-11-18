// QA: renders contact sheet of all 12 motion presets & checks headless boot.
//   node hook-editor-studio/qa-sheet.mjs [out.jpg]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const out = process.argv[2] || path.join(here, 'qa-sheet.jpg');
const chrome = path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const port = 9450 + Math.floor(Math.random() * 250);
const ud = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'hesqa-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = l.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };

try {
  await send('Page.enable', {});
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'Hook Editor Studio Pro.html')).href });
  await new Promise(r => setTimeout(r, 2200));
  await ev('document.fonts.ready.then(() => 1)');
  const url = await ev('HOOKSTUDIO.sheet()');
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', out);
} finally {
  ws.close(); proc.kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch {}
}
