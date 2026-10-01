# Inject data/mapdata.json into mapdata.js
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "data", "mapdata.json"), encoding="utf-8") as f:
    raw = f.read()
# validate
json.loads(raw)
with open(os.path.join(HERE, "mapdata.js"), "w", encoding="utf-8") as f:
    f.write("window.MAP_DATA=" + raw + ";\n")
print("mapdata.js written:", os.path.getsize(os.path.join(HERE, "mapdata.js")) // 1024, "KB")
