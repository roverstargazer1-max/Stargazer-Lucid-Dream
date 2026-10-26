import { createCallWaveform } from './call-waveform.js';
import { createSilhouetteWalker } from './silhouette-walker.js';
const glyphSources = new WeakMap();

function sourcesFor(document) {
  if (!glyphSources.has(document)) glyphSources.set(document, JSON.parse(document.body?.dataset.glyphSources || '{}'));
  return glyphSources.get(document);
}

// Calendar dates are already formatted in the blog's timezone by the index generator.
// Do not parse them as UTC instants: that can shift the displayed day for visitors.
export function observationDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid article publication date: ${date}`);
  const [, year, month, day] = match;
  const selectedYear = Number(year);
  return {
    year, month, day, monthDay: `${month}.${day}`,
    years: [-2, -1, 0, 1, 2].map(offset => ({
      year: selectedYear + offset,
      label: String(selectedYear + offset).slice(-2).padStart(2, '0'),
      selected: offset === 0,
    })),
  };
}

export function renderGlyphs(element, value, assetRoot) {
  const document = element.ownerDocument;
  const sources = sourcesFor(document);
  const decoding = [];
  const glyphs = [...value].map(character => {
    if (/^[A-Z0-9]$/.test(character)) {
      const glyph = document.createElement('img');
      glyph.fetchPriority = 'low';
      glyph.decoding = 'async';
      glyph.src = sources[character] || `${assetRoot}glyphs/${character}.png`;
      glyph.alt = '';
      glyph.draggable = false;
      decoding.push(glyph.decode());
      return glyph;
    }
    const punctuation = document.createElement('span');
    punctuation.className = character === '.' ? 'glyph-dot' : character === '-' ? 'glyph-dash'
      : character === '·' ? 'glyph-middle-dot' : 'glyph-space';
    return punctuation;
  });
  element.replaceChildren(...glyphs);
  return Promise.allSettled(decoding);
}

export function createObservationPanel(preview) {
  const waveform = createCallWaveform(preview.querySelector('.observation-waveform'));
  const walker = createSilhouetteWalker(preview.querySelector('.observation-silhouette'));
  const assetRoot = preview.dataset.assetRoot;
  let fixedGlyphsReady = false;
  let glyphPreparation = null;
  const yearRows = [...preview.querySelectorAll('.year-row')];
  const dateElement = preview.querySelector('#preview-date');
  const idElement = preview.querySelector('#preview-id');
  let currentDate = null, currentDisplayId = null;
  return {
    render(now, enabled) { waveform.render(now, enabled); walker.render(now, enabled); },
    prepare(articles) {
      if (glyphPreparation) return glyphPreparation;
      const values = [...preview.querySelectorAll('[data-glyph-text]')].map(element => element.dataset.glyphText || '');
      for (const article of articles) {
        const date = observationDate(article.date);
        values.push(date.monthDay, ...date.years.map(year => year.label), String(article.displayId || ''));
      }
      const sources = sourcesFor(preview.ownerDocument);
      const urls = [...new Set(values.join('').split('').filter(character => /^[A-Z0-9]$/.test(character)))]
        .map(character => sources[character] || `${assetRoot}glyphs/${character}.png`);
      glyphPreparation = Promise.allSettled(urls.map(url => {
        const image = preview.ownerDocument.createElement('img');
        image.fetchPriority = 'low';
        image.decoding = 'async';
        image.src = url;
        return image.decode();
      }));
      return glyphPreparation;
    },
    update(article) {
      const decoding = [];
      if (!fixedGlyphsReady) {
        for (const element of preview.querySelectorAll('[data-glyph-text]')) decoding.push(renderGlyphs(element, element.dataset.glyphText, assetRoot));
        fixedGlyphsReady = true;
      }
      const displayId = String(article.displayId || '');
      if (displayId !== currentDisplayId) {
        decoding.push(renderGlyphs(idElement, displayId, assetRoot));
        idElement.dataset.displayId = displayId;
        idElement.setAttribute('aria-label', `文章 ID：${displayId}`);
        idElement.hidden = !displayId;
        currentDisplayId = displayId;
      }
      if (article.date !== currentDate) {
        const date = observationDate(article.date);
        date.years.forEach((item, index) => {
          const row = yearRows[index];
          row.dataset.year = String(item.year);
          row.setAttribute('aria-label', `${item.year}年${item.selected ? '，文章发布年份' : ''}`);
          decoding.push(renderGlyphs(row.querySelector('.year-number'), item.label, assetRoot));
        });
        dateElement.dateTime = article.date;
        dateElement.setAttribute('aria-label', `${date.year}年${Number(date.month)}月${Number(date.day)}日`);
        decoding.push(renderGlyphs(dateElement, date.monthDay, assetRoot));
        currentDate = article.date;
      }
      return Promise.allSettled(decoding);
    },
  };
}
