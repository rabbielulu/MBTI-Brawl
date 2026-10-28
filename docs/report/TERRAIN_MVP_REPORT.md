# 随机地形 MVP 验证

依据 docs/TERRAIN_SYSTEM_MVP.md 实现。配置位于 src/shared/terrain/TerrainConfig.ts，出生点选择在 SpawnManager.ts，生成器与校验器位于 src/terrain.ts。

- 固定边界，8 个外围预设点；少人均匀选取。兼容现有最多 16 席。有效出生点安全半径 105，环境的保守包围盒均不能侵入。
- 六种 Profile 及文档中的默认权重、数量范围、三级尺寸和预算成本。最多预算 30，每元素最多尝试 20 次，失败跳过；优先为后续类型预留最小预算。连通性以膨胀障碍的 28 单位网格检查，所有有效出生点互通。区域采用不规则多边形，保守包围盒限制重叠，实际允许范围比30%更严格。
- 泥潭 60% 行走移速，离开立即恢复；毒区按服务器30Hz累计每秒最大生命5%，重叠毒区不叠层，泥潭和毒区可同时作用。通过正常 Damage Resolver，明确 environment 来源、伤害统计、死亡事件，不给人格能量或击杀奖励；显示生命值取整，避免小数噪声。环境视觉不触发角色弹丸文案或持续震屏。
- 普攻由障碍阻挡，投射物和技能定义可配置 canPenetrateObstacle。移动保留原有扫掠碰撞。
- Host 生成并广播完整 Terrain 数据及 seed；客户端不重掷。默认肤色/名称为功能名称，独立 Skin Pool 可扩展；皮肤随机流与地形随机流分离，换皮不改变碰撞几何。
- 开场为1.5秒全图总览、3秒倒计时、FIGHT。移除旧的开战后2秒出生保护；总览和倒计时仍禁止行动。手机总览居中显示完整地图，标签缩小避免挡住战场。
- 试炼入口展开“地形调试”，可指定种子和强制 Profile。固定种子重置复现同图，未指定则生成新图。F3 显示 seed、Profile、预算、安全圈和碰撞范围。正式房间不开放远程任意重生成。

## 验证结果

- TypeScript、Vite build 通过。
- tests/terrain-mvp.ts：300种子可复现、安全、预算、边界、连通；前20局14种元素数量组合；110局泥潭、58局毒区、2局三种元素齐全。强制Chaos种子42可生成三种元素；候选放置失败时允许少于Profile目标数量，按文档跳过。
- 验证60%移动、离开恢复、5%最大生命DPS、毒区死亡、普通子弹阻挡、可配置穿透、人物阻挡和Skin不改变几何。
- tests/terrain-network.ts：双客户端地图完全一致、种子重放、有效出生数量、非法种子拒绝、强制组合及重置复现通过。
- tests/practice-flow.ts、tests/results.ts、tests/combat-sixteen.ts、tests/match.ts、tests/match-network.ts、tests/debug-start.ts、tests/lobby.ts 通过。16角色6000tick压力测试通过。
- 浏览器1440×1024及390×844：指定Chaos/42、重置、F3碰撞调试、总览居中和不遮挡、退出通过，错误日志为空。截图在artifacts/terrain/。

协议升级15，本机Host已更新。未自动推送GitHub。

## 后续调整
按用户反馈取消总览步骤及镜头切换，地图准备后直接3秒倒计时，再FIGHT；TypeScript、构建及回车开赛回归通过。
