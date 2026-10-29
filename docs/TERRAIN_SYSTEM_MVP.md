# MBTI 大乱斗｜随机地形与环境系统 MVP

> 后续可破坏掩体规则以 [TERRAIN_SYSTEM_MVP (1).md](<TERRAIN_SYSTEM_MVP (1).md>) 为准：小 / 中 / 大掩体满血时普攻 2 / 3 / 5 下击碎，显示渐进裂纹，隐藏血条。本文保留初版地形方案。

## 1. 功能目标

为多人乱斗模式增加随机地形系统。

每次创建新对局时，根据随机规则生成不同的战场环境，使玩家每局需要根据障碍物、减速区域和伤害区域调整移动与战斗策略。

本阶段采用：

> **固定地图边界 + 随机环境元素**

不进行程序化地图轮廓生成。

MVP 仅实现三种环境 Gameplay：

1. Obstacle / 障碍物
2. Mud / 泥潭
3. Toxic Area / 有毒区域

每局不要求三种元素同时出现。

可能出现：

- 只有障碍物
- 障碍物 + 泥潭
- 障碍物 + 毒区
- 泥潭 + 毒区
- 三种同时存在
- 极少环境元素的空旷地图

## 2. 系统设计原则

### 2.1 每局不同

随机内容包括：

- 环境元素类型
- 元素数量
- 元素位置
- 元素尺寸

### 2.2 随机但公平

不能完全使用无约束 Random Position。

必须保证：

- 玩家不会出生在危险区域
- 出生点不会被障碍堵死
- 地图必须保持基本可通行
- 危险区域不能覆盖过大
- 不允许生成明显不公平的出生环境

### 2.3 Gameplay 与 Visual 分离

Gameplay 类型与视觉表现需要分离。

例如：

```text
Gameplay Type:
Mud

Visual Skin:
周一
```

未来可以只增加视觉 Skin，而无需增加新的 Gameplay 逻辑。

## 3. 地图基础结构

当前 MVP 使用一张固定尺寸的矩形战斗地图。

地图本身不随机改变：

- 外轮廓
- 基础尺寸
- 边界

随机改变的是地图内部环境。

地图尺寸需要通过配置定义，不要硬编码在随机生成逻辑中。

## 4. 玩家出生系统

### 4.1 Spawn Point

地图外围预设 Spawn Point。

8 人模式默认准备 8 个出生点。

Spawn Point 本身不是随机生成。

### 4.2 玩家数量不足 8 人

如果玩家不足 8 人，优先选择空间距离较远、分布均匀的 Spawn Point。

不要完全随机选择连续相邻的出生点。

需要提供：

```text
SpawnManager
```

负责根据当前玩家数量返回尽量均匀的出生点组合。

## 5. Spawn Safe Zone

每个有效 Spawn Point 周围建立：

```text
SpawnSafeRadius
```

该范围属于环境生成禁区。

禁止生成：

- Obstacle
- Mud
- Toxic Area

目的：

- 防止出生即掉血
- 防止出生即减速
- 防止玩家被障碍卡住

`SpawnSafeRadius` 必须作为配置参数暴露。

MVP 暂时不实现出生无敌机制。

## 6. Obstacle / 障碍物

障碍物用于：

- 阻挡玩家移动
- 改变追逐路径
- 制造走位空间
- 为技能攻击创造遮挡关系

数量：

```text
Min: 0
Max: 5
```

### 6.1 Collision

玩家：

```text
Cannot Pass
```

普通攻击：

```text
Blocked By Obstacle
```

技能攻击由技能自身配置决定是否穿透障碍。

预留：

```text
CanPenetrateObstacle
```

属性。

不要在 Obstacle 内硬编码所有攻击行为。

## 7. Obstacle Size

障碍尺寸不要使用完全连续随机。

MVP 使用：

- Small：1.0
- Medium：1.5
- Large：2.0

具体尺寸必须可配置。

## 8. Mud / 泥潭

Mud 是减速区域。

进入 Mud：

```text
MoveSpeedMultiplier = 0.6
```

即移动速度降低 40%。

离开：

```text
MoveSpeedMultiplier = 1.0
```

立即恢复。

MVP 暂不实现逐渐减速、惯性、技能 CD 变化、攻击速度变化、复杂 Debuff 等。

## 9. Toxic Area / 有毒区域

Toxic Area 是持续伤害区域。

进入后：

```text
DamagePerSecond = MaxHP * 0.05
```

即每秒损失最大生命值 5%。

离开后立即停止持续伤害。

毒区伤害需要走正常 Damage System，建议使用：

```text
DamageSource.Environment
```

不要直接修改 HP，为未来死亡原因和战绩统计预留空间。

## 10. Area Size

Mud 和 Toxic Area 使用统一区域尺寸系统：

- Small：约占地图 3–5%
- Medium：约占地图 6–9%
- Large：约占地图 10–15%

实际实现可通过预设 Collider / Radius 实现，不要求严格实时计算面积百分比。

## 11. Terrain Profile

每局首先随机一个：

```text
TerrainProfile
```

MVP 创建 6 种 Profile：

| Profile | Obstacle | Mud | Toxic |
|---|---:|---:|---:|
| Open | 0–1 | 0 | 0 |
| Normal | 2–3 | 0–1 | 0–1 |
| Maze | 4–5 | 0–1 | 0 |
| Muddy | 1–3 | 1–2 | 0 |
| Toxic | 1–3 | 0 | 1–2 |
| Chaos | 2–5 | 1–2 | 1–2 |

## 12. Profile Probability

默认概率：

```text
Open       10%
Normal     30%
Maze       15%
Muddy      15%
Toxic      15%
Chaos      15%
```

概率必须配置化，不要写死在 Generator 中。

建议：

```text
TerrainProfileConfig
{
    profileType
    probability
    obstacleMin
    obstacleMax
    mudMin
    mudMax
    toxicMin
    toxicMax
}
```

## 13. Hazard Budget

增加统一：

```text
HazardBudget
```

防止随机生成过于复杂或危险的地图。

默认：

```text
MaxHazardBudget = 30
```

默认 Cost：

| Element | Cost |
|---|---:|
| Small Obstacle | 2 |
| Medium Obstacle | 3 |
| Large Obstacle | 5 |
| Small Mud | 4 |
| Medium Mud | 6 |
| Large Mud | 9 |
| Small Toxic | 6 |
| Medium Toxic | 9 |
| Large Toxic | 12 |

如果 `CurrentBudget + ElementCost > MaxHazardBudget`，则拒绝当前元素，尝试其他合法元素或结束生成。

## 14. Environment Overlap

允许环境之间发生有限重叠。

- Obstacle + Mud：允许
- Obstacle + Toxic：允许，但不能完全封死通路
- Mud + Toxic：允许部分重叠

Mud + Toxic 重叠区域两个效果同时生效：

```text
Move Speed -40%
MaxHP -5% / Second
```

默认：

```text
MaxOverlapRatio = 30%
```

重叠面积不得超过较小区域面积约 30%，数值配置化。

## 15. Environment Generation

每次创建 Match：

```text
Create Match
↓
Initialize Map
↓
Select Active Spawn Points
↓
Create Spawn Safe Zones
↓
Roll Terrain Profile
↓
Generate Obstacles
↓
Generate Mud Areas
↓
Generate Toxic Areas
↓
Validate Map
↓
Apply Environment Skins
↓
Match Ready
↓
Start Match
```

## 16. Placement Validation

每次生成候选位置后调用：

```text
ValidatePlacement()
```

至少检查：

- 不进入 SpawnSafeRadius
- 元素完整位于地图合法区域
- 障碍之间满足 MinObstacleDistance
- 障碍不能完全切断地图
- 不超过 MaxHazardBudget
- 环境重叠符合规则

MVP 可采用简单规则验证，不要求复杂 NavMesh 分析。

## 17. Failed Placement

每个元素设置：

```text
MaxPlacementAttempts = 20
```

如果连续 20 次无法找到合法位置：

```text
Skip Current Element
```

禁止无限 `while(true)`，避免阻塞 Match 创建。

## 18. Environment Skin System

Gameplay 与表现分离。

```text
EnvironmentGameplayType
- Obstacle
- Mud
- Toxic
```

对应独立的：

```text
EnvironmentSkin
```

示例：

```text
Gameplay:
Mud

Skin:
周一
```

Gameplay 保持移动速度 -40%，Visual 显示「周一」。

可扩展 Skin Pool：

Mud：
- 周一
- 社交场合
- 加班
- 已读不回

Toxic：
- 无效会议
- 被迫团建
- 甲方修改意见

Obstacle：
- 成年人的责任
- Deadline
- KPI

当前 MVP 不要求完成大量 Skin，只需建立 Skin Pool 能力。

## 19. Match Intro

地图生成完成后不要立即开放玩家控制。

流程建议：

```text
Map Generated
↓
Overview 1–2 Seconds
↓
3
2
1
↓
FIGHT
```

Overview 后续可显示本局特殊环境。

MVP 如果 UI 尚未完成，可先只实现 Overview Camera → Countdown → Gameplay。

## 20. 推荐数据结构

```text
TerrainManager
├── TerrainGenerator
├── SpawnManager
├── TerrainValidator
├── HazardBudgetManager
└── EnvironmentSkinManager
```

### TerrainProfileConfig

```text
profileType
probability
obstacleMin
obstacleMax
mudMin
mudMax
toxicMin
toxicMax
maxHazardBudget
```

### EnvironmentConfig

```text
gameplayType
sizeType
scale
hazardCost
damagePerSecond
moveSpeedMultiplier
minSpawnDistance
minElementDistance
maxPlacementAttempts
```

可根据当前项目架构调整。

## 21. Random Seed

Terrain Generator 支持：

```text
RandomSeed
```

同一个 Seed 应产生相同 Terrain Result。

用途：

- Debug 时复现异常地图
- 多人同步
- 自动化测试

不要依赖每个客户端各自独立调用 Random。

## 22. Multiplayer Authority

随机地形结果必须拥有唯一权威来源。

推荐由：

```text
Server / Host
```

负责 Generate Terrain。

之后同步 TerrainSeed 或 GeneratedTerrainData 给其他玩家。

客户端不能自行决定障碍、Mud、Toxic 的位置、尺寸、类型和 Skin。

## 23. Debug Mode

建议 Debug 信息支持显示：

- Seed
- Terrain Profile
- Hazard Budget Current / Max
- Spawn Safe Radius
- Obstacle Collider
- Mud Collider
- Toxic Collider

支持：

```text
Regenerate Terrain
Force Profile
```

例如：

```text
ForceProfile = Chaos
```

方便测试极端情况。

## 24. MVP 默认参数

```text
Obstacle Count: 0–5
Mud Count: 0–2
Toxic Count: 0–2

Mud Move Speed: 60%
Toxic Damage: 5% MaxHP / Second

Mud/Toxic Max Overlap: 30%

Max Hazard Budget: 30
Max Placement Attempts: 20
```

Profile：

```text
Open       10%
Normal     30%
Maze       15%
Muddy      15%
Toxic      15%
Chaos      15%
```

所有主要参数尽可能配置化。

## 25. 本阶段明确不做

MVP 暂时不要实现：

- 缩圈
- 动态毒圈
- 地图尺寸动态变化
- 多张地图
- 程序化地图轮廓
- 可破坏障碍
- 移动障碍
- 冰面
- 弹跳区域
- 传送门
- 环境机关
- 地形随时间变化
- Mud 复杂 Debuff
- Toxic 叠层伤害
- 出生无敌
- 环境元素动态生成/消失

## 26. Acceptance Criteria

- AC01：连续创建 20 局游戏，可以明显观察到不同环境组合。
- AC02：存在完全没有 Mud / Toxic 的 Open 地图。
- AC03：存在三种元素同时出现的 Chaos 地图。
- AC04：玩家不会出生于 Mud 或 Toxic Area。
- AC05：玩家不会出生于 Obstacle Collider 内。
- AC06：Mud 中移动速度降低 40%，离开后恢复。
- AC07：Toxic Area 每秒造成最大生命值 5% 的伤害。
- AC08：Mud + Toxic 重叠区域两个效果同时生效。
- AC09：环境生成不会超过 Hazard Budget。
- AC10：无法找到合法生成位置时不会卡死 Match Loading。
- AC11：相同 Random Seed 可以复现相同地图。
- AC12：多人客户端看到的环境位置、尺寸和类型一致。
- AC13：Obstacle 能正确阻挡玩家。
- AC14：普通攻击与 Obstacle 的遮挡关系正确。
- AC15：Terrain Profile、概率和主要 Gameplay 参数可通过配置修改，无需修改核心 Generator 代码。

## 27. 实现优先级

```text
P0
固定地图
Spawn Point
Spawn Safe Zone

↓

P1
Obstacle
Mud
Toxic

↓

P2
Terrain Profile
Random Generator

↓

P3
Placement Validation
Hazard Budget

↓

P4
Random Seed
Multiplayer Sync

↓

P5
Environment Skin

↓

P6
Overview / Countdown

↓

P7
Debug Tools
```

第一阶段重点验证：

> **随机地图是否真的能够改变玩家的移动、追逐和战斗决策。**

不要优先投入环境美术包装。

## 28. 核心设计目标

随机地形系统不是为了制造复杂地图。

它的核心目标是：

> **让同一组 MBTI 角色，每一局因为空间环境不同而产生不同的战斗故事。**

角色系统负责制造人格冲突。

地形系统负责制造意外。

希望最终自然产生：

> “他本来都快死了，结果我踩进泥潭被他反杀了。”

> “我把他逼进毒区了。”

> “这一局全是障碍，根本追不到人。”

这类具有记忆点的随机战斗事件。
