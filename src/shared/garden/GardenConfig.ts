/** Garden coordinates are independent of the combat arena. All tuning lives here. */
export const GARDEN = {
 width:1440,height:1024,minY:330,maxY:940,margin:65,maxPlayers:30,tickRate:30,snapshotRate:20,
 GardenMoveSpeed:210,GardenBounceHeight:9,GardenBounceInterval:0.58,
 JumpHeight:140,JumpDuration:1.25,AirFloatFactor:0.8,
 HoldInteractionRange:145,
 LiftHeight:105,ThrowSpeed:850,ThrowLiftSpeed:235,ThrowGravity:600,ThrowBounce:0.72,ThrowDrag:0.22,ThrowLandingRest:0.6,
 HoldFollowDistance:78,HoldFollowDelay:0.12,HoldElasticity:5,
 EscapeMouseThreshold:12,EscapeProgressSpeed:0.16,EscapeProgressDecay:0.22,EscapeAlternationWindow:0.65,
 IdleToLyingTime:25,WaveCooldown:1,WaveDuration:1.8,inputTimeout:0.45,
} as const;
export interface GardenInput {x:number;y:number;jump:boolean;sit:boolean;releaseHold:boolean;wave:boolean;holdTarget:string|null;liftTarget:string|null;throwNow:boolean;aimX:number;aimY:number;shake:number;active:boolean;crouch?:boolean}
export const gardenInput=():GardenInput=>({x:0,y:0,jump:false,sit:false,releaseHold:false,wave:false,holdTarget:null,liftTarget:null,throwNow:false,aimX:1,aimY:0,shake:0,active:false});
export interface GardenPlayer {
 id:string;nickname:string;mbti:string;x:number;y:number;z:number;vz:number;facing:number;
 carriedBy:string|null;carrying:string|null;thrown:boolean;flightTime:number;vx:number;vy:number;landedUntil:number;
 holdParent:string|null;holdChild:string|null;waveUntil:number;
 idle:number;lying:boolean;sitting:boolean;escape:number;moving:boolean;crouching?:boolean;lastHold:number;holdResult:boolean;
}
export interface GardenSnapshot {time:number;players:GardenPlayer[]}
/** A target must be free, nearby and outside the requester's ancestor chain. */
export function canGardenHold(player:GardenPlayer,target:GardenPlayer,players:ReadonlyMap<string,GardenPlayer>){
 if(player.carriedBy||player.carrying||player.thrown||target.carriedBy||target.carrying||target.thrown)return false;
 if(player.id===target.id||player.holdChild||target.holdParent||Math.hypot(player.x-target.x,player.y-target.y)>GARDEN.HoldInteractionRange)return false;
 const seen=new Set<string>();let ancestor:GardenPlayer|undefined=player;
 while(ancestor&&!seen.has(ancestor.id)){if(ancestor.id===target.id)return false;seen.add(ancestor.id);ancestor=players.get(ancestor.holdParent||'');}
 return true;
}

export function canGardenLift(player:GardenPlayer,target:GardenPlayer){
 return player.id!==target.id&&!player.carriedBy&&!player.carrying&&!player.thrown&&!target.carriedBy&&!target.carrying&&!target.thrown&&Math.hypot(player.x-target.x,player.y-target.y)<=GARDEN.HoldInteractionRange;
}
