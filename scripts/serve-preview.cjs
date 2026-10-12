const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
function createPreviewServer(directory) {
  directory = fs.realpathSync(directory);
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let name;
    try {
      name = decodeURIComponent(new URL(request.url, 'http://preview.local').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    const file = path.resolve(directory, `.${name === '/' ? '/index.html' : name}`);
    try {
      const realFile = fs.realpathSync(file);
      if (!realFile.startsWith(`${directory}${path.sep}`) || !fs.statSync(realFile).isFile()) throw new Error('Not a preview file');
      response.writeHead(200, { 'Content-Type': types[path.extname(realFile)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(realFile).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}
if (require.main === module) {
  const directory = path.resolve(__dirname, '..', 'public');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createPreviewServer(directory);
  server.listen(port, '127.0.0.1', () => console.log(`Preview listening on http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
module.exports = { createPreviewServer };
