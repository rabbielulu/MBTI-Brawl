import assert from 'node:assert/strict';
import { once } from 'node:events';
import { io, type Socket } from 'socket.io-client';
import { startServer } from '../server/GameServer';
import { GameRoom } from '../server/GameRoom';
import { movement } from '../src/shared/Movement';
import type { CombatEvent } from '../src/shared/combat/CombatTypes';
import type { ClientEvents,ServerEvents,GameSnapshot,Welcome } from '../src/shared/NetworkProtocol';
const server=startServer(0);
const clients:Socket<ServerEvents,ClientEvents>[]=[];
function waitFor(socket:Socket<ServerEvents,ClientEvents>,predicate:(s:GameSnapshot)=>boolean):Promise<GameSnapshot>{
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off('snapshot',receive);reject(new Error('Snapshot timeout'));},3000);function receive(s:GameSnapshot){if(predicate(s)){clearTimeout(timer);socket.off('snapshot',receive);resolve(s);}}socket.on('snapshot',receive);});
}
try {
 await once(server.http,'listening');const address=server.http.address();assert.ok(address&&typeof address==='object');const url=`http://127.0.0.1:${address.port}`;
 const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/MBTI/);
 const join=(nickname:string)=>new Promise<{socket:Socket<ServerEvents,ClientEvents>;welcome:Welcome}>((resolve,reject)=>{
  const socket:Socket<ServerEvents,ClientEvents>=io(url,{auth:{nickname},reconnection:false});clients.push(socket);
  const timer=setTimeout(()=>reject(new Error('Welcome timeout')),3000);
  socket.on('welcome',welcome=>{clearTimeout(timer);resolve({socket,welcome});});
 });
 const a=await join('甲同学'),b=await join('乙同学');
 assert.notEqual(a.welcome.id,b.welcome.id);assert.deepEqual(a.welcome.map,b.welcome.map);
 assert.equal(b.welcome.snapshot.players.length,2);
 const c=await join('丙同学'),d=await join('丁同学');assert.equal(d.welcome.snapshot.players.length,4);c.socket.disconnect();d.socket.disconnect();
 const c2=await join('丙同学'),d2=await join('丁同学');
 const full=io(url,{auth:{nickname:'戊同学'},reconnection:false});clients.push(full);
 const [reason]=await once(full,'rejected');assert.match(reason,/已满/);c2.socket.disconnect();d2.socket.disconnect();await waitFor(a.socket,s=>s.players.length===2);
 const before=server.room.players.get(a.welcome.id)!;const x=before.x,y=before.y;
 let seq=0;const interval=setInterval(()=>a.socket.emit('input',{seq:++seq,moveX:1,moveY:0,aimAngle:1.2,basicAttackPressed:false,skillPressed:false,ultimatePressed:false}),30);
 const remote=await waitFor(b.socket,s=>s.players.some(p=>p.id===a.welcome.id&&p.x>x+40&&p.movementState==='walk'&&p.aimAngle===1.2));clearInterval(interval);
 const moved=remote.players.find(p=>p.id===a.welcome.id)!;assert.ok(moved.x>x);assert.equal(moved.y,y);
 const other=server.room.players.get(b.welcome.id)!;assert.equal(other.x,b.welcome.snapshot.players.find(p=>p.id===b.welcome.id)!.x,'Independent controls');
 await waitFor(b.socket,s=>s.players.find(p=>p.id===a.welcome.id)?.movementState==='idle');
 const pingStart=performance.now();await new Promise<void>(resolve=>a.socket.emit('ping',resolve));assert.ok(performance.now()-pingStart<1000);
 // Place a controlled test lane on the server, without giving clients a teleport API.
 server.room.map={walls:[],mud:[]};
 Object.assign(server.room.players.get(a.welcome.id)!,{x:400,y:500});
 Object.assign(server.room.players.get(b.welcome.id)!,{x:600,y:500});
 const combatA:CombatEvent[]=[],combatB:CombatEvent[]=[];a.socket.on('combat',events=>combatA.push(...events));b.socket.on('combat',events=>combatB.push(...events));
 const hpSync=Promise.all([waitFor(a.socket,s=>s.players.some(p=>p.id===b.welcome.id&&p.hp<100)),waitFor(b.socket,s=>s.players.some(p=>p.id===b.welcome.id&&p.hp<100))]);
 a.socket.emit('input',{seq:++seq,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:true,skillPressed:false,ultimatePressed:false});
 const [hpA,hpB]=await hpSync;
 assert.equal(hpA.players.find(p=>p.id===b.welcome.id)!.hp,88);
 assert.equal(hpB.players.find(p=>p.id===b.welcome.id)!.hp,88);
 assert.equal(hpA.players.find(p=>p.id===a.welcome.id)!.personality,12);
 assert.equal(hpB.players.find(p=>p.id===a.welcome.id)!.personality,12);
 assert.ok(hpB.players.find(p=>p.id===b.welcome.id)!.velocityX>0,'Authoritative knockback is broadcast');
 assert.equal(combatA.filter(e=>e.type==='damage').length,1);
 assert.deepEqual(combatA,combatB,'Both clients receive identical authoritative combat events');
 const restored=waitFor(a.socket,s=>s.round===1&&s.players.every(p=>p.hp===100&&p.alive&&p.personality===0&&p.velocityX===0&&p.velocityY===0)&&s.projectiles.length===0);
 a.socket.emit('resetTraining');await restored;
 const removal=waitFor(a.socket,s=>s.players.length===1&&!s.players.some(p=>p.id===b.welcome.id));b.socket.disconnect();await removal;
 const room=new GameRoom();room.add('test','测试员');room.map={walls:[],mud:[]};
 const initial={...room.players.get('P1')!};room.input('P1',{seq:1,moveX:1,moveY:1,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false},1000);room.step(1000);
 const p=room.players.get('P1')!;assert.ok(Math.abs(Math.hypot(p.x-initial.x,p.y-initial.y)-245/30)<.001,'Diagonal normalized');
 room.input('P1',{seq:2,moveX:Infinity,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false},1001);assert.equal(room.inputs.get('P1')!.input.seq,1,'Invalid inputs rejected');
 room.input('P1',{seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false},1001);assert.equal(room.inputs.get('P1')!.input.moveX,1,'Old sequence rejected');
 room.step(1500);assert.equal(p.movementState,'idle','Stale input stops movement');
 const blocked=movement({x:1329,y:500},{seq:0,moveX:1,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:false,ultimatePressed:false},1/30,room.map);assert.equal(blocked.x,1329);
 console.log('PASS: HTTP single-port hosting, two identities, map equality, room limit, remote movement/aim/idle, independent input, ping, shared projectile damage/HP/reset, disconnect, diagonal normalization, validation, stale input and boundary.');
} finally {clients.forEach(c=>c.disconnect());server.close();}
