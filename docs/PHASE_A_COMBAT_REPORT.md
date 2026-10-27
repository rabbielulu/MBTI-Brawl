# Phase A · Multiplayer Combat v0.2 验收记录

依据 `MBTI_BRAWL_MULTIPLAYER_ALPHA_AGENT_PLAN_V0.2.md`，本轮仅执行 Phase A。当前已完成代码、自动测试、同机双浏览器测试；等待本轮双设备 LAN Playtest，未进入 Phase B。

## 1. Modified Files

| 文件 | 改动 |
| --- | --- |
| `src/characters.ts` | 共用普攻定义、击退、人格上限与获取倍率，保留单机字段兼容 |
| `src/shared/combat/CombatTypes.ts`（新增） | AttackDefinition、Attack/Damage/Death 统一事件 |
| `src/shared/NetworkProtocol.ts` | 事件式输入、HP/Alive/人格/速度/CD/Ack、独立 combat 消息、协议版本 |
| `src/shared/GameConstants.ts` | 击退衰减/限速、输入限频、协议版本 |
| `src/shared/Movement.ts` | 共用输入移动、真实速度积分、分段碰撞与衰减 |
| `server/combat/CombatResolver.ts`（新增） | 实际伤害、人格能量、击退、死亡和近战扇形/掩体判定 |
| `server/GameRoom.ts` | 服务端事件消费、弹丸/近战攻击、死亡锁定、事件队列、重置 |
| `server/GameServer.ts` | 每 tick 独立广播 combat 事件；欢迎消息及健康检查返回版本 |
| `src/client/network/NetworkClient.ts` | 事件去重队列、Pressed 请求、版本错误提示、Ping Jitter |
| `src/main.ts` | 即时攻击表现、击退预测/校正、战斗事件表现、人格槽与调试数据 |
| `src/light.css` | LAN 人格槽、未开放大招标识、小屏 HUD 布局 |
| `tests/multiplayer-combat.ts`、`tests/network.ts` | Phase A 规则、多轮回归与真实 Socket.IO 事件同步测试 |
| `README.md` | 当前版本说明、验收入口 |

## 2. Architecture Changes

仍使用 Phaser + DOM HUD，不更换引擎或重写客户端。

服务端每个固定 tick：消费最新移动/一次攻击事件 → 共用移动/速度衰减 → 攻击（远程或近战）→ 弹丸分段碰撞 → Damage/Personality/Knockback/Death → 广播瞬时事件。

持续状态通过 20Hz Snapshot；瞬时表现通过独立 `combat` 消息。伤害不再作为历史 VFX 列表重复塞入 Snapshot。客户端不决定命中、伤害、人格或死亡。

角色普攻配置来自同一份 Character Definition。近战组件已在服务端实现并验证；本轮前台仍只有 ENTP 远程角色，不提前开放 Phase B 的 ESTP。

## 3. Network Protocol Changes

协议版本：3。欢迎消息携带版本；不兼容时提示重启 Host/刷新页面。

Input：`seq / moveX / moveY / aimAngle / basicAttackPressed / skillPressed / ultimatePressed`。后三项为布尔事件，非持续 held 状态。客户端按住左键时，每 300ms 产生新的普攻事件；服务器每 tick 消费一次且验证 CD。技能与大招标志当前接收后忽略，不执行 Phase B 能力。

CombatEvent：

- Attack：id、round、tick、attackerId、位置、朝向、攻击类别。
- Damage：id、round、tick、attackerId、targetId、实际 damage、命中位置、knockbackX/Y。
- Death：id、round、tick、attackerId、targetId、死亡位置。

客户端按单调事件 ID 去重，并丢弃不属于当前对练轮次的表现。

## 4. New Server State

玩家新增/显式化：`maxHp / alive / personality / personalityMax / velocityX / velocityY / basicAttackCooldownRemaining / lastAckSeq`。

- HP 100；人格 0–100，按实际伤害 1:1 获得；过量伤害不额外充能。
- 普攻伤害 12、CD 300ms、弹速 680、寿命 1 秒、初始击退速度 210。
- 击退按指数衰减，与主动移动相加；分段碰撞避免穿越掩体，速度有限幅。
- 死亡立即停输入、攻击与主动碰撞，保留连接；尸体可见。
- 非法、旧序号输入被拒绝；每玩家每秒最多处理 120 个输入；250ms 无有效新输入停止主动移动。
- 重置恢复双方 HP/Alive/人格/速度/位置，清理事件和弹丸。

## 5. New Client State

- 服务器人格槽与 HP；不在客户端结算。
- 本地预测整合权威击退速度；远端继续快照插值。
- 本地立即显示出手 VFX；远端出手、受击闪白、伤害数字、死亡表现来自 CombatEvent。
- F3/调试按钮追加 Input Seq、Last Ack Seq、Prediction Error、Correction Count 与 Jitter。
- 满人格仅显示进度；大招明确标注待开放。

## 6. Tests / Playtest

自动验证：

- TypeScript 检查与 Vite build 通过。
- 单机战斗与 1,000 组随机地图测试通过。
- 事件式攻击不会在后续 tick 重复执行；普攻冷却正确。
- 弹丸飞行/掩体/自伤排除；近战扇形角度、冷却、隔墙排除。
- 人格按实际伤害增长并封顶；击退改变服务端位置、衰减且不能穿墙。
- 连续 20 轮交替方向击杀/重置：每轮只产生一次死亡事件，所有位置有限，死亡不能移动/攻击。
- 两个真实 Socket.IO 客户端收到一致 HP、人格、击退速度、战斗事件，重置和断线正常。
- `npm run dev` 对应启动脚本实测能同时启动 Vite 页面与 Node 协议 v3（使用临时端口后关闭）；`build`、`start:lan` 的底层命令均已运行通过。

同机双浏览器：P2 → P1 完整击杀后人格 100；重置后 P1 → P2 完整击杀，观察到目标真实位置退移。死亡方按 D 仍停留在尸体位置，HP 0；重置双方恢复。测试页面结束后全部关闭以释放名额。

两设备步骤：

1. Host 停止旧服务后双击 `启动Host.command`，或运行 `npm run build && npm run start:lan`。
2. 两端刷新，分别访问 `http://localhost:3000` / `http://HOST_IP:3000`，选择「双人 LAN · 普攻对练」。
3. 绕掩体、穿泥潭，确认移动/朝向/地图仍一致。
4. 在无遮挡处互射，确认被击方 HP 与另一端头顶 HP 一致；每发 12，最后一发按剩余生命结算；攻击方人格等量增加。
5. 双方观察目标退移，尤其贴墙时不得穿过掩体或发生大幅瞬移。
6. 击倒一方后尝试 WASD/左键，应无法移动和攻击。
7. 点击重置，交换攻击方向，连续至少 5 局；关注重复扣血、残留弹丸、HP 分歧、位置爆炸与服务崩溃。
8. 关闭其中一端，另一端不崩溃、人数下降、远端与其弹丸删除。
9. 反馈手感、异常截图及 F3 数值，再决定是否进入 Phase B。

本轮真实双设备战斗测试尚待用户执行；先前移动阶段测试通过不能替代本轮验收。

## 7. Known Issues

- 当前仅双人 ENTP 远程对练；近战只是组件测试，没有提前开放 ESTP。
- 未做音频、技能、大招、胜负、大厅、观战、重连、多房间或公网。
- 仍使用轻量预测与校正，无完整输入回放；高延迟时可能有轻微回拉。
- 远端插值约 100ms；弹丸根据最近快照有限外推，可能存在单帧表现偏差，命中以服务端为准。
- 任一方均可重置对练（1 秒间隔），这是测试工具，Phase C 再替换为正式赛局流程。
- 应用服务端更新后必须重启 Node；已有旧页面需刷新。

## 8. Performance Risks

保持 30Hz 模拟 / 20Hz 快照；近战/弹丸碰撞当前为小规模线性遍历，适合双人验证。尚未测 8 人、大量弹丸或公网延迟，不能据此宣称 60FPS/30Tick 长时间性能达标。

Phaser 生产包约 1.56MB，有构建体积提示。未加入数据库或重型基础设施。

## 9. Next Recommended Phase

在本轮两设备验收通过后，下一步为 Phase B：四个代表人格（ENTP/INFP/ESTJ/ESTP）、技能、大招、CD 与状态效果。当前已按计划 STOP，不自动进入 Phase B。
