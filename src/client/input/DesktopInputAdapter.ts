import {character} from '../../characters';
import {idleInput,type InputAdapter,type InputIntent} from './InputAdapter';
export class DesktopInputAdapter implements InputAdapter {
 cooldownMs=character.basicAttack.cooldownMs;nextAttack=0;skill=false;ultimate=false;
 constructor(private state:()=>{moveX:number;moveY:number;attack:boolean}){}
 clear(){this.skill=false;this.ultimate=false;this.nextAttack=0;}
 read(now:number,aimAngle:number,enabled:boolean):InputIntent {
  if(!enabled){this.clear();return idleInput(aimAngle);}
  const state=this.state(),length=Math.max(1,Math.hypot(state.moveX,state.moveY));
  const basicAttackPressed=state.attack&&now>=this.nextAttack;
  if(basicAttackPressed)this.nextAttack=now+this.cooldownMs;
  const input={...idleInput(aimAngle),moveX:state.moveX/length,moveY:state.moveY/length,basicAttackPressed,skillPressed:this.skill,ultimatePressed:this.ultimate};
  this.skill=false;this.ultimate=false;return input;
 }
}
