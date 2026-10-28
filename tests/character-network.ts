import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import type {ClientEvents,ServerEvents,Welcome,GameSnapshot} from '../src/shared/NetworkProtocol';
import type {CombatEvent} from '../src/shared/combat/CombatTypes';
const host=startServer(0),clients:Socket<ServerEvents,ClientEvents>[]=[];
const snapshots:GameSnapshot[][]=[],events:CombatEvent[][]=[];
async function until(check:()=>boolean){const limit=performance.now()+3000;while(!check()){if(performance.now()>limit)throw new Error('Network condition timeout');await new Promise(r=>setTimeout(r,20));}}
try{
 await once(host.http,'listening');const address=host.http.address();assert.ok(address&&typeof address==='object');const url=`http://127.0.0.1:${address.port}`;
 for(const [index,mbti] of PLAYABLE_TYPES.slice(0,4).entries()){
  const socket:Socket<ServerEvents,ClientEvents>=io(url,{auth:{nickname:mbti,mbti},reconnection:false,autoConnect:false});clients.push(socket);snapshots.push([]);events.push([]);
  socket.on('snapshot',s=>snapshots[index].push(s));socket.on('combat',e=>events[index].push(...e));
  const welcome=new Promise<Welcome>(resolve=>socket.once('welcome',resolve));socket.connect();const w=await welcome;assert.equal(w.snapshot.players.find(p=>p.id===w.id)!.mbti,mbti);
 }
 await until(()=>snapshots.every(list=>list.at(-1)?.players.length===4));
 host.room.map={walls:[],mud:[]};[...host.room.players.values()].forEach((p,i)=>Object.assign(p,{x:400+i*70,y:500,velocityX:0,velocityY:0}));
 const skill={seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:true,ultimatePressed:false,targetX:540,targetY:500};
 clients.forEach(c=>c.emit('input',skill));await until(()=>events.every(list=>list.filter(e=>e.type==='cast').length===4));
 await until(()=>snapshots.every(list=>list.at(-1)?.players.some(p=>p.mbti==='INFP'&&p.statuses.some(s=>s.id==='reduction'))===true));
 assert.ok(snapshots.every(list=>list.some(s=>s.zones.some(z=>z.kind==='deadline'))),'Ground zone reaches all four clients');
 await until(()=>snapshots.every(list=>list.some(s=>s.players.some(p=>p.mbti==='ESTP'&&p.skillCooldownRemaining>0))));
 for(const p of host.room.players.values())p.personality=100;
 clients.forEach(c=>c.emit('input',{...skill,seq:2,skillPressed:false,ultimatePressed:true}));
 await until(()=>events.every(list=>list.filter(e=>e.type==='cast'&&e.ultimate).length===4));
 await until(()=>snapshots.every(list=>list.at(-1)?.players.every(p=>p.personality===0)===true));
 assert.deepEqual(events[0],events[3],'All clients receive identical casts and damage ordering');
 clients[0].emit('resetTraining');await until(()=>snapshots.every(list=>list.at(-1)?.round===1&&list.at(-1)?.players.every(p=>p.hp===100&&p.statuses.length===0&&p.grievance===0)===true));
 const invalid=io(url,{auth:{nickname:'无效',mbti:'XXXX'},reconnection:false});const rejected=once(invalid,'rejected');const [reason]=await rejected;assert.match(reason,/MBTI/);invalid.disconnect();
 console.log('PASS: four distinct character handshakes, simultaneous authoritative skills/ults, identical cast/damage events, status/zone/cooldown/meter broadcast, four-way reset, invalid character rejection.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
