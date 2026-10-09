# 文章标题统一上移

2026-10-09，作者要求所有文章标题稍向上平移。

阅读窗口中 `.article-title-banner h1` 统一使用 `translateY(clamp(-14px, -1.5cqw, -8px))`，随阅读区域宽度向上移动 8–14px。只改变标题视觉位置，原字号、横向位置、换行宽度、装饰素材和正文布局沿用。

新版预览生成 160 个文件；确认全部 10 篇文章使用同一个标题模板，见 [generated-articles.json](generated-articles.json)。`git diff --check` 通过。

浏览器检查桌面 1440×1000、手机 390×844、窄屏 320×740，覆盖《活在真实天空下，做半个君子》和《慢》。桌面标题 y 从 212.328125 变为 198.328125，正好上移 14px，标题区域高度仍为 329px；手机上移 8px，窄屏长标题两行完整显示，没有横向溢出。位置与样式记录见 [checks.json](checks.json)。

截图：[桌面调整前](before-desktop.jpg)、[桌面调整后](desktop-after.jpg)、[标题区域局部](desktop-title.png)、[手机长标题](mobile-long.jpg)、[窄屏长标题](mobile-320-long.jpg)、[窄屏短标题](mobile-320-short.jpg)、[桌面短标题](desktop-short.jpg)。局部直接裁自桌面调整后截图，保留完整顶部装饰区域。

仅本地实现和浏览器视口模拟，未发布。
