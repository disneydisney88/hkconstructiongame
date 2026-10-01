# 工地素材候選清單 — 第一批
> 日期:2026-10-01 · 依據:P0已通過(實測歸一化管線可用) · 原則:免費CC0先落嚟測試,付費只列清單
> **「未確認」= 來源頁面無提供或未能查證,不作猜測。**

## 0. 已下載測試結果(本輪實測)

| 素材 | 結果 | 證據 |
|---|---|---|
| ✅ Kenney City Kit Industrial v2.0 | **通過 — 已整合入 game**(貨櫃b/c:寫字樓旁+物料場,實測歸一化2.6m+碰撞體) | 遊戲內截圖;`window.__propsLoaded`;zip+License.txt 保留於 `assets/kenney-industrial/` |
| ✅ AI生成手推車(Hunyuan3D-2 HF Space,零安裝API) | **通過 — 已整合**(白模→上色0xb84a18、0.55m、62k面;7秒/件) | 遊戲內截圖;`assets/ai-test/README.md` |
| ❌ poly.pizza worker_male/female.glb | **壞檔** — 全部 mesh 毫米級碎片(4mm×3mm) | node 解析 accessor min/max 實測;勿用 |
| ⚠️ poly.pizza barrier/toolbox/cinderblock.glb | 可疑(2mm span / 52萬單位 span) — 待視覺驗證 | 同上 |
| ✅ three.js Soldier.glb | 現役(P0已驗收:1.78m、Walk/Run正常) | 遊戲內包圍盒[0,1.78]實測 |

## 1. 完整 rigged 工人(最多3)

| # | 候選 | 直達 | 價格 | 授權 | 格式 | 骨架/動畫 | 面數 | 貼圖 | 整合風險 |
|---|---|---|---|---|---|---|---|---|---|
| W1 | RenderHub · khaloui Construction Worker Men Engineer Ready | [連結](https://www.renderhub.com/khaloui/construction-worker-men-engineer-ready-1) | $39.00 | RenderHub標準(商用細節**未確認**) | blend/fbx/ma/obj/stl — **無GLB,需Blender轉** | 完整rig+面部控制器;**Idle/Walk/Run清單未確認** | 111,239 | >6材質,PBR/SSS,**尺寸未確認** | 中高:需轉換+動畫核實 |
| W2 | Quaternius · Ultimate Animated Character Pack(52角色含Worker) | [連結](https://quaternius.com/packs/ultimatedanimatedcharacter.html) | 免費 | **CC0** | FBX/OBJ/Blend — **無GLB,需轉換** | 24動畫含Idle/Walk/Run(poly.pizza鏡像證實) | **未確認** | 頂點色(**未確認**貼圖) | 高:下載需email動態頁;poly.pizza單件GLB已證實壞檔,須原廠zip自行轉 |
| W3 | three.js官方 Soldier.glb(**現役**) | [連結](https://github.com/mrdoob/three.js/tree/r160/examples/models/gltf) | 免費 | three.js示例庫授權 | GLB ✓ | Idle/Walk/Run/TPose ✓已驗證 | ~7k | 頂點色 | **低(已整合)**;缺點:low-poly士兵風格,非工人制服 |

**建議**:W1做寫實目標但**購買前必須**逐項核實(完整人物?動畫清單?下載ZIP內容);W2免費但要人手處理;W3已是可玩底線。

## 2. 模組化工地(最多3)

| # | 候選 | 直達 | 價格 | 授權 | 格式 | 風險 |
|---|---|---|---|---|---|---|
| S1 | ✅ Kenney City Kit Industrial(**已測試通過**) | [連結](https://kenney.nl/assets/city-kit-industrial) | 免費 | CC0 | **GLB ✓** | 低 — 已在 `assets/kenney-industrial/` |
| S2 | iTech Studios · Construction Site Assets Pack | [連結](https://ithappystudios.com/environment/construction/) | **未確認** | **未確認** | **GLTF ✓**/FBX/STL | 低(格式啱);價格/授權要查 |
| S3 | PBRL-Poly · Modular Construction Site 01 (CGTrader) | [連結](https://www.cgtrader.com/3d-models/modular) | $12.49(−50%) | CGTrader標準(**未確認**) | max/obj/fbx — 無GLB需轉 | 中 |

## 3. 分件挖掘機(最多3)

| # | 候選 | 直達 | 價格 | 格式 | 機臂分件/動畫 | 風險 |
|---|---|---|---|---|---|---|
| E1 | RenderHub · Excavator(分類頁) | [連結](https://www.renderhub.com/rigged-3d-models/industrial/excavators) | $23.40(原$39) | **未確認** | **未確認** | 中:頁面冇列明分件 |
| E2 | RenderHub · Excavator 360°(PhilRiveraMedia) | 同上分類 | $170.00 | **未確認** | Game Ready ✓;分件**未確認** | 低(質素高137,798面/2.4GB);貴 |
| E3 | Sketchfab · "excavator rigged" 免費區 | [搜尋](https://sketchfab.com/tags/excavator) | 免費為主 | 逐件CC-BY/CC0 | 逐件查 | 中:需登入落載,授權逐件核實 |

⚠️ 規格提醒:**購買/下載前必須確認機臂、斗、履帶有獨立分件或骨骼** — 焊死一舊嘅只能做布景,唔可以操作(現有程序化挖掘機反而有動畫)。

## 4. 手推車 / 5. 貨櫃辦公室 / 6. 圍板水馬

| 項目 | 候選 | 狀態 |
|---|---|---|
| 手推車 | 未搵到合適確認產品 | **未確認** — 建議Sketchfab搜 "wheelbarrow low poly CC0" 或由程序化頂住 |
| 貨櫃辦公室 | ✅ Kenney shipping-container-a/b/c(CC0,**已測試**)+ 現有程序化招牌/門 | 可即刻整合 |
| 圍板/水馬 | 現有程序化(已有動畫:撞跌水馬) | 保留;升級選項:iTech pack(S2) |

## 7. 材質(CC0,免費直落)

| 途徑 | 連結 | 直下方式 |
|---|---|---|
| ambientCG · 混凝土 | [Concrete034](https://ambientcg.com/view?id=Concrete034) | `https://ambientcg.com/get?file=Concrete034_1K-JPG.zip` |
| ambientCG · 泥地/金屬/瀝青 | [搜尋頁](https://ambientcg.com/) | 同上pattern,揀1K/2K避免8K |
| Poly Haven · 日間HDRI | [hdris/skies](https://polyhaven.com/hdris/skies) | CC0;注意HDRI係背景光,唔係可行走場景 |

## 8. 香港實景(遠景用)

- 香港CSDI 3D Spatial Data / 3D Visualisation Map:[portal.csdi.gov.hk](https://portal.csdi.gov.hk) — 格式/API/**下載方式未確認**;策略:遠景輪廓低細節+近景手砌(唐樓/工廈立面+繁體招牌),唔好第一版搬成個九龍

## 下載/入庫規則(執行中)
1. 保留原始ZIP+貼圖+授權文件(`assets/<來源>/`)
2. 遊戲用GLB另存`models/`,轉換品註明來源
3. 每個模型入庫前過 `p0test.html?m=<路徑>`:盒量身高/腳底/root-scale/動畫**實測**
4. 「下載成功」≠「有骨架」≠「整合完成」— 以遊戲內畫面為準
