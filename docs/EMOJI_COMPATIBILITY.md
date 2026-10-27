# Emoji Compatibility · v0.1

记录日期：2026-10-23。四人格 Vertical Slice；字体栈为 Apple Color Emoji → Segoe UI Emoji → Noto Color Emoji → sans-serif。接受平台外观差异，不要求像素一致。

本次实际观察环境：macOS 宿主的内置 Chromium 浏览器，桌面 1280×720 与横屏 844×390。手机尺寸测试沿用当前宿主字体，**不能证明 iOS / Android 真机字体兼容**。Windows / iOS / Android 当前无可用真机，标为「待测」；未测试不评 GOOD / ACCEPTABLE / BAD。

| Symbol | macOS / 当前浏览器 | Windows | iOS | Android | 已观察状态 / 用途 |
| --- | --- | --- | --- | --- | --- |
| 💬 | GOOD | 待测 | 待测 | 待测 | ENTP 对话框，气泡与梗文字分开渲染 |
| ☝️ | GOOD | 待测 | 待测 | 待测 | ENTP Actually 技能 |
| 🤓 | GOOD | 待测 | 待测 | 待测 | ENTP 受击表情 / 梗文字 |
| ♥️ | GOOD | 待测 | 待测 | 待测 | INFP 红色爱心弹 / 道具 |
| 🥲 | GOOD | 待测 | 待测 | 待测 | INFP 忍耐 / 受击表情 |
| 💔 | GOOD | 待测 | 待测 | 待测 | INFP 爆发 / 命中 |
| 📋 | GOOD | 待测 | 待测 | 待测 | ESTJ 道具与旋转弹丸 |
| 📅 | ACCEPTABLE | 待测 | 待测 | 待测 | 图形中固定日历数字因平台不同；真正倒计时由独立 DEADLINE · 3/2/1 文字表达 |
| ⏰ | GOOD | 待测 | 待测 | 待测 | Deadline 最后一秒警告 |
| 📊 | GOOD | 待测 | 待测 | 待测 | KPI 区域 |
| 👊 | GOOD | 待测 | 待测 | 待测 | ESTP 拳头 / 近战 |
| 💨 | GOOD | 待测 | 待测 | 待测 | ESTP 冲刺，配合几何拖尾 |
| ⚡ | GOOD | 待测 | 待测 | 待测 | ESTP 肾上腺素 |
| 💥 | GOOD | 待测 | 待测 | 待测 | ESTP 受击 |

## 评级与替代

GOOD：目标尺寸下可辨认，无缺字、严重裁切或意思偏差。ACCEPTABLE：形态或颜色不同但仍可辨认，Typography / Geometry 补充信息。BAD：缺字方框、无法分辨物品或严重误导玩法。

只有 BAD 进入替代流程。先改 `CharacterPresentation.ts` 的 prop / skillSymbol / ultimateSymbol / projectile.symbol，尝试其他 Emoji → Unicode Symbol → Emoji + Typography → Geometry → Typography + Geometry；最后才考虑自定义资产。暂无观察到 BAD，无新增 Sprite。

## 真机复核步骤

1. 重启新版 Host 并刷新页面，手机横屏进入四人 LAN 模式。
2. 逐项看道具、飞行符号、旋转、命中放大与淡出、技能区域，检查缺字和字体裁切。
3. ESTJ 确认真正倒计时由 DEADLINE 文本显示；不以日历 Emoji 内印的日期为计时。
4. INFP 重点检查较新的 🥲；旧系统缺字时记录系统/浏览器版本和 BAD，再使用 Unicode 表情 + 「我没事」替代。
5. 验证手机移动、拖动瞄准、技能松手与大招不被视觉层截获。Emoji 都在 Canvas 内，未新增 DOM 命中层。
6. 将实际平台版本、GOOD / ACCEPTABLE / BAD 与替代决策回填本表；未实测的栏位继续保持待测。
