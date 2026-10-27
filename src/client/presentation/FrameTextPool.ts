import type Phaser from 'phaser';
/** Reused per frame; every borrowed Text resets transforms, camera mode and depth. */
export class FrameTextPool {
 private objects:Phaser.GameObjects.Text[]=[];private cursor=0;dropped=0;
 constructor(private scene:Phaser.Scene,readonly limit:number,private fontFamily:string){
  scene.events.once('shutdown',()=>this.destroy());
 }
 begin(){for(const text of this.objects)text.setVisible(false);this.cursor=0;this.dropped=0;}
 acquire(x:number,y:number,value:string,size:number,color:string,depth:number,screenSpace=false){
  if(this.cursor>=this.limit){this.dropped++;return undefined;}
  let text=this.objects[this.cursor];
  if(!text){text=this.scene.add.text(0,0,'',{fontFamily:this.fontFamily,padding:{x:5,y:5}});this.objects.push(text);}
  this.cursor++;
  return text.setPosition(x,y).setText(value).setFontSize(size).setColor(color).setOrigin(.5).setAlpha(1).setScale(1).setRotation(0).setScrollFactor(screenSpace?0:1).setDepth(depth).setStroke('#fffdf8',0).setVisible(true);
 }
 get stats(){return {active:this.cursor,allocated:this.objects.length,limit:this.limit,dropped:this.dropped};}
 destroy(){this.objects.forEach(t=>t.destroy());this.objects=[];this.cursor=0;}
}
