// Project-generated facade, reference-inspired proportions only. No photo/logo textures.
export function createIndustrialFacadeV2(THREE, facade) {
 const group=new THREE.Group();group.name='INDUSTRIAL_FACADE_V2';facade.add(group);
 const boxes=[],pipeData=[];const B=(x,y,z,w,h,d,c)=>boxes.push({x,y,z,w,h,d,c});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;const c=canvas.getContext('2d');
 const px=x=>(x+6)/12*2048,py=y=>(6-y)/12*2048;
 c.fillStyle='#b4b3a7';c.fillRect(0,0,2048,2048);
 // Fine aggregate and restrained panel-to-panel variation, deterministic across reloads.
 for(let i=0;i<24000;i++){const v=(i*73)%5;c.fillStyle=`rgba(${v?65:240},${v?63:236},${v?54:220},.045)`;c.fillRect((i*997)%2048,(i*373)%2048,2,3);}
 for(let x=-6;x<=6;x+=2.9){c.fillStyle='rgba(45,47,44,.24)';c.fillRect(px(x),0,2,2048);c.fillStyle='rgba(241,237,217,.3)';c.fillRect(px(x)+2,0,2,2048);}
 for(const y of [-5.9,-2.8,.98,2.18,4.55,5.72]){c.fillStyle='rgba(51,55,51,.3)';c.fillRect(0,py(y),2048,3);}
 const bands=[-.12,3.42];
 for(const [ri,y] of bands.entries()){
  const left=-5.25,right=5.25,bottom=y-1.05,top=y+1.05;
  c.fillStyle='#47545a';c.fillRect(px(left),py(top),px(right)-px(left),py(bottom)-py(top));
  for(let k=0;k<12;k++){
   const x=left+k*.875,g=c.createLinearGradient(0,py(top),0,py(bottom));g.addColorStop(0,['#647a85','#566e7b','#74858a'][(k+ri)%3]);g.addColorStop(1,'#344950');c.fillStyle=g;c.fillRect(px(x),py(top),150,360);
   c.fillStyle='rgba(14,28,34,.28)';c.fillRect(px(x)+20,py(bottom)-90-(k%3)*12,80,90+(k%3)*12);
   if((k+ri)%4===1){c.fillStyle='rgba(231,237,207,.65)';c.fillRect(px(x)+14,py(y+.2),99,5);c.fillRect(px(x)+14,py(y+.24),99,3);}
   if((k+ri)%5===0){c.fillStyle='#7b8582';c.fillRect(px(x)+3,py(top)+4,140,112);c.fillStyle='#394b50';for(let q=10;q<112;q+=11)c.fillRect(px(x)+6,py(top)+q,134,4);}
  }
  for(const yy of [bottom-.055,top+.055])B(0,yy,.12,10.75,.075,.16,0xc3c8bf);
  for(let k=0;k<=12;k++)B(left+k*.875,y,.14,.055,2.18,.14,0xb0bcb8);
  B(0,y+.38,.14,10.5,.045,.12,0xb2bbb6);
  B(0,bottom-.11,.17,10.9,.13,.34,0x9d9f95);
 }
 const ac=[[-4.25,.52],[-2.9,-1.35],[1.25,-1.35],[4.05,-1.35],[4.4,2.24]];
 for(let i=0;i<ac.length;i++){
  const [x,y]=ac[i];
  // Streaks stay on wall, never overlay glass indiscriminately.
  for(let k=0;k<9;k++){const xx=px(x-.35+k*.085),yy=py(y-.3),h=65+((i*17+k*29)%150),g=c.createLinearGradient(0,yy,0,yy+h);g.addColorStop(0,'rgba(82,66,42,.24)');g.addColorStop(1,'rgba(82,66,42,0)');c.fillStyle=g;c.fillRect(xx,yy,5+(k%3),h);}
  B(x,y,.37,.87,.57,.55,0xc5c1aa);B(x,y,.661,.73,.43,.025,0x485855);
  for(let k=0;k<7;k++)B(x,y-.18+k*.059,.681,.69,.017,.02,0xa0a99d);
  for(const off of [-.31,.31]){B(x+off,y-.38,.33,.055,.22,.55,0x555f59);B(x+off,y-.4,.2,.08,.25,.08,0x656c60);}
 }
 for(const x of [-5.63,5.63]){pipeData.push({x,y:0,h:11.9});for(let y=-5.5;y<6;y+=1.15)B(x,y,.21,.22,.045,.16,0x696f66);}
 B(0,5.84,.18,12,.22,.4,0xc5c3b4);for(const x of [-5.9,5.9])B(x,0,.1,.2,12,.2,0xc3c0ae);
 // Ground floor inset roller shutter, finished jambs, door, intercom and service cabinet.
 B(.9,-4.45,.14,6.25,2.95,.22,0x303b3c);B(.9,-4.45,.265,5.95,2.78,.05,0x747c73);
 for(let y=-5.78;y<-3.1;y+=.105)B(.9,y,.31,5.92,.021,.024,0x4c5b56);
 for(const x of [-2.25,4.04])B(x,-4.47,.24,.15,3,.35,0xa7a99c);
 B(-4,-4.44,.18,1.46,2.97,.25,0x303d3e);B(-4,-4.44,.32,1.19,2.73,.03,0x526e78);B(-3.48,-4.58,.37,.035,.35,.06,0xccccc0);
 B(-2.8,-4.24,.22,.19,.37,.1,0x555d57);B(4.83,-4.66,.27,.65,1.12,.3,0x868c7b);
 for(let k=0;k<8;k++)B(4.83,-4.9+k*.04,.425,.45,.016,.02,0x475952);
 B(.87,-2.93,.53,6.7,.19,1.02,0x5b7672);
 for(const x of [-4,-.7,2.65])B(x,-3.07,.42,.65,.045,.13,0xe6dfaf);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;facade.material.map.dispose();facade.material.map=map;facade.material.emissive=new THREE.Color(0xffffff);facade.material.emissiveMap=map;facade.material.emissiveIntensity=.28;facade.material.needsUpdate=true;
 B(0,-6.13,.6,12,.14,1.2,0x999e95);
 const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x222522,emissiveIntensity:.35}),boxes.length);const o=new THREE.Object3D();
 boxes.forEach((a,i)=>{o.position.set(a.x,a.y,a.z);o.scale.set(a.w,a.h,a.d);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new THREE.Color(a.c));});inst.receiveShadow=true;group.add(inst);
 const pipes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.063,.063,1,10),new THREE.MeshLambertMaterial({color:0x9d9f90}),2);pipeData.forEach((a,i)=>{o.position.set(a.x,a.y,.21);o.scale.set(1,a.h,1);o.updateMatrix();pipes.setMatrixAt(i,o.matrix)});group.add(pipes);
 const label=document.createElement('canvas');label.width=1024;label.height=160;const t=label.getContext('2d');t.fillStyle='#9fa99c';t.fillRect(0,0,1024,160);t.fillStyle='#294441';t.fillRect(5,5,1014,150);t.textAlign='center';t.fillStyle='#e4dfc9';t.font='bold 66px sans-serif';t.fillText('海榮工業中心',512,84);t.font='24px sans-serif';t.fillText('HOI WING INDUSTRIAL CENTRE',512,129);
 const tx=new THREE.CanvasTexture(label);tx.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.15,.91),new THREE.MeshLambertMaterial({map:tx,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.28}));sign.position.set(.85,-2.34,.24);group.add(sign);
 group.userData={version:2,acUnits:5,windowBands:2,boxes:boxes.length,triangles:boxes.length*12+80+2,drawCalls:3,textures:2,generated:true};window.__industrialFacadeProof=group.userData;return group;
}
