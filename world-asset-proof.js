import { createFacadeFamily } from './facade-family-v3.js';
import { createIndustrialFacadeV2 } from './industrial-facade-v2.js';
import { addIndustrialFacade } from './industrial-facade-proof.js';
// Original project procedural art. No external images, real signs or third-party models.
// One opt-in window-wall study; does not alter collisions or building instances.
export function createWorldAssetProof(THREE, scene, buildings, spawn, excluded, boundary = {}) {
  if(boundary.openings?.list?.length)spawn=[boundary.openings.list[0].x,boundary.openings.list[0].z];
  const candidates=[];
  const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  const overlap=(a,b)=>{if(a.some(p=>inside(p,b))||b.some(p=>inside(p,a)))return true;const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],u=b[j],v=b[(j+1)%b.length];if(cross(p,q,u)*cross(p,q,v)<0&&cross(u,v,p)*cross(u,v,q)<0)return true;}return false;};
  const legacy=new URLSearchParams(location.search).get('facadeVersion')==='1';
  for(const b of buildings){
    if(b[6]===1 || b[5]<6 || excluded(b[0],b[1]))continue;
    const [x,z,hw,hd,rot,h]=b, q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-rot);
    const footprint=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([a,c])=>{const v=new THREE.Vector3(a,0,c).applyQuaternion(q);return [v.x+x,v.z+z]});
    if(!legacy && (boundary.zones||[]).some(z=>overlap(footprint,z.pts)))continue;
    const local=new THREE.Vector3(spawn[0]-x,0,spawn[1]-z).applyQuaternion(q.clone().invert());
    for(const side of [-1,1])for(const axis of ['x','z']){
      const half=axis==='z'?hw:hd, width=Math.min(12,half*2-.3);if(width<4)continue;
      const along=THREE.MathUtils.clamp(axis==='z'?local.x:local.z,-half+width/2+.1,half-width/2-.1);
      const pos=new THREE.Vector3(axis==='z'?along:side*(hw+.035),0,axis==='z'?side*(hd+.035):along).applyQuaternion(q).add(new THREE.Vector3(x,0,z));
      const normal=new THREE.Vector3(axis==='x'?side:0,0,axis==='z'?side:0).applyQuaternion(q);
      if(normal.dot(new THREE.Vector3(spawn[0]-pos.x,0,spawn[1]-pos.z))<=0)continue;
      const tangent=new THREE.Vector3(normal.z,0,-normal.x);
      const frontFootprint=[[-width/2,0],[width/2,0],[width/2,1.2],[-width/2,1.2]].map(([a,d])=>[pos.x+tangent.x*a+normal.x*d,pos.z+tangent.z*a+normal.z*d]);
      if(!legacy && (boundary.zones||[]).some(z=>overlap(frontFootprint,z.pts)))continue;
      if(!legacy && (boundary.openings?.list||[]).some(o=>Math.hypot(o.x-pos.x,o.z-pos.z)<width/2+10))continue;
      candidates.push({pos,normal,width,footprint,frontFootprint,height:Math.min(12,h-.4),distance:Math.hypot(pos.x-spawn[0],pos.z-spawn[1]),building:b});
    }
  }
  const f=candidates.sort((a,b)=>a.distance-b.distance)[0];if(!f)return {status:'NO_SUITABLE_EXISTING_WALL'};
  if(!legacy){
    const chosen=[];const used=new Set();
    for(const c of [f,...candidates]){
      if(used.has(c.building)||c.distance>230)continue;
      const n=c.normal,t=new THREE.Vector3(n.z,0,-n.x),bc=new THREE.Vector3(c.building[0],0,c.building[1]),center=bc.clone().addScaledVector(n,new THREE.Vector3().subVectors(c.pos,bc).dot(n)+.014),vals=c.footprint.map(p=>p[0]*t.x+p[1]*t.z),w=Math.max(...vals)-Math.min(...vals)-.04;
      const env=[[-w/2,0],[w/2,0],[w/2,.6],[-w/2,.6]].map(([a,d])=>[center.x+t.x*a+n.x*d,center.z+t.z*a+n.z*d]);
      if((boundary.zones||[]).some(z=>overlap(env,z.pts)))continue;
      if((boundary.openings?.list||[]).some(o=>inside([o.x,o.z],env)))continue;
      chosen.push(c);used.add(c.building);if(chosen.length===3)break;
    }
    createFacadeFamily(THREE,scene,chosen,f);
  }

  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#c7c9bd';c.fillRect(0,0,1024,1024);
  // Ceramic panel joints, muted blue daylight glass, staggered blinds and repeated mullions.
  for(let y=0;y<1024;y+=18){c.fillStyle='rgba(73,85,82,.12)';c.fillRect(0,y,1024,1);}
  const rows=Math.max(2,Math.round(f.height/3.1)),cols=Math.max(2,Math.round(f.width/2.9)),cw=1024/cols,rh=1024/rows;
  for(let row=0;row<rows;row++){
    c.fillStyle='#a7b1aa';c.fillRect(0,row*rh,1024,12);c.fillStyle='#ecede1';c.fillRect(0,row*rh+12,1024,7);
    for(let col=0;col<cols;col++){
      const x=col*cw+cw*.1,y=row*rh+rh*.18,w=cw*.8,h=rh*.63;
      c.fillStyle='#7d8887';c.fillRect(x-7,y-5,w+14,h+14);
      c.fillStyle='#e4e5d8';c.fillRect(x-4,y-5,w+8,h+7);
      const gr=c.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,['#90acb6','#a0b4b9','#839ea8'][(col+row*2)%3]);gr.addColorStop(1,'#536b76');c.fillStyle=gr;c.fillRect(x,y,w,h);
      if((col+row)%3!==0){const bh=h*(.23+((col*7+row*3)%4)*.12);c.fillStyle='#c0c2b6';c.fillRect(x+3,y+3,w-6,bh);c.fillStyle='#8f9994';for(let k=7;k<bh;k+=7)c.fillRect(x+3,y+k,w-6,1);}
      c.fillStyle='#ccd5cf';for(let k=1;k<3;k++)c.fillRect(x+w*k/3-2,y,4,h);c.fillRect(x,y+h*.68,w,4);
      c.fillStyle='rgba(221,237,237,.22)';c.fillRect(x+4,y+h*.7,w*.26,h*.27);
      c.fillStyle='#eef0e5';c.fillRect(x-7,y+h+4,w+14,6);c.fillStyle='rgba(35,45,44,.22)';c.fillRect(x-7,y+h+10,w+14,4);
    }
  }
  for(let i=0;i<1500;i++){c.fillStyle='rgba(59,72,65,.045)';c.fillRect((i*73)%1024,(i*137)%1024,2,5);}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(f.width,f.height),new THREE.MeshLambertMaterial({map,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  mesh.name='WORLD_ASSET_008_WINDOW_FACADE';mesh.position.copy(f.pos);mesh.position.y=f.height/2+.2;mesh.rotation.y=Math.atan2(f.normal.x,f.normal.z);mesh.receiveShadow=true;scene.add(mesh);
  if(!legacy)createIndustrialFacadeV2(THREE,mesh);
  if(legacy && new URLSearchParams(location.search).get('industrialFacadeTest')==='1') {const detail=addIndustrialFacade(THREE,mesh);window.__industrialFacadeProof=detail.userData;}
  return {status:'GENERATED',mesh,position:mesh.position.toArray(),normal:f.normal.toArray(),width:f.width,height:f.height,triangles:2,textures:1,drawCalls:1,source:'PROJECT_GENERATED',building:f.building,footprint:f.footprint,frontFootprint:f.frontFootprint,boundary};
}
