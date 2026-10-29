export interface Particle {active:boolean;x:number;y:number;vx:number;vy:number;age:number;life:number;size:number;gravity:number;drag:number;color:number;kind:number;alpha:number}
export interface ParticleOptions {x:number;y:number;vx:number;vy:number;life:number;size:number;gravity:number;drag:number;color:number;kind?:number;alpha?:number}
/** Fixed storage, zero per-frame particle allocation. Visual state only. */
export class ParticlePool {
 readonly particles:Particle[];private free:number[];active=0;dropped=0;peak=0;limit:number;
 constructor(readonly capacity=512){this.limit=capacity;this.particles=Array.from({length:capacity},()=>({active:false,x:0,y:0,vx:0,vy:0,age:0,life:1,size:1,gravity:0,drag:0,color:0,kind:0,alpha:1}));this.free=Array.from({length:capacity},(_,i)=>capacity-i-1);}
 emit(o:ParticleOptions){if(this.active>=this.limit||!this.free.length){this.dropped++;return false;}const i=this.free.pop()!,p=this.particles[i];Object.assign(p,o,{active:true,age:0,kind:o.kind??0,alpha:o.alpha??1});this.active++;this.peak=Math.max(this.peak,this.active);return true;}
 update(dt:number){if(!Number.isFinite(dt)||dt<=0)return;for(let i=0;i<this.capacity;i++){const p=this.particles[i];if(!p.active)continue;p.age+=dt;if(p.age>=p.life){p.active=false;this.free.push(i);this.active--;continue;}const decay=Math.exp(-p.drag*dt),travel=p.drag?(1-decay)/p.drag:dt;p.x+=p.vx*travel;p.y+=p.vy*travel+p.gravity*dt*dt*.5;p.vx*=decay;p.vy=p.vy*decay+p.gravity*dt;}}
 clear(){this.active=0;this.dropped=0;this.peak=0;this.free.length=0;for(let i=this.capacity-1;i>=0;i--){this.particles[i].active=false;this.free.push(i);}}
 setLimit(limit:number){this.limit=Math.max(0,Math.min(this.capacity,Math.floor(limit)));for(let i=this.capacity-1;i>=0&&this.active>this.limit;i--)if(this.particles[i].active){this.particles[i].active=false;this.active--;this.free.push(i);}}
}
