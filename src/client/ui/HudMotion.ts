/** One short animation per information change, never on the game render loop. */
export function installHudMotion(root:HTMLElement){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const seen=new WeakMap<Element,string>();
 const observer=new MutationObserver(records=>{
  const changed=new Set<Element>();
  for(const record of records){const node=record.target instanceof Element?record.target:record.target.parentElement;const target=node?.closest('#remaining,#spectator-target');if(target)changed.add(target);}
  for(const target of changed){const text=target.textContent||'';if(seen.get(target)===text)continue;seen.set(target,text);if(reduced.matches||!document.body.classList.contains('match-mode'))continue;
   if(target.id==='remaining')target.animate([{transform:'scale(1)'},{transform:'scale(1.12)',offset:.4},{transform:'scale(1)'}],{duration:210,easing:'ease-out'});
   else target.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'ease-out'});
  }
 });
 observer.observe(root,{subtree:true,childList:true,characterData:true});return ()=>observer.disconnect();
}
