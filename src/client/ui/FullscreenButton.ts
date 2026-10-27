type LegacyDocument=Document&{webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>Promise<void>|void};
type LegacyElement=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
/** Request must run directly inside the click gesture, including on mobile. */
export function installFullscreenButton(button:HTMLButtonElement,beforeChange:()=>void,onFailure:(message:string)=>void){
 const doc=document as LegacyDocument,root=document.documentElement as LegacyElement;
 const active=()=>Boolean(doc.fullscreenElement||doc.webkitFullscreenElement);
 const update=()=>{
  const full=active();button.textContent=full?'⤢ 退出全屏':'⛶ 全屏';
  button.setAttribute('aria-label',full?'退出全屏':'进入全屏');button.setAttribute('aria-pressed',String(full));
  button.title=full?'退出全屏':'进入全屏';beforeChange();
 };
 button.onclick=async()=>{
  beforeChange();button.disabled=true;
  try{
   if(active()){
    if(doc.exitFullscreen)await doc.exitFullscreen();
    else if(doc.webkitExitFullscreen)await doc.webkitExitFullscreen();
    else throw new Error('unsupported');
   }else{
    if(root.requestFullscreen)await root.requestFullscreen();
    else if(root.webkitRequestFullscreen)await root.webkitRequestFullscreen();
    else throw new Error('unsupported');
   }
  }catch{
   onFailure('当前浏览器未能进入全屏。部分手机浏览器不支持网页全屏，可尝试使用浏览器菜单隐藏工具栏。');
  }finally{button.disabled=false;update();}
 };
 doc.addEventListener('fullscreenchange',update);doc.addEventListener('webkitfullscreenchange',update);update();
}
