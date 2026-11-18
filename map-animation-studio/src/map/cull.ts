// Viewport culling for the base map (2026-10-30, the preview took ~0.7 s per frame): the world-wide road, rail,
// border, coast and state layers are split once into ~4° groups with bounding boxes, and each frame only the groups
// that can be on screen go through d3's projection. Output is identical; off-screen geometry is simply skipped.
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo";
import type { Geometry, Position } from "geojson";
import type { ProjectionKind } from "../lib/camera";

type Box = [number, number, number, number];
/** [lonMin, latMin, lonMax, latMax]; null = draw everything. */
export type View = Box | null;
type Piece = { box: Box; geom: GeoPermissibleObjects };

const pieceCache = new WeakMap<object, Piece[]>();
const boxCache = new WeakMap<object, Box>();
const empty = (): Box => [Infinity, Infinity, -Infinity, -Infinity];

const addCoords = (coords: Position[], b: Box) => {
  for (const c of coords) {
    if (c[0] < b[0]) b[0] = c[0];
    if (c[1] < b[1]) b[1] = c[1];
    if (c[0] > b[2]) b[2] = c[0];
    if (c[1] > b[3]) b[3] = c[1];
  }
  return b;
};

function geomBox(g: Geometry): Box {
  const b = empty();
  switch (g.type) {
    case "Point":
      return addCoords([g.coordinates], b);
    case "MultiPoint":
    case "LineString":
      return addCoords(g.coordinates, b);
    case "MultiLineString":
    case "Polygon":
      for (const r of g.coordinates) addCoords(r, b);
      return b;
    case "MultiPolygon":
      for (const p of g.coordinates) for (const r of p) addCoords(r, b);
      return b;
    case "GeometryCollection":
      for (const x of g.geometries) {
        const c = geomBox(x);
        b[0] = Math.min(b[0], c[0]);
        b[1] = Math.min(b[1], c[1]);
        b[2] = Math.max(b[2], c[2]);
        b[3] = Math.max(b[3], c[3]);
      }
      return b;
  }
  return [-180, -90, 180, 90];
}

const asGeometry = (o: GeoPermissibleObjects): Geometry | null => {
  const t = (o as { type?: string }).type;
  if (t === "Feature") return (o as { geometry: Geometry }).geometry;
  if (!t || t === "Sphere" || t === "FeatureCollection") return null;
  return o as Geometry;
};

/** Bounding box of a feature or geometry (cached); null if unknown. */
export function boxOf(o: GeoPermissibleObjects): Box | null {
  const hit = boxCache.get(o as object);
  if (hit) return hit;
  const g = asGeometry(o);
  if (!g) return null;
  const b = geomBox(g);
  boxCache.set(o as object, b);
  return b;
}

const CELL = 4; // degrees
function piecesOf(o: GeoPermissibleObjects): Piece[] {
  const hit = pieceCache.get(o as object);
  if (hit) return hit;
  const g = asGeometry(o);
  const ps: Piece[] = [];
  if (g && (g.type === "MultiLineString" || g.type === "MultiPolygon")) {
    const groups = new Map<string, unknown[]>();
    for (const part of g.coordinates as unknown[]) {
      const first = (g.type === "MultiPolygon" ? (part as Position[][])[0]?.[0] : (part as Position[])[0]) ?? [0, 0];
      const key = `${Math.floor(first[0] / CELL)}:${Math.floor(first[1] / CELL)}`;
      const arr = groups.get(key) ?? [];
      arr.push(part);
      groups.set(key, arr);
    }
    for (const parts of groups.values()) {
      const geom = { type: g.type, coordinates: parts } as Geometry;
      ps.push({ box: geomBox(geom), geom });
    }
  } else ps.push({ box: boxOf(o) ?? [-180, -90, 180, 90], geom: o });
  pieceCache.set(o as object, ps);
  return ps;
}

export const inView = (b: Box | null, v: View) => !v || !b || !(b[2] < v[0] || b[0] > v[2] || b[3] < v[1] || b[1] > v[3]);

/** Visible lon/lat box of the painted plane, or null when culling is unsafe (whole globe, poles, antimeridian). */
export function viewOf(projection: GeoProjection, kind: ProjectionKind, width: number, height: number): View {
  const inv = projection.invert;
  if (!inv) return null;
  let lon0 = Infinity;
  let lat0 = Infinity;
  let lon1 = -Infinity;
  let lat1 = -Infinity;
  const N = 8;
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * width;
      const y = (j / N) * height;
      const p = inv([x, y]);
      if (!p || !isFinite(p[0]) || !isFinite(p[1])) return null;
      if (kind === "globe") {
        // a sample off the globe disc means a whole hemisphere is visible: no culling
        const q = projection(p);
        if (!q || Math.abs(q[0] - x) > 1 || Math.abs(q[1] - y) > 1) return null;
      }
      lon0 = Math.min(lon0, p[0]);
      lon1 = Math.max(lon1, p[0]);
      lat0 = Math.min(lat0, p[1]);
      lat1 = Math.max(lat1, p[1]);
    }
  const padLon = (lon1 - lon0) * 0.15 + 1.5;
  const padLat = (lat1 - lat0) * 0.15 + 1.5;
  if (lon1 - lon0 > 250 || lat1 + padLat >= 89 || lat0 - padLat <= -89) return null;
  return [lon0 - padLon, lat0 - padLat, lon1 + padLon, lat1 + padLat];
}

// ---- zoom-aware simplification: drop points closer than ~0.5 screen pixel (invisible), cached per level ----
const LEVELS = [0.004, 0.012, 0.03, 0.075, 0.18, 0.4]; // degrees
const simpCache = new WeakMap<object, Map<number, GeoPermissibleObjects>>();
function thinLine(line: Position[], tol: number, ring: boolean): Position[] {
  if (line.length <= (ring ? 4 : 2)) return line;
  const out: Position[] = [line[0]];
  let last = line[0];
  for (let i = 1; i < line.length - 1; i++) {
    const c = line[i];
    if (Math.abs(c[0] - last[0]) >= tol || Math.abs(c[1] - last[1]) >= tol) {
      out.push(c);
      last = c;
    }
  }
  out.push(line[line.length - 1]);
  return ring && out.length < 4 ? line : out;
}
function thin(g: Geometry, tol: number): Geometry {
  switch (g.type) {
    case "LineString":
      return { ...g, coordinates: thinLine(g.coordinates, tol, false) };
    case "MultiLineString":
      return { ...g, coordinates: g.coordinates.map((l) => thinLine(l, tol, false)) };
    case "Polygon":
      return { ...g, coordinates: g.coordinates.map((r) => thinLine(r, tol, true)) };
    case "MultiPolygon":
      return { ...g, coordinates: g.coordinates.map((p) => p.map((r) => thinLine(r, tol, true))) };
    default:
      return g;
  }
}
/** The geometry thinned for a tolerance in degrees (≈ 1 px at the current zoom); the original when tol is tiny. */
export function simplified(o: GeoPermissibleObjects, tolDeg: number): GeoPermissibleObjects {
  let level = -1;
  for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i] <= tolDeg) level = i;
  if (level < 0) return o;
  const g = asGeometry(o);
  if (!g) return o;
  let m = simpCache.get(o as object);
  if (!m) simpCache.set(o as object, (m = new Map()));
  let r = m.get(level);
  if (!r) {
    const t = thin(g, LEVELS[level]);
    r = (o as { type: string }).type === "Feature" ? ({ ...(o as object), geometry: t } as GeoPermissibleObjects) : t;
    m.set(level, r);
  }
  return r;
}

/** Sends only the on-screen parts of `o` to the path, thinned to the zoom (tolDeg ≈ one pixel in degrees). */
export function drawCulled(path: (o: GeoPermissibleObjects) => void, o: GeoPermissibleObjects, view: View, tolDeg = 0) {
  const src = simplified(o, tolDeg);
  if (!view) {
    for (const p of piecesOf(src)) path(p.geom);
    return;
  }
  for (const p of piecesOf(src)) if (inView(p.box, view)) path(p.geom);
}
