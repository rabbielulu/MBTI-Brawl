import type Phaser from 'phaser';
/** Geometry is presentation only. Never used for hitboxes or collision queries. */
export class GeometryVfx {
 readonly ground:Phaser.GameObjects.Graphics;readonly impact:Phaser.GameObjects.Graphics;
 constructor(scene:Phaser.Scene){this.ground=scene.add.graphics().setDepth(5);this.impact=scene.add.graphics().setDepth(40);}
 begin(){this.ground.clear();this.impact.clear();}
 impactRing(x:number,y:number,radius:number,p:number,color:number){this.impact.lineStyle(4,color,1-p);this.impact.strokeCircle(x,y,radius*(.35+.65*p));}
 shockwave(x:number,y:number,radius:number,p:number,color:number){for(let i=0;i<3;i++){const t=(p+i/3)%1;this.impact.lineStyle(5-i,color,(1-t)*.65);this.impact.strokeCircle(x,y,radius*t);}}
 trail(x:number,y:number,angle:number,length:number,color:number){for(let i=0;i<3;i++){const offset=(i-1)*9;this.impact.lineStyle(5-i,color,.25-i*.05);this.impact.lineBetween(x-Math.cos(angle)*18-Math.sin(angle)*offset,y-Math.sin(angle)*18+Math.cos(angle)*offset,x-Math.cos(angle)*length-Math.sin(angle)*offset,y-Math.sin(angle)*length+Math.cos(angle)*offset);}}
 warningCircle(x:number,y:number,radius:number,progress:number,color:number){this.ground.fillStyle(color,.08+.06*Math.sin(progress*Math.PI));this.ground.fillCircle(x,y,radius);this.ground.lineStyle(3,color,.7);this.ground.strokeCircle(x,y,radius);this.ground.lineStyle(6,color,.75);this.ground.beginPath();this.ground.arc(x,y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress,false);this.ground.strokePath();}
 aimLine(x:number,y:number,angle:number,length:number,color:number){const endX=x+Math.cos(angle)*length,endY=y+Math.sin(angle)*length;this.ground.lineStyle(2,color,.4);this.ground.lineBetween(x+Math.cos(angle)*45,y+Math.sin(angle)*45,endX,endY);this.ground.lineBetween(endX,endY,endX-Math.cos(angle-.5)*13,endY-Math.sin(angle-.5)*13);this.ground.lineBetween(endX,endY,endX-Math.cos(angle+.5)*13,endY-Math.sin(angle+.5)*13);}
}
