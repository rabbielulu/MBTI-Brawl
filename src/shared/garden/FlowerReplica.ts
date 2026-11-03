import {flowerKey,type FlowerDelta,type FlowerRecord} from './FlowerConfig';
export interface FlowerReplicaState{roomId:string;revision:number;flowers:Map<string,FlowerRecord>;occupied:Map<string,FlowerRecord>}
/** Missing or wrong-room deltas must trigger a snapshot; never guess a partial layout. */
export function applyFlowerDelta(state:FlowerReplicaState,d:FlowerDelta):'applied'|'duplicate'|'gap'{
 if(d.roomId!==state.roomId||d.revision>state.revision+1)return 'gap';if(d.revision<=state.revision)return 'duplicate';
 for(const id of d.removed){const f=state.flowers.get(id);if(f)state.occupied.delete(flowerKey(f));state.flowers.delete(id);}
 for(const f of d.added){state.flowers.set(f.id,f);state.occupied.set(flowerKey(f),f);}state.revision=d.revision;return 'applied';
}
