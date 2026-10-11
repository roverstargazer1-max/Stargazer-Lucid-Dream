# 代码工程与性能核查、整改对照（2026-10-11）

作者要求自主查实代码易读性、工程性、解耦、业务及文件结构问题，重点核查性能、卡顿和动画流畅度；先写文档，再逐项整改并分批提交。**现有 UI、素材、像素、动画轨迹、时长、交互和画质策略均为约束，不通过减效果或降质量换性能。** 本轮基于 `codex/starfield-personal` 的 `e235a8c`，真实文章主题与双主题公共流程；保留 V20 与原作者素材，不实施待确认的搜索设计，不发布线上。

## 核查边界与基线

已阅读现行设计、操作指南、10/09–10/10 性能及过场记录。按现有边界探索：`app.js` 编排文章/历史/场景，`motion.js` 维护时间线，`dome.js` 是数学，`painted.js` 是场景绘制和房间控制，独立模块负责观测、云、音频，根构建顺序生成两个主题。文章关系与星位的业务规则、正文/旧地址/内容兼容不重定义。

本机 Apple M1、Chromium 149、DPR 2；可见浏览器桌面 1440×900、手机 390×844 触屏模拟，默认完整镜头。首轮过场另用桌面 1680×970。冷快照 `/tmp/stargazer-audit-baseline-20261011`，本机静态快照端口 4187、工作预览 4175。每次测量串行执行；数值基准、真实浏览器测量和视觉/功能验证分别报告。

首轮四段进出过场 P95 17.2–17.7ms，最大间隔 33.3ms，均保持 `full`、无页面错误。四种状态各采样两秒也未复现持续掉帧：P95 17.5–17.7ms。本轮不是已查实的全站严重卡顿修复；主要处理可复现重复工作、内存及生命周期/构建可靠性问题。

## 查实的问题与整改清单

先记录下表，再开始对应实现。完成后补充测试结果与提交记录；未通过输出一致性验证的候选不进入正式代码。

| 编号 | 查实依据、影响 | 对应整改 | 状态 |
| --- | --- | --- | --- |
| P01 | `app.js` 的导向按钮每次画天空都设置 `hidden=true`，即使一直隐藏；真实浏览器天空/点星两秒均产生 121 次无效按钮属性 mutation。时间路径也在每帧根据不变的文章序列重建。影响是重复 DOM/对象工作，不能据此声称严重掉帧。 | 分离导向按钮呈现和路径几何，只在最终呈现改变时写 DOM；时间边在文章索引准备时计算。保持位置、文字、命中和点击目的地。 | 已完成 |
| P02 | 背景每帧可投影 578 个非负高度点，每次都计算相同镜头的四次 sin/cos，重复生成固定世界坐标；月亮固定 Path2D 也逐帧解析。1,040,400 点候选与原计算数值完全一致。 | 每次绘制共享预备投影器，固定世界点/月亮路径只准备一次；保留原顺序与 `projectDome` 兼容接口。让房间控制与绘制职责清晰，原镜头帧与回调原样保留。 | 已完成 |
| P03 | 云命中仅使用 alpha，却保存三张 512×224 完整 RGBA：1,376,256 字节；同尺寸 alpha 是 344,064 字节，可准确少保存 1,032,192 字节。云按钮每次投影重复赋相同位置，但 Chromium 已抑制其 style mutation，实测前后都是 0，不作为布局收益。 | 保存独立 alpha 数组；固定镜头/未变形时复用几何投影，继续每帧更新 hover 与透明度；保留原按钮样式赋值和可见性判定。云图、漂移、发光与命中阈值沿用。 | 已完成 |
| P04 | `prepareEmbeddedPlayer` 每次重开缓存音乐文章都调用全局 `loadMeting`；实际供应商代码会销毁原播放器、重新取歌单。真实代码复现两次准备产生两次请求、两个播放器和两个观察器；异步未完成时更明显。交叉复核又在真实 APlayer + 本地静音音频中复现：历史切换阅读文章后，已移出的旧播放器仍在播放。 | 按容器持有初始化状态，重用已初始化及进行中的请求，限定文章播放器生命周期，避免全局重建；失败仍提供原提示。历史导航成功加载并确认当前请求后，先暂停音频，再替换正文 DOM。 | 已完成 |
| P05 | 双主题入口对全页任意 hover/focus/click 扫描所有链接并重写地址。真实脚本复现 100 次地址未变的 hover 引发 101 次扫描、400 次相同 href 写入（4 个入口）。 | 自动事件只在地址变化时刷新；显式刷新仍处理新增/缓存内容入口；地址未变的链接不写入。保留路径、query、hash 与历史切换。 | 已完成 |
| E01 | 构建先删除旧输出再安装新目录。执行真实 `buildBlog` 的临时文件系统注入最终 rename 失败，旧可用预览消失。 | 提取可回滚的输出安装边界，保留旧目录直到新输出成功安装；失败恢复，成功清理。保持双主题顺序和最终目录结构。 | 已完成 |
| E02 | 预览服务 HEAD 完整读入文件。真实处理器对正文底图 20 次 HEAD 返回正文 0 字节却读取 49,371,040 文件字节。GET 也把整张图读入 JavaScript 缓冲。 | HEAD 只返回文件元信息；GET 流式发送并处理断开/读取错误。此项仅减少本地服务 I/O/峰值缓冲，不归入线上动画收益。 | 已完成 |

## 已检查而不整改的候选

- 窗边静止两秒出现约 121 次布局，单独跳过隐藏阅读人物的尺寸读取、单独跳过隐藏几何图形读取都仍为约 121 次。未查实它们造成额外布局或用户可感知卡顿，不削减窗边星尘动画。
- 云与背景原先已有缓存，窗边/静止正文已经停止天空重复绘制；不重复实施既有优化。
- `experience.js`、日期展示和导航纯函数未复现业务故障；不为文件数量进行无依据的拆分。关系构建在十篇文章下未查实为用户可感知瓶颈，保留现有规则。
- 不改 shader、原图、字体、星点数量、帧数、镜头时间线、CSS 动效、画布分辨率或已有自适应预算。

## 验证要求

1. 各项使用真实调用模式的回归反馈循环，先确认原问题，修复后再复测。
2. 背景/云的浏览器 RGBA 与命中逐点对照，覆盖镜头、缩放、档位、两种视口与动画时点；不能用相似截图代替像素验证。
3. 浏览器覆盖进入/返回、拖动与缩放、选星/两种模式、正文开关与进度、晚到图片、尺寸变化、失败回退、历史导航和音乐快速重开。
4. 运行仓库自动检查和双主题正式构建，比较快照与最终静态输出，除有意修改/新增的脚本外，不改变 HTML/CSS/图片/索引。
5. 对照实测数据报告；触屏模拟不冒充真机，RAF 间隔不冒充屏幕像素呈现时间，同步绘制计时不冒充 FPS。本轮仅本地验证。

## 执行与最终结果

七项均完成；历史音乐暂停的补充复现先写入 P04，再修复。提交依次为：问题清单 `3d69a23`、导向/时间边 `3d8bb02`、构建回滚 `1797a5b`、播放器容器生命周期 `5ef52d4`、主题入口 `a97b257`、预览流式服务 `2e92639`、投影/房间职责 `92fec89`、云命中与缓存 `4f173d1`、历史阅读音频 `7ded84d`。最后一批保存本记录、可复测脚本、摘要与代码职责索引。所有提交在当前本地分支，未触发远程发布。

### 效果与业务一致性

- [输出对照](output-summary.json)：原 276 个生成文件中，269 个字节相同；只有 7 个预期 JavaScript 文件改变，新增 `edge-guide.js`、`room-scene.js`。63 个 HTML、全部 CSS、图片、字体与 `starry/index.json` 完全相同。预览及最终 `public/` 均通过相同断言。
- [背景对照](render-pixels-summary.json)：432 组跨两种视口、4 种 DPR、3 种环境档位/背景步长、不同 yaw/pitch/clarity，RGBA 通道差异为 0。房间控制函数完整语法树相同，只有文件位置与格式展开。
- [云对照](cloud-pixels-summary.json)：96 组覆盖 full/soft、hover/激活/阻塞、镜头、中心、focal 和尺寸变化；RGBA、按钮位置与可见性差异为 0。344,064 个 alpha 值以及 1,182,680 次命中结果全部一致。
- 真实 APlayer 选项与当前已安装 MetingJS 1.2 直接对照一致，自动播放仍为 false。快速重复准备只产生一个请求/一个播放器；8 秒失败提示、晚到恢复、失败重试与脱离 DOM 后重开均通过。真实浏览器的历史播放反馈循环先失败（旧歌仍在播放），修复后同篇导航、换篇暂停、后退重用播放器、前进均通过；使用本地静音 WAV 和受控歌单，没有把它当作第三方服务播放成功。

### 可量化收益与限制

| 反馈循环 | 之前 | 之后 | 结论范围 |
| --- | ---: | ---: | --- |
| 静止星空/点星两秒的导向属性 mutation，桌面/手机 | 各 121 次 | 各 0 次 | 真实 DOM 重复工作消失；全页反馈循环由失败转通过 |
| 云命中保存的字节 | 1,376,256 | 344,064 | 准确少 1,032,192 字节，约 0.984MiB；仅该数组，不是页面总堆/显存 |
| 静止镜头下 180 帧云三角调用 | 21,600 | 0 | 第一帧已准备几何；仍更新 hover/透明度及原绘制 |
| 100 次无地址变化 hover 的额外链接扫描/赋值 | 100 / 400 | 0 / 0 | 初始化仍有一次正常扫描；query/hash/历史/显式刷新回归通过 |
| 同一音乐容器重复准备的歌单请求/播放器 | 2 / 2 | 1 / 1 | 真正供应商代码及实际缓存调用模式 |
| 20 次正文底图 HEAD 读取文件正文 | 49,371,040 字节 | 0 字节 | 仅本地 HTTP 服务；GET 逐字节一致，断开/读取失败会释放描述符 |
| 最终安装失败后的旧输出 | 丢失 | 全部恢复 | 两个主题和原旧路由均保留；回滚本身失败则保留备份并报告路径 |

[数值微基准](projection-cost-summary.json) 对 1,040,400 点完全一致，9 轮、每轮 1,800 帧的中位数约 159.9→64.2ms。它仅测同步投影函数，绝对数随 JIT/环境波动，不是整页 CPU、FPS 或呈现时间。

[真实运行摘要](runtime-summary.json) 的正常四状态最终全部保持 full，P95 17.5–17.7ms；原运行 P95 17.3–17.7ms，部分桌面样本触发既有 balanced。**帧节奏保持，没有证据宣称整站帧率大幅上升或全局 CPU 大幅降低。** 本轮减少了可复现计算、分配、请求和生命周期隐患，保留既有预算与动效。

四倍 CPU 压力的独立复测覆盖桌面/手机各两轮进入/返回，8 段全部通过 P95≤25ms、最大≤80ms、超过50ms不多于两次的既有断言；P95 17.5–17.6ms，最大 33.3ms，无页面错误。桌面进入既有 balanced、手机保持 full。第一次压力轮与 npm test/build 重叠，桌面首次 P95 33.2ms 不通过；该轮保留在摘要的 `excludedOverlappingRun`，没有当作成对性能证据。构建结束后独立重跑的全部结果也保留。

### 整体验证

最终 `npm test` 68/68 通过，双主题 `npm run build` 成功生成新版根路径与 `/legacy/`；未修改源文章、稳定身份、星位、关系、依赖或配置。

既有过场回归在 [本轮摘要](regression-summary.json) 中通过 12 段 full/soft 操作，覆盖实际 1900/2600ms 过场与原关键帧、途中调整尺寸、确定的持续压力、画质切换与清理；空天空帧为 0。既有桌面/触屏模拟交互回归验证点星、正文开关、文末与晚到图片、尺寸变化、时间/关联切换及返回；窗边与静止阅读的天空重复绘制为 0，进度冗余文字 mutation 为 0。桌面/手机在主模块延迟时保持原窗边首屏，禁用 JS、模块失败、WebGL 不可用时均恢复可读清单；文章模块失败仍显示静态正文，9 个场景全部通过。

[手势回归](gesture-summary.json) 使用真实鼠标输入验证拖动与滚轮缩放，并用浏览器触摸输入模拟验证拖动与双指缩放；两种视口的星点投影均随操作改变，返回成功，无页面错误。

没有测实体手机、Safari 或实际线上部署。慢网原图体积和首次镜头/合成峰值的跨设备表现仍沿用以前记录中的限制；本轮不削减素材或动效来掩盖它们。

## 复测方法与维护

先按操作指南生成预览并启动 4175；详细 JSON/截图留本地，脚本及 `*-summary.json` 提交。浏览器脚本默认使用本机记录的 bundled Playwright/Chromium 路径，换机器需适配；`runtime-check.mjs` 可设 `PLAYWRIGHT_MODULE`/`CHROMIUM_PATH`，像素脚本可设 `BASELINE_DIR`，不能跨机器直接比较绝对耗时。

```sh
# 正式自动检查与输出
npm test
npm run build

# 原快照需从 e235a8c 的预览冻结，目录见上文；当前与原版各运行一次
STARFIELD_TEST_URL=http://127.0.0.1:4187/ PERF_HEADED=1 PERF_ASSERT=1 node .scratch/starry-blog/evidence/engineering-20261011/runtime-check.mjs baseline
PERF_HEADED=1 PERF_ASSERT=1 node .scratch/starry-blog/evidence/engineering-20261011/runtime-check.mjs optimized

# 原版应在导向属性断言失败；当前应通过
node .scratch/starry-blog/evidence/engineering-20261011/render-pixels.mjs
node .scratch/starry-blog/evidence/engineering-20261011/cloud-pixels.mjs
node .scratch/starry-blog/evidence/engineering-20261011/projection-cost.mjs
node .scratch/starry-blog/evidence/engineering-20261011/audio-history.mjs
node .scratch/starry-blog/evidence/engineering-20261011/gesture-check.mjs
OUTPUT_DIR=public node .scratch/starry-blog/evidence/engineering-20261011/output-check.mjs

# 使用同一套既有脚本；将新数据写入本轮目录，避免改写历史摘要
STARFIELD_EVIDENCE_DIR=.scratch/starry-blog/evidence/engineering-20261011 PERF_ASSERT=1 PERF_HEADED=1 PERF_CPU=4 PERF_CYCLES=2 node .scratch/starry-blog/evidence/power-transitions-20261010/check.mjs pressure
STARFIELD_EVIDENCE_DIR=.scratch/starry-blog/evidence/engineering-20261011 node .scratch/starry-blog/evidence/power-transitions-20261010/regression.mjs
STARFIELD_EVIDENCE_DIR=.scratch/starry-blog/evidence/engineering-20261011 node .scratch/starry-blog/evidence/performance-20261009/performance-regression-20261009.mjs final
STARFIELD_EVIDENCE_DIR=.scratch/starry-blog/evidence/engineering-20261011 node .scratch/starry-blog/evidence/performance-20261009/startup-check.mjs final
```

性能测量须独立于构建/其他浏览器测量串行运行。切换 MetingJS/APlayer 版本时，先运行真正供应商选项对照与历史音频回归；缓存失效必须覆盖全部几何输入，不能以阈值近似坐标来降低精度。模块职责表已加入主题 README，保留兼容入口，避免将业务关系、DOM 呈现和数学混到同一改动中。
