import React, { useState } from "react";
import { FOLDERS, TEMPLATES, type TemplateDef } from "../src/registry";
import { LAYER_META, LAYER_ORDER, humanize, templateDuration, type LayerType, type Project } from "./model";
import { Icon, LAYER_ICON } from "./ui";
import { Thumb, UploadZone, useMedia } from "./Media";
import { QuickCreate, type QuickApply } from "./QuickCreate";
import type { MediaItem } from "./api";

type Tab = "quick" | "add" | "templates" | "media";

export const Library: React.FC<{
  onAdd: (type: LayerType) => void;
  onAddScene: (t: TemplateDef) => void;
  onNewFromTemplate: (t: TemplateDef) => void;
  onUseMedia: (m: MediaItem) => void;
  addMode: "effect" | "layer";
  setAddMode: (m: "effect" | "layer") => void;
  /** Main layer under the playhead that an effect would attach to. */
  mainName: string | null;
  /** Quick Create: playhead time, current project and the apply callback. */
  quick: { at: number; project: Project; onApply: QuickApply };
}> = ({ onAdd, onAddScene, onNewFromTemplate, onUseMedia, addMode, setAddMode, mainName, quick }) => {
  const [tab, setTab] = useState<Tab>("quick");
  const [q, setQ] = useState("");
  const { items, upload, uploading, online } = useMedia();
  const groups: [string, LayerType[]][] = [
    ["On the map", LAYER_ORDER.filter((t) => LAYER_META[t].group === "map")],
    ["On screen", LAYER_ORDER.filter((t) => LAYER_META[t].group === "screen")],
    ["Sound and scenes", LAYER_ORDER.filter((t) => LAYER_META[t].group === "audio" || LAYER_META[t].group === "scene")],
  ];
  const ql = q.toLowerCase();
  return (
    <aside className="panel">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "quick"} onClick={() => setTab("quick")}>
          Quick
        </button>
        <button role="tab" aria-selected={tab === "add"} onClick={() => setTab("add")}>
          Add
        </button>
        <button role="tab" aria-selected={tab === "templates"} onClick={() => setTab("templates")}>
          Templates
        </button>
        <button role="tab" aria-selected={tab === "media"} onClick={() => setTab("media")}>
          Media
        </button>
      </div>
      <div className="scroll">
        {tab === "quick" ? (
          <QuickCreate at={quick.at} project={quick.project} onApply={quick.onApply} />
        ) : tab === "add" ? (
          <div className="pad">
            <div className="addmode">
              <span>Add as</span>
              <div className="seg">
                <button className={addMode === "effect" ? "on" : ""} onClick={() => setAddMode("effect")} title="Goes inside the layer at the playhead and changes it for its duration, then that layer carries on">
                  Effect
                </button>
                <button className={addMode === "layer" ? "on" : ""} onClick={() => setAddMode("layer")} title="A separate layer with its own timeline track">
                  Layer
                </button>
              </div>
            </div>
            <p className="hint">
              {addMode === "effect"
                ? mainName
                  ? <>Click, or drag onto a layer's bar: it goes <b>inside {mainName}</b> at the playhead and changes it for its duration (e.g. India → Bihar), then <b>{mainName}</b> carries on. No extra layer on screen.</>
                  : "No layer under the playhead yet, so this becomes a main layer. Then add effects into it at any time."
                : "Click to add at the playhead, or drag onto the timeline. Every layer gets its own bar and can be keyframed."}
            </p>
            {groups.map(([name, types]) => (
              <div className="sec" key={name}>
                <h3>{name}</h3>
                <div className="addgrid">
                  {types.map((t) => (
                    <button
                      key={t}
                      className="addbtn"
                      onClick={() => onAdd(t)}
                      title={LAYER_META[t].desc}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/x-map-layer", t);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <span className={`ic g-${LAYER_META[t].group}`}>
                        <Icon name={LAYER_ICON[t]} />
                      </span>
                      <b>{LAYER_META[t].label}</b>
                      <small>{LAYER_META[t].desc}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : tab === "templates" ? (
          <div className="pad">
            <input className="search" type="search" placeholder="Search 30 animations" value={q} onChange={(e) => setQ(e.target.value)} />
            {Object.entries(FOLDERS).map(([f, name]) => {
              const list = TEMPLATES.filter((t) => t.folder === f && (!ql || t.id.toLowerCase().includes(ql) || t.desc.toLowerCase().includes(ql) || name.toLowerCase().includes(ql)));
              if (!list.length) return null;
              return (
                <div className="sec" key={f}>
                  <h3>{name}</h3>
                  {list.map((t) => (
                    <div className="tpl" key={t.id}>
                      <b>{humanize(t.id)}</b>
                      <small>{t.desc}</small>
                      <div className="acts">
                        <button className="btn sm" onClick={() => onAddScene(t)} title="Add as a scene layer at the playhead">
                          <Icon name="plus" />
                          Add to timeline
                        </button>
                        <button className="btn sm ghost" onClick={() => onNewFromTemplate(t)} title="Start a new project from it">
                          New project
                        </button>
                        <span className="hint" style={{ marginLeft: "auto", alignSelf: "center" }}>
                          {templateDuration(t)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pad">
            <UploadZone accept="image/*,video/*,audio/*,.gpx,.geojson,.json" onFiles={(f) => upload(f)} busy={uploading} disabled={!online} />
            {!online ? <p className="hint">The studio server is not running, so files can't be added. Start the studio with “Start Map Studio”.</p> : null}
            {items.length ? (
              <div className="media-grid">
                {items.map((m) => (
                  <button key={m.path} className="mitem" onClick={() => onUseMedia(m)} title={`${m.path} · click to add to the timeline`}>
                    <Thumb path={m.path} kind={m.kind} />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            ) : online ? (
              <p className="hint">Your photos, videos and sounds appear here. Files are copied into the studio's public/media folder.</p>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
};
