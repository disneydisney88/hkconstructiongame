// Original project art: one opt-in industrial facade, no external textures/models.
export function addIndustrialFacade(THREE, facade) {
  const group=new THREE.Group();group.name='HK_INDUSTRIAL_FACADE_V1';facade.add(group);
  const boxes=[];const pipes=[];
  const box=(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color});
  const width=facade.geometry.parameters.width,height=facade.geometry.parameters.height;
  const floor=-height/2;
  // Ground-floor masonry apron, recessed roller shutter and a side personnel entrance.
  box(0,floor+1.55,.08,width,3.1,.15,0x8d938d);
  box(.7,floor+1.42,.18,5.2,2.8,.2,0x303f45);
  box(.7,floor+1.42,.31,4.95,2.62,.08,0x879691);
  for(let y=.2;y<2.65;y+=.13)box(.7,floor+y,.37,4.9,.026,.025,0x5d706d);
  for(const x of [-1.98,3.38])box(x,floor+1.5,.32,.17,3,.3,0xc5c7b9);
  box(-3.75,floor+1.32,.19,1.35,2.55,.24,0x45595d);
  box(-3.75,floor+1.6,.34,1.08,1.72,.035,0x6c929e);
  box(-3.26,floor+1.14,.39,.035,.26,.04,0xe4dfc4);
  box(.7,floor+3.1,.58,5.6,.16,1.12,0x506964);
  // Window ledges and projecting AC housings: separate front grille texture shared by all.
  for(let row=1;row<4;row++) {
    const y=floor+row*3+.45;
    for(let col=0;col<4;col++) {
      const x=-width/2+1.5+col*3;
      box(x,y,.2,2.48,.12,.42,0xd7d9cb);
      if(row===1 || (row+col)%3===0)continue;
      const ax=x+.58,ay=y-.47;
      box(ax,ay,.4,.76,.48,.65,0xc5c6b2);
      box(ax-.3,ay-.3,.33,.05,.18,.55,0x5e6966);
      box(ax+.3,ay-.3,.33,.05,.18,.55,0x5e6966);
      for(let k=0;k<6;k++)box(ax,ay-.16+k*.064,.733,.65,.022,.02,0x687773);
    }
  }
  for(const x of [-width/2+.17,width/2-.17]) {
    pipes.push({x,y:.03,z:.24,h:height-.1,r:.055});
    for(let y=floor+.8;y<height/2;y+=1.7)box(x,y,.23,.2,.055,.15,0x63716b);
  }
  // Roof parapet trim and downpipe lower elbow impression.
  box(0,height/2-.06,.16,width,.18,.32,0xd1d0bf);
  for(const x of [-width/2+.17,width/2-.17])box(x,floor+.15,.36,.15,.2,.35,0x9aaba0);
  const mat=new THREE.MeshLambertMaterial({color:0xffffff});
  const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,boxes.length);
  const dummy=new THREE.Object3D();boxes.forEach((a,i)=>{dummy.position.set(a.x,a.y,a.z);dummy.scale.set(a.w,a.h,a.d);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);inst.setColorAt(i,new THREE.Color(a.color));});inst.receiveShadow=true;group.add(inst);
  const pi=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,8),new THREE.MeshLambertMaterial({color:0x9aaba0}),pipes.length);
  pipes.forEach((a,i)=>{dummy.position.set(a.x,a.y,a.z);dummy.scale.set(a.r,a.h,a.r);dummy.updateMatrix();pi.setMatrixAt(i,dummy.matrix)});group.add(pi);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#e6e2c9';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#255052';ctx.fillRect(8,8,1008,144);ctx.textAlign='center';ctx.fillStyle='#f4efd7';ctx.font='bold 68px sans-serif';ctx.fillText('海榮工業中心',512,83);ctx.font='23px sans-serif';ctx.fillText('HOI WING INDUSTRIAL CENTRE  ·  貨物出入口',512,128);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.5,.86),new THREE.MeshLambertMaterial({map:tex}));sign.position.set(.7,floor+3.68,.8);group.add(sign);
  group.userData={boxes:boxes.length,pipes:pipes.length,drawCalls:3,triangles:boxes.length*12+pipes.length*32+2,textures:1,licence:'PROJECT_ORIGINAL',testOnly:true};
  return group;
}
