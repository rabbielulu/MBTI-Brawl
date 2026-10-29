import assert from 'node:assert/strict';
import {GameRoom} from '../server/GameRoom';
import {blocked} from '../src/rules';
import {generateTerrain,TERRAIN_CONFIG} from '../src/terrain';
const game=new GameRoom(2);const p=game.add('a','test','ENTP')!,t=game.add('b','behind','ENTP')!;
const wall=()=>({x:500,y:400,w:76,h:50,coverId:'cover-1',sizeType:'Small' as const,hp:60,maxHp:60,state:'intact' as const});
game.map.mud=[];game.map.toxic=[];game.map.walls=[wall()];p.x=450;p.y=425;t.x=600;t.y=425;
game.damageCover(game.map.walls[0],30,p.id);assert.equal(game.map.walls[0].state,'damaged');assert(blocked(530,425,20,game.map.walls));
const hp=t.hp;game.map.walls[0].hp=1;
game.projectiles.push({id:1,ownerId:p.id,x:490,y:425,vx:3000,vy:0,damage:12,radius:5,knockback:0,source:'basic',expiresTick:100});game.step();assert.equal(game.map.walls[0].hp,0);assert(!blocked(530,425,20,game.map.walls));assert.equal(t.hp,hp);assert.equal(game.projectiles.length,0);
assert.equal(game.snapshot().covers![0].state,'destroyed');assert(game.drainEvents().some(e=>e.type==='cover'&&e.destroyed));
game.map.walls=[wall()];game.zones=[{id:1,ownerId:p.id,kind:'deadline',x:530,y:425,radius:80,damage:10,knockback:0,startTick:0,endTick:100,nextPulseTick:game.tick,intervalTicks:10,pulsesLeft:3,ultimate:false}];game.skills.zones();assert.equal(game.map.walls[0].hp,50);game.skills.zones();assert.equal(game.map.walls[0].hp,50);game.tick+=10;game.skills.zones();assert.equal(game.map.walls[0].hp,40);
game.map.walls=[wall()];game.projectiles=[{id:2,ownerId:p.id,x:490,y:425,vx:300,vy:0,damage:10,radius:5,knockback:0,source:'skill',expiresTick:100,canPenetrateCover:true}];for(let i=0;i<8;i++)game.step();assert.equal(game.map.walls[0].hp,50,'penetrating shot only damages each cover once');
for(let seed=0;seed<20;seed++)for(const w of generateTerrain({seed}).walls){assert(w.coverId);assert.equal(w.hp,TERRAIN_CONFIG.coverHp[w.sizeType!]);assert.equal(w.maxHp,w.hp);}
console.log('Destructible cover: HP, cracks, instant collision removal, stop on lethal hit, snapshot, pulse cadence, penetration dedup and generated HP passed');
for(const [size,hits] of [['Small',2],['Medium',3],['Large',5]] as const){
 const max=TERRAIN_CONFIG.coverHp[size];const cover={...wall(),sizeType:size,hp:max,maxHp:max};game.map.walls=[cover];
 for(let i=1;i<=hits;i++){game.damageCover(cover,3+i*13,p.id,true);assert.equal(cover.hp,Math.max(0,max-i*TERRAIN_CONFIG.coverBasicDamage));assert.equal(cover.hp===0,i===hits);if(i<hits)assert.equal(cover.state,'damaged');}
}
console.log('PASS fixed basic hit counts: small 2, medium 3, large 5, independent of character attack damage.');
