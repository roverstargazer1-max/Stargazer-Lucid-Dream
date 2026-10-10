# 旧 Kira 博客的预览与恢复

更新日期：2026-10-10。新旧博客共享一份 `source/`，默认统一构建是新版 `/`、旧版 `/legacy/`。旧主题与配置仍在仓库中，文章无需复制或回退。

## 日常新旧对照

使用 `.nvmrc` 中的 Node.js `22.19.0`、npm `10.9.3` 和根目录 `package-lock.json`：

```bash
npm ci
npm start
```

同时打开 [新版](http://127.0.0.1:4175/)和 [旧版](http://127.0.0.1:4175/legacy/)。两边文章／归档均可切换到对应内容。写作仍只改 `source/_posts/`，修改后执行 `npm run preview:starfield` 并刷新；统一入口自动准备星位和生成两个主题。

单独预览原来根路径下的旧主题：

```bash
npm run preview:legacy
npm run serve:legacy
```

打开 [4176 旧版独立预览](http://127.0.0.1:4176/)。需要监听文件修改的旧 Hexo 开发服务，使用 `npm run server:legacy`，地址为 [4000](http://localhost:4000/)；可加 `-- --port 4001`。`npm run server` 现在启动统一的双主题静态预览。

## 让旧版重新成为默认主页

在 `_config.yml` 中修改：

```yaml
blog:
  default_theme: legacy
```

然后运行 `npm run preview:starfield` 或 `npm run build`。Kira 将位于 `/`，新版位于 `/starfield/`，一份文章仍同时渲染，切换入口继续保留。改回 `starfield` 恢复新版根主页。普通根配置中的 `theme` 沿用新版，双主题构建以 `blog.default_theme` 选择根入口。

如果需要只生成旧主题作为应急恢复：

```bash
npm run build:legacy
```

输出为 `public/`，Kira 占根路径。此命令没有备用主题切换入口；不会删除主题代码、正文、自动元信息或稳定星位。线上回滚可先通过 Netlify 的 Deploys 重新发布此前成功的部署；后续构建选择与平台操作见 [发布指南](starfield-blog.md#github--netlify)。

## 运行环境与保存的基线

根目录活动 npm 锁文件锁定 Hexo `8.1.2` 和 moment-timezone `0.6.2`。旧 pnpm v9 锁文件在 `.scratch/starry-blog/baselines/pnpm-lock.yaml`，只用于历史对照，不参与当前安装。

- [2026-09-30 工作区清单](../../.scratch/starry-blog/baseline-worktree-manifest-20260930.json)及[当时状态](../../.scratch/starry-blog/baseline-worktree-status-20260930.txt)。
- [旧版配置基线](../../.scratch/starry-blog/baselines/legacy-2026-09-30/manifest.json)：配置、锁文件、Netlify、Node 及忽略规则。
- [旧版重建证据](../../.scratch/starry-blog/evidence/02-legacy-build.md)：当时的安装、构建与浏览器验证。

## 完整重建历史配置

只有需要重现 2026-09-30 环境时才使用配置基线。请在独立的完整仓库副本中恢复，先保留当前工作；历史 `package.json` 不含现在的星空脚本，历史 Netlify 配置也不含最新部署预览与缓存设置。

下面是 **PowerShell** 示例；macOS/Linux 可用文件复制工具将相同文件复制到独立副本对应位置：

```powershell
$legacyBaseline = '.scratch/starry-blog/baselines/legacy-2026-09-30'
Copy-Item "$legacyBaseline/_config.yml" '_config.yml' -Force
Copy-Item "$legacyBaseline/_config.hexo-theme-kira.yml" '_config.hexo-theme-kira.yml' -Force
Copy-Item "$legacyBaseline/package.json" 'package.json' -Force
Copy-Item "$legacyBaseline/package-lock.json" 'package-lock.json' -Force
Copy-Item "$legacyBaseline/netlify.toml" 'netlify.toml' -Force
Copy-Item "$legacyBaseline/.nvmrc" '.nvmrc' -Force
npm ci
npm run netlify
npm run server -- --static --port 4000
```

配置基线本身不是完整网站备份；正文、媒体和定制主题来自仓库，需要精确历史代码时以清单对应的 Git 提交为准。历史验证曾在隔离副本切换到 Landscape 后恢复 Kira，生成 103 个文件，旧文章 `/2025/10/20/梦开始的地方[置顶]/` 返回 HTTP 200 并可阅读。该数字描述当时构建，不是当前输出数量要求。

## Netlify 配置与验证边界

当前 `netlify.toml` 固定 Node `22.19.0`、npm `10.9.3`。正式与 Deploy Preview 均使用 `npm run netlify`，发布 `public/`，包含两个主题。备用主题目录、脚本、样式和星图要求重新验证缓存；原图片等共享资源的缓存策略沿用。

只在平台界面改构建命令会被 TOML 中的同名设置覆盖。要持续以旧主题作根主页，优先提交 `blog.default_theme: legacy`；只输出旧主题时才将 TOML 命令改为 `npm run build:legacy`，并处理 Deploy Preview 覆盖。

作者已确认平台生产分支为 `master`；Linux 云构建和此次线上部署仍需发布时验收。这里的恢复步骤不会自行部署。依据：[Netlify 文件配置](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。
