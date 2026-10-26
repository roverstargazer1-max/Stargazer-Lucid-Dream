const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require(require.resolve('cheerio', { paths: [path.dirname(require.resolve('hexo'))] }));
const { deferJournalImages } = require('../lib/journal-images');

test('journal images, responsive sources and image links stay inert until explicitly opened', () => {
  const $ = load('<p>原文、错别字和表情 🥲 不变。<img src="/first.jpeg" alt="旧照片" srcset="/first-2x.jpeg 2x"></p><p><a href="/original.jpeg"><picture><source srcset="/wide.webp" media="(min-width: 800px)"><img src="/second.jpeg" alt=""></picture></a></p>', null, false);
  deferJournalImages($, 'note-one');
  assert.equal($('[data-journal-image-toggle]').length, 2);
  const live = load($.html(), null, false);
  live('template').remove();
  assert.equal(live('img, source').length, 0, 'No live request-bearing media should remain');
  assert.equal($('template').first().contents().find('img').attr('srcset'), '/first-2x.jpeg 2x');
  assert.equal($('template').last().contents().find('source').attr('srcset'), '/wide.webp');
  assert.equal($('template').last().contents().find('a').attr('href'), '/original.jpeg');
  assert.equal($('a [data-journal-image-toggle]').length, 0, 'The placeholder must not be nested inside the original image link');
  assert.equal($('p').first().contents().first().text(), '原文、错别字和表情 🥲 不变。');
  $('[data-journal-image-toggle]').each((_, node) => {
    const button = $(node);
    assert.equal(button.attr('aria-expanded'), 'false');
    assert.equal($(`#${button.attr('aria-controls')}`).length, 1);
    assert.ok(button.is('[hidden]'), 'Without JavaScript, show the explicit image link instead of an inert button');
  });
  assert.equal($('noscript').length, 2);
  assert.match($.html(), /href="\/first.jpeg"/);
  assert.match($.html(), /href="\/second.jpeg"/);
  const roundTrip = load($.html(), null, false);
  assert.equal(roundTrip('template').contents().find('img').length, 2, 'Images must survive serialization into the built page');
  assert.equal(roundTrip('template').contents().find('source').attr('srcset'), '/wide.webp');
  const once = $.html();
  deferJournalImages($, 'note-one');
  assert.equal($.html(), once, 'Repeated processing must not add nested controls');
});
