import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
import {generateTerrain} from '../src/terrain';
const host=startServer(0),clients:any[]=[];
try{
 await once(host.http,'listening');const port=(host.http.address() as any).port;
 const connect=async()=>{const c=io(`http://127.0.0.1:${port}/lobby`,{auth:{protocolVersion:PROTOCOL_VERSION},autoConnect:false,reconnection:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const request=(c:any,event:string,payload:any={})=>new Promise<any>((resolve,reject)=>c.timeout(2000).emit(event,payload,(err:any,r:any)=>err?reject(err):resolve(r)));
 const a=await connect(),b=await connect();const made=await request(a,'room:create',{mbti:'ENTP',nickname:'甲'});await request(b,'room:join',{roomId:made.room.id,identity:{mbti:'ISTP',nickname:'乙'}});
 const first=once(a,'match:welcome'),second=once(b,'match:welcome');await request(a,'room:debugStart');const [[wa],[wb]]=await Promise.all([first,second]);assert.deepEqual(wa.map,wb.map);assert.deepEqual(wa.map,generateTerrain({seed:wa.map.seed,playerCount:2}));assert.equal(wa.map.spawns.length,2);
 await new Promise<void>(r=>a.emit('room:leave',r));await new Promise<void>(r=>b.emit('room:leave',r));
 assert.equal((await request(a,'room:createPractice',{identity:{mbti:'ENTP',nickname:'测试'},botCount:2,terrain:{seed:-1}})).ok,false);
 const ready=once(a,'match:welcome');const practice=await request(a,'room:createPractice',{identity:{mbti:'ENTP',nickname:'测试'},botCount:2,terrain:{seed:42,profile:'Chaos'}});assert.ok(practice.ok);const [initial]=await ready;assert.equal(initial.map.profile,'Chaos');assert.equal(initial.map.seed,42);const reset=once(a,'match:welcome');await request(a,'practice:reset');const [again]=await reset;assert.deepEqual(initial.map,again.map);
 console.log('PASS terrain network: same authoritative terrain for both clients; seed reproduction, active spawn count, invalid debug seed rejection, forced Chaos and deterministic reset.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
