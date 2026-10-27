import {MatchSession} from './MatchSession';
import {randomUUID} from 'node:crypto';
import {isPlayable} from '../../src/shared/characters/CharacterDatabase';
import {DEFAULT_MAX_PLAYERS,ABSOLUTE_MAX_PLAYERS,LOBBY_COUNTDOWN_MS,FULL_ROOM_COUNTDOWN_MS,type LobbyPlayer,type LobbyRoomState,type PlayerIdentity,type MatchPhase,type LobbyErrorCode} from '../../src/shared/LobbyProtocol';
export class LobbyError extends Error {constructor(readonly code:LobbyErrorCode,message:string){super(message);}}
export function validateIdentity(value:unknown):PlayerIdentity {
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 if(!isPlayable(v.mbti))throw new LobbyError('INVALID_MBTI','当前开放 ENTP、INFP、ESTJ、ESTP，请选择已开放的人格。');
 if(typeof v.nickname!=='string'||!v.nickname.trim()||Array.from(v.nickname.trim()).length>12||/[\u0000-\u001f\u007f]/.test(v.nickname))throw new LobbyError('INVALID_NICKNAME','昵称请输入 1–12 个字符。');
 return {mbti:v.mbti,nickname:v.nickname.trim()};
}
export function validateRoomId(value:unknown):string {
 if(typeof value!=='string'||!(/^[A-HJ-NP-Z2-9]{4}$/).test(value.trim().toUpperCase()))throw new LobbyError('INVALID_ROOM_ID','房间号应为 4 位字母或数字，请检查邀请链接。');
 return value.trim().toUpperCase();
}
export class LobbyRoom {
 match?:MatchSession;
 players=new Map<string,LobbyPlayer>();phase:MatchPhase='LOBBY';lobbyCountdownEnd?:number;serverStartTimestamp?:number;
 constructor(readonly id:string,readonly createdAt:number,readonly maxPlayers=DEFAULT_MAX_PLAYERS){if(!Number.isInteger(maxPlayers)||maxPlayers<2||maxPlayers>ABSOLUTE_MAX_PLAYERS)throw new Error('Invalid room capacity');}
 join(identity:PlayerIdentity,now:number){
  this.step(now);
  if(this.phase!=='LOBBY')throw new LobbyError('MATCH_ALREADY_STARTED','本局已经开始准备，暂时不能加入。请创建新房间。');
  if(this.players.size>=this.maxPlayers)throw new LobbyError('ROOM_FULL','房间已满，请等朋友退出或创建新房间。');
  const occupied=new Set([...this.players.values()].map(p=>p.slot));const slot=Array.from({length:this.maxPlayers},(_,i)=>i).find(i=>!occupied.has(i))!;
  const p:LobbyPlayer={...identity,id:randomUUID(),slot,connected:true,joinedAt:now};this.players.set(p.id,p);this.step(now);return p;
 }
 update(id:string,identity:PlayerIdentity,now:number){this.step(now);if(this.phase!=='LOBBY')throw new LobbyError('MATCH_ALREADY_STARTED','已经进入开局准备，当前不能修改角色。');const p=this.players.get(id);if(!p)throw new LobbyError('NOT_IN_ROOM','你已离开房间，请重新加入。');Object.assign(p,identity);}
 remove(id:string,now:number){this.step(now);if(this.match)this.match.quit(id,now);else this.players.delete(id);this.step(now);}
 step(now:number){
  const before=`${this.phase}:${this.lobbyCountdownEnd}`;
  if(this.phase==='LOBBY'){
   if(this.players.size<2)this.lobbyCountdownEnd=undefined;
   else {
    this.lobbyCountdownEnd??=now+LOBBY_COUNTDOWN_MS;
    if(this.players.size===this.maxPlayers)this.lobbyCountdownEnd=Math.min(this.lobbyCountdownEnd,now+FULL_ROOM_COUNTDOWN_MS);
    if(now>=this.lobbyCountdownEnd){this.phase='COUNTDOWN';this.serverStartTimestamp=this.lobbyCountdownEnd+3000;this.match=new MatchSession([...this.players.values()],this.serverStartTimestamp,this.maxPlayers);}
   }
  }
  if(this.match){this.match.step(now);this.phase=this.match.phase;}
  return before!==`${this.phase}:${this.lobbyCountdownEnd}`;
 }
 snapshot(now:number):LobbyRoomState{return {id:this.id,maxPlayers:this.maxPlayers,createdAt:this.createdAt,phase:this.phase,lobbyCountdownEnd:this.lobbyCountdownEnd,serverStartTimestamp:this.serverStartTimestamp,serverNow:now,match:this.match?.snapshot(),players:[...this.players.values()].sort((a,b)=>a.slot-b.slot).map(p=>({...p}))};}
}
