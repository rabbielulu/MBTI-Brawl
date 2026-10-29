import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {io} from 'socket.io-client';
import {WeeklyLeaderboard,weekBounds} from '../server/leaderboard/WeeklyLeaderboard';
import {MatchSession} from '../server/lobby/MatchSession';
import {startServer} from '../server/GameServer';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
const folder=mkdtempSync(join(tmpdir(),'mbti-weekly-')),path=join(folder,'wins.json');
const monday=Date.parse('2026-10-26T00:00:00+08:00'),now=monday+3600000;
assert.equal(weekBounds(monday).start,monday);assert.equal(weekBounds(monday-1).end,monday);assert.equal(weekBounds(monday+7*86400000).start,monday+7*86400000);
const identities=[{id:'a',slot:0,mbti:'ENTP' as const,nickname:'冠军<script>',connected:true,joinedAt:0},{id:'b',slot:1,mbti:'INFP' as const,nickname:'乙',connected:true,joinedAt:0}];
const match=new MatchSession(identities,now-1000,8);match.step(now-1000);match.quit('b',now);const result=match.result!;
const board=new WeeklyLeaderboard(path);assert.equal(board.record('1',result),true);assert.equal(board.record('1',result),false);assert.equal(board.record('2',result,true),false);assert.equal(board.record('3',{...result,draw:true}),false);assert.equal(board.record('4',{...result,players:result.players.map(p=>({...p,bot:true}))}),false);assert.equal(board.record('5',{...result,endedAt:result.startedAt-1}),false);
board.record('6',result);board.record('7',{...result,winnerId:'b'});const read=new WeeklyLeaderboard(path);assert.deepEqual(read.weekly(now).entries.map(p=>p.wins),[2,1]);assert.equal(read.weekly(now+7*86400000).entries.length,0);assert.equal(read.record('1',result),false,'Duplicate ledger survives restart');
read.record('8',{...result,winnerId:'b'});assert.deepEqual(read.weekly(now).entries.map(p=>p.rank),[1,1]);assert.equal(read.weekly(now).entries[0].wins,2);
const host=startServer(0,{leaderboardPath:join(folder,'network.json')}),clients:any[]=[];
try{
 await once(host.http,'listening');const port=(host.http.address() as any).port;
 const connect=async()=>{const c=io(`http://127.0.0.1:${port}/lobby`,{auth:{protocolVersion:PROTOCOL_VERSION},autoConnect:false,reconnection:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const request=(c:any,event:string,payload:any={})=>new Promise<any>((resolve,reject)=>c.timeout(2000).emit(event,payload,(err:any,r:any)=>err?reject(err):resolve(r)));
 const a=await connect(),b=await connect(),made=await request(a,'room:create',{mbti:'ENTP',nickname:'周榜测试'});await request(b,'room:join',{roomId:made.room.id,identity:{mbti:'INFP',nickname:'对手'}});await request(a,'room:debugStart');const room=host.lobby.get(made.room.id),deadline=Date.now()+6000;while(room.phase!=='PLAYING'){assert.ok(Date.now()<deadline);await new Promise(r=>setTimeout(r,20));}
 await new Promise<void>(r=>b.emit('room:leave',r));assert.equal(room.phase,'WINNER');await new Promise<void>(r=>a.emit('room:leave',r));
 const response=await fetch(`http://127.0.0.1:${port}/api/leaderboard/weekly`);assert.equal(response.status,200);const data=await response.json();assert.equal(data.entries.length,1);assert.equal(data.entries[0].nickname,'周榜测试');assert.equal(data.entries[0].wins,1);assert.equal(new WeeklyLeaderboard(join(folder,'network.json')).weekly().entries[0].wins,1);
 console.log('PASS weekly leaderboard: Beijing Monday boundary, win ordering/ties, practice/draw/bot/pre-start exclusions, durable exactly-once wins, week rollover, real multiplayer win+leave recording and public API.');
}finally{clients.forEach(c=>c.disconnect());host.close();rmSync(folder,{recursive:true,force:true});}
