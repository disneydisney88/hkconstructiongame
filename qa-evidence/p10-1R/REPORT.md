# P10.1R Visual Rejection Corrective Pass 報告 — 2026-10-03

狀態: **EVIDENCED**(本機 IAB 實測;未經人類簽收)
基準: `8ddb614` + worker colour fix(`3ea02af`)→ 本輪 commit(見 git log)

## A. 工人正面黑色 BUG — 已修(3ea02af)+ 本輪完整驗證
- 修復機制:worker-rig 相片改 `fetch→createImageBitmap`(12s timeout+retry);初始白 1×1 + `uPhotoOK`/`uRearOK`;shader photo/rear mix 乘 flag;**flag=0 時背心 overwrite 前後兩面都畫**。
- 截圖:`W1_front`(正面—橙背心/銀帶/膚色手臂/藍褲/面)、`W2_back`(背面—背心銀帶X+香港建築標籤)、`W3_left`/`W4_right`(側面)全部正常色。
- **模擬 fail 測試**:`W5_photofail_front.jpg` — `?photofail=1` 強制相片載入失敗 → 降級路徑:頂點色+前後背心 overwrite,**零黑面** ✓。
- 正常 texture load:W1–W4 ✓。兩種情況都唔黑面 ✓。

## B/C. 泥頭車重造 + 灰模驗收 — PASS
重造為香港 cab-over 泥頭車(先灰模後材質):
- **cab**:闊 2.35m、高至 3.0m、大斜擋風(-.18)+A 柱、側窗連框、門縫/門柄、門下雙踏級、鏡臂+鏡頭、頂 marker 燈、遮陽簷
- **車輪**:前單胎(寬 .42)+**後雙胎**(duals,每邊兩條 .34、間距可見);胎徑 .54 主導輪廓+10 塊胎紋;contact patch 貼地(y=0)
- **輪拱**:實心半圓板已剷 — 改 **openEnded 薄殼弧**(每輪組一塊,貼胎形包覆)+後 mud flap
- **泥斗**:底板厚 .16、側壁 .15+內襯、外肋×6/側、頂欄外翻、前擋板高過側壁+黃欄、尾閘+鉸銷、液壓頂罐(缸身+鉻桿)+尾鉸點
- **底盤**:琵琶架雙樑+橫樑×4+前後軸殼+傳動軸+差速器+葉片彈簧 hint+油缸+電池箱+排氣直喉+防鑽欄
- 軸距:前軸 1.95 / 後軸 -1.45;總長 ~6.2m(舊 5.4);collision 半徑不變
- 灰模截圖:`T1_side_grey` / `T2_front34_grey` / `T3_rear34_grey` — 第一眼讀到「重型泥頭車」;**T4_gameplay_eyelevel** 材質版+工人比例
- truck triangles:舊 ~2,600 → 新 ~3,100(hero asset,可接受);無新增獨立材質(共用 13 個 Standard)

## D. 棚架重造 — PASS
`S1_scaffold_close.jpg`:主塔+demo 施工樓改香港竹棚:
- 密排竹杆(全高、微傾斜抖動、半徑/色隨機)、每 lift 橫擔、**斜撐**(每 3 bay 交叉交替)、工作台+踢腳板(主塔前臉)
- 綠網:改每面獨立半透明 plane(opacity .5),**杆件在網前後有層次**;主塔前面留通道開口
- 唔再係規則綠色 grid;竹杆視覺統一(竹棚,非鋼棚)
- 性能優化:杆件全高單 instance、open-ended cylinder、斜撐每 3 bay、castShadow off

## E. 車旁建築圍封 — PASS
demo zone(閘口 130m 內)所有施工中樓宇(b[6]==1):
- 竹棚+綠網(上述)包裹四面
- 基座加**連續圍街板帶**(2.2m 綠板+頂蓋+柱,InstancedMesh)+薄牆 colliders(visual/collision 同源)
- `B1_truck_building_boundary.jpg`:車+工人+磚籠前景、連續圍封+棚架建築背景,邊界關係成立

## F. 啡色 primitive cube — 已消失
`B1` 前景磚疊 = 重造後磚籠:卡板+168 塊磚(InstancedMesh,色差)+四角鋼柱+頂帶。原「閘口沿途物料堆」啡色方盒已剷。全 demo zone 掃描:剩唯一 LOD1 遠距替身(系統設計)。

## G. 截圖索引(`qa-evidence/p10-1R/`)
W1–W4 worker 四角度 / W5 photofail / T1–T3 truck 灰模 / T4 gameplay eye-level / S1 scaffold close / B1 truck+boundary

## H. Performance(同 tab 實測)
| | 基線(今晨 7602e06+) | P10.1R |
|---|---|---|
| median(all-on) | 16.7–33.2ms(視 NPC 分佈浮動) | 33.2ms(NPC 密集區)/ **16.7ms(iso npc-off)** |
| P95 | 33.4 | 33.4 |
| draw calls | 1063 | 1384(+30%) |
| triangles | 1.28M | 1.34M(+4%) |

- **+30% calls 來源解釋**:type-1 demo 施工樓每棟新增竹棚 IM×3+綠網 planes×5+圍板 IM×3(圍板牆/頂/post 已全部收納入 3 個全域 InstancedMesh;杆件密度已由 0.85m→1.05m 並改全高 instance,優化前曾 3864 calls/2.29M tri,已即場修正)。
- median 實測:33.2 = 已知 P9 NPC 動畫地板(基線同位置同樣會浮到 33,見晨早量度 33.2/16.7 交替);iso npc-off = 16.7 與基線完全一致 → 無重大倒退。

## Regression(本輪實測)
上車 ✓ → 開 8.0m → 落車 ✓;NPC 車喺車閘 12m 內 barrier 開啟 ✓;console error 0。

## 未完成(誠實)
1. P95 33.4 隔幀殘留(維持已知)
2. 竹棚斜撐/平台只做主塔+demo 施工樓;遠處不變(按指示只做 demo zone)
3. 泥頭車灰模自我評核通過,但未有人類目視確認
4. 車旁「施工中建築」判別以 b[6]==1 為準;如有漏網裸建築非施工類,下一輪處理
