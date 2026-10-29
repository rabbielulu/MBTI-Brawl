import assert from 'node:assert/strict';
import {ParticlePool} from '../src/client/art/ParticlePool';
const options={x:0,y:0,vx:200,vy:-40,life:2,size:3,gravity:0,drag:1.1,color:0xffffff};
const pool=new ParticlePool(16);for(let i=0;i<16;i++)assert.equal(pool.emit(options),true);assert.equal(pool.emit(options),false);assert.equal(pool.dropped,1);pool.setLimit(4);assert.equal(pool.active,4);assert.equal(pool.emit(options),false);pool.update(2);assert.equal(pool.active,0);pool.setLimit(16);for(let i=0;i<16;i++)assert.equal(pool.emit(options),true);assert.equal(pool.active,16);assert.equal(pool.particles.length,16);
const simulate=(hz:number)=>{const p=new ParticlePool(1);p.emit(options);for(let i=0;i<hz;i++)p.update(1/hz);return p.particles[0];};assert.ok(Math.abs(simulate(30).x-simulate(120).x)<1e-8,'Damping trajectory is frame-rate independent');
pool.clear();assert.equal(pool.active,0);assert.equal(pool.dropped,0);pool.update(NaN);assert.equal(pool.active,0);pool.setLimit(0);assert.equal(pool.emit(options),false);pool.setLimit(16);
for(let cycle=0;cycle<1000;cycle++){for(let i=0;i<20;i++)pool.emit({...options,life:.1});pool.update(.2);assert.equal(pool.active,0);}assert.equal(pool.particles.length,16);pool.clear();assert.equal(pool.peak,0);
console.log('PASS VFX pool: hard cap, budget reduction, exhaustion, lifetime expiry, reuse, clear, invalid dt, zero budget and 30/120Hz damping; 1,000 bursts with constant allocation.');
