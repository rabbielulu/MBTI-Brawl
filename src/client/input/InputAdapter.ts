import type { PlayerInput } from '../../shared/NetworkProtocol';
export type InputIntent=Omit<PlayerInput,'seq'>;
export function idleInput(aimAngle:number):InputIntent {return {moveX:0,moveY:0,aimAngle,basicAttackPressed:false,skillPressed:false,ultimatePressed:false};}
export interface InputAdapter {clear():void;read(now:number,aimAngle:number,enabled:boolean):InputIntent}
