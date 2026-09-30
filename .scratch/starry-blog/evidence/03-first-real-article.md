# 03 一篇真实文章的星空阅读闭环验收

日期：2026-09-30。基于票据 02 已提交的恢复基线 `41b60e4`，在个人仓库工作副本完成。没有部署到 Netlify。

## 构建与数据

- 使用 `npm run preview:starfield`，成功生成 77 个文件到 Git 忽略的 `.preview/stargazer/`。独立预览配置选择 `stargazer-starfield`；默认 `_config.yml` 仍选择 Kira，旧 `public/` 目录在构建前后都存在。
- 使用 `npm run serve:starfield` 启动只绑定 `127.0.0.1:4175` 的本地静态服务。
- 首篇使用现有 Hexo 文章《梦开始的地方[置顶]》，稳定身份 `dream-begins`，已保存重要度 `important` 和位置 `[4700, 3180, 2290]`。星空索引、静态正文、题目和分享数据都由同一篇 Hexo post 生成。
- 原地址 `/2025/10/20/梦开始的地方[置顶]/` 在本地以 UTF-8 编码路径直达。生成文档包含原文标题、人工填写摘要、完整 Hexo 正文、稳定 heading ID、原站规范 URL、Open Graph/Twitter 标题、摘要、地址，以及绝对封面分享图。
- 输出检索未发现 mock、调试文案、原型工具或虚构文章标记。

## 浏览器验收

环境：Codex In-app Browser 桌面视口，站点由本机 loopback 静态服务器提供。

1. 首页进入窗边插画，点击窗户进入穹顶；入口与室内使用同一场景状态。
2. 从星空第一次选中唯一的真实文章星，出现其日期、标题和摘要，正文没有打开；移动过程中在同一次浏览器自动化调用内连续再点同一星，阅读层仍未打开、状态仍为“正在靠近”。到位后按钮状态变为“再点星，阅读”。
3. 到位后再点同一星，地址切换到 Hexo 原地址的精确百分号编码路径（包括方括号 `%5B`/`%5D`），阅读层呈现真实 Hexo 正文、目录标题、列表和锚点。关闭后回到原星空及已选文章；直接进入文章时关闭回到对应星附近，再可返回窗边。
4. 在原中文文章地址直接打开并刷新，浏览器仍显示对应文章标题和完整正文，阅读层可以正常滚动。
5. 空白穹顶处桌面拖动后，月亮、星点和云层的屏幕位置明显改变；在穹顶上滚轮后视野继续推进。

## 静态正文故障回退

以下故障均只注入已生成的 `.preview/stargazer/` 临时预览文件，逐项刷新同一文章地址观察；站点源文件未注入故障。正文、摘要和标题仍可访问：

- 从文章 HTML 移除主 module script，模拟禁用脚本。
- 临时移开生成目录中的 `js/starfield/app.js`，模拟主脚本加载失败。
- 在生成的 app module 开头抛出模拟初始化异常。
- 在生成的 renderer 中模拟 renderer 不可用，使准备阶段失败并触发静态回退。此项验证应用级 WebGL/渲染不可用处理，并非关闭浏览器硬件 WebGL 开关。

随后重建隔离预览，清除故障注入；再次刷新原文地址，增强阅读层正常工作。浏览器打开过程中观察到启动准备未成功时会保留静态文章，成功准备后才切换到星空视图。

## 范围与来源

- 本票只验证一篇文章和桌面视口；多文章准备发布、关系/历史、手机交互和设备性能分别留给后续票据。
- 本机浏览器验证不是外网部署或 Netlify 生产验证。生产分支与回滚仍由票据 15 实测。
- Hexo 一手参考：[Themes](https://hexo.io/docs/themes)、[Templates](https://hexo.io/docs/templates)、[Variables](https://hexo.io/docs/variables)、[Data Files](https://hexo.io/docs/data-files)、[Generator API](https://hexo.io/api/generator)、[Configuration](https://hexo.io/docs/configuration)、[Commands](https://hexo.io/docs/commands)。本会话的 Context7 工具不可调用，按仓库约定以官方文档核对。
