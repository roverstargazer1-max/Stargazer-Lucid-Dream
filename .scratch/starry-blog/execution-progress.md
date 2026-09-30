# 星空博客主题化实施进度

目标：按正式工单 02–17 顺序实施，逐票验证、关闭并独立提交；最终完成个人 Netlify 上线/恢复和独立通用模板发布。

## 当前状态

- 当前工单：07「文章导航」，继续按正式工单顺序实施。
- 已完成工单：02、03、04、05、06；五票均已关闭并分别独立提交，commit 映射以 `git log` 为准。
- 已完成：goal active；初始分支/HEAD/origin/工作区状态和 218 个已有变更文件的 SHA-256 已保存；继续当前 `codex/prototype-starfield` 分支，不切换个人仓库远程。
- 已完成：活动构建固定为 npm `package-lock.json`、npm `10.9.3`、Node `22.19.0`。pnpm v9 锁按 SHA-256 原样归档，移出站点根目录以匹配 Netlify 默认 npm 选择。
- 已完成：干净 npm install、旧版 103 文件构建、静态文章/页面/图片 HTTP 200、浏览器真实旧 Kira 文章、隔离副本切换主题后恢复 Kira、V20 原型独立运行与资源检查。地址/编码/锚点/媒体、平台事实、恢复方法见 `.scratch/starry-blog/evidence/02-legacy-build.md` 和 JSON。
- 已完成：正式主题在 `.preview/stargazer/` 独立生成；首篇真实文章 `dream-begins` 具有保存星位和原路径，共享元数据正确。桌面浏览器通过窗边/穹顶、两阶段选星、正文/返回、直达/刷新、拖动/滚轮；脚本禁用、主脚本 404、初始化异常和模拟 renderer 不可用均保留静态正文。详见 `.scratch/starry-blog/evidence/03-first-real-article.md`。
- 已完成：正式主题导入实际发布的 10 篇文章，稳定 ID、原地址、生成/手填摘要及版本 2 布局由 `npm run prepare:starfield` 一并保存；重复运行不改文件。改标题/日期/文件名、删除恢复、同时间排序、重复数据报错、缺失托管布局提示，以及空站/孤立/720 点拥挤构建均完成边界验收。浏览器逐星确认全部文章入口可达，全部 10 条静态文章路由与索引及布局匹配，正文与 03 基线一致。详见 `.scratch/starry-blog/evidence/04-stable-article-publication.md`。
- 已完成：05 逐篇核对全部 10 篇内容、封面与元信息，兼容相对图、原始 HTML/内联 CSS、链接/中文标题锚点及真实的文章播放器；播放器脚本故障和主脚本静态回退均未阻断正文。Kira 默认构建、旧关于/归档歌单保留。第三方音频流在本机因无可播放源未验证成功。详见 `.scratch/starry-blog/evidence/05-real-content-media-compatibility.md`，提交 `8d0a4d6`。
- 已完成：06 为作者配置采用关系与候选区分，构建器只发布有效 adopted 关系、对失效引用给出文件/条目警告；真实文章两端可互达，近邻实线和语义虚线分开显示，长文末尾和短文完全可见时按正文进度揭示理由，无理由关系不产占位，孤立文章照常阅读。未替作者留存任何临时关系；最终索引 `relations=[]`，10 篇坐标匹配已保存布局。短文首次显露使用忽略目录里的临时视口样式 fixture，详情见 `.scratch/starry-blog/evidence/06-bidirectional-relations.md`。本票已独立提交。
- 仍未验证：真实 Netlify UI 中的生产分支、覆盖设置、Build Image、部署历史；02 未部署，留给 15 实测。
- 下一步：进入 07「文章导航」，读取完整验收项并按顺序继续。
- 阻塞：无。
