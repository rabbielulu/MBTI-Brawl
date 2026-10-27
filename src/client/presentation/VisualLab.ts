import Phaser from 'phaser';
import {CombatVisuals} from './CombatVisuals';
import {PLAYABLE_TYPES} from '../../shared/characters/CharacterDatabase';
import {getCharacter} from './CharacterPresentation';
const metrics=document.querySelector<HTMLElement>('#metrics')!;
class VisualLab extends Phaser.Scene {
 visuals!:CombatVisuals;g!:Phaser.GameObjects.Graphics;t=0;paused=false;density=10;lastSample=0;frames=0;elapsed=0;peakObjects=0;samples=0;
 create(){this.visuals=new CombatVisuals(this);this.g=this.add.graphics().setDepth(10);
  document.querySelector<HTMLButtonElement>('#pause')!.onclick=event=>{this.paused=!this.paused;(event.target as HTMLButtonElement).textContent=this.paused?'继续动画':'暂停动画';};
  document.querySelector<HTMLButtonElement>('#density')!.onclick=event=>{this.density=this.density===10?20:10;(event.target as HTMLButtonElement).textContent=`压力：每人 ${this.density} 弹丸`;};
 }
 update(_now:number,delta:number){
  if(!this.paused)this.t+=Math.min(delta,.05*1000)/1000;
  const cam=this.cameras.main;cam.setZoom(Math.min(this.scale.width/1280,this.scale.height/800));cam.centerOn(640,400);
  this.visuals.begin();this.g.clear();const time=this.t;
  for(let i=0;i<8;i++){
   const type=PLAYABLE_TYPES[i%4],c=getCharacter(type),x=175+i%4*310,y=280+Math.floor(i/4)*330;
   this.g.fillStyle(c.color,.2);this.g.fillCircle(x,y+10,50);this.g.lineStyle(5,c.color);this.g.lineBetween(x,y,x,y+35);this.g.lineBetween(x,y+35,x-15,y+55);this.g.lineBetween(x,y+35,x+15,y+55);this.g.lineBetween(x,y+10,x-20,y+20);this.g.lineBetween(x,y+10,x+24,y-4);this.g.fillStyle(c.color);this.g.fillRoundedRect(x-20,y-40,40,40,10);
   this.visuals.memes.draw(x,y-80,type,{fontSize:24,color:c.presentation.ink});
   this.visuals.prop(x,y,type,time, time,Math.sin(time*5)>0,Math.sin(time*3+i)>.8,type==='ESTP',type==='ESTP');
   for(let j=0;j<this.density;j++){const phase=(time*.6+j/this.density)%1,angle=j*2.399+i;this.visuals.projectile({id:i*100+j,source:j===0?'skill':'basic',vx:Math.cos(angle)*600,vy:Math.sin(angle)*600},x+Math.cos(angle)*phase*135,y+Math.sin(angle)*phase*110,type,time);}
   const tick=Math.floor(time*30),start=tick-tick%90;
   this.visuals.zone({id:i,ownerId:`V${i}`,kind:type==='ESTJ'?'deadline':type==='ENTP'?'speech':'emotion',x,y:y+15,radius:110,startTick:start,endTick:start+90,nextPulseTick:start+90,intervalTicks:15,pulsesLeft:3,damage:0,knockback:0,ultimate:true},type,tick,time);
   this.visuals.effect({x:x+65,y:y+35,text:'−10',meme:c.presentation.projectile.hitText[0],symbol:c.presentation.ultimateSymbol,impact:'shockwave',radius:65,color:c.presentation.ink,life:1-(time+i*.1)%1,total:1});
  }
  this.frames++;this.elapsed+=delta;const count=this.children.length;this.peakObjects=Math.max(this.peakObjects,count);
  if(this.time.now-this.lastSample>=1000){
   this.lastSample=this.time.now;this.samples++;const memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize;
   const s=this.visuals.stats;metrics.textContent=`${Math.round(this.frames*1000/this.elapsed)} FPS · ${count} objects (peak ${this.peakObjects}) · Emoji ${s.symbols.active}/${s.symbols.allocated}/${s.symbols.limit} · Text ${s.text.active}/${s.text.allocated}/${s.text.limit} · dropped ${s.symbols.dropped+s.text.dropped} · heap ${memory?Math.round(memory/1048576)+'MB':'unavailable'} · samples ${this.samples}`;
   metrics.dataset.objects=String(count);metrics.dataset.emojiAllocated=String(s.symbols.allocated);metrics.dataset.textAllocated=String(s.text.allocated);metrics.dataset.samples=String(this.samples);this.frames=0;this.elapsed=0;
  }
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'lab',backgroundColor:'#faf8f2',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:VisualLab});
