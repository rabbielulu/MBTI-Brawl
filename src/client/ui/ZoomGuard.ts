export const GAME_VIEWPORT='width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
/** The playtest page deliberately opts out of touch zoom; modal scrolling stays native. */
export function installZoomGuard(){
 const meta=document.querySelector<HTMLMetaElement>('meta[name="viewport"]')!;
 meta.content=GAME_VIEWPORT;
 const editable=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
 document.addEventListener('dblclick',event=>{if(!editable(event.target))event.preventDefault();},{capture:true});
 for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>event.preventDefault(),{passive:false});
 // This recovery control follows the visual viewport if a browser restores old zoom.
 const recovery=document.createElement('button');recovery.id='zoom-recovery';recovery.type='button';recovery.hidden=true;recovery.textContent='恢复正常比例';
 recovery.setAttribute('aria-label','恢复页面正常比例');document.documentElement.append(recovery);
 const update=()=>{const view=window.visualViewport;if(!view)return;recovery.hidden=view.scale<=1.05;recovery.style.left=`${view.offsetLeft+view.width/2}px`;recovery.style.top=`${view.offsetTop+12/view.scale}px`;recovery.style.transform=`translateX(-50%) scale(${1/view.scale})`;};
 let timer:ReturnType<typeof setTimeout>|undefined;
 const reset=()=>{
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  meta.content=GAME_VIEWPORT;window.scrollTo(0,0);clearTimeout(timer);
  timer=setTimeout(()=>{
   update();
   if((window.visualViewport?.scale||1)>1.05){
    recovery.textContent='点此重新载入恢复比例';
    recovery.onclick=()=>{const url=new URL(location.href);url.searchParams.set('viewportReset',Date.now().toString());location.replace(url.href);};
   }
  },250);
 };
 recovery.onclick=reset;window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);window.addEventListener('pageshow',()=>{meta.content=GAME_VIEWPORT;update();});update();
 return reset;
}
