export interface AttackDefinition {
  canDamageCover?:boolean;coverDamageMultiplier?:number;canPenetrateCover?:boolean;canPenetrateObstacle?:boolean;
  kind:'ranged'|'melee'; damage:number; cooldownMs:number; knockback:number;
  projectileSpeed:number; projectileRadius:number; lifetimeMs:number;
  meleeRange:number; meleeArc:number;
}
export type CombatEvent =
 | {type:'item';id:number;round:number;tick:number;action:'spawn'|'picked'|'expired'|'shield-broken';x:number;y:number;pickupType:import('../ItemConfig').PickupType;playerId?:string;pickupId?:string}
 | {type:'sniper';id:number;round:number;tick:number;attackerId:string;x:number;y:number;endX:number;endY:number;targetId?:string;result:'miss'|'shield'|'kill'}

 | {type:'cover';id:number;round:number;tick:number;attackerId:string;coverId:string;x:number;y:number;damage:number;hp:number;destroyed:boolean}

 | {type:'cast';id:number;round:number;tick:number;attackerId:string;x:number;y:number;skillId:string;ultimate:boolean;radius:number}

 | {type:'attack';id:number;round:number;tick:number;attackerId:string;x:number;y:number;aimAngle:number;kind:AttackDefinition['kind']}
 | {type:'damage';source?:'environment';id:number;round:number;tick:number;attackerId:string;targetId:string;x:number;y:number;damage:number;knockbackX:number;knockbackY:number}
 | {type:'death';source?:'environment';id:number;round:number;tick:number;attackerId:string;targetId:string;x:number;y:number};
export type DamageEvent=Extract<CombatEvent,{type:'damage'}>;
