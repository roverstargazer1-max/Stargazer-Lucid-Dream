'use strict';

function normalizeAdoptedRelations(configuration, publishedArticleIds, warn = () => {}) {
  if (configuration == null) return [];
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
    warn('source/_data/starry-relations.yml must contain a mapping; ignoring its optional relations.');
    return [];
  }
  if (configuration.version !== 1) {
    warn(`source/_data/starry-relations.yml has unsupported version "${configuration.version}"; ignoring its optional relations.`);
    return [];
  }

  const adopted = configuration.adopted == null ? [] : configuration.adopted;
  if (!Array.isArray(adopted)) {
    warn('source/_data/starry-relations.yml: adopted must be a list; ignoring its optional relations.');
    return [];
  }

  const seen = new Set();
  const relations = [];
  adopted.forEach((entry, index) => {
    const location = `source/_data/starry-relations.yml adopted[${index}]`;
    const ids = entry?.articles;
    if (!Array.isArray(ids) || ids.length !== 2 || ids.some((id) => typeof id !== 'string' || !id.trim())) {
      warn(`${location} must reference exactly two article IDs; skipping it.`);
      return;
    }

    const articles = ids.map((id) => id.trim()).sort();
    if (articles[0] === articles[1]) {
      warn(`${location} references the same article twice; skipping it.`);
      return;
    }
    const missing = articles.find((id) => !publishedArticleIds.has(id));
    if (missing) {
      warn(`${location} references unpublished or missing article "${missing}"; skipping it.`);
      return;
    }
    if (entry.reason != null && typeof entry.reason !== 'string') {
      warn(`${location}.reason must be plain text; skipping it.`);
      return;
    }

    const key = articles.join('\0');
    if (seen.has(key)) {
      warn(`${location} duplicates an adopted relationship; skipping it.`);
      return;
    }
    seen.add(key);
    relations.push({ articles, reason: String(entry.reason || '').trim() });
  });

  return relations;
}

module.exports = { normalizeAdoptedRelations };
