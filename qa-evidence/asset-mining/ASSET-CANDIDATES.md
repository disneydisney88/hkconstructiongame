# TASK E — 合法 3D Asset Candidate Library — 2026-10-04

狀態:**READY FOR KL REVIEW**(只搜尋/下載/audition,零 gameplay 改動)
來源:Objaverse(HuggingFace 託管 GLB,免登入)+ GitHub 審計 + Poly Haven。
Objaverse 許可證注:物件源自 Sketchfab,per-object license 記錄於 metadata(已逐個核實只收 CC0/CC-BY);dataset 本身 ODC-By。**NoAI 標記:Objaverse 1.0 無 per-object NoAI 欄位 — CC-BY 4.0 本身無 NoAI 限制;如 KL 對生成式用途有憂慮,標註於 UNRESOLVED。**

## Ranking 總覽

| Rank | 候選 | 用途 |
|---|---|---|
| **A** | Ural55571_DumpTruck | hero truck 首選 |
| **A** | DumpTruck_neilken | hero truck 次選 |
| B | SmallDumpTruck_scan / ElectroNick / Kamaz / Mining | backup / 遠景 |
| B | excavators×3 / backhoe / forklift | 設備候选(超重,需 LOD/減面) |
| B | Scaffolding / TrafficBarrier / TrafficCone | 近景道具 |
| C | RebarConcrete / IndustrialBuilding / Warehouse / Old / Modular | 風格或重量問題 |
| BLOCKED | Poly Haven(196 相關全部細道具,無重型車/機) | 非卡權限,係冇啱用 |
| ✓可用 | GitHub 審計:shorepine/kenney=CC0 完整鏡像;fps-buildings-env-kit=無 LICENSE 檔(僅 README 稱 CC0)→ **NEEDS VERIFICATION**;jam-ready-assets=318/345 CC0 但 23 pack RUN licence 限 RUN 平台 | 備用 |

## TRUCK(7 — 3 視角×7 見 truck-contact-sheet.jpg;黃柱=1.78m)

| ID/Name | Author | Licence | 原URL(sketchfab uid) | tri | mats/tex | 大小 | 評 |
|---|---|---|---|---|---|---|---|
| e/Ural55571_DumpTruck | Hsu.Pei.Ge | CC-BY | 1e989a8c… | **99,303** | 12/1(烘焙tex) | 5.9MB | **A** — Ural 55571 俄系 6x4 dump truck;cab-over 感、獨立輪組、真斗;在 30–150k 甜蜜區;寫實 PBR 單貼圖 |
| e/DumpTruck_neilken | neilken | CC-BY | 952764eb… | 45,605 | 16/16 | 5.7MB | **A** — 多材質多貼圖,細節豐富 |
| e/SmallDumpTruck_scan | leoskateman | CC-BY | ac775d12… | 36,780 | 1/3(照片掃描) | 7.8MB | B — photogrammetry 觀感真但風格偏西式小型 |
| e/DumpTruck_ElectroNick | ElectroNick | CC-BY | 781c616d… | 34,307 | 6/6 | 3.8MB | B — 就係之前 audition 嗰部;4K tex 需降 2K |
| e/Kamaz_DumpTruck_LP | kuwalol93 | CC-BY | a7793241… | 26,840 | 30/0(頂點色) | 1.8MB | B — 略低於 30k;無貼圖頂點色,style 化 |
| e/MiningDumpTruck | LouisLysanderO | CC-BY | b7c6756a… | 20,149 | 10/13 | 3.7MB | B — 礦用巨型,非街用 |
| e/LowPolyTipper | polyflask | CC-BY | a74f16c9… | 3,722 | 4/1 | 0.3MB | B — 遠景/LOD 用 |

**分件未驗**(單一 node 數只作參考;Ural 12 mats 顯示部件分離機會高)— 接入前需開包檢查 separate wheels/bed/tailgate;唔合用則當整體 visual 接去現有 pivots 介面(TASK D 已預留)。

## EQUIPMENT(5 — equipment-contact-sheet.jpg)

| ID | Author | Licence | tri | 評 |
|---|---|---|---|---|
| e/CaterpillarExcavator | Ralf.Zetzsch | CC-BY | 322,540 | B — 超重;需減面/LOD 先近景;>100k 違 budget |
| e/HyundaiExcavator | thesidekick | CC-BY | 282,746 | B — 同上 |
| e/YanmarSV100_Excavator | alexdelker | CC-BY | 259,826 | B — 同上(掃描) |
| e/BackhoeLoader_416F2 | alexdelker | CC-BY | 302,929 | B — 同上 |
| e/Forklift | chwashere123 | CC-BY | 256,840 | B — 同上 |

設備全部超 100k — 結論:**Objaverse 掃描件質高但重**;除非做 decimate(合規:CC-BY 允許修改),否則留 C 級。Komatsu(sketchfab 48k)仍係此前較輕選擇。

## BUILDING(4 — building-contact-sheet.jpg;CSDI 留 100m+ 真實 massing)

| ID | Author | Licence | tri | 評 |
|---|---|---|---|---|
| e/ModularIndustrialBldg | adiko1889 | CC-BY | 55,026 | **B** — modular 工業立面,0–100m hero façade 素材 |
| e/OldIndustrialBldg | gazdahrco | CC-BY | 67,127 | B — 掃描,風格偏殘舊 |
| e/IndustrialBuilding | danielklyuev | CC-BY | 346,568 | C — 過重 |
| e/WarehouseBldgSite | jimbogies | CC-BY | 337,038 | C — 掃描整個工地,過重 |

## PROPS(4 — props-contact-sheet.jpg)

| ID | Author | Licence | tri | 評 |
|---|---|---|---|---|
| e/TrafficCone | EmilianoSVR | CC-BY | 116,960 | B — 掃描真錐;需減面 |
| e/TrafficBarrier | marcocastigl | CC-BY | 149,999 | B — 水馬/交通欄 |
| e/ScaffoldingStructures | johnleeyoung | CC-BY | 170,701 | B — 棚架結構;重 |
| e/RebarConcrete | sinnervoncra | CC-BY | 142,080 | C — 藝術裝置感 |

## Poly Haven(CC0)
API 全目錄 521 models;196 個 keyword 相關但全部係細道具(wrench/barrel/drill 級)— **無重型車輛/機械/建築**;適合日後手工具/桶類近景,今輪無下載。

## 授權與歸屬(CC-BY 全部需要 attribution)
遊戲內/關於頁建議格式:`Model "Ural 55571 Dump truck" by Hsu.Pei.Ge (Sketchfab), CC-BY 4.0, via Objaverse`。
逐個 metadata 已存 `objaverse_hits.json` + `models/candidates/e/manifest.json`(uid/author/licence/原URL)。

## 下載清單(20/20 成功,共 ~180MB,全部 models/candidates/e/,未入 production)

## UNRESOLVED
1. hero truck 分件(wheels/bed/tailgate separate?)待開包驗證
2. Objaverse 無 per-object NoAI 欄;CC-BY 4.0 無 NoAI 限制(政策上可用於本非生成式項目),記錄在案
3. fps-buildings-env-kit 無 LICENSE 檔 → NEEDS VERIFICATION(唔用)
4. 設備件全數 >100k tri — 需 decimate 流程(CC-BY 允許)
