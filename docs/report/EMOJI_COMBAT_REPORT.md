# Emoji Combat Visual · 验收记录

依据 `MBTI_BRAWL_EMOJI_COMBAT_VISUAL_CODEX_SPEC_V0.1.md`；日期 2026-10-23。仅应用 ENTP / INFP / ESTJ / ESTP，不扩展角色，不修改伤害、冷却、命中或碰撞规则。新增 Custom Sprite = 0。

## 实现

- `CombatSymbol`：统一中心原点 Emoji，字体栈、旋转、缩放、透明度、图层。道具上下浮动；文件板旋转飞行；拳头放大；冲刺气流；命中放大至约 140% 后淡出。
- `CombatText`：统一世界 / 镜头固定文本、描边、缩放冲击、旋转、上浮与淡出。梗文字集中在 `CharacterPresentation.ts`。
- `GeometryVfx`：ImpactRing、Shockwave、Trail、WarningCircle、AimLine，全部通过 Graphics 绘制，不参与命中。
- `CombatVisuals`：共用 prop / projectile / zone / effect 表现入口，供正式游戏和独立压测复用。旧单机 ENTP 的弹丸和爆发也使用同一渲染层。
- `FrameTextPool`：Emoji 128、梗文字 96 上限。每帧复用并重置中心、旋转、缩放、透明度、描边、镜头模式与图层；场景 shutdown 销毁。超额 Emoji / 梗文字跳过，只降低表现密度。短时效果最多 80 条；客户端待播放 CombatEvent 最多 256 条。
- 图层：场地 0 → 地面 VFX 5、区域 Emoji/文字 8/9 → 火柴人 10、道具 15 → 弹丸 Emoji 30 → 命中 40/45 → 梗文字 50、角色标签 55 → 既有 DOM HUD。

## 四人格表现

| 人格 | Emoji | Typography / Motion |
| --- | --- | --- |
| ENTP | 💬 ☝️ 🤓 | Actually / Source? / Wrong / Technically；漂浮对话框、指点手势、径向语言冲击波 |
| INFP | ♥️ 🥲 💔 | 我没事 / 我忍你很久了；柔软浮动、含泪受击、碎心放大和情绪冲击波 |
| ESTJ | 📋 📅 ⏰ 📊 | DEADLINE / KPI / ASAP / NEEDS IMPROVEMENT；旋转文件板、倒计时警戒圈、最后一秒闹钟 |
| ESTP | 👊 💨 ⚡ 💥 | WOOOOOO! / POW!；前伸拳头、冲刺速度线与气流、肾上腺素闪电、命中圈 |

日历 Emoji 自带日期不代表技能倒计时；真正倒计时独立绘制。

## Gameplay / Presentation 分离

共享 `CharacterDefinition` 与 `CharacterDatabase` 保留战斗数据。group、颜色、Emoji、武器文案、姿态和命中文字移至客户端 `CharacterPresentation.ts`，客户端合成只读展示视图并缓存。Server 不再导入旧含视觉字段的 `src/characters.ts`。

协议 **v5**：弹丸移除 glyph，改为 gameplay source（basic / skill）；cast 事件移除 name，改传 skillId。服务器不发送 Font / Spin / Scale / Trail / Meme 等细节。客户端按 owner.mbti、source、skillId / ultimate 与已有状态选表现。服务器仍决定位置、速度、命中、伤害、状态、能量与冷却。

Host 已在原 3000 端口重启。旧页面必须刷新；不混用 v4 页面与 v5 Host。

## 修改文件

新增 `src/client/presentation/CharacterPresentation.ts`、`FrameTextPool.ts`、`CombatSymbol.ts`、`CombatText.ts`、`GeometryVfx.ts`、`CombatVisuals.ts`、`VisualLab.ts`；新增 `visual-lab.html`、`tests/presentation.ts`、本报告与 `EMOJI_COMPATIBILITY.md`。

修改共享 CharacterDefinition / CharacterDatabase / NetworkProtocol / CombatTypes / GameConstants，服务端 GameRoom / SkillSystem，客户端 main / NetworkClient，Vite 多页构建配置、package.json 测试命令与 README。没有添加第三方依赖或图像资产。

## 自动验证

- TypeScript 与 Vite 生产构建通过；Phaser 公共 chunk 约 1.49MB，仍有包体提示。
- `test:presentation`：1,000 帧每帧 80 次借用、12 对象上限稳定；复用重置变换 / 镜头模式；场景结束释放全部 Text；四人格映射完整；序列化弹丸 / cast 不包含 glyph、fontSize、rotation、presentation、spinSpeed、hitText。
- `test:characters`：四套角色规则与四 Socket 同步通过。
- `test:network`：双人移动 / 伤害 / HP / 能量 / 击退、四席位上限、20 轮击倒重置通过。
- `test:input`：触控与桌面输入回归通过；单机战斗和 1,000 张地图测试通过。

## 浏览器验收

使用 game-playtest 工作流。1280×720 正式游戏四角色同时连接、Emoji 道具与 Deadline 提示可见；PC 右键技能、冷却正常；844×390 横屏触屏拖动 Deadline 成功，右摇杆松手发射旋转文件板。未增加会拦截触控的 DOM 层。最后检查正式游戏控制台无 warning / error；测试连接全部关闭，不占用试玩席位。

截图在 `artifacts/emoji-combat/`：`four-characters.png`、`mobile-deadline.png`、`mobile-projectile.png`、`visual-stress.png`、`stress-160.png`。

macOS 宿主当前浏览器内 Emoji 可读；日历固定日期评 ACCEPTABLE，其余本轮符号 GOOD。Windows / iOS / Android 真机无法在本环境实测，明确待测，见兼容表；手机尺寸模拟不等于真机验收。

## 八角色性能检查

`/visual-lab.html` 独立绘制八名视觉角色，共用正式渲染器，不连接 LAN、不增加四人上限。页面可切换每人 10 / 20 弹丸并暂停动画，显示 FPS、Scene 对象数、池状态、丢弃数量和可用时的 JS heap。

实际观察快照：

| 负载 | FPS | Scene 对象 | Emoji active / allocated / limit | Text active / allocated / limit | JS heap |
| --- | --- | --- | --- | --- | --- |
| 8 × 10 弹丸，样本 4 | 60 | 166 | 109 / 111 / 128 | 52 / 52 / 96 | 22MB |
| 同负载，样本 43 | 60 | 166 | 110 / 111 / 128 | 52 / 52 / 96 | 38MB |
| 8 × 20 弹丸，样本 69 | 60 | 203 | 128 / 128 / 128 | 72 / 72 / 96 | 35MB |
| 返回 8 × 10，样本 70 | 59 | 203 | 109 / 128 / 128 | 52 / 72 / 96 | 29MB |

超额模式该帧跳过 62 个 Emoji；回到普通负载不再跳过。分配量保留高水位供复用，不继续增长；JS heap 呈波动并回落。数据是当前浏览器短时观察，**不是八人真实网络对战、移动硬件性能或总内存长期稳定性结论**，也不包含 GPU 内存。缓存静态角色展示视图后进一步减少每帧临时对象分配。

## 已知限制 / STOP

- 跨平台系统 Emoji 字形允许不同；真机兼容表仍需回填。
- 旧系统可能缺 🥲；本次无 BAD 观察，不提前制作素材包。
- 压力模式主动丢弃超限视觉；服务端状态与伤害不会因此改变。
- 委屈 / 血量 / 技能数值维持上一阶段，单机训练仍为原 ENTP；此轮只换表现。
- 不实现剩余 12 人格、完整 Emoji Pack 或新战斗机制。本轮按规范在四人格视觉验收后停止。

## 可读性调整 · 2026-10-23

根据试玩反馈，远程弹丸速度 ENTP 680→480、INFP 540→380、ESTJ 780→550（约降低 30%）。普通弹丸与 ENTP 技能弹飞行寿命改为 1.4 秒，单机同样跟随，以大致保留原射程。伤害与攻击间隔不变。

ENTP 普攻文字 15→24、技能文字 21→30，文字保持水平，向上留出更多间距。通过类型检查、角色 / 战斗 / 对象池回归与生产构建；在 1280×720 正式 LAN 页面观察连续弹丸小字清晰、间距可分辨。截图：`artifacts/emoji-combat/readable-projectiles.png`。Host 已重启，页面刷新生效。

## 联机弹丸平滑 · 2026-10-23

定位到旧版逐包重置外推基准：30Hz 服务端模拟被 20Hz 快照采样，位置增量交替跨 1 / 2 tick；渲染端每包重新从 age=0 外推，因此出现锯齿式速度变化。

新增客户端 `ProjectileTimeline`。连续推进渲染 tick，使用服务器 tick 与线性弹丸状态绘制，收包只以最高 ±10% 速率缓慢校正时钟；不再重置弹丸画面位置。新出现弹丸限制在首次观察位置之后，避免时钟落后时反投影到出生点后方。数据超过 100ms 未更新时停止无限外推；长暂停恢复、重置、断线清理时钟。弹丸命中 / 消失仍立即遵从最新服务端快照，不延后伤害或保留幽灵弹。

不修改协议、服务器频率、弹速、伤害或冷却。`npm run test:projectiles` 覆盖 30Hz 模拟 / 20Hz 快照 / 60Hz 渲染以及收包抖动，480 速度下每帧位移 7.2–8.8 像素，无倒退或跳跃；也覆盖过期外推停止、消失、重置、断线和新弹出生位置。类型检查、对象池测试与构建通过。正式 LAN 页面连续射击可正常显示，控制台无 warning/error；截图不能独立证明时序平滑，数值回归以上述逐帧测试为准。
