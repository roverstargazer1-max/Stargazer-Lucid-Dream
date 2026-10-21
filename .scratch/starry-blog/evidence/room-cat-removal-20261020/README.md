# 主页小猫挂件移除

日期：2026-10-20。用户要求只移除截图所指小猫，其余保持不变，并替换主页原图。

替换文件：`source/image/starfield/room-poster-detail-v20.webp`。保留原路径和 1672 × 941 尺寸；手机使用独立的 `room-portrait-v11.webp`，原本没有此挂件，无须修改。V20 历史原型素材保留。

## 编辑方式

使用内置 `image_gen`，从当前运行时原图裁出 `(8, 405, 260, 260)` 的台灯区域。移除小猫、挂链、连接环及尾部小标签，补回墙面和灯罩。生成结果仅通过局部遮罩合入原图，以边界颜色校正衔接，保存为无损 WebP；没有整图重绘或有损重编码。

最终提示词：

```text
Use case: precise-object-edit. Edit target: the provided square crop of an existing painted anime bedroom homepage illustration. Remove ONLY the small pink/cream cat keychain hanging beside the black desk lamp, including its hanging chain, loops, attachment clasp and tiny tail/tag, so the lamp has no hanging charm. Seamlessly reconstruct the dark charcoal lamp shade and warm brown/ochre wall and illumination gradients behind this hanging keychain in exactly the same soft painterly brush texture. Keep the original crop boundaries and camera framing EXACTLY unchanged. Preserve the lamp arm, lamp pivot, horizontal mounting peg, the entire lamp shape and its golden illuminated rim, wall light/shadow geometry, bottom pencils, top poster sliver, palette, textures, and all other pixels as closely as possible. No replacement object, no new decor, no text, no global redraw or color/exposure change. This is a surgical local object removal; everything apart from the hanging cat keychain remains identical. Return one square edited crop.
```

## 校验

- 改动 13,047 像素，占全图约 0.83%；修改边界为 `(23, 417)` 至 `(115, 645)`，遮罩外改动像素数为 **0**。完整统计见 [像素记录](pixel-summary.json)。
- 原文件 1,052,364 字节，替换后 1,048,394 字节。
- `npm run preview:starfield` 与 `npm run build` 均通过，两个主题完整生成；文章准备未修改任何原文。
- `node --test tests/room-entry.test.mjs`：3 项通过。
- 源图、本地预览、生产输出与预览 HTTP 响应的 SHA-256 一致：`d79d9a54cf3480c095e6e0eb8ffdcde320b89a9e6359d8d4b267a5a5d2d77268`。
- 原尺寸局部与完整图已目视检查；本地浏览器主页正常加载。仅本地替换与构建，未线上发布。

本目录的原图备份、生成裁片、遮罩及前后对比图为忽略的本地校验素材；最终运行时图片保存在上述源文件。
