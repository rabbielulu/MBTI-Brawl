import type Phaser from 'phaser';
import {colorNumber,mix,type ArtConfig} from './ArtConfig';
/** One static Graphics layer. Regenerated only when floor controls change. */
export class ArenaFloor {
 readonly g:Phaser.GameObjects.Graphics;rebuilds=0;
 constructor(scene:Phaser.Scene,private samples=true,private plain=false){this.g=scene.add.graphics().setDepth(0);}
 fit(left:number,top:number,width:number,height:number){const sx=width/904,sy=height/552;this.g.setScale(sx,sy).setPosition(left-48*sx,top-52*sy);}
 rebuild(c:ArtConfig){this.rebuilds++;const g=this.g,b=colorNumber(c.floor);g.clear();if(this.plain){
 g.fillStyle(0xbfcfc8,.35);g.fillRoundedRect(34,49,932,590,28);g.fillStyle(b);g.fillRoundedRect(34,37,932,590,28);g.lineStyle(2,0xc2d3c9,.8);g.strokeRoundedRect(34,37,932,590,28);
 if(!this.samples)return;const pool=(x:number,y:number,color:number,edge:number)=>{const points=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2,r=1+.08*Math.sin(a*3);return {x:x+Math.cos(a)*82*r,y:y+Math.sin(a)*43*r};});g.fillStyle(color);g.fillPoints(points,true);g.lineStyle(2,edge,.8);g.strokePoints(points,true);};pool(187,470,0xf2dda5,0xc6ab70);pool(810,486,0xd1e8bd,0x91b481);
 for(const [x,y] of [[177,167],[757,153]]){g.fillStyle(0x6d8790,c.shadow*.25);g.fillEllipse(x+16,y+54,135,30);g.fillStyle(0x9cbccc);g.fillRoundedRect(x-45,y+6,110,62,8);g.fillStyle(0xcce0eb);g.fillRoundedRect(x-45,y-8,110,62,8);g.lineStyle(2,0x8faeba,.9);g.strokeRoundedRect(x-45,y-8,110,62,8);}return;}
g.fillStyle(0x0a0c17);g.fillRoundedRect(34,53,932,594,32);g.fillStyle(mix(b,0x070b1c,.3));g.fillRoundedRect(34,37,932,590,32);g.lineStyle(2,0x57577d,.6);g.strokeRoundedRect(34,37,932,590,32);
  let seed=718;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const cols=c.density,rows=Math.max(4,Math.round(cols*.6)),w=900/cols,h=550/rows;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const xx=50+x*w,yy=55+y*h,a=random()*c.contrast;const left=[{x:xx,y:yy},{x:xx+w,y:yy},{x:xx,y:yy+h}],right=[{x:xx+w,y:yy},{x:xx+w,y:yy+h},{x:xx,y:yy+h}];g.fillStyle(mix(b,random()>.55?0x7e6caa:0x0b1027,a));g.fillPoints(left,true);g.fillStyle(mix(b,random()>.55?0x7e6caa:0x0b1027,a));g.fillPoints(right,true);g.lineStyle(.7,0xafa5d5,c.contrast*.3);g.lineBetween(xx,yy,xx+w,yy);}
  g.lineStyle(2,0x9a8cc4,.35);g.strokeRoundedRect(48,52,904,552,20);g.lineStyle(1,0xa799d0,.15);g.strokeEllipse(500,370,610,330);
  if(!this.samples)return;
  // Readability samples only, never used as gameplay colliders.
  const pool=(cx:number,cy:number,color:number,edge:number)=>{const pts=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2,r=1+.08*Math.sin(a*3);return {x:cx+Math.cos(a)*82*r,y:cy+Math.sin(a)*43*r};});g.fillStyle(0x080c19,.3);g.fillEllipse(cx,cy+8,180,92);g.fillStyle(color,.7);g.fillPoints(pts,true);g.lineStyle(2,edge,.9);g.strokePoints(pts,true);};
  pool(187,470,0x91774d,0xdac18a);pool(810,486,0x437551,0xa0e67c);
  for(const [x,y] of [[177,167],[757,153]]){g.fillStyle(0x050715,c.shadow);g.fillEllipse(x+30,y+54,145,52);g.fillStyle(0x323c66);g.fillRoundedRect(x-45,y+10,110,62,8);g.fillStyle(0x65719e);g.fillRoundedRect(x-45,y-8,110,62,8);g.lineStyle(2,0xa6b0d0,.45);g.strokeRoundedRect(x-45,y-8,110,62,8);g.lineStyle(2,0xd2d4ee,.35);g.lineBetween(x-32,y+2,x+51,y+2);}
 }
}
