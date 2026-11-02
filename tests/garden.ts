import assert from 'node:assert/strict';
import {GardenWorld} from '../src/shared/garden/GardenWorld';
import {GARDEN as C,gardenInput} from '../src/shared/garden/GardenConfig';
const w=new GardenWorld();const a=w.add('a','甲','ENTP')!,b=w.add('b','乙','INFP')!;let c=w.add('c','丙','INTP')!;
const input=(id:string,patch:Partial<ReturnType<typeof gardenInput>>)=>w.input(id,{...gardenInput(),...patch});
input('a',{x:1,jump:true,wave:true});w.step();assert.ok(a.x>500&&a.z>0&&a.waveUntil>w.time);assert.equal('hp' in a,false);
// Jumping over another player never attaches or stops at their head.
a.x=600;a.y=600;a.z=0;a.vz=0;b.x=600;b.y=600;b.z=90;b.vz=-100;
for(let n=0;n<30;n++)w.step();assert.equal(b.z,0);assert.equal('stackParent' in b,false);
for(const p of [a,b,c]){p.z=0;p.vz=0;p.x=500+(['a','b','c'].indexOf(p.id))*80;p.y=600;}
// Hold exactly the selected target, without a timing window or nearest fallback.
input('a',{holdTarget:'missing'});w.step();assert.equal(a.holdChild,null);
w.time+=1;c.x=1000;input('a',{holdTarget:'c'});w.step();assert.equal(a.holdChild,null);
w.time+=1;c.x=600;input('a',{holdTarget:'c'});w.step();assert.equal(a.holdChild,'c');assert.equal(b.holdParent,null);
w.remove('c');c=w.add('c','丙','INTP')!;c.x=660;c.y=600;
w.time+=1;input('a',{holdTarget:'b'});w.step();assert.equal(a.holdChild,'b');assert.equal(b.holdParent,'a');
input('b',{holdTarget:'c'});w.step();assert.equal(b.holdChild,'c');assert.equal(c.holdParent,'b');
input('c',{holdTarget:'a'});w.step();assert.equal(c.holdChild,null);
// Middle follower breaks incoming link; its own followers remain attached.
for(let n=0;n<10;n++){input('b',{shake:n%2?1:-1});w.step();}
assert.equal(a.holdChild,null);assert.equal(b.holdParent,null);assert.equal(b.holdChild,'c');assert.equal(c.holdParent,'b');
// Q releases a leader's outgoing link, or a follower's incoming link only.
input('b',{releaseHold:true});w.step();assert.equal(b.holdChild,null);assert.equal(c.holdParent,null);
a.x=500;b.x=580;c.x=660;a.y=b.y=c.y=600;w.time+=1;
input('a',{holdTarget:'b'});w.step();input('b',{holdTarget:'c'});w.step();
input('b',{releaseHold:true});w.step();assert.equal(a.holdChild,null);assert.equal(b.holdParent,null);assert.equal(b.holdChild,'c');assert.equal(c.holdParent,'b');
input('c',{releaseHold:true});w.step();assert.equal(b.holdChild,null);assert.equal(c.holdParent,null);
input('a',{releaseHold:true});w.step();assert.equal(a.holdChild,null);
// Sitting toggles, persists through idle/waving and exits on movement/jump.
a.z=0;a.vz=0;input('a',{sit:true});w.step();assert.ok(a.sitting&&!a.lying);
for(let n=0;n<800;n++)w.step();assert.ok(a.sitting&&!a.lying);
input('a',{wave:true});w.step();assert.ok(a.sitting&&a.waveUntil>w.time);
input('a',{sit:true});w.step();assert.equal(a.sitting,false);
input('a',{sit:true});w.step();input('a',{x:1});w.step();assert.equal(a.sitting,false);
input('a',{sit:true});w.step();input('a',{jump:true});w.step();assert.ok(!a.sitting&&a.z>0);
for(let n=0;n<60;n++)w.step();
// Idle lies down, wave remains possible, movement wakes, stale input stops moving.
for(let n=0;n<800;n++)w.step();assert.ok(a.lying);input('a',{wave:true});w.step();assert.ok(a.lying&&a.waveUntil>w.time);input('a',{x:1});w.step();assert.equal(a.lying,false);
for(let n=0;n<30;n++)w.step();const x=a.x;for(let n=0;n<30;n++)w.step();assert.equal(a.x,x);
w.remove('b');assert.equal(c.holdParent,null);assert.equal(w.players.size,2);
const full=new GardenWorld();for(let n=0;n<C.maxPlayers;n++)assert.ok(full.add(String(n),'玩家','ENTP'));assert.equal(full.add('overflow','多余','ENTP'),undefined);
console.log('PASS garden: movement, jumping, no stacking, explicit target/range validation, chains, middle escape, idle, stale inputs, removal and capacity');
