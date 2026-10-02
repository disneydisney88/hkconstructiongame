> 2026-10-02 驗收更正：本文件歷史「完成」描述不等於已驗證。現況、限制及證據見 ACCEPTANCE-2026-10-02.md。新增訓練室、課堂後健康檢查及入閘核對見 README。

# ⛑️ 香港地盤 GTA · 開工大吉 — 專案完整文檔

> 本文件係完整技術文檔,目的係俾其他 AI / 開發者快速掌握成個專案。
> 最後更新:2026-10-01 · 版本:**worker-v2(全員V2工人+門禁+八分區+六事件+財務分層)**

## 🟢 門禁/場景/事件/財務 系統記錄(2026-10-01晚,依specs/三份規格)

1. **全員worker-rig**:玩家+53 NPC全用V2(codex worker-v2-lab整合:KL胸章/香港建築背字/重建17關節/分離手褲)。來源`models/worker-v2.fbx`+`worker-rig.js`+`mesh-repair.js`
2. **門禁狀態機**(6態:未登記→訓練→健康→PPE→文件→可入):`accessState()`+全周界守衛(圍板繞入彈返閘外+原因)+閘機狀態牌+R8真閘機(貨櫃通道/三棍轉閘/面容屏/行人通道黃牌)+防卡死stuckGuard
3. **八分區**(30×30m):`__game.zones` 8區色帶+雙語告示牌+`zoneAt()`接口
4. **六事件**(狀態:正常→警示→叫停→整改→覆檢→恢復):E1 PPE架(未齊唔放行)/E2倒車險情(記錄不扣分)/E3吊運紅圈(訊號員叫停)/E4洞口搬蓋板+覆檢/E5通道搬三堆/E6暑熱飲水(求助唔扣分)
5. **財務分層**(specs§7):`LEDGER{projectCost,safety[]}` — 行政費入項目成本唔扣人工;HUD新stat「項目成本·安全記錄」
6. **NPC LOD**:60米外隔幀更新

## 🔴 全黑/無色角色根因記錄(2026-10-01,已修復)

1. **主因:FBX 鏈冇輸出法線** — Hunyuan(pymeshlab→trimesh→OBJ)→Mixamo→FBX 嘅 mesh 冇 `normal` attribute → `MeshStandardMaterial` 光照計算全黑。**修復:`geometry.computeVertexNormals()`**。
2. **次因:boundingBox 優先級陷阱** — `a || fn() && b` 喺 `boundingBox` 為 null 時得 undefined → 拋錯 → dispatch 靜默退回 Soldier(**Soldier 骨都叫 mixamorig*,唔可以用骨名驗證!**)。修復:顯式 `if(!g.boundingBox) g.computeBoundingBox()`。
3. **診斷教訓:WebGL `readPixels` 原點係左下**,同 DPR 縮放 — 探測座標錯會得出「0像素」假結論;用「強制 debug 鏡頭渲染」+截圖做決定性驗證。
4. 驗證真身方法:`window.__rigLog`(makeHuman dispatch 麵包屑,`mixamo-ok`=真Mixamo)+ `tpl.userData.colored`。

## 玩家角色現況(mixamo-b2)

- **玩家** = Mixamo 工人(30k面OBJ→Mixamo綁骨→FBX Binary WithSkin 30fps):33骨、Idle/Walk/Run 三動畫、實測歸一化1.78m腳貼地
- **顏色**:骨骼權重分區程序化上色(bind bbox閾值,唔隨動畫變)。
  **映射(2026-10-01修訂,修「橙色鰭手」)**:手(hand/thumb/finger)→膚色;頭頸→帽(頂10%)/膚;**spine→背心(軀幹)**;
  **clavicle+arm+shoulder→灰袖**(舊版clavicle上咗背心橙→膊頭上臂變橙鰭,已修);腿→深藍褲;foot/toe→棕靴
- 手掌幾何=無指mitten(30k減面+Hunyuan生成限制);遊戲距離下可接受;改善需更高面數重綁(broker payload限制單發~2MB obj)
- **NPC** 照舊 Soldier+PPE(帽色階級不變);**未全角色替換**(按用戶規格:先玩家一個)
- 上色+法線統一喺 `makeHumanMixamo` 模板處理(p1test.html 同一套邏輯,`?v=` build ID 核對)


---

## 1. 專案概覽

| 項目 | 內容 |
|---|---|
| 類型 | 瀏覽器 3D 開放世界小遊戲(GTA 式第三人身) |
| 主題 | 香港地盤工人模擬 + 安全教育惡搞 |
| 地圖 | **真實香港地圖**:九龍灣 / 啟德 / 觀塘 / 牛頭角(OpenStreetMap 數據) |
| 語言 | 廣東話(粵語)對白 + UI |
| 平台 | 桌面瀏覽器 + 手機觸控(搖桿+按鈕) |
| 授權聲明 | 遊戲純屬虛構,地圖數據 © OpenStreetMap contributors (ODbL) |

**遊戲流程**:新仔入職(安全訓練測驗 + 量血壓小遊戲)→ 送外賣 → 搬磚 → 天秤危機 → 環保斗車 → 收工飲茶。全程有「白帽安全主任」巡邏留難、勞工處式危險源、真實地盤行政費罰款系統。

---

## 2. 技術棧

- **Three.js r160**(ES module,jsDelivr CDN,importmap 載入)
- **零 build 步驟**:純靜態檔案,直接 HTTP serve
- **Python 3 no-cache HTTP server**(port **8123**,`server.py`)
- 音效:WebAudio 合成(冇音檔)
- 貼圖:全部 Canvas 2D 程序化生成(vestTex / textPill / neonTex / bannerTex)
- 角色動畫:GLB 骨骼動畫(AnimationMixer)+ SkeletonUtils.clone
- 測試機:NVIDIA RTX 5080 16GB,實測 **60 FPS**

**⚠️ 一定要 localhost**(ES module + fetch,唔可以 file:// 直接開)

---

## 3. 檔案結構

```
hk-gta/
├── index.html      # 主頁面:HUD/UI/CSS + importmap(含 three/addons/ 映射)
├── boot.js         # 啟動閘門:先載入 GLB 模型 → 再 import app.js(18行)
├── app.js          # 成個遊戲(2252 行,單檔模組)
├── mapdata.js      # OSM 轉換嘅地圖數據(489KB,單行 JSON)
├── server.py       # no-cache HTTP server(port 8123)
├── 開game.bat      # Windows 一鍵啟動(隨機 ?t= URL 繞 cache)
├── README.md       # 玩家向說明
├── designs.html/js # (舊)人物設計比稿頁 — 5 風格並排展示
├── modeltest.html  # (舊)GLB 模型管線測試頁/角色廊
├── data/           # OSM 原始數據 + fetch_tiles.py + convert.py(轉換腳本)
└── models/         # GLB 模型庫
    ├── Soldier.glb        # ✅ 目前使用:three.js 官方士兵(66.8單位高,Idle/Run/TPose/Walk)
    ├── Michelle.glb       # three.js 官方女性(1.66單位,只有 Samba/TPose,未用)
    ├── worker_male.glb    # ❌ 壞檔(poly.pizza,所有 mesh 得毫米級碎片,勿用)
    ├── worker_female.glb  # ❌ 壞檔(同上)
    └── toolbox/barrier/cinderblock.glb  # 道具樣本
```

---

## 4. 啟動流程(boot 鏈)

```
index.html (importmap: three + three/addons/)
  └→ boot.js (module, top-level await)
       ├→ GLTFLoader.load("models/Soldier.glb?v=2")
       ├→ 成功 → globalThis.WORKER_MODELS = { male: gltf, female: null }
       ├→ 失敗 → catch(WORKER_MODELS 維持 undefined)
       └→ await import("./app.js")   ← 遊戲本體永遠最後載入
```

**角色工廠分派**:
```js
makeHuman(o) →
  WORKER_MODELS 就緒 && (o.vest || o.helmet !== null)
    → try makeHumanGLB(o)      // Soldier骨架 + 程序化PPE
    → catch → makeHumanProc(o) // 後備:程序化積木人(行人必用)
```

**人物介面合約**(兩個工廠都遵守,全遊戲依賴):
```js
r.g                      // THREE.Group(加落 scene)
r.animate(dt, speed, lean)  // 每幀呼叫:內部揀 Idle/Walk/Run + timeScale
r.mixer                  // GLB版先有(AnimationMixer)
```
調用方一律只用 `h.g`(position/rotation/visible)同 `h.animate(dt, speed)` — **換模型只需改呢兩個工廠**。

---

## 5. 地圖數據格式(mapdata.js → `window.MAP_DATA`)

| Key | 數量 | 格式 |
|---|---|---|
| `o` | — | 原點 `[114.22, 22.324]`(經緯度) |
| `b` | **1046** 棟樓 | `[x, z, hw, hd, rot, 高度m, 類型]`(類型1=有屋頂設施) |
| `r` | **4306** 條路 | `{w:路寬, p:[[x,z]...]}` polyline |
| `z` | **32** 地盤區 | 多邊形 `[[x,z]...]`(landuse=construction) |
| `w` | 11 水域 | 多邊形(海/啟德河/水塘) |
| `g` | 238 綠地 | 多邊形 |
| `poi` | **193** POI | `[x, z, 名稱]`(MegaBox、專科門診、常悅樓…) |

座標系:**米**、XZ 平面、Y 向上。玩家出生 `SPAWN = [-1129, 321]`(建造業零碳天地);HOSPITAL = 聯合醫院 POI。

## 6. 世界生成(app.js 精要)

- **樓宇**:3 個高度桶 InstancedMesh + Canvas 窗戶貼圖(日間深玻璃,微亮燈)
- **地盤**:主力大樓骨架(柱陣+樓板+核心筒+頂樓鋼筋)、竹棚+綠網、安全橫額、圍板、水馬(可撞跌)、貨櫃寫字樓、鋼筋/水泥/磚籠物料場、泛光燈+真射燈
- **天秤(塔吊)**:82m 塔身+混凝土基座,深入地盤;動畫:旋轉+小車+吊鉤擺動(危險源)
- **挖掘機**:臂/斗動畫;泥坑危險源
- **車流**:紅雙層巴士/紅的士/私家車/van/綠小巴 沿主路巡邏
- **街景**:街燈、樹、霓虹招牌、日間天空漸變(ShaderMaterial)+ 霧

## 7. 角色與 NPC 系統

**現役(v3)**:`makeHumanGLB` = Soldier.glb 骨架 clone +
- 程序化 PPE:薄身反光衣(Box+vestTex 前「平安上崗」/背「香港建築」+銀反光帶+拉鏈)、黃色安全帽(圓拱+帽簷+帽頂脊) — 用 `Object3D.attach()` 挂喺 Spine/Head 骨骼跟動
- 制服 tint:軍綠 → 工裝藍灰(0x46525e)
- 尺寸換算:模型 66.8 單位 ↔ 1.78m;`M2U = 66.8/1.78`(米製 PPE 要 `.scale = M2U` 抵銷模型縮放)

**階級制度(帽色)**:
| 帽色 | 角色 |
|---|---|
| 黃 0xffd23a | 工人/雜工/玩家 |
| 藍 0x2a5ad0 | 機手(輝哥,喺挖掘機旁) |
| 紅 0xd03030 | 判頭(老陳,閘口)+ 管工(阿強) |
| 綠 0x2a9a4a | 安全督導員 |
| 白 0xf4f4f4 | 安全主任×4(巡邏敵人)/ 老總PM(Richard)/ 地盤經理(雄哥) |

**NPC 行為**:白帽=巡邏+追捕(有⚠星先追);工人=idle/遊走;行人=沿路兩側行走;NPC 泥頭車=繞圈+倒車入地盤(「比比比」倒車音)。

## 8. 遊戲系統

- **任務鏈**:6 個(addMission 系統,序章對白 say()/dlgQueue)
- **安全訓練堂**:5 題粵語選擇題(撳1/2/3),答錯重讀
- **量血壓**:節奏小遊戲(標記入綠區撳掣×3);跑完步量=FAIL
- **警告制度**:白帽捉到=警告;3 個=強制再培訓(-$500)
- **行政費罰款**:撞跌水馬$2,000/高空擲物$2,000/塵埃$20,000/未蓋帆布$50,000/車轆未洗$30,000
- **危險源**(參考勞工處):天秤吊墜物、倒車、機臂、泥坑、跌落海;工傷=入院-$300
- **HUD**:任務卡/人工/警告星/HP/Stamina/小地圖(canvas 2D)/toast/對白框

## 9. 操作

**電腦**:WASD行 · Shift跑 · E互動/上落車 · G掟嘢 · Space跳 · 滑鼠轉鏡 · 滾輪縮放 · M靜音 · Esc暫停
**手機**:左半屏搖桿 · 右下「跑」「E」掣

## 10. 開發/驗證工作流(重要教訓)

> **🔴 P0 根因記錄(2026-10-01)**:Soldier.glb 內部 root 節點 `Character` 自帶 **scale=0.01**。
> glTF accessor 原始頂點 span 係 66.8 單位,但**實際渲染高度只得 1.83 單位**(66.8×0.01·含姿勢差)。
> 曾經硬編 `H_UNITS=66.8` → 有效縮放 0.0267×0.01=0.000267 → 「1.78米人」變 **4.9mm 隱形**,
> 淨返米制 PPE 盒浮空 = 用戶見到嘅「LEGO人」。
> **正確做法**:`updateMatrixWorld(true)` 後用 `Box3().setFromObject()` 實測 → `scale=1.78/實測高`、`position.y=-min.y×scale` 腳貼地;
> 歸一化一律放**外層 group**(已驗證動畫冇 track 寫 root scale)。基線備份:`backup/v3-soldier-20261001/`。

1. **伺服器**:必須用 `server.py`(no-cache)。曾因瀏覽器硬 cache 舊 HTML 導致「新 app.js resolve 唔到 addons importmap → 全遊戲靜死」
2. **Cache-bust**:測試用 `?v=xxx` query;`開game.bat` 用 `%RANDOM%`
3. **驗證鐵律**(血淚教訓):
   - ❌ 場景圖有物件 ≠ render 到(曾用 traverse 數出「112個角色」但其實全部隱形)
   - ❌ primed 截圖分析會作幻覺(prompt 唔可以暗示期望答案)
   - ✅ **像素級驗證**:隔離 scene + `renderer.render()` + `gl.readPixels()` 數彩色像素
   - ✅ GLB 健康檢查:解析 JSON chunk 讀 accessor min/max + binary 非零率(試過下載到「毫米級碎片」壞檔)
4. **Debug hooks**:`window.__game = { scene, camera, renderer, player, officers, THREE, test:{...} }`;`window.__errs`(error collector)

## 11. 現況與未決事項

- ✅ 引擎/動畫/PPE/階級/任務/日間場景全部運作,60 FPS,零 JS 錯
- ⚠️ **人物外觀**:Soldier 係 low-poly 風格化(用戶嫌「LEGO感」)。免費模型池冇寫實級存貨
- 🔲 **未決**:寫實人物三選一 — (A)接受現風格 (B)本地 AI 生成 TRELLIS/Hunyuan3D(RTX 5080 可行,需裝環境) (C)用戶自備 RenderHub/Sketchfab 寫實 GLB 掉入 `models/`
- 🔲 女工(Michelle 缺 Walk 動畫,需 retarget)
- 🔲 街景整合選項:Mapillary(CC-BY-SA 可下載)/ 香港地政署 CSDI 3D 模型 / Google Street View embed(合法顯示,不可儲存)

## 12. 擴展點(畀接手 AI)

| 想做 | 邊度改 |
|---|---|
| 換人物模型 | 掉 GLB 入 `models/`,改 `boot.js` 載入名 + `makeHumanGLB` 嘅 H_UNITS/動畫名/骨骼 regex(`/spine/i`,`/head$/i`) |
| 加任務 | `addMission({title, desc, init(), tick(), done()})` — 參考現有 6 個 |
| 加危險源/罰款 | `hazards.push()` + `violate(金額, 描述)` |
| 加 NPC 類型 | `spawnWorker(x, z, { human:{...}, label })` |
| 換天氣/時間 | 頂部 sky ShaderMaterial uniforms + `hemi`/`sun` 顏色強度 |
| 改地圖 | `data/fetch_tiles.py` + `convert.py` 重新由 OSM 生成 mapdata.js |

---
*本遊戲係安全教育惡搞性質,罰款金額參考網上流傳地盤行政費清單,與真實機構無關。*

## 2026-10-01 Codex character repair — codex-rebound-v1

This section supersedes the previous mixamo-b2 character acceptance claims.
The three source FBX files have identical parsed animation data, despite different file hashes. The source upper-arm bind joints are near hip height. The generated shape also bridges hands and trouser sides.

The player now uses worker-rig.js: a reconstructed 17-joint rig, corrected/smoothed weights, separated arm surfaces with boundary caps, smooth normals, front reference-photo projection and procedural rear materials. Idle, walk and run are procedural, not three different Mixamo clips. NPC creation is unchanged.

Preview: worker-review.html (p1test.html redirects here).
Fixed-step integration check: /?characterCheck=1. Start and finish the introduction, then use the three buttons. These checks call the existing player movement routine for 180 × 1/60 seconds, and pause for inspection. They are NOT FPS measurements. Observed movement: walk 10.5m, run 20.4m, turn 10.328m with heading 0 to -1.571; captured runtime errors 0.

Status: character deformation repair integrated, NOT final photoreal character approval. Face likeness, side transitions, shoulder seams, full rear texture detail and articulated fingers remain incomplete. Original FBXLoader four-weight warning remains during source loading; original weights are replaced. No reliable FPS benchmark or full NPC regression claim.

Backup: backup/codex-character-20261001/ (app.js, boot.js, index.html, p1test.html, GAME-DOCS.md).
Appearance source: user-supplied reference copied to assets/worker/appearance-reference.png. No new third-party character was purchased or downloaded.
