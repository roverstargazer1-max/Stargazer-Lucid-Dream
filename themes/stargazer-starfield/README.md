# Stargazer Starfield 个人主题

独立 Hexo 主题，采用 V20 窗边与穹顶场景，以及已确认的冷色复古阅读窗口、B「视线聚焦」开合和点星后轻雾显字。使用全部真实文章；不包含调试面板、模拟文章、布局导出或试稿方案切换。旧 Kira 主题及配置保留，默认生产构建仍选择 Kira。

写完 Markdown，执行 `npm run start:starfield`，自动保存身份、原链接、描述和新星位置，并启动 <http://127.0.0.1:4175/>。服务已运行时执行 `npm run preview:starfield` 后刷新页面。预览位于 `.preview/stargazer/`；`npm run build:starfield` 生成用于托管的 `public/`。

文章关系填写在 Front-matter 的 `related` 中，引用文件名而非标题，不含 `.md`。每对文章只配置一次，自动双向；理由选填，未写理由仍保留文末跳转入口。修改文件名时同步修改引用；修改标题不影响引用、旧链接或星位。

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 两篇文章的关联理由
```

`starry_excerpt` 用于描述元信息，点星后不展示长摘要。已有自动身份与星位由准备流程维护，不需要作者填写编号。更完整的写作、可选配置、静态地址与旧版切回步骤见 [使用指南](../../docs/operations/starfield-blog.md)；本次视觉决定及验证见 [落地记录](../../.scratch/starry-blog/reader-rollout-20261002.md)。
