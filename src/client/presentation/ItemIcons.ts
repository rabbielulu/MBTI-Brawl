import {assetUrl} from '../Deployment';
import type {PickupType} from '../../shared/ItemConfig';
/** User-provided 2172×724 atlas, displayed with frames; original pixels stay unchanged. */
export const ITEM_ICON_URL=assetUrl('/items/item-icons.png');
export const ITEM_FRAMES:Record<PickupType,{x:number;y:number;w:number;h:number}>={heart:{x:75,y:240,w:380,h:330},sniper:{x:530,y:135,w:610,h:480},skates:{x:1130,y:190,w:535,h:435}};
export function itemIconSvg(type:PickupType){const f=ITEM_FRAMES[type];const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`${f.x} ${f.y} ${f.w} ${f.h}`);svg.setAttribute('aria-hidden','true');svg.classList.add('item-icon');const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',ITEM_ICON_URL);image.setAttribute('width','2172');image.setAttribute('height','724');svg.append(image);return svg;}
