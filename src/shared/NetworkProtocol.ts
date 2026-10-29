import type { MBTIType } from './characters/CharacterDefinition';
import type { CombatEvent,DamageEvent } from './combat/CombatTypes';
import type { generateTerrain } from '../terrain';
export type MapDefinition = ReturnType<typeof generateTerrain>;
export interface PlayerInput { seq:number; moveX:number; moveY:number; aimAngle:number; basicAttackPressed:boolean; skillPressed:boolean; ultimatePressed:boolean; targetX?:number; targetY?:number }
export interface NetworkPlayerState { id:string; nickname:string; mbti:MBTIType; x:number; y:number; aimAngle:number; movementState:'idle'|'walk'; hp:number; lastAttackTick:number; maxHp:number; alive:boolean; personality:number; personalityMax:number; velocityX:number; velocityY:number; lastAckSeq:number; basicAttackCooldownRemaining:number; skillCooldownRemaining:number; grievance:number; moveSpeed:number; dashSpeed:number; dashAngle:number; dashUntilTick:number; statuses:StatusEffect[];shield?:number }
export interface NetworkProjectile { canDamageCover?:boolean;coverDamageMultiplier?:number;canPenetrateCover?:boolean;canPenetrateObstacle?:boolean; id:number; ownerId:string; x:number; y:number; vx:number; vy:number; expiresTick:number; damage:number; radius:number; knockback:number; source:'basic'|'skill'; debuffDuration?:number;debuffStrength?:number;noEnergy?:boolean;turret?:boolean;explosive?:boolean;wobble?:number;angle?:number;baseSpeed?:number;hitGroup?:number;hitCap?:number }
export type NetworkHit=DamageEvent;
export interface StatusEffect {id:'vulnerable'|'reduction'|'slow'|'adrenaline'|'speed'|'haste'|'power'|'thinking'|'confusion'|'forced'|'procedure'|'sop'|'guard'|'escape'|'explosive'|'shield'|'mark';untilTick:number;strength:number;sourceId?:string;angle?:number}
export interface NetworkZone {canDamageCover?:boolean;coverDamageMultiplier?:number;id:number;ownerId:string;kind:string;x:number;y:number;radius:number;startTick:number;endTick:number;nextPulseTick:number;intervalTicks:number;pulsesLeft:number;damage:number;knockback:number;slow?:number;slowDuration?:number;ultimate:boolean;follow?:boolean;targetId?:string;speed?:number;finalDamage?:number;finalRadius?:number;finalFired?:boolean}
export interface GameSnapshot { covers?:import('../terrain').TerrainWall[]; round:number; tick:number; players:NetworkPlayerState[]; projectiles:NetworkProjectile[]; zones:NetworkZone[] }
export interface Welcome { protocolVersion:number; id:string; map:MapDefinition; snapshot:GameSnapshot }
export interface ServerEvents {
  welcome:(message:Welcome)=>void;
  snapshot:(message:GameSnapshot)=>void;
  combat:(events:CombatEvent[])=>void;
  rejected:(reason:string)=>void;
}
export interface ClientEvents {
  input:(message:PlayerInput)=>void;
  resetTraining:()=>void;
  ping:(reply:()=>void)=>void;
}
