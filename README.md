# MBTI 大乱斗 · Multiplayer Match M2

Phaser 3 + TypeScript + Vite，Node.js + Socket.IO。当前完成 **M2 八人比赛生命周期**：首页 → 选择人格 / 昵称 → 创建或加入房间 → 邀请 → 大厅倒计时 → 3 / 2 / 1 → 出生保护 → 自由混战 → 淘汰名次 / 最后存活者获胜。每个房间使用独立的服务端战斗模拟。

当前可选 ENTP / INFP / ESTJ / ESTP，允许重复人格。既有单人训练与四人 LAN 对练保留，和新大厅独立。

## 启动

需要 Node.js 20.19+ 或 22.12+。首次 `npm install`，然后双击 `启动Host.command`，或：

```sh
npm run build
npm run start:lan
```

本机打开 `http://localhost:3000`，选择「多人乱斗」。服务器监听 `0.0.0.0:3000`，静态页面、战斗和大厅共用端口。开发模式 `npm run dev` 同时启动 Node 3000 与 Vite 5173；修改服务器代码后重启 Node。

**当前协议 v7，升级后先停止旧 Host 并重启，各设备刷新页面。** 快捷方式复用已有 Host 时仅更新前端构建。保持 Host 终端打开，Control+C 停止。

## 大厅试玩

1. 选择人格，输入 1–12 字符昵称。房间号留空可创建新房间。
2. 一人时等待；「邀请朋友」复制房间 URL，同一 LAN 的朋友打开后直接创建角色并加入该房间。
3. 本机 localhost 创建时，邀请链接优先使用 LAN IP。手机不能访问自己的 localhost；多网卡 / VPN 时核对 Host 终端显示的可达 IP。
4. 两人起 30 秒；退回一人取消计时，重新两人再计 30 秒。满房缩短至最多 5 秒。
5. 点击自己的 Slot 可修改人格和昵称；倒计时截止后锁定，显示统一的 3 / 2 / 1，进入比赛。前 2 秒可移动和瞄准，不能攻击或受到伤害。
6. 大厅退出释放席位；比赛主动退出立即淘汰且不赠送击杀，断线有约 10 秒恢复窗口。所有人断开则取消比赛。比赛开始后拒绝新玩家加入；Host 重启不保留房间。
7. 自动复制不可用时使用下方手动复制字段。手机支持纵向滚动和横竖屏布局。

## 正式比赛与原战斗试玩

正式比赛：最后存活者获胜，按淘汰顺序确定名次，死亡后停止输入；顶部头像标识存活 / 淘汰与自己。比赛没有训练重置按钮，结束后通过「退出本局」回首页。M3 观战切换、M4 庆祝结算和 M5 同房再战尚未实现。


首页「单人试玩」进入原试验场表单。单机 ENTP 训练靶保持可用；选择「四人 LAN 对练 · 调试」可继续旧的四人格战斗测试。它不是新大厅的八人正式比赛。

PC：WASD、鼠标瞄准、左键普攻、右键技能、空格大招。手机：设置开启触屏、横屏，左摇杆移动、右摇杆松手攻击，技能按人格点击 / 拖动。能量满 100 可大招，击倒后可重置对练。

当前远程弹速降低约 30%，放大 ENTP 弹丸文字；连续渲染时间轴减轻网络快照引起的弹丸跳动。Emoji / Typography / Geometry 共用渲染器，零新增 Sprite。每局 5 个随机掩体，可能出现减速泥潭。

## 验证与记录

```sh
npm run build
npm run test:lobby
npm run test:match
npm test
npm run test:input
npm run test:network
npm run test:characters
npm run test:presentation
npm run test:projectiles
```

- [M2 比赛生命周期报告](docs/M2_MATCH_REPORT.md)
- [M1 大厅报告：改动、协议、状态机、测试与下一阶段](docs/M1_LOBBY_REPORT.md)
- [四人格战斗报告](docs/CHARACTER_SLICE_REPORT.md)
- [Emoji 与弹丸视觉报告](docs/EMOJI_COMBAT_REPORT.md)
- [Emoji 平台兼容记录](docs/EMOJI_COMPATIBILITY.md)

`/visual-lab.html` 为独立八角色渲染压测页，不占 LAN 席位。已完成基本比赛、淘汰与冠军判定；观战、庆祝 / 战绩面板、同房再战、真实排行榜及数据库尚未实现。真实 iOS / Android 联机仍待验收。
