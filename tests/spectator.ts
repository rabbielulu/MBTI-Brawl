import assert from 'node:assert/strict';
import {SpectatorController,spectatorShortcut} from '../src/client/spectator/SpectatorController';
import {LobbyClient} from '../src/client/lobby/LobbyClient';
import {NetworkClient} from '../src/client/network/NetworkClient';
import {GameRoom} from '../server/GameRoom';
import type {LobbyRoomState} from '../src/shared/LobbyProtocol';
import {PROTOCOL_VERSION} from '../src/shared/GameConstants';
const room=():LobbyRoomState=>({id:'ABCD',phase:'PLAYING',maxPlayers:8,createdAt:0,serverNow:5000,players:['self','a','b','c'].map((id,slot)=>({id,slot,mbti:'ENTP',nickname:'同名',connected:true,joinedAt:0})),match:{startAt:1000,protectionEnd:3000,draw:false,players:['self','a','b','c'].map(id=>({id,alive:id!=='self',connected:true,hp:id==='self'?0:100,personality:0,kills:0,damageDealt:0,...(id==='self'?{eliminatedAt:5000,placement:4}: {})}))}});
{
 const r=room(),c=new SpectatorController();c.update(r,'self',5000);assert.equal(c.active,false);assert.equal(c.autoRemainingMs(6000),2000);c.update(r,'self',7999);assert.equal(c.active,false);c.update(r,'self',8000);assert.equal(c.active,true);assert.equal(c.targetId,'a');
 c.switch(-1);assert.equal(c.targetId,'c');c.switch(1);assert.equal(c.targetId,'a');c.switch(1);assert.equal(c.targetId,'b');
 c.update(structuredClone(r),'self',8200);assert.equal(c.targetId,'b','Snapshots preserve choice');
 r.match!.players.find(p=>p.id==='b')!.alive=false;c.update(r,'self',8300);assert.equal(c.targetId,'c','Eliminated target advances to next slot');
 r.match!.players.find(p=>p.id==='c')!.connected=false;c.update(r,'self',8400);assert.equal(c.targetId,'a','Prefer connected survivors');assert.equal(c.canSwitch,false);c.switch(1);assert.equal(c.targetId,'a');
 r.match!.players.find(p=>p.id==='a')!.connected=false;c.update(r,'self',8500);assert.ok(['a','c'].includes(c.targetId!),'Grace-period survivors still available if all alive are offline');
 r.match!.players.forEach(p=>p.alive=false);c.update(r,'self',8600);assert.equal(c.targetId,undefined);assert.equal(c.canSwitch,false);
 r.phase='WINNER';c.update(r,'self',8700);assert.equal(c.active,false);assert.equal(c.targetId,undefined);r.phase='CANCELLED';c.update(r,'self',8800);assert.equal(c.active,false);
 c.reset();assert.equal(c.deathAt,undefined);
}
{
 const r=room(),c=new SpectatorController();c.update(r,'self',5100);c.enter();assert.equal(c.active,true);assert.equal(c.targetId,'a','Immediate watch skips wait');
 c.update(r,'self',6000);assert.equal(c.active,true,'Reconnect snapshot does not restart watch');
 r.id='EFGH';r.match!.players[0].alive=true;c.update(r,'self',6100);assert.equal(c.active,false,'New room resets spectator');c.enter();assert.equal(c.active,false,'Alive player cannot spectate');
}
for(const key of ['a','A','ArrowLeft'])assert.equal(spectatorShortcut({key}),-1);
for(const key of ['d','D','ArrowRight'])assert.equal(spectatorShortcut({key}),1);
for(const event of [{key:'d',repeat:true},{key:'d',ctrlKey:true},{key:'d',metaKey:true},{key:'d',altKey:true},{key:'w'}])assert.equal(spectatorShortcut(event),0);
assert.equal(spectatorShortcut({key:'d'},true),0,'Typing does not switch');
{
 const lobby=new LobbyClient(()=>{},()=>{}),r=room();r.match!.players[0].alive=true;lobby.room=r;lobby.playerId='self';
 let sent=0;(lobby as any).socket={connected:true,emit:(event:string)=>{if(event==='match:input')sent++;}};
 const game=new GameRoom(8);for(const p of r.players)game.add(p.id,p.nickname,p.mbti,p.id);
 const client=new NetworkClient();client.attach({protocolVersion:PROTOCOL_VERSION,id:'self',map:game.map,snapshot:game.snapshot()},lobby);
 const intent={moveX:1,moveY:1,aimAngle:0,basicAttackPressed:true,skillPressed:true,ultimatePressed:true};
 client.sendIntent(intent);assert.equal(sent,1,'Alive gameplay still transmits');const seq=client.seq;
 // A death snapshot arrives ahead of the slower room metadata.
 game.players.get('self')!.alive=false;game.players.get('self')!.hp=0;client.receive(game.snapshot());
 for(let i=0;i<10;i++){client.sendIntent(intent);client.send(0,0,0,true);}
 assert.equal(sent,1,'Death snapshot blocks all input including clear/blur/resize packets');assert.equal(client.seq,seq,'Spectators do not generate input sequence numbers');
 r.match!.players[0].alive=false;lobby.sendInput({seq:99,...intent});assert.equal(sent,1,'Lobby transport also blocks dead input');
 r.match!.players[0].alive=true;game.players.get('self')!.alive=true;client.receive(game.snapshot());r.phase='WINNER';client.sendIntent(intent);lobby.sendInput({seq:100,...intent});assert.equal(sent,1,'Terminal phase blocks gameplay');
 client.close();
}
console.log('PASS M3: 3s auto/immediate watch, wrap switching, stable targets, death/offline fallback, no-target/terminal/reset, keyboard guards, and zero gameplay packets or seq changes after death.');
