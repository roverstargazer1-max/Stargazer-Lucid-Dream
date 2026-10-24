# Stargazer's LucidDream

基于 **Hexo 8.1.2** 的个人静态博客。文章只维护 `source/_posts/` 中的一份 Markdown，统一构建将它同时渲染为新版星空博客和旧 Kira 博客；简短日常记录单独收在 `source/_journal/` 的窗边手记中。

更新日期：2026-10-11。当前分支 `codex/starfield-personal` 的默认首页为新版星空，旧版位于 `/legacy/`。两边都有切换入口，文章和归档切换后仍停留在对应内容。作者已于 2026-10-10 确认 Netlify 生产分支为 `master`；当前更新已完成本地验证，未执行远程发布，线上状态仍需部署后核验。

## 启动和写文章

使用 `.nvmrc` 中的 Node.js **22.19.0** 和 npm **10.9.3**：

```bash
npm ci
npm start
```

打开 [新版主页](http://127.0.0.1:4175/)或 [旧版博客](http://127.0.0.1:4175/legacy/)。`npm run start:starfield`、`npm run server` 也启动同一份双主题预览。

新建并写文章：

```bash
npx hexo new post "文章标题"
```

命令使用 [文章模板](scaffolds/post.md)，在 `source/_posts/` 创建带中文字段说明与填写示例的 Markdown。标题、日期自动填写；副标题、封面默认留空，标签、分类和文章关联默认空列表，星空默认普通星并参与探索。封面图片与关联对象由作者选择；保留默认值也能直接写正文。封面用于旧版列表/文章页及新版分享图片元信息，新版正文底图沿用统一素材。完整字段规则见 [写作指南](docs/operations/starfield-blog.md#首次运行与日常写作)。

写完执行 `npm run preview:starfield`，统一流程自动保存文章身份、原链接、摘要与星位，并生成两个主题。摘要默认从正文提取；要手写，填写 `starry_excerpt` 并将 `starry_excerpt_generated` 改为 `false`。静态服务不监听文件变化；已有服务时重新生成并刷新即可，停止服务按 `Ctrl+C`。本地生成与正式网站发布是两个步骤。

自动保存的文章 Front-matter 和 `source/_data/starry-layout.json` 随正文一并提交，已有文章地址和星位因此保持稳定。即使 Netlify 收到的新增文章只有普通字段，构建也能自动补全；相同源文件与已保存布局会得到相同结果。后续重命名新文章之前，先提交一次本地构建保存的元信息。草稿正常排除，发布仍使用 `npx hexo publish "草稿文件名"`。

## 写手记或日记

```bash
npm run diary
# 也可以新建时就写入正文
npm run diary -- --content "今天想留下的几句话。"
# 和新建文章一样的写法
npx hexo new journal "散步之后"
```

自动创建日期与字段注释齐全的 Markdown，打开输出的文件即可写作；可选 `--draft` 留作草稿，`--date "2026-09-22"` 补写某一天。手记独立收纳，不生成文章星。写完照常执行 `npm run preview:starfield` 并刷新博客。详见[手记写作说明](docs/operations/starfield-blog.md#窗边手记)。

## 生成与发布

```bash
npm run build
# Netlify 使用同一流程
npm run netlify
```

默认输出结构如下，文章日期目录随内容变化：

```text
public/
├── index.html             # 新版主页
├── YYYY/MM/DD/...         # 原文章日期地址：新版正文
├── archives/...           # 文章归档
├── tags/...               # 标签清单
├── pages/...              # 关于、友链等独立页面
├── starry/index.json       # 真实文章星图
└── legacy/
    ├── index.html         # 旧 Kira 主页
    └── YYYY/MM/DD/...     # 同一篇文章的旧版呈现；归档等也有对应目录
```

`netlify.toml` 为生产与 Deploy Preview 配置同一命令 `npm run netlify`，发布目录为 `public`；文件设置优先于平台界面中的同名设置。作者已确认 Netlify 生产分支为 `master`，上线时沿用此绑定：先将本分支提交为指向 `master` 的 PR，验证 Deploy Preview，再合并发布。完整设置与核验步骤见 [Netlify 操作说明](docs/operations/starfield-blog.md#github--netlify)。

访客用“旧版 / 新版”及其小三角入口切换外观。作者若希望旧版重新成为根主页，只改 `_config.yml`：

```yaml
blog:
  default_theme: legacy
```

重新构建后，Kira 在 `/`，新版在 `/starfield/`，双向切换继续可用。默认值 `starfield` 恢复当前布局。紧急只输出旧主题可用 `npm run build:legacy`，不会删除文章或主题代码。

## 其他入口

| 用途 | 命令 | 地址 / 输出 |
| --- | --- | --- |
| 双主题预览并启动 | `npm start` | 4175；`.preview/stargazer/` |
| 修改后重新生成双主题 | `npm run preview:starfield` | 同上 |
| 仅提供已有预览 | `npm run serve:starfield` | 4175 |
| 双主题生产构建 | `npm run build` / `npm run build:starfield` | `public/` |
| 单独旧版静态预览 | `npm run preview:legacy` 后 `npm run serve:legacy` | 4176；`.preview/legacy/` |
| 旧版监听文件的开发服务 | `npm run server:legacy` | 4000 |
| 单独旧版生产构建 | `npm run build:legacy` | `public/` |
| 自动验证 | `npm test` | 包括普通新文章在双主题中的完整构建 |
| V20 模拟文章原型 | `npm run prototype:stars` | 4173，独立设计实验 |

准备和生成共用 Hexo 数据库，按顺序运行；两个静态服务可同时使用。统一构建在临时目录生成完整双主题结果，最终安装失败会恢复旧输出；本地预览服务以流式方式发送文件，HEAD 只返回元信息。端口 4175 被占用时使用已有服务，或设置 `STARFIELD_PREVIEW_PORT`。V20 原型含模拟文章和实验工具，不能用于判断最新版真实博客效果。

## 当前界面与验证

正式主题使用窗边/穹顶场景、日期观测面板和蓝色星月文章长页；阅读开合沿用「视线聚焦」，正文底部的人物随滚动行走，停下后保留同一姿势。手机竖屏的「关联 / 时间」位于左下，返回与回到窗边位于右上。

2026-10-11 已完成保持 UI 和动效的工程优化：复用投影与云几何、减少无效 DOM/链接更新、重用文章播放器，并修复历史换篇后旧音乐继续播放的问题。68 项自动检查、双主题构建及背景/云像素对照通过；浏览器结果覆盖桌面和触屏模拟。量化结果、复测脚本和实体设备/线上验证边界见 [工程与性能记录](.scratch/starry-blog/evidence/engineering-20261011/README.md)。

## 目录与文档

- `scaffolds/post.md`、`scripts/post-scaffold.js`：新文章默认字段与创建后保留的中文注释。
- `components/journal/`、`scripts/journal.js`、`scaffolds/journal.md`：手记内容读写模块、新建命令和写作模板。
- `prepare-starfield.cjs`、`build-blog.cjs`：自动文章元信息与双主题构建入口。
- `tools/install-build-output.cjs`、`tools/preview-http.mjs`：输出安装/回滚与本地流式文件服务。
- `scripts/blog.js`、`scripts/kira-tags.js`、`blog-assets/`：共享内容兼容、原标签语法及版本切换。
- `source/`：两个主题共享的文章、页面、文章图片与保存的星位。
- `themes/stargazer-starfield/`、`themes/hexo-theme-kira/`：两个主题；Kira 中的 `prototypes/starfield/` 为独立 V20 原型。
- [写作、预览与 Netlify 发布](docs/operations/starfield-blog.md)。
- [旧 Kira 预览和恢复](docs/operations/legacy-blog-recovery.md)。
- [新主题说明](themes/stargazer-starfield/README.md)、[设计主文档](docs/design/starry-blog.md)及[实施记录](.scratch/starry-blog/implementation-progress.md)。
- [星空开发资料索引](.scratch/starry-blog/README.md)：当前计划、有效验证及恢复资料；早期原型、历史工单和美术试验集中在 [历史归档](.scratch/starry-blog/archive/README.md)。
- [开发记录资料集](docs/development/starfield-history/README.md)：从既有 Kira、星空原型到当前个人主题的客观时间线、26 幅配图、版本／提交索引和资料缺口，供回顾与写作查阅。

根目录使用 `package-lock.json`；旧 pnpm 锁文件只作归档。`.preview/`、`public/` 和完整浏览器测试产物不提交，脚本和简明验证记录仍随仓库保存。2026-09-30 公开模板规格及带日期的旧工单保留历史范围，当前个人站点以 2026-10-01 计划和后续明确更新为准。
