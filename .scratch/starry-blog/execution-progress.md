# 星空博客主题化实施进度

目标：按正式工单 02–17 顺序实施，逐票验证、关闭并独立提交；最终完成个人 Netlify 上线/恢复和独立通用模板发布。

## 当前状态

- 当前工单：02「旧版博客可重建与隔离预览」，全部验收项满足、`State: closed`，本票交付纳入当前独立 commit。
- 已完成工单：02；commit 映射以 `git log` 为准。
- 已完成：goal active；初始分支/HEAD/origin/工作区状态和 218 个已有变更文件的 SHA-256 已保存；继续当前 `codex/prototype-starfield` 分支，不切换个人仓库远程。
- 已完成：活动构建固定为 npm `package-lock.json`、npm `10.9.3`、Node `22.19.0`。pnpm v9 锁按 SHA-256 原样归档，移出站点根目录以匹配 Netlify 默认 npm 选择。
- 已完成：干净 npm install、旧版 103 文件构建、静态文章/页面/图片 HTTP 200、浏览器真实旧 Kira 文章、隔离副本切换主题后恢复 Kira、V20 原型独立运行与资源检查。地址/编码/锚点/媒体、平台事实、恢复方法见 `.scratch/starry-blog/evidence/02-legacy-build.md` 和 JSON。
- 仍未验证：真实 Netlify UI 中的生产分支、覆盖设置、Build Image、部署历史；02 未部署，留给 15 实测。
- 下一步：当前 commit 完成后，进入 03「一篇真实文章的星空阅读闭环」。
- 阻塞：无。
