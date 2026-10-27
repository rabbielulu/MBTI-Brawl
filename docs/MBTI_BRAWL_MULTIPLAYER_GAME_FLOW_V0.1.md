# MBTI 大乱斗 --- Multiplayer Game Flow & Codex Implementation Spec

> Version: Multiplayer Game Flow v0.1 Current Room Size: 1--8 Players
> Future Target: Up to 16 Players Stack: Phaser 3 + TypeScript + Vite +
> Node.js + Socket.IO Architecture: Server Authoritative

## 1. 核心体验

> 发一个链接 → 朋友点开 → 选择 MBTI + 昵称 → 自动进入 Lobby → 30
> 秒后开打 → 最后一人获得冠军。

优先级：

``` text
Fast Join > Low Friction > Party Feeling > Character Expression > Competitive Formality
```

## 2. 完整流程

``` text
MAIN MENU
→ MULTIPLAYER
→ CREATE CHARACTER (MBTI + Nickname)
→ LOBBY
→ Invite Friends
→ 2+ Players
→ 30 sec Countdown
→ 3 / 2 / 1
→ BATTLE
→ DEATH
→ SPECTATOR
→ LAST PLAYER ALIVE
→ WINNER CELEBRATION
→ RESULT
→ REMATCH / HOME
```

## 3. Main Menu

``` text
MBTI 大乱斗

[ 单人试玩 ]
[ 多人乱斗 ]

🏆 排行榜
⚙ 设置
```

## 4. Character Creation

玩家进入多人模式后创建角色：

``` text
人格 [ ENTP ▼ ]
昵称 [ 杠精本人 ]

ENTP · 杠精本人

[ 进入房间 ]
```

ID 自动由 `MBTI + Nickname` 组成，不让玩家输入完整 ID。

``` ts
interface PlayerIdentity {
  mbti: MBTIType;
  nickname: string;
}
```

昵称 Prototype 建议 1--12 字符，Server 再次验证。

## 5. Room

Server 创建短 Room ID，例如 `ABCD`。

``` ts
DEFAULT_MAX_PLAYERS = 8;
ABSOLUTE_MAX_PLAYERS = 16;
```

不要在 Server / Network / Lobby 逻辑中把 8 写死，使用
`room.maxPlayers`。

## 6. Invite Link

Lobby：

``` text
[ 🔗 邀请朋友 ]
```

点击复制当前房间 URL。

邀请玩家打开链接：

``` text
Open Link
→ Detect Room ID
→ Create Character
→ Choose MBTI + Nickname
→ Join Existing Lobby
```

不要让受邀玩家重新经过主页或手输 Room Code。

Room Code 可保留为备用入口。

## 7. Lobby

当前显示 8 个 Slot：

``` text
多人乱斗                           00:24

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Avatar │ │ Avatar │ │   ?    │ │   ?    │
│ ENTP   │ │ INFP   │ │        │ │        │
│ 杠精本人│ │ 小蝶   │ │ 等待中 │ │ 等待中 │
└────────┘ └────────┘ └────────┘ └────────┘

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│   ?    │ │   ?    │ │   ?    │ │   ?    │
│ 等待中 │ │ 等待中 │ │ 等待中 │ │ 等待中 │
└────────┘ └────────┘ └────────┘ └────────┘

                2 / 8

          [ 🔗 邀请朋友 ]

       24 秒后自动开始
```

Player Slot：

``` text
Avatar
MBTI
Nickname
```

Empty Slot：

``` text
?
等待中
```

Lobby 中允许点击自己的 Slot 修改 MBTI / Nickname。Battle 开始后锁定。

普通模式允许重复 MBTI。

## 8. No Ready / Host Start

当前不做 Ready Button，也不做 Host Start。

目标：

``` text
Join → Wait → Auto Start
```

避免传统竞技游戏的额外操作。

## 9. Lobby Countdown

### 1 Player

``` text
等待其他玩家加入……
```

不启动倒计时。

### 2--7 Players

第二名玩家加入后：

``` text
30 sec Countdown
```

### 回落到 1 Player

Countdown Reset 到 30 秒，等待再次达到 2 人。

### 8 / 8

房间满：

``` text
5 sec Countdown
```

然后开局。

Countdown 必须由 Server Authority 控制。

## 10. Lobby Personality Presentation

等待时可以播放轻量人格表现：

``` text
ENTP → 💬 Actually...
INTP → ❓
INFP → ♥
ESTP → WOO!
ESTJ → 📋
```

仅 Presentation，不进入 Server Gameplay State。

## 11. Match Start

Server 下发统一 `serverStartTimestamp`。

客户端显示：

``` text
3
2
1
MBTI 大乱斗！
```

开局提供约 2 秒 Spawn Protection：

``` text
Can Move = true
Can Aim = true
Can Attack = false
Can Take Damage = false
```

## 12. Match Objective

``` text
Free For All
Last Player Standing
```

所有玩家互相敌对，无 Team。

## 13. Win / Cancel

Server：

``` text
Alive Players > 1 → PLAYING
Alive Players = 1 → WINNER
Connected Players = 0 → CANCELLED / No Result
```

冠军 = 最后存活玩家。

## 14. Battle HUD

自己显示：

``` text
Avatar
ENTP · 杠精本人

HP ███████░░
人格 █████░░░
```

其他玩家只显示简洁头像状态：

``` text
😈 🙂 🤓 😎 😐 💀 💀 💀
```

Alive 正常；Dead 灰色 + Skull；自己有 Highlight。

不要默认显示所有人的完整 HP。

## 15. Kill Feed

增加人格化 Kill Feed。

示例：

``` text
ENTP · 杠精本人
用「你说得不对」
说死了
ESTJ · 项目经理
```

或：

``` text
ESTP · 阿强
WOOOOOO 掉了
INFP · 小蝶
```

Server 只确认 Kill 数据，Client 根据角色/技能生成表现文本。

``` ts
interface KillEvent {
  killerId: string | null;
  victimId: string;
  abilityId?: string;
  timestamp: number;
}
```

Prototype：最后有效伤害者获得 Kill；主动退出不算 Kill；暂不做 Assist。

## 16. Death

HP \<= 0：

``` text
alive = false
```

禁用 Movement / Attack / Skill / Ultimate。

短暂显示：

``` text
💀 你被淘汰了

击杀者
ESTP · 阿强

[ 继续观战 ]
[ 退出本局 ]
```

约 3 秒后自动进入 Spectator。

## 17. Spectator

Camera 跟随存活玩家。

``` text
◀   ENTP · 杠精本人   ▶

剩余 4 人
```

Desktop：A/D 或左右键切换。 Mobile：屏幕左右按钮切换。

Spectator 不发送 Gameplay Input。

## 18. Exit / Disconnect

Lobby 主动退出：Remove Player。房间无人则 Destroy。

Battle 主动退出：

``` text
alive = false
eliminationReason = quit
```

不计任何玩家 Kill。

所有玩家退出：

``` text
Match = CANCELLED
No Winner
No Result
No Leaderboard Update
```

主动 Exit 与 Unexpected Disconnect 分开。

Unexpected Disconnect 使用约 10 秒 Grace Period；主动 Exit 立即淘汰。

## 19. Placement

名次按淘汰顺序：

``` text
First Eliminated → #8
Second → #7
...
Last Eliminated → #2
Last Alive → #1
```

Kill 数不决定比赛名次。

冠军和击杀王是两个不同荣誉：

``` text
Champion = Last Player Alive
Kill King = Most Kills
```

## 20. Winner Celebration

最后一人存活后，先播放 3--5 秒独立庆祝，不立即进入统计表。

``` text
        👑

        O
       \|/
        |
       / 
   🎉 🎊 🎉 🎊

ENTP · 杠精本人

  本局 MBTI 之王
```

角色表现：

``` text
Crown + Victory Pose + Confetti
```

每个人格配置专属 Victory Line：

``` text
ENTP：事实证明，他说得都对。
INFP：忍到最后的人赢了。
ESTJ：本局已按计划完成。
ESTP：WOOOOOOOO！
INTJ：一切都在计划中。
```

数据 Config Driven，不写死在 Winner Scene。

## 21. Result

庆祝后进入本局战绩：

``` text
🥇 ENTP · 杠精本人
击杀 4
伤害 386
存活 03:21

🥈 ESTP · 阿强
击杀 2
伤害 301
存活 02:58

🥉 INFP · 小蝶
击杀 1
伤害 244
存活 02:31
```

第一版显示：

``` text
Placement
Kills
Damage Dealt
Survival Time
```

内部可额外记录 Damage Taken / Distance Moved / Skill Uses / Ultimate
Uses / Dash Count。

## 22. Fun Awards

结算根据数据自动产生无数值奖励的搞笑称号：

``` text
⚔️ 杀疯了 — Most Kills
💥 人形核弹 — Most Damage
🏃 你抓不到我 — Longest Distance
🎯 专业针对 — Most Attacks Against Same Player
💔 全场最惨 — Most Damage Taken
```

未来可增加人格专属 Award：

``` text
ENTP：💬 全场最能说
ESTP：💨 根本停不下来
ESTJ：📋 优秀项目经理
```

## 23. Rematch

Result：

``` text
[ 再来一局 ]
[ 返回主页 ]
```

再来一局：

``` text
RESULT
→ Same Room
→ LOBBY
→ Keep Connected Players
→ Reset Match State
→ Allow MBTI Change
→ 30 sec Countdown
→ NEXT MATCH
```

Reset：

``` text
HP
Personality
Cooldown
Alive
Placement
Kills
Damage
Projectiles
Zones
Buff/Debuff
Turrets
Spectator State
Winner
```

保留 Connection / Room Membership / Nickname。MBTI 保留但 Lobby 可修改。

## 24. Leaderboard

主页：

``` text
🏆 排行榜
```

打开：

``` text
[ 👑 冠军榜 ] [ ⚔️ 击杀榜 ]
```

冠军榜建议作为默认 Tab，因为游戏核心目标是 Last Player Standing。

冠军榜：

``` text
1. INFP · 小蝶      12 👑
2. ENTP · Lucy      10 👑
3. ESTP · 阿强       8 👑
```

击杀榜：

``` text
1. ENTP · 杠精本人    82
2. ESTP · 阿强        71
3. INTJ · K           63
```

真正跨房间持久排行榜需要 Database。数据库尚未实现时，Leaderboard UI
可以先使用 Mock / Local Dev Data，不要把 DB 写入实时 Battle Tick。

## 25. Future Personality Statistics

后期：

``` text
ENTP
Win Rate 14.2%
Average Kills 2.8

INFP
Win Rate 17.1%
Average Kills 1.6
```

用于社区讨论和 Balance Analysis。当前不阻塞 Multiplayer Flow。

## 26. Match State Machine

``` ts
type MatchPhase =
  | "LOBBY"
  | "COUNTDOWN"
  | "PLAYING"
  | "WINNER"
  | "RESULT"
  | "CANCELLED";
```

## 27. Room State

建议概念：

``` ts
interface RoomState {
  id: string;
  maxPlayers: number;
  players: PlayerState[];
  phase: MatchPhase;
  lobbyCountdownEnd?: number;
  matchStartTime?: number;
  winnerId?: string;
  createdAt: number;
}
```

按现有代码结构调整，不要求逐字照搬。

## 28. Player Match State

至少包含：

``` ts
interface PlayerMatchState {
  playerId: string;
  mbti: MBTIType;
  nickname: string;
  connected: boolean;
  alive: boolean;
  hp: number;
  personality: number;
  kills: number;
  damageDealt: number;
  placement?: number;
  eliminationReason?: "killed" | "quit" | "disconnect";
  joinedAt: number;
  eliminatedAt?: number;
}
```

## 29. Authority

Server 决定：

``` text
Room Membership
Lobby Countdown
Match Start
Spawn
HP / Damage
Kills / Death
Alive State
Placement
Winner
Match Cancel
Stats
Rematch Reset
```

Client 负责：

``` text
Lobby UI
Invite Link
Countdown Presentation
Combat Presentation
Kill Feed
Death Screen
Spectator Camera
Winner Celebration
Confetti
Result UI
Leaderboard UI
```

## 30. Network Events

根据已有协议复用/调整，概念包括：

``` text
room:create
room:join
room:leave
room:update
player:updateIdentity

match:countdown
match:start
match:death
match:kill
match:winner
match:result
match:cancel
match:rematch
```

不要重复创建已有协议。

## 31. URL Routing

支持简单 Room URL，例如：

``` text
/game/:roomId
```

或：

``` text
?room=ABCD
```

根据现有 Vite 结构选择最简单方案，不为了 Invite Link 引入大型 Router
Framework。

Clipboard 优先使用 `navigator.clipboard.writeText`，失败时提供 Manual
Copy。

## 32. Mobile Compatibility

Character Creation / Lobby / Result 必须支持 Mobile Browser。

Battle 使用已有 Mobile Debug Controls。

手机打开 Invite Link 后必须保留 Room ID。

## 33. Future 16 Players

当前：

``` text
room.maxPlayers = 8
```

未来：

``` text
room.maxPlayers = 16
```

当前不要实现：

``` text
16 Player UI
16 Player Map
Interest Management
16 Player Balance
16 Player Performance Optimization
```

只保证架构没有把 8 写死。

## 34. Join During Battle

当前不允许作为 Active Player 加入已开始比赛。

显示：

``` text
本局已经开始
[ 返回主页 ]
```

Join as Spectator 可后续增加。

## 35. Error States

处理：

``` text
Room Not Found
Room Full
Match Already Started
Invalid Room ID
Invalid MBTI
Invalid Nickname
Server Disconnected
Reconnect Failed
```

必须给用户明确提示。

## 36. Simultaneous Final Death

最后两名几乎同时死亡时，由 Server authoritative tick / damage resolution
决定。

若最终：

``` text
Alive Players = 0
```

允许：

``` text
DRAW / 同归于尽！
```

Client 不自行猜 Winner。

## 37. Product Tone

避免过度严肃：

``` text
ELIMINATED / RANKED / MMR
```

优先：

``` text
你被送走了
还剩 4 个 MBTI 在互殴
ENTP 又开始了
ESTP 已经拦不住了
```

但核心状态仍必须清晰。

## 38. Implementation Phases

### M1 --- Lobby

Create Character / Create Room / Join via Link / 8 Slots / Countdown /
Character Change。

### M2 --- Match Lifecycle

Countdown / Spawn Protection / Playing / Death / Placement / Winner /
Cancel。

### M3 --- Spectator

Death Screen / Auto Spectate / Target Switching / Exit。

### M4 --- Celebration & Result

Crown / Confetti / Victory Line / Stats / Awards。

### M5 --- Rematch

Same Room / Reset / Change MBTI / Restart Countdown。

### M6 --- Leaderboard

仅在 Persistence 已存在时接真实数据；否则先 Mock UI。

每个 Phase 完成后 STOP + Test，不自动进入下一阶段。

## 39. Current Immediate Codex Task

当前只执行：

``` text
Phase M1 — Lobby
```

包括：

1.  Character Creation
2.  MBTI + Nickname Identity
3.  Create Room
4.  Join via Invite Link
5.  8 Player Slot UI
6.  Copy Invite Link
7.  1 Player Waiting State
8.  2+ Player 30 sec Countdown
9.  Drop to 1 → Reset Countdown
10. Full 8 Players → 5 sec Countdown
11. Lobby Character Change
12. Server Authoritative Countdown
13. Error States
14. Desktop + Mobile Lobby Test
15. STOP

不要自动进入 M2。

## 40. M1 Agent Output

完成后必须输出：

1.  Modified Files
2.  Room State Changes
3.  Network Protocol Changes
4.  Lobby State Machine
5.  Invite Link Implementation
6.  Character Identity Implementation
7.  Countdown Logic
8.  Mobile Compatibility
9.  Test Instructions
10. Known Issues
11. Next Recommended Phase

然后停止。

## 41. Critical Edge Cases

测试：

-   Lobby countdown 中玩家离开
-   2 人变 1 人
-   Room 达到 8 人
-   Battle 主动退出
-   Unexpected Disconnect
-   两人近乎同时死亡
-   最后两人互换致命伤
-   Winner 胜利后立刻断线
-   所有人退出
-   Rematch 时部分玩家离开
-   Match Started 后打开 Invite Link
-   Duplicate Nickname
-   Duplicate MBTI
-   Mobile 横竖屏切换
-   Server Restart

## 42. Final Product Loop

``` text
Share Link
↓
Choose Personality
↓
30 Seconds
↓
Fight
↓
Die / Spectate
↓
One MBTI Survives
↓
👑 Crown + Confetti
↓
Laugh at Stats
↓
Change Personality
↓
Again
```

核心不是复杂竞技。

> **让一群朋友尽可能快地进入同一个房间，看着不同 MBTI
> 用荒诞的人格技能互殴，并在每局结束后自然产生"再来一局，我换个人格"的冲动。**
