# P10.1 Visual Acceptance Correction 報告 — 2026-10-03

狀態: **EVIDENCED**(本輪測試環境;未經人類簽收)
基準: `7602e06` → 本輪 commit(見 git log)
測試環境: 本機 IAB,1600×900 CSS / 2400×1350 canvas,GPU 型號未可讀 — FPS 結論只對本機有效。

## A. 裸 primitive placeholder — 全 demo zone 掃描
程式掃描(閘口 ±60m,單一 BoxGeometry、無兄弟細節、無 label):
- 命中 1 件:泥頭車 **LOD1 積木體** — 佢係 LOD 遠距替身,運行時近鏡唔會顯示(實測 currentLevel=0),屬系統設計 KEEP。
- 用戶截圖右前大藍盒 = 地盤寫字樓貨櫃 → 已加門絞位×4+頂角鑄件+瓦楞肋(P10 已有肋,今輪加遠距可讀細節)。
- 閘口橙色群 = 水馬(P10 已梯形+反光帶)及磚籠/油桶(有用途物料,KEEP)。
- 結論:正常鏡頭下無「用途不明裸 box」殘留。

## B. Hero façade(近景樓宇)
升級 P10.3 模組:最近一棟做 hero(5 欄窗,其餘 3 欄):
- 玻璃改 3 個共享材質輪流(反射天色/暗室/拉簾)— 唔再全部同黑度
- 每窗加 **sill 出簷窗台**;窗框保留;玻璃入牆 .16(reveal)
- hero 樓加**層間 slab edge**;全部樓加 **plinth 基座條**
- AC 機/外露水管/地下舖/簷篷/天台欄保留;全部 InstancedMesh(4+3 個 draw call 內)

## C. Building base / street transition
行人路外緣加**連續排水渠帶**(0.35m 深色金屬+每 2m 格柵淺槽)、**公用事業蓋×2**(電訊橙/電力灰,唔同色)、配合 P10 plinth。無隨機垃圾填場。

## D. Truck silhouette polish(只動 visual,controller/介面零改動)
- **cab 兩段式**:下段(腰線)+上段內收 → 唔再成塊直切;**A 柱**立體;**擋風玻璃 .78 高、傾角 -.16→-.24**、面積加大;側窗連框;**門縫+門柄**(chrome)
- **輪胎 .42→.55 厚**+8 塊胎紋(兩色交錯);鈴/轂/輻分層;**輪拱 .74→.82 半徑**包住厚胎,長度加長
- **泥斗**:側壁 .1→.16 厚、頂黃欄外翻、加勁肋凸出 .05→.1、內襯分明;cab-斗銜接不變
- **前臉**:水箱罩+格柵橫條+防撞槓+頭燈+**頂 marker 燈**;倒後鏡重新定位
- 六輪位置不變(1.7/−.45/−1.65),footprint/collision 零改動

## E. Draw-call / performance guardrail(3 跑取中位)
| | 7602e06 基線 | P10.1 後 |
|---|---|---|
| median | 16.8ms | **16.7ms** |
| P90/P95/P99 | 33.3/33.4/33.5 | 33.3/33.4/33.5 |
| draw calls | 1063 | **450(−58%)** |
| triangles | 1.28M | 1.13M(−12%) |
| textures | 188 | 176 |

無惡化;draw calls 大幅回落(水馬 InstancedMesh 化+胎紋/細件唔投影)。P95 33ms 隔幀殘留維持已知水平。

## F. 同鏡頭 before/after(+grey +UI minimal)
`qa-evidence/p10-1-correction/before/`(C1–C5,7602e06)vs `after/`(D1–D5 同鏡頭):
- D1=用戶 gate 角度、D2=車前 3/4、D3=側面、D4=車尾 3/4、D5=人車比例
- **D6 灰模**:全場 2665 個 mesh 換統一灰 Standard 後 truck 輪廓仍成立(層次靠幾何唔靠貼圖)
- **D7 UI minimal**:HUD/marker/labels 關閉下場景獨立成立
同 resolution/DPR/FOV/時段/玩家位置。

## G. Regression(本輪實測)
上車(4 下內)✓ → 開 8.3m(輪轉 −15rad,z 軸)✓ → 落車 ✓;NPC 車喺車閘 12m 內 barrier 開啟 ✓;console error 0。

## 附帶 hardening(載入系統 — 環境逼出嚟嘅真 bug 修復)
本輪 IAB 環境出現三個靜默掛死模式,已全部修復(`boot.js` + `index.html` + `app.js` 頂部):
1. `loader.load()` 內部 XHR 靜默阻塞 → 改 **fetch→loader.parse**(官方 API)
2. **dynamic import() 對 localhost 靜默 pending** → boot.js 改靜態 import;app.js 改 index.html 靜態 `<script type="module">` 載入,頂部等 `WORKER_MODELS`(健康環境零等待)
3. **GLTF parse 的 texture 解碼 onLoad 可以永遠不返回** + **rAF 壞死令 paint() 永遠掛起** → parse 加 20s timeout+一次重試;paint() race 300ms fallback;模型全敗降級程序化角色,唔阻塞進入遊戲;boot watchdog 保留
以上喺健康環境行為不變(模型已就緒時 app.js 即刻執行)。

## 未完成項目(誠實)
1. P95 33.4ms 隔幀殘留(維持已知水平,本輪按指示未追)
2. 灰模截圖只覆蓋 truck 主鏡頭一個角度
3. IAB tab 長時間後 renderer/rAF 會壞死(環境問題;boot 已不會因此掛死,會顯示可重試狀態)— 遊戲 loop 本身仍依賴 rAF,壞死 tab 內無法遊玩,需要重新載入
4. 招牌/簾窗 variation 只做 hero 樓;其餘 3 棟維持 3 欄
