import { FORMATS } from "../src/lib/schema";
import { evaluate, IDENTITY, type Key, type Transform } from "../src/lib/keyframes";
import { TEMPLATE_BY_ID, type TemplateDef } from "../src/registry";
import { composerSchema, layerDefaults, type CamKey, type ComposerProps, type Layer, type LAYER_TYPES } from "../src/scenes/composer/MapComposer";
import { CAMERA_MAIN, fxDefaults, isEffect } from "../src/scenes/composer/effects";
import { presetKeys, type PresetKey } from "../src/lib/cinematic";

export const FPS = 30;

export type LayerType = (typeof LAYER_TYPES)[number];
export type Project = ComposerProps & { name: string };
export type { Layer, CamKey, Key, Transform };
export type Group = "map" | "screen" | "audio" | "scene";

export type FieldId =
  | "place"
  | "places"
  | "areaGroup"
  | "level"
  | "radiusKm"
  | "highlightStyle"
  | "routeStyle"
  | "mode"
  | "vehicle"
  | "cardStyle"
  | "pinVariant"
  | "color"
  | "text"
  | "subtext"
  | "media"
  | "wave"
  | "value"
  | "anchor"
  | "size";

type Meta = {
  label: string;
  desc: string;
  group: Group;
  /** Fields the inspector shows, with an optional label of their own for this type. */
  fields: [FieldId, string?, string?][];
  defaults: Partial<Layer>;
  dur: number;
  /** Dragging on the preview moves it (x/y keyframes do something visible). */
  movable: boolean;
};

export const LAYER_META: Record<LayerType, Meta> = {
  highlight: {
    label: "Highlight area",
    desc: "Glow, outline, pulse… on a country, state, continent or grouped regions",
    group: "map",
    fields: [["areaGroup", "Area / Region Group", "Pick one area or group multiple regions (countries, states, continents); Ctrl+Click on preview to select/group"], ["level"], ["radiusKm"], ["highlightStyle", "Style"], ["color"], ["text", "Label", '"auto" = area/group name, empty = no label'], ["subtext", "Second line"]],
    defaults: { places: ["India"], highlightStyle: "glow", text: "auto" },
    dur: 4,
    movable: false,
  },
  "region-media": {
    label: "Flag / photo / video in area",
    desc: "Fills a country, state or combined region group (e.g. USSR) with one waving flag or media",
    group: "map",
    fields: [["areaGroup", "Area / Region Group", "Pick one area or combine multiple regions into a group (e.g. USSR, Korea, Pakistan)"], ["level"], ["radiusKm"], ["media", "Fill with"], ["wave", "Waving flag"], ["color", "Outline colour"], ["text", "Label"]],
    defaults: { places: ["India"], media: "flag", level: "auto" },
    dur: 4,
    movable: true,
  },
  cutout: {
    label: "Break-out piece",
    desc: "Country, state or region group lifts off the map; drag it anywhere",
    group: "map",
    fields: [
      ["areaGroup", "Area / Region Group"],
      ["level"],
      ["media", "Fill with", "Empty = map colours; or its flag, a specific flag, or a photo"],
      ["color", "Colour", '"auto" = map land colour with a white outline'],
      ["text", "Label", '"auto" = area/group name, empty = no label'],
    ],
    defaults: { places: ["India"], media: "", text: "auto" },
    dur: 6,
    movable: true,
  },
  route: {
    label: "Route",
    desc: "Road, rail, flight or sea path that draws on",
    group: "map",
    fields: [
      ["places", "Stops"],
      ["mode", "Travel by"],
      ["vehicle"],
      ["routeStyle", "Line style"],
      ["color"],
      ["size", "Vehicle size"],
      ["media", "Custom path (GPX/GeoJSON file)", "Optional: the route follows your own drawn/recorded path exactly, instead of routing between the stops"],
    ],
    defaults: { places: ["Delhi", "Jaipur", "Mumbai"], mode: "road", vehicle: "car", routeStyle: "glow", size: 60 },
    dur: 6,
    movable: false,
  },
  pin: {
    label: "Pin",
    desc: "Map pin, dot, target or flag marker",
    group: "map",
    fields: [["place"], ["pinVariant", "Marker"], ["text", "Label", "Empty = place name"], ["subtext", "Second line"], ["color"], ["size"]],
    defaults: { places: ["Mumbai"], size: 56, keys: [] },
    dur: 4,
    movable: true,
  },
  radar: {
    label: "Radar pulse",
    desc: "Pulsing target rings",
    group: "map",
    fields: [["place"], ["text", "Label"], ["color"], ["size"]],
    defaults: { places: ["Mumbai"], text: "MUMBAI", color: "#ff3b3b", size: 70 },
    dur: 4,
    movable: true,
  },
  callout: {
    label: "Callout box",
    desc: "Info box pointing at a place (can hold a photo)",
    group: "map",
    fields: [["place"], ["text", "Title"], ["subtext", "Text"], ["media", "Photo or video"], ["color"]],
    defaults: { places: ["Mumbai"], text: "Mumbai", subtext: "Financial capital of India" },
    dur: 4,
    movable: true,
  },
  arrow: {
    label: "Military arrow",
    desc: "Thick advancing arrow through points",
    group: "map",
    fields: [["places", "Points"], ["text", "Label"], ["color"], ["size", "Width"]],
    defaults: { places: ["Delhi", "Lucknow", "Patna"], color: "#ff3b3b", size: 60 },
    dur: 4,
    movable: false,
  },
  "map-label": {
    label: "Map label",
    desc: "Big lettering placed on the map",
    group: "map",
    fields: [["place"], ["text", "Text", "Empty = place name"], ["subtext", "Second line"], ["color"], ["size"]],
    defaults: { places: ["Mumbai"], size: 48 },
    dur: 4,
    movable: true,
  },
  text: {
    label: "Text",
    desc: "Title or caption on screen",
    group: "screen",
    fields: [["text", "Text"], ["subtext", "Second line"], ["anchor", "Position"], ["size"], ["color"]],
    defaults: { text: "YOUR TITLE", anchor: "center", size: 96 },
    dur: 3,
    movable: true,
  },
  "location-card": {
    label: "Location card",
    desc: "Name, region and coordinates card",
    group: "screen",
    fields: [["place"], ["text", "Name", "Empty = place name"], ["subtext", "Subtitle", "Empty = region and country"], ["cardStyle", "Style"], ["anchor", "Position"], ["color", "Accent"]],
    defaults: { places: ["Mumbai"], anchor: "bottom-left" },
    dur: 3.5,
    movable: true,
  },
  image: {
    label: "Image",
    desc: "Photo, logo or PNG on screen",
    group: "screen",
    fields: [["media", "Image"], ["anchor", "Position"], ["size", "Width"]],
    defaults: { media: "", anchor: "center", size: 900 },
    dur: 4,
    movable: true,
  },
  video: {
    label: "Video",
    desc: "Your footage on screen",
    group: "screen",
    fields: [["media", "Video"], ["anchor", "Position"], ["size", "Width"]],
    defaults: { media: "", anchor: "center", size: 1200 },
    dur: 5,
    movable: true,
  },
  flag: {
    label: "Waving flag",
    desc: "A country's flag, waving",
    group: "screen",
    fields: [["place", "Country"], ["media", "Or pick a flag"], ["wave", "Waving"], ["anchor", "Position"], ["size", "Width"]],
    defaults: { places: ["India"], anchor: "top-right", size: 200 },
    dur: 4,
    movable: true,
  },
  counter: {
    label: "Counter",
    desc: "Number that counts up",
    group: "screen",
    fields: [["value", "Count to"], ["text", "Label"], ["subtext", "Unit", '"km" formats distances'], ["anchor", "Corner"], ["color"]],
    defaults: { value: 1400, text: "DISTANCE", subtext: "km", anchor: "top-right" },
    dur: 3,
    movable: true,
  },
  hud: {
    label: "GPS HUD",
    desc: "Drone-style telemetry overlay",
    group: "screen",
    fields: [["places", "Path"], ["mode", "Travel by"], ["text", "Title"], ["value", "Altitude (m)"], ["color"]],
    defaults: { places: ["Delhi", "Mumbai"], mode: "flight", color: "auto" },
    dur: 5,
    movable: true,
  },
  sfx: {
    label: "Sound",
    desc: "Whoosh, impact, ping… or your own audio",
    group: "audio",
    fields: [["media", "Sound"], ["value", "Volume (0 = project volume)"]],
    defaults: { media: "whoosh", value: 0 },
    dur: 1.5,
    movable: false,
  },
  scene: {
    label: "Scene",
    desc: "A whole ready-made animation",
    group: "scene",
    fields: [],
    defaults: {},
    dur: 8,
    movable: true,
  },
};

export const LAYER_ORDER: LayerType[] = ["highlight", "region-media", "cutout", "route", "pin", "radar", "callout", "arrow", "map-label", "text", "location-card", "image", "video", "flag", "counter", "hud", "sfx", "scene"];

export const groupOf = (l: Layer): Group => LAYER_META[l.type].group;

export const round = (v: number, step = 1 / FPS) => Math.round(v / step) * step;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const r3 = (v: number) => Math.round(v * 1000) / 1000;

export const humanize = (id: string) => {
  const s = id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const frameSize = (p: Pick<Project, "format">) => FORMATS[p.format] ?? FORMATS["16:9 1080p"];

export const isComposerTemplate = (t: TemplateDef) => t.schema === (composerSchema as unknown);

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const composerDefaults = () => clone(TEMPLATE_BY_ID.get("MapComposer")!.defaultProps) as ComposerProps;

export const exampleProject = (): Project => ({ ...composerDefaults(), name: "Delhi to Mumbai" });

export const blankProject = (): Project => ({
  ...composerDefaults(),
  name: "Untitled map",
  durationSec: 10,
  camera: [
    { t: 0, place: "India", zoom: 2.2, bearing: 0, pitch: 0, move: "cut", ease: "linear" },
    { t: 10, place: "India", zoom: 2.5, bearing: 0, pitch: 0, move: "smooth", ease: "linear" },
  ],
  layers: [],
});

/** Template settings a scene layer stores; frame size and length come from the project and layer. */
export const sceneSettings = (t: TemplateDef) => {
  const p = clone(t.defaultProps) as Record<string, unknown>;
  delete p.format;
  delete p.durationSec;
  return p;
};

export const templateDuration = (t: TemplateDef) => Number((t.defaultProps as { durationSec?: number }).durationSec ?? 8);

export const newUid = () => Math.random().toString(36).slice(2, 10);

export const sceneLayer = (t: TemplateDef, startSec: number, dur = templateDuration(t)): Layer =>
  layerDefaults({ type: "scene", name: humanize(t.id), startSec, endSec: r3(startSec + dur), scene: t.id, sceneProps: sceneSettings(t), uid: newUid() });

export const projectFromTemplate = (t: TemplateDef): Project => {
  if (isComposerTemplate(t)) return { ...(clone(t.defaultProps) as ComposerProps), name: humanize(t.id) };
  const d = t.defaultProps as { format: Project["format"] };
  const dur = templateDuration(t);
  return { ...blankProject(), name: humanize(t.id), format: d.format, durationSec: dur, camera: [], layers: [sceneLayer(t, 0, dur)] };
};

export const newLayer = (type: LayerType, startSec: number, extra: Partial<Layer> = {}): Layer => {
  const m = LAYER_META[type];
  if (type === "scene") {
    const t = TEMPLATE_BY_ID.get(String(extra.scene ?? "FlightPath"))!;
    return { ...sceneLayer(t, startSec), ...extra };
  }
  return layerDefaults({ type, name: m.label, startSec: r3(startSec), endSec: r3(startSec + m.dur), ...clone(m.defaults), uid: newUid(), ...extra });
};

/** Makes sure every layer has every field (projects from older versions or hand-written JSON). */
export const normalizeProject = (raw: Partial<Project>): Project => {
  const base = blankProject();
  const p = { ...base, ...raw } as Project;
  p.mapLayers = { ...base.mapLayers, ...(raw.mapLayers ?? {}) };
  p.layers = (raw.layers ?? []).map((l) => {
    const x = layerDefaults(l as Layer);
    return x.uid ? x : { ...x, uid: newUid() };
  });
  p.camera = (raw.camera ?? []).map((c) => ({ ...base.camera[0], ...c }));
  p.projectFile = "";
  return p;
};

/** Props for the renderer: the project minus editor-only fields. */
export const renderProps = (p: Project): ComposerProps => {
  const { name, ...rest } = p;
  void name;
  return rest;
};

export const layerDuration = (l: Layer) => Math.max(0.05, l.endSec - l.startSec);

/** Opacity fade in and out, the same look a layer has with no keyframes. */
export const fadeKeys = (dur: number): Key[] => {
  const f = Math.min(0.35, dur / 2);
  const k = (t: number, opacity: number): Key => ({ t: r3(t), opacity, scale: 1, x: 0, y: 0, rotate: 0, ease: "ease-out" });
  return [k(0, 0), k(f, 1), k(dur - f, 1), k(dur, 0)];
};

export const transformAt = (l: Layer, local: number): Transform => {
  if (!l.keys.length) return { ...IDENTITY };
  return evaluate(l.keys, local, layerDuration(l));
};

export type Delta = { dx?: number; dy?: number; scale?: number; rotate?: number };

const applyDelta = (k: Key, d: Delta): Key => ({
  ...k,
  x: r3(k.x + (d.dx ?? 0)),
  y: r3(k.y + (d.dy ?? 0)),
  scale: r3(clamp(k.scale * (d.scale ?? 1), 0, 20)),
  rotate: r3(k.rotate + (d.rotate ?? 0)),
});

/**
 * Moves/scales/rotates a layer from a drag on the preview. With `record` on, the change becomes a
 * keyframe at the playhead (like After Effects' stopwatch); otherwise the whole layer shifts.
 */
export const nudgeLayer = (l: Layer, local: number, d: Delta, record: boolean): Key[] => {
  const dur = layerDuration(l);
  if (!record) return (l.keys.length ? l.keys : fadeKeys(dur)).map((k) => applyDelta(k, d));
  const t = r3(clamp(round(local), 0, dur));
  const i = l.keys.findIndex((k) => Math.abs(k.t - t) < 0.5 / FPS);
  if (i >= 0) return l.keys.map((k, j) => (j === i ? applyDelta(k, d) : k));
  const cur = transformAt(l, t);
  const nk = applyDelta({ t, ...cur, opacity: l.keys.length ? cur.opacity : 1, ease: "ease-in-out" }, d);
  return [...l.keys, nk].sort((a, b) => a.t - b.t);
};

export const addKeyAt = (l: Layer, local: number): { keys: Key[]; index: number } => {
  const dur = layerDuration(l);
  const t = r3(clamp(round(local), 0, dur));
  const existing = l.keys.findIndex((k) => Math.abs(k.t - t) < 0.5 / FPS);
  if (existing >= 0) return { keys: l.keys, index: existing };
  const cur = transformAt(l, t);
  const keys = [...l.keys, { t, ...cur, opacity: l.keys.length ? r3(cur.opacity) : 1, ease: "ease-in-out" as const }].sort((a, b) => a.t - b.t);
  return { keys, index: keys.findIndex((k) => k.t === t) };
};

export const splitLayer = (l: Layer, at: number): [Layer, Layer] | null => {
  if (at <= l.startSec + 0.05 || at >= l.endSec - 0.05) return null;
  const cut = r3(at - l.startSec);
  const a: Layer = { ...l, endSec: r3(at), keys: l.keys.filter((k) => k.t <= cut) };
  const b: Layer = { ...l, name: `${l.name} (2)`, startSec: r3(at), keys: l.keys.filter((k) => k.t >= cut).map((k) => ({ ...k, t: r3(k.t - cut) })) };
  if (l.keys.length) {
    const mid = transformAt(l, cut);
    if (!a.keys.some((k) => Math.abs(k.t - cut) < 1e-3)) a.keys = [...a.keys, { t: cut, ...mid, ease: "linear" }];
    if (!b.keys.some((k) => k.t < 1e-3)) b.keys = [{ t: 0, ...mid, ease: "linear" }, ...b.keys];
  }
  return [a, b];
};

/** Camera keyframe for "add camera key here": the previous key's framing, at time t. */
export const cameraKeyAt = (p: Project, t: number): CamKey => {
  const before = [...p.camera].sort((a, b) => a.t - b.t).filter((k) => k.t <= t);
  const prev = before[before.length - 1] ?? p.camera[0];
  return { t: r3(round(t)), place: prev?.place ?? "India", zoom: prev?.zoom ?? 2.2, bearing: prev?.bearing ?? 0, pitch: prev?.pitch ?? 0, move: "fly", ease: "ease-in-out" };
};

export const fmtTime = (sec: number) => {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  const f = Math.floor((s - Math.floor(s)) * FPS + 1e-6);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";


/* ---------- effects attached to a main layer (2026-10-30) ---------- */

/**
 * kind: "layer" = an ordinary layer; its effects are modifiers that replace it for their duration (2026-10-31).
 * "scene" = a ready-made scene; "camera" = the project's map camera. These two can also pause and re-time.
 */
export type Main = { id: string; name: string; start: number; end: number; kind: "layer" | "scene" | "camera" };

/** Layers that can carry effects: every layer (except sounds and effects), and the map camera when it has keys. */
export const mainsOf = (p: Project): Main[] => {
  const out: Main[] = [];
  if (p.camera.length) out.push({ id: CAMERA_MAIN, name: "Map camera", start: 0, end: p.durationSec, kind: "camera" });
  for (const l of p.layers)
    if (l.uid && !isEffect(l) && l.type !== "sfx") out.push({ id: l.uid, name: l.name, start: l.startSec, end: l.endSec, kind: l.type === "scene" ? "scene" : "layer" });
  return out;
};

/** The main layer under the playhead: the selected layer (or the host of a selected effect), else the front-most layer, else the camera. */
export const mainAt = (p: Project, t: number, selected?: Layer | null, withCamera = false): Main | null => {
  const ms = mainsOf(p);
  const inside = (m: Main) => t >= m.start - 1e-3 && t < m.end - 0.05;
  if (selected && selected.uid) {
    const m = ms.find((x) => x.id === selected.uid);
    if (m && inside(m)) return m;
    if (selected.attachTo) {
      const host = ms.find((x) => x.id === selected.attachTo);
      if (host && inside(host)) return host;
    }
  }
  const layers = ms.filter((m) => m.id !== CAMERA_MAIN && inside(m));
  if (layers.length) return layers[layers.length - 1];
  // the camera only when asked (dropping on the Camera row): a first layer must become a main layer, not an effect
  return withCamera ? ms.find((m) => m.id === CAMERA_MAIN && inside(m)) ?? null : null;
};

/** Content fields an effect copies from its main layer when both are the same type (so "India" just becomes "Bihar"). */
const INHERIT: (keyof Layer)[] = ["places", "disabledPlaces", "mergeBorders", "level", "radiusKm", "highlightStyle", "routeStyle", "mode", "vehicle", "cardStyle", "pinVariant", "color", "text", "subtext", "media", "wave", "value", "anchor", "size", "scene", "sceneProps"];

/** Turns a layer into an effect on `mainId` (keeps its time; clamps it inside the main layer). */
export const attachTo = (p: Project, l: Layer, mainId: string): Layer => {
  const m = mainsOf(p).find((x) => x.id === mainId);
  const host = p.layers.find((x) => x.uid === mainId);
  if (host && host.type === l.type && !l.attachTo) {
    // a fresh effect of the same type starts as a copy of the main layer's settings
    const copy: Partial<Layer> = {};
    for (const k of INHERIT) (copy as Record<string, unknown>)[k] = clone(host[k]);
    l = { ...l, ...copy };
  }
  let dur = Math.max(0.3, l.endSec - l.startSec);
  let s = l.startSec;
  if (m) {
    // an effect lives inside its main layer
    s = clamp(s, m.start, Math.max(m.start, m.end - 0.5));
    dur = Math.min(dur, Math.max(0.5, m.end - s));
  }
  // On an ordinary layer the effect is a modifier: no pause, and the main camera keeps running.
  // Same type as the host (India → Bihar) replaces it; a different type (highlight China over a
  // running route) draws on top and the host keeps playing (2026-11-13).
  const fx = l.fx ?? (m?.kind === "layer" ? { ...fxDefaults(), hold: false, camera: "none", blend: host && host.type === l.type ? ("replace" as const) : ("overlay" as const) } : fxDefaults());
  return { ...l, attachTo: mainId, fx, startSec: r3(s), endSec: r3(s + dur), keys: [] };
};

/**
 * Synchronizes a Region Group between its Combined Group Master layer and its individual Child layers on the timeline!
 * - Master layer (`isGroupMaster: true`, `group: g`) holds the combined region list (`places`), `disabledPlaces`, `mergeBorders`,
 *   and the group-wide effect/flag/style.
 * - Every region in the group also has its own Child layer row (`isGroupMaster: false`, `group: g`, `places: [region]`) under the
 *   group on the timeline, so the user can click any individual member layer on the timeline to edit it specifically, hide/unselect it,
 *   trim its start/end time, or give it custom effects!
 */
export const buildGroupTimeline = (
  p: Project,
  masterIdx: number,
  patch: Partial<Layer>,
): { project: Project; selectIdx: number } => {
  const norm = (s: string) => s.trim().toLowerCase();
  const oldMaster = p.layers[masterIdx];
  if (!oldMaster) return { project: p, selectIdx: masterIdx };

  const updated: Layer = { ...oldMaster, ...patch };
  const cleanPlaces = [...new Set(updated.places.map((x) => x.trim()).filter(Boolean))];

  // If only 0 or 1 place and not already in a group, keep as a single layer
  if (cleanPlaces.length <= 1 && !oldMaster.isGroupMaster && !oldMaster.group) {
    return {
      project: { ...p, layers: p.layers.map((x, j) => (j === masterIdx ? updated : x)) },
      selectIdx: masterIdx,
    };
  }

  const gname = (updated.group?.trim() || (updated.name && updated.name !== LAYER_META[updated.type].label ? updated.name.trim() : `${cleanPlaces[0] ?? "Group"} Group`));
  const disSet = new Set((updated.disabledPlaces ?? []).map(norm));

  const masterLayer: Layer = {
    ...updated,
    name: updated.name && updated.name !== LAYER_META[updated.type].label ? updated.name : gname,
    group: gname,
    isGroupMaster: true,
    places: cleanPlaces,
    disabledPlaces: cleanPlaces.filter((pl) => disSet.has(norm(pl))),
    mergeBorders: updated.mergeBorders ?? true,
  };

  // Find existing child layers in this group
  const oldGroup = oldMaster.group?.trim() || gname;
  const existingChildren = p.layers.filter((x, j) => j !== masterIdx && !x.attachTo && x.group?.trim() === oldGroup && !x.isGroupMaster);

  // Sync child layers to match `cleanPlaces`
  const syncedChildren: Layer[] = cleanPlaces.map((pl) => {
    const found = existingChildren.find((c) => c.places[0] && norm(c.places[0]) === norm(pl));
    const isOff = disSet.has(norm(pl));
    if (found) {
      // Propagate style changes from master to child only if the child hadn't diverged from oldMaster
      const sameStyle =
        found.type === oldMaster.type &&
        found.highlightStyle === oldMaster.highlightStyle &&
        found.color === oldMaster.color &&
        found.media === oldMaster.media &&
        found.wave === oldMaster.wave;
      const sameTime = Math.abs(found.startSec - oldMaster.startSec) < 0.02 && Math.abs(found.endSec - oldMaster.endSec) < 0.02;
      return {
        ...found,
        group: gname,
        isGroupMaster: false,
        hidden: isOff,
        ...(sameTime ? { startSec: masterLayer.startSec, endSec: masterLayer.endSec } : {}),
        ...(sameStyle
          ? {
              type: masterLayer.type,
              highlightStyle: masterLayer.highlightStyle,
              color: masterLayer.color,
              media: masterLayer.media,
              wave: masterLayer.wave,
              level: masterLayer.level,
            }
          : {}),
      };
    }
    return newLayer(masterLayer.type, masterLayer.startSec, {
      name: pl,
      places: [pl],
      disabledPlaces: [],
      endSec: masterLayer.endSec,
      group: gname,
      isGroupMaster: false,
      highlightStyle: masterLayer.highlightStyle,
      color: masterLayer.color,
      media: masterLayer.media,
      wave: masterLayer.wave,
      level: masterLayer.level,
      text: "auto",
      hidden: isOff,
    });
  });

  // Rebuild `p.layers`: replace old group members with `[...syncedChildren, masterLayer]` so `masterLayer` sits at the top of the group in the reversed timeline!
  const nextLayers: Layer[] = [];
  let inserted = false;
  let newMasterIdx = 0;
  for (let j = 0; j < p.layers.length; j++) {
    const item = p.layers[j];
    const inThisGroup = j === masterIdx || (!item.attachTo && item.group?.trim() === oldGroup);
    if (inThisGroup) {
      if (!inserted) {
        inserted = true;
        for (const ch of syncedChildren) nextLayers.push(ch);
        newMasterIdx = nextLayers.length;
        nextLayers.push(masterLayer);
      }
    } else {
      nextLayers.push(item);
    }
  }
  if (!inserted) {
    for (const ch of syncedChildren) nextLayers.push(ch);
    newMasterIdx = nextLayers.length;
    nextLayers.push(masterLayer);
  }
  return { project: { ...p, layers: nextLayers }, selectIdx: newMasterIdx };
};

/**
 * Deletes a layer at `idx` cleanly:
 * - If `deleteEntireGroup` is true (or the layer is a Combined Group Master), deletes the entire group and all its member layers + attached effects.
 * - If deleting a single member layer inside a group, removes that member layer AND removes its region from the Group Master's `places`/`disabledPlaces`.
 * - Also removes any effects (`attachTo === layer.uid`) attached to the deleted layer(s).
 */
export const removeLayerAt = (p: Project, idx: number, deleteEntireGroup = false): Project => {
  const target = p.layers[idx];
  if (!target) return p;
  const norm = (s: string) => s.trim().toLowerCase();
  const gname = target.group?.trim();

  if (gname && (deleteEntireGroup || target.isGroupMaster)) {
    const groupUids = new Set(
      p.layers
        .filter((x) => x.group?.trim() === gname)
        .map((x) => x.uid)
        .filter((u): u is string => Boolean(u)),
    );
    return {
      ...p,
      layers: p.layers.filter((x) => x.group?.trim() !== gname && (!x.attachTo || !groupUids.has(x.attachTo))),
    };
  }

  const removedUid = target.uid;
  const childPlace = gname && !target.isGroupMaster ? target.places[0]?.trim() : undefined;

  let nextLayers = p.layers
    .filter((x, j) => j !== idx && (!removedUid || x.attachTo !== removedUid))
    .map((x) => {
      if (gname && childPlace && x.group?.trim() === gname && x.isGroupMaster) {
        return {
          ...x,
          places: x.places.filter((pl) => norm(pl) !== norm(childPlace)),
          disabledPlaces: (x.disabledPlaces ?? []).filter((pl) => norm(pl) !== norm(childPlace)),
        };
      }
      return x;
    });

  // If a group now has 0 child layers left (only the master with 0 places), remove the empty master too
  if (gname) {
    const remainingMembers = nextLayers.filter((x) => x.group?.trim() === gname && !x.attachTo);
    if (remainingMembers.length === 1 && remainingMembers[0].isGroupMaster && remainingMembers[0].places.length === 0) {
      nextLayers = nextLayers.filter((x) => x !== remainingMembers[0]);
    }
  }

  return { ...p, layers: nextLayers };
};

/** Removes an entire timeline group by name (all member layers, master layer, and attached effects). */
export const removeGroupByName = (p: Project, groupName: string): Project => {
  const g = groupName.trim();
  if (!g) return p;
  const groupUids = new Set(
    p.layers
      .filter((x) => x.group?.trim() === g)
      .map((x) => x.uid)
      .filter((u): u is string => Boolean(u)),
  );
  return {
    ...p,
    layers: p.layers.filter((x) => x.group?.trim() !== g && (!x.attachTo || !groupUids.has(x.attachTo))),
  };
};

export const detach = (l: Layer): Layer => {
  const { attachTo: _a, fx: _f, ...rest } = l;
  void _a;
  void _f;
  return rest as Layer;
};

/**
 * Keeps "extend" effects honest: the main layer's length = its designed content + every extend hold on it.
 * Records the designed length (contentSec) the first time a main gets an effect.
 */
export const reflow = (p: Project): Project => {
  const extOf = (id: string) =>
    p.layers.filter((f) => f.attachTo === id && f.fx && !f.hidden && f.fx.hold && f.fx.retime === "extend").reduce((a, f) => a + Math.max(0, f.endSec - f.startSec), 0);
  let changed = false;
  const layers = p.layers.map((l) => {
    if (l.type !== "scene" || !l.uid || isEffect(l)) return l;
    const hasFx = p.layers.some((f) => f.attachTo === l.uid && f.fx && !f.hidden);
    const prevExt = l.extSec ?? 0;
    if (!hasFx && !prevExt) return l;
    const span = l.endSec - l.startSec;
    // content = the designed animation; if the user resized the bar since, take the new size as the design
    let content = l.contentSec ?? r3(span - prevExt);
    if (Math.abs(span - (content + prevExt)) > 1e-3) content = r3(Math.max(0.1, span - prevExt));
    const ext = r3(extOf(l.uid));
    const end = r3(l.startSec + content + ext);
    if (l.contentSec === content && (l.extSec ?? 0) === ext && Math.abs(end - l.endSec) < 1e-3) return l;
    changed = true;
    return { ...l, contentSec: content, extSec: ext, endSec: end };
  });
  let q: Project = changed ? { ...p, layers } : p;
  const camHasFx = q.layers.some((f) => f.attachTo === CAMERA_MAIN && f.fx && !f.hidden);
  const camPrev = q.cameraExtSec ?? 0;
  if (camHasFx || camPrev) {
    let content = q.cameraContentSec ?? r3(q.durationSec - camPrev);
    if (Math.abs(q.durationSec - (content + camPrev)) > 1e-3) content = r3(Math.max(0.5, q.durationSec - camPrev));
    const ext = r3(extOf(CAMERA_MAIN));
    const dur = Math.min(600, r3(content + ext));
    if (q.cameraContentSec !== content || (q.cameraExtSec ?? 0) !== ext || Math.abs(dur - q.durationSec) > 1e-3) q = { ...q, cameraContentSec: content, cameraExtSec: ext, durationSec: dur };
  }
  // the project follows a main layer that grew or shrank (when it was sized to its layers)
  if (changed) {
    const before = Math.max(0, ...p.layers.map((l) => l.endSec));
    const last = Math.max(0, ...q.layers.map((l) => l.endSec));
    const fitted = Math.abs(p.durationSec - Math.ceil(before * 10) / 10) < 0.11 || Math.abs(p.durationSec - before) < 0.11;
    if (last > q.durationSec + 1e-6 || fitted) q = { ...q, durationSec: Math.min(600, Math.max(0.5, Math.ceil(last * 10) / 10)) };
  }
  return q;
};

/** Camera keys from a cinematic preset, replacing any keys inside [start, start + dur]. */
export const applyCameraPreset = (p: Project, id: string, o: { a: string; b?: string; zoom: number; zoomB?: number; start: number; dur: number; strength: number }): Project => {
  const keys: PresetKey[] = presetKeys(id, { a: o.a, b: o.b, zoom: o.zoom, zoomB: o.zoomB, dur: o.dur, strength: o.strength }, o.start);
  const kept = p.camera.filter((k) => k.t < o.start - 1e-3 || k.t > o.start + o.dur + 1e-3);
  const camera = [...kept, ...keys.map((k) => ({ ...k }))].sort((a, b) => a.t - b.t);
  return { ...p, camera, durationSec: Math.max(p.durationSec, r3(o.start + o.dur)) };
};
