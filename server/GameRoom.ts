import {SkillSystem} from './combat/SkillSystem';
import {getCharacter} from '../src/shared/characters/CharacterDatabase';
import type {MBTIType} from '../src/shared/characters/CharacterDefinition';
import {addStatus} from './combat/StatusEffects';
import { blocked } from '../src/rules';
import { generateTerrain } from '../src/terrain';
import { NET } from '../src/shared/GameConstants';
import { movement } from '../src/shared/Movement';
import { applyDamage,meleeTargets } from './combat/CombatResolver';
import type { AttackDefinition,CombatEvent,DamageEvent } from '../src/shared/combat/CombatTypes';
import type { GameSnapshot, NetworkPlayerState, PlayerInput, NetworkProjectile, NetworkZone } from '../src/shared/NetworkProtocol';
const zero:PlayerInput={seq:0,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};
export class GameRoom {
 constructor(readonly capacity:number=NET.maxPlayers){}
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
  if(this.players.size===0){this.map=generateTerrain();this.tick=0;this.projectiles=[];this.events=[];this.hits=[];this.zones=[];this.skills.reset();this.nextResetTick=0;}
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
 remove(id:string){this.skills.remove(id);this.zones=this.zones.filter(z=>z.ownerId!==id);this.players.delete(id);this.inputs.delete(id);this.nextAttack.delete(id);this.rate.delete(id);this.projectiles=this.projectiles.filter(p=>p.ownerId!==id);console.log(`Player disconnected: ${id}`);}
 damage(attacker:NetworkPlayerState,target:NetworkPlayerState,damage:number,kx:number,ky:number,gainEnergy=true){
  if(!this.combatEnabled)return;
  const actual=applyDamage(attacker,target,damage,kx,ky,gainEnergy);if(!actual)return;
  const event:DamageEvent={type:'damage',id:++this.eventId,round:this.round,tick:this.tick,attackerId:attacker.id,targetId:target.id,x:target.x,y:target.y,damage:actual,knockbackX:kx,knockbackY:ky};
  this.events.push(event);this.hits.push(event);
  if(!target.alive){this.events.push({type:'death',id:++this.eventId,round:this.round,tick:this.tick,attackerId:attacker.id,targetId:target.id,x:target.x,y:target.y});this.inputs.set(target.id,{input:{...zero,seq:this.inputs.get(target.id)?.input.seq||0},time:0});}
 }
 attack(player:NetworkPlayerState,definition:AttackDefinition=getCharacter(player.mbti).basicAttack){
  if(!this.combatEnabled||!player.alive||this.tick<(this.nextAttack.get(player.id)||0))return;
  player.lastAttackTick=this.tick;player.basicAttackCooldownRemaining=definition.cooldownMs/1000;this.nextAttack.set(player.id,this.tick+Math.ceil(definition.cooldownMs/1000*NET.tickRate));
  this.events.push({type:'attack',id:++this.eventId,round:this.round,tick:this.tick,attackerId:player.id,x:player.x,y:player.y,aimAngle:player.aimAngle,kind:definition.kind});
  if(definition.kind==='melee'){
   for(const target of meleeTargets(player,this.players.values(),definition,this.map))this.damage(player,target,definition.damage,Math.cos(player.aimAngle)*definition.knockback,Math.sin(player.aimAngle)*definition.knockback);
  }else this.projectiles.push({id:++this.projectileId,ownerId:player.id,x:player.x,y:player.y,vx:Math.cos(player.aimAngle)*definition.projectileSpeed,vy:Math.sin(player.aimAngle)*definition.projectileSpeed,expiresTick:this.tick+Math.ceil(definition.lifetimeMs/1000*NET.tickRate),damage:definition.damage,radius:definition.projectileRadius,knockback:definition.knockback,source:'basic'});
 }
 step(now=performance.now()){
  this.tick++;this.skills.prepare();
  for(const [id,p] of this.players){
   const latest=this.inputs.get(id)!;const fresh=now-latest.time<=NET.inputTimeoutMs;
   const input=fresh?{...latest.input}:{...latest.input,moveX:0,moveY:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};
   latest.input.basicAttackPressed=false;latest.input.skillPressed=false;latest.input.ultimatePressed=false;
   p.lastAckSeq=input.seq;p.basicAttackCooldownRemaining=Math.max(0,((this.nextAttack.get(id)||0)-this.tick)/NET.tickRate);
   if(!p.alive){p.movementState='idle';continue;}
   if(!this.combatEnabled){input.basicAttackPressed=false;input.skillPressed=false;input.ultimatePressed=false;}
   this.skills.input(p,input);const before={x:p.x,y:p.y};
   const next=movement(p,input,1/NET.tickRate,this.map);p.movementState=Math.hypot(next.x-p.x,next.y-p.y)>.001?'walk':'idle';Object.assign(p,next,{aimAngle:input.aimAngle});this.skills.afterMove(p,before);
   if(input.basicAttackPressed)this.attack(p);
  }
  for(const shot of this.projectiles){
   const steps=Math.max(1,Math.ceil(Math.hypot(shot.vx,shot.vy)/NET.tickRate/8));
   for(let i=0;i<steps&&shot.expiresTick>this.tick;i++){
    shot.x+=shot.vx/NET.tickRate/steps;shot.y+=shot.vy/NET.tickRate/steps;
    if(blocked(shot.x,shot.y,shot.radius,this.map.walls)){shot.expiresTick=this.tick;break;}
    const target=[...this.players.values()].find(p=>p.id!==shot.ownerId&&p.alive&&Math.hypot(p.x-shot.x,p.y-shot.y)<24+shot.radius);
    if(target){const attacker=this.players.get(shot.ownerId);if(attacker){const speed=Math.hypot(shot.vx,shot.vy);this.damage(attacker,target,shot.damage,shot.vx/speed*shot.knockback,shot.vy/speed*shot.knockback);}if(target.alive&&shot.debuffDuration)addStatus(target,'vulnerable',this.tick+Math.ceil(shot.debuffDuration*NET.tickRate),1.5);shot.expiresTick=this.tick;}
   }
  }
  this.skills.zones();this.projectiles=this.projectiles.filter(p=>p.expiresTick>this.tick);this.hits=this.hits.filter(h=>h.tick>this.tick-NET.tickRate);
 }
 drainEvents(){return this.events.splice(0);}
 resetTraining(){
  if(this.tick<this.nextResetTick)return;this.nextResetTick=this.tick+NET.tickRate;this.round++;this.projectiles=[];this.hits=[];this.events=[];this.zones=[];this.skills.reset();
  for(const [id,p] of this.players){Object.assign(p,this.spawn(id),{hp:p.maxHp,alive:true,personality:0,grievance:0,statuses:[],moveSpeed:getCharacter(p.mbti).moveSpeed,dashSpeed:0,dashUntilTick:0,velocityX:0,velocityY:0,lastAttackTick:-999,basicAttackCooldownRemaining:0,skillCooldownRemaining:0,movementState:'idle'});this.nextAttack.set(id,this.tick);this.inputs.set(id,{input:{...zero,seq:this.inputs.get(id)?.input.seq||0},time:0});}
 }
 spawn(id:string){
  if(this.capacity===NET.maxPlayers&&/^P[1-4]$/.test(id))return [{x:700,y:710},{x:300,y:340},{x:1100,y:340},{x:1080,y:660}][Number(id.slice(1))-1];
  const slot=this.players.size,angle=-Math.PI/2+slot/this.capacity*Math.PI*2;
  const wanted={x:700+Math.cos(angle)*470,y:480+Math.sin(angle)*220};
  for(let radius=0;radius<500;radius+=35)for(let i=0;i<24;i++){
   const p={x:wanted.x+Math.cos(i/24*Math.PI*2)*radius,y:wanted.y+Math.sin(i/24*Math.PI*2)*radius};
   if(!blocked(p.x,p.y,30,this.map.walls)&&![...this.players.values()].some(other=>Math.hypot(other.x-p.x,other.y-p.y)<100))return p;
  }
  throw new Error('No safe spawn available');
 }
 snapshot():GameSnapshot{return {round:this.round,tick:this.tick,players:[...this.players.values()].map(p=>({...p,statuses:p.statuses.map(s=>({...s}))})),zones:this.zones.map(z=>({...z})),projectiles:this.projectiles.map(p=>({...p}))};}
}
