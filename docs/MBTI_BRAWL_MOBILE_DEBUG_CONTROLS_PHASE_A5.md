# MBTI 大乱斗 --- Phase A.5 Mobile Browser Debug Controls

> Version: Multiplayer Alpha Phase A.5\
> Stack: Phaser 3 + TypeScript + Vite + Node.js + Socket.IO\
> Purpose: 使用手机/平板浏览器作为 Multiplayer Playtest Client\
> Scope: Debug / Playtest Input Mode，不是正式移动端适配

------------------------------------------------------------------------

# 1. Goal

在不改变 Multiplayer Server Protocol 和 Combat Logic
的情况下，为移动端浏览器增加一套 Debug Touch Controls。

用途：

-   手机作为 Multiplayer Playtest Client
-   LAN 手机测试
-   后续公网手机测试
-   快速增加多人测试设备数量
-   PC + Phone / Tablet 混合测试

目标体验：

``` text
PC P1
vs
Phone P2
```

双方使用完全相同的 Multiplayer Server 和 Combat Rules。

------------------------------------------------------------------------

# 2. Core Principle

Server 不区分：

``` text
Desktop Player
Mobile Player
```

所有输入最终统一转换为：

``` ts
interface PlayerInput {
  seq: number;

  moveX: number;
  moveY: number;

  aimAngle: number;

  basicAttackPressed: boolean;
  skillPressed: boolean;
  ultimatePressed: boolean;
}
```

禁止建立独立 Mobile Combat Logic。

------------------------------------------------------------------------

# 3. Input Architecture

``` text
DesktopInputAdapter
        │
        ├── WASD
        ├── Mouse Aim
        ├── LMB
        ├── RMB
        └── Space

MobileInputAdapter
        │
        ├── Move Joystick
        ├── Aim / Attack Joystick
        ├── Skill Button
        └── Ultimate Button

             ↓

        PlayerInput

             ↓

        NetworkClient

             ↓

           Server
```

Desktop 与 Mobile 只在 Input Adapter 层不同。

从 PlayerInput 开始，共享全部：

``` text
Network Protocol
Server Simulation
Combat
HP
Personality
Skill
Ultimate
Death
Match
```

------------------------------------------------------------------------

# 4. Settings Entry

现有 Settings 中增加：

``` text
MOBILE TEST

[ ] Enable Touch Controls
```

开启：

``` text
Show Virtual Controls
```

关闭：

``` text
Hide Virtual Controls
```

Desktop Browser 也必须允许手动开启。

这样开发时可以直接用鼠标测试 Mobile UI，无需每次拿手机。

------------------------------------------------------------------------

# 5. Touch Device Detection

可以使用：

``` ts
navigator.maxTouchPoints > 0
```

检测触屏设备。

首次检测到 Touch Device 时可以提示：

``` text
检测到触屏设备

是否开启测试操作界面？

[开启]
[不用]
```

注意：

不要自动强制开启。

最终状态由 Settings 控制。

------------------------------------------------------------------------

# 6. Orientation

Mobile Debug Mode 推荐：

``` text
Landscape Only
```

Portrait 时显示：

``` text
请横屏进行游戏
```

不要为了 Prototype 引入复杂 Orientation Lock。

如果 Browser 支持并且实现成本低，可以尝试请求
Landscape，但不能依赖它作为唯一方案。

------------------------------------------------------------------------

# 7. Mobile Layout

建议横屏布局：

``` text
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                  GAME                       │
│                                             │
│                                             │
│                                             │
│    ◯                               ◎        │
│   MOVE                           ATTACK      │
│                              [SKILL] [ULT]   │
└─────────────────────────────────────────────┘
```

左下：

``` text
Move Joystick
```

右下：

``` text
Aim / Attack Joystick
Skill Button
Ultimate Button
```

要求：

-   半透明
-   不遮挡主要战斗区域
-   Touch Target 足够大
-   支持不同屏幕比例
-   避开 Safe Area
-   不阻挡 Settings
-   不影响 HUD 可读性

------------------------------------------------------------------------

# 8. Move Joystick

左下 Virtual Joystick。

输出：

``` ts
moveX
moveY
```

范围：

``` text
-1 → 1
```

支持：

``` text
360° Analog Movement
```

例如：

``` text
Up:
moveX = 0
moveY = -1

Upper Left:
moveX ≈ -0.707
moveY ≈ -0.707
```

------------------------------------------------------------------------

# 9. Move Dead Zone

增加：

``` text
Joystick Dead Zone
```

建议初始：

``` text
0.15
```

低于 Dead Zone：

``` text
moveX = 0
moveY = 0
```

避免手指轻微偏移导致角色漂移。

Dead Zone 放入 Config，方便 Playtest 调整。

------------------------------------------------------------------------

# 10. Aim / Basic Attack Joystick

右侧最大的控制区域不是普通 Attack Button。

推荐使用：

``` text
Aim + Attack Joystick
```

交互：

``` text
Touch Down
↓
Drag
↓
Calculate Aim Direction
↓
Show Aim Indicator
↓
Release
↓
Basic Attack
```

输出：

``` text
aimAngle
basicAttackPressed
```

拖动距离低于 Aim Dead Zone：

``` text
Cancel Attack
```

------------------------------------------------------------------------

# 11. Aim Indicator

拖动右摇杆时显示简单：

``` text
Aim Line
or
Arrow
```

例如：

``` text
Player
  O────────────>
```

只用于 Client Presentation。

Server 不需要同步 Aim Indicator。

------------------------------------------------------------------------

# 12. Skill Button

右侧增加：

``` text
SKILL
```

对应 Desktop：

``` text
RMB
```

对于无方向技能：

``` text
Tap
→ Skill
```

对于方向技能：

``` text
Touch
↓
Drag
↓
Aim
↓
Release
↓
Skill
```

------------------------------------------------------------------------

# 13. Skill Aim Mode

SkillDefinition 推荐增加：

``` ts
type SkillAimMode =
  | "none"
  | "direction"
  | "position";
```

例如：

``` text
ENFJ AoE
aimMode = none

ESTP Dash
aimMode = direction

Future Ground Target Skill
aimMode = position
```

Mobile Input Adapter 根据 aimMode 决定交互。

Desktop 也可以共享这一配置。

------------------------------------------------------------------------

# 14. Ultimate Button

右下：

``` text
ULT
```

Personality \< 100：

``` text
Disabled / Dimmed
```

Personality = 100：

``` text
READY
```

并增加轻微视觉提示。

Tap：

``` text
ultimatePressed = true
```

如果 Ultimate 有方向要求：

复用 Skill Aim 逻辑。

------------------------------------------------------------------------

# 15. Multi-touch

必须支持 Multi-touch。

典型情况：

``` text
Left Thumb:
Move

Right Thumb:
Aim

同时：
Tap Skill
```

每个 Control 必须追踪自己的：

``` text
pointerId
```

正确处理：

``` text
pointerdown
pointermove
pointerup
pointercancel
```

不能出现：

``` text
第二根手指触屏
→
Move Joystick 突然失效
```

------------------------------------------------------------------------

# 16. Touch Browser Behavior

Game / Touch Control Area 需要避免：

``` text
Browser Scroll
Pull to Refresh
Text Selection
Context Menu
Double Tap Zoom
```

仅对游戏操作区域做必要处理。

不要破坏普通 HTML UI 的基本可操作性。

------------------------------------------------------------------------

# 17. Safe Area

CSS 支持：

``` css
env(safe-area-inset-left)
env(safe-area-inset-right)
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

避免：

``` text
iPhone Notch
Dynamic Island
Home Indicator
```

遮挡操作按钮。

------------------------------------------------------------------------

# 18. Responsive Layout

Touch HUD 不使用固定屏幕坐标。

根据：

``` text
Viewport Width
Viewport Height
Safe Area
```

动态布局。

至少测试：

``` text
16:9
19.5:9
20:9
iPhone Landscape
Android Landscape
Tablet Landscape
```

------------------------------------------------------------------------

# 19. Touch Debug Settings

Settings / Debug 中增加：

``` text
Touch Controls
[x]

Joystick Dead Zone
0.15

Joystick Opacity
0.5

Show Touch Debug
[ ]
```

如果不希望第一版做 Slider：

Dead Zone / Opacity 可以先作为 Config 常量。

------------------------------------------------------------------------

# 20. Touch Debug Overlay

开启：

``` text
Show Touch Debug
```

显示：

``` text
MOVE

X: 0.71
Y: -0.32
Pointer: 2

AIM

Angle: 1.42
Pointer: 4

Attack: false
Skill: false
Ultimate: false
```

用于排查真机触控问题。

------------------------------------------------------------------------

# 21. Desktop Debug Support

Desktop Browser 也允许：

``` text
Settings
→ Enable Touch Controls
```

使用 Mouse 模拟拖动：

``` text
Move Joystick
Aim Joystick
Skill
Ultimate
```

目的：

快速调整：

-   Joystick Size
-   Dead Zone
-   Sensitivity
-   Button Position
-   Aim Behavior
-   Opacity

真机用于最终验证，而不是每次 UI 微调。

------------------------------------------------------------------------

# 22. Multiplayer Integration

Mobile Player 与 Desktop Player 必须使用完全相同：

``` text
PlayerInput
Network Protocol
Server Simulation
Combat Rules
```

Server 不增加：

``` text
if (mobilePlayer)
```

之类的特殊战斗逻辑。

------------------------------------------------------------------------

# 23. LAN Mobile Test

Host Computer：

``` bash
npm run build
npm run start:lan
```

查看 Host LAN IP：

``` text
ipconfig
```

例如：

``` text
192.168.10.25
```

PC：

``` text
http://localhost:3000
```

Phone：

连接与 Host 相同 Wi-Fi / LAN 后：

``` text
http://192.168.10.25:3000
```

进入游戏。

Settings：

``` text
Enable Touch Controls
```

------------------------------------------------------------------------

# 24. Playtest A --- Movement

Phone：

左摇杆移动。

检查：

-   360° Movement
-   Dead Zone
-   Character Drift
-   Response Time
-   Remote PC 是否看到正确 Movement

------------------------------------------------------------------------

# 25. Playtest B --- Aim

Phone：

右摇杆拖动。

检查：

-   Aim Direction
-   Aim Indicator
-   Remote PC 是否看到正确朝向
-   快速转向是否稳定

------------------------------------------------------------------------

# 26. Playtest C --- Attack

Phone：

``` text
Aim
↓
Release
↓
Basic Attack
```

检查：

-   Attack Direction
-   Attack Trigger
-   Server Hit Detection
-   Damage
-   HP Sync

------------------------------------------------------------------------

# 27. Playtest D --- Simultaneous Input

测试：

``` text
Move
+
Aim
```

以及：

``` text
Move
+
Skill
```

以及：

``` text
Move
+
Aim
+
Attack
```

确认 Multi-touch 不冲突。

------------------------------------------------------------------------

# 28. Playtest E --- Personality / Ultimate

Phone 攻击造成伤害：

``` text
Personality Meter
0 → 100
```

达到 100：

``` text
ULT READY
```

Tap ULT：

Server 正确执行 Ultimate。

------------------------------------------------------------------------

# 29. Playtest F --- Death

PC 击杀 Phone Player。

Phone：

``` text
HP → 0
↓
Death
```

检查：

-   Touch Controls 不再发送 Gameplay Input
-   Death State 正确
-   后续 Spectator Mode 可继续使用触屏切换目标

------------------------------------------------------------------------

# 30. Acceptance Criteria

-   [ ] 手机浏览器可以打开 LAN Game
-   [ ] 横屏游戏正常
-   [ ] Settings 可以开启 Touch Controls
-   [ ] Desktop 可以强制开启 Touch Controls
-   [ ] 左摇杆控制移动
-   [ ] 移动支持 360° Analog
-   [ ] Dead Zone 正常
-   [ ] 右摇杆控制 Aim
-   [ ] 松开右摇杆触发 Basic Attack
-   [ ] Skill Button 正常
-   [ ] Ultimate Button 正常
-   [ ] Multi-touch 正常
-   [ ] Move + Aim 同时正常
-   [ ] Move + Skill 同时正常
-   [ ] 手机与 PC 使用同一 Network Protocol
-   [ ] Server 不区分 Input Device
-   [ ] Safe Area 不遮挡核心操作
-   [ ] Android Browser 基础可用
-   [ ] iOS Browser 基础可用
-   [ ] Portrait 显示横屏提示
-   [ ] Touch Controls OFF 不影响 Desktop Controls
-   [ ] 手机玩家可以完整参与 Multiplayer Combat

------------------------------------------------------------------------

# 31. Recommended Development Position

此功能插入 Multiplayer Roadmap：

``` text
Phase A
Multiplayer Combat
Basic Attack / Damage / HP / Death

↓

// Phase A.5
Mobile Debug Controls

↓

Phase B
Personality Skill / Ultimate

↓

Phase C
Lobby / Match

↓

Phase D
Spectator / Reconnect

↓

Phase E
Multiple Rooms

↓

Phase F
Internet
```

如果 Phase A 尚未完成：

可以先建立 Input Adapter 架构，但不要因此阻塞 Combat Core。

------------------------------------------------------------------------

# 32. Agent Stop Point

完成：

``` text
PC
vs
Phone
```

完整 Multiplayer Combat Playtest 后停止。

输出：

1.  Modified Files
2.  Input Adapter Architecture
3.  Touch Control Architecture
4.  Mobile LAN Test Instructions
5.  Known iOS Browser Issues
6.  Known Android Browser Issues
7.  Touch UX Issues
8.  Next Recommendations

不要在本阶段进行正式 Mobile UI Polish。

------------------------------------------------------------------------

# 33. Agent Rules

## Rule 1

不要复制一套 Mobile Combat System。

Mobile 与 Desktop 只在 Input Adapter 层不同。

## Rule 2

不要修改 Server Combat Rules 来适配手机。

## Rule 3

Touch UI 是 Debug / Playtest Feature，优先：

``` text
Functional
>
Reliable
>
Readable
>
Polished
```

## Rule 4

必须支持 Multi-touch。

## Rule 5

必须允许 Desktop 强制打开 Touch Controls，方便开发调试。

## Rule 6

所有 Touch 参数尽量 Config Driven。

## Rule 7

不要因为移动端 Debug 功能重构已经工作的 Multiplayer Architecture。

------------------------------------------------------------------------

# 34. Core Goal

本阶段不是正式开发 Mobile Version。

目标是：

> **让手机和平板变成随手可用的 MBTI 大乱斗测试客户端。**

最终测试场景：

``` text
Laptop
+
Desktop
+
iPhone
+
Android
+
Tablet
```

都可以通过同一个 URL 加入同一 Multiplayer Match，为后续 4--8 人 Playtest
降低设备门槛。
