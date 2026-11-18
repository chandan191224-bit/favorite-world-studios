import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FPS, LAYER_META, clamp, detach, fmtTime, groupOf, newUid, r3, removeGroupByName, removeLayerAt, splitLayer, type Layer, type LayerType, type Project } from "./model";
import { HIGHLIGHT_STYLES, type HighlightStyle } from "../src/map/highlightStyles";
import { ROUTE_STYLES } from "../src/map/overlays";
import { VEHICLES } from "../src/map/icons";
import { fxDefaults, type Fx } from "../src/scenes/composer/effects";
import { GROUP_COLOR, Icon, LAYER_ICON } from "./ui";

export type Sel = { kind: "layer"; i: number; key: number | null } | { kind: "cam"; key: number | null } | { kind: "none" };

const LABEL_W = 216;
const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
const QUICK_COLORS = ["auto", "#ffb347", "#ff4d5e", "#3fa7b5", "#57d18b", "#9b84f5", "#ffffff"];

type CtxTarget =
  | { kind: "layer"; i: number; x: number; y: number }
  | { kind: "group"; name: string; x: number; y: number };

type Props = {
  project: Project;
  update: (fn: (p: Project) => Project, tag?: string) => void;
  frame: number;
  seek: (frame: number) => void;
  sel: Sel;
  setSel: (s: Sel) => void;
  toolbar: React.ReactNode;
  /** Library item dropped on the timeline: on a scene/camera row it attaches as an effect (mainId), else a layer. */
  onDropAdd?: (type: LayerType, at: number, mainId: string | null) => void;
};

export const Timeline: React.FC<Props> = ({ project, update, frame, seek, sel, setSel, toolbar, onDropAdd }) => {
  const box = useRef<HTMLDivElement>(null);
  const [pps, setPps] = useState(60);
  const [fit, setFit] = useState(true);
  const [snapOn, setSnapOn] = useState(true);
  const [snapAt, setSnapAt] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxTarget | null>(null);
  const total = project.durationSec;
  const t = frame / FPS;

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: PointerEvent) => {
      const el = document.getElementById("tl-ctx-menu");
      if (el && el.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCtxMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  const fitPps = useCallback(() => {
    const w = box.current?.clientWidth ?? 800;
    return Math.max(4, (w - LABEL_W - 36) / Math.max(1, total * 1.03));
  }, [total]);

  useLayoutEffect(() => {
    if (!fit) return;
    const apply = () => setPps(fitPps());
    apply();
    const ro = new ResizeObserver(apply);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [fit, fitPps]);

  const span = Math.max(total * 1.12, total + 1.5);
  const laneW = span * pps;

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const x = LABEL_W + t * pps;
    if (x < el.scrollLeft + LABEL_W + 10 || x > el.scrollLeft + el.clientWidth - 30) el.scrollLeft = Math.max(0, x - LABEL_W - 60);
  }, [t, pps]);

  // Ctrl/Cmd + wheel zooms around the pointer.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - LABEL_W + el.scrollLeft;
      const at = px / pps;
      const next = clamp(pps * Math.exp(-e.deltaY * 0.002), 2, 900);
      setFit(false);
      setPps(next);
      requestAnimationFrame(() => (el.scrollLeft = at * next - (e.clientX - rect.left - LABEL_W)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [pps]);

  /* ---------- snapping ---------- */

  const snapTargets = useCallback(
    (exclude: number | "cam" | null) => {
      const c = [0, total, t];
      project.layers.forEach((l, i) => {
        if (i === exclude) return;
        c.push(l.startSec, l.endSec);
      });
      if (exclude !== "cam") for (const k of project.camera) c.push(k.t);
      return c;
    },
    [project.layers, project.camera, total, t],
  );

  const snap = (v: number, targets: number[], alt: boolean) => {
    const q = Math.round(v * FPS) / FPS;
    if (!snapOn || alt) return { v: q, at: null as number | null };
    let best: number | null = null;
    for (const c of targets) if (Math.abs(c - v) * pps < 7 && (best === null || Math.abs(c - v) < Math.abs(best - v))) best = c;
    return best === null ? { v: q, at: null } : { v: best, at: best };
  };

  /* ---------- dragging ---------- */

  const drag = (e: React.PointerEvent, onMove: (dt: number, ev: PointerEvent) => void, onEnd?: () => void) => {
    e.preventDefault();
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => onMove((ev.clientX - x0) / pps, ev);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setSnapAt(null);
      onEnd?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const timeAt = (clientX: number) => {
    const el = box.current!;
    const rect = el.getBoundingClientRect();
    return clamp((clientX - rect.left - LABEL_W + el.scrollLeft) / pps, 0, span);
  };

  const seekTo = (sec: number) => seek(clamp(Math.round(sec * FPS), 0, Math.max(0, Math.round(total * FPS) - 1)));

  const onRuler = (e: React.PointerEvent) => {
    seekTo(timeAt(e.clientX));
    drag(e, (_dt, ev) => seekTo(timeAt(ev.clientX)));
  };

  const extendToFit = (tag: string) =>
    update((p) => {
      const end = Math.max(...p.layers.map((l) => l.endSec), ...p.camera.map((k) => k.t), 0);
      return end > p.durationSec + 1e-6 ? { ...p, durationSec: Math.min(600, Math.ceil(end * 10) / 10) } : p;
    }, tag);

  const onBar = (e: React.PointerEvent, i: number, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSel({ kind: "layer", i, key: null });
    const l0 = project.layers[i];
    const dur = l0.endSec - l0.startSec;
    const tag = `bar:${i}:${Date.now()}`;
    const targets = snapTargets(i);
    drag(
      e,
      (dt, ev) => {
        let next: Layer;
        if (mode === "move") {
          const a = snap(l0.startSec + dt, targets, ev.altKey);
          const b = snap(l0.endSec + dt, targets, ev.altKey);
          const useB = b.at !== null && (a.at === null || Math.abs(b.v - (l0.endSec + dt)) < Math.abs(a.v - (l0.startSec + dt)));
          const s = Math.max(0, useB ? b.v - dur : a.v);
          setSnapAt(useB ? b.at : a.at);
          next = { ...l0, startSec: r3(s), endSec: r3(s + dur) };
        } else if (mode === "l") {
          const a = snap(l0.startSec + dt, targets, ev.altKey);
          const s = clamp(a.v, 0, l0.endSec - 1 / FPS);
          const d = s - l0.startSec;
          setSnapAt(a.at);
          next = { ...l0, startSec: r3(s), keys: l0.keys.map((k) => ({ ...k, t: r3(k.t - d) })) };
        } else {
          const b = snap(l0.endSec + dt, targets, ev.altKey);
          setSnapAt(b.at);
          next = { ...l0, endSec: r3(Math.max(l0.startSec + 1 / FPS, b.v)) };
        }
        const gname = l0.isGroupMaster ? l0.group?.trim() : undefined;
        update(
          (p) => ({
            ...p,
            layers: p.layers.map((x, j) => {
              if (j === i) return next;
              if (
                gname &&
                !x.isGroupMaster &&
                !x.attachTo &&
                x.group?.trim() === gname &&
                Math.abs(x.startSec - l0.startSec) < 0.02 &&
                Math.abs(x.endSec - l0.endSec) < 0.02
              ) {
                return { ...x, startSec: next.startSec, endSec: next.endSec };
              }
              return x;
            }),
          }),
          tag,
        );
      },
      () => extendToFit(tag),
    );
  };

  const onKey = (e: React.PointerEvent, i: number, ki: number) => {
    e.stopPropagation();
    setSel({ kind: "layer", i, key: ki });
    const l = project.layers[i];
    const k0 = l.keys[ki];
    const tag = `key:${i}:${ki}:${Date.now()}`;
    const targets = snapTargets(i);
    drag(e, (dt, ev) => {
      const a = snap(l.startSec + k0.t + dt, targets, ev.altKey);
      setSnapAt(a.at);
      const nt = r3(clamp(a.v - l.startSec, 0, l.endSec - l.startSec));
      update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? { ...x, keys: x.keys.map((k, m) => (m === ki ? { ...k, t: nt } : k)) } : x)) }), tag);
    });
  };

  const onCamKey = (e: React.PointerEvent, ki: number) => {
    e.stopPropagation();
    setSel({ kind: "cam", key: ki });
    const k0 = project.camera[ki];
    const tag = `cam:${ki}:${Date.now()}`;
    const targets = snapTargets("cam");
    drag(
      e,
      (dt, ev) => {
        const a = snap(k0.t + dt, targets, ev.altKey);
        setSnapAt(a.at);
        const nt = r3(Math.max(0, a.v));
        update((p) => ({ ...p, camera: p.camera.map((k, m) => (m === ki ? { ...k, t: nt } : k)) }), tag);
      },
      () => extendToFit(tag),
    );
  };

  const onEnd = (e: React.PointerEvent) => {
    e.stopPropagation();
    const tag = `end:${Date.now()}`;
    const d0 = total;
    const targets = project.layers.map((l) => l.endSec);
    drag(e, (dt, ev) => {
      const a = snap(d0 + dt, targets, ev.altKey);
      setSnapAt(a.at);
      update((p) => ({ ...p, durationSec: r3(clamp(a.v, 0.5, 600)) }), tag);
    });
  };

  /* ---------- ruler ---------- */

  const ticks = useMemo(() => {
    const step = STEPS.find((s) => s * pps >= 64) ?? 120;
    const minor = step / 5;
    const out: { x: number; major: boolean; label: string }[] = [];
    for (let v = 0; v <= span + 1e-6; v += minor) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      if (!major && minor * pps < 7) continue;
      const s = Math.round(v * 100) / 100;
      out.push({ x: v * pps, major, label: step < 1 ? `${s.toFixed(1)}s` : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : `${s}s` });
    }
    return out;
  }, [pps, span]);

  const selLayer = sel.kind === "layer" ? sel.i : -1;
  // effects attached to a main layer live inside that layer's bar, not on their own track (2026-10-30)
  const isFx = (l: Layer) => Boolean(l.attachTo && l.fx && (l.attachTo === "camera" || project.layers.some((m) => m.uid === l.attachTo && !m.attachTo)));
  const fxOf = (id: string) => project.layers.map((l, i) => ({ l, i })).filter(({ l }) => l.attachTo === id && isFx(l));
  const rows = project.layers.map((l, i) => ({ l, i })).filter(({ l }) => !isFx(l)).reverse(); // top row = front-most layer

  /* ---------- layer groups (2026-11-13): same group = one block, movable together ---------- */
  type Row = { l: Layer; i: number };
  type Block = { kind: "layer"; row: Row } | { kind: "group"; name: string; rows: Row[] };
  const blocks: Block[] = [];
  {
    const seen = new Map<string, Extract<Block, { kind: "group" }>>();
    for (const row of rows) {
      const gname = row.l.group?.trim();
      if (!gname) {
        blocks.push({ kind: "layer", row });
        continue;
      }
      let b = seen.get(gname);
      if (!b) {
        b = { kind: "group", name: gname, rows: [] };
        seen.set(gname, b);
        blocks.push(b);
      }
      b.rows.push(row);
    }
  }
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (name: string) => setClosedGroups((c) => ({ ...c, [name]: !c[name] }));
  /** Drag a group's bar: every member layer (and the effects inside them) shifts together. */
  const onGroupBar = (e: React.PointerEvent, members: Row[]) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const ids = new Set(members.map(({ l }) => l.uid).filter(Boolean));
    const moving = project.layers
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => members.some((m) => m.i === i) || (l.attachTo && ids.has(l.attachTo)));
    const originals = moving.map(({ l, i }) => ({ i, s: l.startSec, e: l.endSec }));
    const minS = Math.min(...members.map(({ l }) => l.startSec));
    const tag = `group:${Date.now()}`;
    const targets = snapTargets(members[0]?.i ?? null);
    drag(
      e,
      (dt, ev) => {
        const a = snap(minS + dt, targets, ev.altKey);
        const d = r3(Math.max(-minS, a.v - minS));
        setSnapAt(a.at);
        update(
          (p) => ({
            ...p,
            layers: p.layers.map((x, j) => {
              const o = originals.find((y) => y.i === j);
              return o ? { ...x, startSec: r3(o.s + d), endSec: r3(o.e + d) } : x;
            }),
          }),
          tag,
        );
      },
      () => extendToFit(tag),
    );
  };
  const [dropRow, setDropRow] = useState<string | null>(null);
  const dropProps = (rowKey: string, mainId: string | null) =>
    onDropAdd
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes("text/x-map-layer")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            if (dropRow !== rowKey) setDropRow(rowKey);
          },
          onDragLeave: () => setDropRow(null),
          onDrop: (e: React.DragEvent) => {
            const ty = e.dataTransfer.getData("text/x-map-layer") as LayerType;
            setDropRow(null);
            if (!ty) return;
            e.preventDefault();
            onDropAdd(ty, timeAt(e.clientX), mainId);
          },
        }
      : {};
  const chips = (id: string) =>
    fxOf(id).map(({ l: f, i: fi }) => (
      <div
        key={`fx${fi}`}
        className={`fxchip g-${groupOf(f)} ${selLayer === fi ? "sel" : ""}`}
        style={{ left: f.startSec * pps, width: Math.max(6, (f.endSec - f.startSec) * pps) }}
        onPointerDown={(e) => onBar(e, fi, "move")}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSel({ kind: "layer", i: fi, key: null });
          setCtxMenu({ kind: "layer", i: fi, x: e.clientX, y: e.clientY });
        }}
        title={`Effect: ${f.name} · ${f.startSec.toFixed(2)}s → ${f.endSec.toFixed(2)}s · right-click for quick edit`}
      >
        <div className="edge l" onPointerDown={(e) => onBar(e, fi, "l")} />
        <Icon name={LAYER_ICON[f.type]} size={11} />
        {f.name}
        {f.fx?.hold ? " ⏸" : ""}
        <div className="edge r" onPointerDown={(e) => onBar(e, fi, "r")} />
      </div>
    ));
  const playX = LABEL_W + t * pps;

  const toggleHidden = (i: number) =>
    update((p) => {
      const target = p.layers[i];
      if (!target) return p;
      const nextHidden = !target.hidden;
      const gname = target.group?.trim();
      const norm = (s: string) => s.trim().toLowerCase();
      return {
        ...p,
        layers: p.layers.map((x, j) => {
          if (j === i) return { ...x, hidden: nextHidden };
          // If toggling a child layer inside a group, sync its state into the Group Master's `disabledPlaces`
          if (gname && !target.isGroupMaster && x.group?.trim() === gname && x.isGroupMaster && target.places[0]) {
            const pl = target.places[0].trim();
            const curDis = x.disabledPlaces ?? [];
            const nextDis = nextHidden ? [...curDis.filter((d) => norm(d) !== norm(pl)), pl] : curDis.filter((d) => norm(d) !== norm(pl));
            return { ...x, disabledPlaces: nextDis };
          }
          return x;
        }),
      };
    });

  return (
    <div className="tlwrap" style={{ height: "100%" }}>
      <div className="tlhead">
        <span className="lbl">Timeline</span>
        {toolbar}
        <span className="sp" />
        <button className={`btn sm icon ghost ${snapOn ? "on" : ""}`} onClick={() => setSnapOn(!snapOn)} title="Snapping (hold Alt while dragging to turn it off)" aria-label="Snapping">
          <Icon name="magnet" />
        </button>
        <button
          className="btn sm icon ghost"
          onClick={() => {
            setFit(false);
            setPps((v) => clamp(v / 1.5, 2, 900));
          }}
          aria-label="Zoom out"
          title="Zoom out (Ctrl+wheel)"
        >
          <Icon name="minus" />
        </button>
        <button
          className="btn sm icon ghost"
          onClick={() => {
            setFit(false);
            setPps((v) => clamp(v * 1.5, 2, 900));
          }}
          aria-label="Zoom in"
          title="Zoom in (Ctrl+wheel)"
        >
          <Icon name="plus" />
        </button>
        <button className={`btn sm ${fit ? "on" : "ghost"}`} onClick={() => setFit(true)} title="Fit the whole project">
          Fit
        </button>
      </div>
      <div className="tl" ref={box}>
        <div className="tlinner" style={{ width: LABEL_W + laneW + 40 }}>
          <div className="trow ruler">
            <div className="tlabel" style={{ cursor: "default", color: "var(--muted)", fontSize: 11 }}>
              {fmtTime(t)}
            </div>
            <div className="lane rul" style={{ width: laneW }} onPointerDown={onRuler}>
              {ticks.map((k, i) => (
                <div key={i} className={`tick ${k.major ? "" : "minor"}`} style={{ left: k.x }}>
                  {k.major ? k.label : null}
                </div>
              ))}
              <div className="beyond" style={{ left: total * pps, width: Math.max(0, laneW - total * pps) }} />
              <div className="endh" style={{ left: total * pps }} onPointerDown={onEnd} title={`Project length ${total.toFixed(2)} s (drag to change)`} />
              <div className="ph" style={{ left: t * pps }} />
            </div>
          </div>

          <div className={`trow cam ${sel.kind === "cam" ? "sel" : ""}`}>
            <div className="tlabel" onClick={() => setSel({ kind: "cam", key: null })}>
              <span className="dot" style={{ background: "#8fdbe5" }} />
              <span className="nm">Camera</span>
              <span className="chip" style={{ padding: "0 5px" }}>{project.camera.length}</span>
            </div>
            <div
              className={`lane ${dropRow === "cam" ? "dropok" : ""}`}
              style={{ width: laneW }}
              {...(project.camera.length ? dropProps("cam", "camera") : {})}
              onPointerDown={(e) => e.target === e.currentTarget && seekTo(timeAt(e.clientX))}
              onDoubleClick={(e) => {
                const at = r3(Math.round(timeAt(e.clientX) * FPS) / FPS);
                const prev = [...project.camera].sort((a, b) => a.t - b.t).filter((k) => k.t <= at).pop() ?? project.camera[0];
                update((p) => ({ ...p, camera: [...p.camera, { t: at, place: prev?.place ?? "India", zoom: prev?.zoom ?? 2.2, bearing: prev?.bearing ?? 0, pitch: prev?.pitch ?? 0, move: "fly", ease: "ease-in-out" }] }));
                setSel({ kind: "cam", key: project.camera.length });
              }}
              title="Double-click to add a camera keyframe"
            >
              <div className="beyond" style={{ left: total * pps, width: Math.max(0, laneW - total * pps) }} />
              {project.camera.map((k, ki) => (
                <div
                  key={ki}
                  className={`kf cam ${sel.kind === "cam" && sel.key === ki ? "sel" : ""}`}
                  style={{ left: k.t * pps }}
                  onPointerDown={(e) => onCamKey(e, ki)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    seekTo(k.t);
                  }}
                  title={`${k.place} · zoom ${k.zoom} · ${k.move} at ${k.t}s`}
                />
              ))}
              {chips("camera")}
            </div>
          </div>

          {blocks.map((b, bi) => renderBlock(b, bi))}
          {project.layers.length === 0 ? (
            <div className="trow" style={{ height: 60 }}>
              <div className="tlabel" />
              <div className="lane" style={{ width: laneW, display: "flex", alignItems: "center", paddingLeft: 16, color: "var(--muted)" }}>
                Add a layer from the left panel (or drop a photo or video on the preview).
              </div>
            </div>
          ) : null}
          <div className="ph" style={{ left: playX }} />
          {snapAt !== null ? <div className="snapline" style={{ left: LABEL_W + snapAt * pps }} /> : null}
        </div>
      </div>
      {ctxMenu ? renderCtxMenu(ctxMenu) : null}
    </div>
  );

  function renderCtxMenu(m: CtxTarget) {
    const left = Math.min(window.innerWidth - 310, Math.max(8, m.x));
    const top = Math.min(window.innerHeight - 380, Math.max(8, m.y));

    if (m.kind === "group") {
      const gname = m.name;
      const peers = project.layers.filter((x) => x.group?.trim() === gname && !x.attachTo);
      const masterIdx = project.layers.findIndex((x) => x.group?.trim() === gname && x.isGroupMaster && !x.attachTo);
      const master = masterIdx >= 0 ? project.layers[masterIdx] : peers[0];
      const setGroupAll = (patch: Partial<Layer>) =>
        update((p) => ({
          ...p,
          layers: p.layers.map((x) => (x.group?.trim() === gname && !x.attachTo ? { ...x, ...patch } : x)),
        }));

      return (
        <div
          id="tl-ctx-menu"
          className="menu"
          style={{
            position: "fixed",
            left,
            top,
            width: 292,
            zIndex: 120,
            padding: 10,
            gap: 8,
            maxHeight: "82vh",
          }}
        >
          <div className="rowf" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
            <b style={{ fontSize: 12.5, color: "var(--primary)" }}>★ Group Quick Edit: {gname}</b>
            <button className="btn sm icon ghost" onClick={() => setCtxMenu(null)}>
              <Icon name="x" size={12} />
            </button>
          </div>
          {master ? (
            <>
              <div className="rowf">
                <span className="hint" style={{ width: 68 }}>Type:</span>
                <select
                  value={master.type}
                  onChange={(e) => setGroupAll({ type: e.target.value as LayerType })}
                  style={{ flex: 1, padding: "4px 6px", fontSize: 12 }}
                >
                  <option value="highlight">Highlight area</option>
                  <option value="region-media">Waving flag / photo / video in area</option>
                  <option value="cutout">Break-out piece</option>
                </select>
              </div>
              {master.type === "highlight" ? (
                <div className="rowf">
                  <span className="hint" style={{ width: 68 }}>Style:</span>
                  <select
                    value={master.highlightStyle}
                    onChange={(e) => setGroupAll({ highlightStyle: e.target.value as HighlightStyle })}
                    style={{ flex: 1, padding: "4px 6px", fontSize: 12 }}
                  >
                    {HIGHLIGHT_STYLES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {master.type === "region-media" || master.type === "cutout" ? (
                <div className="rowf" style={{ flexWrap: "wrap", gap: 4 }}>
                  <span className="hint" style={{ width: 68 }}>Fill:</span>
                  <button className={`btn sm ${master.media === "flag" ? "on" : ""}`} onClick={() => setGroupAll({ media: "flag", wave: true })}>
                    Own Flag
                  </button>
                  <button className={`btn sm ${master.media === "flag:su" ? "on" : ""}`} onClick={() => setGroupAll({ media: "flag:su", wave: true })}>
                    USSR Flag
                  </button>
                  <button className={`btn sm ${master.wave ? "on" : ""}`} onClick={() => setGroupAll({ wave: !master.wave })}>
                    Wave: {master.wave ? "On" : "Off"}
                  </button>
                </div>
              ) : null}
              <div className="rowf" style={{ gap: 5 }}>
                <span className="hint" style={{ width: 68 }}>Colour:</span>
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setGroupAll({ color: c })}
                    title={c}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      border: master.color === c ? "2px solid #fff" : "1px solid var(--line)",
                      background: c === "auto" ? "linear-gradient(135deg,#f0a93b,#3fa7b5)" : c,
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <label className="chk" style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={Boolean(master.mergeBorders ?? true)}
                  onChange={(e) => setGroupAll({ mergeBorders: e.target.checked })}
                />
                Remove internal borders
              </label>
            </>
          ) : null}
          <hr />
          <div className="rowf" style={{ gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn sm"
              onClick={() => {
                const v = window.prompt("Rename group", gname);
                if (v && v.trim()) {
                  update((p) => ({
                    ...p,
                    layers: p.layers.map((x) =>
                      x.group?.trim() === gname ? { ...x, group: v.trim(), ...(x.isGroupMaster ? { name: v.trim() } : {}) } : x,
                    ),
                  }));
                }
                setCtxMenu(null);
              }}
            >
              Rename Group
            </button>
            <button
              className="btn sm"
              onClick={() => {
                update((p) => ({
                  ...p,
                  layers: p.layers
                    .filter((x) => !(x.group?.trim() === gname && x.isGroupMaster))
                    .map((x) => (x.group?.trim() === gname ? { ...x, group: undefined } : x)),
                }));
                setCtxMenu(null);
              }}
            >
              Ungroup
            </button>
            <button
              className="btn sm danger"
              onClick={() => {
                update((p) => removeGroupByName(p, gname));
                setSel({ kind: "none" });
                setCtxMenu(null);
              }}
            >
              <Icon name="trash" size={13} />
              Delete Group
            </button>
          </div>
        </div>
      );
    }

    const i = m.i;
    const l = project.layers[i];
    if (!l) return null;
    const isFxLayer = Boolean(l.attachTo && l.fx);
    const setL = (patch: Partial<Layer>) =>
      update((p) => ({
        ...p,
        layers: p.layers.map((x, j) => {
          if (j === i) return { ...x, ...patch };
          // If this is a Combined Group Master, also propagate style/color/media/type to matching child layers
          if (l.isGroupMaster && l.group && x.group?.trim() === l.group.trim() && !x.isGroupMaster && !x.attachTo) {
            return {
              ...x,
              ...(patch.type ? { type: patch.type } : {}),
              ...(patch.highlightStyle ? { highlightStyle: patch.highlightStyle } : {}),
              ...(patch.color ? { color: patch.color } : {}),
              ...(patch.media !== undefined ? { media: patch.media } : {}),
              ...(patch.wave !== undefined ? { wave: patch.wave } : {}),
            };
          }
          return x;
        }),
      }));
    const setFx = (patch: Partial<Fx>) =>
      setL({ fx: { ...(l.fx ?? fxDefaults()), ...patch } });

    return (
      <div
        id="tl-ctx-menu"
        className="menu"
        style={{
          position: "fixed",
          left,
          top,
          width: 300,
          zIndex: 120,
          padding: 10,
          gap: 8,
          maxHeight: "84vh",
        }}
      >
        <div className="rowf" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
          <b style={{ fontSize: 12.5, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isFxLayer ? `⚡ Effect: ${l.name}` : l.isGroupMaster ? `★ Group Master: ${l.name}` : `Quick Edit: ${l.name}`}
          </b>
          <button className="btn sm icon ghost" onClick={() => setCtxMenu(null)}>
            <Icon name="x" size={12} />
          </button>
        </div>

        {/* Name & Label quick edit */}
        <div className="grid2">
          <div className="f">
            <span className="fl">Layer name</span>
            <input type="text" value={l.name} onChange={(e) => setL({ name: e.target.value })} style={{ padding: "4px 6px", fontSize: 12 }} />
          </div>
          <div className="f">
            <span className="fl">On-map label</span>
            <input type="text" value={l.text} placeholder="auto / text" onChange={(e) => setL({ text: e.target.value })} style={{ padding: "4px 6px", fontSize: 12 }} />
          </div>
        </div>

        {/* Start / End timing quick edit */}
        <div className="grid2">
          <div className="f">
            <span className="fl">Start (s)</span>
            <input
              type="number"
              step={0.1}
              min={0}
              value={l.startSec}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) setL({ startSec: r3(Math.max(0, Math.min(v, l.endSec - 0.1))) });
              }}
              style={{ padding: "4px 6px", fontSize: 12 }}
            />
          </div>
          <div className="f">
            <span className="fl">End (s)</span>
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={l.endSec}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) setL({ endSec: r3(Math.max(l.startSec + 0.1, v)) });
              }}
              style={{ padding: "4px 6px", fontSize: 12 }}
            />
          </div>
        </div>

        {/* Type-specific quick controls */}
        {l.type === "highlight" || l.type === "region-media" || l.type === "cutout" ? (
          <>
            <div className="rowf">
              <span className="hint" style={{ width: 64 }}>Mode:</span>
              <select
                value={l.type}
                onChange={(e) => setL({ type: e.target.value as LayerType, ...(e.target.value === "region-media" && !l.media ? { media: "flag" } : {}) })}
                style={{ flex: 1, padding: "4px 6px", fontSize: 12 }}
              >
                <option value="highlight">Highlight area</option>
                <option value="region-media">Waving flag / media fill</option>
                <option value="cutout">Break-out piece</option>
              </select>
            </div>
            {l.type === "highlight" ? (
              <div className="rowf">
                <span className="hint" style={{ width: 64 }}>Style:</span>
                <select
                  value={l.highlightStyle}
                  onChange={(e) => setL({ highlightStyle: e.target.value as HighlightStyle })}
                  style={{ flex: 1, padding: "4px 6px", fontSize: 12 }}
                >
                  {HIGHLIGHT_STYLES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rowf" style={{ flexWrap: "wrap", gap: 4 }}>
                <span className="hint" style={{ width: 64 }}>Fill:</span>
                <button className={`btn sm ${l.media === "flag" ? "on" : ""}`} onClick={() => setL({ media: "flag", wave: true })}>
                  Own Flag
                </button>
                <button className={`btn sm ${l.media === "flag:su" ? "on" : ""}`} onClick={() => setL({ media: "flag:su", wave: true })}>
                  USSR Flag
                </button>
                <button className={`btn sm ${l.wave ? "on" : ""}`} onClick={() => setL({ wave: !l.wave })}>
                  Wave: {l.wave ? "On" : "Off"}
                </button>
              </div>
            )}
            {l.places.length > 1 || l.isGroupMaster ? (
              <label className="chk" style={{ fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={Boolean(l.mergeBorders ?? true)}
                  onChange={(e) => setL({ mergeBorders: e.target.checked })}
                />
                Remove internal borders
              </label>
            ) : null}
          </>
        ) : null}

        {l.type === "route" ? (
          <div className="grid2">
            <div className="f">
              <span className="fl">Mode</span>
              <select value={l.mode} onChange={(e) => setL({ mode: e.target.value as Layer["mode"] })} style={{ padding: "4px 6px", fontSize: 12 }}>
                <option value="flight">flight</option>
                <option value="road">road</option>
                <option value="rail">rail</option>
                <option value="sea">sea</option>
                <option value="straight">straight</option>
              </select>
            </div>
            <div className="f">
              <span className="fl">Vehicle</span>
              <select value={l.vehicle} onChange={(e) => setL({ vehicle: e.target.value as Layer["vehicle"] })} style={{ padding: "4px 6px", fontSize: 12 }}>
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="f" style={{ gridColumn: "span 2" }}>
              <span className="fl">Line style</span>
              <select value={l.routeStyle} onChange={(e) => setL({ routeStyle: e.target.value as Layer["routeStyle"] })} style={{ padding: "4px 6px", fontSize: 12 }}>
                {ROUTE_STYLES.map((rs) => (
                  <option key={rs} value={rs}>
                    {rs}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {l.type === "pin" ? (
          <div className="rowf">
            <span className="hint" style={{ width: 64 }}>Marker:</span>
            <select value={l.pinVariant} onChange={(e) => setL({ pinVariant: e.target.value as Layer["pinVariant"] })} style={{ flex: 1, padding: "4px 6px", fontSize: 12 }}>
              <option value="pin">pin</option>
              <option value="dot">dot</option>
              <option value="target">target</option>
              <option value="flag">flag</option>
            </select>
          </div>
        ) : null}

        {/* Effect-specific quick controls */}
        {isFxLayer && l.fx ? (
          <div className="fxbox" style={{ padding: 6, gap: 5 }}>
            <div className="rowf">
              <span className="hint" style={{ width: 64 }}>Blend:</span>
              <select
                value={l.fx.blend ?? "replace"}
                onChange={(e) => setFx({ blend: e.target.value as "overlay" | "replace" })}
                style={{ flex: 1, padding: "3px 6px", fontSize: 11.5 }}
              >
                <option value="overlay">On top (overlay)</option>
                <option value="replace">Replaces main layer</option>
              </select>
            </div>
            <button
              className="btn sm"
              onClick={() => {
                update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? detach(x) : x)) }));
                setCtxMenu(null);
              }}
            >
              Detach to its own layer track
            </button>
          </div>
        ) : null}

        {/* Colour swatches */}
        {l.type !== "sfx" && l.type !== "scene" ? (
          <div className="rowf" style={{ gap: 5 }}>
            <span className="hint" style={{ width: 64 }}>Colour:</span>
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setL({ color: c })}
                title={c}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  border: l.color === c ? "2px solid #fff" : "1px solid var(--line)",
                  background: c === "auto" ? "linear-gradient(135deg,#f0a93b,#3fa7b5)" : c,
                  padding: 0,
                }}
              />
            ))}
          </div>
        ) : null}

        <hr />
        <div className="rowf" style={{ gap: 5, flexWrap: "wrap" }}>
          <button
            className="btn sm"
            onClick={() => {
              const dur = l.endSec - l.startSec;
              setL({ startSec: r3(t), endSec: r3(t + dur) });
              setCtxMenu(null);
            }}
            title="Move layer to start at the current playhead"
          >
            Start at playhead
          </button>
          <button
            className="btn sm"
            disabled={t <= l.startSec + 0.05 || t >= l.endSec - 0.05}
            onClick={() => {
              const parts = splitLayer(l, t);
              if (parts) {
                update((p) => ({ ...p, layers: [...p.layers.slice(0, i), parts[0], parts[1], ...p.layers.slice(i + 1)] }));
              }
              setCtxMenu(null);
            }}
          >
            <Icon name="split" size={12} />
            Split
          </button>
          <button
            className="btn sm"
            onClick={() => {
              const copy: Layer = { ...JSON.parse(JSON.stringify(l)), name: `${l.name} copy`, uid: newUid(), isGroupMaster: false };
              update((p) => ({ ...p, layers: [...p.layers.slice(0, i + 1), copy, ...p.layers.slice(i + 1)] }));
              setSel({ kind: "layer", i: i + 1, key: null });
              setCtxMenu(null);
            }}
          >
            <Icon name="copy" size={12} />
            Duplicate
          </button>
          <button
            className="btn sm"
            onClick={() => {
              toggleHidden(i);
              setCtxMenu(null);
            }}
          >
            <Icon name={l.hidden ? "eye" : "eyeoff"} size={12} />
            {l.hidden ? "Show" : "Hide"}
          </button>
          <button
            className="btn sm danger"
            onClick={() => {
              update((p) => removeLayerAt(p, i, false));
              if (selLayer === i) setSel({ kind: "none" });
              setCtxMenu(null);
            }}
          >
            <Icon name="trash" size={12} />
            {l.isGroupMaster ? "Delete Group" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  function renderRow({ l, i }: Row, inGroup = false) {
    const g = groupOf(l);
    const isSel = selLayer === i;
    const isMaster = Boolean(l.isGroupMaster);
    const openCtx = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSel({ kind: "layer", i, key: null });
      setCtxMenu({ kind: "layer", i, x: e.clientX, y: e.clientY });
    };
    return (
      <div
        key={i}
        className={`trow ${isSel ? "sel" : ""} ${l.hidden ? "off" : ""}`}
        style={isMaster ? { background: "rgba(63, 167, 181, 0.08)" } : undefined}
        onContextMenu={openCtx}
      >
                <div
                  className="tlabel"
                  style={inGroup ? { paddingLeft: isMaster ? 12 : 22 } : undefined}
                  onClick={() => setSel({ kind: "layer", i, key: null })}
                  onDoubleClick={() => setRenaming(i)}
                  title={
                    isMaster
                      ? `Combined Group Master (${l.places.length} areas) · click to edit, right-click for quick edit`
                      : `${LAYER_META[l.type].label} · click to edit, right-click for quick edit, double-click to rename`
                  }
                >
                  <span className="dot" style={{ background: isMaster ? "var(--primary)" : GROUP_COLOR[g] }} />
                  {renaming === i ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={l.name}
                      style={{ padding: "2px 6px", height: 24 }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v) update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? { ...x, name: v } : x)) }));
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenaming(null);
                        e.stopPropagation();
                      }}
                    />
                  ) : (
                    <span className="nm" style={isMaster ? { fontWeight: 700, color: "#ffd79a" } : undefined}>
                      {isMaster ? `★ ${l.name || l.type} (All)` : l.name || l.type}
                    </span>
                  )}
                  <button
                    className="eye"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(i);
                    }}
                    title={l.hidden ? "Show layer" : "Hide layer"}
                    aria-label={l.hidden ? "Show layer" : "Hide layer"}
                  >
                    <Icon name={l.hidden ? "eyeoff" : "eye"} />
                  </button>
                  <button
                    className="eye"
                    style={{ color: "var(--danger)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      update((p) => removeLayerAt(p, i, false));
                      if (selLayer === i) setSel({ kind: "none" });
                    }}
                    title={isMaster ? "Delete entire group and all member layers" : "Delete layer"}
                    aria-label="Delete layer"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                <div
                  className={`lane ${dropRow === `L${i}` ? "dropok" : ""}`}
                  style={{ width: laneW }}
                  {...dropProps(`L${i}`, l.uid && l.type !== "sfx" ? l.uid : null)}
                  onPointerDown={(e) => e.target === e.currentTarget && (seekTo(timeAt(e.clientX)), setSel({ kind: "layer", i, key: null }))}
                >
                  <div className="beyond" style={{ left: total * pps, width: Math.max(0, laneW - total * pps) }} />
                  <div
                    className={`bar g-${g} ${isSel ? "sel" : ""}`}
                    style={{ left: l.startSec * pps, width: Math.max(4, (l.endSec - l.startSec) * pps) }}
                    onPointerDown={(e) => onBar(e, i, "move")}
                    onContextMenu={openCtx}
                    title={`${l.name}: ${l.startSec.toFixed(2)}s → ${l.endSec.toFixed(2)}s · right-click for quick edit`}
                  >
                    <div className="edge l" onPointerDown={(e) => onBar(e, i, "l")} />
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name={LAYER_ICON[l.type]} size={12} />
                      {l.name}
                    </span>
                    <div className="edge r" onPointerDown={(e) => onBar(e, i, "r")} />
                  </div>
                  {l.keys.map((k, ki) => (
                    <div
                      key={ki}
                      className={`kf ${isSel && sel.kind === "layer" && sel.key === ki ? "sel" : ""}`}
                      style={{ left: (l.startSec + k.t) * pps }}
                      onPointerDown={(e) => onKey(e, i, ki)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        seekTo(l.startSec + k.t);
                      }}
                      title={`Keyframe at ${(l.startSec + k.t).toFixed(2)}s · opacity ${k.opacity} · scale ${k.scale} · ${k.ease}`}
                    />
                  ))}
                  {l.uid ? chips(l.uid) : null}
                </div>
      </div>
    );
  }

  function renderBlock(b: Block, bi: number) {
    if (b.kind === "layer") return <React.Fragment key={`b${bi}`}>{renderRow(b.row)}</React.Fragment>;
    const closed = Boolean(closedGroups[b.name]);
    const s0 = Math.min(...b.rows.map(({ l }) => l.startSec));
    const e0 = Math.max(...b.rows.map(({ l }) => l.endSec));
    // Put the Combined Group Master row first under the group header, followed by each individual member layer
    const orderedRows = [...b.rows].sort((a, c) => (c.l.isGroupMaster ? 1 : 0) - (a.l.isGroupMaster ? 1 : 0));
    const masterRow = orderedRows.find((r) => r.l.isGroupMaster) ?? orderedRows[0];
    const memberCount = orderedRows.filter((r) => !r.l.isGroupMaster).length || orderedRows.length;
    const openGroupCtx = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (masterRow) setSel({ kind: "layer", i: masterRow.i, key: null });
      setCtxMenu({ kind: "group", name: b.name, x: e.clientX, y: e.clientY });
    };
    return (
      <React.Fragment key={`g:${b.name}`}>
        <div
          className={`trow ghead ${masterRow && selLayer === masterRow.i ? "sel" : ""}`}
          onContextMenu={openGroupCtx}
        >
          <div
            className="tlabel"
            onClick={() => {
              if (masterRow) setSel({ kind: "layer", i: masterRow.i, key: null });
            }}
            onDoubleClick={() => {
              const v = window.prompt("Group name (empty = ungroup)", b.name);
              if (v !== null)
                update((p) => ({
                  ...p,
                  layers: p.layers.map((x) =>
                    x.group?.trim() === b.name
                      ? { ...x, group: v.trim() || undefined, ...(x.isGroupMaster && v.trim() ? { name: v.trim() } : {}) }
                      : x,
                  ),
                }));
            }}
            title="Click to select Combined Group Master · right-click for group quick edit · double-click to rename"
          >
            <button
              className="eye"
              style={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleGroup(b.name);
              }}
              aria-label={closed ? "Open the group" : "Fold the group"}
              title={closed ? "Open the group" : "Fold the group"}
            >
              <Icon name={closed ? "plus" : "minus"} size={12} />
            </button>
            <span className="nm" style={{ fontWeight: 700 }}>{b.name}</span>
            <span className="chip" style={{ padding: "0 5px" }}>{memberCount}</span>
            <button
              className="eye"
              style={{ opacity: 1, color: "var(--danger)" }}
              onClick={(e) => {
                e.stopPropagation();
                update((p) => removeGroupByName(p, b.name));
                setSel({ kind: "none" });
              }}
              title={`Delete entire group “${b.name}” and all its ${memberCount} member layers`}
              aria-label="Delete group"
            >
              <Icon name="trash" />
            </button>
          </div>
          <div className="lane" style={{ width: laneW }}>
            <div className="beyond" style={{ left: total * pps, width: Math.max(0, laneW - total * pps) }} />
            <div
              className="bar gbar"
              style={{ left: s0 * pps, width: Math.max(6, (e0 - s0) * pps) }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                if (masterRow) setSel({ kind: "layer", i: masterRow.i, key: null });
                onGroupBar(e, b.rows);
              }}
              onContextMenu={openGroupCtx}
              title={`Group “${b.name}”: click to edit combined group, right-click for quick edit, drag to move all ${memberCount} member layers together`}
            >
              <span>{closed ? `${memberCount} layers (Combined Group)` : `★ Combined Group: ${b.name}`}</span>
            </div>
          </div>
        </div>
        {closed ? null : orderedRows.map((row) => <React.Fragment key={row.i}>{renderRow(row, true)}</React.Fragment>)}
      </React.Fragment>
    );
  }
};
