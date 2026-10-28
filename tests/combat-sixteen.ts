import assert from 'node:assert/strict';
import {GameRoom} from '../server/GameRoom';
import {SkillSystem} from '../server/combat/SkillSystem';
import {CHARACTERS,PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import {PRESENTATIONS} from '../src/client/presentation/CharacterPresentation';
import type {MBTIType} from '../src/shared/characters/CharacterDefinition';
import {status} from '../server/combat/StatusEffects';
const input={seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:true,ultimatePressed:false,targetX:550,targetY:500};
function setup(type:MBTIType,other:MBTIType='ENTP'){const r=new GameRoom(8),a=r.add('a','甲',type)!,b=r.add('b','乙',other)!;r.map={walls:[],mud:[]};Object.assign(a,{x:400,y:500,aimAngle:0});Object.assign(b,{x:520,y:500,aimAngle:Math.PI});return {r,a,b};}
function advance(r:GameRoom,n:number){for(let i=0;i<n;i++)r.step(10000);}
assert.equal(PLAYABLE_TYPES.length,16);assert.equal(new Set(PLAYABLE_TYPES.map(t=>CHARACTERS[t].skill.id)).size,16);
{
 const {r,a,b}=setup('ENTP');b.x=a.x+1;a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});advance(r,2);assert.ok(b.hp>=73,'Point-blank barrage cannot shotgun all 12 projectiles into one player');assert.equal(a.personality,0,'Barrage cannot recharge itself');
}
for(const type of PLAYABLE_TYPES){const {r,a}=setup(type);assert.ok(PRESENTATIONS[type].projectile.symbol);assert.equal(a.maxHp,100);assert.ok(CHARACTERS[type].basicAttack.damage>=8&&CHARACTERS[type].basicAttack.damage<=12);r.skills.input(a,input);advance(r,30);for(const p of r.players.values())assert.ok(Number.isFinite(p.hp)&&Number.isFinite(p.moveSpeed));a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});advance(r,190);for(const p of r.players.values())assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.hp)&&Number.isFinite(p.personality)&&p.personality<=100&&(p.shield||0)<=50);r.resetTraining();assert.equal(r.zones.length,0);assert.equal(r.projectiles.length,0);assert.ok([...r.players.values()].every(p=>!p.shield&&p.statuses.length===0&&p.hp===100));}
{
 const {r,a,b}=setup('INTJ');a.hp=30;r.skills.input(a,input);a.x=650;r.tick=1;r.skills.input(a,input);assert.equal(a.x,400);assert.equal(r.skills.nextSkill.get(a.id),1+Math.ceil(7*.85*30));assert.equal(r.zones.filter(z=>z.kind==='chess').length,0);assert.ok(r.zones.some(z=>z.kind==='chess-blast'&&z.x===650));a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.ok(r.zones.some(z=>z.kind==='prediction'&&z.targetId===b.id));
}
{
 const {r,a,b}=setup('INFJ');r.skills.input(a,input);r.damage(a,b,10,0,0);assert.equal(b.hp,88,'Only marker owner gets 20% damage');const c=r.add('c','丙','ENTP')!;r.damage(c,b,10,0,0);assert.equal(b.hp,78);for(let i=0;i<10;i++)r.damage(a,b,1,0,0);assert.ok(b.statuses.find(s=>s.sourceId===a.id)!.untilTick<=210,'Mark extension capped');a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.ok(r.zones.some(z=>z.kind==='judgment'));const noMark=setup('INFJ');noMark.a.personality=100;noMark.r.skills.input(noMark.a,{...input,skillPressed:false,ultimatePressed:true});assert.equal(noMark.a.personality,100);
}
{
 const {r,a,b}=setup('INTP');r.skills=new SkillSystem(r,()=>0);r.skills.input(a,input);r.skills.prepare();assert.equal(a.moveSpeed,0);advance(r,27);assert.ok(status(a,'haste'));assert.equal(status(a,'thinking'),undefined);a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});r.skills.zones();assert.ok(status(b,'confusion'));const movement={...input,moveX:1,moveY:0};r.skills.modifyInput(b,movement);assert.ok(movement.moveX>.9&&Math.abs(movement.moveY)<.3,'Confusion never steals control');
}
{
 const {r,a,b}=setup('ENTJ');r.skills.input(a,input);assert.equal(b.hp,92);assert.ok(b.velocityX>300);assert.ok(status(a,'speed'));a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.ok(status(b,'forced')!.untilTick-r.tick<=18);
}
{
 const {r,a,b}=setup('ENFJ');for(let i=0;i<6;i++){const p=r.add('x'+i,'x','ENTP')!;Object.assign(p,{x:430+i*10,y:520});}r.skills.input(a,input);assert.equal(a.shield,31);assert.equal(b.hp,95);a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.ok(status(a,'power'));assert.ok(r.zones.some(z=>z.follow&&z.kind==='encourage'));
}
for(let choice=0;choice<5;choice++){
 const {r,a}=setup('ENFP');r.skills=new SkillSystem(r,()=>choice/5+.01);a.hp=60;r.skills.input(a,input);if(choice===0)assert.ok(r.zones.some(z=>z.kind==='bomb'));if(choice===1)assert.ok(a.dashSpeed>0);if(choice===2)assert.equal(a.hp,75);if(choice===3)assert.ok(status(a,'speed'));if(choice===4)assert.ok(r.zones.some(z=>z.kind==='chicken'));assert.ok(r.events.some(e=>e.type==='cast'&&e.skillId==='idea-'+choice));
}
for(let choice=0;choice<4;choice++){const {r,a}=setup('ENFP');r.skills=new SkillSystem(r,()=>choice/4+.01);a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.equal(a.personality,0);assert.ok(choice===3?r.zones.some(z=>z.kind==='chicken'&&z.ultimate):status(a,choice===0?'haste':choice===1?'speed':'explosive'));}
{
 const {r,a,b}=setup('ISTJ');r.skills.input(a,input);for(let i=0;i<3;i++)r.damage(a,b,9,0,0,true,'basic');assert.equal(b.hp,70);assert.equal(a.personality,35);const c=r.add('c','丙','ENTP')!;r.damage(a,c,9,0,0,true,'basic');assert.equal(c.hp,91,'Switching target resets stack bonus');a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.ok(r.skills.basic(a,CHARACTERS.ISTJ.basicAttack).projectileSpeed>CHARACTERS.ISTJ.basicAttack.projectileSpeed);
}
{
 const {r,a,b}=setup('ISFJ','ESTP');b.x=460;r.skills.input(a,input);r.damage(b,a,11,0,0,true,'basic');assert.ok(a.shield!<20);assert.equal(b.hp,92,'Shielded melee hit triggers counter');r.damage(b,a,11,0,0,true,'basic');assert.equal(b.hp,92,'Counter has internal cooldown');r.tick=24;r.damage(b,a,11,0,0,true,'basic');assert.equal(b.hp,84);r.tick=211;r.skills.input(a,input);assert.ok(a.shield!<=26,'Protective scaling bounded');
}
{
 const {r,a,b}=setup('ESFJ');r.skills.input(a,input);assert.ok(b.velocityX<0);assert.equal(b.hp,95);assert.equal(a.personality,5.25);a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});const z=r.zones.find(z=>z.kind==='photo')!;assert.equal(z.nextPulseTick-r.tick,90);
}
{
 const {r,a,b}=setup('ISTP');r.skills.input(a,{...input,targetX:450});assert.equal(r.zones.length,1);r.skills.zones();assert.equal(r.projectiles.length,1);assert.ok(r.projectiles[0].turret);advance(r,9);assert.ok(b.hp<100);assert.ok(r.skills.nextSkill.get(a.id)!<240,'Turret hit refunds cooldown');a.personality=100;r.skills.input(a,{...input,targetX:470,skillPressed:false,ultimatePressed:true});assert.ok(r.zones.some(z=>z.kind==='mega'));advance(r,125);assert.ok(r.zones.every(z=>z.kind!=='mega'));r.remove(a.id);advance(r,1);assert.equal(r.zones.length,0);
}
{
 const {r,a,b}=setup('ISFP');b.x=800;r.skills.prepare();assert.equal(a.moveSpeed,245*1.1);b.x=450;r.skills.input(a,input);r.skills.prepare();assert.equal(a.moveSpeed,245*1.35);assert.equal(r.skills.basic(a,CHARACTERS.ISFP.basicAttack).damage,11*1.4);assert.equal(r.skills.basic(a,CHARACTERS.ISFP.basicAttack).damage,11);a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});assert.equal(r.skills.basic(a,CHARACTERS.ISFP.basicAttack).meleeRange,95*1.6);
}
{
 const {r,a}=setup('ESFP');for(let i=0;i<6;i++){const p=r.add('x'+i,'x','ENTP')!;Object.assign(p,{x:430+i*10,y:520});}r.skills.input(a,input);assert.equal(a.personality,65,'Seven hits 56 damage plus bounded 9 bonus');a.personality=100;r.skills.input(a,{...input,skillPressed:false,ultimatePressed:true});a.x=600;r.skills.zones();assert.equal(r.zones[0].x,600);
}
console.log('PASS all 16: configuration/presentation, server casts, state reset, teleport/lowHP cooldown, owner-only mark and cap, bounded confusion/forced movement, crowd shield, all random outcomes, stacks/target switch, counter interval, pull, turret refund/lifetime, escape/range, multi-hit cap.');
{
 const {BotController}=await import('../server/bots/BotController');let peakProjectiles=0,peakZones=0;
 for(let batch=0;batch<2;batch++){
  const game=new GameRoom(8);game.map={walls:[],mud:[]};for(let i=0;i<8;i++)game.add('stress'+i,'压力'+i,PLAYABLE_TYPES[batch*8+i],`stress-${i}`);game.map={walls:[],mud:[]};const ai=new BotController(game,new Set(game.players.keys()));
  for(let tick=0;tick<3000;tick++){if(tick%300===0){game.resetTraining();[...game.players.values()].forEach((p,i)=>Object.assign(p,{x:700+Math.cos(i*Math.PI/4)*150,y:480+Math.sin(i*Math.PI/4)*150,personality:100}));}ai.update();game.step();game.drainEvents();peakProjectiles=Math.max(peakProjectiles,game.projectiles.length);peakZones=Math.max(peakZones,game.zones.length);assert.ok(game.projectiles.length<=256&&game.zones.length<=64,'Transient combat state stays bounded');for(const p of game.players.values())assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.statuses.length<20);}
 }
 console.log(`PASS 6,000 simulated ticks / eight bots across all 16 types: finite state, bounded transient objects (peak projectiles ${peakProjectiles}, zones ${peakZones}).`);
}
