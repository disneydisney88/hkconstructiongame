# Convert merged OSM ways -> compact game JSON (local meter coords, OBB buildings, road polylines, zones)
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ORIGIN = (114.2200, 22.3240)  # lon, lat of map centre
M_PER_LON = 111320 * math.cos(math.radians(22.324))
M_PER_LAT = 110574

def to_local(lon, lat):
    return ((lon - ORIGIN[0]) * M_PER_LON, (ORIGIN[1] - lat) * M_PER_LAT)  # x east, z south (three.js style)

def load():
    with open(os.path.join(HERE, "merged.json"), encoding="utf-8") as f:
        return json.load(f)["ways"]

def poly_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2

def obb_of(pts):
    # PCA-oriented bounding box of 2D polygon (local x,z)
    n = len(pts)
    mx = sum(p[0] for p in pts) / n; mz = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts) / n
    szz = sum((p[1] - mz) ** 2 for p in pts) / n
    sxz = sum((p[0] - mx) * (p[1] - mz) for p in pts) / n
    tr = sxx + szz; det = sxx * szz - sxz * sxz
    disc = math.sqrt(max(tr * tr / 4 - det, 0))
    lam = tr / 2 + disc
    if abs(sxz) < 1e-9:
        ax = (1.0, 0.0) if sxx >= szz else (0.0, 1.0)
    else:
        v = (lam - sxx, sxz); ln = math.hypot(*v); ax = (v[0] / ln, v[1] / ln)
    ux, uz = ax
    ext = [p[0] * ux + p[1] * uz for p in pts]  # along axis
    ext2 = [-p[0] * uz + p[1] * ux for p in pts]  # perpendicular
    hw = (max(ext) - min(ext)) / 2; hd = (max(ext2) - min(ext2)) / 2
    cx = mx + (max(ext) + min(ext)) / 2 * ux - (max(ext2) + min(ext2)) / 2 * uz
    cz = mz + (max(ext) + min(ext)) / 2 * uz + (max(ext2) + min(ext2)) / 2 * ux
    ang = math.atan2(uz, ux)
    return cx, cz, hw, hd, ang

def h_sh(s):  # deterministic hash
    return abs(hash(s)) % 100000

def parse_h(tags, wayid):
    if "height" in tags:
        m = re.match(r"([\d.]+)", tags["height"])
        if m: return min(float(m.group(1)), 220.0)
    lv = tags.get("building:levels")
    if lv:
        m = re.match(r"([\d.]+)", lv)
        if m: return max(float(m.group(1)) * 3.3, 3.0)
    a = h_sh(wayid)
    return 9.0 + (a % 900) / 900.0 * 28.0  # 9-37m default

ROAD_W = {"motorway": 24, "motorway_link": 14, "trunk": 20, "trunk_link": 12, "primary": 16, "primary_link": 10,
          "secondary": 13, "secondary_link": 9, "tertiary": 10, "residential": 8, "unclassified": 7,
          "living_street": 8, "service": 6, "pedestrian": 9, "footway": 3, "path": 2.5, "track": 3, "cycleway": 2.5}

def decimate(pts, eps=0.2):
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        ax, az = out[-1]; bx, bz = pts[i]; cx, cz = pts[i + 1]
        ux, uz = cx - ax, cz - az; ln = math.hypot(ux, uz)
        if ln < 1e-6: continue
        d = abs((bx - ax) * uz - (bz - az) * ux) / ln
        if d > eps: out.append(pts[i])
    out.append(pts[-1])
    return out

def main():
    ways = load()
    buildings, roads, zones, water, greens, railways, pois = [], [], [], [], [], [], []
    ncons = 0
    for w in ways:
        t = w["tags"]; geo = w["geo"]; wid = w["id"]
        if len(geo) < 2: continue
        pts = [to_local(lo, la) for lo, la in geo]
        closed = len(pts) > 3 and pts[0][0] == pts[-1][0] and pts[0][1] == pts[-1][1]
        if closed: pts = pts[:-1]
        # POIs: named buildings / stations
        nm = t.get("name:zh") or t.get("name") or ""
        if nm and (t.get("railway") == "station" or ("building" in t and len(nm) < 14 and h_sh(wid) % 3 == 0)):
            cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
            pois.append([round(cx, 1), round(cz, 1), nm])
        if "building" in t and closed and len(pts) >= 3:
            area = poly_area(pts)
            if area < 15: continue
            cx, cz, hw, hd, ang = obb_of(pts)
            hgt = parse_h(t, wid)
            kind = 1 if t.get("building") == "construction" else 0
            if kind: ncons += 1
            buildings.append([round(cx, 1), round(cz, 1), round(hw, 1), round(hd, 1), round(ang, 3), round(hgt, 1), kind])
        elif "highway" in t and t["highway"] not in ("steps",):
            rw = ROAD_W.get(t["highway"], 6)
            dp = decimate(pts)
            roads.append({"p": [[round(x, 1), round(z, 1)] for x, z in dp], "w": rw, "n": 1 if t["highway"] in ("motorway", "trunk", "primary", "secondary") else 0})
        elif closed and t.get("landuse") == "construction":
            zones.append([[round(x, 1), round(z, 1)] for x, z in pts])
        elif closed and t.get("natural") == "water":
            water.append([[round(x, 1), round(z, 1)] for x, z in pts])
        elif closed and t.get("landuse") in ("grass", "recreation_ground") or t.get("leisure") in ("park", "pitch", "track", "stadium"):
            greens.append([[round(x, 1), round(z, 1)] for x, z in decimate(pts, 0.5)])
        elif t.get("railway") == "rail":
            railways.append([[round(x, 1), round(z, 1)] for x, z in decimate(pts)])
        elif t.get("waterway") in ("river", "canal", "stream"):
            water.append([[round(x, 1), round(z, 1)] for x, z in decimate(pts, 0.5)])
    out = {"o": ORIGIN, "b": buildings, "r": roads, "z": zones, "w": water, "g": greens, "rw": railways, "poi": pois}
    path = os.path.join(HERE, "mapdata.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"buildings={len(buildings)} (construction={ncons}) roads={len(roads)} zones={len(zones)} water={len(water)} greens={len(greens)} rail={len(railways)} pois={len(pois)}")
    print(f"size={os.path.getsize(path)//1024} KB")
    for p in pois[:40]: print("  POI:", p[2], p[0], p[1])

if __name__ == "__main__":
    main()
