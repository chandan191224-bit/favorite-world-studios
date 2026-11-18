// Shared headless-Chrome helper for render.mjs / qa-sheet.mjs (uses Remotion's chrome-headless-shell where installed).
// Override with DATACHART_CHROME=<path to chrome>. Resolution order:
//   DATACHART_CHROME -> repo node_modules/.remotion chrome-headless-shell (win64, then linux64) -> puppeteer cache -> PATH.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..', '..');

function firstExisting(paths) { for (const p of paths) { try { if (p && fs.existsSync(p)) return p; } catch {} } return null; }
function fromGlob(dir, suffix) {
  try {
    const base = fs.readdirSync(dir).map(v => path.join(dir, v, suffix)).sort().reverse();
    return firstExisting(base);
  } catch { return null; }
}
export const chromePath = process.env.DATACHART_CHROME || firstExisting([
  path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'),
  path.join(root, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'),
  process.env.HOME && path.join(process.env.HOME, '.cache/puppeteer/chrome-headless-shell'),
  os.homedir() !== process.env.HOME && path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell'),
].map(p => p && (p.endsWith('chrome-headless-shell') ? fromGlob(p, 'chrome-headless-shell-linux64/chrome-headless-shell') : p)).filter(Boolean).flat()) ||
  firstExisting(['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'].map(c => { try { return require.resolve && null; } catch { return null; } }) || []) ||
  'chromium';
export const ffmpegPath = process.env.DATACHART_FFMPEG || firstExisting([
  path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
  path.join(root, 'node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'),
]) || 'ffmpeg';

export async function launch({ width = 1920, height = 1080, ui = false } = {}) {
  if (!fs.existsSync(chromePath)) throw new Error('headless Chrome not found: ' + chromePath + ' (set DATACHART_CHROME)');
  const port = 9300 + Math.floor(Math.random() * 600);
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dcschrome-'));
  const proc = spawn(chromePath, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files', '--hide-scrollbars',
    '--mute-audio', `--window-size=${width},${height}`, '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 80 && !ws; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
    if (!ws) await new Promise(r => setTimeout(r, 250));
  }
  if (!ws) { proc.kill(); throw new Error('could not start headless Chrome'); }
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(), waiters = [], errors = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 400));
    if (m.method) waiters.filter(w => w.method === m.method).forEach(w => { w.res(m.params); waiters.splice(waiters.indexOf(w), 1); });
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = method => new Promise(res => waiters.push({ method, res }));
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 900));
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  // ui:true boots the real editor (skips window.__HEADLESS, which switches app.js off and keeps the pipeline API only)
  if (!ui) await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  return {
    send, evaluate, errors: () => errors.slice(),
    async open(url) { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; await evaluate('DCS.ready()'); },
    async shot(file) { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); const buf = Buffer.from(r.data, 'base64'); if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); } return buf; },
    close() { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {} }, 500); },
  };
}
