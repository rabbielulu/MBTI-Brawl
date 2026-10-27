# MBTI 大乱斗 --- Multiplayer Prototype Brief

> Version: Prototype v0.1\
> Target: Desktop Web / HTML5\
> Multiplayer: LAN, up to 8 players\
> View: Top-down landscape arena\
> Goal: Build the smallest playable multiplayer prototype that validates
> whether MBTI personalities, distinct combat styles, and chaotic arena
> combat are fun.

------------------------------------------------------------------------

## 1. Product Goal

《MBTI 大乱斗》是一款以 MBTI 16
型人格为角色基础的搞笑、抽象、轻量竞技场游戏。

Prototype v0.1 不追求完整内容、平衡性或正式美术品质。第一阶段只验证：

1.  8 名玩家能否在局域网中稳定进入同一场游戏。
2.  WASD 移动 + 鼠标瞄准 + 左键普攻的基础操作是否顺畅。
3.  不同 MBTI 是否能通过武器、人格技能和大招形成明显差异。
4.  人格槽 → 满槽 → 释放大招的循环是否有爽感。
5.  淘汰制多人乱斗是否足够有趣。
6.  玩家能否快速理解自己的 MBTI 角色能力。
7.  火柴人 + MBTI 头像 + 简单矢量/像素特效是否足以支撑玩法验证。

### Prototype 明确不做

-   同颜色人格协同
-   装备系统
-   等级/成长系统
-   局外养成
-   匹配系统
-   公网服务器
-   账号系统
-   AI Bot（非必要）
-   复杂地图机关
-   皮肤
-   商业化
-   完整音频系统
-   正式角色美术
-   手机端适配

原则：**优先完成一局完整、稳定、可重复游玩的 8 人 LAN 对战。**

------------------------------------------------------------------------

# 2. Target Platform

## 2.1 Platform

-   Desktop Browser
-   HTML5
-   Landscape only
-   Keyboard + Mouse
-   推荐基准分辨率：1920 × 1080
-   最低测试分辨率：1280 × 720

## 2.2 Multiplayer

-   最多 8 名玩家
-   同一局域网
-   一台设备启动 Host / Server
-   其他玩家通过局域网 IP + Port 进入
-   Prototype 阶段不要求 NAT 穿透、公网大厅或账号登录

### 推荐技术方向

前端： - TypeScript - Phaser 3（推荐）或 PixiJS + 自建 gameplay layer

服务端： - Node.js - WebSocket - Socket.IO 或原生 ws

推荐 Prototype 结构：

``` text
Browser Client
    ↓ WebSocket
LAN Node.js Game Server
    ↓
Authoritative Game State
```

服务端负责权威状态： - 玩家加入/离开 - HP - 人格槽 - 攻击命中 -
技能命中 - 死亡 - 游戏胜负 - 大招释放

客户端负责： - 输入 - 本地移动表现 - 动画 - VFX - UI - 插值显示其他玩家

Prototype 优先稳定和开发速度，不需要过早优化复杂网络预测。

------------------------------------------------------------------------

# 3. Core User Flow

``` text
Launch
↓
Main Menu
↓
[进入游戏]
↓
MBTI Input
↓
Confirm
↓
Character Card Reveal
↓
Read Character Skill
↓
[进入战斗]
↓
Connect / Join LAN Match
↓
Arena
↓
Battle
↓
Players Eliminated
↓
Last Player Alive
↓
Result
↓
Return Main Menu / Play Again
```

------------------------------------------------------------------------

# 4. Main Menu

## 4.1 Layout

屏幕中央：

``` text
MBTI 大乱斗

[ 进入游戏 ]

[ 退出游戏 ]
```

### 进入游戏

点击后进入 MBTI 输入界面。

### 退出游戏

桌面封装环境可关闭程序。

纯 Browser 环境无法可靠关闭浏览器 Tab，因此 Prototype 中允许：

-   显示"可以关闭当前页面"
-   或返回空白结束页

不要为了实现 Browser Exit 增加额外复杂度。

------------------------------------------------------------------------

# 5. MBTI Selection

## 5.1 Input

标题：

**输入你的 MBTI**

输入框：

``` text
[ ENFP ]
```

按钮：

``` text
[ 确认 ]
```

### Validation

只允许以下 16 个值：

``` text
INTJ INTP ENTJ ENTP
INFJ INFP ENFJ ENFP
ISTJ ISFJ ESTJ ESFJ
ISTP ISFP ESTP ESFP
```

输入自动转换为 Uppercase。

非法输入：

> 找不到这个人格，请输入正确的 MBTI。

Prototype 暂时不制作 MBTI 测试。

------------------------------------------------------------------------

# 6. Character Card Reveal

确认 MBTI 后，展示该人格角色卡。

卡牌内容：

``` text
[ MBTI Avatar ]

ENTP
辩论家

武器
话筒 / 嘴炮

攻击类型
远程

人格技能
你说得不对
向目标发射“Actually”，命中后造成伤害并施加破防。

大招
我不是针对谁
对周围敌人造成大范围精神攻击。

[ 进入战斗 ]
```

### Purpose

玩家必须在进入战斗前理解：

-   我是谁
-   我的武器是什么
-   我是近战还是远程
-   左键攻击是什么
-   右键人格技能是什么
-   空格大招是什么

------------------------------------------------------------------------

# 7. Arena

## 7.1 Camera

-   Top-down
-   Landscape
-   Camera follows local player
-   大场景可以超过一屏
-   Camera 不旋转
-   建议允许少量 smoothing

## 7.2 Prototype Map

第一张地图只需要：

-   大型矩形/近方形竞技场
-   简单地面
-   边界墙
-   少量不可穿越障碍物
-   8 个出生点

不要加入复杂机关。

地图尺寸需要保证：

-   8 人不会出生后立刻全部挤在一起
-   玩家约 5--10 秒可以遇到其他玩家
-   不允许无限逃跑

建议第一轮通过实际 playtest 调整尺寸。

------------------------------------------------------------------------

# 8. Controls

  Input            Action
  ---------------- -------------------
  W                Up
  A                Left
  S                Down
  D                Right
  Mouse Position   Aim
  Left Mouse       Basic Attack
  Right Mouse      Personality Skill
  Space            Ultimate
  ESC              Settings

## Aim

鼠标世界坐标决定角色朝向。

``` text
Player → Mouse
```

角色身体/武器朝向鼠标方向。

左键不需要点击敌人。

**点击任意位置即可朝鼠标方向攻击。**

------------------------------------------------------------------------

# 9. Character Visual

Prototype 所有角色统一使用：

**Stickman Body + MBTI Head**

结构：

``` text
      [MBTI Head]
           O
          /|\
          / \
```

## 9.1 Head

使用对应 MBTI 人格头像的头部区域。

注意：

正式产品发布前必须重新确认第三方 MBTI/16Personalities
角色形象、商标及美术素材的授权问题。Prototype
可优先使用自制占位头像，避免 Agent 直接把网络图片当作可发布资产。

推荐开发结构：

``` text
Character
├── HeadSprite
├── Body
├── Weapon
├── Shadow
└── VFX
```

这样未来可以直接替换正式角色资产。

------------------------------------------------------------------------

# 10. Animation

每个角色最少需要：

``` text
Idle
Walk
BasicAttack
Skill
Ultimate
Hit
Death
```

Prototype 可使用程序动画。

例如：

### Walk

-   腿前后摆动
-   手臂反向摆动
-   身体轻微上下 bounce

### Attack

-   手臂快速向攻击方向伸出
-   武器产生 recoil

### Skill

-   夸张 anticipation
-   0.1--0.3 秒动作准备
-   释放 VFX

### Ultimate

必须比普通技能明显：

-   Character anticipation
-   Screen shake
-   Larger VFX
-   Character flash
-   Ultimate name

------------------------------------------------------------------------

# 11. Combat Model

每个 Character 使用统一基础数据结构：

``` ts
interface CharacterStats {
  maxHP: number;
  moveSpeed: number;

  attackType: "melee" | "ranged";
  attackDamage: number;
  attackCooldown: number;
  attackRange: number;
  projectileSpeed?: number;

  skillCooldown: number;

  personalityMax: number;
  ultimateCost: number;
}
```

第一版建议所有角色：

``` text
HP = 100
Personality = 0 / 100
Ultimate Cost = 100
```

不同人格暂时主要通过：

-   Range
-   Attack Speed
-   Damage
-   Weapon
-   Skill
-   Ultimate

产生差异。

不要第一版就给每个人格设计大量被动属性。

------------------------------------------------------------------------

# 12. Basic Attack

## Ranged

左键：

``` text
Mouse Direction
↓
Attack Animation
↓
Spawn Projectile
↓
Projectile Collision
↓
Damage
```

Projectile 使用简单形状即可：

-   Circle
-   Rectangle
-   Line
-   Pixel projectile

## Melee

左键：

``` text
Mouse Direction
↓
Attack Animation
↓
Generate Arc / Rectangle Hitbox
↓
Hit Enemy
↓
Damage
```

------------------------------------------------------------------------

# 13. Personality Meter

右下角：

``` text
Avatar
HP ███████░░
人格 █████░░░
```

## Prototype Rule

第一版先统一人格槽获取方式：

**造成伤害 → 获得人格能量**

推荐：

``` text
1 damage = 1 personality point
```

或者使用倍率：

``` text
PersonalityGain = Damage × GainMultiplier
```

人格槽：

``` text
0 → 100
```

满：

``` text
PERSONALITY READY
```

此时空格释放 Ultimate。

释放后：

``` text
100 → 0
```

注意：

正式版本以后再把"符合人格行为获得能量"加入系统。

Prototype 不做，以免干扰基础战斗验证。

------------------------------------------------------------------------

# 14. Death

HP：

``` text
100 → 0
```

触发：

``` text
Death Animation
↓
Disable Input
↓
Character Dead
↓
Top-left Avatar Grey
```

## Prototype v0.1

采用：

**单局淘汰制，不复活。**

原因：

-   最容易实现
-   最容易理解
-   能快速验证大乱斗
-   与左上角存活头像 UI 匹配

死亡玩家可以继续观看。

Camera：

``` text
Dead
↓
Spectator
↓
Follow Living Player
```

点击鼠标可以切换观战目标，若实现成本高，可第一版只自动跟随一名存活玩家。

------------------------------------------------------------------------

# 15. Win Condition

最后一个存活玩家：

``` text
WINNER
```

显示：

``` text
🏆 ENTP

辩到最后的人
```

Buttons：

``` text
[ 再来一局 ]

[ 返回主界面 ]
```

Prototype 不需要排行榜。

------------------------------------------------------------------------

# 16. HUD

## Top Left --- Players

最多显示 8 个头像。

``` text
🙂 🙂 🙂 🙂 🙂 🙂 🙂 🙂
```

死亡：

``` text
🙂 🙂 ☠️ 🙂 ☠️ 🙂 🙂 🙂
```

实际表现：

-   Alive = Normal
-   Dead = Grey + reduced opacity

不要显示复杂数据。

------------------------------------------------------------------------

## Top Right --- Settings

``` text
⚙
```

点击：

``` text
┌──────────────────┐
│    退出本局？     │
│                  │
│ [取消]   [退出]   │
└──────────────────┘
```

退出：

``` text
Disconnect
↓
Main Menu
```

ESC 同样打开该 Popup。

------------------------------------------------------------------------

## Bottom Left --- Character Card

常驻小卡：

``` text
┌──────────────┐
│ ENTP         │
│ 辩论家        │
│              │
│ RMB 你说得不对 │
│ SPACE 大招    │
└──────────────┘
```

点击：

屏幕中央打开完整角色卡。

Battle 不暂停。

再次点击卡牌 / Close：

关闭。

多人游戏不允许打开卡牌时暂停 Server。

------------------------------------------------------------------------

## Bottom Right --- Player Status

``` text
       [Avatar]

HP
████████░░

PERSONALITY
██████░░░░
```

人格槽满：

``` text
SPACE
ULTIMATE READY!
```

需要有明显闪烁/脉冲表现。

------------------------------------------------------------------------

# 17. 16 MBTI Prototype Combat Kit

第一版的目标不是完美平衡，而是让玩家明显感觉：

> "这个技能很像这个 MBTI。"

------------------------------------------------------------------------

## 🟣 Analysts

### INTJ --- Architect

Weapon: Chess Piece Projectile\
Type: Ranged

Basic: 发射棋子。

Skill --- **早有预料**
在当前位置放置一个标记。再次右键或数秒后返回标记位置，并在离开位置产生爆炸。

Ultimate --- **一切都在计划中**
短暂显示附近敌人的预测移动方向，随后对多个预测位置进行范围轰炸。

------------------------------------------------------------------------

### INTP --- Logician

Weapon: Question Mark\
Type: Ranged

Basic: 发射缓慢的问号弹。

Skill --- **等一下，我想想**
短暂停止移动进行思考，完成后随机获得攻击、速度、护盾之一。

Ultimate --- **无限思考**
生成大型思维混乱区域。区域内敌人的移动方向短暂发生扰动。

------------------------------------------------------------------------

### ENTJ --- Commander

Weapon: Pointer / Command Beam\
Type: Ranged

Basic: 发射直线指令攻击。

Skill --- **你，过去！** 释放强力方向冲击，将命中的敌人推向指定方向。

Ultimate --- **都听我的！**
生成巨大方向箭头，将范围内所有敌人持续向指定方向推动并造成伤害。

------------------------------------------------------------------------

### ENTP --- Debater

Weapon: Microphone / Speech Bubble\
Type: Ranged

Basic: 发射文字弹。

Skill --- **你说得不对** 发射 "Actually
☝️"，命中造成伤害并短暂降低目标防御。

Ultimate --- **我不是针对谁**
以自己为中心释放巨大语言冲击波，对范围内敌人造成高额伤害和击退。

------------------------------------------------------------------------

# 🟢 Diplomats

### INFJ --- Advocate

Weapon: Eye / Psychic Beam\
Type: Ranged

Basic: 精神射线。

Skill --- **我懂你**
锁定目标，短暂标记其弱点。随后对该目标造成额外伤害。

Ultimate --- **灵魂审判** 对附近所有已标记/可见敌人造成精神攻击。

------------------------------------------------------------------------

### INFP --- Mediator

Weapon: Heart Projectile\
Type: Ranged

Basic: 发射小心心。

Skill --- **没事，我没事**
短时间获得减伤，同时将承受伤害转换为强化效果。

Ultimate --- **我忍你很久了** 以自身为中心产生巨大情绪爆炸。当前 HP
越低，伤害越高。

------------------------------------------------------------------------

### ENFJ --- Protagonist

Weapon: Energy Wave\
Type: Ranged

Basic: 发射鼓励能量。

Skill --- **你们不要打了**
释放圆形冲击，将附近敌人弹开，并给自己短暂护盾。

Ultimate --- **相信自己！** 获得强化状态，并产生连续范围能量波。

Prototype 因暂不做队伍系统，技能先全部作用于自己。

------------------------------------------------------------------------

### ENFP --- Campaigner

Weapon: Random Object\
Type: Ranged

Basic: 随机视觉的小型弹丸，伤害一致。

Skill --- **我有一个想法！** 随机产生一种效果： - Bomb - Dash - Heal -
Speed - Chicken projectile

Ultimate --- **新爱好！** 随机释放一个强化版效果。

------------------------------------------------------------------------

# 🔵 Sentinels

### ISTJ --- Logistician

Weapon: Ruler\
Type: Ranged

Basic: 发射直线标尺。

Skill --- **按流程来** 连续命中同一目标会增加伤害；切换目标后重置。

Ultimate --- **标准作业流程** 短时间显著提高攻击速度和弹速。

------------------------------------------------------------------------

### ISFJ --- Defender

Weapon: Shield\
Type: Melee

Basic: 盾击。

Skill --- **别碰我** 获得护盾。护盾期间被攻击会对攻击者产生反击伤害。

Ultimate --- **你居然敢欺负我** 释放大范围盾牌冲击，高额击退周围敌人。

------------------------------------------------------------------------

### ESTJ --- Executive

Weapon: Clipboard\
Type: Ranged

Basic: 发射文件。

Skill --- **Deadline**
指定区域出现倒计时。倒计时结束仍在区域内的敌人受到伤害和减速。

Ultimate --- **绩效评估** 大范围生成 KPI 区域，短暂延迟后造成多段伤害。

------------------------------------------------------------------------

### ESFJ --- Consul

Weapon: Heart / Invitation\
Type: Ranged

Basic: 发射邀请函。

Skill --- **大家一起嘛** 把附近敌人向自己轻微拉近。

Ultimate --- **大合照**
把范围内敌人向中心吸引，短暂延迟后闪光爆炸并造成伤害。

------------------------------------------------------------------------

# 🟡 Explorers

### ISTP --- Virtuoso

Weapon: Wrench\
Type: Ranged

Basic: 投掷扳手。

Skill --- **让我看看** 快速部署一个临时小炮塔。

Ultimate --- **应该能用**
生成大型临时机械炮塔，持续自动攻击，时间结束后爆炸。

------------------------------------------------------------------------

### ISFP --- Adventurer

Weapon: Paint Brush\
Type: Melee / Short Range

Basic: 画笔挥击。

Skill --- **不要管我** 短时间提高移动速度并降低存在感；下一次攻击强化。

Ultimate --- **这是我的世界**
生成艺术领域，领域内自身移动速度和攻击范围提升。

------------------------------------------------------------------------

### ESTP --- Entrepreneur

Weapon: Fist\
Type: Melee

Basic: 拳击。

Skill --- **WOOOOOO！** 朝鼠标方向高速冲锋，撞到敌人造成伤害和强击退。

Ultimate --- **先冲了再说** 连续获得多次高速冲锋，期间降低技能冷却。

------------------------------------------------------------------------

### ESFP --- Entertainer

Weapon: Microphone / Sound Wave\
Type: Short-range Ranged

Basic: 音波。

Skill --- **看我！** 释放环形音波，伤害并击退附近敌人。

Ultimate --- **MY SHOW!** 进入短暂演出状态，连续产生多轮扩散音波。

------------------------------------------------------------------------

# 18. Combat VFX Style

Prototype 允许：

## Vector

优先使用：

-   Circle
-   Rectangle
-   Line
-   Arc
-   Polygon
-   Text
-   Emoji-like icon

或者：

## Pixel

使用低分辨率 Pixel FX。

不要混入高成本角色美术。

### Recommended Style

我更推荐 Prototype：

**Stickman + Flat Vector + Typography FX**

因为人格技能天然适合文字表现：

``` text
ACTUALLY!
DEADLINE!
WOOOOOO!
???
!!!
NOPE
```

这些文字本身就可以成为攻击特效。

------------------------------------------------------------------------

# 19. Feedback

所有攻击必须至少具备：

``` text
Animation
+ Hit Flash
+ Hit VFX
+ Damage Number
+ Knockback where applicable
```

重要攻击增加：

``` text
Screen Shake
```

Ultimate：

``` text
Ultimate Name
+ Anticipation
+ Large VFX
+ Screen Shake
```

不要只改变 HP 数值。

------------------------------------------------------------------------

# 20. Networking Rules

Server authoritative for:

``` text
Player ID
MBTI
Position (authoritative correction)
HP
Personality
Alive
Attack
Skill
Ultimate
Damage
Winner
```

Client sends:

``` text
MoveInput
AimDirection
BasicAttackInput
SkillInput
UltimateInput
```

不要让客户端直接发送：

``` text
"I hit player X for 50 damage"
```

应该发送攻击输入，由 Server 判断是否合法。

------------------------------------------------------------------------

# 21. Player State

``` ts
interface PlayerState {
  id: string;
  nickname?: string;

  mbti: MBTIType;

  x: number;
  y: number;
  aimAngle: number;

  hp: number;
  personality: number;

  alive: boolean;

  attackCooldown: number;
  skillCooldown: number;
  ultimateReady: boolean;
}
```

------------------------------------------------------------------------

# 22. Game State

``` ts
type GamePhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "FINISHED";
```

Server：

``` ts
interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  winnerId?: string;
}
```

------------------------------------------------------------------------

# 23. LAN Lobby

虽然初始 UX Brief 没有明确 Lobby，但多人同步必须有等待阶段。

Character Card 后进入：

``` text
等待其他人格加入...

3 / 8

ENTP
INFP
ESTP

[准备]
```

Host：

``` text
[开始游戏]
```

Prototype 规则：

-   最少 2 人开始
-   最多 8 人
-   Host 手动 Start
-   Start 后进入 3 秒倒计时

``` text
3
2
1
FIGHT!
```

若为了最快验证，也可以提供：

``` text
?server=192.168.1.10:3000
```

方式直接连接指定 LAN Server。

------------------------------------------------------------------------

# 24. Scene Structure

``` text
Boot
│
├── MainMenu
│
├── MBTIInput
│
├── CharacterReveal
│
├── Lobby
│
├── Arena
│   ├── World
│   ├── Characters
│   ├── Projectiles
│   ├── VFX
│   └── HUD
│
└── Result
```

------------------------------------------------------------------------

# 25. Suggested Code Architecture

``` text
src/
├── client/
│   ├── scenes/
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── Projectile.ts
│   │   └── CharacterController.ts
│   ├── combat/
│   │   ├── AttackSystem.ts
│   │   ├── SkillSystem.ts
│   │   └── UltimateSystem.ts
│   ├── characters/
│   │   ├── CharacterDefinition.ts
│   │   └── definitions/
│   ├── ui/
│   │   ├── HUD.ts
│   │   ├── CharacterCard.ts
│   │   ├── PlayerList.ts
│   │   └── SettingsPopup.ts
│   ├── network/
│   └── assets/
│
├── server/
│   ├── GameServer.ts
│   ├── Room.ts
│   ├── CombatResolver.ts
│   └── PlayerState.ts
│
└── shared/
    ├── CharacterData.ts
    ├── NetworkMessages.ts
    └── Constants.ts
```

------------------------------------------------------------------------

# 26. Character Data Must Be Data-Driven

不要把 16 个角色基础数据硬编码进 Player Controller。

推荐：

``` ts
const characters = {
  ENTP: {
    name: "辩论家",
    weapon: "SpeechBubble",
    attackType: "ranged",
    attackDamage: 10,
    attackCooldown: 0.45,
    skillId: "ENTP_ACTUALLY",
    ultimateId: "ENTP_EVERYONE"
  }
};
```

Character Card 与 Combat 必须读取同一份 Character Definition。

避免：

``` text
UI 写一份技能说明
Combat 再写一份数据
```

导致两边不同步。

------------------------------------------------------------------------

# 27. Implementation Priority

## P0 --- Single Player Combat Sandbox

先不要做网络。

完成：

-   Arena
-   Stickman
-   WASD
-   Mouse aim
-   Basic attack
-   HP
-   Hit
-   Death
-   Personality meter
-   Ultimate

验收：

**一个角色可以在 Arena 中完整移动和战斗。**

------------------------------------------------------------------------

## P1 --- Multiplayer Foundation

完成：

-   Node server
-   LAN connection
-   Player join
-   2--8 players
-   Position sync
-   Aim sync
-   Attack sync
-   HP sync
-   Death sync

验收：

**两台电脑可以互相攻击并看到一致结果。**

然后测试 4 人、8 人。

------------------------------------------------------------------------

## P2 --- Full UX Flow

完成：

``` text
Main Menu
→ MBTI Input
→ Character Card
→ Lobby
→ Arena
→ Result
```

以及：

-   HUD
-   Settings
-   Spectator

------------------------------------------------------------------------

## P3 --- 16 Personalities

不要一次实现 16 个。

第一轮只实现 4 个代表：

``` text
ENTP — ranged / debuff
INFP — ranged / damage comeback
ESTJ — area control
ESTP — melee / dash
```

这四个能够验证：

-   Projectile
-   Melee
-   Dash
-   Area Skill
-   Buff/Debuff
-   AoE
-   Ultimate

四个跑通后，再基于已有 Skill Components 扩展到 16 个。

------------------------------------------------------------------------

## P4 --- Juice

最后加入：

-   Better animation
-   Screen shake
-   Damage number
-   Text FX
-   Better ultimate feedback
-   Sound placeholders

------------------------------------------------------------------------

# 28. Agent Development Rules

Agent 开发过程中必须遵守：

### Rule 1

**Prototype First.**

任何无法直接帮助验证核心战斗的功能都延后。

### Rule 2

**Reusable Skill Components.**

优先实现：

``` text
Projectile
MeleeHitbox
Dash
AoE
Pull
Push
Shield
Buff
Debuff
Turret
Teleport
```

16 人格技能应该组合这些组件，而不是写 16 套完全独立系统。

### Rule 3

**Gameplay Data Driven.**

数值与角色配置放在独立 Character Definition。

### Rule 4

**Server Authoritative Combat.**

客户端不能决定伤害结果。

### Rule 5

**Placeholder Art First.**

没有正式素材时使用：

``` text
Circle
Line
Rectangle
Text
Emoji
Simple Vector
```

不要阻塞开发。

### Rule 6

**One Playable Build at Every Milestone.**

每个阶段结束必须保持项目可以运行。

不要连续开发大量未整合功能。

### Rule 7

如果设计文档与实现复杂度冲突：

优先选择：

**更简单但可以 Playtest 的实现。**

并在 TODO 中记录简化项。

------------------------------------------------------------------------

# 29. First Playtest Questions

第一轮测试不要重点问平衡。

观察：

### Control

-   玩家是否立即理解 WASD？
-   鼠标瞄准是否自然？
-   左键攻击是否有反馈？
-   玩家会不会忘记右键技能？
-   玩家知道什么时候可以放大招吗？

### Combat

-   玩家是否能看清谁在攻击自己？
-   8 人战斗是否过于混乱？
-   近战是否明显吃亏？
-   是否存在一直逃跑的问题？
-   击退是否有趣？

### MBTI Fantasy

最重要的问题：

> "你觉得这个技能像你的 MBTI 吗？"

以及：

> "看到其他人格的技能，你能不能猜到他是什么人格？"

如果答案是 Yes，说明方向成立。

### Fun

观察玩家是否主动出现：

-   追杀某个人
-   联手欺负某人格
-   因技能效果笑出来
-   主动讨论"这个技能好像 XX 人格"
-   打完主动要求再来一局

这些行为比 Prototype 阶段的胜率数据更重要。

------------------------------------------------------------------------

# 30. Prototype Success Criteria

Prototype v0.1 完成定义：

-   [ ] Browser 可运行
-   [ ] Landscape
-   [ ] LAN Server 可启动
-   [ ] 2--8 人可以进入同一房间
-   [ ] 玩家可以输入 16 种合法 MBTI
-   [ ] 正确获得对应 Character Card
-   [ ] WASD 移动
-   [ ] Mouse aim
-   [ ] LMB 普攻
-   [ ] RMB 人格技能
-   [ ] Space 大招
-   [ ] HP 正确同步
-   [ ] Personality Meter 正确同步
-   [ ] 人格槽满才能释放大招
-   [ ] 死亡后头像变灰
-   [ ] 死亡玩家无法继续攻击
-   [ ] 最后一名存活玩家获胜
-   [ ] 可以完成 Result → Replay/Main Menu
-   [ ] 至少 4 个 MBTI 拥有明显不同的完整技能组
-   [ ] 8 人局域网测试无严重状态不同步
-   [ ] Character Card 可以在战斗中展开查看
-   [ ] Settings 可以退出至 Main Menu

------------------------------------------------------------------------

# 31. Recommended First Vertical Slice

不要直接做 16 人格。

Agent 第一目标：

## "4 Personalities / 4 Players / 1 Arena"

角色：

**ENTP**

验证远程攻击、Projectile、Debuff。

**INFP**

验证受伤状态、低血量爆发、AoE。

**ESTJ**

验证地面区域技能、Delay Damage。

**ESTP**

验证近战、Dash、Collision、Knockback。

完成这四个角色之后，核心 Combat Framework
已经覆盖绝大多数后续人格所需要的能力。

再扩展：

``` text
4 → 8 → 16
```

而不是：

``` text
同时开发 16 个角色
```

------------------------------------------------------------------------

# 32. Prototype Core Statement

开发过程中始终使用下面这句话判断功能是否应该现在实现：

> **"8 个顶着 MBTI
> 脑袋的火柴人在一个场地里互殴，每个人都能通过荒诞的攻击方式，让其他玩家一眼认出自己的性格。"**

如果一个功能不能帮助验证这件事，就暂时不做。

------------------------------------------------------------------------

# 33. Next Agent Task

Agent 在读取本文档后，第一阶段只执行：

``` text
1. 初始化 HTML5 / TypeScript 项目
2. 创建 Phaser Arena
3. 创建 Stickman Character
4. 实现 WASD movement
5. 实现 mouse aim
6. 实现 LMB ranged basic attack
7. 创建 dummy target
8. 实现 HP / damage / death
9. 实现 Personality Meter
10. 实现 Space Ultimate placeholder
```

完成以上内容并确认单机 Combat Sandbox 可运行后，再开始 Multiplayer。

**不要在单机 Combat Sandbox 跑通前实现 16 人格。**
