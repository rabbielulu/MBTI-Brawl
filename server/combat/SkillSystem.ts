import type {GameRoom} from '../GameRoom';
import {getCharacter} from '../../src/shared/characters/CharacterDatabase';
import type {NetworkPlayerState,PlayerInput,NetworkZone} from '../../src/shared/NetworkProtocol';
import type {SkillDefinition} from '../../src/shared/characters/CharacterDefinition';
import {NET} from '../../src/shared/GameConstants';
import {blocked} from '../../src/rules';
import {addStatus,status} from './StatusEffects';
const ticks=(seconds:number)=>Math.ceil(seconds*NET.tickRate);
export class SkillSystem {
 nextSkill=new Map<string,number>();dashHits=new Map<string,Set<string>>();zoneId=0;
 constructor(private room:GameRoom){}
 reset(){this.nextSkill.clear();this.dashHits.clear();}
 remove(id:string){this.nextSkill.delete(id);this.dashHits.delete(id);}
 prepare(){for(const p of this.room.players.values()){
  p.statuses=p.statuses.filter(s=>s.untilTick>this.room.tick);
  p.moveSpeed=getCharacter(p.mbti).moveSpeed*(status(p,'slow')?.strength||1);
  if(p.dashUntilTick<=this.room.tick)p.dashSpeed=0;
  if(!p.alive){p.dashSpeed=0;p.statuses=[];}
  p.skillCooldownRemaining=Math.max(0,((this.nextSkill.get(p.id)||0)-this.room.tick)/NET.tickRate);
 }}
 input(p:NetworkPlayerState,input:PlayerInput){
  if(!p.alive)return;
  const definition=getCharacter(p.mbti);
  if(input.ultimatePressed&&p.personality>=p.personalityMax){
   p.personality=0;this.execute(p,definition.ultimate,input,true);
  }
  if(input.skillPressed&&this.room.tick>=(this.nextSkill.get(p.id)||0)){
   const cooldown=status(p,'adrenaline')?definition.ultimate.params.dashCooldown||1:definition.skill.cooldown;
   this.nextSkill.set(p.id,this.room.tick+ticks(cooldown));this.execute(p,definition.skill,input,false);
  }
  p.skillCooldownRemaining=Math.max(0,((this.nextSkill.get(p.id)||0)-this.room.tick)/NET.tickRate);
 }
 execute(p:NetworkPlayerState,skill:SkillDefinition,input:PlayerInput,ultimate:boolean){
  const data=skill.params;
  this.room.events.push({type:'cast',id:++this.room.eventId,round:this.room.round,tick:this.room.tick,attackerId:p.id,x:p.x,y:p.y,skillId:skill.id,ultimate,radius:data.radius||65});
  if(skill.primitive==='projectile'){
   const base=getCharacter(p.mbti).basicAttack;
   this.room.projectiles.push({id:++this.room.projectileId,ownerId:p.id,x:p.x,y:p.y,vx:Math.cos(input.aimAngle)*base.projectileSpeed,vy:Math.sin(input.aimAngle)*base.projectileSpeed,expiresTick:this.room.tick+Math.ceil(base.lifetimeMs/1000*NET.tickRate),damage:data.damage,radius:12,knockback:180,source:'skill',debuffDuration:data.duration});
  }else if(skill.primitive==='buff'){
   if(skill.id==='endure')addStatus(p,'reduction',this.room.tick+ticks(data.duration),data.reduction);
   else {addStatus(p,'adrenaline',this.room.tick+ticks(data.duration),1);this.nextSkill.set(p.id,this.room.tick);}
  }else if(skill.primitive==='dash'){
   p.dashAngle=input.aimAngle;p.dashSpeed=data.speed;p.dashUntilTick=this.room.tick+ticks(data.duration);this.dashHits.set(p.id,new Set());
  }else{
   let x=p.x,y=p.y;
   if(skill.aimMode==='position'){
    const dx=(input.targetX??p.x+Math.cos(input.aimAngle)*data.range)-p.x,dy=(input.targetY??p.y+Math.sin(input.aimAngle)*data.range)-p.y;
    const factor=Math.min(1,data.range/(Math.hypot(dx,dy)||1));
    x=Math.max(90,Math.min(1310,p.x+dx*factor));y=Math.max(105,Math.min(855,p.y+dy*factor));
   }
   const pulses=data.pulses||(data.duration?Math.round(data.duration/data.interval):1),interval=ticks(data.interval||.1),delay=ticks(data.delay||0);
   const damage=skill.id==='emotion'?data.damage+(p.maxHp-p.hp)*data.missingHp+p.grievance*data.grievance:data.damage;
   if(skill.id==='emotion')p.grievance=0;
   const zone:NetworkZone={id:++this.zoneId,ownerId:p.id,kind:skill.id as NetworkZone['kind'],x,y,radius:data.radius,startTick:this.room.tick,endTick:this.room.tick+delay+(data.duration?ticks(data.duration):Math.max(1,pulses-1)*interval+5),nextPulseTick:this.room.tick+delay,intervalTicks:interval,pulsesLeft:pulses,damage,knockback:data.knockback||0,slow:data.slow,slowDuration:data.slowDuration,ultimate};
   this.room.zones.push(zone);
  }
 }
 afterMove(p:NetworkPlayerState,before:{x:number;y:number}){
  if(!p.alive||!p.dashSpeed)return;
  const hits=this.dashHits.get(p.id);if(!hits)return;
  const data=getCharacter(p.mbti).skill.params,dx=p.x-before.x,dy=p.y-before.y;
  if(Math.hypot(dx,dy)<1)p.dashSpeed=0;
  for(const target of this.room.players.values()){
   if(!target.alive||target.id===p.id||hits.has(target.id))continue;
   const t=Math.max(0,Math.min(1,((target.x-before.x)*dx+(target.y-before.y)*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(target.x-before.x-dx*t,target.y-before.y-dy*t)>46)continue;
   let covered=false;const distance=Math.hypot(target.x-p.x,target.y-p.y);for(let step=0;step<=distance;step+=8){const t=step/(distance||1);if(blocked(p.x+(target.x-p.x)*t,p.y+(target.y-p.y)*t,0,this.room.map.walls)){covered=true;break;}}if(covered)continue;
   hits.add(target.id);this.room.damage(p,target,data.damage,Math.cos(p.dashAngle)*data.knockback,Math.sin(p.dashAngle)*data.knockback);
   this.nextSkill.set(p.id,Math.max(this.room.tick,(this.nextSkill.get(p.id)||0)-ticks(getCharacter(p.mbti).trait.params.refund)));
  }
 }
 zones(){
  for(const zone of this.room.zones){
   if(zone.pulsesLeft<=0||this.room.tick<zone.nextPulseTick)continue;
   const owner=this.room.players.get(zone.ownerId);
   if(!owner||!owner.alive){zone.pulsesLeft=0;continue;}
   let count=0;
   for(const target of this.room.players.values()){
    if(!target.alive||target.id===owner.id||Math.hypot(target.x-zone.x,target.y-zone.y)>zone.radius)continue;
    const angle=Math.atan2(target.y-zone.y,target.x-zone.x);
    this.room.damage(owner,target,zone.damage,Math.cos(angle)*zone.knockback,Math.sin(angle)*zone.knockback,!zone.ultimate);count++;
    if(target.alive&&zone.slow)addStatus(target,'slow',this.room.tick+ticks(zone.slowDuration||2),zone.slow);
   }
   const trait=getCharacter(owner.mbti).trait;
   if(trait.id==='schedule'&&count>=trait.params.minTargets){this.nextSkill.set(owner.id,Math.max(this.room.tick,(this.nextSkill.get(owner.id)||0)-ticks(trait.params.refund)));}
   zone.pulsesLeft--;zone.nextPulseTick+=zone.intervalTicks;
  }
  this.room.zones=this.room.zones.filter(z=>z.endTick>this.room.tick);
 }
}
