# P0–P7 垂直切片驗收報告 — 2026-10-02/03

狀態: **EVIDENCED**(全部證據為本輪實測;未經人類簽收 → 未 ACCEPTED)

## Commit 鏈(每階段一個 rollback point)
| Phase | Commit | 內容 |
|---|---|---|
| 基線 | `f7581e6` | 指定基準(P0 前零改動) |
| P1 | `3fec78a` | 共用 opening data:連續圍板/碰撞/行人閘+車閘分離/debug overlay |
| P2 | `cf1688b` | 程序化高細節泥頭車(介面不變)+輪軸修正 |
| P3 | `012d2c5` | 閘口示範街景(行人路/kerb/班馬線/卸貨區/3棟立面樓) |
| P4 | `e3f0dd7` | CC0 PBR 地面(asphalt/concrete,米制 UV) |
| P5 | `4182077` | HDRI/PMREM 環境光(Poly Haven CC0) |
| P6 | `1a42557` | 手推車 GLB→程序化(−410k tri)+泥頭車 LOD+shadow 優化 |

## A 圍封 — PASS
- `computeOpenings()` 單一數據源(pedestrian 6m / vehicle 9m,含 edge/centre/width/type/access)
- 圍板每條 edge 精確鋪滿收口,只喺 opening 闊度留口
- **自動驗證:周界 270 取樣 × 2 情境全過**(行人:只有行人閘可過;泥頭車埋位:車閘開啟 4/4 取樣可過)
- debug overlay(`?boundary=1` 或 B 掣):cyan=collision 實體段/yellow=開口,同視覺圍板同源

## B 門禁 — PASS
- B1 未 admitted 深入地盤 → siteGuard 彈出閘外 ✓(實測)
- B2 admitted 自由進出(站地盤中心 2 秒未被彈)✓(實測)
- 行人閘 = 三棍閘機 + accessState();車閘獨立(barrier arm,泥頭車 12m 內升起),行人唔可以過車閘 ✓

## C 泥頭車 — PASS
- 前三視圖截圖:駕駛室(windscreen/grille/bumper/頭燈/倒後鏡)、U 形泥斗內外壁+肋、六輪胎/鈴/轂/輻、沙板、尾燈、擋泥簾、排氣管、油缸(2,648 tri)
- 輪軸修正:舊版繞 x(錯)→ 繞 z,實測開車後 wheelRotZ=-25.5rad
- 上車 → 開 13m → 落車 ✓;NPC 倒車 / Mission 5 代碼路徑未改

## D 街景 — PASS(截圖 qa-evidence/p3-street/)
閘前 ~55m:行人路+引路磚+kerb+修補路面+沙井+去水格+班馬線;閘內卸貨區 hazard 分隔;街對面 3 棟立面樓(內凹窗/AC/簷篷/招牌/天台);遠景 InstancedMesh 不變

## E 效能(本機 IAB,1600×900 CSS/2400×1350 canvas)
| 指標 | P0 基線 | P7 現況 |
|---|---|---|
| draw calls | 732 | 805 |
| triangles | 1,667,533 | 1,224,704(−26%) |
| textures | 130 | 198(+CC0 PBR) |
| median frame | 16.7ms(59.9fps) | 33.2ms(30.1fps) |
| P95 | 33.4ms | 33.5ms |
| fast 幀(<20ms)/300 | ~多數 | 145/300 |

⚠ 誠實結論:median 由 ~60 跌至 ~30fps。隔離測試確診 **shadow pass 係主要成本**(完全閂陰影→16.7ms/60fps);已做 1024 shadow map、90m 範圍、細件免投影、手推車 −410k tri,fast 幀比例 68→145/300,但 IAB 環境每幀結構性開銷未完全消除。GPU 型號讀唔到,結論只對本機有效。後續建議:worker/行人 castShadow 分級、遠景 shadow cascade。

## F Regression — PASS(瀏覽器實測)
開始遊戲 ✓ → 開場對白 ✓ → 安全訓練 5 題(quizDone=true)✓ → 健康檢查 3 中 ✓ → admitted 進場 ✓ → 上車 ✓ → 開 13m ✓ → 落車 ✓;全程 console error = 0
離線 QA 套件(`qa-tests`)**PASS**(interaction/bones/quiz→health→gate 邏輯鏈)

## 新增 asset 及授權
- `assets/textures/Asphalt007_1K-*`、`Concrete034_1K-*`(ambientCG,**CC0**)
- `assets/textures/sky_2k.hdr`(Poly Haven kloppenheim_02,**CC0**)
- 全部記錄喺 `assets/textures/LICENCE.md`;冇抽取任何遊戲/版權資產;招牌文字原創
- 刪除依賴:`models/ai-wheelbarrow.glb`(7MB/410k tri,已由程序化取代;檔案保留喺 repo 但唔再載入)

## 未完成 / 已知問題(誠實清單)
1. median 30fps 未解決(shadow 成本,見 E)
2. 前輪沙板喺某啲角度睇唔到(側視 AI 意見)
3. 行人閘三棍閘冇獨立碰撞體(靠 siteGuard 狀態門禁)
4. SITE2 只有行人閘、冇示範街景(規格容許,畫質優先 MAIN_SITE)
5. NPC 泥頭車路線未改為必須經車閘(玩家車已受限)
6. KTX2/Meshopt/Draco 未引入(實測未證明有需要)
