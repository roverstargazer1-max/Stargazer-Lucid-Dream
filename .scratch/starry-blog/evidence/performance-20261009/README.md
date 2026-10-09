# 首屏与性能复测（2026-10-09）

> 测试产物保存规则（2026-10-09）：本记录保留结论、复测代码及摘要；详细报告、逐次 JSON、截图和录像仅在本地归档，相关链接对应本地文件。历史数据仍在原提交中。见[保存约定](../README.md)。

作者要求自行测试 PC／手机、制定并执行不改变效果的优化，修复插图之前出现文章清单的首屏，并分步提交。测试对象是接入真实文章的 `stargazer-starfield` 主题；V20 与默认 Kira 构建选项沿用。本轮没有线上发布。

## 诊断与执行计划

先建立真实浏览器回归：暂停实际入口 `app.js`，等房间图片下载完成，再检查页面。优化前桌面和手机均为 `roomVisible:false, fallbackVisible:true`；这准确复现了作者所说的文字回退页抢先出现。反馈循环见 [`startup-check.mjs`](../../startup-check.mjs)，原始结果见 [baseline-startup.json](baseline-startup.json)。

按以下顺序验证并执行：

1. 如果图片被完整初始化挡住，延迟主模块时仍应只显示回退文字。已确认：房间 `display:none` 要等 `starry-ready`。首页增加很小的首屏样式与加载标记，直接显示原房间图；真实失败／关闭 JavaScript 时恢复可读清单。文章深链接仍有静态正文。
2. 如果隐藏界面抢占下载，首屏插图的完成时点会接近全部资源完成。已确认：优化前约 3.8 MB 素材同时请求，原房间图约 19.8 秒才完成。按手机／桌面预载对应图片，房间出现后再下载隐藏界面，天空贴图也不再在模块求值阶段抢先请求。首次点击前面板继续预热。
3. 如果启动计算集中造成阻塞，CPU 采样应指向少数函数。已确认：`makeCloud`、其 `hash`／`noise` 辅助函数合计约半秒，是主要启动热点；纹理上传也有开销，着色器状态检查只有数毫秒。三朵云改用原算法的 PNG 缓存，绘制、点击 alpha、发光和飘动逻辑沿用；天空图先异步解码再交给渲染器。
4. 如果稳定探索持续卡顿，四种状态应有明显慢帧。没有复现：优化前后窗边、星空、点星、正文均约 60 次动画回调／秒，没有超过 34 ms 的帧间隔，维持 `full` 画质。未削减星数、画布尺寸、步行动作、声波或既有过渡来换分数。

同时尝试无损图片编码，逐像素核对后仅采用完整步行动作图集：430,982 → 75,732 字节，尺寸仍为 1680 × 4680、68 帧，播放速度沿用。Logo、静态人物、几何图形的候选 WebP 存在浏览器色彩／透明边缘差异，已撤回；继续使用原 PNG。三朵云总计增加 123,199 字节，最终首屏资源净减少约 232 KB（约 6%）。原始作者素材没有改动或重画。

## 测试环境与证据

Apple M1／16 GB；Node 22.19.0，Chromium 149.0.7827.55，Playwright 1.62.1，Lighthouse 13.5.0。基线是本轮性能修改前、已完成 Logo／星空界面整理的同一预览，冻结到本机临时目录、同样以无压缩 `no-store` 服务器提供。关键文件 [SHA-256 清单](baseline-manifest.json)。优化版端口 4175，基线端口 4177。

浏览器测量串行运行，每组 3 次取中位数。桌面 1440 × 900，手机 390 × 844、触屏模拟，DPR 2。慢网两端均使用 150 ms 延迟、200,000 字节／秒下载（约 1.6 Mbps）、CPU 4 倍限速、冷缓存。

### 首屏与启动（实际浏览器限速）

| 指标 | 桌面优化前 → 后 | 手机优化前 → 后 |
| --- | --- | --- |
| 原房间插图可显示时点 | 19.94 → 6.58 s | 19.49 → 6.12 s |
| 完整星空准备完成 | 19.94 → 19.00 s | 19.49 → 18.54 s |
| 启动长任务超 50 ms 部分累计 | 639 → 29 ms | 605 → 34 ms |
| 初始资源，十进制 MB | 3.875 → 3.642 | 3.782 → 3.549 |

“插图可显示”是房间可见、图片请求完成并有自然尺寸后的首次动画帧，另用主模块暂停截图确认画面；不是用回退文字的 FCP 代替插图。长任务累计覆盖导航至准备完成后 1 秒，和 Lighthouse 模拟 TBT 的统计窗口不同。

原始数据：[优化前](baseline-loading.json)、[优化后](optimized-loading.json)、[汇总](loading-summary.json)。首屏暂停截图：[原桌面文字](baseline-desktop-before-js.png)、[原手机文字](baseline-mobile-before-js.png)、[现桌面插图](optimized-desktop-before-js.png)、[现手机插图](optimized-mobile-before-js.png)。

### Lighthouse（模拟限速）

每个设备／版本 3 次，桌面使用官方 desktop preset，手机使用默认 mobile preset。与作者截图的 URL、运行环境不相同，因此不把截图 58 分作为本轮数值基线。

| 指标 | 桌面优化前 → 后 | 手机优化前 → 后 |
| --- | --- | --- |
| Performance | 73 → 86 | 51 → 71 |
| FCP | 0.465 → 0.504 s | 2.030 → 2.180 s |
| 模拟 LCP | 3.703 → 2.543 s | 21.603 → 14.028 s |
| 模拟 TBT | 211 → 0 ms | 1,021 → 154 ms |
| Speed Index | 0.514 → 0.504 s | 2.030 → 2.180 s |
| CLS | 0 → 0 | 0 → 0 |

所有报告的 `runtimeError` 为空。工具控制台的 trace engine 仍有 `NO_LCP` 提示；该页面使用图片遮罩和 Canvas，独立观察器也不能持续取得有效 DOM LCP。以上模拟评分只作同条件趋势参考，插图出现与可交互时间采用前一表的浏览器测量。FCP／Speed Index 没有全面改善；原先的回退文字本就容易快速占满画面，这也说明只看首次文字绘制不足以判断观感。

[12 次结果汇总](lighthouse-summary.json)。可打开的中位数报告：[原桌面](baseline-desktop-3.report.html)、[现桌面](optimized-desktop-2.report.html)、[原手机](baseline-mobile-2.report.html)、[现手机](optimized-mobile-3.report.html)。全部 JSON 报告保留。

### 运行时复核

[原始优化前](baseline-runtime.json)、[原始优化后](optimized-runtime.json)、[四状态汇总](runtime-summary.json)。保持 `full` 画质，所有状态的 4 秒样本约 241 次回调，无超过 34 ms 的间隔，P95 约 17–18 ms。稳态负载并非本轮主要瓶颈，没有宣称运行时 CPU 大幅下降。

初次桌面点星 CPU 样本波动较大，额外交替测量同一《梦开始的地方[置顶]》3 次：主线程忙碌比例中位数 9.70% → 9.85%，均无慢帧，排除了明显稳态退化；保留原波动数据，不挑选低值。见 [成对复核](paired-selected.json)。

## 回归与视觉一致性

- 首屏反馈循环由红变绿。桌面／手机分别测试主模块暂停、模块请求失败、关闭 JavaScript、WebGL 不可用；失败时仍可读取文章清单。额外验证文章深链接在模块失败时显示原正文。
- [浏览器像素结果](browser-pixels.json)：步行动作图集和三朵云的尺寸与全部 RGBA 通道差异为 0，云的命中 alpha 差异也为 0。没有用视觉相似度替代逐像素验证。
- [桌面／手机交互回归](optimized-regression.json)：穿窗、点星、正文开关、阅读进度、晚到图片、窗口缩放、时间／关联切换、返回窗边通过；手机入口与点星使用触屏事件。静止窗边及正文背景无重复 Canvas 绘制，静止阅读无重复进度文字写入。
- [内存样本](memory.json)：预热 3 次后反复打开同一正文 12 次，缓存正文 DOM 持续重用，强制 GC 后 JS 堆增长约 0.34 MiB。全页面节点数量包含动态日期／关联及 detached 节点，不用严格相等作为泄漏判据；这不是长期原生／GPU 内存的保证。
- `npm test`：29／29 通过。`npm run build:starfield`：160 文件，未改文章、星位或依赖。`git diff --check` 通过。

实际浏览器结果：[当前窗边](final-room.jpg)、[当前星空](final-sky.jpg)。

## 复测与素材维护

先启动本地预览（操作见仓库新版操作指南）。本轮浏览器脚本使用本机固定的 bundled Playwright、Chrome 和 Node 路径；换机器应修改路径，不能直接比较不同机器的绝对数值。

- 首屏／失败回退：`node .scratch/starry-blog/startup-check.mjs optimized`
- 冷缓存／慢网：`node .scratch/starry-blog/startup-performance.mjs optimized`
- 四状态：`PERF_SKIP_THROTTLE=1 node .scratch/starry-blog/performance-check-20261009.mjs optimized-runtime`
- 像素：`node .scratch/starry-blog/artwork-pixels-20261009.mjs`
- 功能：`node .scratch/starry-blog/performance-regression-20261009.mjs optimized`
- 内存：`node .scratch/starry-blog/performance-memory-20261009.mjs`

基线需先冻结相应版本的 `.preview/stargazer`；使用 [`performance-baseline-server-20261009.mjs`](../../performance-baseline-server-20261009.mjs) 和 `STARFIELD_TEST_ROOT` 指向冻结目录，测量脚本的 `STARFIELD_TEST_URL` 指向端口 4177。[Lighthouse 脚本](../../lighthouse-check-20261009.sh) 保留实际参数。

[`cache-artwork-20261009.mjs`](../../cache-artwork-20261009.mjs) 离线重建缓存：读取原步行动作 PNG，以及本目录保存的 [原云图算法](cloud-artwork-baseline.js)。更改云造型时需同时更新算法基线及三个缓存，并重跑像素比较。普通预览和部署直接发布已保存的四个缓存文件，不新增运行时或构建依赖。

限制：这是本机浏览器与触屏模拟，未验真机或线上 CDN。慢网下完整星空仍需约 19 秒，主要受保留的原房间图、天空图与界面图片体积限制。没有通过减小画面分辨率、减少帧数、改动素材或隐藏失败状态来缩短该时间。下一步线上测量应使用部署后的真实地址和服务器缓存／压缩策略；部署须按单独请求执行。
