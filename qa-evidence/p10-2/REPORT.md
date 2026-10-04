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
