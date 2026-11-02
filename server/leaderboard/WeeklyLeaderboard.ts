import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import type {MatchResult} from '../../src/shared/LobbyProtocol';
import type {WeeklyLeaderboardData} from '../../src/shared/Leaderboard';
export type Win={matchId:string;endedAt:number;nickname:string;mbti:string};
const DAY=86400000,OFFSET=8*3600000;
/** Beijing Monday 00:00, independent of the machine timezone. */
export function weekBounds(now:number){const date=new Date(now+OFFSET);date.setUTCHours(0,0,0,0);const start=date.getTime()-((date.getUTCDay()+6)%7)*DAY-OFFSET;return {start,end:start+7*DAY};}
export class WeeklyLeaderboard {
 private wins:Win[]=[];private recorded=new Set<string>();
 constructor(private path?:string){
  if(path&&existsSync(path)){const saved=JSON.parse(readFileSync(path,'utf8'));if(saved.version!==1||!Array.isArray(saved.wins)||saved.wins.some((w:any)=>typeof w.matchId!=='string'||!Number.isFinite(w.endedAt)||typeof w.nickname!=='string'||typeof w.mbti!=='string'))throw Error('Invalid leaderboard data; preserve the file and restore from backup.');this.wins=saved.wins;this.recorded=new Set(this.wins.map(w=>w.matchId));}
 }
 record(matchId:string,result:MatchResult,practice=false){
  if(practice||result.draw||result.endedAt<result.startedAt||this.recorded.has(matchId))return false;
  const winner=result.players.find(p=>p.id===result.winnerId);if(!winner||winner.bot)return false;
  const next=[...this.wins,{matchId,endedAt:result.endedAt,nickname:winner.nickname.normalize('NFC').trim(),mbti:winner.mbti}];
  // Commit atomically before mutating memory. A failed write can be retried without losing a win.
  if(this.path){mkdirSync(dirname(this.path),{recursive:true});const temp=this.path+'.tmp';writeFileSync(temp,JSON.stringify({version:1,wins:next}));renameSync(temp,this.path);}
  this.wins=next;this.recorded.add(matchId);return true;
 }
 allWins():readonly Win[]{return this.wins;}
 weekly(now=Date.now()):WeeklyLeaderboardData{
  return summarizeWins(this.wins,now);
 }
}

export function summarizeWins(wins:readonly Win[],now=Date.now()):WeeklyLeaderboardData{
  const {start,end}=weekBounds(now),players=new Map<string,{nickname:string;wins:number;mbti:string;lastWin:number}>();
  for(const win of wins)if(win.endedAt>=start&&win.endedAt<end){const p=players.get(win.nickname)||{nickname:win.nickname,wins:0,mbti:win.mbti,lastWin:0};p.wins++;if(win.endedAt>=p.lastWin){p.mbti=win.mbti;p.lastWin=win.endedAt;}players.set(win.nickname,p);}
  const sorted=[...players.values()].sort((a,b)=>b.wins-a.wins||a.nickname.localeCompare(b.nickname,'zh-CN'));let rank=0;
  return {weekStart:new Date(start).toISOString(),weekEnd:new Date(end).toISOString(),totalPlayers:sorted.length,entries:sorted.slice(0,100).map((p,i)=>{if(i===0||p.wins!==sorted[i-1].wins)rank=i+1;return {rank,nickname:p.nickname,wins:p.wins,mbti:p.mbti};})};
}
