// Loopback-only preview of the public Waline endpoints used by the two themes.
// The SQLite file lives outside both generated sites, including across rebuilds.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export function previewComments(filename) {
  let database;
  function db() {
    if (!database) {
      database = new DatabaseSync(filename);
      database.exec(`CREATE TABLE IF NOT EXISTS comments (
        objectId TEXT PRIMARY KEY, url TEXT NOT NULL, nick TEXT NOT NULL, comment TEXT NOT NULL, insertedAt TEXT NOT NULL
      ); CREATE INDEX IF NOT EXISTS article_comments ON comments (url, insertedAt DESC)`);
    }
    return database;
  }
  function render(row) {
    const comment = row.comment.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return { ...row, comment, status: 'approved' };
  }
  return async function handle(req, res) {
    function send(status, data, errmsg = '') {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ errno: status < 400 ? 0 : status, errmsg, data }));
    }
    try {
      const query = new URL(req.url, 'http://localhost').searchParams;
      if (req.method === 'GET') {
        const article = query.get('path');
        const page = Math.max(1, Math.min(100000, parseInt(query.get('page'), 10) || 1));
        const count = db().prepare('SELECT count(*) AS count FROM comments WHERE url = ?').get(article).count;
        const rows = db().prepare('SELECT * FROM comments WHERE url = ? ORDER BY insertedAt DESC, rowid DESC LIMIT 20 OFFSET ?').all(article, (page - 1) * 20);
        return send(200, { data: rows.map(render), totalPages: Math.ceil(count / 20), count, page, pageSize: 20 });
      }
      if (req.method !== 'POST') return send(405, null);
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return send(403, null);
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, null);
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16384) return send(413, null);
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { return send(400, null); }
      const nick = typeof input?.nick === 'string' && input.nick.trim();
      const comment = typeof input?.comment === 'string' && input.comment.trim();
      if (!nick || nick.length > 40 || !comment || comment.length > 2000 ||
          typeof input.url !== 'string' || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(input.url)) return send(400, null, '请检查昵称和留言。');
      const id = randomUUID(), now = new Date().toISOString();
      db().prepare('INSERT INTO comments VALUES (?, ?, ?, ?, ?)').run(id, input.url, nick, comment, now);
      send(201, render({ objectId: id, url: input.url, nick, comment, insertedAt: now }));
    } catch {
      send(500, null, '预览评论暂时无法保存或读取。');
    }
  };
}
