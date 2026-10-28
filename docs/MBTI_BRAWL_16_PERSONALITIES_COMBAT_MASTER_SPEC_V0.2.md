# MBTI 大乱斗 --- 16 Personalities Combat Master Spec V0.2

> 统一主文档：角色玩法 + 技能 + Trait + Emoji/Typography/VFX +
> 数值基准 + Server Authority + Codex 实施规范\
> Stack: Phaser 3 + TypeScript + Node.js + Socket.IO\
> Current Target: 8 Players / Future: 16 Players

## 1. 核心原则

> **人格不是皮肤，人格本身就是 Gameplay。**

设计优先级：

`人格辨识度 > 欢乐/Meme > 操作反馈 > 角色差异 > 竞技平衡 > 复杂度`

每个人格统一为：

`Basic Attack + Personality Skill + Ultimate + Lightweight Trait`

设计方法：`MBTI Meme → Gameplay Mechanic`。

## 2. 四组战斗语言

-   🟣 NT：分析、计划、控制、争论、预测；Prediction / Debuff / Trap /
    Forced Movement。
-   🟢 NF：情绪、共情、关系、克制、爆发；Mark / Protection / Comeback /
    Buff / Chaos。
-   🔵 SJ：规则、流程、责任、秩序；Consistency / Defense / Zone /
    Punishment / Grouping。
-   🟡 SP：行动、即兴、自由、冲动；Mobility / Dash / Improvisation /
    Area Presence。

## 3. 数值基准

``` text
Max HP = 100
Max Personality = 100
Basic Damage ≈ 8–12
Skill Cooldown ≈ 5–8 sec
Ultimate Cost = 100
1 Damage Dealt ≈ 1 Personality Point
```

目标约 8--12 次有效普攻等价伤害完成击杀。全部 Config Driven。

## 4. Reusable Primitives

`Projectile / MeleeHitbox / Beam / Dash / Teleport / AoE / TimedAoE / Push / Pull / Knockback / Mark / Shield / DamageReduction / Buff / Debuff / RandomEffect / Zone / Turret / Counter / TargetTracking / CooldownRefund`

优先：`Primitive + Parameters + Presentation`，必要时才 Custom
Behavior。

## 5. Combat Visual Language

视觉公式：

`Stickman + MBTI Head + Emoji Prop + Meme Typography + Geometry VFX + Exaggerated Motion`

实现优先级：

`Emoji → Typography → Phaser Geometry/VFX → Simple Custom Asset`

具体物品优先 Emoji；人格表达优先 Typography；抽象力量优先
Geometry/Motion；Emoji 无法清楚表达才手画。

Emoji Fallback：

`Alternative Emoji → Unicode → Emoji+Text → Geometry → Text+Geometry → Custom Asset`

Gameplay 与 Presentation 分离。Server 决定
Hit/Damage/Cooldown/Buff/Debuff/Personality/Death/Gameplay
Random；Client 决定 Emoji/Text/Animation/Trail/Impact/Flash/Audio。

------------------------------------------------------------------------

# 6. 🟣 INTJ --- 幕后黑手

**Fantasy：**"你以为我在逃？其实一切都在计划中。"

**Identity：** Planning / Teleport / Prediction

**Basic「棋子」**：♟️ 精准中速 Projectile，Damage 10。Straight Trail。

**Skill「早有预料」**：第一次放置 Chess Marker，第二次传送回
Marker，并在传送前位置产生小 AoE。Primitive = Teleport + AoE；Cooldown
7s。表现：♟️ Marker + Target Circle + Flash。

**Ultimate「一切都在计划中」**：短暂显示附近敌人的预测移动路径，随后轰炸预测位置。Primitive
= TargetTracking + TimedAoE。表现：Prediction Lines + Grid + Target
Markers。

**Trait「Plan B」**：HP \< 40% 时 Skill Cooldown -15%。

------------------------------------------------------------------------

# 7. 🟣 INTP --- 想太多

**Fantasy：**"等一下......我还没想完。"

**Identity：** Uncertainty / Random Buff / Confusion

**Basic「问号」**：❓ Projectile，Damage 9，轻微 Wobble。

**Skill「等一下，我想想」**：停顿约 0.8--1s，随机获得 Attack Speed /
Move Speed / Defense Buff。Primitive = RandomEffect + Buff；Cooldown
7s。表现：🤔 ? ?? ???

**Ultimate「无限思考」**：Thinking
Zone，区域敌人周期性受到轻微方向干扰，但不能完全夺取控制。Primitive =
Zone + Debuff。表现：❓ 💭 ... / Maybe / But...

**Trait「Overthinking」**：一段时间未攻击后，下一次 Basic +20%
Damage，攻击后重置。

------------------------------------------------------------------------

# 8. 🟣 ENTJ --- 霸道总裁

**Fantasy：**"所有人按照我的安排来。"

**Identity：** Command / Push / Forced Direction

**Basic「指令」**：👉 快速直线 Projectile/Beam，Damage 10。

**Skill「你，过去！」**：巨大命令箭头，Damage 8 + Strong Push。Primitive
= Directional Hitbox + Push；Cooldown 6s。表现：👉 + Huge Arrow +
YOU./GO.

**Ultimate「都听我的！」**：范围内敌人短时间受到强制方向位移。Primitive
= AoE + Forced Movement。避免长时间夺权。

**Trait「Execution」**：成功 Push 后 Move Speed +15%，2s。

------------------------------------------------------------------------

# 9. 🟣 ENTP --- 互联网杠精

**Fantasy：**"打不过没关系，我可以烦死你。"

**Identity：** Speech Projectile / Debuff / Spam

**Basic「反驳」**：💬 高速 Projectile，Damage 9；随机视觉文字
ACTUALLY!/SOURCE?/WRONG./TECHNICALLY.../☝️🤓。

**Skill「你说得不对」**：☝️ ACTUALLY! 大型 Projectile，Damage 8；Defense
Down 15%，4s；Cooldown 6s。

**Ultimate「我不是针对谁」**：Radial Speech Barrage；💬 BUT / NO /
ACTUALLY / SOURCE? / TECHNICALLY。

**Trait「Debate Me」**：攻击处于 Debuff 的敌人，Personality Gain +25%。

------------------------------------------------------------------------

# 10. 🟢 INFJ --- 看穿一切

**Fantasy：**"我已经知道你接下来要干什么了。"

**Identity：** Observation / Mark / Delayed Judgment

**Basic「看透你了」**：👁️ Thin Psychic Beam，Damage 10。

**Skill「我懂你」**：瞄准方向寻找最近目标并施加 Weakness Mark；INFJ 对其
Damage +20%，5s；Cooldown 7s。Primitive = TargetTracking + Mark。

**Ultimate「灵魂审判」**：Marked Targets 出现 👁️ → Delay → Psychic
Explosion。Primitive = Mark + TimedAoE。

**Trait「Insight」**：持续攻击同一目标可小幅延长
Mark，必须设置最大延长。

------------------------------------------------------------------------

# 11. 🟢 INFP --- 玻璃心核弹

**Fantasy：**"没事。我真的没事。......我忍你很久了！"

**Identity：** Emotion / Damage Storage / Comeback

**Basic「小心心」**：♥️ Projectile，Damage 9。

**Skill「没事，我没事」**：Damage Reduction
30%，3s；期间受到的伤害累计为 Grievance/委屈值。Cooldown 7s。表现：🥲
+"我没事"。

**Ultimate「我忍你很久了！」**：AoE；Damage = Base + Missing HP Bonus +
Grievance Bonus，必须设置 Damage Cap。表现：💔 + Huge Emotional
Shockwave。

**Trait「Sensitive」**：HP \< 40% 时 Personality Gain +25%。

------------------------------------------------------------------------

# 12. 🟢 ENFJ --- 所有人的妈妈

**Fantasy：**"你们不要打了！我说------不要打了！！"

**Identity：** Protection / Crowd Control / Encouragement

**Basic「鼓励波」**：✨ Short Wave，Damage 10。

**Skill「你们不要打了！」**：360° Push，Damage 5，同时获得 Self
Shield；Cooldown 7s。Primitive = AoE + Push + Shield。

**Ultimate「相信自己！」**：短时间 Move Speed Up + Damage Up + Periodic
Encouragement Shockwave。Primitive = Buff + RepeatedAoE。

**Trait「Caregiver」**：附近角色越多，Skill Shield
越强；必须设置人数加成上限。

------------------------------------------------------------------------

# 13. 🟢 ENFP --- 人形随机事件

**Fantasy：**"我有一个想法！"

**Identity：** Random / Surprise / Chaos

**Basic「灵感弹」**：Damage 9 固定，视觉随机 ⭐ 🌈 💡 ✨；随机仅影响
Presentation。

**Skill「我有一个想法！」**：Server 随机 Bomb 💣 / Dash 💨 / Heal ❤️ /
Speed ⚡ / Chicken 🐔。Chicken 自动奔向附近玩家，Light Damage +
Knockback。Cooldown 7s。

**Ultimate「新爱好！」**：Server 随机强力短期状态：Rapid Fire / Super
Speed / Explosive Projectiles / Giant Chicken。

**Trait「Easily Excited」**：连续触发不同 Random Effect 时获得少量额外
Personality。

------------------------------------------------------------------------

# 14. 🔵 ISTJ --- 人形 Excel

**Fantasy：**"只要严格执行流程，你一定会死。"

**Identity：** Consistency / Procedure / Repetition

**Basic「标尺」**：📏 精准直线 Projectile，Damage 9。Emoji 不佳时使用
Rectangle + Tick Marks。

**Skill「按流程来」**：连续命中同一玩家叠层提高伤害，换目标
Reset；Active Window 约 6s。Primitive = TargetTracking + Stack Buff。

**Ultimate「标准作业流程」**：SOP MODE；Attack Speed / Projectile Speed
/ Accuracy Up。表现：📋 ✓✓✓ SOP。

**Trait「Consistency」**：连续 3 次 Basic 命中同一敌人，获得少量
Personality；避免与 Skill 重复叠伤。

------------------------------------------------------------------------

# 15. 🔵 ISFJ --- 别碰我的朋友

**Fantasy：**"我本来不想打你的。"

**Identity：** Defense / Counter / Retaliation

**Basic「盾击」**：🛡️ Melee Shield Swing，Damage 11。

**Skill「别碰我」**：获得 Shield/Damage Reduction；期间被近战命中自动
Counter。Counter 必须有 Internal Cooldown。Skill CD 7s。

**Ultimate「你居然敢欺负我！」**：巨大 Shield Slam，360 Shockwave +
Damage + Strong Knockback。

**Trait「Protective」**：短时间连续受击时 Shield Effectiveness
小幅提高，设上限。

------------------------------------------------------------------------

# 16. 🔵 ESTJ --- 项目经理

**Fantasy：**"你的死亡 Deadline 是三秒以后。"

**Identity：** Deadline / Zone / Punishment

**Basic「文件夹」**：📋 高速 Projectile，Damage 10，Light Rotation。

**Skill「Deadline」**：目标位置显示 DEADLINE 3/2/1 → Explosion；Damage
18；Slow 25%，2s；Cooldown 7s。Primitive = TimedAoE + Slow。表现：📅 ⏰
Warning Circle。

**Ultimate「绩效评估」**：KPI ZONE，敌人周期性受 Damage / Slow
Pressure。表现：📊 📉 KPI / -10 / NEEDS IMPROVEMENT / ASAP。

**Trait「On Schedule」**：Skill 命中多个敌人时每额外一人 Refund 0.5s
CD，设置最大 Refund。

------------------------------------------------------------------------

# 17. 🔵 ESFJ --- 社交委员会主任

**Fantasy：**"来都来了，一起拍张照嘛！"

**Identity：** Grouping / Pull / Social Chaos

**Basic「邀请函」**：💌 Projectile，Damage 9。

**Skill「大家一起嘛！」**：附近敌人 Pull 向自己，Damage 5，Cooldown
7s。表现：🤝 + Pull Lines。

**Ultimate「大合照！」**：Pull to Center → 3/2/1 → 📸 → FLASH →
BOOM。Primitive = Pull + TimedAoE。

**Trait「Social Energy」**：附近角色越多 Personality Gain
越高，设置人数上限。

------------------------------------------------------------------------

# 18. 🟡 ISTP --- 修东西的人

**Fantasy：**"等一下，我做个东西。"

**Identity：** Tool / Build / Turret

**Basic「扳手」**：🔧 Projectile，Damage 10；Spin + Trail + BONK!

**Skill「让我看看」**：部署 Mini Turret；Auto Target nearest enemy，有限
Lifetime / Fire Rate；Cooldown 8s。炮台优先 Phaser Geometry。

**Ultimate「应该能用」**：Mega Turret；Rapid Fire + Short Lifetime +
Final Explosion。

**Trait「Tinkerer」**：Turret Hit 小幅 Refund Skill CD，每秒设置最大
Refund。

------------------------------------------------------------------------

# 19. 🟡 ISFP --- 不要管我

**Fantasy：**"别烦我，我在自己的世界里挺好的。"

**Identity：** Personal Space / Escape / Art Zone

**Basic「画笔」**：🖌️ Short Melee Swing，Damage 11 + Paint Trail。

**Skill「不要管我」**：Move Speed Up + Reduced Visual Presence；下一击
Damage Boost；Cooldown 7s。Reduced Visual Presence 仅视觉，不是真隐身。

**Ultimate「这是我的世界」**：Art Zone；区域内 ISFP Move Speed Up +
Attack Range Up。表现：🎨 Paint Geometry。

**Trait「Personal Space」**：附近没有敌人时 Move Speed +10%。

------------------------------------------------------------------------

# 20. 🟡 ESTP --- 先冲了再说

**Fantasy：**"WOOOOOOOO！"

**Identity：** Melee / Dash / Collision / Momentum

**Basic「拳头」**：👊 Fast Melee Punch，Damage 11。

**Skill「WOOOOOO!」**：Directional Dash；碰撞敌人 Damage 14 + Strong
Knockback；Cooldown 6s。表现：💨 + WOOOOOO! + Dash Trail。

**Ultimate「再来！」**：Adrenaline Mode；Dash Cooldown
大幅减少，可连续撞人。表现：⚡🔥 WOO!

**Trait「Momentum」**：Dash 命中敌人 Refund 25% Dash Cooldown。

------------------------------------------------------------------------

# 21. 🟡 ESFP --- 全场看我

**Fantasy：**"所有人------看------我------！"

**Identity：** Performance / Sound / Area Presence

**Basic「音浪」**：🎤 Short Sound Wave，Damage 10。

**Skill「看我！」**：360° Sound Shockwave，Damage 8 + Medium
Push，Cooldown 6s。表现：Expanding Ring +"看我！"

**Ultimate「MY SHOW!」**：Spotlight 锁定自己，持续释放 Expanding Sound
Rings，每次 Damage + Knockback。表现：✨🎤✨ MY SHOW!

**Trait「Spotlight」**：单次攻击命中多个敌人时获得额外
Personality，设置单次最大 Bonus。

------------------------------------------------------------------------

# 22. Character Summary

  ------------------------------------------------------------------------------
  MBTI        Identity      Basic        Skill       Ultimate        Trait
  ----------- ------------- ------------ ----------- --------------- -----------
  INTJ        Planning      ♟️           Teleport    Prediction      Low HP CD
                            Projectile   Marker      Bombardment     

  INTP        Uncertainty   ❓           Random Buff Thinking Zone   Charged
                            Projectile                               Basic

  ENTJ        Command       👉 Attack    Push        Forced          Push Speed
                                                     Direction       

  ENTP        Debate        💬           Defense     Speech Barrage  Debuff
                            Projectile   Debuff                      Meter

  INFJ        Insight       👁️ Beam      Weakness    Mark Judgment   Mark
                                         Mark                        Extension

  INFP        Emotion       ♥️           Damage      Emotional Nuke  Low HP
                            Projectile   Storage                     Meter

  ENFJ        Protection    ✨ Wave      Push +      Encouragement   Crowd
                                         Shield                      Shield

  ENFP        Random        Random Emoji Random      Random Power    Variety
                                         Event                       Meter

  ISTJ        Consistency   📏           Same Target SOP Mode        Combo Meter
                            Projectile   Stack                       

  ISFJ        Defense       🛡️ Melee     Shield +    Shield Slam     Shield
                                         Counter                     Scaling

  ESTJ        Deadline      📋           Timed AoE   KPI Zone        CD Refund
                            Projectile                               

  ESFJ        Social        💌           Pull        Group Photo     Crowd Meter
                            Projectile                               

  ISTP        Build         🔧           Turret      Mega Turret     Turret
                            Projectile                               Refund

  ISFP        Space         🖌️ Melee     Escape Buff Art Zone        Alone Speed

  ESTP        Momentum      👊 Melee     Dash        Dash Frenzy     Dash Refund

  ESFP        Show          🎤 Wave      Sound Push  MY SHOW         Multi-hit
                                                                     Meter
  ------------------------------------------------------------------------------

# 23. Aim Mode / Mobile

所有技能定义：

``` ts
type AimMode = "none" | "direction" | "position";
```

Desktop 与 Mobile 共用技能逻辑，不设计 Mouse-only 技能。

建议：

``` ts
interface SkillDefinition {
  id: string;
  name: string;
  cooldown: number;
  aimMode: "none" | "direction" | "position";
  primitive: string;
  params: Record<string, unknown>;
  presentation?: {
    symbol?: string;
    memeText?: string[];
    vfx?: string[];
  };
}
```

# 24. Character Definition

``` ts
interface CharacterDefinition {
  mbti: MBTIType;
  nickname: string;
  maxHp: number;
  moveSpeed: number;
  basicAttack: SkillDefinition;
  skill: SkillDefinition;
  ultimate: SkillDefinition;
  trait: TraitDefinition;
  presentation: CharacterPresentation;
}
```

# 25. Shared Presentation Systems

统一建立：

-   `CombatSymbol / EmojiRenderer`
-   `CombatText / MemeText`
-   Geometry VFX：ImpactRing / Shockwave / AimLine / Arrow /
    WarningCircle / ExplosionCircle / TargetMarker / PredictionLine /
    ZoneOutline / Flash / Trail

不要为每个角色复制实现。

火柴人动画也体现人格：INTJ Calm；ENTP Lean Forward/Arguing；INFP
Exaggerated Hurt；ESTJ Commanding；ESTP Always Forward；ESFP
Performing。优先程序化 Body Rotation / Limb Offset / Scale / Squash /
Stretch。

# 26. Server Authority

Server 决定：

`Hit / Damage / Knockback / Cooldown / Buff / Debuff / Mark / Shield / Personality / Ultimate / Trait / Death / Gameplay Random`

尤其 ENFP Random Effect 必须 Server 决定。

Client 可以随机纯 Cosmetic Variant，例如 ENFP Basic 的
⭐/🌈/💡/✨，前提是 Gameplay 完全一致。

# 27. Multiplayer Scaling

当前目标 4--8 Players，未来 16。

所有 AoE / Crowd Scaling / Nearby Bonus / Multi-hit Bonus 必须设置
Cap，避免人数翻倍造成指数收益。

# 28. Vertical Slice

当前只实现：

``` text
ENTP
INFP
ESTJ
ESTP
```

分别验证：

-   ENTP：Projectile / Debuff / Typography / Radial Attack
-   INFP：Damage Reduction / Damage Accumulation / Low HP / AoE Burst
-   ESTJ：Timed AoE / Zone / Slow / Repeated Damage
-   ESTP：Melee / Dash / Collision / Knockback / Cooldown Refund

顺序：

`Framework → ENTP → INFP → ESTJ → ESTP → 2P Test → 4P Test → PC+Mobile Test → STOP`

# 29. 后续角色批次建议

第二批：`INTJ / ENFP / ISTP / ESFJ`，验证 Teleport / Random / Turret /
Pull。

第三批：`INTP / ENTJ / INFJ / ENFJ`。

第四批：`ISTJ / ISFJ / ISFP / ESFP`。

根据 Playtest 可调整。

# 30. Character Success Criteria

-   1 秒视觉辨识
-   Basic 与人格有关
-   Skill = Meme Gameplay
-   Ultimate = 人格梗高潮
-   Trait 强化玩法人格
-   与其他角色明显不同
-   低解释成本
-   至少一个节目效果技能
-   Desktop / Mobile 可操作
-   Server Authoritative 可实现
-   不依赖昂贵 Sprite

Playtest 问：

1.  不看名字，你觉得是什么性格？
2.  哪个技能最好笑？
3.  哪个最容易理解？
4.  有没有主动想制造节目效果？
5.  愿不愿意换另一个 MBTI 看看能力？

# 31. Balance Philosophy

Prototype 优先：`Fun / Readable / Distinct / Memorable`。

先只修复：Obviously Broken / Unavoidable Kill / Infinite Loop /
Permanent Control / Extreme Burst / Server Exploit。

# 32. Emoji Compatibility / Performance

Apple / Windows / Android Emoji 外观差异 Prototype 接受。维护
`GOOD / ACCEPTABLE / BAD` 兼容记录，仅 BAD 进入替代方案。

8 人压力测试关注：Emoji Text Object / Meme Text / Projectile / Zone /
Turret / VFX。及时 Destroy；必要时 Object Pool；Ultimate Text Count
Cap；VFX Lifetime Cap；观察 FPS / Object Count / Memory / Network
Traffic。

# 33. 禁止事项

不要：

-   一次实现 16 人
-   创建 16 套 Combat System
-   全部逻辑塞进 Character Class
-   Client 决定 Damage/Trait/Gameplay Random
-   为平衡削弱人格梗
-   Passive Tree / Equipment / Class Counter
-   Same-color Synergy
-   每个攻击物立即画 Sprite
-   每角色复制 Emoji/Meme Renderer
-   用 VFX Hitbox 作为 Gameplay Collision
-   为 16 人模式提前重构 Network Architecture

Deferred：Same Color Synergy / Team / Equipment / Progression / Unlock /
Ranked / MMR / Assist / 16P Balance / Mastery。

# 34. Codex Immediate Scope

当前只执行：

`Character Framework + ENTP + INFP + ESTJ + ESTP`

同时接入：

`Emoji Presentation + Meme Typography + Geometry VFX + Desktop Input + Mobile Input Adapter + Server Authoritative Combat`

完成后必须报告：

1.  Modified Files
2.  Character Framework
3.  Reusable Primitives
4.  Four Character Implementations
5.  Presentation Architecture
6.  Emoji Renderer
7.  Meme Text System
8.  Geometry VFX
9.  Network Protocol Changes
10. Server Authority Changes
11. Mobile Compatibility
12. Balance Values
13. Test Instructions
14. Known Issues
15. Remaining 12 Character Plan

然后 `STOP`。

# 35. 最终判断标准

每实现一个角色都问：

> **如果把 MBTI
> 名字遮住，只看这个人的行为，玩家还能不能猜到他大概是什么性格？**

如果不能，它仍然只是：

`Combat Class + MBTI Skin`

而不是本项目需要的：

`Personality = Gameplay`
