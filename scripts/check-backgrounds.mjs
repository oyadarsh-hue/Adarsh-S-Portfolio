import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(root+'assets/images/backgrounds/sources.json','utf8'));
const html = readFileSync(root+'index.html','utf8');
assert.equal((html.match(/class="scene-backdrop" aria-hidden="true"/g)||[]).length,4);
assert.equal((html.match(/data-background-scene="/g)||[]).length,4);
function dimensions(b) {
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  const type=b.toString('ascii',12,16);
  if(type==='VP8X') return [b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1];
  if(type==='VP8 ') return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  throw new Error('Unexpected WebP header '+type);
}
for(const scene of manifest.scenes) {
  assert.equal(scene.original.width,1672);
  assert.equal(scene.original.height,941);
  assert.equal(scene.export4k.upscaled,true);
  for(const width of [960,1600,2560,3840]) {
    const file=`assets/images/backgrounds/${scene.name}-${width}.webp`;
    assert.deepEqual(dimensions(readFileSync(root+file)),[width,width*9/16]);
    assert(statSync(root+file).size < 250_000, file+' stays under 250 KB');
    assert(html.includes(file),file+' is connected to responsive markup');
  }
}
console.log('PASS: four decorative scenes, 16 responsive assets, exact dimensions, honest 4K provenance and image size budgets.');

// Exercise the controller without a browser: visibility, reverse motion, pause,
// preferences, batching and the sticky panel's independent scroll track.
const {runInNewContext} = await import('node:vm');
let scrollY=0, frameId=0, observer, mutation;
const frames=new Map(), listeners={}, classes=new Set();
const reduced={matches:false,addEventListener(_n,f){this.change=f;}};
const compact={matches:false};
const connection={saveData:false,addEventListener(_n,f){this.change=f;}};
const docRoot={dataset:{},classList:{contains:name=>classes.has(name)}};
function scene(top,height,parent) {
  const values={};
  return {dataset:{backgroundTrack:parent?'parent':''},
    style:{setProperty:(k,v)=>{values[k]=v;},removeProperty:k=>{delete values[k];}},values,
    getBoundingClientRect:()=>({top:top-scrollY,height}),
    parentElement:parent&&{getBoundingClientRect:()=>({top:3800-scrollY,height:1750})}};
}
const scenes=[scene(0,820),scene(88,912,true),scene(9000,1000),scene(13000,900)];
const doc={documentElement:docRoot,hidden:false,querySelectorAll:()=>scenes,addEventListener:(n,f)=>{listeners[n]=f;}};
const context={document:doc,navigator:{connection},innerHeight:1000,
  matchMedia:q=>q.includes('reduce')?reduced:compact,
  IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}},
  MutationObserver:class{constructor(fn){mutation=fn;}observe(){}},
  addEventListener:(n,f)=>{listeners[n]=f;},
  requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},
  cancelAnimationFrame:id=>frames.delete(id)};
context.window=context;
runInNewContext(readFileSync(root+'assets/js/background-scenes.js','utf8'),context);
const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
assert.equal(docRoot.dataset.sceneMotion,'scroll');
assert.equal(frames.size,0,'No frame scheduled without a visible scene');
observer([{target:scenes[0],isIntersecting:true}]);flush();
const first=scenes[0].values['--scene-y'];
scrollY=200;listeners.scroll();listeners.scroll();
assert.equal(frames.size,1,'Repeated scroll events share a single frame');flush();
assert.notEqual(scenes[0].values['--scene-y'],first);
assert.equal(frames.size,0,'No continuously running animation loop');
scrollY=0;listeners.scroll();flush();assert.equal(scenes[0].values['--scene-y'],first);
classes.add('paused');mutation();assert.equal(docRoot.dataset.sceneMotion,'still');
assert.equal(scenes[0].values['--scene-y'],undefined);
listeners.scroll();assert.equal(frames.size,0);
classes.delete('paused');mutation();flush();assert.equal(docRoot.dataset.sceneMotion,'scroll');
reduced.matches=true;reduced.change();assert.equal(docRoot.dataset.sceneMotion,'still');
reduced.matches=false;reduced.change();flush();
connection.saveData=true;connection.change();assert.equal(docRoot.dataset.sceneMotion,'still');
connection.saveData=false;connection.change();flush();
doc.hidden=true;listeners.visibilitychange();assert.equal(docRoot.dataset.sceneMotion,'still');
doc.hidden=false;listeners.visibilitychange();flush();
observer([{target:scenes[0],isIntersecting:false},{target:scenes[1],isIntersecting:true}]);
scrollY=3950;listeners.scroll();flush();const sticky=scenes[1].values['--scene-y'];
scrollY=4200;listeners.scroll();flush();assert.notEqual(scenes[1].values['--scene-y'],sticky);
assert.equal(scenes[0].dataset.sceneActive,'false');
compact.matches=true;scrollY=99999;listeners.scroll();flush();assert.equal(scenes[1].values['--scene-y'],'90.00px');
console.log('PASS: controller batches frames, tracks only visible scenes, reverses deterministically, handles sticky tracks and honors pause/reduced-motion/save-data/hidden-tab preferences.');
