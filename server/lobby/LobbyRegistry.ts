import {randomInt} from 'node:crypto';
import {LobbyError,LobbyRoom,validateRoomId} from './LobbyRoom';
import {DEFAULT_MAX_PLAYERS} from '../../src/shared/LobbyProtocol';
export class LobbyRegistry {
 readonly rooms=new Map<string,LobbyRoom>();
 create(now:number,maxPlayers=DEFAULT_MAX_PLAYERS){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let id='';do{id=Array.from({length:4},()=>alphabet[randomInt(alphabet.length)]).join('');}while(this.rooms.has(id));const room=new LobbyRoom(id,now,maxPlayers);this.rooms.set(id,room);return room;}
 get(id:unknown){const key=validateRoomId(id),room=this.rooms.get(key);if(!room)throw new LobbyError('ROOM_NOT_FOUND','找不到这个房间，可能所有人都已离开。请创建新房间。');return room;}
 remove(room:LobbyRoom,playerId:string,now:number){room.remove(playerId,now);if(![...room.players.values()].some(p=>p.connected&&!p.bot))this.rooms.delete(room.id);}
 get playerCount(){return [...this.rooms.values()].reduce((n,r)=>n+r.players.size,0);}
}
