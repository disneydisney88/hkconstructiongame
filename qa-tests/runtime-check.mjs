import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from 'acorn';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {createWorker} from '../worker-rig.js';
const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ast=parse(code,{ecmaVersion:'latest',sourceType:'module'});
const topNames=ast.body.filter(n=>n.type==='FunctionDeclaration').map(n=>n.id.name);
for(const name of ['sitePeopleTick','npcSay','pitWorkerAccident','ttsSpeak']) assert(topNames.includes(name),name+' must be module scoped');
assert(ast.body.some(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='PIT_ACCIDENT')));
function fn(name){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return code.slice(n.start,n.end);}
const state={dlgActive:null,player:{inTruck:false},_nearNpc:{},nearestInteract:()=>({action:()=>state.picked++}),picked:0,sClick(){}};
vm.createContext(state);vm.runInContext(fn('doInteract')+';doInteract();',state);assert.equal(state.picked,1);
const bytes=fs.readFileSync(new URL('../models/worker-v2.fbx',import.meta.url));
const source=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const start=performance.now();const a=createWorker(source,{photo:false});const firstMs=performance.now()-start;
const next=performance.now();const b=createWorker(source,{photo:false});const cachedMs=performance.now()-next;
assert.equal(a.geometry,b.geometry);assert.notEqual(a.bones[0],b.bones[0]);
const before=b.bones.map(b=>b.rotation.toArray());a.animate(.1,6.8);
assert.deepEqual(b.bones.map(b=>b.rotation.toArray()),before);
assert(Number.isFinite(a.mesh.position.y));
console.log(JSON.stringify({scope:'real FBX + Three.js, no browser rendering',moduleScope:true,interactionPriority:true,sharedGeometry:true,independentBones:true,finiteAnimation:true,firstRigMs:firstMs,cachedRigMs:cachedMs,vertices:a.geometry.attributes.position.count},null,2));

const ui={btnStart:{disabled:false},start:{style:{}},hud:{style:{}}};
const startContext={started:false,paused:true,$:id=>ui[id],nextMission:()=>startContext.missions++,missions:0,say(){},auInit(){throw new Error('Audio unavailable')},sClick(){},console:{warn(){}}};
vm.createContext(startContext);vm.runInContext(fn('startGame')+';startGame();startGame();',startContext);
assert.equal(startContext.started,true);assert.equal(startContext.missions,1);assert.equal(ui.start.style.display,'none');
console.error('Start regression: immediate, idempotent, survives audio failure');
