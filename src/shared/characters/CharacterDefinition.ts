import type {AttackDefinition} from '../combat/CombatTypes';
export type MBTIType='ENTP'|'INFP'|'ESTJ'|'ESTP';
export type SkillAimMode='none'|'direction'|'position';
export interface SkillDefinition {id:string;name:string;description:string;cooldown:number;aimMode:SkillAimMode;primitive:'projectile'|'buff'|'zone'|'dash';params:Record<string,number>}
export interface TraitDefinition {id:'debate'|'sensitive'|'schedule'|'momentum';name:string;description:string;params:Record<string,number>}
export interface CharacterDefinition {
 mbti:MBTIType;nickname:string;maxHp:number;moveSpeed:number;
 basicAttack:AttackDefinition;skill:SkillDefinition;ultimate:SkillDefinition;trait:TraitDefinition;
}
