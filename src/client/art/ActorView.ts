import type Phaser from 'phaser';
import {characterFace} from '../presentation/CharacterFace';
/** Local pose deformation never writes to a simulation position or collider. */
export class ActorView {
 readonly g:Phaser.GameObjects.Graphics;
 constructor(scene:Phaser.Scene,readonly role='ENTP',readonly ink=0xb0a3d8){this.g=scene.add.graphics().setDepth(12);}
 draw(x:number,y:number,time:number,charge:number,hitAge:number,shadow:number,moving=false){const g=this.g;g.clear();g.fillStyle(0x030611,shadow*.75);g.fillEllipse(x,y+40,67,20);g.fillStyle(0x030611,shadow*.35);g.fillEllipse(x,y+43,88,26);
  const hit=hitAge>=0&&hitAge<.14,squash=hitAge>=0&&hitAge<.23?Math.sin(hitAge/.23*Math.PI):0,sx=1+.12*squash+.08*charge,sy=1-.16*squash-.12*charge,breathe=Math.sin(time*2)*1.4,lean=moving?Math.sin(time*9)*4:0;
  const tx=(px:number)=>x+px*sx+lean,ty=(py:number)=>y+40+(py-40)*sy+breathe;
  const stroke=hit?0xffffff:this.ink;g.lineStyle(6,stroke,1);
  for(const [ax,ay,bx,by] of [[0,-3,0,17],[0,17,-17,39],[0,17,16,39],[0,3,-23,15],[0,3,24,-8]])g.lineBetween(tx(ax),ty(ay),tx(bx),ty(by));
  for(const s of characterFace(this.role)){if(s.fill!==undefined)g.fillStyle(hit?0xffffff:s.fill);if(s.stroke!==undefined)g.lineStyle(s.width||1,hit?0xffffff:s.stroke);if(s.kind==='ellipse'){if(s.fill!==undefined)g.fillEllipse(tx(s.x),ty(s.y-24),s.w*sx,s.h*sy);if(s.stroke!==undefined)g.strokeEllipse(tx(s.x),ty(s.y-24),s.w*sx,s.h*sy);}else{const points=s.points.map(p=>({x:tx(p.x),y:ty(p.y-24)}));if(s.fill!==undefined)g.fillPoints(points,true);if(s.stroke!==undefined)g.strokePoints(points,s.kind==='polygon');}}
 }
}
