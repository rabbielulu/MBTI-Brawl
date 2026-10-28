import {getCharacter as gameplayCharacter,isPlayable,PLAYABLE_TYPES} from '../../shared/characters/CharacterDatabase';
import type {MBTIType} from '../../shared/characters/CharacterDefinition';
export interface ProjectilePresentation {symbol:string;fontSize:number;textFontSize?:number;skillTextFontSize?:number;spinSpeed:number;trailType:'short'|'speech'|'speed';impactType:'ring'|'heart'|'bonk';hitText:string[]}
export interface CharacterPresentation {group:string;color:number;colorCss:string;symbol:string;weapon:string;basicName:string;texts:string[];skillText:string;ultimateTexts:string[];fantasy:string;pose:string;prop:string;skillSymbol:string;ultimateSymbol:string;hurtSymbol:string;ink:string;projectile:ProjectilePresentation}
const presentation=(group:string,color:number,symbol:string,basicName:string,skillSymbol:string,ultimateSymbol:string,fantasy:string,pose:string,texts:string[],spinSpeed=0):CharacterPresentation=>({group,color,colorCss:`#${color.toString(16).padStart(6,'0')}`,symbol,weapon:basicName,basicName,texts,skillText:texts[0],ultimateTexts:texts,fantasy,pose,prop:symbol,skillSymbol,ultimateSymbol,hurtSymbol:'💥',ink:group.startsWith('NT')?'#725098':group.startsWith('NF')?'#477a65':group.startsWith('SJ')?'#426c94':'#8b641f',projectile:{symbol,fontSize:32,spinSpeed,trailType:'short',impactType:'ring',hitText:texts}});
export const PRESENTATIONS:Record<MBTIType,CharacterPresentation>={
 ENTP:{group:'NT · 分析家',color:0xb69bfa,colorCss:'#b69bfa',symbol:'💬',weapon:'对话框 / 指点手势',basicName:'反驳',texts:['Actually','Source?','Wrong.','Technically…','☝ 🤓'],skillText:'Actually ☝',ultimateTexts:['BUT!','NO!','ACTUALLY','SOURCE?','TECHNICALLY'],fantasy:'打不过没关系，我可以烦死你。',pose:'debate',prop:'💬',skillSymbol:'☝️',ultimateSymbol:'💬',hurtSymbol:'🤓',ink:'#725098',projectile:{symbol:'💬',fontSize:32,textFontSize:24,skillTextFontSize:30,spinSpeed:0,trailType:'speech',impactType:'ring',hitText:['ACTUALLY!','SOURCE?','WRONG.']}},
 INFP:{group:'NF · 外交家',color:0x88bd9f,colorCss:'#88bd9f',symbol:'♥️',weapon:'小心心',basicName:'小心心',texts:['♥'],skillText:'没事，我没事',ultimateTexts:['♥ 我忍你很久了！'],fantasy:'没事，我真的没事……我忍你很久了！',pose:'shy',prop:'♥️',skillSymbol:'🥲',ultimateSymbol:'💔',hurtSymbol:'🥲',ink:'#477a65',projectile:{symbol:'♥️',fontSize:34,spinSpeed:0,trailType:'short',impactType:'heart',hitText:['我没事','真的没事…']}},
 ESTJ:{group:'SJ · 守护者',color:0x88b2d9,colorCss:'#88b2d9',symbol:'📋',weapon:'文件夹 / KPI',basicName:'文件夹',texts:['▤','ASAP'],skillText:'DEADLINE',ultimateTexts:['KPI ↓','Needs Improvement','-10'],fantasy:'你的死亡 Deadline 是三秒以后。',pose:'command',prop:'📋',skillSymbol:'📅',ultimateSymbol:'📊',hurtSymbol:'⏰',ink:'#426c94',projectile:{symbol:'📋',fontSize:34,spinSpeed:5,trailType:'short',impactType:'bonk',hitText:['ASAP!','NEEDS IMPROVEMENT']}},
 ESTP:{group:'SP · 探险家',color:0xd8b85d,colorCss:'#d8b85d',symbol:'👊',weapon:'拳头',basicName:'拳头',texts:['POW!','WOO!'],skillText:'WOOOOOO!',ultimateTexts:['再来！'],fantasy:'WOOOOOOOO！先冲了再说！',pose:'punch',prop:'👊',skillSymbol:'💨',ultimateSymbol:'⚡',hurtSymbol:'💥',ink:'#8b641f',projectile:{symbol:'👊',fontSize:38,spinSpeed:0,trailType:'speed',impactType:'bonk',hitText:['WOOOOOO!','POW!']}},
 INTJ:presentation('NT · 分析家',0xac98db,'♟️','棋子','♟️','🎯','一切都在计划中。','calm',['CHECKMATE','PLAN B']),
 INTP:presentation('NT · 分析家',0xc4abed,'❓','问号','🤔','💭','等一下……我还没想完。','think',['Maybe…','But…','???']),
 ENTJ:presentation('NT · 分析家',0xa48bd0,'👉','指令','👉','📣','所有人按照我的安排来。','command',['YOU.','GO.','都听我的！']),
 INFJ:presentation('NF · 外交家',0x80bcae,'👁️','看透你了','👁️','🔮','我已经知道你接下来要干什么了。','calm',['我懂你','灵魂审判']),
 ENFJ:presentation('NF · 外交家',0x99c89d,'✨','鼓励波','🤗','🌟','你们不要打了！','open',['不要打了！','相信自己！']),
 ENFP:presentation('NF · 外交家',0xb0cc91,'💡','灵感弹','💡','🐔','我有一个想法！','perform',['新爱好！','我有一个想法！']),
 ISTJ:presentation('SJ · 守护者',0x8baacb,'📏','标尺','📋','✅','只要严格执行流程，你一定会死。','command',['按流程来','SOP ✓✓✓']),
 ISFJ:presentation('SJ · 守护者',0x9db9d9,'🛡️','盾击','🛡️','💢','我本来不想打你的。','guard',['别碰我','你居然敢欺负我！']),
 ESFJ:presentation('SJ · 守护者',0x84b8d1,'💌','邀请函','🤝','📸','来都来了，一起拍张照嘛！','open',['大家一起嘛！','大合照！']),
 ISTP:presentation('SP · 探险家',0xccb578,'🔧','扳手','🔧','⚙️','等一下，我做个东西。','calm',['BONK!','应该能用'],6),
 ISFP:presentation('SP · 探险家',0xd6c17d,'🖌️','画笔','💨','🎨','别烦我，我在自己的世界里挺好的。','shy',['不要管我','这是我的世界']),
 ESFP:presentation('SP · 探险家',0xe0b96f,'🎤','音浪','📢','✨','所有人——看——我！','perform',['看我！','MY SHOW!']),
};
function compose(type:MBTIType){const c=gameplayCharacter(type),p=PRESENTATIONS[type];return {...c,group:p.group,color:p.color,colorCss:p.colorCss,presentation:{...p,skillText:['ENTP','ESTJ'].includes(type)?p.skillText:c.skill.name}};}
export const CHARACTERS=Object.fromEntries(PLAYABLE_TYPES.map(type=>[type,compose(type)])) as Record<MBTIType,ReturnType<typeof compose>>;
export function getCharacter(type:string){return CHARACTERS[isPlayable(type)?type:'ENTP'];}
