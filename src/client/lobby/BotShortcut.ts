export function addBotShortcut(event:{key:string;code?:string;repeat?:boolean;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean},editing=false){
 return !editing&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&(event.key.toLowerCase()==='n'||event.code==='KeyN');
}

export function debugStartShortcut(event:{key:string;repeat?:boolean;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean;isComposing?:boolean},editing=false){
 return !editing&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing&&event.key==='Enter';
}
