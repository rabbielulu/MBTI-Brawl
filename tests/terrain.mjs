import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/terrain.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {generateTerrain,terrainSpeed,SPAWNS}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
let empty=0,wet=0;
for(let seed=1;seed<=1000;seed++){
 let state=seed;const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
 const {walls,mud}=generateTerrain(random);
 assert.equal(walls.length,5);
 walls.forEach((w,i)=>{
  assert.ok(w.x>=70&&w.y>=85&&w.x+w.w<=1330&&w.y+w.h<=875);
  for(const p of SPAWNS)assert.ok(!(p.x>w.x-85&&p.x<w.x+w.w+85&&p.y>w.y-85&&p.y<w.y+w.h+85));
  for(const other of walls.slice(i+1))assert.ok(w.x+w.w+40<=other.x||other.x+other.w+40<=w.x||w.y+w.h+40<=other.y||other.y+other.h+40<=w.y,'Passable gap between obstacles');
 });
 assert.ok(mud.length<=3);
 if(mud.length)wet++;else empty++;
 for(const p of mud){assert.equal(terrainSpeed(p.x,p.y,mud),.5);assert.ok(p.x-p.rx>70&&p.x+p.rx<1330&&p.y-p.ry>85&&p.y+p.ry<875);}
 for(const p of SPAWNS)assert.equal(terrainSpeed(p.x,p.y,mud),1);
}
assert.ok(empty>100&&wet>500,'Both dry and muddy rounds occur');
const pool=[{x:300,y:300,rx:80,ry:50,points:[{x:220,y:300},{x:300,y:250},{x:340,y:290},{x:380,y:300},{x:300,y:350}]}];
assert.equal(terrainSpeed(355,275,pool),1,'Outside irregular shore must not slow even inside bounding ellipse');
assert.equal(terrainSpeed(300,300,pool),.5);
assert.equal(terrainSpeed(381,300,pool),1,'Leaving mud restores full speed');
assert.equal(terrainSpeed(300,300,[...pool,...pool]),.5,'Mud slowdown never stacks');
assert.notDeepEqual(generateTerrain(()=>.1).walls,generateTerrain(()=>.9).walls);
console.log(`PASS: 1,000 generated arenas, exact obstacle count, safe spawns, boundaries, gaps, slowdown/recovery; ${wet} muddy / ${empty} dry.`);
