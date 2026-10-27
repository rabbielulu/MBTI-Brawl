import type {NetworkPlayerState,StatusEffect} from '../../src/shared/NetworkProtocol';
export function status(player:NetworkPlayerState,id:StatusEffect['id']){return player.statuses.find(s=>s.id===id);}
export function addStatus(player:NetworkPlayerState,id:StatusEffect['id'],untilTick:number,strength:number){const found=status(player,id);if(found){found.untilTick=Math.max(found.untilTick,untilTick);found.strength=strength;}else player.statuses.push({id,untilTick,strength});}
