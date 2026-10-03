/* =========================================================================
 * 香港地盤 GTA · 開工大吉
 * 真實地圖:九龍灣/啟德/觀塘 (OpenStreetMap)
 * 主角:戴安全帽連帽帶+反光衣(背寫香港建築)+安全鞋嘅地盤工人
 * 敵人:白帽安全主任 | 危險源:天秤吊運/泥頭車倒後/吊重/坑洞 (參考勞工處意外類型)
 * ========================================================================= */
import * as THREE from "three";
import { createInductionRoom } from "./induction-room.js";
import { createWorker } from "./worker-rig.js";
import { clone as skeletonClone } from "three/addons/utils/SkeletonUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

/* 錯誤收集(測試用) */
window.__errs = [];
window.addEventListener("error", e => window.__errs.push(`E: ${e.message} @${(e.filename || "").split("/").pop()}:${e.lineno}`));
window.addEventListener("unhandledrejection", e => window.__errs.push("P: " + String(e.reason && e.reason.stack || e.reason).slice(0, 300)));
window.__log = m => { window.__errs.push("L: " + m); };

/* P10.1:app.js 改為 index.html 靜態 module 載入(與 boot.js 並行);
   建世界前等 boot.js 模型就緒(健康環境模型早已就緒,零等待) */
if (!(globalThis.WORKER_MODELS && globalThis.MIXAMO_WORKER)) {
  await new Promise(res => {
    const iv = setInterval(() => { if (globalThis.WORKER_MODELS && globalThis.MIXAMO_WORKER) { clearInterval(iv); res(); } }, 100);
    setTimeout(() => { clearInterval(iv); res(); }, 45000);
  });
}

/* ---------- 工具 ---------- */
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const L2 = dx * dx + dz * dz;
  if (L2 < 1e-9) return Math.hypot(px - ax, pz - az);
  let t = clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1);
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/* ---------- 音效 (WebAudio 合成) ---------- */
const AU = { ctx: null, muted: false, engineOsc: null, engineGain: null, chaseTimer: 0 };
function auInit() { if (!AU.ctx) { try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } }
function beep(f, dur = .12, type = "square", vol = .18, when = 0) {
  if (!AU.ctx || AU.muted) return;
  const t = AU.ctx.currentTime + when;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(AU.ctx.destination); o.start(t); o.stop(t + dur + .05);
}
const sDing = () => { beep(880, .1, "sine", .22); beep(1320, .14, "sine", .18, .08); };
const sCash = () => [660, 880, 1100, 1320].forEach((f, i) => beep(f, .12, "triangle", .2, i * .09));
const sThud = () => { beep(70, .25, "sawtooth", .4); beep(46, .3, "sine", .35); };
const sAlarm = () => { beep(700, .16, "square", .12); beep(520, .16, "square", .12, .18); };
const sRev = () => { beep(950, .35, "square", .1); };
const sClick = () => beep(500, .05, "sine", .12);
const sSplash = () => { beep(240, .2, "sine", .3); beep(120, .3, "sine", .25, .1); };
function engineStart() {
  if (!AU.ctx || AU.engineOsc) return;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = "triangle"; o.frequency.value = 55; g.gain.value = AU.muted ? 0 : .06;
  o.connect(g).connect(AU.ctx.destination); o.start();
  AU.engineOsc = o; AU.engineGain = g;
}
function engineStop() { if (AU.engineOsc) { try { AU.engineOsc.stop(); } catch (e) { } AU.engineOsc = null; } }
function engineSpeed(v) { if (AU.engineOsc) AU.engineOsc.frequency.value = 50 + Math.abs(v) * 14; }

/* ---------- 地圖數據 ---------- */
const MD = window.MAP_DATA;
const BUILDINGS = MD.b, ROADS = MD.r, ZONES = MD.z, WATERS = MD.w, GREENS = MD.g, POIS = MD.poi;

/* 主地盤:最大而就近 MegaBox 嘅 construction zone */
function zoneArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length]; a += x1 * z2 - x2 * z1; } return Math.abs(a) / 2; }
function centroid(p) { return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]; }
const mega = POIS.find(p => p[2] === "MegaBox") || [-1188, 441];
const zonesSorted = ZONES.map(z => ({ pts: z, area: zoneArea(z), c: centroid(z) })).sort((a, b) => b.area - a.area);
const MAIN_SITE = zonesSorted.find(z => d2(z.c[0], z.c[1], mega[0], mega[1]) < 900) || zonesSorted[0];
const SITE2 = zonesSorted.find(z => z !== MAIN_SITE && d2(z.c[0], z.c[1], MAIN_SITE.c[0], MAIN_SITE.c[1]) < 1100) || zonesSorted[1];

/* 道路採樣點(主路 w>=7,每~14m一點) */
const roadPts = [];
for (const r of ROADS) {
  if (r.w < 7) continue;
  let acc = 0;
  for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
    const L = Math.hypot(bx - ax, bz - az);
    for (let t = 0; t < L; t += 14) { const k = t / L; roadPts.push([lerp(ax, bx, k), lerp(az, bz, k), r.w]); }
    acc += L;
  }
}
function nearestRoadPt(x, z) { let best = null, bd = 1e9; for (const p of roadPts) { const d = d2(x, z, p[0], p[1]); if (d < bd) { bd = d; best = p; } } return best; }

/* 大門:zone 邊界最近主路嗰點 */
function findGate(zone) {
  let best = null, bd = 1e9;
  for (let i = 0; i < zone.pts.length; i++) {
    const [ax, az] = zone.pts[i], [bx, bz] = zone.pts[(i + 1) % zone.pts.length];
    for (let t = 0; t <= 1; t += .2) {
      const x = lerp(ax, bx, t), z = lerp(az, bz, t);
      const rp = nearestRoadPt(x, z);
      if (rp) { const d = d2(x, z, rp[0], rp[1]); if (d < bd) { bd = d; best = [x, z, i]; } }
    }
  }
  return best;
}
const GATE = findGate(MAIN_SITE);
const GATE_DIR_IN = Math.atan2(MAIN_SITE.c[1] - GATE[1], MAIN_SITE.c[0] - GATE[0]);
const OFFICE = [GATE[0] + Math.cos(GATE_DIR_IN) * 10, GATE[1] + Math.sin(GATE_DIR_IN) * 10];
const HOSPITAL = (() => { const h = POIS.find(p => p[2].includes("專科門診")) || POIS.find(p => p[2].includes("醫院")); return h ? [h[0], h[1]] : [-1409, 662]; })();

/* ---------- 共用周界 opening data(P1):圍板/碰撞/門禁單一來源 ----------
   法例參考:Cap.59I《建築地盤(安全)規例》圍封及閘門高度≥2m;人車分隔。
   每個 opening: { edge, tCentre, t0, t1, width, type:'pedestrian'|'vehicle', x, z, dir(沿邊單位向量), edgeLen }
   t* 為沿 edge 參數(米)。視覺圍板、collide()、車閘 barrier 全部只讀呢份數據。 */
function computeOpenings(zone, gate) {
  const edge = gate[2];
  const [ax, az] = zone.pts[edge], [bx, bz] = zone.pts[(edge + 1) % zone.pts.length];
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L;
  const tG = clamp((gate[0] - ax) * ux + (gate[1] - az) * uz, 4, L - 4);
  const mk = (type, width, t) => {
    t = clamp(t, width / 2 + .5, L - width / 2 - .5);
    return { edge, type, width, tCentre: t, t0: t - width / 2, t1: t + width / 2, x: ax + ux * t, z: az + uz * t, ux, uz, edgeLen: L, ax, az };
  };
  const ped = mk("pedestrian", 6, tG);
  let vt = tG + 16;                      // 車閘放行人閘側邊,唔經三棍閘
  if (vt + 4 > L) vt = tG - 16;          // 唔夠位就放另一邊
  if (vt < 4 || vt > L - 4 || Math.abs(vt - tG) < 12) vt = clamp(tG + 12, 4.5, L - 4.5); // 短邊後備
  const veh = mk("vehicle", 9, vt);
  return { list: [ped, veh], edgeLen: L, ax, az, ux, uz, edge };
}
const MAIN_OPENINGS = computeOpenings(MAIN_SITE, GATE);
const SITE2_OPENINGS = (() => { const g2 = findGate(SITE2); const o = computeOpenings(SITE2, g2); return { ...o, list: o.list.filter(op => op.type === "pedestrian") }; })(); // SITE2 暫只有行人閘
function vehicleGateOpen() { const v = MAIN_OPENINGS.list.find(o => o.type === "vehicle"); if (!v) return false; return !!((playerTruck && d2(playerTruck.x, playerTruck.z, v.x, v.z) < 12) || (typeof npcTruck !== "undefined" && npcTruck && d2(npcTruck.x, npcTruck.z, v.x, v.z) < 12)); } // P9.2:玩家車或NPC車12m內升起(d2 回傳米)

/* ---------- three.js 基礎 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbcd4e8, 180, 1100);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .1, 4000);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* 天空(日間漸變) */
{
  const geo = new THREE.SphereGeometry(2800, 20, 14);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2f6fd8) }, mid: { value: new THREE.Color(0x7ab3e8) }, bot: { value: new THREE.Color(0xd8e8f4) } },
    vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "varying vec3 vP; uniform vec3 top,mid,bot; void main(){ float h=normalize(vP).y; vec3 c=h>0.18?mix(mid,top,smoothstep(0.18,0.75,h)):mix(bot,mid,smoothstep(-0.08,0.18,h)); gl_FragColor=vec4(c,1.0); }"
  });
  scene.add(new THREE.Mesh(geo, mat));
}
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x8f8878, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); /* P6:2048→1024,140m 範圍 ~7cm/texel */;
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45; /* P6: 收窄shadow範圍 */;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 600; sun.shadow.bias = -.0008;
scene.add(sun); scene.add(sun.target);
/* P5:HDRI 環境光(Poly Haven kloppenheim_02 2K,CC0)— PMREM 做 IBL;
   hemi 降做補底,sun 保留主光+陰影。HDR 載入失敗唔阻街(keep hemi)。 */
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load("assets/textures/sky_1k.hdr", hdr => {
    try {
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      scene.environmentIntensity = .55;
      hemi.intensity = .45; sun.intensity = 2.6;
      hdr.dispose(); pmrem.dispose();
    } catch (e) { window.__errs.push("HDRI: " + e); }
  }, undefined, () => { /* 網絡/檔案失敗:維持原有 hemi+sun */ });
}

/* ---------- 貼圖工廠 ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const groundTex = canvasTex(256, 256, (g) => {
  g.fillStyle = "#57534b"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = randi(-14, 14); g.fillStyle = `rgb(${87 + v},${83 + v},${75 + v})`; g.fillRect(randi(0, 256), randi(0, 256), randi(1, 3), randi(1, 3)); }
});
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(260, 260);
const netTex = canvasTex(128, 128, (g) => { // 地盤綠網
  g.fillStyle = "rgba(30,120,60,0.0)"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(60,170,90,0.95)"; g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, 128); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(128, i * 16); g.stroke(); }
});
netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
const _vestTexCache = new Map(); // P8e:同規格反光衣貼圖共用一份 GPU 資源
function vestTex(back, base = "#ff7a1a", label = "香港建築") { // 反光衣:前/背(銀反光帶+灰邊+拉鏈+布紋)
  const key = (back ? 1 : 0) + "|" + base + "|" + label;
  if (_vestTexCache.has(key)) return _vestTexCache.get(key);
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } // 布料噪點
    g.fillStyle = "#7e8894"; g.fillRect(0, 0, 256, 24); g.fillRect(0, 234, 256, 22); // 膊頭/底灰邊
    g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(0, 24, 256, 5); g.fillRect(0, 229, 256, 5);
    const band = (y) => { const gr = g.createLinearGradient(0, y, 0, y + 26); gr.addColorStop(0, "#c8d0da"); gr.addColorStop(.5, "#f8fbff"); gr.addColorStop(1, "#c8d0da"); g.fillStyle = gr; g.fillRect(0, y, 256, 26); g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(0, y + 11.5, 256, 3); };
    band(96); band(170);
    g.fillStyle = "#20242a"; g.textAlign = "center"; g.textBaseline = "middle";
    if (back) { g.font = "900 36px 'Microsoft JhengHei',sans-serif"; g.fillText(label, 128, 58); }
    else {
      g.fillStyle = "#3a3f46"; g.fillRect(124, 26, 8, 208); g.fillStyle = "#c8ccd2"; g.fillRect(127, 26, 2, 208); // 拉鏈
      g.fillStyle = "#20242a"; g.font = "900 16px 'Microsoft JhengHei',sans-serif"; g.fillText("平安上崗", 62, 58);
      g.font = "700 12px sans-serif"; g.fillText("SITE SAFETY", 62, 205);
    }
  });
  _vestTexCache.set(key, t);
  return t;
}
function textPill(text, fg = "#fff", bg = "rgba(12,12,20,.72)", border = "rgba(255,255,255,.25)", font = 700) {
  const c = document.createElement("canvas"); const g = c.getContext("2d");
  g.font = `${font} 26px 'Segoe UI','Microsoft JhengHei',sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 46;
  const gg = c.getContext("2d");
  gg.font = `${font} 26px 'Segoe UI','Microsoft JhengHei',sans-serif`;
  gg.fillStyle = bg; roundRect(gg, 1.5, 1.5, w - 3, 43, 10); gg.fill();
  gg.strokeStyle = border; gg.lineWidth = 1.5; roundRect(gg, 1.5, 1.5, w - 3, 43, 10); gg.stroke();
  gg.fillStyle = fg; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText(text, w / 2, 24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: w / 46 };
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function neonTex(text, color) {
  return canvasTex(128, 320, (g) => {
    g.fillStyle = "#141018"; g.fillRect(8, 8, 112, 304);
    g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(8, 8, 112, 304);
    g.shadowColor = color; g.shadowBlur = 18;
    g.fillStyle = color; g.font = "900 52px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const chars = [...text];
    chars.forEach((ch, i) => g.fillText(ch, 64, 50 + i * (270 / Math.max(chars.length, 1))));
  });
}

/* ---------- 世界:地面/水/綠化/地盤泥地/道路 ---------- */
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshLambertMaterial({ map: groundTex }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
}
function polyMesh(pts, color, y, opacity = 1) {
  if (pts.length < 3) return null;
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return m;
}
for (const w of WATERS) if (w.length >= 3) { const m = polyMesh(w, 0x1d4f72, .06, .95); if (m) scene.add(m); }
for (const gp of GREENS) if (gp.length >= 3) { const m = polyMesh(gp, 0x42583a, .045); if (m) scene.add(m); }
for (const z of ZONES) if (z.length >= 3) { const m = polyMesh(z, 0x8a6f4a, .13); if (m) scene.add(m); }

/* 道路 + 主路中線 */
{
  const pos = [], idx = [], cpos = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const r of ROADS) {
    if (r.p.length < 2) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < .05) continue;
      const px = -dz / L * r.w / 2, pz = dx / L * r.w / 2;
      const base = pos.length / 3;
      pos.push(ax + px, .09, az + pz, ax - px, .09, az - pz, bx + px, .09, bz + pz, bx - px, .09, bz - pz);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      if (r.w >= 12) { // 中線虛線
        for (let t = 4; t < L; t += 9) {
          const k1 = (t - 1.6) / L, k2 = (t + 1.6) / L;
          const cdx = -dz / L * .18, cdz = dx / L * .18;
          const x1 = ax + dx * k1, z1 = az + dz * k1, x2 = ax + dx * k2, z2 = az + dz * k2;
          const b2 = cpos.length / 3;
          cpos.push(x1 + cdx, .1, z1 + cdz, x1 - cdx, .1, z1 - cdz, x2 + cdx, .1, z2 + cdz, x2 - cdx, .1, z2 - cdz);
        }
      }
    }
  }
  const mk = (P, I, color) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); if (I.length) g.setIndex(I); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })); m.receiveShadow = true; scene.add(m); };
  mk(pos, idx, 0x35333a); mk(cpos, [], 0xd8d2b8);
}

/* ---------- 真實化:街燈 / 樹 / 山 / 車流 ---------- */
const waterBBoxes0 = WATERS.filter(w => w.length >= 3).map(w => {
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (const p of w) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
  return { pts: w, minx, maxx, minz, maxz };
});
{
  /* 街燈(主路兩側) */
  const spots = [];
  for (const r of ROADS) {
    if (r.w < 12 || r.p.length < 2) continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
      const L = Math.hypot(bx - ax, bz - az);
      const px = -(bz - az) / L, pz = (bx - ax) / L;
      for (let t = 12; t < L; t += 42) {
        const k = t / L;
        const side = (i % 2 ? 1 : -1);
        spots.push([ax + (bx - ax) * k + px * (r.w / 2 + 1.8) * side, az + (bz - az) * k + pz * (r.w / 2 + 1.8) * side, Math.atan2(bz - az, bx - ax)]);
      }
    }
  }
  const lampSpots = spots.slice(0, 90);
  const poleIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .1, 5.6, 6), new THREE.MeshLambertMaterial({ color: 0x3a3f46 }), lampSpots.length);
  const headIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .16, .22), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lampSpots.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  lampSpots.forEach((s, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -s[2]);
    P.set(s[0], 2.8, s[1]); M.compose(P, Q, S); poleIM.setMatrixAt(i, M);
    P.set(s[0] + Math.cos(s[2]) * .28, 5.55, s[1] + Math.sin(s[2]) * .28); M.compose(P, Q, S); headIM.setMatrixAt(i, M);
  });
  poleIM.castShadow = true; scene.add(poleIM); scene.add(headIM);

  /* 樹(路邊+公園) */
  const treePos = [];
  const badSpot = (x, z) => ZONES.some(zn => pointInPoly(x, z, zn)) || waterBBoxes0.some(w => x > w.minx && x < w.maxx && z > w.minz && z < w.maxz && pointInPoly(x, z, w.pts));
  let guard = 0;
  while (treePos.length < 90 && guard++ < 900) {
    const rp = roadPts[randi(0, roadPts.length - 1)];
    const a = rand(0, Math.PI * 2), off = rand(5.5, 9);
    const x = rp[0] + Math.cos(a) * off, z = rp[1] + Math.sin(a) * off;
    if (badSpot(x, z) || treePos.some(t => d2(t[0], t[1], x, z) < 14)) continue;
    treePos.push([x, z]);
  }
  const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.14, .2, 1.7, 6), new THREE.MeshLambertMaterial({ color: 0x5a4028 }), treePos.length);
  const crownIM = new THREE.InstancedMesh(new THREE.ConeGeometry(1.5, 3.6, 7), new THREE.MeshLambertMaterial({ color: 0x2e5233 }), treePos.length);
  treePos.forEach((t, i) => {
    const sc = rand(.8, 1.35);
    S.set(sc, sc, sc);
    P.set(t[0], .85 * sc, t[1]); M.compose(P, Q.identity(), S); trunkIM.setMatrixAt(i, M);
    P.set(t[0], (1.7 + 1.6) * sc, t[1]); M.compose(P, Q, S); crownIM.setMatrixAt(i, M);
  });
  trunkIM.castShadow = crownIM.castShadow = true; scene.add(trunkIM); scene.add(crownIM);

  /* 遠山(獅子山方向) */
  const mtn = [[-600, -2500, 900, 480], [300, -2600, 760, 400], [1300, -2500, 820, 360], [-1900, -2300, 700, 330]];
  for (const [mx, mz, mr, mh] of mtn) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 9), new THREE.MeshLambertMaterial({ color: 0x27303f }));
    cone.position.set(mx, mh / 2 - 30, mz); scene.add(cone);
  }
}

/* 車流(的士/私家車/van/雙層巴士/綠色小巴) */
const traffic = [];
function makeCar(kind) {
  const g = new THREE.Group();
  const colors = { taxi: 0xd03030, car: [0xd8d8dc, 0x9aa2ac, 0x2a2e36, 0x8a3a3a][randi(0, 3)], van: 0xe8e4da, minibus: 0x1a8a3a };
  const c = colors[kind] ?? 0xcccccc;
  if (kind === "bus") { // 紅色雙層巴士
    const body = new THREE.Mesh(new THREE.BoxGeometry(10.8, 3.15, 2.5), new THREE.MeshLambertMaterial({ color: 0xb01e1e }));
    body.position.y = 1.95; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.8, .18, 2.5), new THREE.MeshLambertMaterial({ color: 0xe8e4da }));
    roof.position.y = 3.55; g.add(roof);
    for (const lvl of [1.35, 2.65]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(10.2, .75, 2.54), new THREE.MeshLambertMaterial({ color: 0x18202a }));
      win.position.y = lvl; g.add(win);
    }
    const dest = new THREE.Mesh(new THREE.BoxGeometry(.5, .34, 1.6), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    dest.position.set(5.45, 3.1, 0); g.add(dest);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(kind === "van" ? 4.4 : 3.7, kind === "van" ? 1.5 : .85, 1.75), new THREE.MeshLambertMaterial({ color: c }));
    body.position.y = kind === "van" ? 1.0 : .78; body.castShadow = true; g.add(body);
    if (kind !== "van") {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, .62, 1.6), new THREE.MeshLambertMaterial({ color: 0x20262e }));
      cab.position.set(-.15, 1.35, 0); g.add(cab);
    }
    if (kind === "taxi") {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(.55, .2, .3), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
      sign.position.set(-.15, 1.78, 0); g.add(sign);
    }
    if (kind === "minibus") {
      const win = new THREE.Mesh(new THREE.BoxGeometry(4.0, .55, 1.94), new THREE.MeshLambertMaterial({ color: 0x18202a }));
      win.position.y = 1.55; g.add(win);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(.4, .28, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
      sign.position.set(2.2, 2.1, 0); g.add(sign);
    }
  }
  const isBus = kind === "bus", frontX = isBus ? 5.4 : (kind === "van" ? 2.2 : 1.86);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(.08, .14, .32), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
  hl.position.set(frontX, isBus ? 1.1 : .82, .55); g.add(hl);
  const hl2 = hl.clone(); hl2.position.z = -.55; g.add(hl2);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .3), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  tl.position.set(-frontX, isBus ? 1.1 : .85, .55); g.add(tl);
  const tl2 = tl.clone(); tl2.position.z = -.55; g.add(tl2);
  const wg = new THREE.CylinderGeometry(isBus ? .42 : .32, isBus ? .42 : .32, .26, 16); /* P8f:8→16邊 */; wg.rotateX(Math.PI / 2);
  const wm = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  const rows = isBus ? [3.6, -1.2, -3.4] : [.9, -.9];
  for (const wx of rows) for (const side of [1, -1]) {
    const w = new THREE.Mesh(wg, wm); w.position.set(wx, isBus ? .42 : .34, side * .92); g.add(w); wheels.push(w);
  }
  scene.add(g);
  return { g, wheels, x: 0, z: 0, heading: 0, v: 0, r: isBus ? 2.6 : 1.4 };
}
{
  const majors = ROADS.filter(r => r.w >= 12 && r.p.length >= 5);
  const kinds = ["bus", "taxi", "taxi", "car", "car", "car", "van", "minibus", "minibus"];
  for (let i = 0; i < kinds.length; i++) {
    const r = majors[randi(0, majors.length - 1)] || roadPts;
    const car = makeCar(kinds[i]);
    const step = Math.max(1, Math.floor(r.p.length / 4));
    car.route = r.p.filter((_, idx) => idx % step === 0);
    const st = car.route[randi(0, Math.max(0, car.route.length - 1))];
    car.x = st[0]; car.z = st[1]; car.wp = randi(0, Math.max(0, car.route.length - 1));
    car.speed = kinds[i] === "bus" ? 6 : rand(6.5, 9.5);
    traffic.push(car);
  }
}
function updateTraffic(dt) {
  for (const c of traffic) {
    const wp = c.route[c.wp];
    if (!wp) continue;
    const a = Math.atan2(wp[1] - c.z, wp[0] - c.x);
    c.heading = angLerp(c.heading, a, 1 - Math.pow(.002, dt));
    c.v = lerp(c.v, c.speed, dt * 2);
    let nx = c.x + Math.cos(c.heading) * c.v * dt, nz = c.z + Math.sin(c.heading) * c.v * dt;
    [nx, nz] = collide(nx, nz, c.r || 1.4); c.x = nx; c.z = nz;
    if (d2(c.x, c.z, wp[0], wp[1]) < 6) c.wp = (c.wp + 1) % c.route.length;
    c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.heading;
    c.wheels.forEach(w => w.rotation.x -= c.v * dt * 3);
    if (d2(c.x, c.z, player.x, player.z) < 2.2 && player.invuln <= 0 && !player.inTruck) {
      damage(28, "俾車撞到!過馬路要睇車!");
      const ang = Math.atan2(player.z - c.z, player.x - c.x);
      player.x += Math.cos(ang) * 3; player.z += Math.sin(ang) * 3;
    }
  }
}

/* ---------- 樓宇 (InstancedMesh × 3 高度桶 + 窗戶亮燈) ---------- */
const colliders = []; // {x,z,hw,hd,rot,minx,maxx,minz,maxz}
{
  function buildingTexPair(floors, cols, litRatio, wall) {
    const cW = document.createElement("canvas"); cW.width = cW.height = 256;
    const cL = document.createElement("canvas"); cL.width = cL.height = 256;
    const g1 = cW.getContext("2d"), g2 = cL.getContext("2d");
    g1.fillStyle = wall; g1.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g1.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g1.fillRect(randi(0, 256), randi(0, 256), 2, 2); }
    g2.fillStyle = "#000"; g2.fillRect(0, 0, 256, 256);
    const fh = 256 / floors, fw = 256 / cols;
    const warm = ["#e8f0ff", "#d8e4f8", "#cfe0ff", "#fff0d0", "#e4ecfa"];
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const wx = c * fw + fw * .2, wy = f * fh + fh * .24, ww = fw * .6, wh = fh * .48;
      g1.fillStyle = "#4a5866"; g1.fillRect(wx, wy, ww, wh); // 日間玻璃(反天空)
      g1.fillStyle = "rgba(255,255,255,.16)"; g1.fillRect(wx, wy, ww, wh * .3);
      if (Math.random() < litRatio) { g2.fillStyle = warm[randi(0, warm.length - 1)]; g2.fillRect(wx, wy, ww, wh); }
    }
    const mk = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    return { map: mk(cW), ems: mk(cL) };
  }
  const walls = ["#c9c0af", "#bfb8aa", "#d3cab8", "#b3ada0", "#c4b9a8", "#a8a49a", "#d8cfbe"];
  const buckets = [
    { maxH: 15, floors: 4, cols: 5, lit: .05 },
    { maxH: 40, floors: 10, cols: 6, lit: .08 },
    { maxH: 1e9, floors: 20, cols: 7, lit: .1 }
  ];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  for (const bk of buckets) {
    const list = BUILDINGS.filter(b => b[6] !== 1 && b[5] <= bk.maxH && b[5] > (bk === buckets[0] ? 0 : buckets[buckets.indexOf(bk) - 1].maxH));
    if (!list.length) continue;
    const { map, ems } = buildingTexPair(bk.floors, bk.cols, bk.lit, walls[randi(0, walls.length - 1)]);
    const mat = new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: ems, emissiveIntensity: .45 });
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((b, i) => {
      const [x, z, hw, hd, rot, h] = b;
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rot);
      S.set(hw * 2, h, hd * 2); P.set(x, h / 2, z);
      M.compose(P, Q, S); im.setMatrixAt(i, M);
    });
    im.castShadow = true; im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  }
  for (const b of BUILDINGS) {
    if (b[6] === 1) continue;
    const [x, z, hw, hd, rot] = b;
    const ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
    const ew = hw * ca + hd * sa, ed = hw * sa + hd * ca;
    colliders.push({ x, z, hw, hd, rot, minx: x - ew, maxx: x + ew, minz: z - ed, maxz: z + ed });
  }
}
/* 施工中樓宇:水泥框 + 綠網 + 塔吊感 */
const craneSpots = [];
{
  const netMat = new THREE.MeshLambertMaterial({ map: netTex, transparent: true, opacity: .88, side: THREE.DoubleSide });
  for (const b of BUILDINGS) {
    if (b[6] !== 1) continue;
    const [x, z, hw, hd, rot, h0] = b;
    const h = Math.min(h0, 14);
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, h, hd * 2), new THREE.MeshLambertMaterial({ color: 0xbcb6a8 }));
    core.position.y = h / 2; core.castShadow = true; core.receiveShadow = true; g.add(core);
    const net = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 * 1.06, h * 1.08, hd * 2 * 1.06), netMat);
    net.position.y = h / 2; g.add(net);
    for (let lv = 1; lv < h / 3.2; lv++) { // 棚架橫桿
      const edge = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 * 1.07, .12, hd * 2 * 1.07), new THREE.MeshLambertMaterial({ color: 0x7a6a3a }));
      edge.position.y = lv * 3.2; g.add(edge);
    }
    g.position.set(x, 0, z); g.rotation.y = -rot; scene.add(g);
    const ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
    const ew = hw * ca + hd * sa, ed = hw * sa + hd * ca;
    colliders.push({ x, z, hw, hd, rot, minx: x - ew, maxx: x + ew, minz: z - ed, maxz: z + ed });
  }
}

/* ---------- 霓虹招牌 ---------- */
{
  const signs = [["茶餐廳", "#ff5f8a"], ["雲吞麵", "#ffd23a"], ["五金", "#5fd0ff"], ["建材", "#7ef08a"], ["涼茶", "#ff9d3c"], ["麻雀耍樂", "#c88aff"], ["找換", "#ffe28a"], ["跌打", "#7affd2"]];
  for (const b of BUILDINGS) {
    if (b[6] === 1 || b[5] < 12) continue;
    if (Math.random() > .05) continue;
    const s = signs[randi(0, signs.length - 1)];
    const t = neonTex(s[0], s[1]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.8), new THREE.MeshBasicMaterial({ map: t, transparent: false, side: THREE.DoubleSide }));
    m.position.set(b[0] + Math.cos(-b[4]) * b[2] * (Math.random() < .5 ? 1.05 : -1.05), rand(5, b[5] * .75), b[1] + Math.sin(-b[4]) * b[2] * 1.05);
    m.rotation.y = -b[4] + Math.PI / 2;
    scene.add(m);
  }
}

/* ---------- 地標 ---------- */
const landmarkNames = ["MegaBox", "啟德體育園", "建造業零碳天地"];
const landmarkPos = { "MegaBox": [mega[0], mega[1]], "啟德體育園": [-1130, 790], "建造業零碳天地": [-1129, 321] };
const hospitalPill = POIS.find(p => p[2].includes("專科門診"));
if (hospitalPill) { landmarkNames.push("基督教聯合醫院"); landmarkPos["基督教聯合醫院"] = [hospitalPill[0], hospitalPill[1]]; }
{
  for (const nm of landmarkNames) {
    const p = textPill("📍 " + nm, "#ffe9a8", "rgba(14,12,22,.62)", "rgba(255,210,120,.35)");
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.tex, transparent: true, opacity: .92 }));
    sp.scale.set(13 * p.aspect, 13, 1); sp.position.set(landmarkPos[nm][0], 42, landmarkPos[nm][1]);
    scene.add(sp);
  }
}

/* ---------- 人物工廠(寫實PBR工人 · 香港人樣) — 程序化後備版 ---------- */
const SKIN_HK = [0xe8bd95, 0xdfb287, 0xf0c8a0, 0xd8a878];
function makeHumanProc(o) {
  // o: {vest:bool, helmet:'#ffd23a'|null, shirt, pants, boots, skin, clipboard, hatStrap, vestColor, vestLabel, hair}
  const g = new THREE.Group();
  const std = (c, r = .85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const skin = o.skin || SKIN_HK[randi(0, SKIN_HK.length - 1)];
  const skinMat = std(skin, .62);
  const hairMat = std(o.hair || 0x171310, .55);
  const legMat = std(o.pants || 0x2a3a6a, .92), bootMat = std(o.boots || 0x5a3a22, .68);
  const shirtMat = std(o.shirt || 0x3d4a66, .9);

  /* 腿:髖樞紐 + 大腿 + 膝關節(護膝墊) + 小腿 + 綁帶安全鞋 */
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .102, .97, 0);
    const hip = new THREE.Mesh(new THREE.SphereGeometry(.082, 10, 8), legMat); hip.position.y = -.02; lg.add(hip);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.082, .06, .46, 10), legMat); thigh.position.y = -.23; thigh.castShadow = true; lg.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -.46; lg.add(knee);
    const kp = new THREE.Mesh(new THREE.BoxGeometry(.115, .12, .11), std(0x1d2a4e, .95)); kp.position.set(0, -.05, .012); knee.add(kp); // 護膝墊
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(.058, .04, .38, 10), legMat); calf.position.y = -.19; calf.castShadow = true; knee.add(calf);
    const calfM = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), legMat); calfM.scale.set(.9, 1.55, 1); calfM.position.set(0, -.14, -.018); knee.add(calfM);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.1, .13, .25), bootMat); bt.position.set(0, -.435, .05); bt.castShadow = true; knee.add(bt);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(.098, .055, .1), bootMat); toe.position.set(0, -.4625, .165); knee.add(toe);
    const lace = new THREE.Mesh(new THREE.BoxGeometry(.05, .1, .012), std(0x241a10, .9)); lace.position.set(0, -.4, .13); lace.rotation.x = -.15; knee.add(lace); // 鞋帶
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);

  /* 褲腰 + 皮帶 */
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.3, .13, .23), legMat); pelvis.position.y = 1.03; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.315, .05, .24), std(0x241a10, .8)); belt.position.y = 1.095; g.add(belt);

  /* 上身組(Polo 底衫 + 反光衣) */
  const upper = new THREE.Group(); upper.position.y = 1.12; g.add(upper);
  const abs = new THREE.Mesh(new THREE.BoxGeometry(.31, .16, .22), shirtMat); abs.position.y = .09; abs.castShadow = true; upper.add(abs);
  let chest;
  if (o.vest) {
    const vc = o.vestColor || "#ff7a1a";
    const front = new THREE.MeshStandardMaterial({ map: vestTex(false, vc, o.vestLabel), roughness: .8 });
    const back = new THREE.MeshStandardMaterial({ map: vestTex(true, vc, o.vestLabel), roughness: .8 });
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(vc).getHex(), roughness: .8 });
    chest = new THREE.Mesh(new THREE.BoxGeometry(.45, .28, .3), [side, side, side, side, front, back]);
  } else {
    chest = new THREE.Mesh(new THREE.BoxGeometry(.43, .28, .28), shirtMat);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.055, .012, 6, 12), shirtMat); collar.position.y = .485; collar.rotation.x = Math.PI / 2; upper.add(collar);
  }
  chest.position.y = .33; chest.castShadow = true; upper.add(chest);

  /* 手臂:恤衫短袖至肘 + 皮膚前臂 + 手掌 */
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .25, .38, 0); upper.add(ag);
    const del = new THREE.Mesh(new THREE.SphereGeometry(.072, 10, 8), shirtMat); del.position.y = .01; ag.add(del);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.055, .048, .17, 10), shirtMat); ua.position.y = -.095; ua.castShadow = true; ag.add(ua);
    const el = new THREE.Group(); el.position.y = -.19; ag.add(el);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.045, .036, .26, 10), skinMat); fa.position.y = -.13; fa.castShadow = true; el.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), skinMat); hand.scale.set(.8, 1.35, .62); hand.position.y = -.295; el.add(hand);
    if (o.clipboard && sx > 0) {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(.22, .3, .025), std(0xd8c8a0, .85)); cb.position.set(-.08, -.2, .1); cb.rotation.x = .3; el.add(cb);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, .03), std(0x888888, .4, .6)); clip.position.set(-.08, -.06, .11); el.add(clip);
    }
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);

  /* 頸 + 香港人樣頭(黑髮兩鬢 · 窄杏仁深色目 · 扁鼻樑) */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.048, .056, .12, 10), skinMat); neck.position.y = .5; upper.add(neck);
  const head = new THREE.Group(); head.position.y = .64; upper.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.098, 16, 14), skinMat); skull.scale.set(.96, 1.05, 1); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.125, .065, .115), skinMat); jaw.position.set(0, -.072, .012); head.add(jaw);
  const backHair = new THREE.Mesh(new THREE.SphereGeometry(.101, 14, 12, 0, Math.PI * 2, 0, Math.PI * .62), hairMat); // 後腦勺頭髮(戴帽都露)
  backHair.rotation.x = -.6; backHair.position.set(0, .01, -.008); head.add(backHair);
  const sbG = new THREE.BoxGeometry(.014, .05, .03);
  const sbL = new THREE.Mesh(sbG, hairMat); sbL.position.set(-.083, .005, .028); head.add(sbL); // 鬢角
  const sbR = new THREE.Mesh(sbG, hairMat); sbR.position.set(.083, .005, .028); head.add(sbR);
  const eyeMat = std(0x1e150e, .25), eyeG = new THREE.SphereGeometry(.016, 8, 6);
  const eyeL = new THREE.Mesh(eyeG, eyeMat); eyeL.scale.set(1.3, .72, .6); eyeL.position.set(-.034, .018, .082); head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeG, eyeMat); eyeR.scale.set(1.3, .72, .6); eyeR.position.set(.034, .018, .082); head.add(eyeR);
  const lidG = new THREE.BoxGeometry(.042, .008, .012);
  const lidL = new THREE.Mesh(lidG, hairMat); lidL.position.set(-.034, .033, .085); head.add(lidL); // 眼瞼線
  const lidR = new THREE.Mesh(lidG, hairMat); lidR.position.set(.034, .033, .085); head.add(lidR);
  const browG = new THREE.BoxGeometry(.038, .011, .012);
  const browL = new THREE.Mesh(browG, hairMat); browL.position.set(-.035, .049, .084); head.add(browL); // 直眉
  const browR = new THREE.Mesh(browG, hairMat); browR.position.set(.035, .049, .084); head.add(browR);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.014, .038, 6), skinMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.016, .096); head.add(nose);
  const earG2 = new THREE.SphereGeometry(.018, 6, 5);
  const earL = new THREE.Mesh(earG2, skinMat); earL.position.set(-.092, 0, 0); head.add(earL);
  const earR = new THREE.Mesh(earG2, skinMat); earR.position.set(.092, 0, 0); head.add(earR);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.034, .007, .008), std(0x9a6a58, .6)); mouth.position.set(0, -.062, .09); head.add(mouth);

  /* 安全帽(光面+前標籤) / 行人便裝髮型 */
  const hc = new THREE.Color(o.helmet || 0xffd23a);
  if (o.helmet !== null) {
    const hm = std(hc.getHex(), .3);
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(.1, .106, .075, 16), hm); helmet.position.y = .062; helmet.castShadow = true; head.add(helmet);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(hc.clone().multiplyScalar(1.06).getHex(), .28)); dome.position.y = .066; dome.castShadow = true; head.add(dome);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(.028, .04, .185), std(hc.clone().multiplyScalar(.9).getHex(), .35)); ridge.position.y = .118; head.add(ridge);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.138, .144, .022, 16), hm); brim.position.y = .026; head.add(brim);
    const label = new THREE.Mesh(new THREE.BoxGeometry(.05, .026, .008), std(0xf2f2ee, .5)); label.position.set(0, .068, .103); head.add(label);
    if (o.hatStrap !== false) { // 帽帶(下巴扣帶)
      const strap = new THREE.Mesh(new THREE.TorusGeometry(.09, .008, 6, 12, Math.PI * .9), std(0x222222, .8)); strap.position.y = -.035; strap.rotation.y = Math.PI / 2; strap.rotation.z = Math.PI + .12; head.add(strap);
    }
  } else {
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(.104, 14, 12, 0, Math.PI * 2, 0, Math.PI * .58), hairMat); hairTop.position.y = .008; hairTop.castShadow = true; head.add(hairTop);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(.13, .016, .014), hairMat); fringe.position.set(0, .052, .088); head.add(fringe); // 劉海
  }

  const r = { g, lLeg: L.lg, rLeg: R.lg, lArm: La.ag, rArm: Ra.ag, torso: chest, head, upper, phase: Math.random() * 6, walk: 0 };
  r.animate = (dt, speed, lean = 0) => {
    r.phase += dt * (2.2 + speed * 2.4);
    const amp = clamp(speed / 3.4, 0, 1) * .68 + (speed > .2 ? .1 : 0);
    const s = Math.sin(r.phase);
    L.lg.rotation.x = s * amp; R.lg.rotation.x = -s * amp;
    L.knee.rotation.x = Math.max(0, Math.sin(r.phase - .7)) * amp * 1.05; // 膝蓋只可以向後彎(擺動腿)
    R.knee.rotation.x = Math.max(0, Math.sin(r.phase - .7 + Math.PI)) * amp * 1.05;
    La.ag.rotation.x = -s * amp * .85; Ra.ag.rotation.x = s * amp * .85;
    La.ag.rotation.z = -.08; Ra.ag.rotation.z = .08;
    const elB = .25 + amp * .4; // 手肘自然彎曲
    La.el.rotation.x = -elB + s * amp * .3; Ra.el.rotation.x = -elB - s * amp * .3;
    g.position.y = Math.abs(Math.cos(r.phase)) * clamp(speed / 3, 0, 1) * .05;
    upper.rotation.x = lean * .6;
    upper.rotation.y = s * amp * .07; // 行路時上身自然扭動
  };
  return r;
}

/* ---------- 人物工廠(GLB真模型版 — 實測歸一化 + PPE骨骼挂接) ---------- */
function makeHumanGLB(o) {
  const tpl = WORKER_MODELS.male;
  const model = skeletonClone(tpl.scene);
  /* P0根因修復:唔可以硬編高度 — 模型內部root節點自帶scale,
     必須用渲染實測(box量matrixWorld)歸一化,並用外層g隔離(動畫唔寫root scale,已驗證) */
  model.traverse(m => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  const g = new THREE.Group(); g.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const hRaw = Math.max(.01, box.max.y - box.min.y);
  model.scale.setScalar(1.78 / hRaw);
  model.position.y = -box.min.y * model.scale.x; // 腳底貼地
  g.updateMatrixWorld(true);
  // 衣服tint:軍綠→工裝藍灰(工人)/便裝色(行人)
  const clothTint = o.helmet === null ? (o.shirt || 0x5a6a7a) : (o.vestColor ? new THREE.Color(o.vestColor).getHex() : 0x46525e);
  if (clothTint !== undefined) model.traverse(m => {
    if (m.isMesh && m.material && m.material.name && /vanguard|body|cloth|soldier/i.test(m.material.name)) {
      m.material = m.material.clone();
      m.material.color = new THREE.Color(clothTint);
    }
  });
  /* PPE:米制幾何,以g(米制空間)擺位 → bone.attach轉骨骼local(跟骨骼郁) */
  if (o.vest) {
    const vc = o.vestColor || "#ff7a1a";
    const front = new THREE.MeshStandardMaterial({ map: vestTex(false, vc, o.vestLabel), roughness: .8 });
    const back = new THREE.MeshStandardMaterial({ map: vestTex(true, vc, o.vestLabel), roughness: .8 });
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(vc).getHex(), roughness: .8 });
    const vest = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(.42, .56, .27), [side, side, side, side, front, back]);
    bodyM.castShadow = true; vest.add(bodyM);
    const strapM = new THREE.MeshStandardMaterial({ color: new THREE.Color(vc).getHex(), roughness: .8 });
    for (const sx of [-.13, .13]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(.07, .02, .24), strapM);
      st.position.set(sx, .3, 0); st.rotation.x = -.12; vest.add(st);
    }
    vest.position.set(0, 1.24, 0); g.add(vest); g.updateMatrixWorld(true);
    const spine = (() => { let f = null; model.traverse(b => { if (b.isBone && /spine1|spine/i.test(b.name) && !f) f = b; }); return f; })();
    if (spine) spine.attach(vest);
  }
  if (o.helmet !== null && o.helmet !== undefined) {
    const hc = new THREE.Color(o.helmet || 0xffd23a);
    const hm = new THREE.MeshStandardMaterial({ color: hc.getHex(), roughness: .3 });
    const helmet = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); dome.castShadow = true; helmet.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.15, .155, .02, 16), hm); brim.position.y = .004; helmet.add(brim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(.03, .05, .22), new THREE.MeshStandardMaterial({ color: hc.clone().multiplyScalar(.85).getHex(), roughness: .35 })); ridge.position.y = .1; helmet.add(ridge);
    helmet.position.set(0, 1.64, 0); g.add(helmet); g.updateMatrixWorld(true);
    const head = (() => { let f = null; model.traverse(b => { if (b.isBone && /head$/i.test(b.name) && !f) f = b; }); return f; })();
    if (head) head.attach(helmet);
  }
  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  for (const clip of tpl.animations) {
    const n = clip.name.split("|").pop();
    if (!acts[n]) acts[n] = mixer.clipAction(clip);
  }
  const pick = (...names) => { for (const n of names) if (acts[n]) return acts[n]; return Object.values(acts)[0]; };
  const aIdle = pick("Idle"), aWalk = pick("Walk"), aRun = pick("Run");
  let cur = null;
  const setAnim = a => { if (a && a !== cur) { a.reset().fadeIn(.22).play(); if (cur) cur.fadeOut(.22); cur = a; } };
  setAnim(aIdle);
  const r = { g, mixer, phase: Math.random() * 6, walk: 0 };
  r.animate = (dt, speed, lean = 0) => {
    mixer.update(dt);
    if (speed > 4.2) { setAnim(aRun); if (cur) cur.timeScale = clamp(speed / 4.2, .75, 1.4); }
    else if (speed > .25) { setAnim(aWalk); if (cur) cur.timeScale = clamp(speed / 1.5, .6, 2); }
    else { setAnim(aIdle); if (cur) cur.timeScale = 1; }
  };
  return r;
}
function makeHuman(o) {
  if (o.helmet === null) return makeHumanProc(o);
  /* 全員worker-rig(用戶指示:其他人物都要改) — 失敗先退Soldier/程序化 */
  if (typeof MIXAMO_WORKER !== "undefined" && MIXAMO_WORKER) {
    try { const r = makeHumanMixamo(o); window.__rigLog = (window.__rigLog||[]).concat(['worker-rig']); return r; }
    catch (e) { window.__rigLog = (window.__rigLog||[]).concat(['worker-rig-fail: ' + (e.message||e)]); console.warn("worker-rig失敗,退回:", e); }
  }
  if (typeof WORKER_MODELS !== "undefined" && WORKER_MODELS && (o.vest || o.helmet !== null)) {
    try { return makeHumanGLB(o); } catch (e) { console.warn("GLB角色失敗,退回程序化:", e); }
  }
  return makeHumanProc(o);
}

/* ---------- 人物工廠(Mixamo工人 — 玩家專用:骨骼分區上色+Idle/Walk/Run) ---------- */
function makeHumanMixamo(o) {
  /* 帽色階級(本項目設定):管理人白帽(安全主任/督導/PM/地盤經理),其他黃帽;藍=機手,紅=管工 */
  const helmet = o.helmet;
  const isWhite = [0xf4f4f4,0xf8f8f8,0xf0f0f0,0xd03030,0xd04040,0x2a9a4a].includes(helmet);
  return createWorker(MIXAMO_WORKER.obj, {
    hatColor: isWhite ? 0xf4f4f4 : 0xf5c522,
    photo: !!o.useMixamo, female: o.sex === "F",
    vest: isWhite ? "#dce0e6" : "#ed6810", shirt: o.sex === "F" ? "#737f8b" : "#687078"
  });
}
const worldLabels = [];
function makeSpriteLabel(text, color = "#fff", size = 8) {
  const p = textPill(text, color, "rgba(16,12,28,.75)", "#55486e", 700);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.tex, transparent: true }));
  sp.userData.labelSize = size; sp.userData.labelAspect = p.aspect; worldLabels.push(sp);
  sp.scale.set(size * p.aspect, size, 1); return sp;
}

/* ---------- 地盤道具 ---------- */
const hazards = [];   // {type:'crane'|'pit'|'rev'|'excav', ...} 危險源
const interactables = []; // {pos,r,label,action,active,mesh}
const waterBBoxes = WATERS.filter(w => w.length >= 3).map(w => {
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (const p of w) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
  return { pts: w, minx, maxx, minz, maxz };
});

/* 圍板(P1 重做):沿整個 perimeter 連續生成,每條 edge 精確鋪滿(角落收口),
   只喺 openings 實際闊度內留口;數據同 collide()/門禁共用。 */
function buildHoarding(zone, openings) {
  const pts = zone.pts;
  const geo = new THREE.BoxGeometry(2.45, 2.3, .12);
  const mat = new THREE.MeshLambertMaterial({ color: 0x2a7a4a });
  const panels = [];
  const PW = 2.45;
  // P8b:立柱喺每塊板介面(角落/尾板收口)+壓頂+基座,同板共用 opening 數據
  const posts = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < .1) continue;
    const n = Math.max(1, Math.round(L / PW));
    const spacing = L / n; // 精確鋪滿成條邊,角落冇罅
    const ops = openings.list.filter(o => o.edge === i);
    for (let j = 0; j < n; j++) {
      const t = (j + .5) * spacing;
      if (ops.some(o => t + PW / 2 > o.t0 && t - PW / 2 < o.t1)) continue; // 只跳開口範圍內嘅板
      const k = t / L;
      panels.push([lerp(ax, bx, k), lerp(az, bz, k), Math.atan2(bz - az, bx - ax)]);
    }
    // 柱:每塊板邊界一枝(開口邊界由兩端第一塊板夾住)
    for (let j = 0; j <= n; j++) {
      const t = j * spacing;
      if (ops.some(o => t + .4 > o.t0 && t - .4 < o.t1)) continue;
      const k = t / L;
      posts.push([lerp(ax, bx, k), lerp(az, bz, k), Math.atan2(bz - az, bx - ax)]);
    }
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const im = new THREE.InstancedMesh(geo, mat, panels.length);
  panels.forEach((p, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p[2]);
    P.set(p[0], 1.15, p[1]); M.compose(P, Q, S); im.setMatrixAt(i, M);
  });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
  /* P10.2:雨痕變化 — 約1/8板用深色共享材質(修補/污漬 variation),唔逐板開新材質 */
  const fixMat = new THREE.MeshLambertMaterial({ color: 0x23623e });
  const fixIdx = panels.map((_, i) => i).filter(i => i % 7 === 3);
  const fixIM = new THREE.InstancedMesh(geo, fixMat, fixIdx.length);
  fixIdx.forEach((pi, k) => {
    const p = panels[pi];
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p[2]);
    P.set(p[0], 1.15, p[1]); M.compose(P, Q, S); fixIM.setMatrixAt(k, M);
  });
  scene.add(fixIM);
  // P8b:立柱(深色金屬)+壓頂(同板數)+基座
  const postIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, 2.55, .16), new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: .5, metalness: .6 }), posts.length);
  posts.forEach((p, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p[2]);
    P.set(p[0], 1.28, p[1]); M.compose(P, Q, S); postIM.setMatrixAt(i, M);
  });
  postIM.castShadow = true; scene.add(postIM);
  const capIM = new THREE.InstancedMesh(new THREE.BoxGeometry(2.45, .1, .2), new THREE.MeshLambertMaterial({ color: 0x1e5a3a }), panels.length);
  panels.forEach((p, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p[2]);
    P.set(p[0], 2.36, p[1]); M.compose(P, Q, S); capIM.setMatrixAt(i, M);
  });
  scene.add(capIM);
  const baseIM = new THREE.InstancedMesh(new THREE.BoxGeometry(2.45, .22, .18), new THREE.MeshLambertMaterial({ color: 0x4a4640 }), panels.length);
  panels.forEach((p, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p[2]);
    P.set(p[0], .11, p[1]); M.compose(P, Q, S); baseIM.setMatrixAt(i, M);
  });
  scene.add(baseIM);
  return { panels };
}
buildHoarding(MAIN_SITE, MAIN_OPENINGS);
buildHoarding(SITE2, SITE2_OPENINGS);

/* 水馬(可以撞跌)— P10.1 重造:真實梯形水馬輪廓(上窄下闊)+白反光帶+凹手位 */
const barrier = { mesh: null, state: [], anim: [] };
{
  const spots = [];
  const addRow = (x, z, dir, n) => { for (let i = 0; i < n; i++) spots.push([x + Math.cos(dir) * i * 1.9, z + Math.sin(dir) * i * 1.9, dir + Math.PI / 2]); };
  addRow(GATE[0] - Math.cos(GATE_DIR_IN) * 3.5, GATE[1] - Math.sin(GATE_DIR_IN) * 3.5, GATE_DIR_IN + Math.PI / 2, 4);
  addRow(GATE[0] - Math.cos(GATE_DIR_IN) * 3.5 - Math.cos(GATE_DIR_IN + Math.PI / 2) * 7.6, GATE[1] - Math.sin(GATE_DIR_IN) * 3.5 - Math.sin(GATE_DIR_IN + Math.PI / 2) * 7.6, GATE_DIR_IN + Math.PI / 2, 4);
  const rp = nearestRoadPt(MAIN_SITE.c[0], MAIN_SITE.c[1]);
  if (rp) addRow(rp[0], rp[1], 0.4, 5);
  /* 梯形輪廓:P10.1 改 InstancedMesh(3 個 instanced 部件,共用 state)— clone group 27×3 mesh 令 draw call 惡化 */
  const bodyM = new THREE.MeshLambertMaterial({ color: 0xff8c1a });
  const bandM = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
  const N = spots.length;
  const mkIM = (w, h, d, mat, y) => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), mat, N);
    im.castShadow = true; scene.add(im); return im;
  };
  barrier.ims = [
    { im: mkIM(1.72, .55, .55, bodyM, .275), ly: .275 },
    { im: mkIM(1.5, .55, .35, bodyM, .825), ly: .825 },
    { im: mkIM(1.56, .18, .42, bandM, .82), ly: .82 }
  ];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  barrier.state = spots.map(s => ({ x: s[0], z: s[1], rot: s[2], vx: 0, vz: 0, spin: 0, y: .55, fly: false }));
  barrier.ims.forEach(({ im, ly }) => barrier.state.forEach((s, i) => {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -s.rot);
    P.set(s.x, ly, s.z); M.compose(P, Q, S); im.setMatrixAt(i, M);
  }));
}
function updateBarriers(dt) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  let dirty = false;
  for (let i = 0; i < barrier.state.length; i++) {
    const b = barrier.state[i];
    if (!b.fly) continue;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += 2.2 * dt; b.vz -= 9.8 * dt * .35; b.rot += b.spin * dt;
    if (b.y <= .55) { b.y = .55; b.fly = false; }
    barrier.ims.forEach(({ im, ly }) => {
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -b.rot);
      P.set(b.x, ly + (b.y - .55), b.z); M.compose(P, Q, S); im.setMatrixAt(i, M);
    });
    dirty = true;
  }
  if (dirty) barrier.ims.forEach(({ im }) => im.instanceMatrix.needsUpdate = true);
}

/* 貨櫃(寫字樓/儲物) */
function makeContainer(x, z, rotY, color, label) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6.1, 2.6, 2.44), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 1.3; body.castShadow = true; body.receiveShadow = true; g.add(body);
  /* P10.1:瓦楞肋(側面凹槽)+角柱+門縫 — 共享材質,唔再用無 rib 嘅實心盒 */
  const darker = new THREE.Color(color).multiplyScalar(.82);
  const ribM = new THREE.MeshLambertMaterial({ color: darker });
  const sideOfs = 1.23;
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.55, .05), ribM);
    r.position.set(-2.75 + i * .69, 1.3, s * sideOfs); g.add(r);
  }
  for (const [cx, cz] of [[-2.95, -1.15], [-2.95, 1.15], [2.95, -1.15], [2.95, 1.15]]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.66, .18), ribM);
    corner.position.set(cx, 1.33, cz); g.add(corner);
  }
  const seam = new THREE.Mesh(new THREE.BoxGeometry(.02, 2.5, .04), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  seam.position.set(0, 1.3, sideOfs + .02); g.add(seam);
  /* P10.1-A:門絞位×4+頂角鑄件(共享材質)— 遠睇都有 container 感 */
  const hingeM = new THREE.MeshLambertMaterial({ color: 0x3a3d42 });
  for (const s of [-1, 1]) for (const hy of [.4, 2.2]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(.06, .16, .1), hingeM);
    hinge.position.set(-2.95, hy, s * .7); g.add(hinge);
  }
  for (const [cx, cy] of [[-2.95, 2.55], [2.95, 2.55]]) {
    const cast = new THREE.Mesh(new THREE.BoxGeometry(.22, .12, .22), hingeM);
    cast.position.set(cx, cy, 0); g.add(cast);
  }
  if (label) {
    const p = textPill(label, "#ffffff", "rgba(28,60,120,.88)", "rgba(255,255,255,.5)");
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.tex, transparent: true }));
    sp.scale.set(2.6 * p.aspect, 2.6, 1); sp.position.set(0, 1.5, 1.35); g.add(sp);
    sp.userData.labelSize = 2.6; sp.userData.labelAspect = p.aspect; worldLabels.push(sp);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  const ca = Math.abs(Math.cos(rotY)), sa = Math.abs(Math.sin(rotY));
  const hw = 3.05 * ca + 1.22 * sa, hd = 3.05 * sa + 1.22 * ca;
  colliders.push({ x, z, hw, hd, rot: rotY, minx: x - hw, maxx: x + hw, minz: z - hd, maxz: z + hd });
  return g;
}
makeContainer(OFFICE[0], OFFICE[1], GATE_DIR_IN + Math.PI / 2, 0x2a6ad0, "地盤寫字樓");
makeContainer(OFFICE[0] + Math.cos(GATE_DIR_IN + 1.2) * 9, OFFICE[1] + Math.sin(GATE_DIR_IN + 1.2) * 9, rand(0, 6), 0xb03a2a, "香港建築");
makeContainer(MAIN_SITE.c[0] + 12, MAIN_SITE.c[1] - 8, rand(0, 6), 0xc8c8c8, null);
makeContainer(SITE2.c[0], SITE2.c[1], rand(0, 6), 0x2a8a5a, "物料倉");

/* 鋼筋/水泥/磚 */
{
  const rebarGeo = new THREE.CylinderGeometry(.09, .09, 6, 6);
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
  const cementGeo = new THREE.BoxGeometry(.9, .28, .6);
  const cementMat = new THREE.MeshLambertMaterial({ color: 0xd8d2c2 });
  const rebars = [], cements = [];
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), r = rand(8, Math.min(MAIN_SITE.area > 8000 ? 32 : 18, 34));
    rebars.push([MAIN_SITE.c[0] + Math.cos(a) * r, MAIN_SITE.c[1] + Math.sin(a) * r, rand(0, Math.PI)]);
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2), r = rand(6, 22);
    cements.push([MAIN_SITE.c[0] + Math.cos(a) * r, MAIN_SITE.c[1] + Math.sin(a) * r]);
  }
  const im1 = new THREE.InstancedMesh(rebarGeo, rebarMat, rebars.length * 7);
  const im2 = new THREE.InstancedMesh(cementGeo, cementMat, cements.length * 6);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  let n = 0;
  for (const rb of rebars) for (let k = 0; k < 7; k++) {
    Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rb[2]); S.set(1, 1, 1);
    P.set(rb[0] + Math.cos(rb[2] + Math.PI / 2) * (k - 3) * .22, .25, rb[1] + Math.sin(rb[2] + Math.PI / 2) * (k - 3) * .22);
    M.compose(P, Q, S); im1.setMatrixAt(n++, M);
  }
  n = 0;
  for (const cm of cements) for (let k = 0; k < 6; k++) {
    Q.identity(); S.set(1, 1, 1);
    P.set(cm[0] + (k % 3) * .95 - .95, .14 + Math.floor(k / 3) * .29, cm[1]); M.compose(P, Q, S);
    im2.setMatrixAt(n++, M);
  }
  im1.castShadow = im2.castShadow = true; scene.add(im1); scene.add(im2);
}

/* 天秤(塔式起重機)— 勞工處:吊運意外 */
const cranes = [];
function makeCrane(x, z, jibLen) {
  const g = new THREE.Group();
  const H = 82; // 加高(用戶建議:服務高層施工要再高)
  const steel = new THREE.MeshLambertMaterial({ color: 0xffa020 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 5), new THREE.MeshLambertMaterial({ color: 0x8a8a90 })); base.position.y = .6; base.castShadow = true; g.add(base); // 混凝土基座
  const mast = new THREE.Mesh(new THREE.BoxGeometry(1.4, H, 1.4), steel); mast.position.y = H / 2; mast.castShadow = true; g.add(mast);
  for (let h = 2; h < H; h += 5) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.9, .12, 1.9), steel); tie.position.y = h; g.add(tie);
  }
  const top = new THREE.Group(); top.position.y = H; g.add(top);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, .9, .8), steel); jib.position.x = jibLen / 2; jib.castShadow = true; top.add(jib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 1.1, 1.1), steel); counter.position.x = -3.5; top.add(counter);
  const cwt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 2.2), new THREE.MeshLambertMaterial({ color: 0x888888 })); cwt.position.set(-6.2, -1.2, 0); top.add(cwt);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 1.6), new THREE.MeshLambertMaterial({ color: 0x3a6ad0 })); cab.position.set(.8, -1.1, 0); top.add(cab);
  const trolley = new THREE.Group(); top.add(trolley);
  const cableMat = new THREE.LineBasicMaterial({ color: 0x333333 });
  const hook = new THREE.Group();
  const load = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), new THREE.MeshLambertMaterial({ color: 0x9a9488 }));
  load.castShadow = true; hook.add(load);
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -6, 0)]), cableMat);
  hook.add(cable); trolley.add(hook);
  const apex = new THREE.Mesh(new THREE.ConeGeometry(.8, 5, 6), steel); apex.position.y = 3; top.add(apex);
  g.position.set(x, 0, z); scene.add(g);
  const cr = { g, top, trolley, hook, load, jibLen, x, z, baseRot: rand(0, 6), swing: rand(0, 6), phase: rand(0, 6) };
  cranes.push(cr);
  hazards.push({ type: "crane", cr });
  return cr;
}
const mainCrane = makeCrane(MAIN_SITE.c[0] - 10, MAIN_SITE.c[1] + 6, Math.max(24, Math.min(34, Math.sqrt(MAIN_SITE.area) * .8)));
if (SITE2) makeCrane(SITE2.c[0] + 8, SITE2.c[1] - 5, 26);
/* 天秤只可以喺地盤(landuse=construction)入面 — 其餘大zone各一支 */
for (const zn of zonesSorted.slice(2, 6)) {
  if (zn.area < 6000) continue;
  const a = rand(0, Math.PI * 2);
  // 用戶建議:天秤要深入地盤範圍(貼近centroid),唔好插喺路邊
  makeCrane(zn.c[0] + Math.cos(a) * Math.min(11, Math.sqrt(zn.area) * .22), zn.c[1] + Math.sin(a) * Math.min(11, Math.sqrt(zn.area) * .22), Math.max(20, Math.min(28, Math.sqrt(zn.area) * .6)));
}

/* 挖掘機 + 泥坑 — 勞工處:機械卷夾/塌坑 */
const excavators = [];
function makeExcavator(x, z, rotY) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 2.2), new THREE.MeshLambertMaterial({ color: 0xffb020 }));
  body.position.y = 1.15; body.castShadow = true; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a5a3a })); cab.position.set(.8, 2.2, .3); g.add(cab);
  const under = new THREE.Mesh(new THREE.BoxGeometry(3, .7, 2.4), new THREE.MeshLambertMaterial({ color: 0x333333 })); under.position.y = .4; g.add(under);
  const armPivot = new THREE.Group(); armPivot.position.set(-1.2, 1.6, 0); g.add(armPivot);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(2.8, .5, .5), new THREE.MeshLambertMaterial({ color: 0xffb020 }));
  boom.position.x = -1.4; boom.castShadow = true; armPivot.add(boom);
  const stick = new THREE.Group(); stick.position.x = -2.8; armPivot.add(stick);
  const st = new THREE.Mesh(new THREE.BoxGeometry(1.8, .4, .4), new THREE.MeshLambertMaterial({ color: 0xe09a10 })); st.position.x = -.9; stick.add(st);
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(.7, .6, .7), new THREE.MeshLambertMaterial({ color: 0x666666 })); bucket.position.x = -1.9; stick.add(bucket);
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  const ex = { g, armPivot, stick, phase: rand(0, 6), x, z };
  excavators.push(ex);
  hazards.push({ type: "excav", ex });
  return ex;
}
const PIT = { x: MAIN_SITE.c[0] + 16, z: MAIN_SITE.c[1] + 12, hw: 5, hd: 3.5, rot: .4 };
{
  const pitMesh = new THREE.Mesh(new THREE.PlaneGeometry(PIT.hw * 2, PIT.hd * 2), new THREE.MeshBasicMaterial({ color: 0x120e0a }));
  pitMesh.rotation.x = -Math.PI / 2; pitMesh.rotation.z = PIT.rot; pitMesh.position.set(PIT.x, .11, PIT.z); scene.add(pitMesh);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(PIT.hw * 2 + .6, PIT.hd * 2 + .6), new THREE.MeshBasicMaterial({ color: 0xff8c1a }));
  edge.rotation.x = -Math.PI / 2; edge.rotation.z = PIT.rot; edge.position.set(PIT.x, .105, PIT.z); scene.add(edge);
  hazards.push({ type: "pit" });
}
makeExcavator(PIT.x + 7, PIT.z + 4, PIT.rot + Math.PI / 2);
if (SITE2) makeExcavator(SITE2.c[0] - 6, SITE2.c[1] + 6, rand(0, 6));

/* ---------- 地盤化:主力大樓骨架 + 竹棚綠網 + 橫額 + 板道 + 泛光燈 + 物料場 ---------- */
function makeBannerTex(text, bg = "#c02525", fg = "#ffffff") {
  return canvasTex(512, 128, g => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
    g.fillStyle = fg; g.font = "900 52px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 256, 66, 470);
  });
}
{
  const cx = MAIN_SITE.c[0] + 8, cz = MAIN_SITE.c[1] - 6;
  const cellW = 6, cellD = 6, wC = 5, dC = 3, floors = 7, floorH = 3.5;
  const W = wC * cellW, D = dC * cellD, H = floors * floorH;
  const concrete = new THREE.MeshLambertMaterial({ color: 0xb8b2a4 });
  /* 柱陣 */
  const colPts = [];
  for (let f = 0; f < floors; f++) for (let i = 0; i <= wC; i++) for (let k = 0; k <= dC; k++)
    colPts.push([cx - W / 2 + i * cellW, f * floorH + floorH / 2, cz - D / 2 + k * cellD]);
  const colIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.55, floorH, .55), concrete, colPts.length);
  {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
    colPts.forEach((p, i) => { P.set(p[0], p[1], p[2]); M.compose(P, Q, S); colIM.setMatrixAt(i, M); });
  }
  colIM.castShadow = true; scene.add(colIM);
  /* 樓板(頂層留半邊做「施工中」) */
  for (let f = 1; f <= floors; f++) {
    const w = (f === floors) ? W * .55 : W + 1;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, .3, D + 1), concrete);
    slab.position.set(cx - W / 2 + w / 2, f * floorH - .15, cz);
    slab.castShadow = true; slab.receiveShadow = true; scene.add(slab);
  }
  /* 核心筒 */
  const core = new THREE.Mesh(new THREE.BoxGeometry(4.5, H, 3.5), new THREE.MeshLambertMaterial({ color: 0xa8a294 }));
  core.position.set(cx - W / 2 + 2.8, H / 2, cz - D / 2 + 2.2); core.castShadow = true; scene.add(core);
  colliders.push({ x: core.position.x, z: core.position.z, hw: 2.3, hd: 1.8, rot: 0, minx: core.position.x - 2.3, maxx: core.position.x + 2.3, minz: core.position.z - 1.8, maxz: core.position.z + 1.8 });
  /* 頂樓鋼筋叢 */
  {
    const n = 40;
    const rbIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, 1.6, 4), new THREE.MeshLambertMaterial({ color: 0x7a6a4a }), n);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      P.set(cx - W / 2 + rand(0, W * .6), H + .5, cz - D / 2 + rand(0, D));
      Q.setFromEuler(E.set(rand(-.25, .25), 0, rand(-.25, .25)));
      M.compose(P, Q, S); rbIM.setMatrixAt(i, M);
    }
    scene.add(rbIM);
  }
  /* 竹棚(四邊) + 綠網 */
  {
    const poles = [];
    for (let x = -W / 2; x <= W / 2 + .1; x += 2.5) { poles.push([cx + x, H / 2, cz - D / 2 - .8, 0]); poles.push([cx + x, H / 2, cz + D / 2 + .8, 0]); }
    for (let z = -D / 2; z <= D / 2 + .1; z += 2.5) { poles.push([cx - W / 2 - .8, H / 2, cz + z, 1]); poles.push([cx + W / 2 + .8, H / 2, cz + z, 1]); }
    for (let f = 0; f <= floors; f++) {
      const y = f * floorH;
      poles.push([cx, y, cz - D / 2 - .8, 2]); poles.push([cx, y, cz + D / 2 + .8, 2]);
      poles.push([cx - W / 2 - .8, y, cz, 3]); poles.push([cx + W / 2 + .8, y, cz, 3]);
    }
    const bIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .06, 1, 5), new THREE.MeshLambertMaterial({ color: 0xc8a86a }), poles.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
    poles.forEach((p, i) => {
      if (p[3] === 0 || p[3] === 1) { S.set(1, H + 1, 1); Q.identity(); }
      else if (p[3] === 2) { S.set(W + 2, 1, 1); Q.setFromEuler(E.set(0, 0, Math.PI / 2)); }
      else { S.set(D + 2, 1, 1); Q.setFromEuler(E.set(Math.PI / 2, 0, 0)); }
      P.set(p[0], p[1], p[2]); M.compose(P, Q, S); bIM.setMatrixAt(i, M);
    });
    scene.add(bIM);
    const net = new THREE.Mesh(new THREE.BoxGeometry(W * 1.08, H * 1.04, D * 1.08), new THREE.MeshLambertMaterial({ map: netTex, transparent: true, opacity: .8, side: THREE.DoubleSide }));
    net.position.set(cx, H / 2, cz); scene.add(net);
    /* 安全橫額掛棚 */
    const slogans = [["高高興興上班去 · 平平安安回家來", "#1a7a3a"], ["安全第一 · 零意外", "#c02525"]];
    for (let s = 0; s < 2; s++) {
      const bt = makeBannerTex(slogans[s][0], slogans[s][1]);
      const bp = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(W * .8, 18), 1.5), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
      bp.position.set(cx, 2.2 + s * 4.5, cz - D / 2 - 1.2); scene.add(bp);
    }
  }
  /* 泛光燈 + 一支真射燈 */
  const mastMat = new THREE.MeshLambertMaterial({ color: 0x4a4f56 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffedc0 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const mx = cx + sx * (W / 2 + 5), mz = cz + sz * (D / 2 + 5);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.1, .16, 12, 6), mastMat);
    mast.position.set(mx, 6, mz); mast.castShadow = true; scene.add(mast);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, .5, .6), headMat);
    head.position.set(mx, 12.2, mz); head.lookAt(cx, H * .5, cz); scene.add(head);
  }
  const spot = new THREE.SpotLight(0xffe0b0, 900, 120, .7, .5, 1.6);
  spot.position.set(cx + W / 2 + 5, 12.2, cz + D / 2 + 5);
  spot.target.position.set(cx, H * .4, cz);
  scene.add(spot); scene.add(spot.target);
  /* 板道(閘口→大樓) */
  const doorX = cx - W / 2 - 2, doorZ = cz;
  {
    const dir = Math.atan2(doorZ - OFFICE[1], doorX - OFFICE[0]);
    const len = d2(OFFICE[0], OFFICE[1], doorX, doorZ);
    const walk = new THREE.Mesh(new THREE.BoxGeometry(2.2, .3, len), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    walk.position.set((OFFICE[0] + doorX) / 2, .15, (OFFICE[1] + doorZ) / 2);
    walk.rotation.y = -dir; walk.receiveShadow = true; scene.add(walk);
    const walk2 = new THREE.Mesh(new THREE.BoxGeometry(W * .8, .3, 2.2), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    walk2.position.set(cx - W * .1, .15, cz + D / 2 + 4); scene.add(walk2);
  }
  /* 物料場:磚籠 + 模板 + 水桶 */
  const yardX = cx - W / 2 - 8, yardZ = cz + D / 2 + 10;
  const cageMat = new THREE.MeshLambertMaterial({ color: 0xc07830 });
  for (let i = 0; i < 10; i++) {
    const cage = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.1), cageMat);
    cage.position.set(yardX + (i % 4) * 1.6, .5, yardZ + Math.floor(i / 4) * 1.4);
    cage.castShadow = true; scene.add(cage);
  }
  for (let i = 0; i < 6; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, .8, .8), new THREE.MeshLambertMaterial({ color: 0x9a7648 }));
    plank.position.set(yardX + 8, .4, yardZ + 2 + i * 1.2); plank.rotation.y = rand(-.2, .2);
    plank.castShadow = true; scene.add(plank);
  }
  const drumMat = new THREE.MeshLambertMaterial({ color: 0x2a5ad0 });
  for (let i = 0; i < 8; i++) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .95, 10), drumMat);
    drum.position.set(yardX - 3 + (i % 3) * .8, .48, yardZ + 4 + Math.floor(i / 3) * .8);
    drum.castShadow = true; scene.add(drum);
  }
  /* 免費素材入場(異步):Kenney貨櫃(CC0) + Hunyuan3D AI生成手推車
     — 通用擺放:Box3實測歸一化(P0教訓:唔信accessor/內部scale) + 腳底貼地 + 碰撞體 */
  window.__propsLoaded = [];
  {
    const propLoader = new GLTFLoader();
    const placeGLBProp = (gltf, x, z, rotY, targetH, opts = {}) => {
      const m = gltf.scene;
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (opts.color) o.material = new THREE.MeshStandardMaterial({ color: opts.color, roughness: opts.rough ?? .7, metalness: opts.metal ?? .1 }); } });
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      const h = Math.max(.01, box.max.y - box.min.y);
      m.scale.setScalar(targetH / h);
      m.position.y = -box.min.y * m.scale.x;
      const wrap = new THREE.Group(); wrap.add(m);
      wrap.position.set(x, 0, z); wrap.rotation.y = rotY;
      scene.add(wrap);
      wrap.updateMatrixWorld(true);
      const wb = new THREE.Box3().setFromObject(wrap);
      const hw = (wb.max.x - wb.min.x) / 2, hd = (wb.max.z - wb.min.z) / 2;
      const cxp = (wb.max.x + wb.min.x) / 2, czp = (wb.max.z + wb.min.z) / 2;
      colliders.push({ x: cxp, z: czp, hw, hd, rot: 0, minx: wb.min.x, maxx: wb.max.x, minz: wb.min.z, maxz: wb.max.z });
      window.__propsLoaded.push(opts.name || "prop");
      return wrap;
    };
    /* Kenney貨櫃×2(CC0):寫字樓旁 + 物料場 */
    propLoader.load("assets/kenney-industrial/Models/GLB format/shipping-container-b.glb",
      g => placeGLBProp(g, OFFICE[0] + Math.cos(GATE_DIR_IN + 2.1) * 8, OFFICE[1] + Math.sin(GATE_DIR_IN + 2.1) * 8, rand(0, 6), 2.6, { name: "kenney-container-b", color: 0x2a6a5a, rough: .75, metal: .25 }));
    propLoader.load("assets/kenney-industrial/Models/GLB format/shipping-container-c.glb",
      g => placeGLBProp(g, yardX + 4, yardZ - 4, .5, 2.6, { name: "kenney-container-c", color: 0x8a4a3a, rough: .75, metal: .25 }));
    /* P6:程序化手推車取代 ai-wheelbarrow.glb(舊 GLB 410,176 tri = 全場25%,白模上色晒料)
       — 車斗+車輪+腳架+把手,~230 tri,連碰撞體 */
    {
      const wb = new THREE.Group();
      const trayM = new THREE.MeshStandardMaterial({ color: 0xb84a18, roughness: .55, metalness: .35 });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.05, .08, .62), trayM); tray.position.set(0, .48, 0); tray.castShadow = true; wb.add(tray);
      for (const s of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(1.05, .3, .05), trayM); side.position.set(0, .62, s * .3); side.castShadow = true; wb.add(side);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(.06, .42, .06), new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: .7, metalness: .4 })); leg.position.set(-.42, .26, s * .22); wb.add(leg);
      }
      const front = new THREE.Mesh(new THREE.BoxGeometry(.05, .3, .62), trayM); front.position.set(.5, .62, 0); wb.add(front);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .09, 14), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .95 }));
      wheel.rotation.x = Math.PI / 2; wheel.position.set(.48, .2, 0); wheel.castShadow = true; wb.add(wheel);
      const handleM = new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: .5, metalness: .6 });
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .8, 8), handleM); h.rotation.z = Math.PI / 2 - .35; h.position.set(-.62, .62, s * .26); wb.add(h); }
      wb.position.set(yardX + 1.5, 0, yardZ + .5); wb.rotation.y = 1.15;
      scene.add(wb);
      colliders.push({ x: yardX + 1.5, z: yardZ + .5, hw: .55, hd: .4, rot: 0, minx: yardX + .95, maxx: yardX + 2.05, minz: yardZ + .1, maxz: yardZ + .9 });
      window.__propsLoaded.push("proc-wheelbarrow");
    }
  }
}
/* 圍板安全橫額 */
{
  const slogans = [["安全第一 · 零意外", "#c02525"], ["戴好安全帽 · 扣好帽帶", "#1a5ac0"], ["小心吊運 · 唔好行天秤下面", "#c07800"], ["香港建築", "#1a7a3a"]];
  let bi = 0;
  const addBanners = (zone, openings) => {
    const pts = zone.pts;
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      const L = Math.hypot(bx - ax, bz - az);
      const ops = openings.list.filter(o => o.edge === i);
      for (let t = 8; t < L - 4; t += 17) {
        if (ops.some(o => Math.abs(t - o.tCentre) < o.width / 2 + 6)) continue; // 唔好橫跨開口
        const k = t / L;
        const bt = makeBannerTex(slogans[bi % slogans.length][0], slogans[bi % slogans.length][1]);
        bi++;
        const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(L * .6, 12), 1.3), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
        bMesh.position.set(lerp(ax, bx, k), 2.9, lerp(az, bz, k));
        bMesh.rotation.y = -Math.atan2(bz - az, bx - ax) + Math.PI / 2;
        scene.add(bMesh);
      }
    }
  };
  addBanners(MAIN_SITE, MAIN_OPENINGS);
}
/* 閘口橫額 */
{
  const bt = makeBannerTex("香港建築 · 地盤入口 請嘟平安卡", "#1a3a6a");
  const gb = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.1), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }));
  const GO2 = Math.atan2(MAIN_SITE.c[1] - GATE[1], MAIN_SITE.c[0] - GATE[0]) + Math.PI;
  gb.position.set(GATE[0] + Math.cos(GO2) * 2, 4.1, GATE[1] + Math.sin(GO2) * 2);
  gb.rotation.y = Math.PI / 2 - GO2;
  scene.add(gb);
}
/* 閘口沿途物料堆 */
{
  const GO3 = Math.atan2(MAIN_SITE.c[1] - GATE[1], MAIN_SITE.c[0] - GATE[0]);
  const pp = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const t = 14 + i * 7;
    const side = i % 2 ? 1 : -1;
    const x = GATE[0] + Math.cos(GO3) * t + Math.cos(GO3 + pp) * side * 6.5;
    const z = GATE[1] + Math.sin(GO3) * t + Math.sin(GO3 + pp) * side * 6.5;
    if (i % 2) {
      const cage = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.1), new THREE.MeshLambertMaterial({ color: 0xc07830 }));
      cage.position.set(x, .5, z); cage.castShadow = true; scene.add(cage);
    } else {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .95, 10), new THREE.MeshLambertMaterial({ color: 0x2a5ad0 }));
      drum.position.set(x, .48, z); drum.castShadow = true; scene.add(drum);
    }
  }
}

/* 斗車(可駕駛) + NPC泥頭車 */
/* P2:程序化高細節泥頭車(6輪3軸,介面不變:g/wheels/beacon/x/z/heading/v)
   材質分層:車漆(Standard 低rough)/黑膠/金屬/玻璃;footprint 同舊版一致(長~5.4m 闊2.3m)唔影響碰撞/任務 */
function makeTruck(x, z, rotY, color) {
  const g = new THREE.Group();
  const M = {
    paint: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(rand(.86, 1)), roughness: .38, metalness: .15 }), /* P8f:每架車漆有微量差 */
    paintDark: new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.55), roughness: .5, metalness: .2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .95, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: .35, metalness: .85 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: .55, metalness: .7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9ac8e8, roughness: .12, metalness: .4, transparent: true, opacity: .72 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: .2, metalness: .95 }),
    bed: new THREE.MeshStandardMaterial({ color: 0x4a4d55, roughness: .7, metalness: .35 }),
    bedIn: new THREE.MeshStandardMaterial({ color: 0x2e3036, roughness: .9, metalness: .1 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xffd23a, roughness: .5 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xcfb96a, emissiveIntensity: .7, roughness: .3 }),
    red: new THREE.MeshStandardMaterial({ color: 0x992222, emissive: 0x550808, emissiveIntensity: .6, roughness: .4 })
  };
  const B = (w, h, d, mat, px, py, pz, cast = false) => { // P6:細件預設唔投影,大件明確開
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz); m.castShadow = cast; g.add(m); return m;
  };
  /* --- 底盤 --- */
  for (const s of [-1, 1]) B(5.0, .2, .12, M.darkMetal, -.2, .82, s * .45);
  for (let i = 0; i < 5; i++) B(.14, .16, 1.0, M.darkMetal, 2.2 - i * 1.15, .82, 0);
  /* 油缸+電池箱+排氣管 */
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, 1.15, 14), M.metal);
  tank.rotation.x = Math.PI / 2; tank.position.set(1.0, .62, -.82); tank.castShadow = true; g.add(tank);
  B(.9, .5, .42, M.darkMetal, 1.0, .6, .82);
  const exh = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1.7, 8), M.chrome);
  exh.position.set(.95, 1.85, -1.05); exh.castShadow = true; g.add(exh);
  const exhTip = new THREE.Mesh(new THREE.CylinderGeometry(.075, .055, .16, 8), M.chrome);
  exhTip.position.set(.95, 2.75, -1.05); g.add(exhTip);
  /* --- 駕駛室(P10.1-D:斜擋風玻璃+A柱+上寬下窄 cab 輪廓+門縫門柄) --- */
  B(1.5, .9, 2.2, M.paint, 1.7, 1.32, 0, true);            // cab 下段(腰線以下)
  const cabUpper = B(1.5, .52, 2.0, M.paint, 1.62, 2.02, 0, true); // cab 上段(內收,形成層次)
  for (const s of [-1, 1]) {
    const ap = B(.14, .62, .12, M.paint, 2.36, 1.95, s * .98, true); // A柱(斜面兩側)
    ap.rotation.x = 0;
  }
  const ws = B(.06, .78, 1.8, M.glass, 2.42, 1.95, 0); ws.rotation.z = -.24; // 擋風玻璃:更大更斜
  B(.06, .1, 1.86, M.paintDark, 2.5, 2.36, 0);         // 玻璃頂框
  for (const s of [-1, 1]) {
    B(.7, .5, .05, M.glass, 1.82, 2.02, s * 1.02, false);   // 側窗(上段內)
    B(.74, .06, .07, M.paintDark, 1.82, 2.29, s * 1.04);    // 側窗框
    B(.02, .42, .03, M.chrome, 2.28, 1.35, s * 1.11, false); // 門縫
    B(.16, .04, .05, M.chrome, 2.05, 1.42, s * 1.13, false); // 門柄
  }
  B(1.5, .1, 2.2, M.paintDark, 1.7, 2.3, 0);           // 遮陽簷
  /* cab 前臉(P10.1-D):前後層次 — 格柵凹入+保險槓+頭燈+頂 marker 燈 */
  B(.1, .62, 1.6, M.darkMetal, 2.5, 1.05, 0);          // 水箱罩
  for (let i = 0; i < 3; i++) B(.04, .09, 1.5, M.chrome, 2.57, .9 + i * .18, 0, false); // 格柵橫條
  B(.32, .38, 2.3, M.darkMetal, 2.6, .45, 0);          // 前防撞槓
  for (const s of [-1, 1]) {
    B(.06, .2, .4, M.lamp, 2.62, .62, s * .8);         // 頭燈
    B(.05, .07, .12, M.lamp, 2.55, 2.34, s * .75, false); // 頂 marker 燈
    const arm = B(.56, .05, .05, M.darkMetal, 2.3, 2.28, s * 1.16);
    B(.34, .24, .04, M.chrome, 2.45, 2.16, s * 1.3, false); // 倒後鏡
  }
  /* --- 泥斗(開口 U 形,內外壁) — P10.1-D:斗側壁加厚+頂邊外翻+肋升級 --- */
  B(3.3, .14, 2.2, M.bedIn, -1.05, .96, 0);            // 斗底(內面深色)
  for (const s of [-1, 1]) {
    B(3.3, .9, .16, M.bed, -1.05, 1.45, s * 1.06, true);      // 外側壁(加厚 .1→.16)
    B(3.22, .8, .05, M.bedIn, -1.05, 1.43, s * .96, false);   // 內壁襯
    B(3.42, .1, .2, M.stripe, -1.05, 1.95, s * 1.06);  // 頂部黃欄(外翻)
    for (let i = 0; i < 5; i++) B(.12, .82, .1, M.paintDark, -2.5 + i * .72, 1.45, s * 1.17); // 外加勁肋(凸出更多)
  }
  B(.12, 1.0, 2.2, M.bed, .58, 1.42, 0);               // 前擋板
  B(.12, .88, 2.1, M.bedIn, -.52, 1.42, 0, false);     // 前內襯
  const gate = B(.1, .85, 2.1, M.bed, -2.88, 1.44, 0); // 尾門
  B(.1, .12, 2.15, M.stripe, -2.9, 1.9, 0);            // 尾門黃欄
  /* P8f:泥污 — 斗底外側/沙板/尾門下部嘅泥漬條 */
  const mudM = new THREE.MeshStandardMaterial({ color: 0x4a3d2e, roughness: .98 });
  for (const s of [-1, 1]) B(3.1, .3, .06, mudM, -1.05, .68, s * 1.11, false); 
  B(.06, .3, 2.05, mudM, -2.94, .68, 0, false);
  for (const s of [-1, 1]) B(1.6, .12, .04, mudM, -.45 + (s > 0 ? .8 : 0), 1.02, s * 1.13, false);
  /* --- 車輪(24邊:P10.1-D 胎加闊 .42→.55,胎面塊狀;繞輪軸 z 滾動) --- */
  const wheels = [];
  const mkWheel = (wx, side) => {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .55, 24), M.rubber);
    tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; w.add(tyre);
    // 胎面塊(tread blocks):8條沿圓周,膠色深淺唔同
    for (let i = 0; i < 8; i++) {
      const tb = new THREE.Mesh(new THREE.BoxGeometry(.56, .09, .13), i % 2 ? M.rubber : M.darkMetal);
      const a = i / 8 * Math.PI * 2;
      tb.position.set(Math.cos(a) * .53, Math.sin(a) * .53, 0); tb.rotation.z = a;
      w.add(tb);
    }
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .56, 16), M.metal);
    rim.rotation.x = Math.PI / 2; w.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .58, 10), M.chrome);
    hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.02, .5, .08), M.metal); b.rotation.z = i * Math.PI / 2.5; b.position.x = side * .27; w.add(b); } // 輪輻
    w.position.set(wx, .55, side * 1.02); g.add(w); wheels.push(w);
  };
  [[1.7, 1], [1.7, -1], [-.45, 1], [-.45, -1], [-1.65, 1], [-1.65, -1]].forEach(([wx, s]) => mkWheel(wx, s));
  /* --- 沙板/擋泥板(P10.1-D:半徑加大包住厚胎) --- */
  const fender = (fx, len) => { for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, len, 12, 1, false, 0, Math.PI), M.darkMetal);
    f.rotation.x = Math.PI / 2; f.rotation.y = Math.PI; f.position.set(fx, .78, s * 1.04); f.castShadow = true; g.add(f);
  } };
  fender(1.7, .68); fender(-1.05, 2.6);
  /* --- 車尾 --- */
  for (const s of [-1, 1]) {
    B(.08, .22, .3, M.red, -2.93, 1.0, s * .85);       // 尾燈
    B(.5, .55, .04, M.rubber, -3.0, .35, s * .98, false); // 擋泥膠簾
  }
  /* --- 警示燈(介面保留) --- */
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa20 }));
  beacon.position.set(1.7, 2.42, 0); g.add(beacon);
  B(.3, .1, .3, M.stripe, 1.7, 2.32, 0);               // 燈座
  /* P6:LOD — LOD0 高細節(0m) / LOD1 積木版(70m) / LOD2 剪影(170m) */
  const lod = new THREE.LOD();
  lod.addLevel(g, 0);
  const g1 = new THREE.Group();
  const lam = new THREE.MeshLambertMaterial({ color });
  const cab1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 1.9), lam); cab1.position.set(1.7, 1.45, 0); g1.add(cab1);
  const bed1 = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1, 2.1), new THREE.MeshLambertMaterial({ color: 0x5c5c66 })); bed1.position.set(-1.05, 1.3, 0); g1.add(bed1);
  const wg1 = new THREE.CylinderGeometry(.55, .55, .4, 10); wg1.rotateX(Math.PI / 2);
  const wm1 = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  [[1.7, 1], [1.7, -1], [-.45, 1], [-.45, -1], [-1.65, 1], [-1.65, -1]].forEach(([wx, s]) => { const w = new THREE.Mesh(wg1, wm1); w.position.set(wx, .55, s * 1.02); g1.add(w); });
  lod.addLevel(g1, 70);
  const g2 = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.8, 2.2), new THREE.MeshLambertMaterial({ color })); s2.position.set(-.2, 1.1, 0); g2.add(s2);
  lod.addLevel(g2, 170);
  lod.position.set(x, 0, z); lod.rotation.y = rotY; scene.add(lod);
  return { g: lod, wheels, beacon, x, z, heading: rotY, v: 0 };
}
const playerTruck = makeTruck(OFFICE[0] + Math.cos(GATE_DIR_IN) * 16, OFFICE[1] + Math.sin(GATE_DIR_IN) * 16, GATE_DIR_IN + Math.PI / 2, 0x3a8a4a);
/* NPC 泥頭車:繞圈 + 倒車入地盤 */
const npcTruck = makeTruck(0, 0, 0, 0x8a3a3a);
npcTruck.route = (() => {
  /* P9.2:固定入場-卸貨-出場循環,必經 vehicle opening,唔經行人閘/圍板。
     路線尾喺閘外街尾 → 觸發 reverse hazard → 由 wp 0 重新起步。 */
  const veh = MAIN_OPENINGS.list.find(o => o.type === "vehicle");
  if (!veh) return [[0, 0]];
  let nx = MAIN_SITE.c[0] - veh.x, nz = MAIN_SITE.c[1] - veh.z;
  const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl; // 車閘向內
  const out = (d) => [veh.x - nx * d, veh.z - nz * d], inw = (d) => [veh.x + nx * d, veh.z + nz * d];
  // P9.2:純穿梭軸(閘中心進出直線),避開安全訓練室貨櫃(-811,947)等閘前物件
  return [
    out(30), out(9),                 // 0-1 埋閘(觸發 barrier 升)
    inw(6), inw(16), inw(24),        // 2-4 入場沿車道到卸貨區
    inw(8), out(2),                  // 5-6 掉頭出閘
    out(14), out(30),                // 7-8 出閘離開(barrier 落)
    out(42)                          // 9 再前行(之後 reverse hazard 喺空曠街上)
  ];
})();
npcTruck.wp = 0; npcTruck.mode = "drive"; npcTruck.timer = 0;
hazards.push({ type: "npcTruck" });

/* ---------- 角色 ---------- */
const SPAWN = [-1129, 321]; // 零碳天地(原點,留作座標參考)
/* 場景規格§3「出生即見真實工地」:開場喺閘口外,對住閘機,即見工地 */
(function fixSpawn() {
  const g = GATE, gd = GATE_DIR_IN;
  const gx = Math.cos(gd), gz = Math.sin(gd);
  /* 搵閘外10米冇collider嘅開揚位 */
  for (let a = 0; a < 8; a++) {
    const spread = (a - 3.5) * .35;
    const tx = g[0] - gx * 10 + Math.cos(spread) * 3, tz = g[1] - gz * 10 + Math.sin(spread) * 3;
    const [cx, cz] = collide(tx, tz, 1.2);
    if (Math.hypot(cx - tx, cz - tz) < .5) { SPAWN[0] = Math.round(cx); SPAWN[1] = Math.round(cz); break; }
  }
})();
const player = {
  h: makeHuman({ vest: true, helmet: 0xffd23a, pants: 0x2a3a6a, boots: 0x4a2e1a, hatStrap: true, useMixamo: true }),
  x: SPAWN[0], z: SPAWN[1], heading: 0, vy: 0, y: 0, speed: 0,
  hp: 100, stamina: 100, wage: 0, warnings: 0, stars: 0, starTimer: 0,
  invuln: 0, carrying: null, inTruck: false, freeze: 0
};
player.h.g.position.set(player.x, 0, player.z); scene.add(player.h.g);

/* 判頭 + 白帽 + 工友 */
const boss = makeHuman({ vest: true, helmet: 0xd03030, pants: 0x333, boots: 0x222, shirt: 0x8a5a2a });
boss.g.position.set(GATE[0] + Math.cos(GATE_DIR_IN) * 4, 0, GATE[1] + Math.sin(GATE_DIR_IN) * 4);
boss.g.rotation.y = GATE_DIR_IN + Math.PI;
scene.add(boss.g);
const bossLabel = makeSpriteLabel("老陳", "#ffd76e", 2.6); bossLabel.position.y = 2.25; boss.g.add(bossLabel);

const officers = [];
function spawnOfficer(nearX, nearZ) {
  const h = makeHuman({ vest: true, vestColor: "#e6e9ee", vestLabel: "安全巡查", helmet: 0xf4f4f4, pants: 0x38404e, clipboard: true, boots: 0x2a2a2a, sex: Math.random() < .4 ? "F" : "M" });
  const label = makeSpriteLabel("安全主任", "#fff", 2.0); label.position.y = 2.25; h.g.add(label);
  const mark = makeSpriteLabel("❗", "#ff4040", 2.2); mark.position.y = 2.8; mark.visible = false; h.g.add(mark);
  const rp = roadPts[randi(0, roadPts.length - 1)] || [nearX, nearZ];
  let x = nearX + rand(-60, 60), z = nearZ + rand(-60, 60);
  const nrp = nearestRoadPt(x, z); if (nrp) { x = nrp[0]; z = nrp[1]; }
  h.g.position.set(x, 0, z);
  scene.add(h.g);
  officers.push({ name: "安全主任", role: "officer", h, mark, x, z, heading: 0, state: "patrol", wp: null, wpT: 0, loseT: 0, speakT: 0, home: [nearX, nearZ] });
}
spawnOfficer(MAIN_SITE.c[0], MAIN_SITE.c[1]);
spawnOfficer(MAIN_SITE.c[0], MAIN_SITE.c[1]);
spawnOfficer(GATE[0], GATE[1]);
spawnOfficer(SITE2.c[0], SITE2.c[1]);

const workers = [];
function spawnWorker(x, z, opts = {}) {
  const h = makeHuman(opts.human || { vest: true, helmet: opts.helmet || (Math.random() < .8 ? 0xffd23a : 0x3a7ad0), pants: 0x3a4a6a, boots: 0x4a2e1a, sex: Math.random() < .3 ? "F" : "M" });
  h.g.position.set(x, 0, z); scene.add(h.g);
  const w = { h, x, z, heading: rand(0, 6.28), state: "idle", t: rand(0, 4), target: null, name: opts.label || "工友", female: opts.human?.sex === "F", role: opts.role || (/管工/.test(opts.label || "") ? "foreman" : /機手/.test(opts.label || "") ? "machineOp" : "worker"), fed: false, label: opts.label ? makeSpriteLabel(opts.label, opts.labelColor || "#8ef0a0", 2.2) : null };
  if (w.label) { w.label.position.y = 2.25; h.g.add(w.label); }
  workers.push(w); return w;
}
for (let i = 0; i < 22; i++) {
  const zone = Math.random() < .7 ? MAIN_SITE : SITE2;
  const a = rand(0, Math.PI * 2), r = rand(4, Math.min(26, Math.sqrt(zone.area) * .55));
  spawnWorker(zone.c[0] + Math.cos(a) * r, zone.c[1] + Math.sin(a) * r);
}

/* 地盤階級:管工/機手/安全督導員/老總PM/地盤經理/雜工 (判頭=老陳, 安全主任=白帽已有) */
spawnWorker(OFFICE[0] + 4, OFFICE[1] + 4, { human: { vest: true, helmet: 0xf8f8f8, vestColor: "#c8d0da", vestLabel: "PROJECT MGR", shirt: 0xd8e0e8, pants: 0x22222a, boots: 0x1a1a1a, clipboard: true }, label: "老總 PM · Richard", labelColor: "#ffd76e" });
spawnWorker(MAIN_SITE.c[0] + 2, MAIN_SITE.c[1] - 4, { human: { vest: true, helmet: 0xf0f0f0, vestColor: "#dce0e6", vestLabel: "地盤經理", shirt: 0x4a5a7a, pants: 0x22222a, boots: 0x1a1a1a, clipboard: true }, label: "地盤經理 · 雄哥", labelColor: "#ffd76e" });
spawnWorker(GATE[0] - Math.cos(GATE_DIR_IN) * 10, GATE[1] - Math.sin(GATE_DIR_IN) * 10, { human: { vest: true, helmet: 0xd04040, shirt: 0x3d4a66, pants: 0x2a3a5a, clipboard: true }, label: "管工 · 阿強", labelColor: "#8ef0a0" });
spawnWorker(PIT.x + 9, PIT.z + 6, { human: { vest: true, helmet: 0x2a5ad0, shirt: 0x2a3a4e, pants: 0x2a2a34, boots: 0x222222 }, label: "機手 · 輝哥", labelColor: "#8ef0a0" });
spawnWorker(MAIN_SITE.c[0] - 6, MAIN_SITE.c[1] + 8, { human: { vest: true, vestColor: "#e6e9ee", vestLabel: "安全督導", helmet: 0x2a9a4a, pants: 0x38404e, clipboard: true, boots: 0x2a2a2a }, label: "安全督導員", labelColor: "#ffffff" });
spawnWorker(MAIN_SITE.c[0] + 10, MAIN_SITE.c[1] + 2, { helmet: 0xffd23a, label: "雜工" });
spawnWorker(MAIN_SITE.c[0] - 4, MAIN_SITE.c[1] + 14, { helmet: 0xffd23a, label: "雜工" });

/* 街景行人(路人,唔戴帽) */
const peds = [];
{
  const majors = ROADS.filter(r => r.w >= 9 && r.p.length >= 4);
  const shirtC = [0x8a4a3a, 0x3a5a8a, 0x5a7a4a, 0x6a5a8a, 0xa08a4a, 0x505860, 0x7a6a5a, 0x4a7a82];
  for (let i = 0; i < 18 && majors.length; i++) {
    const r = majors[randi(0, majors.length - 1)];
    const pts = r.p.filter((_, idx) => idx % 2 === 0);
    if (pts.length < 2) continue;
    const seg = randi(0, pts.length - 2);
    const [ax, az] = pts[seg], [bx, bz] = pts[seg + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const side = Math.random() < .5 ? 1 : -1, off = r.w / 2 + 1.6;
    const x = ax - dz / L * off * side, z = az + dx / L * off * side;
    const h = makeHuman({ helmet: null, shirt: shirtC[randi(0, shirtC.length - 1)], pants: [0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x44484e][randi(0, 3)] });
    h.g.position.set(x, 0, z); scene.add(h.g);
    peds.push({ h, pts, seg, t: Math.random(), dir: Math.random() < .5 ? 1 : -1, side, off, speed: rand(1, 1.6), x, z, heading: 0 });
  }
}
function updatePeds(dt) {
  for (const p of peds) {
    if (d2(p.x, p.z, player.x, player.z) > 140) { p.h.g.visible = false; continue; }
    p.h.g.visible = true;
    const [ax, az] = p.pts[p.seg], [bx, bz] = p.pts[p.seg + 1];
    const L = Math.hypot(bx - ax, bz - az) || 1;
    p.t += p.dir * p.speed * dt / L;
    if (p.t >= 1) { p.t = 0; p.seg++; if (p.seg >= p.pts.length - 1) { p.seg = p.pts.length - 2; p.dir = -1; } }
    else if (p.t <= 0) { p.t = 1; p.seg--; if (p.seg < 0) { p.seg = 0; p.dir = 1; } }
    const [cx, cz] = p.pts[p.seg], [nx, nz] = p.pts[p.seg + 1];
    const dx = nx - cx, dz = nz - cz, SL = Math.hypot(dx, dz) || 1;
    p.x = cx + dx * p.t - dz / SL * p.off * p.side;
    p.z = cz + dz * p.t + dx / SL * p.off * p.side;
    p.heading = Math.atan2(dz * p.dir, dx * p.dir);
    p.h.g.position.set(p.x, 0, p.z);
    p.h.g.rotation.y = -p.heading + Math.PI / 2;
    p.h.animate(dt, p.speed);
  }
}

/* 地盤大牌(閘口告示板) */
{
  const GO = Math.atan2(MAIN_SITE.c[1] - GATE[1], MAIN_SITE.c[0] - GATE[0]) + Math.PI; // 閘外方向
  const bbTex = canvasTex(1024, 576, g => {
    g.scale(2, 2);
    g.fillStyle = "#f2efe8"; g.fillRect(0, 0, 512, 288);
    g.strokeStyle = "#1a3a6a"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 278);
    g.fillStyle = "#1a3a6a"; g.fillRect(10, 10, 492, 52);
    g.fillStyle = "#fff"; g.font = "900 34px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center";
    g.fillText("香港建築 HONG KONG CONSTRUCTION", 256, 46);
    g.fillStyle = "#222"; g.font = "900 26px 'Microsoft JhengHei',sans-serif";
    g.fillText("啟德 · 九龍灣發展工程 (第三期)", 256, 100);
    g.font = "600 19px 'Microsoft JhengHei',sans-serif"; g.fillStyle = "#444";
    g.fillText("承建商:香港建築有限公司", 256, 140);
    g.fillText("安全主任:白帽師傅 · 平安卡熱線:2722 0000", 256, 168);
    g.fillStyle = "#1a7a3a"; g.fillRect(10, 196, 492, 82);
    g.fillStyle = "#fff"; g.font = "900 30px 'Microsoft JhengHei',sans-serif";
    g.fillText("⚠ 工地重地 · 閒人免進", 256, 234);
    g.font = "700 20px 'Microsoft JhengHei',sans-serif";
    g.fillText("安全第一 · 戴好安全帽 · 扣好帽帶", 256, 264);
  });
  bbTex.anisotropy = 8;
  const bx = GATE[0] + Math.cos(GO) * 44 + Math.cos(GO + Math.PI / 2) * 12, bz = GATE[1] + Math.sin(GO) * 44 + Math.sin(GO + Math.PI / 2) * 12;
  const g2 = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 4.4, 8), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
    post.position.set(s * 3.4, 2.2, 0); g2.add(post);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.4, .25), [new THREE.MeshLambertMaterial({ color: 0x888 }), new THREE.MeshLambertMaterial({ color: 0x888 }), new THREE.MeshLambertMaterial({ color: 0x888 }), new THREE.MeshLambertMaterial({ color: 0x888 }), new THREE.MeshLambertMaterial({ map: bbTex }), new THREE.MeshLambertMaterial({ color: 0x666 })]);
  board.position.y = 4; board.castShadow = true; g2.add(board);
  g2.position.set(bx, 0, bz);
  g2.rotation.y = Math.PI / 2 - GO;
  scene.add(g2);
  colliders.push({ x: bx, z: bz, hw: 4.2, hd: .4, rot: g2.rotation.y, minx: bx - 4.6, maxx: bx + 4.6, minz: bz - 4.6, maxz: bz + 4.6 });
}

/* ---------- 任務系統 ---------- */
const M = { idx: -1, stage: 0, target: null, data: {} };
const missions = [];
function addMission(def) { missions.push(def); }
function toast(msg) {
  const d = document.createElement("div"); d.className = "toastMsg"; d.textContent = msg;
  $("toast").appendChild(d); setTimeout(() => d.remove(), 2900);
}
function setMarker(x, z) {
  if (x === null) { marker.visible = false; M.target = null; return; }
  M.target = [x, z]; marker.visible = true; marker.position.set(x, 8, z);
}
/* 任務旗幟 + 箭嘴 — P10.5:halo 縮細+低透明(低調 world marker,唔蓋場景) */
const marker = new THREE.Group();
{
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false }));
  cyl.position.y = 7; marker.add(cyl);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.9, 24), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .15; marker.add(ring);
  marker.userData.ring = ring;
}
marker.visible = false; scene.add(marker);
const navArrow = new THREE.Mesh(new THREE.ConeGeometry(.35, .9, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
navArrow.rotation.x = Math.PI / 2; scene.add(navArrow);

const dlgQueue = []; let dlgActive = null, dlgChar = 0, dlgTimer = null;
function say(name, lines, cb) { dlgQueue.push({ name, lines, cb }); pumpDlg(); }
function pumpDlg() {
  if (dlgActive || !dlgQueue.length) return;
  dlgActive = dlgQueue.shift(); dlgChar = 0;
  $("dlg").style.display = "block"; $("dlgName").textContent = dlgActive.name; $("dlgText").textContent = "";
}
function dlgTick(dt) {
  if (!dlgActive) return;
  const full = dlgActive.lines[0];
  if (dlgChar < full.length) {
    dlgChar = Math.min(full.length, dlgChar + dt * 34);
    $("dlgText").textContent = full.slice(0, Math.floor(dlgChar));
  }
}
function dlgNext() {
  if (!dlgActive) return;
  const full = dlgActive.lines[0];
  if (dlgChar < full.length) { dlgChar = full.length; $("dlgText").textContent = full; return; }
  dlgActive.lines.shift();
  if (dlgActive.lines.length) { dlgChar = 0; return; }
  $("dlg").style.display = "none";
  const cb = dlgActive.cb; dlgActive = null; player.freeze = 0;
  if (cb) cb(); pumpDlg();
}
$("dlg").addEventListener("pointerdown", e => { e.stopPropagation(); dlgNext(); });

/* 外賣/磚籠/工具箱 道具 */
const propDots = new THREE.MeshBasicMaterial({ color: 0x7ef08a });
function makePickup(x, z, label, onPick) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(.8, .6, .8), new THREE.MeshLambertMaterial({ color: 0xc8a86a }));
  box.position.y = .3; box.castShadow = true; g.add(box);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ef08a, transparent: true, opacity: .22, side: THREE.DoubleSide }));
  glow.position.y = 9; g.add(glow);
  g.position.set(x, 0, z); scene.add(g);
  const it = { x, z, mesh: g, label, onPick, action: onPick, active: true };
  interactables.push(it); return it;
}

/* ---------- 新入職流程:安全訓練堂 + 量血壓 ---------- */
let inductionMode = null, inductionView = null;
const QUIZ_STATE = { open: false, qi: 0 };
const BP_STATE = { open: false, pos: 0, dir: 1, speed: 55, zone: [60, 78], hits: 0, miss: 0, iv: null, cb: null, sprinted: false };
const QUIZ = [
  { q: "入地盤第一件事要做咩?", o: ["扣好安全帽帽帶", "扮靚啲先", "即刻開工唔使理"], a: 0 },
  { q: "聽到泥頭車「比比比」倒車聲,應該?", o: ["照樣行過去", "讓開並遠離車尾", "拍一拍車斗"], a: 1 },
  { q: "天秤吊住嘢,下面可以?", o: ["快啲衝過去", "喺下面唞涼", "唔行吊運範圍,繞路走"], a: 2 },
  { q: "發現有人冇戴安全帽,你應該?", o: ["當睇唔到", "叫佢戴好同埋報告", "同佢一齊唔戴"], a: 1 },
  { q: "新入職第一日,要完成咩先入得地盤?", o: ["咩都唔使", "安全入職訓練+量血壓,過關先", "簽個名就算"], a: 1 }
];
function runQuiz(cb) {
  inductionMode = "training";
  QUIZ_STATE.open = true; QUIZ_STATE.qi = 0; QUIZ_STATE.cb = cb;
  $("quiz").style.display = "flex"; $("quizFb").textContent = "";
  quizShow();
}
function quizShow() {
  const item = QUIZ[QUIZ_STATE.qi];
  $("quizQ").textContent = `第 ${QUIZ_STATE.qi + 1}/${QUIZ.length} 題:${item.q}`;
  const box = $("quizOpts"); box.innerHTML = "";
  item.o.forEach((opt, i) => {
    const b = document.createElement("button");
    b.textContent = `${i + 1}. ${opt}`;
    b.addEventListener("pointerdown", e => { e.stopPropagation(); quizAnswer(i); });
    box.appendChild(b);
  });
}
function quizAnswer(i) {
  const item = QUIZ[QUIZ_STATE.qi];
  if (i === item.a) {
    sDing(); QUIZ_STATE.qi++;
    if (QUIZ_STATE.qi >= QUIZ.length) {
      QUIZ_STATE.open = false; inductionMode = null; $("quiz").style.display = "none";
      sCash(); toast("⛑️ 安全訓練合格！留喺訓練區搵安全督導員量血壓");
      const cb = QUIZ_STATE.cb; QUIZ_STATE.cb = null; if (cb) cb();
    } else quizShow();
  } else {
    sThud(); $("quizFb").textContent = "❌ 唔啱!安全主任話:再聽過書!由第一題開始!";
    QUIZ_STATE.qi = 0;
    setTimeout(quizShow, 900);
  }
}
function runBP(cb) {
  inductionMode = "health";
  BP_STATE.open = true; BP_STATE.pos = 0; BP_STATE.dir = 1; BP_STATE.speed = 55;
  BP_STATE.hits = 0; BP_STATE.miss = 0; BP_STATE.cb = cb;
  BP_STATE.sprinted = performance.now() - (player._lastSprintEnd || 0) < 8000;
  BP_STATE.zone = [rand(50, 74), 0]; BP_STATE.zone[1] = BP_STATE.zone[0] + rand(16, 24);
  $("bpTip").innerHTML = BP_STATE.sprinted
    ? "⚠️ 你啱啱跑完步,血壓高!<b>慢慢行返陣先再嚟量!</b>"
    : "安全督導員量度中。等指示器行入<b style=\"color:#7ef08a\">綠色區</b>撳 E / Space(要中 3 次)";
  $("bp").style.display = "flex"; bpRender();
  BP_STATE.iv = setInterval(() => {
    BP_STATE.pos += BP_STATE.dir * BP_STATE.speed * .016;
    if (BP_STATE.pos > 100) { BP_STATE.pos = 100; BP_STATE.dir = -1; }
    if (BP_STATE.pos < 0) { BP_STATE.pos = 0; BP_STATE.dir = 1; }
    bpRender();
  }, 16);
}
function bpRender() {
  $("bpZone").style.left = BP_STATE.zone[0] + "%";
  $("bpZone").style.width = (BP_STATE.zone[1] - BP_STATE.zone[0]) + "%";
  $("bpMark").style.left = BP_STATE.pos + "%";
  $("bpScore").textContent = "❤ ".repeat(BP_STATE.hits) + "·".repeat(3 - BP_STATE.hits);
}
function bpHit() {
  if (!BP_STATE.open) return;
  const p = BP_STATE.pos, [a, b] = BP_STATE.zone;
  if (BP_STATE.sprinted) { // 跑完步:第一次必爆錶
    BP_STATE.sprinted = false; bpFail("血壓爆錶!你啱啱跑完步,行慢啲等個心唞返先!");
    return;
  }
  if (p >= a && p <= b) {
    BP_STATE.hits++; sDing();
    BP_STATE.speed = Math.min(110, BP_STATE.speed + 16);
    BP_STATE.zone = [rand(45, 72), 0]; BP_STATE.zone[1] = BP_STATE.zone[0] + rand(14, 20);
    if (BP_STATE.hits >= 3) bpPass();
  } else {
    BP_STATE.miss++; sThud();
    if (BP_STATE.miss >= 3) bpFail("血壓唔穩定…唞8秒再返訓練室量過!");
  }
  bpRender();
}
function bpPass() {
  BP_STATE.lastFail = false;
  bpClose(); sCash(); toast("🩺 健康檢查合格！領齊 PPE 後到閘機拍卡");
  const cb = BP_STATE.cb; BP_STATE.cb = null; if (cb) cb(true);
}
function bpFail(msg) {
  BP_STATE.lastFail = true;
  bpClose(); toast("⛔ " + msg);
  BP_STATE.cooldownUntil = performance.now() + 8000;
  const cb = BP_STATE.cb; BP_STATE.cb = null; if (cb) cb(false);
}
function bpClose() {
  inductionMode = null;
  BP_STATE.open = false; $("bp").style.display = "none";
  if (BP_STATE.iv) { clearInterval(BP_STATE.iv); BP_STATE.iv = null; }
}
$("bp").addEventListener("pointerdown", () => bpHit());

/* 訓練室貨櫃 + 血壓站 + 閘機(閘外) */
const GATE_OUT = GATE_DIR_IN + Math.PI;
const TRAIN_POS = [GATE[0] + Math.cos(GATE_OUT) * 18 + Math.cos(GATE_DIR_IN + Math.PI / 2) * 8, GATE[1] + Math.sin(GATE_OUT) * 18 + Math.sin(GATE_DIR_IN + Math.PI / 2) * 8];
const BP_POS = [TRAIN_POS[0] + Math.cos(GATE_DIR_IN + Math.PI / 2) * 5, TRAIN_POS[1] + Math.sin(GATE_DIR_IN + Math.PI / 2) * 5];
makeContainer(TRAIN_POS[0], TRAIN_POS[1], GATE_OUT, 0x2a6ad0, "安全訓練室");
{
  const kiosk = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.25, .55), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
  body.position.y = .63; body.castShadow = true; kiosk.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.6, .4), new THREE.MeshBasicMaterial({ map: canvasTex(128, 96, g => { g.fillStyle = "#083408"; g.fillRect(0, 0, 128, 96); g.fillStyle = "#7ef08a"; g.font = "900 30px sans-serif"; g.textAlign = "center"; g.fillText("BP", 64, 44); g.font = "700 16px sans-serif"; g.fillText("量血壓", 64, 72); }) }));
  screen.position.set(0, 1.05, .29); kiosk.add(screen);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(.16, .05, 8, 16), new THREE.MeshLambertMaterial({ color: 0x3a5a8a }));
  cuff.position.set(0, .8, .4); kiosk.add(cuff);
  const lbl = makeSpriteLabel("入職健康檢查 · 安全督導員", "#7ef08a", 2.2); lbl.position.y = 2.0; kiosk.add(lbl);
  kiosk.position.set(BP_POS[0], 0, BP_POS[1]); kiosk.rotation.y = GATE_DIR_IN; scene.add(kiosk);
}
const gateLights = [];
{
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 2.6, 8), new THREE.MeshLambertMaterial({ color: 0xffd23a }));
    const px = GATE[0] + Math.cos(GATE_DIR_IN + Math.PI / 2) * side * 2.6, pz = GATE[1] + Math.sin(GATE_DIR_IN + Math.PI / 2) * side * 2.6;
    post.position.set(px, 1.3, pz); post.castShadow = true; scene.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    lamp.position.set(px, 2.75, pz); scene.add(lamp); gateLights.push(lamp);
  }
}
function setGateOpen(open) { gateLights.forEach(l => l.material.color.setHex(open ? 0x30ff50 : 0xff3030)); beep(open ? 1200 : 300, .18, "square", .2); beep(open ? 1600 : 240, .18, "square", .2, .2); }
const trainIt = { x: TRAIN_POS[0], z: TRAIN_POS[1], r: 4.5, label: "上安全訓練堂(新入職)", active: false, action: () => {
  const healthCheck = () => {
    if (performance.now() < (BP_STATE.cooldownUntil || 0)) { toast("⏳ 先休息，稍後再返訓練室量度。"); return; }
    runBP(ok => { if (ok) player.registered = true; });
  };
  if (M.data.quizDone) healthCheck();
  else runQuiz(() => { M.data.quizDone = true; healthCheck(); });
} };
const bpIt = { x: BP_POS[0], z: BP_POS[1], r: 3, label: "由安全督導員量血壓", active: false, action: () => { if (BP_STATE.cooldownUntil && performance.now() < BP_STATE.cooldownUntil) { toast("⏳ 唔好急,唂多陣先再量!"); return; } runBP(ok => { if (ok) { player.registered = true; } }); } };
interactables.push(trainIt, bpIt);
function sitePoint(a, rmin = 5, rmax = 24) {
  const a2 = rand(a, a + Math.PI * 2), r = rand(rmin, rmax);
  return [MAIN_SITE.c[0] + Math.cos(a2) * r, MAIN_SITE.c[1] + Math.sin(a2) * r];
}
addMission({ // 0 開工報到(新入職:安全訓練+量血壓)
  title: "① 新仔入職:訓練堂+量血壓",
  desc: "去九龍灣地盤閘口搵老陳。新入職先上安全堂，再由安全督導員喺訓練區量血壓；合格同領齊PPE先入閘。",
  start() { setMarker(GATE[0], GATE[1]); M.data.introDone = false; M.data.quizDone = false; },
  tick() {
    if (!M.data.introDone && d2(player.x, player.z, GATE[0], GATE[1]) < 7) {
      M.data.introDone = true; setMarker(TRAIN_POS[0], TRAIN_POS[1]);
      say("老陳", ["阿明!新入職嗎?而家規矩:先去「安全訓練室」上堂,再由安全督導員喺訓練區量血壓。",
        "過晒兩關,閘機先開綠燈。血壓FAIL就入唔到㗎,咪走去跑 sprint 先量!",
        "入面有白帽安全主任巡緊,帽帶扣好,自己執生!"]);
    }
    trainIt.active = (M.idx === 0 && M.data.introDone && !player.registered);
    trainIt.label = M.data.quizDone ? "返訓練室由督導員量血壓" : "上安全訓練堂(新入職)";
    bpIt.active = (M.idx === 0 && M.data.quizDone && !player.registered);
    if (M.data.quizDone && !player.registered && !BP_STATE.open) setMarker(TRAIN_POS[0], TRAIN_POS[1]);
    if (player.registered && !player.ppe) setMarker(PPE_POS[0], PPE_POS[1]);
    if (player.registered && player.ppe && !player.admitted) setMarker(GATE[0],GATE[1]);
    if (player.admitted) this.done();
  },
  done() {
    nextMission();
    say("老陳", ["平安卡——嘟!綠燈!歡迎返工!",
      "而家有單急job:去寫字樓攞外賣,送畀地盤入面嗰五個工友!"], () => {
      toast("任務完成 +$50"); player.wage += 50; sCash();
    });
  }
});
addMission({ // 1 送外賣
  title: "② 送外賣",
  desc: "去寫字樓攞外賣(E),再送畀5個發光嘅工友。小心白帽安全主任!",
  start() {
    M.data.food = makePickup(OFFICE[0], OFFICE[1], "攞外賣", () => {
      M.data.food.mesh.visible = false; M.data.food.active = false; player.carrying = "外賣"; player._carryIt = M.data.food;
      toast("攞咗外賣,搵工友!"); sDing();
      this.five = workers.filter(w => !w.label).slice(0, 5).map(w => { w.role = "feed"; w.h.g.add(w.label = w.label || makeSpriteLabel("等我", "#8ef0a0", 3.4)); if (w.label) { w.label.position.y = 2.35; w.label.visible = true; } return w; });
    });
    setMarker(OFFICE[0], OFFICE[1]);
    spawnOfficer(MAIN_SITE.c[0], MAIN_SITE.c[1]);
  },
  tick() {
    if (!player.carrying || player.carrying !== "外賣") { if (M.data.food && M.data.food.active) setMarker(M.data.food.x, M.data.food.z); }
    if (player.carrying === "外賣") {
      let near = null, nd = 1e9;
      for (const w of this.five || []) if (!w.fed) { const d = d2(player.x, player.z, w.x, w.z); if (d < nd) { nd = d; near = w; } }
      if (near) { setMarker(near.x, near.z); if (nd < 2.5) { near.fed = true; if (near.label) near.label.visible = false; sDing(); player.wage += 20; toast(["「嘩,叉燒飯!唔該晒師兄!」 +$20", "「有得食唔使愁!」 +$20", "「救命恩人!」 +$20"][randi(0, 2)]); } }
      if ((this.five || []).every(w => w.fed)) this.done();
    }
  },
  done() {
    nextMission(); player.carrying = null;
    say("工友阿祥", ["全部送到,勁!判頭話仲有嘢做——搬磚!"]);

  }
});
addMission({ // 2 搬磚
  title: "③ 搬磚上斗車",
  desc: "地盤入面有4籠磚(發光),逐籠搬去斗車度(E上肩,再行去斗車E放低)。",
  start() {
    M.data.bricks = [];
    for (let i = 0; i < 4; i++) { const p = sitePoint(i * 1.6); M.data.bricks.push({ pos: p, picked: false }); }
    M.data.bricks.forEach(b => { b.pick = makePickup(b.pos[0], b.pos[1], "搬磚", () => { if (player.carrying) { toast("手上已經有嘢!"); return; } b.pick.mesh.visible = false; b.pick.active = false; player.carrying = "磚"; player._carryIt = b.pick; toast("扛起磚籠(行慢咗)"); sDing(); }); });
    M.data.dropCount = 0;
    spawnOfficer(MAIN_SITE.c[0], MAIN_SITE.c[1]);
  },
  tick() {
    const tx = playerTruck.x, tz = playerTruck.z;
    if (player.carrying === "磚") setMarker(tx, tz);
    else { const np = M.data.bricks.find(b => !b.picked && b.pick.active); if (np) setMarker(np.pos[0], np.pos[1]); }
    if (player.carrying === "磚" && d2(player.x, player.z, tx, tz) < 4) {
      player.carrying = null; M.data.dropCount++; player.wage += 25; sDing(); toast(`落咗一籠磚 (${M.data.dropCount}/4) +$25`);
      if (M.data.dropCount >= 4) this.done();
    }
  },
  done() {
    nextMission();
    say("老陳", ["好嘢!跟住嗰單夠晒刺激:有師傅唔覺意跌咗個工具箱喺天秤吊住嘅貨下面,你去執返!"]);
  }
});
addMission({ // 3 天秤危機
  title: "④ 天秤下面執工具箱(危險!)",
  desc: "工具箱喺吊運範圍入面,睇準吊貨擺位先衝入去執(E),再帶去安全區!",
  start() {
    const cx = mainCrane.x + Math.cos(mainCrane.baseRot) * 12, cz = mainCrane.z + Math.sin(mainCrane.baseRot) * 12;
    M.data.tool = makePickup(cx, cz, "執工具箱", () => {
      M.data.tool.mesh.visible = false; M.data.tool.active = false; player.carrying = "工具箱"; player._carryIt = M.data.tool;
      toast("執到!快啲帶離吊運範圍!");
    });
    M.data.safe = [mainCrane.x + 20, mainCrane.z + 20];
    setMarker(cx, cz);
  },
  tick() {
    if (player.carrying !== "工具箱") { const t = M.data.tool; if (t && t.active) setMarker(t.x, t.z); }
    else {
      setMarker(M.data.safe[0], M.data.safe[1]);
      if (d2(player.x, player.z, M.data.safe[0], M.data.safe[1]) < 4) this.done();
    }
  },
  done() {
    nextMission(); player.carrying = null; player.wage += 150; sCash(); toast("化險為夷!+$150");
    say("老陳", ["執到!抵錫!最後一單:開斗車,車啲建築廢料去指定地點。穩陣揸,唔好亂咁撞!"]);
  }
});
addMission({ // 4 開斗車(環保版:蓋帆布+洗車轆)
  title: "⑤ 開斗車送廢料(環保Check)",
  desc: "車尾E蓋帆布 → 揀車過洗車槽(藍色水槽) → 先准出閘送廢料。未蓋帆布/車轆未洗=觸犯環保條例,重罰!",
  start() {
    const rp = roadPts.filter(p => d2(p[0], p[1], GATE[0], GATE[1]) > 260 && d2(p[0], p[1], GATE[0], GATE[1]) < 420);
    M.data.dump = rp.length ? rp[randi(0, rp.length - 1)] : [GATE[0] + 300, GATE[1]];
    M.data.tarp = false; M.data.washed = false; M.data.exited = false;
    /* 帆布 */
    if (!playerTruck.tarp) {
      const tarp = new THREE.Mesh(new THREE.BoxGeometry(3.2, .18, 1.9), new THREE.MeshLambertMaterial({ color: 0x2a4a7a }));
      tarp.position.set(-1.2, 1.95, 0); tarp.visible = false; playerTruck.g.add(tarp); playerTruck.tarp = tarp;
    }
    playerTruck.tarp.visible = false;
    /* 洗車槽(閘外) */
    if (!M.data.washMesh) {
      const wx = GATE[0] - Math.cos(GATE_DIR_IN) * 10, wz = GATE[1] - Math.sin(GATE_DIR_IN) * 10;
      const wash = new THREE.Mesh(new THREE.BoxGeometry(6.5, .18, 4.5), new THREE.MeshLambertMaterial({ color: 0x2a7ad0, transparent: true, opacity: .8 }));
      wash.position.set(wx, .1, wz); wash.rotation.y = GATE_DIR_IN; scene.add(wash);
      const wsign = makeSpriteLabel("洗車槽 🚿", "#7ec8ff", 2.4); wsign.position.set(wx, 2.6, wz); scene.add(wsign);
      M.data.washMesh = wash; M.data.washPos = [wx, wz];
    }
    /* 車尾蓋帆布互動點 */
    if (!M.data.tarpIt) {
      M.data.tarpIt = { x: 0, z: 0, r: 3.4, label: "蓋帆布(防撒漏)", active: false, action: () => { M.data.tarp = true; playerTruck.tarp.visible = true; sClick(); toast("帆布蓋好 ✓ 唔怕撒漏"); } };
      interactables.push(M.data.tarpIt);
    }
    setMarker(playerTruck.x, playerTruck.z);
    spawnOfficer(GATE[0], GATE[1]);
  },
  tick() {
    const t = playerTruck;
    /* 車尾互動點跟車 */
    M.data.tarpIt.active = (M.idx === 4 && !M.data.tarp);
    M.data.tarpIt.x = t.x - Math.cos(t.heading) * 2.6; M.data.tarpIt.z = t.z - Math.sin(t.heading) * 2.6;
    /* 過洗車槽 */
    if (!M.data.washed && d2(t.x, t.z, M.data.washPos[0], M.data.washPos[1]) < 4.5) {
      M.data.washed = true; sSplash(); toast("車轆洗乾淨 ✓ 環保過關");
    }
    /* 出閘檢查 */
    const dGate = d2(t.x, t.z, GATE[0], GATE[1]);
    if (player.inTruck && !M.data.exited && dGate > 24) {
      M.data.exited = true;
      if (!M.data.tarp) violate(2, "運載泥頭廢料未有蓋好!", 300, "泥頭車未有蓋好 $50,000");
      if (!M.data.washed) violate(1, "車轆未洗就出街!", 250, "車輪夾帶泥污 $30,000");
    }
    if (!player.inTruck && !M.data.tarp) setMarker(t.x, t.z);
    else if (!M.data.washed && player.inTruck) setMarker(M.data.washPos[0], M.data.washPos[1]);
    else setMarker(M.data.dump[0], M.data.dump[1]);
    if (d2(t.x, t.z, M.data.dump[0], M.data.dump[1]) < 8 && player.inTruck && M.data.tarp && M.data.washed) this.done();
  },
  done() {
    nextMission();
    say("老陳", ["收貨!泥頭冇撒、車轆乾淨,環保署都冇得告!去街口茶餐廳,判頭請你飲凍檸茶!"]);
  }
});
addMission({ // 5 收工
  title: "⑥ 收工!去茶餐廳",
  desc: "跟箭嘴去茶餐廳飲返杯凍檸茶,今日圓滿結束。",
  start() {
    const rp = roadPts.filter(p => { const d = d2(p[0], p[1], GATE[0], GATE[1]); return d > 150 && d < 300; });
    M.data.cafe = rp.length ? rp[randi(0, rp.length - 1)] : [GATE[0] + 200, GATE[1]];
    setMarker(M.data.cafe[0], M.data.cafe[1]);
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), new THREE.MeshBasicMaterial({ map: neonTex("茶餐廳", "#ff5f8a"), side: THREE.DoubleSide }));
    neon.position.set(M.data.cafe[0], 5, M.data.cafe[1]); scene.add(neon);
  },
  tick() { if (d2(player.x, player.z, M.data.cafe[0], M.data.cafe[1]) < 5 && !player.inTruck) this.done(); },
  done() {
    M.idx = 99; setMarker(null); sCash();
    /* 安全獎(做得好有獎!) */
    const bonusTxt = [];
    if (player.warnings === 0) { player.wage += 500; bonusTxt.push("零警告 · 安全獎 +$500 🏅"); }
    if (!(M.data.fines > 0)) { player.wage += 200; bonusTxt.push("零環保罰款 · 環保之星 +$200 🌱"); }
    if (player.safeAwards) bonusTxt.push(`在職安全獎 ×${player.safeAwards} 🏅`);
    const net = player.wage;
    $("endText").innerHTML = `今日完工!入職、外賣、搬磚、天秤、環保斗車全部搞掂。<br>警告紀錄:${player.warnings} 個 · 行政費罰款:$${M.data.fines || 0} · 工傷次數:${M.data.hurts || 0}` +
      (bonusTxt.length ? `<br><span style="color:#7ef08a">${bonusTxt.join("<br>")}</span>` : "");
    $("endWage").textContent = `今日人工 $${net}`;
    $("ending").style.display = "flex";
  }
});
function nextMission() {
  M.idx++; M.stage = 0; M.data = M.data || {};
  const m = missions[M.idx];
  if (m) { m.start(); $("missionCard").querySelector(".mt").textContent = m.title; $("missionCard").querySelector(".md").textContent = m.desc; }
}

/* ---------- 碰撞 ---------- */
function collide(px, pz, r) {
  let x = px, z = pz;
  for (const c of colliders) {
    if (x < c.minx - r || x > c.maxx + r || z < c.minz - r || z > c.maxz + r) continue;
    const cos = Math.cos(c.rot), sin = Math.sin(c.rot);
    const dx = x - c.x, dz = z - c.z;
    let lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    const cx = clamp(lx, -c.hw, c.hw), cz = clamp(lz, -c.hd, c.hd);
    const ox = lx - cx, oz = lz - cz;
    const dist = Math.hypot(ox, oz);
    if (dist < r && dist > 1e-6) {
      const push = (r - dist) / dist;
      lx = cx + ox / dist * r; lz = cz + oz / dist * r;
      x = c.x + lx * cos + lz * sin; z = c.z - lx * sin + lz * cos;
    } else if (dist < 1e-6) { // 喺入面:推去最近邊
      const px2 = c.hw - Math.abs(lx), pz2 = c.hd - Math.abs(lz);
      if (px2 < pz2) lx = Math.sign(lx || 1) * (c.hw + r); else lz = Math.sign(lz || 1) * (c.hd + r);
      x = c.x + lx * cos + lz * sin; z = c.z - lx * sin + lz * cos;
    }
  }
  // 圍板(P1):主地盤邊界 — 每條 edge 只喺 opening 闊度內留口,同視覺圍板共用數據。
  // 行人閘:開口(siteGuard 全周界守衛負責未 admitted 擋人)。
  // 車閘:行人/其他物體視為實體;泥頭車 12m 內 barrier 升起先可以過。
  const vehGate = MAIN_OPENINGS.list.find(o => o.type === "vehicle");
  const vehSolid = vehGate && !vehicleGateOpen();
  for (let i = 0; i < MAIN_SITE.pts.length; i++) {
    const [ax, az] = MAIN_SITE.pts[i], [bx, bz] = MAIN_SITE.pts[(i + 1) % MAIN_SITE.pts.length];
    const L = Math.hypot(bx - ax, bz - az);
    // 沿 edge 切出實體 subsegments(0..t0, t1..L...)
    const cuts = [];
    for (const o of MAIN_OPENINGS.list) {
      if (o.edge !== i) continue;
      if (o.type === "vehicle" && vehSolid) continue; // 車閘閂住:成段照撞
      cuts.push([Math.max(0, o.t0), Math.min(L, o.t1)]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const segs = [];
    let cur = 0;
    for (const [s0, s1] of cuts) { if (s0 > cur) segs.push([cur, s0]); cur = Math.max(cur, s1); }
    if (cur < L) segs.push([cur, L]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < .05) continue;
      const sx = lerp(ax, bx, s0 / L), sz = lerp(az, bz, s0 / L), ex = lerp(ax, bx, s1 / L), ez = lerp(az, bz, s1 / L);
      const dd = distToSeg(x, z, sx, sz, ex, ez);
      if (dd < r + .35 && dd > 1e-6) {
        const sl2 = (ex - sx) ** 2 + (ez - sz) ** 2;
        const t = ((x - sx) * (ex - sx) + (z - sz) * (ez - sz)) / Math.max(sl2, 1e-9);
        const gx = lerp(sx, ex, clamp(t, 0, 1)), gz = lerp(sz, ez, clamp(t, 0, 1));
        const dl = Math.hypot(x - gx, z - gz) || 1;
        x = gx + (x - gx) / dl * (r + .36); z = gz + (z - gz) / dl * (r + .36);
      }
    }
  }
  return [x, z];
}

/* ---------- 玩家控制 ---------- */
const keys = {};
addEventListener("keydown", e => {
  keys[e.code] = true;
  if (QUIZ_STATE.open) { const d = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code]; if (d !== undefined) quizAnswer(d); return; }
  if (BP_STATE.open) { if (e.code === "KeyE" || e.code === "Space") bpHit(); return; }
  if (e.code === "KeyE") doInteract();
  if (e.code === "KeyG") dropItem();
  if (e.code === "KeyM") { AU.muted = !AU.muted; toast(AU.muted ? "🔇 靜音" : "🔊 開聲"); if (AU.engineGain) AU.engineGain.gain.value = 0; }
  if (e.code === "Escape") togglePause();
  if (e.code === "Space" && !player.inTruck && player.y <= 0.01 && dlgActive === null) player.vy = 5.2;
});
addEventListener("keyup", e => keys[e.code] = false);
let camYaw = Math.PI, camDist = 8.5, manualCamT = 0;
renderer.domElement.addEventListener("pointerdown", e => { renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement._px = e.clientX; renderer.domElement._py = e.clientY; });
renderer.domElement.addEventListener("pointermove", e => {
  if (renderer.domElement._px === undefined) return;
  const dx = e.clientX - renderer.domElement._px, dy = e.clientY - renderer.domElement._py;
  renderer.domElement._px = e.clientX; renderer.domElement._py = e.clientY;
  if (Math.abs(dx) > Math.abs(dy)) { camYaw -= dx * .006; manualCamT = 2.5; }
});
renderer.domElement.addEventListener("pointerup", e => { renderer.domElement._px = undefined; });
addEventListener("wheel", e => { camDist = clamp(camDist + e.deltaY * .008, 5, 18); });

/* 觸控搖桿 */
const touch = { active: false, x: 0, z: 0, run: false, id: null };
if ("ontouchstart" in window) {
  $("joy").style.display = "block"; $("btns").style.display = "flex";
  const joy = $("joy"), base = $("joyBase"), knob = $("joyKnob");
  joy.addEventListener("touchstart", e => {
    const t = e.changedTouches[0]; touch.id = t.identifier; touch.active = true;
    base.style.display = knob.style.display = "block";
    base.style.left = (t.clientX - 55) + "px"; base.style.top = (t.clientY - 55) + "px";
    knob.style.left = (t.clientX - 26) + "px"; knob.style.top = (t.clientY - 26) + "px";
    touch._bx = t.clientX; touch._by = t.clientY; e.preventDefault();
  }, { passive: false });
  joy.addEventListener("touchmove", e => {
    for (const t of e.changedTouches) if (t.identifier === touch.id) {
      let dx = t.clientX - touch._bx, dz = t.clientY - touch._by;
      const L = Math.hypot(dx, dz) || 1, k = Math.min(L, 48) / L;
      knob.style.left = (touch._bx + dx * k - 26) + "px"; knob.style.top = (touch._by + dz * k - 26) + "px";
      touch.x = dx * k / 48; touch.z = dz * k / 48;
    }
    e.preventDefault();
  }, { passive: false });
  const endT = e => { for (const t of e.changedTouches) if (t.identifier === touch.id) { touch.active = false; touch.x = touch.z = 0; base.style.display = knob.style.display = "none"; } };
  joy.addEventListener("touchend", endT); joy.addEventListener("touchcancel", endT);
  $("tRun").addEventListener("touchstart", e => { touch.run = !touch.run; $("tRun").style.background = touch.run ? "rgba(255,190,60,.4)" : "rgba(20,14,32,.6)"; e.preventDefault(); }, { passive: false });
  $("tE").addEventListener("touchstart", e => { doInteract(); e.preventDefault(); }, { passive: false });
}

function playerMove(dt) {
  if (inductionMode || QUIZ_STATE.open || BP_STATE.open) { player.h.animate(dt,0); return; }
  if (player.freeze > 0) { player.freeze -= dt; player.h.animate(dt, 0); return; }
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (touch.active) { ix = touch.x; iz = touch.z; }
  const L = Math.hypot(ix, iz);
  const wantRun = (keys.ShiftLeft || keys.ShiftRight || touch.run) && player.stamina > 2;
  let speed = 0;
  if (L > .12) {
    const ang = Math.atan2(iz, ix);
    const world = camYaw + ang - Math.PI / 2;
    const run = wantRun && !player.inTruck;
    speed = run ? 6.8 : (player.carrying ? 2.6 : 3.5);
    player.heading = angLerp(player.heading, world, 1 - Math.pow(.0001, dt));
    let nx = player.x + Math.cos(player.heading) * speed * dt * Math.min(L, 1);
    let nz = player.z + Math.sin(player.heading) * speed * dt * Math.min(L, 1);
    [nx, nz] = collide(nx, nz, .45);
    /* 閘機:未完成入職檢查唔入得 */
    if (!player.registered && d2(nx, nz, GATE[0], GATE[1]) < 3.4) {
      nx = GATE[0] + Math.cos(GATE_OUT) * 4; nz = GATE[1] + Math.sin(GATE_OUT) * 4;
      if (!player._gateT || performance.now() - player._gateT > 3200) {
        player._gateT = performance.now();
        toast("⛔ 閘機紅燈:未完成安全訓練+量血壓,唔入得!"); beep(240, .3, "square", .25);
      }
    }
    player.x = nx; player.z = nz;
    if (run) { player.stamina = Math.max(0, player.stamina - dt * 10); player._lastSprintEnd = performance.now(); }
  } else if (!wantRun) player.stamina = Math.min(100, player.stamina + dt * 7);
  if (wantRun && L < .12) player.stamina = Math.min(100, player.stamina + dt * 4);
  player.speed = speed;
  // 跳
  if (player.vy !== 0 || player.y > 0) { player.vy -= 14 * dt; player.y += player.vy * dt; if (player.y <= 0) { player.y = 0; player.vy = 0; } }
  player.h.g.position.set(player.x, player.y, player.z);
  player.h.g.rotation.y = -player.heading + Math.PI / 2;
  player.h.animate(dt, speed, clamp(speed - 3, 0, 1) * .1);
  // 荷載顯示
  if (player.carrying && !player._carryMesh) {
    player._carryMesh = new THREE.Mesh(new THREE.BoxGeometry(.6, .4, .6), new THREE.MeshLambertMaterial({ color: 0xc8a86a }));
    player._carryMesh.position.set(0, 1.52, .42); player.h.g.add(player._carryMesh);
  }
  if (player._carryMesh) player._carryMesh.visible = !!player.carrying;
}

/* ---------- 互動 ---------- */
function nearestInteract() {
  let best = null, bd = 1e9;
  for (const it of interactables) {
    if (!it.active) continue;
    const d = d2(player.x, player.z, it.x, it.z);
    if (d < (it.r || 2.6)) { if (d < bd) { bd = d; best = it; } }
  }
  // 斗車
  const td = d2(player.x, player.z, playerTruck.x, playerTruck.z);
  if (td < 4.5 && !player.inTruck && td < bd) best = { label: player.inTruck ? "" : "上/落斗車", action: toggleTruck, truck: true };
  return best;
}
function doInteract() {
  if (dlgActive) { dlgNext(); return; }
  if (player.inTruck) { toggleTruck(); return; }
  const it = nearestInteract();
  if (it) { sClick(); it.action(); return; }
  if (_nearNpc) { // 同NPC傾偈(情緒+TTS)
    const rk = roleKeyOf(_nearNpc);
    const lines = ROLE_LINES[rk] || [];
    const mood = _nearNpc.mood || "chat";
    const pool = MOOD_LINES[mood] ? MOOD_LINES[mood].concat(lines) : lines;
    npcSay(_nearNpc, pool[randi(0, pool.length - 1)]);
    _nearNpc.mood = "chat";
    return;
  }
}
/* 掟低手上嘢 — 跳起掟=高空擲物(真實罰則$2,000) */
function dropItem() {
  if (dlgActive || !player.carrying) return;
  if (player.y > 1.0) violate(2, "高空擲物!", 150, "高空擲物 $2,000");
  else toast("放低咗手上嘢");
  player.carrying = null;
  const it = player._carryIt;
  if (it) {
    it.active = true; it.mesh.visible = true;
    it.x = player.x + Math.cos(player.heading) * 1.2; it.z = player.z + Math.sin(player.heading) * 1.2;
    it.mesh.position.set(it.x, 0, it.z);
    player._carryIt = null;
  }
}
function toggleTruck() {
  if (!player.inTruck) {
    if (M.idx < 4) { violate(2, "偷開斗車!?未經授權操作機械", 100, "未經授權操作機械"); }
    player.inTruck = true; player.h.g.visible = false; engineStart(); toast("上咗斗車 (E 落車)");
  } else {
    player.inTruck = false; playerTruck.v = 0; engineStop();
    const ox = Math.cos(playerTruck.heading + Math.PI / 2) * 2.6;
    const oz = Math.sin(playerTruck.heading + Math.PI / 2) * 2.6;
    player.x = playerTruck.x + ox; player.z = playerTruck.z + oz;
    player.h.g.visible = true; toast("落咗車");
  }
}
function truckDrive(dt) {
  if (!player.inTruck) return;
  let thr = 0, steer = 0;
  if (keys.KeyW || keys.ArrowUp) thr = 1;
  if (keys.KeyS || keys.ArrowDown) thr = -1;
  if (keys.KeyA || keys.ArrowLeft) steer = 1;
  if (keys.KeyD || keys.ArrowRight) steer = -1;
  if (touch.active) { thr = -touch.z; steer = -touch.x; }
  const t = playerTruck;
  if (thr > 0) t.v = Math.min(t.v + 7 * dt, 10);
  else if (thr < 0) t.v = Math.max(t.v - 9 * dt, -4.5);
  else t.v *= Math.pow(.3, dt);
  if (Math.abs(t.v) > .1) t.heading += steer * dt * 1.7 * clamp(Math.abs(t.v) / 6, .25, 1) * Math.sign(t.v);
  let nx = t.x + Math.cos(t.heading) * t.v * dt;
  let nz = t.z + Math.sin(t.heading) * t.v * dt;
  const [cx2, cz2] = collide(nx, nz, 2.1);
  if (d2(cx2, cz2, nx, nz) > .05) { if (Math.abs(t.v) > 6) { sThud(); violate(1, "撞嘢!危險駕駛", 50); } t.v = -t.v * .25; }
  t.x = cx2; t.z = cz2;
  /* 環保:地盤內高速揚塵 */
  if (Math.abs(t.v) > 6 && pointInPoly(t.x, t.z, MAIN_SITE.pts) && (!t._dustT || performance.now() - t._dustT > 9000)) {
    const nearOff = officers.some(o => d2(o.x, o.z, t.x, t.z) < 22);
    if (nearOff) { t._dustT = performance.now(); violate(1, "未有妥善控制塵埃", 150, "空氣污染管制 $20,000"); }
  }
  t.g.position.set(t.x, 0, t.z); t.g.rotation.y = t.heading;
  t.wheels.forEach(w => w.rotation.z -= t.v * dt * 1.8);
  t.beacon.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xffaa20 : 0x552200);
  engineSpeed(t.v);
  if (thr < 0 && t.v < -.5 && Math.floor(performance.now() / 1100) !== t._beepT) { t._beepT = Math.floor(performance.now() / 1100); sRev(); }
  player.x = t.x; player.z = t.z;
}

/* ---------- 白帽 AI ---------- */
function officerSay() {
  const lines = ["「喂!站住!平安卡拎出嚟睇下!」",
    "「你頂帽帶呢?未有扣好帽帶,違規!」",
    "「喺地盤奔跑?危險行為,寫報告!」",
    "「安全鞋帶都未綁好?我望住你先肯做嘢?」",
    "「亂咁擺嘢,阻塞走火通道!」",
    "「你知唔知塵埃飛揚要灑水壓塵?環保條例罰$20,000㗎!」",
    "「晨操開會又唔見你人?缺席要罰行政費!」",
    "「唔經指定入口入嚟?登記咗未啊?」",
    "「反光衣著好未?唔好俾我影到你!」"];
  return lines[randi(0, lines.length - 1)];
}
/* 違規罰款(參考真實地盤行政費清單) */
/* ===== 財務分層(specs§7):行政費入項目成本,唔扣人工 ===== */
const LEDGER = { wage: 0, projectCost: 0, safety: [] };
function violate(n, msg, gameFee, source) {
  addStars(n, msg);
  if (gameFee) {
    LEDGER.projectCost += gameFee; // 分判行政費→項目成本(唔係工人人工)
    LEDGER.safety.push({ msg, fee: gameFee, source: source || "本項目設定", t: Math.floor(performance.now() / 1000) });
    toast(`📋 項目成本 +$${gameFee}(行政費,唔扣人工)`);
  }
}
function updateOfficers(dt) {
  let anyChase = false;
  for (const o of officers) {
    if (PIT_ACCIDENT.active && PIT_ACCIDENT.stage === "injured" && o === officers[0]) continue;
    const dP = d2(o.x, o.z, player.x, player.z);
    const seePlayer = dP < (player.stars > 0 ? 60 : 20) && !player.inTruck || (dP < 26 && player.inTruck);
    if (o.state === "patrol") {
      if (!o.wp || d2(o.x, o.z, o.wp[0], o.wp[1]) < 3 || o.wpT > 18) {
        const cands = roadPts.filter(p => d2(p[0], p[1], o.home[0], o.home[1]) < 130);
        o.wp = cands.length ? cands[randi(0, cands.length - 1)] : [o.home[0] + rand(-50, 50), o.home[1] + rand(-50, 50)];
        o.wpT = 0;
      }
      o.wpT += dt;
      const a = Math.atan2(o.wp[1] - o.z, o.wp[0] - o.x);
      o.heading = angLerp(o.heading, a, 1 - Math.pow(.001, dt));
      const sp = 1.7;
      let nx = o.x + Math.cos(o.heading) * sp * dt, nz = o.z + Math.sin(o.heading) * sp * dt;
      [nx, nz] = collide(nx, nz, .45); o.x = nx; o.z = nz;
      /* LOD:遠於60米NPC隔幀更新動畫(53個V2 rig重幾何) */
      const dP = d2(o.x, o.z, player.x, player.z);
      o._lod = ((o._lod || 0) + 1) % (dP > 60 ? 4 : 1);
      if (o._lod === 0 || dP < 25) o.h.animate(dt * (dP > 60 ? 4 : 1), 1.7);
      // 發現玩家
      const angToP = Math.atan2(player.z - o.z, player.x - o.x);
      let dA = Math.abs(((angToP - o.heading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if ((player.stars > 0 && dP < 42) || (dP < 15 && dA < 1.25 && player.speed > 5)) {
        o.state = "chase"; o.mark.visible = true; sAlarm(); toast("❗ 白帽安全主任發現你!");
      }
    } else if (o.state === "chase") {
      anyChase = true;
      const a = Math.atan2(player.z - o.z, player.x - o.x);
      o.heading = angLerp(o.heading, a, 1 - Math.pow(.0005, dt));
      const sp = player.inTruck ? 6.2 : 5.1;
      let nx = o.x + Math.cos(o.heading) * sp * dt, nz = o.z + Math.sin(o.heading) * sp * dt;
      [nx, nz] = collide(nx, nz, .45); o.x = nx; o.z = nz;
      o.h.animate(dt, 4.2, .12);
      if (dP < 1.5 && player.invuln <= 0) { // 捉到
        caught(o); o.state = "return"; o.mark.visible = false; o.wp = null;
      } else if (dP > 34) { o.loseT += dt; if (o.loseT > 4) { o.state = "patrol"; o.mark.visible = false; o.loseT = 0; toast("甩咗佢! +$10"); player.wage += 10; } }
      else o.loseT = 0;
    } else { // return
      const a = Math.atan2(o.home[1] - o.z, o.home[0] - o.x);
      o.heading = angLerp(o.heading, a, 1 - Math.pow(.001, dt));
      let nx = o.x + Math.cos(o.heading) * 2 * dt, nz = o.z + Math.sin(o.heading) * 2 * dt;
      [nx, nz] = collide(nx, nz, .45); o.x = nx; o.z = nz;
      o.h.animate(dt, 2);
      if (d2(o.x, o.z, o.home[0], o.home[1]) < 8) o.state = "patrol";
    }
    o.h.g.position.set(o.x, 0, o.z);
    o.h.g.rotation.y = -o.heading + Math.PI / 2;
  }
  AU.chaseTimer -= dt;
  if (anyChase && AU.chaseTimer <= 0) { sAlarm(); AU.chaseTimer = 1.4; }
}
function caught(o) {
  player.warnings++;
  player.stars = 0; player.freeze = 2.6; player.invuln = 4;
  sThud();
  say("白帽安全主任", [officerSay(), `警告 ${player.warnings}/3!再犯就要上安全再培訓堂!`], () => {
    if (player.warnings >= 3) busted();
  });
}
function busted() {
  player.warnings = 0; player.stars = 0; player.wage = Math.max(0, player.wage - 500);
  if (player.inTruck) toggleTruck();
  player.x = GATE[0]; player.z = GATE[1];
  $("busted").style.display = "flex";
}

/* ---------- 工友 ---------- */
function updateWorkers(dt) {
  const frame = (window.__animF = (window.__animF || 0) + 1); // P9.3:round-robin 動畫分批
  for (const w of workers) {
    if (w.injured) continue;
    const far = d2(w.x, w.z, player.x, player.z) > 60;
    if (w._rr0 === undefined) w._rr0 = randi(0, 2);
    const anim = !far || ((frame + w._rr0) % 3 === 0); // 遠角每3幀輪到一次,dt×3補償
    const adt = far ? dt * 3 : dt;
    if (w.stationary) { if (anim) w.h.animate(adt, 0); continue; }
    if (d2(w.x, w.z, player.x, player.z) > 130) { w.h.g.visible = false; continue; }
    w.h.g.visible = true;
    w.t -= dt;
    if (w.state === "idle" && w.t <= 0) {
      const zone = Math.random() < .7 ? MAIN_SITE : SITE2;
      const a = rand(0, Math.PI * 2), r = rand(2, Math.min(26, Math.sqrt(zone.area) * .5));
      w.target = [zone.c[0] + Math.cos(a) * r, zone.c[1] + Math.sin(a) * r];
      w.state = "walk"; w.t = 30;
    } else if (w.state === "walk") {
      if (!w.target || d2(w.x, w.z, w.target[0], w.target[1]) < 1 || w.t <= 0) { w.state = "idle"; w.t = rand(2, 7); }
      else {
        const a = Math.atan2(w.target[1] - w.z, w.target[0] - w.x);
        w.heading = angLerp(w.heading, a, 1 - Math.pow(.001, dt));
        let nx = w.x + Math.cos(w.heading) * 1.1 * dt, nz = w.z + Math.sin(w.heading) * 1.1 * dt;
        [nx, nz] = collide(nx, nz, .4); w.x = nx; w.z = nz;
        if (anim) w.h.animate(adt, 1.1);
      }
    } else if (anim) w.h.animate(adt, 0);
    w.h.g.position.set(w.x, 0, w.z);
    w.h.g.rotation.y = -w.heading + Math.PI / 2;
  }
}

/* ---------- 危險源 ---------- */
function damage(n, msg) {
  if (player.invuln > 0) return;
  player.hp -= n; player.invuln = 2; sThud(); toast("🚑 " + msg);
  dmgFlash();
  if (player.hp <= 0) hospitalize();
}
function dmgFlash() {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;inset:0;z-index:50;pointer-events:none;background:radial-gradient(ellipse at center,rgba(255,0,0,0) 40%,rgba(255,0,0,.45) 100%);transition:opacity .5s";
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.opacity = "0"; setTimeout(() => d.remove(), 520); });
}
function hospitalize() {
  M.data.hurts = (M.data.hurts || 0) + 1;
  player.wage = Math.max(0, player.wage - 300);
  if (player.inTruck) toggleTruck();
  $("hospText").textContent = "工傷入院觀察…人工 -$300。康復得七七八八,出院繼續開工!";
  $("hospital").style.display = "flex";
}
$("btnHosp").addEventListener("click", () => {
  $("hospital").style.display = "none";
  player.hp = 100; player.x = HOSPITAL[0] + 8; player.z = HOSPITAL[1] + 8; player.invuln = 3;
});
$("btnBust").addEventListener("click", () => { $("busted").style.display = "none"; player.hp = 100; });
$("btnFree").addEventListener("click", () => { $("ending").style.display = "none"; toast("自由活動!隨便周圍玩~"); });
$("btnResume").addEventListener("click", togglePause);

function addStars(n, msg) {
  player.stars = Math.min(3, player.stars + n); player.starTimer = 12;
  toast("⚠ " + msg); beep(300, .2, "square", .2);
}
function updateHazards(dt) {
  player.invuln -= dt;
  if (player.stars > 0) { player.starTimer -= dt; if (player.starTimer <= 0) { player.stars--; player.starTimer = 12; } }
  // 天秤
  for (const cr of cranes) {
    cr.phase += dt;
    const rot = cr.baseRot + Math.sin(cr.phase * .13) * 2.2;
    cr.top.rotation.y = -rot;
    const tro = (Math.sin(cr.phase * .09) * .5 + .5) * (cr.jibLen - 4) + 3;
    cr.trolley.position.x = tro;
    const swingA = Math.sin(cr.phase * .8) * .55;
    cr.hook.position.set(tro, -3.2 + Math.sin(cr.phase * .5) * 2.8, 0);
    cr.hook.rotation.z = swingA;
    cr.load.getWorldPosition(_v1);
    const loadX = _v1.x, loadZ = _v1.z, loadY = _v1.y;
    const dP = d2(player.x, player.z, loadX, loadZ);
    if (dP < 26 && loadY < 4) { /* 吊運範圍 */ }
    if (dP < 2.6 && loadY < 3.4 && Math.abs(cr.hook.rotation.z) > .18 && player.invuln <= 0 && !player.inTruck) {
      damage(35, "俾吊緊嘅貨撞親!(-35) 唔好行天秤下面!");
    }
    if (dP < 12 && player._craneWarnT === undefined) { }
  }
  if (cranes.length) {
    const c0 = cranes[0];
    c0.load.getWorldPosition(_v1);
    if (d2(player.x, player.z, _v1.x, _v1.z) < 20 && !player._craneWarn) { player._craneWarn = true; toast("⚠ 前方吊運中,小心吊墜物!"); setTimeout(() => player._craneWarn = false, 15000); }
  }
  // 挖掘機
  for (const ex of excavators) {
    ex.phase += dt;
    ex.armPivot.rotation.z = -.5 + Math.sin(ex.phase * .7) * .45;
    ex.stick.rotation.z = -.7 + Math.sin(ex.phase * .7 + 1.2) * .5;
    ex.g.rotation.y = Math.sin(ex.phase * .18) * .8;
    if (d2(player.x, player.z, ex.x, ex.z) < 3.6 && player.invuln <= 0 && !player.inTruck) damage(30, "太近挖掘機,俾機臂掃到!(-30)");
  }
  // 泥坑
  {
    const cos = Math.cos(PIT.rot), sin = Math.sin(PIT.rot);
    const dx = player.x - PIT.x, dz = player.z - PIT.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (!PIT.covered && Math.abs(lx) < PIT.hw && Math.abs(lz) < PIT.hd && !player.inTruck && player.invuln <= 0) {
      damage(30, "跌落泥坑!(-30) 坑邊要有圍欄先啱!");
      player.x = PIT.x + Math.cos(PIT.rot) * (PIT.hw + 2.5); player.z = PIT.z + Math.sin(PIT.rot) * (PIT.hd + 2.5);
    }
    /* 工友跌坑事件:附近工友隨機中招→跌入→工傷→安全主任到場(規格§5洞口/坑邊) */
    pitWorkerAccident(dt);
  }

  // NPC泥頭車
  {
    const t = npcTruck;
    if (t.mode === "drive") {
      const wp = t.route[t.wp];
      if (!wp) { t.mode = "reverse"; t.timer = 5; }
      else {
        const a = Math.atan2(wp[1] - t.z, wp[0] - t.x);
        t.heading = angLerp(t.heading, a, 1 - Math.pow(.002, dt));
        t.v = lerp(t.v, 8, dt);
        let nx = t.x + Math.cos(t.heading) * t.v * dt, nz = t.z + Math.sin(t.heading) * t.v * dt;
        [nx, nz] = collide(nx, nz, 2.1); t.x = nx; t.z = nz;
        if (d2(t.x, t.z, wp[0], wp[1]) < 6) t.wp++;
      }
    } else {
      t.timer -= dt; t.v = lerp(t.v, -2.2, dt * 2);
      let nx = t.x + Math.cos(t.heading) * t.v * dt, nz = t.z + Math.sin(t.heading) * t.v * dt;
      [nx, nz] = collide(nx, nz, 2.1); t.x = nx; t.z = nz;
      if (Math.floor(performance.now() / 1100) !== t._bt) { t._bt = Math.floor(performance.now() / 1100); if (d2(t.x, t.z, player.x, player.z) < 60) sRev(); }
      if (t.timer <= 0) { t.mode = "drive"; t.wp = 0; t.v = 0; }
    }
    t.g.position.set(t.x, 0, t.z); t.g.rotation.y = t.heading;
    t.wheels.forEach(w => w.rotation.z -= t.v * dt * 1.8);
    if (d2(t.x, t.z, player.x, player.z) < 3 && player.invuln <= 0) {
      damage(45, "俾泥頭車撞到!(-45) 佢倒緊車,聽到「比比」聲要讓開!");
      player.x += rand(-4, 4); player.z += rand(-4, 4);
    }
  }
  // 水馬撞跌
  for (let i = 0; i < barrier.state.length; i++) {
    const b = barrier.state[i];
    if (b.fly) continue;
    const src = player.inTruck ? { x: playerTruck.x, z: playerTruck.z, r: 2.4, sp: Math.abs(playerTruck.v) } : { x: player.x, z: player.z, r: .7, sp: player.speed };
    if (d2(src.x, src.z, b.x, b.z) < src.r + 1) {
      if (player.inTruck || player.speed > 4.5) {
        const a = Math.atan2(b.z - src.z, b.x - src.x);
        b.fly = true; b.vx = Math.cos(a) * (2 + src.sp * .6); b.vz = Math.sin(a) * (2 + src.sp * .6); b.spin = rand(-6, 6); b.y = .8;
        if (!player._barT || performance.now() - player._barT > 2500) { player._barT = performance.now(); violate(1, "撞跌水馬=移走安全圍欄", 100, "移走安全圍欄 $2,000"); sThud(); }
      } else if (player.speed > .5) {
        const a = Math.atan2(player.z - b.z, player.x - b.x);
        let nx = b.x + Math.cos(a) * 1.6, nz = b.z + Math.sin(a) * 1.6;
        [nx, nz] = collide(nx, nz, .45); player.x = nx; player.z = nz;
      }
    }
  }
  // 海水
  player._waterT = (player._waterT || 0) - dt;
  if (player._waterT <= 0 && !player.inTruck) {
    player._waterT = .6;
    for (const wb of waterBBoxes) {
      if (player.x < wb.minx || player.x > wb.maxx || player.z < wb.minz || player.z > wb.maxz) continue;
      if (pointInPoly(player.x, player.z, wb.pts)) {
        sSplash(); damage(25, "跌咗落海!(-25) 揀返上岸");
        const rp = nearestRoadPt(player.x, player.z);
        if (rp) { player.x = rp[0]; player.z = rp[1]; }
        break;
      }
    }
  }
  // 未登記擅入第二個地盤
  if (!player.registered && !player._site2Fined && pointInPoly(player.x, player.z, SITE2.pts)) {
    player._site2Fined = true;
    violate(1, "未有經指定入口登記進入地盤!", 150, "未有登記進入地盤 $3,000");
  }
}
/* ===== 工友泥坑意外:隨機工友跌入→工傷→白帽到場處理→救起覆檢 ===== */
const PIT_ACCIDENT = { active: false, cd: 45000, victim: null, stage: "", t: 0 };
function pitWorkerAccident(dt) {
  const A = PIT_ACCIDENT;
  if (!A.active) {
    if (PIT.covered) return;
    A.cd -= dt * 1000;
    if (A.cd <= 0) {
      // 揀一個泥坑附近(12米內)嘅工友做苦主
      const near = workers.filter(w => d2(w.x, w.z, PIT.x, PIT.z) < 12);
      if (near.length) {
        A.victim = near[randi(0, near.length - 1)]; A.victim.injured = true; A.active = true; A.stage = "falling"; A.t = 0;
        // 拖苦主入坑中心+跌落
        A.victim.h.g.position.set(PIT.x, 0, PIT.z);
        A.victim.x = PIT.x; A.victim.z = PIT.z;
        sThud(); toast("🚨 意外!有工友跌入泥坑!");
        if (typeof ttsSpeak === "function") ttsSpeak("哎吔!有人跌咗落坑!", "yue_adult_male");
      } else A.cd = 30000;
    }
    return;
  }
  const v = A.victim;
  A.t += dt;
  if (A.stage === "falling") { // 跌落動畫:沉入+傾斜
    v.h.g.rotation.x = Math.min(.5, A.t * 1.2);
    v.h.g.position.y = -Math.min(1.1, A.t * .8);
    if (A.t > 1.2) { A.stage = "injured"; A.t = 0; toast("🚑 工友工傷!安全主任趕緊到場!"); beep(500, .2, "square", .3); beep(650, .25, "square", .3, .25); }
  } else if (A.stage === "injured") { // 躺喺坑度叫救命
    v.h.g.rotation.x = Math.PI / 2 * .9;
    v.h.g.position.y = -0.9 + Math.sin(A.t * 6) * .03; // 微微掙扎
    if (officers[0]) { // 白帽跑埋去
      const o = officers[0];
      const ang = Math.atan2(PIT.z - o.z, PIT.x - o.x);
      o.x += Math.cos(ang) * 5 * dt; o.z += Math.sin(ang) * 5 * dt;
      o.h.g.position.set(o.x, 0, o.z);
      if (d2(o.x, o.z, PIT.x, PIT.z) < 3) { A.stage = "rescue"; A.t = 0; if (o.label) toast("🦺 安全主任:唔好心郁!我嚟救!"); }
    }
  } else if (A.stage === "rescue") { // 救起:升返地面+企返好
    v.h.g.rotation.x = Math.max(0, Math.PI / 2 * .9 - A.t * 1.5);
    v.h.g.position.y = Math.min(0, -0.9 + A.t * .8);
    if (A.t > 1.8) {
      v.h.g.rotation.x = 0; v.h.g.position.y = 0; v.injured = false; v.state = "idle"; v.t = 5;
      v.x = PIT.x + PIT.hw + 4; v.z = PIT.z;
      v.h.g.position.set(v.x, 0, v.z);
      toast("✅ 工友已移到安全位置，安排檢查；洞口仍需蓋好");
      if (typeof ttsSpeak === "function") ttsSpeak("救到喇!送醫院先。坑邊要裝返圍欄!", "yue_adult_female");
      A.active = false; A.victim = null; A.cd = 90000; // 90秒後再有機會
    }
  }
}

/* ========== 新角色+互動+情緒+廣東話對白+TASK(門禁規格§4-5) ========== */
const NPC_MOOD = {};
const MOOD_LINES = {
  happy: ["今日天氣好,開工特別順!", "哈哈,做得幾靚仔喎!", "心情好,做嘢都快啲!"],
  tired: ["攰呀…唞陣先。", "做咗成朝,腰都直唔切。", "畀啲氣力我啦師傅。"],
  annoyed: ["喂!行開啲啦,阻住地球轉!", "你有冇睇路㗎?", "咪喺我度搞嚟搞去!"],
  nervous: ["琴日先鬧完,今日小心啲。", "白帽喺附近,收手啦。", "做錯嘢又要寫report…"],
  chat: ["喂,食咗飯未呀?", "琴日嗰碟叉燒飯真係正!", "聽朝早會記得早啲嚟。", "放工去唔去飲嘢?"]
};
const ROLE_LINES = {
  safetyTrainer: ["上完入職安全堂，就過嚟量血壓。未合格先休息，再安排重試。"],
  worker: ["做嘢慢慢嚟，安全最緊要。", "有咩要幫手，出聲啦。"],
  femaleWorker: ["搬磚搬到手都軟…你幫手呀?", "帽帶記得扣好,白帽成日查!", "你係新嚟嘅?多多指教!"],
  clerk: ["入職文件搞咗未?訓練堂上咗未?", "新工友要登記先可以入場。"],
  genAffairs: ["唔夠嘢用嚟搵我,手套水鞋都有。", "休息室有水,記得飲多啲。"],
  foreman: ["嗰邊搬緊料,行開啲!", "你嘅任務係跟住黃箭嘴行!"],
  officer: ["安全第一!帽帶扣好未?", "見到危險即刻話我知!"],
  machineOp: ["部機忙緊,行遠啲!", "倒車時唔准行過車尾!"]
};
let sitePeopleReady = false;
function spawnSitePeople() {
  if (sitePeopleReady) return;
  sitePeopleReady = true;
  const trainer = spawnWorker(BP_POS[0] + Math.cos(GATE_DIR_IN) * 1.5, BP_POS[1] + Math.sin(GATE_DIR_IN) * 1.5, {
    human: {vest:true, helmet:0xf4f4f4, clipboard:true}, role:"safetyTrainer", label:"安全督導員 · 入職健康檢查"
  });
  trainer.stationary = true;
  const F = { sex: "F" };
  const names = ["阿珍", "阿嫦", "細梅", "好姨"];
  for (let i = 0; i < 4; i++) {
    const a = rand(0, 6.28), r = rand(6, 20);
    const w = spawnWorker(MAIN_SITE.c[0] + Math.cos(a) * r, MAIN_SITE.c[1] + Math.sin(a) * r, {
      human: { vest: true, helmet: 0xffd23a, pants: 0x3a4a6a, boots: 0x4a2e1a, sex: "F", skin: [0xf0c8a0, 0xe8bd95, 0xdcae8a][i % 3] },
      label: "女工 · " + names[i], labelColor: "#ffd98a"
    });
    w.role = "femaleWorker"; w.mood = randi(0, 1) ? "chat" : "happy";
  }
  const c = spawnWorker(OFFICE[0] + Math.cos(GATE_DIR_IN + 2.1) * 10, OFFICE[1] + Math.sin(GATE_DIR_IN + 2.1) * 10, {
    human: { vest: true, helmet: 0xf4f4f4, vestColor: "#dce0e6", vestLabel: "地盤文員", shirt: 0xd8e0e8, pants: 0x22222a, boots: 0x1a1a1a, sex: "M", clipboard: true },
    label: "地盤文員 · 明仔", labelColor: "#ffd76e"
  });
  c.role = "clerk"; c.mood = "happy";
  const g = spawnWorker(OFFICE[0] + Math.cos(GATE_DIR_IN + 2.6) * 12, OFFICE[1] + Math.sin(GATE_DIR_IN + 2.6) * 12, {
    human: { vest: true, helmet: 0xf4f4f4, vestColor: "#e6e9ee", vestLabel: "地盤總務", shirt: 0xc8d0da, pants: 0x2a2a34, boots: 0x1a1a1a, sex: "F", skin: 0xf0c8a0 },
    label: "地盤總務 · May姐", labelColor: "#ffd76e"
  });
  g.role = "genAffairs"; g.female = true; g.mood = "happy";
}
function roleKeyOf(npc) { return npc.role || "worker"; }
function npcMoodOf(npc) { return npc.mood || "chat"; }
function npcSay(npc, line) {
  const nm = npc.name || "工友";
  say(String(nm).replace(/[^·\u4e00-\u9fff]/g, "") || "工友", [line], null);
  if (typeof ttsSpeak === "function") ttsSpeak(line, npc.female ? "yue_adult_female" : "yue_adult_male");
}
/* 互動:E掣對最近NPC(3米內)傾偈;推撞→嬲 */
let _nearNpc = null, _nearD = 99;
function updateNpcProximity() {
  _nearNpc = null; _nearD = 99;
  const check = (list, isOff) => {
    for (const n of list) {
      const d = d2(player.x, player.z, n.x, n.z);
      if (d < 3 && d < _nearD) { _nearD = d; _nearNpc = n; }
    }
  };
  check(workers, false); check(officers, true);
}
/* 玩家郁緊時撞埋去NPC→推撞(地盤經常) */
function npcBumpCheck(dt) {
  if (player.speed < 1.5 || dlgActive) return;
  for (const w of workers) {
    const d = d2(player.x, player.z, w.x, w.z);
    if (d < .9) {
      if (!w._bumpCd || performance.now() - w._bumpCd > 4000) {
        w._bumpCd = performance.now();
        w.mood = "annoyed";
        const line = MOOD_LINES.annoyed[randi(0, MOOD_LINES.annoyed.length - 1)];
        npcSay(w, line);
        const ang = Math.atan2(w.z - player.z, w.x - player.x);
        w.x += Math.cos(ang) * 1.2; w.z += Math.sin(ang) * 1.2;
        beep(180, .12, "square", .18);
      }
    }
  }
}
function sitePeopleTick(dt) {
  spawnSitePeople();
  updateNpcProximity();
  npcBumpCheck(dt);
  /* 提示最近NPC */
  const hint = document.getElementById("hint");
  if (_nearNpc && !dlgActive && hint) {
    hint.style.display = "block";
    hint.textContent = "E · 同" + (_nearNpc.name || "工友") + "傾偈";
  }
}
/* TASK流程:接單→領料→運送→交付→出糧(挂任務二送外賣示範) */
const TASKFLOW = { stage: "none", log: [] };
window.__taskflow = TASKFLOW;
/* 廣東話TTS */
let TTS_READY = null;
function ttsSpeak(text, speaker) {
  if (TTS_READY === false) return;
  fetch("http://127.0.0.1:9881/tts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speaker: speaker || "yue_adult_female", speed: 1.0 })
  }).then(res => {
    if (!res.ok) throw new Error(res.status);
    return res.blob();
  }).then(blob => {
    const a = new Audio(URL.createObjectURL(blob)); a.volume = .8; a.play().catch(() => {});
    TTS_READY = true;
  }).catch(e => { if (TTS_READY === null) { TTS_READY = false; console.warn("TTS不可用,只用字幕"); } });
}

const _v1 = new THREE.Vector3();

/* ---------- 小地圖 ---------- */
const mmBase = document.createElement("canvas"); mmBase.width = mmBase.height = 1024;
const WORLD_R = 1700;
{
  const g = mmBase.getContext("2d");
  const k = 1024 / (WORLD_R * 2);
  const T = (x, z) => [(x + WORLD_R) * k, (z + WORLD_R) * k];
  g.fillStyle = "#232030"; g.fillRect(0, 0, 1024, 1024);
  for (const w of WATERS) if (w.length >= 3) { g.fillStyle = "#274d70"; g.beginPath(); w.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); }
  for (const gp of GREENS) if (gp.length >= 3) { g.fillStyle = "#384a34"; g.beginPath(); gp.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); }
  for (const z of ZONES) if (z.length >= 3) { g.fillStyle = "#7a5c34"; g.beginPath(); z.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); }
  g.strokeStyle = "#5a5666";
  for (const r of ROADS) { if (r.w < 6) continue; g.lineWidth = r.w >= 12 ? 3 : 1.4; g.beginPath(); r.p.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); }
  g.fillStyle = "#8a8598";
  for (const b of BUILDINGS) { const [a, c] = T(b[0], b[1]); g.fillRect(a - Math.max(1, b[2] * k), c - Math.max(1, b[3] * k), Math.max(2, b[2] * 2 * k), Math.max(2, b[3] * 2 * k)); }
}
const mmCtx = $("mm").getContext("2d");
function drawMinimap() {
  const size = 360, view = 300; // 顯示半徑150m
  const k = 1024 / (WORLD_R * 2);
  mmCtx.clearRect(0, 0, size, size);
  const cx = (player.x + WORLD_R) * k, cz = (player.z + WORLD_R) * k;
  const sw = view * k;
  mmCtx.drawImage(mmBase, cx - sw / 2, cz - sw / 2, sw, sw, 0, 0, size, size);
  const W2C = (x, z) => [((x - player.x) / view + .5) * size, ((z - player.z) / view + .5) * size];
  // 目標
  if (M.target) {
    const [tx, tz] = W2C(M.target[0], M.target[1]);
    mmCtx.fillStyle = `rgba(255,70,70,${.5 + .5 * Math.sin(performance.now() / 200)})`;
    mmCtx.beginPath(); mmCtx.arc(clamp(tx, 10, size - 10), clamp(tz, 10, size - 10), 7, 0, 7); mmCtx.fill();
  }
  // 斗車
  { const [tx, tz] = W2C(playerTruck.x, playerTruck.z); mmCtx.fillStyle = "#6ae06a"; mmCtx.fillRect(tx - 4, tz - 4, 8, 8); }
  // NPC車
  { const [tx, tz] = W2C(npcTruck.x, npcTruck.z); mmCtx.fillStyle = "#e06a6a"; mmCtx.fillRect(tx - 4, tz - 4, 8, 8); }
  // 白帽
  mmCtx.fillStyle = "#fff";
  for (const o of officers) { const [tx, tz] = W2C(o.x, o.z); if (tx > 0 && tx < size && tz > 0 && tz < size) { mmCtx.beginPath(); mmCtx.arc(tx, tz, o.state === "chase" ? 5 : 3.5, 0, 7); mmCtx.fill(); } }
  // 工友
  mmCtx.fillStyle = "#ffd76e";
  for (const w of workers) { const [tx, tz] = W2C(w.x, w.z); if (tx > 0 && tx < size && tz > 0 && tz < size) mmCtx.fillRect(tx - 2, tz - 2, 4, 4); }
  // 玩家箭嘴
  const [px, pz] = W2C(player.x, player.z);
  mmCtx.save(); mmCtx.translate(px, pz); mmCtx.rotate(player.heading + Math.PI / 2);
  mmCtx.fillStyle = "#7ef08a"; mmCtx.beginPath(); mmCtx.moveTo(0, -9); mmCtx.lineTo(6, 7); mmCtx.lineTo(0, 3); mmCtx.lineTo(-6, 7); mmCtx.closePath(); mmCtx.fill(); mmCtx.restore();
}

/* ---------- HUD ---------- */
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = .12;
  $("cash").textContent = `人工 $${player.wage}`;
  $("starsBox").textContent = "⚠ " + "★".repeat(player.stars) + (player.stars ? "" : "0");
  $("warnBox").textContent = "警告 " + "●".repeat(player.warnings) + "○".repeat(3 - player.warnings);
  $("hpFill").style.width = clamp(player.hp, 0, 100) + "%";
  $("spFill").style.width = clamp(player.stamina, 0, 100) + "%";
  // 互動提示
  if (!player.inTruck && !dlgActive) {
    const it = nearestInteract();
    if (it) { $("hint").style.display = "block"; $("hint").textContent = `[E] ${it.label}`; }
    else $("hint").style.display = "none";
  } else if (player.inTruck) { $("hint").style.display = "block"; $("hint").textContent = "[E] 落車 · WASD揸車"; }
  else $("hint").style.display = "none";
  // 距離
  if (M.target) {
    const d = Math.round(d2(player.x, player.z, M.target[0], M.target[1]));
    $("missionCard").querySelector(".dist").textContent = `距離 ${d}m`;
  } else $("missionCard").querySelector(".dist").textContent = "";
}

function renderScene() {
  document.body.classList.toggle("in-induction", !!inductionMode);
  if (inductionMode === "training" || inductionMode === "health") {
    inductionView ||= createInductionRoom(makeHuman, canvasTex);
    inductionView.update(inductionMode,performance.now());
    renderer.render(inductionView.scene,inductionView.camera); return;
  }
  if (inductionMode === "gate") {
    const view = new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,4000);
    view.position.set(GATE[0]+Math.cos(GATE_OUT)*3,1.65,GATE[1]+Math.sin(GATE_OUT)*3);
    view.lookAt(GATE[0]+Math.cos(GATE_DIR_IN)*3,1.3,GATE[1]+Math.sin(GATE_DIR_IN)*3);
    for (const label of worldLabels) label.material.opacity=0;
    renderer.render(scene,view);return;
  }
  camera.updateMatrixWorld();
  const pos = new THREE.Vector3();
  const factor = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(innerHeight, 1);
  if (!(window.__iso && window.__iso.labels)) for (const label of worldLabels) { // P9.3 隔離開關
    label.getWorldPosition(pos);
    const distance = camera.position.distanceTo(pos);
    /* P10.5:標籤距離裁剪 — >32m 淡出,>42m 隱藏;近距離先顯示 */
    if (distance > 32) { label.material.opacity = Math.max(0, 1 - (distance - 32) / 10); if (distance > 42) { label.material.opacity = 0; continue; } }
    else label.material.opacity = THREE.MathUtils.clamp((distance - 2.5) / 3, 0, 1);
    const aspect = label.userData.labelAspect;
    const size = Math.min(label.userData.labelSize * .65, distance * factor * 28, distance * factor * 200 / aspect);
    label.scale.set(size * aspect, size, 1);
  }
  renderer.render(scene, camera);
}

/* ---------- 主循環 ---------- */
let paused = true, started = false, last = performance.now();
function togglePause() {
  if (!started) return;
  paused = !paused;
  $("pause").style.display = paused && !dlgActive ? "flex" : "none";
  if (paused) $("pause").style.display = "flex"; else $("pause").style.display = "none";
}
function startGame() {
  if (started || $("btnStart").disabled) return;
  started = true; paused = false;
  $("start").style.display = "none"; $("hud").style.display = "block";
  nextMission();
  say("老陳", ["阿明！到咗閘口喇。先報到、上安全堂，再量血壓同領PPE。", "跟住黃色箭嘴行，有問題搵地盤同事。", "安全第一，帽帶扣好先開工！"], null);
  try { auInit(); sClick(); } catch (error) { console.warn('音效未能啟動，遊戲繼續', error); }
}
$("btnStart").addEventListener("pointerdown", startGame);
$("btnStart").addEventListener("click", startGame);
/* ========== 門禁系統(specs/門禁規格§2):狀態機+全周界守衛+閘機狀態牌 ========== */
function accessState() {
  if (player.admitted && player.registered && player.ppe) return { id: "admitted", name: "✅ 可入施工區", next: null };
  if (player.registered && player.ppe) return { id:"ready", name:"拍卡入閘", reason:"訓練、健康及PPE已齊，到閘機按E拍卡", next:[GATE[0],GATE[1]] };
  if (player.registered) return { id: "ppewait", name: "🦺 PPE未齊", reason: "已過訓練+健康:去接待區裝備架領PPE(E)再入場", next: [PPE_POS[0], PPE_POS[1]] };
  if (M.data.quizDone && BP_STATE.lastFail) return { id: "healthretry", name: "🩺 健康檢查未合格", reason: "暫停入場，休息後返血壓站重試（遊戲節奏測試）", next: [BP_POS[0], BP_POS[1]] };
  if (M.data.quizDone) return { id: "healthwait", name: "🩺 健康待評估", reason: "已上堂,未量血壓:去血壓站(綠色箭嘴)", next: [BP_POS[0], BP_POS[1]] };
  if (M.data.introDone) return { id: "trainwait", name: "📚 訓練待完成", reason: "未上安全訓練堂:去訓練室(跟任務箭嘴)", next: [TRAIN_POS[0], TRAIN_POS[1]] };
  return { id: "unreg", name: "🚫 未登記", reason: "未完成入職:搵閘口老陳報到", next: [GATE[0], GATE[1]] };
}
let _gateLabel = null, _gateLabelState = "";
/* R8真閘機重建:有頂貨櫃通道+三棍轉閘+面容識別屏+行人通道黃牌(用戶實拍照) */
let _gateBuilt = false;
function buildGatehouse() {
  if (_gateBuilt) return; _gateBuilt = true;
  const gd = GATE_DIR_IN, gx = Math.cos(gd), gz = Math.sin(gd);
  const pxv = -gz, pzv = gx; // 橫向
  const house = new THREE.Group();
  const wallM = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
  const blueM = new THREE.MeshLambertMaterial({ color: 0x2a6ad0 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(.2, 2.6, 8), wallM);
    w.position.set(s * 2.6, 1.3, 0); w.castShadow = true; house.add(w);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(.26, 2.6, .3), blueM);
    trim.position.set(s * 2.6, 1.3, 3.9); house.add(trim);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, .18, 8.6), wallM);
  roof.position.y = 2.72; roof.castShadow = true; house.add(roof);
  /* P10.2:結構柱+屋簷邊(drip edge) */
  for (const [sx, sz] of [[-2.6, -3.9], [-2.6, 3.9], [2.6, -3.9], [2.6, 3.9]]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(.24, 2.6, .24), new THREE.MeshLambertMaterial({ color: 0x8a9096 }));
    col.position.set(sx, 1.3, sz); col.castShadow = true; house.add(col);
  }
  const edge = new THREE.Mesh(new THREE.BoxGeometry(5.8, .12, .22), blueM);
  edge.position.set(0, 2.66, 4.32); house.add(edge);
  const edge2 = edge.clone(); edge2.position.z = -4.32; house.add(edge2);
  const armM = new THREE.MeshLambertMaterial({ color: 0xb8bcc2 });
  for (let i = -1; i <= 1; i++) {
    /* P10.1:stainless steel housing(圓角柱身)+底座plate+頂蓋,唔再係裸方柱 */
    const steelM = new THREE.MeshStandardMaterial({ color: 0xb9bfc6, roughness: .28, metalness: .85 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: .5, metalness: .4 });
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, 1.1, 12), steelM);
    housing.position.set(i * 1.75, .55, 0); housing.castShadow = true; house.add(housing);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.26, .24, .12, 12), darkM);
    top.position.set(i * 1.75, 1.16, 0); house.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.66, .06, .6), darkM);
    base.position.set(i * 1.75, .03, 0); house.add(base);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.05, .5), new THREE.MeshLambertMaterial({ color: 0xa9b0b8 }));
    post.visible = false; house.add(post); // 舊方柱停用(保留結構避免index依賴)
    for (const a of [0, 2.09, 4.19]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 1.7, 8), armM);
      arm.rotation.z = Math.PI / 2; arm.rotation.y = a;
      arm.position.set(i * 1.75, 1.02, 0); house.add(arm);
    }
  }
  for (const [i, h] of [[-0.9, 1.35], [0.9, 1.35]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, h, 6), new THREE.MeshLambertMaterial({ color: 0x888c92 }));
    pole.position.set(i, h / 2, 1.1); house.add(pole);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(.42, .62, .05), new THREE.MeshLambertMaterial({ color: 0x14161c }));
    scr.position.set(i, h + .31, 1.1); house.add(scr);
  }
  const sign = canvasTex(512, 128, g => { g.fillStyle = "#e8c020"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#1c1c1c"; g.font = "900 52px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center"; g.fillText("行人通道 請靠左", 256, 82); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .85), new THREE.MeshBasicMaterial({ map: sign, side: THREE.DoubleSide }));
  sp.position.set(0, 2.35, -4.35); sp.rotation.y = Math.PI; house.add(sp);
  house.position.set(GATE[0], 0, GATE[1]);
  house.rotation.y = Math.PI / 2 - GATE_DIR_IN;
  scene.add(house);
  colliders.push({ x: GATE[0] - pxv * 2.6, z: GATE[1] - pzv * 2.6, hw: .1, hd: 4, rot: Math.PI / 2 - GATE_DIR_IN, minx: 0, maxx: 0, minz: 0, maxz: 0 });
  colliders.push({ x: GATE[0] + pxv * 2.6, z: GATE[1] + pzv * 2.6, hw: .1, hd: 4, rot: Math.PI / 2 - GATE_DIR_IN, minx: 0, maxx: 0, minz: 0, maxz: 0 });
  // P8c:三棍閘機身碰撞體(3條通道,行人要經通道行,唔可以穿機)
  for (let i = -1; i <= 1; i++) {
    const cx = GATE[0] + pxv * i * 1.75, cz = GATE[1] + pzv * i * 1.75;
    colliders.push({ x: cx, z: cz, hw: .32, hd: .32, rot: 0, minx: cx - .5, maxx: cx + .5, minz: cz - .5, maxz: cz + .5 });
  }
}
/* ========== P1:車輛閘門(visual barrier)+行人通道+周界 debug overlay ========== */
const VEH_GATE = MAIN_OPENINGS.list.find(o => o.type === "vehicle");
const vehGate3 = { group: null, arm: null, open: false, amt: 0 };
{
  const g = VEH_GATE;
  if (g) {
    const grp = new THREE.Group();
    const postM = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
    const stripeM = new THREE.MeshLambertMaterial({ color: 0xd03030 });
    const whiteM = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.4, 1.5, .4), postM);
      post.position.set(s * g.width / 2, .75, 0); post.castShadow = true; grp.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.3, .18, .3), new THREE.MeshLambertMaterial({ color: g.type === "vehicle" ? 0xff3030 : 0x30ff60 }));
      lamp.position.set(s * g.width / 2, 1.62, 0); grp.add(lamp);
    }
    // 紅白格 barrier arm:局部 +x 沿閘口闊度,分 4 節紅白相間
    const arm = new THREE.Group();
    const segW = g.width / 6;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, .22, .14), i % 2 ? whiteM : stripeM);
      seg.position.set(segW * (i + .5), 0, 0); seg.castShadow = true; arm.add(seg);
    }
    arm.position.set(-g.width / 2, 1.15, 0);
    grp.add(arm);
    const sign = canvasTex(384, 128, gg => { gg.fillStyle = "#1c3a6a"; gg.fillRect(0, 0, 384, 128); gg.fillStyle = "#ffe08a"; gg.font = "900 54px 'Microsoft JhengHei',sans-serif"; gg.textAlign = "center"; gg.fillText("車輛通道 · 慢駛", 192, 82); });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(g.width * .8, 1), new THREE.MeshBasicMaterial({ map: sign, side: THREE.DoubleSide }));
    sp.position.set(0, 2.6, 0); grp.add(sp);
    grp.position.set(g.x, 0, g.z);
    grp.rotation.y = -Math.atan2(g.uz, g.ux);
    scene.add(grp);
    vehGate3.group = grp; vehGate3.arm = arm;
  }
}
function updateVehicleGate(dt) {
  if (!vehGate3.arm) return;
  const want = vehicleGateOpen();
  if (want !== vehGate3.open) {
    vehGate3.open = want;
    if (AU.ctx && !AU.muted) beep(want ? 880 : 520, .18, "sine", .18);
  }
  vehGate3.amt = lerp(vehGate3.amt, want ? 1 : 0, 1 - Math.pow(.005, dt));
  vehGate3.arm.rotation.z = vehGate3.amt * 1.15; // 升起
}
/* P8d:動態 shadow LOD — 角色/街車距玩家 >70m 閉投影(shadow pass 係主要成本) */
let _shadowLODT = 0;
function updateShadowLOD(now) {
  if (now - _shadowLODT < 500) return; _shadowLODT = now;
  const px = player.x, pz = player.z;
  const groups = [];
  for (const w of workers) groups.push(w.h.g);
  for (const o of officers) groups.push(o.h.g);
  for (const p of peds) groups.push(p.h.g);
  for (const c of traffic) groups.push(c.g);
  for (const g of groups) {
    if (!g) continue;
    const far = d2(g.position.x, g.position.z, px, pz) > 70;
    if (g.userData._shOn === !far) continue;
    g.userData._shOn = !far;
    g.traverse(o => { if (o.isMesh) o.castShadow = !far; });
  }
}
/* 行人通道(入閘後黃綠色帶+箭嘴,連接三棍閘→施工區) */
{
  const gd = GATE_DIR_IN;
  const tex = canvasTex(128, 512, g => {
    g.fillStyle = "#c8e090"; g.fillRect(0, 0, 128, 512);
    g.fillStyle = "#3a6a1a"; for (let y = 40; y < 512; y += 128) { g.beginPath(); g.moveTo(64, y); g.lineTo(24, y + 46); g.lineTo(52, y + 46); g.lineTo(52, y + 84); g.lineTo(76, y + 84); g.lineTo(76, y + 46); g.lineTo(104, y + 46); g.closePath(); g.fill(); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 24), new THREE.MeshLambertMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2 - gd;
  m.position.set(GATE[0] + Math.cos(gd) * 13, .06, GATE[1] + Math.sin(gd) * 13);
  m.receiveShadow = true; scene.add(m);
}
/* 周界 debug overlay(?boundary=1 或撳 B):cyan=collision 實體段,yellow=開口 */
let boundaryDebug = null, boundaryDebugOn = !!new URLSearchParams(location.search).get("boundary");
function buildBoundaryDebug() {
  if (boundaryDebug) { scene.remove(boundaryDebug); boundaryDebug.geometry.dispose(); boundaryDebug = null; }
  if (!boundaryDebugOn) return;
  const solid = [], open = [];
  const vehSolid = !vehicleGateOpen();
  for (let i = 0; i < MAIN_SITE.pts.length; i++) {
    const [ax, az] = MAIN_SITE.pts[i], [bx, bz] = MAIN_SITE.pts[(i + 1) % MAIN_SITE.pts.length];
    const L = Math.hypot(bx - ax, bz - az);
    const cuts = [];
    for (const o of MAIN_OPENINGS.list) {
      if (o.edge !== i) continue;
      if (o.type === "vehicle" && vehSolid) continue;
      cuts.push([Math.max(0, o.t0), Math.min(L, o.t1)]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    let cur = 0;
    const segs = [];
    for (const [s0, s1] of cuts) { if (s0 > cur) segs.push([cur, s0]); cur = Math.max(cur, s1); }
    if (cur < L) segs.push([cur, L]);
    const P = (arr, s0, s1) => arr.push(lerp(ax, bx, s0 / L), .35, lerp(az, bz, s0 / L), lerp(ax, bx, s1 / L), .35, lerp(az, bz, s1 / L));
    for (const [s0, s1] of segs) P(solid, s0, s1);
    for (const [s0, s1] of cuts) P(open, s0, s1);
  }
  const grp = new THREE.Group();
  const mk = (arr, color) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); grp.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }))); };
  mk(solid, 0x22ffee); mk(open, 0xffee22);
  boundaryDebug = grp; scene.add(grp);
}
buildBoundaryDebug();
addEventListener("keydown", e => { if (e.code === "KeyB") { boundaryDebugOn = !boundaryDebugOn; buildBoundaryDebug(); } });

/* ========== P3:閘口示範街景(只影響閘前 ~55m + 閘內第一段,遠景保留 InstancedMesh) ========== */
function buildDemoStreet() {
  const ped = MAIN_OPENINGS.list.find(o => o.type === "pedestrian"), veh = MAIN_OPENINGS.list.find(o => o.type === "vehicle");
  const { ax, az, ux, uz, edgeLen } = MAIN_OPENINGS;
  let nx = MAIN_SITE.c[0] - (ax + ux * edgeLen / 2), nz = MAIN_SITE.c[1] - (az + uz * edgeLen / 2); // 邊中點→質心 = 內側法線
  const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
  const rp = nearestRoadPt(ped.x, ped.z);
  const gap = rp ? Math.max(1.2, Math.hypot(ped.x - rp[0], ped.z - rp[1]) - rp[2] / 2 - .2) : 3.2; // 圍板→路邊距離
  const tA = Math.max(2, ped.t0 - 26), tB = Math.min(edgeLen - 2, veh.t1 + 14);
  const P = t => [ax + ux * t, az + uz * t];
  const len = tB - tA, mid = (tA + tB) / 2, [mx, mz] = P(mid);
  const rotY = -Math.atan2(uz, ux);
  /* 行人路 + 引路磚 + kerb — P4:CC0 concrete PBR,米制 scale(1 tile = 4m) */
  const swW = Math.min(4, gap + .8);
  const TL = new THREE.TextureLoader();
  const pbr = (base, w, h, tile) => {
    // P8a:只有 Color 用 sRGB;Normal/Roughness 係線性資料圖,唔可以錯當 sRGB
    const mk = (suf, srgb) => { const t = TL.load("assets/textures/" + base + "_" + suf + ".jpg"); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / tile, h / tile); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    return { map: mk("Color", true), roughnessMap: mk("Roughness", false), normalMap: mk("NormalGL", false) };
  };
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(len, swW), new THREE.MeshStandardMaterial({ ...pbr("Concrete034_1K-JPG", len, swW, 4), roughness: 1 }));
  sw.rotation.x = -Math.PI / 2; sw.rotation.z = rotY + Math.PI / 2;
  sw.position.set(mx - nx * (swW / 2 - .1), .15, mz - nz * (swW / 2 - .1)); sw.receiveShadow = true; scene.add(sw);
  /* P4:demo 路面 asphalt 覆蓋層(有 UV,米制 scale 1 tile = 5m) */
  {
    const rd = rp ? Math.hypot(ped.x - rp[0], ped.z - rp[1]) : 5, roadW = rp ? rp[2] : 10;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(len + 24, roadW - .4), new THREE.MeshStandardMaterial({ ...pbr("Asphalt007_512-JPG", len + 24, roadW - .4, 5), roughness: 1 }));
    road.rotation.x = -Math.PI / 2; road.rotation.z = rotY + Math.PI / 2;
    road.position.set(mx - nx * rd, .096, mz - nz * rd); road.receiveShadow = true; road.material.polygonOffset = true; road.material.polygonOffsetFactor = -1; road.material.polygonOffsetUnits = -1; scene.add(road);
  }
  const tactile = new THREE.Mesh(new THREE.PlaneGeometry(len, .45), new THREE.MeshStandardMaterial({ color: 0xd8b52a, roughness: .8 }));
  tactile.rotation.x = -Math.PI / 2; tactile.rotation.z = rotY + Math.PI / 2;
  tactile.position.set(mx - nx * (swW - .28), .155, mz - nz * (swW - .28)); scene.add(tactile);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(len, .17, .32), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: .85 }));
  kerb.rotation.y = rotY + Math.PI / 2;
  kerb.position.set(mx - nx * (swW + .06), .085, mz - nz * (swW + .06)); kerb.receiveShadow = true; scene.add(kerb);
  /* 路面修補 + 沙井蓋 + 去水格 */
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: .95 }));
  patch.rotation.x = -Math.PI / 2; patch.rotation.z = rotY + Math.PI / 2 + .12;
  patch.position.set(P(mid + 6)[0] - nx * (gap + 1.6), .102, P(mid + 6)[1] - nz * (gap + 1.6)); scene.add(patch);
  const mhMat = new THREE.MeshStandardMaterial({ color: 0x2f2d33, roughness: .9, metalness: .3 });
  for (const dt of [-16, -2, 12]) {
    const [qx, qz] = P(mid + dt);
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .03, 16), mhMat);
    mh.position.set(qx - nx * (gap + 1.5), .103, qz - nz * (gap + 1.5)); scene.add(mh);
  }
  for (const dt of [-22, -8, 6, 20]) {
    const [qx, qz] = P(mid + dt);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(.9, .05, .5), mhMat);
    gr.rotation.y = rotY + Math.PI / 2; gr.position.set(qx - nx * (swW + .2), .12, qz - nz * (swW + .2)); scene.add(gr);
  }
  /* 班馬線(連接行人路↔行人閘) — P10.4:斑紋有厚度貼地 */
  {
    const gx0 = ped.x - nx * (gap + 1.2), gz0 = ped.z - nz * (gap + 1.2);
    const stripeG = new THREE.BoxGeometry(3.2, .02, .55), stripeM = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: .7 });
    const nSt = 7;
    for (let i = 0; i < nSt; i++) { const s = new THREE.Mesh(stripeG, stripeM); s.rotation.y = rotY + Math.PI / 2; s.position.set(gx0 - ux * (i - nSt / 2 + .5) * 1.15, .105, gz0 - uz * (i - nSt / 2 + .5) * 1.15); scene.add(s); }
  }
  /* P10.4:行人路混凝土接縫線(每3m)+閘前輪胎帶泥(只喺車閘口兩側,有邏輯位置) */
  {
    const jointM = new THREE.MeshStandardMaterial({ color: 0x8f8b83, roughness: .95 });
    const nJ = Math.floor(len / 3);
    for (let i = 1; i < nJ; i++) {
      const [qx, qz] = P(tA + i * 3);
      const j = new THREE.Mesh(new THREE.BoxGeometry(.025, .012, swW - .1), jointM);
      j.rotation.y = rotY + Math.PI / 2;
      j.position.set(qx - nx * (swW / 2), .162, qz - nz * (swW / 2)); scene.add(j);
    }
    const dirtM = new THREE.MeshStandardMaterial({ color: 0x5a4a34, roughness: .99, transparent: true, opacity: .55 });
    for (const s of [-1, 1]) {
      const [vx2, vz2] = [veh.x + ux * (s > 0 ? 3 : -3), veh.z + uz * (s > 0 ? 3 : -3)];
      const d = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), dirtM);
      d.rotation.x = -Math.PI / 2; d.rotation.z = rotY + Math.PI / 2;
      d.position.set(vx2 + nx * (gap - 1), .106, vz2 + nz * (gap - 1)); scene.add(d);
    }
  }
  /* P10.1-C:building base/street transition — 樓腳排水渠帶+公用事業蓋+窄服務帶(跟行人路同軸) */
  {
    const drainM = new THREE.MeshStandardMaterial({ color: 0x3f3d42, roughness: .9, metalness: .25 });
    // 排水渠帶:沿行人路外緣(靠馬路一側)一條連續窄槽
    const drain = new THREE.Mesh(new THREE.BoxGeometry(len, .05, .35), drainM);
    drain.rotation.y = rotY + Math.PI / 2;
    drain.position.set(mx - nx * (swW + .55), .155, mz - nz * (swW + .55)); scene.add(drain);
    // 渠面格柵紋(每2m一條淺槽)
    for (let i = 0; i < Math.floor(len / 2); i++) {
      const [qx, qz] = P(tA + i * 2 + 1);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .22), drainM);
      slot.rotation.y = rotY + Math.PI / 2;
      slot.position.set(qx - nx * (swW + .55), .185, qz - nz * (swW + .55)); scene.add(slot);
    }
    // 公用事業蓋×2(電訊/電力,唔同色)
    const utilDefs = [[0x9a6a20, -6], [0x555a62, 9]];
    for (const [c, off] of utilDefs) {
      const [qx, qz] = P(mid + off);
      const cov = new THREE.Mesh(new THREE.BoxGeometry(1.1, .04, .8), new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: .3 }));
      cov.rotation.y = rotY + Math.PI / 2;
      cov.position.set(qx - nx * (swW - .8), .168, qz - nz * (swW - .8)); scene.add(cov);
    }
  }
  /* 閘內:卸貨區+車道分隔(黃黑 hazard 邊+地面標線) */
  {
    const hz = canvasTex(256, 64, g => { g.fillStyle = "#c8a018"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#1c1c1c"; for (let i = -64; i < 256; i += 48) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 24, 64); g.lineTo(i + 24 + 32, 0); g.lineTo(i + 32, 0); g.closePath(); g.fill(); } });
    const vl = veh.t1 - veh.t0 + 10;
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(vl, 9), new THREE.MeshStandardMaterial({ color: 0x585551, roughness: .95 }));
    lane.rotation.x = -Math.PI / 2; lane.rotation.z = rotY + Math.PI / 2;
    lane.position.set(veh.x + nx * 4.5, .135, veh.z + nz * 4.5); lane.receiveShadow = true; scene.add(lane);
    for (const s of [-1, 1]) {
      const hzm = new THREE.Mesh(new THREE.PlaneGeometry(vl, .5), new THREE.MeshBasicMaterial({ map: hz }));
      hzm.rotation.x = -Math.PI / 2; hzm.rotation.z = rotY + Math.PI / 2;
      hzm.position.set(veh.x + nx * (4.5 + s * 4.4), .14, veh.z + nz * (4.5 + s * 4.4)); scene.add(hzm);
    }
    const unTex = canvasTex(256, 96, g => { g.fillStyle = "#c8a018"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#1c1c1c"; g.font = "900 40px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center"; g.fillText("卸貨區", 128, 62); });
    const un = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), new THREE.MeshBasicMaterial({ map: unTex }));
    un.rotation.x = -Math.PI / 2; un.rotation.z = rotY + Math.PI / 2;
    un.position.set(veh.x + nx * 4.5, .145, veh.z + nz * 4.5); scene.add(un);
  }
  /* 近景立面樓 x3(閘前街對面;窗內凹+地下舖+簷篷+AC+招牌+天台) */
  const winIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.3, .18), new THREE.MeshStandardMaterial({ color: 0x2a3440, roughness: .15, metalness: .5 }), 160);
  const frameIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 1.5, .14), new THREE.MeshStandardMaterial({ color: 0xcac4b4, roughness: .7 }), 160);
  const acIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.8, .55, .5), new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: .8 }), 24);
  let wi = 0, ai = 0;
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S4 = new THREE.Vector3(1, 1, 1), P4 = new THREE.Vector3();
  const names = ["金豐茶餐廳", "大安五金", "宏輝建材"];
  const cols = [0xb8ab94, 0xa89a86, 0xb0a494];
  [tA + 6, tA + 19, tB - 8].forEach((ft, bi) => {
    const [fx0, fz0] = P(ft);
    const floors = 6 + (bi % 3), h = floors * 3.1;
    const bx = fx0 - nx * (swW + 2.8), bz = fz0 - nz * (swW + 2.8);
    const ry = rotY + Math.PI / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(11, h, 9), new THREE.MeshStandardMaterial({ color: cols[bi], roughness: .9 }));
    body.rotation.y = ry;
    body.position.set(bx, h / 2, bz); body.castShadow = true; body.receiveShadow = true; scene.add(body);
    for (let f = 1; f <= floors; f++) for (let k = 0; k < 4; k++) {
      if (wi >= 160) break;
      const off = (k - 1.5) * 2.6;
      const wx = bx - uz * off + nx * 4.62, wz = bz + ux * off + nz * 4.62;
      Q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); P4.set(wx, f * 3.1 - .3, wz); M4.compose(P4, Q4, S4); frameIM.setMatrixAt(wi, M4);
      P4.set(wx + nx * .1, f * 3.1 - .3, wz + nz * .1); M4.compose(P4, Q4, S4); winIM.setMatrixAt(wi, M4); wi++;
      if (f % 2 === 0 && k % 2 === 0 && ai < 24) { P4.set(wx - uz * 1.1 + nx * 4.85, f * 3.1 - .5, wz + ux * 1.1 + nz * 4.85); M4.compose(P4, Q4, S4); acIM.setMatrixAt(ai, M4); ai++; }
    }
    const shop = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.7, .2), new THREE.MeshStandardMaterial({ color: 0x35404a, roughness: .2, metalness: .5 }));
    shop.rotation.y = ry; shop.position.set(bx + nx * 4.6, 1.5, bz + nz * 4.6); scene.add(shop);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.2, .18, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a2f2a, roughness: .8 }));
    canopy.rotation.y = ry; canopy.position.set(bx + nx * 5.2, 3.0, bz + nz * 5.2); canopy.castShadow = true; scene.add(canopy);
    const sTex = canvasTex(512, 128, g => { g.fillStyle = ["#8a2430", "#1a4a7a", "#2a6a3a"][bi]; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#e8c020"; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116); g.fillStyle = "#ffe9a0"; g.font = "900 62px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center"; g.fillText(names[bi], 256, 84); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.7), new THREE.MeshBasicMaterial({ map: sTex, side: THREE.DoubleSide }));
    sign.rotation.y = ry; sign.position.set(bx + nx * 5.35, 3.9, bz + nz * 5.35); scene.add(sign);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: .7 }));
    tank.position.set(bx - ux * 2.4, h + .8, bz - uz * 2.4); tank.castShadow = true; scene.add(tank);
    const stair = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.2), new THREE.MeshStandardMaterial({ color: cols[bi], roughness: .9 }));
    stair.rotation.y = ry; stair.position.set(bx + ux * 2.6, h + 1.1, bz + uz * 2.6); scene.add(stair);
    for (let f = 1; f <= floors; f += 2) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(11.05, .22, 9.05), new THREE.MeshStandardMaterial({ color: 0x9a8f7c, roughness: .85 }));
      band.rotation.y = ry; band.position.set(bx, f * 3.1 + 1.25, bz); scene.add(band);
    }
    const svc = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, .15), new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: .8 }));
    svc.rotation.y = ry; svc.position.set(bx - uz * 4.2 + nx * 4.62, 1.05, bz + ux * 4.2 + nz * 4.62); scene.add(svc);
  });
  winIM.count = wi; frameIM.count = wi; acIM.count = ai;
  /* P6:窗/框/AC 唔 cast shadow(立面主體已經投影,慳 shadow pass) */
  scene.add(winIM, frameIM, acIM);
}
buildDemoStreet();

/* ========== P10.3:左側近景 façade attachment(閘口視野內樓宇加深度,唔換 base box) ========== */
{
  /* 揾出閘口前 ~70m 視錐內、離閘 <90m 嘅樓(用 BUILDINGS OBB centre),加:
     window frame recess(InstancedMesh)、AC 機、外露水管、地下舖面/招牌、天台邊 */
  const near = [];
  for (const b of BUILDINGS) {
    const [bx, bz, bhw, bhd, brot, bh] = b;
    if (b[6] === 1) continue; // 排除特別類別
    const d = d2(bx, bz, GATE[0], GATE[1]);
    if (d < 90 * 90 && Math.max(bhw, bhd) * 2 > 8) near.push({ cx: bx, cz: bz, w: bhw * 2, d: bhd * 2, h: bh });
  }
  const pick = near.sort((a, b) => d2(a.cx, a.cz, GATE[0], GATE[1]) - d2(b.cx, b.cz, GATE[0], GATE[1])).slice(0, 4);
  /* P10.1-B hero façade:玻璃有反射色而唔係純黑;窗簾/暗室 variation 用 3 個共享材質輪流;
     加 sill(窗台出簷)+層間 slab edge+plinth 基座條 */
  const glassVariants = [
    new THREE.MeshStandardMaterial({ color: 0x2e4356, roughness: .12, metalness: .7 }),   // 反射天色
    new THREE.MeshStandardMaterial({ color: 0x18222c, roughness: .3, metalness: .4 }),    // 暗室
    new THREE.MeshStandardMaterial({ color: 0xcfc8b4, roughness: .6, metalness: .05 })    // 拉咗簾
  ];
  const winIM = glassVariants.map(m => new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.1, .16), m, 90));
  const winCount = [0, 0, 0];
  const frIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.28, .1), new THREE.MeshStandardMaterial({ color: 0xd4cec0, roughness: .75 }), 220);
  const sillIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.62, .1, .3), new THREE.MeshStandardMaterial({ color: 0xc8c2b2, roughness: .85 }), 220);
  const acIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.75, .5, .45), new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: .82 }), 40);
  const pipeIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .07, 3, 6), new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: .8 }), 36);
  let wi = 0, ai = 0, pi = 0;
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S4 = new THREE.Vector3(1, 1, 1), P4 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  for (const b of pick) {
    // 揾最接近閘口嘅立面軸向
    const faceX = Math.abs(b.cx - GATE[0]) > Math.abs(b.cz - GATE[1]);
    const dir = faceX ? [Math.sign(GATE[0] - b.cx) || 1, 0] : [0, Math.sign(GATE[1] - b.cz) || 1];
    const ry = faceX ? (dir[0] > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir[1] > 0 ? 0 : Math.PI);
    const fx = b.cx + dir[0] * (faceX ? b.w / 2 : 0), fz = b.cz + dir[1] * (faceX ? 0 : b.d / 2);
    const ux2 = faceX ? 0 : 1, uz2 = faceX ? 1 : 0; // 沿立面
    const half = (faceX ? b.d : b.w) / 2 - 2;
    const floors = Math.max(3, Math.min(10, Math.floor(b.h / 3.1)));
    /* hero 樓(最近嗰棟)用多欄窗,其餘維持 3 欄 */
    const hero = b === pick[0];
    const cols = hero ? 5 : 3;
    const colSpan = hero ? 2.4 : 2.7;
    for (let f = 1; f <= floors; f++) for (let k = 0; k < cols; k++) {
      if (wi >= 218) break;
      const off = (k - (cols - 1) / 2) * colSpan;
      const wx = fx + ux2 * off + dir[0] * .12, wz = fz + uz2 * off + dir[1] * .12;
      Q4.setFromAxisAngle(UP, ry); P4.set(wx, f * 3.1 - .4, wz); M4.compose(P4, Q4, S4);
      frIM.setMatrixAt(wi, M4);
      // sill(窗台出簷,每窗一條)
      P4.set(wx + dir[0] * .16, f * 3.1 - .98, wz + dir[1] * .16); M4.compose(P4, Q4, S4);
      sillIM.setMatrixAt(wi, M4);
      // 玻璃:3 variant 輪流(偽隨機但穩定:用 f*7+k*3)
      const v = (f * 7 + k * 3 + b.cx.toFixed(0) * 1) % 5;
      const bucket = v < 2 ? 0 : v < 4 ? 1 : 2;
      const idx = winCount[bucket];
      if (idx < 89) { P4.set(wx + dir[0] * .1, f * 3.1 - .4, wz + dir[1] * .1); M4.compose(P4, Q4, S4); winIM[bucket].setMatrixAt(idx, M4); winCount[bucket]++; }
      wi++;
      if (f % 2 === 0 && k === 0 && ai < 39) { P4.set(wx + dir[0] * .55, f * 3.1 - .9, wz + dir[1] * .55); M4.compose(P4, Q4, S4); acIM.setMatrixAt(ai, M4); ai++; }
    }
    // 層間 slab edge(hero 樓)
    if (hero) for (let f = 1; f < floors; f++) {
      const se = new THREE.Mesh(new THREE.BoxGeometry(faceX ? .18 : Math.min(b.w, 12), .22, faceX ? Math.min(b.d, 12) : .18), new THREE.MeshStandardMaterial({ color: 0xaaa498, roughness: .88 }));
      se.position.set(fx + dir[0] * .06, f * 3.1 + .12, fz + dir[1] * .06); scene.add(se);
    }
    // plinth 基座條(樓腳)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(faceX ? .24 : Math.min(b.w, 12), .55, faceX ? Math.min(b.d, 12) : .24), new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: .92 }));
    plinth.position.set(fx + dir[0] * .1, .28, fz + dir[1] * .1); scene.add(plinth);
    // 外露水管(角落兩條)
    for (const s of [-1, 1]) {
      if (pi >= 35) break;
      const px = fx + ux2 * s * (half + .5) + dir[0] * .18, pz = fz + uz2 * s * (half + .5) + dir[1] * .18;
      Q4.setFromAxisAngle(UP, ry); P4.set(px, (floors * 3.1) / 2, pz); M4.compose(P4, Q4, S4); pipeIM.setMatrixAt(pi, M4); pi++;
    }
    // 地下舖面+簷篷+招牌板
    const gr = new THREE.Mesh(new THREE.BoxGeometry(faceX ? .3 : Math.min(9, b.w * .7), 2.8, faceX ? Math.min(9, b.d * .7) : .3), new THREE.MeshStandardMaterial({ color: 0x303840, roughness: .25, metalness: .4 }));
    gr.position.set(fx + dir[0] * .1, 1.45, fz + dir[1] * .1); scene.add(gr);
    const can = new THREE.Mesh(new THREE.BoxGeometry(faceX ? 1.5 : Math.min(9, b.w * .72), .16, faceX ? Math.min(9, b.d * .72) : 1.5), new THREE.MeshStandardMaterial({ color: 0x6a2a24, roughness: .8 }));
    can.position.set(fx + dir[0] * .8, 3.1, fz + dir[1] * .8); can.castShadow = true; scene.add(can);
    // 天台邊欄
    const par = new THREE.Mesh(new THREE.BoxGeometry(faceX ? .2 : b.w, .8, faceX ? b.d : .2), new THREE.MeshStandardMaterial({ color: 0x9a9488, roughness: .85 }));
    par.position.set(fx - dir[0] * .1, b.h + .4, fz - dir[1] * .1); scene.add(par);
  }
  winIM.forEach((im, i) => { im.count = winCount[i]; scene.add(im); });
  frIM.castShadow = true;
  scene.add(frIM, sillIM, acIM, pipeIM);
}

/* ========== P10.6:實體告示牌(有支架/厚度/位置理由,原創 generic 香港地盤風格) ========== */
{
  const signDefs = [
    { txt: "進入地盤\n必須佩戴安全帽", sub: "WEAR SAFETY HELMET", bg: "#1a5aa8", pos: [ped => [ped.x + 2.2, ped.z - 3.2]], h: 1.6 },
    { txt: "行人通道\n請靠左", sub: "KEEP LEFT", bg: "#c8a018", pos: [ped => [ped.x - 2.4, ped.z - 2.6]], h: 1.4 },
    { txt: "車輛出入口\n慢駛 · 倒車響號", sub: "VEHICLES SLOW", bg: "#b03028", pos: [veh => [veh.x - 5.6, veh.z + 3.4]], h: 1.6 },
    { txt: "地盤重地\n閒人免進", sub: "AUTHORISED PERSONNEL ONLY", bg: "#2a7a3a", pos: [() => [GATE[0] + Math.cos(GATE_DIR_IN + Math.PI / 2) * 9, GATE[1] + Math.sin(GATE_DIR_IN + Math.PI / 2) * 9]], h: 1.5 }
  ];
  const ped = MAIN_OPENINGS.list.find(o => o.type === "pedestrian"), vehG = MAIN_OPENINGS.list.find(o => o.type === "vehicle");
  const postM = new THREE.MeshLambertMaterial({ color: 0x5a6068 });
  for (const def of signDefs) {
    const [sx, sz] = def.pos[0](ped) || [0, 0];
    const tex = canvasTex(512, 640, g => {
      g.fillStyle = def.bg; g.fillRect(0, 0, 512, 640);
      g.strokeStyle = "#f2f2f2"; g.lineWidth = 10; g.strokeRect(14, 14, 484, 612);
      g.fillStyle = "#ffffff"; g.textAlign = "center";
      const lines = def.txt.split("\n");
      g.font = "900 92px 'Microsoft JhengHei',sans-serif";
      lines.forEach((l, i) => g.fillText(l, 256, 180 + i * 130));
      g.font = "700 34px Arial,sans-serif"; g.fillStyle = "rgba(255,255,255,.85)";
      g.fillText(def.sub, 256, 600 - 40 * (2 - lines.length));
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(def.h * .8, def.h, .06), [postM, postM, postM, postM, new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex, side: THREE.BackSide })]);
    board.position.set(sx, 1.45 + def.h / 2, sz);
    board.rotation.y = -Math.atan2(MAIN_SITE.c[1] - sz, MAIN_SITE.c[0] - sx); // 面向場外行人
    board.castShadow = true; scene.add(board);
    for (const px of [-.28, .28]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.5 + def.h, 8), postM);
      pole.position.set(sx + px * Math.cos(board.rotation.y + Math.PI / 2) * .8, (1.5 + def.h) / 2, sz - px * Math.sin(board.rotation.y + Math.PI / 2) * .8);
      pole.castShadow = true; scene.add(pole);
    }
  }
}

function siteGuard() {
  buildGatehouse();
  const st = accessState();
  /* 閘機狀態牌(隨狀態更新) */
  if (!_gateLabel || _gateLabelState !== st.id) {
    if (_gateLabel) _gateLabel.parent.remove(_gateLabel);
    _gateLabel = makeSpriteLabel(st.name, st.id === "admitted" ? "#8ef0a0" : "#ffd76e", 3.2);
    _gateLabel.position.set(GATE[0], 3.3, GATE[1]);
    scene.add(_gateLabel); _gateLabelState = st.id;
  }
  /* 全周界守衛:未獲准而身處施工區→彈返閘外接待側+講原因(圍板繞入都擋) */
  if (st.id !== "admitted" && pointInPoly(player.x, player.z, MAIN_SITE.pts) && !player._guardT) {
    player._guardT = 1;
    const GOUT = GATE_OUT || 0;
    player.x = GATE[0] + Math.cos(GOUT) * 5; player.z = GATE[1] + Math.sin(GOUT) * 5;
    toast("⛔ " + st.name + " — " + st.reason); beep(240, .3, "square", .25);
    setTimeout(() => player._guardT = 0, 1200);
  }
}
/* 防卡死:撳緊移動但5秒冇郁過→彈返閘內空地 */
let _stuckT = 0, _stuckPos = [0, 0];
function stuckGuard(now) {
  const moving = keys["KeyW"] || keys["KeyA"] || keys["KeyS"] || keys["KeyD"];
  if (!moving) { _stuckT = now; _stuckPos = [player.x, player.z]; return; }
  if (d2(player.x, player.z, _stuckPos[0], _stuckPos[1]) > 1.5) { _stuckT = now; _stuckPos = [player.x, player.z]; return; }
  if (now - _stuckT > 5000) {
    player.x = GATE[0] + Math.cos(GATE_OUT) * -8; player.z = GATE[1] + Math.sin(GATE_OUT) * -8;
    _stuckT = now; _stuckPos = [player.x, player.z];
    toast("🔧 偵測到卡住,已幫你返返閘口空地"); beep(880, .2, "sine", .2);
  }
}
/* ========== 30×30m精細區八分區(specs場景規格§3):色帶地坪+雙語告示牌+事件區域數據 ========== */
const PPE_POS = [GATE[0] + Math.cos(GATE_OUT) * 12, GATE[1] + Math.sin(GATE_OUT) * 12];
const SITE_ZONES = [];
{
  const c = MAIN_SITE.c, gd = GATE_DIR_IN;
  const ux = [Math.cos(gd), Math.sin(gd)], vz = [-Math.sin(gd), Math.cos(gd)]; // 閘向內=ux, 橫向=vz
  const P = (a, b) => [c[0] + ux[0] * a + vz[0] * b, c[1] + ux[1] * a + vz[1] * b]; // a=距閘深, b=橫向偏
  const Z = (name, en, color, a, b, w, d, rule) => { const p = P(a, b); SITE_ZONES.push({ name, en, color, x: p[0], z: p[1], w, d, rule }); };
  Z("接待/入職區", "RECEPTION", 0xffb03a, 26, 10, 12, 8, "訪客登記 · 戴齊PPE");
  Z("辦公及休息", "OFFICE/REST", 0x4aa3ff, 22, -12, 10, 8, "飲水 · 急救 · 集合點");
  Z("物料及加工", "MATERIALS", 0xc8a24a, 4, 16, 14, 10, "通道勿阻 · 堆料整齊");
  Z("卸貨及車道", "UNLOADING", 0x8a8f96, 8, -2, 26, 6, "人車分隔 · 倒車有指揮");
  Z("上蓋施工", "STRUCTURE", 0xff6a3a, -6, 6, 18, 14, "臨邊防護 · 洞口蓋好");
  Z("機械及挖掘", "PLANT/EXCAV", 0xa06aff, -10, -12, 12, 10, "回轉範圍禁入");
  Z("吊運範圍", "LIFTING", 0xff4a6a, -14, 10, 14, 12, "吊物下方禁入 · 聽訊號員");
  Z("廢料及洗車", "WASTE/WASH", 0x5ab86a, 20, 2, 8, 8, "分類 · 出閘洗轆");
  /* 地坪色帶+告示牌 */
  for (const z of SITE_ZONES) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.d),
      new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: .16, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(z.x, .035, z.z); scene.add(m);
    const tex = canvasTex(512, 256, g => {
      g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#" + new THREE.Color(z.color).getHexString(); g.lineWidth = 18; g.strokeRect(9, 9, 494, 238);
      g.fillStyle = "#1c2430"; g.font = "900 64px 'Microsoft JhengHei',sans-serif"; g.textAlign = "center";
      g.fillText(z.name, 256, 108);
      g.font = "700 30px sans-serif"; g.fillStyle = "#5a6678"; g.fillText(z.en, 256, 152);
      g.font = "700 28px 'Microsoft JhengHei',sans-serif"; g.fillStyle = "#a04420"; g.fillText("⚠ " + z.rule, 256, 210);
    });
    const post = new THREE.Group();
    post.add(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x555c66 })).translateY(.8));
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, .85, .06),
      [0, 1, 2, 3].map(() => new THREE.MeshLambertMaterial({ color: 0xcccccc })).concat([new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ color: 0x888888 })]));
    board.position.y = 2.1; board.rotation.y = Math.PI / 2; board.castShadow = true; post.add(board);
    post.position.set(z.x + z.w / 2 - 1, 0, z.z + z.d / 2 - 1); post.rotation.y = -gd;
    scene.add(post);
    z.sign = post;
  }
}
function zoneAt(x, z) { return SITE_ZONES.find(s => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2) || null; }
/* ========== 第一批六個安全事件(specs場景規格§5,狀態:正常→警示→叫停→整改→覆檢→恢復) ========== */
const EVENTS = [];
function mkEvent(id, name, zone, source) { const e = { id, name, zone, source, state: "normal", t: 0, obj: null }; EVENTS.push(e); return e; }
/* E1 入場PPE:接待區裝備架,未齊唔放行(文件13A) */
{
  const e = mkEvent("ppe", "入場PPE檢查", SITE_ZONES[0], "啟德2022會議文件13A(項目設定)");
  const zp = SITE_ZONES[0];
  /* P10.1:真實 PPE 裝備架(鋼框+兩層板+掛住頭盔/反光衣),唔再係藍色實心盒 */
  e.rack = new THREE.Group();
  const rackM = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
  const shelfM = new THREE.MeshLambertMaterial({ color: 0x8a5a2a });
  for (const s of [-1, 1]) for (const hh of [.02, .92, 1.78]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, .06), rackM);
    bar.position.set(s * .72, hh, 0); e.rack.add(bar);
  }
  for (const zz of [-.25, .25]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.82, .06), rackM);
    post.position.set(-1.45, .91, zz); e.rack.add(post);
    const post2 = post.clone(); post2.position.x = 1.45; e.rack.add(post2);
  }
  for (const yy of [.55, 1.25]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, .05, .5), shelfM);
    shelf.position.set(0, yy, 0); e.rack.add(shelf);
  }
  const hat = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffd23a }));
  hat.position.set(-.5, 1.32, 0); e.rack.add(hat);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .03, 10), new THREE.MeshLambertMaterial({ color: 0xffd23a }));
  hatBrim.position.set(-.5, 1.3, 0); e.rack.add(hatBrim);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(.55, .6, .08), new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
  vest.position.set(.45, .9, 0); e.rack.add(vest);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(.16, .2, .26), new THREE.MeshLambertMaterial({ color: 0x3a2a1a }));
  bootL.position.set(-.35, .35, 0); e.rack.add(bootL);
  const bootR = bootL.clone(); bootR.position.x = -.1; e.rack.add(bootR);
  e.rack.position.set(PPE_POS[0], 0, PPE_POS[1]); scene.add(e.rack);
  e.rack.traverse(o => { if (o.isMesh) o.castShadow = true; });
  colliders.push({ x: PPE_POS[0], z: PPE_POS[1], hw: .8, hd: .35, rot: 0, minx: PPE_POS[0] - .8, maxx: PPE_POS[0] + .8, minz: PPE_POS[1] - .35, maxz: PPE_POS[1] + .35 });
  /* P10.5:實體 PPE 架上有一塊細提示牌就夠,唔再疊巨大 floating sprite */
  e.label = makeSpriteLabel("🦺 領PPE(E)", "#8fd0ff", 1.1); e.label.position.set(0, 2.15, 0); e.rack.add(e.label);
  e.checkEnter = () => {
    if (!player.ppe) {
      player.x = GATE[0] + Math.cos(GATE_OUT) * 5; player.z = GATE[1] + Math.sin(GATE_OUT) * 5;
      toast("⛔ PPE未齊:去接待區裝備架領頭盔/反光衣/安全鞋(E)"); beep(240, .3, "square", .25);
      return false;
    }
    return true;
  };
  interactables.push({ x: e.rack.position.x, z: e.rack.position.z, r: 2.2, label: "領PPE", active: true, mesh: e.rack, action: () => { player.ppe = 1; sDing(); toast("✅ PPE齊:頭盔+反光衣+安全鞋"); e.state = "closed"; } });
}
/* E2 倒車路線:卸貨區泥頭車倒車紅區+比比比(spec事件表3) */
{
  const e = mkEvent("reverse", "倒車路線", SITE_ZONES[3], "spec§5事件表3");
  e.active = false;
  e.tick = (dt) => {
    if (e.cd > 0) { e.cd -= dt; return; }
    if (!e.active && Math.random() < dt * .02) { // 約50秒一次
      e.active = true; e.dur = 8; e.warned = false;
      toast("🚛 卸貨區:泥頭車倒車!聽「比比比」遠離車尾"); beep(1000, .12, "square", .2); beep(1000, .12, "square", .2, .18);
    }
    if (e.active) {
      e.dur -= dt;
      if (e.dur <= 0) { e.active = false; e.cd = 30; if (e.state === "risk") e.state = "normal"; return; }
      const zn = SITE_ZONES[3];
      const inZone = Math.abs(player.x - zn.x) < zn.w / 2 && Math.abs(player.z - zn.z) < zn.d / 2;
      if (inZone && !e.warned) {
        e.warned = true; e.state = "risk";
        LEDGER.safety.push({ msg: "走入倒車路線(險情)", fee: 0, source: e.source });
        toast("⚠️ 險情!倒車區內 — 立即退到行人位等候"); beep(600, .25, "square", .3);
        setTimeout(() => { e.state = "rectified"; toast("✅ 已退出倒車區,等候放行"); }, 3000);
      }
    }
  }; e.cd = 10;
}
/* E3 吊運隔離:吊運區吊物經過紅圈,闖入叫停(文件13E) */
{
  const e = mkEvent("lifting", "吊運隔離", SITE_ZONES[6], "啟德2022會議文件13E(項目設定)");
  e.phase = 0;
  e.ring = new THREE.Mesh(new THREE.RingGeometry(4, 4.6, 32), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: .5, side: THREE.DoubleSide }));
  e.ring.rotation.x = -Math.PI / 2; e.ring.visible = false; scene.add(e.ring);
  e.tick = (dt) => {
    e.phase = (e.phase + dt * .06) % 1;
    const zn = SITE_ZONES[6];
    const lifting = e.phase > .3 && e.phase < .7; // 吊物經過時段
    e.ring.visible = lifting;
    if (!lifting) return;
    e.ring.position.set(zn.x, .05, zn.z);
    const d = d2(player.x, player.z, zn.x, zn.z);
    if (d < 4.2 && e.state !== "stopped") {
      e.state = "stopped";
      toast("📣 訊號員叫停:吊物下方!即刻退出紅圈等候"); beep(520, .3, "square", .3); beep(700, .3, "square", .3, .3);
      LEDGER.safety.push({ msg: "闖入吊運隔離區(叫停)", fee: 0, source: e.source });
    }
    if (d > 5 && e.state === "stopped") { e.state = "normal"; toast("✅ 已清場,吊運恢復"); }
  };
}
/* E4 洞口防護:PIT冇蓋→搬蓋板整改→覆檢(文件13G地洞未蓋好) */
{
  const e = mkEvent("hole", "洞口防護", SITE_ZONES[4], "啟德2022會議文件13G(項目設定)");
  e.cover = new THREE.Mesh(new THREE.BoxGeometry(PIT.hw * 2, .12, PIT.hd * 2), new THREE.MeshLambertMaterial({ color: 0xc8a030 }));
  e.cover.position.set(PIT.x + 6, .06, PIT.z + 6); e.cover.castShadow = true; scene.add(e.cover);
  e.sign = makeSpriteLabel("🕳️ 洞口未蓋 — 搬蓋板(E)", "#ffd76e", 3.2); e.sign.position.set(PIT.x, 1.6, PIT.z); scene.add(e.sign);
  interactables.push({
    x: e.cover.position.x, z: e.cover.position.z, r: 2.5, label: "搬蓋板", active: true, mesh: e.cover,
    action: () => {
      if (PIT.covered) return;
      PIT.covered = true;
      e.cover.position.set(PIT.x, .08, PIT.z); e.cover.rotation.y = PIT.rot; e.sign.visible = false;
      e.state = "rectified"; sDing(); toast("✅ 蓋板已放好,等安全督導覆檢…");
      setTimeout(() => { e.state = "normal"; toast("✅ 覆檢通過:洞口防護恢復"); }, 4000);
    }
  });
  e.tick = () => { e.sign.visible = !PIT.covered; };
}
/* E5 物料通道:物料阻塞走廊→搬三堆回物料區(文件13G不安全擺放) */
{
  const e = mkEvent("pathway", "物料通道", SITE_ZONES[2], "啟德2022會議文件13G(項目設定)");
  const zn = SITE_ZONES[2];
  e.piles = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, 1), new THREE.MeshLambertMaterial({ color: 0x9a7648 }));
    p.position.set(zn.x - 4 + i * 2, .45, zn.z - zn.d / 2 + 2); p.castShadow = true; scene.add(p);
    e.piles.push(p);
    interactables.push({
      x: p.position.x, z: p.position.z, r: 2, label: "搬開", active: true, mesh: p,
      action: () => {
        if (p.userData.moved) return;
        p.userData.moved = true;
        p.position.set(zn.x + 4 + (i - 1) * 1.6, .45, zn.z + 3); sDing();
        e.moved = (e.moved || 0) + 1;
        if (e.moved >= 3) { e.state = "rectified"; toast("✅ 通道清空,等覆檢…"); setTimeout(() => { e.state = "normal"; toast("✅ 覆檢通過:物料通道恢復"); }, 3000); }
        else toast(`搬開 ${e.moved}/3 堆 — 放返物料存放區`);
      }
    });
  }
}
/* E6 暑熱休息:日間跑動升熱,回休息區飲水降溫(spec事件表15,求助唔扣分) */
{
  const e = mkEvent("heat", "暑熱休息", SITE_ZONES[1], "spec§5事件表15");
  e.heat = 0;
  e.tick = (dt) => {
    if (player.speed > 4) e.heat += dt * 4; else e.heat += dt * .5;
    e.heat = Math.min(100, e.heat);
    if (e.heat > 70 && !e.warned) { e.warned = true; e.state = "risk"; toast("🥵 中暑風險!返辦公及休息區飲水(E)"); beep(700, .2, "sine", .2); }
    if (e.heat < 40) { e.warned = false; if (e.state === "risk") e.state = "normal"; }
  };
  const zn = SITE_ZONES[1];
  const water = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 10), new THREE.MeshLambertMaterial({ color: 0x4aa3ff }));
  water.position.set(zn.x, .45, zn.z); water.castShadow = true; scene.add(water);
  const wl = makeSpriteLabel("🚰 飲水休息(E)", "#8fd0ff", 2.6); wl.position.set(zn.x, 1.8, zn.z); scene.add(wl);
  interactables.push({ x: zn.x, z: zn.z, r: 2, label: "飲水休息", active: true, mesh: water, action: () => { e.heat = 20; e.warned = false; e.state = "normal"; player.stamina = 100; sDing(); toast("🚰 飲水休息完畢 — 求助唔會扣人工或安全分"); } });
  e.needPPE = true;
}
/* HUD:項目成本+安全記錄分開顯示 */
{
  const st = document.getElementById("stats");
  const cost = document.createElement("div"); cost.className = "stat"; cost.id = "costBox"; cost.style.color = "#ffd76e";
  st.appendChild(cost);
  setInterval(() => {
    cost.textContent = `項目成本 $${LEDGER.projectCost.toLocaleString()} · 安全記錄 ${LEDGER.safety.length}`;
  }, 1000);
}
function safetyTick(dt) { for (const e of EVENTS) if (e.tick) e.tick(dt); }
function tick(dt, now) {
  if (!started || paused || inductionMode) { renderScene(); return; }
  siteGuard();
  stuckGuard(now);
  safetyTick(dt);
  if (typeof sitePeopleTick === "function") sitePeopleTick(dt);
  try {
    if (!started || paused) { renderScene(); return; }
  if (dlgActive) { player.freeze = Math.max(player.freeze, .05); dlgTick(dt); }
  playerMove(dt);
  truckDrive(dt);
  if (!window.__iso) { updateOfficers(dt); updateWorkers(dt); updateTraffic(dt); updatePeds(dt); }
  else { if (!window.__iso.npc) { updateOfficers(dt); updateWorkers(dt); } if (!window.__iso.traffic) { updateTraffic(dt); updatePeds(dt); } }
  updateHazards(dt);
  updateBarriers(dt);
  updateVehicleGate(dt);
  // 任務
  const m = missions[M.idx];
  if (m && m.tick) m.tick();
  // 標記動畫
  if (marker.visible) {
    marker.userData.ring.scale.setScalar(1 + Math.sin(now / 300) * .12);
  }
  // 箭嘴
  if (M.target && !dlgActive) {
    navArrow.visible = true;
    const a = Math.atan2(M.target[1] - player.z, M.target[0] - player.x);
    navArrow.position.set(player.x + Math.cos(a) * 1.4, 2.6 + Math.sin(now / 250) * .12, player.z + Math.sin(a) * 1.4);
    navArrow.rotation.y = -a + Math.PI / 2;
  } else navArrow.visible = false;
  // 攝影機
  if (manualCamT > 0) manualCamT -= dt;
  else if (player.speed > .5 && (player.inTruck || ((keys.KeyW || keys.ArrowUp) && !keys.KeyA && !keys.KeyD))) camYaw = angLerp(camYaw, player.heading + Math.PI, dt * 1.8);
  const eyeDist = player.inTruck ? camDist + 4 : camDist;
  const ex = player.x + Math.cos(camYaw) * eyeDist, ez = player.z + Math.sin(camYaw) * eyeDist;
  const ey = (player.inTruck ? 4.5 : 3.2) + (camDist - 8.5) * .5;
  camera.position.lerp(_v1.set(ex, Math.max(ey, 1.5), ez), 1 - Math.pow(.0015, dt));
  camera.lookAt(player.x, 1.6 + (player.inTruck ? 1 : 0), player.z);
  // 光源跟玩家
  sun.position.set(player.x - 140, 300, player.z + 50);
  sun.target.position.set(player.x, 0, player.z);
  // 老陳望玩家
  boss.g.rotation.y = Math.atan2(player.z - boss.g.position.z, player.x - boss.g.position.x) - Math.PI / 2 + Math.PI;
  boss.animate(dt, 0);
  updateHUD(dt);
  if (!(window.__iso && window.__iso.mini)) drawMinimap(); // P9.3 profiling 隔離開關
  /* 安全獎:連續3分鐘零警告 */
  if (player.registered && player.ppe && player.warnings === 0 && player.stars === 0) {
    player.streakT = (player.streakT || 0) + dt;
    if (player.streakT >= 180) {
      player.streakT = 0; player.wage += 50; player.safeAwards = (player.safeAwards || 0) + 1;
      toast("🏅 連續3分鐘零警告 · 安全獎 +$50"); sCash();
    }
  } else player.streakT = 0;
  renderScene();
  } catch (err) { window.__errs.push("LOOP: " + String(err && err.stack || err).slice(0, 400)); renderScene(); }
}
window.__game = window.__game || {};
window.__game.zones = SITE_ZONES; window.__game.zoneAt = zoneAt;
window.__game.tick = tick;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  updateShadowLOD(now);
  tick(dt, now);
}
requestAnimationFrame(loop);

/* 初始鏡頭 */
/* 開場鏡頭:喺玩家背後5米,唔好攝入閘機房 */
camera.position.set(SPAWN[0] - 3, 4.2, SPAWN[1] - 4.5);
camera.lookAt(SPAWN[0], 1.5, SPAWN[1]);
window.__game = Object.assign(window.__game || {}, { scene, camera, renderer, player, THREE, marker, M, officers, started: () => started, collide, openings: MAIN_OPENINGS, mainSite: MAIN_SITE, vehGateOpen: vehicleGateOpen, playerTruck, npcTruck, colliders });
window.__game.audit = () => ({build: window.__BUILD, started, paused, mission: M.idx, wage: player.wage, registered: !!player.registered, ppe: !!player.ppe, npcCount: workers.length + officers.length + peds.length + 1, workers: workers.map(w => ({name:w.name,role:w.role,female:w.female,x:w.x,z:w.z})), officers:officers.length, pedestrians:peds.length, events:EVENTS.map(e=>({id:e.id,state:e.state})), errors:window.__errs.slice(-20)});
window.__game.test = { trainIt, bpIt, runQuiz, runBP, QUIZ_STATE, BP_STATE, GATE, GATE_OUT, OFFICE, collide, violate, missions, say, nextMission, pause: v => { paused = v; } };

// Explicit local QA controls: exercise the same movement function at a fixed
// timestep. This is a movement check, never an FPS benchmark.
if (new URLSearchParams(location.search).has('characterCheck')) {
  const panel=document.createElement('div');
  panel.style.cssText='position:fixed;left:16px;bottom:16px;z-index:9999;background:#101b27;color:white;padding:14px;border:1px solid #789;font:13px monospace;max-width:650px';
  const status=document.createElement('pre');status.id='character-check-result';
  status.textContent='固定步長角色測試（非 FPS 測試）\n開始遊戲並完成開場對話後使用';
  panel.append(status);
  for(const [label,key,run]of [['行路 3 秒','KeyW',false],['跑步 3 秒','KeyW',true],['轉向 3 秒','KeyA',false]]){
    const button=document.createElement('button');button.textContent=label;button.style.marginRight='8px';
    button.onclick=()=>{
      if(!started||dlgActive){status.textContent='請先開始遊戲及完成開場對話';return;}
      const from={x:player.x,z:player.z,heading:player.heading};
      keys[key]=true;keys.ShiftLeft=run;player.freeze=0;
      for(let i=0;i<180;i++)playerMove(1/60);
      paused=false;tick(0,performance.now());paused=true;
      keys[key]=false;keys.ShiftLeft=false;
      camera.position.set(player.x+3,2.2,player.z+4);
      camera.lookAt(player.x,1,player.z);renderer.render(scene,camera);
      status.textContent=JSON.stringify({test:label,rig:player.h.rig,distanceMetres:+Math.hypot(player.x-from.x,player.z-from.z).toFixed(3),speed:+player.speed.toFixed(3),headingBefore:+from.heading.toFixed(3),headingAfter:+player.heading.toFixed(3),errors:window.__errs.length},null,2);
    };panel.append(button);
  }
  document.body.append(panel);
}

// Explicit QA mode exposes real controls and read-only evidence; no teleport,
// mission completion, health pass or currency mutation is provided here.
if (new URLSearchParams(location.search).has('qa')) {
  const panel = document.createElement('details'); panel.open = true;
  panel.style.cssText = 'position:fixed;right:10px;top:220px;z-index:120;background:#10202fee;color:white;padding:10px;max-width:330px;font:12px monospace';
  panel.innerHTML = '<summary>驗收工具 · 真實按鍵 / 無跳關</summary>';
  const state = document.createElement('pre'); state.id = 'qa-state'; state.style.whiteSpace = 'pre-wrap';
  const refresh = () => {
    state.textContent = JSON.stringify({...window.__game.audit(), workers:undefined, events:undefined, player:[+player.x.toFixed(2),+player.z.toFixed(2)], target:M.target, cameraYaw:+camYaw.toFixed(3), near:nearestInteract()?.label, bp:BP_STATE.open?{pos:+BP_STATE.pos.toFixed(1),zone:BP_STATE.zone,hits:BP_STATE.hits}:null},null,1);
  };
  for (const [label,key] of [['W 行 1 秒','KeyW'],['S 行 1 秒','KeyS'],['A 行 1 秒','KeyA'],['D 行 1 秒','KeyD']]) {
    const b=document.createElement('button');b.textContent=label;b.style.margin='3px';
    b.onclick=()=>{keys[key]=true;setTimeout(()=>{keys[key]=false;refresh();},1000);};panel.append(b);
  }
  const e=document.createElement('button');e.textContent='E 互動';e.onclick=()=>{doInteract();refresh();};panel.append(e);
  const download=document.createElement('button');download.textContent='下載驗收 JSON';download.onclick=()=>{
    const blob=new Blob([JSON.stringify({capturedAt:new Date().toISOString(),...window.__game.audit()},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='game-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };panel.append(download,state);document.body.append(panel);setInterval(refresh,1000);refresh();
}

// Gate inspection uses the same admission state as the perimeter guard.
interactables.push({x:GATE[0]+Math.cos(GATE_OUT)*4,z:GATE[1]+Math.sin(GATE_OUT)*4,r:4.5,label:"拍卡入閘",active:true,action:()=>{
  inductionMode="gate";$("gatePanel").style.display="flex";
  $("gateChecks").textContent = `入職訓練：${M.data.quizDone?"合格":"未完成"}\n健康檢查：${player.registered?"合格":"未完成／未合格"}\nPPE：${player.ppe?"齊備":"未領齊"}`;
  $("gateScan").disabled=!(M.data.quizDone&&player.registered&&player.ppe);
}});
$("gateBack").onclick=()=>{inductionMode=null;$("gatePanel").style.display="none";};
$("gateScan").onclick=()=>{
  if(!(M.data.quizDone&&player.registered&&player.ppe))return;
  player.admitted=true;setGateOpen(true);inductionMode=null;$("gatePanel").style.display="none";
  toast("嘟！入閘核對通過，請沿行人通道入場。");
};
