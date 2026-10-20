# 星空博客的写作、预览与发布

更新日期：2026-10-20。当前分支 `codex/starfield-personal` 统一构建两个主题：新版在 `/`，旧 Kira 在 `/legacy/`。同一份 Markdown 同时渲染，文章原地址由新版承接；旧版对应地址加上 `/legacy/`。两边的切换入口保留当前文章、归档、标签或页面位置，新版正文阅读窗口内也有入口。

这些是仓库配置与本地输出关系，不代表线上已经切换。V20 模拟文章原型仍独立在 4173；真实博客预览使用 4175。

## 首次运行与日常写作

使用 Node.js `22.19.0`、npm `10.9.3` 和根目录 `package-lock.json`：

```bash
npm ci
npm start
```

打开 [新版主页](http://127.0.0.1:4175/)和 [旧版主页](http://127.0.0.1:4175/legacy/)。`npm run start:starfield`、`npm run server` 为同一入口。

按原来的主题方式写文章：

```bash
npx hexo new post "文章标题"
```

创建命令会使用 `scaffolds/post.md`，预填副标题、标签、分类、封面、窄屏封面、文章关联、星空配置与自动摘要开关，并在每组字段旁保留中文注释和示例。标题和日期自动填写；封面默认空字符串，关联/标签/分类默认空列表，星空默认 `rank: ordinary`、`isolated: false`。封面图片和语义关联仍由作者选择，不会自动猜测；保留默认值也能直接写正文并发布。`scripts/post-scaffold.js` 在 Hexo 创建完成后恢复模板注释，只处理新建的文章，不改既有文章、页面或草稿。

`starry_excerpt_generated: true` 表示预览/构建时从正文自动提取新版描述元信息；要手写，先改为 `false` 再填写 `starry_excerpt`。身份、原链接、星位与星表号也在预览/构建时生成，不是在新建命令执行时生成。封面用于旧 Kira 列表与文章页，以及新版分享图片元信息；新版星空和正文底图不受它影响。`related` 用于新版文章关联，不改变旧版文章排序。

在 `source/_posts/` 中填写原有 title、date、tags、cover 等字段与 Markdown 正文。原有相对 `../image/` 图片写法继续兼容，两边的 HTML 都映射到各自发布的图片目录；原稿不改。原生 HTML、引用、列表仍走 Hexo 渲染；原 Kira 的 biliplayer、pen、krplayer、meting 标签由新版复用原实现，写法相同。

服务已运行时，修改文章、配置或主题后执行：

```bash
npm run preview:starfield
```

随后刷新浏览器。该命令自动完成准备、保存与两个主题的生成，无须先执行额外准备命令；服务没有文件监听。服务未运行则直接 `npm start`，停止按 `Ctrl+C`。

文章身份、原链接、描述与新星位自动保存到 Front-matter 和 `source/_data/starry-layout.json`；永久星表号只保存到布局中对应文章的 `catalogNumber`，不要求作者手填 `ID`。首次登记按发表时间、内部身份分配 `SLD-0001` 起的编号，以后从全部已保存记录的最大号继续追加；补发旧日期不会重排已有编号。删除文章后仍保留其布局登记，编号不复用，恢复同一身份的文章继续用原号。已有星位也保持稳定，自动字段不要手工修改。

日常先本地预览，将更新后的文章与 `source/_data/starry-layout.json` 一起提交，才能让编号在后续新增、删除和更名时延续。新文章只填原字段也能在 Netlify 构建：身份由文件路径确定，相同源内容与已有登记可复现；托管构建中生成的文件不会自动写回 GitHub，不能代替提交登记结果。

草稿放在 `source/_drafts/`，正常构建不发布。用 `npx hexo publish "草稿文件名"` 发布后，两边下一次构建同时加入该文章。

## 可选文章配置

新版星空左下角的蓝紫星盘打开检索页，盘面、轴心与指针从 `assets/蓝紫星盘.png` 分层裁切，只有原固定指针占位叠放局部修补图。盘面固定，指针随用户视角的水平方向实时转动；拖动、方向键及自动转向同步，俯仰和缩放保持水平方位。当前 UI 严格以 `assets/检索页/检索页v3.png` 为准，使用 `assets/检索页/v3/` 中的工程导出素材与原稿合成色；桌面统一按原稿坐标缩放，标题在圆图上方居中，搜索／筛选／索引保持 v3 间距与颜色。打开时先展示左侧星图区和右上箭头，在入场后段尚未停稳时自动向右展开 INDEX、退出按钮及索引，动效重叠衔接；点击箭头可手动收起或再次展开，圆图尺寸保持稳定；收起箭头朝左下，展开保留原方向，开合角度相差 90°。手机索引排在圆图下方；短横屏可在图面内滚动查看完整圆图。打开和退出共用 READ 阅读窗口的聚焦淡入淡出，四周保留主页，检索背景模糊已减至 1.2px；减少动态效果时采用短暂无模糊淡入淡出。点击外侧或按 Escape 也可退出。关键词可查标题、标签、正文及 `SLD-0001` 形式的星表号。年份自动读取实际文章，星等仍为 1.0／2.5／4.0；重复点击同一选项取消筛选，清除条件不会收起索引。筛选黑底、边线与数字使用 v3 原稿素材，没有文章的 2024 不显示，选中状态以细线标记。标题直接阅读，关闭文章后回到本次检索条件与位置。方位小星图已按最新反馈移除，探索时也不会出现。无须额外维护检索数据，预览与构建自动生成；草稿不进入索引。

不填下面的字段也能发布。文章关系引用**文件名，不含 .md**，每对只写一次，自动双向；理由选填：

```yaml
related:
  - 另一篇文章的文件名
  - post: 第三篇文章的文件名
    reason: 可选的关联理由
star:
  rank: ordinary
  isolated: false
```

`rank` 可选 ordinary、important、treasured，分别对应普通／重要／珍藏的博客星等 4.0／2.5／1.0，未填写时用普通 4.0。观测面板在 `OBS／ID` 标识后显示“星表号＋当前博客星等”，例如 `SLD-0006 · 4.0`；小字复用日期的数字字形。修改 `star.rank` 后，下次预览会更新展示星等，永久星表号、内部身份和文章链接保持不变。组合值由程序生成，不需要另填 `ID`；光色和闪烁没有随本次展示设定调整。

`isolated: true` 不生成空间探索路径或时间连线，作者明确的关联仍保留。无效关联会提示源文件，不阻止合法文章阅读。标题可改；改文件名时同步改其他文章的 related 引用。标签与距离不会自动成为内容关系。

`starry_excerpt` 用于描述元信息；不填时自动提取正文。要手写描述，填写它并删除 `starry_excerpt_generated` 或设为 false。点星后仍显示既有日期观测面板，不展示长摘要。其余星空交互和文章视觉沿用当前已确认设计。

## 预览、生产与切回

| 用途 | 命令 | 输出 / 地址 |
| --- | --- | --- |
| 双主题准备与生成 | `npm run preview:starfield` | `.preview/stargazer/`，含 `legacy/` |
| 双主题预览并启动 | `npm start` / `npm run start:starfield` | 4175 |
| 仅提供已有预览 | `npm run serve:starfield` | 4175 |
| 单独旧版预览 | `npm run preview:legacy` 后 `npm run serve:legacy` | `.preview/legacy/`，4176 |
| 旧版监听式开发服务 | `npm run server:legacy` | 4000 |
| 双主题正式构建 | `npm run build` / `npm run build:starfield` / `npm run netlify` | `public/`，含 `legacy/` |
| 只输出旧版用于恢复 | `npm run build:legacy` | `public/`，Kira 在根路径 |
| 自动验证 | `npm test` | 包含双主题与新增普通文章回归 |

`prepare:starfield` 是双主题预览的兼容别名。`generate:starfield` 是仅生成已准备内容的低层命令，会生成没有旧版切换入口的单主题预览；日常请用统一入口。准备与生成共享 `db.json`，不能并发执行；静态服务可以并行。统一构建先在临时目录完成两边，安装新输出前保留旧目录，安装失败会恢复；若恢复也失败，会保留备份并报告路径。`/legacy/` 为备用主题保留，不能给文章或页面配置冲突地址。

若希望旧版重新作为全站默认主页，修改 `_config.yml`：

```yaml
blog:
  default_theme: legacy
```

执行统一构建后，Kira 在 `/`，新版在 `/starfield/`。改回 `starfield` 恢复新版根主页和 `/legacy/`。文章继续在原来的 `source/` 维护。独立历史恢复见 [旧版指南](legacy-blog-recovery.md)。

默认服务只监听 `127.0.0.1`。端口占用可沿用现有服务，或设置 `STARFIELD_PREVIEW_PORT` 后启动；此变量也适用于旧版静态服务。

完整镜头仍为 `scene.motion: full`。当前穿窗约 2.86 秒：房间按原比例推进，同时侧移并转向星空，三者共用一条连续曲线，只在结尾一起减速停稳；天空与文章星沿途连续显示。回屋沿同步反向路径转回窗边并退入屋内。`?motion=soft` 采用 220ms 轻过渡。穿窗与回屋的微小房间模糊默认关闭，以减轻省电模式的合成开销；在 `themes/stargazer-starfield/_config.yml` 将 `scene.passage_blur` 设为 `true` 可恢复。实际持续掉帧会触发背景精度调整，静止、隐藏页面及浏览器固定刷新节奏不会单独触发降级。当前路径与验证见[连续运镜记录](../../.scratch/starry-blog/evidence/continuous-entry-20261012/README.md)，此前省电优化的测量与首次进入峰值见[省电过场记录](../../.scratch/starry-blog/evidence/power-transitions-20261010/README.md)。

## GitHub → Netlify

已修改仓库中的 `netlify.toml`：

| 设置 | 值 |
| --- | --- |
| 构建命令 | `npm run netlify` |
| 发布目录 | `public` |
| Deploy Preview 命令 | `npm run netlify`，与正式输出一致 |
| Node / npm | `22.19.0` / `10.9.3` |
| 默认内容 | 新版 `/` 与旧版 `/legacy/` |

Netlify 中具体操作：

1. 打开现有项目的 **Project configuration → Build & deploy → Continuous deployment**（部分界面归在 **Developer settings**），确认仓库为本项目，Base directory 为仓库根目录／留空，Build command 为 `npm run netlify`，Publish directory 为 `public`。
2. 作者已于 2026-10-10 确认 Production branch 为 `master`。保留该绑定，将 `codex/starfield-personal` 的此次改动提交为指向 `master` 的 PR；验证预览后合并。无需把生产分支改为开发分支。可在 **Branches and deploy contexts** 核对绑定是否仍为 `master`。
3. 确认 Deploy Previews 开启。先通过指向生产分支的 PR 验证远程预览；检查 `/`、`/legacy/`、原中文文章直达和刷新、对应旧文章、双向切换、归档／标签、图片和音乐资源。
4. 将代码、正文和本地生成的元信息提交并推送到所选生产分支，或合并已验收的 PR，Netlify 自动构建。构建日志应包含两个主题及最终 `Both themes built`，发布目录应同时有两套 HTML。
5. 发布完成后在正式域名重复核对上述地址。需要回滚可先在 **Deploys** 中将此前成功的部署重新发布；如果希望之后每次构建都保持旧版根主页，再提交 `blog.default_theme: legacy`。只需原主题的应急构建可将 TOML 中构建命令改为 `npm run build:legacy`，Deploy Preview 覆盖也需同步处理。

同名设置以 `netlify.toml` 为准，只改平台界面的构建命令不能覆盖文件中的命令；生产分支绑定仍需在平台设置。依据：[Netlify 文件配置与优先级](https://docs.netlify.com/build/configure-builds/file-based-configuration/)。

域名与 DNS 可沿用，单个 Netlify 项目发布整套 `public/` 即可，不需要第二个站点或后台服务。每个原文章和旧版对应地址都有实际 HTML；不要增加 `/* → /index.html` 的强制统一重写。JS、CSS、星图及备用主题目录已配置缓存重新验证，避免更新时混用不同版本。

本地生产构建与已登录平台、Linux 云构建、正式上线分别验证。作者已确认生产分支为 `master`；已登录平台设置、云构建与新部署结果尚未验收，本次配置修改及本地预览不会触发线上发布。第三方音频是否成功播放取决于原音乐接口，页面资源可用与音频接口成功应分别判断。

## 首屏、性能与素材维护

电脑与手机主页统一使用去掉小猫后的同一张房间原图。资源设置在主题 `_config.yml` 的 `scene.room` 和 `scene.window_mask`；手机仅对横版原图等比裁切，保留人物与相邻窗景，不再切换旧竖版素材。修改原图或窗口轮廓时需同步检查首帧、窗口点击区域及穿窗往返。见 [统一记录](../../.scratch/starry-blog/evidence/unified-room-20261020/README.md)。

2026-10-19 再次完成桌面、手机模拟及 CPU 限速的完整流程核查。星盘入口采用无损缓存，两张运行时图片合计下载量减少 64.5%，96 组浏览器截图一致；原 PNG 发布路径保留。正文底图与字体在选星、检索和直达页面时按需提前准备，减少首次显现时的集中解码阻塞，不增加首页正文图片请求。93 项自动检查、双主题构建、启动回退、窗口变化、轻动效和 12 轮阅读／检索往返检查通过；保留全部原动效，桌面部分过场仍有峰值。数据、复测方法及撤回试验见[本次性能审查](../../.scratch/starry-blog/evidence/performance-20261019/README.md)。

更换 `assets/蓝紫星盘.png`、局部修补图或 `repairClip` 后，需运行 `python3 themes/stargazer-starfield/tools/prepare-entry-art.py` 并重新做入口像素比较，再提交两张显示缓存。缓存已随主题保存，日常预览／构建不依赖 Python 或 Pillow。详见[入口缓存维护](../../.scratch/starry-blog/evidence/performance-20261019/entry-cache.md)。

2026-10-11 工程核查已完成共享投影、固定几何和云缓存复用、DOM/链接更新去重、播放器重用及历史换篇暂停，并完善构建回滚和本地流式预览。68 项自动检查、双主题构建与浏览器像素/过场回归通过；收益、复测方法和限制见 [工程与性能记录](../../.scratch/starry-blog/evidence/engineering-20261011/README.md)。本地 HTTP 服务优化不计作线上动画收益；触屏模拟与实体设备分别报告。

复测脚本、Markdown 结论和 `*-summary.json` 摘要提交到仓库；完整报告、截图、录像及逐次测量数据保留本地并由 `.gitignore` 忽略。历史记录中详细产物的相对链接指向本地归档，取得和提交范围见[测试产物保存约定](../../.scratch/starry-blog/evidence/README.md)。

首页加载时先显示房间前景与最终窗口轮廓，窗外以深蓝底色承接，实时星空准备完成后在 0.45 秒内淡入；不再先露出原插画里另一套窗景。窗口按钮在星空准备完成后启用；不会先闪出文章清单。关闭 JavaScript、主模块请求失败、遮罩图片失败或渲染不可用时，文章清单恢复供访问。深链接仍有静态正文回退。

互动云缓存和无损步行动作图集已随主题保存，预览、生产构建无须安装图像处理工具。更换步行动作 PNG 时需重新生成 WebP 并核对浏览器绘制像素；更新云的种子或造型算法时需同步重建三张 PNG 缓存与命中透明度。生成、回归、冷缓存测量与当前限制见 [性能复测记录](../../.scratch/starry-blog/evidence/performance-20261009/README.md)。
