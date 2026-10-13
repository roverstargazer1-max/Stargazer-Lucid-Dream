# 观测面板底色与索引选中标记

2026-10-12，依据作者提供的三张截图完成两处局部样式调整。本地预览已生成，未线上发布。

- 删除 `observation.css` 中 `.observation-artboard::before` 的椭圆渐变背景，图面直接透出原星空。
- `search.css` 中索引菱形的 `left` 从 −2px 改为 −12px。滚动列表向左扩展 16px 并以同等内边距保持标题位置，展开态面板裁切边界也向左扩展 16px。原素材、人物／声频绘制、检索与阅读代码未修改。

## 核对结果

修改前用真实预览复现：桌面减少动态效果设置下，菱形与标题重叠约 4.45px，左侧另有约 3.45px 被滚动列表裁切；椭圆背景的伪元素与渐变样式均存在。

修改后用 Chromium 量测 1440×1000、390×844、320×568、844×390 及桌面减少动态效果设置。悬停和键盘聚焦的菱形全部显示，距列表裁切边缘约 2.55px，距标题至少 5.55px；观测底色的伪元素与背景均为 `none`。逐个完成索引展开、打开文章、关闭文章返回检索及退出，无页面脚本异常。量测见 [browser-summary.json](browser-summary.json)，本地截图为 `desktop-observation.png`、`mobile-observation.png` 和各设置下的 `*-index.png`。

现有相关检查通过：

```powershell
node --test tests/observation.test.mjs tests/search.test.mjs tests/static-output.test.cjs
```

16 项全部通过。`npm run preview:starfield` 与最终独立执行的 `npm run build` 均完成双主题输出；最终构建日志没有 `ERROR`。构建与会初始化 Hexo 的校验任务须顺序执行，避免共享缓存相互影响。
