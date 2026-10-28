import assert from 'node:assert/strict';
import {generateTerrain,insideMud,terrainSpeed,TERRAIN_CONFIG as C,TERRAIN_PROFILES,TerrainValidator,SpawnManager} from '../src/terrain';
import {GameRoom} from '../server/GameRoom';
import {movement} from '../src/shared/Movement';
import {getCharacter} from '../src/shared/characters/CharacterDatabase';
import {NET} from '../src/shared/GameConstants';
let wet=0,toxic=0,chaos=0;const combinations=new Set<string>();
for(let seed=1;seed<=300;seed++){
 const map=generateTerrain({seed});assert.deepEqual(map,generateTerrain({seed}));assert.ok(map.budget!<=C.maxHazardBudget);assert.ok(map.walls.length<=5&&map.mud.length<=2&&map.toxic!.length<=2);assert.ok(TerrainValidator.connected(map.walls,map.spawns!));
 for(const spawn of map.spawns!){assert.equal(terrainSpeed(spawn.x,spawn.y,map.mud),1);assert.ok(!map.toxic!.some(p=>insideMud(spawn.x,spawn.y,p)));for(const w of map.walls)assert.ok(! (spawn.x>w.x-20&&spawn.x<w.x+w.w+20&&spawn.y>w.y-20&&spawn.y<w.y+w.h+20));}
 for(const pool of [...map.mud,...map.toxic!])for(const p of pool.points)assert.ok(p.x>=C.bounds.left&&p.x<=C.bounds.right&&p.y>=C.bounds.top&&p.y<=C.bounds.bottom);
 if(map.mud.length)wet++;if(map.toxic!.length)toxic++;if(map.walls.length&&map.mud.length&&map.toxic!.length)chaos++;
 if(seed<=20)combinations.add(`${map.walls.length}/${map.mud.length}/${map.toxic!.length}`);
 if(map.profile==='Open')assert.equal(map.mud.length+map.toxic!.length,0);
}
assert.ok(wet>70&&toxic>50&&chaos>0);assert.ok(combinations.size>=5);
for(const profile of Object.keys(TERRAIN_PROFILES)){const map=generateTerrain({seed:42,profile:profile as any});console.log(profile,map.walls.length,map.mud.length,map.toxic!.length,map.budget);}
assert.deepEqual(SpawnManager.select(2),[SpawnManager.select(8)[0],SpawnManager.select(8)[4]]);
assert.equal(generateTerrain({seed:1,profile:'Chaos',maxBudget:0}).budget,0);
const pool={x:700,y:480,rx:100,ry:100,points:[{x:600,y:380},{x:800,y:380},{x:800,y:580},{x:600,y:580}]};
const map={walls:[],mud:[pool],toxic:[pool]};const motion=movement({x:700,y:480,moveSpeed:200},{moveX:1,moveY:0},.1,map);assert.ok(Math.abs(motion.x-712)<1e-6);assert.equal(terrainSpeed(900,480,map.mud),1);
const game=new GameRoom(2,{seed:42,profile:'Open',playerCount:2}),p=game.add('a','甲','ENTP')!,q=game.add('b','乙','INFP')!;game.map=map;p.x=700;p.y=480;q.x=900;q.y=480;
for(let i=0;i<NET.tickRate;i++)game.step();assert.ok(Math.abs(p.hp-p.maxHp*.95)<1e-6);assert.equal(q.hp,q.maxHp);assert.ok(game.events.some(e=>e.type==='damage'&&e.source==='environment'));assert.equal(p.personality,0);p.x=900;const hp=p.hp;for(let i=0;i<NET.tickRate;i++)game.step();assert.equal(p.hp,hp);
p.x=700;p.hp=.01;game.step();assert.ok(!p.alive);assert.ok(game.events.some(e=>e.type==='death'&&e.source==='environment'));
console.log(`PASS terrain MVP: 300 seeds, safe/connected/reproducible/bounded maps, ${combinations.size} combinations in 20 rounds, ${wet} muddy/${toxic} toxic/${chaos} mixed, exact 60% motion, 5% DPS, recovery, environmental death.`);

const shots=new GameRoom(2,{seed:2,profile:'Open',playerCount:2}),attacker=shots.add('attacker','攻击者','ENTP')!,victim=shots.add('victim','目标','INFP')!;
shots.map={walls:[{x:630,y:450,w:20,h:100}],mud:[],toxic:[]};attacker.x=600;attacker.y=500;attacker.aimAngle=0;victim.x=690;victim.y=500;
shots.attack(attacker);for(let i=0;i<15;i++)shots.step();assert.equal(victim.hp,victim.maxHp,'Obstacle blocks basic projectile');
shots.nextAttack.set(attacker.id,0);shots.attack(attacker,{...getCharacter('ENTP').basicAttack,canPenetrateObstacle:true});for(let i=0;i<15;i++)shots.step();assert.ok(victim.hp<victim.maxHp,'Explicit penetration bypasses obstacle');
assert.ok(movement({x:600,y:500,moveSpeed:300},{moveX:1,moveY:0},1,shots.map).x<=610,'Obstacle blocks player swept movement');
console.log('PASS player/ordinary projectile collision and explicit obstacle penetration.');

const base=generateTerrain({seed:42,profile:'Chaos'}),skinned=generateTerrain({seed:42,profile:'Chaos',skins:true});const withoutSkin=(m:typeof base)=>JSON.parse(JSON.stringify(m,(key,value)=>key==='skin'?undefined:value));assert.deepEqual(withoutSkin(base),withoutSkin(skinned),'Skin selection cannot alter gameplay geometry');
