/* TASK E4:asset mining contact-sheet 渲染器(?m=slug[&v=front|side|rear]) */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
const q = new URLSearchParams(location.search);
const slug = q.get('m'), view = q.get('v') || 'front';
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1280, 720);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db8cc);
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x8f8878, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
sun.position.set(30, 50, 20); sun.castShadow = true;
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6b6f5a, roughness: .95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(200, 20, 0x224466, 0x1a2e44); scene.add(grid);
/* 1.78m 工人比例柱 */
const pole = new THREE.Group();
{
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.55, 10), new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: .7 }));
  b.position.y = .775; b.castShadow = true; pole.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc98d63 }));
  h.position.y = 1.68; pole.add(h);
}
scene.add(pole);
const camera = new THREE.PerspectiveCamera(50, 1280 / 720, .1, 2000);
const ktx2 = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/').detectSupport(renderer);
new GLTFLoader().setKTX2Loader(ktx2).load('models/candidates/e/' + slug + '.glb', gl => {
  const g = gl.scene;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  /* 歸一:最大邊 → 8m,貼地 */
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3());
  const s = 8 / Math.max(size.x, size.y, size.z, .001);
  g.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(g);
  const ctr = box2.getCenter(new THREE.Vector3());
  g.position.x -= ctr.x; g.position.z -= ctr.z; g.position.y -= box2.min.y;
  pole.position.set(6.2, 0, 1.2);
  scene.add(g);
  const box3 = new THREE.Box3().setFromObject(g);
  const c3 = box3.getCenter(new THREE.Vector3());
  const R = Math.max(box3.getSize(new THREE.Vector3()).length() * .62, 10);
  const dir = { front: [1, .35, 1], side: [0.02, .18, 1], rear: [-1, .4, .95] }[view];
  camera.position.set(c3.x + dir[0] * R, dir[1] * R, c3.z + dir[2] * R);
  camera.lookAt(c3.x, c3.y * .7, c3.z);
  renderer.render(scene, camera);
  document.querySelector('#info').textContent = slug + ' · ' + view + ' ✓';
  window.__ready = true;
}, undefined, e => { document.querySelector('#info').textContent = slug + ' FAIL ' + e; window.__ready = true; });
window.__renderer = renderer; window.__scene = scene;
