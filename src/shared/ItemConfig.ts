export type PickupType='heart'|'sniper'|'skates';
export const ITEM_CONFIG={firstSpawnMs:5000,groundLifeMs:15000,pickupRadius:32,spawnClearance:32,spawnSafeDistance:105,minPickupDistance:70,maxPlacementAttempts:30,maxAimTurnPerSecond:Math.PI*6,sniperRange:1600,playerRadius:24,
 heart:{weight:35,heal:.3,symbol:'♥',color:0xe991a7,name:'小心心'},sniper:{weight:10,durationMs:10000,chargeMs:300,symbol:'⌖',color:0xce7378,name:'狙击枪'},skates:{weight:30,durationMs:8000,speed:1.8,symbol:'⛸️',color:0x80b5c9,name:'溜冰鞋'},
 tiers:[{maxPlayers:2,cap:2,count:[1,1],intervalMs:[15000,20000]},{maxPlayers:8,cap:4,count:[1,2],intervalMs:[12000,18000]},{maxPlayers:16,cap:6,count:[2,3],intervalMs:[10000,15000]}]};
export interface WorldPickup {pickupId:string;type:PickupType;x:number;y:number;spawnAt:number;expireAt:number}
export interface PlayerItemState {activeWeapon:null|{type:'sniper';ammo:1;expiresAt:number;phase:'aiming'|'charging';chargeEndAt?:number};buffs:{skatesExpiresAt:number|null}}
export const emptyItems=():PlayerItemState=>({activeWeapon:null,buffs:{skatesExpiresAt:null}});
