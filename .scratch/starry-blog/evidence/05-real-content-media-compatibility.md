# 05 现有正文、图片与音乐兼容验收

日期：2026-10-01。基于工单 04 提交 `7275831`，在 `codex/prototype-starfield` 完成；未推送或部署。

## 内容清点

检查 `source/_posts/` 下全部 10 篇已发布文章。每篇都有封面和发布元信息；工单 04 保存的 `starry_id`、原 permalink、星位和摘要也都仍在。逐篇检查结果：

| 文章 | 封面 | 需要兼容的正文内容 |
| --- | --- | --- |
| AI时代，我们究竟需要什么？ | `/image/covers/miku01.webp` | Markdown 正文 |
| 做一个有有趣灵魂的人 | `/image/covers/做一个有有趣灵魂的人.png` | Markdown 正文 |
| 咏史有感 | `/image/covers/IMG_0325.webp` | 原始 `div`、`span`、`br`、外链和内联 `<style>` |
| 慢 | `/image/covers/慢_cover.webp` | Markdown 正文；保留 `sticky` 元信息 |
| 梦开始的地方[置顶] | `/image/covers/LucidDreaam.webp` | Markdown 标题/列表；front matter 的 `subheading` 含一个原始 `<meting-js>` 播放列表 |
| 活在真实天空下，做半个君子 | `/image/covers/sky.webp` | 原始 `div`、`strong` 和内联 `<style>`；保留转载元信息 |
| 言论·生活·小品 | `/image/covers/miku02.webp` | front matter 中的 HTML 小标题、Markdown 标题/列表及中文标题锚点 |
| 随笔1 | `/image/covers/45691349_p0.webp` | Markdown 正文 |
| 随笔2 | `/image/ztmy01.webp` | 一张相对 Markdown 图片 `../image/小记2/01.webp` |
| 随笔3 | `/image/ztmy02.webp` | Markdown 正文 |

清点结果：10 篇正文都没有 fenced code block；两篇正文含内联 `<style>` 块；没有正文使用 Hexo `{% ... %}` 音乐标签或其他旧自定义标签。封面均为根路径，`梦开始的地方[置顶]` 另有 `cover_mobile`；文章 front matter 中的 `sticky`、`reprinted` 及旧字段原样保留，没有借媒体兼容之名删除或迁移元信息。

## 实现与浏览器证据

- `post.ejs` 保留原始 `page.content`，并将确实存在的 `page.subheading` 原样放入文章阅读区，供置顶文章现有的 Meting 播放列表继续使用。首页不显示该播放器。
- 对文章播放器，星空阅读器仅在打开含 `<meting-js>` 的文章时加载配置的 APlayer CSS/JS 和 Meting JS；它将原属性转换为现有 `hexo-tag-aplayer` 运行时使用的 `.aplayer` 数据属性，并强制 `autoplay=false`。普通首页和不含音乐的文章均未加载播放器资源；旧关于页的 `{% meting %}` 短代码仍由全局 Hexo 插件按原有内容生成独立播放器。播放器脚本失败或第三方 API 无响应时显示状态文案，正文照常阅读。关闭阅读器时会暂停活动播放器控件及媒体元素。
- `npm run prepare:starfield` 成功生成 77 个文件，准备器报告 `Prepared 10 published article(s); 0 post file(s) updated.`。`node --check themes/stargazer-starfield/source/js/starfield/app.js` 通过。
- Codex In-app Browser 桌面环境：从星空首页进入穹顶，选择《梦开始的地方[置顶]》并点“进入阅读”，阅读器打开了原正文和播放器列表。播放器数据与标题可呈现，初始 `data-autoplay="false"`、无正在播放的音频；用户点击播放后才触发音频请求。关闭阅读器后播放控件回到待机态。
- 同一浏览器打开 `/2026/05/15/随笔2/`：正文图片的源为 `/../image/%E5%B0%8F%E8%AE%B02/01.webp`，浏览器正确解析到 `/image/%E5%B0%8F%E8%AE%B02/01.webp`，图片完成加载，尺寸 1170×1126。直接文章阅读区保留原 `page.content`。
- 同一浏览器打开《咏史有感》：`div`、`span`、内联 `<style>` 和外部附件链接 `https://www.shikun.net/show.asp?id=440` 均存在。打开《言论·生活·小品》：中文标题对应的 `id` 与页内 `href` 相符，例如 `平时的一些积累`，其余小标题也有可定位锚点。
- 静态回退：临时移出预览目录的星空 `app.js` 后直接打开《随笔2》。增强脚本未加载、静态文章区可见，标题和正文可读，相对图片仍成功加载（1170×1126），且没有加载 APlayer/Meting。随后立即恢复了预览脚本。
- 音乐故障：临时移出预览目录的 `Meting.min.js` 后直接打开置顶文章。阅读器仍打开；播放器被隐藏并显示“播放器暂不可用，正文仍可继续阅读”，文章正文仍完整可读。随后立即恢复播放器资源。
- 第三方限制：浏览器返回了播放列表信息；用户点击播放时音频端报 `NotSupportedError: The element has no supported sources.`。因此证明了点击触发和失败不阻断阅读，但本机环境未能验证第三方音频流实际播放成功；不把它记录为已验证的流媒体成功。

## Kira 隔离与旧版回归

- 根 `_config.yml` 仍使用 `hexo-theme-kira`。Hexo 的主题脚本按活动主题加载，因此 Kira 的 `themes/hexo-theme-kira/scripts/` 未进入星空主题。星空文章中的原始 `<meting-js>` 不会被 Kira 脚本或全局 `{% meting %}` 标签重复解析；新主题只在含该内容的文章阅读时加载所需运行时。
- `hexo-tag-aplayer` 的全局 `after_render:html` filter 和 `{% meting %}` 标签仍会服务旧页。旧关于页的 `{% meting "14457276201" "netease" "playlist" %}` 生成一个 APlayer，旧归档页仍保留独立的 `meting-js` 单曲 `2088204761`。它们不是文章正文音乐；关于页改造继续由工单 09 承接，本票没有新增作者介绍或音乐场景。
- `npm run build` 在默认 Kira 配置下成功，生成 79 个文件。旧版文章 `/2026/05/15/随笔2/` 实测相对图片加载成功，尺寸 1170×1126；关于页和归档页分别保留原有歌单及 Kira 延迟脚本。`public/index.html` SHA-256 为 `4AB643FE31BABA40ECA9BE8EE856E23C8E6F26FFFB1A15D60DAA0115962D52A5`，与工单 04 记录的 Kira 基线一致。
- Context7 MCP 当前不可用；本票核对了 Hexo 官方[主题](https://hexo.io/docs/themes)、[插件](https://hexo.io/docs/plugins)、[过滤器](https://hexo.io/api/filter)和[渲染 API](https://hexo.io/api/rendering)说明，并结合仓库中安装的 Hexo 8.1.2 与 `hexo-tag-aplayer` 3.0.4 实际构建验证。

## 范围

本票保留了全部已发布正文与元信息，验证根/相对图片、HTML/CSS、链接/锚点、文章播放器及资源故障回退。未使用的旧自定义标签未扩展；关于与归档歌单仍按旧主题现状生成，界面迁移留给 09。第三方音频流播放成功因当前来源返回无可播放音源而未获验证。
