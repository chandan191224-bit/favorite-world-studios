import React, { useMemo } from "react";
import { HIGHLIGHT_STYLES } from "../src/map/highlightStyles";
import { ROUTE_STYLES } from "../src/map/overlays";
import { VEHICLES } from "../src/map/icons";
import { LOCATION_CARD_STYLES } from "../src/ui/Overlays2D";
import { EASES, presetKeys } from "../src/lib/keyframes";
import { FORMATS, zRouteMode, type FormatName } from "../src/lib/schema";
import { THEMES, THEME_NAMES } from "../src/lib/themes";
import { ANCHORS } from "../src/scenes/composer/MapComposer";
import { FOLDERS, TEMPLATES, TEMPLATE_BY_ID } from "../src/registry";
import { FPS, LAYER_META, addKeyAt, applyCameraPreset, attachTo, buildGroupTimeline, clamp, detach, fmtTime, humanize, layerDuration, mainsOf, r3, removeGroupByName, removeLayerAt, sceneSettings, type CamKey, type FieldId, type Layer, type Project } from "./model";
import { CAMERA_PRESETS, MOVE_PRESETS, PRESET_BY_ID } from "../src/lib/cinematic";
import { FX_TRANSITIONS, fxDefaults, type Fx } from "../src/scenes/composer/effects";
import { camTarget } from "./camtarget";
import { applyFollowRoute, followRouteKeys } from "./followRoute";
import { ColorInput, Field, Icon, LAYER_ICON, NumberInput, Seg, Select, Slider, Toggle } from "./ui";
import { AreaGroupField, PlaceInput, PlaceList } from "./PlaceInput";
import { MediaField, type MediaFieldKind } from "./Media";
import { BASE_KEYS, SchemaForm } from "./SchemaForm";
import type { Sel } from "./Timeline";

type Update = (fn: (p: Project) => Project, tag?: string) => void;

const MODES = zRouteMode.options;
const SIZE_MAX: Partial<Record<Layer["type"], number>> = { text: 400, "map-label": 200, pin: 200, radar: 300, route: 200, arrow: 200, image: 1920, video: 1920, flag: 800 };
const MEDIA_KIND: Partial<Record<Layer["type"], MediaFieldKind>> = { "region-media": "region", cutout: "region", route: "track", image: "image", video: "video", callout: "visual", flag: "flag", sfx: "sound" };
const ANCHOR_ARROWS: Record<string, string> = { "top-left": "↖", top: "↑", "top-right": "↗", left: "←", center: "•", right: "→", "bottom-left": "↙", bottom: "↓", "bottom-right": "↘" };

const AnchorPicker: React.FC<{ value: string; onChange: (v: (typeof ANCHORS)[number]) => void }> = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 34px)", gap: 4 }}>
    {(["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"] as const).map((a) => (
      <button key={a} type="button" className={`btn sm icon ${value === a ? "on" : ""}`} style={{ width: 34, height: 28 }} onClick={() => onChange(a)} title={a}>
        {ANCHOR_ARROWS[a]}
      </button>
    ))}
  </div>
);

/* ---------- layer ---------- */

const LayerFields: React.FC<{ l: Layer; set: (patch: Partial<Layer>, tag?: string) => void }> = ({ l, set }) => {
  const meta = LAYER_META[l.type];
  const field = (id: FieldId, label?: string, hint?: string): React.ReactNode => {
    const L = label ?? humanize(id);
    switch (id) {
      case "place":
        return (
          <Field label={L} hint={hint}>
            <PlaceInput value={l.places[0] ?? ""} onChange={(v) => set({ places: [v, ...l.places.slice(1)] })} kinds={l.type === "flag" ? ["country"] : undefined} />
          </Field>
        );
      case "places":
        return (
          <Field label={L} hint={hint}>
            <PlaceList value={l.places} onChange={(v) => set({ places: v })} min={l.type === "route" || l.type === "arrow" ? 2 : 1} addLabel={l.type === "route" ? "Add stop" : "Add point"} />
          </Field>
        );
      case "areaGroup":
        return (
          <Field label={L} hint={hint}>
            <AreaGroupField
              places={l.places}
              disabledPlaces={l.disabledPlaces}
              mergeBorders={l.mergeBorders}
              groupName={l.name}
              labelValue={l.text}
              onChange={(patch) => set(patch, "areaGroup")}
            />
          </Field>
        );
      case "level":
        return (
          <Field label="Area type" hint={l.level === "auto" ? "Auto picks a country, continent, or state, then a radius around a place" : undefined}>
            <Seg options={["auto", "country", "state", "continent", "radius"] as const} value={l.level} onChange={(v) => set({ level: v })} />
          </Field>
        );
      case "radiusKm":
        return l.level === "radius" || l.level === "auto" ? <Slider label="Radius (km, for radius areas)" value={l.radiusKm} min={0} max={3000} step={5} onChange={(v) => set({ radiusKm: v }, "radius")} /> : null;
      case "highlightStyle":
        return (
          <Field label={L}>
            <Select options={HIGHLIGHT_STYLES} value={l.highlightStyle} onChange={(v) => set({ highlightStyle: v })} />
          </Field>
        );
      case "routeStyle":
        return (
          <Field label={L}>
            <Select options={ROUTE_STYLES} value={l.routeStyle} onChange={(v) => set({ routeStyle: v })} />
          </Field>
        );
      case "mode":
        return (
          <Field label={L} hint={l.mode === "street" ? "Street mode asks OpenStreetMap for the exact roads (needs internet)" : l.mode === "road" || l.mode === "rail" ? "Follows real highways / railways" : undefined}>
            <Select options={MODES} value={l.mode} onChange={(v) => set({ mode: v })} />
          </Field>
        );
      case "vehicle":
        return (
          <Field label={L}>
            <Select options={VEHICLES} value={l.vehicle} onChange={(v) => set({ vehicle: v })} />
          </Field>
        );
      case "cardStyle":
        return (
          <Field label={L}>
            <Seg options={LOCATION_CARD_STYLES} value={l.cardStyle} onChange={(v) => set({ cardStyle: v })} />
          </Field>
        );
      case "pinVariant":
        return (
          <Field label={L}>
            <Seg options={["pin", "dot", "target", "flag"] as const} value={l.pinVariant} onChange={(v) => set({ pinVariant: v })} />
          </Field>
        );
      case "color":
        return (
          <Field label={label ?? "Colour"}>
            <ColorInput value={l.color} onChange={(v) => set({ color: v }, "color")} />
          </Field>
        );
      case "text":
        return (
          <Field label={L} hint={hint}>
            {l.type === "text" ? <textarea value={l.text} rows={2} onChange={(e) => set({ text: e.target.value }, "text")} /> : <input type="text" value={l.text} onChange={(e) => set({ text: e.target.value }, "text")} />}
          </Field>
        );
      case "subtext":
        return (
          <Field label={L} hint={hint}>
            <input type="text" value={l.subtext} onChange={(e) => set({ subtext: e.target.value }, "subtext")} />
          </Field>
        );
      case "media":
        return (
          <Field label={L}>
            <MediaField kind={MEDIA_KIND[l.type] ?? "visual"} value={l.media} onChange={(v) => set({ media: v })} />
          </Field>
        );
      case "wave":
        return <Toggle label={L} checked={l.wave} onChange={(v) => set({ wave: v })} />;
      case "value":
        return l.type === "sfx" ? (
          <Slider label="Volume" value={l.value} min={0} max={1} step={0.05} onChange={(v) => set({ value: v }, "value")} hint="0 = the project's sound volume" />
        ) : (
          <Field label={L}>
            <NumberInput value={l.value} onChange={(v) => set({ value: v }, "value")} />
          </Field>
        );
      case "anchor":
        return (
          <Field label={L}>
            <AnchorPicker value={l.anchor} onChange={(v) => set({ anchor: v })} />
          </Field>
        );
      case "size":
        return <Slider label={L} value={l.size} min={4} max={SIZE_MAX[l.type] ?? 400} step={1} onChange={(v) => set({ size: v }, "size")} />;
    }
  };
  return (
    <>
      {meta.fields.map(([id, label, hint]) => (
        <React.Fragment key={id}>{field(id, label, hint)}</React.Fragment>
      ))}
    </>
  );
};

const SceneFields: React.FC<{ l: Layer; set: (patch: Partial<Layer>, tag?: string) => void }> = ({ l, set }) => {
  const t = l.scene ? TEMPLATE_BY_ID.get(l.scene) : undefined;
  return (
    <>
      <Field label="Animation" hint={t?.desc}>
        <select
          value={l.scene}
          onChange={(e) => {
            const nt = TEMPLATE_BY_ID.get(e.target.value)!;
            set({ scene: nt.id, sceneProps: sceneSettings(nt), name: humanize(nt.id) });
          }}
        >
          {Object.entries(FOLDERS).map(([f, name]) => (
            <optgroup key={f} label={name}>
              {TEMPLATES.filter((x) => x.folder === f).map((x) => (
                <option key={x.id} value={x.id}>
                  {humanize(x.id)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      {t ? (
        <>
          <div className="sec">
            <h3>
              Settings
              <span className="sp" />
              <button className="btn sm ghost" onClick={() => set({ sceneProps: sceneSettings(t) })} title="Back to this template's defaults">
                Reset
              </button>
            </h3>
          </div>
          <SchemaForm schema={t.schema} value={(l.sceneProps ?? {}) as Record<string, unknown>} onChange={(v) => set({ sceneProps: v }, "scene")} skip={BASE_KEYS} />
        </>
      ) : null}
    </>
  );
};

const MOVE_IDS = ["none", ...MOVE_PRESETS.map((p) => p.id)] as const;
const MOVE_LABELS: Record<string, string> = { none: "Keep the main camera", ...Object.fromEntries(MOVE_PRESETS.map((p) => [p.id, p.name])) };

const AttachBox: React.FC<{ mains: { id: string; name: string }[]; onAttach: (id: string) => void }> = ({ mains, onAttach }) => {
  const [to, setTo] = React.useState(mains[0].id);
  return (
    <div className="fxbox">
      <h4>Use as effect</h4>
      <p className="hint">Embed it in a main layer: for its duration it changes that layer (no extra layer on screen), then the main layer carries on.</p>
      <div className="rowf" style={{ flexWrap: "wrap" }}>
        <Select options={mains.map((m) => m.id) as unknown as readonly string[]} labels={Object.fromEntries(mains.map((m) => [m.id, m.name]))} value={mains.some((m) => m.id === to) ? to : mains[0].id} onChange={setTo} />
        <button className="btn sm" onClick={() => onAttach(mains.some((m) => m.id === to) ? to : mains[0].id)}>
          Attach as effect
        </button>
      </div>
    </div>
  );
};

/** Cinematic camera for a main layer: writes project camera keyframes over the layer's time (editable on the Camera row). */
const LayerCamera: React.FC<{ project: Project; l: Layer; update: Update }> = ({ project, l, update }) => {
  const [id, setId] = React.useState("sky-to-ground");
  const [busy, setBusy] = React.useState(false);
  const [len, setLen] = React.useState(5);
  const pr = PRESET_BY_ID.get(id)!;
  const dur = Math.max(0.5, Math.min(len, l.endSec - l.startSec));
  const place = l.places[l.type === "route" || l.type === "arrow" ? Math.floor((l.places.length - 1) / 2) : 0] ?? "";
  const ONE = CAMERA_PRESETS.filter((x) => !x.needsB);
  const apply = async () => {
    setBusy(true);
    try {
      const isArea = l.type === "highlight" || l.type === "region-media" || l.type === "cutout";
      const tg = await camTarget(
        place,
        project,
        l.level === "state" || l.level === "country" || l.level === "continent" ? l.level : "auto",
        isArea ? l.places : undefined,
        isArea ? l.disabledPlaces : undefined,
      );
      const zoom = tg.zoom ?? (["pin", "radar", "callout", "map-label"].includes(l.type) ? 6.8 : 3.2);
      update((p) => applyCameraPreset(p, id, { a: tg.place, b: tg.place, zoom, start: l.startSec, dur, strength: 1 }));
    } finally {
      setBusy(false);
    }
  };
  if (!place || l.type === "scene" || l.attachTo) return null;
  return (
    <div className="fxbox" style={{ borderColor: "rgba(143,219,229,0.5)", background: "rgba(143,219,229,0.06)" }}>
      <h4 style={{ color: "#8fdbe5" }}>Cinematic camera for this layer</h4>
      <Select options={ONE.map((x) => x.id) as unknown as readonly string[]} labels={Object.fromEntries(ONE.map((x) => [x.id, `${x.group} · ${x.name}`]))} value={id} onChange={setId} />
      <Field label="Camera move length (s)" hint="e.g. 5 = the sky-to-ground zoom lands on the place 5 s after the layer starts">
        <NumberInput value={len} min={0.5} max={120} step={0.5} onChange={(v) => setLen(clamp(v, 0.5, 120))} />
      </Field>
      <p className="hint">{pr.use}. Writes camera keyframes on <b>{place}</b> from {l.startSec.toFixed(1)}s to {(l.startSec + dur).toFixed(1)}s on the Camera row; drag or edit them there.</p>
      <button className="btn sm pri" disabled={busy} onClick={apply}>
        <Icon name="camera" />
        {busy ? "Framing…" : "Apply camera to this layer"}
      </button>
      {l.type === "route" ? <FollowRoute project={project} l={l} update={update} /> : null}
    </div>
  );
};

/** Chase-cam along the route's real geometry (snapped roads/rails, not a straight A→B move). */
const FollowRoute: React.FC<{ project: Project; l: Layer; update: Update }> = ({ project, l, update }) => {
  void project;
  const [zoom, setZoom] = React.useState(5);
  const [busy, setBusy] = React.useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const keys = await followRouteKeys(l, { zoom });
      update((p) => applyFollowRoute(p, l, keys));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("map-studio-error", { detail: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <hr style={{ border: 0, borderTop: "1px solid rgba(143,219,229,0.25)", margin: "8px 0" }} />
      <Slider label="Follow closeness" value={zoom} min={3} max={7.5} step={0.1} onChange={setZoom} hint="Higher = closer to the vehicle" fmt={(v) => v.toFixed(1)} />
      <button className="btn sm" disabled={busy} onClick={go} title="Camera keyframes that chase the vehicle along the real road/rail path, over the whole layer">
        <Icon name="route" />
        {busy ? "Routing…" : "Camera follows the route (3D chase)"}
      </button>
    </>
  );
};

const TRANS_LABELS: Record<string, string> = { dissolve: "Dissolve", zoom: "Zoom dissolve", cut: "Cut" };

/** "Use as": attach a layer as an effect on a main layer (it pauses the main animation), or keep it a layer. */
const EffectBox: React.FC<{ project: Project; l: Layer; i: number; update: Update }> = ({ project, l, i, update }) => {
  const mains = mainsOf(project).filter((m) => m.id !== l.uid);
  const setL = (fn: (x: Layer) => Layer, tag?: string) => update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? fn(x) : x)) }), tag ? `${tag}:${i}` : "");
  const fx: Fx | undefined = l.fx;
  const host = l.attachTo ? mains.find((m) => m.id === l.attachTo) : undefined;
  if (!fx || !l.attachTo) {
    if (!mains.length || l.type === "sfx") return null;
    return <AttachBox mains={mains} onAttach={(id) => update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? attachTo(p, x, id) : x)) }))} />;
  }
  const setFx = (patch: Partial<Fx>, tag?: string) => setL((x) => ({ ...x, fx: { ...(x.fx ?? fxDefaults()), ...patch } }), tag);
  const preset = PRESET_BY_ID.get(fx.camera);
  const modifier = host?.kind === "layer";
  const overlay = modifier && fx.blend === "overlay";
  return (
    <div className="fxbox">
      <h4>{modifier ? `Effect inside ${host!.name}` : `Effect on ${host ? host.name : "a missing layer"}`}</h4>
      {modifier ? (
        <p className="hint">
          {overlay ? (
            <>
              From {l.startSec.toFixed(2)}s to {l.endSec.toFixed(2)}s this draws <b>on top of {host!.name}</b>, which keeps playing underneath — its animation and the
              camera are not disturbed. No extra layer on screen.
            </>
          ) : (
            <>
              From {l.startSec.toFixed(2)}s to {l.endSec.toFixed(2)}s this replaces <b>{host!.name}</b> (no extra layer on screen), then {host!.name} carries on. The
              project camera keeps running unless you pick a camera for the effect.
            </>
          )}
        </p>
      ) : null}
      {modifier ? (
        <Field label="While it plays">
          <Seg
            options={["overlay", "replace"] as const}
            value={fx.blend === "replace" || fx.blend === undefined ? "replace" : "overlay"}
            labels={{ overlay: "On top (main keeps playing)", replace: "Replaces the main layer" }}
            onChange={(v) => setFx({ blend: v })}
          />
        </Field>
      ) : null}
      <div className="rowf" style={{ flexWrap: "wrap" }}>
        <Select
          options={mains.map((m) => m.id) as unknown as readonly string[]}
          labels={Object.fromEntries(mains.map((m) => [m.id, m.name]))}
          value={l.attachTo}
          onChange={(v) => update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? attachTo(p, x, v) : x)) }))}
        />
        <button className="btn sm" onClick={() => setL((x) => detach(x))} title="Make it a normal layer with its own track">
          Make it a layer
        </button>
      </div>
      {modifier ? null : <Toggle label="Pause the main animation while this plays" checked={fx.hold} onChange={(v) => setFx({ hold: v })} />}
      {fx.hold && !modifier ? (
        <Field label="After the effect" hint={fx.retime === "compress" ? "The main layer keeps its end time, so the rest of it plays faster." : "The main layer gets longer by this effect's length; the rest keeps its speed."}>
          <Seg options={["compress", "extend"] as const} value={fx.retime} labels={{ compress: "Keep end time", extend: "Make main longer" }} onChange={(v) => setFx({ retime: v })} />
        </Field>
      ) : null}
      <div className="grid2">
        <Field label="In">
          <Select options={FX_TRANSITIONS} labels={TRANS_LABELS} value={fx.transIn} onChange={(v) => setFx({ transIn: v })} />
        </Field>
        <Field label="In (s)">
          <NumberInput value={fx.tin} min={0} max={4} step={0.1} onChange={(v) => setFx({ tin: clamp(v, 0, 4) }, "tin")} />
        </Field>
        <Field label="Out">
          <Select options={FX_TRANSITIONS} labels={TRANS_LABELS} value={fx.transOut} onChange={(v) => setFx({ transOut: v })} />
        </Field>
        <Field label="Out (s)">
          <NumberInput value={fx.tout} min={0} max={4} step={0.1} onChange={(v) => setFx({ tout: clamp(v, 0, 4) }, "tout")} />
        </Field>
      </div>
      <Field label="Camera during the effect" hint={preset ? preset.use : modifier ? "The project camera keeps doing what its keyframes say." : l.attachTo === "camera" ? "The map camera stays where it paused." : "A locked frame on the effect's place."}>
        <Select options={MOVE_IDS} labels={MOVE_LABELS} value={(MOVE_IDS as readonly string[]).includes(fx.camera) ? (fx.camera as (typeof MOVE_IDS)[number]) : "push-in"} onChange={(v) => setFx({ camera: v })} />
      </Field>
      {fx.camera !== "none" ? (
        <>
          <Field label="Camera looks at" hint="Empty = this effect's own place">
            <PlaceInput value={fx.camPlace} onChange={(v) => setFx({ camPlace: v }, "camPlace")} />
          </Field>
          <Toggle label="Automatic zoom for the place" checked={fx.camZoom <= -5} onChange={(v) => setFx({ camZoom: v ? -9 : 4 })} />
          {fx.camZoom > -5 ? <Slider label="Zoom" value={fx.camZoom} min={-1} max={14} step={0.05} onChange={(v) => setFx({ camZoom: v }, "camZoom")} hint="0 ≈ world · 2 ≈ country · 5 ≈ state · 8 ≈ city" /> : null}
          <Slider label="Camera move strength" value={fx.camStrength} min={0} max={2} step={0.05} onChange={(v) => setFx({ camStrength: v }, "camStrength")} />
        </>
      ) : null}
    </div>
  );
};

export const LayerPanel: React.FC<{ project: Project; i: number; update: Update; frame: number; setSel: (s: Sel) => void; onSplit: () => void }> = ({ project, i, update, frame, setSel, onSplit }) => {
  const l = project.layers[i];
  if (!l) return null;
  const meta = LAYER_META[l.type];
  const gname = l.group?.trim();
  const groupPeers = gname ? project.layers.filter((x) => x.group?.trim() === gname && !x.attachTo) : [];
  const groupMasterIdx = gname ? project.layers.findIndex((x) => x.group?.trim() === gname && x.isGroupMaster && !x.attachTo) : -1;

  const set = (patch: Partial<Layer>, tag?: string) => {
    const isArea = l.type === "highlight" || l.type === "region-media" || l.type === "cutout";
    // If editing the combined Group Master (or turning a single area layer into a multi-region group), sync all child layers on the timeline!
    if (isArea && (l.isGroupMaster || (patch.places && patch.places.filter((x) => x.trim()).length > 1))) {
      let nextSelect = i;
      update((p) => {
        const res = buildGroupTimeline(p, i, patch);
        nextSelect = res.selectIdx;
        return res.project;
      }, tag ? `${tag}:${i}` : "");
      if (nextSelect !== i) setSel({ kind: "layer", i: nextSelect, key: null });
      return;
    }
    // If editing a child layer inside a group and toggling its `hidden` status, also update the Group Master's `disabledPlaces`!
    update(
      (p) => {
        const nextLayers = p.layers.map((x, j) => (j === i ? { ...x, ...patch } : x));
        if (gname && !l.isGroupMaster && patch.hidden !== undefined) {
          const norm = (s: string) => s.trim().toLowerCase();
          const childPlace = l.places[0]?.trim();
          if (childPlace) {
            return {
              ...p,
              layers: nextLayers.map((x) => {
                if (x.group?.trim() === gname && x.isGroupMaster) {
                  const curDis = x.disabledPlaces ?? [];
                  const nextDis = patch.hidden
                    ? [...curDis.filter((d) => norm(d) !== norm(childPlace)), childPlace]
                    : curDis.filter((d) => norm(d) !== norm(childPlace));
                  return { ...x, disabledPlaces: nextDis };
                }
                return x;
              }),
            };
          }
        }
        return { ...p, layers: nextLayers };
      },
      tag ? `${tag}:${i}` : "",
    );
  };

  const setGroupPeers = (patch: Partial<Layer>, tag?: string) => {
    if (!gname) return;
    update((p) => ({ ...p, layers: p.layers.map((x) => (x.group?.trim() === gname && !x.attachTo ? { ...x, ...patch } : x)) }), tag ? `grp:${tag}` : "");
  };
  const moveZ = (d: number) => {
    const j = i + d;
    if (j < 0 || j >= project.layers.length) return;
    update((p) => {
      const ls = [...p.layers];
      [ls[i], ls[j]] = [ls[j], ls[i]];
      return { ...p, layers: ls };
    });
    setSel({ kind: "layer", i: j, key: null });
  };
  const t = frame / FPS;
  return (
    <div className="pad">
      <div className="rowf">
        <span className={`ic g-${meta.group}`} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={LAYER_ICON[l.type]} size={15} />
        </span>
        <input type="text" value={l.name} onChange={(e) => set({ name: e.target.value }, "name")} aria-label="Layer name" style={{ fontWeight: 600 }} />
      </div>
      <p className="hint" style={{ marginTop: -6 }}>{meta.label} · {meta.desc}</p>
      <div className="grid3">
        <Field label="Start (s)">
          <NumberInput value={l.startSec} min={0} step={0.1} onChange={(v) => set({ startSec: r3(Math.min(v, l.endSec - 0.05)) }, "start")} />
        </Field>
        <Field label="End (s)">
          <NumberInput value={l.endSec} min={0} step={0.1} onChange={(v) => set({ endSec: r3(Math.max(v, l.startSec + 0.05)) }, "end")} />
        </Field>
        <Field label="Length">
          <NumberInput value={r3(l.endSec - l.startSec)} min={0.05} step={0.1} onChange={(v) => set({ endSec: r3(l.startSec + Math.max(0.05, v)) }, "len")} />
        </Field>
      </div>
      <div className="rowf" style={{ flexWrap: "wrap" }}>
        <button className="btn sm" onClick={() => set({ startSec: r3(t), endSec: r3(t + (l.endSec - l.startSec)) })} title="Move the layer so it starts at the playhead">
          Start at playhead
        </button>
        <button className="btn sm" onClick={onSplit} disabled={t <= l.startSec || t >= l.endSec} title="Split at the playhead (S)">
          <Icon name="split" />
          Split
        </button>
        <Toggle label="Hidden" checked={Boolean(l.hidden)} onChange={(v) => set({ hidden: v })} />
      </div>
      {l.attachTo ? null : (
        <Field label="Group" hint="Layers in the same group sit together on the timeline with a combined Group Master layer + individual member layers. Empty = no group.">
          <input
            type="text"
            list="layer-group-names"
            value={l.group ?? ""}
            placeholder="None"
            onChange={(e) => {
              const nextG = e.target.value;
              set({ group: nextG || undefined }, "group");
            }}
            onBlur={(e) => {
              const nextG = e.target.value.trim();
              if (!nextG) return;
              // When multiple area layers share this group name and there is no Group Master yet, automatically create the Combined Group Master!
              update((p) => {
                const peers = p.layers.filter((x) => x.group?.trim() === nextG && !x.attachTo);
                if (peers.length > 1 && !peers.some((x) => x.isGroupMaster)) {
                  const lead = peers[0];
                  const s0 = Math.min(...peers.map((x) => x.startSec));
                  const e0 = Math.max(...peers.map((x) => x.endSec));
                  const allPlaces = [...new Set(peers.flatMap((x) => x.places.map((pl) => pl.trim())).filter(Boolean))];
                  const disPlaces = [...new Set(peers.filter((x) => x.hidden).flatMap((x) => x.places.map((pl) => pl.trim())).filter(Boolean))];
                  const masterLayer = {
                    ...lead,
                    uid: Math.random().toString(36).slice(2, 10),
                    name: nextG,
                    group: nextG,
                    isGroupMaster: true,
                    startSec: s0,
                    endSec: e0,
                    places: allPlaces,
                    disabledPlaces: disPlaces,
                    mergeBorders: true,
                    text: nextG,
                    keys: [],
                  };
                  const lastIdx = Math.max(...peers.map((x) => p.layers.indexOf(x)));
                  return {
                    ...p,
                    layers: [...p.layers.slice(0, lastIdx + 1), masterLayer, ...p.layers.slice(lastIdx + 1)],
                  };
                }
                return p;
              });
            }}
          />
          <datalist id="layer-group-names">
            {[...new Set(project.layers.map((x) => x.group).filter((gr): gr is string => Boolean(gr?.trim())))].map((gr) => (
              <option key={gr} value={gr} />
            ))}
          </datalist>
        </Field>
      )}
      {gname && groupPeers.length > 1 ? (
        <div className="fxbox" style={{ padding: 8, gap: 6, borderColor: "rgba(143,219,229,0.45)", background: "rgba(143,219,229,0.06)" }}>
          <div className="rowf" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 11.5, color: "#8fdbe5" }}>
              {l.isGroupMaster
                ? `★ Combined Group Master (“${gname}”)`
                : `Member of Group “${gname}”`}
            </b>
            {!l.isGroupMaster && groupMasterIdx >= 0 ? (
              <button
                type="button"
                className="btn sm pri"
                style={{ fontSize: 11, minHeight: 22 }}
                onClick={() => setSel({ kind: "layer", i: groupMasterIdx, key: null })}
                title="Switch to the Combined Group Master layer to edit the whole group at once"
              >
                Edit Combined Group ★
              </button>
            ) : null}
          </div>
          <p className="hint" style={{ fontSize: 11 }}>
            {l.isGroupMaster
              ? "This master layer applies effects, waving flags & merged borders to the entire group combined. Click any member layer below (or on the timeline) to customize that single area specifically."
              : "You are editing this member layer specifically. Any custom style, colour, media, timing or keyframe you set here will apply to this area individually!"}
          </p>
          <div className="list" style={{ gap: 4 }}>
            {project.layers.map((peer, pi) => {
              if (peer.group?.trim() !== gname || peer.attachTo || peer.isGroupMaster) return null;
              const active = !peer.hidden;
              const isCur = pi === i;
              return (
                <div
                  key={pi}
                  className="rowf"
                  style={{
                    fontSize: 12,
                    opacity: active ? 1 : 0.5,
                    padding: "3px 6px",
                    borderRadius: 6,
                    background: isCur ? "rgba(240,169,59,0.16)" : "rgba(255,255,255,0.03)",
                    border: isCur ? "1px solid var(--primary)" : "1px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const norm = (s: string) => s.trim().toLowerCase();
                      const pl = peer.places[0]?.trim() ?? "";
                      update((p) => ({
                        ...p,
                        layers: p.layers.map((x, j) => {
                          if (j === pi) return { ...x, hidden: !checked };
                          if (x.group?.trim() === gname && x.isGroupMaster && pl) {
                            const curDis = x.disabledPlaces ?? [];
                            const nextDis = !checked
                              ? [...curDis.filter((d) => norm(d) !== norm(pl)), pl]
                              : curDis.filter((d) => norm(d) !== norm(pl));
                            return { ...x, disabledPlaces: nextDis };
                          }
                          return x;
                        }),
                      }));
                    }}
                    title={active ? "Selected in group (shows effect) — uncheck to unselect" : "Unselected in group (effect hidden on this area)"}
                    style={{ width: 15, height: 15, accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  <span
                    style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", fontWeight: isCur ? 600 : 400 }}
                    onClick={() => setSel({ kind: "layer", i: pi, key: null })}
                    title="Click to select and edit this specific member layer"
                  >
                    {peer.name}
                  </span>
                  <button
                    type="button"
                    className="btn sm ghost"
                    style={{ fontSize: 11, minHeight: 20, padding: "0 6px" }}
                    onClick={() => setSel({ kind: "layer", i: pi, key: null })}
                  >
                    {isCur ? "Editing" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className="btn sm icon ghost danger"
                    style={{ minHeight: 20, width: 22 }}
                    title={`Delete ${peer.name} from group`}
                    onClick={() => {
                      update((p) => removeLayerAt(p, pi, false));
                      if (isCur) setSel({ kind: "none" });
                    }}
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="rowf" style={{ flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                setGroupPeers({
                  type: l.type,
                  highlightStyle: l.highlightStyle,
                  color: l.color,
                  media: l.media,
                  wave: l.wave,
                  mergeBorders: l.mergeBorders,
                })
              }
              title="Reset all member layers in this group to match the combined group style, colour and flag/media"
            >
              Sync all members to this style
            </button>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                update((p) => ({
                  ...p,
                  layers: p.layers
                    .filter((x) => !(x.group?.trim() === gname && x.isGroupMaster))
                    .map((x) => (x.group?.trim() === gname ? { ...x, group: undefined } : x)),
                }));
                setSel({ kind: "none" });
              }}
              title="Ungroup: keep individual member layers on the timeline and remove the group header"
            >
              Ungroup
            </button>
            <button
              type="button"
              className="btn sm danger"
              onClick={() => {
                update((p) => removeGroupByName(p, gname));
                setSel({ kind: "none" });
              }}
              title="Delete this entire group and all its member layers"
            >
              <Icon name="trash" size={13} />
              Delete Group
            </button>
          </div>
        </div>
      ) : null}
      <LayerCamera project={project} l={l} update={update} />
      <EffectBox project={project} l={l} i={i} update={update} />
      {l.type === "scene" ? <SceneFields l={l} set={set} /> : <LayerFields l={l} set={set} />}
      <div className="rowf" style={{ flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
        <button className="btn sm" onClick={() => moveZ(1)} disabled={i === project.layers.length - 1} title="Bring forward">
          <Icon name="up" />
          Forward
        </button>
        <button className="btn sm" onClick={() => moveZ(-1)} disabled={i === 0} title="Send backward">
          <Icon name="down" />
          Backward
        </button>
        <button
          className="btn sm"
          onClick={() => {
            update((p) => ({ ...p, layers: [...p.layers.slice(0, i + 1), { ...JSON.parse(JSON.stringify(l)), name: `${l.name} copy` }, ...p.layers.slice(i + 1)] }));
            setSel({ kind: "layer", i: i + 1, key: null });
          }}
          title="Duplicate (Ctrl+D)"
        >
          <Icon name="copy" />
          Duplicate
        </button>
        <button
          className="btn sm danger"
          onClick={() => {
            update((p) => removeLayerAt(p, i, false));
            setSel({ kind: "none" });
          }}
          title={l.isGroupMaster ? "Delete entire group and all its member layers (Del)" : "Delete this layer (Del)"}
        >
          <Icon name="trash" />
          {l.isGroupMaster ? "Delete Group" : "Delete"}
        </button>
      </div>
    </div>
  );
};

/* ---------- keyframes ---------- */

const PRESETS = [
  ["pop", "Pop in"],
  ["slide-up", "Slide up"],
  ["zoom-in", "Zoom in"],
  ["spin-in", "Spin in"],
  ["fade", "Fade"],
] as const;

export const AnimatePanel: React.FC<{ project: Project; i: number; keyIndex: number | null; update: Update; frame: number; seek: (f: number) => void; setSel: (s: Sel) => void; recording: boolean; setRecording: (v: boolean) => void }> = ({
  project,
  i,
  keyIndex,
  update,
  frame,
  seek,
  setSel,
  recording,
  setRecording,
}) => {
  const l = project.layers[i];
  const order = useMemo(() => (l ? l.keys.map((k, idx) => ({ k, idx })).sort((a, b) => a.k.t - b.k.t) : []), [l]);
  if (!l) return null;
  const dur = layerDuration(l);
  const local = frame / FPS - l.startSec;
  const inside = local >= -1e-6 && local <= dur + 1e-6;
  const setKeys = (keys: Layer["keys"], tag?: string) => update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? { ...x, keys } : x)) }), tag);
  const movable = LAYER_META[l.type].movable;
  return (
    <div className="pad">
      <p className="hint">
        Keyframes animate <b>opacity, scale, position and rotation</b> of “{l.name}”. Times are seconds from the layer's start. With no keyframes the layer fades in and out by itself.
      </p>
      <div className="rowf" style={{ flexWrap: "wrap" }}>
        <button
          className="btn sm pri"
          disabled={!inside}
          onClick={() => {
            const r = addKeyAt(l, local);
            setKeys(r.keys);
            setSel({ kind: "layer", i, key: r.index });
          }}
          title="Add a keyframe at the playhead (K)"
        >
          <Icon name="key" />
          Add keyframe here
        </button>
        <button className={`btn sm ${recording ? "on rec" : ""}`} onClick={() => setRecording(!recording)} title="When on, dragging/scaling on the preview writes keyframes at the playhead">
          <Icon name="rec" />
          {recording ? "Recording" : "Record"}
        </button>
        {l.keys.length ? (
          <button className="btn sm ghost danger" onClick={() => setKeys([])} title="Remove all keyframes (auto fade)">
            Clear
          </button>
        ) : null}
      </div>
      {!inside ? <p className="hint">Move the playhead inside the layer ({fmtTime(l.startSec)} – {fmtTime(l.endSec)}) to add keyframes.</p> : null}
      {movable ? <p className="hint">Tip: drag the layer on the preview to move it, scroll to scale, Shift+scroll to rotate. Turn on Record to keyframe those moves.</p> : null}
      <div className="sec">
        <h3>Presets</h3>
        <div className="seg">
          {PRESETS.map(([id, name]) => (
            <button key={id} type="button" onClick={() => setKeys(presetKeys(id, Math.max(0.7, dur - 0.45)).map((k) => ({ ...k, t: r3(Math.min(k.t, dur)) })))}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="sec">
        <h3>Keyframes ({l.keys.length})</h3>
        {order.length === 0 ? <div className="empty-note">No keyframes yet.</div> : null}
        {order.map(({ k, idx }) => {
          const isSel = keyIndex === idx;
          const setK = (patch: Partial<typeof k>, tag?: string) => setKeys(l.keys.map((x, m) => (m === idx ? { ...x, ...patch } : x)), tag ? `${tag}:${i}:${idx}` : "");
          return (
            <details key={idx} className={`card2 ${isSel ? "sel" : ""}`} open={isSel}>
              <summary
                onClick={(e) => {
                  e.preventDefault();
                  setSel({ kind: "layer", i, key: isSel ? null : idx });
                  if (!isSel) seek(Math.round((l.startSec + k.t) * FPS));
                }}
              >
                <span className="diamond-ic" />
                <span style={{ flex: 1 }}>
                  {k.t.toFixed(2)}s <span className="hint">(at {(l.startSec + k.t).toFixed(2)}s)</span>
                </span>
                <span className="hint">{k.ease}</span>
                <button
                  className="btn sm icon ghost danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setKeys(l.keys.filter((_, m) => m !== idx));
                    setSel({ kind: "layer", i, key: null });
                  }}
                  aria-label="Delete keyframe"
                >
                  <Icon name="trash" />
                </button>
              </summary>
              {isSel ? (
                <div className="body">
                  <div className="grid2">
                    <Field label="Time (s from start)">
                      <NumberInput value={k.t} min={0} max={dur} step={1 / FPS} onChange={(v) => setK({ t: r3(clamp(v, 0, dur)) }, "kt")} />
                    </Field>
                    <Field label="Easing in">
                      <Select options={EASES} value={k.ease} onChange={(v) => setK({ ease: v })} />
                    </Field>
                  </div>
                  <Slider label="Opacity" value={k.opacity} min={0} max={1} step={0.01} onChange={(v) => setK({ opacity: v }, "ko")} />
                  <Slider label="Scale" value={k.scale} min={0} max={5} step={0.01} onChange={(v) => setK({ scale: v }, "ks")} />
                  <div className="grid3">
                    <Field label="X (px)">
                      <NumberInput value={k.x} step={1} onChange={(v) => setK({ x: v }, "kx")} />
                    </Field>
                    <Field label="Y (px)">
                      <NumberInput value={k.y} step={1} onChange={(v) => setK({ y: v }, "ky")} />
                    </Field>
                    <Field label="Rotate (°)">
                      <NumberInput value={k.rotate} step={1} onChange={(v) => setK({ rotate: v }, "kr")} />
                    </Field>
                  </div>
                </div>
              ) : null}
            </details>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- camera ---------- */

const PRESET_IDS = CAMERA_PRESETS.map((p) => p.id);
const PRESET_LABELS = Object.fromEntries(CAMERA_PRESETS.map((p) => [p.id, `${p.group} · ${p.name}`]));

/** Cinematic camera presets: write a designed camera move as ordinary, editable keyframes. */
const CinematicPresets: React.FC<{ project: Project; update: Update; frame: number }> = ({ project, update, frame }) => {
  const first = project.camera[0]?.place || "India";
  const [id, setId] = React.useState("sky-to-ground");
  const [a, setA] = React.useState(first);
  const [b, setB] = React.useState("");
  const [zoom, setZoom] = React.useState(2.4);
  const [zoomB, setZoomB] = React.useState(4.8);
  const [dur, setDur] = React.useState(6);
  const [strength, setStrength] = React.useState(1);
  const [autoZ, setAutoZ] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const pr = PRESET_BY_ID.get(id)!;
  const start = r3(frame / FPS);
  const apply = async () => {
    setBusy(true);
    try {
      const ta = await camTarget(a, project);
      const tb = pr.needsB ? await camTarget(b || a, project) : ta;
      update((p) =>
        applyCameraPreset(p, id, {
          a: ta.place,
          b: tb.place,
          zoom: autoZ && ta.zoom !== null ? ta.zoom : zoom,
          zoomB: autoZ && tb.zoom !== null ? tb.zoom : zoomB,
          start,
          dur,
          strength,
        }),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="card2" open>
      <summary>
        <span className="diamond-ic" style={{ background: "var(--primary)" }} />
        <span style={{ flex: 1 }}>Cinematic presets</span>
        <span className="hint">{CAMERA_PRESETS.length} moves</span>
      </summary>
      <div className="body">
        <Field label="Shot" hint={pr.use}>
          <Select options={PRESET_IDS as unknown as readonly string[]} labels={PRESET_LABELS} value={id} onChange={setId} />
        </Field>
        <Field label={pr.needsB ? "From (place A)" : "Subject"}>
          <PlaceInput value={a} onChange={setA} />
        </Field>
        <Toggle label="Automatic zoom (fit countries and states to the frame)" checked={autoZ} onChange={setAutoZ} />
        <Slider label={pr.needsB ? "Zoom at A" : "Zoom"} value={zoom} min={-1} max={14} step={0.05} onChange={setZoom} hint="Used for cities/landmarks, or when automatic zoom is off · 0 ≈ world · 2 ≈ country · 5 ≈ state · 8 ≈ city" />
        {pr.needsB ? (
          <>
            <Field label="To (place B)">
              <PlaceInput value={b} onChange={setB} />
            </Field>
            <Slider label="Zoom at B" value={zoomB} min={-1} max={14} step={0.05} onChange={setZoomB} />
          </>
        ) : null}
        <div className="grid2">
          <Field label="Starts at (s)" hint="The playhead">
            <NumberInput value={start} min={0} step={0.1} onChange={() => undefined} />
          </Field>
          <Field label="Length (s)">
            <NumberInput value={dur} min={0.5} max={120} step={0.5} onChange={(v) => setDur(clamp(v, 0.5, 120))} />
          </Field>
        </div>
        <Slider label="Strength" value={strength} min={0} max={2} step={0.05} onChange={setStrength} hint="How big the move is (1 = designed)" />
        <button
          className="btn sm pri"
          disabled={busy || !a.trim() || (pr.needsB && !b.trim())}
          onClick={apply}
          title="Writes camera keyframes from the playhead; keys already in that range are replaced. Every key stays editable."
        >
          <Icon name="camera" />
          Apply at playhead
        </button>
      </div>
    </details>
  );
};

export const CameraPanel: React.FC<{ project: Project; keyIndex: number | null; update: Update; frame: number; seek: (f: number) => void; setSel: (s: Sel) => void; onAdd: () => void }> = ({
  project,
  keyIndex,
  update,
  frame,
  seek,
  setSel,
  onAdd,
}) => {
  const order = project.camera.map((k, idx) => ({ k, idx })).sort((a, b) => a.k.t - b.k.t);
  const setK = (idx: number, patch: Partial<CamKey>, tag?: string) => update((p) => ({ ...p, camera: p.camera.map((x, m) => (m === idx ? { ...x, ...patch } : x)) }), tag ? `${tag}:cam:${idx}` : "");
  return (
    <div className="pad">
      <p className="hint">Each camera keyframe frames a place at a zoom, rotation (bearing) and 3D tilt (pitch). The camera travels between them: <b>fly</b> zooms out and back in like Google Earth, <b>smooth</b> glides, <b>cut</b> jumps.</p>
      <CinematicPresets project={project} update={update} frame={frame} />
      <div className="rowf">
        <button className="btn sm pri" onClick={onAdd}>
          <Icon name="camera" />
          Add camera key here
        </button>
        {project.camera.length ? (
          <button className="btn sm ghost danger" onClick={() => update((p) => ({ ...p, camera: [] }))} title="No keys = the camera frames all layers">
            Clear all
          </button>
        ) : null}
      </div>
      {!project.camera.length ? <div className="empty-note">No camera keys: the camera frames all your layers automatically.</div> : null}
      {order.map(({ k, idx }) => {
        const isSel = keyIndex === idx;
        return (
          <details key={idx} className={`card2 ${isSel ? "sel" : ""}`} open={isSel}>
            <summary
              onClick={(e) => {
                e.preventDefault();
                setSel({ kind: "cam", key: isSel ? null : idx });
                if (!isSel) seek(Math.round(k.t * FPS));
              }}
            >
              <span className="diamond-ic" style={{ background: "#8fdbe5" }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {k.t.toFixed(2)}s · {k.place}
              </span>
              <span className="hint">{k.move}</span>
              <button
                className="btn sm icon ghost danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  update((p) => ({ ...p, camera: p.camera.filter((_, m) => m !== idx) }));
                  setSel({ kind: "cam", key: null });
                }}
                aria-label="Delete camera key"
              >
                <Icon name="trash" />
              </button>
            </summary>
            {isSel ? (
              <div className="body">
                <div className="grid2">
                  <Field label="Time (s)">
                    <NumberInput value={k.t} min={0} step={0.1} onChange={(v) => setK(idx, { t: r3(Math.max(0, v)) }, "t")} />
                  </Field>
                  <Field label="Easing">
                    <Select options={EASES} value={k.ease} onChange={(v) => setK(idx, { ease: v })} />
                  </Field>
                </div>
                <Field label="Look at" hint='Place, landmark, country or "lat, lon"'>
                  <PlaceInput value={k.place} onChange={(v) => setK(idx, { place: v })} />
                </Field>
                <Slider label="Zoom" value={k.zoom} min={-1} max={14} step={0.05} onChange={(v) => setK(idx, { zoom: v }, "zoom")} hint="0 ≈ whole world · 2 ≈ a country · 5 ≈ a state · 8 ≈ a city" />
                <Slider label="Bearing (rotation °)" value={k.bearing} min={-360} max={360} step={1} onChange={(v) => setK(idx, { bearing: v }, "bearing")} />
                <Slider label="Pitch (3D tilt °)" value={k.pitch} min={0} max={60} step={1} onChange={(v) => setK(idx, { pitch: v }, "pitch")} />
                <Field label="How the camera gets here">
                  <Seg options={["fly", "smooth", "linear", "cut"] as const} value={k.move} onChange={(v) => setK(idx, { move: v })} />
                </Field>
              </div>
            ) : null}
          </details>
        );
      })}
    </div>
  );
};

/* ---------- project ---------- */

export const ProjectPanel: React.FC<{ project: Project; update: Update }> = ({ project, update }) => {
  const set = (patch: Partial<Project>, tag?: string) => update((p) => ({ ...p, ...patch }), tag ? `proj:${tag}` : "");
  const themeLabels = Object.fromEntries(THEME_NAMES.map((n) => [n, THEMES[n].name]));
  return (
    <div className="pad">
      <Field label="Project name">
        <input type="text" value={project.name} onChange={(e) => set({ name: e.target.value }, "name")} />
      </Field>
      <div className="grid2">
        <Field label="Frame size">
          <Select options={Object.keys(FORMATS) as FormatName[]} value={project.format} onChange={(v) => set({ format: v })} />
        </Field>
        <Field label="Length (s)">
          <NumberInput value={project.durationSec} min={0.5} max={600} step={0.5} onChange={(v) => set({ durationSec: clamp(v, 0.5, 600) }, "dur")} />
        </Field>
      </div>
      <Field label="Map look">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5 }}>
          {THEME_NAMES.map((n) => {
            const th = THEMES[n] as unknown as { land: string; ocean: string; accent: string };
            return (
              <button key={n} type="button" className={`btn sm ${project.theme === n ? "on" : ""}`} onClick={() => set({ theme: n })} style={{ justifyContent: "flex-start", gap: 6, padding: "0 6px", minWidth: 0 }} title={themeLabels[n]}>
                <span style={{ width: 16, height: 16, borderRadius: 4, flex: "none", background: `linear-gradient(135deg, ${th.ocean} 0 50%, ${th.land} 50% 100%)`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.15), 0 0 0 2px ${th.accent}33` }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{themeLabels[n]}</span>
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Projection">
        <Seg options={["globe", "mercator", "flat", "natural"] as const} value={project.projection} onChange={(v) => set({ projection: v })} />
      </Field>
      <Field label="Borders" hint="India always has full Jammu & Kashmir and Ladakh (PoK, Gilgit-Baltistan, Siachen, Aksai Chin, Shaksgam) and full Arunachal Pradesh, as per the Survey of India. 'Other disputes' only changes other regions (Western Sahara, Kosovo, Somaliland, N. Cyprus) to the lines they have on the ground.">
        <Seg options={["india", "world"] as const} value={project.borders} onChange={(v) => set({ borders: v })} labels={{ india: "Official (India)", world: "Other disputes de facto" }} />
      </Field>
      <div className="sec">
        <h3>Map details</h3>
        <div className="grid2">
          {(
            [
              ["countryLabels", "Country names"],
              ["states", "State borders"],
              ["roads", "Highways"],
              ["rail", "Railways"],
              ["rivers", "Rivers and lakes"],
              ["graticule", "Lat/lon grid"],
            ] as const
          ).map(([k, name]) => (
            <Toggle key={k} label={name} checked={project.mapLayers[k]} onChange={(v) => set({ mapLayers: { ...project.mapLayers, [k]: v } })} />
          ))}
        </div>
      </div>
      <div className="sec">
        <h3>Sun</h3>
        <Toggle label="Real day / night shading" checked={project.dayNight} onChange={(v) => set({ dayNight: v })} />
        {project.dayNight ? (
          <Field label="Date and time (UTC)">
            <input
              type="datetime-local"
              value={(project.dateTimeUtc || "2025-06-21T06:00:00Z").slice(0, 16)}
              onChange={(e) => set({ dateTimeUtc: `${e.target.value}:00Z` })}
            />
          </Field>
        ) : null}
      </div>
      <div className="sec">
        <h3>Sound</h3>
        <Toggle label="Sound effects" checked={project.sfx} onChange={(v) => set({ sfx: v })} />
        <Slider label="Sound volume" value={project.sfxVolume} min={0} max={1} step={0.05} onChange={(v) => set({ sfxVolume: v }, "vol")} />
      </div>
    </div>
  );
};
