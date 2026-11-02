import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {gardenInput,type GardenSnapshot} from '../src/shared/garden/GardenConfig';
const host=startServer(0),clients:Socket[]=[];
try{
 await once(host.http,'listening');const port=(host.http.address() as any).port;
 const connect=async(name:string)=>{const c=io(`http://127.0.0.1:${port}/garden`,{auth:{nickname:name,mbti:'ENTP'},autoConnect:false,reconnection:false});clients.push(c);const ready=once(c,'garden:welcome');c.connect();const [s]=await ready;return {c,id:s.id};};
 const wait=(c:Socket,test:(s:GardenSnapshot)=>boolean)=>new Promise<GardenSnapshot>((resolve,reject)=>{const timeout=setTimeout(()=>{c.off('garden:state',handler);reject(Error('Snapshot condition timed out'));},4000);const handler=(s:GardenSnapshot)=>{if(test(s)){clearTimeout(timeout);c.off('garden:state',handler);resolve(s);}};c.on('garden:state',handler);});
 const a=await connect('举起测试'),b=await connect('飞行测试');
 const lifted=[a,b].map(p=>wait(p.c,s=>s.players.some(q=>q.id===b.id&&q.carriedBy===a.id)));
 a.c.emit('garden:input',{...gardenInput(),liftTarget:b.id});await Promise.all(lifted);
 const flight=[a,b].map(p=>wait(p.c,s=>s.players.some(q=>q.id===b.id&&q.thrown&&!q.carriedBy)));
 const landed=[a,b].map(p=>wait(p.c,s=>s.players.some(q=>q.id===b.id&&q.lying&&!q.thrown&&q.z===0)));
 a.c.emit('garden:input',{...gardenInput(),throwNow:true,aimX:1,aimY:0});await Promise.all(flight);const snapshots=await Promise.all(landed);for(const s of snapshots)assert.ok(s.players.find(p=>p.id===b.id)?.lying);
 assert.equal(host.room.players.size,0);console.log('PASS throw network: both clients observe lift, flight and lying landing; isolated from combat');
}finally{clients.forEach(c=>c.disconnect());host.close();}
