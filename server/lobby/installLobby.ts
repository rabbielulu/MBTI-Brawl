import {randomUUID} from 'node:crypto';
import {NET} from '../../src/shared/GameConstants';
import type {Server,Namespace} from 'socket.io';
import {networkInterfaces} from 'node:os';
import {PROTOCOL_VERSION} from '../../src/shared/GameConstants';
import type {LobbyClientEvents,LobbyServerEvents,LobbyReply} from '../../src/shared/LobbyProtocol';
import {LobbyError,validateIdentity} from './LobbyRoom';
import type {LobbyRoom} from './LobbyRoom';
import {LobbyRegistry} from './LobbyRegistry';
export function installLobby(io:Server,port:()=>number){
 const registry=new LobbyRegistry(),namespace=io.of('/lobby') as Namespace<LobbyClientEvents,LobbyServerEvents>;
 namespace.use((socket,next)=>{if(socket.handshake.auth.protocolVersion!==PROTOCOL_VERSION)next(new Error('Host 版本不匹配，请重启 Host 并刷新页面。'));else next();});
 function inviteUrl(host:string|undefined,id:string){
  let origin:string;try{origin=new URL(`http://${host||'localhost'}`).origin;}catch{origin=`http://localhost:${port()}`;}
  const hostname=new URL(origin).hostname;
  if(['localhost','127.0.0.1','[::1]'].includes(hostname)){
   const interfaces=networkInterfaces(),ordered=[...(interfaces.en0||[]),...Object.entries(interfaces).filter(([name])=>name!=='en0').flatMap(([,entries])=>entries||[])];
   const lan=ordered.find(ip=>ip.family==='IPv4'&&!ip.internal&&!ip.address.startsWith('169.254.'));
   if(lan)origin=`http://${lan.address}:${port()}`;
  }
  return `${origin}/?room=${id}`;
 }
 const credentials=new Map<string,string>();
 const welcome=(room:LobbyRoom,playerId:string)=>({protocolVersion:PROTOCOL_VERSION,id:playerId,map:room.match!.game.map,snapshot:room.match!.game.snapshot()});
 const broadcast=(room:LobbyRoom)=>namespace.to(room.id).emit('room:update',room.snapshot(Date.now()));
 namespace.on('connection',socket=>{
  let membership:{room:LobbyRoom;playerId:string}|undefined;let rateStart=Date.now(),requests=0;
  const guard=()=>{const now=Date.now();if(now-rateStart>=5000){rateStart=now;requests=0;}if(++requests>12)throw new LobbyError('RATE_LIMITED','操作太快了，请稍等几秒再试。');};
  const reply=(ack:unknown,task:()=>LobbyReply)=>{if(typeof ack!=='function')return;try{guard();ack(task());}catch(error){const failure=error instanceof LobbyError?error:new LobbyError('NOT_IN_ROOM','房间操作失败，请重新进入。');ack({ok:false,code:failure.code,message:failure.message});}};
  const success=():LobbyReply=>({ok:true,playerId:membership!.playerId,room:membership!.room.snapshot(Date.now()),inviteUrl:inviteUrl(socket.handshake.headers.host,membership!.room.id),resumeToken:credentials.get(membership!.playerId)!});
  const leave=(unexpected=false)=>{if(!membership)return;const {room,playerId}=membership;membership=undefined;socket.leave(room.id);if(unexpected&&room.match){room.players.get(playerId)!.connected=false;room.match.disconnect(playerId,Date.now());room.step(Date.now());}else{credentials.delete(playerId);registry.remove(room,playerId,Date.now());if(room.players.has(playerId))room.players.get(playerId)!.connected=false;}
   if(![...room.players.values()].some(p=>p.connected)&&(!room.match||room.phase==='CANCELLED'||room.phase==='WINNER')){registry.rooms.delete(room.id);for(const p of room.players.values())credentials.delete(p.id);}
   if(room.players.size)broadcast(room);};
  socket.on('room:create',(identity,ack)=>reply(ack,()=>{
   if(membership)throw new LobbyError('ALREADY_IN_ROOM','已经在房间中，请先退出。');const data=validateIdentity(identity),now=Date.now(),room=registry.create(now),player=room.join(data,now);membership={room,playerId:player.id};credentials.set(player.id,randomUUID());socket.data.lobbyPlayerId=player.id;socket.join(room.id);broadcast(room);return success();
  }));
  socket.on('room:join',(request,ack)=>reply(ack,()=>{
   if(membership)throw new LobbyError('ALREADY_IN_ROOM','已经在房间中，请先退出。');const value=request&&typeof request==='object'?request as Record<string,unknown>:{};
   const data=validateIdentity(value.identity),room=registry.get(value.roomId);if(room.step(Date.now()))broadcast(room);const player=room.join(data,Date.now());membership={room,playerId:player.id};credentials.set(player.id,randomUUID());socket.data.lobbyPlayerId=player.id;socket.join(room.id);broadcast(room);return success();
  }));
  socket.on('player:updateIdentity',(identity,ack)=>reply(ack,()=>{if(!membership)throw new LobbyError('NOT_IN_ROOM','你已离开房间，请重新加入。');const data=validateIdentity(identity);if(membership.room.step(Date.now()))broadcast(membership.room);membership.room.update(membership.playerId,data,Date.now());broadcast(membership.room);return success();}));
  socket.on('room:leave',ack=>{leave();if(typeof ack==='function')ack();});
  socket.on('room:resume',(request,ack)=>reply(ack,()=>{
   if(membership)throw new LobbyError('ALREADY_IN_ROOM','已经在房间中。');
   const room=registry.get(request?.roomId),p=room.players.get(request?.playerId);
   if(!p||!room.match||p.connected||credentials.get(p.id)!==request?.token||!room.match.grace.has(p.id)||Date.now()>=room.match.grace.get(p.id)!)throw new LobbyError('NOT_IN_ROOM','席位已失效，请返回主页。');
   p.connected=true;room.match.reconnect(p.id);membership={room,playerId:p.id};socket.data.lobbyPlayerId=p.id;socket.join(room.id);socket.emit('match:welcome',welcome(room,p.id));broadcast(room);return success();
  }));
  socket.on('match:input',input=>{if(membership)membership.room.match?.input(membership.playerId,input);});
  socket.on('disconnect',()=>leave(true));
 });
 const announced=new WeakSet<LobbyRoom>();
 let frame=0,snapshotClock=0;
 const timer=setInterval(()=>{
  const now=Date.now();frame++;snapshotClock+=NET.snapshotRate;const sendSnapshot=snapshotClock>=NET.tickRate;if(sendSnapshot)snapshotClock-=NET.tickRate;
  for(const room of registry.rooms.values()){
   const changed=room.step(now);
   if(room.match&&!announced.has(room)){announced.add(room);
    for(const member of namespace.sockets.values()){const id=member.data.lobbyPlayerId;if(member.rooms.has(room.id)&&id)member.emit('match:welcome',welcome(room,id));}
   }
   if(changed||(room.match&&frame%3===0))broadcast(room);
   if(room.match){const events=room.match.game.drainEvents();if(events.length)namespace.to(room.id).emit('match:combat',events);if(sendSnapshot)namespace.to(room.id).emit('match:snapshot',room.match.game.snapshot());}
  }
 },1000/NET.tickRate);
 return {registry,close:()=>clearInterval(timer)};
}
