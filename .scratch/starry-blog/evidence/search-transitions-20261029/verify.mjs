import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4187/';
const root = new URL('./', import.meta.url), reports = [];
const opened = page => page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
const closed = page => page.waitForFunction(() => !document.querySelector('#star-search').open);
try {
  for (const [name, width, height, soft = false, reduce = false] of [
    ['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 320, 568], ['landscape', 844, 390],
    ['soft', 1440, 900, true], ['reduced', 1440, 900, false, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + (soft ? '?motion=soft' : ''));
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.locator('#room-thought').click();
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    await page.locator('#search-entry').click(); await opened(page);
    assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'), 'true');
    const count = await page.locator('#search-results .search-result').count();
    assert.ok(count > 0);
    const pose = await page.evaluate(() => {
      const dialog = document.querySelector('#star-search'), rect = dialog.getBoundingClientRect();
      return { width: rect.width, left: rect.left, right: rect.right, heading: getComputedStyle(document.querySelector('.search-heading')).opacity,
        star: getComputedStyle(document.querySelector('.search-map-star'), '::before').opacity,
        backdrop: getComputedStyle(dialog, '::backdrop').backdropFilter,
        autofocus: document.activeElement?.id };
    });
    assert.ok(pose.left >= 0 && pose.right <= width + 1, 'Chart fits viewport');
    assert.equal(Number(pose.heading), 1); assert.ok(Number(pose.star) > .9, 'Stars finish igniting');
    assert.equal(pose.backdrop, soft ? 'blur(0px)' : 'blur(1.2px)');
    if (width < 900) assert.notEqual(pose.autofocus, 'search-query');
    await page.screenshot({ path: new URL(`${name}-open.png`, root).pathname });
    await page.locator('#search-index-toggle').click(); await page.waitForTimeout(550);
    assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'), 'false');
    await page.locator('.search-map-star:not(:disabled)').first().evaluate(node => node.click());
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
    await page.locator('#close-reader').click(); await opened(page);
    assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'), 'false', 'Reading preserves collapsed index');
    await page.keyboard.press('Escape'); await closed(page);
    await page.locator('#search-entry').click(); await opened(page);
    assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'), 'true');
    await page.locator('[data-filter="magnitude"] button[data-value="1.0"]').click();
    const enabled = await page.locator('.search-map-star:not(:disabled)').count();
    assert.ok(enabled < count);
    assert.equal(enabled, await page.locator('#search-results .search-result').count());
    await page.locator('.search-map-star:disabled').first().evaluate(node => node.click());
    assert.equal(await page.locator('#reader').evaluate(node => node.open), false);
    await page.locator('[data-filter="magnitude"] button[data-value="1.0"]').click();
    await page.locator('#search-query').fill('SLD-0001');
    assert.equal(await page.locator('#search-results .search-result').count(), 1);
    await page.locator('#search-clear').click();
    assert.equal(await page.locator('#search-results .search-result').count(), count);
    await page.keyboard.press('Escape'); await closed(page);
    await page.locator('#search-entry').click(); await page.keyboard.press('Escape'); await closed(page);
    await page.waitForTimeout(1600);
    assert.equal(await page.locator('#star-search').evaluate(node => node.open), false, 'Cancelled preparation stays closed');
    assert.equal(await page.locator('#star-search').getAttribute('aria-busy'), null);
    await page.locator('#search-entry').click(); await opened(page);
    assert.equal(await page.locator('#search-index-toggle').getAttribute('aria-expanded'), 'true');
    assert.deepEqual(errors, []);
    reports.push({ name, count, pose, filters: true, readingReturn: true, interruptedOpen: true, errors });
    await fs.writeFile(new URL('verification-summary.json', root), JSON.stringify(reports, null, 2) + '\n');
    console.log(JSON.stringify(reports.at(-1))); await context.close();
  }
  // Stalled optional title fonts must neither trap the chart nor let an old
  // preparation callback interrupt a newer opening.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route('**/fonts/lxgw-marker-chunks/**', route => new Promise(resolve => setTimeout(resolve, 10000)).then(() => route.abort()).catch(() => {}));
  await page.goto(url + '?motion=soft');
  await page.waitForSelector('body.starry-ready', { state: 'attached' });
  await page.locator('#window-entry').click();
  await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
  await page.locator('#search-entry').click(); await page.keyboard.press('Escape'); await closed(page);
  await page.locator('#search-entry').click();
  const start = Date.now(); await opened(page);
  assert.ok(Date.now() - start < 2500, 'Optional fonts have a bounded waiting budget');
  await page.waitForTimeout(1700);
  assert.equal(await page.locator('#star-search').getAttribute('data-motion'), null);
  assert.ok(await page.locator('#search-results .search-result').count() > 0);
  reports.push({ name: 'stalled-fonts', bounded: true, staleCallback: false });
  console.log(JSON.stringify(reports.at(-1)));
  await context.close();
  await fs.writeFile(new URL('verification-summary.json', root), JSON.stringify(reports, null, 2) + '\n');
} finally { await browser.close(); }
