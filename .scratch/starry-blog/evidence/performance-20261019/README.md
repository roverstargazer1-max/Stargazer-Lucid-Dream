# 2026-10-19 性能与动效审查

已完成整站采样、针对性诊断、两项优化及回归。采用星盘入口的无损显示缓存、首次阅读前准备原底图／字体；保留图像、镜头、旋转、步行和聚焦开合。基线 `c4b80be` 已含云层长带与入口白环修复，不将它们重复计入性能收益。

实现分开提交：`5849cb7`（入口缓存）、`277b001`（阅读准备）。这是本地实现与本地构建验证，没有推送或部署。

## 采用的改动与证据

| 项目 | 原实现 | 最终实现与验证 |
| --- | --- | --- |
| 星盘入口图片 | 两张 1254×1254 PNG，共 3,318,207 字节 | 同尺寸无损缓存共 1,178,260 字节，减少 64.5%；原 PNG 继续逐字节发布。96 组浏览器截图字节一致，覆盖尺寸、DPR、方向和悬停。见[缓存说明](entry-cache.md)。 |
| 第一次阅读 | 完整复测中桌面 170ms、手机模拟 131ms 解码相关长任务；专项 trace 见约 190ms WebP 解码及主线程等待提交 | 选星、检索及直达页面时按需准备原底图和字体，不增加首页正文图片请求；失败不阻塞文字。浏览器回归在基线按预期失败，最终版四种情形通过。见[阅读准备](reader-preparation.md)。 |

磁盘清理后，冻结基线和最终版串行复测，每个版本各含桌面／手机模拟共 44 段，覆盖冷启动、房间静止、穿窗／返回、天空静止、拖动／缩放、选星／观测、正文开合／静止／滚动、检索开合／展开／输入／悬停、模式切换，以及旧 Kira 首页和文章的静止／滚动。见 [baseline-c](baseline-c-summary.json)、[final-c](final-c-summary.json)和自动提取的[对照汇总](comparison-summary.json)。

| 首次打开正文，未限速 | 桌面：基线 → 最终 | 手机模拟：基线 → 最终 |
| --- | ---: | ---: |
| 最大 RAF 间隔 | 183.3 → 50.4ms | 133.3 → 17.8ms |
| 长任务 | 170ms → 无 | 131ms → 无 |
| 采样段主线程占用 | 247 → 66ms | 223 → 102ms |

这说明首次显现的集中解码阻塞减少，不表示所有分位都变快或稳定达到屏幕 60FPS。此前有效流程 `baseline-b` 同样出现 158／140ms 阅读长任务；`candidate-a` 最终方案样本也没有该长任务，可作重复观察。专项 trace 和逐次 JSON 保留本地。

最终版首页准备阶段的已编码资源，桌面由 7,090,364 降到 4,951,493 字节，手机模拟由 6,997,243 降到 4,858,372 字节，均少 2,138,871 字节（计入新增模块）。本地 ready 时间在设备间有波动，不把下载量下降换算为稳定首屏提速；Canvas／遮罩场景的 LCP 也不直接代表整个房间已准备完成。

## 流畅度与剩余限制

- 最终未限速的 44 段操作采样均无长任务、脚本错误或请求失败；不包括导航／首屏加载期间的任务。探索、拖动、缩放、正文滚动和旧版滚动的 P95 约 17.4–17.8ms。
- 桌面阅读与检索过场仍有峰值：首次阅读最大 50.4ms，检索开合最大 50／83.4ms，输入最大 66.6ms。专项 trace 还观察到 GPU／合成线程等待；没有 JavaScript 长任务不等于完全流畅。更早检索退出样本曾出现 533ms 间隔，最终单轮较低不证明该类 GPU 峰值永久消失。
- CPU 4× 限速另测 44 段，操作完成且无脚本错误或请求失败；探索／缩放／正文滚动多数 P95 约 17.5–17.7ms。首次阅读最大约 67ms，检索打开约 116–117ms，仍有 60–116ms 长任务。桌面背景进入 low、手机进入 balanced，前景与文章行为保留。见[压力摘要](final-pressure-summary.json)。CPU 限速不模拟手机 GPU 或网络。
- 旧版首页／文章静止与滚动正常，没有新增主题代码改动；冷加载仍有已有初始化任务，不据静止样本声称所有第三方内容均已播放验证。

背景轨道与提前冻结天空的试验未进入最终代码。一个候选在已生成伪元素的 fixture 上通过，却在真实轻动效生命周期失败；已恢复原规则，初步数字全部排除，见[撤回试验与无效样本](rejected-experiments.md)。

## 功能、内存和构建

- [生命周期回归](lifecycle-summary.json)：桌面、手机、短横屏、轻动效、穿窗／阅读／检索中调整窗口，均完成选星、滚动、筛选阅读、恢复检索条件和回屋。正常背景为阅读 2.4px／检索 1.2px，轻动效均为 0px。
- 预热三轮，再连续 12 轮阅读／检索往返。强制 GC 后堆增长 165,688 字节（约 162KB），元素数在第 4 轮后保持 566，样式表 3 个、活动动画 0 个。未发现逐轮增加的界面副本；脚本堆测量不代表 GPU 总内存。
- [启动回退](startup-summary.json)：桌面／手机在模块未到达时先显示房间；关闭 JS、模块失败、WebGL 不可用时恢复文章清单，文章直达模块失败时静态正文仍可读。底图失败由阅读回归覆盖。
- `npm test` 的 93 项检查及 `npm run build` 双主题构建通过；最终按仓库指定 Node 22.19.0／npm 10.9.3 复核。新版输出 `/`、旧版 `/legacy/`，没有发布。

## 复测条件与方法

Apple M1、16GB、macOS 27.0.1，Chromium 149.0.7827.55。桌面 1440×900、手机模拟 390×844，DPR 2；窗口可见且串行测量，不与构建／其他浏览器测试争用。系统电池和接电均开启省电模式，本次未修改。RAF 表示浏览器回调节奏，不是屏幕呈现帧；本机、手机模拟、实体手机和线上服务分别报告。

冻结基线位于本机临时快照，以 4191 提供；工作预览为 4175。快照复制自 `c4b80be` 的统一输出，使用仓库已有 `power-transitions-20261010/serve-snapshot.mjs`。重新取得基线时，应在独立目录生成该提交并保存完整输出，不混用优化版脚本或图片。不要用请求拦截制作缓存对照，因为拦截会关闭浏览器 HTTP 缓存。

```sh
PERF_HEADED=1 STARFIELD_TEST_URL=http://127.0.0.1:4191/ node .scratch/starry-blog/evidence/performance-20261019/audit.mjs baseline-c
PERF_HEADED=1 node .scratch/starry-blog/evidence/performance-20261019/audit.mjs final-c
PERF_HEADED=1 PERF_CPU=4 node .scratch/starry-blog/evidence/performance-20261019/audit.mjs final-pressure
node .scratch/starry-blog/evidence/performance-20261019/lifecycle.mjs
node .scratch/starry-blog/evidence/performance-20261019/reader-readiness.mjs optimized
node .scratch/starry-blog/evidence/performance-20261019/entry-pixels.mjs
STARFIELD_EVIDENCE_DIR=.scratch/starry-blog/evidence/performance-20261019 node .scratch/starry-blog/evidence/performance-20261009/startup-check.mjs final
node .scratch/starry-blog/evidence/performance-20261019/summarize.mjs
```

主要新脚本可用 `PLAYWRIGHT_MODULE`、`CHROMIUM_PATH` 指向本机安装；`audit.mjs` 支持 `PERF_DEVICES`、`PERF_CPU`。脚本、说明和摘要提交；逐帧数据、trace、截图仅本地保留，遵守[保存约定](../README.md)。磁盘清理仅删除用户授权的可重建缓存，释放约 2.79GB，见[记录](disk-cleanup-summary.json)。
