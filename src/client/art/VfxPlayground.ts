import Phaser from 'phaser';
import './playground.css';
import {DEFAULT_ART,QUALITY_BUDGET,colorNumber,type ArtConfig} from './ArtConfig';
import {ArenaFloor} from './ArenaFloor';
import {ActorView} from './ActorView';
import {BurstVfx} from './BurstVfx';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const LIGHT_ART:ArtConfig={...DEFAULT_ART,floor:'#f5f8f1',color:'#659f97',glow:0,density:0,contrast:0,shadow:.25};
const config:ArtConfig={...LIGHT_ART};
const groups=[{name:'能量与粒子',items:[['count','粒子数量',8,160,1],['speed','粒子速度',50,600,10],['direction','喷射方向 / 度',-180,180,5],['spread','喷射角度 / 度',20,360,10],['size','粒子大小',1,9,.5],['opacity','粒子透明度',.1,1,.05],['life','生命周期 / 秒',.3,3,.1],['gravity','重力',-100,250,5],['color','技能颜色']]},{name:'冲击与反馈',items:[['radius','冲击波半径',80,400,10],['waveSpeed','扩散速度',200,1200,20],['shake','震屏幅度',0,.01,.0005]]},{name:'竞技场地面',items:[['floor','地面颜色'],['shadow','接触阴影强度',0,1,.05]]}];
$('controls').innerHTML=groups.map(group=>`<fieldset class="control-group"><legend>${group.name}</legend>${group.items.map(([key,label,min,max,step])=>`<label class="control-row" for="art-${key}"><div><span>${label}</span><output id="value-${key}"></output></div><input id="art-${key}" data-key="${key}" type="${min===undefined?'color':'range'}" ${min===undefined?'':`min="${min}" max="${max}" step="${step}"`}></label>`).join('')}</fieldset>`).join('');
let lab:Playground|undefined;
function syncControls(){for(const input of Array.from(document.querySelectorAll<HTMLInputElement>('[data-key]'))){const key=input.dataset.key as keyof ArtConfig;input.value=String(config[key]);$(`value-${key}`).textContent=String(config[key]);}$<HTMLSelectElement>('quality').value=config.quality;}
syncControls();
for(const input of Array.from(document.querySelectorAll<HTMLInputElement>('[data-key]')))input.oninput=()=>{const key=input.dataset.key as keyof ArtConfig;(config as unknown as Record<string,string|number>)[key]=input.type==='color'?input.value:Number(input.value);$(`value-${key}`).textContent=input.value;lab?.parametersChanged(['floor','density','contrast','shadow'].includes(key));};
$<HTMLSelectElement>('quality').onchange=()=>{config.quality=$<HTMLSelectElement>('quality').value as ArtConfig['quality'];lab?.parametersChanged(false);};
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-color]')))button.onclick=()=>{config.color=button.dataset.color!;syncControls();lab?.parametersChanged(false);lab?.release();};
class Playground extends Phaser.Scene {
 floor!:ArenaFloor;vfx!:BurstVfx;hero!:ActorView;target!:ActorView;timeSeconds=0;hitAt=-10;lastCast=-10;paused=false;frames=new Float32Array(120);frameIndex=0;frameCount=0;lastMetric=0;hidden=false;
 readonly motion=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(){super('VfxPlayground');}
 create(){lab=this;this.floor=new ArenaFloor(this,true,true);this.floor.rebuild(config);this.vfx=new BurstVfx(this,true);this.vfx.reduced=this.motion.matches;this.hero=new ActorView(this,'ENTP',0x776396);this.target=new ActorView(this,'INFP',0x5b927b);
  this.add.text(500,235,'ENTP',{fontFamily:'Arial',fontSize:'15px',color:'#776396'}).setOrigin(.5).setDepth(30);this.add.text(735,252,'受击反馈',{fontFamily:'Arial',fontSize:'12px',color:'#5b8070'}).setOrigin(.5).setDepth(30);
  $('renderer').textContent=this.game.renderer.type===Phaser.WEBGL?'WEBGL / ALPHA':'CANVAS / ALPHA';
  if(this.motion.matches){$<HTMLInputElement>('auto').checked=false;$('motion-note').textContent='系统减少动态效果已启用：降低粒子与闪光，关闭震屏。';}
  this.vfx.onImpact=(x,y,c)=>{const distance=Math.hypot(735-x,365-y);this.hitAt=distance<=c.radius?this.timeSeconds+distance/c.waveSpeed:-10;if(!this.motion.matches&&c.shake>0)this.cameras.main.shake(110,c.shake);};
  $('replay').onclick=()=>this.release();$('stress').onclick=()=>this.stress(8);$('stress16').onclick=()=>this.stress(16);$('clear').onclick=()=>{this.vfx.clear();this.lastCast=this.timeSeconds;this.hitAt=-10;};
  $('pause').onclick=()=>{this.paused=!this.paused;$('pause').textContent=this.paused?'继续':'暂停';};
  $('reset').onclick=()=>{Object.assign(config,LIGHT_ART);syncControls();this.vfx.clear();this.floor.rebuild(config);this.parametersChanged(false);this.release();};
  this.input.keyboard?.on('keydown-SPACE',(event:KeyboardEvent)=>{if((event.target as HTMLElement)?.matches('input,select,button')||event.repeat)return;event.preventDefault();this.release();});
  const onVisibility=()=>{this.hidden=document.hidden;if(this.hidden){this.vfx.clear();this.hitAt=-10;}this.lastCast=this.timeSeconds;};document.addEventListener('visibilitychange',onVisibility);this.events.once('shutdown',()=>{document.removeEventListener('visibilitychange',onVisibility);lab=undefined;});
  this.release();
 }
 release(){if(this.vfx.cast(500,365,config)){this.lastCast=this.timeSeconds;}}
 stress(count:number){this.vfx.clear();this.lastCast=this.timeSeconds;for(let i=0;i<count;i++)this.vfx.cast(225+(i%4)*180,200+Math.floor(i/4)*105,config);}
 parametersChanged(floor:boolean){if(floor)this.floor.rebuild(config);this.vfx.pool.setLimit(QUALITY_BUDGET[config.quality]);for(const b of this.vfx.bursts){Object.assign(b.config,config);b.color=colorNumber(config.color);}}
 update(_now:number,delta:number){if(!this.vfx)return;const cam=this.cameras.main;cam.setZoom(Math.min(this.scale.width/1000,this.scale.height/680));cam.centerOn(500,340);
  const dt=this.paused||this.hidden?0:Math.min(delta/1000,.05);this.timeSeconds+=dt;
  if($<HTMLInputElement>('auto').checked&&!this.vfx.bursts.length&&this.timeSeconds-this.lastCast>3.8)this.release();
  this.vfx.update(dt);this.hero.draw(500,365,this.timeSeconds,this.vfx.charge,-1,config.shadow);const hitAge=this.hitAt<0?-1:this.timeSeconds-this.hitAt;
  this.target.draw(735+(hitAge>=0&&hitAge<.5?Math.sin(hitAge/.5*Math.PI)*18:0),365,this.timeSeconds,0,hitAge,config.shadow);this.vfx.draw();
  $('phase').textContent=this.paused?'已暂停':this.vfx.phase;for(const span of Array.from(document.querySelectorAll<HTMLElement>('[data-beat]')))span.classList.toggle('active',span.dataset.beat===this.vfx.phase);
  if(!this.hidden&&delta>0){this.frames[this.frameIndex++%120]=delta;this.frameCount=Math.min(120,this.frameCount+1);}
  if(this.time.now-this.lastMetric>500){this.lastMetric=this.time.now;const samples=Array.from(this.frames.slice(0,this.frameCount)).sort((a,b)=>a-b),average=samples.reduce((a,b)=>a+b,0)/(samples.length||1),p95=samples[Math.min(samples.length-1,Math.floor(samples.length*.95))]||0;
   const pool=this.vfx.pool;$('metrics').textContent=`${Math.round(1000/(average||16.7))} FPS   平均 ${average.toFixed(1)} ms / P95 ${p95.toFixed(1)} ms\n粒子 ${pool.active}/${pool.limit} · 峰值 ${pool.peak} · 丢弃 ${pool.dropped} · 技能 ${this.vfx.bursts.length}/16 · 场景对象 ${this.children.length}`;$('metrics').dataset.particles=String(pool.active);$('metrics').dataset.budget=String(pool.limit);$('metrics').dataset.objects=String(this.children.length);$('metrics').dataset.p95=String(p95);}
 }
}
new Phaser.Game({type:new URLSearchParams(location.search).get('renderer')==='canvas'?Phaser.CANVAS:Phaser.AUTO,parent:'playground',backgroundColor:'#e8f0eb',scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%'},scene:Playground,render:{antialias:true,powerPreference:'high-performance'}});
