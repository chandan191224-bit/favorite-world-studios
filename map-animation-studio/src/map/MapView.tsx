import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { makeProjection, pixelsPerDegree, type Camera, type ProjectionKind } from "../lib/camera";
import { useWorld, type BorderView, type World } from "../lib/data";
import type { RasterKind, Theme } from "../lib/themes";
import type { LonLat } from "../lib/places";
import { paintMap, useMapAssets, type CanvasPainter, type Highlight, type MapLayers } from "./paint";
import { getLiveCamera, mapPixelRatio, previewReuse, subscribeLiveCamera } from "../lib/quality";
import { pickLod } from "../lib/data";
import { drawHighlights } from "./highlightStyles";
import { affineOf, type BaseCache } from "./reuse";
import type { ResolvedHighlight } from "./highlightStyles";

export type { Highlight, MapLabel, MapLayers, CanvasPainter } from "./paint";
export { matchCountry, findCountry } from "./paint";

export type MapCtx = {
  projection: GeoProjection;
  path: (o: GeoPermissibleObjects) => string;
  width: number;
  height: number;
  /** Offset of the visible frame inside the (taller, tilted) map plane. */
  offsetY: number;
  camera: Camera;
  kind: ProjectionKind;
  theme: Theme;
  world: World | null;
  /** True if the point faces the camera (always true on flat maps). */
  visible: (p: LonLat) => boolean;
};

const Ctx = createContext<MapCtx | null>(null);
export const useMap = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMap() must be used inside <MapView>");
  return c;
};

type Props = {
  kind: ProjectionKind;
  camera: Camera;
  theme: Theme;
  borderView?: BorderView;
  layers?: MapLayers;
  highlights?: Highlight[];
  /** Real sun position for day/night shading of satellite imagery. */
  sun?: LonLat | null;
  raster?: RasterKind;
  rasterOpacity?: number;
  /** Stars and atmosphere around a globe. */
  space?: boolean;
  /** Extra canvas drawing after land and before borders (territories, choropleths...). */
  paint?: CanvasPainter;
  /** Styled area highlights (see useAreaHighlights). */
  areas?: ResolvedHighlight[];
  /** Internal border meshes to erase from the base map (when grouped regions have mergeBorders = true). */
  mergedBorders?: GeoPermissibleObjects[];
  /** Render size; defaults to the composition size. */
  size?: { width: number; height: number };
  children?: React.ReactNode;
};

const NO_LAYERS: MapLayers = {};
const NO_HIGHLIGHTS: Highlight[] = [];

export const MapView: React.FC<Props> = ({
  kind,
  camera: propCamera,
  theme,
  borderView = "india",
  layers = NO_LAYERS,
  highlights = NO_HIGHLIGHTS,
  sun = null,
  raster,
  rasterOpacity,
  space = kind === "globe",
  paint,
  areas,
  mergedBorders,
  size,
  children,
}) => {
  const [, setLiveTick] = useState(0);
  useEffect(() => subscribeLiveCamera(() => setLiveTick((n) => n + 1)), []);
  const camera = getLiveCamera() ?? propCamera;
  const video = useVideoConfig();
  const width = size?.width ?? video.width;
  const height = size?.height ?? video.height;
  const world = useWorld(borderView);
  const assets = useMapAssets(theme, layers, raster, sun);
  const rasterKind = raster ?? theme.raster;

  // Tilted cameras render a larger plane (taller, wider, and a little below the frame) that leans
  // back in 3D around the camera centre, so no edge of the map ever shows.
  const tilt = Math.max(0, Math.min(70, camera.pitch));
  const padX = tilt > 0 ? Math.round(width * (tilt / 55)) : 0;
  const padB = tilt > 0 ? Math.round(height * 0.3) : 0;
  const planeW = width + padX * 2;
  const planeH = tilt > 0 ? Math.round(height * (1 + tilt / 25)) + padB : height;
  const offsetY = planeH - height - padB;
  const projection = useMemo(() => {
    const p = makeProjection(kind, camera, width, height);
    const [tx, ty] = p.translate();
    return p.translate([tx + padX, ty + offsetY]);
  }, [kind, camera, width, height, padX, offsetY]);

  const ref = useRef<HTMLCanvasElement>(null);
  const cache = useRef<BaseCache | null>(null);
  const ppd = pixelsPerDegree(kind, camera, width, height);
  // preview quality: paint at about the size the map is shown (exports keep ratio 1)
  const pr = mapPixelRatio(planeW, planeH);
  const canvasW = Math.max(1, Math.round(planeW * pr));
  const canvasH = Math.max(1, Math.round(planeH * pr));

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !world) return;
    const t0 = performance.now();
    const ctx = canvas.getContext("2d")!; // GPU-backed: willReadFrequently forced slow software rendering
    const prDraw = canvasW / planeW;
    // Editor preview on flat maps: reuse the painted base map while the camera pans/zooms/rotates (an exact image
    // transform on Mercator/equirectangular), repaint only when zoom changes a lot or the view leaves the margin.
    const hasAreaInternal = (areas ?? []).some((a) => a.internalBorders && a.t >= 0);
    if (previewReuse() && (kind === "mercator" || kind === "flat") && !paint && highlights.length === 0) {
      const lod = pickLod(ppd * prDraw);
      const labelled = (areas ?? []).filter((a) => a.label && a.t >= 0).length;
      const sig = [theme, world, assets.day, assets.night, assets.dark, assets.relief, assets.states, assets.rivers, assets.lakes, assets.roads, assets.rail, rasterKind, rasterOpacity, space, JSON.stringify(layers), String(sun), labelled, lod, prDraw.toFixed(3), planeW, planeH, hasAreaInternal, mergedBorders?.length ?? 0];
      let c = cache.current;
      let A = c && c.sig.length === sig.length && c.sig.every((v, i) => v === sig[i]) ? affineOf(c, projection, planeW, planeH) : null;
      if (!A) {
        const mW = Math.round(planeW * 0.3), mH = Math.round(planeH * 0.3);
        const baseW = planeW + 2 * mW, baseH = planeH + 2 * mH;
        const base = c?.canvas ?? document.createElement("canvas");
        base.width = Math.max(1, Math.round(baseW * prDraw));
        base.height = Math.max(1, Math.round(baseH * prDraw));
        const p0 = makeProjection(kind, camera, width, height);
        const [tx, ty] = p0.translate();
        p0.translate([tx + padX + mW, ty + offsetY + mH]);
        paintMap({ ctx: base.getContext("2d")!, pixelRatio: prDraw, width: baseW, height: baseH, projection: p0, kind, ppd, theme, world, assets, layers, highlights, rasterKind, rasterOpacity, sun, space, areas, mergedBorders, skipAreas: true });
        c = cache.current = { canvas: base, proj: p0, scale: p0.scale(), w: baseW, h: baseH, sig };
        A = affineOf(c, projection, planeW, planeH);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (A && c) {
        ctx.setTransform(prDraw * A[0], prDraw * A[1], prDraw * A[2], prDraw * A[3], prDraw * A[4], prDraw * A[5]);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(c.canvas, 0, 0, c.w, c.h);
      }
      ctx.setTransform(prDraw, 0, 0, prDraw, 0, 0);
      if (areas && areas.length) drawHighlights(ctx, projection, areas, theme, planeW, planeH);
      (window as unknown as { __mapPaintMs?: number }).__mapPaintMs = performance.now() - t0;
      if (typeof window !== "undefined") {
        (window as unknown as { __mapStudioView?: unknown }).__mapStudioView = {
          projection,
          camera,
          kind,
          width,
          height,
          padX,
          offsetY,
          planeW,
          planeH,
          tilt,
          world,
        };
      }
      return;
    }
    cache.current = null;
    paintMap({
      ctx,
      pixelRatio: prDraw,
      width: planeW,
      height: planeH,
      projection,
      kind,
      ppd,
      theme,
      world,
      assets,
      layers,
      highlights,
      rasterKind,
      rasterOpacity,
      sun,
      space,
      paint,
      areas,
      mergedBorders,
    });
    // last paint time, read by scripts/perf-profile.mjs
    (window as unknown as { __mapPaintMs?: number }).__mapPaintMs = performance.now() - t0;
    // Publish current projection + camera in the editor preview so interactive camera drag & Ctrl+click region picking work accurately
    if (typeof window !== "undefined") {
      (window as unknown as { __mapStudioView?: unknown }).__mapStudioView = {
        projection,
        camera,
        kind,
        width,
        height,
        padX,
        offsetY,
        planeW,
        planeH,
        tilt,
        world,
      };
    }
  });

  const ctxValue = useMemo<MapCtx>(() => {
    const svgPath = geoPath(projection);
    return {
      projection,
      path: (o) => svgPath(o) ?? "",
      width: planeW,
      height: planeH,
      offsetY,
      camera,
      kind,
      theme,
      world,
      visible: (p) => {
        const q = projection(p);
        if (!q) return false;
        if (kind !== "globe") return true;
        const back = projection.invert!(q);
        return !!back && Math.abs(back[0] - p[0]) < 1e-3 && Math.abs(back[1] - p[1]) < 1e-3;
      },
    };
  }, [projection, planeW, planeH, offsetY, camera, kind, theme, world]);

  const originY = offsetY + height / 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden", width, height, backgroundColor: kind === "globe" ? theme.space : theme.oceanEdge }}>
      <div
        style={{
          position: "absolute",
          left: -padX,
          top: -offsetY,
          width: planeW,
          height: planeH,
          transformOrigin: `${padX + width / 2}px ${originY}px`,
          transform: tilt > 0 ? `perspective(${height * 1.4}px) rotateX(${tilt}deg)` : undefined,
        }}
      >
        <canvas ref={ref} width={canvasW} height={canvasH} style={{ position: "absolute", inset: 0, width: planeW, height: planeH }} />
        <Ctx.Provider value={ctxValue}>{world ? children : null}</Ctx.Provider>
      </div>
    </AbsoluteFill>
  );
};

/** SVG layer that shares the map projection. Put routes, pins and labels inside. */
export const MapOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useMap();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {children}
    </svg>
  );
};
