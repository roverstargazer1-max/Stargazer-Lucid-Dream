# 原始资料与图像索引

本页是查资料的入口；事实梳理见 [README](README.md)，提交与回放边界见 [versions](versions.md)。资料截止本地 `87a0401`。引用历史文档时保留其当时状态，用后续明确记录判断哪些被采用、替换、回退或仍未实现。

## 想法、访谈与工程范围

| 要查的内容 | 原始材料 | 使用边界 |
| --- | --- | --- |
| 起初目的、文章星、操作、内容关系、旧地址、参考 | [设计主文档](../../design/starry-blog.md)，尤其第1–7、10、11节 | 当前文件包含后续更新，不是09-08原始会话逐字稿 |
| 09-30主题化问题与答复 | [theme-discovery](../../../.scratch/starry-blog/archive/planning/theme-discovery.md) | 面向未来公开模板的历史范围 |
| 当时工程论证／规格／执行拆分 | [implementation-plan](../../../.scratch/starry-blog/archive/planning/theme-implementation-plan.md)、[spec](../../../.scratch/starry-blog/archive/planning/spec.md)、[ticket-plan](../../../.scratch/starry-blog/archive/planning/ticket-plan.md) | 规格就绪不等于实现／上线；不自动扩大当前个人任务 |
| 历史01–18工单、原讨论和状态 | [工单索引](../../../.scratch/starry-blog/archive/issues/README.md) | open／勾选状态照旧保存，不能按编号推定全做完 |
| 10-01重新确认个人范围 | [theme-planning](../../../.scratch/starry-blog/theme-planning.md)、[theme-production-plan](../../../.scratch/starry-blog/theme-production-plan.md) | V20、真实文章、一份内容、可切回；后来双主题又有明确更新 |
| 实际实施与验收边界 | [implementation-progress](../../../.scratch/starry-blog/implementation-progress.md) | 带日期段落中的默认Kira／输出量是历史状态 |
| 旧版配置、依赖与工作区留存 | [baselines目录](../../../.scratch/starry-blog/baselines/)、[旧版恢复指南](../../operations/legacy-blog-recovery.md) | 基线含部分原工作区未提交素材，不等于一个早期线上版本 |
| 10-10移动、删除与受保护快照 | [cleanup.md](../../../.scratch/starry-blog/archive/cleanup-20261010.md)、[cleanup.json](../../../.scratch/starry-blog/archive/cleanup-20261010.json) | JSON给旧路径→新路径；已删未跟踪日志不保证能恢复 |

## 原型研究文档与美术

原型代码统一从[原型目录](../../../themes/hexo-theme-kira/prototypes/starfield/)查阅。当前保留的 README 和代码是累计状态；要看某一提交当时的内容，使用 versions 页所列 Git 提交。

| 内容 | 原文／素材 | 备注 |
| --- | --- | --- |
| 摄影天空、程序天空、写实屋顶 | [ART-DIRECTION](../../../themes/hexo-theme-kira/prototypes/starfield/ART-DIRECTION.md)、[sky-reference-v2](../../../themes/hexo-theme-kira/prototypes/starfield/assets/sky-reference-v2.png)、[rooftop-v2](../../../themes/hexo-theme-kira/prototypes/starfield/assets/rooftop-v2.png) | 参考照片后来不再作运行天空；屋顶图不等于完整网页 |
| 四种屋顶风格 | [ROOF-STYLES](../../../themes/hexo-theme-kira/prototypes/starfield/ROOF-STYLES.md) | 内含素材、生成提示词与采用范围 |
| 静态色／微动／排版／观星者 | [ART01](../../../themes/hexo-theme-kira/prototypes/starfield/ART-STUDY-01.md)、[ART02](../../../themes/hexo-theme-kira/prototypes/starfield/ART-STUDY-02.md)、[ART03](../../../themes/hexo-theme-kira/prototypes/starfield/ART-STUDY-03.md)、[ART04](../../../themes/hexo-theme-kira/prototypes/starfield/ART-STUDY-04.md) | 观星者原图含棋盘RGB，网页以描摹轮廓裁切 |
| 路径与模拟增量 | [EXPLORATION-PATHS](../../../themes/hexo-theme-kira/prototypes/starfield/EXPLORATION-PATHS.md) | mock、内存，不是当前文章发布数据 |
| V11窗边、厚涂、手机竖版 | [ART06](../../../themes/hexo-theme-kira/prototypes/starfield/ART-STUDY-06.md)、[桌面原参考](../../../themes/hexo-theme-kira/prototypes/starfield/assets/room-reference-v11.png)、[手机竖版](../../../themes/hexo-theme-kira/prototypes/starfield/assets/room-portrait-v11.png)、[云景](../../../themes/hexo-theme-kira/prototypes/starfield/assets/painted-sky-v11.png) | 两段提示词正文是undefined，不能补写 |
| V12投影／V13云与山丘 | [DOME12](../../../themes/hexo-theme-kira/prototypes/starfield/DOME-STUDY-12.md)、[ATMOSPHERE13](../../../themes/hexo-theme-kira/prototypes/starfield/ATMOSPHERE-STUDY-13.md)、[天空研究索引](../../../.scratch/starry-blog/archive/prototypes/sky-studies/README.md) | 原截图与参考图分别看说明 |
| V14–V19动作与参数 | [14](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-14.md)、[15](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-15.md)、[16](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-16.md)、[17](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-17.md)、[18](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-18.md)、[19](../../../themes/hexo-theme-kira/prototypes/starfield/MOTION-STUDY-19.md) | 文档有具体反馈与时序，中间独立代码快照缺失 |
| V19真正冻结 | [冻结说明](../../../.scratch/starry-blog/archive/prototypes/v19/README.md)、[46文件清单](../../../.scratch/starry-blog/archive/prototypes/v19/baseline-v19-manifest.json) | 与当前URL中的v标记不同；原清单保留，不按新换行重写 |
| V20优化计划与验收 | [计划](../../../.scratch/starry-blog/archive/prototypes/v20/optimization-plan-v19.md)、[验收](../../../.scratch/starry-blog/archive/prototypes/v20/optimization-v20-acceptance.md)、[评审](../../../.scratch/starry-blog/archive/prototypes/v20/prototype-review.md)、[验收清单](../../../.scratch/starry-blog/archive/prototypes/v20/v20-verification-manifest.json) | 有视口、状态、缩放与对照；性能宿主调度问题未排除 |
| 09-15作者新房间图 | [替换记录](../../../.scratch/starry-blog/archive/artwork/room-artwork-update-20260915.md)、[原样复制图](../../../themes/hexo-theme-kira/prototypes/starfield/assets/room-personal-v20.png) | 手机未同步替换 |
| 海报细化 | [重绘记录](../../../.scratch/starry-blog/archive/artwork/poster-redraw-20260915.md)、[采用图](../../../themes/hexo-theme-kira/prototypes/starfield/assets/room-poster-detail-v20.png)、[参考定位](../../../.scratch/starry-blog/archive/artwork/poster-redraw-20260915/reference-location.png)、[刺猬参考](../../../.scratch/starry-blog/archive/artwork/poster-redraw-20260915/reference-hedgehog.png) | 提示词在记录内；网页窗内与图像本身的天空不同 |
| 09-16ZTMY整图重绘及回退 | [过程](../../../.scratch/starry-blog/archive/artwork/ztmy-detail-20260916.md)、[提示词](../../../.scratch/starry-blog/archive/artwork/ztmy-detail-20260916/prompt-01.txt)、[回退图](../../../themes/hexo-theme-kira/prototypes/starfield/assets/room-ztmy-detail-v20.png) | 实际1672×941；当前没采用 |

## 接入内容、视觉迭代与素材工程

| 内容 | 原记录／素材位置 |
| --- | --- |
| 一篇真实正文到稳定全量数据 | [03](../../../.scratch/starry-blog/evidence/03-first-real-article.md)、[04](../../../.scratch/starry-blog/evidence/04-stable-article-publication.md) |
| HTML、图片、音乐 | [05](../../../.scratch/starry-blog/evidence/05-real-content-media-compatibility.md) |
| 双向关系、临时夹具、理由 | [06](../../../.scratch/starry-blog/evidence/06-bidirectional-relations.md) |
| 历史、模式、返回、中断 | [07](../../../.scratch/starry-blog/evidence/07-modes-history-interruption.md) |
| 旧集合和地址 | [08](../../../.scratch/starry-blog/evidence/08-archives-legacy-collections.md) |
| 独立冷色试稿与正式复古窗口 | [试稿](../../../.scratch/starry-blog/archive/prototypes/cold-reading-20261002/README.md)、[正式整合](../../../.scratch/starry-blog/archive/implementation/reader-rollout-20261002.md)、[点星热区](../../../.scratch/starry-blog/archive/implementation/star-clicks-20261002.md) |
| B观测注记 | [正式落地](../../../.scratch/starry-blog/archive/implementation/sky-ui-rollout-20261003.md) |
| 作者观测原型与小图形 | [原素材目录](../../../assets/详情弹窗/)、[最初面板](../../../.scratch/starry-blog/archive/implementation/observation-ui-rollout-20261007.md)、[原图裁片和排布](../../../.scratch/starry-blog/archive/implementation/supplement-ui-rollout-20261007.md)、[裁片坐标](../../../assets/详情弹窗/详细工程文件/supplement-crops/crops.json) |
| 立体中心轴与透视参考 | [中心轴](../../../.scratch/starry-blog/archive/implementation/supplement-ui-rollout-20261007.md#几何图形中心轴)、[透视](../../../.scratch/starry-blog/archive/implementation/polyhedron-perspective-20261008.md) |
| STARLINK声波 | [原图窄条与动图记录](../../../.scratch/starry-blog/archive/implementation/starlink-call-20261008.md) |
| 步行首版、重做、补帧、轮廓 | [被否定首版](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-20261008.md)、[提取17帧](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-redo-20261008.md)、[68姿势补帧](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-smooth-20261008.md)、[轮廓连续](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-edge-20261008.md) |
| 宝蓝配色 | [天空](../../../.scratch/starry-blog/evidence/palette-20261007/README.md)、[复古阅读窗口](../../../.scratch/starry-blog/evidence/reader-palette-20261008/README.md) |
| 方位入口移除、观测下移、默认动效 | [移除](../../../.scratch/starry-blog/archive/implementation/remove-sky-controls-20261008.md)、[下移](../../../.scratch/starry-blog/archive/implementation/observation-panel-lower-20261008.md)、[默认完整](../../../.scratch/starry-blog/archive/implementation/default-motion-20261008.md) |
| 蓝色原图文章页 | [原素材目录](../../../assets/代码程序素材/文章页/)、[实现及进度](../../../.scratch/starry-blog/evidence/article-page-20261009/README.md) |
| Logo2、附近标题、右图标 | [Logo记录](../../../.scratch/starry-blog/evidence/logo2-20261009/README.md)、[入口整理](../../../.scratch/starry-blog/evidence/sky-ui-20261009/README.md) |
| 手机导航与模式角落 | [导航](../../../.scratch/starry-blog/evidence/mobile-navigation-20261009/README.md)、[模式位置](../../../.scratch/starry-blog/evidence/mobile-mode-corner-20261009/README.md) |
| 底栏、人物、标题、署名、字体 | [接缝](../../../.scratch/starry-blog/evidence/reader-seams-20261009/README.md)、[轨道边距](../../../.scratch/starry-blog/evidence/reader-walker-edge-20261009/README.md)、[姿势一致](../../../.scratch/starry-blog/evidence/reader-pose-consistency-20261009/README.md)、[标题上移](../../../.scratch/starry-blog/evidence/article-title-lift-20261009/README.md)、[署名](../../../.scratch/starry-blog/evidence/article-meta-under-title-20261009/README.md)、[字体](../../../.scratch/starry-blog/evidence/article-title-font-20261010/README.md) |
| 双主题、首屏、视角边界 | [双主题](../../../.scratch/starry-blog/evidence/dual-theme-20261010/README.md)、[首屏](../../../.scratch/starry-blog/evidence/startup-window-20261010/README.md)、[边界](../../../.scratch/starry-blog/evidence/camera-bounds-20261010/README.md) |
| 新文章的字段注释 | [模板](../../../scaffolds/post.md)、[Hexo新post事件](../../../scripts/post-scaffold.js)、[操作指南](../../operations/starfield-blog.md) |

上述资料中的截图、录像和详细JSON有相当一部分是本机忽略产物。文件链接在本工作区可查，不保证新克隆自带；选作本文插图的41张页面图片已在本目录保存。各记录是否“待作者查看”，按原记录判断，不替作者补验收。

## 性能记录

| 要查的问题 | 入口 | 保存内容与限制 |
| --- | --- | --- |
| 10-08图片体积／静止重复绘制 | [性能记录](../../../.scratch/starry-blog/evidence/performance-20261008/README.md) | 环境、前后数值、像素一致、有限堆检查与行为回归 |
| 10-09首屏文字闪现／隐藏资源／云初始化 | [首屏性能](../../../.scratch/starry-blog/evidence/performance-20261009/README.md) | 加载三轮、Lighthouse边界、实际插图出现时间，完整场景仍较慢 |
| 10-09穿窗与回屋而非稳态 | [过场专项](../../../.scratch/starry-blog/evidence/transitions-20261009/README.md) | 相同关键帧／时长；极限压力未通过样本保留 |
| 10-10省电呈现压力 | [省电记录](../../../.scratch/starry-blog/evidence/power-transitions-20261010/README.md) | 帧节奏预算、缓冲、关额外模糊；档位与首次峰值如实报告 |
| 10-11七项工程与性能整改 | [核查整改](../../../.scratch/starry-blog/evidence/engineering-20261011/README.md) | 原问题反馈循环、逐项提交、输出／像素／命中、播放器受控测试、串行复测与排除样本 |
| 测试产物何时退跟踪 | [保存约定](../../../.scratch/starry-blog/evidence/README.md) | 原始报告在本地，摘要／脚本跟踪；旧提交可能有原产物 |

这些是本地记录，不是本次重新测量。本文没有把不同轮次的资源数字、限制条件或帧间隔拼成一个总提升百分比。

## 检索图稿

状态与要求来源：[设计规格](../../../.scratch/starry-search/spec.md)。日期标注10-10，Git提交为10-11。下列图像仅为设计稿，不是功能截图。

| 图稿 | 变化／来源 |
| --- | --- |
| [v1底图](../../../assets/design/starry-search/star-map-base-v1.png) | 初稿；[提示词](../../../.scratch/starry-search/generation-prompt.txt) |
| [v2底图](../../../assets/design/starry-search/star-map-base-v2.png) | 作者指出没有真正留搜索区，新增顶部搜索带、圆图下移；[提示词](../../../.scratch/starry-search/generation-prompt-v2.txt) |
| [v3底图](../../../assets/design/starry-search/star-map-base-v3.png) | 加外围碎片、剪影、极简几何与星光，避免抢内容区；[提示词](../../../.scratch/starry-search/generation-prompt-v3.txt) |
| [v4底图](../../../assets/design/starry-search/star-map-base-v4.png) | 深蓝底、白圆形轮廓／网格／刻度；[提示词](../../../.scratch/starry-search/generation-prompt-v4.txt) |
| [独立细长搜索框](../../../assets/design/starry-search/search-frame-v1.png) | 透明PNG，切角与网点风格；规格内记录尺寸和叠放边界 |
| [A](../../../assets/design/starry-search/search-icons-v1/a-chamfered-lens.png)、[B](../../../assets/design/starry-search/search-icons-v1/b-broken-ring.png)、[C](../../../assets/design/starry-search/search-icons-v1/c-corner-frame.png)、[D](../../../assets/design/starry-search/search-icons-v1/d-star-lens.png) | 四款候选，未选定；[提示词集合](../../../.scratch/starry-search/generation-prompts-search-icons-v1.md) |

## 本次截图的取证与保留方式

历史原型用 `git archive` 导出原型目录，读取该副本的 JS、CSS、素材，外加一个只读静态HTTP包装。没有修改历史页面代码，也没有切换当前工作区。Kira与首次正式主题导出完整提交后用当前依赖生成；这一项环境差异保留在图注和JSON。截取稳定状态，不以截图证明动效流畅。

当前页面使用已有 `.preview/stargazer/`，对关键五个场景模块做源字节一致性检查；截图的首页HTML SHA-256在 `theme-reconstruction.json`。媒体、标题和控件均是实际页面，未调用生图补造历史画面。出现过采图脚本选择被旧星热区遮挡、固定定位页面body无尺寸导致等待失败的情况，调整采集逻辑后重跑；没有因此修补旧页面或改它的视觉。

41张图片包括11张原有证据复制、23张历史代码复现和7张当前本地截图。主文精选26幅，其余可用于进一步对照。以下清单由JSON生成，图片哈希／完整提交／query／视口／pageerror见对应JSON。原有截图日期来自目录与关联记录，不推定精确截图时刻。

| 图片 | 来源类别 | 实现／原来源 |
| --- | --- | --- |
| [v01-1.png](images/v01-1.png) | 历史代码复现（本次采集） | `940503f`，initial |
| [v01-2.png](images/v01-2.png) | 历史代码复现（本次采集） | `940503f`，initial |
| [v01-3.png](images/v01-3.png) | 历史代码复现（本次采集） | `940503f`，initial |
| [v01-reader.png](images/v01-reader.png) | 历史代码复现（本次采集） | `940503f`，mock-reader |
| [v02-1.png](images/v02-1.png) | 历史代码复现（本次采集） | `6586a83`，initial |
| [v03-1.png](images/v03-1.png) | 历史代码复现（本次采集） | `052d5ed`，initial |
| [v04-1.png](images/v04-1.png) | 历史代码复现（本次采集） | `a7e9ad7`，initial |
| [v04-2.png](images/v04-2.png) | 历史代码复现（本次采集） | `a7e9ad7`，initial |
| [v05-1.png](images/v05-1.png) | 历史代码复现（本次采集） | `6f697a9`，initial |
| [v06-1.png](images/v06-1.png) | 历史代码复现（本次采集） | `db10650`，initial |
| [v06-2.png](images/v06-2.png) | 历史代码复现（本次采集） | `db10650`，initial |
| [v09-1.png](images/v09-1.png) | 历史代码复现（本次采集） | `aeca90d`，initial |
| [v11-1.png](images/v11-1.png) | 历史代码复现（本次采集） | `f4ab4bd`，initial |
| [v11-sky.png](images/v11-sky.png) | 历史代码复现（本次采集） | `f4ab4bd`，sky-after-window |
| [v19-1.png](images/v19-1.png) | 历史代码复现（本次采集） | `41b60e4`，initial |
| [v19-sky.png](images/v19-sky.png) | 历史代码复现（本次采集） | `41b60e4`，sky-after-window |
| [v20-1.png](images/v20-1.png) | 历史代码复现（本次采集） | `41b60e4`，initial |
| [v20-sky.png](images/v20-sky.png) | 历史代码复现（本次采集） | `41b60e4`，sky-after-window |
| [v20-preview.png](images/v20-preview.png) | 历史代码复现（本次采集） | `41b60e4`，mock-preview |
| [v20-reader.png](images/v20-reader.png) | 历史代码复现（本次采集） | `41b60e4`，mock-reader |
| [legacy-20260901.png](images/legacy-20260901.png) | 历史代码复现（本次采集） | `875b072`，home |
| [formal-20261001-reader.png](images/formal-20261001-reader.png) | 历史代码复现（本次采集） | `670fa24`，real-reader |
| [formal-20261001-selected.png](images/formal-20261001-selected.png) | 历史代码复现（本次采集） | `670fa24`，real-selected-star |
| [current-desktop-room.png](images/current-desktop-room.png) | 当前本地截图 | `87a0401`，room |
| [current-desktop-sky.png](images/current-desktop-sky.png) | 当前本地截图 | `87a0401`，unselected-sky |
| [current-desktop-reader.png](images/current-desktop-reader.png) | 当前本地截图 | `87a0401`，real-reader |
| [current-desktop-selected.png](images/current-desktop-selected.png) | 当前本地截图 | `87a0401`，real-selected-star |
| [current-mobile-room.png](images/current-mobile-room.png) | 当前本地截图 | `87a0401`，room |
| [current-mobile-sky.png](images/current-mobile-sky.png) | 当前本地截图 | `87a0401`，unselected-sky |
| [current-mobile-reader.png](images/current-mobile-reader.png) | 当前本地截图 | `87a0401`，real-reader |
| [v12-dome.png](images/v12-dome.png) | 原有验收截图 | 2026-09-10；`.scratch/starry-blog/archive/prototypes/sky-studies/dome-desktop.png` |
| [v13-atmosphere.png](images/v13-atmosphere.png) | 原有验收截图 | 2026-09-10；`.scratch/starry-blog/archive/prototypes/sky-studies/atmosphere-low-desktop-v13.png` |
| [v20-mobile.png](images/v20-mobile.png) | 原有验收截图 | 2026-09-15；`.scratch/starry-blog/archive/prototypes/v20/evidence-v20/final-preview.png` |
| [reader-20261002.png](images/reader-20261002.png) | 原有验收截图 | 2026-10-02；`.scratch/starry-blog/evidence/reader-rollout-20261002/reader-desktop.png` |
| [note-20261003.png](images/note-20261003.png) | 原有验收截图 | 2026-10-03；`.scratch/starry-blog/evidence/sky-ui-rollout-20261003/note-desktop.png` |
| [panel-initial-20261007.png](images/panel-initial-20261007.png) | 原有验收截图 | 2026-10-07；`.scratch/starry-blog/evidence/observation-ui-20261007/desktop-unread-2026.png` |
| [panel-detail-20261007.png](images/panel-detail-20261007.png) | 原有验收截图 | 2026-10-07；`.scratch/starry-blog/evidence/observation-spacing-20261007/panel-detail.png` |
| [palette-20261007.png](images/palette-20261007.png) | 原有验收截图 | 2026-10-07，提交 2026-10-08；`.scratch/starry-blog/evidence/palette-20261007/after-sky.png` |
| [reader-blue-20261008.png](images/reader-blue-20261008.png) | 原有验收截图 | 2026-10-08；`.scratch/starry-blog/evidence/reader-palette-20261008/after-desktop.png` |
| [reader-art-20261009.png](images/reader-art-20261009.png) | 原有验收截图 | 2026-10-09；`.scratch/starry-blog/evidence/article-page-20261009/desktop-start.png` |
| [legacy-switch-20261010.png](images/legacy-switch-20261010.png) | 原有验收截图 | 2026-10-10；`.scratch/starry-blog/evidence/dual-theme-20261010/legacy-switch-light.png` |
