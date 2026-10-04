/* P10.2 Asset Audition Scene — 同一位置擺現有程序化泥頭車 + 候選 GLB slot + CSDI 實景
   唔接 gameplay;純視覺比較。 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const status = (m) => { document.querySelector('#status').textContent = m; };
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d8);
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x8f8878, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
sun.position.set(40, 60, 25); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60; sun.shadow.camera.right = 60; sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 200; sun.shadow.bias = -.0008;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6b6f5a, roughness: .95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

/* 參考工人:1.78m 柱(黃) + 頭(膚色球) */
const refPerson = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.55, 10), new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: .7 }));
  body.position.y = .775; body.castShadow = true; refPerson.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc98d63, roughness: .8 }));
  head.position.y = 1.68; refPerson.add(head);
}
refPerson.position.set(4.2, 0, 1.2);
scene.add(refPerson);

/* --- 現有程序化泥頭車(P10.1R 版抽錄,自包含) --- */
function makeProceduralTruck(color) {
  const g = new THREE.Group();
  const M = {
    paint: new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .2 }),
    paintDark: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.5), roughness: .55, metalness: .2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141519, roughness: .96 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: .35, metalness: .85 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x33363c, roughness: .55, metalness: .7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: .1, metalness: .5, transparent: true, opacity: .68 }),
    bed: new THREE.MeshStandardMaterial({ color: 0x51545c, roughness: .68, metalness: .4 }),
    bedIn: new THREE.MeshStandardMaterial({ color: 0x2c2e34, roughness: .92 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: .5 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xcfb96a, emissiveIntensity: .75, roughness: .3 })
  };
  const B = (w, h, d, mat, px, py, pz, cast = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz); m.castShadow = cast; g.add(m); return m;
  };
  const CYL = (r, len, mat, px, py, pz, axis, cast = false) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
    m.position.set(px, py, pz); m.castShadow = cast; g.add(m); return m;
  };
  for (const s of [-1, 1]) B(5.7, .24, .1, M.darkMetal, -.15, .8, s * .44, true);
  CYL(.11, 2.1, M.darkMetal, 1.95, .54, 0, 'z', true);
  CYL(.13, 1.9, M.darkMetal, -1.45, .54, 0, 'z', true);
  CYL(.3, 1.2, M.metal, .55, .6, -.88, 'z', true);
  B(1.6, 1.42, 2.35, M.paint, 1.95, 1.66, 0, true);
  B(1.52, .68, 2.26, M.paint, 1.9, 2.68, 0, true);
  const ws = B(.07, .88, 2.1, M.glass, 2.72, 2.62, 0, true); ws.rotation.z = -.18;
  for (const s of [-1, 1]) {
    const ap = B(.16, .95, .16, M.paint, 2.68, 2.6, s * 1.1, true); ap.rotation.z = -.18;
    B(.72, .52, .06, M.glass, 2.02, 2.66, s * 1.14, false);
    B(.45, .07, .8, M.darkMetal, 1.28, .58, s * .95);
    B(.5, .05, .05, M.darkMetal, 2.78, 2.85, s * 1.2);
    B(.05, .34, .22, new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: .18, metalness: .95 }), 2.98, 2.44, s * 1.38, false);
  }
  B(.08, .6, 1.78, M.darkMetal, 2.78, 1.55, 0);
  B(.34, .44, 2.42, M.darkMetal, 2.86, .5, 0, true);
  B(3.5, .16, 2.14, M.bedIn, -1.45, 1.05, 0, true);
  for (const s of [-1, 1]) {
    B(3.5, .92, .15, M.bed, -1.45, 1.58, s * 1.09, true);
    B(3.58, .1, .22, M.stripe, -1.45, 2.08, s * 1.09, true);
    for (let i = 0; i < 6; i++) B(.1, .78, .09, M.paintDark, -2.95 + i * .66, 1.58, s * 1.2);
  }
  B(.16, 1.42, 2.24, M.bed, .3, 1.72, 0, true);
  B(.1, .88, 2.08, M.bed, -3.14, 1.6, 0, true);
  CYL(.09, .85, M.darkMetal, -.1, .92, 0, 'x', true);
  const wheels = [];
  const mkWheel = (wx, wz, tw) => {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(.54, .54, tw, 24), M.rubber);
    tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; w.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, tw + .02, 14), M.metal);
    rim.rotation.x = Math.PI / 2; w.add(rim);
    w.position.set(wx, .54, wz); g.add(w); wheels.push(w);
  };
  mkWheel(1.95, 1.02, .42); mkWheel(1.95, -1.02, .42);
  for (const s of [-1, 1]) { mkWheel(-1.45, s * .72, .34); mkWheel(-1.45, s * 1.14, .34); }
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x33363c, roughness: .55, metalness: .7, side: THREE.DoubleSide });
  const guard = (fx, fz, len) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, len, 12, 1, true, 0, Math.PI), guardMat);
    f.rotation.x = Math.PI / 2; f.position.set(fx, .6, fz); f.castShadow = true; g.add(f);
  };
  guard(1.95, 1.02, .6); guard(1.95, -1.02, .6); guard(-1.45, .93, 1.05); guard(-1.45, -.93, 1.05);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa20 }));
  beacon.position.set(1.9, 3.2, 0); g.add(beacon);
  return { g, wheels };
}
const proc = makeProceduralTruck(0x3a8a4a);
proc.g.position.set(0, 0, 0);
scene.add(proc.g);
/* P10.2-R:明確標示 — 綠車係 baseline,唔係新資產成果 */
{
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 96;
  const c2 = cvs.getContext('2d');
  c2.fillStyle = 'rgba(20,24,32,.9)'; c2.fillRect(0, 0, 512, 96);
  c2.strokeStyle = '#7ea4c8'; c2.lineWidth = 4; c2.strokeRect(4, 4, 504, 88);
  c2.fillStyle = '#cfe2ee'; c2.font = 'bold 40px Arial'; c2.textAlign = 'center';
  c2.fillText('PROCEDURAL_BASELINE', 256, 62);
  const t = new THREE.CanvasTexture(cvs);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sp.scale.set(6, 1.125, 1); sp.position.set(0, 4.2, 0);
  proc.g.add(sp);
}
status('PROCEDURAL_BASELINE ✓ · 候選:Candidates 1-3 BLOCKED(需 Sketchfab auth);CSDI 載入中…');

/* --- 候選 slot:models/candidates/*.glb(有檔案就載,無就標示) --- */
const ktx2 = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/').detectSupport(renderer);
const gltf = new GLTFLoader().setKTX2Loader(ktx2);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 2000);
camera.position.set(10.5, 2.4, 9.0);
camera.lookAt(0, 1.2, 0);
(function loop() { requestAnimationFrame(loop); renderer.render(scene, camera); })();
const slots = [
  { key: 'candidate1', url: 'models/candidates/isuzu_giga_dump.glb', pos: [-14, 0, 0], label: 'Candidate 1 · Isuzu Giga (80.7k)' },
  { key: 'candidate2', url: 'models/candidates/electronick_dump.glb', pos: [14, 0, 0], label: 'Candidate 2 · ElectroNick (34.3k)' },
  { key: 'candidate3', url: 'models/candidates/hino_fm340.glb', pos: [-28, 0, 0], label: 'Candidate 3 · Hino FM 340 (38.3k)' }
];
const headT = (u) => Promise.race([fetch(u, { method: 'HEAD' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
for (const s of slots) {
  try {
    const r = await headT(s.url);
    if (!r.ok) { status(s.label + ' — 檔案未提供(需 Sketchfab auth 下載)'); continue; }
    gltf.load(s.url, gl => {
      const m = gl.scene;
      m.position.set(...s.pos); m.castShadow = true;
      scene.add(m);
      status(s.label + ' ✓ 已載入');
    }, undefined, e => status(s.label + ' — 載入失敗 ' + e));
  } catch (e) { status(s.label + ' — 未提供'); }
}

/* --- CSDI 實景(真香港建築,九龍灣附近) --- */
let csdiGroup = null;
try {
  const r = await headT('models/candidates/csdi_kowloonbay.glb');
  if (r.ok) {
    gltf.load('models/candidates/csdi_kowloonbay.glb', gl => {
      csdiGroup = gl.scene;
      csdiGroup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      /* P10.2-R:套用 3D Tiles spec chain — placeMatrix = ENU(MegaBox) × tileset root.transform × Rx90(Y-up→Z-up)
         資料來源:models/candidates/csdi_placement.json(node transform 已查:無,RTC_CENTER:無) */
      const raw = new URLSearchParams(location.search).has('rawcsdi');
      if (!raw) {
        fetch('models/candidates/csdi_placement.json').then(r => r.json()).then(pl => {
          csdiGroup.matrixAutoUpdate = false;
          csdiGroup.matrix.fromArray(pl.placementMatrixColumnMajor);
          csdiGroup.matrixWorldNeedsUpdate = true;
          // 地面 datum:量 world bbox,整組平移令 min.y=0(統一垂直基準位移,保留相對位置)
          requestAnimationFrame(() => {
            const box = new THREE.Box3().setFromObject(csdiGroup);
            const parent = new THREE.Group();
            parent.position.y = -box.min.y;
            scene.remove(csdiGroup);
            parent.add(csdiGroup);
            scene.add(parent);
            window.__csdiStatus.place = '✓ spec chain(ENU×root.transform×Rx90)+地面datum';
            window.__csdiGroup2 = parent;
            /* 二次精確落地:KTX2 非同步解碼後 bbox 會變 */
            setTimeout(() => {
              parent.updateMatrixWorld(true);
              let mn = 1e15;
              parent.traverse(o => { if (o.isMesh && o.geometry.attributes.position) {
                const m = o.matrixWorld.elements;
                const pos = o.geometry.attributes.position;
                for (let i = 0; i < pos.count; i += 50) mn = Math.min(mn, m[1]*pos.getX(i) + m[5]*pos.getY(i) + m[9]*pos.getZ(i) + m[13]);
              }});
              parent.position.y -= mn;
              parent.updateMatrixWorld(true);
            }, 800);
          });
        });
      } else {
        window.__csdiStatus = { place: '✗ RAW(未套 transform)— 修前對照用' };
      }
      scene.add(csdiGroup);
      let ktx = 0, mats = 0;
      csdiGroup.traverse(o => {
        if (o.isMesh) { mats++; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m.map && m.map.isCompressedTexture) ktx++; }
      });
      window.__csdiStatus = Object.assign(window.__csdiStatus || {}, {
        parse: '✓ b3dm header 表長度計算→GLB(magic/version/len 驗證)',
        textures: ktx > 0 ? `✓ KTX2 解碼 ${ktx}/${mats} 材質` : `✗ KTX2 未解碼`,
        visual: '待 KL 目視確認'
      });
      status(`CSDI: ${window.__csdiStatus.parse} | ${window.__csdiStatus.textures} | 擺位:${window.__csdiStatus.place || '套用中'} | ${window.__csdiStatus.visual}`);
    }, undefined, e => status('CSDI 載入失敗:' + e));
  }
} catch (e) { /* skip */ }

/* --- 程序化對照樓(簡單 OSM 風格盒,比較用) --- */
{
  const b = new THREE.Mesh(new THREE.BoxGeometry(16, 26, 12), new THREE.MeshStandardMaterial({ color: 0xb8ab94, roughness: .9 }));
  b.position.set(46, 13, 12); b.castShadow = true; scene.add(b);
  for (let f = 1; f < 8; f++) for (let k = -2; k <= 2; k++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, .1), new THREE.MeshStandardMaterial({ color: 0x1c242e, roughness: .3 }));
    w.position.set(46 + k * 3, f * 3.1, 12 - 6.06); scene.add(w);
  }
}

/* --- 相機預設 --- */
const views = {
  side: () => ({ p: [10.5, 2.4, 9.0], t: [0, 1.2, 0] }),
  front34: () => ({ p: [10.5, 2.8, -9.5], t: [0, 1.3, 0] }),
  rear34: () => ({ p: [10.0, 3.0, 10.5], t: [-2, 1.3, 0] }),
  city: () => ({ p: [30, 8, 34], t: [46, 8, -5] })
};
function applyView(name) {
  const v = views[name]();
  camera.position.set(...v.p);
  camera.lookAt(...v.t);
}
applyView('side');
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => applyView(b.dataset.view)));
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.__audition = { camera, renderer, scene, applyView };
status('就緒 ✓');

/* ===================== TASK 1 — CSDI VISUAL PROOF =====================
   4 個鏡頭 + 畫面內 debug overlay(HTML 疊加,唔遮擋 3D)。
   window.__task1 = { ready, bbox, anchor, shots(name→fn) } */
window.__task1 = { ready: false };
function task1Info() {
  const g = window.__csdiGroup2;
  if (!g) return null;
  g.updateMatrixWorld(true);
  let mn = [1e15, 1e15, 1e15], mx = [-1e15, -1e15, -1e15];
  g.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.position) return;
    const pos = o.geometry.attributes.position, m = o.matrixWorld.elements;
    const step = Math.max(1, Math.floor(pos.count / 300));
    for (let i = 0; i < pos.count; i += step) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const w = [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]); }
    }
  });
  const ctr = [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2];
  return {
    bboxMin: mn.map(v => +v.toFixed(1)), bboxMax: mx.map(v => +v.toFixed(1)), center: ctr,
    size: [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]].map(v => +v.toFixed(1)),
    horizDist: +Math.hypot(ctr[0], ctr[2]).toFixed(1)
  };
}
/* overlay:左上 debug 資訊(HTML,蓋半透明底) */
function task1Overlay(kind, info) {
  let el = document.getElementById('task1info');
  if (!el) { el = document.createElement('div'); el.id = 'task1info';
    el.style.cssText = 'position:fixed;top:8px;right:8px;background:rgba(8,12,20,.88);color:#d8e6f0;font:11px/1.55 Consolas,monospace;padding:10px 12px;border:1px solid #3a5068;border-radius:6px;z-index:20;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
  }
  const L = [
    'TASK1 · ' + kind,
    'Anchor: MegaBox, Kowloon Bay',
    'Latitude: 22.3245N  Longitude: 114.2172E',
    'Building bbox (m):',
    '  X: ' + info.bboxMin[0] + ' … ' + info.bboxMax[0],
    '  Y(高): ' + info.bboxMin[1] + ' … ' + info.bboxMax[1],
    '  Z: ' + info.bboxMin[2] + ' … ' + info.bboxMax[2],
    'Height: ' + info.size[1] + 'm  Width: ' + info.size[0] + 'm  Depth: ' + info.size[2] + 'm',
    'Horizontal dist from anchor: ' + info.horizDist + 'm',
    'Chain: root.transform → ECEF → ENU → Three.js',
    'Grid: 100m cells · 黃柱: 1.78m · 軸 X=East(紅) Z=South(藍)'
  ].join('\n');
  el.textContent = L;
}
/* 鏡頭们(數據驅動:以 bbox center 對焦) */
window.__task1Shots = {
  top(info) {
    camera.position.set(info.center[0], info.size[1] + 380, info.center[2] + 1);
    camera.lookAt(info.center[0], 0, info.center[2]);
  },
  street(info) {
    // 1.7m 高,建築距離 ~70m,鏡頭對準建築中段令 MegaBox 佔畫面 ≥40%
    const dx = info.size[0] / 2 + 60, dz = info.size[2] / 2 + 60;
    camera.position.set(info.center[0] - dx, 1.7, info.center[2] - dz);
    camera.lookAt(info.center[0], info.size[1] * .55, info.center[2]);
  },
  oblique(info) {
    camera.position.set(info.center[0] + info.size[0] * .9 + 60, info.size[1] * 1.6 + 40, info.center[2] + info.size[2] * .9 + 60);
    camera.lookAt(info.center[0], info.size[1] * .35, info.center[2]);
  }
};
/* 預備 proof 輔助物:100m 格線/軸/錨點柱/bbox 線框(掛喺 scene,常駐) */
function task1Decor(info) {
  const grid = new THREE.GridHelper(800, 8, 0x2c4a66, 0x1d3348);
  grid.position.set(info.center[0], 0.02, info.center[2]); scene.add(grid);
  const axes = new THREE.AxesHelper(60); axes.position.set(info.center[0] - 300, 0.05, info.center[2] - 300); scene.add(axes);
  const anchorMat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  const anchor = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 30, 8), anchorMat);
  anchor.position.set(0, 15, 0); scene.add(anchor);
  const bb = new THREE.Box3(new THREE.Vector3(...info.bboxMin), new THREE.Vector3(...info.bboxMax));
  const helper = new THREE.Box3Helper(bb, 0x3ad0a0); scene.add(helper);
  /* 100m scale bar:由 grid 邊起一條綠線 + 兩端球 */
  const sb = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0x7ef08a });
  const g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(100, 0.1, 0)]);
  sb.add(new THREE.Line(g2, mat));
  for (const ex of [0, 100]) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7ef08a })); s.position.set(ex, .1, 0); sb.add(s); }
  sb.position.set(info.center[0] - 300, 0, info.center[2] - 340); scene.add(sb);
}
window.__task1Compare = function () {
  /* A4:左右 split — 左程序化(16×26×12盒,貼埋同區) 右CSDI,同相機/格線 */
  const info = task1Info();
  if (!info) return 'CSDI 未載入';
  if (!window.__task1.ready) { task1Decor(info); window.__task1.ready = true; }
  // 程序化對照樓移近 CSDI 隔籬(左邊 90m),同地面
  scene.children.forEach(ch => { if (ch.isMesh && Math.abs(ch.position.x - 46) < 1 && Math.abs(ch.position.z - 12) < 1) ch.position.set(info.center[0] - 90, ch.position.y, info.center[2]); });
  scene.children.forEach(ch => { if (ch.isMesh && Math.abs(ch.position.z - 5.94) < 0.2 && ch.position.x >= 40) ch.position.x -= 136; }); // 窗陣
  // 對比相機:兩者同框,斜 3/4 中距
  const mid = info.center[0] - 45;
  camera.position.set(mid + 40, 60, info.center[2] + 210);
  camera.lookAt(mid, 8, info.center[2]);
  task1Overlay('COMPARE', info);
  renderer.render(scene, camera);
  return 'ok';
};
window.__task1Go = function (kind) {
  const info = task1Info();
  if (!info) return 'CSDI 未載入';
  if (!window.__task1.ready) { task1Decor(info); window.__task1.ready = true; }
  window.__task1Shots[kind](info);
  task1Overlay(kind, info);
  renderer.render(scene, camera);
  return JSON.stringify(info);
};
