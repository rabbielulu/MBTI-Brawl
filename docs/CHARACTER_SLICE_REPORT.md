# 角色 Vertical Slice 验收记录

日期：2026-10-23。依据 `MBTI_BRAWL_16_PERSONALITIES_CHARACTER_DESIGN_AGENT_SPEC_V0.1.md` 第 26、38、39 节，本轮完成共享框架和 ENTP、INFP、ESTJ、ESTP，停止扩展其余人格。

## 1. Modified Files

新增：

- `src/shared/characters/CharacterDefinition.ts`：角色、技能、特质和表现数据类型。
- `src/shared/characters/CharacterDatabase.ts`：四人格共享定义、数值、梗文案、可用人格校验。
- `server/combat/SkillSystem.ts`：技能、大招、状态、冲刺命中、定时区域和冷却返还。
- `server/combat/StatusEffects.ts`：状态添加 / 刷新 / 查询。
- `tests/characters.ts`：四套角色服务端规则及共用预测测试。
- `tests/character-network.ts`：真实四连接、技能/大招/区域/状态同步测试。
- `docs/CHARACTER_SLICE_REPORT.md`：本报告。

修改：`server/GameRoom.ts`、`server/GameServer.ts`、`server/combat/CombatResolver.ts`；`src/shared/NetworkProtocol.ts`、`GameConstants.ts`、`Movement.ts`、`combat/CombatTypes.ts`；`src/characters.ts`；`src/client/network/NetworkClient.ts`；`src/client/input/DesktopInputAdapter.ts`、`MobileInputAdapter.ts`、`TouchState.ts`；`src/main.ts`、`src/light.css`；`tests/network.ts`、`tests/touch-input.ts`；`scripts/host.mjs`、`package.json`、`README.md`。生产 `dist/` 重新构建。

## 2. Character Framework

Client / Server 共用 CharacterDefinition → Basic Attack / Skill / Ultimate / Trait / Presentation。人格定义集中维护，服务端读取战斗数值；客户端使用相同定义生成选择入口、人格档案、攻击间隔、瞄准方式、颜色、道具、文字弹和技能表现。旧单人 ENTP 保留原训练逻辑，避免无意改动已验收的训练模式；新套件用于 LAN。

## 3. Reusable Gameplay Primitives

复用已有 Projectile / Melee Hitbox / Knockback / swept Movement / authoritative Damage。增加 Directional Dash、Buff / Debuff、Damage Reduction、Timed AoE、Repeated Zone、Slow、Cooldown Refund，以及轻量人格特质计算。技能使用 primitive + params；特殊行为仅保留委屈伤害公式、肾上腺素刷新冲刺等少量分支。没有提前实现 Beam / Turret / Teleport 等本轮用不到的系统。

## 4. ENTP Implementation

紫色辩论姿态、话筒、带文字的对话框弹。普攻随机梗来自数据表；「你说得不对」发射大 Actually 弹，破防持续 4 秒；「我不是针对谁」连续 3 轮径向语言冲击波。攻击破防目标获得 1.5 倍实际伤害能量。大招伤害不自行回能。

## 5. INFP Implementation

绿色火柴人、小心心、收臂姿态、受击委屈表情。开启「没事，我没事」获得 3 秒 50% 减伤，实际承伤转为委屈值，最高 60。「我忍你很久了！」伤害 = 30 + 已损失生命 × 0.4 + 委屈 × 0.5，释放时清空委屈。血量越低，普攻/技能伤害转能量倍率越高，理论上限 1.75。状态光圈、委屈数值同步展示。

## 6. ESTJ Implementation

蓝色会议指挥姿态、文件夹弹、文件板。Deadline 创建 125 半径地面区域，清楚显示倒计时，3 秒后 28 伤害并减速 35% / 2 秒。KPI 场半径 190，持续 3 秒、共 6 次 10 伤害。区域命中至少两个敌人时，返还 1.5 秒技能冷却（KPI 每个命中周期分别判定）。地面位置由服务端限制在 280 距离与场地边界内。

## 7. ESTP Implementation

黄色头带、拳头、前倾冲刺姿态。普攻为扇形近战；WOOOOOO! 方向冲刺约 260 距离，18 伤害并强击退，同次冲刺对同一人只命中一次。共用 swept 碰撞防穿墙，撞掩体停止；命中前检查掩体，避免薄墙后误伤。命中每名敌人返还 0.6 秒冲刺冷却。「再来！」持续 6 秒，立即刷新一次冲刺，期间冲刺冷却 1 秒。

本地技能按下先预测约 100ms 冲刺，收到权威冲刺 / 冷却后交回快照；其后仍按共享 movement 预测与位置校正。伤害始终由服务器决定。

## 8. Shared Network Protocol Changes

协议版本 4，最多 4 人 P1–P4。握手新增 mbti，服务器仅接受四个已开放人格。输入沿用事件布尔值，增加可选 targetX / targetY（区域目标而非客户端自身坐标），验证有限数值并限制施法距离。输入合并保留未消费技能目标，避免后续移动包覆盖。

玩家快照增加技能剩余冷却、委屈值、状态列表及到期 tick、移动速度、冲刺速度/角度/结束 tick。快照新增 zones；弹丸增加 glyph 与易伤时长。独立 CombatEvent 增加 cast（技能名称、大招标记、范围），命中与死亡事件保持服务端产生。重置 / 死亡 / 断线清理均包含技能状态。HP、能量、特质、冷却、命中、区域 tick 和死亡仍为 Server Authoritative。

## 9. Mobile Input Compatibility

ENTP / ESTP direction，INFP none，ESTJ position。双摇杆与 PC 产生同一输入结构。位置技能拖动方向与幅度决定范围，松手释放；ESTJ 大招按钮可拖动瞄准，轻点沿当前瞄准方向取最大距离。INFP 防御技能直接点击。移动与攻击指针保持独立。

LAN 不再禁用技能/大招按钮；冷却、能量和死亡状态决定可用性。设置可打开人格档案；横屏、safe-area、全屏按钮及禁双击放大逻辑保留。失焦、转屏、弹窗、死亡清空操作。

## 10. Known Issues

- 真实 iOS / Android 和跨设备无线延迟需由用户继续试玩；自动化不能代替真人对角色笑点与可读性的评价。
- 四角色新能力只接入 LAN；旧单机 ENTP 数值仍独立。
- 区域伤害允许跨掩体影响范围内角色（爆炸范围规则）；冲刺、弹丸、近战检查掩体。
- 同一时刻先处理大招再处理技能；同时按两者时 ESTP 可立即接刷新后的冲刺。
- 大招不回充能量；活着施放但随后死亡会取消区域后续伤害周期，已发射的弹丸仍按原规则飞行。
- 高延迟预测尚无完整输入回放；多个后台 WebGL 页在验收浏览器中发生过上下文回收，刷新可恢复。单页横屏重新加载后正常，未更换现有渲染引擎。
- 无 Lobby / 重连 / 胜负、无声效、无最终数值平衡。Phaser 包体仍有构建提示。

## 11. Balance Values

统一 HP 100、步行 245、能量上限与大招消耗 100；泥潭步行倍率 0.5。

| 人格 | 普攻伤害 / 间隔 | 技能 CD | 核心数值 | 大招 |
| --- | --- | --- | --- | --- |
| ENTP | 12 / 300ms | 5.5s | 20 伤害，易伤 ×1.5 / 4s | 16 × 3，半径 260，击退 260 |
| INFP | 10 / 350ms | 6s | 减伤 50% / 3s，委屈上限 60 | 30 + missingHP×0.4 + grievance×0.5，半径 280 |
| ESTJ | 11 / 330ms | 7s | 延迟 3s，28 伤害，半径 125，减速 35% / 2s | 10 × 6，半径 190，持续 3s |
| ESTP | 10 / 260ms | 5s | 900 速度 / .29s，18 伤害，击退 420 | 6s 强化，冲刺 CD 1s |

服务器按 30Hz tick 向上取整冷却与持续时间。普通有效攻击约 9–10 次击倒，不视为最终平衡。

## 12. Playtest Instructions & Results

自动化已通过：TypeScript、Vite 生产构建；旧单机战斗；1,000 张随机地图；触控死区 / 独立指针 / 取消 / 事件 / 类别攻击间隔 / 区域模拟幅度；原战斗 20 轮交替击倒重置；双连接移动 / 伤害 / HP / 能量 / 击退 / 重置；四席位上限；四套角色减益 / 减伤 / 委屈 / 低血量 / 区域时序 / 冷却返还 / 穿墙 / 大招门槛；四 Socket 同时技能与大招、事件顺序、状态 / 区域 / 冷却 / 能量同步、重置与非法人格拒绝。

浏览器已检查：1280×720 人格入口、2 人和 4 人逐一加入、四个人格同屏；PC ESTJ 右键区域提示；PC ESTP 冲刺命中使自身获得 18 能量，对手 HP 100→82；844×390 横屏触控布局、ESTJ 触屏拖动后出现 Deadline 倒计时并进入冷却。保存截图见 `artifacts/character-slice/`。未声称已做真实手机或真人反馈测试。

人工 LAN 验收：

1. 重启 Host，所有页面刷新。先两人，再四人，各选一种人格。
2. ENTP：先 Actually 破防，再普攻；观察双方相同状态、伤害增幅、能量。
3. INFP：开防御承伤，观察委屈；低血量攒满大招，核爆后委屈与能量归零。
4. ESTJ：两人站入 Deadline，确认 3 秒后一起扣血、减速，冷却返还；离开 KPI 应不再受周期伤害。
5. ESTP：对着空地、掩体、两名敌人分别冲刺，确认停墙、单人单次命中和冷却返还；满能量大招后连续冲刺，6 秒后恢复普通冷却。
6. PC + 手机横屏混合对战，验证移动同时瞄准、方向技能松手、INFP 点击防御、ESTJ 指定区域与拖动大招。
7. 击倒 / 重置 / 退出，确认无残留区域、状态、能量或卡住指针。
8. 让玩家回答：不看名字像什么性格？哪个技能好笑、最好懂？会主动制造什么节目效果？想换谁？这些真人答案目前待收集。

## 13. Remaining 12 Character Implementation Plan

仅计划，未实现：

| 批次 | 人格 | 复用基础与新增最小能力 |
| --- | --- | --- |
| 控场 | ENTJ、ENFJ、ESFP、ESFJ | 复用区域/击退/状态；新增定向推动、护盾、拉拽与拍照倒计时 |
| 标记与连击 | INFJ、ISTJ、ISFJ、ISFP | 新增目标标记、同目标计数、近战反击；复用减伤/增益/区域 |
| 特殊玩法 | INTJ、INTP、ENFP、ISTP | 新增放置/回传、预判位置、服务端随机效果、炮台实体与自动选敌 |

每批仍按数据定义 → 服务端规则 → 桌面/触控表现 → 2/4 人同步 → 真人笑点反馈验收，不加入同色协同、装备、成长或复杂被动树。本轮在四角色 Slice 停止。
