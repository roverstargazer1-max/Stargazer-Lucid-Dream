import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const folder = new URL('./', import.meta.url);
const file = name => new URL(name, folder).pathname.replace(/^\/([A-Z]:)/i, '$1');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const report = [];
const controls = [['search', '.search-submit', '.search-submit-art'], ['arrow', '#search-index-toggle', '.search-toggle-feedback'], ['close', '#close-search', '#close-search img']];

async function settled(page) {
  await page.waitForFunction(() => !document.querySelector('#star-search').dataset.motion && !document.querySelector('#star-search').getAnimations({ subtree: true }).length);
}
async function visual(page, selector) {
  return page.locator(selector).evaluate(el => ({ transform: getComputedStyle(el).transform, filter: getComputedStyle(el).filter, transition: getComputedStyle(el).transitionDuration }));
}
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1440, height: 1000 }, 'no-preference'],
    ['mobile', { width: 390, height: 844 }, 'no-preference'],
    ['narrow', { width: 320, height: 568 }, 'no-preference'],
    ['landscape', { width: 844, height: 390 }, 'no-preference'],
    ['reduced', { width: 1440, height: 1000 }, 'reduce'],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4175/?motion=soft');
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'));
    const window = await page.locator('#window-entry').boundingBox();
    await page.locator('#window-entry').click({ position: { x: window.width * .35, y: window.height * .25 } });
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    await page.locator('#search-entry').click();
    await settled(page);
    await page.locator('#search-index-toggle').click();
    await settled(page);
    await page.waitForFunction(() => [...document.querySelectorAll('#star-search img')].every(img => img.complete && img.naturalWidth));
    await page.mouse.move(0, 0);
    await settled(page);

    // Compare the split crop at rest with the original complete v3 frame.
    await page.locator('.search-bar').screenshot({ path: file(name + '-rest.png') });
    await page.evaluate(() => { document.querySelector('.search-frame').style.clipPath = 'none'; document.querySelector('.search-submit-art').hidden = true; });
    await page.locator('.search-bar').screenshot({ path: file(name + '-original.png') });
    await page.evaluate(() => { document.querySelector('.search-frame').style.removeProperty('clip-path'); document.querySelector('.search-submit-art').hidden = false; });

    const states = [];
    for (const [control, button, artwork] of controls) {
      await page.locator(button).scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0); await settled(page);
      const before = await page.locator(button).boundingBox(), rest = await visual(page, artwork);
      const direction = await visual(page, '.search-toggle-arrow');
      await page.locator(button).hover(); await settled(page);
      const hover = await visual(page, artwork), after = await page.locator(button).boundingBox();
      assert.deepEqual(after, before, name + ': ' + control + ' hit area moved');
      assert.match(hover.filter, /brightness\(1\./);
      assert.equal(hover.transform === 'none', reducedMotion === 'reduce');
      assert.equal((await visual(page, '.search-toggle-arrow')).transform, direction.transform);
      if (name === 'desktop') await page.screenshot({ path: file(control + '-hover.png') });
      await page.mouse.move(0, 0); await settled(page);
      assert.equal((await visual(page, artwork)).transform, rest.transform);
      await page.keyboard.press('Tab'); await page.locator(button).focus(); await settled(page);
      assert.equal(await page.locator(button).evaluate(el => el.matches(':focus-visible')), true);
      const focus = await visual(page, artwork);
      assert.match(focus.filter, /brightness\(1\./);
      assert.equal(focus.transform === 'none', reducedMotion === 'reduce');
      await page.locator('#search-query').focus(); await settled(page);
      states.push({ control, rest, hover, focus, hitAreaStable: true });
    }
    await page.locator('#search-index-toggle').click(); await settled(page);
    await page.locator('#search-index-toggle').hover(); await settled(page);
    const collapsed = await visual(page, '.search-toggle-arrow');
    const collapsedFeedback = await visual(page, '.search-toggle-feedback');
    assert.match(collapsed.transform, /matrix\(0, 1, -1, 0,/);
    await page.locator('#search-index-toggle').click(); await settled(page);
    assert.match((await visual(page, '.search-toggle-arrow')).transform, /matrix\(1, 0, 0, 1,/);
    await page.locator('#search-query').fill('SLD-0006');
    await page.locator('.search-submit').click();
    await page.waitForFunction(() => document.querySelectorAll('.search-result').length === 1);
    assert.match(await page.locator('.search-result').textContent(), /慢/);
    await page.locator('.search-result').click();
    await page.waitForFunction(() => document.querySelector('#reader').open && !document.querySelector('#reader').dataset.motion);
    await page.locator('#close-reader').click(); await settled(page);
    assert.equal(await page.locator('#search-query').inputValue(), 'SLD-0006');
    await page.locator('#close-search').click();
    await page.waitForFunction(() => !document.querySelector('#star-search').open);
    assert.deepEqual(errors, []);
    report.push({ name, viewport, reducedMotion, states, collapsed, collapsedFeedback, errors, interaction: 'search, index collapse/expand, direct reading and return, close passed' });
    await page.close();
  }
  await fs.writeFile(file('browser-summary.json'), JSON.stringify(report, null, 2));
  console.log(report.map(({ name, states, interaction }) => ({ name, controls: states.map(({ control }) => control), interaction })));
} finally { await browser.close(); }
