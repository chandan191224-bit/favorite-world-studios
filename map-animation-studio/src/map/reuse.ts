// Preview-only reuse of a painted base map (2026-10-30, smooth editing on laptops and phones).
// On Mercator/equirectangular maps a camera pan, zoom or rotation moves the whole map as one image, so the base
// painted once (with a margin) can be drawn with an affine transform instead of re-projecting every road and border.
import type { GeoProjection } from "d3-geo";

export type BaseCache = { canvas: HTMLCanvasElement; proj: GeoProjection; scale: number; w: number; h: number; sig: unknown[] };
type Pt = [number, number];
export type Affine = [number, number, number, number, number, number];

function solve(s: Pt[], d: Pt[]): Affine | null {
  const [s0, s1, s2] = s, [d0, d1, d2] = d;
  const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
  if (Math.abs(den) < 1e-9) return null;
  const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
  const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
  const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
  const dd = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
  return [a, b, c, dd, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - dd * s0[1]];
}
const apply = (m: Affine, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

/** Affine (cached base coords → current plane coords), or null when the cache can't be reused exactly. */
export function affineOf(c: BaseCache, projection: GeoProjection, W: number, H: number): Affine | null {
  const ratio = projection.scale() / c.scale;
  if (ratio < 0.8 || ratio > 1.25) return null; // too much zoom: repaint for crisp detail
  const plane: Pt[] = [[W * 0.25, H * 0.25], [W * 0.75, H * 0.25], [W * 0.25, H * 0.75], [W * 0.75, H * 0.75]];
  const base: Pt[] = [];
  for (const p of plane) {
    const ll = projection.invert?.(p);
    const q = ll && c.proj(ll);
    if (!q || !isFinite(q[0]) || !isFinite(q[1])) return null;
    base.push(q as Pt);
  }
  const A = solve(base.slice(0, 3), plane.slice(0, 3));
  const B = solve(plane.slice(0, 3), base.slice(0, 3));
  if (!A || !B) return null;
  // the 4th point must agree: otherwise the change isn't a pure image move (projection or wrap differences)
  const chk = apply(A, base[3]);
  if (Math.abs(chk[0] - plane[3][0]) > 1.5 || Math.abs(chk[1] - plane[3][1]) > 1.5) return null;
  // every corner of the visible plane must fall inside the cached image
  for (const corner of [[0, 0], [W, 0], [0, H], [W, H]] as Pt[]) {
    const q = apply(B, corner);
    if (q[0] < 0 || q[1] < 0 || q[0] > c.w || q[1] > c.h) return null;
  }
  return A;
}
