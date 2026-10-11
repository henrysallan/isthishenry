#!/usr/bin/env node
// Serves the production build (../dist) the way Vercel does, so local
// measurements are comparable: brotli/gzip for text assets, the SPA rewrite,
// and the cache headers from vercel.json. `vite preview` sends uncompressed
// files, which makes Lighthouse see a ~3x larger bundle.
//
//   npm run perf:serve [-- --port 4180 --dir dist]

import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '4180' },
    dir: { type: 'string', default: path.join(HERE, '..', 'dist') },
  },
});
const ROOT = path.resolve(args.dir);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.ttf']);
const cache = new Map();

function cacheControl(urlPath) {
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (urlPath.startsWith('/font/')) return 'public, max-age=604800, stale-while-revalidate=86400';
  return 'public, max-age=0, must-revalidate';
}

async function resolveFile(urlPath) {
  const file = path.join(ROOT, decodeURIComponent(urlPath));
  if (!file.startsWith(ROOT)) return null;
  try {
    if ((await stat(file)).isFile()) return file;
  } catch { /* fall through */ }
  return path.extname(urlPath) ? null : path.join(ROOT, 'index.html'); // SPA rewrite
}

http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://x').pathname;
  const file = await resolveFile(urlPath === '/' ? '/index.html' : urlPath);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }
  const ext = path.extname(file);
  const accept = req.headers['accept-encoding'] || '';
  const encoding = !COMPRESSIBLE.has(ext) ? null : accept.includes('br') ? 'br' : accept.includes('gzip') ? 'gzip' : null;
  const key = `${file}|${encoding}`;
  let body = cache.get(key);
  if (!body) {
    const raw = await readFile(file);
    body = encoding === 'br'
      ? zlib.brotliCompressSync(raw)
      : encoding === 'gzip' ? zlib.gzipSync(raw, { level: 9 }) : raw;
    cache.set(key, body);
  }
  res.writeHead(200, {
    'content-type': TYPES[ext] || 'application/octet-stream',
    'content-length': body.length,
    'cache-control': cacheControl(urlPath),
    ...(encoding && { 'content-encoding': encoding, vary: 'Accept-Encoding' }),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(Number(args.port), () => {
  console.log(`Serving ${path.relative(process.cwd(), ROOT) || '.'} on http://localhost:${args.port}`);
});
