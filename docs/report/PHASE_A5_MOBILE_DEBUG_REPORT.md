# Phase A.5 · Mobile Browser Debug Controls

依据 `MBTI_BRAWL_MOBILE_DEBUG_CONTROLS_PHASE_A5.md` 更新。当前完成触屏输入适配、桌面模拟和横竖屏检查；真实 PC + Phone 对战仍待用户验收。不进行正式移动 UI Polish，不进入 Phase B。

## 1. Modified Files

- 新增 `src/client/input/InputAdapter.ts`：与 PlayerInput 同形的输入意图接口。
- 新增 `src/client/input/DesktopInputAdapter.ts`：键鼠方向、连发节奏与技能/大招事件。
- 新增 `src/client/input/TouchConfig.ts`：移动/瞄准死区 0.15、透明度 0.62、摇杆行程、SkillAimMode 类型。
- 新增 `src/client/input/TouchState.ts`：不依赖 DOM 的摇杆状态、独立 pointerId 与一次性输入事件。
- 新增 `src/client/input/MobileInputAdapter.ts`：Pointer Events、capture/cancel、触屏 DOM、状态与调试信息。
- 新增 `src/touch.css`：横屏双摇杆、Safe Area、紧凑 HUD、竖屏提示与设置样式。
- 更新 `src/main.ts`：统一采样输入，设置开关、触屏检测提示、瞄准指示、失焦/旋转/死亡清理。
- 更新 `src/characters.ts`：ENTP 技能方向模式配置；数值及战斗规则不变。
- 更新 `index.html`：`viewport-fit=cover`。
- 新增 `tests/touch-input.ts`，更新 package.json 添加 `test:input`。
- 更新 README，本记录提供真机验收流程。

## 2. Input Adapter Architecture

```text
DesktopInputAdapter / MobileInputAdapter
              ↓
InputIntent (PlayerInput without seq)
              ↓
现有 NetworkClient 生成 seq、发送原有 PlayerInput
              ↓
原有 Server / Combat / Snapshot
```

Server 不判断设备类型，本轮未修改服务端文件或网络协议，协议仍为 3。

Desktop 保留 WASD、鼠标瞄准、左键连发、右键技能与空格大招；Touch 开启时由移动适配器独占输入，关闭后恢复键鼠。

## 3. Touch Control Architecture

- Settings → MOBILE TEST → Enable Touch Controls，可在 PC 手动开启。
- 真触屏设备首次进入时提示开启，不强制开启；设置偏好保存在本浏览器 localStorage（不可用时仍可操作）。
- 左摇杆：圆形限幅、0.15 死区、360° 模拟量移动，保留小幅度输入，不把所有角度强制为满速。
- 右摇杆：拖动调整 aimAngle、显示世界空间瞄准线；松手产生一次 basicAttackPressed；中心轻触与 pointercancel 不开火，不是按住自动开火。
- 每个摇杆/技能/大招独立拥有 pointerId，使用 pointer capture 跟踪离开圆盘的手指。
- 失焦、后台、尺寸改变、设置弹窗、切换模式或死亡会清空指针与排队事件，避免漂移/幽灵攻击。
- Single Player：SKILL 根据方向配置拖动后释放；ULT 在人格 100 后启用，复用已有单机能力。
- LAN Phase A：SKILL/ULT 明确禁用为「LAN 待开放」，能量满后显示 READY · 待开放。不会为了按钮验收提前实现 Phase B 服务器技能。
- 竖屏显示「请横屏进行游戏」并停止主动操作；设置入口继续可点击。未请求强制方向锁。
- 操作区域独立 touch-action、禁止长按选择/菜单；输入框、设置和普通页面控件保留原生交互。
- Safe Area 使用 env(safe-area-inset-*)，横屏 HUD 避开双摇杆；调试数据可在 Settings 打开。
- Debug 显示 MOVE/AIM 指针、方向、按键状态与累计 A/S/U 事件次数，便于检查瞬时松手事件。

## 4. Mobile LAN Test Instructions

1. Host 保持 `启动Host.command` 或 `npm run start:lan` 运行。此次只更新前端，已运行的协议 v3 Host 不必重启；页面需要刷新加载新构建。
2. PC 打开 `http://localhost:3000`，Phone 连接相同 Wi-Fi 后打开 `http://HOST_IP:3000`。手机不能使用 localhost 指向电脑。
3. 输入不同昵称和 ENTP，模式都选「双人 LAN · 普攻对练」。当前最多两名玩家，额外标签页也会占名额。
4. 手机上接受开启提示，或进入右上设置，勾选 Enable Touch Controls。把手机横过来。
5. 左拇指推摇杆：试小幅、斜向、完整一圈；松开应立即停，PC 看见同样的位置与朝向。
6. 保持左摇杆移动，同时右拇指拖动瞄准，再松右拇指：只发出一次普攻，左侧移动不应中断。
7. 右摇杆中心轻触应取消攻击；手指拖出圆盘再松开仍可正确释放；切后台/转竖屏后不能继续漂移或误射。
8. PC 与 Phone 在无遮挡位置互射，核对 HP、击退、人格能量一致。手机阵亡后左右摇杆不能移动或开火。
9. 点击重置对练，交换攻击方向，至少测试 5 轮。
10. 若有触控异常，Settings 开启 Show Touch Debug，记录 Pointer、Angle、事件次数、手机型号、系统和浏览器。
11. 单机训练可另行测试 SKILL 拖动释放与 ULT 满槽启用。LAN 技能/大招需 Phase B，不属于本轮已开放功能。

## 5. iOS Browser Status / Risks

尚未实测 iPhone/iPad Safari，不宣称真实设备验收通过。已设置 viewport-fit 与 Safe Area，需真机检查刘海/Home Indicator、动态浏览器工具栏变化以及系统边缘手势取消。页面尺寸改变会清理输入，工具栏或旋转导致尺寸改变时可能需要重新触摸摇杆。

localStorage 权限受限不会阻塞游戏；不依赖 Orientation Lock 或 Pointer Lock。

## 6. Android Browser Status / Risks

尚未实测 Android Chrome/其他内核。需检查导航手势、地址栏收起产生的视口改变、触控取消，以及多指对 Pointer Events 的实际派发。单纯桌面尺寸模拟不能覆盖这些行为。

## 7. Touch UX / Verification

已验证：

- TypeScript 与 Vite build 通过。
- `npm run test:input` 覆盖死区、模拟量、斜向归一化、独立指针、错误指针忽略、松手仅一次攻击、取消不攻击、技能/大招事件和失活清理。
- 原单机战斗、1,000 张随机地图、Phase A 20 轮战斗和双 Socket.IO 集成回归通过。
- PC 强制开关、摇杆鼠标拖动、LAN 右摇杆松手后服务端 lastAttackTick 更新、左摇杆服务端坐标改变。
- 关闭触屏后桌面 WASD 正常。
- 单机 SKILL 拖动后事件数增加并进入冷却，未满人格的 ULT 禁用。
- 浏览器布局检查：800×450（16:9）、844×390（手机长屏比例）、900×405（20:9）、1024×768（平板横屏）、390×844（竖屏提示）。

尚待：真实多指 Pointer Events、iOS/Android 浏览器、PC + Phone 双设备战斗、单机触屏 ULT 满槽实机流程。模型多指测试通过不等于真实触控硬件验收通过。

Debug 模式展开 Network + Touch 面板会覆盖较多屏幕；正常手机测试建议关闭调试面板。当前摇杆固定在屏幕角落，按功能优先，不加入正式移动端美术/复杂布局系统。地面位置指向技能模式仅保留类型，未来有该类技能时再实现目标点 UI。

## 8. Next Recommendations

先完成本轮 PC + Phone Playtest 并记录漂移、释放、朝向、多指冲突；必要时调 TouchConfig 的死区/透明度/行程。验收通过后再进入 Phase B 服务器人格技能与大招，不在本轮复制移动战斗系统或扩展服务器规则。
