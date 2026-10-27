import type Phaser from 'phaser';
import {FrameTextPool} from './FrameTextPool';
export interface EmojiStyle {fontSize:number;rotation?:number;scale?:number;alpha?:number;depth?:number}
export class CombatSymbol {
 readonly pool:FrameTextPool;
 constructor(scene:Phaser.Scene,limit=128){this.pool=new FrameTextPool(scene,limit,'"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif');}
 begin(){this.pool.begin();}
 draw(x:number,y:number,symbol:string,style:EmojiStyle){return this.pool.acquire(x,y,symbol,style.fontSize,'#ffffff',style.depth??30)?.setRotation(style.rotation??0).setScale(style.scale??1).setAlpha(style.alpha??1);}
 get stats(){return this.pool.stats;}
}
