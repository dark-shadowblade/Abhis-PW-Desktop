const http = require('http');
const fs = require('fs');
const path = require('path');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json' };
function startServer() {
  return new Promise((resolve, reject) => {
    const root = path.join(__dirname, '..', 'desktop');
    const server = http.createServer(async (req, res) => {
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (pathname === '/api/health') {
        res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify({ ok:true, app:"Abhi's PW", proxyReady:false }));
      }
      // API proxy will be connected only to the verified provider endpoints and headers.
      if (pathname.startsWith('/api/')) {
        res.writeHead(501, {'content-type':'application/json'});
        return res.end(JSON.stringify({ error:'Provider API integration is not configured yet.' }));
      }
      const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
      const file = path.resolve(root, requested);
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'});
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', () => resolve(server));
  });
}
module.exports = { startServer };
