import {GameRoom} from '../GameRoom';
import type {LobbyPlayer,MatchState,MatchPlayer,MatchPhase} from '../../src/shared/LobbyProtocol';
import type {PlayerInput} from '../../src/shared/NetworkProtocol';
export class MatchSession {
 readonly game:GameRoom;readonly players=new Map<string,MatchPlayer>();readonly grace=new Map<string,number>();
 private lastEventId=0;
 phase:MatchPhase='COUNTDOWN';winnerId?:string;draw=false;
 constructor(players:LobbyPlayer[],readonly startAt:number,capacity:number){
  this.game=new GameRoom(capacity);
  for(const p of players){const actor=this.game.add(p.id,p.nickname,p.mbti,p.id)!;this.players.set(p.id,{id:p.id,alive:true,connected:p.connected,hp:actor.hp,personality:0,kills:0,damageDealt:0});}
  this.game.combatEnabled=false;
 }
 get protectionEnd(){return this.startAt+2000;}
 input(id:string,input:PlayerInput){if(this.phase==='PLAYING'&&this.players.get(id)?.connected&&this.players.get(id)?.alive)this.game.input(id,input);}
 disconnect(id:string,now:number){const p=this.players.get(id);if(!p)return;p.connected=false;this.grace.set(id,now+10000);this.game.inputs.get(id)!.time=-Infinity;}
 reconnect(id:string){const p=this.players.get(id);if(p){p.connected=true;this.grace.delete(id);}}
 eliminate(id:string,reason:NonNullable<MatchPlayer['eliminationReason']>,now:number,killerId?:string){
  const p=this.players.get(id);if(!p?.alive)return;
  p.placement=[...this.players.values()].filter(v=>v.alive).length;p.alive=false;p.hp=0;p.eliminationReason=reason;p.eliminatedAt=now;p.killerId=killerId;
  const actor=this.game.players.get(id)!;actor.alive=false;actor.hp=0;actor.dashSpeed=0;actor.velocityX=0;actor.velocityY=0;
  this.game.inputs.get(id)!.time=-Infinity;
  if(reason==='killed'&&killerId&&killerId!==id){const killer=this.players.get(killerId);if(killer)killer.kills++;}
 }
 quit(id:string,now:number){const p=this.players.get(id);if(p)p.connected=false;this.grace.delete(id);this.eliminate(id,'quit',now);this.resolve();}
 resolve(){
  if(![...this.players.values()].some(p=>p.connected)){this.phase='CANCELLED';this.winnerId=undefined;return;}
  if(this.phase==='WINNER'||this.phase==='CANCELLED')return;
  const alive=[...this.players.values()].filter(p=>p.alive);
  if(alive.length<=1){this.phase='WINNER';this.draw=alive.length===0;this.winnerId=alive[0]?.id;if(alive[0])alive[0].placement=1;}
 }
 private finished(){return this.phase==='WINNER'||this.phase==='CANCELLED';}
 step(now:number){
  if(this.phase==='WINNER'||this.phase==='CANCELLED')return;
  for(const [id,deadline] of this.grace)if(now>=deadline){this.grace.delete(id);this.eliminate(id,'disconnect',now);}
  this.resolve();if(this.finished())return;
  if(now<this.startAt)return;
  this.phase='PLAYING';this.game.combatEnabled=now>=this.protectionEnd;
  this.game.step();
  for(const event of this.game.events){
   if(event.id<=this.lastEventId)continue;this.lastEventId=event.id;
   if(event.type==='damage'){const p=this.players.get(event.attackerId);if(p)p.damageDealt+=event.damage;}
   if(event.type==='death')this.eliminate(event.targetId,'killed',now,event.attackerId);
  }
  for(const [id,p] of this.players){const actor=this.game.players.get(id)!;p.hp=actor.hp;p.personality=actor.personality;}
  this.resolve();
 }
 snapshot():MatchState{return {startAt:this.startAt,protectionEnd:this.protectionEnd,players:[...this.players.values()].map(p=>({...p})),winnerId:this.winnerId,draw:this.draw};}
}
