// Render a Data Chart Studio project to a video from the command line (for the video pipeline).
// Usage:
//   node render.mjs <project.chart.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte]
//        [--fps 30] [--from S] [--to S] [--size WxH] [--still S out.jpg]
//   node render.mjs --preset <preset-id> --csv <data.csv> [--csv-text "..."] [--title S] [--subtitle S]
//        [--source S] [--theme dark|paper|neon|light] [--lang en|hi] [--duration S] [--highlight name]
//        [--highlight-at S] [--callout "target|text|at[|until]"] [--camera "target|at|zoom|dur"]
//        [--numbers-json '{"prefix":"₹","unit":"crore"}'] [--align left|center] <out.mp4|out.webm> [same flags]
// Headless Chrome + ffmpeg, frame-exact: the same renderer (DC.engine.render) drives the editor preview,
// the in-app export and this CLI, so preview == export frame-for-frame.
// Output is always SILENT (user rule: no sound effects in video editing, ever).
// Frames travel as PNG, so key colours stay exact: green-screen is exactly #00FF00, blue exactly #0000FF,
// matte is really black/white. alpha mode encodes a transparent WebM (VP9 with alpha).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, ffmpegPath } from './tooling.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d = '') => { const i = args.indexOf(k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const has = k => args.includes(k);
const numOpt = (k, d) => { const n = +opt(k, NaN); return Number.isFinite(n) ? n : d; };

const FLAG_VALS = new Set(['--mode', '--fps', '--from', '--to', '--size', '--still', '--preset', '--csv', '--csv-text', '--title', '--subtitle', '--source', '--theme', '--lang', '--duration', '--highlight', '--highlight-at', '--callout', '--camera', '--numbers-json', '--align']);
const positional = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !FLAG_VALS.has(args[i - 1])));
const mode = opt('--mode', 'composite');
const fps = numOpt('--fps', 0) || null;
const size = opt('--size', '');
const presetId = opt('--preset', '');
let projectPath = null, outPath = null;
if (presetId) { outPath = positional[0] || null; }           // --preset + --csv: no project file, out is the only positional
else { [projectPath, outPath] = positional; }                // project file then out

function usage() {
  console.log(`usage:
  node render.mjs <project.chart.json> <out.mp4|out.webm> [--mode composite|green|blue|alpha|matte] [--fps 30] [--from S] [--to S] [--size WxH] [--still S out.jpg]
  node render.mjs --preset <id> --csv <data.csv> [overrides] <out.mp4|out.webm> [flags]   (see file header)`);
  process.exit(1);
}
if (!outPath || !mode) usage();

// alpha needs a WebM container; everything else lands as MP4 (rename target if the caller mixed them up)
let realOut = outPath;
if (mode === 'alpha' && !/\.webm$/i.test(realOut)) realOut = realOut.replace(/\.[^.]*$/, '') + '.webm';
if (mode !== 'alpha' && /\.webm$/i.test(realOut)) realOut = realOut.replace(/\.webm$/i, '.mp4');

const stillAt = has('--still') ? numOpt('--still', 0) : null;
const stillFile = has('--still') ? args[args.indexOf('--still') + 2] : null;
if (has('--still') && !stillFile) usage();

const b = await launch({ width: 1920, height: 1080 });
try {
  await b.open(pathToFileURL(path.join(here, 'Data Chart Studio Pro.html')).href);
  let info;
  if (presetId) {
    // ---- build a one-scene project from a preset + pasted/CSV data ----
    const csv = opt('--csv-text', '') || (opt('--csv', '') && fs.existsSync(opt('--csv', '')) ? fs.readFileSync(opt('--csv', ''), 'utf8') : '');
    const over = { preset: presetId };
    if (csv.trim()) over.csv = csv.trim();
    else console.log('note: no --csv given, using the preset\'s built-in sample data');
    for (const [flag, key] of [['--title', 'title'], ['--subtitle', 'subtitle'], ['--source', 'source'], ['--theme', 'theme'], ['--lang', 'lang'], ['--highlight', 'highlight'], ['--align', 'titleAlign']])
      if (opt(flag, '') !== '') over[key] = opt(flag, '');
    if (numOpt('--duration', NaN) === numOpt('--duration', NaN) && opt('--duration', '') !== '') over.duration = numOpt('--duration', 0);
    if (opt('--highlight-at', '') !== '') over.highlightAt = numOpt('--highlight-at', 0);
    const co = opt('--callout', '');
    if (co) over.callouts = co.split(';').map(s => { const [target, text, at, until] = s.split('|'); return { target: (target || '').trim(), text: (text || '').trim(), at: +at || 2, until: +until || 0 }; });
    const cam = opt('--camera', '');
    if (cam) { const [target, at, zoom, dur] = cam.split('|'); over.camera = { target: (target || '').trim(), at: +at || 2, zoom: +zoom || 1.5, dur: +dur || 1.2, hold: true }; }
    const nj = opt('--numbers-json', '');
    if (nj) over.format = JSON.parse(nj);
    const [W, H] = (size || '1920x1080').split('x').map(Number);
    const payload = { preset: presetId, csv: over.csv, width: W, height: H, fps: fps || 30 };
    for (const k of ['title', 'subtitle', 'source', 'theme', 'lang', 'highlight', 'titleAlign', 'duration', 'highlightAt', 'callouts', 'camera', 'format'])
      if (over[k] !== undefined) payload[k] = over[k];
    info = await b.evaluate(`DCS.build(${JSON.stringify(payload)})`);
    console.log('built preset', presetId, '->', JSON.stringify(info));
  } else {
    if (!projectPath || !fs.existsSync(projectPath)) { console.error('project not found:', projectPath || '(none)'); process.exit(1); }
    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    info = await b.evaluate(`DCS.load(${JSON.stringify(project)})`);
    console.log('loaded', JSON.stringify(info));
  }
  const F = fps || info.fps || 30;
  const [W, H] = (size || `${info.width}x${info.height}`).split('x').map(Number);

  if (stillFile) {
    const url = await b.evaluate(`DCS.frame(${stillAt}, ${JSON.stringify(mode)}, 'png')`);
    fs.mkdirSync(path.dirname(path.resolve(stillFile)), { recursive: true });
    fs.writeFileSync(stillFile, Buffer.from(url.split(',')[1], 'base64'));
    console.log('still written:', stillFile);
  } else {
    const from = numOpt('--from', 0), to = Math.min(numOpt('--to', 1e9), info.duration);
    const n = Math.max(1, Math.round((to - from) * F));
    fs.mkdirSync(path.dirname(path.resolve(realOut)), { recursive: true });
    // PNG pipe -> ffmpeg. Key modes (green/blue/matte) get near-lossless crf so the key colour stays exact.
    const crf = mode === 'composite' ? 16 : 10;
    const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'png', '-i', '-'];
    if (mode === 'alpha') ffArgs.push('-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-row-mt', '1', '-b:v', '0', '-crf', '18', '-auto-alt-ref', '0', realOut);
    else ffArgs.push('-an', '-c:v', 'libx264', '-pix_fmt', 'yuvj420p', '-crf', String(crf), '-preset', 'medium', '-movflags', '+faststart', realOut);
    const ff = spawn(ffmpegPath, ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      const t = Math.min(to - 1e-4, from + f / F);
      const url = await b.evaluate(`DCS.frame(${t.toFixed(4)}, ${JSON.stringify(mode)}, 'png')`);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % (F * 2) === 0 || f === n - 1) process.stdout.write(`frame ${f + 1}/${n} (${((Date.now() - t0) / 1000).toFixed(1)}s)\r`);
    }
    ff.stdin.end();
    const code = await new Promise(r => ff.on('close', r));
    if (code) throw new Error('ffmpeg exited ' + code);
    console.log(`\nwrote ${realOut} (${(to - from).toFixed(2)}s, ${n} frames @ ${F}fps, mode=${mode}, silent)`);
  }
  const errs = b.errors();
  if (errs.length) { console.log('console errors:\n' + errs.join('\n')); process.exitCode = 2; }
} finally {
  b.close();
}
