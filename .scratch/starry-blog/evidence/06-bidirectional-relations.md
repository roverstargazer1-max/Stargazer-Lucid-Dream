# 06 双向文章关联验收记录

日期：2026-10-01。基于工单 05 提交 `8d0a4d6`，在 `codex/prototype-starfield` 完成；未推送或部署。

## 配置与生成

使用 4 条临时验收关系覆盖真实文章 ID：`dream-begins` ↔ `article-06f39f48-b200-4aae-b9ec-5a80fc197746`（《梦开始的地方[置顶]》↔《随笔1》，带验收理由）；`article-c60fddd9-e731-45b7-8165-4b2ea0a8cfac` ↔ `article-cf4327c8-d0cb-4333-8a05-a30ac01d134b`（《随笔2》↔《慢》，无理由）；一个引用 `missing-article-id` 的失效条目；以及与第一条重复、但只放在 `candidates` 的未确认候选。

Hexo 生成访客索引时只序列化 2 条有效 adopted 关系。两端以同一稳定文章 ID 集合表示，浏览器在内存中展开为双向导航；候选不进入 `starry/index.json`，失效项被跳过，构建日志定位到 `source/_data/starry-relations.yml adopted[2]` 并报告缺少的 ID。该轮生成仍含全部 10 篇文章。已保存的 10 篇星位与 `source/_data/starry-layout.json` 一致。

验收 fixture 和理由只用于本地浏览器演示，没有代表作者替任何两篇文章作正式采用决定。演示结束后将 `source/_data/starry-relations.yml` 恢复为 `adopted: []`、`candidates: []`，重新生成预览，最终访客索引含 10 篇文章、0 条关系，不含 fixture 理由或测试 CSS。

## 浏览器演示

环境：Codex In-app Browser，`http://127.0.0.1:4175/` 本地隔离预览。

- 在《梦开始的地方[置顶]》预览中，读者看到关系图例“细实线：邻近探索 · 虚线：作者确认关联”和“随笔1”按钮。点击后聚焦《随笔1》；其预览反向显示《梦开始的地方[置顶]》。分别从两端的读后链接打开对方真实文章路由，确认两边导航成立。
- 长文直接打开时，理由区隐藏但正文和预览关系导航可用。滚动到文章末尾后显示“已到文末 · 关联理由已显露”，理由以纯文本呈现，并给出到《随笔1》的真实本地 permalink 链接。
- 短文《随笔1》在当前浏览器默认可视区（631px 浏览器视口、463px 阅读区）仍溢出，初始状态为 86%，所以默认尺寸下不能用于验证“全文已可见”。为实际触发这条逻辑，在**忽略的生成目录** `.preview/stargazer/css/starry/site.css` 临时压缩阅读页留白；正文和应用源码不变。此时文章完整落入视口，首次加载即显示 100%、理由和反向链接，无需滚动、计时或先读另一端。随后通过 `npm run preview:starfield` 清理并重建该目录，临时样式不在最终产物中。
- 对无理由关系《随笔2》↔《慢》，读到《随笔2》末尾后只显示“已到文末”；关系理由区保持隐藏且为空，没有“为什么相连”占位内容。
- 直接打开无关系文章《活在真实天空下，做半个君子》，DOM 含 4484 个正文字符，文章可读；关系区隐藏、无空理由占位。
- 星座与位置：`prepare-starfield.cjs` 的已有星位只由已保存记录/稳定 ID 分配，关系 generator 只读取布局并生成索引；`starry_constellation` 仅作为可选文章元数据复制到索引，没有被位置生成或场景分组使用。没有新增在线 AI 依赖或主题分组规则。

## 复核

- `npm run preview:starfield` 成功，生成 77 个文件；最终生成索引验证 `articles=10`、`relations=0`。
- `node --check themes/stargazer-starfield/scripts/article-index.js` 和 `node --check themes/stargazer-starfield/lib/relations.js` 通过。
- `git diff --check` 通过。浏览器关系流程检查未发现新增控制台错误。
- 未部署；未把临时 fixture、理由或生成 CSS 纳入源码提交。
