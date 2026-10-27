import { blocked } from '../rules';
import { terrainSpeed } from '../terrain';
import { NET } from './GameConstants';
import type { MapDefinition, PlayerInput } from './NetworkProtocol';
export type MotionState={x:number;y:number;velocityX?:number;velocityY?:number;moveSpeed?:number;dashSpeed?:number;dashAngle?:number};
/** Shared authoritative/predicted movement; small swept steps prevent impulse tunnelling. */
export function movement(position:MotionState,input:Pick<PlayerInput,'moveX'|'moveY'>,dt:number,map:MapDefinition) {
  const divisor=Math.max(1,Math.hypot(input.moveX,input.moveY));
  const speed=(position.moveSpeed??NET.moveSpeed)*terrainSpeed(position.x,position.y,map.mud);
  let {x,y}=position;
  let velocityX=position.velocityX||0,velocityY=position.velocityY||0;
  const decay=Math.exp(-NET.knockbackDecay*dt);
  const travel=(1-decay)/NET.knockbackDecay;
  const dx=(position.dashSpeed?Math.cos(position.dashAngle||0)*position.dashSpeed:input.moveX/divisor*speed)*dt+velocityX*travel,dy=(position.dashSpeed?Math.sin(position.dashAngle||0)*position.dashSpeed:input.moveY/divisor*speed)*dt+velocityY*travel;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/10));
  let dashBlocked=false;
  for(let i=0;i<steps;i++){
    if(position.dashSpeed&&blocked(x+dx/steps,y+dy/steps,20,map.walls)){dashBlocked=true;break;}
    if(!blocked(x+dx/steps,y,20,map.walls))x+=dx/steps;else velocityX=0;
    if(!blocked(x,y+dy/steps,20,map.walls))y+=dy/steps;else velocityY=0;
  }
  return {x,y,velocityX:velocityX*decay,velocityY:velocityY*decay,...(position.dashSpeed?{dashSpeed:dashBlocked?0:position.dashSpeed}:{})};
}
