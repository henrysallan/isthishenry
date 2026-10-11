#!/usr/bin/env node
// Static weight of the site: what the build ships and what each page pulls
// from the CDN. Deterministic (no browser), so it's comparable across runs.
//
//   npm run build && npm run perf:weight -- --label baseline
//
// Media sizes come from HEAD requests to the CDN (Content-Length). HLS streams
// (.m3u8) are counted per page but have no single size. For images with
// several widths, the largest one (the URL navigation.js links) is measured.
// The background preloader measured in the baseline was removed in area A.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';
import { runnerImport } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const { values: args } = parseArgs({ options: { label: { type: 'string', default: 'run' } } });

const load = async (p) => (await runnerImport(path.join(ROOT, p), { configFile: false, logLevel: 'silent' })).module;
const { navigationData } = await load('src/data/navigation.js');

const MB = (b) => +(b / 1048576).toFixed(1);
const KB = (b) => +(b / 1024).toFixed(1);
const isVideo = (u) => /\.(mp4|mov|webm)(\?|$)/i.test(u);
const isHls = (u) => /\.m3u8/i.test(u);

// ── Build output ──
async function buildWeight() {
  const rows = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(js|css|html|ttf|woff2?)$/.test(e.name)) {
        const raw = await readFile(p);
        rows.push({
          file: path.relative(path.join(ROOT, 'dist'), p),
          rawKB: KB(raw.length),
          gzipKB: KB(zlib.gzipSync(raw, { level: 9 }).length),
          brotliKB: KB(zlib.brotliCompressSync(raw).length),
        });
      }
    }
  };
  await walk(path.join(ROOT, 'dist'));
  const sum = (filter, k) => +rows.filter(filter).reduce((a, r) => a + r[k], 0).toFixed(1);
  const js = (r) => r.file.endsWith('.js');
  const font = (r) => /\.(ttf|woff2?)$/.test(r.file);
  return {
    files: rows,
    jsKB: { raw: sum(js, 'rawKB'), gzip: sum(js, 'gzipKB'), brotli: sum(js, 'brotliKB') },
    fontKB: { raw: sum(font, 'rawKB'), brotli: sum(font, 'brotliKB') },
    jsChunks: rows.filter(js).length,
  };
}

// ── Pages → media URLs ──
// The home reel is hardcoded in ContentArea's home view rather than navigation.js
async function homeReel() {
  const src = await readFile(path.join(ROOT, 'src/components/ContentArea.jsx'), 'utf8');
  const home = src.slice(src.indexOf("view === 'home'"));
  return home.match(/src="([^"]+)"/)?.[1];
}
const reel = await homeReel();

function pages() {
  const out = [{ route: '/', media: reel ? [reel] : [] }];
  const walk = (items, base) => {
    for (const item of items) {
      const c = item.content || {};
      const route = `${base}/${item.id}`;
      if (item.submenu) {
        // List page: every visible row shows its thumbnail
        out.push({ route, media: item.submenu.filter((i) => !i.hideFromGrid && i.content?.thumbnail).map((i) => i.content.thumbnail) });
        walk(item.submenu, route);
      } else {
        const media = [];
        for (const b of c.blocks || []) if (b.src) media.push(b.src.startsWith('http') ? b.src : (c.baseUrl || '') + b.src);
        for (const p of c.projects || []) media.push(p.video || p.image);
        out.push({ route, media: media.filter(Boolean) });
      }
    }
  };
  walk(navigationData.mainMenu, '');
  return out;
}

async function headSizes(urls) {
  const sizes = new Map();
  const queue = [...new Set(urls)].filter((u) => !isHls(u));
  await Promise.all(Array.from({ length: 16 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      try {
        const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
        sizes.set(u, { bytes: +r.headers.get('content-length') || 0, status: r.status, cacheControl: r.headers.get('cache-control') });
      } catch {
        sizes.set(u, { bytes: 0, status: 'ERR' });
      }
    }
  }));
  return sizes;
}

const build = await buildWeight();
const pageList = pages();
const allUrls = pageList.flatMap((p) => p.media);
const sizes = await headSizes(allUrls);
const bytes = (u) => sizes.get(u)?.bytes || 0;

const pageRows = pageList.map((p) => ({
  route: p.route,
  items: p.media.length,
  hls: p.media.filter(isHls).length,
  mb: MB(p.media.reduce((a, u) => a + bytes(u), 0)),
  largestMB: MB(Math.max(0, ...p.media.map(bytes))),
})).sort((a, b) => b.mb - a.mb);

const unique = [...new Set(allUrls)].filter((u) => !isHls(u));
const byExt = {};
for (const u of unique) {
  const ext = u.split('?')[0].split('.').pop().toLowerCase();
  const e = (byExt[ext] ||= { files: 0, mb: 0 });
  e.files++;
  e.mb = MB(e.mb * 1048576 + bytes(u));
}
const images = unique.filter((u) => !isVideo(u));

const result = {
  label: args.label,
  date: new Date().toISOString(),
  build,
  media: {
    uniqueFiles: unique.length,
    totalMB: MB(unique.reduce((a, u) => a + bytes(u), 0)),
    byExtension: byExt,
    imagesOver5MB: images.filter((u) => bytes(u) > 5 * 1048576).length,
    largestImageMB: MB(Math.max(...images.map(bytes))),
    withCacheControl: unique.filter((u) => sizes.get(u)?.cacheControl).length,
    errors: unique.filter((u) => sizes.get(u)?.status !== 200),
  },
  pages: pageRows,
};

await mkdir(path.join(HERE, 'results'), { recursive: true });
const file = path.join(HERE, 'results', `${args.label}-weight.json`);
await writeFile(file, JSON.stringify(result, null, 2) + '\n');

console.log(`JS: ${build.jsKB.raw} KB raw / ${build.jsKB.gzip} KB gzip / ${build.jsKB.brotli} KB brotli in ${build.jsChunks} chunk(s)`);
console.log(`Fonts: ${build.fontKB.raw} KB raw / ${build.fontKB.brotli} KB brotli`);
console.log(`Media: ${result.media.uniqueFiles} files, ${result.media.totalMB} MB; ${result.media.imagesOver5MB} images > 5 MB; ${result.media.withCacheControl} with Cache-Control`);
console.table(pageRows.slice(0, 12));
console.log(`→ ${path.relative(process.cwd(), file)}`);
