// Render one composition to out/<id>.mp4
//
//   npm run render -- FlightPath                 1080p H.264, YouTube quality (CRF 16, JPEG frames, fast — default since 2026-11-13)
//   npm run render -- FlightPath --max           old master quality (CRF 12, slow preset, lossless PNG frames)
//   npm run render -- FlightPath --4k            3840x2160
//   npm run render -- FlightPath --shorts        1080x1920 vertical
//   npm run render -- FlightPath --prores        ProRes 4444 .mov for Premiere / DaVinci grading
//   npm run render -- FlightPath --props=my.json  props file (same fields as the Studio panel)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("Usage: npm run render -- <CompositionId> [--4k] [--shorts] [--square] [--prores] [--props=file.json]");
  process.exit(1);
}
const has = (f) => args.includes(f);
let props = {};
const propsArg = args.find((a) => a.startsWith("--props="));
if (propsArg) props = JSON.parse(fs.readFileSync(propsArg.slice(8), "utf8"));
if (has("--4k")) props.format = "16:9 4K";
if (has("--shorts")) props.format = "9:16 Shorts/Reels";
if (has("--square")) props.format = "1:1 Square";
const prores = has("--prores");
const max = has("--max");
const suffix = props.format ? `-${props.format.split(" ")[0].replace(":", "x")}` : "";
const out = path.join("out", `${id}${suffix}.${prores ? "mov" : "mp4"}`);
// YouTube-quality fast settings by default (looks the same after YouTube's re-encode, several times faster).
// --max keeps the old archive-master settings from remotion.config.ts (PNG frames, CRF 12, slow preset).
const concurrency = Math.max(2, Math.min(Number(process.env.MAP_STUDIO_CONCURRENCY) || os.cpus().length - 1, 12));
const fast = prores || max ? [] : ["--image-format=jpeg", "--jpeg-quality=95", "--crf=16", "--x264-preset=fast"];
const cli = [
  "remotion",
  "render",
  id,
  out,
  ...(Object.keys(props).length ? [`--props=${JSON.stringify(props)}`] : []),
  ...(prores ? ["--codec=prores", "--prores-profile=4444"] : []),
  ...fast,
  ...(args.some((a) => a.startsWith("--concurrency")) ? [] : [`--concurrency=${concurrency}`]),
  ...args.filter((a) => a.startsWith("--") && !["--4k", "--shorts", "--square", "--prores", "--max"].includes(a) && !a.startsWith("--props=")),
];
console.log("npx", cli.join(" "));
const r = spawnSync("npx", cli, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
