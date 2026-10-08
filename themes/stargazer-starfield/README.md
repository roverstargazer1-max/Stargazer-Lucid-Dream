# Stargazer Starfield 个人主题

更新日期：2026-10-08。位于 `codex/starfield-personal` 分支的独立 Hexo 主题，采用 V20 窗边与穹顶场景、冷色复古阅读窗口、B「视线聚焦」开合和点星后轻雾显字。当前观测面板与宝蓝／深蓝配色已接入真实文章页面。使用全部真实文章；原型中的调试面板、模拟文章、布局导出和方案切换留在实验目录。旧 Kira 主题及配置保留，默认生产构建仍选择 Kira。

本主题是 V20 设计成果接入真实内容后的实现，和 [4173 模拟文章原型](../hexo-theme-kira/prototypes/starfield/README.md)分别维护。最近的阅读与观测界面调整发生在本主题中，预览最新效果请使用 4175。完整入口关系见 [项目 README](../../README.md)。

## 启动与构建

仓库根目录使用 Node.js `22.19.0`、npm `10.9.3`：

```bash
npm ci
npm run start:starfield
```

写完 Markdown，执行 `npm run start:starfield`，自动保存身份、原链接、描述和新星位置，并启动 [http://127.0.0.1:4175/](http://127.0.0.1:4175/)。服务已运行时执行 `npm run preview:starfield` 后刷新页面；静态服务不监听文件，也不会自动打开浏览器。预览位于 `.preview/stargazer/`。`prepare:starfield` 是同一准备与生成流程的别名；`serve:starfield` 仅提供已有静态文件。

预览保存的文章 Front-matter 和 `source/_data/starry-layout.json` 要与正文一起提交。`npm run build:starfield` 读取已保存数据，生成用于托管的 `public/`，不自动为新文章分配星位，也不执行远程部署。Netlify 默认生产构建仍是旧 Kira，新版只配置在 Deploy Preview；发布与恢复见 [操作指南](../../docs/operations/starfield-blog.md)。

## 内容与配置

文章、页面和图片共享根目录的 `source/`。主题场景与首页重点文章设置在本目录 `_config.yml`；预览和生产输出选择在根目录 `_config.stargazer-preview.yml`、`_config.stargazer.yml`。友链继续读取 `_config.hexo-theme-kira.yml`。

文章关系填写在 Front-matter 的 `related` 中，引用文件名而非标题，不含 `.md`。每对文章只配置一次，自动双向；理由选填，未写理由仍保留文末跳转入口。修改文件名时同步修改引用；修改标题不影响引用、旧链接或星位。

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 两篇文章的关联理由
```

`starry_excerpt` 用于描述元信息，点星后不展示长摘要。已有自动身份与星位由准备流程维护，不需要作者填写编号。更完整的写作、可选配置、静态地址与旧版切回步骤见 [使用指南](../../docs/operations/starfield-blog.md)。阅读开合的决定与验证见 [2026-10-02 落地记录](../../.scratch/starry-blog/reader-rollout-20261002.md)，当前窗口配色见 [2026-10-08 记录](../../.scratch/starry-blog/evidence/reader-palette-20261008/README.md)。

## 观测面板实现

选星后的观测面板采用 `assets/详情弹窗/详细工程文件/` 的原始素材。箭头、菱形、刻度、括号、斜线方框、CALL／H- 和 READ 折线从 `补充图形.png` 原样裁切，坐标记录在 `supplement-crops/crops.json`；数字和其余技术字母采用 `assets/zmd科技小字-修订版7-透明字形/透明PNG/` 的现成字形，构建时自动发布，无须另装字体。五行年份始终围绕文章发布年排列，月日显示为 `MM.DD`，READ 打开对应正文。星空中的可见标题只在文章星旁显示；当次访问读到文末后由白变灰。右下几何图形自动旋转、轻跳，轻过渡模式静止。实现与截图见 [观测面板记录](../../.scratch/starry-blog/observation-ui-rollout-20261007.md)及[补充图形替换记录](../../.scratch/starry-blog/supplement-ui-rollout-20261007.md)。

右下图形按作者的中心轴参考校正透视，上下尖点共用竖直轴，中间顶点绕轴作三维转动并按远近缩放。棱线采用原 PNG 干净线段的像素纹理，逐条连接投影顶点，后侧线较淡；不重画 SVG。完整动效模式每 13 秒一圈，整体轻跳沿用原节奏；轻过渡模式固定在校正后的参考角度，不支持绘制时保留原 PNG。动画共用星空现有的绘制循环，每秒最多更新 30 次，静态模式仅在切换或尺寸改变时重绘。

## 性能与素材维护

2026-10-08 已按本地真实页面测量进行优化，记录见 [性能对照](../../.scratch/starry-blog/evidence/performance-20261008/README.md)。窗边与正文阅读原本静止的 Canvas 保留已绘制帧，穿窗、推进、探索及 CSS 微动沿用原节奏；尺寸、过渡和可见性变化会重新绘制。阅读进度由滚动、窗口尺寸和正文布局变化更新，晚到图片、字体与播放器展开仍会重新计算。

三张场景图发布无损 WebP，分辨率与浏览器绘制像素保持一致；原 PNG 留在 V20 原型素材目录。人物剪影继续用 PNG，清理完全透明区域的冗余 RGB 后保存在 `source/images/observation/silhouette.png`，由主题直接发布，原始工程素材仍在 `assets/`。若替换剪影，需同步重新准备此发布副本并做浏览器像素对照；其余观测素材和字形仍由原生成器原样发布。普通预览及托管构建直接使用已保存的优化图片，无需新增图像处理依赖。

剪影在完整动效模式下原地步行。`source/images/observation/silhouette-walk-atlas.png` 保存作者参考录屏中 0.667～1.233 秒的 17 个姿势帧，每帧 280 × 390，按六列排列。离线生成器 `source/js/starfield/silhouette-frames.js` 剔除背景及录屏界面，按参考关节和腿长补出连续动作；完整鞋子裁片统一旋转，支撑脚的鞋底高度固定。躯干与大腿之间用连续腰部曲线衔接，整个人物统一处理轮廓后，保存为 `silhouette-walk-frames.png`：68 帧、六列、1680 × 4680 像素。播放模块 `silhouette-walker.js` 只读取完整姿势，不在播放时重新处理图像。图集按 120 Hz 取样，播放沿用屏幕刷新，在本机 60 Hz 浏览器测得约 60 帧／秒；一轮仍约 0.567 秒，头部水平位置固定。轻过渡和低性能模式显示原 PNG；阅读和面板隐藏时停止。参考提取见[步行重做记录](../../.scratch/starry-blog/silhouette-walk-redo-20261008.md)，连续动作见[补帧记录](../../.scratch/starry-blog/silhouette-walk-smooth-20261008.md)，当前清晰度、腰部衔接及重新生成方法见[轮廓修复记录](../../.scratch/starry-blog/silhouette-walk-edge-20261008.md)。更换人物时需同步准备参考帧、校准关节与鞋子裁片，并重新生成完整姿势 PNG。
