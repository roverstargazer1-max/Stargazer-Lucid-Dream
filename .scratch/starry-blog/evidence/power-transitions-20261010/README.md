# 省电模式下的穿窗与回屋优化（2026-10-10）

作者报告新版穿窗仍卡顿，省电模式下更明显。本轮对真实文章主题测试；基线包含本轮开始前已有的视角下边界更新。原素材、星位、镜头路径与时长沿用，默认仍为 `full`，没有发布。

## 复现与判断

本机 Apple M1／16 GB／7 核 GPU，电池与接电配置的 `lowpowermode` 都为 1。Chromium 149.0.7827.55，实际可见窗口，DPR 2；桌面 1680×970，手机触屏模拟 390×844。Node 25.7.0，Playwright 使用本机 Codex 的依赖路径。

已有专项反馈循环直接覆盖进入与返回，性能断言要求帧间隔 P95 ≤25ms、最大间隔 ≤80ms、超过 50ms 的间隔不多于两次。原版本在没有额外 CPU 限速时已失败：桌面 P95 约 34ms，而主线程占用约 9–10%。12 倍限速的放大复现出现 117.4ms 峰值、50ms P95；该压力配置不等同于真实省电模式。

按三个假设逐项对照：房间模糊与缩放合成、天空绘制／拷贝、镜头计算。跳过天空绘制或去掉房间模糊均明显改善；仅移除云遮光层、降低环境分辨率、少一次画布拷贝或拆分模糊图层不足以稳定通过。世界纹理预计算也未解决主要瓶颈，已撤回。结果支持绘制／合成压力，不能据此给出 GPU 核心利用率或时钟的精确结论。

原预算只采样同步 JavaScript 耗时，会漏掉这种主线程很闲、呈现仍掉帧的情况。途中取消模糊或重建绘制缓冲又可能产生新的停顿，因此最终采用进入动画前关闭模糊，并复用背景缓冲、推迟主画布重建。

## 最终实现

- `scene.motion: full` 沿用；`scene.passage_blur: false` 默认移除房间上的 0–1px 额外模糊，旋转、缩放、透明度及五个关键帧沿用。设为 `true` 可恢复原模糊路径，持续掉帧时仍会先关闭它。
- 预算增加动画帧间隔采样，按静止画面观测浏览器的刷新节奏，避免把稳定的 30Hz 或 120Hz 节奏误判。连续运动窗口里反复丢帧才降低背景档位；孤立停顿、隐藏页面和静止画面不触发降级。背景降级仍不改变文章身份、点击坐标或阅读内容。
- 背景按分辨率与图层保留缓存，WebGL 在当前视口保留最大绘制缓冲，仅调整实际绘制区域。初始化预热较小背景缓冲，恢复原画质后才显示实时天空；调整窗口时清理旧视口缓存。
- 主画布降分辨率等镜头停稳后再处理，并在绘制前清理／重绘，避免过场途中重新分配大画布或呈现一帧空天空。

额外缓存的裸 RGBA 尺寸约为桌面 20.4MB、手机模拟 4.1MB；这是尺寸估算，未测量浏览器实际显存与内存。预热增加少量初始化绘制，不增加图片下载或构建依赖。

## 三轮同机对照

基线冻结在本机临时目录，由 `serve-snapshot.mjs` 在 4187 提供；优化版在 4175。相同的无缓存静态服务、新浏览器与新上下文，未额外限制 CPU。基线及优化各三轮，桌面和手机模拟串行运行，表中是每轮首次进入／返回 P95 的中位数。原始数据本地归档，汇总为 [paired-summary.json](paired-summary.json)。

| 场景 | 之前 P95 | 之后 P95 | 优化后最大间隔 |
| --- | ---: | ---: | ---: |
| 桌面进入 | 33.4ms | 17.7ms | 66.7ms |
| 桌面返回 | 34.5ms | 17.7ms | 17.8ms |
| 手机模拟进入 | 18.6ms | 17.6ms | 17.7ms |
| 手机模拟返回 | 18.7ms | 17.7ms | 17.8ms |

最终 12 段过场均通过专项断言，无页面错误。桌面两轮因真实呈现压力进入 `balanced`、一轮保持 `full`；手机模拟三轮都保持 `full`。因此桌面结果包含自适应背景精度的贡献，不能说所有样本都保留全档精度。

**仍有冷页面首次进入的单次 50–67ms 峰值与 53–68ms 长任务。持续掉帧已经明显减少，首次峰值没有完全消除。** RAF 间隔也不是屏幕像素呈现时间；没有测实体手机、Safari、线上环境或关闭省电模式的对照。本次结果不能保证所有设备零掉帧。

## 验证与重跑

- `npm test`：42 项通过，含真实文章、双主题输出、视角边界及预算回归。
- [buffer-check.mjs](buffer-check.mjs)：全／中／低／恢复全档、两种窗口比例、两个仰角、天空与云遮光两层，32 组与原渲染器逐像素完全一致，见 [buffer-summary.json](buffer-summary.json)。
- [regression.mjs](regression.mjs) 注入确定的持续帧压力，覆盖两轮进入／返回、途中调整窗口、轻过渡、原关键帧与时长、完成后状态和图层清理；采样主画布检查空帧，并检查首次进入／返回中主画布尺寸调整只发生在镜头停稳后。
- 上述浏览器回归 12 段交互全部通过，空天空帧为 0，见 [regression-summary.json](regression-summary.json)。
- 额外四倍 CPU 限速、桌面／手机模拟各两轮进出，8 段过场全部通过断言；P95 为 18.4–18.6ms，最大间隔 50.6ms，无页面错误，见 [pressure-summary.json](pressure-summary.json)。
- 最终源码的 `npm test` 42/42 通过；统一 `npm run build` 成功输出新版根路径及 `/legacy/`，生产 HTML 保持完整镜头、默认关闭过场模糊。仅本地构建，无远程发布。

在已有新版预览上复测：

```sh
PERF_ASSERT=1 PERF_HEADED=1 PERF_CPU=1 PERF_CYCLES=2 node .scratch/starry-blog/evidence/power-transitions-20261010/check.mjs verify
PERF_ASSERT=1 PERF_HEADED=1 PERF_CPU=4 PERF_CYCLES=2 node .scratch/starry-blog/evidence/power-transitions-20261010/check.mjs verify-pressure
node .scratch/starry-blog/evidence/power-transitions-20261010/regression.mjs
```

逐像素对照需要先提供优化前冻结预览，可用 `BASELINE_URL` 指定；本轮本机快照目录是 `/tmp/stargazer-power-baseline-NeF5Nu`：

```sh
node .scratch/starry-blog/evidence/power-transitions-20261010/serve-snapshot.mjs /tmp/stargazer-power-baseline-NeF5Nu 4187
node .scratch/starry-blog/evidence/power-transitions-20261010/buffer-check.mjs
```

正式源码没有诊断探针。详细逐次 JSON 与图片遵循[产物保存约定](../README.md)，只保留本地；测试代码、结论与摘要随仓库保存。
