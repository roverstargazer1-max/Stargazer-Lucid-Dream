# 02：旧版博客可重建与隔离预览

Status: ready-for-agent
State: closed
Category: enhancement

2026-09-30 用户要求按全部任务顺序自主实施并逐票提交，本票据此正式发布。

**What to build:** 作者能够从保存的源代码、配置和依赖重建旧版博客，并继续独立运行原型预览，为正式星空接入提供可恢复的基线。

**Blocked by:** None (can start immediately)。

**依赖理由：** 这是迁移前的准备任务；现有两份锁文件不一致，旧插件可能全局影响渲染，先验证恢复能力再接入新主题。

## Acceptance criteria

- [x] 保存可识别的现有工作与旧版基线，包含未提交原型改动、个人素材、旧主题定制、配置与依赖；原内容不删除，已有原型工单不改动。
- [x] 在干净环境验证旧版生成和本地访问，记录实际原文章与页面地址、编码、锚点和实际媒体来源；不得用计划替代构建结果。
- [x] 基于现有 npm 发布流程明确一套可重建的锁文件和 Node 环境，记录与另一份锁文件的差异；旧版所需依赖继续可用。
- [x] 旧版本地输出与原型预览、后续新主题预览可以区分，不互相覆盖验收证据或修改当前线上主题。
- [x] 演示按保存的旧配置恢复旧布局及至少一篇真实文章，并留下可执行的恢复说明；生产环境恢复在 15 验证。
- [x] 记录实际可读取的 Netlify 配置及尚待核对项，不把仓库配置当作平台实际设置，也不提前部署新主题。

## 演示与测试

- 完成演示：从保存基线重建旧版并访问一篇原文，同时能独立打开现有原型。
- 验证边界：干净构建与旧地址访问、内容/媒体清单、一次本地恢复；不测试内部文件组织。
- 验收记录应说明实际操作、环境、结果及证据；未验证设备或平台能力不标记通过。

## Source

- [主题化规格](../spec.md)：用户故事 4–5、66–68。
- 技术与范围以规格的 Implementation Decisions、Testing Decisions 和 Out of Scope 为准。
- 任务完成不自动表示其他工单、原型工单或整体规格已经完成。


## Comments

- 2026-09-30：按用户启动自主顺序实施的指令发布；当前尚未实施或验收。
- 2026-09-30：本票验收完成。初始分支/HEAD/origin 与工作区状态已记入 `baseline-worktree-status-20260930.txt`；清单记录开始实施前 218 个已有变更/未跟踪文件的路径和 SHA-256。旧 Kira 源码/素材、现有内容及配置未清理或改写；配置、package metadata/npm lock、Netlify 配置和运行时副本在 `baselines/legacy-2026-09-30/`。原 pnpm v9 lock 原样归档并验证 SHA-256 后移出站点根目录；根 `package-lock.json` v3 为唯一活动锁，选择 Node 22.19.0/npm 10.9.3。npm lock Hexo 8.1.2、moment-timezone 0.6.2；历史 pnpm lock Hexo 8.0.0、moment-timezone 0.6.0，其余 15 个直接依赖版本一致。
- 干净环境：无 `node_modules`、`public/`、根 pnpm lock 的临时副本中，`npm ci --no-audit --no-fund` 成功安装 519 个包；`npm run netlify` 成功生成 103 个文件。隔离副本把主题临时切到 Landscape 后，按保存的 Kira 配置复原并再次构建；旧文章 `/2025/10/20/梦开始的地方[置顶]/` 重新返回 HTTP 200，浏览器可见标题和真实中文正文。干净静态服务另验证 `/pages/mine/`、`/pages/archive/`、`/pages/friends/` 和正文图片均为 HTTP 200；UTF-8、31 个真实站点路由、heading ids、图片及 Meting 来源见 `evidence/02-legacy-build.json` 与 `evidence/02-legacy-build.md`。
- 预览隔离：V20 原型在 `127.0.0.1:4173` 浏览器打开窗边入口并进入星空；33 个原型 HTTP 资源均为 200。旧站构建只写到临时副本的 `public/`；当前工作区用户 `public/` 和线上主题均未触碰。正式主题目录为 `themes/stargazer-starfield/`，未来正式预览输出预留在忽略路径 `.preview/`。
- Netlify：可读 `netlify.toml` 的 command 为 `npm run netlify`、publish 为 `public`、未设置 base；缓存规则见恢复说明。官方文档确认根 pnpm lock 会触发 pnpm 安装，因此已归档并移出站点根；根 `.nvmrc` 固定 Node。Netlify CLI 不存在且无 `.netlify/state.json`，真实 UI 的分支、覆盖项、build image 和部署历史留给 15 实测，本票未部署。
- Context7 不在本会话可调用工具列表；已按仓库要求核对 Hexo、npm 与 Netlify 官方资料。详细执行环境、实际 route 清单、UTF-8/锚点和媒体差异见 `evidence/02-legacy-build.md` 及同名 JSON。置顶文章的 Meting `subheading` 在旧文章输出中未显示播放器，已记录为 05 的媒体兼容核验项。
