# 屋顶风格 V4：提示词与素材

使用内置 image_gen，每种风格单独生成一次，仅房屋前景，没有生成星空。四个 PNG 保留真实透明通道。作者已选择二次元动画风格，其他素材保留作对照。V5 调小前景并将其右侧渐隐，不重新生成素材。

当前二次元前景已更新为屋顶观星者版本，素材与追加编辑提示词见 [ART-STUDY-04.md](ART-STUDY-04.md)。下文记录 V4 历史素材；新图使用运行时轮廓裁切合成。

## 共用提示词

```text
Use case: stylized-concept. Generate ONLY a website rooftop FOREGROUND asset, wide 3:1 horizontal strip. Composition: viewer standing on a residential rooftop, human eye-level perspective, small rooftop stairwell room occupies LEFT quarter, sloping roof peak at 15% from top; its left wall is cropped by LEFT image boundary. A low parapet extends across entire BOTTOM to RIGHT edge, top edge descends gently rightwards. Floor reaches bottom edge. Small warm open doorway, one notebook, a cup and one tiny potted plant. Upper area outside architecture must be genuine transparent alpha, not a drawn checkerboard. This asset will be composited over an EXISTING night sky: DO NOT generate sky, stars, moon, clouds, distant landscape, text, labels, frames, people or UI. Architecture is dark desaturated blue, small amber door glow, visibly illustrated, not photorealistic. Fill strip efficiently with roof geometry, no large empty upper canvas. STYLE: 
```

## 二次元动画

素材：[roof-anime-v4.png](assets/roof-anime-v4.png)

追加风格提示词：

```text
Japanese 2D anime background art, clean fine ink contours, painted cel-shaded blue shadows, warm hand-painted light, elegant architectural simplification, no photographic surfaces.
```

## 极简色块

素材：[roof-minimal-v4.png](assets/roof-minimal-v4.png)

追加风格提示词：

```text
Extremely minimalist graphic illustration, large flat midnight-blue geometric shapes, only 5 muted colors, no outlines, no texture, no gradients, one small warm rectangular doorway, refined architectural silhouette.
```

## 纸雕绘本

素材：[roof-paper-v4.png](assets/roof-paper-v4.png)

追加风格提示词：

```text
Layered cut-paper storybook illustration, tactile dark blue colored paper, softly irregular cut edges, very subtle layer shadows, poetic handmade miniature architecture, restrained paper grain, no realistic masonry.
```

## 像素夜景

素材：[roof-pixel-v4.png](assets/roof-pixel-v4.png)

追加风格提示词：

```text
Beautiful deliberate pixel art, 16-bit adventure game background aesthetic, crisp square pixels, limited midnight-blue palette, amber doorway, carefully clustered pixel shading, no smooth gradients or photographic texture.
```

