import {applyFlowerDelta} from '../../shared/garden/FlowerReplica';
import type {Socket} from 'socket.io-client';
import {GARDEN,type GardenPlayer} from '../../shared/garden/GardenConfig';
import {FLOWERS as F,FLOWER_PALETTE,gardenToken,flowerCapacity,flowerCell,flowerCenter,flowerKey,flowerLine,validFlowerCell,normalizeFlowerColor,type FlowerCell,type FlowerRecord,type FlowerSnapshot,type FlowerDelta,type FlowerResult} from '../../shared/garden/FlowerConfig';
type Mode='off'|'plant'|'erase';
type Pending={cells:FlowerCell[];at:number};
/** Room-local UI and prediction. Every permanent flower comes from the authority. */
export class FlowerTool{
 mode:Mode='off';color=FLOWER_PALETTE[0];private paletteOpen=false;private revision=0;private roomId='';
 private flowers=new Map<string,FlowerRecord>();private occupied=new Map<string,FlowerRecord>();
 private predictions=new Map<string,FlowerCell&{color:string}>();private pending=new Map<string,Pending>();
 private queue:FlowerCell[]=[];private seen=new Set<string>();private drawing=false;private pointerId:number|null=null;private last?:FlowerCell;private target?:FlowerCell;private valid=false;
 private sprites=new Map<string,HTMLCanvasElement>();private bands=new Map<number,HTMLCanvasElement>();private panel:HTMLElement;private preview:HTMLElement;private debug:HTMLElement;private abort=new AbortController();private timer:ReturnType<typeof setInterval>;private syncing=false;private lastRender=0;private intervals:number[]=[];private costs:number[]=[];private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(private root:HTMLElement,private socket:Socket,private players:()=>GardenPlayer[],private ownId:()=>string,private status:(message:string)=>void){
  this.panel=document.createElement('aside');this.panel.className='flower-tool';this.panel.setAttribute('aria-label','花花涂鸦工具');
  this.panel.innerHTML=`<button type="button" id="flower-open" aria-expanded="false">✿ 花朵工具</button><div class="flower-toolbar" hidden><b>花花涂鸦</b><span class="flower-sample" aria-hidden="true">✿</span><button type="button" id="flower-paint" aria-pressed="true">种花</button><button type="button" id="flower-palette" aria-expanded="false">调色板</button><button type="button" id="flower-erase" aria-pressed="false">橡皮擦</button><button type="button" id="flower-close">退出</button><small id="flower-quota"></small></div><div class="flower-palette" hidden><b>选一种心情</b><div class="flower-swatches">${FLOWER_PALETTE.map(c=>`<button type="button" data-flower-color="${c}" style="--swatch:${c}" aria-label="花瓣颜色 ${c}"></button>`).join('')}</div><label>自定义颜色 <input id="flower-color" type="color" value="${this.color}"></label><button type="button" id="flower-palette-done">选好了</button></div>`;
  this.root.append(this.panel);this.preview=document.createElement('div');this.preview.className='flower-preview';this.preview.hidden=true;this.preview.setAttribute('aria-hidden','true');this.root.querySelector('.garden-world')!.append(this.preview);
  this.debug=document.createElement('pre');this.debug.className='flower-debug';this.debug.hidden=!new URLSearchParams(location.search).has('flowerDebug');this.root.append(this.debug);
  this.panel.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLButtonElement>('button');if(!b)return;
   if(b.id==='flower-open'||b.id==='flower-paint')this.setMode('plant');if(b.id==='flower-erase')this.setMode('erase');if(b.id==='flower-close')this.setMode('off');
   if(b.id==='flower-palette')this.setPalette(!this.paletteOpen);if(b.id==='flower-palette-done')this.setPalette(false);
   if(b.dataset.flowerColor){this.color=b.dataset.flowerColor;this.updateUI();}
  });
  this.panel.querySelector<HTMLInputElement>('#flower-color')!.oninput=e=>{this.color=normalizeFlowerColor((e.target as HTMLInputElement).value)!;this.updateUI();};
  if(!this.debug.hidden){const grid=document.createElement('div');grid.className='garden-flower-grid';grid.style.cssText=`left:${F.originX}px;top:${F.originY}px;width:${F.maxX-F.minX}px;height:${F.maxY-F.minY}px;background-size:${F.cellSize}px ${F.cellSize}px`;root.querySelector('.garden-world')!.append(grid);}
  const opts={signal:this.abort.signal,capture:true};
  root.addEventListener('pointerdown',e=>{if(this.mode==='off'||e.button!==0)return;if(this.ui(e.target as Element)){this.finish();return;}e.preventDefault();e.stopImmediatePropagation();if(this.paletteOpen)return;this.finish();this.drawing=true;this.pointerId=e.pointerId;this.sample(e);},opts);
  root.addEventListener('pointermove',e=>{if(this.mode==='off')return;if(this.pointerId!==null&&e.pointerId!==this.pointerId)return;this.sample(e);},opts);
  root.addEventListener('click',e=>{if(this.mode!=='off'&&!this.ui(e.target as Element)){e.preventDefault();e.stopImmediatePropagation();}},opts);
  window.addEventListener('pointerup',()=>this.finish(),opts);window.addEventListener('pointercancel',()=>{this.finish();this.clearQueued();},opts);
  root.addEventListener('pointerleave',()=>{this.finish();this.target=undefined;},opts);window.addEventListener('blur',()=>{this.finish();this.clearQueued();},opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.finish();},opts);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.mode!=='off'){e.preventDefault();e.stopImmediatePropagation();if(this.paletteOpen)this.setPalette(false);else this.setMode('off');}},opts);
  socket.on('garden:flowers:snapshot',this.applySnapshot);socket.on('garden:flowers:delta',this.applyDelta);socket.on('garden:flowers:result',this.result);
  socket.on('disconnect',this.disconnected);this.timer=setInterval(()=>this.flush(),F.batchMs);this.updateUI();
 }
 private ui(target:Element|null){return !!target?.closest('button,input,select,textarea,aside,.garden-top,.garden-bottom,.garden-persona,.garden-help');}
 get blocksInput(){return this.paletteOpen;}
 get active(){return this.mode!=='off';}
 private setMode(mode:Mode){this.finish();this.clearQueued();this.mode=mode;this.setPalette(false);this.root.classList.toggle('flower-editing',mode!=='off');this.updateUI();this.status(mode==='off'?'已退出涂鸦，点击朋友可恢复社交互动。':mode==='plant'?'点击或按住拖动种花 · Ctrl 蹲下 · Esc 退出':'点击或拖动擦除自己的花 · Esc 退出');}
 private setPalette(open:boolean){this.finish();this.paletteOpen=open;this.updateUI();}
 private updateUI(){
  this.panel.style.setProperty('--flower-color',this.color);this.panel.querySelector<HTMLElement>('.flower-toolbar')!.hidden=this.mode==='off';this.panel.querySelector<HTMLElement>('.flower-palette')!.hidden=!this.paletteOpen;
  this.panel.querySelector('#flower-open')!.setAttribute('aria-expanded',String(this.mode!=='off'));this.panel.querySelector('#flower-palette')!.setAttribute('aria-expanded',String(this.paletteOpen));
  this.panel.querySelector('#flower-paint')!.setAttribute('aria-pressed',String(this.mode==='plant'));this.panel.querySelector('#flower-erase')!.setAttribute('aria-pressed',String(this.mode==='erase'));
  for(const b of Array.from(this.panel.querySelectorAll<HTMLElement>('[data-flower-color]')))b.setAttribute('aria-pressed',String(b.dataset.flowerColor===this.color));
  const count=[...this.flowers.values()].filter(f=>f.ownerPlayerId===this.ownId()).length;this.panel.querySelector('#flower-quota')!.textContent=`个人余量 ${Math.max(0,F.playerLimit-count)} 朵 · 空地 ${Math.max(0,flowerCapacity()-this.flowers.size)} 格`;
 }
 private sample(e:PointerEvent){
  this.target=undefined;this.valid=false;if(this.paletteOpen||this.ui(e.target as Element)||(e.target as Element).closest('[data-player-id]')){this.last=undefined;return;}
  const world=this.root.querySelector('.garden-world')!,rect=world.getBoundingClientRect(),scale=rect.width/GARDEN.width;
  const x=(e.clientX-rect.left)/scale,y=(e.clientY-rect.top)/scale;
  if(x<F.minX||x>F.maxX||y<F.minY||y>F.maxY){this.last=undefined;return;}
  const cell=flowerCell(x,y);this.target=cell;const own=this.players().find(p=>p.id===this.ownId()),center=flowerCenter(cell),existing=this.occupied.get(flowerKey(cell));
  this.valid=!!own&&validFlowerCell(cell)&&Math.hypot(center.x-own.x,center.y-own.y)<=F.range&&(this.mode==='erase'?existing?.ownerPlayerId===this.ownId():!existing);
  if(!this.drawing)return;
  const path=this.last?flowerLine(this.last,cell):[cell];this.last=cell;
  for(const c of path){const key=flowerKey(c),at=flowerCenter(c),flower=this.occupied.get(key);
   if(this.seen.has(key)||!own||!validFlowerCell(c)||Math.hypot(at.x-own.x,at.y-own.y)>F.range)continue;
   if(this.mode==='plant'&&(flower||this.predictions.has(key)))continue;
   if(this.mode==='erase'&&flower?.ownerPlayerId!==this.ownId()){if(flower)this.status('只能擦除自己的花。');continue;}
   this.seen.add(key);if(this.queue.length>=128){this.status('笔画过长，请松开后继续。');break;}this.queue.push(c);
   if(this.mode==='plant')this.predictions.set(key,{...c,color:this.color});
  }
 }
 /** End an interaction but keep already queued cells; changing tools discards unsent work. */
 finish(){this.drawing=false;this.pointerId=null;this.last=undefined;this.seen.clear();}
 private clearQueued(){for(const c of this.queue)this.predictions.delete(flowerKey(c));this.queue=[];}
 private flush(){
  const now=performance.now();for(const [id,p] of this.pending)if(now-p.at>8000){for(const c of p.cells)this.predictions.delete(flowerKey(c));this.pending.delete(id);this.status('种植确认超时，已撤销预览并重新同步。');this.resync();}
  if(!this.socket.connected){this.clearQueued();return;}if(!this.queue.length)return;
  // Two cells per 200ms stay below the authority's 12 cells/s budget; queued paths remain continuous.
  const firstColor=this.predictions.get(flowerKey(this.queue[0]))?.color;let size=1;while(size<2&&size<this.queue.length&&this.predictions.get(flowerKey(this.queue[size]))?.color===firstColor)size++;
  const cells=this.queue.splice(0,size),requestId=gardenToken();this.pending.set(requestId,{cells,at:now});
  if(this.mode==='erase')this.socket.emit('garden:flowers:erase',{requestId,flowerIds:cells.map(c=>this.occupied.get(flowerKey(c))?.id).filter(Boolean)});
  else if(this.mode==='plant')this.socket.emit('garden:flowers:plant',{requestId,cells,flowerType:'basic',colorHex:this.predictions.get(flowerKey(cells[0]))?.color||this.color});
  else{this.pending.delete(requestId);for(const c of cells)this.predictions.delete(flowerKey(c));}
 }
 private disconnected=()=>{this.finish();this.clearQueued();this.predictions.clear();this.pending.clear();this.target=undefined;};
 private result=(r:FlowerResult)=>{const p=this.pending.get(r.requestId);if(!p)return;for(const c of p.cells)this.predictions.delete(flowerKey(c));this.pending.delete(r.requestId);if(r.message||r.rejected?.length)this.status(r.message||r.rejected[0].reason);};
 applySnapshot=(s:FlowerSnapshot)=>{if(!s||!Array.isArray(s.flowers))return;this.roomId=s.roomId;this.revision=s.snapshotRevision;this.flowers=new Map(s.flowers.map(f=>[f.id,f]));this.occupied=new Map(s.flowers.map(f=>[flowerKey(f),f]));this.syncing=false;this.updateUI();};
 private applyDelta=(d:FlowerDelta)=>{
  const state={roomId:this.roomId,revision:this.revision,flowers:this.flowers,occupied:this.occupied};const result=applyFlowerDelta(state,d);
  if(result==='gap'){this.resync();return;}if(result==='duplicate')return;this.revision=state.revision;for(const f of d.added)this.predictions.delete(flowerKey(f));this.updateUI();
 };
 private resync(){if(this.syncing||!this.socket.connected)return;this.syncing=true;this.socket.emit('garden:flowers:sync');}
 render(time:number){
  const renderStarted=performance.now();if(this.lastRender&&renderStarted-this.lastRender<250)this.intervals.push(renderStarted-this.lastRender);this.lastRender=renderStarted;if(this.intervals.length>120)this.intervals.shift();
  const rows=new Map<number,Array<FlowerRecord|FlowerCell&{color:string}>>();
  for(const f of [...this.flowers.values(),...this.predictions.values()]){let row=rows.get(f.gz);if(!row){row=[];rows.set(f.gz,row);}row.push(f);}
  for(const [gz,canvas] of this.bands)if(!rows.has(gz)){canvas.remove();this.bands.delete(gz);}
  for(const [gz,flowers] of rows){
   const base=flowerCenter({gx:0,gz}).y;if(base<F.minY||base>F.maxY)continue;
   let canvas=this.bands.get(gz);const height=F.height+30,dpr=Math.min(2,devicePixelRatio||1);
   if(!canvas){canvas=document.createElement('canvas');canvas.className='garden-flower-band';canvas.style.width=`${GARDEN.width}px`;canvas.style.height=`${height}px`;canvas.width=GARDEN.width*dpr;canvas.height=height*dpr;canvas.style.top=`${base-height}px`;canvas.style.zIndex=String(Math.floor(base)+1);canvas.setAttribute('aria-hidden','true');this.root.querySelector('.garden-world')!.append(canvas);this.bands.set(gz,canvas);}
   const pixelWidth=Math.ceil(GARDEN.width*dpr),pixelHeight=Math.ceil(height*dpr);if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
   const ctx=canvas.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,GARDEN.width,height);
   for(const f of flowers){const p=flowerCenter(f),predicted='color' in f;let near=0;for(const actor of this.players()){const distance=Math.hypot(actor.x-p.x,actor.y-p.y);if(distance<F.swayRadius)near=Math.max(near,1-distance/F.swayRadius);}
    const sway=this.reducedMotion?0:Math.sin(time*1.6+f.gx*.7+gz)*1.5+Math.sin(time*7+f.gx)*near*4;
    this.draw(ctx,p.x,height-4,sway,predicted?f.color:f.colorHex,predicted?.45:1);
   }
  }
  this.preview.hidden=this.mode==='off'||!this.target||this.paletteOpen;
  if(this.target){const p=flowerCenter(this.target);this.preview.style.left=`${p.x}px`;this.preview.style.top=`${p.y}px`;this.preview.style.width=`${F.cellSize}px`;this.preview.style.height=`${F.cellSize*.45}px`;this.preview.style.setProperty('--flower-color',this.color);this.preview.classList.toggle('invalid',!this.valid);this.preview.textContent=this.mode==='erase'?'⌫':'✿';}
  this.costs.push(performance.now()-renderStarted);if(this.costs.length>120)this.costs.shift();if(!this.debug.hidden){const median=[...this.intervals].sort((a,b)=>a-b)[Math.floor(this.intervals.length/2)]||0;const p95=[...this.costs].sort((a,b)=>a-b)[Math.floor(this.costs.length*.95)]||0;
  if(!this.debug.hidden)this.debug.textContent=`FLOWERS ${this.flowers.size} / ${F.roomLimit} · rows ${this.bands.size}\nrevision ${this.revision} · pending ${this.predictions.size} · queued ${this.queue.length}\ngrid ${F.cellSize.toFixed(2)}px · target ${this.target?flowerKey(this.target):'—'}\nframe median ${median.toFixed(1)}ms · flowers p95 ${p95.toFixed(2)}ms`;}
 }
 private draw(ctx:CanvasRenderingContext2D,x:number,y:number,sway:number,color:string,alpha:number){
  const dpr=Math.min(2,devicePixelRatio||1),key=color+'@'+dpr,width=Math.ceil(F.cellSize*F.widthRatio+20),height=Math.ceil(F.height+25);let sprite=this.sprites.get(key);
  if(!sprite){sprite=document.createElement('canvas');sprite.width=Math.ceil(width*dpr);sprite.height=Math.ceil(height*dpr);const brush=sprite.getContext('2d')!;brush.setTransform(dpr,0,0,dpr,0,0);this.drawVector(brush,width/2,height-4,0,color,1);this.sprites.set(key,sprite);if(this.sprites.size>64)this.sprites.delete(this.sprites.keys().next().value!);}
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(sway/F.height*.28);ctx.drawImage(sprite,0,0,sprite.width,sprite.height,-width/2,-height+4,width,height);ctx.restore();
 }
 private drawVector(ctx:CanvasRenderingContext2D,x:number,y:number,sway:number,color:string,alpha:number){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.strokeStyle='#4E8756';ctx.lineWidth=4*F.visualScale;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(sway*.7,-F.height*.35,sway,-F.height*.65);ctx.stroke();
  ctx.fillStyle='#649960';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*12*F.visualScale,-F.height*.26,23*F.visualScale,11*F.visualScale,side*.65,0,Math.PI*2);ctx.fill();}
  ctx.translate(sway,-F.height*.64);const radius=F.cellSize*F.widthRatio*.28;ctx.fillStyle=color;
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*radius*.65,Math.sin(a)*radius*.55,radius,radius*.68,a,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#FFD56A';ctx.beginPath();ctx.arc(0,0,radius*.43,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 destroy(){this.abort.abort();clearInterval(this.timer);this.socket.off('garden:flowers:snapshot',this.applySnapshot);this.socket.off('garden:flowers:delta',this.applyDelta);this.socket.off('garden:flowers:result',this.result);this.socket.off('disconnect',this.disconnected);this.panel.remove();this.preview.remove();this.debug.remove();for(const c of this.bands.values())c.remove();this.pending.clear();this.predictions.clear();this.sprites.clear();}
}
