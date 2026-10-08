# 人物剪影清晰度与腰部衔接修复

日期：2026-10-08。作者认可补帧后的帧率，但指出上半身模糊、下半身清晰，连接处有明显像素断层。本次修复个人主题及 4175 本地预览，保留原步速、原地位置和连续动作；最终视觉尚待作者验收。

## 原因及修复

实际绘制器在隔离页面中仍然复现问题。检查前按可能性排列三个原因：参考录屏带来的上身软边与新生成腿部的抗锯齿不同；平切腰部与腿部边界没有连续衔接；最终缩放可能放大这种差异。

先只统一完整人物的轮廓处理，上下身边缘差异消失，但腰部依然有五像素的水平跳变。再用连续曲线连接躯干和大腿的外侧轮廓，匹配两端方向，跳变降到一像素。相同的最终页面缩放下，修复结果仍通过检查，缩放不是主要原因。

- `silhouette-frames.js` 从原录屏姿势、关节及鞋子裁片补出每轮 68 帧，先构成连续腰部和完整人物，再统一处理整个人物的轮廓与抗锯齿，去掉录屏遗留的模糊边缘。
- 完整姿势预先生成并保存为 `silhouette-walk-frames.png`，1680 × 4680 像素、六列、每帧 280 × 390。播放时只读取完整姿势裁片，避免首次播放时重新处理图像。
- 一轮仍为 17 / 30 秒，约 0.567 秒，保持 120 Hz 的姿势取样密度，并随屏幕刷新播放。原图静态回退、暂停规则及面板排布沿用。
- 原始工程 PNG、原录屏及参考姿势图集保留。

## 回归验证

隔离检查调用真实 `createSilhouetteWalker`，在固定的 68 个时刻绘制同一完整周期。比较上身与小腿的半透明边缘面积／实心边界像素数，并检查腰部逐行轮廓的横向变化。边缘指标是清晰度差异的代理，不代替视觉检查。测试要求上下身指标差不超过 0.6，腰部相邻行跳变不超过三像素。

| 状态 | 上身边缘指标 | 小腿边缘指标 | 两者差值 | 腰部最大跳变 | 结果 |
| --- | ---: | ---: | ---: | ---: | --- |
| 修复前 | 6.831 | 2.846 | 3.985 | 5 px | 失败 |
| 仅统一轮廓 | 2.823 | 2.766 | 0.057 | 5 px | 失败 |
| 完整修复并预存图集 | 2.750 | 2.716 | 0.033 | 1 px | 通过 |

修复前对照重复失败，当前绘制器通过。数据见[修复前](evidence/silhouette-walk-edge-20261008/before-check.json)、[仅处理轮廓](evidence/silhouette-walk-edge-20261008/contour-only-check.json)、[完整修复](evidence/silhouette-walk-edge-20261008/after-check.json)。调试回归脚本与修复前夹具仅保留在本证据目录中，不接入产品播放。

在仓库根目录、4175 预览已启动时，可复现当前检查及失败对照；脚本使用本机已配置的 Playwright 与 Chromium：

```bash
node .scratch/starry-blog/evidence/silhouette-walk-edge-20261008/check-render.mjs
node .scratch/starry-blog/evidence/silhouette-walk-edge-20261008/check-render.mjs .scratch/starry-blog/evidence/silhouette-walk-edge-20261008/before-renderer.js /tmp/silhouette-before-check.json silhouette-walk-atlas.png
```

真实页面中，桌面 1440 × 900、手机 390 × 844、横屏 844 × 390 的测量分别约 60.0、60.3、57.1 帧／秒。人物单次绘制平均约 0.013 ms；头部水平变化小于 0.16 CSS px，全部姿势位于画布内部，控制台没有运行错误。三种尺寸均验证轻过渡停止并保留原静图、恢复后继续、页面隐藏及正文打开时停止。见[页面测量](evidence/silhouette-walk-edge-20261008/checks.json)。

68 个完整姿势均不同，边缘没有裁切。生成器约 0.5～0.68 秒的处理发生在素材准备阶段，实际播放没有这项处理；[生成器检查](evidence/silhouette-walk-edge-20261008/frame-checks.json)中的 `prepMs` 为离线生成耗时。系统减少动态、低性能、Canvas 不可用、完整姿势 PNG 加载失败均正确显示原静图并停止绘制，见[回退检查](evidence/silhouette-walk-edge-20261008/fallback-checks.json)。

Node 22.19.0、npm 10.9.3 下，26 项现有检查全部通过。新版预览和正式主题构建各生成 150 个文件；`git diff --check` 通过。文章、星位及原始素材没有修改；未推送或部署。

## 视觉证据

[腰部放大对照](evidence/silhouette-walk-edge-20261008/waist-comparison.png)使用同一页面、同一动作时刻和同一裁切，左右均等比放大三倍；左侧为修复前，右侧为当前结果。关键姿势：[迈步](evidence/silhouette-walk-edge-20261008/stride.png)、[后脚抬起](evidence/silhouette-walk-edge-20261008/back-lift.png)、[换脚](evidence/silhouette-walk-edge-20261008/passing.png)，完整周期取样见[姿势对照](evidence/silhouette-walk-edge-20261008/poses-sheet.png)。

[60 帧预览视频](evidence/silhouette-walk-edge-20261008/walk-preview.mp4)由同一页面绘制器按 60 Hz 固定时刻取样后导出，四轮共约 2.267 秒；已检查编码帧率及首帧显示。实时播放测量见前述页面测量，视频不作为实时帧率证明。整页截图：[桌面](evidence/silhouette-walk-edge-20261008/desktop.png)、[手机](evidence/silhouette-walk-edge-20261008/mobile.png)、[横屏](evidence/silhouette-walk-edge-20261008/landscape.png)。

## 重新生成完整姿势

修改人物或参考姿势时，先更新原始参考图集，并校准生成器中的髋、膝、踝、鞋子及腰部参数。在本地预览页面控制台生成新的完整 PNG：

```javascript
const { createSilhouetteFrames } = await import('/js/starfield/silhouette-frames.js');
const reference = new Image();
reference.src = '/images/observation/silhouette-walk-atlas.png';
await reference.decode();
const { atlas } = createSilhouetteFrames(reference);
const download = document.createElement('a');
download.href = atlas.toDataURL('image/png');
download.download = 'silhouette-walk-frames.png';
download.click();
```

将下载的 PNG 保存到 `themes/stargazer-starfield/source/images/observation/silhouette-walk-frames.png`，重新生成预览后检查整个周期的腰部、轮廓和支撑脚。普通预览及构建直接使用已经保存的完整姿势 PNG。
