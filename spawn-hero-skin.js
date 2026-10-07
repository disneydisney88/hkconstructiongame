// Project-authored detached visual skins. Never adds colliders or edits host meshes.
export function createSpawnHeroSkin(T, scene) {
 const group=new T.Group();group.name='SPAWN_HERO_VISUAL_ONLY';
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
 for(let v=0;v<8;v++) {const x=(v%4)*256,y=Math.floor(v/4)*512;c.save();c.translate(x,y);
 c.fillStyle=v===5?'#bbb9a9':'#ccc9b9';c.fillRect(0,0,256,512);
 c.strokeStyle='#b0afa3';c.lineWidth=1;for(let k=0;k<512;k+=22){c.beginPath();c.moveTo(0,k);c.lineTo(256,k);c.stroke()}for(let k=0;k<256;k+=32){c.beginPath();c.moveTo(k,0);c.lineTo(k,512);c.stroke()}
 c.fillStyle='#aaa998';c.fillRect(0,490,256,22);c.fillStyle='#e0dfd2';c.fillRect(0,484,256,7);
 if(v<5){c.fillStyle='#737d78';c.fillRect(19,90,218,295);c.fillStyle='#d5d7c9';c.fillRect(23,87,210,288);c.fillStyle=['#43616a','#597681','#3e5c62','#58746f','#658189'][v];c.fillRect(30,96,196,268);
 c.fillStyle='#b6c1b9';for(let k=1;k<3;k++)c.fillRect(30+k*65,96,5,268);c.fillRect(30,270,196,5);if(v===1)c.fillRect(30,172,196,6);
 if(v===2){c.fillStyle='#a7b0a6';c.fillRect(33,98,188,125);c.fillStyle='#7c918a';for(let k=104;k<221;k+=10)c.fillRect(33,k,188,2)}
 if(v===3){c.fillStyle='#afada0';c.fillRect(102,278,116,72);c.fillStyle='#4f5e5b';for(let k=285;k<345;k+=7)c.fillRect(110,k,100,3)}
 if(v===4){c.fillStyle='#969b8a';c.fillRect(33,99,60,169);c.fillStyle='#425952';c.fillRect(167,280,55,79)}
 c.fillStyle='rgba(202,222,225,.18)';c.beginPath();c.moveTo(35,100);c.lineTo(90,100);c.lineTo(35,190);c.fill();c.fillStyle='#deded0';c.fillRect(16,374,224,9);c.fillStyle='#8c8f82';c.fillRect(16,383,224,8);
 }else if(v===6){c.fillStyle='#4b5552';c.fillRect(9,72,238,432);c.fillStyle='#818a83';c.fillRect(21,84,214,409);for(let k=85;k<490;k+=10){c.fillStyle='#4e5d58';c.fillRect(21,k,214,3);c.fillStyle='#a4aaa0';c.fillRect(21,k+3,214,1)}c.fillStyle='#2e5146';c.fillRect(8,12,240,53);c.fillStyle='#e1dfc6';c.font='bold 22px sans-serif';c.fillText('工業單位',70,46);
 }else if(v===7){c.fillStyle='#838a80';c.fillRect(25,96,207,411);c.fillStyle='#303f3d';c.fillRect(36,107,186,397);c.fillStyle='#537071';c.fillRect(44,118,169,217);c.fillStyle='#abb6ac';c.fillRect(197,350,5,65);c.fillStyle='#b6b8a8';c.fillRect(1,300,24,80);c.fillStyle='#4d5d56';for(let k=309;k<370;k+=6)c.fillRect(4,k,18,2);c.fillStyle='#ddc360';c.fillRect(50,370,60,25);}
 c.fillStyle='rgba(66,64,44,.10)';for(let k=0;k<40;k++)c.fillRect((k*97+v*37)%256,390+(k*13)%80,2,20+(k%7)*3);c.restore(); }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 const mat=new T.MeshLambertMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.12});
 const positions=[],uvs=[],normals=[],boxes=[],records=[];
 function face(center,normal,width,height,label,roof) {const n=normal.clone().normalize(),u=new T.Vector3(n.z,0,-n.x),up=new T.Vector3(0,1,0);const origin=center.clone();origin.y=0;origin.addScaledVector(n,.065);
 function quad(x,y,w,h,tile,depth=0,crop=null){const pts=[[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]],ids=[0,1,2,0,2,3],uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of ids){const p=origin.clone().addScaledVector(u,pts[i][0]).addScaledVector(up,pts[i][1]).addScaledVector(n,depth);positions.push(...p.toArray());normals.push(...n.toArray());uvs.push(((tile%4)*256+(crop?crop[0]:1)+uv[i][0]*(crop?crop[2]:254))/1024,1-(Math.floor(tile/4)*512+(crop?crop[1]+crop[3]:511)-uv[i][1]*(crop?crop[3]:510))/1024)}}
 function box(x,y,z,w,h,d,color){const p=origin.clone().addScaledVector(u,x).addScaledVector(up,y).addScaledVector(n,z);boxes.push({p,q:new T.Quaternion().setFromAxisAngle(up,Math.atan2(n.x,n.z)),s:new T.Vector3(w,h,d),color})}
 const cols=Math.max(1,Math.round(width/1.65)),rows=Math.round(height/3.1),bw=width/cols,bh=height/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=-width/2+(col+.5)*bw,y=(row+.5)*bh;let tile=(col*7+row*3+Math.floor(col/3))%5;if((col+row*7)%13===0)tile=5;if(row===0)tile=col%4===0?7:col%4===1?5:6;quad(x,y,bw,bh,tile)}
 // Geometry restricted to first two storeys and a few long service elements.
 for(let row=1;row<=Math.min(rows,2);row++)box(0,row*bh,.08,width,.09,.20,0xbdbdae);
 for(const side of [-1,1])box(side*(width/2-.16),Math.min(height,18)/2,.08,.07,Math.min(height,18),.07,0x969e94);
 if(width<15){box(0,3.0,.31,width*.92,.11,.62,0x70847b);box(0,.22,.035,width,.38,.07,0x70756b);
 for(let i=0;i<2;i++) {quad(-width*.28+i*width*.48,4.9+i*3.1,.63,.34,3,.505,[110,283,100,60]);box(-width*.28+i*width*.48,4.9+i*3.1,.28,.72,.48,.44,0xb4b7a6);box(-width*.28+i*width*.48,4.61+i*3.1,.29,.83,.07,.52,0x6b786f)}
 if(roof)box(0,height+.18,0,width,.36,.17,0xa5ad9f);}
 records.push({label,center:origin.toArray(),normal:n.toArray(),width,height,cols,rows,maxProjection:width<15?.69:.265,visualOnly:true}); }
 scene.updateMatrixWorld(true);
 const left=scene.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.geometry?.parameters?.width===11&&Math.abs(o.position.x+791.167997636)<.1);
 const adjacent=scene.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.geometry?.parameters?.width===11&&Math.abs(o.position.x+782.126950781)<.1);
 for(const [host,dirs] of [[left,['front','side']],[adjacent,['side']]])if(host){const q=host.quaternion,h=host.geometry.parameters.height;for(const dir of dirs){const n=new T.Vector3(dir==='front'?0:-1,0,dir==='front'?1:0).applyQuaternion(q),center=host.position.clone().addScaledVector(n,dir==='front'?4.5:5.5);face(center,n,dir==='front'?11:9,h,host===left?'left_'+dir:'adjacent_side',true)}}
 let found=false;scene.traverse(o=>{if(found||!o.isInstancedMesh||o.geometry?.parameters?.width!==1)return;for(let i=0;i<o.count;i++){const m=new T.Matrix4();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();m.decompose(p,q,s);if(Math.abs(p.x+749.9)<.1&&Math.abs(p.z-982.7)<.1){face(p.clone().addScaledVector(new T.Vector3(-1,0,0).applyQuaternion(q),s.x/2),new T.Vector3(-1,0,0).applyQuaternion(q),s.z,37.2,'right_tower_west',false);found=true;break}}});
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));const mesh=new T.Mesh(geo,mat);mesh.name='Noncollision_modular_facade_panels';group.add(mesh);
 const equipment=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xffffff}),boxes.length);boxes.forEach((b,i)=>{equipment.setMatrixAt(i,new T.Matrix4().compose(b.p,b.q,b.s));equipment.setColorAt(i,new T.Color(b.color))});equipment.name='Noncollision_facade_equipment';group.add(equipment);scene.add(group);
 window.__spawnHero={group,records,triangles:positions.length/9+boxes.length*12,textures:1,drawCalls:2,boxes:boxes.length,source:'PROJECT_GENERATED'};return group;
}
