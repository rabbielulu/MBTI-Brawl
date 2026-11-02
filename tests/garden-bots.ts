import assert from 'node:assert/strict';
import {GardenWorld} from '../src/shared/garden/GardenWorld';
import {GardenBots} from '../server/garden/GardenBots';
const world=new GardenWorld(),bots=new GardenBots(world);world.add('human','测试','ENTP');
assert.equal(bots.add('human'),3);assert.equal(bots.add('human'),0);assert.equal(world.players.size,4);
const companions=[...world.players.values()].filter(p=>p.id!=='human');
for(let i=0;i<90;i++){bots.step();world.step();}
assert.ok(companions[2].lying);assert.ok(companions[0].waveUntil>0);assert.ok(companions[1].moving);
const human=world.players.get('human')!;companions[0].holdParent='human';human.holdChild=companions[0].id;
bots.remove('human');assert.equal(world.players.size,1);assert.equal(human.holdChild,null);assert.equal(bots.add('unknown'),0);
console.log('PASS garden bots: add, duplicate protection, idle/wave/movement, relationship cleanup and invalid owner');
