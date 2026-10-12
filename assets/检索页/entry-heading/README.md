# 星盘指针独立图层

2026-10-12，作者要求蓝紫星盘指针真实跟随用户视角在水平面上的方向。

- 原稿仍为 `assets/蓝紫星盘.png`，不改写。页面以 CSS 裁切原图中的指针、固定轴心和盘面；旋转中心为原图 `(615.5,644.5)`，指针原方向约为顺时针 29.33°。
- `geometry.json` 保存 1254 × 1254 原图中的裁切路径、轴心与原方向。原图底盘裁掉固定指针区域，避免修补图未加载时出现双针；外围白底随盘面轮廓裁掉。
- `disc-repair.png` 由内置 imagegen 编辑原图得到，尺寸同为 1254 × 1254；页面只使用它在旧指针所在小块区域的像素，其余盘面、数字、装饰星继续用原图。模型输出留在 Codex 的生成目录，项目副本保存在本目录；未生成 SVG，也未用 Python 改写图像。
- 页面仅旋转原指针，上方为虚拟星图 +Z、右方为 +X，与 `atlasPoint` 同向。实际相机 yaw 由既有帧循环驱动；俯仰、位置与缩放不改变水平指向，正上方保留 yaw。指针没有额外缓动或独立动画循环。

内置 imagegen 的编辑提示词：

> Edit target: the attached original blue-violet astrolabe UI disc, assets/蓝紫星盘.png. Make exactly one change: completely remove the single long dark-indigo clock needle extending from the small central cyan ring towards the upper right and slightly beyond the outer rim. Reconstruct ONLY the pixels hidden beneath that needle by naturally continuing the existing cyan circular grid lines, outer rim, roman numerals, and blue/violet flat color segments. Preserve the small circular central pivot ring and its inner blue fill exactly. Keep the complete disc geometry, every visible glyph, every decorative star, every visible color, grid line, rim position, and crop unchanged. Keep the disc exactly the same size and position in the square image, with the same existing white outer background. No needle, no second hand, no extra shapes, no text changes, no perspective, no new glow or shadow, no reinterpretation. This is a background layer for the exact original needle rotating independently in a web UI; alignment and preserving the original artwork matter. Return a square image matching the original composition.

验证及截图见 `.scratch/starry-search/evidence/entry-heading-20261012/README.md`。仅本地实现，未线上发布。
