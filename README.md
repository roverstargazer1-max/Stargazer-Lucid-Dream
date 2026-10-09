# Stargazer's LucidDream

基于 **Hexo 8.1.2** 的个人静态博客。同一份 Markdown 内容目前有旧 Kira 博客和新版星空主题两种呈现方式，另保留用于设计对照的 V20 星空原型。

截至 2026-10-08，新版已接入全部现有真实文章、稳定星位、文章关联、原文章地址和旧页面内容，并可在本地生成静态站点。默认构建仍使用旧 Kira；仓库中的 Netlify Deploy Preview 配置使用新版。实际线上主题、平台绑定和云端部署结果需在 Netlify 项目中核实，本地构建成功不代表已经上线。

新版代码和本文中的星空命令位于 `codex/starfield-personal` 分支；`master` 目前保留旧博客代码。只检出 `master` 时，不会有 `start:starfield` 等新版脚本。

## 先分清三个入口

| 入口 | 内容与用途 | 代码位置 | 本地地址 |
| --- | --- | --- | --- |
| 新版星空博客 | 真实文章；窗边入场、穹顶探索、观测面板与正文阅读 | `themes/stargazer-starfield/` | [4175](http://127.0.0.1:4175/) |
| 旧 Kira 博客 | 原有页面、主题定制和配置；用于写作预览、对照与切回 | `themes/hexo-theme-kira/` | [4000](http://localhost:4000/)；隔离静态预览为 [4176](http://127.0.0.1:4176/) |
| V20 设计原型 | 16 篇虚构文章、A/B/C 方案和调试工具；保留设计实验 | `themes/hexo-theme-kira/prototypes/starfield/` | [4173 原型](http://127.0.0.1:4173/pages/starfield-prototype/?variant=C&scene=painted&v=20&controls=quiet&motion=full&living=1) |

新版从 V20 原型发展而来，但已有独立主题与真实内容管线。后续的观测面板、冷色复古阅读窗口和宝蓝配色更新在新版主题中；原型用于历史对照，不能用它判断最新博客效果。原型的试加文章、布局导出和方案切换不会进入新版构建。

## 快速启动新版博客

在仓库根目录操作。使用 `.nvmrc` 指定的 **Node.js 22.19.0** 和 **npm 10.9.3**，安装锁定依赖后启动：

```bash
npm ci
npm run start:starfield
```

打开 [http://127.0.0.1:4175/](http://127.0.0.1:4175/)。点击窗户进入星空，点击文章星靠近，再点同一颗星或观测面板中的 READ 进入正文；X 或 Escape 关闭正文。

启动命令会自动准备文章身份、原链接、描述和星位，保存到 `source/_posts/` 的 Front-matter 与 `source/_data/starry-layout.json`，然后生成 `.preview/stargazer/` 并启动静态服务。准备结果应随文章一起提交。

服务运行期间，修改文章、配置或主题后，在另一个终端重新生成，再刷新浏览器：

```bash
npm run preview:starfield
```

新版静态服务没有文件监听或自动刷新。终端按 `Ctrl+C` 停止服务；已有服务运行时使用上面的生成命令，避免重复占用 4175 端口。

根目录以 `package-lock.json` 为活动锁文件，使用 npm；旧 pnpm 锁文件归档在 `.scratch/starry-blog/baselines/pnpm-lock.yaml`，不用于当前安装。Hexo 8 的最低 Node.js 要求为 20.19.0，项目固定版本与安装方式见 [Hexo 环境要求](https://hexo.io/docs/)和 [npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)。

## 启动旧博客和设计原型

旧 Kira 的开发预览会监听文件变化，默认端口为 4000：

```bash
npm run server
# 指定其他端口
npm run server -- --port 4001
```

需要同时对照新旧站点时，先生成旧版独立产物，再启动静态预览：

```bash
npm run preview:legacy
npm run serve:legacy
```

打开 [http://127.0.0.1:4176/](http://127.0.0.1:4176/)。修改后重新执行 `preview:legacy` 并刷新；生成目录为 `.preview/legacy/`。

V20 设计原型只需要 Node.js，无须安装 Hexo 依赖：

```bash
node themes/hexo-theme-kira/prototypes/starfield/server.mjs
# 或使用项目脚本
npm run prototype:stars
```

打开 [V20 原型入口](http://127.0.0.1:4173/pages/starfield-prototype/?variant=C&scene=painted&v=20&controls=quiet&motion=full&living=1)。该服务仅监听本机，并拒绝在 `NODE_ENV=production` 下运行。修改前的 V19 冻结对照另用 `node .scratch/starry-blog/baseline-server.mjs` 启动，地址为 [4174 冻结原型](http://127.0.0.1:4174/pages/starfield-prototype/?variant=C&scene=painted&v=19&controls=quiet&motion=soft&living=0)。`v` 参数仅作版本标记；切换 `v` 不会切换到历史代码。

## 命令速查

| 命令 | 作用 | 输出或端口 |
| --- | --- | --- |
| `npm run start:starfield` | 自动准备、生成并启动新版预览 | `.preview/stargazer/`，4175 |
| `npm run preview:starfield` | 自动准备并生成新版预览 | `.preview/stargazer/` |
| `npm run prepare:starfield` | `preview:starfield` 的别名，同样会生成预览 | `.preview/stargazer/` |
| `npm run generate:starfield` | 仅清理并生成已准备好的新版预览 | `.preview/stargazer/` |
| `npm run serve:starfield` | 仅提供已生成的新版静态文件 | 4175 |
| `npm run preview:legacy` | 清理并生成旧版隔离预览 | `.preview/legacy/` |
| `npm run serve:legacy` | 仅提供已生成的旧版静态文件 | 4176 |
| `npm run prototype:stars` | 启动 V20 模拟文章原型 | 4173 |
| `npm run server` | 旧 Kira 的 Hexo 开发预览 | 4000 |
| `npm run build` | 默认旧 Kira 构建 | `public/` |
| `npm run clean` | 清理默认 Hexo 缓存与产物 | `db.json`、`public/` |
| `npm run netlify` | 清理后构建旧 Kira | `public/` |
| `npm run build:starfield` | 新版生产构建，读取已保存数据 | `public/` |
| `npm test` | 准备并生成新版，运行现有行为与静态输出检查 | `.preview/stargazer/` |
| `npm run deploy` | Hexo 部署入口，需另行配置部署方式 | 当前 `deploy.type` 为空 |

新旧预览产物分开，但 Hexo 生成与准备流程共享根目录的 `db.json`，请按顺序运行。两个静态预览服务可以同时打开。新旧生产构建都使用 `public/`，后执行的构建会替换该目录内容。

## 写作与新旧内容的关系

继续在 `source/_posts/` 写 Markdown，在 `source/image/` 保存文章图片，在 `source/pages/` 维护已有页面。新旧主题读取同一份源内容，不需要另建一套文章库。

```bash
npx hexo new post "文章标题"
```

草稿可先在旧 Kira 开发服务中预览：

```bash
npx hexo new draft "草稿标题"
npx hexo server --draft
```

停止草稿预览后，按文件名发布：

```bash
npx hexo publish "草稿文件名"
```

安装依赖后，`npx hexo` 使用项目本地命令，无须全局安装 Hexo。草稿位于 `source/_drafts/`，正常星空生成只接入已发布文章。发布后运行 `npm run preview:starfield`，检查并提交文章和布局数据。完整命令见 [Hexo CLI 文档](https://hexo.io/docs/commands)。

文章关联可在 Front-matter 的 `related` 中引用另一篇文章的文件名（不含 `.md`），每对只写一次，自动双向，理由选填。未配置关联的文章仍会成为星星。可选星等、孤立状态和自动字段维护见 [新版写作指南](docs/operations/starfield-blog.md)。

新版保留既有文章地址；直达文章先显示对应正文，关闭后进入该文附近的星空。归档、标签、分类和 `/pages/archive/`、`/pages/friends/`、`/pages/mine/` 继续承接原内容；友链仍读取 Kira 配置，音乐仍使用已有资源。JavaScript 或场景初始化失败时有静态正文或文章列表回退。

## 构建与发布状态

`_config.yml` 默认选择 `hexo-theme-kira`。新版通过 `_config.stargazer-preview.yml` 或 `_config.stargazer.yml` 覆盖主题选择，无须修改旧版默认配置。

当前 `netlify.toml` 的设置：

| 部署上下文 | 构建命令 | 发布目录 |
| --- | --- | --- |
| 默认构建（含生产） | `npm run netlify`，旧 Kira | `public/` |
| Deploy Preview | `npm run build:starfield`，新版 | `public/` |

新版生产构建不会自动分配新文章身份与星位；缺少准备数据时会报错。发布前先本地预览，再提交 `source/_posts/` 与 `source/_data/starry-layout.json` 的准备结果。运行本地构建本身不会发布到 Netlify。

正式切换需要核实平台生产分支、构建设置和实际预览结果；切回旧版通常只需恢复旧构建命令。步骤见 [新版发布指南](docs/operations/starfield-blog.md#github--netlify)和 [旧版恢复说明](docs/operations/legacy-blog-recovery.md)。真实触屏、云端部署、线上深链接与第三方音频成功播放仍需单独验证。

## 目录与文档导航

```text
.
├── _config.yml                      # 共享站点配置，默认旧 Kira
├── _config.hexo-theme-kira.yml       # 旧主题设置与共享友链
├── _config.stargazer.yml            # 新版生产构建覆盖配置
├── _config.stargazer-preview.yml    # 新版隔离预览覆盖配置
├── _config.legacy-preview.yml       # 旧版隔离预览覆盖配置
├── prepare-starfield.cjs            # 保存真实文章身份、原地址和星位
├── source/
│   ├── _posts/                      # 共享的真实文章
│   ├── _data/starry-layout.json      # 已保存的稳定星位
│   ├── pages/                       # 既有归档、关于与友链页面
│   └── image/                       # 文章及场景素材
├── themes/
│   ├── hexo-theme-kira/             # 旧主题，prototypes/starfield/ 为 V20 原型
│   └── stargazer-starfield/          # 新版主题
├── assets/                          # 观测面板原始素材与裁片
├── docs/                            # 当前使用、恢复与设计说明
├── .scratch/starry-blog/            # 设计实验、历史规格和实施证据
├── .preview/                        # 本地预览产物，不提交
└── public/                          # 当前一次生产构建产物，不提交
```

测试代码、复测脚本和简明结论随仓库保存；截图、录像、完整性能报告及逐次测量数据只保留在本地，摘要 JSON 继续提交。范围和历史产物的取得方式见[测试产物保存约定](.scratch/starry-blog/evidence/README.md)。设计规格、工单及正式素材仍正常跟踪，不能忽略整个 `.scratch/`。

- [新版写作、预览与发布](docs/operations/starfield-blog.md)：日常操作和可选文章配置。
- [旧 Kira 恢复](docs/operations/legacy-blog-recovery.md)：新旧对照、切回和历史基线。
- [新版主题说明](themes/stargazer-starfield/README.md)：主题入口、配置与界面实现。
- [V20 原型说明](themes/hexo-theme-kira/prototypes/starfield/README.md)：模拟文章、设计对照和试验工具。
- [设计主文档](docs/design/starry-blog.md)：已确认决定与历史演变。
- [个人博客正式化计划](.scratch/starry-blog/theme-production-plan.md)及[实施记录](.scratch/starry-blog/implementation-progress.md)：当前实现范围和验证证据。

带日期的研究结论和旧工单保留当时状态，原始截图及完整报告按上述约定仅本地归档。2026-09-30 的[公开模板规格](.scratch/starry-blog/spec.md)属于历史范围，当前个人站点以 2026-10-01 正式化计划及后续明确的视觉更新为准。
