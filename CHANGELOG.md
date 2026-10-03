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

## 2026-10-03 — P8 polish(回應 GPT 意見)
- 修正 PBR 貼圖色彩空間(只有 Color 用 sRGB)
- 圍板立柱+壓頂+基座;三棍閘機身碰撞體(3條通道)
- 動態 shadow LOD(角色/街車>70m閉投影):median FPS 30→59.5
- vestTex cache:GPU textures 198→157;街車輪16邊;泥頭車泥漬+車漆微差
- 證據: qa-evidence/p8-polish/REPORT.md

## 2026-10-03 — P9 Hardening(RC 收斂)
- P9.2 NPC 泥頭車真正經 vehicle gate 穿梭(實時6入7出+模擬5入5出,零穿板/零行人閘)
- P9.3 profiling 確認 spike 源於角色每幀全骨骼動畫 → >60m 角色round-robin每3幀動畫,median 33.3→16.7ms
- P9.4 冷快取 17.65→9.29MB(sky 1K + asphalt 512)
- 驗收用字全面證據式;boot watchdog 實測有效
- 證據: qa-evidence/p9-hardening/REPORT.md

## 2026-10-03 — P10 Visual Cohesion(香港地盤入口 vertical slice)
- 水馬/三棍閘/PPE架/貨櫃重造(零裸placeholder);gatehouse結構柱+簷邊
- 近景4棟樓façade attachment(窗框內凹/AC/水管/地下舖/簷篷/天台欄)
- 實體告示牌×4(鋼支架+厚度);斑馬線厚度/接縫線/車閘口帶泥(邏輯位置)
- UI de-clutter:halo細化減透明、label 32m淡出42m隱藏、PPE sprite縮細
- Guardrail:水馬clone→InstancedMesh修復(33.2→16.8ms);final median +0.6% vs基線
- 證據: qa-evidence/p10-cohesion/(before/after 5鏡頭+UI minimal)

## 2026-10-03 — P10.1 Visual acceptance correction
- Hero façade:玻璃3材質variation/sill窗台/slab edge/plinth;排水渠帶+公用事業蓋
- Truck silhouette:cab兩段+A柱/大斜擋風/門縫門柄/胎厚.55+胎紋/輪拱加大/斗壁加厚肋凸出/頂marker燈
- 貨櫃門絞+角鑄件;載入系統hardening(fetch→parse/static import/parse timeout+降級/paint race)
- 性能:median 16.7(平基線),draw calls 1063→450,tri −12%
- 證據: qa-evidence/p10-1-correction/(before C1-5/after D1-7含灰模+UI minimal)
