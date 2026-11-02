import './ui/loading.css';
const pending=new Map<string,Promise<HTMLImageElement>>();
const ready=new Map<string,HTMLImageElement>();
export function loadedImage(url:string){const image=ready.get(url);if(!image)throw Error('图片尚未准备完成');return image;}
/** One download + explicit decode per URL; failed loads are evicted for real retries. */
export function loadImage(url:string):Promise<HTMLImageElement>{
 const previous=pending.get(url);if(previous)return previous;
 const started=performance.now();
 const promise=new Promise<HTMLImageElement>((resolve,reject)=>{
  const image=new Image();image.decoding='async';let settled=false;
  const timeout=setTimeout(()=>finish(Error('图片加载超时')),20000);
  function finish(error?:Error){if(settled)return;settled=true;clearTimeout(timeout);image.onload=image.onerror=null;if(error){image.src='';reject(error);}else{ready.set(url,image);resolve(image);}}
  image.onload=()=>{const decodeStart=performance.now();void image.decode().then(()=>{performance.measure('image-decode:'+url,{start:decodeStart,end:performance.now()});performance.measure('image-ready:'+url,{start:started,end:performance.now()});finish();},()=>finish(Error('图片解码失败')));};
  image.onerror=()=>finish(Error('图片加载失败'));image.src=url;
 });
 pending.set(url,promise);void promise.catch(()=>{if(pending.get(url)===promise)pending.delete(url);});return promise;
}
export async function loadImages(urls:string[],progress:(done:number,total:number)=>void=()=>{}){
 const unique=[...new Set(urls)];let done=0;progress(0,unique.length);
 await Promise.all(unique.map(async url=>{await loadImage(url);progress(++done,unique.length);}));
}
/** Modal lives outside re-rendered flow; no simulated percentage and no server changes. */
export async function loadingTask(title:string,task:(progress:(done:number,total:number)=>void)=>Promise<void>){
 const modal=document.createElement('dialog');modal.className='asset-loading';
 modal.innerHTML='<p role="status" aria-live="polite"></p><progress max="1" value="0"></progress><div><button type="button">重试</button><button type="button">返回</button></div>';
 const label=modal.querySelector('p')!,bar=modal.querySelector('progress')!,buttons=modal.querySelector('div')!;
 document.body.append(modal);modal.showModal();let running=true;
 modal.addEventListener('cancel',event=>{if(running)event.preventDefault();});
 let round=0;try{for(;;){const current=++round;buttons.hidden=true;running=true;label.textContent=title;bar.removeAttribute('value');
  try{await task((done,total)=>{if(current!==round)return;label.textContent=`${title} ${done}/${total}`;bar.max=total||1;bar.value=done;});return;}
  catch{round++;running=false;label.textContent='加载失败或超时，请检查网络后重试。';buttons.hidden=false;
   const retry=await new Promise<boolean>(resolve=>{modal.querySelectorAll('button')[0].onclick=()=>resolve(true);modal.querySelectorAll('button')[1].onclick=()=>resolve(false);modal.oncancel=()=>resolve(false);});
   if(!retry)throw Error('已取消资源加载');modal.oncancel=null;
  }
 }}finally{modal.close();modal.remove();}
}
export function watchImages(root:HTMLElement){
 for(const image of Array.from(root.querySelectorAll<HTMLImageElement>('img'))){
  image.decoding='async';image.addEventListener('error',()=>{
   if(!image.isConnected||image.nextElementSibling?.classList.contains('image-retry'))return;
   const retry=document.createElement('button');retry.className='image-retry';retry.textContent='图片加载失败 · 重试';
   retry.onclick=()=>{const src=image.src;image.removeAttribute('src');image.src=src;retry.remove();};image.after(retry);
  });
 }
}
