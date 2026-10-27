import assert from 'node:assert/strict';
import {FrameTextPool} from '../src/client/presentation/FrameTextPool';
import {CombatSymbol} from '../src/client/presentation/CombatSymbol';
import {CombatText} from '../src/client/presentation/CombatText';
import {GameRoom} from '../server/GameRoom';
import {PRESENTATIONS} from '../src/client/presentation/CharacterPresentation';
let created=0,destroyed=0;const handlers:(()=>void)[]=[];
// Minimal Phaser-compatible text stub to verify pooling/cleanup without a browser/GPU.
function text(){created++;const values:Record<string,unknown>={};const target={values};const proxy=new Proxy(target,{get(_target,key){if(key==='values')return values;if(key==='destroy')return ()=>{destroyed++;};return (...args:unknown[])=>{values[String(key)]=args;return proxy;};}});return proxy;}
const scene={add:{text},events:{once:(_event:string,fn:()=>void)=>handlers.push(fn)}} as any;
const pool=new FrameTextPool(scene,12,'Arial');
for(let frame=0;frame<1000;frame++){pool.begin();for(let n=0;n<80;n++)pool.acquire(n,frame,'burst',24,'#000',50);assert.equal(pool.stats.allocated,12);assert.equal(pool.stats.active,12);assert.equal(pool.stats.dropped,68);}
const boundedCreated=created;pool.begin();const a=pool.acquire(0,0,'emoji',20,'#000',20) as any;a.setScale(1.4).setRotation(2).setAlpha(.2).setScrollFactor(0);pool.begin();const b=pool.acquire(10,20,'reset',18,'#fff',30) as any;assert.equal(a,b);assert.deepEqual(b.values.setScale,[1]);assert.deepEqual(b.values.setRotation,[0]);assert.deepEqual(b.values.setAlpha,[1]);assert.deepEqual(b.values.setScrollFactor,[1]);assert.equal(created,boundedCreated,'Repeated bursts cannot leak Text objects');
const emoji=new CombatSymbol(scene,2),meme=new CombatText(scene,2);emoji.begin();emoji.draw(0,0,'📋',{fontSize:34,rotation:2,scale:1.4,alpha:.5});meme.begin();meme.draw(0,0,'KPI',{screenSpace:true,punch:true,progress:.2,fade:true});assert.equal(emoji.stats.active,1);assert.equal(meme.stats.active,1);
handlers.forEach(fn=>fn());assert.equal(destroyed,created,'Scene shutdown releases every pooled Text');assert.equal(pool.stats.allocated,0);
for(const presentation of Object.values(PRESENTATIONS)){assert.ok(presentation.prop);assert.ok(presentation.projectile.symbol);assert.ok(presentation.projectile.fontSize>=30);assert.ok(presentation.projectile.hitText.length);}
const r=new GameRoom(),p=r.add('test','测试','ENTP')!;r.attack(p);assert.equal(r.projectiles[0].source,'basic');r.skills.input(p,{seq:1,moveX:0,moveY:0,aimAngle:0,basicAttackPressed:false,skillPressed:true,ultimatePressed:false});assert.equal(r.projectiles[1].source,'skill');
const wire=JSON.stringify({snapshot:r.snapshot(),events:r.drainEvents()});for(const forbidden of ['glyph','fontSize','rotation','presentation','spinSpeed','hitText'])assert.ok(!wire.includes(forbidden),`Protocol must not contain ${forbidden}`);assert.ok(wire.includes('skillId'));
console.log('PASS: 1,000 burst frames stay bounded, transforms/camera reset on reuse, shutdown cleanup, four presentation mappings, gameplay-only projectile/cast protocol.');
