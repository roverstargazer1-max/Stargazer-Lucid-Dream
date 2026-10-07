# 几何图形透视校正

作者提供带竖直中心轴的参考图，指出上一版透视不正确。本次以该图的上下尖点与四个中间顶点拟合新的立体投影，更新先前的面片纹理映射。

## 修正

- 上下尖点位于同一竖直中心轴，转动时相对于图形保持固定。
- 中间顶点处于同一立体平面，绕轴转动；投影包含远近缩放。
- 从原 PNG 上方左侧棱线取一段无交叉的纹理，按十二条实际棱线的端点逐条映射。每条线仅绘制一次，后侧棱线较淡，不再把整张图中的交叉线拉伸进其他面片，不新增 SVG。
- 保留 13 秒一圈与 4.8 秒整体轻跳。轻过渡模式显示校正后的固定参考角度；画布不可用时沿用原 PNG。
- 动画仍沿用现有星空循环，最多每秒绘制 30 次；静态模式仅在切换或尺寸变化时重绘。

## 验证

26 项测试通过。几何检查覆盖参考角度的位置、竖直轴固定、整圈回位、远近缩放、前后深度交换，以及整圈内不压成一条线、不超出画布。

预览和正式主题构建通过。浏览器放大核对参考角度、四分之一圈及半圈，完整棱线连接正常。桌面与手机的完整动效及轻过渡模式均使用校正后的透视，画布位于视口内，控制台无运行错误。

截图：[参考角度](evidence/polyhedron-perspective-20261008/reference-angle.png)、[四分之一圈](evidence/polyhedron-perspective-20261008/quarter-turn.png)、[半圈](evidence/polyhedron-perspective-20261008/half-turn.png)、[桌面完整动效](evidence/polyhedron-perspective-20261008/desktop-full.png)、[桌面轻过渡](evidence/polyhedron-perspective-20261008/desktop-soft.png)、[手机完整动效](evidence/polyhedron-perspective-20261008/mobile-full.png)、[手机轻过渡](evidence/polyhedron-perspective-20261008/mobile-soft.png)。

本地预览：<http://127.0.0.1:4175/>。
