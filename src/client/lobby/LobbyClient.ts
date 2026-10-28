import type {Welcome,GameSnapshot,PlayerInput} from '../../shared/NetworkProtocol';
import type {CombatEvent} from '../../shared/combat/CombatTypes';
import {io,type Socket} from 'socket.io-client';
import {PROTOCOL_VERSION} from '../../shared/GameConstants';
import type {PlayerIdentity,LobbyClientEvents,LobbyServerEvents,LobbyRoomState,LobbyReply} from '../../shared/LobbyProtocol';
export class LobbyClient {
 onMatch?:(welcome:Welcome)=>void;bridge?:{snapshot:(snapshot:GameSnapshot)=>void;combat:(events:CombatEvent[])=>void;disconnected:()=>void};
 private resumeToken='';private retry?:ReturnType<typeof setTimeout>;private resumeUntil=0;
 sendInput(input:PlayerInput){if(this.socket?.connected&&this.room?.phase==='PLAYING'&&this.room.match?.players.find(p=>p.id===this.playerId)?.alive)this.socket.emit('match:input',input);}
 private pending=new Set<(error:Error)=>void>();
 private socket?:Socket<LobbyServerEvents,LobbyClientEvents>;private intentional=false;
 playerId='';room?:LobbyRoomState;inviteUrl='';serverOffset=0;
 constructor(private changed:(room:LobbyRoomState)=>void,private disconnected:(reason?:string)=>void){}
 private receive(room:LobbyRoomState){this.room=room;this.serverOffset=room.serverNow-Date.now();this.changed(room);}
 private request(event:'room:create'|'room:join'|'player:updateIdentity'|'room:resume'|'room:addBot'|'room:debugStart'|'room:rematch'|'room:createPractice'|'practice:reset',payload:unknown){return new Promise<void>((resolve,reject)=>{
  const socket=this.socket;
  if(!socket?.connected){reject(new Error('与服务器的连接已断开，请重新进入房间。'));return;}
  this.pending.add(reject);
  socket.timeout(6000).emit(event,payload,(error:Error|null,response:LobbyReply)=>{
   this.pending.delete(reject);
   if(this.socket!==socket){reject(new Error('连接操作已取消。'));return;}
   if(error){reject(new Error('服务器未及时回应，请检查网络后重试。'));return;}
   if(!response.ok){reject(new Error(response.message));return;}
   this.resumeToken=response.resumeToken;this.playerId=response.playerId;this.inviteUrl=response.inviteUrl;this.receive(response.room);resolve();
  });
 });}
 async enter(identity:PlayerIdentity,roomId?:string,botCount?:number){
  this.close();this.intentional=false;
  const socket:Socket<LobbyServerEvents,LobbyClientEvents>=this.socket=io('/lobby',{auth:{protocolVersion:PROTOCOL_VERSION},reconnection:false,timeout:5000,autoConnect:false});
  socket.on('room:update',room=>this.receive(room));
  socket.on('match:welcome',welcome=>this.onMatch?.(welcome));
  socket.on('match:snapshot',snapshot=>this.bridge?.snapshot(snapshot));
  socket.on('match:combat',events=>this.bridge?.combat(events));
  socket.on('connect',()=>{if(this.resumeUntil){void this.request('room:resume',{roomId:this.room?.id,playerId:this.playerId,token:this.resumeToken}).then(()=>{this.resumeUntil=0;}).catch(()=>{this.resumeUntil=0;this.disconnected('无法恢复原席位，请退出本局后重新创建房间。');});}});
  socket.on('disconnect',()=>{
   this.bridge?.disconnected();if(this.intentional)return;
   this.disconnected();
   if(this.room?.match){this.resumeUntil=Date.now()+9500;const reconnect=()=>{if(this.intentional||this.socket!==socket||!this.resumeUntil)return;if(Date.now()>=this.resumeUntil){this.resumeUntil=0;this.disconnected('未能恢复连接，席位可能已失效。请退出本局后重新创建房间。');return;}socket.connect();this.retry=setTimeout(reconnect,1000);};this.retry=setTimeout(reconnect,250);}
  });
  await new Promise<void>((resolve,reject)=>{this.pending.add(reject);socket.once('connect',()=>{this.pending.delete(reject);resolve();});socket.once('connect_error',error=>{if(this.resumeUntil)return;this.pending.delete(reject);reject(new Error(error.message.includes('版本')?error.message:'连接失败，请确认 Host 已启动，再重新进入房间。'));if(this.socket===socket)this.close();});socket.connect();});
  try{await this.request(botCount!==undefined?'room:createPractice':roomId?'room:join':'room:create',botCount!==undefined?{identity,botCount}:roomId?{roomId,identity}:identity);}catch(error){if(this.socket===socket)this.close();throw error;}
 }
 resetPractice(){return this.request('practice:reset',{});}
 rematch(){return this.request('room:rematch',{endedAt:this.room?.match?.result?.endedAt});}
 debugStart(){return this.request('room:debugStart',{});}
 addBot(){return this.request('room:addBot',{});}
 update(identity:PlayerIdentity){return this.request('player:updateIdentity',identity);}
 close(){clearTimeout(this.retry);this.resumeUntil=0;this.bridge=undefined;this.intentional=true;for(const reject of this.pending)reject(new Error('连接操作已取消。'));this.pending.clear();if(this.socket?.connected)this.socket.emit('room:leave',()=>{});this.socket?.removeAllListeners();this.socket?.disconnect();this.socket=undefined;this.room=undefined;this.playerId='';}
 now(){return Date.now()+this.serverOffset;}
}
