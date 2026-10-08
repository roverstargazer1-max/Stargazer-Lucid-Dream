# 旧 Kira 博客的预览与恢复

更新日期：2026-10-08。旧博客的文章、图片、本地定制主题与配置都保留在仓库中，新版星空主题读取同一份源内容。切回 Kira 通常只需恢复构建选择，无须覆盖文章或删除新版代码。

## 运行环境与保存的基线

使用 `.nvmrc` 中的 Node.js `22.19.0`、npm `10.9.3` 和根目录 `package-lock.json`，安装命令为 `npm ci`。当前 npm 锁文件为 v3，锁定 Hexo `8.1.2` 和 moment-timezone `0.6.2`。

旧 pnpm v9 锁文件保存在 `.scratch/starry-blog/baselines/pnpm-lock.yaml`，当时解析为 Hexo `8.0.0` 和 moment-timezone `0.6.0`。它用于历史恢复对照，不参与当前安装；将它放回站点根目录会影响部署平台的包管理器选择。

恢复资料：

- [2026-09-30 工作区清单](../../.scratch/starry-blog/baseline-worktree-manifest-20260930.json)及[当时状态](../../.scratch/starry-blog/baseline-worktree-status-20260930.txt)：记录已有文件和校验值。
- [旧版配置基线](../../.scratch/starry-blog/baselines/legacy-2026-09-30/manifest.json)：保存站点配置、Kira 配置、package.json、npm 锁文件、Netlify 配置、Node 版本与忽略规则。
- [旧版重建证据](../../.scratch/starry-blog/evidence/02-legacy-build.md)：记录当时的干净安装、构建、路由及浏览器验证。

## 日常预览旧博客

在仓库根目录安装依赖后启动 Hexo 开发服务：

```bash
npm ci
npm run server
```

打开 [http://localhost:4000/](http://localhost:4000/)。默认 `_config.yml` 选择 `hexo-theme-kira`，`_config.hexo-theme-kira.yml` 提供本地主题配置。该开发服务监听文件变化；可用 `npm run server -- --port 4001` 改端口。

需要与新版同时对照时，使用旧版隔离的静态预览：

```bash
npm run preview:legacy
npm run serve:legacy
```

打开 [http://127.0.0.1:4176/](http://127.0.0.1:4176/)。产物为 `.preview/legacy/`；服务不监听源文件，修改后重新执行 `preview:legacy` 并刷新。

## 新旧预览目录与生产目录

| 用途 | 启动方式 | 目录 / 地址 |
| --- | --- | --- |
| 真实文章新版 | `npm run start:starfield` | `.preview/stargazer/`，4175 |
| 旧 Kira 静态预览 | `npm run preview:legacy` 后 `npm run serve:legacy` | `.preview/legacy/`，4176 |
| V20 模拟文章原型 | `npm run prototype:stars` | 原型源目录，[4173 原型](http://127.0.0.1:4173/pages/starfield-prototype/?variant=C&scene=painted&v=20&controls=quiet&motion=full&living=1) |
| V19 冻结对照 | `node .scratch/starry-blog/baseline-server.mjs` | 冻结副本，[4174 对照](http://127.0.0.1:4174/pages/starfield-prototype/?variant=C&scene=painted&controls=quiet&motion=soft&living=0) |
| 旧版生产构建 | `npm run netlify` | `public/` |
| 新版生产构建 | `npm run build:starfield` | `public/` |

两个静态预览服务可同时打开；准备和 Hexo 生成流程共享 `db.json`，依次执行。新旧生产构建共用 `public/`，后一次构建替换前一次产物。原型在 Kira 的 `prototypes/` 中，不属于主题发布资源，启动器拒绝 `NODE_ENV=production`。

## 切回旧主题

当前默认构建已是旧 Kira。未来上线新版后，切回时：

1. 保留文章、布局与新版主题，确认 `_config.yml` 的 `theme` 为 `hexo-theme-kira`。
2. 将 Netlify 的生产构建恢复为 `npm run netlify`，发布目录保持 `public/`。若设置了 `[context.production]` 覆盖，也同步恢复；Deploy Preview 可继续使用新版。
3. 本地运行以下命令，检查旧站产物，再按实际发布安排部署并验证旧文章直达地址。

```bash
npm run netlify
npm run server -- --static --port 4000
```

新版准备流程保存的 `starry_*` 字段和 `permalink` 与 Kira 兼容；恢复外观不需要回退正文或删除稳定星位。实际发布与回滚以 Netlify 项目的绑定及部署记录为准，见 [发布指南](starfield-blog.md#github--netlify)。

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

当前 `netlify.toml` 固定 Node `22.19.0`、npm `10.9.3`，默认命令为 `npm run netlify`，Deploy Preview 命令为 `npm run build:starfield`，发布目录均为 `public/`。`/image/*`、`/lib/*`、`/deps/*` 保留一周缓存；`/css/*`、`/js/*`、`/starry/*` 要求重新验证缓存，避免新旧模块混用。

实际生产分支、项目绑定、构建镜像、远程预览、部署历史和线上深链接没有本仓库内的完整验收记录。此次文档说明不替代平台验证；恢复步骤本身也不会执行线上发布。

官方参考：[Hexo 环境要求](https://hexo.io/docs/)、[Hexo 静态预览](https://hexo.io/docs/server)、[npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)、[Netlify 构建配置](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。
