import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchJson, loadOnce } from "../src/lib/data";
import { loadGazetteer } from "../src/lib/places";
import { CONTINENTS, REGION_PRESETS } from "../src/map/useAreaHighlights";
import { Icon, Toggle } from "./ui";

export type Suggestion = { name: string; sub: string; kind: "country" | "state" | "continent" | "city" | "landmark"; rank: number };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Every name the map understands: continents, countries, states, cities and landmarks, from the bundled data. */
const loadSuggestions = () =>
  loadOnce<(Suggestion & { key: string })[]>("app:suggestions", async () => {
    const [g, states] = await Promise.all([
      loadGazetteer(),
      fetchJson<{ objects: { states: { geometries: { properties: { name: string; country: string } }[] } } }>("data/states.json"),
    ]);
    const out: (Suggestion & { key: string })[] = [];
    const seen = new Set<string>();
    const add = (s: Suggestion) => {
      const k = `${s.kind}:${norm(s.name)}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ ...s, key: norm(s.name) });
    };
    for (const c of CONTINENTS) {
      add({ name: c, sub: "Continent (all countries in continent)", kind: "continent", rank: 2e12 });
    }
    for (const p of g.all) {
      if (p.kind === "country") add({ name: p.name, sub: "Country", kind: "country", rank: 1e12 + p.pop });
      else if (p.kind === "landmark") add({ name: p.name, sub: [p.region, p.country].filter(Boolean).join(", "), kind: "landmark", rank: 5e9 });
      else if (p.kind === "city") add({ name: p.name, sub: [p.region, p.country].filter(Boolean).join(", "), kind: "city", rank: p.pop });
    }
    for (const { properties: s } of states.objects.states.geometries) {
      if (!s.name) continue;
      const india = s.country === "India";
      add({ name: india ? s.name : `${s.name}, ${s.country}`, sub: `State · ${s.country}`, kind: "state", rank: india ? 9e9 : 1e9 });
    }
    return out;
  });

export const useSuggestions = () => {
  const [list, setList] = useState<(Suggestion & { key: string })[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadSuggestions()
      .then((l) => alive && setList(l))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, []);
  return list;
};

export function searchPlaces(list: (Suggestion & { key: string })[], q: string, kinds?: Suggestion["kind"][], limit = 9) {
  const n = norm(q);
  if (!n) return [];
  const pre: (Suggestion & { key: string })[] = [];
  const mid: (Suggestion & { key: string })[] = [];
  for (const s of list) {
    if (kinds && !kinds.includes(s.kind)) continue;
    if (s.key.startsWith(n)) pre.push(s);
    else if (n.length > 2 && s.key.includes(n)) mid.push(s);
    if (pre.length > 400) break;
  }
  const score = (s: Suggestion & { key: string }) => (s.key === n ? 1e15 : 0) + s.rank;
  pre.sort((a, b) => score(b) - score(a));
  mid.sort((a, b) => score(b) - score(a));
  return [...pre, ...mid].slice(0, limit);
}

/**
 * Text box for a place with suggestions. Free text still works: "19.07, 72.87",
 * "Base Camp (28.0026, 86.8528)" or "Springfield, United States".
 */
export const PlaceInput: React.FC<{ value: string; onChange: (v: string) => void; kinds?: Suggestion["kind"][]; placeholder?: string; autoFocus?: boolean }> = ({
  value,
  onChange,
  kinds,
  placeholder = "City, state, country or lat, lon",
  autoFocus,
}) => {
  const list = useSuggestions();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(value), [value]);
  const results = useMemo(() => (list && open ? searchPlaces(list, draft, kinds) : []), [list, open, draft, kinds]);
  const pick = (s: string) => {
    setDraft(s);
    onChange(s);
    setOpen(false);
  };
  return (
    <div className="ac" ref={ref}>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            setHi((h) => Math.min(h + 1, results.length - 1));
            e.preventDefault();
          } else if (e.key === "ArrowUp") {
            setHi((h) => Math.max(h - 1, 0));
            e.preventDefault();
          } else if (e.key === "Enter") {
            if (open && results[hi]) pick(results[hi].name);
            else onChange(draft);
            e.preventDefault();
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length ? (
        <div className="ac-menu" role="listbox">
          {results.map((r, i) => (
            <button
              key={`${r.kind}:${r.name}:${r.sub}`}
              type="button"
              className={i === hi ? "hi" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r.name);
              }}
            >
              <Icon name={r.kind === "country" ? "globe" : r.kind === "state" ? "area" : r.kind === "landmark" ? "sparkle" : "pin"} size={14} />
              <span style={{ minWidth: 0, display: "grid" }}>
                <span>{r.name}</span>
                {r.sub && r.kind !== "country" ? <span className="sub">{r.sub}</span> : null}
              </span>
              <small>{r.kind}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/** Ordered list of places (route stops, arrow points, frame-these-places lists). */
export const PlaceList: React.FC<{ value: string[]; onChange: (v: string[]) => void; addLabel?: string; min?: number }> = ({ value, onChange, addLabel = "Add stop", min = 0 }) => (
  <div className="list">
    {value.map((v, i) => (
      <div className="listrow" key={i}>
        <PlaceInput value={v} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
        <button className="btn sm icon ghost" title="Move up" disabled={i === 0} onClick={() => onChange(swap(value, i, i - 1))}>
          <Icon name="up" />
        </button>
        <button className="btn sm icon ghost" title="Move down" disabled={i === value.length - 1} onClick={() => onChange(swap(value, i, i + 1))}>
          <Icon name="down" />
        </button>
        <button className="btn sm icon ghost danger" title="Remove" disabled={value.length <= min} onClick={() => onChange(value.filter((_, j) => j !== i))}>
          <Icon name="x" />
        </button>
      </div>
    ))}
    <button className="btn sm" onClick={() => onChange([...value, ""])}>
      <Icon name="plus" />
      {addLabel}
    </button>
  </div>
);

const swap = <T,>(a: T[], i: number, j: number) => {
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};

/**
 * Region Group editor: supports a single area OR combining multiple countries, states, or continents into one
 * unified geographic group (e.g. USSR, Korea, Pakistan), with:
 * - per-member active checkbox (unselected members stay in the group but do not show the effect)
 * - "Remove internal borders" toggle (dissolves shared boundaries between adjacent grouped areas)
 * - quick historical/geopolitical group presets (USSR, Korea, Pakistan 1947, British India, NATO, BRICS, or any Continent)
 */
export const AreaGroupField: React.FC<{
  places: string[];
  disabledPlaces?: string[];
  mergeBorders?: boolean;
  groupName?: string;
  labelValue?: string;
  onChange: (patch: { places?: string[]; disabledPlaces?: string[]; mergeBorders?: boolean; name?: string; text?: string }) => void;
}> = ({ places, disabledPlaces = [], mergeBorders = false, groupName = "", labelValue = "", onChange }) => {
  const list = places.length ? places : [""];
  const isGroup = list.length > 1;
  const disabledSet = new Set(disabledPlaces.map(norm));
  const [newPlace, setNewPlace] = useState("");

  const toggleMember = (p: string, checked: boolean) => {
    const key = norm(p);
    const next = checked ? disabledPlaces.filter((x) => norm(x) !== key) : [...disabledPlaces.filter((x) => norm(x) !== key), p];
    onChange({ disabledPlaces: next });
  };

  const addMember = (name: string) => {
    const v = name.trim();
    if (!v) return;
    if (list.length === 1 && !list[0].trim()) {
      onChange({ places: [v] });
    } else if (!list.some((x) => norm(x) === norm(v))) {
      onChange({ places: [...list, v] });
    }
    setNewPlace("");
  };

  const applyPreset = (presetKey: string) => {
    const pr = REGION_PRESETS[presetKey];
    if (!pr) return;
    onChange({
      places: [...pr.places],
      disabledPlaces: [],
      mergeBorders: true,
      name: pr.name,
      text: labelValue === "auto" || !labelValue ? pr.name : labelValue,
    });
  };

  return (
    <div className="list" style={{ gap: 8 }}>
      {list.map((v, i) => {
        const active = !disabledSet.has(norm(v));
        return (
          <div className="listrow" key={i} style={{ opacity: active ? 1 : 0.5 }}>
            {isGroup ? (
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => toggleMember(v, e.target.checked)}
                title={active ? "Selected in group (shows effect) — click to unselect without removing from group" : "Unselected in group (effect hidden on this area) — click to select"}
                style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer", flex: "none" }}
              />
            ) : null}
            <PlaceInput
              value={v}
              onChange={(nv) => {
                const next = list.map((x, j) => (j === i ? nv : x));
                onChange({ places: next });
              }}
              placeholder="Country, state, continent or lat, lon"
            />
            {isGroup ? (
              <button
                type="button"
                className={`btn sm ${active ? "on" : "ghost"}`}
                onClick={() => toggleMember(v, !active)}
                title={active ? "Selected: shows the group effect. Click to mark unselected." : "Unselected: excluded from the effect while staying in the group."}
                style={{ padding: "0 6px", fontSize: 11 }}
              >
                {active ? "On" : "Off"}
              </button>
            ) : null}
            {list.length > 1 ? (
              <button
                type="button"
                className="btn sm icon ghost danger"
                title="Remove from group"
                onClick={() => {
                  const next = list.filter((_, j) => j !== i);
                  onChange({ places: next, disabledPlaces: disabledPlaces.filter((d) => norm(d) !== norm(v)) });
                }}
              >
                <Icon name="x" />
              </button>
            ) : null}
          </div>
        );
      })}

      <div className="rowf" style={{ gap: 6, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <PlaceInput
            value={newPlace}
            onChange={(v) => {
              if (v.trim()) addMember(v);
            }}
            placeholder="+ Add region to group (or Ctrl+Click map)…"
          />
        </div>
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            if (newPlace.trim()) addMember(newPlace);
            else onChange({ places: [...list, ""] });
          }}
          title="Add another country, state or continent to combine into a single region group"
        >
          <Icon name="plus" />
          Add region
        </button>
      </div>

      <div className="rowf" style={{ gap: 4, flexWrap: "wrap" }}>
        <span className="hint" style={{ fontSize: 11, marginRight: 2 }}>
          Quick group:
        </span>
        {Object.entries(REGION_PRESETS).map(([k, pr]) => (
          <button
            key={k}
            type="button"
            className="btn sm ghost"
            style={{ fontSize: 11, padding: "0 6px", minHeight: 22, border: "1px solid var(--line)" }}
            onClick={() => applyPreset(k)}
            title={`Group ${pr.places.length} regions as ${pr.name}: ${pr.places.join(", ")}`}
          >
            {pr.name}
          </button>
        ))}
      </div>

      {isGroup ? (
        <div className="fxbox" style={{ padding: 8, gap: 6, borderColor: "rgba(63,167,181,0.45)", background: "rgba(63,167,181,0.07)" }}>
          <div className="rowf" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 11.5, color: "#8fdbe5" }}>
              Combined Region Group ({list.filter((x) => x.trim() && !disabledSet.has(norm(x))).length}/{list.filter((x) => x.trim()).length} active)
            </b>
            {disabledPlaces.length > 0 ? (
              <button type="button" className="btn sm ghost" style={{ fontSize: 11, minHeight: 22 }} onClick={() => onChange({ disabledPlaces: [] })}>
                Select all
              </button>
            ) : null}
          </div>
          <div className="rowf">
            <span className="hint" style={{ width: 82 }}>Group name:</span>
            <input
              type="text"
              value={groupName}
              placeholder="e.g. USSR, KOREA, PAKISTAN"
              onChange={(e) => {
                const nm = e.target.value;
                onChange({ name: nm, ...(labelValue === "auto" || labelValue === groupName ? { text: nm } : {}) });
              }}
              style={{ flex: 1, padding: "4px 7px", fontSize: 12 }}
            />
          </div>
          <Toggle
            label="Remove internal borders between grouped areas (only outer border)"
            checked={Boolean(mergeBorders)}
            onChange={(v) => onChange({ mergeBorders: v })}
          />
          <p className="hint" style={{ fontSize: 11 }}>
            Tip: Uncheck any member above (or <b>Ctrl+Click</b> on the map preview) to unselect/select areas inside this group. Effects, waving flags and highlights cover all selected areas combined.
          </p>
        </div>
      ) : (
        <p className="hint" style={{ fontSize: 11 }}>
          Tip: Hold <b>Ctrl + Click</b> on countries/states in the preview (or click <b>+ Add region</b> / a Quick group above) to combine multiple areas into one group.
        </p>
      )}
    </div>
  );
};
