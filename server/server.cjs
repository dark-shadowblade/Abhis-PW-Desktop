'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const API = 'https://v1.sgmvv1.xyz/api/v1';
const VIDEO_CHUNK = 2 * 1024 * 1024;
const DOWNLOAD_CHUNK = 1024 * 1024;
const CDN_HOST = /^a\d+\.stmvv1\.xyz$/i;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json'
};

function startServer() {
  return new Promise((resolve, reject) => {
    const root = path.join(__dirname, '..', 'desktop');
    const server = http.createServer(async (req, res) => {
      const local = new URL(req.url, 'http://127.0.0.1');

      if (local.pathname === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, app: "Abhi's PW", proxyReady: true }));
      }

      if (local.pathname.startsWith('/api/v1/')) {
        try {
          const upstreamUrl = new URL(API + local.pathname.slice('/api/v1'.length) + local.search);
          const headers = { accept: req.headers.accept || 'application/json' };
          if (req.headers['x-api-key']) headers['x-api-key'] = req.headers['x-api-key'];
          const upstream = await fetch(upstreamUrl, {
            method: req.method,
            headers,
            signal: AbortSignal.timeout(30000)
          });
          const body = Buffer.from(await upstream.arrayBuffer());
          res.writeHead(upstream.status, {
            'content-type': upstream.headers.get('content-type') || 'application/json',
            'cache-control': 'no-store'
          });
          return res.end(body);
        } catch (error) {
          res.writeHead(502, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Study API proxy failed', details: error.message }));
        }
      }

      if (local.pathname === '/video' && req.method === 'GET') {
        try {
          const raw = local.searchParams.get('url');
          if (!raw) throw new Error('Missing stream URL');
          const target = checkedUrl(raw);
          const range = req.headers.range || 'bytes=0-';
          const match = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!match) {
            res.writeHead(416);
            return res.end('Invalid range');
          }
          const start = Number(match[1]);
          const requestedEnd = match[2] ? Number(match[2]) : start + VIDEO_CHUNK - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
            throw new Error('Invalid byte range');
          }
          const end = Math.min(requestedEnd, start + VIDEO_CHUNK - 1);
          const upstream = await fetchChunk(target, start, end);
          if (upstream.status !== 206) {
            const message = (await upstream.text()).slice(0, 400);
            res.writeHead(upstream.status, { 'content-type': 'text/plain' });
            return res.end(message || 'CDN range request failed');
          }
          const rangeInfo = /^bytes\\s+(\\d+)-(\\d+)\\/(\\d+)$/i.exec(upstream.headers.get('content-range') || '');
          if (!rangeInfo) throw new Error('CDN returned an invalid Content-Range');
          const rangeStart = Number(rangeInfo[1]);
          const rangeEnd = Number(rangeInfo[2]);
          const totalLength = Number(rangeInfo[3]);
          if (rangeStart !== start || rangeEnd < rangeStart || rangeEnd > end ||
              rangeEnd >= totalLength || !Number.isSafeInteger(totalLength)) {
            throw new Error('CDN returned an unexpected byte range');
          }
          const headers = {
            'content-type': upstream.headers.get('content-type') || 'video/mp4',
            'accept-ranges': 'bytes',
            'cache-control': 'no-store',
            'access-control-expose-headers': 'Content-Range, Accept-Ranges, Content-Length'
          };
          for (const key of ['content-range', 'content-length']) {
            const value = upstream.headers.get(key);
            if (value) headers[key] = value;
          }
          res.writeHead(206, headers);
          if (!upstream.body) return res.end();
          const reader = upstream.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!res.write(Buffer.from(value))) await new Promise(ok => res.once('drain', ok));
            }
            res.end();
          } catch (error) {
            res.destroy(error);
          }
        } catch (error) {
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'text/plain' });
            res.end(error.message);
          } else {
            res.destroy(error);
          }
        }
        return;
      }

      if (local.pathname === '/download' && req.method === 'GET') {
        try {
          const raw = local.searchParams.get('url');
          if (!raw) throw new Error('Missing stream URL');
          const target = checkedUrl(raw);
          const first = await fetchChunk(target, 0, DOWNLOAD_CHUNK - 1);
          if (first.status !== 206) throw new Error('CDN returned ' + first.status);
          const contentRange = /^bytes\s+0-(\d+)\/(\d+)$/i.exec(first.headers.get('content-range') || '');
          if (!contentRange) throw new Error('CDN did not return a valid Content-Range');
          const firstEnd = Number(contentRange[1]);
          const total = Number(contentRange[2]);
          if (!Number.isSafeInteger(total) || total <= 0 || firstEnd >= total || firstEnd > DOWNLOAD_CHUNK - 1) {
            throw new Error('Invalid CDN file size');
          }
          const base = path.basename(local.searchParams.get('filename') || 'lecture.mp4')
            .replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = base.toLowerCase().endsWith('.mp4') ? base : base + '.mp4';
          res.writeHead(200, {
            'content-type': 'video/mp4',
            'content-length': total,
            'content-disposition': 'attachment; filename="' + filename + '"',
            'cache-control': 'no-store'
          });
          async function write(buffer) {
            if (!res.write(buffer)) await new Promise(ok => res.once('drain', ok));
          }
          let buffer = Buffer.from(await first.arrayBuffer());
          if (buffer.length !== firstEnd + 1) throw new Error('First chunk length mismatch');
          await write(buffer);
          for (let start = firstEnd + 1; start < total; start += DOWNLOAD_CHUNK) {
            if (res.destroyed) return;
            const end = Math.min(start + DOWNLOAD_CHUNK - 1, total - 1);
            const part = await fetchChunk(target, start, end);
            if (part.status !== 206) throw new Error('CDN chunk failed: ' + part.status);
            const expected = 'bytes ' + start + '-' + end + '/' + total;
            if ((part.headers.get('content-range') || '').toLowerCase() !== expected.toLowerCase()) {
              throw new Error('Unexpected CDN range');
            }
            buffer = Buffer.from(await part.arrayBuffer());
            if (buffer.length !== end - start + 1) throw new Error('Incomplete CDN chunk');
            await write(buffer);
          }
          res.end();
        } catch (error) {
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'text/plain' });
            res.end('Download failed: ' + error.message);
          } else {
            res.destroy(error);
          }
        }
        return;
      }

      const requested = local.pathname === '/' ? 'index.html' : decodeURIComponent(local.pathname.slice(1));
      const file = path.resolve(root, requested);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      fs.readFile(file, (error, data) => {
        if (error) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, {
          'content-type': MIME[path.extname(file)] || 'application/octet-stream',
          'x-content-type-options': 'nosniff'
        });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', () => resolve(server));
  });
}

function checkedUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !CDN_HOST.test(url.hostname) || url.port) {
    throw new Error('Invalid video CDN host');
  }
  return url;
}

async function fetchChunk(base, start, end) {
  const url = new URL(base);
  url.searchParams.set('s', String(start));
  url.searchParams.set('e', String(end));
  return fetch(url, {
    headers: { accept: '*/*', 'accept-encoding': 'identity', 'user-agent': 'ExoPlayer' },
    signal: AbortSignal.timeout(40000)
  });
}

module.exports = { startServer };
