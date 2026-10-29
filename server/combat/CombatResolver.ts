import type { NetworkPlayerState,MapDefinition } from '../../src/shared/NetworkProtocol';
import type { AttackDefinition } from '../../src/shared/combat/CombatTypes';
import { blocked } from '../../src/rules';
import { NET } from '../../src/shared/GameConstants';
import {getCharacter} from '../../src/shared/characters/CharacterDatabase';
import {status} from './StatusEffects';
export function meleeTargets(attacker:NetworkPlayerState,players:Iterable<NetworkPlayerState>,attack:AttackDefinition,map:MapDefinition) {
 return [...players].filter(p=>{
  if(!p.alive||p.id===attacker.id)return false;
  const dx=p.x-attacker.x,dy=p.y-attacker.y,distance=Math.hypot(dx,dy);
  const angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-attacker.aimAngle),Math.cos(Math.atan2(dy,dx)-attacker.aimAngle));
  if(distance>attack.meleeRange+20||Math.abs(angle)>attack.meleeArc/2)return false;
  for(let i=1;i<=Math.ceil(distance/8);i++){const t=i/Math.ceil(distance/8);if(!(attack.canPenetrateCover??attack.canPenetrateObstacle)&&blocked(attacker.x+dx*t,attacker.y+dy*t,2,map.walls))return false;}
  return true;
 });
}
export function applyDamage(attacker:NetworkPlayerState,target:NetworkPlayerState,damage:number,knockbackX:number,knockbackY:number,gainEnergy=true,environment=false) {
 if(!target.alive||(!environment&&attacker.id===target.id))return 0;
 const vulnerable=status(target,'vulnerable')?.strength||1,reduction=status(target,'reduction')?.strength||1;
 const mitigated=Math.max(0,environment?damage:Math.round(damage*vulnerable*reduction)),absorbed=Math.min(target.shield||0,mitigated);target.shield=Math.max(0,(target.shield||0)-absorbed);const actual=Math.min(target.hp,mitigated-absorbed);target.hp=Math.max(0,target.hp-actual);if(target.hp<1e-7)target.hp=0;
 if(!environment&&status(target,'reduction')&&target.mbti==='INFP')target.grievance=Math.min(getCharacter(target.mbti).skill.params.grievanceMax,target.grievance+actual);
 const trait=getCharacter(attacker.mbti).trait;
 if(gainEnergy)attacker.personality=Math.min(attacker.personalityMax,attacker.personality+actual*(trait.id==='debate'&&target.statuses.some(s=>['vulnerable','slow','mark','confusion','forced'].includes(s.id))?trait.params.energyMultiplier:trait.id==='sensitive'&&attacker.hp/attacker.maxHp<trait.params.hpThreshold?1+trait.params.maxEnergyBonus:1));
 target.velocityX+=knockbackX;target.velocityY+=knockbackY;
 const speed=Math.hypot(target.velocityX,target.velocityY);
 if(speed>NET.maxKnockback){target.velocityX*=NET.maxKnockback/speed;target.velocityY*=NET.maxKnockback/speed;}
 if(target.hp===0){target.alive=false;target.movementState='idle';target.velocityX=0;target.velocityY=0;}
 return actual;
}
