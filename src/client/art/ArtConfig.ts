export type Quality='high'|'medium'|'low';
export const QUALITY_BUDGET:Record<Quality,number>={high:512,medium:256,low:96};
export interface ArtConfig {count:number;direction:number;spread:number;size:number;opacity:number;speed:number;life:number;gravity:number;color:string;glow:number;radius:number;waveSpeed:number;floor:string;density:number;contrast:number;shadow:number;shake:number;quality:Quality}
export const DEFAULT_ART:ArtConfig={count:72,direction:0,spread:360,size:4,opacity:1,speed:250,life:1.5,gravity:95,color:'#a974ff',glow:1.1,radius:250,waveSpeed:680,floor:'#252641',density:13,contrast:.13,shadow:.5,shake:.003,quality:'high'};
export const colorNumber=(color:string)=>parseInt(color.slice(1),16);
export const mix=(a:number,b:number,t:number)=>{const c=(s:number)=>Math.round(((a>>s)&255)*(1-t)+((b>>s)&255)*t);return (c(16)<<16)|(c(8)<<8)|c(0);};
