# 版本索引与回看方法

截止 `87a0401`（2026-10-11）。这里的提交号指本仓库可达对象，不保证已推送至 GitHub；因此不把本地提交链接包装成可访问的线上版本。

## 原型版本

“可复现”表示能取得该提交或冻结目录中的代码，不表示完整还原当时的浏览器、字体、设备和网络。截图均在 [README](README.md) 或下表中，来源参数与 SHA-256 在 [reconstruction.json](reconstruction.json)。

| 版本／研究 | 记录时间／提交时间（+08:00） | 实现定位 | 图像与状态 |
| --- | --- | --- | --- |
| 初始 A/B/C | 09-08；13:31 | `940503f`，原型目录 | 本次复现 [A](images/v01-1.png)、[B](images/v01-2.png)、[C](images/v01-3.png)、[正文](images/v01-reader.png) |
| V2 摄影天空／快速靠近 | 09-08；17:57 | `6586a83` | [本次复现](images/v02-1.png) |
| V3 程序天空 | 09-08；18:14 | `052d5ed`；18:24 `bc6a04f` 修前景边缘 | [本次复现](images/v03-1.png)，图对应前一个提交 |
| V4 四种屋顶 | 09-08；22:52 | `a7e9ad7`，`ROOF-STYLES.md` | [二次元](images/v04-1.png)、[纸雕](images/v04-2.png)本次复现；另两种原素材仍在 |
| V5 缩小屋顶／扩展文章空间 | 09-08；23:10 | `6f697a9` | [本次复现](images/v05-1.png) |
| 静态美术第一轮 | 09-09；10:47 | `db10650`，`ART-STUDY-01.md` | [墨蓝](images/v06-1.png)、[烟褐](images/v06-2.png)本次复现；v06 只是截图排序名 |
| 第二轮微动／视差 | 09-09；11:14 | `e04717e`，`ART-STUDY-02.md` | 本次未单独采集动画录像，代码可取；静态图不足以表达微动 |
| 第三轮字标／排版／按需标题 | 09-09；15:56 | `5fcbf3d`，`ART-STUDY-03.md` | 代码可取，后续观星者图含累计字标，不冒充本轮原始图 |
| 第四轮文字／观星者 | 09-09；16:32 | `aeca90d`，`ART-STUDY-04.md` | [本次复现](images/v09-1.png)，v09 只是截图排序名 |
| 天空试验05／探索路径 | 09-10；00:09 | `d245a04`，`EXPLORATION-PATHS.md` | 代码可取；试加 mock 在内存，不是正式文章增量 |
| V11 厚涂窗边 | 09-10；12:14 | `f4ab4bd`，`ART-STUDY-06.md` | 本次复现[房间](images/v11-1.png)、[天空](images/v11-sky.png)；提示词部分缺失 |
| V12 半球穹顶 | 09-10；15:08 | `e71f8a6`；后续 `4f31b68`、`0e89413`、`dfbcd61`、`e451e2b`、`4541f5e` | [原有截图](images/v12-dome.png)；完整提交可取 |
| V13 山丘／轻触云 | 09-10；21:32 | `d6d6a1c`；计划 `1612293` | [原有截图](images/v13-atmosphere.png)；完整提交可取 |
| V14 星光书页 | 文档09-11；09-30入Git | `MOTION-STUDY-14.md`；首次添加在 `41b60e4` | 无本轮独立提交／冻结副本／可确认网页截图 |
| V15 环星书卷 | 文档09-12；09-30入Git | `MOTION-STUDY-15.md`；同上 | 无本轮独立代码快照，不用 V20 参数伪装 |
| V16 无框显影 | 文档09-12；09-30入Git | `MOTION-STUDY-16.md`；同上 | 无本轮独立代码快照 |
| V17 连续穿窗 | 文档09-12；09-30入Git | `MOTION-STUDY-17.md`；同上 | 遮罩素材仍在；素材不等于完整本轮状态 |
| V18 往返窗边 | 文档09-12；09-30入Git | `MOTION-STUDY-18.md`；同上 | 无本轮独立代码快照 |
| V19 与后续微调 | 文档09-12/13；冻结名09-14；09-30入Git | 独立46文件冻结目录，首次在 `41b60e4`；现在 `archive/prototypes/v19/` | 本次复现[房间](images/v19-1.png)、[天空](images/v19-sky.png)；可启动真实冻结版本 |
| V20 可用性／美术 | 文档09-15/16；09-30入Git | `41b60e4` 中原型目录；累计V20代码与已回退后的桌面素材 | 本次复现[房间](images/v20-1.png)、[天空](images/v20-sky.png)、[简介](images/v20-preview.png)、[正文](images/v20-reader.png)；[原有手机图](images/v20-mobile.png) |

原型目录为 `themes/hexo-theme-kira/prototypes/starfield/`。现保留版本的说明从[原型 README](../../../themes/hexo-theme-kira/prototypes/starfield/README.md)查阅；各 V14–V19 研究文档都在该目录。初始提交与研究轮次不是项目正式发布标签，Git 中没有这些命名的版本 tag。

## 正式主题与后续改动

| 阶段 | 关键提交（按先后） | 查阅入口 |
| --- | --- | --- |
| 旧版基线／一篇真实文章／全量稳定数据 | `41b60e4`、`2995e37`、`7275831` | `evidence/02`–`04` |
| 媒体／关系／历史／旧集合 | `8d0a4d6`、`cea57be`、`356b4f6`、`ff84651` | `evidence/05`–`08` |
| 个人正式化范围／作者流程／V20预算／旧内容 | `a6a6c10`、`ba8aa2c`、`b6aa7b3`、`88a2004` | [实施记录](../../../.scratch/starry-blog/implementation-progress.md) |
| 复核／键盘／滚轮 | `8f12544`、`670fa24`、`5b81bfd` | 本次复现[真实暖纸正文](images/formal-20261001-reader.png)、[选星](images/formal-20261001-selected.png)，对应 `670fa24` |
| 冷色阅读／显字 | `2b425bb`、`175eeb6`、`c94aa34`、`934ab45`、`8cffd15` | [阅读落地](../../../.scratch/starry-blog/archive/implementation/reader-rollout-20261002.md) |
| 观测注记 | `0fb236f`、`a8dcc14`、`223f28a` | [注记落地](../../../.scratch/starry-blog/archive/implementation/sky-ui-rollout-20261003.md) |
| 原素材观测／补充裁片 | `f9d5cbe`、`9b9dad5`、`e3a52b1`、`745ded4`、`1e2e588` | [初始](../../../.scratch/starry-blog/archive/implementation/observation-ui-rollout-20261007.md)、[裁片](../../../.scratch/starry-blog/archive/implementation/supplement-ui-rollout-20261007.md) |
| 波浪／排布／几何轴／透视 | `a561846`、`b8c7b91`、`1043bb5`、`eeed732`、`595f4fd` | 同上及[透视记录](../../../.scratch/starry-blog/archive/implementation/polyhedron-perspective-20261008.md) |
| 宝蓝天空／阅读配色 | `91914d1` | [天空](../../../.scratch/starry-blog/evidence/palette-20261007/README.md)、[文章窗](../../../.scratch/starry-blog/evidence/reader-palette-20261008/README.md) |
| 原地步行／录屏重做／补帧／轮廓 | 各历史实现被同日后续更新覆盖；`27ca3be` 是最终连续轮廓提交 | [首版](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-20261008.md)、[重做](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-redo-20261008.md)、[补帧](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-smooth-20261008.md)、[轮廓](../../../.scratch/starry-blog/archive/implementation/silhouette-walk-edge-20261008.md)；文档状态不等于独立实现 checkpoint |
| 原声波／移除方位／面板下移／默认完整 | `37dba03`、`3b863a2`、`315842c`、`df503b3` | [阶段记录索引](sources.md) |
| 首轮性能 | `497e847`、`356f325`、`86feab3`、`365585b` | [10-08性能](../../../.scratch/starry-blog/evidence/performance-20261008/README.md) |
| 原图文章页／Logo2与近题 | `2a3e947`、`d45c753` | [文章页](../../../.scratch/starry-blog/evidence/article-page-20261009/README.md)、[天空入口](../../../.scratch/starry-blog/evidence/sky-ui-20261009/README.md) |
| 首屏／云缓存／运行时 | `81b5773`、`a61ccfa`、`7047cb1` | [10-09性能](../../../.scratch/starry-blog/evidence/performance-20261009/README.md) |
| 过场样式／原生时间轴／预热 | `8bc4986`、`afcf0c9`、`e551e93` | [专项过场](../../../.scratch/starry-blog/evidence/transitions-20261009/README.md) |
| 手机导航／模式位置／接缝／人物轨道与姿势 | `474c9d4`、`a4a1ffb`、`8d3a99d`、`d17a4e1`、`de41019` | 各日期README见[资料索引](sources.md) |
| 标题上移／署名／远信号／标题字体 | `b688870`、`e3e72e9`、`cb8ea88`、`bdba181` | 同上；`151cbf4` 是字形目录命名调整 |
| 双主题／首屏／视角边界 | `9669161`、`c92b10b` | [双主题](../../../.scratch/starry-blog/evidence/dual-theme-20261010/README.md)、[首屏](../../../.scratch/starry-blog/evidence/startup-window-20261010/README.md)、[边界](../../../.scratch/starry-blog/evidence/camera-bounds-20261010/README.md) |
| 省电预算／缓冲预热 | `2eb1dc2`、`31a1154`、`94bb89c` | [10-10省电](../../../.scratch/starry-blog/evidence/power-transitions-20261010/README.md) |
| 资料整理 | `9d90d8b` | [整理清单](../../../.scratch/starry-blog/archive/cleanup-20261010.md)；截图开始退出跟踪另见 `76df329` |
| 新星图与检索候选 | `f23876d`、`0e3c72b`、`44b68c2`、`e235a8c` | [.scratch/starry-search/spec.md](../../../.scratch/starry-search/spec.md)，设计未实现 |
| 工程核查及逐项整改 | `3d69a23`、`3d8bb02`、`1797a5b`、`5ef52d4`、`a97b257`、`2e92639`、`92fec89`、`4f173d1`、`7ded84d`、`658d3bd` | [10-11核查](../../../.scratch/starry-blog/evidence/engineering-20261011/README.md) |
| 注释模板／操作说明 | `585b6f7`、`87a0401` | [模板](../../../scaffolds/post.md)、[日常指南](../../operations/starfield-blog.md) |

同一提交可能集中保存多轮未提交工作，例如 `27ca3be` 的同日人物改动、`41b60e4` 的 V14–V20。细分步骤可以有文档依据，但不能据此生成一个不存在的中间 Git 版本。对照改动用完整 diff，而不是只看提交标题。

## 查某一提交中的文件

以下命令在仓库根目录执行，只读，不切换当前分支：

```sh
# 先看提交日期、说明和文件变化
git show --stat 940503f

# 看该提交当时的说明，不用当前 README 代替历史说明
git show 940503f:themes/hexo-theme-kira/prototypes/starfield/README.md

# 比较两个阶段的代码与素材
git diff --stat 940503f 6f697a9 -- themes/hexo-theme-kira/prototypes/starfield

# 找文章页调整之间的变化
git diff 2a3e947 e3e72e9 -- themes/stargazer-starfield
```

某文件后来移动时，使用它在该提交中的旧路径。09-30 的冻结 V19 路径是 `.scratch/starry-blog/baseline-v19-20260914/`；10-10 整理后的路径才是 `archive/prototypes/v19/baseline-v19-20260914/`。完整路径映射在[整理清单](../../../.scratch/starry-blog/archive/cleanup-20261010.json)。

## 从源码副本回看早期原型

本次复现就是导出指定提交到临时副本，再让浏览器读取其原 JS／CSS；没有 checkout、reset 当前项目，也没有将旧代码覆盖回来。若之后手动重看，可把某提交的原型导出到一个新的临时目录：

```sh
snapshot_dir=$(mktemp -d /tmp/starfield-history.XXXXXX)
git archive 6f697a9 themes/hexo-theme-kira/prototypes/starfield | tar -x -C "$snapshot_dir"
node "$snapshot_dir/themes/hexo-theme-kira/prototypes/starfield/server.mjs"
```

该历史启动器固定 4173，已有服务占用时需先处理端口；不要把它误认为当前 4173 页面自动切回旧代码。打开当时的 query：本例为 `?variant=C&roof=anime`。原型无需 Hexo 依赖。复现得到的字体、动画调度、图像色彩和跨设备结果仍可能不同于当时。

V19 已有独立冻结启动器：

```sh
node .scratch/starry-blog/archive/prototypes/v19/baseline-server.mjs
```

它在 4174，推荐参数与限制见[V19 README](../../../.scratch/starry-blog/archive/prototypes/v19/README.md)。当前 V20 则从原型目录启动 4173。**给当前 URL 写 `v=14`、`v=19` 只是改标记，不还原历史。**

本次 Kira `875b072` 与首次正式主题 `670fa24` 是导出完整仓库、复用当前 `node_modules` 后生成。前者用当时根配置，后者用当时 `_config.yml,_config.stargazer-preview.yml`；历史生成没有运行当前双主题包装。仅用于资料画面，应保留其“当前依赖复现”的图注。没有给缺失的 V14–V18 倒推代码。

## 当前入口与历史入口的区别

| 入口 | 内容 | 不代表什么 |
| --- | --- | --- |
| 4173 | 当前保留 V20，16 篇虚构文章 | 真实博客、任意 `v=` 所标历史完整版本 |
| 4174 | 冻结 V19 对照 | 旧 Kira、V14–V18 |
| 4175 | 当前统一预览：新版 `/`、Kira `/legacy/` | 线上 Netlify 部署 |
| 4176 | Kira 隔离预览，需按旧版指南准备 | 2025初始外观或所有历史改动 |

当前启动流程见[新版指南](../../operations/starfield-blog.md)，旧版恢复见[旧版指南](../../operations/legacy-blog-recovery.md)。本文里的旧临时端口、截图 URL 和历史配置描述过去的验证环境，不保证那些服务今天仍在运行。
