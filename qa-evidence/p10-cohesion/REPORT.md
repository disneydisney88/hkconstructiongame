# P10 Visual Cohesion 報告 — 2026-10-03

狀態: **EVIDENCED**(測試環境:本機 IAB 1600×900/2400×1350;未經人類簽收)
基準: `6d314fb` → 本輪 commit(見 git log)

## Before / After 截圖(同鏡頭同參數)
`qa-evidence/p10-cohesion/before/`(6d314fb)vs `after/`(本輪),各 5 鏡頭 + UI minimal:
A1/B1 gate user angle、A2/B2 street-facing、A3/B3 pedestrian entry、A4/B4 truck gate、A5/B5 truck+façade、B6 UI-minimal。
同 resolution/DPR/FOV/時段/玩家位置(程式固定 camera pos+lookAt)。

## 各項改動

### 1. 入口物件重造
- **水馬**:裸橙盒 → 梯形兩段式輪廓+白反光帶(InstancedMesh 3 部件,見下 guardrail 教訓);撞跌邏輯不變
- **三棍閘**:裸方柱 → stainless 圓柱 housing(金屬 PBR)+頂蓋+底座 plate;轉臂 8 邊;讀卡屏保留
- **PPE 架**:藍色實心盒 → 鋼框三層架+層板+真實頭盔/反光衣/安全鞋擺設+碰撞體
- **貨櫃**:實心盒 → 加瓦楞肋×9/側+角柱+門縫(共享 darker 材質)
- 用途不明 box:閘口橙色物料堆屬磚籠/油桶(有用途)保留;藍色 PPE 盒已刪

### 2. Gatehouse / Hoarding
- Gatehouse:4 條結構柱+前後簷邊(drip edge),collision/opening 數據零改動
- Hoarding:1/8 板用深色共享修補材質(雨痕 variation,唔逐板開新材質);立柱/壓頂/基座 P8 已有

### 3. 街道近景 façade attachment
閘口 90m 內最近 4 棟 OSM 樓宇(不換 base box)加:窗框+內凹窗(InstancedMesh 220)、AC 機(40)、外露水管(36)、地下玻璃舖、簷篷、天台欄。遠景不變。

### 4. Road / Footpath layering
- 班馬線零厚度 plane → 有厚度 box 貼地
- 行人路混凝土接縫線(每 3m,擴張縫)
- **輪胎帶泥只喺車閘口兩側**(邏輯位置,唔平均灑)

### 5. UI / World marker de-clutter
- 任務 halo:半徑 2.2→1.5、opacity .3→.14;ring .7→.38
- **World label 距離規則**:>32m 開始淡出,>42m 隱藏
- PPE 提示 sprite 3→1.1(實體架已有告示);互動 prompt 保留 prompt-only 行為

### 6. Physical signage
4 塊實體告示牌(鋼管支架×2+板厚 .06m+雙面貼圖,原創 generic 文字):
進入地盤必須佩戴安全帽 / 行人通道請靠左 / 車輛出入口慢駛倒車響號 / 地盤重地閒人免進。位置全部有邏輯(行人閘側/車閘側/周界)。

### 7. Character / Environment match
程式量度:人物 1.78m;三棍閘 housing 頂 1.16m+轉臂 1.02m(膊頭高度 ✓)、gatehouse 頂 2.81m、招牌板 2.25–3.05m、kerb 0.17m — 尺度一致。角色 polygon 無改動(按指示)。

## 9. Performance guardrail(同固定路線,3 跑取中位)
| | 6d314fb 基線 | P10 後 |
|---|---|---|
| median | 16.7ms | **16.8ms(+0.6%,遠低於 15% 上限)** |
| P90/P95/P99 | 33.4/33.4/49.2 | 33.4/33.4/33.6 |
| draw calls | ~899 | 1072(+19%) |
| triangles | 1.30M | 1.18M(−9%) |
| textures | 180 | 149 |

**Guardrail 途中觸發過一次並已修復**:水馬初版用 27×3 clone group,實測 median 跌到 33.2(隔離確診)→ 改回 InstancedMesh 後 16.8。呢個正正係 guardrail 要捉嘅嘢。

## Regression(本輪測試環境)
上車 ✓ → 開 8.2m ✓ → 落車 ✓;NPC 車喺車閘 12m 內 barrier 開啟 ✓;console error 0(全程)

## 新增資產及 licence
**零新增外部資產** — 全部程序化幾何+canvas 貼圖,licence 狀態不變(ambientCG/Poly Haven/Kenney CC0 記錄見 `assets/textures/LICENCE.md`)。

## 未完成項目(誠實)
1. P95 33.4ms 隔幀殘留(同 P9,本輪按指示未追)
2. 對面街第三棟樓以遠嘅 façade 未加(只做最近 4 棟)
3. 室內樓層/窗簾 variation 未做
4. AI vision 對 after 截圖嘅覆核只由我執行,未有人類目視簽收
