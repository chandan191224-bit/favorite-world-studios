import type { Topology, GeometryCollection } from "topojson-specification";
import { fetchJson, loadOnce } from "./data";
import { densify, distanceKm, greatCircle } from "./geo";
import type { LonLat } from "./places";

/**
 * Routes over the Natural Earth highway and railway networks (offline), or OSRM street-level
 * driving routes when online. Every route ends exactly at the requested coordinates.
 */
export type RouteMode = "road" | "rail" | "flight" | "straight" | "sea" | "street";

type Graph = {
  nodes: LonLat[];
  adj: { to: number; arc: number; w: number; rev: boolean }[][];
  arcs: LonLat[][];
};

function decodeArcs(t: Topology): LonLat[][] {
  const tr = t.transform;
  return t.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map((p) => {
      if (tr) {
        x += p[0];
        y += p[1];
        return [x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]] as LonLat;
      }
      return [p[0], p[1]] as LonLat;
    });
  });
}

const SNAP_DEG = 0.01; // vertices closer than ~1 km are treated as one junction

const loadGraph = (layer: "roads" | "rail") =>
  loadOnce<Graph>(`graph:${layer}`, async () => {
    const t = await fetchJson<Topology<{ [k: string]: GeometryCollection }>>(`data/${layer}.json`);
    const lines = decodeArcs(t);
    const cells = new Map<string, number>();
    const nodes: LonLat[] = [];
    const adj: Graph["adj"] = [];
    const arcs: LonLat[][] = [];
    const node = (p: LonLat) => {
      const k = `${Math.round(p[0] / SNAP_DEG)},${Math.round(p[1] / SNAP_DEG)}`;
      let id = cells.get(k);
      if (id === undefined) {
        id = nodes.length;
        cells.set(k, id);
        nodes.push(p);
        adj.push([]);
      }
      return id;
    };
    const link = (a: number, b: number, coords: LonLat[]) => {
      if (a === b) return;
      let w = 0;
      for (let k = 1; k < coords.length; k++) w += distanceKm(coords[k - 1], coords[k]);
      const i = arcs.push(coords) - 1;
      adj[a].push({ to: b, arc: i, w, rev: false });
      adj[b].push({ to: a, arc: i, w, rev: true });
    };
    // Every vertex is a potential junction, because many crossings in the source data share a
    // vertex without being split into separate lines.
    for (const line of lines) {
      if (line.length < 2) continue;
      let prev = node(line[0]);
      let run: LonLat[] = [line[0]];
      for (let k = 1; k < line.length; k++) {
        run.push(line[k]);
        const id = node(line[k]);
        if (id !== prev) {
          link(prev, id, run);
          prev = id;
          run = [line[k]];
        }
      }
    }
    // Join junctions that fall into neighbouring snap cells.
    for (const [k, id] of cells) {
      const [cx, cy] = k.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const other = cells.get(`${cx + dx},${cy + dy}`);
        if (other !== undefined && distanceKm(nodes[id], nodes[other]) < 1.2) link(id, other, [nodes[id], nodes[other]]);
      }
    }
    return { nodes, adj, arcs };
  });

function nearest(g: Graph, p: LonLat) {
  let best = -1;
  let bestD = Infinity;
  const cosLat = Math.cos((p[1] * Math.PI) / 180);
  for (let i = 0; i < g.nodes.length; i++) {
    if (!g.adj[i].length) continue;
    const dx = (g.nodes[i][0] - p[0]) * cosLat;
    const dy = g.nodes[i][1] - p[1];
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { id: best, km: best >= 0 ? distanceKm(g.nodes[best], p) : Infinity };
}

class Heap {
  private a: [number, number][] = [];
  get size() {
    return this.a.length;
  }
  push(v: [number, number]) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function shortest(g: Graph, from: number, to: number): LonLat[] | null {
  const dist = new Float64Array(g.nodes.length).fill(Infinity);
  const via = new Int32Array(g.nodes.length).fill(-1);
  const viaEdge: Graph["adj"][number][number][] = [];
  const goal = g.nodes[to];
  // A* with a great-circle heuristic: admissible because roads are never shorter than geodesics.
  const h = (i: number) => distanceKm(g.nodes[i], goal);
  dist[from] = 0;
  const heap = new Heap();
  heap.push([h(from), from]);
  while (heap.size) {
    const [, u] = heap.pop();
    if (u === to) break;
    for (const e of g.adj[u]) {
      const nd = dist[u] + e.w;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        via[e.to] = u;
        viaEdge[e.to] = e;
        heap.push([nd + h(e.to), e.to]);
      }
    }
  }
  if (!isFinite(dist[to])) return null;
  const parts: LonLat[][] = [];
  for (let v = to; v !== from; v = via[v]) {
    const e = viaEdge[v];
    const arc = g.arcs[e.arc];
    parts.push(e.rev ? arc.slice().reverse() : arc);
  }
  const out: LonLat[] = [];
  for (const part of parts.reverse()) out.push(...(out.length ? part.slice(1) : part));
  return out;
}

async function osrm(points: LonLat[]): Promise<LonLat[] | null> {
  try {
    const q = points.map((p) => `${p[0]},${p[1]}`).join(";");
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${q}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const json = await res.json();
    const coords = json?.routes?.[0]?.geometry?.coordinates as LonLat[] | undefined;
    return coords && coords.length > 1 ? coords : null;
  } catch {
    return null;
  }
}

/* ---------------- sea routing (2026-11-13) ----------------
 * Ships follow open water: A* over a 0.25° water mask (scripts/build-sea.mjs) with real straits
 * and canals carved open (Suez, Panama, Bosphorus, Malacca…), then the path is straightened
 * wherever the shortcut stays on water. User: "for ship routes it must follow the sea or ocean". */

type SeaGrid = { cell: number; w: number; h: number; mask: Uint8Array };

const loadSea = () =>
  loadOnce<SeaGrid>("sea:grid", async () => {
    const j = await fetchJson<{ cell: number; w: number; h: number; mask: string }>("data/sea.json");
    const bin = typeof atob === "function" ? atob(j.mask) : globalThis.Buffer.from(j.mask, "base64").toString("binary");
    const mask = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) mask[i] = bin.charCodeAt(i);
    return { cell: j.cell, w: j.w, h: j.h, mask };
  });

const seaLand = (g: SeaGrid, r: number, c: number): boolean => {
  if (r < 0 || r >= g.h) return true; // beyond the poles
  const i = r * g.w + (((c % g.w) + g.w) % g.w);
  return ((g.mask[i >> 3] >> (i & 7)) & 1) === 1;
};
const seaCellOf = (g: SeaGrid, p: LonLat): [number, number] => [
  Math.min(g.h - 1, Math.max(0, Math.floor((90 - p[1]) / g.cell))),
  (((Math.floor((p[0] + 180) / g.cell) % g.w) + g.w) % g.w),
];
const seaCenter = (g: SeaGrid, r: number, c: number): LonLat => [-180 + (c + 0.5) * g.cell, 90 - (r + 0.5) * g.cell];

/** Nearest water cell within `max` cells of p (ports sit on land cells of the coarse grid). */
function nearestWater(g: SeaGrid, p: LonLat, max = 20): [number, number] | null {
  const [r0, c0] = seaCellOf(g, p);
  if (!seaLand(g, r0, c0)) return [r0, c0];
  for (let d = 1; d <= max; d++) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (seaLand(g, r, c)) continue;
        const q = distanceKm(p, seaCenter(g, r, c));
        if (q < bestD) {
          bestD = q;
          best = [r, c];
        }
      }
    if (best) return best;
  }
  return null;
}

/** True when the great-circle between p and q stays on water (sampled every ~half cell). */
function seaClear(g: SeaGrid, p: LonLat, q: LonLat): boolean {
  const d = distanceKm(p, q);
  const n = Math.max(2, Math.ceil(d / (g.cell * 55)));
  const line = greatCircle(p, q, n);
  for (let i = 1; i < line.length - 1; i++) {
    const [r, c] = seaCellOf(g, line[i]);
    if (seaLand(g, r, c)) return false;
  }
  return true;
}

/** A* over water cells; returns smoothed coordinates, or null when no open-water path exists. */
function seaLeg(g: SeaGrid, a: LonLat, b: LonLat): LonLat[] | null {
  const start = nearestWater(g, a);
  const goal = nearestWater(g, b);
  if (!start || !goal) return null;
  const N = g.w * g.h;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const goalC = seaCenter(g, goal[0], goal[1]);
  const id = (r: number, c: number) => r * g.w + (((c % g.w) + g.w) % g.w);
  // simple binary heap of [f, cellId]
  const hf: number[] = [];
  const hi: number[] = [];
  const push = (f: number, i: number) => {
    let k = hf.length;
    hf.push(f);
    hi.push(i);
    while (k > 0) {
      const pk = (k - 1) >> 1;
      if (hf[pk] <= hf[k]) break;
      [hf[pk], hf[k]] = [hf[k], hf[pk]];
      [hi[pk], hi[k]] = [hi[k], hi[pk]];
      k = pk;
    }
  };
  const pop = (): number => {
    const top = hi[0];
    const lf = hf.pop()!;
    const li = hi.pop()!;
    if (hf.length) {
      hf[0] = lf;
      hi[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < hf.length && hf[l] < hf[m]) m = l;
        if (r < hf.length && hf[r] < hf[m]) m = r;
        if (m === k) break;
        [hf[m], hf[k]] = [hf[k], hf[m]];
        [hi[m], hi[k]] = [hi[k], hi[m]];
        k = m;
      }
    }
    return top;
  };
  const kmLat = 111.19 * g.cell;
  const s0 = id(start[0], start[1]);
  const gl = id(goal[0], goal[1]);
  dist[s0] = 0;
  push(distanceKm(seaCenter(g, start[0], start[1]), goalC), s0);
  let expanded = 0;
  while (hf.length) {
    const cur = pop();
    if (cur === gl) break;
    if (++expanded > 500000) return null;
    const r = Math.floor(cur / g.w);
    const c = cur % g.w;
    const kmLon = kmLat * Math.max(0.08, Math.cos(((90 - (r + 0.5) * g.cell) * Math.PI) / 180));
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        if (nr < 0 || nr >= g.h) continue;
        const nc = c + dc;
        if (seaLand(g, nr, nc)) continue;
        // hug-the-coast penalty keeps lanes a little offshore (straits stay usable: water is water)
        const coast = seaLand(g, nr - 1, nc) || seaLand(g, nr + 1, nc) || seaLand(g, nr, nc - 1) || seaLand(g, nr, nc + 1) ? 1.5 : 1;
        const step = Math.hypot(dr * kmLat, dc * kmLon) * coast;
        const ni = id(nr, nc);
        const nd = dist[cur] + step;
        if (nd < dist[ni]) {
          dist[ni] = nd;
          prev[ni] = cur;
          push(nd + distanceKm(seaCenter(g, nr, nc), goalC), ni);
        }
      }
  }
  if (!isFinite(dist[gl])) return null;
  const cells: LonLat[] = [];
  for (let v = gl; v !== -1; v = prev[v]) {
    cells.push(seaCenter(g, Math.floor(v / g.w), v % g.w));
    if (v === s0) break;
  }
  cells.reverse();
  // straighten: jump as far ahead as the water allows
  const out: LonLat[] = [cells[0]];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && (distanceKm(cells[i], cells[j]) > 2500 || !seaClear(g, cells[i], cells[j]))) j--;
    out.push(cells[j]);
    i = j;
  }
  return [a, ...out, b];
}

export type RouteResult = { coords: LonLat[]; note: string };

/** Builds a route through all stops. Network legs fall back to geodesics when no network is nearby. */
export async function buildRoute(stops: LonLat[], mode: RouteMode): Promise<RouteResult> {
  if (stops.length < 2) return { coords: stops, note: "" };
  if (mode === "sea") {
    try {
      const g = await loadSea();
      const out: LonLat[] = [];
      const notes: string[] = [];
      for (let i = 1; i < stops.length; i++) {
        let leg = seaLeg(g, stops[i - 1], stops[i]);
        if (!leg) {
          notes.push(`leg ${i}: no open-water path found, drawn as a direct line`);
          leg = greatCircle(stops[i - 1], stops[i], 64);
        }
        out.push(...(out.length ? leg.slice(1) : leg));
      }
      return { coords: densify(out, 15), note: notes.join("; ") };
    } catch {
      // sea.json missing (old data folder): keep the old straight line below
    }
  }
  if (mode === "flight" || mode === "sea" || mode === "straight") {
    const out: LonLat[] = [];
    for (let i = 1; i < stops.length; i++) {
      const leg = greatCircle(stops[i - 1], stops[i], Math.max(16, Math.ceil(distanceKm(stops[i - 1], stops[i]) / 20)));
      out.push(...(out.length ? leg.slice(1) : leg));
    }
    return { coords: out, note: "" };
  }
  if (mode === "street") {
    const r = await osrm(stops);
    if (r) return { coords: [stops[0], ...r, stops[stops.length - 1]], note: "Street route: OpenStreetMap / OSRM" };
    mode = "road";
  }
  const g = await loadGraph(mode === "rail" ? "rail" : "roads");
  const out: LonLat[] = [];
  const notes: string[] = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const na = nearest(g, a);
    const nb = nearest(g, b);
    let leg: LonLat[] | null = null;
    // Only snap when the network is reasonably close to both stops.
    if (na.km < 80 && nb.km < 80 && na.id !== nb.id) leg = shortest(g, na.id, nb.id);
    if (!leg) {
      notes.push(`leg ${i}: no ${mode} network link, drawn as a direct line`);
      leg = greatCircle(a, b, 32);
    } else leg = [a, ...leg, b];
    out.push(...(out.length ? leg.slice(1) : leg));
  }
  return { coords: densify(out, 15), note: notes.join("; ") };
}

/** Parses GPX (track/route points) or GeoJSON text into coordinates with optional elevations. */
export function parseTrack(text: string): { coords: LonLat[]; ele: (number | null)[] } {
  const t = text.trim();
  if (t.startsWith("{")) {
    const gj = JSON.parse(t);
    const coords: LonLat[] = [];
    const ele: (number | null)[] = [];
    const take = (g: { type: string; coordinates: unknown; geometries?: unknown[] }) => {
      if (g.type === "LineString") for (const c of g.coordinates as number[][]) {
        coords.push([c[0], c[1]]);
        ele.push(c.length > 2 ? c[2] : null);
      }
      if (g.type === "MultiLineString") for (const l of g.coordinates as number[][][]) take({ type: "LineString", coordinates: l });
      if (g.type === "GeometryCollection") for (const s of g.geometries as never[]) take(s);
    };
    const feats = gj.type === "FeatureCollection" ? gj.features : gj.type === "Feature" ? [gj] : [{ geometry: gj }];
    for (const f of feats) if (f.geometry) take(f.geometry);
    return { coords, ele };
  }
  const doc = new DOMParser().parseFromString(t, "application/xml");
  const pts = Array.from(doc.querySelectorAll("trkpt, rtept"));
  return {
    coords: pts.map((p) => [parseFloat(p.getAttribute("lon")!), parseFloat(p.getAttribute("lat")!)] as LonLat),
    ele: pts.map((p) => {
      const e = p.querySelector("ele");
      return e ? parseFloat(e.textContent || "") : null;
    }),
  };
}
