import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const root = new URL('./', import.meta.url), reports = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['landscape', 844, 390]]) {
    const poses = [];
    for (const [variant, url] of [['before', 'http://127.0.0.1:4188/'], ['after', 'http://127.0.0.1:4187/']]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      await page.goto(url);
      await page.waitForSelector('body.starry-ready', { state: 'attached' });
      await page.locator('#room-thought').click();
      await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
      await page.locator('#search-entry').click();
      await page.waitForFunction(() => document.querySelector('#star-search').open && !document.querySelector('#star-search').dataset.motion);
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      await page.locator('#star-search').evaluate(node => node.focus());
      await page.addStyleTag({ content: '#world,#room{visibility:hidden!important}body{background:#0b1740!important}#star-search::backdrop{background:transparent!important;backdrop-filter:none!important}#star-search,#star-search *,#star-search::after,#star-search *::before,#star-search *::after{transition:none!important;animation:none!important}' });
      for (const value of [.25, .6, 1, 'rest']) {
        const styles = await page.evaluate(value => {
          const dialog = document.querySelector('#star-search');
          if (value === 'rest') delete dialog.dataset.motion;
          else dialog.dataset.motion = 'opening';
          for (const layer of [dialog, ...dialog.querySelectorAll('.search-artboard,.search-map,.search-heading,.search-bar,.search-filters,#search-index-toggle,.search-map canvas,.search-map-star')]) layer.style.setProperty('--unfold', value === 'rest' ? 1 : value);
          return ['#star-search', '.search-artboard', '.search-map', '.search-heading', '.search-bar', '.search-filters', '#search-index-toggle', '.search-map canvas', '.search-map-star'].map(selector => {
            const css = getComputedStyle(document.querySelector(selector)), star = getComputedStyle(document.querySelector(selector), '::before');
            return { selector, transform: css.transform, opacity: css.opacity, clipPath: css.clipPath, starOpacity: selector === '.search-map-star' ? star.opacity : null, starScale: selector === '.search-map-star' ? star.scale : null };
          });
        }, value);
        poses.push({ variant, value, styles });
        await page.locator('#star-search').screenshot({ path: new URL(`visual-${name}-${variant}-${value}.png`, root).pathname });
      }
      await page.close();
    }
    const rounded = styles => JSON.parse(JSON.stringify(styles).replace(/-?\d+\.\d+/g, number => Number(Number(number).toFixed(4))));
    for (const value of [.25, .6, 1, 'rest']) {
      const styles = variant => poses.find(pose => pose.variant === variant && pose.value === value).styles.map(style => value === 'rest' && style.selector === '#star-search' ? { ...style, clipPath: 'covered; verified by pixels.py' } : style);
      assert.deepEqual(rounded(styles('before')), rounded(styles('after')), `${name} / ${value}: approved motion pose changed`);
    }
    reports.push({ name, poses: 4, styleTolerance: .0001, equivalent: true });
    console.log(JSON.stringify(reports.at(-1)));
  }
  await fs.writeFile(new URL('visual-summary.json', root), JSON.stringify(reports, null, 2) + '\n');
} finally { await browser.close(); }
