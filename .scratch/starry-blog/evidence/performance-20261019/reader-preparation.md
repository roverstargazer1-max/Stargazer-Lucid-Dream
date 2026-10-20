# 首次阅读前准备原始底图

冻结基线为 `c4b80be`。完整流程 `baseline-b` 首次打开正文时，桌面出现 158ms 长任务和 166.6ms 最大 RAF 间隔，手机模拟出现 140ms 长任务和 150.3ms 最大间隔。专项 trace 中，WebP 解码约 190ms，主线程对应等待图层提交约 189ms；提前解码原底图的单变量试验不再出现该长任务。

现在在选星接近、打开检索、直接访问文章或集合时，用低优先级请求准备同一份原始底图和原字体。首页不增加正文图片请求；保留三个 Image 对象并合并进行中的准备，重新阅读时重新检查解码状态。直接访问文章时，静态正文先保持可读，动态阅读窗口等底图准备完成再显现。下载或解码失败会被吸收，正文仍可读。

回归包括并发准备、图片对象复用、再次检查及失败容错的单元测试，以及真正浏览器中的桌面、手机模拟、文章直达、底图失败四种情况。浏览器记录 showModal 前的三个解码结果。冻结基线的同一检查按预期失败，优化版通过；直达 URL 强制使用本地源，未把线上站点当成本地证据。

```sh
STARFIELD_TEST_URL=http://127.0.0.1:4191/ node .scratch/starry-blog/evidence/performance-20261019/reader-readiness.mjs baseline
# 上一条应在“显现前已解码”断言失败。
node .scratch/starry-blog/evidence/performance-20261019/reader-readiness.mjs optimized
```

结果见 [基线](reader-readiness-baseline-summary.json)和[优化版](reader-readiness-optimized-summary.json)。采样条件及完整流程最终复测见[审查记录](README.md)。提前解码减少集中在首次阅读显现的主线程阻塞；GPU 合成仍可能有独立峰值，不据此承诺所有硬件上零掉帧。
