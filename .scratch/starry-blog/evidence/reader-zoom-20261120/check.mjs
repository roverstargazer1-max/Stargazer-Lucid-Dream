// Run with the local preview on port 4175 and PLAYWRIGHT_MODULE set if needed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome' });
const article = 'http://127.0.0.1:4175/2026/10/24/设计思路与灵感/';
try {
  for (const mobile of [false, true]) {
    const defaultZoom = mobile ? 100 : 70;
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1026, height: 684 },
      hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = () => page.waitForFunction(() => document.body.dataset.reading === 'open');
    await page.goto(article);
    await ready();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#reading-content-slot').evaluate(node => Number(getComputedStyle(node).zoom)), defaultZoom / 100);
    const sample = page.locator('#reader-content p').filter({ hasText: '主页是一张屋内的插画' }).first();
    await sample.evaluate(p => {
      const scroll = document.querySelector('#reading-scroll');
      const rect = p.getBoundingClientRect();
      scroll.scrollTop += rect.top + rect.height / 2 - (scroll.getBoundingClientRect().top + scroll.clientHeight / 2);
    });
    const layout = () => sample.evaluate(p => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const scroll = document.querySelector('#reading-scroll');
      const rect = p.getBoundingClientRect();
      const glyph = new Range();
      glyph.selectNodeContents(p.firstChild);
      const lines = glyph.getClientRects();
      const lineHeight = lines[1].top - lines[0].top;
      return {
        width: box('#reader').width, height: box('#reader').height,
        visibleLines: scroll.clientHeight / lineHeight, articleHeight: box('#reading-content-slot').height,
        centerOffset: rect.top + rect.height / 2 - (box('#reading-scroll').top + scroll.clientHeight / 2),
        overflow: scroll.scrollWidth - scroll.clientWidth, footerGap: box('#reader').bottom - box('.reading-footer').bottom,
      };
    });
    const original = await layout();
    const button = page.getByRole('button', { name: '缩放', exact: true });
    const slider = page.getByRole('slider', { name: '版面缩放' });
    if (mobile) await button.tap();
    else await button.click();
    assert.equal(await slider.inputValue(), String(defaultZoom));
    const track = await slider.boundingBox();
    if (!mobile) {
      await page.mouse.move(track.x + track.width * (defaultZoom - 60) / 60, track.y + track.height / 2);
      await page.mouse.down();
      await page.mouse.move(track.x + 1, track.y + track.height / 2, { steps: 12 });
      await page.mouse.up();
    } else {
      await page.touchscreen.tap(track.x + 1, track.y + track.height / 2);
    }
    assert.equal(await slider.inputValue(), '60');
    assert.equal((await slider.boundingBox()).x, track.x, 'track stays under the pointer as the page narrows');
    const compact = await layout();
    assert.equal(compact.height, original.height);
    assert.ok(mobile ? compact.width === original.width : compact.width < compact.height);
    assert.ok(compact.visibleLines > original.visibleLines * (defaultZoom / 60) * .95);
    assert.ok(compact.articleHeight < original.articleHeight);
    assert.ok(Math.abs(compact.centerOffset) < 12, 'the paragraph being read stays in place');
    assert.equal(compact.overflow, 0);
    assert.ok(Math.abs(compact.footerGap) < 1);
    await slider.focus();
    await slider.press('ArrowRight');
    assert.equal(await slider.getAttribute('aria-valuetext'), '61%');
    await slider.press('Escape');
    assert.ok(await button.isVisible());
    assert.equal(await slider.isVisible(), false);
    await page.goto(article + '#article-comments');
    await page.reload();
    await page.waitForFunction(() => document.activeElement.matches('#article-comments [name=nick]'));
    await button.click();
    assert.equal(await slider.inputValue(), '61');
    await slider.press('End');
    assert.equal(await slider.inputValue(), '120');
    const enlarged = await layout();
    assert.ok(enlarged.visibleLines < original.visibleLines);
    assert.equal(enlarged.overflow, 0);
    await page.getByRole('button', { name: '恢复默认' }).click();
    assert.equal(await slider.inputValue(), String(defaultZoom));
    await slider.press('Escape');
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open);
    assert.deepEqual(errors, []);
    console.log({ mobile, original, compact });
    await page.close();
  }
} finally {
  await browser.close();
}
