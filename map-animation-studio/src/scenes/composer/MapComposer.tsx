import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AbsoluteFill,
  Freeze,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { MapView, MapOverlay, useMap } from "../../map/MapView";
import {
  Callout,
  Pin,
  RadarMarker,
  RouteLine,
  VehicleMarker,
  useRouteGeometry,
} from "../../map/overlays";
import { HIGHLIGHT_STYLES } from "../../map/highlightStyles";
import {
  highlightDefaults,
  useAreaHighlights,
  useAreaShapes,
} from "../../map/useAreaHighlights";
import { RegionFill, regionMediaDefaults } from "../../map/RegionFill";
import { project3D } from "../../map/routeGeometry";
import { MilitaryArrow } from "../history/HistoryScenes";
import {
  base,
  sizeFromProps,
  zProjection,
  zRouteMode,
  zRouteStyle,
  zVehicle,
} from "../../lib/schema";
import { THEMES, type Theme } from "../../lib/themes";
import {
  cam,
  fitCamera,
  flyTo,
  mixCamera,
  type Camera,
} from "../../lib/camera";
import { clamp, easeInOutCubic, easeOutCubic, formatKm, subsolarPoint } from "../../lib/geo";
import { geoPath } from "d3-geo";
import {
  evaluate,
  IDENTITY,
  zEase,
  zKey,
  ease,
  type Transform,
} from "../../lib/keyframes";
import { usePlaces, useTrip } from "../../lib/useTrip";
import { placeSubtitle, parseCoords, type LonLat } from "../../lib/places";
import { getLiveLayerDelta, subscribeLiveCamera } from "../../lib/quality";
import { fetchJson, useAsset } from "../../lib/data";
import { resolveMedia, isVideoFile } from "../../lib/media";
import { Finish } from "../../fx/Finish";
import { Sfx, SFX } from "../../fx/Sfx";
import {
  Counter,
  Hud,
  LocationCard,
  LOCATION_CARD_STYLES,
} from "../../ui/Overlays2D";
import { WavingFlag } from "../../ui/Flag";
import { font } from "../../lib/fonts";
import { shapePoints } from "../highlights/MapHighlights";
import { getScene } from "../sceneRegistry";
import { CAMERA_MAIN, MAP_TYPES, fxAlpha, isEffect, planFor, warp, zFx, type FxPlan } from "./effects";
import { autoZoom, presetKeys } from "../../lib/cinematic";

/* ---------------- schema ---------------- */

export const LAYER_TYPES = [
  "highlight",
  "region-media",
  "cutout",
  "route",
  "pin",
  "radar",
  "callout",
  "arrow",
  "map-label",
  "text",
  "location-card",
  "image",
  "video",
  "flag",
  "counter",
  "hud",
  "sfx",
  "scene",
] as const;

export const ANCHORS = [
  "center",
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

export const zLayer = z.object({
  name: z.string().describe("Shown on the Studio timeline"),
  type: z.enum(LAYER_TYPES),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  places: z
    .array(z.string())
    .describe(
      "Area/place for map layers; all stops for routes; points for arrows; country for flags",
    ),
  disabledPlaces: z
    .array(z.string())
    .optional()
    .describe("Grouped area members that are unselected (excluded from the effect without deleting from the group)"),
  mergeBorders: z
    .boolean()
    .optional()
    .describe("Dissolve internal borders between adjacent grouped regions"),
  level: z.enum(["auto", "country", "state", "continent", "radius"]),
  radiusKm: z.number().min(0).max(5000),
  highlightStyle: z.enum(HIGHLIGHT_STYLES),
  routeStyle: zRouteStyle,
  mode: zRouteMode,
  vehicle: zVehicle,
  cardStyle: z.enum(LOCATION_CARD_STYLES),
  pinVariant: z.enum(["pin", "dot", "target", "flag"]),
  color: z.string().describe('CSS colour or "auto"'),
  text: z.string(),
  subtext: z.string(),
  media: z
    .string()
    .describe(
      'Image/video in public/, "flag", "flag:jp", or an SFX name for sfx layers',
    ),
  wave: z.boolean(),
  value: z.number().describe("Counter target value"),
  anchor: z
    .enum(ANCHORS)
    .describe("Screen position for text, image, video, flag, counter"),
  size: z
    .number()
    .min(4)
    .max(2000)
    .describe("Text size, icon size or media width in pixels (at 1080p)"),
  keys: z
    .array(zKey)
    .describe(
      "Keyframes: opacity, scale, x, y, rotate over time (empty = auto fade)",
    ),
  scene: z
    .string()
    .optional()
    .describe("Scene layers: id of the template to play, e.g. FlightPath"),
  sceneProps: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Scene layers: settings for the template"),
  hidden: z.boolean().optional().describe("Hide the layer without deleting it"),
  group: z.string().optional().describe("Timeline group: layers with the same group move together in the editor"),
  isGroupMaster: z.boolean().optional().describe("True when this layer is the combined master layer for its timeline group"),
  uid: z.string().optional().describe("Stable id (effects attach to it)"),
  attachTo: z
    .string()
    .optional()
    .describe('Effect mode: uid of the main scene layer, or "camera" for the project map camera'),
  fx: zFx.optional().describe("Effect settings (pause main, transitions, cinematic camera)"),
  contentSec: z
    .number()
    .optional()
    .describe("Main layers: designed length of the animation, used when effects re-time it"),
  extSec: z.number().optional().describe("Editor bookkeeping: seconds added to this main layer by 'extend' effects"),
});
export type Layer = z.infer<typeof zLayer>;

export const zCamKey = z.object({
  t: z.number().min(0).describe("Seconds"),
  place: z.string().describe('Place, landmark or "lat, lon"'),
  zoom: z.number().min(-1).max(14),
  bearing: z.number().min(-360).max(360),
  pitch: z.number().min(0).max(60),
  move: z
    .enum(["fly", "smooth", "linear", "cut"])
    .describe("How the camera travels to this keyframe"),
  ease: zEase,
});
export type CamKey = z.infer<typeof zCamKey>;

export const composerSchema = z.object({
  ...base,
  projectFile: z
    .string()
    .describe(
      "Optional JSON in public/ with { camera, layers, ... }; overrides these props (for automation)",
    ),
  projection: zProjection,
  camera: z
    .array(zCamKey)
    .describe("Camera keyframes; empty = frame all layers"),
  layers: z.array(zLayer),
  mapLayers: z.object({
    countryLabels: z.boolean(),
    states: z.boolean(),
    roads: z.boolean(),
    rail: z.boolean(),
    rivers: z.boolean(),
    graticule: z.boolean(),
  }),
  dayNight: z.boolean(),
  dateTimeUtc: z.string(),
  cameraContentSec: z
    .number()
    .optional()
    .describe("Designed length of the camera animation when effects re-time it"),
  cameraExtSec: z.number().optional().describe("Editor bookkeeping: seconds added by 'extend' effects on the camera"),
});
export type ComposerProps = z.infer<typeof composerSchema>;

export const layerDefaults = (
  l: Partial<Layer> & Pick<Layer, "type" | "startSec" | "endSec">,
): Layer => ({
  name: l.type,
  places: [],
  disabledPlaces: [],
  mergeBorders: false,
  level: "auto",
  radiusKm: 0,
  highlightStyle: "glow",
  routeStyle: "glow",
  mode: "road",
  vehicle: "car",
  cardStyle: "documentary",
  pinVariant: "pin",
  color: "auto",
  text: "",
  subtext: "",
  media: "",
  wave: true,
  value: 0,
  anchor: "center",
  size: 60,
  keys: [],
  scene: "",
  sceneProps: {},
  hidden: false,
  ...l,
});

const auto = (c: string, t: string) => (!c || c === "auto" ? t : c);

/* ---------------- helpers ---------------- */

function useLayerTransform(l: Layer): {
  tr: Transform;
  local: number;
  dur: number;
} {
  const [, setTick] = useState(0);
  useEffect(() => subscribeLiveCamera(() => setTick((n) => n + 1)), []);
  const frame = useCurrentFrame(); // relative to the layer's <Sequence>
  const { fps } = useVideoConfig();
  const dur = Math.max(0.05, l.endSec - l.startSec);
  const local = frame / fps;
  let tr = evaluate(l.keys, local, dur);
  const ld = getLiveLayerDelta();
  if (ld && l.uid && ld.uid === l.uid) {
    tr = {
      ...tr,
      x: tr.x + ld.dx,
      y: tr.y + ld.dy,
      scale: Math.max(0.02, Math.min(20, tr.scale * ld.scale)),
      rotate: tr.rotate + ld.rotate,
    };
  }
  // effects as modifiers: the main layer gives way while an effect embedded in it is playing (fxMul, runtime only)
  const mul = (l as Layer & { fxMul?: number }).fxMul ?? 1;
  return { tr: mul === 1 ? tr : { ...tr, opacity: tr.opacity * mul }, local, dur };
}

const anchorStyle = (
  a: (typeof ANCHORS)[number],
  height: number,
): React.CSSProperties => {
  const m = height * 0.08;
  const h = a.includes("left")
    ? { left: m }
    : a.includes("right")
      ? { right: m }
      : { left: 0, right: 0, display: "flex", justifyContent: "center" };
  const v = a.startsWith("top")
    ? { top: m }
    : a.startsWith("bottom")
      ? { bottom: m }
      : { top: 0, bottom: 0, display: "flex", alignItems: "center" };
  return { position: "absolute", ...h, ...v } as React.CSSProperties;
};

const ScreenLayer: React.FC<{ l: Layer; children: React.ReactNode }> = ({
  l,
  children,
}) => {
  const { height } = useVideoConfig();
  const { tr } = useLayerTransform(l);
  const u = height / 1080;
  const center = l.anchor === "center";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          ...anchorStyle(l.anchor, height),
          ...(center ? { width: "100%", height: "100%" } : {}),
        }}
      >
        <div
          style={{
            opacity: tr.opacity,
            translate: `${tr.x * u}px ${tr.y * u}px`,
            scale: String(tr.scale),
            rotate: `${tr.rotate}deg`,
            ...(center ? { margin: "auto" } : {}),
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Full-frame layer moved, scaled and rotated around the frame centre by its keyframes. */
const TransformFill: React.FC<{ tr: Transform; children: React.ReactNode }> = ({
  tr,
  children,
}) => {
  const { height } = useVideoConfig();
  const u = height / 1080;
  return (
    <AbsoluteFill
      style={{
        opacity: tr.opacity,
        translate: `${tr.x * u}px ${tr.y * u}px`,
        scale: String(tr.scale),
        rotate: `${tr.rotate}deg`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Keyframe transform for SVG map layers, scaling around the layer's map anchor. */
const MapLayerG: React.FC<{
  l: Layer;
  at?: LonLat | null;
  children: React.ReactNode;
}> = ({ l, at, children }) => {
  const m = useMap();
  const { height } = useVideoConfig();
  const { tr } = useLayerTransform(l);
  const q = at ? project3D(m, at) : { x: m.width / 2, y: m.height / 2 };
  const u = height / 1080;
  return (
    <g
      opacity={tr.opacity}
      transform={`translate(${tr.x * u},${tr.y * u}) translate(${q.x},${q.y}) rotate(${tr.rotate}) scale(${tr.scale}) translate(${-q.x},${-q.y})`}
    >
      {children}
    </g>
  );
};

/* ---------------- map layers ---------------- */

const PinLayer: React.FC<{ l: Layer; theme: Theme }> = ({ l, theme }) => {
  const pl = usePlaces(l.places.slice(0, 1));
  const { height } = useVideoConfig();
  if (!pl || !pl[0]) return null;
  const at: LonLat = [pl[0].lon, pl[0].lat];
  const size = l.size * (height / 1080);
  return (
    <MapLayerG l={l} at={at}>
      {l.type === "radar" ? (
        <RadarMarker
          at={at}
          color={auto(l.color, theme.accent)}
          size={size * 2}
          label={l.text}
        />
      ) : l.type === "callout" ? (
        <Callout
          at={at}
          title={l.text || pl[0].name}
          text={l.subtext}
          media={l.media}
          color={auto(l.color, theme.accent)}
        />
      ) : l.type === "map-label" ? (
        <MapText
          at={at}
          text={l.text || pl[0].name}
          sub={l.subtext}
          size={size}
          color={auto(l.color, theme.label)}
          theme={theme}
        />
      ) : (
        <Pin
          at={at}
          label={l.text === "" ? pl[0].name : l.text}
          sublabel={l.subtext}
          variant={l.pinVariant}
          labelSide={String(l.anchor ?? "").includes("left") ? "left" : l.anchor === "top" ? "top" : "right"}
          size={size}
          color={auto(l.color, theme.accent)}
        />
      )}
    </MapLayerG>
  );
};

const MapText: React.FC<{
  at: LonLat;
  text: string;
  sub: string;
  size: number;
  color: string;
  theme: Theme;
}> = ({ at, text, sub, size, color, theme }) => {
  const m = useMap();
  const q = project3D(m, at);
  return (
    <g>
      <text
        x={q.x}
        y={q.y}
        textAnchor="middle"
        fill={color}
        stroke={theme.labelHalo}
        strokeWidth={size * 0.12}
        paintOrder="stroke"
        style={{
          font: `700 ${size}px ${font(theme.titleFont)}`,
          letterSpacing: size * 0.06,
        }}
      >
        {text}
      </text>
      {sub ? (
        <text
          x={q.x}
          y={q.y + size * 0.75}
          textAnchor="middle"
          fill={color}
          stroke={theme.labelHalo}
          strokeWidth={size * 0.08}
          paintOrder="stroke"
          style={{ font: `500 ${size * 0.45}px ${font(theme.labelFont)}` }}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
};

const RouteLayerC: React.FC<{ l: Layer; theme: Theme }> = ({ l, theme }) => {
  // A GPX/GeoJSON file in `media` is a custom path: the route follows it exactly (2026-11-13).
  const track = /\.(gpx|geojson|json)$/i.test(l.media.trim()) ? l.media.trim() : "";
  const trip = useTrip(l.places, l.mode, track);
  const { tr, local, dur } = useLayerTransform(l);
  const { height } = useVideoConfig();
  const lift = l.mode === "flight" ? 1 : 0;
  const coords = useMemo(() => trip?.coords ?? [], [trip]);
  const g = useRouteGeometry(coords, lift);
  if (!trip) return null;
  const prog = easeInOutCubic(clamp((local - 0.3) / Math.max(0.1, dur - 0.8)));
  const c = auto(l.color, theme.route);
  return (
    <g opacity={tr.opacity}>
      <RouteLine
        coords={coords}
        progress={prog}
        color={c}
        width={(l.size / 10) * (height / 1080)}
        style={l.routeStyle}
        lift={lift}
        geometry={g}
      />
      {prog > 0.002 && l.vehicle !== "dot" ? (
        <VehicleMarker
          coords={coords}
          progress={prog}
          type={l.vehicle}
          size={l.size * (height / 1080)}
          color={c}
          lift={lift}
          geometry={g}
        />
      ) : null}
      {/* A waypoint given only as "lat, lon" just steers the route: no pin, no label. */}
      {trip.stops.filter((s) => !/^\s*-?\d/.test(s.name)).map((s, i) => (
        <Pin
          key={i}
          at={[s.lon, s.lat]}
          label={s.name}
          variant="dot"
          size={Math.round(height * 0.045)}
          color={c}
          pulse={false}
        />
      ))}
    </g>
  );
};

const ArrowLayer: React.FC<{ l: Layer; theme: Theme }> = ({ l, theme }) => {
  const pts = usePlaces(l.places);
  const { tr, dur } = useLayerTransform(l);
  const { fps } = useVideoConfig();
  if (!pts || pts.length < 2) return null;
  return (
    <g opacity={tr.opacity}>
      <MilitaryArrow
        path={pts.map((p) => [p.lon, p.lat] as LonLat)}
        start={0}
        end={Math.round(Math.min(dur * 0.7, 2.5) * fps)}
        color={auto(l.color, theme.accent)}
        label={l.text}
        width={l.size * 0.4}
      />
    </g>
  );
};

const RegionLayer: React.FC<{ l: Layer; borders: ComposerProps["borders"] }> = ({ l, borders }) => {
  const spec = useMemo(
    () =>
      regionMediaDefaults({
        target: l.places[0] ?? "",
        targets: l.places,
        disabledTargets: l.disabledPlaces,
        mergeBorders: l.mergeBorders,
        level: l.level,
        radiusKm: l.radiusKm,
        media: l.media || "flag",
        wave: l.wave,
        label: l.text,
        outline: l.color === "auto" ? "#ffffff" : l.color,
      }),
    [l],
  );
  const shapes = useAreaShapes([spec], borders);
  const { tr } = useLayerTransform(l);
  const { height } = useVideoConfig();
  if (!shapes || !shapes[0] || !l.places.some((p) => p.trim())) return null;
  const u = height / 1080;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        translate: `${tr.x * u}px ${tr.y * u}px`,
        scale: String(tr.scale),
        rotate: `${tr.rotate}deg`,
      }}
    >
      <RegionFill spec={spec} shape={shapes[0]} alpha={tr.opacity} />
    </div>
  );
};

/**
 * Break-out piece (2026-11-13, user: "break India from Asia and add wherever I want, this type of
 * animation used in history explanations"): the country/state lifts off the map as a solid piece with
 * a shadow, then moves with ordinary x/y/scale/rotate keyframes (drag it on the preview, Rec to key).
 * Fill: map colours, its flag, a specific flag ("flag:jp"), a photo, or a flat colour.
 */
const CutoutLayer: React.FC<{ l: Layer; theme: Theme; borders: ComposerProps["borders"] }> = ({ l, theme, borders }) => {
  const m = useMap();
  const { tr, local } = useLayerTransform(l);
  const { height } = useVideoConfig();
  const shapes = useAreaShapes(
    l.places.some((p) => p.trim())
      ? [{ target: l.places[0] ?? "", targets: l.places, disabledTargets: l.disabledPlaces, mergeBorders: l.mergeBorders, level: l.level, radiusKm: l.radiusKm }]
      : [],
    borders,
  );
  const shape = shapes?.[0];
  const geo = useMemo(() => {
    if (!shape) return null;
    const path = geoPath(m.projection);
    const d = path(shape.feature as never) ?? "";
    const [cx, cy] = path.centroid(shape.feature as never);
    const [[x0, y0], [x1, y1]] = path.bounds(shape.feature as never);
    return { d, cx: isFinite(cx) ? cx : (x0 + x1) / 2, cy: isFinite(cy) ? cy : (y0 + y1) / 2, x0, y0, x1, y1 };
  }, [m.projection, shape]);
  if (!shape || !geo || !geo.d || !isFinite(geo.x0)) return null;
  const u = height / 1080;
  // break-out intro: the piece lifts off over the first 0.8 s (shadow grows, slight rise and swell)
  const a = easeOutCubic(clamp(local / 0.8));
  const swell = 1 + 0.05 * a;
  const media = l.media.trim();
  const iso2 =
    "properties" in shape.feature && shape.feature.properties
      ? String((shape.feature.properties as { iso2?: string }).iso2 ?? "").toLowerCase()
      : shape.feature.type === "FeatureCollection" && shape.feature.features[0]?.properties
        ? String((shape.feature.features[0].properties as { iso2?: string }).iso2 ?? "").toLowerCase()
        : "";
  const flagCode = media === "flag" ? iso2 : media.startsWith("flag:") ? media.slice(5).trim().toLowerCase() : "";
  const src = flagCode ? staticFile(`flags/${flagCode}.svg`) : media && !isVideoFile(media) ? resolveMedia(media) : "";
  const fill = l.color === "auto" ? theme.land : l.color;
  const outline = l.color === "auto" ? "#ffffff" : l.color;
  const clipId = `cutout-${l.uid ?? "x"}`;
  const bw = Math.max(2, geo.x1 - geo.x0);
  const bh = Math.max(2, geo.y1 - geo.y0);
  const label = l.text === "auto" ? shape.name : l.text;
  const fs = Math.max(14, Math.min(height * 0.034, bw * 0.16));
  return (
    <svg width={m.width} height={m.height} style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", opacity: tr.opacity * a }}>
      <g
        transform={`translate(${tr.x * u},${tr.y * u - 6 * a * u}) translate(${geo.cx},${geo.cy}) rotate(${tr.rotate}) scale(${tr.scale * swell}) translate(${-geo.cx},${-geo.cy})`}
        style={{ filter: `drop-shadow(0 ${12 * a * u}px ${26 * a * u}px rgba(0,0,0,${0.55 * a})) drop-shadow(0 ${3 * a * u}px ${6 * a * u}px rgba(0,0,0,${0.4 * a}))` }}
      >
        <path d={geo.d} fill={fill} fillRule="evenodd" />
        {src ? (
          <>
            <defs>
              <clipPath id={clipId}>
                <path d={geo.d} fillRule="evenodd" />
              </clipPath>
            </defs>
            <image href={src} x={geo.x0} y={geo.y0} width={bw} height={bh} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
          </>
        ) : null}
        <path d={geo.d} fill="none" stroke={outline} strokeWidth={2.4 * u} strokeLinejoin="round" fillRule="evenodd" />
        {label ? (
          <text
            x={geo.cx}
            y={geo.cy}
            textAnchor="middle"
            fill="#ffffff"
            stroke="rgba(10,12,16,0.85)"
            strokeWidth={fs * 0.16}
            paintOrder="stroke"
            style={{ font: `700 ${fs}px ${font(theme.titleFont)}`, letterSpacing: fs * 0.05 }}
          >
            {label}
          </text>
        ) : null}
      </g>
    </svg>
  );
};

/* ---------------- screen layers ---------------- */

const FlagLayer: React.FC<{ l: Layer }> = ({ l }) => {
  const { height } = useVideoConfig();
  const shapes = useAreaShapes(
    l.media.startsWith("flag:")
      ? []
      : [{ target: l.places[0] ?? "India", level: "country", radiusKm: 0 }],
  );
  const code = l.media.startsWith("flag:")
    ? l.media.slice(5)
    : shapes?.[0] && "properties" in shapes[0].feature
      ? String((shapes[0].feature.properties as { iso2?: string })?.iso2 ?? "")
      : "";
  if (!code) return null;
  const w = l.size * (height / 1080);
  return (
    <ScreenLayer l={l}>
      <div style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.45))" }}>
        <WavingFlag
          src={staticFile(`flags/${code.toLowerCase()}.svg`)}
          width={w}
          height={w * 0.75}
          wave={l.wave}
        />
      </div>
    </ScreenLayer>
  );
};

const CardLayer: React.FC<{ l: Layer; theme: Theme }> = ({ l, theme }) => {
  const pl = usePlaces(l.places.slice(0, 1));
  const { fps } = useVideoConfig();
  const { tr } = useLayerTransform(l);
  if (!pl || !pl[0]) return null;
  const pos =
    l.anchor === "center"
      ? "center"
      : l.anchor === "top-left"
        ? "top-left"
        : l.anchor === "bottom-right"
          ? "bottom-right"
          : "bottom-left";
  return (
    <TransformFill tr={l.keys.length ? tr : IDENTITY}>
      <LocationCard
        name={l.text || pl[0].name}
        subtitle={l.subtext || placeSubtitle(pl[0])}
        lat={pl[0].lat}
        lon={pl[0].lon}
        start={0}
        duration={Math.round((l.endSec - l.startSec) * fps)}
        cardStyle={l.cardStyle}
        position={pos}
        accent={auto(l.color, theme.accent)}
      />
    </TransformFill>
  );
};

const HudLayer: React.FC<{ l: Layer }> = ({ l }) => {
  const trip = useTrip(
    l.places.length === 1 ? [l.places[0], l.places[0]] : l.places,
    l.mode,
    "",
  );
  const { local, dur, tr } = useLayerTransform(l);
  if (!trip) return null;
  const t = clamp(local / dur);
  const head = trip.path.at(t);
  return (
    <TransformFill tr={tr}>
      <Hud
        style="drone"
        color={l.color === "auto" ? "#7CFFB2" : l.color}
        data={{
          lat: head[1],
          lon: head[0],
          altitudeM: l.value || undefined,
          headingDeg:
            trip.path.lengthKm > 0.01
              ? trip.path.bearingAt(Math.min(0.999, Math.max(0.001, t)))
              : undefined,
          title: l.text,
        }}
      />
    </TransformFill>
  );
};

const CounterLayer: React.FC<{ l: Layer; theme: Theme }> = ({ l, theme }) => {
  const { local, dur, tr } = useLayerTransform(l);
  const v =
    l.value * ease("ease-out", clamp(local / Math.max(0.1, Math.min(dur, 2))));
  const corner =
    l.anchor === "top-left"
      ? "top-left"
      : l.anchor === "bottom-right"
        ? "bottom-right"
        : "top-right";
  return (
    <TransformFill tr={tr}>
      <Counter
        value={v}
        label={l.text}
        theme={theme}
        corner={corner}
        format={(x) =>
          l.subtext === "km"
            ? formatKm(x)
            : `${Math.round(x).toLocaleString("en-IN")}${l.subtext ? ` ${l.subtext}` : ""}`
        }
      />
    </TransformFill>
  );
};

/** Plays a whole template (FlightPath, MapHighlights, ...) for the layer's duration. */
const SceneLayer: React.FC<{
  l: Layer;
  format: ComposerProps["format"];
  plan?: FxPlan | null;
  alpha?: number;
}> = ({ l, format, plan, alpha = 1 }) => {
  const { tr, dur, local } = useLayerTransform(l);
  const { fps } = useVideoConfig();
  const def = l.scene ? getScene(l.scene) : undefined;
  if (!def) return null;
  const C = def.component;
  const base = l.keys.length ? tr : IDENTITY;
  const body = (
    <C
      {...def.defaultProps}
      {...(l.sceneProps ?? {})}
      format={format}
      durationSec={plan ? plan.content : dur}
    />
  );
  return (
    <TransformFill tr={{ ...base, opacity: base.opacity * alpha }}>
      {plan ? (
        // effects attached to this scene pause / re-time it
        <Freeze frame={Math.round(warp(plan, l.startSec + local) * fps)}>{body}</Freeze>
      ) : (
        body
      )}
    </TransformFill>
  );
};

/** True while a scene layer fills the whole frame, so the map underneath need not be drawn. */
const sceneCovers = (layers: Layer[], t: number) =>
  layers.some((l) => {
    if (
      l.type !== "scene" ||
      l.hidden ||
      !l.scene ||
      t < l.startSec ||
      t >= l.endSec
    )
      return false;
    if (!l.keys.length) return true;
    const tr = evaluate(l.keys, t - l.startSec, l.endSec - l.startSec);
    return (
      tr.opacity >= 0.999 &&
      tr.scale >= 1 &&
      Math.abs(tr.x) < 0.5 &&
      Math.abs(tr.y) < 0.5 &&
      Math.abs(tr.rotate % 360) < 0.01
    );
  });

/* ---------------- camera ---------------- */

function cameraFrom(
  keys: CamKey[],
  resolved: (q: string) => LonLat | null,
  frame: number,
  fps: number,
  kind: ComposerProps["projection"],
): Camera | null {
  const ks = keys
    .map((k) => ({ k, at: resolved(k.place) }))
    .filter((x) => x.at)
    .sort((a, b) => a.k.t - b.k.t);
  if (!ks.length) return null;
  const toCam = (x: (typeof ks)[number]) =>
    cam(x.at![0], x.at![1], x.k.zoom, x.k.bearing, x.k.pitch);
  const t = frame / fps;
  if (t <= ks[0].k.t) return toCam(ks[0]);
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i].k.t) {
      const a = toCam(ks[i - 1]);
      const b = toCam(ks[i]);
      const raw =
        (t - ks[i - 1].k.t) / Math.max(1e-6, ks[i].k.t - ks[i - 1].k.t);
      const e = ease(ks[i].k.ease, raw);
      switch (ks[i].k.move) {
        case "cut":
          return raw < 1 ? a : b;
        case "fly":
          return flyTo(a, b, e, kind);
        default:
          return mixCamera(a, b, e);
      }
    }
  }
  return toCam(ks[ks.length - 1]);
}

/* ---------------- composer ---------------- */

const ComposerInner: React.FC<ComposerProps> = (props) => {
  const p = useMemo(() => {
    // Timeline groups with a combined Group Master layer (or multiple area members in the same group):
    // Combine all active member layers' places into the Group Master layer so one unified flag/highlight covers
    // the entire group, while any child layer with custom settings (different style/color/media/type) still renders on top!
    const byGroup = new Map<string, Layer[]>();
    for (const l of props.layers) {
      const g = l.group?.trim();
      if (g && !l.attachTo) {
        const arr = byGroup.get(g) ?? [];
        arr.push(l);
        byGroup.set(g, arr);
      }
    }
    const outLayers: Layer[] = [];
    const processedGroups = new Set<string>();
    const isArea = (ty: Layer["type"]) => ty === "highlight" || ty === "region-media" || ty === "cutout";
    const norm = (s: string) => s.trim().toLowerCase();

    for (const l of props.layers) {
      const g = l.group?.trim();
      if (!g || l.attachTo) {
        if (!l.hidden) outLayers.push(l);
        continue;
      }
      const members = byGroup.get(g) ?? [];
      const master = members.find((m) => m.isGroupMaster) ?? (members.length > 1 && members.every((m) => isArea(m.type)) ? members[0] : null);
      if (!master) {
        if (!l.hidden) outLayers.push(l);
        continue;
      }
      if (master.hidden) continue;

      const children = members.filter((m) => m !== master);
      // Child layers that match the master's visual look and timing are absorbed into the combined master shape (so one flag/highlight spans all of them)
      // Child layers that the user customized (different type, style, color, media, timing, keyframes, or attached effects) are drawn individually!
      const hasAttachedFx = (c: Layer) => Boolean(c.uid && props.layers.some((f) => f.attachTo === c.uid && !f.hidden));
      const matchesMaster = (c: Layer) =>
        isArea(c.type) &&
        isArea(master.type) &&
        c.type === master.type &&
        c.highlightStyle === master.highlightStyle &&
        c.color === master.color &&
        c.media === master.media &&
        c.wave === master.wave &&
        Math.abs(c.startSec - master.startSec) < 0.02 &&
        Math.abs(c.endSec - master.endSec) < 0.02 &&
        c.keys.length === 0 &&
        !hasAttachedFx(c);

      if (l === master) {
        if (processedGroups.has(g)) continue;
        processedGroups.add(g);
        if (children.length > 0 && isArea(master.type)) {
          const allPlaces: string[] = [];
          const disabledSet = new Set<string>((master.disabledPlaces ?? []).map(norm));
          for (const pl of master.places) if (pl.trim() && !allPlaces.some((x) => norm(x) === norm(pl))) allPlaces.push(pl.trim());
          for (const c of children) {
            for (const pl of c.places) {
              if (!pl.trim()) continue;
              if (!allPlaces.some((x) => norm(x) === norm(pl))) allPlaces.push(pl.trim());
              // If the child is hidden OR has custom overrides of its own, exclude its area from the master's combined fill
              if (c.hidden || !matchesMaster(c) || (c.disabledPlaces ?? []).some((d) => norm(d) === norm(pl))) {
                disabledSet.add(norm(pl));
              } else {
                disabledSet.delete(norm(pl));
              }
            }
          }
          outLayers.push({
            ...master,
            places: allPlaces,
            disabledPlaces: allPlaces.filter((pl) => disabledSet.has(norm(pl))),
            mergeBorders: master.mergeBorders ?? true,
          });
        } else {
          outLayers.push(master);
        }
      } else {
        // Child layer in a group with a master: only draw individually if it is visible AND has custom overrides!
        if (!l.hidden && !matchesMaster(l)) {
          outLayers.push(l);
        }
      }
    }
    return { ...props, layers: outLayers };
  }, [props]);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = THEMES[p.theme];
  const t = frame / fps;
  // ---- effects attached to a main layer (see effects.ts) ----
  const live = (l: Layer) =>
    isEffect(l) &&
    (l.attachTo === CAMERA_MAIN ||
      p.layers.some((m) => m.uid === l.attachTo && !isEffect(m)));
  const hostOf = (l: Layer) => p.layers.find((m) => m.uid === l.attachTo);
  /** Attached to a scene: drawn in its own map insert over the paused scene. */
  const onScene = (l: Layer) => live(l) && l.attachTo !== CAMERA_MAIN && hostOf(l)?.type === "scene";
  /**
   * Attached to an ordinary layer (2026-10-31): a modifier. For its duration it replaces that layer (e.g. the India
   * highlight becomes Bihar), with its own in/out; the project camera keeps running unless the effect has a camera.
   */
  const isMod = (l: Layer) => live(l) && l.attachTo !== CAMERA_MAIN && hostOf(l)?.type !== "scene";
  const modAlpha = (l: Layer) => fxAlpha(l.fx!, l.startSec, l.endSec, t, easeInOutCubic);
  const mulOf = (l: Layer) => {
    if (isMod(l)) return modAlpha(l);
    if (!l.uid) return 1;
    let m = 0;
    // "overlay" effects (2026-11-13) draw on top: the main layer keeps playing at full strength
    for (const f of p.layers) if (f.attachTo === l.uid && isMod(f) && f.fx!.blend !== "overlay") m = Math.max(m, modAlpha(f));
    return 1 - m;
  };
  const fxList = p.layers.filter(live);
  // area effects (highlight / region fill) frame the real shape of the area: works for states too, zoom included
  const fxAreaLayers = fxList.filter(
    (l) => (l.type === "highlight" || l.type === "region-media" || l.type === "cutout") && l.places.some((x) => x.trim()) && !l.fx!.camPlace,
  );
  const fxShapes = useAreaShapes(
    fxAreaLayers.map((l) => ({
      target: l.places[0] ?? "",
      targets: l.places,
      disabledTargets: l.disabledPlaces,
      mergeBorders: l.mergeBorders,
      level: l.level,
      radiusKm: l.radiusKm,
    })),
    p.borders,
  );
  const fxFit = (l: Layer): Camera | null => {
    const sh = fxShapes?.[fxAreaLayers.indexOf(l)];
    return sh ? fitCamera(p.projection, shapePoints(sh.feature), width, height, 0.22) : null;
  };
  const fxKeys = fxList.map((l) => {
    const f = l.fx!;
    const id = f.camera === "none" ? (onScene(l) ? "locked" : null) : f.camera;
    if (!id) return null;
    const mid = l.type === "route" || l.type === "arrow" ? Math.floor((l.places.length - 1) / 2) : 0;
    const fit = fxFit(l);
    // area effects frame their real shape; until it has loaded, don't send a state name to the gazetteer
    if (fxAreaLayers.includes(l) && !fit) return null;
    const place = f.camPlace || (fit ? `${fit.lat.toFixed(4)}, ${fit.lon.toFixed(4)}` : l.places[mid] || l.places[0] || "India");
    return presetKeys(id, {
      a: place,
      b: place,
      zoom: f.camZoom > -5 ? f.camZoom : fit ? fit.zoom : autoZoom(l.level === "continent" ? "country" : l.level, l.type),
      dur: Math.max(0.1, l.endSec - l.startSec),
      strength: f.camStrength,
    });
  });
  const fxPlaceNames = [
    ...new Set(
      fxKeys
        .flatMap((k) => (k ? k.map((x) => x.place) : []))
        .filter((n) => n.trim() && !parseCoords(n)),
    ),
  ];
  const fxPlaces = usePlaces(fxPlaceNames);
  const fxLookup = (q: string) => {
    const coords = parseCoords(q);
    if (coords) return coords;
    const i = fxPlaceNames.indexOf(q);
    const pl = i >= 0 ? fxPlaces?.[i] : undefined;
    return pl ? ([pl.lon, pl.lat] as LonLat) : null;
  };
  const fxCamera = (l: Layer): Camera | null => {
    const keys = fxKeys[fxList.indexOf(l)];
    if (!keys || (!fxPlaces && fxPlaceNames.length > 0)) return null;
    return cameraFrom(keys as CamKey[], fxLookup, (t - l.startSec) * fps, fps, p.projection);
  };
  const camNamedPlaces = useMemo(
    () => [...new Set(p.camera.map((c) => c.place).filter((q) => q.trim() && !parseCoords(q)))],
    [p.camera],
  );
  const camPlaces = usePlaces(camNamedPlaces);
  const allMapPlaces = useMemo(
    () =>
      p.layers
        .filter((l) =>
          ["pin", "radar", "callout", "map-label", "route", "arrow"].includes(
            l.type,
          ),
        )
        .flatMap((l) => l.places),
    [p.layers],
  );
  const fitPlaces = usePlaces(p.camera.length ? [] : allMapPlaces);
  const areaQueries = useMemo(
    () =>
      p.camera.length
        ? []
        : p.layers
            .filter((l) => l.type === "highlight" || l.type === "region-media" || l.type === "cutout")
            .map((l) => ({
              target: l.places[0] ?? "",
              targets: l.places,
              disabledTargets: l.disabledPlaces,
              mergeBorders: l.mergeBorders,
              level: l.level,
              radiusKm: l.radiusKm,
            })),
    [p.camera.length, p.layers],
  );
  const areaShapes = useAreaShapes(areaQueries, p.borders);
  const specs = useMemo(
    () =>
      p.layers
        .filter((l) => l.type === "highlight" && l.places.some((x) => x.trim()))
        .map((l) =>
          highlightDefaults({
            target: l.places[0] ?? "",
            targets: l.places,
            disabledTargets: l.disabledPlaces,
            mergeBorders: l.mergeBorders,
            level: l.level,
            radiusKm: l.radiusKm,
            style: l.highlightStyle,
            color: l.color,
            startSec: l.startSec,
            endSec: l.endSec,
            label: l.text || "",
            sublabel: l.subtext,
          }),
        ),
    [p.layers],
  );
  const hlLayers = useMemo(
    () => p.layers.filter((l) => l.type === "highlight" && l.places.some((x) => x.trim())),
    [p.layers],
  );
  const areasRaw = useAreaHighlights(specs, frame, fps, theme, p.borders);
  const areas = areasRaw.map((a, i) => {
    const l = hlLayers[i];
    const tr = evaluate(
      l.keys,
      (frame - l.startSec * fps) / fps,
      l.endSec - l.startSec,
      0.001,
    );
    return { ...a, alpha: (l.keys.length ? tr.opacity : 1) * mulOf(l) };
  });
  // Also resolve internal borders for active region-media and cutout layers that have mergeBorders enabled
  const mergeMediaLayers = useMemo(
    () =>
      p.layers.filter(
        (l) =>
          (l.type === "region-media" || l.type === "cutout") &&
          l.mergeBorders &&
          l.places.filter((x) => x.trim()).length > 1 &&
          t >= l.startSec &&
          t <= l.endSec,
      ),
    [p.layers, t],
  );
  const mergeMediaShapes = useAreaShapes(
    mergeMediaLayers.map((l) => ({
      target: l.places[0] ?? "",
      targets: l.places,
      disabledTargets: l.disabledPlaces,
      mergeBorders: true,
      level: l.level,
      radiusKm: l.radiusKm,
    })),
    p.borders,
  );
  const extraMergedBorders = useMemo(
    () => (mergeMediaShapes ?? []).map((s) => s.internalBorders).filter((b): b is NonNullable<typeof b> => Boolean(b)),
    [mergeMediaShapes],
  );

  const fallback = useMemo<Camera>(() => {
    const pts: LonLat[] = [
      ...(fitPlaces ?? []).map((x) => [x.lon, x.lat] as LonLat),
      ...(areaShapes ?? []).flatMap((s) => shapePoints(s.feature)),
    ];
    return pts.length
      ? fitCamera(p.projection, pts, width, height, 0.15)
      : cam(78, 22, 1.5);
  }, [fitPlaces, areaShapes, p.projection, width, height]);

  const lookup = (q: string) => {
    const coords = parseCoords(q);
    if (coords) return coords;
    const i = camNamedPlaces.indexOf(q);
    const pl = i >= 0 ? camPlaces?.[i] : undefined;
    return pl ? ([pl.lon, pl.lat] as LonLat) : null;
  };
  // the project camera is a main layer too: attached effects pause / re-time it
  const camPlan = planFor(p.layers, CAMERA_MAIN, p.durationSec, p.cameraContentSec);
  const camT = camPlan && (camPlan.holds.length || p.cameraContentSec) ? warp(camPlan, t) : t;
  const allCamCoords = p.camera.length > 0 && camNamedPlaces.length === 0;
  let camera =
    ((camPlaces || allCamCoords) && cameraFrom(p.camera, lookup, camT * fps, fps, p.projection)) ||
    fallback;
  for (const l of fxList) {
    if (onScene(l) || t < l.startSec || t > l.endSec) continue;
    const c = fxCamera(l);
    if (c) camera = mixCamera(camera, c, fxAlpha(l.fx!, l.startSec, l.endSec, t, easeInOutCubic));
  }
  const sun = p.dayNight
    ? subsolarPoint(new Date(p.dateTimeUtc || "2025-06-21T06:00:00Z"))
    : null;
  const seq = (l: Layer, i: number, child: React.ReactNode) => (
    <Sequence
      key={i}
      from={Math.round(l.startSec * fps)}
      durationInFrames={Math.max(1, Math.round((l.endSec - l.startSec) * fps))}
      name={l.name || l.type}
      layout="none"
    >
      {child}
    </Sequence>
  );
  const svgTypes = ["route", "pin", "radar", "callout", "arrow", "map-label"];
  const covered = sceneCovers(p.layers, frame / fps);
  const baseAreas = areas.filter((_, i) => !onScene(hlLayers[i]));
  const L = p.layers.map((l) => {
    const m = mulOf(l);
    return m === 1 ? l : { ...l, fxMul: m };
  });
  const mapChildren = (keep: (l: Layer) => boolean) => (
    <>
      {L.map((l, i) =>
        l.type === "region-media" && keep(l) ? seq(l, i, <RegionLayer l={l} borders={p.borders} />) : null,
      )}
      <MapOverlay>
        {L.map((l, i) =>
          svgTypes.includes(l.type) && keep(l)
            ? seq(
                l,
                i,
                l.type === "route" ? (
                  <RouteLayerC l={l} theme={theme} />
                ) : l.type === "arrow" ? (
                  <ArrowLayer l={l} theme={theme} />
                ) : (
                  <PinLayer l={l} theme={theme} />
                ),
              )
            : null,
        )}
      </MapOverlay>
      {L.map((l, i) =>
        l.type === "cutout" && keep(l) ? seq(l, i, <CutoutLayer l={l} theme={theme} borders={p.borders} />) : null,
      )}
    </>
  );
  const mapLayerFlags = {
    countryLabels: p.mapLayers.countryLabels,
    states: p.mapLayers.states ? ("all" as const) : undefined,
    roads: p.mapLayers.roads,
    rail: p.mapLayers.rail,
    rivers: p.mapLayers.rivers,
    lakes: p.mapLayers.rivers,
    graticule: p.mapLayers.graticule,
  };
  // map inserts: for each scene with active map effects, a map with the effect's cinematic camera over the paused scene
  const inserts = [...new Set(fxList.filter((l) => onScene(l) && MAP_TYPES.includes(l.type)).map((l) => l.attachTo!))]
    .map((mainId) => {
      const active = fxList.filter(
        (l) => l.attachTo === mainId && MAP_TYPES.includes(l.type) && t >= l.startSec && t <= l.endSec,
      );
      if (!active.length) return null;
      const alpha = Math.max(...active.map((l) => fxAlpha(l.fx!, l.startSec, l.endSec, t, easeInOutCubic)));
      const lead = active[0];
      const c = fxCamera(lead) ?? fallback;
      const main = p.layers.find((m) => m.uid === mainId);
      const sceneTheme = (main?.sceneProps as { theme?: string } | undefined)?.theme;
      const th = sceneTheme && sceneTheme in THEMES ? THEMES[sceneTheme as keyof typeof THEMES] : theme;
      const zoomIn = lead.fx!.transIn === "zoom" || lead.fx!.transOut === "zoom";
      const ids = new Set(active.map((l) => l.uid));
      return (
        <AbsoluteFill
          key={`fx-${mainId}`}
          style={{ opacity: alpha, scale: zoomIn ? String(1.08 - 0.08 * alpha) : undefined }}
        >
          <MapView
            kind={p.projection}
            camera={c}
            theme={th}
            borderView={p.borders}
            sun={sun}
            areas={areas.filter((_, i) => ids.has(hlLayers[i].uid))}
            mergedBorders={extraMergedBorders}
            layers={mapLayerFlags}
          >
            {mapChildren((l) => ids.has(l.uid))}
          </MapView>
          <Finish theme={th} />
        </AbsoluteFill>
      );
    })
    .filter(Boolean);
  return (
    <AbsoluteFill>
      {covered ? null : (
        <MapView
          kind={p.projection}
          camera={camera}
          theme={theme}
          borderView={p.borders}
          sun={sun}
          areas={baseAreas}
          mergedBorders={extraMergedBorders}
          layers={mapLayerFlags}
        >
          {mapChildren((l) => !onScene(l))}
        </MapView>
      )}
      {covered ? null : <Finish theme={theme} />}
      {[
        ...L.map((l, i) => ({ l, i })).filter(({ l }) => !live(l)),
        { l: null as Layer | null, i: -1 },
        ...L.map((l, i) => ({ l, i })).filter(({ l }) => live(l)),
      ].map(({ l, i }) => {
        // order: main layers, then map inserts for scene effects, then effect layers on top
        if (!l) return <React.Fragment key="fx-inserts">{inserts}</React.Fragment>;
        if (onScene(l) && MAP_TYPES.includes(l.type)) return null; // drawn in the insert
        if (l.type === "highlight") return seq(l, i, null);
        if (l.type === "text")
          return seq(
            l,
            i,
            <ScreenLayer l={l}>
              <div
                style={{
                  font: `700 ${l.size * (height / 1080)}px ${font(theme.titleFont)}`,
                  color: auto(l.color, "#ffffff"),
                  textShadow: "0 6px 28px rgba(0,0,0,0.55)",
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                }}
              >
                {l.text}
                {l.subtext ? (
                  <div
                    style={{
                      font: `500 ${l.size * 0.42 * (height / 1080)}px ${font(theme.labelFont)}`,
                      opacity: 0.9,
                      marginTop: 8,
                    }}
                  >
                    {l.subtext}
                  </div>
                ) : null}
              </div>
            </ScreenLayer>,
          );
        if (l.type === "image" || l.type === "video")
          return seq(
            l,
            i,
            <ScreenLayer l={l}>
              {l.media ? (
                isVideoFile(l.media) || l.type === "video" ? (
                  <Video
                    src={resolveMedia(l.media)}
                    muted
                    style={{
                      width: l.size * (height / 1080),
                      borderRadius: 12,
                      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                    }}
                  />
                ) : (
                  <Img
                    src={resolveMedia(l.media)}
                    style={{
                      width: l.size * (height / 1080),
                      borderRadius: 12,
                      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                    }}
                  />
                )
              ) : null}
            </ScreenLayer>,
          );
        if (l.type === "flag") return seq(l, i, <FlagLayer l={l} />);
        if (l.type === "location-card")
          return seq(l, i, <CardLayer l={l} theme={theme} />);
        if (l.type === "counter")
          return seq(l, i, <CounterLayer l={l} theme={theme} />);
        if (l.type === "hud") return seq(l, i, <HudLayer l={l} />);
        if (l.type === "scene") {
          const attached = l.uid ? p.layers.some((f) => f.attachTo === l.uid && live(f)) : false;
          const plan = l.uid && (attached || l.contentSec) ? planFor(p.layers, l.uid, p.durationSec) : null;
          const alpha = live(l) && !isMod(l) ? fxAlpha(l.fx!, l.startSec, l.endSec, t, easeInOutCubic) : 1;
          return seq(l, i, <SceneLayer l={l} format={p.format} plan={plan} alpha={alpha} />);
        }
        if (l.type === "sfx" && l.media) {
          const named = (SFX as readonly string[]).includes(l.media);
          return seq(
            l,
            i,
            <Sfx
              name={named ? (l.media as (typeof SFX)[number]) : undefined}
              src={named ? undefined : l.media}
              at={0}
              volume={l.value || p.sfxVolume}
              enabled={p.sfx}
            />,
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};

/** Loads an optional project JSON (for automation) and merges it over the Studio props. */
export const MapComposer: React.FC<ComposerProps> = (p) => {
  const file = useAsset<Partial<ComposerProps>>(
    p.projectFile ? `project:${p.projectFile}` : null,
    () => fetchJson(p.projectFile),
  );
  if (p.projectFile && !file)
    return <AbsoluteFill style={{ background: "#000" }} />;
  const merged: ComposerProps = file
    ? {
        ...p,
        ...file,
        layers: (file.layers ?? p.layers).map((l) => layerDefaults(l as Layer)),
        camera: file.camera ?? p.camera,
      }
    : p;
  return <ComposerInner {...merged} />;
};

/** Frame size and duration, taking them from the project file when one is set. */
export const composerMetadata = async ({ props }: { props: ComposerProps }) => {
  let p = props;
  if (props.projectFile) {
    const res = await fetch(staticFile(props.projectFile));
    if (res.ok)
      p = { ...props, ...((await res.json()) as Partial<ComposerProps>) };
  }
  return sizeFromProps({ props: p });
};
