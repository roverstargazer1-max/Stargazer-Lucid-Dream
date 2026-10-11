# Stargazer Starfield 个人主题

更新日期：2026-10-11。位于 `codex/starfield-personal` 分支的独立 Hexo 主题，采用 V20 窗边与穹顶场景、日期观测面板和蓝色星月文章长页，保留 B「视线聚焦」开合和点星后轻雾显字。正文标题使用霞鹜漫黑，日期署名位于标题下方，底部人物随阅读滚动行走。使用全部真实文章；原型中的调试面板、模拟文章、布局导出和方案切换留在实验目录。旧 Kira 主题及配置保留，统一构建以新版为根主页、旧版为 `/legacy/`，两边提供「旧版 / 新版」切换入口。

本主题是 V20 设计成果接入真实内容后的实现，和 [4173 模拟文章原型](../hexo-theme-kira/prototypes/starfield/README.md)分别维护。最近的阅读与观测界面调整发生在本主题中，预览最新效果请使用 4175。完整入口关系见 [项目 README](../../README.md)。

## 启动与构建

仓库根目录使用 Node.js `22.19.0`、npm `10.9.3`：

```bash
npm ci
npm run start:starfield
```

写完 Markdown，执行 `npm run start:starfield`，自动保存身份、原链接、描述和新星位置，并启动 [http://127.0.0.1:4175/](http://127.0.0.1:4175/)。服务已运行时执行 `npm run preview:starfield` 后刷新页面；静态服务不监听文件，也不会自动打开浏览器。双主题预览位于 `.preview/stargazer/`，旧版在其 `legacy/` 下；两边共享一份文章。`prepare:starfield` 是同一准备与生成流程的别名；`serve:starfield` 仅提供已有静态文件。

预览保存的文章 Front-matter 和 `source/_data/starry-layout.json` 与正文一起提交。`npm run build`、`npm run build:starfield` 和 `npm run netlify` 都自动准备新文章并生成双主题 `public/`；只填写原有字段也可构建。托管端新增身份可复现，生成文件不会自动写回 GitHub。正式与 Deploy Preview 使用相同流程；这些命令只构建本地文件。发布、平台生产分支核对与旧版设为默认的方法见 [操作指南](../../docs/operations/starfield-blog.md)。

## 内容与配置

默认动效采用镜头推进，窗边和星空界面均不显示方式切换按钮。轻过渡逻辑保留；以后只需把本主题 `_config.yml` 中的 `scene.motion` 从 `full` 改为 `soft`，重新生成预览即可切换。`?motion=soft`／`?motion=full` 保留为开发检查入口。

文章、页面和图片共享根目录的 `source/`。主题场景与首页重点文章设置在本目录 `_config.yml`；常规预览和生产输出由根目录 `build-blog.cjs` 管理；`_config.stargazer-preview.yml`、`_config.stargazer.yml` 只作低层单主题覆盖。根入口选择在 `_config.yml` 的 `blog.default_theme`。友链继续读取 `_config.hexo-theme-kira.yml`。

在仓库根目录执行 `npx hexo new post "文章标题"`，会按 [文章模板](../../scaffolds/post.md) 预填常用字段和中文说明；根 `scripts/post-scaffold.js` 保留 Hexo 创建时会清除的 YAML 注释。封面与语义关联由作者选填，空值也可发布；`star` 默认普通星、非孤立。标题和日期在新建时填写，文章身份、原链接、摘要和星位在预览/构建时保存。

文章关系填写在 Front-matter 的 `related` 中，引用文件名而非标题，不含 `.md`。每对文章只配置一次，自动双向；理由选填，未写理由仍保留文末跳转入口。修改文件名时同步修改引用；修改标题不影响引用、旧链接或星位。

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 两篇文章的关联理由
```

`starry_excerpt` 用于描述元信息，点星后不展示长摘要。新文章默认 `starry_excerpt_generated: true`，从正文提取描述；要手写，改为 `false` 再填写摘要。封面用于旧版列表/文章页及新版分享图片元信息，不替换新版正文底图。已有自动身份与星位由准备流程维护，不需要作者填写编号。完整字段、静态地址与旧版切回步骤见 [使用指南](../../docs/operations/starfield-blog.md)。当前文章视觉以 [原图文章页](../../.scratch/starry-blog/evidence/article-page-20261009/README.md)、[标题字体](../../.scratch/starry-blog/evidence/article-title-font-20261010/README.md)及[日期署名位置](../../.scratch/starry-blog/evidence/article-meta-under-title-20261009/README.md)为准；[2026-10-02 阅读开合](../../.scratch/starry-blog/archive/implementation/reader-rollout-20261002.md)和[2026-10-08 窗口配色](../../.scratch/starry-blog/evidence/reader-palette-20261008/README.md)保留阶段记录。

## 代码职责与验证

下表未注明「根」的路径均相对本主题：运行代码在 `source/js/starfield/`，真实内容生成在 `scripts/`、`lib/`，离线素材工具在 `tools/`。根 `tests/` 维护业务与生命周期回归，浏览器性能、像素对照及其环境记录在 [工程与性能核查](../../.scratch/starry-blog/evidence/engineering-20261011/README.md)。

| 边界 | 职责 |
| --- | --- |
| `app.js` | 文章选择、阅读、历史导航与各控制器的编排 |
| `dome.js` / `camera-bounds.js` / `navigation.js` | 投影、视角边界和路径几何；不写 DOM |
| `painted.js` / `dome-renderer.js` / `interactive-clouds.js` | 原像素素材绘制、背景缓存、云绘制与命中；`painted.js` 保留房间入口兼容导出 |
| `room-scene.js` / `motion.js` | 房间过场、阅读开合及既有时间线 |
| `edge-guide.js` / `observation.js` | 导向按钮和观测面板呈现；不重新定义文章关系 |
| `audio.js` | 文章播放器的素材加载、容器初始化及失败恢复；按已安装 MetingJS 的选项契约保持界面 |
| 根 `scaffolds/post.md` / `scripts/post-scaffold.js` | 新文章字段默认值、示例及创建时的注释恢复 |
| 根 `prepare-starfield.cjs` | 保存文章身份、原链接、自动摘要与稳定星位 |
| 根 `build-blog.cjs` / `tools/install-build-output.cjs` | 双主题顺序构建和可回滚的输出安装 |
| 主题 `tools/preview-server.mjs` / 根 `tools/preview-http.mjs` | 本地服务入口和流式 HTTP 文件处理 |

## 观测面板实现

选星后的观测面板采用根 `assets/详情弹窗/详细工程文件/` 的原始素材。箭头、菱形、刻度、括号、斜线方框、CALL／H- 和 READ 折线从 `补充图形.png` 原样裁切，坐标记录在 `supplement-crops/crops.json`；数字和其余技术字母采用根 `assets/zmd科技小字-修订版7-透明字形/透明PNG/` 的现成字形，构建时自动发布，无须另装字体。五行年份始终围绕文章发布年排列，月日显示为 `MM.DD`，READ 打开对应正文。星空中的标题默认隐藏，鼠标靠近对应文章星时显露，离开后淡出；键盘聚焦和触屏点选也能显露标题。当次访问读到文末后由白变灰。Logo2 与返回／回到窗边按钮直接使用根 `assets/代码程序素材/` 的原始 PNG。手机竖屏的模式组位于左下，返回与回到窗边位于右上，见[模式组位置](../../.scratch/starry-blog/evidence/mobile-mode-corner-20261009/README.md)；常驻测试说明和手势提示已移除，见[星空入口整理记录](../../.scratch/starry-blog/evidence/sky-ui-20261009/README.md)。右下几何图形自动旋转、轻跳，轻过渡模式静止。实现与截图见 [观测面板记录](../../.scratch/starry-blog/archive/implementation/observation-ui-rollout-20261007.md)及[补充图形替换记录](../../.scratch/starry-blog/archive/implementation/supplement-ui-rollout-20261007.md)。

右下图形按作者的中心轴参考校正透视，上下尖点共用竖直轴，中间顶点绕轴作三维转动并按远近缩放。棱线采用原 PNG 干净线段的像素纹理，逐条连接投影顶点，后侧线较淡；不重画 SVG。完整动效模式每 13 秒一圈，整体轻跳沿用原节奏；轻过渡模式固定在校正后的参考角度，不支持绘制时保留原 PNG。动画共用星空现有的绘制循环，每秒最多更新 30 次，静态模式仅在切换或尺寸改变时重绘。

## 性能与素材维护

2026-10-11 已完成重复投影/固定几何复用、云 alpha 命中数据与投影缓存、导向按钮与主题链接更新去重，以及文章播放器的容器初始化重用。关闭阅读或历史换篇时会暂停离开的文章音乐。房间控制已分离到 `room-scene.js`，原像素、镜头轨迹与时长沿用。68 项自动检查、双主题构建、432 组背景和 96 组云像素对照通过；具体收益、串行压力复测与设备限制见 [工程与性能核查](../../.scratch/starry-blog/evidence/engineering-20261011/README.md)。

首页从首屏开始使用最终窗口遮罩，先显示稳定房间前景，窗外以深蓝底承接，实时星空准备后在 0.45 秒内淡入；主模块加载失败、WebGL 不可用或关闭 JavaScript 时仍提供可读文章清单，见 [首屏窗景记录](../../.scratch/starry-blog/evidence/startup-window-20261010/README.md)。三朵互动云读取原算法的 PNG 像素缓存，完整步行动作图集使用像素一致的无损 WebP（源 PNG 保留）；Logo、图标与人物静图沿用。缓存生成与像素复测方法见 [2026-10-09 性能记录](../../.scratch/starry-blog/evidence/performance-20261009/README.md)。

默认 `scene.motion: full`，房间过场额外模糊为 `scene.passage_blur: false`；可以在主题配置中设为 `true` 恢复。持续掉帧会触发现有画质预算，镜头停稳后再调整主画布精度。完整策略及省电环境的首次峰值见 [2026-10-10 过场记录](../../.scratch/starry-blog/evidence/power-transitions-20261010/README.md)。

2026-10-08 已按本地真实页面测量进行优化，记录见 [性能对照](../../.scratch/starry-blog/evidence/performance-20261008/README.md)。窗边与正文阅读原本静止的 Canvas 保留已绘制帧，穿窗、推进、探索及 CSS 微动沿用原节奏；尺寸、过渡和可见性变化会重新绘制。阅读进度由滚动、窗口尺寸和正文布局变化更新，晚到图片、字体与播放器展开仍会重新计算。

三张场景图发布无损 WebP，分辨率与浏览器绘制像素保持一致；原 PNG 留在 V20 原型素材目录。人物剪影继续用 PNG，清理完全透明区域的冗余 RGB 后保存在 `source/images/observation/silhouette.png`，由主题直接发布，原始工程素材仍在 `assets/`。若替换剪影，需同步重新准备此发布副本并做浏览器像素对照；其余观测素材和字形仍由原生成器原样发布。普通预览及托管构建直接使用已保存的优化图片，无需新增图像处理依赖。

观测面板的人物在完整动效和预算允许时原地步行，轻过渡或关闭环境动效时显示原 PNG；面板隐藏时停止。正文底部的人物使用同一图集并绘成白色，滚动时行走，停止后保留当前姿势，再次滚动继续；减少动态时也保留同一图集的静止姿势，见[人物一致性记录](../../.scratch/starry-blog/evidence/reader-pose-consistency-20261009/README.md)。

`source/images/observation/silhouette-walk-atlas.png` 保存作者参考录屏中 0.667～1.233 秒的 17 个姿势帧，每帧 280 × 390，按六列排列。离线生成器 `source/js/starfield/silhouette-frames.js` 按参考关节和腿长补出连续动作，统一鞋子、支撑脚落点及躯干/大腿接缝，保存为 `silhouette-walk-frames.png`：68 帧、六列、1680 × 4680 像素。运行时读取 `source/images/optimized/silhouette-walk-frames.webp`，`silhouette-walker.js` 只播放已生成的完整姿势，一轮约 0.567 秒。参考提取见[步行重做记录](../../.scratch/starry-blog/archive/implementation/silhouette-walk-redo-20261008.md)，连续动作见[补帧记录](../../.scratch/starry-blog/archive/implementation/silhouette-walk-smooth-20261008.md)，轮廓与重新生成方法见[轮廓修复记录](../../.scratch/starry-blog/archive/implementation/silhouette-walk-edge-20261008.md)。更换人物时需同步准备参考帧、重新生成源 PNG 和无损 WebP，并核对浏览器像素。
