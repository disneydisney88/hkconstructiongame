# P9 Hardening 報告 — 2026-10-03

狀態: **EVIDENCED**(本輪測試環境證據;未經人類簽收)
測試環境: 本機 ZCode IAB(Chromium),CSS 1600×900 / canvas 2400×1350,GPU 型號未能讀取 — 所有 FPS 結論只對本機有效。

## P9.1 驗收用字
- 全 repo .md 已掃描:**唔存在**「零版權風險/完全無問題/全部完成/60 FPS 保證/零 bug」字眼(呢啲只出現過喺對話覆述,唔在 committed 檔案)。
- 本報告及後續一律用證據式寫法:「本次測試環境未發現 console error」「測試機 median FPS XX」等。
- 正式修正句:「目前新增第三方素材均記錄為 CC0(ambientCG / Poly Haven / Kenney),來源及授權文件已保存於 `assets/textures/LICENCE.md`;CC0 指授權狀態,唔構成任何法律風險擔保。」

## P9.2 NPC 泥頭車使用 vehicle gate — PASS
- 路線重寫為閘中心穿梭軸(入場→卸貨區→出閘→閘外倒車→循環);發現並避開原有場景物件衝突(安全訓練室貨櫃喺閘前引道,舊隨機路線會卡死)。
- `vehicleGateOpen()` 擴展至 NPC 車 12m 內同樣升起 barrier;倒車 hazard 邏輯不變。
- **加速模擬(同 app.js 同一 steering/collide 公式)**:5 入 + 5 出,10 次穿越全部距車閘中心 ≤0.73m、距行人閘 ≥15.95m、0 次穿圍板、0 卡死、4 次 reverse 循環。
- **實時監察 134 秒**:6 入 7 出,穿越點距車閘 ≤1.97m、距行人閘 ≥15.07m;車喺閘 12m 內時 barrier 開啟比率 100%;reverse 模式多次觸發;連續截圖 `npc_seq_1..4.jpg`。
- 行人路線分隔(幾何驗證):NPC 場內路線軸距離行人通道帶 ≥12m。
- 無 teleport 修正;全程自然駕駛。

## P9.3 Frame-time spike 定位與修復
基線 58.3 秒(2104 幀):median 33.3 / P90 33.4 / P95 33.5 / P99 33.8 / max 66.6 / >33.3ms 幀 538(26%)。

逐項隔離(每項 ~20s,同 tab 條件):
| 配置 | median | >33ms 佔比 |
|---|---|---|
| 基線 | 33.3 | 26% |
| A shadow off | 33.2 | 21% |
| B minimap off | 33.3 | 29% |
| C minimap+labels off | 33.3 | 26% |
| **E NPC 更新 off(其餘全開)** | **16.7** | 6% |
| D NPC+traffic off | 16.7 | 7% |

**結論:spike/30fps 地板來源係 `updateOfficers`+`updateWorkers` 每幀全骨骼動畫,唔係 shadow/minimap/labels。**

修復(按 round-robin 分散,唔係一刀切):>60m 角色 every-3rd-frame 動畫、dt×3 補償(`updateWorkers`;officers 原本已有距離分級)。
修復後(20s/875 幀):**median 16.7 / P90 33.4 / P95 33.4 / P99 33.5 / max 50**;>33ms 佔比 16%。P95 殘留 33.4(隔幀模式仍在,幅度已收窄),列入未來項。

附帶 hardening 發現:一次 IAB 分頁 renderer 進入壞狀態令模型請求永久掛起 → **boot 90 秒 watchdog 正確接住**並顯示「重新載入」;新分頁即恢復。呢個係原本就有嘅防線,實測有效。

## P9.4 Texture / Network Budget
冷快取(fetch cache:'reload' 逐資源實量):
| | 請求 | 傳輸 |
|---|---|---|
| 減量前 | 30 | **17.65 MB** |
| 減量後 | 30 | **9.29 MB**(−47%) |

減量動作(全部 CC0,記錄已更新 LICENCE.md):
- `sky_2k.hdr` 6.8MB → `sky_1k.hdr` 1.7MB(Poly Haven 官方 1K 版)
- Asphalt 1K 三圖 3.7MB → 512 三圖 0.22MB(PIL LANCZOS 本機縮,視覺驗證截圖 `after_texture_reduction.jpg`)
- 移除未再用嘅 1K asphalt 及 2K hdr(慳 repo 體積 ~10MB)
- 餘下最大項:Soldier.glb 2.1MB(只為骨架,列為未來檢討)、worker-v2.fbx 1.4MB、照片貼圖 1.7MB

熱快取(早前量度):~10.9MB → 減量後未重測(資源子集變細,預期同步下降,列 UNVERIFIED)。

## 回歸(本輪測試環境)
- boot → 遊戲啟動 ✓;console error 0
- renderer.info:calls 907 / tris 1,171,963 / textures 153

## 未完成(誠實清單)
1. P95 33.4ms 隔幀殘留(NPC 動畫分批後仍存在;下一候補:shadow pass 與主 pass 交替、GPU 合成節奏,需 trace 級工具)
2. Soldier.glb 2.1MB 只用骨架 — 建議改用細骨架代理或 DRACO
3. SITE2 未升級(P9 範圍外,維持)
4. NPC 上落貨動畫/等待時間未有(現時純路線行為)
5. 減量後熱快取未重測
