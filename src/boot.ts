import {images} from './client/AssetManifest';
import {loadImages} from './client/AssetLoader';
import {assetUrl} from './client/Deployment';

const screen=document.querySelector<HTMLElement>('#boot-screen')!;
const status=document.querySelector<HTMLElement>('#boot-status')!;
const progress=document.querySelector<HTMLProgressElement>('#boot-progress')!;
const count=document.querySelector<HTMLElement>('#boot-count')!;
const retry=document.querySelector<HTMLButtonElement>('#boot-retry')!;
const app=document.querySelector<HTMLElement>('#app')!;
// Invitation links open identity directly; prepare only the visible page's images.
const invitation=new URLSearchParams(location.search).has('room');
const urls=[invitation?images.identity:images.welcome,assetUrl('/figma-flow/settings.svg'),...(invitation?[assetUrl('/figma-flow/close.svg')]:[])];
let moduleReady=false;
let generation=0;
async function start(){
 const current=++generation;let completed=0;
 const total=urls.length+1;retry.hidden=true;screen.setAttribute('aria-busy','true');
 status.textContent='正在准备首页…';progress.max=total;progress.value=0;count.textContent=`0/${total}`;
 const update=()=>{if(current!==generation)return;const done=completed+Number(moduleReady);progress.value=done;count.textContent=`${done}/${total}`;};
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([
   Promise.all([
    loadImages(urls,done=>{completed=done;update();}),
    import('./main').then(()=>{moduleReady=true;update();}),
   ]),
   new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('加载超时')),30000);}),
  ]);
  if(current!==generation)return;
  await document.fonts.ready;
  // Reveal the complete page in a single frame; keyboard input is gated until then.
  app.inert=false;document.body.classList.remove('booting');screen.remove();
  performance.mark('home-visible');
 }catch{
  if(current!==generation)return;generation++;
  screen.setAttribute('aria-busy','false');status.textContent='加载未完成，请检查网络后重试。';retry.hidden=false;
 }finally{clearTimeout(timeout);}
}
retry.onclick=()=>{void start();};
void start();
