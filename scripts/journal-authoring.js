const fs = require('node:fs');
const path = require('node:path');
const { createEntry } = require('../components/journal/index.cjs');

const options = {
  usage: '[title] [--date "YYYY-MM-DD HH:mm"] [--draft] [--content "正文" | --stdin]',
  arguments: [{ name: 'title', desc: '可选的小标题，不填写则直接按日期新建。' }],
  options: [
    { name: '--date <date>', desc: '指定日期或时间；默认使用站点时区，未配置时为 UTC。' },
    { name: '--draft', desc: '新建未公开的手记。' },
    { name: '--content <text>', desc: '创建时直接填写正文。' },
    { name: '--stdin', desc: '从管道或重定向读取多行 Markdown 正文。' },
  ],
};

function create(args) {
  if (args.stdin !== undefined && typeof args.stdin !== 'boolean') throw new Error('--stdin 不接收参数，请把正文通过管道传入。');
  if (args.stdin && args.content !== undefined) throw new Error('--content 与 --stdin 请选择其中一个。');
  if (args.stdin && process.stdin.isTTY) throw new Error('请通过管道或文件重定向传入正文，例如 cat diary.md | npm run diary -- --stdin。');
  if (args.draft !== undefined && typeof args.draft !== 'boolean') throw new Error('--draft 不接收参数；不需要草稿时省略它。');
  const known = new Set(['_', 'date', 'draft', 'content', 'stdin', 'config', 'debug', 'safe', 'silent', 'cwd']);
  for (const key of Object.keys(args)) if (!known.has(key)) throw new Error(`手记不支持 --${key}，请查看 hexo help journal。`);
  const entry = createEntry(hexo.source_dir, {
    title: args._.join(' '), date: args.date,
    content: args.stdin ? fs.readFileSync(0, 'utf8') : args.content === undefined ? '' : args.content,
    draft: args.draft || false, timeZone: hexo.config.timezone || 'UTC',
    scaffoldPath: fs.existsSync(path.join(hexo.base_dir, 'scaffolds/journal.md')) ? path.join(hexo.base_dir, 'scaffolds/journal.md') : path.join(hexo.theme_dir, 'scaffolds/journal.md'),
  });
  hexo.log.info('已新建%s：%s', entry.published ? '手记' : '手记草稿', entry.path);
  hexo.log.info('填写正文后运行 hexo generate 或 hexo server 查看。');
  return entry;
}

hexo.extend.console.register('journal', '新建一则窗边手记或日记。', options, create);

// Keep Hexo's post/page/draft command intact; only the two explicit layouts use
// the shared journal authoring module instead of becoming article stars.
const nativeNew = hexo.extend.console.get('new');
hexo.extend.console.register('new', nativeNew.desc, {
  ...nativeNew.options,
  desc: '新建文章、页面、草稿或手记。journal / diary 使用手记模板与目录，支持 hexo help journal 中的写作选项。',
}, function (args) {
  const layout = String(args._[0] || '').toLowerCase();
  if (layout === 'journal' || layout === 'diary') return create({ ...args, _: args._.slice(1) });
  return nativeNew.call(this, args);
});
