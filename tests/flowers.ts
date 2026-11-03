import {applyFlowerDelta} from '../src/shared/garden/FlowerReplica';
import assert from 'node:assert/strict';
import {FlowerStore} from '../server/garden/FlowerStore';
import {GardenWorld} from '../src/shared/garden/GardenWorld';
import {FLOWERS as F,flowerCell,flowerCenter,flowerLine,validFlowerCell,normalizeFlowerColor,type FlowerCell} from '../src/shared/garden/FlowerConfig';
import {gardenInput} from '../src/shared/garden/GardenConfig';
const world=new GardenWorld(),a=world.add('a','A','ENTP')!,b=world.add('b','B','INFP')!;
const store=new FlowerStore();
const cell=flowerCell(a.x,a.y),center=flowerCenter(cell);a.x=center.x;a.y=center.y;b.x=a.x;b.y=a.y;
const request=(id:string,cells:FlowerCell[],color='#ff77aa')=>({requestId:id,cells,flowerType:'basic' as const,colorHex:color});
const first=store.plant('a',a,request('one',[cell,cell]),0);assert.equal(first.result.accepted.length,1);assert.equal(store.flowers.size,1);assert.equal([...store.flowers.values()][0].colorHex,'#FF77AA');
assert.equal(store.plant('a',a,request('one',[cell]),0).delta,undefined);assert.equal(store.revision,1);
assert.equal(store.plant('b',b,request('race',[cell]),0).result.rejected[0].reason,'格子已有花朵');
const id=[...store.flowers.keys()][0];assert.equal(store.erase('b',b,{requestId:'not-owner',flowerIds:[id]}).result.rejected[0].reason,'只能擦除自己的花');
assert.equal(store.plant('a',a,request('bad-color',[{gx:cell.gx+1,gz:cell.gz}],'red'),0).result.message?.includes('无效'),true);
assert.equal(store.plant('a',a,request('boundary',[{gx:-1,gz:0}]),0).result.rejected[0].reason,'格子或颜色无效');
assert.equal(store.plant('a',a,request('far',[{gx:36,gz:0}]),0).result.rejected[0].reason,'超出种植距离');
assert.equal(store.plant('a',a,request('oversize',Array.from({length:33},()=>cell)),0).result.message?.includes('32'),true);
world.remove('a');assert.equal(store.flowers.size,1,'flowers survive owner leaving while others remain');
assert.equal(store.erase('a',a,{requestId:'own-erase',flowerIds:[id]}).result.accepted.length,1);assert.equal(store.flowers.size,0);
const line=flowerLine({gx:0,gz:0},{gx:12,gz:5});assert.equal(line.length,13);for(let i=1;i<line.length;i++)assert.ok(Math.max(Math.abs(line[i].gx-line[i-1].gx),Math.abs(line[i].gz-line[i-1].gz))===1);
assert.equal(flowerLine({gx:0,gz:0},{gx:1e9,gz:0}).length,0);assert.equal(normalizeFlowerColor('#12AbEF'),'#12ABEF');assert.ok(!validFlowerCell({gx:NaN,gz:1}));
// Crouch is authoritative and expires with stale input; social constraints take priority.
const c=world.add('c','C','INFJ')!;const x=c.x;world.input(c.id,{...gardenInput(),x:1,crouch:true});world.step();assert.equal(c.crouching,true);assert.ok(Math.abs(c.x-x-210*.5/30)<.01);
world.input(c.id,{...gardenInput(),crouch:true,jump:true});world.step();assert.equal(c.crouching,false);assert.ok(c.z>0);
c.z=0;c.vz=0;c.holdParent=b.id;world.input(c.id,{...gardenInput(),crouch:true});world.step();assert.equal(c.crouching,false);c.holdParent=null;
world.input(c.id,{...gardenInput(),crouch:true});world.step();for(let i=0;i<20;i++)world.step();assert.equal(c.crouching,false);
// Production map capacity is explicit, rather than pretending it can hold 1600 flowers.
const available:FlowerCell[]=[];for(let gz=0;gz<100;gz++)for(let gx=0;gx<100;gx++)if(validFlowerCell({gx,gz}))available.push({gx,gz});
console.log('Production garden grid capacity:',available.length);
const limited=new FlowerStore(F,{player:1,room:2,rate:12,range:10000});limited.plant('a',a,request('limit-a',[available[0]]),0);assert.equal(limited.plant('a',a,request('limit-b',[available[1]]),0).result.rejected[0].reason,'个人数量已满');limited.plant('b',b,request('limit-c',[available[1]]),0);assert.equal(limited.plant('c',c,request('limit-d',[available[2]]),0).result.rejected[0].reason,'花园数量已满');
const rate=new FlowerStore(F,{player:200,room:1600,rate:12,range:10000});assert.equal(rate.plant('a',a,request('rate',available.slice(0,20)),0).result.accepted.length,12);assert.equal(rate.plant('a',a,request('rate-2',available.slice(20,21)),0).result.rejected[0].reason,'种植太快，请稍等');
assert.equal(rate.plant('a',a,request('rate-3',available.slice(20,21)),1).result.accepted.length,1);
// 8-author stress in an enlarged TEST-ONLY map, preserving production scale/range/rate/quotas.
const large=new FlowerStore({...F,maxX:20000,maxY:6000});const started=performance.now();let accepted=0;
for(let owner=0;owner<8;owner++)for(let batch=0;batch<17;batch++){
 const count=Math.min(12,200-batch*12),cells=Array.from({length:count},(_,j)=>({gx:owner*24+(batch%5)*4+j%4,gz:Math.floor(batch/5)*3+Math.floor(j/4)}));
 const points=cells.map(v=>flowerCenter(v));a.x=points.reduce((sum,p)=>sum+p.x,0)/count;a.y=points.reduce((sum,p)=>sum+p.y,0)/count;
 accepted+=large.plant(String(owner),a,request(`stress-${batch}`,cells),batch).result.accepted.length;
}
assert.equal(accepted,1600);assert.equal(large.snapshot().flowers.length,1600);const bytes=JSON.stringify(large.snapshot()).length;
large.clear();assert.equal(large.flowers.size,0);
console.log(`PASS flowers: authority, occupancy race, dedupe, ownership, bounds/range/color, quotas/rate, continuous grid path, crouch and lifecycle; 8 authors/1600 records in ${(performance.now()-started).toFixed(2)}ms; snapshot ${bytes} bytes (enlarged test map)`);

const replica={roomId:store.roomId,revision:0,flowers:new Map(),occupied:new Map()};
assert.equal(applyFlowerDelta(replica,first.delta!),'applied');assert.equal(applyFlowerDelta(replica,first.delta!),'duplicate');
assert.equal(applyFlowerDelta(replica,{roomId:store.roomId,revision:3,added:[],removed:[id]}),'gap');assert.equal(replica.flowers.size,1,'missing packet must not partially apply');
assert.equal(applyFlowerDelta(replica,{roomId:'another-room',revision:2,added:[],removed:[id]}),'gap');
console.log('PASS replica: duplicate/reordered events are ignored, missing revision/wrong room requests full resync without partial mutation');

assert.doesNotThrow(()=>store.plant('a',a,request('hostile-coord',[{gx:{valueOf:'bad',toString:'bad'},gz:0} as any]),1));
console.log('PASS malformed non-numeric coordinates do not crash the authority');

for(const step of [1,2,4,6]){const visited=new Set<string>();let previous={gx:0,gz:0};for(let x=0;x<=12;x+=step){const next={gx:x,gz:0};for(const p of flowerLine(previous,next))visited.add(`${p.gx},${p.gz}`);previous=next;}assert.equal(visited.size,13,'coarse pointer sampling must still produce a continuous line');}
console.log('PASS sparse/dense pointer samples produce the same straight stroke');
