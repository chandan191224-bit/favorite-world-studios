// Render a Collage & Split Studio project (.collage.json) to a SILENT video from the command line (video pipeline).
// Usage:
//   node render.mjs <project.collage.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte] [--fps 30]
//        [--from S] [--to S] [--still S out.png] [--preset id --media a.jpg,b.jpg ...] (builds a one-scene project)
//   node render.mjs --list-presets <out.json>     (dumps the preset library manifest)
// Frame-exact, headless Chrome + ffmpeg. Output is always SILENT (user rule: no SFX in editing, ever).
//   composite/green/blue/matte -> MP4 (H.264); alpha -> transparent WebM (VP9 + alpha).
// On the PC this prefers Remotion's chrome-headless-shell and ffmpeg (repo root = this folder's parent);
// it falls back to Playwright's bundled chromium, then to an installed Chrome/Edge/Chromium, then to system ffmpeg.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const die = msg => { console.error('ERROR: ' + msg); process.exit(1); };

// ---------- find a headless browser ----------
function findChrome() {
  const cands = [];
  if (process.env.CS_CHROME) cands.push(process.env.CS_CHROME);
  // Remotion's chrome-headless-shell on the user's PC (repo root = studio folder's parent)
  cands.push(path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'));
  // Playwright's bundled shells (this sandbox / any machine with Playwright)
  const pwDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pwDir)) for (const d of fs.readdirSync(pwDir)) {
    if (!d.startsWith('chromium')) continue;
    const try1 = path.join(pwDir, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    const try2 = path.join(pwDir, d, 'chrome-linux', 'headless_shell');
    const try3 = path.join(pwDir, d, 'chrome-linux', 'chrome');
    cands.push(try1, try2, try3);
  }
  if (process.platform === 'win32') {
    for (const p of ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']) cands.push(p);
  } else for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) cands.push(p);
  for (const c of cands) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  return null;
}
function findFfmpeg() {
  const cands = [];
  if (process.env.FFMPEG) cands.push(process.env.FFMPEG);
  cands.push(path.join(root, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe')); // Remotion's (no ffv1/prores/rawvideo — PNG pipe only)
  cands.push('/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg');
  for (const c of cands) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  return null;
}
const chromePath = findChrome(), ffmpegPath = findFfmpeg();
if (!chromePath) die('no headless browser found (set CS_CHROME to a chrome/chrome-headless-shell binary)');
if (!ffmpegPath) die('no ffmpeg found (set FFMPEG to an ffmpeg binary)');

const html = path.join(here, 'Collage & Split Studio Pro.html');
if (!fs.existsSync(html)) die('built studio not found — run "node build.mjs" first');

// ---------- tiny CDP client over WebSocket ----------
async function withPage(fn) {
  const port = 9800 + Math.floor(Math.random() * 400);
  const userDir = fs.mkdtempSync(path.join(os.tmpdir() || '.', 'csstudio-'));
  const flags = [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
    '--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1'];
  if (process.platform !== 'win32') flags.push('--no-sandbox');
  const proc = spawn(chromePath, [...flags, 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 80 && !ws; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const pg = list.find(t => t.type === 'page');
      if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
    } catch {}
    if (!ws) await new Promise(r => setTimeout(r, 250));
  }
  if (!ws) { try { proc.kill(); } catch {} { try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {} } die('could not connect to the headless browser'); }
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
    return await fn({ evaluate });
  } finally {
    try { ws.close(); } catch {}
    try { proc.kill(); } catch {}
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  }
}

// ---------- project loading (media by path relative to the project file) ----------
function loadProjectFile(projPath) {
  const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));
  for (const m of Object.values(project.media || {})) {
    if (!m.path || m.dataUrl) continue;
    const f = path.resolve(path.dirname(projPath), m.path);
    if (!fs.existsSync(f)) die('media not found: ' + f);
    if (m.kind === 'video') { m.url = pathToFileURL(f).href; continue; }
    const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
    m.dataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
  }
  return project;
}
// one-scene shorthand: --preset id --media photo1.jpg,photo2.jpg [--label a,b] [--dur S]
function buildQuickProject(presetId, mediaList, labels, dur) {
  const media = {}, slots = [];
  mediaList.forEach((f, k) => {
    const id = 'qm' + k, kind = /\.(mp4|mov|webm|m4v)$/i.test(f) ? 'video' : 'image';
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) die('media not found: ' + abs);
    if (kind === 'video') media[id] = { kind, name: path.basename(abs), path: abs };
    else { const ext = path.extname(abs).slice(1).toLowerCase().replace('jpg', 'jpeg'); media[id] = { kind, name: path.basename(abs), dataUrl: `data:image/${ext};base64,` + fs.readFileSync(abs).toString('base64') }; }
    slots.push({ m: id, label: (labels[k] || '') });
  });
  return { version: 1, name: 'collage-quick', width: 1920, height: 1080, fps: 30, media, scenes: [{ preset: presetId, dur: dur || undefined, slots }] };
}

// ---------- encode ----------
async function encode(info, { outPath, mode, fps, from, to, still }) {
  if (still != null) {
    const url = await info.evaluate(`CSAPI.frame(${+still}, ${JSON.stringify(mode)}, 0.95)`);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const outFile = opt('--still-out') || (mode === 'alpha' ? 'still.png' : 'still.jpg');
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, buf);
    console.log(`still written: ${outFile}`);
    return;
  }
  const F = fps || 30;
  const n = Math.max(1, Math.round((to - from) * F));
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  const alpha = mode === 'alpha';
  const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-'];
  if (alpha) ffArgs.push('-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '18', '-b:v', '0', outPath);
  else ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outPath);
  const ff = spawn(ffmpegPath, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
  ff.on('error', e => die('ffmpeg failed to start: ' + e.message));
  let ffCode = -1;
  ff.on('close', c => { ffCode = c; });
  for (let f = 0; f < n; f++) {
    const url = await info.evaluate(`CSAPI.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.92)`);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (F * 5) === 0) process.stdout.write(`frame ${f}/${n}\r`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  if (ffCode !== 0) die(`ffmpeg exited with code ${ffCode} — output may be broken; see the ffmpeg messages above`);
  console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, ${alpha ? 'transparent WebM' : 'MP4'}, silent)`);
}

// ---------- main ----------
const listPresets = args.includes('--list-presets');
if (listPresets) {
  const outFile = args[args.indexOf('--list-presets') + 1];
  await withPage(async ({ evaluate }) => {
    const presets = await evaluate('CSAPI.presets()');
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({ presets }, null, 1));
    console.log(`wrote ${outFile} (${presets.length} presets)`);
  });
} else {
  const [projPath, outPath] = args;
  if (!projPath || !outPath) { console.log('usage: node render.mjs <project.collage.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte] [--fps 30] [--from S] [--to S] [--still S out.png]\n       node render.mjs --list-presets <out.json>\n       node render.mjs <out> --preset <id> --media <a.jpg,b.mp4> [--label <a,b>] [--dur S] [--mode ...]'); process.exit(1); }
  const mode = opt('--mode', 'composite'), fps = +opt('--fps', 0) || null;
  const quickPreset = opt('--preset');
  const project = quickPreset
    ? buildQuickProject(quickPreset, (opt('--media', '') || '').split(',').filter(Boolean), (opt('--label', '') || '').split(','), +opt('--dur', 0) || null)
    : loadProjectFile(projPath);
  await withPage(async ({ evaluate }) => {
    const info = await evaluate(`CSAPI.load(${JSON.stringify(project)})`);
    console.log('loaded', JSON.stringify(info));
    const F = fps || project.fps || 30;
    const from = +opt('--from', 0), to = +opt('--to', info.duration);
    const still = opt('--still');
    if (still) { const so = args[args.indexOf('--still') + 2]; await encode({ evaluate }, { outPath, mode, fps: F, from, to, still: +still, stillOut: so }); }
    else await encode({ evaluate }, { outPath, mode, fps: F, from, to, still: null });
  });
}
