# 02 旧版博客基线验收

日期：2026-09-30。完整地址与文件哈希见 [构建证据 JSON](02-legacy-build.json)。

## 保留的基线

- 开始实施前的分支为 `codex/prototype-starfield`，HEAD 为 `d6d6a1c2c04593cc07bba69e7ad66e0308d8018c`，origin 仍为个人博客远程。初始工作区状态保存在 [status](../baseline-worktree-status-20260930.txt)；[文件清单](../baseline-worktree-manifest-20260930.json)为 218 个已有变更/未跟踪文件记录了路径、字节数和 SHA-256，包括原型代码、插画、设计资料和正式工单。原型历史快照和素材未清理。
- 旧 Kira/Hexo 配置、`package.json`、npm 锁、Netlify 配置、Node 固定版本和 `.gitignore` 的字节级副本在 [legacy-2026-09-30](../baselines/legacy-2026-09-30/manifest.json)，由清单列出 SHA-256。
- 旧版主题代码、站点/主题配置、文章、页面、图片、音乐插件和 npm 依赖留在原位置。`_config.yml` 仍选择 Kira，未改线上主题。
- 旧的 pnpm lock 原样保存为 [基线归档](../baselines/pnpm-lock.yaml)，SHA-256：`BE2C7DAE8A7963173DFD29DFBB33BE194F7F373F8BC60D2E39DD91036E6BCF2B`。根 `package-lock.json` 为 lockfile v3，Hexo `8.1.2`；pnpm v9 lock 解析为 Hexo `8.0.0`。两个文件中其余 15 个直接依赖版本相同，`moment-timezone` 分别为 `0.6.2` / `0.6.0`。

## 干净构建与地址

在 Windows 本机的独立临时副本中从空 `node_modules` 和空 `public/` 开始；副本没有根 `pnpm-lock.yaml`：

```text
Node v22.19.0
npm 10.9.3
npm ci --no-audit --no-fund        -> 成功，519 packages added
npm run netlify                    -> 成功，103 files generated
npm run server -- --static --port 4002 -> 只服务刚生成的 public/
```

生成页面清单共 31 条站点路由：首页、10 篇真实文章、3 个既有页面、8 个归档路由和 9 个标签路由。全部路径及标题已保存在 JSON。旧文章地址保留年/月/日和文章 slug，例如：

- `/2025/10/20/梦开始的地方[置顶]/`
- `/2026/05/15/随笔2/`
- `/pages/archive/`、`/pages/mine/`、`/pages/friends/`
- `/archives/`、已有月份归档和 `/tags/.../`

干净静态服务请求首页文章、关于、归档、友链及正文图片均返回 HTTP 200。浏览器直接打开编码后的《梦开始的地方[置顶]》地址，页面标题、UTF-8 中文正文和 Kira 页面组件均可见；`pages/mine/` 也可直达。生成 HTML 声明 `UTF-8`。代表性正文标题 `引言` 使用旧 Kira heading id `%E5%BC%95%E8%A8%80`；其余锚点和原文标题已收录在 JSON。

恢复演示仅在临时副本中将 `_config.yml` 的主题改成 Landscape 并构建，再从已保存副本恢复 `_config.yml`、`_config.hexo-theme-kira.yml`，运行 `npm run netlify` 得到 103 个文件。浏览器随后直达旧文章，HTTP 200、旧标题和真实正文均在。没有改动当前正式工作区主题或 `public/`。

实际媒体来源盘点：`/2026/05/15/随笔2/` 正文图片源为 `../image/小记2/01.webp`，生成后对应 `/image/小记2/01.webp`，HTTP 200、102,268 字节。关于页歌单为 NetEase playlist `14457276201`，归档页歌曲为 NetEase song `2088204761`。置顶文章 front-matter 的 `subheading` 含 playlist `14457276201`，但当前 Kira 生成的文章 HTML 未输出该播放器；同一 playlist 在关于页存在。此差异留给工单 05 核查，不把它记为播放器已在文章页通过。

## 原型与输出隔离

- 原型启动：`node themes/hexo-theme-kira/prototypes/starfield/server.mjs`，本地地址 `http://127.0.0.1:4173/pages/starfield-prototype/`。HTTP 检查 33 个当前原型资源均成功；浏览器看到窗边入口并进入 V20 星海画面。
- 旧版生成物在临时副本的 `public/`，通过 4002 静态服务器访问。当前仓库的用户 `public/` 未触碰。
- 正式主题工作位置为 `themes/stargazer-starfield/`；正式预览输出预留在 Git 忽略的 `.preview/`。新的正式预览未开始；不可复用或覆盖旧版 `public/`。

## Netlify 可见事实与未验证项

仓库 `netlify.toml` 的 build command 为 `npm run netlify`，publish 为 `public`，没有写 base；缓存头适用于 `/image/*`、`/lib/*`、`/deps/*`、`/css/*`、`/js/*`。根目录现在只有 `package-lock.json` 和 `.nvmrc`，Netlify 官方说明无 pnpm/yarn/bun lock 时默认使用 npm，并支持 `.nvmrc` 选择 Node。

此环境没有 Netlify CLI，也没有 `.netlify/state.json`。因此实际生产分支、UI 中是否覆盖 build/install command、Node 版本或 build image、部署上下文、历史生产部署均尚未核对；工单 02 未做部署。工单 15 必须读取实际 Netlify 项目并实测。

Context7 MCP 工具不在本会话可调用工具中；按仓库要求已查阅官方一手文档：Hexo 8 [Node 版本要求](https://hexo.io/docs/)、[静态服务模式](https://hexo.io/docs/server)、npm [`ci`](https://docs.npmjs.com/cli/v10/commands/npm-ci)、Netlify [依赖管理与包管理器选择](https://docs.netlify.com/build/configure-builds/manage-dependencies/)及[构建配置](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。
