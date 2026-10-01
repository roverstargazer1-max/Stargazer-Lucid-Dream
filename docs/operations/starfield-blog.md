# 星空博客的写作、预览与发布

当前个人主题：`themes/stargazer-starfield`，体验基准 V20。文章、图片、旧 Kira 主题和配置继续保留。实施分支是 `codex/starfield-personal`；本次只做本地提交，不 push，也不发布线上。

## 日常写作

继续在 `source/_posts/` 写 Markdown，填写原有 title、date、tags、cover 等字段。全部已发布文章都会成为星星，不需要填写编号。写完执行：

```powershell
npm run start:starfield
```

它先自动准备身份、原链接、引言和新星位置，再生成新版预览并启动服务。打开 `http://127.0.0.1:4175/`。如果服务已经运行，执行 `npm run preview:starfield` 更新页面，然后刷新浏览器即可。

自动生成的 `starry_id`、`starry_original_permalink`、`permalink`、`starry_excerpt_generated` 不要手动改。改文章标题不会改身份、旧链接或星位。若想自写引言，填写 `starry_excerpt`，并删除 `starry_excerpt_generated` 或设为 false。没写时会从正文自动提取。

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
| 新版服务 | `npm run serve:starfield` | `http://127.0.0.1:4175/` |
| 新版一次预览并服务 | `npm run start:starfield` | 同上 |
| 旧版生成 | `npm run preview:legacy` | `.preview/legacy/` |
| 旧版服务 | `npm run serve:legacy` | `http://127.0.0.1:4176/` |
| 新版生产构建 | `npm run build:starfield` | `public/`，读取已提交布局，不自动改文章 |
| 当前默认生产构建 | `npm run netlify` | 旧 Kira，`public/` |
| 本地自动验证 | `npm test` | 准备、静态生成与行为检查 |

各预览目录分开；两个生产构建都会重建 public，请勿同时运行。Hexo 共享本地数据库，所以新旧生成命令也按顺序运行。旧版服务直接读取旧版静态预览，不受随后新版生成影响。

原文章地址打开先显示正文；关闭正文后进入该文章的星空。旧 `/pages/archive/`、`/pages/friends/`、`/pages/mine/`、归档年月、标签和分类地址保留。友链继续读取 `_config.hexo-theme-kira.yml`，避免两份名单漂移。音乐继续用原歌单和资源；第三方音乐服务失败时不会挡住正文。

星空失败时显示静态正文或全部真实文章入口。文章内部 style 限制在文章作用域；当前内容使用的相对 image 路径在生成时承接到现有图片，Markdown 原文不改。旧浏览器不支持 CSS 作用域时可继续阅读正文，但自定义美术样式可能不显示。

## GitHub → Netlify

本次保留默认生产构建选旧版，遵循计划中“正式切换另按发布指示”的约定。`netlify.toml` 的 Deploy Preview 构建使用新版，输出仍是 public；生产构建仍为 npm run netlify。未来批准上线时，将生产构建命令改为 `npm run build:starfield`，发布目录保持 public，再按已经绑定的平台分支推送。

固定 Node 22.19.0、npm 10.9.3，保留根目录 package-lock.json；安装用 npm ci。新版不需要运行本地原型服务器或后端。JS、CSS、文章索引要求缓存重新验证，避免更新后混用旧模块；已有图片继续按原缓存策略使用。

推送前必须先本地预览并提交准备结果。托管端缺少新文章身份/星位时会明确报错，请回到本地预览并提交，不能让托管构建自行分配不持久的位置。

本次通过本地静态生产构建。实际 Netlify 绑定分支、项目设置、Linux 云构建和深链接 HTTP 响应尚未实测，因为本次禁止 push，仓库也没有已连接的 Netlify 项目标识。发布前在实际项目核对 base directory、生产分支、构建命令、public 目录和 Deploy Preview；成功预览后检查中文文章直达、刷新、图片与音乐。不要配置把所有旧链接统一重定向到首页的 SPA 回退。

## 切回旧版

现在默认构建本就使用 Kira。未来切换后，只需把 Netlify 生产构建命令恢复 `npm run netlify`，并确保 `_config.yml` 的 theme 仍为 hexo-theme-kira。本次没有改这个默认值。文章的自动元信息不会妨碍 Kira 读取原正文。

本地执行 `npm run preview:legacy` 和 `npm run serve:legacy` 可随时核对旧版。需要完整恢复历史配置/锁文件时，按照 [旧版恢复说明](legacy-blog-recovery.md) 从保存的基线恢复；不要删除新版主题或原文章来切换外观。

本次验收和限制见 [实施记录](../../.scratch/starry-blog/implementation-progress.md)。
