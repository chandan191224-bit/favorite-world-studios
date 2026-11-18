// Effects attached to a main layer (2026-10-30, user: "if I want to use it as effect then it must not form any layer
// rather it will attach to the main layer and work as an effect … when the highlight duration ends then the main layer
// animation runs further … the end animation of the main layer becomes faster … which can be customised").
//
// Any layer can be an effect: `attachTo` = the uid of a scene layer, or "camera" for the project's own map camera.
// While an effect with `hold` plays, the main animation pauses (time remap); afterwards it carries on. `retime`:
//   "compress" — the main layer keeps its end time, so the rest of its animation plays faster;
//   "extend"   — the main layer gets longer by the effect's length, the rest keeps its original speed.
import { z } from "zod";

export const CAMERA_MAIN = "camera";
export const FX_TRANSITIONS = ["dissolve", "zoom", "cut"] as const;

export const zFx = z.object({
  hold: z.boolean().describe("Pause the main animation while the effect plays"),
  retime: z.enum(["compress", "extend"]).describe("After the effect: compress = main keeps its end time; extend = main ends later"),
  transIn: z.enum(FX_TRANSITIONS),
  transOut: z.enum(FX_TRANSITIONS),
  tin: z.number().min(0).max(4).describe("Seconds of in-transition"),
  tout: z.number().min(0).max(4).describe("Seconds of out-transition"),
  camera: z.string().describe('Cinematic camera preset id, or "none" to keep the main camera'),
  camPlace: z.string().describe("Camera target; empty = the effect's own place"),
  camZoom: z.number().describe("Camera zoom; -9 = automatic for the place"),
  camStrength: z.number().min(0).max(2).describe("How strong the camera move is"),
  blend: z
    .enum(["overlay", "replace"])
    .optional()
    .describe('Effects inside an ordinary layer (2026-11-13): "overlay" draws ON TOP while the main layer keeps playing (e.g. highlight China over a running route); "replace" swaps the main layer out for the effect\'s duration (e.g. India → Bihar). Missing = replace (older projects).'),
});
export type Fx = z.infer<typeof zFx>;

export const fxDefaults = (): Fx => ({
  hold: true,
  retime: "compress",
  transIn: "dissolve",
  transOut: "dissolve",
  tin: 0.6,
  tout: 0.6,
  camera: "push-in",
  camPlace: "",
  camZoom: -9,
  camStrength: 1,
});

type L = { uid?: string; attachTo?: string; fx?: Fx; startSec: number; endSec: number; type: string; hidden?: boolean; contentSec?: number };

export const isEffect = (l: L) => Boolean(l.attachTo && l.fx);

export type FxPlan = { start: number; end: number; content: number; holds: { s: number; e: number }[] };

/** Main layer span: a scene layer by uid, or the whole project for the camera. */
export function mainOf<T extends L>(layers: T[], id: string, projectDur: number): { start: number; end: number; layer: T | null } | null {
  if (id === CAMERA_MAIN) return { start: 0, end: projectDur, layer: null };
  const m = layers.find((l) => l.uid === id && !isEffect(l));
  return m ? { start: m.startSec, end: m.endSec, layer: m } : null;
}

/** Holds and content length for one main layer. */
export function planFor<T extends L>(layers: T[], id: string, projectDur: number, cameraContent?: number): FxPlan | null {
  const m = mainOf(layers, id, projectDur);
  if (!m) return null;
  const fxs = layers.filter((l) => l.attachTo === id && l.fx && !l.hidden);
  const raw = fxs
    .filter((l) => l.fx!.hold)
    .map((l) => ({ s: Math.max(m.start, l.startSec), e: Math.min(m.end, l.endSec), ext: l.fx!.retime === "extend" }))
    .filter((h) => h.e > h.s)
    .sort((a, b) => a.s - b.s);
  const holds: { s: number; e: number }[] = [];
  for (const h of raw) {
    const last = holds[holds.length - 1];
    if (last && h.s <= last.e) last.e = Math.max(last.e, h.e);
    else holds.push({ s: h.s, e: h.e });
  }
  const span = m.end - m.start;
  const extendHold = raw.filter((h) => h.ext).reduce((a, h) => a + (h.e - h.s), 0);
  const designed = id === CAMERA_MAIN ? cameraContent : m.layer?.contentSec;
  const content = Math.max(0.05, designed ?? span - extendHold);
  return { start: m.start, end: m.end, content, holds };
}

/**
 * Content time (seconds from the main layer's start) shown at project time t.
 * Before the first hold the animation runs at normal speed; during holds it is frozen; after them the remaining
 * content is spread over the remaining playable time (faster with "compress", same speed with "extend").
 */
export function warp(plan: FxPlan, t: number): number {
  const span = plan.end - plan.start;
  if (!plan.holds.length) return Math.max(0, Math.min(plan.content, ((t - plan.start) * plan.content) / Math.max(1e-6, span)));
  const H = plan.holds.reduce((a, h) => a + (h.e - h.s), 0);
  const P = Math.max(1e-6, span - H);
  const L0 = Math.min(plan.holds[0].s - plan.start, plan.content);
  const rate = Math.max(0, plan.content - L0) / Math.max(1e-6, P - (plan.holds[0].s - plan.start));
  // playable time elapsed up to t (hold time doesn't count)
  let played = Math.max(0, Math.min(t, plan.end) - plan.start);
  for (const h of plan.holds) played -= Math.max(0, Math.min(t, h.e) - h.s);
  const pre = plan.holds[0].s - plan.start;
  const c = played <= pre ? Math.min(played, plan.content) : L0 + (played - pre) * rate;
  return Math.max(0, Math.min(plan.content, c));
}

/** 0..1 visibility of an effect at time t from its in/out transitions. */
export function fxAlpha(fx: Fx, start: number, end: number, t: number, smooth: (x: number) => number): number {
  if (t < start || t > end) return 0;
  const a = fx.transIn === "cut" || fx.tin <= 0 ? 1 : smooth(Math.min(1, (t - start) / fx.tin));
  const b = fx.transOut === "cut" || fx.tout <= 0 ? 1 : smooth(Math.min(1, (end - t) / fx.tout));
  return Math.max(0, Math.min(a, b));
}

/** Map-type layers draw on a map; when attached to a scene they get their own map insert. */
export const MAP_TYPES = ["highlight", "region-media", "route", "pin", "radar", "callout", "arrow", "map-label"];
