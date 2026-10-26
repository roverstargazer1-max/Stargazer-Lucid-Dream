# Starfield · 星空博客主题

独立 Hexo 8 主题。以窗边插画进入可探索的星空，每篇文章是一颗星；保留关联／时间两种模式、日期观测面板、阅读长页、全文检索、窗边手记和通信卫星友链。支持键盘、触屏、减少动态效果，以及可直接访问的静态正文与文章清单。

本仓库只包含主题、运行框架和空白示例站点。站名、作者、域名、Logo、友链、文章、手记及文章星位均由使用者自己的站点提供。未包含原个人博客、旧主题、个人素材库或个人站点的 Git 提交历史。

## 本地查看

需要 Node.js 22 或更新版本、npm。

```sh
npm ci
npm start
```

打开 <http://127.0.0.1:4175/>。示例站点默认没有文章、手记或友链，星空展示正常的空状态。`npm run build` 生成 `example/public/`，可以部署到静态托管服务。

```sh
npm run new -- post "第一篇文章"
npm run diary -- "一则手记"
npm run build
npm test
```

写作内容位于 `example/source/_posts/` 与 `example/source/_journal/`，默认忽略本地写作和自动星图记录，避免将个人数据误提交到主题仓库。长期使用请建立自己的 Hexo 站点并在那里提交内容。

## 安装到已有 Hexo 站点

把本主题的完整目录放入站点 `themes/starfield/`（可从本分支下载，或克隆本分支到该目录），安装主题依赖：

```sh
npm --prefix themes/starfield ci --omit=dev
```

站点需安装 Hexo 8、`hexo-renderer-ejs`、`hexo-renderer-marked` 和常用生成器。设置站点根 `_config.yml`：

```yaml
title: 我的星空
author: ""
url: https://example.com
theme: starfield
```

继续使用站点原有的 `hexo new post`、`hexo generate`、`hexo server`。主题目录可以改名，只需相应修改 `theme` 和配置文件名；运行代码使用 Hexo 的实际主题目录，不依赖此仓库名。

将 `scaffolds/post.md` 复制到站点同名目录可获得星空字段模板。手记命令 `hexo journal "标题"` 自动注册；缺少站点手记模板时使用主题自带模板。

## 主题配置

在站点 `_config.starfield.yml` 中覆盖设置；也可使用站点 `_config.yml` 的 `theme_config`。这是 [Hexo 的主题配置机制](https://hexo.io/docs/configuration#Using-an-Alternate-Config)。

```yaml
featured_article_id: "" # 空值使用第一篇文章
branding:
  logo: "" # 空值显示站点标题；可填图片路径或 URL
friends: []
# friends:
#   - name: 示例站点
#     link: https://example.org
#     desc: 一段介绍
#     avatar: ""
scene:
  motion: full # full / soft
  passage_blur: false
  room: image/starfield/room-poster-detail-v20.webp
  painted_sky: image/starfield/painted-sky-v11.webp
  window_mask: image/starfield/room-window-mask-v17.svg
```

场景图片与界面素材随主题提供。站点 `source/` 中的同路径文件可以覆盖场景原图；也可以修改以上路径。插画和窗口遮罩的几何位置须配套。更换原图后自动绕过旧显示缓存。友链默认为空，配置后在卫星面板及 `/pages/friends/` 展示。

站点 `root` 支持子目录，例如 `/blog/`；部署时同步设置 `url`。示例站点没有部署账户、生产分支或个人域名配置。

## 写作与星图

普通 Markdown 文章不必手填内部身份或坐标；首次生成自动准备以下数据：

- `starry_id`：稳定文章身份。
- `permalink` / `starry_original_permalink`：固定文章地址。
- `starry_excerpt`：从正文提取的摘要，可手写覆盖，清空恢复自动。
- `source/_data/starry-layout.json`：固定星位与 `STAR-0001` 起的永久星表号。

请在自己的站点将准备后的文章和星图记录一起提交。删除文章保留其登记，旧星位置和已分配号码不会因新增文章而重排或复用。

```yaml
related:
  - another-post-filename
  - post: third-post-filename
    reason: 两篇文章之间的联系
star:
  rank: ordinary # ordinary / important / treasured
  isolated: false
```

关联引用文件名，不含 `.md`；每对文章填写一次，自动双向。星等依次对应 4.0／2.5／1.0。

手记放入 `source/_journal/*.md`，头部含 `date: "2026-01-01"`、可选 `title` 和 `published: true`。`published: false` 不会进入页面；没有手记时显示空状态，不生成模拟日记。

文章中的标准 HTML 音频可以主动播放。APlayer／Meting 的兼容加载保留；使用它们时在自己的 Hexo 站点安装相应插件并配置播放器资源。主题不携带歌单、账号或全站自动播放设置。

## 目录与验证

- `layout/`、`scripts/`、`lib/`、`source/`：可独立安装的主题。
- `components/journal/`：手记解析与创建逻辑。
- `scaffolds/`：空白写作模板。
- `example/`：空白 Hexo 站点；`tools/example.cjs` 提供本地命令。
- `tests/`：行为回归、全新站点构建、子路径、主题改名及数据隔离检查。

`npm run check` 执行空站点构建和全部测试；`npm pack --dry-run` 检查主题发布清单。打包只包含主题运行文件，不包含示例写作、测试或构建产物。

字体说明见 [FONTS.md](FONTS.md)，素材说明见 [ASSETS.md](ASSETS.md)。当前包标记为 `UNLICENSED`，尚未授予通用开源再分发许可；字体单独遵循随附 OFL。
