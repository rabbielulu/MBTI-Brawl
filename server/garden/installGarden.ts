import {randomUUID} from 'node:crypto';
import {FlowerStore} from './FlowerStore';
import type {FlowerRequest,FlowerEraseRequest} from '../../src/shared/garden/FlowerConfig';
import {GardenBots} from './GardenBots';
import type {Server} from 'socket.io';
import {GardenWorld} from '../../src/shared/garden/GardenWorld';
import {GARDEN,type GardenInput} from '../../src/shared/garden/GardenConfig';
import {isPlayable} from '../../src/shared/characters/CharacterDatabase';
/** Separate namespace: garden sockets never join a combat room. */
export function installGarden(io:Server){
 const nsp=io.of('/garden'),world=new GardenWorld(),bots=new GardenBots(world),flowers=new FlowerStore();
 const sessions=new Map<string,{id:string;socket?:string;expires:number}>();
 nsp.on('connection',socket=>{
  const {nickname,mbti}=socket.handshake.auth;
  if(typeof nickname!=='string'||!nickname.trim()||Array.from(nickname.trim()).length>12||/[\u0000-\u001f\u007f]/.test(nickname)||!isPlayable(mbti)){socket.emit('garden:error','角色资料无效，请返回重新选择。');socket.disconnect();return;}
  const supplied=socket.handshake.auth.gardenSession;
  const token=typeof supplied==='string'&&/^[a-f0-9-]{36}$/i.test(supplied)?supplied:randomUUID();
  let session=sessions.get(token);
  if(session?.socket){socket.emit('garden:error','花园席位已在另一个连接中使用。');socket.disconnect();return;}
  if(!session||session.expires<Date.now())session={id:randomUUID(),expires:Infinity};
  const id=session.id;
  if(!world.add(id,nickname.trim(),mbti)){socket.emit('garden:error','花园已满（30 人），稍后再来吧。');socket.disconnect();return;}
  session.socket=socket.id;session.expires=Infinity;sessions.set(token,session);
  socket.emit('garden:welcome',{id,gardenSession:token,...world.snapshot(),flowerSnapshot:flowers.snapshot()});
  let messages=0;
  socket.on('garden:input',(input:GardenInput)=>{if(++messages<100)world.input(id,input);});
  socket.on('garden:bots:add',()=>{if(++messages>=100)return;const count=bots.add(id);socket.emit('garden:bots:result',count?`已加入 ${count} 位测试机器人：站立、散步、躺平。`:'机器人已添加或花园人数已满。');});
  socket.on('garden:bots:clear',()=>{if(++messages>=100)return;bots.remove(id);socket.emit('garden:bots:result','你的测试机器人已移除。');});
  socket.on('garden:flowers:plant',(request:FlowerRequest)=>{
   if(++messages>=100){socket.emit('garden:flowers:result',{requestId:request?.requestId,message:'请求过快，请稍后重试'});return;}
   const response=flowers.plant(id,world.players.get(id),request,world.time);
   if(response.delta)nsp.emit('garden:flowers:delta',response.delta);
   socket.emit('garden:flowers:result',response.result);
  });
  socket.on('garden:flowers:erase',(request:FlowerEraseRequest)=>{
   if(++messages>=100){socket.emit('garden:flowers:result',{requestId:request?.requestId,message:'请求过快，请稍后重试'});return;}
   const response=flowers.erase(id,world.players.get(id),request);
   if(response.delta)nsp.emit('garden:flowers:delta',response.delta);
   socket.emit('garden:flowers:result',response.result);
  });
  socket.on('garden:flowers:sync',()=>{if(++messages<100)socket.emit('garden:flowers:snapshot',flowers.snapshot());});
  const limiter=setInterval(()=>{messages=0;},1000);
  socket.on('disconnect',()=>{clearInterval(limiter);bots.remove(id);world.remove(id);session!.socket=undefined;session!.expires=Date.now()+30000;
   // Existing garden lifetime: the shared garden ends when its last occupant leaves.
   if(!world.players.size){flowers.clear();sessions.clear();}
  });
 });
 const simulation=setInterval(()=>{bots.step();world.step();for(const [token,session] of sessions)if(!session.socket&&session.expires<Date.now()){flowers.forget(session.id);sessions.delete(token);}},1000/GARDEN.tickRate);
 const broadcast=setInterval(()=>nsp.emit('garden:state',world.snapshot()),1000/GARDEN.snapshotRate);
 return {world,flowers,close(){clearInterval(simulation);clearInterval(broadcast);flowers.clear();sessions.clear();}};
}
