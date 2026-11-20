// Run against npm start, with PLAYWRIGHT_MODULE pointing at a Playwright installation if needed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const viewport of [{ width: 1040, height: 694 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:4175/2026/10/24/设计思路与灵感/#article-comments');
    await page.waitForFunction(() => document.activeElement.matches('#article-comments [name="nick"]'));
    const box = selector => page.locator(selector).boundingBox();
    const [reader, scroll, heading, submit, footer, close] = await Promise.all([
      '#reader', '#reading-scroll', '#article-comments h2', '.comment-send', '.reading-footer', '#close-reader',
    ].map(box));
    const bottom = rect => rect.y + rect.height;
    assert.ok(Math.abs(bottom(footer) - bottom(reader)) <= 1, 'footer stays flush with the reader');
    assert.ok(close.y >= reader.y, 'close button stays inside the reader');
    assert.ok(heading.y >= scroll.y && bottom(submit) <= bottom(scroll), 'comment heading and form are visible');
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.getElementById('reader').open);
    await page.close();
  }
} finally {
  await browser.close();
}
