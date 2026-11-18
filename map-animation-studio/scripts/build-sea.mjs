// Builds public/data/sea.json: a 0.25° water mask of the world used for SHIP routing
// (2026-11-13, user: "for ship routes it must follow the ship routes through the sea or ocean").
// Land comes from the bundled Natural Earth borders; narrow straits and canals that matter for
// shipping (Suez, Panama, Bosphorus, Malacca, Gibraltar…) are carved open so ships can pass.
//   node scripts/build-sea.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CELL = 0.25;
const W = Math.round(360 / CELL); // 1440
const H = Math.round(180 / CELL); // 720

const topo = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/countries-world-mid.json"), "utf8"));
const fc = feature(topo, topo.objects.countries);

const land = new Uint8Array(W * H); // 1 = land
const lonOf = (c) => -180 + (c + 0.5) * CELL;
const latOf = (r) => 90 - (r + 0.5) * CELL;
const colOf = (lon) => Math.min(W - 1, Math.max(0, Math.floor((lon + 180) / CELL)));
const rowOf = (lat) => Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / CELL)));

/** Ray-cast point in ring (planar on lon/lat; fine for a shipping mask). */
const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const t0 = Date.now();
let polys = 0;
for (const f of fc.features) {
  const geoms = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
  for (const poly of geoms) {
    polys++;
    const outer = poly[0];
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const [x, y] of outer) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const c0 = colOf(x0), c1 = colOf(x1), r0 = rowOf(y1), r1 = rowOf(y0);
    for (let r = r0; r <= r1; r++) {
      const lat = latOf(r);
      for (let c = c0; c <= c1; c++) {
        const i = r * W + c;
        if (land[i]) continue;
        const lon = lonOf(c);
        if (!inRing(outer, lon, lat)) continue;
        let hole = false;
        for (let h = 1; h < poly.length && !hole; h++) hole = inRing(poly[h], lon, lat);
        if (!hole) land[i] = 1;
      }
    }
  }
}

// Shipping corridors: polylines carved open (every cell the line passes becomes water),
// so narrow straits and canals that a 0.25° grid closes stay navigable.
const CORRIDORS = [
  ["Suez Canal", [[32.3, 31.3], [32.35, 30.55], [32.55, 29.93]]],
  ["Panama Canal", [[-79.92, 9.4], [-79.7, 9.1], [-79.55, 8.9]]],
  ["Bosphorus", [[29.1, 41.4], [29.05, 41.1], [28.98, 40.98]]],
  ["Dardanelles", [[26.18, 40.02], [26.45, 40.2], [26.75, 40.42]]],
  ["Sea of Marmara", [[28.98, 40.98], [27.5, 40.7], [26.75, 40.42]]],
  ["Gibraltar", [[-6.0, 35.95], [-5.5, 35.98], [-5.0, 36.0]]],
  ["Malacca Strait", [[96.0, 5.6], [98.5, 3.9], [100.5, 2.6], [102.3, 1.8], [103.6, 1.25], [104.4, 1.35]]],
  ["Singapore Strait", [[103.6, 1.25], [104.0, 1.2], [104.6, 1.4]]],
  ["Hormuz", [[56.0, 26.75], [56.5, 26.5], [56.9, 26.2]]],
  ["Bab-el-Mandeb", [[43.25, 12.75], [43.45, 12.5], [43.6, 12.3]]],
  ["Kiel Canal", [[8.9, 53.9], [9.5, 54.1], [10.15, 54.37]]],
  ["Oresund", [[12.6, 56.05], [12.75, 55.85], [12.85, 55.6]]],
  ["Dover", [[1.2, 50.9], [1.6, 50.95]]],
  ["Palk Strait / Adam's Bridge", [[79.3, 9.3], [79.8, 9.1], [80.2, 9.0]]],
];
for (const [, line] of CORRIDORS) {
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / (CELL / 2)));
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((bx - ax) * s) / steps;
      const y = ay + ((by - ay) * s) / steps;
      land[rowOf(y) * W + colOf(x)] = 0;
    }
  }
}

// pack to bits
const packed = new Uint8Array(Math.ceil((W * H) / 8));
let landCells = 0;
for (let i = 0; i < W * H; i++)
  if (land[i]) {
    packed[i >> 3] |= 1 << (i & 7);
    landCells++;
  }
const out = { cell: CELL, w: W, h: H, note: "1-bit land mask, row 0 = lat 90..89.75, col 0 = lon -180..-179.75; bit set = land", mask: Buffer.from(packed).toString("base64") };
fs.writeFileSync(path.join(ROOT, "public/data/sea.json"), JSON.stringify(out));
console.log(`sea.json written: ${W}x${H} cells, ${polys} polygons, ${((landCells / (W * H)) * 100).toFixed(1)}% land, ${(Date.now() - t0) / 1000}s`);
