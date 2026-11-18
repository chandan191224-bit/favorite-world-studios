// Render a Hook Editor Studio Pro project (.hook.json) to MP4 / WebM / JPG from CLI.
// Usage:
//   node hook-editor-studio/render.mjs <project.hook.json> <out.mp4> [--mode composite|alpha|green|blue|matte]
//        [--fps 30] [--from S] [--to S] [--still S out.jpg] [--silent] [--autoedit hybrid|nitish|dhruv|deshbhakt]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const hasFlag = k => args.includes(k);
const [projPath, outPath] = args;
if (!projPath || (!outPath && !opt('--still'))) {
  console.log('usage: node render.mjs <project.hook.json> <out.mp4> [--mode composite|alpha|green|blue|matte] [--fps 30] [--silent] [--still S]');
  process.exit(1);
}

const mode = opt('--mode', 'composite');
const fpsArg = +opt('--fps', 0) || null;
const silent = hasFlag('--silent') || mode !== 'composite';
const autoStyle = opt('--autoedit', '');
const chrome = process.env.HOOK_STUDIO_CHROME || path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const ffmpeg = process.env.HOOK_STUDIO_FFMPEG || path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const html = path.join(here, 'Hook Editor Studio Pro.html');

const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));
for (const m of Object.values(project.media || {})) {
  if (!m.path || m.dataUrl) continue;
  const f = path.resolve(path.dirname(projPath), m.path);
  if (!fs.existsSync(f)) throw new Error('media not found: ' + f);
  if (m.kind === 'video') { m.url = pathToFileURL(f).href; continue; }
  const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
  m.dataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
}

const bgmFile = !silent && project.bgmPath ? path.resolve(path.dirname(projPath), project.bgmPath) : null;
const voiceFile = !silent && project.voicePath ? path.resolve(path.dirname(projPath), project.voicePath) : null;

const port = 9820 + Math.floor(Math.random() * 350);
const userDir = fs.mkdtempSync(path.join(process.env.TEMP || '.', 'heschrome-'));
const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
  '--allow-file-access-from-files', '--hide-scrollbars', '--mute-audio',
  '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'
], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const pg = list.find(t => t.type === 'page');
    if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
  } catch {}
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
  let info = await evaluate(`HOOKSTUDIO.load(${JSON.stringify(project)})`);
  if (autoStyle) info = await evaluate(`HOOKSTUDIO.autoedit({ style: ${JSON.stringify(autoStyle)} })`);
  const F = fpsArg || project.fps || 30;
  console.log('loaded', JSON.stringify(info));

  const still = opt('--still');
  if (still != null) {
    const url = await evaluate(`HOOKSTUDIO.frame(${+still}, ${JSON.stringify(mode)}, 0.95)`);
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote still', outPath);
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), dur = Math.max(0.2, to - from);
    const n = Math.max(1, Math.round(dur * F));
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });

    const isAlpha = mode === 'alpha' || outPath.toLowerCase().endsWith('.webm');
    const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', isAlpha ? 'png' : 'mjpeg', '-i', '-'];

    // Optional audio muxing (BGM at -22 dB ducked under voiceover if files provided on CLI project)
    let hasAud = false;
    const bgmDb = project.bgmDb != null ? Number(project.bgmDb) : -22;
    if (bgmFile && fs.existsSync(bgmFile) && voiceFile && fs.existsSync(voiceFile)) {
      hasAud = true;
      ffArgs.push('-ss', String(from), '-t', String(dur), '-i', bgmFile);
      ffArgs.push('-ss', String(from), '-t', String(dur), '-i', voiceFile);
      ffArgs.push('-filter_complex', `[1:a]volume=${bgmDb}dB,apad[bgm];[2:a]apad[voc];[voc][bgm]amix=inputs=2:duration=shortest:normalize=0[aout]`, '-map', '0:v', '-map', '[aout]');
    } else if (bgmFile && fs.existsSync(bgmFile)) {
      hasAud = true;
      ffArgs.push('-ss', String(from), '-t', String(dur), '-i', bgmFile);
      ffArgs.push('-filter:a', `volume=${bgmDb}dB`, '-map', '0:v', '-map', '1:a');
    } else if (voiceFile && fs.existsSync(voiceFile)) {
      hasAud = true;
      ffArgs.push('-ss', String(from), '-t', String(dur), '-i', voiceFile, '-map', '0:v', '-map', '1:a');
    }

    if (!hasAud) ffArgs.push('-an');
    if (isAlpha) {
      ffArgs.push('-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '22', '-b:v', '0');
      if (hasAud) ffArgs.push('-c:a', 'libopus', '-b:a', '192k');
    } else {
      ffArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart');
      if (hasAud) ffArgs.push('-c:a', 'aac', '-b:a', '192k');
    }
    ffArgs.push('-shortest', outPath);

    const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const url = await evaluate(`HOOKSTUDIO.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.95)`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % F === 0) process.stdout.write(`frame ${f}/${n}\r`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`\nwrote ${outPath} (${dur.toFixed(2)}s, ${n} frames, ${hasAud ? 'mixed audio' : 'silent'})`);
  }
} finally {
  ws.close(); proc.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
