// Original generated streetscape materials; no external imagery or brands.
export function createFacadeFamily(THREE, scene, faces, hero) {
 const family=new THREE.Group();family.name='HK_FACADE_FAMILY_V3';scene.add(family);
 function material(simple){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle=simple?'#b4b7b0':'#bdbbb0';x.fillRect(0,0,512,512);
  x.fillStyle='#959e97';x.fillRect(0,3,512,3);x.fillRect(2,0,2,512);x.fillStyle='#d0d1c6';x.fillRect(0,7,512,3);
  const g=x.createLinearGradient(0,86,0,345);g.addColorStop(0,simple?'#91a6af':'#8299a4');g.addColorStop(.65,'#5c7683');g.addColorStop(1,'#496570');x.fillStyle='#6f7e7c';x.fillRect(25,80,462,281);x.fillStyle='#d0d3c8';x.fillRect(29,83,454,273);x.fillStyle=g;x.fillRect(34,89,444,260);
  x.fillStyle='rgba(216,226,219,.23)';x.fillRect(38,94,105,244);x.fillStyle='rgba(30,48,55,.18)';x.fillRect(310,225,132,123);
  x.fillStyle='#bdc8c5';for(const xx of [181,329])x.fillRect(xx,89,5,260);x.fillRect(34,274,444,5);
  if(!simple){x.fillStyle='#a5aea5';x.fillRect(36,92,141,69);x.fillStyle='#697d7e';for(let y=98;y<159;y+=9)x.fillRect(38,y,137,2);}
  // Shallow AC hint in the tile (real AC units added at street level on side variant).
  x.fillStyle='#c8c9bb';x.fillRect(353,365,104,63);x.fillStyle='#687b79';for(let y=375;y<419;y+=7)x.fillRect(362,y,86,3);
  for(let i=0;i<350;i++){x.fillStyle='rgba(64,65,54,.05)';x.fillRect((i*131)%512,(i*79)%512,2,5);}
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.18,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 }
 const mats=[material(false),material(true)],records=[];
 faces.forEach((f,index)=>{
  const b=f.building,n=f.normal,t=new THREE.Vector3(n.z,0,-n.x),bc=new THREE.Vector3(b[0],0,b[1]);
  const center=bc.clone().addScaledVector(n,new THREE.Vector3().subVectors(f.pos,bc).dot(n)+.014);
  const coords=f.footprint.map(p=>p[0]*t.x+p[1]*t.z),w=Math.max(...coords)-Math.min(...coords)-.04,h=b[5];
  const g=new THREE.Group();g.position.copy(center);g.rotation.y=Math.atan2(n.x,n.z);family.add(g);
  const isHost=b===hero.building && n.dot(hero.normal)>.99;
  const type=index===0?'SIDE_MID':'BACKGROUND_LOW';
  const plane=(left,right,bottom,top)=>{if(right-left<.02||top-bottom<.02)return;const geo=new THREE.PlaneGeometry(right-left,top-bottom),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)*(right-left)+left+w/2)/3.3,(uv.getY(i)*(top-bottom)+bottom)/3.35);const m=new THREE.Mesh(geo,mats[index===0?0:1]);m.position.set((left+right)/2,(bottom+top)/2,0);m.receiveShadow=true;g.add(m);};
  if(isHost){const off=new THREE.Vector3().subVectors(hero.pos,center).dot(t);plane(-w/2,w/2,12.24,h);plane(-w/2,off-6.02,.05,12.24);plane(off+6.02,w/2,.05,12.24);}else plane(-w/2,w/2,.05,h);
  let detailCount=0;
  if(index===0){const boxes=[],B=(x,y,z,sx,sy,sz,c)=>boxes.push({x,y,z,sx,sy,sz,c});
   for(const x of [-w/2+.35,w/2-.35])B(x,h/2,.11,.08,h,.08,0x9baba4);
   for(const x of [-w/2+2.4,w/2-2.4]){B(x,5.5,.29,.9,.55,.5,0xc8c8b9);for(let k=0;k<6;k++)B(x,5.3+k*.067,.553,.72,.022,.015,0x5f7777);for(const z of [-.32,.32])B(x+z,5.12,.24,.04,.17,.5,0x66746c);}
   B(-w/2+1.2,1.2,.055,1.2,2.3,.06,0x45646a);B(-w/2+1.65,1.1,.1,.035,.25,.07,0xcccdc4);
   const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),boxes.length),o=new THREE.Object3D();boxes.forEach((a,i)=>{o.position.set(a.x,a.y,a.z);o.scale.set(a.sx,a.sy,a.sz);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,new THREE.Color(a.c));});g.add(im);detailCount=boxes.length;
  }
  records.push({type,building:b,position:center.toArray(),width:w,height:h,footprint:f.footprint,envelope:[[-w/2,0],[w/2,0],[w/2,.6],[-w/2,.6]].map(([a,d])=>[center.x+t.x*a+n.x*d,center.z+t.z*a+n.z*d]),detailBoxes:detailCount,preservesHeroHole:isHost});
 });
 window.__facadeFamily={group:family,records,textures:2,variants:2,source:'PROJECT_GENERATED'};return family;
}
