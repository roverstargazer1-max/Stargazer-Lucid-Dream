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
  const glyphs = [...value].map(character => {
    if (/^[A-Z0-9]$/.test(character)) {
      const glyph = document.createElement('img');
      glyph.src = `${assetRoot}glyphs/${character}.png`;
      glyph.alt = '';
      glyph.draggable = false;
      return glyph;
    }
    const punctuation = document.createElement('span');
    punctuation.className = character === '.' ? 'glyph-dot' : character === '-' ? 'glyph-dash' : 'glyph-space';
    return punctuation;
  });
  element.replaceChildren(...glyphs);
}

export function createObservationPanel(preview) {
  const assetRoot = preview.dataset.assetRoot;
  for (const element of preview.querySelectorAll('[data-glyph-text]')) {
    renderGlyphs(element, element.dataset.glyphText, assetRoot);
  }
  const yearRows = [...preview.querySelectorAll('.year-row')];
  const dateElement = preview.querySelector('#preview-date');
  let currentDate = null;
  return {
    update(article) {
      if (article.date === currentDate) return;
      const date = observationDate(article.date);
      date.years.forEach((item, index) => {
        const row = yearRows[index];
        row.dataset.year = String(item.year);
        row.setAttribute('aria-label', `${item.year}年${item.selected ? '，文章发布年份' : ''}`);
        renderGlyphs(row.querySelector('.year-number'), item.label, assetRoot);
      });
      dateElement.dateTime = article.date;
      dateElement.setAttribute('aria-label', `${date.year}年${Number(date.month)}月${Number(date.day)}日`);
      renderGlyphs(dateElement, date.monthDay, assetRoot);
      currentDate = article.date;
    },
  };
}
