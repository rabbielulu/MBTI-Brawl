import assert from 'node:assert/strict';
import { GameRoom } from '../server/GameRoom';
import { NET } from '../src/shared/GameConstants';
function room(){const r=new GameRoom();r.add('a','甲');r.add('b','乙');r.map={walls:[],mud:[]};Object.assign(r.players.get('P1')!,{x:400,y:500,aimAngle:0});Object.assign(r.players.get('P2')!,{x:600,y:500});return r;}
function fire(r:GameRoom,seq:number,attack=true){const time=seq*1000/NET.tickRate;r.input('P1',{seq,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:attack,skillPressed:false,ultimatePressed:false},time);r.step(time);}
{
 const r=room();fire(r,1);assert.equal(r.projectiles.length,1);assert.equal(r.players.get('P2')!.hp,100,'No instant hitscan damage');
 for(let i=2;i<=14;i++)fire(r,i,false);
 assert.equal(r.players.get('P2')!.hp,88);assert.equal(r.hits.length,1);assert.equal(r.hits[0].damage,12);assert.equal(r.projectiles.length,0);assert.equal(r.players.get('P1')!.hp,100,'No self damage');
 const snapshot=r.snapshot();snapshot.players[0].hp=1;assert.equal(r.players.get('P1')!.hp,100,'Snapshots cannot mutate authoritative HP');
}
{
 const r=room();for(let i=1;i<=30;i++)fire(r,i);
 assert.equal(r.projectileId,4,'300ms cooldown holds despite per-tick fire inputs');
}
{
 const r=room();r.map.walls=[{x:490,y:450,w:60,h:100}];for(let i=1;i<=30;i++)fire(r,i);
 assert.equal(r.players.get('P2')!.hp,100,'Cover blocks every projectile');assert.equal(r.hits.length,0);
}
{
 const r=room();for(let i=1;i<=120;i++)fire(r,i);
 assert.equal(r.players.get('P2')!.hp,0,'Health clamps to zero');
 const target=r.players.get('P2')!,x=target.x,y=target.y;
 r.input('P2',{seq:999,moveX:1,moveY:1,aimAngle:0,basicAttackPressed:true,skillPressed:false,ultimatePressed:false},4100);r.step(4100);
 assert.equal(target.x,x);assert.equal(target.y,y);assert.ok(!r.projectiles.some(p=>p.ownerId==='P2'),'Dead players cannot fire');
 r.resetTraining();assert.equal(target.hp,100);assert.equal(r.projectiles.length,0);assert.equal(r.hits.length,0);assert.equal(r.round,1);
 assert.equal(r.players.get('P1')!.x,700);assert.equal(r.players.get('P2')!.x,300);
 r.resetTraining();assert.equal(r.round,1,'Repeated reset requests are rate limited');
}
{
 const r=room();fire(r,1);r.step(1000);assert.equal(r.projectileId,1,'Stale held attack does not continue firing');
 r.remove('P1');assert.equal(r.projectiles.length,0,'Owner disconnect removes in-flight shots');
}
console.log('PASS: authoritative projectile travel/hit/HP, snapshot isolation, cooldown, cover, no self-hit, zero HP/input lock, shared reset, reset rate limit, stale attack and disconnect cleanup.');
{
 const r=room();fire(r,1);for(let i=2;i<=30;i++)fire(r,i,false);
 assert.equal(r.projectileId,1,'One pressed event cannot be replayed on later ticks');
 assert.equal(r.players.get('P1')!.personality,12);
 assert.ok(r.players.get('P2')!.x>600,'Knockback changes authoritative position');
 const events=r.drainEvents();assert.equal(events.filter(e=>e.type==='damage').length,1);assert.equal(r.drainEvents().length,0,'Events are drained exactly once');
 const hit=events.find(e=>e.type==='damage')!;assert.equal(hit.attackerId,'P1');if(hit.type==='damage')assert.equal(hit.knockbackX,210);
}
{
 const r=room();r.map.walls=[{x:650,y:400,w:70,h:200}];
 r.damage(r.players.get('P1')!,r.players.get('P2')!,12,500,0);
 for(let i=0;i<60;i++)r.step(10000+i*33);
 assert.ok(r.players.get('P2')!.x<=630,'Impulse cannot pass through cover');
 assert.ok(Math.abs(r.players.get('P2')!.velocityX)<.01,'Impulse decays or stops against wall');
}
{
 const r=room();Object.assign(r.players.get('P2')!,{x:470,y:500});
 const {character}=await import('../src/characters');
 const melee={...character.basicAttack,kind:'melee' as const};
 r.attack(r.players.get('P1')!,melee);assert.equal(r.players.get('P2')!.hp,88,'Server melee hit');
 r.attack(r.players.get('P1')!,melee);assert.equal(r.players.get('P2')!.hp,88,'Melee respects cooldown');
 const back=room();Object.assign(back.players.get('P2')!,{x:350,y:500});back.attack(back.players.get('P1')!,melee);assert.equal(back.players.get('P2')!.hp,100,'Melee arc excludes rear');
 const cover=room();Object.assign(cover.players.get('P2')!,{x:470,y:500});cover.map.walls=[{x:435,y:450,w:15,h:100}];cover.attack(cover.players.get('P1')!,melee);assert.equal(cover.players.get('P2')!.hp,100,'Melee cannot hit through cover');
}
{
 const r=room();
 for(let round=0;round<20;round++){
  if(round>0)r.resetTraining();Object.assign(r.players.get('P1')!,{x:400,y:500,aimAngle:0});Object.assign(r.players.get('P2')!,{x:600,y:500});
  const attacker=r.players.get(round%2?'P2':'P1')!,target=r.players.get(round%2?'P1':'P2')!;
  for(let i=0;i<160&&target.alive;i++){
   const now=(round*200+i)*1000/30,seq=round*200+i+1;
   r.input(attacker.id,{seq,moveX:0,moveY:0,aimAngle:round%2?Math.PI:0,basicAttackPressed:i%9===0,skillPressed:false,ultimatePressed:false},now);r.step(now);
  }
  assert.equal(target.hp,0);assert.equal(target.alive,false);assert.equal(attacker.personality,100,'Actual damage grants energy capped at 100');
  assert.equal(r.drainEvents().filter(e=>e.type==='death').length,1,'Exactly one death event per round');
  assert.ok([...r.players.values()].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
}
console.log('PASS Phase A: edge-trigger attacks, actual damage energy, authoritative decaying knockback/cover, one-shot events, melee arc/cover/cooldown, 20 alternating kill/reset rounds, one death per round and finite positions.');
