# 08 星历盘与旧标签、分类、分页入口验收

日期：2026-10-01

环境：Windows 11，本机 Node `22.19.0`、npm `10.9.3`、Hexo `8.1.2` / hexo-cli `4.3.2`。正式预览命令为 `npm run preview:starfield`，输出位于 Git 忽略目录 `.preview/stargazer/`。

## 构建路由与内容范围

- `npm run preview:starfield` 成功，生成 77 个文件。旧版构建基线 `.scratch/starry-blog/evidence/02-legacy-build.json` 有 31 条站点路由；逐条检查本次生成目录后，31 条都存在。
- 基线中可逐项检查的集合路由共 18 条：8 条归档（根路由、年度及月份）、9 条标签和旧自定义归档页 `/pages/archive/`。18 条都生成 `static-collection-fallback`，清单中的文章 ID 均存在于真实星空索引，链接路径均对应同一篇文章；错误 ID、错链和缺失路由为 0。
- 这 18 条旧路由实际没有分类路由，也没有分页路由。因此没有把未存在的路径算作旧站兼容成功；分页和分类用下文的临时构建 fixture 验证。
- 真实索引有 10 篇文章，星历盘只发布有内容的 5 个月：`2025-10`（3 篇）、`2025-11`（2 篇）、`2026-05`（2 篇）、`2026-06`（1 篇）、`2026-07`（2 篇）。每月入口保存按稳定时间顺序排列的第一篇真实文章 ID。

## 浏览器流程

使用 Codex In-app Browser 打开 `http://127.0.0.1:4175/`：

- 首页无常驻归档、标签或分类文字菜单；星历按钮处在现有窗边场景中。打开后只列出上面 5 个真实月份及各自文章数。
- 选择 `2026 年 5 月` 后穿过窗户进入时间模式，并聚焦 2026-05-14 的真实文章《慢》；界面说明按发表时间排列不代表作者关联。
- 直接打开 `/archives/2025/10/` 显示三篇真实文章。打开《咏史有感》后，浏览器后退恢复原清单地址、内容和焦点；前进恢复同篇文章地址和正文。
- 直接打开旧中文标签 `/tags/Essay-%E9%9A%8F%E7%AC%94/` 显示该标签对应的真实文章，刷新后仍是相同标签清单。直接打开 `/pages/archive/` 显示 10 篇真实文章的旧归档内容。

## 分页、分类与子路径 fixture

为覆盖旧构建实际没有的生成路径，临时构建 overlay 使用站点根路径 `/blog/`、归档每页 2 篇、标签每页 2 篇、分类每页 1 篇；仅在构建期间给两篇文章增加临时 `Route Fixture` 分类。脚本在 `finally` 中恢复文章原始字节，正式源文章未留下 fixture 修改。

- 临时构建生成 93 个文件，产生多页归档、标签和 `Route-Fixture` 分类路由；检查了分页清单范围、页码及带 `/blog/` 前缀的文章链接。
- 浏览器直接打开 `/blog/categories/Route-Fixture/page/2/`，看到第 2 页实际包含《慢》；打开文章后地址为 `/blog/2026/05/14/%E6%85%A2/`，正文与标题对应。浏览器后退恢复该分类第 2 页。中文标签和文章 slug 都经过真实 Hexo 构建编码验证。
- 这些 fixture 仅验证分类、分页及子路径处理逻辑，不表示旧版基线曾有分类或分页内容。fixture 配置和临时分类已恢复，没有改动正式内容。

## 实现与检查

- 普通 Hexo 集合页保留 `page.posts` 实际内容范围和分页状态；旧 `/pages/archive/` 路由保留原地址并改为展示全部真实文章。
- 集合清单和正文入口使用真实文章地址/ID；增强后文章在星空阅读层打开，浏览器历史可恢复对应集合。直接集合路径刷新仍根据当前生成路由呈现原集合。
- 集合滚动位于独立的 `#collection-scroll`，自身使用 `overflow: auto` 与 `overscroll-behavior: contain`；它不复用星空 canvas/world 的滚动容器。首页的月份入口使用原场景舞台上的无文字热区。
- `node --check` 对 `app.js`、`painted.js`、`article-index.js` 均成功；`git diff --check` 成功。
- 对 Hexo 文档的查阅：本次上下文没有可调用的 Context7 MCP，因此使用官方 [Generator API](https://hexo.io/api/generator)、[Helpers](https://hexo.io/docs/helpers)、[Configuration](https://hexo.io/docs/configuration)、[Generating](https://hexo.io/docs/generating) 文档，并检查本地 `hexo-generator-archive`、`hexo-generator-tag`、`hexo-generator-category` 和 `hexo-pagination` 实现。文档用于确认 generator 的 locals/route 数据、辅助函数生成根路径 URL 和当前分页字段；路由范围以本地生成结果为准。

## 未验证边界

- 分类和分页不是旧构建里的实际路由；其行为由上述明确标记的临时 fixture 验证。当前正式内容没有分类，也没有实际分页页数。
- 本次不验证真实手机/触屏手势。用户要求暂时跳过此项，工单 07 的真实触屏验收继续未通过并保持 open；窄屏模拟也不当作真机验证。
