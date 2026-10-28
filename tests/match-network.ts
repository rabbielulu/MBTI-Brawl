import {NetworkClient} from '../src/client/network/NetworkClient';
import {LobbyClient} from '../src/client/lobby/LobbyClient';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply} from '../src/shared/LobbyProtocol';
import type {Welcome,GameSnapshot} from '../src/shared/NetworkProtocol';
const host=startServer(0),clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[];
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>boolean,timeout=3000){const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw Error('M2 network timeout');await wait(15);}}
function request(c:Socket<LobbyServerEvents,LobbyClientEvents>,event:'room:create'|'room:join'|'room:resume',payload:any){return new Promise<LobbyReply>((resolve,reject)=>c.timeout(2000).emit(event,payload,(error:Error|null,r:LobbyReply)=>error?reject(error):resolve(r)));}
try{
 await once(host.http,'listening');const address=host.http.address();assert.ok(address&&typeof address==='object');const url=`http://127.0.0.1:${address.port}/lobby`;
 const connect=async()=>{const c:Socket<LobbyServerEvents,LobbyClientEvents>=io(url,{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,autoConnect:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const a=await connect(),created=await request(a,'room:create',{mbti:'ENTP',nickname:'甲'});assert.ok(created.ok);const room=host.lobby.get(created.room.id),ids=[created.playerId],members=[a];
 let welcome:Welcome|undefined,snapshot:GameSnapshot|undefined;let welcomes=0;a.on('match:welcome',w=>{welcome=w;welcomes++;});a.on('match:snapshot',s=>snapshot=s);
 const isolated=await connect();await request(isolated,'room:create',{mbti:'ENTP',nickname:'隔壁'});let leak=false;isolated.on('match:snapshot',()=>leak=true);isolated.on('match:combat',()=>leak=true);
 let resume:Extract<LobbyReply,{ok:true}>|undefined;
 for(let i=1;i<8;i++){const c=await connect(),r=await request(c,'room:join',{roomId:room.id,identity:{mbti:'ENTP',nickname:`乙${i}`}});assert.ok(r.ok);ids.push(r.playerId);members.push(c);if(i===1)resume=r;}
 await until(()=>!!welcome,6500);assert.equal(welcome!.id,ids[0]);assert.equal(welcome!.snapshot.players.length,8);assert.equal(welcomes,1);assert.equal(room.phase,'COUNTDOWN');
 const game=room.match!.game;const p=game.players.get(ids[0])!;const x=p.x;members[0].emit('match:input',{seq:1,moveX:1,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:true});await wait(80);assert.equal(p.x,x,'Countdown ignores gameplay');
 await until(()=>room.phase==='PLAYING',4000);assert.equal(game.combatEnabled,false);p.x=600;p.y=500;game.map.walls=[];const victim=game.players.get(ids[1])!;victim.x=660;victim.y=500;
 a.emit('match:input',{seq:2,moveX:1,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:false});await wait(150);assert.ok(p.x>600);assert.equal(victim.hp,victim.maxHp);assert.equal(game.projectiles.length,0);assert.equal(game.zones.length,0);
 // Same seat is recovered with a secret token, not by claiming a player ID.
 members[1].io.engine.close();await until(()=>room.match!.players.get(ids[1])!.connected===false);
 const thief=await connect(),denied=await request(thief,'room:resume',{roomId:room.id,playerId:ids[1],token:'wrong'});assert.ok(!denied.ok);
 const recovered=await connect();let resumedWelcome:Welcome|undefined;recovered.on('match:welcome',w=>resumedWelcome=w);const restored=await request(recovered,'room:resume',{roomId:room.id,playerId:ids[1],token:resume!.resumeToken});assert.ok(restored.ok);assert.equal(restored.playerId,ids[1]);assert.equal(resumedWelcome!.id,ids[1]);members[1]=recovered;
 await until(()=>game.combatEnabled,3000);p.x=600;p.y=500;victim.x=660;victim.y=500;victim.hp=1;
 a.emit('match:input',{seq:3,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:false,ultimatePressed:false});await until(()=>room.match!.players.get(ids[1])!.alive===false);assert.equal(room.match!.players.get(ids[1])!.placement,8);assert.equal(room.match!.players.get(ids[0])!.kills,1);assert.ok(room.match!.players.get(ids[0])!.damageDealt>0);
 const deathX=victim.x;recovered.emit('match:input',{seq:9,moveX:1,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:true});await wait(120);assert.equal(victim.x,deathX);
 const deadTransport=new LobbyClient(()=>{},()=>{});deadTransport.room=room.snapshot(Date.now());deadTransport.playerId=ids[1];deadTransport.sendInput=input=>recovered.emit('match:input',input);
 const view=new NetworkClient();view.attach({protocolVersion:PROTOCOL_VERSION,id:ids[1],map:game.map,snapshot:game.snapshot()},deadTransport);
 let spectatorPackets=0;host.io.of('/lobby').sockets.get(recovered.id!)!.on('match:input',()=>spectatorPackets++);
 for(let i=0;i<10;i++){view.send(1,0,0,true,true);view.sendIntent({moveX:1,moveY:1,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:true});}
 await wait(120);assert.equal(spectatorPackets,0,'M3 dead/spectator adapter sends zero real gameplay packets');assert.equal(view.seq,0);view.close();

 for(let i=2;i<8;i++)await new Promise<void>(resolve=>members[i].emit('room:leave',resolve));await until(()=>room.phase==='WINNER');assert.equal(room.match!.winnerId,ids[0]);assert.equal(room.match!.players.get(ids[0])!.placement,1);assert.equal(room.match!.players.get(ids[0])!.kills,1);
 const final=JSON.stringify(room.match!.result),finalTick=game.tick;assert.ok(room.match!.result?.players.every(p=>Number.isFinite(p.survivalMs)));
 let receivedResult=false;recovered.on('room:update',state=>{if(state.phase==='RESULT'&&state.match?.result?.winnerId===ids[0])receivedResult=true;});
 await new Promise<void>(resolve=>a.emit('room:leave',resolve));assert.equal(room.match!.winnerId,ids[0]);
 await until(()=>receivedResult,5500);assert.equal(room.phase,'RESULT');assert.equal(game.tick,finalTick);assert.equal(JSON.stringify(room.match!.result),final,'M4 stats stay frozen after champion leaves');
 const round=game.round;(a as any).emit('resetTraining');await wait(120);assert.equal(game.round,round);assert.equal(leak,false);assert.equal(host.room.players.size,0);assert.ok(snapshot&&snapshot.players.length===8);
 await new Promise<void>(resolve=>a.emit('room:leave',resolve));await new Promise<void>(resolve=>recovered.emit('room:leave',resolve));assert.equal(host.lobby.rooms.has(room.id),false);
 console.log('PASS M2 real network: 8 seats → 3s → protected play → lethal attack → placement → winner; isolated snapshots/events, authenticated recovery, dead-input rejection, no training reset, M3 zero spectator packets, M4 four-second celebration/result/frozen champion and cleanup.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
