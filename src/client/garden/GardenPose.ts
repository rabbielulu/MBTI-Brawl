import type {GardenPlayer} from '../../shared/garden/GardenConfig';
import {GARDEN} from '../../shared/garden/GardenConfig';

// Joint coordinates use the actor's 100 × 150 SVG space. Blend between poses
// so the legs open during takeoff and settle back naturally on landing.
export type GardenPose = Record<'leftArm'|'rightArm'|'leftLeg'|'rightLeg',number[]>;
export function gardenPose(player:GardenPlayer,time:number):GardenPose {
 const pose:GardenPose={leftArm:[50,82,38,92,25,101],rightArm:[50,82,62,92,75,101],leftLeg:[50,109,40,123,31,137],rightLeg:[50,109,60,123,69,137]};
 if(player.lying||player.thrown||player.carriedBy){pose.leftArm=[50,82,28,72,31,49];pose.rightArm=[50,82,71,100,50,106];}
 else if(player.sitting){
  // Cross-legged reference: low, wide knees and inward-folded feet.
  pose.leftArm=[50,79,32,94,14,109];pose.rightArm=[50,79,68,94,86,109];
  pose.leftLeg=[50,109,12,117,41,128];pose.rightLeg=[50,109,88,117,54,133];
 }
 else if(player.z>3){
  // Reference: lifted arms, a near-horizontal leading leg and a trailing leg.
  const direction=player.facing;
  pose.leftArm=[50,78,33,72,17,66];pose.rightArm=[50,78,67,72,83,66];
  pose.leftLeg=[50,109,50-21*direction,108,50-42*direction,108];
  pose.rightLeg=[50,109,50+17*direction,120,50+34*direction,132];
 }else if(player.moving){
  const stride=Math.sin(time*Math.PI/GARDEN.GardenBounceInterval);
  const leg=(side:number)=>{const swing=stride*side;return [50,109,50+swing*12,123-Math.max(0,-swing)*5,50+swing*27,137-Math.max(0,-swing)*12];};
  pose.leftLeg=leg(-1);pose.rightLeg=leg(1);
  pose.leftArm=[50,82,38-stride*4,90,27-stride*9,96];
  pose.rightArm=[50,82,62-stride*4,90,73-stride*9,96];
 }
 if(player.carrying){pose.leftArm=[50,82,28,63,19,40];pose.rightArm=[50,82,72,63,81,40];}
 if(!player.lying&&!player.carrying&&!player.carriedBy&&!player.thrown&&player.waveUntil>time){
  const wave=Math.sin(time*17);pose.rightArm=[50,82,73,67,77+wave*7,44+wave*3];
 }
 return pose;
}
export function posePath(points:number[]){return `M${points[0]} ${points[1]}L${points[2]} ${points[3]}L${points[4]} ${points[5]}`;}
