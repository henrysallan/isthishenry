#!/usr/bin/env node
// Convert the site's GIFs to MP4 for upload to FrameRate. Needs ffmpeg + ffprobe.
//
//   node scripts/convert-gifs.mjs [mirrorDir] [outDir]   (defaults: cdn-mirror → gif-videos)
//
// Each GIF in the mirror's manifest.json becomes outDir/<numbered name>.mp4, e.g.
// 041_IT-Cosmetics_capaing24gif.mp4. Upload them to FrameRate under those names
// (the filename is the default title), add them to scripts/framerate-videos.json,
// and scripts/use-framerate-urls.mjs swaps each GIF for its stream.
//
// Every frame is kept at the GIF's own frame rate. Odd dimensions are cropped by
// one pixel (H.264 needs even sizes) rather than resampled. The encode is near
// lossless (FrameRate re-encodes on upload) and tagged BT.709 so colors match.

import { execFile } from 'node:child_process';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mirrorDir = path.resolve(ROOT, process.argv[2] ?? 'cdn-mirror');
const outDir = path.resolve(ROOT, process.argv[3] ?? 'gif-videos');

const manifest = JSON.parse(await readFile(path.join(mirrorDir, 'manifest.json'), 'utf8'));
const gifs = manifest.files.filter((f) => /\.gif$/i.test(f.name));
await mkdir(outDir, { recursive: true });

const probe = async (file, entries) => {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', entries, '-of', 'json', file,
  ]);
  return JSON.parse(stdout).streams[0];
};

console.log(`Converting ${gifs.length} GIFs → ${path.relative(ROOT, outDir)}/\n`);
for (const gif of gifs) {
  const src = path.join(mirrorDir, gif.name);
  const title = path.basename(gif.name, path.extname(gif.name));
  const out = path.join(outDir, `${title}.mp4`);
  const info = await probe(src, 'stream=width,height,avg_frame_rate,nb_read_packets');

  await run('ffmpeg', [
    '-y', '-v', 'error', '-i', src, '-an',
    '-fps_mode', 'cfr', '-r', info.avg_frame_rate,
    '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2:0:0,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', out,
  ]);

  const result = await probe(out, 'stream=width,height,nb_read_packets');
  const mb = (bytes) => (bytes / 1048576).toFixed(1);
  console.log(
    `${title}.mp4  ${result.width}x${result.height}, ${result.nb_read_packets}/${info.nb_read_packets} frames @ ${info.avg_frame_rate} fps, ` +
    `${mb(gif.bytes)} MB → ${mb((await stat(out)).size)} MB`,
  );
}
