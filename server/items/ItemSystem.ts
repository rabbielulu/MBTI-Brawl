import type {GameRoom} from '../GameRoom';
import type {NetworkPlayerState as Player} from '../../src/shared/NetworkProtocol';
import {ITEM_CONFIG as C,emptyItems,type WorldPickup,type PickupType} from '../../src/shared/ItemConfig';
import {blocked} from '../../src/rules';
import {insideMud,TERRAIN_CONFIG} from '../../src/terrain';
/** Server clock, bounded generation and deterministic pickup arbitration. No death drops. */
export class ItemSystem {
 pickups:WorldPickup[]=[];now=0;private nextSpawn=0;private serial=0;private active=false;private tier=C.tiers[0];private reachable=new Set<string>();
 constructor(private room:GameRoom,private random:()=>number=Math.random){}
 start(now:number,count:number){this.clear();this.now=now;this.active=true;this.tier=C.tiers.find(t=>count<=t.maxPlayers)||C.tiers[2];this.nextSpawn=now+C.firstSpawnMs;}
 clear(){this.active=false;this.pickups=[];for(const p of this.room.players.values())this.clearPlayer(p);}
 clearPlayer(p:Player){p.items=emptyItems();}
 private emit(action:'spawn'|'picked'|'expired'|'shield-broken',x:number,y:number,pickupType:PickupType,playerId?:string,pickupId?:string){this.room.events.push({type:'item',id:++this.room.eventId,round:this.room.round,tick:this.room.tick,action,x,y,pickupType,playerId,pickupId});}
 private valid(x:number,y:number){const map=this.room.map;if(blocked(x,y,C.spawnClearance,map.walls))return false;if([...map.mud,...(map.toxic||[])].some(a=>insideMud(x,y,a)||a.points.some(q=>Math.hypot(q.x-x,q.y-y)<C.spawnClearance)))return false;if((map.spawns||[]).some(p=>Math.hypot(p.x-x,p.y-y)<C.spawnSafeDistance)||this.pickups.some(p=>Math.hypot(p.x-x,p.y-y)<C.minPickupDistance))return false;const b=TERRAIN_CONFIG.bounds,step=24,gx=Math.round((x-b.left)/step),gy=Math.round((y-b.top)/step);if(!this.reachable.has(gx+','+gy))return false;const dx=b.left+gx*step-x,dy=b.top+gy*step-y;for(let i=0;i<=4;i++)if(blocked(x+dx*i/4,y+dy*i/4,20,map.walls))return false;return true;}
 private buildReachable(){
  this.reachable.clear();const b=TERRAIN_CONFIG.bounds,step=24,cols=Math.floor((b.right-b.left)/step),rows=Math.floor((b.bottom-b.top)/step),start=this.room.map.spawns?.[0]||{x:700,y:480},sx=Math.round((start.x-b.left)/step),sy=Math.round((start.y-b.top)/step),queue=[[sx,sy]];this.reachable.add(sx+','+sy);
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(nx<0||ny<0||nx>cols||ny>rows||this.reachable.has(key)||blocked(b.left+nx*step,b.top+ny*step,20,this.room.map.walls))continue;this.reachable.add(key);queue.push([nx,ny]);}}
 }
 spawn(type?:PickupType){if(!this.active||this.pickups.length>=this.tier.cap)return;
  const kinds:PickupType[]=['heart','sniper','skates'];if(type&&!kinds.includes(type))return;if(!type){let roll=this.random()*kinds.reduce((sum,k)=>sum+C[k].weight,0);type=kinds.find(k=>(roll-=C[k].weight)<0)||'heart';}
  const b=TERRAIN_CONFIG.bounds;const candidates=Array.from({length:C.maxPlacementAttempts},()=>({x:b.left+C.spawnClearance+this.random()*(b.right-b.left-C.spawnClearance*2),y:b.top+C.spawnClearance+this.random()*(b.bottom-b.top-C.spawnClearance*2)}));
  for(let y=b.top+100;y<b.bottom-60;y+=100)for(let x=b.left+100;x<b.right-60;x+=100)candidates.push({x,y});
  this.buildReachable();const point=candidates.find(p=>this.valid(p.x,p.y));if(!point)return;
  const pickup:WorldPickup={pickupId:`${this.room.round}-${++this.serial}`,type,...point,spawnAt:this.now,expireAt:this.now+C.groundLifeMs};this.pickups.push(pickup);this.emit('spawn',point.x,point.y,type,undefined,pickup.pickupId);return pickup;
 }
 acquire(p:Player,pickup:WorldPickup){if(!['heart','sniper','skates'].includes(pickup.type)||!p.alive||pickup.expireAt<=this.now||!this.pickups.includes(pickup)||Math.hypot(p.x-pickup.x,p.y-pickup.y)>=C.pickupRadius||pickup.type==='heart'&&p.hp>=p.maxHp)return false;
  p.items??=emptyItems();if(pickup.type==='heart')p.hp=Math.min(p.maxHp,p.hp+p.maxHp*C.heart.heal);
  else if(pickup.type==='sniper')p.items.activeWeapon={type:'sniper',ammo:1,expiresAt:this.now+C.sniper.durationMs,phase:'aiming'};
  else if(pickup.type==='skates')p.items.buffs.skatesExpiresAt=this.now+C.skates.durationMs;
  this.pickups.splice(this.pickups.indexOf(pickup),1);this.emit('picked',pickup.x,pickup.y,pickup.type,p.id,pickup.pickupId);return true;
 }
 tick(now:number){this.now=now;if(!this.active)return;
  for(const p of this.room.players.values()){if(!p.alive){this.clearPlayer(p);continue;}p.items??=emptyItems();const state=p.items;if((state.buffs.skatesExpiresAt||Infinity)<=now)state.buffs.skatesExpiresAt=null;if(state.activeWeapon&&state.activeWeapon.expiresAt<=now)state.activeWeapon=null;}
  for(const pickup of [...this.pickups])if(pickup.expireAt<=now){this.pickups.splice(this.pickups.indexOf(pickup),1);this.emit('expired',pickup.x,pickup.y,pickup.type,undefined,pickup.pickupId);}
  if(now>=this.nextSpawn){const [min,max]=this.tier.count,n=min+Math.floor(this.random()*(max-min+1));for(let i=0;i<n;i++)this.spawn();const [a,b]=this.tier.intervalMs;this.nextSpawn=now+a+this.random()*(b-a);}
 }
 collect(){if(!this.active)return;for(const pickup of [...this.pickups])for(const p of this.room.players.values())if(this.acquire(p,pickup))break;}
 attack(p:Player){const weapon=p.items?.activeWeapon;if(!weapon)return false;if(weapon.phase==='aiming'){weapon.phase='charging';weapon.chargeEndAt=this.now+C.sniper.chargeMs;}return true;}
 fireReady(){if(!this.active)return;for(const p of this.room.players.values()){const w=p.items?.activeWeapon;if(p.alive&&w?.phase==='charging'&&this.now>=(w.chargeEndAt||Infinity)){p.items!.activeWeapon=null;this.fire(p);}}}
 private fire(p:Player){const dx=Math.cos(p.aimAngle),dy=Math.sin(p.aimAngle);let distance=C.sniperRange;
  for(let d=0;d<=distance;d+=2)if(blocked(p.x+dx*d,p.y+dy*d,0,this.room.map.walls)){distance=d;break;}
  let target:Player|undefined;for(const other of this.room.players.values()){if(!other.alive||other.id===p.id)continue;const x=other.x-p.x,y=other.y-p.y,t=x*dx+y*dy,perp=x*x+y*y-t*t;if(t<0||perp>C.playerRadius*C.playerRadius)continue;const entry=Math.max(0,t-Math.sqrt(Math.max(0,C.playerRadius*C.playerRadius-perp)));if(entry<distance){distance=entry;target=other;}}
  const x=p.x+dx*distance,y=p.y+dy*distance;let result:'miss'|'shield'|'kill'='miss';
  if(target){this.room.damage(p,target,target.hp,0,0,false,'sniper');result=target.alive?'miss':'kill';}
  this.room.events.push({type:'sniper',id:++this.room.eventId,round:this.room.round,tick:this.room.tick,attackerId:p.id,x:p.x,y:p.y,endX:x,endY:y,targetId:target?.id,result});
 }
}
