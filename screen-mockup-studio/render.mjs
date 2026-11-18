// Render a Screen Mockup Studio project (.sms.json / .json) to MP4 or transparent WebM from the
// command line (for the video pipeline). Headless Chrome (CDP) + ffmpeg, frame-exact, ALWAYS SILENT.
// Usage:
//   node render.mjs <project.json> <out.mp4> [--mode composite|green|blue|alpha|matte|screenkey|screenmatte]
//        [--fps 30] [--from S] [--to S] [--still S out.jpg]
// Mode alpha writes a transparent WebM (VP9 + alpha); every other mode writes MP4 (H.264).
// media.<id>.path (relative to the project file) works for photos (inlined) and video clips (H.264 MP4).
//
// Binary discovery (the user's PC is Windows; this also runs anywhere Node does):
//   chrome: --chrome / $SMS_CHROME, Remotion's chrome-headless-shell (win64, then linux) relative to
//           the studio's parent folder, the puppeteer / ms-playwright caches, PATH, Program Files.
//   ffmpeg: --ffmpeg / $SMS_FFMPEG, Remotion's compositor ffmpeg.exe (win64) relative to the parent
//           folder, then ffmpeg from PATH. That ffmpeg build has no ffv1/prores/rawvideo/ffprobe:
//   so frames are piped as PNG (-f image2pipe -c:v png -i -) and encoded with
//   libx264 -pix_fmt yuv420p (MP4) or libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 (alpha WebM).
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..'); // repo root == the studio folder's parent
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [projPath, outPath] = args;
if (!projPath || !outPath) {
  console.log('usage: node render.mjs <project.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte|screenkey|screenmatte] [--fps 30] [--from S --to S] [--still S out.jpg]');
  process.exit(1);
}
const mode = opt('--mode', 'composite');
if (!['composite', 'green', 'blue', 'alpha', 'matte', 'screenkey', 'screenmatte'].includes(mode)) { console.error('unknown mode ' + mode); process.exit(1); }
const isStill = !!opt('--still'); // --still T renders ONE frame at time T into the output file (jpg)
let out = outPath;
if (!isStill) {
  if (mode === 'alpha' && !out.endsWith('.webm')) out = out.replace(/\.[^.]*$/, '') + '.webm';
  if (mode !== 'alpha' && !out.endsWith('.mp4')) out = out.replace(/\.[^.]*$/, '') + '.mp4';
  if (out !== outPath) console.log(`note: ${mode} writes ${path.extname(out).slice(1)} — using ${out}`);
}

// ---------- find chrome ----------
function findChrome() {
  const cands = [];
  const push = p => { if (p && fs.existsSync(p)) cands.push(p); };
  if (opt('--chrome')) push(opt('--chrome'));
  if (process.env.SMS_CHROME) push(process.env.SMS_CHROME);
  const rem = p => path.join(root, 'node_modules', '.remotion', p);
  push(rem('chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'));
  push(rem('chrome-headless-shell/linux-x64/chrome-headless-shell-linux64/chrome-headless-shell'));
  const home = os.homedir();
  // puppeteer cache: ~/.cache/puppeteer/chrome/<ver>/chrome-linux64/chrome
  try { for (const kind of fs.readdirSync(path.join(home, '.cache', 'puppeteer'))) for (const ver of fs.readdirSync(path.join(home, '.cache', 'puppeteer', kind))) { push(path.join(home, '.cache', 'puppeteer', kind, ver, 'chrome-linux64', 'chrome')); push(path.join(home, '.cache', 'puppeteer', kind, ver, 'chrome-headless-shell-linux64', 'chrome-headless-shell')); } } catch (e) {}
  // playwright cache: ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome (+ headless shell)
  try { for (const d of fs.readdirSync(path.join(home, '.cache', 'ms-playwright'))) { if (/^chromium/.test(d)) push(path.join(home, '.cache', 'ms-playwright', d, 'chrome-linux64', 'chrome')); if (/^chromium_headless_shell/.test(d)) push(path.join(home, '.cache', 'ms-playwright', d, 'chrome-headless-shell-linux64', 'chrome-headless-shell')); } } catch (e) {}
  // plain ~/.cache/chrome*, Program Files, PATH
  try { for (const d of fs.readdirSync(path.join(home, '.cache'))) if (/^(chrome|chromium)/i.test(d)) { push(path.join(home, '.cache', d, 'chrome')); push(path.join(home, '.cache', d, 'chrome-linux64', 'chrome')); } } catch (e) {}
  for (const p of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe']) push(p);
  try { for (const b of ['chrome', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) { try { const w = execSync(`which ${b} 2>/dev/null`).toString().trim(); if (w) push(w); } catch (e) {} } } catch (e) {}
  return cands.find(fs.existsSync);
}
const chrome = findChrome();
if (!chrome) { console.error('No Chrome/Chromium found. Pass --chrome <path> or set SMS_CHROME.'); process.exit(1); }
console.log('chrome:', chrome);

// ---------- find ffmpeg ----------
function findFfmpeg() {
  const cands = [];
  if (opt('--ffmpeg')) cands.push(opt('--ffmpeg'));
  if (process.env.SMS_FFMPEG) cands.push(process.env.SMS_FFMPEG);
  cands.push(path.join(root, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'));
  cands.push(path.join(root, 'node_modules', 'ffmpeg-static', 'ffmpeg'));
  try { const w = execSync('which ffmpeg 2>/dev/null').toString().trim(); if (w) cands.push(w); } catch (e) {}
  return cands.find(fs.existsSync);
}
const ffmpeg = findFfmpeg();
if (!ffmpeg) { console.error('No ffmpeg found. Pass --ffmpeg <path> or set SMS_FFMPEG.'); process.exit(1); }
console.log('ffmpeg:', ffmpeg);

const html = path.join(here, 'Screen Mockup Studio Pro.html');
if (!fs.existsSync(html)) { console.error('Screen Mockup Studio Pro.html is missing — run: node build.mjs'); process.exit(1); }
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
const userDir = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir() || '.', 'smschrome-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--headless=new', '--window-size=1920,1080', '--force-device-scale-factor=1',
  ...(process.platform === 'win32' ? [] : ['--no-sandbox', '--disable-dev-shm-usage']), 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {}
  if (!ws) await new Promise(r => setTimeout(r, 250));
}
if (!ws) { proc.kill(); console.error('chrome did not start'); process.exit(1); }
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

// run ffmpeg with a PNG pipe and fail LOUDLY on a non-zero exit (never silently)
function pipeFfmpeg(ffArgs) {
  const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', d => { err += d.toString(); if (err.length > 12000) err = err.slice(-8000); });
  const done = new Promise((resolve, reject) => {
    ff.on('error', e => reject(new Error('ffmpeg could not start: ' + e.message)));
    ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}\n${err.slice(-4000)}`)));
  });
  return { ff, done };
}

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__HEADLESS = true;' });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(html).href });
  await loaded;
  await evaluate('document.fonts.ready.then(() => true)');
  const info = await evaluate(`SMS.load(${JSON.stringify(project)})`);
  const F = +opt('--fps', 0) || project.fps || 30;
  console.log('loaded', JSON.stringify(info));
  if (isStill) {
    const url = await evaluate(`SMS.frame(${+opt('--still')}, ${JSON.stringify(mode)}, 'jpeg', 0.95)`);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`still written: ${out}`);
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), n = Math.max(1, Math.round((to - from) * F));
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    const webm = mode === 'alpha';
    const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-'];
    if (webm) ffArgs.push('-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '32', '-b:v', '0', '-speed', '6', out);
    else ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', out);
    const { ff, done } = pipeFfmpeg(ffArgs);
    let wrote = 0;
    try {
      for (let f = 0; f < n; f++) {
        const url = await evaluate(`SMS.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)})`);
        const buf = Buffer.from(url.split(',')[1], 'base64');
        if (!buf.length) throw new Error('empty frame ' + f);
        wrote += buf.length;
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
      }
    } catch (e) { try { ff.stdin.destroy(); } catch (_) {} await done; throw e; }
    if (!wrote) throw new Error('no frames rendered');
    ff.stdin.end();
    await done;
    console.log(`\nwrote ${out} (${(to - from).toFixed(2)} s, ${n} frames, ${(wrote / 1e6).toFixed(1)} MB PNG piped, silent)`);
  }
} catch (e) {
  console.error('RENDER FAILED:', e.message);
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch (_) {}
  try { proc.kill(); } catch (_) {}
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
