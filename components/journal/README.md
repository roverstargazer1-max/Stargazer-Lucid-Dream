# 窗边手记模块

内容格式、创建、日期校验、分组与预览示例由本目录统一维护。Hexo 命令和主题生成器通过同一个模块读写，界面继续由主题的 `journal.ejs`、`journal.css` 和浏览器 `journal.js` 渲染；现有开合、换月与场景恢复逻辑沿用。

## 常用写作命令

```bash
npm run diary
npm run diary -- "散步之后"
npm run diary -- --content "今天想留下的几句话。"
npx hexo new journal "散步之后"
npx hexo new diary "睡前日记" --draft
```

`--date "2026-09-22"` 可补写只有日期的记录，`--date "2026-09-17 21:01"` 可指定时间。多行 Markdown 可使用 `--stdin`，例如 `cat saved-note.md | npm run diary -- --stdin`。`hexo help journal` 列出全部选项。

模板是根目录的 `scaffolds/journal.md`，包含日期、可选标题与公开状态的中文说明。默认时间按 Hexo 配置的时区填写；未设置时使用 Asia/Singapore。创建时不覆盖已有文件；同名记录自动加序号。正文留空时只创建写作文件，填写正文后才进入阅读内容。

## 内容接口

```js
const { createEntry, readJournal } = require('./components/journal');

const entry = createEntry(sourceDir, {
  title: '散步之后',       // 可省略
  date: '2026-09-22',      // 可省略，自动填当前日期和分钟
  content: 'Markdown 正文',
  draft: false,
});
// entry.path、entry.content、entry.date、entry.title、entry.published

const journal = readJournal(sourceDir, {
  render: markdown => renderMarkdown(markdown),
  preview: false,
});
// journal.months、journal.count、journal.demo
```

`sourceDir` 是站点的内容根目录，记录写入其 `_journal/`。`createEntry` 还可接收 `timeZone`、`now` 与 `scaffoldPath`，分别用于配置写作时区、固定创建时刻和使用站点自己的模板。日期校验或模板字段错误时，在创建文件前报错；写入失败清理本次未完成的新文件。

`readJournal` 只读取 Markdown 文件，保留日期精度与同日顺序；先排除 `published: false`，再调用渲染函数。`preview: true` 仅在没有公开正文时读取本目录的 `preview.json`，返回 `demo: true`。生产调用始终保持 `preview: false`。

纯内容接口 `buildJournal(files, { render })` 接收 `{ name, text }` 数组；`journalDate(value, source)` 校验本地日期标签。二者和目录读写使用相同规则，便于导入现成内容。

## Hexo 接入

- `scripts/journal.js` 注册 `hexo journal`，并将显式的 `hexo new journal` / `hexo new diary` 转到 `createEntry`。其他 `new` 调用委托 Hexo 原命令，不改其路径、模板或字段处理。
- `themes/stargazer-starfield/scripts/journal.js` 只负责调用 `readJournal`、传入现有 Markdown 渲染器，并登记独立阅读页。
- `scaffolds/journal.md` 是作者可以修改的写作模板。保留 `date`、`title`、`published` 的模板占位符，正文可自行添加。
