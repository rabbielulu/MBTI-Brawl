# Multiplayer Game Flow · M1 Lobby 验收

依据 `MBTI_BRAWL_MULTIPLAYER_GAME_FLOW_V0.1.md` 第 38–40 节。本轮执行范围为 **M1 Lobby**，完成后停止；没有把 M2–M6 的战斗、观战、冠军结算或再来一局标为已完成。

## 1. Modified Files

新增：

- `src/shared/LobbyProtocol.ts`：身份、房间快照、阶段、错误码、默认 / 绝对人数上限、Lobby 网络事件。
- `server/lobby/LobbyRoom.ts`：服务端房间成员、验证、倒计时、角色修改与交接态。
- `server/lobby/LobbyRegistry.ts`：随机短房间号、多房间查找、空房销毁。
- `server/lobby/installLobby.ts`：独立 Socket.IO 大厅、权限、限频、广播、邀请 URL。
- `src/client/lobby/LobbyClient.ts`：连接、ACK、服务器时钟偏移、身份更新、断线 / 取消处理。
- `src/client/lobby/LobbyFlow.ts`、`lobby.css`：首页、角色创建、大厅、邀请复制和错误提示。
- `tests/lobby.ts`、`tests/lobby-network.ts`：规则与真实八连接集成测试。
- `artifacts/lobby-m1/`：截图、响应式验收 HTML 和正常协议的临时填房脚本。
- 本报告。

修改 `server/GameServer.ts`（安装大厅及 health 指标）、`src/shared/GameConstants.ts`（协议 v6）、`src/main.ts`（首页集成、对练保留、菜单期间禁用游戏输入）、`scripts/host.mjs`、`package.json`、`README.md`。生产 `dist/` 已重建。

## 2. Room State Changes

新增独立 LobbyRegistry，允许多个房间并存；每个房间含 id、maxPlayers、phase、createdAt、players、lobbyCountdownEnd、serverStartTimestamp。玩家含内部唯一 ID、slot、MBTI、nickname、connected、joinedAt。

默认 `DEFAULT_MAX_PLAYERS = 8`，上限常量 `ABSOLUTE_MAX_PLAYERS = 16`。成员判满、空位生成、快倒计时与 UI 都读取 `room.maxPlayers`；未实现 16 人地图或战斗。配置人数的测试使用 3 人房间验证未写死 8。

新大厅没有接入原四人对练的 HP / 输入 / 模拟。旧对练留作调试，不在本轮冒充八人正式比赛。Lobby 没有 Host Start、Ready 或队伍。

## 3. Network Protocol Changes

协议版本 **6**。现有战斗仍使用默认命名空间；大厅使用 `/lobby`，避免收到对练快照 / CombatEvent。共用同一 HTTP / Socket.IO 端口。

Client → Server：`room:create`、`room:join`、`room:leave`、`player:updateIdentity`。Server → Client：ACK 与 `room:update`。ACK 返回 playerId、完整房间状态及 inviteUrl，失败时返回结构化错误码和提示。每个连接只能拥有一个大厅成员身份，修改操作绑定连接自己的玩家，忽略伪造的其他玩家 ID。

每连接限制 5 秒 12 次操作。旧协议连接明确拒绝；非法人格、昵称、房间号、房间不存在、满房、阶段锁定、重复入房都有错误响应。客户端连接超时、服务器断开、重新连接失败均有明确提示，不进行隐式重连或默默创建替代房间。

## 4. Lobby State Machine

`HOME → IDENTITY → LOBBY`。邀请入口直接到 IDENTITY，成功后到对应 LOBBY。

LOBBY 内处理等待 / 人数变化 / 身份修改。服务器倒计时到期后进入 `COUNTDOWN` 交接态，发布统一 serverStartTimestamp、锁定角色和新加入，UI 显示「即将开战」。**本轮在此停止：不显示伪造的比赛，不自动进入 PLAYING，也不实现 3 / 2 / 1、出生保护或胜负。**

M2 将消费该交接态，启动真正比赛。大厅没有 gameplay input 通道；首页 / 大厅期间原场地暂停 update、设置 inert，避免背景角色移动或不可见控件抢焦点。

## 5. Invite Link Implementation

采用 `/?room=ABCD`，不引入 Router 依赖。打开带 room 参数的 URL 自动进入角色创建，显示并保留房间号，不要求再走主页或手输代码。备用输入允许手输四位房间号，服务器大小写归一化并验证。

创建 / 加入成功后使用 replaceState 保留 room 参数；退出回首页清除参数。点击「邀请朋友」优先 Clipboard API，同时显示可选择的手动复制字段；Clipboard 缺失或拒绝时有明确回退提示。

Host 在 localhost 创建房间时，服务端优先使用 en0 的非回环 IPv4 构造 LAN 链接，避免手机访问自己的 localhost。其他 LAN Host 地址保留原 Host。多网卡、VPN 或网络隔离时，仍需确认该 IP 在朋友设备上可达；没有自动修改防火墙或代理。

本机页面已复制出 `http://192.168.5.9:3000/?room=...`。本机与 LAN health 请求均成功；浏览器邀请路由验收使用同机 localhost 链接。真实跨设备手机访问仍待用户网络环境验证。

## 6. Character Identity Implementation

四个当前已开放人格：ENTP、INFP、ESTJ、ESTP。昵称前后空白去除，允许 1–12 个 Unicode code point，服务器再次验证，拒绝控制字符。显示身份自动组合为 `MBTI · Nickname`，不要求手输完整 ID；内部 UUID 使重复昵称 / 重复 MBTI 仍可独立控制。

角色创建支持即时预览，首次身份保存在本机 LocalStorage 方便再进入。大厅本人 Slot 有高亮，可修改 MBTI / 昵称；修改广播到同房间，不改变席位或倒计时。开局准备态由服务端禁止修改；正在编辑的界面也会退回锁定大厅。昵称通过 textContent 渲染，不作为 HTML 执行。

原单人 / 四人对练的 7 字昵称规则保持独立；新大厅采用文档建议的 12 字符规则。

## 7. Countdown Logic

- 一人：没有结束时间，显示等待。
- 第二人加入：服务器设定 now + 30 秒。
- 人数增加但未满：保留原结束时间，不被加入或角色编辑反复延期。
- 截止前退回一人：清除结束时间；再次两人重新从 30 秒开始。
- 人数达到 room.maxPlayers：结束时间缩短到当前时间 + 5 秒，若原剩余更短则保留更短时间。
- 满房后降到 2 人以上不把已缩短的计时拉长；降到 1 人仍重置。
- 到期：服务端进入 COUNTDOWN 交接态；不会被客户端改时钟提前开始。
- 最后一人离开：销毁房间。大厅断线立即释放席位；战斗断线的 10 秒 Grace Period 属于后续 M2，本轮不提前实现。

服务器按 100ms 检查阶段变化，仅广播状态变化。客户端使用服务器时间偏移绘制剩余秒数，不能决定 phase。计时文字只在内容变化时更新，避免重复无障碍播报。

## 8. Mobile Compatibility

角色创建 / 大厅 / 复制入口用 DOM 表单和按钮，触控目标至少 44px、输入字体至少 16px，保留既有禁双击缩放与全屏能力。竖屏两列、横屏 / 桌面四列；内容可纵向滚动，不强制手机横屏。safe-area、reduced-motion、焦点和菜单输入边界已考虑。

响应式预览在真实 iframe CSS 视口 **390×844** 与 **844×390** 下验证，均无横向溢出；调整横竖屏后房间号与连接保持，邀请链接可复制。这里不是 iOS / Android 真机验收。内置浏览器尺寸覆盖未实际生效，因此没有拿桌面截图冒充手机结果。

## 9. Test Instructions

自动测试：

```sh
npm run build
npm run test:lobby
npm run test:network
npm run test:projectiles
```

本轮通过：类型检查、生产构建；身份 / 房间号验证；重复身份；一人等待；30 秒 / 回退重置 / 满房 5 秒；配置人数；快照隔离；席位复用；空房清理；旧协议拒绝；操作限频；角色修改归属；房间广播隔离；真实八连接；真实 5 秒后交接与晚加入拒绝。原战斗 20 轮回归与弹丸平滑测试通过。

浏览器已验证：首页 / 创建角色；一人等待；复制邀请链接；第二页面通过邀请参数直接进入创建角色并加入；两端 30 秒一致；本人修改广播；两人变一人取消计时；八席位同屏与交接锁定；断线提示；手机 CSS 视口横竖屏和邀请字段。

手动复测：

1. 重启 Host，各端刷新。首页选择「多人乱斗」，填人格与昵称进入。
2. 一人时应等待；点击邀请发给朋友，朋友直接看角色创建，加入同一房间。
3. 两人开始 30 秒；任意一方退出，另一方回到等待；重新加入从 30 秒开始。
4. 点击自己的卡片修改，不改变倒计时；允许重复人格 / 昵称。
5. 八人满房缩短为 5 秒，第九人收到满员提示；另开新房不应串消息。
6. 计时结束只进入 M1 准备态，不能再修改或加入，尚不开始战斗。
7. 停止 Host 后出现断线提示；重新连接失败应显示具体原因。重启 Host 不保留内存房间，旧邀请应提示房间不存在。
8. 手机使用复制出的 LAN URL，检查输入、复制 / 手动复制、转屏和页面滚动。
9. 原战斗可经「单人试玩」入口选择「四人 LAN 对练 · 调试」继续验证，和新房间大厅独立。

截图位于 `artifacts/lobby-m1/`，包括首页、身份创建、八人大厅、手机横竖屏和邀请字段。响应式辅助页与填房脚本只用于验收，不提供改变服务器人数 / 倒计时的作弊接口；填房客户端 15 秒后自动退出。

## 10. Known Issues

- **仅 M1 完成。** 倒计时结束停在「即将开战」，M2–M6 均未实现；当前不提供八人实际对战。
- 大厅 / 身份均在内存中；Host 重启、最后一人离开后房间不存在，无断线会话恢复 / 账号 / DB。
- 当前手动重新连接，不偷偷新建房间；已销毁的房间会明确提示失败。
- UI 的排行榜为未开放入口，不展示伪造的持久排名。
- 自动复制在 LAN HTTP / 部分手机浏览器可能不可用，手动复制字段始终可用。
- 本轮没有真实手机跨设备验收；系统后台冻结可能触发连接超时，前端会提示重新连接。
- 原四人对练保留独立规则；M2 接入八人时需要将 GameRoom 容量 / 出生点按 room.maxPlayers 初始化，不能直接沿用旧四人限制。
- Phaser 公共包仍有体积提示；大厅采用 DOM，不增加战斗特效负载。

## 11. Next Recommended Phase

下一步为 **M2 Match Lifecycle**：消费 COUNTDOWN 交接态，统一 3 / 2 / 1、按房间人数安全出生、约 2 秒出生保护、PLAYING / 死亡 / 排名 / 胜者 / 取消 / 同归于尽与战斗断线宽限。应先完成 M2 测试，再进入 M3 观战。本轮在 M1 停止，没有自动实施后续阶段。
