import {createRequire} from 'node:module';import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const require=createRequire(new URL('../package.json',import.meta.url));const ts=require('typescript');
let made=0,decoded=0;const timers=new Map();let id=0;
class FakeImage{constructor(){made++;}set src(url){this.url=url;if(!url||url==='timeout')return;queueMicrotask(()=>url==='bad'?this.onerror?.():this.onload?.());}get src(){return this.url;}async decode(){decoded++;}}
const exports={};const context={exports,performance,Image:FakeImage,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:id=>timers.delete(id),console};
const source=fs.readFileSync(new URL('../src/client/AssetLoader.ts',import.meta.url),'utf8').replace("import './ui/loading.css';",'');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const a=exports.loadImage('same'),b=exports.loadImage('same');assert.equal(a,b);await Promise.all([a,b]);assert.equal(made,1);assert.equal(decoded,1);assert.equal(exports.loadedImage('same').src,'same');
await assert.rejects(exports.loadImage('bad'));await assert.rejects(exports.loadImage('bad'));assert.equal(made,3,'failed image must be evicted');
const timeout=exports.loadImage('timeout');for(const fn of timers.values())fn();await assert.rejects(timeout);assert.equal(timers.size,0);
const progress=[];await exports.loadImages(['same','same','other'],(done,total)=>progress.push([done,total]));assert.equal(made,5);assert.equal(progress.at(-1)[0],2);assert.equal(progress.at(-1)[1],2);assert.equal(decoded,2);
console.log('PASS single URL request/decode dedupe, failure eviction/retry, timeout, unique-resource progress and retained decoded image.');
