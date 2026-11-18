// Helper (OpenCode, 2026-11-14): prints the great-circle geometry of a route exactly as the
// Map Animation Studio draws it (d3-geo geoInterpolate), plus evenly spaced points for the
// "camera follows the route" chase cam.
//
//   node scripts/route-geometry.mjs Delhi New York
//
import { geoInterpolate, geoDistance } from "d3-geo";

const R = 6371.0088;
const PLACES = {
  Delhi: [77.209, 28.6139],
  "New Delhi": [77.2, 28.6],
  Mumbai: [72.877, 19.076],
  "New York": [-73.982, 40.7519],
  "Washington,  D.C.": [-77.0114, 38.9015],
  "San Francisco": [-122.4172, 37.7692],
};

const a = PLACES[process.argv[2]];
const b = PLACES[process.argv[3]];
if (!a || !b) {
  console.error("Usage: node scripts/route-geometry.mjs <from> <to>");
  console.error("Known:", Object.keys(PLACES).join(", "));
  process.exit(1);
}

const km = geoDistance(a, b) * R;
console.log(`${process.argv[2]} -> ${process.argv[3]}: ${Math.round(km).toLocaleString("en-IN")} km`);

const f = geoInterpolate(a, b);
const n = 12;
console.log("\nChase-cam points (equal distance):");
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const [lon, lat] = f(t);
  console.log(`  t=${t.toFixed(2)}  ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
}
