import { chromium } from 'file:///C:/Users/diamo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = new URL('./', import.meta.url);
const file = name => new URL(name, root).pathname.replace(/^\/([A-Z]:)/i, '$1');
const index = await (await fetch('http://127.0.0.1:4175/starry/index.json')).json();
const article = index.articles.find(article => article.title.includes('活在真实天空'));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/diamo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const report = [];

async function sample(page) {
  const pixels = await page.locator('.reading-walker canvas').evaluate(canvas => {
    const rect = canvas.parentElement.getBoundingClientRect();
    return { pixels: canvas.toDataURL(), left: rect.left, top: rect.top,
      fraction: document.getElementById('reading-journey').style.getPropertyValue('--reading-fraction'),
      hidden: canvas.hidden, tier: document.body.dataset.renderQuality, motion: document.body.dataset.motion };
  });
  const hash = createHash('sha256').update(pixels.pixels).digest('hex');
  delete pixels.pixels;
  return { hash, ...pixels };
}

try {
  for (const [name, viewport, reducedMotion, query = '', low = false] of process.argv.includes('--all') ? [
    ['desktop', { width: 1440, height: 1000 }, 'no-preference'],
    ['mobile', { width: 390, height: 844 }, 'no-preference'],
    ['soft', { width: 1440, height: 1000 }, 'no-preference', '?motion=soft'],
    ['low', { width: 1440, height: 1000 }, 'no-preference', '', true],
    ['reduced', { width: 1440, height: 1000 }, 'reduce'],
  ] : process.argv.includes('--soft') ? [['soft', { width: 1440, height: 1000 }, 'no-preference', '?motion=soft']]
    : [['desktop', { width: 1440, height: 1000 }, 'no-preference']]) {
    const page = await browser.newPage({ viewport, reducedMotion }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (low) await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 1 });
    });
    await page.goto('http://127.0.0.1:4175/' + article.path + query);
    await page.waitForFunction(() => document.querySelector('#reader').open && !document.querySelector('#reader').dataset.motion);
    await page.waitForFunction(() => {
      const atlas = document.querySelector('.reading-walker .silhouette-frames');
      return atlas.complete && atlas.naturalWidth > 0;
    });
    await page.waitForTimeout(600);
    const idle = [];
    for (let i = 0; i < 4; i++) { idle.push(await sample(page)); await page.waitForTimeout(210); }
    const scrolling = [];
    for (const fraction of [.2, .4, .65]) {
      await page.locator('#reading-scroll').evaluate((el, fraction) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction; }, fraction);
      await page.waitForTimeout(120);
      scrolling.push(await sample(page));
    }
    report.push({ name, viewport, idle, scrolling, errors });
    await fs.writeFile(file('browser-summary.json'), JSON.stringify(report, null, 2));
    assert.ok(idle.every(s => !s.hidden), name + ': animation canvas is hidden');
    assert.equal(new Set(idle.map(s => s.left)).size, 1, name + ': reading position drifts without scrolling');
    assert.ok(scrolling[2].left > scrolling[1].left && scrolling[1].left > scrolling[0].left, name + ': scrolling does not move the character');
    if (reducedMotion === 'reduce') assert.equal(new Set(idle.map(s => s.hash)).size, 1, name + ': reduced motion still walks');
    else {
      assert.ok(new Set(idle.map(s => s.hash)).size > 1, name + ': character is frozen while reading');
      assert.ok(new Set(scrolling.map(s => s.hash)).size > 1, name + ': scrolling only translates a frozen pose');
    }
    if (low) assert.equal(idle[0].tier, 'low');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: file(name + '.png') });
    await page.locator('#close-reader').click();
    await page.waitForFunction(() => !document.querySelector('#reader').open);
    const closed = await sample(page);
    await page.waitForTimeout(220);
    assert.equal((await sample(page)).hash, closed.hash, name + ': closed reader keeps walking');
    report.at(-1).pausesWhenClosed = true;
    await fs.writeFile(file('browser-summary.json'), JSON.stringify(report, null, 2));
    await page.close();
  }
  console.log(JSON.stringify(report.map(r => ({ name: r.name, idlePoses: new Set(r.idle.map(s => s.hash)).size, scrollingPoses: new Set(r.scrolling.map(s => s.hash)).size, positions: r.scrolling.map(s => s.left) })), null, 2));
} finally { await browser.close(); }
