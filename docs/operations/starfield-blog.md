# 星空博客的写作、预览与发布

更新日期：2026-10-10。当前分支 `codex/starfield-personal` 统一构建两个主题：新版在 `/`，旧 Kira 在 `/legacy/`。同一份 Markdown 同时渲染，文章原地址由新版承接；旧版对应地址加上 `/legacy/`。两边的切换入口保留当前文章、归档、标签或页面位置，新版正文阅读窗口内也有入口。

这些是仓库配置与本地输出关系，不代表线上已经切换。V20 模拟文章原型仍独立在 4173；真实博客预览使用 4175。

## 首次运行与日常写作

使用 Node.js `22.19.0`、npm `10.9.3` 和根目录 `package-lock.json`：

```bash
npm ci
npm start
```

打开 [新版主页](http://127.0.0.1:4175/)和 [旧版主页](http://127.0.0.1:4175/legacy/)。`npm run start:starfield`、`npm run server` 为同一入口。

按原来的主题方式写文章：

```bash
npx hexo new post "文章标题"
```

在 `source/_posts/` 中填写原有 title、date、tags、cover 等字段与 Markdown 正文。原有相对 `../image/` 图片写法继续兼容，两边的 HTML 都映射到各自发布的图片目录；原稿不改。原生 HTML、引用、列表仍走 Hexo 渲染；原 Kira 的 biliplayer、pen、krplayer、meting 标签由新版复用原实现，写法相同。

服务已运行时，修改文章、配置或主题后执行：

```bash
npm run preview:starfield
```

随后刷新浏览器。该命令自动完成准备、保存与两个主题的生成，无须先执行额外准备命令；服务没有文件监听。服务未运行则直接 `npm start`，停止按 `Ctrl+C`。

文章身份、原链接、描述与新星位自动保存到 Front-matter 和 `source/_data/starry-layout.json`，与文章一起提交即可。已有文章与星位不会因新增文章重排，自动字段不要手工修改。新文章只填原字段也能在 Netlify 构建：身份由文件路径确定，相同源内容与已有布局可复现。为了让后续更名也延续身份与链接，正常写作仍建议先本地预览，再提交准备结果；托管构建中生成的文件不会自动写回 GitHub。

草稿放在 `source/_drafts/`，正常构建不发布。用 `npx hexo publish "草稿文件名"` 发布后，两边下一次构建同时加入该文章。

## 可选文章配置

不填下面的字段也能发布。文章关系引用**文件名，不含 .md**，每对只写一次，自动双向；理由选填：

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 可选的关联理由
star:
  rank: ordinary
  isolated: false
```

`rank` 可选 ordinary、important、treasured；`isolated: true` 不生成空间探索路径或时间连线，作者明确的关联仍保留。无效关联会提示源文件，不阻止合法文章阅读。标题可改；改文件名时同步改其他文章的 related 引用。标签与距离不会自动成为内容关系。

`starry_excerpt` 用于描述元信息；不填时自动提取正文。要手写描述，填写它并删除 `starry_excerpt_generated` 或设为 false。点星后仍显示既有日期观测面板，不展示长摘要。其余星空交互和文章视觉沿用当前已确认设计。

## 预览、生产与切回

| 用途 | 命令 | 输出 / 地址 |
| --- | --- | --- |
| 双主题准备与生成 | `npm run preview:starfield` | `.preview/stargazer/`，含 `legacy/` |
| 双主题预览并启动 | `npm start` / `npm run start:starfield` | 4175 |
| 仅提供已有预览 | `npm run serve:starfield` | 4175 |
| 单独旧版预览 | `npm run preview:legacy` 后 `npm run serve:legacy` | `.preview/legacy/`，4176 |
| 旧版监听式开发服务 | `npm run server:legacy` | 4000 |
| 双主题正式构建 | `npm run build` / `npm run build:starfield` / `npm run netlify` | `public/`，含 `legacy/` |
| 只输出旧版用于恢复 | `npm run build:legacy` | `public/`，Kira 在根路径 |
| 自动验证 | `npm test` | 包含双主题与新增普通文章回归 |

`prepare:starfield` 是双主题预览的兼容别名。`generate:starfield` 是仅生成已准备内容的低层命令，会生成没有旧版切换入口的单主题预览；日常请用统一入口。准备与生成共享 `db.json`，不能并发执行；静态服务可以并行。统一构建先在临时目录完成两边，成功后替换输出，避免一边构建失败覆盖可用预览。`/legacy/` 为备用主题保留，不能给文章或页面配置冲突地址。

若希望旧版重新作为全站默认主页，修改 `_config.yml`：

```yaml
blog:
  default_theme: legacy
```

执行统一构建后，Kira 在 `/`，新版在 `/starfield/`。改回 `starfield` 恢复新版根主页和 `/legacy/`。文章继续在原来的 `source/` 维护。独立历史恢复见 [旧版指南](legacy-blog-recovery.md)。

默认服务只监听 `127.0.0.1`。端口占用可沿用现有服务，或设置 `STARFIELD_PREVIEW_PORT` 后启动；此变量也适用于旧版静态服务。

完整镜头仍为 `scene.motion: full`。穿窗与回屋的微小房间模糊默认关闭，以减轻省电模式的合成开销；在 `themes/stargazer-starfield/_config.yml` 将 `scene.passage_blur` 设为 `true` 可恢复。实际持续掉帧会触发背景精度调整，静止、隐藏页面及浏览器固定刷新节奏不会单独触发降级。复测与仍有的首次进入峰值见[省电过场记录](../../.scratch/starry-blog/evidence/power-transitions-20261010/README.md)。

## GitHub → Netlify

已修改仓库中的 `netlify.toml`：

| 设置 | 值 |
| --- | --- |
| 构建命令 | `npm run netlify` |
| 发布目录 | `public` |
| Deploy Preview 命令 | `npm run netlify`，与正式输出一致 |
| Node / npm | `22.19.0` / `10.9.3` |
| 默认内容 | 新版 `/` 与旧版 `/legacy/` |

Netlify 中具体操作：

1. 打开现有项目的 **Project configuration → Build & deploy → Continuous deployment**（部分界面归在 **Developer settings**），确认仓库为本项目，Base directory 为仓库根目录／留空，Build command 为 `npm run netlify`，Publish directory 为 `public`。
2. 作者已于 2026-10-10 确认 Production branch 为 `master`。保留该绑定，将 `codex/starfield-personal` 的此次改动提交为指向 `master` 的 PR；验证预览后合并。无需把生产分支改为开发分支。可在 **Branches and deploy contexts** 核对绑定是否仍为 `master`。
3. 确认 Deploy Previews 开启。先通过指向生产分支的 PR 验证远程预览；检查 `/`、`/legacy/`、原中文文章直达和刷新、对应旧文章、双向切换、归档／标签、图片和音乐资源。
4. 将代码、正文和本地生成的元信息提交并推送到所选生产分支，或合并已验收的 PR，Netlify 自动构建。构建日志应包含两个主题及最终 `Both themes built`，发布目录应同时有两套 HTML。
5. 发布完成后在正式域名重复核对上述地址。需要回滚可先在 **Deploys** 中将此前成功的部署重新发布；如果希望之后每次构建都保持旧版根主页，再提交 `blog.default_theme: legacy`。只需原主题的应急构建可将 TOML 中构建命令改为 `npm run build:legacy`，Deploy Preview 覆盖也需同步处理。

同名设置以 `netlify.toml` 为准，只改平台界面的构建命令不能覆盖文件中的命令；生产分支绑定仍需在平台设置。依据：[Netlify 文件配置与优先级](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。

域名与 DNS 可沿用，单个 Netlify 项目发布整套 `public/` 即可，不需要第二个站点或后台服务。每个原文章和旧版对应地址都有实际 HTML；不要增加 `/* → /index.html` 的强制统一重写。JS、CSS、星图及备用主题目录已配置缓存重新验证，避免更新时混用不同版本。

本地生产构建与已登录平台、Linux 云构建、正式上线分别验证。作者已确认生产分支为 `master`；已登录平台设置、云构建与新部署结果尚未验收，本次配置修改及本地预览不会触发线上发布。第三方音频是否成功播放取决于原音乐接口，页面资源可用与音频接口成功应分别判断。

## 首屏与性能检查（2026-10-09）

复测脚本、Markdown 结论和 `*-summary.json` 摘要提交到仓库；完整报告、截图、录像及逐次测量数据保留本地并由 `.gitignore` 忽略。历史记录中详细产物的相对链接指向本地归档，取得和提交范围见[测试产物保存约定](../../.scratch/starry-blog/evidence/README.md)。

首页加载时先显示房间前景与最终窗口轮廓，窗外以深蓝底色承接，实时星空准备完成后在 0.45 秒内淡入；不再先露出原插画里另一套窗景。窗口按钮在星空准备完成后启用；不会先闪出文章清单。关闭 JavaScript、主模块请求失败、遮罩图片失败或渲染不可用时，文章清单恢复供访问。深链接仍有静态正文回退。

互动云缓存和无损步行动作图集已随主题保存，预览、生产构建无须安装图像处理工具。更换步行动作 PNG 时需重新生成 WebP 并核对浏览器绘制像素；更新云的种子或造型算法时需同步重建三张 PNG 缓存与命中透明度。生成、回归、冷缓存测量与当前限制见 [性能复测记录](../../.scratch/starry-blog/evidence/performance-20261009/README.md)。
