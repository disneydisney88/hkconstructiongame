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
status('程序化泥頭車 ✓ · 載入候選/CSDI…');

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
      // CSDI glb 用 Y-up,單位米;放喺場地東面,貼地
      const box = new THREE.Box3().setFromObject(csdiGroup);
      const ctr = box.getCenter(new THREE.Vector3());
      csdiGroup.position.set(46 - ctr.x, -ctr.y, -30 - ctr.z); // 旋轉局部框架:全軸減 center 貼地
      csdiGroup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(csdiGroup);
      status('CSDI 實景 ✓(Lands Department 3D Spatial Data)');
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
