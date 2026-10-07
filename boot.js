globalThis.__BUILD = 'audit-2026.10.02';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
const progress = message => globalThis.gameLoadStatus?.(message);
/* paint():rAF 壞死嘅 tab 會永遠 hang → race 300ms fallback,健康環境仍以 rAF 為主 */
const paint = () => new Promise(resolve => {
  let done = false;
  const fin = () => { if (!done) { done = true; resolve(); } };
  requestAnimationFrame(() => requestAnimationFrame(fin));
  setTimeout(fin, 300);
});
/* P10.1 hardening:IAB 環境實測 (a) loader.load() 內部 XHR 某啲狀態下靜默阻塞、
   (b) dynamic import() 對 localhost 靜默 pending、(c) GLTF parse 嘅 texture 解碼 onLoad 可以永遠唔返。
   對策:模型 fetch()→loader.parse() + 20s timeout + 一次重試;全部失敗就降級
   (MIXAMO_WORKER=null → app.js makeHuman 自動退程序化角色),唔阻塞進入遊戲。
   app.js 由 index.html 靜態載入,頂部自行等 WORKER_MODELS(健康環境零等待)。 */
const raceTimeout = (p, ms, tag) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('逾時:' + tag)), ms))]);
const loadGLB = async (url) => {
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  const buf = await r.arrayBuffer();
  return await raceTimeout(new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej)), 20000, 'glb-parse');
};
const loadFBX = async (url) => {
  const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  const buf = await r.arrayBuffer();
  return raceTimeout(Promise.resolve().then(() => new FBXLoader().parse(buf, '')), 20000, 'fbx-parse');
};
const tryTwice = (fn, tag) => fn().catch(e1 => { console.warn(tag + ' 第一次失敗,重試:', e1 && e1.message || e1); return fn(); });
try {
  progress('載入工人及 NPC 模型…'); await paint();
  const soldierP = tryTwice(() => loadGLB('models/Soldier.glb'), 'Soldier');
  const workerP = tryTwice(() => loadFBX('models/worker-v2.fbx'), 'worker-v2');
  const soldier = await raceTimeout(soldierP, 46000, 'Soldier總').catch(e => { console.warn('Soldier降級:', e); return null; });
  let worker = await raceTimeout(workerP, 46000, 'worker總').catch(e => { console.warn('worker降級:', e); return null; });
  globalThis.WORKER_MODELS = {male:soldier, female:null};
  globalThis.MIXAMO_WORKER = worker ? {obj:worker, clips:[]} : null;
  progress(worker ? '建立地盤及角色骨架…' : '⚠ 模型降級模式…'); await paint();
  /* app.js 係 index.html 靜態 module(與 boot.js 並行);等佢完成場景建立 */
  const t0 = performance.now();
  while (!window.__game && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 120));
  clearTimeout(window.__bootWatchdog);
  const button = document.getElementById('btnStart');
  button.onclick = null; button.disabled = false; button.textContent = '嘟平安卡開工';
  document.getElementById('loadStatus').textContent = window.__game ? (worker ? '準備好 · 開場喺地盤閘口附近' : '準備好 · (模型降級模式)') : '載入失敗：app.js 未完成(請重新載入)';
  console.info('[BUILD]', globalThis.__BUILD);
} catch (error) {
  clearTimeout(window.__bootWatchdog);
  console.error('遊戲載入失敗', error);
  globalThis.gameLoadStatus?.('載入失敗：' + error.message, true);
}
