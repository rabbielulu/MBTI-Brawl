import assert from 'node:assert/strict';
import {MatchSession} from '../server/lobby/MatchSession';
import {buildMatchResult} from '../server/lobby/MatchResults';
import {CELEBRATION_MS,VICTORY_LINES} from '../src/shared/MatchPresentation';
import {formatSurvival} from '../src/client/results/MatchConclusion';
import type {LobbyPlayer,MatchPlayer} from '../src/shared/LobbyProtocol';
const people=(n=3):LobbyPlayer[]=>Array.from({length:n},(_,slot)=>({id:`user-${slot}`,slot,mbti:'ENTP',nickname:slot===1?'<script>':'同名',connected:true,joinedAt:0}));
{
 const m=new MatchSession(people(),1000,8);m.step(3000);const [a,b,c]=[...m.game.players.values()];
 m.game.map.walls=[];m.game.map.mud=[];a.x=500;a.y=500;b.x=600;b.y=500;c.x=1100;c.y=600;
 m.input(a.id,{seq:1,moveX:0,moveY:1,aimAngle:0,basicAttackPressed:false,skillPressed:true,ultimatePressed:false});m.step(3034);
 assert.equal(m.players.get(a.id)!.skillUses,1);assert.ok(m.players.get(a.id)!.distanceMoved!>0);
 m.game.damage(a,b,1000,0,0);m.step(3067);assert.equal(m.players.get(a.id)!.damageDealt,100);assert.equal(m.players.get(b.id)!.damageTaken,100);assert.equal(m.players.get(a.id)!.attackTargets![b.id],1);assert.equal(m.players.get(b.id)!.survivalMs,2067);
 m.quit(c.id,4000);assert.equal(m.phase,'WINNER');assert.equal(m.endedAt,4000);assert.equal(m.resultAt,4000+CELEBRATION_MS);assert.equal(m.result!.players[0].id,a.id);assert.equal(m.result!.players[0].survivalMs,3000);
 assert.equal(m.result!.players.find(p=>p.id===c.id)!.kills,0);assert.equal(m.result!.players.find(p=>p.id===b.id)!.nickname,'<script>');
 const frozen=JSON.stringify(m.result),tick=m.game.tick;m.quit(a.id,4100);assert.equal(m.phase,'WINNER');assert.equal(m.winnerId,a.id,'Champion leaving cannot change final winner');m.step(7999);assert.equal(m.phase,'WINNER');m.step(8000);assert.equal(m.phase,'RESULT');assert.equal(m.game.tick,tick);assert.equal(JSON.stringify(m.result),frozen);
 const copy=m.snapshot();copy.result!.players[0].kills=999;assert.equal(JSON.stringify(m.result),frozen,'Result snapshots deep-copy');copy.players[0].attackTargets!['fake']=99;assert.equal(m.players.get(a.id)!.attackTargets!['fake'],undefined);
}
{
 const identities=people(2),stats=new Map<string,MatchPlayer>(identities.map(p=>[p.id,{id:p.id,alive:false,connected:true,hp:0,personality:0,kills:2,damageDealt:100,placement:2,damageTaken:100,distanceMoved:40,attackTargets:{other:3}}]));
 const result=buildMatchResult(identities,stats,0,2000,undefined,true);assert.equal(result.draw,true);assert.equal(result.winnerId,undefined);assert.equal(result.awards.length,5);assert.ok(result.awards.every(a=>a.playerIds.length===2),'All positive ties share awards');
 for(const p of stats.values()){p.kills=0;p.damageDealt=0;p.damageTaken=0;p.distanceMoved=0;p.attackTargets={};}assert.equal(buildMatchResult(identities,stats,0,2000,undefined,true).awards.length,0,'Zero metrics do not create fake awards');
}
{
 const m=new MatchSession(people(2),1000,8);m.disconnect('user-0',2000);m.disconnect('user-1',2000);m.step(2000);assert.equal(m.phase,'CANCELLED');assert.equal(m.result,undefined);m.step(10000);assert.equal(m.phase,'CANCELLED');
 const draw=new MatchSession(people(2),0,8);draw.step(2000);const [a,b]=[...draw.game.players.values()];draw.game.damage(a,b,999,0,0);draw.game.damage(b,a,999,0,0);draw.step(2034);assert.equal(draw.result!.draw,true);assert.equal(draw.result!.winnerId,undefined);draw.step(6034);assert.equal(draw.phase,'RESULT');
}
assert.equal(Object.keys(VICTORY_LINES).length,16);assert.equal(formatSurvival(201000),'03:21');assert.equal(formatSurvival(-100),'00:00');
console.log('PASS M4: authoritative 4s/result, real damage/taken/movement/skill/hit statistics, survival/placement, positive ties/zero awards, frozen winner on exit, deep copies, cancel/no result and draw.');
