# Changelog

## audit-2026.10.02 — development build

- Add procedural safety classroom, supervised health-check presentation, and admission checklist using actual training, health and PPE state.
- Repair startup, hazard scope, pickup interactions, repeated clearance counting and paused event updates.
- Cache worker geometry while keeping independent skeletons; update role appearance and rename foreman to 老陳.
- Improve landing screen, text size and world-label limits; add local Streamlit audit console.
- Include regression checks, browser screenshots and ACCEPTANCE-2026-10-02.md.

This is a development update, not a completed release. Full first-mission payout, all areas/events, financial deduplication, performance requirements and asset licensing remain incompletely verified. No Steam submission or public Streamlit deployment is included.

## Running this source build

Serve the repository with `python server.py 8123`, then open `http://localhost:8123/`. No compilation/bundling step is configured; ES modules, models and other repository assets are loaded by the browser. Internet access is required for the existing Three.js CDN imports. Do not open index.html through file://.

Browser testing used the Codex in-app Chromium browser on Windows. A browser capable of rendering this Three.js/WebGL application is required. Minimum CPU, GPU, RAM and supported mobile devices have not been benchmarked. Python is needed only for the local server/admin interface, not GitHub Pages playback.

See REFERENCES.md and ASSET-CANDIDATES.md for recorded sources. Their existence is not a complete licensing clearance. The two user-provided reference photographs are not included in this commit; qa-evidence contains rendered game screenshots only.

## 2026-10-03 — P0–P7 畫質垂直切片
- P1 共用周界 opening data:連續圍板、行人閘(三棍閘)+車閘(barrier)分離、`?boundary=1` debug overlay(3fec78a)
- P2 程序化高細節泥頭車,修正輪軸,介面不變(cf1688b)
- P3 閘口示範街景:行人路/kerb/班馬線/卸貨區/3棟立面樓(012d2c5)
- P4 CC0 PBR 地面,米制 UV(e3f0dd7)
- P5 HDRI/PMREM 環境光(4182077)
- P6 手推車 GLB→程序化(−410k tri)、泥頭車 LOD、shadow 優化(1a42557)
- 驗收:qa-evidence/p7-acceptance/REPORT.md(全部實測證據)
