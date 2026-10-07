# 研究:TRELLIS.2 + SkinTokens/TokenRig(自動綁骨)— 2026-10-04

狀態:**研究+一次真實 API 實測**;零 gameplay 改動。所有「實測」均指本輪親手打 API,非頁面狀態。

## 一、Microsoft TRELLIS.2(HF: `microsoft/TRELLIS.2-4B`)

| 項目 | 實查結果(HF API + 官方 README) |
|---|---|
| 能力 | 單圖→3D(mesh + **PBR 材質**,支援透明/半透明);O-Voxel 表示,任意拓撲;官方 README 明言輸出可達 1536³ |
| Licence | **MIT**(模型卡 `license: mit`)✓ |
| 用途定位 | 官方「未對齊人類偏好」;小孔洞可能出現(有後處理腳本) |
| 硬件需求 | README:**Linux + ≥24GB VRAM**(A100/H100 驗證);本機 RTX 5080 16GB 唔夠本地跑 |
| 官方 Space | `microsoft/TRELLIS.2` — RUNNING(zero-a10g);API:`/preprocess_image → /image_to_3d(res 512/1024/1536)→ /extract_glb(decimation_target, texture_size)` |

### 實測(2026-10-04,gradio_client 打官方 Space)
1. `image_to_3d(user_shot.png, res=512)` — **成功,31 秒**(ZeroGPU A10G;含排隊)。模型已生成(step 返回 3D previewer HTML)。
2. `extract_glb(decimation=100k, tex=1024)` — **BLOCKED:`exceeded ZeroGPU quota(120s requested vs 157s left)`**,需 HF 帳號 token 加額度,或 24h 後重試。
3. 結論:**生成階段證實可行且快(512=31s);提 GLB 需要免費 HF token**(登入 huggingface.co/settings/tokens → `gradio_client` 帶 token 即有更多 quota)。**未完成一次端到端 GLB 落檔 — 唔聲稱已驗證產出質素。**

### 對本遊戲用途(建議,未執行)
- 近景道具/設備外殼(交通錐、發電機、泵)由一張參考圖生成 PBR GLB → 代替程序化方盒;**唔用於 hero truck**(受版權照片輸入風險 + 形狀精度)
- 注意:輸入圖片必須自有/CC0 — TRELLIS 生成物版權隨輸入;MIT 只覆蓋模型權重

## 二、VAST-AI SkinTokens / TokenRig(HF: `VAST-AI/SkinTokens`)

| 項目 | 實查結果 |
|---|---|
| 能力 | 單一 3D mesh → **骨架層級 + 每頂點皮膚權重**(一個自回歸序列同時生成);UniRig(SIGGRAPH'25)後繼;官方 README:輸出可直接入標準動畫管線 |
| 組成 | TokenRig(Qwen3-0.6B,GRPO 微調)+ FSQ-CVAE skin tokenizer;共 ~1.6GB ckpt |
| Licence | **MIT** ✓(README frontmatter) |
| 官方用法 | `git clone VAST-AI-Research/SkinTokens → demo.py --input in.glb --output out.glb --use_transfer`;Space: `VAST-AI/SkinTokens` RUNNING |

### 實測(2026-10-04)
- Space API 簽名齊全(`/run_gradio(files, top_k…, use_transfer, use_postprocess)`)
- 用官方範例 `giraffe.glb`(6.3MB)、我方 `worker-shape.glb`(832KB 人形)、自製 `_tiny_human.glb`(1,120 faces)三個輸入打 API:
  **全部 BLOCKED:`requested GPU duration (450s) > maximum allowed`** — Space 指定 450s GPU 時長,超過公開 ZeroGPU 額度;免費 token 亦未必夠
- 本地路徑:RTX 5080 16GB 理論上放得下 0.6B 模型,但官方要求 **Python≥3.11 + torch 2.7 cu128 + flash-attn**(Windows 編譯 flash-attn 高風險)— 未嘗試
- 結論:**工具真實存在且用法明確(GLB→GLB),但本輪未能完成一次綁骨實測。** 等免費額度/付費 ZeroGPU/本地 Linux 機先驗證

### 對本遊戲用途(候選,未執行)
- 將 Objaverse/掃描嘅靜態工人模型 → 自動骨架+權重 → 接現有 worker-rig 骨名(spine/head/thigh…)
- **KL 提醒正確**:骨架+權重 ≠ 有 Idle/Walk 動作、≠ 兼容現有控制。下一步驗證順序:
  1. 輸出 GLB 喺 three.js 載入,SkeletonUtils 睇骨名
  2. 手動擺一個 pose 驗證手腳變形(VFX 工具或代碼)
  3. 骨名映射去現有 worker-rig;重用現有 walk/idle 程序動畫
  4. PPE(帽/背心)掛點重定位
  5. 全部過先算「候選通過」,仍需 KL 視覺確認

## 三、社群「Image to Rigged 3D Model」Space 鏈(TRELLIS→SkinTokens)

- 搵到多個同名鏡像:`kirikir13/image-to-rigged-3d`(**PAUSED**)、`ckc99u/…`、`JSCPPProgrammer/…`
- 原版鏈路依賴 TRELLIS Space + SkinTokens Space — 後者 450s duration 問題同樣存在;而且鏡像多數 PAUSED/私改
- **結論:唔好照搬社群鏈**;正式做就自己串(TRELLIS.2 API 已證可達 + SkinTokens 待額度)

## 四、即時可行下一步(等 KL 決定)
1. **TRELLIS.2**:KL 提供免費 HF token(自己加入 `.mcp.json` headers 或環境變數)→ 24h 額度重置後重跑 extract_glb,一張 CC0 交通錐參考圖 → GLB → audition
2. **SkinTokens**:等 Space 額度/找本地 Linux GPU 機;或者 KL 在 tripo3d.ai 網頁手動試(同底層技術)
3. 兩者都係**生成工具候選** — 產出物一樣要過 licence 輸入自查 + KL 視覺確認先入 production

## FILES
- 本報告:`qa-evidence/asset-mining/TRELLIS2-SKINTOKENS-RESEARCH.md`
- 測試產物:`models/candidates/e/_tiny_human.glb`(自製測試網格,1120 faces)
- 零 gameplay 檔案改動
