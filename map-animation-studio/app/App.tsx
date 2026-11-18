import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { TEMPLATE_BY_ID, type TemplateDef } from "../src/registry";
import { api, type MediaItem, type ProjectInfo } from "./api";
import {
  FPS,
  addKeyAt,
  attachTo,
  blankProject,
  buildGroupTimeline,
  mainAt,
  reflow,
  removeLayerAt,
  cameraKeyAt,
  exampleProject,
  newLayer,
  normalizeProject,
  nudgeLayer,
  projectFromTemplate,
  r3,
  sceneLayer,
  slug,
  splitLayer,
  type Layer,
  type LayerType,
  type Project,
} from "./model";
import { storage, useHistory } from "./store";
import { Stage, Transport, type Gesture, type PreviewQuality } from "./Stage";
import { Timeline, type Sel } from "./Timeline";
import { Library } from "./Library";
import { AnimatePanel, CameraPanel, LayerPanel, ProjectPanel } from "./Inspector";
import { ExportDialog } from "./ExportDialog";
import { MediaProvider, useMedia } from "./Media";
import { Dialog, Icon, Menu } from "./ui";

type ITab = "layer" | "animate" | "camera" | "project";
const LS_PROJECT = "map-studio:project";
const LS_FILE = "map-studio:file";
const LS_TL = "map-studio:timeline-height";

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};

const extend = (p: Project): Project => {
  const end = Math.max(0, ...p.layers.map((l) => l.endSec));
  return end > p.durationSec + 1e-6 ? { ...p, durationSec: Math.min(600, Math.ceil(end * 10) / 10) } : p;
};

export const App: React.FC = () => {
  const hist = useHistory<Project>(() => {
    const saved = storage.get<Partial<Project>>(LS_PROJECT);
    return saved ? normalizeProject(saved) : exampleProject();
  });
  const project = hist.value;
  // every edit re-flows main layers that carry "extend" effects (see model.reflow)
  const histUpdate = hist.update;
  const update = useCallback((fn: (p: Project) => Project, tag?: string) => histUpdate((p) => reflow(fn(p)), tag), [histUpdate]);
  // Library: add as an effect on the main layer under the playhead, or as a new layer (2026-10-30)
  const [addMode, setAddModeState] = useState<"effect" | "layer">(() => {
    try {
      return (localStorage.getItem("mas:addMode") as "effect" | "layer") || "effect";
    } catch {
      return "effect";
    }
  });
  const setAddMode = (m: "effect" | "layer") => {
    setAddModeState(m);
    try {
      localStorage.setItem("mas:addMode", m);
    } catch {
      /* private mode */
    }
  };

  const playerRef = useRef<PlayerRef | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [quality, setQualityState] = useState<PreviewQuality>(() => {
    try {
      return (localStorage.getItem("mas:previewQuality") as PreviewQuality) || "auto";
    } catch {
      return "auto";
    }
  });
  const setQuality = (q: PreviewQuality) => {
    setQualityState(q);
    try {
      localStorage.setItem("mas:previewQuality", q);
    } catch {
      /* private mode */
    }
  };
  const [sel, setSelRaw] = useState<Sel>({ kind: "none" });
  const [itab, setItab] = useState<ITab>("project");
  const [recording, setRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [online, setOnline] = useState(false);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [warnings, setWarnings] = useState<{ msg: string; at: number }[]>([]);
  const [dialog, setDialog] = useState<"export" | "open" | "help" | null>(null);
  const [file, setFile] = useState<string | null>(() => storage.get<string>(LS_FILE));
  const [savedRev, setSavedRev] = useState<Project | null>(null);
  const [tlH, setTlH] = useState(() => storage.get<number>(LS_TL) ?? Math.round(window.innerHeight * 0.33));
  const [leftW, setLeftW] = useState<number>(() => storage.get<number>("map-studio:left-w") ?? 260);
  const [rightW, setRightW] = useState<number>(() => storage.get<number>("map-studio:right-w") ?? 320);
  const [hideLeft, setHideLeft] = useState(false);
  const [hideRight, setHideRight] = useState(false);

  const say = useCallback((msg: string, bad = false) => {
    setToast({ msg, bad });
    window.setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), bad ? 6000 : 2600);
  }, []);
  const sayBad = useCallback((m: string) => say(m, true), [say]);

  /* ---------- selection ---------- */

  const setSel = useCallback((s: Sel) => {
    setSelRaw(s);
    if (s.kind === "cam") setItab("camera");
    else if (s.kind === "layer") setItab((t) => (s.key !== null ? "animate" : t === "animate" ? "animate" : "layer"));
  }, []);
  const selLayerIndex = sel.kind === "layer" && sel.i < project.layers.length ? sel.i : -1;
  const selLayer = selLayerIndex >= 0 ? project.layers[selLayerIndex] : null;
  useEffect(() => {
    if (sel.kind === "layer" && sel.i >= project.layers.length) setSelRaw({ kind: "none" });
    if (sel.kind === "cam" && sel.key !== null && sel.key >= project.camera.length) setSelRaw({ kind: "cam", key: null });
  }, [sel, project.layers.length, project.camera.length]);

  /* ---------- player ---------- */

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
    };
  }, []);
  const seek = useCallback((f: number) => {
    playerRef.current?.seekTo(f);
    setFrame(f);
  }, []);
  const t = frame / FPS;
  const currentMain = mainAt(project, t, selLayer);

  /* ---------- server, autosave, warnings ---------- */

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const h = await api.health();
      if (alive) setOnline(Boolean(h));
    };
    check();
    const id = window.setInterval(check, 8000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => storage.set(LS_PROJECT, project), 300);
    document.title = `${project.name || "Untitled"} · Map Animation Studio`;
    return () => window.clearTimeout(id);
  }, [project]);

  useEffect(() => storage.set(LS_FILE, file), [file]);
  useEffect(() => storage.set(LS_TL, tlH), [tlH]);
  useEffect(() => storage.set("map-studio:left-w", leftW), [leftW]);
  useEffect(() => storage.set("map-studio:right-w", rightW), [rightW]);

  const save = useCallback(
    async (quiet = false, as?: string) => {
      if (!online) {
        if (!quiet) sayBad("Saving to your computer needs the studio server. Use Download instead, or start the studio with “Start Map Studio”.");
        return;
      }
      const name = as ?? file ?? `${slug(project.name)}.json`;
      try {
        const info = await api.saveProject(name, project);
        setFile(info.file);
        setSavedRev(project);
        if (!quiet) say(`Saved to projects/${info.file}`);
      } catch (e) {
        sayBad(`Could not save: ${(e as Error).message}`);
      }
    },
    [online, file, project, say, sayBad],
  );
  // Autosave to the projects folder once the project has a file.
  useEffect(() => {
    if (!online || !file || savedRev === project) return;
    const id = window.setTimeout(() => save(true), 2500);
    return () => window.clearTimeout(id);
  }, [online, file, project, savedRev, save]);

  useEffect(() => {
    const h = (e: Event) => {
      const msg = String((e as CustomEvent).detail ?? "");
      setWarnings((w) => [...w.filter((x) => x.msg !== msg), { msg, at: Date.now() }].slice(-3));
    };
    window.addEventListener("map-studio-error", h);
    const id = window.setInterval(() => setWarnings((w) => (w.some((x) => Date.now() - x.at > 14000) ? w.filter((x) => Date.now() - x.at <= 14000) : w)), 1000);
    return () => {
      window.removeEventListener("map-studio-error", h);
      window.clearInterval(id);
    };
  }, []);

  /* ---------- editing actions ---------- */

  const addLayer = useCallback(
    (l: Layer) => {
      update((p) => extend({ ...p, layers: [...p.layers, l] }));
      setSelRaw({ kind: "layer", i: project.layers.length, key: null });
      setItab("layer");
    },
    [update, project.layers.length],
  );
  /** New layer at `at`; in effect mode it attaches to the main layer there instead of forming a track. */
  const addAt = (l: Layer, at: number, mainId?: string | null) => {
    const main = mainId === undefined ? (addMode === "effect" ? mainAt(project, at, selLayer) : null) : mainId ? { id: mainId } : null;
    addLayer(main && main.id !== l.uid && l.type !== "sfx" ? attachTo(project, l, main.id) : l);
  };
  const onAdd = (type: LayerType) => {
    const at = r3(Math.min(t, Math.max(0, project.durationSec - 0.5)));
    addAt(newLayer(type, at), at);
  };
  const onAddScene = (tp: TemplateDef) => addAt(sceneLayer(tp, r3(t)), t);
  const onDropAdd = (type: LayerType, at: number, mainId: string | null) => addAt(newLayer(type, r3(at)), at, addMode === "effect" ? mainId : null);
  const confirmReplace = () => savedRev === project || window.confirm("Replace the current project? (Save it first if you want to keep it.)");
  const loadProject = (p: Project, f: string | null) => {
    hist.reset(p);
    setFile(f);
    setSavedRev(f ? p : null);
    setSelRaw({ kind: "none" });
    setItab("project");
    seek(0);
  };
  const onNewFromTemplate = (tp: TemplateDef) => {
    if (!confirmReplace()) return;
    loadProject(projectFromTemplate(tp), null);
  };
  const addMedia = (m: MediaItem) => {
    const k = m.kind;
    if (k === "data") return sayBad("GPX/GeoJSON files are used from layer settings (route track, custom area).");
    const at = r3(t);
    addLayer(k === "audio" ? newLayer("sfx", at, { name: m.name, media: m.path, endSec: at + 5 }) : newLayer(k === "video" ? "video" : "image", at, { name: m.name, media: m.path }));
  };
  const media = useRef<{ upload: (f: File[]) => Promise<MediaItem[]> } | null>(null);
  const onDropFiles = async (files: File[]) => {
    if (!media.current) return;
    const up = await media.current.upload(files);
    up.forEach(addMedia);
  };

  const doSplit = useCallback(() => {
    if (selLayerIndex < 0) return;
    const parts = splitLayer(project.layers[selLayerIndex], t);
    if (!parts) return say("Put the playhead inside the selected layer to split it.");
    update((p) => ({ ...p, layers: [...p.layers.slice(0, selLayerIndex), parts[0], parts[1], ...p.layers.slice(selLayerIndex + 1)] }));
    setSelRaw({ kind: "layer", i: selLayerIndex + 1, key: null });
  }, [selLayerIndex, project.layers, t, update, say]);

  const addKey = useCallback(() => {
    if (sel.kind === "cam" || (selLayerIndex < 0 && itab === "camera")) {
      const k = cameraKeyAt(project, t);
      update((p) => ({ ...p, camera: [...p.camera, k] }));
      setSel({ kind: "cam", key: project.camera.length });
      return;
    }
    if (selLayerIndex < 0) return say("Select a layer (or the camera row) first.");
    const l = project.layers[selLayerIndex];
    const local = t - l.startSec;
    if (local < 0 || local > l.endSec - l.startSec) return say("Move the playhead inside the layer to add a keyframe.");
    const r = addKeyAt(l, local);
    update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === selLayerIndex ? { ...x, keys: r.keys } : x)) }));
    setSel({ kind: "layer", i: selLayerIndex, key: r.index });
  }, [sel, selLayerIndex, itab, project, t, update, setSel, say]);

  const addCamKey = () => {
    const k = cameraKeyAt(project, t);
    update((p) => ({ ...p, camera: [...p.camera, k] }));
    setSel({ kind: "cam", key: project.camera.length });
  };

  const deleteSelection = useCallback(() => {
    if (sel.kind === "layer" && selLayerIndex >= 0) {
      if (sel.key !== null) {
        update((p) => ({ ...p, layers: p.layers.map((x, j) => (j === selLayerIndex ? { ...x, keys: x.keys.filter((_, m) => m !== sel.key) } : x)) }));
        setSelRaw({ kind: "layer", i: selLayerIndex, key: null });
      } else {
        update((p) => removeLayerAt(p, selLayerIndex, false));
        setSelRaw({ kind: "none" });
        say("Deleted");
      }
    } else if (sel.kind === "cam" && sel.key !== null) {
      update((p) => ({ ...p, camera: p.camera.filter((_, m) => m !== sel.key) }));
      setSelRaw({ kind: "cam", key: null });
    }
  }, [sel, selLayerIndex, update, say]);

  const dragBase = useRef<{ layer: Layer; i: number; local: number; tag: string } | null>(null);
  const onGesture = (g: Gesture) => {
    if (selLayerIndex < 0) return;
    const i = selLayerIndex;
    const setKeys = (p: Project, keys: Layer["keys"]) => ({ ...p, layers: p.layers.map((x, j) => (j === i ? { ...x, keys } : x)) });
    if (g.phase === "start") {
      const l = project.layers[i];
      dragBase.current = { layer: l, i, local: t - l.startSec, tag: `stage:${Date.now()}` };
    } else if (g.phase === "move" && dragBase.current) {
      const b = dragBase.current;
      update((p) => setKeys(p, nudgeLayer(b.layer, b.local, g.delta, recording)), b.tag);
    } else if (g.phase === "end") {
      dragBase.current = null;
    } else if (g.phase === "wheel") {
      update((p) => {
        const l = p.layers[i];
        return setKeys(p, nudgeLayer(l, t - l.startSec, g.delta, recording));
      }, `wheel:${i}`);
    }
  };

  /**
   * Direct camera pan/zoom/tilt from the preview canvas.
   * Updates the active camera keyframe (or creates one at the playhead when `setKeyframe` or `recording` is on).
   */
  const onCameraChange = useCallback(
    (cam: { lon: number; lat: number; zoom: number; bearing: number; pitch: number }, setKeyframe = false) => {
      const placeStr = `${cam.lat.toFixed(4)}, ${cam.lon.toFixed(4)}`;
      const at = r3(Math.round(t * FPS) / FPS);
      update(
        (p) => {
          const ks = [...p.camera];
          if (ks.length === 0) {
            return {
              ...p,
              camera: [{ t: at, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch), move: "smooth", ease: "ease-in-out" }],
            };
          }
          // Find keyframe at current playhead (within 0.15s)
          const nearIdx = ks.findIndex((k) => Math.abs(k.t - at) <= 0.15);
          if (setKeyframe || recording) {
            if (nearIdx >= 0) {
              return {
                ...p,
                camera: ks.map((k, idx) =>
                  idx === nearIdx ? { ...k, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch) } : k,
                ),
              };
            }
            const nextCam = [...ks, { t: at, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch), move: "smooth" as const, ease: "ease-in-out" as const }].sort(
              (a, b) => a.t - b.t,
            );
            return { ...p, camera: nextCam };
          }
          // If a specific camera key is selected, or we are near one, update that key; if all keys had the same initial place (default static camera), move all of them together
          if (sel.kind === "cam" && sel.key !== null && ks[sel.key]) {
            return {
              ...p,
              camera: ks.map((k, idx) =>
                idx === sel.key ? { ...k, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch) } : k,
              ),
            };
          }
          if (nearIdx >= 0) {
            return {
              ...p,
              camera: ks.map((k, idx) =>
                idx === nearIdx ? { ...k, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch) } : k,
              ),
            };
          }
          // Otherwise update the active segment's surrounding keyframes (or insert at playhead if more than 2 keys)
          if (ks.length <= 2 && new Set(ks.map((k) => k.place)).size === 1) {
            return {
              ...p,
              camera: ks.map((k) => ({ ...k, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch) })),
            };
          }
          // Find the latest key before `at`, or the first key
          let bestIdx = 0;
          for (let i = 0; i < ks.length; i++) {
            if (ks[i].t <= at) bestIdx = i;
          }
          return {
            ...p,
            camera: ks.map((k, idx) =>
              idx === bestIdx ? { ...k, place: placeStr, zoom: r3(cam.zoom), bearing: Math.round(cam.bearing), pitch: Math.round(cam.pitch) } : k,
            ),
          };
        },
        setKeyframe ? undefined : "cam-preview",
      );
      if (setKeyframe) say(`Camera keyframe set at ${at.toFixed(1)}s`);
    },
    [t, recording, sel, update, say],
  );

  /**
   * Ctrl+Click (or Select Regions tool click) on the preview map:
   * - If an area layer (highlight / region-media / cutout) is selected, adds the clicked region to its Region Group
   *   (or toggles its selected/unselected state inside the group if it's already in the group!), and turns on `mergeBorders`.
   * - Otherwise creates a new Highlight Region Group layer at the playhead with the clicked region.
   */
  const onRegionPick = useCallback(
    (placeName: string, additive: boolean) => {
      const norm = (s: string) => s.trim().toLowerCase();
      const key = norm(placeName);
      if (!key) return;
      if (selLayer && (selLayer.type === "highlight" || selLayer.type === "region-media" || selLayer.type === "cutout")) {
        // If a child layer inside a group is currently selected, route the region pick to its Group Master so the whole group updates!
        const gname = selLayer.group?.trim();
        const masterIdx =
          gname && !selLayer.isGroupMaster
            ? project.layers.findIndex((x) => x.group?.trim() === gname && x.isGroupMaster && !x.attachTo)
            : -1;
        const targetIdx = masterIdx >= 0 ? masterIdx : selLayerIndex;
        const targetLayer = project.layers[targetIdx];
        const curPlaces = targetLayer.places.filter((x) => x.trim());
        const curDisabled = targetLayer.disabledPlaces ?? [];
        const exists = curPlaces.some((x) => norm(x) === key);
        if (!additive && !exists && !targetLayer.isGroupMaster) {
          update((p) => ({
            ...p,
            layers: p.layers.map((x, j) => (j === targetIdx ? { ...x, places: [placeName], disabledPlaces: [] } : x)),
          }));
          say(`Selected ${placeName}`);
          return;
        }
        if (exists) {
          // Toggle between selected (active) and unselected (disabledPlaces) inside the group, and sync child timeline layers!
          const isDis = curDisabled.some((x) => norm(x) === key);
          const nextDisabled = isDis ? curDisabled.filter((x) => norm(x) !== key) : [...curDisabled, placeName];
          let nextSel = targetIdx;
          update((p) => {
            const res = buildGroupTimeline(p, targetIdx, { disabledPlaces: nextDisabled });
            nextSel = res.selectIdx;
            return res.project;
          });
          setSelRaw({ kind: "layer", i: nextSel, key: null });
          say(isDis ? `Selected ${placeName} in group "${targetLayer.name}"` : `Unselected ${placeName} in group "${targetLayer.name}" (effect hidden on it)`);
        } else {
          const nextPlaces = [...curPlaces, placeName];
          const isNewGroup = curPlaces.length === 1;
          const nextName =
            isNewGroup && (targetLayer.name === "Highlight area" || targetLayer.name === curPlaces[0])
              ? `${curPlaces[0]} + ${placeName}`
              : targetLayer.name;
          let nextSel = targetIdx;
          update((p) => {
            const res = buildGroupTimeline(p, targetIdx, {
              name: nextName,
              places: nextPlaces,
              mergeBorders: targetLayer.mergeBorders ?? true,
            });
            nextSel = res.selectIdx;
            return res.project;
          });
          setSelRaw({ kind: "layer", i: nextSel, key: null });
          setItab("layer");
          say(`Added ${placeName} to group (${nextPlaces.length} layers in group)`);
        }
        return;
      }
      // No area layer selected: create a new Highlight layer at playhead and select it
      const at = r3(Math.min(t, Math.max(0, project.durationSec - 0.5)));
      const nl = newLayer("highlight", at, { name: placeName, places: [placeName], mergeBorders: true });
      addLayer(nl);
      say(`Created area layer for ${placeName} (Ctrl+Click more regions to group them)`);
    },
    [selLayer, selLayerIndex, t, project.durationSec, project.layers, update, addLayer, say],
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((f) => {
      const next = !f;
      if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const total = Math.max(1, Math.round(project.durationSec * FPS));
    const k = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setDialog("open");
        return;
      }
      if (isTyping(e) || dialog) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        hist.redo();
      } else if (mod && e.key.toLowerCase() === "d" && selLayer) {
        e.preventDefault();
        update((p) => ({ ...p, layers: [...p.layers.slice(0, selLayerIndex + 1), { ...JSON.parse(JSON.stringify(selLayer)), name: `${selLayer.name} copy` }, ...p.layers.slice(selLayerIndex + 1)] }));
        setSelRaw({ kind: "layer", i: selLayerIndex + 1, key: null });
      } else if (e.key === " ") {
        e.preventDefault();
        playerRef.current?.toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, frame - (e.shiftKey ? FPS : 1)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(total - 1, frame + (e.shiftKey ? FPS : 1)));
      } else if (e.key === "Home") seek(0);
      else if (e.key === "End") seek(total - 1);
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelection();
      else if (e.key.toLowerCase() === "k" && !mod) addKey();
      else if (e.key.toLowerCase() === "s" && !mod) doSplit();
      else if (e.key.toLowerCase() === "r" && !mod) setRecording((r) => !r);
      else if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        else setSelRaw({ kind: "none" });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [project.durationSec, frame, dialog, hist, selLayer, selLayerIndex, update, seek, deleteSelection, addKey, doSplit, save, toggleFullscreen, isFullscreen]);

  /* ---------- splitter ---------- */

  const onSplitter = (e: React.PointerEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = tlH;
    const move = (ev: PointerEvent) => setTlH(Math.max(120, Math.min(window.innerHeight * 0.78, h0 - (ev.clientY - y0))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onLeftSplitter = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = leftW;
    const move = (ev: PointerEvent) => setLeftW(Math.max(180, Math.min(520, w0 + (ev.clientX - x0))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onRightSplitter = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = rightW;
    const move = (ev: PointerEvent) => setRightW(Math.max(220, Math.min(560, w0 - (ev.clientX - x0))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const dirty = savedRev !== project;
  const selKey = sel.kind === "layer" ? sel.key : null;

  return (
    <MediaProvider online={online} onError={sayBad}>
      <MediaBridge target={media} />
      <div className="app">
        <header className="top">
          <div className="brand">
            <i />
            Map Animation Studio
          </div>
          <input className="pname" value={project.name} onChange={(e) => update((p) => ({ ...p, name: e.target.value }), "name")} aria-label="Project name" />
          {file ? <span className={`chip ${dirty ? "warn" : "ok"}`}>{dirty ? "Saving…" : "Saved"}</span> : <span className="chip">Not saved yet</span>}
          <button className="btn icon ghost" onClick={hist.undo} disabled={!hist.canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button className="btn icon ghost" onClick={hist.redo} disabled={!hist.canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
          <button
            className={`btn sm ghost ${hideLeft ? "on" : ""}`}
            onClick={() => setHideLeft((v) => !v)}
            title={hideLeft ? "Show Left Library Panel" : "Hide Left Library Panel to enlarge Preview"}
          >
            {hideLeft ? "Show Library" : "Hide Library"}
          </button>
          <button
            className={`btn sm ghost ${hideRight ? "on" : ""}`}
            onClick={() => setHideRight((v) => !v)}
            title={hideRight ? "Show Right Inspector Panel" : "Hide Right Inspector Panel to enlarge Preview"}
          >
            {hideRight ? "Show Inspector" : "Hide Inspector"}
          </button>
          <span className="sp" />
          {!online ? (
            <span className="chip warn" title="Saving to your computer, uploading media and exporting need the studio server (Start Map Studio).">
              Preview only
            </span>
          ) : null}
          <Menu
            align="right"
            button={(open) => (
              <button className="btn" onClick={open}>
                <Icon name="file" />
                <span className="hide-sm">Project</span>
                <Icon name="down" />
              </button>
            )}
          >
            {(close) => (
              <>
                <button
                  onClick={() => {
                    close();
                    if (confirmReplace()) loadProject(blankProject(), null);
                  }}
                >
                  New blank map
                </button>
                <button
                  onClick={() => {
                    close();
                    if (confirmReplace()) loadProject(exampleProject(), null);
                  }}
                >
                  New from example (Delhi → Mumbai)
                </button>
                <hr />
                <button
                  onClick={() => {
                    close();
                    setDialog("open");
                  }}
                >
                  Open…<small>Ctrl+O</small>
                </button>
                <button
                  onClick={() => {
                    close();
                    save();
                  }}
                >
                  Save<small>Ctrl+S</small>
                </button>
                <button
                  onClick={() => {
                    close();
                    const n = window.prompt("Save a copy as", `${slug(project.name)}-copy`);
                    if (n) save(false, `${slug(n)}.json`);
                  }}
                >
                  Save a copy…
                </button>
                <hr />
                <button
                  onClick={() => {
                    close();
                    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${slug(project.name)}.mapstudio.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  Download project file
                </button>
                <label className="menu-file" style={{ display: "flex", padding: "7px 9px", borderRadius: 7, cursor: "pointer" }}>
                  Open project file…
                  <input
                    type="file"
                    accept=".json"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      close();
                      if (!f || !confirmReplace()) return;
                      try {
                        loadProject(normalizeProject(JSON.parse(await f.text())), null);
                        say(`Opened ${f.name}`);
                      } catch (err) {
                        sayBad(`Not a project file: ${(err as Error).message}`);
                      }
                    }}
                  />
                </label>
                <hr />
                <button
                  onClick={() => {
                    close();
                    setDialog("help");
                  }}
                >
                  Keyboard shortcuts
                </button>
              </>
            )}
          </Menu>
          <button className="btn pri" onClick={() => setDialog("export")} title="Render an MP4">
            <Icon name="export" />
            Export
          </button>
        </header>

        <div
          className="work"
          style={{
            gridTemplateColumns: `${hideLeft ? "0px" : `${leftW}px 6px`} minmax(0, 1fr) ${hideRight ? "0px" : `6px ${rightW}px`}`,
            gap: 4,
          }}
        >
          {hideLeft ? (
            <div />
          ) : (
            <>
              <Library
                onAdd={onAdd}
                onAddScene={onAddScene}
                onNewFromTemplate={onNewFromTemplate}
                onUseMedia={addMedia}
                addMode={addMode}
                setAddMode={setAddMode}
                mainName={currentMain?.name ?? null}
                quick={{
                  at: t,
                  project,
                  onApply: (fn, msg) => {
                    update(fn, `quick:${Date.now()}`);
                    say(msg);
                  },
                }}
              />
              <div className="vsplit" onPointerDown={onLeftSplitter} onDoubleClick={() => setLeftW(260)} title="Drag to resize Library / Preview area · double-click to reset" />
            </>
          )}
          <section className={`center ${isFullscreen ? "center-fullscreen" : ""}`}>
            <Stage
              project={project}
              playerRef={playerRef}
              selected={selLayer}
              recording={recording}
              warnings={warnings.map((w) => w.msg)}
              onGesture={onGesture}
              onCameraChange={onCameraChange}
              onRegionPick={onRegionPick}
              onDropFiles={onDropFiles}
              loop={loop}
              quality={quality}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              frame={frame}
              playing={playing}
              seek={seek}
            />
            <Transport
              playerRef={playerRef}
              frame={frame}
              playing={playing}
              project={project}
              loop={loop}
              setLoop={setLoop}
              seek={seek}
              quality={quality}
              setQuality={setQuality}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            >
              <button className="btn sm" onClick={addKey} title="Add a keyframe at the playhead (K)">
                <Icon name="key" />
                Keyframe
              </button>
              <button className={`btn sm ${recording ? "on rec" : ""}`} onClick={() => setRecording(!recording)} title="Record: moves on the preview become keyframes (R)">
                <Icon name="rec" />
                Rec
              </button>
            </Transport>
          </section>
          {hideRight ? (
            <div />
          ) : (
            <>
              <div className="vsplit" onPointerDown={onRightSplitter} onDoubleClick={() => setRightW(320)} title="Drag to resize Preview / Inspector area · double-click to reset" />
              <aside className="panel">
                <div className="tabs" role="tablist">
                  <button role="tab" aria-selected={itab === "layer"} disabled={!selLayer} onClick={() => setItab("layer")}>
                    Layer
                  </button>
                  <button role="tab" aria-selected={itab === "animate"} disabled={!selLayer} onClick={() => setItab("animate")}>
                    Animate
                  </button>
                  <button role="tab" aria-selected={itab === "camera"} onClick={() => setItab("camera")}>
                    Camera
                  </button>
                  <button role="tab" aria-selected={itab === "project"} onClick={() => setItab("project")}>
                    Project
                  </button>
                </div>
                <div className="scroll">
                  {itab === "layer" && selLayer ? (
                    <LayerPanel project={project} i={selLayerIndex} update={update} frame={frame} setSel={setSel} onSplit={doSplit} />
                  ) : itab === "animate" && selLayer ? (
                    <AnimatePanel project={project} i={selLayerIndex} keyIndex={selKey} update={update} frame={frame} seek={seek} setSel={setSel} recording={recording} setRecording={setRecording} />
                  ) : itab === "camera" ? (
                    <CameraPanel project={project} keyIndex={sel.kind === "cam" ? sel.key : null} update={update} frame={frame} seek={seek} setSel={setSel} onAdd={addCamKey} />
                  ) : itab === "project" ? (
                    <ProjectPanel project={project} update={update} />
                  ) : (
                    <div className="empty-note">Select a layer on the timeline.</div>
                  )}
                </div>
              </aside>
            </>
          )}
        </div>

        <div className="split" onPointerDown={onSplitter} title="Drag to resize the timeline" />
        <div style={{ height: tlH, minHeight: 0 }}>
          <Timeline
            project={project}
            onDropAdd={onDropAdd}
            update={update}
            frame={frame}
            seek={seek}
            sel={sel}
            setSel={setSel}
            toolbar={
              <>
                <Menu
                  up
                  button={(open) => (
                    <button className="btn sm" onClick={open}>
                      <Icon name="plus" />
                      Add layer
                    </button>
                  )}
                >
                  {(close) =>
                    (["highlight", "region-media", "cutout", "route", "pin", "radar", "callout", "text", "location-card", "image", "video", "flag", "counter", "sfx"] as LayerType[]).map((ty) => (
                      <button
                        key={ty}
                        onClick={() => {
                          close();
                          onAdd(ty);
                        }}
                      >
                        {newLayer(ty, 0).name}
                      </button>
                    ))
                  }
                </Menu>
                <button className="btn sm" onClick={addCamKey} title="Add a camera keyframe at the playhead">
                  <Icon name="camera" />
                  Camera key
                </button>
                <button className="btn sm" onClick={doSplit} disabled={!selLayer} title="Split the selected layer at the playhead (S)">
                  <Icon name="split" />
                  Split
                </button>
                <button className="btn sm ghost danger" onClick={deleteSelection} disabled={sel.kind === "none"} title="Delete the selection (Del)">
                  <Icon name="trash" />
                </button>
              </>
            }
          />
        </div>
      </div>

      {dialog === "export" ? <ExportDialog project={project} online={online} onClose={() => setDialog(null)} /> : null}
      {dialog === "open" ? (
        <OpenDialog
          online={online}
          onClose={() => setDialog(null)}
          onOpen={async (info) => {
            if (!confirmReplace()) return;
            try {
              const raw = await api.loadProject(info.file);
              loadProject(normalizeProject(raw as Partial<Project>), info.file);
              setDialog(null);
              say(`Opened ${info.name}`);
            } catch (e) {
              sayBad(`Could not open: ${(e as Error).message}`);
            }
          }}
          onTemplate={(id) => {
            const tp = TEMPLATE_BY_ID.get(id);
            if (tp && confirmReplace()) {
              loadProject(projectFromTemplate(tp), null);
              setDialog(null);
            }
          }}
        />
      ) : null}
      {dialog === "help" ? <HelpDialog onClose={() => setDialog(null)} /> : null}
      {toast ? <div className={`toast ${toast.bad ? "bad" : ""}`}>{toast.msg}</div> : null}
    </MediaProvider>
  );
};

/** Hands the media context's upload function to the App (which sits outside the provider). */
const MediaBridge: React.FC<{ target: React.MutableRefObject<{ upload: (f: File[]) => Promise<MediaItem[]> } | null> }> = ({ target }) => {
  const m = useMedia();
  target.current = { upload: m.upload };
  return null;
};

const OpenDialog: React.FC<{ online: boolean; onClose: () => void; onOpen: (p: ProjectInfo) => void; onTemplate: (id: string) => void }> = ({ online, onClose, onOpen, onTemplate }) => {
  const [list, setList] = useState<ProjectInfo[] | null>(null);
  useEffect(() => {
    if (online)
      api
        .listProjects()
        .then(setList)
        .catch(() => setList([]));
  }, [online]);
  return (
    <Dialog title="Open project" onClose={onClose}>
      {!online ? <p className="hint">Projects saved on your computer appear here when the studio server is running.</p> : null}
      {list && list.length === 0 ? <p className="hint">No saved projects yet. Use Save (Ctrl+S) and they appear here, in the studio's projects folder.</p> : null}
      <div className="plist">
        {(list ?? []).map((p) => (
          <div className="prow" key={p.file}>
            <Icon name="file" size={16} />
            <div style={{ display: "grid", minWidth: 0 }}>
              <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</b>
              <small>
                {p.file} · {new Date(p.mtime).toLocaleString()}
              </small>
            </div>
            <span className="sp" />
            <button className="btn sm pri" onClick={() => onOpen(p)}>
              Open
            </button>
          </div>
        ))}
      </div>
      <div className="sec">
        <h3>Start from</h3>
        <div className="rowf" style={{ flexWrap: "wrap" }}>
          <button className="btn sm" onClick={() => onTemplate("MapComposer")}>
            Example map
          </button>
          <button className="btn sm" onClick={() => onTemplate("PulsingMarkers")}>
            Pulsing markers
          </button>
          <button className="btn sm" onClick={() => onTemplate("FlightPath")}>
            Flight path
          </button>
          <button className="btn sm" onClick={() => onTemplate("RegionMediaFill")}>
            Flag in a country
          </button>
        </div>
      </div>
    </Dialog>
  );
};

const HelpDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rows: [string, string][] = [
    ["Space", "Play / pause"],
    ["← / →", "One frame back / forward (Shift: one second)"],
    ["Home / End", "Go to start / end"],
    ["K", "Add a keyframe at the playhead"],
    ["R", "Record: drags on the preview become keyframes"],
    ["S", "Split the selected layer at the playhead"],
    ["Del", "Delete the selected layer or keyframe"],
    ["Ctrl+D", "Duplicate the selected layer"],
    ["Ctrl+Z / Ctrl+Shift+Z", "Undo / redo"],
    ["Ctrl+S", "Save to the projects folder"],
    ["Ctrl+wheel on the timeline", "Zoom the timeline"],
    ["Alt while dragging", "No snapping"],
    ["Drag / wheel / Shift+wheel on the preview", "Pan map camera / zoom in-out / tilt 3D (or Move/Scale layer in Move Layer mode)"],
    ["Ctrl+Click on the preview map (or Select Regions mode)", "Select / group multiple countries, states or continents on the map (click again to unselect in group)"],
    ["F11 (or Full Screen button)", "Toggle full-screen preview with full interactive camera & playback controls"],
    ["Double-click the camera row", "Add a camera keyframe there"],
  ];
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <div className="plist">
        {rows.map(([k, v]) => (
          <div className="prow" key={k}>
            <kbd>{k}</kbd>
            <span className="sp" />
            <span>{v}</span>
          </div>
        ))}
      </div>
    </Dialog>
  );
};
