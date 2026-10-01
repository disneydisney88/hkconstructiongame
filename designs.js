/* 人物設計比稿 — 5 個風格並排展示(同樣反光衣+黃帽,公平比較身材風格) */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 貼圖/標籤 helpers(同 app.js) ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function vestTex(back, base = "#ff7a1a", label = "香港建築") {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 0, 256, 30); g.fillRect(0, 226, 256, 30);
    const band = (y) => { const gr = g.createLinearGradient(0, y - 14, 0, y + 14); gr.addColorStop(0, "#d8dce2"); gr.addColorStop(.5, "#f8faff"); gr.addColorStop(1, "#c2c8d0"); g.fillStyle = gr; g.fillRect(0, y - 14, 256, 28); };
    band(86); band(158);
    g.fillStyle = "#20242a"; g.textAlign = "center"; g.textBaseline = "middle";
    if (back) { g.font = "900 36px 'Microsoft JhengHei',sans-serif"; g.fillText(label, 128, 122); }
    else { g.font = "900 15px 'Microsoft JhengHei',sans-serif"; g.fillText("平安上崗", 128, 50); g.font = "700 12px sans-serif"; g.fillText("SITE SAFETY", 128, 172); }
  });
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function textPill(text, fg, bg, border, font) {
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

const SKIN = 0xd8a878, HELMET = 0xffd23a, PANTS = 0x2a3a6a, BOOTS = 0x4a2e1a;
const VEST_FRONT = new THREE.MeshLambertMaterial({ map: vestTex(false) });
const VEST_BACK = new THREE.MeshLambertMaterial({ map: vestTex(true) });
const VEST_SIDE = new THREE.MeshLambertMaterial({ color: 0xff7a1a });

/* ---------- 共用步態動畫(所有設計同一套 rig 介面) ---------- */
function animateRig(r, dt, speed) {
  r.phase += dt * (2.2 + speed * 2.4) * (r.cfg.freq || 1);
  const amp = clamp(speed / 3.4, 0, 1) * .68 + (speed > .2 ? .1 : 0);
  const s = Math.sin(r.phase), ka = r.cfg.kneeAmp ?? 1;
  r.hipL.rotation.x = s * amp; r.hipR.rotation.x = -s * amp;
  r.kneeL.rotation.x = Math.max(0, Math.sin(r.phase - .7)) * amp * 1.05 * ka;
  r.kneeR.rotation.x = Math.max(0, Math.sin(r.phase - .7 + Math.PI)) * amp * 1.05 * ka;
  r.shL.rotation.x = -s * amp * .85; r.shR.rotation.x = s * amp * .85;
  r.shL.rotation.z = -.1; r.shR.rotation.z = .1;
  const eb = (r.cfg.elBase ?? .28) + amp * .45;
  r.elL.rotation.x = -eb + s * amp * .3; r.elR.rotation.x = -eb - s * amp * .3;
  r.g.position.y = Math.abs(Math.cos(r.phase)) * clamp(speed / 3, 0, 1) * (r.cfg.bob ?? .05);
  if (r.upper) { r.upper.rotation.x = clamp(speed - 3, 0, 1) * .06; r.upper.rotation.y = s * amp * .07; }
}

/* ============ 設計A:寫實大隻(8頭身 健身教練) ============ */
function buildA() {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const skinMat = mat(SKIN);
  const legMat = mat(PANTS), bootMat = mat(BOOTS), sleeveMat = mat(0xe86f12);
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .105, .97, 0);
    const hip = new THREE.Mesh(new THREE.SphereGeometry(.088, 8, 6), legMat); hip.position.y = -.02; lg.add(hip);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.088, .062, .46, 8), legMat); thigh.position.y = -.23; thigh.castShadow = true; lg.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -.46; lg.add(knee);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(.062, .042, .38, 8), legMat); calf.position.y = -.19; calf.castShadow = true; knee.add(calf);
    const calfM = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), legMat); calfM.scale.set(.92, 1.6, 1); calfM.position.set(0, -.14, -.02); knee.add(calfM);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.105, .13, .26), bootMat); bt.position.set(0, -.435, .05); bt.castShadow = true; knee.add(bt);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(.1, .055, .1), bootMat); toe.position.set(0, -.4625, .17); knee.add(toe);
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.31, .13, .235), legMat); pelvis.position.y = 1.03; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.325, .05, .25), mat(0x241a10)); belt.position.y = 1.095; g.add(belt);
  const upper = new THREE.Group(); upper.position.y = 1.12; g.add(upper);
  const abs = new THREE.Mesh(new THREE.BoxGeometry(.3, .16, .22), mat(0xe86f12)); abs.position.y = .09; abs.castShadow = true; upper.add(abs);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.47, .3, .31), [VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_FRONT, VEST_BACK]);
  chest.position.y = .34; chest.castShadow = true; upper.add(chest);
  const lats = new THREE.Mesh(new THREE.BoxGeometry(.42, .2, .1), mat(0xe86f12)); lats.position.set(0, .26, -.13); upper.add(lats);
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .265, .4, 0); upper.add(ag);
    const del = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), sleeveMat); del.position.y = .01; del.castShadow = true; ag.add(del);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.058, .05, .26, 8), sleeveMat); ua.position.y = -.13; ua.castShadow = true; ag.add(ua);
    const el = new THREE.Group(); el.position.y = -.28; ag.add(el);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.047, .038, .24, 8), skinMat); fa.position.y = -.12; fa.castShadow = true; el.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.048, 8, 6), skinMat); hand.scale.set(.8, 1.35, .62); hand.position.y = -.275; el.add(hand);
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .058, .12, 8), skinMat); neck.position.y = .53; upper.add(neck);
  const head = new THREE.Group(); head.position.y = .68; upper.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 12), skinMat); skull.scale.set(.94, 1.06, .98); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.13, .07, .12), skinMat); jaw.position.set(0, -.075, .015); head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.016, .045, 5), skinMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.008, .105); head.add(nose);
  const earG = new THREE.SphereGeometry(.02, 6, 5);
  const earL = new THREE.Mesh(earG, skinMat); earL.position.set(-.094, 0, 0); head.add(earL);
  const earR = new THREE.Mesh(earG, skinMat); earR.position.set(.094, 0, 0); head.add(earR);
  const eyeG = new THREE.SphereGeometry(.013, 6, 5), eyeM = mat(0x1c1c24);
  const eyeL = new THREE.Mesh(eyeG, eyeM); eyeL.position.set(-.036, .022, .086); head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeG, eyeM); eyeR.position.set(.036, .022, .086); head.add(eyeR);
  const browG = new THREE.BoxGeometry(.036, .01, .012), browM = mat(0x2a2018);
  const browL = new THREE.Mesh(browG, browM); browL.position.set(-.037, .048, .09); head.add(browL);
  const browR = new THREE.Mesh(browG, browM); browR.position.set(.037, .048, .09); head.add(browR);
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(.102, .108, .075, 14), mat(HELMET)); helmet.position.y = .065; helmet.castShadow = true; head.add(helmet);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.112, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffdc57)); dome.position.y = .07; dome.castShadow = true; head.add(dome);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.03, .045, .19), mat(0xe8b820)); ridge.position.y = .125; head.add(ridge);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.142, .148, .022, 14), mat(HELMET)); brim.position.y = .028; head.add(brim);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(.093, .008, 6, 12, Math.PI * .9), mat(0x222222)); strap.position.y = -.035; strap.rotation.y = Math.PI / 2; strap.rotation.z = Math.PI + .12; head.add(strap);
  return { g, hipL: L.lg, hipR: R.lg, kneeL: L.knee, kneeR: R.knee, shL: La.ag, shR: Ra.ag, elL: La.el, elR: Ra.el, upper, cfg: { bob: .05 } };
}

/* ============ 設計B:美式卡通(6頭身 大手大腳 英雄感) ============ */
function buildB() {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const skinMat = mat(SKIN), pantMat = mat(PANTS), bootMat = mat(BOOTS), sleeveMat = mat(0xe86f12);
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .12, .93, 0);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.08, .065, .4, 10), pantMat); th.position.y = -.2; th.castShadow = true; lg.add(th);
    const knee = new THREE.Group(); knee.position.y = -.4; lg.add(knee);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(.062, 10, 8), pantMat); knee.add(kn);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(.06, .048, .34, 10), pantMat); cf.position.y = -.17; cf.castShadow = true; knee.add(cf);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.13, .1, .25), bootMat); bt.position.set(0, -.36, .05); bt.castShadow = true; knee.add(bt);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(.062, 10, 8), bootMat); toe.scale.set(1.05, .75, 1.3); toe.position.set(0, -.375, .155); knee.add(toe);
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.33, .14, .25), pantMat); pelvis.position.y = .99; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.35, .055, .27), mat(0x241a10)); belt.position.y = 1.075; g.add(belt);
  const upper = new THREE.Group(); upper.position.y = 1.1; g.add(upper);
  const abs = new THREE.Mesh(new THREE.BoxGeometry(.32, .18, .24), sleeveMat); abs.position.y = .1; abs.castShadow = true; upper.add(abs);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.46, .36, .32), [VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_FRONT, VEST_BACK]);
  chest.position.y = .36; chest.castShadow = true; upper.add(chest);
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .28, .42, 0); upper.add(ag);
    const del = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), sleeveMat); del.position.y = .01; del.castShadow = true; ag.add(del);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.062, .055, .24, 10), sleeveMat); ua.position.y = -.12; ua.castShadow = true; ag.add(ua);
    const el = new THREE.Group(); el.position.y = -.26; ag.add(el);
    const elb = new THREE.Mesh(new THREE.SphereGeometry(.056, 10, 8), mat(SKIN)); el.add(elb);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.054, .046, .2, 10), skinMat); fa.position.y = -.11; fa.castShadow = true; el.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.082, 10, 8), mat(0xf2c896)); hand.scale.set(.95, 1.15, .85); hand.position.y = -.25; hand.castShadow = true; el.add(hand);
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .062, .1, 10), skinMat); neck.position.y = .56; upper.add(neck);
  const head = new THREE.Group(); head.position.y = .72; upper.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.125, 16, 14), skinMat); skull.scale.set(.95, 1.04, .95); skull.castShadow = true; head.add(skull);
  const eyeW = new THREE.SphereGeometry(.032, 10, 8), wM = mat(0xf8f8f4);
  const eL = new THREE.Mesh(eyeW, wM); eL.position.set(-.048, .02, .105); head.add(eL);
  const eR = new THREE.Mesh(eyeW, wM); eR.position.set(.048, .02, .105); head.add(eR);
  const pG = new THREE.SphereGeometry(.015, 8, 6), pM = mat(0x1c1c24);
  const pL = new THREE.Mesh(pG, pM); pL.position.set(-.048, .02, .132); head.add(pL);
  const pR = new THREE.Mesh(pG, pM); pR.position.set(.048, .02, .132); head.add(pR);
  const browG = new THREE.BoxGeometry(.05, .016, .016), bM = mat(0x2a2018);
  const bL = new THREE.Mesh(browG, bM); bL.position.set(-.05, .062, .112); bL.rotation.z = -.12; head.add(bL);
  const bR = new THREE.Mesh(browG, bM); bR.position.set(.05, .062, .112); bR.rotation.z = .12; head.add(bR);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), skinMat); nose.position.set(0, -.005, .125); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.045, .009, 6, 12, 1.4), mat(0x7a4034)); mouth.position.set(0, -.06, .108); mouth.rotation.z = -2.27; head.add(mouth);
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(.128, .134, .08, 16), mat(HELMET)); helmet.position.y = .085; helmet.castShadow = true; head.add(helmet);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.138, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffdc57)); dome.position.y = .09; head.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.17, .176, .024, 16), mat(HELMET)); brim.position.y = .045; head.add(brim);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.034, .05, .23), mat(0xe8b820)); ridge.position.y = .155; head.add(ridge);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(.115, .009, 6, 12, Math.PI * .9), mat(0x222222)); strap.position.y = -.045; strap.rotation.y = Math.PI / 2; strap.rotation.z = Math.PI + .12; head.add(strap);
  return { g, hipL: L.lg, hipR: R.lg, kneeL: L.knee, kneeR: R.knee, shL: La.ag, shR: Ra.ag, elL: La.el, elR: Ra.el, upper, cfg: { bob: .06 } };
}

/* ============ 設計C:Q版三頭身(大頭可愛) ============ */
function buildC() {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const skinMat = mat(0xf0c8a0), pantMat = mat(PANTS), bootMat = mat(BOOTS);
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .1, .4, 0);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.062, .055, .28, 10), pantMat); th.position.y = -.14; th.castShadow = true; lg.add(th);
    const knee = new THREE.Group(); knee.position.y = -.28; lg.add(knee);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.13, .09, .18), bootMat); bt.position.set(0, -.03, .03); bt.castShadow = true; knee.add(bt);
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.36, .34, .28), [VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_FRONT, VEST_BACK]);
  torso.position.y = .62; torso.castShadow = true; g.add(torso);
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), VEST_SIDE); tummy.scale.set(1, .9, .82); tummy.position.y = .58; g.add(tummy);
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .21, .74, 0); g.add(ag);
    const del = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), VEST_SIDE); ag.add(del);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.05, .046, .18, 10), VEST_SIDE); ua.position.y = -.1; ag.add(ua);
    const el = new THREE.Group(); el.position.y = -.19; ag.add(el);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.062, 10, 8), skinMat); hand.position.y = -.05; el.add(hand);
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);
  const head = new THREE.Group(); head.position.y = 1.12; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.27, 20, 16), skinMat); skull.scale.set(1, .96, .95); skull.castShadow = true; head.add(skull);
  const eyeG = new THREE.SphereGeometry(.055, 12, 10), eM = mat(0x241f2e);
  const eL = new THREE.Mesh(eyeG, eM); eL.position.set(-.095, .03, .225); head.add(eL);
  const eR = new THREE.Mesh(eyeG, eM); eR.position.set(.095, .03, .225); head.add(eR);
  const hiG = new THREE.SphereGeometry(.018, 8, 6), hM = mat(0xffffff);
  const hL = new THREE.Mesh(hiG, hM); hL.position.set(-.078, .05, .272); head.add(hL);
  const hR = new THREE.Mesh(hiG, hM); hR.position.set(.112, .05, .272); head.add(hR);
  const blG = new THREE.SphereGeometry(.028, 8, 6), bM2 = mat(0xf2a08a);
  const bl1 = new THREE.Mesh(blG, bM2); bl1.scale.set(1, .6, .4); bl1.position.set(-.17, -.045, .185); head.add(bl1);
  const bl2 = new THREE.Mesh(blG, bM2); bl2.scale.set(1, .6, .4); bl2.position.set(.17, -.045, .185); head.add(bl2);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.035, .01, 6, 10, 1.6), mat(0x7a4034)); mouth.position.set(0, -.095, .243); mouth.rotation.z = -2.37; head.add(mouth);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.285, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(HELMET)); helmet.position.y = .015; helmet.castShadow = true; head.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.31, .318, .028, 18), mat(HELMET)); brim.position.y = .01; head.add(brim);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.04, .06, .34), mat(0xe8b820)); ridge.position.y = .22; head.add(ridge);
  return { g, hipL: L.lg, hipR: R.lg, kneeL: L.knee, kneeR: R.knee, shL: La.ag, shR: Ra.ag, elL: La.el, elR: Ra.el, cfg: { bob: .07, freq: 1.3, kneeAmp: .5 } };
}

/* ============ 設計D:港漫激肌(7.5頭身 誇張V型爆肌) ============ */
function buildD() {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const skinMat = mat(SKIN);
  const pantMat = mat(PANTS), bootMat = mat(BOOTS);
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .115, .99, 0);
    const hipS = new THREE.Mesh(new THREE.SphereGeometry(.105, 10, 8), pantMat); hipS.position.y = -.02; lg.add(hipS);
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.105, .072, .48, 10), pantMat); th.position.y = -.24; th.castShadow = true; lg.add(th);
    const knee = new THREE.Group(); knee.position.y = -.48; lg.add(knee);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), pantMat); knee.add(kn);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(.072, .05, .42, 10), pantMat); cf.position.y = -.21; cf.castShadow = true; knee.add(cf);
    const cm = new THREE.Mesh(new THREE.SphereGeometry(.082, 10, 8), pantMat); cm.scale.set(.95, 1.7, 1); cm.position.set(0, -.15, -.022); knee.add(cm);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.12, .13, .27), bootMat); bt.position.set(0, -.445, .055); bt.castShadow = true; knee.add(bt);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(.115, .06, .11), bootMat); toe.position.set(0, -.475, .175); knee.add(toe);
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.29, .13, .23), pantMat); pelvis.position.y = 1.05; pelvis.castShadow = true; g.add(pelvis);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.305, .05, .24), mat(0x241a10)); belt.position.y = 1.115; g.add(belt);
  const upper = new THREE.Group(); upper.position.y = 1.14; g.add(upper);
  const abs = new THREE.Mesh(new THREE.BoxGeometry(.24, .18, .2), mat(0xe86f12)); abs.position.y = .1; abs.castShadow = true; upper.add(abs);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.58, .34, .38), [VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_SIDE, VEST_FRONT, VEST_BACK]);
  chest.position.y = .34; chest.castShadow = true; upper.add(chest);
  const pecL = new THREE.Mesh(new THREE.SphereGeometry(.125, 12, 10), VEST_SIDE); pecL.scale.set(1.15, .72, .7); pecL.position.set(-.145, .345, .175); upper.add(pecL);
  const pecR = pecL.clone(); pecR.position.x = .145; upper.add(pecR);
  const lats = new THREE.Mesh(new THREE.BoxGeometry(.54, .26, .14), VEST_SIDE); lats.position.set(0, .27, -.16); upper.add(lats);
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .345, .42, 0); upper.add(ag);
    const del = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), VEST_SIDE); del.position.y = .015; del.castShadow = true; ag.add(del);
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.06, .055, .2, 10), VEST_SIDE); ua.position.y = -.1; ua.castShadow = true; ag.add(ua);
    const bic = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), VEST_SIDE); bic.scale.set(1, 1.25, 1); bic.position.set(0, -.12, .028); ag.add(bic);
    const el = new THREE.Group(); el.position.y = -.22; ag.add(el);
    const elb = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), mat(SKIN)); el.add(elb);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.055, .045, .24, 10), skinMat); fa.position.y = -.12; fa.castShadow = true; el.add(fa);
    const frm = new THREE.Mesh(new THREE.SphereGeometry(.052, 10, 8), skinMat); frm.scale.set(1, 1.5, 1); frm.position.set(0, -.1, .012); el.add(frm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.062, 10, 8), skinMat); hand.scale.set(.9, 1.3, .8); hand.position.y = -.27; el.add(hand);
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.065, .075, .12, 10), skinMat); neck.position.y = .55; upper.add(neck);
  const traps = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, .12), VEST_SIDE); traps.position.y = .53; traps.rotation.x = .25; upper.add(traps);
  const head = new THREE.Group(); head.position.y = .72; upper.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 12), skinMat); skull.scale.set(.98, 1.02, .96); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.15, .08, .13), skinMat); jaw.position.set(0, -.075, .02); head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.018, .05, 5), skinMat); nose.rotation.x = Math.PI / 2; nose.position.set(0, -.01, .108); head.add(nose);
  const eyeG = new THREE.BoxGeometry(.038, .013, .01), eM = mat(0x1c1c24);
  const eL = new THREE.Mesh(eyeG, eM); eL.position.set(-.038, .025, .088); head.add(eL);
  const eR = new THREE.Mesh(eyeG, eM); eR.position.set(.038, .025, .088); head.add(eR);
  const browG = new THREE.BoxGeometry(.05, .018, .015), bM = mat(0x1a1410);
  const bL = new THREE.Mesh(browG, bM); bL.position.set(-.04, .048, .092); bL.rotation.z = -.22; head.add(bL);
  const bR = new THREE.Mesh(browG, bM); bR.position.set(.04, .048, .092); bR.rotation.z = .22; head.add(bR);
  const scar = new THREE.Mesh(new THREE.BoxGeometry(.008, .05, .006), mat(0xb08868)); scar.position.set(-.055, .01, .085); scar.rotation.z = .5; head.add(scar);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.04, .008, .008), mat(0x7a4034)); mouth.position.set(0, -.075, .1); head.add(mouth);
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(.103, .11, .078, 14), mat(HELMET)); helmet.position.y = .062; helmet.castShadow = true; head.add(helmet);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.113, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffdc57)); dome.position.y = .068; head.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.143, .15, .022, 14), mat(HELMET)); brim.position.y = .026; head.add(brim);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(.032, .05, .2), mat(0xe8b820)); ridge.position.y = .12; head.add(ridge);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(.095, .008, 6, 12, Math.PI * .9), mat(0x222222)); strap.position.y = -.032; strap.rotation.y = Math.PI / 2; strap.rotation.z = Math.PI + .12; head.add(strap);
  return { g, hipL: L.lg, hipR: R.lg, kneeL: L.knee, kneeR: R.knee, shL: La.ag, shR: Ra.ag, elL: La.el, elR: Ra.el, upper, cfg: { bob: .05, freq: .92 } };
}

/* ============ 設計E:復古低Poly(PS1 方塊感) ============ */
function buildE() {
  const g = new THREE.Group();
  const flat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const skinM = flat(SKIN), pantM = flat(PANTS), bootM = flat(BOOTS), vestM = flat(0xff7a1a), whiteM = flat(0xe8ecf2);
  const B = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };
  function leg(sx) {
    const lg = new THREE.Group(); lg.position.set(sx * .11, .94, 0);
    const th = B(.15, .4, .15, pantM); th.position.y = -.2; lg.add(th);
    const knee = new THREE.Group(); knee.position.y = -.4; lg.add(knee);
    const cf = B(.12, .34, .12, pantM); cf.position.y = -.17; knee.add(cf);
    const bt = B(.14, .1, .24, bootM); bt.position.set(0, -.39, .04); knee.add(bt);
    return { lg, knee };
  }
  const L = leg(-1), R = leg(1); g.add(L.lg, R.lg);
  const pelvis = B(.32, .12, .22, pantM); pelvis.position.y = .99; g.add(pelvis);
  const upper = new THREE.Group(); upper.position.y = 1.06; g.add(upper);
  const abs = B(.3, .16, .2, vestM); abs.position.y = .09; upper.add(abs);
  const chest = B(.44, .3, .26, vestM); chest.position.y = .31; upper.add(chest);
  const stripe = B(.452, .06, .262, whiteM); stripe.position.y = .26; upper.add(stripe);
  const stripe2 = B(.452, .06, .262, whiteM); stripe2.position.y = .38; upper.add(stripe2);
  function arm(sx) {
    const ag = new THREE.Group(); ag.position.set(sx * .265, .4, 0); upper.add(ag);
    const del = B(.12, .12, .12, vestM); ag.add(del);
    const ua = B(.1, .22, .1, vestM); ua.position.y = -.11; ag.add(ua);
    const el = new THREE.Group(); el.position.y = -.23; ag.add(el);
    const fa = B(.09, .2, .09, skinM); fa.position.y = -.1; el.add(fa);
    const hand = B(.1, .1, .1, skinM); hand.position.y = -.24; el.add(hand);
    return { ag, el };
  }
  const La = arm(-1), Ra = arm(1);
  const neck = B(.1, .08, .1, skinM); neck.position.y = .5; upper.add(neck);
  const head = new THREE.Group(); head.position.y = .64; upper.add(head);
  const skull = B(.18, .2, .18, skinM); skull.position.y = .02; head.add(skull);
  const visor = B(.19, .045, .02, flat(0x181820)); visor.position.set(0, .05, .085); head.add(visor);
  const nose = B(.04, .05, .04, skinM); nose.position.set(0, -.01, .09); head.add(nose);
  const helmet = B(.21, .1, .21, flat(HELMET)); helmet.position.y = .13; head.add(helmet);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.105, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), flat(0xffdc57)); dome.position.y = .13; dome.castShadow = true; head.add(dome);
  const brim = B(.27, .03, .27, flat(HELMET)); brim.position.y = .085; head.add(brim);
  return { g, hipL: L.lg, hipR: R.lg, kneeL: L.knee, kneeR: R.knee, shL: La.ag, shR: Ra.ag, elL: La.el, elR: Ra.el, upper, cfg: { bob: .04, kneeAmp: .35 } };
}

/* ---------- 展場 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b14);
scene.fog = new THREE.Fog(0x0d0b14, 13, 36);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 100);
camera.position.set(0, 2.4, 8.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.minDistance = 2.2; controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * .52;

scene.add(new THREE.HemisphereLight(0x8a7ab8, 0x241f30, .8));
const fill = new THREE.DirectionalLight(0xb0a0ff, .35); fill.position.set(-4, 6, -6); scene.add(fill);

const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshLambertMaterial({ color: 0x141020 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(60, 60, 0x2c2444, 0x1c1728); grid.position.y = .002; scene.add(grid);

const DESIGNS = [
  { key: "A", name: "寫實大隻", build: buildA, pos: -5.2 },
  { key: "B", name: "美式卡通", build: buildB, pos: -2.6 },
  { key: "C", name: "Q版三頭身", build: buildC, pos: 0 },
  { key: "D", name: "港漫激肌", build: buildD, pos: 2.6 },
  { key: "E", name: "復古低Poly", build: buildE, pos: 5.2 }
];

const rigs = DESIGNS.map((d) => {
  const pg = new THREE.Group(); pg.position.set(d.pos, 0, 0); scene.add(pg);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.1, .14, 36), new THREE.MeshLambertMaterial({ color: 0x1e1a30 }));
  plat.position.y = -.07; plat.receiveShadow = true; pg.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, .022, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffb03a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .005; pg.add(ring);
  const spin = new THREE.Group(); pg.add(spin);
  const rig = d.build(); rig.phase = Math.random() * 6; spin.add(rig.g);
  const pill = textPill(`${d.key} · ${d.name}`, "#ffd98a", "rgba(14,12,24,.8)", "rgba(255,176,58,.55)", 800);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pill.tex, transparent: true }));
  sp.scale.set(pill.aspect * .55, .55, 1); sp.position.y = 2.45; pg.add(sp);
  const spot = new THREE.SpotLight(0xffe0b0, 2.4, 0, .5, .45, 0);
  spot.position.set(d.pos, 6.2, 1.6); spot.target.position.set(d.pos, .8, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024);
  scene.add(spot, spot.target);
  return { ...rig, spin, d };
});

/* ---------- 互動 ---------- */
let walkOn = false, speed = 0, focusData = null;
const walkBtn = document.getElementById("walkBtn");
const setWalk = v => { walkOn = v; walkBtn.textContent = walkOn ? "🚶 行路示範:開" : "🚶 行路示範:關"; walkBtn.classList.toggle("on", walkOn); };
walkBtn.onclick = () => setWalk(!walkOn);
function focus(i) {
  const x = DESIGNS[i].pos;
  focusData = { target: new THREE.Vector3(x, .95, 0), pos: new THREE.Vector3(x * .82, 1.5, 3.1) };
  document.querySelectorAll(".card").forEach((c, j) => c.classList.toggle("on", j === i));
}
document.querySelectorAll(".card").forEach((c, i) => c.onclick = () => focus(i));
renderer.domElement.addEventListener("pointerdown", () => { focusData = null; document.querySelectorAll(".card").forEach(c => c.classList.remove("on")); });
addEventListener("keydown", e => {
  if (e.code === "KeyW") setWalk(!walkOn);
  const n = parseInt(e.key); if (n >= 1 && n <= 5) focus(n - 1);
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- 主迴圈 ---------- */
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05);
  speed += ((walkOn ? 2.3 : 0) - speed) * (1 - Math.exp(-6 * dt));
  if (focusData) {
    const k = 1 - Math.exp(-5 * dt);
    camera.position.lerp(focusData.pos, k);
    controls.target.lerp(focusData.target, k);
  }
  for (const r of rigs) { animateRig(r, dt, speed); r.spin.rotation.y += dt * .4; }
  controls.update();
  renderer.render(scene, camera);
});
