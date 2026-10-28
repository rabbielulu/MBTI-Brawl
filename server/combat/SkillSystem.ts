import type {GameRoom} from '../GameRoom';
import {getCharacter} from '../../src/shared/characters/CharacterDatabase';
import type {NetworkPlayerState as Player,PlayerInput,NetworkZone,NetworkProjectile} from '../../src/shared/NetworkProtocol';
import type {SkillDefinition} from '../../src/shared/characters/CharacterDefinition';
import type {AttackDefinition} from '../../src/shared/combat/CombatTypes';
import {NET} from '../../src/shared/GameConstants';
import {blocked} from '../../src/rules';
import {meleeTargets} from './CombatResolver';
import {addStatus,status} from './StatusEffects';
const ticks=(seconds:number)=>Math.ceil(seconds*NET.tickRate);
interface ActorMemory {marker?:{x:number;y:number;until:number};pendingBuff?:number;mark?:{id:string;until:number;maxUntil:number};lastRandom?:string;target?:string;hits:number;received:number[];counterAt:number;refundTick:number;refund:number;dashRefunded:boolean;dashCooldown:number}
export class SkillSystem {
 nextSkill=new Map<string,number>();dashHits=new Map<string,Set<string>>();zoneId=0;
 private volleys=new Map<number,{until:number;hits:Map<string,number>}>();
 private actors=new Map<string,ActorMemory>();
 constructor(private room:GameRoom,private random:()=>number=Math.random){}
 private memory(id:string){let m=this.actors.get(id);if(!m){m={hits:0,received:[],counterAt:0,refundTick:0,refund:0,dashRefunded:false,dashCooldown:6};this.actors.set(id,m);}return m;}
 reset(){this.nextSkill.clear();this.dashHits.clear();this.actors.clear();this.volleys.clear();}
 remove(id:string){this.nextSkill.delete(id);this.dashHits.delete(id);this.actors.delete(id);for(const p of this.room.players.values())p.statuses=p.statuses.filter(s=>s.sourceId!==id);}
 private nearby(p:{id?:string|number;x:number;y:number},radius:number){return [...this.room.players.values()].filter(t=>t.alive&&t.id!==p.id&&Math.hypot(t.x-p.x,t.y-p.y)<=radius);}
 private visible(a:{x:number;y:number},b:{x:number;y:number},radius=2){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));for(let i=0;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,radius,this.room.map.walls))return false;return true;}
 private push(p:Player,target:Player,force:number,angle=Math.atan2(target.y-p.y,target.x-p.x)){target.velocityX+=Math.cos(angle)*force;target.velocityY+=Math.sin(angle)*force;const v=Math.hypot(target.velocityX,target.velocityY);if(v>NET.maxKnockback){target.velocityX*=NET.maxKnockback/v;target.velocityY*=NET.maxKnockback/v;}}
 private shield(p:Player,value:number,duration:number){p.shield=Math.min(50,(p.shield||0)+value);addStatus(p,'shield',this.room.tick+ticks(duration),1);}
 private energy(p:Player,amount:number){p.personality=Math.min(p.personalityMax,p.personality+amount);}
 allowProjectileHit(shot:NetworkProjectile,targetId:string){if(shot.hitGroup===undefined)return true;let group=this.volleys.get(shot.hitGroup);if(!group){group={until:shot.expiresTick,hits:new Map()};this.volleys.set(shot.hitGroup,group);}const hits=group.hits.get(targetId)||0;if(hits>=(shot.hitCap||1))return false;group.hits.set(targetId,hits+1);return true;}
 prepare(){for(const [id,group] of this.volleys)if(group.until<=this.room.tick)this.volleys.delete(id);for(const p of this.room.players.values()){
  const def=getCharacter(p.mbti),m=this.memory(p.id),now=this.room.tick;
  p.statuses=p.statuses.filter(s=>s.untilTick>now);if(!status(p,'shield'))p.shield=0;
  if(!p.alive){p.dashSpeed=0;p.statuses=[];p.shield=0;m.pendingBuff=undefined;m.marker=undefined;continue;}
  if(m.marker&&now>=m.marker.until)m.marker=undefined;
  if(m.mark&&now>=m.mark.until)m.mark=undefined;
  if(m.pendingBuff!==undefined&&now>=m.pendingBuff){m.pendingBuff=undefined;const data=def.skill.params,choice=Math.floor(this.random()*3);addStatus(p,choice===0?'haste':choice===1?'speed':'reduction',now+ticks(data.duration),choice===0?data.haste:choice===1?data.speed:data.reduction);this.castEvent(p,`ponder-${choice}`,false);}
  p.moveSpeed=def.moveSpeed*(status(p,'slow')?.strength||1)*(status(p,'speed')?.strength||1);
  if(status(p,'thinking'))p.moveSpeed=0;
  if(def.trait.id==='space'&&!this.nearby(p,def.trait.params.radius).length)p.moveSpeed*=def.trait.params.speed;
  const art=this.room.zones.find(z=>z.ownerId===p.id&&z.kind==='art'&&z.endTick>now&&Math.hypot(p.x-z.x,p.y-z.y)<=z.radius);if(art)p.moveSpeed*=def.ultimate.params.speed;
  if(p.dashUntilTick<=now)p.dashSpeed=0;
  p.skillCooldownRemaining=m.marker?0:Math.max(0,((this.nextSkill.get(p.id)||0)-now)/NET.tickRate);
 }}
 modifyInput(p:Player,input:PlayerInput){if(status(p,'thinking'))input.basicAttackPressed=false;const confused=status(p,'confusion');if(confused){const angle=confused.strength*(Math.floor(this.room.tick/6)%2?1:-1),x=input.moveX;input.moveX=x*Math.cos(angle)-input.moveY*Math.sin(angle);input.moveY=x*Math.sin(angle)+input.moveY*Math.cos(angle);}const force=status(p,'forced');if(force){input.moveX=Math.cos(force.angle||0);input.moveY=Math.sin(force.angle||0);p.moveSpeed=force.strength;}}
 input(p:Player,input:PlayerInput){
  if(!p.alive||!this.room.combatEnabled||status(p,'thinking'))return;
  const definition=getCharacter(p.mbti),m=this.memory(p.id);
  if(input.ultimatePressed&&p.personality>=p.personalityMax){
   if(definition.ultimate.id!=='judgment'||(m.mark&&m.mark.until>this.room.tick&&this.room.players.get(m.mark.id)?.alive)){p.personality=0;this.execute(p,definition.ultimate,input,true);}
  }
  if(input.skillPressed&&(this.room.tick>=(this.nextSkill.get(p.id)||0)||!!m.marker)){
   let cooldown=status(p,'adrenaline')?definition.ultimate.params.dashCooldown||1:definition.skill.cooldown;
   if(definition.trait.id==='planB'&&p.hp/p.maxHp<definition.trait.params.threshold)cooldown*=definition.trait.params.multiplier;
   m.dashCooldown=cooldown;this.nextSkill.set(p.id,this.room.tick+ticks(cooldown));this.execute(p,definition.skill,input,false);
  }
  p.skillCooldownRemaining=m.marker?0:Math.max(0,((this.nextSkill.get(p.id)||0)-this.room.tick)/NET.tickRate);
 }
 private castEvent(p:Player,id:string,ultimate:boolean,radius=65){this.room.events.push({type:'cast',id:++this.room.eventId,round:this.room.round,tick:this.room.tick,attackerId:p.id,x:p.x,y:p.y,skillId:id,ultimate,radius});}
 private point(p:Player,input:PlayerInput,range:number){const dx=(input.targetX??p.x+Math.cos(input.aimAngle)*range)-p.x,dy=(input.targetY??p.y+Math.sin(input.aimAngle)*range)-p.y,f=Math.min(1,range/(Math.hypot(dx,dy)||1));return {x:Math.max(90,Math.min(1310,p.x+dx*f)),y:Math.max(105,Math.min(855,p.y+dy*f))};}
 private zone(p:Player,skill:SkillDefinition,ultimate:boolean,point:{x:number;y:number}=p,extra:Partial<NetworkZone>={}){
  const d=skill.params,interval=ticks(d.interval||.1),delay=ticks(d.delay||0),pulses=d.pulses||(d.duration?Math.round(d.duration/(d.interval||1)):1);
  const z:NetworkZone={id:++this.zoneId,ownerId:p.id,kind:skill.id,x:point.x,y:point.y,radius:d.radius||100,startTick:this.room.tick,endTick:this.room.tick+delay+(d.duration?ticks(d.duration):Math.max(1,pulses-1)*interval+6),nextPulseTick:this.room.tick+delay,intervalTicks:interval,pulsesLeft:pulses,damage:d.damage||0,knockback:d.knockback||0,slow:d.slow,slowDuration:d.slowDuration,ultimate,...extra};this.room.zones.push(z);return z;
 }
 private dash(p:Player,angle:number,speed:number,duration:number){p.dashAngle=angle;p.dashSpeed=speed;p.dashUntilTick=this.room.tick+ticks(duration);this.dashHits.set(p.id,new Set());this.memory(p.id).dashRefunded=false;}
 execute(p:Player,skill:SkillDefinition,input:PlayerInput,ultimate:boolean){
  const d=skill.params,m=this.memory(p.id),now=this.room.tick;this.castEvent(p,skill.id,ultimate,skill.primitive==='turret'?45:d.radius||65);
  if(skill.primitive==='projectile'){
   const b=getCharacter(p.mbti).basicAttack;this.room.projectiles.push({id:++this.room.projectileId,ownerId:p.id,x:p.x,y:p.y,vx:Math.cos(input.aimAngle)*b.projectileSpeed,vy:Math.sin(input.aimAngle)*b.projectileSpeed,expiresTick:now+ticks(b.lifetimeMs/1000),damage:d.damage,radius:12,knockback:180,source:'skill',canPenetrateObstacle:getCharacter(p.mbti).skill.canPenetrateObstacle,debuffDuration:d.duration,debuffStrength:d.vulnerability});
  }else if(skill.primitive==='teleport'){
   if(m.marker){const old={x:p.x,y:p.y},destination=m.marker;m.marker=undefined;this.room.zones=this.room.zones.filter(z=>z.ownerId!==p.id||z.kind!=='chess');if(!blocked(destination.x,destination.y,20,this.room.map.walls)){p.x=destination.x;p.y=destination.y;p.velocityX=p.velocityY=0;}this.zone(p,{...skill,id:'chess-blast',params:{damage:d.damage,radius:d.radius}},false,old);}
   else {m.marker={x:p.x,y:p.y,until:now+ticks(d.duration)};this.zone(p,skill,false,p,{endTick:now+ticks(d.duration),pulsesLeft:0});}
  }else if(skill.primitive==='mark'){
   const targets=this.nearby(p,d.range).filter(t=>Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-p.y,t.x-p.x)-input.aimAngle),Math.cos(Math.atan2(t.y-p.y,t.x-p.x)-input.aimAngle)))<=d.arc&&this.visible(p,t)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
   if(targets[0]){for(const actor of this.room.players.values())actor.statuses=actor.statuses.filter(s=>s.id!=='mark'||s.sourceId!==p.id);const target=targets[0];m.mark={id:target.id,until:now+ticks(d.duration),maxUntil:now+ticks(d.duration+d.maxExtension)};target.statuses=target.statuses.filter(s=>s.id!=='mark'||s.sourceId!==p.id);target.statuses.push({id:'mark',strength:d.damageMultiplier,untilTick:m.mark.until,sourceId:p.id});}
  }else if(skill.primitive==='push'||skill.primitive==='pull'){
   const targets=skill.id==='command'?meleeTargets({...p,aimAngle:input.aimAngle},this.room.players.values(),{...getCharacter(p.mbti).basicAttack,meleeRange:d.range,meleeArc:d.arc},this.room.map):this.nearby(p,d.radius).filter(t=>this.visible(p,t));
   let count=0;for(const target of targets){const angle=skill.primitive==='pull'?Math.atan2(p.y-target.y,p.x-target.x):skill.id==='obey'?input.aimAngle:Math.atan2(target.y-p.y,target.x-p.x);if(!d.delay)this.room.damage(p,target,d.damage,0,0,!ultimate,'skill');this.push(p,target,d.knockback,angle);count++;if(d.forceDuration&&target.alive){addStatus(target,'forced',now+ticks(d.forceDuration),d.forceSpeed);status(target,'forced')!.angle=input.aimAngle;}}
   if(d.shield)this.shield(p,d.shield+Math.min(d.nearbyCap,this.nearby(p,300).length)*d.perNearby,d.duration);
   if(count&&p.mbti==='ENTJ')addStatus(p,'speed',now+ticks(2),1.15);
   if(skill.id==='photo')this.zone(p,skill,true);
   this.multiBonus(p,count,ultimate);
  }else if(skill.primitive==='turret'){
   this.room.zones=this.room.zones.filter(z=>!(z.ownerId===p.id&&z.kind===skill.id));let point=this.point(p,input,d.range);if(blocked(point.x,point.y,22,this.room.map.walls)){let found=false;for(let radius=20;radius<=180&&!found;radius+=20)for(let i=0;i<16;i++){const candidate={x:point.x+Math.cos(i/16*Math.PI*2)*radius,y:point.y+Math.sin(i/16*Math.PI*2)*radius};if(Math.hypot(candidate.x-p.x,candidate.y-p.y)<=d.range&&!blocked(candidate.x,candidate.y,22,this.room.map.walls)){point=candidate;found=true;break;}}if(!found)point={x:p.x,y:p.y};}this.zone(p,skill,ultimate,point,{finalDamage:d.finalDamage,finalRadius:d.finalRadius});
  }else if(skill.primitive==='random'){
   if(skill.id==='ponder'){m.pendingBuff=now+ticks(d.delay);addStatus(p,'thinking',m.pendingBuff,1);return;}
   const choice=Math.floor(this.random()*(ultimate?4:5));this.castEvent(p,`${skill.id}-${choice}`,ultimate);if(!ultimate&&m.lastRandom!==undefined&&m.lastRandom!==`${skill.id}:${choice}`)this.energy(p,getCharacter(p.mbti).trait.params.energy);m.lastRandom=`${skill.id}:${choice}`;
   if(ultimate){if(choice===0)addStatus(p,'haste',now+ticks(d.duration),d.haste);if(choice===1)addStatus(p,'speed',now+ticks(d.duration),d.speed);if(choice===2)addStatus(p,'explosive',now+ticks(d.duration),1);if(choice===3)this.chicken(p,24,140,5,250,true);}
   else {if(choice===0)this.zone(p,{...skill,id:'bomb',params:{damage:d.damage,radius:d.radius,delay:.8}},false,this.point(p,input,180));if(choice===1)this.dash(p,input.aimAngle,720,.25);if(choice===2)p.hp=Math.min(p.maxHp,p.hp+d.heal);if(choice===3)addStatus(p,'speed',now+ticks(d.duration),d.speed);if(choice===4)this.chicken(p,d.chickenDamage,65,4,d.chickenSpeed,false);}
  }else if(skill.primitive==='buff'){
   const until=now+ticks(d.duration);
   if(d.reduction)addStatus(p,'reduction',until,d.reduction);
   if(d.speed)addStatus(p,'speed',until,d.speed);
   if(d.haste)addStatus(p,'haste',until,d.haste);
   if(d.damageMultiplier)addStatus(p,'power',until,d.damageMultiplier);
   if(d.shield){const bonus=p.mbti==='ISFJ'?Math.min(.3,m.received.filter(t=>now-t<=ticks(2)).length*.1):0;this.shield(p,d.shield*(1+bonus),d.duration);}
   if(['adrenaline','procedure','sop','guard','escape'].includes(skill.id))addStatus(p,skill.id as 'adrenaline',until,1);
   if(skill.id==='adrenaline')this.nextSkill.set(p.id,now);
   if(skill.id==='procedure'){m.hits=0;m.target=undefined;}
   if(d.interval)this.zone(p,skill,ultimate,p,{follow:true});
  }else if(skill.primitive==='dash')this.dash(p,input.aimAngle,d.speed,d.duration);
  else {
   if(skill.id==='speech'){const group=this.room.eventId;const base=getCharacter(p.mbti).basicAttack;for(let i=0;i<d.pulses;i++){const angle=i/d.pulses*Math.PI*2;this.room.projectiles.push({id:++this.room.projectileId,ownerId:p.id,x:p.x,y:p.y,vx:Math.cos(angle)*base.projectileSpeed,vy:Math.sin(angle)*base.projectileSpeed,expiresTick:now+ticks(1.6),damage:d.damage,radius:8,knockback:d.knockback,source:'skill',canPenetrateObstacle:skill.canPenetrateObstacle,noEnergy:true,hitGroup:group,hitCap:d.hitCap});}return;}
   if(skill.id==='prediction'){for(const t of this.nearby(p,d.range).slice(0,d.maxTargets)){const input=this.room.inputs.get(t.id)?.input;const predicted=this.point(t,{...input!,aimAngle:0,targetX:t.x+(input?.moveX||0)*t.moveSpeed*d.lead,targetY:t.y+(input?.moveY||0)*t.moveSpeed*d.lead},300);this.zone(p,skill,true,predicted,{targetId:t.id});}return;}
   if(skill.id==='judgment'){const target=m.mark&&this.room.players.get(m.mark.id);if(target)this.zone(p,skill,true,target);return;}
   let damage=d.damage;if(skill.id==='emotion'){damage=Math.min(d.damageCap,d.damage+(p.maxHp-p.hp)*d.missingHp+p.grievance*d.grievance);p.grievance=0;}
   this.zone(p,{...skill,params:{...d,damage}},ultimate,skill.aimMode==='position'?this.point(p,input,d.range):p);
  }
 }
 private chicken(p:Player,damage:number,radius:number,duration:number,speed:number,ultimate:boolean){this.room.zones=this.room.zones.filter(z=>z.ownerId!==p.id||z.kind!=='chicken');this.zone(p,{id:'chicken',name:'小鸡',description:'',cooldown:0,aimMode:'none',primitive:'zone',params:{duration,interval:duration,radius,damage,knockback:220}},ultimate,p,{speed,nextPulseTick:this.room.tick+ticks(duration),pulsesLeft:1});}
 basic(p:Player,base:AttackDefinition){const d=getCharacter(p.mbti),m=this.memory(p.id);let damage=base.damage;
  if(d.trait.id==='overthinking'&&this.room.tick-p.lastAttackTick>=ticks(d.trait.params.idle))damage*=d.trait.params.damage;
  if(status(p,'escape')){damage*=d.skill.params.nextDamage;p.statuses=p.statuses.filter(s=>s.id!=='escape');}
  const art=this.room.zones.some(z=>z.kind==='art'&&z.ownerId===p.id&&z.endTick>this.room.tick&&Math.hypot(p.x-z.x,p.y-z.y)<=z.radius);
  return {...base,damage,cooldownMs:base.cooldownMs/(status(p,'haste')?.strength||1),projectileSpeed:base.projectileSpeed*(status(p,'sop')?d.ultimate.params.projectileSpeed:1),projectileRadius:base.projectileRadius+(status(p,'sop')?2:0),meleeRange:base.meleeRange*(art?d.ultimate.params.rangeMultiplier:1)};
 }
 damageMultiplier(p:Player,target:Player,damage:number,source:string){const d=getCharacter(p.mbti),m=this.memory(p.id);let multiplier=status(p,'power')?.strength||1;
  if(m.mark?.id===target.id&&m.mark.until>this.room.tick)multiplier*=d.skill.params.damageMultiplier;
  if(source==='basic'&&status(p,'procedure'))multiplier*=1+(m.target===target.id?Math.min(m.hits,d.skill.params.stackCap):0)*d.skill.params.perStack;
  return damage*multiplier;
 }
 onDamage(p:Player,target:Player,actual:number,source:string,gainEnergy:boolean){const now=this.room.tick,m=this.memory(p.id),def=getCharacter(p.mbti),victim=this.memory(target.id);victim.received=victim.received.filter(t=>now-t<=ticks(2));victim.received.push(now);victim.received=victim.received.slice(-12);
  if(actual>0){
   if(m.mark?.id===target.id&&m.mark.until>now){m.mark.until=Math.min(m.mark.maxUntil,m.mark.until+ticks(def.trait.params.extension||0));const mark=target.statuses.find(s=>s.id==='mark'&&s.sourceId===p.id);if(mark)mark.untilTick=m.mark.until;}
   if(source==='basic'&&def.trait.id==='consistency'){if(m.target!==target.id){m.target=target.id;m.hits=0;}m.hits++;if(m.hits%def.trait.params.hits===0&&gainEnergy)this.energy(p,def.trait.params.energy);}
   if(source==='turret'&&def.trait.id==='tinkerer'){if(now-m.refundTick>=NET.tickRate){m.refundTick=now;m.refund=0;}const refund=Math.min(def.trait.params.refund,def.trait.params.perSecondCap-m.refund);m.refund+=refund;this.nextSkill.set(p.id,Math.max(now,(this.nextSkill.get(p.id)||0)-refund*NET.tickRate));}
   if(gainEnergy&&def.trait.id==='social')this.energy(p,actual*Math.min(def.trait.params.nearbyCap,this.nearby(p,def.trait.params.radius).length)*def.trait.params.perNearby);
  }
  if(target.alive&&status(target,'guard')&&source==='basic'&&getCharacter(p.mbti).basicAttack.kind==='melee'&&now>=victim.counterAt&&Math.hypot(p.x-target.x,p.y-target.y)<=160){const data=getCharacter(target.mbti).skill.params;victim.counterAt=now+ticks(data.counterInterval);this.room.damage(target,p,data.counterDamage,0,0,true,'counter');}
 }
 multiBonus(p:Player,count:number,ultimate:boolean){const t=getCharacter(p.mbti).trait;if(t.id==='spotlight'&&!ultimate&&count>1)this.energy(p,Math.min(t.params.cap,(count-1)*t.params.perExtra));}
 afterMove(p:Player,before:{x:number;y:number}){
  if(!p.alive||!p.dashSpeed)return;const hits=this.dashHits.get(p.id);if(!hits)return;
  const d=getCharacter(p.mbti).skill.params,dx=p.x-before.x,dy=p.y-before.y,m=this.memory(p.id);if(Math.hypot(dx,dy)<1)p.dashSpeed=0;
  for(const target of this.room.players.values()){
   if(!target.alive||target.id===p.id||hits.has(target.id))continue;const t=Math.max(0,Math.min(1,((target.x-before.x)*dx+(target.y-before.y)*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(target.x-before.x-dx*t,target.y-before.y-dy*t)>46||!this.visible(p,target))continue;
   hits.add(target.id);if(p.mbti==='ESTP'){this.room.damage(p,target,d.damage,Math.cos(p.dashAngle)*d.knockback,Math.sin(p.dashAngle)*d.knockback,true,'skill');if(!m.dashRefunded){m.dashRefunded=true;this.nextSkill.set(p.id,Math.max(this.room.tick,(this.nextSkill.get(p.id)||0)-ticks(m.dashCooldown*getCharacter(p.mbti).trait.params.refund)));}}
  }
 }
 zones(){
  for(const zone of [...this.room.zones]){
   const owner=this.room.players.get(zone.ownerId);if(!owner?.alive){zone.endTick=this.room.tick;continue;}
   if(zone.follow){zone.x=owner.x;zone.y=owner.y;}
   if(zone.kind==='chicken'&&zone.pulsesLeft>0){const target=this.nearby(zone,2000).filter(p=>p.id!==owner.id).sort((a,b)=>Math.hypot(a.x-zone.x,a.y-zone.y)-Math.hypot(b.x-zone.x,b.y-zone.y))[0];if(target){const angle=Math.atan2(target.y-zone.y,target.x-zone.x),step=(zone.speed||250)/NET.tickRate,x=zone.x+Math.cos(angle)*step,y=zone.y+Math.sin(angle)*step;if(!blocked(x,y,12,this.room.map.walls)){zone.x=x;zone.y=y;}if(Math.hypot(target.x-zone.x,target.y-zone.y)<zone.radius)zone.nextPulseTick=this.room.tick;}}
   if((zone.kind==='turret'||zone.kind==='mega')&&this.room.tick>=zone.endTick){if(zone.finalDamage&&!zone.finalFired){zone.finalFired=true;for(const t of this.nearby(zone,zone.finalRadius||140).filter(t=>t.id!==owner.id&&this.visible(zone,t)))this.room.damage(owner,t,zone.finalDamage,0,0,false,'ultimate');}continue;}
   if(zone.pulsesLeft<=0||this.room.tick<zone.nextPulseTick||this.room.tick>zone.endTick)continue;
   if(zone.kind==='turret'||zone.kind==='mega'){
    const target=this.nearby(zone,zone.radius).filter(t=>t.id!==owner.id&&this.visible(zone,t)).sort((a,b)=>Math.hypot(a.x-zone.x,a.y-zone.y)-Math.hypot(b.x-zone.x,b.y-zone.y))[0];
    if(target){const angle=Math.atan2(target.y-zone.y,target.x-zone.x),speed=getCharacter(owner.mbti)[zone.ultimate?'ultimate':'skill'].params.projectileSpeed;this.room.projectiles.push({id:++this.room.projectileId,ownerId:owner.id,x:zone.x,y:zone.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,expiresTick:this.room.tick+ticks(1.3),damage:zone.damage,radius:5,knockback:70,source:'skill',canPenetrateObstacle:getCharacter(owner.mbti)[zone.ultimate?'ultimate':'skill'].canPenetrateObstacle,turret:true,noEnergy:zone.ultimate});}
   }else{
    let count=0;
    for(const target of this.room.players.values()){
     if(!target.alive||target.id===owner.id||Math.hypot(target.x-zone.x,target.y-zone.y)>zone.radius||(zone.targetId&&zone.targetId!==target.id))continue;
     if(['chess','art'].includes(zone.kind))continue;
     if(zone.kind==='thinking'){addStatus(target,'confusion',this.room.tick+ticks(.4),getCharacter(owner.mbti).ultimate.params.confusion);continue;}
     const angle=Math.atan2(target.y-zone.y,target.x-zone.x);this.room.damage(owner,target,zone.damage,Math.cos(angle)*zone.knockback,Math.sin(angle)*zone.knockback,!zone.ultimate,zone.ultimate?'ultimate':'skill');count++;
     if(target.alive&&zone.slow)addStatus(target,'slow',this.room.tick+ticks(zone.slowDuration||2),zone.slow);
    }
    const trait=getCharacter(owner.mbti).trait;if(trait.id==='schedule'&&zone.kind==='deadline'&&count>=trait.params.minTargets)this.nextSkill.set(owner.id,Math.max(this.room.tick,(this.nextSkill.get(owner.id)||0)-ticks(Math.min(trait.params.refundCap,(count-1)*trait.params.refund))));
   }
   zone.pulsesLeft--;zone.nextPulseTick+=zone.intervalTicks;
  }
  this.room.zones=this.room.zones.filter(z=>z.endTick>this.room.tick);
 }
}
