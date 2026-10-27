import assert from 'node:assert/strict';
import {LobbyRoom,LobbyError,validateIdentity,validateRoomId} from '../server/lobby/LobbyRoom';
import {LobbyRegistry} from '../server/lobby/LobbyRegistry';
import {DEFAULT_MAX_PLAYERS,ABSOLUTE_MAX_PLAYERS} from '../src/shared/LobbyProtocol';
const identity={mbti:'ENTP' as const,nickname:'同一个昵称'};
const rejects=(fn:()=>unknown,code:string)=>assert.throws(fn,error=>error instanceof LobbyError&&error.code===code);
assert.equal(DEFAULT_MAX_PLAYERS,8);assert.equal(ABSOLUTE_MAX_PLAYERS,16);
assert.deepEqual(validateIdentity({mbti:'INFP',nickname:'  玻璃心  '}),{mbti:'INFP',nickname:'玻璃心'});
assert.equal(validateIdentity({mbti:'ESTJ',nickname:'一二三四五六七八九十甲乙'}).nickname.length,12);
assert.equal(validateIdentity({mbti:'ESTP',nickname:'😀'.repeat(12)}).nickname.length,24);
for(const nickname of ['', '  ', 'x'.repeat(13), 'a\nb'])rejects(()=>validateIdentity({mbti:'ENTP',nickname}),'INVALID_NICKNAME');
for(const mbti of ['INTJ','entp','__proto__',null])rejects(()=>validateIdentity({mbti,nickname:'测试'}),'INVALID_MBTI');
assert.equal(validateRoomId(' abcd '),'ABCD');for(const id of ['', 'ABC','A?CD','AAAAA','../x'])rejects(()=>validateRoomId(id),'INVALID_ROOM_ID');
{
 const r=new LobbyRoom('ABCD',0),a=r.join(identity,1000);assert.equal(r.lobbyCountdownEnd,undefined);r.step(99999);assert.equal(r.phase,'LOBBY');
 const b=r.join(identity,100000);assert.equal(r.lobbyCountdownEnd,130000);assert.notEqual(a.id,b.id,'Duplicate identity has independent membership');
 r.update(a.id,{mbti:'INFP',nickname:'改了名字'},105000);assert.equal(r.lobbyCountdownEnd,130000,'Editing cannot reset countdown');
 r.remove(b.id,110000);assert.equal(r.lobbyCountdownEnd,undefined);r.join(identity,120000);assert.equal(r.lobbyCountdownEnd,150000,'Returning to two starts a fresh 30 seconds');
 r.step(149999);assert.equal(r.phase,'LOBBY');r.step(150000);assert.equal(r.phase,'COUNTDOWN');assert.equal(r.serverStartTimestamp,153000);
 rejects(()=>r.join(identity,150001),'MATCH_ALREADY_STARTED');rejects(()=>r.update(a.id,identity,150001),'MATCH_ALREADY_STARTED');
 assert.notEqual(r.phase,'PLAYING','Three-second battle countdown follows lobby timer');
}
{
 const r=new LobbyRoom('ABCD',0);for(let i=0;i<8;i++)r.join(identity,i*100);
 assert.equal(r.players.size,8);assert.equal(r.lobbyCountdownEnd,5700);rejects(()=>r.join(identity,800),'ROOM_FULL');
 const player=[...r.players.values()][3];r.remove(player.id,1000);r.join(identity,1100);assert.equal([...r.players.values()].filter(p=>p.slot===3).length,1,'Freed slot reused exactly once');
 const copy=r.snapshot(1200);copy.players[0].nickname='tampered';assert.notEqual([...r.players.values()][0].nickname,'tampered');
 r.step(5700);assert.equal(r.phase,'COUNTDOWN');
}
{
 const r=new LobbyRoom('ABCD',0,3);r.join(identity,0);r.join(identity,1000);assert.equal(r.lobbyCountdownEnd,31000);r.join(identity,2000);assert.equal(r.lobbyCountdownEnd,7000,'Full rule uses room capacity, not a hard-coded eight');
 const registry=new LobbyRegistry();rejects(()=>registry.get('ABCD'),'ROOM_NOT_FOUND');const rooms=Array.from({length:100},()=>registry.create(0));assert.equal(new Set(rooms.map(r=>r.id)).size,100);
 const room=rooms[0],p=room.join(identity,0);registry.remove(room,p.id,1);rejects(()=>registry.get(room.id),'ROOM_NOT_FOUND');
}
console.log('PASS: identity/room validation, duplicate identities, waiting, 30s/reset/5s countdowns, deadline lock, configurable capacity, slot reuse, snapshot isolation and room cleanup.');
