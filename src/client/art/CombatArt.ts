import type Phaser from 'phaser';
import {ArenaFloor} from './ArenaFloor';
import {BurstVfx} from './BurstVfx';
import {GAME_ART_PRESET} from './GameArtPreset';
import {QUALITY_BUDGET,colorNumber,type ArtConfig,type Quality} from './ArtConfig';
import type {NetworkZone} from '../../shared/NetworkProtocol';
const delayed=new Set(['deadline','prediction','judgment','photo','bomb']);
/** Adapts authoritative presentation events; never sends inputs or mutates a snapshot. */
export class CombatArt {
 readonly config:ArtConfig={...GAME_ART_PRESET};readonly floor:ArenaFloor;readonly vfx:BurstVfx;private zones=new Map<number,NetworkZone>();
 private motion=matchMedia('(prefers-reduced-motion: reduce)');private onMotion=()=>{this.vfx.reduced=this.motion.matches;};
 constructor(private scene:Phaser.Scene){this.floor=new ArenaFloor(scene,false,true);this.floor.g.setDepth(-2);this.floor.fit(70,85,1260,790);this.floor.rebuild(this.config);this.vfx=new BurstVfx(scene,true);this.onMotion();this.motion.addEventListener('change',this.onMotion);scene.events.once('shutdown',()=>this.motion.removeEventListener('change',this.onMotion));}
 setQuality(quality:Quality){this.config.quality=quality;this.vfx.pool.setLimit(QUALITY_BUDGET[quality]);}
 clear(){this.vfx.clear();this.zones.clear();}
 skill(x:number,y:number,skillId:string,ultimate:boolean){if(delayed.has(skillId))return;this.vfx.cast(x,y,{...this.config,count:ultimate?this.config.count:Math.round(this.config.count*.65),radius:ultimate?this.config.radius:this.config.radius*.65},0);}
 cover(x:number,y:number,destroyed:boolean){for(let i=0;i<(destroyed?22:6);i++){const a=this.vfx.random()*Math.PI*2,s=50+this.vfx.random()*150;this.vfx.pool.emit({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:destroyed?.65:.25,size:destroyed?5:3,gravity:175,drag:2,color:0xa6b0d0,alpha:1});}}
 hit(x:number,y:number){const c=this.config;for(let i=0;i<(this.motion.matches?3:8);i++){const a=this.vfx.random()*Math.PI*2,speed=80+this.vfx.random()*80;this.vfx.pool.emit({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-30,life:.35,size:c.size*.45,gravity:50,drag:2,color:colorNumber(c.color),alpha:c.opacity});}}

 update(dt:number,zones:NetworkZone[],tick:number){
  const current=new Set(zones.map(z=>z.id));
  for(const zone of zones){const previous=this.zones.get(zone.id);if(previous&&delayed.has(zone.kind)&&zone.pulsesLeft<previous.pulsesLeft)this.zoneImpact(zone);this.zones.set(zone.id,{...zone});}
  for(const [id,old] of this.zones)if(!current.has(id)){if(delayed.has(old.kind)&&old.pulsesLeft>0&&tick>=old.nextPulseTick)this.zoneImpact(old);this.zones.delete(id);}
  this.vfx.update(dt);
 }
 private zoneImpact(zone:NetworkZone){this.vfx.cast(zone.x,zone.y,{...this.config,radius:Math.min(zone.radius,this.config.radius)},0);}
 draw(){this.vfx.draw();const g=this.vfx.ground;for(const zone of this.zones.values())if(delayed.has(zone.kind)&&zone.pulsesLeft>0){g.fillStyle(colorNumber(this.config.color),.08);g.fillEllipse(zone.x,zone.y,50,28);}}
 shake(ultimate=false){if(!this.motion.matches)this.scene.cameras.main.shake(ultimate?140:70,this.config.shake*(ultimate?1:.25));}
 get stats(){return {particles:this.vfx.pool.active,budget:this.vfx.pool.limit,bursts:this.vfx.bursts.length};}
}
