import { useMemo } from "react";
import { z } from "zod";
import { staticFile } from "remotion";
import { merge, mesh } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiLineString } from "geojson";
import { loadOnce, loadStates, useAsset, useWorld, type BorderView, type CountryProps, type StateProps, type World } from "../lib/data";
import { loadGazetteer } from "../lib/places";
import { HIGHLIGHT_STYLES, radiusCircle, type ResolvedHighlight } from "./highlightStyles";
import { countryLabel, findCountry, matchCountry } from "./paint";
import type { Theme } from "../lib/themes";

export const CONTINENTS = [
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
] as const;

export const REGION_PRESETS: Record<string, { name: string; places: string[] }> = {
  ussr: {
    name: "USSR",
    places: [
      "Russia",
      "Ukraine",
      "Belarus",
      "Uzbekistan",
      "Kazakhstan",
      "Georgia",
      "Azerbaijan",
      "Lithuania",
      "Moldova",
      "Latvia",
      "Kyrgyzstan",
      "Tajikistan",
      "Armenia",
      "Turkmenistan",
      "Estonia",
    ],
  },
  korea: {
    name: "KOREA",
    places: ["North Korea", "South Korea"],
  },
  pakistan1947: {
    name: "PAKISTAN",
    places: ["Pakistan", "Bangladesh"],
  },
  british_india: {
    name: "BRITISH INDIA",
    places: ["India", "Pakistan", "Bangladesh", "Myanmar"],
  },
  nato: {
    name: "NATO",
    places: ["United States", "Canada", "United Kingdom", "France", "Germany", "Italy", "Spain", "Poland", "Turkey", "Norway", "Sweden", "Finland"],
  },
  brics: {
    name: "BRICS",
    places: ["Brazil", "Russia", "India", "China", "South Africa", "Egypt", "Ethiopia", "Iran", "United Arab Emirates"],
  },
};

export const zHighlight = z.object({
  target: z
    .string()
    .describe('Country ("India", "IND"), state ("Kerala" or "Punjab, Pakistan"), continent ("Asia"), a place for radius rings, or "file:areas/my.geojson"'),
  targets: z
    .array(z.string())
    .optional()
    .describe("Multiple countries, states or continents combined into one region group"),
  disabledTargets: z
    .array(z.string())
    .optional()
    .describe("Members inside targets that are unselected (excluded from the effect without leaving the group)"),
  mergeBorders: z
    .boolean()
    .optional()
    .describe("Dissolve internal borders between adjacent grouped regions"),
  level: z.enum(["auto", "country", "state", "continent", "radius"]),
  radiusKm: z.number().min(0).max(5000).describe("For level = radius"),
  style: z.enum(HIGHLIGHT_STYLES),
  color: z.string().describe('CSS colour or "auto"'),
  startSec: z.number().min(0),
  endSec: z.number().min(0).describe("0 = stays until the end"),
  label: z.string().describe('"auto" = area name, "" = no label'),
  sublabel: z.string(),
});
export type HighlightSpec = z.infer<typeof zHighlight>;

export const highlightDefaults = (h: Partial<HighlightSpec> & { target: string }): HighlightSpec => ({
  level: "auto",
  radiusKm: 0,
  style: "glow",
  color: "auto",
  startSec: 0,
  endSec: 0,
  label: "auto",
  sublabel: "",
  ...h,
});

export type Shape = {
  feature: Feature<Geometry> | FeatureCollection;
  name: string;
  /** Internal border lines dissolved when mergeBorders is true (so base map can erase them too). */
  internalBorders?: MultiLineString;
  /** Active country a3 codes inside this shape (for merge-border erasing on the base map). */
  countryCodes?: string[];
  /** Active state codes inside this shape. */
  stateKeys?: string[];
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export type ShapeQuery = {
  target: string;
  targets?: string[];
  disabledTargets?: string[];
  mergeBorders?: boolean;
  level: HighlightSpec["level"];
  radiusKm: number;
};

/** Finds countries matching a continent name (e.g. "Asia", "Continent: Asia"). */
export function findContinentCountries(world: World, q: string, lod: "lo" | "mid" | "hi" = "hi") {
  const clean = norm(q.replace(/^continent\s*:\s*/i, ""));
  const cont = CONTINENTS.find((c) => norm(c) === clean);
  if (!cont) return [];
  return world[lod].countries.filter((f) => norm(f.properties.continent) === norm(cont));
}

async function resolveSingle(
  tRaw: string,
  level: ShapeQuery["level"],
  radiusKm: number,
  world: World,
): Promise<{
  features: Feature<Geometry>[];
  name: string;
  countryCodes: string[];
  stateKeys: string[];
  iso2?: string;
}> {
  const t = tRaw.trim();
  if (!t) return { features: [], name: "", countryCodes: [], stateKeys: [] };
  if (t.startsWith("file:")) {
    const file = t.slice(5).trim();
    const res = await fetch(file.startsWith("http") ? file : staticFile(file));
    if (!res.ok) throw new Error(`Could not load ${file}`);
    const gj = (await res.json()) as FeatureCollection | Feature<Geometry>;
    const features = gj.type === "FeatureCollection" ? gj.features : [gj];
    const name = gj.type === "Feature" ? String(gj.properties?.name ?? file) : String(gj.features[0]?.properties?.name ?? file);
    return { features, name, countryCodes: [], stateKeys: [] };
  }
  if (level === "radius") {
    const g = await loadGazetteer();
    const p = g.find(t);
    if (!p) throw new Error(`Place not found for radius highlight: "${t}"`);
    return {
      features: [{ type: "Feature", properties: {}, geometry: radiusCircle([p.lon, p.lat], radiusKm || 100) }],
      name: p.name,
      countryCodes: [],
      stateKeys: [],
    };
  }
  // Continent check (explicit level="continent", "Continent: Asia", or exact continent name in auto/country mode)
  const contMatches = level !== "state" ? findContinentCountries(world, t, "hi") : [];
  if (contMatches.length) {
    const clean = t.replace(/^continent\s*:\s*/i, "").trim();
    return {
      features: contMatches,
      name: clean,
      countryCodes: contMatches.map((c) => c.properties.a3),
      stateKeys: [],
    };
  }
  if (level === "continent") {
    throw new Error(`Continent not found: "${t}". Try Asia, Europe, Africa, North America, South America, Oceania, Antarctica.`);
  }
  if (level !== "state") {
    const c = findCountry(world, t, "hi");
    if (c) {
      return {
        features: [c],
        name: countryLabel(c),
        countryCodes: [c.properties.a3],
        stateKeys: [],
        iso2: c.properties.iso2,
      };
    }
    if (level === "country") throw new Error(`Country not found: "${t}"`);
  }
  const states = await loadStates();
  const [name, country] = t.split(",").map(norm);
  const matches = states.features.filter(
    (f) => norm(f.properties.name) === name && (!country || norm(f.properties.country).includes(country) || norm(f.properties.a3) === country),
  );
  if (!matches.length) throw new Error(`No country or state named "${t}". For states in other countries use "State, Country".`);
  // Prefer India when a state name exists in several countries.
  const pick = matches.find((f) => f.properties.a3 === "IND") ?? matches[0];
  return {
    features: [pick],
    name: pick.properties.name,
    countryCodes: [],
    stateKeys: [`${pick.properties.a3}:${norm(pick.properties.name)}`],
  };
}

export async function resolveShape(spec: ShapeQuery, world: World): Promise<Shape> {
  const rawList = spec.targets && spec.targets.length ? spec.targets : [spec.target];
  const disabled = new Set((spec.disabledTargets ?? []).map(norm));
  const activeTargets = rawList.map((x) => x.trim()).filter((x) => x && !disabled.has(norm(x)));
  if (!activeTargets.length) {
    return {
      feature: { type: "FeatureCollection", features: [] },
      name: rawList[0] ?? "",
    };
  }

  const parts = await Promise.all(activeTargets.map((t) => resolveSingle(t, spec.level, spec.radiusKm, world)));
  const allFeatures = parts.flatMap((p) => p.features);
  const countryCodes = [...new Set(parts.flatMap((p) => p.countryCodes))];
  const stateKeys = [...new Set(parts.flatMap((p) => p.stateKeys))];
  const name = parts.length === 1 ? parts[0].name : parts.map((p) => p.name).filter(Boolean).join(" + ");
  const primaryIso2 = parts[0]?.iso2 ?? "";

  // Single feature and no border merging needed
  if (allFeatures.length === 1 && !spec.mergeBorders) {
    return {
      feature: allFeatures[0],
      name,
      countryCodes,
      stateKeys,
    };
  }

  // If mergeBorders is enabled (or even for multi-country topology merge), use topojson.merge to dissolve shared arcs!
  let internalBorders: MultiLineString | undefined;
  const mergedFeatures: Feature<Geometry>[] = [];

  if (spec.mergeBorders && countryCodes.length > 0) {
    const codeSet = new Set(countryCodes);
    const topo = world.hi.topo;
    const geoms = topo.objects.countries.geometries.filter((g) => codeSet.has((g.properties as CountryProps).a3));
    if (geoms.length > 0) {
      const mergedGeom = merge(topo, geoms as never);
      mergedFeatures.push({
        type: "Feature",
        properties: { name, iso2: primaryIso2, a3: countryCodes[0] },
        geometry: mergedGeom as Geometry,
      });
      if (geoms.length > 1) {
        internalBorders = mesh(
          topo,
          topo.objects.countries,
          (a, b) => a !== b && codeSet.has((a.properties as CountryProps).a3) && codeSet.has((b.properties as CountryProps).a3),
        );
      }
    }
  }

  if (spec.mergeBorders && stateKeys.length > 0) {
    const states = await loadStates();
    const keySet = new Set(stateKeys);
    const sKey = (p: StateProps) => `${p.a3}:${norm(p.name)}`;
    const geoms = states.topo.objects.states.geometries.filter((g) => keySet.has(sKey(g.properties as StateProps)));
    if (geoms.length > 0) {
      const mergedGeom = merge(states.topo, geoms as never);
      mergedFeatures.push({
        type: "Feature",
        properties: { name, iso2: primaryIso2 },
        geometry: mergedGeom as Geometry,
      });
      if (geoms.length > 1) {
        const stateInternal = mesh(
          states.topo,
          states.topo.objects.states,
          (a, b) => a !== b && keySet.has(sKey(a.properties as StateProps)) && keySet.has(sKey(b.properties as StateProps)),
        );
        internalBorders = internalBorders
          ? { type: "MultiLineString", coordinates: [...internalBorders.coordinates, ...stateInternal.coordinates] }
          : stateInternal;
      }
    }
  }

  // Add any remaining features (e.g. radius or custom geojson or unmerged features)
  if (!spec.mergeBorders) {
    if (allFeatures.length === 1) {
      return { feature: allFeatures[0], name, countryCodes, stateKeys };
    }
    return {
      feature: {
        type: "FeatureCollection",
        features: allFeatures.map((f, i) =>
          i === 0 && primaryIso2 ? { ...f, properties: { ...(f.properties ?? {}), iso2: primaryIso2, name } } : f,
        ),
      },
      name,
      countryCodes,
      stateKeys,
    };
  }

  // Also include any non-country, non-state features when mergeBorders is true
  const otherFeatures = parts
    .filter((p) => p.countryCodes.length === 0 && p.stateKeys.length === 0)
    .flatMap((p) => p.features);
  const finalFeatures = [...mergedFeatures, ...otherFeatures];

  return {
    feature:
      finalFeatures.length === 1
        ? finalFeatures[0]
        : {
            type: "FeatureCollection",
            features: finalFeatures,
          },
    name,
    internalBorders,
    countryCodes,
    stateKeys,
  };
}

const queryKey = (s: ShapeQuery) =>
  JSON.stringify([s.target, s.targets ?? [], s.disabledTargets ?? [], Boolean(s.mergeBorders), s.level, s.radiusKm]);

/** Resolves highlight specs into drawable shapes and per-frame timing. */
export function useAreaHighlights(specs: HighlightSpec[], frame: number, fps: number, theme: Theme, borders: BorderView = "india"): ResolvedHighlight[] {
  const world = useWorld(borders);
  const key = world ? `areas:${borders}:${specs.map(queryKey).join("|")}` : null;
  const shapes = useAsset(key, () => loadOnce(key!, () => Promise.all(specs.map((s) => resolveShape(s, world!)))));
  return useMemo(() => {
    if (!shapes) return [];
    return specs.map((s, i) => {
      const start = Math.round(s.startSec * fps);
      const end = s.endSec > 0 ? Math.round(s.endSec * fps) : Infinity;
      return {
        feature: shapes[i].feature,
        internalBorders: shapes[i].internalBorders,
        countryCodes: shapes[i].countryCodes,
        style: s.style,
        color: !s.color || s.color === "auto" ? theme.accent : s.color,
        t: frame - start,
        remaining: end - frame,
        inFrames: 18,
        label: s.label === "auto" ? shapes[i].name : s.label || undefined,
        sublabel: s.sublabel || undefined,
      };
    });
  }, [shapes, specs, frame, fps, theme]);
}

/** Geographic shapes for any list of targets (highlights, region media, framing). */
export function useAreaShapes(specs: ShapeQuery[], borders: BorderView = "india") {
  const world = useWorld(borders);
  const key = world ? `areas:${borders}:${specs.map(queryKey).join("|")}` : null;
  return useAsset(key, () => loadOnce(key!, () => Promise.all(specs.map((s) => resolveShape(s, world!)))));
}

export { matchCountry };
