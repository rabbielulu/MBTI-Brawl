import {GARDEN} from './GardenConfig';
/** Dimensions use the visible ~110px character silhouette (145px DOM box includes padding), in garden world coordinates. */
const flowerScale=.5;
export const FLOWERS={characterHeight:110,visualScale:flowerScale,cellSize:110*.65*flowerScale,height:110*.5*flowerScale,widthRatio:.96,range:110*3,playerLimit:200,roomLimit:1600,rate:12,maxBatch:32,batchMs:200,crouchSpeed:.5,swayRadius:110*.65*flowerScale,originX:GARDEN.margin,originY:GARDEN.minY,minX:GARDEN.margin,maxX:GARDEN.width-GARDEN.margin,minY:GARDEN.minY,maxY:GARDEN.maxY} as const;
export const FLOWER_PALETTE=['#FF77AA','#F25F5C','#FF9F43','#FFD166','#FFF3CC','#9BD66F','#5AC8A0','#68CBE8','#7C9EE8','#B899E7','#E5B9DE','#FFFFFF'];
export interface FlowerCell{gx:number;gz:number}
export interface FlowerRecord extends FlowerCell{id:string;roomId:string;flowerType:'basic';colorHex:string;ownerPlayerId:string;revision:number}
export interface FlowerRequest{requestId:string;cells:FlowerCell[];flowerType:'basic';colorHex:string}
export interface FlowerEraseRequest{requestId:string;flowerIds:string[]}
export interface FlowerSnapshot{roomId:string;snapshotRevision:number;flowers:FlowerRecord[]}
export interface FlowerDelta{roomId:string;revision:number;added:FlowerRecord[];removed:string[]}
export interface FlowerResult{requestId:string;revision:number;accepted:FlowerCell[];rejected:Array<FlowerCell&{reason:string}>;message?:string}
export type FlowerGrid=Record<'cellSize'|'originX'|'originY'|'minX'|'maxX'|'minY'|'maxY',number>;
export const flowerKey=(c:FlowerCell)=>`${c.gx},${c.gz}`;
export const flowerCenter=(c:FlowerCell,grid:FlowerGrid=FLOWERS)=>({x:grid.originX+(c.gx+.5)*grid.cellSize,y:grid.originY+(c.gz+.5)*grid.cellSize});
export const flowerCell=(x:number,y:number,grid:FlowerGrid=FLOWERS):FlowerCell=>({gx:Math.floor((x-grid.originX)/grid.cellSize),gz:Math.floor((y-grid.originY)/grid.cellSize)});
export function validFlowerCell(c:FlowerCell,grid:FlowerGrid=FLOWERS){if(!Number.isSafeInteger(c?.gx)||!Number.isSafeInteger(c?.gz))return false;const p=flowerCenter(c,grid);return p.x>=grid.minX&&p.x<=grid.maxX&&p.y>=grid.minY&&p.y<=grid.maxY;}
export function normalizeFlowerColor(value:unknown){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toUpperCase():undefined;}
/** Integer Bresenham traversal; bounded before traversal even for hostile coordinates. */
export function flowerLine(a:FlowerCell,b:FlowerCell):FlowerCell[]{
 if(![a.gx,a.gz,b.gx,b.gz].every(Number.isSafeInteger)||Math.max(Math.abs(b.gx-a.gx),Math.abs(b.gz-a.gz))>128)return [];
 let x=a.gx,y=a.gz;const dx=Math.abs(b.gx-x),dy=-Math.abs(b.gz-y),sx=x<b.gx?1:-1,sy=y<b.gz?1:-1;let error=dx+dy;const cells:FlowerCell[]=[];
 for(;;){cells.push({gx:x,gz:y});if(x===b.gx&&y===b.gz)return cells;const e=error*2;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
}

/** getRandomValues works on LAN HTTP; randomUUID is limited to secure contexts. */
export function gardenToken(){const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}

export function flowerCapacity(grid:FlowerGrid=FLOWERS){let count=0;const cols=Math.ceil((grid.maxX-grid.originX)/grid.cellSize),rows=Math.ceil((grid.maxY-grid.originY)/grid.cellSize);for(let gz=0;gz<rows;gz++)for(let gx=0;gx<cols;gx++)if(validFlowerCell({gx,gz},grid))count++;return count;}
