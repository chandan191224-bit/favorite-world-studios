// Render a Film Look Studio project (.look.json) to a video from the command line (for the video pipeline).
// Usage:
//   node film-look-studio/render.mjs <project.look.json> <out.mp4|out.webm|out.png|out.jpg>
//        [--mode composite|screen|alpha|green|blue|matte|source] [--fps 30] [--from S] [--to S]
//        [--still S out.png]
// Headless Chrome + ffmpeg, frame-exact. Output is always SILENT (user rule: no sound effects, ever).
// media.<id>.path (relative to the project file) works for photos (inlined) and video clips (passed as file URLs).
//
// Binaries are resolved in this order (works on the author's Windows PC and in headless CI):
//   Chrome:  $FL_CHROME → Remotion's chrome-headless-shell (../node_modules/.remotion/…, relative to
//            the studio folder's parent) → Remotion's chrome → puppeteer's cache → system Chrome/Chromium.
//   ffmpeg:  $FL_FFMPEG → Remotion's ffmpeg (../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe)
//            → system ffmpeg on PATH.
// Pipes PNG frames (-f image2pipe -c:v png -i -) → libx264 yuv420p for MP4,
// → libvpx-vp9 yuva420p -auto-alt-ref 0 for transparent WebM. ffmpeg failures are loud, never silent.
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
  console.log('usage: node render.mjs <project.look.json> <out.mp4|out.webm|out.png|out.jpg> [--mode composite|screen|alpha|green|blue|matte|source] [--fps 30] [--from S --to S] [--still S out.png]');
  process.exit(1);
}
const mode = opt('--mode', 'composite');

// ---------- binary resolution ----------
function firstExisting(list) { for (const p of list) { if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p; } return null; }
const chromeCandidates = [
  process.env.FL_CHROME,
  path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'),
  path.join(root, 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'),
  ...fs.existsSync(path.join(root, 'node_modules/.remotion'))
    ? (fs.readdirSync(path.join(root, 'node_modules/.remotion')).flatMap(v => [
        path.join(root, `node_modules/.remotion/${v}/win64/chrome-headless-shell-win64/chrome-headless-shell.exe`),
        path.join(root, `node_modules/.remotion/${v}/linux64/chrome-headless-shell-linux64/chrome-headless-shell`),
      ]))
    : [],
  ...(fs.existsSync(path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell'))
    ? fs.readdirSync(path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell')).flatMap(v => [
        path.join(os.homedir(), `.cache/puppeteer/chrome-headless-shell/${v}/chrome-headless-shell-linux64/chrome-headless-shell`),
        path.join(os.homedir(), `.cache/puppeteer/chrome-headless-shell/${v}/chrome-headless-shell-win64/chrome-headless-shell.exe`),
      ])
    : []),
  ...(fs.existsSync(path.join(os.homedir(), '.cache/puppeteer/chrome'))
    ? fs.readdirSync(path.join(os.homedir(), '.cache/puppeteer/chrome')).flatMap(v => [
        path.join(os.homedir(), `.cache/puppeteer/chrome/${v}/chrome-linux64/chrome`),
        path.join(os.homedir(), `.cache/puppeteer/chrome/${v}/chrome-win64/chrome.exe`),
      ])
    : []),
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const chrome = firstExisting(chromeCandidates);
const ffmpegCandidates = [
  process.env.FL_FFMPEG,
  path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
  'ffmpeg',
];
let ffmpeg = firstExisting(ffmpegCandidates.filter(p => p !== 'ffmpeg'));
if (!ffmpeg) { try { ffmpeg = 'ffmpeg'; } catch {} }
if (!chrome) { console.error('render.mjs: no headless Chrome found (set FL_CHROME). Tried:\n' + chromeCandidates.filter(Boolean).map(p => '  ' + p).join('\n')); process.exit(1); }
if (!fs.existsSync(projPath)) { console.error('render.mjs: project not found: ' + projPath); process.exit(1); }

const html = path.join(here, 'Film Look Studio Pro.html');
const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));
// media referenced by path (relative to the project file): photos are inlined, videos are passed as file URLs
for (const m of Object.values(project.media || {})) {
  if (!m.path || m.dataUrl) continue;
  const f = path.resolve(path.dirname(projPath), m.path);
  if (!fs.existsSync(f)) throw new Error('media not found: ' + f);
  if (m.kind === 'video') { m.url = pathToFileURL(f).href; continue; }
  const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
  m.dataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
}
if (project.source && project.source.media && project.media) {
  const sm = project.media[project.source.media];
  if (sm && sm.path && !sm.dataUrl) {
    const f = path.resolve(path.dirname(projPath), sm.path);
    if (fs.existsSync(f)) {
      if (sm.kind === 'video') sm.url = pathToFileURL(f).href;
      else sm.dataUrl = `data:image/${path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg')};base64,` + fs.readFileSync(f).toString('base64');
    }
  }
}

const isWin = process.platform === 'win32';
const port = 9800 + Math.floor(Math.random() * 400);
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flschrome-'));
const chromeArgs = [
  `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank',
];
if (!isWin) chromeArgs.push('--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage');
const proc = spawn(chrome, chromeArgs, { stdio: 'ignore' });
let ws;
for (let i = 0; i < 80 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const pg = list.find(t => t.type === 'page');
    if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
if (!ws) { proc.kill(); console.error('render.mjs: could not attach to headless Chrome'); process.exit(1); }
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(), waiters = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else if (m.method) waiters.filter(w => w.method === m.method).forEach(w => { w.res(m.params); waiters.splice(waiters.indexOf(w), 1); });
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const once = method => new Promise(res => waiters.push({ method, res }));
const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
};
function dataUrlFile(url, file) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
}
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await loaded;
  await evaluate('document.fonts.ready.then(() => true)');
  const info = await evaluate(`FLS.load(${JSON.stringify(project)})`);
  const F = +opt('--fps', 0) || project.fps || 30;
  console.log('loaded', JSON.stringify(info));
  const still = opt('--still');
  if (still) {
    // --still S [out.png] — falls back to the main positional output path
    const out = args[args.indexOf('--still') + 2] || outPath;
    const ext = path.extname(out).toLowerCase();
    const fmt = ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'png';
    const url = await evaluate(`FLS.frame(${+still}, ${JSON.stringify(mode)}, 0.95, ${JSON.stringify(fmt)})`);
    dataUrlFile(url, out);
    console.log('still written:', out);
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), n = Math.max(1, Math.round((to - from) * F));
    const ext = path.extname(outPath).toLowerCase();
    const transparent = ext === '.webm';
    if (mode === 'alpha' && !transparent) console.warn('warning: --mode alpha usually goes with a .webm output (transparent WebM)');
    const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-'];
    if (transparent) {
      // format=yuva420p keeps the alpha planes; some builds ignore -pix_fmt alone
      ffArgs.push('-an', '-vf', 'format=yuva420p', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '28', '-b:v', '0', outPath);
    } else {
      ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outPath);
    }
    const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
    let ffError = null;
    ff.on('error', e => { ffError = e; });
    for (let f = 0; f < n; f++) {
      const url = await evaluate(`FLS.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.95, 'png')`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
    }
    ff.stdin.end();
    const code = await new Promise(r => ff.on('close', r));
    if (ffError) throw new Error('ffmpeg failed to start: ' + ffError.message);
    if (code !== 0) throw new Error(`ffmpeg exited with code ${code} — rendering FAILED`);
    console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, silent)`);
  }
} finally {
  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
