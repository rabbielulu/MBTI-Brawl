import {MatchSession} from './MatchSession';
import {randomUUID} from 'node:crypto';
import {isPlayable,PLAYABLE_TYPES} from '../../src/shared/characters/CharacterDatabase';
import {DEFAULT_MAX_PLAYERS,ABSOLUTE_MAX_PLAYERS,LOBBY_COUNTDOWN_MS,FULL_ROOM_COUNTDOWN_MS,type LobbyPlayer,type LobbyRoomState,type PlayerIdentity,type MatchPhase,type LobbyErrorCode} from '../../src/shared/LobbyProtocol';
export class LobbyError extends Error {constructor(readonly code:LobbyErrorCode,message:string){super(message);}}
export function validateIdentity(value:unknown):PlayerIdentity {
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 if(!isPlayable(v.mbti))throw new LobbyError('INVALID_MBTI','请选择有效的 16 型 MBTI 人格。');
 if(typeof v.nickname!=='string'||!v.nickname.trim()||Array.from(v.nickname.trim()).length>12||/[\u0000-\u001f\u007f]/.test(v.nickname))throw new LobbyError('INVALID_NICKNAME','昵称请输入 1–12 个字符。');
 return {mbti:v.mbti,nickname:v.nickname.trim()};
}
export function validateRoomId(value:unknown):string {
 if(typeof value!=='string'||!(/^[A-HJ-NP-Z2-9]{4}$/).test(value.trim().toUpperCase()))throw new LobbyError('INVALID_ROOM_ID','房间号应为 4 位字母或数字，请检查邀请链接。');
 return value.trim().toUpperCase();
}
export class LobbyRoom {
 mode:'brawl'|'practice'='brawl';
 match?:MatchSession;
 private previousResult?:number;private rematchLobby=false;private round=0;
 players=new Map<string,LobbyPlayer>();phase:MatchPhase='LOBBY';lobbyCountdownEnd?:number;serverStartTimestamp?:number;
 constructor(readonly id:string,readonly createdAt:number,readonly maxPlayers=DEFAULT_MAX_PLAYERS){if(!Number.isInteger(maxPlayers)||maxPlayers<2||maxPlayers>ABSOLUTE_MAX_PLAYERS)throw new Error('Invalid room capacity');}
 join(identity:PlayerIdentity,now:number,bot=false){
  this.step(now);
  if(this.mode==='practice'&&!bot&&[...this.players.values()].some(p=>!p.bot))throw new LobbyError('MATCH_ALREADY_STARTED','这是独立试炼场，请在模式菜单创建自己的试炼。');
  if(this.phase!=='LOBBY')throw new LobbyError('MATCH_ALREADY_STARTED','本局已经开始准备，暂时不能加入。请创建新房间。');
  if(this.players.size>=this.maxPlayers)throw new LobbyError('ROOM_FULL','房间已满，请等朋友退出或创建新房间。');
  const occupied=new Set([...this.players.values()].map(p=>p.slot));const slot=Array.from({length:this.maxPlayers},(_,i)=>i).find(i=>!occupied.has(i))!;
  const p:LobbyPlayer={...identity,id:randomUUID(),slot,connected:true,joinedAt:now,...(bot?{bot:true}:{})};this.players.set(p.id,p);this.step(now);return p;
 }
 rematch(endedAt:unknown,now:number){
  this.step(now);
  if(typeof endedAt!=='number'||!Number.isFinite(endedAt))throw new LobbyError('MATCH_ALREADY_STARTED','结算信息已失效，请刷新房间状态。');
  if(this.previousResult===endedAt)return;
  if(this.phase!=='RESULT'||this.match?.result?.endedAt!==endedAt)throw new LobbyError('MATCH_ALREADY_STARTED','请等待本局结算后再来一局。');
  this.previousResult=endedAt;this.round++;this.rematchLobby=true;
  for(const [id,p] of this.players)if(!p.connected)this.players.delete(id);
  this.match=undefined;this.phase='LOBBY';this.serverStartTimestamp=undefined;this.lobbyCountdownEnd=undefined;this.step(now);
 }
 debugStart(now:number){this.step(now);if(this.phase!=='LOBBY')throw new LobbyError('MATCH_ALREADY_STARTED','本局已进入开局流程，无需重复开始。');if(this.players.size<2)throw new LobbyError('NOT_ENOUGH_PLAYERS','至少需要 2 人，先按 N 添加机器人或邀请朋友。');this.lobbyCountdownEnd=now;this.step(now);}
 addBot(now:number){const number=[...this.players.values()].filter(p=>p.bot).length+1;return this.join({mbti:PLAYABLE_TYPES[Math.floor(Math.random()*PLAYABLE_TYPES.length)],nickname:`机器人${String(number).padStart(2,'0')}`},now,true);}
 resetPractice(now:number){if(this.mode!=='practice')throw new LobbyError('MATCH_ALREADY_STARTED','多人比赛不能使用试炼重置。');this.round++;this.lobbyCountdownEnd=undefined;this.phase='COUNTDOWN';this.serverStartTimestamp=now+1000;this.match=new MatchSession([...this.players.values()].filter(p=>p.connected),this.serverStartTimestamp,this.maxPlayers,true);this.match.game.round=this.round;}
 update(id:string,identity:PlayerIdentity,now:number){if(this.mode==='practice'){const p=this.players.get(id);if(!p?.connected||p.bot)throw new LobbyError('NOT_IN_ROOM','试炼席位已失效。');Object.assign(p,identity);this.resetPractice(now);return;}this.step(now);if(this.phase!=='LOBBY')throw new LobbyError('MATCH_ALREADY_STARTED','已经进入开局准备，当前不能修改角色。');const p=this.players.get(id);if(!p)throw new LobbyError('NOT_IN_ROOM','你已离开房间，请重新加入。');Object.assign(p,identity);}
 remove(id:string,now:number){this.step(now);if(this.match){const player=this.players.get(id);if(player)player.connected=false;this.match.quit(id,now);}else this.players.delete(id);this.step(now);}
 step(now:number){
  const before=`${this.phase}:${this.lobbyCountdownEnd}`;
  if(this.phase==='LOBBY'){
   if(this.players.size<2)this.lobbyCountdownEnd=undefined;
   else {
    this.lobbyCountdownEnd??=now+LOBBY_COUNTDOWN_MS;
    if(!this.rematchLobby&&this.players.size===this.maxPlayers)this.lobbyCountdownEnd=Math.min(this.lobbyCountdownEnd,now+FULL_ROOM_COUNTDOWN_MS);
    if(now>=this.lobbyCountdownEnd){this.phase='COUNTDOWN';this.serverStartTimestamp=this.lobbyCountdownEnd+3000;this.match=new MatchSession([...this.players.values()],this.serverStartTimestamp,this.maxPlayers,this.mode==='practice');this.match.game.round=this.round;}
   }
  }
  if(this.match){this.match.step(now);this.phase=this.match.phase;}
  return before!==`${this.phase}:${this.lobbyCountdownEnd}`;
 }
 snapshot(now:number):LobbyRoomState{return {id:this.id,mode:this.mode,maxPlayers:this.maxPlayers,createdAt:this.createdAt,phase:this.phase,lobbyCountdownEnd:this.lobbyCountdownEnd,serverStartTimestamp:this.serverStartTimestamp,serverNow:now,match:this.match?.snapshot(),players:[...this.players.values()].sort((a,b)=>a.slot-b.slot).map(p=>({...p}))};}
}
