#!/usr/bin/env node
// Point the site's videos at their FrameRate streams (FrameRate hosts video on Mux).
//
//   node scripts/use-framerate-urls.mjs [--dry-run]
//
// Inputs:
//   cdn-mirror/manifest.json       each video's current URL and numbered name (mirror-cdn.mjs)
//   scripts/framerate-videos.json  title + Mux playback ID of every FrameRate upload,
//                                  collected from the FrameRate library page
//
// FrameRate titles are the numbered names, so each video maps back to the URL the
// site uses today, which is swapped for https://stream.mux.com/{playbackId}.m3u8.
// Nothing is written unless every video maps to a stream that responds, and the
// files are restored if navigation.js still resolves any video to its old URL.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDN_ORIGIN, navigationUrls, restore, rewriteSourceUrls } from './lib/source-urls.mjs';

const VIMEO_HLS = /^https:\/\/player\.vimeo\.com\/external\/\d+\.m3u8/;
const VIDEO_FILE = /\.(mp4|mov|mkv|webm)$/i;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const manifest = JSON.parse(await readFile(path.join(ROOT, 'cdn-mirror/manifest.json'), 'utf8'));
const framerate = JSON.parse(await readFile(path.join(ROOT, 'scripts/framerate-videos.json'), 'utf8'));

// ---------------------------------------------------------------------------
// 1. Match each mirrored video to its FrameRate upload
// ---------------------------------------------------------------------------

// Exact title first. Otherwise ignore the number and spaces vs underscores: web
// uploads turn underscores into spaces, and older uploads carry numbers from
// before navigation.js changed. Uploads in the library root win ties.
const canonical = (title) => title.replace(/^\d+[\s_]+/, '').replace(/[\s_]+/g, '_').toLowerCase();

const mappings = [];
const unmatched = [];
for (const f of manifest.files.filter((file) => VIDEO_FILE.test(file.name))) {
  const title = path.posix.basename(f.name, path.posix.extname(f.name));
  const exact = framerate.videos.filter((v) => v.title === title);
  const candidates = exact.length ? exact : framerate.videos.filter((v) => canonical(v.title) === canonical(title));
  const upload = candidates.find((v) => !v.folder) ?? candidates[0];
  if (!upload) {
    unmatched.push(title);
    continue;
  }
  mappings.push({
    from: f.url,
    // Block srcs under a page's baseUrl are bare filenames in navigation.js.
    relative: f.url.startsWith(CDN_ORIGIN) ? path.posix.basename(f.key) : null,
    title,
    uploadTitle: upload.title,
    stream: `https://stream.mux.com/${upload.playbackId}.m3u8`,
  });
}

console.log(`${mappings.length} videos matched to FrameRate uploads`);
for (const m of mappings.filter((m) => m.uploadTitle !== m.title)) {
  console.log(`  ${m.title}  ←  "${m.uploadTitle}"`);
}
if (unmatched.length) {
  console.error(`No FrameRate upload found for:\n  ${unmatched.join('\n  ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Every stream must play without signing in
// ---------------------------------------------------------------------------

const broken = (
  await Promise.all(
    mappings.map(async (m) => {
      try {
        const res = await fetch(m.stream);
        return res.ok ? null : `${m.title}: HTTP ${res.status}`;
      } catch (err) {
        return `${m.title}: ${err.message}`;
      }
    }),
  )
).filter(Boolean);
if (broken.length) {
  console.error(`Streams not playable:\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log(`All ${mappings.length} streams respond`);

// ---------------------------------------------------------------------------
// 3. Rewrite the source
// ---------------------------------------------------------------------------

const originals = await rewriteSourceUrls(
  ROOT,
  mappings.map((m) => ({ from: m.from, relative: m.relative, to: m.stream })),
  { dryRun },
);
if (dryRun) process.exit(0);

// ---------------------------------------------------------------------------
// 4. Verify navigation.js resolves every video to a stream, else restore
// ---------------------------------------------------------------------------

const urls = await navigationUrls(ROOT);
const streams = new Set(urls.filter((url) => url.startsWith('https://stream.mux.com/')));
const leftovers = urls.filter((url) => VIMEO_HLS.test(url) || (url.startsWith(CDN_ORIGIN) && VIDEO_FILE.test(url)));

if (leftovers.length) {
  await restore(originals);
  console.error(`Restored the original files — still pointing at old URLs:\n  ${leftovers.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nDone. navigation.js now uses ${streams.size} FrameRate streams and no CDN or Vimeo videos.`);
