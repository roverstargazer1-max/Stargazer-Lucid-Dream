'use strict';

function formatCatalogueNumber(sequence) {
  return `SLD-${String(sequence).padStart(4, '0')}`;
}

// Saved entries remain in the catalogue after their source article is removed.
// Validate them too, so a retired number can never be reassigned silently.
function readCatalogueNumbers(savedArticles) {
  const catalogue = new Map();
  const owners = new Map();
  let highestSequence = 0;
  for (const [id, record] of Object.entries(savedArticles)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Invalid saved catalogue entry for "${id}" in source/_data/starry-layout.json.`);
    }
    if (record.catalogNumber === undefined) continue;
    const value = record.catalogNumber;
    const match = typeof value === 'string' && /^SLD-(\d{4,})$/.exec(value);
    const sequence = match ? Number(match[1]) : NaN;
    if (!Number.isSafeInteger(sequence) || sequence < 1 || formatCatalogueNumber(sequence) !== value) {
      throw new Error(`Invalid catalogNumber "${value}" for "${id}" in source/_data/starry-layout.json; use SLD-0001 or a later canonical number.`);
    }
    const owner = owners.get(value);
    if (owners.has(value)) throw new Error(`Duplicate catalogNumber "${value}" in saved articles "${owner}" and "${id}".`);
    owners.set(value, id);
    catalogue.set(id, value);
    highestSequence = Math.max(highestSequence, sequence);
  }
  return { catalogue, highestSequence };
}

function assignCatalogueNumbers(savedArticles, articles) {
  const { catalogue, highestSequence } = readCatalogueNumbers(savedArticles);
  let nextSequence = highestSequence + 1;
  const unregistered = articles.filter(article => !catalogue.has(article.id));
  unregistered.sort((left, right) => left.timeOrder < right.timeOrder ? -1 : left.timeOrder > right.timeOrder ? 1 : 0);
  for (const article of unregistered) {
    if (!Number.isSafeInteger(nextSequence)) throw new Error('The article catalogue has exhausted its supported number range.');
    catalogue.set(article.id, formatCatalogueNumber(nextSequence++));
  }
  return catalogue;
}

function makeDisplayId(catalogNumber, magnitude) {
  return `${catalogNumber} · ${magnitude.toFixed(1)}`;
}

module.exports = { assignCatalogueNumbers, readCatalogueNumbers, makeDisplayId };
