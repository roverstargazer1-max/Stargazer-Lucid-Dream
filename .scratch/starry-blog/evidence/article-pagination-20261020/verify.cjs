const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const articles = require('../../../../.preview/stargazer/starry/index.json').articles;
const origin = process.env.STARFIELD_PREVIEW_URL || 'http://127.0.0.1:4175';
const current = articles.find(article => article.title === '慢');
const currentIndex = articles.indexOf(current);
const next = articles[currentIndex + 1];
const reports = [];

async function ready(page, article = current) {
  await page.waitForFunction(id => document.querySelector('#reader[open] .article')?.dataset.starryId === id
    && document.body.dataset.reading === 'open', article.id);
}
async function bottom(page) {
  await page.locator('#reading-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.waitForFunction(() => document.querySelector('#reading-journey')?.getAttribute('aria-valuenow') === '100');
  // Reaching the body end can reveal authored relations and extend the sheet.
  await page.locator('#reading-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
}
async function navigate(page, direction, target) {
  await bottom(page);
  await page.locator(`#reader .article-pagination-${direction}`).click();
  await ready(page, target);
  assert.equal(decodeURI(new URL(page.url()).pathname), '/' + target.path);
  assert.equal(await page.locator('#reading-scroll').evaluate(element => element.scrollTop), 0);
  assert.equal(await page.locator('#reader-title').textContent(), target.title);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.STARFIELD_BROWSER_PATH });
  try {
    for (const [name, width, height, reduce = false, soft = false] of [
      ['desktop', 1440, 900], ['small-desktop', 1024, 768], ['tablet', 768, 1024], ['mobile', 390, 844], ['mobile-375', 375, 812],
      ['narrow', 320, 568], ['landscape', 844, 390], ['reduced', 390, 844, true], ['soft', 1440, 900, false, true],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width <= 520,
        isMobile: width <= 520, reducedMotion: reduce ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/' + current.path + (soft ? '?motion=soft' : ''), { waitUntil: 'domcontentloaded' });
      await ready(page);
      await page.evaluate(() => { window.paginationDocumentMarker = Math.random(); });
      const marker = await page.evaluate(() => window.paginationDocumentMarker);
      await bottom(page);
      await page.locator('#reader .article-pagination').scrollIntoViewIfNeeded();
      const layout = await page.locator('#reader .article-pagination').evaluate(nav => {
        const viewport = document.querySelector('#reading-scroll').getBoundingClientRect();
        const links = [...nav.querySelectorAll('a')].map(link => {
          const rect = link.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        });
        const sheet = document.querySelector('#reading-scroll');
        return { links, overflow: sheet.scrollWidth > sheet.clientWidth + 1,
          clipped: links.some(rect => rect.left < viewport.left || rect.right > viewport.right || rect.bottom > viewport.bottom + 1),
          stacked: links[1].top >= links[0].bottom, transition: getComputedStyle(nav.querySelector('.article-pagination-arrow')).transitionDuration };
      });
      assert.equal(layout.overflow, false);
      assert.equal(layout.clipped, false);
      assert.equal(layout.stacked, width <= 520);
      assert.ok(layout.links.every(link => link.height >= 44));
      if (reduce) assert.ok(parseFloat(layout.transition) <= .001, 'Reduced motion must have no perceptible transition');
      await page.screenshot({ path: path.join(__dirname, name + '.png') });
      if (name === 'desktop') {
        await page.locator('#reader .article-pagination-next').hover();
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(__dirname, 'desktop-hover.png') });
        await page.locator('#reader .article-pagination-previous').focus();
        assert.equal(await page.locator('#reader .article-pagination-previous').evaluate(link => link.matches(':focus-visible')), true);
        await page.screenshot({ path: path.join(__dirname, 'desktop-focus.png') });
      }
      await navigate(page, 'next', next);
      assert.equal(await page.evaluate(() => window.paginationDocumentMarker), marker, 'Changing articles must keep the same document');
      assert.equal(await page.locator('#reading-progress').textContent(), '0%');
      await page.goBack();
      await ready(page);
      await page.goForward();
      await ready(page, next);
      await page.locator('#close-reader').click();
      await page.waitForFunction(() => !document.querySelector('#reader').open);
      assert.equal(new URL(page.url()).pathname, '/');
      assert.deepEqual(errors, []);
      reports.push({ name, viewport: [width, height], layout, inPlaceNavigation: true, history: true, close: true, errors });
      console.log(name + ': layout, in-place navigation, history and close passed');
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/archives/', { waitUntil: 'domcontentloaded' });
    await page.locator('#collection-panel[open]').waitFor();
    await page.locator(`#collection-panel a[data-starry-article-id="${current.id}"]`).click();
    await ready(page);
    await navigate(page, 'next', next);
    await navigate(page, 'next', articles[currentIndex + 2]);
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open && document.querySelector('#collection-panel').open);
    assert.equal(new URL(page.url()).pathname, '/archives/');
    reports.push({ name: 'collection-return', consecutiveArticles: 3, restoredCollection: true });
    console.log('collection: closing three consecutive articles restores the entry collection');

    await page.goto(origin + '/' + current.path, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await bottom(page);
    const before = { url: page.url(), scroll: await page.locator('#reading-scroll').evaluate(element => element.scrollTop) };
    const nextUrl = origin + '/' + encodeURI(next.path);
    await page.route(nextUrl, route => route.abort());
    await page.locator('#reader .article-pagination-next').click();
    await page.waitForFunction(() => !document.querySelector('#reader .article-pagination').hasAttribute('aria-busy'));
    assert.equal(page.url(), before.url);
    assert.equal(await page.locator('#reader-title').textContent(), current.title);
    assert.equal(await page.locator('#reading-scroll').evaluate(element => element.scrollTop), before.scroll);
    await page.unroute(nextUrl);
    await navigate(page, 'next', next);
    reports.push({ name: 'failed-request', keptArticleAddressAndScroll: true, retry: true });
    console.log('failure: current article, address and scroll preserved; retry passed');

    await page.goto(origin + '/' + current.path, { waitUntil: 'domcontentloaded' });
    await ready(page);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(nextUrl, async route => { await gate; await route.continue(); });
    await bottom(page);
    await page.locator('#reader .article-pagination-next').click();
    await page.waitForFunction(() => document.querySelector('#reader .article-pagination').getAttribute('aria-busy') === 'true');
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open);
    release();
    await page.waitForFunction(() => !document.querySelector('.article-pagination').hasAttribute('aria-busy'));
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.locator('#reader').evaluate(reader => reader.open), false);
    reports.push({ name: 'interrupted-request', closedReaderStaysClosed: true });
    console.log('interrupted load: closing the reader cancels pending navigation');
    assert.deepEqual(errors, []);
    await page.unroute(nextUrl);
    await page.setViewportSize({ width: 320, height: 568 });
    const longTitlesArticle = articles[articles.length - 2];
    await page.goto(origin + '/' + longTitlesArticle.path, { waitUntil: 'domcontentloaded' });
    await ready(page, longTitlesArticle);
    await bottom(page);
    const longTitles = await page.locator('#reader .article-pagination').evaluate(nav => {
      const scroller = document.querySelector('#reading-scroll');
      return { overflow: scroller.scrollWidth > scroller.clientWidth,
        titles: [...nav.querySelectorAll('.article-pagination-title')].map(title => ({ text: title.textContent, height: title.getBoundingClientRect().height })) };
    });
    assert.equal(longTitles.overflow, false);
    assert.ok(longTitles.titles.every(title => title.height > 0));
    await page.screenshot({ path: path.join(__dirname, 'narrow-long-titles.png') });
    reports.push({ name: 'long-titles', viewport: [320, 568], ...longTitles });
    await page.close();

    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await staticPage.goto(origin + '/' + current.path);
    await staticPage.locator('.article-pagination-next').click();
    assert.equal(decodeURI(new URL(staticPage.url()).pathname), '/' + next.path);
    assert.equal(await staticPage.locator('#reader-title').textContent(), next.title);
    reports.push({ name: 'no-javascript', nativeLinks: true });
    await staticPage.close();
    console.log('static fallback: native article links passed');
    await fs.writeFile(path.join(__dirname, 'browser-summary.json'), JSON.stringify(reports, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
