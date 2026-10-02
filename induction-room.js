import * as THREE from 'three';

// Original procedural interior inspired by the user's reference layout.
// No reference photographs or identifiable people are distributed as textures.
export function createInductionRoom(makeHuman, canvasTex) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c2d0d3');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6d7278, 2.3));
  const light = new THREE.DirectionalLight(0xfff8e8, 2); light.position.set(1, 6, 4); scene.add(light);
  const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 40);
  const mats = {};
  const material = color => mats[color] ||= new THREE.MeshStandardMaterial({color, roughness:.8});
  function box(w,h,d,x,y,z,color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material(color));
    mesh.position.set(x,y,z);scene.add(mesh);return mesh;
  }
  box(9,.12,8,0,-.06,0,'#c9c9bb');
  box(9,3.2,.15,0,1.6,-4,'#e4e2d7');box(.15,3.2,8,-4.5,1.6,0,'#e4e2d7');
  // Blue structural frame, fluorescent fixtures, and a separate health desk.
  for(const x of [-4.4,1.5,4.4]) box(.12,3.2,.16,x,1.6,-3.85,'#28648a');
  box(9,.14,.2,0,3,-3.85,'#28648a');
  for(const z of [-2,1]) { const lamp=box(2.4,.07,.6,-.3,3,z,'#ffffff');lamp.material=new THREE.MeshBasicMaterial({color:0xffffff}); }
  function table(x,z,w=2.8) { box(w,.09,.85,x,.76,z,'#edeee7');for(const dx of [-w/2+.15,w/2-.15])for(const dz of [-.3,.3])box(.06,.75,.06,x+dx,.375,z+dz,'#525d63'); }
  function stool(x,z) { box(.4,.08,.4,x,.44,z,'#cdcbb8');for(const dx of [-.15,.15])for(const dz of [-.15,.15])box(.05,.43,.05,x+dx,.215,z+dz,'#9c9d92'); }
  for(const z of [-.8,1.4]) { table(-1.5,z);for(const x of [-2.4,-.8])stool(x,z+.7); }
  table(2.6,-2.4,2.3);stool(2.6,-1.4);
  function poster(text,x,y,z,w=2,h=.8,color='#176c70') {
    const tex=canvasTex(768,256,ctx=>{ctx.fillStyle='#f5f5eb';ctx.fillRect(0,0,768,256);ctx.fillStyle=color;ctx.fillRect(0,0,768,58);ctx.fillStyle='#fff';ctx.font='bold 32px sans-serif';ctx.fillText('KL · SAFETY / 安全第一',25,40);ctx.fillStyle='#23363d';ctx.font='bold 52px sans-serif';ctx.fillText(text,25,160);});
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));p.position.set(x,y,z);scene.add(p);
  }
  poster('整理 · 整頓 · 清潔 · 安全',-1.9,2.3,-3.9,4,1.05);
  poster('入職訓練室',2.6,2.6,-3.9,2.5,.7,'#28648a');
  poster('健康檢查 · 先休息再量度',2.6,1.65,-3.9,2.5,.7);
  // Visible blood pressure monitor, cuff and paper register on the desk.
  box(.36,.18,.3,2.9,.9,-2.4,'#eef1ef');box(.22,.10,.015,2.9,.95,-2.235,'#347d66');
  const cuff=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,8,20),material('#3b5064'));cuff.position.set(2.35,.87,-2.25);cuff.rotation.x=Math.PI/2;scene.add(cuff);
  box(.25,.01,.3,3.35,.82,-2.4,'#ffffff');
  const trainer=makeHuman({vest:true,helmet:0xf4f4f4,sex:'M'});trainer.g.position.set(-3.1,0,-2.7);scene.add(trainer.g);
  const pupils=[];
  for(const [i,x,z] of [[0,-2.4,-.1],[1,-.8,-.1],[2,-2.4,2.1],[3,-.8,2.1]]) {
    const p=makeHuman({vest:true,helmet:0xffd23a,sex:i%2?'F':'M'});p.g.position.set(x,-.42,z);p.g.rotation.y=Math.PI;scene.add(p.g);pupils.push(p);
  }
  function update(mode,time) {
    camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,innerWidth*.16,0,innerWidth,innerHeight);camera.updateProjectionMatrix();
    camera.position.set(mode==='health'?4.8:4.7,mode==='health'?2.1:2.3,mode==='health'?2.1:6.5);
    camera.lookAt(mode==='health'?2.4:-.6,1.1,mode==='health'?-2.1:-.7);
    trainer.g.position.set(mode==='health'?1.7:-3.1,0,-2.7);
    trainer.animate(0,0);
    if(trainer.bones) { const arm=trainer.bones.find(b=>b.name==='rightArm');if(arm)arm.rotation.x=-.65+Math.sin(time*.002)*.08; }
    for(const p of pupils) {
      p.animate(0,0);
      for(const side of ['left','right']) {
        const thigh=p.bones?.find(b=>b.name===side+'Thigh'),shin=p.bones?.find(b=>b.name===side+'Shin');
        if(thigh)thigh.rotation.x=-Math.PI/2;if(shin)shin.rotation.x=Math.PI/2;
      }
    }
  }
  return {scene,camera,update};
}
