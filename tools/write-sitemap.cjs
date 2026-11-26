const fs = require('node:fs');
const path = require('node:path');
const { load } = require('cheerio');

function writeSitemap(directory, siteUrl) {
  const sitemap = load('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { xmlMode: true });
  const files = fs.readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.relative(directory, path.join(entry.parentPath, entry.name)))
    .sort();
  for (const file of files) {
    const route = file.split(path.sep).join('/').replace(/(^|\/)index\.html$/, '$1');
    if (route === 'pages/archive/') continue; // The sitemap uses the paginated archive.
    const html = fs.readFileSync(path.join(directory, file), 'utf8');
    const $ = load(html.split(/<\/head>/i, 1)[0]);
    const address = new URL('/' + route, siteUrl).href;
    if ($('head link[rel="canonical"]').attr('href') !== address) continue;
    const robots = $('head meta[name="robots" i]').map((_, node) => $(node).attr('content')).get().join(',');
    if (/\b(noindex|none)\b/i.test(robots)) continue;
    sitemap('urlset').append(sitemap('<url/>').append(sitemap('<loc/>').text(address)));
  }
  fs.writeFileSync(path.join(directory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n${sitemap.xml()}\n`);
}

module.exports = { writeSitemap };
