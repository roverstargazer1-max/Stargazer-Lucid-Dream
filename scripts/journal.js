const { readJournal } = require('../components/journal/index.cjs');
let cached;

hexo.extend.filter.register('before_generate', () => { cached = null; });

function journal() {
  if (cached) return cached;
  cached = readJournal(hexo.source_dir, {
    render: text => hexo.render.renderSync({ text, engine: 'markdown' }),
  });
  return cached;
}

hexo.extend.generator.register('starry-journal', () => {
  return { path: 'journal/index.html', layout: 'journal', data: { layout: 'journal', title: '窗边手记', journal: journal() } };
});
