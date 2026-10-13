# 阅读人物持续迈步与滚动位置

2026-10-12，作者反馈文章底部人物只平移、缺少自由迈步动作。按新要求，人物在阅读期间持续播放原步行动作，横向位置随文章阅读进度改变。本地预览已更新，未线上发布。

## 复现与原因

真实文章《活在真实天空下，做半个君子》的直接地址构成最小浏览器复现，无须先进入星空或点星。运行：

```powershell
node .scratch/starry-blog/evidence/reader-walking-20261012/check.mjs
node .scratch/starry-blog/evidence/reader-walking-20261012/check.mjs --soft
```

修复前两个命令均退出 1，明确报错 `character is frozen while reading`。默认完整动效下，停止滚动后的四次人物画布像素哈希完全相同；滚动位置仍从约 488px 移至 648px、849px。原结果保留在 [before-summary.json](before-summary.json)。

原因在 `app.js` 的实际阅读调用：只允许在阅读进度变化后的 180ms 内推进步行帧，停止滚动立即冻结；场景轻过渡使用的 `reducedMotion` 还会完全禁用阅读步行。低绘制档本身没有参与该调用的开关。

## 修复

删除滚动触发的短时步行期限和对应状态。阅读可见时持续推进原步行图集，位置仍由原 `--reading-fraction` 控制，停下滚动时人物在当前进度处继续迈步。场景轻过渡与阅读微动分开；实际系统减少动态效果、页面隐藏、文章关闭时仍暂停并保留同一姿势。原图集、人物尺寸、脚底基线、进度算法与当次阅读标记沿用。

此次新要求覆盖 2026-10-09 的“停止滚动时冻结姿势”，同一造型与尺寸要求仍保留。既有暂停／恢复单元检查仅更新其描述为“暂停与恢复”，仍验证暂停不换人、恢复不计入暂停时间。

## 验证

```powershell
node .scratch/starry-blog/evidence/reader-walking-20261012/check.mjs --all
node --test tests/silhouette-walker.test.mjs tests/reading-progress.test.mjs tests/reading-motion.test.mjs tests/render-budget.test.mjs
```

桌面 1440×1000、手机 390×844、轻过渡和强制低绘制档的静止阅读均采样到 4 个不同动作，滚动时采样到 3 个不同动作；停下滚动时位置保持，滚动后位置递增。系统减少动态效果下仅显示同一静态姿势，进度位置仍正常更新。所有情形关闭文章后人物画布停止换帧，无页面脚本异常。详见 [browser-summary.json](browser-summary.json)，截图保留本地。

18 项相关现有检查全部通过，双主题预览与生产构建完成，构建日志无 `ERROR`。修复没有加入临时调试日志或运行时探针；浏览器脚本作为可复现的回归依据保留在本目录。
