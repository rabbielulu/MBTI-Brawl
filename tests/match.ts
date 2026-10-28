import assert from 'node:assert/strict';
import {MatchSession} from '../server/lobby/MatchSession';
import {LobbyRoom} from '../server/lobby/LobbyRoom';
import {blocked} from '../src/rules';
import type {LobbyPlayer} from '../src/shared/LobbyProtocol';
import type {PlayerInput} from '../src/shared/NetworkProtocol';
const players=(n:number):LobbyPlayer[]=>Array.from({length:n},(_,i)=>({id:`uuid-${i}`,slot:i,mbti:(['ENTP','INFP','ESTJ','ESTP'] as const)[i%4],nickname:`玩家${i}`,connected:true,joinedAt:0}));
const input=(seq=1):PlayerInput=>({seq,moveX:1,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:true});
{
 const room=new LobbyRoom('ABCD',0);for(const p of players(8))room.join(p,0);room.step(5000);assert.equal(room.phase,'COUNTDOWN');assert.equal(room.serverStartTimestamp,8000);room.step(7999);assert.equal(room.phase,'COUNTDOWN');room.step(8000);assert.equal(room.phase,'PLAYING');assert.equal(room.match!.protectionEnd,8000);
}
for(let run=0;run<20;run++){
 const m=new MatchSession(players(8),3000,8),actors=[...m.game.players.values()];assert.equal(actors.length,8);
 for(const a of actors){assert.ok(!blocked(a.x,a.y,30,m.game.map.walls));for(const b of actors)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=100);}
 m.input('uuid-0',input());m.step(2999);assert.equal(m.game.tick,0);assert.equal(m.game.projectiles.length,0);
 m.step(3000);const x=actors[0].x;m.input('uuid-0',{...input(),basicAttackPressed:false,skillPressed:false,ultimatePressed:false});m.step(3100);assert.ok(actors[0].x>x,'Movement starts after countdown');assert.equal(m.game.projectiles.length,0);assert.equal(m.game.zones.length,0);assert.equal(m.game.skills.nextSkill.size,0);
 assert.equal(m.game.combatEnabled,true,'No extra spawn invulnerability');
 m.step(5000);m.game.damage(actors[0],actors[1],999,0,0);m.step(5034);assert.equal(m.players.get('uuid-1')!.placement,8);assert.equal(m.players.get('uuid-0')!.kills,1);assert.equal(m.players.get('uuid-0')!.damageDealt,actors[1].maxHp);
 const deadX=actors[1].x;m.input('uuid-1',input(2));m.step(5067);assert.equal(actors[1].x,deadX);
 for(let i=2;i<8;i++)m.quit(`uuid-${i}`,5100+i);assert.equal(m.phase,'WINNER');assert.equal(m.winnerId,'uuid-0');assert.equal(m.players.get('uuid-0')!.placement,1);assert.equal(m.players.get('uuid-0')!.kills,1,'Quit gives no kills');const tick=m.game.tick;m.step(6000);assert.equal(m.game.tick,tick,'Terminal simulation frozen');
}
{
 const m=new MatchSession(players(3),0,8);m.step(2000);m.disconnect('uuid-1',2100);m.step(12099);assert.equal(m.players.get('uuid-1')!.alive,true);m.reconnect('uuid-1');m.step(13000);assert.equal(m.players.get('uuid-1')!.alive,true);m.disconnect('uuid-1',14000);m.step(24000);assert.equal(m.players.get('uuid-1')!.eliminationReason,'disconnect');assert.equal(m.players.get('uuid-1')!.placement,3);m.disconnect('uuid-0',24001);m.disconnect('uuid-2',24001);m.step(24002);assert.equal(m.phase,'CANCELLED');assert.equal(m.winnerId,undefined);
}
{
 const m=new MatchSession(players(2),0,8);m.step(2000);const [a,b]=[...m.game.players.values()];m.game.damage(a,b,999,0,0);m.game.damage(b,a,999,0,0);m.step(2034);assert.equal(m.phase,'WINNER');assert.equal(m.draw,true);assert.equal(m.winnerId,undefined);
}
console.log('PASS M2: countdown, 20 eight-player safe maps, movement/combat gates, death/statistics/placement, winner/freeze, quit/no kill, grace/recovery/timeout, cancellation and final draw.');
