import type {PlayerInput,Welcome,GameSnapshot} from './NetworkProtocol';
import type {CombatEvent} from './combat/CombatTypes';
import type {MBTIType} from './characters/CharacterDefinition';
export const DEFAULT_MAX_PLAYERS=8;
export const ABSOLUTE_MAX_PLAYERS=16;
export const LOBBY_COUNTDOWN_MS=30_000;
export const FULL_ROOM_COUNTDOWN_MS=5_000;
export type MatchPhase='LOBBY'|'COUNTDOWN'|'PLAYING'|'WINNER'|'RESULT'|'CANCELLED';
export interface PlayerIdentity {mbti:MBTIType;nickname:string}
export interface LobbyPlayer extends PlayerIdentity {id:string;slot:number;connected:boolean;joinedAt:number}
export interface MatchPlayer {id:string;alive:boolean;connected:boolean;hp:number;personality:number;kills:number;damageDealt:number;placement?:number;eliminationReason?:'killed'|'quit'|'disconnect';eliminatedAt?:number;killerId?:string}
export interface MatchState {startAt:number;protectionEnd:number;players:MatchPlayer[];winnerId?:string;draw:boolean}
export interface LobbyRoomState {id:string;maxPlayers:number;players:LobbyPlayer[];phase:MatchPhase;createdAt:number;lobbyCountdownEnd?:number;serverStartTimestamp?:number;serverNow:number;match?:MatchState}
export type LobbyErrorCode='INVALID_ROOM_ID'|'ROOM_NOT_FOUND'|'ROOM_FULL'|'MATCH_ALREADY_STARTED'|'INVALID_MBTI'|'INVALID_NICKNAME'|'ALREADY_IN_ROOM'|'NOT_IN_ROOM'|'RATE_LIMITED';
export type LobbyReply={ok:true;playerId:string;room:LobbyRoomState;inviteUrl:string;resumeToken:string}|{ok:false;code:LobbyErrorCode;message:string};
export interface LobbyClientEvents {
 'match:input':(input:PlayerInput)=>void;
 'room:resume':(request:{roomId:string;playerId:string;token:string},reply:(response:LobbyReply)=>void)=>void;
 'room:create':(identity:unknown,reply:(response:LobbyReply)=>void)=>void;
 'room:join':(request:unknown,reply:(response:LobbyReply)=>void)=>void;
 'room:leave':(reply:()=>void)=>void;
 'player:updateIdentity':(identity:unknown,reply:(response:LobbyReply)=>void)=>void;
}
export interface LobbyServerEvents {'room:update':(room:LobbyRoomState)=>void;'match:welcome':(welcome:Welcome)=>void;'match:snapshot':(snapshot:GameSnapshot)=>void;'match:combat':(events:CombatEvent[])=>void}
