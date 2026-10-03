# P8 Polish 報告(回應 GPT 意見)— 2026-10-03

狀態: **EVIDENCED**。回應 GPT 研究入面 P0-P7 未覆蓋嘅具體點。

## 改動清單

| # | GPT 意見 | 改動 | 實測結果 |
|---|---|---|---|
| P8a | normal/roughness 唔應錯當 sRGB | `pbr()` 只對 Color 設 sRGB,Normal/Roughness 保持線性 | 載入 0 error |
| P8b | 板縫後要有立柱,唔可以淨係通透空罅 | 圍板加立柱(每板介面一枝,金屬柱)+ 壓頂條 + 基座,共用 opening data | 截圖 01:柱+壓頂可見 |
| P8c | 閘機要有實體,唔可以穿機 | 三棍閘 3 個機身加碰撞體(留 3 條行人通道) | 周界 270 取樣:269 過,1 個「失敗」係撞正閘機柱 = 預期行為 |
| P8d | shadow 係主要成本 | 動態 shadow LOD:角色/街車距玩家 >70m 每 500ms 檢一次閉投影 | **median FPS 30.1→59.5(16.8ms),fast 幀 145→157/300** |
| P8e | 相片/貼圖應共用 GPU 資源 | `vestTex()` 加 cache(同規格反光衣共用) | GPU textures 198→157(−41) |
| P8f | 車輪圓度/污漬層次 | 街車輪 8→16 邊;泥頭車加泥漬條(斗底外/尾門下/沙板)+ 每架車漆微量隨機差 | 截圖 03;0 error |

## 回歸
- 周界碰撞: 270 取樣,269 pass(1 個係閘機柱預期阻擋)
- 上車 → 開 11.2m → 落車 ✓(wheelZ -20.1rad,z 軸滾動正確)
- console error: 0

## 效能對比(本機 IAB,同位置 300 幀)
| | P7 | P8 |
|---|---|---|
| median | 33.2ms(30.1fps) | **16.8ms(59.5fps)** |
| P95 | 33.5ms | 33.4ms(隔幀殘留) |
| textures | 198 | 157 |

P95 仍有 33ms 隔幀(shadow 幅交替),但 median 已回復基線水平。

## 中途出錯記錄(誠實)
- 一次 sed 殘留 `;` 令瀏覽器載入失敗(「Unexpected token ';'」),即場發現修正;離線 `node --check` 對 object literal 內 `;,` 呢種錯誤原來唔報 — 已改用瀏覽器實載做準則。

## 仍欠(GPT 清單內未做)
- 灰色材質對照截圖(驗收建議)
- 冷/熱快取分開載入量測
- NPC 泥頭車未強制經車閘(路線本身閘外,無穿板風險)
- KTX2/Meshopt(未證明需要)

## 補充驗收(埋單前)
- **灰色材質對照**:04_grey_material_truck.jpg(2,288 個 mesh 統一灰 Standard,同一鏡頭)— 造型/輪廓唔靠光影
- **熱快取載入量測**(performance resource timing):
  - 總傳輸 ~10.9MB(最大:Asphalt Normal 2.4MB、Soldier.glb 2.1MB、worker-v2.fbx 1.4MB)
  - 地圖 mapdata.js 478KB(310ms)、app.js 193KB
  - ai-wheelbarrow.glb 已唔再載入 ✓(P6 成果)
  - 冷快取另加 three.module.js 等 CDN(~1MB 級),本輪未單獨量(IAB 快取行為)
- 建議後續:Asphalt Normal 2.4MB 係最大單項,可換 512 版或 KTX2;Soldier.glb 只為骨架示範,可檢討
