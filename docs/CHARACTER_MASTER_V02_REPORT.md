# 16 人格 Combat Master V0.2 实施报告

依据 `MBTI_BRAWL_16_PERSONALITIES_COMBAT_MASTER_SPEC_V0.2.md`。文档即时范围为四人格；本轮按用户明确要求扩展至全部 16 人格，复用同一套战斗系统。仍是每房间 8 人，未改为 16 人同场。

## 已实现

| 人格 | 核心战斗行为 |
|---|---|
| INTJ | 棋子普攻、二次施法回传、离开位置爆炸、预测位置轰炸、低血冷却缩短 |
| INTP | 摇摆问号、短暂思考后服务端随机增益、思考区域轻微方向干扰、蓄力普攻 |
| ENTJ | 快速指令弹、前方强推、短暂强制移动、推动成功后加速 |
| ENTP | 文字弹、15% 破防、12 枚径向语言弹、减益目标回能加成 |
| INFJ | 细长眼睛弹、仅施法者受益的弱点标记、有上限的标记延长、延迟审判 |
| INFP | 心形弹、30% 减伤与委屈积累、有上限的残血爆发、低血回能 |
| ENFJ | 鼓励波、360° 推开与人数护盾、加速增伤和跟随鼓励波 |
| ENFP | 固定伤害的随机外观普攻、五种随机技能、四种随机大招、不同效果奖励 |
| ISTJ | 标尺弹、同目标有限叠伤、换目标清空、三连击回能、SOP 攻速与弹速 |
| ISFJ | 近战盾击、护盾减伤与限频近战反击、巨盾冲击、连续受击护盾强化 |
| ESTJ | 文件夹弹、三秒 Deadline、KPI 周期区域、额外命中有限冷却返还 |
| ESFJ | 邀请函弹、附近拉拢、拉拢后延迟合照爆炸、人数回能加成 |
| ISTP | 旋转扳手、有限寿命自动炮台、巨型炮台与结束爆炸、限频命中返还 |
| ISFP | 近战画笔、加速与视觉淡出、下一击强化、艺术区域加速加射程、独处加速 |
| ESTP | 近战拳头、冲刺碰撞、冲刺狂热、每次冲刺首次命中返还 25% 冷却 |
| ESFP | 短音浪、360° 推开、跟随聚光音环、多目标有限回能 |

## 角色框架与共用机制

- `CharacterDefinition` / `CharacterDatabase` 为全部 16 型提供普攻、技能、终极技能、Trait、AimMode 与参数。
- `SkillSystem` 统一管理弹丸、近战、区域、定时区域、冲刺、传送、标记、护盾、伤害减免、增减益、推拉、短暂强制移动、服务端随机、追踪小鸡、炮台、反击、连续命中与冷却返还。角色记忆存储在服务端，不创建 16 套战斗系统。
- 普攻和命中通过统一 damage hooks 处理标记、叠层、增伤、护盾、反击与 Trait。反击不会再次触发反击。
- 重置 / 新比赛清空角色记忆、标记、弹丸命中组、炮台、区域、护盾、冷却与状态。离开后清理所属区域和自己施加的标记。
- 满血 100，能量 100；实际伤害回能。无伤害的大招效果也由服务器计时。大招伤害弹丸 / 区域不会给自身充满能量。

## 表现架构

- `CharacterPresentation` 补齐全部人格的四组配色、Emoji 道具、技能符号、受击符号、Meme、台词与姿态。
- 继续复用 `CombatSymbol`、`CombatText`、`FrameTextPool`；无每角色独立渲染器。Emoji 池上限 128，文字池保持原有上限与清理机制。
- Geometry VFX 复用预警圈、冲击环、方向线和拖尾；增加棋子标记、预测网格 / 预测线、几何炮台、艺术涂色与追踪小鸡。碰撞仍以服务器几何为准。
- 火柴人按 pose 呈现冷静、思考、争论、表演等姿态；ISFP 淡出保留可见轮廓，未做真实隐身。
- ENFP 普攻外观可以随机变化，伤害始终固定。技能 / 大招具体随机结果通过服务端 cast outcome 事件展示；结果事件不重复计为技能使用次数。
- 大厅开放全部 16 人格，角色卡展示各自的普攻、技能、大招、Trait 与冷却；全部人格具备胜利台词。结算名场面继续使用紧凑文字列表。

## 协议与服务端权威

协议升级至 **12**，刷新前端并重启 Host。`MBTIType` 扩展到 16；新增可序列化状态、来源标记、护盾、弹丸来源 / 命中组、跟随区域和炮台参数。事件复用既有 cast / damage / death 流。

客户端仅发送移动、瞄准和施法意图。随机选择、伤害、能量、冷却、护盾、标记归属、反击间隔、击退、死亡和爆炸时机均由 Host 决定。客户端伪造 damage / shield / randomOutcome 字段被忽略。

## 手机兼容

技能和大招均配置 none / direction / position；沿用相同输入适配器。方向大招支持拖动，位置大招按自身配置范围进行鼠标或摇杆选点；不再依赖人格技能是否也为位置模式。速射状态同步调整桌面输入节奏；服务端仍检查真实冷却。方向干扰与短暂强制移动也用于本地移动预测。

浏览器已验证 390 × 844 人格界面不横溢、16 个选项均存在，以及 844 × 390 下双摇杆、技能、大招的布局。此为 CSS 尺寸预览，未完成 Android / iOS 真机触控验收。

## 上限

- INFP 情绪爆发基础公式封顶 75。
- ENFJ 护盾最多计算 4 人；全局护盾上限 50。
- INFJ 标记最多延长 2 秒，且仅标记者增伤。
- ENTP 同次语言弹对单个目标最多命中 3 枚，避免贴身吃满 12 枚瞬杀。
- ISTJ 叠层最多 4 层，ISFJ 护盾加成最多 30%、反击间隔 0.8 秒。
- ESFJ 人数回能最多计算 4 人；ESFP 单次额外回能最多 9。
- ESTJ 单次 Deadline 冷却返还最多 2 秒；ISTP 每秒最多返还 0.6 秒。
- 每人最多同时拥有 1 座普通炮台和 1 座巨型炮台，持续 6 / 4 秒；追踪小鸡每人最多 1 只。炮台目标点落入障碍物时向附近安全位置校正。
- INTP 干扰仅短暂偏转 0.28 弧度；ENTJ 强制移动仅 0.6 秒。

## 验证

- TypeScript、生产构建通过；原有 Phaser 体积警告仍在。
- `tests/combat-sixteen.ts`：16 型施法与重置、全部随机分支、专属标记、传送、反击、防护、连续命中、推拉、炮台寿命 / 返还、射程与上限；贴身语言弹伤害上限。
- 同测试进行了两组八机器人共 6,000 tick 模拟：状态有限且对象有界，本次峰值弹丸 20、区域 13。此为服务器模拟，不代表真机 FPS。
- `tests/sixteen-network.ts`：16 个真实 Socket.IO 客户端分两间八人房，检查全部人格握手、技能同步、客户端伪造字段无效与房间隔离。
- 回归通过：characters、character-network、multiplayer-combat、bots（16 型绕墙移动攻击）、lobby-network、rematch、match-network、results、projectile-timeline、spectator、touch-input、presentation。
- 桌面真实 UI：选择 ISTP，与另一个真实浏览器 INTJ 同房开战，释放炮台与棋子并观察同步；人格展示和冷却正常。截图位于 `artifacts/characters-v02/`。

## 手动测试

1. 重启 Host、刷新所有设备，进入多人房间，在角色选择中选择任意人格。
2. N 添加机器人；2 人以上 Enter 快速开战，等待出生保护结束。
3. PC 左键普攻、右键技能、空格大招；手机在设置开启触屏，横屏操作。
4. INTJ 第一次右键放棋子，移动后再次右键回传；INFJ 先标记，再观察自己对标记目标的伤害。
5. ISTP 放炮台，观察最近目标追击射击及到期消失；ENFP 反复施法观察不同随机结果。
6. 打满能量测试大招，结算后再来一局更换人格，确认无上一局残留状态。

## 限制和后续

16 型均已接入多人模式，原文“剩余 12 人格”本轮已完成。后续重点为实机手感、平衡和平台 Emoji 兼容测试，而非继续增加技能系统。单人旧训练仍仅 ENTP；本轮的新战斗规则以多人 Host 为准。小鸡采用有限寿命的直接追踪、遇障碍受阻，没有独立寻路。机器人会用所有技能，但不具备完整的角色战术策略。尚未进行跨平台 Emoji GOOD / ACCEPTABLE / BAD 全量真机评估及长期客户端 FPS / 内存测试。无团队、装备、成长、排位或 16 人同场扩展。

本轮修改保留在本地，未推送 GitHub。

## 当前配置数值

| 人格 | 普攻伤害 / 间隔 | 技能 / 冷却 | 技能 / 大招瞄准 |
|---|---|---|---|
| ENTP | 9 / 360ms | 你说得不对 / 6s | direction / none |
| INFP | 9 / 350ms | 没事，我没事 / 7s | none / none |
| ESTJ | 10 / 330ms | Deadline / 7s | position / position |
| ESTP | 11 / 260ms | WOOOOOO! / 6s | direction / none |
| INTJ | 10 / 360ms | 早有预料 / 7s | none / none |
| INTP | 9 / 360ms | 等一下，我想想 / 7s | none / position |
| ENTJ | 10 / 360ms | 你，过去！ / 6s | direction / direction |
| INFJ | 10 / 360ms | 我懂你 / 7s | direction / none |
| ENFJ | 10 / 360ms | 你们不要打了！ / 7s | none / none |
| ENFP | 9 / 360ms | 我有一个想法！ / 7s | direction / none |
| ISTJ | 9 / 360ms | 按流程来 / 7s | none / none |
| ISFJ | 11 / 420ms | 别碰我 / 7s | none / none |
| ESFJ | 9 / 360ms | 大家一起嘛！ / 7s | none / none |
| ISTP | 10 / 360ms | 让我看看 / 8s | position / position |
| ISFP | 11 / 390ms | 不要管我 / 7s | none / none |
| ESFP | 10 / 360ms | 看我！ / 6s | none / none |

## 本轮修改文件

- 配置 / 协议：`src/shared/characters/CharacterDefinition.ts`、`CharacterDatabase.ts`、`src/shared/NetworkProtocol.ts`、`GameConstants.ts`、`MatchPresentation.ts`。
- 服务端：`server/GameRoom.ts`、`server/combat/SkillSystem.ts`、`CombatResolver.ts`、`server/GameServer.ts`、`server/lobby/LobbyRoom.ts`、`MatchSession.ts`。
- 客户端：`src/client/presentation/CharacterPresentation.ts`、`CombatVisuals.ts`、`src/client/input/MobileInputAdapter.ts`、`src/client/lobby/LobbyFlow.ts`、`src/main.ts`。
- 测试：新增 `tests/combat-sixteen.ts`、`tests/sixteen-network.ts`；更新旧角色 / 网络 / 大厅 / 机器人 / 触屏 / 结算测试中与四人格或旧数值绑定的预期。
- 交付：`package.json`、`README.md`、本报告及 `artifacts/characters-v02/`。
