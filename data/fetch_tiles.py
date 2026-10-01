# Download OSM map data in tiles (API limit: 50000 nodes/request) and merge.
import urllib.request, xml.etree.ElementTree as ET, json, time, sys, os

BBOX = (114.2050, 22.3160, 114.2350, 22.3320)  # west, south, east, north (Kowloon Bay / Kai Tak / Kwun Tong)
COLS, ROWS = 4, 4
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "merged.json")

def fetch(w, s, e, n, tries=4):
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={w},{s},{e},{n}"
    for t in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "hk-gta-dev/1.0 (game dev map data)"})
            body = urllib.request.urlopen(req, timeout=120).read()
            if body.startswith(b"You requested") or b"too many nodes" in body[:200]:
                raise RuntimeError("too many nodes")
            return body
        except Exception as ex:
            print(f"  tile({w:.4f},{s:.4f}) try{t+1}: {str(ex)[:90]}")
            time.sleep(3 + t * 3)
    return None

def main():
    nodes, ways = {}, {}
    dw = (BBOX[2] - BBOX[0]) / COLS
    dh = (BBOX[3] - BBOX[1]) / ROWS
    ok = 0
    for r in range(ROWS):
        for c in range(COLS):
            w = BBOX[0] + c * dw; e = w + dw
            s = BBOX[1] + r * dh; n = s + dh
            print(f"tile r{r} c{c}: {w:.4f},{s:.4f},{e:.4f},{n:.4f}", flush=True)
            body = fetch(w, s, e, n)
            if body is None:
                print("  FAILED, skipping"); continue
            ok += 1
            root = ET.fromstring(body)
            for el in root:
                if el.tag == "node":
                    nodes[el.get("id")] = (float(el.get("lon")), float(el.get("lat")))
                elif el.tag == "way":
                    tags = {t.get("k"): t.get("v") for t in el.findall("tag")}
                    nds = [nd.get("ref") for nd in el.findall("nd")]
                    ways[el.get("id")] = {"tags": tags, "nds": nds}
            time.sleep(1.2)
    print(f"tiles ok: {ok}/{COLS*ROWS}, nodes: {len(nodes)}, ways: {len(ways)}")
    # resolve way geometries, drop ways with missing nodes
    out_ways = []
    for wid, w in ways.items():
        if any(ref not in nodes for ref in w["nds"]):
            continue
        w["geo"] = [nodes[ref] for ref in w["nds"]]
        out_ways.append({"id": wid, "tags": w["tags"], "geo": w["geo"]})
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"ways": out_ways}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"saved {OUT}: {len(out_ways)} ways, {os.path.getsize(OUT)//1024} KB")

if __name__ == "__main__":
    main()
