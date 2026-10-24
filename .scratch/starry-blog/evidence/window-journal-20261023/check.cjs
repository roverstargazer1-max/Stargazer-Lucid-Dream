const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(process.env.JOURNAL_EVIDENCE_DIR || __dirname);
fs.mkdirSync(output, { recursive: true });
const base = process.env.STARFIELD_PREVIEW_URL || 'http://127.0.0.1:4175';
let activeBrowser;

(async () => {
  const browser = activeBrowser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  for (const settings of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844, mobile: true },
    { name: 'narrow', width: 320, height: 568, mobile: true },
    { name: 'landscape', width: 844, height: 390, mobile: true },
    { name: 'reduced', width: 390, height: 844, reduced: true },
    { name: 'soft', width: 1440, height: 900, soft: true },
  ]) {
    const context = await browser.newContext({ viewport: { width: settings.width, height: settings.height }, isMobile: !!settings.mobile,
      hasTouch: !!settings.mobile, reducedMotion: settings.reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/${settings.soft ? '?motion=soft' : ''}`);
    await page.waitForFunction(() => document.body.classList.contains('starry-ready'));
    const trigger = page.locator(await page.evaluate(() => document.body.dataset.bookVisible === 'false' ? '#room-journal-shortcut' : '#room-journal'));
    assert.ok(await trigger.isVisible());
    const triggerBox = await trigger.boundingBox();
    assert.ok(triggerBox.x >= 0 && triggerBox.x + triggerBox.width <= settings.width);
    if (settings.name === 'desktop') {
      await trigger.hover();
      if (process.env.JOURNAL_SCREENSHOTS !== '0') await page.screenshot({ path: path.join(output, 'room-entry.png') });
    }
    await trigger.click();
    await page.waitForSelector('#window-journal .journal-demo');
    await page.waitForFunction(() => document.querySelector('#window-journal').dataset.state === 'open');
    assert.equal(await page.locator('#window-journal [data-month]:visible').count(), 1);
    assert.equal(await page.locator('#window-journal .journal-permalink').count(), 0);
    const texture = await page.locator('#window-journal .journal-scroll').evaluate(element => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, attachment: style.backgroundAttachment, repeat: style.backgroundRepeat };
    });
    assert.ok(texture.image.includes(settings.width <= 760 ? 'sky-repeat-mobile-v1.webp' : 'sky-repeat-desktop-v1.webp'));
    assert.ok(texture.attachment.split(',').every(value => value.trim() === 'local'));
    await page.locator('#window-journal .journal-archive summary').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#window-journal').evaluate(element => element.open), true, 'Escape first dismisses the month menu');
    await page.locator('#window-journal [data-journal-older]').click();
    await page.waitForFunction(() => document.querySelector('#window-journal [data-month="2026-09"]').hidden === false && !document.querySelector('#window-journal [data-journal-months]').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#window-journal [data-month="2026-09"] .journal-day').count(), 4);
    assert.equal(await page.locator('#window-journal [data-month="2026-09"] .journal-entry').count(), 5);
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector('#window-journal'), sheet = dialog.querySelector('.journal-sheet'), scroll = dialog.querySelector('.journal-scroll');
      const box = sheet.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, scrollOverflow: scroll.scrollWidth > scroll.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth, months: dialog.querySelectorAll('[data-month]').length };
    });
    console.log(JSON.stringify({ name: settings.name, geometry }));
    assert.ok(geometry.left >= 0 && geometry.top >= 0 && geometry.right <= settings.width + 1 && geometry.bottom <= settings.height + 1);
    assert.equal(geometry.scrollOverflow, false);
    assert.equal(geometry.pageOverflow, false);
    if (process.env.JOURNAL_SCREENSHOTS !== '0') await page.screenshot({ path: path.join(output, `${settings.name}.png`) });
    await page.locator('#window-journal .journal-archive summary').click();
    await page.locator('#window-journal [data-journal-month="2026-06"]').click();
    await page.waitForFunction(() => document.querySelector('#window-journal [data-month="2026-06"]').hidden === false && !document.querySelector('#window-journal [data-journal-months]').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#window-journal [data-journal-older]').isDisabled(), true);
    await page.locator('#window-journal [data-journal-newer]').click();
    await page.waitForTimeout(40);
    await page.locator('#window-journal [data-journal-newer]').click();
    await page.waitForTimeout(40);
    await page.locator('#window-journal [data-journal-newer]').click();
    await page.waitForFunction(() => document.querySelector('#window-journal [data-month="2026-10"]').hidden === false && !document.querySelector('#window-journal [data-journal-months]').hasAttribute('aria-busy'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#window-journal').open);
    assert.equal(await page.evaluate(() => document.body.dataset.room), 'inside');
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    for (let i = 0; i < 3; i++) {
      await trigger.click();
      await page.waitForTimeout(55);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#window-journal').open);
    }
    assert.equal(await page.evaluate(() => document.body.dataset.journalOpen || ''), '');
    assert.deepEqual(errors, []);
    results.push({ name: settings.name, geometry, texture, errors, rapidOpenClose: 'passed', rapidMonthChanges: 'passed' });
    await context.close();
  }

  const direct = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await direct.goto(`${base}/journal/`);
  assert.equal(await direct.locator('.journal-permalink').count(), 0);
  const targetId = await direct.locator('[data-month="2026-08"] .journal-entry').first().getAttribute('id');
  await direct.goto(`${base}/journal/#${targetId}`);
  assert.equal(await direct.locator('[data-month="2026-08"]').isVisible(), true);
  await direct.reload();
  assert.equal(await direct.locator('[data-month="2026-08"]').isVisible(), true);
  await direct.close();

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await staticPage.goto(`${base}/journal/`);
  assert.equal(await staticPage.locator('.journal-entry').count(), 9);
  assert.equal(await staticPage.locator('[data-month]:visible').count(), 4);
  await noScript.close();

  const failure = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await failure.route('**/journal/', route => route.abort());
  await failure.goto(base);
  await failure.waitForFunction(() => document.body.classList.contains('starry-ready'));
  await failure.locator('#room-journal').click();
  await failure.waitForSelector('[data-journal-retry]');
  await failure.unroute('**/journal/');
  await failure.locator('[data-journal-retry]').click();
  await failure.waitForSelector('#window-journal .journal-entry');
  await failure.keyboard.press('Escape');
  await failure.waitForFunction(() => !document.querySelector('#window-journal').open);
  await failure.close();

  await browser.close();
  fs.writeFileSync(path.join(output, 'browser-summary.json'), JSON.stringify({ results, independentLinks: 'passed', noJavaScript: 'passed', fetchFailureAndRetry: 'passed' }, null, 2));
  console.log(JSON.stringify({ checked: results.length, independentLinks: 'passed', noJavaScript: 'passed', fetchFailureAndRetry: 'passed' }));
})().catch(async error => { console.error(error); await activeBrowser?.close(); process.exitCode = 1; });
