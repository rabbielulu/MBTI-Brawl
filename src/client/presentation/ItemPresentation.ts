import {ITEM_FRAMES,itemIconSvg} from './ItemIcons';
import type Phaser from 'phaser';
import type {GameSnapshot} from '../../shared/NetworkProtocol';
import type {CombatEvent} from '../../shared/combat/CombatTypes';
import {ITEM_CONFIG as C} from '../../shared/ItemConfig';
export class ItemPresentation {
 private images:Phaser.GameObjects.Image[]=[];private imageIndex=0;
 readonly g:Phaser.GameObjects.Graphics;readonly hud:HTMLDivElement;private clock=0;private traces: {event:Extract<CombatEvent,{type:'sniper'}>;until:number}[]=[];
 private feedback:{event:Extract<CombatEvent,{type:'item'}>;until:number}[]=[];private key='';private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private scene:Phaser.Scene){const texture=scene.textures.get('item-icons');for(const [key,f] of Object.entries(ITEM_FRAMES))if(!texture.has(key))texture.add(key,0,f.x,f.y,f.w,f.h);this.g=scene.add.graphics().setDepth(24);this.hud=document.createElement('div');this.hud.id='item-hud';this.hud.setAttribute('aria-label','道具状态');document.querySelector('#game-wrap')!.append(this.hud);scene.events.once('shutdown',()=>this.hud.remove());}
 event(event:CombatEvent){if(event.type==='sniper')this.traces.push({event,until:this.clock+.3});if(event.type==='item'&&(event.action==='picked'||event.action==='shield-broken'))this.feedback.push({event,until:this.clock+.65});}
 private icon(type: keyof typeof ITEM_FRAMES,x:number,y:number,size:number,rotation=0){const image=this.images[this.imageIndex]||this.scene.add.image(0,0,'item-icons').setDepth(25);this.images[this.imageIndex++]=image;const frame=ITEM_FRAMES[type];image.setFrame(type).setPosition(x,y).setDisplaySize(size*1.6,size*1.6*frame.h/frame.w).setRotation(rotation).setVisible(true);}
 clear(){for(const image of this.images)image.setVisible(false);this.traces=[];this.feedback=[];this.g.clear();this.hud.hidden=true;this.key='';}
 draw(snapshot:GameSnapshot|undefined,poses:ReadonlyMap<string,{x:number;y:number;aimAngle:number}>,id:string,dt:number,label:(x:number,y:number,text:string,size?:number,color?:string)=>unknown){
  this.imageIndex=0;for(const image of this.images)image.setVisible(false);this.clock+=dt;const g=this.g;g.clear();this.traces=this.traces.filter(t=>t.until>this.clock);this.feedback=this.feedback.filter(t=>t.until>this.clock);if(!snapshot){this.hud.hidden=true;return;}
  const now=(snapshot.itemNow||0),remaining=(until:number)=>Math.max(0,Math.ceil((until-now)/1000));
  for(const item of snapshot.pickups||[]){const data=C[item.type],bob=this.reduced.matches?0:Math.sin(this.clock*3+item.x)*3;g.fillStyle(0x70968b,.13);g.fillEllipse(item.x,item.y+20,42,12);this.icon(item.type,item.x,item.y-4+bob,item.type==='heart'?34:42);if(item.type==='sniper'){g.lineStyle(3,data.color,.12);g.lineBetween(item.x,item.y-26,item.x,item.y-90);label(item.x,item.y+32,'狙击枪',11,'#a65f68');}}
  for(const player of snapshot.players){if(!player.alive)continue;const p={...player,...poses.get(player.id)};const state=p.items;if(!state)continue;
   if((state.buffs.skatesExpiresAt||0)>now){g.fillStyle(0x80b5c9,.8);this.icon('skates',p.x,p.y+33,30);if(p.movementState==='walk'){g.lineStyle(2,0x80b5c9,.35);g.lineBetween(p.x-12,p.y+46,p.x-27,p.y+55);g.lineBetween(p.x+12,p.y+46,p.x+27,p.y+55);}}
   if(state.activeWeapon){const dx=Math.cos(p.aimAngle),dy=Math.sin(p.aimAngle);let range=C.sniperRange;
    // Continuous ray/AABB clipping avoids 10px endpoint jumps while moving.
    const clip=(minX:number,minY:number,maxX:number,maxY:number)=>{let near=-Infinity,far=Infinity;for(const [origin,direction,min,max] of [[p.x,dx,minX,maxX],[p.y,dy,minY,maxY]]){if(Math.abs(direction)<1e-8){if(origin<min||origin>max)return;continue;}const a=(min-origin)/direction,b=(max-origin)/direction;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}if(far>=Math.max(0,near))range=Math.min(range,Math.max(0,near));};
    const boundaryX=dx>1e-8?(1330-p.x)/dx:dx<-1e-8?(70-p.x)/dx:Infinity,boundaryY=dy>1e-8?(875-p.y)/dy:dy<-1e-8?(85-p.y)/dy:Infinity;range=Math.max(0,Math.min(range,boundaryX,boundaryY));for(const w of snapshot.covers||[])if(w.hp!==0)clip(w.x,w.y,w.x+w.w,w.y+w.h);
    g.lineStyle(state.activeWeapon.phase==='charging'?2:1,0xcb737b,state.activeWeapon.phase==='charging'?.8:.38);g.lineBetween(p.x,p.y,p.x+dx*range,p.y+dy*range);this.icon('sniper',p.x+dx*28,p.y+dy*28,67,p.aimAngle+Math.PI/6);}
  }
  for(const {event:e,until} of this.traces){g.lineStyle(4,0xca6875,Math.min(1,(until-this.clock)/.3));g.lineBetween(e.x,e.y,e.endX,e.endY);g.fillStyle(0xffdb77,.9);g.fillCircle(e.x,e.y,9);}
  for(const {event:e,until} of this.feedback){const t=1-(until-this.clock)/.65,p=snapshot.players.find(p=>p.id===e.playerId);if(e.action==='picked'){this.icon(e.pickupType,e.x+((p?.x||e.x)-e.x)*t,e.y+((p?.y||e.y)-e.y)*t-20-45*t,25);label(e.x+((p?.x||e.x)-e.x)*t,e.y+((p?.y||e.y)-e.y)*t-40*t,e.pickupType==='heart'?'+30%':C[e.pickupType].name,14,e.pickupType==='heart'?'#c9758e':'#729b92');}else{g.lineStyle(2,0x9f91cb,1-t);for(let i=0;i<8;i++){const a=i*Math.PI/4,r=40+t*35;g.lineBetween(e.x+Math.cos(a)*r,e.y-8+Math.sin(a)*r,e.x+Math.cos(a)*(r+8),e.y-8+Math.sin(a)*(r+8));}}}
  const own=snapshot.players.find(p=>p.id===id),state=own?.items;this.hud.hidden=!own?.alive;const chips=[state?.activeWeapon?`⌖ 狙击 · ${state.activeWeapon.phase==='charging'?'蓄力':remaining(state.activeWeapon.expiresAt)+'s'} · 1发`:'⌖ 武器槽 · 空',...(state?.buffs.skatesExpiresAt?[`⛸ 溜冰鞋 ${remaining(state.buffs.skatesExpiresAt)}s`]:[])];const key=chips.join('|');if(key!==this.key){this.key=key;this.hud.replaceChildren(...chips.map((text,i)=>{const span=document.createElement('span');span.append(itemIconSvg(i===0?'sniper':'skates'),document.createTextNode(text.replace(/^[⌖⛸]\s*/,'')));return span;}));}
 }
}
