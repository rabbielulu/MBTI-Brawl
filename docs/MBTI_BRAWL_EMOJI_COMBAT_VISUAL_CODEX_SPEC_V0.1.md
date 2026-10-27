# MBTI 大乱斗 --- Emoji Combat Visual Codex Spec

> Version: v0.1 Stack: Phaser 3 + TypeScript Scope: Combat Props /
> Projectiles / Skill Symbols / Meme Presentation

## 1. 核心方向

战斗视觉统一采用：

**火柴人 + MBTI 头像 + Emoji 道具 + Typography 人格梗 + Phaser 几何
VFX**

实现优先级：

``` text
1. Emoji
2. Typography
3. Phaser Geometry / Procedural VFX
4. Simple Custom Hand-drawn Asset
```

只有 Emoji 无法清楚表达时，才考虑手动画。

## 2. 三层视觉语言

### Emoji = What

表达具体物品是什么。

示例：

-   INTJ：♟️
-   INTP：❓
-   INFP：♥️
-   ESFJ：💌
-   ISTP：🔧
-   ESTJ：📋
-   ESFP：🎤

### Typography = Personality

表达角色为什么好笑。

示例：

``` text
ACTUALLY!
SOURCE?
DEADLINE
KPI
WOOOOOO!
我没事
MY SHOW!
```

### Geometry / Motion = Power

使用 Phaser Graphics 表达力量：

``` text
Ring / Line / Arrow / Arc / Flash / Explosion
Shockwave / Trail / Target Marker / Zone
```

通过 Scale、Rotation、Timing、Motion、Shake、Knockback 增强反馈。

## 3. Emoji First Rule

具体道具优先检查 Emoji：

``` text
🔧 Wrench
📋 Clipboard
❤️ Heart
💌 Letter
♟️ Chess
❓ Question
🎤 Microphone
💣 Bomb
🐔 Chicken
⚡ Lightning
⭐ Star
📸 Camera
📊 Chart
📅 Calendar
⏰ Clock
🛡️ Shield
👁️ Eye
💡 Light Bulb
📏 Ruler
```

Emoji 足够清楚时，不制作 Sprite。

如果 Emoji 不合适，依次尝试：

``` text
Alternative Emoji
→ Unicode Symbol
→ Emoji + Typography
→ Phaser Geometry
→ Typography + Geometry
→ Simple Custom Asset
```

Custom Asset 是最后方案。

## 4. Emoji Renderer

建立统一 `EmojiRenderer` 或 `CombatSymbol`，禁止每个 Skill 自己硬编码
Text Object。

建议支持：

``` ts
interface EmojiStyle {
  fontSize: number;
  rotation?: number;
  scale?: number;
  alpha?: number;
}
```

Prototype 可使用 Phaser Text：

``` ts
scene.add.text(x, y, "🔧", {
  fontSize: "48px"
}).setOrigin(0.5);
```

所有 Emoji 应围绕中心旋转/缩放。

## 5. Emoji Motion

Emoji 必须作为"游戏实体"表现，而不是静态 UI Icon。

支持：

``` text
Rotation
Scale Punch
Bounce
Spin
Arc Movement
Trail
Impact Scale
Fade
```

例如 ISTP：

``` text
🔧 → Spin → Trail → BONK! → Impact Ring → Knockback
```

命中时可：

``` text
100% Scale
→ 140%
→ Fade / Destroy
```

## 6. Gameplay / Presentation Separation

Server 只负责：

``` text
Projectile State
Damage
Position
Velocity
Collision
Hit
```

Client 负责：

``` text
Emoji
Font Size
Rotation
Trail
Impact VFX
Typography
Animation
```

Server 不同步视觉细节。

## 7. Presentation Data

建议 Character Presentation 中定义：

``` ts
interface ProjectilePresentation {
  symbol?: string;
  fontSize?: number;
  spinSpeed?: number;
  trailType?: string;
  impactType?: string;
  hitText?: string[];
}
```

例如：

``` ts
{
  symbol: "🔧",
  fontSize: 46,
  spinSpeed: 8,
  trailType: "short",
  impactType: "bonk",
  hitText: ["BONK!"]
}
```

## 8. Meme Text Renderer

建立统一 `CombatText` / `MemeText`。

支持：

``` text
World Position
Scale Punch
Rotation
Fade
Float
Screen Space
```

文字数据集中管理，不散落在技能代码。

例如 ENTP：

``` ts
const ENTP_MEME_TEXT = [
  "ACTUALLY!",
  "SOURCE?",
  "WRONG.",
  "TECHNICALLY..."
];
```

ESTJ：

``` ts
const ESTJ_MEME_TEXT = [
  "DEADLINE",
  "KPI",
  "ASAP",
  "NEEDS IMPROVEMENT"
];
```

## 9. Geometry VFX Library

建立轻量复用库：

``` text
ImpactRing
Shockwave
AimLine
Arrow
WarningCircle
ExplosionCircle
TargetMarker
PredictionLine
ZoneOutline
Flash
Trail
```

继续使用 Phaser Graphics。

## 10. 16 人格视觉映射

### INTJ

`♟️` 棋子 + Prediction Lines + Target Marker。

### INTP

`❓ 🤔 💭` + Wobble + Thinking Zone + `Maybe / But...`。

### ENTJ

`👉` + 巨型几何箭头 + `YOU. / GO.`。

### ENTP

`💬 ☝️` + `ACTUALLY / SOURCE? / WRONG / TECHNICALLY` + Speech
Shockwave。

### INFJ

`👁️` + Psychic Beam + Target Marker + Delayed Explosion。

### INFP

`♥️ 🥲 💔` + `我没事 / 我忍你很久了！` + Emotional Shockwave。

### ENFJ

`✨` + Push Ring + `不要打了！`。若手掌 Emoji 跨平台效果不好，直接使用
Geometry Push Ring。

### ENFP

`⭐ 🌈 💡 ✨`；随机技能使用 `💣 🐔 ❤️ ⚡ 🚀`。ENFP 是 Emoji
视觉语言重点角色。

### ISTJ

优先 `📏`；若显示不佳，用简单 Rectangle + Tick Marks，不立即画
Sprite。配合 `✓ ✓ ✓ / SOP`。

### ISFJ

`🛡️` + Shield Arc + 360° Shockwave。

### ESTJ

`📋 📅 ⏰ 📊` + `DEADLINE / KPI / ASAP / NEEDS IMPROVEMENT` + Warning
Zone。

### ESFJ

`💌 🤝 📸` + Pull Lines + `3 / 2 / 1 / FLASH / BOOM`。

### ISTP

`🔧` + Spin + Trail + `BONK!`。炮台 Emoji 不清晰时优先 Phaser Geometry
Turret。

### ISFP

优先 `🖌️ 🎨` + Paint Trail / Art Zone。显示不佳才做简单 Brush Symbol。

### ESTP

`👊 💨 ⚡` + Dash Trail + Impact Ring + `WOOOOOO!`。

### ESFP

`🎤 ✨` + Sound Rings + Spotlight + `MY SHOW!`。

## 11. Emoji Compatibility

Apple / Windows / Android 的系统 Emoji 外观可能不同。

Prototype 阶段接受这种差异，不因此提前制作完整自有资产。

维护简单兼容表：

``` text
Symbol | macOS | Windows | iOS | Android | Status
```

Status：

``` text
GOOD
ACCEPTABLE
BAD
```

只有 BAD 才进入替代流程。

## 12. 第一轮 Vertical Slice

当前只应用到：

``` text
ENTP
INFP
ESTJ
ESTP
```

目标：

``` text
Custom Sprite Asset = 0
```

### ENTP

验证 `💬 ☝️ ACTUALLY SOURCE?` + Speech Shockwave。

### INFP

验证 `♥️ 🥲 💔 我没事` + Emotional Explosion。

### ESTJ

验证 `📋 📅 ⏰ 📊 DEADLINE KPI` + Warning Zone。

### ESTP

验证 `👊 💨 ⚡ WOOOOOO!` + Dash Trail + Impact Ring。

## 13. Readability

Emoji 作为战斗实体时优先保证可读性。

``` text
Readable > Realistic
```

必要时夸张放大 Projectile。

推荐渲染层：

``` text
Ground Zone
→ Character
→ Projectile / Emoji
→ Impact VFX
→ Meme Text
→ HUD
```

## 14. Performance

多人战斗中 Emoji / Text Object 数量会快速增加：

-   及时 Destroy
-   高频 Projectile 可 Object Pool
-   Ultimate 文字数量设上限
-   禁止无限生成 Emoji
-   8 Players 测试 FPS / Object Count / Memory

## 15. Codex 当前执行任务

1.  建立 `CombatSymbol / EmojiRenderer`
2.  建立 `CombatText / MemeText Renderer`
3.  建立 Geometry
    VFX：ImpactRing、Shockwave、Trail、WarningCircle、AimLine
4.  Presentation Data 与 Gameplay Data 分离
5.  应用到 ENTP / INFP / ESTJ / ESTP
6.  Desktop Test
7.  Mobile Browser Test
8.  建立 Emoji Compatibility 记录
9.  STOP

## 16. Acceptance Criteria

-   [ ] ENTP 明显有互联网杠精感
-   [ ] INFP 明显有玻璃心 / 情绪爆发感
-   [ ] ESTJ 明显是 Deadline / KPI
-   [ ] ESTP 明显是冲了再说
-   [ ] Emoji 有 Motion，不像静态 UI Icon
-   [ ] Typography 参与战斗表现
-   [ ] Geometry VFX 提供力量感
-   [ ] Emoji Presentation 与 Server Gameplay 分离
-   [ ] 四角色无需 Custom Sprite 即可成立
-   [ ] Windows / macOS / iOS / Android 基础可读
-   [ ] Mobile Touch Controls 不受影响
-   [ ] 多人同步不依赖 Emoji 表现

## 17. Agent 禁止事项

不要：

-   为每个攻击物立即画 Sprite
-   把 Emoji 写死在 Combat Logic
-   Server 同步 Font / VFX / Rotation 等视觉细节
-   为每个角色复制 Emoji Renderer
-   为每个角色复制 Meme Text System
-   因跨平台 Emoji 略有差异就全部替换
-   Prototype 阶段制作完整自有 Emoji Pack
-   让 VFX 影响 Hit Detection

## 18. Future Art Upgrade

玩法验证成功后才评估：

``` text
System Emoji
↓
MBTI Brawl Custom Emoji Set
```

自有资产仍保持：

``` text
Emoji-like
Simple
Flat
Bold
Readable
Playful
```

目标不是变得更写实，而是统一品牌风格。

## 19. Final Visual Formula

``` text
Stickman
+
MBTI Head
+
Emoji Prop
+
Meme Typography
+
Geometry VFX
+
Exaggerated Motion
=
MBTI Brawl
```

最终原则：

> **具体物品优先 Emoji。人格表达优先 Typography。抽象力量优先 Geometry /
> Motion。Emoji 无法清楚表达时，才考虑手动画。**
