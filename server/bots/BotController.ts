import type {GameRoom} from '../GameRoom';
import {blocked} from '../../src/rules';
import {getCharacter} from '../../src/shared/characters/CharacterDatabase';
import type {NetworkPlayerState} from '../../src/shared/NetworkProtocol';
type Point={x:number;y:number};
/** Bots issue the same input commands as humans; damage/cooldowns remain in GameRoom. */
export class BotController {
 private seq=new Map<string,number>();private grid:Point[]=[];private edges:number[][]=[];
 constructor(private game:GameRoom,private ids:ReadonlySet<string>){
  if(!ids.size)return;
  for(let y=110;y<=860;y+=50)for(let x=100;x<=1300;x+=50)if(!blocked(x,y,29,game.map.walls))this.grid.push({x,y});
  this.edges=this.grid.map(a=>this.grid.flatMap((b,index)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===50&&this.clear(a,b,29)?[index]:[]));
 }
 private clear(a:Point,b:Point,radius:number){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/15));for(let i=0;i<=steps;i++)if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,radius,this.game.map.walls))return false;return true;}
 private waypoint(from:Point,to:Point):Point {
  if(this.clear(from,to,29))return to;
  const nearest=(p:Point)=>{let best=-1,distance=Infinity;for(let i=0;i<this.grid.length;i++){const node=this.grid[i],d=Math.hypot(node.x-p.x,node.y-p.y);if(d<distance&&this.clear(p,node,29)){best=i;distance=d;}}return best;};
  const start=nearest(from),end=nearest(to);if(start<0||end<0)return from;
  if(Math.hypot(this.grid[start].x-from.x,this.grid[start].y-from.y)>30)return this.grid[start];
  const queue=[start],previous=new Map<number,number>([[start,-1]]);
  for(let head=0;head<queue.length&&!previous.has(end);head++)for(const next of this.edges[queue[head]])if(!previous.has(next)){previous.set(next,queue[head]);queue.push(next);}
  if(!previous.has(end))return from;
  let next=end;while(previous.get(next)!>=0&&previous.get(next)!==start)next=previous.get(next)!;
  return this.grid[next];
 }
 update(){
  if(this.game.tick%5!==0)return;
  for(const id of this.ids){
   const self=this.game.players.get(id);if(!self?.alive)continue;
   const target=[...this.game.players.values()].filter(p=>p.alive&&p.id!==id).sort((a,b)=>Math.hypot(a.x-self.x,a.y-self.y)-Math.hypot(b.x-self.x,b.y-self.y))[0];
   if(!target)continue;this.think(self,target);
  }
 }
 private think(self:NetworkPlayerState,target:NetworkPlayerState){
  const kit=getCharacter(self.mbti),distance=Math.hypot(target.x-self.x,target.y-self.y),aim=Math.atan2(target.y-self.y,target.x-self.x);
  const melee=kit.basicAttack.kind==='melee',preferred=melee?55:240;
  const sight=this.clear(self,target,5);let goal:Point=target;
  if(sight&&distance<preferred+40){const angle=aim+(distance<preferred-45?Math.PI:Math.PI/2*(self.id.charCodeAt(0)%2?1:-1));goal={x:self.x+Math.cos(angle)*90,y:self.y+Math.sin(angle)*90};if(blocked(goal.x,goal.y,29,this.game.map.walls))goal=target;}
  const next=this.waypoint(self,goal),dx=next.x-self.x,dy=next.y-self.y,length=Math.hypot(dx,dy);
  const canAttack=this.game.combatEnabled&&sight;
  const basicRange=melee?kit.basicAttack.meleeRange:kit.basicAttack.projectileSpeed*kit.basicAttack.lifetimeMs/1000*.9;
  const skillRange=kit.skill.params.range||(kit.skill.primitive==='dash'?360:500);
  const skill=kit.skill.primitive==='buff'?self.hp<self.maxHp*.8&&distance<350:distance<=skillRange;
  const ultRange=kit.ultimate.params.range||kit.ultimate.params.radius||360;
  this.game.input(self.id,{seq:(this.seq.get(self.id)||0)+1,moveX:length>8?dx/length:0,moveY:length>8?dy/length:0,aimAngle:aim,basicAttackPressed:canAttack&&distance<basicRange,skillPressed:canAttack&&skill&&self.skillCooldownRemaining<=0,ultimatePressed:canAttack&&distance<=ultRange&&self.personality>=self.personalityMax,targetX:target.x,targetY:target.y});
  this.seq.set(self.id,(this.seq.get(self.id)||0)+1);
 }
}
