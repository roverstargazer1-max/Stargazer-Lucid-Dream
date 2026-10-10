const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { load } = require(resolveHexo('cheerio'));
const { parse } = require(resolveHexo('hexo-front-matter'));
const yaml = require(resolveHexo('js-yaml'));
const project = path.resolve(__dirname, '..');

test('an ordinary post builds in both themes, survives a fresh checkout, and supports reversing the home theme', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-dual-'));
  try {
    for (const name of ['build-blog.cjs', 'prepare-starfield.cjs', 'package.json', '_config.yml', '_config.legacy-preview.yml', '_config.hexo-theme-kira.yml']) {
      fs.copyFileSync(path.join(project, name), path.join(fixture, name));
    }
    for (const name of ['node_modules', 'themes', 'assets', 'blog-assets', 'scripts']) {
      fs.symlinkSync(path.join(project, name), path.join(fixture, name), 'dir');
    }
    fs.mkdirSync(path.join(fixture, 'source'));
    for (const name of ['_posts', '_data', 'pages', 'image']) {
      fs.cpSync(path.join(project, 'source', name), path.join(fixture, 'source', name), { recursive: true });
    }
    const originalLayout = JSON.parse(fs.readFileSync(path.join(fixture, 'source/_data/starry-layout.json')));
    const publishedCount = fs.readdirSync(path.join(fixture, 'source/_posts'))
      .filter(name => name.endsWith('.md'))
      .map(name => parse(fs.readFileSync(path.join(fixture, 'source/_posts', name), 'utf8')))
      .filter(post => post.published !== false).length;
    const postFile = path.join(fixture, 'source/_posts/双主题文章.md');
    const originalPost = '---\ntitle: 双主题文章\ndate: 2026-10-10 12:00:00\ntags: 双主题验证\ncover: /image/covers/sky.webp\n---\n\n只写一份 Markdown，两种主题都能阅读。\n\n> 保留引用和 **加粗**。\n\n![本地图](../image/小记2/01.webp)\n';
    const mediaPost = originalPost + '\n{% pen https://codepen.io/example/pen/test %}\n\n{% biliplayer BV1xx411c7mD %}\n\n{% krplayer %}\n{% meting "14457276201" "netease" "playlist" %}\n{% endkrplayer %}\n';
    fs.writeFileSync(postFile, mediaPost);
    fs.mkdirSync(path.join(fixture, 'source/_drafts'));
    fs.writeFileSync(path.join(fixture, 'source/_drafts/未发布.md'), '---\ntitle: 未发布\ndate: 2026-10-10\n---\n草稿不发布。\n');
    function build() {
      try {
        execFileSync(process.execPath, ['build-blog.cjs'], { cwd: fixture, stdio: 'pipe' });
      } catch (error) {
        throw new Error(String(error.stdout) + String(error.stderr));
      }
    }
    function page(relative) { return load(fs.readFileSync(path.join(fixture, 'public', relative, 'index.html'), 'utf8')); }
    function assertResources($, route) {
      $('[src], [data-src], link[rel="stylesheet"]').each((_, element) => {
        const value = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('href');
        if (!value || /^(https?:|data:|\/\/)/.test(value)) return;
        const url = new URL(value, `https://local/${route}`);
        assert.ok(fs.existsSync(path.join(fixture, 'public', decodeURIComponent(url.pathname))), `Missing ${url.pathname}`);
      });
    }
    build();
    const prepared = parse(fs.readFileSync(postFile, 'utf8'));
    const index = JSON.parse(fs.readFileSync(path.join(fixture, 'public/starry/index.json')));
    const article = index.articles.find(item => item.id === prepared.starry_id);
    assert.ok(article);
    assert.equal(index.articles.length, publishedCount + 1);
    assert.equal(prepared._content, parse(mediaPost)._content);
    assert.ok(page('')('#room').length);
    assert.ok(page('legacy')('.kira-posts').length);
    for (const route of [article.path, `legacy/${article.path}`]) {
      const $ = page(route);
      assert.ok($('body').text().includes('只写一份 Markdown，两种主题都能阅读。'));
      assert.equal($('.CodePenLink').attr('href'), 'https://codepen.io/example/pen/test');
      assert.ok($('iframe[src^="https://player.bilibili.com/"]').length);
      assert.equal($('.kira-aplayer-container meting-js').attr('id'), '14457276201');
      const target = route.startsWith('legacy/') ? `/${article.path}` : `/legacy/${article.path}`;
      assert.equal(decodeURI($('[data-blog-theme-switch]').first().attr('href')), target);
      assertResources($, route);
      assert.equal(new URL($('link[rel="canonical"]').attr('href')).pathname, encodeURI(`/${article.path}`));
    }
    const legacyTags = page('legacy/tags/双主题验证');
    assert.ok(legacyTags('a').toArray().some(link => decodeURI(legacyTags(link).attr('href') || '') === `/legacy/${article.path}`));
    for (const route of ['archives/2026/10', 'legacy/archives/2026/10', 'pages/friends', 'legacy/pages/friends', 'legacy/pages/mine']) assertResources(page(route), route + '/');
    const layoutFile = path.join(fixture, 'source/_data/starry-layout.json');
    const preparedLayout = JSON.parse(fs.readFileSync(layoutFile));
    for (const [id, saved] of Object.entries(originalLayout.articles)) assert.deepEqual(preparedLayout.articles[id], saved);

    // Simulate Netlify receiving only the author's ordinary Markdown, without generated fields.
    fs.writeFileSync(postFile, mediaPost);
    fs.writeFileSync(layoutFile, JSON.stringify(originalLayout));
    build();
    const fresh = JSON.parse(fs.readFileSync(path.join(fixture, 'public/starry/index.json'))).articles.find(item => item.title === '双主题文章');
    assert.equal(fresh.id, article.id);
    assert.equal(fresh.path, article.path);
    assert.deepEqual(fresh.position, article.position);

    const configFile = path.join(fixture, '_config.yml');
    const config = yaml.load(fs.readFileSync(configFile, 'utf8'));
    config.blog.default_theme = 'legacy';
    fs.writeFileSync(configFile, yaml.dump(config));
    build();
    assert.ok(page('')('.kira-posts').length);
    assert.ok(page('starfield')('#room').length);
    assert.equal(decodeURI(page(article.path)('[data-blog-theme-switch]').first().attr('href')), `/starfield/${article.path}`);
    assert.equal(decodeURI(page(`starfield/${article.path}`)('[data-blog-theme-switch]').first().attr('href')), `/${article.path}`);
    assertResources(page(`starfield/${article.path}`), `starfield/${article.path}`);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('all current published articles have an equivalent Kira route in the combined preview', () => {
  const output = path.join(project, '.preview/stargazer');
  const index = JSON.parse(fs.readFileSync(path.join(output, 'starry/index.json')));
  for (const article of index.articles) {
    const $ = load(fs.readFileSync(path.join(output, 'legacy', article.path, 'index.html'), 'utf8'));
    assert.equal($('.kira-post-cover h1').text(), article.title);
    assert.ok($('.kira-post article').text().trim());
    assert.equal(decodeURI($('[data-blog-theme-switch]').attr('href')), `/${article.path}`);
  }
});
