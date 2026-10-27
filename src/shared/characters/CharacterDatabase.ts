import type {CharacterDefinition,MBTIType} from './CharacterDefinition';
import type {AttackDefinition} from '../combat/CombatTypes';
const basic=(overrides:Partial<AttackDefinition>={}):AttackDefinition=>({kind:'ranged',damage:12,cooldownMs:300,knockback:210,projectileSpeed:480,projectileRadius:5,lifetimeMs:1400,meleeRange:100,meleeArc:Math.PI*.7,...overrides});
export const CHARACTERS:Record<MBTIType,CharacterDefinition>={
 ENTP:{mbti:'ENTP',nickname:'互联网杠精',maxHp:100,moveSpeed:245,basicAttack:basic(),
  skill:{id:'actually',name:'你说得不对',description:'发射 Actually ☝，造成 20 点伤害并破防 4 秒，受到的伤害增加 50%。',cooldown:5.5,aimMode:'direction',primitive:'projectile',params:{damage:20,duration:4,vulnerability:1.5}},
  ultimate:{id:'speech',name:'我不是针对谁',description:'连续 3 轮语言冲击波，每轮 16 点伤害，并推开 260 范围内的对手。',cooldown:0,aimMode:'none',primitive:'zone',params:{damage:16,radius:260,pulses:3,interval:.5,knockback:260}},
  trait:{id:'debate',params:{energyMultiplier:1.5},name:'Debate Me',description:'攻击破防目标时，实际伤害转化的人格能量提高 50%。'}},
 INFP:{mbti:'INFP',nickname:'玻璃心核弹',maxHp:100,moveSpeed:245,basicAttack:basic({damage:10,cooldownMs:350,projectileSpeed:380,knockback:140}),
  skill:{id:'endure',name:'没事，我没事',description:'3 秒内受到伤害降低 50%，承受的实际伤害积累为委屈值（上限 60）。',cooldown:6,aimMode:'none',primitive:'buff',params:{duration:3,reduction:.5,grievanceMax:60}},
  ultimate:{id:'emotion',name:'我忍你很久了！',description:'在 280 范围内情绪爆炸：30 + 已损失生命 × 0.4 + 委屈 × 0.5 伤害，随后清空委屈。',cooldown:0,aimMode:'none',primitive:'zone',params:{damage:30,radius:280,missingHp:.4,grievance:.5,knockback:330}},
  trait:{id:'sensitive',params:{maxEnergyBonus:.75},name:'Sensitive',description:'生命越低，造成伤害获得的人格能量越多，最多提高 75%。'}},
 ESTJ:{mbti:'ESTJ',nickname:'项目经理',maxHp:100,moveSpeed:245,basicAttack:basic({damage:11,cooldownMs:330,projectileSpeed:550,knockback:170}),
  skill:{id:'deadline',name:'Deadline',description:'指定最多 280 距离的区域，3 秒后造成 28 点伤害，并减速 35% 持续 2 秒。',cooldown:7,aimMode:'position',primitive:'zone',params:{range:280,radius:125,delay:3,damage:28,slow:.65,slowDuration:2}},
  ultimate:{id:'kpi',name:'绩效评估',description:'在指定区域生成 190 半径 KPI 场，持续 3 秒，每半秒扣除 10 点绩效生命。',cooldown:0,aimMode:'position',primitive:'zone',params:{range:280,radius:190,duration:3,interval:.5,damage:10}},
  trait:{id:'schedule',params:{minTargets:2,refund:1.5},name:'On Schedule',description:'同一次技能命中至少两个对手，返还 1.5 秒技能冷却。'}},
 ESTP:{mbti:'ESTP',nickname:'先冲了再说',maxHp:100,moveSpeed:245,basicAttack:basic({kind:'melee',damage:10,cooldownMs:260,knockback:240,meleeRange:92,meleeArc:Math.PI*.8}),
  skill:{id:'dash',name:'WOOOOOO!',description:'朝瞄准方向冲刺约 260 距离，撞到对手造成 18 点伤害和强击退；碰到掩体停止。',cooldown:5,aimMode:'direction',primitive:'dash',params:{speed:900,duration:.29,damage:18,knockback:420}},
  ultimate:{id:'adrenaline',name:'再来！',description:'肾上腺素模式持续 6 秒，冲刺冷却缩短至 1 秒，并立即刷新一次冲刺。',cooldown:0,aimMode:'none',primitive:'buff',params:{duration:6,dashCooldown:1}},
  trait:{id:'momentum',params:{refund:.6},name:'Momentum',description:'每次冲刺命中对手，返还 0.6 秒冲刺冷却。'}},
};
export const PLAYABLE_TYPES=Object.keys(CHARACTERS) as MBTIType[];
export function isPlayable(value:unknown):value is MBTIType{return typeof value==='string'&&Object.prototype.hasOwnProperty.call(CHARACTERS,value);}
export function getCharacter(type:string):CharacterDefinition{return isPlayable(type)?CHARACTERS[type]:CHARACTERS.ENTP;}
