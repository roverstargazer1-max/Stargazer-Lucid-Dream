# 索引文章标题字体验证

2026-10-12，按作者截图要求，将新版所有文章索引的标题改用 `LxgwMarkerGothic-v1.003`。

- 字库：复用 `fonts/lxgw-marker-gothic-v1.003.woff2` 及 `reader.css` 中的声明，使用原生 400 字重，禁用合成字重。
- 范围：检索 INDEX 的标题文本；归档、标签、分类清单中的文章标题链接。日期、星表 ID 与其他文字保持既有字体。
- 浏览器：桌面及手机检索中的 10 篇标题计算样式均为 LXGW Marker Gothic；字体加载检查通过，长标题正常换行。日期仍为系统中文字体，ID 仍为 Consolas。
- 清单：归档 10 篇、随笔标签 6 篇标题均使用新字体；分类共用 `collection-list.ejs` 和 `.archive-list a` 样式，现有文章没有分类输出。
- 仅修改字体样式，无交互或动画变更。双主题预览及正式构建通过。

样式检查见 [browser-summary.json](browser-summary.json)。`desktop.png`、`mobile.png` 为本地截图，按仓库证据忽略规则不提交图片。
