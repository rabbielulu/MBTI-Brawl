import assert from 'node:assert/strict';
import {ProjectileTimeline} from '../src/client/network/ProjectileTimeline';
import type {NetworkProjectile} from '../src/shared/NetworkProtocol';
let speed=480;
const shot=(tick:number):NetworkProjectile=>({id:1,ownerId:'P1',source:'basic',x:100+speed*tick/30,y:300,vx:speed,vy:0,expiresTick:300,damage:12,radius:5,knockback:210});
// 30Hz simulation sampled at 20Hz gives alternating one-/two-tick position steps.
// Mix transport jitter into receipts while rendering at 60Hz.
for(const testedSpeed of [480,540,680,780,1000]){
 speed=testedSpeed;
for(const jitter of [false,true]){
 const timeline=new ProjectileTimeline();timeline.receive({round:0,tick:0,projectiles:[shot(0)]},0);
 const arrivals=Array.from({length:35},(_,i)=>({at:(i+1)*50+(jitter?[0,12,-8,9,-4][i%5]:0),tick:Math.floor((i+1)*1.5)}));
 let cursor=0,previous=timeline.sample(0)[0].x,maxStep=0,minStep=100;
 for(let frame=1;frame<=100;frame++){
  const now=frame*1000/60;
  while(cursor<arrivals.length&&arrivals[cursor].at<=now){const packet=arrivals[cursor++];timeline.receive({round:0,tick:packet.tick,projectiles:[shot(packet.tick)]},packet.at);}
  const current=timeline.sample(now)[0];const step=current.x-previous;
  assert.ok(step>=speed/60*.899&&step<=speed/60*1.101,`Smooth step ${step}: packet anchors cannot cause jumps or reverse motion`);
  assert.equal(current.y,300);previous=current.x;maxStep=Math.max(maxStep,step);minStep=Math.min(minStep,step);
 }
 console.log(`PASS speed ${speed} ${jitter?'jittered':'regular'} 20Hz packets / 60Hz frames: movement ${minStep.toFixed(2)}–${maxStep.toFixed(2)} px/frame`);
}
}
speed=480;
{
 const timeline=new ProjectileTimeline();timeline.receive({round:0,tick:0,projectiles:[shot(0)]},0);
 for(let frame=0;frame<60;frame++)timeline.sample(frame*1000/60);
 const stopped=timeline.sample(1000)[0].x;assert.equal(stopped,148,'Stale data cannot extrapolate forever');
 assert.equal(timeline.sample(1100)[0].x,stopped);
 timeline.receive({round:0,tick:40,projectiles:[]},1200);assert.deepEqual(timeline.sample(1200),[],'Authoritative removal is immediate; no lingering hit/ghost projectile');
 timeline.receive({round:1,tick:0,projectiles:[shot(0)]},1300);assert.equal(timeline.sample(1300)[0].x,100,'New round resets the clock');
 timeline.clear();assert.deepEqual(timeline.sample(1400),[],'Disconnect clears presentation');
 timeline.receive({round:2,tick:10,projectiles:[{...shot(10),expiresTick:11}]},1500);assert.deepEqual(timeline.sample(1600),[],'Expiry is respected');
}
console.log('PASS: bounded stale extrapolation, authoritative removal, round/disconnect cleanup and expiry.');

{
 const timeline=new ProjectileTimeline();timeline.receive({round:0,tick:0,projectiles:[]},0);timeline.sample(100);
 timeline.receive({round:0,tick:6,projectiles:[{...shot(6),id:2,x:100}]},210);
 assert.ok(timeline.sample(210)[0].x>=100,'New shots must not appear behind their first observed position when the clock lags');
}
