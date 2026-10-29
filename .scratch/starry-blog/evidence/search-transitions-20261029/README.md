# 星图首次开合卡顿核查与优化

日期：2026-10-29。基线为 `dev` 的 `4e7338f`。已完成本地实现、浏览器回归、实际 CDN 资源对照与双主题构建。本记录中的线上资源对照是在浏览器内替换脚本和样式的测试，不代表生产部署。

## 复现与定位

真实域名 `https://blog.stargazer-luciddream.top/` 的 HTML 引用脚本、样式版本与修改前本地构建一致。响应经过 Cloudflare／Netlify。Chrome 156.0.8078.48，全新浏览器上下文，桌面 1440×900、手机模拟 390×844、DPR 2，CPU 4×、9Mbps／100ms。按真实入口穿窗后，连续两次打开、关闭星图。

直接线上复现的首次展开／收起最大 RAF 间隔分别为桌面 133／200ms、手机 67／117ms；第二次开合明显减轻。复现命令返回失败，能捕捉超过 100ms 的停顿：

```sh
STARFIELD_TEST_URL=https://blog.stargazer-luciddream.top/ node .scratch/starry-blog/evidence/search-transitions-20261029/measure.mjs deployed-baseline
```

核查的三个方向为资源冷启动、布局／样式计算、恢复星空绘制。追踪确认首次开图会临时请求约 31 个标题字体块；隐藏的 INDEX 不会自行提前加载标题字体。初始化还集中执行列表准备、原生弹窗布局与地图布局。动画的继承变量持续影响面板子树，且逐帧修改 `::backdrop` 样式规则导致额外样式重算。收起期间未观察到相应的脚本长任务，未修改背景渲染预算。

## 改动

- 在已有的穿窗准备与星盘指向／聚焦时，准备真实标题需要的原字体字形与初始列表。首页初始房间不增加这些请求；只加载标题所需字符范围，失败可重新准备。
- 原生弹窗、列表与地图准备分帧执行；准备期间内容不可交互，镜头光圈保持关闭。可选资源仍最多等待 1.5 秒，失效资源继续后台完成。
- 开合进度与阶段变量注册为不继承，只更新实际运动图层；伪元素显式取得所属图层进度。相同进度不重复写入样式。
- 背景暗化与 1.2px 模糊交由浏览器按既有曲线、时长插值；样式规则只在开始、改向和结束时更新。JS 保留当前进度用于途中收起。
- 结果顺序未变时复用已有节点；尺寸读取先于光圈参数写入。每次打开保存版本，取消、阅读和新一轮打开均使旧准备回调失效。

原画、标题字体、筛选规则、星位、星等、完整开合与自动 INDEX 展开的时序沿用。

## 优化前后对照

两边都访问真实线上 HTML、图片和字体，仅在测试浏览器中分别覆盖冻结基线／本地候选的 JS、CSS。两边采用相同拦截方式，均无 HTTP 缓存；字体与图片仍可在单页内复用。串行测量，没有构建、图片处理或其他浏览器测试同时运行。

| 首次操作 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 桌面展开最大帧间隔 | 100ms | 66.5ms |
| 手机展开最大帧间隔 | 50ms | 33.3ms |
| 桌面收起最大帧间隔 | 33.4ms | 16.7ms |
| 手机收起最大帧间隔 | 33.3ms | 16.8ms |
| 桌面展开样式计算累计 | 619ms | 341ms |
| 手机展开样式计算累计 | 565ms | 312ms |
| 桌面收起样式计算累计 | 277ms | 145ms |
| 手机收起样式计算累计 | 339ms | 170ms |
| 桌面首次开图新增请求 | 33 | 2 |
| 手机首次开图新增请求 | 34 | 3 |

完整 8 段候选样本均低于 100ms 帧间隔阈值，无脚本错误。标题字体的约 31 个请求已移到明确探索意图后；表内手机仍有一个其他文字的字体块请求。样式计算累计减少约 45%–50%。保留 920ms／480ms 开合时长与装饰准备上限；总打开等待时间受真实资源返回影响，本轮未证明总时长缩短。

CPU 4× 下候选仍出现 76ms、66ms 长任务，未声称所有设备恒定 60fps。直接线上复现与受控覆盖对照分开记录，不能把它们拼成一次前后测量。探索阶段中途候选的失败与波动保留在本地原始数据，未计入最终收益。

摘要见 [comparison-summary.json](comparison-summary.json)。逐次原始 JSON、追踪及截图仅保留本地。

## 回归

- `npm test`：131 项通过；`npm run build`：两个主题均成功；预览与正式输出的脚本、样式逐字节一致；`git diff --check` 通过。本机 Node 25.7.0／npm 11.10.1，Netlify 配置的 Node 22.19.0／npm 10.9.3 未由本地结果代替验证。
- 桌面、手机、320px 窄屏、844×390 横屏、轻过渡、系统减少动态效果，共六组检索、筛选、禁用星点、编号查询、清除、阅读返回、手动折叠、快速退出与再次打开均通过，无脚本错误。系统减少动态效果沿用原 CSS 行为，背景模糊仍为既有 1.2px；轻过渡为 0px。
- 字体请求挂起 10 秒的独立场景：星图在等待上限后可用；中途退出、重开后旧回调不会重新启动动画或夺取焦点。见 [verification-summary.json](verification-summary.json)。
- 桌面、手机、横屏分别比较 25%、60%、100% 展开进度，共九对画面。运动图层的变换、透明度、光圈与星点点亮进度在 0.0001 精度内一致；最大平均通道差为 0.000004，来自注册数值的浮点舍入。见 [visual-summary.json](visual-summary.json)、[pixel-summary.json](pixel-summary.json)。
- 所有临时性能探针只在测试脚本中；发布脚本没有调试日志或第三方遥测。

## 重跑

先保存修改前构建到 `.preview/search-baseline/`，当前版本执行 `npm run preview:starfield`。沿用已有的压缩测试服务：

```sh
node .scratch/starry-blog/evidence/performance-20261024/serve-production.mjs 4187 .preview/stargazer 4188 .preview/search-baseline
node .scratch/starry-blog/evidence/search-transitions-20261029/measure.mjs local-after
node .scratch/starry-blog/evidence/search-transitions-20261029/verify.mjs
node .scratch/starry-blog/evidence/search-transitions-20261029/visual-check.mjs
python3 .scratch/starry-blog/evidence/search-transitions-20261029/pixels.py
```

线上资源对照按下列命令串行执行，测试覆盖仅限当前浏览器，不写入线上服务：

```sh
STARFIELD_TEST_URL=https://blog.stargazer-luciddream.top/ PERF_ASSET_ROOT=.preview/search-baseline node .scratch/starry-blog/evidence/search-transitions-20261029/measure.mjs cdn-before
STARFIELD_TEST_URL=https://blog.stargazer-luciddream.top/ PERF_ASSET_ROOT=.preview/stargazer node .scratch/starry-blog/evidence/search-transitions-20261029/measure.mjs cdn-after
```

`PLAYWRIGHT_MODULE` 可指定本机依赖路径；默认使用本次 Codex 依赖。`PERF_CPU`、`PERF_DEVICES`、`PERF_NETWORK=off` 控制测量条件；`PERF_TRACE=1` 保存追踪。`PERF_PROBE` 为冻结基线专用的排查探针，不用于最终收益计时。真机与实际发布后效果需分别核对。
