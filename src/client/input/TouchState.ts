import {idleInput,type InputAdapter} from './InputAdapter';
import {TOUCH} from './TouchConfig';
type Stick={pointer:number|null;x:number;y:number};
export type StickName='move'|'aim'|'skill';
/** Device-independent pointer ownership and edge events, shared by mouse/touch/pen. */
export class TouchState implements InputAdapter {
 move:Stick={pointer:null,x:0,y:0};aim:Stick={pointer:null,x:0,y:0};skill:Stick={pointer:null,x:0,y:0};
 attackCount=0;skillCount=0;ultimateCount=0;
 targetDistance=1;angle=-Math.PI/2;attackPressed=false;skillPressed=false;ultimatePressed=false;
 begin(name:StickName,pointer:number){const stick=this[name];if(stick.pointer!==null)return false;stick.pointer=pointer;stick.x=0;stick.y=0;return true;}
 drag(name:StickName,pointer:number,x:number,y:number){const stick=this[name];if(stick.pointer!==pointer)return;const length=Math.max(1,Math.hypot(x,y));stick.x=x/length;stick.y=y/length;if(name!=='move'&&Math.hypot(stick.x,stick.y)>=TOUCH.aimDeadZone){this.angle=Math.atan2(stick.y,stick.x);if(name==='skill')this.targetDistance=Math.min(1,Math.hypot(stick.x,stick.y));}}
 end(name:StickName,pointer:number,cancel=false){const stick=this[name];if(stick.pointer!==pointer)return;
  if(!cancel&&Math.hypot(stick.x,stick.y)>=TOUCH.aimDeadZone){if(name==='aim')this.attackPressed=true;if(name==='skill')this.skillPressed=true;}
  stick.pointer=null;stick.x=0;stick.y=0;
 }
 clear(){for(const name of ['move','aim','skill'] as const){this[name].pointer=null;this[name].x=0;this[name].y=0;}this.attackPressed=false;this.skillPressed=false;this.ultimatePressed=false;}
 get aiming(){return [this.aim,this.skill].some(s=>s.pointer!==null&&Math.hypot(s.x,s.y)>=TOUCH.aimDeadZone);}
 read(_now:number,aimAngle:number,enabled:boolean){
  if(!enabled){this.clear();return idleInput(aimAngle);}
  const magnitude=Math.hypot(this.move.x,this.move.y),moving=magnitude>=TOUCH.deadZone;
  const value={...idleInput(this.angle),moveX:moving?this.move.x:0,moveY:moving?this.move.y:0,basicAttackPressed:this.attackPressed,skillPressed:this.skillPressed,ultimatePressed:this.ultimatePressed};
  if(this.attackPressed)this.attackCount++;if(this.skillPressed)this.skillCount++;if(this.ultimatePressed)this.ultimateCount++;
  this.attackPressed=false;this.skillPressed=false;this.ultimatePressed=false;return value;
 }
}
