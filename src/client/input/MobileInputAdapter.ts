import {TouchState,type StickName} from './TouchState';
import {TOUCH,type SkillAimMode} from './TouchConfig';
export class MobileInputAdapter extends TouchState {
 ultimatePointer:number|null=null;ultimateAimMode:SkillAimMode='none';ultimateOrigin={x:0,y:0};
 enabled=false;showDebug=false;allowed=false;shown=false;skillAllowed=false;ultimateAllowed=false;skillAimMode:SkillAimMode='direction';
 root:HTMLDivElement;orientation:HTMLDivElement;debug:HTMLPreElement;
 constructor(){super();this.root=document.createElement('div');this.root.id='touch-controls';this.root.hidden=true;
  this.root.innerHTML='<div class="touch-pad move-pad" data-stick="move" role="group" aria-label="移动摇杆"><i></i><span>移动</span></div><div class="touch-pad aim-pad" data-stick="aim" role="group" aria-label="瞄准摇杆，拖动后松手攻击"><i></i><span>瞄准 · 松手攻击</span></div><button class="touch-skill" data-stick="skill" aria-label="人格技能">SKILL<small>技能</small></button><button class="touch-ultimate" aria-label="大招">ULT<small>未就绪</small></button><pre id="touch-debug" hidden></pre>';
  document.querySelector('.arena-section')!.append(this.root);
  this.orientation=document.createElement('div');this.orientation.id='touch-orientation';this.orientation.hidden=true;this.orientation.innerHTML='<span>↻</span><b>请横屏进行游戏</b><small>触屏调试已暂停输入 · 可点右上设置关闭</small>';
  document.querySelector('.arena-section')!.append(this.orientation);this.debug=this.root.querySelector('pre')!;
  for(const name of ['move','aim','skill'] as const)this.bindStick(name);
  this.bindUltimate();
  this.root.style.setProperty('--touch-opacity',String(TOUCH.opacity));
  this.root.addEventListener('contextmenu',event=>event.preventDefault());
  window.addEventListener('blur',()=>this.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  window.addEventListener('resize',()=>this.clear());
 }
 get portrait(){return window.innerHeight>window.innerWidth;}
 setEnabled(value:boolean){this.clear();this.enabled=value;document.body.classList.toggle('touch-mode',value);}
 bindStick(name:StickName){const element=this.root.querySelector<HTMLElement>(`[data-stick="${name}"]`)!;
  const update=(event:PointerEvent)=>{const box=element.getBoundingClientRect();this.drag(name,event.pointerId,(event.clientX-box.left-box.width/2)/TOUCH.stickTravel,(event.clientY-box.top-box.height/2)/TOUCH.stickTravel);this.paint();};
  element.addEventListener('pointerdown',event=>{if(!this.allowed||(name==='skill'&&!this.skillAllowed))return;event.preventDefault();event.stopPropagation();if(!this.begin(name,event.pointerId))return;element.setPointerCapture(event.pointerId);update(event);});
  element.addEventListener('pointermove',event=>{if(this[name].pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();update(event);});
  element.addEventListener('pointerup',event=>{if(this[name].pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();update(event);if(name==='skill'&&this.skillAimMode==='none')this.skillPressed=true;this.end(name,event.pointerId);this.paint();});
  const cancel=(event:PointerEvent)=>{this.end(name,event.pointerId,true);this.paint();};
  element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);
 }
 bindUltimate(){const button=this.root.querySelector<HTMLButtonElement>('.touch-ultimate')!;
  button.addEventListener('pointerdown',event=>{if(!this.allowed||!this.ultimateAllowed||this.ultimatePointer!==null)return;event.preventDefault();event.stopPropagation();this.targetDistance=1;this.ultimateOrigin={x:event.clientX,y:event.clientY};this.ultimatePointer=event.pointerId;button.setPointerCapture(this.ultimatePointer);});
  button.addEventListener('pointermove',event=>{if(event.pointerId!==this.ultimatePointer||this.ultimateAimMode==='none')return;event.preventDefault();const dx=event.clientX-this.ultimateOrigin.x,dy=event.clientY-this.ultimateOrigin.y;if(Math.hypot(dx,dy)>TOUCH.stickTravel*TOUCH.aimDeadZone) {this.angle=Math.atan2(dy,dx);this.targetDistance=Math.min(1,Math.hypot(dx,dy)/TOUCH.stickTravel);}});
  button.addEventListener('pointerup',event=>{if(event.pointerId!==this.ultimatePointer)return;event.preventDefault();event.stopPropagation();if(this.allowed&&this.ultimateAllowed)this.ultimatePressed=true;this.ultimatePointer=null;});
  const cancel=()=>{this.ultimatePointer=null;};button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);window.addEventListener('blur',cancel);
 }
 clear(){
  if(this.root){for(const element of Array.from(this.root.querySelectorAll<HTMLElement>('[data-stick],.touch-ultimate'))){
    const name=element.dataset.stick as StickName|undefined;
    const pointer=name?this[name].pointer:this.ultimatePointer;
    if(pointer!==null&&element.hasPointerCapture(pointer))element.releasePointerCapture(pointer);
  }}
  this.ultimatePointer=null;super.clear();if(this.root)this.paint();
 }
 paint(){if(!this.root)return;for(const name of ['move','aim'] as const){const knob=this.root.querySelector<HTMLElement>(`[data-stick="${name}"] i`)!;knob.style.transform=`translate(${this[name].x*TOUCH.stickTravel}px,${this[name].y*TOUCH.stickTravel}px)`;}}
 sync(active:boolean,canInput:boolean,_multiplayer:boolean,energy:number,skillReady:boolean){
  const shown=this.enabled&&active;this.shown=shown;
  this.root.hidden=!shown;this.orientation.hidden=!(shown&&this.portrait);
  this.allowed=shown&&canInput&&!this.portrait;
  if(!this.allowed)this.clear();
  this.skillAllowed=this.allowed&&skillReady;
  this.ultimateAllowed=this.allowed&&energy>=100;
  const skill=this.root.querySelector<HTMLButtonElement>('.touch-skill')!,ult=this.root.querySelector<HTMLButtonElement>('.touch-ultimate')!;
  skill.disabled=!this.skillAllowed;ult.disabled=!this.ultimateAllowed;
  skill.querySelector('small')!.textContent=skillReady?(this.skillAimMode==='none'?'点击释放':'拖动释放'):'冷却中';
  ult.querySelector('small')!.textContent=energy>=100?(this.ultimateAimMode==='position'?'拖动瞄准 · 松手':'READY'):'未就绪';ult.classList.toggle('touch-ready',energy>=100);
  this.debug.hidden=!this.showDebug;
  if(this.showDebug)this.debug.textContent=`MOVE X:${this.move.x.toFixed(2)} Y:${this.move.y.toFixed(2)} Pointer:${this.move.pointer??'—'}\nAIM Angle:${this.angle.toFixed(2)} Pointer:${this.aim.pointer??'—'}\nSkill Pointer:${this.skill.pointer??'—'}\nAttack:${this.attackPressed} Skill:${this.skillPressed} Ultimate:${this.ultimatePressed}\nEvents A:${this.attackCount} S:${this.skillCount} U:${this.ultimateCount}\nDead zone:${TOUCH.deadZone} · Opacity:${TOUCH.opacity}`;
 }
}
