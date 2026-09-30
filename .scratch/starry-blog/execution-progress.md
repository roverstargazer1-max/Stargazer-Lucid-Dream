# 星空博客主题化实施进度

目标：按正式工单 02–17 顺序实施，逐票验证、关闭并独立提交；最终完成个人 Netlify 上线/恢复和独立通用模板发布。

## 当前状态

- 当前工单：05「现有正文、图片与音乐完整阅读」，开始前先读取其全部验收项和上下游约束。
- 已完成工单：02、03、04；三票均已关闭并分别独立提交，commit 映射以 `git log` 为准。
- 已完成：goal active；初始分支/HEAD/origin/工作区状态和 218 个已有变更文件的 SHA-256 已保存；继续当前 `codex/prototype-starfield` 分支，不切换个人仓库远程。
- 已完成：活动构建固定为 npm `package-lock.json`、npm `10.9.3`、Node `22.19.0`。pnpm v9 锁按 SHA-256 原样归档，移出站点根目录以匹配 Netlify 默认 npm 选择。
- 已完成：干净 npm install、旧版 103 文件构建、静态文章/页面/图片 HTTP 200、浏览器真实旧 Kira 文章、隔离副本切换主题后恢复 Kira、V20 原型独立运行与资源检查。地址/编码/锚点/媒体、平台事实、恢复方法见 `.scratch/starry-blog/evidence/02-legacy-build.md` 和 JSON。
- 已完成：正式主题在 `.preview/stargazer/` 独立生成；首篇真实文章 `dream-begins` 具有保存星位和原路径，共享元数据正确。桌面浏览器通过窗边/穹顶、两阶段选星、正文/返回、直达/刷新、拖动/滚轮；脚本禁用、主脚本 404、初始化异常和模拟 renderer 不可用均保留静态正文。详见 `.scratch/starry-blog/evidence/03-first-real-article.md`。
- 已完成：正式主题导入实际发布的 10 篇文章，稳定 ID、原地址、生成/手填摘要及版本 2 布局由 `npm run prepare:starfield` 一并保存；重复运行不改文件。改标题/日期/文件名、删除恢复、同时间排序、重复数据报错、缺失托管布局提示，以及空站/孤立/720 点拥挤构建均完成边界验收。浏览器逐星确认全部文章入口可达，全部 10 条静态文章路由与索引及布局匹配，正文与 03 基线一致。详见 `.scratch/starry-blog/evidence/04-stable-article-publication.md`。
- 仍未验证：真实 Netlify UI 中的生产分支、覆盖设置、Build Image、部署历史；02 未部署，留给 15 实测。
- 下一步：进入 05「现有正文、图片与音乐完整阅读」，逐篇核对真实 Markdown、HTML、图片、锚点和播放器兼容。
- 阻塞：无。
