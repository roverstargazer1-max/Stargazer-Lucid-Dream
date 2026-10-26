import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createObservationPanel, observationDate } from '../source/js/starfield/observation.js';

function observationFixture() {
  const document = { createElement: tagName => ({ tagName }) };
  const element = () => ({
    ownerDocument: document, dataset: {}, attributes: {}, children: [],
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  const date = element(), id = element();
  const rows = Array.from({ length: 5 }, () => {
    const row = element(), number = element();
    row.querySelector = () => number;
    return row;
  });
  const preview = {
    dataset: { assetRoot: '/images/observation/' },
    querySelector: selector => ({ '#preview-date': date, '#preview-id': id })[selector] || null,
    querySelectorAll: selector => selector === '.year-row' ? rows : [],
  };
  return { panel: createObservationPanel(preview), date, id };
}

test('same-day articles and a changed magnitude update the ID without redrawing the date', () => {
  const { panel, date, id } = observationFixture();
  panel.update({ id: 'first', date: '2026-10-11', displayId: 'STAR-0001 · 4.0' });
  const dateGlyphs = date.children;
  panel.update({ id: 'second', date: '2026-10-11', displayId: 'STAR-0002 · 4.0' });
  assert.equal(id.attributes['aria-label'], '文章 ID：STAR-0002 · 4.0');
  assert.equal(id.dataset.displayId, 'STAR-0002 · 4.0');
  assert.equal(date.children, dateGlyphs);
  panel.update({ id: 'second', date: '2026-10-11', displayId: 'STAR-0002 · 2.5' });
  assert.equal(id.dataset.displayId, 'STAR-0002 · 2.5');
  assert.equal(date.children, dateGlyphs);
  const idGlyphs = id.children;
  panel.update({ id: 'second', date: '2026-10-11', displayId: 'STAR-0002 · 2.5' });
  assert.equal(id.children, idGlyphs);
});

test('the ID uses the date artwork glyphs with a visible centered separator', () => {
  const { panel, date, id } = observationFixture();
  panel.update({ date: '2026-10-11', displayId: 'STAR-0006 · 4.0' });
  assert.equal(id.hidden, false);
  assert.deepEqual(id.children.filter(child => child.tagName === 'img').map(child => child.src),
    [...'STAR000640'].map(character => `/images/observation/glyphs/${character}.png`));
  assert.ok(date.children.filter(child => child.tagName === 'img').every(child => child.src.startsWith('/images/observation/glyphs/')));
  assert.equal(id.children.filter(child => child.className === 'glyph-middle-dot').length, 1);
  assert.equal(id.children.filter(child => child.className === 'glyph-dot').length, 1);
});

test('every sample article keeps its publication year centered and its zero-padded month/day', () => {
  const { articles } = JSON.parse(fs.readFileSync('tests/fixtures/catalogue.json'));
  for (const article of articles) {
    const date = observationDate(article.date);
    assert.equal(date.years[2].year, Number(article.date.slice(0, 4)));
    assert.deepEqual(date.years.map(row => row.selected), [false, false, true, false, false]);
    assert.equal(date.monthDay, `${article.date.slice(5, 7)}.${article.date.slice(8, 10)}`);
  }
});

test('calendar boundaries and leap days keep the supplied local publication date', () => {
  assert.deepEqual(observationDate('2024-02-29').years.map(row => row.label), ['22', '23', '24', '25', '26']);
  assert.equal(observationDate('2026-01-01').monthDay, '01.01');
  assert.equal(observationDate('2025-12-31').monthDay, '12.31');
  assert.deepEqual(observationDate('2100-01-01').years.map(row => row.label), ['98', '99', '00', '01', '02']);
});
