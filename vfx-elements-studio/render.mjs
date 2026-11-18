// Render an Atmosphere & VFX Studio project (.vfx.json) to a silent MP4/WebM from the
// command line (for the video pipeline). Frame-exact headless Chrome + ffmpeg. Output is
// ALWAYS SILENT (user rule: no sound effects in editing, ever).
// Usage:
//   node render.mjs <project.vfx.json> <out.mp4> [--mode composite|green|blue|alpha|matte] [--fps 30]
//        [--from S] [--to S] [--still S out.jpg]
// Alpha mode writes a WebM (VP9 + alpha) via PNG frames piped straight into libvpx-vp9
// (Remotion's ffmpeg has no ffv1/prores — don't try them). All other modes write H.264 MP4.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [projPath, outPath] = args;
if (!projPath || !outPath) {
  console.log('usage: node render.mjs <project.vfx.json> <out.mp4> [--mode composite|green|blue|alpha|matte] [--fps 30] [--from S] [--to S] [--still S out.jpg]');
  process.exit(1);
}
const mode = opt('--mode', 'composite'), fps = +opt('--fps', 0) || null;

// ---- find chrome + ffmpeg (works on the studio PC and anywhere else) ----
// On the user's PC: Remotion's chrome-headless-shell + ffmpeg relative to the repo root
// (= this studio folder's parent). Fall back to installed Chrome/Edge and PATH ffmpeg.
const roots = [path.resolve(here, '..', '..'), path.resolve(here, '..'), here];
const chromeTries = [];
if (opt('--chrome')) chromeTries.push(opt('--chrome'));
if (process.env.CHROME) chromeTries.push(process.env.CHROME);
for (const root of roots) {
  // (fixed 2026-11-08 by Claude: ffmpeg paths were wrongly listed here, so on Windows ffmpeg.exe was launched as "chrome")
  chromeTries.push(
    path.join(root, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe'),
    path.join(root, 'node_modules/.remotion/chrome-headless-shell/linux64/Chrome/headless_shell'),
    path.join(root, 'node_modules/.remotion/chrome-headless-shell/macos/Chrome/headless_shell'),
  );
}
for (const wantShell of [true, false]) { // prefer chrome-headless-shell over full chrome (works without a display server)
  for (const base of [path.join(os.homedir(), '.cache/puppeteer'), 'C:\\Program Files\\Google\\Chrome\\Applications', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Applications', '/usr/bin', '/usr/local/bin', '/opt/google/chrome/bin']) {
    try {
      for (const d of fs.readdirSync(base)) {
        const isShell = /headless/i.test(d);
        if (isShell !== wantShell || !/chrome|chromium|edge/i.test(d)) continue;
        const dir = path.join(base, d);
        const find = (dir, depth) => {
          if (depth > 3) return [];
          let out = [];
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) out = out.concat(find(p, depth + 1));
            else if (/^(chrome|chrome-headless-shell|headless_shell|msedge)(\.exe)?$/i.test(e.name)) out.push(p);
          }
          return out;
        };
        chromeTries.push(...find(dir, 0));
      }
    } catch {}
  }
}
chromeTries.push('chrome-headless-shell', 'google-chrome', 'chromium', 'chrome', 'msedge');
const findBin = (cands, flag) => {
  for (const c of cands) {
    if (c.includes(path.sep) || /\.(exe|cmd|app)$/i.test(c)) {
      try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
    } else {
      try { const r = spawnSync(c, [flag], { stdio: 'ignore', timeout: 5000 }); if (!r.error) return c; } catch {}
    }
  }
  return null;
};
const chrome = findBin(chromeTries, '--version');
const ffmpegTries = [];
if (opt('--ffmpeg')) ffmpegTries.push(opt('--ffmpeg'));
for (const root of roots) for (const compDir of ['@remotion/compositor-win32-x64-msvc', '@remotion/compositor-linux-x64-gnu', '@remotion/compositor-macos-x64']) {
  ffmpegTries.push(path.join(root, `node_modules/${compDir}/ffmpeg.exe`), path.join(root, `node_modules/${compDir}/ffmpeg`));
}
ffmpegTries.push('ffmpeg');
const ffmpeg = findBin(ffmpegTries, '-version');
console.error('using chrome:', chrome);
console.error('using ffmpeg:', ffmpeg);
if (!chrome || !ffmpeg) { console.error('chrome found:', chrome || 'NO'); console.error('ffmpeg found:', ffmpeg || 'NO'); process.exit(1); }

const html = path.join(here, 'Atmosphere & VFX Elements Studio Pro.html');
if (!fs.existsSync(html)) { console.error('built studio HTML not found — run node build.mjs first'); process.exit(1); }
const project = JSON.parse(fs.readFileSync(projPath, 'utf8'));

// Resolve media `path` fields RELATIVE TO THE PROJECT FILE, wherever they appear:
// (1) the project-level media table  (2) per-shot inline media objects (bg.media / media).
// Photos are inlined as data URLs, videos are passed as file URLs (seeked frame-exact).
function resolveMedia(m) {
  if (!m || typeof m !== 'object' || m.dataUrl || m.url) return m;
  if (!m.path) return m;
  const f = path.resolve(path.dirname(projPath), m.path);
  if (!fs.existsSync(f)) throw new Error('media not found: ' + f);
  if ((m.kind === 'video') || (!m.kind && /\.(mp4|mov|webm|m4v|mkv)$/i.test(f))) { m.kind = 'video'; m.url = pathToFileURL(f).href; }
  else {
    m.kind = 'image';
    const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
    m.dataUrl = `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
  }
  return m;
}
for (const m of Object.values(project.media || {})) resolveMedia(m);
for (const s of project.shots || []) {
  if (s.bg && typeof s.bg.media === 'object') s.bg.media = resolveMedia(s.bg.media);
  if (typeof s.media === 'object') s.media = resolveMedia(s.media);
}

const port = 9900 + Math.floor(Math.random() * 300);
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfxchrome-'));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--allow-file-access-from-files',
  '--hide-scrollbars', '--mute-audio', '--window-size=1920,1080', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch (e) { if (i === 20) console.error('chrome connect:', e.message, 'proc exit:', proc.exitCode); }
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
  const info = await evaluate(`VFX.load(${JSON.stringify(project)})`);
  const F = fps || project.fps || 30;
  console.log('loaded', JSON.stringify(info));
  const still = opt('--still');
  if (still) {
    const url = await evaluate(`VFX.frame(${+still}, ${JSON.stringify(mode)}, 0.95)`);
    fs.writeFileSync(args[args.indexOf('--still') + 2], Buffer.from(url.split(',')[1], 'base64'));
    console.log('still written');
  } else {
    const from = +opt('--from', 0), to = +opt('--to', info.duration), n = Math.max(1, Math.round((to - from) * F));
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    const alphaVp9 = mode === 'alpha';
    if (alphaVp9) {
      // Alpha: PNG frames straight into VP9 + alpha (yuva420p). No FFV1/ProRes intermediate —
      // Remotion's ffmpeg doesn't ship those encoders and it would fail silently.
      const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-',
        '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '24', outPath],
        { stdio: ['pipe', 'ignore', 'inherit'] });
      ff.stdin.on('error', () => {});
      const done = new Promise(r => ff.on('close', r));
      for (let f = 0; f < n; f++) {
        const url = await evaluate(`VFX.frame(${(from + f / F).toFixed(4)}, 'alpha', 0.95)`);
        const buf = Buffer.from(url.split(',')[1], 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
      }
      ff.stdin.end();
      const code = await done;
      if (code !== 0) throw new Error('ffmpeg could not write the alpha WebM (exit ' + code + ')');
      console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, silent, VP9 + alpha)`);
    } else {
      // PNG frames keep the colour range exact (yuv420p, never yuvj420p / pc range)
      const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-'];
      ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outPath);
      const ff = spawn(ffmpeg, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
      ff.stdin.on('error', () => {});
      for (let f = 0; f < n; f++) {
        const url = await evaluate(`VFX.frame(${(from + f / F).toFixed(4)}, ${JSON.stringify(mode)}, 0.95)`);
        const buf = Buffer.from(url.split(',')[1], 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % (F * 2) === 0) process.stdout.write(`frame ${f}/${n}\r`);
      }
      ff.stdin.end();
      const code = await new Promise(r => ff.on('close', r));
      if (code !== 0) throw new Error('ffmpeg could not write ' + outPath + ' (exit ' + code + ')');
      console.log(`\nwrote ${outPath} (${(to - from).toFixed(2)} s, ${n} frames, silent)`);
    }
  }
} finally {
  ws.close(); proc.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
}
