import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply,LobbyRoomState} from '../src/shared/LobbyProtocol';
const host=startServer(0),clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[];
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>boolean,ms=2500){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('Bot network timeout');await delay(20);}}
function request(c:Socket<LobbyServerEvents,LobbyClientEvents>,event:'room:create'|'room:addBot',payload:unknown={}){return new Promise<LobbyReply>((resolve,reject)=>c.timeout(2000).emit(event,payload,(err:Error|null,r:LobbyReply)=>err?reject(err):resolve(r)));}
try{
 await once(host.http,'listening');const address=host.http.address();assert.ok(address&&typeof address==='object');
 const connect=async()=>{const c:Socket<LobbyServerEvents,LobbyClientEvents>=io(`http://127.0.0.1:${address.port}/lobby`,{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,autoConnect:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const a=await connect();const missing=await request(a,'room:addBot');assert.ok(!missing.ok&&missing.code==='NOT_IN_ROOM');
 const created=await request(a,'room:create',{mbti:'ENTP',nickname:'测试真人',bot:true});assert.ok(created.ok);assert.equal(created.room.players[0].bot,undefined,'Cannot impersonate a bot through identity payload');
 const other=await connect(),isolated=await request(other,'room:create',{mbti:'INFP',nickname:'隔壁真人'});assert.ok(isolated.ok);
 const added=await request(a,'room:addBot',{roomId:isolated.room.id});assert.ok(added.ok);assert.equal(added.playerId,created.playerId,'Adding bot never changes human control ID');assert.equal(added.room.players.filter(p=>p.bot).length,1);assert.equal(host.lobby.get(isolated.room.id).players.size,1,'Cannot add a bot to someone else’s room');
 assert.ok(added.room.lobbyCountdownEnd!-Date.now()>29000);
 for(let i=0;i<6;i++){const r=await request(a,'room:addBot');assert.ok(r.ok);}
 const room=host.lobby.get(created.room.id);assert.equal(room.players.size,8);const full=await request(a,'room:addBot');assert.ok(!full.ok&&full.code==='ROOM_FULL');
 let phase:LobbyRoomState|undefined;a.on('room:update',r=>phase=r);await until(()=>room.phase==='COUNTDOWN',6500);assert.equal(room.match!.bots.size,7);
 const late=await request(a,'room:addBot');assert.ok(!late.ok&&late.code==='MATCH_ALREADY_STARTED');
 await until(()=>room.phase==='PLAYING',4000);await until(()=>[...room.match!.game.players.values()].some(p=>p.hp<p.maxHp),8000);
 assert.ok([...room.match!.bots].every(id=>room.match!.game.inputs.get(id)!.input.seq>0),'Bots issue real validated inputs');
 assert.ok(phase?.match&&phase.match.players.length===8);assert.equal(host.room.players.size,0,'Bot match stays separate from training');
 a.io.engine.close();await until(()=>!host.lobby.rooms.has(room.id));assert.equal(room.phase,'CANCELLED','Bots do not count as connected humans');assert.equal(host.lobby.get(isolated.room.id).players.size,1);
 await new Promise<void>(resolve=>other.emit('room:leave',resolve));await until(()=>host.lobby.rooms.size===0);
 console.log('PASS bot network: membership/identity/room isolation, one human + seven bots, 30s/full5s/countdown/protection/play/real damage, add locks, disconnect cleanup without orphan rooms.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
