import type Phaser from 'phaser';
import {FrameTextPool} from './FrameTextPool';
export interface MemeStyle {fontSize?:number;color?:string;progress?:number;rotation?:number;punch?:boolean;float?:number;fade?:boolean;screenSpace?:boolean;depth?:number}
export class CombatText {
 readonly pool:FrameTextPool;
 constructor(scene:Phaser.Scene,limit=96){this.pool=new FrameTextPool(scene,limit,'Arial, "Noto Sans SC", sans-serif');}
 begin(){this.pool.begin();}
 draw(x:number,y:number,value:string,style:MemeStyle={}){
  const p=Math.max(0,Math.min(1,style.progress??0));
  const punch=style.punch?1+.4*Math.sin(Math.min(1,p*3)*Math.PI):1;
  return this.pool.acquire(x,y-(style.float??0)*p,value,style.fontSize??20,style.color??'#574160',style.depth??50,style.screenSpace)?.setStroke('#fffdf8',4).setScale(punch).setRotation(style.rotation??0).setAlpha(style.fade?1-p:1);
 }
 get stats(){return this.pool.stats;}
}
