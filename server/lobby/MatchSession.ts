import {CELEBRATION_MS} from '../../src/shared/MatchPresentation';
import {buildMatchResult} from './MatchResults';
import {BotController} from '../bots/BotController';
import {GameRoom} from '../GameRoom';
import type {LobbyPlayer,MatchState,MatchPlayer,MatchPhase,MatchResult} from '../../src/shared/LobbyProtocol';
import type {PlayerInput} from '../../src/shared/NetworkProtocol';
export class MatchSession {
 readonly bots:Set<string>;private botController:BotController;
 readonly game:GameRoom;readonly players=new Map<string,MatchPlayer>();readonly grace=new Map<string,number>();
 private lastEventId=0;private identities:LobbyPlayer[];result?:MatchResult;endedAt?:number;resultAt?:number;
 phase:MatchPhase='COUNTDOWN';winnerId?:string;draw=false;
 constructor(players:LobbyPlayer[],readonly startAt:number,capacity:number,readonly practice=false,terrainOptions:import('../../src/terrain').TerrainOptions={}){
  this.identities=players.map(p=>({...p}));this.game=new GameRoom(capacity,{...terrainOptions,playerCount:players.length});
  for(const p of players){const actor=this.game.add(p.id,p.nickname,p.mbti,p.id)!;this.players.set(p.id,{id:p.id,alive:true,connected:p.connected,hp:actor.hp,personality:0,kills:0,damageDealt:0,damageTaken:0,distanceMoved:0,skillUses:0,ultimateUses:0,attackTargets:{}});}
  this.bots=new Set(players.filter(p=>p.bot).map(p=>p.id));this.botController=new BotController(this.game,this.bots);
  this.game.combatEnabled=false;
 }
 get protectionEnd(){return this.startAt;}
 input(id:string,input:PlayerInput){if(this.phase==='PLAYING'&&this.players.get(id)?.connected&&this.players.get(id)?.alive)this.game.input(id,input);}
 disconnect(id:string,now:number){const p=this.players.get(id);if(!p)return;p.connected=false;this.grace.set(id,now+10000);this.game.inputs.get(id)!.time=-Infinity;}
 reconnect(id:string){const p=this.players.get(id);if(p){p.connected=true;this.grace.delete(id);}}
 eliminate(id:string,reason:NonNullable<MatchPlayer['eliminationReason']>,now:number,killerId?:string){
  const p=this.players.get(id);if(!p?.alive)return;
  p.placement=[...this.players.values()].filter(v=>v.alive).length;p.alive=false;p.hp=0;p.eliminationReason=reason;p.eliminatedAt=now;p.survivalMs=Math.max(0,now-this.startAt);p.killerId=killerId;
  const actor=this.game.players.get(id)!;actor.alive=false;actor.hp=0;actor.dashSpeed=0;actor.velocityX=0;actor.velocityY=0;
  this.game.inputs.get(id)!.time=-Infinity;
  if(reason==='killed'&&killerId&&killerId!==id){const killer=this.players.get(killerId);if(killer)killer.kills++;}
 }
 quit(id:string,now:number){const p=this.players.get(id);if(p)p.connected=false;this.grace.delete(id);if(this.finished())return;this.eliminate(id,'quit',now);this.resolve(now);}
 resolve(now=Date.now()){
  if(this.finished())return;
  if(![...this.players.values()].some(p=>p.connected&&!this.bots.has(p.id))){this.phase='CANCELLED';this.winnerId=undefined;return;}
  if(this.practice)return;
  const alive=[...this.players.values()].filter(p=>p.alive);
  if(alive.length<=1){this.phase='WINNER';this.draw=alive.length===0;this.winnerId=alive[0]?.id;if(alive[0]){alive[0].placement=1;alive[0].survivalMs=Math.max(0,now-this.startAt);}
   this.endedAt=now;this.resultAt=now+CELEBRATION_MS;this.result=buildMatchResult(this.identities,this.players,this.startAt,now,this.winnerId,this.draw);}
 }
 private finished(){return this.phase==='WINNER'||this.phase==='RESULT'||this.phase==='CANCELLED';}
 step(now:number){
  if(this.phase==='WINNER'&&now>=this.resultAt!)this.phase='RESULT';
  if(this.finished())return;
  for(const [id,deadline] of this.grace)if(now>=deadline){this.grace.delete(id);this.eliminate(id,'disconnect',now);}
  this.resolve(now);if(this.finished())return;
  if(now<this.startAt)return;
  this.phase='PLAYING';this.game.combatEnabled=now>=this.protectionEnd;
  const before=new Map([...this.game.players.values()].map(p=>[p.id,{x:p.x,y:p.y}]));
  this.botController.update();this.game.step();
  for(const event of this.game.events){
   if(event.id<=this.lastEventId)continue;this.lastEventId=event.id;
   if(event.type==='damage'){const p=this.players.get(event.attackerId);if(p){p.damageDealt+=event.damage;p.attackTargets??={};p.attackTargets[event.targetId]=(p.attackTargets[event.targetId]||0)+1;}const victim=this.players.get(event.targetId);if(victim)victim.damageTaken=(victim.damageTaken||0)+event.damage;}
   if(event.type==='cast'&&!/^(idea|hobby|ponder)-[0-4]$/.test(event.skillId)){const p=this.players.get(event.attackerId);if(p){if(event.ultimate)p.ultimateUses=(p.ultimateUses||0)+1;else p.skillUses=(p.skillUses||0)+1;}}
   if(event.type==='death')this.eliminate(event.targetId,event.source==='environment'?'environment':'killed',now,event.source==='environment'?undefined:event.attackerId);
  }
  for(const [id,p] of this.players){const actor=this.game.players.get(id)!;p.hp=actor.hp;p.personality=actor.personality;const old=before.get(id)!;p.distanceMoved=(p.distanceMoved||0)+Math.hypot(actor.x-old.x,actor.y-old.y);}
  this.resolve(now);
 }
 snapshot():MatchState{return {startAt:this.startAt,protectionEnd:this.protectionEnd,players:[...this.players.values()].map(p=>({...p,attackTargets:{...p.attackTargets}})),winnerId:this.winnerId,draw:this.draw,endedAt:this.endedAt,resultAt:this.resultAt,result:this.result?structuredClone(this.result):undefined};}
}
