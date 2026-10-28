import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply,LobbyRoomState} from '../src/shared/LobbyProtocol';
const host=startServer(0),clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[];
async function until(check:()=>boolean,ms=2000){const end=performance.now()+ms;while(!check()){if(performance.now()>end)throw new Error('Lobby condition timed out');await new Promise(r=>setTimeout(r,15));}}
function request(c:Socket<LobbyServerEvents,LobbyClientEvents>,event:'room:create'|'room:join'|'player:updateIdentity',data:unknown){return new Promise<LobbyReply>((resolve,reject)=>c.timeout(2000).emit(event,data,(error:Error|null,reply:LobbyReply)=>error?reject(error):resolve(reply)));}
try{
 await once(host.http,'listening');const address=host.http.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`;
 const connect=async(version=PROTOCOL_VERSION)=>{const c:Socket<LobbyServerEvents,LobbyClientEvents>=io(`${base}/lobby`,{auth:{protocolVersion:version},reconnection:false,autoConnect:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const a=await connect();const identity={mbti:'ENTP',nickname:'同一个昵称'};
 const bad=await request(a,'room:join',{roomId:'????',identity});assert.ok(!bad.ok&&bad.code==='INVALID_ROOM_ID');
 const missing=await request(a,'room:join',{roomId:'ABCD',identity});assert.ok(!missing.ok&&missing.code==='ROOM_NOT_FOUND');
 const invalid=await request(a,'room:create',{mbti:'XXXX',nickname:'x'});assert.ok(!invalid.ok&&invalid.code==='INVALID_MBTI');
 const invalidNick=await request(a,'room:create',{mbti:'ENTP',nickname:'x'.repeat(13)});assert.ok(!invalidNick.ok&&invalidNick.code==='INVALID_NICKNAME');
 const created=await request(a,'room:create',identity);assert.ok(created.ok);assert.equal(created.room.maxPlayers,8);assert.equal(created.room.lobbyCountdownEnd,undefined);assert.match(created.inviteUrl,new RegExp(`room=${created.room.id}$`));assert.ok(!created.inviteUrl.includes('localhost'),'Local host invitations use a LAN address');
 const states:LobbyRoomState[]=[];a.on('room:update',s=>states.push(s));
 const b=await connect(),joined=await request(b,'room:join',{roomId:created.room.id.toLowerCase(),identity});assert.ok(joined.ok);assert.equal(joined.room.players.length,2);assert.ok(joined.room.lobbyCountdownEnd!-Date.now()>29000);assert.notEqual(created.playerId,joined.playerId);
 const edited=await request(b,'player:updateIdentity',{mbti:'ESTP',nickname:'<测试名字>',playerId:created.playerId});assert.ok(edited.ok);await until(()=>states.at(-1)?.players.some(p=>p.id===joined.playerId&&p.nickname==='<测试名字>')===true);assert.equal(states.at(-1)!.players.find(p=>p.id===created.playerId)!.nickname,identity.nickname,'Cannot edit another player');
 b.io.engine.close();await until(()=>states.at(-1)?.players.length===1);assert.equal(states.at(-1)!.lobbyCountdownEnd,undefined);
 const isolation=await connect(),other=await request(isolation,'room:create',{mbti:'INFP',nickname:'隔壁房间'});assert.ok(other.ok);let leaked=false;isolation.on('room:update',s=>{if(s.id===created.room.id)leaked=true;});
 for(let i=0;i<7;i++){const c=await connect();const reply=await request(c,'room:join',{roomId:created.room.id,identity});assert.ok(reply.ok);}
 await until(()=>states.at(-1)?.players.length===8);assert.ok(states.at(-1)!.lobbyCountdownEnd!-Date.now()<=5000);assert.ok(states.at(-1)!.lobbyCountdownEnd!-Date.now()>4000);
 const ninth=await connect(),full=await request(ninth,'room:join',{roomId:created.room.id,identity});assert.ok(!full.ok&&full.code==='ROOM_FULL');
 await until(()=>states.at(-1)?.phase==='COUNTDOWN',6500);assert.equal(host.lobby.get(created.room.id).phase,'COUNTDOWN');assert.equal(host.room.players.size,0,'Lobby cannot enter the practice simulation or send gameplay');
 const late=await request(ninth,'room:join',{roomId:created.room.id,identity});assert.ok(!late.ok&&late.code==='MATCH_ALREADY_STARTED');
 const locked=await request(a,'player:updateIdentity',identity);assert.ok(!locked.ok&&locked.code==='MATCH_ALREADY_STARTED');assert.equal(leaked,false,'Rooms do not leak updates');
 assert.equal(other.room.players.length,1);
 await new Promise<void>(resolve=>isolation.emit('room:leave',resolve));await until(()=>!host.lobby.rooms.has(other.room.id));
 const rateClient=await connect();let last:LobbyReply|undefined;for(let i=0;i<13;i++)last=await request(rateClient,'room:create',{mbti:'XXXX',nickname:'x'});assert.ok(last&&!last.ok&&last.code==='RATE_LIMITED');
 const oldVersion:Socket<LobbyServerEvents,LobbyClientEvents>=io(`${base}/lobby`,{auth:{protocolVersion:0},reconnection:false,autoConnect:false});clients.push(oldVersion);const denied=once(oldVersion,'connect_error');oldVersion.connect();const [versionError]=await denied;assert.match(versionError.message,/版本/);
 const page=await fetch(`${base}/?room=${created.room.id}`);assert.equal(page.status,200,'Invite URL serves the application');
 console.log('PASS: real create/join/edit/leave/disconnect, invite URL, 8 seats/full rejection, 30s/reset/real 5s transition, identity validation/ownership, room isolation, late join lock, empty cleanup and isolated battle handoff.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
