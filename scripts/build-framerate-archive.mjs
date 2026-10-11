#!/usr/bin/env node
// Package the mirrored CDN videos as a FrameRate Migrator archive, so the
// Migrator's upload flow can bulk-import them as if they were a Vimeo export.
//
//   node scripts/build-framerate-archive.mjs [mirrorDir] [outDir]
//     (defaults: cdn-mirror → framerate-export; run scripts/mirror-cdn.mjs first)
//
// Layout, decoded from FrameRate Migrator 0.1.71's archive reader/exporter:
//
//   framerate-export/
//   ├── index.json                      { videos: [{ id, status: "ok", folder_path }] }
//   └── Expensify/                      grouping folder (mirrors folder_path)
//       └── 002_Expensify_… (2)/         leaf folder: "<title> (<id>)", no subfolders
//           ├── 002_expensify_…_2.mp4    folder name lowercased, parens dropped, spaces → _
//           └── metadata.json           title, folder_path, privacy.view, …
//
// The Migrator uploads each video with source { platform: "vimeo", original_id: id }
// and skips ids already on FrameRate. Videos mirrored from Vimeo keep their real
// Vimeo id; CDN videos use their cdn-mirror asset number, a small integer that
// can't collide with a real Vimeo id.

import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Migrator mapping: anybody → public, unlisted → unlisted, nobody → owner_only.
const PRIVACY_VIEW = 'unlisted';
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv']; // all the Migrator accepts

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mirrorArg = 'cdn-mirror', outArg = 'framerate-export'] = process.argv.slice(2);
const mirrorDir = path.resolve(ROOT, mirrorArg);
const outDir = path.resolve(ROOT, outArg);

// On macOS, `cp -c` makes an APFS clone: instant and no extra disk. Node's
// COPYFILE_FICLONE silently does a full copy there, so it's only the fallback.
const run = promisify(execFile);
async function cloneFile(from, to) {
  if (process.platform === 'darwin') await run('cp', ['-c', from, to]);
  else await copyFile(from, to);
}

// Same rules the Migrator applies to its own folder names.
function sanitize(name) {
  const clean = name.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180).trimEnd();
  return clean || 'untitled';
}

const manifest = JSON.parse(await readFile(path.join(mirrorDir, 'manifest.json'), 'utf8'));
const videos = manifest.files.filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));

try {
  await stat(outDir);
  console.error(`${path.relative(ROOT, outDir)}/ already exists — delete it first to rebuild.`);
  process.exit(1);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const exportedAt = new Date().toISOString();
const entries = [];
let totalBytes = 0;

for (const f of videos) {
  const ext = path.extname(f.name);
  const title = path.posix.basename(f.name, ext);
  const number = title.match(/^(\d+)_/)?.[1];
  if (!number) throw new Error(`Expected a numbered name from mirror-cdn.mjs, got ${f.name}`);

  const id = f.vimeoId ?? String(Number(number));
  const folderPath = [f.section];
  const folderName = `${sanitize(title)} (${id})`.slice(0, 180);
  const fileStem = folderName.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_');
  const videoDir = path.join(outDir, ...folderPath.map(sanitize), folderName);

  await mkdir(videoDir, { recursive: true });
  await cloneFile(path.join(mirrorDir, f.name), path.join(videoDir, fileStem + ext.toLowerCase()));

  const metadata = {
    id,
    title,
    description: null,
    created_time: null,
    modified_time: null,
    duration: f.duration ?? null,
    dimensions: { width: f.width ?? null, height: f.height ?? null },
    privacy: { view: PRIVACY_VIEW },
    embed_html: null,
    plays: null,
    tags: [],
    categories: [],
    folder_path: folderPath,
    parent_folder_id: null,
    thumbnails: [],
    vimeo_url: f.vimeoId ? `https://vimeo.com/${f.vimeoId}` : null,
    exported_at: exportedAt,
    // Not read by the Migrator; kept so each upload traces back to where the site loads it from.
    source_key: f.key,
    source_url: f.url,
  };
  await writeFile(path.join(videoDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  entries.push({ id, status: 'ok', folder_path: folderPath });
  totalBytes += f.bytes;
  console.log(`  ${path.relative(outDir, videoDir)}/`);
}

await writeFile(
  path.join(outDir, 'index.json'),
  JSON.stringify(
    {
      exported_at: exportedAt,
      status: 'completed',
      total: entries.length,
      completed: entries.length,
      failed: 0,
      videos: entries,
    },
    null,
    2,
  ),
);

const skipped = manifest.files.length - videos.length;
console.log(
  `\n${entries.length} videos (${(totalBytes / 1e9).toFixed(2)} GB) → ${path.relative(ROOT, outDir)}/` +
    `\n${skipped} non-video files left out (the Migrator only accepts ${VIDEO_EXTENSIONS.join(', ')}).`,
);
