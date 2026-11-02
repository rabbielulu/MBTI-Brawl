import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SupabaseLeaderboard} from '../server/leaderboard/SupabaseLeaderboard';
import {MatchSession} from '../server/lobby/MatchSession';
const folder=mkdtempSync(join(tmpdir(),'brawl-cloud-')),path=join(folder,'wins.json');
const original=globalThis.fetch,rows=new Map<string,any>();let fail=false,posts=0;
globalThis.fetch=async(input,init)=>{
 const url=new URL(String(input));assert.equal(new Headers(init?.headers).get('apikey'),'test-secret');
 if(fail)return new Response('',{status:503});
 if(init?.method==='POST'){
  posts++;for(const row of JSON.parse(String(init.body)))if(!rows.has(row.match_id))rows.set(row.match_id,row);
  return new Response(null,{status:201});
 }
 const start=Date.parse(url.searchParams.get('ended_at')!.slice(4));
 const end=Date.parse(url.searchParams.get('and')!.slice(13,-1));
 const filtered=[...rows.values()].filter(w=>Date.parse(w.ended_at)>=start&&Date.parse(w.ended_at)<end).sort((a,b)=>a.match_id.localeCompare(b.match_id));
 const offset=Number(url.searchParams.get('offset'));
 // Simulate a server configured with a smaller maximum page size.
 return Response.json(filtered.slice(offset,offset+2));
};
let board:SupabaseLeaderboard|undefined;
try{
 const now=Date.now(),match=new MatchSession([{id:'a',slot:0,mbti:'ENTP',nickname:'云端冠军',connected:true,joinedAt:0},{id:'b',slot:1,mbti:'INFP',nickname:'对手',connected:true,joinedAt:0}],now-1000,8);
 match.step(now-1000);match.quit('b',now);const result=match.result!;
 board=new SupabaseLeaderboard(path,'https://example.supabase.co','test-secret');await board.sync();
 assert.equal(board.record('one',result),true);await board.sync();assert.equal(rows.size,1);
 assert.equal(board.record('one',result),false);assert.equal(board.record('practice',result,true),false);
 fail=true;assert.equal(board.record('two',result),true);await assert.rejects(board.sync());board.close();
 board=new SupabaseLeaderboard(path,'https://example.supabase.co','test-secret');await assert.rejects(board.sync());
 fail=false;await board.sync();assert.equal(rows.size,2);assert.ok(posts>=2);
 rows.set('external',{match_id:'external',ended_at:new Date(now).toISOString(),nickname:'另一个服务器',mbti:'INFP'});
 const weekly=await board.weeklyOnline(now);assert.equal(weekly.totalPlayers,2);assert.equal(weekly.entries[0].wins,2);
 assert.equal((await board.weeklyOnline(now+7*86400000)).entries.length,0);
 console.log('PASS Supabase: durable outage/restart recovery, idempotent import, external server wins, pagination, week bounds, practice exclusion.');
}finally{board?.close();globalThis.fetch=original;rmSync(folder,{recursive:true,force:true});}
