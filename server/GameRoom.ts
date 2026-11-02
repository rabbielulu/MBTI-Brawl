import {ItemSystem} from './items/ItemSystem';
import {ITEM_CONFIG} from '../src/shared/ItemConfig';
import {SkillSystem} from './combat/SkillSystem';
import {getCharacter} from '../src/shared/characters/CharacterDatabase';
import type {MBTIType} from '../src/shared/characters/CharacterDefinition';
import {addStatus,status} from './combat/StatusEffects';
import { blocked } from '../src/rules';
import { generateTerrain,insideMud,TERRAIN_CONFIG,SpawnManager } from '../src/terrain';
import { NET } from '../src/shared/GameConstants';
import { movement } from '../src/shared/Movement';
import { applyDamage,meleeTargets } from './combat/CombatResolver';
import type { AttackDefinition,CombatEvent,DamageEvent } from '../src/shared/combat/CombatTypes';
import type { GameSnapshot, NetworkPlayerState, PlayerInput, NetworkProjectile, NetworkZone } from '../src/shared/NetworkProtocol';
const zero:PlayerInput={seq:0,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};
export class GameRoom {
 constructor(readonly capacity:number=NET.maxPlayers,private terrainOptions:import('../src/terrain').TerrainOptions={}){}
 damageCover(w:import('../src/terrain').TerrainWall,amount:number,attackerId:string,basic=false){
  if(!this.combatEnabled||!Number.isFinite(amount)||amount<=0||w.hp===0)return;
  w.maxHp??=TERRAIN_CONFIG.coverHp[w.sizeType||'Medium'];w.hp??=w.maxHp;
  const damage=Math.min(w.hp,basic?TERRAIN_CONFIG.coverBasicDamage:amount);w.hp=Math.max(0,w.hp-damage);w.state=w.hp===0?'destroyed':w.hp<w.maxHp?'damaged':'intact';
  this.events.push({type:'cover',id:++this.eventId,round:this.round,tick:this.tick,attackerId,coverId:w.coverId||'',x:w.x+w.w/2,y:w.y+w.h/2,damage,hp:w.hp,destroyed:w.hp===0});
 }
 coverArea(point:{x:number;y:number},radius:number,damage:number,attackerId:string,config:{canDamageCover?:boolean;coverDamageMultiplier?:number}={}){
  if(config.canDamageCover===false)return;
  for(const w of this.map.walls)if(w.hp!==0&&Math.hypot(point.x-Math.max(w.x,Math.min(point.x,w.x+w.w)),point.y-Math.max(w.y,Math.min(point.y,w.y+w.h)))<=radius)this.damageCover(w,damage*(config.coverDamageMultiplier??1),attackerId);
 }
 private coverHits=new Map<number,Set<string>>();
 items=new ItemSystem(this);private itemsStarted=false;
 combatEnabled=true;
 skills=new SkillSystem(this);zones:NetworkZone[]=[];
 map=generateTerrain();tick=0;round=0;projectiles:NetworkProjectile[]=[];
 events:CombatEvent[]=[];hits:DamageEvent[]=[];
 nextAttack=new Map<string,number>();projectileId=0;eventId=0;nextResetTick=0;
 players=new Map<string,NetworkPlayerState>();
 inputs=new Map<string,{input:PlayerInput;time:number}>();
 rate=new Map<string,{start:number;count:number}>();
 add(socketId:string,nickname:string,mbti:MBTIType='ENTP',playerId?:string){
  if(this.players.size>=this.capacity)return undefined;
  if(this.players.size===0){this.items.clear();this.itemsStarted=false;this.map=generateTerrain({...this.terrainOptions,playerCount:this.terrainOptions.playerCount??this.capacity});this.tick=0;this.projectiles=[];this.events=[];this.hits=[];this.zones=[];this.skills.reset();this.nextResetTick=0;}
  const id=playerId||Array.from({length:this.capacity},(_,i)=>`P${i+1}`).find(id=>!this.players.has(id))!;
  const spawn=this.spawn(id);const definition=getCharacter(mbti);
  const player:NetworkPlayerState={id,nickname,mbti,...spawn,aimAngle:-Math.PI/2,movementState:'idle',hp:definition.maxHp,maxHp:definition.maxHp,alive:true,personality:0,personalityMax:NET.personalityMax,velocityX:0,velocityY:0,lastAckSeq:0,basicAttackCooldownRemaining:0,lastAttackTick:-999,skillCooldownRemaining:0,grievance:0,moveSpeed:definition.moveSpeed,dashSpeed:0,dashAngle:0,dashUntilTick:0,statuses:[]};
  this.skills.remove(id);this.nextAttack.set(id,0);this.players.set(id,player);this.inputs.set(id,{input:{...zero},time:0});
  console.log(`Player connected: ${id} (${socketId})`);return player;
 }
 input(id:string,value:unknown,now=performance.now()){
  if(!this.players.has(id)||!value||typeof value!=='object')return;
  const limit=this.rate.get(id);if(!limit||now-limit.start>=1000)this.rate.set(id,{start:now,count:1});else if(++limit.count>NET.maxInputsPerSecond)return;
  const p=value as PlayerInput,previous=this.inputs.get(id)!;
  if(!Number.isSafeInteger(p.seq)||p.seq<=previous.input.seq||!Number.isFinite(p.moveX)||!Number.isFinite(p.moveY)||!Number.isFinite(p.aimAngle)||Math.abs(p.moveX)>1||Math.abs(p.moveY)>1||[p.basicAttackPressed,p.skillPressed,p.ultimatePressed].some(v=>typeof v!=='boolean'))return;
  if((p.targetX!==undefined||p.targetY!==undefined)&&(!Number.isFinite(p.targetX)||!Number.isFinite(p.targetY)))return;
  this.inputs.set(id,{input:{seq:p.seq,moveX:p.moveX,moveY:p.moveY,aimAngle:p.aimAngle%(Math.PI*2),basicAttackPressed:previous.input.basicAttackPressed||p.basicAttackPressed,skillPressed:previous.input.skillPressed||p.skillPressed,ultimatePressed:previous.input.ultimatePressed||p.ultimatePressed,targetX:p.targetX??previous.input.targetX,targetY:p.targetY??previous.input.targetY},time:now});
 }
 remove(id:string){const itemPlayer=this.players.get(id);if(itemPlayer)this.items.clearPlayer(itemPlayer);this.skills.remove(id);this.zones=this.zones.filter(z=>z.ownerId!==id);this.players.delete(id);if(!this.players.size){this.items.clear();this.itemsStarted=false;}this.inputs.delete(id);this.nextAttack.delete(id);this.rate.delete(id);this.projectiles=this.projectiles.filter(p=>p.ownerId!==id);console.log(`Player disconnected: ${id}`);}
 damage(attacker:NetworkPlayerState,target:NetworkPlayerState,damage:number,kx:number,ky:number,gainEnergy=true,source='skill'){
  if(!this.combatEnabled)return;
  const actual=applyDamage(attacker,target,source==='sniper'?damage:this.skills.damageMultiplier(attacker,target,damage,source),kx,ky,gainEnergy,false,this.items.now,source==='sniper');this.skills.onDamage(attacker,target,actual,source,gainEnergy);if(!actual)return;
  const event:DamageEvent={type:'damage',id:++this.eventId,round:this.round,tick:this.tick,attackerId:attacker.id,targetId:target.id,x:target.x,y:target.y,damage:actual,knockbackX:kx,knockbackY:ky};
  this.events.push(event);this.hits.push(event);
  if(!target.alive){this.items.clearPlayer(target);this.events.push({type:'death',id:++this.eventId,round:this.round,tick:this.tick,attackerId:attacker.id,targetId:target.id,x:target.x,y:target.y});this.inputs.set(target.id,{input:{...zero,seq:this.inputs.get(target.id)?.input.seq||0},time:0});}
 }
 attack(player:NetworkPlayerState,definition:AttackDefinition=getCharacter(player.mbti).basicAttack){
  if(!this.combatEnabled||!player.alive)return;if(this.items.attack(player))return;if(this.tick<(this.nextAttack.get(player.id)||0))return;
  definition=this.skills.basic(player,definition);
  player.lastAttackTick=this.tick;player.basicAttackCooldownRemaining=definition.cooldownMs/1000;this.nextAttack.set(player.id,this.tick+Math.ceil(definition.cooldownMs/1000*NET.tickRate));
  this.events.push({type:'attack',id:++this.eventId,round:this.round,tick:this.tick,attackerId:player.id,x:player.x,y:player.y,aimAngle:player.aimAngle,kind:definition.kind});
  if(definition.kind==='melee'){
   const targets=meleeTargets(player,this.players.values(),definition,this.map);for(const target of targets)this.damage(player,target,definition.damage,Math.cos(player.aimAngle)*definition.knockback,Math.sin(player.aimAngle)*definition.knockback,true,'basic');this.skills.multiBonus(player,targets.length,false);
   const struckCovers=this.map.walls.filter(w=>w.hp!==0).filter(w=>{const x=Math.max(w.x,Math.min(player.x,w.x+w.w)),y=Math.max(w.y,Math.min(player.y,w.y+w.h)),angle=Math.atan2(Math.sin(Math.atan2(y-player.y,x-player.x)-player.aimAngle),Math.cos(Math.atan2(y-player.y,x-player.x)-player.aimAngle));if(Math.hypot(x-player.x,y-player.y)>definition.meleeRange||Math.abs(angle)>definition.meleeArc/2)return false;if(!(definition.canPenetrateCover??definition.canPenetrateObstacle)){const n=Math.max(1,Math.ceil(Math.hypot(x-player.x,y-player.y)/4));for(let i=1;i<n;i++)if(blocked(player.x+(x-player.x)*i/n,player.y+(y-player.y)*i/n,0,this.map.walls.filter(other=>other!==w)))return false;}return true;});if(definition.canDamageCover!==false)for(const w of struckCovers)this.damageCover(w,definition.damage*(definition.coverDamageMultiplier??1),player.id,true);
  }else this.projectiles.push({id:++this.projectileId,ownerId:player.id,x:player.x,y:player.y,vx:Math.cos(player.aimAngle)*definition.projectileSpeed,vy:Math.sin(player.aimAngle)*definition.projectileSpeed,expiresTick:this.tick+Math.ceil(definition.lifetimeMs/1000*NET.tickRate),damage:definition.damage,radius:definition.projectileRadius,knockback:definition.knockback,source:'basic',canDamageCover:definition.canDamageCover,coverDamageMultiplier:definition.coverDamageMultiplier,canPenetrateCover:definition.canPenetrateCover,canPenetrateObstacle:definition.canPenetrateObstacle,explosive:!!status(player,'explosive'),wobble:player.mbti==='INTP'?.07:undefined,angle:player.aimAngle,baseSpeed:definition.projectileSpeed});
 }
 step(now=performance.now(),itemNow=now){
  if(this.players.size>0&&this.combatEnabled&&!this.itemsStarted){this.items.start(itemNow,this.players.size);this.itemsStarted=true;}this.items.tick(itemNow);
  this.tick++;this.skills.prepare();
  for(const [id,p] of this.players){
   const latest=this.inputs.get(id)!;const fresh=now-latest.time<=NET.inputTimeoutMs;
   const input=fresh?{...latest.input}:{...latest.input,moveX:0,moveY:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};
   latest.input.basicAttackPressed=false;latest.input.skillPressed=false;latest.input.ultimatePressed=false;
   p.lastAckSeq=input.seq;p.basicAttackCooldownRemaining=Math.max(0,((this.nextAttack.get(id)||0)-this.tick)/NET.tickRate);
   if(!p.alive){p.movementState='idle';continue;}
   if(!this.combatEnabled){input.basicAttackPressed=false;input.skillPressed=false;input.ultimatePressed=false;}
   this.skills.input(p,input);this.skills.modifyInput(p,input);if((p.items?.buffs.skatesExpiresAt||0)>itemNow)p.moveSpeed*=ITEM_CONFIG.skates.speed;
   if(p.items?.activeWeapon){const turn=Math.atan2(Math.sin(input.aimAngle-p.aimAngle),Math.cos(input.aimAngle-p.aimAngle)),max=ITEM_CONFIG.maxAimTurnPerSecond/NET.tickRate;input.aimAngle=p.aimAngle+Math.max(-max,Math.min(max,turn));}
   const before={x:p.x,y:p.y};
   const next=movement(p,input,1/NET.tickRate,this.map);p.movementState=Math.hypot(next.x-p.x,next.y-p.y)>.001?'walk':'idle';Object.assign(p,next,{aimAngle:input.aimAngle});this.skills.afterMove(p,before);
   if(input.basicAttackPressed)this.attack(p);
  }
  this.items.collect();this.items.fireReady();
  for(const shot of this.projectiles){
   if(shot.wobble){const angle=(shot.angle||0)+Math.sin(this.tick*.6+shot.id)*shot.wobble;shot.vx=Math.cos(angle)*(shot.baseSpeed||400);shot.vy=Math.sin(angle)*(shot.baseSpeed||400);}
   const steps=Math.max(1,Math.ceil(Math.hypot(shot.vx,shot.vy)/NET.tickRate/8));
   for(let i=0;i<steps&&shot.expiresTick>this.tick;i++){
    shot.x+=shot.vx/NET.tickRate/steps;shot.y+=shot.vy/NET.tickRate/steps;
    const covers=this.map.walls.filter(w=>w.hp!==0&&shot.x>w.x-shot.radius&&shot.x<w.x+w.w+shot.radius&&shot.y>w.y-shot.radius&&shot.y<w.y+w.h+shot.radius);
    const penetrates=shot.canPenetrateCover??shot.canPenetrateObstacle;
    for(const cover of covers)if(!this.coverHits.get(shot.id)?.has(cover.coverId||'')){let hits=this.coverHits.get(shot.id);if(!hits)this.coverHits.set(shot.id,hits=new Set());hits.add(cover.coverId||'');if(shot.canDamageCover!==false&&this.skills.allowProjectileHit(shot,'cover:'+cover.coverId))this.damageCover(cover,shot.damage*(shot.coverDamageMultiplier??1),shot.ownerId,shot.source==='basic');}
    if((covers.length&&!penetrates)||blocked(shot.x,shot.y,shot.radius,[])){shot.expiresTick=this.tick;break;}
    const target=[...this.players.values()].find(p=>p.id!==shot.ownerId&&p.alive&&Math.hypot(p.x-shot.x,p.y-shot.y)<24+shot.radius);
    if(target){const attacker=this.players.get(shot.ownerId);if(attacker&&this.skills.allowProjectileHit(shot,target.id)){const speed=Math.hypot(shot.vx,shot.vy);this.damage(attacker,target,shot.damage,shot.vx/speed*shot.knockback,shot.vy/speed*shot.knockback,!shot.noEnergy,shot.turret?'turret':shot.source);if(shot.explosive){for(const other of this.players.values())if(other.id!==target.id&&other.id!==attacker.id&&other.alive&&Math.hypot(other.x-shot.x,other.y-shot.y)<85)this.damage(attacker,other,4,0,0,false,'ultimate');}}if(target.alive&&shot.debuffDuration)addStatus(target,'vulnerable',this.tick+Math.ceil(shot.debuffDuration*NET.tickRate),shot.debuffStrength||1.15);shot.expiresTick=this.tick;}
   }
  }
  if(this.combatEnabled)for(const target of this.players.values())if(target.alive&&(this.map.toxic||[]).some(area=>insideMud(target.x,target.y,area))){
   const actual=applyDamage(target,target,target.maxHp*TERRAIN_CONFIG.toxicDps/NET.tickRate,0,0,false,true,this.items.now);
   if(actual){const event:DamageEvent={type:'damage',id:++this.eventId,round:this.round,tick:this.tick,attackerId:'environment',targetId:target.id,x:target.x,y:target.y,damage:actual,knockbackX:0,knockbackY:0,source:'environment'};this.events.push(event);this.hits.push(event);if(!target.alive)this.events.push({type:'death',id:++this.eventId,round:this.round,tick:this.tick,attackerId:'environment',targetId:target.id,x:target.x,y:target.y,source:'environment'});}
  }
  this.skills.zones();for(const p of this.players.values())if(!p.alive)this.items.clearPlayer(p);for(const id of this.coverHits.keys())if(!this.projectiles.some(p=>p.id===id&&p.expiresTick>this.tick))this.coverHits.delete(id);this.projectiles=this.projectiles.filter(p=>p.expiresTick>this.tick);this.hits=this.hits.filter(h=>h.tick>this.tick-NET.tickRate);
 }
 drainEvents(){return this.events.splice(0);}
 resetTraining(){
  if(this.tick<this.nextResetTick)return;this.nextResetTick=this.tick+NET.tickRate;this.round++;this.items.clear();this.itemsStarted=false;this.projectiles=[];this.hits=[];this.events=[];this.zones=[];this.skills.reset();
  for(const [id,p] of this.players){Object.assign(p,this.spawn(id),{hp:p.maxHp,alive:true,personality:0,grievance:0,shield:0,statuses:[],moveSpeed:getCharacter(p.mbti).moveSpeed,dashSpeed:0,dashUntilTick:0,velocityX:0,velocityY:0,lastAttackTick:-999,basicAttackCooldownRemaining:0,skillCooldownRemaining:0,movementState:'idle'});this.nextAttack.set(id,this.tick);this.inputs.set(id,{input:{...zero,seq:this.inputs.get(id)?.input.seq||0},time:0});}
 }
 spawn(id:string){
  const points=this.map.spawns||SpawnManager.select(this.capacity);
  const occupied=[...this.players.values()].filter(p=>p.id!==id);
  const point=points.find(p=>!occupied.some(other=>Math.hypot(other.x-p.x,other.y-p.y)<70));
  if(point)return {...point};
  throw new Error('No safe spawn available');
 }
 snapshot():GameSnapshot{return {pickups:this.items.pickups.map(p=>({...p})),itemNow:this.items.now,covers:this.map.walls.map(w=>({...w})),round:this.round,tick:this.tick,players:[...this.players.values()].map(p=>({...p,items:p.items?structuredClone(p.items):undefined,statuses:p.statuses.map(s=>({...s}))})),zones:this.zones.map(z=>({...z})),projectiles:this.projectiles.map(p=>({...p}))};}
}
