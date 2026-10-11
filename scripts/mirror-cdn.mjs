#!/usr/bin/env node
// Mirror every CDN asset the site references into a local directory so the
// files can be re-uploaded to a new CDN. Vimeo HLS streams referenced by the
// site are included too: ffmpeg remuxes their top rendition to MP4 (needs
// ffmpeg + ffprobe on PATH) into vimeo/<id>.mp4.
//
//   node scripts/mirror-cdn.mjs [outDir]        (default: cdn-mirror)
//   node scripts/mirror-cdn.mjs --dry-run       list planned names, download nothing
//
// New files land in their R2 folder, and every filename is prefixed with the
// asset's position in navigation.js and the title of the page it appears on:
//   exfy/Barclays - 1.png  →  exfy/003_Expensify_Barclays - 1.png
// manifest.json maps each original R2 key to its current path in the mirror.
//
// Re-running is safe: complete files are skipped, files moved to other folders
// by hand stay where they are, and files whose number changed (navigation.js was
// reordered) are renamed in place rather than re-downloaded.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const CDN_ORIGIN = 'https://cdn.isthishenry.com';
const VIMEO_HLS = /^https:\/\/player\.vimeo\.com\/external\/(\d+)\.m3u8/;
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 4;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outDir = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) ?? 'cdn-mirror');
const NAVIGATION_FILE = path.join(ROOT, 'src/data/navigation.js');

// ---------------------------------------------------------------------------
// 1. Collect URLs, in navigation.js order
// ---------------------------------------------------------------------------

const MEDIA_FILE = /\.(png|jpe?g|gif|webp|avif|svg|mp4|mov|webm|m4v)$/i;

// Walk navigationData in source order, recording each CDN URL with the title of
// the page it appears on. Any object with a `baseUrl` applies it to relative
// media paths beneath it (block srcs, gallery entries), mirroring ContentArea.jsx.
function collectFromNavigation(node, ctx, out) {
  if (typeof node === 'string') {
    if (node.startsWith(CDN_ORIGIN) || VIMEO_HLS.test(node)) out.push({ url: node, section: ctx.section });
    else if (ctx.baseUrl && !/^[a-z]+:/i.test(node) && MEDIA_FILE.test(node)) {
      out.push({ url: ctx.baseUrl + node, section: ctx.section });
    }
    return;
  }
  if (node && typeof node === 'object') {
    const next = {
      baseUrl: typeof node.baseUrl === 'string' ? node.baseUrl : ctx.baseUrl,
      section: node.type === 'page' && node.title ? node.title : ctx.section,
    };
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'baseUrl') collectFromNavigation(value, next, out);
    }
  }
}

// Hardcoded URLs outside navigation.js (e.g. the home reel in ContentArea).
async function collectFromSource() {
  const files = [path.join(ROOT, 'index.html')];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_archive')) await walk(full);
      } else if (/\.(jsx?|css|html)$/.test(entry.name) && full !== NAVIGATION_FILE) files.push(full);
    }
  }
  await walk(path.join(ROOT, 'src'));

  const urls = [];
  const pattern = /https:\/\/cdn\.isthishenry\.com\/[^'"`\s)]+/g;
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      // Skip template-literal fragments like `${CDN}/${key}`.
      if (!match[0].includes('${')) urls.push(match[0]);
    }
  }
  return urls;
}

function urlToKey(url) {
  const vimeoId = url.match(VIMEO_HLS)?.[1];
  if (vimeoId) return `vimeo/${vimeoId}.mp4`;
  const { pathname } = new URL(url);
  return decodeURIComponent(pathname.replace(/^\/+/, ''));
}

// ---------------------------------------------------------------------------
// 2. Download
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (bytes) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;

async function existingSize(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return -1;
  }
}

async function hashFile(file) {
  const sha256 = createHash('sha256');
  const md5 = createHash('md5');
  for await (const chunk of createReadStream(file)) {
    sha256.update(chunk);
    md5.update(chunk);
  }
  return { sha256: sha256.digest('hex'), md5: md5.digest('hex') };
}

async function download({ url, key, name, section }) {
  const dest = path.join(outDir, name);
  const tmp = `${dest}.part`;
  await mkdir(path.dirname(dest), { recursive: true });

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) throw new Error(`HEAD ${head.status}`);
      const expected = Number(head.headers.get('content-length'));
      const etag = (head.headers.get('etag') ?? '').replace(/^W\//, '').replace(/"/g, '');
      const contentType = head.headers.get('content-type');
      const meta = { url, key, name, section, contentType, etag };

      if (expected && (await existingSize(dest)) === expected) {
        return { ...meta, bytes: expected, ...(await hashFile(dest)), skipped: true };
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET ${res.status}`);

      const sha256 = createHash('sha256');
      const md5 = createHash('md5');
      const tap = new Transform({
        transform(chunk, _enc, cb) {
          sha256.update(chunk);
          md5.update(chunk);
          cb(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(res.body), tap, createWriteStream(tmp));

      const bytes = await existingSize(tmp);
      if (expected && bytes !== expected) {
        throw new Error(`size mismatch: got ${bytes}, expected ${expected}`);
      }
      const md5Hex = md5.digest('hex');
      // R2 ETags are the object's MD5 for single-part uploads (multipart ones contain a '-').
      if (/^[0-9a-f]{32}$/.test(etag) && etag !== md5Hex) {
        throw new Error(`md5 mismatch: got ${md5Hex}, etag ${etag}`);
      }

      await rename(tmp, dest);
      return { ...meta, bytes, sha256: sha256.digest('hex'), md5: md5Hex };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** attempt);
    }
  }
  return { url, key, name, section, error: String(lastError?.message ?? lastError) };
}

const run = promisify(execFile);

// Width, height and duration of the largest video stream. On a master playlist
// this covers every rendition, so it's the best quality the stream offers.
async function probeVideo(input) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v',
    '-show_entries', 'stream=width,height:format=duration', '-of', 'json', input,
  ]);
  const { streams, format } = JSON.parse(stdout);
  const best = streams.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
  return { width: best.width, height: best.height, duration: Number(format.duration) };
}

// Vimeo HLS: ffmpeg's default stream selection takes the highest-resolution
// rendition, remuxed to MP4 without re-encoding. There's no ETag to verify
// against, so the result is checked against the playlist's resolution and duration.
async function downloadHls({ url, key, name, section }) {
  const dest = path.join(outDir, name);
  const tmp = `${dest}.part`;
  const meta = { url, key, name, section, vimeoId: url.match(VIMEO_HLS)[1], contentType: 'video/mp4' };
  await mkdir(path.dirname(dest), { recursive: true });

  // Downloads land via rename, so any file at dest is complete.
  if ((await existingSize(dest)) > 0) {
    const bytes = await existingSize(dest);
    return { ...meta, bytes, ...(await probeVideo(dest)), ...(await hashFile(dest)), skipped: true };
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const expected = await probeVideo(url);
      await run('ffmpeg', ['-v', 'error', '-y', '-i', url, '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', tmp]);
      const got = await probeVideo(tmp);
      if (got.width !== expected.width || got.height !== expected.height) {
        throw new Error(`got ${got.width}x${got.height}, stream offers ${expected.width}x${expected.height}`);
      }
      if (Math.abs(got.duration - expected.duration) > 1) {
        throw new Error(`got ${got.duration}s, stream is ${expected.duration}s`);
      }
      await rename(tmp, dest);
      const bytes = await existingSize(dest);
      return { ...meta, bytes, ...got, ...(await hashFile(dest)) };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** attempt);
    }
  }
  return { ...meta, error: String(lastError?.message ?? lastError).slice(0, 300) };
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------

const { navigationData } = await import(pathToFileURL(NAVIGATION_FILE));
// Home is the first page in navigation.js, but its media (the reel) is hardcoded
// in ContentArea rather than listed in the data, so source URLs come first as Home.
const found = (await collectFromSource()).map((url) => ({ url, section: navigationData.home.title }));
collectFromNavigation(navigationData, { baseUrl: null, section: null }, found);

// First occurrence wins: an asset reused across blocks/thumbnails is numbered
// where it first appears. Bare baseUrl directories are dropped.
const seen = new Set();
const targets = [];
for (const { url, section } of found) {
  const key = urlToKey(url);
  if (!key || key.endsWith('/') || seen.has(key)) continue;
  seen.add(key);
  targets.push({ url: new URL(url).href, key, section: section ?? 'Other' });
}

const width = Math.max(3, String(targets.length).length);
targets.forEach((t, i) => {
  const number = String(i + 1).padStart(width, '0');
  const title = t.section.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  t.name = path.posix.join(path.posix.dirname(t.key), `${number}_${title}_${path.posix.basename(t.key)}`);
});

console.log(`Found ${targets.length} assets → ${path.relative(ROOT, outDir) || '.'}/`);
if (dryRun) {
  for (const t of targets) console.log(`  ${t.name}`);
  process.exit(0);
}

// Reconcile with what's already on disk, so nothing is downloaded twice. Files
// stay in whatever folder they're in now (they may have been regrouped by hand)
// and are renamed if their number changed because navigation.js was reordered.
// Numbered filenames are unique, so each file is found by its previous name.
const onDisk = new Map();
async function indexDir(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await indexDir(full);
    else onDisk.set(entry.name, path.relative(outDir, full).split(path.sep).join('/'));
  }
}
let previousNames = new Map();
try {
  await indexDir(outDir);
  const previous = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  previousNames = new Map(previous.files.filter((f) => f.name).map((f) => [f.key, path.posix.basename(f.name)]));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
let renamed = 0;
for (const t of targets) {
  const current = onDisk.get(previousNames.get(t.key)) ?? onDisk.get(path.posix.basename(t.name));
  if (!current) continue;
  t.name = path.posix.join(path.posix.dirname(current), path.posix.basename(t.name));
  if (current === t.name) continue;
  if ((await existingSize(path.join(outDir, t.name))) >= 0) throw new Error(`Refusing to overwrite ${t.name}`);
  await rename(path.join(outDir, current), path.join(outDir, t.name));
  renamed++;
}
if (renamed) console.log(`Renamed ${renamed} files to match navigation.js order`);

let doneBytes = 0;
let doneCount = 0;
const results = await runPool(
  targets,
  async (target) => {
    const result = await (VIMEO_HLS.test(target.url) ? downloadHls(target) : download(target));
    doneCount++;
    if (result.error) {
      console.log(`[${doneCount}/${targets.length}] FAIL  ${result.name}  (${result.error})`);
    } else {
      doneBytes += result.bytes;
      const tag = result.skipped ? 'skip ' : 'ok   ';
      console.log(`[${doneCount}/${targets.length}] ${tag} ${result.name}  ${fmt(result.bytes)}  (total ${fmt(doneBytes)})`);
    }
    return result;
  },
  CONCURRENCY,
);

const failed = results.filter((r) => r.error);
const files = results
  .filter((r) => !r.error)
  .map(({ skipped, ...rest }) => rest);

await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      source: CDN_ORIGIN,
      generatedAt: new Date().toISOString(),
      totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
      count: files.length,
      files,
      failed,
    },
    null,
    2,
  ),
);

console.log(`\nDone: ${files.length} files, ${fmt(doneBytes)}. Manifest: ${path.relative(ROOT, outDir)}/manifest.json`);
if (failed.length) {
  console.log(`${failed.length} failed — re-run to retry:`);
  for (const f of failed) console.log(`  ${f.name}: ${f.error}`);
  process.exit(1);
}
