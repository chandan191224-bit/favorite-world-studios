// Generic studio check: opens the studio HTML at 3 sizes, finds the stage (biggest canvas) and the play button,
// checks the play button is clickable and not covered, no horizontal scroll, console errors, and that Play advances
// the time display. Usage: node studio-check.mjs <chrome.exe> <studio.html> <outdir> <tag>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [chrome, html, outDir, tag] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 300);
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stchk-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files', '--hide-scrollbars', '--no-sandbox', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200) || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200));
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.value;
const FIND = `(() => {
  const vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const stage = [...document.querySelectorAll('canvas')].filter(vis).sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return B.width * B.height - A.width * A.height; })[0];
  const play = [...document.querySelectorAll('button')].filter(vis).find(b => /play/i.test(b.id + ' ' + (b.title || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + b.className));
  const timeEl = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && /\\d:\\d\\d\\.\\d\\s*\\/\\s*\\d/.test(e.textContent) && vis(e));
  return { stage, play, timeEl };
})()`;
try {
  await send('Page.enable'); await send('Runtime.enable');
  for (const [w, h, mobile] of [[1920, 870, false], [1366, 680, false], [390, 844, true]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    await send('Page.navigate', { url: pathToFileURL(html).href });
    await new Promise(r => setTimeout(r, 5000));
    const info = await ev(`(async () => { const { stage, play, timeEl } = ${FIND};
      if (!stage || !play) return { missing: { stage: !!stage, play: !!play } };
      const s = stage.getBoundingClientRect(), b = play.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const t0 = timeEl ? timeEl.textContent.trim() : null;
      const lag = []; for (let i = 0; i < 5; i++) { const a = performance.now(); await new Promise(r => setTimeout(r, 0)); lag.push(Math.round(performance.now() - a)); }
      play.click(); await new Promise(r => setTimeout(r, 1500));
      const t1 = timeEl ? timeEl.textContent.trim() : null; play.click();
      return { stage: [Math.round(s.top), Math.round(s.bottom), Math.round(s.width)], playTop: Math.round(b.top), inView: b.bottom <= innerHeight && b.top >= 0,
        playClickable: hit === play || play.contains(hit), hscroll: document.documentElement.scrollWidth > innerWidth, lagMs: Math.max(...lag), t0, t1 }; })()`);
    console.log(`${tag} ${w}x${h}`, JSON.stringify(info));
    const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 65 });
    fs.writeFileSync(path.join(outDir, `${tag}-${w}x${h}.jpg`), Buffer.from(s.data, 'base64'));
  }
  console.log(`${tag} console errors:`, errors.length ? JSON.stringify([...new Set(errors)].slice(0, 6)) : 'none');
} finally { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {} }, 800); }
