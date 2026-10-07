# CSDI 3D 背景數據來源及授權

## 資料集
- **名稱**:3D 空間數據(3D Spatial Data)— building tileset
- **機構**:香港特別行政區政府 地政總署(Lands Department)— 測繪處 GIS Projects Section
- **門戶**:香港空間數據共享平台(CSDI)https://portal.csdi.gov.hk · API:3D Spatial Data API
- **端點**:`https://data.map.gov.hk/api/3d-data/3dsd/WGS84/building/`(Cesium 3D Tiles / b3dm)
- **取得日期**:2026-10-04(經 _c_bake 程式選取 MegaBox 500m 環帶 tiles,轉換為靜態 GLB chunks)
- **使用範圍**:本專案 `models/csdibg/*.glb`(遊戲視覺背景;無碰撞;無政府背書)

## 授權條款(政府開放數據 — 免費商用/非商用)
按 CSDI 服務條款:
1. 須**清楚標明香港特別行政區政府及相關網站為資料來源**,並在所有複製本承認政府/相關機構嘅知識產權;
2. 資料按「現況」提供,**無任何準確性保證**;政府可隨時修訂、暫停或終止本服務;
3. 使用者須就任何侵權申索向政府作出彌償;
4. **本專案與香港特區政府無任何關聯或獲其認可/背書**。

建議遊戲內顯示(如發佈):「3D 建築數據 © 香港特別行政區政府(地政總署)版權所有,經 CSDI 提供」
("3D building data © Government of the Hong Kong SAR (Lands Department), via CSDI")

## 未使用
- 未使用任何衛星影像/航拍圖片。
