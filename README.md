# Stargazer's LucidDream

基于 **Hexo 8.1.2** 的个人静态博客。只维护 `source/_posts/` 中的一份 Markdown，统一构建将它同时渲染为新版星空博客和旧 Kira 博客。

更新日期：2026-10-10。当前分支 `codex/starfield-personal` 的默认首页为新版星空，旧版位于 `/legacy/`。两边都有切换入口，文章和归档切换后仍停留在对应内容。仓库配置已调整；运行本地命令不会更新 Netlify 线上站点，作者已确认 Netlify 生产分支为 `master`；本次改动尚未合并或发布。

## 启动和写文章

使用 `.nvmrc` 中的 Node.js **22.19.0** 和 npm **10.9.3**：

```bash
npm ci
npm start
```

打开 [新版主页](http://127.0.0.1:4175/)或 [旧版博客](http://127.0.0.1:4175/legacy/)。`npm run start:starfield`、`npm run server` 也启动同一份双主题预览。

继续用原来的方式新建并写文章：

```bash
npx hexo new post "文章标题"
```

在 `source/_posts/` 填写原来的 title、date、tags、cover 等字段与正文即可，无须填写星星身份或坐标。写完执行 `npm run preview:starfield`，统一流程自动准备元信息、保存星位并生成两个主题。静态服务不监听文件变化；已有服务时重新生成并刷新即可，停止服务按 `Ctrl+C`。

自动保存的文章 Front-matter 和 `source/_data/starry-layout.json` 随正文一并提交，已有文章地址和星位因此保持稳定。即使 Netlify 收到的新增文章只有普通字段，构建也能自动补全；相同源文件与已保存布局会得到相同结果。后续重命名新文章之前，先提交一次本地构建保存的元信息。草稿正常排除，发布仍使用 `npx hexo publish "草稿文件名"`。

## 生成与发布

```bash
npm run build
# Netlify 使用同一流程
npm run netlify
```

输出结构：

```text
public/
├── index.html             # 新版主页
├── 2025/...               # 原文章地址：新版正文
├── pages/...              # 归档、关于和友链
├── starry/index.json       # 真实文章星图
└── legacy/
    ├── index.html         # 旧 Kira 主页
    └── 2025/...           # 同一篇文章的旧版呈现
```

生产与 Deploy Preview 都执行 `npm run netlify`，发布目录都是 `public`。代码中的 `netlify.toml` 设置优先于平台界面中的同名设置。作者已确认 Netlify 生产分支为 `master`，上线时沿用此绑定：先将本分支提交为指向 `master` 的 PR，验证 Deploy Preview，再合并发布。完整设置与核验步骤见 [Netlify 操作说明](docs/operations/starfield-blog.md#github--netlify)。

访客用“旧版博客 / 星空新版”切换外观。作者若希望旧版重新成为根主页，只改 `_config.yml`：

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

准备和生成共用 Hexo 数据库，按顺序运行；两个静态服务可同时使用。端口 4175 被占用时使用已有服务，或设置 `STARFIELD_PREVIEW_PORT`。V20 原型含模拟文章和实验工具，不能用于判断最新版真实博客效果。

## 目录与文档

- `build-blog.cjs`：准备与双主题构建的统一入口。
- `scripts/blog.js`、`blog-assets/`：共享内容兼容、切换链接及切换样式。
- `source/`：唯一文章、页面、图片与保存的星位来源。
- `themes/stargazer-starfield/`、`themes/hexo-theme-kira/`：两个主题；Kira 中的 `prototypes/starfield/` 为独立 V20 原型。
- [写作、预览与 Netlify 发布](docs/operations/starfield-blog.md)。
- [旧 Kira 预览和恢复](docs/operations/legacy-blog-recovery.md)。
- [新主题说明](themes/stargazer-starfield/README.md)、[设计主文档](docs/design/starry-blog.md)及[实施记录](.scratch/starry-blog/implementation-progress.md)。

根目录使用 `package-lock.json`；旧 pnpm 锁文件只作归档。`.preview/`、`public/` 和完整浏览器测试产物不提交，脚本和简明验证记录仍随仓库保存。2026-09-30 公开模板规格及带日期的旧工单保留历史范围，当前个人站点以 2026-10-01 计划和后续明确更新为准。
