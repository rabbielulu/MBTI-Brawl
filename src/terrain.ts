import type {Wall} from './rules';
import {TERRAIN_CONFIG as C,TERRAIN_PROFILES,ENVIRONMENT_SKINS,type TerrainProfile,type SizeType} from './shared/terrain/TerrainConfig';
import {SpawnManager,SPAWN_POINTS,type Point} from './shared/terrain/SpawnManager';
export {TERRAIN_CONFIG,TERRAIN_PROFILES,ENVIRONMENT_SKINS} from './shared/terrain/TerrainConfig';
export {SpawnManager} from './shared/terrain/SpawnManager';
export type Mud={x:number;y:number;rx:number;ry:number;points:Point[];sizeType?:SizeType;skin?:string};
export type TerrainWall=Wall&{sizeType?:SizeType;skin?:string};
export type TerrainMap={walls:TerrainWall[];mud:Mud[];toxic?:Mud[];seed?:number;profile?:TerrainProfile;budget?:number;spawns?:Point[];spawnSafeRadius?:number};
export const MUD_SPEED=C.mudSpeed;
export const SPAWNS=SPAWN_POINTS;
export function seededRandom(seed:number){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function insideMud(x:number,y:number,pool:Mud):boolean {let inside=false;const points=pool.points;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function terrainSpeed(x:number,y:number,mud:Mud[]){return mud.some(p=>insideMud(x,y,p))?C.mudSpeed:1;}
const box=(p:Mud):Wall=>({x:p.x-p.rx,y:p.y-p.ry,w:p.rx*2,h:p.ry*2});
const contains=(p:Point,w:Wall,pad=0)=>p.x>w.x-pad&&p.x<w.x+w.w+pad&&p.y>w.y-pad&&p.y<w.y+w.h+pad;
/** Conservative boxes bound irregular shorelines; overlap can never exceed their admitted fraction. */
export class TerrainValidator {
 static connected(walls:Wall[],spawns:Point[]){
  const b=C.bounds,step=28,cols=Math.floor((b.right-b.left)/step)+1,rows=Math.floor((b.bottom-b.top)/step)+1;
  const free=(x:number,y:number)=>!walls.some(w=>contains({x:b.left+x*step,y:b.top+y*step},w,28));
  const start=spawns[0]||{x:700,y:480},sx=Math.round((start.x-b.left)/step),sy=Math.round((start.y-b.top)/step),queue=[[sx,sy]],seen=new Set([`${sx},${sy}`]);
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&!seen.has(k)&&free(nx,ny)){seen.add(k);queue.push([nx,ny]);}}}
  const total=Array.from({length:cols*rows},(_,i)=>free(i%cols,Math.floor(i/cols))).filter(Boolean).length;
  return seen.size>=total*.98&&spawns.every(p=>seen.has(`${Math.round((p.x-b.left)/step)},${Math.round((p.y-b.top)/step)}`));
 }
 static placement(candidate:Wall,map:TerrainMap,obstacle:boolean,cost:number,maxBudget=C.maxHazardBudget){
  const b=C.bounds;if(candidate.x<b.left+24||candidate.y<b.top+24||candidate.x+candidate.w>b.right-24||candidate.y+candidate.h>b.bottom-24||(map.budget||0)+cost>maxBudget)return false;
  if((map.spawns||SPAWNS).some(p=>Math.hypot(p.x-Math.max(candidate.x,Math.min(p.x,candidate.x+candidate.w)),p.y-Math.max(candidate.y,Math.min(p.y,candidate.y+candidate.h)))<C.spawnSafeRadius))return false;
  if(obstacle&&map.walls.some(w=>candidate.x<w.x+w.w+C.minObstacleDistance&&candidate.x+candidate.w>w.x-C.minObstacleDistance&&candidate.y<w.y+w.h+C.minObstacleDistance&&candidate.y+candidate.h>w.y-C.minObstacleDistance))return false;
  for(const other of [...map.walls,...map.mud.map(box),...(map.toxic||[]).map(box)]){const area=Math.max(0,Math.min(candidate.x+candidate.w,other.x+other.w)-Math.max(candidate.x,other.x))*Math.max(0,Math.min(candidate.y+candidate.h,other.y+other.h)-Math.max(candidate.y,other.y));if(area>Math.min(candidate.w*candidate.h,other.w*other.h)*C.maxOverlapRatio*.6)return false;}
  return !obstacle||this.connected([...map.walls,candidate],map.spawns||SPAWNS);
 }
}
export type TerrainOptions={seed?:number;profile?:TerrainProfile;playerCount?:number;maxBudget?:number;skins?:boolean};
export function generateTerrain(options:TerrainOptions|(()=>number)={}):TerrainMap {
 const opts=typeof options==='function'?{}:options,seed=opts.seed??Math.floor(Math.random()*4294967296),random=typeof options==='function'?options:seededRandom(seed),pick=(a:number,b:number)=>a+Math.floor(random()*(b-a+1));
 let roll=random()*Object.values(TERRAIN_PROFILES).reduce((n,p)=>n+p.probability,0),profile:TerrainProfile='Open';
 for(const [name,p] of Object.entries(TERRAIN_PROFILES)){roll-=p.probability;if(roll<0){profile=name as TerrainProfile;break;}}profile=opts.profile||profile;
 const map:TerrainMap={walls:[],mud:[],toxic:[],seed,profile,budget:0,spawns:SpawnManager.select(opts.playerCount??8),spawnSafeRadius:C.spawnSafeRadius},config=TERRAIN_PROFILES[profile];
 const skinRandom=seededRandom(seed^0xA5F07C31);
 const sizes:SizeType[]=['Small','Medium','Large'],b=C.bounds;
 const counts={obstacle:pick(...config.obstacle),mud:pick(...config.mud),toxic:pick(...config.toxic)};let reserve=counts.obstacle*2+counts.mud*4+counts.toxic*6;
 for(const kind of ['obstacle','mud','toxic'] as const){
  const count=counts[kind];
  for(let i=0;i<count;i++){
   reserve-=C.costs[kind].Small;
   for(let attempt=0;attempt<C.maxPlacementAttempts;attempt++){
    // Fall back to small sizes when budget or spawn clearances reject larger candidates.
    const size=attempt>(kind==='obstacle'?12:3)?'Small':sizes[pick(0,2)],cost=C.costs[kind][size];
    let w:number,h:number;
    if(kind==='obstacle'){w=C.obstacleBase.w*C.scales[size];h=C.obstacleBase.h*C.scales[size];}else{const area=(b.right-b.left)*(b.bottom-b.top)*C.areaFraction[size],rx=Math.sqrt(area/(Math.PI*.65));w=rx*2;h=rx*.65*2;}
    const candidate={x:b.left+24+random()*Math.max(0,b.right-b.left-w-48),y:b.top+24+random()*Math.max(0,b.bottom-b.top-h-48),w,h};
    if(kind!=='obstacle'){candidate.x=(b.left+b.right)/2+(random()-.5)*(b.right-b.left)*.65-w/2;candidate.y=(b.top+b.bottom)/2+(random()-.5)*(b.bottom-b.top)*.45-h/2;}
    if(!TerrainValidator.placement(candidate,map,kind==='obstacle',cost,(opts.maxBudget??C.maxHazardBudget)-reserve))continue;
    const skin=ENVIRONMENT_SKINS[kind][opts.skins?Math.floor(skinRandom()*ENVIRONMENT_SKINS[kind].length):0];
    if(kind==='obstacle')map.walls.push({...candidate,sizeType:size,skin});else{
     const x=candidate.x+w/2,y=candidate.y+h/2,rx=w/2,ry=h/2,phase=random()*Math.PI*2;
     const points=Array.from({length:48},(_,j)=>{const a=j/48*Math.PI*2,r=.93+.045*Math.sin(a*3+phase)+.025*Math.cos(a*5-phase);return {x:x+Math.cos(a)*rx*r,y:y+Math.sin(a)*ry*r};});
     map[kind]!.push({x,y,rx,ry,points,sizeType:size,skin});
    }map.budget!+=cost;break;
   }
  }
 }
 return map;
}
