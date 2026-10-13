import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const base = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const suffix = process.env.STARFIELD_EVIDENCE_SUFFIX || '';
const results = [];
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390], [844, 300]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900, isMobile: width < 900 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('body.starry-ready', { state: 'attached' });
    await page.locator('#window-entry').evaluate(button => button.click());
    await page.waitForFunction(() => document.body.dataset.room === 'outside' && !document.body.dataset.arrival);
    const articles = await page.evaluate(async () => (await (await fetch(document.body.dataset.starryIndex)).json()).articles);
    await page.locator('#star-targets button').first().evaluate(button => button.click());
    await page.waitForFunction(() => !document.querySelector('#preview').hidden && !document.querySelector('#read-button').disabled);
    await page.locator('#preview img').evaluateAll(images => Promise.all(images.filter(image => image.src).map(image => image.decode())));
    await page.waitForFunction(() => ['.observation-silhouette canvas', '.observation-waveform canvas']
      .every(selector => !document.querySelector(selector).hidden));
    const animation = await page.evaluate(async () => {
      const selectors = ['.observation-silhouette canvas', '.observation-waveform canvas'];
      const samples = selectors.map(() => new Set());
      for (let frame = 0; frame < 4; frame++) {
        selectors.forEach((selector, index) => samples[index].add(document.querySelector(selector).toDataURL()));
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return { walkerFrames: samples[0].size, waveformFrames: samples[1].size };
    });
    assert.ok(animation.walkerFrames > 1, 'the original walking poses must continue changing');
    assert.ok(animation.waveformFrames > 1, 'the original frequency waveform must continue changing');
    const measurement = await page.evaluate(() => {
      const bounds = selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, right: x + width, bottom: y + height };
      };
      const button = bounds('#read-button'), image = bounds('.read-label'), rule = bounds('.read-rule');
      const hits = [[1, 1], [button.width - 1, 1], [1, button.height - 1], [button.width - 1, button.height - 1],
        [button.width / 2, button.height / 2]].map(([x, y]) => document.elementFromPoint(button.x + x, button.y + y)?.closest('#read-button')?.id);
      const outside = [[-2, button.height / 2], [button.width + 2, button.height / 2],
        [button.width / 2, -2], [button.width / 2, button.height + 2]]
        .map(([x, y]) => Boolean(document.elementFromPoint(button.x + x, button.y + y)?.closest('#read-button')));
      return { button, image, rule, hits, outside, id: bounds('#preview-id'), idLabel: bounds('.observation-id'),
        year: bounds('.is-current .year-number'), unit: bounds('.year-unit'), starlink: bounds('.observation-call > img'),
        call: bounds('.call-label'), bracket: bounds('.observation-bracket'), ticks: bounds('.observation-ticks'),
        loaded: [...document.querySelectorAll('#preview img')].filter(image => image.src).every(image => image.complete && image.naturalWidth > 0),
        panel: bounds('#preview'), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(measurement.loaded, true);
    assert.equal(measurement.overflow, false);
    assert.ok(measurement.button.height >= 44);
    assert.ok(measurement.button.right <= width && measurement.button.bottom <= height);
    assert.ok(measurement.panel.x >= 0 && measurement.panel.right <= width && measurement.panel.y >= 0 && measurement.panel.bottom <= height);
    for (const part of [measurement.image, measurement.rule]) {
      assert.ok(part.x >= measurement.button.x - .1 && part.y >= measurement.button.y - .1);
      assert.ok(part.right <= measurement.button.right + .1 && part.bottom <= measurement.button.bottom + .1);
    }
    assert.deepEqual(measurement.hits, Array(5).fill('read-button'));
    assert.deepEqual(measurement.outside, Array(4).fill(false));
    assert.ok(measurement.id.x > measurement.idLabel.right);
    assert.ok(measurement.id.right < measurement.button.x, 'ID must stay outside the READ hit area');
    assert.ok(measurement.year.right < measurement.unit.x, 'year digits must stay before YE');
    assert.ok(measurement.starlink.bottom <= measurement.call.y + .1, 'CALL must stay below STARLINK');
    assert.ok(measurement.bracket.right < measurement.ticks.x);
    await page.screenshot({ path: fileURLToPath(new URL(`./${width}x${height}${suffix}.png`, import.meta.url)) });
    await page.locator('#preview').screenshot({ path: fileURLToPath(new URL(`./panel-${width}x${height}${suffix}.png`, import.meta.url)) });
    const future = await page.evaluate(async () => {
      const { renderGlyphs } = await import('/js/starfield/observation.js');
      const id = document.querySelector('#preview-id');
      renderGlyphs(id, 'SLD-10000 · 2.5', document.querySelector('#preview').dataset.assetRoot);
      await Promise.all([...id.querySelectorAll('img')].map(image => image.decode()));
      return { right: id.getBoundingClientRect().right, readLeft: document.querySelector('#read-button').getBoundingClientRect().left };
    });
    assert.ok(future.right < future.readLeft, 'future five-digit IDs must stay outside READ');
    // Use physical coordinates for the rule, arrow, word and lower triangle/Me artwork.
    const imagePoints = [[.06, .31], [.5, .28], [.3, .78], [.77, .62]];
    const points = [{ x: measurement.rule.x + 2, y: measurement.rule.y + 2 },
      ...imagePoints.map(([x, y]) => ({ x: measurement.image.x + x * measurement.image.width, y: measurement.image.y + y * measurement.image.height }))];
    for (const point of points) {
      await page.waitForFunction(() => !document.querySelector('#read-button').disabled);
      if (width < 900) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => document.body.dataset.reading === 'open');
      assert.equal(await page.locator('#reader .article').getAttribute('data-starry-id'), articles[0].id);
      await page.locator('#close-reader').click();
      await page.waitForFunction(() => !document.querySelector('#reader').open && !document.querySelector('#read-button').disabled);
    }
    await page.locator('#read-button').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.body.dataset.reading === 'open');
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open && !document.querySelector('#read-button').disabled);
    await page.locator('#time-mode').click();
    await page.waitForFunction(() => document.querySelector('#time-mode').getAttribute('aria-pressed') === 'true' && !document.querySelector('#read-button').disabled);
    assert.deepEqual(errors, []);
    results.push({ viewport: { width, height }, animation, measurement, future, coordinateClicks: points.length, keyboard: 'passed', timeMode: 'passed', errors });
    console.log(`${width}x${height}: animation, layout, five graphic click points, keyboard and time mode passed`);
    await context.close();
  }
  await fs.writeFile(new URL(`./browser${suffix}-summary.json`, import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); }
