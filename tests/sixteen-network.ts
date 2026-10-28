import assert from 'node:assert/strict';
import {once} from 'node:events';
import {io} from 'socket.io-client';
import {startServer} from '../server/GameServer';
import {PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
const host=startServer(0),clients:any[]=[];
const wait=async(check:()=>boolean)=>{const limit=Date.now()+6500;while(!check()){assert.ok(Date.now()<limit,'Network condition timeout');await new Promise(r=>setTimeout(r,15));}};
try{await once(host.http,'listening');const port=(host.http.address() as any).port;
 const connect=async()=>{const c=io(`http://127.0.0.1:${port}/lobby`,{auth:{protocolVersion:PROTOCOL_VERSION},autoConnect:false,reconnection:false});clients.push(c);const ready=once(c,'connect');c.connect();await ready;return c;};
 const req=(c:any,event:string,payload:any={})=>new Promise<any>((resolve,reject)=>c.timeout(2500).emit(event,payload,(err:any,res:any)=>err?reject(err):resolve(res)));
 const groups=[];
 for(let batch=0;batch<2;batch++){
  let code='';const welcomes:any[]=[],snapshots:any[]=[],events:any[][]=Array.from({length:8},()=>[]),members:any[]=[];
  for(let i=0;i<8;i++){const c=await connect(),type=PLAYABLE_TYPES[batch*8+i];members.push(c);c.on('match:welcome',(w:any)=>welcomes[i]=w);c.on('match:snapshot',(s:any)=>snapshots[i]=s);c.on('match:combat',(e:any[])=>events[i].push(...e));const res=await req(c,code?'room:join':'room:create',code?{roomId:code,identity:{mbti:type,nickname:type}}:{mbti:type,nickname:type});assert.ok(res.ok);code=res.room.id;}
  const room=host.lobby.get(code);room.debugStart(Date.now());await wait(()=>welcomes.filter(Boolean).length===8);assert.deepEqual(new Set(welcomes[0].snapshot.players.map((p:any)=>p.mbti)),new Set(PLAYABLE_TYPES.slice(batch*8,batch*8+8)));
  room.match!.game.map={walls:[],mud:[]};await wait(()=>room.match!.game.combatEnabled);[...room.match!.game.players.values()].forEach((p,i)=>Object.assign(p,{x:400+i*65,y:450}));
  for(const c of members)c.emit('match:input',{seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:true,ultimatePressed:false,targetX:600,targetY:450,damage:99999,randomOutcome:4,shield:99999});
  await wait(()=>events.every(e=>e.filter(v=>v.type==='cast').length>=8));await wait(()=>snapshots.every(s=>s?.players.length===8));assert.ok(snapshots.every(s=>s.players.every((p:any)=>p.hp>=0&&p.hp<=100&&(p.shield||0)<=50)),'Client cannot forge damage or shield');
  assert.ok(events.every(e=>e.every(v=>welcomes[0].snapshot.players.some((p:any)=>p.id===v.attackerId))),'Combat events remain isolated per room');groups.push(code);
 }
 assert.equal(host.lobby.rooms.size,2);assert.notEqual(groups[0],groups[1]);
 console.log('PASS network 16 personalities across two independent 8-player rooms: all identities/welcomes, authoritative skills and state, forged combat fields ignored, room isolation.');
}finally{clients.forEach(c=>c.disconnect());host.close();}
