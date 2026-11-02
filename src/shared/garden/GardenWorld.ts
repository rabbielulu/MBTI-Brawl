import {GARDEN as C,gardenInput,canGardenHold,canGardenLift,type GardenInput,type GardenPlayer,type GardenSnapshot} from './GardenConfig';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export class GardenWorld {
 time=0;players=new Map<string,GardenPlayer>();
 private inputs=new Map<string,{value:GardenInput;at:number}>();
 add(id:string,nickname:string,mbti:string){
  if(this.players.size>=C.maxPlayers)return;
  const p:GardenPlayer={id,nickname,mbti,x:500+(this.players.size%6)*85,y:590+Math.floor(this.players.size/6)*80,z:0,vz:0,facing:1,carriedBy:null,carrying:null,thrown:false,flightTime:0,vx:0,vy:0,landedUntil:0,holdParent:null,holdChild:null,waveUntil:0,idle:0,lying:false,sitting:false,escape:0,moving:false,lastHold:-10,holdResult:false};
  this.players.set(id,p);return p;
 }
 remove(id:string){const p=this.players.get(id);if(!p)return;this.dropCarry(p);this.detachHands(p);if(p.holdChild){const child=this.players.get(p.holdChild);if(child)child.holdParent=null;}this.players.delete(id);this.inputs.delete(id);this.shakeTimes.delete(id);}
 input(id:string,raw:GardenInput){
  if(!this.players.has(id)||!raw||typeof raw!=='object')return;
  const prev=this.inputs.get(id)?.value;
  this.inputs.set(id,{at:this.time,value:{x:clamp(Number(raw.x)||0,-1,1),y:clamp(Number(raw.y)||0,-1,1),jump:!!raw.jump||!!prev?.jump,sit:!!raw.sit||!!prev?.sit,releaseHold:!!raw.releaseHold||!!prev?.releaseHold,liftTarget:typeof raw.liftTarget==='string'&&raw.liftTarget.length<=100?raw.liftTarget:prev?.liftTarget||null,throwNow:!!raw.throwNow||!!prev?.throwNow,aimX:Number.isFinite(raw.aimX)?clamp(raw.aimX,-1,1):1,aimY:Number.isFinite(raw.aimY)?clamp(raw.aimY,-1,1):0,wave:!!raw.wave||!!prev?.wave,holdTarget:typeof raw.holdTarget==='string'&&raw.holdTarget.length<=100?raw.holdTarget:prev?.holdTarget||null,shake:Math.max(-1,Math.min(1,Number(raw.shake)||0)),active:!!raw.active}});
 }
 private breakHold(p:GardenPlayer){if(p.holdParent){const parent=this.players.get(p.holdParent);if(parent)parent.holdChild=null;}p.holdParent=null;p.escape=0;this.shakeTimes.delete(p.id);}
 private detachHands(p:GardenPlayer){this.breakHold(p);if(p.holdChild){const child=this.players.get(p.holdChild);if(child)this.breakHold(child);p.holdChild=null;}}
 private dropCarry(p:GardenPlayer){
  if(p.carriedBy){const carrier=this.players.get(p.carriedBy);if(carrier)carrier.carrying=null;p.carriedBy=null;p.thrown=true;p.flightTime=0;p.vz=0;}
  if(p.carrying){const child=this.players.get(p.carrying);if(child){child.carriedBy=null;child.thrown=true;child.flightTime=0;child.vz=0;}p.carrying=null;}
 }
 private shakeTimes=new Map<string,{direction:number;time:number}>();
 step(dt=1/C.tickRate){
  dt=Math.min(dt,0.05);this.time+=dt;
  const gravity=8*C.JumpHeight/(C.JumpDuration*C.JumpDuration)*C.AirFloatFactor;
  const jumpSpeed=Math.sqrt(2*gravity*C.JumpHeight);
  for(const p of this.players.values()){
   const entry=this.inputs.get(p.id),i=entry&&this.time-entry.at<C.inputTimeout?entry.value:gardenInput();
   if(i.releaseHold&&(p.carriedBy||p.carrying)){this.dropCarry(p);i.releaseHold=false;}
   const airborne=p.thrown||!!p.carriedBy,resting=this.time<p.landedUntil;
   if(airborne||resting){i.x=0;i.y=0;i.jump=false;i.sit=false;i.holdTarget=null;i.liftTarget=null;}
   if(p.carrying)i.sit=false;
   const moving=!!(i.x||i.y);p.moving=moving&&!p.holdParent;
   if(moving||i.jump||i.sit||i.releaseHold||i.wave||i.holdTarget||i.liftTarget||i.throwNow||i.shake||i.active)p.idle=0;else p.idle+=dt;
   if(i.sit&&!moving&&!i.jump&&!p.holdParent&&p.z===0){p.sitting=!p.sitting;p.lying=false;}
   if(moving||i.jump||p.holdParent||airborne){p.lying=false;p.sitting=false;}
   else if(!p.sitting&&!p.carrying&&p.idle>C.IdleToLyingTime)p.lying=true;
   if(i.wave&&this.time>=p.waveUntil-C.WaveDuration+C.WaveCooldown)p.waveUntil=this.time+C.WaveDuration;
   if(!p.holdParent&&!airborne&&!resting){const n=Math.max(1,Math.hypot(i.x,i.y));p.x+=i.x/n*C.GardenMoveSpeed*dt;p.y+=i.y/n*C.GardenMoveSpeed*dt;if(i.x)p.facing=Math.sign(i.x);}
   if(i.jump&&!airborne&&!p.holdParent&&p.vz===0){p.vz=jumpSpeed;p.lying=false;}
   if(i.liftTarget){const q=this.players.get(i.liftTarget);if(q&&canGardenLift(p,q)){
    this.detachHands(p);this.detachHands(q);p.carrying=q.id;q.carriedBy=p.id;
    p.lying=false;p.sitting=false;q.lying=false;q.sitting=false;q.waveUntil=0;q.vx=0;q.vy=0;q.vz=0;
   }}
   if(i.throwNow&&p.carrying){const q=this.players.get(p.carrying);if(q){
    const length=Math.hypot(i.aimX,i.aimY),dx=length>.01?i.aimX/length:p.facing,dy=length>.01?i.aimY/length:0;
    q.x=p.x;q.y=p.y;q.z=p.z+C.LiftHeight;q.carriedBy=null;q.thrown=true;q.flightTime=0;
    q.vx=dx*C.ThrowSpeed;q.vy=dy*C.ThrowSpeed;q.vz=C.ThrowLiftSpeed;q.idle=0;
   }p.carrying=null;}
   if(i.releaseHold){
    if(p.holdParent)this.breakHold(p);
    else if(p.holdChild){const child=this.players.get(p.holdChild);if(child)this.breakHold(child);else p.holdChild=null;}
    i.holdTarget=null;
   }
   if(i.holdTarget&&this.time-p.lastHold>0.22){
    p.lastHold=this.time;p.holdResult=false;const q=this.players.get(i.holdTarget);
    if(q&&canGardenHold(p,q,this.players)){q.holdParent=p.id;p.holdChild=q.id;q.lying=false;q.sitting=false;q.escape=0;p.holdResult=true;}
   }
   if(p.holdParent){
    const s=this.shakeTimes.get(p.id);if(i.shake){if(s&&s.direction!==i.shake&&this.time-s.time<C.EscapeAlternationWindow)p.escape+=C.EscapeProgressSpeed;this.shakeTimes.set(p.id,{direction:i.shake,time:this.time});}
    p.escape=Math.max(0,p.escape-C.EscapeProgressDecay*dt);
    if(p.escape>=1){this.breakHold(p);p.x+=p.facing*24;p.vz=jumpSpeed*.3;}
   }else p.escape=0;
   if(!p.thrown){p.x=clamp(p.x,C.margin,C.width-C.margin);p.y=clamp(p.y,C.minY,C.maxY);}
   i.jump=false;i.sit=false;i.releaseHold=false;i.wave=false;i.holdTarget=null;i.liftTarget=null;i.throwNow=false;i.shake=0;i.active=false;
  }
  // Solve dependencies from roots, irrespective of socket join order.
  const resolved=new Set<string>();
  const solve=(p:GardenPlayer)=>{
   if(resolved.has(p.id))return;resolved.add(p.id);
   const carrier=this.players.get(p.carriedBy||'');
   if(carrier){solve(carrier);p.x=carrier.x;p.y=carrier.y;p.z=carrier.z+C.LiftHeight;p.vz=0;p.moving=false;return;}
   if(p.thrown){
    p.flightTime+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-C.ThrowDrag*dt);p.vy*=Math.exp(-C.ThrowDrag*dt);
    if(p.x<C.margin||p.x>C.width-C.margin){p.x=clamp(p.x,C.margin,C.width-C.margin);p.vx=-p.vx*C.ThrowBounce;}
    if(p.y<C.minY||p.y>C.maxY){p.y=clamp(p.y,C.minY,C.maxY);p.vy=-p.vy*C.ThrowBounce;}
    p.vz-=C.ThrowGravity*dt;p.z+=p.vz*dt;
    if(p.z<=0){p.z=0;p.vz=0;p.vx=0;p.vy=0;p.thrown=false;p.lying=true;p.sitting=false;p.moving=false;p.idle=0;p.landedUntil=this.time+C.ThrowLandingRest;}
    return;
   }
   const h=this.players.get(p.holdParent||'');
   if(h){solve(h);const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy),stretch=Math.max(0,d-C.HoldFollowDistance);if(d){p.x-=dx/d*stretch*Math.min(1,dt/(C.HoldFollowDelay+1/C.HoldElasticity));p.y-=dy/d*stretch*Math.min(1,dt/(C.HoldFollowDelay+1/C.HoldElasticity));}p.z+=(h.z-p.z)*Math.min(1,dt/C.HoldFollowDelay);p.vz=0;p.moving=stretch>2;}
   else {p.vz-=gravity*dt;p.z+=p.vz*dt;
    if(p.z<=0){p.z=0;p.vz=0;}
   }
  };for(const p of this.players.values())solve(p);
 }
 snapshot():GardenSnapshot{return {time:this.time,players:[...this.players.values()].map(p=>({...p}))};}
}
