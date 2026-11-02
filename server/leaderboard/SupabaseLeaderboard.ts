import type {MatchResult} from '../../src/shared/LobbyProtocol';
import {WeeklyLeaderboard,weekBounds,summarizeWins,type Win} from './WeeklyLeaderboard';

/** Server-only REST client. The local ledger is a durable retry queue. */
export class SupabaseLeaderboard extends WeeklyLeaderboard {
 private pending=new Map<string,Win>();
 private running:Promise<void>|undefined;
 private timer:ReturnType<typeof setInterval>;
 private lastError=0;
 constructor(path:string,private url:string,private key:string){
  super(path);
  for(const win of this.allWins())this.pending.set(win.matchId,win);
  this.timer=setInterval(()=>void this.sync().catch(()=>{}),15000);this.timer.unref();
  void this.sync().catch(()=>{});
 }
 override record(id:string,result:MatchResult,practice=false){
  const saved=super.record(id,result,practice);
  if(saved){const win=this.allWins().at(-1)!;this.pending.set(id,win);void this.sync().catch(()=>{});}
  return saved;
 }
 private async request(path:string,init:RequestInit={}){
  const response=await fetch(`${this.url}/rest/v1/${path}`,{...init,headers:{apikey:this.key,...(this.key.startsWith('eyJ')?{Authorization:`Bearer ${this.key}`}:{ }),'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Supabase leaderboard request failed (${response.status}); check server credentials and database migration.`);
  return response;
 }
 sync():Promise<void>{
  if(this.running)return this.running;
  this.running=(async()=>{
   while(this.pending.size){
    const batch=[...this.pending.values()].slice(0,200);
    await this.request('brawl_wins?on_conflict=match_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(batch.map(w=>({match_id:w.matchId,ended_at:new Date(w.endedAt).toISOString(),nickname:w.nickname,mbti:w.mbti})))});
    for(const win of batch)this.pending.delete(win.matchId);
   }
  })().catch(error=>{if(Date.now()-this.lastError>60000){this.lastError=Date.now();console.error('Supabase unavailable; local wins retained for retry.',error.message);}throw error;}).finally(()=>{this.running=undefined;});
  return this.running;
 }
 async weeklyOnline(now=Date.now()){
  await this.sync();
  const {start,end}=weekBounds(now),wins=new Map<string,Win>();
  for(let offset=0;;){
   const query=new URLSearchParams({select:'match_id,ended_at,nickname,mbti',ended_at:`gte.${new Date(start).toISOString()}`,and:`(ended_at.lt.${new Date(end).toISOString()})`,order:'match_id.asc',limit:'500',offset:String(offset)});
   const rows=await (await this.request(`brawl_wins?${query}`)).json() as {match_id:string;ended_at:string;nickname:string;mbti:string}[];
   for(const row of rows)wins.set(row.match_id,{matchId:row.match_id,endedAt:Date.parse(row.ended_at),nickname:row.nickname,mbti:row.mbti});
   if(!rows.length)break;offset+=rows.length;
  }
  return summarizeWins([...wins.values()],now);
 }
 close(){clearInterval(this.timer);}
}
