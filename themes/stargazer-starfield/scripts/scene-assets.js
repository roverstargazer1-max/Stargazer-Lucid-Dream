const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// A replacement illustration must not reuse a browser/CDN cache entry for the old bytes.
hexo.extend.helper.register('starry_room_url', function () {
  const source = hexo.theme.config.scene.room;
  const image = fs.readFileSync(path.join(hexo.source_dir, source));
  const version = createHash('sha256').update(image).digest('hex').slice(0, 16);
  return `${this.url_for(source)}?v=${version}`;
});
