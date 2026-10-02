import { splitAndCap } from './mesh-repair.js';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const preparedGeometry = new WeakMap();

// Rebind the existing shape in its actual arms-down rest pose. The source FBX
// shoulder joints are at hip height, so its bind skeleton/clips cannot be reused.
export function createWorker(source, options) {
  options=options||{};
  let original;
  source.traverse(o => { if (o.isSkinnedMesh && !original) original = o; });
  if (!original) throw new Error('Worker source has no skinned geometry');
  let geo;
  const bones=[], indices={}, rest={};
  const joint=(name,parent,x,y,z)=>{
    const b=new THREE.Bone(); b.name=name;
    const world=new THREE.Vector3(x,y,z); rest[name]=world;
    b.position.copy(world);
    if(parent) { b.position.sub(rest[parent]); bones[indices[parent]].add(b); }
    indices[name]=bones.length; bones.push(b); return b;
  };
  joint('hips',null,0,.87,0);
  joint('spine','hips',0,1.06,0);
  joint('chest','spine',0,1.32,0);
  joint('neck','chest',0,1.48,0);
  joint('head','neck',0,1.55,0);
  for(const [s,sign] of [['left',1],['right',-1]]) {
    joint(s+'Arm','chest',sign*.18,1.42,-.01);
    joint(s+'ForeArm',s+'Arm',sign*.225,1.12,-.025);
    joint(s+'Hand',s+'ForeArm',sign*.265,.89,.008);
    joint(s+'Thigh','hips',sign*.105,.85,-.015);
    joint(s+'Shin',s+'Thigh',sign*.137,.46,-.045);
    joint(s+'Foot',s+'Shin',sign*.16,.10,-.07);
  }
  const palette={skin:new THREE.Color('#c78e67'),shirt:new THREE.Color('#687078'),vest:new THREE.Color('#ed6810'),silver:new THREE.Color('#bec6c8'),pants:new THREE.Color('#192b49'),boots:new THREE.Color('#654933'),hat:new THREE.Color('#f5c522')};
  /* 帽色階級(項目設定):工人=黃帽,管理人=白帽;透過options.hatColor覆寫 */
  if(options&&options.hatColor)palette.hat=new THREE.Color(options.hatColor);
  for (const part of ["skin","shirt","vest","pants","boots"]) if (options[part] !== undefined) palette[part] = new THREE.Color(options[part]);
  const smooth=(a,b,x)=>{let t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  let cache = preparedGeometry.get(original.geometry);
  if (!cache) { cache = new Map(); preparedGeometry.set(original.geometry, cache); }
  const cacheKey = Object.values(palette).map(c => c.getHexString()).join(':');
  if (cache.has(cacheKey)) geo = cache.get(cacheKey);
  else {
  geo = original.geometry.clone();
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const scale = 1.78 / (box.max.y - box.min.y);
  geo.translate(-(box.min.x + box.max.x)/2, -box.min.y, -(box.min.z + box.max.z)/2);
  geo.scale(scale, scale, scale);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');
  geo=mergeVertices(geo,.00001);geo.computeVertexNormals();
  geo=geo.toNonIndexed();
  const pos=geo.attributes.position;
  const weights=new Float32Array(pos.count*4), skinIndices=new Uint16Array(pos.count*4);
  const colors=new Float32Array(pos.count*3), regions=new Uint8Array(pos.count), splitDistance=new Float32Array(pos.count);
  const blend=(a,b,t)=>[[indices[a],1-t],[indices[b],t]];
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),ax=Math.abs(x),s=x>0?'left':'right';
    let w;
    const cuts=[[.70,.21],[.85,.21],[.95,.20],[1.1,.18],[1.25,.172],[1.46,.155]];
    let armBoundary=cuts[0][1];
    for(let j=1;j<cuts.length;j++)if(y>=cuts[j-1][0])armBoundary=THREE.MathUtils.lerp(cuts[j-1][1],cuts[j][1],THREE.MathUtils.clamp((y-cuts[j-1][0])/(cuts[j][0]-cuts[j-1][0]),0,1));
    // Keep the curved front/back vest sidewalls on the torso. A purely X/Y
    // split incorrectly moves narrow orange strips with the forearm.
    armBoundary+=.035*smooth(.90,1.02,y)*smooth(.045,.115,Math.abs(z));
    const arm=y>.70&&y<1.46&&ax>armBoundary;
    splitDistance[i]=Math.min(y-.70,1.46-y,ax-armBoundary);
    regions[i]=splitDistance[i]>0?(x>0?1:2):0;
    if(y>1.46) w=blend('neck','head',smooth(1.46,1.54,y));
    else if(arm) {
      if(y<1.0) w=blend(s+'Hand',s+'ForeArm',smooth(.85,1.0,y));
      else if(y<1.22) w=blend(s+'ForeArm',s+'Arm',smooth(1.05,1.22,y));
      else w=blend(s+'Arm','chest',smooth(1.28,1.42,y));
    } else if(y<.88) {
      if(y<.23) w=blend(s+'Foot',s+'Shin',smooth(.10,.23,y));
      else if(y<.56) w=blend(s+'Shin',s+'Thigh',smooth(.38,.56,y));
      else w=blend(s+'Thigh','hips',smooth(.73,.9,y));
    } else if(y<1.18) w=blend('hips','spine',smooth(.89,1.13,y));
    else w=blend('spine','chest',smooth(1.14,1.35,y));
    for(let k=0;k<w.length;k++){skinIndices[i*4+k]=w[k][0]; weights[i*4+k]=w[k][1];}
    let c;
    if(y>1.62)c=palette.hat;
    else if(y>1.47)c=palette.skin;
    else if(arm)c=y<1.25?palette.skin:palette.shirt;
    else if(y>.86){
      c=palette.vest;
      // The open neckline exposes the grey polo; reflective tape follows torso.
      if(z>0&&y>1.25 && ax<(y-1.25)*.52)c=palette.shirt;
      else if((y>1.025&&y<1.068)||(y>1.16&&y<1.208)||(ax>.096&&ax<.127&&y>1.20)) c=palette.silver;
      else if(z>0&&ax<.006)c=palette.shirt;
    } else c=y<.17?palette.boots:palette.pants;
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  // Weld coincident FBX triangle vertices for continuous skin-weight diffusion.
  const weld=new Map(), ids=[], adjacency=[], seed=[];
  for(let i=0;i<pos.count;i++){
    const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>v.toFixed(5)).join(',');
    if(!weld.has(key)){weld.set(key,seed.length);seed.push(i);adjacency.push(new Set());}
    ids.push(weld.get(key));
  }
  for(let i=0;i<pos.count;i+=3)for(let j=0;j<3;j++){
    const a=ids[i+j],b=ids[i+(j+1)%3];
    if(regions[i+j]===regions[i+(j+1)%3]){adjacency[a].add(b);adjacency[b].add(a);}
  }
  const count=bones.length;let field=new Float32Array(seed.length*count);
  for(let j=0;j<seed.length;j++)for(let k=0;k<4;k++)field[j*count+skinIndices[seed[j]*4+k]]+=weights[seed[j]*4+k];
  for(let step=0;step<28;step++){
    const next=field.slice();
    for(let j=0;j<seed.length;j++)for(let k=0;k<count;k++){
      let sum=0;for(const n of adjacency[j])sum+=field[n*count+k];
      next[j*count+k]=adjacency[j].size?.5*field[j*count+k]+.5*sum/adjacency[j].size:field[j*count+k];
    }field=next;
  }
  for(let i=0;i<pos.count;i++){
    const pairs=Array.from({length:count},(_,k)=>[k,field[ids[i]*count+k]]).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=pairs.reduce((s,p)=>s+p[1],0);
    for(let k=0;k<4;k++){skinIndices[i*4+k]=pairs[k][0];weights[i*4+k]=pairs[k][1]/total;}
  }
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));
  geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const uv=new Float32Array(pos.count*2), photoBlend=new Float32Array(pos.count);
  const normals=geo.attributes.normal;
  for(let i=0;i<pos.count;i++) {
    uv[i*2]=(632+pos.getX(i)*640)/1264;
    const py=pos.getY(i);
    const headOffset=.023*smooth(1.45,1.52,py)*(1-smooth(1.65,1.78,py));
    uv[i*2+1]=1-(1235-(py+headOffset)*675)/1264;
    photoBlend[i]=smooth(.02,.5,normals.getZ(i));
    if(py>1.62)photoBlend[i]=0;
  }
  geo.setAttribute('photoUv',new THREE.Float32BufferAttribute(uv,2));
  geo.setAttribute('photoBlend',new THREE.Float32BufferAttribute(photoBlend,1));
  const repaired=splitAndCap(geo,splitDistance,count);
  geo.dispose();geo=repaired;
  cache.set(cacheKey, geo);
  }
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82});
  // Front reference projection is explicitly a first pass, not a full UV atlas.
  if(typeof document!=='undefined' && options.photo !== false) {
    const photo=new THREE.TextureLoader().load('assets/worker/appearance-reference.png');
    photo.colorSpace=THREE.SRGBColorSpace;
    const rear=new THREE.TextureLoader().load('assets/worker/rear-reference-ai.png');
    rear.colorSpace=THREE.SRGBColorSpace;
    const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;
    const ctx=labelCanvas.getContext('2d');
    ctx.font='bold 88px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#14232b';
    ctx.fillText('香港建築',256,66);
    const label=new THREE.CanvasTexture(labelCanvas);label.colorSpace=THREE.SRGBColorSpace;
    const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=160;
    const badgeCtx=badgeCanvas.getContext('2d');
    badgeCtx.fillStyle='#132d42';badgeCtx.beginPath();badgeCtx.roundRect(8,8,240,144,14);badgeCtx.fill();
    badgeCtx.strokeStyle='#cbd2d5';badgeCtx.lineWidth=4;badgeCtx.stroke();
    badgeCtx.fillStyle='#ffffff';badgeCtx.font='bold 108px Arial, sans-serif';badgeCtx.textAlign='center';badgeCtx.textBaseline='middle';badgeCtx.fillText('KL',128,86);
    const badge=new THREE.CanvasTexture(badgeCanvas);badge.colorSpace=THREE.SRGBColorSpace;
    material.onBeforeCompile=shader=>{
      shader.uniforms.workerPhoto={value:photo};
      shader.uniforms.workerRear={value:rear};
      shader.uniforms.workerLabel={value:label};
      shader.uniforms.workerBadge={value:badge};
      shader.vertexShader='attribute float partId; attribute vec2 photoUv; attribute float photoBlend; varying float vPart; varying vec2 vPhotoUv; varying float vPhotoBlend; varying vec3 vRest; varying vec3 vRestNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPhotoUv=photoUv; vPhotoBlend=photoBlend; vRest=position; vRestNormal=normal; vPart=partId;');
      shader.fragmentShader='uniform sampler2D workerPhoto; uniform sampler2D workerRear; uniform sampler2D workerLabel; uniform sampler2D workerBadge; varying float vPart; varying vec2 vPhotoUv; varying float vPhotoBlend; varying vec3 vRest; varying vec3 vRestNormal;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        if(vRest.z<-.015 && vRest.y>.89 && vRest.y<1.44 && abs(vRest.x)<.175){
          diffuseColor.rgb=vec3(${palette.vest.r},${palette.vest.g},${palette.vest.b});
          if((vRest.y>1.025&&vRest.y<1.068)||(vRest.y>1.16&&vRest.y<1.208)||(abs(vRest.x)>.096&&abs(vRest.x)<.127&&vRest.y>1.20))
            diffuseColor.rgb=vec3(${palette.silver.r},${palette.silver.g},${palette.silver.b});
        }
        vec3 pc=texture2D(workerPhoto,vPhotoUv).rgb;
        float notWhite=1.0-smoothstep(.78,.95,min(pc.r,min(pc.g,pc.b)));
        bool trouser=vPart<.5&&vRest.y>.17&&vRest.y<.86;
        if(trouser){
          diffuseColor.rgb=vec3(${palette.pants.r},${palette.pants.g},${palette.pants.b});
          notWhite*=1.0-smoothstep(.10,.22,max(pc.r,max(pc.g,pc.b)));
        }
        diffuseColor.rgb=mix(diffuseColor.rgb,pc,vPhotoBlend*notWhite);
        vec2 rearUv=vec2(.5-vRest.x*.5063,1.0-(.975-vRest.y*.532));
        vec3 rc=texture2D(workerRear,rearUv).rgb;
        float rearMask=smoothstep(.02,.55,-vRestNormal.z)*(1.0-smoothstep(.78,.95,min(rc.r,min(rc.g,rc.b))));
        if(trouser)rearMask*=1.0-smoothstep(.10,.22,max(rc.r,max(rc.g,rc.b)));
        if(vRest.y<1.62)diffuseColor.rgb=mix(diffuseColor.rgb,rc,rearMask);
        vec2 labelUv=vec2(.5-vRest.x/.26,.5+(vRest.y-1.335)/.065);
        if(vRest.z<-.035 && labelUv.x>0.0 && labelUv.x<1.0 && labelUv.y>0.0 && labelUv.y<1.0){
          vec4 ink=texture2D(workerLabel,labelUv);
          diffuseColor.rgb=mix(diffuseColor.rgb,ink.rgb,ink.a);
        }
        vec2 badgeUv=vec2(.5+(vRest.x-.056)/.058,.5+(vRest.y-1.277)/.036);
        if(vRest.z>.035 && badgeUv.x>0.0 && badgeUv.x<1.0 && badgeUv.y>0.0 && badgeUv.y<1.0){
          vec4 badgeInk=texture2D(workerBadge,badgeUv);
          diffuseColor.rgb=mix(diffuseColor.rgb,badgeInk.rgb,badgeInk.a);
        }`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        if(vRest.y>1.62)roughnessFactor=.32;
        else if(vRest.y>.9 && vRest.y<1.43)roughnessFactor=.88;
      `);
    };
  }
  const mesh=new THREE.SkinnedMesh(geo,material);
  mesh.name='worker-rebound';mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow=true;mesh.frustumCulled=false;
  // A real accessory follows the head joint; side views do not depend on a
  // painted front-view chin strap.
  const strapPoints=[[-.108,1.63,.025],[-.112,1.55,.045],[-.078,1.486,.080],[0,1.465,.105],[.078,1.486,.080],[.112,1.55,.045],[.108,1.63,.025]].map(p=>new THREE.Vector3(...p).sub(rest.head));
  const strap=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strapPoints),48,.0035,6,false),new THREE.MeshStandardMaterial({color:'#263039',roughness:.94}));
  strap.name='helmet-chin-strap';strap.castShadow=true;bones[indices.head].add(strap);
  const buckle=new THREE.Mesh(new THREE.BoxGeometry(.014,.022,.007),new THREE.MeshStandardMaterial({color:'#22272b',roughness:.65}));
  buckle.position.set(.106,1.526,.065).sub(rest.head);buckle.rotation.z=-.4;bones[indices.head].add(buckle);
  const group=new THREE.Group();group.add(mesh);
  if(options.female) group.scale.set(.96,.97,1);
  let phase=0,amount=0,runAmount=0;
  const set=(n,x=0,y=0,z=0)=>bones[indices[n]].rotation.set(x,y,z);
  const feet=[];
  for(let i=0;i<geo.attributes.position.count;i+=12)if(geo.attributes.position.getY(i)<.15)feet.push(i);
  const v=new THREE.Vector3();
  function animate(dt,speed=0) {
    const moving=speed>.25,running=speed>4.2;
    amount=THREE.MathUtils.damp(amount,moving?1:0,10,dt);
    runAmount=THREE.MathUtils.damp(runAmount,running?1:0,8,dt);
    phase+=dt*THREE.MathUtils.lerp(6.4,10,runAmount);
    for(const b of bones)b.rotation.set(0,0,0);
    set('spine',amount*THREE.MathUtils.lerp(.03,.10,runAmount)+Math.sin(phase*.3)*.006,Math.sin(phase)*.035*amount);
    set('head',Math.sin(phase*.21)*.007,Math.sin(phase*.13)*.012);
    for(const [s,offset]of [['left',0],['right',Math.PI]]){
      const p=phase+offset, swing=Math.sin(p)*amount;
      set(s+'Thigh',swing*THREE.MathUtils.lerp(.40,.75,runAmount));
      set(s+'Shin',Math.max(0,Math.sin(p))*THREE.MathUtils.lerp(.65,1.05,runAmount)*amount);
      set(s+'Foot',Math.max(0,Math.sin(p))*.18*amount);
      set(s+'Arm',-swing*THREE.MathUtils.lerp(.32,.62,runAmount),0,(s==='left'?1:-1)*.035);
      set(s+'ForeArm',-(.10+THREE.MathUtils.lerp(.16,.85,runAmount)*amount+Math.sin(p)*.035*amount));
    }
    mesh.position.y=0;group.updateMatrixWorld(true);mesh.skeleton.update();
    let minY=Infinity;
    for(const i of feet){mesh.getVertexPosition(i,v);minY=Math.min(minY,v.y);}
    mesh.position.y=-minY;group.updateMatrixWorld(true);
  }
  animate(0,0);
  const samplePose=(cycle,speed)=>{amount=speed>.25?1:0;runAmount=speed>4.2?1:0;phase=cycle*Math.PI*2;animate(0,speed);};
  return {g:group,mesh,bones,animate,samplePose,rig:'codex-worker-v2',geometry:geo};
}
