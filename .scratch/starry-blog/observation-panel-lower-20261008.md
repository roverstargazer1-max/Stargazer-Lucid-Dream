# 文章观测面板整体下移

日期：2026-10-08。作者要求右侧文章介绍面板整体往下一些。只调整整个 `#preview.observation-panel` 的位置，人物、声波、年份、日期、关闭入口和 READ 一起移动。

桌面中心由 60% 调整到 64%，横屏由 56% 调整到 60%；手机竖屏底部距离减少 24px，仍计入安全区。内部尺寸、相对位置及动画参数沿用。

实际页面检查桌面 1440 × 900、笔记本 1365 × 768、手机 390 × 844、短屏手机 360 × 640、横屏 844 × 390。下移量分别为 36、30.72、24、24、15.61 CSS px。同一页面临时恢复旧位置后测量，再恢复当前样式：各主要元素的位移一致，宽高及横向位置一致，面板、关闭按钮和 READ 完整处于视口内，READ 均成功打开正文，控制台无运行错误。见[位置与交互检查](evidence/observation-panel-lower-20261008/checks.json)。

桌面对照：[调整前](evidence/observation-panel-lower-20261008/desktop-before.png)、[调整后](evidence/observation-panel-lower-20261008/desktop.png)。其余截图：[手机](evidence/observation-panel-lower-20261008/mobile.png)、[短屏手机](evidence/observation-panel-lower-20261008/small-mobile.png)、[横屏](evidence/observation-panel-lower-20261008/landscape.png)。

本地预览及正式主题构建通过，均生成 149 个文件；`git diff --check` 通过。本地预览为 <http://127.0.0.1:4175/>，未推送或部署。
