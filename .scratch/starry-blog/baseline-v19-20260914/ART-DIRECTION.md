# 星空 V3 与屋顶 V2：素材和生图提示词

日期：2026-09-08。屋顶 V2 使用内置 image_gen 工具生成；天空 V3 使用原生 Canvas 绘制，本轮没有新增生图。

## 本轮采用的方式

- V2 直接铺参考照片的方式被作者否定：画面生硬，照片亮星淹没文章入口。V3 不再加载 `assets/sky-reference-v2.png`，该文件仅保留为历史参考。
- 天空改为球面分布的微小星点、较密但低亮度的银河星点与柔弱尘带。远景随镜头朝向投影，避免照片放大、平移到边界的贴图感；近景星点和文章随镜头平移产生视差。
- 屋顶材质来自生成的 `assets/rooftop-v2.png`。这是完整、不透明的摄影质感场景，天空部分在 UI 中被轮廓裁切掉。
- `assets/roof-silhouette-v2.svg` 保存手工描出的前景轮廓；`art.js` 使用同一轮廓进行 Canvas 裁切，保留瓦片、墙面和门灯的栅格材质。屋顶作为独立前景，随推进放大、向下退出并淡出。
- 文章星保留明亮星核、小幅星芒和近处标题；背景星无星芒，并在文章附近降低亮度。背景负责空间氛围，文章入口保持可发现。标题采用四方向避让，手机也能辨认相邻文章。
- 这是用于选择美术和镜头的 2.5D 混合原型。轮廓与材质仍需最终美术打磨，不能冒充完整的三维房屋模型。

### V3 屋顶拖动修正

作者发现纯拖动时屋顶出现矩形裁边。原实现把 yaw/pitch 直接换算为图片平移，素材缺失的左侧和底部因此进入画面。现在将屋顶视为固定下沿的前景：转向仅改变淡出程度，不改变贴图位置；前进仍保留放大、下移与淡出，转回起始方向或回到屋顶可恢复。转向淡出使用视线夹角，完整转一圈后能恢复。屋顶不可见时手记入口同步隐藏。

这是原型阶段的取舍，尚待作者确认。若希望不淡出而能站在屋顶上自由环顾，需要简化的三维房屋、女儿墙和地面，并为可见侧面准备材质；单张生图描成 SVG 也不能补出侧面和背面的空间。

## 可以直接复用的中文提示词

> 生成一张 16:9 横向电影摄影质感的深夜屋顶场景。镜头站在真实住宅屋顶上，以人的视线高度稍微仰望天空。天空占绝大部分画面，接近黑色的深蓝夜空，细密而自然分布的星点，暗淡、细节清晰的斜向银河尘带，少量克制的蓝白色和暖色星光；保留大片真正的暗部，不要紫色霓虹星云。画面左下角只有一小部分旧屋顶楼梯间：粗糙的深灰蓝瓦片、老化墙面、半开的木门，一点柔和琥珀色灯光从屋内溢出。低矮的砖石女儿墙沿画面底部向右延伸，透视自然；墙上放一本旧手记、一只陶瓷茶杯和一盆小植物。屋顶是某个人生活的痕迹，不能压过天空。材质真实，阴影深，冷色天空微光与暖色门灯形成细微对照。无人物、无文字、无水印、无界面、无卡通、无低多边形、无等距视角、无塑料材质、无发光描边。输出完整不透明的场景，不要透明棋盘格。

建议同时附上你提供的星空参考图；如果继续沿用这座屋顶，也附上本目录的 `assets/rooftop-v2.png` 作为建筑参考。

## 本轮实际执行的最终提示词

输入图 1：第一轮生成的屋顶造型图，仅用于建筑和材质参考。输入图 2：用户提供的星空图，用于天空风格。

```text
Use case: compositing. Create one finished cinematic photographic night scene, wide 16:9. Input image 1 is the rooftop material and architectural design reference; input image 2 is the exact target sky aesthetic. Replace every checkerboard area with an extremely deep almost-black astrophotographic night sky, filled with delicate naturally varied stars, a faint sharply detailed diagonal Milky Way dust lane, restrained blue-white points and a few warm stars. NO checkerboard anywhere. This is a finished opaque photographic scene, NOT a transparent cutout. Recompose: sky dominates the top 80% of the image, the house is a small intimate foreground fragment anchored at the LOWER LEFT EDGE, its roof peak no higher than the bottom 28% of the image. The weathered parapet reaches across the BOTTOM 12%, receding naturally in perspective. Keep the rooftop room's aged blue-charcoal tiles, weathered plaster, small open door glowing softly amber, notebook, tea cup and one little plant, all physically believable and modest in size. Darken the rooftop so the sky is the main subject, preserving rich texture. Eye-level from a real quiet rooftop looking mostly UP, not isometric, not miniature, no wide-angle distortion. No sun, no moon, no city skyline, no clouds covering stars, no purple nebula, no oversized stars, no added objects, no people, no text, no UI, no logo, no watermark. Beautiful precise natural photographic textures and deep black contrast, very subtle blue atmospheric light just above the parapet. The upper portion must match image 2's genuine sense of astronomical distance; the lower portion provides a small warm trace of a person's real life.
```

## 第一轮造型探索记录

第一轮尝试请求透明前景，结果包含绘制的棋盘格，未作为可用透明素材接入。第二轮改为完整场景，再通过轮廓裁切使用。不能把生成图中的棋盘格当作真实 alpha 通道。

```text
Use case: photorealistic-natural.
Asset type: a transparent foreground plate for an immersive personal astronomy website; NOT a complete website screenshot.
Generate a wide 16:9 photorealistic rooftop foreground, as if a real camera stands on a quiet, lived-in residential rooftop at midnight looking slightly upward into a vast sky. Only the bottom 28 percent contains architecture; the entire upper 72 percent must be genuinely transparent alpha with NO sky, NO stars, NO backdrop.
At the lower left edge, part of a small old rooftop stairwell with a dark sloping tiled roof and a half-open door spilling a very dim warm amber light. A low weathered concrete-and-brick parapet recedes in perspective from the lower left toward the lower right, staying low in frame. A worn notebook, a small ceramic tea cup, and one small potted plant rest quietly on the parapet near the left third. No other invented decorative objects. Toward the right only the thin parapet edge and a dark roof surface, leaving a huge open silhouette above.
Physically plausible weathered materials: individual rough clay tiles, chipped concrete coping, subtle irregular mortar, slightly aged plaster, fine natural surface variation. Architecture belongs to a real modest home, not a fantasy castle or a dollhouse. Correct human eye-level perspective, NOT isometric. Cinematic photographic realism, gentle film grain, sharp texture details without oversharpening. Predominantly very dark charcoal and desaturated midnight blue, a delicate cold blue skylight rim on the edges, small warm practical doorway light. The scene must read clearly as night, with deep shadows and restrained highlights. Match the reference image's believable deep-night photographic atmosphere; the input image is only a lighting/style reference, not an edit target.
Constraints: transparent background, no opaque sky, no clouds, no distant scenery, no people, no lettering, no logo, no watermark, no HUD, no frame, no vector shapes, no cartoon, no low-poly, no purple neon, no glowing outlines. Keep the architecture anchored to the bottom and left edges, not floating in the center. The usable rooftop silhouette should be detailed and natural.
```
