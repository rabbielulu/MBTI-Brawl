import {GardenBots} from './GardenBots';
import type {Server} from 'socket.io';
import {GardenWorld} from '../../src/shared/garden/GardenWorld';
import {GARDEN,type GardenInput} from '../../src/shared/garden/GardenConfig';
import {isPlayable} from '../../src/shared/characters/CharacterDatabase';
/** Separate namespace: garden sockets never join a combat room. */
export function installGarden(io:Server){
 const nsp=io.of('/garden'),world=new GardenWorld(),bots=new GardenBots(world);
 nsp.on('connection',socket=>{
  const {nickname,mbti}=socket.handshake.auth;
  if(typeof nickname!=='string'||!nickname.trim()||Array.from(nickname.trim()).length>12||/[\u0000-\u001f\u007f]/.test(nickname)||!isPlayable(mbti)){socket.emit('garden:error','角色资料无效，请返回重新选择。');socket.disconnect();return;}
  if(!world.add(socket.id,nickname.trim(),mbti)){socket.emit('garden:error','花园已满（30 人），稍后再来吧。');socket.disconnect();return;}
  socket.emit('garden:welcome',{id:socket.id,...world.snapshot()});
  let messages=0;
  socket.on('garden:input',(input:GardenInput)=>{if(++messages<100)world.input(socket.id,input);});
  socket.on('garden:bots:add',()=>{if(++messages>=100)return;const count=bots.add(socket.id);socket.emit('garden:bots:result',count?`已加入 ${count} 位测试机器人：站立、散步、躺平。`:'机器人已添加或花园人数已满。');});
  socket.on('garden:bots:clear',()=>{if(++messages>=100)return;bots.remove(socket.id);socket.emit('garden:bots:result','你的测试机器人已移除。');});
  const limiter=setInterval(()=>{messages=0;},1000);
  socket.on('disconnect',()=>{clearInterval(limiter);bots.remove(socket.id);world.remove(socket.id);});
 });
 const simulation=setInterval(()=>{bots.step();world.step();},1000/GARDEN.tickRate);
 const broadcast=setInterval(()=>nsp.emit('garden:state',world.snapshot()),1000/GARDEN.snapshotRate);
 return {world,close(){clearInterval(simulation);clearInterval(broadcast);}};
}
