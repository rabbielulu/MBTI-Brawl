import {gameServerUrl,needsGameServer,serverMissingMessage} from '../Deployment';
import {gardenPose,posePath,type GardenPose} from './GardenPose';
import {io,type Socket} from 'socket.io-client';
import {GARDEN as C,gardenInput,canGardenHold,canGardenLift,type GardenSnapshot,type GardenPlayer} from '../../shared/garden/GardenConfig';
import {characterFaceSvg} from '../presentation/CharacterFace';
import {escapeHtml} from '../presentation/CharacterCard';
import {getCharacter} from '../presentation/CharacterPresentation';
import type {PlayerIdentity} from '../../shared/LobbyProtocol';
import './garden.css';
/** Disposable garden view; only the authority creates social relationships. */
export class GardenMode {
 private root=document.createElement('section');private socket:Socket;private abort=new AbortController();
 private snapshot:GardenSnapshot={time:0,players:[]};private received=performance.now();private id='';private frame=0;private timer:ReturnType<typeof setInterval>;
 private lastCarrying:string|null=null;
 private selectedTarget:string|null=null;
 private bodyAngles=new Map<string,number>();
 private seatOffsets=new Map<string,number>();
 private poses=new Map<string,GardenPose>();private lastFrame=performance.now();
 private keys=new Set<string>();private input=gardenInput();private actors=new Map<string,HTMLElement>();private positions=new Map<string,{x:number;y:number;z:number}>();private lastMouse=0;private mouseDelta=0;private lastHold=-1;private paused=false;
 constructor(identity:PlayerIdentity,private exit:()=>void){
  this.root.id='garden-mode';this.root.setAttribute('aria-label','小小花园');this.root.innerHTML=`<div class="garden-world"><div class="garden-links"></div><div class="garden-actors"></div></div><div class="garden-top"><div><span class="garden-kicker">LITTLE GARDEN / 小小花园</span><b id="garden-count">正在进入草地…</b></div><div><button id="garden-add-bots">＋ 测试机器人</button><button id="garden-clear-bots">移除机器人</button><button id="garden-help" aria-expanded="false">玩法</button><button id="garden-fullscreen">⛶ 全屏</button><button id="garden-exit">离开花园 ↗</button></div></div><div class="garden-persona"><svg viewBox="0 0 100 100">${characterFaceSvg(identity.mbti,50,52,1)}</svg><div><b>${escapeHtml(identity.nickname)}</b><span>${identity.mbti} · ${getCharacter(identity.mbti).nickname}</span></div></div><div class="garden-bottom"><p id="garden-status" role="status">这里没有胜负，和朋友一起发会儿呆。</p><div class="garden-controls"><span><kbd>WASD</kbd> 漂浮移动</span><span><kbd>Space</kbd> 跳跃</span><span><kbd>E</kbd> 挥手</span><span><kbd>Z</kbd> 坐下 / 起身</span><span><kbd>Q</kbd> 松手 / 放下</span><span><kbd>左键</kbd> 选人互动 / 举起后投掷</span></div></div><div class="garden-escape" hidden><b>按 Q 松手，或左右甩动鼠标挣脱</b><progress max="1" value="0"></progress></div><aside class="garden-help" hidden><b>来玩一会儿吧。</b><p>靠近朋友，点击对方，再点击头顶的牵手图标即可牵手。队尾可以继续牵起新朋友。</p><p>点击人物头顶的投掷图标可把对方举起；移动鼠标瞄准，再按左键扔出。碰到边界会反弹，落地后躺下。Q 可放下，也可以从别人手中下来。</p><p>按 Q 松手；在队伍中间时断开与前方的连接，领队则松开身后的人。被牵着时也可以快速左右甩动鼠标挣脱。</p><p>按 E 挥手，Z 坐下或起身。坐下时也可以挥手。站立时 25 秒不操作，你会放松侧躺。WASD 或空格随时起身。</p><small>同一服务器的玩家共享花园 · 最多 30 人</small></aside>`;
  document.body.append(this.root);document.body.classList.add('garden-active');
  const $=<T extends HTMLElement=HTMLElement>(q:string)=>this.root.querySelector<T>(q)!;
  $('#garden-exit').onclick=exit;$('#garden-fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{this.status('浏览器暂不支持全屏。');});};
  $('#garden-help').onclick=()=>{const help=$<HTMLElement>('.garden-help');help.hidden=!help.hidden;$('#garden-help').setAttribute('aria-expanded',String(!help.hidden));this.clear();};
  this.socket=io(gameServerUrl('/garden'),{auth:identity,reconnection:false,timeout:8000,autoConnect:!needsGameServer()});
  $('#garden-add-bots').onclick=()=>this.socket.emit('garden:bots:add');
  $('#garden-clear-bots').onclick=()=>this.socket.emit('garden:bots:clear');
  this.socket.on('garden:bots:result',(message:string)=>this.status(message));
  this.socket.on('garden:welcome',(s:GardenSnapshot&{id:string})=>{this.id=s.id;this.receive(s);});
  this.socket.on('garden:state',(s:GardenSnapshot)=>this.receive(s));
  this.socket.on('garden:error',(message:string)=>this.status(message));
  this.socket.on('connect_error',()=>this.status('连接花园失败，请离开后重试，并确认服务器已启动。'));
  this.socket.on('disconnect',()=>{this.clear();this.paused=true;this.status('与花园的连接已断开，请离开后重新进入。');});
  if(needsGameServer()){this.status(serverMissingMessage);$('#garden-count').textContent='联机服务尚未配置';($('#garden-add-bots') as HTMLButtonElement).disabled=true;($('#garden-clear-bots') as HTMLButtonElement).disabled=true;}
  const opts={signal:this.abort.signal};
  window.addEventListener('keydown',e=>{if(!this.root.isConnected||this.paused)return;const key=e.key.toLowerCase();if(key===' '&&(e.target as Element)?.closest('button'))return;if(['w','a','s','d',' ','e','z','q','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();this.keys.add(key);if(!e.repeat){if(key===' ')this.input.jump=true;if(key==='e')this.input.wave=true;if(key==='z')this.input.sit=true;if(key==='q'){this.input.releaseHold=true;this.selectedTarget=null;}}this.input.active=true;}},opts);
  window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()),opts);
  this.root.addEventListener('click',e=>{
   const target=e.target as Element,hold=target.closest<HTMLElement>('[data-hold-target]'),lift=target.closest<HTMLElement>('[data-lift-target]');
   this.input.active=true;
   const own=this.snapshot.players.find(p=>p.id===this.id);
   if(own?.carrying&&!target.closest('button,aside')){this.aimAt(e.clientX,e.clientY);this.input.throwNow=true;this.send();return;}
   if(lift){this.input.liftTarget=lift.dataset.liftTarget!;this.selectedTarget=null;this.send();return;}
   if(hold){this.input.holdTarget=hold.dataset.holdTarget!;this.selectedTarget=null;this.send();return;}
   const actor=target.closest<HTMLElement>('[data-player-id]');
   if(actor){this.selectTarget(actor.dataset.playerId!);return;}
   if(!target.closest('button,aside'))this.selectedTarget=null;
  },opts);
  this.root.addEventListener('pointermove',e=>{this.aimAt(e.clientX,e.clientY);const dx=e.clientX-this.lastMouse;this.lastMouse=e.clientX;this.input.active=true;this.mouseDelta+=dx;if(Math.abs(this.mouseDelta)>=C.EscapeMouseThreshold){this.input.shake=Math.sign(this.mouseDelta);this.mouseDelta=0;}},opts);
  this.root.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  window.addEventListener('blur',()=>{this.clear();this.paused=true;this.send();},opts);
  window.addEventListener('focus',()=>{if(this.socket.connected)this.paused=false;},opts);
  document.addEventListener('visibilitychange',()=>{this.clear();this.paused=document.hidden||!this.socket.connected;this.send();},opts);
  this.timer=setInterval(()=>this.send(),1000/30);this.render();
 }
 private aimX=1;private aimY=0;
 private aimAt(clientX:number,clientY:number){
  const own=this.positions.get(this.id),world=this.root.querySelector('.garden-world');if(!own||!world)return;
  const rect=world.getBoundingClientRect(),scale=rect.width/C.width;
  const dx=(clientX-rect.left)/scale-own.x,dy=(clientY-rect.top)/scale-own.y,length=Math.hypot(dx,dy);
  if(length>1){this.aimX=dx/length;this.aimY=dy/length;}
 }
 private selectTarget(id:string){
  const players=new Map(this.snapshot.players.map(p=>[p.id,p])),own=players.get(this.id),target=players.get(id);
  if(own&&target&&(canGardenHold(own,target,players)||canGardenLift(own,target))){this.selectedTarget=id;this.status('点击对方头顶的图标：牵手，或举起后投掷。');}
  else{this.selectedTarget=null;this.status('请靠近可互动的朋友；被举起或飞行中的人物暂时不能选中。');}
 }
 private status(message:string){this.root.querySelector('#garden-status')!.textContent=message;}
 private clear(){this.keys.clear();this.input=gardenInput();this.mouseDelta=0;}
 private send(){if(!this.socket.connected)return;const i=this.input;i.x=this.paused?0:Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));i.y=this.paused?0:Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));i.aimX=this.aimX;i.aimY=this.aimY;this.socket.emit('garden:input',i);this.input=gardenInput();}
 private receive(s:GardenSnapshot){this.snapshot=s;this.received=performance.now();this.root.querySelector('#garden-count')!.textContent=`${s.players.length} 位人格在花园里`;}
 private actor(p:GardenPlayer){let el=this.actors.get(p.id);if(el)return el;el=document.createElement('div');el.className='garden-actor';el.dataset.playerId=p.id;el.tabIndex=p.id===this.id?-1:0;el.setAttribute('role','group');el.setAttribute('aria-label',`${p.nickname} · ${p.mbti}`);el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();this.selectTarget(p.id);}};el.innerHTML=`<div class="garden-shadow"></div><div class="garden-body"><svg viewBox="0 0 100 150" aria-hidden="true"><g class="garden-limbs" fill="none" stroke="#303b36" stroke-width="4" stroke-linecap="round"><path d="M50 71V109"/><path class="garden-leg-left" d="M50 109L40 123L31 137"/><path class="garden-leg-right" d="M50 109L60 123L69 137"/><path class="garden-arm-left" d="M50 82L25 101"/><path class="garden-arm-right" d="M50 82L75 101"/></g>${characterFaceSvg(p.mbti,50,46,.83)}</svg></div><div class="garden-throw-prompt" hidden>鼠标左键投掷 · Q 放下</div><div class="garden-name"><b>${p.mbti}</b><span>${escapeHtml(p.nickname)}${p.id===this.id?' · 你':''}</span></div><div class="garden-actions" hidden><button type="button" class="garden-hold" data-hold-target="${p.id}" aria-label="牵起${escapeHtml(p.nickname)}的手"><span aria-hidden="true">🤝</span> 牵手</button><button type="button" class="garden-lift" data-lift-target="${p.id}" aria-label="举起并投掷${escapeHtml(p.nickname)}"><span aria-hidden="true">🙌</span> 投掷</button></div>`;this.root.querySelector('.garden-actors')!.append(el);this.actors.set(p.id,el);return el;}
 private render=()=>{
  const now=performance.now(),dt=Math.min(.1,(now-this.lastFrame)/1000),poseBlend=1-Math.exp(-dt*18),positionBlend=1-Math.exp(-dt*21.4),heightBlend=1-Math.exp(-dt*25.8),time=this.snapshot.time+Math.min(.15,(now-this.received)/1000),own=this.snapshot.players.find(p=>p.id===this.id);
  this.lastFrame=now;
  const ids=new Set(this.snapshot.players.map(p=>p.id));for(const [id,el] of this.actors)if(!ids.has(id)){el.remove();this.actors.delete(id);this.positions.delete(id);this.poses.delete(id);this.seatOffsets.delete(id);this.bodyAngles.delete(id);}
  // Update once, then share the rendered coordinates between actors and links.
  for(const p of this.snapshot.players){
   const pos=this.positions.get(p.id)||{x:p.x,y:p.y,z:p.z};
   pos.x+=(p.x-pos.x)*positionBlend;pos.y+=(p.y-pos.y)*positionBlend;pos.z+=(p.z-pos.z)*heightBlend;
   this.positions.set(p.id,pos);
  }
  // Fixed overview: fit the whole playable garden; never pin the player to center.
  const rect=this.root.getBoundingClientRect(),scale=Math.min(rect.width/C.width,rect.height/C.height),ox=(rect.width-C.width*scale)/2,oy=(rect.height-C.height*scale)/2;
  const world=this.root.querySelector<HTMLElement>('.garden-world')!;world.style.transform=`translate(${ox}px,${oy}px) scale(${scale})`;
  const players=new Map(this.snapshot.players.map(p=>[p.id,p]));
  const selected=players.get(this.selectedTarget||'');if(!own||!selected||!(canGardenHold(own,selected,players)||canGardenLift(own,selected)))this.selectedTarget=null;
  let links='';
  for(const p of [...this.snapshot.players].sort((a,b)=>a.y-b.y||a.z-b.z)){
   const el=this.actor(p),pos=this.positions.get(p.id)!;
   const reclined=!!p.carriedBy||p.thrown||p.lying;
   const seatOffset=(this.seatOffsets.get(p.id)||0)+((p.sitting?20:reclined?34:0)-(this.seatOffsets.get(p.id)||0))*poseBlend;this.seatOffsets.set(p.id,seatOffset);
   const bounce=!p.sitting&&p.moving&&p.z<1?Math.sin(time*Math.PI/C.GardenBounceInterval)**2*C.GardenBounceHeight:0;
   el.style.left=`${pos.x}px`;el.style.top=`${pos.y}px`;el.style.zIndex=String(Math.floor(p.y)+(p.carriedBy?1:0));
   el.classList.toggle('is-carried',!!p.carriedBy);el.classList.toggle('is-thrown',p.thrown);el.classList.toggle('is-carrying',!!p.carrying);el.classList.toggle('is-lying',p.lying);el.classList.toggle('is-sitting',p.sitting);el.classList.toggle('is-waving',p.waveUntil>time);el.classList.toggle('is-self',p.id===this.id);el.classList.toggle('is-held',!!p.holdParent);
   const targetPose=gardenPose(p,time),pose=this.poses.get(p.id)||targetPose;
   for(const [joint,selector] of [['leftArm','.garden-arm-left'],['rightArm','.garden-arm-right'],['leftLeg','.garden-leg-left'],['rightLeg','.garden-leg-right']] as const){
    pose[joint]=pose[joint].map((value,index)=>value+(targetPose[joint][index]-value)*poseBlend);
    el.querySelector(selector)!.setAttribute('d',posePath(pose[joint]));
   }
   this.poses.set(p.id,pose);
   const squash=p.lying||p.sitting?1:p.moving&&p.z<1?1-Math.cos(time*Math.PI*2/C.GardenBounceInterval)*.055:p.vz>0?1.035:1;
   const targetAngle=reclined?-78+(p.thrown?Math.sin(p.flightTime*3)*3:0):0;
   const angle=(this.bodyAngles.get(p.id)??targetAngle)+(targetAngle-(this.bodyAngles.get(p.id)??targetAngle))*(1-Math.exp(-dt*12));this.bodyAngles.set(p.id,angle);
   el.querySelector<HTMLElement>('.garden-body')!.style.transform=`translateY(${-pos.z-bounce+seatOffset}px) rotate(${angle}deg) scale(${2-squash},${squash})`;
   el.querySelector<HTMLElement>('.garden-name')!.style.bottom=`${148+pos.z+bounce-seatOffset}px`;
   const prompt=el.querySelector<HTMLElement>('.garden-throw-prompt')!;prompt.hidden=p.id!==this.id||!p.carrying;prompt.style.bottom=`${300+pos.z}px`;
   const actions=el.querySelector<HTMLElement>('.garden-actions')!;actions.hidden=this.selectedTarget!==p.id;actions.querySelector<HTMLButtonElement>('.garden-hold')!.disabled=!own||!canGardenHold(own,p,players);actions.querySelector<HTMLButtonElement>('.garden-lift')!.disabled=!own||!canGardenLift(own,p);actions.style.bottom=`${192+pos.z+bounce-seatOffset}px`;
   el.classList.toggle('is-selected',this.selectedTarget===p.id);
   if(p.holdParent){const h=this.positions.get(p.holdParent);if(h)links+=`<path d="M${h.x} ${h.y-h.z-48} Q${(pos.x+h.x)/2} ${(pos.y+h.y)/2-Math.min(pos.z,h.z)-22} ${pos.x} ${pos.y-pos.z-48}"/>`;}
  }
  this.root.querySelector('.garden-links')!.innerHTML=`<svg viewBox="0 0 ${C.width} ${C.height}"><g fill="none" stroke="#fff4bd" stroke-width="5" stroke-linecap="round">${links}</g></svg>`;
  const escape=this.root.querySelector<HTMLElement>('.garden-escape')!;escape.hidden=!own?.holdParent;escape.querySelector('progress')!.value=own?.escape||0;
  if(own&&own.lastHold!==this.lastHold){this.lastHold=own.lastHold;if(own.lastHold>=0)this.status(own.holdResult?'牵住啦！队尾可以继续牵起朋友。':'暂时无法牵手，请靠近并重新选择对方。');}
  if((own?.carrying||null)!==this.lastCarrying){this.lastCarrying=own?.carrying||null;if(this.lastCarrying)this.status('举起来啦！移动鼠标瞄准，左键投掷 · Q 放下');else this.status('落地会自动躺下，移动或跳跃即可起身。');}
  this.frame=requestAnimationFrame(this.render);
 };
 destroy(){this.abort.abort();clearInterval(this.timer);cancelAnimationFrame(this.frame);this.socket.removeAllListeners();this.socket.disconnect();this.root.remove();document.body.classList.remove('garden-active');}
}
