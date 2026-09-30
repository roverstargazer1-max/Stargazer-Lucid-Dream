# 第四轮：白灰文字与屋顶观星者

日期：2026-09-09。原型分支：`codex/prototype-starfield`。本轮按作者补充反馈收敛整体画面，未进行正式主题迁移或发布。

## 文字对照

底部展开“画面试验 04”切换三种文字配色，独立于天空配色、标题显露与微动开关。默认素白。

| 参数 | 方案 | 主文字 | 意图 |
| --- | --- | --- | --- |
| `type=white` | 素白 | `#f0f1f2` | 最中性、清晰，配白灰层级 |
| `type=mist` | 雾灰 | `#d3d7db` | 更柔和，降低字标与星空的竞争 |
| `type=cool` | 冷白 | `#e1ebf4` | 极轻冷色，与墨蓝夜空呼应 |

字标、星星标题、导航、预览、关联说明和控件去掉棕黄文字。C 阅读层改为中性浅灰纸面与深灰正文，维持阅读对比；不在浅色纸上使用白字。左上中文站名已删除，站点无障碍名称及阅读页中的名称仍保留。

## 观星者与素材

内置 image_gen 对已有二次元屋顶进行编辑，没有生成新的星空。人物站在矮墙内侧，背向观众略向右侧仰望，双手在胸前拿着茶杯；地板上的杯子被移除，书本和盆栽保留。人物是屋顶画面的一部分，不引入角色操控。

项目素材：[roof-stargazer-v9.png](assets/roof-stargazer-v9.png)。旧屋顶素材保留供历史复核。新图与人物一起按已有小比例合成；转向淡出、向前退场和返回屋顶行为继续共用。

两次内置生图均未返回真实 alpha，而把棋盘背景画进 RGB 图。采用第一张人物构图，在 `art.js` 中用描摹轮廓的 Canvas 裁切合成，边缘再向内收一像素，避开棋盘污染。原始素材本身仍是 RGB，不能直接作为透明 PNG 使用；实际网页只绘制轮廓内的屋顶和人物。

### 使用的编辑提示词

```text
EDIT TARGET: the supplied transparent anime rooftop foreground asset. Make a precise localized edit, preserve its wide 3:1 aspect ratio and existing architecture placement, scale, perspective, outline, colors and floor, with genuine transparent alpha above roof and parapet. Add ONE small young adult stargazer in the same Japanese 2D anime background/cel-painted style, standing on the floor just inside the parapet immediately to the right of the doorway/plant, approximately x=720 on this 2048px-wide reference. Full body, anatomically natural adult proportions scaled to this doorway, roughly 280px tall in the reference coordinates, feet touching the floor at y=585. Seen from behind in gentle three-quarter profile, head visibly tilted up toward the open sky on the upper right; relaxed pose, dark hair, muted slate-gray casual jacket and trousers, subtle cool rim light and warm doorway edge light. They hold the EXISTING pale ceramic tea mug near chest level with both hands, clearly readable small mug silhouette. Remove the mug currently on the floor beside the notebook and plant entirely and naturally restore the floor beneath. There must be exactly ONE mug, in the person's hands. Keep the notebook and plant on the floor. Do not add any other people or props. Do not generate a sky, stars, clouds, moon, text, frame, checkerboard or background color. Keep the entire region beyond the architecture and figure truly transparent. Preserve cropped left architecture boundary and floor reaching the full bottom edge. Person should be a quiet part of the small rooftop scene rather than a character portrait or oversized focal point. Deliver edited complete foreground only.
```

第二次尝试的提示词（未采用输出）：

```text
Remove ONLY the gray and white checkerboard backdrop from this image and replace it with genuinely transparent alpha, export RGBA PNG. The checkerboard pattern currently is incorrectly baked into the image; it must not appear in the result. Preserve the anime rooftop architecture, full person holding a mug and looking up, every outline, the plant and book and floor unchanged. Do not crop or move anything. Maintain the same 3:1 dimensions. Entire open region outside building, parapet and person should be fully transparent. No sky, no checkerboard, no solid background.
```

## 待反馈

文字配色的最终选择、人物大小和姿态继续等待作者体验。当前素材边界针对固定构图描摹，换图时需要同步调整；正式字体跨设备一致性与真实触屏手感仍待处理。主设计文档 R1–R6 的待整体复核状态不变。
