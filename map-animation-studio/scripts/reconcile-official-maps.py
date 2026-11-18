"""
Reconciles `.data-cache/countriesInd.geojson`, `countriesWorld.geojson`, and `states.geojson`
for Map Animation Studio so that:
1. India's national outline in `countriesInd_official.geojson` is the official Survey of India (SOI)
   boundary (identical vertex-for-vertex to the union of all 36 official Indian States & UTs).
2. All 36 Indian States & Union Territories in `states_official.geojson` use the official Survey of India
   state boundaries (`dm_states_clean.geojson` / `dm_states.geojson`), updated for post-2019 / 2020 changes:
   - Full official Jammu and Kashmir UT (including POJK / Muzaffarabad / Mirpur)
   - Full official Ladakh UT (including Gilgit-Baltistan, Siachen, Aksai Chin, Shaksgam Valley)
   - Merged Dadra and Nagar Haveli and Daman and Diu UT
   - Exact official Survey of India names & ISO-3166-2 codes (`IN-JK`, `IN-LA`, `IN-AP`, `IN-AR`, etc.)
3. Neighboring countries (`PAK`, `CHN`, `NPL`, `BTN`, `BGD`, `MMR`, `AFG`) and their border provinces
   in `states_official.geojson` are gap-filled along inland slivers and cleanly clipped against the
   official Survey of India outline so there are zero inland holes, zero overlapping double borders,
   and 100% shared topological border arcs.
4. Globally, fixes split micro-leases & void holes in `countriesInd_official.geojson`,
   `countriesWorld_official.geojson`, and `states_official.geojson`:
   - Removes the 3 uncovered void holes inside Egypt (`EGY`) near the 22nd parallel
   - Merges military base / lease cutouts (`USG` Guantanamo -> `CUB` Cuba, `ESB`/`WSB` -> `CYP` Cyprus,
     `BRI` Brazilian Island -> `BRA` Brazil, and `KAB` Baikonur -> `KAZ` Kazakhstan)
   - Fixes orphan state `adm0_a3` codes (`KAB` -> `KAZ`, `SOL` -> `SOM`, `CYN` -> `CYP`).
"""
import json
import os
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE = os.path.join(ROOT, ".data-cache")


def clean_geom(g, min_area=1e-6):
    g = g.buffer(0)
    if g.is_empty:
        return g
    if isinstance(g, Polygon):
        return g
    if isinstance(g, MultiPolygon):
        polys = [p for p in g.geoms if p.area >= min_area]
        if not polys:
            polys = list(g.geoms)
        return MultiPolygon(polys) if len(polys) > 1 else polys[0]
    if hasattr(g, "geoms"):
        polys = [p for p in g.geoms if isinstance(p, Polygon) and p.area >= min_area]
        for sub in g.geoms:
            if isinstance(sub, MultiPolygon):
                polys.extend([p for p in sub.geoms if p.area >= min_area])
        if not polys:
            return Polygon()
        return MultiPolygon(polys) if len(polys) > 1 else polys[0]
    return g


def remove_interior_holes(g):
    g = clean_geom(g)
    if isinstance(g, Polygon):
        return Polygon(g.exterior)
    if isinstance(g, MultiPolygon):
        return MultiPolygon([Polygon(p.exterior) for p in g.geoms])
    return g


def merge_leases_and_fix_holes(fc):
    """Merges micro-lease cutouts (USG->CUB, ESB/WSB->CYP, BRI->BRA, KAB->KAZ) and strips uncovered EGY holes."""
    MERGE_INTO = {
        "USG": "CUB",
        "ESB": "CYP",
        "WSB": "CYP",
        "BRI": "BRA",
        "KAB": "KAZ",
    }
    extras = {}
    kept = []
    for f in fc["features"]:
        a3 = f["properties"].get("ADM0_A3")
        if a3 in MERGE_INTO:
            target = MERGE_INTO[a3]
            extras.setdefault(target, []).append(clean_geom(shape(f["geometry"])))
        else:
            kept.append(f)

    for f in kept:
        a3 = f["properties"].get("ADM0_A3")
        if a3 in extras:
            g = clean_geom(shape(f["geometry"]))
            g = clean_geom(unary_union([g, *extras[a3]]))
            f["geometry"] = mapping(g)
        if a3 == "EGY":
            g = remove_interior_holes(shape(f["geometry"]))
            f["geometry"] = mapping(g)

    fc["features"] = kept
    return fc


def main():
    print("Loading raw cached GeoJSONs...")
    c_ind = json.load(open(os.path.join(CACHE, "countriesInd.geojson"), encoding="utf-8"))
    c_world = json.load(open(os.path.join(CACHE, "countriesWorld.geojson"), encoding="utf-8"))
    ne_states = json.load(open(os.path.join(CACHE, "states.geojson"), encoding="utf-8"))
    dm_states_path = os.path.join(CACHE, "dm_states_clean.geojson")
    if not os.path.exists(dm_states_path):
        dm_states_path = os.path.join(CACHE, "dm_states.geojson")
    dm_states = json.load(open(dm_states_path, encoding="utf-8"))

    # 1. Build all 36 official post-2019 / 2020 Indian States & UTs from DataMeet Survey of India states
    ne_jk = shape(
        next(
            f
            for f in ne_states["features"]
            if (f["properties"].get("name_en") or f["properties"].get("name")) == "Jammu and Kashmir"
            and f["properties"]["adm0_a3"] == "IND"
        )["geometry"]
    ).buffer(0)
    ne_ajk = shape(
        next(
            f
            for f in ne_states["features"]
            if (f["properties"].get("name_en") or f["properties"].get("name")) == "Azad Kashmir"
            and f["properties"]["adm0_a3"] == "PAK"
        )["geometry"]
    ).buffer(0)
    jk_divider_mask = unary_union([ne_jk, ne_ajk]).buffer(0.008)

    NAME_MAP = {
        "Andaman & Nicobar Island": ("Andaman and Nicobar Islands", "IN-AN"),
        "Andhra Pradesh": ("Andhra Pradesh", "IN-AP"),
        "Arunanchal Pradesh": ("Arunachal Pradesh", "IN-AR"),
        "Assam": ("Assam", "IN-AS"),
        "Bihar": ("Bihar", "IN-BR"),
        "Chandigarh": ("Chandigarh", "IN-CH"),
        "Chhattisgarh": ("Chhattisgarh", "IN-CT"),
        "Goa": ("Goa", "IN-GA"),
        "Gujarat": ("Gujarat", "IN-GJ"),
        "Haryana": ("Haryana", "IN-HR"),
        "Himachal Pradesh": ("Himachal Pradesh", "IN-HP"),
        "Jharkhand": ("Jharkhand", "IN-JH"),
        "Karnataka": ("Karnataka", "IN-KA"),
        "Kerala": ("Kerala", "IN-KL"),
        "Lakshadweep": ("Lakshadweep", "IN-LD"),
        "Madhya Pradesh": ("Madhya Pradesh", "IN-MP"),
        "Maharashtra": ("Maharashtra", "IN-MH"),
        "Manipur": ("Manipur", "IN-MN"),
        "Meghalaya": ("Meghalaya", "IN-ML"),
        "Mizoram": ("Mizoram", "IN-MZ"),
        "Nagaland": ("Nagaland", "IN-NL"),
        "NCT of Delhi": ("Delhi", "IN-DL"),
        "Odisha": ("Odisha", "IN-OR"),
        "Puducherry": ("Puducherry", "IN-PY"),
        "Punjab": ("Punjab", "IN-PB"),
        "Rajasthan": ("Rajasthan", "IN-RJ"),
        "Sikkim": ("Sikkim", "IN-SK"),
        "Tamil Nadu": ("Tamil Nadu", "IN-TN"),
        "Telangana": ("Telangana", "IN-TG"),
        "Tripura": ("Tripura", "IN-TR"),
        "Uttar Pradesh": ("Uttar Pradesh", "IN-UP"),
        "Uttarakhand": ("Uttarakhand", "IN-UT"),
        "West Bengal": ("West Bengal", "IN-WB"),
    }

    india_state_features = []
    dnh_dd_geoms = []

    for f in dm_states["features"]:
        st_nm = f["properties"]["ST_NM"]
        g = clean_geom(shape(f["geometry"]))
        if st_nm in ("Dadara & Nagar Havelli", "Daman & Diu"):
            dnh_dd_geoms.append(g)
            continue
        if st_nm == "Jammu & Kashmir":
            jk_ut = clean_geom(g.intersection(jk_divider_mask))
            ladakh_ut = clean_geom(g.difference(jk_ut))
            india_state_features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Jammu and Kashmir",
                        "name_en": "Jammu and Kashmir",
                        "adm0_a3": "IND",
                        "admin": "India",
                        "iso_3166_2": "IN-JK",
                    },
                    "geometry": mapping(jk_ut),
                }
            )
            india_state_features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Ladakh",
                        "name_en": "Ladakh",
                        "adm0_a3": "IND",
                        "admin": "India",
                        "iso_3166_2": "IN-LA",
                    },
                    "geometry": mapping(ladakh_ut),
                }
            )
            continue
        std_name, iso_code = NAME_MAP[st_nm]
        india_state_features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": std_name,
                    "name_en": std_name,
                    "adm0_a3": "IND",
                    "admin": "India",
                    "iso_3166_2": iso_code,
                },
                "geometry": mapping(g),
            }
        )

    if dnh_dd_geoms:
        merged_dnh = clean_geom(unary_union(dnh_dd_geoms))
        india_state_features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": "Dadra and Nagar Haveli and Daman and Diu",
                    "name_en": "Dadra and Nagar Haveli and Daman and Diu",
                    "adm0_a3": "IND",
                    "admin": "India",
                    "iso_3166_2": "IN-DH",
                },
                "geometry": mapping(merged_dnh),
            }
        )

    print(f"Built {len(india_state_features)} official Survey of India States & UTs.")

    # 2. Official Survey of India national boundary = exact union of the 36 official Indian States & UTs
    soi_geom = clean_geom(unary_union([shape(f["geometry"]) for f in india_state_features]))
    print(f"Official Survey of India area: {soi_geom.area:.4f} deg^2, bounds: {[round(x, 4) for x in soi_geom.bounds]}")

    # 3. Reconcile BOTH country files (user, 2026-11-18: "i want the india map as per EU and RUSSIA, INDIA HAS
    # KASHMIR not the china"): India = official Survey of India outline in the India view AND the old
    # "De facto" world view, so no border setting can ever show PoK/Gilgit-Baltistan as Pakistan or Aksai Chin /
    # Shaksgam as China.
    neighbors = {"PAK", "CHN", "NPL", "BTN", "BGD", "MMR", "AFG", "KAS"}
    ind_box = soi_geom.bounds

    def reconcile_countries(fc):
        ne_ind_geom = clean_geom(
            shape(next(f for f in fc["features"] if f["properties"]["ADM0_A3"] == "IND")["geometry"])
        )
        neighbor_geoms = {
            f["properties"]["ADM0_A3"]: clean_geom(shape(f["geometry"]))
            for f in fc["features"]
            if f["properties"]["ADM0_A3"] in neighbors
        }
        # inland slivers between the old IND outline and the SOI outline go to the touching neighbour
        gap = ne_ind_geom.difference(soi_geom)
        gap_polys = list(gap.geoms) if hasattr(gap, "geoms") else ([gap] if not gap.is_empty else [])
        adds = {a3: [] for a3 in neighbor_geoms}
        for p in gap_polys:
            if p.is_empty or p.area < 1e-8:
                continue
            best_a3, best_len = None, 0.0
            for a3, ng in neighbor_geoms.items():
                if a3 == "KAS":
                    continue
                inter = p.boundary.intersection(ng.boundary)
                if inter.length > best_len:
                    best_len, best_a3 = inter.length, a3
            if best_a3 and best_len > 1e-4:
                adds[best_a3].append(p)
        kept = []
        for f in fc["features"]:
            a3 = f["properties"]["ADM0_A3"]
            if a3 == "IND":
                f["geometry"] = mapping(soi_geom)
            elif a3 == "KAS":
                continue  # "Siachen Glacier" is part of India's Ladakh; never a separate area
            elif a3 in neighbor_geoms:
                g = neighbor_geoms[a3]
                if adds.get(a3):
                    g = clean_geom(unary_union([g, *adds[a3]]))
                if g.intersects(soi_geom):
                    g = clean_geom(g.difference(soi_geom))
                if g.is_empty or g.area < 1e-6:
                    continue  # e.g. KAS (Siachen) is fully inside India
                f["geometry"] = mapping(g)
            kept.append(f)
        fc["features"] = kept
        return merge_leases_and_fix_holes(fc)

    c_ind = reconcile_countries(c_ind)
    out_c_ind = os.path.join(CACHE, "countriesInd_official.geojson")
    json.dump(c_ind, open(out_c_ind, "w", encoding="utf-8"))
    print("Saved reconciled countriesInd_official.geojson")

    c_world = reconcile_countries(c_world)
    out_c_world = os.path.join(CACHE, "countriesWorld_official.geojson")
    json.dump(c_world, open(out_c_world, "w", encoding="utf-8"))
    print("Saved reconciled countriesWorld_official.geojson")

    # 4. Reconcile states.geojson:
    # - Replace all IND states, KAS (Siachen), and PAK's Gilgit-Baltistan / Azad Kashmir with our 36 official Survey of India states
    # - Fill inland slivers between old IND+KAS+PK-GB+PK-JK footprint and `soi_geom` into the touching foreign state, then clip against `soi_geom`
    # - Fix orphan state a3 codes (KAB -> KAZ, SOL -> SOM, CYN -> CYP)
    ORPHAN_A3_MAP = {
        "KAB": ("KAZ", "Kazakhstan"),
        "SOL": ("SOM", "Somalia"),
        "CYN": ("CYP", "Cyprus"),
    }

    ind_box = soi_geom.bounds
    old_ind_state_geoms = []
    foreign_state_features = []
    border_candidate_indices = []

    for f in ne_states["features"]:
        p = f["properties"]
        a3 = p.get("adm0_a3", "")
        nm = p.get("name_en") or p.get("name") or ""
        if a3 == "IND" or a3 == "KAS" or (a3 == "PAK" and nm in ("Gilgit-Baltistan", "Azad Kashmir")):
            if f.get("geometry"):
                old_ind_state_geoms.append(clean_geom(shape(f["geometry"])))
            continue
        if a3 in ORPHAN_A3_MAP:
            new_a3, new_admin = ORPHAN_A3_MAP[a3]
            p["adm0_a3"] = new_a3
            p["admin"] = new_admin
            a3 = new_a3

        idx = len(foreign_state_features)
        foreign_state_features.append(f)
        if a3 in neighbors and f.get("geometry"):
            g = clean_geom(shape(f["geometry"]))
            bx = g.bounds
            if bx and not (bx[2] < ind_box[0] - 0.5 or bx[0] > ind_box[2] + 0.5 or bx[3] < ind_box[1] - 0.5 or bx[1] > ind_box[3] + 0.5):
                border_candidate_indices.append((idx, g))

    old_ind_union = clean_geom(unary_union(old_ind_state_geoms))
    st_gap = old_ind_union.difference(soi_geom)
    st_gap_polys = list(st_gap.geoms) if hasattr(st_gap, "geoms") else ([st_gap] if not st_gap.is_empty else [])
    state_gap_adds = {idx: [] for idx, _ in border_candidate_indices}
    for p in st_gap_polys:
        if p.is_empty or p.area < 1e-8:
            continue
        best_idx = None
        best_len = 0.0
        for idx, fg in border_candidate_indices:
            inter = p.boundary.intersection(fg.boundary)
            if inter.length > best_len:
                best_len = inter.length
                best_idx = idx
        if best_idx is not None and best_len > 1e-4:
            state_gap_adds[best_idx].append(p)

    new_state_features = list(india_state_features)
    cand_dict = dict(border_candidate_indices)
    for idx, f in enumerate(foreign_state_features):
        if idx in cand_dict:
            g = cand_dict[idx]
            if state_gap_adds[idx]:
                g = clean_geom(unary_union([g, *state_gap_adds[idx]]))
            if g.intersects(soi_geom):
                g = clean_geom(g.difference(soi_geom))
                if g.is_empty:
                    continue
            f["geometry"] = mapping(g)
        new_state_features.append(f)

    out_states = os.path.join(CACHE, "states_official.geojson")
    json.dump({"type": "FeatureCollection", "features": new_state_features}, open(out_states, "w", encoding="utf-8"))
    print(f"Saved reconciled states_official.geojson ({len(new_state_features)} features)")


if __name__ == "__main__":
    main()
