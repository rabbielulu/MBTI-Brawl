// UI smoke helper: normal lobby clients only; automatically releases every seat.
import {io,type Socket} from 'socket.io-client';
import {PROTOCOL_VERSION} from '../../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply} from '../../src/shared/LobbyProtocol';
const roomId=process.argv[2],clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[];
if(!roomId)throw new Error('Room ID required');
const identities=[['ENTP','杠精本人'],['INFP','小蝶'],['ESTP','阿强'],['ESTJ','项目经理二号'],['ENTP','还有一句'],['INFP','我真的没事'],['ESTP','先冲了']];
const botTimers:ReturnType<typeof setInterval>[]=[];
const close=()=>{botTimers.forEach(clearInterval);release();};
const release=()=>clients.forEach(c=>{if(c.connected)c.emit('room:leave',()=>c.disconnect());else c.disconnect();});process.once('SIGTERM',()=>{close();process.exit();});process.once('SIGINT',()=>{close();process.exit();});
try{for(const [mbti,nickname] of identities.slice(0,Number(process.argv[4]||7))){const client:Socket<LobbyServerEvents,LobbyClientEvents>=io('http://127.0.0.1:3000/lobby',{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,autoConnect:false});clients.push(client);await new Promise<void>((resolve,reject)=>{client.once('connect',resolve);client.once('connect_error',reject);client.connect();});const response=await new Promise<LobbyReply>((resolve,reject)=>client.timeout(2000).emit('room:join',{roomId,identity:{mbti,nickname}},(error:Error|null,value:LobbyReply)=>error?reject(error):resolve(value)));if(!response.ok)throw new Error(response.message);if(process.argv[5]==='attack'){
 let latest:any,seq=0;const id=response.playerId;client.on('match:snapshot',snapshot=>latest=snapshot);
 botTimers.push(setInterval(()=>{const self=latest?.players.find((p:any)=>p.id===id),target=latest?.players.find((p:any)=>p.nickname==='开场测试');if(!self?.alive||!target?.alive)return;const angle=Math.atan2(target.y-self.y,target.x-self.x),distance=Math.hypot(target.x-self.x,target.y-self.y);client.emit('match:input',{seq:++seq,moveX:distance>95?Math.cos(angle):0,moveY:distance>95?Math.sin(angle):0,aimAngle:angle,basicAttackPressed:true,skillPressed:true,ultimatePressed:true,targetX:target.x,targetY:target.y});},100));
 }}console.log(`${clients.length} preview players joined; automatic cleanup in ${Number(process.argv[3]||120000)/1000} seconds.`);await new Promise(r=>setTimeout(r,Number(process.argv[3]||120000)));}finally{close();}
