# MBTI 大乱斗 --- 16 人格角色设计与 Agent 执行规范

> Document: Character Design & Implementation Spec v0.1\
> Project Tone: 欢乐 / 玩梗 / 荒诞 / 一眼能懂的人格显化\
> Current Stack: Phaser 3 + TypeScript + Node.js + Socket.IO\
> Multiplayer: Server Authoritative\
> Target Roster: 16 MBTI Personalities

------------------------------------------------------------------------

# 1. 核心设计目标

本游戏不是把 16 种 MBTI 做成传统职业换皮。

核心体验：

> **玩家看到一个角色的攻击方式、技能动作或大招演出，就能立刻笑着说："这也太
> XXXX 了。"**

设计优先级：

``` text
人格辨识度
>
欢乐 / Meme 效果
>
操作反馈
>
角色差异
>
竞技平衡
>
复杂度
```

Prototype / Alpha 阶段不要为了竞技平衡削弱角色的性格表达。

------------------------------------------------------------------------

# 2. Character Design Pillars

每个角色必须满足以下原则。

## 2.1 Personality First

技能首先回答：

``` text
“这个人格最经典、最好笑的刻板印象是什么？”
```

然后才回答：

``` text
“它在战斗里应该造成什么效果？”
```

禁止反向设计：

``` text
我们需要一个 Tank
→ 随便找一个 MBTI 套进去
```

------------------------------------------------------------------------

## 2.2 Meme → Mechanic

人格梗必须尽量转化成 Gameplay。

例如：

``` text
INFP
玻璃心
↓
忍耐伤害
↓
积累委屈
↓
情绪核爆
```

而不是：

``` text
INFP
↓
普通火球
↓
把火球换成爱心贴图
```

------------------------------------------------------------------------

## 2.3 Readable in One Second

技能应该有非常强的视觉关键词：

``` text
INTJ → 棋子 / 计划
ENTP → Actually / 对话框
INFP → 爱心 / 委屈
ESTJ → Deadline / KPI
ESFJ → 大合照
ISTP → 扳手 / 炮台
ESTP → WOOOOOO!
ESFP → 麦克风 / 聚光灯
```

尽量避免复杂说明后玩家才能理解笑点。

------------------------------------------------------------------------

## 2.4 Comedy Over Realism

允许：

-   巨大文字
-   Emoji
-   荒诞道具
-   夸张 Knockback
-   突然出现的鸡
-   巨型 KPI
-   巨型箭头
-   摄影闪光
-   对话框攻击
-   不合理但好笑的物理表现

------------------------------------------------------------------------

# 3. 统一角色结构

每个人格最终结构：

``` text
Character
│
├── Basic Attack
├── Personality Skill
├── Ultimate
└── Personality Trait
```

其中：

### Basic Attack

高频操作。

必须简单、快速、容易理解。

### Personality Skill

人格梗最核心的 Gameplay 表达。

### Ultimate

人格刻板印象的最大化、最荒诞版本。

### Personality Trait

轻量被动，用于强化"扮演这个人格"的感觉。

Trait 不允许发展成复杂被动系统。

------------------------------------------------------------------------

# 4. 四大人格组战斗语言

## 🟣 NT --- Analysts

主题：

``` text
分析
计划
控制
辩论
觉得自己比别人聪明
```

Gameplay：

``` text
Prediction
Debuff
Control
Trap
Forced Movement
```

------------------------------------------------------------------------

## 🟢 NF --- Diplomats

主题：

``` text
情绪
共情
关系
忍耐
情感爆发
```

Gameplay：

``` text
Emotion
Mark
Protection
Comeback
Chaos
```

------------------------------------------------------------------------

## 🔵 SJ --- Sentinels

主题：

``` text
规则
流程
责任
秩序
组织
```

Gameplay：

``` text
Consistency
Defense
Zone Control
Punishment
Grouping
```

------------------------------------------------------------------------

## 🟡 SP --- Explorers

主题：

``` text
行动
即兴
自由
现场发挥
冲动
```

Gameplay：

``` text
Mobility
Dash
Improvisation
Area Presence
Chaos
```

------------------------------------------------------------------------

# 5. 🟣 INTJ --- 幕后黑手

## Personality Fantasy

``` text
“你以为我在逃？
其实一切都在计划中。”
```

## Basic Attack --- 棋子

武器：

``` text
Chess Piece
```

发射黑色棋子。

特点：

-   Ranged
-   Medium Speed
-   Medium Damage
-   精准稳定

## Skill --- 早有预料

第一次 RMB：

``` text
Place Chess Marker
```

第二次 RMB：

``` text
Teleport Back
+
Explosion at previous position
```

视觉：

``` text
♟
```

## Ultimate --- 一切都在计划中

短暂显示敌人的：

``` text
Predicted Movement Path
```

随后：

``` text
Bombard Predicted Positions
```

视觉：

``` text
Grid
Prediction Line
Target Marker
Explosion
```

## Trait --- Plan B

生命较低时：

``` text
Teleport Skill cooldown slightly reduced
```

强化"永远有后手"。

------------------------------------------------------------------------

# 6. 🟣 INTP --- 想太多

## Fantasy

``` text
“等一下……
我还没想完。”
```

## Basic Attack --- 问号

发射：

``` text
?
```

Projectile 轨迹有轻微随机漂移。

## Skill --- 等一下，我想想

角色停止约：

``` text
1 second
```

头顶快速出现：

``` text
?
??
???
```

完成后随机获得：

``` text
Attack Buff
Move Speed Buff
Defense Buff
```

## Ultimate --- 无限思考

制造巨大：

``` text
Thinking Zone
```

区域内充满：

``` text
?
...
Maybe
But...
```

敌人的移动方向受到周期性轻微扰乱。

## Trait --- Overthinking

长时间没有攻击时：

``` text
下一发 Basic Attack slightly stronger
```

------------------------------------------------------------------------

# 7. 🟣 ENTJ --- 霸道总裁

## Fantasy

``` text
“所有人按照我的安排来。”
```

## Basic Attack --- 指令

发射：

``` text
Command Beam / Pointer
```

直线高速攻击。

## Skill --- 你，过去！

朝 Aim Direction 出现巨大：

``` text
→
```

路径上的敌人被强制 Push。

## Ultimate --- 都听我的！

出现巨大组织指令箭头。

范围内敌人：

``` text
Forced Movement
→
Target Direction
```

## Trait --- Execution

成功 Push 敌人后：

``` text
短暂获得 Move Speed
```

------------------------------------------------------------------------

# 8. 🟣 ENTP --- 互联网杠精

## Fantasy

``` text
“打不过没关系，
我可以烦死你。”
```

## Basic Attack --- 反驳

发射高速 Speech Bubble。

随机文字：

``` text
Actually
Source?
Wrong.
Technically...
☝️🤓
```

## Skill --- 你说得不对

发射巨大：

``` text
Actually ☝️
```

命中：

``` text
Defense Down
```

## Ultimate --- 我不是针对谁

角色开始高速输出观点。

向四周连续喷射：

``` text
Speech Shockwaves
```

文字可以随机：

``` text
BUT
NO
ACTUALLY
SOURCE?
TECHNICALLY
```

## Trait --- Debate Me

攻击带 Debuff 的敌人：

``` text
Personality Meter Gain ↑
```

------------------------------------------------------------------------

# 9. 🟢 INFJ --- 看穿一切

## Fantasy

``` text
“我已经知道你接下来要干什么了。”
```

## Basic Attack --- 看透你了

细长 Psychic Beam。

## Skill --- 我懂你

标记 Aim Direction 最近敌人。

目标：

``` text
Weakness Mark
```

INFJ 对该目标：

``` text
Damage ↑
```

## Ultimate --- 灵魂审判

所有 Marked Target：

``` text
Eye appears
↓
Delay
↓
Psychic Explosion
```

## Trait --- Insight

持续观察同一敌人一段时间：

``` text
Mark duration slightly increased
```

------------------------------------------------------------------------

# 10. 🟢 INFP --- 玻璃心核弹

## Fantasy

``` text
“没事。
我真的没事。

……

我忍你很久了！”
```

## Basic Attack --- 小心心

发射：

``` text
♥
```

看起来柔软、伤害普通。

## Skill --- 没事，我没事

进入：

``` text
Damage Reduction
```

持续期间受到的伤害转换为：

``` text
Grievance / 委屈值
```

## Ultimate --- 我忍你很久了！

释放累计情绪。

伤害：

``` text
Base Damage
+
Missing HP Bonus
+
Grievance Bonus
```

巨大情绪爆炸。

## Trait --- Sensitive

HP 越低：

``` text
Personality Meter Gain ↑
```

------------------------------------------------------------------------

# 11. 🟢 ENFJ --- 所有人的妈妈

## Fantasy

``` text
“你们不要打了！

我说——
不要打了！！”
```

## Basic Attack --- 鼓励波

短距离 Energy Wave。

## Skill --- 你们不要打了！

环形：

``` text
Push
```

同时自己获得：

``` text
Shield
```

## Ultimate --- 相信自己！

进入强化状态：

``` text
Move Speed ↑
Damage ↑
```

同时周期性释放：

``` text
Encouragement Shockwave
```

## Trait --- Caregiver

附近玩家数量越多：

``` text
Shield slightly stronger
```

------------------------------------------------------------------------

# 12. 🟢 ENFP --- 人形随机事件

## Fantasy

``` text
“我有一个想法！”
```

没人知道接下来会发生什么。

## Basic Attack --- 灵感弹

随机视觉：

``` text
Star
Rainbow
Confetti
Light Bulb
```

Gameplay Damage 保持稳定，避免普攻过度随机。

## Skill --- 我有一个想法！

随机：

``` text
Bomb
Dash
Heal
Speed Boost
Chicken
```

Chicken：

``` text
跑向附近玩家
→
造成轻微 Knockback
```

## Ultimate --- 新爱好！

随机获得一种强力临时状态：

``` text
Rapid Fire
Super Speed
Explosive Projectiles
Giant Chicken
```

## Trait --- Easily Excited

每次触发不同 Random Effect：

``` text
Personality Meter small bonus
```

------------------------------------------------------------------------

# 13. 🔵 ISTJ --- 人形 Excel

## Fantasy

``` text
“只要严格执行流程，
你一定会死。”
```

## Basic Attack --- 标尺

极其笔直的 Ruler Projectile。

## Skill --- 按流程来

连续攻击同一目标：

``` text
Damage Stack ↑
```

切换目标：

``` text
Reset
```

## Ultimate --- 标准作业流程

进入：

``` text
SOP MODE
```

获得：

``` text
Attack Speed ↑
Projectile Speed ↑
Accuracy ↑
```

视觉：

``` text
Checklist
✓
✓
✓
```

## Trait --- Consistency

连续命中同一个敌人：

``` text
Damage gradually ↑
```

------------------------------------------------------------------------

# 14. 🔵 ISFJ --- 别碰我的朋友

## Fantasy

``` text
“我本来不想打你的。”
```

## Basic Attack --- 盾击

近距离 Shield Swing。

## Skill --- 别碰我

举盾：

``` text
Damage Reduction
```

受到近战攻击：

``` text
Automatic Counter
```

## Ultimate --- 你居然敢欺负我！

巨大盾牌砸地：

``` text
360° Shockwave
+
Strong Knockback
```

## Trait --- Protective

受到连续攻击时：

``` text
Shield effectiveness slightly ↑
```

------------------------------------------------------------------------

# 15. 🔵 ESTJ --- 项目经理

## Fantasy

``` text
“你的死亡 Deadline 是三秒以后。”
```

## Basic Attack --- 文件夹

高速投掷：

``` text
📋
```

## Skill --- Deadline

在地面创建：

``` text
DEADLINE
3
2
1
```

结束：

``` text
Explosion
+
Slow
```

## Ultimate --- 绩效评估

创建巨大：

``` text
KPI ZONE
```

范围内敌人周期性受到：

``` text
Performance Deduction Damage
```

视觉：

``` text
KPI ↓
-10
Needs Improvement
```

## Trait --- On Schedule

技能命中多个敌人：

``` text
Skill Cooldown slight refund
```

------------------------------------------------------------------------

# 16. 🔵 ESFJ --- 社交委员会主任

## Fantasy

``` text
“来都来了，
一起拍张照嘛！”
```

## Basic Attack --- 邀请函

发射：

``` text
💌
```

## Skill --- 大家一起嘛！

附近敌人：

``` text
Pull Toward ESFJ
```

## Ultimate --- 大合照！

范围内敌人：

``` text
Pull to Center
```

然后：

``` text
3
2
1
📸
FLASH
BOOM
```

## Trait --- Social Energy

附近角色越多：

``` text
Personality Meter Gain ↑
```

------------------------------------------------------------------------

# 17. 🟡 ISTP --- 修东西的人

## Fantasy

``` text
“等一下，
我做个东西。”
```

## Basic Attack --- 扳手

直接把：

``` text
🔧
```

扔出去。

## Skill --- 让我看看

快速组装：

``` text
Mini Turret
```

自动攻击附近敌人。

## Ultimate --- 应该能用

组装明显过大的：

``` text
Mega Turret
```

疯狂射击。

结束：

``` text
Turret explodes
```

## Trait --- Tinkerer

Turret 命中敌人：

``` text
small Skill Cooldown refund
```

------------------------------------------------------------------------

# 18. 🟡 ISFP --- 不要管我

## Fantasy

``` text
“别烦我，
我在自己的世界里挺好的。”
```

## Basic Attack --- 画笔

短距离 Brush Swing。

留下：

``` text
Paint Trail
```

## Skill --- 不要管我

短时间：

``` text
Move Speed ↑
Visual Presence ↓
```

下一击：

``` text
Damage ↑
```

## Ultimate --- 这是我的世界

展开：

``` text
Art Zone
```

区域变成个人艺术世界。

ISFP 在其中：

``` text
Move Speed ↑
Attack Range ↑
```

## Trait --- Personal Space

附近没有敌人时：

``` text
Move Speed slightly ↑
```

------------------------------------------------------------------------

# 19. 🟡 ESTP --- 先冲了再说

## Fantasy

``` text
“WOOOOOOOO！”
```

## Basic Attack --- 拳头

快速近战 Punch。

## Skill --- WOOOOOO!

朝 Aim Direction：

``` text
Dash
```

撞到敌人：

``` text
Damage
+
Strong Knockback
```

## Ultimate --- 再来！

进入：

``` text
Adrenaline Mode
```

Dash Cooldown 大幅降低。

可以连续在人群中冲撞。

## Trait --- Momentum

Dash 命中敌人：

``` text
Refund part of Dash Cooldown
```

------------------------------------------------------------------------

# 20. 🟡 ESFP --- 全场看我

## Fantasy

``` text
“所有人——
看——我——！”
```

## Basic Attack --- 音浪

Microphone 发射短程 Sound Wave。

## Skill --- 看我！

产生：

``` text
360° Sound Shockwave
```

附近敌人被震开。

## Ultimate --- MY SHOW!

聚光灯锁定自己。

连续释放：

``` text
Expanding Sound Rings
```

每一圈：

``` text
Damage
+
Knockback
```

## Trait --- Spotlight

一次攻击命中多个敌人：

``` text
Personality Meter Gain ↑
```

------------------------------------------------------------------------

# 21. Character Summary

  MBTI   Nickname         Combat Identity           Key Meme
  ------ ---------------- ------------------------- ----------------
  INTJ   幕后黑手         Trap / Prediction         一切都在计划中
  INTP   想太多           Random Buff / Confusion   等一下我想想
  ENTJ   霸道总裁         Push / Control            你，过去
  ENTP   互联网杠精       Ranged / Debuff           Actually ☝️
  INFJ   看穿一切         Mark / Burst              我懂你
  INFP   玻璃心核弹       Comeback / Burst          我忍你很久了
  ENFJ   所有人的妈妈     Shield / Push             你们不要打了
  ENFP   人形随机事件     Chaos                     我有一个想法
  ISTJ   人形 Excel       Consistency               按流程来
  ISFJ   别碰我的朋友     Defense / Counter         我本来不想打你
  ESTJ   项目经理         Zone Control              Deadline / KPI
  ESFJ   社交委员会主任   Pull / Grouping           大合照
  ISTP   修东西的人       Turret                    应该能用
  ISFP   不要管我         Mobility / Zone           这是我的世界
  ESTP   先冲了再说       Dash / Melee              WOOOOOO
  ESFP   全场看我         AoE / Knockback           MY SHOW

------------------------------------------------------------------------

# 22. Reusable Gameplay Primitives

Agent 不要为 16 个角色创建 16 套完全独立的系统。

优先建立可组合 Primitive：

``` text
Projectile
Melee Hitbox
Beam
Dash
Teleport
AoE
Timed AoE
Push
Pull
Knockback
Mark
Shield
Damage Reduction
Buff
Debuff
Random Effect
Zone
Turret
Counter
Target Tracking
Cooldown Refund
```

Character Skill 应尽量：

``` text
Primitive
+
Parameters
+
Presentation
```

------------------------------------------------------------------------

# 23. Skill Definition

推荐：

``` ts
interface SkillDefinition {
  id: string;
  name: string;

  cooldown: number;

  aimMode:
    | "none"
    | "direction"
    | "position";

  primitive:
    | "projectile"
    | "dash"
    | "aoe"
    | "zone"
    | "teleport"
    | "turret"
    | "buff"
    | "counter";

  params: Record<string, number | string | boolean>;
}
```

不要为了满足这个接口强行限制特殊技能。

允许少量：

``` text
Custom Behavior
```

但先判断是否能由已有 Primitive 组合。

------------------------------------------------------------------------

# 24. Character Definition

推荐：

``` ts
interface CharacterDefinition {
  mbti: MBTIType;

  nickname: string;

  maxHp: number;
  moveSpeed: number;

  basicAttack: AttackDefinition;
  skill: SkillDefinition;
  ultimate: SkillDefinition;
  trait: TraitDefinition;

  presentation: CharacterPresentation;
}
```

Server 使用 Gameplay Data。

Client 使用 Gameplay Data + Presentation。

------------------------------------------------------------------------

# 25. Meme Text Data

文字梗不要散落在代码里。

例如：

``` ts
ENTP_TEXT = [
  "Actually",
  "Source?",
  "Wrong.",
  "Technically...",
  "☝️🤓"
];
```

ESTJ：

``` ts
ESTJ_TEXT = [
  "DEADLINE",
  "KPI",
  "Needs Improvement",
  "ASAP",
  "-10"
];
```

以后方便：

-   Localize
-   增加梗
-   A/B Test
-   调整尺度

------------------------------------------------------------------------

# 26. Vertical Slice Characters

第一轮只完整实现：

``` text
ENTP
INFP
ESTJ
ESTP
```

原因：

### ENTP

验证：

``` text
Projectile
Debuff
Text VFX
Radial Attack
```

### INFP

验证：

``` text
Damage Reduction
Damage Accumulation
Low HP Scaling
AoE Burst
```

### ESTJ

验证：

``` text
Timed AoE
Zone
Slow
Repeated Damage
```

### ESTP

验证：

``` text
Melee
Dash
Collision
Knockback
Cooldown Refund
```

这四人可以覆盖后续大量角色所需基础系统。

------------------------------------------------------------------------

# 27. Vertical Slice Implementation Order

## Step 1 --- Shared Character Framework

建立：

``` text
CharacterDefinition
AttackDefinition
SkillDefinition
TraitDefinition
StatusEffect
Gameplay Primitive
```

确保 Client / Server 共享定义。

------------------------------------------------------------------------

## Step 2 --- ENTP

实现：

``` text
Basic:
Speech Projectile

Skill:
Actually Projectile
→ Defense Debuff

Ultimate:
Radial Speech Shockwaves

Trait:
Attack Debuffed Target
→ Personality Bonus
```

验收重点：

``` text
Debuff synchronization
Projectile hit
Text VFX
```

------------------------------------------------------------------------

## Step 3 --- INFP

实现：

``` text
Basic:
Heart Projectile

Skill:
Damage Reduction
+
Grievance Accumulation

Ultimate:
Emotional Explosion

Trait:
Low HP Personality Bonus
```

验收重点：

``` text
Server Damage Accumulation
Low HP Scaling
Ultimate Calculation
```

------------------------------------------------------------------------

## Step 4 --- ESTJ

实现：

``` text
Basic:
Clipboard Projectile

Skill:
Deadline Timed AoE

Ultimate:
KPI Zone

Trait:
Multi-hit Cooldown Refund
```

验收：

``` text
Timed Server Event
Zone synchronization
Slow
Repeated Damage
```

------------------------------------------------------------------------

## Step 5 --- ESTP

实现：

``` text
Basic:
Melee Punch

Skill:
Directional Dash

Ultimate:
Low-CD Dash Mode

Trait:
Dash Hit Cooldown Refund
```

验收：

``` text
Dash prediction
Server collision
Knockback
Position reconciliation
```

------------------------------------------------------------------------

# 28. First Balance Values

不要现在追求最终平衡。

使用统一 Baseline。

``` text
Base HP = 100
Base Move Speed = existing prototype speed
Personality Max = 100
```

Basic Attack：

``` text
Damage ≈ 8–12
```

Skill：

``` text
Cooldown ≈ 5–8 sec
```

Ultimate：

``` text
Personality Cost = 100
```

目标：

``` text
普通情况下
约 8–12 次有效普攻等价伤害
可以击杀玩家
```

避免：

``` text
2 Hit Kill
```

也避免：

``` text
打半天不死人
```

最终数值必须通过 Playtest 调整。

------------------------------------------------------------------------

# 29. VFX Principle

角色仍然可以保持：

``` text
Stickman
+
MBTI Head
```

技能辨识主要来自：

``` text
Shape
Typography
Symbol
Motion
Scale
Timing
```

而不是依赖昂贵角色美术。

例如：

``` text
ENTP
Speech Bubble + Typography

ESTJ
Huge DEADLINE Text

ESFJ
Camera Flash

INTJ
Chess + Prediction Lines
```

这应该成为项目独特视觉语言。

------------------------------------------------------------------------

# 30. Animation Principle

动作同样需要人格化。

例如：

``` text
INTJ
动作少、冷静

ENTP
攻击时身体前倾、像在争辩

INFP
受击夸张委屈

ESTJ
动作像在指挥会议

ESTP
身体永远向前冲

ESFP
攻击像在表演
```

不要所有角色共享完全相同的攻击 Pose，只换 Projectile。

------------------------------------------------------------------------

# 31. Audio Direction

后续可以加入短促非语言 Vocal。

例如：

``` text
ENTP
“Eh?”
“Actually!”

ESTJ
“Deadline!”

ESTP
“WOO!”

ESFP
“HEY!”
```

Prototype 可以先使用文字替代。

不要因为 Audio 阻塞 Gameplay。

------------------------------------------------------------------------

# 32. Mobile Controls Compatibility

所有 Skill 必须定义：

``` text
aimMode
```

以兼容：

``` text
Desktop
Mouse

Mobile
Virtual Joystick
```

例如：

``` text
ENTP Skill
direction

INFP Skill
none

ESTJ Skill
position

ESTP Skill
direction
```

禁止出现只有 Mouse 才能使用的 Skill Interaction。

------------------------------------------------------------------------

# 33. Multiplayer Rules

所有角色 Gameplay：

``` text
Server Authoritative
```

Server 决定：

``` text
Hit
Damage
Buff
Debuff
Cooldown
Personality
Ultimate
Trait
Death
```

Client：

``` text
Animation
VFX
Text
Audio
UI
```

------------------------------------------------------------------------

# 34. Agent 禁止事项

不要：

-   一次实现 16 人
-   为每个角色创建完全独立 Combat System
-   把所有逻辑塞进 Character Class
-   Client 决定 Damage
-   Client 决定 Trait 是否触发
-   为了平衡削掉 Meme 表现
-   使用复杂被动树
-   提前做装备系统
-   提前做成长系统
-   提前做职业克制
-   提前做同色 Synergy
-   使用大量昂贵 Sprite Asset 才能完成技能

------------------------------------------------------------------------

# 35. 同色 Synergy

当前版本：

``` text
DO NOT IMPLEMENT
```

未来可考虑：

``` text
NT
Analysis / Control

NF
Emotion / Support

SJ
Order / Defense

SP
Mobility / Chaos
```

但当前 Character Identity 必须首先独立成立。

------------------------------------------------------------------------

# 36. Character Playtest Questions

每个角色完成后，不只测数值。

询问测试者：

### Question 1

``` text
不看名字，
你觉得这个角色是什么性格？
```

### Question 2

``` text
哪个技能最好笑？
```

### Question 3

``` text
哪个技能最容易理解？
```

### Question 4

``` text
你有没有主动想用某个技能制造节目效果？
```

### Question 5

``` text
你愿不愿意换另一个 MBTI 看看它有什么奇怪能力？
```

如果玩家产生：

``` text
“我想看看 ENFP 到底会发生什么”
```

说明 Character Roster 正在产生正确的驱动力。

------------------------------------------------------------------------

# 37. Success Criteria --- Character Design

每个角色至少满足：

-   [ ] 1 秒内有视觉辨识
-   [ ] Basic Attack 与人格有联系
-   [ ] Skill 是人格梗的 Gameplay 化
-   [ ] Ultimate 是人格梗的夸张升级
-   [ ] Trait 强化操作性格
-   [ ] 与其他角色玩法明显不同
-   [ ] 不依赖复杂说明
-   [ ] 有至少一个容易产生笑点的 Moment
-   [ ] Desktop 可操作
-   [ ] Mobile Touch Input 可操作
-   [ ] Server Authoritative 可实现

------------------------------------------------------------------------

# 38. Agent 当前执行范围

当前只实现：

``` text
Character Framework
+
ENTP
+
INFP
+
ESTJ
+
ESTP
```

不要实现剩余 12 人。

四个角色全部完成后：

进行：

``` text
2-player test
↓
4-player test
↓
PC + Mobile test
```

然后 STOP。

------------------------------------------------------------------------

# 39. Agent 完成后输出

必须输出：

1.  Modified Files
2.  Character Framework
3.  Reusable Gameplay Primitives
4.  ENTP Implementation
5.  INFP Implementation
6.  ESTJ Implementation
7.  ESTP Implementation
8.  Shared Network Protocol Changes
9.  Mobile Input Compatibility
10. Known Issues
11. Balance Values
12. Playtest Instructions
13. Remaining 12 Character Implementation Plan

然后停止。

不要自动继续实现剩余角色。

------------------------------------------------------------------------

# 40. 最终体验目标

玩家不是在选择：

``` text
Tank
Mage
Assassin
Support
```

而是在选择：

``` text
“我今天想当一个烦死所有人的 ENTP。”

“我要用 INFP 忍到最后突然核爆。”

“我要拿 ESTJ 给所有人设 Deadline。”

“我就选 ESTP 到处 WOOOOOO 撞人。”
```

这才是 MBTI 大乱斗角色系统的核心。

> **人格不是角色皮肤。人格本身就是 Gameplay。**
