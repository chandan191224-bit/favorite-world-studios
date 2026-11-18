// Cinematic camera presets (2026-10-30, user: "add preset cinematic camera settings for all kind of things in the map
// animation … assuming yourself as a 30 year experienced graphics / animation designer … that obviously can be
// customised"). Every preset only writes ordinary camera keyframes, so everything stays editable afterwards.
//
// Two kinds:
//  • MOVES — one subject, one camera move (push-in, orbit, crane…). Used by effect layers and "Move on one place".
//  • SHOTS — a designed sequence across one or two places (sky-to-ground, drill-down, A→B journey, compare…).
import type { Ease } from "./keyframes";

export type CamMove = "fly" | "smooth" | "linear" | "cut";
export type PresetKey = { t: number; place: string; zoom: number; bearing: number; pitch: number; move: CamMove; ease: Ease };
type Opts = { a: string; b?: string; zoom: number; zoomB?: number; dur: number; strength?: number };

export type CameraPreset = {
  id: string;
  name: string;
  /** When to reach for it — shown in the picker. */
  use: string;
  group: "Move on one place" | "Openers & endings" | "Two places" | "Drama & detail";
  needsB?: boolean;
  build: (o: Opts) => PresetKey[];
};

const k = (t: number, place: string, zoom: number, bearing = 0, pitch = 0, move: CamMove = "smooth", e: Ease = "ease-in-out"): PresetKey => ({
  t: Math.round(t * 1000) / 1000,
  place,
  zoom: Math.round(zoom * 100) / 100,
  bearing: Math.round(bearing),
  pitch: Math.round(pitch),
  move,
  ease: e,
});

export const CAMERA_PRESETS: CameraPreset[] = [
  // ---- one place, one move (also the effect-layer cameras) ----
  { id: "push-in", name: "Slow push-in", group: "Move on one place", use: "Default for focus: calm, confident move toward the subject",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom - 0.35 * s), k(dur, a, zoom + 0.35 * s, 0, 0, "smooth", "ease-in-out")] },
  { id: "locked", name: "Locked-off frame", group: "Move on one place", use: "Let the graphic do the talking (data, labels, counters)",
    build: ({ a, zoom, dur }) => [k(0, a, zoom), k(dur, a, zoom, 0, 0, "smooth", "linear")] },
  { id: "drift", name: "Documentary drift", group: "Move on one place", use: "Long narration over a map: barely-there motion keeps it alive",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom, -3 * s, 8 * s), k(dur, a, zoom + 0.18 * s, 4 * s, 12 * s, "smooth", "linear")] },
  { id: "pull-back", name: "Pull-back reveal", group: "Move on one place", use: "Start tight, open up to show the context around it",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom + 0.9 * s, 0, 18 * s), k(dur, a, zoom - 0.25 * s, 0, 0, "smooth", "ease-out")] },
  { id: "orbit", name: "3D orbit", group: "Move on one place", use: "Hero moment on a landmark, city or state",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom + 0.1, -28 * s, 42), k(dur / 2, a, zoom + 0.25, 0, 46, "smooth", "linear"), k(dur, a, zoom + 0.1, 28 * s, 42, "smooth", "linear")] },
  { id: "crane-down", name: "Crane down (sky to ground)", group: "Move on one place", use: "Arrive at a place from high above, settle into a 3D view",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom - 2.2 * s, 0, 0), k(dur * 0.75, a, zoom, 10 * s, 32, "fly", "ease-in-out"), k(dur, a, zoom + 0.12, 14 * s, 36, "smooth", "ease-out")] },
  { id: "crane-up", name: "Crane up (rise away)", group: "Move on one place", use: "Leave a place: lift off and rise into the wider map",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom, 12 * s, 34), k(dur, a, zoom - 2 * s, 0, 0, "fly", "ease-in-out")] },
  { id: "spiral-in", name: "Spiral in", group: "Move on one place", use: "Energetic focus: rotates in while descending",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom - 1.4 * s, 80 * s, 10), k(dur, a, zoom, 0, 28, "smooth", "ease-out")] },
  { id: "tilt-reveal", name: "Tilt reveal (flat → 3D)", group: "Move on one place", use: "Turn a flat map into terrain/3D for weight",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom, 0, 0), k(dur, a, zoom + 0.2, 16 * s, 48 * s, "smooth", "ease-in-out")] },
  { id: "flyover", name: "Drone flyover", group: "Move on one place", use: "Travel feel over a region, low and tilted",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom + 0.2, -20 * s, 50), k(dur, a, zoom + 0.55, 20 * s, 54, "smooth", "linear")] },
  { id: "snap-zoom", name: "Snap zoom (punch in)", group: "Drama & detail", use: "Shock, breaking news, a sudden fact",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom - 0.8 * s), k(Math.min(0.45, dur * 0.25), a, zoom + 0.25 * s, 0, 0, "smooth", "back"), k(dur, a, zoom + 0.35 * s, 0, 0, "smooth", "linear")] },
  { id: "dutch-push", name: "Tense tilted push", group: "Drama & detail", use: "Conflict, tension, danger: slight roll and push",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom - 0.3 * s, -9 * s, 14), k(dur, a, zoom + 0.45 * s, 5 * s, 22, "smooth", "ease-in")] },
  { id: "war-room", name: "War-room top-down", group: "Drama & detail", use: "Military/strategy: flat, cold, slow push",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom, 0, 0), k(dur, a, zoom + 0.22 * s, 0, 0, "smooth", "linear")] },
  { id: "heartbeat", name: "Breathing hold", group: "Drama & detail", use: "Emotional pause: in and back out, like a breath",
    build: ({ a, zoom, dur, strength: s = 1 }) => [k(0, a, zoom), k(dur / 2, a, zoom + 0.28 * s, 0, 8, "smooth", "ease-in-out"), k(dur, a, zoom + 0.05, 0, 4, "smooth", "ease-in-out")] },

  // ---- openers and endings ----
  { id: "sky-to-ground", name: "Sky to ground (globe → place)", group: "Openers & endings", use: "Video or chapter opener; the user's favourite cinematic map style",
    build: ({ a, zoom, dur }) => [k(0, a, -0.4, 0, 0), k(dur * 0.62, a, zoom, 0, 12, "fly", "ease-in-out"), k(dur, a, zoom + 0.3, 12, 34, "smooth", "ease-out")] },
  { id: "ground-to-sky", name: "Ground to sky (place → globe)", group: "Openers & endings", use: "Chapter or video ending: pull all the way out",
    build: ({ a, zoom, dur }) => [k(0, a, zoom + 0.2, 10, 30), k(dur * 0.3, a, zoom, 0, 10, "smooth", "ease-in-out"), k(dur, a, -0.4, 0, 0, "fly", "ease-in-out")] },
  { id: "satellite-drop", name: "Satellite drop", group: "Openers & endings", use: "Fast, punchy dive from space (hooks, shorts)",
    build: ({ a, zoom, dur }) => [k(0, a, -0.6, 0, 0), k(dur * 0.55, a, zoom + 0.15, 0, 20, "fly", "ease-in"), k(dur, a, zoom + 0.3, 6, 28, "smooth", "ease-out")] },
  { id: "establishing", name: "Establishing wide", group: "Openers & endings", use: "Set the scene of a country before the details",
    build: ({ a, zoom, dur }) => [k(0, a, zoom - 0.5, -6, 0), k(dur, a, zoom - 0.2, 4, 10, "smooth", "linear")] },

  // ---- two places ----
  { id: "drill-down", name: "Drill down (country → state/city)", group: "Two places", needsB: true, use: "From the country to the exact place in the story",
    build: ({ a, b = a, zoom, zoomB = zoom + 2.5, dur }) => [k(0, a, zoom, 0, 0), k(dur * 0.25, a, zoom + 0.1, 0, 0, "smooth", "linear"), k(dur * 0.85, b, zoomB, 6, 24, "fly", "ease-in-out"), k(dur, b, zoomB + 0.15, 8, 28, "smooth", "ease-out")] },
  { id: "journey", name: "Journey A → B (3D follow)", group: "Two places", needsB: true, use: "Travel, trade routes, a movement between two places",
    build: ({ a, b = a, zoom, zoomB = zoom, dur }) => [k(0, a, zoom, -10, 40), k(dur, b, zoomB, 10, 40, "fly", "ease-in-out")] },
  { id: "compare", name: "Compare A and B (hold, cross, hold)", group: "Two places", needsB: true, use: "Two countries/cities side by side in the story",
    build: ({ a, b = a, zoom, zoomB = zoom, dur }) => [k(0, a, zoom), k(dur * 0.35, a, zoom + 0.15, 0, 0, "smooth", "linear"), k(dur * 0.65, b, zoomB, 0, 0, "fly", "ease-in-out"), k(dur, b, zoomB + 0.15, 0, 0, "smooth", "linear")] },
  { id: "border-sweep", name: "Border sweep A → B", group: "Two places", needsB: true, use: "Run along a border or front line, low and tilted",
    build: ({ a, b = a, zoom, zoomB = zoom, dur }) => [k(0, a, zoom + 0.3, -35, 48), k(dur, b, zoomB + 0.3, -35, 48, "smooth", "linear")] },
  { id: "return-trip", name: "Out and back (A → B → A)", group: "Two places", needsB: true, use: "Show B briefly, then return to the main subject",
    build: ({ a, b = a, zoom, zoomB = zoom, dur }) => [k(0, a, zoom), k(dur * 0.45, b, zoomB, 0, 10, "fly", "ease-in-out"), k(dur * 0.6, b, zoomB + 0.1, 0, 10, "smooth", "linear"), k(dur, a, zoom, 0, 0, "fly", "ease-in-out")] },
];

export const PRESET_BY_ID = new Map(CAMERA_PRESETS.map((p) => [p.id, p]));
export const MOVE_PRESETS = CAMERA_PRESETS.filter((p) => !p.needsB);

/** Sensible zoom for a subject: country ≈ 2.4, state ≈ 4.6, city/point ≈ 7. */
export const autoZoom = (level: string, type: string) =>
  level === "country" ? 2.4 : level === "state" ? 4.6 : level === "radius" ? 5.5 : ["pin", "radar", "callout", "map-label"].includes(type) ? 6.8 : type === "route" || type === "arrow" ? 3.6 : 3.2;

/** Camera keys for a preset, placed at `start` seconds. */
export const presetKeys = (id: string, o: Opts, start = 0): PresetKey[] => {
  const p = PRESET_BY_ID.get(id) ?? CAMERA_PRESETS[0];
  return p.build({ strength: 1, ...o }).map((x) => ({ ...x, t: Math.round((x.t + start) * 1000) / 1000 }));
};
