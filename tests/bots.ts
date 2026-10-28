import assert from 'node:assert/strict';
import {LobbyRegistry} from '../server/lobby/LobbyRegistry';
import {LobbyError} from '../server/lobby/LobbyRoom';
import {GameRoom} from '../server/GameRoom';
import {BotController} from '../server/bots/BotController';
import {isPlayable,PLAYABLE_TYPES} from '../src/shared/characters/CharacterDatabase';
import {addBotShortcut} from '../src/client/lobby/BotShortcut';
import {blocked} from '../src/rules';
{
 const registry=new LobbyRegistry(),r=registry.create(0),human=r.join({mbti:'ENTP',nickname:'真人'},0);
 const bot=r.addBot(1000);assert.equal(bot.bot,true);assert.ok(isPlayable(bot.mbti));assert.equal(r.players.size,2);assert.equal(r.lobbyCountdownEnd,31000);assert.equal(human.bot,undefined);
 for(let i=0;i<6;i++)r.addBot(1000);assert.equal(r.players.size,8);assert.equal(r.lobbyCountdownEnd,6000);assert.equal(new Set([...r.players.values()].map(p=>p.nickname)).size,8);
 assert.throws(()=>r.addBot(1000),e=>e instanceof LobbyError&&e.code==='ROOM_FULL');r.step(6000);assert.equal(r.phase,'COUNTDOWN');assert.equal(r.match!.bots.size,7);
 r.step(9000);assert.equal(r.phase,'PLAYING');assert.equal(r.match!.game.combatEnabled,false);r.step(9167);assert.equal(r.match!.game.projectiles.length,0);assert.equal(r.match!.game.zones.length,0);
 assert.throws(()=>r.addBot(9167),e=>e instanceof LobbyError&&e.code==='MATCH_ALREADY_STARTED');
 registry.remove(r,human.id,9200);assert.equal(r.phase,'CANCELLED');assert.equal(registry.rooms.size,0,'Bots cannot keep a room alive without humans');
 const lobby=registry.create(0),owner=lobby.join({mbti:'ENTP',nickname:'真人'},0);lobby.addBot(1);registry.remove(lobby,owner.id,2);assert.equal(registry.rooms.size,0,'Lobby-only bots are also cleaned');
}
for(const type of PLAYABLE_TYPES){
 const game=new GameRoom(8);const human=game.add('h','真人','ENTP','human')!,bot=game.add('b','机器人',type,'bot')!;
 game.map.walls=[{x:650,y:365,w:95,h:230}];game.map.mud=[];Object.assign(human,{x:1000,y:500});Object.assign(bot,{x:420,y:500});
 const ai=new BotController(game,new Set([bot.id]));let attacks=0,moved=false,damaged=false;
 for(let i=0;i<600;i++){
  ai.update();game.step();if(Math.hypot(bot.x-420,bot.y-500)>50)moved=true;
  for(const e of game.drainEvents())if(e.attackerId===bot.id&&e.type==='attack')attacks++;
  if(human.hp<human.maxHp)damaged=true;assert.ok(Number.isFinite(bot.x)&&Number.isFinite(bot.y));assert.ok(!blocked(bot.x,bot.y,24,game.map.walls));
 }
 assert.ok(moved,`${type} navigates`);assert.ok(attacks>0,`${type} attacks through normal rules`);assert.ok(damaged,`${type} causes real damage after navigating around cover`);
 bot.alive=false;bot.hp=0;game.projectiles=[];game.zones=[];game.drainEvents();const lastSeq=game.inputs.get(bot.id)!.input.seq;
 for(let i=0;i<30;i++){ai.update();game.step();}assert.equal(game.inputs.get(bot.id)!.input.seq,lastSeq,'Dead bots stop issuing input');
}
assert.equal(addBotShortcut({key:'n'}),true);assert.equal(addBotShortcut({key:'N'}),true);
for(const e of [{key:'n',repeat:true},{key:'n',ctrlKey:true},{key:'n',metaKey:true},{key:'n',altKey:true},{key:'a'}])assert.equal(addBotShortcut(e),false);
assert.equal(addBotShortcut({key:'n'},true),false,'Typing does not spawn bots');
console.log('PASS bots: add/8 seats/countdown/full/phase locks, spawn protection, cleanup without humans, all 16 kits navigate cover and cause actual damage, dead-input lock and shortcut guards.');
