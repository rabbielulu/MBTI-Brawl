import {TERRAIN_CONFIG as C} from './TerrainConfig';
export type Point={x:number;y:number};
export const SPAWN_POINTS:Point[]=Array.from({length:8},(_,i)=>{const a=-Math.PI/2+i*Math.PI/4,b=C.bounds;return {x:(b.left+b.right)/2+Math.cos(a)*490,y:(b.top+b.bottom)/2+Math.sin(a)*285};});
export class SpawnManager {
 static select(count:number):Point[]{
  if(count<1)return [];
  // Ring sampling keeps low-player matches separated; deterministic, no adjacent random picks.
  if(count<=8)return Array.from({length:count},(_,i)=>({...SPAWN_POINTS[Math.floor(i*8/count)]}));
  const b=C.bounds;return Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i/count*Math.PI*2;return {x:(b.left+b.right)/2+Math.cos(a)*490,y:(b.top+b.bottom)/2+Math.sin(a)*285};});
 }
}
