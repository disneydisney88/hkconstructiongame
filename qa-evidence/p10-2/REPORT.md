# P10.2 External Asset Audition 報告 — 2026-10-04

狀態: **RESEARCH + AUDITION SCENE 交付**。未經 KL 人類目視確認,任何候選都唔算 accepted asset。

## A. 泥頭車候選研究(Sketchfab 頁面核對)

| # | 模型 | 作者 | 授權 | 三角 | 貼圖 | 格式 | NoAI | 可下載 |
|---|---|---|---|---|---|---|---|---|
| 1 | [Isuzu Giga Dump Truck](https://sketchfab.com/3d-models/isuzu-giga-dump-truck-3349f2616d0345f49cda7e8fa5619d80) | wolfoo motors (@mariteslara) | CC-BY 4.0 | 80.7k | 頁面未列 | 頁面未列(下載後知) | 冇標示 | ✓(230 下載) |
| 2 | [Dump Truck (ElectroNick)](https://sketchfab.com/3d-models/dump-truck-781c616da8f44982a59cb3fc3fa67f98) | ElectroNick | CC-BY 4.0 | 34.3k | PBR 4K | 頁面未列 | 冇標示 | ✓(15 下載) |
| 3 | [Hino FM 340 TH](https://sketchfab.com/3d-models/hino-fm-340-th-dc27dfeaab5c43c69870107fa5fb7d61) | drcrazzie | CC-BY 4.0 | 38.3k | Substance Painter 上貼 | 頁面未列 | 冇標示 | ✓(22 下載) |

**下載阻塞(重要)**:三個候選喺 Sketchfab — 實際檔案下載需要 Sketchfab 帳戶 API token(`api.sketchfab.com/v3/models/{uid}/download` 要 `Authorization: Token`)。本環境冇憑證,**候選 GLB 未有實檔**,audition scene 已留 slot(`models/candidates/isuzu_giga_dump.glb` 等,放入即自動載入)。隨檔 licence 全文、輪組/斗分件、attribution 格式要**下載後開包先可以核實**(頁面資料唔足夠做最後確認)。

## B. Audition Scene — 已交付
`audition.html` + `audition.js`:同一地面/光照/相機預設(側面/前34/後34),黃柱 = 1.78m 工人比例參考:
- 現有程序化泥頭車(P10.1R 版抽錄,自包含)✓ 已在場
- Candidate 1/2/3 slots:等 GLB 檔案,放入即載
- CSDI 實景組 ✓ 已載入(見 C)
- 截圖:`A1_truck_side.jpg`(側面+工人比例)、`A2_truck_front34.jpg`、`C1/C2`(CSDI)
- **未經批准唔會改 makeTruck controller**(audition 完全獨立於 game)

## C. CSDI 香港 3D 建築 — 實測結果(10 條問題)

| 問題 | 答案(實測) |
|---|---|
| 1. 可否取得九龍灣真實 building geometry | **可以** — 已實際下載 MAIN_SITE(MegaBox 附近)建築 b3dm |
| 2. 資料格式 | Cesium 3D Tiles(b3dm = glTF + 28-byte header);**需 API key(免費,向 3dmap@landsd.gov.hq 申請;文件附 sample key 可試) |
| 3. Texture 有無 | **有** — KTX2(GPU 壓縮)貼圖,Three.js 需 KTX2Loader+basis transcoder |
| 4. 原始下載量 | 全港 tileset 索引 17KB;九龍灣小範圍 leaf:**1.9MB(b3dm,37k tri)+ 0.29MB(4.5k tri)**;全港總量 12.2M tri / 218,927 components |
| 5. 可否轉 GLB | **可以** — b3dm 剝 28-byte header 即係 glTF-Binary,已轉(`models/candidates/csdi_kowloonbay.glb`) |
| 6. 轉換後 triangles | 實測 37,445(大塊)/ 4,534(小塊) |
| 7. Three.js loading cost | GLTFLoader+KTX2Loader 已成功載入 audition scene(1.9MB 傳輸+KTX2 解碼);座標系注意:tile 局部框架係**旋轉框架**(非 Y-up),直接擺會傾斜/飄移 — 需要 ECEF→ENU 轉換先可以正確落地 |
| 8. Attribution 要求 | 免費商用/非商用;**必須清楚標明資料來源為香港特區政府及該網站**,承認政府知識產權;"as is" 無保證,政府可隨時修訂/終止 |
| 9. Public GitHub 合規 | 條款容許 download/distribute/reproduce **只要附來源標示** — 技術上可行;但建議 public repo 附 ATTRIBUTION + 條款連結,並避免整包鏡像(逐 tile 按需載入更穩陣) |
| 10. 可否做 100m–1000m background | **最適合** — 3D Tiles 本身為 LOD streaming 設計;建議用 3D Tiles renderer(如 NASA-AMMOS/3DTilesRendererJS)或揀選 tile 預轉 GLB 做 background 層 |

**比較截圖**:`C1_csdi_vs_procedural_city.jpg` / `C2_csdi_closeup.jpg` — 同場有(a)程序化 OSM 盒樓 vs (b)CSDI 實景幾何。已發現:CSDI 幾何係真樓形(唔係方盒),但直接擺會**傾斜+飄移**(tile 局部框架旋轉),整合需 ECEF→ENU 轉換 — 屬已知工作量,唔係阻塞。

## D. 設備候選(研究,唔整合)

| 類型 | 候選 | 授權 | 三角 | 附註 |
|---|---|---|---|---|
| 挖掘機 | [Komatsu Low Poly Excavator](https://sketchfab.com/3d-models/komatsu-low-poly-excavator-e462545400c64c85b23fd690ef5a8969)(zanimate.id) | CC-BY 4.0 | 48.1k | 可下載;arm/boom 分件未核實(下載後檢查);頁面冇 NoAI |
| 塔吊 | [Tower Crane](https://sketchfab.com/3d-models/tower-crane-49851dc7a51b43bda6aea06856c26a85)(ACM 論文引用其 CC-BY) | CC-BY | 未核實 | 需開包核實 licence badge |
| 發電機 | 建議先用 **Kenney CC0** 工業包(已在 repo:`assets/kenney-industrial/`,現有貨櫃同源)代替新外部候選 — 零授權風險 | CC0 | 低 | 瀏覽器友好 ✓ |
| 施工道具包 | Kenney City/Industrial Kit(CC0)為主;Sketchfab 施工道具包多數 CC-BY 但逐件核實成本高 | CC0 | 低 | 建議維持 Kenney 為道具來源 |

## E. Performance budget 對照
- Hero truck 目標 ≤100k tri:三候選全部符合(34k–81k)✓
- Hero excavator ≤100k:Komatsu 48.1k ✓
- Background building:CSDI 3D Tiles 原生 LOD(REPLACE refine)符合 tile/LOD 要求;預轉 GLB 時要逐塊限制
- Texture:ElectroNick 4K **超標** → 需降 2K 再收貨;CSDI KTX2 已係壓縮格式 ✓;其餘 1K/512 ✓

## F. 建議(候選 table 總結)

| Asset | 建議 |
|---|---|
| Isuzu Giga(C1) | **值得試載** — 三角最高但係真車比例;需 KL 提供 Sketchfab token 下載後開包核實分件/貼圖 |
| ElectroNick(C2) | **試載** — 34.3k+PBR 最 fit budget;4K 貼圖要降 2K |
| Hino FM 340(C3) | **hybrid 評估**:若 cab/chassis 可分件,配合現有 dump body 可行;需下載核實分件 |
| Komatsu excavator | 留 P11 候選(CC-BY,48k) |
| CSDI 3D 建築 | **強烈建議做 background 層**(100m–1000m),需解 ECEF→ENU 轉換 + attribution 標示;100m 內近景維持程序化+façade |

## 未完成 / 阻塞
1. **Sketchfab 下載需 KL 嘅帳戶 token**(設定 `SKETCHFAB_TOKEN` 環境變數或手動下載放入 `models/candidates/` 用建議檔名,audition scene 即時試載)
2. 隨檔 licence 全文/分件/貼圖解析度核實 — 要實檔
3. CSDI ECEF→ENU 落地轉換未寫(已證實需要);CSDI attribution 標示未加入遊戲(整合時做)
4. audition scene 嘅 CSDI 幾何現時傾斜顯示(框架旋轉),比較截圖已如實反映

---

# P10.2-R Corrective Pass — 2026-10-04

狀態:解析✓ / 貼圖✓(KTX2 1/1) / 擺位✓(spec chain+落地) / **視覺:待 KL 目視確認**

## 一、工程範圍確認
- 基準:`14eb158` + worker colour fix(`3ea02af`)。已核對 `git diff 14eb158..HEAD --name-only`:P10.2 及本輪 **零 gameplay 檔案改動**(只觸及 audition/candidates/qa-evidence/CHANGELOG)。P10.1R 對 app.js/worker-rig.js 嘅改動係 14eb158 之前已批准嘅 P10.1R 範圍。
- 冇混入任何其他 workspace 規則或 checkpoint。

## 二、CSDI 修復(不依賴 Sketchfab token)

### 1. C1 截圖物件判別
- 中間巨大長方體 = **我方程序化對照樓**(刻意放置,標示用途)— 已移到獨立對照位置,唔再遮擋 CSDI。
- 右上灰色物件 = **真正 CSDI mesh**(真香港建築幾何)— 修復前因局部框架旋轉而傾斜/懸浮。

### 2. b3dm 解析(真實做法,唔係「剝 28 bytes」簡寫)
按 spec 依序:header 28 bytes(magic 'b3dm'/version/byteLength + 四個 table 長度)→ featureTableJSON(20B,`{"BATCH_LENGTH":0}`,**無 RTC_CENTER**)→ featureTableBinary(0)→ batchTableJSON(0)→ batchTableBinary(0)→ GLB 起點 = 28+20+0+0+0 = **48**(8-byte 對齊後仍 48)。已驗:glTF magic ✓ / version 1 ✓ / declared byteLength == 實際 ✓(見 `_csdi_transform.mjs` 輸出 `declaredOK:true`)。

### 3. Transform chain(根因 + 完整鏈)
- **根因**:P10.2 首輪漏咗 **tileset root.transform**(4×4,局部→ECEF)— 呢個矩陣令局部框架傾斜(ECEF 對齊),直接擺入 Y-up 場景就會傾斜+飄移。
- 完整鏈:`p_scene = ENU(MegaBox錨點) × T_root × Rx90(Y-up→Z-up) × p_gltf`
- 軸向約定唔靠估:實測 4 個候選,內容質心距錨點 **C2(Rx90)=35m**(C1 identity=18.1km、C3=25.6km、C4=6.9km)→ C2 勝出,同 Cesium `Y_UP_TO_Z_UP` 約定一致 ✓
- RTC_CENTER:無;glTF node transforms:無(9 nodes 全 identity);嵌套 tile JSON:無 transforms — 鏈只有 root 一層,已全套用,無漏無重。
- 數值驗證:place(content bbox) → 錨點附近 75m×52m 街區,高度 −15.7..+35.6m(合理樓高+地形差)✓

### 4. 錨點/單位/基準
- 錨點 = MegaBox(22.3245N, 114.2172E,WGS84);單位 = 米;地面 datum = 錨點地面,Y 位移統一調整(**單一剛體平移**,建築相對位置全程保留,冇逐棟落地)。
- 加 GridHelper 400×400 地面格線 + 1.78m 黃柱參考。

### 5. KTX2 實測
- `csdi_kowloonbay.glb`:KTX2 **1/1 材質解碼成功**(KTX2Loader + basis transcoder @ CDN),畫面可見真實貼圖色彩。無 fallback、無假稱。

### 6. 修前/修後同鏡頭
- `C6_csdi_megabox_block.jpg`(修後,420/120/380 → 原點):**真實 MegaBox 曲線屋頂建築群,直立、貼地、比例正確**,旁邊程序化對照方塊 + 綠色程序化車
- 修前對照:`C1_csdi_vs_procedural_city.jpg`(傾斜灰塊懸浮右上)
- `C3_csdi_honest_state.jpg`:平面狀態如實記錄(修復途中)

## 三、泥頭車候選 — BLOCKED 清單
綠色車已標 **PROCEDURAL_BASELINE**(場內 sprite 標示,唔當新資產成果)。

| 候選 | 原頁 | 作者 | 授權 | 狀態 |
|---|---|---|---|---|
| 1 | sketchfab.com/3d-models/isuzu-giga-dump-truck-3349f2616d0345f49cda7e8fa5619d80 | wolfoo motors | CC-BY 4.0 | **BLOCKED:需 Sketchfab 帳戶** |
| 2 | sketchfab.com/3d-models/dump-truck-781c616da8f44982a59cb3fc3fa67f98 | ElectroNick | CC-BY 4.0 | **BLOCKED:同上** |
| 3 | sketchfab.com/3d-models/hino-fm-340-th-dc27dfeaab5c43c69870107fa5fb7d61 | drcrazzie | CC-BY 4.0 | **BLOCKED:同上**(hybrid 評估用) |

**手動下載步驟(官方網站,唔需要喺聊天貼 token)**:
1. 登入 sketchfab.com → 開候選頁 → 撳「Download 3D Model」
2. 格式揀 **glTF/GLB**(如有);zip 內可能係 .gltf+bin+貼圖,**唔一定單一 .glb**
3. 解壓後放入 `models/candidates/`(對應檔名見 `audition.js` slots),keep 原檔做 licence 證據
4. 轉換/降貼圖版本另存 derived 檔名,唔覆蓋原檔

## 四、試載場驗收狀態(分明,唔混)
| 項目 | 狀態 |
|---|---|
| PROCEDURAL_BASELINE 車 | ✓ 顯示中(標示牌) |
| Candidate 1–3 | **BLOCKED**(等實檔) |
| CSDI b3dm 解析 | ✓(header/table/GLB 全驗證) |
| CSDI KTX2 貼圖 | ✓ 1/1 解碼 |
| CSDI 擺位 | ✓ spec chain+落地 |
| 視覺 | **待 KL 目視確認** |

## 五、Performance(本機 IAB,1600×900)
- CSDI tile:56,558 tri / 4 mesh / 1 KTX2 材質 — 載入後場景 draw calls 無異常波動
- 測試機:本機 Windows(IAB);解析度 1600×900 CSS / 2400×1350 canvas
- frame-time 覆測(第 4 節場景,npc-off):median 16.7ms = 基線水平
- 呢輪唔涉及 makeTruck triangle 變更(車無改)

## 未完成
1. 三個 Sketchfab 候選實檔(BLOCKED,等 auth/手動下載)
2. CSDI 正式整合入 game(ECEF→ENU 鏈已寫喺 `_csdi_transform.mjs` 可參考,未接 game)
3. CSDI 高 LOD 版(R9 全區)對比 — 現用 R1 低 LOD 街區
4. 視覺確認 — KL 關卡

__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/c/Users/klcho/AppData/Local/Temp/zcode-4a5184f5-d242-41d3-9ffa-fcf97bf85024-cwd'; fi
exit "$__zcode_status"


---

# P10.2-R Corrective Pass — 2026-10-04

狀態:解析✓ / 貼圖✓(KTX2 1/1) / 擺位✓(spec chain+落地) / **視覺:待 KL 目視確認**

## 一、工程範圍確認
- 基準:`14eb158` + worker colour fix(`3ea02af`)。已核對 `git diff 14eb158..HEAD --name-only`:P10.2 及本輪 **零 gameplay 檔案改動**(只觸及 audition/candidates/qa-evidence/CHANGELOG)。P10.1R 對 app.js/worker-rig.js 嘅改動係 14eb158 之前已批准嘅 P10.1R 範圍。
- 冇混入任何其他 workspace 規則或 checkpoint。

## 二、CSDI 修復(不依賴 Sketchfab token)

### 1. C1 截圖物件判別
- 中間巨大長方體 = **我方程序化對照樓**(刻意放置,對照用途)— 已移到獨立對照位置,唔再遮擋 CSDI。
- 右上灰色物件 = **真正 CSDI mesh**(真香港建築幾何)— 修復前因局部框架旋轉而傾斜/懸浮。

### 2. b3dm 解析(真實做法,唔係「剝 28 bytes」簡寫)
按 spec 依序:header 28 bytes(magic 'b3dm'/version/byteLength + 四個 table 長度)→ featureTableJSON(20B,`{"BATCH_LENGTH":0}`,**無 RTC_CENTER**)→ featureTableBinary(0)→ batchTableJSON(0)→ batchTableBinary(0)→ GLB 起點 = 28+20+0+0+0 = **48**(8-byte 對齊後仍 48)。已驗:glTF magic ✓ / version 1 ✓ / declared byteLength == 實際 ✓(見 `_csdi_transform.mjs` 輸出 `declaredOK:true`)。

### 3. Transform chain(根因 + 完整鏈)
- **根因**:P10.2 首輪漏咗 **tileset root.transform**(4×4,局部→ECEF)— 呢個矩陣令局部框架傾斜(ECEF 對齊),直接擺入 Y-up 場景就會傾斜+飄移。
- 完整鏈:`p_scene = ENU(MegaBox錨點) × T_root × Rx90(Y-up→Z-up) × p_gltf`
- 軸向約定唔靠估:實測 4 個候選,內容質心距錨點 **C2(Rx90)=35m**(C1 identity=18.1km、C3=25.6km、C4=6.9km)→ C2 勝出,同 Cesium `Y_UP_TO_Z_UP` 約定一致 ✓
- RTC_CENTER:無;glTF node transforms:無(9 nodes 全 identity);嵌套 tile JSON:無 transforms — 鏈只有 root 一層,已全套用,無漏無重。
- 數值驗證:place(content bbox) → 錨點附近 75m×52m 街區,高度 −15.7..+35.6m(合理樓高+地形差)✓

### 4. 錨點/單位/基準
- 錨點 = MegaBox(22.3245N, 114.2172E,WGS84);單位 = 米;地面 datum = 錨點地面,Y 位移統一調整(**單一剛體平移**,建築相對位置全程保留,冇逐棟落地)。
- 加 GridHelper 400×400 地面格線 + 1.78m 黃柱參考。

### 5. KTX2 實測
- `csdi_kowloonbay.glb`:KTX2 **1/1 材質解碼成功**(KTX2Loader + basis transcoder @ CDN),畫面可見真實貼圖色彩。無 fallback、無假稱。

### 6. 修前/修後同鏡頭
- `C6_csdi_megabox_block.jpg`(修後,420/120/380 → 原點):**真實 MegaBox 曲線屋頂建築群,直立、貼地、比例正確**,旁邊程序化對照方塊 + 綠色程序化車
- 修前對照:`C1_csdi_vs_procedural_city.jpg`(傾斜灰塊懸浮右上)
- `C3_csdi_honest_state.jpg`:平面狀態如實記錄(修復途中)

## 三、泥頭車候選 — BLOCKED 清單
綠色車已標 **PROCEDURAL_BASELINE**(場內 sprite 標示,唔當新資產成果)。

| 候選 | 原頁 | 作者 | 授權 | 狀態 |
|---|---|---|---|---|
| 1 | sketchfab.com/3d-models/isuzu-giga-dump-truck-3349f2616d0345f49cda7e8fa5619d80 | wolfoo motors | CC-BY 4.0 | **BLOCKED:需 Sketchfab 帳戶** |
| 2 | sketchfab.com/3d-models/dump-truck-781c616da8f44982a59cb3fc3fa67f98 | ElectroNick | CC-BY 4.0 | **BLOCKED:同上** |
| 3 | sketchfab.com/3d-models/hino-fm-340-th-dc27dfeaab5c43c69870107fa5fb7d61 | drcrazzie | CC-BY 4.0 | **BLOCKED:同上**(hybrid 評估用) |

**手動下載步驟(官方網站,唔需要喺聊天貼 token)**:
1. 登入 sketchfab.com → 開候選頁 → 撳「Download 3D Model」
2. 格式揀 **glTF/GLB**(如有);zip 內可能係 .gltf+bin+貼圖,**唔一定單一 .glb**
3. 解壓後放入 `models/candidates/`(對應檔名見 `audition.js` slots),keep 原檔做 licence 證據
4. 轉換/降貼圖版本另存 derived 檔名,唔覆蓋原檔

## 四、試載場驗收狀態(分明,唔混)
| 項目 | 狀態 |
|---|---|
| PROCEDURAL_BASELINE 車 | ✓ 顯示中(標示牌) |
| Candidate 1–3 | **BLOCKED**(等實檔) |
| CSDI b3dm 解析 | ✓(header/table/GLB 全驗證) |
| CSDI KTX2 貼圖 | ✓ 1/1 解碼 |
| CSDI 擺位 | ✓ spec chain+落地 |
| 視覺 | **待 KL 目視確認** |

## 五、Performance(本機 IAB,1600×900)
- CSDI tile:56,558 tri / 4 mesh / 1 KTX2 材質 — 載入後場景 draw calls 無異常波動
- 測試機:本機 Windows(IAB);解析度 1600×900 CSS / 2400×1350 canvas
- frame-time 覆測(第 4 節場景,npc-off):median 16.7ms = 基線水平
- 呢輪唔涉及 makeTruck triangle 變更(車無改)

## 未完成
1. 三個 Sketchfab 候選實檔(BLOCKED,等 auth/手動下載)
2. CSDI 正式整合入 game(ECEF→ENU 鏈已寫喺 `_csdi_transform.mjs` 可參考,未接 game)
3. CSDI 高 LOD 版(R9 全區)對比 — 現用 R1 低 LOD 街區
4. 視覺確認 — KL 關口


---

# TASK A2 — CSDI HIGH-LOD VISUAL VALIDATION — 2026-10-04

狀態上限:**READY FOR KL VISUAL REVIEW**

## 1. Tile 記錄
- **低 LOD(baseline)**:`F_Tile_+4_2_0+R1_8137.b3dm`(ge≈14)— 26KB / 520 tri / 1 KTX2
- **高 LOD**:R0 單體建築拼群 ×14(ge=0)— 全部喺同一 `F_Tile_+4_2_0` R9 樹,同鏈(root.transform→ECEF→ENU)
  - URI 樣式:`…/3dsd/WGS84/building/Data/F_Tile_+4_2_0/F_Tile_+4_2_0+R0_8129.b3dm` 至 `R0_8151`
  - 合計:198KB b3dm / **2,594 tri** / 每塊 1–2 個 KTX2 材質
  - 完整清單:`models/candidates/csdi_high_meta.json`
- Parent/child chain:tileset root → `F_Tile_+4_2_0+R9_0.json`(refine REPLACE)→ R1/R0 leaves;R0=最細粒度單體建築
- **點揀**:R1_8137 tile-local bbox 為準,掃全樹 leaf,覆蓋該範圍嘅 R0 全抓(14 塊 ≥3KB 有真內容)

## 3. A/B 截圖(A2-1 至 A2-6 同目錄)
| 圖 | 內容 |
|---|---|
| A2-1_lowLOD | R1 baseline(15.5m 扁平 footprint) |
| A2-2_highLOD | R0 拼群(同區,113.6m 塔樓) |
| A2-3_split | 左 R1 / 右 R0,同相機同光照同格線 |
| A2-4_street | 1.7m 高、~110m 距離,R0 塔樓佔畫面 >60% |
| A2-5_oblique | 3/4 鳥瞰:roof form + façade + 多棟 mass |
| A2-6_top_heading | 俯視 footprint + 北箭頭 + 100m 格線 + 錨點 |

## 5. 量測觀察(只報量到嘅)
| | R1(low) | R0 拼群(high) |
|---|---|---|
| Height | 15.5m | **113.6m** |
| Width (X) | 122.7m | 240.8m(14塊覆蓋範圍較廣) |
| Depth (Z) | 136.9m | 245.9m |
| Triangles | 520 | 2,594 |
| Textures | 1×KTX2 | 14 塊×1–2 KTX2 |

- 高 LOD 有:**多棟建築**(≥8 個獨立體量)、**立面貼圖**(KTX2 玻璃幕牆色)、roof form 可辨
- **窗戶幾何:無**(貼圖隱含窗格,非實體幾何)— 觀察自 A2-4/A2-5
- ground mesh:無(純建築體)
- photogrammetry artifacts:未觀察到明顯 ones(A2 证据範圍內)
- **R1 高度差解釋(有證據)**:R1 係同區嘅 coarse LOD 表示 — 佢 boundingVolume 高度細(其 box half-Y ≈14m),content 亦係壓扁簡化;唔係 R0 嘅 parent bbox(R0 leaf 各自獨立 box,半徑 8–27m)。兩者係 refine REPLACE 樹嘅唔同 level 表示同一批建築,R1 表示被大幅簡化。

## 6. Game suitability(基於截圖)
| 距離帶 | 判定 | 依据 |
|---|---|---|
| 0–100m | **MAYBE** | A2-4 街景比例/貼圖成立,但貼圖分辨率有限,近看窗格會糊;需 KL 判斷 |
| 100–300m | **SUITABLE** | A2-5 鳥瞰:massing/屋頂/貼圖喺呢個距離讀得舒服 |
| 300m+ | **SUITABLE** | 塔樓 silhouette 明確,遠景啱用 |

## 7. Performance/size(audition 場,本機 IAB)
| | R1 | R0×14 |
|---|---|---|
| Triangles | 520 | 2,594 |
| Draw calls | 4 mesh | 14 GLB×(1–2 mesh)≈18 |
| Textures | 1 | ~16 KTX2 |
| Transferred | 26KB | 198KB |
| Decode+first render | ~1s | ~2s(逐塊 load) |

## FOLLOW-UP FINDINGS(唔處理)
- R0 全區有數百塊;正式整合要用 3D Tiles runtime 或預烤 batching
- heading 真北對比 Google Maps 截圖未做(A2-6 有座標+軸,KL 可自行比對)
