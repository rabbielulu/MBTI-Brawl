# 美术与技能特效升级 V1：首轮实施方案

状态：方案已获用户确认，首轮独立VFX Playground已完成。依据需求文档第9节，确认后仅实现独立VFX Playground，正式战斗场景暂不接入。

## 1. 当前渲染技术与限制

项目为 Phaser 3.90 + TypeScript + Vite。Phaser.AUTO优先WebGL，支持Canvas回退；角色及场景由Graphics程序化绘制，菜单为DOM。Node/Socket.IO服务端权威战斗，客户端ProjectileTimeline处理连续弹丸表现。保持此结构，无需PixiJS、Three.js或Unity。

现有GeometryVfx包含圆环、冲击波、简单线条拖尾与预警圈；CombatVisuals以emoji、文字及几何组成特效。FrameTextPool复用Text对象，正式场景另有文字池与效果数组上限80。CharacterFace共享Phaser与SVG角色面容。

主要限制：地面每帧重画网格与装饰；冲击波多为循环变化，缺少单次生命周期；缺少通用粒子池及高/中/低质量分级；角色几何绘制集中在main.ts。大量Text更新、Graphics三角化、大面积透明叠加都可能增加CPU/GPU负担。现有visual-lab.html用于Emoji压测，保留，不直接覆盖。

## 2. 地面方案

独立程序化ArenaFloor，以固定视觉种子生成紫蓝色低对比三角/多边形块；在参数变动时重绘缓存层，不每帧生成地砖对象。调节底色、密度、明暗差及边缘对比。柔和多层椭圆模拟接触阴影，障碍增加立面与顶面明暗，泥潭用暖褐、有毒区域用黄绿，危险范围仍有清晰实线边界。

首轮Playground仅放少量静态泥潭、毒区和障碍样例用于可读性检查，展示数据与正式TerrainMap隔离，不新增碰撞或地图逻辑。

## 3. VFX架构

独立VisualClock只接受dt和演示事件。BurstVfx管理蓄力→爆发→消散三阶段，不发送游戏输入或网络消息。粒子使用预分配数组/空闲槽复用，预算内申请；优先保留核心闪光与危险边界，预算不足先减次要火花。

VfxConfig提供数量、颜色、方向、速度、生命周期、重力、缩放、透明度、光晕强度、冲击波半径/扩散速度、震屏幅度。蓄力聚拢粒子和小光晕；爆发白色核心、彩色外层、一次扩散环和向外粒子；消散衰减光晕、粒子阻尼和透明度。

WebGL提供独立ADD混合发光层；Canvas使用透明叠加回退。首轮不用真正Bloom，而用小面积多层软光近似。评估Bloom需先有目标PC帧时数据，不引入全屏模糊或多Pass后处理。

## 4. 角色动作方案

复用当前CharacterFace和火柴人比例，Playground内使用可复用ActorView适配器，绘制位移/缩放与碰撞完全分离。演示Idle呼吸、Run摆动、Cast压缩/恢复、Hit闪白和压缩、击退残影、Death倒地。视觉顿帧只停ActorView局部pose，绝不暂停场景时钟、输入或服务器。

首轮使用一个现有角色作为施法者和受击状态演示，不逐个重做16人格。冠军页/皇冠/撒花流程保持原状。

## 5. 文件清单

新增：
- vfx-playground.html：独立入口及参数控制面板。
- src/client/art/ArtConfig.ts：配色、地面、质量档位与粒子预算。
- src/client/art/ArenaFloor.ts：缓存地面与接触阴影。
- src/client/art/ParticlePool.ts：有上限的粒子状态池。
- src/client/art/BurstVfx.ts：阶段、光晕、冲击波和粒子驱动。
- src/client/art/ActorView.ts：共享面容与局部视觉动作。
- src/client/art/VfxPlayground.ts：独立Phaser场景、参数联动、重播和压力演示。
- src/client/art/playground.css：面板、指标与响应式布局。
- tests/vfx-pool.ts：预算、生命周期、回收、帧率无关模拟等必要规则测试。

修改：
- vite.config.ts：新增构建入口，保留现有main及visualLab。
- README.md：访问路径、参数说明与已验证平台。

首轮不修改server、战斗数值、随机地图、多人协议或正式main.ts的视觉调用。

## 6. 性能与兼容性

高/中/低初始粒子预算分别512/256/96（首轮测量后调整），同时爆炸演示上限16次；过载丢弃装饰粒子，不增加对象总数。限制每帧模拟dt，粒子不创建Phaser对象；记录FPS、平均/P95帧时、活跃粒子/上限、丢弃数量、绘制对象数量。

用PC浏览器检查单发、8次和16次同步爆发；测试低档和Canvas回退；后台恢复清理过期粒子，resize复用资源，减少动态效果偏好关闭震屏并减少闪光。目标60FPS不是未测先承诺。当前只能验证本机浏览器；Windows/Electron/Steam必须在后续有对应环境时实测，不能以Mac浏览器通过代替。

## 首轮交付与验收

地址为 /vfx-playground.html。包含升级地面、现有火柴人、完整技能演示、地面光晕/粒子/冲击波/受击反馈、实时参数面板、质量档位和压力指标。完成后提供截图和测量结果供视觉验收，再决定接入正式场景的角色与技能批次。
