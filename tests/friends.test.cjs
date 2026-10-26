const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const resolveHexo = name => require.resolve(name, { paths: [path.dirname(require.resolve('hexo'))] });
const { load } = require(resolveHexo('cheerio'));
const yaml = require(resolveHexo('js-yaml'));
const friends = yaml.load(fs.readFileSync('_config.hexo-theme-kira.yml', 'utf8')).friends;
const page = route => load(fs.readFileSync(path.join('.preview/stargazer', route, 'index.html'), 'utf8'));

test('one sky satellite opens the accessible friend dialog without a persistent corner control', () => {
  const $ = page('');
  assert.equal($('[data-friends-open]').length, 1);
  assert.equal($('#room [data-friends-open]').length, 0);
  assert.equal($('#friends-satellite').is('[hidden]'), true);
  assert.equal($('#friends-satellite img[src]').length, 0, 'Satellite artwork waits until the sky is explored');
  assert.ok(fs.existsSync(path.join('.preview/stargazer', $('#friends-satellite img').attr('data-src'))));
  for (const entry of $('[data-friends-open]').toArray()) {
    assert.equal($(entry).attr('href'), '/pages/friends/');
    assert.equal($(entry).attr('aria-haspopup'), 'dialog');
    assert.equal($(entry).attr('aria-controls'), 'friends-panel');
  }
  assert.equal($('#friends-panel').attr('aria-labelledby'), 'friends-title');
  assert.equal($('#friends-panel .friends-link').length, friends.length);
  assert.equal($('#home-fallback a[href="/pages/friends/"]').length, 1);
});

test('the panel and standalone page preserve every existing friend, order, destination and description', () => {
  for (const route of ['', 'pages/friends']) {
    const $ = page(route);
    const links = $('.friends-link');
    assert.equal(links.length, friends.length);
    friends.forEach((friend, i) => {
      const link = links.eq(i);
      assert.equal(link.attr('href'), friend.link);
      assert.equal(link.find('strong').text(), friend.name);
      assert.equal(link.find('.friends-copy > span').text(), friend.desc || '');
      assert.equal(link.attr('target'), '_blank');
      assert.match(link.attr('rel'), /noopener/);
      if (friend.avatar) {
        const image = link.find('img');
        assert.equal(decodeURI(image.attr('src')), friend.avatar);
        assert.equal(image.attr('loading'), 'lazy');
        assert.equal(image.attr('width'), '44');
        assert.equal(image.attr('height'), '44');
      }
    });
  }
  const $ = page('pages/friends');
  assert.equal($('.friends-close').attr('href'), '/');
  assert.match($('title').text(), /^友链/);
  assert.equal($('dialog').length, 0, 'Direct entry works without scene startup or JavaScript');
});
