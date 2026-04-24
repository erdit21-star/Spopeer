const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2] || process.env.PORT || 4173);
const publicRoot = path.resolve(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function safeFilePath(urlPath) {
  const cleanPath = urlPath.split('?')[0].split('#')[0];
  const normalized = path.normalize(cleanPath).replace(/^\\+|^\/+/g, '');
  const target = normalized === '' ? 'index.html' : normalized;
  const abs = path.resolve(publicRoot, target);
  if (!abs.startsWith(publicRoot)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const filePath = safeFilePath(req.url || '/');
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      send(res, 404, 'Not Found');
      return;
    }

    const finalPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(finalPath, (readErr, content) => {
      if (readErr) {
        send(res, 404, 'Not Found');
        return;
      }
      const ext = path.extname(finalPath).toLowerCase();
      send(res, 200, content, MIME[ext] || 'application/octet-stream');
    });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[playwright-static] Serving ${publicRoot} on http://127.0.0.1:${port}`);
});
