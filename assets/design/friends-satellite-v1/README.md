# 通信卫星友链入口

使用内置 imagegen 生成，当前星空截图仅作画风和配色参考。原图 `satellite-original.png` 保留透明通道；发布素材位于 `themes/stargazer-starfield/source/images/friends/satellite-v1.webp`，等比缩至 384×256 并使用无损 WebP 编码，没有改画内容。

2026-10-25：卫星改为随镜头缩放后，当前发布入口使用同一原图等比生成的 `themes/stargazer-starfield/source/images/friends/satellite-v1-768.webp`（768×512），以保留放大细节。384px 版本作为历史素材保留。

生成提示词：

```text
Use case: stylized-concept. Asset type: a single transparent sprite for a painted anime night-sky personal blog. Input image is a STYLE AND COLOUR reference only: keep its gentle cel-painted edges and cool deep-blue/periwinkle moonlit palette; do not reproduce the sky, moon or clouds. Primary request: one small charming communication satellite, viewed in three-quarter perspective, floating quietly in space, rotated diagonally about 20 degrees. Compact pale blue/lavender central body, two narrow dark cobalt solar panel wings with a few broad rectangular cells, a small dish antenna pointing up-right and one tiny icy-blue indicator. Soft restrained moonlit highlights, matte painted surfaces, slight hand-painted texture, crisp readable silhouette at 80 CSS pixels wide. Shape and perspective like an object within an illustrated scene, not a UI icon or wireframe logo. Isolate exactly one satellite centered, generously padded, all parts intact. Real alpha-transparent background, no sky, no stars, no ground, no enclosing circle, no trail, no signal rings, no glow halo, no text, no logos, no watermark, no other objects. Preserve transparency.
```
