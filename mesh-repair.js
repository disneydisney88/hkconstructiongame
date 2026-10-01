import * as THREE from 'three';

// Clip the crossing triangles at the actual cut, retaining their surface up to
// the seam. Dropping whole triangles leaves a saw-tooth gap at sleeve edges.
export function splitAndCap(geo, distances, boneCount) {
  const names=Object.keys(geo.attributes), arrays=Object.fromEntries(names.map(n=>[n,[]]));
  const partIds=[];
  const boundary=new Map();
  const vertex=i=>Object.fromEntries(names.map(n=>[n,Array.from({length:geo.attributes[n].itemSize},(_,k)=>geo.attributes[n].getComponent(i,k))]));
  const push=(v,part)=>{for(const n of names)arrays[n].push(...v[n]);partIds.push(part);};
  const key=v=>v.position.map(x=>x.toFixed(6)).join(',');
  const interpolate=(a,b,t,inside)=>{
    const v={};for(const n of names)v[n]=a[n].map((x,k)=>x+(b[n][k]-x)*t);
    const influence=new Float32Array(boneCount);
    // Separate the accidental palm/trouser bridges. At the upper-arm seam use
    // matching interpolated weights on both sides, so the skin stays continuous.
    if(v.position[1]<1.42){v.skinIndex=inside.skinIndex.slice();v.skinWeight=inside.skinWeight.slice();}
    else{
      for(let k=0;k<4;k++){influence[a.skinIndex[k]]+=a.skinWeight[k]*(1-t);influence[b.skinIndex[k]]+=b.skinWeight[k]*t;}
      const best=Array.from(influence,(w,i)=>[i,w]).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((s,p)=>s+p[1],0);
      v.skinIndex=best.map(p=>p[0]);v.skinWeight=best.map(p=>p[1]/sum);
    }return v;
  };
  const triangle=(a,b,c,region)=>{
    push(a,region);push(b,region);push(c,region);
    for(const [u,v]of [[a,b],[b,c],[c,a]]){
      const ka=region+':'+key(u),kb=region+':'+key(v);if(ka===kb)continue;
      const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
      if(boundary.has(k))boundary.delete(k);else boundary.set(k,{a:u,b:v,ka,kb});
    }
  };
  for(let i=0;i<geo.attributes.position.count;i+=3){
    const vs=[vertex(i),vertex(i+1),vertex(i+2)],ds=[distances[i],distances[i+1],distances[i+2]];
    for(const sign of [-1,1]){
      const polygon=[];
      for(let j=0;j<3;j++){
        const k=(j+1)%3,a=vs[j],b=vs[k],da=ds[j]*sign,db=ds[k]*sign;
        if(da>=0)polygon.push(a);
        if((da>=0)!==(db>=0))polygon.push(interpolate(a,b,da/(da-db),da>=0?a:b));
      }
      const region=sign<0?0:(vs[0].position[0]>0?1:2);
      for(let j=1;j<polygon.length-1;j++)triangle(polygon[0],polygon[j],polygon[j+1],region);
    }
  }
  const next=new Map();for(const e of boundary.values())next.set(e.ka,e);
  let caps=0,openLoops=0;
  while(next.size){
    const first=next.values().next().value,loop=[];let e=first;
    while(e){next.delete(e.ka);loop.push(e);e=next.get(e.kb);}
    if(loop.length<3||loop.at(-1).kb!==first.ka){openLoops++;continue;}
    // A centroid fan can protrude outside a concave palm/torso seam. Ear-clip
    // the projected boundary instead, preserving every original rim vertex.
    const ring=loop.map(e=>e.a),normal=new THREE.Vector3();
    for(let i=0;i<ring.length;i++){
      const a=ring[i].position,b=ring[(i+1)%ring.length].position;
      normal.x+=(a[1]-b[1])*(a[2]+b[2]);normal.y+=(a[2]-b[2])*(a[0]+b[0]);normal.z+=(a[0]-b[0])*(a[1]+b[1]);
    }
    const magnitudes=normal.toArray().map(Math.abs),drop=magnitudes.indexOf(Math.max(...magnitudes));
    const axes=[0,1,2].filter(i=>i!==drop);
    const contour=ring.map(v=>new THREE.Vector2(v.position[axes[0]],v.position[axes[1]]));
    const faces=THREE.ShapeUtils.triangulateShape(contour,[]);
    for(const face of faces){
      const [a,b,c]=face.map(i=>ring[i]);
      const ab=new THREE.Vector3().fromArray(b.position).sub(new THREE.Vector3().fromArray(a.position));
      const ac=new THREE.Vector3().fromArray(c.position).sub(new THREE.Vector3().fromArray(a.position));
      const part=Number(first.ka.split(':')[0]);
      push(a,part);if(ab.cross(ac).dot(normal)>0){push(c,part);push(b,part);}else{push(b,part);push(c,part);}
    }caps++;
  }
  const result=new THREE.BufferGeometry();
  for(const n of names){const C=n==='skinIndex'?THREE.Uint16BufferAttribute:THREE.Float32BufferAttribute;result.setAttribute(n,new C(arrays[n],geo.attributes[n].itemSize));}
  result.setAttribute('partId',new THREE.Uint8BufferAttribute(partIds,1));
  // Discard tiny disconnected trouser fragments misclassified as a hand.
  const positions=result.attributes.position,welded=new Map(),ids=[],parents=[];
  for(let i=0;i<positions.count;i++){
    const k=partIds[i]+':'+[positions.getX(i),positions.getY(i),positions.getZ(i)].map(x=>x.toFixed(5)).join(',');
    if(!welded.has(k)){welded.set(k,parents.length);parents.push(parents.length);}ids.push(welded.get(k));
  }
  const find=a=>{while(parents[a]!==a){parents[a]=parents[parents[a]];a=parents[a];}return a;};
  for(let i=0;i<ids.length;i+=3){parents[find(ids[i+1])]=find(ids[i]);parents[find(ids[i+2])]=find(ids[i]);}
  const counts=new Map(),largest=new Map();
  for(let i=0;i<ids.length;i++){const id=find(ids[i]);counts.set(id,(counts.get(id)||0)+1);}
  for(let i=0;i<ids.length;i++){const id=find(ids[i]),old=largest.get(partIds[i]);if(old===undefined||counts.get(id)>counts.get(old))largest.set(partIds[i],id);}
  const cleaned=new THREE.BufferGeometry();let removed=0;
  for(const [n,attr]of Object.entries(result.attributes)){
    const values=[];for(let i=0;i<ids.length;i++){if(find(ids[i])!==largest.get(partIds[i])){if(n==='position')removed++;continue;}for(let k=0;k<attr.itemSize;k++)values.push(attr.getComponent(i,k));}
    const C=n==='skinIndex'?THREE.Uint16BufferAttribute:n==='partId'?THREE.Uint8BufferAttribute:THREE.Float32BufferAttribute;cleaned.setAttribute(n,new C(values,attr.itemSize));
  }
  result.dispose();cleaned.userData={closedBoundaryLoops:caps,unclosedBoundaryChains:openLoops,removedIslandVertices:removed};
  return cleaned;
}
