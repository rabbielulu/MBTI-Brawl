# MBTI 大乱斗 --- Multiplayer LAN Implementation

> Version: Multiplayer Prototype v0.1\
> Stack: Phaser 3 + TypeScript + Vite + Node.js + Socket.IO\
> Target: Desktop Browser / Company LAN

## 1. 当前目标

当前单机原型已完成 Phaser 3 + TypeScript + Vite
基础操控。本阶段不要重构整个游戏，也不要直接开发完整 8 人战斗。

唯一目标：

> 两台位于同一局域网的电脑，通过浏览器进入同一个 Phaser
> 游戏世界，并分别实时控制自己的角色。

双方需要看到：对方角色、位置、移动、鼠标瞄准方向、Idle / Walk 状态。

本阶段暂不做普攻同步、伤害、HP、人格槽、技能、大招、死亡、胜负、Lobby、Ready、观战、断线恢复、多房间、公网联机、数据库和
Rollback。

## 2. 技术架构

``` text
Browser A                         Browser B
Phaser Client                    Phaser Client
     │                                │
     └──────── Socket.IO ─────────────┘
                      │
                      ▼
              Node.js Game Server
                      │
               Authoritative State
```

Server 运行在 Host Computer。最终同事只需访问：

``` text
http://HOST_IP:3000
```

建议逐步形成：

``` text
src/
├── client/
│   ├── game/
│   ├── network/NetworkClient.ts
│   └── ui/
├── shared/
│   ├── NetworkProtocol.ts
│   ├── GameConstants.ts
│   └── PlayerTypes.ts
└── server/
    ├── GameServer.ts
    ├── GameRoom.ts
    └── PlayerState.ts
```

不要为了符合目录而大规模移动当前已经工作的代码，优先最小修改。

## 3. Shared Network Protocol

Client / Server 共用协议定义，禁止维护两套。

``` ts
export interface PlayerInput {
  seq: number;
  moveX: number;
  moveY: number;
  aimAngle: number;
}

export interface NetworkPlayerState {
  id: string;
  x: number;
  y: number;
  aimAngle: number;
  movementState: "idle" | "walk";
}

export interface GameSnapshot {
  tick: number;
  players: NetworkPlayerState[];
}
```

## 4. Server Responsibilities

Node.js Game Server 负责：

-   Connection
-   Player Join / Leave
-   Player Input
-   Player Movement
-   Arena Boundary
-   Game State
-   Snapshot Broadcast

玩家连接后由 Server 创建 PlayerState、Player ID 和 Spawn
Point。第一阶段使用 P1、P2 标识即可。

## 5. Input

Client 继续使用现有 Phaser WASD + Mouse。

WASD 转换成 moveX / moveY，必须 Normalize diagonal movement，避免 WA 比
W 跑得快。

Mouse 根据 Local Player World Position → Mouse World Position 计算
aimAngle。只发送 aimAngle，不发送 Mouse Screen Position。

## 6. Server Tick

Prototype 初始使用：

``` text
Server Simulation: 30 ticks/s
Snapshot Broadcast: 15–20 snapshots/s
Client Rendering: 60 FPS
```

Server 每 Tick：

``` text
Receive latest inputs
→ Update movement
→ Apply arena boundaries
→ Update PlayerState
→ Generate Snapshot
```

第一阶段 JSON 足够，不做 Binary Serialization、Compression 或 Delta
Compression。

## 7. Local Prediction

自己的角色必须保持当前单机版的即时响应。

禁止：

``` text
W → Server → Wait → Snapshot → Move
```

采用：

``` text
W
→ Local Prediction
→ Character immediately moves

同时：
Input
→ Server
→ Authoritative Movement
→ Snapshot
→ Client Correction
```

Server Correction 根据误差处理：

-   Small Error：Ignore / Smooth
-   Medium Error：Lerp
-   Large Error：Snap

阈值放入 GameConstants，方便 Playtest 调整。

## 8. Remote Player Interpolation

远端角色不要直接跳到每个 Snapshot 坐标。

保存最近 Snapshot，并使用 Previous Snapshot → LERP → Next Snapshot，使
15--20Hz 网络更新在 60 FPS 渲染下保持平滑。

## 9. Animation & Camera

Server 只同步 movementState = idle / walk，不同步动画帧。Client
自己播放动画。

每个 Client Camera 只跟随自己的 Local Player，Camera 不同步。

## 10. Map Synchronization

当前存在随机地形、障碍物和泥潭。多人模式禁止每个 Client 独立
Math.random()。

Prototype 推荐由 Server 生成 Map Definition：

``` ts
{
  obstacles: [...],
  mudAreas: [...]
}
```

Client 接收后统一 Render。

如果障碍物碰撞迁移 Server 会明显拖慢第一次验证，本阶段可以只实现 Arena
Boundary，并留下 TODO：Server-authoritative obstacle collision。

## 11. Debug HUD

增加开发 HUD：

``` text
NETWORK
Connected
Player: P1
Players: 2
Ping: 12 ms
Server Tick: 30
Snapshot: 20
```

断线显示 DISCONNECTED。

建议 F3 开关 Multiplayer Debug，显示 LOCAL / REMOTE、Player ID、X/Y、Aim
Angle；如果方便，可绘制 Server Authoritative Position 小点。

## 12. Disconnect

第一阶段只做：

``` text
Browser closes
→ Socket Disconnect
→ Server removes Player
→ Broadcast
→ Other Client removes Remote Player
```

暂不做 Reconnect / Session Recovery。

## 13. LAN Configuration

Server 必须监听：

``` text
0.0.0.0
```

不能只监听 localhost。

Vite 开发环境允许：

``` ts
server: {
  host: "0.0.0.0"
}
```

LAN Playtest 推荐 Node Server 同时提供 Vite Build +
Socket.IO，使同事只访问一个端口。

目标命令：

``` bash
npm run dev

npm run build
npm run start:lan
```

`npm run start:lan` 后建议输出 Local URL 与 LAN URL。若自动获取 LAN IP
不值得实现，则人工使用 `ipconfig` 查看 IPv4。

Windows Firewall 不要自动修改；README 中说明如无法连接，应检查 Node.js
是否允许 Private Network 入站。

## 14. Implementation Milestones

### Milestone 1 --- Connection

建立 Node Server + Socket.IO。验收：Browser 连接后 Server 打印 Player
connected。

### Milestone 2 --- Two Browser Test

同一电脑打开两个 Browser Window。验收：Players: 2，双方看到 P1 / P2。

### Milestone 3 --- Movement Sync

P1 / P2 分别 WASD，互不干扰，双方看到对方移动。

### Milestone 4 --- Mouse Aim

双方看到对方 Body / Weapon Direction 随鼠标正确变化。

### Milestone 5 --- Remote Interpolation

实现 Snapshot Interpolation。验收：Remote Player Movement 基本平滑。

### Milestone 6 --- Local Prediction

实现 Local Prediction + Server Correction。验收：本地 WASD
手感与原单机版基本一致。

### Milestone 7 --- Map Sync

双方 Terrain / Obstacle / Mud 位置完全一致。

### Milestone 8 --- Real LAN Test

使用两台真实电脑进行测试。

## 15. LAN Test Procedure

Host：

``` bash
npm run build
npm run start:lan
```

通过 `ipconfig` 查看 IPv4，例如：

``` text
192.168.10.25
```

Host 打开：

``` text
http://localhost:3000
```

Second Device：

``` text
http://192.168.10.25:3000
```

测试顺序：

1.  双方原地不动，确认 Players: 2。
2.  P1 绕 P2 转圈，在 P2 电脑观察平滑度。
3.  P2 绕 P1 转圈，在 P1 电脑观察。
4.  双方快速改变 WASD 方向，检查延迟、抖动、瞬移、漂移和斜向速度。
5.  快速旋转 Mouse，检查 Aim 同步。
6.  P2 关闭 Browser，确认 P1 的 Players 从 2 → 1，P2 Character 消失。

## 16. Success Criteria

-   [ ] 两台真实设备可以连接
-   [ ] 一个 URL 即可进入
-   [ ] 两名玩家拥有不同 Player ID
-   [ ] 双方分别控制自己的角色
-   [ ] WASD 本地操作保持跟手
-   [ ] 双方看到对方移动
-   [ ] 双方看到对方 Aim
-   [ ] Remote Movement 基本平滑
-   [ ] Idle / Walk 正确
-   [ ] Camera 分别跟随自己的角色
-   [ ] 双方地图一致
-   [ ] Player Disconnect 正确移除
-   [ ] Ping 可查看
-   [ ] 没有严重位置漂移
-   [ ] 不破坏原有单机 Combat Prototype

## 17. Agent Stop Point

完成上述功能以后停止开发。

不要自行继续实现 Attack、Skill、Ultimate、Damage、HP、Lobby 或 8
Players。

完成后输出：

1.  修改文件列表
2.  当前 Multiplayer Architecture
3.  Server 启动方式
4.  Host Computer 操作步骤
5.  Second Computer 操作步骤
6.  已知问题
7.  下一阶段建议

等待真实双设备 Playtest 结果。

## 18. 下一阶段 Multiplayer Combat v0.2

只有双设备 Movement Test 成功后才进入：

``` text
LMB Attack
→ Projectile
→ Server Hit Detection
→ Damage
→ HP Sync
→ Knockback
→ Personality Skill
→ Personality Meter
→ Ultimate
→ Death
```

## 19. Agent Rules

1.  **Preserve Current Feel**：多人改造不能明显降低 Movement、Mouse Aim
    和 Animation responsiveness。
2.  **Server Authoritative**：Server 最终决定 Position；未来决定
    Hit、Damage、HP、Skill、Ultimate、Death、Winner。
3.  **Client Presentation**：Client 负责
    Input、Rendering、Animation、VFX、UI、Interpolation、Prediction。
4.  **Avoid Overengineering**：不要提前加入 ECS rewrite、Rollback
    Netcode、Binary
    Protocol、Database、Redis、Microservices、Matchmaking Backend、Cloud
    Infrastructure。
5.  **Keep Project Playable**：每个 Milestone
    完成后项目必须仍可运行，不要连续重构大量内容后才测试。

## 20. Core Statement

本阶段不是"实现完整多人游戏"。

本阶段的任务是：

> **证明两台真实电脑能够稳定、流畅地共享同一个 Phaser
> 游戏世界，同时保留当前单机版的操作手感。**

验证成功以后，再逐层把已经存在的单机 Combat System 迁移到 Server
Authoritative Multiplayer Architecture。
