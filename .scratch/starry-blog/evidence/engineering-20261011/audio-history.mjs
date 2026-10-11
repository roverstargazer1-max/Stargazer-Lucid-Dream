// Real APlayer controls with a local silent WAV; no third-party playback claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/Stargazer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root = process.env.STARFIELD_TEST_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ||
  '/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
function silentWav() {
  const wav = Buffer.alloc(44 + 8000 * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  return wav;
}
try {
  const page = await browser.newPage();
  await page.route('**/__test-audio.wav', route => route.fulfill({ contentType: 'audio/wav', body: silentWav() }));
  await page.route('https://api.i-meto.com/**', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify([{ name: 'Test', artist: 'Fixture', url: root + '__test-audio.wav', cover: '', lrc: '' }]),
  }));
  const { articles } = JSON.parse(await fs.readFile('.preview/stargazer/starry/index.json', 'utf8'));
  const first = articles.find(article => article.id === 'dream-begins');
  const second = articles.find(article => article.id !== first.id);
  await page.goto(new URL(first.path, root).href);
  await page.waitForSelector('body.starry-ready', { state: 'attached' });
  await page.waitForFunction(() => window.aplayers?.length === 1 && document.body.dataset.reading === 'open');
  await page.locator('.aplayer-button').first().click();
  await page.waitForFunction(() => !window.aplayers[0].paused);
  await page.evaluate(article => {
    const state = { starryView: 'reader', starryArticleId: article.id, mode: 'relation' };
    history.replaceState(state, '', location.href);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }, first);
  assert.equal(await page.evaluate(() => window.aplayers[0].paused), false, 'same article navigation must preserve playback');
  await page.evaluate(article => {
    const state = { starryView: 'reader', starryArticleId: article.id, mode: 'relation' };
    history.pushState(state, '', '/' + article.path);
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }, second);
  await page.waitForFunction(id => document.querySelector('#reader .article')?.dataset.starryId === id, second.id);
  const paused = await page.evaluate(() => window.aplayers[0].paused);
  console.log(JSON.stringify({ first: first.id, second: second.id, previousPlayerPaused: paused }));
  assert.equal(paused, true, 'history must pause a cached player before replacing its displayed article');
  await page.goBack();
  await page.waitForFunction(id => document.querySelector('#reader .article')?.dataset.starryId === id, first.id);
  await page.waitForFunction(() => document.body.dataset.reading === 'open');
  assert.equal(await page.evaluate(() => window.aplayers.length), 1, 'returning must reuse the same player');
  assert.equal(await page.evaluate(() => window.aplayers[0].paused), true);
  await page.goForward();
  await page.waitForFunction(id => document.querySelector('#reader .article')?.dataset.starryId === id, second.id);
  console.log('History playback, back/forward and player reuse passed');
} finally { await browser.close(); }
