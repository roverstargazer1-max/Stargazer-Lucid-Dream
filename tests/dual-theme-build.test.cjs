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
const { FIELD_COMMENTS } = require('../tools/article-authoring.cjs');

test('an ordinary post builds in both themes, survives a fresh checkout, and supports reversing the home theme', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stargazer-dual-'));
  try {
    for (const name of ['build-blog.cjs', 'prepare-starfield.cjs', 'package.json', '_config.yml', '_config.legacy-preview.yml', '_config.hexo-theme-kira.yml']) {
      fs.copyFileSync(path.join(project, name), path.join(fixture, name));
    }
    for (const name of ['node_modules', 'themes', 'assets', 'blog-assets', 'scripts', 'tools', 'components']) {
      fs.symlinkSync(path.join(project, name), path.join(fixture, name), process.platform === 'win32' ? 'junction' : 'dir');
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
    const mediaPost = originalPost + '\n{% pen https://codepen.io/example/pen/test %}\n\n{% biliplayer BV1xx411c7mD %}\n';
    fs.writeFileSync(postFile, mediaPost);
    fs.mkdirSync(path.join(fixture, 'source/_drafts'));
    fs.writeFileSync(path.join(fixture, 'source/_drafts/未发布.md'), '---\ntitle: 未发布\ndate: 2026-10-10\n---\n草稿不发布。\n');
    fs.mkdirSync(path.join(fixture, 'source/_journal'));
    fs.writeFileSync(path.join(fixture, 'source/_journal/2026-10-23.md'), '---\ndate: 2026-10-23\n---\n手记独立于文章星，保留 **Markdown**。\n');
    fs.writeFileSync(path.join(fixture, 'source/_journal/private.md'), '---\ndate: 2026-10-23 21:01\npublished: false\n---\n未公开的手记正文。\n');
    function build() {
      try {
        execFileSync(process.execPath, ['build-blog.cjs'], { cwd: fixture, stdio: 'pipe' });
      } catch (error) {
        throw new Error(String(error.stdout) + String(error.stderr));
      }
    }
    function page(relative) { return load(fs.readFileSync(path.join(fixture, 'public', relative, 'index.html'), 'utf8')); }
    function assertLegacyAssets(prefix) {
      const icons = path.join(fixture, 'public', prefix, 'lib/iconfont');
      for (const name of ['demo_index.html', 'demo.css', 'iconfont.js', 'iconfont.json']) {
        assert.equal(fs.existsSync(path.join(icons, name)), false, `Development-only ${name} must not be published`);
      }
      for (const name of ['iconfont.css', 'iconfont.woff2', 'iconfont.woff', 'iconfont.ttf']) {
        assert.ok(fs.existsSync(path.join(icons, name)), `Kira still needs ${name}`);
      }
    }
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
    assert.match(article.catalogNumber, /^SLD-\d{4,}$/);
    assert.equal(article.magnitude, 4);
    assert.equal(article.displayId, `${article.catalogNumber} · 4.0`);
    assert.equal(index.articles.length, publishedCount + 1);
    assert.equal(prepared._content, parse(mediaPost)._content);
    assert.ok(page('')('#room').length);
    assert.ok(page('legacy')('.kira-posts').length);
    assertLegacyAssets('legacy');
    const journal = page('journal');
    assert.equal(journal('.journal-entry').length, 1);
    assert.equal(journal('.journal-entry strong').text(), 'Markdown');
    assert.equal(journal('.journal-entry-meta time').length, 0, 'A date-only note must not gain an invented timestamp');
    assert.equal(journal('.journal-demo').length, 0, 'Production must never include illustrative preview writing');
    assert.ok(!journal('body').text().includes('未公开的手记正文'));
    assert.equal(journal('[data-blog-theme-switch]').length, 0, 'The journal has no nonexistent legacy counterpart');
    assert.equal(fs.existsSync(path.join(fixture, 'public/_journal')), false, 'Raw and unpublished writing must not be copied');
    assertResources(journal, 'journal/');
    for (const route of [article.path, `legacy/${article.path}`]) {
      const $ = page(route);
      assert.ok($('body').text().includes('只写一份 Markdown，两种主题都能阅读。'));
      for (const hint of Object.values(FIELD_COMMENTS)) assert.ok(!$('body').text().includes(hint), 'Author comments must not appear in either published theme');
      assert.ok(!$('body').text().includes('starry_excerpt_generated'), 'Internal field guidance must not leak into the article');
      assert.equal($('.CodePenLink').attr('href'), 'https://codepen.io/example/pen/test');
      assert.ok($('iframe[src^="https://player.bilibili.com/"]').length);
      assert.equal($('meting-js, .aplayer').length, 0);
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
    fs.rmSync(path.join(fixture, 'public'), { recursive: true, force: true });
    build();
    const fresh = JSON.parse(fs.readFileSync(path.join(fixture, 'public/starry/index.json'))).articles.find(item => item.title === '双主题文章');
    assert.equal(fresh.id, article.id);
    assert.equal(fresh.path, article.path);
    assert.equal(fresh.catalogNumber, article.catalogNumber);
    assert.equal(fresh.displayId, article.displayId);
    assert.deepEqual(fresh.position, article.position);

    const configFile = path.join(fixture, '_config.yml');
    const config = yaml.load(fs.readFileSync(configFile, 'utf8'));
    config.blog.default_theme = 'legacy';
    fs.writeFileSync(configFile, yaml.dump(config));
    // These scenarios verify independent configurations; output replacement and
    // rollback have dedicated coverage in build-output.test.cjs.
    fs.rmSync(path.join(fixture, 'public'), { recursive: true, force: true });
    build();
    assert.ok(page('')('.kira-posts').length);
    assert.ok(page('starfield')('#room').length);
    assertLegacyAssets('');
    assert.equal(decodeURI(page(article.path)('[data-blog-theme-switch]').first().attr('href')), `/starfield/${article.path}`);
    assert.equal(decodeURI(page(`starfield/${article.path}`)('[data-blog-theme-switch]').first().attr('href')), `/${article.path}`);
    assertResources(page(`starfield/${article.path}`), `starfield/${article.path}`);
    assertResources(page('starfield/journal'), 'starfield/journal/');
    assert.equal(page('starfield/journal')('.journal-entry').length, 1);
    assert.equal(new URL(page('starfield/journal')('link[rel="canonical"]').attr('href')).pathname, '/starfield/journal/');
    assert.equal(page('starfield')('#room-journal').attr('href'), '/starfield/journal/');
    assert.equal(page('starfield')('[data-friends-open]').first().attr('href'), '/starfield/pages/friends/');
    assert.equal(page('starfield/pages/friends')('.friends-close').attr('href'), '/starfield/');
    assertResources(page('starfield/pages/friends'), 'starfield/pages/friends/');
    const previous = page(`starfield/${article.path}`)('.article-pagination-previous');
    assert.equal(previous.length, 1);
    assert.ok(decodeURI(previous.attr('href')).startsWith('/starfield/'), 'Article navigation must respect the alternate theme root');
    const chronological = [...index.articles].sort((a, b) => a.timeOrder.localeCompare(b.timeOrder));
    const nextArticle = chronological[chronological.findIndex(item => item.id === article.id) + 1];
    const next = page(`starfield/${article.path}`)('.article-pagination-next');
    assert.equal(next.length, nextArticle ? 1 : 0);
    if (nextArticle) assert.equal(decodeURI(next.attr('href')), `/starfield/${nextArticle.path}`);
    assert.equal(page(`starfield/${chronological.at(-1).path}`)('.article-pagination-next').length, 0, 'The newest article has no later neighbour');
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
