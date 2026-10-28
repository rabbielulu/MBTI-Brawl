import {CHAMPION_TIMING as T} from '../../shared/MatchPresentation';
type Point={x:number;y:number};
/** Shared geometry for the flight; anchors are measured in the responsive scene. */
export function crownArc(from:Point,to:Point,lift:number,t:number):Point {
 const control={x:(from.x+to.x)/2,y:Math.min(from.y,to.y)-lift};
 return {x:(1-t)*(1-t)*from.x+2*(1-t)*t*control.x+t*t*to.x,y:(1-t)*(1-t)*from.y+2*(1-t)*t*control.y+t*t*to.y};
}
/** One finite presentation timeline. No gameplay state or client-driven result transition. */
export class ChampionCelebration {
 private animations:Animation[]=[];private observer:ResizeObserver;private elapsed=0;private disposed=false;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private scene:HTMLElement,elapsed:number){
  this.elapsed=elapsed;this.build();this.observer=new ResizeObserver(()=>this.build());this.observer.observe(scene);this.reduced.addEventListener('change',this.onMotionChange);
 }
 private onMotionChange=()=>this.build();
 private play(el:Element,frames:Keyframe[],options:KeyframeAnimationOptions){const a=el.animate(frames,{fill:'both',...options});a.currentTime=this.elapsed;this.animations.push(a);return a;}
 private build(){
  if(this.disposed||!this.scene.isConnected)return;
  for(const a of this.animations)a.cancel();this.animations=[];
  const presenter=this.scene.querySelector<HTMLElement>('.champion-presenter')!,pose=this.scene.querySelector<HTMLElement>('.champion-pose')!,crown=this.scene.querySelector<HTMLElement>('.champion-crown')!,avatar=this.scene.querySelector<HTMLElement>('.victory-avatar')!,dialogue=this.scene.querySelector<HTMLElement>('.champion-dialogue')!;
  const rect=this.scene.getBoundingClientRect(),hand=this.scene.querySelector('.champion-hand')!.getBoundingClientRect(),head=this.scene.querySelector('.champion-head-anchor')!.getBoundingClientRect();
  const actor=avatar.getBoundingClientRect(),crownWidth=117.166,crownHeight=95.553,startScale=Math.min(105,Math.max(52,rect.width*.075))/crownWidth,landScale=actor.width*.46/crownWidth;
  const from={x:hand.left-rect.left-crownWidth*startScale/2,y:hand.top-rect.top-crownHeight*startScale},to={x:head.left-rect.left-crownWidth*landScale/2,y:head.top-rect.top-crownHeight*landScale*.94};
  const transform=(p:Point,scale:number,rotate=0)=>`translate3d(${p.x}px,${p.y}px,0) rotate(${rotate}deg) scale(${scale})`;
  if(this.reduced.matches){crown.style.transform=transform(to,landScale);crown.style.opacity='1';this.scene.classList.add('champion-reduced');return;}
  crown.style.removeProperty('transform');crown.style.removeProperty('opacity');this.scene.classList.remove('champion-reduced');
  this.play(presenter,[{transform:`translate3d(${rect.width*.8+200}px,60px,0)`,opacity:0},{transform:'translate3d(-14px,-3px,0)',opacity:1,offset:.8},{transform:'translate3d(0,0,0)',opacity:1}],{duration:T.enterMs,easing:'cubic-bezier(.16,1,.3,1)'});
  this.play(pose,[{transform:'rotate(-9.7deg)'},{transform:'rotate(-7deg) translateY(-9px)',offset:.45},{transform:'rotate(-9.7deg)'}],{duration:T.throwAtMs-T.enterMs,delay:T.enterMs});
  this.play(dialogue,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:T.enterMs});
  const total=T.landAtMs+T.settleMs,frames:Keyframe[]=[{offset:0,transform:transform(from,startScale,-12),opacity:0},{offset:(T.enterMs+100)/total,transform:transform(from,startScale,-12),opacity:0},{offset:(T.throwAtMs-70)/total,transform:transform(from,startScale,-12),opacity:1},{offset:T.throwAtMs/total,transform:transform(from,startScale,-12),opacity:1}];
  for(let i=1;i<=24;i++){const t=i/24,p=crownArc(from,to,Math.min(180,rect.height*.25),t);frames.push({offset:(T.throwAtMs+T.flightMs*t)/total,transform:transform(p,startScale+(landScale-startScale)*t,-12*(1-t)+Math.sin(t*Math.PI)*24),opacity:1});}
  frames.push({offset:(T.landAtMs+120)/total,transform:transform({x:to.x,y:to.y+5},landScale*1.04),opacity:1},{offset:1,transform:transform(to,landScale),opacity:1});
  this.play(crown,frames,{duration:total,easing:'linear'});
  this.play(avatar,[{transform:'scale(1)'},{transform:'scale(1.035,.96)',offset:.4},{transform:'scale(1)'}],{duration:T.settleMs,delay:T.landAtMs});
  const pieces=Array.from(this.scene.querySelectorAll<HTMLElement>('.champion-confetti i'));
  for(const [i,piece] of pieces.entries()){
   const spread=((i*73)%401-200)*Math.min(1.8,rect.width/480),start={x:head.left-rect.left,y:head.top-rect.top+18},turn=(i%2?-1:1)*(270+i*21);
   this.play(piece,[{offset:0,opacity:0,transform:`translate3d(${start.x}px,${start.y}px,0) rotate(0deg)`},{offset:.06,opacity:1},{offset:.28,opacity:1,transform:`translate3d(${start.x+spread}px,${Math.max(20,start.y-80-i%5*18)}px,0) rotate(${turn*.3}deg)`},{offset:.85,opacity:1},{offset:1,opacity:0,transform:`translate3d(${start.x+spread*1.35}px,${rect.height+40}px,0) rotate(${turn}deg)`}],{duration:T.confettiMs+i%4*120,delay:T.confettiAtMs+i%8*35,easing:'cubic-bezier(.2,.5,.5,1)'});
  }
 }
 update(elapsed:number){this.elapsed=Math.max(0,elapsed);this.scene.dataset.beat=elapsed<T.throwAtMs?'enter':elapsed<T.landAtMs?'throw':elapsed<T.confettiAtMs?'land':elapsed<T.confettiAtMs+T.confettiMs?'confetti':'hold';for(const a of this.animations)if(Math.abs(Number(a.currentTime)-this.elapsed)>140)a.currentTime=this.elapsed;}
 destroy(){this.disposed=true;this.observer.disconnect();this.reduced.removeEventListener('change',this.onMotionChange);for(const a of this.animations)a.cancel();this.animations=[];}
}
