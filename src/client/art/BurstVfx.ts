import Phaser from 'phaser';
import {ParticlePool} from './ParticlePool';
import {colorNumber,mix,QUALITY_BUDGET,type ArtConfig} from './ArtConfig';
interface Burst {x:number;y:number;age:number;charge:number;fired:boolean;color:number;config:ArtConfig}
/** Independent, finite VFX timeline. No sockets, combat clocks, damage or gameplay imports. */
export class BurstVfx {
 readonly pool=new ParticlePool(512);readonly ground:Phaser.GameObjects.Graphics;readonly light:Phaser.GameObjects.Graphics;readonly details:Phaser.GameObjects.Graphics;
 bursts:Burst[]=[];onImpact?:(x:number,y:number,config:ArtConfig)=>void;private seed=91;reduced=false;additive:boolean;
 constructor(scene:Phaser.Scene,private unlit=false){this.ground=scene.add.graphics().setDepth(4);this.light=scene.add.graphics().setDepth(20);this.details=scene.add.graphics().setDepth(21);this.additive=!this.unlit&&scene.game.renderer.type===Phaser.WEBGL;if(this.additive&&!this.unlit){this.light.setBlendMode(Phaser.BlendModes.ADD);this.ground.setBlendMode(Phaser.BlendModes.ADD);}}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 cast(x:number,y:number,config:ArtConfig,anticipation=.9){if(this.bursts.length>=16)return false;const c={...config};if(this.reduced)c.count=Math.min(c.count,12);this.pool.setLimit(QUALITY_BUDGET[c.quality]);const color=colorNumber(c.color);this.bursts.push({x,y,age:0,charge:Math.max(0,anticipation),fired:false,color,config:c});
  for(let i=0;i<(anticipation>0?Math.floor(c.count*.35):0);i++){const a=this.random()*Math.PI*2,r=45+this.random()*80;this.pool.emit({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.6,vx:-Math.cos(a)*r/Math.max(.01,anticipation),vy:-Math.sin(a)*r*.6/.9,life:Math.max(.01,anticipation),size:1.5+this.random()*2,color,drag:0,gravity:0,kind:1});}return true;
 }
 clear(){this.bursts.length=0;this.pool.clear();this.ground.clear();this.light.clear();this.details.clear();}
 get phase(){return !this.bursts.length?'待机':this.bursts[0].age<this.bursts[0].charge?'蓄力':this.bursts[0].age<this.bursts[0].charge+.22?'爆发':'消散';}
 get charge(){return this.bursts.reduce((v,b)=>b.charge>0&&b.age<b.charge?Math.max(v,b.age/b.charge):v,0);}
 update(dt:number){this.pool.update(dt);for(const b of this.bursts){b.age+=dt;if(!b.fired&&b.age>=b.charge){b.fired=true;this.onImpact?.(b.x,b.y,b.config);const c=b.config;for(let i=0;i<c.count;i++){const a=(c.direction+(this.random()-.5)*c.spread)*Math.PI/180,speed=c.speed*(.3+this.random()*.7);this.pool.emit({x:b.x,y:b.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.7-40,life:c.life*(.6+this.random()*.4),size:c.size*(.5+this.random()),alpha:c.opacity,gravity:c.gravity,drag:1.1,color:i%4===0?0xffdfac:b.color,kind:i%6===0?2:0});}}}this.bursts=this.bursts.filter(b=>b.age<b.charge+Math.max(b.config.life,b.config.radius/b.config.waveSpeed)+.7);}
 draw(){const ground=this.ground,light=this.light,details=this.details;ground.clear();light.clear();details.clear();
  for(const b of this.bursts){const c=b.config,age=b.age-b.charge,color=b.color,charge=(b.charge?Math.min(1,b.age/b.charge):1),tail=age<0?charge*.35:Math.exp(-age*2.5),strength=Math.min(1,c.glow*.55)*tail;
   for(let j=this.unlit?0:5;j>=1;j--){ground.fillStyle(color,strength*.035);ground.fillEllipse(b.x,b.y+28,(50+j*35)*(age<0?charge:1+Math.min(age,.5)),(25+j*18)*(age<0?charge:1+Math.min(age,.5)));}
   if(age<0){details.lineStyle(1.5,color,.2+charge*.6);details.strokeEllipse(b.x,b.y+28,95*charge,48*charge);if(!this.unlit){light.fillStyle(color,charge*.35);light.fillCircle(b.x,b.y,4+charge*8);}continue;}
   // Fade with expansion distance, finishing at 90% radius; no lingering outer ring.
   const progress=age*c.waveSpeed/c.radius,wave=Math.min(c.radius,age*c.waveSpeed),fade=Math.pow(Math.max(0,1-progress/.9),1.5);
   ground.lineStyle(2,color,fade*.75);ground.strokeEllipse(b.x,b.y+28,wave*2,wave*1.1);
   if(!this.unlit)light.lineStyle(1+4*fade,mix(color,0xffffff,.3),fade*.65);if(!this.unlit)light.strokeEllipse(b.x,b.y+28,wave*2,wave*1.1);
   if(!this.unlit&&age<.28){const flash=(1-age/.28)*(this.reduced?.25:1);for(let j=4;j>=1;j--){light.fillStyle(color,flash*.13*c.glow);light.fillCircle(b.x,b.y,10+j*10);}light.fillStyle(0xfff5eb,flash);light.fillCircle(b.x,b.y,6+flash*13);details.lineStyle(2,0xffffff,flash);details.lineBetween(b.x-45*flash,b.y,b.x+45*flash,b.y);details.lineBetween(b.x,b.y-45*flash,b.x,b.y+45*flash);}
  }
  for(const p of this.pool.particles){if(!p.active)continue;const fade=(1-p.age/p.life)*p.alpha,size=p.size*(.25+.75*fade);if(!this.unlit){light.fillStyle(p.color,fade*.2);light.fillCircle(p.x,p.y,size*2.5);}details.fillStyle(this.unlit?p.color:mix(p.color,0xffffff,.45),fade);if(p.kind===2){details.fillTriangle(p.x,p.y-size*2,p.x-size,p.y+size,p.x+size,p.y+size);}else details.fillCircle(p.x,p.y,size);}
 }
}
