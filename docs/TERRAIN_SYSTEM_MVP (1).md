# MBTI 大乱斗｜随机地形与环境系统 MVP（可破坏掩体升级版）

## 1. 功能目标

为多人乱斗模式增加随机地形系统。

每次创建新对局时，根据随机规则生成不同的战场环境，使玩家每局需要根据障碍物、减速区域和伤害区域调整移动与战斗策略。

本阶段采用：

> **固定地图边界 + 随机环境元素**

不进行程序化地图轮廓生成。

MVP 仅实现三种环境 Gameplay：

1. Destructible Cover / 可破坏掩体
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

## 6. Destructible Cover / 可破坏掩体

**本版本所有障碍物均为可破坏掩体，不存在不可破坏的普通障碍物。**

掩体用于：

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

不要在 Cover 内硬编码所有攻击行为。

### 6.2 掩体生命值和状态

| 尺寸 | 默认 HP | 满血时普攻击碎次数 | 状态 |
|---|---:|---:|---|
| Small | 20 | 2 下 | 完整 / 破损 / 摧毁 |
| Medium | 30 | 3 下 | 完整 / 破损 / 摧毁 |
| Large | 50 | 5 下 | 完整 / 破损 / 摧毁 |

HP = MaxHP：完整；0 < HP < MaxHP：破损；HP ≤ 0：摧毁。

每次有效普攻命中掩体固定造成 10 点伤害，不受人格对玩家的普攻伤害差异影响。满血且仅受普攻时，小 / 中 / 大掩体分别在第 2 / 3 / 5 下击碎。技能仍按自身伤害及 CoverDamageMultiplier 结算，混合攻击后的击碎次数随剩余 HP 变化。

**掩体血条隐藏**，不显示 HP 数字；生命值仍由权威端维护并同步。通过渐进裂纹反馈耐久：

- 第一次受伤即出现细裂纹。
- 损失生命达到 35%：延长主裂纹并增加分支。
- 损失生命达到 65%：增加更多分支，裂纹加深、加粗。

配置位置：`src/shared/terrain/TerrainConfig.ts` 的 `coverHp` 和 `coverBasicDamage`。

### 6.3 命中与伤害

- 所有掩体均可受到普通攻击伤害。
- 技能支持 `CanDamageCover`、`CoverDamageMultiplier`、`CanPenetrateCover`。
- 默认非穿透弹体命中掩体后被阻挡；即使此次命中击碎掩体，也不继续命中后方玩家。
- 穿透技能按照其技能规则处理掩体和后方目标。
- 范围技能可同时影响掩体与玩家，但必须沿用技能的命中次数/伤害间隔规则，不能每帧意外重复扣血。
- 掩体不会承受毒区持续伤害，也不会因泥潭改变状态。

### 6.4 摧毁时序

1. 权威端结算本次伤害，掩体 HP 归零。
2. **立即关闭掩体的移动与攻击阻挡碰撞**，更新碰撞查询。
3. 广播摧毁事件并播放破碎动画、碎屑粒子。
4. 碎片仅为视觉效果，不造成伤害、不阻挡移动；约 0.4–0.8 秒消散。
5. 掩体本局永久消失，不恢复、不重生。

受击显示轻量碎屑，裂纹按 6.2 的受损阶段递增，不显示掩体血条。摧毁碎屑约 0.65 秒消散，仅为视觉效果。破碎视觉不应延迟 Gameplay 碰撞移除。

### 6.5 多人权威与同步

- 由服务器或现有权威主机统一维护 `coverId`、HP、破损状态和摧毁状态。
- 客户端只呈现权威结果；不可自行决定掩体是否摧毁。
- 生成结果需要包含稳定的 `coverId`、位置、尺寸、初始 HP。
- 伤害结算应防止同一命中事件重复处理；迟加入/重连玩家需获得当前存活掩体及 HP 快照。

### 6.6 性能与实现边界

当前 HTML 游戏优先使用简单几何碰撞体、状态贴图/裂纹叠层与轻量粒子，不做真实刚体碎裂、碎片碰撞或复杂物理模拟。

## 7. Cover Size

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
- AC16：所有生成的掩体都能被普通攻击击碎，不存在不可破坏的掩体。
- AC17：Small / Medium / Large 默认 HP 为 20 / 30 / 50；每次有效普攻固定造成 10 点掩体伤害，满血仅受普攻时分别在第 2 / 3 / 5 下击碎。首次受伤即显示细裂纹，损伤达到 35% / 65% 时裂纹逐步增多、加深、加粗，且不显示血条或 HP 数字。
- AC18：掩体 HP 归零后立即取消移动和攻击碰撞，破碎动画不阻挡玩家。
- AC19：非穿透攻击击碎掩体时不会在同一命中事件中继续伤害掩体后的玩家。
- AC20：范围攻击不会因逐帧碰撞而异常重复伤害掩体。
- AC21：多人客户端的掩体 HP、破损与摧毁状态保持一致；重连能同步最新状态。
- AC22：掩体碎片不造成伤害、不产生实体碰撞，摧毁后本局不重生。

## 27. 实现优先级

```text
P0
固定地图
Spawn Point
Spawn Safe Zone

↓

P1
DestructibleCover
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


## 29. 本次升级变更记录

- **决策**：所有掩体均可破坏（方案 A）。
- 将原 `Obstacle` 玩法升级为 `Destructible Cover`；保留原有 0–5 数量、S/M/L 尺寸、地形随机生成、出生安全区、Hazard Budget 与 Profile 权重。
- 新增掩体 HP、伤害交互、破损表现、摧毁碰撞时序、多人同步与验收项。
- **仍不做缩圈**，也不做掩体重生、物理碎片或额外碎片伤害。
- 对现有代码优先复用 Obstacle 结构与序列化字段，避免破坏旧版地图配置；可使用兼容映射将 `Obstacle` 识别为可破坏掩体。

### 2026-10-29 耐久与受损反馈调整

- 将原 60 / 100 / 160 HP 调整为 20 / 30 / 50 HP，统一普攻掩体伤害为 10，实现 2 / 3 / 5 下击碎。
- 将单一半血裂纹升级为首次受伤、损伤 35%、损伤 65% 的渐进裂纹。
- 隐藏掩体血条，保留权威 HP、裂纹、破碎碎屑与即时碰撞移除。
