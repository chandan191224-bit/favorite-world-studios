// CPU profile of the editor preview while stepping frames: prints the functions that use the most time.
//   node scripts/perf-profile.mjs [http://localhost:7272] [quality=auto] [frames=8]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [url = "http://localhost:7272", quality = "auto", frames = "8"] = process.argv.slice(2);
const chrome = path.join(here, "../../node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const port = 9850 + Math.floor(Math.random() * 100);
const ud = fs.mkdtempSync(path.join(process.env.TEMP || ".", "masprof-"));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, "--window-size=1366,768", "about:blank"], { stdio: "ignore" });
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const pg = l.find((t) => t.type === "page");
    if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await new Promise((r) => setTimeout(r, 250));
}
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 9000));
  await ev(`(async () => { const sel = document.querySelector('.qsel'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, ${JSON.stringify(quality)}); sel.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 1500)); })()`);
  await send("Profiler.enable");
  await send("Profiler.setSamplingInterval", { interval: 500 });
  await send("Profiler.start");
  const t = await ev(`(async () => {
    const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const next = document.querySelector('button[aria-label="Next frame"]');
    const t0 = performance.now();
    let paint = 0;
    for (let i = 0; i < ${+frames}; i++) { next.click(); await raf2(); paint += window.__mapPaintMs || 0; }
    return [(performance.now() - t0) / ${+frames}, paint / ${+frames}];
  })()`);
  const { result } = await send("Profiler.stop");
  const prof = result.profile, self = new Map(), dt = new Map();
  for (let i = 0; i < prof.samples.length; i++) dt.set(prof.samples[i], (dt.get(prof.samples[i]) || 0) + (prof.timeDeltas[i] || 0));
  const total = [...dt.values()].reduce((a, b) => a + b, 0);
  for (const n of prof.nodes) {
    const cf = n.callFrame, key = `${cf.functionName || "(anon)"}  ${(cf.url || "").split("/").pop()}:${cf.lineNumber}`;
    self.set(key, (self.get(key) || 0) + (dt.get(n.id) || 0));
  }
  console.log(`quality=${quality}: ${Math.round(t[0])} ms per frame, map paint ${Math.round(t[1])} ms`);
  for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
} finally {
  ws.close();
  proc.kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch {}
}
