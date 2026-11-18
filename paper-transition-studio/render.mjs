// Render a Paper Transition Studio project (.paper.json) to MP4 from the command line (for the video pipeline).
// Usage:
//   node paper-transition-studio/render.mjs <project.paper.json> <out.mp4> [--mode composite|green|blue|matte] [--fps 30]
//        [--from S] [--to S] [--first-shot N] [--still S out.jpg]
// Headless Chrome (Remotion's) + ffmpeg, frame-exact. Output is always SILENT: the user's rule (2026-10-29) is never to
// use this studio's sound effects in video editing.
// media.<id>.path (relative to the project file) works for photos (inlined) and video clips (H.264 MP4, e.g. Flow clips).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [projPath, outPath] = args;
if (!projPath || !outPath) { console.log('usage: node render.mjs <project.paper.json> <out.mp4> [--mode composite|green|blue|matte] [--fps 30]'); process.exit(1); }
const mode = opt('--mode', 'composite'), fps = +opt('--fps', 0) || null;
const chrome = path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const ffmpeg = path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const html = path.join(here, 'Paper Transition Studio Pro.html');
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
const port = 9800 + Math.floor(Math.random() * 400);
const userDir = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'ptschrome-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
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
try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await loaded;
  await evaluate('document.fonts.ready.then(() => true)');
  const info = await evaluate(`PTS.load(${JSON.stringify(project)})`);
  const F = fps || project.fps || 30;
  console.log('loaded', JSON.stringify(info));
  const firstShot = opt('--first-shot', 'null');
  const still = opt('--still');
  if (still) {
    const url = await evaluate(`PTS.frame(${+still}, ${JSON.stringify(mode)}, 0.95, ${firstShot})`);
    fs.writeFileSync(args[args.indexOf('--still') + 2], Buffer.from(url.split(',')[1], 'base64'));
    console.log('still written');
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), n = Math.max(1, Math.round((to - from) * F));
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'mjpeg', '-i', '-'];
    ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outPath);
    const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const url = await evaluate(`PTS.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.95, ${firstShot})`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, silent)`);
  }
} finally {
  ws.close(); proc.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
