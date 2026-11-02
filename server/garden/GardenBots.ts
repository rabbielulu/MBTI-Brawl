import {randomUUID} from 'node:crypto';
import {GardenWorld} from '../../src/shared/garden/GardenWorld';
import {GARDEN as C,gardenInput} from '../../src/shared/garden/GardenConfig';
/** Opt-in test companions. They never grab or escape without the tester's input. */
export class GardenBots {
 private bots=new Map<string,{owner:string;kind:number;nextWave:number;anchorX:number;anchorY:number}>();
 constructor(private world:GardenWorld){}
 add(owner:string){
  const player=this.world.players.get(owner);if(!player)return 0;
  if([...this.bots.values()].some(b=>b.owner===owner))return 0;
  const types=['INFP','ENFP','ISTJ'],names=['站站·机器人','散步·机器人','躺躺·机器人'];let count=0;
  for(let kind=0;kind<3;kind++){
   const id=`garden-bot-${randomUUID()}`,p=this.world.add(id,names[kind],types[kind]);if(!p)break;
   p.x=Math.max(C.margin,Math.min(C.width-C.margin,player.x+(kind-1)*100));p.y=Math.max(C.minY,Math.min(C.maxY,player.y+80));
   this.bots.set(id,{owner,kind,nextWave:this.world.time+2,anchorX:p.x,anchorY:p.y});count++;
  }return count;
 }
 remove(owner:string){for(const [id,b] of this.bots)if(b.owner===owner){this.world.remove(id);this.bots.delete(id);}}
 step(){for(const [id,b] of this.bots){
  const p=this.world.players.get(id);if(!p)continue;
  if(p.carriedBy||p.carrying||p.thrown||this.world.time<p.landedUntil)continue;
  const input=gardenInput();
  // Leave a still target for selecting and holding, plus a relaxed lying target.
  if(b.kind===1&&!p.holdParent&&!p.holdChild){
   const targetX=b.anchorX+Math.sin(this.world.time*.35)*45,targetY=b.anchorY+Math.cos(this.world.time*.35)*20;
   if(Math.hypot(targetX-p.x,targetY-p.y)>8){input.x=(targetX-p.x)/C.GardenMoveSpeed;input.y=(targetY-p.y)/C.GardenMoveSpeed;}
  }
  if(b.kind!==2&&this.world.time>=b.nextWave){input.wave=true;b.nextWave=this.world.time+7;}
  if(b.kind===2)p.idle=Math.max(p.idle,C.IdleToLyingTime+1);
  this.world.input(id,input);
 }}
}
