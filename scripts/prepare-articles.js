const { prepareArticles } = require('../lib/prepare-articles.cjs');
// Hexo has processed sources before this hook; generators see the prepared data
// during the same pass, including in an existing site's normal `hexo server`.
hexo.extend.filter.register('before_generate', () => prepareArticles(hexo), 1);
