// QA helper: ordinary Socket.IO players, with no server state mutation.
// Arguments: ROOM [duration ms] [player count]. stdin: "drop INDEX" or "end".
import {io,type Socket} from 'socket.io-client';
import {PROTOCOL_VERSION} from '../../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply} from '../../src/shared/LobbyProtocol';
import type {GameSnapshot} from '../../src/shared/NetworkProtocol';
const roomId=process.argv[2],duration=Number(process.argv[3]||180000),count=Number(process.argv[4]||7);
const clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[],timers:ReturnType<typeof setInterval>[]=[];
const identities=[['ENTP','观战目标甲'],['INFP','观战目标乙'],['ESTP','观战目标丙'],['ESTJ','观战目标丁'],['ENTP','观战目标戊'],['INFP','观战目标己'],['ESTP','观战目标庚']];
const leave=(c:Socket<LobbyServerEvents,LobbyClientEvents>)=>new Promise<void>(resolve=>{if(!c.connected){resolve();return;}const timeout=setTimeout(()=>{c.disconnect();resolve();},1000);c.emit('room:leave',()=>{clearTimeout(timeout);c.disconnect();resolve();});});
let finish:()=>void=()=>{};
try{
 for(const [index,[mbti,nickname]] of identities.slice(0,count).entries()){
  const client:Socket<LobbyServerEvents,LobbyClientEvents>=io('http://127.0.0.1:3000/lobby',{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,autoConnect:false});clients.push(client);
  await new Promise<void>((resolve,reject)=>{client.once('connect',resolve);client.once('connect_error',reject);client.connect();});
  const response=await new Promise<LobbyReply>((resolve,reject)=>client.timeout(2000).emit('room:join',{roomId,identity:{mbti,nickname}},(error:Error|null,r:LobbyReply)=>error?reject(error):resolve(r)));
  if(!response.ok)throw Error(response.message);
  let snapshot:GameSnapshot|undefined,seq=0;client.on('match:snapshot',s=>snapshot=s);
  timers.push(setInterval(()=>{
   const self=snapshot?.players.find(p=>p.id===response.playerId),target=snapshot?.players.find(p=>p.nickname==='开场测试');if(!self?.alive||!target)return;
   const angle=target.alive?Math.atan2(target.y-self.y,target.x-self.x):Date.now()/1200+index;
   const move=!target.alive||Math.hypot(target.x-self.x,target.y-self.y)>90;
   client.emit('match:input',{seq:++seq,moveX:move?Math.cos(angle):0,moveY:move?Math.sin(angle):0,aimAngle:angle,basicAttackPressed:target.alive,skillPressed:target.alive,ultimatePressed:target.alive,targetX:target.x,targetY:target.y});
  },100));
 }
 console.log(`${clients.length} players joined; auto-release after ${duration/1000}s. Commands: drop 0, end.`);
 await new Promise<void>(resolve=>{
  const timeout=setTimeout(resolve,duration);finish=()=>{clearTimeout(timeout);resolve();};
  process.stdin.setEncoding('utf8');process.stdin.on('data',data=>{const line=String(data).trim();if(line==='end')finish();else if(/^drop [0-6]$/.test(line)){const index=Number(line.split(' ')[1]);if(clients[index])void leave(clients[index]).then(()=>console.log(`Player ${index} left.`));}});
  process.once('SIGINT',finish);process.once('SIGTERM',finish);
 });
}finally{timers.forEach(clearInterval);await Promise.all(clients.map(leave));process.stdin.pause();}
