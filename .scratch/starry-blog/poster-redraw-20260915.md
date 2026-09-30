# 小海报重绘 — 2026-09-15

用户要求：按图一的清晰参考，重绘图二红框内的小海报。

- 工具：内置 image_gen，局部对象编辑；未使用 CLI。
- 基底：[原主页插画](../../themes/hexo-theme-kira/prototypes/starfield/assets/room-personal-v20.png)。
- 参考：[刺猬与双颈吉他](poster-redraw-20260915/reference-hedgehog.png)、[红框位置](poster-redraw-20260915/reference-location.png)。
- 结果：[主页插画重绘版](../../themes/hexo-theme-kira/prototypes/starfield/assets/room-poster-detail-v20.png)，1672×941。版本另存，桌面入口使用此版本。
- 视觉检查：刺猬轮廓、两支吉他琴颈、行星条纹与环、音符气泡可辨；画框位置、倾斜角度与房间构图保留。输出未带红色标记。
- 保真范围：生成图并非像素级无损局部替换。海报之外存在少量色值变化；检查区外每像素最大通道差的平均值约 5.13/255，99 分位 15/255，超过 24/255 的像素约 0.42%。不将其表述为区域外像素完全一致。
- 页面检查记录保存在 [browser-checks.json](poster-redraw-20260915/browser-checks.json)。

## 最终提示词

```text
Use case: precise-object-edit
Asset type: an existing wide painted illustration used as the homepage room scene.

Input roles, in the order supplied:
1. EDIT TARGET: the complete 1672 x 941 room illustration. This is the canvas to edit and return.
2. ART REFERENCE: the clearly drawn cartoon hedgehog playing a turquoise double-neck guitar above a purple ringed planet, with a musical-note speech bubble. Use this to accurately redraw the tiny wall poster.
3. LOCATION GUIDE ONLY: a magnified room detail with a red rectangle around the poster. The red annotation is not part of the artwork and must not appear in the output.

Primary request: Redraw ONLY the artwork INSIDE the small tilted beige-framed poster on the upper-left wall, below the clock and above the headphones, using reference 2. Make the poster's drawing noticeably clearer and more faithful: readable cream-colored hedgehog face with dark spines and a mint bow tie, two distinct turquoise guitar necks and white strings/neck details, a well-defined purple planet and elliptical ring, and a small musical-note speech bubble where it fits. Preserve the reference's simple hand-drawn outlines and flat color shapes; simplify its distressed speckle texture at this tiny print scale so the character and instrument remain legible.

Composition: fit the recognizable reference motif inside the EXISTING poster opening. Keep the original physical poster size, beige border, position, slight tilt, perspective and shadow exactly unchanged. Do not enlarge the poster. Match its existing subdued warm lamplight and dark blue/purple print background while improving local edge clarity and modest tonal separation.

Critical invariants: return the COMPLETE original wide room illustration, same 1672:941 aspect ratio and original framing. Make no edits outside the poster artwork. Keep the person, face, hair, headphones and markings, lamp, cat charm, wall clock, both neighboring handwritten notes and their text, desk, books and toy, chair contour, window mullions, cushions, blue sky, clouds and moon unchanged. These exact room/window contours must continue to match an existing website aperture mask. No new text, no red rectangle, no annotations, no before/after collage, no crop, no camera or lighting changes to the surrounding room. Highest available detail for this very local edit.
```
