const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.ico': return 'image/x-icon';
    default: return 'text/plain; charset=utf-8';
  }
}

function createApp() {
  const publicDir = path.join(__dirname, '..', 'public');

  const sendJson = (res, statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  const sendFile = (res, filePath) => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      sendJson(res, 404, { message: 'File not found.' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  };

  return function app(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', mode: 'frontend-only' });
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, {
        message: 'This project now runs as a frontend-only app. Profile data lives in IndexedDB inside the browser.'
      });
    }

    const candidatePath = pathname === '/'
      ? path.join(publicDir, 'index.html')
      : path.join(publicDir, pathname.replace(/^\/+/, ''));

    if (candidatePath.startsWith(publicDir) && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return sendFile(res, candidatePath);
    }

    return sendFile(res, path.join(publicDir, 'index.html'));
  };
}

module.exports = {
  createApp,
  getContentType
};
