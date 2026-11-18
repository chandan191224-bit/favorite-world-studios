import React, { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { geoContains, type GeoProjection } from "d3-geo";
import { MapComposer, type ComposerProps } from "../src/scenes/composer/MapComposer";
import { FPS, clamp, fmtTime, frameSize, LAYER_META, r3, type Delta, type Layer, type Project } from "./model";
import { Icon } from "./ui";
import { getLiveCamera, setLiveCamera, setLiveLayerDelta, setMapQuality } from "../src/lib/quality";
import { baseScale, type Camera, type ProjectionKind } from "../src/lib/camera";
import { loadStates, type World } from "../src/lib/data";
import { countryLabel } from "../src/map/paint";

export type PreviewQuality = "auto" | "full" | "fast";
export type StageTool = "camera" | "layer" | "select";

type MapViewGlobal = {
  projection: GeoProjection;
  camera: Camera;
  kind: ProjectionKind;
  width: number;
  height: number;
  padX: number;
  offsetY: number;
  planeW: number;
  planeH: number;
  tilt: number;
  world: World | null;
};

const getLiveMapView = (): MapViewGlobal | null =>
  typeof window !== "undefined" ? ((window as unknown as { __mapStudioView?: MapViewGlobal }).__mapStudioView ?? null) : null;

/* ---------- the composition the preview plays ---------- */

class Boundary extends React.Component<{ resetKey: unknown; children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: unknown }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error)
      return (
        <div className="err-card">
          <div>
            <div style={{ fontSize: 44, marginBottom: 12 }}>Something in this frame can't be drawn</div>
            {this.state.error.message}
            <div style={{ fontSize: 22, opacity: 0.7, marginTop: 16 }}>Fix the setting (or press Ctrl+Z) and the preview comes back.</div>
          </div>
        </div>
      );
    return this.props.children;
  }
}

export const StudioComposition: React.FC<ComposerProps> = (p) => (
  <Boundary resetKey={p}>
    <MapComposer {...p} />
  </Boundary>
);

/* ---------- stage ---------- */

export type Gesture = { phase: "start" | "move" | "end"; delta: Delta } | { phase: "wheel"; delta: Delta };

export const Stage: React.FC<{
  project: Project;
  playerRef: React.RefObject<PlayerRef | null>;
  selected: Layer | null;
  recording: boolean;
  warnings: string[];
  onGesture: (g: Gesture) => void;
  onCameraChange: (cam: { lon: number; lat: number; zoom: number; bearing: number; pitch: number }, setKeyframe?: boolean) => void;
  onRegionPick: (placeName: string, additive: boolean) => void;
  onDropFiles: (files: File[]) => void;
  loop: boolean;
  quality?: PreviewQuality;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  frame?: number;
  playing?: boolean;
  seek?: (f: number) => void;
}> = ({
  project,
  playerRef,
  selected,
  recording,
  warnings,
  onGesture,
  onCameraChange,
  onRegionPick,
  onDropFiles,
  loop,
  quality = "auto",
  isFullscreen = false,
  onToggleFullscreen,
  frame = 0,
  playing = false,
  seek,
}) => {
  const wrap = useRef<HTMLDivElement>(null);
  const hit = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 640, h: 360 });
  const [cw, ch] = frameSize(project);
  const [dropping, setDropping] = useState(false);
  const [tool, setTool] = useState<StageTool>("camera");
  const [pickLevel, setPickLevel] = useState<"country" | "state" | "continent">("country");
  const [frameScale, setFrameScale] = useState<number>(1);
  const [framePan, setFramePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const pad = isFullscreen ? 8 : 16;
      const s = Math.min((r.width - pad) / cw, (r.height - pad) / ch);
      setBox({ w: Math.max(80, Math.floor(cw * s)), h: Math.max(45, Math.floor(ch * s)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cw, ch, isFullscreen]);

  const movable = Boolean(selected && LAYER_META[selected.type].movable && !selected.hidden);
  // Screen pixels → layer units (pixels of a 1080p frame).
  const toUnits = (px: number) => (px * (cw / (box.w * frameScale)) * 1080) / ch;

  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const wheelTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = hit.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      // If user is in Layer tool and a movable layer is selected, wheel scales/rotates the layer
      if (toolRef.current === "layer" && movable) {
        if (e.shiftKey || e.altKey) onGestureRef.current({ phase: "wheel", delta: { rotate: (e.deltaY || e.deltaX) * 0.12 } });
        else onGestureRef.current({ phase: "wheel", delta: { scale: Math.exp(-e.deltaY * 0.0012) } });
        return;
      }
      // Otherwise: zoom / tilt / rotate the map camera directly from the preview at 60fps via liveCamera!
      const v = getLiveMapView();
      const cur = getLiveCamera() ?? v?.camera ?? { lon: 78, lat: 22, zoom: 2.2, bearing: 0, pitch: 0 };
      let nextCam: Camera;
      if (e.shiftKey) {
        // Shift + wheel = tilt 3D pitch
        const nextPitch = clamp(Math.round(cur.pitch + (e.deltaY > 0 ? -3 : 3)), 0, 60);
        nextCam = { ...cur, pitch: nextPitch };
      } else if (e.altKey) {
        // Alt + wheel = rotate bearing
        const nextBearing = ((cur.bearing + (e.deltaY > 0 ? -5 : 5) + 540) % 360) - 180;
        nextCam = { ...cur, bearing: Math.round(nextBearing) };
      } else {
        // Normal wheel = smooth zoom in/out
        const dz = -e.deltaY * 0.0018;
        const nextZoom = clamp(r3(cur.zoom + dz), -0.8, 14);
        nextCam = { ...cur, zoom: nextZoom };
      }
      setLiveCamera(nextCam);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        const finalCam = getLiveCamera();
        setLiveCamera(null);
        if (finalCam) onCameraChangeRef.current(finalCam, false);
      }, 140);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    };
  }, [movable]);

  // Preview quality (2026-10-30): paint the map at about the size it is shown, so laptops and phones play smoothly.
  // Exports render on the server and always use full quality.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fit = Math.min(1, (box.w * dpr) / cw);
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const q = quality === "full" ? 1 : quality === "fast" ? Math.max(0.22, fit * 0.55) : Math.max(0.3, fit);
  // Enable base-map affine cache reuse in Preview (including Full quality) so Mercator/flat camera pans & zooms are instant!
  setMapQuality(q, quality === "full" ? Infinity : coarse ? 2.5e6 : 6e6, true);
  useEffect(() => {
    const p = playerRef.current;
    if (p && !p.isPlaying()) p.seekTo(p.getCurrentFrame());
  }, [q, playerRef]);

  const drag = useRef<{
    mode: "camera" | "orbit" | "layer";
    x0: number;
    y0: number;
    moved: boolean;
    cam0: Camera;
    latestCam: Camera;
  } | null>(null);
  const durationInFrames = Math.max(1, Math.round(project.durationSec * FPS));
  const totalFrames = durationInFrames;

  /** Converts a pointer event on `hit` into geographic [lon, lat] using the live map projection. */
  const pointerToLonLat = (clientX: number, clientY: number): [number, number] | null => {
    const el = hit.current;
    const v = getLiveMapView();
    if (!el || !v || !v.projection.invert) return null;
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / Math.max(1, rect.width)) * v.width + v.padX;
    const py = ((clientY - rect.top) / Math.max(1, rect.height)) * v.height + v.offsetY;
    const ll = v.projection.invert([px, py]);
    if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) return null;
    return [ll[0], ll[1]];
  };

  /** Picks the country, state or continent under the pointer and adds/toggles it in the region group. */
  const handleRegionClick = async (clientX: number, clientY: number, additive: boolean) => {
    const ll = pointerToLonLat(clientX, clientY);
    const v = getLiveMapView();
    if (!ll || !v?.world) return;
    const wantLevel =
      selected && (selected.type === "highlight" || selected.type === "region-media" || selected.type === "cutout") && selected.level !== "auto" && selected.level !== "radius"
        ? selected.level
        : pickLevel;
    if (wantLevel === "state" || project.mapLayers.states) {
      if (wantLevel === "state") {
        const states = await loadStates();
        const st = states.features.find((f) => geoContains(f as never, ll));
        if (st) {
          const nm = st.properties.country === "India" ? st.properties.name : `${st.properties.name}, ${st.properties.country}`;
          onRegionPick(nm, additive);
          return;
        }
      }
    }
    const c = v.world.hi.countries.find((f) => geoContains(f as never, ll));
    if (!c) return;
    if (wantLevel === "continent" && c.properties.continent) {
      onRegionPick(c.properties.continent, additive);
      return;
    }
    onRegionPick(countryLabel(c), additive);
  };

  const snapCurrentCameraKey = () => {
    const v = getLiveMapView();
    const cur = getLiveCamera() ?? v?.camera ?? { lon: 78, lat: 22, zoom: 2.2, bearing: 0, pitch: 0 };
    setLiveCamera(null);
    onCameraChange(cur, true);
  };

  return (
    <div
      className={`stage ${dropping ? "dropping" : ""} ${isFullscreen ? "stage-fullscreen" : ""}`}
      ref={wrap}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        if (e.dataTransfer.files.length) onDropFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div
        className="frame"
        style={{
          width: Math.round(box.w * frameScale),
          height: Math.round(box.h * frameScale),
          transform: framePan.x || framePan.y ? `translate(${framePan.x}px, ${framePan.y}px)` : undefined,
          flex: "none",
        }}
      >
        <Player
          ref={playerRef}
          component={StudioComposition}
          inputProps={project}
          durationInFrames={durationInFrames}
          compositionWidth={cw}
          compositionHeight={ch}
          fps={FPS}
          style={{ width: "100%", height: "100%" }}
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          loop={loop}
          acknowledgeRemotionLicense
        />
        <div
          ref={hit}
          className={`hit ${tool === "layer" && movable ? "movable" : tool === "select" ? "selectable" : "pan-cam"}`}
          style={{ cursor: tool === "select" ? "crosshair" : tool === "layer" && movable ? "move" : "grab" }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (e.button !== 0 && e.button !== 2) return;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            const v = getLiveMapView();
            const cam0 = getLiveCamera() ?? v?.camera ?? { lon: 78, lat: 22, zoom: 2.2, bearing: 0, pitch: 0 };
            if (e.button === 2 || (e.shiftKey && tool === "camera" && !e.ctrlKey && !e.metaKey)) {
              drag.current = { mode: "orbit", x0: e.clientX, y0: e.clientY, moved: false, cam0, latestCam: cam0 };
              return;
            }
            if (tool === "layer" && movable && !e.ctrlKey && !e.metaKey) {
              drag.current = { mode: "layer", x0: e.clientX, y0: e.clientY, moved: false, cam0, latestCam: cam0 };
              onGesture({ phase: "start", delta: {} });
              return;
            }
            drag.current = { mode: "camera", x0: e.clientX, y0: e.clientY, moved: false, cam0, latestCam: cam0 };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dxPx = e.clientX - d.x0;
            const dyPx = e.clientY - d.y0;
            if (Math.hypot(dxPx, dyPx) > 2) d.moved = true;
            if (!d.moved) return;

            if (d.mode === "layer") {
              const dx = toUnits(dxPx);
              const dy = toUnits(dyPx);
              if (selected?.uid) setLiveLayerDelta({ uid: selected.uid, dx, dy, scale: 1, rotate: 0 });
              else onGesture({ phase: "move", delta: { dx, dy } });
              return;
            }
            if (d.mode === "orbit") {
              const nextBearing = Math.round(((d.cam0.bearing + dxPx * 0.35 + 540) % 360) - 180);
              const nextPitch = clamp(Math.round(d.cam0.pitch - dyPx * 0.25), 0, 60);
              const nextCam = { ...d.cam0, bearing: nextBearing, pitch: nextPitch };
              d.latestCam = nextCam;
              setLiveCamera(nextCam);
              return;
            }
            // Camera pan: convert screen drag into lon/lat shift adjusted for zoom and bearing
            const v = getLiveMapView();
            const kind = v?.kind ?? (project.projection as ProjectionKind);
            const k = baseScale(kind, cw, ch) * Math.pow(2, d.cam0.zoom);
            const degPerCompPx = 180 / (Math.PI * Math.max(1, k));
            const compScale = cw / Math.max(1, box.w * frameScale);
            const dxComp = dxPx * compScale;
            const dyComp = dyPx * compScale;
            const rad = (d.cam0.bearing * Math.PI) / 180;
            const rdx = dxComp * Math.cos(rad) + dyComp * Math.sin(rad);
            const rdy = -dxComp * Math.sin(rad) + dyComp * Math.cos(rad);
            const cosLat = Math.max(0.2, Math.cos((d.cam0.lat * Math.PI) / 180));
            let nextLon = d.cam0.lon - (rdx * degPerCompPx) / (kind === "mercator" ? 1 : cosLat);
            while (nextLon > 180) nextLon -= 360;
            while (nextLon < -180) nextLon += 360;
            const nextLat = clamp(d.cam0.lat + rdy * degPerCompPx, -85, 85);
            const nextCam = { ...d.cam0, lon: r3(nextLon), lat: r3(nextLat) };
            d.latestCam = nextCam;
            setLiveCamera(nextCam);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d) return;
            drag.current = null;
            if (d.mode === "layer") {
              if (d.moved && selected?.uid) {
                const dx = toUnits(e.clientX - d.x0);
                const dy = toUnits(e.clientY - d.y0);
                setLiveLayerDelta(null);
                onGesture({ phase: "move", delta: { dx, dy } });
              }
              onGesture({ phase: "end", delta: {} });
              return;
            }
            if (d.moved) {
              setLiveCamera(null);
              onCameraChange(d.latestCam, false);
              return;
            }
            // If it was a click (not a drag) and Ctrl/Cmd is held OR tool === "select", pick the clicked region!
            if (e.ctrlKey || e.metaKey || tool === "select") {
              handleRegionClick(e.clientX, e.clientY, e.ctrlKey || e.metaKey || tool === "select");
            }
          }}
          onPointerCancel={() => {
            const d = drag.current;
            drag.current = null;
            if (d && d.mode !== "layer" && d.moved) {
              setLiveCamera(null);
              onCameraChange(d.latestCam, false);
            }
          }}
        />
      </div>

      {/* Top-left badges */}
      <div className="stage-badge">
        {selected ? (
          <span className="badge">
            {selected.name}
            {selected.places.length > 1 ? ` (${selected.places.length - (selected.disabledPlaces?.length ?? 0)}/${selected.places.length} areas)` : ""}
          </span>
        ) : null}
        {recording ? <span className="badge rec">● Recording keyframes</span> : null}
        {warnings.map((w) => (
          <span key={w} className="badge warn" title={w}>
            ⚠ {w}
          </span>
        ))}
      </div>

      {/* Top-right interactive Preview Toolbar (Camera pan/zoom, Set Camera Keyframe, Select/Group Regions, Full Screen) */}
      <div className="stage-tools" style={{ position: "absolute", right: 10, top: 10, zIndex: 4, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg" style={{ background: "rgba(16,19,24,0.86)", padding: 2, borderRadius: 8, border: "1px solid var(--line)", backdropFilter: "blur(6px)" }}>
          <button
            type="button"
            className={`btn sm ${tool === "camera" ? "on" : "ghost"}`}
            onClick={() => setTool("camera")}
            title="Pan & Zoom Map Camera: drag to pan map, scroll to zoom, Shift+drag/wheel to tilt 3D, Ctrl+Click to select/group regions"
            style={{ minHeight: 24, padding: "0 8px", border: 0 }}
          >
            <Icon name="camera" size={13} />
            Pan / Zoom Map
          </button>
          <button
            type="button"
            className={`btn sm ${tool === "select" ? "on" : "ghost"}`}
            onClick={() => setTool("select")}
            title="Select & Group Regions on Preview: click countries, states or continents on the map to add/toggle them in a group"
            style={{ minHeight: 24, padding: "0 8px", border: 0 }}
          >
            <Icon name="area" size={13} />
            Select Regions
          </button>
          {movable ? (
            <button
              type="button"
              className={`btn sm ${tool === "layer" ? "on" : "ghost"}`}
              onClick={() => setTool("layer")}
              title="Move / Scale Selected Layer on Preview"
              style={{ minHeight: 24, padding: "0 8px", border: 0 }}
            >
              <Icon name="layers" size={13} />
              Move Layer
            </button>
          ) : null}
        </div>

        {tool === "select" ? (
          <select
            className="qsel"
            value={pickLevel}
            onChange={(e) => setPickLevel(e.target.value as "country" | "state" | "continent")}
            style={{ width: "auto", minHeight: 28, fontSize: 11.5, background: "rgba(16,19,24,0.88)" }}
            title="What clicking on the map selects"
          >
            <option value="country">Click: Country</option>
            <option value="state">Click: State / Province</option>
            <option value="continent">Click: Continent</option>
          </select>
        ) : null}

        <div
          className="rowf"
          style={{
            background: "rgba(16,19,24,0.86)",
            padding: "2px 6px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            backdropFilter: "blur(6px)",
            gap: 4,
          }}
          title="Adjust preview canvas display size (does not change map camera)"
        >
          <span style={{ fontSize: 11, color: "var(--muted)" }}>View</span>
          <input
            type="range"
            min={0.5}
            max={2.2}
            step={0.05}
            value={frameScale}
            onChange={(e) => setFrameScale(parseFloat(e.target.value))}
            style={{ width: 64, height: 14, accentColor: "var(--primary)" }}
          />
          <button
            type="button"
            className="btn sm ghost"
            style={{ minHeight: 22, padding: "0 5px", fontSize: 11 }}
            onClick={() => {
              setFrameScale(1);
              setFramePan({ x: 0, y: 0 });
            }}
            title="Reset preview size to Fit (100%)"
          >
            {Math.round(frameScale * 100)}%
          </button>
        </div>

        <button
          type="button"
          className="btn sm pri"
          onClick={snapCurrentCameraKey}
          title="Save the current preview map position & zoom as a camera keyframe at the playhead"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.45)" }}
        >
          <Icon name="key" size={13} />
          Set Camera Here
        </button>

        {onToggleFullscreen ? (
          <button
            type="button"
            className={`btn sm ${isFullscreen ? "on" : ""}`}
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Full Screen (Esc or F11)" : "Full Screen Preview with full controls (F11)"}
            style={{ background: "rgba(16,19,24,0.86)", backdropFilter: "blur(6px)" }}
          >
            <Icon name="full" size={13} />
            {isFullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
        ) : null}
      </div>

      {/* Full-screen floating transport bar so user has full playback + scrubbing + camera keyframe control in Full Screen */}
      {isFullscreen && seek ? (
        <div
          className="fs-controls"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 18,
            transform: "translateX(-50%)",
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(16, 19, 24, 0.9)",
            border: "1px solid var(--line)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.65)",
            minWidth: "min(680px, 92vw)",
          }}
        >
          <button className="play" style={{ width: 34, height: 34 }} onClick={() => playerRef.current?.toggle()} title="Play / Pause (Space)">
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <span className="tc" style={{ fontSize: 12.5 }}>
            {fmtTime(frame / FPS)} <span>/ {fmtTime(project.durationSec)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(1, totalFrames - 1)}
            value={frame}
            onChange={(e) => seek(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: "var(--primary)" }}
            title="Scrub timeline"
          />
          <button className="btn sm pri" onClick={snapCurrentCameraKey} title="Save current map view as camera keyframe at playhead">
            <Icon name="camera" size={13} />
            Set Camera Key
          </button>
          <button className="btn sm" onClick={onToggleFullscreen} title="Exit Full Screen (Esc)">
            Exit
          </button>
        </div>
      ) : (
        <div className="stage-hint">
          {tool === "select"
            ? `Click map to add/unselect ${pickLevel}s in group · Drag to pan · Wheel to zoom`
            : tool === "layer" && movable
              ? "Drag to move layer · Wheel to scale · Ctrl+Click map to select/group regions"
              : "Drag map to pan · Wheel to zoom · Shift+drag/wheel to tilt 3D · Ctrl+Click map to group regions"}
        </div>
      )}
    </div>
  );
};

/* ---------- transport ---------- */

export const Transport: React.FC<{
  playerRef: React.RefObject<PlayerRef | null>;
  frame: number;
  playing: boolean;
  project: Project;
  loop: boolean;
  setLoop: (v: boolean) => void;
  seek: (f: number) => void;
  quality?: PreviewQuality;
  setQuality?: (q: PreviewQuality) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  children?: React.ReactNode;
}> = ({ playerRef, frame, playing, project, loop, setLoop, seek, quality, setQuality, onToggleFullscreen, isFullscreen, children }) => {
  const total = Math.max(1, Math.round(project.durationSec * FPS));
  const [vol, setVol] = useState(0.8);
  useEffect(() => {
    playerRef.current?.setVolume(vol);
  }, [vol, playerRef]);
  return (
    <div className="transport">
      <button className="btn icon ghost" onClick={() => seek(0)} aria-label="Go to start" title="Start (Home)">
        <Icon name="start" />
      </button>
      <button className="btn icon ghost" onClick={() => seek(Math.max(0, frame - 1))} aria-label="Previous frame" title="Previous frame (←)">
        <Icon name="prev" />
      </button>
      <button className="play" onClick={() => playerRef.current?.toggle()} aria-label={playing ? "Pause" : "Play"} title="Play / pause (Space)">
        <Icon name={playing ? "pause" : "play"} />
      </button>
      <button className="btn icon ghost" onClick={() => seek(Math.min(total - 1, frame + 1))} aria-label="Next frame" title="Next frame (→)">
        <Icon name="next" />
      </button>
      <button className="btn icon ghost" onClick={() => seek(total - 1)} aria-label="Go to end" title="End (End)">
        <Icon name="end" />
      </button>
      <div className="tc">
        {fmtTime(frame / FPS)} <span>/ {fmtTime(project.durationSec)}</span>
      </div>
      <button className={`btn icon ghost ${loop ? "on" : ""}`} onClick={() => setLoop(!loop)} aria-label="Loop" title="Loop playback">
        <Icon name="loop" />
      </button>
      <input className="vol" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(parseFloat(e.target.value))} aria-label="Preview volume" title="Preview volume" />
      {setQuality ? (
        <select className="qsel" value={quality} onChange={(e) => setQuality(e.target.value as PreviewQuality)} aria-label="Preview quality" title="Preview quality (exports are always full quality)">
          <option value="auto">Preview: Auto</option>
          <option value="fast">Preview: Fast</option>
          <option value="full">Preview: Full</option>
        </select>
      ) : null}
      <button
        className={`btn icon ghost ${isFullscreen ? "on" : ""}`}
        onClick={() => (onToggleFullscreen ? onToggleFullscreen() : playerRef.current?.requestFullscreen())}
        aria-label="Full screen"
        title="Full screen interactive preview (F11)"
      >
        <Icon name="full" />
      </button>
      <span className="sp" />
      {children}
    </div>
  );
};
