import type {LobbyRoomState} from '../../shared/LobbyProtocol';
export const AUTO_SPECTATE_MS=3000;
/** Client presentation only. Alive/death and match phase always come from the server. */
export class SpectatorController {
 active=false;targetId?:string;deathAt?:number;
 private matchKey='';private candidates:string[]=[];private slots=new Map<string,number>();
 reset(){this.active=false;this.targetId=undefined;this.deathAt=undefined;this.matchKey='';this.candidates=[];this.slots.clear();}
 update(room:LobbyRoomState,ownId:string,now:number){
  const match=room.match,key=`${room.id}:${match?.startAt}`;
  if(this.matchKey!==key){this.reset();this.matchKey=key;}
  const own=match?.players.find(p=>p.id===ownId);
  if(room.phase!=='PLAYING'||!own||own.alive){this.active=false;this.targetId=undefined;this.candidates=[];this.deathAt=undefined;return;}
  this.deathAt??=Math.min(now,own.eliminatedAt??now);
  const alive=match!.players.filter(p=>p.alive&&p.id!==ownId);
  const connected=alive.filter(p=>p.connected),eligible=new Set((connected.length?connected:alive).map(p=>p.id));
  const oldSlot=this.targetId?this.slots.get(this.targetId)??-1:-1;
  this.slots=new Map(room.players.map(p=>[p.id,p.slot]));
  this.candidates=room.players.filter(p=>eligible.has(p.id)).sort((a,b)=>a.slot-b.slot).map(p=>p.id);
  if(this.active)this.chooseValid(oldSlot);
  else if(now-this.deathAt>=AUTO_SPECTATE_MS)this.enter();
 }
 private chooseValid(afterSlot=-1){if(this.targetId&&this.candidates.includes(this.targetId))return;this.targetId=this.candidates.find(id=>this.slots.get(id)!>afterSlot)??this.candidates[0];}
 enter(){if(this.deathAt===undefined)return;this.active=true;this.chooseValid();}
 switch(direction:-1|1){if(!this.active||!this.candidates.length)return;const index=this.candidates.indexOf(this.targetId!);this.targetId=this.candidates[(Math.max(index,0)+direction+this.candidates.length)%this.candidates.length];}
 get canSwitch(){return this.active&&this.candidates.length>1;}
 autoRemainingMs(now:number){return this.deathAt===undefined?AUTO_SPECTATE_MS:Math.max(0,AUTO_SPECTATE_MS-(now-this.deathAt));}
}
export function spectatorShortcut(event:{key:string;code?:string;repeat?:boolean;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean},editing=false):-1|0|1 {
 if(editing||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return 0;
 if(event.key==='ArrowLeft'||event.key.toLowerCase()==='a'||event.code==='KeyA')return -1;
 if(event.key==='ArrowRight'||event.key.toLowerCase()==='d'||event.code==='KeyD')return 1;
 return 0;
}
