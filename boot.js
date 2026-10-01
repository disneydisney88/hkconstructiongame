/* Load the NPC asset independently. The old worker clips are duplicates and are not used. */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
globalThis.__BUILD='worker-v2';
console.log('[BUILD] '+globalThis.__BUILD);
const load=(loader,url)=>new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
const [soldier,worker]=await Promise.all([
 load(new GLTFLoader(),'models/Soldier.glb?v=2').catch(e=>{console.warn('NPC model unavailable',e);return null;}),
 load(new FBXLoader(),'models/worker-v2.fbx').catch(e=>{console.warn('V2 shape unavailable, fallback old',e);
   return load(new FBXLoader(),'models/mixamo/idle.fbx').catch(()=>null);})
]);
if(soldier)globalThis.WORKER_MODELS={male:soldier,female:null};
if(worker)globalThis.MIXAMO_WORKER={obj:worker,clips:[]};
await import('./app.js');