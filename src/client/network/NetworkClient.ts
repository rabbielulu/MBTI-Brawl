import type {LobbyClient} from '../lobby/LobbyClient';
import {ProjectileTimeline} from './ProjectileTimeline';
import type {MBTIType} from '../../shared/characters/CharacterDefinition';
import type {InputIntent} from '../input/InputAdapter';
import { io, type Socket } from 'socket.io-client';
import type { CombatEvent } from '../../shared/combat/CombatTypes';
import { NET,PROTOCOL_VERSION } from '../../shared/GameConstants';
import type { ClientEvents,GameSnapshot,NetworkPlayerState,PlayerInput,ServerEvents,NetworkHit,Welcome } from '../../shared/NetworkProtocol';
export class NetworkClient {
 lobby?:LobbyClient;
 attach(welcome:Welcome,client:LobbyClient){const seq=this.lobby===client&&this.id===welcome.id?this.seq:0;this.close();this.lobby=client;this.id=welcome.id;this.seq=seq;this.nextSend=0;this.lastHitId=0;this.connected=true;this.status='CONNECTED';this.receive(welcome.snapshot);client.bridge={snapshot:s=>this.receive(s),combat:events=>{for(const e of events)if(e.id>this.lastHitId){this.lastHitId=e.id;this.combatQueue.push(e);}},disconnected:()=>{this.connected=false;this.status='RECONNECTING';}};}
 private emitInput(input:PlayerInput){if(this.lobby)this.lobby.sendInput(input);else this.socket?.emit('input',input);}
 readonly projectileTimeline=new ProjectileTimeline();
 combatQueue:CombatEvent[]=[]; lastHitId=0; jitter=0;
 socket?:Socket<ServerEvents,ClientEvents>; id=''; connected=false; status='DISCONNECTED';ping=0;tick=0;
 snapshots:{at:number;value:GameSnapshot}[]=[];pingTimer?:ReturnType<typeof setInterval>;seq=0;nextSend=0;
 connect(nickname:string,mbti:MBTIType='ENTP'):Promise<Welcome> {
  this.close(); this.status='CONNECTING';this.id='';this.seq=0;this.nextSend=0;this.lastHitId=0;this.combatQueue=[];
  const socket:Socket<ServerEvents,ClientEvents>=this.socket=io({auth:{nickname,mbti},reconnection:false,timeout:5000,autoConnect:false});
  return new Promise((resolve,reject)=>{
   const fail=(reason:string)=>{this.status=reason;this.close();reject(new Error(reason));};
   const timeout=setTimeout(()=>fail('连接超时，请确认 LAN 服务已启动。'),6000);
   socket.on('welcome',welcome=>{clearTimeout(timeout);if(welcome.protocolVersion!==PROTOCOL_VERSION){fail('Host 版本不匹配，请停止旧 Host 并重新启动，再刷新页面。');return;}this.id=welcome.id;this.connected=true;this.status='CONNECTED';this.receive(welcome.snapshot);resolve(welcome);});
   socket.on('rejected',reason=>{clearTimeout(timeout);fail(reason);});
   socket.on('connect_error',()=>{clearTimeout(timeout);fail('无法连接服务器，请运行 npm run dev 或 start:lan。');});
   socket.on('snapshot',snapshot=>this.receive(snapshot));
   socket.on('combat',events=>{for(const event of events){if(event.id>this.lastHitId){this.lastHitId=event.id;this.combatQueue.push(event);if(this.combatQueue.length>256)this.combatQueue.splice(0,this.combatQueue.length-256);}}});
   socket.on('disconnect',()=>{this.connected=false;if(this.status==='CONNECTED')this.status='DISCONNECTED';this.snapshots=[];this.projectileTimeline.clear();});
   this.pingTimer=setInterval(()=>{if(this.connected){const start=performance.now();socket.timeout(2000).emit('ping',(error:Error|null)=>{if(error)return;const ping=Math.round(performance.now()-start);this.jitter=Math.round(.75*this.jitter+.25*Math.abs(ping-this.ping));this.ping=ping;});}},1000);
   socket.connect();
  });
 }
 receive(value:GameSnapshot){const at=performance.now();this.tick=value.tick;this.projectileTimeline.receive(value,at);this.snapshots.push({at,value});if(this.snapshots.length>40)this.snapshots.shift();}
 send(moveX:number,moveY:number,aimAngle:number,force=false,basicAttackPressed=false){const now=performance.now();if(!this.connected||(!force&&now<this.nextSend))return;this.nextSend=now+1000/NET.inputRate;const input:PlayerInput={seq:++this.seq,moveX,moveY,aimAngle,basicAttackPressed,skillPressed:false,ultimatePressed:false};this.emitInput(input);}
 sendIntent(input:InputIntent){const force=input.basicAttackPressed||input.skillPressed||input.ultimatePressed;const now=performance.now();if(!this.connected||(!force&&now<this.nextSend))return;this.nextSend=now+1000/NET.inputRate;this.emitInput({...input,seq:++this.seq});}
 projectiles(now=performance.now()){return this.projectileTimeline.sample(now);}
 local(){return this.snapshots.at(-1)?.value.players.find(p=>p.id===this.id);}
 remotes(now=performance.now()):NetworkPlayerState[]{
  const newest=this.snapshots.at(-1);if(!newest)return [];
  const time=now-NET.interpolationMs;let before=this.snapshots[0],after=newest;
  for(const item of this.snapshots){if(item.at<=time)before=item;if(item.at>=time){after=item;break;}}
  const alpha=after.at===before.at?1:Math.max(0,Math.min(1,(time-before.at)/(after.at-before.at)));
  return newest.value.players.filter(p=>p.id!==this.id).map(p=>{const a=before.value.players.find(v=>v.id===p.id)||p,b=after.value.players.find(v=>v.id===p.id)||p;const angle=Math.atan2(Math.sin(b.aimAngle-a.aimAngle),Math.cos(b.aimAngle-a.aimAngle));return {...b,hp:p.hp,x:a.x+(b.x-a.x)*alpha,y:a.y+(b.y-a.y)*alpha,aimAngle:a.aimAngle+angle*alpha};});
 }
 resetTraining(){if(this.connected&&!this.lobby)this.socket!.emit('resetTraining');}
 close(){if(this.lobby)this.lobby.bridge=undefined;this.lobby=undefined;this.combatQueue=[];clearInterval(this.pingTimer);this.socket?.removeAllListeners();this.socket?.disconnect();this.connected=false;this.snapshots=[];this.projectileTimeline.clear();}
}
