import type {AttackDefinition} from '../combat/CombatTypes';
export type MBTIType='INTJ'|'INTP'|'ENTJ'|'ENTP'|'INFJ'|'INFP'|'ENFJ'|'ENFP'|'ISTJ'|'ISFJ'|'ESTJ'|'ESFJ'|'ISTP'|'ISFP'|'ESTP'|'ESFP';
export type SkillAimMode='none'|'direction'|'position';
export interface SkillDefinition {canPenetrateObstacle?:boolean;id:string;name:string;description:string;cooldown:number;aimMode:SkillAimMode;primitive:'projectile'|'buff'|'zone'|'dash'|'teleport'|'mark'|'push'|'pull'|'random'|'turret';params:Record<string,number>}
export interface TraitDefinition {id:'debate'|'sensitive'|'schedule'|'momentum'|'planB'|'overthinking'|'execution'|'insight'|'caregiver'|'excited'|'consistency'|'protective'|'social'|'tinkerer'|'space'|'spotlight';name:string;description:string;params:Record<string,number>}
export interface CharacterDefinition {
 mbti:MBTIType;nickname:string;maxHp:number;moveSpeed:number;
 basicAttack:AttackDefinition;skill:SkillDefinition;ultimate:SkillDefinition;trait:TraitDefinition;
}
