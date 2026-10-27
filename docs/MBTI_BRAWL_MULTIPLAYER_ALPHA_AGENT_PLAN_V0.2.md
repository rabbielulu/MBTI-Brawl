# MBTI 大乱斗 --- Multiplayer Alpha Agent Development Plan

> Version: Multiplayer Alpha v0.2 → v0.6\
> Stack: Phaser 3 + TypeScript + Vite + Node.js + Socket.IO\
> Current Status: Two-browser movement + aim sync validated\
> Target: 2--8 player LAN / Internet multiplayer battle

------------------------------------------------------------------------

# 0. 当前状态

已经验证：

-   两个 Browser Client 可以连接同一个 Server
-   两名玩家拥有独立 Player ID
-   WASD 移动实时同步
-   Mouse Aim 实时同步
-   Local / Remote Player 区分正常
-   当前 Phaser 操控手感基本保留
-   Node.js + Socket.IO Multiplayer Foundation 已成立

下一阶段目标从"联网验证"升级为：

> **完整 Server Authoritative Multiplayer Combat Loop**

最终 Alpha 流程：

``` text
Main Menu
→ Multiplayer
→ Create / Join Room
→ Lobby
→ Select MBTI
→ Ready
→ Countdown
→ Battle
→ Death
→ Spectate
→ Last Player Alive
→ Result
→ Rematch / Lobby
```

最终支持：

-   2--8 Players
-   Basic Attack
-   Damage / HP
-   Personality Meter
-   Personality Skill
-   Ultimate
-   Knockback
-   Death
-   Winner
-   Lobby / Ready
-   Spectator
-   Disconnect Recovery
-   Multiple Rooms
-   LAN
-   Internet
-   Database（仅在确有持久化需求后）
-   Rollback / Lag Compensation（最后阶段）

------------------------------------------------------------------------

# 1. 开发原则

## 1.1 Server Authoritative

Server 最终决定：

``` text
Position
Velocity
Attack
Projectile
Hit
Damage
HP
Knockback
Cooldown
Personality Meter
Skill
Ultimate
Death
Alive State
Match Phase
Winner
```

Client 只发送：

``` text
Input Intent
```

禁止 Client 发送：

``` text
"I hit P2"
"P2 lost 20 HP"
"My ultimate is ready"
"I killed P3"
```

------------------------------------------------------------------------

## 1.2 Client Presentation

Client 负责：

``` text
Input
Local Prediction
Remote Interpolation
Animation
VFX
Audio
Camera
UI
Damage Numbers
Screen Shake
Hit Flash
Skill Telegraph
```

------------------------------------------------------------------------

## 1.3 Shared Definitions

Client / Server 必须共享：

``` text
shared/
├── characters/
│   ├── CharacterDefinition.ts
│   └── CharacterDatabase.ts
├── combat/
│   ├── CombatTypes.ts
│   └── SkillTypes.ts
├── network/
│   ├── NetworkProtocol.ts
│   └── NetworkEvents.ts
├── room/
│   └── RoomTypes.ts
└── GameConstants.ts
```

角色数值不得分别硬编码在 Client 和 Server。

------------------------------------------------------------------------

# 2. 总体开发顺序

严格按以下顺序：

``` text
v0.2 Combat Core
↓
v0.3 Skill / Ultimate
↓
v0.4 Match Flow + Lobby
↓
v0.45 Spectator + Disconnect Recovery
↓
v0.5 Multiple Rooms
↓
v0.55 Internet Deployment
↓
v0.6 Persistence / Database
↓
v0.7 Rollback / Lag Compensation Evaluation
```

每个版本必须可独立 Playtest。

禁止一次性实现全部功能后再测试。

------------------------------------------------------------------------

# 3. v0.2 --- Multiplayer Combat Core

目标：

> 两个玩家可以真正互相攻击、扣血、击退并死亡。

------------------------------------------------------------------------

## 3.1 Input Protocol 扩展

``` ts
interface PlayerInput {
  seq: number;

  moveX: number;
  moveY: number;
  aimAngle: number;

  basicAttackPressed: boolean;
  skillPressed: boolean;
  ultimatePressed: boolean;
}
```

注意：

Pressed 应代表输入事件，而不是持续每 Tick 重复触发。

Server 必须验证 Cooldown。

------------------------------------------------------------------------

# 4. Basic Attack

## 4.1 Ranged Attack

流程：

``` text
LMB
↓
Client immediate attack animation
↓
Send Attack Input
↓
Server validates
↓
Server creates projectile
↓
Projectile simulation
↓
Collision
↓
Damage
↓
Broadcast Combat Event
```

Projectile 权威状态属于 Server。

建议：

``` ts
interface ProjectileState {
  id: string;
  ownerId: string;

  x: number;
  y: number;

  velocityX: number;
  velocityY: number;

  radius: number;
  damage: number;

  lifetime: number;
}
```

Client 可以立即播放枪口 / 出手 VFX，但不能自行决定命中。

------------------------------------------------------------------------

## 4.2 Melee Attack

流程：

``` text
LMB
↓
Attack Intent
↓
Server validates cooldown
↓
Create temporary melee hitbox
↓
Server checks targets
↓
Damage + Knockback
```

Hitbox 推荐：

``` text
Arc
Circle
Rectangle
```

不要依赖 Client Phaser Physics 作为最终命中依据。

------------------------------------------------------------------------

# 5. Combat Event

建立统一事件：

``` ts
interface DamageEvent {
  attackerId: string;
  targetId: string;

  damage: number;

  hitX: number;
  hitY: number;

  knockbackX: number;
  knockbackY: number;
}
```

Client 收到后播放：

``` text
Hit Flash
Damage Number
Impact VFX
Sound
Camera Shake
```

视觉表现与 Damage Calculation 分离。

------------------------------------------------------------------------

# 6. HP

Server Player State 增加：

``` ts
hp: number;
maxHp: number;
alive: boolean;
```

Prototype 默认：

``` text
HP = 100
```

HP 只能由 Server 修改。

HUD：

``` text
HP
██████████
100 / 100
```

收到 Snapshot / Combat Event 后更新。

------------------------------------------------------------------------

# 7. Knockback

Server 计算 Knockback。

建议：

``` ts
velocity += knockbackVector
```

然后随时间衰减。

禁止只在 Client 播放"假的击退"。

需要保证：

``` text
P1 sees P2 knockback
P2 sees himself knockback
Server position matches
```

------------------------------------------------------------------------

# 8. Personality Meter

Server Player State：

``` ts
personality: number;
personalityMax: number;
```

Prototype：

``` text
0 → 100
```

第一版统一规则：

``` text
Deal Damage
→ Gain Personality
```

建议：

``` text
1 damage = 1 personality point
```

可通过 Config 调整。

达到 100：

``` text
Ultimate Ready
```

Client 只显示。

Ultimate 是否可释放由 Server 判断。

------------------------------------------------------------------------

# 9. v0.2 Death

当：

``` text
HP <= 0
```

Server：

``` text
alive = false
```

然后：

-   Disable movement
-   Disable attack
-   Disable skill
-   Disable ultimate
-   Broadcast death
-   Remove active combat collision
-   Keep player connection alive

Client：

``` text
Death Animation
↓
Character becomes inactive
↓
Enter Spectator later
```

v0.2 暂时可以显示：

``` text
YOU DIED
```

完整观战在后续实现。

------------------------------------------------------------------------

# 10. v0.2 Success Criteria

必须满足：

-   [ ] P1 可以攻击 P2
-   [ ] P2 可以攻击 P1
-   [ ] Server 决定 Hit
-   [ ] HP 双方一致
-   [ ] Damage 不重复
-   [ ] Cooldown 正确
-   [ ] Personality Meter 正确增加
-   [ ] Knockback 双方一致
-   [ ] HP 归零死亡
-   [ ] Dead Player 不能攻击
-   [ ] Dead Player 不能移动
-   [ ] 没有明显 Desync

完成后进行双浏览器 + 双设备测试。

------------------------------------------------------------------------

# 11. v0.3 --- Personality Skill + Ultimate

目标：

> 把现有单机人格能力迁入 Multiplayer Architecture。

不要一次实现 16 人格。

首先实现四个代表：

``` text
ENTP
INFP
ESTJ
ESTP
```

用于覆盖主要技能组件。

------------------------------------------------------------------------

# 12. Reusable Skill Components

先建立：

``` text
Projectile
MeleeHitbox
Dash
AoE
Push
Pull
Shield
Buff
Debuff
Turret
Teleport
```

16 人格技能应尽量由这些基础模块组合。

不要：

``` text
ENTPSkill.ts
INFPSystem.ts
ESTJCustomLogic.ts
...
```

全部写成互不兼容的特殊代码。

------------------------------------------------------------------------

# 13. Skill Request

RMB：

``` text
Client
↓
skillPressed
↓
Server
```

Server 检查：

``` text
alive?
cooldown ready?
valid state?
```

通过：

``` text
Execute Skill
↓
Broadcast SkillEvent
```

------------------------------------------------------------------------

# 14. Ultimate

Space：

``` text
Client
↓
ultimatePressed
↓
Server validates personality >= 100
↓
Execute Ultimate
↓
personality = 0
↓
Broadcast UltimateEvent
```

Client 表现：

``` text
Anticipation
Ultimate Name
Large VFX
Screen Shake
Sound
```

Ultimate 不允许 Client 自己扣 Personality Meter。

------------------------------------------------------------------------

# 15. Cooldowns

Server 保存：

``` ts
basicAttackCooldownRemaining
skillCooldownRemaining
ultimateState
```

Client 可以显示预测 CD UI。

Server 始终拥有最终决定权。

------------------------------------------------------------------------

# 16. v0.3 Success Criteria

-   [ ] 四个代表 MBTI 可选
-   [ ] Basic Attack 不同
-   [ ] RMB Skill 可用
-   [ ] Skill Server Authoritative
-   [ ] Personality = 100 才能 Ultimate
-   [ ] Ultimate 后归零
-   [ ] Buff / Debuff 状态同步
-   [ ] Dash 不产生严重位置错误
-   [ ] AoE 命中一致
-   [ ] Projectile 命中一致

完成后再扩展剩余 12 人格。

------------------------------------------------------------------------

# 17. v0.4 --- Match State

建立：

``` ts
type MatchPhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "FINISHED";
```

Server 控制 Phase。

------------------------------------------------------------------------

# 18. Lobby

流程：

``` text
Main Menu
↓
Multiplayer
↓
Create Room / Join Room
↓
Lobby
```

Lobby 显示：

``` text
MBTI 大乱斗

Room: ABCD

P1  ENTP   READY
P2  INFP   READY
P3  ESTP   NOT READY

3 / 8

[READY]
```

Host：

``` text
[START GAME]
```

------------------------------------------------------------------------

# 19. Ready System

每名玩家：

``` ts
ready: boolean;
```

点击：

``` text
READY
```

切换状态。

Start 条件：

``` text
Players >= 2
```

建议 Alpha：

Host 可以在所有玩家 Ready 后开始。

------------------------------------------------------------------------

# 20. MBTI Selection

Lobby 中选择 MBTI。

Server 保存：

``` ts
mbti: MBTIType;
```

允许多个玩家选择相同 MBTI。

Prototype 不做 Character Lock。

------------------------------------------------------------------------

# 21. Countdown

Host Start：

``` text
3
2
1
FIGHT!
```

Server 设置：

``` text
COUNTDOWN
```

Countdown 结束：

``` text
PLAYING
```

所有 Client 依据 Server Time 同步显示。

不要让每个 Client 自己独立 setTimeout 决定开局。

------------------------------------------------------------------------

# 22. Win Condition

Server 每次 Death 后：

``` text
count alive players
```

如果：

``` text
alivePlayers === 1
```

则：

``` text
FINISHED
```

记录：

``` text
winnerId
```

广播：

``` text
MatchFinished
```

------------------------------------------------------------------------

# 23. Result

显示：

``` text
🏆 ENTP
辩到最后的人

[再来一局]
[返回 Lobby]
```

Alpha 不需要复杂排名。

可以显示：

``` text
Kills
Damage
Survival Time
```

但属于 Optional。

------------------------------------------------------------------------

# 24. Rematch

推荐：

``` text
FINISHED
↓
Return Lobby
↓
ready = false
↓
players choose Ready again
```

不要直接自动开始下一局。

------------------------------------------------------------------------

# 25. v0.45 --- Spectator

死亡玩家：

``` text
alive = false
↓
Spectator Mode
```

Camera 自动跟随一个 Alive Player。

支持：

``` text
Mouse Left / Right
```

或：

``` text
A / D
```

切换观战目标。

HUD：

``` text
SPECTATING
ENTP
```

不允许死亡玩家发送 Gameplay Input。

------------------------------------------------------------------------

# 26. Disconnect Recovery

不要把 Disconnect 立即视为退出。

Server 保存：

``` ts
connectionState:
"connected"
"disconnected"
```

断线后：

``` text
10 seconds grace period
```

期间：

-   Character remains
-   Character stops moving
-   Cannot attack
-   Can still receive damage

玩家重新连接：

``` text
Reconnect Token
↓
Recover Player Session
↓
Send Full State Snapshot
↓
Resume Control
```

超过 Grace Period：

Lobby：

``` text
Remove Player
```

Battle：

推荐 Alpha：

``` text
Treat as eliminated / remove from active match
```

具体规则写入 Config。

------------------------------------------------------------------------

# 27. Session Token

Client 首次连接获得：

``` text
sessionToken
```

存入：

``` text
sessionStorage
```

重连时发送：

``` text
sessionToken
```

Server 根据 Token 找回 PlayerState。

Prototype 不需要用户账号。

------------------------------------------------------------------------

# 28. Full State Resync

Reconnect 后不要依赖缺失的旧 Event。

Server 直接发送：

``` text
FullGameState
```

包含：

``` text
Room
Match Phase
Map
Players
HP
Personality
Cooldowns
Projectiles
Active Effects
Winner
```

Client 重建当前画面。

------------------------------------------------------------------------

# 29. v0.5 --- Multiple Rooms

完成单房间稳定后再实现。

建立：

``` ts
RoomManager
```

结构：

``` text
GameServer
└── RoomManager
    ├── Room ABCD
    ├── Room EFGH
    └── Room JKLM
```

每个 Room 独立：

``` text
Players
Map
MatchPhase
GameLoop
Projectiles
Combat State
Winner
```

------------------------------------------------------------------------

# 30. Room Creation

Create Room：

Server 生成短 Room Code：

``` text
ABCD
```

Host 得到：

``` text
Room Code: ABCD
```

可复制给朋友。

------------------------------------------------------------------------

# 31. Join Room

玩家输入：

``` text
ABCD
```

Server 验证：

``` text
Room exists?
Room full?
Match already playing?
```

Alpha 默认：

正在 PLAYING 的房间不允许新玩家加入战斗。

可允许进入 Spectator，但属于 Optional。

------------------------------------------------------------------------

# 32. Room Limits

``` text
Min Players: 2
Max Players: 8
```

空 Room：

``` text
0 players
```

持续一段时间后销毁。

例如：

``` text
5 minutes
```

------------------------------------------------------------------------

# 33. Host Migration

Host 只是：

``` text
Lobby Control Role
```

不是 Server。

Host Disconnect：

Server 将 Host 权限转移给：

``` text
oldest connected player
```

Match 不应因 Host 浏览器关闭而终止。

------------------------------------------------------------------------

# 34. v0.55 --- Internet Multiplayer

LAN 稳定后才进行公网部署。

目标：

``` text
Public HTTPS URL
+
Secure WebSocket
```

例如：

``` text
https://game.example.com
```

架构：

``` text
Browser
↓ HTTPS / WSS
Reverse Proxy / Hosting
↓
Node.js Game Server
```

要求：

-   HTTPS
-   WSS
-   Environment Variables
-   Production Build
-   Process Restart
-   Server Logs
-   Basic Rate Limiting
-   Origin validation
-   Input validation

不要把开发服务器直接暴露公网。

------------------------------------------------------------------------

# 35. Internet Latency Testing

公网测试至少模拟 / 观察：

``` text
20 ms
50 ms
100 ms
150 ms
200 ms
```

关注：

-   Movement
-   Aim
-   Projectile
-   Dash
-   Melee
-   Knockback
-   Skill
-   Death

Debug HUD 增加：

``` text
Ping
Jitter
Packet / Snapshot delay
Correction count
```

------------------------------------------------------------------------

# 36. Security Basics

Server 必须验证：

``` text
Input Rate
Move Direction
Attack Rate
Cooldown
Skill State
Ultimate Meter
Room Membership
Player Alive
```

禁止信任 Client 传来的：

``` text
Damage
HP
Target ID as confirmed hit
Position teleport
Cooldown completion
```

增加基础 Rate Limit，防止浏览器异常或恶意 spam。

------------------------------------------------------------------------

# 37. v0.6 --- Database

IMPORTANT：

数据库不是实时战斗的组成部分。

实时 Match State 继续存在 Server Memory。

不要每 Tick 写数据库。

------------------------------------------------------------------------

# 38. Database 使用条件

只有出现以下持久化需求时才加入数据库：

``` text
Account
Player Profile
Match History
Statistics
Unlocks
Cosmetics
Progression
Ban / Moderation
```

如果 Alpha 暂时没有这些需求：

> **允许跳过 Database。**

不要为了"多人游戏应该有数据库"而加入。

------------------------------------------------------------------------

# 39. Database Recommended Scope

如果需要：

推荐 PostgreSQL。

保存：

``` text
Player Profile
Match Result
Match Statistics
Unlock Data
```

不保存实时：

``` text
Position
Projectile
HP per tick
Input
Snapshot
```

------------------------------------------------------------------------

# 40. Minimal Match Record

例如：

``` ts
MatchRecord {
  id
  roomId
  startedAt
  endedAt
  winnerPlayerId
  playerCount
}
```

Player Match Result：

``` ts
PlayerMatchResult {
  matchId
  playerId
  mbti
  kills
  damage
  survivalTime
  placement
}
```

------------------------------------------------------------------------

# 41. v0.7 --- Rollback / Lag Compensation

IMPORTANT：

不要默认"完整 Rollback Netcode"一定需要。

当前游戏是：

``` text
2D
2–8 players
Browser
Server Authoritative
Casual Party Brawler
```

先测公网延迟。

如果 50--100ms 下体验已经可接受：

> 不实现完整 Rollback。

------------------------------------------------------------------------

# 42. 为什么 Rollback 最后做

Rollback 会显著增加：

``` text
State History
Deterministic Simulation
Input History
Re-simulation
Projectile History
Collision Rewind
Effect Reconciliation
Debug Complexity
```

当前 Phaser 代码未必是完全 deterministic simulation。

不要为了技术完整性重写整个游戏。

------------------------------------------------------------------------

# 43. 推荐优先：Lag Compensation

在完整 Rollback 前，优先实现：

### Client Prediction

用于：

``` text
Local Movement
```

### Snapshot Interpolation

用于：

``` text
Remote Movement
```

### Server Reconciliation

用于：

``` text
Position Correction
```

### Server-side Rewind

只在确实需要时用于：

``` text
Fast Projectile / Hitscan
```

------------------------------------------------------------------------

# 44. Server Rewind

如果公网测试发现：

``` text
玩家明明瞄准了，但服务器认为没打中
```

Server 保存最近：

``` text
200–500 ms
```

Player Position History。

Attack Request 携带：

``` text
clientInputSequence
clientTimestamp
```

Server 根据估计时间回看目标位置并判断命中。

这属于：

``` text
Lag Compensation
```

而不是完整 World Rollback。

------------------------------------------------------------------------

# 45. Full Rollback Trigger

只有同时出现以下情况才考虑完整 Rollback：

-   [ ] 公网延迟明显破坏核心战斗
-   [ ] Server Rewind 无法解决
-   [ ] 高频近战交互要求非常精确
-   [ ] Dash / Collision 经常产生争议
-   [ ] 项目确定进入长期正式开发
-   [ ] 有足够时间重构 Simulation

否则保持：

``` text
Authoritative Server
+
Prediction
+
Interpolation
+
Reconciliation
+
Selective Rewind
```

------------------------------------------------------------------------

# 46. Network Debug Tools

保留 F3 Network Debug。

增加：

``` text
Connection
Ping
Jitter
Server Tick
Snapshot Rate
Input Sequence
Last Ack Sequence
Prediction Error
Correction Count
Room ID
Match Phase
```

开发阶段非常重要。

------------------------------------------------------------------------

# 47. Artificial Network Simulation

建议开发环境支持：

``` text
?latency=100
```

或 Debug Config：

``` ts
DEV_NETWORK_LATENCY_MS = 100;
DEV_PACKET_JITTER_MS = 20;
```

仅 Development Mode 使用。

用于在同一电脑模拟公网体验。

不要影响 Production。

------------------------------------------------------------------------

# 48. Combat Architecture

最终建议：

``` text
InputSystem
↓
MovementSystem
↓
AttackSystem
↓
SkillSystem
↓
ProjectileSystem
↓
CollisionSystem
↓
DamageSystem
↓
StatusEffectSystem
↓
DeathSystem
↓
MatchSystem
```

系统之间通过明确数据和事件通信。

避免 Character Class 变成一个包含所有逻辑的超大类。

------------------------------------------------------------------------

# 49. Server Game Loop

建议：

``` text
Receive Inputs

↓
Fixed Tick

Movement
↓
Skills
↓
Projectiles
↓
Collision
↓
Damage
↓
Status Effects
↓
Death
↓
Win Condition

↓
Snapshot

↓
Clients
```

------------------------------------------------------------------------

# 50. Network Event Categories

建议区分：

## State

持续状态：

``` text
Position
HP
Personality
Cooldown
Alive
Match Phase
```

通过 Snapshot / State Sync。

## Event

瞬时事件：

``` text
AttackStarted
Hit
Damage
SkillCast
UltimateCast
Death
MatchFinished
```

通过 Event 消息。

不要把所有 VFX 状态塞进 Snapshot。

------------------------------------------------------------------------

# 51. Character Data Driven

示例：

``` ts
interface CharacterDefinition {
  mbti: MBTIType;

  maxHp: number;
  moveSpeed: number;

  basicAttack: AttackDefinition;
  skill: SkillDefinition;
  ultimate: SkillDefinition;
}
```

Character Card、Client Presentation 和 Server Combat 共用同一份定义。

------------------------------------------------------------------------

# 52. 第一轮角色实现顺序

不要直接 16 个一起做。

先：

``` text
ENTP
INFP
ESTJ
ESTP
```

覆盖：

``` text
Ranged Projectile
Buff / Comeback
AoE
Melee
Dash
Debuff
Knockback
Ultimate
```

四个稳定后再扩展：

``` text
4
→ 8
→ 16
```

------------------------------------------------------------------------

# 53. Alpha Match Rules

第一版统一：

``` text
Players: 2–8
HP: 100
Respawn: No
Friendly Fire: N/A
Round: Single Elimination
Winner: Last Alive
Personality: 0–100
Ultimate Cost: 100
```

暂不做复杂 Game Mode。

------------------------------------------------------------------------

# 54. Performance Target

8 Players：

目标：

``` text
Client: 60 FPS
Server: stable 30 Tick
```

不要因为某一帧 VFX 导致 Server Simulation 停顿。

Server 不运行：

``` text
Rendering
Particles
Audio
DOM
```

------------------------------------------------------------------------

# 55. Error Handling

必须处理：

``` text
Room Not Found
Room Full
Server Disconnected
Reconnect Failed
Invalid MBTI
Invalid Input
Match Already Started
Server Error
```

不要让 UI 卡死。

------------------------------------------------------------------------

# 56. Agent Implementation Roadmap

## Phase A --- Combat v0.2

实现：

``` text
Basic Attack
Projectile / Melee
Server Hit Detection
Damage
HP
Knockback
Personality Meter
Death
```

完成后 STOP + Playtest。

------------------------------------------------------------------------

## Phase B --- Character Combat v0.3

实现：

``` text
ENTP
INFP
ESTJ
ESTP

Skill
Ultimate
Cooldown
Status Effects
```

完成后 STOP + Playtest。

------------------------------------------------------------------------

## Phase C --- Match v0.4

实现：

``` text
Lobby
MBTI Select
Ready
Host Start
Countdown
Death
Winner
Result
Rematch
```

完成后 STOP + 4-player Playtest。

------------------------------------------------------------------------

## Phase D --- Reliability v0.45

实现：

``` text
Spectator
Disconnect Grace Period
Reconnect Token
Full State Resync
Host Migration
```

完成后主动进行断网 / 刷新测试。

------------------------------------------------------------------------

## Phase E --- Rooms v0.5

实现：

``` text
RoomManager
Create Room
Join Room
Room Code
2–8 Players
Room Cleanup
```

完成后测试至少两个房间同时运行。

------------------------------------------------------------------------

## Phase F --- Internet v0.55

实现：

``` text
Production Build
HTTPS
WSS
Deployment
Environment Config
Logs
Rate Limit
Validation
```

完成后异地设备测试。

------------------------------------------------------------------------

## Phase G --- Persistence v0.6

仅在产品需要持久数据时：

``` text
PostgreSQL
Match Result
Player Stats
Profile
```

否则跳过。

------------------------------------------------------------------------

## Phase H --- Lag Compensation v0.7

先测公网。

依次考虑：

``` text
Prediction
Interpolation
Reconciliation
↓
Selective Server Rewind
↓
Full Rollback only if proven necessary
```

------------------------------------------------------------------------

# 57. 每阶段 Agent 必须输出

每个 Phase 完成后输出：

1.  Modified Files
2.  Architecture Changes
3.  Network Protocol Changes
4.  New Server State
5.  New Client State
6.  Test Instructions
7.  Known Issues
8.  Performance Risks
9.  Next Recommended Phase

然后停止。

不要未经确认自动进入下一 Phase。

------------------------------------------------------------------------

# 58. Regression Checklist

每个阶段都重新验证：

-   [ ] npm run dev 正常
-   [ ] npm run build 正常
-   [ ] npm run start:lan 正常
-   [ ] Local Movement 手感正常
-   [ ] Remote Movement 平滑
-   [ ] Aim 正常
-   [ ] Map 一致
-   [ ] Disconnect 不导致 Server Crash
-   [ ] 两浏览器正常
-   [ ] 两真实设备正常

------------------------------------------------------------------------

# 59. 最重要的 Agent 禁止事项

不要：

-   一次实现所有 Phase
-   重写已经工作的 Phaser Client
-   为多人系统更换游戏引擎
-   引入不必要的 ECS
-   引入 Redis
-   引入微服务
-   提前实现账号系统
-   每 Tick 写数据库
-   为了 Rollback 重写整个游戏
-   让 Client 决定 Damage / Death
-   在 Client / Server 维护两套 Character Config
-   在未 Playtest 前扩展全部 16 MBTI

------------------------------------------------------------------------

# 60. Agent 当前立即执行任务

现在只执行：

# Phase A --- Multiplayer Combat v0.2

具体任务：

``` text
1. 阅读现有 Multiplayer Movement 实现
2. 保留现有 Movement / Aim Sync
3. 扩展 Shared Network Protocol
4. Server 实现 Basic Attack
5. Server 实现 Projectile / Melee Hit Detection
6. Server 实现 Damage
7. Server 实现 HP
8. Server 实现 Knockback
9. Server 实现 Personality Meter
10. Server 实现 Death
11. Client 接入 Combat Animation / VFX / HUD
12. 完成两浏览器测试
13. 完成两设备 LAN 测试说明
14. 输出改动与已知问题
15. STOP
```

暂时不要实现：

``` text
Skill
Ultimate
Lobby
Ready
Spectator
Reconnect
Multiple Rooms
Internet
Database
Rollback
```

这些已经定义在本文档后续 Phase 中，但必须按 Gate 顺序开发。

------------------------------------------------------------------------

# 61. Phase A Acceptance Criteria

在进入 Phase B 前必须满足：

``` text
P1 shoots / attacks P2
↓
Server confirms hit
↓
P2 loses HP
↓
Both clients show same HP
↓
P1 gains Personality
↓
P2 receives knockback
↓
P2 HP reaches 0
↓
P2 dies
↓
P2 cannot move or attack
```

反向 P2 → P1 同样成立。

必须连续完成多局测试，不出现：

``` text
Duplicate Damage
Ghost Projectile
HP Desync
Dead Player Attack
Position Explosion
Server Crash
```

------------------------------------------------------------------------

# 62. Product Goal

技术实现始终服务于：

> **2--8 个顶着 MBTI
> 人格脑袋的角色，在浏览器里快速进入同一场大乱斗，通过夸张、好笑且有性格辨识度的技能互殴。**

当前优先级：

``` text
Fun
>
Responsiveness
>
Multiplayer Stability
>
Character Readability
>
Architecture Elegance
```

不要为了技术完整性延迟 Playtest。
