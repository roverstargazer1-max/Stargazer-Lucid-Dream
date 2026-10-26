# 阅读进度底栏渐隐

2026-10-26，作者反馈底栏装饰边界突兀，希望以渐变融入正文背景。

`reader.css` 的 `#reading-journey::before` 现在以 68% 透明度显示原装饰图；水平和垂直渐变遮罩取交集，让四周自然消隐，透出原有、随正文位置同步的书页底图。左侧原素材的亮色直边仍被隐藏。进度线、百分比、阅读文字与人物不在遮罩层内，原素材与进度／行走逻辑保持不变。

`npm run preview:starfield` 双主题构建通过，准备过程未更新文章文件；`git diff --check` 通过。[浏览器检查](check.mjs)在桌面 1440×1000、手机 390×844、窄屏 320×740、横屏 844×390、减少动态效果及 `?motion=soft` 六组条件下检查了 0%、50%、99%、100% 与关闭返回：无横向溢出、页面异常或人物终点越界。结果见[摘要](browser-summary.json)。Chrome 桌面及手机视口模拟，未进行实体手机或远程发布验证。

复测：先运行双主题预览并保持 4175 服务开启，再从仓库根目录运行 `node .scratch/starry-blog/evidence/reader-gradient-20261026/check.mjs`；可通过 `PLAYWRIGHT_MODULE` 指定本机 Playwright。`--before` 用于修改样式前保存桌面对照，不修改页面样式。

截图按仓库约定仅保留本地：[调整前](desktop-before-detail.png)、[调整后](desktop-after-detail.png)、[手机](mobile-after-detail.png)、[横屏](landscape-after-detail.png)。
