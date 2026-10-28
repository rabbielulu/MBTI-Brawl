import type {LobbyPlayer,MatchPlayer,MatchResult,FunAward} from '../../src/shared/LobbyProtocol';
/** Freeze authoritative statistics at the winning tick; all positive ties share an award. */
export function buildMatchResult(identities:LobbyPlayer[],stats:Map<string,MatchPlayer>,startedAt:number,endedAt:number,winnerId:string|undefined,draw:boolean):MatchResult {
 const players=identities.map(identity=>{const p=stats.get(identity.id)!;return {id:p.id,mbti:identity.mbti,nickname:identity.nickname,bot:!!identity.bot,placement:p.placement??identities.length,kills:p.kills,damageDealt:p.damageDealt,survivalMs:p.survivalMs??Math.max(0,(p.eliminatedAt??endedAt)-startedAt),damageTaken:p.damageTaken??0,distanceMoved:p.distanceMoved??0,skillUses:p.skillUses??0,ultimateUses:p.ultimateUses??0};}).sort((a,b)=>a.placement-b.placement);
 const awards:FunAward[]=[];
 const award=(id:FunAward['id'],icon:string,title:string,unit:string,score:(id:string)=>number)=>{const max=Math.max(0,...players.map(p=>score(p.id)));if(max<=0)return;awards.push({id,icon,title,unit,value:max,playerIds:players.filter(p=>score(p.id)===max).map(p=>p.id)});};
 award('kills','⚔️','杀疯了','次击杀',id=>stats.get(id)!.kills);
 award('damage','💥','人形核弹','点伤害',id=>stats.get(id)!.damageDealt);
 award('distance','🏃','你抓不到我','距离',id=>stats.get(id)!.distanceMoved??0);
 award('focus','🎯','专业针对','次命中同一对手',id=>Math.max(0,...Object.values(stats.get(id)!.attackTargets??{})));
 award('taken','💔','全场最惨','点承受伤害',id=>stats.get(id)!.damageTaken??0);
 return {startedAt,endedAt,winnerId,draw,players,awards};
}
