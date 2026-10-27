import type { AttackDefinition } from './shared/combat/CombatTypes';
import { CHARACTERS } from './shared/characters/CharacterDatabase';
const basicAttack:AttackDefinition=CHARACTERS.ENTP.basicAttack;
export const character = {
  type: 'ENTP', name: '辩论家', color: 0xb69bfa, weapon: '话筒 / 文字弹',
  hp: 100, speed: 245, basicAttack, attackDamage: basicAttack.damage, attackCooldown: basicAttack.cooldownMs, projectileSpeed: basicAttack.projectileSpeed,
  personalityMax:100, personalityGain:1,
  skill: '你说得不对', skillDescription: '发射 ACTUALLY！造成 24 点伤害，并使目标 4 秒内受到的伤害提升 50%。', skillCooldown: 5000, skillAimMode:'direction' as const,
  ultimate: '我不是针对谁', ultimateDescription: '消耗 100 人格能量，对周围 300 范围内的目标造成 65 点伤害并击退。', ultimateDamage: 65, ultimateRadius: 300,
};
