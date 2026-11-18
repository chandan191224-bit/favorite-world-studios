// Camera targets for cinematic presets (2026-10-31): countries and states are framed from their real shape
// (centre + a zoom that fits them), so "Bihar" or "Kerala" work even though the place gazetteer only knows cities.
import { loadWorld } from "../src/lib/data";
import { resolveShape } from "../src/map/useAreaHighlights";
import { shapePoints } from "../src/scenes/highlights/MapHighlights";
import { fitCamera, type ProjectionKind } from "../src/lib/camera";
import { frameSize, type Project } from "./model";

export type CamTarget = { place: string; zoom: number | null };

/** Place string + fitted zoom for a camera key aimed at `place` (area shape first, then the name as typed). */
export async function camTarget(
  place: string,
  p: Pick<Project, "borders" | "projection" | "format">,
  level: "auto" | "country" | "state" | "continent" = "auto",
  targets?: string[],
  disabledTargets?: string[],
): Promise<CamTarget> {
  const q = place.trim();
  if (!q || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q)) return { place: q, zoom: null };
  try {
    const world = await loadWorld(p.borders);
    const shape = await resolveShape({ target: q, targets, disabledTargets, level, radiusKm: 0 }, world);
    const [w, h] = frameSize(p);
    const fit = fitCamera(p.projection as ProjectionKind, shapePoints(shape.feature), w, h, 0.22);
    return { place: `${fit.lat.toFixed(4)}, ${fit.lon.toFixed(4)}`, zoom: Math.round(fit.zoom * 100) / 100 };
  } catch {
    return { place: q, zoom: null }; // a city or landmark: the gazetteer resolves the name
  }
}
