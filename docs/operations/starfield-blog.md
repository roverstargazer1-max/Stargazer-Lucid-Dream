# 星空博客的写作、预览与发布

更新日期：2026-10-09。本文适用于 `codex/starfield-personal` 分支中的个人主题 `themes/stargazer-starfield/`。

新版已接入真实文章，沿用 V20 窗边与穹顶场景、视线聚焦与轻雾显字。文章页采用 2026-10-09 作者提供的蓝色星月素材，顶部几何装饰承载标题，底部小人随正文阅读进度移动；观测面板以 2026-10-07、2026-10-08 更新为准。旧 Kira 主题、配置和源内容继续保留，仓库默认生产构建仍选择 Kira。实际线上切换尚无本仓库内的部署验收证据。

V20 模拟文章原型另在 `themes/hexo-theme-kira/prototypes/starfield/`，使用 4173 端口；本指南运行的是真实文章新版，使用 4175 端口。三种入口的关系和启动方式见 [项目 README](../../README.md)。

## 首次运行

使用 `.nvmrc` 中的 Node.js `22.19.0` 和 npm `10.9.3`，在仓库根目录执行：

```bash
npm ci
npm run start:starfield
```

打开 [http://127.0.0.1:4175/](http://127.0.0.1:4175/)。根目录只有 `package-lock.json` 作为活动锁文件；历史 pnpm 锁文件归档，不参与当前安装。

## 日常写作

继续在 `source/_posts/` 写 Markdown，填写原有 title、date、tags、cover 等字段；可用 `npx hexo new post "文章标题"` 新建文章。全部已发布文章都会成为星星，不需要填写编号。草稿仍放在 `source/_drafts/`，正常星空生成不包含草稿；用 `npx hexo publish "草稿文件名"` 发布后再预览。写完执行：

```bash
npm run start:starfield
```

它先自动准备身份、原链接、描述和新星位置，再生成新版预览并启动服务。服务不会自动打开浏览器，也不监听文件修改。如果服务已经运行，在另一个终端执行以下命令，然后刷新浏览器；主题或配置修改也用同一流程：

```bash
npm run preview:starfield
```

终端按 `Ctrl+C` 停止服务。`serve:starfield` 只提供已有静态文件，不会生成；首次运行或清理产物后应先预览生成。

自动生成的 `starry_id`、`starry_original_permalink`、`permalink`、`starry_excerpt_generated` 不要手动改。改文章标题不会改身份、旧链接或星位。`starry_excerpt` 继续用于文章描述元信息；点星后用观测面板显示发布年份、月日和 READ 入口，不展示长摘要。标题默认隐藏，鼠标靠近文章星时才在星旁显示；键盘聚焦或触屏点选也可显露对应标题。未读为白色，当次访问读到文末后为灰色；关联理由和跳转保留在正文中。若想自写描述，填写 `starry_excerpt`，并删除 `starry_excerpt_generated` 或设为 false。没写时会从正文自动提取。

准备结果保存在文章 Front-matter 和 `source/_data/starry-layout.json`，应与正文、图片一起提交。新文章只寻找空位，已经保存的关联模式位置不会重排。删除文章后的坐标保留，恢复同一篇文章时仍能找回原位置。时间模式根据真实日期排列。

## 可选文章配置

关联引用**文件名，不含 .md**；每对文章只配一次，双方都会出现入口。下面仅说明格式，请替换为自己的真实文件名，不要照抄示例目标：

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 可选的关联理由
star:
  rank: ordinary
  isolated: false
```

`rank` 可选 ordinary（普通，默认）、important（重要）、treasured（珍藏）。`isolated: true` 不自动生成空间探索路径或时间连线，文章仍可发现、阅读；作者显式写的关联照常保留。

标题可以改；文件名改了则同步改其他文章中的 related 引用。文件名应唯一。自关联、找不到目标或无效理由会在生成时提示源文件，合法文章仍能生成。不给理由也有文末文章入口；没有 related 的文章照常发布。标签或距离不会被当作内容关系。

## 预览与生产输出

| 用途 | 命令 | 输出 / 地址 |
| --- | --- | --- |
| 新版准备并生成 | `npm run preview:starfield` | `.preview/stargazer/` |
| 准备别名 | `npm run prepare:starfield` | 与 `preview:starfield` 相同，也生成预览 |
| 仅生成已准备内容 | `npm run generate:starfield` | `.preview/stargazer/`，不自动分配身份／星位 |
| 新版服务 | `npm run serve:starfield` | `http://127.0.0.1:4175/` |
| 新版一次预览并服务 | `npm run start:starfield` | 同上 |
| 旧版生成 | `npm run preview:legacy` | `.preview/legacy/` |
| 旧版服务 | `npm run serve:legacy` | `http://127.0.0.1:4176/` |
| 新版生产构建 | `npm run build:starfield` | `public/`，读取已提交布局，不自动改文章 |
| 当前默认生产构建 | `npm run netlify` | 旧 Kira，`public/` |
| 本地自动验证 | `npm test` | 准备、静态生成与行为检查 |

各预览目录分开；两个生产构建都会重建 `public/`，后执行的构建会替换前一个结果。Hexo 共享根目录 `db.json`，准备与生成命令按顺序运行。两个静态服务可同时运行，旧版服务直接读取旧版静态预览，不受随后新版生成影响。

默认预览服务仅监听 `127.0.0.1`。端口占用时先停止旧进程，或在当前终端设置 `STARFIELD_PREVIEW_PORT` 再启动服务；该变量同时适用于新版和旧版静态服务。`start:starfield` 包含两个脚本，不能用 `-- --port` 给其中的静态服务改端口；4000 的 Hexo 开发服务则使用 `npm run server -- --port 4001`。

原文章地址打开先显示正文；关闭正文后进入该文章的星空。旧 `/pages/archive/`、`/pages/friends/`、`/pages/mine/`、归档年月、标签和分类地址保留。友链继续读取 `_config.hexo-theme-kira.yml`，避免两份名单漂移。音乐继续用原歌单和资源；第三方音乐服务失败时不会挡住正文。

星空失败时显示静态正文或全部真实文章入口。文章内部 style 限制在文章作用域；当前内容使用的相对 image 路径在生成时承接到现有图片，Markdown 原文不改。旧浏览器不支持 CSS 作用域时可继续阅读正文，但自定义美术样式可能不显示。

## GitHub → Netlify

当前 `netlify.toml` 的默认构建命令为 `npm run netlify`，输出 `public/`，选择旧 Kira；`[context.deploy-preview]` 覆盖为 `npm run build:starfield`，使用相同发布目录。Deploy Preview 配置只声明预览构建方式，不代表已创建或验证远程预览。构建上下文规则见 [Netlify 配置文档](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。

正式发布新版的流程：

1. 本地执行 `npm run preview:starfield`，确认真实文章、图片、正文直达和准备数据。
2. 将文章 Front-matter 与 `source/_data/starry-layout.json` 的变更一并提交，再执行 `npm run build:starfield` 检查生产产物。
3. 在实际 Netlify 项目核对生产分支、base directory、Node/npm 环境、构建命令、`public/` 发布目录及 Deploy Preview 是否启用。
4. 先验证远程预览，再按明确的发布安排将生产构建改为 `npm run build:starfield`，向平台绑定的分支推送并检查部署结果。保留可重新发布的旧部署或旧构建配置。

生产切换独立于本地预览；运行 `start:starfield` 或 `build:starfield` 不会发布线上。

固定 Node 22.19.0、npm 10.9.3，保留根目录 package-lock.json；安装用 npm ci。新版不需要运行本地原型服务器或后端。JS、CSS、文章索引要求缓存重新验证，避免更新后混用旧模块；已有图片继续按原缓存策略使用。

推送前必须先本地预览并提交准备结果。托管端缺少新文章身份/星位时会明确报错，请回到本地预览并提交，不能让托管构建自行分配不持久的位置。

本地静态生产构建已有成功记录。实际 Netlify 绑定分支、项目设置、Linux 云构建和深链接 HTTP 响应尚无远程验收记录，不能从配置推断线上已切换。发布时检查中文文章直达、刷新、图片与音乐。每个旧文章地址有对应静态 HTML，保持直接访问，不将所有旧链接统一重定向到首页。

## 切回旧版

现在默认构建本就使用 Kira。未来切换后，恢复生产构建为 `npm run netlify`，并确保 `_config.yml` 的 `theme` 仍为 `hexo-theme-kira`；如果新增了 `[context.production]` 覆盖，也需同步恢复它。文章的自动元信息不会妨碍 Kira 读取原正文。

本地执行 `npm run preview:legacy` 和 `npm run serve:legacy` 可随时核对旧版。需要完整恢复历史配置/锁文件时，按照 [旧版恢复说明](legacy-blog-recovery.md) 从保存的基线恢复；不要删除新版主题或原文章来切换外观。

实现验收和设备／媒体限制见 [实施记录](../../.scratch/starry-blog/implementation-progress.md)，当前文章页素材、进度和截图见 [2026-10-09 记录](../../.scratch/starry-blog/evidence/article-page-20261009/README.md)。

## 首屏与性能检查（2026-10-09）

复测脚本、Markdown 结论和 `*-summary.json` 摘要提交到仓库；完整报告、截图、录像及逐次测量数据保留本地并由 `.gitignore` 忽略。历史记录中详细产物的相对链接指向本地归档，取得和提交范围见[测试产物保存约定](../../.scratch/starry-blog/evidence/README.md)。

首页加载时先显示原房间插图，窗口按钮在星空准备完成后启用；不会先闪出文章清单。关闭 JavaScript、主模块请求失败或渲染不可用时，文章清单恢复供访问。深链接仍有静态正文回退。

互动云缓存和无损步行动作图集已随主题保存，预览、生产构建无须安装图像处理工具。更换步行动作 PNG 时需重新生成 WebP 并核对浏览器绘制像素；更新云的种子或造型算法时需同步重建三张 PNG 缓存与命中透明度。生成、回归、冷缓存测量与当前限制见 [性能复测记录](../../.scratch/starry-blog/evidence/performance-20261009/README.md)。
