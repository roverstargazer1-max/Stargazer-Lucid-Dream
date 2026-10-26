import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createPreviewHandler } from '../../../../tools/preview-http.mjs';

// Supply the installed browser package and a Python with tomllib when these
// tools are provided outside the repository. No additional site dependency.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const rules = JSON.parse(execFileSync(process.env.TOML_PYTHON || 'python3', ['-c',
  'import json,tomllib; print(json.dumps(tomllib.load(open("netlify.toml", "rb"))["headers"]))',
], { encoding: 'utf8' }));
const globalHeaders = rules.find(rule => rule.for === '/*').values;
const output = path.resolve(process.env.SECURITY_OUTPUT || 'public');
const articles = JSON.parse(await fs.readFile(path.join(output, 'starry/index.json'), 'utf8')).articles;
const serve = createPreviewHandler(output);
const site = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://local').pathname;
  const headers = {};
  for (const rule of rules) {
    if (rule.for.endsWith('*') ? pathname.startsWith(rule.for.slice(0, -1)) : pathname === rule.for) Object.assign(headers, rule.values);
  }
  const writeHead = response.writeHead.bind(response);
  response.writeHead = (status, values) => writeHead(status, { ...values, ...headers });
  return serve(request, response);
});
await new Promise(resolve => site.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${site.address().port}`;
const outside = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  const target = new URL(request.url, 'http://local').searchParams.get('target') || '/';
  response.end(`<iframe src="${origin}${target}"></iframe>`);
});
await new Promise(resolve => outside.listen(0, '127.0.0.1', resolve));
const outsideOrigin = `http://127.0.0.1:${outside.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin + '/')) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await page.addInitScript(() => {
      window.policyViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.policyViolations.push(event.effectiveDirective));
    });
    const response = await page.goto(`${origin}/?motion=soft`);
    for (const [header, value] of Object.entries(globalHeaders)) assert.equal(response.headers()[header.toLowerCase()], value);
    await page.waitForSelector('body.starry-ready', { state: 'attached', timeout: 20000 });
    await page.locator('#room-journal-shortcut').evaluate(element => element.click());
    await page.locator('#window-journal[open] .journal-entry').first().waitFor();
    await page.locator('#window-journal [data-journal-close]').click();
    await page.locator('#window-entry').evaluate(element => element.click());
    await page.locator('#search-entry').waitFor({ state: 'visible' });
    await page.locator('#search-entry').click();
    await page.locator('#star-search').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const dialog = document.getElementById('star-search');
      return dialog.open && !dialog.dataset.motion && !dialog.hasAttribute('aria-busy') && !dialog.querySelector('.search-artboard').inert;
    });
    await page.locator('#search-query').fill(articles[0].title);
    await page.locator('#star-search .search-submit').click();
    await page.waitForFunction(title => {
      const rows = document.querySelectorAll('#search-results .search-result');
      return rows.length === 1 && rows[0].textContent.includes(title);
    }, articles[0].title, { timeout: 15000 }).catch(async error => {
      console.log(JSON.stringify({ name, searchState: await page.evaluate(() => ({ input: document.getElementById('search-query').value, feedback: document.getElementById('search-feedback').textContent, rows: [...document.querySelectorAll('#search-results .search-result')].map(row => row.textContent) })) }));
      throw error;
    });
    await page.locator('#search-results .search-result').first().click();
    await page.locator('#reader[open] #reader-title').waitFor();
    assert.equal(await page.locator('#reader-title').textContent(), articles[0].title);
    await page.locator('#close-reader').click();
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.policyViolations), []);
    assert.deepEqual(external, [], 'The normal site must not request third-party resources');
    const permissions = await page.evaluate(() => ['camera', 'microphone', 'geolocation'].map(feature => [feature, document.featurePolicy.allowsFeature(feature)]));
    assert.ok(permissions.every(([, allowed]) => !allowed));
    // Attempt to change relative URL resolution to a foreign origin.
    await page.evaluate(url => { const base = document.createElement('base'); base.href = url; document.head.append(base); }, outsideOrigin + '/');
    await page.waitForFunction(() => window.policyViolations.includes('base-uri'));
    assert.ok((await page.evaluate(() => document.baseURI)).startsWith(origin));
    const legacy = await page.goto(`${origin}/legacy/`);
    assert.equal(legacy.headers()['x-frame-options'], 'DENY');
    const themeToggle = page.locator('.kira-theme-toggle:visible').first();
    await themeToggle.click();
    assert.equal(await themeToggle.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => window.policyViolations), []);
    const demo = await context.request.get(`${origin}/legacy/lib/iconfont/demo_index.html`);
    assert.equal(demo.status(), 404);
    const runtime = await context.request.get(`${origin}/legacy/lib/iconfont/iconfont.woff2`);
    assert.equal(runtime.status(), 200);
    const bundle = await context.request.get(`${origin}/js/starfield/app.bundle.js`);
    assert.equal(bundle.headers()['cache-control'], 'public, max-age=0, must-revalidate');
    const friends = await page.goto(`${origin}/pages/friends/`);
    const avatar = page.locator('img[src$="tianze.jpeg"]');
    await avatar.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.images].some(image => image.src.endsWith('tianze.jpeg') && image.complete && image.naturalWidth > 0));
    assert.equal(friends.headers()['referrer-policy'], 'no-referrer');
    assert.deepEqual(external, []);
    results.push({ name, reading: true, search: true, journal: true, legacy: true, localAvatar: true, demoStatus: demo.status(), baseInjectionBlocked: true, permissions, errors, externalRequests: external.length });
    await context.close();
  }
  for (const target of ['/', '/legacy/']) {
    const page = await browser.newPage(), messages = [];
    page.on('console', message => messages.push(message.text()));
    await page.goto(`${outsideOrigin}/?target=${encodeURIComponent(target)}`);
    await page.waitForFunction(() => document.querySelector('iframe'));
    await page.waitForTimeout(500);
    assert.ok(messages.some(message => message.includes('frame-ancestors')), 'The browser must refuse framing, rather than just receive the header');
    results.push({ target, framingBlocked: true });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await fs.writeFile(new URL('browser-summary.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  await Promise.all([new Promise(resolve => site.close(resolve)), new Promise(resolve => outside.close(resolve))]);
}
