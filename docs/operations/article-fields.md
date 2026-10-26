# 文章字段速查

文章写在 `source/_posts/*.md`。文件最上方两条 `---` 之间是属性，下方才是正文。同一份文章在每次统一预览或构建后同时更新新版与旧版；线上更新仍须提交并推送，等待发布完成。

## 编辑时的提示

每个字段的说明直接写在它上方的 YAML 注释中，以 `#` 开头；嵌套的 `star.rank` 和 `star.isolated` 也各自有说明。注释不改变字段名、类型或取值，也不会进入两套主题发布的正文、摘要或检索数据。

```yaml
# starry_excerpt：新版描述摘要，留空自动提取，手写优先。
starry_excerpt: ""
# starry_id：内部文章身份，自动生成，已有值不要修改。
starry_id: article-example
```

现有文章在预览／构建时补齐注释，新文章创建后立即有注释。程序维护 `# 字段名：说明` 形式的注释，保留其他自定义备注和正文；原来的 `写作提示`、`自动字段`、`字段速查` 集中提示属性会移除。

VS Code 内置预览的表格模式忽略 YAML 注释。本项目的 `.vscode/settings.json` 将 `markdown.preview.frontMatter` 设为 `codeBlock`，让预览也能逐字段查看说明；源码编辑器中同样可见。该设置只影响编辑器预览，不影响网站。可以在 VS Code 的“Configure Frontmatter Visibility”中切换回表格或隐藏，参见 [VS Code 官方说明](https://github.com/microsoft/vscode-docs/blob/main/release-notes/v1_121.md#yaml-frontmatter-in-markdown-preview)。

## 平常会填写的字段

| 字段 | 含义与写法 |
| --- | --- |
| `title` | 文章标题，普通文字。创建时自动填入，可修改。 |
| `date` | 发表时间，例如 `2026-10-21 12:00:00`；影响显示和时间排序。 |
| `tags` | 标签，例如 `[随笔, 生活]`，不填保留 `[]`。 |
| `categories` | 分类，例如 `[生活, 随笔]` 表示逐级分类，不填保留 `[]`。 |
| `subheading` | 旧 Kira 列表的副标题，支持文字或 HTML；不填用 `""`。 |
| `sticky` | 旧 Kira 列表置顶权重，数字越大越靠前；不填或 `0` 不置顶。新版按时间排序的相邻文章导航不受它影响。 |
| `cover` | 旧版列表、文章页封面及新版分享图片元信息。例如 `/image/covers/sky.webp` 对应 `source/image/covers/sky.webp`。不会更换新版星空或正文底图。 |
| `cover_mobile` | 旧版窄屏可选封面，空值沿用 `cover`。 |
| `starry_excerpt` | 新版描述摘要：留空自动提取；直接填写则采用手写内容；清空恢复自动。 |

自动摘要会去掉标题、图片、代码、媒体嵌入和常见 Markdown／HTML 标记，提取最多 180 字的纯文字。保留自动摘要时，修改正文后下一次预览会更新它；手写摘要保持作者的内容。`starry_excerpt_generated` 由程序自动记录，不用为了手写摘要而切换开关。

目前 `starry_excerpt` 用于新版页面描述元信息及文章索引数据，点星后的观测面板不展示长摘要。旧版列表摘要沿用 Kira 的原有规则。

## 新版星空的可选字段

关联填写另一篇文章的**文件名，不含 `.md`**，每对只写一次，程序生成双向关系。理由可不填；无关联保留 `[]`。

```yaml
related:
  - post: 另一篇文章的文件名
    reason: 可选的关联理由
star:
  rank: ordinary
  isolated: false
```

`star.rank` 可选 `ordinary`（普通，4.0）、`important`（重要，2.5）、`treasured`（珍藏，1.0）；空缺时用普通。`star.isolated: true` 时不生成空间探索路径或时间连线，手填的关联仍保留。

## 自动字段：通常不用改

| 字段 | 含义 |
| --- | --- |
| `starry_id` | 内部文章身份，第一次预览／构建时自动生成，已有值保持不变。改标题不会生成新身份。复制文章新建时不要复制旧 ID。 |
| `starry_original_permalink` | 首次登记的文章原地址，自动保存以保持旧链接。 |
| `permalink` | 实际使用的文章固定地址，程序与原地址保持一致。 |
| `starry_excerpt_generated` | 自动摘要状态，由程序维护，`true` 为自动提取，`false` 为手写。 |

星位、永久星表号和上次自动摘要的识别记录保存在 `source/_data/starry-layout.json`，不要手填。日常预览后，把文章和该文件一起提交，可保留后续身份、编号与星位。`starry_id` 与界面上的 `SLD-0001 · 4.0` 含义不同，后者由永久星表号和当前博客星等组成。

创建、预览和发布步骤见[完整操作指南](starfield-blog.md)。
