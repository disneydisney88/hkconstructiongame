// Original procedural QA training exercise. No mission or wage mutation; one separate QA-only exclusion collider.
export function createHaSafetyScenario(g) {
 const T=g.THREE,root=new T.Group();root.name='HA_S07_QA_ONLY';root.position.set(-802.3,0,931.2);
 // QA-only exclusion footprint matches the painted bay and rail envelope, outside live routes.
 const bayCollider={x:-802.3,z:931.2,hw:1.5,hd:1.22,rot:0,minx:-803.8,maxx:-800.8,minz:929.98,maxz:932.42,qaScenario:'S07'};
 g.colliders.push(bayCollider);
 const shared=new T.BoxGeometry(1,1,1),mat=new T.MeshLambertMaterial({color:0xffffff});
 const loose=new T.Group(),tidy=new T.Group(),warning=new T.Group();root.add(loose,tidy,warning);tidy.visible=false;warning.visible=false;
 function box(parent,x,y,z,w,h,d,color,ry=0){const m=new T.Mesh(shared,mat.clone());m.material.color.setHex(color);m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.y=ry;parent.add(m);return m;}
 // Marked training bay, deliberately away from the live pedestrian/vehicle approach.
 box(root,0,.115,0,2.7,.035,2.2,0x56615b);for(const x of [-1.34,1.34])box(root,x,.14,0,.035,.02,2.2,0xd8c459);for(const z of [-1.08,1.08])box(root,0,.14,z,2.7,.02,.035,0xd8c459);
 for(let i=0;i<5;i++)box(loose,(i%3-.8)*.53,.16+(i%2)*.04,(i%2-.5)*.75,1.05,.12,.14,0xa58351,i*.83);
 box(loose,.75,.17,.55,.48,.22,.30,0x6e8894,.5);
 // Controlled layout inspired by handbook labelled storage/rack photos, not copied imagery.
 for(const x of [-.9,.9])for(const z of [-.6,.4])box(tidy,x,.62,z,.07,1.16,.07,0x648c9a);
 for(const y of [.20,.66])box(tidy,0,y,-.1,2,.08,1.15,0x728887);
 for(let i=0;i<4;i++)box(tidy,0,.30+(i%2)*.13,-.38+Math.floor(i/2)*.40,1.7,.12,.18,0xb28f5d);
 box(tidy,.4,.85,-.1,.65,.3,.38,0x507c8e);
 for(const z of [-1.17,1.17]){for(const x of [-1.44,1.44])box(warning,x,.58,z,.06,1.1,.06,0xe5b746);for(const y of [.45,.98])box(warning,0,y,z,2.95,.055,.055,0xe5b746)}
 for(const y of [.45,.98])box(warning,1.44,y,0,.055,.055,2.34,0xe5b746);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#1e3c47';c.fillRect(0,0,512,256);c.fillStyle='#f0d06b';c.font='bold 40px sans-serif';c.fillText('QA 工地整理示範區',30,65);c.fillStyle='#fff';c.font='27px sans-serif';c.fillText('先通報・隔離・獲准清理',35,126);c.fillText('區內禁入・物料分類收納',35,174);c.font='21px sans-serif';c.fillText('S07｜非正式工作指示',35,223);
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(2.4,1.2),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));sign.position.set(1.05,1.65,0);sign.rotation.y=-Math.PI/2;root.add(sign);box(root,1.06,.65,0,.045,1.3,.045,0xa9b5ad);// One instanced box batch per visibility state; shared material and geometry.
 for(const parent of [root,loose,tidy,warning]){const parts=parent.children.filter(m=>m.isMesh&&m.geometry===shared);const im=new T.InstancedMesh(shared,mat,parts.length);parts.forEach((m,i)=>{m.updateMatrix();im.setMatrixAt(i,m.matrix);im.setColorAt(i,m.material.color);m.material.dispose();parent.remove(m)});parent.add(im)}
 g.scene.add(root);
 const panel=document.createElement('section');panel.id='ha-safety-panel';panel.style.cssText='position:fixed;right:16px;bottom:16px;z-index:10005;width:340px;background:#142b32f2;color:#fff;padding:14px;border:1px solid #e8c667;border-radius:10px;font:15px/1.5 sans-serif';
 panel.innerHTML='<strong>QA｜S07 工地整理</strong><p data-status></p><button data-action="report">1 通報及警示</button> <button data-action="clear">2 獲准班組清理（模擬）</button> <button data-action="verify">3 覆查</button><p style="font-size:12px">獨立練習；不改任務、入閘資格或人工。唔好自行處理不明危險物。</p>';
 document.body.append(panel);for(const el of panel.querySelectorAll('button'))el.style.cssText='padding:8px;margin:3px 0;font:inherit;color:#12242b;background:#e5cd79;border:0;border-radius:4px';
 let state='HAZARD',warnings=0,rejections=0,success=0,near=false,lastUiKey=null;const events=[];
 function log(type){events.push({type,state,time:performance.now(),player:[g.player.x,g.player.z]});}
 function distance(){return Math.hypot(g.player.x-root.position.x,g.player.z-root.position.z)}
 function action(type){if(!g.started()||distance()>4.5){rejections++;log('OUT_OF_RANGE');return}if(type==='report'&&state==='HAZARD'){state='SECURED';warning.visible=true;log('REPORT_AND_SECURE')}else if(type==='clear'&&state==='SECURED'){state='CLEARED';loose.visible=false;tidy.visible=true;log('AUTHORIZED_TEAM_SIMULATED_CLEAR')}else if(type==='verify'&&state==='CLEARED'){state='VERIFIED';success=1;log('INSPECTION_CONFIRMED')}else{rejections++;log('INVALID_ORDER')}refresh();}
 for(const el of panel.querySelectorAll('button'))el.addEventListener('click',()=>action(el.dataset.action));
 function refresh(){if(!g.started()){panel.hidden=true;return}panel.hidden=false;const d=distance(),close=d<=4.5;if(close&&!near&&state==='HAZARD'){warnings++;log('TRIP_WARNING')}near=close;const uiKey=state+':'+close+':'+d.toFixed(1);if(uiKey===lastUiKey)return;lastUiKey=uiKey;
 const text={HAZARD:'留意：散料造成絆倒風險。保持距離，先通報。',SECURED:'警示已設置；散料仍未清理。由獲授權班組處理。',CLEARED:'模擬班組已分類收納；請覆查場地。',VERIFIED:'覆查通過：示範區已整理，練習完成。'};
 panel.querySelector('[data-status]').textContent=`${text[state]} 距離 ${d.toFixed(1)}m${close?'':'；請行近至4.5m內'}`;panel.style.borderColor=near&&state==='HAZARD'?'#ff9857':'#e8c667';
 panel.querySelector('[data-action=report]').disabled=!close||state!=='HAZARD';panel.querySelector('[data-action=clear]').disabled=!close||state!=='SECURED';panel.querySelector('[data-action=verify]').disabled=!close||state!=='CLEARED';for(const el of panel.querySelectorAll('button')){el.style.opacity=el.disabled?'.4':'1';el.style.cursor=el.disabled?'not-allowed':'pointer';}}
 const timer=setInterval(refresh,200);refresh();window.__haSafety={snapshot:()=>({id:'S07',state,warnings,rejections,success,distance:distance(),anchor:root.position.toArray(),looseVisible:loose.visible,tidyVisible:tidy.visible,barrierVisible:warning.visible,events:[...events]}),dispose:()=>{clearInterval(timer);panel.remove();root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose?.()});shared.dispose();mat.dispose();tex.dispose();sign.geometry.dispose();sign.material.dispose();const i=g.colliders.indexOf(bayCollider);if(i>=0)g.colliders.splice(i,1)},root};return window.__haSafety;
}
