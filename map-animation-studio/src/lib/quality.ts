// Preview quality for the map canvas (2026-10-30: the editor was not smooth on the user's laptop or phone).
// The editor app lowers it so the map is painted at roughly the size it is shown on screen; Remotion renders
// (exports) never touch it, so final videos stay at full resolution.
import type { Camera } from "./camera";

let quality = 1;
// Tilted cameras paint a much larger plane than the frame; cap its pixel count in the preview.
let maxPixels = Infinity;
// Editor preview may reuse the painted base map while the camera pans/zooms (flat maps only). Never in exports.
let reuse = false;
// Live interactive camera override during drag/wheel on the preview so MapView repaints at 60fps without waiting on usePlaces.
let liveCamera: Camera | null = null;
const liveListeners = new Set<() => void>();

// Live interactive layer delta during drag/wheel on the preview so layer moves are 60fps.
export type LiveLayerDelta = { uid?: string; dx: number; dy: number; scale: number; rotate: number } | null;
let liveLayerDelta: LiveLayerDelta = null;

export const setMapQuality = (q: number, cap = Infinity, reuseBase = false) => {
  quality = Math.max(0.15, Math.min(1, q));
  maxPixels = cap;
  reuse = reuseBase;
};
export const previewReuse = () => reuse;

export const setLiveCamera = (cam: Camera | null) => {
  liveCamera = cam;
  for (const fn of liveListeners) fn();
};
export const getLiveCamera = () => liveCamera;

export const setLiveLayerDelta = (d: LiveLayerDelta) => {
  liveLayerDelta = d;
  for (const fn of liveListeners) fn();
};
export const getLiveLayerDelta = () => liveLayerDelta;

export const subscribeLiveCamera = (fn: () => void) => {
  liveListeners.add(fn);
  return () => {
    liveListeners.delete(fn);
  };
};

/** Canvas pixels per map pixel for a plane of planeW × planeH map pixels. */
export const mapPixelRatio = (planeW: number, planeH: number) => {
  // While the user is actively dragging/zooming the camera, lower pixel ratio for instant 60fps response
  const q = liveCamera ? Math.min(quality, 0.45) : quality;
  const area = planeW * planeH * q * q;
  const capped = area > maxPixels ? Math.sqrt(maxPixels / (planeW * planeH)) : q;
  return Math.max(0.1, Math.min(q, capped));
};
