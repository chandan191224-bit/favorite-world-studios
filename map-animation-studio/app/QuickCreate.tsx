// Quick Create (2026-11-13): one-click builders for the most-wanted map animations.
// Each recipe writes ordinary layers and ordinary camera keyframes at the playhead,
// so everything it makes stays fully editable afterwards (user: making an animation
// took too much effort — this makes the common ones a 10-second job).
import React, { useState } from "react";
import { applyCameraPreset, newLayer, r3, type Layer, type Project } from "./model";
import type { HighlightStyle } from "../src/map/highlightStyles";
import { camTarget } from "./camtarget";
import { applyFollowRoute, followRouteKeys } from "./followRoute";
import { PlaceInput, PlaceList } from "./PlaceInput";
import { Field, Icon, Select, Slider, Toggle } from "./ui";

export type QuickApply = (fn: (p: Project) => Project, msg: string) => void;

type Props = { at: number; project: Project; onApply: QuickApply };

const RECIPES = [
  { id: "fly-in", name: "Fly into a place", desc: "Globe → place opener with a pin and name card", icon: "globe" },
  { id: "journey", name: "Journey A → B", desc: "Route + vehicle + pins, camera follows", icon: "route" },
  { id: "highlight", name: "Highlight an area", desc: "Country or state glows, camera frames it", icon: "area" },
  { id: "compare", name: "Compare two places", desc: "A then B highlighted, camera crosses over", icon: "split" },
  { id: "drill-down", name: "Country → city drill-down", desc: "Whole country first, then dive to the city", icon: "pin" },
  { id: "breaking", name: "Breaking-news zoom", desc: "Snap zoom with radar pulse and headline", icon: "rec" },
  { id: "conflict", name: "Conflict arrows", desc: "Military arrows advance, war-room camera", icon: "up" },
  { id: "tour", name: "Tour of stops", desc: "Route through all stops, pin at each one", icon: "film" },
] as const;

type RecipeId = (typeof RECIPES)[number]["id"];

/* ---------- shared helpers ---------- */

const addLayers = (p: Project, layers: Layer[]): Project => {
  const end = Math.max(p.durationSec, ...layers.map((l) => l.endSec));
  return { ...p, layers: [...p.layers, ...layers], durationSec: Math.min(600, Math.ceil(end * 10) / 10) };
};

/** Resolved camera subject: exact framing for countries/states, typed name + fallback zoom otherwise. */
const subject = async (place: string, p: Project, fallback: number) => {
  const tg = await camTarget(place, p);
  return { place: tg.place, zoom: tg.zoom ?? fallback };
};

const VEHICLE_FOR = { flight: "plane", road: "car", rail: "train", sea: "ship" } as const;
type TravelMode = keyof typeof VEHICLE_FOR;

/* ---------- the panel ---------- */

export const QuickCreate: React.FC<Props> = ({ at, project, onApply }) => {
  const [openId, setOpenId] = useState<RecipeId | null>("fly-in");
  return (
    <div className="pad">
      <p className="hint">
        Ready-made animations built at the playhead ({at.toFixed(1)} s). Everything they create is ordinary layers and camera keyframes — change any of it afterwards.
      </p>
      {RECIPES.map((r) => (
        <div className="tpl" key={r.id}>
          <button
            className="qc-head"
            onClick={() => setOpenId(openId === r.id ? null : r.id)}
            style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", background: "none", border: 0, color: "inherit", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <Icon name={r.icon} size={15} />
            <span style={{ display: "grid", flex: 1 }}>
              <b>{r.name}</b>
              <small>{r.desc}</small>
            </span>
            <Icon name={openId === r.id ? "up" : "down"} size={13} />
          </button>
          {openId === r.id ? <RecipeForm id={r.id} at={at} project={project} onApply={onApply} /> : null}
        </div>
      ))}
    </div>
  );
};

/* ---------- one form per recipe ---------- */

const RecipeForm: React.FC<Props & { id: RecipeId }> = ({ id, at, project, onApply }) => {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [places, setPlaces] = useState<string[]>(["", "", ""]);
  const [dur, setDur] = useState(id === "breaking" ? 5 : id === "journey" || id === "compare" ? 8 : id === "tour" ? 12 : 6);
  const [style, setStyle] = useState(id === "fly-in" ? "sky-to-ground" : "glow");
  const [mode, setMode] = useState<TravelMode>("flight");
  const [headline, setHeadline] = useState("");
  const [withPin, setWithPin] = useState(true);
  const [withCard, setWithCard] = useState(true);
  const [follow, setFollow] = useState(true);
  const [busy, setBusy] = useState(false);

  const t0 = r3(at);
  const need = (...vals: string[]) => vals.every((v) => v.trim().length > 0);

  const create = async () => {
    setBusy(true);
    try {
      let fn: ((p: Project) => Project) | null = null;
      let msg = "";
      if (id === "fly-in") {
        const s = await subject(a, project, 6.5);
        const layers: Layer[] = [];
        if (withPin) layers.push(newLayer("pin", r3(t0 + dur * 0.55), { places: [a], endSec: r3(t0 + dur) }));
        if (withCard) layers.push(newLayer("location-card", r3(t0 + dur * 0.6), { places: [a], endSec: r3(t0 + dur) }));
        fn = (p) => applyCameraPreset(addLayers(p, layers), style, { a: s.place, zoom: s.zoom, start: t0, dur, strength: 1 });
        msg = `Fly into ${a} created`;
      } else if (id === "journey") {
        const route = newLayer("route", t0, { places: [a, b], mode, vehicle: VEHICLE_FOR[mode], endSec: r3(t0 + dur) });
        const layers = [route, newLayer("pin", t0, { places: [a], endSec: r3(t0 + Math.min(3, dur * 0.4)) }), newLayer("pin", r3(t0 + dur * 0.65), { places: [b], endSec: r3(t0 + dur) })];
        if (follow) {
          const keys = await followRouteKeys(route, { zoom: 5 });
          fn = (p) => applyFollowRoute(addLayers(p, layers), route, keys);
        } else {
          const [sa, sb] = await Promise.all([subject(a, project, 4.5), subject(b, project, 4.5)]);
          fn = (p) => applyCameraPreset(addLayers(p, layers), "journey", { a: sa.place, b: sb.place, zoom: sa.zoom, zoomB: sb.zoom, start: t0, dur, strength: 1 });
        }
        msg = `Journey ${a} → ${b} created`;
      } else if (id === "highlight") {
        const s = await subject(a, project, 3.2);
        const layers = [newLayer("highlight", t0, { places: [a], highlightStyle: style as HighlightStyle, text: "auto", endSec: r3(t0 + dur) })];
        fn = (p) => applyCameraPreset(addLayers(p, layers), "push-in", { a: s.place, zoom: s.zoom, start: t0, dur, strength: 1 });
        msg = `Highlight on ${a} created`;
      } else if (id === "compare") {
        const [sa, sb] = await Promise.all([subject(a, project, 3.2), subject(b, project, 3.2)]);
        const layers = [
          newLayer("highlight", t0, { places: [a], highlightStyle: style as HighlightStyle, text: "auto", endSec: r3(t0 + dur * 0.55) }),
          newLayer("highlight", r3(t0 + dur * 0.45), { places: [b], highlightStyle: style as HighlightStyle, text: "auto", color: "#ff9431", endSec: r3(t0 + dur) }),
        ];
        fn = (p) => applyCameraPreset(addLayers(p, layers), "compare", { a: sa.place, b: sb.place, zoom: sa.zoom, zoomB: sb.zoom, start: t0, dur, strength: 1 });
        msg = `Compare ${a} and ${b} created`;
      } else if (id === "drill-down") {
        const [sa, sb] = await Promise.all([subject(a, project, 2.6), subject(b, project, 6.8)]);
        const layers = [
          newLayer("highlight", t0, { places: [a], highlightStyle: "glow", text: "auto", endSec: r3(t0 + dur * 0.5) }),
          newLayer("pin", r3(t0 + dur * 0.5), { places: [b], endSec: r3(t0 + dur) }),
          ...(withCard ? [newLayer("location-card", r3(t0 + dur * 0.6), { places: [b], endSec: r3(t0 + dur) })] : []),
        ];
        fn = (p) => applyCameraPreset(addLayers(p, layers), "drill-down", { a: sa.place, b: sb.place, zoom: sa.zoom, zoomB: sb.zoom, start: t0, dur, strength: 1 });
        msg = `Drill-down ${a} → ${b} created`;
      } else if (id === "breaking") {
        const s = await subject(a, project, 6.2);
        const layers = [
          newLayer("radar", r3(t0 + dur * 0.25), { places: [a], text: a.toUpperCase(), endSec: r3(t0 + dur) }),
          ...(headline.trim() ? [newLayer("text", r3(t0 + dur * 0.35), { text: headline.trim(), anchor: "top", size: 64, endSec: r3(t0 + dur) })] : []),
        ];
        fn = (p) => applyCameraPreset(addLayers(p, layers), "snap-zoom", { a: s.place, zoom: s.zoom, start: t0, dur, strength: 1 });
        msg = `Breaking-news zoom on ${a} created`;
      } else if (id === "conflict") {
        const pts = places.filter((x) => x.trim());
        const midPt = pts[Math.floor((pts.length - 1) / 2)];
        const s = await subject(midPt, project, 4);
        const layers = [
          newLayer("arrow", t0, { places: pts, endSec: r3(t0 + dur) }),
          newLayer("radar", r3(t0 + dur * 0.6), { places: [pts[pts.length - 1]], text: pts[pts.length - 1].toUpperCase(), endSec: r3(t0 + dur) }),
        ];
        fn = (p) => applyCameraPreset(addLayers(p, layers), "war-room", { a: s.place, zoom: Math.max(2.2, s.zoom - 0.6), start: t0, dur, strength: 1 });
        msg = "Conflict arrows created";
      } else if (id === "tour") {
        const pts = places.filter((x) => x.trim());
        const pinDur = Math.min(3, dur / pts.length);
        const route = newLayer("route", t0, { places: pts, mode, vehicle: VEHICLE_FOR[mode], endSec: r3(t0 + dur) });
        const layers = [
          route,
          ...pts.map((pt, i) => newLayer("pin", r3(t0 + (dur * i) / Math.max(1, pts.length - 1)), { places: [pt], endSec: r3(Math.min(t0 + dur, t0 + (dur * i) / Math.max(1, pts.length - 1) + pinDur)) })),
        ];
        if (follow) {
          const keys = await followRouteKeys(route, { zoom: 5 });
          fn = (p) => applyFollowRoute(addLayers(p, layers), route, keys);
        } else {
          const [sa, sb] = await Promise.all([subject(pts[0], project, 4.2), subject(pts[pts.length - 1], project, 4.2)]);
          fn = (p) => applyCameraPreset(addLayers(p, layers), "journey", { a: sa.place, b: sb.place, zoom: sa.zoom, zoomB: sb.zoom, start: t0, dur, strength: 1 });
        }
        msg = `Tour of ${pts.length} stops created`;
      }
      if (fn) onApply(fn, msg);
    } finally {
      setBusy(false);
    }
  };

  const HIGHLIGHT_CHOICES = ["glow", "fill", "gradient", "neon", "outline-draw", "pulse", "spotlight", "pop-out"] as const;
  const OPENERS = ["sky-to-ground", "satellite-drop", "crane-down"] as const;
  const OPENER_LABELS = { "sky-to-ground": "Sky to ground (cinematic)", "satellite-drop": "Satellite drop (fast, punchy)", "crane-down": "Crane down (settle into 3D)" };
  const listPts = places.filter((x) => x.trim());
  const ready =
    id === "conflict" || id === "tour" ? listPts.length >= 2 : id === "journey" || id === "compare" || id === "drill-down" ? need(a, b) : need(a);

  return (
    <div className="body" style={{ display: "grid", gap: 8, paddingTop: 8 }}>
      {id === "conflict" || id === "tour" ? (
        <Field label={id === "tour" ? "Stops (in order)" : "Arrow points (in order)"}>
          <PlaceList value={places} onChange={setPlaces} addLabel={id === "tour" ? "Add stop" : "Add point"} min={2} />
        </Field>
      ) : (
        <>
          <Field label={id === "drill-down" ? "Country or state" : id === "journey" ? "From (place A)" : "Place"}>
            <PlaceInput value={a} onChange={setA} />
          </Field>
          {id === "journey" || id === "compare" || id === "drill-down" ? (
            <Field label={id === "drill-down" ? "City or exact place" : id === "compare" ? "Place B" : "To (place B)"}>
              <PlaceInput value={b} onChange={setB} />
            </Field>
          ) : null}
        </>
      )}
      {id === "fly-in" ? (
        <Field label="Camera move">
          <Select options={OPENERS} labels={OPENER_LABELS} value={style as (typeof OPENERS)[number]} onChange={setStyle} />
        </Field>
      ) : null}
      {id === "highlight" || id === "compare" ? (
        <Field label="Highlight style">
          <Select options={HIGHLIGHT_CHOICES} value={style as (typeof HIGHLIGHT_CHOICES)[number]} onChange={setStyle} />
        </Field>
      ) : null}
      {id === "journey" || id === "tour" ? (
        <>
          <Field label="Travel by">
            <Select options={["flight", "road", "rail", "sea"] as const} value={mode} onChange={(m) => setMode(m)} />
          </Field>
          <Toggle label="Camera follows the route (3D chase along the real path)" checked={follow} onChange={setFollow} />
        </>
      ) : null}
      {id === "breaking" ? (
        <Field label="Headline (optional)">
          <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="BREAKING: …" />
        </Field>
      ) : null}
      {id === "fly-in" ? (
        <div className="rowf" style={{ gap: 12 }}>
          <Toggle label="Pin" checked={withPin} onChange={setWithPin} />
          <Toggle label="Name card" checked={withCard} onChange={setWithCard} />
        </div>
      ) : null}
      {id === "drill-down" ? <Toggle label="Name card on the city" checked={withCard} onChange={setWithCard} /> : null}
      <Slider label="Length" value={dur} min={3} max={30} step={0.5} onChange={setDur} fmt={(v) => `${v.toFixed(1)} s`} />
      <button className="btn pri" disabled={!ready || busy} onClick={create}>
        <Icon name="sparkle" />
        {busy ? "Building…" : "Create at playhead"}
      </button>
    </div>
  );
};
