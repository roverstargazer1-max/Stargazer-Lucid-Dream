# 双主题统一构建验收（2026-10-10）

当前分支：`codex/starfield-personal`。作者确认 Netlify 生产分支为 `master`；本轮只完成本地实现和部署配置，未发布。

## 验证

- Node 22.19.0、npm 10.9.3；`npm test` 35 项通过，`npm run netlify` 生成完整 `public/`。
- 新版根首页与 Kira `/legacy/` 同时输出。10 篇现有文章两边均可读，原 Markdown 与保存星位未改。
- 回归临时站点仅增加普通 Front-matter 文章，检查正文、相对图片、biliplayer／pen／krplayer／meting 旧标签，两边均可生成；草稿排除。
- 回归临时站点模拟只提交普通新文章的干净构建两次，身份、原地址、星位一致；已有保存布局不变。切换默认根主题为 legacy 后，旧版根路径与新版 `/starfield/` 正常生成。
- 新版文章与旧版文章 canonical 指向根路径下的同一内容；归档、标签、友链、图片及播放器脚本等本地资源检查通过。
- 浏览器实际点击：根主页→旧版→随笔2→新版同篇正文→关闭到星空→再次阅读。路由与切换目标随当前状态同步。
- 桌面 1440×900 与窄屏 390×844：阅读层切换链接可读，和关闭按钮并排，窄屏宽度为 120px，右边缘 383px（视口 390px），没有超出屏幕。检查的是浏览器窄屏，不替代真实触屏硬件验收。

## 本地图片

截图按仓库约定仅本地保存，不提交：`home.png`（新版默认主页）、`mobile-reader.png`（窄屏阅读层）。测试运行日志在被忽略的 `.preview/dual-theme-test.log`。

复测：安装依赖后执行 `npm test`、`npm run netlify`，再用 `npm start` 打开 4175 的根主页及 `/legacy/`。

## 远程边界

Netlify 的 TOML 已选择同一套双主题构建。平台已登录设置、Linux 云构建、新部署与正式域名深链接尚未验收，实际发布按 [操作指南](../../../../docs/operations/starfield-blog.md#github--netlify) 执行。第三方音频接口实际播放仍单独验证。
