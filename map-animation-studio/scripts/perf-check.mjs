// Preview smoothness check: opens the running editor (npm start) in headless Chrome and measures how long each preview
// frame takes to repaint (stepping with the Next-frame button) at every preview quality — on a laptop-sized window and an
// emulated phone (small screen + 4x slower CPU).   node scripts/perf-check.mjs [http://localhost:7272]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || "http://localhost:7272";
const chrome = path.join(here, "../../node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const port = 9650 + Math.floor(Math.random() * 200);
const ud = fs.mkdtempSync(path.join(process.env.TEMP || ".", "masperf-"));
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "about:blank"], { stdio: "ignore" });
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
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => {
  const m = await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 500));
  return m.result?.result?.value;
};
const MEASURE = `(async () => {
  const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const measure = async (q) => {
    const sel = document.querySelector('.qsel');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, q);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 800));
    const next = document.querySelector('button[aria-label="Next frame"]');
    for (let i = 0; i < 3; i++) { next.click(); await raf2(); }
    const t0 = performance.now(), N = 30;
    for (let i = 0; i < N; i++) { next.click(); await raf2(); }
    const ms = (performance.now() - t0) / N;
    const cv = document.querySelector('.frame canvas');
    return { quality: q, msPerFrame: Math.round(ms), maxFps: +(1000 / ms).toFixed(1), mapCanvas: cv ? cv.width + 'x' + cv.height : '-' };
  };
  const out = [];
  for (const q of ['full', 'auto', 'fast']) out.push(await measure(q));
  return out;
})()`;
const devices = [
  { name: "laptop 1366x768", w: 1366, h: 768, mobile: false, cpu: 1 },
  { name: "phone 390x844, CPU x4 slower", w: 390, h: 844, mobile: true, cpu: 4 },
];
try {
  await send("Page.enable");
  await send("Runtime.enable");
  for (const d of devices) {
    await send("Emulation.setDeviceMetricsOverride", { width: d.w, height: d.h, deviceScaleFactor: d.mobile ? 2 : 1, mobile: d.mobile });
    await send("Emulation.setTouchEmulationEnabled", { enabled: d.mobile });
    await send("Emulation.setCPUThrottlingRate", { rate: d.cpu });
    await send("Page.navigate", { url });
    await new Promise((r) => setTimeout(r, 9000));
    console.log(d.name, JSON.stringify(await ev(MEASURE)));
  }
} finally {
  ws.close();
  proc.kill();
  try { fs.rmSync(ud, { recursive: true, force: true }); } catch {}
}
