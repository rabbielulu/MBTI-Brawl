import type { Wall } from './rules';

export type Mud = { x: number; y: number; rx: number; ry: number; points: {x:number;y:number}[] };
export const MUD_SPEED = 0.5;
export const SPAWNS = [{x:700,y:710},{x:300,y:340},{x:1100,y:340},{x:330,y:660},{x:1080,y:660}];
const nearSpawn = (w: Wall) => SPAWNS.some(p => p.x > w.x-85 && p.x < w.x+w.w+85 && p.y > w.y-85 && p.y < w.y+w.h+85);
const overlap = (a: Wall,b: Wall,pad=0) => a.x < b.x+b.w+pad && a.x+a.w+pad > b.x && a.y < b.y+b.h+pad && a.y+a.h+pad > b.y;
function shuffled<T>(items:T[], random:()=>number):T[] {
  for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
  return items;
}
/** Spaced candidate cells guarantee five obstacles without rejection loops. */
export function generateTerrain(random:()=>number=Math.random): {walls:Wall[]; mud:Mud[]} {
  const candidates:Wall[]=[];
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){
    const w={x:125+col*210+random()*30,y:210+row*165+random()*25,w:95+random()*25,h:50+random()*15};
    if(!nearSpawn(w))candidates.push(w);
  }
  const walls=shuffled(candidates,random).slice(0,5);
  const mud:Mud[]=[];
  if(random()<0.75){
    const count=1+Math.floor(random()*3);
    const pools: Mud[]=[];
    for(let i=0;i<100;i++){
      const x=210+random()*980,y=260+random()*510,rx=110+random()*20,ry=70+random()*15;
      const phaseA=random()*Math.PI*2,phaseB=random()*Math.PI*2;
      const points=Array.from({length:48},(_,index)=>{
        const angle=index/48*Math.PI*2;
        const radius=.83+.11*Math.sin(3*angle+phaseA)+.06*Math.cos(5*angle+phaseB);
        return {x:x+Math.cos(angle)*rx*radius,y:y+Math.sin(angle)*ry*radius};
      });
      pools.push({x,y,rx,ry,points});
    }
    for(const pool of shuffled(pools,random)){
      const box={x:pool.x-pool.rx,y:pool.y-pool.ry,w:pool.rx*2,h:pool.ry*2};
      if(!nearSpawn(box)&&!walls.some(w=>overlap(box,w,24))&&!mud.some(p=>overlap(box,{x:p.x-p.rx,y:p.y-p.ry,w:p.rx*2,h:p.ry*2},20)))mud.push(pool);
      if(mud.length===count)break;
    }
  }
  return {walls,mud};
}
/** Ray casting against the same shoreline vertices used by the renderer. */
export function insideMud(x:number,y:number,pool:Mud):boolean {
  let inside=false;
  const points=pool.points;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
export function terrainSpeed(x:number,y:number,mud:Mud[]):number {
  return mud.some(p=>insideMud(x,y,p))?MUD_SPEED:1;
}
