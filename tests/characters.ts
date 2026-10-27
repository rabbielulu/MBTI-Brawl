import assert from 'node:assert/strict';
import {GameRoom} from '../server/GameRoom';
import {CHARACTERS,PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import type {MBTIType} from '../src/shared/characters/CharacterDefinition';
import type {PlayerInput} from '../src/shared/NetworkProtocol';
import {movement} from '../src/shared/Movement';
import {status,addStatus} from '../server/combat/StatusEffects';
const idle:PlayerInput={seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};
function setup(type:MBTIType='ENTP',other:MBTIType='ENTP') {const r=new GameRoom();const a=r.add('a','甲',type)!,b=r.add('b','乙',other)!;r.map={walls:[],mud:[]};Object.assign(a,{x:400,y:500,aimAngle:0});Object.assign(b,{x:570,y:500,aimAngle:Math.PI});return {r,a,b};}
function cast(r:GameRoom,id:string,ultimate=false,extra:Partial<PlayerInput>={}) {r.skills.input(r.players.get(id)!,{...idle,skillPressed:!ultimate,ultimatePressed:ultimate,...extra});}
{
 const {r,a,b}=setup();cast(r,a.id);assert.equal(r.projectiles.length,1);cast(r,a.id);assert.equal(r.projectiles.length,1,'Skill cooldown prevents spam');
 for(let i=0;i<14;i++)r.step(10000);assert.equal(b.hp,80);assert.ok(status(b,'vulnerable'));assert.equal(a.personality,20);
 r.damage(a,b,12,0,0);assert.equal(b.hp,62);assert.equal(a.personality,47,'Debate Me awards 1.5x actual damage');
 r.tick=status(b,'vulnerable')!.untilTick;r.skills.prepare();assert.equal(status(b,'vulnerable'),undefined);
 const n=r.zones.length;cast(r,a.id,true);assert.equal(r.zones.length,n,'Energy below 100 rejects ultimate');
 a.personality=100;cast(r,a.id,true);assert.equal(a.personality,0);assert.equal(r.zones[0].pulsesLeft,3);
 Object.assign(b,{x:550,y:500});for(let pulse=0;pulse<3;pulse++){r.tick=r.zones[0].nextPulseTick;r.skills.zones();}
 assert.equal(b.hp,14);assert.equal(a.personality,0,'Ultimate damage cannot refill its own meter');
}
{
 const {r,a,b}=setup('INFP');cast(r,a.id);r.damage(b,a,20,0,0);assert.equal(a.hp,90);assert.equal(a.grievance,10);
 a.hp=50;r.damage(a,b,10,0,0);assert.equal(a.personality,13.75,'Sensitive scales actual damage by missing HP');
 a.personality=100;a.grievance=40;cast(r,a.id,true);assert.equal(r.zones[0].damage,70);assert.equal(a.grievance,0);r.skills.zones();assert.equal(b.hp,20);assert.equal(a.personality,0);
 const snapshot=r.snapshot();snapshot.players[0].statuses[0].strength=99;assert.equal(status(a,'reduction')!.strength,.5,'Status snapshots are detached');
 r.tick=90;r.skills.prepare();assert.equal(status(a,'reduction'),undefined);r.damage(b,a,10,0,0);assert.equal(a.hp,40);assert.equal(a.grievance,0,'Expired shield no longer accumulates');
}
{
 const {r,a,b}=setup('ESTJ');const c=r.add('c','丙','ESTP')!;Object.assign(c,{x:590,y:520});cast(r,a.id,false,{targetX:570,targetY:500});assert.equal(r.zones[0].x,570);
 r.tick=89;r.skills.zones();assert.equal(b.hp,100);r.tick=90;r.skills.zones();assert.equal(b.hp,72);assert.equal(c.hp,72);assert.equal(status(b,'slow')!.strength,.65);assert.equal(r.skills.nextSkill.get(a.id),165,'Two-target Deadline refunds 1.5 seconds');
 r.skills.prepare();assert.equal(b.moveSpeed,245*.65);r.tick=150;r.skills.prepare();assert.equal(b.moveSpeed,245);
 a.personality=100;cast(r,a.id,true,{targetX:570,targetY:500});const z=r.zones.find(z=>z.kind==='kpi')!;assert.equal(z.pulsesLeft,6);assert.equal(z.endTick-z.startTick,90);
 for(let i=0;i<6;i++){r.tick=z.nextPulseTick;r.skills.zones();}assert.equal(b.hp,12);assert.equal(a.personality,0);
 r.zones=[];r.tick=500;cast(r,a.id,false,{targetX:99999,targetY:500});assert.equal(r.zones[0].x,680,'Ground targeting clamps to range');
}
{
 const {r,a,b}=setup('ESTP');b.x=460;r.attack(a);assert.equal(b.hp,90);assert.equal(r.projectiles.length,0,'ESTP basic uses melee');
 r.tick=30;Object.assign(b,{x:520,y:500,velocityX:0});cast(r,a.id);for(let i=0;i<9;i++)r.step(10000);assert.equal(b.hp,72,'Dash hits only once per target');assert.ok(a.x>=640&&a.x<=670);assert.equal(r.skills.nextSkill.get(a.id),162,'Momentum refunds .6 seconds');
 a.personality=100;cast(r,a.id,true);assert.ok(status(a,'adrenaline'));cast(r,a.id);assert.equal(r.skills.nextSkill.get(a.id),r.tick+30,'Adrenaline refreshes dash and uses 1s cooldown');
 r.tick=status(a,'adrenaline')!.untilTick;r.skills.prepare();cast(r,a.id);assert.equal(r.skills.nextSkill.get(a.id),r.tick+150,'Normal cooldown resumes after adrenaline expires');
 const wall=setup('ESTP');wall.r.map.walls=[{x:490,y:400,w:25,h:200}];wall.b.x=535;cast(wall.r,wall.a.id);for(let i=0;i<12;i++)wall.r.step(10000);assert.ok(wall.a.x<=470);assert.equal(wall.a.dashSpeed,0);assert.equal(wall.b.hp,100,'Dash cannot damage through a thin wall');
 const predicted=movement({x:400,y:500,dashSpeed:900,dashAngle:0},{moveX:0,moveY:0},1/30,{walls:[],mud:[]});assert.equal(predicted.x,430,'Client and server use identical dash prediction');
}
for(const type of PLAYABLE_TYPES){
 const {r,a}=setup(type);a.alive=false;a.hp=0;a.personality=100;cast(r,a.id);cast(r,a.id,true);assert.equal(r.projectiles.length+r.zones.length,0);assert.equal(a.dashSpeed,0,'Dead characters cannot cast');assert.equal(a.personality,100);
 r.resetTraining();assert.equal(a.hp,CHARACTERS[type].maxHp);assert.equal(a.personality,0);assert.equal(a.grievance,0);assert.deepEqual(a.statuses,[]);assert.equal(r.skills.nextSkill.size,0);
}
{
 const {r,a}=setup('ESTJ');r.input(a.id,{...idle,skillPressed:true,targetX:500,targetY:550},1000);r.input(a.id,{...idle,seq:2},1001);r.step(1002);assert.equal(r.zones[0].x,500);assert.equal(r.zones[0].y,550,'Queued targeting survives intervening move packets');
 r.input(a.id,{...idle,seq:3,targetX:NaN,targetY:0},1003);assert.equal(r.inputs.get(a.id)!.input.seq,2,'Malformed targets rejected');
 r.remove(a.id);assert.equal(r.zones.length,0);assert.equal(r.skills.nextSkill.has(a.id),false);
}
console.log('PASS: four kits, cooldown/ultimate gates, debuff/trait/expiry, reduction/grievance/low-HP scaling, emotion formula, delayed AoE/slow/multi-hit refund, six KPI pulses, melee/dash/prediction/cover/refund/adrenaline, target validation, deep snapshots, death/reset/disconnect.');
