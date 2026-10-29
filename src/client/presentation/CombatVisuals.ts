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
 prop(x:number,y:number,role:string,angle:number,time:number,attacking:boolean,hit:boolean,dashing=false,adrenaline=false,escape=false){
  const c=getCharacter(role),p=c.presentation;
  const reach=attacking?43:30,bob=Math.sin(time*3)*2;
  let propX=Math.cos(angle)*reach,propY=Math.sin(angle)*reach+bob;
  if(!attacking&&Math.abs(propX)<43&&propY<0){propX=(propX<0?-1:1)*50;propY=Math.max(-22,propY);}
  this.symbols.draw(x+propX,y+propY,p.prop,{fontSize:role==='ESTP'?35:30,scale:attacking?1.22:1,rotation:role==='ESTJ'?Math.sin(time*2)*.1:role==='ESTP'?Math.sin(angle)*.2:0,depth:15,alpha:escape?.5:1});
  if(hit)this.symbols.draw(x+32,y-39,p.hurtSymbol,{fontSize:28,scale:1.2,rotation:Math.sin(time*20)*.15,depth:45});
  if(dashing){this.geometry.trail(x,y,angle,100,c.color);this.symbols.draw(x-Math.cos(angle)*50,y-Math.sin(angle)*50,p.skillSymbol,{fontSize:40,alpha:.7,rotation:angle,depth:16});}
  if(adrenaline)this.symbols.draw(x+Math.cos(time*4)*39,y-28+Math.sin(time*4)*12,p.ultimateSymbol,{fontSize:27,rotation:Math.sin(time)*.15,depth:16});
 }
 projectile(shot:Pick<NetworkProjectile,'id'|'source'|'vx'|'vy'>,x:number,y:number,role:string,time:number){
  const c=getCharacter(role),p=c.presentation,visual=p.projectile,skill=shot.source==='skill',angle=Math.atan2(shot.vy,shot.vx),phase=time*7+shot.id;
  this.geometry.trail(x,y,angle,visual.trailType==='speed'?65:38,c.color);
  this.symbols.draw(x,y,skill?p.skillSymbol:role==='ENFP'?['⭐','🌈','💡','✨'][shot.id%4]:visual.symbol,{fontSize:skill?46:visual.fontSize,rotation:visual.spinSpeed*time+(visual.spinSpeed?shot.id:.12*Math.sin(phase)),scale:1+.07*Math.sin(phase),depth:30});
  if(role==='ENTP')this.memes.draw(x,y-(skill?44:36),skill?p.skillText:p.texts[shot.id%p.texts.length],{fontSize:skill?(visual.skillTextFontSize??30):(visual.textFontSize??24),color:p.ink});
 }
 zone(zone:NetworkZone,role:string,tick:number,time:number){
  const c=getCharacter(role),p=c.presentation;
  const waiting=['deadline','prediction','judgment','photo','bomb'].includes(zone.kind)&&zone.pulsesLeft>0;
  const wait=Math.max(0,(zone.nextPulseTick-tick)/NET.tickRate);
  const progress=waiting?Math.min(1,(tick-zone.startTick)/(zone.nextPulseTick-zone.startTick||1)):(time*1.5)%1;
  if(zone.kind==='turret'||zone.kind==='mega'){
   const g=this.geometry.ground,r=zone.kind==='mega'?26:19;g.fillStyle(c.color,.2);g.fillCircle(zone.x,zone.y,r+8);g.fillStyle(c.color,.95);g.fillRoundedRect(zone.x-r,zone.y-r,r*2,r*2,7);g.lineStyle(7,0x64516d);g.lineBetween(zone.x,zone.y,zone.x+r+13,zone.y);this.memes.draw(zone.x,zone.y-r-16,zone.kind==='mega'?'MEGA':'MINI',{fontSize:14,color:p.ink});return;
  }
  if(zone.kind==='chess'){this.geometry.warningCircle(zone.x,zone.y,35,.8,c.color);this.symbols.draw(zone.x,zone.y,'♟️',{fontSize:34,alpha:.7,depth:8});return;}
  if(zone.kind==='chicken'){this.symbols.draw(zone.x,zone.y,'🐔',{fontSize:zone.ultimate?65:38,rotation:Math.sin(time*15)*.13,depth:15});return;}
  this.geometry.warningCircle(zone.x,zone.y,zone.radius,progress,c.color);
  if(['encourage','show','stop','look','slam','photo'].includes(zone.kind))this.geometry.shockwave(zone.x,zone.y,zone.radius,(time*2)%1,c.color);
  if(zone.kind==='prediction'){const g=this.geometry.ground;g.lineStyle(1,c.color,.6);for(let i=-1;i<=1;i++){g.lineBetween(zone.x-zone.radius,zone.y+i*25,zone.x+zone.radius,zone.y+i*25);g.lineBetween(zone.x+i*25,zone.y-zone.radius,zone.x+i*25,zone.y+zone.radius);}}
  if(zone.kind==='art'){const g=this.geometry.ground;for(let i=0;i<5;i++){g.fillStyle([0xead18b,0xb9a0e0,0x9cd0b0,0xe9a5be,0x96c9dc][i],.15);g.fillCircle(zone.x+Math.cos(i*2.4)*zone.radius*.5,zone.y+Math.sin(i*2.4)*zone.radius*.5,zone.radius*.4);}}

  if(zone.kind==='speech')this.geometry.shockwave(zone.x,zone.y,zone.radius,(time*2)%1,c.color);
  if(zone.kind==='emotion')this.geometry.shockwave(zone.x,zone.y,zone.radius,Math.min(1,(tick-zone.startTick)/9),0xdb87a0);
  const symbol=zone.kind==='deadline'?(wait<1?'⏰':p.skillSymbol):p.ultimateSymbol;
  this.symbols.draw(zone.x,zone.y-24,symbol,{fontSize:zone.kind==='emotion'?62:44,rotation:waiting?Math.sin(time*10)*.09:Math.sin(time*2)*.1,scale:1+.1*Math.sin(time*8),depth:8});
  const word=waiting?`${zone.kind==='deadline'?p.skillText:zone.kind==='photo'?'大合照':zone.kind==='prediction'?'预测轰炸':zone.kind==='judgment'?'灵魂审判':'BOOM'} · ${Math.ceil(wait)}`:p.ultimateTexts[Math.max(0,zone.pulsesLeft-1)%p.ultimateTexts.length];
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
