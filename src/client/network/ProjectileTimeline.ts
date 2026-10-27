import {NET} from '../../shared/GameConstants';
import type {GameSnapshot,NetworkProjectile} from '../../shared/NetworkProtocol';
/** Presentation clock only. Authority owns hits/removal; packets never reset each frame's clock. */
export class ProjectileTimeline {
 private snapshot?:Pick<GameSnapshot,'round'|'tick'|'projectiles'>;
 private firstSeenTick=new Map<number,number>();
 private receivedAt=0;private frameAt?:number;private renderTick=0;
 clear(){this.snapshot=undefined;this.frameAt=undefined;this.renderTick=0;this.firstSeenTick.clear();}
 receive(snapshot:Pick<GameSnapshot,'round'|'tick'|'projectiles'>,now:number){
  const reset=!this.snapshot||snapshot.round!==this.snapshot.round;
  if(!reset&&snapshot.tick<this.snapshot!.tick)return;
  if(reset)this.firstSeenTick.clear();
  const present=new Set(snapshot.projectiles.map(p=>p.id));
  for(const id of this.firstSeenTick.keys())if(!present.has(id))this.firstSeenTick.delete(id);
  for(const p of snapshot.projectiles)if(!this.firstSeenTick.has(p.id))this.firstSeenTick.set(p.id,snapshot.tick);
  this.snapshot=snapshot;this.receivedAt=now;
  if(reset){this.renderTick=snapshot.tick;this.frameAt=now;}
 }
 sample(now:number):NetworkProjectile[]{
  const snapshot=this.snapshot;if(!snapshot)return [];
  const elapsed=Math.max(0,(now-(this.frameAt??now))/1000);this.frameAt=now;
  // Short dead reckoning tolerates a late packet, but stops after 100ms without authority.
  const desired=snapshot.tick+Math.min(.1,Math.max(0,(now-this.receivedAt)/1000))*NET.tickRate;
  if(elapsed>.25||Math.abs(desired-this.renderTick)>NET.tickRate*.25)this.renderTick=desired;
  else {
   this.renderTick+=elapsed*NET.tickRate;
   const maxCorrection=elapsed*NET.tickRate*.1;
   this.renderTick+=Math.max(-maxCorrection,Math.min(maxCorrection,desired-this.renderTick));
   this.renderTick=Math.min(this.renderTick,snapshot.tick+NET.tickRate*.1);
  }
  // Negative age is intentional: an existing linear projectile must remain on the same
  // trajectory when a new anchor arrives slightly ahead of the presentation clock.
  return snapshot.projectiles.filter(p=>p.expiresTick>this.renderTick).map(p=>{
   // A just-observed shot must not be back-projected behind its spawn during jitter.
   const age=(Math.max(this.renderTick,this.firstSeenTick.get(p.id)??snapshot.tick)-snapshot.tick)/NET.tickRate;
   return {...p,x:p.x+p.vx*age,y:p.y+p.vy*age};
  });
 }
}
