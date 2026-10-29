// Local stand-in for the GitHub contents API, for testing the admin Functions with
// `wrangler pages dev` without a real token. Serves files from this checkout; never writes.
// Usage: node scripts/mock-github.mjs 18790   then GITHUB_API_BASE=http://127.0.0.1:18790 in .dev.vars
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const port = Number(process.argv[2] || 8790);
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = u.pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
  const send = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  if (!req.headers.authorization) return send(401, { message: 'Bad credentials' });
  if (!m) return send(404, { message: 'Not Found' });
  const p = path.join(process.cwd(), decodeURIComponent(m[1]));
  if (req.method === 'PUT') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { const j = JSON.parse(b); console.log('MOCK commit (not written to repo):', m[1], j.message);
    if (process.env.MOCK_WRITE_DIR) { const out = path.join(process.env.MOCK_WRITE_DIR, m[1]); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(j.content, 'base64')); } send(200, { content: { sha: 'mocksha' }, commit: { sha: 'mockcommit0000' } }); }); return; }
  if (!fs.existsSync(p)) return send(404, { message: 'Not Found' });
  if (fs.statSync(p).isDirectory()) return send(200, fs.readdirSync(p).map((n) => ({ type: 'file', name: n, path: `${m[1]}/${n}`, sha: 'x', size: fs.statSync(path.join(p, n)).size })));
  send(200, { sha: 'x', content: fs.readFileSync(p).toString('base64') });
}).listen(port, '127.0.0.1', () => console.log('mock github on', port));
