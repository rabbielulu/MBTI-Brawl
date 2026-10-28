import type {MBTIType} from './characters/CharacterDefinition';
export const CHAMPION_TIMING={enterMs:800,throwAtMs:1100,flightMs:1150,landAtMs:2250,settleMs:300,confettiAtMs:2550,confettiMs:2300,sceneMs:6400} as const;
export const CELEBRATION_MS=CHAMPION_TIMING.sceneMs;
export const VICTORY_LINES:Record<MBTIType,string>={
 ENTP:'事实证明，他说得都对。',
 INFP:'忍到最后的人赢了。',
 ESTJ:'本局已按计划完成。',
 ESTP:'WOOOOOOOO！',
 INTJ:'这一局，也在计划之中。',INTP:'终于想明白了。',ENTJ:'执行完毕。',INFJ:'结局，我早就看到了。',ENFJ:'大家都很棒，下次不要打了。',ENFP:'我又有一个新想法！',ISTJ:'严格按流程，顺利获胜。',ISFJ:'我说过，别惹我。',ESFJ:'来，冠军一起合个照。',ISTP:'看吧，应该能用。',ISFP:'现在可以让我安静画画了吗？',ESFP:'谢谢大家，MY SHOW！',
};
