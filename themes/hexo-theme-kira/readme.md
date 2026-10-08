# Kira-Hexo

## 本仓库中的用途

本目录是 Stargazer's LucidDream 保留的本地定制旧主题，仍由 `_config.yml` 默认选择，设置在根目录 `_config.hexo-theme-kira.yml`。项目已有完整内容和依赖，直接从仓库根目录运行 `npm ci`、`npm run server`；新旧隔离预览和切回步骤见 [项目 README](../../README.md)及[旧版恢复指南](../../docs/operations/legacy-blog-recovery.md)。

新版真实文章主题在相邻的 `themes/stargazer-starfield/`，使用 `npm run start:starfield`，端口 4175。本目录 `prototypes/starfield/` 保留 V20 模拟文章设计原型，端口 4173；它不属于 Kira 发布资源。关系与启动说明见 [原型 README](prototypes/starfield/README.md)。

以下保留 Kira 上游主题介绍；其中的脚手架命令用于新建其他站点，不用于启动本仓库。

[![npm version](https://badgen.net/npm/v/hexo-theme-kira)](https://www.npmjs.com/package/hexo-theme-kira) [![npm weekly download](https://badgen.net/npm/dw/hexo-theme-kira)](https://www.npmjs.com/package/hexo-theme-kira) [![github stars](https://badgen.net/github/stars/ch1ny/kira-hexo?color=orange)](https://github.com/ch1ny/kira-hexo/stargazers)

Kira-Hexo，或者你也可以叫它 hexo-theme-kira。正如它的名字一样，是一款 KiraKira ✨ 让人眼前一亮的 hexo 风格化主题。

![](https://raw.githubusercontent.com/ch1ny/kira-hexo/master/preview.png)

## 快速开始

你可以在这里学习如何使用 Kira-Hexo 搭建你的风格化网站：[快速开始](https://kira.host/hexo/)

### 使用模板脚手架

您也可以使用我们提供的模板脚手架来快速生成基于 `kira-hexo` 主题的 hexo 博客：

**With npm:**
```bash
# 我其实更推荐您使用 yarn 或 pnpm ，而不是 npm
npm create kira-hexo@latest my-blog
```

**With yarn:**
```bash
yarn create kira-hexo my-blog
```

**With pnpm:**
```bash
pnpm create kira-hexo my-blog
```

## 代码仓库

你能够在 [GitHub](https://github.com/ch1ny/kira-hexo) 上直接获取项目的源代码，也能够在 [这里](https://github.com/ch1ny/kira-hexo/issues) 提出您的建议和意见。

## Credits

> **声明**: 本仓库设计灵感来源于 [hexo-theme-nexmoe](https://github.com/theme-nexmoe/hexo-theme-nexmoe)，欢迎各位支持原作者。
