import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {gardenInput} from '../src/shared/garden/GardenConfig';
const host=startServer(0),clients:Socket[]=[];
try{
 await once(host.http,'listening');const port=(host.http.address() as any).port;
 const connect=async(nickname:string)=>{const c=io(`http://127.0.0.1:${port}/garden`,{auth:{nickname,mbti:'ENTP'},autoConnect:false,reconnection:false});clients.push(c);const ready=once(c,'garden:welcome');c.connect();const [welcome]=await ready;return {c,welcome};};
 const a=await connect('花园甲'),b=await connect('花园乙');assert.notEqual(a.welcome.id,b.welcome.id);assert.equal(b.welcome.players.length,2);assert.equal(host.room.players.size,0);
 const state=()=>new Promise<any>(resolve=>a.c.once('garden:state',resolve));
 a.c.emit('garden:input',{...gardenInput(),x:1,jump:true,wave:true});let snapshot=await state();while(!snapshot.players.find((p:any)=>p.id===a.welcome.id)?.z)snapshot=await state();const p=snapshot.players.find((p:any)=>p.id===a.welcome.id);assert.ok(p.z>0&&p.waveUntil>snapshot.time);assert.equal('hp' in p,false);
 b.c.disconnect();do{snapshot=await state();}while(snapshot.players.length!==1);assert.equal(snapshot.players[0].id,a.welcome.id);
 const bad=io(`http://127.0.0.1:${port}/garden`,{auth:{nickname:'',mbti:'BOOM'},autoConnect:false,reconnection:false});clients.push(bad);const rejection=once(bad,'garden:error');bad.connect();assert.match(String((await rejection)[0]),/无效/);
 console.log('PASS garden network: shared snapshots, isolated combat, inputs, disconnect cleanup and identity validation');
}finally{clients.forEach(c=>c.disconnect());host.close();}
