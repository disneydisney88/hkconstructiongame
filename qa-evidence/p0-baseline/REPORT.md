# P0 畫質驗收基線報告 — 2026-10-02

狀態: **EVIDENCED**(全部數據由今輪實測取得,未改任何 code)

## 環境
| 項目 | 值 |
|---|---|
| commit | `f7581e6426a43d295802180480095f36d76e67b9`(= 指定基準,working tree 乾淨) |
| server | `python -m http.server 8123`(localhost) |
| browser | ZCode in-app browser(Chromium 核心) |
| CSS viewport | 1600 × 900 |
| 畫布實際解析度 | 2400 × 1350(effective pixel ratio 1.5;`setPixelRatio(min(dpr,2))`,頁面回報 dpr≈1.0 屬 IAB 縮放,以畫布尺寸為準) |
| 硬件 | 本機 Windows 11(x64),詳情見下方「未知數」— GPU 型號未能由瀏覽器讀取,P95 數據以此機為準 |

## 載入
- DOMContentLoaded: **674 ms**
- 按「嘟平安卡開工」後: 遊戲於 <9s 觀察窗口內進入 `started=true`(實際可玩時刻未逐幀量度,標 UNVERIFIED 精確值)
- Three.js r160 由 CDN 載入,今輪載入順利

## Console errors
- `window.__errs` = **0 條**(啟動 + 遊戲中截圖全程)

## renderer.info(steady state)
| calls | triangles | geometries | textures |
|---|---|---|---|
| 732 | 1,667,533 | 613 | 130 |

## FPS / frame time(300 幀 ≈ 5s,玩家站於閘口外)
| median | P95 | max | fps(median) | fps(P95) |
|---|---|---|---|---|
| 16.7 ms | 33.4 ms | 33.8 ms | **59.9** | **29.9** |

⚠ P95 = 33ms 表示約一半幀跌至 ~30fps(規律性幀倍增,疑似每兩幀一次重繪成本)。任何「60FPS」說法不成立,後續 phase 以 median+P95 對比。

## 固定鏡頭(共 5 張,同目錄 .jpg)
鏡頭由 `window.__game.camera` 程序化設定 + 即時 `renderer.render()` 抓取,可重現(座標如下):

| # | 檔案 | camera pos | lookAt | 觀察結果 |
|---|---|---|---|---|
| 1 | 01_gate_from_across_street.jpg | (-820, 3, 938) | (-798, 2, 938) | 閘口+圍板可見;兩側圍板之間**確實存在大缺口**(印證 P1 問題) |
| 2 | 02_hoarding_corner.jpg | (-820, 4, 960) | (-805, 2, 950) | 圍板轉角視覺基線 |
| 3 | 03_ped_entrance_inside.jpg | (-808, 2.5, 938) | (-770, 3, 940) | 由入口向內望:地盤空曠、街景單薄(印證 P3 範圍) |
| 4 | 04_truck_front_side.jpg | (-757, 2.5, 953) | (-767, 1.5, 945) | 泥頭車(玩家車,實測位 (-767, 945.5)):box+cylinder 積木感、冇 windscreen/grille/mirrors 輪拱(印證 P2) |
| 5 | 05_truck_rear_street.jpg | (-775, 3, 932) | (-767, 2, 944) | 車尾+街景:車尾平板一塊、遠景樓無立面細節 |

## 關鍵實測座標(供 P1/P2 重用)
- 玩家出生: (-801, 938),面向 +x(閘口)
- 玩家泥頭車(綠 0x3a8a4a): **(-767.1, 1.4, 945.5)**
- 閘口約 (-798, 938);`OFFICE = GATE + 10·cos/sin(GATE_DIR_IN)`,GATE_DIR_IN≈0(+x)

## 未知數 / 待 P1+ 實測確認
1. GPU 型號:WEBGL_debug_renderer_info 未讀;FPS 結論只對本機有效
2. 「started」精確時間戳:需逐幀 poll 先可量準
3. P95 幀倍增來源(shadow pass? draw call 數量?)待 P6 用 renderer.info 每幀取樣分析
4. ai-wheelbarrow.glb 實際載入成本未量

## Rollback point
`f7581e6` — 本 phase 零改動,無需 rollback。
