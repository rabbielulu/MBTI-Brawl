// UI smoke helper: normal lobby clients only; automatically releases every seat.
import {io,type Socket} from 'socket.io-client';
import {PROTOCOL_VERSION} from '../../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply} from '../../src/shared/LobbyProtocol';
const roomId=process.argv[2],clients:Socket<LobbyServerEvents,LobbyClientEvents>[]=[];
if(!roomId)throw new Error('Room ID required');
const identities=[['ENTP','杠精本人'],['INFP','小蝶'],['ESTP','阿强'],['ESTJ','项目经理二号'],['ENTP','还有一句'],['INFP','我真的没事'],['ESTP','先冲了']];
const close=()=>clients.forEach(c=>c.disconnect());process.once('SIGTERM',()=>{close();process.exit();});process.once('SIGINT',()=>{close();process.exit();});
try{for(const [mbti,nickname] of identities){const client:Socket<LobbyServerEvents,LobbyClientEvents>=io('http://127.0.0.1:3000/lobby',{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,autoConnect:false});clients.push(client);await new Promise<void>((resolve,reject)=>{client.once('connect',resolve);client.once('connect_error',reject);client.connect();});const response=await new Promise<LobbyReply>((resolve,reject)=>client.timeout(2000).emit('room:join',{roomId,identity:{mbti,nickname}},(error:Error|null,value:LobbyReply)=>error?reject(error):resolve(value)));if(!response.ok)throw new Error(response.message);}console.log('7 preview players joined; automatic cleanup in 15 seconds.');await new Promise(r=>setTimeout(r,15000));}finally{close();}
