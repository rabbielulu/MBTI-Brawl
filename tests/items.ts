import assert from 'node:assert/strict';
import {GameRoom} from '../server/GameRoom';
import {ITEM_CONFIG as C,emptyItems,type PickupType} from '../src/shared/ItemConfig';
import {generateTerrain,insideMud} from '../src/terrain';
import {movement} from '../src/shared/Movement';
import {getCharacter,PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import {applyDamage} from '../server/combat/CombatResolver';
const make=()=>{const r=new GameRoom(16);r.add('a','A','ENTP','a');r.add('b','B','INFP','b');r.map={walls:[],mud:[],toxic:[],spawns:[{x:200,y:200},{x:1200,y:700}]};r.step(0,0);return r;};
const give=(r:GameRoom,id:string,type:PickupType)=>{const p=r.players.get(id)!;const pickup={pickupId:'manual-'+Math.random(),type,x:p.x,y:p.y,spawnAt:r.items.now,expireAt:r.items.now+15000};r.items.pickups.push(pickup);return {pickup,ok:r.items.acquire(p,pickup)};};
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;a.hp=30;a.x=b.x=500;a.y=b.y=400;
 const item={pickupId:'one',type:'heart' as const,x:500,y:400,spawnAt:0,expireAt:15000};r.items.pickups=[item];r.items.collect();assert.equal(a.hp,60);assert.equal(b.hp,b.maxHp);assert.equal(r.items.pickups.length,0);assert(!r.items.acquire(b,item));
 assert.equal(give(r,'b','heart').ok,false);assert.equal(r.items.pickups.length,1);
}
{
 const r=make(),p=r.players.get('a')!;give(r,'a','skates');give(r,'a','sniper');assert(p.items?.activeWeapon);assert(p.items?.buffs.skatesExpiresAt);
 r.items.tick(1000);give(r,'a','skates');assert.equal(p.items!.buffs.skatesExpiresAt,9000);r.items.tick(5001);assert(p.items!.buffs.skatesExpiresAt);r.items.tick(9000);assert.equal(p.items!.buffs.skatesExpiresAt,null);r.items.tick(10000);assert.equal(p.items!.activeWeapon,null);
}
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;a.x=400;a.y=400;a.aimAngle=0;b.x=600;b.y=400;
 give(r,'a','sniper');r.attack(a);r.attack(a);assert.equal(a.items!.activeWeapon?.chargeEndAt,300);r.items.tick(299);r.items.fireReady();assert(b.alive);r.items.tick(300);r.items.fireReady();assert(!b.alive);assert.equal(a.items!.activeWeapon,null);assert.equal(r.events.filter(e=>e.type==='death').length,1);r.items.fireReady();assert.equal(r.events.filter(e=>e.type==='death').length,1);r.attack(a);assert(r.projectiles.length>0);
}
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;a.x=400;a.y=400;a.aimAngle=0;b.x=600;b.y=400;r.map.walls=[{x:500,y:350,w:30,h:100}];give(r,'a','sniper');r.attack(a);r.items.tick(300);r.items.fireReady();assert(b.alive);assert.equal(b.hp,b.maxHp);
}
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;a.x=400;a.y=400;a.aimAngle=0;b.x=600;b.y=400;const c=r.add('c','C','ISTJ','c')!;c.x=800;c.y=400;give(r,'a','sniper');r.attack(a);r.items.tick(300);r.items.fireReady();assert(!b.alive);assert(c.alive);
}
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;r.items.tick(5001);
 give(r,'b','skates');b.x=700;b.y=480;const speed=getCharacter(b.mbti).moveSpeed;r.inputs.get(b.id)!.time=100;r.inputs.get(b.id)!.input.moveX=1;const x=b.x;r.step(100,5100);assert(Math.abs(b.x-x-speed*1.8/30)<1e-5);
 const pool={x:700,y:480,rx:100,ry:100,points:[{x:600,y:380},{x:800,y:380},{x:800,y:580},{x:600,y:580}]};r.map.mud=[pool];const motion=movement({x:700,y:480,moveSpeed:speed*1.8},{moveX:1,moveY:0},.1,r.map);assert(Math.abs(motion.x-700-speed*1.8*.6*.1)<1e-5);
}
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;give(r,'b','sniper');give(r,'b','skates');give(r,'b','shield');r.items.tick(5001);const groundBefore=r.items.pickups.length;r.damage(a,b,9999,0,0);assert.deepEqual(b.items,emptyItems());assert.equal(r.items.pickups.length,groundBefore);give(r,'a','sniper');r.remove('a');assert.deepEqual(a.items,emptyItems());
}
{
 const r=make();r.items.tick(4999);assert.equal(r.items.pickups.length,0);r.items.tick(5000);assert.equal(r.items.pickups.length,1);r.items.spawn('heart');r.items.spawn('heart');assert.equal(r.items.pickups.length,2);r.items.tick(20001);assert(!r.items.pickups.some(p=>p.spawnAt===5000));r.items.clear();assert.equal(r.items.pickups.length,0);r.items.tick(100000);assert.equal(r.items.pickups.length,0);
}
for(let seed=0;seed<30;seed++){
 const r=make();r.map=generateTerrain({seed,profile:'Chaos'});r.items.start(0,16);for(let i=0;i<9;i++)r.items.spawn();assert(r.items.pickups.length<=6);for(const item of r.items.pickups){assert(!r.map.walls.some(w=>item.x>w.x-32&&item.x<w.x+w.w+32&&item.y>w.y-32&&item.y<w.y+w.h+32));assert(![...r.map.mud,...(r.map.toxic||[])].some(a=>insideMud(item.x,item.y,a)));assert(!(r.map.spawns||[]).some(p=>Math.hypot(item.x-p.x,item.y-p.y)<C.spawnSafeDistance));}
 const snapshot=r.snapshot();if(snapshot.pickups![0]){snapshot.pickups![0].x=-1;assert.notEqual(r.items.pickups[0].x,-1);}
}
for(const type of PLAYABLE_TYPES){const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;b.mbti=type;b.shield=20;b.statuses=[{id:'reduction',strength:.2,untilTick:1000}];a.x=400;a.y=400;a.aimAngle=0;b.x=600;b.y=400;give(r,'a','sniper');r.attack(a);r.items.tick(300);r.items.fireReady();assert(!b.alive,`${type}: numeric mitigation is not invulnerability`);}
console.log('PASS items: pickup arbitration, healing cap, independent refresh/expiry, single charged shot,  blockers, first target, skates×mud, cleanup, schedule/caps, 30 terrain seeds, snapshot isolation and all 16 mitigation definitions.');
for(const [count,cap] of [[2,2],[8,4],[16,6]]){const r=make();r.items.start(0,count);for(let i=0;i<12;i++)r.items.spawn();assert.equal(r.items.pickups.length,cap);}
{
 const r=make(),p=r.players.get('a')!;give(r,'a','sniper');give(r,'a','skates');const snap=r.snapshot();snap.players.find(p=>p.id==='a')!.items!.buffs.skatesExpiresAt=0;assert(p.items!.buffs.skatesExpiresAt!>0);r.items.clear();assert.deepEqual(p.items,emptyItems());
}
console.log('PASS 2/8/16 item caps and nested player item snapshot isolation.');
{
 const r=make(),a=r.players.get('a')!;give(r,'a','sniper');r.attack(a);r.items.tick(100);give(r,'a','sniper');assert.equal(a.items!.activeWeapon?.phase,'aiming');r.items.tick(301);r.items.fireReady();assert.equal(r.events.filter(e=>e.type==='sniper').length,0);r.items.clear();assert.deepEqual(a.items,emptyItems());
}
console.log('PASS replacing an active weapon cancels prior charge.');
{
 const {MatchSession}=await import('../server/lobby/MatchSession');
 const players=[{id:'a',slot:0,connected:true,joinedAt:0,mbti:'ENTP' as const,nickname:'A'},{id:'b',slot:1,connected:true,joinedAt:0,mbti:'INFP' as const,nickname:'B'}];
 const match=new MatchSession(players,0,2);match.step(0);give(match.game,'a','sniper');match.eliminate('b','killed',100,'a');match.resolve(100);assert.equal(match.phase,'WINNER');assert.deepEqual(match.game.players.get('a')!.items,emptyItems());assert.equal(match.game.items.pickups.length,0);
 const cancelled=new MatchSession(players,0,2);cancelled.step(0);give(cancelled.game,'a','skates');for(const p of cancelled.players.values())p.connected=false;cancelled.resolve(100);assert.equal(cancelled.phase,'CANCELLED');assert.deepEqual(cancelled.game.players.get('a')!.items,emptyItems());
}
console.log('PASS match end and cancellation clear all item state.');
{
 const r=make(),p=r.players.get('a')!;p.x=400;p.y=400;p.aimAngle=0;give(r,'a','sniper');const input={seq:1,moveX:0,moveY:0,aimAngle:Math.PI,basicAttackPressed:true,skillPressed:false,ultimatePressed:false};r.input('a',input,10);r.step(10,10);assert(Math.abs(p.aimAngle)<=C.maxAimTurnPerSecond/30+.00001);const end=p.items!.activeWeapon!.chargeEndAt;r.input('a',input,11);r.step(11,11);assert.equal(p.items!.activeWeapon!.chargeEndAt,end);assert.equal(p.lastAckSeq,1);
}
console.log('PASS bounded sniper aim and duplicate input sequence rejection.');
{
 const r=make(),a=r.players.get('a')!,b=r.players.get('b')!;assert(!('shield' in C));assert.equal(r.items.spawn('shield' as PickupType),undefined);const pickup={pickupId:'removed',type:'shield' as PickupType,x:a.x,y:a.y,spawnAt:0,expireAt:9999};r.items.pickups.push(pickup);assert.equal(r.items.acquire(a,pickup),false);b.shield=20;r.damage(a,b,9,0,0);assert.equal(b.hp,b.maxHp);assert(b.shield!<20);
}
console.log('PASS shield pickup removed; character numeric shields still work.');
