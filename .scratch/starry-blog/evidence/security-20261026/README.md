# 隐私与安全复查（2026-10-26）

首次检查没有修改站点代码、依赖、照片、Git 历史或远程设置，也没有发布。后续按作者要求处理其余项目；邮箱、本机路径与手记照片由作者明确接受，保持原样。工作区已有其他未提交改动，以下构建结论以相应执行时的文件为准。

## 后续处理

- 作者接受第 1、2 项隐私情况，本轮没有修改邮箱、Git 历史、本机路径或手记照片。
- 已按兼容版本更新全部 9 个存在漏洞的依赖包；更新后 `npm audit` 报告 0 项漏洞，没有使用 `--force`。
- 清理旧依赖时暴露出站点 HTML 解析器此前通过已移除插件间接安装的问题。将原本使用的 `cheerio@1.2.0` 补为明确的站点依赖，三个运行时调用点改为直接引用，保证新的安装也能构建。
- 共享 `after_generate` 过滤器从所有 Kira 输出中排除图标演示 HTML、样式、符号示例脚本与编辑 JSON；运行时图标 CSS 和字体保留。双主题测试覆盖 Kira 在 `/legacy/` 与根路径两种配置。
- 将唯一外部友链头像原样保存到 `source/image/友链/tianze.jpeg`，两套主题共用，原友链目标地址保持原样。
- 在 `netlify.toml` 加入全站内容安全策略、嵌入保护、内容类型保护、引用信息策略和设备权限限制；原缓存规则继续使用。内容安全策略限制 `base-uri`、`object-src`、`frame-ancestors`、`form-action` 并升级不安全资源请求，保留现有内联脚本、样式和视频嵌入的兼容性，没有声称实现完整的脚本来源隔离。
- `.env`、本地证书、凭据和 Netlify 本地状态加入忽略规则，`.env.example` / `.env.sample` 等示例仍可提交。
- 本地配置和构建结果需要实际部署后才会影响正式域名；本轮没有提交、推送或部署。

## 修复验证

- `npm audit --json`：0 项已知漏洞。
- `npm test`：120 项通过，0 项失败。
- `npm run build`：正式双主题构建成功；628 个文件、73 个 HTML，没有图标演示资源，实际 HTML 中的脚本、样式、图片和 iframe 均没有外部资源地址。
- Git 忽略规则核对通过：私密环境配置、证书和凭据被忽略，四种示例环境文件仍可提交。
- 本次首次清理依赖后的构建暴露出缺少明确 HTML 解析依赖，已补齐。随后验证遇到本机磁盘不足；测试在独立构建场景之间清理各自生成物后通过，输出替换与恢复仍由专门测试覆盖。全量测试同时为工作区已有的图片预解码改动补齐了测试替身的 `decode()`，没有修改该项产品逻辑。
- 新增的 [浏览器核查脚本](browser-check.mjs) 从 TOML 解析规则并在本地临时服务上施加相同响应头；这是本地浏览器验证，不代表 Netlify 或 Cloudflare 的线上设置已更新。运行时通过 `PLAYWRIGHT_MODULE` 指定已安装的 Playwright 模块、通过 `TOML_PYTHON` 指定带 `tomllib` 的 Python，无须向站点添加浏览器测试依赖。
- 桌面 1440×900、手机 390×844 的手记、检索、文章阅读、旧版昼夜切换和本地头像检查通过；正常流程无页面错误、内容安全策略违规或第三方资源请求。浏览器实际拦截了外部基础地址注入，并确认相机／麦克风／定位权限被禁用；新版和旧版的跨站嵌入均被 `frame-ancestors` 拦截。已确认演示页 404、运行时图标字体 200，脚本缓存规则仍生效。结果见 [浏览器摘要](browser-summary.json)与[修复摘要](fix-summary.json)。

实现依据：[npm 兼容漏洞修复](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-audit.md)、[Netlify 文件配置](https://docs.netlify.com/build/configure-builds/file-based-configuration/)、[Netlify 响应头](https://docs.netlify.com/manage/routing/headers/)、[Hexo 生成过滤器](https://hexo.io/api/filter.html)、[Hexo 路由移除](https://hexo.io/api/router.html)。

## 首次检查结论

没有在本次扫描中发现有效密钥、密码、私钥、身份证号或照片 GPS 信息。发现的明确隐私暴露是公开提交记录中的个人邮箱，以及一张公开手记照片中的部分行程线索。依赖存在已知漏洞，线上响应头和发布文件范围也有加固空间。

## 首次检查发现

### 1. 公开仓库暴露个人邮箱与本机路径（隐私，中）

- GitHub 仓库元数据已确认 `visibility: public`，默认分支为 `master`。
- 本地 `origin/master` 的 245 条提交中，244 条使用非匿名 Gmail 地址；本报告不重复记录地址。后续改用 GitHub noreply 邮箱只能影响新的提交，已有历史仍保留原地址。
- 已提交的 `.scratch/starry-blog/article-star-settings-20261026.md:77` 等记录，以及多份浏览器核查脚本，包含 `/Users/…` 形式的绝对路径。这些内容不进入网站构建，但可以通过公开仓库阅读。
- 建议：后续提交使用 noreply 邮箱；开发记录改用仓库相对路径。若希望处理已经公开的邮箱，需要另行评估 Git 历史清理，不在此次检查中改写历史。

### 2. 手记照片包含行程线索（隐私，中）

- `source/image/journal/3861.jpeg` 中的票据可辨认出部分目的地文字、日期和编号。未看到完整姓名或明确住宅地址，不将零碎信息推断为完整身份。
- 这张照片已被提交到公开分支；本地正式构建也原样生成 `public/image/journal/3861.jpeg` 和 `public/legacy/image/journal/3861.jpeg`。
- “查看图片”只是延迟请求，不是访问控制。建议打码票据区域，再替换发布照片；不希望公开的原图应放在仓库外。
- 此次检查 `source/image/` 下图片的 EXIF、GPS 和可识别的 XMP 元数据，未发现 GPS 坐标、相机序列号或个人作者字段。

### 3. 依赖扫描报告 9 个存在漏洞的包（维护优先级，中）

当日 `npm audit --json` 报告 **7 个 high、2 个 moderate、0 个 critical**，均标记有可用修复。当前锁文件与 HEAD 中下列包的版本一致。

| 包 | 检查时版本 | 扫描评级 | 所处位置 |
| --- | --- | --- | --- |
| brace-expansion | 2.1.0 / 1.1.14 | high | 模板与样式构建的文件匹配依赖 |
| compression | 1.8.1 | high | hexo-server 本地开发服务 |
| dompurify | 3.4.3 | high | Markdown 构建依赖 |
| form-data | 4.0.5 | high | Markdown 构建的 jsdom 依赖 |
| js-yaml | 4.1.1 | high | 配置与正文元数据解析 |
| moment | 2.30.1 | moderate | 构建日期处理 |
| morgan | 1.10.1 | moderate | hexo-server 本地开发服务 |
| nanoid | 3.3.12 | high | Hexo 数据库依赖 |
| ws | 8.20.1 | high | Markdown 构建的 jsdom 依赖 |

这些包没有被打入当前前端脚本；线上发布的是静态文件，不运行 Hexo 服务。当前未发现普通访客能直接触发这些漏洞的输入路径，因此扫描评级不等于线上站点已有同级可利用漏洞。建议更新兼容版本后重新构建、测试和扫描；本次没有执行自动依赖修复。

### 4. 图标库演示页被发布，并加载额外第三方脚本（低）

- `themes/hexo-theme-kira/source/lib/iconfont/demo_index.html:13`、`:15` 引入两个外部脚本，没有完整性校验。
- 本地正式构建将该开发演示页发布到 `/legacy/lib/iconfont/demo_index.html`。正常首页未引用这两个脚本，只有直接访问演示页时会加载。
- 建议从发布内容中排除 `demo_index.html` 及仅供演示使用的资源，保留博客实际使用的图标资源。
- 新版友链还使用一张外部头像。图片请求会向头像服务器暴露访客 IP 等普通连接信息；新版已配置 `referrerpolicy="no-referrer"`。若希望减少第三方请求，可以将头像转为本地资源。

### 5. 线上缺少常用安全响应头（加固，低）

对正式域名 `/` 和 `/legacy/` 的实际 GET 响应检查：

- HTTPS 正常，存在 `Strict-Transport-Security: max-age=31536000`。
- 未返回 `Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。
- `netlify.toml` 当前主要配置缓存响应头，没有统一安全头。
- 建议补充内容类型保护、嵌入限制与引用信息策略。内容安全策略应结合现有内联脚本和样式验证，避免直接套用严格策略造成页面失效。

另一个低成本预防项是为 `.env`、`.env.*`、本地证书等文件添加忽略规则，保留需要提交的示例配置。目前没有发现这些敏感文件已被跟踪。

## 首次检查的验证与边界

- 扫描 961 个已跟踪文本文件，对常见私钥、GitHub/cloud token、认证头、含密码 URL、敏感赋值和个人信息格式做筛查；对误报的数字和示例占位符另行核对。
- 扫描本地所有可达 Git 引用的文本改动，未命中常见真实密钥格式。不是高熵密钥的完整识别，也不覆盖已不可达的历史对象。
- 正式双主题构建成功；核查 629 个生成文件、74 个 HTML，没有将 `.env`、配置、`db.json`、`.scratch`、原始 Markdown、私钥或源映射误发布到构建目录。
- 新版文章索引和正文搜索仅处理已公开文章；手记 `published: false` 在渲染前被过滤。公开 Git 仓库仍不适合作为私密草稿存储，公共图片目录也不具备私密附件保护。
- 运行预览 HTTP、手记过滤及延迟图片的现有测试，共 10 项通过。预览静态服务绑定 `127.0.0.1`，目录越界测试通过。
- 对线上 `/.env`、`/.git/HEAD`、`/_config.yml`、`/db.json` 的只读探测均返回 404；`/.git/HEAD` 首次 TLS 连接失败，重试确认 404。
- GitHub 仅核实公开性等仓库元数据；没有检查 Netlify 账户权限、平台环境变量、Cloudflare 账户配置或所有远程历史分支。没有进行破坏性测试。

来源：[公开仓库元数据](https://api.github.com/repos/roverstargazer1-max/Stargazer-Lucid-Dream)、本地 Git 历史与源文件、当日 npm 漏洞数据库、当日正式站点 HTTP 响应。
