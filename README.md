# Stargazer's LucidDream

这是一个基于 Hexo 8 的静态博客项目，当前主题为 `hexo-theme-kira`，站点配置在 `_config.yml`，主题配置在 `_config.hexo-theme-kira.yml`。

## 环境准备

需要先安装 Node.js 和 npm，然后在项目根目录安装依赖：

```bash
npm install
```

本项目同时存在 `package-lock.json` 和 `pnpm-lock.yaml`。日常协作建议固定一种包管理器；下面的命令以 `package.json` 中已有的 npm scripts 为准。

## 常用命令

### 本地预览

```bash
npm run server
```

等价于：

```bash
hexo server
```

默认会启动本地预览服务并监听文件变更。常用参数：

```bash
hexo server --port 4001
hexo server --open
hexo server --static
```

- `--port`：指定端口。
- `--open`：启动后自动用默认浏览器打开。
- `--static`：只预览已经生成的静态文件。

### 生成静态文件

```bash
npm run build
```

等价于：

```bash
hexo generate
```

生成结果会输出到 `public/`。常用参数：

```bash
hexo generate --watch
hexo generate --force
hexo generate --deploy
```

- `--watch`：监听文件变化并自动重新生成。
- `--force`：强制重新生成所有文件。
- `--deploy` / `-d`：生成后立刻执行部署。

### 清理缓存和生成结果

```bash
npm run clean
```

等价于：

```bash
hexo clean
```

会删除 Hexo 缓存和已经生成的静态文件。遇到文章不更新、页面异常、主题资源缓存问题时，可以先执行：

```bash
npm run clean
npm run build
```

### Netlify 构建

```bash
npm run netlify
```

这个脚本会先清理再生成：

```bash
npm run clean && npm run build
```

适合部署平台在构建阶段调用。

### 部署

```bash
npm run deploy
```

等价于：

```bash
hexo deploy
```

也可以使用：

```bash
hexo deploy --generate
hexo generate --deploy
```

- `hexo deploy --generate`：部署前先生成。
- `hexo generate --deploy`：生成后马上部署。

注意：当前 `_config.yml` 中 `deploy.type` 还是空值，所以 `npm run deploy` 需要先配置部署方式后才会真正发布。

## 写作命令

### 新建文章

```bash
hexo new "文章标题"
```

默认会在 `source/_posts/` 下创建 Markdown 文件。也可以显式指定布局：

```bash
hexo new post "文章标题"
hexo new page "about"
hexo new draft "草稿标题"
```

常用参数：

```bash
hexo new post "文章标题" --slug my-post
hexo new post "文章标题" --path 2026/my-post
hexo new post "文章标题" --replace
```

- `--slug`：自定义文章 URL slug。
- `--path`：自定义文章文件路径。
- `--replace`：如果目标文件已存在则覆盖。

### 草稿

创建草稿：

```bash
hexo new draft "草稿标题"
```

草稿默认保存在 `source/_drafts/`，并且不会出现在正常生成结果中。预览草稿：

```bash
hexo server --draft
hexo generate --draft
```

发布草稿：

```bash
hexo publish "草稿文件名"
```

例如草稿文件是 `source/_drafts/hello-world.md`，发布时使用：

```bash
hexo publish hello-world
```

发布后文件会从 `source/_drafts/` 移动到 `source/_posts/`。

## 查询和排错

查看 Hexo 版本：

```bash
hexo version
```

查看站点内容索引：

```bash
hexo list post
hexo list page
hexo list tag
hexo list category
hexo list route
```

使用调试日志：

```bash
hexo --debug
hexo generate --debug
```

临时使用其他配置文件：

```bash
hexo server --config custom.yml
hexo server --config _config.yml,_config.hexo-theme-kira.yml
```

安全模式运行，临时禁用插件和脚本：

```bash
hexo server --safe
```

## 目录说明

```text
.
├── _config.yml                 # Hexo 站点配置
├── _config.hexo-theme-kira.yml  # Kira 主题配置
├── scaffolds/                  # 新文章模板
├── source/                     # 博客源文件
├── themes/                     # 本地主题文件
└── public/                     # 生成后的静态文件
```

日常写作主要修改 `source/` 下的 Markdown 文件；配置站点时修改 `_config.yml`；配置主题时修改 `_config.hexo-theme-kira.yml`。
