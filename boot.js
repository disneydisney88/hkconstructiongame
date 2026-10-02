globalThis.__BUILD = 'audit-2026.10.02';
const progress = message => globalThis.gameLoadStatus?.(message);
const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const load = (loader, url) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('載入逾時: ' + url)), 45000);
  loader.load(url, result => { clearTimeout(timer); resolve(result); }, undefined,
    error => { clearTimeout(timer); reject(error); });
});
try {
  const [{GLTFLoader}, {FBXLoader}] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/FBXLoader.js')
  ]);
  progress('載入工人及 NPC 模型…'); await paint();
  const [soldier, worker] = await Promise.all([
    load(new GLTFLoader(), 'models/Soldier.glb'), load(new FBXLoader(), 'models/worker-v2.fbx')
  ]);
  globalThis.WORKER_MODELS = {male:soldier, female:null};
  globalThis.MIXAMO_WORKER = {obj:worker, clips:[]};
  progress('建立地盤及角色骨架…'); await paint();
  await import('./app.js');
  clearTimeout(window.__bootWatchdog);
  const button = document.getElementById('btnStart');
  button.onclick = null; button.disabled = false; button.textContent = '嘟平安卡開工';
  document.getElementById('loadStatus').textContent = '準備好 · 開場喺地盤閘口附近';
  console.info('[BUILD]', globalThis.__BUILD);
} catch (error) {
  clearTimeout(window.__bootWatchdog);
  console.error('遊戲載入失敗', error);
  globalThis.gameLoadStatus?.('載入失敗：' + error.message, true);
}
