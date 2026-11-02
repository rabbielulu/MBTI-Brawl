import assert from 'node:assert/strict';
import {GardenWorld} from '../src/shared/garden/GardenWorld';
import {GARDEN as C,gardenInput} from '../src/shared/garden/GardenConfig';
const w=new GardenWorld(),a=w.add('a','举人','ENTP')!,b=w.add('b','飞人','INFP')!;
const input=(id:string,patch:Partial<ReturnType<typeof gardenInput>>)=>w.input(id,{...gardenInput(),...patch});
input('a',{liftTarget:'missing'});w.step();assert.equal(a.carrying,null);
b.x=1300;input('a',{liftTarget:'b'});w.step();assert.equal(a.carrying,null);
b.x=a.x+80;b.y=a.y;b.sitting=true;
input('a',{holdTarget:'b'});w.step();assert.equal(a.holdChild,'b');
input('a',{liftTarget:'b'});w.step();assert.equal(a.carrying,'b');assert.equal(b.carriedBy,'a');assert.equal(a.holdChild,null);assert.equal(b.holdParent,null);assert.equal(b.sitting,false);assert.equal(b.z,a.z+C.LiftHeight);
input('a',{x:1});w.step();assert.equal(a.x,b.x);input('b',{x:1,jump:true,sit:true,liftTarget:'a'});w.step();assert.equal(b.carriedBy,'a');assert.equal(b.carrying,null);
a.x=C.width-C.margin-3;input('a',{throwNow:true,aimX:1,aimY:0});w.step();assert.equal(a.carrying,null);assert.equal(b.carriedBy,null);assert.ok(b.thrown&&b.vx<0);assert.ok(b.x<=C.width-C.margin);
input('a',{liftTarget:'b'});w.step();assert.equal(a.carrying,null);
for(let n=0;n<100&&b.thrown;n++)w.step();assert.ok(!b.thrown&&b.lying&&b.z===0&&b.vx===0);
input('b',{x:1});w.step();assert.ok(b.lying);while(w.time<=b.landedUntil)w.step();input('b',{x:1});w.step();assert.equal(b.lying,false);
// Each boundary reflects, including a simultaneous corner crossing.
for(const [x,y,dx,dy] of [[C.margin+1,600,-1,0],[700,C.minY+1,0,-1],[700,C.maxY-1,0,1],[C.width-C.margin-1,C.maxY-1,1,1]]){
 a.x=x;a.y=y;b.x=x;b.y=y;b.z=0;b.vz=0;w.time+=1;input('a',{liftTarget:'b'});w.step();input('a',{throwNow:true,aimX:dx,aimY:dy});w.step();assert.ok(b.thrown);if(dx)assert.ok(b.vx*dx<0);if(dy)assert.ok(b.vy*dy<0);for(let n=0;n<100&&b.thrown;n++)w.step();
}
// Either side can use Q to drop; disconnect also releases the lifted player.
for(const dropper of ['a','b']){a.x=b.x=600;a.y=b.y=600;input('a',{liftTarget:'b'});w.step();assert.equal(b.carriedBy,'a');input(dropper,{releaseHold:true});w.step();assert.equal(b.carriedBy,null);assert.equal(a.carrying,null);for(let n=0;n<100&&b.thrown;n++)w.step();}
a.x=b.x=600;a.y=b.y=600;input('a',{liftTarget:'b'});w.step();w.remove('a');assert.equal(b.carriedBy,null);for(let n=0;n<100&&b.thrown;n++)w.step();assert.ok(b.lying);
console.log('PASS throw: range, lift, carry, mutual exclusion, aimed throw, four walls/corner bounce, lying landing/recovery, Q/drop and disconnect');
