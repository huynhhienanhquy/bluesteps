const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};
http
  .createServer((req, res) => {
    let requestPath;
    try {
      requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let target = path.resolve(root, `.${requestPath}`);
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory())
      target = path.join(root, 'index.html');
    res.setHeader('Content-Type', types[path.extname(target)] ?? 'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  })
  .listen(Number(process.env.PORT || 4173), '127.0.0.1');
