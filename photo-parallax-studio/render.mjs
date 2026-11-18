// Render a Photo Parallax Studio project (.parallax.json) to video from the command line
// (for the video pipeline). Frame-exact, headless Chrome (CDP, no npm deps) + ffmpeg, ALWAYS SILENT.
// Usage:
//   node render.mjs <project.parallax.json> <out.mp4> [--mode composite|green|blue|alpha|matte] [--fps 30]
//        [--from S] [--to S] [--still S out.jpg]
// media.<id>.path (relative to the project file) works for photos (inlined as data URLs).
// Mode alpha writes a VP9 WebM with real transparency; everything else H.264 MP4.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [projPath, outPath] = args;
if (!projPath || !outPath) {
  console.log('usage: node render.mjs <project.parallax.json> <out.mp4> [--mode composite|green|blue|alpha|matte] [--fps 30] [--from S --to S] [--still S out.jpg]');
  process.exit(1);
}
const mode = opt('--mode', 'composite'), fpsArg = +opt('--fps', 0) || null;

// ---- find a chrome ----
function findChrome() {
  const cands = [];
  const rim = path.join(root, 'node_modules', '.remotion');
  const remotionShell = path.join(rim, 'chrome-headless-shell', 'win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
  if (fs.existsSync(remotionShell)) cands.push(remotionShell);
  try {
    for (const plat of fs.readdirSync(rim)) {
      const p = path.join(rim, plat, 'chrome-headless-shell-win64', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
      if (fs.existsSync(p)) cands.push(p);
    }
  } catch {}
  const home = os.homedir();
  try {
    for (const dir of [path.join(home, '.cache', 'puppeteer', 'chrome-headless-shell'), path.join(home, '.cache', 'puppeteer', 'chrome')]) {
      for (const v of fs.readdirSync(dir)) {
        for (const bin of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
          const p = path.join(dir, v, bin);
          if (fs.existsSync(p)) cands.push(p);
        }
      }
    }
  } catch {}
  if (process.platform === 'win32') {
    for (const p of [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]) if (fs.existsSync(p)) cands.push(p);
  } else {
    for (const p of ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']) if (fs.existsSync(p)) cands.push(p);
  }
  return cands[0] || null;
}
function findFfmpeg() {
  const cands = [];
  try {
    // Remotion's ffmpeg: node_modules/@remotion/compositor-<platform>/ffmpeg(.exe)
    const scope = path.join(root, 'node_modules', '@remotion');
    for (const plat of fs.readdirSync(scope)) {
      if (!plat.startsWith('compositor-')) continue;
      for (const bin of ['ffmpeg.exe', 'ffmpeg']) {
        const p = path.join(scope, plat, bin);
        if (fs.existsSync(p)) cands.push(p);
      }
    }
  } catch {}
  for (const p of ['ffmpeg', 'ffmpeg.exe', path.join(here, 'ffmpeg.exe')]) cands.push(p);
  return cands[0];
}
const chrome = findChrome(), ffmpeg = findFfmpeg();
if (!chrome) { console.error('No Chrome/Edge found (looked in node_modules/.remotion, ~/.cache/puppeteer and the usual install paths).'); process.exit(1); }
if (!ffmpeg) { console.error('No ffmpeg found (looked in node_modules/@remotion/compositor-* and PATH).'); process.exit(1); }

// ---- project + media by path ----
const html = path.join(here, 'Photo Parallax Studio Pro.html');
const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));
for (const m of Object.values(project.media || {})) {
  if (!m.path || m.dataUrl) continue;
  const f = path.resolve(path.dirname(projPath), m.path);
  if (!fs.existsSync(f)) throw new Error('media not found: ' + f);
  const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
  m.dataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
}

const port = 9800 + Math.floor(Math.random() * 400);
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppschrome-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1', '--no-sandbox', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const pg = list.find(t => t.type === 'page');
    if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
if (!ws) { console.error('chrome did not start'); proc.kill(); process.exit(1); }
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 900));
  return r.result.value;
};
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  const loaded = new Promise(res => { ws.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Page.loadEventFired') res(); } catch {} }); });
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await Promise.race([loaded, new Promise(r => setTimeout(r, 15000))]);
  await evaluate('document.fonts.ready.then(() => true)');
  const info = await evaluate(`PPS.load(${JSON.stringify(project)})`);
  const F = fpsArg || project.fps || 30;
  console.log('loaded', JSON.stringify(info));
  const still = opt('--still');
  if (still) {
    const url = await evaluate(`PPS.frame(${+still}, ${JSON.stringify(mode)}, 0.95)`);
    fs.writeFileSync(args[args.indexOf('--still') + 2], Buffer.from(url.split(',')[1], 'base64'));
    console.log('still written');
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), n = Math.max(1, Math.round((to - from) * F));
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const alpha = mode === 'alpha';
    const ffArgs = alpha
      ? ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '18', '-b:v', '0', outPath]
      : ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'mjpeg', '-i', '-', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outPath];
    const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const url = await evaluate(`PPS.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.92)`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, ${alpha ? 'VP9 alpha WebM' : 'H.264 MP4'}, silent)`);
  }
} finally {
  try { ws.close(); } catch {}
  proc.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
