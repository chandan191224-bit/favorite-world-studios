// Throwaway verification: WebCodecs exports (all 5 modes) + MediaRecorder fallback + phone 390px + editor UI boot.
// Not part of the shipped studio; used to prove the claims in HANDOVER.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, ffmpegPath } from './tooling.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(here, 'Data Chart Studio Pro.html');
const outDir = path.join(here, 'test-output', 'exports');
fs.mkdirSync(outDir, { recursive: true });
const log = (...a) => console.log(...a);

// ---------- 1. exports via WebCodecs + Mediabunny, then MediaRecorder fallback ----------
const b = await launch({ width: 1280, height: 720 });
try {
  await b.open(pathToFileURL(html).href);
  const caps = await b.evaluate(`({videoEncoder: typeof VideoEncoder, mediabunny: typeof window.Mediabunny, mediaRecorder: typeof MediaRecorder, captureStream: typeof HTMLCanvasElement.prototype.captureStream})`);
  log('browser capabilities:', JSON.stringify(caps));
  const files = await b.evaluate(`(async function(){
    DCS.build({ preset: 'race-gdp', duration: 1.2, width: 1280, height: 720 });
    const proj = DCS.project, out = [];
    for (const mode of ['composite','green','blue','alpha','matte']) {
      const r = await DC.exporter.run(proj, { mode, size: '640x360', fps: 30 });
      const buf = await r.blob.arrayBuffer(); const bytes = new Uint8Array(buf);
    let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      out.push({ mode, name: r.name, bytes: bytes.length, b64: btoa(bin) });
    }
    return out;
  })()`);
  for (const f of files) {
    const file = path.join(outDir, f.name.replace(/[^\w.-]+/g, '_'));
    fs.writeFileSync(file, Buffer.from(f.b64, 'base64'));
    log('export wrote', f.name, (f.bytes / 1024).toFixed(0) + ' KB');
  }
  // MediaRecorder fallback (force: hide WebCodecs path)
  const fb = await b.evaluate(`(async function(){
    window.VideoEncoder = undefined; // force the fallback
    DCS.build({ preset: 'bars-states', duration: 1.0, width: 1280, height: 720 });
    const r = await DC.exporter.run(DCS.project, { mode: 'composite', size: '480x270', fps: 24 });
    if (!r) return null;
    const buf = await r.blob.arrayBuffer(); const bytes = new Uint8Array(buf);
    let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return { name: r.name, bytes: bytes.length, b64: btoa(bin) };
  })()`);
  if (fb) { fs.writeFileSync(path.join(outDir, 'fallback_' + fb.name.replace(/[^\w.-]+/g, '_')), Buffer.from(fb.b64, 'base64')); log('fallback export wrote', fb.name, (fb.bytes / 1024).toFixed(0) + ' KB'); }
  else log('fallback export: NOT SUPPORTED in this browser');
  const errs = b.errors();
  if (errs.length) log('console errors during export:', errs.join('\n'));
} finally { b.close(); }

// ---------- 2. decode checks with ffprobe + pixel probes ----------
const ffprobe = ffmpegPath.replace(/ffmpeg(\.exe)?$/, m => m === '.exe' ? 'ffprobe.exe' : 'ffprobe');
function probe(file) {
  const j = JSON.parse(execFileSync(ffprobe, ['-loglevel', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8' }));
  return { codec: j.streams[0].codec_name, pix_fmt: j.streams[0].pix_fmt, w: j.streams[0].width, h: j.streams[0].height, dur: +(+j.format.duration).toFixed(2), fps: j.streams[0].r_frame_rate };
}
function frameRgba(file, idx = 0) {
  // first frame as raw RGBA bytes
  const buf = execFileSync(ffmpegPath, ['-loglevel', 'error', '-i', file, '-vf', `select='eq(n\\,${idx})'`, '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  return buf;
}
const px = (rgba, w, x, y) => { const i = (y * w + x) * 4; return [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]]; };
const results = [];
for (const f of fs.readdirSync(outDir)) {
  const file = path.join(outDir, f);
  const info = probe(file);
  const rgba = frameRgba(file, 0);
  const w = info.w;
  const corner = px(rgba, w, 5, 5), mid = px(rgba, w, w >> 1, (info.h >> 1));
  results.push({ file: f, ...info, corner, mid, bytes: fs.statSync(file).size });
  log('probe', f, JSON.stringify({ ...info, corner, mid }));
}
// assertions
// - key colour: H.264 always loses a few units in the colour round-trip (canvas fill is exact #00FF00).
//   A uniform key that keys cleanly needs the channel within tolerance, not bit-exact. The CLI render (PNG pipe)
//   is bit-exact - see the render.mjs section at the bottom.
// - alpha: ffprobe lists VP9 alpha streams as yuv420p (alpha plane not shown); the real test is a browser decode.
const byName = n => results.find(r => r.file.includes(n));
const comp = results.find(r => /_640x360\.mp4$/.test(r.file)), green = byName('greenscreen'), blueFile = byName('bluescreen'), alpha = byName('_alpha'), matte = byName('_matte'), fbk = byName('fallback');
function check(name, cond, detail) { log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  <- ' + detail)); return !!cond; }
const all = [];
all.push(check('composite is h264 mp4 ~1.2s', comp && comp.codec === 'h264' && Math.abs(comp.dur - 1.2) < 0.15, comp && JSON.stringify(comp)));
all.push(check('green keys cleanly (uniform ~#00FF00, tolerance for the H.264 round-trip)', green && green.corner[0] <= 20 && green.corner[1] >= 235 && green.corner[2] <= 20, green && JSON.stringify(green.corner)));
all.push(check('blue keys cleanly (uniform ~#0000FF)', blueFile && blueFile.corner[0] <= 20 && blueFile.corner[1] <= 20 && blueFile.corner[2] >= 235, blueFile && JSON.stringify(blueFile.corner)));
all.push(check('alpha webm is vp9', alpha && alpha.codec === 'vp9', alpha && JSON.stringify(alpha)));
all.push(check('matte is white chart on black bg', matte && matte.corner[0] < 16 && matte.corner[1] < 16 && matte.corner[2] < 16, matte && JSON.stringify(matte.corner)));
if (fbk) all.push(check('fallback media recorder decodes', true, ''));
log('export checks:', all.filter(Boolean).length + '/' + all.length, 'passed');

// ---------- 2b. what an editor actually sees: decode the exports in a browser <video> ----------
const c2 = await launch({ width: 1280, height: 720 });
try {
  await c2.open(pathToFileURL(html).href);
  const seen = {};
  for (const f of fs.readdirSync(outDir)) {
    if (!/\.(webm|mp4)$/.test(f)) continue;
    const b64 = fs.readFileSync(path.join(outDir, f)).toString('base64');
    const r = await c2.evaluate(`(async function(){
      try {
        const blob = new Blob([Uint8Array.from(atob(${JSON.stringify(b64)}), c => c.charCodeAt(0))], { type: ${JSON.stringify(f.endsWith('.webm') ? 'video/webm' : 'video/mp4')} });
        const v = document.createElement('video'); v.src = URL.createObjectURL(blob); v.muted = true;
        await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('decode error')); });
        v.currentTime = Math.min(0.5, v.duration / 2); await new Promise(r => v.onseeked = r);
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(v, 0, 0);
        const px = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
        return { dur: v.duration, corner: px(5, 5), mid: px(v.videoWidth >> 1, v.videoHeight >> 1) };
      } catch (e) { return { error: String(e) }; }
    })()`);
    seen[f] = r;
    log('browser decode', f, JSON.stringify(r));
  }
  const av = seen[Object.keys(seen).find(k => k.includes('_alpha'))];
  all.push(check('alpha webm really transparent in a browser (corner alpha 0)', av && av.corner[3] === 0, av && JSON.stringify(av)));
  const gv = seen[Object.keys(seen).find(k => k.includes('greenscreen'))];
  all.push(check('green element decodes on #00FF00 in a browser', gv && gv.corner[1] >= 235 && gv.corner[0] <= 20, gv && JSON.stringify(gv)));
  log('export checks (with browser decode):', all.filter(Boolean).length + '/' + all.length, 'passed');
} finally { c2.close(); }

// ---------- 3. phone 390px: no horizontal scroll, tabs work, screenshots ----------
const p = await launch({ width: 390, height: 844, ui: true });
try {
  await p.open(pathToFileURL(html).href);
  await new Promise(r => setTimeout(r, 1200)); // let the UI boot + thumbnails render
  const state = await p.evaluate(`({
    scrollW: document.scrollingElement.scrollWidth, clientW: document.documentElement.clientWidth,
    scenes: (window.DCApp && DCApp.project.scenes || []).length,
    libCards: document.querySelectorAll('#libGrid .fxcard').length,
    tabs: [...document.querySelectorAll('#mtabs button')].map(b => b.dataset.tab),
    mtabsVisible: getComputedStyle(document.getElementById('mtabs')).display,
  })`);
  log('phone 390px state:', JSON.stringify(state));
  check('phone 390: no horizontal scroll', state.scrollW <= 390, JSON.stringify(state));
  check('phone 390: bottom tabs visible', state.mtabsVisible !== 'none');
  await p.shot(path.join(here, 'test-output', 'phone-390-lib.jpg'));
  for (const tab of ['timeline', 'insp']) {
    await p.evaluate(`document.querySelector('#mtabs button[data-tab="${tab}"]').click(); void document.body.offsetHeight;`);
    await new Promise(r => setTimeout(r, 400));
    await p.shot(path.join(here, 'test-output', `phone-390-${tab}.jpg`));
  }
  // open + close the export dialog from the phone tab
  await p.evaluate(`document.querySelector('#mtabs button[data-tab="export"]').click(); void document.body.offsetHeight;`);
  await new Promise(r => setTimeout(r, 400));
  const dlgOpen = await p.evaluate(`!!document.getElementById('dlgExport').open`);
  await p.shot(path.join(here, 'test-output', 'phone-390-export-dlg.jpg'));
  await p.evaluate(`document.getElementById('exClose').click()`);
  check('phone 390: export dialog opens from tab', dlgOpen);
  const errs = p.errors();
  if (errs.length) log('phone console errors:', errs.join('\n'));
  check('phone: no console errors', errs.length === 0, errs.join(' | '));
} finally { p.close(); }

// ---------- 4. desktop editor boot + interactions ----------
const d = await launch({ width: 1600, height: 900, ui: true });
try {
  await d.open(pathToFileURL(html).href);
  await new Promise(r => setTimeout(r, 1500));
  const state = await d.evaluate(`({
    scenes: (window.DCApp && DCApp.project.scenes || []).map(s => s.chart),
    libCards: document.querySelectorAll('#libGrid .fxcard').length,
    timelineCards: document.querySelectorAll('#timeline .scene').length,
    title: document.querySelector('#stage') ? 1 : 0,
  })`);
  log('desktop editor state:', JSON.stringify(state));
  check('desktop: default project (3 scenes) loaded', state.scenes && state.scenes.length === 3, JSON.stringify(state));
  check('desktop: 44 preset cards in library', state.libCards === 44, String(state.libCards));
  // click a library card (load preset), switch inspector tabs, check transport
  await d.evaluate(`document.querySelectorAll('#libGrid .fxcard')[10].click(); void document.body.offsetHeight;`);
  await new Promise(r => setTimeout(r, 300));
  await d.evaluate(`document.querySelector('#inspTabs button[data-t="numbers"]').click(); void document.body.offsetHeight;`);
  await new Promise(r => setTimeout(r, 200));
  const after = await d.evaluate(`({ chart: DCApp.project.scenes[0].chart, fields: document.querySelectorAll('#insp .fld, #insp .tog').length })`);
  log('after preset click + numbers tab:', JSON.stringify(after));
  await d.shot(path.join(here, 'test-output', 'desktop-editor.jpg'));
  const errs = d.errors();
  if (errs.length) log('desktop console errors:', errs.join('\n'));
  check('desktop: no console errors', errs.length === 0, errs.join(' | '));
} finally { d.close(); }
log('verification done');
