import {randomUUID} from 'node:crypto';
import {FLOWERS,flowerKey,flowerCenter,validFlowerCell,normalizeFlowerColor,type FlowerGrid,type FlowerRecord,type FlowerRequest,type FlowerEraseRequest,type FlowerResult,type FlowerDelta,type FlowerSnapshot} from '../../src/shared/garden/FlowerConfig';
import type {GardenPlayer} from '../../src/shared/garden/GardenConfig';
const reasons={invalid:'格子或颜色无效',occupied:'格子已有花朵',range:'超出种植距离',personal:'个人数量已满',room:'花园数量已满',rate:'种植太快，请稍等',owner:'只能擦除自己的花'};
export class FlowerStore{
 readonly roomId=randomUUID();revision=0;readonly flowers=new Map<string,FlowerRecord>();private occupied=new Map<string,string>();private counts=new Map<string,number>();
 private history=new Map<string,Map<string,FlowerResult>>();private buckets=new Map<string,{tokens:number;at:number}>();
 constructor(private grid:FlowerGrid=FLOWERS,private limits={player:FLOWERS.playerLimit as number,room:FLOWERS.roomLimit as number,rate:FLOWERS.rate as number,range:FLOWERS.range as number}){}
 snapshot():FlowerSnapshot{return {roomId:this.roomId,snapshotRevision:this.revision,flowers:[...this.flowers.values()].map(f=>({...f}))};}
 private remember(owner:string,key:string,result:FlowerResult){let h=this.history.get(owner);if(!h){h=new Map();this.history.set(owner,h);}h.set(key,result);if(h.size>128)h.delete(h.keys().next().value!);return result;}
 private token(owner:string,now:number){let b=this.buckets.get(owner);if(!b){b={tokens:this.limits.rate,at:now};this.buckets.set(owner,b);}b.tokens=Math.min(this.limits.rate,b.tokens+Math.max(0,now-b.at)*this.limits.rate);b.at=now;if(b.tokens<1)return false;b.tokens--;return true;}
 private response(requestId:string):FlowerResult{return {requestId,revision:this.revision,accepted:[],rejected:[]};}
 private validId(raw:unknown):raw is string{return typeof raw==='string'&&raw.length>0&&raw.length<=80;}
 plant(owner:string,player:GardenPlayer|undefined,raw:FlowerRequest,now:number):{result:FlowerResult;delta?:FlowerDelta}{
  if(!player||!raw||!this.validId(raw.requestId))return {result:{...this.response(''),message:'无效种植请求'}};
  const key='plant:'+raw.requestId,old=this.history.get(owner)?.get(key);if(old)return {result:old};
  const result=this.response(raw.requestId),color=normalizeFlowerColor(raw.colorHex);
  if(!Array.isArray(raw.cells)||raw.cells.length>FLOWERS.maxBatch||!color||raw.flowerType!=='basic'){result.message='种植请求无效：颜色须为 RGB HEX，单包最多32格';return {result:this.remember(owner,key,result)};}
  const added:FlowerRecord[]=[];const seen=new Set<string>();
  for(const cell of raw.cells){
   if(!cell||typeof cell!=='object')continue;
   if(!Number.isSafeInteger(cell.gx)||!Number.isSafeInteger(cell.gz)){result.message=reasons.invalid;continue;}
   const {gx,gz}=cell,k=flowerKey(cell);if(seen.has(k))continue;seen.add(k);
   const center=flowerCenter(cell,this.grid);let reason='';
   if(!validFlowerCell(cell,this.grid))reason=reasons.invalid;
   else if(this.occupied.has(k))reason=reasons.occupied;
   else if(Math.hypot(center.x-player.x,center.y-player.y)>this.limits.range)reason=reasons.range;
   else if((this.counts.get(owner)||0)>=this.limits.player)reason=reasons.personal;
   else if(this.flowers.size>=this.limits.room)reason=reasons.room;
   else if(!this.token(owner,now))reason=reasons.rate;
   if(reason){result.rejected.push({gx,gz,reason});continue;}
   const f:FlowerRecord={id:randomUUID(),roomId:this.roomId,gx,gz,flowerType:'basic',colorHex:color,ownerPlayerId:owner,revision:this.revision+1};
   this.flowers.set(f.id,f);this.occupied.set(k,f.id);this.counts.set(owner,(this.counts.get(owner)||0)+1);added.push(f);result.accepted.push({gx,gz});
  }
  if(added.length)this.revision++;result.revision=this.revision;
  return {result:this.remember(owner,key,result),delta:added.length?{roomId:this.roomId,revision:this.revision,added,removed:[]}:undefined};
 }
 erase(owner:string,player:GardenPlayer|undefined,raw:FlowerEraseRequest):{result:FlowerResult;delta?:FlowerDelta}{
  if(!player||!raw||!this.validId(raw.requestId))return {result:{...this.response(''),message:'无效擦除请求'}};
  const key='erase:'+raw.requestId,old=this.history.get(owner)?.get(key);if(old)return {result:old};const result=this.response(raw.requestId),removed:string[]=[];
  if(!Array.isArray(raw.flowerIds)||raw.flowerIds.length>FLOWERS.maxBatch||raw.flowerIds.some(id=>typeof id!=='string'||id.length>80)){result.message='擦除请求无效';return {result:this.remember(owner,key,result)};}
  for(const id of new Set(raw.flowerIds)){
   const f=this.flowers.get(id);if(!f)continue;const center=flowerCenter(f,this.grid);
   const reason=f.ownerPlayerId!==owner?reasons.owner:Math.hypot(center.x-player.x,center.y-player.y)>this.limits.range?reasons.range:undefined;
   if(reason){result.rejected.push({gx:f.gx,gz:f.gz,reason});continue;}
   this.flowers.delete(id);this.occupied.delete(flowerKey(f));this.counts.set(owner,(this.counts.get(owner)||1)-1);removed.push(id);result.accepted.push({gx:f.gx,gz:f.gz});
  }
  if(removed.length)this.revision++;result.revision=this.revision;
  return {result:this.remember(owner,key,result),delta:removed.length?{roomId:this.roomId,revision:this.revision,added:[],removed}:undefined};
 }
 forget(owner:string){this.history.delete(owner);this.buckets.delete(owner);}
 clear(){this.flowers.clear();this.occupied.clear();this.counts.clear();this.history.clear();this.buckets.clear();this.revision=0;}
}
