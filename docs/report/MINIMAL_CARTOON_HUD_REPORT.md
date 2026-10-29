# 极简卡通 HUD 升级 V1

依据 MBTI_Brawl_Minimal_Cartoon_HUD_Codex_Spec.md 实施。HUD 为 DOM，角色名称为 Phaser 文字；保持现有组件、状态来源和事件处理，无需替换渲染框架。

## 修改文件

- src/client/ui/hud.css：统一奶油白、深紫描边、紫色强调、偏移投影；人数、头像、计时、图标按钮、右侧操作、能量、人格档案及观战面板。样式作用域为 match-mode，不改变主菜单。
- src/client/ui/HudMotion.ts：信息变化时单次人数强调与观战名称淡入；MutationObserver 仅观察文本变化，尊重减少动态效果。
- src/client/lobby/LobbyFlow.ts：观战目标加 watching 样式，保留头像含义、死亡骷髅、自身标记；将观战目标纳入显示更新键。
- src/main.ts：引入样式及展示动效，略提亮角色名称文字，保留既有轻量描边。角色血条已为圆角，保留原数值映射与显示时机。

本次未修改战斗、技能、移动、AI、服务器、网络协议、地图生成或摄像机参数。既有掩体和美术升级工作保留。

## 布局与验证

- 三种桌面尺寸 1366×768、1600×900、1920×1080：八人头像完整，顶部组和右侧按钮边界分离，截图保存在 artifacts/hud。
- 390×844：头像移至第二行，操作组向下排列；读 DOM 边界确认控件在视口内。
- 头像容器不换行，可横向滚动并限制最大宽度，供未来16人扩展；当前正式房间上限未改，尚无16人实战截图。
- 浏览器检查设置、全屏进入/退出、返回菜单、更换人格入口、重置试炼、死亡灰化、观战目标高亮与面板显示；控制台无警告/错误。
- TypeScript、Vite build、tests/spectator.ts、tests/practice-flow.ts 通过。未添加替代原逻辑的按钮或确认弹窗。
- 未在 Windows DPI、Electron 或真实低性能手机上做性能实测。

## 截图

升级前参考：artifacts/game-art/actual-game.png。
升级后：artifacts/hud/final.png；三种桌面尺寸和手机窄屏截图位于同目录。spectator.png 为观战状态截图（浏览器缩放捕获产生留白，不代表布局留白）。

未提交或推送 GitHub。
