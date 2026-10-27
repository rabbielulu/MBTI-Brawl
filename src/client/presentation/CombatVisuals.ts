import type Phaser from 'phaser';
import type {NetworkProjectile,NetworkZone} from '../../shared/NetworkProtocol';
import {NET} from '../../shared/GameConstants';
import {getCharacter} from './CharacterPresentation';
import {CombatSymbol} from './CombatSymbol';
import {CombatText} from './CombatText';
import {GeometryVfx} from './GeometryVfx';
export interface VisualEffect {x:number;y:number;text:string;color:string;life:number;total:number;radius?:number;symbol?:string;meme?:string;impact?:'ring'|'shockwave'|'heart'|'bonk'}
export class CombatVisuals {
 readonly symbols:CombatSymbol;readonly memes:CombatText;readonly geometry:GeometryVfx;
 constructor(scene:Phaser.Scene){this.symbols=new CombatSymbol(scene);this.memes=new CombatText(scene);this.geometry=new GeometryVfx(scene);}
 begin(){this.symbols.begin();this.memes.begin();this.geometry.begin();}
 prop(x:number,y:number,role:string,angle:number,time:number,attacking:boolean,hit:boolean,dashing=false,adrenaline=false){
  const c=getCharacter(role),p=c.presentation;
  const reach=attacking?43:30,bob=Math.sin(time*3)*2;
  this.symbols.draw(x+Math.cos(angle)*reach,y+Math.sin(angle)*reach+bob,p.prop,{fontSize:role==='ESTP'?35:30,scale:attacking?1.22:1,rotation:role==='ESTJ'?Math.sin(time*2)*.1:role==='ESTP'?Math.sin(angle)*.2:0,depth:15});
  if(hit)this.symbols.draw(x+32,y-39,p.hurtSymbol,{fontSize:28,scale:1.2,rotation:Math.sin(time*20)*.15,depth:45});
  if(dashing){this.geometry.trail(x,y,angle,100,c.color);this.symbols.draw(x-Math.cos(angle)*50,y-Math.sin(angle)*50,p.skillSymbol,{fontSize:40,alpha:.7,rotation:angle,depth:16});}
  if(adrenaline)this.symbols.draw(x+Math.cos(time*4)*39,y-28+Math.sin(time*4)*12,p.ultimateSymbol,{fontSize:27,rotation:Math.sin(time)*.15,depth:16});
 }
 projectile(shot:Pick<NetworkProjectile,'id'|'source'|'vx'|'vy'>,x:number,y:number,role:string,time:number){
  const c=getCharacter(role),p=c.presentation,visual=p.projectile,skill=shot.source==='skill',angle=Math.atan2(shot.vy,shot.vx),phase=time*7+shot.id;
  this.geometry.trail(x,y,angle,visual.trailType==='speed'?65:38,c.color);
  this.symbols.draw(x,y,skill?p.skillSymbol:visual.symbol,{fontSize:skill?46:visual.fontSize,rotation:visual.spinSpeed*time+(visual.spinSpeed?shot.id:.12*Math.sin(phase)),scale:1+.07*Math.sin(phase),depth:30});
  if(role==='ENTP')this.memes.draw(x,y-(skill?44:36),skill?p.skillText:p.texts[shot.id%p.texts.length],{fontSize:skill?(visual.skillTextFontSize??30):(visual.textFontSize??24),color:p.ink});
 }
 zone(zone:NetworkZone,role:string,tick:number,time:number){
  const c=getCharacter(role),p=c.presentation;
  const waiting=zone.kind==='deadline'&&zone.pulsesLeft>0;
  const wait=Math.max(0,(zone.nextPulseTick-tick)/NET.tickRate);
  const progress=waiting?Math.min(1,(tick-zone.startTick)/(zone.nextPulseTick-zone.startTick||1)):(time*1.5)%1;
  this.geometry.warningCircle(zone.x,zone.y,zone.radius,progress,c.color);
  if(zone.kind==='speech')this.geometry.shockwave(zone.x,zone.y,zone.radius,(time*2)%1,c.color);
  if(zone.kind==='emotion')this.geometry.shockwave(zone.x,zone.y,zone.radius,Math.min(1,(tick-zone.startTick)/9),0xdb87a0);
  const symbol=zone.kind==='deadline'?(wait<1?'⏰':p.skillSymbol):p.ultimateSymbol;
  this.symbols.draw(zone.x,zone.y-24,symbol,{fontSize:zone.kind==='emotion'?62:44,rotation:waiting?Math.sin(time*10)*.09:Math.sin(time*2)*.1,scale:1+.1*Math.sin(time*8),depth:8});
  const word=zone.kind==='deadline'?`${p.skillText} · ${Math.ceil(wait)}`:p.ultimateTexts[Math.max(0,zone.pulsesLeft-1)%p.ultimateTexts.length];
  this.memes.draw(zone.x,zone.y+22,word,{fontSize:waiting?23:21,color:p.ink,depth:9});
 }
 effect(e:VisualEffect){
  const progress=Math.max(0,Math.min(1,1-e.life/e.total)),color=Number.parseInt(e.color.replace('#',''),16);
  if(e.radius){if(e.impact==='shockwave')this.geometry.shockwave(e.x,e.y,e.radius,progress,color);else this.geometry.impactRing(e.x,e.y,e.radius,progress,color);}
  if(e.symbol)this.symbols.draw(e.x,e.y-12-progress*22,e.symbol,{fontSize:e.impact==='shockwave'?58:35,scale:1+.4*Math.sin(Math.min(1,progress*2)*Math.PI),rotation:e.impact==='bonk'?progress*.6:Math.sin(progress*Math.PI)*.2,alpha:1-progress,depth:45});
  if(e.text)this.memes.draw(e.x,e.y-27,e.text,{fontSize:e.radius&&e.radius>100?28:21,color:e.color,progress,punch:true,fade:true,float:40});
  if(e.meme)this.memes.draw(e.x,e.y+12,e.meme,{fontSize:18,color:e.color,progress,punch:true,fade:true,float:22,rotation:-.08});
 }
 get stats(){return {symbols:this.symbols.stats,text:this.memes.stats};}
}
