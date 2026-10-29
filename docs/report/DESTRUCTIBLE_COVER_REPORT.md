# 可破坏掩体升级

依据 `TERRAIN_SYSTEM_MVP (1).md`，所有新生成掩体带稳定 coverId、初始/当前 HP 和状态。Small/Medium/Large HP 为 60/100/160，配置在 TerrainConfig。HP 不超过 50% 时显示裂纹，受伤显示血条；摧毁时释放 0.65 秒视觉碎屑。

服务器结算普攻、技能弹体、范围脉冲伤害。技能可配置 canDamageCover、coverDamageMultiplier、canPenetrateCover，兼容 canPenetrateObstacle。非穿透弹体击碎掩体后立即结束；穿透弹体对每个掩体最多结算一次，并沿用齐射命中上限。范围伤害按现有脉冲间隔结算。掩体 HP 为零时碰撞查询立即忽略，保留零 HP 状态供快照同步，无自动恢复。

完整掩体状态随每个 GameSnapshot 下发，客户端从权威快照更新预测碰撞和绘制。重连 welcome 包含当前状态；破碎事件仅负责表现。协议版本升级至 16，旧页面需刷新。毒区和泥潭不影响掩体 HP。沿用此前决定，不恢复战场总览步骤。

验证通过：TypeScript、Vite build、destructible-cover、terrain-mvp（300种子）、combat-sixteen（含6000 tick压力模拟）、terrain-network。新增测试覆盖破损阈值、即刻取消碰撞、致命弹体不穿到后方、范围脉冲去重、穿透弹去重和生成 HP 配置。多人网络回归验证相同地图与重置；尚未进行人工双浏览器破碎动画验收。

本地 Host 已重启至最新实现，入口 http://localhost:3000/。未提交或推送 GitHub。

## 耐久调整

按后续反馈，HP 调整为 Small 20 / Medium 30 / Large 50；每次有效普攻命中掩体统一造成 10 点伤害，以保证不同人格均为 2 / 3 / 5 下击碎。技能仍按自身伤害与掩体倍率计算。受伤即出现细裂纹，损伤达到 35% 增加主裂纹，65% 增加分支并加深加粗。新增固定命中次数测试通过，TypeScript 与构建通过。

最新表现调整：隐藏掩体血条及 HP 数字，保留渐进裂纹、破碎碎屑和服务器生命值同步。
