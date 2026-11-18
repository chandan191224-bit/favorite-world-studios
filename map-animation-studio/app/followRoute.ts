// "Camera follows the route" (2026-11-13): chase-cam keyframes along a route layer's REAL geometry
// (the snapped road/rail path or great circle), not just a straight A→B camera move. Writes ordinary,
// editable camera keyframes, like every other cinematic preset.
import { loadGazetteer, parseCoords, resolveOrThrow } from "../src/lib/places";
import { buildRoute } from "../src/lib/routing";
import { distanceKm } from "../src/lib/geo";
import { r3, type CamKey, type Layer, type Project } from "./model";

type LonLat = [number, number];

/** Evenly spaced camera keyframes that chase the route head over the layer's duration. */
export async function followRouteKeys(l: Layer, o: { zoom?: number; pitch?: number } = {}): Promise<CamKey[]> {
  let coords: LonLat[];
  const track = /\.(gpx|geojson|json)$/i.test(l.media?.trim() ?? "") ? l.media.trim() : "";
  if (track) {
    // custom path file: follow it exactly, like the route layer does
    const { parseTrack } = await import("../src/lib/routing");
    coords = parseTrack(await (await fetch(track)).text()).coords;
  } else {
    const g = await loadGazetteer();
    const stops = l.places.filter((q) => q.trim()).map((q) => parseCoords(q) ?? ([resolveOrThrow(g, q).lon, resolveOrThrow(g, q).lat] as LonLat));
    if (stops.length < 2) throw new Error("The route needs at least two stops to follow.");
    coords = (await buildRoute(stops, (l.mode ?? "road") as Parameters<typeof buildRoute>[1])).coords;
  }
  if (coords.length < 2) throw new Error("Route too short to follow.");
  // cumulative length → sample at equal travelled distance (matches the vehicle's constant speed)
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + distanceKm(coords[i - 1], coords[i]));
  const total = cum[cum.length - 1] || 1;
  const dur = Math.max(0.5, l.endSec - l.startSec);
  const n = Math.max(3, Math.min(14, Math.round(dur / 2)));
  const at = (f: number): LonLat => {
    const d = f * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const seg = Math.max(1e-9, cum[i] - cum[i - 1]);
    const f2 = (d - cum[i - 1]) / seg;
    const a = coords[i - 1];
    const b = coords[i];
    return [a[0] + (b[0] - a[0]) * f2, a[1] + (b[1] - a[1]) * f2];
  };
  const zoom = o.zoom ?? 5;
  const pitch = o.pitch ?? 42;
  const keys: CamKey[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const [lon, lat] = at(f);
    keys.push({
      t: r3(l.startSec + f * dur),
      place: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      zoom,
      bearing: Math.round(-12 + 24 * f),
      pitch,
      move: i === 0 ? "smooth" : "linear",
      ease: i === 0 ? "ease-in-out" : "linear",
    });
  }
  return keys;
}

/** Replaces the camera keys inside the layer's time span with the follow keys. */
export const applyFollowRoute = (p: Project, l: Layer, keys: CamKey[]): Project => {
  const kept = p.camera.filter((k) => k.t < l.startSec - 1e-3 || k.t > l.endSec + 1e-3);
  return { ...p, camera: [...kept, ...keys].sort((a, b) => a.t - b.t), durationSec: Math.max(p.durationSec, l.endSec) };
};
