// Render a Paper Studio project JSON to MP4, frame-exact, with headless Chrome (CDP) + Remotion's ffmpeg.
// Usage: node render_paper.mjs <project.json> <out.mp4> [--fps 30] [--duration S] [--still S out.jpg]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [projPath, outPath] = args;
const fps = +opt('--fps', 30);
const chrome = path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const ffmpeg = path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));
// inline photos as data URLs (photo: path relative to the project file)
for (const p of project.pages) {
  if (p.photo) {
    const f = path.resolve(path.dirname(projPath), p.photo);
    const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
    p.photoDataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
  }
}
const port = 9300 + Math.floor(Math.random() * 500);
const userDir = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'paperchrome-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await new Promise(r => setTimeout(r, 250));
}
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const waiters = [];
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
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(path.join(here, 'paper-studio-headless.html')).href });
  await loaded;
  await new Promise(r => setTimeout(r, 1500)); // web fonts
  const info = await evaluate(`window.__paper.load(${JSON.stringify(project)})`);
  console.log('loaded', JSON.stringify(info));
  if (info.missing.length) console.warn('WARNING phrases not found on any page:', info.missing);
  const still = opt('--still');
  if (still) {
    const url = await evaluate(`window.__paper.frame(${+still})`);
    fs.writeFileSync(args[args.indexOf('--still') + 2], Buffer.from(url.split(',')[1], 'base64'));
    console.log('still written');
  } else {
    const dur = +opt('--duration', info.duration);
    const n = Math.round(dur * fps);
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', outPath], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const url = await evaluate(`window.__paper.frame(${(f / fps).toFixed(4)})`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (fps * 5) === 0) process.stdout.write(`frame ${f}/${n}\r`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`\nwrote ${outPath} (${dur.toFixed(2)} s, ${n} frames)`);
  }
} finally {
  ws.close(); proc.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
