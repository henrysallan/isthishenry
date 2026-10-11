#!/usr/bin/env node
// Re-encode the site's PNG/JPEG images as progressive JPEGs at a few widths, for
// scripts/publish-images.mjs to upload. Needs ImageMagick (`magick`).
//
//   node scripts/build-images.mjs [mirrorDir] [outDir]   (defaults: cdn-mirror → image-build)
//
// For each image in the mirror's manifest.json it writes, under outDir/img/:
//   <name>.<hash>-<width>.jpg   640, 1280 and 2560px wide; never upscaled, so a
//                               smaller original contributes its own width instead
//   <name>.<hash>-blur.jpg      a ~1 KB preview shown while the sharp image loads
// <hash> covers the source file and the settings below, so changing either gives
// new URLs and the files can be cached forever. GIFs are left alone (they're
// animated). outDir/manifest.json records what was built.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const SETTINGS = { widths: [640, 1280, 2560], quality: 85, blurWidth: 64, blurQuality: 60 };
const SRGB_PROFILE = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';
const CONCURRENCY = 3; // each magick process is multi-threaded and decodes up to 4800² images

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mirrorArg = 'cdn-mirror', outArg = 'image-build'] = process.argv.slice(2);
const mirrorDir = path.resolve(ROOT, mirrorArg);
const outDir = path.resolve(ROOT, outArg);
const run = promisify(execFile);

const exists = (file) => stat(file).then(() => true, () => false);
const urlSafe = (name) => name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');

async function build(f) {
  const source = path.join(mirrorDir, f.name);
  const { stdout } = await run('magick', ['identify', '-ping', '-format', '%w %h', source]);
  const [width, height] = stdout.trim().split(' ').map(Number);
  const widths = [...new Set([...SETTINGS.widths.filter((w) => w < width), Math.min(width, Math.max(...SETTINGS.widths))])];

  const hash = createHash('sha256').update(f.sha256 + JSON.stringify(SETTINGS)).digest('hex').slice(0, 8);
  const base = `img/${urlSafe(path.posix.basename(f.name, path.posix.extname(f.name)))}.${hash}`;
  const files = [
    ...widths.map((w) => ({ key: `${base}-${w}.jpg`, width: w })),
    { key: `${base}-blur.jpg`, width: Math.min(width, SETTINGS.blurWidth), blur: true },
  ];

  const missing = [];
  for (const file of files) if (!(await exists(path.join(outDir, file.key)))) missing.push(file);
  if (missing.length) {
    await mkdir(path.join(outDir, 'img'), { recursive: true });
    // Decode once, convert to sRGB (a few PNGs carry a "Color LCD" display
    // profile), drop the unused alpha channel and metadata, then write each size.
    const args = [source, '-profile', SRGB_PROFILE, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-strip'];
    for (const file of missing) {
      const encode = file.blur
        ? ['-interlace', 'none', '-quality', String(SETTINGS.blurQuality)]
        : ['-interlace', 'JPEG', '-sampling-factor', '4:2:0', '-quality', String(SETTINGS.quality)];
      args.push('(', '+clone', '-resize', `${file.width}x`, ...encode, '-write', path.join(outDir, file.key), '+delete', ')');
    }
    args.push('null:');
    await run('magick', args, { maxBuffer: 16 * 1024 * 1024 });
  }

  for (const file of files) file.bytes = (await stat(path.join(outDir, file.key))).size;
  const top = files.find((file) => file.width === widths.at(-1) && !file.blur);
  return {
    sourceKey: f.key,
    sourceUrl: f.url,
    name: f.name,
    section: f.section,
    sourceBytes: f.bytes,
    // Pixel size of the largest JPEG; the others share its aspect ratio.
    width: top.width,
    height: Math.round((height * top.width) / width),
    widths,
    top: top.key,
    blur: `${base}-blur.jpg`,
    files: files.map(({ key, bytes }) => ({ key, bytes })),
    built: missing.length > 0,
  };
}

const manifest = JSON.parse(await readFile(path.join(mirrorDir, 'manifest.json'), 'utf8'));
const images = manifest.files.filter((f) => /\.(png|jpe?g)$/i.test(f.name));
console.log(`${images.length} images → ${path.relative(ROOT, outDir)}/img/`);

const results = new Array(images.length);
let next = 0;
let done = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < images.length) {
      const i = next++;
      results[i] = await build(images[i]);
      const r = results[i];
      const outBytes = r.files.reduce((sum, file) => sum + file.bytes, 0);
      console.log(`[${++done}/${images.length}] ${r.built ? 'built' : 'skip '} ${r.name}  ${(r.sourceBytes / 1e6).toFixed(1)} MB → ${(outBytes / 1e6).toFixed(2)} MB (${r.widths.join('/')})`);
    }
  }),
);

const sourceBytes = results.reduce((sum, r) => sum + r.sourceBytes, 0);
const topBytes = results.reduce((sum, r) => sum + r.files.find((file) => file.key === r.top).bytes, 0);
const allBytes = results.reduce((sum, r) => sum + r.files.reduce((s, file) => s + file.bytes, 0), 0);
await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({ settings: SETTINGS, generatedAt: new Date().toISOString(), images: results.map(({ built, ...r }) => r) }, null, 2),
);
console.log(
  `\nOriginals ${(sourceBytes / 1e6).toFixed(0)} MB → largest JPEGs ${(topBytes / 1e6).toFixed(0)} MB` +
    ` (all sizes + previews: ${(allBytes / 1e6).toFixed(0)} MB, ${results.reduce((n, r) => n + r.files.length, 0)} files)`,
);
