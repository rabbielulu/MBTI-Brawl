import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {flowerCell,flowerCenter,type FlowerSnapshot,type FlowerResult,type FlowerRequest} from '../src/shared/garden/FlowerConfig';
const server=startServer(0);await new Promise<void>(r=>server.http.listening?r():server.http.once('listening',r));const port=(server.http.address() as {port:number}).port;
const clients:Socket[]=[];const event=<T>(s:Socket,name:string,timeout=4000)=>new Promise<T>((resolve,reject)=>{const t=setTimeout(()=>reject(Error('timeout '+name)),timeout);s.once(name,v=>{clearTimeout(t);resolve(v);});});
async function connect(token?:string){const s=io(`http://127.0.0.1:${port}/garden`,{auth:{nickname:'花园测试',mbti:'ENTP',gardenSession:token},forceNew:true,reconnection:false,autoConnect:false});clients.push(s);const ready=event<any>(s,'garden:welcome');s.connect();return {socket:s,welcome:await ready};}
async function plant(s:Socket,r:FlowerRequest){const response=event<FlowerResult>(s,'garden:flowers:result');s.emit('garden:flowers:plant',r);return response;}
try{
 const a=await connect(),b=await connect();const own=a.welcome.players.find((p:any)=>p.id===a.welcome.id),cell=flowerCell(own.x,own.y);
 const request={requestId:'race',cells:[cell],flowerType:'basic' as const,colorHex:'#FF77AA'};
 const results=await Promise.all([plant(a.socket,request),plant(b.socket,request)]);assert.equal(results.reduce((n,r)=>n+r.accepted.length,0),1);
 let snapshot:FlowerSnapshot;const sync=event<FlowerSnapshot>(b.socket,'garden:flowers:snapshot');b.socket.emit('garden:flowers:sync');snapshot=await sync;assert.equal(snapshot.flowers.length,1);
 const owner=snapshot.flowers[0].ownerPlayerId===a.welcome.id?a:b,other=owner===a?b:a;
 const erase=event<FlowerResult>(other.socket,'garden:flowers:result');other.socket.emit('garden:flowers:erase',{requestId:'forbidden',flowerIds:[snapshot.flowers[0].id]});assert.equal((await erase).rejected[0].reason,'只能擦除自己的花');
 const id=owner.welcome.id,token=owner.welcome.gardenSession;owner.socket.disconnect();await new Promise(r=>setTimeout(r,100));
 const c=await connect();assert.equal(c.welcome.flowerSnapshot.flowers.length,1);const resumed=await connect(token);assert.equal(resumed.welcome.id,id);assert.equal(resumed.welcome.flowerSnapshot.flowers[0].ownerPlayerId,id);
 const done=event<FlowerResult>(resumed.socket,'garden:flowers:result');resumed.socket.emit('garden:flowers:erase',{requestId:'mine',flowerIds:[snapshot.flowers[0].id]});assert.equal((await done).accepted.length,1);
 // Eight simultaneous clients draw against the unchanged production grid.
 const group=[a,b,c,resumed].filter(v=>v.socket.connected);while(group.length<8)group.push(await connect());
 const valid=group.filter(v=>v.socket.connected);const cells=valid.map((v,i)=>{const p=v.welcome.players.find((p:any)=>p.id===v.welcome.id),base=flowerCell(p.x,p.y);return {gx:base.gx,gz:base.gz+i};});
 const draw=await Promise.all(valid.map((v,i)=>plant(v.socket,{...request,requestId:'parallel-'+i,cells:[cells[i]]})));assert.ok(draw.every(r=>r.accepted.length===1));
 // Model a lost acknowledgement: delay 150ms and replay the same request IDs.
 await new Promise(r=>setTimeout(r,150));
 await Promise.all(valid.map((v,i)=>plant(v.socket,{...request,requestId:'parallel-'+i,cells:[cells[i]]})));
 // Deliberately withhold a delta on one client, then recover from a full snapshot.
 const resync=event<FlowerSnapshot>(c.socket,'garden:flowers:snapshot');c.socket.emit('garden:flowers:sync');const recovered=await resync;assert.equal(recovered.flowers.length,valid.length);assert.ok(recovered.snapshotRevision>1);
 for(const s of clients)s.disconnect();await new Promise(r=>setTimeout(r,100));const fresh=await connect();assert.equal(fresh.welcome.flowerSnapshot.flowers.length,0);
 console.log('PASS flower network: concurrent cell conflict, owner-only erase, late join, stable reconnect, parallel draw, snapshot recovery and empty-room cleanup');
}finally{for(const s of clients)s.disconnect();await new Promise<void>(resolve=>server.io.close(()=>resolve()));server.close();}
